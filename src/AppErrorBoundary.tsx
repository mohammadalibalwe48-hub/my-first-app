import { Component, type ErrorInfo, type ReactNode } from "react";
import "./recovery.css";

declare global {
  interface Window {
    __appRecovery?: { recover: (error: unknown) => boolean };
  }
}

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidMount() {
    window.dispatchEvent(new Event("app:mounted"));
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    // The boot helper only reloads known asset-load failures, once per minute per tab.
    window.__appRecovery?.recover(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const english = document.documentElement.lang === "en";
    return (
      <main className="app-recovery" role="alert" dir={english ? "ltr" : "rtl"}>
        <span className="app-recovery__mark" aria-hidden="true">
          ↻
        </span>
        <h1>{english ? "Let’s get you back" : "خلّينا نرجع نفتح التطبيق"}</h1>
        <p>
          {english
            ? "The page could not load correctly. Check your connection, then try again."
            : "تعذّر فتح الصفحة بشكل صحيح. تأكد من الاتصال، ثم أعد المحاولة."}
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          {english ? "Reload this page" : "إعادة تحميل الصفحة"}
        </button>
      </main>
    );
  }
}
