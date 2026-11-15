// HUMORA FOUNDATION – admin dashboard.
// The browser only decides which screens to show. Every read and write is
// enforced by Row Level Security in the database (see supabase/migrations).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { STRINGS } from './strings.js';
import { icon } from './icons.js';

const AUTH_TYPE = (() => { const m = (location.hash + '&' + location.search).match(/[#&?]type=([a-z_]+)/); return m ? m[1] : ''; })();
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let lang = (() => { try { return localStorage.getItem('humora_lang') === 'bn' ? 'bn' : 'en'; } catch { return 'en'; } })();
const L = (en, bn) => (lang === 'bn' ? bn : en);
const locale = () => (lang === 'bn' ? 'bn-BD' : 'en-GB');
const num = (n) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(Number(n || 0));
const money = (n, c) => `${c === 'USD' ? 'US$' : '৳'} ${num(n)}`;
const date = (d) => (d ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).length === 10 ? d + 'T00:00:00' : d)) : '');
const dateTime = (d) => (d ? new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '');
const safeUrl = (u) => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };

/* ---------------------------------------------------------------- admin UI text */
const A = {
  signin: ['Admin sign in', 'অ্যাডমিন লগইন'], email: ['Email', 'ইমেইল'], password: ['Password', 'পাসওয়ার্ড'], signin_btn: ['Sign in', 'লগইন'],
  forgot: ['Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?'], reset_sent: ['If this email has an account, a reset link has been sent.', 'এই ইমেইলে অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হয়েছে।'],
  new_pass: ['New password (min. 10 characters)', 'নতুন পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)'], save_pass: ['Save new password', 'নতুন পাসওয়ার্ড সংরক্ষণ'],
  pass_saved: ['Password updated. You are signed in.', 'পাসওয়ার্ড হালনাগাদ হয়েছে।'],
  bad_login: ['Incorrect email or password.', 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।'], no_access: ['This account does not have HUMORA admin access.', 'এই অ্যাকাউন্টে হিউমোরা অ্যাডমিন অনুমতি নেই।'],
  logout: ['Sign out', 'লগআউট'], add: ['Add new', 'নতুন যোগ করুন'], edit: ['Edit', 'সম্পাদনা'], del: ['Delete', 'মুছুন'], view: ['View', 'দেখুন'],
  save: ['Save', 'সংরক্ষণ'], cancel: ['Cancel', 'বাতিল'], saved: ['Saved', 'সংরক্ষিত হয়েছে'], deleted: ['Deleted', 'মুছে ফেলা হয়েছে'],
  confirm_del: ['Delete this record permanently?', 'এই রেকর্ডটি স্থায়ীভাবে মুছে ফেলবেন?'], yes_del: ['Yes, delete', 'হ্যাঁ, মুছুন'],
  search: ['Search…', 'খুঁজুন…'], all: ['All', 'সব'], none: ['No records yet.', 'এখনো কোনো রেকর্ড নেই।'], loading: ['Loading…', 'লোড হচ্ছে…'],
  required: ['Required', 'আবশ্যক'], upload: ['Upload', 'আপলোড'], remove: ['Remove', 'সরান'], upload_fail: ['Upload failed', 'আপলোড ব্যর্থ'],
  file_rules: ['JPG, PNG or WEBP (PDF where allowed), max 5 MB', 'JPG, PNG বা WEBP (প্রযোজ্য ক্ষেত্রে PDF), সর্বোচ্চ ৫ MB'],
  status: ['Status', 'অবস্থা'], actions: ['Actions', 'কার্যক্রম'], date: ['Date', 'তারিখ'], amount: ['Amount', 'পরিমাণ'], currency: ['Currency', 'মুদ্রা'],
  export: ['Export CSV', 'CSV ডাউনলোড'], open: ['Open', 'খুলুন'], details: ['Details', 'বিস্তারিত'],
  g_main: ['Overview', 'সারসংক্ষেপ'], g_content: ['Content', 'কনটেন্ট'], g_finance: ['Finance', 'আর্থিক'], g_system: ['System', 'সিস্টেম'],
  m_overview: ['Dashboard', 'ড্যাশবোর্ড'], m_activities: ['Activities', 'কার্যক্রম'], m_gallery: ['Gallery', 'গ্যালারি'], m_donations: ['Donations', 'অনুদান'],
  m_income: ['Income', 'আয়'], m_expenses: ['Expenses', 'ব্যয়'], m_reports: ['Financial Reports', 'আর্থিক প্রতিবেদন'], m_impact: ['Impact Statistics', 'প্রভাব পরিসংখ্যান'],
  m_messages: ['Contact Messages', 'যোগাযোগ বার্তা'], m_site: ['Website Content', 'ওয়েবসাইট কনটেন্ট'], m_payments: ['Payment Instructions', 'পেমেন্ট নির্দেশনা'],
  m_users: ['Admin Users', 'অ্যাডমিন ব্যবহারকারী'], m_lang: ['Language Content', 'ভাষাভিত্তিক কনটেন্ট'], m_audit: ['Audit Logs', 'অডিট লগ'],
  st_pending: ['Pending', 'অপেক্ষমাণ'], st_payment_submitted: ['Payment Submitted', 'পেমেন্ট জমা হয়েছে'], st_verified: ['Verified', 'যাচাইকৃত'], st_rejected: ['Rejected', 'বাতিল'],
  st_draft: ['Draft', 'খসড়া'], st_published: ['Published', 'প্রকাশিত'], st_archived: ['Archived', 'আর্কাইভ'],
  st_new: ['New', 'নতুন'], st_read: ['Read', 'পড়া হয়েছে'], st_replied: ['Replied', 'উত্তর দেওয়া হয়েছে'],
  verify: ['Verify', 'যাচাই করুন'], reject: ['Reject', 'বাতিল করুন'], mark_submitted: ['Mark payment submitted', 'পেমেন্ট জমা হিসেবে চিহ্নিত'], reopen: ['Back to pending', 'অপেক্ষমাণে ফেরান'],
  verify_warn: ['Only verify after confirming the money was actually received in the foundation account.', 'ফাউন্ডেশনের অ্যাকাউন্টে টাকা আসলেই এসেছে নিশ্চিত হওয়ার পরই যাচাই করুন।'],
  approve: ['Approved', 'অনুমোদিত'], approved_by: ['Approved by', 'অনুমোদনকারী'], not_approved: ['Not approved', 'অনুমোদিত নয়'],
  verified_q: ['Verified (included in public totals)', 'যাচাইকৃত (পাবলিক হিসাবে অন্তর্ভুক্ত)'], published_q: ['Published on website', 'ওয়েবসাইটে প্রকাশিত'],
  k_pending: ['Awaiting verification', 'যাচাইয়ের অপেক্ষায়'], k_verified_bdt: ['Verified donations (BDT)', 'যাচাইকৃত অনুদান (BDT)'], k_verified_usd: ['Verified donations (USD)', 'যাচাইকৃত অনুদান (USD)'],
  k_balance: ['Balance', 'স্থিতি'], k_messages: ['New messages', 'নতুন বার্তা'], k_activities: ['Published activities', 'প্রকাশিত কার্যক্রম'],
  recent_don: ['Recent donations', 'সাম্প্রতিক অনুদান'], recent_msg: ['Recent messages', 'সাম্প্রতিক বার্তা'],
  missing: ['Information still required from the foundation', 'ফাউন্ডেশনের কাছ থেকে যে তথ্য এখনো প্রয়োজন'],
  miss_contact: ['Contact email / phone / WhatsApp', 'যোগাযোগের ইমেইল / ফোন / হোয়াটসঅ্যাপ'], miss_social: ['Social media links', 'সামাজিক মাধ্যমের লিংক'],
  miss_pay: ['A verified, active payment method', 'যাচাইকৃত ও সক্রিয় পেমেন্ট পদ্ধতি'], miss_founders: ['Published founder profiles', 'প্রকাশিত প্রতিষ্ঠাতা পরিচিতি'],
  miss_hero: ['Hero photograph (real, with permission)', 'হিরো ছবি (বাস্তব, অনুমতিসহ)'], miss_impact: ['Verified impact statistics', 'যাচাইকৃত প্রভাব পরিসংখ্যান'],
  miss_activity: ['At least one published, verified activity', 'অন্তত একটি প্রকাশিত, যাচাইকৃত কার্যক্রম'], all_set: ['Everything is configured.', 'সব কিছু সেট করা হয়েছে।'],
  impact_help: ['Enter a value and tick “Verified” only when the figure has been checked. Unverified values show “Coming Soon” on the website.', 'সংখ্যা লিখে শুধু যাচাই করার পরই “যাচাইকৃত” টিক দিন। যাচাই না হলে ওয়েবসাইটে “শিগগিরই আসছে” দেখাবে।'],
  verified: ['Verified', 'যাচাইকৃত'], value: ['Value', 'সংখ্যা'],
  settings: ['Settings & contact', 'সেটিংস ও যোগাযোগ'], founders: ['Founders', 'প্রতিষ্ঠাতা'], testimonials: ['Testimonials', 'মতামত'],
  lang_help: ['Edit the English and Bangla text shown on the public website. Empty fields fall back to the built-in text.', 'পাবলিক ওয়েবসাইটের ইংরেজি ও বাংলা লেখা সম্পাদনা করুন। খালি রাখলে ডিফল্ট লেখা দেখাবে।'],
  reset_default: ['Restore default', 'ডিফল্টে ফেরান'], customized: ['Customised', 'পরিবর্তিত'],
  create_user: ['Add admin user', 'অ্যাডমিন যোগ করুন'], role: ['Role', 'ভূমিকা'], active: ['Active', 'সক্রিয়'], full_name: ['Full name', 'পূর্ণ নাম'],
  temp_pass: ['Temporary password (min. 10)', 'অস্থায়ী পাসওয়ার্ড (কমপক্ষে ১০)'], reset_pw: ['Reset password', 'পাসওয়ার্ড রিসেট'],
  r_super_admin: ['Super admin – everything incl. users', 'সুপার অ্যাডমিন – ব্যবহারকারীসহ সব'], r_admin: ['Admin – content, finance, messages, audit', 'অ্যাডমিন – কনটেন্ট, আর্থিক, বার্তা, অডিট'],
  r_editor: ['Editor – content and messages', 'এডিটর – কনটেন্ট ও বার্তা'], r_finance: ['Finance – donations, income, expenses, reports', 'ফাইন্যান্স – অনুদান, আয়, ব্যয়, প্রতিবেদন'],
  fn_missing: ['The humora-admin function is not deployed yet. See README → Admin users.', 'humora-admin ফাংশন এখনো ডিপ্লয় হয়নি। README দেখুন।'],
  summary: ['Summary', 'সারাংশ'], monthly: ['Monthly summary (all records)', 'মাসিক সারাংশ (সব রেকর্ড)'], published_reports: ['Published statements', 'প্রকাশিত বিবরণী'],
  income_total: ['Income', 'আয়'], expense_total: ['Expenses', 'ব্যয়'], unverified: ['Not yet verified', 'এখনো যাচাই হয়নি'],
  reply: ['Reply by email', 'ইমেইলে উত্তর দিন'], table: ['Table', 'টেবিল'], admin: ['Admin', 'অ্যাডমিন'], when: ['When', 'কখন'], action: ['Action', 'কাজ'],
  receipt: ['Receipt', 'রসিদ'], view_receipt: ['View receipt', 'রসিদ দেখুন'], private_note: ['Stored privately – only finance admins can open it.', 'গোপনে সংরক্ষিত – শুধু ফাইন্যান্স অ্যাডমিনরা খুলতে পারবেন।'],
  donor: ['Donor', 'দাতা'], reference: ['Reference', 'রেফারেন্স'], txn: ['Transaction ref.', 'ট্রানজেকশন রেফ.'], method: ['Method', 'পদ্ধতি'], country: ['Country', 'দেশ'],
  message: ['Message', 'বার্তা'], note: ['Admin note', 'অ্যাডমিন নোট'], created: ['Created', 'তৈরি'], verified_at: ['Verified at', 'যাচাইয়ের সময়'],
  offline_help: ['Use this to record a donation received offline. It starts as Pending — verify it after confirming the money.', 'অফলাইনে পাওয়া অনুদান রেকর্ড করতে ব্যবহার করুন। এটি অপেক্ষমাণ হিসেবে শুরু হবে — টাকা নিশ্চিত হলে যাচাই করুন।'],
  pay_help: ['Only enter real, verified account details. A method appears on the Donate page only when it is both Verified and Active.', 'শুধু বাস্তব ও যাচাইকৃত অ্যাকাউন্টের তথ্য দিন। যাচাইকৃত ও সক্রিয় হলে তবেই দান পাতায় দেখাবে।'],
  consent_help: ['Publish only real testimonials with the person’s permission.', 'শুধু অনুমতিসহ বাস্তব মতামত প্রকাশ করুন।'],
  act_help: ['Publish only verified activities with real photographs. An activity needs an image before it can be published.', 'শুধু যাচাইকৃত কার্যক্রম ও বাস্তব ছবি প্রকাশ করুন। প্রকাশের আগে ছবি থাকা আবশ্যক।']
};
const tA = (k) => (A[k] ? A[k][lang === 'bn' ? 1 : 0] : k);
const tS = (k) => STRINGS[lang][k] || STRINGS.en[k] || k;

/* ---------------------------------------------------------------- state */
let me = null;          // { id, email, role, full_name }
const CAPS = { super_admin: ['content', 'finance', 'messages', 'audit', 'users'], admin: ['content', 'finance', 'messages', 'audit'], editor: ['content', 'messages'], finance: ['finance'] };
const can = (cap) => !!me && (CAPS[me.role] || []).includes(cap);

function toast(msg, err) {
  const el = $('#toast'); el.textContent = msg; el.className = 'toast' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 3500);
}
const errText = (e) => { const m = String(e?.message || e || ''); const code = (m.match(/HUMORA_[A-Z_]+/) || [])[0]; return code ? (tS('err.' + code) !== 'err.' + code ? tS('err.' + code) : code) : m; };

