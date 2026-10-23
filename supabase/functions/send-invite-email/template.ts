// Invite email markup. Email clients ignore <style> blocks and most modern
// CSS (Gmail strips <head> styles, Outlook ignores gradients/border-radius),
// so this is table layout with inline styles only: gradients carry a solid
// bgcolor fallback, and the CTA is a padded table cell rather than a styled
// <a> so its whole area stays clickable everywhere. Colors are the app's
// "Miami Sunset" tokens from constants/themes.ts. Bilingual because the
// invitee's language is unknown at send time.

const C = {
  coral: '#FF6243',
  orange: '#FF9B57',
  gold: '#FFC15E',
  cream: '#FFF8F0',
  page: '#FFFAF5',
  card: '#FFFFFF',
  text: '#1E2A32',
  textSoft: '#3A4A55',
  muted: '#7A8A94',
  border: '#F1E4D6',
  jade: '#0A7E77',
  jadeSoft: '#E6F6F4',
};

const FONT = "'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif";
const DISPLAY = "'Bricolage Grotesque', 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function step(n: number, title: string, body: string): string {
  return `
    <tr>
      <td width="36" valign="top" style="padding:0 12px 14px 0;">
        <div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${C.coral};color:#FFFFFF;font-family:${FONT};font-size:13px;font-weight:700;text-align:center;">${n}</div>
      </td>
      <td valign="top" style="padding:0 0 14px 0;font-family:${FONT};">
        <div style="font-size:15px;font-weight:700;color:${C.text};line-height:20px;">${title}</div>
        <div style="font-size:14px;color:${C.textSoft};line-height:20px;">${body}</div>
      </td>
    </tr>`;
}

function button(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 4px auto;">
      <tr>
        <td align="center" bgcolor="${C.coral}" style="border-radius:999px;background:${C.coral};background-image:linear-gradient(135deg, ${C.coral}, ${C.orange});">
          <a href="${href}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:0.5px;color:#FFFFFF;text-decoration:none;border-radius:999px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

export function inviteSubject(months: number): string {
  return `You're invited to BoteGo — ${months} months of Donor included`;
}

export function inviteHtml(rawEmail: string, downloadUrl: string, months: number): string {
  const email = escapeHtml(rawEmail);
  const url = escapeHtml(downloadUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${inviteSubject(months)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Inbox preview line -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Download BoteGo and sign up with ${email} to unlock ${months} months of Donor. · Descarga BoteGo y obtén ${months} meses de Donor.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${C.coral}" style="border-radius:24px 24px 0 0;background:${C.coral};background-image:linear-gradient(135deg, ${C.coral} 0%, ${C.orange} 55%, ${C.gold} 100%);padding:36px 24px 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" width="64" height="64" bgcolor="#FFFFFF" style="width:64px;height:64px;border-radius:18px;background:#FFFFFF;font-family:${DISPLAY};font-size:34px;font-weight:800;color:${C.coral};line-height:64px;">B</td>
                </tr>
              </table>
              <div style="font-family:${DISPLAY};font-size:30px;font-weight:800;color:#FFFFFF;margin-top:14px;letter-spacing:-0.5px;">BoteGo</div>
              <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2.5px;color:${C.cream};text-transform:uppercase;margin-top:6px;">Florida's community ride board</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="${C.card}" style="background:${C.card};padding:32px 32px 8px 32px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
              <div style="font-family:${DISPLAY};font-size:26px;font-weight:800;color:${C.text};line-height:32px;letter-spacing:-0.3px;">You're invited 🎉</div>
              <div style="font-family:${FONT};font-size:15px;color:${C.textSoft};line-height:23px;margin-top:10px;">
                Someone thinks you'd like BoteGo — rides, deliveries and hauling, all peer-to-peer across Florida. Join now and your first
                <strong style="color:${C.text};">${months} months of Donor</strong> are on us.
              </div>

              <!-- Donor pill -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 22px 0;">
                <tr>
                  <td bgcolor="${C.jadeSoft}" style="background:${C.jadeSoft};border-radius:999px;padding:8px 16px;font-family:${FONT};font-size:13px;font-weight:700;color:${C.jade};">
                    ★ ${months} months Donor · free
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${step(1, 'Download the app', 'Tap the button below — it opens the right download for your phone (Android now, iPhone coming soon).')}
                ${step(2, 'Sign up with this email', `Use <strong style="color:${C.text};">${email}</strong> — that's how we recognize your invite.`)}
                ${step(3, 'Donor unlocks automatically', 'No code needed. It activates the moment your account is created.')}
              </table>

              ${button(url, 'DOWNLOAD BOTEGO')}
              <div style="font-family:${FONT};font-size:12px;color:${C.muted};text-align:center;line-height:18px;margin:10px 0 24px 0;">
                Button not working? Copy this link:<br>
                <a href="${url}" style="color:${C.coral};word-break:break-all;">${url}</a>
              </div>
            </td>
          </tr>

          <!-- Spanish -->
          <tr>
            <td bgcolor="${C.cream}" style="background:${C.cream};padding:24px 32px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-top:1px solid ${C.border};">
              <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:${C.coral};text-transform:uppercase;">En español</div>
              <div style="font-family:${DISPLAY};font-size:20px;font-weight:800;color:${C.text};margin-top:8px;">¡Estás invitado a BoteGo!</div>
              <div style="font-family:${FONT};font-size:14px;color:${C.textSoft};line-height:21px;margin-top:8px;">
                Descarga la app con el botón de arriba y regístrate con <strong style="color:${C.text};">${email}</strong>.
                Tus <strong style="color:${C.text};">${months} meses de Donor</strong> se activan solos, sin códigos.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="${C.card}" style="background:${C.card};border-radius:0 0 24px 24px;border:1px solid ${C.border};border-top:0;padding:20px 32px 26px 32px;font-family:${FONT};font-size:12px;color:${C.muted};line-height:18px;text-align:center;">
              You're receiving this because a BoteGo admin invited ${email}. If you weren't expecting it, you can ignore this email.<br>
              Recibiste este correo porque un administrador de BoteGo invitó a ${email}. Si no lo esperabas, ignóralo.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plain-text alternative — clients that don't render HTML show this, and
// sending both improves deliverability (HTML-only mail scores worse as spam).
export function inviteText(email: string, downloadUrl: string, months: number): string {
  return [
    "You're invited to BoteGo!",
    '',
    `Rides, deliveries and hauling, all peer-to-peer across Florida. Join now and your first ${months} months of Donor are on us.`,
    '',
    `1. Download the app: ${downloadUrl}`,
    `2. Sign up with this email: ${email}`,
    '3. Donor unlocks automatically, no code needed.',
    '',
    '---',
    '¡Estás invitado a BoteGo!',
    `Descarga la app (${downloadUrl}) y regístrate con ${email}. Tus ${months} meses de Donor se activan solos.`,
    '',
    `You're receiving this because a BoteGo admin invited ${email}. If you weren't expecting it, ignore this email.`,
  ].join('\n');
}
