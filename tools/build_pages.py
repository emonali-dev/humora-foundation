#!/usr/bin/env python3
"""Generates the static HTML pages from one shared template.
Run:  python3 tools/build_pages.py   (no dependencies)
Text inside data-i18n elements is the English default; the browser swaps it for
Bangla (or for admin-edited content) at runtime."""
import pathlib, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://humora-foundation.vercel.app'
V = '20261115c'
import re, json
strings_js = (ROOT / 'assets/js/strings.js').read_text(encoding='utf-8')
# crude parser for the en block, enough to pre-render English text for SEO/no-JS
en_block = strings_js.split('en: {', 1)[1].split('\n  bn: {', 1)[0]
EN = {}
for m in re.finditer(r"'([a-z0-9_.]+)':\s*('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")", en_block):
    EN[m.group(1)] = json.loads('"' + m.group(2)[1:-1].replace('"', '\\"').replace("\\'", "'") + '"') if m.group(2)[0] == "'" else json.loads(m.group(2))

photos_js = (ROOT / 'assets/js/photos.js').read_text(encoding='utf-8')
PHOTOS = {m.group(1): {'id': int(m.group(2)), 'credit': m.group(3), 'en': m.group(4)}
          for m in re.finditer(r"(\w+):\s*\{ id: (\d+),\s*credit: '([^']*)', en: '([^']*)'", photos_js)}
def photo_url(pid, w, h=0):
    return f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&amp;cs=tinysrgb&amp;fit=crop&amp;w={w}' + (f'&amp;h={h}' if h else '')
def photo_html(key, ratio=1.5, sizes='100vw', eager=False, cls=''):
    p = PHOTOS[key]; w = 1080; h = round(w / ratio)
    srcset = ', '.join(f'{photo_url(p["id"], x, round(x / ratio))} {x}w' for x in (480, 768, 1080, 1600, 2000))
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<figure class="photo {cls}"><img src="{photo_url(p["id"], w, h)}" srcset="{srcset}" sizes="{sizes}" alt="{html.escape(p["en"])}" '
            f'width="{w}" height="{h}" {load} decoding="async"><figcaption class="photo-badge">'
            f'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>'
            f'<span data-i18n="photo.illustrative">{html.escape(EN["photo.illustrative"])}</span><small>· {html.escape(p["credit"])} / Pexels</small></figcaption></figure>')
def P(key, ratio=1.5, sizes='100vw', cls='', eager=False, tag_cls=''):
    return f'<div class="{tag_cls}" data-photo="{key}">{photo_html(key, ratio, sizes, eager)}</div>'
SKEL_CARDS = lambda n, cls='': ''.join(f'<div class="card skeleton-card {cls}" aria-hidden="true"><div class="sk sk-media"></div><div class="sk sk-line w60"></div><div class="sk sk-line"></div><div class="sk sk-line w80"></div></div>' for _ in range(n))
SKEL_STATS = ''.join('<div class="card stat skeleton-card" aria-hidden="true"><div class="sk sk-circle"></div><div class="sk sk-line w40 c"></div><div class="sk sk-line w60 c"></div></div>' for _ in range(4))
SKEL_LINES = '<div class="card skeleton-card" aria-hidden="true"><div class="sk sk-line w40"></div><div class="sk sk-line"></div><div class="sk sk-line w80"></div></div>'

def T(key, tag='span', cls='', attrs=''):
    c = f' class="{cls}"' if cls else ''
    return f'<{tag}{c} data-i18n="{key}"{attrs}>{html.escape(EN.get(key, key))}</{tag}>'