function openModal(title, html) {
  $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
  setTimeout(() => $('#modalBody').querySelector('input,select,textarea,button')?.focus(), 30);
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; }
$('#modalClose').innerHTML = icon('x');
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal(); });
function confirmBox(msg) {
  return new Promise((resolve) => {
    openModal(tA('del'), `<p>${esc(msg)}</p><div class="row-actions"><button class="btn btn-sm btn-navy" id="cYes">${esc(tA('yes_del'))}</button><button class="btn btn-sm btn-outline" id="cNo">${esc(tA('cancel'))}</button></div>`);
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
  });
}

/* ---------------------------------------------------------------- uploads */
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
async function uploadFile(file, { bucket = 'humora-media', folder = 'misc', pdf = false } = {}) {
  const allowed = pdf ? [...IMG_TYPES, 'application/pdf'] : IMG_TYPES;
  if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error(tA('file_rules'));
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[file.type];
  const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  if (bucket === 'humora-media') return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return path;
}
async function openReceipt(path) {
  const { data, error } = await db.storage.from('humora-receipts').createSignedUrl(path, 120);
  if (error) return toast(errText(error), true);
  window.open(data.signedUrl, '_blank', 'noopener');
}

/* ---------------------------------------------------------------- generic form */
// field: {k, l:[en,bn], type, opts:[[value,[en,bn]]], req, max, help:[en,bn], folder, pdf, full}
function fieldHtml(f, v) {
  const id = 'f_' + f.k; const lbl = esc(L(f.l[0], f.l[1])) + (f.req ? ' *' : '');
  const help = f.help ? `<div class="help">${esc(L(f.help[0], f.help[1]))}</div>` : '';
  const val = v ?? '';
  switch (f.type) {
    case 'textarea': return `<div class="field"><label for="${id}">${lbl}</label><textarea id="${id}" name="${f.k}" ${f.max ? `maxlength="${f.max}"` : ''} ${f.req ? 'required' : ''} rows="${f.rows || 5}">${esc(val)}</textarea>${help}</div>`;
    case 'select': return `<div class="field"><label for="${id}">${lbl}</label><select id="${id}" name="${f.k}" ${f.req ? 'required' : ''}>${f.optional ? '<option value="">—</option>' : ''}${(f.opts || []).map(([o, ol]) => `<option value="${esc(o)}" ${String(o) === String(val) ? 'selected' : ''}>${esc(Array.isArray(ol) ? L(ol[0], ol[1]) : ol)}</option>`).join('')}</select>${help}</div>`;
    case 'checkbox': return `<div class="field"><label class="check"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${lbl}</label>${help}</div>`;
    case 'image': case 'file': case 'receipt': {
      const preview = f.type === 'image' && safeUrl(val) ? `<img src="${esc(val)}" alt="">` : (val ? `<span class="pill green">${f.type === 'receipt' ? esc(tA('receipt')) : 'PDF / file'}</span>` : '');
      return `<div class="field"><label>${lbl}</label><div class="img-field" data-upload="${f.k}"><span class="pv">${preview}</span>
        <input type="hidden" name="${f.k}" value="${esc(val)}"><input type="file" accept="${f.type === 'image' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'}" aria-label="${lbl}">
        ${val ? `<button type="button" class="btn btn-sm btn-outline" data-clear="${f.k}">${esc(tA('remove'))}</button>` : ''}</div>
        <div class="help">${esc(tA('file_rules'))}${f.type === 'receipt' ? ' · ' + esc(tA('private_note')) : ''}</div>${help}</div>`;
    }
    default: return `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(val)}" ${f.max ? `maxlength="${f.max}"` : ''} ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="any" min="0"' : ''}>${help}</div>`;
  }
}
function wireUploads(form, fields) {
  form.querySelectorAll('[data-upload]').forEach((box) => {
    const f = fields.find((x) => x.k === box.dataset.upload);
    const input = box.querySelector('input[type=file]');
    input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const v = await uploadFile(file, { bucket: f.type === 'receipt' ? 'humora-receipts' : 'humora-media', folder: f.folder || 'misc', pdf: f.type !== 'image' });
        box.querySelector('input[type=hidden]').value = v;
        box.querySelector('.pv').innerHTML = f.type === 'image' ? `<img src="${esc(v)}" alt="">` : `<span class="pill green">${esc(file.name)}</span>`;
        toast(tA('saved'));
      } catch (e) { toast(`${tA('upload_fail')}: ${errText(e)}`, true); input.value = ''; }
    });
    box.querySelector('[data-clear]')?.addEventListener('click', () => { box.querySelector('input[type=hidden]').value = ''; box.querySelector('.pv').innerHTML = ''; });
  });
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k]; if (!el) continue;
    if (f.type === 'checkbox') out[f.k] = el.checked;
    else if (f.type === 'number') out[f.k] = el.value === '' ? null : Number(el.value);
    else { const v = String(el.value || '').trim(); out[f.k] = v === '' ? (f.emptyAs !== undefined ? f.emptyAs : null) : v; }
  }
  return out;
}
function checkRequired(form, fields) {
  for (const f of fields) {
    if (!f.req) continue;
    const el = form.elements[f.k]; const v = el?.value;
    if (el && (v === '' || v == null)) { const field = el.closest('.field'); field?.classList.add('invalid'); toast(`${L(f.l[0], f.l[1])}: ${tA('required')}`, true); el.focus?.(); return false; }
  }
  return true;
}
function formModal(title, fields, row, onSave, extraTop = '') {
  openModal(title, `<form class="form" id="mform" novalidate>${extraTop}${fields.map((f) => fieldHtml(f, row ? row[f.k] : f.def)).join('')}
    <div class="row-actions"><button class="btn btn-green" type="submit">${icon('check')}${esc(tA('save'))}</button><button class="btn btn-outline" type="button" id="mcancel">${esc(tA('cancel'))}</button></div></form>`);
  const form = $('#mform');
  wireUploads(form, fields);
  $('#mcancel').onclick = closeModal;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!checkRequired(form, fields)) return;
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try { await onSave(readForm(form, fields)); closeModal(); toast(tA('saved')); } catch (err) { toast(errText(err), true); } finally { btn.disabled = false; }
  });
}

