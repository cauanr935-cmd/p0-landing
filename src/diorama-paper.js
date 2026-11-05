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

// O que já está escrito no quadro. O resto, Cauan e Bruno escrevem ao vivo
// (roteiro em BOARD_LINES, em diorama-room.js).
export function drawWhiteboard(ctx, w, h) {
  const rand = seeded(5);
  ctx.fillStyle = '#f7f8fa';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(40,60,120,${0.02 + rand() * 0.03})`;
    ctx.fillRect(rand() * w, rand() * h, 120 + rand() * 360, 20 + rand() * 50);
  }
  ctx.font = '88px "Caveat Brush"';
  ctx.fillStyle = '#1f3a8a';
  ctx.fillText('SPRINT · build in public', 60, 130);
  ctx.font = '600 60px "Caveat"';
  ctx.fillStyle = '#222';
  ctx.fillText('☑ registro #007 no ar', 80, 250);
  ctx.fillText('☑ transcritor (WhisperX)', 80, 330);
  ctx.strokeStyle = '#1f3a8a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.53, 60);
  for (let y = 60; y <= h - 60; y += 40) ctx.lineTo(w * 0.53 + (rand() - 0.5) * 6, y);
  ctx.stroke();
  ctx.font = '92px "Caveat Brush"';
  ctx.fillStyle = '#111';
  ctx.fillText('NEXT STEPS', w * 0.57, 130);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#111';
  ctx.beginPath(); ctx.moveTo(w * 0.57, 150); ctx.lineTo(w * 0.57 + 470, 156); ctx.stroke();
  ctx.font = '600 58px "Caveat"';
  ctx.fillStyle = '#111';
  ctx.fillText('• reunião', w * 0.58, 270);
  ctx.fillStyle = '#1f3a8a';
  ctx.fillText('horas complementares', w * 0.61, 336);
}

// Cauan e Bruno de costas, escrevendo no quadro, como figurinhas de papel
// em tamanho real. Desenha o corpo (sem o braço que escreve) ou só o braço.
export function drawPersonBack(ctx, w, h, who, { arm = false } = {}) {
  const look = who === 'bruno'
    ? { hood: '#263453', light: '#3a4b72', dark: '#161f35', pants: '#2b3242', hair: '#17110d', curly: true }
    : { hood: '#1d1d21', light: '#34343b', dark: '#0d0d10', pants: '#c6b28c', hair: '#1e1611', curly: false };
  const skin = '#b6865f';
  const [c, x] = makeCanvas(w, h);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  const cloth = (x0, x1) => {
    const g = x.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, look.dark);
    g.addColorStop(0.45, look.hood);
    g.addColorStop(0.8, look.light);
    g.addColorStop(1, look.hood);
    return g;
  };
  if (!arm) {
    const cx = w / 2;
    const u = h / 100;
    // pernas
    const pg = x.createLinearGradient(cx - 14 * u, 0, cx + 14 * u, 0);
    pg.addColorStop(0, look.pants);
    pg.addColorStop(1, '#00000033');
    x.fillStyle = look.pants;
    x.beginPath();
    x.moveTo(cx - 13 * u, 54 * u);
    x.quadraticCurveTo(cx - 13.5 * u, 76 * u, cx - 11.5 * u, 96 * u);
    x.lineTo(cx - 2.5 * u, 96 * u);
    x.lineTo(cx - 0.8 * u, 62 * u);
    x.lineTo(cx + 0.8 * u, 62 * u);
    x.lineTo(cx + 2.5 * u, 96 * u);
    x.lineTo(cx + 11.5 * u, 96 * u);
    x.quadraticCurveTo(cx + 13.5 * u, 76 * u, cx + 13 * u, 54 * u);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)';
    x.lineWidth = 0.5 * u;
    x.beginPath(); x.moveTo(cx, 62 * u); x.lineTo(cx, 56 * u); x.stroke();
    // tênis
    x.fillStyle = '#ecebe6';
    x.beginPath(); x.roundRect(cx - 12.5 * u, 95 * u, 10.5 * u, 4 * u, 1.5 * u); x.fill();
    x.beginPath(); x.roundRect(cx + 2 * u, 95 * u, 10.5 * u, 4 * u, 1.5 * u); x.fill();
    // braço que fica para baixo (esquerda de quem vê)
    x.fillStyle = cloth(cx - 26 * u, cx - 15 * u);
    x.beginPath();
    x.moveTo(cx - 19 * u, 22 * u);
    x.quadraticCurveTo(cx - 24 * u, 26 * u, cx - 24.5 * u, 36 * u);
    x.lineTo(cx - 24 * u, 50 * u);
    x.lineTo(cx - 18.5 * u, 50 * u);
    x.lineTo(cx - 17 * u, 34 * u);
    x.closePath();
    x.fill();
    x.fillStyle = skin;
    x.beginPath(); x.ellipse(cx - 21.3 * u, 52 * u, 2.6 * u, 3.2 * u, 0.1, 0, Math.PI * 2); x.fill();
    // tronco do moletom
    x.fillStyle = cloth(cx - 20 * u, cx + 20 * u);
    x.beginPath();
    x.moveTo(cx - 8 * u, 15.5 * u);
    x.quadraticCurveTo(cx - 19 * u, 16.5 * u, cx - 19.5 * u, 24 * u);
    x.quadraticCurveTo(cx - 18 * u, 40 * u, cx - 16 * u, 55 * u);
    x.quadraticCurveTo(cx, 57 * u, cx + 16 * u, 55 * u);
    x.quadraticCurveTo(cx + 18 * u, 40 * u, cx + 19.5 * u, 24 * u);
    x.quadraticCurveTo(cx + 19 * u, 16.5 * u, cx + 8 * u, 15.5 * u);
    x.closePath();
    x.fill();
    // barra, costuras e dobras
    x.fillStyle = look.dark;
    x.beginPath(); x.roundRect(cx - 16 * u, 51.5 * u, 32 * u, 4 * u, 1 * u); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.06)';
    x.lineWidth = 0.7 * u;
    [[-9, 30, -6, 46], [5, 28, 8, 44], [-2, 34, -1, 48]].forEach(([a, b, c2, d]) => {
      x.beginPath(); x.moveTo(cx + a * u, b * u); x.quadraticCurveTo(cx + (a + c2) / 2 * u - u, (b + d) / 2 * u, cx + c2 * u, d * u); x.stroke();
    });
    // capuz caído
    x.fillStyle = look.dark;
    x.beginPath();
    x.moveTo(cx - 10 * u, 15 * u);
    x.quadraticCurveTo(cx - 11 * u, 27 * u, cx, 29 * u);
    x.quadraticCurveTo(cx + 11 * u, 27 * u, cx + 10 * u, 15 * u);
    x.quadraticCurveTo(cx, 19 * u, cx - 10 * u, 15 * u);
    x.fill();
    x.strokeStyle = look.light;
    x.lineWidth = 0.5 * u;
    x.beginPath(); x.moveTo(cx - 8.5 * u, 17 * u); x.quadraticCurveTo(cx, 26 * u, cx + 8.5 * u, 17 * u); x.stroke();
    // pescoço, orelhas e cabelo
    x.fillStyle = skin;
    x.fillRect(cx - 3.8 * u, 11 * u, 7.6 * u, 5.5 * u);
    x.beginPath(); x.ellipse(cx - 7.3 * u, 8.2 * u, 1.5 * u, 2.3 * u, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(cx + 7.3 * u, 8.2 * u, 1.5 * u, 2.3 * u, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = look.hair;
    x.beginPath();
    x.moveTo(cx - 7.2 * u, 10.5 * u);
    x.quadraticCurveTo(cx - 8.4 * u, 0.5 * u, cx, 0.4 * u);
    x.quadraticCurveTo(cx + 8.4 * u, 0.5 * u, cx + 7.2 * u, 10.5 * u);
    x.quadraticCurveTo(cx, 13 * u, cx - 7.2 * u, 10.5 * u);
    x.fill();
    const rand = seeded(who === 'bruno' ? 44 : 45);
    if (look.curly) {
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 6.6 * u;
        x.beginPath(); x.arc(cx + Math.cos(a) * r, 4.6 * u + Math.sin(a) * r * 0.75, (1.1 + rand() * 0.7) * u, 0, Math.PI * 2); x.fill();
      }
    }
    x.strokeStyle = 'rgba(255,255,255,0.12)';
    x.lineWidth = 0.4 * u;
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      const sx = cx + (rand() - 0.5) * 9 * u;
      x.moveTo(sx, 2 * u + rand() * 3 * u);
      x.quadraticCurveTo(sx + 1.5 * u, 6 * u, sx + (rand() - 0.5) * 2 * u, 10 * u);
      x.stroke();
    }
  } else {
    // braço levantado: ombro embaixo à esquerda, cotovelo à direita, mão no alto
    const sh = [w * 0.26, h * 0.93], el = [w * 0.8, h * 0.62], hd = [w * 0.52, h * 0.2];
    const sleeve = (a, b, r0, r1) => {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      x.beginPath();
      x.moveTo(a[0] + Math.cos(ang) * r0, a[1] + Math.sin(ang) * r0);
      x.lineTo(b[0] + Math.cos(ang) * r1, b[1] + Math.sin(ang) * r1);
      x.lineTo(b[0] - Math.cos(ang) * r1, b[1] - Math.sin(ang) * r1);
      x.lineTo(a[0] - Math.cos(ang) * r0, a[1] - Math.sin(ang) * r0);
      x.closePath();
      x.fill();
      x.beginPath(); x.arc(b[0], b[1], r1, 0, Math.PI * 2); x.fill();
    };
    x.fillStyle = cloth(w * 0.2, w * 0.9);
    sleeve(sh, el, w * 0.17, w * 0.12);
    sleeve(el, [hd[0], hd[1] + h * 0.08], w * 0.12, w * 0.1);
    // punho
    x.fillStyle = look.dark;
    x.beginPath(); x.ellipse(hd[0], hd[1] + h * 0.075, w * 0.1, h * 0.025, -0.15, 0, Math.PI * 2); x.fill();
    // mão com o marcador
    x.fillStyle = skin;
    x.beginPath(); x.ellipse(hd[0] + w * 0.01, hd[1] + h * 0.02, w * 0.085, h * 0.055, -0.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#1f3a8a';
    x.save();
    x.translate(hd[0] + w * 0.06, hd[1] - h * 0.04);
    x.rotate(0.35);
    x.beginPath(); x.roundRect(-w * 0.025, -h * 0.05, w * 0.05, h * 0.09, w * 0.01); x.fill();
    x.restore();
    // dobras no cotovelo
    x.strokeStyle = 'rgba(255,255,255,0.08)';
    x.lineWidth = w * 0.012;
    x.beginPath(); x.moveTo(el[0] - w * 0.08, el[1] + h * 0.03); x.lineTo(el[0] + w * 0.02, el[1] - h * 0.02); x.stroke();
  }
  // borda branca de figurinha
  const border = Math.round(Math.max(w, h) * 0.007);
  ctx.clearRect(0, 0, w, h);
  const [m, mx] = makeCanvas(w, h);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) mx.drawImage(c, Math.cos(a) * border, Math.sin(a) * border);
  mx.globalCompositeOperation = 'source-in';
  mx.fillStyle = '#f6f3ec';
  mx.fillRect(0, 0, w, h);
  ctx.drawImage(m, 0, 0);
  ctx.drawImage(c, 0, 0);
}

// Painel acústico de ripas diagonais (feltro cinza-taupe da sala R0x do Inteli).
// O ladrilho é contínuo: 20 ripas por largura, inclinação de ~32°.
export function drawSlats(ctx, w, h, { bump = false } = {}) {
  ctx.fillStyle = bump ? '#a0a0a0' : '#8c857a';
  ctx.fillRect(0, 0, w, h);
  if (!bump) {
    const rand = seeded(21);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '40,30,20'},${rand() * 0.05})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
  }
  const step = w / 20;
  const dx = h * 1.6;
  for (let x = -dx - step * 2; x < w + step * 2; x += step) {
    for (let k = -1; k <= 1; k++) {
      const ox = x + k * w;
      ctx.strokeStyle = bump ? '#1a1a1a' : '#5f594f';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + dx, h); ctx.stroke();
      ctx.strokeStyle = bump ? '#dcdcdc' : 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ox + 10, 0); ctx.lineTo(ox + 10 + dx, h); ctx.stroke();
    }
  }
}

export function drawPlywood(ctx, w, h, seed = 13) {
  const rand = seeded(seed);
  ctx.fillStyle = '#d9b27c';
  ctx.fillRect(0, 0, w, h);
  // manchas largas do pinus
  for (let i = 0; i < 26; i++) {
    const g = ctx.createRadialGradient(rand() * w, rand() * h, 0, rand() * w, rand() * h, 80 + rand() * 240);
    g.addColorStop(0, `rgba(${rand() > 0.5 ? '190,130,70' : '240,210,160'},${0.15 + rand() * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // veios
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(150,95,45,${0.06 + rand() * 0.12})`;
    ctx.lineWidth = 1 + rand() * 3;
    let x = rand() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= h; y += 24) {
      x += Math.sin(y / (40 + rand() * 40) + i) * 3 + (rand() - 0.5) * 2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawOak(ctx, w, h) {
  const rand = seeded(17);
  ctx.fillStyle = '#d8b88a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = `rgba(${rand() > 0.6 ? '250,232,200' : '150,105,55'},${0.05 + rand() * 0.12})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 30) ctx.lineTo(x, y + Math.sin(x / (90 + i) + i) * 4 + (rand() - 0.5) * 1.5);
    ctx.stroke();
  }
}

