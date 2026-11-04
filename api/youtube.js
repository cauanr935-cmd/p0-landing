// Vercel serverless function: GET /api/youtube
// Live channel and video numbers for the home timeline. The CDN keeps the
// answer for 10 minutes, so visitors never spend the API quota directly.
import { youtubeFeed } from '../lib/youtube.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }
  const { status, body } = await youtubeFeed();
  if (status === 200) res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(status).json(body);
}
