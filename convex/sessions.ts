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
    // Get all sessions for dept/year and filter open
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_dept_year", (q) => q.eq("department", department).eq("year", year))
      .collect();
    return sessions.filter((s) => s.isOpen === true);
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
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_dept_year", (q) =>
        q.eq("department", student.department).eq("year", student.year)
      )
      .collect();
    return sessions.filter((s) => s.isOpen === true);
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});
