// Vercel serverless function: GET /api/unsubscribe?email=&token=
import { unsubscribe } from '../lib/handlers.js';

export default async function handler(req, res) {
  const { status, html } = await unsubscribe(req.query);
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
}
