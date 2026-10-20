import { supabase } from "./supabase";
import { WEB_PUSH_PUBLIC_KEY } from "./pushConfig";

export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
export async function pushWorker() {
  if (!pushSupported())
    throw new Error(
      "هذا المتصفح لا يدعم الإشعارات. على الآيفون أضف التطبيق للشاشة الرئيسية وافتحه من الأيقونة.",
    );
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}
export async function savePush(
  restaurantId: string,
  requestPermission = false,
) {
  if (!pushSupported())
    throw new Error(
      "على الآيفون: أضف التطبيق للشاشة الرئيسية وافتحه من الأيقونة. استخدم متصفحاً يدعم الإشعارات.",
    );
  // Call permission directly from the button gesture, before awaiting worker registration.
  const permission = requestPermission
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted")
    throw new Error("اسمح بالإشعارات من إعدادات المتصفح، ثم فعّلها مجدداً.");
  const registration = await pushWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    if (!requestPermission) return null;
    const raw = atob(WEB_PUSH_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/"));
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    });
  }
  const json = subscription.toJSON();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("سجّل الدخول مجدداً لتفعيل الإشعارات.");
  const { data, error } = await supabase
    .from("staff_push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        restaurant_id: restaurantId,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
      { onConflict: "user_id,restaurant_id,endpoint" },
    )
    .select("id")
    .single();
  if (error) throw new Error("تعذر تسجيل الجهاز للإشعارات. حاول مجدداً.");
  return data.id as string;
}
export async function disablePush(restaurantId?: string) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  if (!restaurantId) await subscription.unsubscribe();
  let query = supabase
    .from("staff_push_subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint);
  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  const { error } = await query;
  if (error && restaurantId)
    throw new Error("تعذر إيقاف إشعارات الجهاز. حاول مجدداً.");
  // Other restaurants may still use this browser's subscription.
}
