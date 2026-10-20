import { useCustomerText } from "./customerText";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  ClipboardList,
  AtSign,
  Share2,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Store,
  Truck,
  Utensils,
  Wallet,
  X,
  Trash2,
  Leaf,
} from "lucide-react";
import { bumpCart, flyToCart } from "./motion";
import {
  verifyOnSitePresence,
  type GeoFix,
  type PresenceResult,
} from "../geolocation";
import { supabase } from "../supabase";
import { calculateTotals } from "../ordering";
import { useUI } from "../context/UI";
import { readStored, writeStored } from "../domain";
import {
  formatSyp,
  formatUsd,
  images,
  modeLabels,
  statusLabels,
  tagLabels,
  type CartLine,
  type Category,
  type Item,
  type MenuCategory,
  type Mode,
  type Option,
  type Order,
  type PublicMenuPayload,
  type Restaurant,
  type RestaurantSettings,
  type Tag,
} from "../domain";
import "./customer.css";
import "./customer-mobile.css";
import "./workflows.css";
import "./customer-refresh.css";

/* ---------------- shared helpers ---------------- */

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

const statusTone = (status: Order["status"]) => {
  switch (status) {
    case "completed":
      return "done";
    case "cancelled":
      return "bad";
    case "received":
      return "pending";
    default:
      return "info";
  }
};

const needsChoices = (item: Item) =>
  Boolean(item.options?.some((group) => group.required));

const modeIcon = (mode: Mode) =>
  mode === "dine-in" ? Store : mode === "takeaway" ? ShoppingBasket : Truck;

const modeIconBig = (mode: Mode) =>
  mode === "dine-in" ? "على الطاولة" : mode === "takeaway" ? "سفري" : "توصيل";

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

/* ============================================================
   MenuView — editorial restaurant menu
   ============================================================ */
