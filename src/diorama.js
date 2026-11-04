// Home 3D: a mesa do Inteli em papel, o diário de bordo que abre e vira
// página conforme o scroll, e o afastamento final até o mapa do Brasil.
import * as THREE from 'three';
import '@fontsource/caveat-brush/latin.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-700.css';
import { pages, chapters, BRAZIL, CITIES } from './diorama-content.js';

const canvas = document.getElementById('scene');
const stage = document.getElementById('stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

if (!webglOk() || reduceMotion) {
  document.documentElement.classList.add('no-3d');
} else {
  document.fonts.load('64px "Caveat Brush"').then(() => document.fonts.load('40px "Caveat"')).finally(start);
}

// ── Helpers de textura (tudo desenhado em canvas: papel, quadro, telas) ──

const PAPER = '#f4efe3';
const INK = '#1d2a5a';
const RED = '#d2372b';
const GREEN = '#1f8a4c';
const GRID = 'rgba(70, 120, 190, 0.22)';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
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

function graphPaper(ctx, w, h, { margin = true } = {}) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // fibras leves
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,100,60,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.2;
  const step = 32;
  for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  if (margin) {
    ctx.strokeStyle = 'rgba(210, 55, 43, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(96, h); ctx.stroke();
  }
}

// Desenha uma página do diário a partir de um bloco de conteúdo.
function drawPage(ctx, w, h, page, state = {}) {
  graphPaper(ctx, w, h, { margin: page.side === 'left' });
  const x0 = page.side === 'left' ? 128 : 64;
  const maxW = w - x0 - 64;
  let y = page.top || 120;

  if (page.kicker) {
    ctx.fillStyle = RED;
    ctx.font = '54px "Caveat Brush"';
    ctx.fillText(page.kicker, x0, y);
    y += 86;
  }
  if (page.title) {
    ctx.fillStyle = INK;
    ctx.font = '96px "Caveat Brush"';
    wrap(ctx, page.title, maxW).forEach((l) => { ctx.fillText(l, x0, y); y += 96; });
    // três tracinhos de destaque, como nos títulos do canal
    ctx.strokeStyle = RED;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x0 + i * 26, y - 30); ctx.lineTo(x0 + i * 26 + 16, y - 46); ctx.stroke();
    }
    y += 30;
  }
  (page.lines || []).forEach((l) => {
    ctx.font = '600 58px "Caveat"';
    ctx.fillStyle = INK;
    wrap(ctx, l, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 64; });
    y += 18;
  });

  if (page.erro) {
    y += 10;
    ctx.font = '52px "Caveat Brush"';
    ctx.fillStyle = RED;
    ctx.fillText('✗ errou', x0, y);
    y += 62;
    ctx.font = '600 54px "Caveat"';
    wrap(ctx, page.erro, maxW).forEach((ln) => {
      ctx.fillText(ln, x0, y);
      const lw = ctx.measureText(ln).width;
      ctx.strokeStyle = RED; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0 - 4, y - 14); ctx.lineTo(x0 + lw + 4, y - 18); ctx.stroke();
      y += 62;
    });
    y += 16;
  }
  if (page.acerto) {
    ctx.font = '52px "Caveat Brush"';
    ctx.fillStyle = GREEN;
    ctx.fillText('✓ acertou', x0, y);
    y += 62;
    ctx.font = '600 54px "Caveat"';
    const lines = wrap(ctx, page.acerto, maxW);
    const top = y - 44;
    lines.forEach((ln) => { ctx.fillText(ln, x0, y); y += 62; });
    // círculo à mão em volta do acerto
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x0 + widest / 2, top + (y - top) / 2 - 12, widest / 2 + 28, (y - top) / 2 + 10, -0.02, 0, Math.PI * 1.93);
    ctx.stroke();
    y += 20;
  }
  if (page.question) {
    ctx.font = '66px "Caveat Brush"';
    ctx.fillStyle = INK;
    wrap(ctx, page.question, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 60; });
    y += 10;
    if (state.vote) {
      // carimbo
      ctx.save();
      ctx.translate(x0 + 170, y + 70);
      ctx.rotate(-0.18);
      ctx.strokeStyle = state.vote === 'sim' ? GREEN : RED;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 7;
      ctx.strokeRect(-150, -58, 300, 116);
      ctx.font = '72px "Caveat Brush"';
      ctx.textAlign = 'center';
      ctx.fillText(state.vote === 'sim' ? '✔ ABRIRIA' : '✘ AINDA NÃO', 0, 24);
      ctx.restore();
      y += 190;
      ctx.font = '600 58px "Caveat"';
      ctx.fillStyle = INK;
      wrap(ctx, page.answer, maxW).forEach((ln) => { ctx.fillText(ln, x0, y); y += 64; });
    } else {
      ctx.font = '40px "Caveat"';
      ctx.fillStyle = 'rgba(29,42,90,0.55)';
      ctx.fillText('(carimba aí embaixo ↓)', x0, y + 20);
    }
  }
  if (page.blank) {
    ctx.font = '40px "Caveat"';
    ctx.fillStyle = 'rgba(29,42,90,0.35)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x0, y + i * 70, maxW * (0.6 + Math.random() * 0.4), 3);
    }
  }
  if (page.footer) {
    ctx.font = '36px "Caveat"';
    ctx.fillStyle = 'rgba(29,42,90,0.6)';
    ctx.fillText(page.footer, x0, h - 70);
  }
}

