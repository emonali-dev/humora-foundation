// HUMORA FOUNDATION – admin account management (Supabase Edge Function).
// Creating sign-in accounts needs the service role, which must never reach the
// browser. This function checks that the caller is an active HUMORA super admin
// before doing anything.
//   POST {action:'create_user', email, password, full_name, role}
//   POST {action:'reset_password', user_id, password}
import { createClient } from 'npm:@supabase/supabase-js@2';

const ROLES = ['super_admin', 'admin', 'editor', 'finance'];
const DEFAULT_ORIGINS = ['https://humora-foundation.vercel.app', 'http://localhost:8080'];
const ORIGINS = new Set((Deno.env.get('HUMORA_ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean).concat(DEFAULT_ORIGINS));

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : DEFAULT_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
}
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, origin);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(token);
  const caller = who?.user;
  if (!caller) return json({ error: 'NOT_SIGNED_IN' }, 401, origin);
  const { data: me } = await admin.from('humora_profiles').select('role,active').eq('id', caller.id).maybeSingle();
  if (!me?.active || me.role !== 'super_admin') return json({ error: 'HUMORA_FORBIDDEN' }, 403, origin);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: 'BAD_REQUEST' }, 400, origin); }
  const audit = (action: string, recordId: string, details: Record<string, unknown>) =>
    admin.from('humora_audit_logs').insert({ admin_id: caller.id, action, table_name: 'auth.users', record_id: recordId, details });

  if (body.action === 'create_user') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.full_name || '').trim();
    const role = String(body.role || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'EMAIL_INVALID' }, 400, origin);
    if (password.length < 10) return json({ error: 'PASSWORD_TOO_SHORT' }, 400, origin);
    if (fullName.length < 2 || fullName.length > 100) return json({ error: 'NAME_INVALID' }, 400, origin);
    if (!ROLES.includes(role)) return json({ error: 'ROLE_INVALID' }, 400, origin);

    let userId = '';
    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, app: 'humora' },
      app_metadata: { humora_managed: true },
    });
    if (created.error) {
      // The Supabase project is shared with other apps: an existing account may be attached,
      // but its password stays its owner's (reset_password refuses accounts not created here).
      const { data: existingId } = await admin.rpc('humora_user_id_by_email', { p_email: email });
      if (!existingId) return json({ error: 'CREATE_FAILED', detail: created.error.message }, 400, origin);
      userId = existingId as string;
    } else {
      userId = created.data.user!.id;
    }
    const { error } = await admin.from('humora_profiles').upsert({ id: userId, full_name: fullName, email, role, active: true, created_by: caller.id });
    if (error) return json({ error: 'SAVE_FAILED', detail: error.message }, 400, origin);
    await audit('create_admin_user', userId, { email, role, existing_account: !!created.error });
    return json({ user_id: userId, email, role, existing_account: !!created.error }, 200, origin);
  }

  if (body.action === 'reset_password') {
    const userId = String(body.user_id || '');
    const password = String(body.password || '');
    if (password.length < 10) return json({ error: 'PASSWORD_TOO_SHORT' }, 400, origin);
    const { data: target } = await admin.from('humora_profiles').select('id').eq('id', userId).maybeSingle();
    if (!target) return json({ error: 'NOT_FOUND' }, 404, origin);
    if (userId !== caller.id) {
      const { data: au } = await admin.auth.admin.getUserById(userId);
      if (au?.user?.app_metadata?.humora_managed !== true) return json({ error: 'HUMORA_ACCOUNT_PROTECTED' }, 403, origin);
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: 'RESET_FAILED', detail: error.message }, 400, origin);
    await audit('reset_admin_password', userId, {});
    return json({ ok: true }, 200, origin);
  }

  return json({ error: 'UNKNOWN_ACTION' }, 400, origin);
});
