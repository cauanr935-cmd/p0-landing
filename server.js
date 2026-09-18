import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const SHEETS_ENDPOINT = process.env.SHEETS_ENDPOINT;
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;

const app = express();
app.use(express.json());

app.post('/api/subscribe', async (req, res) => {
  const email = (req.body?.email || '').trim();

  if (!email) {
    return res.status(400).json({ ok: false, error: 'email vazio' });
  }

  if (!SHEETS_ENDPOINT) {
    console.error('SHEETS_ENDPOINT não configurado no .env');
    return res.status(500).json({ ok: false, error: 'newsletter não configurada' });
  }

  try {
    await fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ email }),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Falha ao encaminhar e-mail para a planilha:', err);
    res.status(502).json({ ok: false, error: 'falha ao encaminhar' });
  }
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
