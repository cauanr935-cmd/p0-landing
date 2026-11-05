// Tudo que é desenhado em papel (canvas 2D): páginas do diário, capa,
// quadro branco, telas, mapa. Cada função recebe um contexto e desenha.
import { BRAZIL } from './diorama-content.js';

export const PAPER = '#f4efe3';
export const INK = '#1d2a5a';
export const RED = '#d2372b';
export const GREEN = '#1f8a4c';
const GRID = 'rgba(70, 120, 190, 0.22)';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Gerador pseudoaleatório com semente: o papel sai igual a cada visita.
export function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function fibers(ctx, w, h, rand, amount = 1400) {
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = `rgba(120,100,60,${rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
  }
}

export function graphPaper(ctx, w, h, { margin = false, seed = 1 } = {}) {
  const rand = seeded(seed);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // leve variação de tom, como papel de verdade
  const g = ctx.createRadialGradient(w * 0.4, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.95);
  g.addColorStop(0, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(150,120,70,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  fibers(ctx, w, h, rand);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.2;
  const step = 34;
  for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  if (margin) {
    ctx.strokeStyle = 'rgba(210, 55, 43, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(100, h); ctx.stroke();
  }
}

// Traço "à mão": linha com leve tremor.
function handLine(ctx, x1, y1, x2, y2, rand, wobble = 2.5) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const n = 8;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    ctx.lineTo(x1 + (x2 - x1) * t + (rand() - 0.5) * wobble, y1 + (y2 - y1) * t + (rand() - 0.5) * wobble);
  }
  ctx.stroke();
}

function underlineTicks(ctx, x, y) {
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 26, y); ctx.lineTo(x + i * 26 + 16, y - 16); ctx.stroke();
  }
}

// ── Página da esquerda: o registro ──
export function drawLeftPage(ctx, w, h, page, { seed = 1, vote = null, number = '' } = {}) {
  const rand = seeded(seed);
  graphPaper(ctx, w, h, { margin: true, seed });
  const x0 = 132;
  const maxW = w - x0 - 70;
  let y = 124;

  if (page.kicker) {
    ctx.fillStyle = RED;
    ctx.font = '54px "Caveat Brush"';
    ctx.fillText(page.kicker, x0, y);
    y += 92;
  }
  if (page.title) {
    ctx.fillStyle = INK;
    ctx.font = '94px "Caveat Brush"';
    wrap(ctx, page.title, maxW).forEach((l) => { ctx.fillText(l, x0, y); y += 94; });
    underlineTicks(ctx, x0, y - 34);
    y += 34;
  }
  (page.lines || []).forEach((l) => {
    ctx.font = '600 56px "Caveat"';
    ctx.fillStyle = INK;
    wrap(ctx, l, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 62; });
    y += 16;
  });

  if (page.erro) {
    y += 14;
    ctx.font = '52px "Caveat Brush"';
    ctx.fillStyle = RED;
    ctx.fillText(page.erroLabel || '✗ errou', x0, y);
    y += 62;
    ctx.font = '600 54px "Caveat"';
    wrap(ctx, page.erro, maxW).forEach((ln) => {
      ctx.fillStyle = RED;
      ctx.fillText(ln, x0, y);
      const lw = ctx.measureText(ln).width;
      ctx.strokeStyle = 'rgba(210,55,43,0.85)';
      ctx.lineWidth = 3.5;
      handLine(ctx, x0 - 6, y - 16, x0 + lw + 6, y - 20, rand, 3);
      y += 62;
    });
    y += 18;
  }
  if (page.acerto) {
    y += 6;
    ctx.font = '52px "Caveat Brush"';
    ctx.fillStyle = GREEN;
    ctx.fillText('✓ acertou', x0, y);
    y += 62;
    ctx.font = '600 54px "Caveat"';
    const lines = wrap(ctx, page.acerto, maxW - 40);
    const top = y - 48;
    lines.forEach((ln) => { ctx.fillText(ln, x0 + 10, y); y += 62; });
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    const cy = top + (y - top) / 2 - 16;
    for (let a = 0; a <= Math.PI * 2.08; a += 0.05) {
      const jitter = 1 + (rand() - 0.5) * 0.015;
      const px = x0 + 10 + widest / 2 + Math.cos(a) * (widest / 2 + 34) * jitter;
      const py = cy + Math.sin(a) * ((y - top) / 2 + 12) * jitter;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    y += 20;
  }

  if (page.question) {
    ctx.font = '70px "Caveat Brush"';
    ctx.fillStyle = INK;
    wrap(ctx, page.question, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 72; });
    y += 20;
    if (vote) {
      ctx.save();
      ctx.translate(x0 + 230, y + 90);
      ctx.rotate(-0.16);
      const color = vote.choice === 'sim' ? GREEN : RED;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 9;
      ctx.strokeRect(-210, -70, 420, 140);
      ctx.lineWidth = 3;
      ctx.strokeRect(-196, -56, 392, 112);
      ctx.font = '84px "Caveat Brush"';
      ctx.textAlign = 'center';
      ctx.fillText(vote.choice === 'sim' ? 'ABRIRIA' : 'AINDA NÃO', 0, 28);
      // falhas de tinta do carimbo
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 140; i++) {
        ctx.globalAlpha = rand() * 0.6;
        ctx.fillRect(-210 + rand() * 420, -70 + rand() * 140, 2 + rand() * 6, 2 + rand() * 4);
      }
      ctx.restore();
      y += 230;
      ctx.font = '600 58px "Caveat"';
      ctx.fillStyle = INK;
      wrap(ctx, vote.answer, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 64; });
      if (vote.share) {
        y += 10;
        ctx.font = '52px "Caveat Brush"';
        ctx.fillStyle = vote.choice === 'nao' ? GREEN : RED;
        wrap(ctx, vote.share, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 60; });
      }
    } else {
      ctx.font = '600 46px "Caveat"';
      ctx.fillStyle = 'rgba(29,42,90,0.5)';
      ctx.fillText('carimba aí embaixo ↓', x0, y + 20);
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = 'rgba(29,42,90,0.3)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 10, y + 70, 420, 140);
      ctx.setLineDash([]);
    }
  }

  if (page.blank) {
    ctx.fillStyle = 'rgba(29,42,90,0.16)';
    for (let i = 0; i < 9; i++) ctx.fillRect(x0, y + 30 + i * 74, maxW, 2);
    // lápis esperando
    ctx.save();
    ctx.translate(x0 + maxW * 0.55, y + 30 + 3 * 74);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(0, -10, 260, 20);
    ctx.fillStyle = '#e8b4a0';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-40, 0); ctx.lineTo(0, 10); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.moveTo(-28, -3); ctx.lineTo(-40, 0); ctx.lineTo(-28, 3); ctx.fill();
    ctx.fillStyle = '#e48a9a';
    ctx.fillRect(260, -10, 30, 20);
    ctx.restore();
  }

  ctx.font = '600 38px "Caveat"';
  ctx.fillStyle = 'rgba(29,42,90,0.5)';
  if (number) ctx.fillText(number, x0, h - 64);
}

// ── Página da direita: polaroid (espaço reservado), post-its, balões, rabiscos ──
export function drawRightPage(ctx, w, h, page, { seed = 2, number = '', photo = null } = {}) {
  const rand = seeded(seed);
  graphPaper(ctx, w, h, { seed });
  const x0 = 70;
  const maxW = w - x0 - 70;
  let y = 150;

  if (page.title) {
    ctx.fillStyle = INK;
    ctx.font = '90px "Caveat Brush"';
    wrap(ctx, page.title, maxW).forEach((l) => { ctx.fillText(l, x0, y); y += 92; });
    underlineTicks(ctx, x0, y - 34);
    y += 40;
  }
  (page.lines || []).forEach((l) => {
    ctx.font = '600 56px "Caveat"';
    ctx.fillStyle = INK;
    wrap(ctx, l, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 62; });
    y += 16;
  });

  if (page.polaroid) drawPolaroid(ctx, w, h, page.polaroid, photo, seed);

  if (page.polaroid?.caption) {
    // legenda escrita embaixo da foto (a foto em si é um objeto 3D)
    ctx.font = '600 54px "Caveat"';
    ctx.fillStyle = INK;
    ctx.save();
    ctx.translate(w / 2, page.polaroid.aspect > 1.3 ? 830 : 1000);
    ctx.rotate(-0.025);
    ctx.textAlign = 'center';
    ctx.fillText(page.polaroid.caption, 0, 0);
    ctx.restore();
  }

  if (page.doodle === 'camadas') {
    ctx.font = '62px "Caveat Brush"';
    ctx.fillStyle = INK;
    ctx.fillText('como validar uma mentoria', x0, 170);
    const steps = ['áudio', 'algoritmo', 'LLM', 'humano'];
    steps.forEach((s, i) => {
      const bx = x0 + 40 + (i % 2) * 380;
      const by = 260 + i * 150;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.strokeRect(bx, by, 300, 96);
      ctx.font = '600 56px "Caveat"';
      ctx.fillText(s, bx + 30, by + 64);
      if (i < steps.length - 1) {
        const nx = x0 + 40 + ((i + 1) % 2) * 380;
        ctx.strokeStyle = RED;
        ctx.lineWidth = 4;
        handLine(ctx, bx + 150, by + 100, nx + 150, by + 146, rand, 4);
        ctx.beginPath(); ctx.moveTo(nx + 150, by + 146); ctx.lineTo(nx + 132, by + 128); ctx.moveTo(nx + 150, by + 146); ctx.lineTo(nx + 166, by + 126); ctx.stroke();
      }
    });
    ctx.font = '600 46px "Caveat"';
    ctx.fillStyle = 'rgba(29,42,90,0.75)';
    ctx.fillText('só sobe de camada se algo parecer suspeito', x0, 900);
  }

  if (page.bubbles) {
    let by = 170;
    ctx.font = '600 52px "Caveat"';
    ctx.fillStyle = INK;
    ctx.fillText('LinkedIn, semana do #004', x0, by);
    by += 70;
    page.bubbles.forEach((b) => {
      if (b.meta) {
        ctx.font = '600 44px "Caveat"';
        ctx.fillStyle = 'rgba(29,42,90,0.5)';
        ctx.fillText(b.text, w - x0 - ctx.measureText(b.text).width, by + 30);
        by += 80;
        return;
      }
      ctx.font = '600 50px "Caveat"';
      const tw = ctx.measureText(b.text).width;
      const bx = w - x0 - tw - 50;
      ctx.fillStyle = '#d6e6ff';
      ctx.beginPath(); ctx.roundRect(bx, by, tw + 50, 84, 28); ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(b.text, bx + 25, by + 56);
      by += 108;
    });
    ctx.font = '96px "Caveat Brush"';
    ctx.fillStyle = RED;
    ctx.save();
    ctx.translate(x0 + 40, by + 90);
    ctx.rotate(-0.08);
    ctx.fillText('0 respostas', 0, 0);
    ctx.restore();
  }

  if (page.sticker) {
    ctx.save();
    ctx.translate(w / 2, h - 300);
    ctx.rotate(0.04);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.roundRect(-340, -90, 680, 180, 30); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d61f1f';
    ctx.beginPath(); ctx.roundRect(-320, -70, 640, 140, 22); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '62px "Caveat Brush"';
    ctx.fillText(page.sticker.text, 0, 0);
    ctx.font = '600 42px "Caveat"';
    ctx.fillText(page.sticker.sub, 0, 50);
    ctx.restore();
  }

  (page.notes || []).forEach((n, i) => drawPostIt(ctx, w, h, n, seed + i * 7));

  ctx.font = '600 38px "Caveat"';
  ctx.fillStyle = 'rgba(29,42,90,0.5)';
  if (number) ctx.fillText(number, w - x0 - ctx.measureText(number).width, h - 64);
}

// Medidas da polaroid em metros (as mesmas usadas na cena 3D para o vídeo).
export function polaroidSize(aspect = 1) {
  const pw = aspect > 1.3 ? 0.17 : 0.135;
  const ph = pw / aspect;
  return { pw, ph, frameW: pw + 0.016, frameH: ph + 0.04, top: 0.018 };
}

// Polaroid desenhada no próprio papel: assim ela vira junto com a folha.
function drawPolaroid(ctx, w, h, pol, photo, seed) {
  const rand = seeded(seed + 31);
  const k = w / 0.21; // px por metro
  const { pw, ph, frameW, frameH, top } = polaroidSize(pol.aspect || 1);
  const fw = frameW * k, fh = frameH * k;
  ctx.save();
  ctx.translate(w / 2, top * k + fh / 2);
  ctx.rotate(-(pol.tilt || 0));
  ctx.shadowColor = 'rgba(40,30,10,0.35)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#fbfbf7';
  ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
  ctx.shadowColor = 'transparent';
  const px = pw * k, py = ph * k;
  const ox = -px / 2, oy = -fh / 2 + 0.008 * k;
  if (photo) {
    const ia = photo.width / photo.height, ta = px / py;
    let sw = photo.width, sh = photo.height, sx = 0, sy = 0;
    if (ia > ta) { sw = photo.height * ta; sx = (photo.width - sw) / 2; } else { sh = photo.width / ta; sy = (photo.height - sh) / 2; }
    ctx.drawImage(photo, sx, sy, sw, sh, ox, oy, px, py);
  } else {
    ctx.fillStyle = '#2a2633';
    ctx.fillRect(ox, oy, px, py);
  }
  // brilho leve e fita adesiva
  const g = ctx.createLinearGradient(ox, oy, ox + px, oy + py);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(ox, oy, px, py);
  ctx.save();
  ctx.translate(fw / 2 - 40, -fh / 2 + 6);
  ctx.rotate(0.35);
  ctx.fillStyle = 'rgba(239, 230, 176, 0.75)';
  ctx.fillRect(-150, -40, 300, 80);
  ctx.restore();
  ctx.restore();
  void rand;
}

function drawPostIt(ctx, w, h, n, seed) {
  const rand = seeded(seed);
  const size = 330;
  ctx.save();
  ctx.translate(w * n.x, h * n.y);
  ctx.rotate(n.rot || 0);
  ctx.shadowColor = 'rgba(60,40,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = n.color || '#fff27a';
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(-size / 2, -size / 2, size, 40);
  fibers(ctx, size, size, rand, 200);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = `${n.text.length > 6 ? 84 : 120}px "Caveat Brush"`;
  ctx.fillText(n.text, 0, -10);
  ctx.font = '600 40px "Caveat"';
  wrap(ctx, n.sub || '', size - 50).forEach((l, i) => ctx.fillText(l, 0, 60 + i * 44));
  ctx.restore();
}

export function drawCover(ctx, w, h) {
  const rand = seeded(99);
  ctx.fillStyle = '#1b1b22';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.035})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  // adesivos na capa
  ctx.save();
  ctx.translate(w * 0.72, h * 0.78);
  ctx.rotate(0.2);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath(); ctx.arc(0, 0, 106, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '60px "Caveat Brush"';
  ctx.fillText('build', 0, -6);
  ctx.fillText('in public', 0, 50);
  ctx.restore();
  ctx.save();
  ctx.translate(w * 0.24, h * 0.8);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(-130, -46, 260, 92, 14); ctx.fill();
  ctx.fillStyle = '#d2372b';
  ctx.font = '58px "Caveat Brush"';
  ctx.textAlign = 'center';
  ctx.fillText('Inteli ✦', 0, 18);
  ctx.restore();
  // etiqueta de papel rasgado
  ctx.save();
  ctx.translate(w / 2, h * 0.38);
  ctx.rotate(-0.04);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  const lw = w * 0.78, lh = 300;
  ctx.moveTo(-lw / 2, -lh / 2);
  for (let x = -lw / 2; x <= lw / 2; x += 18) ctx.lineTo(x, -lh / 2 + rand() * 12);
  for (let x = lw / 2; x >= -lw / 2; x -= 18) ctx.lineTo(x, lh / 2 - rand() * 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = '104px "Caveat Brush"';
  ctx.fillText('diário de bordo_', 0, -6);
  ctx.font = '600 56px "Caveat"';
  ctx.fillText('Be My Mentor · Cauan & Bruno', 0, 82);
  ctx.restore();
}

export function drawWhiteboard(ctx, w, h) {
  const rand = seeded(5);
  ctx.fillStyle = '#f7f8fa';
  ctx.fillRect(0, 0, w, h);
  // restos de marcador apagado
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(40,60,120,${0.02 + rand() * 0.03})`;
    ctx.fillRect(rand() * w, rand() * h, 120 + rand() * 360, 20 + rand() * 50);
  }
  ctx.font = '96px "Caveat Brush"';
  ctx.fillStyle = '#1f3a8a';
  ctx.fillText('SPRINT · build in public', 70, 140);
  ctx.font = '600 66px "Caveat"';
  ctx.fillStyle = '#222';
  ctx.fillText('☐ fechar as 10 mentorias', 90, 260);
  ctx.fillText('☑ registro #007 no ar', 90, 340);
  ctx.fillText('☑ transcritor (WhisperX)', 90, 420);
  ctx.fillStyle = RED;
  ctx.fillText('abrir pra todo mundo? → ainda não', 90, 500);
  ctx.fillStyle = '#1f3a8a';
  ctx.font = '82px "Caveat Brush"';
  ctx.save();
  ctx.translate(w - 380, 300);
  ctx.rotate(-0.08);
  ctx.fillText('77%', 0, 0);
  ctx.font = '600 44px "Caveat"';
  ctx.fillText('querem falar', 0, 50);
  ctx.fillText('e não conseguem', 0, 96);
  ctx.restore();
}

