import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../supabase";
import "./dialogs.css";

export default function StaffAuthModal({
  language,
  onClose,
  onSuccess,
}: {
  language: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const en = language === "en";
  const ownerEmail = "admin@qrcode-syria.com";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const finishInitialOwnerOnboarding = async (signedInEmail: string) => {
    if (signedInEmail.toLowerCase() !== ownerEmail) return true;
    const { error } = await supabase.rpc("bootstrap_initial_owner");
    if (!error) return true;
    if (error.message.includes("already been completed")) return true;
    setMessage(
      en
        ? `Signed in, but the owner membership could not be activated: ${error.message}`
        : `تم تسجيل الدخول، لكن تعذر تفعيل عضوية المالك: ${error.message}`,
    );
    return false;
  };

  const signIn = async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      setMessage(
        error.message.toLowerCase().includes("invalid login")
          ? en
            ? "The email or password is incorrect."
            : "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : en
            ? `Could not sign in: ${error.message}`
            : `تعذر تسجيل الدخول: ${error.message}`,
      );
      return;
    }
    const ready = await finishInitialOwnerOnboarding(data.user.email ?? email);
    setLoading(false);
    if (ready) onSuccess();
  };

  const signUpInitialOwner = async () => {
    if (email.trim().toLowerCase() !== ownerEmail) {
      setMessage(
        en
          ? `Initial registration is only available for ${ownerEmail}.`
          : `التسجيل الأولي متاح فقط للبريد ${ownerEmail}.`,
      );
      return;
    }
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: ownerEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: "مالك سُفرة" },
      },
    });
    if (error) {
      setLoading(false);
      setMessage(
        en
          ? `Could not create the owner account: ${error.message}`
          : `تعذر إنشاء حساب المالك: ${error.message}`,
      );
      return;
    }
    if (!data.session) {
      setLoading(false);
      setMessage(
        en
          ? "Account created. Open the confirmation email, then return and sign in to finish activating the owner membership."
          : "تم إنشاء الحساب. افتح رسالة التأكيد في البريد الإلكتروني، ثم عد وسجّل الدخول لإكمال تفعيل عضوية المالك.",
      );
      return;
    }
    const ready = await finishInitialOwnerOnboarding(ownerEmail);
    setLoading(false);
    if (ready) onSuccess();
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage(
        en
          ? "Enter your email address first so we can send a reset link."
          : "أدخل البريد الإلكتروني أولاً لإرسال رابط الاستعادة.",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    setMessage(
      error
        ? en
          ? `Could not send the link: ${error.message}`
          : `تعذر إرسال الرابط: ${error.message}`
        : en
          ? "If an account exists for that email, a password reset link has been sent."
          : "أُرسل رابط استعادة كلمة المرور إلى بريدك إن كان الحساب موجوداً.",
    );
  };

  return (
    <div className="modal-backdrop" dir={en ? "ltr" : "rtl"} lang={language} onMouseDown={onClose}>
      <div
        className="modal modal--narrow auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label={en ? "Close" : "إغلاق"}>
          <X />
        </button>
        <span
          className="section-kicker"
          style={{ justifyContent: "center", marginTop: "6px" }}
        >
          {en ? "Staff access" : "دخول الموظفين"}
        </span>
        <h2 id="staff-auth-title">{en ? "Restaurant dashboard" : "لوحة المطعم"}</h2>
        <p>
          {en
            ? "Use the staff account provided by your restaurant owner. Guests do not need an account."
            : "استخدم حساب الموظف الذي أضافه مالك المطعم. لا يحتاج الزبائن إلى حساب."}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn();
          }}
        >
          <label className="form-field">
            <span>{en ? "Email address" : "البريد الإلكتروني"}</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={ownerEmail}
            />
          </label>
          <label className="form-field">
            <span>{en ? "Password" : "كلمة المرور"}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={en ? "Password" : "كلمة المرور"}
            />
          </label>
          {message && <div className="auth-msg">{message}</div>}
          <button className="btn btn--gold" type="submit" disabled={loading}>
            {loading
              ? en
                ? "Signing in…"
                : "جارٍ تسجيل الدخول…"
              : en
                ? "Sign in"
                : "تسجيل الدخول"}
          </button>
          {email.trim().toLowerCase() === ownerEmail && (
            <button
              className="btn btn--outline"
              type="button"
              disabled={loading || password.length < 6}
              onClick={() => void signUpInitialOwner()}
            >
              {en ? "Create the initial owner account" : "إنشاء حساب المالك لأول مرة"}
            </button>
          )}
          <button
            className="link-btn"
            type="button"
            disabled={loading}
            onClick={() => void resetPassword()}
          >
            {en ? "Forgot password?" : "نسيت كلمة المرور؟"}
          </button>
        </form>
        <small>
          {en
            ? "Access is tied to restaurant membership and enforced by the database."
            : "الصلاحيات مرتبطة بعضوية المطعم وتُطبق في قاعدة البيانات."}
        </small>
      </div>
    </div>
  );
}

