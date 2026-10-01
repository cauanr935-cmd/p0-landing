import { createHmac, timingSafeEqual } from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

export function unsubscribeToken(email) {
  return createHmac('sha256', process.env.UNSUB_SECRET || '')
    .update(email.toLowerCase())
    .digest('hex');
}

export function isValidUnsubscribeToken(email, token) {
  if (!process.env.UNSUB_SECRET || typeof token !== 'string') return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Calls the Google Apps Script web app that stores subscribers in the spreadsheet.
export async function callSheets(payload) {
  const { SHEETS_ENDPOINT, SHARED_SECRET } = process.env;
  if (!SHEETS_ENDPOINT || !SHARED_SECRET) {
    throw new Error('SHEETS_ENDPOINT e SHARED_SECRET precisam estar definidos no .env');
  }
  const res = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret: SHARED_SECRET }),
  });
  if (!res.ok) throw new Error(`Apps Script respondeu ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Apps Script retornou erro');
  return data;
}
