-- Platform admins (platform_admins) get access to every restaurant:
-- all RLS policies and admin RPCs route through private.is_restaurant_member.
CREATE OR REPLACE FUNCTION private.is_restaurant_member(
  target uuid,
  allowed public.staff_role[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins a
    WHERE a.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.restaurant_members m
    WHERE m.restaurant_id = target
      AND m.user_id = (SELECT auth.uid())
      AND m.active
      AND (allowed IS NULL OR m.role = any(allowed))
  );
$$;
