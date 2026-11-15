// Entry point for every public page: picks the page handler from <body data-page>.
import {
  boot, db, t, L, lang, esc, safeUrl, fmtNum, fmtMoney, fmtDate, fmtMonth, href, richText, getSettings, friendlyError,
  activityCard, emptyBox, fetchActivities, fetchImpact, impactCards, countUp, validate, waLink, observeReveal
} from './app.js';
import { icon, CATEGORY_ICON } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const CATS = ['food', 'clothing', 'children', 'medical', 'winter', 'education'];

async function photoSettings() {
  const s = await getSettings();
  const hero = safeUrl(s.hero_image_url);
  if (hero && $('#heroPhoto')) {
    $('#heroPhoto').innerHTML = `<img src="${esc(hero)}" alt="" fetchpriority="high">`;
    $('#heroPhoto').classList.remove('hidden');
  }
  const about = safeUrl(s.about_image_url);
  document.querySelectorAll('#aboutVisual').forEach((v) => {
    if (about) v.insertAdjacentHTML('afterbegin', `<img class="photo" src="${esc(about)}" alt="" loading="lazy">`);
  });
}

/* ---------------------------------------------------------------- finance summary */
async function financeSummary(target, { full } = {}) {
  const el = $(target); if (!el) return null;
  const { data, error } = await db.rpc('humora_public_finance');
  if (error) { el.innerHTML = emptyBox(friendlyError(error), 'alert'); return null; }
  if (!data?.enabled) { el.innerHTML = emptyBox(t('tr.disabled'), 'shield'); return data; }
  const totals = (data.totals || []).filter((x) => Number(x.donations) || Number(x.other_income) || Number(x.expenses));
  if (!totals.length) { el.innerHTML = emptyBox(t('tr.empty'), 'shield'); return data; }
  el.innerHTML = totals.map((x) => {
    const income = Number(x.donations) + Number(x.other_income);
    const bal = income - Number(x.expenses);
    return `<div class="grid g3 ${full ? 'mt' : ''}">
      <div class="card reveal"><div class="ic" data-icon="heart"></div><div class="money-sub">${esc(t('tr.total_donations'))} · ${esc(x.currency)}</div>
        <div class="money">${esc(fmtMoney(x.donations, x.currency))}</div>
        <div class="money-sub">${esc(fmtNum(x.donation_count))} ${esc(t('tr.verified_donations'))}${Number(x.other_income) ? ` · ${esc(t('tr.other_income'))}: ${esc(fmtMoney(x.other_income, x.currency))}` : ''}</div></div>
      <div class="card gold reveal"><div class="ic" data-icon="receipt"></div><div class="money-sub">${esc(t('tr.total_expenses'))} · ${esc(x.currency)}</div>
        <div class="money">${esc(fmtMoney(x.expenses, x.currency))}</div></div>
      <div class="card navy reveal"><div class="ic" data-icon="wallet"></div><div class="money-sub">${esc(t('tr.balance'))} · ${esc(x.currency)}</div>
        <div class="money ${bal < 0 ? 'neg' : ''}">${esc(fmtMoney(bal, x.currency))}</div></div></div>`;
  }).join('');
  return data;
}