/* ---------------------------------------------------------------- generic CRUD module */
const STATUS_PILL = { pending: 'gold', payment_submitted: 'blue', verified: 'green', rejected: 'red', draft: 'gold', published: 'green', archived: '', new: 'blue', read: '', replied: 'green' };
const pill = (s) => `<span class="pill ${STATUS_PILL[s] || ''}">${esc(tA('st_' + s))}</span>`;
const yes = (b) => (b ? `<span class="pill green">✓</span>` : `<span class="pill">—</span>`);

async function crud(cfg) {
  const view = $('#view');
  view.innerHTML = `${cfg.help ? `<p class="alert info">${esc(L(cfg.help[0], cfg.help[1]))}</p>` : ''}
    <div class="toolbar"><input type="search" id="q" placeholder="${esc(tA('search'))}" aria-label="${esc(tA('search'))}">
    ${cfg.filter ? `<select id="flt" aria-label="${esc(tA('status'))}"><option value="">${esc(tA('all'))}</option>${cfg.filter.opts.map(([v, l]) => `<option value="${v}">${esc(Array.isArray(l) ? L(l[0], l[1]) : l)}</option>`).join('')}</select>` : ''}
    <span class="grow"></span>${cfg.csv ? `<button class="btn btn-sm btn-outline" id="csv">${icon('file')}${esc(tA('export'))}</button>` : ''}
    ${cfg.noCreate ? '' : `<button class="btn btn-sm btn-green" id="add">${icon('plus')}${esc(tA('add'))}</button>`}</div>
    <div id="list"><div class="spinner"></div></div>`;
  let rows = [];
  const load = async () => {
    let q = db.from(cfg.table).select(cfg.select || '*').order(cfg.order || 'created_at', { ascending: !!cfg.asc }).limit(cfg.limit || 500);
    const { data, error } = await q;
    if (error) { $('#list').innerHTML = `<div class="alert error">${esc(errText(error))}</div>`; return; }
    rows = data || []; draw();
  };
  const draw = () => {
    const term = ($('#q').value || '').toLowerCase(); const fv = $('#flt')?.value || '';
    const list = rows.filter((r) => (!term || JSON.stringify(r).toLowerCase().includes(term)) && (!fv || String(r[cfg.filter.k]) === fv));
    $('#list').innerHTML = list.length ? `<div class="table-wrap"><table class="data"><thead><tr>${cfg.cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(L(c.l[0], c.l[1]))}</th>`).join('')}<th>${esc(tA('actions'))}</th></tr></thead>
      <tbody>${list.map((r) => `<tr data-id="${esc(r[cfg.key || 'id'])}">${cfg.cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join('')}
      <td><div class="row-actions">${(cfg.rowActions ? cfg.rowActions(r) : '')}${cfg.noEdit ? '' : `<button class="icon-btn" data-act="edit" aria-label="${esc(tA('edit'))}" title="${esc(tA('edit'))}">${icon('pencil')}</button>`}
      ${cfg.noDelete ? '' : `<button class="icon-btn danger" data-act="del" aria-label="${esc(tA('del'))}" title="${esc(tA('del'))}">${icon('trash')}</button>`}</div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${icon('inbox')}<p>${esc(tA('none'))}</p></div>`;
  };
  $('#q').addEventListener('input', draw);
  $('#flt')?.addEventListener('change', draw);
  $('#add')?.addEventListener('click', () => formModal(tA('add'), cfg.fields, null, async (v) => {
    const payload = cfg.beforeSave ? cfg.beforeSave(v, null) : v;
    const { error } = await db.from(cfg.table).insert(payload); if (error) throw error; await load();
  }, cfg.formTop || ''));
  $('#csv')?.addEventListener('click', () => downloadCsv(cfg.table + '.csv', rows, cfg.csv));
  $('#list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const id = b.closest('tr').dataset.id; const row = rows.find((r) => String(r[cfg.key || 'id']) === id);
    if (b.dataset.act === 'edit') {
      formModal(tA('edit'), cfg.fields, cfg.toForm ? cfg.toForm(row) : row, async (v) => {
        const payload = cfg.beforeSave ? cfg.beforeSave(v, row) : v;
        const { error } = await db.from(cfg.table).update(payload).eq(cfg.key || 'id', id); if (error) throw error; await load();
      });
    } else if (b.dataset.act === 'del') {
      if (!(await confirmBox(tA('confirm_del')))) return;
      const { error } = await db.from(cfg.table).delete().eq(cfg.key || 'id', id);
      if (error) return toast(errText(error), true);
      toast(tA('deleted')); await load();
    } else if (cfg.onAction) { await cfg.onAction(b.dataset.act, row, load); }
  });
  await load();
}
function downloadCsv(name, rows, cols) {
  const keys = cols || Object.keys(rows[0] || {});
  const cell = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = '﻿' + [keys.join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------------------------------------------------------------- field sets */
const CAT_OPTS = ['food', 'clothing', 'children', 'medical', 'winter', 'education', 'emergency', 'other'].map((c) => [c, [STRINGS.en['cat.' + c], STRINGS.bn['cat.' + c]]]);
const EXP_CAT_OPTS = [...CAT_OPTS, ['operations', [STRINGS.en['cat.operations'], STRINGS.bn['cat.operations']]]];
const CUR_OPTS = [['BDT', 'BDT ৳'], ['USD', 'USD $']];
async function activityOpts() {
  const { data } = await db.from('humora_activities').select('id,title_en,activity_date').order('activity_date', { ascending: false }).limit(300);
  return (data || []).map((a) => [a.id, `${a.title_en} (${a.activity_date})`]);
}

/* ---------------------------------------------------------------- modules */
const MODULES = [
  { id: 'overview', g: 'g_main', ic: 'chart', cap: null, run: overview },
  { id: 'activities', g: 'g_content', ic: 'calendar', cap: 'content', run: () => crud({
    table: 'humora_activities', order: 'activity_date', help: A.act_help.slice(),
    filter: { k: 'status', opts: ['draft', 'published', 'archived'].map((s) => [s, A['st_' + s]]) },
    cols: [{ l: ['Photo', 'ছবি'], f: (r) => (safeUrl(r.image_url) ? `<img class="thumb" src="${esc(r.image_url)}" alt="">` : '—') },
      { l: ['Title', 'শিরোনাম'], f: (r) => `<b>${esc(r.title_en)}</b><br><span class="note">${esc(r.title_bn)}</span>` },
      { l: ['Category', 'ধরন'], f: (r) => esc(tS('cat.' + r.category)) }, { l: A.date, f: (r) => esc(date(r.activity_date)) },
      { l: ['Location', 'স্থান'], k: 'location' }, { l: A.status, f: (r) => pill(r.status) }],
    rowActions: (r) => (r.status === 'published' ? `<a class="icon-btn" href="/activities/view/?id=${r.id}" target="_blank" rel="noopener" title="${esc(tA('view'))}" aria-label="${esc(tA('view'))}">${icon('eye')}</a>` : ''),
    fields: [
      { k: 'category', l: ['Category', 'ধরন'], type: 'select', opts: CAT_OPTS, req: true },
      { k: 'title_en', l: ['Title (English)', 'শিরোনাম (ইংরেজি)'], req: true, max: 160 }, { k: 'title_bn', l: ['Title (Bangla)', 'শিরোনাম (বাংলা)'], req: true, max: 160 },
      { k: 'description_en', l: ['Description (English)', 'বিবরণ (ইংরেজি)'], type: 'textarea', req: true, max: 10000, rows: 6 },
      { k: 'description_bn', l: ['Description (Bangla)', 'বিবরণ (বাংলা)'], type: 'textarea', req: true, max: 10000, rows: 6 },
      { k: 'location', l: ['Location (English)', 'স্থান (ইংরেজি)'], req: true, max: 160 }, { k: 'location_bn', l: ['Location (Bangla)', 'স্থান (বাংলা)'], max: 160, emptyAs: '' },
      { k: 'activity_date', l: A.date, type: 'date', req: true },
      { k: 'image_url', l: ['Main photo', 'প্রধান ছবি'], type: 'image', folder: 'activities' },
      { k: 'status', l: A.status, type: 'select', opts: ['draft', 'published', 'archived'].map((s) => [s, A['st_' + s]]), def: 'draft' }]
  }) },
  { id: 'gallery', g: 'g_content', ic: 'image', cap: 'content', run: async () => {
    const acts = await activityOpts();
    return crud({ table: 'humora_gallery',
      cols: [{ l: ['Photo', 'ছবি'], f: (r) => `<img class="thumb" src="${esc(safeUrl(r.image_url))}" alt="">` }, { l: ['Title', 'শিরোনাম'], f: (r) => `${esc(r.title)}<br><span class="note">${esc(r.title_bn)}</span>` },
        { l: ['Activity', 'কার্যক্রম'], f: (r) => esc((acts.find((a) => a[0] === r.activity_id) || [, '—'])[1]) }, { l: A.published_q, f: (r) => yes(r.is_published) }],
      fields: [{ k: 'image_url', l: ['Photo', 'ছবি'], type: 'image', req: true, folder: 'gallery' }, { k: 'title', l: ['Caption (English)', 'ক্যাপশন (ইংরেজি)'], req: true, max: 160 },
        { k: 'title_bn', l: ['Caption (Bangla)', 'ক্যাপশন (বাংলা)'], max: 160, emptyAs: '' }, { k: 'activity_id', l: ['Activity', 'কার্যক্রম'], type: 'select', opts: acts, optional: true },
        { k: 'is_published', l: A.published_q, type: 'checkbox' }] });
  } },
  { id: 'donations', g: 'g_finance', ic: 'heart', cap: 'finance', run: donations },
  { id: 'income', g: 'g_finance', ic: 'up', cap: 'finance', run: () => crud({
    table: 'humora_income', order: 'income_date', csv: ['income_date', 'title', 'source', 'amount', 'currency', 'is_verified', 'verified_at'],
    cols: [{ l: A.date, f: (r) => esc(date(r.income_date)) }, { l: ['Title', 'শিরোনাম'], f: (r) => `${esc(r.title)}${r.source ? `<br><span class="note">${esc(r.source)}</span>` : ''}` },
      { l: A.amount, num: true, f: (r) => esc(money(r.amount, r.currency)) }, { l: A.verified, f: (r) => yes(r.is_verified) },
      { l: A.receipt, f: (r) => (r.receipt_path ? `<button class="btn btn-sm btn-outline" data-act="receipt">${esc(tA('view_receipt'))}</button>` : '—') }],
    onAction: (act, r) => act === 'receipt' && openReceipt(r.receipt_path),
    fields: [{ k: 'title', l: ['Title (English)', 'শিরোনাম (ইংরেজি)'], req: true, max: 160 }, { k: 'title_bn', l: ['Title (Bangla)', 'শিরোনাম (বাংলা)'], max: 160, emptyAs: '' },
      { k: 'source', l: ['Source', 'উৎস'], max: 160 }, { k: 'description', l: ['Description', 'বিবরণ'], type: 'textarea', max: 2000, rows: 3 },
      { k: 'amount', l: A.amount, type: 'number', req: true }, { k: 'currency', l: A.currency, type: 'select', opts: CUR_OPTS, req: true },
      { k: 'income_date', l: A.date, type: 'date', req: true }, { k: 'receipt_path', l: A.receipt, type: 'receipt', folder: 'income' },
      { k: 'is_verified', l: A.verified_q, type: 'checkbox' }]
  }) },
  { id: 'expenses', g: 'g_finance', ic: 'receipt', cap: 'finance', run: async () => {
    const acts = await activityOpts();
    return crud({ table: 'humora_expenses', order: 'expense_date', csv: ['expense_date', 'title', 'category', 'amount', 'currency', 'approved_at'],
      cols: [{ l: A.date, f: (r) => esc(date(r.expense_date)) }, { l: ['Title', 'শিরোনাম'], f: (r) => `${esc(r.title)}<br><span class="note">${esc(tS('cat.' + r.category))}</span>` },
        { l: A.amount, num: true, f: (r) => esc(money(r.amount, r.currency)) }, { l: A.approve, f: (r) => (r.approved_by ? `<span class="pill green">${esc(tA('approve'))}</span>` : `<span class="pill gold">${esc(tA('not_approved'))}</span>`) },
        { l: A.receipt, f: (r) => (r.receipt_url ? `<button class="btn btn-sm btn-outline" data-act="receipt">${esc(tA('view_receipt'))}</button>` : '—') }],
      onAction: (act, r) => act === 'receipt' && openReceipt(r.receipt_url),
      toForm: (r) => ({ ...r, approved: !!r.approved_by }),
      beforeSave: (v) => { const { approved, ...rest } = v; return { ...rest, approved_by: approved ? me.id : null }; },
      fields: [{ k: 'title', l: ['Title (English)', 'শিরোনাম (ইংরেজি)'], req: true, max: 160 }, { k: 'title_bn', l: ['Title (Bangla)', 'শিরোনাম (বাংলা)'], max: 160, emptyAs: '' },
        { k: 'description', l: ['Description', 'বিবরণ'], type: 'textarea', max: 2000, rows: 3 },
        { k: 'amount', l: A.amount, type: 'number', req: true }, { k: 'currency', l: A.currency, type: 'select', opts: CUR_OPTS, req: true },
        { k: 'expense_date', l: A.date, type: 'date', req: true }, { k: 'category', l: ['Category', 'খাত'], type: 'select', opts: EXP_CAT_OPTS, req: true },
        { k: 'activity_id', l: ['Related activity', 'সংশ্লিষ্ট কার্যক্রম'], type: 'select', opts: acts, optional: true },
        { k: 'receipt_url', l: A.receipt, type: 'receipt', folder: 'expenses' },
        { k: 'approved', l: [A.approve[0] + ' (included in public totals)', A.approve[1] + ' (পাবলিক হিসাবে অন্তর্ভুক্ত)'], type: 'checkbox' }] });
  } },
  { id: 'reports', g: 'g_finance', ic: 'file', cap: 'finance', run: reports },
  { id: 'impact', g: 'g_content', ic: 'sparkles', cap: 'content', run: impact },
  { id: 'messages', g: 'g_content', ic: 'mail', cap: 'messages', run: () => crud({
    table: 'humora_contact_messages', noCreate: true, noEdit: true,
    filter: { k: 'status', opts: ['new', 'read', 'replied', 'archived'].map((s) => [s, A['st_' + s]]) },
    cols: [{ l: A.when, f: (r) => esc(dateTime(r.created_at)) }, { l: ['From', 'প্রেরক'], f: (r) => `<b>${esc(r.name)}</b><br><span class="note">${esc(r.email)}</span>` },
      { l: ['Subject', 'বিষয়'], k: 'subject' }, { l: A.status, f: (r) => pill(r.status) }],
    rowActions: () => `<button class="icon-btn" data-act="open" title="${esc(tA('open'))}" aria-label="${esc(tA('open'))}">${icon('eye')}</button>`,
    onAction: async (act, r, reload) => {
      if (act !== 'open') return;
      if (r.status === 'new') { await db.from('humora_contact_messages').update({ status: 'read' }).eq('id', r.id); }
      openModal(r.subject, `<dl class="kv"><dt>${esc(L('From', 'প্রেরক'))}</dt><dd>${esc(r.name)} &lt;${esc(r.email)}&gt;</dd><dt>${esc(tA('when'))}</dt><dd>${esc(dateTime(r.created_at))}</dd>
        <dt>${esc(L('Language', 'ভাষা'))}</dt><dd>${r.language === 'bn' ? 'বাংলা' : 'English'}</dd><dt>${esc(tA('message'))}</dt><dd>${esc(r.message)}</dd></dl>
        <div class="row-actions mt"><a class="btn btn-sm btn-green" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Re: ' + r.subject)}">${icon('mail')}${esc(tA('reply'))}</a>
        ${['read', 'replied', 'archived'].map((s) => `<button class="btn btn-sm btn-outline" data-st="${s}">${esc(tA('st_' + s))}</button>`).join('')}</div>`);
      $('#modalBody').querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', async () => {
        const { error } = await db.from('humora_contact_messages').update({ status: b.dataset.st }).eq('id', r.id);
        if (error) return toast(errText(error), true); closeModal(); toast(tA('saved')); reload();
      }));
      reload();
    }
  }) },
  { id: 'site', g: 'g_content', ic: 'layout', cap: 'content', run: siteContent },
  { id: 'payments', g: 'g_finance', ic: 'card', cap: 'finance', run: () => crud({
    table: 'humora_payment_methods', order: 'sort_order', asc: true, help: A.pay_help.slice(),
    cols: [{ l: ['Method', 'পদ্ধতি'], f: (r) => `<b>${esc(r.name_en)}</b><br><span class="note">${esc(r.name_bn)}</span>` }, { l: A.currency, k: 'currency' },
      { l: A.verified, f: (r) => yes(r.is_verified) }, { l: A.active, f: (r) => yes(r.is_active) }],
    fields: [{ k: 'name_en', l: ['Name (English) e.g. bKash', 'নাম (ইংরেজি) যেমন bKash'], req: true, max: 80 }, { k: 'name_bn', l: ['Name (Bangla)', 'নাম (বাংলা)'], max: 80, emptyAs: '' },
      { k: 'method_type', l: ['Type', 'ধরন'], type: 'select', req: true, opts: [['mobile_banking', ['Mobile banking', 'মোবাইল ব্যাংকিং']], ['bank', ['Bank transfer', 'ব্যাংক ট্রান্সফার']], ['international', ['International transfer', 'আন্তর্জাতিক ট্রান্সফার']], ['other', ['Other', 'অন্যান্য']]] },
      { k: 'currency', l: A.currency, type: 'select', req: true, opts: [['BDT', 'BDT'], ['USD', 'USD'], ['ANY', ['Any', 'যেকোনো']]] },
      { k: 'account_name', l: ['Account name', 'অ্যাকাউন্টের নাম'], max: 120 },
      { k: 'account_details', l: ['Account number / details', 'অ্যাকাউন্ট নম্বর / বিস্তারিত'], type: 'textarea', max: 600, rows: 3 },
      { k: 'instructions_en', l: ['Instructions (English)', 'নির্দেশনা (ইংরেজি)'], type: 'textarea', max: 2000, rows: 3, emptyAs: '' },
      { k: 'instructions_bn', l: ['Instructions (Bangla)', 'নির্দেশনা (বাংলা)'], type: 'textarea', max: 2000, rows: 3, emptyAs: '' },
      { k: 'sort_order', l: ['Order', 'ক্রম'], type: 'number', def: 0 },
      { k: 'is_verified', l: ['I have verified these account details', 'আমি এই অ্যাকাউন্টের তথ্য যাচাই করেছি'], type: 'checkbox' },
      { k: 'is_active', l: ['Show on Donate page', 'দান পাতায় দেখান'], type: 'checkbox' }]
  }) },
  { id: 'users', g: 'g_system', ic: 'users', cap: 'users', run: users },
  { id: 'lang', g: 'g_system', ic: 'languages', cap: 'content', run: langContent },
  { id: 'audit', g: 'g_system', ic: 'history', cap: 'audit', run: () => crud({
    table: 'humora_audit_logs', noCreate: true, noEdit: true, noDelete: true, limit: 300,
    filter: { k: 'table_name', opts: ['humora_donations', 'humora_income', 'humora_expenses', 'humora_payment_methods', 'humora_activities', 'humora_content', 'humora_settings', 'humora_profiles', 'humora_impact_statistics', 'auth.users'].map((t) => [t, t.replace('humora_', '')]) },
    cols: [{ l: A.when, f: (r) => esc(dateTime(r.created_at)) }, { l: A.admin, f: (r) => esc(adminNames[r.admin_id] || (r.admin_id || '').slice(0, 8)) },
      { l: A.action, f: (r) => `<span class="pill">${esc(r.action)}</span>` }, { l: A.table, f: (r) => esc(r.table_name.replace('humora_', '')) }, { l: ['Record', 'রেকর্ড'], f: (r) => `<code>${esc((r.record_id || '').slice(0, 13))}</code>` }],
    rowActions: (r) => (r.details ? `<button class="icon-btn" data-act="detail" title="${esc(tA('details'))}" aria-label="${esc(tA('details'))}">${icon('eye')}</button>` : ''),
    onAction: (act, r) => act === 'detail' && openModal(tA('details'), `<pre class="json">${esc(JSON.stringify(r.details, null, 2))}</pre>`)
  }) }
];
let adminNames = {};

