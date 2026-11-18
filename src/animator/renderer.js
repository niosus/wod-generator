/**
 * Biomechanical 2D Canvas Renderer
 * Renders pure skeleton frame objects with multi-view perspective, shading & equipment props.
 * Supports adaptive Light & Dark system themes.
 */
const DARK_COLOR_MAP = {
  '#bef264': '#38bdf8',
  '#f59e0b': '#38bdf8',
  '#fef08a': '#bae6fd',
  '#f97316': '#38bdf8',
  '#b45309': '#0369a1',
  '#92400e': '#0284c7',
  'rgba(190, 242, 100, 0.35)': 'rgba(56, 189, 248, 0.35)',
  'rgba(190, 242, 100, 0.18)': 'rgba(56, 189, 248, 0.18)'
};

const LIGHT_COLOR_MAP = {
  '#bef264': '#0284c7',
  '#38bdf8': '#0284c7',
  '#94a3b8': '#52525b',
  '#64748b': '#71717a',
  '#475569': '#71717a',
  '#f8fafc': '#18181b',
  '#0f172a': '#ffffff',
  '#1e293b': '#e4e4e7',
  '#334155': '#cbd5e1',
  '#e2e8f0': '#52525b',
  '#cbd5e1': '#3f3f46',
  '#f59e0b': '#0284c7',
  '#fef08a': '#075985',
  '#f43f5e': '#e11d48',
  '#f97316': '#0284c7',
  '#b45309': '#0369a1',
  '#92400e': '#075985',
  'rgba(56, 189, 248, 0.40)': 'rgba(2, 132, 199, 0.35)',
  'rgba(190, 242, 100, 0.35)': 'rgba(2, 132, 199, 0.35)',
  'rgba(15, 23, 42, 0.88)': 'rgba(255, 255, 255, 0.88)',
  'rgba(56, 189, 248, 0.45)': 'rgba(2, 132, 199, 0.40)',
  'rgba(56, 189, 248, 0.35)': 'rgba(2, 132, 199, 0.35)',
  'rgba(56, 189, 248, 0.18)': 'rgba(2, 132, 199, 0.14)',
  'rgba(190, 242, 100, 0.18)': 'rgba(2, 132, 199, 0.14)'
};

const isLightTheme = () => {
  return typeof document !== 'undefined' &&
    document.documentElement &&
    !document.documentElement.classList.contains('dark');
};

const resolveThemeColor = (color, isLight = isLightTheme()) => {
  if (!color) return color;
  if (isLight) return LIGHT_COLOR_MAP[color] || color;
  return DARK_COLOR_MAP[color] || color;
};

const lerpAngle = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

