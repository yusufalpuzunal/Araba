/* Dünya verisi: arazi yüksekliği, yollar, otoyollar, tüneller, rampalar, zemin sorgusu ve engel ızgarası. */
"use strict";

/* ---------- world data ---------- */
const N = 400,
  RES = 4,
  HALF = 800,
  W1 = N + 1,
  CITY = 212;
const HB = new Float32Array(W1 * W1),
  H = new Float32Array(W1 * W1),
  RD = new Float32Array(W1 * W1).fill(1e9),
  RY = new Float32Array(W1 * W1);
function baseHeight(x, z) {
  const dq = Math.max(Math.abs(x), Math.abs(z));
  const t = smoothstep(224, 430, dq);
  let h = (fbm(x * 0.0022 + 3.1, z * 0.0022 - 1.7, 5) * 0.5 + 0.5) * 95 + fbm(x * 0.009, z * 0.009, 3) * 10;
  const e = smoothstep(560, 790, dq);
  h = h * t + e * (110 + 40 * fbm(x * 0.01, z * 0.01, 2));
  // vadiler: dağ otoyolu için oyulmuş kanyon ve geçit
  for (const v of VALLEYS) {
    const c = valleyAt(v, x, z);
    if (c.k > 0 && h > c.floor) h = lerp(h, c.floor, c.k);
  }
  return h;
}
// Each valley follows a polyline; inside r[0] the ground sits at the floor height, by r[1] it is back to normal.
// fade: metres at the start of the line over which the valley gently begins.
const VALLEYS = [
  {
    name: "Kartal Kanyonu",
    pts: [
      [628, -430],
      [584, -530],
      [612, -630],
      [586, -730],
      [606, -830],
    ],
    floor: [16, 16],
    r: [22, 100],
    fade: 110,
    water: 17.2,
  },
  {
    name: "Kartal Geçidi",
    pts: [
      [512, -660],
      [430, -624],
      [340, -574],
      [262, -500],
    ],
    floor: [60, 47],
    r: [16, 64],
    fade: 50,
  },
];
for (const v of VALLEYS) {
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9,
    len = 0;
  v.seg = [];
  for (let i = 0; i < v.pts.length - 1; i++) {
    const [ax, az] = v.pts[i],
      [bx, bz] = v.pts[i + 1],
      l = Math.hypot(bx - ax, bz - az);
    v.seg.push({ ax, az, dx: (bx - ax) / l, dz: (bz - az) / l, l, s0: len });
    len += l;
  }
  for (const [px, pz] of v.pts) {
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    z0 = Math.min(z0, pz);
    z1 = Math.max(z1, pz);
  }
  v.len = len;
  v.box = [x0 - v.r[1], x1 + v.r[1], z0 - v.r[1], z1 + v.r[1]];
}
const _vq = { k: 0, floor: 0, d: 0, s: 0 };
function valleyAt(v, x, z) {
  _vq.k = 0;
  if (x < v.box[0] || x > v.box[1] || z < v.box[2] || z > v.box[3]) return _vq;
  let bd = 1e9,
    bs = 0;
  for (const g of v.seg) {
    const t = clamp((x - g.ax) * g.dx + (z - g.az) * g.dz, 0, g.l),
      d = Math.hypot(g.ax + g.dx * t - x, g.az + g.dz * t - z);
    if (d < bd) {
      bd = d;
      bs = g.s0 + t;
    }
  }
  _vq.d = bd;
  _vq.s = bs;
  _vq.k = (1 - smoothstep(v.r[0], v.r[1], bd)) * smoothstep(0, v.fade, bs);
  _vq.floor = lerp(v.floor[0], v.floor[1], bs / v.len);
  return _vq;
}
function hAt(x, z) {
  let gx = (x + HALF) / RES,
    gz = (z + HALF) / RES;
  gx = clamp(gx, 0, N - 1e-4);
  gz = clamp(gz, 0, N - 1e-4);
  const ix = gx | 0,
    iz = gz | 0,
    fx = gx - ix,
    fz = gz - iz,
    i = iz * W1 + ix;
  return (H[i] * (1 - fx) + H[i + 1] * fx) * (1 - fz) + (H[i + W1] * (1 - fx) + H[i + W1 + 1] * fx) * fz;
}
function roadDist(x, z) {
  const ix = clamp(Math.round((x + HALF) / RES), 0, N),
    iz = clamp(Math.round((z + HALF) / RES), 0, N);
  return RD[iz * W1 + ix];
}