/* ---------------------------------------------------------------- overview */
async function overview() {
  const view = $('#view');
  view.innerHTML = '<div class="spinner"></div>';
  const fin = can('finance'); const msgs = can('messages');
  const [don, inc, exp, msg, acts, settings, methods, founders, impact] = await Promise.all([
    fin ? db.from('humora_donations').select('donation_ref,donor_name,amount,currency,status,created_at').order('created_at', { ascending: false }).limit(500) : { data: null },
    fin ? db.from('humora_income').select('amount,currency,is_verified') : { data: null },
    fin ? db.from('humora_expenses').select('amount,currency,approved_by') : { data: null },
    msgs ? db.from('humora_contact_messages').select('name,subject,status,created_at').order('created_at', { ascending: false }).limit(50) : { data: null },
    db.from('humora_activities').select('status'),
    db.from('humora_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('humora_payment_methods').select('is_active,is_verified'),
    db.from('humora_founders').select('is_published'),
    db.rpc('humora_public_impact')
  ]);
  const sum = (arr, cur, pred) => (arr || []).filter((x) => x.currency === cur && pred(x)).reduce((s, x) => s + Number(x.amount), 0);
  const kpis = [];
  if (fin) {
    const d = don.data || [];
    kpis.push([tA('k_pending'), num(d.filter((x) => x.status === 'pending' || x.status === 'payment_submitted').length), '']);
    for (const c of ['BDT', 'USD']) {
      const v = sum(d, c, (x) => x.status === 'verified');
      const bal = v + sum(inc.data, c, (x) => x.is_verified) - sum(exp.data, c, (x) => x.approved_by);
      kpis.push([tA(c === 'BDT' ? 'k_verified_bdt' : 'k_verified_usd'), money(v, c), `${tA('k_balance')}: ${money(bal, c)}`]);
    }
  }
  if (msgs) kpis.push([tA('k_messages'), num((msg.data || []).filter((m) => m.status === 'new').length), '']);
  kpis.push([tA('k_activities'), num((acts.data || []).filter((a) => a.status === 'published').length), '']);
  const s = settings.data || {};
  const missing = [
    !(s.contact_email || s.phone || s.whatsapp) && 'miss_contact', !(s.facebook_url || s.instagram_url || s.youtube_url || s.x_url || s.linkedin_url) && 'miss_social',
    !(methods.data || []).some((m) => m.is_active && m.is_verified) && 'miss_pay', !(founders.data || []).some((f) => f.is_published) && 'miss_founders',
    !s.hero_image_url && 'miss_hero', !(impact.data || []).some((i) => i.is_verified) && 'miss_impact', !(acts.data || []).some((a) => a.status === 'published') && 'miss_activity'
  ].filter(Boolean);
  view.innerHTML = `<div class="kpis">${kpis.map(([l, v, sub]) => `<div class="card kpi"><div class="lbl">${esc(l)}</div><div class="val">${esc(v)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`).join('')}</div>
    <div class="grid g2">
      <div class="card"><h3>${icon('alert')} ${esc(tA('missing'))}</h3>${missing.length ? `<ul class="checklist">${missing.map((m) => `<li>${icon('alert')}<span>${esc(tA(m))}</span></li>`).join('')}</ul>` : `<p>${esc(tA('all_set'))}</p>`}</div>
      ${fin ? `<div class="card"><h3>${esc(tA('recent_don'))}</h3>${(don.data || []).slice(0, 6).map((d) => `<div class="content-row"><b>${esc(d.donor_name)}</b> · ${esc(money(d.amount, d.currency))} ${pill(d.status)}<br><span class="note">${esc(d.donation_ref)} · ${esc(dateTime(d.created_at))}</span></div>`).join('') || `<p class="note">${esc(tA('none'))}</p>`}</div>` : ''}
      ${msgs ? `<div class="card"><h3>${esc(tA('recent_msg'))}</h3>${(msg.data || []).slice(0, 6).map((m) => `<div class="content-row"><b>${esc(m.name)}</b> · ${esc(m.subject)} ${pill(m.status)}<br><span class="note">${esc(dateTime(m.created_at))}</span></div>`).join('') || `<p class="note">${esc(tA('none'))}</p>`}</div>` : ''}
    </div>`;
}

/* ---------------------------------------------------------------- donations */
async function donations() {
  await crud({
    table: 'humora_donations', help: A.verify_warn.slice(),
    csv: ['donation_ref', 'created_at', 'donor_name', 'email', 'country', 'amount', 'currency', 'payment_method', 'transaction_reference', 'status', 'verified_at'],
    filter: { k: 'status', opts: ['pending', 'payment_submitted', 'verified', 'rejected'].map((s) => [s, A['st_' + s]]) },
    formTop: `<p class="alert info">${esc(tA('offline_help'))}</p>`,
    cols: [{ l: A.reference, f: (r) => `<code>${esc(r.donation_ref)}</code><br><span class="note">${esc(dateTime(r.created_at))}</span>` },
      { l: A.donor, f: (r) => `<b>${esc(r.donor_name)}</b><br><span class="note">${esc(r.email)} · ${esc(r.country)}</span>` },
      { l: A.amount, num: true, f: (r) => esc(money(r.amount, r.currency)) }, { l: A.txn, f: (r) => esc(r.transaction_reference || '—') }, { l: A.status, f: (r) => pill(r.status) }],
    rowActions: () => `<button class="icon-btn" data-act="open" title="${esc(tA('open'))}" aria-label="${esc(tA('open'))}">${icon('eye')}</button>`,
    noEdit: true,
    beforeSave: (v) => ({ ...v, status: 'pending', language: lang }),
    fields: [{ k: 'donor_name', l: ['Donor name', 'দাতার নাম'], req: true, max: 100 }, { k: 'email', l: A.email, type: 'email', req: true, max: 160 },
      { k: 'country', l: A.country, req: true, max: 60, def: 'Bangladesh' }, { k: 'amount', l: A.amount, type: 'number', req: true },
      { k: 'currency', l: A.currency, type: 'select', opts: CUR_OPTS, req: true }, { k: 'payment_method', l: A.method, max: 80 },
      { k: 'transaction_reference', l: A.txn, max: 100 }, { k: 'message', l: A.message, type: 'textarea', max: 1000, rows: 3 }],
    onAction: async (act, r, reload) => {
      if (act !== 'open') return;
      const btn = (st, cls, key) => (r.status !== st ? `<button class="btn btn-sm ${cls}" data-st="${st}">${esc(tA(key))}</button>` : '');
      openModal(`${tA('m_donations')} · ${r.donation_ref}`, `<dl class="kv">
        <dt>${esc(tA('donor'))}</dt><dd>${esc(r.donor_name)}</dd><dt>${esc(tA('email'))}</dt><dd>${esc(r.email)}</dd><dt>${esc(tA('country'))}</dt><dd>${esc(r.country)}</dd>
        <dt>${esc(tA('amount'))}</dt><dd>${esc(money(r.amount, r.currency))}</dd><dt>${esc(tA('method'))}</dt><dd>${esc(r.payment_method || '—')}</dd>
        <dt>${esc(tA('txn'))}</dt><dd>${esc(r.transaction_reference || '—')}</dd><dt>${esc(tA('message'))}</dt><dd>${esc(r.message || '—')}</dd>
        <dt>${esc(tA('status'))}</dt><dd>${pill(r.status)}</dd><dt>${esc(tA('created'))}</dt><dd>${esc(dateTime(r.created_at))}</dd>
        ${r.verified_at ? `<dt>${esc(tA('verified_at'))}</dt><dd>${esc(dateTime(r.verified_at))} · ${esc(adminNames[r.verified_by] || '')}</dd>` : ''}</dl>
        <div class="field mt"><label for="anote">${esc(tA('note'))}</label><textarea id="anote" maxlength="1000" rows="2">${esc(r.admin_note || '')}</textarea></div>
        <p class="alert info">${esc(tA('verify_warn'))}</p>
        <div class="row-actions">${btn('verified', 'btn-green', 'verify')}${btn('rejected', 'btn-outline', 'reject')}${btn('payment_submitted', 'btn-outline', 'mark_submitted')}${btn('pending', 'btn-outline', 'reopen')}
        <button class="btn btn-sm btn-navy" data-st="">${esc(tA('save'))}</button></div>`);
      $('#modalBody').querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', async () => {
        const patch = { admin_note: $('#anote').value.trim() || null };
        if (b.dataset.st) patch.status = b.dataset.st;
        const { error } = await db.from('humora_donations').update(patch).eq('id', r.id);
        if (error) return toast(errText(error), true);
        closeModal(); toast(tA('saved')); reload();
      }));
    }
  });
}

