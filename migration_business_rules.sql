-- migration_business_rules.sql
-- Voer dit eenmalig uit in Supabase → SQL Editor
-- Maakt de "Bedrijfsregels" functie beschikbaar in de admin pagina.

-- ─── Tabel: business_rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text DEFAULT '',
  active          boolean DEFAULT true,
  trigger_on      text DEFAULT 'completed',   -- 'completed' | 'save' | 'both'
  template_scope  text[] DEFAULT '{}',         -- lege array = alle templates
  condition_logic text DEFAULT 'AND',          -- 'AND' | 'OR'
  conditions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Elke conditie: { question_key, operator, value }
  -- operator: 'equals' | 'not_equals' | 'contains' | 'is_checked' | 'is_not_checked'
  --           | 'is_filled' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_any_of'
  action_type     text NOT NULL,               -- 'send_email' | 'homepage_alert'
  action_config   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- send_email:     { to, subject, message, include_report }
  -- homepage_alert: { message, color }  -- color: 'red'|'orange'|'blue'|'green'
  created_at      timestamptz DEFAULT now(),
  created_by      uuid  -- auth.users FK niet nodig; Supabase beheert auth apart
);

-- ─── Tabel: rule_notifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rule_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid REFERENCES public.business_rules(id) ON DELETE CASCADE,
  rule_name       text NOT NULL,
  submission_id   uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  template_name   text,
  customer        text,
  location        text,
  message         text,
  alert_color     text DEFAULT 'orange',
  created_at      timestamptz DEFAULT now(),
  dismissed_at    timestamptz,
  dismissed_by    uuid  -- auth.users FK niet nodig; Supabase beheert auth apart
);

-- ─── RLS: business_rules ─────────────────────────────────────────────────────
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- Alleen admins mogen regels lezen en beheren
CREATE POLICY "admins_all_rules" ON public.business_rules
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true));

-- Alle ingelogde gebruikers mogen actieve regels lezen (nodig voor evaluatie in fill.html)
CREATE POLICY "authenticated_read_active_rules" ON public.business_rules
  FOR SELECT TO authenticated
  USING (active = true);

-- ─── RLS: rule_notifications ──────────────────────────────────────────────────
ALTER TABLE public.rule_notifications ENABLE ROW LEVEL SECURITY;

-- Alle ingelogde gebruikers mogen notificaties aanmaken (rule-evaluatie in fill.html)
CREATE POLICY "authenticated_insert_notifications" ON public.rule_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Alleen admins mogen notificaties lezen en bijwerken (dismissal)
CREATE POLICY "admins_read_notifications" ON public.rule_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "admins_update_notifications" ON public.rule_notifications
  FOR UPDATE TO authenticated
  USING   (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "admins_delete_notifications" ON public.rule_notifications
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true));
