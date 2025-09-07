import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    title: v.string(),
    department: v.string(),
    year: v.number(),
    teacherId: v.id("teachers"),
  },
  handler: async (ctx, { title, department, year, teacherId }) => {
    const id = await ctx.db.insert("sessions", {
      title,
      department,
      year,
      isOpen: true,
      teacherId,
      createdAt: Date.now(),
      closedAt: undefined,
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
