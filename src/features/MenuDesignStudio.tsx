/* ============================================================================
   Menu Design Studio — owner-facing designer for the public storefront.
   Persists the whole design as JSONB on restaurants.menu_design via
   public.sync_menu_design. Live device preview embeds the real storefront.
   ========================================================================== */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Contrast,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Monitor,
  Palette as PaletteIcon,
  Redo2,
  RefreshCw,
  Save,
  Shuffle,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "../supabase";
import { markMenuDesignSaved } from "../hooks/useRestaurant";
import type { MenuCategory, MenuDesign, Restaurant } from "../domain";
import {
  DEFAULT_MENU_DESIGN,
  DESIGN_TEMPLATES,
  designContrastIssues,
  ensureGoogleFonts,
  menuDesignAttrs,
  menuDesignCssVars,
  normalizeMenuDesign,
  PALETTE_PRESETS,
  type DesignTemplate,
  type PalettePreset,
} from "../menuDesign";
import { MenuView } from "./CustomerUI";
import "./menu-design.css";

type SaveState = "idle" | "saving" | "saved" | "error";
type Device = "phone" | "tablet" | "desktop";

const COLOR_FIELDS: { key: keyof MenuDesign["palette"]; label: string; hint?: string }[] = [
  { key: "accent", label: "اللون المميز", hint: "لمسات صغيرة (خاتم الشعار، نقطة القسم)" },
  { key: "brand", label: "لون الهوية", hint: "النطاقات الكبيرة والواجهة العلوية — يُفضّل داكن" },
  { key: "brandDeep", label: "الهوية الغامق" },
  { key: "action", label: "زر الطلب / الأسعار" },
  { key: "actionDeep", label: "زر الطلب الغامق" },
  { key: "glow", label: "لون التمييز", hint: "شارات الأكثر طلباً والتوهجات" },
  { key: "canvas", label: "خلفية الصفحة" },
  { key: "surface", label: "سطح البطاقات" },
  { key: "ink", label: "لون النص الأساسي" },
  { key: "line", label: "لون الحدود" },
];

const DISPLAY_FONTS = ["Changa", "Cairo", "Oswald", "Almarai", "Readex Pro", "Noto Kufi Arabic"] as const;
const BODY_FONTS = ["Tajawal", "Inter", "Cairo", "Rubik", "Almarai", "IBM Plex Sans Arabic"] as const;

const heroOptions = [
  ["editorial", "افتتاحية"],
  ["cover", "صورة كاملة"],
  ["split", "منقسمة"],
  ["centered", "متمركزة"],
  ["banner", "لافتة"],
  ["minimal", "مختصرة"],
] as const;
const cardsOptions = [
  ["photo", "بطاقات"],
  ["list", "قائمة"],
  ["overlay", "متراكبة"],
  ["compact", "مدمجة"],
] as const;
const columnsOptions = [
  ["auto", "تلقائي"],
  ["two", "عمودان"],
  ["three", "ثلاثة"],
  ["four", "أربعة"],
] as const;
const ratioOptions = [
  ["4:3", "4:3"],
  ["square", "مربّع"],
  ["3:2", "3:2"],
  ["16:9", "16:9"],
  ["portrait", "طولي"],
] as const;
const tabsOptions = [
  ["pill", "كبسولات"],
  ["line", "خطوط"],
  ["soft", "ناعم"],
] as const;
const priceOptions = [
  ["action", "أحمر"],
  ["ink", "حبر"],
  ["brand", "هوية"],
] as const;
const addOptions = [
  ["solid", "صلب"],
  ["soft", "شفاف"],
  ["outline", "إطار"],
  ["pill", "كبسولة"],
  ["square", "مربّع"],
] as const;
const radiusOptions = [
  ["sharp", "حاد"],
  ["soft", "ناعم"],
  ["round", "دائري"],
] as const;
const densityOptions = [
  ["compact", "مضغوط"],
  ["cozy", "مريح"],
  ["roomy", "متسع"],
] as const;
const shadowOptions = [
  ["flat", "مسطّح"],
  ["soft", "ناعم"],
  ["deep", "عميق"],
] as const;
const scaleOptions = [
  ["compact", "صغير"],
  ["regular", "متوسط"],
  ["editorial", "ضخم"],
] as const;
const weightOptions = [
  [500, "500"],
  [600, "600"],
  [700, "700"],
  [800, "800"],
  [900, "900"],
] as const;
const trackingOptions = [
  ["tight", "مضغوط"],
  ["normal", "عادي"],
  ["wide", "واسع"],
] as const;
const leadingOptions = [
  ["tight", "متلاصق"],
  ["normal", "عادي"],
  ["loose", "فسيح"],
] as const;
const caseOptions = [
  ["normal", "طبيعي"],
  ["upper", "كبير"],
] as const;
const modeOptions = [
  ["light", "نهاري"],
  ["dark", "ليلي"],
] as const;
const headerOptions = [
  ["solid", "صلب"],
  ["glass", "زجاجي"],
  ["minimal", "شبحي"],
  ["centered", "متمركز"],
] as const;
const fitOptions = [
  ["cover", "تغطية"],
  ["contain", "احتواء"],
] as const;
const borderOptions = [
  ["none", "بلا"],
  ["hairline", "رفيع"],
  ["bold", "عريض"],
] as const;
const patternOptions = [
  ["none", "بلا"],
  ["dots", "نقاط"],
  ["grid", "شبكة"],
  ["diagonal", "مائل"],
  ["noise", "خشونة"],
  ["glow", "توهّج"],
] as const;
const motionOptions = [
  ["calm", "هادئ"],
  ["normal", "عادي"],
  ["lively", "حيوي"],
] as const;
const toneOptions = [
  ["ink", "حبر"],
  ["glow", "ذهبي"],
  ["action", "أحمر"],
  ["brand", "هوية"],
] as const;

