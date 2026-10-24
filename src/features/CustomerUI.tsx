import { useCustomerText } from "./customerText";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Store,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import {
  verifyOnSitePresence,
  type GeoFix,
  type PresenceResult,
} from "../geolocation";
import { calculateTotals } from "../ordering";
import {
  modeLabels,
  readStored,
  writeStored,
  type CartLine,
  type Mode,
  type PublicMenuPayload,
  type RestaurantSettings,
} from "../domain";
import { useOverlay, money, moneySecondary } from "./customer/core";
import "./customer/app.css";
const modeIcon = (mode: Mode) =>
  mode === "dine-in" ? Store : mode === "takeaway" ? ShoppingBasket : Truck;
const modeIconBig = (mode: Mode) =>
  mode === "dine-in" ? "على الطاولة" : mode === "takeaway" ? "سفري" : "توصيل";
const PAY_CASH_DINE = "الدفع نقداً";
const PAY_CASH_DELIVERY = "الدفع نقداً عند الاستلام";
const PAY_WALLETS = ["Syriatel Cash", "Sham Cash / BEMO", "MTN Cash"] as const;

function CheckoutModal({
  total,
  restaurantSlug,
  mode,
  setMode,
  onClose,
  onSubmit,
  settings,
  tableContext,
  backendReady,
  currency,
  rate,
  lines,
}: {
  total: number;
  restaurantSlug: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSubmit: (
    form: HTMLFormElement,
    fix?: GeoFix | null,
  ) => boolean | Promise<boolean>;
  settings?: RestaurantSettings;
  tableContext: PublicMenuPayload["table"];
  backendReady: boolean;
  currency: "syp" | "usd";
  rate: number;
  lines?: CartLine[];
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  useOverlay(onClose);
  const preferenceKey = `syrianqr-checkout-v1-${restaurantSlug}`;
  const [savedDetails] = useState(() =>
    readStored<{
      customer?: string;
      phone?: string;
      address?: string;
      zone?: string;
    } | null>(preferenceKey, null),
  );
  const [stage, setStage] = useState(0);
  const [remember, setRemember] = useState(Boolean(savedDetails));
  const [zoneId, setZoneId] = useState(
    savedDetails?.zone ?? settings?.zones.find((z) => z.active)?.id ?? "",
  );
  const zone = settings?.zones.find((z) => z.id === zoneId && z.active);
  useEffect(() => {
    if (!settings?.zones.some((z) => z.id === zoneId && z.active))
      setZoneId(settings?.zones.find((z) => z.active)?.id ?? "");
  }, [settings?.zones, zoneId]);
  const totals = calculateTotals(
    total,
    settings,
    mode === "delivery" ? (zone?.fee ?? 0) : 0,
  );

  const cashValue = mode === "delivery" ? PAY_CASH_DELIVERY : PAY_CASH_DINE;
  const [pay, setPay] = useState<string>(cashValue);
  const [orderBusy, setOrderBusy] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const missingDineInContext = mode === "dine-in" && !tableContext;
  const hasCoords = settings?.latitude != null && settings?.longitude != null;
  const gpsRequired = mode === "dine-in" && hasCoords;
  const [presence, setPresence] = useState<PresenceResult | null>(null);
  const [presenceBusy, setPresenceBusy] = useState(false);

  const verifyPresence = async () => {
    if (!hasCoords || presenceBusy) return;
    setPresenceBusy(true);
    setPresence(null);
    const result = await verifyOnSitePresence(
      { lat: settings?.latitude, lng: settings?.longitude },
      settings?.geofenceMeters,
    );
    setPresence(result);
    setPresenceBusy(false);
  };

  useEffect(() => {
    if (mode === "dine-in" && hasCoords) void verifyPresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasCoords]);
  const modeKey =
    mode === "dine-in"
      ? ("dineIn" as const)
      : mode === "takeaway"
        ? ("takeaway" as const)
        : ("delivery" as const);
  const disabledBySettings = Boolean(settings && !settings[modeKey]);
  const presenceOk = presence?.ok === true;
  const submitDisabled =
    !backendReady ||
    settings?.isOpen === false ||
    missingDineInContext ||
    disabledBySettings ||
    !lines?.length ||
    (mode === "delivery" && (!zone || total < zone.minimum)) ||
    orderBusy ||
    presenceBusy ||
    (gpsRequired && !presenceOk);

  const cashLabel =
    mode === "delivery" ? tx("نقداً عند الاستلام") : tx("نقداً");
  const itemCount = (lines ?? []).reduce((a, l) => a + l.qty, 0);

  // Keep the cash option in sync when switching between dine / delivery.
  useEffect(() => {
    setPay((prev) =>
      prev === PAY_CASH_DINE || prev === PAY_CASH_DELIVERY ? cashValue : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleSubmit = async (form: HTMLFormElement) => {
    if (submitDisabled || orderBusy) return;
    if (!form.checkValidity()) {
      setStage(1);
      return;
    }
    setOrderBusy(true);
    setSubmitError(false);
    try {
      const fields = new FormData(form);
      const details = Object.fromEntries(
        ["customer", "phone", "address", "zone"].map((key) => [
          key,
          String(fields.get(key) ?? ""),
        ]),
      );
      const submitted = await onSubmit(
        form,
        presence?.ok ? presence.fix : null,
      );
      if (submitted && remember) writeStored(preferenceKey, details);
      if (!submitted) setSubmitError(true);
    } catch {
      setSubmitError(true);
    } finally {
      setOrderBusy(false);
    }
  };

  const advance = () => {
    if (stage === 0 && (missingDineInContext || disabledBySettings)) return;
    if (stage === 1) {
      const fields = document.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >('[data-checkout-step="1"] input,[data-checkout-step="1"] select');
      for (const field of fields) if (!field.reportValidity()) return;
      if (
        (gpsRequired && !presenceOk) ||
        (mode === "delivery" && (!zone || total < zone.minimum))
      )
        return;
    }
    setStage((current) => Math.min(2, current + 1));
    document
      .querySelector(".cx-checkout__body")
      ?.scrollTo({ top: 0, behavior: "instant" });
  };
  const summaryLines = lines ?? [];
  const isUsd = currency === "usd";
  const payOptions = [
    cashValue,
    ...PAY_WALLETS.filter((provider) =>
      provider === "Syriatel Cash"
        ? settings?.syriatelCash
        : provider === "MTN Cash"
          ? settings?.mtnCash
          : settings?.shamCash,
    ),
  ] as string[];

  useEffect(() => {
    if (!payOptions.includes(pay)) setPay(cashValue);
  }, [payOptions.join("|"), pay, cashValue]);

  return (
    <div
      className="cx-overlay cx-overlay--checkout"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-checkout"
        role="dialog"
        aria-modal="true"
        aria-label={tx("إتمام الطلب")}
      >
        <header className="cx-checkout__top">
          <button
            className="cx-close"
            onClick={onClose}
            aria-label={tx("إغلاق")}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div className="cx-checkout__kicker">
            <span className="cx-eyebrow">
              <i aria-hidden="true" />
              {tx("إتمام الطلب")}
            </span>
            <h2>{tx("لنضع اللمسات الأخيرة")}</h2>
            <p>{tx("أكمل البيانات ثم أرسل — يصل طلبك مباشرة إلى المطبخ.")}</p>
          </div>
          <nav
            className="cx-progress"
            aria-label={language === "en" ? "Checkout steps" : "خطوات الطلب"}
          >
            {[tx("طريقة الطلب"), tx("البيانات"), tx("الدفع")].map(
              (label, index) => (
                <button
                  key={label}
                  type="button"
                  className={
                    stage === index ? "is-on" : stage > index ? "is-done" : ""
                  }
                  aria-current={stage === index ? "step" : undefined}
                  disabled={index > stage}
                  onClick={() => setStage(index)}
                >
                  <i>{stage > index ? <Check size={12} /> : index + 1}</i>
                  {label}
                </button>
              ),
            )}
          </nav>
        </header>

        <form
          id="cx-checkout-form"
          noValidate
          className="cx-checkout__body"
          onSubmit={(e) => {
            e.preventDefault();
            if (stage < 2) advance();
            else void handleSubmit(e.currentTarget);
          }}
        >
          <div className="cx-checkout__main">
            {/* Step 1 — mode */}
            <section
              className="cx-step"
              hidden={stage !== 0}
              data-checkout-step="0"
            >
              <div className="cx-step__label">
                <em className="mono-num">01</em>
                <div>
                  <strong>{tx("كيف تريد طلبك؟")}</strong>
                  <small>{tx("اختر طريقة الاستلام المناسبة لك")}</small>
                </div>
              </div>
              <div className="cx-modes">
                {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => {
                  const Icon = modeIcon(m);
                  const on = mode === m;
                  const unavailable = Boolean(
                    settings &&
                    !settings[
                      m === "dine-in"
                        ? "dineIn"
                        : m === "takeaway"
                          ? "takeaway"
                          : "delivery"
                    ],
                  );
                  return (
                    <button
                      type="button"
                      key={m}
                      className={`cx-mode${on ? " is-on" : ""}${
                        unavailable ? " is-off" : ""
                      }`}
                      onClick={() => setMode(m)}
                      aria-pressed={on}
                      disabled={unavailable}
                    >
                      <span className="cx-mode__ico">
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span className="cx-mode__txt">
                        <b>{tx(modeLabels[m])}</b>
                        <small>{tx(modeIconBig(m))}</small>
                      </span>
                      <span className="cx-mode__tick" aria-hidden="true">
                        <Check size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
              {missingDineInContext && (
                <p className="cx-note cx-note--warn">
                  {tx(
                    "امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.",
                  )}
                </p>
              )}
              {disabledBySettings && (
                <p className="cx-note cx-note--warn">
                  {tx("هذا النوع من الطلبات غير متاح حالياً في هذا المطعم.")}
                </p>
              )}
            </section>

            {/* Step 2 — details */}
            <section
              className="cx-step"
              hidden={stage !== 1}
              data-checkout-step="1"
            >
              <div className="cx-step__label">
                <em className="mono-num">02</em>
                <div>
                  <strong>{tx("إلى من نجهّزها؟")}</strong>
                  <small>{tx("نستخدم البيانات لتسليم طلبك فقط")}</small>
                </div>
              </div>
              <div className="cx-fields">
                <label className="cx-field">
                  <span className="cx-field__label">
                    {tx("الاسم")}
                    <i aria-hidden="true">*</i>
                  </span>
                  <input
                    name="customer"
                    required
                    maxLength={120}
                    autoComplete="name"
                    defaultValue={savedDetails?.customer ?? ""}
                    placeholder={tx("اسمك الكريم")}
                  />
                </label>
                <label className="cx-field">
                  <span className="cx-field__label">
                    {tx("رقم الهاتف")}
                    {mode !== "dine-in" && <i aria-hidden="true">*</i>}
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    maxLength={40}
                    autoComplete="tel"
                    defaultValue={savedDetails?.phone ?? ""}
                    required={mode !== "dine-in"}
                    placeholder="09XXXXXXXX"
                    inputMode="tel"
                  />
                </label>

                {mode === "dine-in" &&
                  (tableContext ? (
                    <div className="cx-tablechip cx-field--full">
                      <span className="cx-tablechip__ico" aria-hidden="true">
                        <Store size={18} />
                      </span>
                      <span>
                        {tx("الطاولة:")}
                        <strong>
                          {language === "en"
                            ? tableContext.labelEn || tableContext.labelAr
                            : tableContext.labelAr}
                        </strong>
                        {tableContext.area ? ` — ${tableContext.area}` : ""}
                      </span>
                      <b aria-hidden="true">✓</b>
                    </div>
                  ) : (
                    <p className="cx-note cx-note--danger cx-field--full">
                      {tx(
                        "امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.",
                      )}
                    </p>
                  ))}

                {mode === "dine-in" && hasCoords && (
                  <div
                    className={`cx-geo cx-field--full${
                      presenceBusy
                        ? " is-busy"
                        : presence?.ok
                          ? " is-ok"
                          : presence
                            ? " is-bad"
                            : ""
                    }`}
                  >
                    <span className="cx-geo__ico" aria-hidden="true">
                      {presenceBusy ? (
                        <Loader2 size={18} className="cx-geo__spin" />
                      ) : presence?.ok ? (
                        <Check size={18} />
                      ) : (
                        <MapPin size={18} />
                      )}
                    </span>
                    <span className="cx-geo__txt">
                      {presenceBusy ? (
                        <b>{tx("جارٍ التحقق من وجودك داخل المطعم…")}</b>
                      ) : presence?.ok ? (
                        <>
                          <b>{tx("تم تأكيد وجودك داخل المطعم ✓")}</b>
                          <small className="mono-num">
                            {presence.distance > 0
                              ? `البعد عن المطعم ≈ ${Math.round(presence.distance)} م`
                              : tx("تم التحقق من الموقع")}
                          </small>
                        </>
                      ) : presence ? (
                        <>
                          <b>
                            {presence.reason === "far"
                              ? tx("أنت خارج نطاق المطعم")
                              : presence.reason === "denied"
                                ? tx("لم يُسمح بالوصول إلى الموقع")
                                : presence.reason === "timeout"
                                  ? tx("تأخر تحديد الموقع")
                                  : presence.reason === "unsupported"
                                    ? tx("جهازك لا يدعم تحديد الموقع")
                                    : tx("تعذر تحديد موقعك الآن")}
                          </b>
                          {presence.reason === "far" &&
                          presence.distance != null ? (
                            <small className="mono-num">
                              {tx("بعدك ≈")}
                              {Math.round(presence.distance)}
                              {tx("م — المسموح")} {presence.radius}
                              {tx("م")}
                            </small>
                          ) : (
                            <small>
                              {presence.reason === "denied"
                                ? tx(
                                    "فعّل إذن الموقع من إعدادات المتصفح ثم أعد المحاولة.",
                                  )
                                : tx(
                                    "اقترب من المطعم وانتظر لحظات ثم أعد المحاولة.",
                                  )}
                            </small>
                          )}
                        </>
                      ) : (
                        <b>
                          {tx(
                            "لابد من تأكيد وجودك داخل المطعم للطلب داخل الصالة",
                          )}
                        </b>
                      )}
                    </span>
                    {(presence && !presence.ok) || !presenceBusy ? (
                      <button
                        type="button"
                        className="cx-geo__retry"
                        onClick={() => void verifyPresence()}
                        disabled={presenceBusy}
                      >
                        {presence ? tx("إعادة التحقق") : tx("تحقق من موقعي")}
                      </button>
                    ) : null}
                  </div>
                )}

                {mode === "delivery" && (
                  <>
                    <label className="cx-field cx-field--full">
                      <span className="cx-field__label">
                        {tx("العنوان بالتفصيل")}
                        <i aria-hidden="true">*</i>
                      </span>
                      <textarea
                        name="address"
                        maxLength={500}
                        autoComplete="street-address"
                        defaultValue={savedDetails?.address ?? ""}
                        required
                        placeholder={tx(
                          "الحي، الشارع، البناء، أقرب نقطة دالة…",
                        )}
                      />
                    </label>
                    {settings && settings.zones.length > 0 && (
                      <label className="cx-field cx-field--full">
                        <span className="cx-field__label">
                          {tx("منطقة التوصيل")}
                          <i aria-hidden="true">*</i>
                        </span>
                        <span className="cx-select">
                          <select
                            name="zone"
                            value={zoneId}
                            onChange={(e) => setZoneId(e.target.value)}
                          >
                            {settings.zones
                              .filter((zone) => zone.active)
                              .map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                  {zone.name}
                                  {tx("— رسوم")}
                                  {formatSyp(zone.fee)}
                                  {tx("· حد أدنى")}
                                  {formatSyp(zone.minimum)}
                                </option>
                              ))}
                          </select>
                          <ChevronDown size={17} aria-hidden="true" />
                        </span>
                      </label>
                    )}
                  </>
                )}

                {mode === "takeaway" && (
                  <label className="cx-field cx-field--full">
                    <span className="cx-field__label">
                      {tx("وقت الاستلام")}
                    </span>
                    <span className="cx-select">
                      <select name="pickup">
                        <option>{tx("الآن (٢٥ - ٣٥ دقيقة)")}</option>
                        <option>{tx("بعد ساعة")}</option>
                        <option>{tx("بعد ساعتين")}</option>
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </label>
                )}
              </div>
            </section>

            <div hidden={stage !== 1}>
              <label className="cx-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (!e.target.checked) {
                      try {
                        localStorage.removeItem(preferenceKey);
                      } catch {
                        /* unavailable storage */
                      }
                    }
                  }}
                />
                {tx("حفظ الاسم والهاتف والعنوان على هذا الجهاز فقط")}
              </label>
              {mode === "delivery" && zone && total < zone.minimum && (
                <p className="cx-note cx-note--warn" role="alert">
                  {tx("الحد الأدنى للتوصيل:")}
                  {formatSyp(zone.minimum)}
                </p>
              )}
            </div>
            {/* Step 3 — payment */}
            <section
              className="cx-step"
              hidden={stage !== 2}
              data-checkout-step="2"
            >
              <div className="cx-step__label">
                <em className="mono-num">03</em>
                <div>
                  <strong>{tx("طريقة الدفع")}</strong>
                  <small>{tx("اختر وسيلة الدفع المفضلة لديك")}</small>
                </div>
              </div>
              <div
                className="cx-pays"
                role="radiogroup"
                aria-label={tx("طريقة الدفع")}
              >
                {payOptions.map((option) => {
                  const Icon =
                    option === cashValue
                      ? Banknote
                      : option === "Syriatel Cash"
                        ? Wallet
                        : option === "MTN Cash"
                          ? Smartphone
                          : Wallet;
                  const checked = pay === option;
                  return (
                    <label
                      key={option}
                      className={`cx-pay${checked ? " is-checked" : ""}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={option}
                        checked={checked}
                        onChange={() => setPay(option)}
                      />
                      <span className="cx-pay__ico" aria-hidden="true">
                        <Icon size={19} />
                      </span>
                      <span className="cx-pay__txt">
                        <b>{tx(option)}</b>
                        {option === cashValue && (
                          <small>
                            {mode === "delivery"
                              ? tx("ادفع للطيّار عند الاستلام")
                              : tx("ادفع نقداً عند الاستلام أو في المطعم")}
                          </small>
                        )}
                      </span>
                      <span className="cx-pay__radio" aria-hidden="true">
                        {checked && <Check size={12} />}
                      </span>
                    </label>
                  );
                })}
              </div>

              <label className="cx-field">
                <span className="cx-field__label">
                  {tx("مرجع الحوالة")}
                  <small>{tx("اختياري للمحافظ")}</small>
                </span>
                <input
                  name="paymentReference"
                  placeholder={tx("رقم العملية")}
                />
              </label>
            </section>
          </div>

          {/* ---- Order slip (summary) ---- */}
          <aside className="cx-slip">
            <div className="checkout-summary-heading">
              <ShoppingBasket size={18} />
              <h3 className="cx-slip__title">{tx("ملخص طلبك")}</h3>
              <span>{itemCount}</span>
            </div>
            <p className="cx-slip__note">
              {tx("الأسعار والرسوم تُراجع آلياً قبل إرسال الطلب.")}
            </p>

            <div className="cx-slip__items">
              {summaryLines.length === 0 && (
                <p className="cx-slip__empty">
                  {tx("سلتك فارغة — عد وأضف أطباقاً.")}
                </p>
              )}
              {summaryLines.map((line) => {
                const unit =
                  line.item.price +
                  line.options.reduce((a, o) => a + o.price, 0);
                return (
                  <div className="cx-slip__item" key={line.key}>
                    <span className="cx-slip__thumb">
                      <img src={line.item.image} alt="" loading="lazy" />
                      <b className="mono-num">{line.qty}</b>
                    </span>
                    <span className="cx-slip__mid">
                      <strong>
                        {language === "en"
                          ? line.item.en || line.item.name
                          : line.item.name}
                      </strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : ""}
                      </small>
                    </span>
                    <b className="cx-slip__price">
                      {money(unit * line.qty, currency, rate, language)}
                    </b>
                  </div>
                );
              })}
            </div>

            <div className="cx-slip__totals">
              <div className="cx-slip__row">
                <span>{tx("المجموع الفرعي")}</span>
                <b>{money(total, currency, rate, language)}</b>
              </div>
              {totals.discount > 0 && (
                <div className="cx-slip__row">
                  <span>{tx("الخصم")}</span>
                  <b>−{money(totals.discount, currency, rate, language)}</b>
                </div>
              )}
              {totals.service > 0 && (
                <div className="cx-slip__row">
                  <span>{tx("رسوم الخدمة")}</span>
                  <b>{money(totals.service, currency, rate, language)}</b>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="cx-slip__row">
                  <span>{tx("الضريبة")}</span>
                  <b>{money(totals.tax, currency, rate, language)}</b>
                </div>
              )}
              {mode === "delivery" && (
                <div className="cx-slip__row">
                  <span>{tx("رسوم التوصيل")}</span>
                  <b>{money(totals.delivery, currency, rate, language)}</b>
                </div>
              )}
              <div className="cx-slip__row">
                <span>
                  {tx("الإجمالي ·")}
                  <b className="mono-num">{itemCount}</b>
                  {tx("صنفاً")}
                </span>
                <strong>{money(totals.total, currency, rate, language)}</strong>
              </div>
              {isUsd && (
                <small className="cx-slip__usd">
                  {moneySecondary(totals.total, currency, rate, language)}
                  {language === "en"
                    ? " · Estimated exchange rate"
                    : " · سعر صرف تقديري"}
                </small>
              )}
            </div>

            <div className="cx-slip__trust">
              <span className="cx-slip__trust-ico" aria-hidden="true">
                <ShieldCheck size={19} />
              </span>
              <span>
                <b>{tx("إرسال آمن وموثوق")}</b>
                <small>{tx("تأكيد نهائي قبل الإرسال مباشرة إلى المطبخ")}</small>
              </span>
            </div>
          </aside>
        </form>

        <footer className="cx-checkout__foot">
          <div className="cx-checkout__sum">
            <small>{tx("الإجمالي النهائي")}</small>
            <strong>{money(totals.total, currency, rate, language)}</strong>
            {isUsd && (
              <em>{moneySecondary(totals.total, currency, rate, language)}</em>
            )}
          </div>
          {settings?.isOpen === false && (
            <p className="cx-note cx-note--warn" role="status">
              {language === "en"
                ? "The restaurant is not accepting orders right now."
                : "المطعم لا يستقبل الطلبات حالياً."}
            </p>
          )}
          {submitError && (
            <p className="cx-note cx-note--danger" role="alert">
              {tx(
                "لم يصلنا تأكيد الطلب. بقيت سلتك وبياناتك كما هي؛ راجع التنبيه ثم أعد المحاولة.",
              )}
            </p>
          )}
          {stage > 0 && (
            <button
              type="button"
              className="checkout-back"
              onClick={() => setStage(stage - 1)}
            >
              {language === "en" ? "Back" : "رجوع"}
            </button>
          )}
          {stage < 2 ? (
            <button
              type="button"
              className="cx-btn cx-btn--red"
              key="checkout-next"
              onClick={(event) => {
                event.preventDefault();
                advance();
              }}
              disabled={
                stage === 0 && (missingDineInContext || disabledBySettings)
              }
            >
              {language === "en" ? "Continue" : "متابعة"}
              <ArrowRight size={17} />
            </button>
          ) : !backendReady ? (
            <p className="cx-note cx-note--danger">
              {tx("أنت دون اتصال — تحقق من الشبكة ثم أعد المحاولة.")}
            </p>
          ) : (
            <button
              key="checkout-submit"
              type="submit"
              form="cx-checkout-form"
              className="cx-btn cx-btn--red cx-btn--lg"
              disabled={submitDisabled}
            >
              {missingDineInContext
                ? tx("امسح رمز الطاولة أولاً")
                : orderBusy
                  ? tx("جارٍ إرسال طلبك…")
                  : submitError
                    ? tx("أعد محاولة الإرسال")
                    : tx("تأكيد الطلب وإرساله")}
              <ArrowRight className="cx-arrow" size={19} aria-hidden="true" />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

export { CheckoutModal };
export {
  MenuView,
  ItemModal,
  CartDrawer,
  OrdersView,
  TrackingModal,
} from "./customer/Experience";
