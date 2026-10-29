/* Oyun durumu, garaj menüsü, kamera, gösterge (HUD), ana döngü ve açılış. */
"use strict";

/* ---------- game state ---------- */
let carIdx = 0,
  paintIdx = 0,
  car = null,
  model = null,
  coins = 0;
const lastMark = [null, null, null, null];
function spawnCar() {
  const sp = CARS[carIdx];
  if (model) scene.remove(model.root, model.shadow);
  car = new Car(sp);
  model = buildCarModel(sp, PAINTS[paintIdx][1]);
  scene.add(model.root, model.shadow);
  car.reset(0, 150, 0);
  $("hudCar").textContent = sp.name + " · " + sp.plate;
  for (let i = 0; i < 4; i++) lastMark[i] = null;
  collectEnvMats();
}
function flipBack() {
  if (!car) return;
  const f = _a.set(0, 0, -1).applyQuaternion(car.q);
  const yaw = Math.atan2(-f.x, -f.z);
  car.reset(car.p.x, car.p.z, yaw, car.p.y);
  toast("Araç kaldırıldı");
}
function cycleCam() {
  camMode = (camMode + 1) % 3;
  toast(["Takip kamerası", "Uzak kamera", "Kaput kamerası"][camMode], 1200);
}
function toggleSound() {
  soundOn = !soundOn;
  $("tSound").setAttribute("aria-pressed", soundOn);
  $("tSound").textContent = soundOn ? "Ses" : "Sessiz";
  if (audio) audio.master.gain.value = soundOn ? 0.5 : 0;
}
function toggleLights() {
  headOn = !headOn;
  $("tLights").setAttribute("aria-pressed", headOn);
  toast(headOn ? "Farlar açık" : "Farlar kapalı", 1000);
}
function setNight(n) {
  night = n;
  const P = n ? NIGHT : DAY;
  applySky(P);
  scene.fog.color.copy(P.hor);
  sun.color.copy(P.light);
  sun.intensity = P.sunI;
  hemi.intensity = P.hemiI;
  hemi.color.copy(P.hemiSky);
  scene.environment = n ? envNight : envDay;
  renderer.toneMappingExposure = P.exp;
  if (W.canopy) {
    W.canopy.emissiveIntensity = n ? 2.4 : 0.4;
    W.fascia.emissiveIntensity = n ? 0.9 : 0.15;
  }
  if (W.bld) {
    W.bld.emissiveIntensity = n ? 0.9 : 0;
    W.shop.emissiveIntensity = n ? 1.35 : 0.3;
    W.lamp.emissiveIntensity = n ? 3 : 0;
    W.pools.visible = n;
    W.lampHalos.visible = n;
    W.board.emissiveIntensity = n ? 0.35 : 0;
  }
  BOTMAT.head.emissiveIntensity = n ? 2.6 : 0.3;
  BOTMAT.haloHead.visible = BOTMAT.haloTail.visible = n;
  headOn = n;
  $("tLights").setAttribute("aria-pressed", headOn);
  $("tNight").textContent = n ? "Gündüz" : "Gece";
  $("mDay").setAttribute("aria-pressed", !n);
  $("mNight").setAttribute("aria-pressed", n);
  saveGame();
}
let toastT = 0;
function toast(msg, ms = 2200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("off");
  toastT = ms / 1000;
}

/* ---------- garaj ----------
   Araçlar yana kaydırılan tek kartta gösterilir (oklar, parmakla kaydırma ya da ←/→). */
