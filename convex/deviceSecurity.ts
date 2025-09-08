import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate device fingerprint from browser data
export const registerDevice = mutation({
  args: {
    studentId: v.id("students"),
    deviceData: v.object({
      userAgent: v.string(),
      screenResolution: v.optional(v.string()),
      timezone: v.optional(v.string()),
      language: v.optional(v.string()),
      platform: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { studentId, deviceData }) => {
    // Generate device fingerprint
    const deviceId = generateDeviceFingerprint(deviceData);
    const deviceName = generateDeviceName(deviceData);
    
    // CRITICAL: Check if device is already registered to ANY student
    const existingDevice = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (existingDevice && existingDevice.studentId !== studentId) {
      // Device is permanently locked to another student
      const deviceOwner = await ctx.db.get(existingDevice.studentId);
      
      // Create critical security alert for bypass attempt
      await ctx.db.insert("securityAlerts", {
        studentId,
        type: "account_sharing_attempt",
        severity: "critical",
        message: `CRITICAL VIOLATION: Attempted to bypass device security. Device is permanently locked to another student.`,
        deviceId,
        metadata: {
          violatingStudent: studentId,
          deviceOwner: existingDevice.studentId,
          deviceName: existingDevice.deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Alert the actual device owner
      await ctx.db.insert("securityAlerts", {
        studentId: existingDevice.studentId,
        type: "unauthorized_device_access",
        severity: "critical",
        message: `SECURITY BREACH: Another student attempted to access your device. Device: ${existingDevice.deviceName}`,
        deviceId,
        metadata: {
          violatingStudent: studentId,
          deviceOwner: existingDevice.studentId,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Increment violation count
      await ctx.db.patch(existingDevice._id, {
        suspiciousActivityCount: (existingDevice.suspiciousActivityCount || 0) + 1,
        lastSeen: Date.now(),
      });

      throw new Error(`🚫 DEVICE PERMANENTLY LOCKED\n\nThis device is permanently registered to: ${deviceOwner?.name || 'Unknown'} (${deviceOwner?.email || 'Unknown'})\n\nDevice: ${existingDevice.deviceName}\nRegistered: ${new Date(existingDevice.firstSeen).toLocaleString()}\n\nSECURITY POLICY:\n• Devices are permanently bound to first user\n• Logout does NOT release device ownership\n• No account switching allowed on same device\n• Contact teacher for emergency device unlock\n\nSecurity violation logged and reported.`);
    }

    if (existingDevice && existingDevice.studentId === studentId) {
      // Same student, same device - update last seen and return
      await ctx.db.patch(existingDevice._id, {
        lastSeen: Date.now(),
        isActive: true,
      });
      return { deviceId, isNew: false, isTrusted: existingDevice.isTrusted, deviceOwner: existingDevice.studentId };
    }

    // Check student's existing devices
    const studentDevices = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();

    // If this is the first device, auto-trust it
    const isTrusted = studentDevices.length === 0;
    
    // Create new device record with ownership lock
    const newDeviceId = await ctx.db.insert("deviceFingerprints", {
      studentId,
      deviceId,
      deviceName,
      userAgent: deviceData.userAgent,
      screenResolution: deviceData.screenResolution,
      timezone: deviceData.timezone,
      language: deviceData.language,
      platform: deviceData.platform,
      isTrusted,
      isActive: true,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      suspiciousActivityCount: 0,
    });

    // If student has devices but this is new, create security alert
    if (studentDevices.length > 0) {
      await ctx.db.insert("securityAlerts", {
        studentId,
        type: "new_device",
        severity: "medium",
        message: `New device detected: ${deviceName}. If this wasn't you, please contact your teacher immediately.`,
        deviceId,
        metadata: {
          newDevice: deviceName,
          oldDevice: studentDevices[0]?.deviceName,
          deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });
    }

    return { deviceId, isNew: true, isTrusted, id: newDeviceId, deviceOwner: studentId };
  },
});

// Check device security before attendance
export const checkDeviceSecurity = mutation({
  args: {
    studentId: v.id("students"),
    deviceId: v.string(),
    sessionId: v.optional(v.id("sessions")),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
  },
  handler: async (ctx, { studentId, deviceId, sessionId, location }) => {
    const device = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (!device) {
      throw new Error("Device not found. Please refresh the page.");
    }

    if (device.studentId !== studentId) {
      throw new Error("Device mismatch detected. Security violation.");
    }

    // Update device last seen
    await ctx.db.patch(device._id, {
      lastSeen: Date.now(),
      lastUsedForAttendance: Date.now(),
    });

    // Check for suspicious activity
    const warnings = [];
    
    if (!device.isTrusted) {
      warnings.push("This device is not trusted. Contact your teacher if you believe this is an error.");
    }

    // Check for multiple devices used recently
    const recentDevices = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .filter((q) => 
        q.and(
          q.gt(q.field("lastSeen"), Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          q.neq(q.field("deviceId"), deviceId)
        )
      )
      .collect();

    if (recentDevices.length > 0 && sessionId) {
      await ctx.db.insert("securityAlerts", {
        studentId,
        type: "multiple_devices_attendance",
        severity: "high",
        message: `Multiple devices used within 24 hours for attendance. Current: ${device.deviceName}`,
        deviceId,
        metadata: {
          sessionId,
          oldDevice: recentDevices[0].deviceName,
          newDevice: device.deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });
      warnings.push("Multiple devices detected in 24 hours. This may trigger a security review.");
    }

    return {
      isValid: true,
      isTrusted: device.isTrusted,
      deviceName: device.deviceName,
      warnings,
    };
  },
});

// Get student's devices
export const getStudentDevices = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    return await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .order("desc")
      .collect();
  },
});

// Get security alerts for student
export const getSecurityAlerts = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    return await ctx.db
      .query("securityAlerts")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .order("desc")
      .collect();
  },
});

// Mark security alert as read
export const markAlertAsRead = mutation({
  args: { alertId: v.id("securityAlerts") },
  handler: async (ctx, { alertId }) => {
    await ctx.db.patch(alertId, {
      isRead: true,
      updatedAt: Date.now(),
    });
  },
});

// Trust a device (student action)
export const trustDevice = mutation({
  args: { 
    deviceId: v.string(),
    studentId: v.id("students"),
  },
  handler: async (ctx, { deviceId, studentId }) => {
    const device = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (!device || device.studentId !== studentId) {
      throw new Error("Device not found or access denied");
    }

    await ctx.db.patch(device._id, {
      isTrusted: true,
    });

    return { success: true };
  },
});

// Validate device ownership before allowing any operations
export const validateDeviceOwnership = mutation({
  args: {
    studentId: v.id("students"),
    deviceId: v.string(),
  },
  handler: async (ctx, { studentId, deviceId }) => {
    const device = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (!device) {
      throw new Error("Device not found. Please refresh the page and try again.");
    }

    if (device.studentId !== studentId) {
      // Log security violation
      await ctx.db.insert("securityAlerts", {
        studentId,
        type: "unauthorized_device_access",
        severity: "critical",
        message: `Critical security violation: Attempted unauthorized access from device owned by another student.`,
        deviceId,
        metadata: {
          violatingStudent: studentId,
          deviceOwner: device.studentId,
          deviceName: device.deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      throw new Error(`🚫 UNAUTHORIZED DEVICE ACCESS\n\nThis device is registered to another student account.\n\nSecurity violation has been logged and reported.\n\nPlease use your own personal device for attendance.`);
    }

    return { valid: true, deviceOwner: device.studentId };
  },
});

// Force logout from all devices for a student (emergency security measure)
export const forceLogoutFromAllDevices = mutation({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    // Deactivate all devices for this student
    const devices = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();

    for (const device of devices) {
      await ctx.db.patch(device._id, {
        isActive: false,
        isTrusted: false,
      });
    }

    // Create security alert
    await ctx.db.insert("securityAlerts", {
      studentId,
      type: "account_sharing_attempt",
      severity: "critical",
      message: "Emergency logout: All devices have been deactivated due to suspected account sharing. Contact your teacher to reactivate your devices.",
      isRead: false,
      isResolved: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if student is trying to use multiple devices simultaneously
export const detectSimultaneousDeviceUsage = mutation({
  args: {
    studentId: v.id("students"),
    currentDeviceId: v.string(),
  },
  handler: async (ctx, { studentId, currentDeviceId }) => {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes threshold

    // Find all devices used by this student in the last 5 minutes
    const recentDevices = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .filter((q) => 
        q.and(
          q.gt(q.field("lastSeen"), fiveMinutesAgo),
          q.neq(q.field("deviceId"), currentDeviceId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    if (recentDevices.length > 0) {
      // Multiple devices detected - create high severity alert
      await ctx.db.insert("securityAlerts", {
        studentId,
        type: "multiple_devices_attendance",
        severity: "critical",
        message: `CRITICAL: Multiple devices detected simultaneously. This indicates possible account sharing which is strictly prohibited.`,
        deviceId: currentDeviceId,
        metadata: {
          violatingStudent: studentId,
          deviceName: recentDevices[0].deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Deactivate all other devices except current one
      for (const device of recentDevices) {
        await ctx.db.patch(device._id, {
          isActive: false,
          suspiciousActivityCount: (device.suspiciousActivityCount || 0) + 1,
        });
      }

      return {
        violation: true,
        message: "Multiple device usage detected. Other devices have been deactivated for security.",
        deactivatedDevices: recentDevices.length,
      };
    }

    return { violation: false };
  },
});

// CRITICAL: Check device ownership lock (prevents logout-login abuse)
export const checkDeviceOwnershipLock = mutation({
  args: {
    deviceId: v.string(),
    requestingStudentId: v.id("students"),
  },
  handler: async (ctx, { deviceId, requestingStudentId }) => {
    const existingDevice = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (!existingDevice) {
      return { locked: false, canProceed: true };
    }

    // Check if device is locked to another student
    if (existingDevice.studentId !== requestingStudentId) {
      const deviceOwner = await ctx.db.get(existingDevice.studentId);
      
      // Create critical security alert for attempted bypass
      await ctx.db.insert("securityAlerts", {
        studentId: requestingStudentId,
        type: "account_sharing_attempt",
        severity: "critical",
        message: `CRITICAL VIOLATION: Attempted to bypass device security by logout-login. Device is permanently locked to another student.`,
        deviceId,
        metadata: {
          violatingStudent: requestingStudentId,
          deviceOwner: existingDevice.studentId,
          deviceName: existingDevice.deviceName,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Alert the actual device owner
      await ctx.db.insert("securityAlerts", {
        studentId: existingDevice.studentId,
        type: "unauthorized_device_access",
        severity: "critical",
        message: `SECURITY BREACH: Another student attempted to access your device after logout. Device: ${existingDevice.deviceName}`,
        deviceId,
        metadata: {
          violatingStudent: requestingStudentId,
          deviceOwner: existingDevice.studentId,
        },
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Increment violation count
      await ctx.db.patch(existingDevice._id, {
        suspiciousActivityCount: (existingDevice.suspiciousActivityCount || 0) + 1,
        lastSeen: Date.now(),
      });

      return {
        locked: true,
        canProceed: false,
        owner: deviceOwner?.name || "Unknown",
        ownerEmail: deviceOwner?.email || "Unknown",
        deviceName: existingDevice.deviceName,
        lockedSince: existingDevice.firstSeen,
      };
    }

    return { locked: false, canProceed: true, owner: "same_user" };
  },
});

// Enhanced device unlocking (only for emergencies, requires teacher approval)
export const requestDeviceUnlock = mutation({
  args: {
    deviceId: v.string(),
    studentId: v.id("students"),
    reason: v.string(),
  },
  handler: async (ctx, { deviceId, studentId, reason }) => {
    const device = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", deviceId))
      .first();

    if (!device) {
      throw new Error("Device not found");
    }

    // Create unlock request alert
    await ctx.db.insert("securityAlerts", {
      studentId,
      type: "device_ownership_violation",
      severity: "medium",
      message: `Device unlock requested. Reason: ${reason}. Requires teacher approval.`,
      deviceId,
      metadata: {
        violatingStudent: studentId,
        deviceOwner: device.studentId,
        deviceName: device.deviceName,
      },
      isRead: false,
      isResolved: false,
      createdAt: Date.now(),
    });

    return { success: true, message: "Unlock request submitted. Contact your teacher for approval." };
  },
});

// One-off migration: normalize deviceFingerprints to canonical deterministic deviceId
export const normalizeDeviceFingerprints = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("deviceFingerprints").collect();
    let patched = 0;
    let deactivated = 0;
    let conflicts = 0;

    for (const doc of all) {
      const canonicalId = generateDeviceFingerprint({
        userAgent: doc.userAgent,
        screenResolution: doc.screenResolution,
        timezone: doc.timezone,
        language: doc.language,
        platform: doc.platform,
      });

      // If already canonical, continue
      if (doc.deviceId === canonicalId) continue;

      // Check if a device with canonicalId already exists
      const existing = await ctx.db
        .query("deviceFingerprints")
        .withIndex("by_device_id", (q) => q.eq("deviceId", canonicalId))
        .first();

      if (!existing) {
        await ctx.db.patch(doc._id, { deviceId: canonicalId });
        patched++;
        continue;
      }

      // Resolve conflict: keep oldest (firstSeen) as owner
      const owner = existing.firstSeen <= doc.firstSeen ? existing : doc;
      const other = existing.firstSeen <= doc.firstSeen ? doc : existing;

      // If different students, log conflict and deactivate other
      if (owner.studentId !== other.studentId) {
        conflicts++;
        await ctx.db.insert("securityAlerts", {
          studentId: other.studentId,
          type: "device_ownership_violation",
          severity: "high",
          message: `Device conflict detected during normalization. This device belongs to another student.`,
          deviceId: canonicalId,
          metadata: {
            violatingStudent: other.studentId,
            deviceOwner: owner.studentId,
            deviceName: owner.deviceName,
          },
          isRead: false,
          isResolved: false,
          createdAt: Date.now(),
        });
      }

      // Ensure owner has canonicalId
      if (owner.deviceId !== canonicalId) {
        await ctx.db.patch(owner._id, { deviceId: canonicalId });
        patched++;
      }

      // Deactivate or delete the other record
      await ctx.db.patch(other._id, { isActive: false });
      deactivated++;
    }

    return { patched, deactivated, conflicts, total: all.length };
  },
});

// Helper functions
function generateDeviceFingerprint(deviceData: {
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}): string {
  const components = [
    deviceData.userAgent,
    deviceData.screenResolution || '',
    deviceData.timezone || '',
    deviceData.language || '',
    deviceData.platform || '',
  ];
  
  // Simple hash function (in production, use a proper crypto hash)
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // IMPORTANT: Do NOT append timestamp — keep deterministic across sessions
  return `device_${Math.abs(hash).toString(36)}`;
}

function generateDeviceName(deviceData: {
  userAgent: string;
  platform?: string;
}): string {
  const ua = deviceData.userAgent.toLowerCase();
  
  // Detect device type and browser
  let device = "Unknown Device";
  let browser = "Unknown Browser";
  
  // Device detection
  if (ua.includes('iphone')) device = "iPhone";
  else if (ua.includes('ipad')) device = "iPad";
  else if (ua.includes('android')) {
    if (ua.includes('mobile')) device = "Android Phone";
    else device = "Android Tablet";
  }
  else if (ua.includes('windows')) device = "Windows PC";
  else if (ua.includes('macintosh')) device = "Mac";
  else if (ua.includes('linux')) device = "Linux PC";
  
  // Browser detection
  if (ua.includes('chrome') && !ua.includes('edg')) browser = "Chrome";
  else if (ua.includes('firefox')) browser = "Firefox";
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = "Safari";
  else if (ua.includes('edg')) browser = "Edge";
  
  return `${browser} on ${device}`;
}
