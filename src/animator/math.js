/**
 * 2-Bone Analytic IK/FK Solvers & Kinematic Interpolation
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sampleSpline(points, t) {
  const n = points.length;
  const scaled = ((t % 1) + 1) % 1 * n;
  const i1 = Math.floor(scaled) % n;
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;
  const u = scaled - Math.floor(scaled);
  const u2 = u * u;
  const u3 = u2 * u;

  const res = {};
  for (const k of Object.keys(points[0])) {
    const p0 = points[i0][k], p1 = points[i1][k], p2 = points[i2][k], p3 = points[i3][k];
    res[k] = 0.5 * (
      (2 * p1) +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3
    );
  }
  return res;
}

function sampleTimedKeyframes(kfs, normT) {
  const t = ((normT % 1) + 1) % 1;
  let idx = 0;
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].t && t < kfs[i + 1].t) {
      idx = i;
      break;
    }
  }
  const k0 = kfs[idx];
  const k1 = kfs[idx + 1];
  const u = (t - k0.t) / (k1.t - k0.t);
  const su = smoothstep(u);
  const out = {};
  for (const key of Object.keys(k0)) {
    if (key === 't') continue;
    if (typeof k0[key] === 'number') {
      out[key] = lerp(k0[key], k1[key], su);
    } else {
      out[key] = su < 0.5 ? k0[key] : k1[key];
    }
  }
  return out;
}

function sampleKeyframes(keyframes, normT) {
  const n = keyframes.length;
  const scaled = ((normT % 1) + 1) % 1 * n;
  const i0 = Math.floor(scaled) % n;
  const i1 = (i0 + 1) % n;
  const localT = smoothstep(scaled - Math.floor(scaled));
  const k0 = keyframes[i0];
  const k1 = keyframes[i1];
  const out = {};
  for (const key of Object.keys(k0)) {
    if (typeof k0[key] === 'number') {
      out[key] = lerp(k0[key], k1[key], localT);
    } else {
      out[key] = localT < 0.5 ? k0[key] : k1[key];
    }
  }
  return out;
}

/**
 * Exact 2-Bone Analytic IK Solver:
 * Always returns a joint (jx, jy) and end-effector (ex, ey) such that:
 * - dist(root, joint) === L1
 * - dist(joint, end) === L2
 * - Joint bends strictly to `bendSide` (+1 or -1) of the directed vector (root -> end).
 */
function solveIK(rx, ry, tx, ty, L1, L2, bendSide = 1) {
  let dx = tx - rx;
  let dy = ty - ry;
  let dist = Math.hypot(dx, dy);

  const minDist = Math.abs(L1 - L2) + 2.0;
  const maxDist = (L1 + L2) - 0.08;

  if (dist < 0.001) {
    dx = maxDist;
    dy = 0;
    dist = maxDist;
  } else if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
    dist = maxDist;
  } else if (dist < minDist) {
    dx = (dx / dist) * minDist;
    dy = (dy / dist) * minDist;
    dist = minDist;
  }

  const ux = dx / dist;
  const uy = dy / dist;

  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

  const mx = rx + a * ux;
  const my = ry + a * uy;

  const sign = bendSide >= 0 ? 1 : -1;
  const jx = mx + sign * (-uy) * h;
  const jy = my + sign * (ux) * h;

  return {
    jx,
    jy,
    ex: rx + dx,
    ey: ry + dy
  };
}

/**
 * Forward Kinematics 2-Bone solver (exact segment lengths L1, L2 from angles a1, a2)
 */
function solveFK(rx, ry, angle1, angle2, L1, L2) {
  const jx = rx + Math.cos(angle1) * L1;
  const jy = ry + Math.sin(angle1) * L1;
  const ex = jx + Math.cos(angle2) * L2;
  const ey = jy + Math.sin(angle2) * L2;
  return { jx, jy, ex, ey };
}

/**
 * Front-view symmetrical arm IK where elbows always point outward (away from torso centerline)
 */
