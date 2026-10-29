/* Araç listesi (CARS), boyalar ve 3B araç modelinin oluşturulması. */
"use strict";

/* ---------- cars (fictional brands) ---------- */
const CARS = [
  {
    name: "Yusuf GT",
    type: "Gran turismo · arkadan itiş",
    plate: "34 YSF 61",
    hp: 480,
    mass: 1520,
    drive: "rwd",
    tq: 600,
    redline: 7200,
    gears: [3.2, 2.15, 1.6, 1.25, 1.0, 0.82],
    rev: 3.2,
    final: 3.5,
    grip: 1.2,
    offroad: 0.68,
    steer: 0.58,
    freq: 1.8,
    restLen: 0.2,
    R: 0.35,
    track: 1.66,
    wb: 2.8,
    L: 4.7,
    W: 1.96,
    cgY: 0.47,
    drag: 0.5,
    down: 0.45,
    esp: 3.2,
    yb: 0.28,
    beltY: 0.95,
    roofY: 1.29,
    wsX: 0.6,
    tireW: 0.28,
    rim: "#c9ccd1",
    spokes: 10,
    spokeW: 0.03,
    caliper: "#c4161c",
    upper: [
      [2.33, 0.38],
      [2.35, 0.55],
      [2.22, 0.68],
      [1.4, 0.82],
      [0.55, 0.9],
      [-0.6, 0.96],
      [-1.6, 0.99],
      [-2.15, 1.0],
      [-2.33, 0.97],
      [-2.37, 0.74],
      [-2.35, 0.43],
    ],
    cabin: [
      [0.65, 0.88],
      [-0.15, 1.23],
      [-0.95, 1.25],
      [-1.75, 1.05],
      [-2.1, 0.98],
      [-1.95, 0.94],
      [0.5, 0.88],
    ],
    cabW: 1.52,
    roof: [
      [-0.12, 1.22],
      [-0.93, 1.24],
      [-0.95, 1.29],
      [-0.11, 1.27],
    ],
    hl: { x: 0.64, y: 0.6, w: 0.52 },
    tl: { x: 0.62, y: 0.82, w: 0.58 },
    plateF: 0.42,
    plateR: 0.6,
    doors: [0.62, -0.9],
    bX: -0.88,
    exhaust: [-0.55, -0.42, 0.42, 0.55],
    rearSeats: true,
    extra: "gt",
  },
  {
    name: "Alperen 4x4",
    type: "Arazi aracı · 4 çeker",
    plate: "34 ALP 61",
    hp: 300,
    mass: 2150,
    drive: "awd",
    tq: 600,
    redline: 5800,
    gears: [4.2, 2.6, 1.7, 1.25, 1.0, 0.8],
    rev: 3.8,
    final: 4.1,
    grip: 1.06,
    offroad: 1.0,
    steer: 0.66,
    freq: 1.25,
    restLen: 0.4,
    R: 0.43,
    track: 1.66,
    wb: 2.6,
    L: 4.5,
    W: 1.95,
    cgY: 0.82,
    drag: 0.85,
    down: 0,
    esp: 2.5,
    yb: 0.62,
    beltY: 1.3,
    roofY: 1.98,
    wsX: 1.12,
    tireW: 0.32,
    rim: "#2f3236",
    spokes: 6,
    spokeW: 0.09,
    caliper: "#3a3d42",
    upper: [
      [2.18, 0.72],
      [2.22, 0.95],
      [2.2, 1.16],
      [1.2, 1.26],
      [-0.4, 1.3],
      [-2.2, 1.32],
      [-2.26, 1.25],
      [-2.27, 0.72],
    ],
    cabin: [
      [1.15, 1.24],
      [0.75, 1.92],
      [-2.1, 1.94],
      [-2.2, 1.32],
      [1.0, 1.24],
    ],
    cabW: 1.78,
    roof: [
      [0.75, 1.9],
      [-2.1, 1.92],
      [-2.12, 1.98],
      [0.73, 1.97],
    ],
    hl: { x: 0.66, y: 1.02, w: 0.3, round: true },
    tl: { x: 0.8, y: 1.0, w: 0.2 },
    plateF: 0.8,
    plateR: 0.78,
    doors: [1.05, -0.1, -1.25],
    bX: -0.1,
    exhaust: [0.6],
    rearSeats: true,
    extra: "offroad",
  },
  {
    name: "Emin Coupe",
    type: "Kompakt coupe · arkadan itiş",
    plate: "54 EMN 054",
    hp: 250,
    mass: 1300,
    drive: "rwd",
    tq: 340,
    redline: 7200,
    gears: [3.4, 2.2, 1.6, 1.25, 1.0, 0.82],
    rev: 3.3,
    final: 3.9,
    grip: 1.12,
    offroad: 0.72,
    steer: 0.6,
    freq: 1.75,
    restLen: 0.22,
    R: 0.32,
    track: 1.56,
    wb: 2.6,
    L: 4.35,
    W: 1.82,
    cgY: 0.48,
    drag: 0.5,
    down: 0.2,
    esp: 2.6,
    yb: 0.28,
    beltY: 0.92,
    roofY: 1.36,
    wsX: 0.62,
    tireW: 0.24,
    rim: "#a9adb3",
    spokes: 5,
    spokeW: 0.06,
    caliper: "#2b2b2b",
    upper: [
      [2.12, 0.38],
      [2.15, 0.56],
      [2.05, 0.7],
      [1.2, 0.83],
      [0.6, 0.88],
      [-0.5, 0.92],
      [-1.45, 0.95],
      [-1.55, 1.0],
      [-2.05, 1.02],
      [-2.18, 0.98],
      [-2.2, 0.78],
      [-2.17, 0.42],
    ],
    cabin: [
      [0.68, 0.86],
      [-0.1, 1.3],
      [-0.95, 1.32],
      [-1.5, 0.98],
      [-1.4, 0.94],
      [0.55, 0.86],
    ],
    cabW: 1.48,
    roof: [
      [-0.07, 1.29],
      [-0.93, 1.31],
      [-0.95, 1.36],
      [-0.06, 1.34],
    ],
    hl: { x: 0.58, y: 0.6, w: 0.48 },
    tl: { x: 0.6, y: 0.86, w: 0.5 },
    plateF: 0.42,
    plateR: 0.62,
    doors: [0.62, -0.8],
    bX: -0.8,
    exhaust: [-0.6, 0.6],
    rearSeats: true,
    extra: "lip",
  },
  {
    name: "Hamza S81",
    type: "Spor sedan · arkadan itiş",
    plate: "81 HMZ 61",
    hp: 380,
    mass: 1650,
    drive: "rwd",
    tq: 500,
    redline: 7000,
    gears: [3.3, 2.15, 1.6, 1.25, 1.0, 0.82],
    rev: 3.2,
    final: 3.6,
    grip: 1.15,
    offroad: 0.72,
    steer: 0.58,
    freq: 1.7,
    restLen: 0.22,
    R: 0.34,
    track: 1.6,
    wb: 2.9,
    L: 4.85,
    W: 1.88,
    cgY: 0.5,
    drag: 0.52,
    down: 0.3,
    esp: 3,
    yb: 0.3,
    beltY: 0.97,
    roofY: 1.46,
    wsX: 0.76,
    tireW: 0.26,
    rim: "#55595f",
    spokes: 10,
    spokeW: 0.04,
    caliper: "#1f4fa3",
    upper: [
      [2.4, 0.4],
      [2.43, 0.58],
      [2.32, 0.72],
      [1.4, 0.86],
      [0.75, 0.92],
      [-0.6, 0.98],
      [-1.75, 1.0],
      [-1.85, 1.05],
      [-2.3, 1.06],
      [-2.42, 1.02],
      [-2.44, 0.8],
      [-2.4, 0.45],
    ],
    cabin: [
      [0.82, 0.9],
      [-0.05, 1.4],
      [-1.15, 1.42],
      [-1.8, 1.03],
      [-1.7, 0.98],
      [0.7, 0.9],
    ],
    cabW: 1.52,
    roof: [
      [-0.02, 1.39],
      [-1.13, 1.41],
      [-1.15, 1.46],
      [0, 1.44],
    ],
    hl: { x: 0.6, y: 0.64, w: 0.5 },
    tl: { x: 0.62, y: 0.9, w: 0.55 },
    plateF: 0.44,
    plateR: 0.66,
    doors: [0.75, -0.35, -1.45],
    bX: -0.35,
    exhaust: [-0.6, -0.48, 0.48, 0.6],
    rearSeats: true,
    extra: "lip",
  },
  {
    name: "Kaan Corsa",
    type: "Şehir hatchback · önden çekiş",
    plate: "41 KAN 41",
    hp: 130,
    mass: 1100,
    drive: "fwd",
    tq: 210,
    redline: 6500,
    gears: [3.6, 2.1, 1.4, 1.05, 0.85],
    rev: 3.5,
    final: 4.0,
    grip: 1.06,
    offroad: 0.78,
    steer: 0.64,
    freq: 1.6,
    restLen: 0.24,
    R: 0.31,
    track: 1.5,
    wb: 2.5,
    L: 3.95,
    W: 1.76,
    cgY: 0.52,
    drag: 0.55,
    down: 0,
    esp: 2.4,
    yb: 0.3,
    beltY: 1.0,
    roofY: 1.5,
    wsX: 0.86,
    tireW: 0.21,
    rim: "#c3c6ca",
    spokes: 8,
    spokeW: 0.05,
    caliper: "#3a3d42",
    upper: [
      [1.95, 0.4],
      [1.98, 0.6],
      [1.88, 0.75],
      [0.85, 0.92],
      [-0.4, 1.0],
      [-1.85, 1.04],
      [-1.98, 0.98],
      [-2.0, 0.46],
    ],
    cabin: [
      [0.9, 0.9],
      [0.05, 1.45],
      [-1.62, 1.47],
      [-1.92, 1.04],
      [-1.8, 1.0],
      [0.8, 0.9],
    ],
    cabW: 1.5,
    roof: [
      [0.08, 1.43],
      [-1.62, 1.45],
      [-1.64, 1.5],
      [0.1, 1.49],
    ],
    hl: { x: 0.56, y: 0.7, w: 0.42 },
    tl: { x: 0.64, y: 0.95, w: 0.3 },
    plateF: 0.45,
    plateR: 0.62,
    doors: [0.88, -0.1, -1.05],
    bX: -0.1,
    exhaust: [0.45],
    rearSeats: true,
    extra: "hatch",
  },
  {
    name: "Yusra Sport",
    type: "Üstü açık roadster · arkadan itiş",
    plate: "41 YSR 41",
    hp: 300,
    mass: 1150,
    drive: "rwd",
    tq: 380,
    redline: 7500,
    gears: [3.3, 2.2, 1.65, 1.3, 1.06, 0.86],
    rev: 3.2,
    final: 3.9,
    grip: 1.16,
    offroad: 0.7,
    steer: 0.6,
    freq: 1.85,
    restLen: 0.2,
    R: 0.32,
    track: 1.55,
    wb: 2.45,
    L: 4.1,
    W: 1.8,
    cgY: 0.44,
    drag: 0.48,
    down: 0.2,
    esp: 2.8,
    open: true,
    yb: 0.27,
    beltY: 0.88,
    roofY: 1.15,
    wsX: 0.38,
    tireW: 0.25,
    rim: "#d8dadd",
    spokes: 5,
    spokeW: 0.07,
    caliper: "#e0661a",
    upper: [
      [2.0, 0.36],
      [2.03, 0.53],
      [1.92, 0.66],
      [1.0, 0.8],
      [0.3, 0.86],
      [-0.9, 0.88],
      [-1.6, 0.9],
      [-1.95, 0.9],
      [-2.05, 0.86],
      [-2.07, 0.68],
      [-2.05, 0.42],
    ],
    cabin: [
      [0.42, 0.85],
      [-0.03, 1.15],
      [-0.09, 1.14],
      [0.33, 0.85],
    ],
    cabW: 1.45,
    roof: null,
    hl: { x: 0.58, y: 0.6, w: 0.44 },
    tl: { x: 0.6, y: 0.78, w: 0.4 },
    plateF: 0.42,
    plateR: 0.58,
    doors: [0.3, -0.75],
    bX: -0.8,
    exhaust: [-0.5, 0.5],
    rearSeats: false,
    extra: "roadster",
  },
  {
    name: "Ali 911",
    type: "Klasik kas arabası · arkadan itiş",
    plate: "34 ALI 34",
    hp: 450,
    mass: 1600,
    drive: "rwd",
    tq: 640,
    redline: 6200,
    gears: [2.9, 1.9, 1.4, 1.1, 0.9],
    rev: 3.0,
    final: 3.5,
    grip: 1.08,
    offroad: 0.7,
    steer: 0.55,
    freq: 1.5,
    restLen: 0.25,
    R: 0.34,
    track: 1.58,
    wb: 2.75,
    L: 4.75,
    W: 1.92,
    cgY: 0.52,
    drag: 0.6,
    down: 0.05,
    esp: 2.2,
    yb: 0.3,
    beltY: 0.92,
    roofY: 1.32,
    wsX: 0.68,
    tireW: 0.27,
    rim: "#e6e8ea",
    spokes: 5,
    spokeW: 0.08,
    caliper: "#2b2b2b",
    upper: [
      [2.35, 0.42],
      [2.38, 0.64],
      [2.3, 0.74],
      [0.85, 0.88],
      [-0.2, 0.92],
      [-1.1, 0.95],
      [-2.25, 0.98],
      [-2.38, 0.95],
      [-2.4, 0.7],
      [-2.37, 0.46],
    ],
    cabin: [
      [0.75, 0.86],
      [0.05, 1.26],
      [-0.65, 1.28],
      [-2.2, 0.97],
      [-2.0, 0.93],
      [0.62, 0.86],
    ],
    cabW: 1.5,
    roof: [
      [0.08, 1.25],
      [-0.63, 1.27],
      [-0.65, 1.32],
      [0.07, 1.3],
    ],
    hl: { x: 0.62, y: 0.6, w: 0.26, round: true },
    tl: { x: 0.52, y: 0.8, w: 0.66 },
    plateF: 0.32,
    plateR: 0.52,
    doors: [0.7, -0.95],
    bX: -0.9,
    exhaust: [-0.62, 0.62],
    rearSeats: true,
    extra: "muscle",
  },
  {
    name: "Atlas X5",
    type: "Aile SUV · 4 çeker",
    plate: "34 ATL 34",
    hp: 340,
    mass: 2050,
    drive: "awd",
    tq: 580,
    redline: 6200,
    gears: [3.8, 2.4, 1.6, 1.2, 1.0, 0.8],
    rev: 3.5,
    final: 3.9,
    grip: 1.08,
    offroad: 0.95,
    steer: 0.64,
    freq: 1.4,
    restLen: 0.34,
    R: 0.4,
    track: 1.7,
    wb: 2.85,
    L: 4.75,
    W: 1.98,
    cgY: 0.72,
    drag: 0.75,
    down: 0.1,
    esp: 2.6,
    yb: 0.5,
    beltY: 1.27,
    roofY: 1.86,
    wsX: 1.1,
    tireW: 0.3,
    rim: "#7d838a",
    spokes: 6,
    spokeW: 0.08,
    caliper: "#9aa0a6",
    upper: [
      [2.36, 0.62],
      [2.4, 0.85],
      [2.36, 1.08],
      [1.15, 1.22],
      [-0.5, 1.27],
      [-2.3, 1.3],
      [-2.42, 1.22],
      [-2.42, 0.62],
    ],
    cabin: [
      [1.15, 1.2],
      [0.3, 1.8],
      [-2.15, 1.82],
      [-2.33, 1.3],
      [1.0, 1.2],
    ],
    cabW: 1.74,
    roof: [
      [0.32, 1.78],
      [-2.15, 1.8],
      [-2.15, 1.86],
      [0.3, 1.85],
    ],
    hl: { x: 0.68, y: 0.95, w: 0.48 },
    tl: { x: 0.74, y: 1.05, w: 0.28 },
    plateF: 0.7,
    plateR: 0.8,
    doors: [1.1, 0, -1.18],
    bX: 0,
    exhaust: [-0.62, -0.48],
    rearSeats: true,
    extra: "rails",
  },
  {
    name: "Tuna XL",
    type: "Çift kabin pikap · 4 çeker",
    plate: "34 TUN 34",
    hp: 400,
    mass: 2300,
    drive: "awd",
    tq: 700,
    redline: 5800,
    gears: [4.0, 2.5, 1.65, 1.25, 1.0, 0.78],
    rev: 3.8,
    final: 3.7,
    grip: 1.06,
    offroad: 0.97,
    steer: 0.68,
    freq: 1.3,
    restLen: 0.38,
    R: 0.41,
    track: 1.72,
    wb: 3.2,
    L: 5.3,
    W: 1.98,
    cgY: 0.8,
    drag: 0.85,
    down: 0,
    esp: 2.6,
    yb: 0.58,
    beltY: 1.3,
    roofY: 1.98,
    wsX: 1.45,
    tireW: 0.3,
    rim: "#b9bdc2",
    spokes: 6,
    spokeW: 0.07,
    caliper: "#3a3d42",
    upper: [
      [2.6, 0.7],
      [2.65, 0.95],
      [2.62, 1.15],
      [1.5, 1.28],
      [0.95, 1.3],
      [-0.95, 1.32],
      [-1.0, 0.95],
      [-2.6, 0.95],
      [-2.65, 0.95],
      [-2.66, 0.7],
    ],
    cabin: [
      [1.5, 1.26],
      [0.75, 1.92],
      [-0.9, 1.94],
      [-0.98, 1.32],
      [1.3, 1.26],
    ],
    cabW: 1.78,
    roof: [
      [0.75, 1.9],
      [-0.9, 1.92],
      [-0.92, 1.98],
      [0.73, 1.97],
    ],
    hl: { x: 0.7, y: 1.0, w: 0.5 },
    tl: { x: 0.88, y: 0.85, w: 0.14 },
    plateF: 0.76,
    plateR: 0.78,
    doors: [1.4, 0.25, -0.95],
    bX: 0.25,
    exhaust: [0.7],
    rearSeats: true,
    extra: "pickup",
  },
  {
    name: "Ege 21R",
    type: "Ralli hatchback · 4 çeker",
    plate: "34 EGE 34",
    hp: 310,
    mass: 1240,
    drive: "awd",
    tq: 430,
    redline: 7000,
    gears: [3.0, 2.1, 1.6, 1.28, 1.05],
    rev: 3.1,
    final: 4.2,
    grip: 1.12,
    offroad: 0.93,
    steer: 0.62,
    freq: 1.55,
    restLen: 0.28,
    R: 0.33,
    track: 1.58,
    wb: 2.55,
    L: 4.1,
    W: 1.84,
    cgY: 0.55,
    drag: 0.55,
    down: 0.25,
    esp: 1.6,
    decal: "21",
    yb: 0.33,
    beltY: 1.04,
    roofY: 1.48,
    wsX: 0.8,
    tireW: 0.24,
    rim: "#f2f2f0",
    spokes: 6,
    spokeW: 0.07,
    caliper: "#f2b705",
    upper: [
      [2.05, 0.42],
      [2.07, 0.62],
      [1.95, 0.78],
      [0.8, 0.98],
      [-0.5, 1.04],
      [-1.95, 1.08],
      [-2.08, 1.0],
      [-2.1, 0.48],
    ],
    cabin: [
      [0.85, 0.96],
      [-0.05, 1.42],
      [-1.7, 1.44],
      [-2.02, 1.08],
      [-1.9, 1.03],
      [0.75, 0.96],
    ],
    cabW: 1.56,
    roof: [
      [0, 1.4],
      [-1.7, 1.42],
      [-1.72, 1.48],
      [0.02, 1.47],
    ],
    hl: { x: 0.6, y: 0.7, w: 0.46 },
    tl: { x: 0.62, y: 0.9, w: 0.4 },
    plateF: 0.45,
    plateR: 0.62,
    doors: [0.85, -0.15, -1.12],
    bX: -0.15,
    exhaust: [0.5],
    rearSeats: true,
    extra: "spoiler",
  },
  {
    name: "Murat 650s",
    type: "Ortadan motorlu süper spor · arkadan itiş",
    plate: "34 MRT 34",
    hp: 650,
    mass: 1420,
    drive: "rwd",
    tq: 680,
    redline: 8200,
    gears: [3.1, 2.2, 1.7, 1.38, 1.15, 0.97, 0.82],
    rev: 3.0,
    final: 3.4,
    grip: 1.3,
    offroad: 0.62,
    steer: 0.57,
    freq: 2.0,
    restLen: 0.18,
    R: 0.345,
    track: 1.68,
    wb: 2.67,
    L: 4.55,
    W: 2.0,
    cgY: 0.42,
    drag: 0.5,
    down: 1.1,
    esp: 3.2,
    yb: 0.24,
    beltY: 0.9,
    roofY: 1.21,
    wsX: 0.95,
    tireW: 0.3,
    rim: "#1d1f22",
    spokes: 10,
    spokeW: 0.035,
    caliper: "#f2b705",
    upper: [
      [2.22, 0.32],
      [2.26, 0.45],
      [2.12, 0.6],
      [1.2, 0.75],
      [0.9, 0.8],
      [-0.5, 0.92],
      [-1.6, 0.98],
      [-2.2, 1.0],
      [-2.3, 0.95],
      [-2.32, 0.6],
      [-2.28, 0.36],
    ],
    cabin: [
      [1.0, 0.78],
      [0.05, 1.17],
      [-0.65, 1.18],
      [-1.9, 0.98],
      [-1.6, 0.93],
      [0.85, 0.8],
    ],
    cabW: 1.5,
    roof: [
      [0.08, 1.16],
      [-0.63, 1.17],
      [-0.65, 1.21],
      [0.07, 1.2],
    ],
    hl: { x: 0.66, y: 0.5, w: 0.5 },
    tl: { x: 0.62, y: 0.82, w: 0.62 },
    plateF: 0.38,
    plateR: 0.55,
    doors: [0.95, -0.55],
    bX: -0.6,
    exhaust: [-0.12, 0.12],
    rearSeats: false,
    extra: "super",
  },
];
const PAINTS = [
  ["Yarış kırmızısı", "#b3121b"],
  ["İnci beyazı", "#e9e7e1"],
  ["Gece mavisi", "#1d3557"],
  ["Antrasit", "#3a3d41"],
  ["Sarı", "#f0b513"],
  ["Zümrüt", "#0f5e49"],
];

