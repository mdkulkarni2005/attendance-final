import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getStudentByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

export const getStudentBySapId = query({
  args: { sapId: v.string() },
  handler: async (ctx, { sapId }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_sapId", (q) => q.eq("sapId", sapId))
      .unique();
  },
});

export const getStudentByRollNo = query({
  args: { rollNo: v.string() },
  handler: async (ctx, { rollNo }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_rollNo", (q) => q.eq("rollNo", rollNo))
      .unique();
  },
});

export const getStudentByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const getTeacherByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("teachers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

export const createStudent = mutation({
  args: {
    name: v.string(),
    year: v.number(),
    semester: v.number(),
    department: v.string(),
    phone: v.string(),
    sapId: v.string(),
    rollNo: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("students", {
      name: args.name,
      year: args.year,
      semester: args.semester,
      department: args.department,
      phone: args.phone,
      sapId: args.sapId,
      rollNo: args.rollNo,
      email: args.email,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
      updatedAt: undefined,
    });
    return { id };
  },
});

export const createTeacher = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("teachers", {
      name: args.name,
      phone: args.phone,
      email: args.email,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
      updatedAt: undefined,
    });
    return { id };
  },
});
