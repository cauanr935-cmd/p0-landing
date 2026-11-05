// Home 3D: a mesa do Inteli em papel, o diário de bordo que abre e vira
// página conforme o scroll, e o afastamento final até o mapa do Brasil.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import '@fontsource/caveat-brush/latin.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import { chapters, BRAZIL, CITIES } from './diorama-content.js';
import * as paper from './diorama-paper.js';
import * as sfx from './diorama-audio.js';

const canvas = document.getElementById('scene');
const stage = document.getElementById('stage');
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
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
  Promise.all([
    document.fonts.load('64px "Caveat Brush"'),
    document.fonts.load('600 40px "Caveat"'),
  ]).catch(() => {}).finally(start);
}

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, [a, b]) => clamp01((t - a) / (b - a));

// ── Linha do tempo do scroll (0..1), calculada a partir dos capítulos ──
function buildTimeline() {
  const N = chapters.length;
  const intro = { wide: [0, 0.065], table: [0.075, 0.16] };
  const cover = [0.165, 0.215];
  const bookStart = 0.215, bookEnd = 0.875;
  const H = (bookEnd - bookStart) / (N + (N - 1) * 0.3);
  const F = H * 0.3;
  const holds = [], flips = [];
  let t = bookStart;
  for (let i = 0; i < N; i++) {
    holds.push([t, t + H]);
    t += H;
    if (i < N - 1) { flips.push([t, t + F]); t += F; }
  }
  return { intro, cover, holds, flips, H, pull: [bookEnd, 1] };
}
const TL = buildTimeline();