def page(path, title_key, body, desc_key='c.mission.text', page_id='', keep_query=False, noindex=False):
    title = (html.escape(EN[title_key]) + ' | HUMORA FOUNDATION') if title_key else 'HUMORA FOUNDATION – ' + html.escape(EN['meta.tagline'])
    desc = html.escape(EN[desc_key])
    url = SITE + path
    robots = '<meta name="robots" content="noindex">' if noindex else ''
    alt = '' if noindex else f'''<link rel="alternate" hreflang="en" href="{url}">
<link rel="alternate" hreflang="bn" href="{url}?lang=bn">
<link rel="alternate" hreflang="x-default" href="{url}">'''
    jsonld = ''
    if path == '/':
        hid = 9823013
        ss = ', '.join(f'https://images.pexels.com/photos/{hid}/pexels-photo-{hid}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w={w}&h={round(w/1.6)} {w}w' for w in (480, 768, 1080, 1600, 2000))
        jsonld_pre = f'<link rel="preconnect" href="https://images.pexels.com">\n<link rel="preload" as="image" imagesrcset="{ss}" imagesizes="100vw" fetchpriority="high">\n'
        ld = {'@context': 'https://schema.org', '@type': 'NGO', 'name': 'HUMORA FOUNDATION', 'alternateName': 'হিউমোরা ফাউন্ডেশন',
              'url': SITE + '/', 'logo': SITE + '/assets/img/icon-512.png', 'slogan': EN['meta.tagline'],
              'description': EN['c.mission.text'], 'areaServed': ['Bangladesh', 'International']}
        jsonld = jsonld_pre + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>'
    out = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}
<link rel="canonical" href="{url}">
{alt}
<meta name="theme-color" content="#102B46">
<meta property="og:type" content="website">
<meta property="og:site_name" content="HUMORA FOUNDATION">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/img/og-image.png">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="bn_BD">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{SITE}/assets/img/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/css/site.css?v={V}">
{jsonld}
</head>
<body data-page="{page_id}"{f' data-title="{title_key}"' if title_key else ''} data-desc="{desc_key}"{' data-keep-query="1"' if keep_query else ''}>
<a class="skip" href="#main" data-i18n="skip">{html.escape(EN["skip"])}</a>
<header id="site-header" class="site-header"><div class="container nav"><a class="brand" href="/"><img src="/assets/img/logo.svg" alt="HUMORA FOUNDATION" width="210" height="44"></a></div></header>
<main id="main">
{body}
</main>
<footer id="site-footer" class="site-footer"></footer>
<noscript><p class="container">HUMORA FOUNDATION – {html.escape(EN["meta.tagline"])}</p></noscript>
<script type="module" src="/assets/js/main.js?v={V}"></script>
</body>
</html>
'''
    target = ROOT / (path.strip('/') + '/index.html' if path.strip('/') else 'index.html')
    if path.endswith('.html'): target = ROOT / path.strip('/')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding='utf-8')
    return target

def hero(eyebrow, title, intro, crumb=True, photo=None):
    c = f'<div class="crumbs"><a href="/" data-href="/" data-i18n="nav.home">Home</a> / {T(eyebrow)}</div>' if crumb else ''
    bg = P(photo, 2.4, '100vw', eager=True, tag_cls='page-hero-photo') if photo else ''
    return f'''<section class="page-hero{' with-photo' if photo else ''}">{bg}<div class="container">{c}{T(title,'h1')}{T(intro,'p')}</div></section>'''

# ---------------------------------------------------------------- home
CAT_ICON = {'food': 'utensils', 'clothing': 'shirt', 'children': 'smile', 'medical': 'medical', 'winter': 'snow', 'education': 'book'}
CAT_CARDS = ''.join(f'''<article class="card media-card cat-card reveal"><div class="card-media">{photo_html(c, 1.6, '(max-width:640px) 100vw, (max-width:980px) 50vw, 380px')}</div>
      <div class="body"><div class="ic" data-icon="{CAT_ICON[c]}"></div>{T('cat.' + c, 'h3')}{T('cat.' + c + '.text', 'p')}</div></article>''' for c in CAT_ICON)
home = f'''
<section class="hero has-photo" id="hero"><div class="hero-photo" id="heroPhoto">{photo_html('hero', 1.6, '100vw', eager=True)}</div>
  <div class="container">
    <div class="hero-copy">
      <span class="badge" data-icon="globe">{T('hero.badge')}</span>
      {T('c.hero.title','h1')}
      {T('c.hero.text','p','lead')}
      <div class="actions">
        <a class="btn btn-gold" data-href="/donate/" href="/donate/" data-icon="heart">{T('hero.support')}</a>
        <a class="btn btn-ghost-light" data-href="/activities/" href="/activities/">{T('hero.explore')}</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="ring"></div><div class="ring r2"></div>
      <div class="core"><img src="/assets/img/logo-mark.svg" alt="" width="200" height="200"></div>
      <div class="chip c1" data-icon="utensils">{T('cat.food')}</div>
      <div class="chip c2" data-icon="smile">{T('cat.children')}</div>
      <div class="chip c3" data-icon="snow">{T('cat.winter')}</div>
    </div>
  </div>