/* ---------------------------------------------------------------- pages */
const pages = {
  async home() {
    photoSettings();
    $('#catGrid').innerHTML = CATS.map((c) => `<article class="card cat-card reveal"><div class="ic">${icon(CATEGORY_ICON[c])}</div>
      <h3>${esc(t('cat.' + c))}</h3><p>${esc(t('cat.' + c + '.text'))}</p></article>`).join('');
    const jobs = [
      fetchActivities(3).then((rows) => {
        $('#latest').innerHTML = rows.length
          ? `<div class="grid g3">${rows.map(activityCard).join('')}</div><p class="center mt"><a class="btn btn-green" href="${href('/activities/')}">${esc(t('act.more'))}${icon('right')}</a></p>`
          : '';
      }).catch(() => { $('#latest').innerHTML = ''; }),
      fetchImpact().then((rows) => { $('#impactGrid').innerHTML = impactCards(rows); countUp($('#impactGrid')); })
        .catch(() => { $('#impactGrid').innerHTML = impactCards([]); }),
      financeSummary('#trSummary'),
      db.from('humora_testimonials').select('person_name,description,description_bn,location,image_url').eq('is_published', true)
        .order('created_at', { ascending: false }).limit(6).then(({ data }) => {
          if (!data?.length) return;
          $('#testimonials').classList.remove('hidden');
          $('#tmGrid').innerHTML = data.map((x) => {
            const img = safeUrl(x.image_url);
            return `<figure class="card quote reveal"><span class="mark" aria-hidden="true">“</span><blockquote>${esc(L(x.description, x.description_bn))}</blockquote>
            <figcaption class="who">${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="46" height="46">` : `<span class="av">${esc(x.person_name.slice(0, 1))}</span>`}
            <span><b>${esc(x.person_name)}</b>${x.location ? `<small>${esc(x.location)}</small>` : ''}</span></figcaption></figure>`;
          }).join('');
        })
    ];
    await Promise.allSettled(jobs);
  },

  async about() {
    photoSettings();
    const { data, error } = await db.from('humora_founders').select('*').eq('is_published', true).order('sort_order');
    const g = $('#founderGrid');
    if (error || !data?.length) { g.outerHTML = `<div id="founderGrid">${emptyBox(t('about.founders.empty'), 'users')}</div>`; return; }
    g.innerHTML = data.map((f) => {
      const img = safeUrl(f.photo_url);
      return `<article class="card founder reveal"><div class="ph">${img ? `<img src="${esc(img)}" alt="${esc(L(f.name_en, f.name_bn))}" loading="lazy" width="120" height="120">` : icon('user')}</div>
        <h3>${esc(L(f.name_en, f.name_bn))}</h3>${L(f.role_en, f.role_bn) ? `<div class="role">${esc(L(f.role_en, f.role_bn))}</div>` : ''}
        <p>${esc(L(f.bio_en, f.bio_bn))}</p></article>`;
    }).join('');
  },

  async activities() {
    const grid = $('#actGrid');
    let rows = [];
    try { rows = await fetchActivities(); } catch (e) { grid.outerHTML = `<div id="actGrid">${emptyBox(friendlyError(e), 'alert')}</div>`; return; }
    const present = ['all', ...new Set(rows.map((r) => r.category))];
    const params = new URLSearchParams(location.search);
    let active = present.includes(params.get('category')) ? params.get('category') : 'all';
    const draw = () => {
      const list = active === 'all' ? rows : rows.filter((r) => r.category === active);
      const g = $('#actGrid');
      if (!list.length) { g.className = ''; g.innerHTML = emptyBox(t('act.empty'), 'calendar'); }
      else { g.className = 'grid g3'; g.innerHTML = list.map(activityCard).join(''); }
      $('#filters').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === active)));
      observeReveal();
    };
    $('#filters').innerHTML = rows.length > 0
      ? present.map((c) => `<button type="button" data-cat="${c}">${esc(c === 'all' ? t('act.all') : t('cat.' + c))}</button>`).join('') : '';
    $('#filters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { active = b.dataset.cat; draw(); } });
    draw();
  },

  async activity() {
    const id = new URLSearchParams(location.search).get('id') || '';
    const body = $('#actBody');
    const fail = () => { $('#actTitle').textContent = t('nav.activities'); body.innerHTML = emptyBox(t('act.notfound'), 'alert') + `<p class="center mt"><a class="btn btn-green" href="${href('/activities/')}">${icon('left')}${esc(t('act.back'))}</a></p>`; };
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail();
    const { data: a } = await db.from('humora_activities').select('*').eq('id', id).eq('status', 'published').maybeSingle();
    if (!a) return fail();
    const title = L(a.title_en, a.title_bn);
    $('#actTitle').textContent = title;
    $('#actMeta').textContent = `${t('cat.' + a.category)} · ${fmtDate(a.activity_date)}`;
    document.title = `${title} | HUMORA FOUNDATION`;
    const desc = L(a.description_en, a.description_bn).slice(0, 160);
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    if (safeUrl(a.image_url)) document.querySelector('meta[property="og:image"]')?.setAttribute('content', safeUrl(a.image_url));
    const { data: photos } = await db.from('humora_gallery').select('title,title_bn,image_url').eq('activity_id', id).eq('is_published', true).order('created_at');
    body.innerHTML = `${safeUrl(a.image_url) ? `<div class="detail-hero-img"><img src="${esc(safeUrl(a.image_url))}" alt="${esc(title)}" width="1180" height="520"></div>` : ''}
      <div class="detail-grid"><div class="prose">${richText(L(a.description_en, a.description_bn))}
        ${photos?.length ? `<h2>${esc(t('act.gallery'))}</h2><div class="gallery">${photos.map((p) => `<figure><img src="${esc(safeUrl(p.image_url))}" alt="${esc(L(p.title, p.title_bn))}" loading="lazy"><figcaption>${esc(L(p.title, p.title_bn))}</figcaption></figure>`).join('')}</div>` : ''}</div>
        <aside><div class="card"><ul class="facts">
          <li>${icon(CATEGORY_ICON[a.category] || 'heart')}<span><small>${esc(t('act.category'))}</small>${esc(t('cat.' + a.category))}</span></li>
          <li>${icon('calendar')}<span><small>${esc(t('act.date'))}</small>${esc(fmtDate(a.activity_date))}</span></li>
          <li>${icon('pin')}<span><small>${esc(t('act.location'))}</small>${esc(L(a.location, a.location_bn))}</span></li></ul></div>
          <a class="btn btn-gold mt" href="${href('/donate/')}">${icon('heart')}${esc(t('donate.cta'))}</a>
          <p class="mt"><a href="${href('/activities/')}">${esc(t('act.back'))}</a></p></aside></div>`;
  },

  async impact() {
    try {
      const rows = await fetchImpact();
      $('#impactGrid').innerHTML = impactCards(rows); countUp($('#impactGrid'));
      const latest = rows.filter((r) => r.is_verified).map((r) => r.updated_at).sort().pop();
      if (latest) $('#impactUpdated').textContent = `${t('impact.updated')}: ${fmtDate(latest)}`;
    } catch { $('#impactGrid').innerHTML = impactCards([]); }
    const { data } = await db.from('humora_gallery').select('title,title_bn,image_url,activity_id').eq('is_published', true).order('created_at', { ascending: false }).limit(24);
    $('#galleryWrap').innerHTML = data?.length
      ? `<div class="gallery">${data.map((p) => `<figure class="reveal"><img src="${esc(safeUrl(p.image_url))}" alt="${esc(L(p.title, p.title_bn))}" loading="lazy"><figcaption>${p.activity_id ? `<a href="${href('/activities/view/?id=' + p.activity_id)}">${esc(L(p.title, p.title_bn))}</a>` : esc(L(p.title, p.title_bn))}</figcaption></figure>`).join('')}</div>`
      : emptyBox(t('impact.gallery.empty'), 'image');
  },

  async donate() {
    const SUGGEST = { BDT: [500, 1000, 2000, 5000, 10000, 25000], USD: [10, 25, 50, 100, 250, 500] };
    let cur = 'BDT', methods = [];
    const form = $('#donateForm');
    const amountInput = form.elements.amount;
    const drawAmounts = () => {
      $('#amounts').innerHTML = SUGGEST[cur].map((v) => `<button type="button" data-v="${v}" aria-pressed="${Number(amountInput.value) === v}">${esc(fmtMoney(v, cur))}</button>`).join('');
      $('#curSeg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cur === cur)));
    };
    const drawMethods = () => {
      const list = methods.filter((m) => m.currency === 'ANY' || m.currency === cur);
      $('#methods').innerHTML = list.length ? list.map((m, i) => `<label class="method"><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}>
        <span class="md"><b>${esc(L(m.name_en, m.name_bn))}</b>
          <dl>${m.account_name ? `<dt>${esc(t('donate.account_name'))}</dt><dd>${esc(m.account_name)}</dd>` : ''}${m.account_details ? `<dt>${esc(t('donate.details'))}</dt><dd>${esc(m.account_details)}</dd>` : ''}</dl>
          ${L(m.instructions_en, m.instructions_bn) ? `<div class="ins">${esc(L(m.instructions_en, m.instructions_bn))}</div>` : ''}</span></label>`).join('')
        : `<div class="alert info">${esc(t('donate.no_methods'))}</div>`;
    };
    amountInput.value = SUGGEST.BDT[1];
    drawAmounts();
    $('#amounts').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; amountInput.value = b.dataset.v; drawAmounts(); });
    amountInput.addEventListener('input', drawAmounts);
    $('#curSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.cur; amountInput.value = SUGGEST[cur][1]; drawAmounts(); drawMethods(); });
    const pre = new URLSearchParams(location.search);
    if (pre.get('currency') === 'USD') { cur = 'USD'; amountInput.value = SUGGEST.USD[1]; drawAmounts(); }
    const { data } = await db.from('humora_payment_methods').select('id,name_en,name_bn,method_type,currency,account_name,account_details,instructions_en,instructions_bn')
      .eq('is_active', true).eq('is_verified', true).order('sort_order');
    methods = data || [];
    drawMethods();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#donateMsg'); msg.innerHTML = '';
      if (!validate(form, { amount: { required: true, amount: true }, name: { required: true, min: 2, max: 100 }, email: { required: true, email: true }, country: { required: true, min: 2, max: 60 }, message: { max: 1000 }, reference: { max: 100 } })) {
        msg.innerHTML = `<div class="alert error">${esc(t('form.fix'))}</div>`; return;
      }
      const btn = $('#donateBtn'); btn.disabled = true; const old = btn.innerHTML; btn.textContent = t('donate.submitting');
      const { data: res, error } = await db.rpc('humora_submit_donation', {
        p_name: form.elements.name.value, p_email: form.elements.email.value, p_country: form.elements.country.value,
        p_currency: cur, p_amount: Number(amountInput.value), p_payment_method_id: form.elements.method?.value || null,
        p_transaction_reference: form.elements.reference.value || null, p_message: form.elements.message.value || null,
        p_language: lang, p_website: form.elements.website.value || null
      });
      btn.disabled = false; btn.innerHTML = old;
      if (error) { msg.innerHTML = `<div class="alert error">${esc(friendlyError(error))}</div>`; return; }
      form.classList.add('hidden');
      const done = $('#donateDone');
      done.innerHTML = `<div class="success-ic">${icon('check')}</div>
        <h2>${esc(t('donate.success.title'))}</h2><p>${esc(t('donate.success.text'))}</p>
        <div class="refbox">${esc(res.donation_ref)}</div>
        <p class="alert ${res.status === 'payment_submitted' ? 'ok' : 'info'}">${esc(t(res.status === 'payment_submitted' ? 'donate.success.submitted' : 'donate.success.pending'))}</p>
        <p class="mt"><button class="btn btn-outline" type="button" id="again">${esc(t('donate.another'))}</button></p>`;
      done.classList.remove('hidden'); done.focus();
      $('#rref').value = res.donation_ref; $('#remail').value = form.elements.email.value;
      $('#again').addEventListener('click', () => { form.reset(); amountInput.value = SUGGEST[cur][1]; drawAmounts(); drawMethods(); done.classList.add('hidden'); form.classList.remove('hidden'); });
    });

    const rf = $('#refForm');
    rf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#refMsg'); msg.innerHTML = '';
      if (!validate(rf, { ref: { required: true, min: 4, max: 20 }, email: { required: true, email: true }, txn: { required: true, max: 100 } })) return;
      const btn = $('#refBtn'); btn.disabled = true;
      const { error } = await db.rpc('humora_submit_payment_reference', { p_donation_ref: rf.elements.ref.value, p_email: rf.elements.email.value, p_transaction_reference: rf.elements.txn.value });
      btn.disabled = false;
      msg.innerHTML = error ? `<div class="alert error">${esc(friendlyError(error))}</div>` : `<div class="alert ok">${esc(t('donate.addref.ok'))}</div>`;
      if (!error) rf.reset();
    });
  },

  async transparency() {
    const data = await financeSummary('#trSummary', { full: true });
    const monthly = data?.monthly || [];
    $('#trMonthly').innerHTML = monthly.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${esc(t('tr.month'))}</th><th>${esc(t('donate.currency'))}</th>
      <th class="num">${esc(t('tr.income'))}</th><th class="num">${esc(t('tr.expenses'))}</th><th class="num">${esc(t('tr.net'))}</th></tr></thead><tbody>
      ${monthly.map((m) => { const net = Number(m.income) - Number(m.expenses); return `<tr><td>${esc(fmtMonth(m.month))}</td><td>${esc(m.currency)}</td><td class="num">${esc(fmtMoney(m.income, m.currency))}</td><td class="num">${esc(fmtMoney(m.expenses, m.currency))}</td><td class="num ${net < 0 ? 'neg' : 'pos'}">${esc(fmtMoney(net, m.currency))}</td></tr>`; }).join('')}
      </tbody></table></div>` : emptyBox(t('tr.empty'), 'chart');
    const cats = data?.by_category || [];
    $('#trCats').innerHTML = cats.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${esc(t('act.category'))}</th><th>${esc(t('donate.currency'))}</th><th class="num">${esc(t('tr.expenses'))}</th></tr></thead><tbody>
      ${cats.map((c) => `<tr><td>${esc(t('cat.' + c.category))}</td><td>${esc(c.currency)}</td><td class="num">${esc(fmtMoney(c.amount, c.currency))}</td></tr>`).join('')}</tbody></table></div>` : emptyBox(t('tr.empty'), 'receipt');
    const { data: docs } = await db.from('humora_financial_reports').select('*').eq('is_published', true).order('period_end', { ascending: false });
    $('#trDocs').innerHTML = docs?.length ? `<div class="grid g2">${docs.map((d) => `<article class="card doc reveal"><div class="ic">${icon('file')}</div><div>
      <h3>${esc(L(d.title_en, d.title_bn))}</h3><div class="money-sub">${esc(t('tr.period'))}: ${esc(fmtDate(d.period_start))} – ${esc(fmtDate(d.period_end))}</div>
      ${L(d.summary_en, d.summary_bn) ? `<p>${esc(L(d.summary_en, d.summary_bn))}</p>` : ''}
      ${safeUrl(d.file_url) ? `<a href="${esc(safeUrl(d.file_url))}" target="_blank" rel="noopener">${icon('external')} ${esc(t('tr.download'))}</a>` : ''}</div></article>`).join('')}</div>`
      : emptyBox(t('tr.statements.empty'), 'file');
  },

  async contact() {
    const s = await getSettings();
    const items = [
      s.contact_email && ['mail', t('contact.email_us'), `<a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a>`],
      s.whatsapp && ['chat', t('contact.whatsapp'), `<a href="${esc(waLink(s.whatsapp))}" target="_blank" rel="noopener noreferrer">${esc(t('contact.chat'))}</a>`],
      s.phone && ['phone', t('contact.phone'), `<a href="tel:${esc(s.phone.replace(/[^+0-9]/g, ''))}">${esc(s.phone)}</a>`],
      L(s.address_en, s.address_bn) && ['pin', t('contact.address'), esc(L(s.address_en, s.address_bn))]
    ].filter(Boolean);
    const socials = [['facebook_url', 'facebook', 'Facebook'], ['instagram_url', 'instagram', 'Instagram'], ['youtube_url', 'youtube', 'YouTube'], ['x_url', 'xsocial', 'X'], ['linkedin_url', 'linkedin', 'LinkedIn']]
      .filter(([k]) => safeUrl(s[k])).map(([k, ic, n]) => `<a href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener noreferrer" aria-label="${n}">${icon(ic)}</a>`).join('');
    $('#contactInfo').innerHTML = `<span class="eyebrow">${esc(t('contact.eyebrow'))}</span><h2>${esc(t('contact.heading'))}</h2>
      ${items.length ? `<ul class="contact-list">${items.map(([ic, lb, v]) => `<li><span class="ic">${icon(ic)}</span><span><small>${esc(lb)}</small>${v}</span></li>`).join('')}</ul>` : `<p class="muted">${esc(t('contact.not_set'))}</p>`}
      ${socials ? `<h3 class="mt">${esc(t('contact.follow'))}</h3><div class="socials">${socials}</div>` : ''}`;
    const form = $('#contactForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#contactMsg'); msg.innerHTML = '';
      if (!validate(form, { name: { required: true, min: 2, max: 100 }, email: { required: true, email: true }, subject: { required: true, min: 2, max: 160 }, message: { required: true, min: 10, max: 4000 } })) return;
      const btn = $('#contactBtn'); btn.disabled = true; const old = btn.innerHTML; btn.textContent = t('contact.sending');
      const { error } = await db.rpc('humora_submit_contact', { p_name: form.elements.name.value, p_email: form.elements.email.value,
        p_subject: form.elements.subject.value, p_message: form.elements.message.value, p_language: lang, p_website: form.elements.website.value || null });
      btn.disabled = false; btn.innerHTML = old;
      if (error) { msg.innerHTML = `<div class="alert error">${esc(friendlyError(error))}</div>`; return; }
      form.reset(); msg.innerHTML = `<div class="alert ok">${esc(t('contact.ok'))}</div>`;
    });
  },

  async legal() {
    const el = $('#legalBody');
    el.innerHTML = richText(t(el.dataset.key));
  },
  async notfound() {}
};

boot(pages[document.body.dataset.page]);
