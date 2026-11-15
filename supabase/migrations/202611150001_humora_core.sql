-- =============================================================================
-- HUMORA FOUNDATION – core schema
-- Every object is prefixed humora_ so it can live safely in a shared Supabase
-- project. Public visitors only ever read published content and aggregated,
-- verified financial totals. Donor records, messages, receipts and all admin
-- data are private and protected by Row Level Security.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Admin profiles and permissions
-- ---------------------------------------------------------------------------
create table if not exists public.humora_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 100),
  email       text not null,
  role        text not null check (role in ('super_admin','admin','editor','finance')),
  active      boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists humora_profiles_email_idx on public.humora_profiles (lower(email));

-- Role of the signed-in user (null when not an active HUMORA admin).
create or replace function public.humora_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.humora_profiles where id = auth.uid() and active
$$;

-- Capabilities: content, finance, messages, audit, users
create or replace function public.humora_can(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case role
      when 'super_admin' then true
      when 'admin'       then cap in ('content','finance','messages','audit')
      when 'editor'      then cap in ('content','messages')
      when 'finance'     then cap in ('finance')
      else false end
    from public.humora_profiles where id = auth.uid() and active
  ), false)
$$;

create or replace function public.humora_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.humora_profiles where id = auth.uid() and active)
$$;

-- ---------------------------------------------------------------------------
-- 2. Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.humora_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Hash of the caller's IP address (never stored in clear text).
create or replace function public.humora_client_hash()
returns text language plpgsql stable security definer set search_path = public, extensions as $$
declare h json; ip text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  ip := coalesce(split_part(h->>'x-forwarded-for', ',', 1), h->>'cf-connecting-ip', 'unknown');
  return encode(extensions.digest('humora:' || trim(ip), 'sha256'), 'hex');
end $$;

create table if not exists public.humora_rate_limits (
  bucket       text not null,
  client_hash  text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, client_hash, window_start)
);

