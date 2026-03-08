// ============================================================
// Demo Schema — uses creem-convex tables + app tables
// ============================================================
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { creemTables } from "creem-convex/schema";

export default defineSchema({
  // Creem payment tables — one line to add all 4 tables
  ...creemTables,

  // Your app tables
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    creemCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()), // "free" | "pro" | "enterprise"
    hasAccess: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_creem_customer", ["creemCustomerId"]),
});
