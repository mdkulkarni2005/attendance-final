import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const markAttendanceWithQr = mutation({
  args: {
    qrToken: v.string(),
    studentId: v.id("students"),
    studentLatitude: v.number(),
    studentLongitude: v.number(),
  },
  handler: async (ctx, { qrToken, studentId, studentLatitude, studentLongitude }) => {
    // First validate the QR token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_qr_token", (q) => q.eq("currentQrToken", qrToken))
      .first();

    if (!session) throw new Error("Invalid or expired QR code");
    if (!session.isOpen) throw new Error("Session is closed");
    if (!session.qrTokenExpiry || Date.now() > session.qrTokenExpiry) {
      throw new Error("QR code has expired. Please ask teacher for a new one.");
    }

    // Check if student already used this QR token
    if (session.qrTokenUsedBy && session.qrTokenUsedBy.includes(studentId)) {
      throw new Error("You have already used this QR code");
    }

    // Check if student exists
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("Student not found");

    // Check if student belongs to the session's department and year
    if (student.department !== session.department || student.year !== session.year) {
      throw new Error("You are not eligible for this session");
    }

    // Check if attendance already marked (by session and student, not QR)
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", session._id).eq("studentId", studentId)
      )
      .first();

    if (existing) {
      throw new Error("Attendance already marked for this session");
    }

    // CRITICAL: Location verification - this is the primary security
    if (session.latitude && session.longitude) {
      const distance = calculateDistance(
        studentLatitude,
        studentLongitude,
        session.latitude,
        session.longitude
      );

      const allowedRadius = session.allowedRadius || 100;
      
      if (distance > allowedRadius) {
        throw new Error(`You must be within ${allowedRadius} meters of the class location. You are ${Math.round(distance)} meters away. QR codes don't work remotely.`);
      }

      // Mark student as having used this QR token
      const updatedUsedBy = [...(session.qrTokenUsedBy || []), studentId];
      await ctx.db.patch(session._id, {
        qrTokenUsedBy: updatedUsedBy
      });

      // Mark attendance with location data
      const id = await ctx.db.insert("attendance", {
        sessionId: session._id,
        studentId,
        status: "present",
        markedAt: Date.now(),
        studentLatitude,
        studentLongitude,
        distanceFromTeacher: distance,
      });

      return { 
        id, 
        distance: Math.round(distance),
        sessionTitle: session.title 
      };
    } else {
      throw new Error("Location-based verification is required for QR code attendance");
    }
  },
});

export const markAttendance = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
    studentLatitude: v.number(),
    studentLongitude: v.number(),
  },
  handler: async (ctx, { sessionId, studentId, studentLatitude, studentLongitude }) => {
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

    // Location verification - check if session has location data
    if (session.latitude && session.longitude) {
      const distance = calculateDistance(
        studentLatitude,
        studentLongitude,
        session.latitude,
        session.longitude
      );

      const allowedRadius = session.allowedRadius || 100; // Default 100 meters
      
      if (distance > allowedRadius) {
        throw new Error(`You must be within ${allowedRadius} meters of the class location to mark attendance. You are ${Math.round(distance)} meters away.`);
      }

      // Mark attendance with location data
      const id = await ctx.db.insert("attendance", {
        sessionId,
        studentId,
        status: "present",
        markedAt: Date.now(),
        studentLatitude,
        studentLongitude,
        distanceFromTeacher: distance,
      });

      return { id, distance: Math.round(distance) };
    } else {
      // Fallback for sessions without location (backward compatibility)
      const id = await ctx.db.insert("attendance", {
        sessionId,
        studentId,
        status: "present",
        markedAt: Date.now(),
        studentLatitude,
        studentLongitude,
      });

      return { id };
    }
  },
});

