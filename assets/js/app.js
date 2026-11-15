// HUMORA FOUNDATION – public website runtime (language, layout, data, pages).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SITE_URL } from './config.js';
import { STRINGS } from './strings.js';
import { icon, CATEGORY_ICON } from './icons.js';

export const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

/* ------------------------------------------------------------------ language */
const LANG_KEY = 'humora_lang';
const qsLang = new URLSearchParams(location.search).get('lang');
export let lang = (qsLang === 'bn' || qsLang === 'en') ? qsLang : (safeGet(LANG_KEY) || 'en');
if (lang !== 'bn' && lang !== 'en') lang = 'en';
safeSet(LANG_KEY, lang);
let overrides = {};   // humora_content values from the database

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }

export function t(key, vars) {
  let s = (overrides[key] && overrides[key][lang]) || STRINGS[lang][key] || STRINGS.en[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
export const L = (en, bn) => (lang === 'bn' && bn ? bn : en || bn || '');
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeUrl = (u) => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
const locale = () => (lang === 'bn' ? 'bn-BD' : 'en-GB');
export const fmtNum = (n) => new Intl.NumberFormat(locale()).format(Number(n || 0));
export const fmtMoney = (n, cur) => {
  const v = new Intl.NumberFormat(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));
  return cur === 'USD' ? (lang === 'bn' ? `${v} মার্কিন ডলার` : `US$ ${v}`) : (lang === 'bn' ? `৳${v}` : `BDT ${v}`);
};
export const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  if (!d) return '';
  const x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  return isNaN(x) ? '' : new Intl.DateTimeFormat(locale(), opts).format(x);
};
export const fmtMonth = (ym) => fmtDate(ym + '-01', { month: 'long', year: 'numeric' });
export const href = (path) => (lang === 'bn' ? `${path}${path.includes('?') ? '&' : '?'}lang=bn` : path);

function setLang(next) {
  if (next === lang) return;
  safeSet(LANG_KEY, next);
  const u = new URL(location.href);
  if (next === 'bn') u.searchParams.set('lang', 'bn'); else u.searchParams.delete('lang');
  location.href = u.toString();
}

/* --------------------------------------------------------------- markdown */
// Minimal, safe renderer for admin-edited long text: "## heading" + paragraphs.
export function richText(text) {
  return String(text || '').split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (!b) return '';
    if (b.startsWith('## ')) {
      const [h, ...rest] = b.split('\n');
      return `<h2>${esc(h.slice(3))}</h2>${rest.length ? `<p>${esc(rest.join('\n'))}</p>` : ''}`;
    }
    return `<p>${esc(b)}</p>`;
  }).join('');
}

/* ------------------------------------------------------------------ data */
const cache = {};
async function cached(key, ttlMs, loader) {
  try {
    const raw = sessionStorage.getItem('humora_' + key);
    if (raw) { const { at, v } = JSON.parse(raw); if (Date.now() - at < ttlMs) return v; }
  } catch { /* ignore */ }
  const v = await loader();
  try { sessionStorage.setItem('humora_' + key, JSON.stringify({ at: Date.now(), v })); } catch { /* ignore */ }
  return v;
}
export async function getSettings() {
  if (!cache.settings) cache.settings = cached('settings', 5 * 60e3, async () => {
    const { data } = await db.from('humora_settings').select('*').eq('id', 1).maybeSingle();
    return data || {};
  }).catch(() => ({}));
  return cache.settings;
}
async function loadContent() {
  const rows = await cached('content', 5 * 60e3, async () => {
    const { data, error } = await db.from('humora_content').select('key,value_en,value_bn');
    if (error) throw error;
    return data || [];
  }).catch(() => []);
  for (const r of rows) overrides[r.key] = { en: r.value_en || '', bn: r.value_bn || '' };
}
export function friendlyError(error) {
  const msg = String(error?.message || error || '');
  const code = (msg.match(/HUMORA_[A-Z_]+/) || [])[0];
  if (code && STRINGS.en['err.' + code]) return t('err.' + code);
  if (/fetch|network|Failed to/i.test(msg)) return t('err.network');
  return t('err.generic');
}

