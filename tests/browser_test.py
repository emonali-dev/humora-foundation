#!/usr/bin/env python3
"""End-to-end UI test with Playwright + Chrome against a mocked Supabase.
Run from the repo root:  python3 tests/browser_test.py
Writes screenshots to tests/screenshots/ and prints a PASS/FAIL summary."""
import http.server, threading, functools, re, sys, os, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'tests' / 'screenshots'; SHOTS.mkdir(exist_ok=True)
MOCK = (ROOT / 'tests' / 'mock-supabase.js').read_text()
PIC = (ROOT / 'tests' / 'pic.png').read_bytes()
PHOTO = (ROOT / 'tests' / 'photo.jpg').read_bytes()
PORT = 8765
import json
CSP = next(h['value'] for h in json.loads((ROOT / 'vercel.json').read_text())['headers'][0]['headers'] if h['key'] == 'Content-Security-Policy').replace(' upgrade-insecure-requests', '')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)  # same policy as production (vercel.json)
        super().end_headers()
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            body = (ROOT / '404.html').read_bytes(); self.send_response(404); self.send_header('Content-Type', 'text/html'); self.end_headers(); self.wfile.write(body)
        else: super().send_error(code, message, explain)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(H, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{PORT}'

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail)); print(('PASS ' if cond else 'FAIL ') + name + (f' — {detail}' if detail and not cond else ''))