// Carpete berinjela com rabiscos claros, como o da sala.
export function drawCarpet(ctx, w, h) {
  drawNoise(ctx, w, h, '#4b3646', 22, 4);
  const rand = seeded(8);
  ctx.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(225,205,215,${0.12 + rand() * 0.18})`;
    ctx.lineWidth = 1.5 + rand();
    let x = rand() * w, y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += 10 + rand() * 18;
      y += (rand() - 0.5) * 16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawConcrete(ctx, w, h) {
  drawNoise(ctx, w, h, '#b7b2aa', 18, 6);
  const rand = seeded(9);
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(rand() * w, rand() * h, 0, rand() * w, rand() * h, 60 + rand() * 160);
    g.addColorStop(0, `rgba(90,85,80,${rand() * 0.08})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

export function drawBrick(ctx, w, h) {
  const rand = seeded(31);
  ctx.fillStyle = '#e8e2d8';
  ctx.fillRect(0, 0, w, h);
  const bw = 64, bh = 24;
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const r = 150 + rand() * 50, g = 95 + rand() * 35, b = 70 + rand() * 30;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + off + 2, row * bh + 2, bw - 4 - rand() * 3, bh - 4 - rand() * 2);
      // cal velha por cima
      if (rand() > 0.55) {
        ctx.fillStyle = `rgba(240,235,225,${0.2 + rand() * 0.4})`;
        ctx.fillRect(x + off + rand() * 40, row * bh + rand() * 14, 10 + rand() * 30, 4 + rand() * 8);
      }
    }
  }
}