function solveFrontArm(sx, sy, hx, hy, isLeft) {
  const L_UPPER_ARM = globalThis.L_UPPER_ARM || 25;
  const L_FOREARM = globalThis.L_FOREARM || 24;
  let dx = hx - sx;
  let dy = hy - sy;
  let dist = Math.hypot(dx, dy);
  const minDist = Math.abs(L_UPPER_ARM - L_FOREARM) + 2.0;
  const maxDist = (L_UPPER_ARM + L_FOREARM) - 0.8;

  if (dist < 0.001) {
    dx = isLeft ? -minDist : minDist;
    dy = 0;
    dist = minDist;
  } else if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
    dist = maxDist;
  } else if (dist < minDist) {
    dx = (dx / dist) * minDist;
    dy = (dy / dist) * minDist;
    dist = minDist;
  }

  const ux = dx / dist;
  const uy = dy / dist;
  const a = (L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - a * a));
  const mx = sx + a * ux;
  const my = sy + a * uy;
  // Outward normal branch:
  // Left arm always bends outward to the left (jx <= mx); Right arm always bends outward to the right (jx >= mx).
  const outwardSign = uy <= 0 ? (isLeft ? -1 : 1) : (isLeft ? 1 : -1);
  return {
    jx: mx + outwardSign * (-uy) * h,
    jy: my + outwardSign * (ux) * h,
    ex: sx + dx,
    ey: sy + dy
  };
}

/**
 * Front-view symmetrical leg IK where knees track slightly outward or vertical
 */
function solveFrontLeg(hx, hy, ax, ay, isLeft, kneeSpread = 0) {
  const L_THIGH = globalThis.L_THIGH || 32;
  const L_SHIN = globalThis.L_SHIN || 32;
  let dx = ax - hx;
  let dy = ay - hy;
  let dist = Math.hypot(dx, dy);
  const maxDist = (L_THIGH + L_SHIN) - 0.5;
  const minDist = Math.abs(L_THIGH - L_SHIN) + 2.0;
  if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
    dist = maxDist;
  } else if (dist < minDist) {
    dx = (dx / dist) * minDist;
    dy = (dy / dist) * minDist;
    dist = minDist;
  }
  const ux = dx / dist;
  const uy = dy / dist;
  const a = (L_THIGH * L_THIGH - L_SHIN * L_SHIN + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L_THIGH * L_THIGH - a * a));
  const mx = hx + a * ux;
  const my = hy + a * uy;
  const sign = isLeft ? 1 : -1; // For downward vector (ux=0, uy=1), (-uy, ux) = (-1, 0) which is Left!
  return {
    jx: mx + sign * (-uy) * h,
    jy: my + sign * (ux) * h,
    ex: hx + dx,
    ey: hy + dy
  };
}

/**
 * Builds a rigid side-view torso from Hip + SpineAngle (guarantees dist(hip, shoulder) === 46)
 */
function torsoFromHip(hipX, hipY, spineAngle, facingDir = 1, neckOffsetRad = 0) {
  const L_TORSO = globalThis.L_TORSO || 46;
  const L_NECK = globalThis.L_NECK || 15;
  const shoulderX = hipX + Math.cos(spineAngle) * L_TORSO;
  const shoulderY = hipY + Math.sin(spineAngle) * L_TORSO;
  const clampedNeck = clamp(neckOffsetRad, -0.52, 0.52);
  const headAngle = spineAngle + clampedNeck;
  const headX = shoulderX + Math.cos(headAngle) * L_NECK;
  const headY = shoulderY + Math.sin(headAngle) * L_NECK;
  return { hipX, hipY, shoulderX, shoulderY, headX, headY, spineAngle, facingDir, neckOffsetRad: clampedNeck };
}

/**
 * Builds a rigid side-view torso from Shoulder + SpineAngle (hip -> shoulder direction)
 */
function torsoFromShoulder(shoulderX, shoulderY, spineAngle, facingDir = 1, neckOffsetRad = 0) {
  const L_TORSO = globalThis.L_TORSO || 46;
  const hipX = shoulderX - Math.cos(spineAngle) * L_TORSO;
  const hipY = shoulderY - Math.sin(spineAngle) * L_TORSO;
  return torsoFromHip(hipX, hipY, spineAngle, facingDir, neckOffsetRad);
}

const KinematicMath = {
  lerp,
  clamp,
  smoothstep,
  sampleSpline,
  sampleTimedKeyframes,
  sampleKeyframes,
  solveIK,
  solveFK,
  solveFrontArm,
  solveFrontLeg,
  torsoFromHip,
  torsoFromShoulder
};

globalThis.KinematicMath = KinematicMath;
