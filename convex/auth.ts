// @ts-nocheck
import { action } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { api } from "./_generated/api";

export const registerStudentAction = action({
  args: {
    name: v.string(),
    year: v.number(),
    semester: v.number(),
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

export const loginTeacherAction = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.runQuery(api.users.getTeacherByEmail, { email });
    if (!user) throw new Error("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");
    return { id: user._id, name: user.name, email: user.email };
  },
});