</section>

<section class="block" id="mission"><div class="container">
  <div class="section-head center reveal">{T('mission.eyebrow','span','eyebrow')}{T('mission.heading','h2')}{T('c.mission.text','p')}</div>
  <div class="grid g3">
    <article class="card media-card reveal">{P('families', 1.5, '(max-width:640px) 100vw, (max-width:980px) 50vw, 380px', eager=False, tag_cls='card-media')}<div class="body"><div class="ic" data-icon="home"></div>{T('c.mission.c1.title','h3')}{T('c.mission.c1.text','p')}</div></article>
    <article class="card media-card gold reveal">{P('street', 1.5, '(max-width:640px) 100vw, (max-width:980px) 50vw, 380px', eager=False, tag_cls='card-media')}<div class="body"><div class="ic" data-icon="smile"></div>{T('c.mission.c2.title','h3')}{T('c.mission.c2.text','p')}</div></article>
    <article class="card media-card navy reveal">{P('emergency', 1.5, '(max-width:640px) 100vw, (max-width:980px) 50vw, 380px', eager=False, tag_cls='card-media')}<div class="body"><div class="ic" data-icon="buoy"></div>{T('c.mission.c3.title','h3')}{T('c.mission.c3.text','p')}</div></article>
  </div>
</div></section>

<section class="block alt" id="about"><div class="container split">
  <div class="visual has-photo reveal" id="aboutVisual">{photo_html('about', 1.25, '(max-width:860px) 100vw, 560px', cls='fill')}<div class="trio"><span data-icon="heart"></span><span data-icon="users"></span><span data-icon="sparkles"></span></div>
    <div class="caption" data-icon="users">{T('meta.tagline')}</div></div>
  <div class="reveal">{T('about.eyebrow','span','eyebrow')}{T('c.about.title','h2')}{T('c.about.text','p','muted')}
    <ul class="checklist"><li data-icon="check">{T('about.how.1')}</li><li data-icon="check">{T('about.how.2')}</li><li data-icon="check">{T('about.how.3')}</li></ul>
    <p class="mt"><a class="btn btn-outline" data-href="/about/" href="/about/" data-icon="right">{T('about.more')}</a></p></div>
</div></section>

<section class="block" id="activities"><div class="container">
  <div class="section-head center reveal">{T('act.eyebrow','span','eyebrow')}{T('act.heading','h2')}{T('c.activities.intro','p')}</div>
  <div class="grid g3" id="catGrid">{CAT_CARDS}</div>
  <div id="latest" class="mt" aria-busy="true"><div class="grid g3">{SKEL_CARDS(3)}</div></div>
</div></section>

<section class="block impact-band" id="impact"><div class="container">
  <div class="section-head center reveal">{T('impact.eyebrow','span','eyebrow')}{T('impact.heading','h2')}{T('c.impact.intro','p')}</div>
  <div class="grid g4" id="impactGrid" aria-busy="true">{SKEL_STATS}</div>
</div></section>

<section class="block" id="donate"><div class="container">
  <div class="donate-band with-photo reveal"><div class="donate-copy">{T('donate.eyebrow','span','eyebrow')}{T('c.donate.headline','h2')}{T('c.donate.text','p')}
    <a class="btn btn-gold" data-href="/donate/" href="/donate/" data-icon="heart">{T('donate.cta')}</a></div>
    {P('donate', 1.25, '(max-width:760px) 100vw, 480px', eager=False, tag_cls='donate-photo')}</div>
</div></section>

<section class="block alt tight" id="transparency"><div class="container">
  <div class="section-head center reveal">{T('tr.eyebrow','span','eyebrow')}{T('tr.heading','h2')}{T('c.transparency.intro','p')}</div>
  <div id="trSummary" aria-busy="true"><div class="grid g3">{SKEL_CARDS(3)}</div></div>
  <p class="center mt"><a class="btn btn-outline" data-href="/transparency/" href="/transparency/" data-icon="shield">{T('tr.teaser')}</a></p>
