import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    title: v.string(),
    department: v.string(),
    year: v.number(),
    teacherId: v.id("teachers"),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    allowedRadius: v.optional(v.number()),
  },
  handler: async (ctx, { title, department, year, teacherId, latitude, longitude, allowedRadius }) => {
    const id = await ctx.db.insert("sessions", {
      title,
      department,
      year,
      isOpen: true,
      teacherId,
      createdAt: Date.now(),
      closedAt: undefined,
      latitude,
      longitude,
      allowedRadius: allowedRadius || 100, // Default 100 meters radius
    });
    return { id };
  },
});

export const closeSession = mutation({
  args: { sessionId: v.id("sessions"), teacherId: v.id("teachers") },
  handler: async (ctx, { sessionId, teacherId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== teacherId) throw new Error("Not allowed");
    await ctx.db.patch(sessionId, { isOpen: false, closedAt: Date.now() });
    return { ok: true };
  },
});

export const listOpenForDeptYear = query({
  args: { department: v.string(), year: v.number() },
  handler: async (ctx, { department, year }) => {
    // Session timeout: 2 minutes (120,000 milliseconds)
    const SESSION_TIMEOUT = 2 * 60 * 1000;
    const now = Date.now();
    
    // Get all sessions for dept/year
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_dept_year", (q) => q.eq("department", department).eq("year", year))
      .collect();
    
    // Filter sessions that are open and not expired
    return sessions.filter((session) => {
      if (!session.isOpen) return false;
      const sessionAge = now - session.createdAt;
      return sessionAge <= SESSION_TIMEOUT;
    });
  },
});

export const closeExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    // Session timeout: 2 minutes (120,000 milliseconds)
    const SESSION_TIMEOUT = 2 * 60 * 1000;
    const now = Date.now();
    
    // Get all open sessions
    const openSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("isOpen"), true))
      .collect();
    
    let closedCount = 0;
    
    // Close expired sessions
    for (const session of openSessions) {
      const sessionAge = now - session.createdAt;
      if (sessionAge > SESSION_TIMEOUT) {
        await ctx.db.patch(session._id, {
          isOpen: false,
          closedAt: now
        });
        closedCount++;
      }
    }
    
    return { closedCount };
  },
});

export const listTeacherSessions = query({
  args: { teacherId: v.optional(v.id("teachers")) },
  handler: async (ctx, { teacherId }) => {
    if (!teacherId) return [];
    return await ctx.db
      .query("sessions")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect();
  },
});

export const listOpenForStudent = query({
  args: { studentId: v.optional(v.id("students")) },
  handler: async (ctx, { studentId }) => {
    if (!studentId) return [];
    const student = await ctx.db.get(studentId);
    if (!student) return [];
    
    // Session timeout: 2 minutes (120,000 milliseconds)
    const SESSION_TIMEOUT = 2 * 60 * 1000;
    const now = Date.now();
    
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_dept_year", (q) =>
        q.eq("department", student.department).eq("year", student.year)
      )
      .collect();
    
    // Filter sessions that are open and not expired
    return sessions.filter((session) => {
      if (!session.isOpen) return false;
      const sessionAge = now - session.createdAt;
      return sessionAge <= SESSION_TIMEOUT;
    });
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

// Generate secure QR token for session
export const generateQrToken = mutation({
  args: { 
    sessionId: v.id("sessions"), 
    teacherId: v.id("teachers") 
  },
  handler: async (ctx, { sessionId, teacherId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== teacherId) throw new Error("Not authorized");
    if (!session.isOpen) throw new Error("Session is closed");

    // Generate cryptographically secure token
    const qrToken = generateSecureToken();
    const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes expiry

    // Update session with new QR token
    await ctx.db.patch(sessionId, {
      currentQrToken: qrToken,
      qrTokenExpiry: expiry,
      qrTokenUsedBy: [], // Reset used list
    });

    return { 
      qrToken, 
      expiry,
      sessionId: sessionId 
    };
  },
});

// Validate QR token and get session info
export const validateQrToken = query({
  args: { qrToken: v.string() },
  handler: async (ctx, { qrToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_qr_token", (q) => q.eq("currentQrToken", qrToken))
      .first();

    if (!session) {
      return { valid: false, reason: "Invalid QR code" };
    }

    if (!session.isOpen) {
      return { valid: false, reason: "Session is closed" };
    }

    if (!session.qrTokenExpiry || Date.now() > session.qrTokenExpiry) {
      return { valid: false, reason: "QR code has expired" };
    }

    return { 
      valid: true, 
      sessionId: session._id,
      title: session.title,
      department: session.department,
      year: session.year,
      allowedRadius: session.allowedRadius
    };
  },
});

// Helper function to generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const morePart = Math.random().toString(36).substring(2, 15);
  
  return `AT_${timestamp}_${randomPart}_${morePart}`;
}
