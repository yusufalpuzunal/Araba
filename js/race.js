/* Zaman yarışı: parkurlar, kontrol noktaları (kapılar), geri sayım, süre, rekor, ara süre farkı ve hayalet araç. */
"use strict";

// Her parkur bir başlangıç noktası ve sırayla geçilmesi gereken kontrol noktaları üretir (son nokta = bitiş).
// lat: yol ortasından sağa doğru metre (sağ şeritten başlarız).
const ROUTES = [
  {
    id: "cevre",
    name: "Çevre Yolu Turu",
    info: "Şehrin çevresinde tam tur · ~3 km",
    make() {
      const P = loop.pts,
        n = P.length,
        s0 = loopNear(483, -92);
      const at = (i, lat) => {
        i = ((i % n) + n) % n;
        const a = P[(i - 1 + n) % n],
          b = P[(i + 1) % n];
        let tx = b.x - a.x,
          tz = b.z - a.z;
        const l = Math.hypot(tx, tz);
        tx /= l;
        tz /= l;
        return { x: P[i].x - tz * lat, z: P[i].z + tx * lat, y: loop.ys[i], tx, tz };
      };
      const cps = [];
      for (let k = 1; k <= 16; k++) cps.push({ ...at(s0 + Math.round((k / 16) * n), 0), r: 13, w: 15 });
      return { start: at(s0 + 6, 3), cps };
    },
  },
  {
    id: "dag",
    name: "Dağ Otoyolu",
    info: "Kartal Tüneli, kanyon viyadüğü ve geçit · ~1 km",
    make() {
      const h = MT,
        m = h.pts.length;
      const at = (i, lat) => ({
        x: h.pts[i].x - h.tz[i] * lat,
        z: h.pts[i].z + h.tx[i] * lat,
        y: h.ys[i],
        tx: h.tx[i],
        tz: h.tz[i],
      });
      const cps = [];
      for (let i = 90; i < m - 60; i += 60) cps.push({ ...at(i, 0), r: 16, w: 27 });
      cps.push({ ...at(m - 30, 0), r: 16, w: 27 });
      return { start: at(26, 4), cps };
    },
  },
];

let race = null,
  raceMode = "serbest",
  gateObj = null,
  ghostObj = null,
  raceHudT = 0;

function fmtTime(t) {
  if (t == null) return "—";
  const m = Math.floor(t / 60),
    s = t - m * 60;
  return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2);
}

