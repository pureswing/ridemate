// Builds the public legal/support site into docs/ (served by GitHub Pages at
// https://pureswing.github.io/ridemate/) from the SAME text the app shows —
// constants/i18n.ts's `legal` block — so the App Store / Play Store privacy
// URL never drifts from the in-app policy. Re-run after editing that text:
//   npx -y deno@2.1.4 run --allow-read --allow-write scripts/build-legal-site.ts
import translations from '../constants/i18n.ts';

type Lang = 'en' | 'es';
type Section = { heading: string; body: string };
type Doc = { title: string; intro: string; sections: Section[] };

const OUT = new URL('../docs/', import.meta.url);

const UI: Record<Lang, { tagline: string; support: string; supportBody: string; privacy: string; terms: string; other: string; deleteHow: string }> = {
  en: {
    tagline: "Florida's community ride board",
    support: 'Support',
    supportBody: 'Questions, problems, or data requests? Email us and we will get back to you.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    other: 'Español',
    deleteHow: 'To delete your account, open the app and go to Profile → Edit → Delete my account.',
  },
  es: {
    tagline: 'El tablero comunitario de viajes de Florida',
    support: 'Soporte',
    supportBody: '¿Preguntas, problemas o solicitudes sobre tus datos? Escríbenos y te responderemos.',
    privacy: 'Política de privacidad',
    terms: 'Términos del servicio',
    other: 'English',
    deleteHow: 'Para eliminar tu cuenta, abre la app y ve a Perfil → Editar → Eliminar mi cuenta.',
  },
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Emails in the policy text become mailto links.
function linkify(s: string): string {
  return esc(s).replace(/([a-z0-9._-]+@botego\.app)/gi, '<a href="mailto:$1">$1</a>');
}

function page(lang: Lang, title: string, body: string, otherHref: string): string {
  const u = UI[lang];
  const home = lang === 'en' ? './' : './';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · BoteGo</title>
<style>
  :root { --coral:#FF6243; --orange:#FF9B57; --gold:#FFC15E; --page:#FFFAF5; --card:#FFFFFF; --text:#1E2A32; --soft:#3A4A55; --muted:#7A8A94; --border:#F1E4D6; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--page); color:var(--text); font:16px/1.6 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  header { background:var(--coral); background-image:linear-gradient(135deg,var(--coral),var(--orange) 55%,var(--gold)); color:#fff; padding:28px 16px 32px; }
  .wrap { max-width:760px; margin:0 auto; }
  .brand { display:flex; align-items:center; gap:12px; text-decoration:none; color:#fff; }
  .brand > span:last-child { min-width:0; }
  body { overflow-wrap:anywhere; }
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
  footer { color:var(--muted); font-size:13px; text-align:center; padding:0 16px 32px; }
</style>
</head>
<body>
<header><div class="wrap">
  <a class="brand" href="${home}"><span class="logo">B</span><span><div class="name">BoteGo</div><div class="tag">${esc(u.tagline)}</div></span></a>
  <nav><a href="./">${esc(u.support)}</a><a href="privacy.html">${esc(u.privacy)}</a><a href="terms.html">${esc(u.terms)}</a><a href="${otherHref}">${esc(u.other)}</a></nav>
</div></header>
<main><div class="wrap">${body}</div></main>
<footer>© ${new Date().getFullYear()} BoteGo · <a href="mailto:support@botego.app">support@botego.app</a></footer>
</body>
</html>
`;
}

function legalPage(lang: Lang, doc: Doc, lastUpdated: string, file: string): string {
  const sections = doc.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n<p>${linkify(s.body)}</p>`).join('\n');
  const body = `<h1>${esc(doc.title)}</h1><p class="updated">${esc(lastUpdated)}</p><div class="card"><p>${linkify(doc.intro)}</p>\n${sections}</div>`;
  return page(lang, doc.title, body, lang === 'en' ? `es/${file}` : `../${file}`);
}

function supportPage(lang: Lang): string {
  const u = UI[lang];
  const body = `<h1>${esc(u.support)}</h1><div class="card">
<p>${esc(u.supportBody)}</p>
<p><a href="mailto:support@botego.app">support@botego.app</a></p>
<p>${esc(u.deleteHow)}</p>
<p><a href="privacy.html">${esc(u.privacy)}</a> · <a href="terms.html">${esc(u.terms)}</a></p>
</div>`;
  return page(lang, u.support, body, lang === 'en' ? 'es/' : '../');
}

for (const lang of ['en', 'es'] as Lang[]) {
  const legal = (translations as any)[lang].legal;
  const dir = lang === 'en' ? OUT : new URL('es/', OUT);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(new URL('privacy.html', dir), legalPage(lang, legal.privacy, legal.lastUpdated, 'privacy.html'));
  await Deno.writeTextFile(new URL('terms.html', dir), legalPage(lang, legal.terms, legal.lastUpdated, 'terms.html'));
  await Deno.writeTextFile(new URL('index.html', dir), supportPage(lang));
}
// Tell GitHub Pages to serve files as-is (no Jekyll processing).
await Deno.writeTextFile(new URL('.nojekyll', OUT), '');
console.log('Built docs/: index, privacy, terms (en + es)');