const CM = {
  black: new THREE.MeshStandardMaterial({ color: C("#111213"), roughness: 0.55, metalness: 0.2 }),
  trim: new THREE.MeshStandardMaterial({ color: C("#0c0c0d"), roughness: 0.8, metalness: 0 }),
  gap: new THREE.MeshBasicMaterial({ color: C("#050505") }),
  chrome: new THREE.MeshStandardMaterial({ color: C("#e1e3e6"), roughness: 0.12, metalness: 1 }),
  darkChrome: new THREE.MeshStandardMaterial({ color: C("#2a2d31"), roughness: 0.18, metalness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: C("#141c22"),
    metalness: 0.35,
    roughness: 0.03,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    clearcoat: 1,
  }),
  mirror: new THREE.MeshStandardMaterial({ color: C("#c9d2da"), roughness: 0, metalness: 1 }),
  interior: new THREE.MeshStandardMaterial({ color: C("#2a2b2e"), roughness: 0.85 }),
  seat: new THREE.MeshStandardMaterial({ color: C("#3b3632"), roughness: 0.9 }),
  grille: new THREE.MeshStandardMaterial({ map: honeyTex, roughness: 0.6, metalness: 0.3 }),
  tread: new THREE.MeshStandardMaterial({ map: treadTex, roughness: 0.95 }),
  sidewall: new THREE.MeshStandardMaterial({ map: sidewallTex, roughness: 0.9 }),
  rimInner: new THREE.MeshStandardMaterial({
    color: C("#3a3d42"),
    roughness: 0.4,
    metalness: 0.8,
    side: THREE.DoubleSide,
  }),
  rotor: new THREE.MeshStandardMaterial({ color: C("#6d6f72"), roughness: 0.35, metalness: 0.9 }),
  amber: new THREE.MeshStandardMaterial({
    color: C("#6b4206"),
    emissive: C("#ff9a1f"),
    emissiveIntensity: 0.25,
    roughness: 0.25,
  }),
  head: new THREE.MeshStandardMaterial({
    color: C("#e9eef7"),
    emissive: C("#f2f6ff"),
    emissiveIntensity: 0.2,
    roughness: 0.08,
    metalness: 0.4,
  }),
  drl: new THREE.MeshStandardMaterial({
    color: C("#ffffff"),
    emissive: C("#eef4ff"),
    emissiveIntensity: 2.2,
    roughness: 0.2,
  }),
  tail: new THREE.MeshStandardMaterial({
    color: C("#4a0707"),
    emissive: C("#ff160c"),
    emissiveIntensity: 0.12,
    roughness: 0.2,
    metalness: 0.2,
  }),
  brake: new THREE.MeshStandardMaterial({
    color: C("#5a0808"),
    emissive: C("#ff1408"),
    emissiveIntensity: 0.05,
    roughness: 0.2,
  }),
  rev: new THREE.MeshStandardMaterial({
    color: C("#d8d8d8"),
    emissive: C("#ffffff"),
    emissiveIntensity: 0.02,
    roughness: 0.2,
  }),
  // far ve stop lambası hâleleri (Sprite)
  haloHead: new THREE.SpriteMaterial({
    map: glowTex,
    color: C("#eef4ff"),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
  haloTail: new THREE.SpriteMaterial({
    map: glowTex,
    color: C("#ff2a1a"),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: C("#1a1a1c"), roughness: 0.92 }),
};
const carTexCache = {};
function plateTexFor(s) {
  if (carTexCache[s]) return carTexCache[s];
  const t = tex(
    cvs(256, 56, (g) => {
      g.fillStyle = "#f4f4f0";
      g.fillRect(0, 0, 256, 56);
      g.strokeStyle = "#111";
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, 253, 53);
      g.fillStyle = "#1d3fa0";
      g.fillRect(3, 3, 30, 50);
      g.fillStyle = "#fff";
      txt(g, "TR", 18, 42, 26, 15);
      g.fillStyle = "#111";
      txt(g, s, 146, 30, 205, 42);
    }),
  );
  carTexCache[s] = t;
  return t;
}
function decalTex(n) {
  const k = "d" + n;
  if (carTexCache[k]) return carTexCache[k];
  const t = tex(
    cvs(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.beginPath();
      g.arc(64, 64, 60, 0, Math.PI * 2);
      g.fillStyle = "#fff";
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = "#111";
      g.stroke();
      g.fillStyle = "#111";
      txt(g, n, 64, 68, 90, 70);
    }),
  );
  carTexCache[k] = t;
  return t;
}