/* ---------------------------------------------------------------- layout */
const NAV = [
  ['/', 'nav.home'], ['/about/', 'nav.about'], ['/activities/', 'nav.activities'], ['/impact/', 'nav.impact'],
  ['/transparency/', 'nav.transparency'], ['/contact/', 'nav.contact']
];
const current = () => {
  const p = location.pathname.replace(/index\.html$/, '');
  return NAV.find(([path]) => path !== '/' && p.startsWith(path))?.[0] || (p === '/' ? '/' : (p.startsWith('/donate') ? '/donate/' : ''));
};

function langSwitch() {
  return `<div class="lang-switch" role="group" aria-label="${esc(t('nav.language'))}">
    <button type="button" lang="en" data-lang="en" aria-pressed="${lang === 'en'}">English</button>
    <button type="button" lang="bn" data-lang="bn" aria-pressed="${lang === 'bn'}">বাংলা</button></div>`;
}

function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const cur = current();
  const links = NAV.map(([p, k]) => `<li><a href="${href(p)}"${cur === p ? ' aria-current="page"' : ''}>${esc(t(k))}</a></li>`).join('');
  el.className = 'site-header';
  el.innerHTML = `<div class="container nav">
      <a class="brand" href="${href('/')}" aria-label="HUMORA FOUNDATION – ${esc(t('nav.home'))}"><img src="/assets/img/logo.svg" alt="HUMORA FOUNDATION" width="210" height="44"></a>
      <ul class="nav-links">${links}</ul>
      ${langSwitch()}
      <a class="btn btn-gold btn-sm" href="${href('/donate/')}">${icon('heart')}${esc(t('nav.donate'))}</a>
      <button class="menu-btn" type="button" aria-label="${esc(t('nav.menu'))}" aria-expanded="false" aria-controls="mobile-panel">${icon('menu')}</button>
    </div>
    <div class="mobile-panel" id="mobile-panel" aria-hidden="true">
      <div class="mobile-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('nav.menu'))}">
        <div class="top"><img src="/assets/img/logo.svg" alt="HUMORA FOUNDATION" width="180" height="38">
          <button class="menu-btn close" type="button" aria-label="${esc(t('nav.close'))}">${icon('x')}</button></div>
        <nav>${NAV.map(([p, k]) => `<a href="${href(p)}"${cur === p ? ' aria-current="page"' : ''}>${esc(t(k))}${icon('right')}</a>`).join('')}</nav>
        ${langSwitch()}
        <a class="btn btn-gold" href="${href('/donate/')}">${icon('heart')}${esc(t('nav.donate'))}</a>
      </div>
    </div>`;
  const panel = el.querySelector('.mobile-panel');
  document.body.appendChild(panel); // a fixed overlay must not live inside the blurred (backdrop-filter) header
  const openBtn = el.querySelector('.nav .menu-btn');
  const toggle = (open) => {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) panel.querySelector('.close').focus(); else openBtn.focus();
  };
  openBtn.addEventListener('click', () => toggle(true));
  panel.querySelector('.close').addEventListener('click', () => toggle(false));
  panel.addEventListener('click', (e) => { if (e.target === panel) toggle(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false); });
  [el, panel].forEach((r) => r.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang))));
  const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

function socialLinks(s) {
  const list = [['facebook_url', 'facebook', 'Facebook'], ['instagram_url', 'instagram', 'Instagram'], ['youtube_url', 'youtube', 'YouTube'],
    ['x_url', 'xsocial', 'X'], ['linkedin_url', 'linkedin', 'LinkedIn']]
    .filter(([k]) => safeUrl(s[k]))
    .map(([k, ic, name]) => `<a href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener noreferrer" aria-label="${name}">${icon(ic)}</a>`);
  return list.join('');
}
export const waLink = (n) => (n ? `https://wa.me/${String(n).replace(/[^0-9]/g, '')}` : '');