/* ---------------------------------------------------------------- reports */
async function reports() {
  const view = $('#view');
  view.innerHTML = '<div class="spinner"></div>';
  const [d, i, e] = await Promise.all([
    db.from('humora_donations').select('amount,currency,status,verified_at,created_at'),
    db.from('humora_income').select('amount,currency,is_verified,income_date'),
    db.from('humora_expenses').select('amount,currency,approved_by,expense_date')
  ]);
  const months = {};
  const add = (m, c, k, v) => { const key = m + '|' + c; months[key] = months[key] || { month: m, currency: c, income: 0, expenses: 0, unverified: 0 }; months[key][k] += Number(v); };
  for (const x of d.data || []) {
    if (x.status === 'verified') add(String(x.verified_at).slice(0, 7), x.currency, 'income', x.amount);
    else if (x.status !== 'rejected') add(String(x.created_at).slice(0, 7), x.currency, 'unverified', x.amount);
  }
  for (const x of i.data || []) add(String(x.income_date).slice(0, 7), x.currency, x.is_verified ? 'income' : 'unverified', x.amount);
  for (const x of e.data || []) if (x.approved_by) add(String(x.expense_date).slice(0, 7), x.currency, 'expenses', x.amount);
  const list = Object.values(months).sort((a, b) => (b.month + b.currency).localeCompare(a.month + a.currency));
  const totals = ['BDT', 'USD'].map((c) => { const r = list.filter((x) => x.currency === c); return { c, inc: r.reduce((s, x) => s + x.income, 0), exp: r.reduce((s, x) => s + x.expenses, 0), un: r.reduce((s, x) => s + x.unverified, 0) }; });
  view.innerHTML = `<div class="kpis">${totals.map((t) => `<div class="card kpi"><div class="lbl">${t.c} · ${esc(tA('k_balance'))}</div><div class="val">${esc(money(t.inc - t.exp, t.c))}</div>
      <div class="sub">${esc(tA('income_total'))}: ${esc(money(t.inc, t.c))} · ${esc(tA('expense_total'))}: ${esc(money(t.exp, t.c))}<br>${esc(tA('unverified'))}: ${esc(money(t.un, t.c))}</div></div>`).join('')}</div>
    <div class="card"><div class="toolbar"><h3 class="grow">${esc(tA('monthly'))}</h3><button class="btn btn-sm btn-outline" id="csvM">${icon('file')}${esc(tA('export'))}</button></div>
    ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${esc(L('Month', 'মাস'))}</th><th>${esc(tA('currency'))}</th><th class="num">${esc(tA('income_total'))}</th><th class="num">${esc(tA('expense_total'))}</th><th class="num">${esc(L('Net', 'নিট'))}</th><th class="num">${esc(tA('unverified'))}</th></tr></thead>
    <tbody>${list.map((m) => `<tr><td>${esc(m.month)}</td><td>${m.currency}</td><td class="num">${esc(money(m.income, m.currency))}</td><td class="num">${esc(money(m.expenses, m.currency))}</td><td class="num">${esc(money(m.income - m.expenses, m.currency))}</td><td class="num">${esc(money(m.unverified, m.currency))}</td></tr>`).join('')}</tbody></table></div>` : `<p class="note">${esc(tA('none'))}</p>`}</div>
    <h2 class="mt">${esc(tA('published_reports'))}</h2><div id="repCrud"></div>`;
  $('#csvM').addEventListener('click', () => downloadCsv('humora-monthly-summary.csv', list, ['month', 'currency', 'income', 'expenses', 'unverified']));
  const realView = $('#view');
  // render the statements CRUD inside the reports page
  const sub = $('#repCrud');
  const orig = realView.id; realView.id = 'view-old'; sub.id = 'view';
  try {
    await crud({ table: 'humora_financial_reports', order: 'period_end',
      cols: [{ l: ['Title', 'শিরোনাম'], f: (r) => `${esc(r.title_en)}<br><span class="note">${esc(r.title_bn)}</span>` }, { l: ['Type', 'ধরন'], k: 'report_type' },
        { l: ['Period', 'সময়কাল'], f: (r) => `${esc(date(r.period_start))} – ${esc(date(r.period_end))}` }, { l: A.published_q, f: (r) => yes(r.is_published) }],
      fields: [{ k: 'report_type', l: ['Type', 'ধরন'], type: 'select', req: true, opts: [['monthly', ['Monthly report', 'মাসিক প্রতিবেদন']], ['annual', ['Annual report', 'বার্ষিক প্রতিবেদন']], ['statement', ['Financial statement', 'আর্থিক বিবরণী']], ['audit', ['Audit report', 'অডিট প্রতিবেদন']]] },
        { k: 'title_en', l: ['Title (English)', 'শিরোনাম (ইংরেজি)'], req: true, max: 160 }, { k: 'title_bn', l: ['Title (Bangla)', 'শিরোনাম (বাংলা)'], max: 160, emptyAs: '' },
        { k: 'period_start', l: ['Period start', 'শুরুর তারিখ'], type: 'date', req: true }, { k: 'period_end', l: ['Period end', 'শেষ তারিখ'], type: 'date', req: true },
        { k: 'summary_en', l: ['Summary (English)', 'সারাংশ (ইংরেজি)'], type: 'textarea', max: 3000, rows: 3, emptyAs: '' }, { k: 'summary_bn', l: ['Summary (Bangla)', 'সারাংশ (বাংলা)'], type: 'textarea', max: 3000, rows: 3, emptyAs: '' },
        { k: 'file_url', l: ['Document (PDF)', 'ডকুমেন্ট (PDF)'], type: 'file', folder: 'reports' }, { k: 'is_published', l: A.published_q, type: 'checkbox' }] });
  } finally { sub.id = 'repCrud'; realView.id = orig; }
}

/* ---------------------------------------------------------------- impact */
async function impact() {
  const view = $('#view');
  const { data, error } = await db.from('humora_impact_statistics').select('*').order('metric_name');
  if (error) { view.innerHTML = `<div class="alert error">${esc(errText(error))}</div>`; return; }
  view.innerHTML = `<p class="alert info">${esc(tA('impact_help'))}</p><form class="card form" id="impForm">${(data || []).map((r) => `<div class="row">
    <div class="field"><label for="iv_${r.metric_name}">${esc(tS('impact.' + r.metric_name))}</label><input id="iv_${r.metric_name}" type="number" min="0" step="1" value="${r.metric_value ?? ''}" data-m="${r.metric_name}"></div>
    <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" data-v="${r.metric_name}" ${r.is_verified ? 'checked' : ''}> ${esc(tA('verified'))}</label><div class="help">${esc(L('Last updated', 'সর্বশেষ হালনাগাদ'))}: ${esc(dateTime(r.updated_at))}</div></div></div>`).join('')}
    <button class="btn btn-green" type="submit">${icon('check')}${esc(tA('save'))}</button></form>`;
  $('#impForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    for (const r of data) {
      const raw = $(`[data-m="${r.metric_name}"]`).value; const val = raw === '' ? null : Math.max(0, Math.round(Number(raw)));
      const ver = $(`[data-v="${r.metric_name}"]`).checked && val !== null;
      if (val === r.metric_value && ver === r.is_verified) continue;
      const { error: err } = await db.from('humora_impact_statistics').update({ metric_value: val, is_verified: ver }).eq('id', r.id);
      if (err) return toast(errText(err), true);
    }
    toast(tA('saved')); impact();
  });
}

/* ---------------------------------------------------------------- website content */
async function siteContent() {
  const view = $('#view');
  view.innerHTML = `<div class="tabs" role="group"><button data-tab="settings" aria-pressed="true">${esc(tA('settings'))}</button><button data-tab="founders" aria-pressed="false">${esc(tA('founders'))}</button><button data-tab="testimonials" aria-pressed="false">${esc(tA('testimonials'))}</button></div><div id="tabBody"></div>`;
  const tabs = view.querySelectorAll('[data-tab]');
  const show = async (tab) => {
    tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    const body = $('#tabBody'); const realView = $('#view');
    if (tab === 'settings') return settingsForm(body);
    realView.id = 'view-old'; body.id = 'view';
    try {
      if (tab === 'founders') await crud({ table: 'humora_founders', order: 'sort_order', asc: true,
        cols: [{ l: ['Photo', 'ছবি'], f: (r) => (safeUrl(r.photo_url) ? `<img class="thumb" src="${esc(r.photo_url)}" alt="">` : '—') }, { l: A.full_name, f: (r) => `<b>${esc(r.name_en)}</b><br><span class="note">${esc(r.name_bn)}</span>` },
          { l: A.role, f: (r) => esc(r.role_en) }, { l: A.published_q, f: (r) => yes(r.is_published) }],
        fields: [{ k: 'name_en', l: ['Name (English)', 'নাম (ইংরেজি)'], req: true, max: 100 }, { k: 'name_bn', l: ['Name (Bangla)', 'নাম (বাংলা)'], max: 100, emptyAs: '' },
          { k: 'role_en', l: ['Role (English) e.g. Co-founder', 'ভূমিকা (ইংরেজি)'], max: 100, emptyAs: '' }, { k: 'role_bn', l: ['Role (Bangla)', 'ভূমিকা (বাংলা)'], max: 100, emptyAs: '' },
          { k: 'bio_en', l: ['Short bio (English)', 'সংক্ষিপ্ত পরিচিতি (ইংরেজি)'], type: 'textarea', max: 2000, rows: 3, emptyAs: '' }, { k: 'bio_bn', l: ['Short bio (Bangla)', 'সংক্ষিপ্ত পরিচিতি (বাংলা)'], type: 'textarea', max: 2000, rows: 3, emptyAs: '' },
          { k: 'photo_url', l: ['Photo', 'ছবি'], type: 'image', folder: 'founders' }, { k: 'sort_order', l: ['Order', 'ক্রম'], type: 'number', def: 0 }, { k: 'is_published', l: A.published_q, type: 'checkbox' }] });
      else await crud({ table: 'humora_testimonials', help: A.consent_help.slice(),
        cols: [{ l: ['Person', 'ব্যক্তি'], f: (r) => `<b>${esc(r.person_name)}</b><br><span class="note">${esc(r.location || '')}</span>` }, { l: ['Text', 'লেখা'], f: (r) => esc(String(r.description).slice(0, 90)) },
          { l: A.published_q, f: (r) => yes(r.is_published) }],
        fields: [{ k: 'person_name', l: A.full_name, req: true, max: 100 }, { k: 'location', l: ['Location', 'স্থান'], max: 120 },
          { k: 'description', l: ['Testimonial (English)', 'মতামত (ইংরেজি)'], type: 'textarea', req: true, max: 1500, rows: 4 }, { k: 'description_bn', l: ['Testimonial (Bangla)', 'মতামত (বাংলা)'], type: 'textarea', max: 1500, rows: 4, emptyAs: '' },
          { k: 'image_url', l: ['Photo (optional)', 'ছবি (ঐচ্ছিক)'], type: 'image', folder: 'testimonials' },
          { k: 'consent_confirmed', l: ['The person gave permission to publish this', 'ব্যক্তি প্রকাশের অনুমতি দিয়েছেন'], type: 'checkbox' }, { k: 'is_published', l: A.published_q, type: 'checkbox' }] });
    } finally { body.id = 'tabBody'; realView.id = 'view'; }
  };
  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show('settings');
}
async function settingsForm(body) {
  const { data: s } = await db.from('humora_settings').select('*').eq('id', 1).maybeSingle();
  const fields = [
    { k: 'contact_email', l: ['Contact email', 'যোগাযোগের ইমেইল'], type: 'email', max: 160 }, { k: 'phone', l: ['Phone', 'ফোন'], max: 30 },
    { k: 'whatsapp', l: ['WhatsApp number with country code (e.g. 8801XXXXXXXXX)', 'দেশের কোডসহ হোয়াটসঅ্যাপ নম্বর (যেমন 8801XXXXXXXXX)'], max: 16 },
    { k: 'address_en', l: ['Address (English)', 'ঠিকানা (ইংরেজি)'], max: 300 }, { k: 'address_bn', l: ['Address (Bangla)', 'ঠিকানা (বাংলা)'], max: 300 },
    { k: 'facebook_url', l: ['Facebook URL', 'ফেসবুক লিংক'], type: 'url' }, { k: 'instagram_url', l: ['Instagram URL', 'ইনস্টাগ্রাম লিংক'], type: 'url' },
    { k: 'youtube_url', l: ['YouTube URL', 'ইউটিউব লিংক'], type: 'url' }, { k: 'x_url', l: ['X (Twitter) URL', 'এক্স (টুইটার) লিংক'], type: 'url' }, { k: 'linkedin_url', l: ['LinkedIn URL', 'লিংকডইন লিংক'], type: 'url' },
    { k: 'hero_image_url', l: ['Homepage hero photo (real, with permission)', 'হোমপেজ হিরো ছবি (বাস্তব, অনুমতিসহ)'], type: 'image', folder: 'site' },
    { k: 'about_image_url', l: ['About section photo', 'আমাদের সম্পর্কে অংশের ছবি'], type: 'image', folder: 'site' },
    { k: 'registration_info', l: ['Registration information (only if officially registered)', 'নিবন্ধন তথ্য (শুধু নিবন্ধিত হলে)'], max: 200 },
    { k: 'show_transparency', l: ['Show financial totals on the Transparency page', 'স্বচ্ছতা পাতায় আর্থিক হিসাব দেখান'], type: 'checkbox' }];
  body.innerHTML = `<form class="card form" id="setForm">${fields.map((f) => fieldHtml(f, s?.[f.k])).join('')}<button class="btn btn-green" type="submit">${icon('check')}${esc(tA('save'))}</button></form>`;
  const form = $('#setForm'); wireUploads(form, fields);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form, fields);
    if (v.whatsapp) v.whatsapp = v.whatsapp.replace(/[\s-]/g, '');
    for (const k of ['facebook_url', 'instagram_url', 'youtube_url', 'x_url', 'linkedin_url']) if (v[k] && !/^https:\/\//.test(v[k])) return toast(`${k}: https://`, true);
    const { error } = await db.from('humora_settings').update(v).eq('id', 1);
    if (error) return toast(errText(error), true);
    try { sessionStorage.removeItem('humora_settings'); } catch { /* ignore */ }
    toast(tA('saved'));
  });
}

