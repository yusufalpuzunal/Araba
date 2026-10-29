/* Lastik izleri ve ses (motor, lastik sesi, efektler). */
"use strict";

/* ---------- skid marks ---------- */
const MAXQ = 900;
const skidPos = new Float32Array(MAXQ * 4 * 3);
const skidIdx = [];
for (let i = 0; i < MAXQ; i++) {
  const b = i * 4;
  skidIdx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
}
const skidGeo = new THREE.BufferGeometry();
skidGeo.setAttribute("position", new THREE.BufferAttribute(skidPos, 3));
skidGeo.setIndex(skidIdx);
skidGeo.setDrawRange(0, 0);
const skidMesh = new THREE.Mesh(
  skidGeo,
  new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }),
);
skidMesh.frustumCulled = false;
scene.add(skidMesh);
let skidHead = 0,
  skidCount = 0;
function addSkid(a, b, sx, sz) {
  const i = skidHead;
  skidHead = (skidHead + 1) % MAXQ;
  skidCount = Math.min(skidCount + 1, MAXQ);
  const o = i * 12,
    w = 0.13;
  const pts = [
    [a[0] - sx * w, a[1], a[2] - sz * w],
    [a[0] + sx * w, a[1], a[2] + sz * w],
    [b[0] - sx * w, b[1], b[2] - sz * w],
    [b[0] + sx * w, b[1], b[2] + sz * w],
  ];
  pts.forEach((pt, k) => {
    skidPos[o + k * 3] = pt[0];
    skidPos[o + k * 3 + 1] = pt[1] + 0.04;
    skidPos[o + k * 3 + 2] = pt[2];
  });
  skidGeo.attributes.position.needsUpdate = true;
  skidGeo.setDrawRange(0, skidCount * 6);
}

/* ---------- audio ---------- */
let audio = null,
  soundOn = true;
