// Test double for @supabase/supabase-js used by tests/browser_test.py.
// Served in place of https://esm.sh/@supabase/supabase-js so pages can be
// exercised without network access. Data lives in memory per page load.
const today = new Date().toISOString().slice(0, 10);
const IMG = 'https://ketzuhfolwhofrnliirf.supabase.co/storage/v1/object/public/humora-media/test/pic.png';
const store = window.__MOCK_STORE__ || {
  humora_settings: [{ id: 1, contact_email: 'info@example.org', phone: '+880 1700 000000', whatsapp: '8801700000000', address_en: 'Dhaka, Bangladesh', address_bn: 'ঢাকা, বাংলাদেশ', facebook_url: 'https://facebook.com/example', show_transparency: true }],
  humora_content: [],
  humora_founders: [],
  humora_activities: [{ id: '11111111-1111-4111-8111-111111111111', category: 'winter', title_en: 'Winter blanket distribution', title_bn: 'শীতবস্ত্র বিতরণ', description_en: 'Blankets were distributed to families.\n\nThank you to everyone who supported.', description_bn: 'পরিবারগুলোর মাঝে কম্বল বিতরণ করা হয়েছে।', location: 'Dhaka', location_bn: 'ঢাকা', activity_date: today, image_url: IMG, status: 'published', created_at: today }],
  humora_gallery: [{ id: 'g1', title: 'Blankets', title_bn: 'কম্বল', image_url: IMG, activity_id: '11111111-1111-4111-8111-111111111111', is_published: true, created_at: today }],
  humora_testimonials: [],
  humora_payment_methods: [{ id: 'p1', name_en: 'Test Mobile Banking', name_bn: 'টেস্ট মোবাইল ব্যাংকিং', method_type: 'mobile_banking', currency: 'BDT', account_name: 'Test Account', account_details: '01XXXXXXXXX (test)', instructions_en: 'Send money and keep the transaction ID.', instructions_bn: 'টাকা পাঠিয়ে ট্রানজেকশন আইডি রাখুন।', is_verified: true, is_active: true, sort_order: 0, created_at: today }],
  humora_financial_reports: [],
  humora_donations: [{ id: 'd1', donation_ref: 'HF-TEST0001', donor_name: 'Test Donor', email: 'donor@example.com', country: 'Bangladesh', currency: 'BDT', amount: 1000, status: 'payment_submitted', transaction_reference: 'TX1', created_at: new Date().toISOString() }],
  humora_income: [], humora_expenses: [], humora_contact_messages: [{ id: 'm1', name: 'Visitor', email: 'v@example.com', subject: 'Hello', message: 'I want to volunteer.', language: 'en', status: 'new', created_at: new Date().toISOString() }],
  humora_impact_statistics: [{ id: 'i1', metric_name: 'people_helped', metric_value: 250, is_verified: true, updated_at: new Date().toISOString() },
    { id: 'i2', metric_name: 'children_supported', metric_value: null, is_verified: false, updated_at: new Date().toISOString() },
    { id: 'i3', metric_name: 'families_assisted', metric_value: null, is_verified: false, updated_at: new Date().toISOString() },
    { id: 'i4', metric_name: 'projects_completed', metric_value: null, is_verified: false, updated_at: new Date().toISOString() }],
  humora_profiles: [{ id: 'u1', full_name: 'Test Admin', email: 'admin@example.org', role: 'super_admin', active: true, created_at: today }],
  humora_audit_logs: [{ id: 1, admin_id: 'u1', action: 'update', table_name: 'humora_donations', record_id: 'd1', details: { before: {}, after: {} }, created_at: new Date().toISOString() }]
};
window.__MOCK_STORE__ = store;
window.__MOCK_CALLS__ = window.__MOCK_CALLS__ || [];
let session = null;
try { session = JSON.parse(sessionStorage.getItem('mock_session') || 'null'); } catch { /* */ }