function drawCover(ctx, w, h) {
  ctx.fillStyle = '#1b1b22';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // etiqueta de papel rasgado
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.rotate(-0.04);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  const lw = w * 0.74, lh = 260;
  ctx.moveTo(-lw / 2, -lh / 2);
  for (let x = -lw / 2; x <= lw / 2; x += 18) ctx.lineTo(x, -lh / 2 + Math.random() * 10);
  for (let x = lw / 2; x >= -lw / 2; x -= 18) ctx.lineTo(x, lh / 2 - Math.random() * 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = '96px "Caveat Brush"';
  ctx.fillText('diário de bordo_', 0, -10);
  ctx.font = '52px "Caveat"';
  ctx.fillText('Be My Mentor · Cauan & Bruno', 0, 70);
  ctx.restore();
}

function drawWhiteboard(ctx, w, h) {
  ctx.fillStyle = '#f8f9fb';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let i = 0; i < 12; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 200 + Math.random() * 300, 30 + Math.random() * 60);
  ctx.font = '90px "Caveat Brush"';
  ctx.fillStyle = '#1f3a8a';
  ctx.fillText('SPRINT · build in public', 70, 140);
  ctx.font = '64px "Caveat"';
  ctx.fillStyle = '#222';
  ctx.fillText('☐ fechar as mentorias da semana', 90, 260);
  ctx.fillText('☑ registro #007 no ar', 90, 340);
  ctx.fillStyle = RED;
  ctx.fillText('abrir pra todo mundo? → ainda não', 90, 420);
  ctx.fillStyle = '#222';
  ctx.fillText('#ApoioBruno', w - 420, h - 80);
}

function drawSlats(ctx, w, h) {
  ctx.fillStyle = '#8a8d90';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#6f7275';
  ctx.lineWidth = 10;
  for (let x = -h; x < w + h; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  for (let x = -h + 14; x < w + h; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
  }
}

function drawLaptopScreen(ctx, w, h) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '30px monospace';
  const lines = [
    ['#8b949e', '$ git push --force main'],
    ['#ff7b72', "fatal: 'main' does not appear to be a git repository"],
    ['#8b949e', '$ git push --force origin main'],
    ['#3fb950', '✓ main -> main'],
    ['#8b949e', '$ claude'],
    ['#d2a8ff', '✻ 12 tasks criadas e divididas ✓'],
  ];
  lines.forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillText(t, 30, 60 + i * 50); });
}

function drawPhone(ctx, w, h) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e9e9ee';
  ctx.beginPath(); ctx.roundRect(24, 120, w - 48, 150, 24); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Grupo 5 – Módulo 4', 50, 170);
  ctx.font = '30px sans-serif';
  ctx.fillText('já subiu pra main? 😰', 50, 230);
  ctx.fillStyle = '#e9e9ee';
  ctx.beginPath(); ctx.roundRect(24, 290, w - 48, 110, 24); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillText('CAIOOO', 50, 360);
}

function drawMap(ctx, w, h, project) {
  // Mapa "à noite": papel escuro, contorno a giz, para as mesas acenderem.
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
}