function initAudio() {
  if (audio) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 2;
    const eg = ctx.createGain();
    eg.gain.value = 0;
    lp.connect(eg);
    eg.connect(master);
    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    const o2 = ctx.createOscillator();
    o2.type = "square";
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    o1.start();
    o2.start();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    ns.loop = true;
    ns.start();
    // tyre scrub (lateral sliding)
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 0.9;
    const sg = ctx.createGain();
    sg.gain.value = 0;
    ns.connect(bp);
    bp.connect(sg);
    sg.connect(master);
    // tyre screech: two detuned saw tones through resonant filters, slight warble and flutter, a little filtered noise for grit
    const scG = ctx.createGain();
    scG.gain.value = 0;
    const scOut = ctx.createGain();
    scOut.gain.value = 0.85;
    scG.connect(scOut);
    scOut.connect(master);
    const sc1 = ctx.createOscillator();
    sc1.type = "sawtooth";
    sc1.frequency.value = 1000;
    const sc2 = ctx.createOscillator();
    sc2.type = "sawtooth";
    sc2.frequency.value = 1520;
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.Q.value = 7;
    f1.frequency.value = 1150;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.Q.value = 9;
    f2.frequency.value = 2350;
    const g1 = ctx.createGain();
    g1.gain.value = 1;
    const g2b = ctx.createGain();
    g2b.gain.value = 0.55;
    sc1.connect(f1);
    f1.connect(g1);
    g1.connect(scG);
    sc2.connect(f2);
    f2.connect(g2b);
    g2b.connect(scG);
    const fn = ctx.createBiquadFilter();
    fn.type = "bandpass";
    fn.Q.value = 12;
    fn.frequency.value = 1800;
    const gn = ctx.createGain();
    gn.gain.value = 0.9;
    ns.connect(fn);
    fn.connect(gn);
    gn.connect(scG);
    const w1 = ctx.createOscillator();
    w1.frequency.value = 8.7;
    const w1g = ctx.createGain();
    w1g.gain.value = 26;
    w1.connect(w1g);
    w1g.connect(sc1.frequency);
    const w2 = ctx.createOscillator();
    w2.frequency.value = 3.3;
    const w2g = ctx.createGain();
    w2g.gain.value = 48;
    w2.connect(w2g);
    w2g.connect(sc2.frequency);
    const fl = ctx.createOscillator();
    fl.frequency.value = 19;
    const flg = ctx.createGain();
    flg.gain.value = 0.15;
    fl.connect(flg);
    flg.connect(scOut.gain);
    for (const o of [sc1, sc2, w1, w2, fl]) o.start();
    // tünel yankısı: motor ve lastik sesinin bir kısmı yapay bir "oda yankısından" (convolver) geçer
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d2 = ir.getChannelData(ch);
      for (let i = 0; i < d2.length; i++) {
        const t = i / ctx.sampleRate;
        d2[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const rv = ctx.createGain();
    rv.gain.value = 0;
    eg.connect(rv);
    scOut.connect(rv);
    rv.connect(verb);
    verb.connect(master);
    // rüzgâr uğultusu: hız arttıkça yükselen, alçak geçiren filtreden geçmiş gürültü
    const wl = ctx.createBiquadFilter();
    wl.type = "lowpass";
    wl.frequency.value = 500;
    wl.Q.value = 0.7;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    ns.connect(wl);
    wl.connect(wg);
    wg.connect(master);
    audio = { ctx, master, o1, o2, lp, eg, sg, scG, sc1, sc2, f1, f2, fn, rv, wg, wl };
  } catch (e) {
    audio = null;
  }
}
function ping(f1, f2, dur, vol, type = "triangle") {
  if (!audio || !soundOn) return;
  const c = audio.ctx,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(audio.master);
  o.start();
  o.stop(c.currentTime + dur);
}
function thud(v) {
  ping(90, 35, 0.3, clamp(v / 12, 0.05, 0.6), "sine");
}
function stopCreak() {
  ping(560, 410, 0.18, 0.035, "triangle");
  ping(70, 45, 0.22, 0.12, "sine");
}

// tabelaya çarpma: kısa, tok bir metal "dank" sesi (birkaç uyumsuz frekans + kısa gürültü patlaması)
function metalHit(speed) {
  if (!audio || !soundOn) return;
  const c = audio.ctx,
    t = c.currentTime,
    vol = clamp(0.12 + speed * 0.012, 0.12, 0.42),
    out = c.createGain();
  out.gain.value = vol;
  out.connect(audio.master);
  // hollow sheet-metal partials, each dying away at its own speed
  for (const [f, a, d] of [
    [312, 1, 0.42],
    [748, 0.7, 0.3],
    [1196, 0.5, 0.22],
    [1873, 0.32, 0.14],
    [2650, 0.2, 0.09],
  ]) {
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f * (0.97 + Math.random() * 0.06), t);
    g.gain.setValueAtTime(a, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + d + 0.02);
  }
  // the knock of the impact itself
  const nb = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate),
    d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const ns = c.createBufferSource(),
    bp = c.createBiquadFilter();
  ns.buffer = nb;
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.8;
  ns.connect(bp);
  bp.connect(out);
  ns.start(t);
}

/* ---------- açılış müziği ----------
   Bu oyun için yazılmış kısa bir döngü; dosya yerine anında sentezlenir.
   La minör, 104 BPM: bas, yumuşak pad, arpej, hafif davul ve yankılı bir melodi. */
const MUSIC = { on: true, playing: false, out: null, timer: 0, step: 0, next: 0 };
const BPM = 104,
  SIXTEENTH = 60 / BPM / 4;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 8 ölçü: Am F C G | Am F G E
