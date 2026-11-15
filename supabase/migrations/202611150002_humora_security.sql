-- HUMORA FOUNDATION – Row Level Security, public RPCs and storage (part 2 of the core schema)
-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.humora_profiles          enable row level security;
alter table public.humora_rate_limits       enable row level security;
alter table public.humora_settings          enable row level security;
alter table public.humora_content           enable row level security;
alter table public.humora_founders          enable row level security;
alter table public.humora_activities        enable row level security;
alter table public.humora_gallery           enable row level security;
alter table public.humora_testimonials      enable row level security;
alter table public.humora_impact_statistics enable row level security;
alter table public.humora_payment_methods   enable row level security;
alter table public.humora_donations         enable row level security;
alter table public.humora_income            enable row level security;
alter table public.humora_expenses          enable row level security;
alter table public.humora_financial_reports enable row level security;
alter table public.humora_contact_messages  enable row level security;
alter table public.humora_audit_logs        enable row level security;

-- Private tables: no access at all for anonymous visitors.
revoke all on public.humora_profiles, public.humora_rate_limits, public.humora_impact_statistics, public.humora_donations,
              public.humora_income, public.humora_expenses, public.humora_contact_messages, public.humora_audit_logs
  from anon;
revoke all on public.humora_rate_limits from authenticated;
revoke insert, update, delete on public.humora_audit_logs from authenticated;
-- Public-readable tables: anon may only select (and RLS filters to published rows).
revoke insert, update, delete, truncate on public.humora_settings, public.humora_content, public.humora_founders, public.humora_activities,
              public.humora_gallery, public.humora_testimonials, public.humora_payment_methods, public.humora_financial_reports
  from anon;
grant select on public.humora_settings, public.humora_content, public.humora_founders, public.humora_activities,
               public.humora_gallery, public.humora_testimonials, public.humora_payment_methods, public.humora_financial_reports
  to anon, authenticated;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'humora\_%' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy humora_profiles_self_read on public.humora_profiles for select to authenticated
  using (id = auth.uid() or public.humora_can('users'));
create policy humora_profiles_manage on public.humora_profiles for all to authenticated
  using (public.humora_can('users')) with check (public.humora_can('users'));

-- settings / content / founders / testimonials / gallery / activities: public read of published rows, content admins write
create policy humora_settings_read on public.humora_settings for select to anon, authenticated using (true);
create policy humora_settings_write on public.humora_settings for update to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

create policy humora_content_read on public.humora_content for select to anon, authenticated using (true);
create policy humora_content_write on public.humora_content for all to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

create policy humora_founders_read on public.humora_founders for select to anon, authenticated
  using (is_published or public.humora_can('content'));
create policy humora_founders_write on public.humora_founders for all to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

create policy humora_activities_read on public.humora_activities for select to anon, authenticated
  using (status = 'published' or public.humora_is_admin());
create policy humora_activities_write on public.humora_activities for all to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

create policy humora_gallery_read on public.humora_gallery for select to anon, authenticated
  using (is_published or public.humora_can('content'));
create policy humora_gallery_write on public.humora_gallery for all to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

create policy humora_testimonials_read on public.humora_testimonials for select to anon, authenticated
  using (is_published or public.humora_can('content'));
create policy humora_testimonials_write on public.humora_testimonials for all to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

-- impact statistics: read publicly only through humora_public_impact()
create policy humora_impact_admin_read on public.humora_impact_statistics for select to authenticated using (public.humora_is_admin());
create policy humora_impact_write on public.humora_impact_statistics for update to authenticated
  using (public.humora_can('content')) with check (public.humora_can('content'));

-- payment methods: public sees only active + verified
create policy humora_payment_methods_read on public.humora_payment_methods for select to anon, authenticated
  using ((is_active and is_verified) or public.humora_can('finance'));
create policy humora_payment_methods_write on public.humora_payment_methods for all to authenticated
  using (public.humora_can('finance')) with check (public.humora_can('finance'));

