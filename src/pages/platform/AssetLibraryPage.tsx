import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileImage,
  Images,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { supabase } from "../../supabase";
import "./platform.css";
import "./platform-redesign.css";
import "./assets.css";

const BUCKET = "syrianqr-site-assets";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

type MediaAsset = {
  name: string;
  id: string | null;
  updated_at?: string;
  created_at?: string;
  metadata?: { size?: number; mimetype?: string; originalName?: string } | null;
};

const prettySize = (bytes?: number) => {
  if (!bytes || bytes < 1) return "حجم غير معروف";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

const displayName = (asset: MediaAsset) =>
  asset.metadata?.originalName || asset.name.replace(/^\d+-[\w-]+-/, "");

export default function AssetLibraryPage() {
  const { authReady, platformAdmin, staffEmail, signOut } = useAuth();
  const { dir } = useUI();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [copiedPath, setCopiedPath] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      setLoadError(error.message);
      setAssets([]);
    } else {
      setAssets((data ?? []) as MediaAsset[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authReady && platformAdmin) void loadAssets();
  }, [authReady, platformAdmin, loadAssets]);

  const visibleAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) => displayName(asset).toLowerCase().includes(needle));
  }, [assets, query]);

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    const rejected = files.filter((file) => {
      const isSvg = file.name.toLowerCase().endsWith(".svg");
      return (!file.type.startsWith("image/") && !isSvg) || file.size > MAX_FILE_BYTES;
    });
    if (rejected.length) {
      setNotice({
        kind: "error",
        text: "ارفع صوراً فقط (ومنها SVG)، وبحجم أقصى ١٥ م.ب لكل ملف. الملفات غير الصالحة: " +
          rejected.map((file) => file.name).join("، "),
      });
      return;
    }

    setUploading(true);
    setNotice(null);
    const failures: string[] = [];
    let uploaded = 0;
    for (const [index, file] of files.entries()) {
      setUploadProgress(`جارٍ رفع ${index + 1} من ${files.length}: ${file.name}`);
      const safeName = file.name
        .normalize("NFKC")
        .replace(/[\\/\u0000-\u001f]/g, "-")
        .replace(/\s+/g, "-");
      const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const isSvg = file.name.toLowerCase().endsWith(".svg");
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: isSvg ? "image/svg+xml" : file.type,
        metadata: { originalName: file.name },
      });
      if (error) failures.push(`${file.name}: ${error.message}`);
      else uploaded += 1;
    }
    setUploading(false);
    setUploadProgress("");
    setNotice(
      failures.length
        ? { kind: "error", text: `${uploaded} اكتمل رفعها. تعذّر رفع: ${failures.join(" · ")}` }
        : { kind: "success", text: `تم رفع ${uploaded} ${uploaded === 1 ? "ملف" : "ملفات"} إلى مكتبة الموقع.` },
    );
    await loadAssets();
  };

  const copyUrl = async (asset: MediaAsset) => {
    const url = supabase.storage.from(BUCKET).getPublicUrl(asset.name).data.publicUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPath(asset.name);
      window.setTimeout(() => setCopiedPath(""), 1800);
    } catch {
      setNotice({ kind: "error", text: "تعذّر نسخ الرابط. افتح الصورة وانسخ عنوانها من المتصفح." });
    }
  };

  const deleteAsset = async (asset: MediaAsset) => {
    if (!window.confirm(`هل تريد حذف «${displayName(asset)}» نهائياً؟`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([asset.name]);
    if (error) {
      setNotice({ kind: "error", text: `تعذّر حذف الملف: ${error.message}` });
      return;
    }
    setAssets((current) => current.filter((item) => item.name !== asset.name));
    setNotice({ kind: "success", text: "تم حذف الملف." });
  };

  if (!authReady) {
    return (
      <div className="px pa-wait" dir={dir} role="status">
        <Loader2 className="px-spin" aria-hidden />
        جارٍ التحقق من صلاحية المالك…
      </div>
    );
  }
  if (!platformAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="px pa-page" dir={dir}>
      <header className="pa-topbar">
        <div className="pa-brand">
          <span className="pa-brand__mark"><Images aria-hidden /></span>
          <span><b>SYRIAN QR</b><small>مكتبة أصول الموقع</small></span>
        </div>
        <div className="pa-topbar__actions">
          <button type="button" className="px-btn px-btn--ghost" onClick={() => navigate("/platform")}>
            <ArrowLeft aria-hidden /> لوحة المنصة
          </button>
          <button
            type="button"
            className="px-btn px-btn--ghost pa-signout"
            onClick={() => void signOut().then(() => navigate("/"))}
            title={staffEmail}
          >
            <LogOut aria-hidden /> <span>خروج</span>
          </button>
        </div>
      </header>

      <main className="pa-main">
        <div className="pa-heading">
          <div>
            <p className="px-eyebrow"><ShieldCheck aria-hidden /> مساحة مالك الموقع</p>
            <h1>مكتبة الصور والملفات</h1>
            <p>ارفع شعاراتك وصورك مرة واحدة، ثم انسخ الرابط المباشر لاستخدامه في الموقع أو قوائم المطاعم.</p>
          </div>
          <span className="pa-count"><Images aria-hidden /> {assets.length} ملف</span>
        </div>

        <section className="pa-upload" aria-label="رفع ملفات الصور">
          <label className={`pa-drop${uploading ? " is-busy" : ""}`}>
            <input
              className="sr-only"
              type="file"
              accept="image/*,.svg"
              multiple
              disabled={uploading}
              onChange={(event) => void uploadFiles(event)}
            />
            <span className="pa-drop__icon">{uploading ? <Loader2 className="px-spin" /> : <UploadCloud />}</span>
            <span className="pa-drop__copy">
              <b>{uploading ? uploadProgress : "اختر صوراً لرفعها إلى الموقع"}</b>
              <small>PNG · JPG · WEBP · GIF · AVIF · SVG — حتى ١٥ م.ب للملف</small>
            </span>
            <span className="px-btn px-btn--solid pa-drop__button">{uploading ? "جارٍ الرفع…" : "اختيار ملفات"}</span>
          </label>
          <p className="pa-upload__note"><ShieldCheck aria-hidden /> الرفع والحذف متاحان لحساب مالك المنصة فقط. الروابط بعد الرفع عامة لعرض الصور على الموقع.</p>
        </section>

        {notice && (
          <div className={`pa-notice is-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
            {notice.kind === "success" ? <Check aria-hidden /> : <FileImage aria-hidden />}
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="إغلاق">×</button>
          </div>
        )}

        {loadError && (
          <div className="pa-storage-error" role="alert">
            <div className="pa-storage-error__icon"><FileImage aria-hidden /></div>
            <div>
              <b>تحتاج المكتبة إلى تهيئة التخزين أولاً</b>
              <p>تعذّر الوصول إلى مساحة <code>{BUCKET}</code>: {loadError}</p>
              <p>طبّق ترحيل التخزين الموجود في <code>supabase/migrations</code> من Supabase SQL Editor، ثم أعد المحاولة. سيُنشئ مساحة صور عامة بسياسات رفع وحذف للمالك فقط.</p>
            </div>
            <button type="button" className="px-btn px-btn--ghost" onClick={() => void loadAssets()} disabled={loading}>
              <RefreshCw className={loading ? "px-spin" : ""} aria-hidden /> إعادة المحاولة
            </button>
          </div>
        )}

        <section className="pa-library" aria-labelledby="pa-library-title">
          <div className="pa-library__head">
            <div><span className="px-kicker">أصول الموقع</span><h2 id="pa-library-title">الملفات المرفوعة</h2></div>
            <label className="pa-search"><span className="sr-only">ابحث في الصور</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الملف…" /></label>
          </div>

          {loading ? (
            <div className="pa-state" role="status"><Loader2 className="px-spin" aria-hidden /> جارٍ تحميل مكتبة الصور…</div>
          ) : !loadError && visibleAssets.length === 0 ? (
            <div className="pa-state pa-state--empty"><span><Images aria-hidden /></span><b>{assets.length ? "لا توجد نتائج مطابقة" : "مكتبتك جاهزة لصورتك الأولى"}</b><p>{assets.length ? "جرّب البحث باسم مختلف." : "ارفع شعار QR SYRIA أو صور المطاعم هنا؛ ستظهر روابطها فوراً لتستخدمها في صفحات الموقع."}</p></div>
          ) : (
            <div className="pa-grid">
              {visibleAssets.map((asset) => {
                const url = supabase.storage.from(BUCKET).getPublicUrl(asset.name).data.publicUrl;
                const copied = copiedPath === asset.name;
                return (
                  <article className="pa-card" key={asset.id ?? asset.name}>
                    <a className="pa-card__preview" href={url} target="_blank" rel="noreferrer" aria-label={`فتح ${displayName(asset)}`}>
                      <img src={url} alt={displayName(asset)} loading="lazy" />
                      <span className="pa-card__open"><ExternalLink aria-hidden /></span>
                    </a>
                    <div className="pa-card__body">
                      <b title={displayName(asset)}>{displayName(asset)}</b>
                      <small>{prettySize(asset.metadata?.size)}{asset.metadata?.mimetype ? ` · ${asset.metadata.mimetype}` : ""}</small>
                      <div className="pa-card__actions">
                        <button type="button" className="px-btn px-btn--solid" onClick={() => void copyUrl(asset)}>
                          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                          {copied ? "تم النسخ" : "نسخ الرابط"}
                        </button>
                        <button type="button" className="px-iconbtn pa-delete" onClick={() => void deleteAsset(asset)} aria-label={`حذف ${displayName(asset)}`} title="حذف الملف">
                          <Trash2 aria-hidden />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <footer className="pa-foot">مكتبة صور SYRIAN QR <span aria-hidden>·</span> عناوين الملفات مستقرة وقابلة للاستخدام في الموقع العام</footer>
      </main>
    </div>
  );
}
