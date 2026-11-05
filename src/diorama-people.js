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
  // cachos volumosos, cavanhaque e bigode, óculos de armação escura; Bruno de
  // pele morena clara, rosto fino, cabelo liso curto penteado para frente.
  cauan: {
    height: 1.78, hoodie: '#27324f', hoodieDark: '#1b2338', pants: '#c3ad86', skin: '#86573a',
    hair: '#120d0a', hairStyle: 'curly', beard: true, glasses: true, freeArm: 'hip', faceW: 0.9,
  },
  bruno: {
    height: 1.74, hoodie: '#1d1d21', hoodieDark: '#121215', pants: '#25272c', skin: '#c08c69',
    hair: '#18120e', hairStyle: 'short', beard: false, glasses: false, freeArm: 'hang', print: true, faceW: 0.86,
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
  const neck = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.13, 16), skin));
  neck.position.set(0, 1.53, -0.008);
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.645;
  body.add(head);
  const fw = L.faceW;
  // crânio + mandíbula + queixo: dá o formato de rosto, não de bola
  const skull = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), skin));
  skull.scale.set(fw, 1.1, 1.02);
  skull.position.set(0, 0.012, -0.008);
  const jaw = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.08, 28, 20), skin));
  jaw.scale.set(fw * 1.02, 0.78, 1.0);
  jaw.position.set(0, -0.045, 0.012);
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), skin);
  chin.scale.set(1.1, 0.8, 0.9);
  chin.position.set(0, -0.092, 0.06);
  head.add(skull, jaw, chin);
  const darker = std(new THREE.Color(L.skin).multiplyScalar(0.78).getStyle(), { roughness: 0.6 });
  [-1, 1].forEach((sx) => {
    // orelha com concha
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), skin);
    ear.scale.set(0.42, 1.05, 0.75);
    ear.position.set(sx * 0.093 * fw / 0.9, -0.004, -0.008);
    ear.rotation.y = sx * 0.3;
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), darker);
    earIn.scale.set(0.3, 0.9, 0.6);
    earIn.position.set(sx * 0.098 * fw / 0.9, -0.004, -0.004);
    // maçã do rosto
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), skin);
    cheek.position.set(sx * 0.05, -0.012, 0.072);
    // olhos: esclera, íris e pálpebra
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 14, 10), std('#f1ede6', { roughness: 0.3 }));
    eye.position.set(sx * 0.034, 0.016, 0.083);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 12, 8), std('#2a1a10', { roughness: 0.2 }));
    iris.position.set(sx * 0.034, 0.015, 0.0935);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0128, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), skin);
    lid.position.copy(eye.position);
    lid.rotation.x = 0.35;
    // sobrancelha grossa
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.026, 4, 6), hair);
    brow.rotation.z = Math.PI / 2 + sx * 0.12;
    brow.position.set(sx * 0.036, 0.036, 0.092);
    head.add(ear, earIn, cheek, eye, iris, lid, brow);
  });
  // nariz: dorso, ponta e asas
  const bridgeN = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), skin);
  bridgeN.rotation.x = 0.35;
  bridgeN.position.set(0, 0.0, 0.098);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), skin);
  tip.scale.set(1.15, 0.9, 1);
  tip.position.set(0, -0.022, 0.104);
  [-1, 1].forEach((sx) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), skin);
    wing.position.set(sx * 0.013, -0.026, 0.097);
    head.add(wing);
  });
  // boca
  const lips = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.028, 4, 8), std(new THREE.Color(L.skin).multiplyScalar(0.7).getStyle(), { roughness: 0.5 }));
  lips.rotation.z = Math.PI / 2;
  lips.position.set(0, -0.052, 0.088);
  head.add(bridgeN, tip, lips);

  if (L.beard) {
    // cavanhaque, bigode e barba rala no maxilar
    const beardM = std(L.hair, { roughness: 0.9 });
    const goatee = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), beardM);
    goatee.scale.set(1.05, 1.1, 0.75);
    goatee.position.set(0, -0.085, 0.07);
    const mustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.034, 4, 8), beardM);
    mustache.rotation.z = Math.PI / 2;
    mustache.position.set(0, -0.039, 0.098);
    head.add(goatee, mustache);
    [-1, 1].forEach((sx) => {
      const jawBeard = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4), beardM);
      jawBeard.scale.set(0.6, 1, 1);
      jawBeard.position.set(sx * 0.047, -0.04, 0.02);
      jawBeard.rotation.y = sx * 0.5;
      head.add(jawBeard);
    });
  }
  if (L.glasses) {
    const frameM = std('#121212', { roughness: 0.3, metalness: 0.3 });
    const lensM = new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 });
    [-1, 1].forEach((sx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0035, 8, 24), frameM);
      rim.scale.set(1.15, 0.85, 1);
      rim.position.set(sx * 0.035, 0.016, 0.104);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), lensM);
      lens.scale.set(1.15, 0.85, 1);
      lens.position.set(sx * 0.035, 0.016, 0.104);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.105), frameM);
      temple.position.set(sx * 0.088 * fw / 0.9, 0.02, 0.054);
      temple.rotation.y = -sx * 0.06;
      head.add(rim, lens, temple);
    });
    const bridgeG = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.004), frameM);
    bridgeG.position.set(0, 0.02, 0.107);
    head.add(bridgeG);
  }

  // ── cabelo ──
  let seed = who === 'cauan' ? 11 : 23;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hairBase = new THREE.Color(L.hair);
  const tint = (amt) => hairBase.clone().offsetHSL(0, 0, (rand() - 0.5) * amt);
  if (L.hairStyle === 'short') {
    // base rente (degradê nas laterais e nuca) + mechas lisas penteadas para frente no topo
    const capMat = std(L.hair, { roughness: 0.85 });
    const cap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.104, 32, 20, 0, Math.PI * 2, 0, 1.95), capMat));
    cap.scale.set(fw * 1.03, 1.1, 1.05);
    cap.rotation.x = -0.75;
    cap.position.set(0, 0.016, -0.012);
    head.add(cap);
    const N = 260;
    const strands = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0055, 0.04, 3, 6), std('#ffffff', { roughness: 0.7 }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const fwd = new THREE.Vector3(0, -0.15, 1).normalize();
    for (let i = 0; i < N; i++) {
      // pontos no topo da cabeça (até ~60° do alto), um pouco para trás
      const a = rand() * Math.PI * 2, b = Math.sqrt(rand()) * 1.05;
      const dir = new THREE.Vector3(Math.sin(b) * Math.cos(a) * fw, Math.cos(b), Math.sin(b) * Math.sin(a) - 0.1).normalize();
      p.set(dir.x * 0.112, dir.y * 0.12 + 0.012, dir.z * 0.112 - 0.01);
      // mecha deitada na superfície, apontando para a testa
      const along = fwd.clone().sub(dir.clone().multiplyScalar(fwd.dot(dir))).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.lerp(dir, 0.15).normalize());
      sc.set(1, 0.7 + rand() * 0.6, 1);
      m.compose(p, q, sc);
      strands.setMatrixAt(i, m);
      strands.setColorAt(i, tint(0.08));
    }
    strands.castShadow = true;
    head.add(strands);
  } else {
    // cachos volumosos (black power curto): várias camadas de cachinhos,
    // mais volume em cima e nos lados, rente na nuca
    const N = 900;
    const curls = new THREE.InstancedMesh(new THREE.TorusKnotGeometry(1, 0.42, 16, 4, 2, 3), std('#ffffff', { roughness: 0.8 }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    while (n < N) {
      const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      // rosto livre, com a linha do cabelo um pouco acima da testa
      if (dir.z > 0.2 && dir.y < 0.62) continue;
      if (dir.y < -0.5) continue;
      if (dir.y < -0.15 && dir.z > -0.2) continue; // costeletas curtas
      const layer = rand();
      const volume = 0.11 + layer * 0.05 + Math.max(0, dir.y) * 0.03;
      p.set(dir.x * volume * 1.05, dir.y * volume * 1.05 + 0.03, dir.z * volume - 0.012);
      q.setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6));
      sc.setScalar(0.0085 + rand() * 0.007);
      m.compose(p, q, sc);
      curls.setMatrixAt(n, m);
      curls.setColorAt(n, tint(0.1));
      n++;
    }
    // miolo escuro por baixo dos cachos, para não aparecer couro cabeludo
    const core = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.128, 24, 18), std(L.hair, { roughness: 1 })));
    core.scale.set(1.02, 1.05, 1.04);
    core.position.set(0, 0.03, -0.022);
    head.add(core);
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
      head.rotation.x = THREE.MathUtils.clamp((1.64 - tmpT.y) * 0.9, -0.35, 0.5) * -1 - 0.05;
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
