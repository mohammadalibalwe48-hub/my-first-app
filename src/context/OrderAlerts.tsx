import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { supabase } from "../supabase";
import { disablePush, pushSupported, savePush } from "../orderPush";
import { useUI } from "./UI";
import type { Order } from "../domain";
import "./orderAlerts.css";

type Alerts = {
  sound: boolean;
  subscriptionId: string | null;
  busy: boolean;
  message: string;
  toggleSound: () => Promise<void>;
  togglePush: () => Promise<void>;
  test: () => Promise<void>;
};
const Context = createContext<Alerts | null>(null);
export function useOrderAlerts() {
  const value = useContext(Context);
  if (!value) throw new Error("Order alerts provider missing");
  return value;
}
export function OrderAlertsProvider({
  restaurantId,
  orders,
  ready,
  children,
}: {
  restaurantId: string;
  orders: Order[];
  ready: boolean;
  children: ReactNode;
}) {
  const [sound, setSound] = useState(false),
    [subscriptionId, setSubscriptionId] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const audio = useRef<AudioContext | null>(null),
    known = useRef<Set<string> | null>(null);
  const { language } = useUI();
  const en = language === "en";
  const t = (ar: string, english: string) => (en ? english : ar);
  const chime = async () => {
    const ctx = audio.current;
    if (!ctx) return;
    await ctx.resume();
    if (ctx.state !== "running") throw new Error("sound_suspended");
    for (let i = 0; i < 2; i++) {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + i * 0.23;
      oscillator.frequency.value = i ? 960 : 760;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  };
  useEffect(
    () => () => {
      void audio.current?.close();
      audio.current = null;
    },
    [],
  );
  useEffect(() => {
    let active = true;
    if (pushSupported() && Notification.permission === "granted") {
      // Only refresh an already enabled restaurant; visiting another restaurant doesn't opt it in.
      void (async () => {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) return;
        const { data, error } = await supabase
          .from("staff_push_subscriptions")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("endpoint", subscription.endpoint)
          .maybeSingle();
        if (active && !error && data) setSubscriptionId(data.id);
      })().catch(() => {
        if (active)
          setMessage(
            t(
              "تعذر التحقق من تسجيل الجهاز. اضغط تفعيل الإشعارات.",
              "Could not check this device. Enable notifications again.",
            ),
          );
      });
    }
    return () => {
      active = false;
    };
  }, [restaurantId]);
  useEffect(() => {
    if (!ready) return;
    const ids = orders.map((o) => o.databaseId || o.id);
    const fresh = known.current
      ? orders.filter((o) => !known.current!.has(o.databaseId || o.id))
      : [];
    // Keep IDs beyond the 250-order query limit so status updates don't become new alerts.
    if (!known.current) known.current = new Set(ids);
    else ids.forEach((id) => known.current!.add(id));
    if (!fresh.length) return;
    setMessage(
      t(
        `وصل ${fresh.length} طلب جديد · ${fresh[0].id}`,
        `${fresh.length} new order(s) · ${fresh[0].id}`,
      ),
    );
    if (sound)
      void chime().catch(() => {
        setSound(false);
        setMessage(
          t(
            "اضغط تفعيل الصوت مجدداً؛ المتصفح أوقف تشغيله.",
            "Enable sound again; the browser suspended audio.",
          ),
        );
      });
  }, [orders, ready, sound]);
  const toggleSound = async () => {
    if (sound) {
      setSound(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await chime();
      setSound(true);
      setMessage(
        t("الصوت مفعّل لهذه الجلسة.", "Sound enabled for this session."),
      );
    } catch {
      setMessage(
        t(
          "تعذر تشغيل الصوت. افحص إعدادات المتصفح.",
          "Could not play sound. Check browser settings.",
        ),
      );
    }
  };
  const togglePush = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (subscriptionId) {
        await disablePush(restaurantId);
        setSubscriptionId(null);
        setMessage(
          t(
            "أوقفت إشعارات هذا المطعم على هذا الجهاز.",
            "Notifications disabled for this restaurant on this device.",
          ),
        );
      } else {
        const id = await savePush(restaurantId, true);
        setSubscriptionId(id);
        setMessage(
          t(
            "تم تسجيل جهازك. اضغط اختبار للتأكد من وصول الإشعار.",
            "Device registered. Send a test to confirm delivery.",
          ),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("تعذر تفعيل الإشعارات.", "Could not enable notifications."),
      );
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (sound) await chime();
      if (subscriptionId) {
        const { data, error } = await supabase.functions.invoke("order-push", {
          body: { subscriptionId },
        });
        if (error || data?.error)
          throw new Error(
            t(
              "تعذر إرسال الاختبار. حاول مجدداً بعد دقيقة.",
              "Test failed. Try again in one minute.",
            ),
          );
        setMessage(
          data?.sent
            ? t(
                "تم إرسال الاختبار لجهازك. افحص مركز الإشعارات.",
                "Test sent to your device. Check your notifications.",
              )
            : t(
                "الاختبار بانتظار إعادة المحاولة من السيرفر.",
                "Test queued for server retry.",
              ),
        );
      } else
        setMessage(
          t(
            "فعّل إشعارات الجهاز أولاً لاختبار وصولها بعد إغلاق التطبيق.",
            "Enable device notifications first to test delivery after closing the app.",
          ),
        );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        sound,
        subscriptionId,
        busy,
        message,
        toggleSound,
        togglePush,
        test,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function OrderAlertsPanel() {
  const {
    sound,
    subscriptionId,
    busy,
    message,
    toggleSound,
    togglePush,
    test,
  } = useOrderAlerts();
  const { language } = useUI();
  const t = (ar: string, en: string) => (language === "en" ? en : ar);
  return (
    <aside
      className="order-alerts"
      aria-label={t("تنبيهات الطلبات", "Order alerts")}
    >
      <div className="order-alerts__buttons">
        <strong>{t("تنبيهات الطلبات", "Order alerts")}</strong>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          aria-pressed={sound}
          onClick={() => void toggleSound()}
        >
          {sound ? <Volume2 /> : <VolumeX />}
          {sound
            ? t("إيقاف الصوت", "Mute sound")
            : t("تفعيل الصوت", "Enable sound")}
        </button>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          disabled={busy}
          aria-pressed={!!subscriptionId}
          onClick={() => void togglePush()}
        >
          <Bell />
          {subscriptionId
            ? t("إيقاف إشعارات الجهاز", "Disable device notifications")
            : t("تفعيل إشعارات الجهاز", "Enable device notifications")}
        </button>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          disabled={busy}
          onClick={() => void test()}
        >
          {busy
            ? t("جارٍ التنفيذ…", "Working…")
            : t("اختبار الإشعار", "Test notification")}
        </button>
      </div>
      <details className="order-alerts__help">
        <summary>
          {t(
            "طريقة التفعيل والصوت على الموبايل",
            "Device setup and sound help",
          )}
        </summary>
        <small>
          {subscriptionId
            ? t(
                "هذا الجهاز مسجّل لاستقبال الإشعارات بعد إغلاق التطبيق.",
                "This device is registered for notifications after closing the app.",
              )
            : t(
                "فعّل الإشعارات على كل جهاز. على الآيفون: أضف للشاشة الرئيسية وافتح من الأيقونة.",
                "Enable notifications on each device. On iPhone: Add to Home Screen, then open the app icon.",
              )}
        </small>
        <small>
          {t(
            "الصوت داخل الصفحة يحتاج تفعيل بكل جلسة. صوت شاشة القفل يتبع إعدادات جهازك وعدم الإزعاج.",
            "In-page sound needs activation each session. Lock-screen sound follows your device and Do Not Disturb settings.",
          )}
        </small>
      </details>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </aside>
  );
}
