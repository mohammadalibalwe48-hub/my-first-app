import type { StaffRole } from "./domain";
export type WorkspaceTab =
  | "overview"
  | "orders"
  | "kitchen"
  | "cashier"
  | "menu"
  | "tables"
  | "reports"
  | "operations"
  | "design"
  | "settings";
export function allowedWorkspaceTabs(role: StaffRole): WorkspaceTab[] {
  if (role === "owner" || role === "manager")
    return [
      "overview",
      "orders",
      "kitchen",
      "cashier",
      "menu",
      "tables",
      "reports",
      "operations",
      "design",
      "settings",
    ];
  if (role === "kitchen") return ["kitchen"];
  if (role === "cashier") return ["cashier"];
  return ["kitchen"];
}
