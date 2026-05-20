-- ============================================================
-- Roles Management Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  is_admin    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed default roles
INSERT INTO public.roles (id, label, description, is_admin) VALUES
  ('admin',      'Admin',      'Volledige toegang tot alle functies en gebruikersbeheer.', true),
  ('technician', 'Technieker', 'Kan eigen checklists invullen en bekijken.', false),
  ('viewer',     'Viewer',     'Alleen-lezen toegang tot eigen checklists.', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Change user_profiles.role from enum to text
--    (USING role::text safely casts existing enum values)
ALTER TABLE user_profiles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'technician';

-- 4. Add must_change_password column (safe to run even if it already exists)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- 5. Enable RLS on roles and add policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_read_roles" ON public.roles;
CREATE POLICY "authenticated_can_read_roles"
  ON public.roles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Write policy uses get_my_role() (no join on roles → no recursion risk)
DROP POLICY IF EXISTS "admins_can_write_roles" ON public.roles;
CREATE POLICY "admins_can_write_roles"
  ON public.roles FOR ALL
  USING (get_my_role() = 'admin' OR get_is_admin())
  WITH CHECK (get_my_role() = 'admin' OR get_is_admin());

-- 6. get_is_admin() — checks the is_admin flag of the user's role
--    SECURITY DEFINER bypasses RLS when joining roles, preventing recursion.
CREATE OR REPLACE FUNCTION public.get_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT r.is_admin
     FROM public.user_profiles up
     JOIN public.roles r ON r.id = up.role
     WHERE up.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_is_admin() TO authenticated, anon, supabase_auth_admin;

-- 7. Update all existing RLS policies to use get_is_admin()
--    so that any role with is_admin = true has full access.

-- user_profiles
DROP POLICY IF EXISTS "admins_can_read_all_profiles" ON user_profiles;
CREATE POLICY "admins_can_read_all_profiles"
  ON user_profiles FOR SELECT
  USING (get_is_admin());

DROP POLICY IF EXISTS "admins_can_update_profiles" ON user_profiles;
CREATE POLICY "admins_can_update_profiles"
  ON user_profiles FOR UPDATE
  USING (get_is_admin());

DROP POLICY IF EXISTS "admins_can_insert_profiles" ON user_profiles;
CREATE POLICY "admins_can_insert_profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (get_is_admin());

DROP POLICY IF EXISTS "admins_can_delete_profiles" ON user_profiles;
CREATE POLICY "admins_can_delete_profiles"
  ON user_profiles FOR DELETE
  USING (get_is_admin());

-- templates
DROP POLICY IF EXISTS "admins_can_write_templates" ON templates;
CREATE POLICY "admins_can_write_templates"
  ON templates FOR ALL
  USING (get_is_admin())
  WITH CHECK (get_is_admin());

-- submissions
DROP POLICY IF EXISTS "admins_can_read_all_submissions" ON submissions;
CREATE POLICY "admins_can_read_all_submissions"
  ON submissions FOR SELECT
  USING (get_is_admin());

DROP POLICY IF EXISTS "users_can_update_own_submissions" ON submissions;
CREATE POLICY "users_can_update_own_submissions"
  ON submissions FOR UPDATE
  USING (user_id = auth.uid() OR get_is_admin());

DROP POLICY IF EXISTS "users_can_delete_own_submissions" ON submissions;
CREATE POLICY "users_can_delete_own_submissions"
  ON submissions FOR DELETE
  USING (user_id = auth.uid() OR get_is_admin());

-- ============================================================
-- Verify
-- SELECT id, label, is_admin FROM roles ORDER BY created_at;
-- SELECT id, email, role FROM user_profiles;
-- ============================================================
