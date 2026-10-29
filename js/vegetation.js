/* Bitki örtüsü: ağaç türleri (çam, ladin, meşe, kavak, huş), çalılar, kayalar, çimen öbekleri ve kır çiçekleri.
   Hepsi InstancedMesh: binlerce kopya tek çizimle gelir. Ağaçlar ve çimenler rüzgârda hafifçe salınır. */
"use strict";

const VEG_TIME = { value: 0 }; // game.js her karede günceller (rüzgâr salınımı için)

// rüzgâr: yükseldikçe artan, her örnekte farklı fazda hafif yana salınım
function addSway(mat, amount, from) {
  // values go in as uniforms (not into the shader text) so materials can safely share one compiled program
  const uA = { value: amount },
    uF = { value: from };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = VEG_TIME;
    sh.uniforms.uSwayA = uA;
    sh.uniforms.uSwayF = uF;
    sh.vertexShader =
      "uniform float uTime, uSwayA, uSwayF;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wp = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float sw = max(position.y - uSwayF, 0.0) * uSwayA;
        float ph = uTime * 1.7 + wp.x * 0.07 + wp.z * 0.05;
        transformed.x += sin(ph) * sw;
        transformed.z += sin(ph * 0.8 + 1.3) * sw * 0.6;
      #endif`,
      );
  };
  return mat;
}

// kanvasta çimen ve çiçek dokuları (beyaz çizilir, her öbek kendi rengiyle boyanır)
const grassTuftTex = tex(
  cvs(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 34; i++) {
      const x = 8 + rng() * 112,
        h = 50 + rng() * 74,
        lean = (rng() - 0.5) * 34,
        w = 3 + rng() * 4,
        v = 170 + ((rng() * 85) | 0);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.moveTo(x - w, 128);
      g.quadraticCurveTo(x + lean * 0.3, 128 - h * 0.6, x + lean, 128 - h);
      g.quadraticCurveTo(x + lean * 0.3 + w * 0.3, 128 - h * 0.6, x + w, 128);
      g.closePath();
      g.fill();
    }
  }),
  0,
);
const flowerTex = tex(
  cvs(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 9; i++) {
      const x = 14 + rng() * 100,
        top = 30 + rng() * 50;
      g.strokeStyle = "#3d6b2a";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, 128);
      g.lineTo(x + (rng() - 0.5) * 10, top);
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = 14 + rng() * 100,
        y = 26 + rng() * 54,
        r = 6 + rng() * 5;
      g.fillStyle = "#ffffff";
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#e8b10d";
      g.beginPath();
      g.arc(x, y, r * 0.35, 0, Math.PI * 2);
      g.fill();
    }
  }),
  0,
);
grassTuftTex.wrapS = grassTuftTex.wrapT = flowerTex.wrapS = flowerTex.wrapT = THREE.ClampToEdgeWrapping;

/* ---------- geometriler ---------- */
const blob = (r, x, y, z, sx = 1, sy = 1, sz = 1, detail = r > 1.45 ? 1 : 0) =>
  new THREE.IcosahedronGeometry(r, detail).scale(sx, sy, sz).translate(x, y, z);
