/* Fizik: kırılan tabelalar ve araç fiziği (süspansiyon, lastik, çarpışma). */
"use strict";

const FUEL = [],
  STATIONS = [];
/* ---------- breakable signs ---------- */
const BREAKS = [],
  DEBRIS = [];
function collapse(mesh, v0, n) {
  const a = mesh.geometry.attributes.position;
  for (let k = 0; k < n; k++) a.setXYZ(v0 + k, 0, -900, 0);
  a.needsUpdate = true;
}
function breakIt(b, vx, vz, speed) {
  if (!b || b.broken) return;
  b.broken = true;
  b.o.broken = true;
  if (b.halo != null && W.lampHalos) {
    W.lampHalos.geometry.attributes.position.setY(b.halo, -900);
    W.lampHalos.geometry.attributes.position.needsUpdate = true;
  }
  const grp = new THREE.Group(),
    [bx, by, bz] = b.base;
  grp.position.set(bx, by, bz);
  scene.add(grp);
  for (const pt of b.parts) {
    const L = pt.list,
      g = L[pt.idx];
    if (!L.mesh) continue;
    const dg = g.clone();
    dg.translate(-bx, -by, -bz);
    const m = new THREE.Mesh(dg, L.mesh.material);
    m.castShadow = true;
    grp.add(m);
    collapse(L.mesh, L.offs[pt.idx], g.attributes.position.count);
  }
  for (const q of b.qparts) {
    const qb = q.qb;
    if (!qb.mesh) continue;
    if (!q.noDebris) {
      const pos = [],
        nor = [],
        uv = [],
        ind = [];
      for (let k = 0; k < q.n; k++) {
        const i = q.v0 + k;
        pos.push(qb.p[i * 3] - bx, qb.p[i * 3 + 1] - by, qb.p[i * 3 + 2] - bz);
        nor.push(qb.n[i * 3], qb.n[i * 3 + 1], qb.n[i * 3 + 2]);
        uv.push(qb.u[i * 2], qb.u[i * 2 + 1]);
      }
      for (let k = 0; k < q.n; k += 4) ind.push(k, k + 1, k + 2, k, k + 2, k + 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(ind);
      const m = new THREE.Mesh(g, qb.mesh.material);
      m.castShadow = true;
      grp.add(m);
    }
    collapse(qb.mesh, q.v0, q.n);
  }
  const l = Math.hypot(vx, vz) || 1,
    dx = vx / l,
    dz = vz / l;
  DEBRIS.push({
    grp,
    axis: new THREE.Vector3(dz, 0, -dx),
    ang: 0,
    av: 1.2 + speed * 0.12,
    sx: dx * speed * 0.55,
    sz: dz * speed * 0.55,
    t: 0,
  });
  metalHit(speed);
}
function updateDebris(dt) {
  for (let i = DEBRIS.length - 1; i >= 0; i--) {
    const d = DEBRIS[i];
    d.t += dt;
    if (d.ang < 1.5) {
      d.av += 7 * dt;
      d.ang = Math.min(1.5, d.ang + d.av * dt);
    }
    d.grp.quaternion.setFromAxisAngle(d.axis, d.ang);
    d.grp.position.x += d.sx * dt;
    d.grp.position.z += d.sz * dt;
    const k = Math.exp(-3 * dt);
    d.sx *= k;
    d.sz *= k;
    if (d.t > 9) d.grp.position.y -= dt * 0.6;
    if (d.t > 12) {
      scene.remove(d.grp);
      d.grp.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      DEBRIS.splice(i, 1);
    }
  }
}

/* ---------- physics ---------- */
const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _c = new THREE.Vector3(),
  _d = new THREE.Vector3(),
  _e = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _qi = new THREE.Quaternion();
const fwd = new THREE.Vector3(),
  up = new THREE.Vector3(),
  right = new THREE.Vector3(),
  Fsum = new THREE.Vector3(),
  Tsum = new THREE.Vector3();
const mount = new THREE.Vector3(),
  contact = new THREE.Vector3(),
  rr = new THREE.Vector3(),
  vp = new THREE.Vector3(),
  wf = new THREE.Vector3(),
  wr = new THREE.Vector3(),
  ftire = new THREE.Vector3(),
  r2 = new THREE.Vector3();
const obsList = [];
class Car {
  constructor(sp) {
    this.sp = sp;
    const m = (this.m = sp.mass),
      h = 1.2;
    this.I = new THREE.Vector3(
      (m / 12) * (h * h + sp.L * sp.L) * 0.85,
      (m / 12) * (sp.W * sp.W + sp.L * sp.L) * 0.78,
      (m / 12) * (sp.W * sp.W + h * h) * 1.1,
    );
    this.k = (m / 4) * Math.pow(2 * Math.PI * sp.freq, 2);
    this.c = 2 * 0.45 * Math.sqrt((this.k * m) / 4);
    this.sag = (m * 9.81) / 4 / this.k;
    this.maxLen = sp.restLen + sp.R;
    const my = sp.R - sp.cgY + sp.restLen - this.sag;
    this.wheels = [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ].map(([sx, f]) => ({
      pos: new THREE.Vector3((sx * sp.track) / 2, my, (-f * sp.wb) / 2),
      front: f > 0,
      t: this.maxLen,
      contact: false,
      spin: 0,
      vl: 0,
      slip: 0,
    }));
    const hx = sp.W / 2 - 0.04,
      hz = sp.L / 2 - 0.04,
      yb = sp.yb - sp.cgY + 0.04,
      yt = sp.roofY - sp.cgY - 0.02,
      ym = sp.beltY - sp.cgY - 0.25;
    this.gPts = [];
    for (const x of [-hx, hx])
      for (const z of [-hz, hz]) for (const y of [yb, yt]) this.gPts.push(new THREE.Vector3(x, y, z));
    this.gPts.push(new THREE.Vector3(0, yt, 0), new THREE.Vector3(-hx, yt, 0), new THREE.Vector3(hx, yt, 0));
    this.sPts = [];
    for (const z of [-hz, -hz / 2, 0, hz / 2, hz])
      for (const x of [-hx, hx]) this.sPts.push(new THREE.Vector3(x, ym, z));
    for (const x of [-hx / 2, 0, hx / 2])
      for (const z of [-hz, hz]) this.sPts.push(new THREE.Vector3(x, ym, z));
    this.hx = hx;
    this.hz = hz;
    this.p = new THREE.Vector3();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.w = new THREE.Vector3();
    this.gear = 1;
    this.rpm = 900;
    this.shiftT = 0;
    this.steer = 0;
    this.driven = 0;
    this.airborne = false;
    this.impact = 0;
    this.skid = 0;
    this.flipT = 0;
    this.braking = false;
    this.brakeSlip = 0;
    this.latSlip = 0;
  }
  reset(x, z, yaw, y) {
    ground(x, z, G, y);
    this.p.set(x, G.h + this.sp.cgY + 0.35, z);
    this.q.setFromAxisAngle(_a.set(0, 1, 0), yaw);
    this.v.set(0, 0, 0);
    this.w.set(0, 0, 0);
    this.gear = 1;
    this.flipT = 0;
  }
  invI(vec, out) {
    _qi.copy(this.q).invert();
    out.copy(vec).applyQuaternion(_qi);
    out.x /= this.I.x;
    out.y /= this.I.y;
    out.z /= this.I.z;
    return out.applyQuaternion(this.q);
  }
  impulse(J, r) {
    this.v.addScaledVector(J, 1 / this.m);
    _e.crossVectors(r, J);
    this.invI(_e, _e);
    this.w.add(_e);
  }
  resolve(point, n, depth, e, mu, vb) {
    const r = _a.copy(point).sub(this.p);
    this.p.addScaledVector(n, Math.min(depth, 0.5) * 0.5);
    vp.crossVectors(this.w, r).add(this.v);
    if (vb) vp.sub(vb);
    const vn = vp.dot(n);
    if (vn >= 0) return 0;
    _b.crossVectors(r, n);
    this.invI(_b, _b);
    _c.crossVectors(_b, r);
    const kN = 1 / this.m + n.dot(_c);
    const jn = (-(1 + e) * vn) / kN;
    _d.copy(n).multiplyScalar(jn);
    this.impulse(_d, r);
    vp.crossVectors(this.w, r).add(this.v);
    if (vb) vp.sub(vb);
    _d.copy(vp).addScaledVector(n, -vp.dot(n));
    const vt = _d.length();
    if (vt > 1e-4) {
      _d.multiplyScalar(1 / vt);
      _b.crossVectors(r, _d);
      this.invI(_b, _b);
      _c.crossVectors(_b, r);
      const kT = 1 / this.m + _d.dot(_c);
      const jt = Math.min(vt / kT, mu * jn);
      this.impulse(_d.multiplyScalar(-jt), r);
    }
    return -vn;
  }
  step(dt, inp) {
    const sp = this.sp,
      m = this.m,
      p = this.p,
      q = this.q,
      v = this.v,
      w = this.w;
    fwd.set(0, 0, -1).applyQuaternion(q);
    up.set(0, 1, 0).applyQuaternion(q);
    right.set(1, 0, 0).applyQuaternion(q);
    const vLong = v.dot(fwd),
      speed = v.length();
    let thr = inp.throttle,
      brk = inp.brake;
    if (this.gear > 0 && brk > 0.1 && thr < 0.1 && vLong < 0.6) this.gear = -1;
    else if (this.gear < 0 && thr > 0.1 && vLong > -0.6) this.gear = 1;
    if (this.gear < 0) {
      const t = thr;
      thr = brk;
      brk = t;
    }
    this.braking = brk > 0.05;
    const ratio = this.gear < 0 ? sp.rev : sp.gears[this.gear - 1],
      gr = ratio * sp.final;
    const wheelRpm = (Math.abs(this.driven) / sp.R) * gr * 9.549;
    let rpm = Math.max(900, wheelRpm);
    if (this.gear <= 1) rpm = Math.max(rpm, 900 + thr * 3400 * clamp(1 - Math.abs(vLong) / 9, 0, 1));
    if (this.airborne) rpm = Math.max(rpm, 900 + thr * (sp.redline - 900));
    this.rpm = lerp(this.rpm, Math.min(rpm, sp.redline + 120), 1 - Math.exp(-dt * 14));
    this.shiftT -= dt;
    if (this.gear > 0 && this.shiftT <= 0 && !this.airborne) {
      if (wheelRpm > sp.redline * 0.93 && this.gear < sp.gears.length) {
        this.gear++;
        this.shiftT = 0.25;
      } else if (this.gear > 1) {
        const lr = (Math.abs(this.driven) / sp.R) * sp.gears[this.gear - 2] * sp.final * 9.549;
        if (lr < sp.redline * 0.55) {
          this.gear--;
          this.shiftT = 0.2;
        }
      }
    }
    const x = this.rpm / sp.redline;
    let tq = sp.tq * clamp(1 - 1.3 * (x - 0.62) * (x - 0.62), 0.45, 1);
    if (this.rpm >= sp.redline || this.shiftT > 0.08) tq = 0;
    const driveF = ((tq * gr * 0.72) / sp.R) * thr * (this.gear < 0 ? -1 : 1);
    const Fb = m * 9.81 * 1.15 * brk;
    const maxSteer = sp.steer / (1 + Math.max(0, speed - 9) * 0.12);
    this.steer = inp.steer * maxSteer;
    Fsum.set(0, -9.81 * m, 0);
    Tsum.set(0, 0, 0);
    Fsum.addScaledVector(v, -sp.drag * speed);
    Fsum.addScaledVector(up, -sp.down * vLong * vLong);
    let dSum = 0,
      dN = 0,
      anyC = false,
      skid = 0,
      bs = 0,
      ls = 0;
    const upy = Math.max(0.25, up.y);
    for (const wh of this.wheels) {
      mount.copy(wh.pos).applyQuaternion(q).add(p);
      ground(mount.x, mount.z, G, mount.y);
      const t = (mount.y - G.h) / upy;
      if (t < this.maxLen && t > -1.2) {
        anyC = true;
        wh.contact = true;
        wh.t = t;
        const comp = this.maxLen - t;
        contact.copy(mount).addScaledVector(up, -t);
        rr.copy(contact).sub(p);
        vp.crossVectors(w, rr).add(v);
        const n = G.n,
          vn = vp.dot(n);
        let Fs = this.k * Math.min(comp, sp.restLen) - this.c * vn;
        if (comp > sp.restLen) Fs += this.k * 8 * (comp - sp.restLen);
        Fs = clamp(Fs, 0, m * 9.81 * 3);
        const st = wh.front ? this.steer : 0,
          cs = Math.cos(st),
          sn = Math.sin(st);
        wf.copy(fwd).multiplyScalar(cs).addScaledVector(right, sn);
        wf.addScaledVector(n, -wf.dot(n)).normalize();
        wr.crossVectors(wf, n).normalize();
        const vl = vp.dot(wf),
          vt = vp.dot(wr),
          N = Fs,
          mu =
            sp.grip *
            (G.surf === 1 ? 1 : G.surf === 2 ? (1 + sp.offroad) / 2 : sp.offroad) *
            (wh.front ? 0.97 : 1.2);
        const hb = inp.hand && !wh.front;
        const alpha = Math.atan2(vt, Math.max(Math.abs(vl), 1.5));
        let Fy = -mu * (hb ? 0.42 : 1) * N * Math.sin(1.3 * Math.atan(9 * alpha));
        const dw =
          sp.drive === "awd"
            ? wh.front
              ? 0.2
              : 0.3
            : sp.drive === "fwd"
              ? wh.front
                ? 0.5
                : 0
              : wh.front
                ? 0
                : 0.5;
        let Fx = driveF * dw;
        const bw = wh.front ? 0.31 : 0.19;
        if (brk > 0) Fx += -Math.sign(vl) * Fb * bw * clamp(Math.abs(vl) / 0.6, 0, 1);
        if (hb) Fx = -Math.sign(vl) * mu * N * 0.75 * clamp(Math.abs(vl) / 0.8, 0, 1);
        if (thr < 0.05 && brk < 0.05 && !hb) {
          if (speed < 0.8) Fx += clamp(-vl * m * 0.9, -mu * N, mu * N);
          else {
            Fx -= Math.sign(vl) * N * 0.018;
            if (dw > 0) Fx -= Math.sign(vl) * N * 0.05;
          }
        }
        const maxF = mu * N;
        if (hb) {
          const mag = Math.hypot(Fx, Fy);
          if (mag > maxF && mag > 0) {
            const k = maxF / mag;
            Fx *= k;
            Fy *= k;
          }
        } else {
          const fxMax = Math.sqrt(Math.max(0, maxF * maxF - Fy * Fy)) * 0.98 + maxF * 0.02;
          Fx = clamp(Fx, -fxMax, fxMax);
        }
        const spinning = Math.abs(driveF * dw) > maxF * 1.02 && Math.abs(vl) < 14;
        let lock = 0;
        if (brk > 0.2 && Math.abs(vl) > 2) {
          const dem = Fb * bw;
          if (dem > maxF * 0.95) lock = clamp((dem - maxF * 0.95) / (maxF * 0.6), 0, 1);
        }
        if (hb && Math.abs(vl) > 3) lock = Math.max(lock, 0.75);
        bs = Math.max(bs, lock);
        ls = Math.max(ls, Math.max(0, Math.abs(vt) - 1.8));
        wh.slip = Math.max(0, Math.abs(vt) - 1.8) * 0.6 + (spinning ? 2 : 0) + lock * 2;
        skid = Math.max(skid, wh.slip);
        Fsum.addScaledVector(n, N);
        _a.copy(n).multiplyScalar(N);
        _b.crossVectors(rr, _a);
        Tsum.add(_b);
        ftire.copy(wf).multiplyScalar(Fx).addScaledVector(wr, Fy);
        Fsum.add(ftire);
        r2.copy(rr).addScaledVector(up, sp.cgY * 0.5);
        _b.crossVectors(r2, ftire);
        Tsum.add(_b);
        wh.vl = spinning
          ? Math.sign(driveF) * Math.max(Math.abs(vl), 8)
          : lock > 0.6 && !spinning
            ? vl * 0.2
            : vl;
        if (dw > 0) {
          dSum += vl;
          dN++;
        }
        wh.cx = contact.x;
        wh.cy = contact.y;
        wh.cz = contact.z;
      } else {
        wh.contact = false;
        wh.t = this.maxLen;
        wh.slip = 0;
        if (thr > 0.1 && (sp.drive === "awd" || (sp.drive === "fwd") === wh.front))
          wh.vl = lerp(wh.vl, Math.sign(driveF || 1) * 30, dt * 2);
        else wh.vl *= 1 - dt * 0.6;
      }
    }
    this.airborne = !anyC;
    this.skid = skid;
    this.brakeSlip = bs;
    this.latSlip = ls;
    if (dN > 0) this.driven = dSum / dN;
    else if (thr > 0.1) this.driven = lerp(this.driven, this.driven + 5, dt);
    // stability control: pull yaw rate toward what the steering asks for (off with handbrake)
    if (!this.airborne && !inp.hand && Math.abs(vLong) > 2.5) {
      const yr = w.dot(up),
        lim = (0.95 * sp.grip * 9.81) / Math.max(3, Math.abs(vLong)),
        want = clamp((-vLong * Math.tan(this.steer)) / sp.wb, -lim, lim);
      const err = clamp(yr - want, -1.5, 1.5);
      Tsum.addScaledVector(up, -err * this.I.y * sp.esp * 2.4 * clamp((Math.abs(vLong) - 2.5) / 6, 0, 1));
    }
    if (this.airborne) {
      Tsum.addScaledVector(up, inp.steer * this.I.y * 1.6);
      Tsum.addScaledVector(right, (inp.brake - inp.throttle) * this.I.x * 0.9);
      _c.set(0, 1, 0);
      _d.crossVectors(up, _c);
      Tsum.x += _d.x * this.I.x * 7;
      Tsum.y += _d.y * this.I.y * 7;
      Tsum.z += _d.z * this.I.z * 7;
      const wu = w.dot(up);
      _d.copy(w).addScaledVector(up, -wu);
      w.addScaledVector(_d, -Math.min(1, dt * 2.5));
    }
    v.addScaledVector(Fsum, dt / m);
    this.invI(Tsum, _a);
    w.addScaledVector(_a, dt);
    w.multiplyScalar(1 - dt * (this.airborne ? 0.15 : 0.35));
    p.addScaledVector(v, dt);
    _q.set(w.x, w.y, w.z, 0).multiply(q);
    q.x += _q.x * 0.5 * dt;
    q.y += _q.y * 0.5 * dt;
    q.z += _q.z * 0.5 * dt;
    q.w += _q.w * 0.5 * dt;
    q.normalize();
    this.collide();
  }
  collide() {
    const p = this.p,
      q = this.q;
    let imp = 0;
    for (const lp of this.gPts) {
      _c.copy(lp).applyQuaternion(q).add(p);
      ground(_c.x, _c.z, G, _c.y);
      if (_c.y < G.h) {
        const n = G.n.clone(),
          depth = (G.h - _c.y) * n.y;
        imp = Math.max(imp, this.resolve(_c.clone(), n, depth, 0.08, 0.55));
      }
    }
    nearObs(p.x, p.z, 5, obsList);
    if (obsList.length) {
      for (const lp of this.sPts) {
        _c.copy(lp).applyQuaternion(q).add(p);
        for (const o of obsList) {
          if (o.t !== 0 || _c.y > o.top) continue;
          if (_c.x < o.minX || _c.x > o.maxX || _c.z < o.minZ || _c.z > o.maxZ) continue;
          const dl = _c.x - o.minX,
            dr = o.maxX - _c.x,
            dn = _c.z - o.minZ,
            ds = o.maxZ - _c.z,
            mn = Math.min(dl, dr, dn, ds);
          const n = new THREE.Vector3(
            mn === dl ? -1 : mn === dr ? 1 : 0,
            0,
            mn === dn ? -1 : mn === ds ? 1 : 0,
          );
          if (n.x !== 0) n.z = 0;
          imp = Math.max(imp, this.resolve(_c.clone(), n, mn, 0.2, 0.3));
        }
      }
      _qi.copy(q).invert();
      for (const o of obsList) {
        if ((o.t !== 1 && o.t !== 3) || o.broken || p.y > o.top + 1) continue;
        const lx = o.x - p.x,
          lz = o.z - p.z;
        _d.set(lx, 0, lz).applyQuaternion(_qi);
        const cx = clamp(_d.x, -this.hx, this.hx),
          cz = clamp(_d.z, -this.hz, this.hz);
        const ddx = _d.x - cx,
          ddz = _d.z - cz,
          dd = Math.hypot(ddx, ddz);
        if (dd >= o.r) continue;
        if (o.t === 3) {
          const sp = this.v.length();
          breakIt(o.br, this.v.x, this.v.z, sp);
          this.v.multiplyScalar(sp > 3 ? 0.94 : 0.8);
          continue;
        }
        const cw = new THREE.Vector3(cx, 0, cz).applyQuaternion(q).add(p);
        cw.y = p.y;
        const n = new THREE.Vector3(cw.x - o.x, 0, cw.z - o.z);
        if (n.length() < 1e-3) n.set(p.x - o.x, 0, p.z - o.z);
        n.normalize();
        imp = Math.max(imp, this.resolve(cw, n, o.r - dd, 0.15, 0.3));
      }
    }
    // traffic: car points inside a bot box, and bot corners inside the car box
    for (const b of BOTS) {
      const dx0 = b.pos.x - p.x,
        dz0 = b.pos.z - p.z;
      if (dx0 * dx0 + dz0 * dz0 > (b.len / 2 + 4) ** 2 || Math.abs(b.pos.y - p.y) > 4) continue;
      const vb = new THREE.Vector3(b.hx * b.v, 0, b.hz * b.v),
        hl = b.len / 2,
        hw = b.wid / 2,
        ax = -b.hz,
        az = b.hx;
      let hit = 0;
      for (const lp of this.sPts) {
        _c.copy(lp).applyQuaternion(q).add(p);
        if (_c.y < b.pos.y || _c.y > b.pos.y + b.hgt) continue;
        const rx = _c.x - b.pos.x,
          rz = _c.z - b.pos.z,
          la = rx * b.hx + rz * b.hz,
          lt = rx * ax + rz * az;
        if (Math.abs(la) >= hl || Math.abs(lt) >= hw) continue;
        const pa = hl - Math.abs(la),
          pt = hw - Math.abs(lt);
        const n =
          pa < pt
            ? new THREE.Vector3(b.hx * Math.sign(la), 0, b.hz * Math.sign(la))
            : new THREE.Vector3(ax * Math.sign(lt), 0, az * Math.sign(lt));
        hit = Math.max(hit, this.resolve(_c.clone(), n, Math.min(pa, pt), 0.15, 0.3, vb));
      }
      _qi.copy(q).invert();
      for (const sa of [-1, -0.5, 0, 0.5, 1])
        for (const sb of [-1, 1]) {
          const wx = b.pos.x + b.hx * hl * sa + ax * hw * sb,
            wz = b.pos.z + b.hz * hl * sa + az * hw * sb,
            wy = b.pos.y + Math.min(1, b.hgt / 2);
          _d.set(wx - p.x, wy - p.y, wz - p.z).applyQuaternion(_qi);
          if (
            Math.abs(_d.x) >= this.hx ||
            Math.abs(_d.z) >= this.hz ||
            _d.y < this.sp.yb - this.sp.cgY ||
            _d.y > this.sp.roofY - this.sp.cgY
          )
            continue;
          const px = this.hx - Math.abs(_d.x),
            pz = this.hz - Math.abs(_d.z);
          const nl =
            px < pz ? new THREE.Vector3(-Math.sign(_d.x), 0, 0) : new THREE.Vector3(0, 0, -Math.sign(_d.z));
          nl.applyQuaternion(q);
          nl.y = 0;
          nl.normalize();
          hit = Math.max(
            hit,
            this.resolve(new THREE.Vector3(wx, wy, wz), nl, Math.min(px, pz), 0.15, 0.3, vb),
          );
        }
      if (hit > 1.2) {
        b.crashT = 2.5;
        imp = Math.max(imp, hit);
      }
    }
    const hd = hwInfo(p.x, p.z, HI, p.y - this.sp.cgY);
    if (
      hd &&
      hd.i > hd.h.railA &&
      hd.i < hd.h.railB &&
      Math.abs(hd.lat) < HW_HALF + 2.5 &&
      Math.abs(p.y - this.sp.cgY - hd.y) < 3.5
    ) {
      const hh = hd.h,
        sxv = -hh.tz[hd.i],
        szv = hh.tx[hd.i],
        side = Math.sign(hd.lat) || 1,
        q0 = hh.pts[hd.i],
        gap = hd.kind === 0 && hh.gaps.some((g) => hd.i >= g.a && hd.i <= g.b && g.side === side);
      for (const lp of this.sPts) {
        _c.copy(lp).applyQuaternion(q).add(p);
        const lat = ((_c.x - q0.x) * sxv + (_c.z - q0.z) * szv) * side;
        if (lat < 0.42 && Math.abs(hd.lat) < HW_HALF) {
          const n = new THREE.Vector3(sxv * side, 0, szv * side);
          imp = Math.max(imp, this.resolve(_c.clone(), n, 0.42 - lat, 0.2, 0.25));
        } else if (!gap && lat > HW_HALF - 0.25 && Math.abs(hd.lat) < HW_HALF + 1.5) {
          const n = new THREE.Vector3(-sxv * side, 0, -szv * side);
          imp = Math.max(imp, this.resolve(_c.clone(), n, lat - (HW_HALF - 0.25), 0.2, 0.25));
        }
      }
    }
    const lim = HALF - 6;
    for (const ax of ["x", "z"]) {
      if (p[ax] > lim) {
        const n = new THREE.Vector3();
        n[ax] = -1;
        imp = Math.max(imp, this.resolve(p.clone(), n, p[ax] - lim, 0.3, 0.2));
      }
      if (p[ax] < -lim) {
        const n = new THREE.Vector3();
        n[ax] = 1;
        imp = Math.max(imp, this.resolve(p.clone(), n, -lim - p[ax], 0.3, 0.2));
      }
    }
    this.impact = Math.max(this.impact, imp);
  }
}