-- donations, income, expenses: finance only (public submits through RPC)
create policy humora_donations_finance on public.humora_donations for all to authenticated
  using (public.humora_can('finance')) with check (public.humora_can('finance'));
create policy humora_income_finance on public.humora_income for all to authenticated
  using (public.humora_can('finance')) with check (public.humora_can('finance'));
create policy humora_expenses_finance on public.humora_expenses for all to authenticated
  using (public.humora_can('finance')) with check (public.humora_can('finance'));

create policy humora_reports_read on public.humora_financial_reports for select to anon, authenticated
  using (is_published or public.humora_can('finance'));
create policy humora_reports_write on public.humora_financial_reports for all to authenticated
  using (public.humora_can('finance')) with check (public.humora_can('finance'));

-- contact messages
create policy humora_contact_admin on public.humora_contact_messages for all to authenticated
  using (public.humora_can('messages')) with check (public.humora_can('messages'));

-- audit logs: read-only, never editable
create policy humora_audit_read on public.humora_audit_logs for select to authenticated using (public.humora_can('audit'));

-- ---------------------------------------------------------------------------
-- 9. Public RPCs
-- ---------------------------------------------------------------------------
create or replace function public.humora_submit_donation(
  p_name text, p_email text, p_country text, p_currency text, p_amount numeric,
  p_payment_method_id uuid default null, p_transaction_reference text default null,
  p_message text default null, p_language text default 'en', p_website text default null)
returns json language plpgsql security definer set search_path = public as $$
declare pm record; v_method text; ref text;
begin
  if coalesce(p_website, '') <> '' then return json_build_object('ok', true, 'donation_ref', 'HF-RECEIVED'); end if; -- honeypot
  if not public.humora_rate_ok('donation', 5, interval '1 hour') then raise exception 'HUMORA_RATE_LIMIT'; end if;
  p_name := btrim(regexp_replace(coalesce(p_name,''), '[\x00-\x1f<>]', '', 'g'));
  p_email := lower(btrim(coalesce(p_email,'')));
  p_country := btrim(regexp_replace(coalesce(p_country,''), '[\x00-\x1f<>]', '', 'g'));
  p_message := nullif(btrim(regexp_replace(coalesce(p_message,''), '[\x00-\x08\x0b-\x1f<>]', '', 'g')), '');
  p_transaction_reference := nullif(btrim(regexp_replace(coalesce(p_transaction_reference,''), '[^A-Za-z0-9 ._/#-]', '', 'g')), '');
  if char_length(p_name) not between 2 and 100 then raise exception 'HUMORA_NAME_INVALID'; end if;
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(p_email) > 160 then raise exception 'HUMORA_EMAIL_INVALID'; end if;
  if char_length(p_country) not between 2 and 60 then raise exception 'HUMORA_COUNTRY_INVALID'; end if;
  if p_currency not in ('BDT','USD') then raise exception 'HUMORA_CURRENCY_INVALID'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'HUMORA_AMOUNT_INVALID'; end if;
  if p_message is not null and char_length(p_message) > 1000 then raise exception 'HUMORA_MESSAGE_INVALID'; end if;
  if p_payment_method_id is not null then
    select * into pm from public.humora_payment_methods where id = p_payment_method_id and is_active and is_verified;
    if not found then raise exception 'HUMORA_METHOD_INVALID'; end if;
    if pm.currency <> 'ANY' and pm.currency <> p_currency then raise exception 'HUMORA_METHOD_CURRENCY'; end if;
    v_method := pm.name_en;
  end if;
  insert into public.humora_donations (donor_name, email, country, currency, amount, payment_method, payment_method_id,
                                       transaction_reference, message, language, status, client_hash)
  values (p_name, p_email, p_country, p_currency, round(p_amount, 2), v_method, p_payment_method_id,
          p_transaction_reference, p_message, case when p_language = 'bn' then 'bn' else 'en' end,
          case when p_transaction_reference is null then 'pending' else 'payment_submitted' end, public.humora_client_hash())
  returning donation_ref into ref;
  return json_build_object('ok', true, 'donation_ref', ref,
    'status', case when p_transaction_reference is null then 'pending' else 'payment_submitted' end);
