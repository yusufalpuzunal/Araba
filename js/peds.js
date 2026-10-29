/* Yayalar: kaldırımda blokların çevresinde yürüyen insanlar (city-peds.js).
   Araç yaklaşınca kaçar, çok yaklaşırsa zıplayıp kenara çekilir: hiçbiri ezilmez. */
"use strict";

const PEDS = [],
  PED_LANE = 23.1, // yürüme çizgisinin blok merkezine uzaklığı (kaldırım kenarına yakın)
  PED_IN = 1.9, // engelden kaçarken binaya doğru ne kadar yanaşır
  PED_WALK = 1.35;
// yayaların dolaştığı bloklar: eski şehir ve çevresi daha kalabalık
const PED_BLOCKS = [
  ["-150,-150", 2],
  ["-150,-90", 2],
  ["-90,-150", 2],
  ["-30,-90", 1],
  ["-90,-30", 1],
  ["30,30", 1],
  ["-30,-30", 1],
  ["30,-30", 1],
  ["90,30", 1],
  ["-30,90", 1],
  ["30,90", 1],
  ["90,90", 1],
];

// blok çevresindeki yol: u (0 .. 8*PED_LANE) konumdan kaldırım noktası ve yürüyüş yönü
function pedPoint(p, u, lane) {
  const S = PED_LANE,
    k = Math.floor(u / (2 * S)) & 3,
    a = u - Math.floor(u / (2 * S)) * 2 * S - S;
  // dört kenar saat yönünün tersine; (tx,tz) ilerleme, (nx,nz) dışa dönük normal
  const E = [
    [a, -lane, 1, 0, 0, -1],
    [lane, a, 0, 1, 1, 0],
    [-a, lane, -1, 0, 0, 1],
    [-lane, -a, 0, -1, -1, 0],
  ][k];
  return { x: p.bx + E[0], z: p.bz + E[1], tx: E[2], tz: E[3], nx: E[4], nz: E[5] };
}

