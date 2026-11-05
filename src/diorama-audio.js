// Sons sintetizados (sem arquivos): folha virando, carimbo e clique.
// Só tocam depois que a pessoa liga o som no botão.
let ctx = null;
let enabled = false;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(seconds) {
  const a = audio();
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function setSound(on) {
  enabled = on;
  if (on) audio();
}

export function soundOn() {
  return enabled;
}

// Folha de papel: ruído filtrado com varredura de frequência.
export function pageFlip() {
  if (!enabled) return;
  const a = audio();
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(0.45);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(900, a.currentTime);
  bp.frequency.exponentialRampToValueAtTime(3800, a.currentTime + 0.18);
  bp.frequency.exponentialRampToValueAtTime(1400, a.currentTime + 0.42);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.35, a.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.44);
  src.connect(bp).connect(g).connect(a.destination);
  src.start();
}

// Carimbo: batida grave + estalo curto.
export function stamp() {
  if (!enabled) return;
  const a = audio();
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(48, a.currentTime + 0.16);
  const g = a.createGain();
  g.gain.setValueAtTime(0.8, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.22);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.25);
  const n = a.createBufferSource();
  n.buffer = noiseBuffer(0.06);
  const ng = a.createGain();
  ng.gain.setValueAtTime(0.25, a.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.06);
  n.connect(ng).connect(a.destination);
  n.start();
}

export function pop() {
  if (!enabled) return;
  const a = audio();
  const o = a.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(980, a.currentTime + 0.06);
  const g = a.createGain();
  g.gain.setValueAtTime(0.18, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.12);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.14);
}

// Celular vibrando na mesa.
export function buzz() {
  if (!enabled) return;
  const a = audio();
  const o = a.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 95;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  [0, 0.28].forEach((d) => {
    g.gain.setValueAtTime(0.08, t + d);
    g.gain.setValueAtTime(0.0001, t + d + 0.18);
  });
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  o.connect(lp).connect(g).connect(a.destination);
  o.start();
  o.stop(t + 0.5);
}