</div></section>

<section class="block hidden" id="testimonials"><div class="container">
  <div class="section-head center reveal">{T('tm.eyebrow','span','eyebrow')}{T('tm.heading','h2')}</div>
  <div class="grid g3" id="tmGrid"></div>
</div></section>
'''
page('/', None, home, page_id='home')

# ---------------------------------------------------------------- about
about = hero('nav.about', 'c.about.title', 'c.mission.text', photo='about') + f'''
<section class="block alt"><div class="container split">
  <div class="reveal">{T('about.eyebrow','span','eyebrow')}{T('c.about.title','h2')}{T('c.about.text','p','muted')}</div>
  <div class="visual has-photo reveal" id="aboutVisual">{photo_html('about', 1.25, '(max-width:860px) 100vw, 560px', cls='fill')}<div class="trio"><span data-icon="heart"></span><span data-icon="users"></span><span data-icon="sparkles"></span></div>
    <div class="caption" data-icon="users">{T('meta.tagline')}</div></div>
</div></section>
<section class="block"><div class="container">
  <div class="grid g3">
    <article class="card reveal"><div class="ic" data-icon="sparkles"></div>{T('c.about.vision.title','h3')}{T('c.about.vision.text','p')}</article>
    <article class="card gold reveal"><div class="ic" data-icon="heart"></div>{T('mission.eyebrow','h3')}{T('c.mission.text','p')}</article>
    <article class="card navy reveal"><div class="ic" data-icon="shield"></div>{T('c.about.values.title','h3')}{T('c.about.values.text','p')}</article>
  </div>
</div></section>
<section class="block alt"><div class="container">
  <div class="section-head center reveal">{T('about.how.title','h2')}</div>
  <div class="grid g3">
    <article class="card reveal"><div class="ic" data-icon="users"></div>{T('about.how.1','p')}</article>
    <article class="card reveal"><div class="ic" data-icon="heart"></div>{T('about.how.2','p')}</article>
    <article class="card reveal"><div class="ic" data-icon="file"></div>{T('about.how.3','p')}</article>
  </div>
</div></section>
<section class="block" id="moments"><div class="container">
  <div class="section-head center reveal">{T('about.gallery.eyebrow','span','eyebrow')}{T('about.gallery.title','h2')}{T('about.gallery.text','p')}</div>
  <div class="mosaic">
    {P('children', 1.0, '(max-width:760px) 100vw, 50vw', eager=False, tag_cls='m1 reveal')}
    {P('elderly', 1.5, '(max-width:760px) 100vw, 25vw', eager=False, tag_cls='m2 reveal')}
    {P('education', 1.5, '(max-width:760px) 100vw, 25vw', eager=False, tag_cls='m3 reveal')}
    {P('medical', 1.5, '(max-width:760px) 100vw, 25vw', eager=False, tag_cls='m4 reveal')}
    {P('clothing', 1.5, '(max-width:760px) 100vw, 25vw', eager=False, tag_cls='m5 reveal')}
  </div>
</div></section>
<section class="block alt" id="founders"><div class="container">
  <div class="section-head center reveal">{T('about.founders','h2')}</div>
  <div class="grid g3" id="founderGrid" aria-busy="true">{SKEL_CARDS(3)}</div>
</div></section>
'''
page('/about/', 'nav.about', about, desc_key='c.about.text', page_id='about')

# ---------------------------------------------------------------- activities
acts = hero('nav.activities', 'act.heading', 'c.activities.intro', photo='food') + '''
<section class="block"><div class="container">
  <div class="filters" id="filters" role="group"></div>
  <div class="grid g3" id="actGrid" aria-busy="true">{SKEL_CARDS(3)}</div>