const drawLimb = (ctx, limb, isLight) => {
  const { x1, y1, jx, jy, x2, y2, width, endType, footDir, surfaceY, name, jz = 0, z2 = 0 } = limb;
  const isFar = Boolean(name && name.endsWith('B'));
  const cInk = isLight ? (isFar ? '#52525b' : '#09090b') : (isFar ? '#a1a1aa' : '#fafafa');
  const cOutline = isLight ? '#ffffff' : '#09090b';

  const drawJoint = () => {
    ctx.fillStyle = cInk;
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(jx, jy, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cOutline;
    ctx.beginPath();
    ctx.arc(jx, jy, 1.1, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawHand = () => {
    ctx.fillStyle = cInk;
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x2, y2, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  ctx.lineCap = 'round';

  if (endType === 'hand' && jz > z2) {
    // Joint/elbow is closer to the camera than the fist: draw forearm + fist first, then upper arm + elbow on top
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = (width - 0.5) + 2.6;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = cInk;
    ctx.lineWidth = width - 0.5;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    drawHand();

    ctx.strokeStyle = cOutline;
    ctx.lineWidth = width + 2.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.strokeStyle = cInk;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    drawJoint();
    return;
  }

  // Pass 1: Background contrast outline for upper & lower limb segments
  ctx.strokeStyle = cOutline;
  ctx.lineWidth = width + 2.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.stroke();

  ctx.lineWidth = (width - 0.5) + 2.6;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Pass 2: Monochrome limb core strokes
  ctx.strokeStyle = cInk;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.stroke();

  ctx.lineWidth = width - 0.5;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  drawJoint();

  if (endType === 'hand') {
    drawHand();
  } else if (endType === 'foot' || endType === 'foot_pointed') {
    const shinAngle = Math.atan2(y2 - jy, x2 - jx);
    const isPointed = endType === 'foot_pointed';
    let soleAngle;
    if (isPointed) {
      soleAngle = shinAngle - 0.78;
    } else {
      const dir = footDir >= 0 ? 1 : -1;
      const flatAngle = dir > 0 ? 0 : Math.PI;
      const perpAngle = shinAngle - dir * Math.PI * 0.48;
      const airT = Math.max(0, Math.min(1, (surfaceY - 4 - y2) / 10));
      soleAngle = lerpAngle(flatAngle, perpAngle, airT);
    }
    const backExt = isPointed ? 1.0 : 2.5;
    const frontExt = isPointed ? 7.5 : 10.5;
    const sx1 = x2 - Math.cos(soleAngle) * backExt;
    const sy1 = y2 - Math.sin(soleAngle) * backExt;
    const sx2 = x2 + Math.cos(soleAngle) * frontExt;
    const sy2 = y2 + Math.sin(soleAngle) * frontExt;

    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    ctx.strokeStyle = cInk;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  } else if (endType === 'foot_front') {
    ctx.fillStyle = cInk;
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x2, y2 + 2, 4.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
};

const drawHead = (ctx, x, y, r = 9.5, isLight = false) => {
  const cInk = isLight ? '#09090b' : '#fafafa';
  const cOutline = isLight ? '#ffffff' : '#09090b';

  ctx.strokeStyle = cOutline;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = cOutline;
  ctx.strokeStyle = cInk;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const drawSideTorso = (ctx, t, isLight) => {
  const cInk = isLight ? '#09090b' : '#fafafa';
  const cOutline = isLight ? '#ffffff' : '#09090b';

  ctx.lineCap = 'round';
  ctx.strokeStyle = cOutline;
  ctx.lineWidth = 10.2;
  ctx.beginPath();
  ctx.moveTo(t.hipX, t.hipY);
  ctx.lineTo(t.shoulderX, t.shoulderY);
  ctx.stroke();

  ctx.strokeStyle = cInk;
  ctx.lineWidth = 7.2;
  ctx.beginPath();
  ctx.moveTo(t.hipX, t.hipY);
  ctx.lineTo(t.shoulderX, t.shoulderY);
  ctx.stroke();

  const joints = [[t.hipX, t.hipY], [t.shoulderX, t.shoulderY]];
  for (const [px, py] of joints) {
    ctx.fillStyle = cInk;
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px, py, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cOutline;
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHead(ctx, t.headX, t.headY, 9.5, isLight);

  const nx = t.headX - t.shoulderX;
  const ny = t.headY - t.shoulderY;
  const nl = Math.hypot(nx, ny) || 1;
  const fd = t.facingDir !== undefined ? t.facingDir : 1;
  ctx.fillStyle = cInk;
  ctx.beginPath();
  ctx.arc(t.headX + fd * (-ny / nl) * 4.5, t.headY + fd * (nx / nl) * 4.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
};

const drawFrontTorso = (ctx, ft, isLight, includeHead = true) => {
  const cInk = isLight ? '#09090b' : '#fafafa';
  const cOutline = isLight ? '#ffffff' : '#09090b';
  const cBodyFill = isLight ? '#e4e4e7' : '#27272a';
  const syL = ft.leftShoulderY !== undefined ? ft.leftShoulderY : ft.shoulderY;
  const syR = ft.rightShoulderY !== undefined ? ft.rightShoulderY : ft.shoulderY;
  const hyR = ft.rightHipY !== undefined ? ft.rightHipY : ft.hipY;
  const hyL = ft.leftHipY !== undefined ? ft.leftHipY : ft.hipY;

  const traceTorso = () => {
    ctx.beginPath();
    ctx.moveTo(ft.leftShoulderX, syL);
    ctx.lineTo(ft.rightShoulderX, syR);
    ctx.lineTo(ft.rightHipX, hyR);
    ctx.lineTo(ft.leftHipX, hyL);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.strokeStyle = cOutline;
  ctx.lineWidth = 6.2;
  traceTorso();
  ctx.stroke();

  ctx.fillStyle = cBodyFill;
  ctx.strokeStyle = cInk;
  ctx.lineWidth = 3.6;
  traceTorso();
  ctx.fill();
  ctx.stroke();

  if (includeHead) {
    drawHead(ctx, ft.headX, ft.headY, 9.8, isLight);
  }
};

const drawGymRingStrap = (ctx, strapX, strapY, cx, cy, r, isLight) => {
  ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(strapX, strapY);
  ctx.lineTo(cx, cy - r);
  ctx.stroke();
  const bx = strapX + (cx - strapX) * 0.45;
  const by = strapY + (cy - r - strapY) * 0.45;
  ctx.fillStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.fillRect(bx - 2.5, by - 2, 5, 4);
};

const drawGymRingHoop = (ctx, cx, cy, r, isLight, rx = r, tilt = 0) => {
  const cOutline = isLight ? '#ffffff' : '#09090b';
  const radX = rx || r;
  const slim = radX < r * 0.85;
  ctx.strokeStyle = cOutline;
  ctx.lineWidth = slim ? 3.8 : 5.0;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radX, r, tilt || 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = resolveThemeColor('#f59e0b', isLight);
  ctx.lineWidth = slim ? 2.4 : 3.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radX, r, tilt || 0, 0, Math.PI * 2);
  ctx.stroke();
};

const drawLoad = (ctx, x, y, r, isLight) => {
  ctx.fillStyle = resolveThemeColor('#f59e0b', isLight);
  ctx.strokeStyle = resolveThemeColor('#fef08a', isLight);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const drawMedBall = (ctx, pr, isLight) => {
  const r = pr.r || 8;
  const a = pr.angle || 0;
  const dx = Math.cos(a) * r * 0.75;
  const dy = Math.sin(a) * r * 0.75;
  ctx.fillStyle = resolveThemeColor('#f59e0b', isLight);
  ctx.strokeStyle = resolveThemeColor('#fef08a', isLight);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = isLight ? '#e0f2fe' : '#0c4a6e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pr.x - dx, pr.y - dy);
  ctx.lineTo(pr.x + dx, pr.y + dy);
  ctx.stroke();
};

const isKettlebellMidground = (pr, frame) => (
  Boolean(pr.midground) ||
  frame.poseType === 'kb_deadlift' ||
  (frame.poseType === 'kb_swing' && pr.y > 118) ||
  (frame.poseType === 'kb_snatch' && (pr.y > 118 || frame.props.some(p => p.type === 'hud_badge' && p.second)))
);

const drawKettlebell = (ctx, pr, isLight) => {
  ctx.save();
  if (pr.angle) {
    ctx.translate(pr.x, pr.y - pr.r * 1.1);
    ctx.rotate(pr.angle);
    ctx.translate(-pr.x, -(pr.y - pr.r * 1.1));
  }
  ctx.fillStyle = resolveThemeColor('#f59e0b', isLight);
  ctx.strokeStyle = resolveThemeColor('#fef08a', isLight);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = resolveThemeColor('#cbd5e1', isLight);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y - pr.r * 0.72, pr.r * 0.62, Math.PI, 0, false);
  ctx.stroke();
  ctx.restore();
};

const drawParallettes = (ctx, pr, isLight) => {
  ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pr.x - 14, 149);
  ctx.lineTo(pr.x + 14, 149);
  ctx.moveTo(pr.x - 10, 149);
  ctx.lineTo(pr.x - 12, pr.floorY);
  ctx.moveTo(pr.x + 10, 149);
  ctx.lineTo(pr.x + 12, pr.floorY);
  ctx.stroke();
};

const drawBikeErg = (ctx, pr, isLight) => {
  // Concept2 BikeErg authentic silhouette:
  // Wide front/rear stabilizer feet, heavy angled monobeam spine, enclosed drive-belt arm,
  // telescoping seat & aero-bar posts, pivoted PM5 monitor, and low enclosed front flywheel with damper ring.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Floor stabilizer bar & wide front/rear feet + front caster wheel
  ctx.strokeStyle = resolveThemeColor('#334155', isLight);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(42, 166);
  ctx.lineTo(66, 166);
  ctx.moveTo(138, 166);
  ctx.lineTo(164, 166);
  ctx.stroke();

  ctx.fillStyle = resolveThemeColor('#1e293b', isLight);
  ctx.fillRect(40, 164, 12, 5);
  ctx.fillRect(148, 164, 14, 5);
  ctx.fillStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.beginPath();
  ctx.arc(162, 164, 3.2, 0, Math.PI * 2);
  ctx.fill();

  const headX = 124, headY = 108;
  const seatPostBaseX = 78, seatPostBaseY = 134;

  // Enclosed drive-belt arm from bottom bracket to low front flywheel
  ctx.strokeStyle = resolveThemeColor('#1e293b', isLight);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(pr.crankX, pr.crankY);
  ctx.lineTo(pr.wheelX, pr.wheelY);
  ctx.stroke();
  ctx.strokeStyle = resolveThemeColor('#475569', isLight);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(pr.crankX, pr.crankY);
  ctx.lineTo(pr.wheelX, pr.wheelY);
  ctx.stroke();

  // Heavy angled Concept2 monobeam main frame
  ctx.strokeStyle = resolveThemeColor('#0f172a', isLight);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(54, 165);
  ctx.lineTo(seatPostBaseX, seatPostBaseY);
  ctx.lineTo(pr.crankX, pr.crankY);
  ctx.lineTo(headX, headY);
  ctx.lineTo(pr.wheelX, pr.wheelY);
  ctx.moveTo(headX, headY + 6);
  ctx.lineTo(152, 165);
  ctx.stroke();

  ctx.strokeStyle = resolveThemeColor('#334155', isLight);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(54, 165);
  ctx.lineTo(pr.crankX, pr.crankY);
  ctx.lineTo(headX, headY);
  ctx.lineTo(pr.wheelX, pr.wheelY);
  ctx.stroke();

  // Telescoping angled seat post + adjustment collar + contoured saddle
  ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(seatPostBaseX, seatPostBaseY);
  ctx.lineTo(pr.seatX, pr.seatY + 3);
  ctx.stroke();
  ctx.fillStyle = resolveThemeColor('#38bdf8', isLight);
  ctx.beginPath();
  ctx.arc(seatPostBaseX - 3, seatPostBaseY - 5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = resolveThemeColor('#1e293b', isLight);
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(pr.seatX - 11, pr.seatY + 1);
  ctx.lineTo(pr.seatX + 10, pr.seatY + 1.5);
  ctx.stroke();
  ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pr.seatX - 10, pr.seatY);
  ctx.lineTo(pr.seatX + 9, pr.seatY + 0.5);
  ctx.stroke();

  // Telescoping front handlebar post + Concept2 multi-position bullhorn/aero bars
  ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(headX, headY);
  ctx.lineTo(pr.barX - 4, pr.barY + 4);
  ctx.stroke();

  // Signature Concept2 curved bullhorn/aero handlebar profile (fixed, non-moving)
  ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(pr.barX - 9, pr.barY + 3);
  ctx.lineTo(pr.barX + 2, pr.barY - 1);
  ctx.lineTo(pr.barX + 10, pr.barY - 5);
  ctx.stroke();

  // Pivoted PM5 monitor arm & backlit screen
  ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pr.barX + 2, pr.barY - 1);
  ctx.lineTo(pr.barX + 7, pr.barY - 13);
  ctx.stroke();
  ctx.fillStyle = resolveThemeColor('#0f172a', isLight);
  ctx.strokeStyle = resolveThemeColor('#38bdf8', isLight);
  ctx.lineWidth = 2;
  ctx.fillRect(pr.barX + 4, pr.barY - 22, 12, 10);
  ctx.strokeRect(pr.barX + 4, pr.barY - 22, 12, 10);

  // Concept2 enclosed front-bottom flywheel housing + cyan damper ring & internal turbine blades
  ctx.fillStyle = resolveThemeColor('rgba(15, 23, 42, 0.94)', isLight);
  ctx.strokeStyle = resolveThemeColor('#475569', isLight);
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(pr.wheelX, pr.wheelY, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Signature Concept2 cyan/sky damper control arc & perforated outer ring
  ctx.strokeStyle = resolveThemeColor('#38bdf8', isLight);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(pr.wheelX, pr.wheelY, 17, -Math.PI * 0.65, Math.PI * 0.15);
  ctx.stroke();

  ctx.strokeStyle = resolveThemeColor('rgba(56, 189, 248, 0.55)', isLight);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = pr.theta * 4 + (k * Math.PI * 2) / 6;
    ctx.moveTo(pr.wheelX, pr.wheelY);
    ctx.lineTo(pr.wheelX + Math.cos(a) * 15, pr.wheelY + Math.sin(a) * 15);
  }
  ctx.stroke();

  // Center flywheel hub & subtle "C2" damper pointer dot
  ctx.fillStyle = resolveThemeColor('#cbd5e1', isLight);
  ctx.beginPath();
  ctx.arc(pr.wheelX, pr.wheelY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = resolveThemeColor('#0f172a', isLight);
  ctx.beginPath();
  ctx.arc(pr.wheelX, pr.wheelY, 2, 0, Math.PI * 2);
  ctx.fill();

  // Midground bottom bracket chainring guard and rotating crank arm to pedal1
  const p1X = pr.crankX + Math.cos(pr.theta * 2) * 15;
  const p1Y = pr.crankY + Math.sin(pr.theta * 2) * 15;
  ctx.fillStyle = resolveThemeColor('#0f172a', isLight);
  ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(pr.crankX, pr.crankY, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = resolveThemeColor('#cbd5e1', isLight);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pr.crankX, pr.crankY);
  ctx.lineTo(p1X, p1Y);
  ctx.stroke();
  ctx.fillStyle = resolveThemeColor('#f59e0b', isLight);
  ctx.beginPath();
  ctx.arc(pr.crankX, pr.crankY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawJumpRope = (ctx, pr, behind, isLight) => {
  const { isDoubleUnder, ropePhase, leftHandX, rightHandX, handY } = pr;
  const ropeInFront = Math.sin(ropePhase) >= 0;
  const ctrlFor = (phase) => ((89.5 + Math.cos(phase) * 79.5) - 0.25 * handY) / 0.75;
  ctx.save();
  if (behind || ropeInFront) {
    ctx.strokeStyle = resolveThemeColor(isDoubleUnder ? '#38bdf8' : '#bef264', isLight);
    ctx.lineWidth = 3.2;
    const ctrlY = ctrlFor(ropePhase);
    ctx.beginPath();
    ctx.moveTo(leftHandX, handY);
    ctx.bezierCurveTo(leftHandX - 16, ctrlY, rightHandX + 16, ctrlY, rightHandX, handY);
    ctx.stroke();
  }
  if (!behind) {
    if (isDoubleUnder && ropeInFront) {
      const trailCtrl = ctrlFor(ropePhase - 0.45);
      ctx.strokeStyle = resolveThemeColor('rgba(190, 242, 100, 0.35)', isLight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftHandX, handY);
      ctx.bezierCurveTo(leftHandX - 16, trailCtrl, rightHandX + 16, trailCtrl, rightHandX, handY);
      ctx.stroke();
    }
    ctx.strokeStyle = resolveThemeColor('#f59e0b', isLight);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftHandX, handY);
    ctx.lineTo(leftHandX - 5, handY + 2);
    ctx.moveTo(rightHandX, handY);
    ctx.lineTo(rightHandX + 5, handY + 2);
    ctx.stroke();
  }
  if (Math.cos(ropePhase) > 0.86) {
    ctx.strokeStyle = resolveThemeColor('#bef264', isLight);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(86, 169);
    ctx.lineTo(114, 169);
    ctx.stroke();
  }
  ctx.restore();
};

const drawBackgroundProp = (ctx, pr, frame, isLight) => {
  switch (pr.type) {
    case 'overhead_beam':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pr.x1, pr.y1);
      ctx.lineTo(pr.x2, pr.y2);
      ctx.stroke();
      break;
    case 'gym_ring':
      drawGymRingStrap(ctx, pr.strapX, pr.strapY, pr.cx, pr.cy, pr.r, isLight);
      break;
    case 'parallel_bars': {
      const floorY = pr.floorY || frame.floorY;
      const postL = pr.x1 + 6;
      const postR = pr.x2 - 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(postL, pr.barY); ctx.lineTo(postL, floorY);
      ctx.moveTo(postR, pr.barY); ctx.lineTo(postR, floorY);
      ctx.stroke();
      // Far parallel rail
      ctx.strokeStyle = resolveThemeColor('#475569', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pr.x1, pr.barY - 4);
      ctx.lineTo(pr.x2, pr.barY - 4);
      ctx.stroke();
      break;
    }
    case 'rig_uprights': {
      const bottomY = pr.floorY || 184;
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(32, 10); ctx.lineTo(32, bottomY);
      ctx.moveTo(168, 10); ctx.lineTo(168, bottomY);
      ctx.stroke();
      ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(26, pr.barY);
      ctx.lineTo(174, pr.barY);
      ctx.stroke();
      break;
    }
    case 'side_rig':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pr.postX, 14);
      ctx.lineTo(pr.postX, pr.floorY);
      ctx.moveTo(pr.postX, pr.barY);
      ctx.lineTo(pr.barX, pr.barY);
      ctx.stroke();
      break;
    case 'wall':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y1);
      ctx.lineTo(pr.x, pr.y2);
      ctx.stroke();
      break;
    case 'towel_pillar': {
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pr.pillarX, 20);
      ctx.lineTo(pr.pillarX, frame.floorY);
      ctx.stroke();
      const arm = frame.limbs.find(l => l.name === 'arm');
      const hx = arm ? arm.x2 : pr.handX;
      const hy = arm ? arm.y2 : pr.handY;
      ctx.strokeStyle = resolveThemeColor('#e2e8f0', isLight);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.pillarX, pr.anchorY);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      break;
    }
    case 'sturdy_table':
      ctx.fillStyle = resolveThemeColor('#334155', isLight);
      ctx.strokeStyle = resolveThemeColor('#64748b', isLight);
      ctx.lineWidth = 2.5;
      ctx.fillRect(pr.x1, pr.topY - 6, pr.x2 - pr.x1, 7);
      ctx.strokeRect(pr.x1, pr.topY - 6, pr.x2 - pr.x1, 7);
      ctx.strokeStyle = resolveThemeColor('#475569', isLight);
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(pr.x1 + 6, pr.topY + 1);
      ctx.lineTo(pr.x1 + 6, pr.floorY);
      ctx.moveTo(pr.x2 - 6, pr.topY + 1);
      ctx.lineTo(pr.x2 - 6, pr.floorY);
      ctx.stroke();
      break;
    case 'low_barbell':
      ctx.strokeStyle = resolveThemeColor('#475569', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pr.barX, pr.barY - 30);
      ctx.lineTo(pr.barX, pr.floorY);
      ctx.stroke();
      ctx.fillStyle = resolveThemeColor('#64748b', isLight);
      ctx.fillRect(pr.barX - 4, pr.barY - 2, 8, 6);
      break;
    case 'plyo_box':
      ctx.fillStyle = resolveThemeColor('#1e293b', isLight);
      ctx.strokeStyle = resolveThemeColor('#f59e0b', isLight);
      ctx.lineWidth = 3;
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
      break;
    case 'ski_erg':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(148, 18);
      ctx.lineTo(148, 170);
      ctx.stroke();
      break;
    case 'wall_ball_rig':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pr.wallX, -48);
      ctx.lineTo(pr.wallX, 170);
      ctx.stroke();
      ctx.strokeStyle = resolveThemeColor(pr.hit ? '#bef264' : '#f43f5e', isLight);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(pr.wallX - 3, pr.targetY - 7);
      ctx.lineTo(pr.wallX - 3, pr.targetY + 7);
      ctx.stroke();
      break;
    case 'run_track':
    case 'march_track': {
      const trackOffset = (pr.timestamp * 0.22) % 40;
      ctx.strokeStyle = resolveThemeColor('rgba(56, 189, 248, 0.35)', isLight);
      ctx.lineWidth = 2;
      for (let gx = 24; gx < 180; gx += 40) {
        const lx = 180 - ((gx + trackOffset) % 160);
        ctx.beginPath();
        ctx.moveTo(lx, 176);
        ctx.lineTo(lx - 14, 176);
        ctx.stroke();
      }
      break;
    }
    case 'shuttle_track': {
      const trackOffset = (pr.timestamp * 0.22) % 40;
      ctx.strokeStyle = resolveThemeColor('rgba(56, 189, 248, 0.35)', isLight);
      ctx.lineWidth = 2;
      for (let gx = 24; gx < 180; gx += 40) {
        const lx = 180 - ((gx + trackOffset) % 160);
        ctx.beginPath();
        ctx.moveTo(lx, 176);
        ctx.lineTo(lx - 14, 176);
        ctx.stroke();
      }
      ctx.strokeStyle = resolveThemeColor('#bef264', isLight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(135, 162);
      ctx.lineTo(135, 174);
      ctx.stroke();
      ctx.fillStyle = resolveThemeColor('#f97316', isLight);
      ctx.beginPath();
      ctx.moveTo(135, 161);
      ctx.lineTo(131, 169);
      ctx.lineTo(139, 169);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'jump_lines':
      ctx.strokeStyle = resolveThemeColor('rgba(190, 242, 100, 0.35)', isLight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, 148); ctx.lineTo(44, 164);
      ctx.moveTo(152, 148); ctx.lineTo(152, 164);
      ctx.stroke();
      break;
    case 'jump_rope':
      if (Math.sin(pr.ropePhase) < 0) drawJumpRope(ctx, pr, true, isLight);
      break;
  }
};

const drawDumbbell = (ctx, pr, isLight, isFar) => {
  ctx.save();
  ctx.translate(pr.x, pr.y);
  if (pr.angle) ctx.rotate(pr.angle);
  const hw = isFar ? 6 : 7;
  const pw = isFar ? 3.5 : 4;
  const ph = isFar ? 9 : 10;
  ctx.strokeStyle = resolveThemeColor(isFar ? '#64748b' : '#cbd5e1', isLight);
  ctx.lineWidth = isFar ? 2 : 2.4;
  ctx.beginPath();
  ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0);
  ctx.stroke();
  ctx.fillStyle = resolveThemeColor(isFar ? '#b45309' : '#f59e0b', isLight);
  ctx.strokeStyle = resolveThemeColor(isFar ? '#92400e' : '#fef08a', isLight);
  ctx.lineWidth = isFar ? 1.2 : 1.4;
  ctx.fillRect(-hw - pw + 0.5, -ph / 2, pw, ph);
  ctx.strokeRect(-hw - pw + 0.5, -ph / 2, pw, ph);
  ctx.fillRect(hw - 0.5, -ph / 2, pw, ph);
  ctx.strokeRect(hw - 0.5, -ph / 2, pw, ph);
  ctx.restore();
};

const drawMidgroundProp = (ctx, pr, frame, isLight) => {
  switch (pr.type) {
    case 'bike_erg':
      drawBikeErg(ctx, pr, isLight);
      break;
    case 'row_erg':
      ctx.strokeStyle = resolveThemeColor('#334155', isLight);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(28, 152);
      ctx.lineTo(168, 152);
      ctx.moveTo(108, 152);
      ctx.lineTo(116, 140);
      ctx.moveTo(pr.hipX - 9, 148);
      ctx.lineTo(pr.hipX + 9, 148);
      ctx.stroke();
      ctx.strokeStyle = resolveThemeColor('#38bdf8', isLight);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(158, 122, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(154, 116);
      ctx.lineTo(pr.handX, pr.handY);
      ctx.stroke();
      break;
    case 'ski_erg':
      ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(146, 22);
      ctx.lineTo(pr.handX, pr.handY);
      ctx.stroke();
      break;
    case 'dumbbell_far':
      drawDumbbell(ctx, pr, isLight, true);
      break;
    case 'dumbbell_near':
      if (pr.midground) {
        drawDumbbell(ctx, pr, isLight, false);
      }
      break;
    case 'kettlebell':
      if (isKettlebellMidground(pr, frame)) {
        drawKettlebell(ctx, pr, isLight);
      }
      break;
    case 'gym_ring':
      if (pr.midground) {
        drawGymRingHoop(ctx, pr.cx, pr.cy, pr.r, isLight, pr.rx, pr.tilt);
      }
      break;
    case 'med_ball':
      if (pr.midground) {
        drawMedBall(ctx, pr, isLight);
      }
      break;
    case 'barbell_bar':
      ctx.strokeStyle = resolveThemeColor('#cbd5e1', isLight);
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pr.x1, pr.y1);
      ctx.lineTo(pr.x2, pr.y2);
      ctx.stroke();
      break;
  }
};

const drawForegroundProp = (ctx, pr, frame, isLight) => {
  switch (pr.type) {
    case 'gym_ring':
      if (!pr.midground) {
        drawGymRingHoop(ctx, pr.cx, pr.cy, pr.r, isLight, pr.rx, pr.tilt);
      }
      break;
    case 'parallel_bars':
      ctx.lineCap = 'round';
      ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pr.x1, pr.barY);
      ctx.lineTo(pr.x2, pr.barY);
      ctx.stroke();
      break;
    case 'side_rig':
      ctx.fillStyle = resolveThemeColor('#0f172a', isLight);
      ctx.strokeStyle = resolveThemeColor('#38bdf8', isLight);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pr.barX, pr.barY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'low_barbell':
      ctx.fillStyle = resolveThemeColor('#cbd5e1', isLight);
      ctx.beginPath();
      ctx.arc(pr.barX, pr.barY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'kettlebell':
      if (!isKettlebellMidground(pr, frame)) {
        drawKettlebell(ctx, pr, isLight);
      }
      break;
    case 'barbell_end':
      drawLoad(ctx, pr.x, pr.y, pr.r, isLight);
      break;
    case 'floor_barbell': {
      const r = pr.r || 10;
      ctx.fillStyle = resolveThemeColor('#18181b', isLight);
      ctx.strokeStyle = resolveThemeColor('#f59e0b', isLight);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = resolveThemeColor('#94a3b8', isLight);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = resolveThemeColor('#e2e8f0', isLight);
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crossfit_barbell_front': {
      const y = pr.y;
      // Full 7ft steel bar shaft & sleeves
      ctx.strokeStyle = resolveThemeColor('#cbd5e1', isLight);
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(172, y);
      ctx.stroke();
      // Inner metal collars & thick bumper plates viewed edge-on
      const drawSidePlate = (plateX, collarX) => {
        ctx.fillStyle = resolveThemeColor('#94a3b8', isLight);
        ctx.fillRect(collarX - 1.5, y - 5, 3, 10);
        ctx.fillStyle = resolveThemeColor('#18181b', isLight);
        ctx.strokeStyle = resolveThemeColor('#f59e0b', isLight);
        ctx.lineWidth = 1.8;
        ctx.fillRect(plateX - 3.5, y - 16, 7, 32);
        ctx.strokeRect(plateX - 3.5, y - 16, 7, 32);
      };
      drawSidePlate(42, 48);
      drawSidePlate(158, 152);
      break;
    }
    case 'med_ball':
      if (!pr.midground) {
        drawMedBall(ctx, pr, isLight);
      }
      break;
    case 'dumbbell_near':
      if (!pr.midground) {
        drawDumbbell(ctx, pr, isLight, false);
      }
      break;
    case 'wall_ball_rig':
      ctx.fillStyle = resolveThemeColor('#f59e0b', isLight);
      ctx.strokeStyle = resolveThemeColor('#fef08a', isLight);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pr.ballX, pr.ballY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = isLight ? '#e0f2fe' : '#0c4a6e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pr.ballX - 6, pr.ballY);
      ctx.lineTo(pr.ballX + 6, pr.ballY);
      ctx.stroke();
      break;
    case 'strike_ring':
      ctx.strokeStyle = resolveThemeColor('#bef264', isLight);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'jump_rope':
      drawJumpRope(ctx, pr, false, isLight);
      break;
    case 'hud_badge': {
      ctx.font = 'bold 10px "Fira Code", monospace';
      const w = ctx.measureText(pr.text).width + 10;
      ctx.fillStyle = resolveThemeColor(pr.second ? 'rgba(56, 189, 248, 0.18)' : 'rgba(190, 242, 100, 0.18)', isLight);
      ctx.fillRect(14, 14, w, 18);
      ctx.fillStyle = resolveThemeColor(pr.second ? '#38bdf8' : '#bef264', isLight);
      ctx.fillText(pr.text, 19, 26);
      break;
    }
  }
};

const drawFloor = (ctx, y, isLight) => {
  ctx.strokeStyle = resolveThemeColor('#334155', isLight);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(16, y);
  ctx.lineTo(184, y);
  ctx.stroke();
};

function renderFrame(ctx, frame) {
  const isLight = isLightTheme();
  if (frame.scale && frame.scale !== 1) {
    ctx.save();
    const ox = frame.originX ?? 100;
    const oy = frame.originY ?? frame.floorY;
    ctx.translate(ox, oy);
    ctx.scale(frame.scale, frame.scale);
    ctx.translate(-ox, -oy);
  }
  drawFloor(ctx, frame.floorY, isLight);
  for (const pr of frame.props) drawBackgroundProp(ctx, pr, frame, isLight);

  const hasFade = frame.alpha != null && frame.alpha < 1;
  if (hasFade) {
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, frame.alpha));
  }

  if (frame.view === 'front') {
    drawFrontTorso(ctx, frame.frontTorso, isLight, false);
    for (const pr of frame.props) if (!pr.behindLegs) drawMidgroundProp(ctx, pr, frame, isLight);
    const backArms = frame.limbs.filter((l) => l.name.startsWith('arm') && (l.zOrder ?? 0) < 0).sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
    for (const limb of backArms) drawLimb(ctx, limb, isLight);
    for (const pr of frame.props) if (pr.behindLegs) drawMidgroundProp(ctx, pr, frame, isLight);
    const frontLegs = frame.limbs.filter((l) => !l.name.startsWith('arm')).sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
    for (const limb of frontLegs) drawLimb(ctx, limb, isLight);
    const frontArms = frame.limbs.filter((l) => l.name.startsWith('arm') && (l.zOrder ?? 0) >= 0).sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
    for (const limb of frontArms) drawLimb(ctx, limb, isLight);
    drawHead(ctx, frame.frontTorso.headX, frame.frontTorso.headY, 9.8, isLight);
  } else {
    const isFar = (l) => l.name.endsWith('B') || (l.zOrder ?? 0) < 0;
    for (const limb of frame.limbs) if (isFar(limb)) drawLimb(ctx, limb, isLight);
    for (const pr of frame.props) drawMidgroundProp(ctx, pr, frame, isLight);
    drawSideTorso(ctx, frame.torso, isLight);
    for (const limb of frame.limbs) if (!isFar(limb) && !limb.name.startsWith('arm')) drawLimb(ctx, limb, isLight);
    for (const pr of frame.props) if (pr.type === 'parallettes') drawParallettes(ctx, pr, isLight);
    for (const limb of frame.limbs) if (!isFar(limb) && limb.name.startsWith('arm')) drawLimb(ctx, limb, isLight);
  }

  for (const pr of frame.props) drawForegroundProp(ctx, pr, frame, isLight);
  if (hasFade) {
    ctx.restore();
  }
  if (frame.scale && frame.scale !== 1) {
    ctx.restore();
  }
}

renderFrame.isLightTheme = isLightTheme;
renderFrame.resolveThemeColor = resolveThemeColor;
globalThis.renderFrame = renderFrame;
export { renderFrame };
