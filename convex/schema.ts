import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  students: defineTable({
    name: v.string(),
    year: v.number(),
    semester: v.optional(v.number()),
    department: v.string(),
    phone: v.string(),
    sapId: v.string(),
    rollNo: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"]) 
    .index("by_sapId", ["sapId"]) 
    .index("by_rollNo", ["rollNo"]) 
    .index("by_phone", ["phone"]),

  teachers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"]) 
    .index("by_phone", ["phone"]),

  sessions: defineTable({
    title: v.string(),
    department: v.string(),
    year: v.number(),
    isOpen: v.boolean(),
    teacherId: v.id("teachers"),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    // Location data for attendance verification
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    allowedRadius: v.optional(v.number()), // radius in meters
    // QR Code Security
    currentQrToken: v.optional(v.string()), // Current active QR token
    qrTokenExpiry: v.optional(v.number()), // When current QR token expires
    qrTokenUsedBy: v.optional(v.array(v.id("students"))), // Students who used this QR
  })
    .index("by_teacher", ["teacherId"]) 
    .index("by_dept_year", ["department", "year"]) 
    .index("by_open", ["isOpen"])
    .index("by_qr_token", ["currentQrToken"]),

  // Device tracking for security
  deviceFingerprints: defineTable({
    studentId: v.id("students"),
    deviceId: v.string(), // Generated device fingerprint
    deviceName: v.string(), // User-friendly device name (e.g., "iPhone 15", "Chrome on Windows")
    userAgent: v.string(),
    screenResolution: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
    platform: v.optional(v.string()),
    isTrusted: v.boolean(), // Whether this device is trusted
    isActive: v.boolean(), // Whether this device is currently active
    firstSeen: v.number(),
    lastSeen: v.number(),
    lastUsedForAttendance: v.optional(v.number()),
    suspiciousActivityCount: v.optional(v.number()),
  })
    .index("by_student", ["studentId"])
    .index("by_device_id", ["deviceId"])
    .index("by_student_trusted", ["studentId", "isTrusted"])
    .index("by_student_active", ["studentId", "isActive"]),

  // Security alerts for suspicious device activity
  securityAlerts: defineTable({
    studentId: v.id("students"),
    type: v.union(
      v.literal("new_device"),
      v.literal("suspicious_device_change"),
      v.literal("multiple_devices_attendance"),
      v.literal("device_location_mismatch"),
      v.literal("device_ownership_violation"),
      v.literal("account_sharing_attempt"),
      v.literal("unauthorized_device_access")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    message: v.string(),
    deviceId: v.optional(v.string()),
    metadata: v.optional(v.object({
      oldDevice: v.optional(v.string()),
      newDevice: v.optional(v.string()),
      violatingStudent: v.optional(v.id("students")),
      deviceOwner: v.optional(v.id("students")),
      deviceName: v.optional(v.string()),
      location: v.optional(v.object({
        latitude: v.number(),
        longitude: v.number(),
      })),
      sessionId: v.optional(v.id("sessions")),
      ipAddress: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    })),
    isRead: v.boolean(),
    isResolved: v.boolean(),
    resolvedBy: v.optional(v.id("teachers")),
    resolvedNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_student", ["studentId"])
    .index("by_type", ["type"])
    .index("by_severity", ["severity"])
    .index("by_student_unread", ["studentId", "isRead"])
    .index("by_unresolved", ["isResolved"])
    .index("by_device_violations", ["deviceId", "type"]),

  attendance: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
    // Make optional to allow existing docs without status to validate
    status: v.optional(v.union(v.literal("present"), v.literal("absent"))), // attendance status
    markedAt: v.number(),
    // Store student's location when marking attendance
    studentLatitude: v.optional(v.number()),
    studentLongitude: v.optional(v.number()),
    distanceFromTeacher: v.optional(v.number()), // distance in meters
    // Device security tracking
    deviceId: v.optional(v.string()), // Device fingerprint used for attendance
    deviceTrusted: v.optional(v.boolean()), // Whether device was trusted at time of marking
    // Manual override by teacher
    isManuallySet: v.optional(v.boolean()), // true if teacher manually changed status
    setByTeacher: v.optional(v.id("teachers")), // teacher who manually set the status
    teacherNote: v.optional(v.string()), // optional note from teacher
    lastModified: v.optional(v.number()), // when status was last changed
  })
    .index("by_session", ["sessionId"])
    .index("by_student", ["studentId"])
    .index("by_session_student", ["sessionId", "studentId"])
    .index("by_status", ["status"])
    .index("by_session_status", ["sessionId", "status"])
    .index("by_device", ["deviceId"])
    .index("by_device_trusted", ["deviceTrusted"]),
});
