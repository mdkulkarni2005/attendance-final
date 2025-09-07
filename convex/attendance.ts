import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const markAttendance = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
  },
  handler: async (ctx, { sessionId, studentId }) => {
    // Check if session exists and is open
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (!session.isOpen) throw new Error("Session is closed");

    // Check if student exists
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("Student not found");

    // Check if student belongs to the session's department and year
    if (student.department !== session.department || student.year !== session.year) {
      throw new Error("You are not eligible for this session");
    }

    // Check if attendance already marked
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", sessionId).eq("studentId", studentId)
      )
      .first();

    if (existing) {
      throw new Error("Attendance already marked for this session");
    }

    // Mark attendance
    const id = await ctx.db.insert("attendance", {
      sessionId,
      studentId,
      markedAt: Date.now(),
    });

    return { id };
  },
});

export const getSessionAttendance = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    // Get student details for each attendance record
    const attendanceWithStudents = await Promise.all(
      attendance.map(async (record) => {
        const student = await ctx.db.get(record.studentId);
        return {
          ...record,
          student: student ? {
            name: student.name,
            email: student.email,
            sapId: student.sapId,
            rollNo: student.rollNo,
          } : null,
        };
      })
    );

    return attendanceWithStudents;
  },
});
