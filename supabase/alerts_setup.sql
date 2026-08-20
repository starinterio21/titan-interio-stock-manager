-- ============================================================
-- Titan Interio Stock Manager — Stock Alert Email System
-- Run this AFTER schema.sql, seed_categories.sql, seed_items.sql
-- ============================================================

-- Singleton settings row (one config for the whole system)
create table if not exists alert_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  recipient_emails text[] not null default '{}',
  enabled boolean not null default false,
  frequency text not null default 'daily' check (frequency in ('every_6_hours', 'daily', 'weekly')),
  send_hour int not null default 9 check (send_hour between 0 and 23),  -- 24hr, in IST
  weekly_day int not null default 1 check (weekly_day between 0 and 6),  -- 0=Sunday, used only if frequency='weekly'
  include_low_stock boolean not null default true,
  include_out_of_stock boolean not null default true,
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Ensure exactly one row exists
insert into alert_settings (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

alter table alert_settings enable row level security;

create policy "Anyone authenticated can view alert settings" on alert_settings
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage alert settings" on alert_settings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- CRON SETUP — run this AFTER you've deployed the Edge Function
-- (see README.md "Setting up email alerts" section)
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY before running.
-- ============================================================

-- Enable required extensions (Supabase usually has these pre-enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Runs every hour; the Edge Function itself decides whether it's
-- actually time to send based on your settings (frequency/hour/day)
select cron.schedule(
  'titan-stock-alert-check',
  '0 * * * *',  -- every hour, on the hour
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-stock-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check the cron job is registered:
-- select * from cron.job;

-- To remove it later if needed:
-- select cron.unschedule('titan-stock-alert-check');
