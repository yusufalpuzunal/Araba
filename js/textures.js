/* Kanvas ile çizilen dokular, geometri yardımcıları ve tabela/levha dokuları. */
"use strict";

/* ---------- textures ---------- */
function cvs(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
function tex(c, rep, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep, rep);
  t.anisotropy = maxAniso;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
function speckle(g, w, h, base, amt, n) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(rng() * amt * 2 - amt);
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
    g.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
}
function txt(g, s, x, y, maxW, size, weight = 700, align = "center") {
  let z = size;
  g.textAlign = align;
  g.textBaseline = "middle";
  do {
    g.font = `${weight} ${z}px ${FONT}`;
    z--;
  } while (g.measureText(s).width > maxW && z > 8);
  g.fillText(s, x, y);
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
const grassTex = tex(
  cvs(256, 256, (g, w, h) => {
    speckle(g, w, h, "#e8e8e8", 38, 9000);
  }),
  300,
);
function asphaltCanvas(lines) {
  return cvs(256, 512, (g, w, h) => {
    speckle(g, w, h, "#45484b", 22, 14000);
    if (lines) {
      g.fillStyle = "#e9e6dc";
      g.fillRect(12, 0, 7, h);
      g.fillRect(w - 19, 0, 7, h);
      g.fillStyle = "#f2f0e8";
      g.fillRect(124, 0, 8, 190);
    }
  });
}
const roadTex = tex(asphaltCanvas(true));
const plainAsphalt = tex(asphaltCanvas(false));
const hwTex = tex(
  cvs(512, 512, (g, w, h) => {
    speckle(g, w, h, "#34373a", 18, 30000);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = "rgba(0,0,0,.08)";
      g.fillRect(rng() * w, 0, 2 + rng() * 6, h);
    }
    const px = (m) => (m / 22) * w;
    g.fillStyle = "#4a4d50";
    g.fillRect(px(9.9), 0, px(12.1) - px(9.9), h);
    g.fillStyle = "#f1efe6";
    for (const m of [1.5, 20.5]) g.fillRect(px(m) - 4, 0, 8, h);
    for (const m of [9.0, 13.0]) g.fillRect(px(m) - 3, 0, 6, h);
    for (const m of [5.3, 16.7]) g.fillRect(px(m) - 3, 0, 6, 190);
  }),
);
const dirtTex = tex(
  cvs(256, 256, (g, w, h) => {
    speckle(g, w, h, "#7d6648", 30, 9000);
    g.fillStyle = "rgba(60,45,30,.35)";
    g.fillRect(40, 0, 40, h);
    g.fillRect(176, 0, 40, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${(150 + rng() * 60) | 0},${(130 + rng() * 50) | 0},${(100 + rng() * 40) | 0},.8)`;
      g.fillRect(rng() * w, rng() * h, 2, 2);
    }
  }),
);
const tunnelTex = tex(
  cvs(256, 256, (g, w, h) => {
    speckle(g, w, h, "#d9d6cf", 10, 3000);
    g.strokeStyle = "rgba(90,90,85,.35)";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(0, i * 32);
      g.lineTo(w, i * 32);
      g.stroke();
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32, h);
      g.stroke();
    }
    g.fillStyle = "#2c3e57";
    g.fillRect(0, 200, w, 26);
  }),
);
const concreteTex = tex(
  cvs(256, 256, (g, w, h) => {
    speckle(g, w, h, "#a9a8a2", 14, 6000);
    g.strokeStyle = "rgba(60,60,55,.35)";
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * 64);
      g.lineTo(w, i * 64);
      g.stroke();
    }
  }),
  106,
);
const parkTex = tex(
  cvs(128, 128, (g, w, h) => speckle(g, w, h, "#5c7a3a", 26, 3000)),
  12,
);
const rampTex = tex(
  cvs(128, 128, (g, w, h) => {
    speckle(g, w, h, "#b9b6ad", 16, 2000);
    g.fillStyle = "#e8b10d";
    for (let i = -2; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 48, h);
      g.lineTo(i * 48 + 24, h);
      g.lineTo(i * 48 + 24 + 64, 0);
      g.lineTo(i * 48 + 64, 0);
      g.closePath();
      g.fill();
    }
  }),
  0,
);
// upper floors: 4 bays x 4 floors per tile
const facadeTex = tex(
  cvs(512, 512, (g) => {
    speckle(g, 512, 512, "#f2f0ec", 12, 6000);
    for (let by = 0; by < 4; by++)
      for (let bx = 0; bx < 4; bx++) {
        const x = bx * 128,
          y = by * 128;
        g.fillStyle = "rgba(0,0,0,.08)";
        g.fillRect(x, y + 122, 128, 3);
        g.fillStyle = "#3a3f44";
        g.fillRect(x + 18, y + 10, 92, 86);
        const gr = g.createLinearGradient(0, y + 14, 0, y + 92);
        gr.addColorStop(0, "#62778b");
        gr.addColorStop(1, "#26323d");
        g.fillStyle = gr;
        g.fillRect(x + 22, y + 14, 84, 78);
        g.fillStyle = "#3a3f44";
        g.fillRect(x + 62, y + 14, 4, 78);
        g.fillStyle = "rgba(255,255,255,.14)";
        g.fillRect(x + 22, y + 14, 84, 5);
        if ((bx * 7 + by * 3) % 5 === 1) {
          g.fillStyle = "rgba(230,226,215,.9)";
          g.fillRect(x + 22, y + 14, 40, 78);
        }
        g.fillStyle = "rgba(0,0,0,.2)";
        g.fillRect(x + 14, y + 96, 100, 5);
        if ((bx + by) % 3 === 0) {
          g.fillStyle = "rgba(40,44,48,.9)";
          g.fillRect(x + 12, y + 66, 104, 4);
          for (let k = 0; k < 12; k++) g.fillRect(x + 14 + k * 9, y + 66, 2, 32);
        }
      }
  }),
);
const facadeEm = tex(
  cvs(512, 512, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 512, 512);
    for (let by = 0; by < 4; by++)
      for (let bx = 0; bx < 4; bx++) {
        const x = bx * 128,
          y = by * 128,
          r = rng();
        if (r < 0.42) continue;
        g.fillStyle = r < 0.8 ? "#ffc77e" : r < 0.93 ? "#bcd4ff" : "#ffe6bd";
        g.globalAlpha = 0.5 + rng() * 0.5;
        g.fillRect(x + 22, y + 14, 40, 78);
        g.globalAlpha = 0.5 + rng() * 0.5;
        g.fillRect(x + 66, y + 14, 40, 78);
        g.globalAlpha = 1;
      }
  }),
);
const facadeRough = tex(
  cvs(512, 512, (g) => {
    g.fillStyle = "#d8d8d8";
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#262626";
    for (let by = 0; by < 4; by++)
      for (let bx = 0; bx < 4; bx++) g.fillRect(bx * 128 + 22, by * 128 + 14, 84, 78);
  }),
  0,
  false,
);
const awnTex = tex(
  cvs(64, 32, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 32);
    g.fillStyle = "#bdbdbd";
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = "rgba(0,0,0,.25)";
    g.fillRect(0, 26, 64, 6);
  }),
);
const poolTex = tex(
  cvs(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "#fff");
    gr.addColorStop(0.35, "#7a7a7a");
    gr.addColorStop(1, "#000");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }),
  0,
);
const honeyTex = tex(
  cvs(128, 64, (g) => {
    g.fillStyle = "#0b0b0c";
    g.fillRect(0, 0, 128, 64);
    g.strokeStyle = "#3a3c40";
    g.lineWidth = 2;
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 14; x++) {
        const cx = x * 10 + (y % 2) * 5,
          cy = y * 8;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          g.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
        }
        g.closePath();
        g.stroke();
      }
  }),
);
honeyTex.repeat.set(3, 1.2);
const treadTex = tex(
  cvs(512, 64, (g) => {
    g.fillStyle = "#202022";
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = "#0d0d0e";
    for (let k = 0; k < 64; k++) {
      const x = k * 8;
      g.fillRect(x, 6, 3, 22);
      g.fillRect(x + 4, 36, 3, 22);
    }
    g.fillRect(0, 29, 512, 5);
    g.fillRect(0, 0, 512, 3);
    g.fillRect(0, 61, 512, 3);
  }),
);
const sidewallTex = tex(
  cvs(128, 128, (g) => {
    g.fillStyle = "#1d1d1f";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#2c2c2f";
    g.lineWidth = 3;
    for (const r of [58, 52, 46]) {
      g.beginPath();
      g.arc(64, 64, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "#38383c";
    g.font = "700 9px sans-serif";
    g.textAlign = "center";
    for (let k = 0; k < 4; k++) {
      g.save();
      g.translate(64, 64);
      g.rotate((k * Math.PI) / 2);
      g.fillText("YOLCU 245/40", 0, -54);
      g.restore();
    }
  }),
  0,
);

// ışık hâlesi: ortası parlak, kenarı sönen yuvarlak leke (lambalar ve farlar için sahte "bloom")
const glowTex = tex(
  cvs(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, "rgba(255,255,255,.55)");
    gr.addColorStop(0.45, "rgba(255,255,255,.12)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }),
  0,
);
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
function haloMat(color, size, opacity = 1) {
  return new THREE.PointsMaterial({
    map: glowTex,
    color: C(color),
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
function makeHalos(xyz, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(xyz, 3));
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

/* ---------- geometry helpers ---------- */
function merge(geos) {
  let vc = 0,
    ic = 0;
  for (const g of geos) {
    vc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
  }
  const hasC = !!geos[0].attributes.color;
  const pos = new Float32Array(vc * 3),
    nor = new Float32Array(vc * 3),
    uv = new Float32Array(vc * 2),
    col = hasC ? new Float32Array(vc * 3) : null,
    idx = new Uint32Array(ic);
  let vo = 0,
    io = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    if (hasC) col.set(g.attributes.color.array, vo * 3);
    if (g.index) {
      const a = g.index.array;
      for (let k = 0; k < a.length; k++) idx[io + k] = a[k] + vo;
      io += a.length;
    } else {
      for (let k = 0; k < n; k++) idx[io + k] = vo + k;
      io += n;
    }
    vo += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (hasC) out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
function colorize(g, c) {
  const n = g.attributes.position.count,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
/* ---------- gömülü modeller (city-props.js): önü +Z, tabanı y=0 ---------- */
const PROP_CACHE = {};
function propBase(key, lib = CITY_PROPS) {
  const ck = (lib === CITY_PROPS ? "" : "old:") + key;
  if (PROP_CACHE[ck]) return PROP_CACHE[ck];
  const m = lib[key],
    v = new Int16Array(b64(m.v)),
    n = new Int8Array(b64(m.n)),
    c = new Uint8Array(b64(m.c)),
    nv = v.length / 3,
    pos = new Float32Array(nv * 3),
    nor = new Float32Array(nv * 3),
    col = new Float32Array(nv * 3),
    tc = new THREE.Color();
  for (let i = 0; i < nv * 3; i++) {
    pos[i] = v[i] / 1000;
    nor[i] = n[i] / 127;
  }
  for (let i = 0; i < nv; i++) {
    tc.setRGB(c[i * 3] / 255, c[i * 3 + 1] / 255, c[i * 3 + 2] / 255).convertSRGBToLinear();
    col[i * 3] = tc.r;
    col[i * 3 + 1] = tc.g;
    col[i * 3 + 2] = tc.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(m.big ? new Uint32Array(b64(m.i)) : new Uint16Array(b64(m.i)), 1));
  g.size = m.size;
  return (PROP_CACHE[ck] = g);
}
// ang: modelin önünü (sin ang, cos ang) yönüne çevirir
function propGeo(key, x, y, z, ang = 0) {
  return propBase(key).clone().rotateY(ang).translate(x, y, z);
}
function flatPlane(w, d, x, z, y, uScale, vScale) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate(x, y, z);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
  return g;
}
class QB {
  constructor(col) {
    this.p = [];
    this.n = [];
    this.u = [];
    this.c = col ? [] : null;
    this.i = [];
  }
  add(a, b, c, d, uv, n, col) {
    const o = this.p.length / 3;
    for (const v of [a, b, c, d]) this.p.push(v[0], v[1], v[2]);
    for (let k = 0; k < 4; k++) this.n.push(n[0], n[1], n[2]);
    const [u0, v0, u1, v1] = uv;
    this.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
    if (this.c) for (let k = 0; k < 4; k++) this.c.push(col.r, col.g, col.b);
    this.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c) g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}
// vertical quad facing (nx,nz), centered at (cx,cz) offset along n
function vquad(qb, cx, cz, nx, nz, w, y0, y1, off, uv, col) {
  const rx = nz,
    rz = -nx,
    ox = cx + nx * off,
    oz = cz + nz * off,
    h = w / 2;
  qb.add(
    [ox - rx * h, y0, oz - rz * h],
    [ox + rx * h, y0, oz + rz * h],
    [ox + rx * h, y1, oz + rz * h],
    [ox - rx * h, y1, oz - rz * h],
    uv,
    [nx, 0, nz],
    col,
  );
}
function sign2(qb, cx, cy, cz, nx, nz, w, h, uvF, uvB) {
  vquad(qb, cx, cz, nx, nz, w, cy - h / 2, cy + h / 2, 0.012, uvF);
  vquad(qb, cx, cz, -nx, -nz, w, cy - h / 2, cy + h / 2, 0.012, uvB);
}
function gquad(qb, x0, z0, x1, z1, y, uv) {
  qb.add([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uv || [0, 0, 1, 1], [0, 1, 0]);
}

/* ---------- signage textures ---------- */
const SHOPS = [
  ["FIRIN", "#7a3e12"],
  ["ECZANE", "#c8102e"],
  ["KAFE", "#2f5a44"],
  ["MARKET", "#1f5fa8"],
  ["KASAP", "#8a1c1c"],
  ["KİTAPÇI", "#3b3364"],
  ["BERBER", "#1d6f8a"],
  ["ÇİÇEKÇİ", "#b34a7a"],
  ["LOKANTA", "#a8551f"],
  ["OPTİK", "#22303f"],
  ["PASTANE", "#c06c84"],
  ["BAKKAL", "#5d6b2a"],
  ["SİMİTÇİ", "#b0782a"],
  ["OYUNCAKÇI", "#d08a10"],
  ["KUAFÖR", "#6a2c5c"],
  ["MANAV", "#3f7a2a"],
];
const X_NAMES = [
  "Ihlamur Sk.",
  "Menekşe Sk.",
  "Zeytin Sk.",
  "Cumhuriyet Cd.",
  "Defne Sk.",
  "Kestane Sk.",
  "Papatya Sk.",
];
const Z_NAMES = ["Akasya Sk.", "Pınar Sk.", "Lale Sk.", "İstiklal Cd.", "Çınar Sk.", "Gül Sk.", "Bağ Sk."];
let shopTex, shopEm, signTex, nameTex, boardTex;
function makeSignage() {
  const shopCv = cvs(1024, 640, (g) => {
    SHOPS.forEach(([name, col], i) => {
      const x = (i % 4) * 256,
        y = ((i / 4) | 0) * 160;
      g.fillStyle = "#cfc7b8";
      g.fillRect(x, y, 256, 160);
      g.fillStyle = "#8d867a";
      g.fillRect(x, y, 10, 160);
      g.fillRect(x + 246, y, 10, 160);
      g.fillStyle = col;
      g.fillRect(x + 12, y + 8, 232, 36);
      g.fillStyle = "rgba(255,255,255,.2)";
      g.fillRect(x + 12, y + 8, 232, 3);
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(x + 12, y + 41, 232, 3);
      g.fillStyle = "#fff";
      txt(g, name, x + 128, y + 27, 208, 30);
      g.fillStyle = "#24272b";
      g.fillRect(x + 14, y + 50, 228, 104);
      const gr = g.createLinearGradient(0, y + 54, 0, y + 150);
      gr.addColorStop(0, "#dccaa6");
      gr.addColorStop(1, "#8f7c5c");
      g.fillStyle = gr;
      g.fillRect(x + 18, y + 54, 160, 96);
      for (let s = 0; s < 3; s++) {
        g.fillStyle = "rgba(60,45,30,.55)";
        g.fillRect(x + 22, y + 76 + s * 26, 152, 3);
        for (let k = 0; k < 12; k++) {
          g.fillStyle = `hsl(${(rng() * 360) | 0},45%,${40 + rng() * 25}%)`;
          g.fillRect(x + 24 + k * 12.5, y + 63 + s * 26, 8, 13);
        }
      }
      g.fillStyle = "#3d4a55";
      g.fillRect(x + 184, y + 56, 54, 98);
      g.fillStyle = "rgba(255,255,255,.12)";
      g.fillRect(x + 188, y + 60, 46, 40);
      g.fillStyle = "#c8ccd0";
      g.fillRect(x + 190, y + 100, 4, 16);
      g.fillStyle = "rgba(255,255,255,.16)";
      g.beginPath();
      g.moveTo(x + 44, y + 54);
      g.lineTo(x + 84, y + 54);
      g.lineTo(x + 34, y + 150);
      g.lineTo(x + 18, y + 150);
      g.lineTo(x + 18, y + 104);
      g.closePath();
      g.fill();
      g.fillStyle = "#6f685d";
      g.fillRect(x, y + 154, 256, 6);
    });
  });
  shopTex = tex(shopCv);
  shopTex.wrapS = shopTex.wrapT = THREE.ClampToEdgeWrapping;
  shopEm = tex(
    cvs(1024, 640, (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 1024, 640);
      SHOPS.forEach(([name, col], i) => {
        const x = (i % 4) * 256,
          y = ((i / 4) | 0) * 160;
        g.fillStyle = col;
        g.globalAlpha = 0.55;
        g.fillRect(x + 12, y + 8, 232, 36);
        g.globalAlpha = 1;
        g.fillStyle = "#fff";
        txt(g, name, x + 128, y + 27, 208, 30);
        g.fillStyle = "#8a6a40";
        g.fillRect(x + 18, y + 54, 160, 96);
        g.fillStyle = "#2b3642";
        g.fillRect(x + 184, y + 56, 54, 98);
      });
    }),
  );
  shopEm.wrapS = shopEm.wrapT = THREE.ClampToEdgeWrapping;

  // traffic signs atlas (4x4 of 128)
  signTex = tex(
    cvs(512, 512, (g) => {
      const cell = (i, fn) => {
        g.save();
        g.translate((i % 4) * 128, ((i / 4) | 0) * 128);
        fn();
        g.restore();
      };
      const oct = (r) => {
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = Math.PI / 8 + (k * Math.PI) / 4;
          g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
        }
        g.closePath();
      };
      const tri = (r, down) => {
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (down ? Math.PI / 2 : -Math.PI / 2) + (k * Math.PI * 2) / 3;
          g.lineTo(64 + Math.cos(a) * r, (down ? 58 : 72) + Math.sin(a) * r);
        }
        g.closePath();
      };
      const circ = (r) => {
        g.beginPath();
        g.arc(64, 64, r, 0, Math.PI * 2);
      };
      cell(0, () => {
        oct(62);
        g.fillStyle = "#fff";
        g.fill();
        oct(56);
        g.fillStyle = "#c8102e";
        g.fill();
        g.fillStyle = "#fff";
        txt(g, "DUR", 64, 66, 90, 44);
      });
      const lim = (i, v) =>
        cell(i, () => {
          circ(62);
          g.fillStyle = "#fff";
          g.fill();
          circ(54);
          g.lineWidth = 14;
          g.strokeStyle = "#c8102e";
          g.stroke();
          g.fillStyle = "#111";
          txt(g, v, 64, 67, 70, 52);
        });
      lim(1, "50");
      lim(2, "70");
      lim(3, "30");
      cell(4, () => {
        rrect(g, 6, 6, 116, 116, 12);
        g.fillStyle = "#fff";
        g.fill();
        rrect(g, 11, 11, 106, 106, 9);
        g.fillStyle = "#1d4fa3";
        g.fill();
        g.fillStyle = "#fff";
        txt(g, "P", 64, 67, 80, 84);
      });
      cell(5, () => {
        rrect(g, 6, 6, 116, 116, 12);
        g.fillStyle = "#fff";
        g.fill();
        rrect(g, 11, 11, 106, 106, 9);
        g.fillStyle = "#1d4fa3";
        g.fill();
        tri(46, false);
        g.fillStyle = "#fff";
        g.fill();
        g.fillStyle = "#111";
        for (let k = 0; k < 4; k++) g.fillRect(36 + k * 15, 92, 9, 6);
        g.lineWidth = 5;
        g.strokeStyle = "#111";
        g.lineCap = "round";
        g.beginPath();
        g.arc(66, 46, 5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(64, 54);
        g.lineTo(60, 72);
        g.lineTo(52, 86);
        g.moveTo(60, 72);
        g.lineTo(70, 86);
        g.moveTo(63, 60);
        g.lineTo(54, 66);
        g.moveTo(63, 60);
        g.lineTo(74, 64);
        g.stroke();
      });
      const warn = (i, draw) =>
        cell(i, () => {
          tri(62, false);
          g.fillStyle = "#c8102e";
          g.fill();
          tri(46, false);
          g.fillStyle = "#fff";
          g.fill();
          draw();
        });
      warn(6, () => {
        g.strokeStyle = "#111";
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(58, 100);
        g.bezierCurveTo(44, 84, 82, 76, 62, 58);
        g.lineTo(70, 48);
        g.stroke();
        g.beginPath();
        g.moveTo(62, 40);
        g.lineTo(78, 48);
        g.lineTo(64, 56);
        g.closePath();
        g.fillStyle = "#111";
        g.fill();
      });
      cell(7, () => {
        tri(62, true);
        g.fillStyle = "#c8102e";
        g.fill();
        tri(44, true);
        g.fillStyle = "#fff";
        g.fill();
      });
      warn(8, () => {
        g.fillStyle = "#111";
        txt(g, "!", 64, 82, 40, 56);
      });
      cell(9, () => {
        circ(60);
        g.fillStyle = "#c8102e";
        g.fill();
        g.fillStyle = "#fff";
        g.fillRect(24, 54, 80, 20);
      });
      lim(10, "120");
      cell(11, () => {
        tri(62, true);
        g.fillStyle = "#8f969c";
        g.fill();
      });
      cell(12, () => {
        oct(62);
        g.fillStyle = "#8f969c";
        g.fill();
      });
      cell(13, () => {
        circ(62);
        g.fillStyle = "#8f969c";
        g.fill();
      });
      cell(14, () => {
        rrect(g, 6, 6, 116, 116, 12);
        g.fillStyle = "#8f969c";
        g.fill();
      });
      cell(15, () => {
        tri(62, false);
        g.fillStyle = "#8f969c";
        g.fill();
      });
    }),
  );
  signTex.wrapS = signTex.wrapT = THREE.ClampToEdgeWrapping;

  nameTex = tex(
    cvs(512, 1024, (g) => {
      [...X_NAMES, ...Z_NAMES].forEach((n, i) => {
        const y = i * 64;
        rrect(g, 4, y + 4, 504, 56, 8);
        g.fillStyle = "#123f94";
        g.fill();
        g.strokeStyle = "#fff";
        g.lineWidth = 3;
        rrect(g, 10, y + 10, 492, 44, 5);
        g.stroke();
        g.fillStyle = "#fff";
        txt(g, n, 256, y + 33, 440, 36);
      });
    }),
  );
  nameTex.wrapS = nameTex.wrapT = THREE.ClampToEdgeWrapping;

  boardTex = tex(
    cvs(1024, 1792, (g) => {
      const cell = (i, fn) => {
        g.save();
        g.translate((i % 2) * 512, ((i / 2) | 0) * 256);
        fn();
        g.restore();
      };
      const green = (l1, l2, arrow) => {
        rrect(g, 4, 4, 504, 248, 14);
        g.fillStyle = "#0f6b3a";
        g.fill();
        g.strokeStyle = "#fff";
        g.lineWidth = 6;
        rrect(g, 14, 14, 484, 228, 10);
        g.stroke();
        g.fillStyle = "#fff";
        txt(g, l1, 236, 96, 360, 64, 700);
        g.globalAlpha = 0.9;
        txt(g, l2, 236, 170, 360, 40, 600);
        g.globalAlpha = 1;
        g.save();
        g.translate(440, 128);
        if (arrow === "r") g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(0, -60);
        g.lineTo(34, -14);
        g.lineTo(12, -14);
        g.lineTo(12, 56);
        g.lineTo(-12, 56);
        g.lineTo(-12, -14);
        g.lineTo(-34, -14);
        g.closePath();
        g.fill();
        g.restore();
      };
      cell(0, () => green("Şehir Merkezi", "Merkez 1 km", "u"));
      cell(1, () => green("Çevre Yolu", "Dağ Yolu · Seyir Tepesi", "u"));
      cell(2, () => {
        rrect(g, 4, 4, 504, 248, 14);
        g.fillStyle = "#6b3f1f";
        g.fill();
        g.strokeStyle = "#f4e7d0";
        g.lineWidth = 5;
        rrect(g, 14, 14, 484, 228, 10);
        g.stroke();
        g.fillStyle = "#f4e7d0";
        txt(g, "AÇIK YOL", 256, 98, 440, 80, 700);
        txt(g, "Şehrimize hoş geldiniz", 256, 178, 440, 40, 600);
      });
      cell(3, () => {
        const gr = g.createLinearGradient(0, 0, 512, 256);
        gr.addColorStop(0, "#14161a");
        gr.addColorStop(1, "#5a0d12");
        g.fillStyle = gr;
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#b3121b";
        g.beginPath();
        g.moveTo(250, 190);
        g.bezierCurveTo(270, 150, 320, 130, 380, 128);
        g.lineTo(430, 130);
        g.bezierCurveTo(470, 140, 495, 160, 500, 190);
        g.closePath();
        g.fill();
        g.fillStyle = "#111";
        g.beginPath();
        g.arc(290, 192, 20, 0, Math.PI * 2);
        g.arc(460, 192, 20, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        txt(g, "VELA CORSA", 140, 92, 240, 56, 700);
        g.fillStyle = "#e8c7c7";
        txt(g, "Yolu hisset.", 130, 150, 220, 34, 600);
      });
      cell(4, () => {
        const gr = g.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, "#7fb2dc");
        gr.addColorStop(1, "#e8eef2");
        g.fillStyle = gr;
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#4d6a52";
        g.beginPath();
        g.moveTo(0, 256);
        g.lineTo(120, 120);
        g.lineTo(200, 190);
        g.lineTo(300, 90);
        g.lineTo(420, 200);
        g.lineTo(512, 140);
        g.lineTo(512, 256);
        g.closePath();
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.moveTo(300, 90);
        g.lineTo(326, 114);
        g.lineTo(276, 114);
        g.closePath();
        g.fill();
        g.fillStyle = "#14202a";
        txt(g, "KAÇKAR YAYLA 4x4", 256, 46, 470, 48, 700);
        g.fillStyle = "#fff";
        txt(g, "Yolun bittiği yerde başlar.", 256, 226, 440, 30, 600);
      });
      cell(5, () => {
        g.fillStyle = "#0d0d0f";
        g.fillRect(0, 0, 512, 256);
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 32; x++) {
            if ((x + y) % 2) continue;
            g.fillStyle = "#f4f4f4";
            g.fillRect(x * 16, y * 16, 16, 16);
            g.fillRect(x * 16, 192 + y * 16, 16, 16);
          }
        g.fillStyle = "#f2b705";
        txt(g, "ILGAZ RALLİ KUPASI", 256, 110, 470, 52, 700);
        g.fillStyle = "#fff";
        txt(g, "Bu hafta sonu · Çevre Yolu", 256, 156, 420, 30, 600);
      });
      cell(6, () => {
        g.fillStyle = "#f3e3c3";
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#b0782a";
        g.beginPath();
        g.ellipse(390, 140, 74, 56, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#f3e3c3";
        g.beginPath();
        g.ellipse(390, 140, 30, 20, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#8a2c1c";
        txt(g, "KÖŞE KAFE", 170, 90, 300, 60, 700);
        g.fillStyle = "#3a2a1a";
        txt(g, "Simit ve çay hazır!", 170, 156, 300, 34, 600);
      });
      cell(8, () => green("OTOYOL", "Yayla Tüneli 1,5 km", "u"));
      cell(9, () => {
        rrect(g, 4, 40, 504, 176, 12);
        g.fillStyle = "#e9ecef";
        g.fill();
        g.strokeStyle = "#1d4fa3";
        g.lineWidth = 8;
        rrect(g, 14, 50, 484, 156, 8);
        g.stroke();
        g.fillStyle = "#1d4fa3";
        txt(g, "YAYLA TÜNELİ", 256, 112, 440, 64, 700);
        txt(g, "Farlarınızı yakınız", 256, 168, 420, 34, 600);
      });
      cell(10, () => green("Çevre Yolu", "Şehir Merkezi ↙", "u"));
      cell(11, () => green("OTOYOL", "Çevre Yolu Bağlantısı", "u"));
      cell(12, () => {
        rrect(g, 4, 40, 504, 176, 12);
        g.fillStyle = "#e9ecef";
        g.fill();
        g.strokeStyle = "#1d4fa3";
        g.lineWidth = 8;
        rrect(g, 14, 50, 484, 156, 8);
        g.stroke();
        g.fillStyle = "#1d4fa3";
        txt(g, "KARTAL TÜNELİ", 256, 112, 440, 64, 700);
        txt(g, "Farlarınızı yakınız", 256, 168, 420, 34, 600);
      });
      cell(13, () => green("DAĞ OTOYOLU", "Kartal Tüneli · Kanyon", "u"));
      cell(7, () => {
        g.fillStyle = "#7d8288";
        g.fillRect(0, 0, 512, 256);
        g.strokeStyle = "#666b70";
        g.lineWidth = 6;
        for (let k = 1; k < 6; k++) {
          g.beginPath();
          g.moveTo(0, k * 42);
          g.lineTo(512, k * 42);
          g.stroke();
        }
      });
    }),
  );
  boardTex.wrapS = boardTex.wrapT = THREE.ClampToEdgeWrapping;
}
const cellUV4 = (i) => {
  const c = i % 4,
    r = (i / 4) | 0;
  return [c / 4 + 0.002, 1 - (r + 1) / 4 + 0.002, (c + 1) / 4 - 0.002, 1 - r / 4 - 0.002];
};
const nameUV = (i) => [0, 1 - (i + 1) / 16 + 0.002, 1, 1 - i / 16 - 0.002];
const boardUV = (i) => {
  const c = i % 2,
    r = (i / 2) | 0;
  return [c / 2, 1 - (r + 1) / 7, (c + 1) / 2, 1 - r / 7];
};
const SIGN_BACK = { 0: 12, 1: 13, 2: 13, 3: 13, 4: 14, 5: 14, 6: 15, 7: 11, 8: 15, 9: 13, 10: 13 };
