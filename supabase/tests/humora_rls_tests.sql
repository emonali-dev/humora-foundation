-- HUMORA FOUNDATION – database security tests.
-- Run in the Supabase SQL editor. Everything happens inside one DO block that
-- ends by raising 'HUMORA_TESTS_PASSED …', so all test data is rolled back.
do $$
declare
  r json; ref text; n int; v text; ok boolean;
  ed uuid := gen_random_uuid(); fin uuid := gen_random_uuid(); sa uuid;
  log text := '';
begin
  select id into sa from public.humora_profiles where role = 'super_admin' and active limit 1;
  insert into auth.users (id, email, aud, role, instance_id) values
    (ed,  'editor.test@humora.invalid',  'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (fin, 'finance.test@humora.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.humora_profiles (id, full_name, email, role) values (ed, 'Test Editor', 'editor.test@humora.invalid', 'editor'),
                                                                        (fin, 'Test Finance', 'finance.test@humora.invalid', 'finance');

  ---------------------------------------------------------------- anonymous visitor
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.headers', json_build_object('x-forwarded-for', 'test-' || gen_random_uuid())::text, true);
  execute 'set local role anon';
  begin perform count(*) from public.humora_donations; raise exception 'FAIL anon read donations';
  exception when insufficient_privilege then log := log || 'anon-donations-denied ok; '; end;
  begin perform count(*) from public.humora_contact_messages; raise exception 'FAIL anon read messages';
  exception when insufficient_privilege then log := log || 'anon-messages-denied ok; '; end;
  begin perform count(*) from public.humora_audit_logs; raise exception 'FAIL anon read audit';
  exception when insufficient_privilege then log := log || 'anon-audit-denied ok; '; end;
  begin insert into public.humora_activities (category,title_en,title_bn,description_en,description_bn,location,activity_date)
        values ('food','Hack','হ্যাক','xxxxxxxxxxxx','xxxxxxxxxxxx','Dhaka',current_date); raise exception 'FAIL anon insert activity';
  exception when insufficient_privilege then log := log || 'anon-insert-activity-denied ok; '; end;
  begin update public.humora_settings set contact_email = 'evil@example.com'; get diagnostics n = row_count;
        if n > 0 then raise exception 'FAIL anon updated settings'; end if;
  exception when insufficient_privilege then null; end;
  log := log || 'anon-settings-readonly ok; ';

  r := public.humora_submit_donation('Test Donor', 'donor@example.com', 'Bangladesh', 'BDT', 1500, null, null, 'Test', 'en', null);
  ref := r->>'donation_ref';
  if r->>'status' <> 'pending' then raise exception 'FAIL donation status %', r; end if;
  log := log || 'donation-submit ok; ';
  r := public.humora_submit_donation('Bot', 'bot@example.com', 'BD', 'BDT', 10, null, null, null, 'en', 'http://spam');
  if r->>'donation_ref' <> 'HF-RECEIVED' then raise exception 'FAIL honeypot'; end if;
  log := log || 'honeypot ok; ';
  begin perform public.humora_submit_donation('X', 'bad', 'BD', 'BDT', 10); raise exception 'FAIL validation';
  exception when others then if sqlerrm not like 'HUMORA_%' then raise; end if; log := log || 'validation ok; '; end;
  begin perform public.humora_submit_donation('Test Donor', 'donor@example.com', 'Bangladesh', 'EUR', 10); raise exception 'FAIL currency';
  exception when others then if sqlerrm <> 'HUMORA_CURRENCY_INVALID' then raise; end if; end;
  r := public.humora_submit_payment_reference(ref, 'DONOR@example.com', 'TXN-12345');
  log := log || 'payment-reference ok; ';
  begin perform public.humora_submit_payment_reference(ref, 'other@example.com', 'TXN-1'); raise exception 'FAIL wrong email accepted';
  exception when others then if sqlerrm <> 'HUMORA_DONATION_NOT_FOUND' then raise; end if; log := log || 'reference-email-check ok; '; end;
  r := public.humora_submit_contact('Visitor', 'visitor@example.com', 'Hello', 'I would like to volunteer with you.', 'bn', null);
  log := log || 'contact ok; ';
  r := public.humora_public_finance();
  if (r->'totals'->0->>'donations')::numeric <> 0 then raise exception 'FAIL unverified donation counted %', r; end if;
  log := log || 'unverified-not-public ok; ';
  select count(*) into n from public.humora_public_impact() where metric_value is not null;
  if n <> 0 then raise exception 'FAIL unverified impact visible'; end if;
  log := log || 'impact-hidden ok; ';

  ---------------------------------------------------------------- editor
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', ed, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.humora_donations;
  if n <> 0 then raise exception 'FAIL editor sees donations'; end if;
  log := log || 'editor-no-donations ok; ';
  insert into public.humora_activities (category,title_en,title_bn,description_en,description_bn,location,activity_date,status)
  values ('food','Test food drive','খাদ্য বিতরণ','Description in English','বাংলা বিবরণ লেখা হলো','Dhaka',current_date,'draft');
  log := log || 'editor-create-activity ok; ';
  begin update public.humora_activities set status = 'published' where title_en = 'Test food drive'; raise exception 'FAIL publish without image';
  exception when check_violation then log := log || 'publish-needs-image ok; '; end;
  update public.humora_impact_statistics set metric_value = 120, is_verified = true where metric_name = 'people_helped';
  begin update public.humora_profiles set role = 'super_admin' where id = ed; get diagnostics n = row_count;
        if n > 0 then raise exception 'FAIL editor escalated'; end if; end;
  log := log || 'no-self-escalation ok; ';

  ---------------------------------------------------------------- finance
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', fin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.humora_contact_messages;
  if n <> 0 then raise exception 'FAIL finance sees messages'; end if;
  update public.humora_donations set status = 'verified' where donation_ref = ref;
  select verified_by::text into v from public.humora_donations where donation_ref = ref;
  if v <> fin::text then raise exception 'FAIL verified_by not set'; end if;
  log := log || 'verify-donation ok; ';
  insert into public.humora_expenses (title, amount, currency, expense_date, category, approved_by)
  values ('Rice for 20 families', 500, 'BDT', current_date, 'food', gen_random_uuid());
  select (approved_by = fin) into ok from public.humora_expenses where title = 'Rice for 20 families';
  if not ok then raise exception 'FAIL approved_by spoofable'; end if;
  log := log || 'approved-by-forced ok; ';
  begin update public.humora_activities set title_en = 'x' where title_en = 'Test food drive'; get diagnostics n = row_count;
        if n > 0 then raise exception 'FAIL finance edited content'; end if; end;
  log := log || 'finance-no-content ok; ';

  ---------------------------------------------------------------- public sees verified totals
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  r := public.humora_public_finance();
  if (r->'totals'->0->>'donations')::numeric <> 1500 or (r->'totals'->0->>'expenses')::numeric <> 500 then raise exception 'FAIL totals %', r; end if;
  log := log || 'verified-totals ok; ';
  select metric_value::text into v from public.humora_public_impact() where metric_name = 'people_helped';
  if v <> '120' then raise exception 'FAIL verified impact'; end if;
  log := log || 'impact-verified ok; ';
  for n in 1..5 loop
    begin perform public.humora_submit_contact('Visitor', 'visitor@example.com', 'Hello', 'Repeated message number ' || n, 'en', null);
    exception when others then if sqlerrm = 'HUMORA_RATE_LIMIT' then log := log || 'rate-limit ok; '; exit; else raise; end if; end;
  end loop;

  ---------------------------------------------------------------- audit + super admin
  execute 'reset role';
  select count(*) into n from public.humora_audit_logs where admin_id = fin and table_name = 'humora_donations';
  if n < 1 then raise exception 'FAIL audit log missing'; end if;
  log := log || 'audit ok; ';
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin update public.humora_profiles set role = 'admin' where id = sa; raise exception 'FAIL last super admin demoted';
  exception when others then if sqlerrm <> 'HUMORA_LAST_SUPER_ADMIN' then raise; end if; log := log || 'last-super-admin ok; '; end;
  execute 'reset role';
  raise exception 'HUMORA_TESTS_PASSED: %', log;
end $$;