async function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const s = await getSettings();
  const contact = [
    s.contact_email && `<li><a href="mailto:${esc(s.contact_email)}">${icon('mail')} ${esc(s.contact_email)}</a></li>`,
    s.phone && `<li><a href="tel:${esc(s.phone.replace(/[^+0-9]/g, ''))}">${icon('phone')} ${esc(s.phone)}</a></li>`,
    s.whatsapp && `<li><a href="${esc(waLink(s.whatsapp))}" target="_blank" rel="noopener noreferrer">${icon('chat')} ${esc(t('contact.whatsapp'))}</a></li>`,
    L(s.address_en, s.address_bn) && `<li>${icon('pin')} ${esc(L(s.address_en, s.address_bn))}</li>`
  ].filter(Boolean).join('') || `<li class="muted">${esc(t('contact.not_set'))}</li>`;
  const social = socialLinks(s);
  el.className = 'site-footer';
  el.innerHTML = `<div class="container">
    <div class="cols">
      <div><img class="flogo" src="/assets/img/logo-light.svg" alt="HUMORA FOUNDATION" width="220" height="46">
        <p>${esc(t('c.footer.about'))}</p><p class="tag">${esc(t('meta.tagline'))}</p></div>
      <div><h4>${esc(t('footer.links'))}</h4><ul>${NAV.map(([p, k]) => `<li><a href="${href(p)}">${esc(t(k))}</a></li>`).join('')}
        <li><a href="${href('/donate/')}">${esc(t('nav.donate'))}</a></li></ul></div>
      <div><h4>${esc(t('footer.contact'))}</h4><ul>${contact}</ul></div>
      <div><h4>${esc(t('footer.social'))}</h4>${social ? `<div class="socials">${social}</div>` : `<p class="muted">${esc(t('contact.not_set'))}</p>`}
        <h4 class="mt">${esc(t('footer.legal'))}</h4><ul><li><a href="${href('/privacy/')}">${esc(t('nav.privacy'))}</a></li><li><a href="${href('/terms/')}">${esc(t('nav.terms'))}</a></li></ul></div>
    </div>
    <div class="bottom"><span>© ${fmtNum(new Date().getFullYear()).replace(/[,٬]/g, '')} HUMORA FOUNDATION. ${esc(t('footer.rights'))}</span>
      <nav><a href="${href('/privacy/')}">${esc(t('nav.privacy'))}</a><a href="${href('/terms/')}">${esc(t('nav.terms'))}</a></nav></div>
  </div>`;
}

/* ------------------------------------------------------------ i18n apply */
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach((n) => {
    n.dataset.i18nAttr.split(';').forEach((pair) => { const [a, k] = pair.split(':'); if (a && k) n.setAttribute(a.trim(), t(k.trim())); });
  });
  root.querySelectorAll('[data-icon]').forEach((n) => { if (!n.querySelector('svg')) n.insertAdjacentHTML('afterbegin', icon(n.dataset.icon)); });
  root.querySelectorAll('a[data-href]').forEach((a) => { a.href = href(a.dataset.href); });
}

function applyMeta() {
  document.documentElement.lang = lang;
  const titleKey = document.body.dataset.title;
  const descKey = document.body.dataset.desc || 'c.mission.text';
  const site = 'HUMORA FOUNDATION';
  const title = titleKey ? `${t(titleKey)} | ${site}` : `${site} – ${t('meta.tagline')}`;
  document.title = title;
  const setMeta = (sel, attr, val) => { const m = document.querySelector(sel); if (m) m.setAttribute(attr, val); };
  setMeta('meta[name="description"]', 'content', t(descKey));
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', t(descKey));
  setMeta('meta[property="og:locale"]', 'content', lang === 'bn' ? 'bn_BD' : 'en_US');
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', t(descKey));
  const path = location.pathname.replace(/index\.html$/, '');
  const params = new URLSearchParams();
  const id = new URLSearchParams(location.search).get('id');
  if (document.body.dataset.keepQuery && id) params.set('id', id);
  if (lang === 'bn') params.set('lang', 'bn');
  const url = SITE_URL + path + (params.toString() ? '?' + params : '');
  const canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.href = url;
  setMeta('meta[property="og:url"]', 'content', url);
}

function reveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  els.forEach((e) => io.observe(e));
}
export const observeReveal = reveal;