// crowns: knobbly outline (vertices pushed in/out by a position-based noise, so shared corners stay joined)
// and a baked shade gradient: dark and dense at the bottom, sunlit at the top
function organic(g, bump, dark = 0.5) {
  const p = g.attributes.position,
    n = p.count,
    col = new Float32Array(n * 3);
  let y0 = 1e9,
    y1 = -1e9;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const k = 1 + bump * vnoise(x * 1.7 + z * 0.9, y * 1.9 - z * 1.3);
    p.setXYZ(i, x * k, y + (k - 1) * 0.6, z * k);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let i = 0; i < n; i++) {
    const t = (p.getY(i) - y0) / (y1 - y0 || 1),
      v = dark + (1.08 - dark) * Math.pow(clamp(t, 0, 1), 0.8);
    col[i * 3] = v * 0.96;
    col[i * 3 + 1] = v;
    col[i * 3 + 2] = v * 0.92;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
function vegGeos() {
  const trunk = new THREE.CylinderGeometry(0.14, 0.32, 3.4, 7).translate(0, 1.7, 0);
  const tallTrunk = new THREE.CylinderGeometry(0.12, 0.24, 5.2, 7).translate(0, 2.6, 0);
  const crossed = () => {
    const a = new THREE.PlaneGeometry(1.3, 0.9).translate(0, 0.45, 0),
      b = a.clone().rotateY(Math.PI / 2);
    // both crossed planes plus back-to-back copies: single-sided faces that all take light from above
    const g = merge([a, b, a.clone().rotateY(Math.PI), b.clone().rotateY(Math.PI)]),
      n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); // yer gibi ışık alsın
    return g;
  };
  // conifers: stacked, slightly drooping tiers instead of one cone
  const tiers = (n, r0, r1, y0, y1, h) => {
    const g = [];
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      g.push(
        new THREE.ConeGeometry(lerp(r0, r1, t), h * (1 - t * 0.35), 9, 1, true).translate(
          0,
          lerp(y0, y1, t),
          0,
        ),
      );
    }
    return merge(g);
  };
  return {
    trunk,
    tallTrunk,
    pine: organic(tiers(4, 2.4, 0.9, 3.2, 7.0, 2.9), 0.08, 0.45),
    spruce: organic(tiers(5, 1.75, 0.55, 2.6, 8.6, 2.6), 0.06, 0.4),
    oak: organic(
      merge([blob(2.4, 0, 4.9, 0, 1.05, 0.78, 1), blob(1.6, 1.4, 4.3, 0.4), blob(1.5, -1.1, 4.6, -0.7)]),
      0.16,
    ),
    poplar: organic(blob(1, 0, 6.3, 0, 1.2, 4.2, 1.2, 1), 0.1),
    birch: organic(merge([blob(1.55, 0, 5.5, 0, 1, 1.3, 1), blob(1.05, 0.8, 4.6, 0.3, 1, 1, 1, 1)]), 0.14),
    bush: organic(merge([blob(1, 0, 0.55, 0, 1.3, 0.85, 1.2, 1), blob(0.75, 0.8, 0.45, 0.3)]), 0.14, 0.55),
    tuft: crossed(),
  };
}

/* ---------- yerleştirme ---------- */
// bir noktaya bitki konabilir mi? (şehir, yollar, benzinlik, rampa, su ve engeller dışı)
function vegOk(x, z, roadGap, maxSlope) {
  if (Math.abs(x) < CITY + 8 && Math.abs(z) < CITY + 8) return false;
  if (roadDist(x, z) < roadGap) return false;
  if (Math.hypot(x - STATION.x, z - STATION.z) < 48) return false;
  const hd = hwInfo(x, z, HI);
  if (hd && Math.abs(hd.lat) < HW_HALF + roadGap - 9) return false;
  const y = hAt(x, z);
  const sl = Math.abs(hAt(x + 3, z) - hAt(x - 3, z)) + Math.abs(hAt(x, z + 3) - hAt(x, z - 3));
  if (sl > maxSlope) return false;
  if (y < 24 && VALLEYS.some((v) => v.water && valleyAt(v, x, z).k > 0.45)) return false;
  for (const r of RAMPS) if (Math.hypot(x - r.x, z - r.z) < 40) return false;
  return true;
}
const forestAt = (x, z) => fbm(x * 0.006 + 9, z * 0.006, 2); // > -0.15: orman, altı: çayır
function scatter(count, tries, test) {
  const out = [];
  for (let t = 0; t < tries && out.length < count; t++) {
    const x = (rng() * 2 - 1) * (HALF - 30),
      z = (rng() * 2 - 1) * (HALF - 30);
    if (test(x, z)) out.push([x, z]);
  }
  return out;
}

// türü yüksekliğe ve konuma göre seç
function pickSpecies(x, y, z, park) {
  const r = rng();
  if (park) return r < 0.55 ? "oak" : r < 0.8 ? "birch" : "poplar";
  if (y > 85) return r < 0.55 ? "pine" : "spruce";
  if (y > 50) return r < 0.4 ? "pine" : r < 0.6 ? "spruce" : r < 0.85 ? "oak" : "birch";
  if (roadDist(x, z) < 34 && r < 0.3) return "poplar"; // yol kenarında kavak sıraları
  return r < 0.42 ? "oak" : r < 0.6 ? "birch" : r < 0.75 ? "poplar" : "pine";
}