// Manual attendance management by teacher
export const setAttendanceStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
    status: v.union(v.literal("present"), v.literal("absent")),
    teacherId: v.id("teachers"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, studentId, status, teacherId, note }) => {
    // Verify session exists and teacher owns it
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== teacherId) throw new Error("Not authorized to modify this session");

    // Verify student exists
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("Student not found");

    // Check if student belongs to session's department and year
    if (student.department !== session.department || student.year !== session.year) {
      throw new Error("Student is not eligible for this session");
    }

    // Check if attendance record already exists
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", sessionId).eq("studentId", studentId)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status,
        isManuallySet: true,
        setByTeacher: teacherId,
        teacherNote: note,
        lastModified: Date.now(),
      });
      return { id: existing._id, action: "updated" };
    } else {
      // Create new attendance record
      const id = await ctx.db.insert("attendance", {
        sessionId,
        studentId,
        status,
        markedAt: Date.now(),
        isManuallySet: true,
        setByTeacher: teacherId,
        teacherNote: note,
        lastModified: Date.now(),
      });
      return { id, action: "created" };
    }
  },
});

// Mark students as absent when session closes
export const markAbsentStudents = mutation({
  args: {
    sessionId: v.id("sessions"),
    teacherId: v.id("teachers"),
  },
  handler: async (ctx, { sessionId, teacherId }) => {
    // Verify session exists and teacher owns it
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== teacherId) throw new Error("Not authorized");

    // Get all students in the same department and year
    const eligibleStudents = await ctx.db
      .query("students")
      .filter((q) =>
        q.and(
          q.eq(q.field("department"), session.department),
          q.eq(q.field("year"), session.year)
        )
      )
      .collect();

    // Get all attendance records for this session
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    const attendedStudentIds = new Set(
      existingAttendance.map((record) => record.studentId)
    );

    // Mark absent students
    let absentCount = 0;
    for (const student of eligibleStudents) {
      if (!attendedStudentIds.has(student._id)) {
        await ctx.db.insert("attendance", {
          sessionId,
          studentId: student._id,
          status: "absent",
          markedAt: Date.now(),
          isManuallySet: false, // Automatically marked absent
          teacherNote: "Automatically marked absent - session closed without attendance",
          lastModified: Date.now(),
        });
        absentCount++;
      }
    }

    return { 
      totalEligible: eligibleStudents.length,
      presentCount: existingAttendance.length,
      absentCount,
    };
  },
});

// Get comprehensive attendance report for session
export const getSessionAttendanceReport = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;

    // Get all attendance records for this session
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    // Get student details for each attendance record
    const attendanceWithStudents = await Promise.all(
      attendanceRecords.map(async (record) => {
        const student = await ctx.db.get(record.studentId);
        return {
          ...record,
          student,
        };
      })
    );

    // Get all eligible students (for absent tracking)
    const eligibleStudents = await ctx.db
      .query("students")
      .filter((q) =>
        q.and(
          q.eq(q.field("department"), session.department),
          q.eq(q.field("year"), session.year)
        )
      )
      .collect();

    const presentStudents = attendanceWithStudents.filter(r => r.status === "present");
    const absentStudents = attendanceWithStudents.filter(r => r.status === "absent");

    return {
      session,
      attendance: attendanceWithStudents,
      stats: {
        totalEligible: eligibleStudents.length,
        present: presentStudents.length,
        absent: absentStudents.length,
        presentPercentage: eligibleStudents.length > 0 
          ? Math.round((presentStudents.length / eligibleStudents.length) * 100) 
          : 0,
      },
      eligibleStudents,
    };
  },
});

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

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

export const getStudentAttendanceHistory = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();

    // Get session details for each attendance record
    const attendanceWithSessions = await Promise.all(
      attendance.map(async (record) => {
        const session = await ctx.db.get(record.sessionId);
        return {
          ...record,
          session: session ? {
            title: session.title,
            department: session.department,
            year: session.year,
            createdAt: session.createdAt,
            isOpen: session.isOpen,
          } : null,
        };
      })
    );

    return attendanceWithSessions.sort((a, b) => b.markedAt - a.markedAt);
  },
});