end $$;

-- After paying, a donor adds the transaction reference to their pledge.
create or replace function public.humora_submit_payment_reference(p_donation_ref text, p_email text, p_transaction_reference text)
returns json language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.humora_rate_ok('donation_ref', 10, interval '1 hour') then raise exception 'HUMORA_RATE_LIMIT'; end if;
  p_transaction_reference := nullif(btrim(regexp_replace(coalesce(p_transaction_reference,''), '[^A-Za-z0-9 ._/#-]', '', 'g')), '');
  if p_transaction_reference is null or char_length(p_transaction_reference) > 100 then raise exception 'HUMORA_REFERENCE_INVALID'; end if;
  update public.humora_donations
     set transaction_reference = p_transaction_reference, status = 'payment_submitted', updated_at = now()
   where donation_ref = upper(btrim(p_donation_ref)) and lower(email) = lower(btrim(p_email)) and status in ('pending','payment_submitted');
  get diagnostics n = row_count;
  if n = 0 then raise exception 'HUMORA_DONATION_NOT_FOUND'; end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.humora_submit_contact(
  p_name text, p_email text, p_subject text, p_message text, p_language text default 'en', p_website text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_website, '') <> '' then return json_build_object('ok', true); end if; -- honeypot
  if not public.humora_rate_ok('contact', 5, interval '1 hour') then raise exception 'HUMORA_RATE_LIMIT'; end if;
  p_name := btrim(regexp_replace(coalesce(p_name,''), '[\x00-\x1f<>]', '', 'g'));
  p_email := lower(btrim(coalesce(p_email,'')));
  p_subject := btrim(regexp_replace(coalesce(p_subject,''), '[\x00-\x1f<>]', '', 'g'));
  p_message := btrim(regexp_replace(coalesce(p_message,''), '[\x00-\x08\x0b-\x1f<>]', '', 'g'));
  if char_length(p_name) not between 2 and 100 then raise exception 'HUMORA_NAME_INVALID'; end if;
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(p_email) > 160 then raise exception 'HUMORA_EMAIL_INVALID'; end if;
  if char_length(p_subject) not between 2 and 160 then raise exception 'HUMORA_SUBJECT_INVALID'; end if;
  if char_length(p_message) not between 10 and 4000 then raise exception 'HUMORA_MESSAGE_INVALID'; end if;
  insert into public.humora_contact_messages (name, email, subject, message, language, client_hash)
  values (p_name, p_email, p_subject, p_message, case when p_language = 'bn' then 'bn' else 'en' end, public.humora_client_hash());
  return json_build_object('ok', true);
end $$;

