-- Table privileges for signed-in users. Row Level Security still decides which
-- rows each admin role may see or change; anonymous visitors get no direct access
-- to private tables.
grant select, insert, update, delete on public.humora_profiles, public.humora_settings, public.humora_content, public.humora_founders,
  public.humora_activities, public.humora_gallery, public.humora_testimonials, public.humora_impact_statistics, public.humora_payment_methods,
  public.humora_donations, public.humora_income, public.humora_expenses, public.humora_financial_reports, public.humora_contact_messages
  to authenticated;
grant select on public.humora_audit_logs to authenticated;
