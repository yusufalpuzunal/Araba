/* Trafik: yol ağı ve yapay zekâ araçları (botlar). */
"use strict";

/* ---------- traffic (bots) ---------- */
const CITY_S = [-180, -120, -60, 0, 60, 120, 180],
  LINKS = [],
  NODES = {},
  BOTS = [],
  SIG = { Z: "g", X: "r" };
const BOTMAT = {
  haloHead: haloMat("#f2f4ff", 1.8, 0.8),
  // polis tepe lambası (sırayla yanıp söner, updateBots içinde)
  polR: new THREE.MeshStandardMaterial({
    color: C("#5a0a0a"),
    emissive: C("#ff2020"),
    emissiveIntensity: 0.1,
  }),
  polB: new THREE.MeshStandardMaterial({
    color: C("#0a1a5a"),
    emissive: C("#2a5cff"),
    emissiveIntensity: 0.1,
  }),
  haloTail: haloMat("#ff2a14", 1.1, 0.7),
  body: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.3 }),
  head: new THREE.MeshStandardMaterial({
    color: C("#f4f4f4"),
    emissive: C("#fff4dc"),
    emissiveIntensity: 0.3,
  }),
};
function tnode(id, x, z) {
  if (!NODES[id]) NODES[id] = { id, x, z, out: [] };
  return NODES[id];
}
function addLink(from, to, pts, speed, sig) {
  const l = { from, to, pts, speed, sig, id: LINKS.length };
  LINKS.push(l);
  NODES[from].out.push(l);
  return l;
}
function lanePts(P, Y, off, rev) {
  const A = rev ? P.slice().reverse() : P,
    YY = Y ? (rev ? Array.from(Y).reverse() : Y) : null,
    n = A.length,
    out = [];
  for (let i = 0; i < n; i++) {
    const a = A[Math.max(0, i - 1)],
      b = A[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x,
      tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const x = A[i].x - tz * off,
      z = A[i].z + tx * off;
    out.push({ x, z, y: YY ? YY[i] : hAt(x, z) });
  }
  return out;
}
function buildNetwork() {
  const S = CITY_S;
  for (const a of S) for (const b of S) tnode("c" + a + "," + b, a, b);
  const hp = HS.pts[0],
    np = HN.pts[0];
  tnode("E", 198, 0);
  tnode("W", -198, 0);
  tnode("H", hp.x, hp.z);
  tnode("N", np.x, np.z);
  const ramp = (x0, z0, x1, z1) =>
    (x0 === 0 && x1 === 0 && Math.min(z0, z1) === 0 && Math.max(z0, z1) === 60) ||
    (z0 === 0 && z1 === 0 && Math.min(x0, x1) === -60 && Math.max(x0, x1) === 0);
  const street = (aId, bId, ax, az, bx, bz, trimA, trimB) => {
    for (const rev of [0, 1]) {
      const [fx, fz, ex, ez, fid, tid, tf, tt] = rev
        ? [bx, bz, ax, az, bId, aId, trimB, trimA]
        : [ax, az, bx, bz, aId, bId, trimA, trimB];
      const dx = ex - fx,
        dz = ez - fz,
        l = Math.hypot(dx, dz),
        ux = dx / l,
        uz = dz / l,
        rx = -uz,
        rz = ux,
        s0 = tf ? 8 : 0,
        s1 = tt ? 8 : 0;
      const pts = [
        { x: fx + ux * s0 + rx * 3, z: fz + uz * s0 + rz * 3, y: 0.05 },
        { x: ex - ux * s1 + rx * 3, z: ez - uz * s1 + rz * 3, y: 0.05 },
      ];
      const grp = Math.abs(ux) > 0.5 ? "X" : "Z",
        sig = tt && Math.abs(ex) <= 60 && Math.abs(ez) <= 60 ? grp : null;
      addLink(fid, tid, pts, 11, sig);
    }
  };
  for (const s of S)
    for (let k = 0; k < S.length - 1; k++) {
      const a = S[k],
        b = S[k + 1];
      if (!ramp(s, a, s, b)) street("c" + s + "," + a, "c" + s + "," + b, s, a, s, b, 1, 1);
      if (!ramp(a, s, b, s)) street("c" + a + "," + s, "c" + b + "," + s, a, s, b, s, 1, 1);
    }
  street("c180,0", "E", 180, 0, 198, 0, 1, 0);
  street("c-180,0", "W", -180, 0, -198, 0, 1, 0);
  street("c0,180", "H", 0, 180, hp.x, hp.z, 1, 0);
  street("c0,-180", "N", 0, -180, np.x, np.z, 1, 0);
  const LP = loop.pts,
    ln = LP.length,
    J = [...new Set(HWYS.flatMap((h) => (h.start != null ? [h.join, h.start] : [h.join])))].sort(
      (a, b) => a - b,
    );
  J.forEach((j) => tnode("L" + j, LP[j].x, LP[j].z));
  for (let k = 0; k < J.length; k++) {
    const a = J[k],
      b = J[(k + 1) % J.length],
      idx = [];
    for (let i = a; ; i = (i + 1) % ln) {
      idx.push(i);
      if (i === b) break;
    }
    const P = idx.map((i) => LP[i]);
    addLink("L" + a, "L" + b, lanePts(P, null, 3, false), 18);
    addLink("L" + b, "L" + a, lanePts(P, null, 3, true), 18);
  }
  for (const [h, nd] of [
    [HS, "H"],
    [HN, "N"],
    [east, "E"],
    [west, "W"],
    [MT, "L" + MT.start],
  ])
    for (const off of [4, 7.6]) {
      const sp = off < 5 ? 27 : 22;
      addLink(nd, "L" + h.join, lanePts(h.pts, h.ys, off, false), sp);
      addLink("L" + h.join, nd, lanePts(h.pts, h.ys, off, true), sp);
    }
}
// n: how many of each type drive around (phones get a bit fewer to keep the frame rate up)
// q: City Pack modeli (traffic-cars.js), m: Kenney modeli (car-assets.js); p: rastgele boyanır.
// City Pack araçlarının yüksekliği modelden gelir. Tır kutu modeldir.
const BOT_TYPES = [
  { k: "sedan", q: "car", p: 1, L: 4.5, W: 1.84, v: 1, n: 10 },
  { k: "hatch", q: "car2", p: 1, L: 4.0, W: 1.78, v: 1, n: 6 },
  { k: "sport", q: "sport", p: 1, L: 4.4, W: 1.86, v: 1.05, n: 4 },
  { k: "sport2", q: "sport2", L: 4.4, W: 1.88, v: 1.05, n: 2 },
  { k: "taxi", q: "car", paint: "#f2c200", L: 4.6, W: 1.84, v: 1, n: 6 },
  { k: "police", q: "police", L: 4.8, W: 1.9, v: 1.05, n: 3 },
  { k: "suv", q: "suv", p: 1, L: 4.7, W: 1.98, v: 1, n: 7 },
  { k: "pickup", q: "pickup", L: 5.3, W: 2.0, v: 0.95, n: 5 },
  { k: "van", q: "van", L: 5.0, W: 2.05, v: 0.95, n: 5 },
  { k: "bus", q: "bus", L: 12, W: 2.55, v: 0.78, n: 5 },
  { k: "delivery", m: "delivery", p: 1, L: 6.2, W: 2.2, H: 2.75, v: 0.85, n: 4 },
  { k: "ambulance", m: "ambulance", L: 6.0, W: 2.15, H: 2.7, v: 1, n: 2 },
  { k: "fire", m: "firetruck", L: 7.6, W: 2.5, H: 3.0, v: 0.85, n: 1 },
  { k: "garbage", m: "garbage-truck", L: 7.4, W: 2.5, H: 3.1, v: 0.75, n: 2 },
  { k: "truck", L: 9.6, W: 2.5, H: 3.7, v: 0.72, n: 6 },
];
const BOT_SCALE = 0.72; // "orta" seviye: ~45 araç
const BOT_PAINT = [
  "#b7b9bd",
  "#1f2a44",
  "#e8e6e1",
  "#7a1c1c",
  "#2b2d30",
  "#3f6b4e",
  "#9a6b2f",
  "#5a7fa8",
  "#c43c2c",
  "#d9d3c3",
];
// Kenney modeli (car-assets.js) -> trafik aracı. Gövde t.L/t.W/t.H ölçüsüne esnetilir,
// tekerlekler ise yuvarlak kalsın diye kendi merkezleri etrafında eşit ölçeklenir.
const KENNEY_CACHE = {};
function kenneyData(key) {
  if (KENNEY_CACHE[key]) return KENNEY_CACHE[key];
  const m = KENNEY_CARS[key];
  return (KENNEY_CACHE[key] = {
    ...m,
    v: new Int16Array(b64(m.v)),
    n: new Int8Array(b64(m.n)),
    c: new Uint8Array(b64(m.c)),
    t: new Uint8Array(b64(m.t)),
    i: new Uint16Array(b64(m.i)),
  });
}
function kenneyBot(t) {
  const d = kenneyData(t.m),
    nv = d.t.length,
    sx = t.W / d.size[0],
    sy = t.H / d.size[1],
    sz = t.L / d.size[2],
    zc = d.min[2] + d.size[2] / 2;
  const paint = t.p && rng() < 0.75 ? new THREE.Color(BOT_PAINT[(rng() * BOT_PAINT.length) | 0]) : null,
    glassC = new THREE.Color("#25313b"),
    hsl = {},
    c = new THREE.Color();
  const pos = new Float32Array(nv * 3),
    nor = new Float32Array(nv * 3),
    col = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    let x = d.v[i * 3] / 4000,
      y = d.v[i * 3 + 1] / 4000,
      z = d.v[i * 3 + 2] / 4000 - zc,
      nx = d.n[i * 3] / sx,
      ny = d.n[i * 3 + 1] / sy,
      nz = d.n[i * 3 + 2] / sz;
    const tg = d.t[i];
    if (tg >= 8) {
      const w = d.wheels[tg - 8],
        wz = w[2] - zc;
      x = w[0] * sx + (x - w[0]) * sx;
      y = w[1] * sy + (y - w[1]) * sy;
      z = wz * sz + (z - wz) * sy;
      nz = d.n[i * 3 + 2] / sy;
    } else {
      x *= sx;
      y *= sy;
      z *= sz;
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    pos.set([x, y, z], i * 3);
    nor.set([nx / nl, ny / nl, nz / nl], i * 3);
    c.setRGB(d.c[i * 3] / 255, d.c[i * 3 + 1] / 255, d.c[i * 3 + 2] / 255).getHSL(hsl);
    if (tg === 1 && paint) c.copy(paint).multiplyScalar(Math.min(1.25, hsl.l / d.paintL));
    // açık mavi çizgi film camları yerine koyu, hafif mavi cam
    else if (tg < 2 && hsl.h > 0.53 && hsl.h < 0.62 && hsl.s > 0.4 && hsl.l > 0.72)
      c.copy(glassC).multiplyScalar(0.8 + (hsl.l - 0.72) * 1.5);
    c.convertSRGBToLinear();
    col.set([c.r, c.g, c.b], i * 3);
  }
  // üçgenleri gruplara ayır: gövde, farlar (sol/sağ), stoplar, tepe lambaları
  const grp = { body: [], hl: [], hr: [], tl: [], tr: [], pr: [], pb: [] },
    top = d.size[1] * sy * 0.86;
  for (let k = 0; k < d.i.length; k += 3) {
    const a = d.i[k],
      b = d.i[k + 1],
      e = d.i[k + 2],
      tg = Math.min(d.t[a], d.t[b], d.t[e]),
      xm = pos[a * 3] + pos[b * 3] + pos[e * 3],
      ym = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[e * 3 + 1]) / 3;
    let g = grp.body;
    if (tg === 2) g = xm < 0 ? grp.hl : grp.hr;
    else if (tg === 3) g = xm < 0 ? grp.tl : grp.tr;
    else if (tg < 8 && ym > top && (t.k === "police" || t.k === "ambulance" || t.k === "fire")) {
      c.setRGB(d.c[a * 3] / 255, d.c[a * 3 + 1] / 255, d.c[a * 3 + 2] / 255).getHSL(hsl);
      if (hsl.s > 0.5 && (hsl.h < 0.04 || hsl.h > 0.94)) g = grp.pr;
      else if (hsl.s > 0.5 && hsl.h > 0.55 && hsl.h < 0.72) g = grp.pb;
    }
    g.push(a, b, e);
  }
  return botGroup(pos, nor, col, grp);
}
// gruplanmış üçgenlerden araç: gövde, farlar, stoplar (fren yapınca parlar), tepe lambaları ve gece ışık halkaları
function botGroup(pos, nor, col, grp) {
  const geo = (idx) => {
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    gg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    gg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    gg.setIndex(idx);
    gg.computeBoundingSphere();
    return gg;
  };
  const centre = (idx, dz) => {
    if (!idx.length) return [];
    let x = 0,
      y = 0,
      z = 0;
    for (const v of idx) {
      x += pos[v * 3];
      y += pos[v * 3 + 1];
      z += pos[v * 3 + 2];
    }
    return [x / idx.length, y / idx.length, z / idx.length + dz];
  };
  const g = new THREE.Group(),
    bm = new THREE.Mesh(geo(grp.body), BOTMAT.body);
  bm.castShadow = true;
  bm.receiveShadow = true;
  g.add(bm);
  const tm = new THREE.MeshStandardMaterial({
    color: C("#4a0707"),
    emissive: C("#ff1a0c"),
    emissiveIntensity: 0.4,
  });
  g.add(
    new THREE.Mesh(geo([...grp.hl, ...grp.hr]), BOTMAT.head),
    new THREE.Mesh(geo([...grp.tl, ...grp.tr]), tm),
  );
  g.add(
    makeHalos([...centre(grp.hl, -0.25), ...centre(grp.hr, -0.25)], BOTMAT.haloHead),
    makeHalos([...centre(grp.tl, 0.2), ...centre(grp.tr, 0.2)], BOTMAT.haloTail),
  );
  if (grp.pr.length) g.add(new THREE.Mesh(geo(grp.pr), BOTMAT.polR));
  if (grp.pb.length) g.add(new THREE.Mesh(geo(grp.pb), BOTMAT.polB));
  g.rotation.order = "YXZ";
  return { g, tm };
}
// City Pack aracı (traffic-cars.js): boy t.L'ye eşit ölçeklenir, yalnız en t.W'ye daraltılır
// (tekerlek ekseni x yönünde olduğundan tekerlekler yuvarlak kalır)
const PACK_CACHE = {};
function packData(key) {
  if (PACK_CACHE[key]) return PACK_CACHE[key];
  const m = CITY_CARS[key];
  return (PACK_CACHE[key] = {
    size: m.size,
    v: new Int16Array(b64(m.v)),
    n: new Int8Array(b64(m.n)),
    c: new Uint8Array(b64(m.c)),
    t: m.t ? new Uint8Array(b64(m.t)) : null,
    i: m.big ? new Uint32Array(b64(m.i)) : new Uint16Array(b64(m.i)),
  });
}
function packBot(t) {
  const d = packData(t.q),
    s = t.L / d.size[2],
    sx = t.W / d.size[0],
    H = d.size[1] * s;
  t.H = H;
  const paint = t.paint
      ? C(t.paint)
      : t.p && rng() < 0.8
        ? C(BOT_PAINT[(rng() * BOT_PAINT.length) | 0])
        : null,
    P = [],
    N = [],
    Cl = [],
    c = new THREE.Color(),
    nv = d.v.length / 3;
  for (let i = 0; i < nv; i++) {
    const nx = d.n[i * 3] / sx,
      ny = d.n[i * 3 + 1] / s,
      nz = d.n[i * 3 + 2] / s,
      nl = Math.hypot(nx, ny, nz) || 1;
    P.push((d.v[i * 3] / 1000) * sx, (d.v[i * 3 + 1] / 1000) * s, (d.v[i * 3 + 2] / 1000) * s);
    N.push(nx / nl, ny / nl, nz / nl);
    if (paint && d.t && d.t[i] === 1) c.copy(paint);
    else c.setRGB(d.c[i * 3] / 255, d.c[i * 3 + 1] / 255, d.c[i * 3 + 2] / 255).convertSRGBToLinear();
    Cl.push(c.r, c.g, c.b);
  }
  const grp = { body: [], hl: [], hr: [], tl: [], tr: [], pr: [], pb: [] },
    tag = (v) => (d.t ? d.t[v] : 0);
  for (let k = 0; k < d.i.length; k += 3) {
    const a = d.i[k],
      b = d.i[k + 1],
      e = d.i[k + 2],
      tg = tag(a),
      xm = P[a * 3] + P[b * 3] + P[e * 3],
      ym = (P[a * 3 + 1] + P[b * 3 + 1] + P[e * 3 + 1]) / 3;
    let g = grp.body;
    if (tg === 2) g = xm < 0 ? grp.hl : grp.hr;
    // polis tepe lambasının kırmızısı stop lambası malzemesiyle boyanmış: üstte kalanlar tepe lambasıdır
    else if (tg === 3) g = ym > H * 0.85 ? grp.pr : xm < 0 ? grp.tl : grp.tr;
    else if (tg === 4) g = grp.pb;
    g.push(a, b, e);
  }
  // ek kutular (far/stop yedekleri, taksi tabelası) aynı dizilere eklenir
  const addBox = (w, h, dd, x, y, z, list, hex) => {
    const bx = new THREE.BoxGeometry(w, h, dd).translate(x, y, z),
      o = P.length / 3,
      bp = bx.attributes.position,
      bn = bx.attributes.normal,
      cc = hex ? C(hex) : c.setRGB(1, 1, 1);
    for (let i = 0; i < bp.count; i++) {
      P.push(bp.getX(i), bp.getY(i), bp.getZ(i));
      N.push(bn.getX(i), bn.getY(i), bn.getZ(i));
      Cl.push(cc.r, cc.g, cc.b);
    }
    for (const ix of bx.index.array) list.push(ix + o);
  };
  const hL = t.L / 2,
    hW = t.W / 2;
  if (!grp.hl.length) {
    const ly = Math.min(0.95, H * 0.28);
    for (const sxn of [-1, 1]) {
      addBox(0.32, 0.14, 0.05, sxn * hW * 0.72, ly, -hL - 0.01, sxn < 0 ? grp.hl : grp.hr);
      addBox(0.2, 0.3, 0.05, sxn * hW * 0.82, ly + 0.15, hL + 0.01, sxn < 0 ? grp.tl : grp.tr);
    }
  }
  if (t.k === "taxi") {
    // tavanın en yüksek bölgesinin ortasına "TAKSİ" kutusu
    let zs = 0,
      n = 0;
    for (let i = 0; i < nv; i++)
      if (P[i * 3 + 1] > H * 0.95) {
        zs += P[i * 3 + 2];
        n++;
      }
    const z = n ? zs / n : 0;
    addBox(0.7, 0.2, 0.3, 0, H + 0.1, z, grp.body, "#1a1a1a");
    addBox(0.6, 0.12, 0.31, 0, H + 0.12, z, grp.body, "#ffd21a");
  }
  return botGroup(new Float32Array(P), new Float32Array(N), new Float32Array(Cl), grp);
}
function botModel(t) {
  if (t.q) return packBot(t);
  if (t.m) return kenneyBot(t);
  const body = [],
    head = [],
    tail = [],
    L = t.L,
    W = t.W,
    H = t.H,
    col = (hex) => C(hex);
  const B = (w, h, d, x, y, z, c, list = body) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    list.push(c ? colorize(g, c) : g);
  };
  const whl = (x, z, r, w) => {
    body.push(
      colorize(
        new THREE.CylinderGeometry(r, r, w, 16).rotateZ(Math.PI / 2).translate(x, r, z),
        col("#121314"),
      ),
    );
    body.push(
      colorize(
        new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12).rotateZ(Math.PI / 2).translate(x, r, z),
        col("#9ea3a8"),
      ),
    );
  };
  const glass = col("#18222c"),
    dark = col("#232527");
  const paint = col(BOT_PAINT[(rng() * BOT_PAINT.length) | 0]);
  // tır: kabin, şasi ve yük kasası
  {
    const cargo = col(["#e9e9e6", "#c9302c", "#2f6db5", "#e0a020", "#4a6b3a"][(rng() * 5) | 0]);
    B(W, 2.25, 2.3, 0, 1.75, -L / 2 + 1.15, paint);
    B(W * 0.9, 0.85, 0.05, 0, 2.35, -L / 2 - 0.02, glass);
    B(W * 0.8, 0.3, L, 0, 0.82, 0, dark);
    B(W, 2.75, L - 2.6, 0, 2.33, 1.3, cargo);
    B(W * 1.01, 0.25, 0.2, 0, 0.62, -L / 2, dark);
    for (const sx of [-1, 1])
      for (const sz of [-L / 2 + 1.35, L / 2 - 1.5, L / 2 - 2.75]) whl(sx * (W / 2 - 0.2), sz, 0.5, 0.36);
    for (const sx of [-1, 1]) {
      B(0.32, 0.16, 0.05, sx * W * 0.36, 1.0, -L / 2 - 0.03, null, head);
      B(0.16, 0.3, 0.05, sx * W * 0.44, 1.1, L / 2 + 0.03, null, tail);
    }
  }
  const g = new THREE.Group();
  const bm = new THREE.Mesh(merge(body), BOTMAT.body);
  bm.castShadow = true;
  bm.receiveShadow = true;
  g.add(bm);
  const hd = head.map((x) => {
      x.deleteAttribute("color");
      return x;
    }),
    tl = tail.map((x) => {
      x.deleteAttribute("color");
      return x;
    });
  // night glow points just in front of the head lamps and behind the tail lamps
  const glow = (list, dz) => {
    const xyz = [];
    for (const x of list) {
      x.computeBoundingBox();
      const c = x.boundingBox.getCenter(new THREE.Vector3());
      xyz.push(c.x, c.y, c.z + dz);
    }
    return xyz;
  };
  g.add(makeHalos(glow(hd, -0.25), BOTMAT.haloHead), makeHalos(glow(tl, 0.2), BOTMAT.haloTail));
  g.add(new THREE.Mesh(merge(hd), BOTMAT.head));
  const tm = new THREE.MeshStandardMaterial({
    color: C("#4a0707"),
    emissive: C("#ff1a0c"),
    emissiveIntensity: 0.4,
  });
  g.add(new THREE.Mesh(merge(tl), tm));
  g.rotation.order = "YXZ";
  return { g, tm };
}
function spawnBots() {
  buildNetwork();
  const city = LINKS.filter((l) => l.speed === 11),
    ring = LINKS.filter((l) => l.speed === 18 || l.speed === 15),
    hw = LINKS.filter((l) => l.speed > 20);
  const pool = [];
  BOT_TYPES.forEach((t) => {
    for (let i = 0; i < Math.round(t.n * BOT_SCALE); i++) pool.push(t);
  });
  pool.forEach((t, k) => {
    const set = k % 10 < 5 ? city : k % 10 < 7 ? ring : hw;
    for (let tries = 0; tries < 40; tries++) {
      const l = set[(rng() * set.length) | 0],
        i = Math.floor(rng() * (l.pts.length - 1)),
        p0 = l.pts[i];
      if (Math.hypot(p0.x, p0.z - 150) < 40) continue;
      if (BOTS.some((b) => Math.hypot(b.pos.x - p0.x, b.pos.z - p0.z) < 22)) continue;
      const m = botModel(t);
      scene.add(m.g);
      const b = {
        t,
        len: t.L,
        wid: t.W,
        hgt: t.H,
        g: m.g,
        tm: m.tm,
        pos: { x: p0.x, y: p0.y, z: p0.z },
        Q: [],
        qi: 0,
        hx: 0,
        hz: -1,
        v: 0,
        vmax: t.v,
        cur: l,
        tailLink: l,
        crashT: 0,
        honkT: 0,
        stuckT: 0,
        pitch: 0,
      };
      for (let j = i + 1; j < l.pts.length; j++)
        b.Q.push({ x: l.pts[j].x, y: l.pts[j].y, z: l.pts[j].z, lk: l });
      const q = b.Q[0];
      const dx = q.x - p0.x,
        dz = q.z - p0.z,
        dl = Math.hypot(dx, dz) || 1;
      b.hx = dx / dl;
      b.hz = dz / dl;
      b.v = l.speed * t.v * 0.6;
      BOTS.push(b);
      break;
    }
  });
}
function nextLink(cur) {
  const out = NODES[cur.to].out;
  let c = out.filter((l) => l.to !== cur.from);
  if (!c.length) c = out;
  return c[(rng() * c.length) | 0];
}
function refill(b) {
  if (b.qi > 0) {
    b.Q = b.Q.slice(b.qi);
    b.qi = 0;
  }
  while (b.Q.length < 8) {
    const cur = b.tailLink,
      nx = nextLink(cur),
      Q = b.Q,
      P0 = Q.length ? Q[Q.length - 1] : b.pos,
      Pm = Q.length > 1 ? Q[Q.length - 2] : { x: P0.x - b.hx, z: P0.z - b.hz };
    let dix = P0.x - Pm.x,
      diz = P0.z - Pm.z;
    const dl = Math.hypot(dix, diz) || 1;
    dix /= dl;
    diz /= dl;
    const P2 = nx.pts[0],
      P3 = nx.pts[1];
    const gx = P2.x - P0.x,
      gz = P2.z - P0.z,
      gl = Math.hypot(gx, gz);
    if (gl > 1.5) {
      const t1 = gx * dix + gz * diz,
        ctl = { x: P0.x + dix * Math.max(0, t1), z: P0.z + diz * Math.max(0, t1) };
      const k = Math.max(2, Math.round(gl / 2.5));
      for (let s = 1; s < k; s++) {
        const u = s / k,
          a = (1 - u) * (1 - u),
          bb = 2 * u * (1 - u),
          c = u * u;
        Q.push({
          x: a * P0.x + bb * ctl.x + c * P2.x,
          z: a * P0.z + bb * ctl.z + c * P2.z,
          y: lerp(P0.y, P2.y, u),
          lk: nx,
          turn: 1,
        });
      }
    }
    for (const p of nx.pts) Q.push({ x: p.x, y: p.y, z: p.z, lk: nx });
    b.tailLink = nx;
  }
}
let honkCD = 0;
function honk(d) {
  if (!audio || !soundOn || honkCD > 0) return;
  honkCD = 4;
  const v = clamp(0.25 - d * 0.004, 0.03, 0.25);
  ping(410, 405, 0.45, v, "square");
  ping(518, 512, 0.45, v * 0.8, "square");
}
function updateBots(dt) {
  honkCD -= dt;
  {
    // polis lambaları: kırmızı-mavi çift çakar
    const t = (performance.now() / 1000) % 0.8,
      on = (a) => (t > a && t < a + 0.08) || (t > a + 0.16 && t < a + 0.24);
    BOTMAT.polR.emissiveIntensity = on(0) ? 6 : 0.15;
    BOTMAT.polB.emissiveIntensity = on(0.4) ? 6 : 0.15;
  }
  const pp = car.p,
    pf = _e.set(0, 0, -1).applyQuaternion(car.q),
    pv = car.v.length();
  for (const b of BOTS) {
    if (b.Q.length - b.qi < 8) refill(b);
    const q = b.Q[b.qi],
      cur = q.lk;
    let vt = cur.speed * b.vmax,
      byPlayer = false;
    // slow down for turns
    const qa = b.Q[Math.min(b.Q.length - 1, b.qi + 4)];
    {
      const ax = qa.x - b.pos.x,
        az = qa.z - b.pos.z,
        al = Math.hypot(ax, az) || 1;
      const cosT = (ax * b.hx + az * b.hz) / al;
      if (cosT < 0.92) vt = Math.min(vt, 6.5);
    }
    for (let k = b.qi; k < Math.min(b.Q.length, b.qi + 6); k++)
      if (b.Q[k].turn) {
        vt = Math.min(vt, 7);
        break;
      }
    // traffic lights
    if (cur.sig && SIG[cur.sig] !== "g") {
      const e = cur.pts[cur.pts.length - 1],
        de = Math.hypot(e.x - b.pos.x, e.z - b.pos.z);
      if (de < 45 && (SIG[cur.sig] === "r" || de > 12)) vt = Math.min(vt, Math.max(0, de - 1.2) * 0.8);
    }
    // keep a gap to anything ahead
    const chk = (x, y, z, len, isP) => {
      const dx = x - b.pos.x,
        dz = z - b.pos.z,
        al = dx * b.hx + dz * b.hz;
      if (al <= 0 || al > 40 || Math.abs(y - b.pos.y) > 4) return;
      const lt = Math.abs(dx * -b.hz + dz * b.hx);
      if (lt > 2.4) return;
      const gap = al - b.len / 2 - len / 2;
      const vv = Math.max(0, (gap - 2.5) * 0.9);
      if (vv < vt) {
        vt = vv;
        byPlayer = isP;
      }
    };
    for (const o of BOTS) if (o !== b) chk(o.pos.x, o.pos.y, o.pos.z, o.len, false);
    if (!menuOpen) chk(pp.x, pp.y - car.sp.cgY, pp.z, car.sp.L, true);
    if (b.crashT > 0) {
      b.crashT -= dt;
      vt = 0;
    }
    const acc = vt > b.v ? 2.6 : 9;
    b.v += clamp(vt - b.v, -acc * dt, acc * dt);
    if (b.v < 0) b.v = 0;
    if (byPlayer && b.v < 0.4 && pv < 1) {
      b.stuckT += dt;
      if (b.stuckT > 2.5) {
        b.stuckT = 0;
        honk(Math.hypot(pp.x - b.pos.x, pp.z - b.pos.z));
      }
    } else b.stuckT = 0;
    // move along the queue
    let d = b.v * dt;
    while (d > 0 && b.qi < b.Q.length) {
      const t = b.Q[b.qi],
        dx = t.x - b.pos.x,
        dz = t.z - b.pos.z,
        l = Math.hypot(dx, dz);
      if (l <= d) {
        b.pos.x = t.x;
        b.pos.y = t.y;
        b.pos.z = t.z;
        d -= l;
        b.qi++;
      } else {
        const f = d / l;
        b.pos.x += dx * f;
        b.pos.z += dz * f;
        b.pos.y += (t.y - b.pos.y) * f;
        d = 0;
      }
    }
    const ah = b.Q[Math.min(b.Q.length - 1, b.qi + 1)];
    {
      const dx = ah.x - b.pos.x,
        dz = ah.z - b.pos.z,
        l = Math.hypot(dx, dz);
      if (l > 0.3) {
        const k = 1 - Math.exp(-dt * 6);
        b.hx += (dx / l - b.hx) * k;
        b.hz += (dz / l - b.hz) * k;
        const n = Math.hypot(b.hx, b.hz);
        b.hx /= n;
        b.hz /= n;
        b.pitch += (Math.atan2(ah.y - b.pos.y, l) - b.pitch) * k;
      }
    }
    b.g.position.set(b.pos.x, b.pos.y, b.pos.z);
    b.g.rotation.y = Math.atan2(-b.hx, -b.hz);
    b.g.rotation.x = b.pitch;
    b.tm.emissiveIntensity = vt < b.v - 0.5 || b.v < 0.3 ? 3 : night ? 1 : 0.4;
  }
}