const SPECIES = {
  pine: {
    crown: "pine",
    trunk: "trunk",
    bark: "#5a4634",
    cols: ["#2f5428", "#3b6330", "#2a4a2a", "#355a2c"],
    r: 0.45,
  },
  spruce: {
    crown: "spruce",
    trunk: "trunk",
    bark: "#4e3d2e",
    cols: ["#24432a", "#2c4f31", "#1f3d27"],
    r: 0.4,
  },
  oak: {
    crown: "oak",
    trunk: "trunk",
    bark: "#5e4a36",
    cols: ["#4f7a32", "#5d8a3a", "#466e2e", "#6b8f3c"],
    fall: ["#c8842a", "#b5562a", "#d6a93a", "#9c3f22"],
    r: 0.5,
  },
  poplar: {
    crown: "poplar",
    trunk: "tallTrunk",
    bark: "#6b5a44",
    cols: ["#5b8236", "#6a9140", "#4d7530"],
    fall: ["#d9b23c", "#e0c04a"],
    r: 0.35,
  },
  birch: {
    crown: "birch",
    trunk: "tallTrunk",
    bark: "#e4e0d6",
    cols: ["#7fa648", "#8db352", "#6f9a40"],
    fall: ["#e8c547", "#f0d35a", "#d9a93a"],
    r: 0.3,
  },
};

