import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import {
  Button,
  IconButton,
  FoodPhoto,
  SectionTitle,
  EmptyState,
  DialogHeader,
  ActionArrow,
} from "../../components/AppKit";
import { useCustomerText } from "../customerText";
import { useCafe } from "../../context/Cafe";
import { supabase } from "../../supabase";
import {
  readStored,
  writeStored,
  formatSyp,
  modeLabels,
  statusLabels,
  type Restaurant,
  type MenuCategory,
  type Category,
  type Tag,
  type Item,
  type Option,
  type CartLine,
  type Order,
} from "../../domain";
import { useOverlay, money, Stepper } from "./core";

type MenuProps = {
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
};
export function MenuView({
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
}: MenuProps) {
  const { language, t } = useCustomerText();
  const en = language === "en";
  const tr = (a: string, b: string) => (en ? b : a);
  const cafe = useCafe();
  const key = `syrianqr-favourites-${restaurant.id}`;
  const [saved, setSaved] = useState<string[]>(() => {
    const v = readStored<unknown>(key, []);
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : [];
  });
  const [onlySaved, setOnlySaved] = useState(false);
  const [filters, setFilters] = useState(false);
  const save = (id: string) =>
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      writeStored(key, next);
      return next;
    });
  const listed = onlySaved ? items.filter((i) => saved.includes(i.id)) : items;
  const categoryName = (name: string) =>
    name === "كل الأصناف"
      ? tr("الكل", "All dishes")
      : name === "الأكثر طلباً"
        ? tr("الأكثر طلباً", "Popular")
        : en
          ? categories.find((c) => c.name === name)?.en || name
          : name;
  return (
    <div className="experience-menu">
      <section className="restaurant-profile">
        <FoodPhoto
          src={
            restaurant.design?.content.coverUrl ||
            restaurant.items.find((i) => i.image)?.image ||
            "/images/syrian-table-hero.webp"
          }
          alt=""
          priority
          className="restaurant-profile__cover"
        />
        <div className="restaurant-profile__body">
          <span className="restaurant-profile__logo">
            {restaurant.design?.content.logoUrl ? (
              <img src={restaurant.design.content.logoUrl} alt="" />
            ) : (
              <Utensils size={24} />
            )}
          </span>
          <div>
            <span className="ui-eyebrow">
              {tr("أهلاً على سُفرتنا", "WELCOME TO YOUR TABLE")}
            </span>
            <h1>
              {en ? restaurant.nameEn || restaurant.name : restaurant.name}
            </h1>
            <p>
              {en
                ? restaurant.subtitleEn || restaurant.subtitle
                : restaurant.subtitle}
            </p>
            <small>
              <MapPin size={13} />
              {[restaurant.neighborhood, restaurant.city]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
        </div>
      </section>
      {(restaurant.phone ||
        restaurant.whatsapp ||
        restaurant.design?.content.hoursText ||
        restaurant.design?.content.footerText ||
        restaurant.design?.content.instagram ||
        restaurant.design?.content.facebook) && (
        <details className="restaurant-about">
          <summary>
            {tr("معلومات المطعم والتواصل", "Restaurant information & contact")}
            <Plus size={14} />
          </summary>
          {restaurant.design?.content.hoursText && (
            <p>{restaurant.design.content.hoursText}</p>
          )}
          {restaurant.design?.content.footerText && (
            <p>{restaurant.design.content.footerText}</p>
          )}
          <div>
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}>
                {tr("اتصل بالمطعم", "Call restaurant")}
              </a>
            )}
            {restaurant.design?.content.instagram && (
              <a
                href={
                  restaurant.design.content.instagram.startsWith("https://")
                    ? restaurant.design.content.instagram
                    : `https://${restaurant.design.content.instagram}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            )}
            {restaurant.design?.content.facebook && (
              <a
                href={
                  restaurant.design.content.facebook.startsWith("https://")
                    ? restaurant.design.content.facebook
                    : `https://${restaurant.design.content.facebook}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            )}
            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            )}
          </div>
        </details>
      )}
      {restaurant.design?.content.bannerOn &&
        restaurant.design.content.bannerText && (
          <p className="restaurant-notice" role="status">
            {restaurant.design.content.bannerText}
          </p>
        )}
      <section className="menu-discovery">
        <SectionTitle
          title={tr("شو عبالك اليوم؟", "What are you craving?")}
          action={
            <IconButton
              label={tr("خيارات البحث", "Menu filters")}
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={19} />
            </IconButton>
          }
        />
        <div className="menu-search-row">
          <label className="cx-search">
            <Search size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ابحث عن طبق أو مكوّن…")}
              aria-label={t("ابحث في القائمة")}
            />
            {query && (
              <IconButton label={t("مسح البحث")} onClick={() => setQuery("")}>
                <X size={17} />
              </IconButton>
            )}
          </label>
          <button
            aria-label={tr("الأطباق المحفوظة", "Saved dishes")}
            className={`saved-toggle${onlySaved ? " is-on" : ""}`}
            aria-pressed={onlySaved}
            onClick={() => setOnlySaved(!onlySaved)}
          >
            <Heart size={19} />
            <span>{tr("المحفوظات", "Saved")}</span>
            {saved.length > 0 && <b>{saved.length}</b>}
          </button>
        </div>
        {filters && (
          <div className="menu-filter-panel">
            <div role="group" aria-label={tr("تصفية الأطباق", "Filter dishes")}>
              <Button
                variant={tag === "all" ? "primary" : "soft"}
                onClick={() => setTag("all")}
              >
                {t("الكل")}
              </Button>
              <Button
                variant={tag === "vegetarian" ? "primary" : "soft"}
                onClick={() =>
                  setTag(tag === "vegetarian" ? "all" : "vegetarian")
                }
              >
                <Leaf size={15} />
                {tr("نباتي", "Vegetarian")}
              </Button>
              <Button
                variant={tag === "chef" ? "primary" : "soft"}
                onClick={() => setTag(tag === "chef" ? "all" : "chef")}
              >
                {tr("اختيار الشيف", "Chef’s choice")}
              </Button>
            </div>
            <div role="group" aria-label={tr("العملة", "Currency")}>
              <button
                onClick={() => setCurrency("syp")}
                aria-pressed={currency === "syp"}
              >
                SYP
              </button>
              <button
                onClick={() => setCurrency("usd")}
                aria-pressed={currency === "usd"}
              >
                USD
              </button>
            </div>
          </div>
        )}
        <nav className="cx-cats" aria-label={t("تصفح أقسام القائمة")}>
          {["كل الأصناف", "الأكثر طلباً", ...categories.map((c) => c.name)].map(
            (entry, index) => (
              <button
                key={entry}
                className={`cx-cat${category === entry ? " is-on" : ""}`}
                aria-pressed={category === entry}
                onClick={() => setCategory(entry)}
              >
                <span className="category-symbol">
                  {index === 0 ? (
                    <Utensils size={19} />
                  ) : index === 1 ? (
                    <Heart size={19} />
                  ) : (
                    <ReceiptText size={19} />
                  )}
                </span>
                {categoryName(entry)}
              </button>
            ),
          )}
        </nav>
      </section>
      <section id="cx-catalogue" className="menu-catalogue">
        <SectionTitle
          title={
            onlySaved
              ? tr("أطباقك المحفوظة", "Your saved dishes")
              : categoryName(category)
          }
          action={
            <span className="menu-count">
              {listed.length} {tr("أطباق", "dishes")}
            </span>
          }
        />
        {loadError ? (
          <EmptyState
            icon={<RefreshCw />}
            title={t("تعذر تحميل القائمة")}
            description={loadError}
            action={<Button onClick={onRetry}>{t("حاول مرة أخرى")}</Button>}
          />
        ) : loading ? (
          <div className="cx-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="food-skeleton" aria-hidden="true" />
            ))}
          </div>
        ) : listed.length === 0 ? (
          <EmptyState
            icon={onlySaved ? <Heart /> : <Search />}
            title={
              onlySaved
                ? tr("احفظ أول طبق بتحبّه", "Make room for your favourites")
                : t("لم نجد صنفاً مطابقاً")
            }
            description={
              onlySaved
                ? tr(
                    "اضغط القلب على أي طبق لتلاقيه هون.",
                    "Tap the heart on any dish to keep it here.",
                  )
                : t("جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً من القائمة.")
            }
            action={
              <Button
                onClick={() => {
                  setOnlySaved(false);
                  setQuery("");
                  setTag("all");
                  setCategory("كل الأصناف");
                }}
              >
                {t("عرض كل الأصناف")}
              </Button>
            }
          />
        ) : (
          <div className="cx-grid">
            {listed.map((item) => (
              <article className="cx-dish" key={item.id}>
                <div className="product-photo">
                  <button
                    className="cx-dish__media"
                    onClick={() => onSelect(item)}
                    aria-label={
                      en
                        ? `Details for ${item.en || item.name}`
                        : `تفاصيل ${item.name}`
                    }
                  >
                    <FoodPhoto
                      src={item.image}
                      alt={en ? item.en || item.name : item.name}
                    />
                  </button>
                  <IconButton
                    label={
                      saved.includes(item.id)
                        ? tr("إزالة من المحفوظات", "Unsave dish")
                        : tr("حفظ الطبق", "Save dish")
                    }
                    aria-pressed={saved.includes(item.id)}
                    className={`product-save${saved.includes(item.id) ? " is-on" : ""}`}
                    onClick={() => save(item.id)}
                  >
                    <Heart size={18} />
                  </IconButton>
                  {item.popular && (
                    <span className="product-label">
                      {tr("الأكثر طلباً", "Popular")}
                    </span>
                  )}
                </div>
                <div className="product-info">
                  <button
                    className="cx-dish__name"
                    onClick={() => onSelect(item)}
                  >
                    {en ? item.en || item.name : item.name}
                  </button>
                  <p>{en ? item.descEn || item.desc : item.desc}</p>
                  <div className="product-bottom">
                    <strong>
                      {money(item.price, currency, restaurant.rate, language)}
                    </strong>
                    <IconButton
                      className="cx-add"
                      label={
                        en
                          ? `Add ${item.en || item.name} to order`
                          : `أضف ${item.name} إلى الطلب`
                      }
                      onClick={() =>
                        item.options?.length ? onSelect(item) : onQuickAdd(item)
                      }
                    >
                      <Plus size={21} />
                    </IconButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="menu-footer">
        <Utensils size={17} />
        <span>
          {tr(
            "اطلب على ذوقك. بالهناء والشفاء!",
            "Your order, your way. Enjoy every bite.",
          )}
        </span>
        <a href="/">SYRIAN QR</a>
      </footer>
    </div>
  );
}

export function ItemModal({
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
  const { language, t } = useCustomerText();
  const en = language === "en";
  const tr = (a: string, b: string) => (en ? b : a);
  useOverlay(onClose);
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const options = Object.values(selected).flat();
  const valid = !(item.options || []).some(
    (g) =>
      (selected[g.id]?.length || 0) <
        (g.minSelections ?? (g.required ? 1 : 0)) ||
      (selected[g.id]?.length || 0) > (g.maxSelections ?? g.options.length),
  );
  const unit = item.price + options.reduce((a, o) => a + o.price, 0);
  const choose = (
    group: NonNullable<Item["options"]>[number],
    option: Option,
  ) =>
    setSelected((cur) => {
      const old = cur[group.id] || [];
      const single =
        (group.maxSelections ?? (group.required ? 1 : group.options.length)) ===
        1;
      return {
        ...cur,
        [group.id]: single
          ? [option]
          : old.some((o) => o.id === option.id)
            ? old.filter((o) => o.id !== option.id)
            : [...old, option],
      };
    });
  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.currentTarget === e.target && onClose()}
    >
      <section
        className="cx-sheet cx-sheet--item product-detail"
        role="dialog"
        aria-modal="true"
        aria-label={en ? item.en || item.name : item.name}
      >
        <DialogHeader
          title={tr("تفاصيل الطبق", "Make it yours")}
          onClose={onClose}
          closeLabel={t("إغلاق")}
        />
        <div className="product-detail__scroll">
          <FoodPhoto
            src={item.image}
            alt={en ? item.en || item.name : item.name}
            className="product-detail__image"
          />
          <div className="product-detail__content">
            <span className="ui-eyebrow">{item.category}</span>
            <div className="product-detail__title">
              <h2>{en ? item.en || item.name : item.name}</h2>
              <strong>{money(item.price, currency, rate, language)}</strong>
            </div>
            <p>{en ? item.descEn || item.desc : item.desc}</p>
            {(item.options || []).map((g) => (
              <fieldset className="product-options cx-group" key={g.id}>
                <legend>
                  <b>{en ? g.en || g.name : g.name}</b>
                  <small>
                    {(g.minSelections ?? (g.required ? 1 : 0)) > 0
                      ? tr("مطلوب", "Required")
                      : tr("اختياري", "Optional")}
                  </small>
                </legend>
                {g.options.map((o) => {
                  const on = (selected[g.id] || []).some((x) => x.id === o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`cx-pick${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => choose(g, o)}
                    >
                      <span className="choice-indicator">
                        {on && <Check size={13} />}
                      </span>
                      <span>{en ? o.en || o.name : o.name}</span>
                      <b>
                        {o.price > 0
                          ? `+ ${money(o.price, currency, rate, language)}`
                          : tr("بدون زيادة", "Included")}
                      </b>
                    </button>
                  );
                })}
              </fieldset>
            ))}
            <label className="product-note">
              <span>
                {tr("ملاحظات للمطبخ", "Anything we should know?")}
                <small>{note.length}/200</small>
              </span>
              <textarea
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder={tr(
                  "بدون بصل، الصوص على جنب…",
                  "No onions, sauce on the side…",
                )}
              />
            </label>
          </div>
        </div>
        <footer className="product-detail__actions cx-item__foot">
          <div className="cx-item__qty">
            <Stepper
              qty={qty}
              onDec={() => setQty(Math.max(1, qty - 1))}
              onInc={() => setQty(Math.min(99, qty + 1))}
            />
          </div>
          <Button
            className="cx-item__add"
            disabled={!valid}
            onClick={() => onAdd(item, options, note.trim(), qty)}
          >
            {valid
              ? tr("أضف للسلة", "Add to order")
              : tr("أكمل الاختيارات", "Choose your options")}
            <strong>{money(unit * qty, currency, rate, language)}</strong>
          </Button>
        </footer>
      </section>
    </div>
  );
}
export function CartDrawer({
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
  const { language, t } = useCustomerText();
  const en = language === "en";
  const tr = (a: string, b: string) => (en ? b : a);
  useOverlay(onClose);
  return (
    <div
      className="cx-overlay cx-overlay--cart"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-cart"
        role="dialog"
        aria-modal="true"
        aria-label={t("سلة الطلب")}
      >
        <DialogHeader
          title={tr("سلتك جاهزة؟", "Your basket")}
          onClose={onClose}
          closeLabel={t("إغلاق")}
        />
        <div className="basket-intro">
          <ShoppingBag size={20} />
          <span>
            {cart.reduce((a, l) => a + l.qty, 0)}{" "}
            {tr("أصناف على ذوقك", "items, picked by you")}
          </span>
        </div>
        <div className="basket-scroll">
          {!cart.length ? (
            <EmptyState
              icon={<ShoppingBag />}
              title={tr(
                "خلّينا نلاقي شي طيب",
                "Something delicious is missing",
              )}
              description={tr(
                "اختار أطباقك المفضلة من المنيو.",
                "Explore the menu and add something you love.",
              )}
              action={
                <Button onClick={onClose}>
                  {tr("تصفح المنيو", "Explore the menu")}
                </Button>
              }
            />
          ) : (
            cart.map((line) => (
              <article className="cx-cline basket-line" key={line.key}>
                <FoodPhoto src={line.item.image} alt="" />
                <div className="basket-line__info">
                  <strong>
                    {en ? line.item.en || line.item.name : line.item.name}
                  </strong>
                  {line.options.length > 0 && (
                    <small>
                      {line.options
                        .map((o) => (en ? o.en || o.name : o.name))
                        .join(" · ")}
                    </small>
                  )}
                  {line.note && <small>{line.note}</small>}
                  <b>
                    {money(
                      (line.item.price +
                        line.options.reduce((a, o) => a + o.price, 0)) *
                        line.qty,
                      currency,
                      rate,
                      language,
                    )}
                  </b>
                  <Stepper
                    qty={line.qty}
                    onDec={() => onQty(line.key, -1)}
                    onInc={() => onQty(line.key, 1)}
                  />
                </div>
                <IconButton
                  label={tr("حذف الصنف", "Remove item")}
                  className="cx-cline__remove"
                  onClick={() => onQty(line.key, -line.qty)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </article>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <footer className="cx-cart__foot basket-checkout">
            <div>
              <span>{tr("المجموع الفرعي", "Subtotal")}</span>
              <strong>{money(total, currency, rate, language)}</strong>
            </div>
            <p>
              {tr(
                "تُحسب الرسوم والخصم عند إتمام الطلب.",
                "Fees and discounts are calculated at checkout.",
              )}
            </p>
            <Button
              onClick={() => {
                onClose();
                onCheckout();
              }}
            >
              {t("متابعة تفاصيل الطلب")}
              <ActionArrow />
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}
export function OrdersView({
  orders,
  onTrack,
  onReorder,
  onMenu,
}: {
  orders: Order[];
  onTrack: (o: Order) => void;
  onReorder?: (o: Order) => void;
  onMenu: () => void;
}) {
  const { language, t } = useCustomerText();
  const en = language === "en";
  const tr = (a: string, b: string) => (en ? b : a);
  const [view, setView] = useState("active");
  const active = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  );
  const past = orders.filter((o) =>
    ["completed", "cancelled"].includes(o.status),
  );
  useEffect(() => {
    if (!active.length && past.length) setView("past");
  }, [active.length, past.length]);
  const list = view === "active" ? active : past;
  return (
    <div className="experience-orders">
      <SectionTitle
        eyebrow={tr("كل طلب، خطوة بخطوة", "FROM OUR KITCHEN TO YOU")}
        title={t("طلباتي")}
        action={
          <Button variant="soft" onClick={onMenu}>
            <Plus size={17} />
            {t("طلب جديد")}
          </Button>
        }
      />
      <div className="order-view-tabs">
        <button
          className={view === "active" ? "is-on" : ""}
          onClick={() => setView("active")}
        >
          {tr("الحالية", "In progress")}
          <b>{active.length}</b>
        </button>
        <button
          className={view === "past" ? "is-on" : ""}
          onClick={() => setView("past")}
        >
          {tr("السابقة", "Past orders")}
          <b>{past.length}</b>
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={<ReceiptText />}
          title={tr("ما في طلبات هون بعد", "Nothing here just yet")}
          description={tr(
            "لما تطلب، بتقدر تتابع كل التفاصيل من هون.",
            "Your orders and their progress will appear here.",
          )}
          action={
            <Button onClick={onMenu}>
              {tr("خلّينا نطلب", "Find something delicious")}
            </Button>
          }
        />
      ) : (
        <div className="order-feed">
          {list.map((o) => (
            <article className="order-receipt" key={o.id}>
              <header>
                <span>
                  <ReceiptText size={18} />#{o.id}
                </span>
                <span className={`order-status is-${o.status}`}>
                  {t(statusLabels[o.status])}
                </span>
              </header>
              <div className="order-receipt__photos">
                {o.lines.slice(0, 3).map((l) => (
                  <FoodPhoto key={l.key} src={l.item.image} alt="" />
                ))}
              </div>
              <h3>
                {o.lines
                  .map((l) => (en ? l.item.en || l.item.name : l.item.name))
                  .join(" · ")}
              </h3>
              <p>
                {new Date(o.createdAt).toLocaleDateString(en ? "en" : "ar-SY")}{" "}
                · {t(modeLabels[o.mode])}
              </p>
              <footer>
                <strong>{formatSyp(o.total)}</strong>
                <Button variant="soft" onClick={() => onTrack(o)}>
                  {tr("تفاصيل الطلب", "View order")}
                  <ActionArrow />
                </Button>
                {onReorder && ["completed", "cancelled"].includes(o.status) && (
                  <Button className="cx-reorder" onClick={() => onReorder(o)}>
                    {t("إعادة الطلب بالأسعار الحالية")}
                  </Button>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function TrackingModal({
  order,
  onClose,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onWhatsApp: (o: Order) => void;
}) {
  const { language, t } = useCustomerText();
  const en = language === "en";
  const tr = (a: string, b: string) => (en ? b : a);
  useOverlay(onClose);
  const [current, setCurrent] = useState(order);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let live = true;
    setCurrent(order);
    if (!order.publicToken) return;
    const refresh = async () => {
      const { data, error } = await supabase.rpc("track_public_order", {
        p_token: order.publicToken,
      });
      if (!live) return;
      setStale(Boolean(error || !data));
      if (data && !error)
        setCurrent((c) => ({
          ...c,
          status: data.status,
          total: Number(data.total),
          table: data.table ?? c.table,
          address: data.address ?? c.address,
        }));
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [order]);
  const stages: Order["status"][] = [
    "received",
    "confirmed",
    "preparing",
    "ready",
    ...(current.mode === "delivery" ? ["out-for-delivery" as const] : []),
    "completed",
  ];
  const index = stages.indexOf(current.status);
  return (
    <div
      className="cx-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="cx-sheet order-tracking"
        role="dialog"
        aria-modal="true"
        aria-label={tr("تفاصيل الطلب", "Order details")}
      >
        <DialogHeader
          title={`#${current.id}`}
          onClose={onClose}
          closeLabel={t("إغلاق")}
        />
        <div className="tracking-scroll">
          <div className="tracking-state">
            <span>
              {current.status === "completed" ? (
                <Check size={32} />
              ) : current.status === "cancelled" ? (
                <X size={32} />
              ) : (
                <Utensils size={32} />
              )}
            </span>
            <h2>{t(statusLabels[current.status])}</h2>
            <p>
              {current.status === "cancelled"
                ? current.cancellationReason ||
                  tr(
                    "تم إلغاء الطلب من المطعم.",
                    "The restaurant cancelled this order.",
                  )
                : current.status === "completed"
                  ? tr("صحة وعافية!", "Enjoy every bite!")
                  : tr(
                      "طلبك عند الفريق. تابع كل خطوة هون.",
                      "You’re in good hands. Follow every step here.",
                    )}
            </p>
          </div>
          {stale && (
            <p role="status">
              {tr(
                "تحديث الحالة متعذر مؤقتاً. سنحاول تلقائياً.",
                "Updates are temporarily unavailable. Retrying automatically.",
              )}
            </p>
          )}
          {current.status !== "cancelled" && (
            <ol className="tracking-steps">
              {stages.map((s, i) => (
                <li
                  key={s}
                  className={i <= index ? "is-done" : ""}
                  aria-current={i === index ? "step" : undefined}
                >
                  <span>{i <= index ? <Check size={14} /> : i + 1}</span>
                  <b>{t(statusLabels[s])}</b>
                  {i === index && <small>{tr("الآن", "Now")}</small>}
                </li>
              ))}
            </ol>
          )}
          <section className="tracking-receipt">
            <h3>{tr("ملخص طلبك", "Your order")}</h3>
            {current.lines.map((l) => (
              <div key={l.key}>
                <span>
                  {l.qty} × {en ? l.item.en || l.item.name : l.item.name}
                </span>
                <b>
                  {formatSyp(
                    (l.item.price +
                      l.options.reduce((a, o) => a + o.price, 0)) *
                      l.qty,
                  )}
                </b>
              </div>
            ))}
            <footer>
              <span>{tr("الإجمالي", "Total")}</span>
              <strong>{formatSyp(current.total)}</strong>
            </footer>
          </section>
        </div>
        <footer className="tracking-contact">
          <Button variant="soft" onClick={() => onWhatsApp(current)}>
            <MessageCircle size={18} />
            {tr("تواصل مع المطعم", "Contact the restaurant")}
          </Button>
        </footer>
      </section>
    </div>
  );
}
