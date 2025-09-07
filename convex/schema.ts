import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  students: defineTable({
    name: v.string(),
    year: v.number(),
    semester: v.number(),
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
  })
    .index("by_teacher", ["teacherId"]) 
    .index("by_dept_year", ["department", "year"]) 
    .index("by_open", ["isOpen"]),

  attendance: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
    markedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_student", ["studentId"])
    .index("by_session_student", ["sessionId", "studentId"]),
});