// Pontos de uma superfície perfurada (encosto das cadeiras).
export function drawPerforated(ctx, w, h) {
  ctx.fillStyle = '#e7e3da';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(70,65,60,0.55)';
  for (let y = 0.35 * h; y < 0.85 * h; y += 18) {
    for (let x = 0.12 * w + ((y / 18) % 2) * 9; x < 0.88 * w; x += 18) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Letreiro de vinil na porta de vidro (o "0" leva um ponto no meio).
export function drawDoorSign(ctx, w, h, text = 'R06') {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `500 ${h * 0.78}px "Inter", sans-serif`;
  ctx.textBaseline = 'middle';
  let x = w * 0.06;
  for (const ch of text) {
    if (ch === '0') {
      const r = h * 0.3;
      ctx.lineWidth = h * 0.075;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(x + r * 0.95, h / 2, r * 0.82, r * 1.12, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.95, h / 2, h * 0.07, 0, Math.PI * 2); ctx.fill();
      x += r * 2.15;
    } else {
      ctx.fillText(ch, x, h / 2);
      x += ctx.measureText(ch).width + h * 0.06;
    }
  }
}

export function drawRoomPlate(ctx, w, h, number = '6') {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 14); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.font = `600 ${h * 0.46}px "Inter", sans-serif`;
  ctx.fillText(number, w / 2, h * 0.52);
  ctx.font = `500 ${h * 0.1}px "Inter", sans-serif`;
  ctx.fillText(`Sala de Reunião ${number}`, w / 2, h * 0.76);
  ctx.fillStyle = '#666';
  ctx.fillText(`Meeting Room ${number}`, w / 2, h * 0.9);
}

// Tela da TV: a tela de reserva da sala, com o relógio de quem está vendo.
export function drawTvScreen(ctx, w, h, now = new Date(), room = 'REUNIAO06') {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#05060a');
  g.addColorStop(1, '#14121f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const pad = w * 0.045;
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${h * 0.085}px "Inter", sans-serif`;
  ctx.fillText(`${hh}:${mm}`, pad, pad + h * 0.08);
  ctx.font = `400 ${h * 0.038}px "Inter", sans-serif`;
  ctx.fillText(`${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`, pad, pad + h * 0.14);
  ctx.font = `700 ${h * 0.05}px "Inter", sans-serif`;
  ctx.fillText(room, pad, pad + h * 0.215);
  // reserva da sala: Be My Mentor
  ctx.textAlign = 'center';
  ctx.font = `300 ${h * 0.12}px "Inter", sans-serif`;
  ctx.fillStyle = '#e9e6f5';
  ctx.fillText('reservada', w / 2, h * 0.52);
  ctx.font = `400 ${h * 0.05}px "Caveat Brush", cursive`;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('Be My Mentor · build in public', w / 2, h * 0.62);
  ctx.textAlign = 'left';
  const labels = ['Conferência sem fio', 'Espelhamento de tela', 'Windows com Miracast'];
  const bw = (w - pad * 2 - 40) / 3;
  labels.forEach((l, i) => {
    const x = pad + i * (bw + 20);
    ctx.fillStyle = 'rgba(150, 205, 245, 0.92)';
    ctx.beginPath(); ctx.roundRect(x, h * 0.8, bw, h * 0.11, 8); ctx.fill();
    ctx.fillStyle = '#0d2233';
    ctx.font = `500 ${h * 0.03}px "Inter", sans-serif`;
    ctx.fillText('▢ ' + l, x + 12, h * 0.8 + h * 0.06);
  });
}

// Piso tátil (faixa de alerta em frente à porta).
export function drawTactile(ctx, w, h) {
  ctx.fillStyle = '#8f9196';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6c6e73';
  for (let y = 10; y < h; y += 22) {
    for (let x = 10; x < w; x += 22) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
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
