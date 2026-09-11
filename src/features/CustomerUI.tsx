import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  ClipboardList,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Store,
  Truck,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { bumpCart, flyToCart } from "./motion";
import {
  verifyOnSitePresence,
  type GeoFix,
  type PresenceResult,
} from "../geolocation";
import { supabase } from "../supabase";
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

/* ---------------- shared helpers ---------------- */

function useOverlay(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}

function money(value: number, currency: "syp" | "usd", rate: number) {
  return currency === "usd" ? formatUsd(value, rate) : formatSyp(value);
}

function moneySecondary(value: number, currency: "syp" | "usd", rate: number) {
  return currency === "usd" ? formatSyp(value) : `≈ ${formatUsd(value, rate)}`;
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
  mode === "dine-in"
    ? "على الطاولة"
    : mode === "takeaway"
      ? "سفري"
      : "توصيل";

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
  return (
    <div className="cx-stepper">
      <button
        type="button"
        className="cx-stepper__btn"
        onClick={onDec}
        aria-label={labels?.dec ?? "إنقاص الكمية"}
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
        aria-label={labels?.inc ?? "زيادة الكمية"}
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
  onSelect: (i: Item) => void;
  onQuickAdd: (i: Item) => void;
}) {
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
      ? "كل الأطباق"
      : category === "الأكثر طلباً"
        ? "الأكثر طلباً"
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

  const jumpToCategory = (entry: string) => {
    setCategory(entry);
    scrollToMenu();
  };

  const quickCats = categories.slice(0, 4);
  const digits = new Intl.NumberFormat("ar-SY");

  return (
    <div className="cx-store">
      {bannerOn && bannerText && (
        <div className={`cx-banner cx-banner--${bannerTone}`} role="status">
          <span aria-hidden="true">✦</span>
          <p>{bannerText}</p>
        </div>
      )}

      {/* ---- Editorial campaign hero ---- */}
      <section className="cx-hero">
        <span className="cx-hero__grain" aria-hidden="true" />
        <span className="cx-hero__ring" aria-hidden="true" />
        <span className="cx-hero__ring cx-hero__ring--b" aria-hidden="true" />
        <div className="cx-hero__inner">
          <div className="cx-hero__copy">
            <div className="cx-hero__topline">
              <span className="cx-eyebrow cx-eyebrow--light">
                <i aria-hidden="true" />
                {restaurant.neighborhood ? restaurant.neighborhood : "المطعم"}
                {restaurant.city ? ` · ${restaurant.city}` : ""}
              </span>
            </div>
            <h1 className="cx-hero__name">{restaurant.name}</h1>
            <p className="cx-hero__sub">{restaurant.subtitle}</p>

            <div className="cx-hero__facts">
              <span className="cx-hero__fact">
                <b className="mono-num">{digits.format(itemCount || restaurant.items.length)}</b>
                <small>صنفاً في القائمة</small>
              </span>
              <span className="cx-hero__fact">
                <b>طازج</b>
                <small>يحضَّر عند الطلب</small>
              </span>
            </div>

            <div className="cx-hero__ctas">
              <button
                type="button"
                className="cx-btn cx-btn--red cx-btn--lg"
                onClick={scrollToMenu}
              >
                <ShoppingBasket size={19} aria-hidden="true" />
                تصفح الأطباق
                <ChevronDown size={18} className="cx-motiondown" aria-hidden="true" />
              </button>
              {quickCats.length > 0 && (
                <nav className="cx-hero__cats" aria-label="اختصارات الأقسام">
                  {quickCats.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => jumpToCategory(entry.name)}
                    >
                      <i className="mono-num">
                        {String(index + 1).padStart(2, "0")}
                      </i>
                      {entry.name}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </div>

          <div className="cx-hero__art">
            <figure className="cx-hero__plate">
              <img src={heroImage} alt={`من قائمة ${restaurant.name}`} />
              <span className="cx-hero__plate-tag" aria-hidden="true">
                <i />
                أطباق تحضَّر بشغف
              </span>
            </figure>
            <span className="cx-hero__seal" aria-hidden="true">
              {designLogoUrl ? (
                <img src={designLogoUrl} alt="" />
              ) : (
                restaurant.logo || "م"
              )}
            </span>
          </div>
        </div>
      </section>

      {/* ---- Sticky search / filters / category rail ---- */}
      <div className="cx-stick">
        <section className="cx-tools" aria-label="البحث والتصفية">
          <label className="cx-search">
            <Search size={19} aria-hidden="true" />
            <span className="cx-search__bar">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن طبق أو مكوّن…"
                aria-label="ابحث في القائمة"
              />
              {query && (
                <button
                  type="button"
                  className="cx-search__clear"
                  onClick={() => setQuery("")}
                  aria-label="مسح البحث"
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
            <div className="cx-tagchips" role="group" aria-label="تصفية الأطباق">
              <button
                type="button"
                className={`cx-chip${tag === "all" ? " is-on" : ""}`}
                onClick={() => setTag("all")}
              >
                الكل
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
                  {tagLabels[entry]}
                </button>
              ))}
            </div>
            <div
              className="cx-cur"
              role="group"
              aria-label="العملة"
            >
              <button
                type="button"
                className={currency === "syp" ? "is-on" : ""}
                onClick={() => setCurrency("syp")}
              >
                ل.س
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

        <nav className="cx-cats" aria-label="تصفح أقسام القائمة">
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
                <span>{entry}</span>
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
              {restaurant.name}
            </span>
            <h2 className="cx-catalog__title">
              {heading}
              <em className="mono-num">
                /{String(catEntries.indexOf(category) + 1).padStart(2, "0")}
              </em>
            </h2>
            <p className="cx-catalog__lead">
              اضغط على أي طبق لتفاصيله وخياراته، أو أضفه مباشرة بلمسة.
            </p>
          </div>
          {itemCount > 0 && (
            <span className="cx-catalog__stamp">
              <b className="mono-num">{digits.format(itemCount)}</b>
              صنفاً متاحاً
            </span>
          )}
        </header>

        <div className="cx-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="cx-dish cx-dish--sk" key={index} aria-hidden="true">
                  <span className="cx-dish__media sk" />
                  <div className="cx-dish__body">
                    <span className="cx-skline sk" style={{ width: "38%" }} />
                    <span className="cx-skline sk" style={{ width: "72%" }} />
                    <span className="cx-skline sk" style={{ width: "55%" }} />
                  </div>
                </div>
              ))
            : items.map((item) => {
                const price = money(item.price, currency, rate);
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
                      aria-label={`تفاصيل ${item.name}`}
                    >
                      <span className="cx-dish__imgwrap">
                        <img src={item.image} alt={item.name} loading="lazy" />
                      </span>
                      {item.popular && (
                        <span className="cx-dish__flag">
                          <b>الأكثر طلباً</b>
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
                        <span className="cx-dish__cat">{item.category}</span>
                        {item.tags.length > 0 && (
                          <span className="cx-dish__tags">
                            {item.tags.map((t) => (
                              <span key={t}>{tagLabels[t]}</span>
                            ))}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="cx-dish__name"
                        onClick={() => go(item)}
                      >
                        {item.name}
                        {item.en && <i lang="en">{item.en}</i>}
                      </button>
                      {item.desc && <p className="cx-dish__desc">{item.desc}</p>}

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
                               const dish = e.currentTarget.closest(".cx-dish");
                               flyToCart(
                                 dish?.querySelector<HTMLElement>(
                                   ".cx-dish__imgwrap img"
                                 )
                               );
                               onQuickAdd(item);
                             }}
                             aria-label={`أضف ${item.name} إلى الطلب`}
                           >
                            <Plus size={20} aria-hidden="true" />
                            <span>أضف</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cx-add cx-add--ghost"
                            onClick={() => go(item)}
                          >
                            <span>تخصيص</span>
                            <ChevronDown size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
        </div>

        {!loading && items.length === 0 && (
          <div className="cx-empty">
            <span className="cx-empty__art" aria-hidden="true">
              <Search size={26} />
            </span>
            <h3>لم نجد صنفاً مطابقاً</h3>
            <p>جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً من القائمة.</p>
            <button
              type="button"
              className="cx-btn cx-btn--red"
              onClick={() => {
                setQuery("");
                setTag("all");
                setCategory("كل الأصناف");
              }}
            >
              عرض كل الأصناف
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="cx-catalog__foot">
            <span aria-hidden="true">✦</span>
            كل أطباق {restaurant.name} تحضَّر طازجة عند الطلب — بالهناء والشفاء.
          </p>
        )}
      </section>
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
  useOverlay(onClose);
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const hasRequired =
    item.options?.some((group) => group.required) ?? false;
  const missingRequired = hasRequired
    ? item.options!.some(
        (group) => group.required && !selected[group.id]?.length,
      )
    : false;
  const valid = !missingRequired;
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
        aria-label={item.name}
      >
        <div className="cx-item">
          <div className="cx-item__media">
            <img src={item.image} alt={item.name} />
            <span className="cx-item__cat">{item.category}</span>
            {item.popular && <span className="cx-item__flag">الأكثر طلباً</span>}
          </div>

          <div className="cx-item__panel">
            <button
              className="cx-close"
              onClick={onClose}
              aria-label="إغلاق"
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
                <h2>{item.name}</h2>
                {item.desc && <p className="cx-item__desc">{item.desc}</p>}
                <div className="cx-item__price">
                  <strong>{money(price, currency, rate)}</strong>
                  {currency === "usd" ? (
                    <small>{formatSyp(price)}</small>
                  ) : (
                    <small>{moneySecondary(price, currency, rate)}</small>
                  )}
                </div>
              </header>

              {groups.length > 0 && (
                <div className="cx-groups">
                  {groups.map((group) => {
                    const single = Boolean(group.required);
                    const chosen = selected[group.id] ?? [];
                    const isMissing = group.required && chosen.length === 0;
                    return (
                      <fieldset
                        key={group.id}
                        className="cx-group"
                      >
                        <legend className="cx-group__head">
                          <span className="cx-group__title">
                            {group.name}
                            {isMissing && (
                              <b className="cx-req">
                                <i aria-hidden="true" /> اختيار مطلوب
                              </b>
                            )}
                          </span>
                          <span
                            className={`cx-group__meta${
                              group.required ? " is-req" : ""
                            }`}
                          >
                            {group.required
                              ? "مطلوب · اختر واحداً"
                              : chosen.length
                                ? `اخترت ${chosen.length}`
                                : "اختياري · يمكنك اختيار أكثر من واحد"}
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
                                <span className="cx-pick__dot" aria-hidden="true">
                                  <Check size={13} />
                                </span>
                                <span className="cx-pick__name">
                                  {option.name}
                                  {single && checked && (
                                    <small>الاختيار الحالي</small>
                                  )}
                                </span>
                                <span className="cx-pick__price">
                                  {option.price
                                    ? `+${money(option.price, currency, rate)}`
                                    : "بلا رسوم"}
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
                  ملاحظة للمطبخ
                  <small className="mono-num">{note.length}/200</small>
                </span>
                <textarea
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثلاً: بدون بصل، الصوص جانباً…"
                />
              </label>
            </div>

            <footer className="cx-item__foot">
              <div className="cx-item__qty">
                <small>الكمية</small>
                <Stepper
                  qty={qty}
                  onDec={() => setQty((q) => Math.max(1, q - 1))}
                  onInc={() => setQty((q) => Math.min(20, q + 1))}
                />
              </div>
              <div className="cx-item__total">
                <small>الإجمالي</small>
                <strong>{money(price * qty, currency, rate)}</strong>
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--red cx-btn--lg cx-item__add"
                disabled={!valid}
                onClick={confirm}
              >
                <Plus size={20} aria-hidden="true" />
                {valid
                  ? `أضف إلى الطلب · ${qty}`
                  : "أكمل الاختيارات المطلوبة"}
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
        aria-label="سلة الطلب"
      >
        <header className="cx-cart__head">
          <div>
            <span className="cx-eyebrow">
              <i aria-hidden="true" />
              طلبك
            </span>
            <h2>سلة طلبك</h2>
            <p>
              {itemCount > 0 ? (
                <>
                  <b className="mono-num">{itemCount}</b> صنفاً بانتظار التأكيد
                </>
              ) : (
                "لا شيء فيها بعد"
              )}
            </p>
          </div>
          <button className="cx-close" onClick={onClose} aria-label="إغلاق السلة">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="cx-empty cx-empty--bag">
            <span className="cx-empty__art" aria-hidden="true">
              <ShoppingBasket size={26} />
            </span>
            <h3>سلتك ما زالت فارغة</h3>
            <p>اختر أطباقاً من القائمة وستجدها هنا بانتظار التأكيد.</p>
            <button type="button" className="cx-btn cx-btn--red" onClick={onClose}>
              تصفح القائمة
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
                      <strong>{line.item.name}</strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : "بدون إضافات"}
                        {line.note ? ` — ${line.note}` : ""}
                      </small>
                      <b className="cx-cline__price">
                        {money(unit * line.qty, currency, rate)}
                      </b>
                    </div>
                    <div className="cx-cline__end">
                      <Stepper
                        qty={line.qty}
                        onDec={() => onQty(line.key, -1)}
                        onInc={() => onQty(line.key, 1)}
                        labels={{
                          dec: `إنقاص ${line.item.name}`,
                          inc: `زيادة ${line.item.name}`,
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
                  <span>الإجمالي</span>
                  <strong>{money(total, currency, rate)}</strong>
                </div>
                <small className="cx-cart__note">
                  غير شامل رسوم التوصيل — يُحتسب النهائي من المطعم عند التأكيد.
                </small>
                {currency === "usd" && (
                  <small className="cx-cart__usd">
                    {moneySecondary(total, currency, rate)} · سعر صرف تقديري
                  </small>
                )}
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--red cx-btn--lg cx-btn--block"
                onClick={proceed}
              >
                متابعة تفاصيل الطلب
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
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement, fix?: GeoFix | null) => void | Promise<void>;
  settings?: RestaurantSettings;
  tableContext: PublicMenuPayload["table"];
  backendReady: boolean;
  currency: "syp" | "usd";
  rate: number;
  lines?: CartLine[];
}) {
  useOverlay(onClose);
  const cashValue = mode === "delivery" ? PAY_CASH_DELIVERY : PAY_CASH_DINE;
  const [pay, setPay] = useState<string>(cashValue);
  const [orderBusy, setOrderBusy] = useState(false);

  const missingDineInContext = mode === "dine-in" && !tableContext;
  const hasCoords =
    settings?.latitude != null && settings?.longitude != null;
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
    missingDineInContext ||
    disabledBySettings ||
    orderBusy ||
    presenceBusy ||
    (gpsRequired && !presenceOk);

  const cashLabel = mode === "delivery" ? "نقداً عند الاستلام" : "نقداً";
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
    try {
      await onSubmit(form, presence?.ok ? presence.fix : null);
    } finally {
      setOrderBusy(false);
    }
  };

  const summaryLines = lines ?? [];
  const isUsd = currency === "usd";
  const payOptions = [cashValue, ...PAY_WALLETS] as string[];

  return (
    <div
      className="cx-overlay cx-overlay--checkout"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-checkout"
        role="dialog"
        aria-modal="true"
        aria-label="إتمام الطلب"
      >
        <header className="cx-checkout__top">
          <button
            className="cx-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div className="cx-checkout__kicker">
            <span className="cx-eyebrow">
              <i aria-hidden="true" />
              إتمام الطلب
            </span>
            <h2>لنضع اللمسات الأخيرة</h2>
            <p>أكمل البيانات ثم أرسل — يصل طلبك مباشرة إلى المطبخ.</p>
          </div>
          <div className="cx-progress" aria-hidden="true">
            <span className="is-on">
              <i>1</i>
              طريقة الطلب
            </span>
            <span>
              <i>2</i>
              البيانات
            </span>
            <span>
              <i>3</i>
              الدفع
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
                  <strong>كيف تريد طلبك؟</strong>
                  <small>اختر طريقة الاستلام المناسبة لك</small>
                </div>
              </div>
              <div className="cx-modes">
                {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => {
                  const Icon = modeIcon(m);
                  const on = mode === m;
                  const unavailable = Boolean(
                    settings && !settings[m === "dine-in" ? "dineIn" : m === "takeaway" ? "takeaway" : "delivery"],
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
                        <b>{modeLabels[m]}</b>
                        <small>{modeIconBig(m)}</small>
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
                  هذا النوع من الطلبات غير متاح حالياً في هذا المطعم.
                </p>
              )}
            </section>

            {/* Step 2 — details */}
            <section className="cx-step">
              <div className="cx-step__label">
                <em className="mono-num">02</em>
                <div>
                  <strong>إلى من نجهّزها؟</strong>
                  <small>نستخدم البيانات لتسليم طلبك فقط</small>
                </div>
              </div>
              <div className="cx-fields">
                <label className="cx-field">
                  <span className="cx-field__label">
                    الاسم <i aria-hidden="true">*</i>
                  </span>
                  <input name="customer" required placeholder="اسمك الكريم" />
                </label>
                <label className="cx-field">
                  <span className="cx-field__label">
                    رقم الهاتف {mode !== "dine-in" && <i aria-hidden="true">*</i>}
                  </span>
                  <input
                    name="phone"
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
                        الطاولة: <strong>{tableContext.labelAr}</strong>
                        {tableContext.area ? ` — ${tableContext.area}` : ""}
                      </span>
                      <b aria-hidden="true">✓</b>
                    </div>
                  ) : (
                    <p className="cx-note cx-note--danger cx-field--full">
                      امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل
                      المطعم.
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
                        <b>جارٍ التحقق من وجودك داخل المطعم…</b>
                      ) : presence?.ok ? (
                        <>
                          <b>تم تأكيد وجودك داخل المطعم ✓</b>
                          <small className="mono-num">
                            {presence.distance > 0
                              ? `البعد عن المطعم ≈ ${Math.round(presence.distance)} م`
                              : "تم التحقق من الموقع"}
                          </small>
                        </>
                      ) : presence ? (
                        <>
                          <b>
                            {presence.reason === "far"
                              ? "أنت خارج نطاق المطعم"
                              : presence.reason === "denied"
                                ? "لم يُسمح بالوصول إلى الموقع"
                                : presence.reason === "timeout"
                                  ? "تأخر تحديد الموقع"
                                  : presence.reason === "unsupported"
                                    ? "جهازك لا يدعم تحديد الموقع"
                                    : "تعذر تحديد موقعك الآن"}
                          </b>
                          {presence.reason === "far" &&
                          presence.distance != null ? (
                            <small className="mono-num">
                              بعدك ≈ {Math.round(presence.distance)} م — المسموح{" "}
                              {presence.radius} م
                            </small>
                          ) : (
                            <small>
                              {presence.reason === "denied"
                                ? "فعّل إذن الموقع من إعدادات المتصفح ثم أعد المحاولة."
                                : "اقترب من المطعم وانتظر لحظات ثم أعد المحاولة."}
                            </small>
                          )}
                        </>
                      ) : (
                        <b>لابد من تأكيد وجودك داخل المطعم للطلب داخل الصالة</b>
                      )}
                    </span>
                    {(presence && !presence.ok) || !presenceBusy ? (
                      <button
                        type="button"
                        className="cx-geo__retry"
                        onClick={() => void verifyPresence()}
                        disabled={presenceBusy}
                      >
                        {presence ? "إعادة التحقق" : "تحقق من موقعي"}
                      </button>
                    ) : null}
                  </div>
                )}

                {mode === "delivery" && (
                  <>
                    <label className="cx-field cx-field--full">
                      <span className="cx-field__label">
                        العنوان بالتفصيل <i aria-hidden="true">*</i>
                      </span>
                      <textarea
                        name="address"
                        required
                        placeholder="الحي، الشارع، البناء، أقرب نقطة دالة…"
                      />
                    </label>
                    {settings && settings.zones.length > 0 && (
                      <label className="cx-field cx-field--full">
                        <span className="cx-field__label">
                          منطقة التوصيل <i aria-hidden="true">*</i>
                        </span>
                        <span className="cx-select">
                          <select name="zone">
                            {settings.zones
                              .filter((zone) => zone.active)
                              .map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                  {zone.name} — رسوم {formatSyp(zone.fee)} · حد
                                  أدنى {formatSyp(zone.minimum)}
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
                    <span className="cx-field__label">وقت الاستلام</span>
                    <span className="cx-select">
                      <select name="pickup">
                        <option>الآن (٢٥ - ٣٥ دقيقة)</option>
                        <option>بعد ساعة</option>
                        <option>بعد ساعتين</option>
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </label>
                )}
              </div>
            </section>

            {/* Step 3 — payment */}
            <section className="cx-step">
              <div className="cx-step__label">
                <em className="mono-num">03</em>
                <div>
                  <strong>طريقة الدفع</strong>
                  <small>اختر وسيلة الدفع المفضلة لديك</small>
                </div>
              </div>
              <div className="cx-pays" role="radiogroup" aria-label="طريقة الدفع">
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
                        <b>{option}</b>
                        {option === cashValue && (
                          <small>
                            {mode === "delivery"
                              ? "ادفع للطيّار عند الاستلام"
                              : "ادفع نقداً عند الاستلام أو في المطعم"}
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
                  مرجع الحوالة
                  <small>اختياري للمحافظ</small>
                </span>
                <input name="paymentReference" placeholder="رقم العملية" />
              </label>
            </section>
          </div>

          {/* ---- Order slip (summary) ---- */}
          <aside className="cx-slip">
            <div className="cx-slip__stamp" aria-hidden="true">
              <span>طلب</span>
              <b>جديد</b>
            </div>
            <h3 className="cx-slip__title">ملخص طلبك</h3>
            <p className="cx-slip__note">
              السعر النهائي يُحتسب من المطعم عند تأكيد الطلب.
            </p>

            <div className="cx-slip__items">
              {summaryLines.length === 0 && (
                <p className="cx-slip__empty">سلتك فارغة — عد وأضف أطباقاً.</p>
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
                      <strong>{line.item.name}</strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : ""}
                      </small>
                    </span>
                    <b className="cx-slip__price">
                      {money(unit * line.qty, currency, rate)}
                    </b>
                  </div>
                );
              })}
            </div>

            <div className="cx-slip__totals">
              <div className="cx-slip__row">
                <span>
                  الإجمالي · <b className="mono-num">{itemCount}</b> صنفاً
                </span>
                <strong>{money(total, currency, rate)}</strong>
              </div>
              {isUsd && (
                <small className="cx-slip__usd">
                  {moneySecondary(total, currency, rate)} · سعر صرف تقديري
                </small>
              )}
            </div>

            <div className="cx-slip__trust">
              <span className="cx-slip__trust-ico" aria-hidden="true">
                <ShieldCheck size={19} />
              </span>
              <span>
                <b>إرسال آمن وموثوق</b>
                <small>تأكيد نهائي قبل الإرسال مباشرة إلى المطبخ</small>
              </span>
            </div>
          </aside>
        </form>

        <footer className="cx-checkout__foot">
          <div className="cx-checkout__sum">
            <small>الإجمالي النهائي</small>
            <strong>{money(total, currency, rate)}</strong>
            {isUsd && <em>{moneySecondary(total, currency, rate)}</em>}
          </div>
          {!backendReady ? (
            <p className="cx-note cx-note--danger">
              أنت دون اتصال — تحقق من الشبكة ثم أعد المحاولة.
            </p>
          ) : (
            <button
              type="submit"
              form="cx-checkout-form"
              className="cx-btn cx-btn--red cx-btn--lg"
              disabled={submitDisabled}
            >
              {missingDineInContext
                ? "امسح رمز الطاولة أولاً"
                : orderBusy
                  ? "جارٍ إرسال طلبك…"
                  : "تأكيد الطلب وإرساله"}
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
  onTrack,
  onMenu,
}: {
  orders: Order[];
  onTrack: (o: Order) => void;
  onMenu: () => void;
}) {
  const activeOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  );
  const archiveOrders = orders.filter((order) =>
    ["completed", "cancelled"].includes(order.status),
  );
  const digits = new Intl.NumberFormat("ar-SY");

  const when = (order: Order) =>
    new Date(order.createdAt).toLocaleDateString("ar-SY", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  const totalQty = (order: Order) =>
    order.lines.reduce((a, l) => a + l.qty, 0);

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
          <span
            className={`cx-status cx-status--${statusTone(order.status)}`}
          >
            {statusLabels[order.status]}
          </span>
        </span>
        <span className="cx-livecard__mid">
          <b>{order.customer}</b>
          <small>
            <Icon size={14} aria-hidden="true" />
            {modeLabels[order.mode]}
            {order.table ? ` · ${order.table}` : ""} · {totalQty(order)} أصناف
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
              تتبع الطلب
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
            {modeLabels[order.mode]}
            {order.table ? ` · ${order.table}` : ""} · {totalQty(order)} أصناف
          </span>
          <small>{when(order)}</small>
        </span>
        <span className="cx-ordercard__end">
          <strong className="cx-ordercard__total">
            {formatSyp(order.total)}
          </strong>
          <span className={`cx-status cx-status--${statusTone(order.status)}`}>
            {statusLabels[order.status]}
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
            دفتر طلباتك
          </span>
          <h1>
            حكاية طلباتك
            <em className="mono-num">
              /{String(orders.length).padStart(2, "0")}
            </em>
          </h1>
          <p>كل طلب يحتفظ بوقته وتفاصيله وحالته حتى يصل إليك.</p>
        </div>
        <button type="button" className="cx-btn cx-btn--red" onClick={onMenu}>
          <Plus size={18} aria-hidden="true" />
          طلب جديد
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="cx-empty cx-empty--orders">
          <span className="cx-empty__art" aria-hidden="true">
            <ClipboardList size={27} />
          </span>
          <h3>لم تُكتب أول حكاية بعد</h3>
          <p>ابدأ بتصفح القائمة واختر ما ترغب أن يصل إلى مائدتك.</p>
          <button
            type="button"
            className="cx-btn cx-btn--red"
            onClick={onMenu}
          >
            افتح القائمة
            <ArrowRight className="cx-arrow" size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="cx-orders__stack">
          {activeOrders.length > 0 && (
            <section className="cx-orders__block">
              <header className="cx-orders__group">
                <h2>
                  قيد التنفيذ الآن
                  <span className="cx-orders__count mono-num">
                    {digits.format(activeOrders.length)}
                  </span>
                </h2>
                <p>تحديثات المطبخ تظهر هنا لحظة بلحظة.</p>
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
                  الطلبات السابقة
                  <span className="cx-orders__count mono-num">
                    {digits.format(archiveOrders.length)}
                  </span>
                </h2>
                <p>اضغط على أي طلب لمراجعة تفاصيله وحالته.</p>
              </header>
              <div className="cx-orders__rows">{archiveOrders.map(renderRow)}</div>
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
  useOverlay(onClose);
  const [trackedOrder, setTrackedOrder] = useState(order);
  const [trackingMessage, setTrackingMessage] = useState("");
  const digits = new Intl.NumberFormat("ar-SY");

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
        setTrackingMessage("تعذّر تحديث الحالة الآن — سنحاول مجدداً تلقائياً.");
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
      setTrackingMessage("تم تحديث الحالة مباشرة من المطعم.");
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
    ? "تم إلغاء الطلب من قبل المطعم."
    : displayOrder.status === "received"
      ? "تم إرسال طلبك إلى المطعم وسيُؤكد قريباً."
      : displayOrder.status === "completed"
        ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك."
        : "فريقنا يعمل على تجهيز طلبك الآن.";

  const fmtSyp = (n: number) => `ل.س ${digits.format(n)}`;

  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet cx-track"
        role="dialog"
        aria-modal="true"
        aria-label={`تتبع الطلب رقم ${displayOrder.id}`}
      >
        <div className="cx-track__hero">
          <span className="cx-track__medallion" aria-hidden="true">
            {statusIcon}
          </span>
          <div className="cx-track__title">
            <span className="cx-eyebrow cx-eyebrow--light">
              <i aria-hidden="true" />
              {modeLabels[displayOrder.mode]} · طلب رقم {displayOrder.id}
            </span>
            <h2>{statusLabels[displayOrder.status]}</h2>
            <p>{bannerLine}</p>
          </div>
          <button
            className="cx-close cx-close--light"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <span className="cx-track__total">
            <small>الإجمالي</small>
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
                      {done ? <Check size={14} /> : <i className="mono-num">{i + 1}</i>}
                    </span>
                    <span className="cx-tl__txt">
                      <b>{statusLabels[step]}</b>
                      <small>
                        {now
                          ? "نحن هنا الآن"
                          : done
                            ? "تم"
                            : "الخطوة التالية"}
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
                <b>طلب ملغى</b>
                <p>
                  {displayOrder.cancellationReason ||
                    "تم إلغاء الطلب من قبل المطعم. تواصل معنا عبر واتساب لأي استفسار."}
                </p>
              </div>
            </div>
          )}

          <section className="cx-track__lines">
            <header className="cx-track__sub">
              <h3>محتويات الطلب</h3>
              <span className="mono-num">{displayOrder.lines.length} أطباق</span>
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
                    <strong>{line.item.name}</strong>
                    <small>
                      {line.options.length
                        ? line.options.map((o) => o.name).join(" · ")
                        : "بدون إضافات"}
                      {line.note ? ` — ${line.note}` : ""}
                    </small>
                  </span>
                  <b className="cx-track__amt mono-num">
                    {fmtSyp(lineTotal)}
                  </b>
                </div>
              );
            })}
          </section>
        </div>

        <footer className="cx-track__foot">
          {trackingMessage && (
            <span className="cx-track__live">
              <i aria-hidden="true" />
              {trackingMessage}
            </span>
          )}
          <button
            type="button"
            className="cx-track__wa"
            onClick={() => onWhatsApp(displayOrder)}
          >
            <MessageCircle size={19} aria-hidden="true" />
            تواصل مع المطعم عبر واتساب
          </button>
        </footer>
      </section>
    </div>
  );
}

export { MenuView, ItemModal, CartDrawer, CheckoutModal, OrdersView, TrackingModal };