function smoothArr(a, closed, win, passes) {
  const n = a.length;
  for (let p = 0; p < passes; p++) {
    const b = a.slice();
    for (let i = 0; i < n; i++) {
      let s = 0,
        c = 0;
      for (let j = -win; j <= win; j++) {
        let k = i + j;
        if (closed) k = (k + n) % n;
        else if (k < 0 || k >= n) continue;
        s += b[k];
        c++;
      }
      a[i] = s / c;
    }
  }
}
function makeRoad(curve, closed) {
  const len = curve.getLength(),
    n = Math.max(2, Math.round(len / 2));
  const pts = curve.getSpacedPoints(n);
  if (closed) pts.pop();
  const ys = pts.map((p) => baseHeight(p.x, p.z));
  smoothArr(ys, closed, 14, 4);
  return { pts, ys, closed };
}
const V3 = (x, z) => new THREE.Vector3(x, 0, z);
const loopCtrl = [];
for (let k = 0; k < 12; k++) {
  const a = (k / 12) * Math.PI * 2;
  const r = k === 0 || k === 6 ? 480 : 470 + rng() * 85;
  loopCtrl.push(V3(Math.cos(a) * r, Math.sin(a) * r * 0.92));
}
const loop = makeRoad(new THREE.CatmullRomCurve3(loopCtrl, true, "centripetal"), true);
function connector(ctrl, joinY) {
  const r = makeRoad(new THREE.CatmullRomCurve3(ctrl, false, "centripetal"), false);
  const n = r.ys.length;
  for (let i = 0; i < n; i++) {
    r.ys[i] *= smoothstep(0, 18, i);
    r.ys[i] = lerp(r.ys[i], joinY, smoothstep(n - 28, n - 1, i));
  }
  return r;
}
let westIdx = 0,
  bd = 1e9;