// ── Ponto dentro do polígono (para espalhar mesas pelo mapa) ──
function inside([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// ── Cena ──
function start() {
  const isSmall = () => window.innerWidth / window.innerHeight < 0.8;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !isSmall();
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07050d');
  scene.fog = new THREE.Fog('#07050d', 9, 26);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 400);

  // Luz: um "spot" quente sobre a mesa, preenchimento frio e a luminária de LED.
  scene.add(new THREE.HemisphereLight('#cfd6ff', '#2a2233', 0.55));
  const key = new THREE.SpotLight('#fff1dc', 26, 14, Math.PI / 5, 0.55, 1.4);
  key.position.set(1.2, 4.2, 1.8);
  key.target.position.set(0, 0.75, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#b9c4ff', 0.5);
  fill.position.set(-3, 3, 2);
  scene.add(fill);

  const room = new THREE.Group();
  scene.add(room);

  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

  // Chão e paredes
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), std('#3b3a40'));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const [slatsC, slatsX] = makeCanvas(1024, 512);
  drawSlats(slatsX, 1024, 512);
  const slatsT = tex(slatsC, renderer);
  slatsT.wrapS = slatsT.wrapT = THREE.RepeatWrapping;
  slatsT.repeat.set(3, 1.2);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), std('#ffffff', { map: slatsT }));
  backWall.position.set(0, 1.5, -2.2);
  backWall.receiveShadow = true;
  room.add(backWall);

  const [wbC, wbX] = makeCanvas(1600, 900);
  drawWhiteboard(wbX, 1600, 900);
  const whiteboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.24, 0.03),
    [std('#dfe2e6'), std('#dfe2e6'), std('#dfe2e6'), std('#dfe2e6'), std('#ffffff', { map: tex(wbC, renderer), roughness: 0.35 }), std('#dfe2e6')],
  );
  whiteboard.position.set(-0.4, 1.6, -2.17);
  room.add(whiteboard);

  // Divisória de vidro escuro com perfil preto (lado esquerdo)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3),
    new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.85 }),
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-3.2, 1.5, 0);
  room.add(glass);
  for (let z = -2.2; z <= 2.2; z += 1.1) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3, 0.04), std('#0b0b0d'));
    frame.position.set(-3.18, 1.5, z);
    room.add(frame);
  }

  // Luminária linear de LED no teto
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  led.position.set(0.9, 2.95, -0.2);
  room.add(led);

  // TV na parede direita, tocando a visão da rede
  const tvVideo = document.createElement('video');
  Object.assign(tvVideo, { src: '/previews/visao-rede.mp4', muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous' });
  const tvTex = new THREE.VideoTexture(tvVideo);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const tv = new THREE.Group();
  tv.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.76, 0.05), std('#0a0a0a', { roughness: 0.3 })));
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.7), new THREE.MeshBasicMaterial({ map: tvTex }));
  tvScreen.position.z = 0.027;
  tv.add(tvScreen);
  tv.rotation.y = -Math.PI / 2;
  tv.position.set(3.3, 1.75, -0.6);
  room.add(tv);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3), std('#d9d7d2'));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.35, 1.5, 0);
  room.add(rightWall);

  // Mesa: tampo claro, pés pretos
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.0), std('#e8e4dc', { roughness: 0.6 }));
  top.position.y = 0.75;
  top.castShadow = top.receiveShadow = true;
  table.add(top);
  [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.73, 0.035), std('#111'));
    leg.position.set(x, 0.365, z);
    leg.castShadow = true;
    table.add(leg);
  });
  room.add(table);

  // Cadeiras de tecido cinza-esverdeado com estrutura preta
  function chair(x, z, ry) {
    const g = new THREE.Group();
    const fabric = std('#7f8c84', { roughness: 1 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.44), fabric);
    seat.position.y = 0.46;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.05), fabric);
    back.position.set(0, 0.7, -0.21);
    [seat, back].forEach((m) => { m.castShadow = true; g.add(m); });
    [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]].forEach(([lx, lz]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44), std('#0d0d0d'));
      l.position.set(lx, 0.22, lz);
      g.add(l);
    });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    room.add(g);
  }
  chair(-0.45, 0.78, Math.PI);
  chair(0.45, 0.82, Math.PI + 0.12);
  chair(0.1, -0.8, 0.05);

  const onTable = 0.77;

  // Notebook com o terminal do EP 01
  const [lsC, lsX] = makeCanvas(1024, 640);
  drawLaptopScreen(lsX, 1024, 640);
  const laptop = new THREE.Group();
  const lbase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.24), std('#9aa0a6', { metalness: 0.6, roughness: 0.35 }));
  lbase.castShadow = true;
  const lid = new THREE.Group();
  const lidBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.01), std('#9aa0a6', { metalness: 0.6, roughness: 0.35 }));
  lidBox.position.y = 0.11;
  const lscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ map: tex(lsC, renderer) }));
  lscreen.position.set(0, 0.11, 0.0055);
  lid.add(lidBox, lscreen);
  lid.position.set(0, 0.008, -0.12);
  lid.rotation.x = -0.32;
  laptop.add(lbase, lid);
  laptop.position.set(0.58, onTable + 0.008, -0.12);
  laptop.rotation.y = -0.5;
  room.add(laptop);

  // Caneca
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 24), std('#7c3aed', { roughness: 0.4 }));
  mug.position.set(-0.62, onTable + 0.05, 0.12);
  mug.castShadow = true;
  room.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16), std('#7c3aed', { roughness: 0.4 }));
  handle.position.set(-0.575, onTable + 0.055, 0.12);
  handle.rotation.y = Math.PI / 2;
  room.add(handle);

  // Celular com o "já subiu pra main?"
  const [phC, phX] = makeCanvas(400, 800);
  drawPhone(phX, 400, 800);
  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.008, 0.15),
    [std('#111'), std('#111'), new THREE.MeshBasicMaterial({ map: tex(phC, renderer) }), std('#111'), std('#111'), std('#111')],
  );
  phone.position.set(-0.55, onTable + 0.004, -0.2);
  phone.rotation.y = 0.35;
  phone.castShadow = true;
  room.add(phone);

  // ── O diário (caderno) ──
  const PW = 0.21, PH = 0.29; // página A5-ish, em metros
  const book = new THREE.Group();
  book.position.set(0, onTable + 0.01, 0.12);
  room.add(book);

  const PX = 1024, PY = 1414;
  function pageTexture(page, state) {
    const [c, x] = makeCanvas(PX, PY);
    drawPage(x, PX, PY, page, state);
    return tex(c, renderer);
  }

  const PAGE_TINT = '#e6e0d2';
  const leftMat = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95 });
  const rightMat = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95 });
  const pageGeo = new THREE.PlaneGeometry(PW, PH);
  const leftPage = new THREE.Mesh(pageGeo, leftMat);
  leftPage.rotation.x = -Math.PI / 2;
  leftPage.position.set(-PW / 2, 0.012, 0);
  const rightPage = new THREE.Mesh(pageGeo, rightMat);
  rightPage.rotation.x = -Math.PI / 2;
  rightPage.position.set(PW / 2, 0.012, 0);
  leftPage.receiveShadow = rightPage.receiveShadow = true;
  book.add(leftPage, rightPage);
  // bloco de folhas e contracapa
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.01, 0.012, PH + 0.006), std('#efe9da'));
  block.position.y = 0.005;
  block.castShadow = true;
  book.add(block);
  // espiral
  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0016, 6, 14), std('#b8bcc4', { metalness: 0.8, roughness: 0.3 }));
    ring.position.set(0, 0.014, -PH / 2 + 0.015 + i * ((PH - 0.03) / 13));
    ring.rotation.y = Math.PI / 2;
    book.add(ring);
  }

  // Folha que vira: plano com segmentos, curvado ao girar na espiral.
  const leafGeo = new THREE.PlaneGeometry(PW, PH, 24, 1);
  leafGeo.translate(PW / 2, 0, 0);
  const leafBase = leafGeo.attributes.position.array.slice();
  const leafFront = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95, side: THREE.FrontSide });
  const leafBack = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95, side: THREE.BackSide });
  const leaf = new THREE.Group();
  const leafA = new THREE.Mesh(leafGeo, leafFront);
  const leafB = new THREE.Mesh(leafGeo, leafBack);
  leafA.castShadow = true;
  leaf.add(leafA, leafB);
  leaf.rotation.x = -Math.PI / 2;
  leaf.position.y = 0.016;
  leaf.visible = false;
  book.add(leaf);

  // Verso da folha precisa ser espelhado (é lido do outro lado)
  function mirrored(t) {
    const m = t.clone();
    m.wrapS = THREE.RepeatWrapping;
    m.repeat.x = -1;
    m.needsUpdate = true;
    return m;
  }

  // Capa (abre como a primeira folha)
  const [cvC, cvX] = makeCanvas(PX, PY);
  drawCover(cvX, PX, PY);
  const coverTex = tex(cvC, renderer);
  const coverInside = new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 1, side: THREE.BackSide });
  const coverGeo = new THREE.PlaneGeometry(PW + 0.006, PH + 0.006, 1, 1);
  coverGeo.translate(PW / 2, 0, 0);
  const cover = new THREE.Group();
  cover.add(new THREE.Mesh(coverGeo, new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.7 })));
  cover.add(new THREE.Mesh(coverGeo, coverInside));
  cover.children[0].castShadow = true;
  cover.rotation.x = -Math.PI / 2;
  cover.position.y = 0.019;
  book.add(cover);

  // Texturas de cada capítulo (lado esquerdo e direito)
  const spreadTex = chapters.map((ch) => {
    const left = pageTexture(pages[ch.left]);
    return { left, leftBack: mirrored(left), right: pageTexture(pages[ch.right]) };
  });
  const voteState = {};
  function redrawVote() {
    const i = chapters.findIndex((c) => c.vote);
    if (i < 0) return;
    spreadTex[i].left.dispose();
    spreadTex[i].leftBack.dispose();
    spreadTex[i].left = pageTexture(pages[chapters[i].left], voteState);
    spreadTex[i].leftBack = mirrored(spreadTex[i].left);
    applySpread(currentSpread, true);
  }

  // Polaroids (foto ou vídeo) coladas na página da direita
  const loader = new THREE.TextureLoader();
  const videos = [];
  const polaroids = chapters.map((ch) => {
    if (!ch.media) return null;
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.002, 0.175), std('#fbfbf7', { roughness: 0.9 }));
    frame.castShadow = true;
    g.add(frame);
    let map;
    if (ch.media.video) {
      const v = document.createElement('video');
      Object.assign(v, { src: ch.media.video, muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
      videos.push(v);
      map = new THREE.VideoTexture(v);
      g.userData.video = v;
    } else {
      map = loader.load(ch.media.image);
    }
    map.colorSpace = THREE.SRGBColorSpace;
    const aspect = ch.media.aspect || 1;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13 / aspect), new THREE.MeshBasicMaterial({ map }));
    photo.rotation.x = -Math.PI / 2;
    photo.position.set(0, 0.0012, -0.012);
    g.add(photo);
    // fita adesiva
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.018), new THREE.MeshStandardMaterial({ color: '#efe6b0', transparent: true, opacity: 0.75 }));
    tape.rotation.x = -Math.PI / 2;
    tape.rotation.z = 0.25;
    tape.position.set(0.045, 0.0016, -0.086);
    g.add(tape);
    g.position.set(PW / 2 + (ch.media.x || 0), 0.016, ch.media.z || 0.02);
    g.rotation.y = ch.media.tilt || -0.05;
    g.visible = false;
    book.add(g);
    return g;
  });

  let currentSpread = -1;
  function applySpread(i, force) {
    if (i === currentSpread && !force) return;
    currentSpread = i;
    if (i < 0) return;
    leftMat.map = spreadTex[i].left;
    rightMat.map = spreadTex[i].right;
    leftMat.needsUpdate = rightMat.needsUpdate = true;
  }

  // ── Figurinhas de papel (Cauan e Bruno) ──
  function standee(src, height, x, z, ry) {
    const g = new THREE.Group();
    const t = loader.load(src, (texture) => {
      const a = texture.image.width / texture.image.height;
      plane.scale.set(height * a, height, 1);
      back.scale.copy(plane.scale);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const plane = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.9, side: THREE.FrontSide }));
    plane.castShadow = true;
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f4f1ea', alphaMap: t, alphaTest: 0.5, side: THREE.BackSide }));
    // dobra de papel que segura a figurinha em pé
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.002, 0.05), std('#f4f1ea'));
    fold.position.set(0, 0.001, 0.02);
    fold.castShadow = true;
    g.add(plane, back, fold);
    g.position.set(x, onTable, z);
    g.rotation.y = ry;
    g.userData.baseRy = ry;
    room.add(g);
    return g;
  }
  const cauan = standee('/scene/cauan.png', 0.3, -0.36, -0.2, 0.25);
  const bruno = standee('/scene/bruno.png', 0.28, 0.34, -0.3, -0.3);

  // ── Mapa do Brasil (afastamento final) ──
  const MAP_W = 60, MAP_H = 60;
  const lonMin = -75, lonMax = -33, latMin = -35, latMax = 7;
  const toMap = (lon, lat) => [((lon - lonMin) / (lonMax - lonMin) - 0.5) * MAP_W, ((latMax - lat) / (latMax - latMin) - 0.5) * MAP_H];
  const [mapC, mapX] = makeCanvas(2048, 2048);
  drawMap(mapX, 2048, 2048, (lon, lat) => [((lon - lonMin) / (lonMax - lonMin)) * 2048, ((latMax - lat) / (latMax - latMin)) * 2048]);
  const mapMat = new THREE.MeshBasicMaterial({ map: tex(mapC, renderer), transparent: true, opacity: 0, depthWrite: false });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), mapMat);
  map.rotation.x = -Math.PI / 2;
  map.position.y = -0.02;
  scene.add(map);

  // O Inteli fica em São Paulo: a sala inteira é posicionada nesse ponto do mapa.
  const [spX, spZ] = toMap(-46.72, -23.57);
  map.position.x = -spX;
  map.position.z = -spZ;

  // Mesas acendendo: capitais primeiro, depois pontos espalhados pelo país.
  const pts = CITIES.map(([lon, lat]) => [lon, lat]);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (pts.length < 420) {
    const p = [lonMin + rand() * (lonMax - lonMin), latMin + rand() * (latMax - latMin)];
    if (inside(p, BRAZIL)) pts.push(p);
  }
  const spDist = pts.map(([lon, lat]) => Math.hypot(lon + 46.72, lat + 23.57));
  const order = pts.map((_, i) => i).sort((a, b) => (a < CITIES.length ? -1 : 0) - (b < CITIES.length ? -1 : 0) || spDist[a] - spDist[b]);
  const dotGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pts.length * 3);
  const reveal = new Float32Array(pts.length);
  order.forEach((idx, rank) => {
    const [mx, mz] = toMap(pts[idx][0], pts[idx][1]);
    pos.set([mx - spX, 0.05, mz - spZ], rank * 3);
    reveal[rank] = rank / pts.length;
  });
  dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dotGeo.setAttribute('reveal', new THREE.BufferAttribute(reveal, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uProgress: { value: 0 }, uSize: { value: 20 * renderer.getPixelRatio() } },
    vertexShader: `
      attribute float reveal; uniform float uProgress; uniform float uSize; varying float vOn;
      void main(){
        vOn = smoothstep(reveal, reveal + 0.04, uProgress);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = uSize * vOn * (60.0 / -mv.z) * (1.0 + 1.5 * (1.0 - smoothstep(0.0, 0.08, reveal)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vOn;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.22, 0.0, d);
        float glow = smoothstep(0.5, 0.0, d) * 0.45;
        vec3 c = mix(vec3(1.0,0.72,0.35), vec3(1.0,0.97,0.85), core);
        gl_FragColor = vec4(c, (core + glow) * vOn);
      }`,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  scene.add(dots);

  // ── Roteiro de câmera (posição, alvo) por trecho do scroll ──
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bookC = V(0, onTable, 0.12);
  function bookShot(side = 0) {
    // de cima, levemente inclinado; no celular foca uma página por vez
    const aspect = window.innerWidth / window.innerHeight;
    const small = aspect < 0.8;
    const w = small ? PW * 1.1 : PW * 2.12;
    const h = small ? PH * 1.2 : PH * 1.16;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max(h / (2 * Math.tan(vfov / 2)), w / (2 * Math.tan(vfov / 2) * aspect));
    const tx = small ? side * (PW / 2) : 0;
    return {
      pos: V(tx, bookC.y + dist * 0.96, bookC.z + dist * 0.28),
      look: V(tx, bookC.y, bookC.z - 0.005),
    };
  }

  // Brasil inteiro na tela, com folga (o Inteli fica na origem).
  function mapShot() {
    const aspect = window.innerWidth / window.innerHeight;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const d = Math.max(70 / (2 * Math.tan(vfov / 2)), 64 / (2 * Math.tan(vfov / 2) * aspect));
    return { pos: V(-12, d, -14 + d * 0.1), look: V(-12, 0, -14) };
  }

  // Cada passo: [fim do trecho (0..1), câmera]
  function shots() {
    const L = bookShot(-1), R = bookShot(1), C = bookShot(0);
    // tela estreita: as tomadas da sala recuam para caber a mesa inteira
    const far = (shot, k) => {
      if (window.innerWidth / window.innerHeight >= 0.8) return shot;
      return { pos: shot.look.clone().add(shot.pos.clone().sub(shot.look).multiplyScalar(k)), look: shot.look };
    };
    return [
      [0.0, far({ pos: V(2.6, 1.85, 3.2), look: V(-0.2, 1.05, -0.8) }, 1.35)],
      [0.08, far({ pos: V(2.2, 1.6, 2.6), look: V(-0.2, 1.0, -0.6) }, 1.35)],
      [0.17, far({ pos: V(0.55, 1.18, 0.95), look: V(0, onTable + 0.08, -0.1) }, 1.7)],
      [0.24, C],
      [0.27, L], [0.33, R],
      [0.38, L], [0.46, R],
      [0.51, L], [0.59, R],
      [0.64, L], [0.74, L],
      [0.79, L], [0.83, R],
      [0.86, C],
      [0.92, { pos: V(0, 7, 3.5), look: V(0, 0, 0) }],
      [1.0, mapShot()],
    ];
  }
  let SHOTS = shots();

  const ease = (t) => t * t * (3 - 2 * t);
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function cameraAt(t) {
    for (let i = 1; i < SHOTS.length; i++) {
      const [t1, b] = SHOTS[i];
      const [t0, a] = SHOTS[i - 1];
      if (t <= t1) {
        const k = ease((t - t0) / Math.max(t1 - t0, 1e-6));
        tmpP.lerpVectors(a.pos, b.pos, k);
        tmpL.lerpVectors(a.look, b.look, k);
        return;
      }
    }
    const last = SHOTS[SHOTS.length - 1][1];
    tmpP.copy(last.pos);
    tmpL.copy(last.look);
  }

  // Páginas: capa abre e folhas viram em trechos fixos do scroll.
  const COVER = [0.18, 0.24];
  const FLIPS = [[0.33, 0.38], [0.46, 0.51], [0.59, 0.64], [0.74, 0.79]];
  const seg = (t, [a, b]) => Math.min(1, Math.max(0, (t - a) / (b - a)));

  function bendLeaf(p) {
    const arr = leafGeo.attributes.position.array;
    const lift = Math.sin(Math.PI * p) * 0.05;
    for (let i = 0; i < arr.length; i += 3) {
      const x = leafBase[i];
      const u = x / PW;
      arr[i] = x;
      arr[i + 2] = leafBase[i + 2] + Math.sin(Math.PI * u) * lift * (1 - u * 0.4);
    }
    leafGeo.attributes.position.needsUpdate = true;
    leafGeo.computeVertexNormals();
  }

  function updateBook(t) {
    // capa
    const c = ease(seg(t, COVER));
    cover.rotation.set(-Math.PI / 2, -Math.PI * c, 0);
    cover.visible = c < 0.999;

    // qual capítulo está aberto e se há uma folha virando
    let base = 0;
    let flipping = -1;
    let p = 0;
    FLIPS.forEach((f, i) => {
      if (t >= f[1]) base = i + 1;
      else if (t > f[0]) { flipping = i; p = ease(seg(t, f)); }
    });

    if (flipping >= 0) {
      // embaixo: esquerda atual, direita do próximo; a folha leva a direita atual
      leftMat.map = spreadTex[flipping].left;
      rightMat.map = spreadTex[flipping + 1].right;
      leftMat.needsUpdate = rightMat.needsUpdate = true;
      leafFront.map = spreadTex[flipping].right;
      leafBack.map = spreadTex[flipping + 1].leftBack;
      leafFront.needsUpdate = leafBack.needsUpdate = true;
      leaf.visible = true;
      // gira em volta da espiral (eixo local y): a borda direita sobe e passa para a esquerda
      leaf.rotation.set(-Math.PI / 2, -Math.PI * p, 0);
      bendLeaf(p);
      currentSpread = -2;
    } else {
      leaf.visible = false;
      applySpread(base);
    }

    const open = c > 0.5;
    const visibleSpread = flipping >= 0 ? -1 : base;
    polaroids.forEach((g, i) => {
      if (!g) return;
      const show = open && i === visibleSpread;
      g.visible = show;
      if (g.userData.video) {
        if (show && g.userData.video.paused) g.userData.video.play().catch(() => {});
        if (!show && !g.userData.video.paused) g.userData.video.pause();
      }
    });
    return { base, flipping, open };
  }

  // ── Sobreposições HTML (legendas, voto e newsletter) ──
  const captions = Array.from(document.querySelectorAll('[data-from]'));
  const progressBar = document.getElementById('progress');
  function updateOverlays(t, book) {
    captions.forEach((el) => {
      const on = t >= Number(el.dataset.from) && t < Number(el.dataset.to);
      el.classList.toggle('is-on', on);
    });
    progressBar.style.transform = `scaleX(${t})`;
    document.documentElement.dataset.spread = book.flipping >= 0 ? '' : String(book.base);
  }

  document.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      voteState.vote = btn.dataset.vote;
      try { localStorage.setItem('bmm-vote-007', voteState.vote); } catch { /* sem storage */ }
      redrawVote();
      document.documentElement.classList.add('voted');
    });
  });
  try {
    const saved = localStorage.getItem('bmm-vote-007');
    if (saved) {
      voteState.vote = saved;
      document.documentElement.classList.add('voted');
    }
  } catch { /* sem storage */ }
  if (voteState.vote) {
    const i = chapters.findIndex((c) => c.vote);
    spreadTex[i].left = pageTexture(pages[chapters[i].left], voteState);
    spreadTex[i].leftBack = mirrored(spreadTex[i].left);
  }

  // ── Interação: figurinhas viram para o cursor ──
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ── Loop ──
  let target = 0, current = 0;
  function scrollProgress() {
    const max = stage.offsetHeight - window.innerHeight;
    const y = Math.min(Math.max(window.scrollY - stage.offsetTop, 0), max);
    return max > 0 ? y / max : 0;
  }
  window.addEventListener('scroll', () => { target = scrollProgress(); }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 40;
    camera.updateProjectionMatrix();
    SHOTS = shots();
    renderer.shadowMap.enabled = !isSmall();
  }
  window.addEventListener('resize', resize);
  resize();
  target = current = scrollProgress();

  const clock = new THREE.Clock();
  tvVideo.play().catch(() => {});

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    current += (target - current) * (1 - Math.pow(0.0008, dt));
    if (Math.abs(target - current) < 0.0004) current = target;
    const t = current;

    cameraAt(t);
    camera.position.copy(tmpP);
    camera.lookAt(tmpL);

    const book = updateBook(t);
    updateOverlays(t, book);

    // figurinhas: balanço de papel + olhar para o cursor
    [cauan, bruno].forEach((s, i) => {
      s.rotation.y = s.userData.baseRy + Math.sin(time * 1.3 + i * 2) * 0.05 + pointer.x * 0.25;
      s.rotation.z = Math.sin(time * 1.7 + i) * 0.015;
    });

    // afastamento: a sala encolhe até virar um ponto em São Paulo
    const pull = seg(t, [0.86, 1.0]);
    const s = 1 - ease(Math.min(1, pull * 1.25)) * 0.985;
    room.scale.setScalar(s);
    key.intensity = 26 * s * s + 2;
    mapMat.opacity = ease(seg(t, [0.88, 0.95]));
    dotMat.uniforms.uProgress.value = ease(seg(t, [0.9, 1.0])) * 1.04;
    scene.fog.near = 9 + pull * 120;
    scene.fog.far = 26 + pull * 200;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  document.documentElement.classList.add('has-3d');
  requestAnimationFrame(frame);
}
