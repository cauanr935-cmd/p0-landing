// Vercel serverless function: POST /api/vote { poll, choice: 'sim' | 'nao' }
import { vote } from '../lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const { status, body } = await vote(req.body, ip);
  res.status(status).json(body);
}
