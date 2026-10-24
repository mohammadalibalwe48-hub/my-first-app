import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight, Utensils, X } from "lucide-react";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "quiet";
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={`ui-button ui-button--${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      className={`ui-icon-button ${className}`}
    >
      {children}
    </button>
  );
}
export function FoodPhoto({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | undefined>(undefined);
  return (
    <span
      className={`ui-food-photo ${className}${failed === src || !src ? " is-missing" : ""}`}
    >
      <Utensils
        className="cx-photo-fallback"
        size={30}
        strokeWidth={1.4}
        aria-hidden="true"
      />
      {src && failed !== src && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="ui-section-title">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty cx-empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function DialogHeader({
  title,
  onClose,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <header className="ui-dialog-header">
      <h2>{title}</h2>
      <IconButton label={closeLabel} className="cx-close" onClick={onClose}>
        <X size={20} />
      </IconButton>
    </header>
  );
}
export function ActionArrow() {
  return <ArrowRight size={18} className="ui-arrow" aria-hidden="true" />;
}