</div></section>'''
page('/activities/', 'nav.activities', acts, desc_key='c.activities.intro', page_id='activities')

view = f'''<section class="page-hero"><div class="container"><div class="crumbs"><a href="/activities/" data-href="/activities/" data-i18n="nav.activities">Activities</a></div>
<h1 id="actTitle">{html.escape(EN['nav.activities'])}</h1><p id="actMeta"></p></div></section>
<section class="block tight"><div class="container" id="actBody" aria-busy="true">{SKEL_LINES}</div></section>'''
page('/activities/view/', 'nav.activities', view, desc_key='c.activities.intro', page_id='activity', keep_query=True)

# ---------------------------------------------------------------- impact
impact = hero('nav.impact', 'impact.heading', 'c.impact.intro', photo='children') + f'''
<section class="block"><div class="container">
  <div class="grid g4" id="impactGrid" aria-busy="true">{SKEL_STATS}</div>
  <p class="center muted mt" id="impactUpdated"></p>
  {T('impact.note','p','center muted')}
</div></section>
<section class="block alt"><div class="container">
  <div class="section-head center reveal">{T('impact.gallery','h2')}</div>
  <div id="galleryWrap" aria-busy="true"><div class="grid g4">{SKEL_CARDS(4)}</div></div>
</div></section>'''
page('/impact/', 'nav.impact', impact, desc_key='c.impact.intro', page_id='impact')

# ---------------------------------------------------------------- donate
donate = hero('donate.eyebrow', 'c.donate.headline', 'c.donate.text', photo='donate') + f'''
<section class="block"><div class="container donate-layout">
  <div class="card" id="donateCard">
    <form id="donateForm" class="form" novalidate>
      <div class="alert info" data-i18n="donate.manual_note">{html.escape(EN['donate.manual_note'])}</div>
      <div class="step-title"><b>1</b>{T('donate.step1')}</div>
      <div class="seg" role="group" id="curSeg" aria-label="Currency">
        <button type="button" data-cur="BDT" aria-pressed="true">BDT ৳</button><button type="button" data-cur="USD" aria-pressed="false">USD $</button></div>
      <div class="amounts" id="amounts"></div>
      <div class="field"><label for="amount">{T('donate.custom')}</label><input id="amount" name="amount" type="number" inputmode="decimal" min="1" step="any" required></div>
      <div class="step-title"><b>2</b>{T('donate.step2')}</div>
      <div class="row">
        <div class="field"><label for="dname">{T('donate.name')}</label><input id="dname" name="name" autocomplete="name" maxlength="100" required></div>
        <div class="field"><label for="demail">{T('donate.email')}</label><input id="demail" name="email" type="email" autocomplete="email" maxlength="160" required></div>
      </div>
      <div class="field"><label for="dcountry">{T('donate.country')}</label><input id="dcountry" name="country" autocomplete="country-name" maxlength="60" list="countries" required>
        <datalist id="countries"><option value="Bangladesh"><option value="India"><option value="Saudi Arabia"><option value="United Arab Emirates"><option value="Qatar"><option value="Kuwait"><option value="Oman"><option value="Malaysia"><option value="Singapore"><option value="Cambodia"><option value="United Kingdom"><option value="United States"><option value="Canada"><option value="Australia"><option value="Italy"><option value="Germany"><option value="Japan"></datalist></div>
      <div class="field"><label for="dmsg">{T('donate.message')}</label><textarea id="dmsg" name="message" maxlength="1000"></textarea></div>
      <div class="step-title"><b>3</b>{T('donate.step3')}</div>
      <div id="methods" class="form" aria-busy="true">{SKEL_LINES}</div>
      <div class="field"><label for="dref">{T('donate.reference')}</label><input id="dref" name="reference" maxlength="100" autocomplete="off"><div class="help" data-i18n="donate.reference.help">{html.escape(EN['donate.reference.help'])}</div></div>
      <div class="hp" aria-hidden="true"><label for="dweb">Website</label><input id="dweb" name="website" tabindex="-1" autocomplete="off"></div>
      <div id="donateMsg" role="alert" aria-live="assertive"></div>
      <button class="btn btn-green" type="submit" id="donateBtn" data-icon="heart">{T('donate.submit')}</button>
    </form>
    <div id="donateDone" class="hidden" tabindex="-1"></div>
  </div>
  <aside class="side-card">
    <div class="card"><h3 data-i18n="donate.secure">{html.escape(EN['donate.secure'])}</h3>
      <ul class="trust"><li data-icon="shield">{T('donate.manual_note')}</li><li data-icon="lock">{T('tr.note')}</li></ul></div>
    <div class="card mt"><h3 data-i18n="donate.addref.title">{html.escape(EN['donate.addref.title'])}</h3>
      <form id="refForm" class="form" novalidate>
        <div class="field"><label for="rref">{T('donate.addref.ref')}</label><input id="rref" name="ref" maxlength="20" required autocomplete="off"></div>
        <div class="field"><label for="remail">{T('donate.email')}</label><input id="remail" name="email" type="email" maxlength="160" required></div>
        <div class="field"><label for="rtxn">{T('donate.reference')}</label><input id="rtxn" name="txn" maxlength="100" required autocomplete="off"></div>
        <div id="refMsg" role="alert" aria-live="assertive"></div>
        <button class="btn btn-navy" type="submit" id="refBtn">{T('donate.addref.btn')}</button>
      </form></div>
  </aside>
