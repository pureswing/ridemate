// Builds the public website into docs/ (GitHub Pages, custom domain
// botego.app): landing page, smart download page, support, privacy and
// terms (en + es), plus the download QR code. Legal text comes from the
// SAME `legal` block the app shows (constants/i18n.ts), so the store
// privacy URL never drifts from the in-app policy. Re-run after editing
// that text or the download links below:
//   npx -y deno@2.1.4 run -A --node-modules-dir=none --no-lock scripts/build-site.ts
import QRCode from 'npm:qrcode@1.5.4';
import translations from '../constants/i18n.ts';

// ── Download destinations ─────────────────────────────────────────────────
// The QR code always encodes DOWNLOAD_PAGE, never a store link, so printed
// codes keep working when these change. When the app reaches a store, set
// its URL here and re-run: that platform then redirects straight there.
const SITE = 'https://botego.app';
const DOWNLOAD_PAGE = `${SITE}/download/`;
const ANDROID_APK_URL = 'https://github.com/pureswing/ridemate/releases/download/apk-latest/botego.apk';
const PLAY_STORE_URL: string | null = null;
const APP_STORE_URL: string | null = null;

type Lang = 'en' | 'es';
type Section = { heading: string; body: string };
type Doc = { title: string; intro: string; sections: Section[] };

const OUT = new URL('../docs/', import.meta.url);

const UI = {
  en: {
    tagline: "Florida's community ride board",
    home: 'Home', download: 'Download', support: 'Support', privacy: 'Privacy', terms: 'Terms', other: 'Español',
    heroTitle: 'Rides, deliveries and hauling — peer to peer, across Florida.',
    heroBody: 'Post what you need or what you offer, and connect directly with people going your way. No dispatch, no surge pricing — just real people connecting.',
    getApp: 'Get the app',
    scan: 'Scan with your phone camera to download BoteGo.',
    features: [
      ['One board for everything', 'Rides, packages and hauling jobs in a single feed, anywhere in Florida.'],
      ['Talk before you agree', 'Message people in the app and settle the details directly — no phone number needed.'],
      ['Know who you deal with', 'Community badges, feedback, and report and block tools keep the board safe.'],
    ],
    supportBody: 'Questions, problems, or data requests? Email us and we will get back to you.',
    deleteHow: 'To delete your account, open the app and go to Profile → Edit → Delete my account.',
  },
  es: {
    tagline: 'El tablero comunitario de viajes de Florida',
    home: 'Inicio', download: 'Descargar', support: 'Soporte', privacy: 'Privacidad', terms: 'Términos', other: 'English',
    heroTitle: 'Viajes, envíos y acarreos — entre personas, en toda Florida.',
    heroBody: 'Publica lo que necesitas o lo que ofreces y conecta directamente con gente que va en tu misma dirección. Sin despacho ni tarifas dinámicas — solo personas reales conectando.',
    getApp: 'Descarga la app',
    scan: 'Escanea con la cámara de tu teléfono para descargar BoteGo.',
    features: [
      ['Un solo tablero para todo', 'Viajes, paquetes y acarreos en un mismo feed, en toda Florida.'],
      ['Hablen antes de acordar', 'Escríbele a la gente desde la app y acuerden los detalles directamente, sin compartir tu teléfono.'],
      ['Sabe con quién tratas', 'Insignias, comentarios de la comunidad y herramientas para reportar y bloquear.'],
    ],
    supportBody: '¿Preguntas, problemas o solicitudes sobre tus datos? Escríbenos y te responderemos.',
    deleteHow: 'Para eliminar tu cuenta, abre la app y ve a Perfil → Editar → Eliminar mi cuenta.',
  },
} as const;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Emails in the policy text become mailto links.
function linkify(s: string): string {
  return esc(s).replace(/([a-z0-9._-]+@botego\.app)/gi, '<a href="mailto:$1">$1</a>');
}