export function drawSlats(ctx, w, h, { bump = false } = {}) {
  ctx.fillStyle = bump ? '#808080' : '#8a8d90';
  ctx.fillRect(0, 0, w, h);
  const step = 48;
  for (let x = -h; x < w + h; x += step) {
    ctx.strokeStyle = bump ? '#202020' : '#6c6f72';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    ctx.strokeStyle = bump ? '#e0e0e0' : 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 14, 0); ctx.lineTo(x + 14 + h, h); ctx.stroke();
  }
}

export function drawNoise(ctx, w, h, base, spread, seed = 3) {
  const rand = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * spread;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function drawWood(ctx, w, h) {
  const rand = seeded(11);
  ctx.fillStyle = '#e9e4da';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(150,120,80,${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 1 + rand() * 3;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, y + Math.sin(x / 140 + i) * 6);
    ctx.stroke();
  }
}

export function drawLaptopScreen(ctx, w, h, frame = 0) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#161b22';
  ctx.fillRect(0, 0, w, 40);
  ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(24 + i * 26, 20, 8, 0, 7); ctx.fill(); });
  ctx.font = '28px monospace';
  const lines = [
    ['#8b949e', '$ git push --force main'],
    ['#ff7b72', "fatal: 'main' does not appear to be a git repo"],
    ['#8b949e', '$ git push --force origin main'],
    ['#3fb950', '✓ main -> main'],
    ['#8b949e', '$ claude'],
    ['#d2a8ff', '✻ 12 tasks criadas e divididas ✓'],
    ['#8b949e', '$ npm run build'],
  ];
  const shown = Math.min(lines.length, 3 + Math.floor(frame) % (lines.length + 3));
  lines.slice(0, shown).forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillText(t, 30, 90 + i * 46); });
  if (Math.floor(frame * 2) % 2 === 0) { ctx.fillStyle = '#c9d1d9'; ctx.fillRect(30, 90 + shown * 46 - 26, 16, 30); }
}

