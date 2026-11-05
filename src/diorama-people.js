// Cauan e Bruno em 3D, escrevendo no quadro (referência: o vídeo deles na R07).
// Personagens montados com formas simples, em escala humana, com braços em
// IK de dois ossos: a mão segue a "caneta" no quadro e o outro braço descansa.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Aparência tirada do vídeo: Cauan de óculos, cabelo cacheado até o ombro,
// barba, moletom azul-marinho e calça bege; Bruno de moletom preto com
// estampa branca no peito, cabelo curto escuro e calça escura.
export const LOOKS = {
  // rostos e cabelos a partir da foto da escada: Cauan de pele morena escura,
  // cavanhaque e bigode, óculos de armação escura; Bruno de
  // pele morena clara, rosto fino. Os dois com o mesmo corte: topete varrido.
  cauan: {
    height: 1.78, hoodie: '#27324f', hoodieDark: '#1b2338', pants: '#c3ad86', skin: '#94603f',
    hair: '#120d0a', hairStyle: 'straight-medium', beard: true, glasses: true, freeArm: 'hip', faceW: 0.9,
  },
  bruno: {
    height: 1.74, hoodie: '#1d1d21', hoodieDark: '#121215', pants: '#25272c', skin: '#d29c78',
    hair: '#18120e', hairStyle: 'straight-short', beard: false, glasses: false, freeArm: 'hang', print: true, faceW: 0.86,
  },
};

const UP = new THREE.Vector3(0, 1, 0);

function noiseTexture(base, spread, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  const img = x.getImageData(0, 0, 128, 128);
  let s = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s / 2147483647) - 0.5) * spread;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// Segmento (capsula) entre dois pontos.
function placeSegment(mesh, a, b) {
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.scale.set(1, len / mesh.userData.len, 1);
}

// IK de dois ossos: devolve a posição do cotovelo.
function solveArm(S, T, L1, L2, pole) {
  const v = new THREE.Vector3().subVectors(T, S);
  const d = THREE.MathUtils.clamp(v.length(), 0.05, L1 + L2 - 0.002);
  v.normalize();
  const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const axis = new THREE.Vector3().crossVectors(v, pole).normalize();
  const upper = v.clone().applyAxisAngle(axis, a);
  return S.clone().add(upper.multiplyScalar(L1));
}

