// Usage: npm run check:theme
// Lists colors written directly in page CSS (#hex, rgb(), hsl()). To adapt to
// the dark theme, a page must use the tokens from public/theme.css instead.
// White (#fff, rgba(255,255,255,…)) is allowed (text on purple / dark cards).
// Add a `theme-ok` comment on a line to accept an intentional exception.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const EXCLUDED = new Set(['bemymentor-newsletter.html']);

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;
const ALLOWED = /^(#fff|#ffffff|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,[^)]*\))$/i;

const files = readdirSync(root).filter(
  (f) => (f.endsWith('.html') && !EXCLUDED.has(f)) || f === 'style.css',
);

const problems = [];

for (const file of files) {
  const lines = readFileSync(resolve(root, file), 'utf8').split(/\r?\n/);
  const isCss = file.endsWith('.css');
  let inStyle = isCss;

  lines.forEach((line, i) => {
    if (!isCss) {
      if (/<style[\s>]/i.test(line)) inStyle = true;
    }

    const targets = [];
    if (inStyle) targets.push(line);
    if (!isCss) for (const m of line.matchAll(/\sstyle="([^"]*)"/g)) targets.push(m[1]);

    if (!isCss && /<\/style>/i.test(line)) inStyle = false;
    if (/theme-ok/.test(line)) return;

    const found = new Set();
    for (const text of targets) {
      for (const match of text.match(COLOR) ?? []) {
        if (!ALLOWED.test(match)) found.add(match);
      }
    }
    found.forEach((match) => problems.push(`${file}:${i + 1}  ${match}`));
  });
}

if (problems.length) {
  console.error('Cores soltas (use tokens de public/theme.css ou marque com "theme-ok"):');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`OK: nenhuma cor solta em ${files.length} arquivo(s).`);
