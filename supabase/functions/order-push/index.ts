import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const origin = "https://my-first-app-dun-rho.vercel.app";
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: cors });
function safeEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      /^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(
        u.hostname,
      )
    );
  } catch {
    return false;
  }
}
async function equalSecret(value: string | null) {
  const expected = Deno.env.get("ORDER_PUSH_DISPATCH_SECRET");
  if (!value || !expected) return false;
  const digest = async (s: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    );
  const [a, b] = await Promise.all([digest(value), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function dispatch() {
  const { data: jobs, error } = await db.rpc("claim_order_push_jobs");
  if (error) throw new Error("claim_failed");
  let sent = 0,
    retrying = 0;
  const deadline = Date.now() + 45000;
  for (const job of jobs ?? []) {
    const { data: targets, error: targetError } = await db.rpc(
      "order_push_targets",
      { p_restaurant_id: job.restaurant_id },
    );
    if (targetError) {
      retrying++;
      continue;
    }
    let failed = false;
    const delivered: string[] = [...job.delivered];
    const pending = (targets ?? []).filter(
      (s: any) =>
        !delivered.includes(s.id) &&
        (!job.test_subscription_id || s.id === job.test_subscription_id),
    );
    // Limit concurrency and record each success before moving to the next device.
    for (const subscription of pending) {
      if (Date.now() > deadline) {
        failed = true;
        break;
      }
      try {
        if (!safeEndpoint(subscription.endpoint))
          throw new Error("invalid_endpoint");
        const request = webpush.generateRequestDetails(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          JSON.stringify(job.payload),
          {
            TTL: 3600,
            urgency: "high",
            vapidDetails: {
              subject: origin,
              publicKey: Deno.env.get("WEB_PUSH_PUBLIC_KEY")!,
              privateKey: Deno.env.get("WEB_PUSH_PRIVATE_KEY")!,
            },
          },
        );
        const result = await fetch(request.endpoint, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
        await result.body?.cancel();
        if (result.status === 404 || result.status === 410) {
          await db
            .from("staff_push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        } else if (!result.ok) {
          failed = true;
          continue;
        }
        delivered.push(subscription.id);
        sent++;
        const { error: saveError } = await db
          .from("order_push_jobs")
          .update({ delivered })
          .eq("id", job.id)
          .eq("lease", job.lease);
        if (saveError) {
          failed = true;
          break;
        }
      } catch {
        failed = true;
      }
    }
    const { error: finishError } = await db
      .from("order_push_jobs")
      .update({
        delivered,
        finished_at: failed ? null : new Date().toISOString(),
        next_attempt_at: new Date(
          Date.now() +
            Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7)) * 1000,
        ).toISOString(),
      })
      .eq("id", job.id)
      .eq("lease", job.lease);
    if (failed || finishError) retrying++;
  }
  return { processed: jobs?.length ?? 0, sent, retrying };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST")
    return response({ error: "method_not_allowed" }, 405);
  try {
    if (await equalSecret(req.headers.get("x-dispatch-secret")))
      return response(await dispatch());
    // Authenticated test sends through the same outbox/provider to this user's device only.
    const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!token) return response({ error: "unauthorized" }, 401);
    const {
      data: { user },
      error,
    } = await db.auth.getUser(token);
    if (error || !user) return response({ error: "unauthorized" }, 401);
    const input = await req.json();
    const { data: subscription } = await db
      .from("staff_push_subscriptions")
      .select("id,restaurant_id")
      .eq("id", input.subscriptionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!subscription)
      return response({ error: "subscription_not_found" }, 404);
    const { data: targets, error: targetError } = await db.rpc(
      "order_push_targets",
      { p_restaurant_id: subscription.restaurant_id },
    );
    if (targetError || !targets?.some((s: any) => s.id === subscription.id))
      return response({ error: "forbidden" }, 403);
    const { count } = await db
      .from("order_push_jobs")
      .select("id", { count: "exact", head: true })
      .eq("test_subscription_id", subscription.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if ((count ?? 0) >= 3)
      return response({ error: "try_again_in_one_minute" }, 429);
    const { data: job, error: enqueueError } = await db
      .from("order_push_jobs")
      .insert({
        restaurant_id: subscription.restaurant_id,
        test_subscription_id: subscription.id,
        payload: {
          title: "SYRIAN QR · اختبار الإشعارات",
          body: "جهازك جاهز لاستقبال إشعارات الطلبات حتى بعد إغلاق التطبيق.",
          tag: "push-test",
          url: "/admin",
        },
      })
      .select("id")
      .single();
    if (enqueueError) throw new Error("enqueue_failed");
    await dispatch();
    const { data: result } = await db
      .from("order_push_jobs")
      .select("delivered,finished_at")
      .eq("id", job.id)
      .single();
    return response({
      sent: result?.delivered?.includes(subscription.id) ?? false,
      queued: !result?.finished_at,
    });
  } catch {
    console.error("order_push_failed");
    return response({ error: "push_delivery_failed" }, 500);
  }
});