export function drawPhone(ctx, w, h, unread = true) {
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('23:59', w / 2, 120);
  ctx.textAlign = 'left';
  if (!unread) return;
  ctx.fillStyle = 'rgba(235,235,240,0.95)';
  ctx.beginPath(); ctx.roundRect(24, 200, w - 48, 170, 26); ctx.fill();
  ctx.fillStyle = '#25d366';
  ctx.beginPath(); ctx.roundRect(44, 222, 40, 40, 10); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Grupo 5 – Módulo 4', 98, 252);
  ctx.font = '30px sans-serif';
  ctx.fillText('já subiu pra main? 😰', 44, 320);
  ctx.fillStyle = 'rgba(235,235,240,0.95)';
  ctx.beginPath(); ctx.roundRect(24, 390, w - 48, 110, 26); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillText('CAIOOO', 44, 456);
}

export function drawBadge(ctx, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d2372b';
  ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('INTELI', 24, 50);
  ctx.fillStyle = '#111';
  ctx.font = '42px "Caveat Brush"';
  ctx.fillText('founder', 24, 150);
  ctx.font = '600 34px "Caveat"';
  ctx.fillText('Be My Mentor', 24, 200);
}

export function drawMap(ctx, w, h, project) {
  ctx.fillStyle = '#0d0a17';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.08)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.beginPath();
  BRAZIL.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(167, 139, 250, 0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 239, 227, 0.75)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.setLineDash([22, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '96px "Caveat Brush"';
  ctx.fillStyle = 'rgba(244, 239, 227, 0.85)';
  ctx.fillText('Brasil_', w * 0.66, h * 0.16);
  // bordas somem no escuro do fundo
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.52);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}
