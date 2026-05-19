-- ============================================================
-- User Management Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create user_role enum
do $$ begin
  create type user_role as enum ('admin', 'technician', 'viewer');
exception when duplicate_object then null;
end $$;

-- 2. Create user_profiles table
create table if not exists user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         user_role not null default 'technician',
  is_active    boolean not null default true,
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 3. Security-definer helper (avoids RLS recursion when policies reference user_profiles)
create or replace function get_my_role()
returns text language sql security definer stable
as $$
  select role::text from user_profiles where id = auth.uid();
$$;

-- 4. Trigger: auto-create profile row when a new auth user is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'technician')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 5. Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- user_profiles policies
drop policy if exists "users_can_read_own_profile" on user_profiles;
create policy "users_can_read_own_profile"
  on user_profiles for select
  using (id = auth.uid());

drop policy if exists "admins_can_read_all_profiles" on user_profiles;
create policy "admins_can_read_all_profiles"
  on user_profiles for select
  using (get_my_role() = 'admin');

drop policy if exists "admins_can_update_profiles" on user_profiles;
create policy "admins_can_update_profiles"
  on user_profiles for update
  using (get_my_role() = 'admin');

drop policy if exists "admins_can_insert_profiles" on user_profiles;
create policy "admins_can_insert_profiles"
  on user_profiles for insert
  with check (get_my_role() = 'admin');

drop policy if exists "admins_can_delete_profiles" on user_profiles;
create policy "admins_can_delete_profiles"
  on user_profiles for delete
  using (get_my_role() = 'admin');

-- 6. RLS on templates (admins write, all authenticated users read)
alter table templates enable row level security;

drop policy if exists "all_authenticated_can_read_templates" on templates;
create policy "all_authenticated_can_read_templates"
  on templates for select
  using (auth.role() = 'authenticated');

drop policy if exists "admins_can_write_templates" on templates;
create policy "admins_can_write_templates"
  on templates for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- 7. RLS on submissions
alter table submissions enable row level security;

-- Admins can see everything
drop policy if exists "admins_can_read_all_submissions" on submissions;
create policy "admins_can_read_all_submissions"
  on submissions for select
  using (get_my_role() = 'admin');

-- Technicians can only see their own submissions
drop policy if exists "technicians_can_read_own_submissions" on submissions;
create policy "technicians_can_read_own_submissions"
  on submissions for select
  using (user_id = auth.uid());

-- Any authenticated user can insert
drop policy if exists "authenticated_can_insert_submissions" on submissions;
create policy "authenticated_can_insert_submissions"
  on submissions for insert
  with check (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Users can update their own, admins can update all
drop policy if exists "users_can_update_own_submissions" on submissions;
create policy "users_can_update_own_submissions"
  on submissions for update
  using (user_id = auth.uid() OR get_my_role() = 'admin');

-- Users can delete their own, admins can delete all
drop policy if exists "users_can_delete_own_submissions" on submissions;
create policy "users_can_delete_own_submissions"
  on submissions for delete
  using (user_id = auth.uid() OR get_my_role() = 'admin');

-- 8. RLS on photos (storage objects) — handled at bucket level in Supabase dashboard

-- ============================================================
-- BOOTSTRAP STEP (run separately after migration)
-- Replace 'your-email@example.com' with your actual admin email
-- ============================================================
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Check result:
-- SELECT id, email, role, is_active FROM user_profiles;
