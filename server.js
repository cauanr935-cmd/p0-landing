import express from 'express';
import dotenv from 'dotenv';
import { subscribe, unsubscribe } from './lib/handlers.js';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;

const app = express();
app.use(express.json({ limit: '2kb' }));

app.post('/api/subscribe', async (req, res) => {
  const { status, body } = await subscribe(req.body, req.ip);
  res.status(status).json(body);
});

app.get('/api/unsubscribe', async (req, res) => {
  const { status, html } = await unsubscribe(req.query);
  res.status(status).send(html);
});

if (isProd) {
  app.use(express.static('dist'));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true } });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port} (${isProd ? 'produção' : 'dev'})`);
});
