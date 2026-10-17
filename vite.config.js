import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;

// Mockups que não fazem parte do site publicado.
const EXCLUDED_PAGES = new Set(['bemymentor-newsletter.html']);

// Toda página .html da raiz entra no build sozinha (registro-5.html, etc.).
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith('.html') && !EXCLUDED_PAGES.has(file))
    .map((file) => [file.replace(/\.html$/, ''), resolve(root, file)]),
);

// Aplica o tema salvo antes do primeiro desenho para não piscar claro/escuro.
const THEME_INIT = `try{var t=localStorage.getItem('bmm-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'#0f0a1a':'#f7f5ff';}}catch(e){}`;

// Injeta o dark mode (tokens, botão e script anti-flash) em TODA página,
// no dev e no build. Página nova herda o tema sem copiar nenhum trecho.
function themePlugin() {
  return {
    name: 'bmm-theme',
    transformIndexHtml(_html, ctx) {
      if (EXCLUDED_PAGES.has(ctx.path.replace(/^\//, ''))) return;
      return [
        { tag: 'script', children: THEME_INIT, injectTo: 'head-prepend' },
        { tag: 'link', attrs: { rel: 'stylesheet', href: '/theme.css' }, injectTo: 'head' },
        { tag: 'script', attrs: { src: '/theme-toggle.js', defer: true }, injectTo: 'body' },
      ];
    },
  };
}

export default defineConfig({
  plugins: [themePlugin()],
  build: {
    rollupOptions: {
      input: pages,
    },
  },
});
