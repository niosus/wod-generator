function validatePose(poseType, numSteps = 120, cycleMs = null) {
  const poseCompute = (this && typeof this.computePose === 'function') ? this.computePose.bind(this) : globalThis.computePose;
  if (!cycleMs) {
    if (poseType === 'man_maker') cycleMs = 6400;
    else if (poseType === 'stepping_lunge' || poseType === 'box_step_up') cycleMs = 3800;
    else if (poseType === 'burpee_6stage' || poseType === 'devil_press' || poseType === 'athletic_up_down') cycleMs = 3200;
    else cycleMs = 3800;
  }
  const violations = [];
  let prevFrame = null;
  for (let i = 0; i < numSteps; i++) {
    const f = poseCompute(poseType, (i / numSteps) * cycleMs);

    if (f.view === 'side') {
      const torsoLen = Math.hypot(f.torso.shoulderX - f.torso.hipX, f.torso.shoulderY - f.torso.hipY);
      if (Math.abs(torsoLen - L_TORSO) > 0.05) violations.push(`frame ${i}: torso ${torsoLen.toFixed(2)}px != ${L_TORSO}px`);
      const neckLen = Math.hypot(f.torso.headX - f.torso.shoulderX, f.torso.headY - f.torso.shoulderY);
      if (Math.abs(neckLen - L_NECK) > 0.05) violations.push(`frame ${i}: neck ${neckLen.toFixed(2)}px != ${L_NECK}px`);
      if (f.torso.headY + 9.5 > f.floorY + 1.0) violations.push(`frame ${i}: head penetrates floor`);
      if (f.torso.shoulderY > f.floorY + 0.5 || f.torso.hipY > f.floorY + 0.5) violations.push(`frame ${i}: torso penetrates floor`);
    } else {
      const midSX = (f.frontTorso.leftShoulderX + f.frontTorso.rightShoulderX) / 2;
      const midSY = ((f.frontTorso.leftShoulderY ?? f.frontTorso.shoulderY) + (f.frontTorso.rightShoulderY ?? f.frontTorso.shoulderY)) / 2;
      const midHX = (f.frontTorso.leftHipX + f.frontTorso.rightHipX) / 2;
      const midHY = ((f.frontTorso.leftHipY ?? f.frontTorso.hipY) + (f.frontTorso.rightHipY ?? f.frontTorso.hipY)) / 2;
      const torsoH = Math.hypot(midHX - midSX, midHY - midSY);
      if (Math.abs(torsoH - L_TORSO) > 0.05) violations.push(`frame ${i}: front torso ${torsoH.toFixed(2)}px != ${L_TORSO}px`);
    }

    for (const limb of f.limbs) {
      const d1 = Math.hypot(limb.jx - limb.x1, limb.jy - limb.y1, (limb.jz ?? 0) - (limb.z1 ?? 0));
      const d2 = Math.hypot(limb.x2 - limb.jx, limb.y2 - limb.jy, (limb.z2 ?? 0) - (limb.jz ?? 0));
      const exp1 = limb.kind === 'leg' ? L_THIGH : L_UPPER_ARM;
      const exp2 = limb.kind === 'leg' ? L_SHIN : L_FOREARM;
      if (Math.abs(d1 - exp1) > 0.1 || Math.abs(d2 - exp2) > 0.1) {
        violations.push(`frame ${i} (${limb.name}): segments ${d1.toFixed(1)}/${d2.toFixed(1)} != ${exp1}/${exp2}`);
      }
      if (limb.jy > f.floorY + 1.0 || limb.y2 > f.floorY + 1.0) {
        violations.push(`frame ${i} (${limb.name}): limb penetrates floor`);
      }
      const boxProp = f.props.find((p) => p.type === 'plyo_box');
      if (boxProp && limb.kind === 'leg' && limb.x2 > boxProp.x + 1 && limb.x2 < boxProp.x + boxProp.w - 1 && limb.y2 > boxProp.y + 1) {
        violations.push(`frame ${i} (${limb.name}): foot inside plyo box`);
      }
      // Side-view knee non-hyperextension invariant:
      // In side view (both upright facing-right and inverted facing-left), anatomical knee flexion has cross >= 0.
      if (f.view === 'side' && limb.kind === 'leg') {
        const facing = (f.torso && f.torso.facingDir === -1 && Math.sin(f.torso.spineAngle) < 0) ? -1 : 1;
        const tx = limb.jx - limb.x1, ty = limb.jy - limb.y1;
        const sx = limb.x2 - limb.jx, sy = limb.y2 - limb.jy;
        const cross = (tx * sy - ty * sx) * facing;
        if (cross < -35) {
          violations.push(`frame ${i} (${limb.name}): knee hyperextension (cross=${cross.toFixed(1)})`);
        }
      }
    }

    if (prevFrame) {
      for (let li = 0; li < f.limbs.length; li++) {
        const cur = f.limbs[li];
        const prv = prevFrame.limbs[li];
        if (!prv) continue;
        const jump = Math.hypot(cur.jx - prv.jx, cur.jy - prv.jy, (cur.jz ?? 0) - (prv.jz ?? 0));
        if (jump > 18) violations.push(`frame ${i} (${cur.name}): joint jumped ${jump.toFixed(1)}px`);
      }
    }
    prevFrame = f;
  }
  return { poseType, ok: violations.length === 0, violations };
}

function validateAllPoses(poseTypes) {
  const poseValidator = (this && typeof this.validatePose === 'function') ? this.validatePose.bind(this) : validatePose;
  const results = {};
  let passed = 0;
  for (const pt of poseTypes) {
    const r = poseValidator(pt);
    results[pt] = r;
    if (r.ok) passed++;
    else console.warn(`[Kinematics] ${pt}: ${r.violations.length} violation(s)`, r.violations.slice(0, 5));
  }
  return { total: poseTypes.length, passed, results };
}

globalThis.validatePose = validatePose;
globalThis.validateAllPoses = validateAllPoses;
