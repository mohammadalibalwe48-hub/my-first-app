// Runs the deployed dispatcher code with a fake database/provider, real Web Push encryption.
// npx deno run --node-modules-dir=none --allow-env --allow-read scripts/test_web_push.ts
import webpush from "npm:web-push@3.6.7";
import { createECDH, randomBytes, createPublicKey, verify } from "node:crypto";
import ece from "npm:http_ece@1.2.1";
import { Buffer } from "node:buffer";
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const keys = webpush.generateVAPIDKeys();
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
Deno.env.set("WEB_PUSH_PUBLIC_KEY", keys.publicKey);
Deno.env.set("WEB_PUSH_PRIVATE_KEY", keys.privateKey);
Deno.env.set("ORDER_PUSH_DISPATCH_SECRET", "local-fixture");
const receiver = createECDH("prime256v1");
receiver.generateKeys();
const auth = randomBytes(16);
const endpoint = "https://fcm.googleapis.com/fcm/send/local-fixture";
const subscription = {
  id: "subscription",
  user_id: "user",
  restaurant_id: "restaurant",
  endpoint,
  p256dh: receiver.getPublicKey().toString("base64url"),
  auth: auth.toString("base64url"),
};
const payload = {
  title: "New order",
  body: "Order 42",
  tag: "order-42",
  url: "/admin/sufra/orders",
};
const job = {
  id: "job",
  restaurant_id: "restaurant",
  delivered: [],
  attempts: 1,
  lease: "lease",
  payload,
};
let providerStatus = 201,
  providerCalls = 0,
  deleted = false,
  updates: any[] = [];
let handler: (req: Request) => Promise<Response>;
// Capture the actual Edge Function handler without opening a local server.
Object.defineProperty(Deno, "serve", {
  value: (fn: any) => {
    handler = fn;
  },
});
globalThis.fetch = async (input: any, init: any) => {
  const url = String(input);
  if (url === endpoint) {
    providerCalls++;
    try {
      const encrypted = Buffer.from(init.body);
      const plain = ece.decrypt(encrypted, {
        version: "aes128gcm",
        privateKey: receiver,
        authSecret: auth,
      });
      assert(
        plain.toString() === JSON.stringify(payload),
        "Encrypted payload did not decrypt",
      );
      assert(
        !encrypted.includes(Buffer.from("New order")),
        "Payload leaked as plaintext",
      );
      const header = init.headers.Authorization || init.headers.authorization;
      const jwt = /t=([^,]+)/.exec(header)?.[1];
      assert(jwt, "VAPID JWT missing");
      const [h, p, s] = jwt!.split(".");
      const claims = JSON.parse(Buffer.from(p, "base64url").toString());
      assert(
        claims.aud === "https://fcm.googleapis.com",
        "Wrong VAPID audience",
      );
      const raw = Buffer.from(keys.publicKey, "base64url");
      const pub = createPublicKey({
        key: {
          kty: "EC",
          crv: "P-256",
          x: raw.subarray(1, 33).toString("base64url"),
          y: raw.subarray(33).toString("base64url"),
        },
        format: "jwk",
      });
      assert(
        verify(
          "sha256",
          Buffer.from(`${h}.${p}`),
          { key: pub, dsaEncoding: "ieee-p1363" },
          Buffer.from(s, "base64url"),
        ),
        "VAPID signature invalid",
      );
      return new Response("", { status: providerStatus });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  if (url.includes("/rpc/claim_order_push_jobs")) return Response.json([job]);
  if (url.includes("/rpc/order_push_targets"))
    return Response.json([subscription]);
  if (url.includes("/order_push_jobs") && init.method === "PATCH") {
    updates.push(JSON.parse(init.body));
    return new Response(null, { status: 204 });
  }
  if (url.includes("/staff_push_subscriptions") && init.method === "DELETE") {
    deleted = true;
    return new Response(null, { status: 204 });
  }
  throw new Error("Unexpected fetch " + url);
};
await import("../supabase/functions/order-push/index.ts");
const invoke = () =>
  handler(
    new Request("https://test/order-push", {
      method: "POST",
      headers: { "x-dispatch-secret": "local-fixture" },
    }),
  );
assert((await invoke()).status === 200, "Dispatcher failed");
assert(providerCalls === 1, "Provider not called");
assert(updates.at(-1).finished_at, "Successful job unfinished");
providerStatus = 503;
updates = [];
await invoke();
assert(
  updates.at(-1).finished_at === null,
  "Transient error was not queued for retry",
);
providerStatus = 410;
updates = [];
await invoke();
assert(deleted, "Expired subscription was not deleted");
const calls = providerCalls;
subscription.endpoint = "https://127.0.0.1/private";
await invoke();
assert(providerCalls === calls, "Private network endpoint fetched");
assert(
  (await handler(new Request("https://test/order-push", { method: "POST" })))
    .status === 401,
  "Unauthenticated dispatcher allowed",
);
console.log(
  "PASS real Web Push payload encryption/decryption, VAPID signature, retries, expired devices, SSRF guard and authentication",
);