function extrudeProfile(pts, width, bev) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const depth = Math.max(0.05, width - bev * 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev * 0.8,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-depth / 2, 0, 0);
  return g;
}
function bodyShapeGeo(sp) {
  const s = new THREE.Shape(),
    ra = sp.R + 0.065,
    yw = sp.R,
    yb = sp.yb,
    xr = -sp.wb / 2,
    xf = sp.wb / 2,
    del = Math.asin(clamp((yw - yb) / ra, -0.95, 0.95));
  const rearX = sp.upper[sp.upper.length - 1][0] + 0.06,
    frontX = sp.upper[0][0] - 0.07;
  s.moveTo(rearX, yb);
  s.lineTo(xr - ra * Math.cos(del), yb);
  s.absarc(xr, yw, ra, Math.PI + del, -del, true);
  s.lineTo(xf - ra * Math.cos(del), yb);
  s.absarc(xf, yw, ra, Math.PI + del, -del, true);
  s.lineTo(frontX, yb);
  for (const [x, y] of sp.upper) s.lineTo(x, y);
  s.closePath();
  const bev = 0.08,
    depth = sp.W - bev * 2;
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 16,
    steps: 1,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-depth / 2, 0, 0);
  return g;
}
function frontPoly(sp) {
  const u = sp.upper,
    pts = [[u[0][0] - 0.07, sp.yb]];
  for (const p of u) {
    if (p[0] < u[0][0] - 0.75) break;
    pts.push(p);
  }
  return pts;
}
function rearPoly(sp) {
  const u = sp.upper,
    l = u[u.length - 1],
    pts = [[l[0] + 0.06, sp.yb]];
  for (let i = u.length - 1; i >= 0; i--) {
    if (u[i][0] > l[0] + 0.75) break;
    pts.push(u[i]);
  }
  return pts;
}
function surfAt(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[i + 1];
    if ((y >= y1 && y <= y2) || (y <= y1 && y >= y2)) {
      const t = (y - y1) / (y2 - y1 || 1e-6);
      return { x: x1 + (x2 - x1) * t, tx: x2 - x1, ty: y2 - y1 };
    }
  }
  const l = pts[pts.length - 1];
  return { x: l[0], tx: 0, ty: 1 };
}
function spokeGeo(sp, side) {
  const R = sp.R,
    n = sp.spokes,
    r0 = R * 0.15,
    r1 = R * 0.66,
    gs = [],
    x = side * (sp.tireW / 2 - 0.035);
  for (let k = 0; k < n; k++) {
    const b = new THREE.BoxGeometry(0.035, r1 - r0, sp.spokeW);
    b.translate(x, (r0 + r1) / 2, 0);
    b.rotateX((k / n) * Math.PI * 2);
    gs.push(b);
  }
  gs.push(new THREE.CylinderGeometry(R * 0.18, R * 0.18, 0.05, 18).rotateZ(Math.PI / 2).translate(x, 0, 0));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    gs.push(
      new THREE.CylinderGeometry(0.013, 0.013, 0.03, 6)
        .rotateZ(Math.PI / 2)
        .translate(x + side * 0.03, Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12),
    );
  }
  return merge(gs);
}