function MenuView({
  restaurant,
  categories,
  currency,
  setCurrency,
  category,
  setCategory,
  tag,
  setTag,
  query,
  setQuery,
  items,
  loading,
  loadError,
  onRetry,
  onSelect,
  onQuickAdd,
}: {
  restaurant: Restaurant;
  categories: MenuCategory[];
  currency: "syp" | "usd";
  setCurrency: (c: "syp" | "usd") => void;
  category: Category;
  setCategory: (c: Category) => void;
  tag: Tag | "all";
  setTag: (t: Tag | "all") => void;
  query: string;
  setQuery: (q: string) => void;
  items: Item[];
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onSelect: (i: Item) => void;
  onQuickAdd: (i: Item) => void;
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  const rate = restaurant.rate;
  const designCover = restaurant.design?.content.coverUrl || "";
  const heroImage =
    designCover ||
    items.find((i) => i.image)?.image ||
    restaurant.items.find((i) => i.image)?.image ||
    images.mezze;
  const designLogoUrl = restaurant.design?.content.logoUrl || "";
  const bannerOn = restaurant.design?.content.bannerOn === true;
  const bannerText = restaurant.design?.content.bannerText?.trim() || "";
  const bannerTone = restaurant.design?.content.bannerTone || "brand";
  const itemCount = items.length;
  const dc = restaurant.design?.content;
  const socialHref = (raw: string) =>
    !raw ? "" : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  const catEntries = [
    "كل الأصناف",
    "الأكثر طلباً",
    ...categories.map((entry) => entry.name),
  ];

  const countFor = (entry: string) =>
    entry === "كل الأصناف"
      ? items.length
      : entry === "الأكثر طلباً"
        ? items.filter((i) => i.popular).length
        : items.filter((i) => i.category === entry).length;

  const heading =
    category === "كل الأصناف"
      ? tx("كل الأطباق")
      : category === "الأكثر طلباً"
        ? tx("الأكثر طلباً")
        : category;

  const go = (item: Item) => {
    const el = document.getElementById("cx-catalogue");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    onSelect(item);
  };

  const scrollToMenu = () => {
    document
      .getElementById("cx-catalogue")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const digits = new Intl.NumberFormat(language === "en" ? "en" : "ar-SY");

  return (
    <div className="cx-store">
      {bannerOn && bannerText && (
        <div className={`cx-banner cx-banner--${bannerTone}`} role="status">
          <span aria-hidden="true">✦</span>
          <p>{bannerText}</p>
        </div>
      )}

      <section
        className="cx-welcome"
        aria-label={
          language === "en" ? "Welcome to our menu" : "أهلاً في قائمتنا"
        }
      >
        <div className="cx-welcome__copy">
          <span className="cx-welcome__eyebrow">
            <Leaf size={14} aria-hidden="true" />
            {language === "en"
              ? "A little moment of delicious"
              : "لحظة حلوة، وأكلة أطيب"}
          </span>
          <h1>
            {language === "en" ? "What sounds good today?" : "شو عبالك اليوم؟"}
          </h1>
          <p>
            {language === "en"
              ? restaurant.subtitleEn || restaurant.subtitle
              : restaurant.subtitle}
          </p>
          <button
            className="cx-welcome__link"
            type="button"
            onClick={scrollToMenu}
          >
            {tx("تصفح الأطباق")}
            <ArrowRight className="cx-arrow" size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="cx-welcome__art">
          <span aria-hidden="true" />
          <img src={heroImage} alt="" fetchPriority="high" />
        </div>
      </section>

      {/* ---- Sticky search / filters / category rail ---- */}
      <div className="cx-stick">
        <section className="cx-tools" aria-label={tx("البحث والتصفية")}>
          <label className="cx-search">
            <Search size={19} aria-hidden="true" />
            <span className="cx-search__bar">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx("ابحث عن طبق أو مكوّن…")}
                aria-label={tx("ابحث في القائمة")}
              />
              {query && (
                <button
                  type="button"
                  className="cx-search__clear"
                  onClick={() => setQuery("")}
                  aria-label={tx("مسح البحث")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </span>
            <span className="cx-search__count mono-num">
              {digits.format(itemCount)}
            </span>
          </label>

          <div className="cx-tools__row">
            <div
              className="cx-tagchips"
              role="group"
              aria-label={tx("تصفية الأطباق")}
            >
              <button
                type="button"
                className={`cx-chip${tag === "all" ? " is-on" : ""}`}
                onClick={() => setTag("all")}
              >
                {tx("الكل")}
              </button>
              {(["vegetarian", "chef"] as Tag[]).map((entry) => (
                <button
                  type="button"
                  key={entry}
                  className={`cx-chip${tag === entry ? " is-on" : ""}`}
                  onClick={() => setTag(tag === entry ? "all" : entry)}
                >
                  {tag === entry ? (
                    <Check size={13} aria-hidden="true" />
                  ) : null}
                  {tx(tagLabels[entry])}
                </button>
              ))}
            </div>
            <div className="cx-cur" role="group" aria-label={tx("العملة")}>
              <button
                type="button"
                className={currency === "syp" ? "is-on" : ""}
                onClick={() => setCurrency("syp")}
              >
                {tx("ل.س")}
              </button>
              <button
                type="button"
                className={currency === "usd" ? "is-on" : ""}
                onClick={() => setCurrency("usd")}
              >
                $
              </button>
            </div>
          </div>
        </section>

        <nav className="cx-cats" aria-label={tx("تصفح أقسام القائمة")}>
          {catEntries.map((entry, index) => {
            const on = category === entry;
            const n = countFor(entry);
            return (
              <button
                key={entry}
                type="button"
                className={`cx-cat${on ? " is-on" : ""}`}
                onClick={() => setCategory(entry)}
                aria-pressed={on}
              >
                <i className="mono-num" aria-hidden="true">
                  {on ? "" : String(index + 1).padStart(2, "0")}
                </i>
                <span>
                  {tx(
                    language === "en"
                      ? categories.find((c) => c.name === entry)?.en || entry
                      : entry,
                  )}
                </span>
                <b className="mono-num">{digits.format(n)}</b>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---- Catalogue ---- */}
      <section className="cx-catalogue" id="cx-catalogue">
        <header className="cx-catalog__head">
          <div>
            <span className="cx-eyebrow">
              <i aria-hidden="true" />
              {language === "en"
                ? restaurant.nameEn || restaurant.name
                : restaurant.name}
            </span>
            <h2 className="cx-catalog__title">
              {tx(
                language === "en"
                  ? categories.find((c) => c.name === heading)?.en || heading
                  : heading,
              )}
            </h2>
            <p className="cx-catalog__lead">
              {tx("اضغط على أي طبق لتفاصيله وخياراته، أو أضفه مباشرة بلمسة.")}
            </p>
          </div>
          {itemCount > 0 && (
            <span className="cx-catalog__stamp">
              <b className="mono-num">{digits.format(itemCount)}</b>
              {tx("صنفاً متاحاً")}
            </span>
          )}
        </header>

        <div className="cx-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="cx-dish cx-dish--sk"
                  key={index}
                  aria-hidden="true"
                >
                  <span className="cx-dish__media sk" />
                  <div className="cx-dish__body">
                    <span className="cx-skline sk" style={{ width: "38%" }} />
                    <span className="cx-skline sk" style={{ width: "72%" }} />
                    <span className="cx-skline sk" style={{ width: "55%" }} />
                  </div>
                </div>
              ))
            : loadError
              ? null
              : items.map((item) => {
                  const price = money(item.price, currency, rate, language);
                  const secondary =
                    currency === "usd" ? formatSyp(item.price) : "";
                  const customisable = Boolean(item.options?.length);
                  const configurable = needsChoices(item);
                  return (
                    <article className="cx-dish" key={item.id}>
                      <button
                        type="button"
                        className="cx-dish__media"
                        onClick={() => go(item)}
                        aria-label={
                          language === "en"
                            ? `Details for ${item.en || item.name}`
                            : `تفاصيل ${item.name}`
                        }
                      >
                        <span className="cx-dish__imgwrap">
                          <img
                            src={item.image}
                            alt={
                              language === "en"
                                ? item.en || item.name
                                : item.name
                            }
                            loading="lazy"
                          />
                        </span>
                        {item.popular && (
                          <span className="cx-dish__flag">
                            <b>{tx("الأكثر طلباً")}</b>
                          </span>
                        )}
                        {customisable && (
                          <span className="cx-dish__gear" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                      </button>
                      <div className="cx-dish__body">
                        <div className="cx-dish__topline">
                          <span className="cx-dish__cat">
                            {language === "en"
                              ? categories.find((c) => c.name === item.category)
                                  ?.en || item.category
                              : item.category}
                          </span>
                          {item.tags.length > 0 && (
                            <span className="cx-dish__tags">
                              {item.tags.map((t) => (
                                <span key={t}>{tx(tagLabels[t])}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="cx-dish__name"
                          onClick={() => go(item)}
                        >
                          {language === "en" ? item.en || item.name : item.name}
                        </button>
                        {item.desc && (
                          <p className="cx-dish__desc">
                            {language === "en"
                              ? item.descEn || item.desc
                              : item.desc}
                          </p>
                        )}

                        <div className="cx-dish__foot">
                          <div className="cx-price">
                            <b>{price}</b>
                            {secondary && <small>{secondary}</small>}
                          </div>
                          {!configurable ? (
                            <button
                              type="button"
                              className="cx-add"
                              onClick={(e) => {
                                const dish =
                                  e.currentTarget.closest(".cx-dish");
                                flyToCart(
                                  dish?.querySelector<HTMLElement>(
                                    ".cx-dish__imgwrap img",
                                  ),
                                );
                                onQuickAdd(item);
                              }}
                              aria-label={
                                language === "en"
                                  ? `Add ${item.en || item.name} to order`
                                  : `أضف ${item.name} إلى الطلب`
                              }
                            >
                              <Plus size={20} aria-hidden="true" />
                              <span>{tx("أضف")}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="cx-add cx-add--ghost"
                              onClick={() => go(item)}
                            >
                              <span>{tx("تخصيص")}</span>
                              <ChevronDown size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
        </div>

        {!loading && loadError && (
          <div className="cx-empty" role="alert">
            <span className="cx-empty__art" aria-hidden="true">
              <Store size={26} />
            </span>
            <h3>{tx("تعذر تحميل القائمة")}</h3>
            <p>{loadError}</p>
            <button
              type="button"
              className="cx-btn cx-btn--red"
              onClick={onRetry}
            >
              <RefreshCw size={17} aria-hidden="true" />
              {tx("حاول مرة أخرى")}
            </button>
          </div>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="cx-empty">
            <span className="cx-empty__art" aria-hidden="true">
              <Search size={26} />
            </span>
            <h3>{tx("لم نجد صنفاً مطابقاً")}</h3>
            <p>{tx("جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً من القائمة.")}</p>
            <button
              type="button"
              className="cx-btn cx-btn--red"
              onClick={() => {
                setQuery("");
                setTag("all");
                setCategory("كل الأصناف");
              }}
            >
              {tx("عرض كل الأصناف")}
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="cx-catalog__foot">
            <span aria-hidden="true">✦</span>
            {tx("كل أطباق")}{" "}
            {language === "en"
              ? restaurant.nameEn || restaurant.name
              : restaurant.name}{" "}
            {tx("تحضَّر طازجة عند الطلب — بالهناء والشفاء.")}
          </p>
        )}
      </section>

      {dc && (dc.hours || dc.socials || dc.footer) && (
        <footer className="cx-sitefoot">
          <div className="cx-sitefoot__col">
            <div className="cx-sitefoot__brand">
              <span className="cx-sitefoot__seal">
                {designLogoUrl ? (
                  <img src={designLogoUrl} alt="" />
                ) : (
                  (restaurant.logo || "م").slice(0, 1)
                )}
              </span>
              <span>
                {language === "en"
                  ? restaurant.nameEn || restaurant.name
                  : restaurant.name}
                {dc.footerText ? "" : null}
              </span>
            </div>
            {dc.footerText && (
              <p className="cx-sitefoot__note">{dc.footerText}</p>
            )}
          </div>

          {dc.hours && (
            <div className="cx-sitefoot__col">
              <h3>{tx("ساعات العمل")}</h3>
              <p className="cx-sitefoot__note">{dc.hoursText}</p>
            </div>
          )}

          {dc.socials && (
            <div className="cx-sitefoot__col">
              <h3>{tx("تواصل معنا")}</h3>
              <div className="cx-sitefoot__socials">
                {dc.instagram && (
                  <a
                    className="cx-sitefoot__social"
                    href={socialHref(dc.instagram)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <AtSign size={16} aria-hidden="true" />
                    {tx("إنستغرام")}
                  </a>
                )}
                {dc.facebook && (
                  <a
                    className="cx-sitefoot__social"
                    href={socialHref(dc.facebook)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Share2 size={16} aria-hidden="true" />
                    {tx("فيسبوك")}
                  </a>
                )}
                {restaurant.whatsapp && (
                  <a
                    className="cx-sitefoot__social"
                    href={`https://wa.me/${restaurant.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    {dc.whatsappLabel || "واتساب"}
                  </a>
                )}
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

/* ============================================================
   ItemModal — immersive product detail
   ============================================================ */
function ItemModal({
  item,
  currency,
  rate,
  onClose,
  onAdd,
}: {
  item: Item;
  currency: "syp" | "usd";
  rate: number;
  onClose: () => void;
  onAdd: (i: Item, o: Option[], n: string, qty: number) => void;
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  useOverlay(onClose);
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const missingRequired =
    item.options?.some(
      (group) =>
        (selected[group.id]?.length ?? 0) <
        (group.minSelections ?? (group.required ? 1 : 0)),
    ) ?? false;
  const tooMany =
    item.options?.some(
      (group) =>
        (selected[group.id]?.length ?? 0) >
        (group.maxSelections ?? group.options.length),
    ) ?? false;
  const valid = !missingRequired && !tooMany;
  const extra = Object.values(selected)
    .flat()
    .reduce((sum, option) => sum + option.price, 0);
  const price = item.price + extra;

  const toggle = (groupId: string, option: Option, single: boolean) => {
    setSelected((current) => {
      const existing = current[groupId] ?? [];
      const next = single
        ? [option]
        : existing.some((entry) => entry.id === option.id)
          ? existing.filter((entry) => entry.id !== option.id)
          : [...existing, option];
      return { ...current, [groupId]: next };
    });
  };

  const confirm = () => {
    if (!valid) return;
    onAdd(item, Object.values(selected).flat(), note.trim(), qty);
    bumpCart();
  };

  const groups = item.options ?? [];

  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet cx-sheet--item"
        role="dialog"
        aria-modal="true"
        aria-label={language === "en" ? item.en || item.name : item.name}
      >
        <div className="cx-item">
          <header className="cx-item__bar">
            <span>{language === "en" ? "Dish details" : "تفاصيل الصنف"}</span>
          </header>
          <div className="cx-item__media">
            <img
              src={item.image}
              alt={language === "en" ? item.en || item.name : item.name}
            />
            <span className="cx-item__cat">{item.category}</span>
            {item.popular && (
              <span className="cx-item__flag">{tx("الأكثر طلباً")}</span>
            )}
          </div>

          <div className="cx-item__panel">
            <button
              className="cx-close"
              onClick={onClose}
              aria-label={tx("إغلاق")}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="cx-item__scroll">
              <header className="cx-item__head">
                {item.en && (
                  <span className="cx-item__en" lang="en">
                    {item.en}
                  </span>
                )}
                <h2>{language === "en" ? item.en || item.name : item.name}</h2>
                {item.desc && (
                  <p className="cx-item__desc">
                    {language === "en" ? item.descEn || item.desc : item.desc}
                  </p>
                )}
                <div className="cx-item__price">
                  <strong>{money(price, currency, rate, language)}</strong>
                  {currency === "usd" ? (
                    <small>{formatSyp(price)}</small>
                  ) : (
                    <small>
                      {moneySecondary(price, currency, rate, language)}
                    </small>
                  )}
                </div>
              </header>

              {groups.length > 0 && (
                <div className="cx-groups">
                  {groups.map((group) => {
                    const single =
                      (group.maxSelections ??
                        (group.required ? 1 : group.options.length)) === 1;
                    const chosen = selected[group.id] ?? [];
                    const isMissing = group.required && chosen.length === 0;
                    return (
                      <fieldset key={group.id} className="cx-group">
                        <legend className="cx-group__head">
                          <span className="cx-group__title">
                            {language === "en"
                              ? group.en || group.name
                              : group.name}
                            {isMissing && (
                              <b className="cx-req">
                                <i aria-hidden="true" />
                                {tx("اختيار مطلوب")}
                              </b>
                            )}
                          </span>
                          <span
                            className={`cx-group__meta${
                              group.required ? " is-req" : ""
                            }`}
                          >
                            {group.required
                              ? tx("مطلوب · اختر واحداً")
                              : chosen.length
                                ? `اخترت ${chosen.length}`
                                : tx("اختياري · يمكنك اختيار أكثر من واحد")}
                          </span>
                        </legend>
                        <div className="cx-opts">
                          {group.options.map((option) => {
                            const checked = chosen.some(
                              (entry) => entry.id === option.id,
                            );
                            return (
                              <label
                                key={option.id}
                                className={`cx-pick${checked ? " is-checked" : ""}${
                                  single ? " is-single" : ""
                                }`}
                              >
                                <input
                                  type={single ? "radio" : "checkbox"}
                                  name={`opt-${group.id}`}
                                  checked={checked}
                                  onChange={() =>
                                    toggle(group.id, option, single)
                                  }
                                />
                                <span
                                  className="cx-pick__dot"
                                  aria-hidden="true"
                                >
                                  <Check size={13} />
                                </span>
                                <span className="cx-pick__name">
                                  {language === "en"
                                    ? option.en || option.name
                                    : option.name}
                                  {single && checked && (
                                    <small>{tx("الاختيار الحالي")}</small>
                                  )}
                                </span>
                                <span className="cx-pick__price">
                                  {option.price
                                    ? `+${money(option.price, currency, rate, language)}`
                                    : tx("بلا رسوم")}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              )}

              <label className="cx-field">
                <span className="cx-field__label">
                  {tx("ملاحظة للمطبخ")}
                  <small className="mono-num">{note.length}/200</small>
                </span>
                <textarea
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tx("مثلاً: بدون بصل، الصوص جانباً…")}
                />
              </label>
            </div>

            <footer className="cx-item__foot">
              <div className="cx-item__qty">
                <small>{tx("الكمية")}</small>
                <Stepper
                  qty={qty}
                  onDec={() => setQty((q) => Math.max(1, q - 1))}
                  onInc={() => setQty((q) => Math.min(20, q + 1))}
                />
              </div>
              <div className="cx-item__total">
                <small>{tx("الإجمالي")}</small>
                <strong>{money(price * qty, currency, rate, language)}</strong>
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--red cx-btn--lg cx-item__add"
                disabled={!valid}
                onClick={confirm}
              >
                <Plus size={20} aria-hidden="true" />
                {valid
                  ? language === "en"
                    ? `Add to order · ${qty}`
                    : `أضف إلى الطلب · ${qty}`
                  : tx("أكمل الاختيارات المطلوبة")}
              </button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   CartDrawer — premium order bag
   ============================================================ */
function CartDrawer({
  cart,
  total,
  currency,
  rate,
  onClose,
  onQty,
  onCheckout,
}: {
  cart: CartLine[];
  total: number;
  currency: "syp" | "usd";
  rate: number;
  onClose: () => void;
  onQty: (key: string, d: number) => void;
  onCheckout: () => void;
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  useOverlay(onClose);
  const itemCount = cart.reduce((a, l) => a + l.qty, 0);

  const proceed = () => {
    onCheckout();
    onClose();
  };

  return (
    <div
      className="cx-overlay cx-overlay--cart"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="cx-cart"
        role="dialog"
        aria-modal="true"
        aria-label={tx("سلة الطلب")}
      >
        <header className="cx-cart__head">
          <div>
            <span className="cx-eyebrow">
              <i aria-hidden="true" />
              {tx("طلبك")}
            </span>
            <h2>{tx("سلة طلبك")}</h2>
            <p>
              {itemCount > 0 ? (
                <>
                  <b className="mono-num">{itemCount}</b>
                  {tx("صنفاً بانتظار التأكيد")}
                </>
              ) : language === "en" ? (
                "Nothing here yet"
              ) : (
                "لا شيء فيها بعد"
              )}
            </p>
          </div>
          <button
            className="cx-close"
            onClick={onClose}
            aria-label={tx("إغلاق السلة")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="cx-empty cx-empty--bag">
            <span className="cx-empty__art" aria-hidden="true">
              <ShoppingBasket size={26} />
            </span>
            <h3>{tx("سلتك ما زالت فارغة")}</h3>
            <p>{tx("اختر أطباقاً من القائمة وستجدها هنا بانتظار التأكيد.")}</p>
            <button
              type="button"
              className="cx-btn cx-btn--red"
              onClick={onClose}
            >
              {tx("تصفح القائمة")}
            </button>
          </div>
        ) : (
          <>
            <div className="cx-cart__lines">
              {cart.map((line) => {
                const unit =
                  line.item.price +
                  line.options.reduce((a, o) => a + o.price, 0);
                return (
                  <article className="cx-cline" key={line.key}>
                    <span className="cx-cline__thumb">
                      <img src={line.item.image} alt="" loading="lazy" />
                    </span>
                    <div className="cx-cline__main">
                      <strong>
                        {language === "en"
                          ? line.item.en || line.item.name
                          : line.item.name}
                      </strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : tx("بدون إضافات")}
                        {line.note ? ` — ${line.note}` : ""}
                      </small>
                      <b className="cx-cline__price">
                        {money(unit * line.qty, currency, rate, language)}
                      </b>
                    </div>
                    <div className="cx-cline__end">
                      <button
                        className="cx-cline__remove"
                        type="button"
                        onClick={() => onQty(line.key, -line.qty)}
                        aria-label={
                          language === "en"
                            ? `Remove ${line.item.en || line.item.name}`
                            : `حذف ${line.item.name}`
                        }
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                      <Stepper
                        qty={line.qty}
                        onDec={() => onQty(line.key, -1)}
                        onInc={() => onQty(line.key, 1)}
                        labels={{
                          dec: `إنقاص ${language === "en" ? line.item.en || line.item.name : line.item.name}`,
                          inc: `زيادة ${language === "en" ? line.item.en || line.item.name : line.item.name}`,
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="cx-cart__foot">
              <div className="cx-cart__totals">
                <div className="cx-cart__row">
                  <span>{tx("الإجمالي")}</span>
                  <strong>{money(total, currency, rate, language)}</strong>
                </div>
                <small className="cx-cart__note">
                  {language === "en"
                    ? "Discounts, service charges and delivery are calculated at checkout."
                    : "الخصم ورسوم الخدمة والتوصيل تُحسب عند إتمام الطلب."}
                </small>
                {currency === "usd" && (
                  <small className="cx-cart__usd">
                    {moneySecondary(total, currency, rate, language)}
                    {language === "en"
                      ? " · Estimated exchange rate"
                      : " · سعر صرف تقديري"}
                  </small>
                )}
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--red cx-btn--lg cx-btn--block"
                onClick={proceed}
              >
                {tx("متابعة تفاصيل الطلب")}
                <ArrowRight className="cx-arrow" size={19} aria-hidden="true" />
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

/* ============================================================
   CheckoutModal — stepped premium checkout
   ============================================================ */
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
          <div className="cx-progress" aria-hidden="true">
            <span className="is-on">
              <i>1</i>
              {tx("طريقة الطلب")}
            </span>
            <span>
              <i>2</i>
              {tx("البيانات")}
            </span>
            <span>
              <i>3</i>
              {tx("الدفع")}
            </span>
          </div>
        </header>

        <form
          id="cx-checkout-form"
          className="cx-checkout__body"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(e.currentTarget);
          }}
        >
          <div className="cx-checkout__main">
            {/* Step 1 — mode */}
            <section className="cx-step">
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
              {disabledBySettings && (
                <p className="cx-note cx-note--warn">
                  {tx("هذا النوع من الطلبات غير متاح حالياً في هذا المطعم.")}
                </p>
              )}
            </section>

            {/* Step 2 — details */}
            <section className="cx-step">
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
                  <label className="cx-field">
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
            {/* Step 3 — payment */}
            <section className="cx-step">
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
            <div className="cx-slip__stamp" aria-hidden="true">
              <span>{tx("طلب")}</span>
              <b>{tx("جديد")}</b>
            </div>
            <h3 className="cx-slip__title">{tx("ملخص طلبك")}</h3>
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
          {!backendReady ? (
            <p className="cx-note cx-note--danger">
              {tx("أنت دون اتصال — تحقق من الشبكة ثم أعد المحاولة.")}
            </p>
          ) : (
            <button
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

/* ============================================================
   OrdersView — order history
   ============================================================ */
function OrdersView({
  orders,
  onReorder,
  onTrack,
  onMenu,
}: {
  orders: Order[];
  onReorder?: (order: Order) => void;
  onTrack: (o: Order) => void;
  onMenu: () => void;
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  const activeOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  );
  const archiveOrders = orders.filter((order) =>
    ["completed", "cancelled"].includes(order.status),
  );
  const digits = new Intl.NumberFormat(language === "en" ? "en" : "ar-SY");

  const when = (order: Order) =>
    new Date(order.createdAt).toLocaleDateString(
      language === "en" ? "en" : "ar-SY",
      {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  const totalQty = (order: Order) => order.lines.reduce((a, l) => a + l.qty, 0);

  const renderLive = (order: Order) => {
    const Icon = modeIcon(order.mode);
    const snaps = order.lines.slice(0, 4);
    const overs = order.lines.length - snaps.length;
    return (
      <button
        type="button"
        className="cx-livecard"
        key={order.id}
        onClick={() => onTrack(order)}
      >
        <span className="cx-livecard__top">
          <span className="cx-livecard__id">
            <i className="mono-num">#{order.id}</i>
            <small>{when(order)}</small>
          </span>
          <span className={`cx-status cx-status--${statusTone(order.status)}`}>
            {tx(statusLabels[order.status])}
          </span>
        </span>
        <span className="cx-livecard__mid">
          <b>{order.customer}</b>
          <small>
            <Icon size={14} aria-hidden="true" />
            {tx(modeLabels[order.mode])}
            {order.table ? ` · ${order.table}` : ""} · {totalQty(order)}
            {tx("أصناف")}
          </small>
        </span>
        <span className="cx-livecard__bottom">
          <span className="cx-livecard__snaps" aria-hidden="true">
            {snaps.map((line, index) => (
              <span
                key={line.key}
                className="cx-livecard__snap"
                style={{ zIndex: snaps.length - index }}
              >
                <img src={line.item.image} alt="" />
              </span>
            ))}
            {overs > 0 && <b className="mono-num">+{overs}</b>}
          </span>
          <span className="cx-livecard__right">
            <b className="cx-livecard__total">{formatSyp(order.total)}</b>
            <span className="cx-livecard__go">
              {tx("تتبع الطلب")}
              <ArrowRight className="cx-arrow" size={16} aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
    );
  };

  const renderRow = (order: Order) => {
    const Icon = modeIcon(order.mode);
    const cancelled = order.status === "cancelled";
    return (
      <button
        type="button"
        className={`cx-ordercard${cancelled ? " is-cancelled" : ""}`}
        key={order.id}
        onClick={() => onTrack(order)}
      >
        <span className="cx-ordercard__seal" aria-hidden="true">
          {cancelled ? <X size={16} /> : <Icon size={17} />}
        </span>
        <span className="cx-ordercard__mid">
          <strong className="mono-num">#{order.id}</strong>
          <span>
            {tx(modeLabels[order.mode])}
            {order.table ? ` · ${order.table}` : ""} · {totalQty(order)}
            {tx("أصناف")}
          </span>
          <small>{when(order)}</small>
        </span>
        <span className="cx-ordercard__end">
          <strong className="cx-ordercard__total">
            {formatSyp(order.total)}
          </strong>
          <span className={`cx-status cx-status--${statusTone(order.status)}`}>
            {tx(statusLabels[order.status])}
          </span>
        </span>
        <span className="cx-ordercard__go" aria-hidden="true">
          <ArrowRight className="cx-arrow" size={16} />
        </span>
      </button>
    );
  };

  return (
    <div className="cx-wrap cx-orders">
      <header className="cx-orders__mast">
        <div className="cx-orders__mast-txt">
          <span className="cx-eyebrow">
            <i aria-hidden="true" />
            {tx("دفتر طلباتك")}
          </span>
          <h1>
            {tx("طلباتي")}
            <em className="mono-num">
              /{String(orders.length).padStart(2, "0")}
            </em>
          </h1>
          <p>{tx("كل طلب يحتفظ بوقته وتفاصيله وحالته حتى يصل إليك.")}</p>
        </div>
        <button type="button" className="cx-btn cx-btn--red" onClick={onMenu}>
          <Plus size={18} aria-hidden="true" />
          {tx("طلب جديد")}
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="cx-empty cx-empty--orders">
          <span className="cx-empty__art" aria-hidden="true">
            <ClipboardList size={27} />
          </span>
          <h3>{language === "en" ? "No orders yet" : "ما في طلبات بعد"}</h3>
          <p>{tx("ابدأ بتصفح القائمة واختر ما ترغب أن يصل إلى مائدتك.")}</p>
          <button type="button" className="cx-btn cx-btn--red" onClick={onMenu}>
            {tx("افتح القائمة")}
            <ArrowRight className="cx-arrow" size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="cx-orders__stack">
          {activeOrders.length > 0 && (
            <section className="cx-orders__block">
              <header className="cx-orders__group">
                <h2>
                  {tx("قيد التنفيذ الآن")}
                  <span className="cx-orders__count mono-num">
                    {digits.format(activeOrders.length)}
                  </span>
                </h2>
                <p>{tx("تحديثات المطبخ تظهر هنا لحظة بلحظة.")}</p>
              </header>
              <div className="cx-orders__live">
                {activeOrders.map(renderLive)}
              </div>
            </section>
          )}

          {archiveOrders.length > 0 && (
            <section className="cx-orders__block">
              <header className="cx-orders__group">
                <h2>
                  {tx("الطلبات السابقة")}
                  <span className="cx-orders__count mono-num">
                    {digits.format(archiveOrders.length)}
                  </span>
                </h2>
                <p>{tx("اضغط على أي طلب لمراجعة تفاصيله وحالته.")}</p>
              </header>
              <div className="cx-orders__rows">
                {archiveOrders.map((order) => (
                  <div key={order.id}>
                    {renderRow(order)}
                    {onReorder && (
                      <button
                        className="cx-btn cx-btn--outline cx-reorder"
                        type="button"
                        onClick={() => onReorder(order)}
                      >
                        <RefreshCw size={16} />
                        {tx("إعادة الطلب بالأسعار الحالية")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TrackingModal — live order tracking
   ============================================================ */
function TrackingModal({
  order,
  onClose,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onWhatsApp: (o: Order) => void;
}) {
  const { t: tx, language, syp: formatSyp } = useCustomerText();
  useOverlay(onClose);
  const [trackedOrder, setTrackedOrder] = useState(order);
  const [trackingMessage, setTrackingMessage] = useState("");
  const digits = new Intl.NumberFormat(language === "en" ? "en" : "ar-SY");

  useEffect(() => {
    setTrackedOrder(order);
    if (!order.publicToken) return;
    let active = true;

    const refresh = async () => {
      const { data, error } = await supabase.rpc("track_public_order", {
        p_token: order.publicToken,
      });
      if (!active) return;
      if (error || !data) {
        setTrackingMessage(
          tx("تعذّر تحديث الحالة الآن — سنحاول مجدداً تلقائياً."),
        );
        return;
      }
      const payload = data as {
        status: Order["status"];
        total: number;
        table?: string;
        address?: string;
        createdAt?: string;
      };
      setTrackedOrder((current) => ({
        ...current,
        status: payload.status,
        total: Number(payload.total),
        table: payload.table ?? current.table,
        address: payload.address ?? current.address,
        createdAt: payload.createdAt ?? current.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      setTrackingMessage(tx("تم تحديث الحالة مباشرة من المطعم."));
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [order]);

  const displayOrder = trackedOrder;
  const cancelled = displayOrder.status === "cancelled";
  const steps: Order["status"][] = cancelled
    ? ["received"]
    : [
        "received",
        "preparing",
        "ready",
        displayOrder.mode === "delivery" ? "out-for-delivery" : "completed",
      ];
  const current = cancelled
    ? -1
    : steps.indexOf(displayOrder.status) === -1
      ? 0
      : steps.indexOf(displayOrder.status);

  const statusIcon = cancelled ? (
    <X size={26} aria-hidden="true" />
  ) : displayOrder.status === "completed" ? (
    <Check size={26} aria-hidden="true" />
  ) : displayOrder.mode === "delivery" ? (
    <Truck size={26} aria-hidden="true" />
  ) : (
    <Utensils size={26} aria-hidden="true" />
  );

  const bannerLine = cancelled
    ? tx("تم إلغاء الطلب من قبل المطعم.")
    : displayOrder.status === "received"
      ? tx("تم إرسال طلبك إلى المطعم وسيُؤكد قريباً.")
      : displayOrder.status === "completed"
        ? tx("صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك.")
        : tx("فريقنا يعمل على تجهيز طلبك الآن.");

  const fmtSyp = formatSyp;

  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet cx-track"
        role="dialog"
        aria-modal="true"
        aria-label={
          language === "en"
            ? `Track order ${displayOrder.id}`
            : `تتبع الطلب رقم ${displayOrder.id}`
        }
      >
        <div className="cx-track__hero">
          <span className="cx-track__medallion" aria-hidden="true">
            {statusIcon}
          </span>
          <div className="cx-track__title">
            <span className="cx-eyebrow cx-eyebrow--light">
              <i aria-hidden="true" />
              {tx(modeLabels[displayOrder.mode])}
              {tx("· طلب رقم")}
              {displayOrder.id}
            </span>
            <h2>{tx(statusLabels[displayOrder.status])}</h2>
            <p>{bannerLine}</p>
          </div>
          <button
            className="cx-close cx-close--light"
            onClick={onClose}
            aria-label={tx("إغلاق")}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <span className="cx-track__total">
            <small>{tx("الإجمالي")}</small>
            <b>{fmtSyp(displayOrder.total)}</b>
          </span>
        </div>

        <div className="cx-track__body">
          {!cancelled && (
            <ol className="cx-timeline">
              {steps.map((step, i) => {
                const done = i <= current;
                const now = i === current;
                return (
                  <li
                    key={step}
                    className={`cx-tl${done ? " is-done" : ""}${
                      now ? " is-now" : ""
                    }`}
                    aria-current={now ? "step" : undefined}
                  >
                    <span className="cx-tl__dot" aria-hidden="true">
                      {done ? (
                        <Check size={14} />
                      ) : (
                        <i className="mono-num">{i + 1}</i>
                      )}
                    </span>
                    <span className="cx-tl__txt">
                      <b>{tx(statusLabels[step])}</b>
                      <small>
                        {now
                          ? tx("نحن هنا الآن")
                          : done
                            ? tx("تم")
                            : tx("الخطوة التالية")}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {cancelled && (
            <div className="cx-track__cancel">
              <span className="cx-track__cancel-ico" aria-hidden="true">
                <X size={20} />
              </span>
              <div>
                <b>{tx("طلب ملغى")}</b>
                <p>
                  {displayOrder.cancellationReason ||
                    "تم إلغاء الطلب من قبل المطعم. تواصل معنا عبر واتساب لأي استفسار."}
                </p>
              </div>
            </div>
          )}

          <section className="cx-track__lines">
            <header className="cx-track__sub">
              <h3>{tx("محتويات الطلب")}</h3>
              <span className="mono-num">
                {displayOrder.lines.length}
                {tx("أطباق")}
              </span>
            </header>
            {displayOrder.lines.map((line) => {
              const lineTotal =
                (line.item.price +
                  line.options.reduce((a, o) => a + o.price, 0)) *
                line.qty;
              return (
                <div className="cx-track__line" key={line.key}>
                  <span className="cx-track__thumb">
                    <img src={line.item.image} alt="" loading="lazy" />
                    <b className="mono-num">{line.qty}</b>
                  </span>
                  <span className="cx-track__mid">
                    <strong>
                      {language === "en"
                        ? line.item.en || line.item.name
                        : line.item.name}
                    </strong>
                    <small>
                      {line.options.length
                        ? line.options.map((o) => o.name).join(" · ")
                        : tx("بدون إضافات")}
                      {line.note ? ` — ${line.note}` : ""}
                    </small>
                  </span>
                  <b className="cx-track__amt mono-num">{fmtSyp(lineTotal)}</b>
                </div>
              );
            })}
          </section>
        </div>

        <footer className="cx-track__foot">
          {trackingMessage && (
            <span className="cx-track__live">
              <i aria-hidden="true" />
              {tx(trackingMessage)}
            </span>
          )}
          <button
            type="button"
            className="cx-track__wa"
            onClick={() => onWhatsApp(displayOrder)}
          >
            <MessageCircle size={19} aria-hidden="true" />
            {tx("تواصل مع المطعم عبر واتساب")}
          </button>
        </footer>
      </section>
    </div>
  );
}

export {
  MenuView,
  ItemModal,
  CartDrawer,
  CheckoutModal,
  OrdersView,
  TrackingModal,
};
