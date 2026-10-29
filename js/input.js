/* Kontroller: klavye, dokunmatik direksiyon/pedallar, oyun kolu. */
"use strict";

/* ---------- input ---------- */
const keys = {};
const inp = { throttle: 0, brake: 0, steer: 0, hand: false };
const touchState = { steer: 0, gas: false, brake: false, hand: false };
let camMode = 0,
  menuOpen = true,
  headOn = false,
  night = false;
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.repeat) return;
  if (menuOpen) {
    // garajda: Enter sürmeye başlatır, Esc (oyun başladıysa) garajı kapatır
    if (e.code === "Enter" && !(e.target instanceof HTMLButtonElement)) $("go").click();
    if (e.code === "Escape" && !$("helpPop").hidden) $("helpPop").hidden = true;
    else if (e.code === "Escape" && started) closeMenu();
    if (e.code === "ArrowLeft") selectCar(carIdx - 1);
    if (e.code === "ArrowRight") selectCar(carIdx + 1);
    return;
  }
  if (e.code === "KeyC") cycleCam();
  if (e.code === "KeyR") flipBack();
  if (e.code === "KeyT" && race) startRace(race.R.id);
  if (e.code === "KeyM") toggleSound();
  if (e.code === "KeyL") toggleLights();
  if (e.code === "KeyN") setNight(!night);
  if (e.code === "Escape") openMenu();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
addEventListener("blur", () => {
  for (const k in keys) keys[k] = false;
});
function bindHold(el, key) {
  const on = (e) => {
    e.preventDefault();
    touchState[key] = true;
    el.classList.add("on");
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}
  };
  const off = () => {
    touchState[key] = false;
    el.classList.remove("on");
  };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointercancel", off);
  el.addEventListener("lostpointercapture", off);
}
bindHold($("bGas"), "gas");
bindHold($("bBrake"), "brake");
bindHold($("bHand"), "hand");
// rotating steering wheel: drag around its centre, like a real wheel
const WMAX = 2.2;
let wAng = 0,
  wDrag = null;
{
  const wh = $("wheel");
  wh.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const r = wh.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    wDrag = { id: e.pointerId, cx, cy, a: Math.atan2(e.clientY - cy, e.clientX - cx) };
    wh.classList.add("on");
    try {
      wh.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  wh.addEventListener("pointermove", (e) => {
    if (!wDrag || e.pointerId !== wDrag.id) return;
    const a = Math.atan2(e.clientY - wDrag.cy, e.clientX - wDrag.cx);
    let d = a - wDrag.a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    wDrag.a = a;
    wAng = clamp(wAng + d, -WMAX, WMAX);
  });
  const end = (e) => {
    if (!wDrag || e.pointerId !== wDrag.id) return;
    wDrag = null;
    wh.classList.remove("on");
  };
  wh.addEventListener("pointerup", end);
  wh.addEventListener("pointercancel", end);
  wh.addEventListener("lostpointercapture", end);
}
const wheelSvg = $("wheel").firstElementChild;
function readInput(dt) {
  let thr = keys.KeyW || keys.ArrowUp || touchState.gas ? 1 : 0,
    brk = keys.KeyS || keys.ArrowDown || touchState.brake ? 1 : 0;
  let st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let hand = !!(keys.Space || touchState.hand),
    analog = false;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0;
    if (Math.abs(ax) > 0.12) {
      st = ax;
      analog = true;
    }
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0,
      lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    if (rt > 0.05) thr = Math.max(thr, rt);
    if (lt > 0.05) brk = Math.max(brk, lt);
    if (gp.buttons[0] && gp.buttons[0].pressed) hand = true;
    break;
  }
  if (wDrag) {
    st = wAng / WMAX;
    analog = true;
  }
  st = clamp(st, -1, 1);
  if (analog) inp.steer = lerp(inp.steer, st, 1 - Math.exp(-dt * 14));
  else {
    const rate = Math.abs(st) > Math.abs(inp.steer) && Math.sign(st) === Math.sign(inp.steer || st) ? 3.2 : 6;
    const d = st - inp.steer;
    inp.steer += clamp(d, -rate * dt, rate * dt);
  }
  inp.throttle = thr;
  inp.brake = brk;
  inp.hand = hand;
  if (!wDrag) wAng = inp.steer * WMAX;
  wheelSvg.style.transform = `rotate(${wAng}rad)`;
}
