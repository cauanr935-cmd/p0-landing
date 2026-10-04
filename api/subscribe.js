// Vercel serverless function: POST /api/subscribe
import { subscribe } from '../lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const { status, body } = await subscribe(req.body, ip);
  res.status(status).json(body);
}
