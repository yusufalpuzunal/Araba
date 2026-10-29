/* Araç gövdesi: yan profilden (sp.upper) yuvarlatılmış, gerçekçi bir gövde "örülür" (loft).
   Gövde, burundan arkaya dizilmiş enine kesitlerden oluşur; her kesit bir "süper elips"tir:
   yanları hafif şişkin, omuzları yuvarlak, üstü kubbeli. Cam kabin de aynı yöntemle yapılır ve
   yukarı doğru daralır; tavan ve direkler kabinin üstüne kaplanan şeritlerdir.
   Koordinatlar: profil x = ileri, y = yukarı; modelde X = yana, Y = yukarı, Z = -x. */
"use strict";

// closed side silhouette of the lower body
function bodySilhouette(sp) {
  const u = sp.upper;
  return [[u[u.length - 1][0] + 0.06, sp.yb], [u[0][0] - 0.07, sp.yb], ...u];
}
// vertical extent of a closed polygon at x: [lo, hi] (null outside)
function spanAt(poly, x) {
  let lo = 1e9,
    hi = -1e9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    if (a[0] === b[0] || (x - a[0]) * (x - b[0]) > 0) continue;
    const y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return hi >= lo ? [lo, hi] : null;
}
function polyRange(poly) {
  let a = 1e9,
    b = -1e9;
  for (const p of poly) {
    a = Math.min(a, p[0]);
    b = Math.max(b, p[0]);
  }
  return [a, b];
}
// sample positions along the car: dense near the ends and around the wheel arches
function stations(x0, x1, n, extra) {
  const xs = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    xs.push(x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(Math.PI * t)) * 0.4 + (x1 - x0) * t * 0.6);
  }
  for (const e of extra) if (e > x0 && e < x1) xs.push(e);
  xs.sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.004);
}

/* ---------- alt gövde ---------- */
// n: stations along the car, M: points per half section (traffic cars use fewer)
function makeBodyShape(sp, n = 96, M = 14) {
  const sil = bodySilhouette(sp),
    [x0, x1] = polyRange(sil),
    hw = sp.W / 2,
    ra = sp.R + 0.065;
  const arch = (x) => {
    for (const ax of [-sp.wb / 2, sp.wb / 2]) {
      const d = x - ax;
      if (Math.abs(d) < ra) return sp.R + Math.sqrt(ra * ra - d * d);
    }
    return -1e9;
  };
  // section at x: centre height yc, half height hh, half width w
  const sec = (x) => {
    const s = spanAt(sil, clamp(x, x0 + 1e-4, x1 - 1e-4)) || [sp.yb, sp.yb + 0.02];
    let lo = Math.max(s[0], arch(x)),
      hi = s[1];
    if (hi - lo < 0.012) lo = hi - 0.012;
    const e = Math.max(0, Math.min(x - x0, x1 - x));
    const w = hw * (0.83 + 0.17 * Math.sqrt(1 - Math.pow(1 - Math.min(e / 0.55, 1), 2)));
    return { yc: (lo + hi) / 2, hh: (hi - lo) / 2, w };
  };
  // superellipse: flatter below (rocker panels), rounder shoulder on top, a little tumblehome
  const pt = (S, a) => {
    const c = Math.cos(a),
      s = Math.sin(a),
      n = s < 0 ? 5.5 : 3.4;
    return [
      S.w * Math.pow(Math.abs(c), 2 / n) * (1 - 0.05 * Math.max(0, s) * Math.max(0, s)),
      S.yc + S.hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
    ];
  };
  const ax = [-sp.wb / 2, sp.wb / 2],
    extra = [];
  const ka = n > 60 ? 10 : 5;
  for (const a of ax) for (let k = -ka; k <= ka; k++) extra.push(a + (k / ka) * ra * 1.02);
  return { sec, pt, x0, x1, xs: stations(x0, x1, n, extra), M };
}
// lateral surface position of the body at profile x and height y (for door lines, mirrors, handles...)
function bodyXAt(shape, x, y) {
  const S = shape.sec(x),
    v = clamp((y - S.yc) / (S.hh || 1e-3), -1, 1),
    n = v < 0 ? 5.5 : 3.4,
    s = Math.pow(Math.abs(v), n / 2),
    c = Math.sqrt(Math.max(0, 1 - s * s));
  return S.w * Math.pow(c, 2 / n) * (1 - 0.05 * (v > 0 ? s * s : 0));
}

