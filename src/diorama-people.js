// Cauan e Bruno em 3D, escrevendo no quadro (referência: o vídeo deles na R07).
// Personagens montados com formas simples, em escala humana, com braços em
// IK de dois ossos: a mão segue a "caneta" no quadro e o outro braço descansa.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Aparência tirada do vídeo: Cauan de óculos, cabelo cacheado até o ombro,
// barba, moletom azul-marinho e calça bege; Bruno de moletom preto com
// estampa branca no peito, cabelo curto escuro e calça escura.
export const LOOKS = {
  cauan: {
    height: 1.78, hoodie: '#27324f', hoodieDark: '#1b2338', pants: '#c3ad86', skin: '#b98563',
    hair: '#17110d', hairStyle: 'curly', beard: true, glasses: true, freeArm: 'hip',
  },
  bruno: {
    height: 1.72, hoodie: '#1d1d21', hoodieDark: '#121215', pants: '#25272c', skin: '#c99677',
    hair: '#16110d', hairStyle: 'short', beard: false, glasses: false, freeArm: 'hang', print: true,
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
    const thigh = capsule(0.078, 0.3, pants);
    placeSegment(thigh, hip, knee);
    const shin = capsule(0.062, 0.3, pants);
    placeSegment(shin, knee, ankle);
    const shoe = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 0.27, 3, 0.035), white));
    shoe.position.set(s * 0.105, 0.045, 0.04);
    shoe.rotation.y = s * 0.08;
    const soleM = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.022, 0.275, 2, 0.01), sole);
    soleM.position.set(s * 0.105, 0.011, 0.04);
    soleM.rotation.y = s * 0.08;
    root.add(thigh, shin, shoe, soleM);
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

  // ── pescoço, cabeça, rosto ──
  const neck = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 14), skin));
  neck.position.y = 1.53;
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.64;
  body.add(head);
  const skull = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 20), skin));
  skull.scale.set(0.93, 1.1, 1);
  head.add(skull);
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skin);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(s * 0.098, -0.005, -0.005);
    head.add(ear);
  });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 8), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.105);
  head.add(nose);
  if (L.beard) {
    const beard = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.45), hair));
    beard.scale.set(1.02, 1.05, 1.02);
    beard.position.set(0, -0.01, 0.012);
    head.add(beard);
  }
  if (L.glasses) {
    const frameM = std('#151515', { roughness: 0.3, metalness: 0.4 });
    [-1, 1].forEach((s) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 20), frameM);
      lens.position.set(s * 0.037, 0.018, 0.103);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frameM);
      temple.position.set(s * 0.093, 0.02, 0.055);
      head.add(lens, temple);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.004), frameM);
    bridge.position.set(0, 0.022, 0.106);
    head.add(bridge);
  }

  // ── cabelo ──
  let seed = who === 'cauan' ? 11 : 23;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (L.hairStyle === 'short') {
    const cap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.114, 28, 18, 0, Math.PI * 2, 0, 2.05), hair));
    cap.scale.set(0.97, 1.1, 1.04);
    cap.rotation.x = -0.62;
    cap.position.set(0, 0.012, -0.006);
    head.add(cap);
    const tuft = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), hair, 90);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2, b = rand() * 1.25;
      const dir = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a) - 0.15).normalize();
      m.makeTranslation(dir.x * 0.112, dir.y * 0.118 + 0.01, dir.z * 0.112);
      tuft.setMatrixAt(i, m);
    }
    tuft.castShadow = true;
    head.add(tuft);
  } else {
    // cachos: casca de bolinhas por cima e atrás da cabeça, caindo até o ombro
    const N = 420;
    const curls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), hair, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    while (n < N) {
      let px, py, pz;
      if (n < 260) {
        const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
        if (dir.z > 0.35 && dir.y < 0.55) continue; // deixa o rosto livre
        if (dir.y < -0.35) continue;
        const r = 0.112 + rand() * 0.018;
        px = dir.x * r * 1.02; py = dir.y * r * 1.08 + 0.015; pz = dir.z * r - 0.005;
      } else {
        // cortina de cachos atrás e dos lados, até a altura do ombro
        const ang = (rand() * 1.6 - 0.8) * Math.PI + Math.PI; // em volta da nuca
        if (Math.cos(ang) > 0.55) continue;
        const r = 0.105 + rand() * 0.03;
        px = Math.sin(ang) * r; pz = Math.cos(ang) * r * 0.95 - 0.01;
        py = -0.02 - rand() * 0.17;
      }
      const size = 0.017 + rand() * 0.011;
      p.set(px, py, pz);
      q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, 0));
      sc.setScalar(size);
      m.compose(p, q, sc);
      curls.setMatrixAt(n++, m);
    }
    curls.castShadow = true;
    head.add(curls);
  }

  // ── braços (posicionados a cada quadro pelo IK) ──
  const L1 = 0.29, L2 = 0.265;
  const arms = [-1, 1].map((s) => {
    const upper = capsule(0.05, 0.2, hoodie);
    const lower = capsule(0.043, 0.19, hoodie);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.04, 14), hoodieDark);
    cuff.userData.len = 0.04;
    const hand = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), skin));
    hand.scale.set(0.8, 1.15, 0.55);
    root.add(upper, lower, cuff, hand);
    return { s, upper, lower, cuff, hand, shoulder: new THREE.Vector3(s * 0.19, 1.42, 0) };
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
    const fDir = new THREE.Vector3().subVectors(target, tmpE).normalize();
    const wrist = target.clone().addScaledVector(fDir, -0.05);
    placeSegment(arm.lower, tmpE, wrist);
    placeSegment(arm.cuff, wrist.clone().addScaledVector(fDir, -0.03), wrist.clone().addScaledVector(fDir, 0.005));
    arm.hand.position.copy(target).addScaledVector(fDir, -0.01);
    arm.hand.quaternion.setFromUnitVectors(UP, fDir.clone().negate());
    return fDir;
  }

  function update(time) {
    const t = time + phase * 10;
    // corpo acompanha a escrita
    body.rotation.y = -0.12 + Math.sin(t * 0.55) * 0.06;
    body.rotation.x = 0.04;
    body.updateMatrix();
    head.rotation.set(-0.12 + Math.sin(t * 0.7) * 0.03, -0.18 + Math.sin(t * 0.4) * 0.08, Math.sin(t * 0.5) * 0.04);

    // a caneta anda da esquerda para a direita, linha por linha
    const speed = 0.16;
    const cycle = t * speed;
    const line = Math.floor(cycle) % 3;
    const prog = cycle - Math.floor(cycle);
    const lift = prog > 0.92 ? Math.sin(((prog - 0.92) / 0.08) * Math.PI) * 0.04 : 0;
    tmpT.set(
      0.02 - 0.3 * prog,
      1.74 - line * 0.08 + Math.sin(t * 13) * 0.012 + Math.sin(t * 5.3) * 0.008 + lift,
      boardZ - 0.07 - lift * 0.6,
    );
    const fDir = poseArm(writing, tmpT.clone(), new THREE.Vector3(-1, -0.7, -0.5).normalize());
    marker.position.copy(tmpT).addScaledVector(fDir, 0.04);
    marker.quaternion.setFromUnitVectors(UP, new THREE.Vector3(fDir.x * 0.4, fDir.y * 0.4, 1).normalize());

    if (L.freeArm === 'hip') {
      tmpT.set(0.21, 1.02, 0.02);
      poseArm(free, tmpT.clone(), new THREE.Vector3(1, 0.1, -0.6).normalize());
    } else {
      tmpT.set(0.25 + Math.sin(t * 0.8) * 0.01, 0.93, 0.05 + Math.sin(t * 0.6) * 0.02);
      poseArm(free, tmpT.clone(), new THREE.Vector3(0.3, 0, -1).normalize());
    }
  }
  update(0);
  return { root, update };
}