const DRIVE_TR = { rwd: "Arkadan itiş", fwd: "Önden çekiş", awd: "4 çeker" };
const MODES = [{ id: "serbest", name: "Serbest", info: "Jetonları topla, dünyayı keşfet" }, ...ROUTES];
function buildCarousel() {
  const tr = $("carTrack"),
    dots = $("carDots");
  tr.innerHTML = "";
  dots.innerHTML = "";
  const bar = (v) => `<i><b style="width:${Math.round(clamp(v, 0.06, 1) * 100)}%"></b></i>`;
  CARS.forEach((sp) => {
    const s = document.createElement("div");
    s.className = "slide";
    s.innerHTML = `<div class="nm">${sp.name}</div>
      <div class="ty">${sp.type.split(" · ")[0]} · ${sp.mass.toLocaleString("tr-TR")} kg · ${sp.plate}</div>
      <div class="bars">
        <span>GÜÇ</span>${bar(sp.hp / 650)}<em>${sp.hp} hp</em>
        <span>TUTUŞ</span>${bar((sp.grip - 0.98) / 0.32)}<em>${sp.grip.toFixed(2)}</em>
        <span>ARAZİ</span>${bar((sp.offroad - 0.55) / 0.45)}<em>${DRIVE_TR[sp.drive]}</em>
      </div>`;
    tr.appendChild(s);
    dots.appendChild(document.createElement("span"));
  });
  // parmakla / fareyle yana kaydırma
  const view = $("carView");
  let drag = null;
  view.onpointerdown = (e) => {
    drag = { x: e.clientX, id: e.pointerId, w: view.clientWidth };
    tr.style.transition = "none";
    try {
      view.setPointerCapture(e.pointerId);
    } catch (_) {}
  };
  view.onpointermove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    tr.style.transform = `translateX(${-carIdx * drag.w + (e.clientX - drag.x)}px)`;
  };
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    drag = null;
    tr.style.transition = "";
    if (dx < -40) selectCar(carIdx + 1);
    else if (dx > 40) selectCar(carIdx - 1);
    else renderMenu();
  };
  view.onpointerup = end;
  view.onpointercancel = end;
  $("carPrev").onclick = () => selectCar(carIdx - 1);
  $("carNext").onclick = () => selectCar(carIdx + 1);
}
function selectCar(i) {
  const n = CARS.length;
  i = ((i % n) + n) % n;
  if (i !== carIdx) {
    carIdx = i;
    spawnCar();
    saveGame();
  }
  renderMenu();
}
function renderMenu() {
  if (!$("carTrack").children.length) buildCarousel();
  $("carTrack").style.transform = `translateX(${-carIdx * 100}%)`;
  [...$("carDots").children].forEach((d, i) => d.classList.toggle("on", i === carIdx));
  $("carCount").textContent = carIdx + 1 + " / " + CARS.length;
  const pa = $("paints");
  pa.innerHTML = "";
  PAINTS.forEach(([n, h], i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sw";
    b.id = "paint-" + i;
    b.title = n;
    b.setAttribute("aria-label", n);
    b.style.background = h;
    b.setAttribute("aria-pressed", i === paintIdx);
    b.onclick = () => {
      paintIdx = i;
      model.paint.color.copy(C(h));
      renderMenu();
      saveGame();
    };
    pa.appendChild(b);
  });
  const md = $("modes");
  md.innerHTML = "";
  for (const r of MODES) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = r.id === "dag" ? "Dağ Yolu" : r.id === "cevre" ? "Çevre Yolu" : r.name;
    b.setAttribute("aria-pressed", r.id === raceMode);
    b.onclick = () => {
      raceMode = r.id;
      renderMenu();
    };
    md.appendChild(b);
  }
  const cur = MODES.find((r) => r.id === raceMode),
    best = bestTimes[raceMode];
  $("modeInfo").innerHTML =
    cur.info + (raceMode === "serbest" ? "" : ` · Rekor <b>${best ? fmtTime(best.t) : "—"}</b>`);
  $("mMusic").setAttribute("aria-pressed", MUSIC.on);
  $("go").textContent = raceMode === "serbest" ? "Sürmeye başla" : "Yarışı başlat";
  $("help").innerHTML = isTouch
    ? "Sol alttaki direksiyonu parmağınla gerçek direksiyon gibi çevir. Sağda <b>GAZ</b>, <b>FREN</b> (durunca geri vites) ve <b>EL FRENİ</b> (drift). Üstte <b>Far</b>, <b>Gece</b>, devrilen aracı düzelten <b>Kaldır</b> ve yarışta <b>Yeniden</b> var. Garajda aracı değiştirmek için kartı yana kaydır."
    : "<kbd>W</kbd>/<kbd>↑</kbd> gaz · <kbd>S</kbd>/<kbd>↓</kbd> fren ve geri · <kbd>A</kbd><kbd>D</kbd>/<kbd>←</kbd><kbd>→</kbd> direksiyon · <kbd>Boşluk</kbd> el freni · <kbd>L</kbd> farlar · <kbd>N</kbd> gece/gündüz · <kbd>C</kbd> kamera · <kbd>R</kbd> aracı kaldır · <kbd>M</kbd> ses · <kbd>T</kbd> yarışı yeniden başlat · <kbd>Esc</kbd> garaj.<br>Garajda: <kbd>←</kbd><kbd>→</kbd> araç seç · <kbd>Enter</kbd> başla. Oyun kolu da çalışır.";
}
function openMenu() {
  endRace();
  menuOpen = true;
  $("menu").hidden = false;
  $("hud").hidden = true;
  $("touch").hidden = true;
  renderMenu();
  if (audio) {
    audio.eg.gain.value = 0;
    if (MUSIC.on) musicStart();
  }
}
function closeMenu() {
  menuOpen = false;
  if (car) car.gear = 1;
  $("menu").hidden = true;
  $("hud").hidden = false;
  $("touch").hidden = !isTouch;
  initAudio();
  if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
  musicStop();
  $("helpPop").hidden = true;
}
let started = false;
$("go").onclick = () => {
  closeMenu();
  if (raceMode !== "serbest") {
    started = true;
    startRace(raceMode);
    return;
  }
  if (!started) {
    started = true;
    toast(
      collectibles.length +
        " altın jeton saklı. Işık sütunlarını takip et! Yeni Dağ Otoyolu'nda Kartal Tüneli ve kanyon viyadüğü seni bekliyor.",
      4200,
    );
  }
};
$("tCam").onclick = cycleCam;
$("tReset").onclick = flipBack;
$("tSound").onclick = toggleSound;
$("tMenu").onclick = openMenu;
$("tRestart").onclick = () => race && startRace(race.R.id);
$("tLights").onclick = toggleLights;
$("tNight").onclick = () => setNight(!night);
$("mDay").onclick = () => setNight(false);
$("mNight").onclick = () => setNight(true);
$("mMusic").onclick = () => {
  MUSIC.on = !MUSIC.on;
  if (MUSIC.on) musicStart();
  else musicStop();
  renderMenu();
  saveGame();
};
$("helpBtn").onclick = () => ($("helpPop").hidden = false);
$("helpClose").onclick = () => ($("helpPop").hidden = true);
// tarayıcılar sesi ancak ilk dokunuş/tuştan sonra açar: müzik o anda başlar
const firstGesture = () => {
  if (menuOpen && MUSIC.on) musicStart();
  removeEventListener("pointerdown", firstGesture);
  removeEventListener("keydown", firstGesture);
};
addEventListener("pointerdown", firstGesture);
addEventListener("keydown", firstGesture);
$("resetSave").onclick = () => {
  if (!confirm("Bütün jetonlar ve rekorlar silinsin mi?")) return;
  for (const cl of collectibles) {
    cl.got = false;
    cl.g.visible = true;
  }
  coins = 0;
  bestTimes = {};
  ghosts = {};
  $("hudCoins").textContent = `JETON 0 / ${collectibles.length}`;
  saveGame();
  renderMenu();
  toast("İlerleme sıfırlandı", 1600);
};