/* ---------------------------------------------------------------- language content */
async function langContent() {
  const view = $('#view');
  const keys = Object.keys(STRINGS.en).filter((k) => k.startsWith('c.'));
  const { data } = await db.from('humora_content').select('*');
  const db_ = Object.fromEntries((data || []).map((r) => [r.key, r]));
  view.innerHTML = `<p class="alert info">${esc(tA('lang_help'))}</p><div class="toolbar"><input type="search" id="lq" placeholder="${esc(tA('search'))}" aria-label="${esc(tA('search'))}"></div>
    <div class="card">${keys.map((k) => { const r = db_[k]; const en = r?.value_en || STRINGS.en[k]; const bn = r?.value_bn || STRINGS.bn[k]; const long = (en + bn).length > 160;
      return `<form class="content-row" data-key="${esc(k)}"><div class="toolbar"><code class="grow">${esc(k)}</code>${r ? `<span class="pill gold">${esc(tA('customized'))}</span><button type="button" class="btn btn-sm btn-outline" data-reset>${esc(tA('reset_default'))}</button>` : ''}<button class="btn btn-sm btn-green" type="submit">${esc(tA('save'))}</button></div>
        <div class="lang-grid"><div class="field"><label>English</label>${long ? `<textarea name="en" rows="${k.endsWith('.body') ? 14 : 4}" maxlength="5000">${esc(en)}</textarea>` : `<input name="en" maxlength="5000" value="${esc(en)}">`}</div>
        <div class="field"><label lang="bn">বাংলা</label>${long ? `<textarea name="bn" lang="bn" rows="${k.endsWith('.body') ? 14 : 4}" maxlength="5000">${esc(bn)}</textarea>` : `<input name="bn" lang="bn" maxlength="5000" value="${esc(bn)}">`}</div></div></form>`; }).join('')}</div>`;
  $('#lq').addEventListener('input', () => { const q = $('#lq').value.toLowerCase(); view.querySelectorAll('form[data-key]').forEach((f) => { f.classList.toggle('hidden', !!q && !f.textContent.toLowerCase().includes(q) && ![...f.querySelectorAll('input,textarea')].some((i) => i.value.toLowerCase().includes(q))); }); });
  view.querySelectorAll('form[data-key]').forEach((f) => {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = f.dataset.key;
      const { error } = await db.from('humora_content').upsert({ key, section: key.split('.')[1], value_en: f.elements.en.value.trim(), value_bn: f.elements.bn.value.trim() });
      if (error) return toast(errText(error), true);
      try { sessionStorage.removeItem('humora_content'); } catch { /* ignore */ }
      toast(tA('saved')); langContent();
    });
    f.querySelector('[data-reset]')?.addEventListener('click', async () => {
      if (!(await confirmBox(tA('reset_default') + '?'))) return;
      const { error } = await db.from('humora_content').delete().eq('key', f.dataset.key);
      if (error) return toast(errText(error), true); toast(tA('saved')); langContent();
    });
  });
}

