import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCafe } from "../context/Cafe";
import { OrdersView } from "../features/CustomerUI";

export default function OrdersPage() {
  const cafe = useCafe();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    document.title = `طلباتي — ${cafe.restaurant.name || ""}`;
  }, [cafe.restaurant.name]);

  return (
    <OrdersView
      orders={cafe.customerOrders}
      onTrack={cafe.trackOrder}
      onMenu={() => navigate(`/c/${slug}`)}
    />
  );
}
