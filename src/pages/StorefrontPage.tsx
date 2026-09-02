import { useEffect } from "react";
import { useCafe } from "../context/Cafe";
import { MenuView } from "../features/CustomerUI";

export default function StorefrontPage() {
  const cafe = useCafe();

  useEffect(() => {
    document.title = cafe.restaurant.name || "SYRIAN QR";
  }, [cafe.restaurant.name]);

  return (
    <MenuView
      restaurant={cafe.restaurant}
      categories={cafe.categories}
      currency={cafe.currency}
      setCurrency={cafe.setCurrency}
      category={cafe.category}
      setCategory={cafe.setCategory}
      tag={cafe.tag}
      setTag={cafe.setTag}
      query={cafe.query}
      setQuery={cafe.setQuery}
      items={cafe.availableItems}
      loading={!cafe.ready}
      onSelect={cafe.openItem}
      onQuickAdd={(item) => cafe.addToCart(item)}
    />
  );
}