const contentToggles: { key: keyof MenuDesign["content"]; label: string }[] = [
  { key: "subtitle", label: "الوصف المختصر في الواجهة" },
  { key: "location", label: "الموقع أسفل اسم المطعم" },
  { key: "stats", label: "إحصاءات الواجهة (عدد الأطباق)" },
  { key: "heroCats", label: "اختصارات الأقسام في الواجهة" },
  { key: "english", label: "الاسم الإنجليزي للأطباق" },
  { key: "descriptions", label: "وصف الأطباق" },
  { key: "tags", label: "شارات التصنيف (نباتي، الشيف…)" },
  { key: "popularFlag", label: "شارة الأكثر طلباً" },
  { key: "modifierHint", label: "إشارة وجود خيارات تخصيص" },
  { key: "catalogueNote", label: "السطر الختامي تحت القائمة" },
  { key: "liveBadge", label: "شارة الاتصال في الأعلى" },
];

function equalDefault(d: MenuDesign) {
  return JSON.stringify(d) === JSON.stringify(DEFAULT_MENU_DESIGN);
}

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---- small building blocks ------------------------------------------------ */

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="md-seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          type="button"
          key={String(v)}
          className={`md-seg__btn${value === v ? " is-on" : ""}`}
          onClick={() => onChange(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="md-switch">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

function Section({
  id,
  num,
  title,
  desc,
  open,
  onToggle,
  children,
}: {
  id: string;
  num: string;
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`md-sec${open ? " is-open" : ""}`} id={`md-sec-${id}`}>
      <button
        type="button"
        className="md-sec__head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="md-sec__num">{num}</span>
        <span className="md-sec__text">
          <h2>{title}</h2>
          <p>{desc}</p>
        </span>
        <ChevronDown className="md-sec__chev" aria-hidden="true" />
      </button>
      {open && <div className="md-sec__body">{children}</div>}
    </section>
  );
}

/* ---- Error boundary: surface any runtime error instead of a dead tab ---- */
class StudioBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="md-fatal" role="alert">
          <AlertCircle aria-hidden="true" />
          <div>
            <b>حدث خطأ غير متوقع في الاستوديو</b>
            <p>{String(this.state.error.message || this.state.error)}</p>
            <button
              type="button"
              className="md-btn md-btn--red"
              onClick={() => window.location.reload()}
            >
              <RefreshCw aria-hidden="true" />
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const NAV: { id: string; label: string }[] = [
  { id: "templates", label: "قوالب" },
  { id: "palette", label: "ألوان" },
  { id: "typography", label: "خطوط" },
  { id: "layout", label: "تخطيط" },
  { id: "header", label: "الشريط" },
  { id: "cards", label: "بطاقات" },
  { id: "effects", label: "تأثيرات" },
  { id: "content", label: "محتوى" },
  { id: "a11y", label: "تباين" },
];

export default function MenuDesignStudio({
  restaurant,
  restaurantDatabaseId,
  categories = [],
  canEdit = true,
}: {
  restaurant: Restaurant;
  restaurantDatabaseId: string;
  categories?: MenuCategory[];
  canEdit?: boolean;
}) {
  const initial = useMemo(() => {
    const loaded = restaurant.design
      ? normalizeMenuDesign(restaurant.design)
      : DEFAULT_MENU_DESIGN;
    if (equalDefault(loaded)) {
      return {
        ...loaded,
        palette: {
          ...loaded.palette,
          accent: restaurant.accent || loaded.palette.accent,
        },
      };
    }
    return loaded;
  }, [restaurant.design, restaurant.accent]);

  const [working, setWorking] = useState<MenuDesign>(initial);
  const [history, setHistory] = useState<MenuDesign[]>([]);
  const [future, setFuture] = useState<MenuDesign[]>([]);
  const [status, setStatus] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [device, setDevice] = useState<Device>("phone");
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState<Record<string, boolean>>({
    templates: true,
    palette: false,
  });
  const dirtyRef = useRef(false);
  const firstRun = useRef(true);
  const savedRef = useRef<MenuDesign>(initial);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureGoogleFonts(working);
  }, [working.type.display, working.type.body]);

  const persist = async (next: MenuDesign) => {
    if (!restaurantDatabaseId) {
      setStatus("error");
      setErrorMsg("تعذّر الحفظ — لا توجد عضوية مفعّلة لهذا المطعم.");
      return;
    }
    setStatus("saving");
    const { error } = await supabase.rpc("sync_menu_design", {
      p_restaurant_id: restaurantDatabaseId,
      p_design: next,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("saved");
    setErrorMsg("");
    savedRef.current = next;
    markMenuDesignSaved(restaurant.id, next);
  };

  /** Apply a change and record it in the undo history. */
  const commit = (updater: MenuDesign | ((d: MenuDesign) => MenuDesign)) => {
    const value =
      typeof updater === "function"
        ? (updater as (d: MenuDesign) => MenuDesign)(working)
        : updater;
    if (value === working) return;
    setHistory((h) => [...h.slice(-49), working]);
    setFuture([]);
    dirtyRef.current = true;
    setWorking(value);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [working, ...f].slice(0, 50));
    setHistory((h) => h.slice(0, -1));
    setWorking(prev);
    dirtyRef.current = true;
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-49), working]);
    setFuture((f) => f.slice(1));
    setWorking(next);
    dirtyRef.current = true;
  };

  // Debounced auto-save of every change.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!dirtyRef.current) return;
    const id = window.setTimeout(() => void persist(working), 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working]);

  // Keyboard shortcuts: undo / redo / save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      } else if (k === "s") {
        e.preventDefault();
        void persist(working);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const previewSrc = useMemo(
    () => `/c/${encodeURIComponent(restaurant.id)}`,
    [restaurant.id],
  );

  const previewRestaurant = useMemo(
    () => ({ ...restaurant, design: working }),
    [restaurant, working],
  );

  const previewItems = useMemo(
    () => restaurant.items.slice(0, 8),
    [restaurant.items],
  );

  const previewAttrs = useMemo(() => menuDesignAttrs(working), [working]);
  const previewStyle = useMemo(
    () => menuDesignCssVars(working, restaurant.accent),
    [working, restaurant.accent],
  );
  const issues = useMemo(() => designContrastIssues(working), [working]);

  const toggleSection = (id: string) =>
    setOpen((s) => ({ ...s, [id]: !s[id] }));

  const goTo = (id: string) => {
    setOpen((s) => ({ ...s, [id]: true }));
    window.setTimeout(() => {
      document
        .getElementById(`md-sec-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  const applyPreset = (preset: PalettePreset) =>
    commit((d) => ({ ...d, palette: { ...preset.palette } }));

  const applyTemplate = (tpl: DesignTemplate) => {
    if (
      !window.confirm(
        `تطبيق قالب «${tpl.label}»؟ سيستبدل الألوان والخطوط والتخطيط الحالي.`,
      )
    )
      return;
    commit(() => tpl.build());
  };

  const randomize = () => {
    commit((d) => ({
      ...d,
      palette: { ...pickOne(PALETTE_PRESETS).palette },
      type: {
        ...d.type,
        display: pickOne(DISPLAY_FONTS),
        body: pickOne(BODY_FONTS),
        weight: pickOne([600, 700, 800] as const),
        scale: pickOne(["compact", "regular", "editorial"] as const),
        tracking: pickOne(["tight", "normal", "wide"] as const),
        leading: pickOne(["tight", "normal", "loose"] as const),
        headingCase: pickOne(["normal", "upper"] as const),
      },
      layout: {
        ...d.layout,
        hero: pickOne(["editorial", "cover", "minimal", "split", "centered", "banner"] as const),
        cards: pickOne(["photo", "list", "overlay", "compact"] as const),
        radius: pickOne(["sharp", "soft", "round"] as const),
        density: pickOne(["compact", "cozy", "roomy"] as const),
        shadow: pickOne(["flat", "soft", "deep"] as const),
        tabs: pickOne(["pill", "line", "soft"] as const),
        add: pickOne(["solid", "soft", "outline", "pill", "square"] as const),
        header: pickOne(["solid", "glass", "minimal", "centered"] as const),
        border: pickOne(["none", "hairline", "bold"] as const),
      },
      effects: {
        ...d.effects,
        pattern: pickOne(["none", "dots", "grid", "diagonal", "glow"] as const),
        glow: Math.random() > 0.45,
        gradientHero: Math.random() > 0.5,
      },
    }));
  };

  const resetDesign = () => {
    if (!window.confirm("إعادة القائمة إلى التصميم الافتراضي؟")) return;
    commit(() => ({
      ...DEFAULT_MENU_DESIGN,
      palette: {
        ...DEFAULT_MENU_DESIGN.palette,
        accent: restaurant.accent || DEFAULT_MENU_DESIGN.palette.accent,
      },
    }));
  };

  const revertDesign = () => {
    if (!window.confirm("تجاهل كل التعديلات غير المحفوظة والعودة لآخر نسخة؟"))
      return;
    commit(() => savedRef.current);
  };

  const exportJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(working, null, 2));
      setStatus("saved");
      setErrorMsg("نُسخ التصميم إلى الحافظة — احتفظ به كنسخة احتياطية.");
    } catch {
      window.prompt("انسخ التصميم يدوياً:", JSON.stringify(working, null, 2));
    }
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(working, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurant.id}-menu-design.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const next = normalizeMenuDesign(parsed);
      commit(next);
      void persist(next);
      setImportOpen(false);
      setImportText("");
    } catch {
      setStatus("error");
      setErrorMsg("المحتوى غير صالح — تأكد من لصق JSON صحيح.");
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    applyImport(text);
    event.target.value = "";
  };

  const statusLabel =
    status === "saving"
      ? "جارٍ الحفظ…"
      : status === "error"
        ? "تعذّر الحفظ"
        : status === "saved"
          ? "تم الحفظ ✓"
          : "جاهز";

  const statusIcon =
    status === "saving" ? (
      <Loader2 className="md-spin" aria-hidden="true" />
    ) : status === "error" ? (
      <AlertCircle aria-hidden="true" />
    ) : (
      <CheckCircle2 aria-hidden="true" />
    );

  const pd = working.palette;

  return (
    <div className="md">
      <header className="md__head">
        <div className="md__head-txt">
          <span className="md__kicker">
            <PaletteIcon aria-hidden="true" />
            استوديو التصميم
          </span>
          <h1 className="md__title">صمّم قائمتك كما تحب</h1>
          <p className="md__lede">
            ألوان، خطوط، تخطيط، تأثيرات ومحتوى — مع قوالب جاهزة ومعاينة حية.
            كل تعديل يُحفظ تلقائياً ويظهر فوراً لعملائك.
          </p>
        </div>
        <div className="md__head-actions">
          <span
            className={`md-status md-status--${status}`}
            role="status"
            aria-live="polite"
          >
            {statusIcon}
            {statusLabel}
          </span>
          <a
            className="md-btn md-btn--ghost"
            href={previewSrc}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden="true" />
            فتح الموقع
          </a>
        </div>
      </header>

      {canEdit === false && (
        <div className="md-note md-note--warn" role="note">
          <AlertCircle aria-hidden="true" />
          <span>
            الحفظ متاح لحساب <b>المالك أو المدير</b> فقط — يمكنك معاينة آخر
            تصميم محفوظ.
          </span>
        </div>
      )}

      {/* ---- Sticky toolbar ---- */}
      <div className="md-toolbar">
        <div className="md-toolbar__group">
          <button
            type="button"
            className="md-iconbtn"
            onClick={undo}
            disabled={!history.length}
            title="تراجع (Ctrl+Z)"
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className="md-iconbtn"
            onClick={redo}
            disabled={!future.length}
            title="إعادة (Ctrl+Y)"
          >
            <Redo2 aria-hidden="true" />
          </button>
          <span className="md-toolbar__sep" aria-hidden="true" />
          <button
            type="button"
            className="md-iconbtn"
            onClick={() => void persist(working)}
            title="حفظ الآن (Ctrl+S)"
          >
            <Save aria-hidden="true" />
          </button>
          <button
            type="button"
            className="md-iconbtn"
            onClick={revertDesign}
            title="تراجع عن غير المحفوظ"
          >
            <RefreshCw aria-hidden="true" />
          </button>
        </div>

        <div className="md-toolbar__group md-toolbar__group--grow">
          <button type="button" className="md-btn md-btn--soft md-btn--sm" onClick={randomize}>
            <Shuffle aria-hidden="true" />
            فاجئني
          </button>
          <button type="button" className="md-btn md-btn--soft md-btn--sm" onClick={exportFile}>
            <Download aria-hidden="true" />
            تنزيل
          </button>
          <button type="button" className="md-btn md-btn--soft md-btn--sm" onClick={exportJson}>
            <Copy aria-hidden="true" />
            نسخ
          </button>
          <button
            type="button"
            className="md-btn md-btn--soft md-btn--sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            استيراد ملف
          </button>
          <button
            type="button"
            className="md-btn md-btn--soft md-btn--sm"
            onClick={() => setImportOpen((v) => !v)}
          >
            <Link2 aria-hidden="true" />
            لصق
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFile}
          />
        </div>

        <div className="md-toolbar__group">
          {issues.length > 0 ? (
            <button
              type="button"
              className="md-contrastpill is-bad"
              onClick={() => goTo("a11y")}
              title="مشاكل تباين"
            >
              <Contrast aria-hidden="true" />
              {issues.length} تنبيه
            </button>
          ) : (
            <span className="md-contrastpill is-ok">
              <Check aria-hidden="true" />
              تباين سليم
            </span>
          )}
          <button type="button" className="md-btn md-btn--ghost md-btn--sm" onClick={resetDesign}>
            <RefreshCw aria-hidden="true" />
            الافتراضي
          </button>
        </div>
      </div>

      {/* ---- Quick nav ---- */}
      <nav className="md-nav" aria-label="أقسام التصميم">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="md-nav__chip"
            onClick={() => goTo(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {importOpen && (
        <div className="md-import">
          <div className="md-import__bar">
            <b>لصق نسخة تصميم (JSON)</b>
            <button
              type="button"
              className="md-import__close"
              onClick={() => setImportOpen(false)}
              aria-label="إغلاق"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"palette": {...}, "layout": {...}, ...}'
            rows={4}
          />
          <div className="md-import__foot">
            <span>يستبدل التصميم الحالي ويُحفظ مباشرة.</span>
            <button
              type="button"
              className="md-btn md-btn--red"
              onClick={() => applyImport(importText)}
            >
              <Check aria-hidden="true" />
              تطبيق
            </button>
          </div>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="md-error" role="alert">
          <AlertCircle aria-hidden="true" />
          {errorMsg}
        </div>
      )}

      <StudioBoundary>
        <div className="md__grid">
          <aside className="md__pane" aria-label="خيارات التصميم">
            {/* ---- Templates ---- */}
            <Section
              id="templates"
              num="00"
              title="قوالب جاهزة"
              desc="ابدأ من تصميم كامل بضغطة واحدة"
              open={!!open.templates}
              onToggle={() => toggleSection("templates")}
            >
              <div className="md-templates">
                {DESIGN_TEMPLATES.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.id}
                    className={`md-template${working.name === tpl.label ? " is-on" : ""}`}
                    onClick={() => applyTemplate(tpl)}
                  >
                    <span className="md-template__art">
                      {tpl.swatches.map((c) => (
                        <i key={c} style={{ background: c }} aria-hidden="true" />
                      ))}
                    </span>
                    <span className="md-template__body">
                      <b>{tpl.label}</b>
                      <small>{tpl.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ---- Palette ---- */}
            <Section
              id="palette"
              num="01"
              title="الألوان"
              desc="باقات جاهزة أو ألوانك الخاصة"
              open={!!open.palette}
              onToggle={() => toggleSection("palette")}
            >
              <div className="md-palette-preview" aria-hidden="true" style={{ background: pd.canvas, borderColor: pd.line }}>
                <span style={{ background: pd.brand }} />
                <span style={{ background: pd.action }} />
                <span style={{ background: pd.glow }} />
                <span style={{ background: pd.surface }} />
                <span style={{ background: pd.ink }} />
              </div>
              <div className="md-presets">
                {PALETTE_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="md-preset"
                    onClick={() => applyPreset(preset)}
                    aria-label={`باقة ${preset.label}`}
                    title={preset.label}
                  >
                    {preset.swatches.map((color) => (
                      <i key={color} style={{ background: color }} aria-hidden="true" />
                    ))}
                  </button>
                ))}
              </div>
              <div className="md-colors">
                {COLOR_FIELDS.map((field) => (
                  <label className="md-color" key={field.key}>
                    <span className="md-color__name">
                      <b>{field.label}</b>
                      {field.hint && <small>{field.hint}</small>}
                    </span>
                    <span className="md-color__pick">
                      <input
                        type="color"
                        value={pd[field.key]}
                        onChange={(e) =>
                          commit((d) => ({
                            ...d,
                            palette: { ...d.palette, [field.key]: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        value={pd[field.key]}
                        onChange={(e) =>
                          commit((d) => ({
                            ...d,
                            palette: { ...d.palette, [field.key]: e.target.value },
                          }))
                        }
                        aria-label={`${field.label} (كود اللون)`}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* ---- Typography ---- */}
            <Section
              id="typography"
              num="02"
              title="الخطوط"
              desc="العناوين والنصوص والإيقاع الطباعي"
              open={!!open.typography}
              onToggle={() => toggleSection("typography")}
            >
              <div className="md-grid2">
                <label className="md-field">
                  <span>خط العناوين</span>
                  <select
                    value={working.type.display}
                    onChange={(e) =>
                      commit((d) => ({ ...d, type: { ...d.type, display: e.target.value as MenuDesign["type"]["display"] } }))
                    }
                  >
                    {DISPLAY_FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </label>
                <label className="md-field">
                  <span>خط النصوص</span>
                  <select
                    value={working.type.body}
                    onChange={(e) =>
                      commit((d) => ({ ...d, type: { ...d.type, body: e.target.value as MenuDesign["type"]["body"] } }))
                    }
                  >
                    {BODY_FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="md-rowlabel">سماكة العناوين</div>
              <Seg
                value={working.type.weight}
                options={weightOptions}
                onChange={(weight) => commit((d) => ({ ...d, type: { ...d.type, weight } }))}
                label="سماكة العناوين"
              />
              <div className="md-rowlabel">حجم العناوين</div>
              <Seg
                value={working.type.scale}
                options={scaleOptions}
                onChange={(scale) => commit((d) => ({ ...d, type: { ...d.type, scale } }))}
                label="حجم العناوين"
              />
              <div className="md-grid2">
                <div>
                  <div className="md-rowlabel">تباعد الأحرف</div>
                  <Seg
                    value={working.type.tracking}
                    options={trackingOptions}
                    onChange={(tracking) => commit((d) => ({ ...d, type: { ...d.type, tracking } }))}
                    label="تباعد الأحرف"
                  />
                </div>
                <div>
                  <div className="md-rowlabel">تباعد الأسطر</div>
                  <Seg
                    value={working.type.leading}
                    options={leadingOptions}
                    onChange={(leading) => commit((d) => ({ ...d, type: { ...d.type, leading } }))}
                    label="تباعد الأسطر"
                  />
                </div>
              </div>
              <div className="md-rowlabel">حالة حروف العناوين</div>
              <Seg
                value={working.type.headingCase}
                options={caseOptions}
                onChange={(headingCase) => commit((d) => ({ ...d, type: { ...d.type, headingCase } }))}
                label="حالة الحروف"
              />
            </Section>

            {/* ---- Layout ---- */}
            <Section
              id="layout"
              num="03"
              title="التخطيط العام"
              desc="الواجهة، التبويبات، الحواف والمسافات"
              open={!!open.layout}
              onToggle={() => toggleSection("layout")}
            >
              <div className="md-rowlabel">شكل الواجهة الرئيسية</div>
              <Seg
                value={working.layout.hero}
                options={heroOptions}
                onChange={(hero) => commit((d) => ({ ...d, layout: { ...d.layout, hero } }))}
                label="شكل الواجهة"
              />
              <div className="md-rowlabel">أسلوب تبويبات الأقسام</div>
              <Seg
                value={working.layout.tabs}
                options={tabsOptions}
                onChange={(tabs) => commit((d) => ({ ...d, layout: { ...d.layout, tabs } }))}
                label="أسلوب التبويبات"
              />
              <div className="md-grid2">
                <div>
                  <div className="md-rowlabel">لون السعر</div>
                  <Seg
                    value={working.layout.price}
                    options={priceOptions}
                    onChange={(price) => commit((d) => ({ ...d, layout: { ...d.layout, price } }))}
                    label="لون السعر"
                  />
                </div>
                <div>
                  <div className="md-rowlabel">زر الإضافة</div>
                  <Seg
                    value={working.layout.add}
                    options={addOptions}
                    onChange={(add) => commit((d) => ({ ...d, layout: { ...d.layout, add } }))}
                    label="زر الإضافة"
                  />
                </div>
              </div>
              <div className="md-grid3">
                <div>
                  <div className="md-rowlabel">الحواف</div>
                  <Seg
                    value={working.layout.radius}
                    options={radiusOptions}
                    onChange={(radius) => commit((d) => ({ ...d, layout: { ...d.layout, radius } }))}
                    label="الحواف"
                  />
                </div>
                <div>
                  <div className="md-rowlabel">المسافات</div>
                  <Seg
                    value={working.layout.density}
                    options={densityOptions}
                    onChange={(density) => commit((d) => ({ ...d, layout: { ...d.layout, density } }))}
                    label="المسافات"
                  />
                </div>
                <div>
                  <div className="md-rowlabel">الظلال</div>
                  <Seg
                    value={working.layout.shadow}
                    options={shadowOptions}
                    onChange={(shadow) => commit((d) => ({ ...d, layout: { ...d.layout, shadow } }))}
                    label="الظلال"
                  />
                </div>
              </div>
            </Section>

            {/* ---- Header ---- */}
            <Section
              id="header"
              num="04"
              title="الشريط العلوي والوضع"
              desc="شكل الهيدر والوضع النهاري/الليلي"
              open={!!open.header}
              onToggle={() => toggleSection("header")}
            >
              <div className="md-rowlabel">الوضع العام</div>
              <Seg
                value={working.layout.mode}
                options={modeOptions}
                onChange={(mode) => commit((d) => ({ ...d, layout: { ...d.layout, mode } }))}
                label="الوضع"
              />
              <div className="md-rowlabel">شكل الشريط العلوي</div>
              <Seg
                value={working.layout.header}
                options={headerOptions}
                onChange={(header) => commit((d) => ({ ...d, layout: { ...d.layout, header } }))}
                label="الشريط"
              />
            </Section>

            {/* ---- Cards ---- */}
            <Section
              id="cards"
              num="05"
              title="البطاقات والأطباق"
              desc="شكل بطاقة الطبق، الصورة، الأعمدة والحدود"
              open={!!open.cards}
              onToggle={() => toggleSection("cards")}
            >
              <div className="md-rowlabel">أسلوب الأطباق</div>
              <Seg
                value={working.layout.cards}
                options={cardsOptions}
                onChange={(cards) => commit((d) => ({ ...d, layout: { ...d.layout, cards } }))}
                label="أسلوب الأطباق"
              />
              <div className="md-grid2">
                <div>
                  <div className="md-rowlabel">عدد الأعمدة</div>
                  <Seg
                    value={working.layout.columns}
                    options={columnsOptions}
                    onChange={(columns) => commit((d) => ({ ...d, layout: { ...d.layout, columns } }))}
                    label="عدد الأعمدة"
                  />
                </div>
                <div>
                  <div className="md-rowlabel">ملاءمة الصورة</div>
                  <Seg
                    value={working.layout.imageFit}
                    options={fitOptions}
                    onChange={(imageFit) => commit((d) => ({ ...d, layout: { ...d.layout, imageFit } }))}
                    label="ملاءمة الصورة"
                  />
                </div>
              </div>
              <div className="md-rowlabel">نسبة صورة الطبق</div>
              <Seg
                value={working.layout.ratio}
                options={ratioOptions}
                onChange={(ratio) => commit((d) => ({ ...d, layout: { ...d.layout, ratio } }))}
                label="نسبة الصورة"
              />
              <div className="md-rowlabel">حدود البطاقات</div>
              <Seg
                value={working.layout.border}
                options={borderOptions}
                onChange={(border) => commit((d) => ({ ...d, layout: { ...d.layout, border } }))}
                label="الحدود"
              />
            </Section>

            {/* ---- Effects ---- */}
            <Section
              id="effects"
              num="06"
              title="التأثيرات والحركة"
              desc="الخلفيات، التوهّج، التدرّج والحركة"
              open={!!open.effects}
              onToggle={() => toggleSection("effects")}
            >
              <div className="md-rowlabel">نمط الخلفية</div>
              <Seg
                value={working.effects.pattern}
                options={patternOptions}
                onChange={(pattern) => commit((d) => ({ ...d, effects: { ...d.effects, pattern } }))}
                label="نمط الخلفية"
              />
              <div className="md-rowlabel">شدة الحركة</div>
              <Seg
                value={working.effects.motion}
                options={motionOptions}
                onChange={(motion) => commit((d) => ({ ...d, effects: { ...d.effects, motion } }))}
                label="الحركة"
              />
              <div className="md-toggles">
                <Switch
                  label="تدرّج لوني في الواجهة"
                  checked={working.effects.gradientHero}
                  onChange={(v) => commit((d) => ({ ...d, effects: { ...d.effects, gradientHero: v } }))}
                />
                <Switch
                  label="توهّج حول البطاقات والأزرار"
                  checked={working.effects.glow}
                  onChange={(v) => commit((d) => ({ ...d, effects: { ...d.effects, glow: v } }))}
                />
                <Switch
                  label="حبيبات فوق الواجهة"
                  checked={working.effects.grain}
                  onChange={(v) => commit((d) => ({ ...d, effects: { ...d.effects, grain: v } }))}
                />
              </div>
            </Section>

            {/* ---- Content ---- */}
            <Section
              id="content"
              num="07"
              title="المحتوى والظهور"
              desc="ما يظهر في القائمة، الشريط الترحيبي، الشعار والفوتر"
              open={!!open.content}
              onToggle={() => toggleSection("content")}
            >
              <div className="md-toggles">
                {contentToggles.map((toggle) => (
                  <Switch
                    key={toggle.key}
                    label={toggle.label}
                    checked={Boolean(working.content[toggle.key])}
                    onChange={(v) =>
                      commit((d) => ({
                        ...d,
                        content: { ...d.content, [toggle.key]: v } as MenuDesign["content"],
                      }))
                    }
                  />
                ))}
                <Switch
                  label="شارة تقييم الزبائن في الواجهة"
                  checked={working.content.rating}
                  onChange={(v) => commit((d) => ({ ...d, content: { ...d.content, rating: v } }))}
                />
                <Switch
                  label="ساعات العمل في الفوتر"
                  checked={working.content.hours}
                  onChange={(v) => commit((d) => ({ ...d, content: { ...d.content, hours: v } }))}
                />
                <Switch
                  label="روابط التواصل في الفوتر"
                  checked={working.content.socials}
                  onChange={(v) => commit((d) => ({ ...d, content: { ...d.content, socials: v } }))}
                />
                <Switch
                  label="إظهار الفوتر بالكامل"
                  checked={working.content.footer}
                  onChange={(v) => commit((d) => ({ ...d, content: { ...d.content, footer: v } }))}
                />
              </div>

              <div className="md-grid2">
                <label className="md-field">
                  <span>قيمة التقييم (٠–٥)</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={working.content.ratingValue}
                    onChange={(e) =>
                      commit((d) => ({
                        ...d,
                        content: { ...d.content, ratingValue: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              </div>

              <div className="md-rowlabel">شريط ترحيبي أعلى الصفحة</div>
              <label className="md-field">
                <input
                  type="text"
                  value={working.content.bannerText}
                  maxLength={160}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, bannerText: e.target.value } }))
                  }
                  placeholder="مثال: توصيل مجاني للطلبات فوق 200 ألف ل.س"
                />
              </label>
              <Seg
                value={working.content.bannerTone}
                options={toneOptions}
                onChange={(bannerTone) => commit((d) => ({ ...d, content: { ...d.content, bannerTone } }))}
                label="نمط الشريط"
              />
              <Switch
                label="إظهار الشريط الترحيبي"
                checked={working.content.bannerOn}
                onChange={(v) => commit((d) => ({ ...d, content: { ...d.content, bannerOn: v } }))}
              />

              <div className="md-rowlabel">الشعار والصورة الرئيسية</div>
              <label className="md-field">
                <span>رابط صورة الشعار</span>
                <input
                  type="url"
                  value={working.content.logoUrl}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, logoUrl: e.target.value } }))
                  }
                  placeholder="https://…/logo.png"
                />
              </label>
              <label className="md-field">
                <span>صورة الواجهة الرئيسية</span>
                <input
                  type="url"
                  value={working.content.coverUrl}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, coverUrl: e.target.value } }))
                  }
                  placeholder="https://…/cover.jpg"
                />
              </label>

              <div className="md-rowlabel">الفوتر والتواصل</div>
              <label className="md-field">
                <span>نص الفوتر التعريفي</span>
                <input
                  type="text"
                  value={working.content.footerText}
                  maxLength={240}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, footerText: e.target.value } }))
                  }
                  placeholder="مطعم سوري أصيل منذ ١٩٩٥…"
                />
              </label>
              <label className="md-field">
                <span>ساعات العمل (نص)</span>
                <input
                  type="text"
                  value={working.content.hoursText}
                  maxLength={240}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, hoursText: e.target.value } }))
                  }
                  placeholder="يومياً · ٩:٠٠ ص — ١١:٠٠ م"
                />
              </label>
              <div className="md-grid2">
                <label className="md-field">
                  <span>إنستغرام</span>
                  <input
                    type="text"
                    value={working.content.instagram}
                    onChange={(e) =>
                      commit((d) => ({ ...d, content: { ...d.content, instagram: e.target.value } }))
                    }
                    placeholder="@cafe أو رابط"
                  />
                </label>
                <label className="md-field">
                  <span>فيسبوك</span>
                  <input
                    type="text"
                    value={working.content.facebook}
                    onChange={(e) =>
                      commit((d) => ({ ...d, content: { ...d.content, facebook: e.target.value } }))
                    }
                    placeholder="اسم الصفحة أو رابط"
                  />
                </label>
              </div>
              <label className="md-field">
                <span>تسمية زر واتساب</span>
                <input
                  type="text"
                  value={working.content.whatsappLabel}
                  onChange={(e) =>
                    commit((d) => ({ ...d, content: { ...d.content, whatsappLabel: e.target.value } }))
                  }
                  placeholder="واتساب"
                />
              </label>
            </Section>

            {/* ---- Accessibility ---- */}
            <Section
              id="a11y"
              num="08"
              title="فحص التباين"
              desc="تنبيهات قراءة النصوص على الخلفيات"
              open={!!open.a11y}
              onToggle={() => toggleSection("a11y")}
            >
              {issues.length === 0 ? (
                <div className="md-a11y-ok">
                  <CheckCircle2 aria-hidden="true" />
                  كل النصوص تحقق تبايناً مقبولاً (WCAG AA).
                </div>
              ) : (
                <ul className="md-a11y-list">
                  {issues.map((issue) => (
                    <li key={issue.id} className={`md-a11y-item is-${issue.level}`}>
                      <span className="md-a11y-dot" aria-hidden="true" />
                      <span className="md-a11y-text">
                        <b>{issue.label}</b>
                        <small>
                          نسبة التباين {issue.ratio}:1 — الحد المطلوب 4.5:1
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>

          {/* ---- Live preview ---- */}
          <section className="md__stage" aria-label="معاينة حية">
            <div className="md__stage-top">
              <div className="md__stage-title">
                <b>معاينة حية</b>
                <small>تتحدّث فوراً مع كل تغيير — دون حفظ</small>
              </div>
              <div className="md-devices" role="group" aria-label="حجم المعاينة">
                <button
                  type="button"
                  className={`md-devices__btn${device === "phone" ? " is-on" : ""}`}
                  onClick={() => setDevice("phone")}
                  title="هاتف"
                >
                  <Smartphone aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`md-devices__btn${device === "tablet" ? " is-on" : ""}`}
                  onClick={() => setDevice("tablet")}
                  title="لوحي"
                >
                  <Tablet aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`md-devices__btn${device === "desktop" ? " is-on" : ""}`}
                  onClick={() => setDevice("desktop")}
                  title="سطح المكتب"
                >
                  <Monitor aria-hidden="true" />
                </button>
              </div>
              <label className="md-zoom">
                <span>تكبير</span>
                <input
                  type="range"
                  min={0.5}
                  max={1.15}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <b className="mono-num">{Math.round(zoom * 100)}%</b>
              </label>
              <a
                className="md-btn md-btn--ghost md-btn--sm"
                href={previewSrc}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink aria-hidden="true" />
                ملء الشاشة
              </a>
            </div>
            <div className="md-preview">
              <div className={`md-preview__frame is-${device}`}>
                <div
                  className="md-preview__scale"
                  style={{ "--md-zoom": zoom } as CSSProperties}
                >
                  <div
                    className="cx cx--preview"
                    dir="rtl"
                    style={previewStyle as CSSProperties}
                    {...previewAttrs}
                  >
                    <MenuView
                      restaurant={previewRestaurant}
                      categories={categories}
                      currency="syp"
                      setCurrency={() => {}}
                      category="كل الأصناف"
                      setCategory={() => {}}
                      tag="all"
                      setTag={() => {}}
                      query=""
                      setQuery={() => {}}
                      items={previewItems}
                      onSelect={() => {}}
                      onQuickAdd={() => {}}
                    />
                  </div>
                </div>
              </div>
              <p className="md-preview__hint">
                <Sparkles aria-hidden="true" />
                نصيحة: جرّب «فاجئني» لاكتشاف تركيبات جديدة، أو ابدأ من قالب جاهز.
              </p>
            </div>
          </section>
        </div>
      </StudioBoundary>
    </div>
  );
}