const CSS = `
  :root { --coral:#FF6243; --orange:#FF9B57; --gold:#FFC15E; --page:#FFFAF5; --card:#FFFFFF; --text:#1E2A32; --soft:#3A4A55; --muted:#7A8A94; --border:#F1E4D6; --jade:#0A7E77; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--page); color:var(--text); font:16px/1.6 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; overflow-wrap:anywhere; }
  header { background:var(--coral); background-image:linear-gradient(135deg,var(--coral),var(--orange) 55%,var(--gold)); color:#fff; padding:28px 16px 32px; }
  .wrap { max-width:760px; margin:0 auto; }
  .brand { display:flex; align-items:center; gap:12px; text-decoration:none; color:#fff; }
  .brand > span:last-child { min-width:0; }
  .logo { flex:none; width:44px; height:44px; border-radius:13px; background:#fff; color:var(--coral); font-weight:800; font-size:24px; display:flex; align-items:center; justify-content:center; }
  .name { font-weight:800; font-size:24px; letter-spacing:-.3px; }
  .tag { font-size:11px; font-weight:700; letter-spacing:1.5px; line-height:1.4; text-transform:uppercase; opacity:.9; margin-top:2px; }
  nav { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:20px; font-size:14px; font-weight:600; }
  nav a { color:#fff; }
  main { padding:28px 16px 48px; }
  h1 { font-size:28px; line-height:1.2; margin:0 0 6px; }
  .updated { color:var(--muted); font-size:14px; margin:0 0 20px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:18px; padding:22px; }
  h2 { font-size:18px; margin:24px 0 6px; }
  .card h2:first-of-type { margin-top:4px; }
  p { margin:0 0 10px; color:var(--soft); }
  a { color:var(--coral); }
  .btn { display:inline-block; background:var(--coral); background-image:linear-gradient(135deg,var(--coral),var(--orange)); color:#fff; text-decoration:none; font-weight:700; letter-spacing:.4px; padding:14px 26px; border-radius:999px; }
  .btn.secondary { background:#fff; background-image:none; color:var(--text); border:1px solid var(--border); }
  .hero h1 { font-size:32px; }
  .hero p { font-size:17px; }
  .get { display:flex; flex-wrap:wrap; gap:24px; align-items:center; margin-top:24px; }
  .qr { width:168px; height:168px; background:#fff; border:1px solid var(--border); border-radius:16px; padding:10px; }
  .qr img { width:100%; height:100%; display:block; }
  .qrcap { max-width:220px; font-size:14px; color:var(--muted); }
  .features { display:grid; gap:14px; margin-top:28px; }
  .features h2 { margin:0 0 4px; font-size:16px; }
  .steps { padding-left:20px; color:var(--soft); }
  .steps li { margin-bottom:6px; }
  .pill { display:inline-block; background:#E6F6F4; color:var(--jade); font-weight:700; font-size:13px; padding:6px 14px; border-radius:999px; }
  .hide { display:none; }
  footer { color:var(--muted); font-size:13px; text-align:center; padding:0 16px 32px; }
`;