-- Returns true when the caller is still under the limit (and counts the hit).
create or replace function public.humora_rate_ok(p_bucket text, p_limit integer, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
        n integer;
begin
  delete from public.humora_rate_limits where window_start < now() - interval '2 days';
  insert into public.humora_rate_limits as r (bucket, client_hash, window_start, hits)
  values (p_bucket, public.humora_client_hash(), w, 1)
  on conflict (bucket, client_hash, window_start) do update set hits = r.hits + 1
  returning hits into n;
  return n <= p_limit;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Website settings and bilingual content
-- ---------------------------------------------------------------------------
create table if not exists public.humora_settings (
  id                 smallint primary key default 1 check (id = 1),
  contact_email      text check (contact_email is null or contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  phone              text check (phone is null or char_length(phone) <= 30),
  whatsapp           text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{8,15}$'),
  address_en         text check (address_en is null or char_length(address_en) <= 300),
  address_bn         text check (address_bn is null or char_length(address_bn) <= 300),
  facebook_url       text check (facebook_url is null or facebook_url ~ '^https://'),
  instagram_url      text check (instagram_url is null or instagram_url ~ '^https://'),
  youtube_url        text check (youtube_url is null or youtube_url ~ '^https://'),
  x_url              text check (x_url is null or x_url ~ '^https://'),
  linkedin_url       text check (linkedin_url is null or linkedin_url ~ '^https://'),
  hero_image_url     text check (hero_image_url is null or hero_image_url ~ '^https://'),
  about_image_url    text check (about_image_url is null or about_image_url ~ '^https://'),
  site_url           text check (site_url is null or site_url ~ '^https://'),
  registration_info  text check (registration_info is null or char_length(registration_info) <= 200),
  show_transparency  boolean not null default true,
  updated_at         timestamptz not null default now()
);
insert into public.humora_settings (id) values (1) on conflict do nothing;

create table if not exists public.humora_content (
  key        text primary key check (key ~ '^[a-z0-9_.]{2,80}$'),
  section    text not null default 'general',
  value_en   text not null default '' check (char_length(value_en) <= 5000),
  value_bn   text not null default '' check (char_length(value_bn) <= 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.humora_founders (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null check (char_length(name_en) between 2 and 100),
  name_bn     text not null default '' check (char_length(name_bn) <= 100),
  role_en     text not null default '' check (char_length(role_en) <= 100),
  role_bn     text not null default '' check (char_length(role_bn) <= 100),
  bio_en      text not null default '' check (char_length(bio_en) <= 2000),
  bio_bn      text not null default '' check (char_length(bio_bn) <= 2000),
  photo_url   text check (photo_url is null or photo_url ~ '^https://'),
  sort_order  integer not null default 0,
  is_published boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Activities, gallery, testimonials, impact
-- ---------------------------------------------------------------------------
create table if not exists public.humora_activities (
  id             uuid primary key default gen_random_uuid(),
  category       text not null check (category in ('food','clothing','children','medical','winter','education','emergency','other')),
  title_en       text not null check (char_length(title_en) between 3 and 160),
  title_bn       text not null check (char_length(title_bn) between 2 and 160),
  description_en text not null check (char_length(description_en) between 10 and 10000),
  description_bn text not null check (char_length(description_bn) between 10 and 10000),
  location       text not null check (char_length(location) between 2 and 160),
  location_bn    text not null default '' check (char_length(location_bn) <= 160),
  activity_date  date not null,
  image_url      text check (image_url is null or image_url ~ '^https://'),
  status         text not null default 'draft' check (status in ('draft','published','archived')),
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint humora_activities_publish_image check (status <> 'published' or image_url is not null)
);
create index if not exists humora_activities_status_date_idx on public.humora_activities (status, activity_date desc);

create table if not exists public.humora_gallery (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 160),
  title_bn     text not null default '' check (char_length(title_bn) <= 160),
  image_url    text not null check (image_url ~ '^https://'),
  activity_id  uuid references public.humora_activities(id) on delete set null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists humora_gallery_activity_idx on public.humora_gallery (activity_id);
create index if not exists humora_gallery_pub_idx on public.humora_gallery (is_published, created_at desc);

create table if not exists public.humora_testimonials (
  id             uuid primary key default gen_random_uuid(),
  person_name    text not null check (char_length(person_name) between 2 and 100),
  description    text not null check (char_length(description) between 10 and 1500),
  description_bn text not null default '' check (char_length(description_bn) <= 1500),
  location       text check (location is null or char_length(location) <= 120),
  image_url      text check (image_url is null or image_url ~ '^https://'),
  consent_confirmed boolean not null default false,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint humora_testimonials_consent check (not is_published or consent_confirmed)
);

create table if not exists public.humora_impact_statistics (
  id           uuid primary key default gen_random_uuid(),
  metric_name  text not null unique check (metric_name in ('people_helped','children_supported','families_assisted','projects_completed')),
  metric_value bigint check (metric_value is null or metric_value >= 0),
  is_verified  boolean not null default false,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  constraint humora_impact_verified_value check (not is_verified or metric_value is not null)
);
insert into public.humora_impact_statistics (metric_name) values
  ('people_helped'),('children_supported'),('families_assisted'),('projects_completed')
on conflict (metric_name) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Payments, donations and finance
-- ---------------------------------------------------------------------------
create table if not exists public.humora_payment_methods (
  id              uuid primary key default gen_random_uuid(),
  name_en         text not null check (char_length(name_en) between 2 and 80),
  name_bn         text not null default '' check (char_length(name_bn) <= 80),
  method_type     text not null check (method_type in ('bank','mobile_banking','international','other')),
  currency        text not null check (currency in ('BDT','USD','ANY')),
  account_name    text check (account_name is null or char_length(account_name) <= 120),
  account_details text check (account_details is null or char_length(account_details) <= 600),
  instructions_en text not null default '' check (char_length(instructions_en) <= 2000),
  instructions_bn text not null default '' check (char_length(instructions_bn) <= 2000),
  is_verified     boolean not null default false,
  is_active       boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint humora_payment_methods_active_verified check (not is_active or is_verified)
);

create table if not exists public.humora_donations (
  id                    uuid primary key default gen_random_uuid(),
  donation_ref          text not null unique default ('HF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  donor_name            text not null check (char_length(donor_name) between 2 and 100),
  email                 text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 160),
  country               text not null check (char_length(country) between 2 and 60),
  currency              text not null check (currency in ('BDT','USD')),
  amount                numeric(14,2) not null check (amount > 0 and amount <= 100000000),
  payment_method        text check (payment_method is null or char_length(payment_method) <= 80),
  payment_method_id     uuid references public.humora_payment_methods(id) on delete set null,
  transaction_reference text check (transaction_reference is null or char_length(transaction_reference) <= 100),
  message               text check (message is null or char_length(message) <= 1000),
  language              text not null default 'en' check (language in ('en','bn')),
  status                text not null default 'pending' check (status in ('pending','payment_submitted','verified','rejected')),
  admin_note            text check (admin_note is null or char_length(admin_note) <= 1000),
  verified_by           uuid references auth.users(id) on delete set null,
  verified_at           timestamptz,
  client_hash           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint humora_donations_verified_meta check (status not in ('verified','rejected') or (verified_by is not null and verified_at is not null))
);
create index if not exists humora_donations_status_idx on public.humora_donations (status, created_at desc);
create index if not exists humora_donations_email_idx on public.humora_donations (lower(email));

create table if not exists public.humora_income (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 160),
  title_bn     text not null default '' check (char_length(title_bn) <= 160),
  description  text check (description is null or char_length(description) <= 2000),
  source       text check (source is null or char_length(source) <= 160),
  amount       numeric(14,2) not null check (amount > 0 and amount <= 100000000),
  currency     text not null check (currency in ('BDT','USD')),
  income_date  date not null,
  receipt_path text check (receipt_path is null or char_length(receipt_path) <= 300),
  is_verified  boolean not null default false,
  verified_by  uuid references auth.users(id) on delete set null,
  verified_at  timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists humora_income_date_idx on public.humora_income (income_date desc);

create table if not exists public.humora_expenses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 160),
  title_bn     text not null default '' check (char_length(title_bn) <= 160),
  description  text check (description is null or char_length(description) <= 2000),
  amount       numeric(14,2) not null check (amount > 0 and amount <= 100000000),
  currency     text not null check (currency in ('BDT','USD')),
  expense_date date not null,
  category     text not null check (category in ('food','clothing','children','medical','winter','education','emergency','operations','other')),
  activity_id  uuid references public.humora_activities(id) on delete set null,
  receipt_url  text check (receipt_url is null or char_length(receipt_url) <= 300),
  approved_by  uuid references auth.users(id) on delete set null,
  approved_at  timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists humora_expenses_date_idx on public.humora_expenses (expense_date desc);

create table if not exists public.humora_financial_reports (
  id           uuid primary key default gen_random_uuid(),
  report_type  text not null check (report_type in ('monthly','annual','statement','audit')),
  title_en     text not null check (char_length(title_en) between 3 and 160),
  title_bn     text not null default '' check (char_length(title_bn) <= 160),
  summary_en   text not null default '' check (char_length(summary_en) <= 3000),
  summary_bn   text not null default '' check (char_length(summary_bn) <= 3000),
  period_start date not null,
  period_end   date not null,
  file_url     text check (file_url is null or file_url ~ '^https://'),
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint humora_reports_period check (period_end >= period_start)
);

-- ---------------------------------------------------------------------------
-- 6. Contact messages and audit log
-- ---------------------------------------------------------------------------
create table if not exists public.humora_contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 100),
  email       text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 160),
  subject     text not null check (char_length(subject) between 2 and 160),
  message     text not null check (char_length(message) between 10 and 4000),
  language    text not null default 'en' check (language in ('en','bn')),
  status      text not null default 'new' check (status in ('new','read','replied','archived')),
  client_hash text,
  created_at  timestamptz not null default now()
);
create index if not exists humora_contact_status_idx on public.humora_contact_messages (status, created_at desc);

create table if not exists public.humora_audit_logs (
  id          bigint generated always as identity primary key,
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists humora_audit_created_idx on public.humora_audit_logs (created_at desc);
create index if not exists humora_audit_table_idx on public.humora_audit_logs (table_name, created_at desc);

-- Generic audit trigger. Financial tables keep the full before/after row.
create or replace function public.humora_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid text; det jsonb;
begin
  if auth.uid() is null then return coalesce(new, old); end if;   -- public RPC inserts are not admin actions
  rid := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'), (to_jsonb(new)->>'key'), (to_jsonb(old)->>'key'));
  if tg_table_name in ('humora_donations','humora_income','humora_expenses','humora_payment_methods','humora_profiles','humora_impact_statistics') then
    det := jsonb_build_object('before', case when tg_op <> 'INSERT' then to_jsonb(old) - 'client_hash' end,
                              'after',  case when tg_op <> 'DELETE' then to_jsonb(new) - 'client_hash' end);
  else
    det := null;
  end if;
  insert into public.humora_audit_logs (admin_id, action, table_name, record_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, rid, det);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- 7. Integrity triggers
-- ---------------------------------------------------------------------------
create or replace function public.humora_donation_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('verified','rejected') then
    new.verified_by := auth.uid();
    new.verified_at := now();
  elsif new.status in ('pending','payment_submitted') then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.humora_expense_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.approved_by is not null then new.approved_by := auth.uid(); new.approved_at := now(); end if;
  elsif new.approved_by is distinct from old.approved_by then
    if new.approved_by is not null then new.approved_by := auth.uid(); new.approved_at := now();
    else new.approved_at := null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.humora_income_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  if new.is_verified and (tg_op = 'INSERT' or not old.is_verified) then
    new.verified_by := auth.uid(); new.verified_at := now();
  elsif not new.is_verified then
    new.verified_by := null; new.verified_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.humora_impact_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_by := auth.uid(); new.updated_at := now(); return new; end $$;

create or replace function public.humora_activity_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin if tg_op = 'INSERT' then new.created_by := auth.uid(); end if; new.updated_at := now(); return new; end $$;

-- A super admin cannot remove the last active super admin.
create or replace function public.humora_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'super_admin' and old.active)
     or (tg_op = 'UPDATE' and old.role = 'super_admin' and old.active and (new.role <> 'super_admin' or not new.active)) then
    if (select count(*) from public.humora_profiles where role = 'super_admin' and active and id <> old.id) = 0 then
      raise exception 'HUMORA_LAST_SUPER_ADMIN';
    end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); new.id := old.id; new.email := old.email; end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  -- updated_at
  foreach t in array array['humora_settings','humora_content','humora_founders','humora_payment_methods','humora_financial_reports'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.humora_touch()', t, t);
  end loop;
  -- audit
  foreach t in array array['humora_profiles','humora_settings','humora_content','humora_founders','humora_activities','humora_gallery',
                           'humora_testimonials','humora_impact_statistics','humora_payment_methods','humora_donations','humora_income',
                           'humora_expenses','humora_financial_reports','humora_contact_messages'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.humora_audit()', t, t);
  end loop;
end $$;

drop trigger if exists humora_donations_guard on public.humora_donations;
create trigger humora_donations_guard before update on public.humora_donations for each row execute function public.humora_donation_guard();
drop trigger if exists humora_expenses_guard on public.humora_expenses;
create trigger humora_expenses_guard before insert or update on public.humora_expenses for each row execute function public.humora_expense_guard();
drop trigger if exists humora_income_guard on public.humora_income;
create trigger humora_income_guard before insert or update on public.humora_income for each row execute function public.humora_income_guard();
drop trigger if exists humora_impact_guard on public.humora_impact_statistics;
create trigger humora_impact_guard before update on public.humora_impact_statistics for each row execute function public.humora_impact_guard();
drop trigger if exists humora_activities_guard on public.humora_activities;
create trigger humora_activities_guard before insert or update on public.humora_activities for each row execute function public.humora_activity_guard();
drop trigger if exists humora_profiles_guard on public.humora_profiles;
create trigger humora_profiles_guard before update or delete on public.humora_profiles for each row execute function public.humora_profile_guard();
