import { callSheets, isValidEmail, isValidUnsubscribeToken } from './newsletter.js';

// Naive in-memory rate limit per IP. On serverless it only lasts while the
// instance is warm, so it is a speed bump, not a hard guarantee.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

export async function subscribe(body, ip) {
  const email = String(body?.email || '').trim().toLowerCase();

  // Honeypot: bots fill the hidden field; pretend success and drop it.
  if (body?.website) return { status: 200, body: { ok: true } };

  if (rateLimited(ip)) {
    return { status: 429, body: { ok: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' } };
  }
  if (!isValidEmail(email)) {
    return { status: 400, body: { ok: false, error: 'Digite um e-mail válido.' } };
  }

  try {
    await callSheets({ action: 'subscribe', email });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('subscribe failed:', err.message);
    return { status: 502, body: { ok: false, error: 'Não foi possível concluir agora. Tente novamente mais tarde.' } };
  }
}

function messagePage(title, text) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · Be My Mentor</title><link rel="stylesheet" href="/style.css"></head>
<body><div class="wrap"><main style="padding-top:96px"><h1>${title}</h1><p class="lede">${text}</p>
<p class="link-note"><a href="/">← Voltar para o site</a></p></main></div></body></html>`;
}

export async function unsubscribe(query) {
  const email = String(query?.email || '').trim().toLowerCase();
  const token = String(query?.token || '');

  if (!isValidEmail(email) || !isValidUnsubscribeToken(email, token)) {
    return { status: 400, html: messagePage('Link inválido', 'Este link de descadastro não é válido ou expirou.') };
  }

  try {
    await callSheets({ action: 'unsubscribe', email });
    return { status: 200, html: messagePage('Inscrição cancelada', 'Você não vai mais receber a newsletter da Be My Mentor. Sentiremos sua falta.') };
  } catch (err) {
    console.error('unsubscribe failed:', err.message);
    return { status: 502, html: messagePage('Algo deu errado', 'Não conseguimos cancelar agora. Tente novamente em instantes.') };
  }
}
