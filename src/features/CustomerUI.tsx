import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUp, Check, ClipboardList, Globe2, LayoutDashboard, Minus, Plus, Search, ShieldCheck, ShoppingBasket, Store, Truck, Utensils, X } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "../supabase";
import { defaultCategories, formatSyp, formatUsd, images, makeItems, mapAdminOrder, modeLabels, readStored, restaurants, statusLabels, tagLabels, writeStored, type AdminOrderRow, type AuditEntry, type BusinessHour, type CartLine, type Category, type DeliveryZone, type Item, type MenuCategory, type Mode, type OperationsState, type Option, type OptionGroup, type Order, type PublicMenuPayload, type Restaurant, type RestaurantMembership, type RestaurantSettings, type RestaurantTable, type StaffMember, type StaffRole, type Tag, type View } from "../domain";

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
  const featured = items[0] ?? restaurant.items[0];
  const secondary = items.slice(1, 3);

  const heroImage = featured?.image ?? items[0]?.image ?? images.mezze;

  return (
    <div className="menu-view">
      {/* Hero — full-screen food photography with dark overlay */}
      <section className="hero">
        <div className="hero__bg" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true" />
        <div className="float-deco float-deco--basil" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <path d="M100 200C60 160 50 120 60 80C70 120 100 140 100 200Z" fill="#5a8f4e" opacity="0.5" />
            <path d="M100 200C140 160 150 120 140 80C130 120 100 140 100 200Z" fill="#6aa05a" opacity="0.4" />
            <path d="M100 190C95 170 95 150 100 130C105 150 105 170 100 190Z" fill="#7ab369" opacity="0.6" />
          </svg>
        </div>
        <div className="float-deco float-deco--spice" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="60" cy="60" r="5" fill="#c8a951" opacity="0.7" />
            <circle cx="80" cy="50" r="4" fill="#d4a843" opacity="0.5" />
            <circle cx="52" cy="78" r="4" fill="#c8a951" opacity="0.4" />
            <circle cx="95" cy="72" r="3" fill="#e8cc82" opacity="0.6" />
            <circle cx="44" cy="50" r="3" fill="#a8863a" opacity="0.5" />
          </svg>
        </div>
        <div className="hero__content">
          <span className="hero__eyebrow">
            <i />
            {restaurant.city} · {restaurant.neighborhood}
          </span>
          <p className="hero__script">من القائمة إلى طاولتك</p>
          <h1 className="hero__title">
            {restaurant.name}
          </h1>
          <p className="hero__subtitle">{restaurant.subtitle}</p>
          <p className="hero__desc">
            تصفّح القائمة واختر أطباقك وأضفها للطلب — كل ما تطلبونه يصل مباشرة إلى المطبخ.
          </p>
          <div className="hero__cta">
            <button
              className="btn btn--gold"
              onClick={() =>
                document
                  .getElementById("menu-catalogue")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              تصفح القائمة
              <ArrowRight />
            </button>
            <button
              className="btn btn--outline"
              onClick={() => onSelect(featured)}
            >
              اقتراح اليوم
            </button>
          </div>
          <div className="hero__stats">
            <span className="hero__stat">
              <strong>{restaurant.items.length}</strong>
              <small>صنفاً في القائمة</small>
            </span>
            <span className="hero__stat">
              <strong>{categories.length}</strong>
              <small>قسماً مختاراً بعناية</small>
            </span>
            <span className="hero__stat">
              <strong>{restaurant.neighborhood}</strong>
              <small>في قلب {restaurant.city}</small>
            </span>
          </div>
        </div>
        {featured && (
          <button className="hero__featured" onClick={() => onSelect(featured)}>
            <span className="hero__featured-media">
              <img src={featured.image} alt={featured.name} loading="lazy" />
            </span>
            <span className="hero__featured-body">
              <small className="hero__featured-kicker">طبق الغلاف · اقتراح اليوم</small>
              <strong className="hero__featured-name">{featured.name}</strong>
              <span className="hero__featured-desc">{featured.desc}</span>
              <span className="hero__featured-foot">
                <b className="hero__featured-price">{formatSyp(featured.price)}</b>
                <em className="hero__featured-open">افتح التفاصيل <ArrowRight /></em>
              </span>
            </span>
          </button>
        )}
      </section>

      {/* Search + currency index */}
      <section className="section section--alt" aria-label="فهرس القائمة">
        <div className="menu-index">
          <div className="menu-index__title">
            <span className="section-kicker">الفهرس</span>
            <h2>اختَر إيقاع وجبتك اليوم</h2>
          </div>
          <div className="menu-index__search">
            <label>
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اسم طبق، مكوّن، أو مزاج…"
              />
            </label>
            <small className="menu-index__count">{items.length} صنفاً مطابقاً</small>
          </div>
          <div className="menu-index__currency">
            <small>عرض الأسعار</small>
            <div className="currency-toggle">
              <button
                className={currency === "syp" ? "active" : ""}
                onClick={() => setCurrency("syp")}
              >
                ليرة سورية
              </button>
              <button
                className={currency === "usd" ? "active" : ""}
                onClick={() => setCurrency("usd")}
              >
                دولار
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true">
        <span>✦</span>
      </div>

      {/* Category pills */}
      <section className="section section--carded categories" id="menu-catalogue">
        <div className="categories__heading">
          <span className="section-kicker">تصفح الأقسام</span>
          <strong>{category === "كل الأصناف" ? "القائمة كاملة" : category}</strong>
        </div>
        <div className="pills">
          {["كل الأصناف", "الأكثر طلباً", ...categories.map((entry) => entry.name)].map(
            (entry) => (
              <button
                key={entry}
                className={`pill${category === entry ? " pill--active" : ""}`}
                onClick={() => setCategory(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <div className="tag-row">
          <span>اختيارات المطبخ:</span>
          <button
            className={`pill${tag === "all" ? " pill--active" : ""}`}
            onClick={() => setTag("all")}
          >
            الكل
          </button>
          <button
            className={`pill${tag === "vegetarian" ? " pill--active" : ""}`}
            onClick={() => setTag("vegetarian")}
          >
            نباتي
          </button>
          <button
            className={`pill${tag === "chef" ? " pill--active" : ""}`}
            onClick={() => setTag("chef")}
          >
            اختيار الشيف
          </button>
        </div>
      </section>

      {/* Menu grid */}
      <section className="section menu">
        <div className="menu__head">
          <div>
            <span className="section-script">المطبخ اليوم</span>
            <h2 className="section-title">
              {category === "كل الأصناف" ? <em>كل الأطباق</em> : <em>{category}</em>}
            </h2>
            <p className="menu__head-note">اضغط على أي طبق لتختار الحجم والإضافات.</p>
          </div>
          <span className="menu__count">{items.length} صنفاً</span>
        </div>

        <div className="menu__grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
              <div className="menu-card menu-card--skeleton" key={index} aria-hidden="true">
                <div className="menu-card__media menu-skeleton__media" />
                <div className="menu-card__body">
                  <div className="menu-skeleton__line menu-skeleton__line--title" />
                  <div className="menu-skeleton__line menu-skeleton__line--text" />
                  <div className="menu-skeleton__line menu-skeleton__line--text-short" />
                  <div className="menu-skeleton__line menu-skeleton__line--btn" />
                </div>
              </div>
            ))
            : items.map((item) => {
              const needsChoice = (item.options ?? []).some((group) => group.required);
              return (
                <article className="menu-card" key={item.id}>
                  <button
                    className="menu-card__media"
                    onClick={() => onSelect(item)}
                    aria-label={`تفاصيل ${item.name}`}
                  >
                    <img
                      className="menu-card__img"
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                    />
                    {item.popular && (
                      <span className="menu-card__badge">الأكثر طلباً</span>
                    )}
                  </button>
                  <div className="menu-card__body">
                    <div className="menu-card__title-row">
                      <h3 className="menu-card__name">
                        {item.name}
                        <small className="menu-card__en">{item.en}</small>
                      </h3>
                      <span className="menu-card__price">
                        {currency === "usd" ? formatUsd(item.price, restaurant.rate) : formatSyp(item.price)}
                      </span>
                    </div>
                    <p className="menu-card__desc">{item.desc}</p>
                    {item.tags.length > 0 && (
                      <div className="menu-card__tags">
                        {item.tags.map((t) => (
                          <small className="menu-card__tag" key={t}>
                            {tagLabels[t]}
                          </small>
                        ))}
                      </div>
                    )}
                    <div className="menu-card__actions">
                      {needsChoice ? (
                        <button
                          className="menu-card__btn menu-card__btn--details"
                          onClick={() => onSelect(item)}
                        >
                          اختر الحجم والإضافات
                          <ArrowRight />
                        </button>
                      ) : (
                        <button
                          className="menu-card__btn menu-card__btn--add"
                          onClick={() => onQuickAdd(item)}
                        >
                          <Plus />
                          أضف إلى الطلب
                          {currency === "usd"
                            ? formatUsd(item.price, restaurant.rate)
                            : formatSyp(item.price)}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        {secondary.length > 0 && (
          <aside className="side-suggestion">
            <span>من نفس المائدة</span>
            <strong>{secondary.map((item) => item.name).join(" · ")}</strong>
            <p>تشكيلة صغيرة تكمل اختيارك، وتصلح للمشاركة.</p>
          </aside>
        )}
        {items.length === 0 && (
          <div className="empty-state">
            <h3>لم نجد صنفاً مطابقاً</h3>
            <p>جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً.</p>
            <button className="btn btn--outline" onClick={() => setQuery("")}>
              مسح البحث
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

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
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [note, setNote] = useState("");
  const valid = !item.options?.some(
    (group) => group.required && !selected[group.id]?.length,
  );
  const extra = Object.values(selected)
    .flat()
    .reduce((sum, option) => sum + option.price, 0);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal item-modal"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
      >
        <aside className="item-modal__media">
          <img src={item.image} alt={item.name} />
          <span className="item-modal__cat">{item.category}</span>
        </aside>
        <button className="modal__close" onClick={onClose} aria-label="إغلاق">
          <X />
        </button>
        <div className="item-modal__content">
          <header className="item-modal__head">
            <span className="kicker">بطاقة الطبق / {item.en}</span>
            <h2>{item.name}</h2>
            <p>{item.desc}</p>
            <div className="item-modal__price">
              <strong>{formatSyp(item.price + extra)}</strong>
              {currency === "usd" && (
                <small>≈ {formatUsd(item.price + extra, rate)} USD</small>
              )}
            </div>
          </header>

          <div>
            <span className="section-kicker">ابنِ طبقك</span>
            <small style={{ color: "var(--text-faint)", display: "block" }}>
              اختياراتك تحفظ مع الطلب
            </small>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {item.options?.map((group) => (
              <fieldset className="option-group" key={group.id}>
                <legend>
                  <strong>{group.name}</strong>
                  {group.required && <small>اختيار مطلوب</small>}
                </legend>
                <div className="option-group__list">
                  {group.options.map((option) => {
                    const checked = selected[group.id]?.some(
                      (entry) => entry.id === option.id,
                    );
                    return (
                      <label
                        key={option.id}
                        className={`option-row${checked ? " has-check" : ""}`}
                      >
                        <input
                          type={group.required ? "radio" : "checkbox"}
                          name={group.id}
                          checked={checked}
                          onChange={() =>
                            setSelected((current) => {
                              const existing = current[group.id] ?? [];
                              const next = group.required
                                ? [option]
                                : existing.some((entry) => entry.id === option.id)
                                  ? existing.filter((entry) => entry.id !== option.id)
                                  : [...existing, option];
                              return { ...current, [group.id]: next };
                            })
                          }
                        />
                        <span>{option.name}</span>
                        <b>{option.price ? `+${formatSyp(option.price)}` : "أساسي"}</b>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <label className="note-field">
            <span>
              ملاحظة للمطبخ <small>اختياري</small>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: بدون بصل، الصوص جانباً..."
            />
          </label>

          <div className="item-modal__addbar">
            <button
              className="btn btn--gold"
              disabled={!valid}
              onClick={() => onAdd(item, Object.values(selected).flat(), note)}
            >
              <Plus />
              أضف إلى الطلب
              <strong>{formatSyp(item.price + extra)}</strong>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

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
  const itemCount = cart.reduce((a, l) => a + l.qty, 0);
  return (
    <div
      className="modal-backdrop cart-drawer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="modal cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="كشف الطلب"
      >
        <header className="cart-drawer__head">
          <div>
            <span className="kicker">ورقة الطلب / قيد التجهيز</span>
            <h2>
              مائدتك <b>{itemCount}</b>
            </h2>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBasket />
            <h3>لم تبدأ مائدتك بعد</h3>
            <p>اختر طبقاً من الفهرس وسنضعه هنا.</p>
            <button className="btn btn--outline" onClick={onClose}>
              العودة إلى القائمة
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 26px 0" }}>
              <span className="section-kicker">ملخص الاختيارات</span>
              <small style={{ color: "var(--text-faint)", display: "block" }}>
                راجع الإضافات والكمية قبل المتابعة
              </small>
            </div>
            <div className="cart-drawer__lines">
              {cart.map((line, index) => (
                <article className="cart-line" key={line.key}>
                  <span className="cart-line__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <img className="cart-line__img" src={line.item.image} alt="" />
                  <div className="cart-line__info">
                    <strong>{line.item.name}</strong>
                    <small>
                      {line.options.map((o) => o.name).join("، ") || "بدون إضافات"}
                    </small>
                    <b>
                      {formatSyp(
                        (line.item.price +
                          line.options.reduce((a, o) => a + o.price, 0)) *
                        line.qty,
                      )}
                    </b>
                  </div>
                  <div className="cart-line__qty">
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
                </article>
              ))}
            </div>
            <footer className="cart-drawer__foot">
              <div className="cart-drawer__total">
                <span className="section-kicker">المجموع قبل رسوم التسليم</span>
                <strong>{formatSyp(total)}</strong>
              </div>
              {currency === "usd" && (
                <small>≈ {formatUsd(total, rate)} USD بسعر صرف تقريبي</small>
              )}
              <button
                className="btn btn--gold cart-drawer__checkout"
                onClick={onCheckout}
              >
                انتقل إلى تفاصيل الطلب
                <ArrowRight />
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function CheckoutModal({
  total,
  mode,
  setMode,
  onClose,
  onSubmit,
  settings,
  tableContext,
  backendReady,
}: {
  total: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  settings?: RestaurantSettings;
  tableContext: PublicMenuPayload["table"];
  backendReady: boolean;
}) {
  const missingDineInContext = mode === "dine-in" && !tableContext;
  return (
    <div className="modal-backdrop">
      <section className="modal checkout-modal" role="dialog" aria-modal="true">
        <header className="checkout-modal__head">
          <div>
            <span className="section-kicker">إتمام الطلب</span>
            <h2>لنضع اللمسات الأخيرة</h2>
            <p>ثلاث خطوات قصيرة، ثم يصل طلبك إلى المطبخ.</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        <div className="checkout-body">
          <div className="checkout-form">
            <div className="step">
              <div className="step__head">
                <span className="step__num">01</span>
                <div>
                  <strong>كيف تريد طلبك؟</strong>
                  <small>اختر طريقة الاستلام المناسبة</small>
                </div>
              </div>
              <div className="mode-select">
                {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "active" : ""}
                    onClick={() => setMode(m)}
                  >
                    {m === "dine-in" ? (
                      <Store />
                    ) : m === "takeaway" ? (
                      <ShoppingBasket />
                    ) : (
                      <Truck />
                    )}
                    {m === "dine-in"
                      ? "في المطعم"
                      : m === "takeaway"
                        ? "سفري"
                        : "توصيل"}
                  </button>
                ))}
              </div>
              {settings &&
                !settings[
                mode === "dine-in"
                  ? "dineIn"
                  : mode === "takeaway"
                    ? "takeaway"
                    : "delivery"
                ] && (
                  <div className="warn-note" style={{ marginTop: "12px" }}>
                    هذا النوع من الطلبات غير متاح حالياً.
                  </div>
                )}
            </div>

            <form
              className="checkout-form"
              style={{ padding: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmit(e.currentTarget);
              }}
            >
              <div className="step">
                <div className="step__head">
                  <span className="step__num">02</span>
                  <div>
                    <strong>إلى من نجهزها؟</strong>
                    <small>نستخدمها لتسليم الطلب فقط</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>الاسم</span>
                    <input name="customer" required placeholder="اسمك الكريم" />
                  </label>
                  <label className="form-field">
                    <span>رقم الهاتف</span>
                    <input
                      name="phone"
                      required={mode !== "dine-in"}
                      placeholder="09XXXXXXXX"
                    />
                  </label>
                  {mode === "dine-in" &&
                    (tableContext ? (
                      <div className="table-chip">
                        الطاولة: <strong>{tableContext.labelAr}</strong>
                        {tableContext.area ? ` — ${tableContext.area}` : ""}
                      </div>
                    ) : (
                      <div className="warn-note form-grid--full">
                        امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.
                      </div>
                    ))}
                  {mode === "delivery" && (
                    <label className="form-field form-grid--full">
                      <span>العنوان بالتفصيل</span>
                      <textarea
                        name="address"
                        required
                        placeholder="الحي، الشارع، البناء، أقرب نقطة دالة"
                      />
                    </label>
                  )}
                  {mode === "takeaway" && (
                    <label className="form-field">
                      <span>وقت الاستلام</span>
                      <select name="pickup">
                        <option>الآن (25 - 35 دقيقة)</option>
                        <option>بعد ساعة</option>
                        <option>غداً الساعة 1:00 م</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              <div className="step">
                <div className="step__head">
                  <span className="step__num">03</span>
                  <div>
                    <strong>طريقة الدفع</strong>
                    <small>اختر وسيلة الدفع المفضلة</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="form-field">
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
                  <label className="form-field">
                    <span>
                      مرجع الحوالة <small>(اختياري للمحافظ الإلكترونية)</small>
                    </span>
                    <input
                      name="paymentReference"
                      placeholder="رقم العملية أو اسم المرسل"
                    />
                  </label>
                  {mode === "delivery" && settings?.zones.length ? (
                    <label className="form-field">
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
              </div>

              <div className="checkout-total">
                <span>الإجمالي</span>
                <strong>{formatSyp(total)}</strong>
              </div>
              {mode === "delivery" && settings?.zones.length ? (
                <small style={{ color: "var(--text-faint)" }}>
                  تطبق أجرة التوصيل والحد الأدنى حسب المنطقة التي يحددها المطعم.
                </small>
              ) : null}
              <button
                className="btn btn--gold"
                type="submit"
                disabled={
                  !backendReady ||
                  missingDineInContext ||
                  Boolean(
                    settings &&
                    !settings[
                    mode === "dine-in"
                      ? "dineIn"
                      : mode === "takeaway"
                        ? "takeaway"
                        : "delivery"
                    ],
                  )
                }
              >
                تأكيد الطلب
                <ArrowRight />
              </button>
            </form>
          </div>

          <aside className="checkout-aside">
            <span className="section-kicker">ملخص الحساب</span>
            <h3>مائدتك جاهزة</h3>
            <div className="sum-row">
              <small>الإجمالي المبدئي</small>
              <strong>{formatSyp(total)}</strong>
            </div>
            <p>تظهر رسوم التوصيل أو أي تعديل نهائي بعد مراجعة المطعم.</p>
            <div className="trust-note">
              <ShieldCheck />
              <span>تأكيد آمن قبل الإرسال</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function OrdersView({
  orders,
  onTrack,
  onMenu,
}: {
  orders: Order[];
  onTrack: (o: Order) => void;
  onMenu: () => void;
}) {
  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  return (
    <div className="section orders">
      <header className="orders__head">
        <div>
          <span className="section-kicker">دفتر المائدة / متابعة مباشرة</span>
          <h1 className="section-title">حكاية طلباتك</h1>
          <p className="section-sub">
            كل طلب يحتفظ بوقته، تفاصيله، وحالته حتى يصل إليك.
          </p>
        </div>
        <div className="orders__count">
          <strong>{orders.length}</strong>
          <small>طلبات محفوظة</small>
        </div>
        <button className="btn btn--gold" onClick={onMenu}>
          ابدأ طلباً جديداً
          <ArrowRight />
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="section-script">الفصل الأول</span>
          <h3>لم تُكتب أول حكاية بعد</h3>
          <p>ابدأ بتصفح القائمة، واختر ما ترغب أن يصل إلى مائدتك.</p>
          <button className="btn btn--outline" onClick={onMenu}>
            افتح القائمة
          </button>
        </div>
      ) : (
        <div className="orders__layout">
          <section className="orders__list">
            <div style={{ marginBottom: "16px" }}>
              <span className="section-kicker">أرشيف الطلبات</span>
              <small style={{ color: "var(--text-faint)", display: "block" }}>
                {activeOrders.length} قيد المتابعة الآن
              </small>
            </div>
            {orders.map((order, index) => (
              <button
                className="order-row"
                key={order.id}
                onClick={() => onTrack(order)}
              >
                <span className="order-row__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="order-row__mid">
                  <strong>{order.id}</strong>
                  <span>
                    {modeLabels[order.mode]} ·{" "}
                    {order.lines.reduce((a, l) => a + l.qty, 0)} أصناف
                  </span>
                  <small>
                    {new Date(order.createdAt).toLocaleDateString("ar-SY", {
                      day: "numeric",
                      month: "long",
                    })}
                    ،{" "}
                    {new Date(order.createdAt).toLocaleTimeString("ar-SY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <span className="order-row__end">
                  <strong>{formatSyp(order.total)}</strong>
                  <small>{statusLabels[order.status]}</small>
                  <span className="order-row__go">عرض التفاصيل</span>
                </span>
              </button>
            ))}
          </section>

          <aside className="orders__side">
            <span className="section-kicker">مفتوح الآن</span>
            <h3>
              {activeOrders.length ? "هناك طلب يتحرك" : "المطبخ بانتظارك"}
            </h3>
            <p>
              {activeOrders.length
                ? "افتح أي طلب قيد التنفيذ لمشاهدة آخر تحديث من المطعم."
                : "عد إلى القائمة وابدأ تركيبة جديدة من أطباق اليوم."}
            </p>
            <button
              className="btn btn--outline"
              onClick={onMenu}
            >
              {activeOrders.length ? "استكشف القائمة أيضاً" : "اكتب طلبك التالي"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}


function TrackingModal({
  order,
  onClose,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onWhatsApp: (o: Order) => void;
}) {
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
        setTrackingMessage("تعذر تحديث الحالة الآن — سنحاول مجدداً تلقائياً.");
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
  const steps: Order["status"][] = [
    "received",
    "preparing",
    "ready",
    displayOrder.mode === "delivery" ? "out-for-delivery" : "completed",
  ];
  const current = steps.indexOf(displayOrder.status);
  return (
    <div className="modal-backdrop">
      <section
        className="modal tracking-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`تتبع الطلب ${displayOrder.id}`}
      >
        <header className="tracking__head">
          <div>
            <span className="kicker">سجل الطلب / {modeLabels[displayOrder.mode]}</span>
            <h2>{displayOrder.id}</h2>
            <p>
              {formatSyp(displayOrder.total)} ·{" "}
              {displayOrder.table || displayOrder.address || "طلب خارجي"}
            </p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>

        <div className="tracking__status-banner">
          <small>الحالة الحالية</small>
          <strong>{statusLabels[displayOrder.status]}</strong>
          <p>
            {displayOrder.status === "received"
              ? "تم إرسال طلبك إلى المطعم، سيتم تأكيده قريباً."
              : displayOrder.status === "completed"
                ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك."
                : "فريقنا يعمل على تجهيز طلبك الآن."}
          </p>
        </div>

        <div className="tracking__steps">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`tracking__step${i < current
                ? " tracking__step--done"
                : i === current
                  ? " tracking__step--current"
                  : ""
                }`}
            >
              <i>{i < current ? <Check /> : i + 1}</i>
              <strong>{statusLabels[step]}</strong>
              <small>
                {i < current ? "اكتملت" : i === current ? "نحن هنا الآن" : "في انتظارها"}
              </small>
            </div>
          ))}
        </div>

        <section className="tracking__lines">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}>
            <span className="section-kicker">محتويات الطلب</span>
            <small style={{ color: "var(--text-faint)", display: "block" }}>
              {displayOrder.lines.length} أطباق
            </small>
          </div>
          {displayOrder.lines.map((line) => (
            <div className="tracking__line" key={line.key}>
              <span>{line.qty} ×</span>
              <div>
                <strong>{line.item.name}</strong>
                <small>
                  {line.options.map((option) => option.name).join("، ") || "بدون إضافات"}
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

        <div className="tracking__foot">
          {trackingMessage && <span className="tracking__msg">{trackingMessage}</span>}
          <button
            className="btn btn--outline"
            onClick={() => onWhatsApp(displayOrder)}
          >
            تواصل مع المطعم عبر واتساب
          </button>
        </div>
      </section>
    </div>
  );
}


export { MenuView, ItemModal, CartDrawer, CheckoutModal, OrdersView, TrackingModal };