/* ---------- camera & HUD ---------- */
const camDir = new THREE.Vector3(0, 0, -1);
let orbitA = 0;
function updateCamera(dt) {
  const sp = car.sp,
    p = car.p;
  if (menuOpen) {
    orbitA += dt * 0.22;
    const r = isTouch ? 8.5 : 7.2;
    camera.position.set(p.x + Math.sin(orbitA) * r, p.y + 1.9, p.z + Math.cos(orbitA) * r);
    camera.lookAt(p.x, p.y + (innerWidth > 640 ? 0.3 : -0.9), p.z);
    if (innerWidth > 640) {
      _b.set(1, 0, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(_b, -1.6);
    }
    camera.fov = 50;
    camera.updateProjectionMatrix();
    return;
  }
  fwd.set(0, 0, -1).applyQuaternion(car.q);
  if (camMode === 2) {
    _a.set(0, sp.beltY - sp.cgY + 0.2, -(sp.wsX + 0.35))
      .applyQuaternion(car.q)
      .add(p);
    camera.position.copy(_a);
    camera.quaternion.copy(car.q);
    camera.fov = 70;
    camera.updateProjectionMatrix();
    return;
  }
  _b.set(fwd.x, 0, fwd.z);
  if (_b.lengthSq() > 0.01) {
    _b.normalize();
    if (car.v.dot(fwd) < -3) _b.negate();
    camDir.lerp(_b, 1 - Math.exp(-dt * 4.5)).normalize();
  }
  const dist = camMode === 0 ? 6.4 + sp.L * 0.2 : 11,
    hgt = camMode === 0 ? 2.2 : 3.8;
  _a.copy(p).addScaledVector(camDir, -dist);
  _a.y = p.y + hgt;
  camera.position.lerp(_a, 1 - Math.exp(-dt * 7));
  ground(camera.position.x, camera.position.z, G, car.p.y);
  const gh = G.h + 1;
  if (camera.position.y < gh) camera.position.y = gh;
  if (G.deck === 2 && camera.position.y > G.h + 6.4) camera.position.y = G.h + 6.4;
  camera.lookAt(p.x + camDir.x * 2, p.y + 0.9, p.z + camDir.z * 2);
  if (car.impact > 4) camera.position.y += (Math.random() - 0.5) * Math.min(car.impact, 15) * 0.012;
  camera.fov = 60 + Math.min(car.v.length() * 0.22, 16);
  camera.updateProjectionMatrix();
}
const mini = $("mini"),
  mctx = mini.getContext("2d");
function drawMini() {
  const s = mini.width,
    c = s / 2,
    f = _a.set(0, 0, -1).applyQuaternion(car.q),
    head = Math.atan2(f.x, -f.z);
  mctx.clearRect(0, 0, s, s);
  mctx.save();
  mctx.beginPath();
  mctx.arc(c, c, c - 2, 0, Math.PI * 2);
  mctx.clip();
  mctx.translate(c, c);
  mctx.rotate(-head);
  const k = (s / 264) * 1.1;
  mctx.scale(k, k);
  mctx.translate(-(car.p.x + HALF) / 2, -(car.p.z + HALF) / 2);
  mctx.drawImage(mapCanvas, 0, 0);
  mctx.fillStyle = "#ffc93c";
  for (const cl of collectibles)
    if (!cl.got) {
      mctx.beginPath();
      mctx.arc((cl.x + HALF) / 2, (cl.z + HALF) / 2, 5, 0, Math.PI * 2);
      mctx.fill();
    }
  drawRaceMini(mctx);
  mctx.fillStyle = "#f4f6f8";
  for (const b of BOTS) mctx.fillRect((b.pos.x + HALF) / 2 - 3, (b.pos.z + HALF) / 2 - 3, 6, 6);
  mctx.restore();
  mctx.fillStyle = "#ffb22e";
  mctx.strokeStyle = "#0c1015";
  mctx.lineWidth = 3;
  mctx.beginPath();
  mctx.moveTo(c, c - 13);
  mctx.lineTo(c + 9, c + 10);
  mctx.lineTo(c, c + 5);
  mctx.lineTo(c - 9, c + 10);
  mctx.closePath();
  mctx.stroke();
  mctx.fill();
}
function updateHUD() {
  const vk = Math.abs(car.v.dot(fwd.set(0, 0, -1).applyQuaternion(car.q))) * 3.6;
  $("spd").textContent = Math.round(vk);
  $("gear").textContent = car.gear < 0 ? "R" : car.v.length() < 0.3 && inp.throttle < 0.05 ? "N" : car.gear;
  const x = clamp(car.rpm / (car.sp.redline + 300), 0, 1);
  $("rpmArc").setAttribute("stroke-dasharray", `${(292.2 * x).toFixed(1)} 400`);
  $("rpmArc").setAttribute("stroke", car.rpm > car.sp.redline * 0.93 ? "#ff5240" : "#ffb22e");
  const rz = (292.2 * (car.sp.redline * 0.93)) / (car.sp.redline + 300);
  $("redzone").setAttribute("stroke-dasharray", `0 ${rz.toFixed(1)} ${(292.2 - rz).toFixed(1)} 400`);
  $("tBrk").classList.toggle("on", car.braking);
  $("tHead").classList.toggle("on", headOn || inTunnel);
}
let inTunnel = false;

/* ---------- tünel ışığı ve göz uyumu ----------
   Tünelde güneş ve gökyüzü ışığı kesilir, ortamı sarı sodyum lambalar aydınlatır.
   Göz (pozlama) yeni ışığa yavaş alışır: girişte önce karanlık, çıkışta kısa bir kamaşma olur. */
let tunnelK = 0,
  eyeAdapt = 1,
  envMats = [],
  envLvl = -1;
const SODIUM = C("#ffc98a");
function collectEnvMats() {
  const set = new Set();
  scene.traverse((o) => {
    if (o.material) for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial) set.add(m);
  });
  envMats = [...set];
  envLvl = -1;
}
function updateTunnelLight(dt) {
  const P = night ? NIGHT : DAY;
  tunnelK += ((inTunnel ? 1 : 0) - tunnelK) * (1 - Math.exp(-dt * 3));
  const k = tunnelK;
  sun.intensity = P.sunI * (1 - 0.85 * k);
  hemi.intensity = lerp(P.hemiI, 0.24, k);
  hemi.color.copy(P.hemiSky).lerp(SODIUM, k);
  const lvl = lerp(1, 0.15, k);
  if (Math.abs(lvl - envLvl) > 0.01) {
    envLvl = lvl;
    for (const m of envMats) m.envMapIntensity = lvl;
  }
  // gözün gördüğü parlaklık (B) ve alışma: karanlığa yavaş, aydınlığa daha hızlı alışır
  const ref = night ? 0.35 : 1,
    B = night ? lerp(0.35, 0.5, k) : lerp(1, 0.55, k);
  eyeAdapt += (B - eyeAdapt) * (1 - Math.exp(-dt * (B < eyeAdapt ? 0.9 : 1.4)));
  renderer.toneMappingExposure = P.exp * clamp(Math.pow(ref / eyeAdapt, 0.75), 0.5, 3);
}
function updateLights() {
  const lo = headOn || inTunnel;
  CM.head.emissiveIntensity = lo ? 3.4 : 0.15;
  CM.tail.emissiveIntensity = lo ? 1.1 : 0.1;
  CM.brake.emissiveIntensity = car.braking && !menuOpen ? 5.5 : lo ? 0.5 : 0.04;
  CM.rev.emissiveIntensity = car.gear < 0 && !menuOpen ? 3.2 : 0.02;
  for (const s of model.spots) s.intensity = lo ? (night ? 3.2 : inTunnel ? 1.8 : 1.2) : 0;
  CM.haloHead.opacity = lo ? (night || inTunnel ? 0.9 : 0.45) : 0;
  CM.haloTail.opacity = car.braking && !menuOpen ? 0.95 : lo ? 0.35 : 0;
  model.glow.intensity = car.braking && !menuOpen ? (night ? 2.4 : 0.7) : headOn && night ? 0.35 : 0;
}
function updateSignals(t) {
  const c = t % 20;
  const Z = c < 8 ? "g" : c < 10 ? "y" : "r",
    X = c < 10 ? "r" : c < 18 ? "g" : c < 20 ? "y" : "r";
  SIG.Z = Z;
  SIG.X = X;
  for (const k in signalMats) {
    const on = (k[0] === "Z" ? Z : X) === k[1];
    signalMats[k].emissiveIntensity = on ? (night ? 3.5 : 2.6) : 0.04;
  }
}

