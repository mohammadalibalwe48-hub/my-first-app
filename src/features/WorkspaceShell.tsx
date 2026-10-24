import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LogOut,
  Store,
  Utensils,
} from "lucide-react";
import { useUI } from "../context/UI";
import { type RestaurantMembership } from "../domain";
const names: Record<string, [string, string]> = {
  overview: ["نظرة عامة", "Overview"],
  orders: ["الطلبات", "Orders"],
  kitchen: ["المطبخ", "Kitchen"],
  cashier: ["الكاشير", "Cashier"],
  menu: ["المنيو", "Menu"],
  tables: ["الطاولات و QR", "Tables & QR"],
  reports: ["التقارير", "Reports"],
  operations: ["الفريق والتشغيل", "Team & operations"],
  settings: ["الإعدادات", "Settings"],
};
export function WorkspaceShell({
  restaurantName,
  restaurantSlug,
  email,
  role,
  nav,
  tab,
  onSelect,
  memberships,
  onSwitch,
  onSignOut,
  newOrders,
  children,
}: {
  restaurantName: string;
  restaurantSlug: string;
  email: string;
  role: string;
  nav: {
    id: string;
    icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
    count: number;
  }[];
  tab: string;
  onSelect: (id: string) => void;
  memberships: RestaurantMembership[];
  onSwitch: (id: string) => void;
  onSignOut: () => void | Promise<void>;
  newOrders: number;
  children: ReactNode;
}) {
  const { language, toggleLanguage } = useUI();
  const en = language === "en";
  const [account, setAccount] = useState(false);
  const rail = useRef<HTMLElement>(null);
  const navigationKey = nav.map((item) => `${item.id}:${item.count}`).join("|");
  useEffect(() => {
    const reveal = () => {
      const n = rail.current;
      const active = n?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!n || !active || innerWidth > 900) return;
      const outer = n.getBoundingClientRect(),
        item = active.getBoundingClientRect();
      if (item.left < outer.left)
        n.scrollBy({ left: item.left - outer.left - 12, behavior: "instant" });
      else if (item.right > outer.right)
        n.scrollBy({
          left: item.right - outer.right + 12,
          behavior: "instant",
        });
    };
    const frame = requestAnimationFrame(reveal);
    const observer = new ResizeObserver(reveal);
    const content = rail.current?.querySelector(".adm-nav__in");
    if (content) observer.observe(content);
    window.addEventListener("resize", reveal);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", reveal);
    };
  }, [tab, language, navigationKey]);

  return (
    <div className="adm adm--workspace workspace-app">
      <header className="adm-mast workspace-command">
        <div className="workspace-command__brand">
          <span>
            <Utensils size={20} />
          </span>
          <strong>{restaurantName}</strong>
          <small>{en ? "Workspace" : "مساحة العمل"}</small>
        </div>
        <div className="workspace-command__tools">
          <button
            className="workspace-preview"
            onClick={() =>
              window.open(
                `/c/${restaurantSlug}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            {en ? "View menu" : "عرض المنيو"}
            <ArrowRight size={14} />
          </button>
          <button onClick={toggleLanguage}>{en ? "عربي" : "EN"}</button>
          <button
            className="workspace-bell"
            onClick={() =>
              document
                .querySelector(".order-alerts")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            aria-label={en ? "Order notifications" : "تنبيهات الطلبات"}
          >
            <Bell size={19} />
            {newOrders > 0 && <b>{newOrders}</b>}
          </button>
          <button
            className="workspace-account"
            aria-expanded={account}
            onClick={() => setAccount(!account)}
          >
            <span>{email.slice(0, 1).toUpperCase()}</span>
            <ChevronDown size={15} />
          </button>
        </div>
        {account && (
          <div className="workspace-account-menu">
            <strong>{email}</strong>
            <small>{role}</small>
            <button onClick={() => void onSignOut()}>
              <LogOut size={16} />
              {en ? "Sign out" : "تسجيل الخروج"}
            </button>
          </div>
        )}
      </header>
      <nav
        ref={rail}
        className="adm-nav workspace-navigation"
        aria-label={en ? "Restaurant workspace" : "أقسام مساحة العمل"}
      >
        <div className="workspace-switch">
          <Store size={17} />
          <select
            aria-label={en ? "Switch restaurant" : "تبديل المطعم"}
            value={restaurantSlug}
            onChange={(e) => onSwitch(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.restaurantId} value={m.restaurantSlug}>
                {m.restaurantName}
              </option>
            ))}
          </select>
        </div>
        <span className="workspace-nav-label">
          {en ? "YOUR RESTAURANT" : "إدارة المطعم"}
        </span>
        <div className="adm-nav__in">
          {nav.map(({ id, icon: Icon, count }) => (
            <button
              key={id}
              className={`adm-nav__item${id === tab ? " is-on" : ""}`}
              aria-current={id === tab ? "page" : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon size={19} aria-hidden />
              <span>{names[id]?.[en ? 1 : 0] || id}</span>
              {count > 0 && <b>{count}</b>}
            </button>
          ))}
        </div>
        <div className="workspace-nav-help">
          <Utensils size={19} />
          <b>SYRIAN QR</b>
          <small>
            {en ? "Your service, in one place." : "كل الخدمة، بمكان واحد."}
          </small>
        </div>
      </nav>
      <main className="adm-body">
        <div className="adm-body__in">{children}</div>
      </main>
    </div>
  );
}
