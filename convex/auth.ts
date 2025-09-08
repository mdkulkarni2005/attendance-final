// @ts-nocheck
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { api } from "./_generated/api";

// Check device ownership before login
export const checkDeviceOwnership = mutation({
  args: {
    email: v.string(),
    deviceId: v.string(), // kept for backward compatibility, ignored
    deviceFingerprint: v.object({
      userAgent: v.string(),
      screenResolution: v.optional(v.string()),
      timezone: v.optional(v.string()),
      language: v.optional(v.string()),
      platform: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { email, deviceFingerprint }) => {
    // Compute canonical deviceId from fingerprint (deterministic)
    const parts = [
      deviceFingerprint.userAgent,
      deviceFingerprint.screenResolution || '',
      deviceFingerprint.timezone || '',
      deviceFingerprint.language || '',
      deviceFingerprint.platform || '',
    ];
    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0; // 32-bit
    }
    const computedDeviceId = `device_${Math.abs(hash).toString(36)}`;

    // Check if device is already registered to any student
    const existingDevice = await ctx.db
      .query("deviceFingerprints")
      .withIndex("by_device_id", (q) => q.eq("deviceId", computedDeviceId))
      .first();

    if (existingDevice) {
      const deviceOwner = await ctx.db.get(existingDevice.studentId);
      if (deviceOwner && deviceOwner.email !== email) {
        return {
          allowed: false,
          reason: "This device is already registered to another student account.",
          ownerInfo: `${deviceOwner.name} (${deviceOwner.email})`,
          deviceName: existingDevice.deviceName,
        };
      }
    }

    return { allowed: true };
  },
});

export const registerStudentAction = action({
  args: {
    name: v.string(),
    year: v.number(),
    semester: v.optional(v.number()),
    department: v.string(),
    phone: v.string(),
    sapId: v.string(),
    rollNo: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEmail = await ctx.runQuery(api.users.getStudentByEmail, { email: args.email });
    if (existingEmail) throw new Error("Email already registered");

    const existingSap = await ctx.runQuery(api.users.getStudentBySapId, { sapId: args.sapId });
    if (existingSap) throw new Error("SAP ID already registered");

    const existingRoll = await ctx.runQuery(api.users.getStudentByRollNo, { rollNo: args.rollNo });
    if (existingRoll) throw new Error("Roll No already registered");

    const existingPhone = await ctx.runQuery(api.users.getStudentByPhone, { phone: args.phone });
    if (existingPhone) throw new Error("Phone number already registered");

    const passwordHash = await bcrypt.hash(args.password, 10);

    const { id } = await ctx.runMutation(api.users.createStudent, {
      name: args.name,
      year: args.year,
      semester: args.semester,
      department: args.department,
      phone: args.phone,
      sapId: args.sapId,
      rollNo: args.rollNo,
      email: args.email,
      passwordHash,
    });
    return { id };
  },
});

export const registerTeacherAction = action({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEmail = await ctx.runQuery(api.users.getTeacherByEmail, { email: args.email });
    if (existingEmail) throw new Error("Email already registered");

    const passwordHash = await bcrypt.hash(args.password, 10);

    const { id } = await ctx.runMutation(api.users.createTeacher, {
      name: args.name,
      phone: args.phone,
      email: args.email,
      passwordHash,
    });
    return { id };
  },
});

export const loginStudentAction = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    console.log("Login attempt for email:", email);
    const user = await ctx.runQuery(api.users.getStudentByEmail, { email });
    console.log("User found:", !!user);
    if (!user) throw new Error("No account found with this email");
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", ok);
    if (!ok) throw new Error("Incorrect password");
    return { id: user._id, name: user.name, email: user.email, department: user.department, year: user.year, semester: user.semester };
  },
});

// Enhanced login with device security
export const loginStudentWithDeviceCheck = action({
  args: {
    email: v.string(),
    password: v.string(),
    deviceId: v.string(),
    deviceFingerprint: v.object({
      userAgent: v.string(),
      screenResolution: v.optional(v.string()),
      timezone: v.optional(v.string()),
      language: v.optional(v.string()),
      platform: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { email, password, deviceId, deviceFingerprint }) => {
    // Verify credentials (same logic as loginStudentAction)
    const user = await ctx.runQuery(api.users.getStudentByEmail, { email });
    if (!user) throw new Error("No account found with this email");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error("Incorrect password");

    // Register/validate device (enforces ownership server-side)
    const deviceResult = await ctx.runMutation(api.deviceSecurity.registerDevice, {
      studentId: user._id,
      deviceData: deviceFingerprint,
    });

    // Check for simultaneous device usage
    const simultaneousCheck = await ctx.runMutation(api.deviceSecurity.detectSimultaneousDeviceUsage, {
      studentId: user._id,
      currentDeviceId: deviceResult.deviceId,
    });

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        year: user.year,
        semester: user.semester,
        deviceId: deviceResult.deviceId,
        deviceTrusted: deviceResult.isTrusted,
        securityWarnings: simultaneousCheck.violation ? [simultaneousCheck.message] : [],
      },
    };
  },
});

export const loginTeacherAction = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    console.log("Teacher login attempt for email:", email);
    const user = await ctx.runQuery(api.users.getTeacherByEmail, { email });
    console.log("Teacher found:", !!user);
    if (!user) throw new Error("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("Teacher password match:", ok);
    if (!ok) throw new Error("Invalid credentials");
    console.log("Teacher login successful for:", user.name);
    return { id: user._id, name: user.name, email: user.email };
  },
});
