// ============================================================
// Tests — Schema validation
// ============================================================
import { describe, it, expect } from "vitest";
import { creemTables } from "../src/schema.js";

describe("creemTables schema", () => {
  it("should export 4 table definitions", () => {
    const tables = Object.keys(creemTables);
    expect(tables).toHaveLength(4);
    expect(tables).toContain("creem_payments");
    expect(tables).toContain("creem_subscriptions");
    expect(tables).toContain("creem_customers");
    expect(tables).toContain("creem_webhook_events");
  });

  it("should be spreadable into a schema", () => {
    // Verify the shape works for Convex defineSchema spread
    const combined = { ...creemTables, myOtherTable: {} };
    expect(Object.keys(combined)).toHaveLength(5);
  });
});
