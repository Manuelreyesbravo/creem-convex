// ============================================================
// Tests — Webhook Handler (handleCreemWebhook + routeEvent)
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleCreemWebhook } from "../src/webhook/handler.js";
import type { CreemWebhookHandlers } from "../src/types/index.js";

// Helper: compute HMAC-SHA256
async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["creem-signature"] = signature;
  return new Request("https://example.com/webhook", { method: "POST", headers, body });
}

const SECRET = "whsec_handler_test";

const mockCtx = {
  runMutation: vi.fn(async () => {}),
  runQuery: vi.fn(async () => {}),
  runAction: vi.fn(async () => {}),
};

describe("handleCreemWebhook", () => {
  beforeEach(() => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return 401 when signature header missing", async () => {
    const req = makeRequest('{"test":true}');
    const res = await handleCreemWebhook(mockCtx, req, {});
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Missing creem-signature");
  });

  it("should return 500 when CREEM_WEBHOOK_SECRET not set", async () => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", "");
    // Need to delete it entirely
    const origEnv = process.env.CREEM_WEBHOOK_SECRET;
    delete process.env.CREEM_WEBHOOK_SECRET;
    const body = '{"eventType":"checkout.completed"}';
    const sig = await sign(body, SECRET);
    const req = makeRequest(body, sig);
    const res = await handleCreemWebhook(mockCtx, req, {});
    expect(res.status).toBe(500);
    process.env.CREEM_WEBHOOK_SECRET = origEnv;
  });

  it("should return 401 for invalid signature", async () => {
    const body = '{"eventType":"checkout.completed"}';
    const req = makeRequest(body, "bad_signature");
    const res = await handleCreemWebhook(mockCtx, req, {});
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Invalid signature");
  });

  it("should return 400 for invalid JSON", async () => {
    const body = "not json {{{";
    const sig = await sign(body, SECRET);
    const req = makeRequest(body, sig);
    const res = await handleCreemWebhook(mockCtx, req, {});
    expect(res.status).toBe(400);
  });

  it("should return 200 and call onCheckoutCompleted", async () => {
    const event = {
      id: "evt_1",
      eventType: "checkout.completed",
      created_at: Date.now(),
      object: { id: "chk_1", status: "completed" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);
    const req = makeRequest(body, sig);

    const onCheckout = vi.fn(async () => {});
    const handlers: CreemWebhookHandlers = { onCheckoutCompleted: onCheckout };

    const res = await handleCreemWebhook(mockCtx, req, handlers);
    expect(res.status).toBe(200);
    expect(onCheckout).toHaveBeenCalledOnce();
    expect(onCheckout.mock.calls[0][1]).toEqual(event.object);
  });

  it("should call onGrantAccess for subscription.active", async () => {
    const event = {
      id: "evt_2",
      eventType: "subscription.active",
      created_at: Date.now(),
      object: { id: "sub_1", status: "active" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);
    const req = makeRequest(body, sig);

    const onGrant = vi.fn(async () => {});
    const onSubActive = vi.fn(async () => {});
    const handlers: CreemWebhookHandlers = {
      onGrantAccess: onGrant,
      onSubscriptionActive: onSubActive,
    };

    const res = await handleCreemWebhook(mockCtx, req, handlers);
    expect(res.status).toBe(200);
    expect(onGrant).toHaveBeenCalledOnce();
    expect(onSubActive).toHaveBeenCalledOnce();
  });

  it("should call onGrantAccess for subscription.trialing", async () => {
    const event = {
      id: "evt_3",
      eventType: "subscription.trialing",
      created_at: Date.now(),
      object: { id: "sub_1", status: "trialing" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const onGrant = vi.fn(async () => {});
    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), { onGrantAccess: onGrant });
    expect(res.status).toBe(200);
    expect(onGrant).toHaveBeenCalledOnce();
  });

  it("should call onRevokeAccess for subscription.canceled", async () => {
    const event = {
      id: "evt_4",
      eventType: "subscription.canceled",
      created_at: Date.now(),
      object: { id: "sub_1", status: "canceled" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const onRevoke = vi.fn(async () => {});
    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), { onRevokeAccess: onRevoke });
    expect(res.status).toBe(200);
    expect(onRevoke).toHaveBeenCalledOnce();
  });

  it("should call onRevokeAccess for subscription.expired", async () => {
    const event = {
      id: "evt_5",
      eventType: "subscription.expired",
      created_at: Date.now(),
      object: { id: "sub_1", status: "expired" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const onRevoke = vi.fn(async () => {});
    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), { onRevokeAccess: onRevoke });
    expect(res.status).toBe(200);
    expect(onRevoke).toHaveBeenCalledOnce();
  });

  it("should call onRevokeAccess for subscription.paused", async () => {
    const event = {
      id: "evt_6",
      eventType: "subscription.paused",
      created_at: Date.now(),
      object: { id: "sub_1", status: "paused" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const onRevoke = vi.fn(async () => {});
    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), { onRevokeAccess: onRevoke });
    expect(res.status).toBe(200);
    expect(onRevoke).toHaveBeenCalledOnce();
  });

  it("should return 200 even with no matching handlers", async () => {
    const event = {
      id: "evt_7",
      eventType: "refund.created",
      created_at: Date.now(),
      object: { id: "ref_1" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), {});
    expect(res.status).toBe(200);
  });

  it("should return 500 when handler throws", async () => {
    const event = {
      id: "evt_8",
      eventType: "checkout.completed",
      created_at: Date.now(),
      object: { id: "chk_err" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const handlers: CreemWebhookHandlers = {
      onCheckoutCompleted: vi.fn(async () => { throw new Error("DB down"); }),
    };

    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), handlers);
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Handler error");
  });

  it("should call subscription.paid with both specific handler and onGrantAccess", async () => {
    const event = {
      id: "evt_9",
      eventType: "subscription.paid",
      created_at: Date.now(),
      object: { id: "sub_1", status: "active" },
    };
    const body = JSON.stringify(event);
    const sig = await sign(body, SECRET);

    const onPaid = vi.fn(async () => {});
    const onGrant = vi.fn(async () => {});
    const handlers: CreemWebhookHandlers = {
      onSubscriptionPaid: onPaid,
      onGrantAccess: onGrant,
    };

    const res = await handleCreemWebhook(mockCtx, makeRequest(body, sig), handlers);
    expect(res.status).toBe(200);
    expect(onPaid).toHaveBeenCalledOnce();
    expect(onGrant).toHaveBeenCalledOnce();
  });
});