// `root` is the relative path back to the site root from this page
// ('' / '../' / '../../'), so links work both on github.io/ridemate/ and on
// the botego.app custom domain.
function page(lang: Lang, root: string, title: string, body: string, otherHref: string, extraHead = ''): string {
  const u = UI[lang];
  const langRoot = lang === 'en' ? root : `${root}es/`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · BoteGo</title>
<meta name="description" content="${esc(u.heroBody)}">
<style>${CSS}</style>
${extraHead}
</head>
<body>
<header><div class="wrap">
  <a class="brand" href="${langRoot}"><span class="logo">B</span><span><div class="name">BoteGo</div><div class="tag">${esc(u.tagline)}</div></span></a>
  <nav><a href="${root}download/">${esc(u.download)}</a><a href="${langRoot}support.html">${esc(u.support)}</a><a href="${langRoot}privacy.html">${esc(u.privacy)}</a><a href="${langRoot}terms.html">${esc(u.terms)}</a><a href="${otherHref}">${esc(u.other)}</a></nav>
</div></header>
<main><div class="wrap">${body}</div></main>
<footer>© ${new Date().getFullYear()} BoteGo · <a href="mailto:support@botego.app">support@botego.app</a></footer>
</body>
</html>
`;
}

function legalPage(lang: Lang, doc: Doc, lastUpdated: string, file: string): string {
  const root = lang === 'en' ? '' : '../';
  const sections = doc.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n<p>${linkify(s.body)}</p>`).join('\n');
  const body = `<h1>${esc(doc.title)}</h1><p class="updated">${esc(lastUpdated)}</p><div class="card"><p>${linkify(doc.intro)}</p>\n${sections}</div>`;
  return page(lang, root, doc.title, body, lang === 'en' ? `es/${file}` : `../${file}`);
}

function supportPage(lang: Lang): string {
  const u = UI[lang];
  const root = lang === 'en' ? '' : '../';
  const body = `<h1>${esc(u.support)}</h1><div class="card">
<p>${esc(u.supportBody)}</p>
<p><a href="mailto:support@botego.app">support@botego.app</a></p>
<p>${esc(u.deleteHow)}</p>
</div>`;
  return page(lang, root, u.support, body, lang === 'en' ? 'es/support.html' : '../support.html');
}

function landingPage(lang: Lang): string {
  const u = UI[lang];
  const root = lang === 'en' ? '' : '../';
  const features = u.features.map(([h, b]) => `<div class="card"><h2>${esc(h)}</h2><p>${esc(b)}</p></div>`).join('');
  const body = `<section class="hero">
<h1>${esc(u.heroTitle)}</h1>
<p>${esc(u.heroBody)}</p>
<div class="get">
  <a class="btn" href="${root}download/">${esc(u.getApp)}</a>
  <div class="qr"><img src="${root}qr/botego-download.svg" alt="QR — ${esc(DOWNLOAD_PAGE)}"></div>
  <p class="qrcap">${esc(u.scan)}</p>
</div>
</section>
<div class="features">${features}</div>`;
  return page(lang, root, 'BoteGo', body, lang === 'en' ? 'es/' : '../');
}

