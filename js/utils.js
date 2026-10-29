/* Yardımcı fonksiyonlar: matematik, rastgele sayı, gürültü (noise), renk. */
"use strict";

const $ = (id) => document.getElementById(id);
if (typeof THREE === "undefined") {
  $("loading").textContent = "3D motoru yüklenemedi. Sayfayı yenile.";
  throw new Error("THREE yok");
}
const isTouch = matchMedia("(pointer: coarse)").matches;
if (isTouch) document.body.classList.add("touch");

/* ---------- utils ---------- */
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x),
  lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry(20261028);
function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy),
    b = hash2(ix + 1, iy),
    c = hash2(ix, iy + 1),
    d = hash2(ix + 1, iy + 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
}
function fbm(x, y, o) {
  let s = 0,
    a = 0.5,
    f = 1,
    n = 0;
  for (let i = 0; i < o; i++) {
    s += a * vnoise(x * f, y * f);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}
const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const FONT = '"Barlow Condensed","Arial Narrow","Segoe UI",sans-serif';
// base64 metni -> ArrayBuffer (gömülü 3B modeller için)
const b64 = (s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)).buffer;