loop.pts.forEach((p, i) => {
  const d = Math.hypot(p.x + 480, p.z);
  if (d < bd) {
    bd = d;
    westIdx = i;
  }
});
loop.type = 0;
function loopNear(x, z) {
  let bi = 0,
    bd = 1e9;
  loop.pts.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      bi = i;
    }
  });
  return bi;
}
const HW_HALF = 11;
// Otoyollar: one from every city exit (N, S, E, W) to the ring road
function makeHighway(name, ctrl, o) {
  const curve = new THREE.CatmullRomCurve3(ctrl, false, "centripetal");
  const n = Math.round(curve.getLength() / 2),
    pts = curve.getSpacedPoints(n),
    ys = pts.map((q) => baseHeight(q.x, q.z));
  smoothArr(ys, false, o.smooth || 16, 4);
  const m = ys.length,
    near = (x, z) => {
      let bi = 0,
        bd = 1e9;
      pts.forEach((q, i) => {
        const d = Math.hypot(q.x - x, q.z - z);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      return bi;
    };
  let sA = -1,
    sB = -1;
  if (o.tunnel) {
    sA = near(...o.tunnel[0]);
    sB = near(...o.tunnel[1]);
    for (let i = sA; i <= sB; i++) ys[i] = lerp(ys[sA], ys[sB], (i - sA) / (sB - sA));
  }
  // o.profile: hand-made height profile [[x, z, y], ...] instead of following the terrain
  if (o.profile) {
    const an = o.profile.map(([x, z, y]) => [near(x, z), y]).sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < m; i++) {
      let k = 0;
      while (k < an.length - 2 && i > an[k + 1][0]) k++;
      const [i0, y0] = an[k],
        [i1, y1] = an[k + 1];
      ys[i] = lerp(y0, y1, clamp((i - i0) / (i1 - i0 || 1), 0, 1));
    }
    smoothArr(ys, false, 18, 3);
  }
  const GL = (o.grade || 0.1) * 2;
  for (let it = 0; it < 2; it++) {
    for (let i = 1; i < m; i++) ys[i] = Math.min(ys[i], ys[i - 1] + GL);
    for (let i = m - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] + GL);
  }
  let sc = -1,
    Yc = 0;
  if (o.cross != null) {
    const cp = loop.pts[o.cross];
    sc = near(cp.x, cp.z);
    Yc = loop.ys[o.cross] + 8.5;
    const A = Math.max(0, Yc - ys[sc]);
    for (let i = 0; i < m; i++) {
      if (sA >= 0 && i >= sA) break;
      ys[i] += Math.max(0, A - 0.07 * Math.abs(i - sc) * 2);
    }
  }
  smoothArr(ys, false, 4, 2);
  // o.start: the otoyol begins on the ring road (at that loop index) instead of at a city exit (y = 0)
  const endY = loop.ys[o.join],
    startY = o.start != null ? loop.ys[o.start] : 0;
  for (let i = 0; i < m; i++) {
    ys[i] = lerp(startY, ys[i], smoothstep(0, 16, i));
    ys[i] = lerp(ys[i], endY, smoothstep(m - 30, m - 1, i));
  }
  if (o.cap) {
    const G2 = o.cap * 2;
    for (let it = 0; it < 3; it++) {
      const lo = ys.slice(),
        hi = ys.slice();
      for (let i = 1; i < m; i++) {
        lo[i] = Math.min(lo[i], lo[i - 1] + G2);
        hi[i] = Math.max(hi[i], hi[i - 1] - G2);
      }
      for (let i = m - 2; i >= 0; i--) {
        lo[i] = Math.min(lo[i], lo[i + 1] + G2);
        hi[i] = Math.max(hi[i], hi[i + 1] - G2);
      }
      for (let i = 0; i < m; i++) ys[i] = (lo[i] + hi[i]) / 2;
      ys[0] = startY;
      ys[m - 1] = endY;
    }
    smoothArr(ys, false, 3, 1);
  }
  // the grade cap above can flatten the bridge over the ring road again; add the missing height back as a local bump (7% ramps)
  if (sc >= 0) {
    const A = Math.max(0, Yc - ys[sc]);
    for (let i = 0; i < m; i++) ys[i] += Math.max(0, A - 0.07 * Math.abs(i - sc) * 2);
    smoothArr(ys, false, 3, 1);
  }
  // pin both ends exactly to the city street / ring road after all the smoothing
  const pin = ys[0] - startY;
  for (let i = 0; i < m; i++) {
    ys[i] -= pin * (1 - smoothstep(0, 40, i)); // gently remove any leftover step at the start over ~80 m
    ys[i] = lerp(ys[i], endY, smoothstep(m - 30, m - 1, i));
  }
  const kind = new Uint8Array(m),
    tx = new Float32Array(m),
    tz = new Float32Array(m),
    sl = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(m - 1, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      l = Math.hypot(dx, dz) || 1;
    tx[i] = dx / l;
    tz[i] = dz / l;
    sl[i] = (ys[Math.min(m - 1, i + 1)] - ys[Math.max(0, i - 1)]) / l;
    const bh = baseHeight(pts[i].x, pts[i].z);
    kind[i] =
      i > 8 && i < m - 12 && bh > ys[i] + (sA >= 0 && i >= sA - 12 && i <= sB + 12 ? 3 : 6)
        ? 2
        : ys[i] > bh + 2.5 && i > 8 && i < m - 12
          ? 1
          : 0;
  }
  for (let i = 1; i < m - 1; i++)
    if (kind[i - 1] === kind[i + 1] && kind[i] !== kind[i - 1]) kind[i] = kind[i - 1];
  if (sc >= 0)
    for (let i = 0; i < m; i++) {
      if (Math.abs(i - sc) < 14 && ys[i] > Yc - 3) kind[i] = 1;
    }
  for (let k = 0; k < 3; k++)
    for (let i = 1; i < m - 1; i++) {
      let j = i;
      while (j < m - 1 && kind[j] === kind[i]) j++;
      if (j - i < 6 && i > 9 && kind[i - 1] === kind[j]) {
        for (let t = i; t < j; t++) kind[t] = kind[i - 1];
      }
      i = j - 1;
    }
  const dk = Uint8Array.from(kind);
  for (let i = 0; i < m; i++)
    if (kind[i] === 2)
      for (let d = -5; d <= 5; d++) {
        const k = i + d;
        if (k >= 0 && k < m && kind[k] === 0) dk[k] = 2;
      }
  return {
    name,
    pts,
    ys,
    kind,
    dk,
    tx,
    tz,
    sl,
    sc,
    join: o.join,
    start: o.start,
    mask: Array.from(kind, (k) => k === 0),
    type: 1,
    closed: false,
    railA: 30,
    railB: m - 36,
    gaps: [],
    style: new Uint8Array(m),
  };
}
const HS = (() => {
  const ic = loopNear(0, 467),
    ij = loopNear(444, 145),
    pc = loop.pts[ic],
    pj = loop.pts[ij];
  return makeHighway(
    "S",
    [
      V3(0, 196),
      V3(0, 300),
      V3(pc.x * 0.5, pc.z - 70),
      V3(pc.x, pc.z),
      V3(pc.x + 8, pc.z + 70),
      V3(70, 630),
      V3(220, 700),
      V3(420, 690),
      V3(560, 580),
      V3(590, 420),
      V3(pj.x + 80, pj.z + 50),
      V3(pj.x, pj.z),
    ],
    {
      cross: ic,
      join: ij,
      tunnel: [
        [70, 630],
        [560, 580],
      ],
      grade: 0.1,
    },
  );
})();
const HN = (() => {
  const ic = loopNear(0, -456),
    ij = loopNear(-400, -310),
    pc = loop.pts[ic],
    pj = loop.pts[ij];
  return makeHighway(
    "N",
    [
      V3(0, -196),
      V3(0, -300),
      V3(pc.x * 0.5, pc.z + 70),
      V3(pc.x, pc.z),
      V3(pc.x - 8, pc.z - 70),
      V3(-60, -575),
      V3(-200, -605),
      V3(-330, -560),
      V3(pj.x - 40, pj.z - 70),
      V3(pj.x, pj.z),
    ],
    { cross: ic, join: ij, grade: 1, cap: 0.24 },
  );
})();
const east = makeHighway("E", [V3(198, 0), V3(260, 0), V3(340, 8), V3(420, -4), V3(480, 0)], {
  join: 0,
  grade: 1,
  cap: 0.24,
});
const west = makeHighway("W", [V3(-198, 0), V3(-262, 0), V3(-345, -8), V3(-420, 5), V3(-480, 0)], {
  join: westIdx,
  grade: 1,
  cap: 0.24,
});
// Dağ otoyolu: çevre yolundan kuzeydoğu dağlarına çıkar. Kartal Tüneli (~380 m), Kartal Kanyonu viyadüğü
// (~37 m yükseklik), kısa bir tünel ve Kartal Geçidi'nden inerek yine çevre yoluna bağlanır.
const MT = (() => {
  const a = loopNear(447, -247),
    b = loopNear(208, -446),
    pa = loop.pts[a],
    pb = loop.pts[b];
  const ctrl = [
    [530, -262],
    [610, -300],
    [680, -380],
    [700, -470],
    [705, -560],
    [680, -640],
    [600, -660],
    [520, -650],
    [430, -620],
    [340, -570],
    [270, -510],
  ];
  return makeHighway("M", [V3(pa.x, pa.z), ...ctrl.map(([x, z]) => V3(x, z)), V3(pb.x, pb.z)], {
    start: a,
    join: b,
    grade: 1,
    profile: [
      [447, -247, 20],
      [595, -290, 27],
      [657, -652, 52],
      [560, -658, 53],
      [512, -660, 54],
      [262, -500, 48],
      [208, -446, 49],
    ],
  });
})();
const HWYS = [HS, HN, east, west, MT];
// tunnel runs: the second one on the southern otoyol is a twin round tube
const PORTALS = [];
{
  let no = 0;
  for (const h of HWYS) {
    const K = h.kind,
      m = K.length;
    let i = 0,
      run = 0;
    while (i < m) {
      if (K[i] !== 2) {
        i++;
        continue;
      }
      let j = i;
      while (j < m && K[j] === 2) j++;
      const round = h === HS && run === 1 ? 1 : 0;
      for (let t = i; t < j; t++) h.style[t] = round;
      PORTALS.push({ h, j: i, dirIn: 1, round }, { h, j: j - 1, dirIn: -1, round });
      run++;
      no++;
      i = j;
    }
  }
}
const HWGRID = new Map();
HWYS.forEach((h, hi) =>
  h.pts.forEach((q, i) => {
    const k = Math.floor(q.x / 20) * 10000 + Math.floor(q.z / 20);
    let a = HWGRID.get(k);
    if (!a) {
      a = [];
      HWGRID.set(k, a);
    }
    a.push(hi * 100000 + i);
  }),
);
const HI = { i: -1, lat: 0, along: 0, y: 0, kind: 0, h: null };
// y (optional): the height of the asker. When two otoyols pass over each other, the one at that level wins.
function hwInfo(x, z, o, y) {
  const gx = Math.floor(x / 20),
    gz = Math.floor(z / 20);
  let bc = -1,
    bd = 24 * 24;
  for (let a = gx - 1; a <= gx + 1; a++)
    for (let b = gz - 1; b <= gz + 1; b++) {
      const L = HWGRID.get(a * 10000 + b);
      if (!L) continue;
      for (const c of L) {
        const hh = HWYS[(c / 100000) | 0],
          i = c % 100000,
          q = hh.pts[i];
        let d = (q.x - x) ** 2 + (q.z - z) ** 2;
        if (y !== undefined) d += Math.max(0, Math.abs(y - hh.ys[i]) - 4) ** 2 * 4;
        if (d < bd) {
          bd = d;
          bc = c;
        }
      }
    }
  if (bc < 0) return null;
  const h = HWYS[(bc / 100000) | 0],
    bi = bc % 100000,
    q = h.pts[bi],
    dx = x - q.x,
    dz = z - q.z,
    t1 = h.tx[bi],
    t2 = h.tz[bi];
  o.h = h;
  o.i = bi;
  o.along = dx * t1 + dz * t2;
  o.lat = dx * -t2 + dz * t1;
  o.y = h.ys[bi] + o.along * h.sl[bi];
  o.kind = h.kind[bi];
  return o;
}
// Toprak yol: shortcut through the western hills
const DIRT = (() => {
  const a = loopNear(-457, 144),
    b = loopNear(-360, 330),
    pa = loop.pts[a],
    pb = loop.pts[b];
  const r = makeRoad(
    new THREE.CatmullRomCurve3(
      [V3(pa.x, pa.z), V3(-370, 150), V3(-262, 170), V3(-322, 252), V3(pb.x, pb.z)],
      false,
      "centripetal",
    ),
    false,
  );
  const m = r.ys.length;
  for (let i = 0; i < m; i++) {
    r.ys[i] = lerp(r.ys[i], loop.ys[a], 1 - smoothstep(0, 14, i));
    r.ys[i] = lerp(r.ys[i], loop.ys[b], smoothstep(m - 16, m - 1, i));
  }
  r.type = 2;
  return r;
})();
// gas station beside the southern otoyol (rail gap + flat pad on the right side)
const STATION = (() => {
  const h = HS;
  let best = 40,
    bv = 1e9;
  for (let i = 30; i <= 50; i++) {
    if (h.kind[i] || h.kind[i - 18] || h.kind[i + 18]) continue;
    const v = Math.abs(h.ys[i + 15] - h.ys[i - 15]);
    if (v < bv) {
      bv = v;
      best = i;
    }
  }
  const p = h.pts[best],
    sx = -h.tz[best],
    sz = h.tx[best];
  h.gaps.push({ a: best - 17, b: best + 17, side: 1 });
  return {
    i: best,
    x: p.x + sx * 29,
    z: p.z + sz * 29,
    y: h.ys[best],
    sx,
    sz,
    tx: h.tx[best],
    tz: h.tz[best],
  };
})();
const PADS = [
  {
    x: STATION.x,
    z: STATION.z,
    sx: STATION.sx,
    sz: STATION.sz,
    tx: STATION.tx,
    tz: STATION.tz,
    hw: 18,
    hl: 30,
    y: STATION.y,
  },
];
const ROADS = [loop, HS, HN, east, west, MT, DIRT];
const RT = new Uint8Array(W1 * W1),
  RW0 = [9, 13.5, 6],
  RW1 = [24, 30, 17];
