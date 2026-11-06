// A sala de reunião R06 do Inteli, a partir das fotos da R07: uma "casinha"
// de pinus com frente de vidro e caixilho branco, porta com o número em
// vinil, ripas acústicas diagonais por dentro, teto inclinado com LED,
// pendente verde sobre a mesa de carvalho, cadeiras de casca perfurada,
// TV com a tela de reserva, quadro branco e, do lado de fora, tijolo,
// concreto e piso tátil.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as paper from './diorama-paper.js';
import { buildPerson } from './diorama-people.js';

// Medidas (metros). Frente de vidro em +z, TV ao fundo em -z.
// A sala é desenhada centrada em x = 0 e depois deslocada em `cx`, para a mesa
// (que fica na origem da cena) encostar na parede lateral esquerda.
export const POD = {
  x0: -1.5, x1: 1.5, zBack: -1.9, zFront: 1.7, eave: 2.2, ridge: 2.9, t: 0.09,
  cx: 0.705,
  door: { x0: 0.3, x1: 1.33, h: 2.08 },
  roomNumber: '07',
};

export function buildRoom({ room, std, canvasTex, shadowy, clickable, bubbleAt, makeVideo, renderer }) {
  const { x0, x1, zBack: ZB, zFront: ZF, eave: EV, ridge: RG, t: T } = POD;
  const W = x1 - x0, D = ZF - ZB, ZC = (ZB + ZF) / 2;
  const slope = (RG - EV) / (W / 2);
  const theta = Math.atan(slope);

  // ── Texturas ──
  const tex = (draw, w, h, opts = {}) => {
    const [c, x] = paper.makeCanvas(w, h);
    draw(x, w, h);
    const t = canvasTex(c, opts);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const tiled = (base, rx, ry) => {
    const t = base.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  };
  const slats = tex(paper.drawSlats, 1024, 512);
  const slatsBump = tex((x, w, h) => paper.drawSlats(x, w, h, { bump: true }), 1024, 512, { linear: true });
  const ply = tex(paper.drawPlywood, 1024, 1024);
  const oak = tex(paper.drawOak, 1024, 1024);
  const carpet = tex(paper.drawCarpet, 512, 512);
  const concrete = tex(paper.drawConcrete, 512, 512);
  const brick = tex(paper.drawBrick, 1024, 1024);
  const SL_W = 2.3, SL_H = 1.15, PLY = 1.2;

  // UV em metros para formas (ShapeGeometry): um ladrilho a cada (sx, sy) m.
  const uvMeters = (geo, sx, sy) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / sx, p.getY(i) / sy);
    uv.needsUpdate = true;
    return geo;
  };
  const slatMat = (w, h) => std('#ffffff', { map: tiled(slats, w / SL_W, h / SL_H), bumpMap: tiled(slatsBump, w / SL_W, h / SL_H), bumpScale: 1.6, roughness: 1 });
  const plyMat = (w, h) => std('#ffffff', { map: tiled(ply, w / PLY, h / PLY), roughness: 0.75 });
  const slatShape = std('#ffffff', { map: slats, bumpMap: slatsBump, bumpScale: 1.6, roughness: 1 });
  const plyShape = std('#ffffff', { map: ply, roughness: 0.75 });
  const white = std('#f4f4f2', { roughness: 0.35, metalness: 0.2 });
  const shell = std('#2a2a30', { roughness: 0.9 });

  const pod = new THREE.Group();
  pod.position.x = POD.cx;
  room.add(pod);
  // casca da sala (paredes, telhado, frente): ao passar o mouse, o nome da sala
  const shellGroup = new THREE.Group();
  pod.add(shellGroup);
  // mobília fica nas coordenadas da cena (mesa na origem)
  const furniture = new THREE.Group();
  room.add(furniture);

  // ── Prédio em volta: concreto, tijolo aparente, reboco branco ──
  const outside = new THREE.Group();
  room.add(outside);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 11), std('#ffffff', { map: tiled(concrete, 4, 5), roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0.4 + POD.cx, 0, 0.6);
  // bordas do chão se apagam no escuro, para o afastamento virar um ponto sem quinas
  const [fadeC, fadeX] = paper.makeCanvas(256, 256);
  const fadeG = fadeX.createRadialGradient(128, 128, 40, 128, 128, 128);
  fadeG.addColorStop(0, '#ffffff');
  fadeG.addColorStop(1, '#000000');
  fadeX.fillStyle = fadeG;
  fadeX.fillRect(0, 0, 256, 256);
  ground.material.alphaMap = canvasTex(fadeC, { linear: true });
  ground.material.transparent = true;
  ground.material.depthWrite = false;
  ground.receiveShadow = true;
  outside.add(ground);
  const brickMat = (w, h) => std('#ffffff', { map: tiled(brick, w / 1.6, h / 1.6), roughness: 1 });
  const plaster = std('#e9e7e2', { roughness: 1 });
  [[-2.4, 0, 0.6, Math.PI / 2, 11], [0.4, 0, -3.0, 0, 9]].forEach(([x, , z, ry, len]) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.2), brickMat(len, 3.2));
    b.position.set(x, 1.6, z);
    b.rotation.y = ry;
    b.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.2), plaster);
    top.position.set(x, 4.3, z);
    top.rotation.y = ry;
    outside.add(b, top);
  });
  // janelas altas do galpão (só a luz, ao fundo)
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), new THREE.MeshBasicMaterial({ color: '#1b2027' })); // noite lá fora
    win.position.set(-1.4 + i * 1.5, 4.4, -2.99);
    outside.add(win);
  }
  // duto verde-água no alto
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 9), std('#5fb3ad', { roughness: 0.6, metalness: 0.3 }));
  duct.position.set(2.2 + POD.cx, 3.9, 0.4);
  outside.add(duct);

  // ── Piso da sala ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: tiled(carpet, W / 0.9, D / 0.9), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.004, ZC);
  floor.receiveShadow = true;
  pod.add(floor);
  const plinth = shadowy(new THREE.Mesh(new THREE.BoxGeometry(W + 2 * T, 0.03, D + T), shell));
  plinth.position.set(0, -0.013, ZC - T / 2);
  pod.add(plinth);

  // ── Paredes laterais: ripas por dentro, pinus por fora ──
  [-1, 1].forEach((side) => {
    const inner = side < 0 ? 0 : 1; // face +x (0) é a de dentro da parede esquerda
    const mats = [];
    for (let i = 0; i < 6; i++) mats.push(plyMat(i < 2 ? D + T : T, EV));
    mats[inner] = slatMat(D + T, EV);
    mats[3] = shell;
    const WH = EV + 0.05; // o topo entra no telhado
    const wall = new THREE.Mesh(new THREE.BoxGeometry(T, WH, D + T), mats);
    wall.position.set(side * (W / 2 + T / 2), WH / 2, ZC - T / 2);
    wall.receiveShadow = true;
    wall.castShadow = true;
    shellGroup.add(wall);
  });

  // ── Parede do fundo (empena) ──
  const gable = (inset = 0) => {
    const s = new THREE.Shape();
    s.moveTo(x0 - inset, 0);
    s.lineTo(x1 + inset, 0);
    s.lineTo(x1 + inset, EV + inset * (1 / Math.cos(theta)) - inset * slope);
    s.lineTo(0, RG + inset / Math.cos(theta));
    s.lineTo(x0 - inset, EV + inset * (1 / Math.cos(theta)) - inset * slope);
    s.closePath();
    return s;
  };
  const backIn = new THREE.Mesh(uvMeters(new THREE.ShapeGeometry(gable()), SL_W, SL_H), slatShape);
  backIn.position.z = ZB;
  backIn.receiveShadow = true;
  const backOut = new THREE.Mesh(uvMeters(new THREE.ShapeGeometry(gable(T)), PLY, PLY), plyShape);
  backOut.rotation.y = Math.PI;
  backOut.position.z = ZB - T;
  shellGroup.add(backIn, backOut);

  // ── Teto inclinado (por dentro) e telhado de pinus (por fora) ──
  const roof = new THREE.Group();
  shellGroup.add(roof);
  const Ls = Math.hypot(W / 2, RG - EV);
  const ceilingMat = std('#7c7360', { roughness: 1 });
  const leds = [];
  [-1, 1].forEach((side) => {
    const g = new THREE.Group();
    g.position.set(side * W / 4, (EV + RG) / 2, ZC);
    g.rotation.z = -side * theta;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Ls, D), ceilingMat);
    ceil.rotation.x = Math.PI / 2;
    // telhado maciço: começa colado no forro e cobre o topo das paredes, sem fresta
    const slab = T + 0.04;
    const out = shadowy(new THREE.Mesh(new THREE.BoxGeometry(Ls + 0.16, slab, D + 2 * T + 0.12), [plyShape, plyShape, plyMat(Ls, D), plyShape, plyShape, plyShape]));
    out.position.y = slab / 2 + 0.001;
    out.castShadow = false;
    // fita de LED correndo da frente ao fundo
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, D * 0.78), std('#d9d6cf', { roughness: 0.4 })); // apagada
    led.position.set(-side * 0.12, -0.008, -0.05);
    g.add(ceil, out, led);
    leds.push(led);
    roof.add(g);
  });
  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, D + 2 * T + 0.12), plyShape);
  ridgeCap.position.set(0, RG + (T + 0.04) / Math.cos(theta) - 0.01, ZC);
  roof.add(ridgeCap);

  // ── Frente: moldura de pinus, vidro, caixilho branco e porta ──
  const front = new THREE.Group();
  front.position.z = ZF;
  shellGroup.add(front);
  const inX = x1 - 0.08, inEave = EV - 0.03, inRidge = RG - 0.07;
  const topAt = (x) => inRidge - Math.abs(x) * ((inRidge - inEave) / inX);
  const outerEave = EV + T / Math.cos(theta) - T * slope;
  const trimShape = new THREE.Shape();
  trimShape.moveTo(x0 - T, 0);
  trimShape.lineTo(x0 - T, outerEave);
  trimShape.lineTo(0, RG + T / Math.cos(theta));
  trimShape.lineTo(x1 + T, outerEave);
  trimShape.lineTo(x1 + T, 0);
  trimShape.lineTo(inX, 0);
  trimShape.lineTo(inX, inEave);
  trimShape.lineTo(0, inRidge);
  trimShape.lineTo(-inX, inEave);
  trimShape.lineTo(-inX, 0);
  trimShape.closePath();
  const trimGeo = new THREE.ExtrudeGeometry(trimShape, { depth: 0.14, bevelEnabled: false });
  trimGeo.translate(0, 0, -0.07);
  const trimUV = trimGeo.attributes.uv;
  for (let i = 0; i < trimUV.count; i++) trimUV.setXY(i, trimUV.getX(i) / PLY, trimUV.getY(i) / PLY);
  const trim = shadowy(new THREE.Mesh(trimGeo, plyShape));
  front.add(trim);

  const glassMat = new THREE.MeshStandardMaterial({ color: '#d8e6ea', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const frosted = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const { x0: dx0, x1: dx1, h: DH } = POD.door;
  const post = 0.08;
  // vidro fixo à esquerda da porta (até o caixilho) e bandeira em cima da porta
  const leftPane = new THREE.Shape();
  leftPane.moveTo(-inX, 0);
  leftPane.lineTo(dx0 - post, 0);
  leftPane.lineTo(dx0 - post, topAt(dx0 - post));
  leftPane.lineTo(0, inRidge);
  leftPane.lineTo(-inX, inEave);
  leftPane.closePath();
  const transom = new THREE.Shape();
  transom.moveTo(dx0 - post, DH + 0.06);
  transom.lineTo(inX, DH + 0.06);
  transom.lineTo(inX, inEave);
  transom.lineTo(dx0 - post, topAt(dx0 - post));
  transom.closePath();
  [leftPane, transom].forEach((s) => {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(s), glassMat);
    g.renderOrder = 2;
    front.add(g);
  });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(dx0 - post + inX, 0.07), frosted);
  band.position.set((-inX + dx0 - post) / 2, 1.1, 0.004);
  band.renderOrder = 3;
  front.add(band);
  // caixilho branco: montante entre o vidro e a porta, travessa da bandeira, batentes
  const bar = (w, h, x, y, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), white);
    m.position.set(x, y, 0);
    m.rotation.z = rz;
    front.add(m);
    return m;
  };
  bar(post, topAt(dx0 - post), dx0 - post / 2, topAt(dx0 - post) / 2);
  bar(inX - dx1, DH + 0.06, (dx1 + inX) / 2, (DH + 0.06) / 2);
  bar(inX - (dx0 - post), 0.06, (dx0 - post + inX) / 2, DH + 0.03);
  bar(0.04, inEave, -inX + 0.02, inEave / 2);
  bar(0.04, inEave, inX - 0.02, inEave / 2);
  const rake = Math.hypot(inX, inRidge - inEave);
  bar(rake, 0.04, -inX / 2, (inEave + inRidge) / 2 - 0.02, Math.atan2(inRidge - inEave, inX));
  bar(rake, 0.04, inX / 2, (inEave + inRidge) / 2 - 0.02, -Math.atan2(inRidge - inEave, inX));
  bar(dx0 - post + inX, 0.03, (-inX + dx0 - post) / 2, 0.015);

  // placa da sala no vidro
  const [plC, plX] = paper.makeCanvas(256, 320);
  paper.drawRoomPlate(plX, 256, 320, String(Number(POD.roomNumber)));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.19), new THREE.MeshStandardMaterial({ map: canvasTex(plC), roughness: 0.5 }));
  plate.position.set(dx0 - post - 0.17, 1.42, 0.006);
  front.add(plate);

  // porta de vidro (abre para dentro quando a câmera chega)
  const door = new THREE.Group();
  door.position.set(dx1, 0, 0);
  front.add(door);
  const DW = dx1 - dx0;
  const leaf = new THREE.Group();
  leaf.position.x = -DW / 2;
  door.add(leaf);
  const stile = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), white);
    m.position.set(x, y, 0);
    leaf.add(m);
  };
  stile(0.06, DH, -DW / 2 + 0.03, DH / 2);
  stile(0.06, DH, DW / 2 - 0.03, DH / 2);
  stile(DW, 0.07, 0, DH - 0.035);
  stile(DW, 0.1, 0, 0.05);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.12, DH - 0.17), glassMat);
  doorGlass.position.set(0, 0.1 + (DH - 0.17) / 2, 0);
  doorGlass.renderOrder = 2;
  leaf.add(doorGlass);
  const doorBand = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.12, 0.07), frosted);
  doorBand.position.set(0, 1.1, 0.003);
  doorBand.renderOrder = 3;
  leaf.add(doorBand);
  const [sgC, sgX] = paper.makeCanvas(1024, 400);
  paper.drawDoorSign(sgX, 1024, 400, 'R' + POD.roomNumber);
  const signTex = canvasTex(sgC);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  sign.position.set(0.04, 1.6, 0.004);
  sign.renderOrder = 4;
  leaf.add(sign);
  const steel = std('#c9ccd1', { metalness: 0.9, roughness: 0.25 });
  [-1, 1].forEach((s) => {
    const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.95, 12), steel);
    pull.position.set(-DW / 2 + 0.13, 1.05, s * 0.07);
    leaf.add(pull);
    [0.7, 1.4].forEach((y) => {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), steel);
      stand.rotation.x = Math.PI / 2;
      stand.position.set(-DW / 2 + 0.13, y, s * 0.035);
      leaf.add(stand);
    });
  });
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16), steel);
  lock.rotation.x = Math.PI / 2;
  lock.position.set(-DW / 2 + 0.06, 0.98, 0);
  leaf.add(lock);

  // ── Do lado de fora: piso tátil, número no chão, extintor, arandela ──
  const [tcC, tcX] = paper.makeCanvas(256, 256);
  paper.drawTactile(tcX, 256, 256);
  const tactTex = canvasTex(tcC);
  tactTex.wrapS = tactTex.wrapT = THREE.RepeatWrapping;
  tactTex.repeat.set(4, 1.2);
  const tactile = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), std('#ffffff', { map: tactTex, roughness: 0.8 }));
  tactile.rotation.x = -Math.PI / 2;
  tactile.position.set((dx0 + dx1) / 2, 0.003, ZF + 0.45);
  pod.add(tactile);
  const [fmC, fmX] = paper.makeCanvas(1024, 400);
  paper.drawDoorSign(fmX, 1024, 400, 'R' + POD.roomNumber);
  const floorMark = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.47), new THREE.MeshBasicMaterial({ map: canvasTex(fmC), transparent: true, opacity: 0.55, depthWrite: false }));
  floorMark.rotation.x = -Math.PI / 2;
  floorMark.position.set((dx0 + dx1) / 2 - 0.1, 0.004, ZF + 1.05);
  pod.add(floorMark);

  const ext = new THREE.Group();
  const red = std('#c8231c', { roughness: 0.35, metalness: 0.2 });
  const body = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 20), red));
  body.position.y = 0.32;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), red);
  dome.position.y = 0.57;
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 10), steel);
  valve.position.y = 0.64;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.07, 20), steel);
  stand.position.y = 0.035;
  ext.add(body, dome, valve, stand);
  ext.position.set(x1 + T + 0.16, 0, ZF - 0.35);
  ext.scale.setScalar(0.85);
  pod.add(ext);
  clickable(ext, 'extintor', () => bubbleAt(ext, 'Pra quando o deploy pega fogo.'));

  const sconce = new THREE.Group();
  const sconceBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.0), std('#2b2622', { roughness: 0.5 }));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.96), std('#3a3128', { roughness: 0.5 })); // arandela apagada
  glow.position.y = -0.033;
  sconce.add(sconceBar, glow);
  sconce.position.set(x1 + T + 0.03, 1.7, 0.2);
  pod.add(sconce);


  // ── Por dentro: TV, grelha do ar, quadro branco, pendente ──
  const [tvC, tvX] = paper.makeCanvas(1280, 720);
  const tvTex = canvasTex(tvC);
  const drawClock = () => { paper.drawTvScreen(tvX, 1280, 720, new Date(), 'REUNIAO' + POD.roomNumber); tvTex.needsUpdate = true; };
  drawClock();
  const tvVideo = makeVideo('/previews/visao-rede.mp4');
  const videoTex = new THREE.VideoTexture(tvVideo);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  const tv = new THREE.Group();
  tv.add(shadowy(new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.68, 0.045, 3, 0.008), std('#0a0a0a', { roughness: 0.25, metalness: 0.3 }))));
  const screenMat = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.63), screenMat);
  screen.position.z = 0.0235;
  tv.add(screen);
  tv.rotation.y = Math.PI / 2;
  tv.position.set(x0 + 0.04, 1.55, 0);
  pod.add(tv);
  let showingVision = false;
  clickable(tv, 'a TV da sala', () => {
    showingVision = !showingVision;
    screenMat.map = showingVision ? videoTex : tvTex;
    screenMat.needsUpdate = true;
    if (showingVision) tvVideo.play().catch(() => {});
    else tvVideo.pause();
    bubbleAt(tv, showingVision ? 'Uma mentoria vira hora complementar. Depois, mil mentorias.' : 'Sala reservada. Relógio de verdade, ao vivo.');
  });

  const [vtC, vtX] = paper.makeCanvas(256, 128);
  vtX.fillStyle = '#f5f5f3';
  vtX.fillRect(0, 0, 256, 128);
  vtX.fillStyle = '#9a9a96';
  for (let y = 20; y < 110; y += 14) vtX.fillRect(22, y, 212, 6);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.02), [white, white, white, white, std('#ffffff', { map: canvasTex(vtC), roughness: 0.6 }), white]);
  vent.position.set(-1.0, 1.95, ZB + 0.01);
  pod.add(vent);
  const switchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.012), white);
  switchPlate.position.set(-0.85, 1.25, ZB + 0.006);
  pod.add(switchPlate);

  const BW = 1600, BH = 900;
  const [wbC, wbX] = paper.makeCanvas(BW, BH);
  const [baseC, baseX] = paper.makeCanvas(BW, BH);
  paper.drawWhiteboard(baseX, BW, BH);
  wbX.drawImage(baseC, 0, 0);
  const boardTex = canvasTex(wbC);
  const boardFace = std('#ffffff', { map: boardTex, roughness: 0.22, metalness: 0.05 });
  const boardEdge = std('#e3e5e8', { roughness: 0.4 });
  const whiteboard = shadowy(new THREE.Mesh(new RoundedBoxGeometry(1.95, 1.12, 0.025, 5, 0.012), [boardEdge, boardEdge, boardEdge, boardEdge, boardFace, boardEdge]));
  whiteboard.rotation.y = -Math.PI / 2;
  whiteboard.position.set(x1 - 0.016, 1.52, -0.35);
  pod.add(whiteboard);
  const boardFoot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 1.9), std('#111'));
  boardFoot.position.set(x1 - 0.03, 0.965, -0.35);
  pod.add(boardFoot);
  clickable(whiteboard, 'o quadro da sprint', () => bubbleAt(whiteboard, 'Next steps: horas complementares, MIT e as 10 mentorias.'));

  // pendente verde-sálvia com luz quente
  const lamp = new THREE.Group();
  const sage = std('#b7c6b8', { roughness: 0.5, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.24, 0.22, 36, 1, true), sage);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20), sage);
  cap.position.y = 0.11;
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: '#ffe0a0' }));
  bulb.rotation.x = Math.PI / 2;
  bulb.position.y = -0.09;
  const ceilAt = RG - POD.cx * slope; // teto inclinado acima da mesa
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, ceilAt - 2.2, 6), std('#222'));
  cord.position.y = 0.11 + (ceilAt - 2.2) / 2;
  lamp.add(shade, cap, bulb, cord);
  lamp.position.set(0, 2.2 - 0.11, -0.05);
  furniture.add(lamp);

  // ── Luzes da sala ──
  // só a luminária do meio fica acesa: luz amarelada de escritório de startup à noite
  const key = new THREE.SpotLight('#ffd590', 4.2, 9, Math.PI / 2.6, 0.9, 1.3);
  key.position.set(0, 2.0, -0.05);
  key.target.position.set(0, 0.75, -0.05);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.2;
  furniture.add(key, key.target);
  // o resto da sala só recebe o que vaza da luminária
  const spill = new THREE.PointLight('#ffcd84', 1.5, 6, 1.6);
  spill.position.set(0, 1.95, -0.05);
  furniture.add(spill);


  // ── Mesa de carvalho e cadeiras ──
  const topMat = std('#ffffff', { map: tiled(oak, 1, 1), roughness: 0.5 });
  const tableTop = shadowy(new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.035, 1.15, 3, 0.008), topMat));
  tableTop.position.y = 0.7525;
  furniture.add(tableTop);
  const dark = std('#26262a', { roughness: 0.5, metalness: 0.4 });
  [[-0.72, -0.48], [0.72, -0.48], [-0.72, 0.48], [0.72, 0.48]].forEach(([x, z]) => {
    const leg = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.735, 0.05), dark));
    leg.position.set(x, 0.3675, z);
    furniture.add(leg);
  });
  const modesty = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.3, 0.02), dark));
  modesty.position.set(0, 0.58, -0.3);
  furniture.add(modesty);

  // Cadeira do Inteli (foto): encosto branco liso com furinhos só na parte de
  // baixo, assento preto, braços brancos sobre suportes cinza-escuros que
  // seguram o encosto, base de 5 pés com rodízios.
  const chairWhite = std('#e9e8e4', { roughness: 0.45 });
  const chairDark = std('#3b3c40', { roughness: 0.45, metalness: 0.35 });
  const blackSeat = std('#1f2023', { roughness: 0.42 });
  const holes = (() => {
    const [hc, hx] = paper.makeCanvas(256, 256);
    hx.fillStyle = '#e9e8e4';
    hx.fillRect(0, 0, 256, 256);
    hx.fillStyle = 'rgba(60,58,55,0.6)';
    for (let y = 150; y < 225; y += 11) {
      const spread = 0.42 - (y - 150) * 0.0012;
      for (let x = 128 - 256 * spread; x < 128 + 256 * spread; x += 12) {
        hx.beginPath(); hx.arc(x + ((y / 11) % 2) * 6, y, 2.4, 0, Math.PI * 2); hx.fill();
      }
    }
    return canvasTex(hc);
  })();
  const backMat = std('#ffffff', { map: holes, roughness: 0.45, side: THREE.DoubleSide });
  function officeChair(x, z, ry) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spoke = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.045), chairWhite));
      spoke.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15);
      spoke.rotation.y = -a;
      const caster = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), chairWhite);
      caster.position.set(Math.cos(a) * 0.29, 0.025, Math.sin(a) * 0.29);
      g.add(spoke, caster);
    }
    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.36, 12), chairDark);
    gas.position.y = 0.25;
    // assento preto, almofadado e arredondado
    const seat = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.47, 0.075, 0.45, 4, 0.034), blackSeat));
    seat.position.y = 0.47;
    const pan = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.025, 0.38, 2, 0.008), chairDark);
    pan.position.y = 0.425;
    // encosto: casca branca levemente curva, mais larga em cima
    const backGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 28, 1, true, Math.PI - 0.6, 1.2);
    const back = shadowy(new THREE.Mesh(backGeo, backMat));
    back.position.set(0, 0.84, 0.21);
    back.rotation.x = -0.1;
    g.add(gas, seat, pan, back);
    [-1, 1].forEach((s) => {
      // suporte em L cinza-escuro: sai de baixo do assento e sobe até o encosto
      const low = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.3), chairDark));
      low.position.set(s * 0.235, 0.44, -0.06);
      const up = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.035), chairDark));
      up.position.set(s * 0.235, 0.57, -0.2);
      up.rotation.x = -0.1;
      // braço branco largo por cima
      const arm = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.028, 0.26, 3, 0.012), chairWhite));
      arm.position.set(s * 0.25, 0.67, -0.03);
      const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.04), chairDark);
      armPost.position.set(s * 0.25, 0.56, -0.05);
      g.add(low, up, arm, armPost);
    });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    furniture.add(g);
  }
  officeChair(-0.36, 0.95, Math.PI + 0.05);
  officeChair(0.42, 0.98, Math.PI - 0.12);
  officeChair(-0.34, -0.95, 0.08);
  officeChair(0.42, -0.92, -0.06);
  // a cadeira que ficou para trás, virada para o quadro
  officeChair(1.15, 0.6, -Math.PI / 2 - 0.4);

  // cadeira de visita (tecido cinza, estrutura preta) encostada sob o quadro
  const [fbC, fbX] = paper.makeCanvas(256, 256);
  paper.drawNoise(fbX, 256, 256, '#8a8e86', 34, 9);
  const fabricTex = canvasTex(fbC);
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(3, 3);
  const fabric = std('#ffffff', { map: fabricTex, roughness: 1 });
  const blackSteel = std('#121214', { roughness: 0.4, metalness: 0.6 });
  function sideChair(x, z, ry) {
    const g = new THREE.Group();
    const seat = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.06, 0.42, 2, 0.02), fabric));
    seat.position.y = 0.46;
    const back = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.26, 0.05, 2, 0.02), fabric));
    back.position.set(0, 0.78, -0.2);
    g.add(seat, back);
    [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.2], [0.21, 0.2]].forEach(([lx, lz]) => {
      const tall = lz < 0;
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, tall ? 0.92 : 0.45, 0.016), blackSteel);
      l.position.set(lx, tall ? 0.46 : 0.225, lz);
      g.add(l);
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.016, 0.016), blackSteel);
    rail.position.set(0, 0.91, -0.21);
    g.add(rail);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    furniture.add(g);
  }
  sideChair(1.75, ZB + 0.3, 0);

  // material de mesa: bandeja de papel, porta-lápis de tela, grampeador azul
  const onTable = 0.77;
  const trayMat = std('#c9ccd2', { roughness: 0.4, metalness: 0.5 });
  const tray = new THREE.Group();
  const trayBase = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.006, 0.32), trayMat));
  const paperSheet = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.01, 0.29), std('#fbfbf8', { roughness: 0.9 }));
  paperSheet.position.y = 0.007;
  tray.add(trayBase, paperSheet);
  [[-0.12, 0, 0.006, 0.32], [0.12, 0, 0.006, 0.32]].forEach(([x, , w, d]) => {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), trayMat);
    lip.position.set(x, 0.015, 0);
    tray.add(lip);
  });
  tray.position.set(-0.08, onTable + 0.003, -0.42);
  tray.rotation.y = Math.PI / 2 + 0.06;
  furniture.add(tray);
  const cup = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.09, 20, 1, true), std('#8fb6d6', { roughness: 0.5, metalness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide })));
  cup.position.set(-0.66, onTable + 0.045, -0.42);
  furniture.add(cup);
  ['#1f3a8a', '#d2372b', '#1f8a4c', '#111'].forEach((c, i) => {
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8), std(c, { roughness: 0.4 }));
    pen.position.set(-0.66 + Math.cos(i * 1.7) * 0.012, onTable + 0.1, -0.42 + Math.sin(i * 1.7) * 0.012);
    pen.rotation.set(Math.sin(i) * 0.15, 0, Math.cos(i * 2) * 0.15);
    furniture.add(pen);
  });
  const stapler = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.04, 0.045, 3, 0.015), std('#2f6fd6', { roughness: 0.35 })));
  stapler.position.set(0.12, onTable + 0.02, -0.47);
  stapler.rotation.y = 0.1;
  furniture.add(stapler);
  const cableCover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.06), std('#7a1f24', { roughness: 0.6 }));
  cableCover.position.set(0.45, onTable + 0.002, -0.5);
  furniture.add(cableCover);

  // ── Cauan e Bruno em 3D, escrevendo no quadro ──
  const writersGroup = new THREE.Group();
  pod.add(writersGroup);
  // O que cada um escreve no quadro, linha por linha (coordenadas do quadro, em px).
  const BOARD_LINES = {
    bruno: [
      { text: '☐ fechar as 10 mentorias', x: 80, y: 420, color: '#222' },
      { text: '☐ deploy do bot no Slack', x: 80, y: 500, color: '#222' },
      { text: 'abrir pra todo mundo?', x: 80, y: 600, color: '#d2372b' },
      { text: '→ ainda não', x: 120, y: 670, color: '#d2372b' },
    ],
    cauan: [
      { text: '• reunião MIT', x: 928, y: 460, color: '#111' },
      { text: '10:00 – 17:30', x: 976, y: 526, color: '#1f3a8a' },
      { text: '• registro #008', x: 928, y: 640, color: '#111' },
      { text: '• EP 03 no YouTube', x: 928, y: 730, color: '#111' },
    ],
  };
  const FONT = '600 58px "Caveat"';
  wbX.font = FONT;
  Object.values(BOARD_LINES).forEach((lines) => lines.forEach((l) => { l.w = wbX.measureText(l.text).width; }));
  const boardX = x1 - 0.016 - 0.0125; // face do quadro, no espaço da sala
  const toPod = (px, py) => new THREE.Vector3(boardX, 1.52 + (0.5 - py / BH) * 1.12, -0.35 + (px / BW - 0.5) * 1.95);

  const people = [['bruno', -0.85, 0, [-1.4, -0.6]], ['cauan', -0.02, 0.37, [-0.3, 0.45]]].map(([who, z, phase, range]) => {
    const person = buildPerson(who, { std, shadowy, boardDistance: 0.44, phase });
    person.root.rotation.y = Math.PI / 2;
    person.root.position.set(x1 - 0.47, 0, z);
    writersGroup.add(person.root);
    person.who = who;
    person.range = range;
    person.state = { line: 0, prog: 0, mode: 'travel', timer: 0.6 + phase * 2, fade: 1 };
    return person;
  });

  // Avança a escrita, desenha o quadro e posiciona a mão de cada um na caneta.
  const SPEED = 120; // px por segundo
  const inv = new THREE.Matrix4();
  let redraw = 0;
  function updateWriters(dt, time) {
    let dirty = false;
    people.forEach((p) => {
      const lines = BOARD_LINES[p.who];
      const st = p.state;
      const ln = lines[st.line];
      st.timer -= dt;
      if (st.mode === 'write') {
        st.prog += SPEED * dt;
        dirty = true;
        if (st.prog >= ln.w) {
          st.prog = ln.w;
          if (st.line < lines.length - 1) { st.mode = 'travel'; st.timer = 0.7; }
          else { st.mode = 'hold'; st.timer = 7; }
        }
      } else if (st.mode === 'travel' && st.timer <= 0) {
        if (st.prog >= ln.w && st.line < lines.length - 1) st.line++;
        st.prog = 0;
        st.mode = 'write';
      } else if (st.mode === 'hold' && st.timer <= 0) {
        st.mode = 'erase';
        st.timer = 1.2;
      } else if (st.mode === 'erase') {
        st.fade = Math.max(0, st.timer / 1.2);
        dirty = true;
        if (st.timer <= 0) { st.line = 0; st.prog = 0; st.fade = 1; st.mode = 'travel'; st.timer = 1.5; }
      }

      // caneta: no fim do texto já escrito, tremendo como letra
      const cur = lines[st.line];
      const writingNow = st.mode === 'write';
      let px = cur.x + st.prog, py = cur.y - 24;
      if (writingNow) py += Math.sin(time * 17) * 11 + Math.cos(time * 7.5) * 5;
      if (st.mode === 'travel') {
        // caneta levantada, indo do fim de uma linha para o começo da próxima
        const next = st.prog >= cur.w && lines[st.line + 1] ? lines[st.line + 1] : cur;
        const from = st.prog >= cur.w ? [cur.x + cur.w, cur.y] : [cur.x, cur.y];
        const k2 = 1 - Math.max(0, st.timer) / 0.7;
        const e = k2 * k2 * (3 - 2 * k2);
        px = from[0] + (next.x - from[0]) * e;
        py = from[1] + (next.y - from[1]) * e - 24 - Math.sin(Math.PI * e) * 30;
      }
      const target = toPod(px, py);
      // o corpo acompanha a caneta pela lousa (a mão direita fica à frente)
      const wantZ = THREE.MathUtils.clamp(target.z - 0.17 * p.scale, p.range[0], p.range[1]);
      p.root.position.z += (wantZ - p.root.position.z) * Math.min(1, dt * 1.8);
      p.root.updateMatrix();
      inv.copy(p.root.matrix).invert();
      const local = target.clone().applyMatrix4(inv);
      local.z = p.handZ;
      p.update(time, { target: local, down: writingNow });
    });

    redraw -= dt;
    if (dirty && redraw <= 0) {
      redraw = 1 / 24;
      wbX.drawImage(baseC, 0, 0);
      wbX.font = FONT;
      people.forEach((p) => {
        const st = p.state;
        BOARD_LINES[p.who].forEach((l, i) => {
          if (i > st.line) return;
          const shown = i < st.line ? l.w : st.mode === 'travel' && st.prog < l.w ? 0 : st.prog;
          if (shown <= 0) return;
          wbX.save();
          wbX.globalAlpha = st.fade;
          wbX.beginPath();
          wbX.rect(l.x - 20, l.y - 70, shown + 20, 100);
          wbX.clip();
          wbX.fillStyle = l.color;
          wbX.fillText(l.text, l.x, l.y);
          wbX.restore();
        });
      });
      boardTex.needsUpdate = true;
    }
  }
  clickable(writersGroup, 'Cauan e Bruno na lousa', () => bubbleAt(writersGroup, 'Planejando os next steps. Ninguém apaga o quadro antes de tirar foto.'));

  // mochila cinza largada numa cadeira, como no vídeo
  const bagMat = std('#4a4d52', { roughness: 0.9 });
  const bag = new THREE.Group();
  const bagBody = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.42, 0.17, 4, 0.06), bagMat));
  bagBody.position.y = 0.21;
  const pocket = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 0.06, 3, 0.03), std('#3c3f44', { roughness: 0.9 })));
  pocket.position.set(0, 0.14, 0.1);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.008), std('#1a1a1a'));
  zip.position.set(0, 0.25, 0.132);
  const handleTop = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16, Math.PI), bagMat);
  handleTop.position.set(0, 0.42, 0);
  bag.add(bagBody, pocket, zip, handleTop);
  bag.position.set(-0.38, 0.5, 1.0);
  bag.rotation.set(-0.35, 0.3, 0.08);
  furniture.add(bag);

  clickable(shellGroup, 'Sala R07 · escritório da Be My Mentor (às vezes)', () => bubbleAt(shellGroup, 'Sala R07 do Inteli: o escritório da Be My Mentor, às vezes.'));

  return {
    onTable,
    duct,
    people,
    updateWriters,
    boardCanvas: wbC,
    key,
    lamp,
    roof,
    outside,
    door,
    tv,
    tvVideo,
    drawClock,
    exteriorLights: [],
    beam: { x: 0, top: 2.0, z: -0.05 },
  };
}
