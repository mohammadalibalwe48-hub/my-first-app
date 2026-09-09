/* ============================================================================
   Menu Design Studio — owner-facing designer for the public storefront.
   Persists the whole design as JSONB on restaurants.menu_design via
   public.sync_menu_design. Live phone/desktop preview embeds the real
   storefront (/c/:slug) so every change is seen for real.
   ========================================================================== */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Palette as PaletteIcon,
  Play,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "../supabase";
import type { MenuDesign, Restaurant } from "../domain";
import {
  DEFAULT_MENU_DESIGN,
  normalizeMenuDesign,
  PALETTE_PRESETS,
  type PalettePreset,
} from "../menuDesign";
import "./menu-design.css";

type SaveState = "idle" | "saving" | "saved" | "error";

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

const DISPLAY_FONTS = ["Changa", "Cairo", "Oswald", "Almarai", "Readex Pro", "Noto Kufi Arabic"];
const BODY_FONTS = ["Tajawal", "Inter", "Cairo", "Rubik", "Almarai", "IBM Plex Sans Arabic"];

const heroOptions = [
  ["editorial", "افتتاحية"],
  ["cover", "صورة كاملة"],
  ["minimal", "مختصرة"],
] as const;
const cardsOptions = [
  ["photo", "بطاقات بصور"],
  ["list", "قائمة أنيقة"],
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
] as const;
const tabsOptions = [
  ["pill", "كبسولات"],
  ["line", "خطوط"],
] as const;
const priceOptions = [
  ["action", "أحمر"],
  ["ink", "حبر"],
] as const;
const addOptions = [
  ["solid", "صلب"],
  ["soft", "شفاف ناعم"],
  ["outline", "إطار"],
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
const weightOptions = [600, 700, 800] as const;
const toneOptions = [
  ["ink", "حبر"],
  ["glow", "ذهبي"],
  ["action", "أحمر"],
  ["brand", "هوية"],
] as const;
const deviceOptions = [390, 768, 1280] as const;

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

export default function MenuDesignStudio({
  restaurant,
  restaurantDatabaseId,
  canEdit = true,
}: {
  restaurant: Restaurant;
  restaurantDatabaseId: string;
  canEdit?: boolean;
}) {
  const initial = useMemo(() => {
    const loaded = restaurant.design
      ? normalizeMenuDesign(restaurant.design)
      : DEFAULT_MENU_DESIGN;
    // Keep the venue's existing accent when the owner has never customized.
    if (equalDefault(loaded)) {
      return { ...loaded, palette: { ...loaded.palette, accent: restaurant.accent || loaded.palette.accent } };
    }
    return loaded;
  }, [restaurant.design, restaurant.accent]);

  const [working, setWorking] = useState<MenuDesign>(initial);
  const [status, setStatus] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [saveTick, setSaveTick] = useState(0);
  const [device, setDevice] = useState<number>(390);
  const [showPreview, setShowPreview] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const dirtyRef = useRef(false);
  const firstRun = useRef(true);

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
    setSaveTick((t) => t + 1);
    if (!showPreview) setShowPreview(true);
  };

  const patch = (fn: (d: MenuDesign) => MenuDesign) => {
    dirtyRef.current = true;
    setWorking(fn);
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

  const previewSrc = useMemo(
    () => `/c/${encodeURIComponent(restaurant.id)}`,
    [restaurant.id],
  );

  const applyPreset = (preset: PalettePreset) =>
    patch((d) => ({ ...d, palette: { ...preset.palette } }));

  const resetDesign = () => {
    if (!window.confirm("إعادة القائمة إلى التصميم الافتراضي؟")) return;
    const next: MenuDesign = {
      ...DEFAULT_MENU_DESIGN,
      palette: {
        ...DEFAULT_MENU_DESIGN.palette,
        accent: restaurant.accent || DEFAULT_MENU_DESIGN.palette.accent,
      },
    };
    setWorking(next);
    dirtyRef.current = true;
    void persist(next);
  };

  const exportJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(working, null, 2));
      setStatus("saved");
      setErrorMsg("نُسخ التصميم إلى الحافظة — شاركه مع متجرك أو احتفظ به نسخة احتياطية.");
    } catch {
      window.prompt("انسخ التصميم يدوياً:", JSON.stringify(working, null, 2));
    }
  };

  const applyImport = () => {
    try {
      const parsed = JSON.parse(importText);
      const next = normalizeMenuDesign(parsed);
      setWorking(next);
      dirtyRef.current = true;
      void persist(next);
      setImportOpen(false);
      setImportText("");
    } catch {
      setStatus("error");
      setErrorMsg("المحتوى غير صالح — تأكد من لصق JSON صحيح.");
    }
  };

  const statusLabel =
    status === "saving"
      ? "جارٍ الحفظ…"
      : status === "error"
        ? "تعذّر الحفظ"
        : status === "saved"
          ? "تم الحفظ ✓"
          : "في انتظار التعديل";

  const statusIcon =
    status === "saving" ? (
      <Loader2 className="md-spin" aria-hidden="true" />
    ) : status === "error" ? (
      <AlertCircle aria-hidden="true" />
    ) : (
      <CheckCircle2 aria-hidden="true" />
    );

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
            غيّر الألوان والخطوط والتخطيط والتفاصيل — كل تعديل يُحفظ تلقائياً
            ويظهر فوراً لعملائك على صفحة المطعم.
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
          <button type="button" className="md-btn md-btn--ghost" onClick={exportJson}>
            <Copy aria-hidden="true" />
            نسخ التصميم
          </button>
          <button type="button" className="md-btn md-btn--ghost" onClick={() => setImportOpen((v) => !v)}>
            <Upload aria-hidden="true" />
            لصق تصميم
          </button>
          <button type="button" className="md-btn md-btn--ghost" onClick={resetDesign}>
            <RefreshCw aria-hidden="true" />
            إعادة الافتراضي
          </button>
        </div>
      </header>

      {importOpen && (
        <div className="md-import">
          <div className="md-import__bar">
            <b>لصق نسخة تصميم (JSON)</b>
            <button type="button" className="md-import__close" onClick={() => setImportOpen(false)} aria-label="إغلاق">
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
            <button type="button" className="md-btn md-btn--red" onClick={applyImport}>
              <Check aria-hidden="true" />
              تطبيق وتثبيت
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

      {canEdit === false && (
        <div className="md-note md-note--warn" role="note">
          <AlertCircle aria-hidden="true" />
          <span>
            الحفظ متاح لحساب <b>المالك أو المدير</b> فقط — يمكنك معاينة آخر
            تصميم محفوظ، وستظهر التعديلات للعملاء بعد حفظها من حساب مالك/مدير.
          </span>
        </div>
      )}

      <StudioBoundary>
        <div className="md__grid">
          <aside className="md__pane" aria-label="خيارات التصميم">
          {/* ---- Palette ---- */}
          <section className="md-sec">
            <header className="md-sec__head">
              <h2>الألوان</h2>
              <p>باقات جاهزة أو ألوانك الخاصة</p>
            </header>
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
                      value={working.palette[field.key]}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          palette: { ...d.palette, [field.key]: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="text"
                      value={working.palette[field.key]}
                      onChange={(e) =>
                        patch((d) => ({
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
          </section>

          {/* ---- Typography ---- */}
          <section className="md-sec">
            <header className="md-sec__head">
              <h2>الخطوط</h2>
              <p>خط العناوين وخط النصوص وحجمها</p>
            </header>
            <div className="md-grid2">
              <label className="md-field">
                <span>خط العناوين</span>
                <select
                  value={working.type.display}
                  onChange={(e) =>
                    patch((d) => ({ ...d, type: { ...d.type, display: e.target.value as MenuDesign["type"]["display"] } }))
                  }
                >
                  {DISPLAY_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md-field">
                <span>خط النصوص</span>
                <select
                  value={working.type.body}
                  onChange={(e) =>
                    patch((d) => ({ ...d, type: { ...d.type, body: e.target.value as MenuDesign["type"]["body"] } }))
                  }
                >
                  {BODY_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="md-rowlabel">سماكة العناوين</div>
            <div className="md-seg" role="group" aria-label="سماكة العناوين">
              {weightOptions.map((weight) => (
                <button
                  type="button"
                  key={weight}
                  className={`md-seg__btn${working.type.weight === weight ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, type: { ...d.type, weight } }))}
                >
                  {weight}
                </button>
              ))}
            </div>
            <div className="md-rowlabel">حجم العناوين</div>
            <div className="md-seg" role="group" aria-label="حجم العناوين">
              {scaleOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`md-seg__btn${working.type.scale === value ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, type: { ...d.type, scale: value } }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* ---- Layout ---- */}
          <section className="md-sec">
            <header className="md-sec__head">
              <h2>التخطيط العام</h2>
              <p>شكل الواجهة، البطاقات، والحواف</p>
            </header>

            <div className="md-rowlabel">شكل الواجهة الرئيسية</div>
            <div className="md-seg" role="group" aria-label="شكل الواجهة">
              {heroOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`md-seg__btn${working.layout.hero === value ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, hero: value } }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="md-rowlabel">أسلوب الأطباق</div>
            <div className="md-seg" role="group" aria-label="أسلوب الأطباق">
              {cardsOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`md-seg__btn${working.layout.cards === value ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, cards: value } }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="md-grid2">
              <div>
                <div className="md-rowlabel">عدد الأعمدة</div>
                <div className="md-seg" role="group" aria-label="عدد الأعمدة">
                  {columnsOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.columns === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, columns: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="md-rowlabel">نسبة صورة الطبق</div>
                <div className="md-seg" role="group" aria-label="نسبة الصورة">
                  {ratioOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.ratio === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, ratio: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md-rowlabel">أسلوب تبويبات الأقسام</div>
            <div className="md-seg" role="group" aria-label="أسلوب التبويبات">
              {tabsOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`md-seg__btn${working.layout.tabs === value ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, tabs: value } }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="md-grid2">
              <div>
                <div className="md-rowlabel">لون السعر</div>
                <div className="md-seg" role="group" aria-label="لون السعر">
                  {priceOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.price === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, price: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="md-rowlabel">زر الإضافة</div>
                <div className="md-seg" role="group" aria-label="زر الإضافة">
                  {addOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.add === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, add: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md-grid3">
              <div>
                <div className="md-rowlabel">الحواف</div>
                <div className="md-seg" role="group" aria-label="الحواف">
                  {radiusOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.radius === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, radius: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="md-rowlabel">المسافات</div>
                <div className="md-seg" role="group" aria-label="المسافات">
                  {densityOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.density === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, density: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="md-rowlabel">الظلال</div>
                <div className="md-seg" role="group" aria-label="الظلال">
                  {shadowOptions.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`md-seg__btn${working.layout.shadow === value ? " is-on" : ""}`}
                      onClick={() => patch((d) => ({ ...d, layout: { ...d.layout, shadow: value } }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ---- Content toggles ---- */}
          <section className="md-sec">
            <header className="md-sec__head">
              <h2>أشياء تظهر وتختفي</h2>
              <p>تحكّم دقيق في عناصر القائمة</p>
            </header>
            <div className="md-toggles">
              {contentToggles.map((toggle) => (
                <label className="md-switch" key={toggle.key}>
                  <span>{toggle.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(working.content[toggle.key])}
                    onChange={(e) =>
                      patch((d) => ({
                        ...d,
                        content: {
                          ...d.content,
                          [toggle.key]: e.target.checked,
                        } as MenuDesign["content"],
                      }))
                    }
                  />
                  <i aria-hidden="true" />
                </label>
              ))}
            </div>

            <div className="md-rowlabel">شريط ترحيبي أعلى الصفحة</div>
            <label className="md-field">
              <input
                type="text"
                value={working.content.bannerText}
                maxLength={160}
                onChange={(e) =>
                  patch((d) => ({ ...d, content: { ...d.content, bannerText: e.target.value } }))
                }
                placeholder="مثال: توصيل مجاني للطلبات فوق 200 ألف ل.س"
              />
            </label>
            <div className="md-seg" role="group" aria-label="نمط الشريط">
              {toneOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`md-seg__btn${working.content.bannerTone === value ? " is-on" : ""}`}
                  onClick={() => patch((d) => ({ ...d, content: { ...d.content, bannerTone: value } }))}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="md-switch md-switch--block">
              <span>إظهار الشريط</span>
              <input
                type="checkbox"
                checked={working.content.bannerOn}
                onChange={(e) =>
                  patch((d) => ({ ...d, content: { ...d.content, bannerOn: e.target.checked } }))
                }
              />
              <i aria-hidden="true" />
            </label>

            <div className="md-rowlabel">الشعار والصورة الرئيسية</div>
            <label className="md-field">
              <span>رابط صورة الشعار (اختياري)</span>
              <input
                type="url"
                value={working.content.logoUrl}
                onChange={(e) =>
                  patch((d) => ({ ...d, content: { ...d.content, logoUrl: e.target.value } }))
                }
                placeholder="https://…/logo.png"
              />
            </label>
            <label className="md-field">
              <span>صورة الواجهة الرئيسية (اختياري)</span>
              <input
                type="url"
                value={working.content.coverUrl}
                onChange={(e) =>
                  patch((d) => ({ ...d, content: { ...d.content, coverUrl: e.target.value } }))
                }
                placeholder="https://…/cover.jpg"
              />
            </label>
          </section>
        </aside>

        {/* ---- Live preview ---- */}
        <section className="md__stage" aria-label="معاينة حية">
          <div className="md__stage-top">
            <div className="md__stage-title">
              <b>معاينة حية</b>
              <small>تُحدَّث تلقائياً بعد كل حفظ</small>
            </div>
            <div className="md-dev" role="group" aria-label="حجم المعاينة">
              {deviceOptions.map((width) => (
                <button
                  type="button"
                  key={width}
                  className={`md-dev__btn${device === width ? " is-on" : ""}`}
                  onClick={() => setDevice(width)}
                >
                  {width}px
                </button>
              ))}
            </div>
            <a
              className="md-btn md-btn--ghost"
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden="true" />
              فتح بملء الشاشة
            </a>
          </div>
          <div className="md__frame-wrap">
            {showPreview ? (
              <div className="md__frame" style={{ width: Math.min(device, 1280) }}>
                <iframe
                  key={saveTick}
                  title={`معاينة قائمة ${restaurant.name}`}
                  src={previewSrc}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="md-preview-idle">
                <button
                  type="button"
                  className="md-btn md-btn--red md-btn--lg"
                  onClick={() => setShowPreview(true)}
                >
                  <Play aria-hidden="true" />
                  تشغيل المعاينة الحية
                </button>
                <p>
                  ستُفتح صفحة المطعم الفعلية داخل إطار بحجم الهاتف/الجهاز
                  لترى تصميمك كما يظهر لعملائك — وتتحدّث تلقائياً بعد كل حفظ.
                </p>
              </div>
            )}
          </div>
        </section>
        </div>
      </StudioBoundary>
    </div>
  );
}
