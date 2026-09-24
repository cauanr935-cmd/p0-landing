import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;

const app = express();
app.use(express.json());

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