export function buildPerson(who, { std, shadowy, boardDistance = 0.44, phase = 0 }) {
  const L = LOOKS[who];
  const k = L.height / 1.75; // todas as medidas abaixo são para 1,75 m
  const root = new THREE.Group();
  const body = new THREE.Group(); // gira um pouco com a escrita
  root.add(body);
  root.scale.setScalar(k);

  const fabric = (c, seed) => std('#ffffff', { map: noiseTexture(c, 26, seed), roughness: 0.97 });
  const hoodie = fabric(L.hoodie, 3);
  const hoodieDark = std(L.hoodieDark, { roughness: 0.97 });
  const pants = fabric(L.pants, 7);
  const skin = std(L.skin, { roughness: 0.6 });
  const hair = std(L.hair, { roughness: 0.75 });
  const white = std('#efeee9', { roughness: 0.6 });
  const sole = std('#bdbab3', { roughness: 0.8 });

  const capsule = (r, len, mat) => {
    const m = shadowy(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat));
    m.userData.len = len + 2 * r;
    return m;
  };

  // ── pernas e tênis ──
  [-1, 1].forEach((s) => {
    const hip = new THREE.Vector3(s * 0.095, 0.95, 0);
    const knee = new THREE.Vector3(s * 0.1, 0.5, 0.015);
    const ankle = new THREE.Vector3(s * 0.105, 0.09, -0.01);
    const thigh = capsule(0.07, 0.3, pants);
    placeSegment(thigh, hip, knee);
    const shin = capsule(0.054, 0.3, pants);
    placeSegment(shin, knee, ankle);
    const shoe = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 0.27, 3, 0.035), white));
    shoe.position.set(s * 0.105, 0.045, 0.04);
    shoe.rotation.y = s * 0.08;
    const soleM = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.022, 0.275, 2, 0.01), sole);
    soleM.position.set(s * 0.105, 0.011, 0.04);
    soleM.rotation.y = s * 0.08;
    const kneeJ = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), pants));
    kneeJ.position.copy(knee);
    root.add(thigh, shin, kneeJ, shoe, soleM);
  });
  const pelvis = shadowy(new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.07, 6, 14), pants));
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(1, 1, 0.72);
  pelvis.position.y = 0.95;
  root.add(pelvis);

  // ── tronco do moletom ──
  // tronco: cilindro levemente afunilado + peito/ombros arredondados
  const torso = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.185, 0.38, 24, 1, true), hoodie));
  torso.scale.set(1, 1, 0.64);
  torso.position.y = 1.2;
  const chest = shadowy(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), hoodie));
  chest.scale.set(0.2, 0.13, 0.128);
  chest.position.y = 1.385;
  const hem = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.055, 24), hoodieDark));
  hem.scale.set(1, 1, 0.64);
  hem.position.y = 1.0;
  body.add(torso, chest, hem);
  [-1, 1].forEach((s) => {
    const sh = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), hoodie));
    sh.position.set(s * 0.185, 1.42, 0);
    body.add(sh);
  });
  // capuz caído nas costas
  const hoodRing = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.045, 10, 24, Math.PI), hoodieDark));
  hoodRing.rotation.x = -Math.PI / 2 + 0.35;
  hoodRing.position.set(0, 1.49, -0.02);
  const hoodDrape = shadowy(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hoodie));
  hoodDrape.scale.set(0.15, 0.13, 0.05);
  hoodDrape.position.set(0, 1.36, -0.105);
  body.add(hoodRing, hoodDrape);
  if (L.print) {
    const print = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), std('#e9e7e1', { roughness: 0.8 }));
    print.position.set(-0.06, 1.37, 0.117);
    body.add(print);
  }

  // ── cabeça no estilo de animação 3D: cabeça um pouco maior, olhos grandes,
  // sobrancelhas grossas, nariz arredondado e cabelo esculpido em mechas ──
  const neck = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.14, 16), skin));
  neck.position.set(0, 1.53, -0.008);
  body.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 1.665, 0);
  head.scale.setScalar(1.22);
  body.add(head);
  const fw = L.faceW;
  const toonSkin = new THREE.MeshPhysicalMaterial({ color: L.skin, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffb59a'), sheenRoughness: 0.6 });
  // crânio arredondado afinando num queixo pequeno
  const skull = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 28), toonSkin));
  skull.scale.set(fw * 0.98, 1.06, 1.0);
  skull.position.set(0, 0.012, -0.006);
  const jaw = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 22), toonSkin));
  jaw.scale.set(fw * 0.96, 0.8, 0.84);
  jaw.position.set(0, -0.038, 0.008);
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.025, 18, 14), toonSkin);
  chin.scale.set(1.2, 0.85, 0.9);
  chin.position.set(0, -0.075, 0.046);
  head.add(skull, jaw, chin);
  const sclera = std('#fbf9f5', { roughness: 0.15 });
  const irisM = std(who === 'cauan' ? '#3b2416' : '#4a2f1d', { roughness: 0.25 });
  const pupilM = std('#0b0807', { roughness: 0.1 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const browM = std(L.hair, { roughness: 0.8 });
  const blush = std(new THREE.Color(L.skin).lerp(new THREE.Color('#e7826e'), 0.35).getStyle(), { roughness: 0.6 });
  [-1, 1].forEach((sx) => {
    // orelhas grandes e redondas
    const ear = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 14), toonSkin));
    ear.scale.set(0.42, 1.0, 0.78);
    ear.position.set(sx * 0.094 * fw / 0.9, -0.002, -0.012);
    ear.rotation.y = sx * 0.35;
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), blush);
    earIn.scale.set(0.3, 0.85, 0.6);
    earIn.position.set(sx * 0.1 * fw / 0.9, -0.002, -0.006);
    // olho grande: esclera, íris, pupila e brilho
    const eyeG = new THREE.Group();
    eyeG.position.set(sx * 0.036, 0.012, 0.074);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.021, 24, 18), sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 20, 14), irisM);
    iris.scale.set(1, 1, 0.45);
    iris.position.z = 0.0175;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 10), pupilM);
    pupil.scale.set(1, 1, 0.4);
    pupil.position.z = 0.0215;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), shine);
    glint.position.set(0.004, 0.005, 0.0232);
    // pálpebra de cima, um pouco caída
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0225, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), toonSkin);
    lid.rotation.x = 0.55;
    eyeG.add(ball, iris, pupil, glint, lid);
    eyeG.rotation.y = sx * 0.12;
    // sobrancelha grossa e arqueada
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0062, 8, 18, Math.PI * 0.62), browM);
    brow.rotation.set(0.1, sx * 0.25, Math.PI / 2 - Math.PI * 0.31 + sx * 0.05);
    brow.position.set(sx * 0.038, 0.016, 0.092);
    // bochecha corada
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), blush);
    cheek.scale.set(1, 0.65, 0.35);
    cheek.position.set(sx * 0.054, -0.02, 0.078);
    head.add(ear, earIn, eyeG, brow, cheek);
  });
  // nariz arredondado
  const noseB = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.022, 6, 10), toonSkin);
  noseB.rotation.x = 0.45;
  noseB.position.set(0, -0.006, 0.098);
  const noseT = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), std(new THREE.Color(L.skin).lerp(new THREE.Color('#e7826e'), 0.12).getStyle(), { roughness: 0.55 }));
  noseT.scale.set(1.1, 0.9, 1);
  noseT.position.set(0, -0.022, 0.104);
  // sorriso de canto
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0034, 6, 20, Math.PI * 0.55), std('#5a2a22', { roughness: 0.5 }));
  smile.rotation.set(0.25, 0, Math.PI + Math.PI * 0.22);
  smile.position.set(0.004, -0.038, 0.094);
  head.add(noseB, noseT, smile);

  if (L.beard) {
    // cavanhaque e bigode esculpidos
    const beardM = std(L.hair, { roughness: 0.7 });
    const goatee = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.02, 18, 14), beardM));
    goatee.scale.set(1.2, 1.0, 0.7);
    goatee.position.set(0, -0.082, 0.056);
    const mustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.03, 4, 10), beardM);
    mustache.rotation.z = Math.PI / 2;
    mustache.position.set(0, -0.03, 0.1);
    head.add(goatee, mustache);
  }
  if (L.glasses) {
    const frameM = std('#141414', { roughness: 0.25, metalness: 0.2 });
    const lensM = new THREE.MeshPhysicalMaterial({ color: '#d9e6f0', roughness: 0.02, transparent: true, opacity: 0.18 });
    [-1, 1].forEach((sx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.0042, 10, 32), frameM);
      rim.position.set(sx * 0.037, 0.012, 0.1);
      rim.rotation.y = sx * 0.12;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 28), lensM);
      lens.position.copy(rim.position);
      lens.rotation.y = sx * 0.12;
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0055, 0.1), frameM);
      temple.position.set(sx * 0.082 * fw / 0.9, 0.016, 0.05);
      temple.rotation.y = -sx * 0.1;
      head.add(rim, lens, temple);
    });
    const bridgeG = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.003, 6, 12, Math.PI), frameM);
    bridgeG.position.set(0, 0.016, 0.106);
    head.add(bridgeG);
  }

  // ── cabelo esculpido no estilo de animação, igual para os dois: base lisa e
  // rente nas laterais + topete de mechas grossas, curvas, varridas para trás.
  // O do Cauan é um pouco mais alto e mais longo atrás. ──
  let seed = who === 'cauan' ? 11 : 23;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hairM = new THREE.MeshPhysicalMaterial({ color: L.hair, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  const lockGeo = (() => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector2(0.032 * Math.pow(1 - t, 0.55) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 2.2))) + 0.002, t * 0.07));
    }
    const g = new THREE.LatheGeometry(pts, 14);
    g.scale(1, 1, 0.65);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i) / 0.07;
      pa.setZ(i, pa.getZ(i) - y * y * 0.035);
    }
    g.computeVertexNormals();
    return g;
  })();
  const addLock = (pos, dir, size, bend = 0.4) => {
    const m = shadowy(new THREE.Mesh(lockGeo, hairM));
    m.position.copy(pos);
    m.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    m.rotateX(bend * 0.3);
    m.scale.setScalar(size);
    head.add(m);
  };
  const tall = who === 'cauan' ? 1.15 : 1;
  const cap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.106, 36, 22, 0, Math.PI * 2, 0, 1.72), hairM));
  cap.scale.set(fw * 1.04, 1.08, 1.06);
  cap.rotation.x = -0.62;
  cap.position.set(0, 0.018, -0.012);
  head.add(cap);
  const rows = [
    { z: 0.075, y: 0.078, dir: [1, 0.35], size: 1.25 },
    { z: 0.04, y: 0.1, dir: [0.8, -0.45], size: 1.1 },
    { z: 0.0, y: 0.11, dir: [0.55, -0.85], size: 1.0 },
    { z: -0.045, y: 0.098, dir: [0.35, -1], size: 0.9 },
  ];
  if (who === 'cauan') rows.push({ z: -0.085, y: 0.07, dir: [0.1, -1], size: 0.85 });
  rows.forEach((r, ri) => {
    const n = ri === 0 ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * 0.12 * fw + (rand() - 0.5) * 0.01;
      const y = r.y - x * x * 3;
      const dir = new THREE.Vector3(x * 1.2, r.dir[0], r.dir[1]);
      addLock(new THREE.Vector3(x, y, r.z), dir, r.size * tall * (0.85 + rand() * 0.3));
    }
  });

  // ── braços (posicionados a cada quadro pelo IK) ──
  const L1 = 0.29, L2 = 0.265;
  const arms = [-1, 1].map((s) => {
    const upper = capsule(0.05, 0.2, hoodie);
    const lower = capsule(0.043, 0.19, hoodie);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.04, 14), hoodieDark);
    cuff.userData.len = 0.04;
    const hand = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), skin));
    hand.scale.set(0.8, 1.15, 0.55);
    const elbow = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 10), hoodie));
    root.add(upper, lower, elbow, cuff, hand);
    return { s, upper, lower, elbow, cuff, hand, shoulder: new THREE.Vector3(s * 0.19, 1.42, 0) };
  });
  // a mão direita escreve (para quem está de frente pro quadro, a direita é -x)
  const writing = arms.find((a) => a.s < 0);
  const free = arms.find((a) => a.s > 0);
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.13, 10), std('#1f3a8a', { roughness: 0.4 }));
  root.add(marker);

  const boardZ = boardDistance / k;
  const tmpS = new THREE.Vector3(), tmpT = new THREE.Vector3(), tmpE = new THREE.Vector3();
  function poseArm(arm, target, pole) {
    tmpS.copy(arm.shoulder).applyMatrix4(body.matrix);
    tmpE.copy(solveArm(tmpS, target, L1, L2, pole));
    placeSegment(arm.upper, tmpS, tmpE);
    arm.elbow.position.copy(tmpE);
    const fDir = new THREE.Vector3().subVectors(target, tmpE).normalize();
    const wrist = target.clone().addScaledVector(fDir, -0.05);
    placeSegment(arm.lower, tmpE, wrist);
    placeSegment(arm.cuff, wrist.clone().addScaledVector(fDir, -0.03), wrist.clone().addScaledVector(fDir, 0.005));
    arm.hand.position.copy(target).addScaledVector(fDir, -0.01);
    arm.hand.quaternion.setFromUnitVectors(UP, fDir.clone().negate());
    return fDir;
  }

  // pen: { target: Vector3 (no espaço do personagem), down: bool } ou null
  function update(time, pen = null) {
    const t = time + phase * 10;
    body.rotation.y = -0.12 + Math.sin(t * 0.55) * 0.05;
    body.rotation.x = 0.04;
    body.updateMatrix();
    head.rotation.set(-0.1 + Math.sin(t * 0.7) * 0.03, -0.2 + Math.sin(t * 0.4) * 0.06, Math.sin(t * 0.5) * 0.04);

    if (pen) {
      tmpT.copy(pen.target);
      if (!pen.down) tmpT.z -= 0.05 / k;
      // olha para onde está escrevendo
      head.rotation.x = THREE.MathUtils.clamp((1.62 - tmpT.y) * 0.8, -0.3, 0.4);
    } else {
      tmpT.set(0.02 - 0.15 * (Math.sin(t * 0.3) * 0.5 + 0.5), 1.6, boardZ - 0.07);
    }
    const fDir = poseArm(writing, tmpT.clone(), new THREE.Vector3(-1, -0.7, -0.5).normalize());
    marker.position.copy(tmpT).addScaledVector(fDir, 0.045);
    marker.quaternion.setFromUnitVectors(UP, new THREE.Vector3(fDir.x * 0.4, fDir.y * 0.4, 1).normalize());

    if (L.freeArm === 'hip') {
      tmpT.set(0.21, 1.02, 0.02);
      poseArm(free, tmpT.clone(), new THREE.Vector3(1, 0.1, -0.6).normalize());
    } else {
      tmpT.set(0.25 + Math.sin(t * 0.8) * 0.01, 0.93, 0.05 + Math.sin(t * 0.6) * 0.02);
      poseArm(free, tmpT.clone(), new THREE.Vector3(0.3, 0, -1).normalize());
    }
  }
  // distância do quadro em coordenadas do personagem (para a mão encostar)
  const handZ = boardZ - 0.065 / k;
  update(0);
  return { root, update, scale: k, handZ };
}