/* ---------------------------------------------------------------- users */
async function callAdminFn(body) {
  const { data: { session } } = await db.auth.getSession();
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/humora-admin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify(body) });
  } catch { throw new Error(tA('fn_missing')); }
  if (res.status === 404) throw new Error(tA('fn_missing'));
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'ERROR');
  return out;
}
const ROLE_OPTS = ['super_admin', 'admin', 'editor', 'finance'].map((r) => [r, A['r_' + r]]);
async function users() {
  await crud({ table: 'humora_profiles', noDelete: false,
    cols: [{ l: A.full_name, f: (r) => `<b>${esc(r.full_name)}</b><br><span class="note">${esc(r.email)}</span>` }, { l: A.role, f: (r) => `<span class="pill blue">${esc(r.role)}</span>` },
      { l: A.active, f: (r) => yes(r.active) }, { l: A.created, f: (r) => esc(date(r.created_at)) }],
    rowActions: () => `<button class="icon-btn" data-act="pw" title="${esc(tA('reset_pw'))}" aria-label="${esc(tA('reset_pw'))}">${icon('lock')}</button>`,
    noCreate: false,
    fields: [{ k: 'full_name', l: A.full_name, req: true, max: 100 }, { k: 'role', l: A.role, type: 'select', opts: ROLE_OPTS, req: true }, { k: 'active', l: A.active, type: 'checkbox', def: true }],
    onAction: async (act, r) => {
      if (act !== 'pw') return;
      formModal(`${tA('reset_pw')} · ${r.email}`, [{ k: 'password', l: A.temp_pass, type: 'password', req: true }], null, async (v) => {
        if (String(v.password).length < 10) throw new Error('PASSWORD_TOO_SHORT');
        await callAdminFn({ action: 'reset_password', user_id: r.id, password: v.password });
      });
    }
  });
  // replace the generic "Add" with account creation through the edge function
  const add = $('#add'); const clone = add.cloneNode(true); add.replaceWith(clone);
  clone.innerHTML = `${icon('plus')}${esc(tA('create_user'))}`;
  clone.addEventListener('click', () => formModal(tA('create_user'), [
    { k: 'full_name', l: A.full_name, req: true, max: 100 }, { k: 'email', l: A.email, type: 'email', req: true, max: 160 },
    { k: 'password', l: A.temp_pass, type: 'password', req: true }, { k: 'role', l: A.role, type: 'select', opts: ROLE_OPTS, req: true, def: 'editor' }
  ], null, async (v) => { if (String(v.password).length < 10) throw new Error('PASSWORD_TOO_SHORT'); await callAdminFn({ action: 'create_user', ...v }); users(); }));
}

