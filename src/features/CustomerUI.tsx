import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
  X,
} from "lucide-react";
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

/* ============================================================
   MenuView — cover, search, filters, sticky categories, grid
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
  const featured = items[0] ?? restaurant.items[0];
  const heroImage = featured?.image ?? items[0]?.image ?? images.mezze;
  const suggestions = items.slice(0, 3);

  const catEntries = [
    "كل الأصناف",
    "الأكثر طلباً",
    ...categories.map((entry) => entry.name),
  ];
  const heading =
    category === "كل الأصناف"
      ? "كل الأطباق"
      : category === "الأكثر طلباً"
        ? "الأكثر طلباً"
        : category;

  const go = (item: Item) => {
    const el = document.getElementById("cx-grid-top");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    onSelect(item);
  };

  return (
    <div className="cx-storefront">
      {/* Cover */}
      <section className="cx-cover" aria-hidden="true">
        <img className="cx-cover__bg" src={heroImage} alt="" />
        <div className="cx-cover__shade" />
      </section>

      {/* Identity card */}
      <section className="cx-iden" aria-label="معلومات المطعم">
        <span className="cx-iden__logo">{restaurant.logo || "س"}</span>
        <div className="cx-iden__main">
          <span className="cx-iden__kicker">من الطاولة إلى المطبخ</span>
          <h1>{restaurant.name}</h1>
          <p>{restaurant.subtitle}</p>
          <div className="cx-iden__meta">
            <span>مقبلات · أطباق رئيسية · مشروبات · حلويات</span>
          </div>
        </div>
      </section>

      {/* Search / filters */}
      <section className="cx-tools" aria-label="البحث والتصفية">
        <label className="cx-search">
          <Search />
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
              <X />
            </button>
          )}
          <span className="cx-search__count">{items.length} صنفاً</span>
        </label>

        <div className="cx-filterbar">
          <div className="cx-tagchips">
            <button
              type="button"
              className={`cx-tagchip${tag === "all" ? " is-on" : ""}`}
              onClick={() => setTag("all")}
            >
              الكل
            </button>
            {(["vegetarian", "chef"] as Tag[]).map((entry) => (
              <button
                type="button"
                key={entry}
                className={`cx-tagchip${tag === entry ? " is-on" : ""}`}
                onClick={() => setTag(tag === entry ? "all" : entry)}
              >
                {tagLabels[entry]}
              </button>
            ))}
          </div>
          <div className="cx-seg" role="group" aria-label="العملة">
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

      {/* Sticky category rail */}
      <div className="cx-catbar">
        <nav className="cx-cats" aria-label="تصفح الأقسام">
          {catEntries.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`cx-cat${category === entry ? " is-on" : ""}`}
              onClick={() => setCategory(entry)}
            >
              {entry}
            </button>
          ))}
        </nav>
      </div>

      {/* Catalogue */}
      <section className="cx-catalogue" id="menu-catalogue">
        <div id="cx-grid-top" />
        <header className="cx-section-head">
          <div>
            <h2>{heading}</h2>
            <p>اضغط على أي طبق لتفاصيله وخياراته، أو أضفه مباشرة بلمسة.</p>
          </div>
          {items.length > 0 && (
            <span className="cx-search__count">{items.length} صنفاً</span>
          )}
        </header>

        <div className="cx-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="cx-card sk" key={index} aria-hidden="true">
                  <span className="cx-card__img" />
                  <div className="cx-card__body">
                    <span className="cx-body__line" />
                    <span className="cx-body__line" />
                  </div>
                </div>
              ))
            : items.map((item) => {
                const price = money(item.price, currency, rate);
                const secondary = currency === "usd" ? formatSyp(item.price) : "";
                return (
                  <article className="cx-card" key={item.id}>
                    <button
                      type="button"
                      className="cx-card__img"
                      onClick={() => go(item)}
                      aria-label={`تفاصيل ${item.name}`}
                    >
                      <img src={item.image} alt={item.name} loading="lazy" />
                      {item.popular && (
                        <span className="cx-card__badge">الأكثر طلباً</span>
                      )}
                    </button>
                    <div className="cx-card__body">
                      <button
                        type="button"
                        className="cx-card__name"
                        onClick={() => go(item)}
                      >
                        {item.name}
                        {item.en && <small>{item.en}</small>}
                      </button>
                      {item.desc && <p className="cx-card__desc">{item.desc}</p>}
                      {item.tags.length > 0 && (
                        <div className="cx-tags">
                          {item.tags.map((t) => (
                            <span className="cx-tagmini" key={t}>
                              {tagLabels[t]}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="cx-card__foot">
                        <div className="cx-price">
                          <b>{price}</b>
                          {secondary && <small>{secondary}</small>}
                        </div>
                        {!needsChoices(item) ? (
                          <button
                            type="button"
                            className="cx-addbtn"
                            onClick={() => onQuickAdd(item)}
                          >
                            <Plus />
                            أضف
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cx-addbtn is-ghost"
                            onClick={() => go(item)}
                          >
                            اختر الخيارات
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
        </div>

        {!loading && items.length > 0 && (
          <aside className="cx-suggest">
            <b>من نفس المائدة ✦</b>
            <span>{suggestions.map((item) => item.name).join(" · ")}</span>
          </aside>
        )}

        {!loading && items.length === 0 && (
          <div className="cx-empty">
            <span className="cx-empty__icon">
              <Utensils />
            </span>
            <h3>لم نجد صنفاً مطابقاً</h3>
            <p>جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً من القائمة.</p>
            <button
              type="button"
              className="cx-cta"
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
      </section>
    </div>
  );
}

/* ============================================================
   ItemModal — bottom sheet with customisation
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
  onAdd: (i: Item, o: Option[], n: string) => void;
}) {
  useOverlay(onClose);
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [note, setNote] = useState("");

  const missingRequired = !item.options?.some(
    (group) => group.required && !selected[group.id]?.length,
  );
  const valid = Boolean(item.options?.length ? missingRequired : true);
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
        <div className="cx-sheet__grab" aria-hidden="true">
          <i />
        </div>
        <div className="cx-item__media">
          <img src={item.image} alt={item.name} />
          <span className="cx-item__cat">{item.category}</span>
          <button className="cx-close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </div>

        <div className="cx-sheet__body">
          <header className="cx-item__head">
            <span className="cx-iden__kicker">{item.en}</span>
            <h2>{item.name}</h2>
            {item.desc && <p>{item.desc}</p>}
            <div className="cx-item__price">
              <strong>{money(price, currency, rate)}</strong>
              {currency === "usd" ? (
                <small>{formatSyp(price)}</small>
              ) : (
                <small>{moneySecondary(price, currency, rate)}</small>
              )}
            </div>
          </header>

          {(item.options ?? []).length > 0 && (
            <div className="cx-block">
              <div className="cx-block__title">
                <strong>ابنِ طبقك</strong>
                <small>اختر الإضافات المفضلة</small>
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                {(item.options ?? []).map((group) => {
                  const single = Boolean(group.required);
                  const selectedInGroup = selected[group.id] ?? [];
                  return (
                    <fieldset
                      key={group.id}
                      className="cx-block"
                      style={{ border: "none", margin: 0, padding: 0 }}
                    >
                      <div className="cx-block__title">
                        <strong>{group.name}</strong>
                        <small>
                          {group.required
                            ? "اختيار مطلوب"
                            : selectedInGroup.length
                              ? `اخترت ${selectedInGroup.length}`
                              : "اختياري"}
                        </small>
                      </div>
                      <div className="cx-opts">
                        {group.options.map((option) => {
                          const checked = selectedInGroup.some(
                            (entry) => entry.id === option.id,
                          );
                          return (
                            <label
                              key={option.id}
                              className={`cx-opt${checked ? " is-checked" : ""}${
                                single ? " is-radio" : ""
                              }`}
                            >
                              <input
                                type={single ? "radio" : "checkbox"}
                                name={group.id}
                                checked={checked}
                                onChange={() =>
                                  toggle(group.id, option, single)
                                }
                                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                              />
                              <span className="cx-opt__dot">
                                <Check />
                              </span>
                              <span>{option.name}</span>
                              <b>
                                {option.price
                                  ? `+${money(option.price, currency, rate)}`
                                  : "أساسي"}
                              </b>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cx-block">
            <label className="cx-field">
              <span>
                ملاحظة للمطبخ
                <small>{note.length}/200</small>
              </span>
              <textarea
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: بدون بصل، الصوص جانباً…"
              />
            </label>
          </div>
        </div>

        <footer className="cx-sheet__foot">
          <div className="cx-sheet__total">
            <small>الإجمالي</small>
            <strong>{money(price, currency, rate)}</strong>
          </div>
          <button
            type="button"
            className="cx-cta cx-cta--block"
            disabled={!valid}
            onClick={() => onAdd(item, Object.values(selected).flat(), note.trim())}
          >
            <Plus />
            {valid ? "أضف إلى الطلب" : "أكمل الاختيارات المطلوبة"}
          </button>
        </footer>
      </section>
    </div>
  );
}

/* ============================================================
   CartDrawer — side sheet with quantity controls
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
      className="cx-overlay cx-drawer-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="cx-sheet cx-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="سلة الطلب"
      >
        <header className="cx-drawer__head">
          <div>
            <h2>سلة طلبك</h2>
            <p>{itemCount} صنفاً بانتظار التأكيد</p>
          </div>
          <button className="cx-close is-surface" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="cx-emptybag">
            <span className="cx-emptybag__icon">
              <ShoppingBasket />
            </span>
            <h3>سلتك ما زالت فارغة</h3>
            <p>اختر أطباقاً من القائمة وستجدها هنا.</p>
            <button type="button" className="cx-cta" onClick={onClose}>
              تصفح القائمة
            </button>
          </div>
        ) : (
          <>
            <div className="cx-drawer__lines">
              {cart.map((line) => {
                const unit =
                  line.item.price +
                  line.options.reduce((a, o) => a + o.price, 0);
                return (
                  <article className="cx-cartline" key={line.key}>
                    <img
                      className="cx-cartline__img"
                      src={line.item.image}
                      alt=""
                    />
                    <div className="cx-cartline__main">
                      <strong>{line.item.name}</strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : "بدون إضافات"}
                        {line.note ? ` — ${line.note}` : ""}
                      </small>
                      <b className="cx-cartline__price">
                        {money(unit * line.qty, currency, rate)}
                      </b>
                    </div>
                    <div className="cx-cartline__end">
                      <div className="cx-stepper">
                        <button
                          onClick={() => onQty(line.key, -1)}
                          aria-label="تقليل الكمية"
                        >
                          <Minus />
                        </button>
                        <b>{line.qty}</b>
                        <button
                          onClick={() => onQty(line.key, 1)}
                          aria-label="زيادة الكمية"
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer
              className="cx-sheet__foot"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}
            >
              <div className="cx-drawer__totalrow">
                <span>الإجمالي (قبل رسوم التوصيل)</span>
                <strong>{money(total, currency, rate)}</strong>
              </div>
              {currency === "usd" && (
                <small className="cx-drawer__usd">
                  {moneySecondary(total, currency, rate)} · سعر صرف تقديري
                </small>
              )}
              <button type="button" className="cx-cta cx-cta--block" onClick={proceed}>
                متابعة تفاصيل الطلب
                <ArrowRight className="cx-arrow" />
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

/* ============================================================
   CheckoutModal — step-by-step checkout
   ============================================================ */
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
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  settings?: RestaurantSettings;
  tableContext: PublicMenuPayload["table"];
  backendReady: boolean;
  currency: "syp" | "usd";
  rate: number;
  lines?: CartLine[];
}) {
  useOverlay(onClose);
  const missingDineInContext = mode === "dine-in" && !tableContext;
  const modeKey =
    mode === "dine-in"
      ? ("dineIn" as const)
      : mode === "takeaway"
        ? ("takeaway" as const)
        : ("delivery" as const);
  const disabledBySettings = Boolean(settings && !settings[modeKey]);

  const submitDisabled = !backendReady || missingDineInContext || disabledBySettings;

  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet cx-checkout"
        role="dialog"
        aria-modal="true"
        aria-label="إتمام الطلب"
      >
        <div
          className="cx-sheet__grab"
          aria-hidden="true"
          style={{ position: "relative", zIndex: 3 }}
        >
          <i />
        </div>

        <header className="cx-checkout__head" style={{ position: "relative" }}>
          <button
            className="cx-close is-surface"
            onClick={onClose}
            aria-label="إغلاق"
            style={{ top: 12 }}
          >
            <X />
          </button>
          <span className="cx-iden__kicker">إتمام الطلب</span>
          <h2>لنضع اللمسات الأخيرة</h2>
          <p>أكمل البيانات ثم أرسل — يصل طلبك مباشرة إلى المطبخ.</p>
        </header>

        <div
          className="cx-checkout__grid"
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <div className="cx-checkout__main">
            <div className="cx-checkout__steps" aria-hidden="true">
              {["طريقة الطلب", "بياناتك", "الدفع"].map((label, index) => (
                <span
                  className={`cx-stepdot${index === 0 ? " is-on" : ""}`}
                  key={label}
                >
                  <i>{index + 1}</i>
                  {label}
                </span>
              ))}
            </div>

            <form
              id="cx-checkout-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmit(e.currentTarget);
              }}
            >
              <section className="cx-step">
                <div className="cx-step__label">
                  <em>1</em>
                  <div>
                    <strong>كيف تريد طلبك؟</strong>
                    <small>اختر طريقة الاستلام المناسبة لك</small>
                  </div>
                </div>
                <div className="cx-modes">
                  {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => {
                    const Icon = modeIcon(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        className={`cx-mode${mode === m ? " is-on" : ""}`}
                        onClick={() => setMode(m)}
                      >
                        <Icon />
                        {modeLabels[m]}
                      </button>
                    );
                  })}
                </div>
                {disabledBySettings && (
                  <div className="cx-hintbar">هذا النوع من الطلبات غير متاح حالياً.</div>
                )}
                {mode === "dine-in" && !tableContext && !settings?.dineIn && null}
              </section>

              <section className="cx-step">
                <div className="cx-step__label">
                  <em>2</em>
                  <div>
                    <strong>إلى من نجهّزها؟</strong>
                    <small>نستخدم البيانات لتسليم طلبك فقط</small>
                  </div>
                </div>
                <div className="cx-fields">
                  <label className="cx-field">
                    <span>الاسم</span>
                    <input name="customer" required placeholder="اسمك الكريم" />
                  </label>
                  <label className="cx-field">
                    <span>رقم الهاتف</span>
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
                        <Store />
                        <span>
                          الطاولة: <strong>{tableContext.labelAr}</strong>
                          {tableContext.area ? ` — ${tableContext.area}` : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="cx-hintbar is-danger cx-field--full">
                        امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.
                      </div>
                    ))}
                  {mode === "delivery" && (
                    <label className="cx-field cx-field--full">
                      <span>العنوان بالتفصيل</span>
                      <textarea
                        name="address"
                        required
                        placeholder="الحي، الشارع، البناء، أقرب نقطة دالة…"
                      />
                    </label>
                  )}
                  {mode === "takeaway" && (
                    <label className="cx-field">
                      <span>وقت الاستلام</span>
                      <select name="pickup">
                        <option>الآن (٢٥ - ٣٥ دقيقة)</option>
                        <option>بعد ساعة</option>
                        <option>بعد ساعتين</option>
                      </select>
                    </label>
                  )}
                </div>
              </section>

              <section className="cx-step">
                <div className="cx-step__label">
                  <em>3</em>
                  <div>
                    <strong>طريقة الدفع</strong>
                    <small>اختر وسيلة الدفع المفضلة لديك</small>
                  </div>
                </div>
                <div className="cx-fields">
                  <label className="cx-field">
                    <span>طريقة الدفع</span>
                    <select name="payment">
                      <option>
                        {mode === "delivery"
                          ? "الدفع نقداً عند الاستلام"
                          : "الدفع نقداً"}
                      </option>
                      <option>Syriatel Cash</option>
                      <option>Sham Cash / BEMO</option>
                      <option>MTN Cash</option>
                    </select>
                  </label>
                  <label className="cx-field">
                    <span>
                      مرجع الحوالة
                      <small>اختياري للمحافظ</small>
                    </span>
                    <input name="paymentReference" placeholder="رقم العملية" />
                  </label>
                  {mode === "delivery" && settings?.zones.length ? (
                    <label className="cx-field cx-field--full">
                      <span>منطقة التوصيل</span>
                      <select name="zone">
                        {settings.zones
                          .filter((zone) => zone.active)
                          .map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name} — {formatSyp(zone.fee)} · حد أدنى{" "}
                              {formatSyp(zone.minimum)}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </section>
            </form>
          </div>

          <aside className="cx-checkout__aside">
            <div className="cx-aside__summary">
              <h3 className="cx-aside__title">ملخص طلبك</h3>
              <p className="cx-aside__note">
                السعر النهائي يُحتسب من المطعم عند التأكيد.
              </p>
              <div className="cx-aside__items">
                {lines?.map((line) => (
                  <div className="cx-aside__item" key={line.key}>
                    <img src={line.item.image} alt="" />
                    <div>
                      <strong>
                        {line.qty} × {line.item.name}
                      </strong>
                      <small>
                        {line.options.length
                          ? line.options.map((o) => o.name).join(" · ")
                          : ""}
                      </small>
                    </div>
                    <b>
                      {money(
                        (line.item.price +
                          line.options.reduce((a, o) => a + o.price, 0)) *
                          line.qty,
                        currency,
                        rate,
                      )}
                    </b>
                  </div>
                ))}
              </div>
              <div className="cx-aside__total">
                <span>الإجمالي</span>
                <strong>{money(total, currency, rate)}</strong>
              </div>
              <div className="cx-trust">
                <ShieldCheck />
                <span>تأكيد آمن قبل الإرسال</span>
              </div>
            </div>
          </aside>
        </div>

        <footer className="cx-sheet__foot">
          <div className="cx-sheet__total">
            <small>الإجمالي النهائي</small>
            <strong>{money(total, currency, rate)}</strong>
          </div>
          {!backendReady ? (
            <div className="cx-hintbar" style={{ flex: 1 }}>
              أنت دون اتصال — تحقق من الشبكة ثم أعد المحاولة.
            </div>
          ) : (
            <button
              type="submit"
              form="cx-checkout-form"
              className="cx-cta cx-cta--block"
              disabled={submitDisabled}
            >
              {missingDineInContext ? "امسح رمز الطاولة أولاً" : "تأكيد الطلب"}
              <ArrowRight className="cx-arrow" />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

/* ============================================================
   OrdersView — order history page
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

  const renderOrder = (order: Order) => {
    const Icon = modeIcon(order.mode);
    const qty = order.lines.reduce((a, l) => a + l.qty, 0);
    const when = new Date(order.createdAt).toLocaleDateString("ar-SY", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <button
        type="button"
        className={`cx-ordercard${activeOrders.includes(order) ? " is-active" : ""}`}
        key={order.id}
        onClick={() => onTrack(order)}
      >
        <span className="cx-ordercard__ico">
          <Icon />
        </span>
        <span className="cx-ordercard__mid">
          <strong>{order.id}</strong>
          <span>
            {modeLabels[order.mode]}
            {order.table ? ` · ${order.table}` : ""} · {qty} أصناف
          </span>
          <small>{when}</small>
        </span>
        <span className="cx-ordercard__end">
          <strong style={{ fontFamily: "var(--font-display)" }}>
            {formatSyp(order.total)}
          </strong>
          <span className={`cx-status cx-status--${statusTone(order.status)}`}>
            {statusLabels[order.status]}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="cx-wrap cx-orders">
      <header className="cx-orders__head">
        <div>
          <span className="cx-iden__kicker">دفتر طلباتك</span>
          <h1>حكاية طلباتك</h1>
          <p>كل طلب يحتفظ بوقته وتفاصيله وحالته حتى يصل إليك.</p>
        </div>
        <button type="button" className="cx-cta" onClick={onMenu}>
          <Plus />
          طلب جديد
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="cx-empty">
          <span className="cx-empty__icon">
            <ClipboardList />
          </span>
          <h3>لم تُكتب أول حكاية بعد</h3>
          <p>ابدأ بتصفح القائمة واختر ما ترغب أن يصل إلى مائدتك.</p>
          <button type="button" className="cx-cta" onClick={onMenu}>
            افتح القائمة
            <ArrowRight className="cx-arrow" />
          </button>
        </div>
      ) : (
        <div className="cx-orders__layout">
          <section className="cx-orders__list">
            {activeOrders.length > 0 && (
              <>
                <div className="cx-orders__sub">
                  <b>قيد التنفيذ الآن</b>
                  <span>{activeOrders.length} طلب</span>
                </div>
                {activeOrders.map(renderOrder)}
              </>
            )}
            {archiveOrders.length > 0 && (
              <>
                <div className="cx-orders__sub">
                  <b>الطلبات السابقة</b>
                  <span>{archiveOrders.length} طلب</span>
                </div>
                {archiveOrders.map(renderOrder)}
              </>
            )}
          </section>

          <aside className="cx-orders__side">
            <span className="cx-iden__kicker">مفتوح الآن</span>
            <h3>
              {activeOrders.length ? "هناك طلب يتحرك" : "المطبخ بانتظارك"}
            </h3>
            <p>
              {activeOrders.length
                ? "افتح أي طلب قيد التنفيذ لمشاهدة آخر تحديث من المطعم لحظة بلحظة."
                : "عد إلى القائمة وابدأ تركيبة جديدة من أطباق اليوم."}
            </p>
            <button type="button" className="cx-cta" onClick={onMenu}>
              {activeOrders.length ? "استكشف القائمة أيضاً" : "اكتب طلبك التالي"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TrackingModal — live order timeline
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

  const bannerTone = cancelled
    ? "is-bad"
    : displayOrder.status === "completed"
      ? "is-done"
      : displayOrder.status === "received"
        ? "is-received"
        : "is-active";

  const statusIcon = cancelled ? (
    <X />
  ) : displayOrder.status === "completed" ? (
    <Check />
  ) : displayOrder.mode === "delivery" ? (
    <Truck />
  ) : (
    <Utensils />
  );

  const bannerLine = cancelled
    ? "تم إلغاء الطلب من قبل المطعم."
    : displayOrder.status === "received"
      ? "تم إرسال طلبك إلى المطعم وسيُؤكد قريباً."
      : displayOrder.status === "completed"
        ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك."
        : "فريقنا يعمل على تجهيز طلبك الآن.";

  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet cx-tracking"
        role="dialog"
        aria-modal="true"
        aria-label={`تتبع الطلب ${displayOrder.id}`}
      >
        <div className="cx-sheet__grab" aria-hidden="true">
          <i />
        </div>
        <header className="cx-tracking__head">
          <div>
            <span className="cx-iden__kicker">
              {modeLabels[displayOrder.mode]} · طلب رقم {displayOrder.id}
            </span>
            <h2>{statusLabels[displayOrder.status]}</h2>
            <p>
              {formatSyp(displayOrder.total)}
              {displayOrder.table
                ? ` · ${displayOrder.table}`
                : displayOrder.address
                  ? ` · ${displayOrder.address}`
                  : ""}
            </p>
          </div>
          <button className="cx-close is-surface" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>

        <div className="cx-body-placeholder">
          <div className={`cx-statusbanner ${bannerTone}`}>
            <span className="cx-statusbanner__ico">{statusIcon}</span>
            <div>
              <strong>{statusLabels[displayOrder.status]}</strong>
              <small>{bannerLine}</small>
            </div>
          </div>

          {!cancelled && (
            <div className="cx-timeline">
              {steps.map((step, i) => (
                <div
                  key={step}
                  className={`cx-tl-node${
                    i < current
                      ? " is-done"
                      : i === current
                        ? " is-done is-now"
                        : ""
                  }`}
                >
                  <span className="cx-tl-node__dot">
                    {i < current || i === current ? <Check /> : i + 1}
                  </span>
                  <strong>{statusLabels[step]}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <section className="cx-tracking__block" style={{ flex: 1, overflowY: "auto" }}>
          <div className="cx-block__title">
            <strong>محتويات الطلب</strong>
            <small>{displayOrder.lines.length} أطباق</small>
          </div>
          {displayOrder.lines.map((line) => (
            <div className="cx-lline" key={line.key}>
              <div>
                <strong>
                  {line.qty} × {line.item.name}
                </strong>
                <small>
                  {line.options.length
                    ? line.options.map((o) => o.name).join(" · ")
                    : "بدون إضافات"}
                </small>
              </div>
              <b>
                {formatSyp(
                  (line.item.price +
                    line.options.reduce((a, o) => a + o.price, 0)) *
                    line.qty,
                )}
              </b>
            </div>
          ))}
        </section>

        <footer className="cx-tracking__foot">
          {trackingMessage && (
            <span className="cx-tracking__msg">
              <ShieldCheck />
              {trackingMessage}
            </span>
          )}
          <button
            type="button"
            className="cx-wa-btn"
            onClick={() => onWhatsApp(displayOrder)}
          >
            <ShoppingBasket />
            تواصل مع المطعم عبر واتساب
          </button>
        </footer>
      </section>
    </div>
  );
}

export { MenuView, ItemModal, CartDrawer, CheckoutModal, OrdersView, TrackingModal };