// ── Cena ──
function start() {
  const isNarrow = () => window.innerWidth / window.innerHeight < 0.8;
  let quality = isNarrow() ? 'low' : 'high';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.75 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = quality === 'high';
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const manager = new THREE.LoadingManager();
  const shownAt = performance.now();
  manager.onProgress = (_url, done, total) => { loaderBar.style.transform = `scaleX(${done / total})`; };
  manager.onLoad = () => {
    const wait = Math.max(0, 700 - (performance.now() - shownAt));
    setTimeout(() => loader.classList.add('is-done'), wait);
  };
  const texLoader = new THREE.TextureLoader(manager);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07050d');
  scene.fog = new THREE.Fog('#07050d', 8, 24);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 400);

  const canvasTex = (c, opts = {}) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // Luz: spot quente sobre a mesa, preenchimento frio, LED no teto.
  scene.add(new THREE.HemisphereLight('#cfd6ff', '#2a2233', 0.45));
  const key = new THREE.SpotLight('#ffecd2', 24, 14, Math.PI / 5.2, 0.6, 1.4);
  key.position.set(1.0, 4.2, 1.6);
  key.target.position.set(0, 0.75, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#aeb9ff', 0.45);
  fill.position.set(-3, 3, 2);
  scene.add(fill);
  const tvGlow = new THREE.PointLight('#8f7bff', 0.8, 3, 2);
  tvGlow.position.set(3.0, 1.75, -0.6);
  scene.add(tvGlow);

  const room = new THREE.Group();
  scene.add(room);
  const interactive = [];
  function clickable(obj, label, onClick) {
    obj.traverse((o) => { o.userData.target = obj; });
    obj.userData.hover = { label, onClick };
    interactive.push(obj);
  }

  // ── Sala ──
  const [carpetC, carpetX] = paper.makeCanvas(512, 512);
  paper.drawNoise(carpetX, 512, 512, '#3a3a42', 26, 4);
  const carpet = canvasTex(carpetC);
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping;
  carpet.repeat.set(6, 5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), std('#ffffff', { map: carpet, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const [slatsC, slatsX] = paper.makeCanvas(1024, 512);
  paper.drawSlats(slatsX, 1024, 512);
  const [slatsBC, slatsBX] = paper.makeCanvas(1024, 512);
  paper.drawSlats(slatsBX, 1024, 512, { bump: true });
  const slats = canvasTex(slatsC);
  const slatsBump = canvasTex(slatsBC, { linear: true });
  [slats, slatsBump].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.3); });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), std('#ffffff', { map: slats, bumpMap: slatsBump, bumpScale: 2.2 }));
  backWall.position.set(0, 1.5, -2.2);
  backWall.receiveShadow = true;
  room.add(backWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3), std('#cfccc6'));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.35, 1.5, 0);
  room.add(rightWall);

  const [wbC, wbX] = paper.makeCanvas(1600, 900);
  paper.drawWhiteboard(wbX, 1600, 900);
  const boardFace = std('#ffffff', { map: canvasTex(wbC), roughness: 0.25, metalness: 0.05 });
  const boardEdge = std('#d9dce0', { metalness: 0.4, roughness: 0.4 });
  const whiteboard = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.24, 0.03, 4, 0.02), [boardEdge, boardEdge, boardEdge, boardEdge, boardFace, boardEdge]);
  whiteboard.position.set(-0.4, 1.6, -2.17);
  room.add(whiteboard);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.025, 0.06), boardEdge);
  tray.position.set(-0.4, 0.97, -2.13);
  room.add(tray);
  ['#1f3a8a', '#d2372b', '#111'].forEach((c, i) => {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.13, 10), std(c, { roughness: 0.4 }));
    marker.rotation.z = Math.PI / 2;
    marker.position.set(-0.75 + i * 0.16, 0.995, -2.12);
    room.add(marker);
  });
  clickable(whiteboard, 'o quadro da sprint', () => bubbleAt(whiteboard, 'Tudo que tá no quadro saiu de um registro. #ApoioBruno'));

  // Divisória de vidro escuro com perfil preto
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3),
    new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.88 }),
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-3.2, 1.5, 0);
  room.add(glass);
  for (let z = -2.2; z <= 2.21; z += 1.1) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3, 0.04), std('#0b0b0d', { roughness: 0.5 }));
    frame.position.set(-3.18, 1.5, z);
    room.add(frame);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 4.4), std('#0b0b0d'));
  rail.position.set(-3.18, 1.0, 0);
  room.add(rail);

  // LED linear no teto
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  led.position.set(0.9, 2.95, -0.2);
  room.add(led);

  // TV na parede direita, tocando a visão da rede
  const tvVideo = makeVideo('/previews/visao-rede.mp4');
  const tvTex = new THREE.VideoTexture(tvVideo);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const tv = new THREE.Group();
  tv.add(new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.76, 0.05, 3, 0.01), std('#0a0a0a', { roughness: 0.25, metalness: 0.3 })));
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.7), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false }));
  tvScreen.position.z = 0.027;
  tv.add(tvScreen);
  tv.rotation.y = -Math.PI / 2;
  tv.position.set(3.3, 1.75, -0.6);
  room.add(tv);
  clickable(tv, 'a visão', () => bubbleAt(tv, 'Uma mentoria vira hora complementar. Depois, mil mentorias.'));

  // Mesa
  const [woodC, woodX] = paper.makeCanvas(1024, 512);
  paper.drawWood(woodX, 1024, 512);
  const top = shadowy(new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.04, 1.0, 3, 0.012), std('#ffffff', { map: canvasTex(woodC), roughness: 0.55 })));
  top.position.y = 0.75;
  room.add(top);
  [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]].forEach(([x, z]) => {
    const leg = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.73, 0.035), std('#111', { roughness: 0.4, metalness: 0.5 })));
    leg.position.set(x, 0.365, z);
    room.add(leg);
  });

  // Cadeiras de tecido cinza-esverdeado
  const [fabC, fabX] = paper.makeCanvas(256, 256);
  paper.drawNoise(fabX, 256, 256, '#7f8c84', 34, 9);
  const fabTex = canvasTex(fabC);
  fabTex.wrapS = fabTex.wrapT = THREE.RepeatWrapping;
  fabTex.repeat.set(3, 3);
  const fabric = std('#ffffff', { map: fabTex, roughness: 1 });
  function chair(x, z, ry) {
    const g = new THREE.Group();
    const seat = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.47, 0.08, 0.45, 3, 0.03), fabric));
    seat.position.y = 0.46;
    const back = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.47, 0.44, 0.06, 3, 0.025), fabric));
    back.position.set(0, 0.71, -0.21);
    back.rotation.x = -0.08;
    g.add(seat, back);
    [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]].forEach(([lx, lz]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.44, 8), std('#0d0d0d', { roughness: 0.4, metalness: 0.6 }));
      l.position.set(lx, 0.22, lz);
      g.add(l);
    });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    room.add(g);
  }
  chair(-0.45, 0.8, Math.PI);
  chair(0.47, 0.86, Math.PI + 0.14);
  chair(0.1, -0.82, 0.05);

  const onTable = 0.77;

  // Notebook com o terminal do EP 01 (a tela digita sozinha)
  const [lsC, lsX] = paper.makeCanvas(1024, 640);
  paper.drawLaptopScreen(lsX, 1024, 640, 0);
  const lsTex = canvasTex(lsC);
  const alu = std('#a3a8ae', { metalness: 0.75, roughness: 0.32 });
  const laptop = new THREE.Group();
  const lbase = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.016, 0.24, 2, 0.006), alu));
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.1), std('#2a2c30', { roughness: 0.6 }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, 0.0085, -0.02);
  const lid = new THREE.Group();
  const lidBox = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.01, 2, 0.004), alu));
  lidBox.position.y = 0.11;
  const lscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ map: lsTex, toneMapped: false }));
  lscreen.position.set(0, 0.11, 0.0056);
  // adesivo da BMM na tampa
  const lidSticker = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), std('#7c3aed', { roughness: 0.6 }));
  lidSticker.position.set(0.06, 0.14, -0.0056);
  lidSticker.rotation.y = Math.PI;
  lid.add(lidBox, lscreen, lidSticker);
  lid.position.set(0, 0.008, -0.12);
  lid.rotation.x = -0.32;
  laptop.add(lbase, keys, lid);
  laptop.position.set(0.6, onTable + 0.008, -0.1);
  laptop.rotation.y = -0.5;
  room.add(laptop);
  clickable(laptop, 'o terminal do EP 01', () => bubbleAt(laptop, 'EP 01 · Já subiu pra main? Era só o origin.', '/redes.html', 'ver nas redes →'));

  // Caneca roxa com vapor
  const mug = new THREE.Group();
  const mugMat = std('#7c3aed', { roughness: 0.35 });
  const mugBody = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 28, 1, true), mugMat));
  mugBody.material.side = THREE.DoubleSide;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.037, 24), std('#3b2416', { roughness: 0.2 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.035;
  const mugBottom = new THREE.Mesh(new THREE.CircleGeometry(0.036, 24), mugMat);
  mugBottom.rotation.x = -Math.PI / 2;
  mugBottom.position.y = -0.05;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 18), mugMat);
  handle.position.set(0.045, 0.005, 0);
  mug.add(mugBody, coffee, mugBottom, handle);
  mug.position.set(-0.64, onTable + 0.05, 0.14);
  room.add(mug);
  const steamTex = (() => {
    const [c, x] = paper.makeCanvas(64, 64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return canvasTex(c);
  })();
  const steam = [0, 1, 2, 3].map((i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = i / 4;
    s.scale.setScalar(0.05);
    mug.add(s);
    return s;
  });
  let steamBoost = 0;
  clickable(mug, 'café', () => { steamBoost = 1; bubbleAt(mug, 'Café nº 4 do dia. Sprint é sprint.'); });

  // Celular com "já subiu pra main?"
  const [phC, phX] = paper.makeCanvas(400, 800);
  paper.drawPhone(phX, 400, 800);
  const phTex = canvasTex(phC);
  const phoneScreen = new THREE.MeshBasicMaterial({ map: phTex, toneMapped: false });
  const phoneBody = std('#141418', { roughness: 0.3, metalness: 0.4 });
  const phone = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.009, 0.155, 2, 0.004), [phoneBody, phoneBody, phoneScreen, phoneBody, phoneBody, phoneBody]));
  phone.position.set(-0.56, onTable + 0.0045, -0.2);
  phone.rotation.y = 0.35;
  phone.userData.base = phone.position.clone();
  room.add(phone);
  let phoneShake = 0;
  clickable(phone, 'o grupo da faculdade', () => { phoneShake = 1; sfx.buzz(); bubbleAt(phone, '“já subiu pra main?” ×3 e um CAIOOO.'); });

  // Crachá do Inteli, post-its e canetas espalhados
  const [bdC, bdX] = paper.makeCanvas(320, 240);
  paper.drawBadge(bdX, 320, 240);
  const badge = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.002, 0.064), [std('#fff'), std('#fff'), std('#fff', { map: canvasTex(bdC), roughness: 0.4 }), std('#fff'), std('#fff'), std('#fff')]));
  badge.position.set(0.3, onTable + 0.001, 0.36);
  badge.rotation.y = 0.5;
  room.add(badge);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.0025, 6, 40, Math.PI * 1.1), std('#d2372b'));
  strap.rotation.set(-Math.PI / 2, 0, 0.8);
  strap.position.set(0.32, onTable + 0.002, 0.3);
  room.add(strap);
  [['#fff27a', -0.36, 0.34, 0.3], ['#ffd3e0', -0.42, 0.42, -0.2], ['#cde3ff', 0.74, 0.3, 0.1]].forEach(([c, x, z, r]) => {
    const p = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.0015, 0.075), std(c, { roughness: 0.9 })));
    p.position.set(x, onTable + 0.001, z);
    p.rotation.y = r;
    room.add(p);
  });
  [['#1f3a8a', 0.42, 0.18, 1.1], ['#111', -0.3, 0.42, 0.3]].forEach(([c, x, z, r]) => {
    const pen = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 10), std(c, { roughness: 0.3 })));
    pen.rotation.set(0, r, Math.PI / 2);
    pen.position.set(x, onTable + 0.005, z);
    room.add(pen);
  });

  // Feixe de luz com poeira
  const coneMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float vY; uniform float uOpacity; void main(){ gl_FragColor = vec4(1.0,0.92,0.8, 0.06 * pow(vY, 1.6) * uOpacity); }',
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.1, 3.3, 32, 1, true), coneMat);
  cone.position.set(0.55, 2.55, 0.85);
  cone.lookAt(new THREE.Vector3(0, 0.75, 0));
  cone.rotateX(-Math.PI / 2);
  room.add(cone);
  const dustN = quality === 'high' ? 380 : 160;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos.set([(Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 1.9, (Math.random() - 0.5) * 1.2], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#fff3dd', map: steamTex, size: 0.008, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  room.add(dust);

  // ── Figurinhas de papel (Cauan e Bruno) ──
  const paperBack = std('#f4f1ea', { roughness: 0.95 });
  function standee(src, height, x, z, ry, name, quote) {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const t = texLoader.load(src, (texture) => {
      const a = texture.image.width / texture.image.height;
      body.scale.set(height * a, height, 1);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const body = new THREE.Group();
    const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.9 }));
    front.castShadow = true;
    front.position.z = 0.0012;
    // verso: a mesma silhueta em papel liso (PNG gerado a partir do recorte)
    const tb = texLoader.load(src.replace(/\.png$/, '-verso.png'));
    tb.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tb, alphaTest: 0.5, roughness: 0.95, side: THREE.BackSide }));
    back.position.z = -0.0012;
    // borda: a silhueta um pouco mais escura entre frente e verso, dá espessura
    const edge = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tb, color: '#cfc9bc', alphaTest: 0.5, side: THREE.DoubleSide }));
    body.add(front, edge, back);
    const fold = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.05), paperBack));
    fold.position.set(0, 0.001, 0.022);
    g.add(body, fold);
    g.position.set(x, onTable, z);
    g.rotation.y = ry;
    g.userData = { baseRy: ry, lift: 0, name };
    room.add(g);
    clickable(g, name, () => { g.userData.jump = 1; sfx.pop(); bubbleAt(g, quote, 'fundadores.html', 'conhecer os fundadores →'); });
    return g;
  }
  const cauan = standee('/scene/cauan.png', 0.3, -0.36, -0.2, 0.25, 'Cauan', 'Quero ser lembrado por construir algo grande.');
  const bruno = standee('/scene/bruno.png', 0.28, 0.32, -0.3, -0.3, 'Bruno', 'CTO, CFO e outros C-levels dessa bagaça.');
  const figurines = [cauan, bruno];

  // ── O diário ──
  const PW = 0.21, PH = 0.29;
  const PX = 1024, PY = 1414;
  const book = new THREE.Group();
  book.position.set(0, onTable + 0.008, 0.12);
  room.add(book);

  const pageCanvas = (draw) => {
    const [c, x] = paper.makeCanvas(PX, PY);
    draw(x);
    return canvasTex(c);
  };
  function mirrored(t) {
    const m = t.clone();
    m.wrapS = THREE.RepeatWrapping;
    m.repeat.x = -1;
    m.needsUpdate = true;
    return m;
  }
  const votes = {};
  chapters.forEach((ch) => {
    if (!ch.vote) return;
    try {
      const saved = JSON.parse(localStorage.getItem('bmm-vote-' + ch.vote.poll) || 'null');
      if (saved) votes[ch.vote.poll] = saved;
    } catch { /* sem storage */ }
  });
  const leftOf = (i) => pageCanvas((x) => paper.drawLeftPage(x, PX, PY, chapters[i].left, {
    seed: i * 2 + 1,
    number: `pág. ${i * 2 + 1}`,
    vote: chapters[i].vote && votes[chapters[i].vote.poll] ? { ...chapters[i].vote, ...votes[chapters[i].vote.poll] } : null,
  }));
  const photos = [];
  const rightCtx = [];
  const spreads = chapters.map((ch, i) => {
    const left = leftOf(i);
    const [rc, rx] = paper.makeCanvas(PX, PY);
    rightCtx[i] = rx;
    paper.drawRightPage(rx, PX, PY, ch.right, { seed: i * 2 + 2, number: `pág. ${i * 2 + 2}` });
    return { left, leftBack: mirrored(left), right: canvasTex(rc) };
  });
  // Fotos das polaroids: desenhadas no papel quando carregam (vídeo usa o pôster).
  const imgLoader = new THREE.ImageLoader(manager);
  chapters.forEach((ch, i) => {
    const pol = ch.right.polaroid;
    if (!pol) return;
    const src = pol.image || pol.video.replace(/\.mp4$/, '.jpg');
    imgLoader.load(src, (img) => {
      photos[i] = img;
      paper.drawRightPage(rightCtx[i], PX, PY, ch.right, { seed: i * 2 + 2, number: `pág. ${i * 2 + 2}`, photo: img });
      spreads[i].right.needsUpdate = true;
    });
  });
  function redrawLeft(i) {
    spreads[i].left.dispose();
    spreads[i].leftBack.dispose();
    spreads[i].left = leftOf(i);
    spreads[i].leftBack = mirrored(spreads[i].left);
    shownSpread = -9;
  }

  const PAGE_TINT = '#e8e2d4';
  const leftMat = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95 });
  const rightMat = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95 });
  const pageGeo = new THREE.PlaneGeometry(PW, PH);
  const leftPage = new THREE.Mesh(pageGeo, leftMat);
  leftPage.rotation.x = -Math.PI / 2;
  leftPage.position.set(-PW / 2 - 0.004, 0.013, 0);
  const rightPage = new THREE.Mesh(pageGeo, rightMat);
  rightPage.rotation.x = -Math.PI / 2;
  rightPage.position.set(PW / 2 + 0.004, 0.013, 0);
  leftPage.receiveShadow = rightPage.receiveShadow = true;
  book.add(leftPage, rightPage);
  // miolo (folhas empilhadas) e contracapa
  const edgePaper = std('#ece5d3', { roughness: 1 });
  [-1, 1].forEach((s) => {
    const block = shadowy(new THREE.Mesh(new RoundedBoxGeometry(PW + 0.002, 0.01, PH + 0.002, 2, 0.002), edgePaper));
    block.position.set(s * (PW / 2 + 0.004), 0.007, 0);
    book.add(block);
  });
  const backCover = shadowy(new THREE.Mesh(new RoundedBoxGeometry(PW * 2 + 0.03, 0.004, PH + 0.014, 2, 0.002), std('#1b1b22', { roughness: 0.8 })));
  backCover.position.y = 0.001;
  book.add(backCover);
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0015, 6, 16), std('#c3c7cf', { metalness: 0.9, roughness: 0.25 }));
    ring.position.set(0, 0.014, -PH / 2 + 0.012 + i * ((PH - 0.024) / 15));
    ring.rotation.y = Math.PI / 2;
    book.add(ring);
  }

  // Folha virando com curvatura de verdade: a borda solta atrasa em relação à espiral.
  const SEGS = 40;
  const leafGeo = new THREE.PlaneGeometry(PW, PH, SEGS, 1);
  const leafU = [];
  for (let i = 0; i < leafGeo.attributes.position.count; i++) {
    leafU.push((leafGeo.attributes.position.getX(i) + PW / 2) / PW);
  }
  function curl(p) {
    const pos = leafGeo.attributes.position;
    const du = 1 / SEGS;
    const xs = [0], zs = [0];
    const drag = Math.sin(Math.PI * p) * 1.15;
    for (let k = 1; k <= SEGS; k++) {
      const u = (k - 0.5) * du;
      const a = clamp01((Math.PI * p - drag * u * u) / Math.PI) * Math.PI;
      xs.push(xs[k - 1] + Math.cos(a) * du * PW);
      zs.push(zs[k - 1] + Math.sin(a) * du * PW);
    }
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round(leafU[i] * SEGS);
      pos.setX(i, xs[k]);
      pos.setZ(i, zs[k]);
    }
    pos.needsUpdate = true;
    leafGeo.computeVertexNormals();
  }
  const leafFront = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95, side: THREE.FrontSide });
  const leafBack = new THREE.MeshStandardMaterial({ color: PAGE_TINT, roughness: 0.95, side: THREE.BackSide });
  const leaf = new THREE.Group();
  const leafA = new THREE.Mesh(leafGeo, leafFront);
  const leafB = new THREE.Mesh(leafGeo, leafBack);
  leafA.castShadow = true;
  leaf.add(leafA, leafB);
  leaf.rotation.x = -Math.PI / 2;
  leaf.position.set(0.004, 0.0145, 0);
  leaf.visible = false;
  book.add(leaf);

  // Capa dura que abre
  const [cvC, cvX] = paper.makeCanvas(PX, PY);
  paper.drawCover(cvX, PX, PY);
  const coverMats = [std('#1b1b22'), std('#1b1b22'), std('#ffffff', { map: canvasTex(cvC), roughness: 0.75 }), std('#26262e'), std('#1b1b22'), std('#1b1b22')];
  const coverBoard = shadowy(new THREE.Mesh(new RoundedBoxGeometry(PW + 0.014, 0.004, PH + 0.014, 2, 0.0015), coverMats));
  coverBoard.position.x = (PW + 0.014) / 2;
  const cover = new THREE.Group();
  cover.add(coverBoard);
  cover.position.set(0.002, 0.018, 0);
  book.add(cover);

  // Polaroids (foto ou vídeo) e áreas clicáveis de cada página dupla
  const extras = chapters.map((ch, i) => {
    const g = new THREE.Group();
    g.visible = false;
    book.add(g);
    const pol = ch.right.polaroid;
    if (pol) {
      // a polaroid está desenhada no papel; aqui só o vídeo (por cima) e a área clicável
      const { pw, ph, frameW, frameH, top } = paper.polaroidSize(pol.aspect || 1);
      const holder = new THREE.Group();
      holder.position.set(PW / 2 + 0.004, 0.0142, -PH / 2 + top + frameH / 2);
      holder.rotation.y = pol.tilt || 0;
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.rotation.x = -Math.PI / 2;
      holder.add(hit);
      if (pol.video) {
        const v = makeVideo(pol.video);
        const map = new THREE.VideoTexture(v);
        map.colorSpace = THREE.SRGBColorSpace;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map, roughness: 0.5 }));
        screen.rotation.x = -Math.PI / 2;
        screen.position.set(0, 0.0004, -frameH / 2 + 0.008 + ph / 2);
        holder.add(screen);
        g.userData.video = v;
      }
      g.add(holder);
      if (ch.link) clickable(holder, `ler o ${ch.left.kicker?.split('·')[0].trim() || 'registro'}`, () => { window.location.href = ch.link; });
    }
    if (ch.right.sticker?.link) {
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.04), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.rotation.x = -Math.PI / 2;
      hit.position.set(PW / 2 + 0.004, 0.02, -PH / 2 + ((PY - 300) / PY) * PH);
      g.add(hit);
      clickable(hit, 'assistir no YouTube ↗', () => window.open(ch.right.sticker.link, '_blank', 'noopener'));
    }
    return g;
  });

  // ── Mapa do Brasil (afastamento final) ──
  const MAP_W = 60, MAP_H = 60;
  const lonMin = -75, lonMax = -33, latMin = -35, latMax = 7;
  const toMap = (lon, lat) => [((lon - lonMin) / (lonMax - lonMin) - 0.5) * MAP_W, ((latMax - lat) / (latMax - latMin) - 0.5) * MAP_H];
  const [mapC, mapX] = paper.makeCanvas(2048, 2048);
  paper.drawMap(mapX, 2048, 2048, (lon, lat) => [((lon - lonMin) / (lonMax - lonMin)) * 2048, ((latMax - lat) / (latMax - latMin)) * 2048]);
  const mapMat = new THREE.MeshBasicMaterial({ map: canvasTex(mapC), transparent: true, opacity: 0, depthWrite: false });
  const [spX, spZ] = toMap(-46.72, -23.57);
  const map = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), mapMat);
  map.rotation.x = -Math.PI / 2;
  map.position.set(-spX, -0.03, -spZ);
  scene.add(map);

  const pts = CITIES.map(([lon, lat]) => [lon, lat]);
  const rand = paper.seeded(7);
  const inside = ([x, y], poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  while (pts.length < 460) {
    const p = [lonMin + rand() * (lonMax - lonMin), latMin + rand() * (latMax - latMin)];
    if (inside(p, BRAZIL)) pts.push(p);
  }
  const spDist = pts.map(([lon, lat]) => Math.hypot(lon + 46.72, lat + 23.57));
  const order = pts.map((_, i) => i).sort((a, b) => (a < CITIES.length ? -1 : 0) - (b < CITIES.length ? -1 : 0) || spDist[a] - spDist[b]);
  const dotPos = new Float32Array(pts.length * 3);
  const reveal = new Float32Array(pts.length);
  const local = (lon, lat) => { const [mx, mz] = toMap(lon, lat); return [mx - spX, mz - spZ]; };
  order.forEach((idx, rank) => {
    const [x, z] = local(pts[idx][0], pts[idx][1]);
    dotPos.set([x, 0.05, z], rank * 3);
    reveal[rank] = rank / pts.length;
  });
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  dotGeo.setAttribute('reveal', new THREE.BufferAttribute(reveal, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uProgress: { value: 0 }, uSize: { value: 20 * renderer.getPixelRatio() }, uTime: { value: 0 } },
    vertexShader: `
      attribute float reveal; uniform float uProgress; uniform float uSize; uniform float uTime; varying float vOn;
      void main(){
        vOn = smoothstep(reveal, reveal + 0.04, uProgress);
        float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + reveal * 80.0);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float big = 1.0 + 1.5 * (1.0 - smoothstep(0.0, 0.07, reveal));
        gl_PointSize = uSize * vOn * twinkle * big * (60.0 / -mv.z);
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
  scene.add(new THREE.Points(dotGeo, dotMat));

  // Arcos de São Paulo até as capitais: mentorias entre universidades.
  const arcs = [];
  CITIES.slice(1).forEach(([lon, lat], i) => {
    const [x, z] = local(lon, lat);
    const len = Math.hypot(x, z);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(x / 2, len * 0.35, z / 2), new THREE.Vector3(x, 0.05, z));
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
    const mat = new THREE.LineBasicMaterial({ color: '#c4b5fd', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    line.geometry.setDrawRange(0, 0);
    line.userData.delay = i / CITIES.length;
    scene.add(line);
    arcs.push(line);
  });

  // Pino do Inteli com pulso
  const pin = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 40), new THREE.MeshBasicMaterial({ color: '#ff7a8a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  pin.add(ring);
  scene.add(pin);

  // ── Roteiro de câmera ──
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bookC = V(0, onTable, 0.12);
  function bookShot(side = 0) {
    const aspect = window.innerWidth / window.innerHeight;
    const small = aspect < 0.8;
    const w = small ? PW * 1.1 : PW * 2.14;
    const h = small ? PH * 1.2 : PH * 1.16;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max(h / (2 * Math.tan(vfov / 2)), w / (2 * Math.tan(vfov / 2) * aspect));
    const tx = small ? side * (PW / 2 + 0.004) : 0;
    return { pos: V(tx, bookC.y + dist * 0.96, bookC.z + dist * 0.28), look: V(tx, bookC.y, bookC.z - 0.005) };
  }
  function mapShot() {
    const aspect = window.innerWidth / window.innerHeight;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const d = Math.max(70 / (2 * Math.tan(vfov / 2)), 64 / (2 * Math.tan(vfov / 2) * aspect));
    return { pos: V(-12, d, -14 + d * 0.1), look: V(-12, 0, -14) };
  }
  function shots() {
    const narrow = isNarrow();
    const far = (shot, k) => (narrow ? { pos: shot.look.clone().add(shot.pos.clone().sub(shot.look).multiplyScalar(k)), look: shot.look } : shot);
    const L = bookShot(-1), R = bookShot(1), C = bookShot(0);
    const list = [
      [0, far({ pos: V(2.6, 1.85, 3.2), look: V(-0.2, 1.05, -0.8) }, 1.35)],
      [TL.intro.wide[1], far({ pos: V(2.2, 1.6, 2.6), look: V(-0.2, 1.0, -0.6) }, 1.35)],
      [TL.intro.table[1], far({ pos: V(0.55, 1.18, 0.95), look: V(0, onTable + 0.08, -0.1) }, 1.7)],
      [TL.cover[1], C],
    ];
    TL.holds.forEach(([s, e], i) => {
      const toRight = chapters[i].vote ? 0.8 : 0.45;
      list.push([s + (e - s) * 0.08, L]);
      list.push([s + (e - s) * toRight, L]);
      list.push([e, R]);
    });
    list.push([TL.pull[0] + 0.005, C]);
    list.push([0.93, { pos: V(0, 7, 3.5), look: V(0, 0, 0) }]);
    list.push([1, mapShot()]);
    return list;
  }
  let SHOTS = shots();
  const camP = new THREE.Vector3(), camL = new THREE.Vector3();
  function cameraAt(t) {
    for (let i = 1; i < SHOTS.length; i++) {
      const [t1, b] = SHOTS[i];
      const [t0, a] = SHOTS[i - 1];
      if (t <= t1) {
        const k = ease(clamp01((t - t0) / Math.max(t1 - t0, 1e-6)));
        camP.lerpVectors(a.pos, b.pos, k);
        camL.lerpVectors(a.look, b.look, k);
        return;
      }
    }
    const last = SHOTS[SHOTS.length - 1][1];
    camP.copy(last.pos);
    camL.copy(last.look);
  }

  // ── Livro em função do scroll ──
  let shownSpread = -9;
  let lastFlip = -1;
  function showSpread(i) {
    if (i === shownSpread) return;
    shownSpread = i;
    leftMat.map = spreads[i].left;
    rightMat.map = spreads[i].right;
    leftMat.needsUpdate = rightMat.needsUpdate = true;
  }
  function updateBook(t) {
    const c = ease(seg(t, TL.cover));
    cover.rotation.z = Math.PI * c;
    cover.position.y = 0.018 + Math.sin(Math.PI * c) * 0.004;
    cover.visible = c < 0.999;

    let base = 0, flipping = -1, p = 0;
    TL.flips.forEach((f, i) => {
      if (t >= f[1]) base = i + 1;
      else if (t > f[0]) { flipping = i; p = ease(seg(t, f)); }
    });

    if (flipping >= 0) {
      leftMat.map = spreads[flipping].left;
      rightMat.map = spreads[flipping + 1].right;
      leftMat.needsUpdate = rightMat.needsUpdate = true;
      shownSpread = -9;
      if (leafFront.map !== spreads[flipping].right) {
        leafFront.map = spreads[flipping].right;
        leafBack.map = spreads[flipping + 1].leftBack;
        leafFront.needsUpdate = leafBack.needsUpdate = true;
      }
      leaf.visible = true;
      curl(p);
      if (lastFlip !== flipping && p > 0.08 && p < 0.6) { lastFlip = flipping; sfx.pageFlip(); }
    } else {
      leaf.visible = false;
      showSpread(base);
      if (lastFlip !== -1 && !TL.flips.some((f) => t > f[0] && t < f[1])) lastFlip = -2;
    }

    const open = c > 0.6;
    const visible = flipping >= 0 ? -1 : base;
    extras.forEach((g, i) => {
      const show = open && i === visible;
      g.visible = show;
      const v = g.userData.video;
      if (v) {
        if (show && v.paused) v.play().catch(() => {});
        if (!show && !v.paused) v.pause();
      }
    });
    return { base, flipping, open };
  }

  // ── Sobreposições HTML ──
  const caps = {};
  document.querySelectorAll('[data-cap]').forEach((el) => { caps[el.dataset.cap] = el; });
  const ranges = {
    intro: TL.intro.wide,
    table: TL.intro.table,
    cover: [TL.cover[0] - 0.005, TL.cover[1]],
    pull1: [TL.pull[0] + 0.01, 0.935],
    pull2: [0.945, 1.01],
  };
  const voteIdx = chapters.findIndex((c) => c.vote);
  const newsIdx = chapters.findIndex((c) => c.newsletter);
  if (voteIdx >= 0) ranges.vote = [TL.holds[voteIdx][0] + TL.H * 0.12, TL.holds[voteIdx][1]];
  if (newsIdx >= 0) ranges.newsletter = [TL.holds[newsIdx][0] + TL.H * 0.1, TL.holds[newsIdx][1] + 0.004];
  const chip = document.getElementById('chapter-link');
  const progressBar = document.getElementById('progress');
  const counter = document.getElementById('chapter-count');
  function updateOverlays(t, bk) {
    Object.entries(ranges).forEach(([k, [a, b]]) => caps[k]?.classList.toggle('is-on', t >= a && t < b));
    const ch = chapters[bk.base];
    const inHold = bk.open && bk.flipping < 0 && t < TL.pull[0];
    const showChip = inHold && ch.link && !ch.vote;
    if (showChip && chip.getAttribute('href') !== ch.link) {
      chip.setAttribute('href', ch.link);
      chip.querySelector('span').textContent = `ler o ${ch.left.kicker.split('·')[0].trim()} completo`;
    }
    chip.classList.toggle('is-on', !!showChip);
    counter.classList.toggle('is-on', inHold);
    counter.textContent = `${Math.min(bk.base + 1, chapters.length)} / ${chapters.length}`;
    progressBar.style.transform = `scaleX(${t})`;
  }

  // Voto (compartilhado pela planilha quando /api/vote estiver configurado)
  document.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ch = chapters[voteIdx];
      const poll = ch.vote.poll;
      const choice = btn.dataset.vote;
      votes[poll] = { choice };
      sfx.stamp();
      redrawLeft(voteIdx);
      document.documentElement.classList.add('voted');
      try {
        const res = await fetch((document.documentElement.dataset.api || '') + '/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll, choice }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          const total = data.sim + data.nao;
          const same = choice === 'sim' ? data.sim : data.nao;
          if (total > 0) votes[poll].share = `${Math.round((same / total) * 100)}% carimbaram igual a você`;
          redrawLeft(voteIdx);
        }
      } catch { /* sem contagem: fica só o carimbo */ }
      try { localStorage.setItem('bmm-vote-' + poll, JSON.stringify(votes[poll])); } catch { /* sem storage */ }
    });
  });
  if (voteIdx >= 0 && votes[chapters[voteIdx].vote.poll]) document.documentElement.classList.add('voted');

  // Som
  const soundBtn = document.getElementById('sound');
  soundBtn.addEventListener('click', () => {
    const on = !sfx.soundOn();
    sfx.setSound(on);
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('span').textContent = on ? 'som ligado' : 'som desligado';
    if (on) sfx.pop();
  });

  // ── Interação: passar o mouse e clicar nos objetos ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, has: false };
  const tip = document.getElementById('tip');
  const bubble = document.getElementById('bubble');
  let hovered = null;
  let bubbleTarget = null;
  let bubbleUntil = 0;

  function pick(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(interactive, true).filter((h) => h.object.visible && isVisible(h.object));
    return hits.length ? hits[0].object.userData.target : null;
  }
  function isVisible(o) {
    for (let n = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  }
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.has = true;
    if (e.pointerType !== 'mouse') return;
    const target = pick(e.clientX, e.clientY);
    hovered = target;
    canvas.style.cursor = target ? 'pointer' : '';
    tip.classList.toggle('is-on', !!target);
    if (target) {
      tip.textContent = target.userData.hover.label;
      tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    }
  }, { passive: true });
  // o #stage fica por cima do canvas, então o clique é ouvido na janela
  window.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, label, form, .bubble, header, .after, footer')) return;
    const target = pick(e.clientX, e.clientY);
    if (target) target.userData.hover.onClick();
  });

  const tmpV = new THREE.Vector3();
  function bubbleAt(obj, text, href, linkText) {
    bubbleTarget = obj;
    bubbleUntil = performance.now() + 5200;
    bubble.querySelector('p').textContent = text;
    const a = bubble.querySelector('a');
    a.hidden = !href;
    if (href) { a.href = href; a.textContent = linkText; }
    bubble.classList.add('is-on');
    sfx.pop();
  }
  function placeBubble() {
    if (!bubbleTarget || performance.now() > bubbleUntil) {
      bubble.classList.remove('is-on');
      bubbleTarget = null;
      return;
    }
    const box = new THREE.Box3().setFromObject(bubbleTarget);
    tmpV.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
    const bw = bubble.offsetWidth;
    const left = Math.min(Math.max(12, x - bw / 2), window.innerWidth - bw - 12);
    bubble.style.transform = `translate(${left}px, ${Math.max(70, y - bubble.offsetHeight - 16)}px)`;
  }

  // ── Scroll, tamanho e qualidade ──
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
  }
  window.addEventListener('resize', resize);
  resize();
  target = current = scrollProgress();

  function makeVideo(src) {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    return v;
  }
  tvVideo.play().catch(() => {});

  // ── Loop ──
  const timer = new THREE.Timer();
  let frames = 0, slowFrames = 0, checked = false;
  let laptopFrame = 0, lastLaptop = 0;
  let nextBuzz = 6;

  function frame(now) {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.1);
    const time = timer.getElapsed();
    current += (target - current) * (1 - Math.pow(0.0008, dt));
    if (Math.abs(target - current) < 0.0004) current = target;
    const t = current;

    // queda de qualidade automática em aparelhos lentos
    if (!checked) {
      frames++;
      if (dt > 0.03) slowFrames++;
      if (frames > 90) {
        checked = true;
        if (slowFrames > 45) {
          quality = 'low';
          renderer.setPixelRatio(1);
          renderer.shadowMap.enabled = false;
          dust.visible = false;
        }
      }
    }

    cameraAt(t);
    camera.position.copy(camP);
    camera.lookAt(camL);

    const bk = updateBook(t);
    updateOverlays(t, bk);

    // figurinhas: balanço de papel, olhar para o cursor, pulo ao clicar
    figurines.forEach((s, i) => {
      const u = s.userData;
      u.lift += ((hovered === s ? 1 : 0) - u.lift) * 0.15;
      u.jump = Math.max(0, (u.jump || 0) - dt * 1.6);
      s.rotation.y = u.baseRy + Math.sin(time * 1.3 + i * 2) * 0.05 + (pointer.has ? pointer.x * 0.25 : 0);
      s.rotation.z = Math.sin(time * 1.7 + i) * 0.015;
      s.position.y = onTable + u.lift * 0.008 + Math.sin(Math.PI * u.jump) * 0.04;
    });

    // celular vibra de tempos em tempos enquanto estamos na sala
    if (time > nextBuzz && t < TL.cover[1]) {
      nextBuzz = time + 7 + Math.random() * 4;
      phoneShake = 1;
      if (t > TL.intro.table[0]) sfx.buzz();
    }
    phoneShake = Math.max(0, phoneShake - dt * 2.2);
    phone.position.x = phone.userData.base.x + Math.sin(time * 90) * 0.0015 * phoneShake;
    phone.rotation.y = 0.35 + Math.sin(time * 70) * 0.03 * phoneShake;

    // notebook digitando
    if (time - lastLaptop > 0.45) {
      lastLaptop = time;
      laptopFrame += 0.5;
      paper.drawLaptopScreen(lsX, 1024, 640, laptopFrame);
      lsTex.needsUpdate = true;
    }

    // vapor do café
    steamBoost = Math.max(0, steamBoost - dt * 0.4);
    steam.forEach((s) => {
      const k = (time * (0.25 + steamBoost * 0.5) + s.userData.phase) % 1;
      s.position.set(Math.sin(k * 6 + s.userData.phase * 9) * 0.012, 0.06 + k * 0.16, 0);
      s.scale.setScalar(0.03 + k * 0.07);
      s.material.opacity = Math.sin(Math.PI * k) * (0.35 + steamBoost * 0.4);
    });

    // poeira no feixe
    if (dust.visible) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += dt * 0.012;
        arr[i] += Math.sin(time * 0.3 + i) * dt * 0.004;
        if (arr[i + 1] > 2.7) arr[i + 1] = 0.8;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }

    // afastamento: a sala encolhe até virar um ponto em São Paulo
    const pull = seg(t, TL.pull);
    const s = 1 - ease(Math.min(1, pull * 1.25)) * 0.985;
    room.scale.setScalar(s);
    key.intensity = 24 * s * s + 1;
    coneMat.uniforms.uOpacity.value = s;
    mapMat.opacity = ease(seg(t, [0.885, 0.95]));
    const lightUp = ease(seg(t, [0.9, 1.0]));
    dotMat.uniforms.uProgress.value = lightUp * 1.04;
    dotMat.uniforms.uTime.value = time;
    arcs.forEach((line) => {
      const k = clamp01((lightUp - line.userData.delay * 0.6) / 0.35);
      line.geometry.setDrawRange(0, Math.floor(k * 49));
    });
    const pulse = (time * 0.8) % 1;
    ring.scale.setScalar(1 + pulse * 2.5);
    ring.material.opacity = ease(seg(t, [0.95, 1])) * (1 - pulse) * 0.9;
    scene.fog.near = 8 + pull * 120;
    scene.fog.far = 24 + pull * 200;

    placeBubble();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  document.documentElement.classList.add('has-3d');
  requestAnimationFrame(frame);
}