const PROG = [
  [45, [57, 60, 64]],
  [41, [53, 57, 60]],
  [48, [55, 60, 64]],
  [43, [55, 59, 62]],
  [45, [57, 60, 64]],
  [41, [53, 57, 60]],
  [43, [55, 59, 62]],
  [40, [56, 59, 64]],
];
// melodi: ölçü başına 16 adım, 0 = sus
const MELODY = [
  [76, 0, 0, 0, 74, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0],
  [72, 0, 0, 0, 69, 0, 0, 0, 72, 0, 74, 0, 0, 0, 0, 0],
  [76, 0, 0, 0, 79, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0],
  [74, 0, 0, 0, 0, 0, 71, 0, 74, 0, 0, 0, 0, 0, 0, 0],
  [76, 0, 0, 0, 74, 0, 72, 0, 74, 0, 0, 0, 76, 0, 0, 0],
  [77, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0],
  [74, 0, 0, 0, 71, 0, 0, 0, 74, 0, 76, 0, 0, 0, 0, 0],
  [76, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 71, 0, 0, 0],
];
function musicStart() {
  initAudio();
  if (!audio || !MUSIC.on || MUSIC.playing) return;
  const c = audio.ctx;
  if (c.state === "suspended") c.resume();
  MUSIC.playing = true;
  if (!MUSIC.out) {
    MUSIC.out = c.createGain();
    MUSIC.out.connect(audio.master);
    // yankı (ölçüye göre 3/16 gecikme)
    const dl = c.createDelay(1),
      fb = c.createGain(),
      wet = c.createGain();
    dl.delayTime.value = SIXTEENTH * 3;
    fb.gain.value = 0.32;
    wet.gain.value = 0.35;
    dl.connect(fb);
    fb.connect(dl);
    dl.connect(wet);
    wet.connect(MUSIC.out);
    MUSIC.send = dl;
  }
  MUSIC.out.gain.cancelScheduledValues(c.currentTime);
  MUSIC.out.gain.setValueAtTime(0.0001, c.currentTime);
  MUSIC.out.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 1.2);
  MUSIC.step = 0;
  MUSIC.next = c.currentTime + 0.1;
  clearInterval(MUSIC.timer);
  MUSIC.timer = setInterval(musicTick, 25);
}
function musicStop() {
  if (!audio || !MUSIC.playing) return;
  const c = audio.ctx;
  MUSIC.playing = false;
  MUSIC.out.gain.cancelScheduledValues(c.currentTime);
  MUSIC.out.gain.setValueAtTime(MUSIC.out.gain.value || 0.9, c.currentTime);
  MUSIC.out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8);
  setTimeout(() => {
    if (!MUSIC.playing) clearInterval(MUSIC.timer);
  }, 900);
}
function musicTick() {
  const c = audio.ctx;
  while (MUSIC.next < c.currentTime + 0.15) {
    playStep(MUSIC.step, MUSIC.next);
    MUSIC.step++;
    MUSIC.next += SIXTEENTH;
  }
}
function note(f, t, dur, type, vol, cutoff, dest, send = 0) {
  const c = audio.ctx,
    o = c.createOscillator(),
    g = c.createGain(),
    lp = c.createBiquadFilter();
  o.type = type;
  o.frequency.value = f;
  lp.type = "lowpass";
  lp.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp);
  lp.connect(g);
  g.connect(dest);
  if (send) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(MUSIC.send);
  }
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noiseHit(t, dur, vol, type, freq) {
  const c = audio.ctx,
    nb = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate),
    d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  s.buffer = nb;
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(MUSIC.out);
  s.start(t);
}
function playStep(step, t) {
  const out = MUSIC.out,
    bar = Math.floor(step / 16) % 8,
    s = step % 16,
    [root, chord] = PROG[bar],
    loop = Math.floor(step / 128);
  // pad: ölçü başında yumuşak akor
  if (s === 0)
    for (const m of chord)
      for (const dt of [-6, 6])
        note(midi(m) * Math.pow(2, dt / 1200), t, SIXTEENTH * 16, "sawtooth", 0.018, 900, out);
  // bas: sekizlikler, vuruşlarda kök, aralarda beşli
  if (s % 2 === 0) note(midi(root + (s % 8 === 6 ? 7 : 0)), t, SIXTEENTH * 1.8, "triangle", 0.16, 500, out);
  // arpej
  const arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24][s % 4];
  note(midi(arp), t, SIXTEENTH * 0.9, "square", 0.022, 2400, out, 0.6);
  // melodi: ilk turda yok, sonra gelir
  const mel = MELODY[bar][s];
  if (loop > 0 && mel) note(midi(mel), t, SIXTEENTH * 3.5, "triangle", 0.07, 3000, out, 0.5);
  // davul: kick 1 ve 3'te (+ ara vuruş), el çırpma 2 ve 4'te, hi-hat aralarda
  if (s === 0 || s === 8 || s === 10) {
    const c = audio.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.3);
  }
  if (s === 4 || s === 12) noiseHit(t, 0.12, 0.09, "bandpass", 1600);
  if (s % 4 === 2) noiseHit(t, 0.04, 0.04, "highpass", 7000);
}