class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.single = false; this.lim = null; }
  select() { return this; }
  eq(k, v) { this.f.push((r) => String(r[k]) === String(v)); return this; }
  order() { return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(v) { this.op = 'insert'; this.v = v; return this; }
  update(v) { this.op = 'update'; this.v = v; return this; }
  upsert(v) { this.op = 'upsert'; this.v = v; return this; }
  delete() { this.op = 'delete'; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const rows = store[this.t] = store[this.t] || [];
    window.__MOCK_CALLS__.push([this.op, this.t, this.v]);
    if (this.op === 'insert') { const list = Array.isArray(this.v) ? this.v : [this.v]; list.forEach((x) => rows.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...x })); return { data: null, error: null }; }
    if (this.op === 'upsert') { const i = rows.findIndex((r) => (r.key && r.key === this.v.key) || (r.id && r.id === this.v.id)); if (i >= 0) rows[i] = { ...rows[i], ...this.v }; else rows.push({ ...this.v }); return { data: null, error: null }; }
    const match = rows.filter((r) => this.f.every((fn) => fn(r)));
    if (this.op === 'update') { match.forEach((r) => Object.assign(r, this.v)); return { data: null, error: null }; }
    if (this.op === 'delete') { store[this.t] = rows.filter((r) => !match.includes(r)); return { data: null, error: null }; }
    let out = match; if (this.lim) out = out.slice(0, this.lim);
    return { data: this.single ? (out[0] || null) : out, error: null };
  }
}
const finance = () => {
  const s = store.humora_settings[0]; if (!s.show_transparency) return { enabled: false };
  const sum = (arr, c, p) => arr.filter((x) => x.currency === c && p(x)).reduce((a, x) => a + Number(x.amount), 0);
  const totals = ['BDT', 'USD'].map((c) => ({ currency: c, donations: sum(store.humora_donations, c, (x) => x.status === 'verified') + 5000 * (c === 'BDT'), other_income: 0, expenses: 1200 * (c === 'BDT'), donation_count: c === 'BDT' ? 3 : 0 }));
  return { enabled: true, totals, monthly: [{ month: today.slice(0, 7), currency: 'BDT', income: 5000, expenses: 1200 }], by_category: [{ category: 'winter', currency: 'BDT', amount: 1200 }] };
};
export function createClient() {
  return {
    from: (t) => new Q(t),
    rpc: async (name, args) => {
      window.__MOCK_CALLS__.push(['rpc', name, args]);
      if (name === 'humora_public_impact') return { data: store.humora_impact_statistics.map((r) => ({ ...r, metric_value: r.is_verified ? r.metric_value : null })), error: null };
      if (name === 'humora_public_finance') return { data: finance(), error: null };
      if (name === 'humora_submit_donation') return { data: { ok: true, donation_ref: 'HF-ABCD1234', status: args.p_transaction_reference ? 'payment_submitted' : 'pending' }, error: null };
      if (name === 'humora_submit_payment_reference') return args.p_donation_ref === 'HF-ABCD1234' ? { data: { ok: true }, error: null } : { data: null, error: { message: 'HUMORA_DONATION_NOT_FOUND' } };
      if (name === 'humora_submit_contact') return { data: { ok: true }, error: null };
      return { data: null, error: { message: 'unknown rpc' } };
    },
    auth: {
      getUser: async () => ({ data: { user: session ? { id: 'u1', email: 'admin@example.org' } : null } }),
      getSession: async () => ({ data: { session: session ? { access_token: 't' } : null } }),
      signInWithPassword: async ({ password }) => { if (password !== 'correct-password') return { error: { message: 'Invalid login' } }; session = { u: 1 }; sessionStorage.setItem('mock_session', '1'); return { error: null }; },
      signOut: async () => { session = null; sessionStorage.removeItem('mock_session'); return {}; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      resetPasswordForEmail: async () => ({}), updateUser: async () => ({})
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: (p) => ({ data: { publicUrl: IMG } }), createSignedUrl: async () => ({ data: { signedUrl: IMG } }) }) }
  };
}
