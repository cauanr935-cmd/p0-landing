// Usage:
//   npm run send-newsletter -- <slug> "<Assunto>" "<Resumo curto>" [--dry-run]
// Example:
//   npm run send-newsletter -- registro-3 "Registro nº 3: validação de horas" "Como vamos validar..." --dry-run
import dotenv from 'dotenv';
import { callSheets, unsubscribeToken } from '../lib/newsletter.js';

dotenv.config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [slug, subject, summary] = args.filter((a) => a !== '--dry-run');

if (!slug || !subject || !summary) {
  console.error('Uso: npm run send-newsletter -- <slug> "<Assunto>" "<Resumo>" [--dry-run]');
  process.exit(1);
}

const { RESEND_API_KEY, MAIL_FROM, SITE_URL } = process.env;
if (!SITE_URL || (!dryRun && (!RESEND_API_KEY || !MAIL_FROM))) {
  console.error('Defina SITE_URL, RESEND_API_KEY e MAIL_FROM no .env');
  process.exit(1);
}

const siteUrl = SITE_URL.replace(/\/$/, '');
const postUrl = `${siteUrl}/${slug}.html`;

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildHtml(unsubUrl) {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f7f5ff;padding:24px 12px;font-family:Inter,Arial,sans-serif;color:#1a0533;">
  <div style="max-width:540px;margin:0 auto;">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#9284b3;margin:0 0 12px;">✦ Be My Mentor · Novo registro</p>
    <div style="background:#ffffff;border:2px solid #e4dcff;border-radius:14px;padding:28px 24px;box-shadow:4px 4px 0 #e4dcff;">
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 14px;">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.65;margin:0 0 24px;color:#1a0533;">${escapeHtml(summary)}</p>
      <a href="${postUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-family:'Space Grotesk',Arial,sans-serif;font-weight:800;font-size:15px;padding:13px 24px;border:2.5px solid #1a0533;border-radius:4px;box-shadow:4px 4px 0 #1a0533;">Ler registro completo →</a>
    </div>
    <p style="font-size:12px;line-height:1.6;color:#9284b3;margin:18px 4px 0;">
      Você recebeu este e-mail porque assinou a newsletter da Be My Mentor.
      <a href="${unsubUrl}" style="color:#7c3aed;">Cancelar inscrição</a>
    </p>
  </div>
</body></html>`;
}

const { emails } = await callSheets({ action: 'list' });
console.log(`${emails.length} assinante(s) ativo(s). Link: ${postUrl}`);

if (dryRun) {
  emails.forEach((e) => console.log(' -', e));
  console.log('--dry-run: nada foi enviado.');
  process.exit(0);
}

const messages = emails.map((email) => {
  const unsubUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`;
  return {
    from: MAIL_FROM,
    to: [email],
    subject,
    html: buildHtml(unsubUrl),
    headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
  };
});

let sent = 0;
for (let i = 0; i < messages.length; i += 100) {
  const chunk = messages.slice(i, i + 100);
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) {
    console.error(`Falha no lote ${i / 100 + 1}: ${res.status} ${await res.text()}`);
    console.error(`${sent} enviado(s) antes da falha. Não rode de novo sem checar para evitar duplicados.`);
    process.exit(1);
  }
  sent += chunk.length;
}

console.log(`Enviado para ${sent} assinante(s).`);