function roadType(x, z) {
  const ix = clamp(Math.round((x + HALF) / RES), 0, N),
    iz = clamp(Math.round((z + HALF) / RES), 0, N);
  return RT[iz * W1 + ix];
}

function buildHeightfield() {
  for (let iz = 0; iz < W1; iz++)
    for (let ix = 0; ix < W1; ix++) HB[iz * W1 + ix] = baseHeight(-HALF + ix * RES, -HALF + iz * RES);
  const R = 32;
  for (const rd of ROADS) {
    for (let i = 0; i < rd.pts.length; i++) {
      if (rd.mask && !rd.mask[i]) continue;
      const p = rd.pts[i],
        y = rd.ys[i];
      const x0 = Math.max(0, Math.floor((p.x - R + HALF) / RES)),
        x1 = Math.min(N, Math.ceil((p.x + R + HALF) / RES));
      const z0 = Math.max(0, Math.floor((p.z - R + HALF) / RES)),
        z1 = Math.min(N, Math.ceil((p.z + R + HALF) / RES));
      for (let iz = z0; iz <= z1; iz++)
        for (let ix = x0; ix <= x1; ix++) {
          const d = Math.hypot(-HALF + ix * RES - p.x, -HALF + iz * RES - p.z),
            k = iz * W1 + ix;
          if (d < RD[k]) {
            RD[k] = d;
            RY[k] = y;
            RT[k] = rd.type;
          }
        }
    }
  }
  for (let k = 0; k < W1 * W1; k++) {
    const t = RT[k],
      w = 1 - smoothstep(RW0[t], RW1[t], RD[k]);
    H[k] = lerp(HB[k], RY[k], w);
  }
  for (const pd of PADS) {
    const R2 = Math.max(pd.hw, pd.hl) + 12;
    for (let iz = 0; iz < W1; iz++) {
      const z = -HALF + iz * RES;
      if (Math.abs(z - pd.z) > R2) continue;
      for (let ix = 0; ix < W1; ix++) {
        const x = -HALF + ix * RES;
        if (Math.abs(x - pd.x) > R2) continue;
        const dx = x - pd.x,
          dz = z - pd.z,
          u = Math.abs(dx * pd.sx + dz * pd.sz) - pd.hw,
          v = Math.abs(dx * pd.tx + dz * pd.tz) - pd.hl,
          w = 1 - smoothstep(0, 9, Math.max(u, v, 0)),
          k = iz * W1 + ix;
        H[k] = lerp(H[k], pd.y, w);
      }
    }
  }
  // cover the tunnels: any cell whose nearest otoyol sample is a tunnel gets at least 9.5 m of rock over the tube
  const hi = {};
  for (const h of HWYS)
    for (let i = 0; i < h.pts.length; i++) {
      if (h.kind[i] !== 2) continue;
      const p = h.pts[i];
      const x0 = Math.max(0, Math.floor((p.x - 20 + HALF) / RES)),
        x1 = Math.min(N, Math.ceil((p.x + 20 + HALF) / RES)),
        z0 = Math.max(0, Math.floor((p.z - 20 + HALF) / RES)),
        z1 = Math.min(N, Math.ceil((p.z + 20 + HALF) / RES));
      for (let iz = z0; iz <= z1; iz++)
        for (let ix = x0; ix <= x1; ix++) {
          const k = iz * W1 + ix;
          if (RT[k] !== 1 && RD[k] < 12) continue;
          const c = hwInfo(-HALF + ix * RES, -HALF + iz * RES, hi);
          if (!c || c.kind !== 2 || Math.abs(c.lat) > HW_HALF + 6) continue;
          H[k] = Math.max(H[k], c.y + 9.5);
        }
    }
}

