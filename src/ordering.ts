import type { CartLine, Item, Order, RestaurantSettings } from "./domain";

export function calculateTotals(
  subtotal: number,
  settings?: RestaurantSettings,
  deliveryFee = 0,
) {
  const percent = (amount: number, rate: number) =>
    Math.round((amount * Math.round(rate * 100)) / 10000);
  const discount = percent(subtotal, settings?.discountPercent ?? 0);
  const net = subtotal - discount;
  const service = percent(net, settings?.servicePercent ?? 0);
  const tax = percent(net, settings?.taxPercent ?? 0);
  return {
    subtotal,
    discount,
    service,
    tax,
    delivery: deliveryFee,
    total: net + service + tax + deliveryFee,
  };
}

export function rebuildOrder(
  order: Order,
  menu: Item[],
): { lines: CartLine[]; skipped: number } {
  let skipped = 0;
  const lines = order.lines.flatMap((old, index): CartLine[] => {
    const item = menu.find(
      (entry) =>
        entry.id === old.item.id &&
        entry.available &&
        (!entry.availableFrom ||
          Date.parse(entry.availableFrom) <= Date.now()) &&
        (!entry.availableUntil ||
          Date.parse(entry.availableUntil) >= Date.now()),
    );
    const options = item?.options?.flatMap((group) => group.options) ?? [];
    const selected = old.options.map((option) =>
      options.find((entry) => entry.id === option.id),
    );
    // Never silently remove paid options or required choices from a repeated order.
    if (
      !item ||
      selected.some((option) => !option) ||
      item.options?.some(
        (group) =>
          group.required &&
          !selected.some((option) =>
            group.options.some((entry) => entry.id === option?.id),
          ),
      )
    ) {
      skipped++;
      return [];
    }
    return [
      {
        key: `repeat-${order.id}-${index}-${Date.now()}`,
        item,
        options: selected.filter(
          (option): option is NonNullable<typeof option> => !!option,
        ),
        qty: Math.min(100, Math.max(1, old.qty)),
        note: old.note,
      },
    ];
  });
  return { lines, skipped };
}
