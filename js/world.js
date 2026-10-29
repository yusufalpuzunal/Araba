/* Dünyayı kurar: arazi, yollar, şehir, binalar, tabelalar, otoyol yapıları, benzinlikler, ağaçlar, jetonlar, mini harita. */
"use strict";

/* ---------- build world ---------- */
const collectibles = [];
const W = {}; // world materials toggled by day/night
const signalMats = {};
let mapCanvas;
function buildWorld() {
  buildHeightfield();
  rampSetup();
  makeSignage();

  // terrain
  const tg = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, H[i]);
  tg.computeVertexNormals();
  const tn = tg.attributes.normal,
    cols = new Float32Array(tp.count * 3);
  const cG1 = C("#4a6a2c"),
    cG2 = C("#6d7a3a"),
    cRock = C("#77736a"),
    cDirt = C("#7a6a50"),
    cHigh = C("#8f8c86"),
    tmpc = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i),
      z = tp.getZ(i),
      y = H[i],
      ny = tn.getY(i);
    tmpc.copy(cG1).lerp(cG2, clamp(fbm(x * 0.01, z * 0.01, 3) * 0.9 + 0.45, 0, 1));
    tmpc.lerp(cRock, smoothstep(0.9, 0.75, ny));
    tmpc.lerp(cHigh, smoothstep(110, 170, y) * 0.7);
    const rd = RD[i];
    if (rd < 15) tmpc.lerp(cDirt, smoothstep(15, 9, rd) * 0.75);
    cols[i * 3] = tmpc.r;
    cols[i * 3 + 1] = tmpc.g;
    cols[i * 3 + 2] = tmpc.b;
  }
  tg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  {
    const src = tg.index.array,
      keep = [];
    for (let iy = 0; iy < N; iy++)
      for (let ix = 0; ix < N; ix++) {
        const cx = -HALF + (ix + 0.5) * RES,
          cz = -HALF + (iy + 0.5) * RES;
        let cut = false;
        for (const P of PORTALS) {
          const q = P.h.pts[P.j],
            t1 = P.h.tx[P.j],
            t2 = P.h.tz[P.j],
            dx = cx - q.x,
            dz = cz - q.z;
          if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue;
          const al = (dx * t1 + dz * t2) * P.dirIn,
            lt = dx * -t2 + dz * t1;
          if (al > -7 && al < 9 && Math.abs(lt) < HW_HALF + 3) {
            cut = true;
            break;
          }
        }
        if (cut) continue;
        const o = (iy * N + ix) * 6;
        for (let k = 0; k < 6; k++) keep.push(src[o + k]);
      }
    tg.setIndex(keep);
  }
  const terrain = new THREE.Mesh(
    tg,
    new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 1, metalness: 0 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // dere: su yüzeyi vadi çizgisi boyunca uzanan düz bir şerit
  W.water = new THREE.MeshStandardMaterial({
    color: C("#24515e"),
    roughness: 0.12,
    metalness: 0.1,
  });
  for (const v of VALLEYS) {
    if (!v.water) continue;
    const pos = [],
      ind = [],
      half = v.r[0] + 8;
    let n = 0;
    for (const g of v.seg)
      for (let t = 0; t < g.l; t += 4) {
        if (g.s0 + t < v.fade * 0.9) continue;
        const cx = g.ax + g.dx * t,
          cz = g.az + g.dz * t;
        pos.push(cx + g.dz * half, v.water, cz - g.dx * half, cx - g.dz * half, v.water, cz + g.dx * half);
        if (n > 0) ind.push((n - 1) * 2, (n - 1) * 2 + 1, n * 2, (n - 1) * 2 + 1, n * 2 + 1, n * 2);
        n++;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(ind);
    g.computeVertexNormals();
    const wm = new THREE.Mesh(g, W.water);
    wm.receiveShadow = true;
    scene.add(wm);
  }

  // road ribbons
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.88,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const hwMat = new THREE.MeshStandardMaterial({
    map: hwTex,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const dirtMat = new THREE.MeshStandardMaterial({
    map: dirtTex,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  for (const rd of ROADS) {
    const pts = rd.pts,
      n = pts.length,
      pos = [],
      uv = [],
      ind = [];
    let dist = 0;
    const half = [6, HW_HALF, 4][rd.type],
      yo = rd.type === 1 ? 0.15 : 0.13;
    for (let i = 0; i < n; i++) {
      const a = pts[rd.closed ? (i - 1 + n) % n : Math.max(0, i - 1)],
        b = pts[rd.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b.x - a.x,
        tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
      const sx = -tz,
        sz = tx,
        p = pts[i];
      if (i > 0) dist += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
      for (const sgn of [-1, 1]) {
        const x = p.x + sx * half * sgn,
          z = p.z + sz * half * sgn;
        // otoyollar enine düzdür (yol ekseni yüksekliği); diğer yollar araziyi izler
        pos.push(x, (rd.type === 1 || (rd.kind && rd.kind[i]) ? rd.ys[i] : hAt(x, z)) + yo, z);
        uv.push(sgn < 0 ? 0 : 1, dist / 16);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2,
        b = (i + 1) * 2;
      ind.push(a, a + 1, b, a + 1, b + 1, b);
    }
    if (rd.closed) {
      const p = pts[0],
        d2 = (dist + Math.hypot(p.x - pts[n - 1].x, p.z - pts[n - 1].z)) / 16;
      pos.push(...pos.slice(0, 6));
      uv.push(0, d2, 1, d2);
      const a = (n - 1) * 2,
        b = n * 2;
      ind.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, [roadMat, hwMat, dirtMat][rd.type]);
    m.receiveShadow = true;
    scene.add(m);
  }

  // city ground & streets
  const city = new THREE.Mesh(
    flatPlane(CITY * 2, CITY * 2, 0, 0, 0.03, 1, 1),
    new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  city.receiveShadow = true;
  scene.add(city);
  const S = [-180, -120, -60, 0, 60, 120, 180];
  const segs = [],
    inter = [],
    segList = [];
  const bounds = [-CITY, ...S, CITY];
  for (const s of S) {
    for (let k = 0; k < bounds.length - 1; k++) {
      const a = bounds[k],
        b = bounds[k + 1];
      const a2 = a + (S.includes(a) ? 6 : 0),
        b2 = b - (S.includes(b) ? 6 : 0);
      const len = b2 - a2;
      if (len <= 1) continue;
      if ((Math.abs(a) === CITY || Math.abs(b) === CITY) && s !== 0) continue;
      const mid = (a2 + b2) / 2;
      segs.push(flatPlane(12, len, s, mid, 0.06, 1, len / 16));
      const g2 = flatPlane(12, len, 0, 0, 0.06, 1, len / 16);
      g2.rotateY(Math.PI / 2);
      g2.translate(mid, 0, s);
      segs.push(g2);
      segList.push({ s, a: a2, b: b2 });
    }
    for (const t of S) inter.push(flatPlane(12, 12, s, t, 0.065, 1, 0.75));
  }
  const stMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const st = new THREE.Mesh(merge(segs), stMat);
  st.receiveShadow = true;
  scene.add(st);
  const it = new THREE.Mesh(
    merge(inter),
    new THREE.MeshStandardMaterial({
      map: plainAsphalt,
      roughness: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  it.receiveShadow = true;
  scene.add(it);

  // ---- buildings with shops ----
  const GF = 4.2,
    FL = 3.6;
  const centers = [-150, -90, -30, 30, 90, 150];
  const parks = new Set(["-150,90", "90,-150", "150,150", "-90,-90", "30,150"]);
  const plaza = new Set(["-30,-30", "-30,30", "30,-30", "30,30"]);
  const bGeos = [],
    detail = [],
    parkGeos = [];
  const pal = [
    "#d9d4cb",
    "#c8ccd0",
    "#b9a99a",
    "#e6e1d6",
    "#9ea7ad",
    "#cdbba6",
    "#a7b3b8",
    "#ded8cf",
    "#b7aea0",
    "#c9b28f",
  ].map(C);
  const ledgeCols = ["#6d6a65", "#8a8178", "#545a60", "#7b6f62"].map(C);
  const awnCols = ["#b3121b", "#1f5fa8", "#2f6b3a", "#c87a12", "#6a2c5c", "#2b2b2b", "#b85a3c"].map(C);
  const shopQB = new QB(false),
    awnQB = new QB(true);
  const treeSpots = [];
  // cephe ayrıntıları (City Pack): klima dış üniteleri, yangın merdivenleri, çatı çıkışları
  let acN = 0,
    fireN = 0;
  // klima dış ünitesi: beyaz kasa, önde pervane ızgarası ve yan panjur (önü +Z)
  const AC_GEO = merge([
    colorize(new THREE.BoxGeometry(0.99, 0.65, 0.41).translate(0, 0.325, 0), C("#e8e9e6")),
    colorize(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 14).rotateX(Math.PI / 2).translate(0.17, 0.33, 0.2),
      C("#3a3d40"),
    ),
    colorize(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8).rotateX(Math.PI / 2).translate(0.17, 0.33, 0.21),
      C("#9a9c9e"),
    ),
    colorize(new THREE.BoxGeometry(0.26, 0.46, 0.02).translate(-0.3, 0.33, 0.21), C("#c9cbc8")),
    colorize(new THREE.BoxGeometry(0.1, 0.04, 0.3).translate(-0.3, 0.02, 0.06), C("#7b7d7f")),
    colorize(new THREE.BoxGeometry(0.1, 0.04, 0.3).translate(0.3, 0.02, 0.06), C("#7b7d7f")),
  ]);
  const blockC = (v) => Math.round((v - 30) / 60) * 60 + 30;
  function cellUV4Shop(i) {
    const c = i % 4,
      r = (i / 4) | 0;
    return [c / 4 + 0.001, 1 - (r + 1) / 4 + 0.002, (c + 1) / 4 - 0.001, 1 - r / 4 - 0.002];
  }
  function building(cx, cz, w, d, floors) {
    const h = GF + floors * FL;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, h / 2, cz);
    const uv = g.attributes.uv,
      pos = g.attributes.position;
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        if (f === 2 || f === 3) {
          uv.setXY(i, 0.01, 0.01);
          continue;
        }
        const fw = f < 2 ? d : w,
          bays = Math.max(1, Math.round(fw / 4));
        uv.setXY(i, (uv.getX(i) * bays) / 4, (pos.getY(i) - GF) / FL / 4);
      }
    bGeos.push(colorize(g, pal[(rng() * pal.length) | 0]));
    const o = { t: 0, minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top: h };
    addObs(o, o.minX, o.maxX, o.minZ, o.maxZ);
    const lc = ledgeCols[(rng() * ledgeCols.length) | 0];
    detail.push(colorize(new THREE.BoxGeometry(w + 0.36, 0.34, d + 0.36).translate(cx, GF + 0.06, cz), lc));
    detail.push(colorize(new THREE.BoxGeometry(w + 0.2, 0.7, d + 0.2).translate(cx, h + 0.2, cz), lc));
    const nu = 1 + ((rng() * 3) | 0);
    for (let k = 0; k < nu; k++) {
      const uw = 1.4 + rng() * 2,
        ud = 1.4 + rng() * 2,
        uh = 0.9 + rng() * 1.4;
      const ux = cx + (rng() - 0.5) * (w - uw - 2),
        uz = cz + (rng() - 0.5) * (d - ud - 2);
      if (rng() < 0.35)
        detail.push(
          colorize(
            new THREE.CylinderGeometry(0.9, 0.9, 1.8, 12).translate(ux, h + 0.55 + 0.9, uz),
            C("#9aa3aa"),
          ),
        );
      else
        detail.push(
          colorize(new THREE.BoxGeometry(uw, uh, ud).translate(ux, h + 0.55 + uh / 2, uz), C("#b9bcbf")),
        );
    }
    if (w > 7 && d > 7 && rng() < 0.5) {
      const ex = cx + (rng() - 0.5) * (w - 5),
        ez = cz + (rng() - 0.5) * (d - 5);
      detail.push(propGeo("roofexit", ex, h + 0.4, ez, ((rng() * 4) | 0) * (Math.PI / 2)));
    }
    const faces = [
      [1, 0, d, cx + w / 2, cz],
      [-1, 0, d, cx - w / 2, cz],
      [0, 1, w, cx, cz + d / 2],
      [0, -1, w, cx, cz - d / 2],
    ];
    for (const [nx, nz, len, fx, fz] of faces) {
      const units = Math.max(1, Math.round(len / 6.5)),
        uw = len / units,
        rx = nz,
        rz = -nx,
        ang = Math.atan2(nx, nz);
      // klimalar: üst katlarda pencere altlarına, seyrek
      const bays = Math.max(1, Math.round(len / 4));
      for (let f = 0; f < Math.min(floors, 6); f++)
        for (let b = 0; b < bays; b++) {
          if (acN >= 170 || rng() > 0.05) continue;
          const off = -len / 2 + (len * (b + 0.5)) / bays;
          detail.push(
            AC_GEO.clone()
              .rotateY(ang)
              .translate(fx + rx * off + nx * 0.22, GF + f * FL + 0.12, fz + rz * off + nz * 0.22),
          );
          acN++;
        }
      // yangın merdiveni: yalnız bina aralarına bakan (sokağa bakmayan) yüzlerde
      const street = nx ? Math.abs(fx - Math.round(fx / 60) * 60) : Math.abs(fz - Math.round(fz / 60) * 60),
        gapHalf = nx ? Math.abs(fx - blockC(fx)) : Math.abs(fz - blockC(fz));
      if (street > 14 && gapHalf > 2.4 && len > 11 && floors >= 3 && fireN < 90 && rng() < 0.6) {
        const off = (rng() - 0.5) * (len - 10.5);
        for (let y = GF; y + 7.2 <= h - 0.5; y += 7.2) {
          detail.push(propGeo("fireexit", fx + rx * off + nx * 1.0, y, fz + rz * off + nz * 1.0, ang));
          fireN++;
        }
      }
      for (let u = 0; u < units; u++) {
        const off = -len / 2 + uw * (u + 0.5),
          ox = fx + rx * off,
          oz = fz + rz * off;
        vquad(shopQB, ox, oz, nx, nz, uw - 0.14, 0, GF - 0.24, 0.04, cellUV4Shop((rng() * SHOPS.length) | 0));
        if (rng() < 0.45) {
          const ac = awnCols[(rng() * awnCols.length) | 0],
            aw = uw - 0.6,
            hw = aw / 2,
            y1 = GF - 0.55,
            y0 = GF - 1.15,
            out = 1.25;
          const wx = ox + nx * 0.06,
            wz = oz + nz * 0.06,
            ex = ox + nx * out,
            ez = oz + nz * out;
          const nn = new THREE.Vector3(nx * 0.6, 1, nz * 0.6).normalize();
          awnQB.add(
            [ex - rx * hw, y0, ez - rz * hw],
            [ex + rx * hw, y0, ez + rz * hw],
            [wx + rx * hw, y1, wz + rz * hw],
            [wx - rx * hw, y1, wz - rz * hw],
            [0, 0, aw / 1.1, 1],
            [nn.x, nn.y, nn.z],
            ac,
          );
        }
      }
    }
  }
  // ---- eski şehir: tuğla sıra evler (City Pack, city-old.js) ----
  // her blok: dört köşede köşe binası, aralarda sıra evler, ortada ağaçlı bir avlu
  const OLD_TOWN = new Set(["-150,-150", "-150,-90", "-90,-150"]),
    oldGeos = [],
    oldWin = [],
    OLD_ROW = [
      ["red", 3],
      ["green", 3],
      ["gb", 2],
      ["rb", 2],
      ["brown", 2],
      ["big", 1],
    ];
  // yandaki pencereli yüz: kırmızı köşe binasında -X, pizzacıda +X
  const OLD_CORNER = [
    ["redCorner", -1],
    ["pizza", 1],
  ];
  function oldHouse(base, x, z, ang, kz) {
    const g = base.clone().scale(1, 1, kz).rotateY(ang).translate(x, 0, z);
    // pencereler ayrı: gece bazı binaların pencereleri yanar
    const lit = rng() < 0.55,
      c = g.attributes.color,
      idx = g.index.array,
      body = [],
      win = [];
    for (let k = 0; k < idx.length; k += 3) {
      const v = idx[k],
        isWin = c.getZ(v) > 0.75 && c.getY(v) > 0.6 && c.getZ(v) >= c.getX(v);
      (lit && isWin ? win : body).push(idx[k], idx[k + 1], idx[k + 2]);
    }
    const bg = g.clone();
    bg.setIndex(body);
    oldGeos.push(bg);
    if (win.length) {
      g.setIndex(win);
      oldWin.push(g);
    }
    g.computeBoundingBox();
    const bb = new THREE.Box3().setFromBufferAttribute(g.attributes.position),
      o = { t: 0, minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z, top: bb.max.y };
    addObs(o, o.minX, o.maxX, o.minZ, o.maxZ);
  }
  function oldBlock(bx, bz) {
    const F = 21, // ön cephenin blok merkezine uzaklığı (3 m kaldırım)
      DEPTH = 8.7;
    for (const sxn of [-1, 1])
      for (const szn of [-1, 1]) {
        const [key, side] = OLD_CORNER[(rng() * 2) | 0],
          c = propBase(key, CITY_OLD).size[0];
        // önü ve pencereli yanı iki sokağa bakacak açıyı bul
        let best = 0;
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const fx = Math.round(Math.sin(a)),
            fz = Math.round(Math.cos(a)),
            sx2 = Math.round(side * Math.cos(a)),
            sz2 = Math.round(-side * Math.sin(a));
          if ((fx === sxn && sz2 === szn) || (fz === szn && sx2 === sxn)) best = a;
        }
        oldHouse(propBase(key, CITY_OLD), bx + sxn * (F - c / 2), bz + szn * (F - c / 2), best, 1);
      }
    const span0 = -F + 5.75,
      span1 = F - 5.75;
    for (const [nx, nz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const rx = nz,
        rz = -nx,
        ang = Math.atan2(nx, nz);
      // sokak boyunca evleri sırala, kalan boşluğu evleri hafifçe genişleterek kapat
      let list, sum;
      for (let tries = 0; tries < 30; tries++) {
        list = [];
        sum = 0;
        while (sum < span1 - span0 - 6) {
          const tot = OLD_ROW.reduce((a, r) => a + r[1], 0);
          let r = rng() * tot,
            pick = OLD_ROW[0][0];
          for (const [k, w] of OLD_ROW)
            if ((r -= w) < 0) {
              pick = k;
              break;
            }
          if (list.length && list[list.length - 1] === pick) continue;
          list.push(pick);
          sum += propBase(pick, CITY_OLD).size[0];
        }
        const f = (span1 - span0) / sum;
        if (f > 0.9 && f < 1.12) break;
      }
      const fx = (span1 - span0) / sum;
      let u = span0;
      for (const key of list) {
        const s = propBase(key, CITY_OLD).size,
          w = s[0] * fx,
          kz = s[2] < DEPTH ? DEPTH / s[2] : 1,
          d = s[2] * kz,
          cu = u + w / 2,
          x = bx + nx * (F - d / 2) + rx * cu,
          z = bz + nz * (F - d / 2) + rz * cu;
        // genişletme yalnız evin kendi x ekseninde (ön cephe boyunca)
        const base = propBase(key, CITY_OLD);
        oldHouse(Math.abs(fx - 1) > 0.01 ? base.clone().scale(fx, 1, 1) : base, x, z, ang, kz);
        u += w;
      }
    }
    // avlu: çim ve birkaç ağaç
    parkGeos.push(flatPlane(2 * (F - DEPTH) - 1, 2 * (F - DEPTH) - 1, bx, bz, 0.045, 1, 1));
    for (let i = 0; i < 5; i++) treeSpots.push([bx + (rng() - 0.5) * 18, bz + (rng() - 0.5) * 18]);
  }
  for (const bx of centers)
    for (const bz of centers) {
      const key = bx + "," + bz;
      if (OLD_TOWN.has(key)) {
        oldBlock(bx, bz);
        continue;
      }
      if (plaza.has(key) || key === "-90,30" || key === "150,-90") continue;
      if (parks.has(key)) {
        parkGeos.push(flatPlane(44, 44, bx, bz, 0.045, 1, 1));
        for (let i = 0; i < 10; i++) treeSpots.push([bx + (rng() - 0.5) * 38, bz + (rng() - 0.5) * 38]);
        continue;
      }
      const cb = 1 - Math.hypot(bx, bz) / 240;
      if (rng() < 0.22) {
        building(bx, bz, 34 + rng() * 6, 34 + rng() * 6, Math.round(7 + rng() * 13 * cb + rng() * 5));
        continue;
      }
      for (const ox of [-11, 11])
        for (const oz of [-11, 11]) {
          if (rng() < 0.12) continue;
          building(
            bx + ox + (rng() - 0.5) * 2,
            bz + oz + (rng() - 0.5) * 2,
            13 + rng() * 6,
            13 + rng() * 6,
            Math.max(1, Math.round(1 + rng() * 6 + rng() * 10 * cb)),
          );
        }
    }
  W.bld = new THREE.MeshStandardMaterial({
    map: facadeTex,
    roughnessMap: facadeRough,
    emissiveMap: facadeEm,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 1,
    metalness: 0.05,
  });
  const bMesh = new THREE.Mesh(merge(bGeos), W.bld);
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  scene.add(bMesh);
  const oMesh = new THREE.Mesh(
    merge(oldGeos),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
  );
  oMesh.castShadow = true;
  oMesh.receiveShadow = true;
  scene.add(oMesh);
  if (oldWin.length) {
    W.oldWin = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      emissive: C("#ffd9a0"),
      emissiveIntensity: 0,
    });
    scene.add(new THREE.Mesh(merge(oldWin), W.oldWin));
  }
  const dMesh = new THREE.Mesh(
    merge(detail),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  );
  dMesh.castShadow = true;
  dMesh.receiveShadow = true;
  scene.add(dMesh);
  W.shop = new THREE.MeshStandardMaterial({
    map: shopTex,
    emissiveMap: shopEm,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const sMesh = new THREE.Mesh(shopQB.geo(), W.shop);
  sMesh.receiveShadow = true;
  scene.add(sMesh);
  const aMesh = new THREE.Mesh(
    awnQB.geo(),
    new THREE.MeshStandardMaterial({
      map: awnTex,
      vertexColors: true,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  aMesh.castShadow = true;
  aMesh.receiveShadow = true;
  scene.add(aMesh);
  if (parkGeos.length) {
    const pm = new THREE.Mesh(
      merge(parkGeos),
      new THREE.MeshStandardMaterial({
        map: parkTex,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    pm.receiveShadow = true;
    scene.add(pm);
  }

  // ---- street furniture: poles, signs, signals, lamps, crosswalks ----
  // kaldırım eşyaları 120 m'lik karelere bölünür: ekran dışındaki kareler hiç çizilmez
  const propTiles = new Map(),
    propGeos = (x, z) => {
      const k = Math.floor(x / 120) + "," + Math.floor(z / 120);
      if (!propTiles.has(k)) propTiles.set(k, []);
      return propTiles.get(k);
    };
  const poleGeos = [],
    darkGeos = [],
    lampHeads = [],
    signQB = new QB(false),
    nameQB = new QB(false),
    boardQB = new QB(false),
    zebraQB = new QB(false),
    poolQB = new QB(false);
  const lampGeo = {};
  for (const gr of ["X", "Z"]) for (const c of ["r", "y", "g"]) lampGeo[gr + c] = [];
  // anything built inside brk(...) becomes one breakable unit: its pieces are remembered so they can be cut out of the merged meshes later
  let BR = null;
  const tpush = (list, geo) => {
    if (BR) BR.parts.push({ list, idx: list.length });
    list.push(geo);
    return geo;
  };
  const tquad = (qb, fn, noDebris) => {
    const v0 = qb.p.length / 3;
    fn();
    if (BR) BR.qparts.push({ qb, v0, n: qb.p.length / 3 - v0, noDebris });
  };
  const brk = (fn) => {
    const prev = BR;
    BR = { parts: [], qparts: [] };
    const r = fn();
    BREAKS.push(BR);
    BR = prev;
    return r;
  };
  function pole(x, z, h, r = 0.05) {
    const y0 = hAt(x, z);
    tpush(poleGeos, new THREE.CylinderGeometry(r, r * 1.15, h, 8).translate(x, y0 + h / 2, z));
    const o = { t: BR ? 3 : 1, x, z, r: r + 0.1, top: y0 + h, br: BR };
    if (BR) {
      BR.o = o;
      BR.base = [x, y0, z];
    }
    addObs(o, x - 1, x + 1, z - 1, z + 1);
    return y0;
  }
  function roadSign(x, z, fx, fz, cell, size = 0.78) {
    brk(() => {
      const y0 = pole(x, z, 2.75);
      tquad(signQB, () =>
        sign2(
          signQB,
          x + fx * 0.07,
          y0 + 2.35,
          z + fz * 0.07,
          fx,
          fz,
          size,
          size,
          cellUV4(cell),
          cellUV4(SIGN_BACK[cell]),
        ),
      );
    });
  }
  function board(x, z, fx, fz, cell, w, h, y, legR) {
    const rx = fz,
      rz = -fx;
    const y0 = Math.min(
      hAt(x, z),
      hAt(x - (rx * w) / 2, z - (rz * w) / 2),
      hAt(x + (rx * w) / 2, z + (rz * w) / 2),
    );
    for (const s of [-1, 1]) {
      const px = x + rx * s * (w / 2 - 0.6),
        pz = z + rz * s * (w / 2 - 0.6);
      const py = hAt(px, pz);
      const hh = y0 + y + h - py;
      poleGeos.push(new THREE.CylinderGeometry(legR, legR, hh, 10).translate(px, py + hh / 2, pz));
      const o = { t: 1, x: px, z: pz, r: legR + 0.1, top: py + hh };
      addObs(o, px - 1, px + 1, pz - 1, pz + 1);
    }
    darkGeos.push(
      new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.12)
        .rotateY(Math.atan2(fx, fz))
        .translate(x, y0 + y + h / 2, z),
    );
    vquad(boardQB, x, z, fx, fz, w, y0 + y, y0 + y + h, 0.075, boardUV(cell));
    vquad(boardQB, x, z, -fx, -fz, w, y0 + y, y0 + y + h, 0.075, boardUV(7));
  }
  // reklam panosu (City Pack modeli) ve önünde bizim reklam resmimiz; (fx,fz) reklamın baktığı yön
  function billboard(x, z, fx, fz, cell) {
    const ang = Math.atan2(fx, fz),
      y0 = hAt(x, z) - 0.2;
    propGeos(x, z).push(propGeo("billboard", x, y0, z, ang));
    vquad(boardQB, x, z, fx, fz, 7.9, y0 + 5.5, y0 + 8.95, 0.81, boardUV(cell));
    // ayak: modelde panonun arkasında, biraz yana kayık
    const px = x + Math.cos(ang) * 1.2 - fx * 0.95,
      pz = z - Math.sin(ang) * 1.2 - fz * 0.95;
    addObs({ t: 1, x: px, z: pz, r: 0.6, top: y0 + 9 }, px - 1, px + 1, pz - 1, pz + 1);
  }
  function signalHead(x, z, fx, fz, grp, y0) {
    const cx = x + fx * 0.18,
      cz = z + fz * 0.18,
      cy = y0 + 3.75;
    tpush(
      darkGeos,
      new THREE.BoxGeometry(0.38, 1.08, 0.26).rotateY(Math.atan2(fx, fz)).translate(cx, cy, cz),
    );
    tpush(
      darkGeos,
      new THREE.BoxGeometry(0.06, 0.06, 0.4)
        .rotateY(Math.atan2(fx, fz))
        .translate(x + fx * 0.05, cy + 0.2, z + fz * 0.05),
    );
    [
      ["r", 0.33],
      ["y", 0],
      ["g", -0.33],
    ].forEach(([c, dy]) =>
      tpush(
        lampGeo[grp + c],
        new THREE.SphereGeometry(0.11, 12, 8).translate(cx + fx * 0.13, cy + dy, cz + fz * 0.13),
      ),
    );
  }
  S.forEach((sx, ix) =>
    S.forEach((sz, iz) => {
      const signal = Math.abs(sx) <= 60 && Math.abs(sz) <= 60;
      const ex = {
        px: sx < 180 || sz === 0,
        nx: sx > -180 || sz === 0,
        pz: sz < 180 || sx === 0,
        nz: sz > -180 || sx === 0,
      };
      // name pole on NE (+x,+z) corner; also carries the +z approach signal
      const nx0 = sx + 7.6,
        nz0 = sz + 7.6;
      brk(() => {
        const y0 = pole(nx0, nz0, signal ? 4.4 : 3.25, signal ? 0.08 : 0.05);
        tquad(nameQB, () => sign2(nameQB, nx0, y0 + 2.85, nz0, 1, 0, 1.9, 0.24, nameUV(ix), nameUV(ix)));
        tquad(nameQB, () =>
          sign2(nameQB, nx0, y0 + 3.13, nz0, 0, 1, 1.9, 0.24, nameUV(7 + iz), nameUV(7 + iz)),
        );
        if (signal && ex.pz) signalHead(nx0, nz0, 0, 1, "Z", y0);
      });
      if (signal) {
        if (ex.nz)
          brk(() => {
            const y = pole(sx - 7.6, sz - 7.6, 4.4, 0.08);
            signalHead(sx - 7.6, sz - 7.6, 0, -1, "Z", y);
          });
        if (ex.px)
          brk(() => {
            const y = pole(sx + 7.6, sz - 7.6, 4.4, 0.08);
            signalHead(sx + 7.6, sz - 7.6, 1, 0, "X", y);
          });
        if (ex.nx)
          brk(() => {
            const y = pole(sx - 7.6, sz + 7.6, 4.4, 0.08);
            signalHead(sx - 7.6, sz + 7.6, -1, 0, "X", y);
          });
        if (Math.abs(sx) + Math.abs(sz) <= 60) {
          roadSign(sx - 8.4, sz - 8.4, -0.7, -0.7, 5);
        }
      } else {
        const cell = (ix + iz) % 2 ? 0 : 7;
        if (ex.px) roadSign(sx + 7.6, sz - 7.6, 1, 0, cell);
        if (ex.nx) roadSign(sx - 7.6, sz + 7.6, -1, 0, cell);
      }
      // crosswalks + stop lines
      const zy = 0.085;
      if (ex.px) {
        for (let k = 0; k < 11; k++)
          gquad(zebraQB, sx + 6.6, sz - 5.25 + k - 0.25 + 0.25, sx + 9.6, sz - 5.25 + k + 0.25 + 0.25, zy);
        gquad(zebraQB, sx + 10.2, sz - 6, sx + 10.6, sz, zy);
      }
      if (ex.nx) {
        for (let k = 0; k < 11; k++)
          gquad(zebraQB, sx - 9.6, sz - 5.25 + k, sx - 6.6, sz - 5.25 + k + 0.5, zy);
        gquad(zebraQB, sx - 10.6, sz, sx - 10.2, sz + 6, zy);
      }
      if (ex.pz) {
        for (let k = 0; k < 11; k++)
          gquad(zebraQB, sx - 5.25 + k, sz + 6.6, sx - 5.25 + k + 0.5, sz + 9.6, zy);
        gquad(zebraQB, sx, sz + 10.2, sx + 6, sz + 10.6, zy);
      }
      if (ex.nz) {
        for (let k = 0; k < 11; k++)
          gquad(zebraQB, sx - 5.25 + k, sz - 9.6, sx - 5.25 + k + 0.5, sz - 6.6, zy);
        gquad(zebraQB, sx - 6, sz - 10.6, sx, sz - 10.2, zy);
      }
    }),
  );
  // parking signs along some blocks
  [
    [-90, -60 + 7.6, "z"],
    [90, 60 - 7.6, "z"],
    [-150, 120 + 7.6, "z"],
    [150, -120 - 7.6, "z"],
    [60 + 7.6, -90, "x"],
    [-60 - 7.6, 150, "x"],
  ].forEach(([a, b, o]) => {
    if (o === "z") roadSign(a, b, 0, b > 0 ? -1 : 1, 4);
    else roadSign(a, b, a > 0 ? -1 : 1, 0, 4);
  });
  // street lamps (lampHalo: glow points under each lamp head, shown at night)
  const lampHalo = [];
  W.lamp = new THREE.MeshStandardMaterial({
    color: C("#e6e6e6"),
    emissive: C("#ffd49a"),
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  for (const sg of segList) {
    const len = sg.b - sg.a;
    const n = Math.max(1, Math.round(len / 24));
    for (let k = 0; k < n; k++) {
      const t = sg.a + ((k + 0.5) * len) / n,
        side = k % 2 ? 1 : -1;
      for (const orient of [0, 1]) {
        let px, pz, ax, az;
        if (orient === 0) {
          px = sg.s + side * 7.4;
          pz = t;
          ax = -side;
          az = 0;
        } else {
          px = t;
          pz = sg.s + side * 7.4;
          ax = 0;
          az = -side;
        }
        if (Math.abs(px) > CITY - 2 || Math.abs(pz) > CITY - 2) continue;
        brk(() => {
          const y0 = pole(px, pz, 7.2, 0.08);
          tpush(
            darkGeos,
            new THREE.BoxGeometry(Math.abs(ax) * 2.2 + 0.08, 0.08, Math.abs(az) * 2.2 + 0.08).translate(
              px + ax * 1.1,
              y0 + 7.1,
              pz + az * 1.1,
            ),
          );
          tpush(
            lampHeads,
            new THREE.BoxGeometry(0.7, 0.14, 0.34)
              .rotateY(orient ? Math.PI / 2 : 0)
              .translate(px + ax * 2.15, y0 + 7.0, pz + az * 2.15),
          );
          const hx = px + ax * 2.15,
            hz = pz + az * 2.15;
          tquad(poolQB, () => gquad(poolQB, hx - 7, hz - 7, hx + 7, hz + 7, 0.12), true);
          BR.halo = lampHalo.length / 3;
          lampHalo.push(hx, y0 + 6.88, hz);
        });
      }
    }
  }
  // ---- kaldırım eşyaları (City Pack): bank, çöp kutusu, saksı, yangın musluğu, durak ... ----
  // çarpınca devrilip savrulurlar (tabelalar gibi); otobüs durağı ve çöp konteyneri sağlamdır
  const STATION_BLOCKS = new Set(["-90,30", "150,-90"]);
  const near = [];
  const clear = (x, z, r) => {
    for (const o of nearObs(x, z, r + 1, near)) {
      if (o.t === 0) {
        if (x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return false;
      } else if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false;
    }
    return true;
  };
  // kırılabilir tek parça eşya; r: çarpışma yarıçapı, soft: metal değil (saksı, bank ...)
  function prop(key, x, z, ang, r, soft) {
    const y0 = hAt(x, z);
    brk(() => {
      tpush(propGeos(x, z), propGeo(key, x, y0, z, ang));
      const o = { t: 3, x, z, r, top: y0 + propBase(key).size[1], br: BR };
      BR.o = o;
      BR.base = [x, y0, z];
      BR.soft = soft;
      addObs(o, x - 1, x + 1, z - 1, z + 1);
    });
  }
  // solid: sağlam kutu engel (eksenlere hizalı)
  function solidProp(key, x, z, ang, list) {
    const y0 = hAt(x, z),
      s = propBase(key).size,
      across = Math.abs(Math.sin(ang)) > 0.5;
    list.push(propGeo(key, x, y0, z, ang));
    const hx = (across ? s[2] : s[0]) / 2,
      hz = (across ? s[0] : s[2]) / 2;
    const o = { t: 0, minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, top: y0 + s[1] };
    addObs(o, o.minX, o.maxX, o.minZ, o.maxZ);
  }
  const SIDE_ITEMS = [
    ["bench", 13, 0.75, 1],
    ["trashcan", 12, 0.45, 0],
    ["pot1", 7, 0.35, 1],
    ["pot2", 6, 0.35, 1],
    ["planter", 5, 0.8, 1],
    ["hydrant", 8, 0.25, 0],
    ["mailbox", 4, 0.35, 0],
    ["powerbox", 5, 0.3, 0],
    ["bicycle", 6, 0.8, 0],
    [null, 34],
  ];
  const sideTotal = SIDE_ITEMS.reduce((a, it) => a + it[1], 0);
  const pickSide = () => {
    let r = rng() * sideTotal;
    for (const it of SIDE_ITEMS) if ((r -= it[1]) < 0) return it;
    return SIDE_ITEMS[SIDE_ITEMS.length - 1];
  };
  let shelters = 0;
  for (const sg of segList) {
    for (const orient of [0, 1])
      for (const side of [-1, 1]) {
        // (px,pz) kaldırımda bir nokta; (fx,fz) yola dönük yön
        const at = (t, d) => (orient === 0 ? [sg.s + side * d, t] : [t, sg.s + side * d]),
          fx = orient === 0 ? -side : 0,
          fz = orient === 0 ? 0 : -side,
          ang = Math.atan2(fx, fz);
        const [bx0, bz0] = at((sg.a + sg.b) / 2, 30);
        if (STATION_BLOCKS.has(blockC(bx0) + "," + blockC(bz0))) continue;
        if (Math.abs(bx0) > CITY || Math.abs(bz0) > CITY) continue;
        // otobüs durağı: blok ortasında, arkasında yer varsa
        if (shelters < 12 && rng() < 0.3) {
          const tm = (sg.a + sg.b) / 2 + (rng() - 0.5) * 10,
            [x, z] = at(tm, 7.55);
          if (clear(x, z, 2.2)) {
            solidProp("shelter", x, z, ang, propGeos(x, z));
            const [sx2, sz2] = at(tm + 2.8, 6.75);
            prop("busSign", sx2, sz2, ang, 0.15, 0);
            shelters++;
          }
        }
        for (let t = sg.a + 5 + rng() * 3; t < sg.b - 5; t += 5.5 + rng() * 4) {
          const it = pickSide();
          if (!it[0]) continue;
          const [x, z] = at(t, it[0] === "bench" ? 7.95 : 7.8);
          if (!clear(x, z, it[2] + 0.35)) continue;
          // bisiklet kaldırıma paralel, öbürleri yola dönük
          const a =
            it[0] === "bicycle" ? ang + Math.PI / 2 : ang + (it[0] === "bench" ? 0 : (rng() - 0.5) * 0.3);
          prop(it[0], x, z, a, it[2], it[3]);
        }
        // rögar kapakları şerit ortasında
        if (rng() < 0.6) {
          const [x, z] = at(sg.a + 8 + rng() * (sg.b - sg.a - 16), 3);
          propGeos(x, z).push(propGeo("manhole", x, 0.062, z, rng() * 6.3));
        }
      }
  }
  W.propStats = { ac: acN, fire: fireN, shelters };
  // bina aralarında çöp konteynerleri ve poşetler
  for (const bx of [-150, -90, -30, 30, 90, 150])
    for (const bz of [-150, -90, -30, 30, 90, 150]) {
      if (STATION_BLOCKS.has(bx + "," + bz) || rng() < 0.45) continue;
      const alongX = rng() < 0.5,
        s = rng() < 0.5 ? -1 : 1,
        x = alongX ? bx + s * 14 : bx,
        z = alongX ? bz : bz + s * 14,
        ang = alongX ? Math.PI / 2 : 0;
      if (!clear(x, z, 1.3)) continue;
      solidProp("dumpster", x, z, ang, propGeos(x, z));
      for (let k = 0; k < 1 + rng() * 3; k++) {
        const px = x + (alongX ? (rng() - 0.5) * 1.5 : 1.3 + rng() * 0.8),
          pz = z + (alongX ? 1.3 + rng() * 0.8 : (rng() - 0.5) * 1.5);
        if (clear(px, pz, 0.35)) prop("trashbag", px, pz, rng() * 6.3, 0.3, 1);
      }
    }
  // dükkân önlerinde ATM: binaya yaslı, sağlam
  for (let k = 0, tries = 0; k < 10 && tries < 200; tries++) {
    const sg = segList[(rng() * segList.length) | 0],
      orient = rng() < 0.5 ? 0 : 1,
      side = rng() < 0.5 ? -1 : 1,
      t = sg.a + 6 + rng() * (sg.b - sg.a - 12);
    // binanın yüzünü bul: kaldırımdan içeri doğru ilk engel
    let d = 8.6;
    const pt = (dd) => (orient === 0 ? [sg.s + side * dd, t] : [t, sg.s + side * dd]);
    while (d < 13 && clear(...pt(d), 0.05)) d += 0.1;
    if (d >= 13 || d < 8.9) continue;
    const [x, z] = pt(d - 0.42);
    if (!clear(x, z, 0.38)) continue;
    const fx = orient === 0 ? -side : 0,
      fz = orient === 0 ? 0 : -side;
    solidProp("atm", x, z, Math.atan2(fx, fz), propGeos(x, z));
    k++;
  }
  // loop road signs and billboards
  const LP = loop.pts,
    ln = LP.length;
  const tang = (i) => {
    const a = LP[(i - 1 + ln) % ln],
      b = LP[(i + 1) % ln];
    const tx = b.x - a.x,
      tz = b.z - a.z,
      l = Math.hypot(tx, tz);
    return [tx / l, tz / l];
  };
  const side = (i, d, t) => {
    const p = LP[i];
    return [p.x + -t[1] * d, p.z + t[0] * d];
  };
  const curv = [];
  for (let i = 0; i < ln; i++) {
    const a = tang((i - 12 + ln) % ln),
      b = tang((i + 12) % ln);
    curv.push(Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])));
  }
  const peaks = [];
  [...curv.keys()]
    .sort((a, b) => curv[b] - curv[a])
    .forEach((i) => {
      if (
        peaks.length < 7 &&
        curv[i] > 0.35 &&
        peaks.every((p) => Math.min(Math.abs(p - i), ln - Math.abs(p - i)) > 110)
      )
        peaks.push(i);
    });
  for (const pk of peaks) {
    const j = (pk - 48 + ln) % ln,
      t = tang(j),
      [x, z] = side(j, 8.6, t);
    if (roadDist(x, z) > 7.5) roadSign(x, z, -t[0], -t[1], 6);
  }
  for (let k = 0; k < 5; k++) {
    const j = Math.floor(((k + 0.3) / 5) * ln),
      t = tang(j),
      [x, z] = side(j, 8.4, t);
    if (roadDist(x, z) > 7.5) roadSign(x, z, -t[0], -t[1], 2);
  }
  [0.12, 0.37, 0.62, 0.87].forEach((f, k) => {
    const j = Math.floor(f * ln),
      t = tang(j);
    for (const d of [17, -17]) {
      const [x, z] = side(j, d, t);
      if (roadDist(x, z) < 13) continue;
      {
        const hd = hwInfo(x, z, HI);
        if (hd && Math.abs(hd.lat) < HW_HALF + 8) continue;
      }
      const s = Math.sign(d),
        fx = -(-t[1]) * s * 0.75 - t[0] * 0.66,
        fz = -t[0] * s * 0.75 - t[1] * 0.66,
        l = Math.hypot(fx, fz);
      billboard(x, z, fx / l, fz / l, 3 + k);
      break;
    }
  });
  // otoyol entry/exit boards on the east & west otoyols
  for (const rd of [east, west]) {
    const P = rd.pts,
      n = P.length,
      at = (i, d) => {
        const t = [rd.tx[i], rd.tz[i]];
        return [P[i].x - t[1] * d, P[i].z + t[0] * d, t];
      };
    {
      const [x, z, t] = at(n - 45, 15);
      board(x, z, -t[0], -t[1], 1, 5, 2.5, 2.4, 0.09);
    }
    {
      const [x, z, t] = at(n - 70, -15);
      board(x, z, t[0], t[1], 0, 5, 2.5, 2.4, 0.09);
    }
    {
      const [x, z, t] = at(40, -15.5);
      board(x, z, t[0], t[1], 2, 5.5, 2.75, 1.6, 0.12);
    }
  }
  roadSign(-95, 226, 0, -1, 8);
  // otoyol kenarlarında reklam panoları: düz arazide, tünel ve köprülerden uzakta
  {
    let cell = 0;
    for (const h of HWYS)
      for (const f of [0.3, 0.7]) {
        const P = h.pts,
          j = Math.floor(f * P.length),
          tx = h.tx[j],
          tz = h.tz[j],
          s = cell % 2 ? 1 : -1,
          x = P[j].x - tz * s * (HW_HALF + 14),
          z = P[j].z + tx * s * (HW_HALF + 14);
        if (
          Math.abs(hAt(P[j].x, P[j].z) - h.ys[j]) > 1.5 ||
          Math.abs(x) > HALF - 20 ||
          Math.abs(z) > HALF - 20
        )
          continue;
        if (roadDist(x, z) < 14 || Math.abs(hAt(x, z) - h.ys[j]) > 4) continue;
        const hd = hwInfo(x, z, HI);
        if (hd && Math.abs(hd.lat) < HW_HALF + 8) continue;
        // gelen trafiğe dönük, biraz yola doğru açılı
        const fx = tz * s * 0.6 - tx * 0.8,
          fz = -tx * s * 0.6 - tz * 0.8,
          l = Math.hypot(fx, fz);
        billboard(x, z, fx / l, fz / l, 3 + (cell++ % 4));
      }
  }
  // ---- otoyol structures: median, guard rails, bridge deck & piers, tunnel tubes, portals, gantries ----
  {
    const tunnelHalo = [],
      cGeos = [],
      rGeos = [],
      tGeos = [],
      tLights = [],
      mb = new THREE.Matrix4(),
      f = new THREE.Vector3(),
      r = new THREE.Vector3(),
      u = new THREE.Vector3(),
      UP = new THREE.Vector3(0, 1, 0);
    const segG = (h, list, i, lat, yo, make) => {
      const P = h.pts,
        Y = h.ys,
        K = h.kind,
        a = P[i],
        b = P[i + 1],
        sx0 = -h.tz[i],
        sz0 = h.tx[i],
        sx1 = -h.tz[i + 1],
        sz1 = h.tx[i + 1];
      const ax = a.x + sx0 * lat,
        az = a.z + sz0 * lat,
        bx = b.x + sx1 * lat,
        bz = b.z + sz1 * lat,
        ay = Y[i] + yo,
        by = Y[i + 1] + yo;
      f.set(bx - ax, by - ay, bz - az);
      const l = f.length();
      f.normalize();
      r.crossVectors(UP, f).normalize();
      u.crossVectors(f, r);
      const gq = make(l);
      mb.makeBasis(r, u, f).setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      gq.applyMatrix4(mb);
      list.push(gq);
    };
    const seg = (h, list, i, lat, yo, w, ht) =>
      segG(h, list, i, lat, yo, (l) => new THREE.BoxGeometry(w, ht, l + 0.04));
    const inGap = (h, i, sd) => h.gaps.some((g) => i >= g.a && i <= g.b && g.side === sd);
    for (const h of HWYS) {
      const P = h.pts,
        Y = h.ys,
        K = h.kind,
        m = P.length;
      for (let i = 0; i < m - 1; i++) {
        const rnd = K[i] === 2 && h.style[i];
        if (i > h.railA - 6 && i < h.railB + 4) {
          if (rnd) seg(h, tGeos, i, 0, 3.45, 0.9, 6.9);
          else seg(h, cGeos, i, 0, 0.42, 0.55, 0.85);
        }
        if (i > h.railA && i < h.railB) {
          if (K[i] === 1) {
            for (const sd of [-1, 1]) seg(h, cGeos, i, sd * (HW_HALF - 0.05), 0.55, 0.4, 1.1);
          } else if (K[i] === 0) {
            for (const sd of [-1, 1]) {
              if (inGap(h, i, sd)) continue;
              seg(h, rGeos, i, sd * (HW_HALF - 0.15), 0.68, 0.08, 0.32);
              if (i % 2 === 0) seg(h, rGeos, i, sd * (HW_HALF - 0.05), 0.38, 0.12, 0.76);
            }
          }
        }
        if (K[i] === 1) seg(h, cGeos, i, 0, -0.62, HW_HALF * 2 + 0.4, 1.3);
        if (K[i] === 2 && !rnd) {
          for (const sd of [-1, 1]) seg(h, tGeos, i, sd * (HW_HALF + 0.35), 3.75, 0.7, 7.6);
          seg(h, tGeos, i, 0, 7.85, HW_HALF * 2 + 1.4, 0.6);
          if (i % 4 === 0)
            for (const sd of [-1, 1]) {
              seg(h, tLights, i, sd * 5, 7.48, 0.5, 0.12);
              tunnelHalo.push(tLights[tLights.length - 1]);
            }
        }
        if (rnd) {
          for (const c of [-5.9, 5.9]) {
            segG(h, tGeos, i, c, 1.3, (l) =>
              new THREE.CylinderGeometry(5.5, 5.5, l + 0.05, 20, 1, true, Math.PI / 2, Math.PI).rotateX(
                Math.PI / 2,
              ),
            );
            seg(h, tGeos, i, c + Math.sign(c) * 5.45, 0.65, 0.3, 1.3);
            if (i % 3 === 0) {
              seg(h, tLights, i, c, 6.62, 0.45, 0.1);
              tunnelHalo.push(tLights[tLights.length - 1]);
            }
          }
        }
      }
      for (let i = 0; i < m; i += 10) {
        if (K[i] !== 1) continue;
        const p = P[i];
        for (const sd of [-5.5, 5.5]) {
          const x = p.x - h.tz[i] * sd,
            z = p.z + h.tx[i] * sd;
          if (roadDist(x, z) < 9) continue;
          const gy = hAt(x, z) - 1,
            top = Y[i] - 1.25;
          if (top - gy < 1) continue;
          const pr = 0.85 + Math.max(0, top - gy - 12) * 0.022; // tall viaduct piers get thicker
          cGeos.push(new THREE.CylinderGeometry(pr, pr * 1.12, top - gy, 14).translate(x, (gy + top) / 2, z));
        }
        cGeos.push(
          new THREE.BoxGeometry(15, 1, 2.2)
            .rotateY(Math.atan2(h.tx[i], h.tz[i]))
            .translate(p.x, Y[i] - 1.75, p.z),
        );
      }
      // gantry, speed signs, exit board
      {
        const i = h === HS ? 100 : h === MT ? 32 : 26,
          p = P[i],
          t1 = h.tx[i],
          t2 = h.tz[i],
          y = Y[i];
        for (const sd of [-1, 1]) {
          const x = p.x - t2 * sd * (HW_HALF + 1.2),
            z = p.z + t1 * sd * (HW_HALF + 1.2);
          poleGeos.push(new THREE.CylinderGeometry(0.18, 0.2, 7.4, 10).translate(x, y + 3.7, z));
          addObs({ t: 1, x, z, r: 0.3, top: y + 7.4 }, x - 1, x + 1, z - 1, z + 1);
        }
        darkGeos.push(
          new THREE.BoxGeometry(HW_HALF * 2 + 3, 0.5, 0.5)
            .rotateY(Math.atan2(t1, t2))
            .translate(p.x, y + 7.1, p.z),
        );
        vquad(
          boardQB,
          p.x - t2 * 5.4,
          p.z + t1 * 5.4,
          -t1,
          -t2,
          8,
          y + 4.7,
          y + 8.7,
          0.3,
          boardUV(h === HS ? 8 : h === MT ? 13 : 11),
        );
        vquad(boardQB, p.x - t2 * 5.4, p.z + t1 * 5.4, t1, t2, 8, y + 4.7, y + 8.7, 0.3, boardUV(7));
      }
      for (const i0 of h === MT ? [400] : m > 200 ? [115, Math.floor(m * 0.7)] : [Math.floor(m * 0.5)]) {
        let i = i0;
        while (i < m - 40 && K[i] !== 0) i++;
        const p = P[i],
          t1 = h.tx[i],
          t2 = h.tz[i];
        roadSign(p.x - t2 * (HW_HALF + 1.4), p.z + t1 * (HW_HALF + 1.4), -t1, -t2, 10);
      }
      if (m > 200) {
        const i = m - 70,
          p = P[i],
          t1 = h.tx[i],
          t2 = h.tz[i];
        board(p.x - t2 * (HW_HALF + 4), p.z + t1 * (HW_HALF + 4), -t1, -t2, 10, 5, 2.5, 2.4, 0.09);
      }
    }
    // portal facades: a concrete wall with the tunnel opening(s) cut out
    for (const Pt of PORTALS) {
      const h = Pt.h,
        q = h.pts[Pt.j],
        t1 = h.tx[Pt.j],
        t2 = h.tz[Pt.j],
        y = h.ys[Pt.j],
        W2 = HW_HALF + 3.6;
      const sh = new THREE.Shape();
      sh.moveTo(-W2, -1.5);
      sh.lineTo(W2, -1.5);
      sh.lineTo(W2, 11.6);
      sh.lineTo(-W2, 11.6);
      sh.closePath();
      if (Pt.round) {
        for (const c of [-5.9, 5.9]) {
          const hp = new THREE.Path();
          hp.moveTo(c - 5.5, 0);
          hp.lineTo(c + 5.5, 0);
          hp.lineTo(c + 5.5, 1.3);
          hp.absarc(c, 1.3, 5.5, 0, Math.PI, false);
          hp.lineTo(c - 5.5, 0);
          sh.holes.push(hp);
        }
      } else {
        const hp = new THREE.Path();
        hp.moveTo(-HW_HALF - 0.7, 0);
        hp.lineTo(HW_HALF + 0.7, 0);
        hp.lineTo(HW_HALF + 0.7, 8.15);
        hp.lineTo(-HW_HALF - 0.7, 8.15);
        hp.lineTo(-HW_HALF - 0.7, 0);
        sh.holes.push(hp);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false, curveSegments: 24 });
      const o = new THREE.Vector3(-t1 * Pt.dirIn, 0, -t2 * Pt.dirIn),
        X = new THREE.Vector3().crossVectors(UP, o);
      mb.makeBasis(X, UP, o).setPosition(q.x, y, q.z);
      g.applyMatrix4(mb);
      cGeos.push(g);
      const top = Pt.round ? 7.4 : 8.5;
      vquad(
        boardQB,
        q.x + o.x * 1.85,
        q.z + o.z * 1.85,
        o.x,
        o.z,
        7,
        y + top,
        y + top + 2.3,
        0,
        boardUV(Pt.h === MT ? 12 : 9),
      );
    }
    const conc = new THREE.MeshStandardMaterial({
      color: C("#b9b6ae"),
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const cm = new THREE.Mesh(merge(cGeos), conc);
    cm.castShadow = true;
    cm.receiveShadow = true;
    scene.add(cm);
    const rm = new THREE.Mesh(
      merge(rGeos),
      new THREE.MeshStandardMaterial({ color: C("#c4c9ce"), metalness: 0.8, roughness: 0.35 }),
    );
    rm.castShadow = true;
    scene.add(rm);
    const tm = new THREE.Mesh(
      merge(tGeos),
      new THREE.MeshStandardMaterial({ map: tunnelTex, roughness: 0.7, side: THREE.DoubleSide }),
    );
    tm.castShadow = true;
    tm.receiveShadow = true;
    scene.add(tm);
    if (tunnelHalo.length) {
      const xyz = [];
      for (const g of tunnelHalo) {
        g.computeBoundingSphere();
        const c = g.boundingSphere.center;
        xyz.push(c.x, c.y - 0.15, c.z);
      }
      scene.add(makeHalos(xyz, haloMat("#ffb35c", 2.2, 0.55)));
    }
    if (tLights.length)
      scene.add(
        new THREE.Mesh(
          merge(tLights),
          new THREE.MeshStandardMaterial({
            color: C("#ffe2b8"),
            emissive: C("#ffb85e"),
            emissiveIntensity: 2.6,
          }),
        ),
      );
  }
  // ---- gas stations: two in the city, one beside the southern otoyol ----
  {
    const brand = tex(
      cvs(256, 512, (g) => {
        g.fillStyle = "#f4f4f2";
        g.fillRect(0, 0, 256, 512);
        g.fillStyle = "#c8102e";
        g.fillRect(0, 0, 256, 170);
        g.fillStyle = "#fff";
        txt(g, "YOLCU", 128, 80, 220, 74);
        txt(g, "PETROL", 128, 138, 200, 34, 600);
        g.fillStyle = "#1d2a3a";
        [
          ["BENZİN", "47,90"],
          ["MOTORİN", "49,60"],
          ["LPG", "25,40"],
        ].forEach(([a, b], k) => {
          const y = 210 + k * 95;
          g.fillStyle = "#1d2a3a";
          g.fillRect(14, y, 228, 78);
          g.fillStyle = "#fff";
          txt(g, a, 70, y + 39, 110, 28, 600, "center");
          g.fillStyle = "#ffcf3a";
          txt(g, b, 182, y + 40, 100, 40, 700);
        });
      }),
    );
    const fascia = tex(
      cvs(512, 64, (g) => {
        g.fillStyle = "#c8102e";
        g.fillRect(0, 0, 512, 64);
        g.fillStyle = "#fff";
        txt(g, "YOLCU PETROL", 256, 34, 440, 44);
      }),
    );
    const white = new THREE.MeshStandardMaterial({ color: C("#f2f2f0"), roughness: 0.5 }),
      red = new THREE.MeshStandardMaterial({ color: C("#c8102e"), roughness: 0.45 }),
      slab = new THREE.MeshStandardMaterial({
        color: C("#8a8c8e"),
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
      dark = new THREE.MeshStandardMaterial({ color: C("#1b2026"), roughness: 0.3, metalness: 0.3 });
    W.canopy = new THREE.MeshStandardMaterial({
      color: C("#f6f6f2"),
      emissive: C("#fff6e6"),
      emissiveIntensity: 0.4,
    });
    const brandM = new THREE.MeshStandardMaterial({ map: brand, roughness: 0.5 }),
      fasciaM = new THREE.MeshStandardMaterial({
        map: fascia,
        roughness: 0.5,
        emissiveMap: fascia,
        emissive: new THREE.Color(1, 1, 1),
        emissiveIntensity: 0.15,
      });
    W.fascia = fasciaM;
    const station = (cx, cz, y0, fx, fz) => {
      const g = new THREE.Group();
      g.position.set(cx, y0, cz);
      g.rotation.y = Math.atan2(fx, fz);
      scene.add(g);
      const rx = fz,
        rz = -fx,
        W2 = (lx, lz) => [cx + rx * lx + fx * lz, cz + rz * lx + fz * lz];
      const add = (geo, mat, x, y, z, shadow = true) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = shadow;
        m.receiveShadow = true;
        g.add(m);
        return m;
      };
      add(new THREE.BoxGeometry(38, 0.1, 34), slab, 0, 0.06, 0, false);
      add(new THREE.BoxGeometry(20, 0.5, 12), white, 0, 5.75, 4);
      add(new THREE.BoxGeometry(20.3, 0.6, 12.3), red, 0, 5.3, 4);
      add(new THREE.PlaneGeometry(18.6, 10.6).rotateX(Math.PI / 2), W.canopy, 0, 4.99, 4, false);
      for (const [lz, rot] of [
        [10.17, 0],
        [-2.17, Math.PI],
      ]) {
        const m = add(new THREE.PlaneGeometry(14, 0.55), fasciaM, 0, 5.3, lz, false);
        m.rotation.y = rot;
      }
      for (const lx of [-6, 6])
        for (const lz of [0.5, 7.5]) {
          add(new THREE.CylinderGeometry(0.28, 0.28, 5, 12), white, lx, 2.5, lz);
          const [wx, wz] = W2(lx, lz);
          addObs({ t: 1, x: wx, z: wz, r: 0.4, top: y0 + 5 }, wx - 1, wx + 1, wz - 1, wz + 1);
        }
      for (const lx of [-3.2, 3.2]) {
        add(new THREE.BoxGeometry(1.3, 0.2, 6.4), slab, lx, 0.2, 4);
        for (const lz of [2.3, 5.7]) {
          add(new THREE.BoxGeometry(0.8, 1.7, 0.55), white, lx, 1.15, lz);
          add(new THREE.BoxGeometry(0.82, 0.28, 0.57), red, lx, 1.95, lz);
          add(new THREE.BoxGeometry(0.5, 0.35, 0.02), dark, lx, 1.4, lz + 0.29, false);
          add(new THREE.BoxGeometry(0.5, 0.35, 0.02), dark, lx, 1.4, lz - 0.29, false);
        }
        const [ax, az] = W2(lx - 0.7, 0.8),
          [bx, bz] = W2(lx + 0.7, 7.2);
        addObs(
          {
            t: 0,
            minX: Math.min(ax, bx),
            maxX: Math.max(ax, bx),
            minZ: Math.min(az, bz),
            maxZ: Math.max(az, bz),
            top: y0 + 2.1,
          },
          Math.min(ax, bx),
          Math.max(ax, bx),
          Math.min(az, bz),
          Math.max(az, bz),
        );
        FUEL.push(W2(lx, 4));
      }
      add(new THREE.BoxGeometry(16, 4.2, 8), white, 0, 2.1, -11);
      add(new THREE.BoxGeometry(16.3, 0.7, 8.3), red, 0, 4.2, -11);
      {
        const m = add(new THREE.PlaneGeometry(14, 3.4), W.shop, 0, 1.75, -6.98, false);
        const c = cellUV4Shop(3),
          uv = m.geometry.attributes.uv;
        uv.setXY(0, c[0], c[3]);
        uv.setXY(1, c[2], c[3]);
        uv.setXY(2, c[0], c[1]);
        uv.setXY(3, c[2], c[1]);
        uv.needsUpdate = true;
      }
      {
        const [ax, az] = W2(-8, -15),
          [bx, bz] = W2(8, -7);
        addObs(
          {
            t: 0,
            minX: Math.min(ax, bx),
            maxX: Math.max(ax, bx),
            minZ: Math.min(az, bz),
            maxZ: Math.max(az, bz),
            top: y0 + 4.5,
          },
          Math.min(ax, bx),
          Math.max(ax, bx),
          Math.min(az, bz),
          Math.max(az, bz),
        );
      }
      add(new THREE.BoxGeometry(0.4, 6, 0.4), white, 13, 3, 14);
      const tb = add(new THREE.BoxGeometry(2.4, 4.8, 0.3), white, 13, 6.4, 14);
      for (const sd of [1, -1]) {
        const m = add(new THREE.PlaneGeometry(2.3, 4.6), brandM, 13, 6.4, 14 + sd * 0.16, false);
        if (sd < 0) m.rotation.y = Math.PI;
      }
      {
        const [wx, wz] = W2(13, 14);
        addObs({ t: 1, x: wx, z: wz, r: 0.4, top: y0 + 9 }, wx - 1, wx + 1, wz - 1, wz + 1);
      }
      STATIONS.push({ x: cx, z: cz });
    };
    station(-90, 30, 0, 0, 1);
    station(150, -90, 0, -1, 0);
    {
      const fx = Math.round(-STATION.sx),
        fz = Math.round(-STATION.sz);
      station(STATION.x, STATION.z, STATION.y, fx, fz);
    }
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: C("#8c9298"), metalness: 0.7, roughness: 0.45 });
  const pm2 = new THREE.Mesh(merge(poleGeos), poleMat);
  pm2.castShadow = true;
  scene.add(pm2);
  poleGeos.mesh = pm2;
  const dk = new THREE.Mesh(
    merge(darkGeos),
    new THREE.MeshStandardMaterial({ color: C("#23262a"), metalness: 0.4, roughness: 0.6 }),
  );
  dk.castShadow = true;
  scene.add(dk);
  darkGeos.mesh = dk;
  {
    const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    for (const list of propTiles.values()) {
      const m = new THREE.Mesh(merge(list), pm);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      list.mesh = m;
    }
  }
  lampHeads.mesh = new THREE.Mesh(merge(lampHeads), W.lamp);
  scene.add(lampHeads.mesh);
  const sgm = new THREE.Mesh(
    signQB.geo(),
    new THREE.MeshStandardMaterial({ map: signTex, alphaTest: 0.5, roughness: 0.5 }),
  );
  sgm.castShadow = true;
  scene.add(sgm);
  signQB.mesh = sgm;
  nameQB.mesh = new THREE.Mesh(
    nameQB.geo(),
    new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.5 }),
  );
  scene.add(nameQB.mesh);
  W.board = new THREE.MeshStandardMaterial({
    map: boardTex,
    emissiveMap: boardTex,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  const bdm = new THREE.Mesh(boardQB.geo(), W.board);
  bdm.castShadow = true;
  scene.add(bdm);
  scene.add(
    new THREE.Mesh(
      zebraQB.geo(),
      new THREE.MeshStandardMaterial({
        color: C("#e9e6dc"),
        roughness: 0.75,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      }),
    ),
  );
  W.pools = new THREE.Mesh(
    poolQB.geo(),
    new THREE.MeshBasicMaterial({
      map: poolTex,
      color: C("#ffb766"),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    }),
  );
  W.pools.visible = false;
  scene.add(W.pools);
  poolQB.mesh = W.pools;
  W.lampHalos = makeHalos(lampHalo, haloMat("#ffcf8a", 3.2, 0.9));
  W.lampHalos.visible = false;
  scene.add(W.lampHalos);
  const sigCol = { r: "#ff2a1a", y: "#ffb000", g: "#22e070" };
  for (const k in lampGeo) {
    if (!lampGeo[k].length) continue;
    const c = sigCol[k[1]];
    const m = new THREE.MeshStandardMaterial({
      color: C("#222"),
      emissive: C(c),
      emissiveIntensity: 0.05,
      roughness: 0.3,
    });
    signalMats[k] = m;
    lampGeo[k].mesh = new THREE.Mesh(merge(lampGeo[k]), m);
    scene.add(lampGeo[k].mesh);
  }
  for (const b of BREAKS)
    for (const pt of b.parts) {
      const L = pt.list;
      if (!L.offs) {
        L.offs = [];
        let o = 0;
        for (const g of L) {
          L.offs.push(o);
          o += g.attributes.position.count;
        }
      }
    }

  // ramps
  const rampMat = new THREE.MeshStandardMaterial({ map: rampTex, roughness: 0.8, side: THREE.DoubleSide });
  for (const r of RAMPS) {
    const sx = -r.dz,
      sz = r.dx,
      hw = r.W / 2,
      b = r.base;
    const A0 = [r.x - sx * hw, b, r.z - sz * hw],
      A1 = [r.x + sx * hw, b, r.z + sz * hw],
      ex = r.x + r.dx * r.L,
      ez = r.z + r.dz * r.L;
    const B0 = [ex - sx * hw, b + r.H, ez - sz * hw],
      B1 = [ex + sx * hw, b + r.H, ez + sz * hw],
      B0b = [ex - sx * hw, b - 0.5, ez - sz * hw],
      B1b = [ex + sx * hw, b - 0.5, ez + sz * hw];
    const A0b = [A0[0], b - 0.5, A0[2]],
      A1b = [A1[0], b - 0.5, A1[2]];
    const tris = [
      A0,
      B0,
      B1,
      A0,
      B1,
      A1,
      B0b,
      B1b,
      B1,
      B0b,
      B1,
      B0,
      A0b,
      B0b,
      B0,
      A0b,
      B0,
      A0,
      A1b,
      A1,
      B1,
      A1b,
      B1,
      B1b,
    ];
    const p = [],
      uv = [];
    const uvq = [
      [0, 0],
      [r.L / 6, 0],
      [r.L / 6, r.W / 6],
    ];
    tris.forEach((v, i) => {
      p.push(...v);
      const q = uvq[i % 3];
      uv.push(q[0], q[1]);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, rampMat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // trees, bushes, rocks, grass and flowers (vegetation.js); treeSpots holds the city park spots
  buildVegetation(treeSpots);

  // collectibles
  const coinG = new THREE.TorusGeometry(1.1, 0.26, 10, 28);
  const coinM = new THREE.MeshStandardMaterial({
    color: C("#ffc93c"),
    emissive: C("#ff9d00"),
    emissiveIntensity: 0.55,
    metalness: 1,
    roughness: 0.25,
  });
  const beamG = new THREE.CylinderGeometry(0.5, 0.5, 60, 8, 1, true);
  beamG.translate(0, 30, 0);
  const beamM = new THREE.MeshBasicMaterial({
    color: C("#ffcf5a"),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const spots = [];
  for (let k = 0; k < 14; k++) {
    const i = Math.floor(((k + 0.5) / 14) * loop.pts.length);
    spots.push([loop.pts[i].x, loop.ys[i], loop.pts[i].z]);
  }
  for (const rd of [east, west])
    for (const f of [0.35, 0.75]) {
      const i = Math.floor(f * rd.pts.length);
      spots.push([rd.pts[i].x, rd.ys[i], rd.pts[i].z]);
    }
  // dağ otoyolu: Kartal Tüneli'nin ortası, viyadüğün ortası ve geçit (sağ şeritte)
  for (const k of [2, 1, 0]) {
    const run = [];
    MT.kind.forEach((v, i) => {
      if (v === k && i > 60 && i < MT.pts.length - 60) run.push(i);
    });
    if (!run.length) continue;
    const i = run[run.length >> 1];
    spots.push([MT.pts[i].x - MT.tz[i] * 4, MT.ys[i], MT.pts[i].z + MT.tx[i] * 4]);
  }
  [
    [120, -180],
    [-180, 60],
    [60, 120],
    [-120, -120],
  ].forEach(([x, z]) => spots.push([x, 0, z]));
  spots.push([0, 6.5, 8]);
  spots.push([-95, hAt(-95, 262) + 9, 272]);
  {
    for (const h of [HS, HN]) spots.push([h.pts[h.sc].x + 4, h.ys[h.sc], h.pts[h.sc].z]);
    const P = HS.pts,
      K = HS.kind,
      ti = [];
    K.forEach((k, i) => {
      if (k === 2 && !HS.style[i]) ti.push(i);
    });
    if (ti.length) {
      const i = ti[ti.length >> 1];
      spots.push([P[i].x - HS.tz[i] * 4, HS.ys[i], P[i].z + HS.tx[i] * 4]);
    }
    spots.push([STATION.x, STATION.y, STATION.z + (STATION.tz > 0 ? 16 : -16)]);
    const di = Math.floor(DIRT.pts.length * 0.55);
    spots.push([DIRT.pts[di].x, DIRT.ys[di], DIRT.pts[di].z]);
  }
  for (const [x, y, z] of spots) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(coinG, coinM);
    c.castShadow = true;
    g.add(c);
    g.add(new THREE.Mesh(beamG, beamM));
    g.position.set(x, y + 1.7, z);
    scene.add(g);
    collectibles.push({ g, c, x, y: y + 1.7, z, got: false });
  }

  // minimap
  mapCanvas = cvs(800, 800, (g, w, h) => {
    const img = g.createImageData(w, h),
      d = img.data;
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        const x = -HALF + px * 2,
          z = -HALF + py * 2,
          y = hAt(x, z),
          i = (py * w + px) * 4;
        let r = 58 + y * 0.35,
          gg = 86 + y * 0.25,
          b = 48 + y * 0.3;
        const rd = roadDist(x, z);
        if (rd < 6.5) {
          r = gg = b = 210;
        } else if (rd < 9) {
          r = 150;
          gg = 140;
          b = 120;
        }
        if (Math.abs(x) < CITY && Math.abs(z) < CITY) {
          r = gg = b = 120;
        }
        d[i] = r;
        d[i + 1] = gg;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    g.fillStyle = "#dcdcdc";
    for (const s of S) {
      g.fillRect((s - 6 + HALF) / 2, (-CITY + HALF) / 2, 6, CITY);
      g.fillRect((-CITY + HALF) / 2, (s - 6 + HALF) / 2, CITY, 6);
    }
    g.fillStyle = "#4b4f55";
    for (const a of OBS.values())
      for (const o of a)
        if (o.t === 0)
          g.fillRect((o.minX + HALF) / 2, (o.minZ + HALF) / 2, (o.maxX - o.minX) / 2, (o.maxZ - o.minZ) / 2);
    g.fillStyle = "#e8b10d";
    for (const r of RAMPS) g.fillRect((r.x + HALF) / 2 - 2, (r.z + HALF) / 2 - 2, 4, 4);
    const line = (pts, from, to, col, wd, dash) => {
      g.strokeStyle = col;
      g.lineWidth = wd;
      g.setLineDash(dash || []);
      g.beginPath();
      for (let i = from; i <= to; i++) {
        const q = pts[i];
        i === from
          ? g.moveTo((q.x + HALF) / 2, (q.z + HALF) / 2)
          : g.lineTo((q.x + HALF) / 2, (q.z + HALF) / 2);
      }
      g.stroke();
      g.setLineDash([]);
    };
    line(DIRT.pts, 0, DIRT.pts.length - 1, "#a4835a", 4);
    for (const h of HWYS) {
      const P = h.pts,
        K = h.kind;
      let s0 = 0;
      for (let i = 1; i <= P.length; i++) {
        if (i === P.length || (K[i] === 2) !== (K[s0] === 2)) {
          line(
            P,
            s0,
            Math.min(i, P.length - 1),
            K[s0] === 2 ? "#6b6f75" : "#f1e7c4",
            K[s0] === 2 ? 8 : 11,
            K[s0] === 2 ? [8, 6] : null,
          );
          s0 = i;
        }
      }
    }
    g.fillStyle = "#c8102e";
    for (const st of [
      [-90, 30],
      [150, -90],
      [STATION.x, STATION.z],
    ])
      g.fillRect((st[0] + HALF) / 2 - 5, (st[1] + HALF) / 2 - 5, 10, 10);
  });
}