/* --------------------------------------------------------- shared views */
const PLACEHOLDER = '/assets/img/placeholder.svg';
export function activityCard(a) {
  const img = safeUrl(a.image_url) || PLACEHOLDER;
  return `<article class="card act-card reveal">
    <a class="thumb" href="${href('/activities/view/?id=' + encodeURIComponent(a.id))}" tabindex="-1" aria-hidden="true">
      <img src="${esc(img)}" alt="" loading="lazy" width="640" height="400"><span class="tag">${esc(t('cat.' + a.category))}</span></a>
    <div class="body">
      <div class="meta"><span>${icon('calendar')}${esc(fmtDate(a.activity_date))}</span><span>${icon('pin')}${esc(L(a.location, a.location_bn))}</span></div>
      <h3><a href="${href('/activities/view/?id=' + encodeURIComponent(a.id))}">${esc(L(a.title_en, a.title_bn))}</a></h3>
      <p class="excerpt">${esc(L(a.description_en, a.description_bn))}</p>
      <a class="more" href="${href('/activities/view/?id=' + encodeURIComponent(a.id))}">${esc(t('act.view'))}${icon('right')}</a>
    </div></article>`;
}
export const emptyBox = (msg, ic = 'sparkles') => `<div class="empty">${icon(ic)}<p>${esc(msg)}</p></div>`;

export async function fetchActivities(limit) {
  let q = db.from('humora_activities').select('id,category,title_en,title_bn,description_en,description_bn,location,location_bn,activity_date,image_url')
    .eq('status', 'published').order('activity_date', { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
export async function fetchImpact() {
  const { data, error } = await db.rpc('humora_public_impact');
  if (error) throw error;
  return data || [];
}
const IMPACT_ICON = { people_helped: 'users', children_supported: 'smile', families_assisted: 'home', projects_completed: 'check' };
export function impactCards(rows, dark) {
  const order = ['people_helped', 'children_supported', 'families_assisted', 'projects_completed'];
  const by = Object.fromEntries((rows || []).map((r) => [r.metric_name, r]));
  return order.map((k) => {
    const r = by[k];
    const ok = r && r.is_verified && r.metric_value !== null;
    return `<div class="card stat reveal${dark ? '' : ''}"><div class="ic">${icon(IMPACT_ICON[k])}</div>
      ${ok ? `<div class="num" data-count="${Number(r.metric_value)}">${esc(fmtNum(r.metric_value))}</div>` : `<div class="num soon">${esc(t('impact.soon'))}</div>`}
      <div class="lbl">${esc(t('impact.' + k))}</div></div>`;
  }).join('');
}
export function countUp(root = document) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count); if (!target) return;
    const start = performance.now(); const dur = 1400;
    const step = (now) => { const p = Math.min(1, (now - start) / dur); el.textContent = fmtNum(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* --------------------------------------------------------------- forms */
export function validate(form, rules) {
  let ok = true;
  for (const [name, r] of Object.entries(rules)) {
    const input = form.elements[name]; if (!input) continue;
    const field = input.closest('.field');
    const v = String(input.value || '').trim();
    let msg = '';
    if (r.required && !v) msg = t('form.required');
    else if (v && r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = t('form.email');
    else if (v && r.min && v.length < r.min) msg = t('form.min', { n: fmtNum(r.min) });
    else if (v && r.max && v.length > r.max) msg = t('form.max', { n: fmtNum(r.max) });
    else if (r.amount && !(Number(v) > 0 && Number(v) <= 100000000)) msg = t('form.amount');
    if (field) {
      field.classList.toggle('invalid', !!msg);
      let err = field.querySelector('.err');
      if (!err) { err = document.createElement('div'); err.className = 'err'; err.id = `${name}-err`; field.appendChild(err); }
      err.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) input.setAttribute('aria-describedby', err.id);
    }
    if (msg && ok) { ok = false; input.focus(); }
  }
  return ok;
}

/* ---------------------------------------------------------------- boot */
export async function boot(pageInit) {
  applyMeta();
  await loadContent();
  applyMeta();
  applyI18n();
  renderHeader();
  renderFooter();
  try { if (pageInit) await pageInit(); } catch (e) { console.warn('[humora]', e?.message || e); }
  applyI18n();
  reveal();
}
