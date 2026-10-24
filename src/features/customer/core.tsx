import { useEffect, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import { formatSyp, formatUsd } from "../../domain";
import { useCustomerText } from "../customerText";
function useOverlay(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.body.style.overflow;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    const dialog = () =>
      [...document.querySelectorAll<HTMLElement>('.cx [role="dialog"]')].at(-1);
    const focusable = () =>
      [
        ...(dialog()?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? []),
      ].filter((el) => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() =>
      focusable()[0]?.focus({ preventScroll: true }),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0],
        last = elements[elements.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog()?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog()?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
}

function money(
  value: number,
  currency: "syp" | "usd",
  rate: number,
  language: "ar" | "en" = "ar",
) {
  return currency === "usd"
    ? formatUsd(value, rate)
    : language === "en"
      ? `${new Intl.NumberFormat("en").format(value)} SYP`
      : formatSyp(value);
}

function moneySecondary(
  value: number,
  currency: "syp" | "usd",
  rate: number,
  language: "ar" | "en" = "ar",
) {
  return currency === "usd"
    ? money(value, "syp", rate, language)
    : `≈ ${formatUsd(value, rate)}`;
}

function Stepper({
  qty,
  onDec,
  onInc,
  labels,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  labels?: { dec: string; inc: string };
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  return (
    <div className="cx-stepper">
      <button
        type="button"
        className="cx-stepper__btn"
        onClick={onDec}
        aria-label={labels?.dec ?? tx("إنقاص الكمية")}
      >
        <Minus size={17} aria-hidden="true" />
      </button>
      <b className="cx-stepper__num mono-num" aria-live="polite">
        {qty}
      </b>
      <button
        type="button"
        className="cx-stepper__btn cx-stepper__btn--plus"
        onClick={onInc}
        aria-label={labels?.inc ?? tx("زيادة الكمية")}
      >
        <Plus size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

export { useOverlay, money, moneySecondary, Stepper };
