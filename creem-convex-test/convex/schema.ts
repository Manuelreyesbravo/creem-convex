// =============================================
// TEST 1: Schema — creemTables spreads correctly
// =============================================
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { creemTables } from "creem-convex/schema";

export default defineSchema({
  ...creemTables,

  // Simulate a real app with its own tables
  users: defineTable({
    name: v.string(),
    email: v.string(),
    creemCustomerId: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