/* ---------- kapı (kontrol noktası) modeli ---------- */
function buildGate() {
  const g = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: C("#1a1d22"), roughness: 0.5, metalness: 0.4 });
  const mk = (label, bg) =>
    tex(
      cvs(512, 64, (c) => {
        c.fillStyle = bg;
        c.fillRect(0, 0, 512, 64);
        if (label === "BİTİŞ")
          for (let y = 0; y < 2; y++)
            for (let x = 0; x < 32; x++)
              if ((x + y) % 2) {
                c.fillStyle = "#111";
                c.fillRect(x * 16, y * 32, 16, 32);
              }
        c.fillStyle = label === "BİTİŞ" ? "#ffb22e" : "#06222b";
        c.fillRect(176, 8, 160, 48);
        c.fillStyle = label === "BİTİŞ" ? "#111" : "#fff";
        txt(c, label, 256, 34, 140, 38);
      }),
      0,
    );
  g.userData.texCp = mk("KONTROL", "#18c6e6");
  g.userData.texFin = mk("BİTİŞ", "#f4f4f2");
  const band = new THREE.MeshStandardMaterial({
    map: g.userData.texCp,
    emissiveMap: g.userData.texCp,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 0.6,
    roughness: 0.5,
  });
  g.userData.band = band;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7, 0.45), post);
    p.position.set(0, 3.5, 0);
    p.castShadow = true;
    const holder = new THREE.Group();
    holder.add(p);
    holder.userData.side = s;
    g.add(holder);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 0.25), band);
  banner.position.y = 6.6;
  g.add(banner);
  g.userData.banner = banner;
  // yere yakın parlak perde: geçilecek çizgiyi gösterir
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 6),
    new THREE.MeshBasicMaterial({
      color: C("#3fe0ff"),
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  curtain.position.y = 3;
  g.add(curtain);
  g.userData.curtain = curtain;
  scene.add(g);
  return g;
}
function placeGate(cp, last) {
  if (!gateObj) gateObj = buildGate();
  const g = gateObj,
    w = cp.w;
  g.visible = true;
  g.position.set(cp.x, cp.y, cp.z);
  g.rotation.y = Math.atan2(cp.tx, cp.tz);
  for (const ch of g.children) if (ch.userData.side) ch.position.x = ch.userData.side * (w / 2 + 0.4);
  g.userData.banner.scale.x = w + 1.2;
  g.userData.curtain.scale.x = w;
  const t = last ? g.userData.texFin : g.userData.texCp;
  g.userData.band.map = g.userData.band.emissiveMap = t;
  g.userData.band.needsUpdate = true;
  g.userData.curtain.material.color.copy(C(last ? "#ffcf5a" : "#3fe0ff"));
}

/* ---------- hayalet araç: rekor turunun kaydı, yarı saydam olarak tekrar oynatılır ---------- */
const GHOST_HZ = 20;
const ghostMat = new THREE.MeshBasicMaterial({
  color: C("#8fd3ff"),
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
});
function makeGhost(carI) {
  const m = buildCarModel(CARS[carI] || CARS[0], "#8fd3ff"),
    drop = [];
  m.root.traverse((o) => {
    if (o.isMesh) {
      o.material = ghostMat;
      o.castShadow = o.receiveShadow = false;
    } else if (o.isLight || o.isSprite) drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  scene.add(m.root);
  return m.root;
}
function ghostPose(d, t, obj) {
  const n = d.length / 7,
    f = t * GHOST_HZ,
    i = Math.floor(f);
  if (i >= n - 1) {
    obj.visible = false;
    return;
  }
  obj.visible = true;
  const k = f - i,
    a = i * 7,
    b = a + 7;
  obj.position.set(lerp(d[a], d[b], k), lerp(d[a + 1], d[b + 1], k), lerp(d[a + 2], d[b + 2], k));
  _q.set(d[a + 3], d[a + 4], d[a + 5], d[a + 6]);
  _qi.set(d[b + 3], d[b + 4], d[b + 5], d[b + 6]);
  obj.quaternion.copy(_q).slerp(_qi, k);
}

/* ---------- yarış akışı ---------- */
function startRace(id) {
  const R = ROUTES.find((r) => r.id === id);
  if (!R) return;
  endRace();
  const d = R.make(),
    s = d.start;
  race = { R, cps: d.cps, i: 0, t: 0, count: 3.5, state: "count", rec: [], recT: 0, splits: [], lastCd: 0 };
  car.reset(s.x, s.z, Math.atan2(-s.tx, -s.tz), s.y);
  camDir.set(s.tx, 0, s.tz);
  placeGate(race.cps[0], race.cps.length === 1);
  const gh = ghosts[id];
  if (gh && Array.isArray(gh.d) && gh.d.length > 14) {
    ghostObj = makeGhost(gh.car);
    ghostObj.visible = false;
    race.ghost = gh.d;
  }
  $("race").hidden = false;
  $("tRestart").hidden = false;
  updateRaceHud();
}
function endRace() {
  race = null;
  if (gateObj) gateObj.visible = false;
  if (ghostObj) {
    scene.remove(ghostObj);
    ghostObj = null;
  }
  $("race").hidden = true;
  $("tRestart").hidden = true;
}
// geri sayımda araç yerinde durur
function raceInput() {
  if (race && race.state === "count") {
    inp.throttle = 0;
    inp.brake = 0;
  }
}
function updateRace(dt) {
  if (!race) return;
  if (race.state === "count") {
    car.v.x = car.v.z = 0;
    car.w.y = 0;
    race.count -= dt;
    const n = Math.ceil(race.count - 0.5);
    if (n !== race.lastCd) {
      race.lastCd = n;
      if (n > 0) {
        toast(String(n), 900);
        ping(440, 440, 0.18, 0.25, "square");
      } else {
        toast("BAŞLA!", 900);
        ping(880, 880, 0.35, 0.3, "square");
      }
    }
    if (race.count <= 0.5) race.state = "run";
  } else if (race.state === "run") {
    race.t += dt;
    // kayıt (hayalet için)
    race.recT -= dt;
    if (race.recT <= 0) {
      race.recT += 1 / GHOST_HZ;
      const p = car.p,
        q = car.q,
        r2 = (v) => Math.round(v * 100) / 100,
        r3 = (v) => Math.round(v * 1000) / 1000;
      race.rec.push(r2(p.x), r2(p.y), r2(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w));
    }
    if (ghostObj && race.ghost) ghostPose(race.ghost, race.t, ghostObj);
    const cp = race.cps[race.i];
    if (Math.hypot(car.p.x - cp.x, car.p.z - cp.z) < cp.r && Math.abs(car.p.y - cp.y) < 7) passCheckpoint();
  } else if (race.state === "done") {
    race.doneT -= dt;
    if (ghostObj && race.ghost) ghostPose(race.ghost, race.t + (4 - race.doneT), ghostObj);
    if (race.doneT <= 0) endRace();
  }
  raceHudT -= dt;
  if (race && raceHudT <= 0) {
    raceHudT = 0.05;
    updateRaceHud();
  }
}
function passCheckpoint() {
  const id = race.R.id,
    best = bestTimes[id],
    k = race.i;
  race.splits.push(Math.round(race.t * 100) / 100);
  race.i++;
  if (race.i >= race.cps.length) return finishRace();
  placeGate(race.cps[race.i], race.i === race.cps.length - 1);
  ping(990, 1320, 0.15, 0.22, "sine");
  if (best && best.sp && best.sp[k] != null) {
    const d = race.t - best.sp[k];
    toast((d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2) + " sn", 1200);
  }
}
function finishRace() {
  const id = race.R.id,
    t = Math.round(race.t * 100) / 100,
    best = bestTimes[id];
  race.state = "done";
  race.doneT = 4;
  if (gateObj) gateObj.visible = false;
  if (!best || t < best.t) {
    bestTimes[id] = { t, car: carIdx, sp: race.splits };
    ghosts[id] = { car: carIdx, d: race.rec };
    saveGhosts();
    saveGame();
    toast(
      best
        ? `YENİ REKOR! ${fmtTime(t)} (${(best.t - t).toFixed(2)} sn daha hızlı)`
        : `İlk rekor: ${fmtTime(t)}`,
      4000,
    );
    ping(660, 1320, 0.5, 0.3, "triangle");
    ping(990, 1980, 0.7, 0.2, "triangle");
  } else {
    toast(`Bitti: ${fmtTime(t)} · Rekor ${fmtTime(best.t)} (+${(t - best.t).toFixed(2)} sn)`, 4000);
    ping(660, 880, 0.4, 0.25, "triangle");
  }
  updateRaceHud();
}
function updateRaceHud() {
  if (!race) return;
  const best = bestTimes[race.R.id];
  $("rTime").textContent = fmtTime(race.t);
  $("rBest").textContent = best ? fmtTime(best.t) : "—";
  $("rCp").textContent = Math.min(race.i, race.cps.length) + "/" + race.cps.length;
}
// mini haritada sıradaki kontrol noktası
function drawRaceMini(g) {
  if (!race || race.state === "done") return;
  const cp = race.cps[race.i];
  g.fillStyle = race.i === race.cps.length - 1 ? "#ffcf5a" : "#3fe0ff";
  g.strokeStyle = "#0c1015";
  g.lineWidth = 3;
  g.beginPath();
  g.arc((cp.x + HALF) / 2, (cp.z + HALF) / 2, 8, 0, Math.PI * 2);
  g.stroke();
  g.fill();
}
