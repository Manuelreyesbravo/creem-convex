// ============================================================
// Tests — Webhook Signature Verification
// ============================================================
import { describe, it, expect } from "vitest";
import { verifyWebhookSignature } from "../src/webhook/verify.js";

// Helper: compute HMAC-SHA256 to generate valid signatures for tests
async function computeHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifyWebhookSignature", () => {
  const secret = "whsec_test_secret_123";

  it("should return true for valid signature", async () => {
    const payload = '{"eventType":"checkout.completed","id":"evt_1"}';
    const sig = await computeHmac(payload, secret);
    expect(await verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("should return false for invalid signature", async () => {
    const payload = '{"eventType":"checkout.completed"}';
    expect(await verifyWebhookSignature(payload, "invalid_hex", secret)).toBe(false);
  });

  it("should return false for tampered payload", async () => {
    const original = '{"amount":100}';
    const sig = await computeHmac(original, secret);
    const tampered = '{"amount":999}';
    expect(await verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });

  it("should return false for wrong secret", async () => {
    const payload = '{"test":true}';
    const sig = await computeHmac(payload, "wrong_secret");
    expect(await verifyWebhookSignature(payload, sig, secret)).toBe(false);
  });

  it("should handle empty payload", async () => {
    const sig = await computeHmac("", secret);
    expect(await verifyWebhookSignature("", sig, secret)).toBe(true);
  });

  it("should handle unicode payload", async () => {
    const payload = '{"name":"José García","emoji":"🎉"}';
    const sig = await computeHmac(payload, secret);
    expect(await verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });
});
