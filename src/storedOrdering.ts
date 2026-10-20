import {
  images,
  readStored,
  type CartLine,
  type Item,
  type Option,
  type Order,
} from "./domain";

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const amount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const present = <T>(value: T | null): value is T => value !== null;
function option(value: unknown): Option | null {
  if (
    !object(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !amount(value.price)
  )
    return null;
  return {
    id: value.id,
    name: value.name,
    en: text(value.en),
    price: value.price,
  };
}
function line(value: unknown): CartLine | null {
  if (
    !object(value) ||
    typeof value.key !== "string" ||
    !object(value.item) ||
    !Number.isInteger(value.qty) ||
    !amount(value.qty) ||
    value.qty < 1 ||
    value.qty > 100
  )
    return null;
  const item = value.item;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    !amount(item.price)
  )
    return null;
  // Malformed modifiers must not silently change a saved basket's price.
  const options =
    value.options === undefined
      ? []
      : Array.isArray(value.options)
        ? value.options.map(option)
        : null;
  if (!options || options.some((value) => value === null)) return null;
  return {
    key: value.key,
    qty: value.qty,
    note: text(value.note),
    options: options.filter(present),
    item: {
      ...item,
      id: item.id,
      name: item.name,
      en: text(item.en, item.name),
      desc: text(item.desc),
      category: text(item.category),
      image: text(item.image, images.mezze),
      price: item.price,
      available: item.available !== false,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is Item["tags"][number] =>
            ["vegetarian", "spicy", "chef"].includes(String(tag)),
          )
        : [],
    },
  };
}
export function readSavedCart(slug: string): CartLine[] {
  const value = readStored<unknown>(`sufra-cart-${slug}`, []);
  return Array.isArray(value) ? value.map(line).filter(present) : [];
}
export function readSavedOrders(): Order[] {
  const value = readStored<unknown>("sufra-orders", []);
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): Order[] => {
    if (
      !object(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.restaurantId !== "string" ||
      !amount(entry.total) ||
      !Array.isArray(entry.lines)
    )
      return [];
    if (
      !["dine-in", "takeaway", "delivery"].includes(String(entry.mode)) ||
      ![
        "received",
        "confirmed",
        "preparing",
        "ready",
        "out-for-delivery",
        "completed",
        "cancelled",
      ].includes(String(entry.status))
    )
      return [];
    if (
      typeof entry.createdAt !== "string" ||
      !Number.isFinite(Date.parse(entry.createdAt))
    )
      return [];
    const lines = entry.lines.map(line);
    if (lines.some((value) => value === null)) return [];
    return [
      {
        ...entry,
        id: entry.id,
        restaurantId: entry.restaurantId,
        mode: entry.mode as Order["mode"],
        status: entry.status as Order["status"],
        lines: lines.filter(present),
        total: entry.total,
        customer: text(entry.customer),
        phone: text(entry.phone),
        address: text(entry.address),
        table: text(entry.table),
        payment: text(entry.payment),
        paymentStatus: ["pending", "verified", "rejected", "refunded"].includes(
          String(entry.paymentStatus),
        )
          ? (entry.paymentStatus as Order["paymentStatus"])
          : "pending",
        paymentReference: text(entry.paymentReference),
        internalNote: text(entry.internalNote),
        cancellationReason: text(entry.cancellationReason),
        publicToken: text(entry.publicToken) || undefined,
        createdAt: entry.createdAt,
        updatedAt: text(entry.updatedAt, entry.createdAt),
      },
    ];
  });
}