</div></section>'''
page('/donate/', 'donate.title', donate, desc_key='c.donate.text', page_id='donate')

# ---------------------------------------------------------------- transparency
tr = hero('nav.transparency', 'tr.heading', 'c.transparency.intro') + f'''
<section class="block"><div class="container">
  <div id="trSummary" aria-busy="true"><div class="grid g3">{SKEL_CARDS(3)}</div></div>
  {T('tr.note','p','center muted mt')}
</div></section>
<section class="block alt"><div class="container">
  <div class="section-head reveal">{T('tr.monthly','h2')}</div>
  <div id="trMonthly"></div>
  <div class="section-head reveal mt">{T('tr.by_category','h2')}</div>
  <div id="trCats"></div>
</div></section>
<section class="block"><div class="container">
  <div class="section-head reveal">{T('tr.statements','h2')}</div>
  <div id="trDocs" aria-busy="true">{SKEL_LINES}</div>
</div></section>'''
page('/transparency/', 'nav.transparency', tr, desc_key='c.transparency.intro', page_id='transparency')

# ---------------------------------------------------------------- contact
contact = hero('nav.contact', 'contact.heading', 'c.contact.intro', photo='about') + f'''
<section class="block"><div class="container split">
  <div class="card reveal">
    <form id="contactForm" class="form" novalidate>
      <div class="row">
        <div class="field"><label for="cname">{T('contact.name')}</label><input id="cname" name="name" autocomplete="name" maxlength="100" required></div>
        <div class="field"><label for="cemail">{T('contact.email')}</label><input id="cemail" name="email" type="email" autocomplete="email" maxlength="160" required></div>
      </div>
      <div class="field"><label for="csubject">{T('contact.subject')}</label><input id="csubject" name="subject" maxlength="160" required></div>
      <div class="field"><label for="cmsg">{T('contact.message')}</label><textarea id="cmsg" name="message" maxlength="4000" required></textarea></div>
      <div class="hp" aria-hidden="true"><label for="cweb">Website</label><input id="cweb" name="website" tabindex="-1" autocomplete="off"></div>
      <div id="contactMsg" role="alert" aria-live="assertive"></div>
      <button class="btn btn-green" type="submit" id="contactBtn" data-icon="mail">{T('contact.send')}</button>
    </form>
  </div>
  <div id="contactInfo" aria-busy="true">{SKEL_LINES}</div>
</div></section>'''
page('/contact/', 'nav.contact', contact, desc_key='c.contact.intro', page_id='contact')

# ---------------------------------------------------------------- legal
for slug, tk, bk in (('privacy', 'privacy.title', 'c.privacy.body'), ('terms', 'terms.title', 'c.terms.body')):
    body = f'''<section class="page-hero"><div class="container"><div class="crumbs"><a href="/" data-href="/" data-i18n="nav.home">Home</a></div>{T(tk,'h1')}</div></section>
<section class="block tight"><div class="container"><article class="legal prose" id="legalBody" data-key="{bk}"></article></div></section>'''
    page(f'/{slug}/', tk, body, desc_key=bk if False else 'c.mission.text', page_id='legal')

nf = f'''<section class="page-hero"><div class="container">{T('notfound.title','h1')}{T('notfound.text','p')}</div></section>
<section class="block tight"><div class="container center"><a class="btn btn-green" href="/" data-href="/" data-icon="home">{T('common.back_home')}</a></div></section>'''
page('/404.html', 'notfound.title', nf, page_id='notfound', noindex=True)
print('pages built')
