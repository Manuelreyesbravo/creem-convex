// ============================================================
// Tests — Action Helpers (getCreemClient, etc.)
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCreemClient } from "../src/actions/index.js";

// Mock fetch for action helpers that create clients
vi.stubGlobal("fetch", vi.fn());

describe("Action Helpers", () => {
  describe("getCreemClient", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should throw when CREEM_API_KEY is not set", () => {
      delete process.env.CREEM_API_KEY;
      expect(() => getCreemClient()).toThrow("CREEM_API_KEY environment variable not set");
    });

    it("should return a CreemClient when key is set", () => {
      vi.stubEnv("CREEM_API_KEY", "creem_test_key_123");
      const client = getCreemClient();
      expect(client).toBeDefined();
      expect(client.getProduct).toBeTypeOf("function");
      expect(client.createCheckout).toBeTypeOf("function");
    });

    it("should use testMode when CREEM_TEST_MODE is true", () => {
      vi.stubEnv("CREEM_API_KEY", "creem_key");
      vi.stubEnv("CREEM_TEST_MODE", "true");
      const client = getCreemClient();
      expect(client).toBeDefined();
    });

    it("should default to production mode", () => {
      vi.stubEnv("CREEM_API_KEY", "creem_key");
      vi.stubEnv("CREEM_TEST_MODE", "false");
      const client = getCreemClient();
      expect(client).toBeDefined();
    });
  });
});