// /download/ (what the QR encodes) is English and sends Spanish-language
// browsers to /es/download/, so header and body always match. The platform
// comes from the user agent: Android shows the APK button + install steps
// (an APK can't install silently, so no auto-redirect) until PLAY_STORE_URL
// exists; iPhone redirects once APP_STORE_URL exists; desktops get the QR.
function downloadPage(lang: Lang): string {
  const root = lang === 'en' ? '../' : '../../';
  const androidHref = PLAY_STORE_URL ?? ANDROID_APK_URL;
  const t = {
    en: {
      title: 'Download BoteGo', android: 'Download for Android', androidNote: 'Free · Android 7.0 or newer',
      steps: ['Tap “Download for Android”.', 'Open the downloaded file. If asked, allow your browser to install apps.', 'Tap Install, then open BoteGo.'],
      iosSoon: 'Coming soon to iPhone', iosBody: 'BoteGo for iPhone is on its way. Leave us your email at support@botego.app and we will let you know.',
      desktop: 'Scan this code with your phone’s camera to download BoteGo.', apk: 'Direct Android download',
    },
    es: {
      title: 'Descarga BoteGo', android: 'Descargar para Android', androidNote: 'Gratis · Android 7.0 o superior',
      steps: ['Toca “Descargar para Android”.', 'Abre el archivo descargado. Si te lo pide, permite que tu navegador instale apps.', 'Toca Instalar y abre BoteGo.'],
      iosSoon: 'Próximamente en iPhone', iosBody: 'BoteGo para iPhone viene en camino. Escríbenos a support@botego.app y te avisamos.',
      desktop: 'Escanea este código con la cámara de tu teléfono para descargar BoteGo.', apk: 'Descarga directa para Android',
    },
  };
  const s = t[lang];
  const body = `<h1>${esc(s.title)}</h1>
<div data-platform="android" class="card hide">
  ${PLAY_STORE_URL ? '' : `<p><a class="btn" href="${esc(androidHref)}">${esc(s.android)}</a></p><p class="updated">${esc(s.androidNote)}</p><ol class="steps">${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`}
</div>
<div data-platform="ios" class="card hide"><span class="pill">${esc(s.iosSoon)}</span><p style="margin-top:12px">${linkify(s.iosBody)}</p></div>
<div data-platform="desktop" class="card hide">
  <div class="get" style="margin-top:0"><div class="qr"><img src="${root}qr/botego-download.svg" alt="QR"></div><p class="qrcap">${esc(s.desktop)}</p></div>
  <p style="margin-top:16px"><a class="btn secondary" href="${esc(ANDROID_APK_URL)}">${esc(s.apk)}</a></p>
</div>`;
  const script = `<script>
(function () {
  var ua = navigator.userAgent || '';
  var platform = /android/i.test(ua) ? 'android' : (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) ? 'ios' : 'desktop';
  var stores = { android: ${JSON.stringify(PLAY_STORE_URL)}, ios: ${JSON.stringify(APP_STORE_URL)} };
  if (stores[platform]) { location.replace(stores[platform]); return; }
  ${lang === 'en' ? "if (/^es/i.test(navigator.language || '') && !/[?&]lang=en/.test(location.search)) { location.replace('../es/download/'); return; }" : ''}
  document.querySelectorAll('[data-platform="' + platform + '"]').forEach(function (el) { el.classList.remove('hide'); });
})();
</script>`;
  return page(lang, root, s.title, body + script, lang === 'en' ? '../es/download/' : '../../download/?lang=en');
}

for (const lang of ['en', 'es'] as Lang[]) {
  const legal = (translations as any)[lang].legal;
  const dir = lang === 'en' ? OUT : new URL('es/', OUT);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(new URL('index.html', dir), landingPage(lang));
  await Deno.writeTextFile(new URL('support.html', dir), supportPage(lang));
  await Deno.writeTextFile(new URL('privacy.html', dir), legalPage(lang, legal.privacy, legal.lastUpdated, 'privacy.html'));
  await Deno.writeTextFile(new URL('terms.html', dir), legalPage(lang, legal.terms, legal.lastUpdated, 'terms.html'));
}
for (const [lang, dir] of [['en', 'download/'], ['es', 'es/download/']] as [Lang, string][]) {
  await Deno.mkdir(new URL(dir, OUT), { recursive: true });
  await Deno.writeTextFile(new URL(`${dir}index.html`, OUT), downloadPage(lang));
}

// QR: SVG for the site and any print size, plus a 1200px PNG for quick
// sharing. Dark-on-white with a full quiet zone — branded colors scan worse.
const qrDir = new URL('qr/', OUT);
await Deno.mkdir(qrDir, { recursive: true });
const qrOpts = { errorCorrectionLevel: 'M', margin: 4, color: { dark: '#1E2A32', light: '#FFFFFF' } };
await Deno.writeTextFile(new URL('botego-download.svg', qrDir), await QRCode.toString(DOWNLOAD_PAGE, { ...qrOpts, type: 'svg' }));
const png = await QRCode.toBuffer(DOWNLOAD_PAGE, { ...qrOpts, type: 'png', width: 1200 });
await Deno.writeFile(new URL('botego-download.png', qrDir), new Uint8Array(png));

// Tell GitHub Pages to serve files as-is (no Jekyll processing).
await Deno.writeTextFile(new URL('.nojekyll', OUT), '');
console.log(`Built docs/: landing, download, support, privacy, terms (en + es) + QR -> ${DOWNLOAD_PAGE}`);