function spawnPeds() {
  if (typeof PED_MODELS === "undefined" || !THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  const loader = new THREE.GLTFLoader(),
    models = [];
  let left = PED_MODELS.length;
  PED_MODELS.forEach((src, i) =>
    loader.parse(
      b64(src),
      "",
      (gltf) => {
        models[i] = gltf;
        if (--left === 0) placePeds(models.filter(Boolean));
      },
      () => {
        if (--left === 0) placePeds(models.filter(Boolean));
      },
    ),
  );
}

function placePeds(models) {
  if (!models.length) return;
  let mi = 0;
  for (const [key, n] of PED_BLOCKS) {
    const [bx, bz] = key.split(",").map(Number);
    // telefonlarda yarısı kadar yaya
    for (let k = 0; k < (isTouch ? Math.ceil(n / 2) : n); k++) {
      const gl = models[mi++ % models.length],
        g = THREE.SkeletonUtils.clone(gl.scene);
      g.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      scene.add(g);
      const mixer = new THREE.AnimationMixer(g),
        act = {};
      for (const c of gl.animations) act[c.name] = mixer.clipAction(c);
      const p = {
        g,
        mixer,
        act,
        cur: null,
        bx,
        bz,
        u: rng() * 8 * PED_LANE,
        dir: rng() < 0.5 ? 1 : -1,
        v: PED_WALK * (0.85 + rng() * 0.3),
        lane: PED_LANE,
        laneT: PED_LANE,
        wait: 0,
        flee: 0,
        hop: 0,
        tick: (rng() * 3) | 0,
      };
      const q = pedPoint(p, p.u, p.lane);
      g.position.set(q.x, hAt(q.x, q.z) + 0.05, q.z);
      pedAnim(p, "walk");
      mixer.update(rng() * 2);
      PEDS.push(p);
    }
  }
  // gölgelendiricileri şimdi hazırla: ilk görüldüklerinde takılma olmasın
  renderer.compile(scene, camera);
}

function pedAnim(p, name) {
  if (p.cur === name || !p.act[name]) return;
  const a = p.act[name];
  a.reset().play();
  if (p.cur) p.act[p.cur].crossFadeTo(a, 0.25, false);
  p.cur = name;
}

const _pedNear = [];
// bu noktada kaldırımı kapatan bir şey (bank, durak, bina ...) var mı?
function pedBlocked(x, z) {
  for (const o of nearObs(x, z, 1.5, _pedNear)) {
    if (o.broken) continue;
    if (o.t === 0) {
      if (x > o.minX - 0.35 && x < o.maxX + 0.35 && z > o.minZ - 0.35 && z < o.maxZ + 0.35) return true;
    } else if (o.x !== undefined && Math.hypot(o.x - x, o.z - z) < o.r + 0.45) return true;
  }
  return false;
}

function updatePeds(dt) {
  if (!PEDS.length) return;
  const cx = camera.position.x,
    cz = camera.position.z,
    sp = car.v.length();
  for (const p of PEDS) {
    const here = pedPoint(p, p.u, p.lane),
      dc = Math.hypot(here.x - cx, here.z - cz);
    // uzaktakiler gizlenir, ortadakiler seyrek güncellenir
    p.g.visible = dc < 170;
    if (!p.g.visible) continue;
    const dx = here.x - car.p.x,
      dz = here.z - car.p.z,
      d = Math.hypot(dx, dz);
    // araç yaklaşıyor: koşarak uzaklaş, binaya doğru yanaş; çok yakınsa zıpla
    if ((d < 11 && sp > 3) || (d < 4 && sp > 0.8)) {
      p.flee = 2.2;
      p.wait = 0;
      p.dir = dx * here.tx + dz * here.tz >= 0 ? 1 : -1;
      p.laneT = PED_LANE - PED_IN;
      if (d < 2.2 && p.hop <= 0) p.hop = 0.55;
    }
    let v = 0;
    if (p.flee > 0) {
      p.flee -= dt;
      v = 4.2;
      pedAnim(p, "run");
    } else if (p.wait > 0) {
      p.wait -= dt;
      pedAnim(p, "idle");
    } else {
      v = p.v;
      pedAnim(p, "walk");
      if (rng() < dt * 0.04) p.wait = 2 + rng() * 4;
    }
    if (v) {
      // önü kapalıysa önce iç tarafa geç, o da kapalıysa geri dön
      const ah = pedPoint(p, p.u + p.dir * 0.9, p.lane);
      if (pedBlocked(ah.x, ah.z)) {
        const inner = pedPoint(p, p.u + p.dir * 0.9, PED_LANE - PED_IN);
        if (p.laneT === PED_LANE && !pedBlocked(inner.x, inner.z)) p.laneT = PED_LANE - PED_IN;
        else if (Math.abs(p.lane - p.laneT) < 0.05) p.dir = -p.dir;
      } else if (p.flee <= 0 && p.laneT !== PED_LANE) {
        const outer = pedPoint(p, p.u + p.dir * 1.5, PED_LANE);
        if (!pedBlocked(outer.x, outer.z)) p.laneT = PED_LANE;
      }
      p.u = (p.u + p.dir * v * dt + 8 * PED_LANE) % (8 * PED_LANE);
    }
    p.lane += clamp(p.laneT - p.lane, -dt * 1.6, dt * 1.6);
    const q = pedPoint(p, p.u, p.lane);
    let y = hAt(q.x, q.z) + 0.05;
    if (p.hop > 0) {
      p.hop -= dt;
      y += Math.sin((p.hop / 0.55) * Math.PI) * 0.9;
    }
    p.g.position.set(q.x, y, q.z);
    const ang = Math.atan2(q.tx * p.dir, q.tz * p.dir);
    p.g.rotation.y +=
      (((ang - p.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10);
    const a = p.act[p.cur];
    if (a) a.timeScale = p.cur === "walk" ? v / PED_WALK : 1;
    if (dc < 70 || ++p.tick % 3 === 0) p.mixer.update(dc < 70 ? dt : dt * 3);
  }
}
