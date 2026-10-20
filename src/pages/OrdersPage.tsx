import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCafe } from "../context/Cafe";
import { useUI } from "../context/UI";
import { OrdersView } from "../features/CustomerUI";

export default function OrdersPage() {
  const cafe = useCafe();
  const { language } = useUI();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    document.title = `طلباتي — ${cafe.restaurant.name || ""}`;
  }, [cafe.restaurant.name]);

  return (
    <>
      {cafe.trackingStale && (
        <p role="status">
          {language === "en"
            ? "Updates are temporarily unavailable. Retrying automatically."
            : "تحديث الحالة متعذر مؤقتاً. سنحاول تلقائياً."}
        </p>
      )}
      <OrdersView
        orders={cafe.customerOrders}
        onTrack={cafe.trackOrder}
        onReorder={cafe.reorder}
        onMenu={() => navigate(`/c/${slug}`)}
      />
    </>
  );
}
