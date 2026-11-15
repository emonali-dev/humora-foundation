-- Run ONCE in the Supabase SQL editor after the first admin has an account
-- (create it under Authentication → Users → Add user). Replace the email.
insert into public.humora_profiles (id, full_name, email, role, active)
select id, 'Founder Name', email, 'super_admin', true from auth.users where email = 'admin@example.org'
on conflict (id) do update set role = 'super_admin', active = true;