/* ---------------------------------------------------------------- shell */
function applyStaticText() {
  document.documentElement.lang = lang;
  $('#loginTitle').textContent = tA('signin'); $('#lEmailLbl').textContent = tA('email'); $('#lPassLbl').textContent = tA('password');
  $('#loginBtn').textContent = tA('signin_btn'); $('#forgotBtn').textContent = tA('forgot'); $('#np1Lbl').textContent = tA('new_pass'); $('#npBtn').textContent = tA('save_pass');
  $('#logoutBtn').innerHTML = `${icon('logout')}${esc(tA('logout'))}`;
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang; try { localStorage.setItem('humora_lang', lang); } catch { /* ignore */ }
  applyStaticText(); if (me) { buildNav(); route(); }
}));

function buildNav() {
  const GROUPS = ['g_main', 'g_content', 'g_finance', 'g_system'];
  const visible = MODULES.filter((m) => !m.cap || can(m.cap)).sort((a, b) => GROUPS.indexOf(a.g) - GROUPS.indexOf(b.g));
  let html = ''; let g = '';
  for (const m of visible) {
    if (m.g !== g) { g = m.g; html += `<div class="grp">${esc(tA(g))}</div>`; }
    html += `<a href="#${m.id}" data-mod="${m.id}">${icon(m.ic)}${esc(tA('m_' + m.id))}</a>`;
  }
  $('#sideNav').innerHTML = html;
  $('#who').innerHTML = `<b>${esc(me.full_name)}</b>${esc(me.role)}`;
}
async function route() {
  const id = (location.hash || '#overview').slice(1);
  const mod = MODULES.find((m) => m.id === id && (!m.cap || can(m.cap))) || MODULES[0];
  document.querySelectorAll('#sideNav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.mod === mod.id));
  document.querySelectorAll('#sideNav a[aria-current]').forEach((a) => a.setAttribute('aria-current', 'page'));
  $('#pageTitle').textContent = tA('m_' + mod.id);
  document.title = `${tA('m_' + mod.id)} | HUMORA Admin`;
  $('#sidebar').classList.remove('open');
  $('#view').innerHTML = '<div class="spinner"></div>';
  try { await mod.run(); } catch (e) { $('#view').innerHTML = `<div class="alert error">${esc(errText(e))}</div>`; }
}
window.addEventListener('hashchange', () => me && route());
$('#sideToggle').innerHTML = icon('menu');
$('#sideToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

async function enter() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { showLogin(); return; }
  const { data: prof } = await db.from('humora_profiles').select('id,full_name,email,role,active').eq('id', user.id).maybeSingle();
  if (!prof || !prof.active) { await db.auth.signOut(); showLogin(tA('no_access')); return; }
  me = prof;
  if (can('audit') || can('users') || can('finance')) {
    const { data } = await db.from('humora_profiles').select('id,full_name');
    adminNames = Object.fromEntries((data || []).map((p) => [p.id, p.full_name]));
  }
  $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  buildNav(); route();
}
function showLogin(msg) {
  me = null;
  $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden');
  $('#loginMsg').innerHTML = msg ? `<div class="alert error">${esc(msg)}</div>` : '';
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#lemail').value.trim(); const password = $('#lpass').value;
  if (!email || !password) return;
  $('#loginBtn').disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password });
  $('#loginBtn').disabled = false;
  if (error) { $('#loginMsg').innerHTML = `<div class="alert error">${esc(tA('bad_login'))}</div>`; return; }
  $('#lpass').value = ''; enter();
});
$('#forgotBtn').addEventListener('click', async () => {
  const email = $('#lemail').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('#lemail').focus(); $('#loginMsg').innerHTML = `<div class="alert error">${esc(tS('form.email'))}</div>`; return; }
  await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/` });
  $('#loginMsg').innerHTML = `<div class="alert ok">${esc(tA('reset_sent'))}</div>`;
});
$('#newPassForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = $('#np1').value;
  if (p.length < 10) { $('#npMsg').innerHTML = `<div class="alert error">${esc(tA('new_pass'))}</div>`; return; }
  const { error } = await db.auth.updateUser({ password: p });
  if (error) { $('#npMsg').innerHTML = `<div class="alert error">${esc(errText(error))}</div>`; return; }
  toast(tA('pass_saved')); history.replaceState(null, '', '/admin/'); $('#newPassForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden'); enter();
});
$('#logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); showLogin(); });
db.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') showLogin(); });

applyStaticText();
if (AUTH_TYPE === 'recovery') {
  $('#loginView').classList.remove('hidden'); $('#loginForm').classList.add('hidden'); $('#newPassForm').classList.remove('hidden');
} else {
  enter();
}
