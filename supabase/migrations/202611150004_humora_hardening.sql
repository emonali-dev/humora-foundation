-- Hardening after the Supabase security advisor run.
alter function public.humora_touch() set search_path = public;
-- Trigger functions never need to be called directly.
revoke execute on function public.humora_touch(), public.humora_audit(), public.humora_donation_guard(), public.humora_expense_guard(),
  public.humora_income_guard(), public.humora_impact_guard(), public.humora_activity_guard(), public.humora_profile_guard()
  from public, anon, authenticated;
-- The rate-limit table is only written by humora_rate_ok(); nobody reads it directly.
create policy humora_rate_limits_none on public.humora_rate_limits for select to authenticated using (false);
-- Note: humora_submit_*, humora_public_* are intentionally callable by anonymous visitors (validated,
-- rate limited). humora_can()/humora_is_admin() must stay executable because RLS policies call them.