/* ---------- main loop ---------- */
let fuelT = 0,
  fueled = false;
let acc = 0,
  last = performance.now(),
  hudT = 0,
  prevSpeed = 0,
  brakeFrom = 0;
const DT = 1 / 120;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  VEG_TIME.value = now / 1000;
  if (car && (frame.lodT = (frame.lodT || 0) - 1) <= 0) {
    frame.lodT = 15;
    updateVegLod(camera.position.x, camera.position.z);
  }
  readInput(dt);
  raceInput();
  if (!menuOpen) {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 8) {
      car.step(DT, inp);
      acc -= DT;
      n++;
    }
    if (n === 8) acc = 0;
  } else {
    acc = 0;
    car.v.multiplyScalar(0.9);
    car.w.multiplyScalar(0.9);
    car.step(DT, { throttle: 0, brake: 0, steer: 0, hand: false });
  }
  if (!menuOpen) updateRace(dt);
  const sp = car.sp,
    speed = car.v.length();
  model.root.position.copy(car.p);
  model.root.quaternion.copy(car.q);
  {
    // yere oturtan gölge: aracın altında zemin hizasında, yükseldikçe solar
    ground(car.p.x, car.p.z, G, car.p.y);
    const f = _a.set(0, 0, -1).applyQuaternion(car.q),
      lift = car.p.y - car.sp.cgY - G.h;
    model.shadow.position.set(car.p.x, G.h + 0.03, car.p.z);
    model.shadow.rotation.set(0, Math.atan2(-f.x, -f.z), 0);
    model.shadow.material.opacity = clamp(0.9 - lift * 0.6, 0, 0.9);
  }
  model.sw.rotation.z = -wAng;
  car.wheels.forEach((wh, i) => {
    const mw = model.wheels[i];
    const ext = clamp(wh.t - sp.R, 0, sp.restLen);
    mw.piv.position.set(wh.pos.x, wh.pos.y - ext, wh.pos.z);
    mw.piv.rotation.y = wh.front ? -car.steer : 0;
    wh.spin -= (wh.vl / sp.R) * dt;
    mw.spin.rotation.x = wh.spin;
    if (!menuOpen && wh.contact && wh.slip > 0.6 && speed > 1.5) {
      const cur = [wh.cx, wh.cy, wh.cz];
      if (lastMark[i]) {
        const a = lastMark[i];
        const dx = cur[0] - a[0],
          dz = cur[2] - a[2],
          l = Math.hypot(dx, dz);
        if (l > 0.35) {
          if (l < 3) addSkid(a, cur, -dz / l, dx / l);
          lastMark[i] = cur;
        }
      } else lastMark[i] = cur;
    } else lastMark[i] = null;
  });
  for (const cl of collectibles) {
    if (cl.got) continue;
    cl.c.rotation.y += dt * 2;
    cl.g.position.y = cl.y + Math.sin(now * 0.002 + cl.x) * 0.25;
    if (!menuOpen && Math.hypot(car.p.x - cl.x, car.p.z - cl.z) < 3.6 && Math.abs(car.p.y - cl.y) < 4.5) {
      cl.got = true;
      cl.g.visible = false;
      coins++;
      $("hudCoins").textContent = `JETON ${coins} / ${collectibles.length}`;
      ping(880, 1760, 0.25, 0.3);
      saveGame();
      toast(
        coins === collectibles.length
          ? "Tebrikler! Bütün jetonları topladın."
          : `Jeton ${coins} / ${collectibles.length}`,
        1600,
      );
    }
  }
  const upY = _a.set(0, 1, 0).applyQuaternion(car.q).y;
  if (!menuOpen) {
    if (upY < 0.3 && speed < 2.5) {
      car.flipT += dt;
      if (car.flipT > 2.2) flipBack();
    } else car.flipT = 0;
    ground(car.p.x, car.p.z, G, car.p.y);
    if (car.p.y < G.h - 6) flipBack();
  }
  if (car.impact > 5 && !menuOpen) thud(car.impact);
  car.impact = 0;
  // braking event bookkeeping
  if (car.braking && speed > 3) brakeFrom = Math.max(brakeFrom, speed);
  if (!car.braking) brakeFrom = 0;
  if (!menuOpen && brakeFrom > 4 && prevSpeed > 0.5 && speed <= 0.5) {
    stopCreak();
    brakeFrom = 0;
  }
  prevSpeed = speed;
  if (audio && soundOn && !menuOpen) {
    const t = audio.ctx.currentTime,
      f = (car.rpm / 60) * 2;
    audio.o1.frequency.setTargetAtTime(f, t, 0.03);
    audio.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    audio.lp.frequency.setTargetAtTime(400 + car.rpm * 0.18 + inp.throttle * 600, t, 0.05);
    audio.eg.gain.setTargetAtTime(0.05 + 0.09 * inp.throttle, t, 0.06);
    const lock = car.airborne ? 0 : car.brakeSlip,
      abs = lock > 0.3 && speed > 5 ? 0.6 + 0.4 * Math.sin(now * 0.075) : 1;
    const brk =
      car.braking && !car.airborne
        ? clamp((speed - 3) / 14, 0, 1) * (0.3 + 0.7 * clamp(lock * 1.4, 0, 1))
        : 0;
    const drift = car.airborne ? 0 : clamp((car.latSlip - 0.6) * 0.35, 0, 1) * 0.85;
    const scr = Math.max(brk, drift),
      bf = 900 + Math.min(speed, 40) * 7 + (Math.random() - 0.5) * 30;
    audio.scG.gain.setTargetAtTime(scr * 0.13 * abs, t, 0.035);
    audio.sc1.frequency.setTargetAtTime(bf, t, 0.06);
    audio.sc2.frequency.setTargetAtTime(bf * 1.52, t, 0.06);
    audio.f1.frequency.setTargetAtTime(bf * 1.15, t, 0.06);
    audio.f2.frequency.setTargetAtTime(bf * 2.3, t, 0.06);
    audio.fn.frequency.setTargetAtTime(bf * 1.8, t, 0.06);
    audio.sg.gain.setTargetAtTime(car.airborne ? 0 : clamp(car.latSlip * 0.015, 0, 0.06), t, 0.05);
    audio.rv.gain.setTargetAtTime(tunnelK * 1.4, t, 0.2);
    const wind = clamp(speed / 50, 0, 1.2);
    audio.wg.gain.setTargetAtTime(wind * wind * (0.07 + tunnelK * 0.05), t, 0.15);
    audio.wl.frequency.setTargetAtTime(300 + speed * 14, t, 0.15);
  } else if (audio) {
    audio.eg.gain.value = 0;
    audio.sg.gain.value = 0;
    audio.scG.gain.value = 0;
    audio.wg.gain.value = 0;
  }
  {
    const hd = hwInfo(car.p.x, car.p.z, HI, car.p.y);
    inTunnel = !!(hd && hd.kind === 2 && Math.abs(hd.lat) < HW_HALF + 1 && Math.abs(car.p.y - hd.y) < 5);
  }
  updateTunnelLight(dt);
  updateBots(dt);
  updateDebris(dt);
  if (!menuOpen) {
    let nearF = 1e9;
    for (const [fx, fz] of FUEL) nearF = Math.min(nearF, Math.hypot(car.p.x - fx, car.p.z - fz));
    if (nearF < 4.5 && speed < 0.6) {
      fuelT += dt;
      if (fuelT > 1.4 && !fueled) {
        fueled = true;
        toast("Depo dolduruldu! İyi yolculuklar.", 2000);
        ping(660, 660, 0.12, 0.2, "sine");
        ping(990, 990, 0.25, 0.2, "sine");
      }
    } else {
      fuelT = 0;
      if (nearF > 14) fueled = false;
    }
  }
  updateLights();
  updateSignals(now / 1000);
  updateCamera(dt);
  sky.position.copy(camera.position);
  sun.position.copy(car.p).addScaledVector(sunDir, 180);
  sun.target.position.copy(car.p);
  if (!menuOpen) {
    hudT -= dt;
    if (hudT <= 0) {
      updateHUD();
      drawMini();
      hudT = 1 / 30;
    }
  }
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $("toast").classList.add("off");
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
document.addEventListener("visibilitychange", () => {
  if (!audio) return;
  if (document.hidden) audio.ctx.suspend();
  else if (!menuOpen || MUSIC.playing) audio.ctx.resume();
});

