import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../supabase";
import type { RestaurantMembership, StaffRole } from "../domain";

type AuthContextValue = {
  authReady: boolean;
  staffEmail: string;
  memberships: RestaurantMembership[];
  refresh: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type MemberRow = {
  restaurant_id: string;
  role: StaffRole;
  display_name: string;
  restaurants: { slug: string; name_ar: string };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [memberships, setMemberships] = useState<RestaurantMembership[]>([]);
  const active = useRef(true);

  const loadIdentity = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!active.current) return;

    setStaffEmail(user?.email ?? "");
    if (!user) {
      setMemberships([]);
      setAuthReady(true);
      return;
    }

    const { data, error } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role, display_name, restaurants!inner(slug, name_ar)")
      .eq("user_id", user.id)
      .eq("active", true);

    if (!active.current) return;
    if (error) {
      setMemberships([]);
    } else {
      const rows = (data ?? []) as unknown as MemberRow[];
      setMemberships(
        rows.map((row) => ({
          restaurantId: row.restaurant_id,
          restaurantSlug: row.restaurants.slug,
          restaurantName: row.restaurants.name_ar,
          displayName: row.display_name,
          role: row.role,
        })),
      );
    }
    setAuthReady(true);
  };

  useEffect(() => {
    active.current = true;
    void loadIdentity();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setAuthReady(false);
      window.setTimeout(() => void loadIdentity(), 0);
    });

    return () => {
      active.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setStaffEmail("");
    setMemberships([]);
    setAuthReady(true);
  };

  const value: AuthContextValue = {
    authReady,
    staffEmail,
    memberships,
    refresh: () => void loadIdentity(),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
