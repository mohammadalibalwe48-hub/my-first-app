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
  platformAdmin: boolean;
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

type AllRestaurantRow = {
  id: string;
  slug: string;
  name_ar: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [platformAdmin, setPlatformAdmin] = useState(false);
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
      setPlatformAdmin(false);
      setAuthReady(true);
      return;
    }

    const { data: memberRows, error: memberError } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role, display_name, restaurants!inner(slug, name_ar)")
      .eq("user_id", user.id)
      .eq("active", true);

    // Resolve platform role (self-registers the bootstrapped owner).
    const { data: adminFlag } = await supabase.rpc("pf_ensure_platform_admin");
    const isPlatformAdmin = adminFlag === true;

    if (!active.current) return;

    let memberships: RestaurantMembership[] = [];
    if (!memberError) {
      const rows = (memberRows ?? []) as unknown as MemberRow[];
      memberships = rows.map((row) => ({
        restaurantId: row.restaurant_id,
        restaurantSlug: row.restaurants.slug,
        restaurantName: row.restaurants.name_ar,
        displayName: row.display_name,
        role: row.role,
      }));
    }

    // Platform admins get access to every restaurant on the platform.
    if (isPlatformAdmin) {
      const { data: allRows } = await supabase
        .from("restaurants")
        .select("id, slug, name_ar")
        .eq("active", true);
      if (active.current && allRows) {
        const existing = new Map(
          memberships.map((m) => [m.restaurantId, m] as const),
        );
        const synthesized = (allRows as unknown as AllRestaurantRow[]).map(
          (row) =>
            existing.get(row.id) ?? {
              restaurantId: row.id,
              restaurantSlug: row.slug,
              restaurantName: row.name_ar,
              displayName: "مدير المنصة",
              role: "owner" as StaffRole,
            },
        );
        memberships = synthesized;
      }
    }

    setMemberships(memberships);
    setPlatformAdmin(isPlatformAdmin);
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
    setPlatformAdmin(false);
    setMemberships([]);
    setAuthReady(true);
  };

  const value: AuthContextValue = {
    authReady,
    staffEmail,
    platformAdmin,
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
