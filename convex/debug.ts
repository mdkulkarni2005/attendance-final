import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllStudents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

export const getAllTeachers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teachers").collect();
  },
});

// Backfill missing attendance.status values
export const backfillAttendanceStatus = mutation({
  args: {
    // Fallback status to apply when we cannot infer it confidently
    defaultStatus: v.optional(v.union(v.literal("present"), v.literal("absent"))),
  },
  handler: async (ctx, { defaultStatus = "present" }) => {
    const all = await ctx.db.query("attendance").collect();
    let updated = 0;

    for (const doc of all) {
      // If status is already set, skip
      if ((doc as any).status === "present" || (doc as any).status === "absent") continue;

      // Heuristic: if we have any location fields, we consider it a present mark
      const hasLocation =
        typeof (doc as any).studentLatitude === "number" ||
        typeof (doc as any).studentLongitude === "number" ||
        typeof (doc as any).distanceFromTeacher === "number";

      const inferred = hasLocation ? "present" : defaultStatus;

      await ctx.db.patch(doc._id, {
        status: inferred,
        lastModified: Date.now(),
      });
      updated++;
    }

    return { scanned: all.length, updated };
  },
});