-- Impact numbers: a value is only shown once an admin has marked it verified.
create or replace function public.humora_public_impact()
returns table (metric_name text, metric_value bigint, is_verified boolean, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select metric_name, case when is_verified then metric_value end, is_verified, updated_at
  from public.humora_impact_statistics order by array_position(array['people_helped','children_supported','families_assisted','projects_completed'], metric_name)
$$;

-- Verified financial totals only (verified donations, verified income, approved expenses). No donor data.
create or replace function public.humora_public_finance()
returns json language plpgsql stable security definer set search_path = public as $$
declare enabled boolean;
begin
  select show_transparency into enabled from public.humora_settings where id = 1;
  if not coalesce(enabled, false) then return json_build_object('enabled', false); end if;
  return json_build_object(
    'enabled', true,
    'totals', coalesce((
      select json_agg(t order by t.currency) from (
        select c.currency,
               coalesce((select sum(amount) from public.humora_donations where status = 'verified' and currency = c.currency), 0) as donations,
               coalesce((select sum(amount) from public.humora_income where is_verified and currency = c.currency), 0) as other_income,
               coalesce((select sum(amount) from public.humora_expenses where approved_by is not null and currency = c.currency), 0) as expenses,
               coalesce((select count(*) from public.humora_donations where status = 'verified' and currency = c.currency), 0) as donation_count
        from (values ('BDT'), ('USD')) as c(currency)
      ) t), '[]'::json),
    'monthly', coalesce((
      select json_agg(m order by m.month desc, m.currency) from (
        select to_char(d, 'YYYY-MM') as month, currency, sum(inc) as income, sum(exp) as expenses
        from (
          select date_trunc('month', verified_at)::date d, currency, amount inc, 0::numeric exp from public.humora_donations where status = 'verified'
          union all select date_trunc('month', income_date)::date, currency, amount, 0 from public.humora_income where is_verified
          union all select date_trunc('month', expense_date)::date, currency, 0, amount from public.humora_expenses where approved_by is not null
        ) x group by d, currency
      ) m), '[]'::json),
    'by_category', coalesce((
      select json_agg(k order by k.currency, k.amount desc) from (
        select category, currency, sum(amount) amount from public.humora_expenses where approved_by is not null group by category, currency
      ) k), '[]'::json),
    'updated_at', now()
  );
end $$;

revoke all on function public.humora_submit_donation(text,text,text,text,numeric,uuid,text,text,text,text) from public;
revoke all on function public.humora_submit_payment_reference(text,text,text) from public;
revoke all on function public.humora_submit_contact(text,text,text,text,text,text) from public;
revoke all on function public.humora_public_impact() from public;
revoke all on function public.humora_public_finance() from public;
grant execute on function public.humora_submit_donation(text,text,text,text,numeric,uuid,text,text,text,text) to anon, authenticated;
grant execute on function public.humora_submit_payment_reference(text,text,text) to anon, authenticated;
grant execute on function public.humora_submit_contact(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.humora_public_impact() to anon, authenticated;
grant execute on function public.humora_public_finance() to anon, authenticated;
revoke all on function public.humora_rate_ok(text,integer,interval) from public, anon, authenticated;
revoke all on function public.humora_client_hash() from public, anon, authenticated;
revoke all on function public.humora_role() from public, anon;
revoke all on function public.humora_can(text) from public, anon;
revoke all on function public.humora_is_admin() from public, anon;
grant execute on function public.humora_role() to authenticated;
grant execute on function public.humora_can(text) to authenticated;
grant execute on function public.humora_is_admin() to authenticated;
-- policies on anon-readable tables call humora_is_admin()/humora_can(); anon needs execute for policy evaluation
grant execute on function public.humora_is_admin() to anon;
grant execute on function public.humora_can(text) to anon;

-- Admin helper: look up a user id by email (used by the humora-admin edge function only).
create or replace function public.humora_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1
$$;
revoke all on function public.humora_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.humora_user_id_by_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('humora-media', 'humora-media', true, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('humora-receipts', 'humora-receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists humora_media_insert on storage.objects;
drop policy if exists humora_media_update on storage.objects;
drop policy if exists humora_media_delete on storage.objects;
drop policy if exists humora_receipts_all on storage.objects;
create policy humora_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'humora-media' and (public.humora_can('content') or public.humora_can('finance')));
create policy humora_media_update on storage.objects for update to authenticated
  using (bucket_id = 'humora-media' and (public.humora_can('content') or public.humora_can('finance')));
create policy humora_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'humora-media' and (public.humora_can('content') or public.humora_can('finance')));
create policy humora_receipts_all on storage.objects for all to authenticated
  using (bucket_id = 'humora-receipts' and public.humora_can('finance'))
  with check (bucket_id = 'humora-receipts' and public.humora_can('finance'));