/* ---------- boot ---------- */
function start(data) {
  const build = () => {
    try {
      buildWorld();
    } catch (err) {
      $("loading").textContent = "Dünya oluşturulamadı: " + err.message;
      return;
    }
    if (typeof data.car === "number" && CARS[data.car]) carIdx = data.car;
    if (typeof data.paint === "number" && PAINTS[data.paint]) paintIdx = data.paint;
    if (data.best && typeof data.best === "object") bestTimes = data.best;
    if (data.music === false) MUSIC.on = false;
    ghosts = loadGhosts();
    spawnCar();
    spawnBots();
    collectEnvMats();
    const got = new Set(Array.isArray(data.coins) ? data.coins : []);
    for (const cl of collectibles)
      if (got.has(coinKey(cl))) {
        cl.got = true;
        cl.g.visible = false;
        coins++;
      }
    $("hudCoins").textContent = `JETON ${coins} / ${collectibles.length}`;
    setNight(!!data.night);
    saveReady = true;
    renderMenu();
    $("menu").hidden = false;
    $("loading").hidden = true;
    requestAnimationFrame((t) => {
      last = t;
      frame(t);
    });
  };
  const fl =
    document.fonts && document.fonts.load
      ? Promise.race([
          Promise.all(
            ['700 40px "Barlow Condensed"', '600 40px "Barlow Condensed"'].map((f) => document.fonts.load(f)),
          ),
          new Promise((r) => setTimeout(r, 2500)),
        ])
      : Promise.resolve();
  fl.catch(() => {}).then(() => setTimeout(build, 20));
}

/* ---------- kayıt (localStorage) ----------
   Tarayıcı ilerlemeyi hatırlar: seçilen araç, boya, gece/gündüz, toplanan jetonlar, rekorlar.
   Jetonlar sırayla değil konumlarıyla saklanır; haritaya yeni jeton eklense de eski kayıt bozulmaz. */
const SAVE_KEY = "acikyol-kayit-v1",
  GHOST_KEY = "acikyol-hayalet-v1";
let saveReady = false,
  bestTimes = {},
  ghosts = {};
const coinKey = (cl) => Math.round(cl.x) + "," + Math.round(cl.z);
function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}
function writeStore(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}
function saveGame() {
  if (!saveReady) return;
  writeStore(SAVE_KEY, {
    car: carIdx,
    paint: paintIdx,
    night,
    coins: collectibles.filter((c) => c.got).map(coinKey),
    best: bestTimes,
    music: MUSIC.on,
  });
}
function loadGhosts() {
  return readStore(GHOST_KEY);
}
function saveGhosts() {
  writeStore(GHOST_KEY, ghosts);
}
addEventListener("pagehide", saveGame);
start(readStore(SAVE_KEY));