function buildVegetation(parkSpots) {
  const G = vegGeos(),
    m4 = new THREE.Matrix4(),
    q4 = new THREE.Quaternion(),
    s4 = new THREE.Vector3(),
    p4 = new THREE.Vector3(),
    yax = new THREE.Vector3(0, 1, 0),
    col = new THREE.Color();

  // ağaçlar: orman bölgelerinde sık, çayırlarda seyrek
  const spots = parkSpots.map(([x, z]) => [x, z, true]);
  for (const [x, z] of scatter(1100, 14000, (x, z) => {
    if (!vegOk(x, z, 15, 4.5) || hAt(x, z) > 150) return false;
    if (forestAt(x, z) < -0.15 && rng() < 0.8) return false;
    nearObs(x, z, 3, obsList);
    return !obsList.length;
  }))
    spots.push([x, z, false]);
  const bySp = {};
  for (const [x, z, park] of spots) {
    const y = hAt(x, z),
      sp = pickSpecies(x, y, z, park);
    (bySp[sp] = bySp[sp] || []).push([x, y, z]);
  }
  for (const name in bySp) {
    const S = SPECIES[name],
      list = bySp[name],
      n = list.length;
    const crownMat = addSway(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.95,
        flatShading: name !== "pine" && name !== "spruce",
        side: name === "pine" || name === "spruce" ? THREE.DoubleSide : THREE.FrontSide,
      }),
      0.018,
      2.5,
    );
    const crowns = [],
      trunks = [];
    list.forEach(([x, y, z]) => {
      const sc = 0.75 + rng() * 0.7;
      p4.set(x, y - 0.2, z);
      q4.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.07, rng() * 6.28, (rng() - 0.5) * 0.07, "YXZ"));
      s4.set(sc, sc * (0.85 + rng() * 0.4), sc);
      m4.compose(p4, q4, s4);
      trunks.push({ x, z, m: m4.clone() });
      // sonbahar lekeleri: bazı bölgelerde yapraklı ağaçlar sararır/kızarır
      const autumn = S.fall && fbm(x * 0.0035 + 3, z * 0.0035 - 5, 2) > 0.28 && rng() < 0.75;
      const pal = autumn ? S.fall : S.cols;
      col.copy(C(pal[(rng() * pal.length) | 0])).multiplyScalar(0.9 + rng() * 0.2);
      crowns.push({ x, z, m: m4.clone(), c: col.clone() });
      addObs({ t: 1, x, z, r: S.r * sc, top: y + 7 }, x - 1, x + 1, z - 1, z + 1);
    });
    chunked(G[S.crown], crownMat, crowns, true, 1e9);
    chunked(
      G[S.trunk],
      new THREE.MeshStandardMaterial({ color: C(S.bark), roughness: 1 }),
      trunks,
      true,
      900,
    );
  }

  // çalılar: orman kenarlarında ve yol kenarlarında (çarpınca durdurmaz)
  const bushes = scatter(
    1200,
    9000,
    (x, z) => vegOk(x, z, 11, 6) && hAt(x, z) < 140 && forestAt(x, z) > -0.35,
  );
  for (const [x, z] of parkSpots)
    if (rng() < 0.6) bushes.push([x + (rng() - 0.5) * 8, z + (rng() - 0.5) * 8]);
  instanced(
    G.bush,
    addSway(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 1,
        flatShading: true,
      }),
      0.04,
      0.4,
    ),
    bushes,
    (x, z) => {
      const sc = 0.6 + rng() * 0.8;
      s4.set(sc, sc * (0.7 + rng() * 0.5), sc);
      col.copy(C(["#4a6e2c", "#557a30", "#3f6127", "#62803a", "#6d7d3a"][(rng() * 5) | 0]));
      return -0.15;
    },
    false,
    false,
    700,
  );

  // kayalar: dik yamaçlarda ve dağlarda; büyükleri engeldir
  const rocks = scatter(400, 12000, (x, z) => {
    if (!vegOk(x, z, 13, 14)) return false;
    const y = hAt(x, z),
      sl = Math.abs(hAt(x + 3, z) - hAt(x - 3, z)) + Math.abs(hAt(x, z + 3) - hAt(x, z - 3));
    return sl > 3 || y > 90 || rng() < 0.08;
  });
  instanced(
    new THREE.DodecahedronGeometry(1, 0).translate(0, 0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    rocks,
    (x, z, y) => {
      const sc = 0.5 + Math.pow(rng(), 2) * 2.8;
      s4.set(sc * (0.8 + rng() * 0.6), sc * (0.5 + rng() * 0.5), sc * (0.8 + rng() * 0.6));
      q4.setFromEuler(new THREE.Euler(rng() * 0.6, rng() * 6.28, rng() * 0.6));
      const v = 0.38 + rng() * 0.2;
      col.setRGB(v, v * 0.98, v * 0.93);
      if (sc > 1.2) addObs({ t: 1, x, z, r: sc * 0.8, top: y + sc }, x - 2, x + 2, z - 2, z + 2);
      return -sc * 0.25;
    },
    true,
    true,
    1e9,
  );

  // çimen öbekleri ve kır çiçekleri (gölge düşürmez)
  // çimenler kümeler halinde: her merkezin çevresine 3-6 öbek
  const tufts = [];
  for (const [cx, cz] of scatter(1500, 26000, (x, z) => vegOk(x, z, 10, 7) && hAt(x, z) < 130)) {
    const n = 3 + ((rng() * 4) | 0);
    for (let k = 0; k < n; k++) tufts.push([cx + (rng() - 0.5) * 6, cz + (rng() - 0.5) * 6]);
  }
  for (const [x, z] of parkSpots)
    for (let k = 0; k < 6; k++) tufts.push([x + (rng() - 0.5) * 16, z + (rng() - 0.5) * 16]);
  const grassMat = addSway(
    new THREE.MeshStandardMaterial({
      map: grassTuftTex,
      alphaTest: 0.5,
      roughness: 1,
    }),
    0.12,
    0.1,
  );
  instanced(
    G.tuft,
    grassMat,
    tufts,
    (x, z) => {
      const sc = 1.2 + rng() * 1.2;
      s4.set(sc, sc * (0.7 + rng() * 0.6), sc);
      const dry = fbm(x * 0.008 - 4, z * 0.008 + 2, 2) > 0.2; // kuru, sarımsı çayır lekeleri
      col.copy(
        C(
          dry
            ? ["#a59a4e", "#b3a65a", "#8f8a45"][(rng() * 3) | 0]
            : ["#5f8a35", "#6c973c", "#4f7a2e", "#78a045"][(rng() * 4) | 0],
        ),
      );
      return -0.05;
    },
    false,
    false,
    150,
  );
  const flowers = scatter(
    700,
    20000,
    (x, z) => forestAt(x, z) < -0.1 && vegOk(x, z, 10, 5) && hAt(x, z) < 110,
  );
  for (const [x, z] of flowers.slice())
    for (let k = 0; k < 2; k++) flowers.push([x + (rng() - 0.5) * 4, z + (rng() - 0.5) * 4]);
  for (const [x, z] of parkSpots)
    for (let k = 0; k < 4; k++) flowers.push([x + (rng() - 0.5) * 18, z + (rng() - 0.5) * 18]);
  const flowerMat = addSway(
    new THREE.MeshStandardMaterial({ map: flowerTex, alphaTest: 0.5, roughness: 1 }),
    0.1,
    0.1,
  );
  instanced(
    G.tuft,
    flowerMat,
    flowers,
    (x, z) => {
      const sc = 0.9 + rng() * 0.6;
      s4.set(sc, sc, sc);
      // çiçek renkleri bölgeye göre öbeklenir (gelincik tarlası, papatyalık, lavanta...)
      const patch = Math.floor((fbm(x * 0.01, z * 0.01 + 11, 2) + 1) * 2.5);
      col.copy(C(["#ffffff", "#e8343a", "#f2d33a", "#a77be0", "#f08cc0"][clamp(patch, 0, 4)]));
      return -0.05;
    },
    false,
    false,
    150,
  );

  // ortak kurulum: her nokta için ölçek/renk belirle, matrisi yaz
  function instanced(geo, mat, list, setup, shadow, freeRot, maxDist) {
    const items = [];
    list.forEach(([x, z]) => {
      const y = hAt(x, z);
      q4.setFromAxisAngle(yax, rng() * 6.28);
      const dy = setup(x, z, y);
      if (!freeRot) q4.setFromAxisAngle(yax, rng() * 6.28);
      p4.set(x, y + dy, z);
      m4.compose(p4, q4, s4);
      items.push({ x, z, m: m4.clone(), c: col.clone() });
    });
    chunked(geo, mat, items, shadow, maxDist);
  }
}