const RAMPS = [
  { x: 0, z: 44, dx: 0, dz: -1, L: 14, W: 8, H: 3.0 },
  { x: -44, z: 0, dx: 1, dz: 0, L: 14, W: 8, H: 3.0 },
  { x: 30, z: -14, dx: 0, dz: -1, L: 9, W: 6, H: 1.4 },
  { x: -30, z: 14, dx: 0, dz: 1, L: 9, W: 6, H: 1.4 },
  { x: -95, z: 236, dx: 0, dz: 1, L: 24, W: 12, H: 6 },
];
function rampSetup() {
  for (const r of RAMPS) {
    r.base = hAt(r.x, r.z);
    const s = r.H / r.L;
    r.n = new THREE.Vector3(-s * r.dx, 1, -s * r.dz).normalize();
  }
}

const G = { h: 0, n: new THREE.Vector3(), surf: 1 };
const HIg = { i: -1, lat: 0, along: 0, y: 0, kind: 0 };
// surf: 0 grass, 1 asphalt, 2 dirt.  y (optional) picks the bridge deck / tunnel floor when the query is at that level
function ground(x, z, o, y) {
  if (y !== undefined) {
    const d = hwInfo(x, z, HIg, y);
    if (
      d &&
      d.h.dk[d.i] &&
      Math.abs(d.lat) < HW_HALF + 0.8 &&
      y > d.y - 2.5 &&
      y < d.y + (d.h.dk[d.i] === 2 ? 9 : 5)
    ) {
      o.h = d.y;
      o.n.set(-d.h.sl[d.i] * d.h.tx[d.i], 1, -d.h.sl[d.i] * d.h.tz[d.i]).normalize();
      o.surf = 1;
      o.deck = d.kind;
      return o;
    }
  }
  o.deck = 0;
  const e = 1.2,
    h = hAt(x, z);
  o.n
    .set(-(hAt(x + e, z) - hAt(x - e, z)) / (2 * e), 1, -(hAt(x, z + e) - hAt(x, z - e)) / (2 * e))
    .normalize();
  o.h = h;
  if (Math.abs(x) < CITY && Math.abs(z) < CITY) o.surf = 1;
  else {
    const t = roadType(x, z),
      rd = roadDist(x, z);
    o.surf = rd < (t === 1 ? 12.5 : t === 2 ? 5.5 : 8.5) ? (t === 2 ? 2 : 1) : 0;
  }
  for (const r of RAMPS) {
    const lx = x - r.x,
      lz = z - r.z,
      u = lx * r.dx + lz * r.dz;
    if (u < 0 || u > r.L) continue;
    const v = -lx * r.dz + lz * r.dx;
    if (Math.abs(v) > r.W / 2) continue;
    const rh = r.base + (r.H * u) / r.L;
    if (rh > o.h) {
      o.h = rh;
      o.n.copy(r.n);
      o.surf = 1;
    }
  }
  return o;
}

const OBS = new Map(),
  CELL = 24;
let obsStamp = 0;
const ck = (cx, cz) => (cx + 100) * 1000 + (cz + 100);
function addObs(o, minX, maxX, minZ, maxZ) {
  o.s = 0;
  for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
    for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
      const k = ck(cx, cz);
      let a = OBS.get(k);
      if (!a) {
        a = [];
        OBS.set(k, a);
      }
      a.push(o);
    }
}
function nearObs(x, z, r, out) {
  out.length = 0;
  obsStamp++;
  for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
    for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
      const a = OBS.get(ck(cx, cz));
      if (!a) continue;
      for (const o of a) {
        if (o.s !== obsStamp) {
          o.s = obsStamp;
          out.push(o);
        }
      }
    }
  return out;
}