PAGES = ['/', '/about/', '/activities/', '/activities/view/?id=11111111-1111-4111-8111-111111111111', '/impact/', '/donate/', '/transparency/', '/contact/', '/privacy/', '/terms/']
RAW_KEY = re.compile(r'\b(?:c|nav|hero|act|cat|impact|donate|tr|contact|footer|form|err|about|mission|common)\.[a-z0-9_.]+\b')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def new_page(width, lang=None):
        ctx = browser.new_context(viewport={'width': width, 'height': 900}, device_scale_factor=1)
        ctx.route(re.compile(r'https://esm\.sh/.*'), lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
        ctx.route(re.compile(r'https://ketzuhfolwhofrnliirf\.supabase\.co/storage/.*'), lambda r: r.fulfill(status=200, content_type='image/png', body=PIC))
        ctx.route(re.compile(r'https://images\.pexels\.com/.*'), lambda r: r.fulfill(status=200, content_type='image/jpeg', body=PHOTO))
        ctx.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        page = ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        return page, errs

    for lang in ('en', 'bn'):
        for width, tag in ((1280, 'desktop'), (390, 'mobile')):
            page, errs = new_page(width)
            for path in PAGES:
                url = BASE + path + (('&' if '?' in path else '?') + 'lang=bn' if lang == 'bn' else '')
                page.goto(url); page.wait_for_load_state('networkidle'); page.wait_for_timeout(250)
                page.evaluate("document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))"); page.wait_for_timeout(900) if path == '/' else None
                name = f'{lang}/{tag} {path}'
                h1 = page.locator('h1').first.inner_text().strip()
                body = page.locator('body').inner_text()
                check(f'{name}: renders h1', len(h1) > 2, h1)
                check(f'{name}: html lang', page.evaluate('document.documentElement.lang') == lang)
                sw = page.evaluate('document.documentElement.scrollWidth'); check(f'{name}: no horizontal overflow', sw <= width + 1, str(sw))
                raw = RAW_KEY.findall(body)
                check(f'{name}: no raw i18n keys', not raw, ', '.join(raw[:5]))
                if lang == 'bn':
                    check(f'{name}: Bangla nav', 'হোম' in page.locator('#site-header').inner_text() or tag == 'mobile')
                    eng_btn = page.locator('main a.btn, main button.btn').all_inner_texts()
                    check(f'{name}: no English buttons', not any(re.search(r'\b(Donate|Submit|Send|View|Back|Learn)\b', t) for t in eng_btn), str(eng_btn))
                broken = page.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)")
                check(f'{name}: no broken images', not broken, str(broken))
                links = page.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h.startsWith('/'))")
                for l in set(links):
                    target = l.split('?')[0].split('#')[0]
                    f = ROOT / target.strip('/') / 'index.html' if not target.endswith('.html') else ROOT / target.strip('/')
                    if target == '/': f = ROOT / 'index.html'
                    check(f'{name}: link {l}', f.exists() or (ROOT / target.strip('/')).is_file())
                if path in ('/', '/about/'):
                    check(f'{name}: stock photos labelled', page.locator('.photo').count() > 0 and page.locator('.photo').count() == page.locator('.photo .photo-badge').count())
                if path == '/' and tag == 'desktop': page.screenshot(path=str(SHOTS / f'home-{lang}-desktop.png'), full_page=True)
                if path == '/' and tag == 'mobile': page.screenshot(path=str(SHOTS / f'home-{lang}-mobile.png'), full_page=True)
                if path in ('/donate/', '/transparency/', '/activities/') and tag == 'desktop' and lang == 'en': page.screenshot(path=str(SHOTS / f'{path.strip("/")}-en.png'), full_page=True)
            check(f'{lang}/{tag}: no console errors', not errs, ' | '.join(errs[:3]))

    # ---- resilience: primary CDN down -> fallback CDN; both down -> page still readable
    ctxf = browser.new_context(viewport={'width': 390, 'height': 800})
    ctxf.route(re.compile(r'https://esm\.sh/.*'), lambda r: r.abort())
    ctxf.route(re.compile(r'https://cdn\.jsdelivr\.net/.*'), lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
    ctxf.route(re.compile(r'https://(images\.pexels\.com|fonts\.).*'), lambda r: r.abort())
    pf = ctxf.new_page(); pf.goto(BASE + '/'); pf.wait_for_load_state('networkidle'); pf.wait_for_timeout(500)
    check('fallback CDN loads data', 'Winter blanket' in pf.locator('#latest').inner_text())
    ctxf.close()
    ctxo = browser.new_context(viewport={'width': 390, 'height': 800})
    ctxo.route(re.compile(r'https://(esm\.sh|cdn\.jsdelivr\.net|images\.pexels\.com|fonts\.).*'), lambda r: r.abort())
    po = ctxo.new_page(); po.goto(BASE + '/'); po.wait_for_timeout(1500)
    op = po.evaluate("getComputedStyle(document.querySelector('.hero .reveal')).opacity")
    check('offline: hero text visible', float(op) > 0.9, op)
    check('offline: header rendered', po.locator('#site-header .nav .menu-btn').count() == 1)
    ctxo.close()

    # ---- interactions (English, mobile)
    page, errs = new_page(390)
    page.goto(BASE + '/'); page.wait_for_load_state('networkidle')
    page.click('.nav .menu-btn'); page.wait_for_timeout(400)
    check('mobile menu opens', page.locator('.mobile-panel.open').count() == 1)
    page.screenshot(path=str(SHOTS / 'mobile-menu.png'))
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    check('mobile menu closes with Escape', page.locator('.mobile-panel.open').count() == 0)
    page.click('.nav .menu-btn'); page.wait_for_timeout(300)
    page.click('.mobile-sheet [data-lang="bn"]'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
    check('language switch to Bangla', page.evaluate('document.documentElement.lang') == 'bn' and 'lang=bn' in page.url)
    page.goto(BASE + '/about/'); page.wait_for_load_state('networkidle')
    check('language remembered across pages', page.evaluate('document.documentElement.lang') == 'bn')
    page.evaluate("localStorage.setItem('humora_lang','en')")

    page.goto(BASE + '/donate/'); page.wait_for_load_state('networkidle')
    page.fill('#amount', ''); page.click('#donateBtn'); page.wait_for_timeout(200)
    check('donate: validation blocks empty form', page.locator('.field.invalid').count() >= 1 and page.locator('#donateDone.hidden').count() == 1)
    page.click('#amounts button >> nth=2')
    page.fill('#dname', 'Test Person'); page.fill('#demail', 'not-an-email'); page.fill('#dcountry', 'Bangladesh'); page.click('#donateBtn'); page.wait_for_timeout(200)
    check('donate: email validation', 'valid email' in page.locator('#donateForm').inner_text())
    page.fill('#demail', 'test@example.com'); page.fill('#dref', 'TXN999'); page.click('#donateBtn'); page.wait_for_timeout(500)
    done = page.locator('#donateDone').inner_text()
    check('donate: success with reference', 'HF-ABCD1234' in done and 'Payment Submitted' in done, done[:120])
    page.screenshot(path=str(SHOTS / 'donate-success.png'), full_page=True)
    page.click('#curSeg button[data-cur="USD"]') if page.locator('#donateForm:not(.hidden)').count() else None
    page.fill('#rref', 'HF-WRONG'); page.fill('#remail', 'test@example.com'); page.fill('#rtxn', 'T1'); page.click('#refBtn'); page.wait_for_timeout(300)
    check('donate: reference not found message', 'No matching donation' in page.locator('#refMsg').inner_text())
    page.fill('#rref', 'HF-ABCD1234'); page.fill('#remail', 'test@example.com'); page.fill('#rtxn', 'T1'); page.click('#refBtn'); page.wait_for_timeout(300)
    check('donate: reference accepted', 'submitted for verification' in page.locator('#refMsg').inner_text())

    page.goto(BASE + '/contact/'); page.wait_for_load_state('networkidle')
    page.click('#contactBtn'); page.wait_for_timeout(200)
    check('contact: validation', page.locator('.field.invalid').count() >= 3)
    page.fill('#cname', 'Rahim'); page.fill('#cemail', 'rahim@example.com'); page.fill('#csubject', 'Volunteering'); page.fill('#cmsg', 'I would like to help.')
    page.click('#contactBtn'); page.wait_for_timeout(300)
    check('contact: sent', 'Thank you' in page.locator('#contactMsg').inner_text())
    check('contact: WhatsApp link from settings', page.locator('a[href^="https://wa.me/8801700000000"]').count() >= 1)

    page.goto(BASE + '/activities/view/?id=bad'); page.wait_for_load_state('networkidle')
    check('activity: invalid id handled', 'could not be found' in page.locator('main').inner_text())
    page.goto(BASE + '/impact/'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(1600)
    imp = page.locator('#impactGrid').inner_text()
    check('impact: verified number + Coming Soon', '250' in imp and 'Coming Soon' in imp, imp)
    page.goto(BASE + '/does-not-exist/'); check('404 page', 'not found' in page.locator('h1').inner_text().lower())
    check('interactions: no console errors', not [e for e in errs if '404' not in e], ' | '.join(errs[:3]))

    # ---- admin
    for lang in ('en', 'bn'):
        page, errs = new_page(1280)
        page.goto(BASE + '/admin/'); page.wait_for_load_state('networkidle')
        if lang == 'bn': page.click('.login-card [data-lang="bn"]')
        check(f'admin/{lang}: login screen shown', page.locator('#loginView:not(.hidden)').count() == 1)
        page.fill('#lemail', 'admin@example.org'); page.fill('#lpass', 'wrong'); page.click('#loginBtn'); page.wait_for_timeout(300)
        check(f'admin/{lang}: wrong password rejected', page.locator('#appView.hidden').count() == 1)
        page.fill('#lpass', 'correct-password'); page.click('#loginBtn'); page.wait_for_timeout(600)
        check(f'admin/{lang}: dashboard after login', page.locator('#appView:not(.hidden)').count() == 1)
        mods = page.evaluate("[...document.querySelectorAll('#sideNav a')].map(a => a.dataset.mod)")
        check(f'admin/{lang}: 14 modules', len(mods) == 14, str(mods))
        for m in mods:
            page.goto(BASE + '/admin/#' + m); page.wait_for_timeout(450)
            txt = page.locator('#view').inner_text()
            check(f'admin/{lang}: module {m} renders', len(txt) > 5 and 'error' not in page.locator('#view').inner_html()[:200], txt[:80])
            if lang == 'en' and m in ('overview', 'donations', 'lang', 'site'): page.screenshot(path=str(SHOTS / f'admin-{m}.png'), full_page=True)
        page.goto(BASE + '/admin/#donations'); page.wait_for_timeout(400)
        page.click('#list button[data-act="open"]'); page.wait_for_timeout(200)
        page.click('#modalBody [data-st="verified"]'); page.wait_for_timeout(300)
        status = page.evaluate("window.__MOCK_STORE__.humora_donations[0].status")
        check(f'admin/{lang}: donation verified', status == 'verified', status)
        page.goto(BASE + '/admin/#activities'); page.wait_for_timeout(400)
        page.click('#add'); page.wait_for_timeout(200)
        page.click('#mform button[type=submit]'); page.wait_for_timeout(200)
        check(f'admin/{lang}: required fields enforced', page.locator('#mform .field.invalid').count() >= 1)
        page.keyboard.press('Escape')
        page.click('#logoutBtn'); page.wait_for_timeout(300)
        check(f'admin/{lang}: sign out', page.locator('#loginView:not(.hidden)').count() == 1)
        check(f'admin/{lang}: no console errors', not errs, ' | '.join(errs[:3]))
    browser.close()

passed = sum(1 for r in results if r[1]); failed = [r for r in results if not r[1]]
print(f'\n{passed}/{len(results)} checks passed')
for f in failed: print('FAILED:', f[0], f[2])
(ROOT / 'tests' / 'last_run.txt').write_text(f'{passed}/{len(results)} checks passed\n' + '\n'.join(f'FAILED: {f[0]} {f[2]}' for f in failed))
srv.shutdown()
sys.exit(1 if failed else 0)