function buildCarModel(sp, paintHex) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  body.position.y = -sp.cgY;
  const paint = new THREE.MeshPhysicalMaterial({
    color: C(paintHex),
    metalness: 0.42,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const add = (g, m, cast = true, parent = body) => {
    const me = new THREE.Mesh(g, m);
    me.castShadow = cast;
    me.receiveShadow = true;
    parent.add(me);
    return me;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const hw = sp.W / 2,
    ra = sp.R + 0.065,
    fp = frontPoly(sp),
    rp = rearPoly(sp);
  // gövde ve cam kabin (car-body.js)
  const shape = makeBodyShape(sp),
    cab = makeCabinShape(sp),
    sideX = (x, y) => bodyXAt(shape, x, y),
    // frontmost / rearmost profile x where the body is still at least X wide at height y
    noseAt = (X, y) => {
      for (let i = shape.xs.length - 1; i >= 0; i--)
        if (sideX(shape.xs[i], y) >= Math.abs(X)) return shape.xs[i];
      return shape.x1;
    },
    tailAt = (X, y) => {
      for (const x of shape.xs) if (sideX(x, y) >= Math.abs(X)) return x;
      return shape.x0;
    },
    roofAt = (x, X) => (sp.open ? sp.roofY : cabinYAt(cab, x, X));
  add(bodyGeo(shape), paint);
  const gl = add(cabinGlassGeo(cab), CM.glass, false);
  gl.renderOrder = 3;
  {
    const c = sp.cabin,
      deg = Math.PI / 180,
      top = 53 * deg;
    // A direkleri (ön cam kenarı), tavan, B direği ve C direkleri
    add(cabinBand(cab, c[1][0] - 0.02, c[0][0], 44 * deg, 58 * deg), CM.black, false);
    if (!sp.open) {
      const rx = polyRange(sp.roof || [c[1], c[2]]);
      add(cabinBand(cab, rx[0] - 0.02, rx[1] + 0.02, top, Math.PI / 2), paint, true);
      add(cabinBand(cab, sp.bX - 0.05, sp.bX + 0.05, 0, top), CM.black, false);
      add(cabinBand(cab, c[3][0], c[2][0] + 0.03, 36 * deg, 66 * deg), paint, false);
      add(cabinBand(cab, c[1][0] - 0.04, c[2][0] + 0.04, top - 6 * deg, top, 0.008), CM.black, false);
    }
  }
  // pillars
  const strut = (p1, p2, x, t, m) => {
    const a = new THREE.Vector3(x, p1[1], -p1[0]),
      b = new THREE.Vector3(x, p2[1], -p2[0]),
      d = b.clone().sub(a),
      l = d.length();
    const me = add(box(t, l, 0.07), m, false);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const ce = sp.cabW / 2 + 0.005;
  const slab = (p1, p2, x, wd, th, m) => {
    const a = new THREE.Vector3(x, p1[1], -p1[0]),
      b = new THREE.Vector3(x, p2[1], -p2[0]),
      d = b.clone().sub(a),
      l = d.length();
    const me = add(box(wd, l, th), m, false);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return me;
  };
  const HEAVY = ["rails", "offroad", "pickup"].includes(sp.extra);
  if (sp.open)
    add(box(sp.cabW + 0.02, 0.05, 0.06).translate(0, sp.cabin[1][1], -sp.cabin[1][0]), CM.black, false);
  // krom bel çıtası: cam kabinin alt kenarı boyunca, gövde yüzeyini izleyerek
  if (!sp.open) {
    const tg = [],
      xa = sp.cabin[3][0],
      xb = sp.cabin[0][0],
      n = 14,
      tx = (x) => Math.min(sp.cabW / 2 + 0.015, sideX(x, sp.beltY) + 0.004);
    for (const sx of [-1, 1])
      for (let k = 0; k < n; k++) {
        const x0 = lerp(xa, xb, k / n),
          x1 = lerp(xa, xb, (k + 1) / n),
          X0 = tx(x0),
          X1 = tx(x1),
          l = Math.hypot(x1 - x0, X1 - X0);
        tg.push(
          box(0.02, 0.02, l + 0.004)
            .rotateY(Math.atan2(X1 - X0, x1 - x0) * -sx)
            .translate((sx * (X0 + X1)) / 2, sp.beltY + 0.005, -(x0 + x1) / 2),
        );
      }
    add(merge(tg), CM.chrome, false);
  }
  // door gaps & handles
  const archTop = (X) => {
    for (const ax of [-sp.wb / 2, sp.wb / 2]) {
      const d = X - ax;
      if (Math.abs(d) < ra) return sp.R + Math.sqrt(ra * ra - d * d) + 0.03;
    }
    return sp.yb + 0.07;
  };
  const gapGeos = [];
  for (const sx of [-1, 1]) {
    for (const X of sp.doors) {
      const y0 = archTop(X),
        y1 = sp.beltY - 0.03,
        n = 8;
      for (let k = 0; k < n; k++) {
        const ya = lerp(y0, y1, k / n),
          yb2 = lerp(y0, y1, (k + 1) / n),
          xa = sideX(X, ya),
          xb = sideX(X, yb2),
          l = Math.hypot(xb - xa, yb2 - ya);
        const gq = box(0.006, l + 0.004, 0.012);
        gq.rotateZ(-Math.atan2(xb - xa, yb2 - ya) * sx);
        gq.translate(sx * ((xa + xb) / 2 + 0.002), (ya + yb2) / 2, -X);
        gapGeos.push(gq);
      }
    }
    for (let i = 0; i < sp.doors.length - 1; i++) {
      const X = sp.doors[i + 1] + 0.22,
        y = sp.beltY - 0.13;
      add(box(0.03, 0.035, 0.19).translate(sx * (sideX(X, y) + 0.01), y, -X), CM.chrome, false);
    }
    // side skirt
    const s0 = -sp.wb / 2 + ra + 0.02,
      s1 = sp.wb / 2 - ra - 0.02,
      sh = HEAVY ? 0.2 : 0.09;
    add(box(0.06, sh, s1 - s0).translate(sx * (hw - 0.01), sp.yb + sh / 2 - 0.01, -(s0 + s1) / 2), CM.trim);
    // mirrors
    const mg = new THREE.Group();
    mg.position.set(
      sx * (sideX(sp.cabin[0][0] - 0.2, sp.beltY) + 0.08),
      sp.beltY + 0.09,
      -(sp.cabin[0][0] - 0.2),
    );
    body.add(mg);
    add(box(0.17, 0.11, 0.14), paint, true, mg);
    add(new THREE.PlaneGeometry(0.13, 0.08).translate(0, 0, 0.072), CM.mirror, false, mg);
    add(box(0.09, 0.03, 0.05).translate(-sx * 0.1, -0.02, 0.02), CM.black, false, mg);
    add(box(0.025, 0.08, 0.11).translate(sx * 0.075, -0.02, -0.02), CM.amber, false, mg);
  }
  add(merge(gapGeos), CM.gap, false);
  // wheel arch liners, flares
  for (const ax of [-sp.wb / 2, sp.wb / 2]) {
    add(
      new THREE.CylinderGeometry(ra - 0.004, ra - 0.004, sp.W - 0.1, 22, 1, true, 0, Math.PI)
        .rotateZ(Math.PI / 2)
        .translate(0, sp.R, -ax),
      new THREE.MeshStandardMaterial({ color: C("#0a0a0a"), roughness: 1, side: THREE.DoubleSide }),
      false,
    );
    if (HEAVY)
      for (const sx of [-1, 1])
        add(
          new THREE.TorusGeometry(ra + 0.02, 0.05, 6, 18, Math.PI)
            .rotateY(Math.PI / 2)
            .translate(sx * (hw - 0.01), sp.R, -ax),
          CM.trim,
        );
  }
  add(box(sp.W - 0.2, 0.04, sp.L - 0.5).translate(0, sp.yb + 0.07, 0), CM.trim, false);
  // front: headlights, grille, intake, badge, plate
  const frontAt = (y) => {
    const s = surfAt(fp, y);
    return { z: -(s.x + 0.06), a: Math.atan2(-s.tx, s.ty) };
  };
  const rearAt = (y) => {
    const s = surfAt(rp, y);
    return { z: -(s.x - 0.06), a: -Math.atan2(s.tx, s.ty) };
  };
  const fpanel = (y, w, h, m, proud, d = 0.04) => {
    const f = frontAt(y),
      me = add(box(w, h, d), m, false);
    me.position.set(0, y, f.z + d / 2 - proud);
    me.rotation.x = f.a;
    return me;
  };
  const rpanel = (y, w, h, m, proud, d = 0.04) => {
    const f = rearAt(y),
      me = add(box(w, h, d), m, false);
    me.position.set(0, y, f.z - d / 2 + proud);
    me.rotation.x = f.a;
    return me;
  };
  const hf = frontAt(sp.hl.y),
    hlUnits = [];
  for (const sx of [-1, 1]) {
    const u = new THREE.Group();
    u.position.set(sx * sp.hl.x, sp.hl.y, -noseAt(sp.hl.x, sp.hl.y) + 0.05);
    u.rotation.x = hf.a;
    body.add(u);
    if (sp.hl.round) {
      const r = sp.hl.w / 2;
      add(new THREE.CylinderGeometry(r, r, 0.1, 28).rotateX(Math.PI / 2), CM.chrome, false, u);
      add(
        new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.02, 28).rotateX(Math.PI / 2).translate(0, 0, -0.05),
        CM.head,
        false,
        u,
      );
      add(new THREE.TorusGeometry(r * 0.88, 0.012, 6, 28).translate(0, 0, -0.055), CM.drl, false, u);
      add(
        new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14)
          .rotateX(Math.PI / 2)
          .translate(sx * (r + 0.09), -r * 0.4, -0.02),
        CM.amber,
        false,
        u,
      );
    } else {
      add(box(sp.hl.w, 0.15, 0.12), CM.darkChrome, false, u);
      for (const k of [-1, 1])
        add(
          new THREE.CylinderGeometry(0.045, 0.05, 0.03, 18)
            .rotateX(Math.PI / 2)
            .translate(k * sp.hl.w * 0.2, 0.012, -0.065),
          CM.head,
          false,
          u,
        );
      add(box(sp.hl.w * 0.92, 0.022, 0.012).translate(0, -0.055, -0.064), CM.drl, false, u);
      add(box(0.07, 0.06, 0.012).translate(sx * (sp.hl.w / 2 - 0.05), 0.03, -0.064), CM.amber, false, u);
    }
    hlUnits.push(u);
    const hs = new THREE.Sprite(CM.haloHead);
    hs.position.set(0, 0, -0.14);
    hs.scale.set(1.4, 1.4, 1);
    u.add(hs);
  }
  const gy = (sp.hl.y + sp.plateF) / 2 + 0.02;
  fpanel(gy, sp.W * 0.42, Math.max(0.12, sp.hl.y - sp.plateF - 0.1), CM.grille, 0.012);
  if (sp.plateF - 0.14 > sp.yb + 0.05) fpanel(sp.plateF - 0.15, sp.W * 0.62, 0.09, CM.grille, 0.01);
  {
    const f = frontAt(gy + 0.1);
    const b = add(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20).rotateX(Math.PI / 2), CM.chrome, false);
    b.position.set(0, Math.min(gy + 0.1, sp.hl.y), f.z - 0.01);
    b.rotation.x = f.a;
  }
  {
    const f = frontAt(sp.plateF);
    const g = new THREE.Group();
    g.position.set(0, sp.plateF, f.z - 0.015);
    g.rotation.x = f.a;
    body.add(g);
    add(box(0.56, 0.13, 0.02), CM.black, false, g);
    add(
      new THREE.PlaneGeometry(0.52, 0.115).rotateY(Math.PI).translate(0, 0, -0.012),
      new THREE.MeshStandardMaterial({ map: plateTexFor(sp.plate), roughness: 0.5 }),
      false,
      g,
    );
  }
  add(
    box(sp.W * 0.8, 0.025, 0.12).translate(0, sp.yb + 0.02, frontAt(sp.yb + 0.05).z + 0.02),
    CM.trim,
    false,
  );
  // wipers
  for (const k of [-1, 1]) {
    const w = add(box(0.48, 0.012, 0.02), CM.black, false);
    w.position.set(k * 0.26 - 0.08, sp.cabin[0][1] + 0.03, -(sp.cabin[0][0] - 0.1));
    w.rotation.z = k * 0.05;
  }
  // rear: tail lamps, brake bars, reverse, third brake light, plate, exhaust
  const tr = rearAt(sp.tl.y);
  const tailUnit = (x, y, z, a, w, h, sx) => {
    const u = new THREE.Group();
    u.position.set(x, y, z);
    u.rotation.x = a;
    body.add(u);
    add(box(w, h, 0.07), CM.tail, false, u);
    const ts = new THREE.Sprite(CM.haloTail);
    ts.position.set(0, 0, 0.12);
    ts.scale.set(0.8, 0.8, 1);
    u.add(ts);
    if (h > w) {
      add(box(w * 0.7, h * 0.35, 0.01).translate(0, h * 0.22, 0.038), CM.brake, false, u);
      add(box(w * 0.7, h * 0.18, 0.01).translate(0, -h * 0.18, 0.038), CM.rev, false, u);
      add(box(w * 0.7, h * 0.12, 0.01).translate(0, -h * 0.38, 0.038), CM.amber, false, u);
    } else {
      add(box(w * 0.82, 0.03, 0.01).translate(0, 0.025, 0.038), CM.brake, false, u);
      add(
        box(Math.min(0.11, w * 0.3), 0.045, 0.01).translate(-sx * (w / 2 - 0.08), -0.035, 0.038),
        CM.rev,
        false,
        u,
      );
      add(box(0.06, 0.045, 0.01).translate(sx * (w / 2 - 0.05), -0.035, 0.038), CM.amber, false, u);
    }
  };
  for (const sx of [-1, 1])
    if (sp.extra !== "pickup")
      tailUnit(sx * sp.tl.x, sp.tl.y, -tailAt(sp.tl.x, sp.tl.y) - 0.03, tr.a, sp.tl.w, 0.13, sx);
  if (!sp.open) {
    const p = sp.cabin[2];
    add(box(0.42, 0.03, 0.035).translate(0, p[1] - 0.035, -(p[0] - 0.03)), CM.brake, false);
  }
  {
    const f = rearAt(sp.plateR);
    const g = new THREE.Group();
    g.position.set(0, sp.plateR, f.z + 0.015);
    g.rotation.x = f.a;
    body.add(g);
    add(box(0.56, 0.13, 0.02), CM.black, false, g);
    add(
      new THREE.PlaneGeometry(0.52, 0.115).translate(0, 0, 0.012),
      new THREE.MeshStandardMaterial({ map: plateTexFor(sp.plate), roughness: 0.5 }),
      false,
      g,
    );
  }
  rpanel(sp.tl.y - 0.1, 0.09, 0.09, CM.chrome, 0.01, 0.02);
  rpanel(sp.yb + 0.07, sp.W * 0.62, 0.1, CM.trim, 0.02);
  {
    const ez = rearAt(sp.yb + 0.1).z;
    for (const ex of sp.exhaust) {
      add(
        new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16, 1, true)
          .rotateX(Math.PI / 2)
          .translate(ex, sp.yb + 0.08, ez - 0.03),
        CM.chrome,
        false,
      );
      add(new THREE.CircleGeometry(0.04, 14).translate(ex, sp.yb + 0.08, ez - 0.07), CM.black, false);
    }
  }
  // interior
  const wsz = -(sp.wsX - 0.32);
  add(box(sp.cabW - 0.12, 0.16, 0.45).translate(0, sp.beltY + 0.0, wsz), CM.interior, false);
  const swPiv = new THREE.Group();
  swPiv.position.set(-0.37, sp.beltY + 0.1, wsz + 0.36);
  swPiv.rotation.x = -0.35;
  body.add(swPiv);
  const sw = new THREE.Group();
  swPiv.add(sw);
  add(new THREE.TorusGeometry(0.17, 0.024, 8, 22), CM.black, false, sw);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14).rotateX(Math.PI / 2), CM.black, false, sw);
  add(box(0.3, 0.03, 0.02), CM.black, false, sw);
  add(box(0.03, 0.15, 0.02).translate(0, -0.08, 0), CM.black, false, sw);
  add(box(0.03, 0.03, 0.012).translate(0, 0.165, 0.012), CM.amber, false, sw);
  // koltuklar: sırt ve başlık tavanın altında kalacak kadar
  const seatZ = -(sp.wsX - 1.02),
    seat = (cx, z, w, rear) => {
      const base = sp.yb + (rear ? 0.38 : 0.36),
        head = Math.min(sp.yb + 1.18, roofAt(-(z + 0.35), cx || 0.37) - 0.07),
        backTop = Math.min(sp.yb + 1.03, head - (rear ? 0.02 : 0.16)),
        bh = Math.max(0.2, backTop - base - 0.06);
      add(box(w, 0.12, 0.5).translate(cx, base, z), CM.seat, false);
      const bk = add(box(w, bh, 0.12), CM.seat, false);
      bk.position.set(cx, base + 0.06 + bh / 2, z + 0.3);
      bk.rotation.x = rear ? -0.15 : -0.18;
      if (!rear && head - backTop > 0.08)
        add(
          box(0.26, Math.min(0.16, head - backTop - 0.02), 0.1).translate(
            cx,
            (head + backTop) / 2 + 0.01,
            z + 0.37,
          ),
          CM.seat,
          false,
        );
    };
  for (const sx of [-0.37, 0.37]) seat(sx, seatZ, 0.48, false);
  if (sp.rearSeats) seat(0, seatZ + 0.95, sp.cabW - 0.2, true);
  // extras
  const X = sp.extra,
    ezR = rearAt(sp.yb + 0.12).z;
  const yAtX = (X0) => {
    const u = sp.upper;
    for (let i = 0; i < u.length - 1; i++) {
      const [x1, y1] = u[i],
        [x2, y2] = u[i + 1];
      if (X0 <= x1 && X0 >= x2) {
        const t = (X0 - x1) / (x2 - x1 || 1e-6);
        return y1 + (y2 - y1) * t;
      }
    }
    return sp.beltY;
  };
  if (X === "gt" || X === "lip") {
    const rx = sp.upper[sp.upper.length - 4][0];
    add(
      box(sp.W * 0.62, 0.035, 0.12).translate(0, yAtX(rx) + 0.03, -(rx + 0.04)),
      X === "gt" ? paint : CM.black,
    );
  }
  if (X === "hatch") {
    const p = sp.cabin[2];
    add(box(sp.cabW * 0.85, 0.035, 0.22).translate(0, p[1] + 0.02, -(p[0] + 0.05)), paint);
  }
  if (X === "spoiler") {
    add(box(1.42, 0.05, 0.38).translate(0, 1.47, 1.86), paint);
    add(
      box(0.34, 0.004, 2.7).translate(0, 1.0, -0.75),
      new THREE.MeshStandardMaterial({ color: C("#ece9e2"), roughness: 0.4 }),
      false,
    );
    const dm = new THREE.MeshStandardMaterial({
      map: decalTex(sp.decal || "27"),
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const dX = -(sp.doors[0] + sp.doors[1]) / 2,
      dY = (sp.yb + sp.beltY) / 2 + 0.06;
    const dx2 = sideX(-dX, dY) + 0.006;
    add(new THREE.PlaneGeometry(0.5, 0.5).rotateY(Math.PI / 2).translate(dx2, dY, dX), dm, false);
    add(new THREE.PlaneGeometry(0.5, 0.5).rotateY(-Math.PI / 2).translate(-dx2, dY, dX), dm, false);
    for (const sx of [-1, 1])
      add(
        box(sp.tireW, 0.24, 0.012).translate((sx * sp.track) / 2, sp.R * 0.45, sp.wb / 2 + sp.R + 0.12),
        CM.trim,
        false,
      );
    add(box(0.05, 0.07, 0.18).translate(0, roofAt(-1.25, 0) + 0.03, 1.25), CM.black, false);
  }
  if (X === "rails") {
    const ry = roofAt(-0.9, 0.72);
    for (const sx of [-0.72, 0.72]) add(box(0.06, 0.07, 2.3).translate(sx, ry + 0.035, 0.9), CM.black);
    for (const z of [0.2, 1.5]) add(box(1.44, 0.04, 0.05).translate(0, ry + 0.08, z), CM.black);
    add(
      box(sp.W * 0.62, 0.05, 0.3).translate(0, sp.yb + 0.02, frontAt(sp.yb + 0.08).z + 0.12),
      new THREE.MeshStandardMaterial({ color: C("#b8bcc0"), metalness: 0.8, roughness: 0.35 }),
      false,
    );
    add(box(0.05, 0.07, 0.18).translate(0, roofAt(-1.6, 0) + 0.03, 1.6), CM.black, false);
  }
  if (X === "offroad") {
    // spare wheel on the tailgate
    const sw = new THREE.Mesh(
      new THREE.CylinderGeometry(sp.R * 0.92, sp.R * 0.92, 0.26, 30).rotateX(Math.PI / 2),
      [CM.tread, CM.sidewall, CM.sidewall],
    );
    sw.position.set(0, 1.05, rearAt(1.05).z + 0.14);
    sw.castShadow = true;
    body.add(sw);
    add(
      new THREE.CylinderGeometry(sp.R * 0.55, sp.R * 0.55, 0.27, 20)
        .rotateX(Math.PI / 2)
        .translate(0, 1.05, rearAt(1.05).z + 0.14),
      new THREE.MeshStandardMaterial({ color: C(sp.rim), metalness: 0.8, roughness: 0.3 }),
      false,
    );
    // bull bar
    const bz = frontAt(0.8).z - 0.2,
      bar = new THREE.MeshStandardMaterial({ color: C("#1a1b1d"), metalness: 0.6, roughness: 0.4 });
    for (const x of [-0.42, 0.42])
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10).translate(x, 0.86, bz), bar);
    add(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 10).rotateZ(Math.PI / 2).translate(0, 1.16, bz), bar);
    add(
      new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10).rotateZ(Math.PI / 2).translate(0, 0.62, bz + 0.04),
      bar,
    );
    // snorkel
    const snX = sideX(sp.cabin[0][0] - 0.06, sp.beltY - 0.2) + 0.05;
    add(box(0.09, 0.95, 0.09).translate(snX, sp.beltY + 0.25, -(sp.cabin[0][0] - 0.06)), CM.trim);
    add(box(0.12, 0.1, 0.18).translate(snX, sp.roofY - 0.15, -(sp.cabin[0][0] - 0.1)), CM.trim);
    // roof basket
    const by = roofAt(-0.8, 0.6) + 0.06;
    for (const sx of [-0.78, 0.78]) add(box(0.04, 0.08, 2.2).translate(sx, by, 0.8), bar);
    for (const z of [-0.25, 0.4, 1.1, 1.85]) add(box(1.6, 0.04, 0.04).translate(0, by + 0.02, z), bar);
    for (const z of [-0.25, 1.85]) add(box(1.6, 0.12, 0.04).translate(0, by + 0.08, z), bar);
  }
  if (X === "pickup") {
    const bx0 = -1.0,
      bx1 = -2.62,
      len = bx0 - bx1,
      cz = -(bx0 + bx1) / 2,
      top = sp.beltY + 0.02,
      fl = 0.95;
    for (const sx of [-1, 1])
      add(box(0.07, top - fl + 0.04, len + 0.06).translate(sx * (hw - 0.035), (top + fl) / 2, cz), paint);
    add(box(sp.W - 0.02, top - fl, 0.07).translate(0, (top + fl) / 2, ezR - 0.035), paint);
    add(box(0.5, 0.06, 0.02).translate(0, top - 0.12, ezR + 0.002), CM.chrome, false);
    add(box(sp.W - 0.16, 0.02, len - 0.06).translate(0, fl + 0.012, cz), CM.trim, false);
    for (const sx of [-0.82, 0.82])
      add(box(0.06, 0.5, 0.06).translate(sx, top + 0.25, -(bx0 - 0.2)), CM.black);
    add(box(1.7, 0.06, 0.06).translate(0, top + 0.5, -(bx0 - 0.2)), CM.black);
    for (const sx of [-1, 1]) tailUnit(sx * (hw - 0.07), top - 0.22, ezR - 0.035, 0, 0.13, 0.32, sx);
    add(
      box(sp.W * 0.5, 0.32, 0.04).translate(0, sp.hl.y - 0.08, frontAt(sp.hl.y - 0.08).z - 0.01),
      CM.chrome,
      false,
    );
  }
  if (X === "roadster") {
    const seatZ = -(sp.wsX - 1.02) + 0.55;
    for (const sx of [-0.37, 0.37])
      add(
        new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI).translate(sx, sp.beltY + 0.03, seatZ),
        CM.chrome,
      );
    add(box(sp.cabW, 0.04, 0.5).translate(0, sp.beltY - 0.01, seatZ + 0.35), CM.interior, false);
  }
  if (X === "muscle") {
    add(box(0.55, 0.09, 0.65).translate(0, yAtX(1.4) + 0.04, -1.4), paint);
    add(box(0.42, 0.06, 0.02).translate(0, yAtX(1.1) + 0.06, -1.08), CM.black, false);
    const sm = new THREE.MeshStandardMaterial({
      color: C("#f2f0ea"),
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    for (const x of [-0.17, 0.17]) {
      slab([2.28, yAtX(2.28) + 0.008], [0.86, yAtX(0.86) + 0.008], x, 0.2, 0.008, sm);
      slab([0.07, 1.32], [-0.64, 1.335], x, 0.2, 0.008, sm);
    }
    fpanel(sp.plateF + 0.13, sp.W * 0.84, 0.07, CM.chrome, 0.06, 0.07);
    rpanel(sp.plateR + 0.14, sp.W * 0.84, 0.07, CM.chrome, 0.06, 0.07);
    add(box(sp.W * 0.8, 0.05, 0.1).translate(0, 1.0, 2.33), paint);
  }
  if (X === "super") {
    add(box(1.75, 0.04, 0.38).translate(0, sp.roofY + 0.1, 2.0), CM.black);
    for (const sx of [-0.5, 0.5]) add(box(0.05, 0.26, 0.14).translate(sx, sp.roofY - 0.03, 2.0), CM.black);
    for (const sx of [-1, 1]) {
      add(box(0.03, 0.26, 0.55).translate(sx * (hw + 0.004), 0.72, 0.85), CM.grille, false);
    }
    for (let k = 0; k < 5; k++) add(box(1.2, 0.02, 0.05).translate(0, 1.0, 1.95 + k * 0.07), CM.black, false);
    for (let k = -2; k <= 2; k++)
      add(box(0.02, 0.12, 0.3).translate(k * 0.32, sp.yb + 0.04, ezR - 0.15), CM.black, false);
    add(
      box(sp.W * 0.92, 0.025, 0.22).translate(0, sp.yb - 0.01, frontAt(sp.yb + 0.02).z + 0.08),
      CM.black,
      false,
    );
  }
  // wheels
  const rimM = new THREE.MeshStandardMaterial({ color: C(sp.rim), roughness: 0.22, metalness: 1 });
  const calM = new THREE.MeshStandardMaterial({ color: C(sp.caliper), roughness: 0.4, metalness: 0.3 });
  const sg = { "-1": spokeGeo(sp, -1), 1: spokeGeo(sp, 1) };
  const wheels = [];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1,
      R = sp.R,
      tw = sp.tireW;
    const piv = new THREE.Group(),
      spin = new THREE.Group();
    piv.add(spin);
    root.add(piv);
    // lastik: sırtı biraz dar, iki yanda yuvarlak omuz (gerçek lastik kesiti gibi)
    const sh = Math.min(0.045, tw * 0.18);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, tw - sh * 1.2, 44, 1).rotateZ(Math.PI / 2), [
      CM.tread,
      CM.sidewall,
      CM.sidewall,
    ]);
    tire.castShadow = true;
    spin.add(tire);
    for (const e of [-1, 1]) {
      const sho = new THREE.Mesh(new THREE.TorusGeometry(R - sh, sh, 8, 44).rotateY(Math.PI / 2), CM.rubber);
      sho.position.x = e * (tw / 2 - sh);
      spin.add(sho);
    }
    spin.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.66, R * 0.66, tw * 0.86, 28, 1, true).rotateZ(Math.PI / 2),
        CM.rimInner,
      ),
    );
    const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.66, 0.016, 6, 32).rotateY(Math.PI / 2), rimM);
    lip.position.x = side * (tw / 2 - 0.01);
    spin.add(lip);
    spin.add(new THREE.Mesh(sg[side], rimM));
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.08, R * 0.08, 0.02, 16).rotateZ(Math.PI / 2),
      CM.chrome,
    );
    cap.position.x = side * (tw / 2 - 0.0);
    spin.add(cap);
    const rot = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.56, R * 0.56, 0.026, 26).rotateZ(Math.PI / 2),
      CM.rotor,
    );
    rot.position.x = side * 0.01;
    spin.add(rot);
    const cal = new THREE.Mesh(box(0.07, R * 0.38, R * 0.22), calM);
    cal.position.set(side * 0.055, R * 0.3, R * 0.3);
    cal.rotation.x = -0.75;
    piv.add(cal);
    wheels.push({ piv, spin });
  }
  // real lights
  const spots = [];
  for (const sx of [-1, 1]) {
    const s = new THREE.SpotLight(0xfff2dc, 0, 80, 0.5, 0.6, 1.2);
    s.position.set(sx * sp.hl.x, sp.hl.y - sp.cgY, hf.z - 0.1);
    const t = new THREE.Object3D();
    t.position.set(sx * sp.hl.x * 1.6, -1.6, -26);
    root.add(s, t);
    s.target = t;
    spots.push(s);
  }
  const glow = new THREE.PointLight(0xff1a0a, 0, 7, 2);
  glow.position.set(0, sp.tl.y - sp.cgY, tr.z + 0.6);
  root.add(glow);
  return { root, wheels, paint, spots, glow, sw, shadow: makeContactShadow(sp) };
}
