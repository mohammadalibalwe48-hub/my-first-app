import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="adm-hdr">
      <div className="adm-hdr__t">
        <span className="adm-kicker">{kicker}</span>
        <h2 className="adm-title">{title}</h2>
        {lede ? <p className="adm-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="adm-actions">{actions}</div> : null}
    </header>
  );
}

export function AdminEmpty({
  icon: Icon,
  title,
  copy,
  children,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  copy?: string;
  children?: ReactNode;
  tone?: "dark";
}) {
  return (
    <div className={`adm-empty${tone ? " adm-empty--dark" : ""}`}>
      <span className="adm-empty__ico">
        <Icon aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      {copy ? <p className="adm-empty__copy">{copy}</p> : null}
      {children}
    </div>
  );
}