/* ---------- bölgelere ayırma (chunk) ----------
   Her tür 400 m'lik karelere bölünür; her karenin kendi sınır küresi olduğu için ekranda (ve gölge
   kamerasında) olmayan kareler hiç çizilmez. maxDist: bu uzaklıktan sonra kare gizlenir (çimen, çiçek). */
const VEG_CHUNK = 400,
  VEG_LOD = [];
function chunked(geo, mat, items, shadow, maxDist) {
  const groups = new Map();
  for (const it of items) {
    const k = Math.floor((it.x + HALF) / VEG_CHUNK) * 100 + Math.floor((it.z + HALF) / VEG_CHUNK);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(it);
  }
  const off = new THREE.Matrix4();
  for (const [k, list] of groups) {
    const cx = -HALF + (Math.floor(k / 100) + 0.5) * VEG_CHUNK,
      cz = -HALF + ((k % 100) + 0.5) * VEG_CHUNK;
    let cy = 0;
    for (const it of list) cy += it.m.elements[13] / list.length;
    const g2 = geo.clone();
    g2.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), VEG_CHUNK * 0.72 + 60);
    const im = new THREE.InstancedMesh(g2, mat, list.length);
    im.position.set(cx, cy, cz);
    off.makeTranslation(-cx, -cy, -cz);
    list.forEach((it, i) => {
      im.setMatrixAt(i, it.m.premultiply(off));
      if (it.c) im.setColorAt(i, it.c);
    });
    im.castShadow = shadow;
    im.receiveShadow = true;
    scene.add(im);
    if (maxDist < 1e8) VEG_LOD.push({ im, x: cx, z: cz, d: maxDist + VEG_CHUNK * 0.72 });
  }
}
// uzak çimen/çiçek karelerini gizle (birkaç karede bir çağrılır)
function updateVegLod(px, pz) {
  for (const L of VEG_LOD) L.im.visible = Math.hypot(L.x - px, L.z - pz) < L.d;
}