// builds a closed tube from rings of [X, Y] points (right side given; left mirrored), plus end caps
function loftTube(xs, ringAt) {
  const pos = [],
    idx = [];
  let R = 0;
  for (const x of xs) {
    const right = ringAt(x),
      ring = right.concat(
        right
          .slice(1, -1)
          .reverse()
          .map(([X, Y]) => [-X, Y]),
      );
    R = ring.length;
    for (const [X, Y] of ring) pos.push(X, Y, -x);
  }
  const N = xs.length;
  for (let i = 0; i < N - 1; i++)
    for (let k = 0; k < R; k++) {
      const a = i * R + k,
        b = i * R + ((k + 1) % R),
        c = a + R,
        d = b + R;
      idx.push(a, c, b, b, c, d);
    }
  // end caps (fan to the ring centre)
  for (const [ri, flip] of [
    [0, false],
    [N - 1, true],
  ]) {
    let cx = 0,
      cy = 0;
    for (let k = 0; k < R; k++) {
      cx += pos[(ri * R + k) * 3];
      cy += pos[(ri * R + k) * 3 + 1];
    }
    const ci = pos.length / 3;
    pos.push(cx / R, cy / R, -xs[ri]);
    for (let k = 0; k < R; k++) {
      const a = ri * R + k,
        b = ri * R + ((k + 1) % R);
      flip ? idx.push(ci, b, a) : idx.push(ci, a, b);
    }
  }
  return orientOut(pos, idx);
}
// open strip (one side) between angles, used for roof skin and pillars on the cabin
function loftStrip(xs, ringAt, side) {
  const pos = [],
    idx = [];
  let R = 0;
  for (const x of xs) {
    const ring = ringAt(x);
    R = ring.length;
    for (const [X, Y] of ring) pos.push(X * side, Y, -x);
  }
  for (let i = 0; i < xs.length - 1; i++)
    for (let k = 0; k < R - 1; k++) {
      const a = i * R + k,
        b = a + 1,
        c = a + R,
        d = b + R;
      idx.push(a, c, b, b, c, d);
    }
  return orientOut(pos, idx);
}
// makes sure faces point away from the car's centre line (flip the winding if they do not)
function orientOut(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal,
    p = g.attributes.position;
  let score = 0;
  for (let i = 0; i < p.count; i += 7) score += n.getX(i) * p.getX(i) + n.getY(i) * (p.getY(i) - 0.6);
  if (score < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  g.computeBoundingSphere();
  return g;
}
function bodyGeo(shape) {
  const { pt, sec, M } = shape;
  return loftTube(shape.xs, (x) => {
    const S = sec(x),
      r = [];
    for (let k = 0; k <= M; k++) r.push(pt(S, -Math.PI / 2 + (Math.PI * k) / M));
    return r;
  });
}

/* ---------- cam kabin ---------- */
function makeCabinShape(sp, res = 56) {
  const poly = sp.cabin,
    [x0, x1] = polyRange(poly),
    gw = sp.cabW / 2,
    n = 3,
    tum = sp.open ? 0.05 : 0.15;
  const sec = (x) => {
    const s = spanAt(poly, clamp(x, x0 + 1e-4, x1 - 1e-4)) || [sp.beltY, sp.beltY + 0.01];
    return { lo: s[0], hi: Math.max(s[1], s[0] + 0.006) };
  };
  // f = 0 at the belt line, 1 at the roof centre
  const pt = (S, phi, off = 0) => {
    const c = Math.cos(phi),
      s = Math.sin(phi),
      f = Math.pow(s, 2 / n);
    // off pushes skins (roof, pillars) just outside the glass; it fades to 0 at the centre line so both halves meet
    return [gw * (1 - tum * f) * Math.pow(c, 2 / n) + off * c, S.lo + (S.hi - S.lo) * f + off * (0.3 + 0.7 * s)];
  };
  return { sec, pt, x0, x1, xs: stations(x0, x1, res, []), gw };
}
function cabinGlassGeo(C2, M = 12) {
  return loftTube(C2.xs, (x) => {
    const S = C2.sec(x),
      r = [[C2.gw, S.lo - 0.1]];
    for (let k = 0; k <= M; k++) r.push(C2.pt(S, ((Math.PI / 2) * k) / M));
    return r;
  });
}
// a skin over part of the cabin: profile x range [xa, xb], angle range [pa, pb] (radians), both sides
function cabinBand(C2, xa, xb, pa, pb, off = 0.006) {
  const xs = C2.xs.filter((x) => x > xa && x < xb);
  xs.unshift(Math.max(xa, C2.x0 + 1e-3));
  xs.push(Math.min(xb, C2.x1 - 1e-3));
  const ring = (x) => {
    const S = C2.sec(x),
      r = [];
    for (let k = 0; k <= 6; k++) r.push(C2.pt(S, pa + ((pb - pa) * k) / 6, off));
    return r;
  };
  return merge([loftStrip(xs, ring, 1), loftStrip(xs, ring, -1)].map(addUV));
}
const addUV = (g) => {
  g.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2),
  );
  return g;
};

/* ---------- yere oturtan yumuşak gölge ---------- */
const contactTex = (() => {
  const t = new THREE.CanvasTexture(
    cvs(128, 256, (g) => {
      g.clearRect(0, 0, 128, 256);
      for (let i = 0; i < 24; i++) {
        const k = i / 23;
        g.fillStyle = `rgba(0,0,0,${0.06 * (1 - k) + 0.012})`;
        rrect(g, 6 + k * 34, 10 + k * 60, 116 - k * 68, 236 - k * 120, 40 - k * 20);
        g.fill();
      }
    }),
  );
  return t;
})();
function makeContactShadow(sp) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(sp.W * 1.25, sp.L * 1.12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: contactTex,
      color: 0x000000,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
  m.renderOrder = 1;
  return m;
}

// height of the cabin surface at profile x and lateral distance X (roof racks, rails, seat headroom)
function cabinYAt(C2, x, X) {
  const S = C2.sec(x);
  let best = S.hi,
    bd = 1e9;
  for (let k = 0; k <= 40; k++) {
    const [px, py] = C2.pt(S, ((Math.PI / 2) * k) / 40),
      d = Math.abs(px - Math.abs(X));
    if (d < bd) {
      bd = d;
      best = py;
    }
  }
  return best;
}
// frontmost / rearmost profile x where the body is still at least X wide at height y (lamps sit there)
function noseX(shape, X, y) {
  for (let i = shape.xs.length - 1; i >= 0; i--)
    if (bodyXAt(shape, shape.xs[i], y) >= Math.abs(X)) return shape.xs[i];
  return shape.x1;
}
function tailX(shape, X, y) {
  for (const x of shape.xs) if (bodyXAt(shape, x, y) >= Math.abs(X)) return x;
  return shape.x0;
}
