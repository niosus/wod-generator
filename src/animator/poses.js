/**
 * Pure 2D Skeletal Kinematics Pose Computation
 * Computes pure skeleton frames for all WODROLL movements
 */
import {
  L_TORSO,
  L_THIGH,
  L_SHIN,
  L_UPPER_ARM,
  L_FOREARM,
  L_NECK
} from './constants.js';
import { KinematicMath } from './math.js';

function _computePose(poseType, timestamp, options = null) {
  const periodMs = 2400;
  const normT = ((timestamp % periodMs) + periodMs) % periodMs / periodMs;
  const theta = normT * Math.PI * 2;
  const p = 0.5 - 0.5 * Math.cos(theta); // 0 -> 1 -> 0 smooth cosine wave
  const wantLeft = Boolean(options && options.side === 'left');

  const frame = {
    poseType,
    view: 'side',
    floorY: 170,
    torso: null,       // { hipX, hipY, shoulderX, shoulderY, headX, headY, facingDir }
    frontTorso: null,  // { leftShoulderX, rightShoulderX, shoulderY, leftHipX, rightHipX, hipY, headX, headY }
    limbs: [],         // { name, kind: 'leg'|'arm', x1, y1, jx, jy, x2, y2, color1, color2, width, endType, footDir, surfaceY }
    props: []          // custom equipment / environment primitives to render
  };

  const addLimb = (name, kind, x1, y1, jx, jy, x2, y2, color1, color2, width, endType = 'hand', footDir = 1, surfaceY = null, z1 = 0, jz = 0, z2 = 0, zOrder = 0) => {
    frame.limbs.push({ name, kind, x1, y1, jx, jy, x2, y2, color1, color2, width, endType, footDir, surfaceY: surfaceY ?? frame.floorY, z1, jz, z2, zOrder });
  };

  // ===========================================================================
  // 1. BAR & RING PULLING / MUSCLE-UP EXERCISES
  //    - pullup_front: Front-view high bar (barY=16, floorY=192) so athlete starts
  //      in a full straight-arm, straight-leg dead hang well above the floor.
  //    - muscle_up_front & ring_muscle_up_front: Side-view with vertical camera
  //      tracking so athlete starts in a full dead hang above the floor, performs
  //      an authentic kip & hip-to-bar pull, and transitions shoulders forward
  //      over the bar/rings with elbows bending strictly backward (never crossing!).
  // ===========================================================================
  if (poseType === 'pullup_front' || poseType === 'chest_to_bar_front' || poseType === 'chin_up_front' || poseType === 'bar_hang') {
    frame.view = 'front';
    frame.floorY = 192;
    const isChestToBar = poseType === 'chest_to_bar_front';
    const isChinUp = poseType === 'chin_up_front';
    const isBarHang = poseType === 'bar_hang';
    const barY = isChestToBar ? 38 : 16;
    frame.props.push({ type: 'rig_uprights', barY, floorY: 192 });

    // Vertical range: pull/chin clears chin; chest-to-bar pulls sternum clearly to bar (shoulders high above bar)
    const shoulderY = isBarHang
      ? 62
      : (isChestToBar ? this.lerp(80, 24, p) : this.lerp(62, 20, p));
    const hipY = shoulderY + L_TORSO;
    const leftHipX = 91, rightHipX = 109;

    if (isBarHang) {
      const leftShoulderX = 85;
      const rightShoulderX = 115;
      frame.frontTorso = {
        leftShoulderX, rightShoulderX, shoulderY,
        leftHipX, rightHipX, hipY,
        headX: 100, headY: shoulderY - 14
      };
      const leftHandX = 76, rightHandX = 124, handY = barY;
      const armL = this.solveFrontArm(leftShoulderX, shoulderY, leftHandX, handY, true);
      const armR = this.solveFrontArm(rightShoulderX, shoulderY, rightHandX, handY, false);
      addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    } else if (isChinUp) {
      // Chin-ups: narrow underhand grip, elbows track directly in front of the ribcage staying ~20cm (20px) apart
      const leftShoulderX = 85, rightShoulderX = 115;
      frame.frontTorso = {
        leftShoulderX, rightShoulderX, shoulderY,
        leftHipX, rightHipX, hipY,
        headX: 100, headY: shoulderY - 14
      };

      const leftHandX = 90, rightHandX = 110, handY = barY;
      const leftElbowX = 90, rightElbowX = 110;

      const elbowY = (shoulderY * shoulderY - 280) / (2 * (shoulderY - 16));
      const remZ = 576 - Math.pow(16 - elbowY, 2);
      const elbowZ = Math.sqrt(Math.max(0, remZ));

      addLimb('armL', 'arm', leftShoulderX, shoulderY, leftElbowX, elbowY, leftHandX, handY, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, elbowZ, 0);
      addLimb('armR', 'arm', rightShoulderX, shoulderY, rightElbowX, elbowY, rightHandX, handY, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, elbowZ, 0);
    } else if (isChestToBar) {
      // Chest-to-Bar Pull-Up: shoulders pull well above barY=38 so mid-chest meets the bar
      // while keeping elbows driving downward and slightly behind torso (3D Z) without flipping up.
      const leftShoulderX = this.lerp(85, 87, p);
      const rightShoulderX = this.lerp(115, 113, p);
      frame.frontTorso = {
        leftShoulderX, rightShoulderX, shoulderY,
        leftHipX, rightHipX, hipY,
        headX: 100, headY: shoulderY - 14
      };

      const leftHandX = 76, rightHandX = 124, handY = barY;
      const inPlaneScale = this.lerp(1.0, 0.28, this.smoothstep(this.clamp((barY + 6 - shoulderY) / 22, 0, 1)));
      const solveC2BArm = (sx, sy, hx, hy, isLeft) => {
        let dx = hx - sx;
        let dy = hy - sy;
        let dist = Math.hypot(dx, dy);
        const minDist = Math.abs(L_UPPER_ARM - L_FOREARM) + 2.0;
        const maxDist = (L_UPPER_ARM + L_FOREARM) - 0.8;
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; dist = maxDist; }
        else if (dist < minDist) { dx = (dx / dist) * minDist; dy = (dy / dist) * minDist; dist = minDist; }
        const ux = dx / dist, uy = dy / dist;
        const a = (L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM + dist * dist) / (2 * dist);
        const h = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - a * a));
        const mx = sx + a * ux, my = sy + a * uy;
        const px = isLeft ? uy : -uy;
        const py = isLeft ? -ux : ux;
        return {
          jx: mx + px * h * inPlaneScale,
          jy: my + py * h * inPlaneScale,
          jz: -h * Math.sqrt(Math.max(0, 1 - inPlaneScale * inPlaneScale)),
          ex: sx + dx,
          ey: sy + dy
        };
      };
      const armL = solveC2BArm(leftShoulderX, shoulderY, leftHandX, handY, true);
      const armR = solveC2BArm(rightShoulderX, shoulderY, rightHandX, handY, false);
      addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, armL.jz, 0);
      addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, armR.jz, 0);
    } else {
      // Strict Pull-up:
      // - Active hang at bottom (scapular elevation/upward rotation: leftShoulderX=85, rightShoulderX=115)
      // - Scapular retraction & depression during pull (shoulders pack inward to 87 & 113)
      // - Natural overhand grip ~1.25x biacromial width (leftHandX=76, rightHandX=124, span=48px)
      // - Elbows drive down and laterally in the natural scapular plane, finishing beside the ribcage
      // - Chin cleanly clears the bar (shoulderY=20, chin Y=15.8 < 16)
      const leftShoulderX = this.lerp(85, 87, p);
      const rightShoulderX = this.lerp(115, 113, p);
      frame.frontTorso = {
        leftShoulderX, rightShoulderX, shoulderY,
        leftHipX, rightHipX, hipY,
        headX: 100, headY: shoulderY - 14
      };

      const leftHandX = 76, rightHandX = 124, handY = barY;
      const armL = this.solveFrontArm(leftShoulderX, shoulderY, leftHandX, handY, true);
      const armR = this.solveFrontArm(rightShoulderX, shoulderY, rightHandX, handY, false);
      addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    }

    // Core braced in athletic gymnastics hollow-body: zipped legs (footLX=98, footRX=102, toes pointed)
    // 63.2px leg extension staying well above floorY=192 even at bottom of dead hang (footY=171.2 < 192)
    const targetFootY = hipY + 63.2;
    const legL = this.solveFrontLeg(leftHipX, hipY, 98, targetFootY, true);
    const legR = this.solveFrontLeg(rightHipX, hipY, 102, targetFootY, false);
    addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    return frame;
  }

  // Ring Pull-Ups & Ring Support Hold (Front View)
  if (poseType === 'ring_pullup' || poseType === 'ring_support_hold') {
    frame.view = 'front';
    frame.floorY = 192;
    const breath = Math.sin(theta * 2) * 0.5;
    const isSupport = poseType === 'ring_support_hold';
    const ringY = isSupport ? 100.5 : 34;
    const handTargetY = isSupport ? 105.5 : 34;
    const leftRingX = isSupport ? 78 : 76;
    const rightRingX = isSupport ? 122 : 124;

    frame.props.push({ type: 'overhead_beam', x1: 28, y1: 10, x2: 172, y2: 10 });
    frame.props.push({
      type: 'gym_ring', strapX: leftRingX, strapY: 10, cx: leftRingX, cy: ringY, r: 7.5,
      ...(isSupport ? { rx: 4.2, tilt: -0.14 } : { rx: 4.5, tilt: -0.22, midground: true })
    });
    frame.props.push({
      type: 'gym_ring', strapX: rightRingX, strapY: 10, cx: rightRingX, cy: ringY, r: 7.5,
      ...(isSupport ? { rx: 4.2, tilt: 0.14 } : { rx: 4.5, tilt: 0.22, midground: true })
    });

    const shoulderY = isSupport ? (58.2 + breath * 0.25) : this.lerp(81, 39, p);
    const hipY = shoulderY + L_TORSO;
    const leftShoulderX = isSupport ? 86 : this.lerp(85, 87, p);
    const rightShoulderX = isSupport ? 114 : this.lerp(115, 113, p);
    const leftHipX = 91, rightHipX = 109;

    frame.frontTorso = {
      leftShoulderX, rightShoulderX, shoulderY,
      leftHipX, rightHipX, hipY,
      headX: 100, headY: shoulderY - 14
    };

    if (isSupport) {
      const armL = this.solveFrontArm(leftShoulderX, shoulderY, leftRingX, handTargetY, true);
      const armR = this.solveFrontArm(rightShoulderX, shoulderY, rightRingX, handTargetY, false);
      addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    } else {
      // Smooth 3D elbow drive downward/back as chest pulls up between the rings
      const inPlaneScale = this.lerp(1.0, 0.36, this.smoothstep(this.clamp((ringY + 14 - shoulderY) / 22, 0, 1)));
      const solveRingPullArm = (sx, sy, hx, hy, isLeft) => {
        let dx = hx - sx;
        let dy = hy - sy;
        let dist = Math.hypot(dx, dy);
        const minDist = Math.abs(L_UPPER_ARM - L_FOREARM) + 2.0;
        const maxDist = (L_UPPER_ARM + L_FOREARM) - 0.8;
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; dist = maxDist; }
        else if (dist < minDist) { dx = (dx / dist) * minDist; dy = (dy / dist) * minDist; dist = minDist; }
        const ux = dx / dist, uy = dy / dist;
        const a = (L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM + dist * dist) / (2 * dist);
        const h = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - a * a));
        const mx = sx + a * ux, my = sy + a * uy;
        const px = isLeft ? uy : -uy;
        const py = isLeft ? -ux : ux;
        return {
          jx: mx + px * h * inPlaneScale,
          jy: my + py * h * inPlaneScale,
          jz: -h * Math.sqrt(Math.max(0, 1 - inPlaneScale * inPlaneScale)),
          ex: sx + dx,
          ey: sy + dy
        };
      };
      const armL = solveRingPullArm(leftShoulderX, shoulderY, leftRingX, ringY, true);
      const armR = solveRingPullArm(rightShoulderX, shoulderY, rightRingX, ringY, false);
      addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, armL.jz, 0);
      addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand', 1, null, 0, armR.jz, 0);
    }

    const targetFootY = hipY + (isSupport ? 63.2 : 60.5);
    const legL = this.solveFrontLeg(leftHipX, hipY, 98, targetFootY, true);
    const legR = this.solveFrontLeg(rightHipX, hipY, 102, targetFootY, false);
    addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    return frame;
  }

  if (poseType === 'muscle_up_front' || poseType === 'ring_muscle_up_front') {
    const isRingMU = poseType === 'ring_muscle_up_front';
    const barX = 104;
    const barY = 74; // 100% stationary bar & rings inside a static environment!
    frame.scale = 0.72;
    frame.originX = 100;
    frame.originY = 4;
    frame.floorY = 246; // Stationary floor below full dead hang (footY=231 < 246)

    // 6-stage Muscle-Up in Side View with 100% stationary barY = 74:
    // Keeping relSX < 0 (shoulder slightly behind bar/ring center while head/chest transition over it)
    // guarantees dx = barX - shoulderX > 0 across all phases so solveIK(bendSide=1) never flips or crosses!
    const muKF = [
      // 0: Full straight-arm, straight-leg dead hang well above stationary floor
      { relSX: -2, relSY: 47, spine: -1.56, thigh: 1.56, shin: 1.58, neck: 0.05 },
      // 1: Kip swing & lat press (arms straight pressing down on bar/rings, hips load & drive forward)
      { relSX: -14, relSY: 44, spine: -1.32, thigh: 0.92, shin: 1.06, neck: 0.10 },
      // 2: Explosive hip-to-bar pull (elbows drive back behind ribs)
      { relSX: -18, relSY: 14, spine: -1.16, thigh: 0.62, shin: 0.88, neck: 0.16 },
      // 3: Fast forward turnover into bottom of dip above bar/rings (shoulders above hands, elbows back!)
      { relSX: -10, relSY: -10, spine: -1.24, thigh: 1.42, shin: 1.62, neck: 0.18 },
      // 4: Locked-out top support press above bar/rings (arms fully extended 46.5px above stationary bar/rings!)
      { relSX: -3, relSY: -46, spine: -1.52, thigh: 1.52, shin: 1.56, neck: 0.08 },
      // 5: Controlled eccentric return to hang
      { relSX: -14, relSY: 20, spine: -1.42, thigh: 1.48, shin: 1.56, neck: 0.08 }
    ];
    const st = this.sampleKeyframes(muKF, normT);

    if (isRingMU) {
      frame.props.push({ type: 'overhead_beam', x1: 48, y1: 6, x2: 160, y2: 6 });
      frame.props.push({ type: 'gym_ring', strapX: barX, strapY: 6, cx: barX, cy: barY, r: 8.5 });
    } else {
      frame.props.push({ type: 'side_rig', postX: 38, barX, barY, floorY: frame.floorY });
    }

    const shoulderX = barX + st.relSX;
    const shoulderY = barY + st.relSY;
    frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, st.spine, 1, st.neck);
    const { hipX, hipY } = frame.torso;

    const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);
    const legBack = this.solveFK(hipX - 2, hipY, st.thigh, st.shin, L_THIGH, L_SHIN);
    const legFront = this.solveFK(hipX, hipY, st.thigh, st.shin, L_THIGH, L_SHIN);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 300);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 300);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 1B. SIDE-VIEW HANGING KNEE RAISES & TOES-TO-BAR (T2B)
  // ===========================================================================
  if (poseType === 'knee_raise_side' || poseType === 'ring_knee_raise' || poseType === 'knees_to_elbows_side' || poseType === 'toes_to_bar_side') {
    frame.floorY = 188;
    const barX = 96, barY = 20;
    if (poseType === 'ring_knee_raise') {
      frame.props.push({ type: 'overhead_beam', x1: 44, y1: 6, x2: 152, y2: 6 });
      frame.props.push({ type: 'gym_ring', strapX: barX, strapY: 6, cx: barX, cy: barY, r: 8 });
    } else {
      frame.props.push({ type: 'side_rig', postX: 44, barX, barY, floorY: 188 });
    }

    if (poseType === 'toes_to_bar_side') {
      // Kipping Toes-to-Bar:
      // Straight arms press back on the bar (armAngle: 1.60 -> 2.46 rad) while hips rise & compress
      // (torsoDownAngle: 1.54 -> 0.72 rad) so hip = (92.8, 84.8) is 60.9px below bar (96, 20).
      // Legs sweep up with natural anatomical knee flexion (shinAngle >= thighAngle at all times, zero hyperextension!)
      const armAngle = this.lerp(1.60, 2.46, p);
      const armFK = this.solveFK(barX, barY, armAngle, armAngle + 0.04, L_FOREARM, L_UPPER_ARM);
      const shoulderX = armFK.ex;
      const shoulderY = armFK.ey;

      const torsoDownAngle = this.lerp(1.54, 0.72, p);
      const spineAngle = torsoDownAngle + Math.PI;
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, -0.15);
      const { hipX, hipY } = frame.torso;

      const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

      // Keep shinAngle >= thighAngle throughout the entire sweep so knees never hyperextend backward!
      const thighAngle = this.lerp(1.56, -1.66, p);
      const shinAngle = this.lerp(1.62, -1.36, p);
      const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      if (p > 0.88) {
        frame.props.push({ type: 'strike_ring', x: barX + 1, y: barY + 1, r: 10 });
      }
    } else if (poseType === 'knees_to_elbows_side') {
      // Hanging Knees-to-Elbows:
      // Arms press straight back against the bar while hips scoop upward and forward, flexing
      // tightly at the hips & knees until knees cleanly touch the elbows without knee hyperextension.
      const armAngle = this.lerp(1.60, 2.35, p);
      const armFK = this.solveFK(barX, barY, armAngle, armAngle + 0.04, L_FOREARM, L_UPPER_ARM);
      const shoulderX = armFK.ex;
      const shoulderY = armFK.ey;

      const torsoDownAngle = this.lerp(1.54, 0.05, p);
      const spineAngle = torsoDownAngle + Math.PI;
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, -0.10);
      const { hipX, hipY } = frame.torso;

      const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

      const thighAngle = this.lerp(1.56, -2.52, p);
      const shinAngle = this.lerp(1.62, 0.28, p);
      const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      if (p > 0.88) {
        frame.props.push({ type: 'strike_ring', x: arm.jx, y: arm.jy, r: 9 });
      }
    } else {
      // Hanging Knee Raise: active hang from bar, knees tuck smoothly above hip crease with exact 32+32=64px segments
      const shoulderX = this.lerp(95, 86, p);
      const shoulderY = this.lerp(66, 62, p);
      const spineAngle = this.lerp(-1.55, -1.72, p);
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.08);
      const { hipX, hipY } = frame.torso;

      const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

      const thighAngle = this.lerp(1.56, -0.38, p);
      const shinAngle = this.lerp(1.60, 1.72, p);
      const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
    }
    return frame;
  }

  // ===========================================================================
  // 2. PUSH-UPS, KNEE PUSH-UPS, HAND-RELEASE, DIAMOND, RING, PBAR & BOX PUSH-UPS
  // ===========================================================================
  if (
    poseType === 'pushup' ||
    poseType === 'knee_pushup' ||
    poseType === 'hand_release_pushup' ||
    poseType === 'diamond_pushup' ||
    poseType === 'ring_pushup' ||
    poseType === 'pbar_pushup' ||
    poseType === 'box_decline_pushup' ||
    poseType === 'ring_fallout'
  ) {
    frame.floorY = 168;

    if (poseType === 'knee_pushup') {
      // Knee Push-Ups: pivot point is planted knees on the floor (66, 164)
      // with shins and feet angled up into the air behind the knees!
      frame.floorY = 166;
      const kneeX = 66, kneeY = 164;
      const handX = 138, handY = 162;
      const plankAngle = this.lerp(-0.46, -0.14, p);
      const hipX = kneeX + Math.cos(plankAngle) * L_THIGH;
      const hipY = kneeY + Math.sin(plankAngle) * L_THIGH;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, -0.05);
      const { shoulderX, shoulderY } = frame.torso;

      // Feet/shins angled up into the air behind the planted knees (elevated ~20px off deck)
      const shinAngle = 3.82;
      const ankleX = kneeX + Math.cos(shinAngle) * L_SHIN;
      const ankleY = kneeY + Math.sin(shinAngle) * L_SHIN;

      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, kneeX - 2, kneeY, ankleX - 2, ankleY, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, kneeX, kneeY, ankleX, ankleY, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    if (poseType === 'hand_release_pushup') {
      const hrKFs = [
        { t: 0.00, plankAngle: -0.35, ankleY: 155.5, handX: 136, handY: 165, neck: -0.05 },
        { t: 0.30, plankAngle: -0.04, ankleY: 159.5, handX: 136, handY: 165, neck: -0.18 },
        { t: 0.42, plankAngle: -0.04, ankleY: 159.5, handX: 130, handY: 160, neck: -0.18 },
        { t: 0.54, plankAngle: -0.04, ankleY: 159.5, handX: 136, handY: 165, neck: -0.18 },
        { t: 0.86, plankAngle: -0.35, ankleY: 155.5, handX: 136, handY: 165, neck: -0.05 },
        { t: 1.00, plankAngle: -0.35, ankleY: 155.5, handX: 136, handY: 165, neck: -0.05 }
      ];
      const st = this.sampleTimedKeyframes(hrKFs, normT);
      const ankleX = 32;
      const hipX = ankleX + Math.cos(st.plankAngle) * 62.5;
      const hipY = st.ankleY + Math.sin(st.plankAngle) * 62.5;

      frame.torso = this.torsoFromHip(hipX, hipY, st.plankAngle, 1, st.neck);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, st.ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, st.ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, st.handX, st.handY, L_UPPER_ARM, L_FOREARM, 1);

      const footSurfY = st.ankleY > 158 ? 200 : 200;
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, footSurfY);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, footSurfY);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    if (poseType === 'ring_fallout') {
      frame.floorY = 170;
      const toeX = 34, toeY = 166;
      const bodyAngle = this.lerp(-0.80, -0.20, p);
      const soleAngleApprox = bodyAngle + Math.PI * 0.52;
      const ankleX = toeX - Math.cos(soleAngleApprox) * 10.5;
      const ankleY = toeY - Math.sin(soleAngleApprox) * 10.5;
      const hipX = ankleX + Math.cos(bodyAngle) * 63.0;
      const hipY = ankleY + Math.sin(bodyAngle) * 63.0;

      frame.torso = this.torsoFromHip(hipX, hipY, bodyAngle, 1, -0.04);
      const { shoulderX, shoulderY } = frame.torso;

      const armAngle = this.lerp(1.42, -0.22, p);
      const arm = this.solveFK(shoulderX, shoulderY, armAngle, armAngle, L_UPPER_ARM, L_FOREARM);
      frame.props.push({ type: 'overhead_beam', x1: 60, y1: 10, x2: 184, y2: 10 });
      frame.props.push({ type: 'gym_ring', strapX: 132, strapY: 10, cx: arm.ex, cy: arm.ey, r: 7.5 });

      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    if (poseType === 'box_decline_pushup') {
      frame.floorY = 170;
      frame.props.push({ type: 'plyo_box', x: 24, y: 132, w: 36, h: 38 });
      const toeX = 50, toeY = 129;
      const handX = 155, handY = 166;
      const plankAngle = this.lerp(0.00, 0.34, p);
      const soleAngleApprox = plankAngle + Math.PI * 0.52;
      const ankleX = toeX - Math.cos(soleAngleApprox) * 10.5;
      const ankleY = toeY - Math.sin(soleAngleApprox) * 10.5;
      const hipX = ankleX + Math.cos(plankAngle) * 63.2;
      const hipY = ankleY + Math.sin(plankAngle) * 63.2;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, this.lerp(-0.06, -0.22, p));
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    if (poseType === 'ring_pushup' || poseType === 'pbar_pushup') {
      frame.floorY = 172;
      const toeX = 32, toeY = 169;
      const handX = 134;
      const handY = 150;
      if (poseType === 'ring_pushup') {
        frame.props.push({ type: 'overhead_beam', x1: 60, y1: 12, x2: 180, y2: 12 });
        frame.props.push({ type: 'gym_ring', strapX: handX, strapY: 12, cx: handX, cy: handY, r: 7.5 });
      } else {
        frame.props.push({ type: 'parallel_bars', x1: 108, x2: 158, barY: 150, floorY: 172 });
      }
      const plankAngle = this.lerp(-0.54, -0.11, p);
      const soleAngleApprox = plankAngle + Math.PI * 0.52;
      const ankleX = toeX - Math.cos(soleAngleApprox) * 10.5;
      const ankleY = toeY - Math.sin(soleAngleApprox) * 10.5;
      const hipX = ankleX + Math.cos(plankAngle) * 63.2;
      const hipY = ankleY + Math.sin(plankAngle) * 63.2;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, -0.05);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    const isDiamond = poseType === 'diamond_pushup';
    if (isDiamond) {
      frame.props.push({ type: 'hud_badge', text: 'NARROW GRIP', second: false });
    }
    const toeX = 36, toeY = 165;
    const handX = isDiamond ? 136 : 140, handY = 164;

    // Rigid plank pivots cleanly around stationary planted toes while heels/ankles rotate above the floor
    const plankAngle = isDiamond ? this.lerp(-0.365, -0.02, p) : this.lerp(-0.34, -0.02, p);
    const soleAngleApprox = plankAngle + Math.PI * 0.52;
    const ankleX = toeX - Math.cos(soleAngleApprox) * 10.5;
    const ankleY = toeY - Math.sin(soleAngleApprox) * 10.5;
    const legLen = isDiamond ? 63.6 : 62.5;
    const hipX = ankleX + Math.cos(plankAngle) * legLen;
    const hipY = ankleY + Math.sin(plankAngle) * legLen;

    frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, -0.05);
    const { shoulderX, shoulderY } = frame.torso;

    const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
    const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
    const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 3. PIKE PUSH-UPS & BOX PIKE PUSH-UPS (SIDE VIEW - STEEP INVERTED-V TO TRIPOD)
  // ===========================================================================
  if (poseType === 'pike_pushup' || poseType === 'box_pike_pushup') {
    if (poseType === 'box_pike_pushup') {
      frame.floorY = 170;
      frame.props.push({ type: 'plyo_box', x: 26, y: 126, w: 38, h: 44 });
      const toeX = 56, toeY = 124;
      const handX = 128, handY = 166;
      const legAngle = this.lerp(-0.62, -0.32, p);
      const soleAngleApprox = legAngle + Math.PI * 0.52;
      const ankleX = toeX - Math.cos(soleAngleApprox) * 10.5;
      const ankleY = toeY - Math.sin(soleAngleApprox) * 10.5;
      const hipX = ankleX + Math.cos(legAngle) * 63.2;
      const hipY = ankleY + Math.sin(legAngle) * 63.2;

      const spineAngle = this.lerp(1.18, 1.32, p);
      const neckOffset = this.lerp(-0.06, -0.28, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, neckOffset);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    frame.floorY = 166;
    const ankleX = 46;
    const ankleY = 158;
    const handX = 124;
    const handY = 162;

    const legAngle = this.lerp(-1.24, -0.92, p);
    const hipX = ankleX + Math.cos(legAngle) * 62.5;
    const hipY = ankleY + Math.sin(legAngle) * 62.5;

    const spineAngle = this.lerp(0.64, 0.84, p);
    const neckOffset = this.lerp(-0.08, -0.36, p);
    frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, neckOffset);
    const { shoulderX, shoulderY } = frame.torso;

    const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
    const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, null);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, null);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 4. HANDSTAND PUSH-UPS (SIDE VIEW - FACING LEFT AWAY FROM WALL, TOES LEFT)
  // ===========================================================================
  if (poseType === 'hspu') {
    frame.floorY = 170;
    frame.props.push({ type: 'wall', x: 136, y1: 16, y2: 170 });

    const handX = 118, handY = 166;
    const shoulderX = this.lerp(120, 114, p);
    const shoulderY = this.lerp(120, 143, p);
    const spineAngle = this.lerp(1.62, 1.66, p); // inverted hip -> shoulder nearly vertical facing away from right wall
    frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.04);
    const { hipX, hipY } = frame.torso;

    const ankleX = 130;
    const ankleY = hipY - 62.8;
    const legBack = this.solveIK(hipX + 2, hipY, ankleX + 1, ankleY, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
    const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', hipX + 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 5. RING DIPS, PARALLEL BAR DIPS, SUPPORT, L-SIT, KNEE RAISE & BOX DIPS
  // ===========================================================================
  if (
    poseType === 'ring_dip' ||
    poseType === 'parallel_bar_dip' ||
    poseType === 'pbar_support_hold' ||
    poseType === 'pbar_l_sit' ||
    poseType === 'pbar_knee_raise' ||
    poseType === 'pbar_leg_raise' ||
    poseType === 'box_dip'
  ) {
    if (poseType === 'box_dip') {
      frame.floorY = 170;
      frame.props.push({ type: 'plyo_box', x: 20, y: 138, w: 42, h: 32 });
      const handX = 60, handY = 138;
      const shoulderX = this.lerp(69, 76, p);
      const shoulderY = this.lerp(90, 114, p);
      const spineAngle = this.lerp(-1.54, -1.50, p);
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.06);
      const { hipX, hipY } = frame.torso;

      const ankleX = 124;
      const ankleY = 166;
      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    frame.floorY = 176;
    const handX = 104, handY = 82;
    if (poseType === 'ring_dip') {
      frame.props.push({ type: 'gym_ring', strapX: 104, strapY: 14, cx: handX, cy: handY, r: 8.5 });
    } else {
      frame.props.push({ type: 'parallel_bars', x1: 68, x2: 138, barY: handY, floorY: 176 });
    }

    if (poseType === 'pbar_support_hold' || poseType === 'pbar_l_sit' || poseType === 'pbar_knee_raise' || poseType === 'pbar_leg_raise') {
      const breath = Math.sin(theta * 2) * 0.4;
      const shoulderX = 103;
      const shoulderY = poseType === 'pbar_support_hold'
        ? 33.3 + breath * 0.2
        : (35 + ((poseType === 'pbar_knee_raise' || poseType === 'pbar_leg_raise') ? 0 : breath * 0.4));
      const spineAngle = poseType === 'pbar_knee_raise'
        ? this.lerp(-1.54, -1.62, p)
        : (poseType === 'pbar_leg_raise'
          ? this.lerp(-1.54, -1.68, p)
          : (poseType === 'pbar_l_sit' ? -1.56 : -1.52));
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.06);
      const { hipX, hipY } = frame.torso;

      let legBack, legFront;
      if (poseType === 'pbar_l_sit') {
        legBack = this.solveFK(hipX - 2, hipY, 0, 0, L_THIGH, L_SHIN);
        legFront = this.solveFK(hipX, hipY, 0, 0, L_THIGH, L_SHIN);
      } else if (poseType === 'pbar_knee_raise') {
        const thighAngle = this.lerp(1.56, -0.35, p);
        const shinAngle = this.lerp(1.60, 1.72, p);
        legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
        legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      } else if (poseType === 'pbar_leg_raise') {
        const thighAngle = this.lerp(1.56, -0.06, p);
        const shinAngle = thighAngle + this.lerp(0.03, 0.0, p);
        legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
        legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      } else {
        legBack = this.solveFK(hipX - 2, hipY, 1.54, 1.58, L_THIGH, L_SHIN);
        legFront = this.solveFK(hipX, hipY, 1.54, 1.58, L_THIGH, L_SHIN);
      }

      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      return frame;
    }

    // Top support (p=0): shoulder stacked over rings at (102, 36); Bottom dip (p=1): shoulder drops to (110, 78) below elbow crease
    const shoulderX = this.lerp(102, 110, p);
    const shoulderY = this.lerp(36, 78, p);
    // Slight athletic forward lean during dip
    const spineAngle = this.lerp(-1.42, -1.26, p);
    frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.12);
    const { hipX, hipY } = frame.torso;

    // Knees bent backward behind athlete so feet stay well above the floor (y <= 166)
    const thighAngle = this.lerp(1.58, 1.62, p);
    const shinAngle = this.lerp(2.25, 2.65, p);
    const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
    const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

    const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 6. RING / BAR INVERTED ROWS, TABLE ROWS & DOORWAY TOWEL ROWS (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'inverted_row_side' || poseType === 'bar_row_side' || poseType === 'table_row_side' || poseType === 'towel_row_side') {
    frame.floorY = 170;
    if (poseType === 'inverted_row_side' || poseType === 'bar_row_side') {
      const handX = 104, handY = 80;
      if (poseType === 'inverted_row_side') {
        frame.props.push({ type: 'gym_ring', strapX: 104, strapY: 14, cx: handX, cy: handY, r: 8.5 });
      } else {
        frame.props.push({ type: 'parallel_bars', x1: 52, x2: 132, barY: handY, floorY: 170 });
      }

      const ankleX = 156, ankleY = 166;
      // Rigid plank from planted heels (156, 166). At p=0, arms are 100% fully extended at 48.6px!
      const bodyAngle = this.lerp(-2.578, -2.26, p); // ankle -> hip -> shoulder
      const legLen = 62.5;
      const hipX = ankleX + Math.cos(bodyAngle) * legLen;
      const hipY = ankleY + Math.sin(bodyAngle) * legLen;

      frame.torso = this.torsoFromHip(hipX, hipY, bodyAngle, 1, 0.15);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      // Shoulder -> Hand: bendSide = +1 bends elbow down-left behind the back!
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    } else if (poseType === 'table_row_side') {
      // Table Inverted Row: waist-height table (topY=96, spanning x1=96..175)
      // Athlete grips the front edge of the tabletop at (96, 93) with head outside in open air!
      const handX = 96, handY = 93;
      frame.props.push({ type: 'sturdy_table', x1: 96, x2: 175, topY: 96, floorY: 170 });

      const ankleX = 160, ankleY = 166;
      // At p=0, body hangs below table with arms 100% fully extended at 48.54px!
      const bodyAngle = this.lerp(-2.754, -2.48, p); // rigid body plank pulling chest to table edge
      const legLen = 62.5;
      const hipX = ankleX + Math.cos(bodyAngle) * legLen;
      const hipY = ankleY + Math.sin(bodyAngle) * legLen;

      frame.torso = this.torsoFromHip(hipX, hipY, bodyAngle, 1, -0.15);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    } else {
      // Doorway Towel Row: vertical doorframe pillar at x=142, towel anchored at (142, 86)
      const pillarX = 142;
      const handX = this.lerp(116, 112, p);
      const handY = this.lerp(90, 88, p);
      frame.props.push({ type: 'towel_pillar', pillarX, anchorY: 86, handX, handY });

      const ankleX = 128, ankleY = 166;
      const hipX = this.lerp(82, 96, p);
      const hipY = this.lerp(132, 126, p);
      const spineAngle = this.lerp(-1.95, -1.65, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.15);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    }
    return frame;
  }

  // ===========================================================================
  // 7. PRONE SUPERMAN LAT PULL-DOWNS & BACK EXTENSIONS (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'superman_pull_side' || poseType === 'back_extension') {
    frame.floorY = 168;
    const hipX = 84, hipY = 160;
    if (poseType === 'back_extension') {
      // Prone Back Extension / Arch-Up: hands resting behind head, torso & legs arch upward
      const spineAngle = this.lerp(-0.04, -0.44, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.06);
      const { shoulderX, shoulderY, headX, headY } = frame.torso;

      const thighAngle = this.lerp(3.14, 3.38, p);
      const shinAngle = this.lerp(3.16, 3.44, p);
      const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
      const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

      const hx = headX - Math.cos(spineAngle) * 7.5 + Math.sin(spineAngle) * 9.0;
      const hy = headY - Math.sin(spineAngle) * 7.5 - Math.cos(spineAngle) * 9.0;
      const dx = hx - shoulderX;
      const dy = hy - shoulderY;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const a = (L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM + d * d) / (2 * d);
      const r = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - a * a));
      const flair = this.lerp(-1.02, 0.85, p);
      const ejx = shoulderX + a * ux + uy * (r * Math.sin(flair));
      const ejy = shoulderY + a * uy - ux * (r * Math.sin(flair));
      const ejz = r * Math.cos(flair);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot_pointed', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot_pointed', 1, 200);
      addLimb('arm', 'arm', shoulderX, shoulderY, ejx, ejy, hx, hy, '#38bdf8', '#38bdf8', 5.2, 'hand', 1, null, 0, ejz, 0);
      return frame;
    }

    // Prone superman arch: chest & head hover 3-5" above mat, lifting slightly higher on the pull
    const spineAngle = this.lerp(-0.16, -0.32, p);
    frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.10);
    const { shoulderX, shoulderY } = frame.torso;

    // Posterior glute/hamstring engagement lifts legs off the mat behind the athlete
    const thighAngle = this.lerp(3.18, 3.30, p);
    const shinAngle = this.lerp(3.20, 3.36, p);
    const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
    const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

    // True 3D-projected lat pull-down: elbows flare laterally (+Z) and drive back toward ribs/hips
    // while forearms stay horizontal beside the ribcage (never swinging vertically up over the head)
    const upperYaw = this.lerp(0, 2.42, p);
    const upperPitch = this.lerp(-0.18, -0.24, p);
    const jx = shoulderX + L_UPPER_ARM * Math.cos(upperPitch) * Math.cos(upperYaw);
    const jy = shoulderY + L_UPPER_ARM * Math.sin(upperPitch);
    const jz = L_UPPER_ARM * Math.cos(upperPitch) * Math.sin(upperYaw);

    const foreYaw = this.lerp(0, -0.68, p);
    const forePitch = this.lerp(-0.15, 0.34, p);
    const ex = jx + L_FOREARM * Math.cos(forePitch) * Math.cos(foreYaw);
    const ey = jy + L_FOREARM * Math.sin(forePitch);
    const ez = jz + L_FOREARM * Math.cos(forePitch) * Math.sin(foreYaw);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
    addLimb('arm', 'arm', shoulderX, shoulderY, jx, jy, ex, ey, '#38bdf8', '#38bdf8', 5.4, 'hand', 1, null, 0, jz, ez);
    return frame;
  }

  // ===========================================================================
  // 8. SQUAT FAMILY: AIR SQUAT, GOBLET, FRONT, BACK, OVERHEAD, PISTOL, JUMP SQUAT & WALL SIT
  // ===========================================================================
  if (
    poseType === 'squat' ||
    poseType === 'goblet_squat' ||
    poseType === 'db_front_squat' ||
    poseType === 'bb_front_squat' ||
    poseType === 'bb_back_squat' ||
    poseType === 'bb_overhead_squat' ||
    poseType === 'db_overhead_squat' ||
    poseType === 'kb_overhead_squat' ||
    poseType === 'jump_squat' ||
    poseType === 'wall_sit' ||
    poseType === 'pistol_squat'
  ) {
    frame.floorY = 170;
    const ankleX = 96, ankleY = 166;

    if (poseType === 'wall_sit') {
      const breath = Math.sin(theta * 2) * 0.4;
      frame.props.push({ type: 'wall', x: 64, y1: 24, y2: 170 });
      const hipX = 72, hipY = 136 + breath * 0.3;
      frame.torso = this.torsoFromHip(hipX, hipY, -1.57, 1, 0.04);
      const { shoulderX, shoulderY } = frame.torso;

      const sitAnkleX = 104, sitAnkleY = 166;
      const legBack = this.solveIK(hipX - 2, hipY, sitAnkleX - 2, sitAnkleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, sitAnkleX, sitAnkleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      const arm = this.solveIK(shoulderX, shoulderY, 96, 131 + breath * 0.3, L_UPPER_ARM, L_FOREARM, 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

        if (poseType === 'jump_squat') {
          const jumpPeriod = 1500;
          const jumpNorm = ((timestamp % jumpPeriod) + jumpPeriod) % jumpPeriod / jumpPeriod;
          const jsPts = [
            { hx: 70, hy: 139, spine: -1.18, ay: 165.8, ua: 0.72, fa: -0.15 },
            { hx: 82, hy: 120, spine: -1.38, ay: 165.8, ua: 1.55, fa:  1.35 },
            { hx: 96, hy: 100, spine: -1.55, ay: 162.0, ua: 2.15, fa:  1.80 },
            { hx: 96, hy:  77, spine: -1.55, ay: 137.0, ua: 1.70, fa:  1.45 },
            { hx: 96, hy: 100, spine: -1.55, ay: 162.0, ua: 1.30, fa:  0.90 },
            { hx: 80, hy: 125, spine: -1.32, ay: 165.8, ua: 0.90, fa:  0.20 },
            { hx: 70, hy: 139, spine: -1.18, ay: 165.8, ua: 0.72, fa: -0.15 }
          ];
          const s = this.sampleSpline(jsPts, jumpNorm);
          frame.torso = this.torsoFromHip(s.hx, s.hy, s.spine, 1, 0.10);
          const { shoulderX, shoulderY } = frame.torso;
          const legBack = this.solveIK(s.hx - 3, s.hy, ankleX - 3, s.ay, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(s.hx, s.hy, ankleX, s.ay, L_THIGH, L_SHIN, -1);
          const arm = this.solveFK(shoulderX, shoulderY, s.ua, s.fa, L_UPPER_ARM, L_FOREARM);

          addLimb('legB', 'leg', s.hx - 3, s.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
          addLimb('legF', 'leg', s.hx, s.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          return frame;
        }

    if (poseType === 'pistol_squat') {
      const pistolPeriod = 3800;
      const fullNorm = ((timestamp % pistolPeriod) + pistolPeriod) % pistolPeriod / pistolPeriod;
      const isSecondLeg = fullNorm >= 0.5;
      const u = (fullNorm % 0.5) * 2;
      // Lift non-working leg forward -> deep pistol squat down & up -> return foot smoothly to floor
      const liftWave = u < 0.16
        ? 0.65 * this.smoothstep(u / 0.16)
        : (u < 0.84
          ? 0.65 + 0.35 * Math.sin(((u - 0.16) / 0.68) * Math.PI)
          : 0.65 * (1 - this.smoothstep((u - 0.84) / 0.16)));
      const squatWave = (u >= 0.12 && u <= 0.88)
        ? 0.5 - 0.5 * Math.cos(((u - 0.12) / 0.76) * Math.PI * 2)
        : 0;

      const hipX = this.lerp(94, 70, squatWave);
      const hipY = this.lerp(104, 140, squatWave);
      const spineAngle = this.lerp(-1.53, -1.16, squatWave); // natural forward lean for 1-leg balance
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.14);
      const { shoulderX, shoulderY } = frame.torso;

      const workingLeg = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      // Match standing leg geometry cleanly at u=0/1 so alternating legs plant together seamlessly
      const standLeg = this.solveIK(94, 104, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const standThigh = Math.atan2(standLeg.jy - 104, standLeg.jx - 94);
      const standShin = Math.atan2(standLeg.ey - standLeg.jy, standLeg.ex - standLeg.jx);
      const freeThighAngle = this.lerp(standThigh, -0.14, liftWave);
      const freeShinAngle = this.lerp(standShin, -0.06, liftWave);
      const freeLeg = this.solveFK(hipX, hipY, freeThighAngle, freeShinAngle, L_THIGH, L_SHIN);

      frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEG' : 'RIGHT LEG', second: isSecondLeg });

      if (!isSecondLeg) {
        addLimb('legB', 'leg', hipX, hipY, freeLeg.jx, freeLeg.jy, freeLeg.ex, freeLeg.ey, '#38bdf8', '#38bdf8', 5.4, 'foot', 1, 200);
        addLimb('legF', 'leg', hipX, hipY, workingLeg.jx, workingLeg.jy, workingLeg.ex, workingLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      } else {
        addLimb('legB', 'leg', hipX, hipY, workingLeg.jx, workingLeg.jy, workingLeg.ex, workingLeg.ey, '#38bdf8', '#38bdf8', 5.6, 'foot', 1);
        addLimb('legF', 'leg', hipX, hipY, freeLeg.jx, freeLeg.jy, freeLeg.ex, freeLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      }

      const handX = this.lerp(shoulderX + 8, shoulderX + 45, Math.max(squatWave, liftWave * 0.35));
      const handY = this.lerp(shoulderY + 44, shoulderY + 6, Math.max(squatWave, liftWave * 0.35));
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    } else {
      const isOHS = poseType === 'bb_overhead_squat' || poseType === 'db_overhead_squat' || poseType === 'kb_overhead_squat';
      const isBackSq = poseType === 'bb_back_squat';
      const hipX = this.lerp(94, isBackSq ? 67 : 70, p);
      const hipY = this.lerp(104, 139, p);
      const spineAngle = this.lerp(-1.53, isOHS ? -1.30 : (isBackSq ? -1.10 : -1.20), p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.12);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (poseType === 'goblet_squat') {
        // Cup kettlebell horns at upper chest/collarbone height with elbows tucked down
        const handX = shoulderX + 11;
        const handY = shoulderY + 2;
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
        frame.props.push({ type: 'kettlebell', x: shoulderX + 13, y: shoulderY + 9, r: 7.5 });
      } else if (poseType === 'db_front_squat') {
        // Dual hex dumbbells resting on the shoulders with forward-angled elbows
        const armB = this.solveFK(shoulderX - 2, shoulderY, 0.58, -2.15, L_UPPER_ARM, L_FOREARM);
        const armF = this.solveFK(shoulderX, shoulderY, 0.58, -2.15, L_UPPER_ARM, L_FOREARM);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armB.ex, y: armB.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armF.ex, y: armF.ey });
      } else if (poseType === 'bb_front_squat') {
        // High horizontal Olympic front-rack elbows extending forward at chest height
        const arm = this.solveFK(shoulderX, shoulderY, 0.08, -2.85, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: shoulderX + 6, y: shoulderY + 1, r: 9 });
      } else if (poseType === 'bb_back_squat') {
        // Barbell resting behind neck on upper traps; elbows tucked cleanly down below the bar
        const arm = this.solveIK(shoulderX, shoulderY, shoulderX - 4, shoulderY - 2, L_UPPER_ARM, L_FOREARM, -1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: shoulderX - 5, y: shoulderY - 3, r: 9.5 });
      } else if (poseType === 'bb_overhead_squat') {
        // Wide-grip snatch barbell locked straight overhead directly above midfoot
        const ohAngle = -1.56;
        const arm = this.solveFK(shoulderX, shoulderY, ohAngle, ohAngle, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
      } else if (poseType === 'db_overhead_squat' || poseType === 'kb_overhead_squat') {
        const isSecondArm = wantLeft;
        frame.props.push({ type: 'hud_badge', text: isSecondArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondArm });
        const ohAngle = -1.56;
        const workArm = this.solveFK(shoulderX, shoulderY, ohAngle, ohAngle, L_UPPER_ARM, L_FOREARM);
        const freeArm = this.solveIK(shoulderX - 2, shoulderY, shoulderX + 28, shoulderY + 16, L_UPPER_ARM, L_FOREARM, 1);
        addLimb(isSecondArm ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
        addLimb(isSecondArm ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        if (poseType === 'db_overhead_squat') {
          frame.props.push({ type: isSecondArm ? 'dumbbell_far' : 'dumbbell_near', x: workArm.ex, y: workArm.ey });
        } else {
          frame.props.push({ type: 'kettlebell', x: workArm.ex - 3.5, y: workArm.ey + 7.2, r: 7.2, midground: isSecondArm });
        }
      } else {
        const handX = this.lerp(shoulderX + 6, shoulderX + 44, p);
        const handY = this.lerp(shoulderY + 44, shoulderY + 4, p);
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      }
    }
    return frame;
  }

  // ===========================================================================
  // 9. OVERHEAD PRESSES, PUSH PRESSES, PUSH JERKS, THRUSTERS & WALL BALLS
  //    (Kinetic chain transfer: leg drive precedes rapid vertical arm punch!)
  // ===========================================================================
  if (
    poseType === 'kb_strict_press' ||
    poseType === 'db_strict_press' ||
    poseType === 'bb_strict_press' ||
    poseType === 'kb_push_press' ||
    poseType === 'overhead_press' ||
    poseType === 'bb_push_press' ||
    poseType === 'kb_push_jerk' ||
    poseType === 'db_push_jerk' ||
    poseType === 'push_jerk' ||
    poseType === 'kb_thruster' ||
    poseType === 'db_thruster' ||
    poseType === 'thruster' ||
    poseType === 'wall_ball'
  ) {
    frame.floorY = 170;
    const ankleX = 96, ankleY = 166;

    if (poseType === 'wall_ball') {
      // Smaller figure so medicine ball launches high up the wall to target!
      frame.scale = 0.74;
      frame.originX = 100;
      frame.originY = 170;
    }

    if (poseType === 'push_jerk' || poseType === 'kb_push_jerk' || poseType === 'db_push_jerk') {
      // Push Jerk / S2OH across Barbell, Dumbbells, and Kettlebell
      const jerkKF = [
        // 0: Tall Front Rack setup (shoulders stacked, load resting in front rack)
        { hx: 95, hy: 104, spine: -1.55, bx: 104, by: 56 },
        // 1: Controlled Vertical Dip (hips drop straight down, torso stays vertical)
        { hx: 91, hy: 116, spine: -1.52, bx: 102, by: 68 },
        // 2: Explosive Upward Leg Drive (hips & knees extend violently to hy=101)
        { hx: 96, hy: 101, spine: -1.56, bx: 100, by: 42 },
        // 3: Rapid Drop-Under into Quarter-Squat Catch with locked overhead arms
        { hx: 83, hy: 123, spine: -1.42, bx: 97, by: 30 },
        // 4: Hold Quarter-Squat Catch briefly
        { hx: 85, hy: 120, spine: -1.44, bx: 97, by: 27 },
        // 5: Stand Tall with Load Locked Out Overhead
        { hx: 95, hy: 104, spine: -1.55, bx: 97, by: 11 },
        // 6: Lower controlled back to tall Front Rack
        { hx: 95, hy: 104, spine: -1.55, bx: 104, by: 56 }
      ];
      const isKBPushJerk = poseType === 'kb_push_jerk';
      const sampleNorm = normT;
      const isSecondArm = isKBPushJerk ? wantLeft : false;
      if (isKBPushJerk) {
        frame.props.push({ type: 'hud_badge', text: isSecondArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondArm });
      }
      const st = this.sampleKeyframes(jerkKF, sampleNorm);
      frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.06);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(st.hx, st.hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (poseType === 'db_push_jerk') {
        const armB = this.solveIK(shoulderX - 3, shoulderY, st.bx - 2, st.by, L_UPPER_ARM, L_FOREARM, 1);
        const armF = this.solveIK(shoulderX, shoulderY, st.bx, st.by, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 3, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armB.ex, y: armB.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armF.ex, y: armF.ey });
      } else if (poseType === 'kb_push_jerk') {
        const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.48, 1.35, L_UPPER_ARM, L_FOREARM);
        const armF = this.solveIK(shoulderX, shoulderY, st.bx, st.by, L_UPPER_ARM, L_FOREARM, 1);
        addLimb(isSecondArm ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', isSecondArm ? 5.5 : 5, 'hand');
        addLimb(isSecondArm ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', isSecondArm ? 5 : 5.5, 'hand');
        frame.props.push({ type: 'kettlebell', x: armF.ex - 5, y: armF.ey + 6.5, r: 7.2, midground: isSecondArm });
      } else {
        const arm = this.solveIK(shoulderX, shoulderY, st.bx, st.by, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 8.5 });
      }
      return frame;
    }

    const isStrict = poseType === 'kb_strict_press' || poseType === 'db_strict_press' || poseType === 'bb_strict_press';
    const isFullSquat = poseType === 'thruster' || poseType === 'db_thruster' || poseType === 'kb_thruster' || poseType === 'wall_ball';
    const isDumbbell = poseType === 'db_thruster' || poseType === 'overhead_press' || poseType === 'db_strict_press';
    const isKettlebell = poseType === 'kb_thruster' || poseType === 'kb_push_press' || poseType === 'kb_strict_press';
    const isBarbell = poseType === 'thruster' || poseType === 'bb_push_press' || poseType === 'bb_strict_press';

    let activeP = p;
    let isSecondKBArm = false;
    let repLegDrive = null;
    let repArmPunch = null;
    if (isKettlebell) {
      isSecondKBArm = wantLeft;
      frame.props.push({ type: 'hud_badge', text: isSecondKBArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondKBArm });
      if (isStrict) {
        activeP = p;
      } else if (poseType === 'kb_push_press') {
        const pp = this.sampleKeyframes([
          { ld: 1.0, ap: 0.0 },
          { ld: 0.0, ap: 0.0 },
          { ld: 1.0, ap: 0.60 },
          { ld: 1.0, ap: 1.0 },
          { ld: 1.0, ap: 0.55 },
          { ld: 1.0, ap: 0.0 }
        ], normT);
        repLegDrive = pp.ld;
        repArmPunch = pp.ap;
      } else {
        const th = this.sampleKeyframes([
          { ld: 1.0, ap: 0.0 },
          { ld: 0.0, ap: 0.0 },
          { ld: 0.92, ap: 0.35 },
          { ld: 1.0, ap: 1.0 },
          { ld: 1.0, ap: 0.60 },
          { ld: 1.0, ap: 0.0 }
        ], normT);
        repLegDrive = th.ld;
        repArmPunch = th.ap;
      }
    }

    const legDrive = repLegDrive !== null ? repLegDrive : (isStrict ? 1 : this.smoothstep(this.clamp(activeP / 0.78, 0, 1)));
    const armPunch = repArmPunch !== null ? repArmPunch : (isStrict ? this.smoothstep(activeP) : this.smoothstep(this.clamp((activeP - 0.22) / 0.78, 0, 1)));

    const hipX = isStrict ? 95 : this.lerp(isFullSquat ? 70 : 89, 95, legDrive);
    const hipY = isStrict ? 104 : this.lerp(isFullSquat ? 139 : 115, 104, legDrive);
    const spineAngle = isStrict ? -1.55 : this.lerp(isFullSquat ? -1.22 : -1.46, -1.55, legDrive);
    frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, isStrict ? 0.04 : 0.08 * (1 - legDrive));
    const { shoulderX, shoulderY } = frame.torso;

    const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
    addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

    if (isDumbbell) {
      // Dual hex dumbbells pressed from shoulders into overhead lockout
      const startUA = 0.58, startFA = -2.05;
      const endUA = -1.54, endFA = -1.54;
      const ua = this.lerp(startUA, endUA, armPunch);
      const fa = this.lerp(startFA, endFA, armPunch);

      const armBack = this.solveFK(shoulderX - 3, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
      const armFront = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
      addLimb('armB', 'arm', shoulderX - 3, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
      frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
      addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
    } else if (isKettlebell) {
      // Single-arm Kettlebell racked on collarbones pressed/thrusted into bicep-by-ear lockout
      const startUA = 0.62, startFA = -1.98;
      const endUA = -1.54, endFA = -1.54;
      const ua = this.lerp(startUA, endUA, armPunch);
      const fa = this.lerp(startFA, endFA, armPunch);

      const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.50, 1.38, L_UPPER_ARM, L_FOREARM);
      const workArm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
      addLimb(isSecondKBArm ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', isSecondKBArm ? 5.5 : 5, 'hand');
      addLimb(isSecondKBArm ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', isSecondKBArm ? 5 : 5.5, 'hand');
      frame.props.push({ type: 'kettlebell', x: workArm.ex - 5, y: workArm.ey + 6.5, r: 7.2, midground: isSecondKBArm });
    } else if (isBarbell) {
      // Barbell Press / Thruster: high front-rack elbows extending to overhead barbell lockout
      const startUA = 0.16, startFA = -2.45;
      const endUA = -1.52, endFA = -1.52;
      const ua = this.lerp(startUA, endUA, armPunch);
      const fa = this.lerp(startFA, endFA, armPunch);
      const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 8.5 });
    } else {
      // Wall ball: two hands thrusting medicine ball high up the wall to 10ft target
      const upperArmAngle = this.lerp(0.68, -1.05, armPunch);
      const forearmAngle = this.lerp(-1.15, -1.12, armPunch);
      const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');

      // High 10ft target at (156, -34); medicine ball launches high in an arc!
      const targetY = -34;
      const flight = Math.max(0, (p - 0.48) / 0.52);
      const ballX = this.lerp(arm.ex + 4, 147, flight);
      const ballY = this.lerp(arm.ey - 2, targetY, Math.sin(flight * Math.PI * 0.5));
      frame.props.push({ type: 'wall_ball_rig', wallX: 156, targetY, ballX, ballY, hit: p > 0.90 });
    }
    return frame;
  }

  // ===========================================================================
  // 10. LUNGES (STEP-FORWARD, STEP-BACK, BULGARIAN SPLIT SQUAT & JUMPING)
  // ===========================================================================
  if (
    poseType === 'stepping_lunge' ||
    poseType === 'step_back_lunge' ||
    poseType === 'db_walking_lunge' ||
    poseType === 'kb_rack_lunge' ||
    poseType === 'bb_front_rack_lunge' ||
    poseType === 'bulgarian_split_squat' ||
    poseType === 'kb_bulgarian_split_squat' ||
    poseType === 'db_bulgarian_split_squat' ||
    poseType === 'bb_bulgarian_split_squat' ||
    poseType === 'jumping_lunge'
  ) {
    frame.floorY = 170;

    const isBulgarian =
      poseType === 'bulgarian_split_squat' ||
      poseType === 'kb_bulgarian_split_squat' ||
      poseType === 'db_bulgarian_split_squat' ||
      poseType === 'bb_bulgarian_split_squat';

    if (isBulgarian) {
      const isSecondLeg = wantLeft;
      const repP = p;

      const boxY = 144;
      frame.props.push({ type: 'plyo_box', x: 26, y: boxY, w: 30, h: 26 });
      frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEG' : 'RIGHT LEG', second: isSecondLeg });
      const frontAnkleX = 114, frontAnkleY = 166;
      const rearToeX = 48, rearToeY = 141;

      const hipX = this.lerp(95, 92, repP);
      const hipY = this.lerp(108, 128, repP);
      const spineAngle = this.lerp(-1.46, -1.36, repP);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.08);
      const { shoulderX, shoulderY } = frame.torso;

      if (poseType === 'db_bulgarian_split_squat') {
        const handX = hipX + 2;
        const handY = shoulderY + 46;
        const armBack = this.solveIK(shoulderX - 2, shoulderY, handX - 2, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
      }

      const rearLeg = this.solveLegToePivot(hipX - 2, hipY, rearToeX, rearToeY, L_THIGH, L_SHIN, -1, 1);
      const frontLeg = this.solveIK(hipX, hipY, frontAnkleX, frontAnkleY, L_THIGH, L_SHIN, -1);
      const rearName = isSecondLeg ? 'legF' : 'legB';
      const frontName = isSecondLeg ? 'legB' : 'legF';
      addLimb(rearName, 'leg', hipX - 2, hipY, rearLeg.jx, rearLeg.jy, rearLeg.ex, rearLeg.ey, '#64748b', '#475569', isSecondLeg ? 6 : 5.4, 'foot', 1, 200);
      addLimb(frontName, 'leg', hipX, hipY, frontLeg.jx, frontLeg.jy, frontLeg.ex, frontLeg.ey, '#bef264', '#94a3b8', isSecondLeg ? 5.4 : 6, 'foot', 1);

      if (poseType === 'kb_bulgarian_split_squat') {
        const handX = shoulderX + 13;
        const handY = shoulderY + 12;
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'kettlebell', x: handX + 1, y: handY + 3, r: 7.2 });
      } else if (poseType === 'db_bulgarian_split_squat') {
        const handX = hipX + 2;
        const handY = shoulderY + 46;
        const armFront = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else if (poseType === 'bb_bulgarian_split_squat') {
        const handX = shoulderX + 11;
        const handY = shoulderY + 5;
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: shoulderX + 7, y: shoulderY + 2, r: 9.5 });
      } else {
        const handX = this.lerp(shoulderX + 6, shoulderX + 24, repP);
        const handY = this.lerp(shoulderY + 43, shoulderY + 18, repP);
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      }
      return frame;
    }

    if (
      poseType === 'stepping_lunge' ||
      poseType === 'step_back_lunge' ||
      poseType === 'db_walking_lunge' ||
      poseType === 'kb_rack_lunge' ||
      poseType === 'bb_front_rack_lunge'
    ) {
      const lungeCycleMs = 3800;
      const fullNorm = ((timestamp % lungeCycleMs) + lungeCycleMs) % lungeCycleMs / lungeCycleMs;
      const isSecondLeg = fullNorm >= 0.5;
      const repNorm = (fullNorm % 0.5) * 2;
      const isStepBack = poseType === 'step_back_lunge';
      const isSmoothRack = poseType === 'db_walking_lunge' || poseType === 'kb_rack_lunge' || poseType === 'bb_front_rack_lunge';

      let st;
      if (isSmoothRack) {
        const rackPts = [
          { hx: 75,  hy: 104, spine: -1.54, fax: 76,  fay: 166, rax: 74, ray: 166, toeLock: 0 },
          { hx: 87,  hy: 107, spine: -1.52, fax: 106, fay: 158, rax: 74, ray: 161, toeLock: 0.4 },
          { hx: 98,  hy: 114, spine: -1.50, fax: 126, fay: 166, rax: 74, ray: 159, toeLock: 1 },
          { hx: 100, hy: 131, spine: -1.52, fax: 126, fay: 166, rax: 74, ray: 159, toeLock: 1 },
          { hx: 95,  hy: 112, spine: -1.50, fax: 122, fay: 165, rax: 74, ray: 161, toeLock: 0.7 },
          { hx: 82,  hy: 106, spine: -1.53, fax: 96,  fay: 158, rax: 74, ray: 166, toeLock: 0 }
        ];
        st = this.sampleSpline(rackPts, repNorm);
      } else {
        const lungeKF = isStepBack
          ? [
            { hx: 124, hy: 104, spine: -1.54, fax: 126, fay: 166, rax: 124, ray: 166, toeLock: 0 },
            { hx: 112, hy: 108, spine: -1.52, fax: 126, fay: 166, rax: 96, ray: 152, toeLock: 0.4 },
            { hx: 101, hy: 114, spine: -1.50, fax: 126, fay: 166, rax: 74, ray: 158, toeLock: 1 },
            { hx: 101, hy: 133, spine: -1.52, fax: 126, fay: 166, rax: 74, ray: 158, toeLock: 1 },
            { hx: 106, hy: 112, spine: -1.50, fax: 126, fay: 166, rax: 84, ray: 154, toeLock: 0.3 },
            { hx: 118, hy: 106, spine: -1.53, fax: 126, fay: 166, rax: 112, ray: 154, toeLock: 0 }
          ]
          : [
            { hx: 75, hy: 104, spine: -1.54, fax: 76, fay: 166, rax: 74, ray: 166, toeLock: 0 },
            { hx: 86, hy: 106, spine: -1.52, fax: 106, fay: 146, rax: 74, ray: 158, toeLock: 0.5 },
            { hx: 98, hy: 112, spine: -1.50, fax: 128, fay: 166, rax: 74, ray: 158, toeLock: 1 },
            { hx: 101, hy: 133, spine: -1.52, fax: 128, fay: 166, rax: 74, ray: 158, toeLock: 1 },
            { hx: 96, hy: 112, spine: -1.50, fax: 128, fay: 166, rax: 74, ray: 160, toeLock: 0.8 },
            { hx: 82, hy: 106, spine: -1.53, fax: 96, fay: 150, rax: 74, ray: 166, toeLock: 0 }
          ];
        st = this.sampleKeyframes(lungeKF, repNorm);
      }
      frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
      const { shoulderX, shoulderY } = frame.torso;

      frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEAD' : 'RIGHT LEAD', second: isSecondLeg });

      if (poseType === 'db_walking_lunge') {
        const armBack = this.solveIK(shoulderX - 2, shoulderY, st.hx, shoulderY + 46, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
      } else if (poseType === 'kb_rack_lunge') {
        const lungeDepth = Math.max(0, (st.hy - 104) / 28);
        const freeHandX = this.lerp(shoulderX + 6, shoulderX + 18, lungeDepth);
        const freeHandY = this.lerp(shoulderY + 42, shoulderY + 26, lungeDepth);
        const freeArm = this.solveIK(shoulderX - 2, shoulderY, freeHandX, freeHandY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
      }

      let targetRax = st.rax;
      let targetRay = st.ray;
      if (st.toeLock > 0.01) {
        const pivotLeg = this.solveLegToePivot(st.hx, st.hy, 74, 167, L_THIGH, L_SHIN, -1, 1);
        targetRax = this.lerp(st.rax, pivotLeg.ex, st.toeLock);
        targetRay = this.lerp(st.ray, pivotLeg.ey, st.toeLock);
      }

      const stepLeg = this.solveIK(st.hx, st.hy, st.fax, st.fay, L_THIGH, L_SHIN, -1);
      const anchorLeg = this.solveIK(st.hx, st.hy, targetRax, targetRay, L_THIGH, L_SHIN, -1);
      const rearSurf = st.toeLock > 0.05 ? this.lerp(frame.floorY, 200, Math.min(1, st.toeLock)) : null;

      if (!isSecondLeg) {
        addLimb('legB', 'leg', st.hx, st.hy, anchorLeg.jx, anchorLeg.jy, anchorLeg.ex, anchorLeg.ey, '#38bdf8', '#38bdf8', 5.5, 'foot', 1, rearSurf);
        addLimb('legF', 'leg', st.hx, st.hy, stepLeg.jx, stepLeg.jy, stepLeg.ex, stepLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      } else {
        addLimb('legB', 'leg', st.hx, st.hy, stepLeg.jx, stepLeg.jy, stepLeg.ex, stepLeg.ey, '#38bdf8', '#38bdf8', 5.8, 'foot', 1);
        addLimb('legF', 'leg', st.hx, st.hy, anchorLeg.jx, anchorLeg.jy, anchorLeg.ex, anchorLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1, rearSurf);
      }

      if (poseType === 'db_walking_lunge') {
        const armFront = this.solveIK(shoulderX, shoulderY, st.hx + 2, shoulderY + 46, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else if (poseType === 'kb_rack_lunge') {
        const arm = this.solveFK(shoulderX, shoulderY, 1.15, -1.45, L_UPPER_ARM, L_FOREARM);
        addLimb('armF', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'kettlebell', x: arm.ex - 5, y: arm.ey + 7.2, r: 7.2 });
      } else if (poseType === 'bb_front_rack_lunge') {
        const arm = this.solveFK(shoulderX, shoulderY, 0.48, -2.68, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9 });
      } else {
        const lungeDepth = Math.max(0, (st.hy - 104) / 30);
        const handX = this.lerp(shoulderX + 6, shoulderX + 26, lungeDepth);
        const handY = this.lerp(shoulderY + 43, shoulderY + 14, lungeDepth);
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      }
    } else {
      // Jumping Lunge: split lunge bottom -> explosive leg drive (feet push off floor) -> vertical flight & scissor switch -> deep landing absorption
      const jlPeriod = 2400;
      const norm = ((timestamp % jlPeriod) + jlPeriod) % jlPeriod / jlPeriod;
      const isRep2 = norm >= 0.50;
      const u = isRep2 ? (norm - 0.50) / 0.50 : norm / 0.50;
      frame.props.push({ type: 'hud_badge', text: isRep2 ? 'LEFT LEAD' : 'RIGHT LEAD', second: isRep2 });

      let hx = 96, hy, ax1, ay1, ax2, ay2, armUA, armFA;
      const posFrontX = 120, posBackX = 72;

      if (u < 0.22) {
        // Phase 1: Explosive Leg Drive! Feet STAY ON FLOOR while hips drive up & knees extend forcefully
        const t = this.smoothstep(u / 0.22);
        hy = this.lerp(132, 104, t);
        const f1X = isRep2 ? posBackX : posFrontX;
        const f2X = isRep2 ? posFrontX : posBackX;
        ax1 = f1X; ay1 = 166;
        ax2 = f2X; ay2 = 166;
        armUA = this.lerp(1.25, 0.45, t); armFA = armUA - 1.25;
      } else if (u < 0.72) {
        // Phase 2: Aerial Flight & Scissor Switch in mid-air
        const t = (u - 0.22) / 0.50;
        const st = this.smoothstep(t);
        const parabola = 4 * t * (1 - t);
        hy = this.lerp(104, 104, t) - 20 * parabola; // apex at 84 in the air!
        const start1X = isRep2 ? posBackX : posFrontX;
        const end1X = isRep2 ? posFrontX : posBackX;
        const start2X = isRep2 ? posFrontX : posBackX;
        const end2X = isRep2 ? posBackX : posFrontX;

        ax1 = this.lerp(start1X, end1X, st);
        ax2 = this.lerp(start2X, end2X, st);
        const airLift = 26 * parabola;
        ay1 = 166 - airLift;
        ay2 = 166 - airLift;
        armUA = this.lerp(0.45, 1.25, st); armFA = armUA - 1.25;
      } else {
        // Phase 3: Touchdown & Deep Absorption
        const t = this.smoothstep((u - 0.72) / 0.28);
        hy = this.lerp(104, 132, t);
        const f1X = isRep2 ? posFrontX : posBackX;
        const f2X = isRep2 ? posBackX : posFrontX;
        ax1 = f1X; ay1 = 166;
        ax2 = f2X; ay2 = 166;
        armUA = this.lerp(1.25, 1.25, t); armFA = armUA - 1.25;
      }

      frame.torso = this.torsoFromHip(hx, hy, -1.54, 1, 0);
      const { shoulderX, shoulderY } = frame.torso;

      const legFront = this.solveIK(hx, hy, ax1, ay1, L_THIGH, L_SHIN, -1);
      const legBack = this.solveIK(hx - 2, hy, ax2, ay2, L_THIGH, L_SHIN, -1);
      const arm = this.solveFK(shoulderX, shoulderY, armUA, armFA, L_UPPER_ARM, L_FOREARM);

      addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.5, 'foot', 1);
      addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    }
    return frame;
  }

  // ===========================================================================
  // 11. ABMAT SIT-UPS, MED BALL SIT-UPS, V-UPS, TUCK-UPS, RUSSIAN TWISTS,
  //     HOLLOW HOLD/ROCK, GLUTE BRIDGE, HIP THRUST & FLOOR PRESS
  // ===========================================================================
  if (
    poseType === 'situp' ||
    poseType === 'med_ball_situp' ||
    poseType === 'vup' ||
    poseType === 'tuck_up' ||
    poseType === 'hollow_hold' ||
    poseType === 'hollow_rock' ||
    poseType === 'russian_twist' ||
    poseType === 'med_ball_russian_twist' ||
    poseType === 'kb_russian_twist' ||
    poseType === 'db_russian_twist' ||
    poseType === 'glute_bridge' ||
    poseType === 'bb_hip_thrust'
  ) {
    frame.floorY = 168;

    if (poseType === 'situp' || poseType === 'med_ball_situp') {
      const isMB = poseType === 'med_ball_situp';
      const hipX = isMB ? 100 : 86, hipY = 160;
      const ankleX = isMB ? 150 : 138, ankleY = 164;

      const spineAngle = this.lerp(-2.98, -1.35, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.22 * (1 - p));
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (isMB) {
        // Carry med ball with naturally bent elbows (~50 deg); ball rotates locked with forearm grip
        const upperArmAngle = this.lerp(-2.84, 0.56, p);
        const forearmAngle = upperArmAngle - this.lerp(0.92, 0.86, p);
        const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
        frame.props.push({ type: 'med_ball', x: arm.ex, y: arm.ey, r: 7.5, angle: forearmAngle });
      } else {
        // Arms sweep overhead above mat (-2.68 rad) to touching/pressing past shoes (-0.05 rad)
        const upperArmAngle = this.lerp(-2.68, -0.05, p);
        const forearmAngle = upperArmAngle - this.lerp(0.32, 0.25, p);
        const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      }
    } else if (poseType === 'hollow_hold' || poseType === 'hollow_rock') {
      const isRock = poseType === 'hollow_rock';
      const rock = isRock ? Math.sin(theta) * 0.20 : Math.sin(theta * 2) * 0.02;
      const hipX = 96, hipY = 159 - (isRock ? Math.abs(Math.sin(theta)) * 2.5 : 0);
      const spineAngle = -2.84 + rock;
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.22);
      const { shoulderX, shoulderY } = frame.torso;

      const legAngle = -0.18 + rock;
      const legBack = this.solveFK(hipX - 2, hipY, legAngle - 0.02, legAngle + 0.02, L_THIGH, L_SHIN);
      const legFront = this.solveFK(hipX, hipY, legAngle - 0.02, legAngle + 0.02, L_THIGH, L_SHIN);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      const armAngle = -2.78 + rock;
      const arm = this.solveFK(shoulderX, shoulderY, armAngle, armAngle - 0.08, L_UPPER_ARM, L_FOREARM);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    } else if (
      poseType === 'russian_twist' ||
      poseType === 'med_ball_russian_twist' ||
      poseType === 'kb_russian_twist' ||
      poseType === 'db_russian_twist'
    ) {
      const twistPeriod = 3800;
      const twistTheta = (((timestamp % twistPeriod) + twistPeriod) % twistPeriod / twistPeriod) * Math.PI * 2;
      const twist = Math.sin(twistTheta);
      const absT = Math.abs(twist);
      const isLeft = twist < 0;
      frame.view = 'front';
      frame.props.push({ type: 'hud_badge', text: isLeft ? 'LEFT TWIST' : 'RIGHT TWIST', second: isLeft });

      const midHX = 100, midHY = 164.5;
      const leftHipX = midHX - 9, rightHipX = midHX + 9;
      const midSX = midHX + twist * 6;
      const midSY = midHY - Math.sqrt(L_TORSO * L_TORSO - (midSX - midHX) * (midSX - midHX));

      const yaw = twist * 1.15;
      const shHalf = 15;
      const shXHalf = shHalf * Math.cos(yaw);
      const shZ = shHalf * Math.sin(yaw);
      const shTiltY = twist * 3.5;
      const lsx = midSX - shXHalf, lsy = midSY - shTiltY, lsz = shZ;
      const rsx = midSX + shXHalf, rsy = midSY + shTiltY, rsz = -shZ;

      frame.frontTorso = {
        leftShoulderX: lsx, rightShoulderX: rsx,
        leftShoulderY: lsy, rightShoulderY: rsy,
        leftHipX, rightHipX,
        hipY: midHY,
        headX: midSX + twist * 2.5,
        headY: midSY - L_NECK
      };

      const kneeShift = -twist * 4.0;
      const legL = KinematicMath.solveIK3D(leftHipX, midHY, 0, 94 + kneeShift, 155, 42, L_THIGH, L_SHIN, -0.05, -1, 0.2);
      const legR = KinematicMath.solveIK3D(rightHipX, midHY, 0, 106 + kneeShift, 155, 42, L_THIGH, L_SHIN, 0.05, -1, 0.2);
      addLimb('legL', 'leg', leftHipX, midHY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.8, 'foot_front', 1, 200, 0, legL.jz, legL.ez, 0);
      addLimb('legR', 'leg', rightHipX, midHY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.8, 'foot_front', 1, 200, 0, legR.jz, legR.ez, 0);

      const handX = 100 + twist * 30;
      const handY = 134 + absT * 16;
      const handZ = 16 - absT * 4;
      const armL = KinematicMath.solveIK3D(lsx, lsy, lsz, handX, handY, handZ, L_UPPER_ARM, L_FOREARM, -0.5, 0.85, 0.25);
      const armR = KinematicMath.solveIK3D(rsx, rsy, rsz, handX, handY, handZ, L_UPPER_ARM, L_FOREARM, 0.5, 0.85, 0.25);
      addLimb('armL', 'arm', lsx, lsy, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5.0, 'hand', 1, null, lsz, armL.jz, armL.ez, isLeft ? -2 : -1);
      addLimb('armR', 'arm', rsx, rsy, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5.2, 'hand', 1, null, rsz, armR.jz, armR.ez, isLeft ? -1 : -2);
      if (poseType === 'med_ball_russian_twist') {
        frame.props.push({ type: 'med_ball', x: handX, y: handY, r: 7.5, midground: true, behindLegs: true });
      } else if (poseType === 'kb_russian_twist') {
        frame.props.push({ type: 'kettlebell', x: handX, y: handY + 6.5, r: 5.5, angle: twist * 0.20, midground: true, behindLegs: true });
      } else if (poseType === 'db_russian_twist') {
        frame.props.push({ type: 'dumbbell_near', x: handX, y: handY, angle: twist * 0.30, midground: true, behindLegs: true });
      }
    } else if (poseType === 'glute_bridge' || poseType === 'bb_hip_thrust') {
      const shoulderX = 42, shoulderY = 152;
      const spineAngle = this.lerp(3.27, 2.68, p);
      frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, this.lerp(0, 0.48, p));
      const { hipX, hipY } = frame.torso;

      const ankleX = 128, ankleY = 164;
      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (poseType === 'bb_hip_thrust') {
        const arm = this.solveIK(shoulderX, shoulderY, hipX, hipY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
        frame.props.push({ type: 'barbell_end', x: hipX, y: hipY - 2, r: 9 });
      } else {
        const elbowX = shoulderX + L_UPPER_ARM * 0.96;
        const elbowY = shoulderY + L_UPPER_ARM * 0.28;
        const handX = elbowX + L_FOREARM;
        const handY = elbowY;
        addLimb('arm', 'arm', shoulderX, shoulderY, elbowX, elbowY, handX, handY, '#38bdf8', '#38bdf8', 5, 'hand');
      }
    } else if (poseType === 'vup') {
      // V-UPS: Simultaneous torso + straight-leg jackknife fold
      const hipX = 96, hipY = 160;
      const spineAngle = this.lerp(-2.96, -2.02, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.20 * (1 - p));
      const { shoulderX, shoulderY } = frame.torso;

      const legAngle = this.lerp(-0.14, -1.12, p);
      const legBack = this.solveFK(hipX - 2, hipY, legAngle - 0.03, legAngle + 0.03, L_THIGH, L_SHIN);
      const legFront = this.solveFK(hipX, hipY, legAngle - 0.03, legAngle + 0.03, L_THIGH, L_SHIN);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      const upperArmAngle = this.lerp(-2.68, -0.58, p);
      const forearmAngle = upperArmAngle - this.lerp(0.28, 0.18, p);
      const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    } else {
      // TUCK-UPS: Knees tuck tight to chest during torso fold
      const hipX = 96, hipY = 160;
      const spineAngle = this.lerp(-2.96, -2.00, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.20 * (1 - p));
      const { shoulderX, shoulderY } = frame.torso;

      const ankleX = this.lerp(158, 122, p);
      const ankleY = this.lerp(158, 150, p);
      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      const upperArmAngle = this.lerp(-2.68, -0.45, p);
      const forearmAngle = upperArmAngle - this.lerp(0.28, 0.15, p);
      const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    }
    return frame;
  }

  // ===========================================================================
  // CORE ISOMETRICS: FOREARM PLANK, STRAIGHT-ARM PLANK, KNEE PLANK, SIDE PLANK & L-SIT
  // ===========================================================================
  if (
    poseType === 'plank' ||
    poseType === 'straight_arm_plank' ||
    poseType === 'knee_plank' ||
    poseType === 'side_plank' ||
    poseType === 'lsit' ||
    poseType === 'plank_shoulder_tap' ||
    poseType === 'plank_up_down' ||
    poseType === 'db_plank_renegade_row'
  ) {
    frame.floorY = 168;
    const breath = Math.sin(theta * 2) * 0.5;

    if (poseType === 'plank_shoulder_tap' || poseType === 'db_plank_renegade_row') {
      const isRenegade = poseType === 'db_plank_renegade_row';
      const cycleMs = isRenegade ? 3800 : 2000;
      const fullNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
      const isSecondArm = fullNorm >= 0.5;
      const repP = 0.5 - 0.5 * Math.cos(((fullNorm % 0.5) * 2) * Math.PI * 2);

      frame.props.push({ type: 'hud_badge', text: isSecondArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondArm });

      const plankAngle = isRenegade ? -0.35 : -0.35;
      const shoulderX = 140, shoulderY = isRenegade ? 114.3 : 117;
      const hipX = shoulderX - Math.cos(plankAngle) * L_TORSO;
      const hipY = shoulderY - Math.sin(plankAngle) * L_TORSO;
      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, 0);

      const toeX = 36.2, toeY = 165;
      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);

      const plantHandX = 140, plantHandY = isRenegade ? 163 : 165.8;
      const targetX = isRenegade ? 104 : 136;
      const targetY = isRenegade ? 128 : 119;
      const moveHandX = this.lerp(plantHandX, targetX, repP);
      const moveHandY = this.lerp(plantHandY, targetY, repP);

      const farHandX = isSecondArm ? moveHandX : plantHandX - 2;
      const farHandY = isSecondArm ? moveHandY : plantHandY;
      const nearHandX = isSecondArm ? plantHandX : moveHandX;
      const nearHandY = isSecondArm ? plantHandY : moveHandY;

      const farArm = this.solveIK(shoulderX - 2, shoulderY, farHandX, farHandY, L_UPPER_ARM, L_FOREARM, 1);
      const nearArm = this.solveIK(shoulderX, shoulderY, nearHandX, nearHandY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('armB', 'arm', shoulderX - 2, shoulderY, farArm.jx, farArm.jy, farArm.ex, farArm.ey, '#64748b', '#475569', 5, 'hand');
      if (isRenegade) frame.props.push({ type: 'dumbbell_far', x: farArm.ex, y: farArm.ey });
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('armF', 'arm', shoulderX, shoulderY, nearArm.jx, nearArm.jy, nearArm.ex, nearArm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      if (isRenegade) frame.props.push({ type: 'dumbbell_near', x: nearArm.ex, y: nearArm.ey });
      return frame;
    }

    if (poseType === 'plank_up_down') {
      const cycleMs = 3800;
      const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
      const udKFs = [
        { t: 0.00, plank: -0.145, sx: 144.5, sy: 140.0, toeX: 33.5, farX: 168.5, farY: 164.5, nearX: 168.5, nearY: 164.5 },
        { t: 0.10, plank: -0.145, sx: 144.5, sy: 140.0, toeX: 33.5, farX: 168.5, farY: 164.5, nearX: 168.5, nearY: 164.5 },
        { t: 0.18, plank: -0.170, sx: 143.5, sy: 137.0, toeX: 33.5, farX: 167.5, farY: 164.5, nearX: 152.0, nearY: 159.0 },
        { t: 0.25, plank: -0.215, sx: 141.5, sy: 132.0, toeX: 33.5, farX: 166.0, farY: 164.5, nearX: 141.0, nearY: 165.8 },
        { t: 0.36, plank: -0.315, sx: 138.0, sy: 121.0, toeX: 33.5, farX: 143.0, farY: 159.0, nearX: 138.0, nearY: 165.8 },
        { t: 0.44, plank: -0.350, sx: 137.0, sy: 117.0, toeX: 33.5, farX: 135.0, farY: 165.6, nearX: 137.0, nearY: 165.8 },
        { t: 0.56, plank: -0.350, sx: 137.0, sy: 117.0, toeX: 33.5, farX: 135.0, farY: 165.6, nearX: 137.0, nearY: 165.8 },
        { t: 0.67, plank: -0.270, sx: 139.5, sy: 126.0, toeX: 33.5, farX: 137.5, farY: 165.6, nearX: 160.0, nearY: 160.0 },
        { t: 0.76, plank: -0.205, sx: 142.0, sy: 133.5, toeX: 33.5, farX: 140.0, farY: 165.6, nearX: 166.0, nearY: 164.5 },
        { t: 0.88, plank: -0.145, sx: 144.5, sy: 140.0, toeX: 33.5, farX: 168.5, farY: 164.5, nearX: 168.5, nearY: 164.5 },
        { t: 1.00, plank: -0.145, sx: 144.5, sy: 140.0, toeX: 33.5, farX: 168.5, farY: 164.5, nearX: 168.5, nearY: 164.5 }
      ];
      const st = this.sampleTimedKeyframes(udKFs, uNorm);
      const shoulderX = st.sx, shoulderY = st.sy;
      const hipX = shoulderX - Math.cos(st.plank) * L_TORSO;
      const hipY = shoulderY - Math.sin(st.plank) * L_TORSO;
      frame.torso = this.torsoFromHip(hipX, hipY, st.plank, 1, 0);

      const legBack = this.solveLegToePivot(hipX - 2, hipY, st.toeX - 2, 165, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, st.toeX, 165, L_THIGH, L_SHIN, -1, 1);
      const farArm = this.solveIK(shoulderX - 2, shoulderY, st.farX, st.farY, L_UPPER_ARM, L_FOREARM, 1);
      const nearArm = this.solveIK(shoulderX, shoulderY, st.nearX, st.nearY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('armB', 'arm', shoulderX - 2, shoulderY, farArm.jx, farArm.jy, farArm.ex, farArm.ey, '#64748b', '#475569', 4.8, 'hand');
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
      addLimb('armF', 'arm', shoulderX, shoulderY, nearArm.jx, nearArm.jy, nearArm.ex, nearArm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

    if (poseType === 'plank') {
      const plankAngle = -0.14;
      const shoulderX = 142, shoulderY = 139 + breath * 0.5;
      const hipX = shoulderX - Math.cos(plankAngle) * L_TORSO;
      const hipY = shoulderY - Math.sin(plankAngle) * L_TORSO;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, 0);

      const toeX = 31.2, toeY = 165;
      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      // Grounded forearms parallel to mat (exact segment lengths)
      const elbowX = shoulderX, elbowY = shoulderY + L_UPPER_ARM;
      const handX = elbowX + L_FOREARM, handY = elbowY;
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, elbowX - 2, elbowY, handX - 2, handY, '#64748b', '#475569', 4.8, 'hand');
      addLimb('armF', 'arm', shoulderX, shoulderY, elbowX, elbowY, handX, handY, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

    if (poseType === 'knee_plank') {
      const kneeX = 66, kneeY = 164;
      const plankAngle = -0.326;
      const hipX = kneeX + Math.cos(plankAngle) * L_THIGH;
      const hipY = kneeY + Math.sin(plankAngle) * L_THIGH;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, 0);
      const { shoulderX, shoulderY } = frame.torso;

      const elbowX = shoulderX, elbowY = shoulderY + L_UPPER_ARM;
      const handX = elbowX + L_FOREARM, handY = elbowY;

      const shinAngle = 3.82;
      const ankleX = kneeX + Math.cos(shinAngle) * L_SHIN;
      const ankleY = kneeY + Math.sin(shinAngle) * L_SHIN;

      addLimb('legB', 'leg', hipX - 2, hipY, kneeX - 2, kneeY, ankleX - 2, ankleY, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, kneeX, kneeY, ankleX, ankleY, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, elbowX - 2, elbowY, handX - 2, handY, '#64748b', '#475569', 4.8, 'hand');
      addLimb('armF', 'arm', shoulderX, shoulderY, elbowX, elbowY, handX, handY, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

    if (poseType === 'straight_arm_plank') {
      const plankAngle = -0.35;
      const shoulderX = 140, shoulderY = 117 + breath * 0.4;
      const hipX = shoulderX - Math.cos(plankAngle) * L_TORSO;
      const hipY = shoulderY - Math.sin(plankAngle) * L_TORSO;

      frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, 0);

      const toeX = 36.2, toeY = 165;
      const legBack = this.solveLegToePivot(hipX - 2, hipY, toeX - 2, toeY, L_THIGH, L_SHIN, -1, 1);
      const legFront = this.solveLegToePivot(hipX, hipY, toeX, toeY, L_THIGH, L_SHIN, -1, 1);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

      // Straight locked arms down to deck (exact segment lengths)
      const elbowX = shoulderX, elbowY = shoulderY + L_UPPER_ARM;
      const handX = elbowX, handY = elbowY + L_FOREARM;
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, elbowX - 2, elbowY, handX - 2, handY, '#64748b', '#475569', 4.8, 'hand');
      addLimb('armF', 'arm', shoulderX, shoulderY, elbowX, elbowY, handX, handY, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

    if (poseType === 'side_plank') {
      frame.view = 'front';
      const isSecondSide = !wantLeft;
      frame.props.push({ type: 'hud_badge', text: wantLeft ? 'LEFT SIDE' : 'RIGHT SIDE', second: wantLeft });

      const elbowX = 55, elbowY = 164;
      const handX = elbowX + L_FOREARM, handY = elbowY;
      const leftSX = elbowX, leftSY = elbowY - L_UPPER_ARM;
      const rightSX = leftSX + 7, rightSY = leftSY - 20;

      const midSX = (leftSX + rightSX) / 2;
      const midSY = (leftSY + rightSY) / 2;

      const bodyAngle = 0.35;
      const midHX = midSX + Math.cos(bodyAngle) * L_TORSO;
      const midHY = midSY + Math.sin(bodyAngle) * L_TORSO;

      const leftHX = midHX - 3, leftHY = midHY + 7;
      const rightHX = midHX + 3, rightHY = midHY - 7;

      const topElbowX = rightSX, topElbowY = rightSY - L_UPPER_ARM;
      const topHandX = topElbowX, topHandY = topElbowY - L_FOREARM;

      const footX = 158, footY = 164;
      const legB = this.solveIK(leftHX, leftHY, footX, footY, L_THIGH, L_SHIN, -1);
      const legF = this.solveIK(rightHX, rightHY, footX - 2, footY - 4, L_THIGH, L_SHIN, -1);

      frame.frontTorso = {
        leftShoulderX: leftSX, leftShoulderY: leftSY,
        rightShoulderX: rightSX, rightShoulderY: rightSY,
        leftHipX: leftHX, leftHipY: leftHY,
        rightHipX: rightHX, rightHipY: rightHY,
        headX: midSX - Math.cos(bodyAngle) * L_NECK,
        headY: midSY - Math.sin(bodyAngle) * L_NECK
      };

      // Supporting bottom arm grounded on deck
      addLimb(isSecondSide ? 'armF' : 'armB', 'arm', leftSX, leftSY, elbowX, elbowY, handX, handY, '#64748b', '#475569', isSecondSide ? 5.2 : 5.0, 'hand');
      // Bottom & top stacked legs
      addLimb(isSecondSide ? 'legF' : 'legB', 'leg', leftHX, leftHY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', isSecondSide ? 6.0 : 5.4, 'foot_front');
      addLimb(isSecondSide ? 'legB' : 'legF', 'leg', rightHX, rightHY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', isSecondSide ? 5.4 : 6.0, 'foot_front');
      // Top arm extended straight up to the ceiling
      addLimb(isSecondSide ? 'armB' : 'armF', 'arm', rightSX, rightSY, topElbowX, topElbowY, topHandX, topHandY, '#38bdf8', '#38bdf8', isSecondSide ? 5.0 : 5.2, 'hand');
      return frame;
    }

    if (poseType === 'lsit') {
      const hipX = 85, hipY = 145 + breath * 0.5;
      const spineAngle = -1.58; // Near vertical torso
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.05);
      const { shoulderX, shoulderY } = frame.torso;

      // Arms locked straight down to support blocks
      const elbowY = shoulderY + L_UPPER_ARM;
      const handY = elbowY + L_FOREARM;
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, shoulderX - 2, elbowY, shoulderX - 2, handY, '#64748b', '#475569', 5.0, 'hand');
      addLimb('armF', 'arm', shoulderX, shoulderY, shoulderX, elbowY, shoulderX, handY, '#38bdf8', '#38bdf8', 5.4, 'hand');

      // Both legs extended straight out horizontally parallel to deck
      const legBack = this.solveFK(hipX - 2, hipY, 0, 0, L_THIGH, L_SHIN);
      const legFront = this.solveFK(hipX, hipY, 0, 0, L_THIGH, L_SHIN);
      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      frame.props.push({ type: 'parallettes', x: shoulderX, floorY: 168 });
      return frame;
    }
  }

  // ===========================================================================
  // 12. KETTLEBELL / DUMBBELL / BARBELL HINGE, RDL, ROWS, CLEANS & SNATCH
  // ===========================================================================
  if (
    poseType === 'kb_swing' ||
    poseType === 'kb_snatch' ||
    poseType === 'db_snatch' ||
    poseType === 'kb_deadlift' ||
    poseType === 'db_deadlift' ||
    poseType === 'deadlift_row' ||
    poseType === 'rfe_rdl' ||
    poseType === 'kb_rfe_rdl' ||
    poseType === 'db_rfe_rdl' ||
    poseType === 'bb_rfe_rdl' ||
    poseType === 'kb_rdl' ||
    poseType === 'db_rdl' ||
    poseType === 'bb_rdl' ||
    poseType === 'bb_good_morning' ||
    poseType === 'kb_bent_row' ||
    poseType === 'db_bent_row' ||
    poseType === 'bb_bent_row' ||
    poseType === 'kb_hang_power_clean' ||
    poseType === 'db_hang_power_clean' ||
    poseType === 'hang_power_clean' ||
    poseType === 'clean_snatch'
  ) {
    frame.floorY = 170;
    const ankleX = 92, ankleY = 166;

    if (poseType === 'rfe_rdl' || poseType === 'kb_rfe_rdl' || poseType === 'db_rfe_rdl' || poseType === 'bb_rfe_rdl') {
      const isSecondLeg = wantLeft;
      const repP = p;

      frame.props.push({ type: 'plyo_box', x: 26, y: 146, w: 30, h: 24 });
      frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEG' : 'RIGHT LEG', second: isSecondLeg });
      const frontAnkleX = 106, frontAnkleY = 166;
      const rearToeX = 48, rearToeY = 143;

      const hipX = this.lerp(94, 86, repP);
      const hipY = this.lerp(108, 112, repP);
      const spineAngle = this.lerp(-1.52, -0.22, repP);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.12 * repP);
      const { shoulderX, shoulderY } = frame.torso;

      const rearLeg = this.solveLegToePivot(hipX - 2, hipY, rearToeX, rearToeY, L_THIGH, L_SHIN, -1, 1);
      const frontLeg = this.solveIK(hipX, hipY, frontAnkleX, frontAnkleY, L_THIGH, L_SHIN, -1);
      const rearName = isSecondLeg ? 'legF' : 'legB';
      const frontName = isSecondLeg ? 'legB' : 'legF';
      addLimb(rearName, 'leg', hipX - 2, hipY, rearLeg.jx, rearLeg.jy, rearLeg.ex, rearLeg.ey, '#64748b', '#475569', isSecondLeg ? 6 : 5.4, 'foot', 1, 200);
      addLimb(frontName, 'leg', hipX, hipY, frontLeg.jx, frontLeg.jy, frontLeg.ex, frontLeg.ey, '#bef264', '#94a3b8', isSecondLeg ? 5.4 : 6, 'foot', 1);

      const handX = shoulderX - 4 * repP;
      const handY = shoulderY + 47;
      if (poseType === 'db_rfe_rdl') {
        const armBack = this.solveIK(shoulderX - 2, shoulderY, handX - 2, handY, L_UPPER_ARM, L_FOREARM, 1);
        const armFront = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else {
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        const armName = (poseType === 'kb_rfe_rdl' && isSecondLeg) ? 'armB' : 'arm';
        addLimb(armName, 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        if (poseType === 'kb_rfe_rdl') {
          frame.props.push({ type: 'kettlebell', x: arm.ex, y: arm.ey + 7.5, r: 7.5, midground: isSecondLeg });
        } else if (poseType === 'bb_rfe_rdl') {
          frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
        }
      }
      return frame;
    }

    if (poseType === 'kb_rdl' || poseType === 'db_rdl' || poseType === 'bb_rdl' || poseType === 'bb_good_morning') {
      const isGM = poseType === 'bb_good_morning';
      const hipX = this.lerp(90, isGM ? 68 : 72, p);
      const hipY = this.lerp(105, isGM ? 111 : 113, p);
      const spineAngle = this.lerp(-1.53, isGM ? -0.08 : -0.24, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.14 * p);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (isGM) {
        const arm = this.solveFK(shoulderX, shoulderY, spineAngle + 3.76, spineAngle + 0.24, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 4.8, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
        return frame;
      }

      const handX = this.lerp(shoulderX + 2, shoulderX - 10, p);
      const handY = shoulderY + 47;

      if (poseType === 'db_rdl') {
        const armBack = this.solveIK(shoulderX - 2, shoulderY, handX - 2, handY, L_UPPER_ARM, L_FOREARM, 1);
        const armFront = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else {
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        if (poseType === 'kb_rdl') {
          frame.props.push({ type: 'kettlebell', x: arm.ex, y: arm.ey + 7.5, r: 7.5 });
        } else {
          frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
        }
      }
      return frame;
    }

    if (poseType === 'db_bent_row' || poseType === 'kb_bent_row' || poseType === 'bb_bent_row') {
      const hipX = 72, hipY = 114;
      const spineAngle = -0.52; // Fixed flat-back hinge
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.15);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);

      if (poseType === 'db_bent_row') {
        frame.props.push({ type: 'hud_badge', text: p >= 0.5 ? 'RIGHT ARM' : 'LEFT ARM', second: p < 0.5 });
        const farPull = 0.5 + 0.5 * Math.cos(theta);
        const farHandX = this.lerp(shoulderX + 2, 88, farPull);
        const farHandY = this.lerp(shoulderY + 45, 104, farPull);
        const farArm = this.solveIK(shoulderX - 2, shoulderY, farHandX, farHandY, L_UPPER_ARM, L_FOREARM, 1);

        const nearHandX = this.lerp(shoulderX + 4, 90, p);
        const nearHandY = this.lerp(shoulderY + 46, 105, p);
        const nearArm = this.solveIK(shoulderX, shoulderY, nearHandX, nearHandY, L_UPPER_ARM, L_FOREARM, 1);

        addLimb('armB', 'arm', shoulderX - 2, shoulderY, farArm.jx, farArm.jy, farArm.ex, farArm.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: farArm.ex, y: farArm.ey });
        addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
        addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
        addLimb('armF', 'arm', shoulderX, shoulderY, nearArm.jx, nearArm.jy, nearArm.ex, nearArm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: nearArm.ex, y: nearArm.ey });
      } else {
        addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
        addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

        if (poseType === 'kb_bent_row') {
          const isSecondRowArm = wantLeft;
          const repP = p;
          frame.props.push({ type: 'hud_badge', text: isSecondRowArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondRowArm });

          const handX = this.lerp(shoulderX + 3, 90, repP);
          const handY = this.lerp(shoulderY + 46, 105, repP);
          const rowArm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
          const braceArm = this.solveFK(shoulderX - 2, shoulderY, 1.50, 1.50, L_UPPER_ARM, L_FOREARM);
          addLimb(isSecondRowArm ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, braceArm.jx, braceArm.jy, braceArm.ex, braceArm.ey, '#64748b', '#475569', isSecondRowArm ? 5.5 : 5, 'hand');
          addLimb(isSecondRowArm ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, rowArm.jx, rowArm.jy, rowArm.ex, rowArm.ey, '#38bdf8', '#38bdf8', isSecondRowArm ? 5 : 5.5, 'hand');
          frame.props.push({ type: 'kettlebell', x: rowArm.ex, y: rowArm.ey + 7.5, r: 7.5, midground: isSecondRowArm });
        } else {
          const handX = this.lerp(shoulderX + 3, 94, p);
          const handY = this.lerp(shoulderY + 46, 103, p);
          const rowArm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, rowArm.jx, rowArm.jy, rowArm.ex, rowArm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          frame.props.push({ type: 'barbell_end', x: rowArm.ex, y: rowArm.ey, r: 9 });
        }
      }
    } else if (poseType === 'hang_power_clean' || poseType === 'db_hang_power_clean' || poseType === 'kb_hang_power_clean' || poseType === 'clean_snatch') {
      const isBarbellHangClean = poseType === 'hang_power_clean';
      const isHangClean = poseType !== 'clean_snatch';
      const sampleOlyNorm = normT;
      const isSecondCleanArm = poseType === 'kb_hang_power_clean' ? wantLeft : false;
      if (poseType === 'kb_hang_power_clean') {
        frame.props.push({ type: 'hud_badge', text: isSecondCleanArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondCleanArm });
      }

      let hx, hy, spine, ua, fa, rack = 0;
      if (isBarbellHangClean) {
        // Barbell Hang Power Clean: keeps forearm in front of torso (ua >= fa) so elbows whip
        // forward under the bar rather than hyperextending backward, with one smooth descent.
        if (sampleOlyNorm < 0.18) {
          const su = this.smoothstep(sampleOlyNorm / 0.18);
          hx = this.lerp(72, 95, su);
          hy = this.lerp(116, 102, su);
          spine = this.lerp(-0.72, -1.55, su);
          ua = this.lerp(1.54, 2.10, su);
          fa = this.lerp(1.58, 0.28, su);
          rack = 0;
        } else if (sampleOlyNorm < 0.34) {
          const su = this.smoothstep((sampleOlyNorm - 0.18) / 0.16);
          hx = this.lerp(95, 82, su);
          hy = this.lerp(102, 122, su);
          spine = this.lerp(-1.55, -1.38, su);
          ua = this.lerp(2.10, 0.08, su);
          fa = this.lerp(0.28, -2.85, su);
          rack = su;
        } else if (sampleOlyNorm < 0.56) {
          const su = this.smoothstep((sampleOlyNorm - 0.34) / 0.22);
          hx = this.lerp(82, 94, su);
          hy = this.lerp(122, 104, su);
          spine = this.lerp(-1.38, -1.54, su);
          ua = 0.08;
          fa = -2.85;
          rack = 1;
        } else if (sampleOlyNorm < 0.64) {
          hx = 94;
          hy = 104;
          spine = -1.54;
          ua = 0.08;
          fa = -2.85;
          rack = 1;
        } else {
          // Continuous uninterrupted lowering back to hang
          const u = (sampleOlyNorm - 0.64) / 0.36;
          const su = this.smoothstep(u);
          hx = this.lerp(94, 72, su);
          hy = this.lerp(104, 116, su);
          spine = this.lerp(-1.54, -0.72, su);
          ua = this.lerp(0.08, 1.54, Math.pow(su, 0.70));
          fa = this.lerp(-2.85, 1.58, Math.pow(su, 1.25));
          rack = this.lerp(1, 0, this.smoothstep(u / 0.45));
        }
      } else if (isHangClean) {
        // DB / KB Hang Power Clean with one smooth, continuous lowering phase
        if (sampleOlyNorm < 0.18) {
          const su = this.smoothstep(sampleOlyNorm / 0.18);
          hx = this.lerp(72, 95, su);
          hy = this.lerp(116, 102, su);
          spine = this.lerp(-0.72, -1.55, su);
          ua = this.lerp(1.54, 1.85, su);
          fa = this.lerp(1.58, 0.72, su);
        } else if (sampleOlyNorm < 0.34) {
          const su = this.smoothstep((sampleOlyNorm - 0.18) / 0.16);
          hx = this.lerp(95, 82, su);
          hy = this.lerp(102, 122, su);
          spine = this.lerp(-1.55, -1.38, su);
          ua = this.lerp(1.85, 0.35, su);
          fa = this.lerp(0.72, -1.62, su);
        } else if (sampleOlyNorm < 0.56) {
          const su = this.smoothstep((sampleOlyNorm - 0.34) / 0.22);
          hx = this.lerp(82, 94, su);
          hy = this.lerp(122, 104, su);
          spine = this.lerp(-1.38, -1.54, su);
          ua = this.lerp(0.35, 0.42, su);
          fa = this.lerp(-1.62, -1.55, su);
        } else if (sampleOlyNorm < 0.64) {
          hx = 94;
          hy = 104;
          spine = -1.54;
          ua = 0.42;
          fa = -1.55;
        } else {
          // Continuous uninterrupted lowering back to hang
          const su = this.smoothstep((sampleOlyNorm - 0.64) / 0.36);
          hx = this.lerp(94, 72, su);
          hy = this.lerp(104, 116, su);
          spine = this.lerp(-1.54, -0.72, su);
          ua = this.lerp(0.42, 1.54, Math.pow(su, 0.75));
          fa = this.lerp(-1.55, 1.58, Math.pow(su, 1.20));
        }
      } else {
        // Barbell Squat Snatch: anatomical pull/turnover + smooth uninterrupted lowering close to torso
        if (sampleOlyNorm < 0.18) {
          const su = this.smoothstep(sampleOlyNorm / 0.18);
          hx = this.lerp(68, 95, su);
          hy = this.lerp(122, 102, su);
          spine = this.lerp(-0.62, -1.56, su);
          ua = this.lerp(1.52, 2.05, su);
          fa = this.lerp(1.55, 0.15, su);
        } else if (sampleOlyNorm < 0.34) {
          const su = this.smoothstep((sampleOlyNorm - 0.18) / 0.16);
          hx = this.lerp(95, 70, su);
          hy = this.lerp(102, 139, su);
          spine = this.lerp(-1.56, -1.24, su);
          ua = this.lerp(2.05, -1.50, Math.pow(su, 1.25));
          fa = this.lerp(0.15, -1.50, Math.pow(su, 0.80));
        } else if (sampleOlyNorm < 0.42) {
          const su = this.smoothstep((sampleOlyNorm - 0.34) / 0.08);
          hx = this.lerp(70, 72, su);
          hy = this.lerp(139, 136, su);
          spine = this.lerp(-1.24, -1.26, su);
          ua = -1.50;
          fa = -1.50;
        } else if (sampleOlyNorm < 0.62) {
          const su = this.smoothstep((sampleOlyNorm - 0.42) / 0.20);
          hx = this.lerp(72, 94, su);
          hy = this.lerp(136, 104, su);
          spine = this.lerp(-1.26, -1.55, su);
          ua = this.lerp(-1.50, -1.55, su);
          fa = this.lerp(-1.50, -1.55, su);
        } else {
          // Smooth, uninterrupted bar descent close to chest/hips down to mid-shin
          const su = this.smoothstep((sampleOlyNorm - 0.62) / 0.38);
          const hingeT = Math.pow(su, 1.30);
          hx = this.lerp(94, 68, hingeT);
          hy = this.lerp(104, 122, hingeT);
          spine = this.lerp(-1.55, -0.62, hingeT);
          ua = this.lerp(-1.55, 1.52, Math.pow(su, 0.55));
          fa = this.lerp(-1.55, 1.55, Math.pow(su, 1.50)) - 1.15 * Math.sin(su * Math.PI);
        }
      }

      const st = { hx, hy, spine, ua, fa, rack };
      frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.10);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(st.hx, st.hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (poseType === 'db_hang_power_clean') {
        const armBack = this.solveFK(shoulderX - 2, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
        const armFront = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else if (poseType === 'kb_hang_power_clean') {
        const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.52, 1.40, L_UPPER_ARM, L_FOREARM);
        const workArm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
        addLimb(isSecondCleanArm ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', isSecondCleanArm ? 5.4 : 5, 'hand');
        addLimb(isSecondCleanArm ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', isSecondCleanArm ? 5 : 5.4, 'hand');
        const rackT = this.clamp(-st.fa / 1.6, 0, 1);
        frame.props.push({
          type: 'kettlebell',
          x: workArm.ex - 5 * rackT,
          y: workArm.ey + this.lerp(7.5, 6.5, rackT),
          r: 7.2,
          midground: isSecondCleanArm
        });
      } else if (isBarbellHangClean) {
        const arm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        const rackBlend = st.rack || 0;
        const barX = this.lerp(arm.ex, shoulderX + 6, rackBlend);
        const barY = this.lerp(arm.ey, shoulderY + 1, rackBlend);
        frame.props.push({ type: 'barbell_end', x: barX, y: barY, r: 9 });
      } else {
        const arm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9 });
      }
    } else if (poseType === 'kb_snatch' || poseType === 'db_snatch') {
      // Alternating single-arm Snatch (Kettlebell or Dumbbell): switches smoothly at bottom handoff
      // Uses continuous overlapping curves (like clean_snatch) for fluid acceleration without mid-air stops.
      const snatchPeriod = 3600;
      const fullNorm = ((timestamp % snatchPeriod) + snatchPeriod) % snatchPeriod / snatchPeriod;
      const isSecondArm = fullNorm >= 0.5;
      const repNorm = (fullNorm % 0.5) * 2;
      const isDB = poseType === 'db_snatch';
      frame.props.push({ type: 'hud_badge', text: isSecondArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondArm });

      const startHX = isDB ? 65 : 68;
      const startHY = isDB ? 128 : 119;
      const startSpine = isDB ? -0.45 : -0.56;
      const startArm = isDB ? 1.61 : 2.09;

      let hx, hy, spine, ua, fa, fua, ffa, bellAngle, bellDist = 8.4;

      if (repNorm < 0.58) {
        // Continuous Ascent: Drive upright -> smooth quarter-squat / soft catch -> tall lockout
        const driveT = this.smoothstep(this.clamp(repNorm / 0.28, 0, 1));
        const catchLo = isDB ? 0.22 : 0.24;
        const catchHi = isDB ? 0.56 : 0.54;
        const catchWave = (repNorm >= catchLo && repNorm <= catchHi)
          ? 0.5 - 0.5 * Math.cos(((repNorm - catchLo) / (catchHi - catchLo)) * Math.PI * 2)
          : 0;
        const armUp = this.smoothstep(this.clamp((repNorm - 0.06) / 0.40, 0, 1));
        const freeSwing = Math.sin(this.clamp(repNorm / 0.58, 0, 1) * Math.PI);

        hx = this.lerp(startHX, 95, driveT) - (isDB ? 11 : 6) * catchWave;
        hy = this.lerp(startHY, 102, driveT) + (isDB ? 17 : 8) * catchWave;
        spine = this.lerp(startSpine, -1.55, driveT) + (isDB ? 0.13 : 0.06) * catchWave;

        ua = this.lerp(startArm, -1.55, Math.pow(armUp, 0.70));
        fa = this.lerp(startArm, -1.55, Math.pow(armUp, 1.36));

        const freeReturn = this.smoothstep(this.clamp((repNorm - 0.10) / 0.46, 0, 1));
        fua = this.lerp(startArm, 1.78, freeReturn) + 0.50 * freeSwing;
        ffa = this.lerp(startArm, 1.90, freeReturn) + 0.50 * freeSwing;

        const bellFlip = this.smoothstep(this.clamp((repNorm - 0.22) / 0.24, 0, 1));
        bellAngle = this.lerp(2.09, 2.48, bellFlip) - 1.55 * Math.sin(bellFlip * Math.PI);
      } else if (repNorm < 0.66) {
        // Brief steady overhead lockout
        hx = 95;
        hy = 102;
        spine = -1.55;
        ua = -1.55;
        fa = -1.55;
        fua = 1.78;
        ffa = 1.90;
        bellAngle = 2.48;
      } else {
        // Smooth uninterrupted lowering close to torso back into bottom handoff
        const down = this.smoothstep((repNorm - 0.66) / 0.34);
        const hingeT = Math.pow(down, 1.18);
        hx = this.lerp(95, startHX, hingeT);
        hy = this.lerp(102, startHY, hingeT);
        spine = this.lerp(-1.55, startSpine, hingeT);

        ua = this.lerp(-1.55, startArm, Math.pow(down, 0.68));
        fa = this.lerp(-1.55, startArm, Math.pow(down, 1.32)) - 0.90 * Math.sin(down * Math.PI);

        fua = this.lerp(1.78, startArm, hingeT);
        ffa = this.lerp(1.90, startArm, hingeT);
        bellAngle = this.lerp(2.48, 2.09, down) - 1.10 * Math.sin(down * Math.PI);
      }

      frame.torso = this.torsoFromHip(hx, hy, spine, 1, 0.08);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hx - 3, hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hx, hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hx - 3, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (!isSecondArm) {
        const workArm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
        const freeArm = this.solveFK(shoulderX - 2, shoulderY, fua, ffa, L_UPPER_ARM, L_FOREARM);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
        addLimb('armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
        frame.props.push(isDB
          ? { type: 'dumbbell_near', x: workArm.ex, y: workArm.ey }
          : { type: 'kettlebell', x: workArm.ex + Math.cos(bellAngle) * bellDist, y: workArm.ey + Math.sin(bellAngle) * bellDist, r: 7.5 });
      } else {
        const workArm = this.solveFK(shoulderX - 2, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
        const freeArm = this.solveFK(shoulderX, shoulderY, fua, ffa, L_UPPER_ARM, L_FOREARM);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#64748b', '#475569', 5.5, 'hand');
        frame.props.push(isDB
          ? { type: 'dumbbell_far', x: workArm.ex, y: workArm.ey }
          : { type: 'kettlebell', x: workArm.ex + Math.cos(bellAngle) * bellDist, y: workArm.ey + Math.sin(bellAngle) * bellDist, r: 7.5 });
        addLimb('armF', 'arm', shoulderX, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
      }
    } else {
      const hipX = this.lerp(68, 95, p);
      const hipY = this.lerp(116, 104, p);
      const spineAngle = this.lerp(-0.55, -1.55, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.14 * (1 - p));
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

      if (poseType === 'kb_swing') {
        // Two-handed pendulum Kettlebell Swing floating to eye level (-0.82 rad)
        const swingAngle = this.lerp(2.05, -0.82, p);
        const arm = this.solveFK(shoulderX, shoulderY, swingAngle, swingAngle, L_UPPER_ARM, L_FOREARM);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({
          type: 'kettlebell',
          x: arm.ex + Math.cos(swingAngle) * 9,
          y: arm.ey + Math.sin(swingAngle) * 9,
          r: 7.5
        });
      } else if (poseType === 'kb_deadlift') {
        // Kettlebell Deadlift: straight arms holding kettlebell handle between feet
        const handX = 96;
        const handY = shoulderY + 47.5;
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'kettlebell', x: arm.ex, y: arm.ey + 7.5, r: 7.5 });
      } else if (poseType === 'db_deadlift') {
        // Dual Dumbbell Deadlift: bells track outside ankles to deck
        const handX = this.lerp(98, 97, p);
        const handY = shoulderY + 47.5;
        const armBack = this.solveIK(shoulderX - 2, shoulderY, handX - 2, handY, L_UPPER_ARM, L_FOREARM, 1);
        const armFront = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
        frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
        addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      } else {
        // Barbell Deadlift
        const handX = this.lerp(100, 98, p);
        const handY = shoulderY + 47.5;
        const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
        addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
        frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
      }
    }
    return frame;
  }

  // ===========================================================================
  // 13. ERGS: BIKEERG, ROWERG & SKIERG (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'bike_erg' || poseType === 'row_erg' || poseType === 'ski_erg') {
    frame.floorY = 170;

    if (poseType === 'bike_erg') {
      const crankX = 94, crankY = 138;
      const wheelX = 148, wheelY = 136;
      const seatX = 62, seatY = 102;
      const barX = 132, barY = 78;
      frame.props.push({ type: 'bike_erg', crankX, crankY, wheelX, wheelY, seatX, seatY, barX, barY, theta });

      const hipX = seatX + 2, hipY = seatY - 4;
      const spineAngle = -0.82 + 0.02 * Math.sin(theta * 2); // Forward Concept2 riding posture with subtle breathing cadence
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.22);
      const { shoulderX, shoulderY } = frame.torso;

      const pedal1X = crankX + Math.cos(theta * 2) * 15;
      const pedal1Y = crankY + Math.sin(theta * 2) * 15;
      const pedal2X = crankX + Math.cos(theta * 2 + Math.PI) * 15;
      const pedal2Y = crankY + Math.sin(theta * 2 + Math.PI) * 15;

      const legBack = this.solveIK(hipX, hipY, pedal2X, pedal2Y, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, pedal1X, pedal1Y, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    } else if (poseType === 'row_erg') {
      // Authentic Rowing Stroke Sequencing:
      // 0: Catch (compressed knees, forward torso lean, straight arms reaching toward cage)
      // 1: Leg Drive (hips slide back while torso holds forward lean and arms stay straight)
      // 2: Finish (legs extended, slight layback, elbows row handle to lower ribs)
      // 3: Arms & Body Recovery (arms extend forward & torso rocks over before knees re-compress)
      const rowKF = [
        { hx: 98, spine: -1.22, wx: 136, wy: 114 },
        { hx: 68, spine: -1.42, wx: 112, wy: 114 },
        { hx: 52, spine: -1.84, wx: 58, wy: 112 },
        { hx: 76, spine: -1.32, wx: 116, wy: 114 }
      ];
      const st = this.sampleKeyframes(rowKF, normT);
      const ankleX = 112, ankleY = 148;
      const hipX = st.hx, hipY = 144;

      frame.torso = this.torsoFromHip(hipX, hipY, st.spine, 1, 0.12);
      const { shoulderX, shoulderY } = frame.torso;

      frame.props.push({ type: 'row_erg', handX: st.wx, handY: st.wy, hipX, hipY });

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, st.wx, st.wy, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    } else {
      // SKIERG
      const ankleX = 88, ankleY = 166;
      const hipX = this.lerp(86, 70, p);
      const hipY = this.lerp(104, 120, p);
      const spineAngle = this.lerp(-1.50, -0.75, p);
      frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.10);
      const { shoulderX, shoulderY } = frame.torso;

      const handX = this.lerp(116, 86, p);
      const handY = this.lerp(36, 134, p);
      frame.props.push({ type: 'ski_erg', handX, handY });

      const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    }
    return frame;
  }

  // ===========================================================================
  // 14. BURPEES, DEVIL PRESS, MAN MAKERS & ATHLETIC UP-DOWNS (NO PUSH-UP)
  //     Every keyframe uses (hx, hy, spine) so torso length is strictly 46.0px!
  // ===========================================================================
  if (
    poseType === 'burpee_6stage' ||
    poseType === 'devil_press' ||
    poseType === 'man_maker' ||
    poseType === 'athletic_up_down'
  ) {
    frame.floorY = 170;

    if (poseType === 'man_maker') {
      const mmPeriod = 4600;
      const mmNorm = ((timestamp % mmPeriod) + mmPeriod) % mmPeriod / mmPeriod;
      let hx, hy, spine, ax, ay, bwx, bwy, fwx, fwy;

      if (mmNorm < 0.09) {
        // Phase 1: Squat-Hinge & Plant DBs Firmly on Floor
        const su = this.smoothstep(mmNorm / 0.09);
        hx = this.lerp(96, 86, su);
        hy = this.lerp(104, 136, su);
        spine = this.lerp(-1.55, -0.38, su);
        ax = 96;
        ay = 166;
        bwx = this.lerp(104, 136, su);
        bwy = this.lerp(98, 164, su);
        fwx = this.lerp(106, 136, su);
        fwy = this.lerp(98, 164, su);
      } else if (mmNorm < 0.18) {
        // Phase 2: Explosive Sprawl Feet Back into Rigid High Plank (DBs planted)
        const u = (mmNorm - 0.09) / 0.09;
        const su = this.smoothstep(u);
        hx = this.lerp(86, 92, su);
        hy = this.lerp(136, 138, su) - 2 * Math.sin(u * Math.PI);
        spine = this.lerp(-0.38, -0.42, su);
        ax = this.lerp(96, 35, su);
        ay = this.lerp(166, 164, su) - 5 * Math.sin(u * Math.PI);
        bwx = 136; bwy = 164;
        fwx = 136; fwy = 164;
      } else if (mmNorm < 0.25) {
        // Phase 3a: Lower Chest to Deck Push-Up
        const su = this.smoothstep((mmNorm - 0.18) / 0.07);
        hx = this.lerp(92, 91, su);
        hy = this.lerp(138, 154, su);
        spine = this.lerp(-0.42, -0.20, su);
        ax = this.lerp(35, 31, su);
        ay = 164;
        bwx = 136; bwy = 164;
        fwx = 136; fwy = 164;
      } else if (mmNorm < 0.31) {
        // Phase 3b: Crisp Press Up to High Plank
        const su = this.smoothstep((mmNorm - 0.25) / 0.06);
        hx = this.lerp(91, 92, su);
        hy = this.lerp(154, 138, su);
        spine = this.lerp(-0.20, -0.42, su);
        ax = this.lerp(31, 35, su);
        ay = 164;
        bwx = 136; bwy = 164;
        fwx = 136; fwy = 164;
      } else if (mmNorm < 0.44) {
        // Phase 4: Renegade Row 1 (Near arm rows DB tight to ribs, far arm holds plank)
        const u = (mmNorm - 0.31) / 0.13;
        const pull = u < 0.52 ? this.smoothstep(u / 0.52) : 1 - this.smoothstep((u - 0.52) / 0.48);
        hx = 92; hy = 138; spine = -0.42;
        ax = 35; ay = 164;
        bwx = 136; bwy = 164;
        fwx = this.lerp(136, 102, pull);
        fwy = this.lerp(164, 124, pull);
      } else if (mmNorm < 0.57) {
        // Phase 5: Renegade Row 2 (Far arm rows DB tight to ribs, near arm holds plank)
        const u = (mmNorm - 0.44) / 0.13;
        const pull = u < 0.52 ? this.smoothstep(u / 0.52) : 1 - this.smoothstep((u - 0.52) / 0.48);
        hx = 92; hy = 138; spine = -0.42;
        ax = 35; ay = 164;
        bwx = this.lerp(136, 102, pull);
        bwy = this.lerp(164, 124, pull);
        fwx = 136; fwy = 164;
      } else if (mmNorm < 0.67) {
        // Phase 6: Core Hip Pike & Snap Feet Forward into Deep Squat (DBs stay planted on floor!)
        const u = (mmNorm - 0.57) / 0.10;
        const su = this.smoothstep(u);
        hx = this.lerp(92, 84, su) + 2 * Math.sin(u * Math.PI);
        hy = this.lerp(138, 136, su) - 7 * Math.sin(u * Math.PI);
        spine = this.lerp(-0.42, -0.38, su) + 0.12 * Math.sin(u * Math.PI);
        ax = this.lerp(35, 96, su);
        ay = this.lerp(164, 166, su) - 13 * Math.sin(u * Math.PI);
        bwx = 136; bwy = 164;
        fwx = 136; fwy = 164;
      } else if (mmNorm < 0.77) {
        // Phase 7: Explosive DB Squat Clean (hip pull -> rapid drop & rack at shoulders)
        const u = (mmNorm - 0.67) / 0.10;
        if (u < 0.45) {
          const su = this.smoothstep(u / 0.45);
          hx = this.lerp(84, 87, su);
          hy = this.lerp(136, 122, su);
          spine = this.lerp(-0.38, -0.95, su);
          bwx = this.lerp(136, 118, su);
          bwy = this.lerp(164, 112, su);
          fwx = this.lerp(136, 120, su);
          fwy = this.lerp(164, 112, su);
        } else {
          const su = this.smoothstep((u - 0.45) / 0.55);
          hx = this.lerp(87, 72, su);
          hy = this.lerp(122, 139, su);
          spine = this.lerp(-0.95, -1.24, su);
          bwx = this.lerp(118, 104, su);
          bwy = this.lerp(112, 74, su);
          fwx = this.lerp(120, 106, su);
          fwy = this.lerp(112, 74, su);
        }
        ax = 96; ay = 166;
      } else if (mmNorm < 0.88) {
        // Phase 8: Explosive Thruster Drive to Overhead Lockout
        const su = this.smoothstep((mmNorm - 0.77) / 0.11);
        const pressT = Math.pow(su, 1.35);
        hx = this.lerp(72, 96, su);
        hy = this.lerp(139, 104, su);
        spine = this.lerp(-1.24, -1.55, su);
        ax = 96; ay = 166;
        bwx = 104;
        bwy = this.lerp(74, 12, pressT);
        fwx = 106;
        fwy = this.lerp(74, 12, pressT);
      } else if (mmNorm < 0.91) {
        // Brief overhead lockout hold
        hx = 96; hy = 104; spine = -1.55;
        ax = 96; ay = 166;
        bwx = 104; bwy = 12;
        fwx = 106; fwy = 12;
      } else {
        // Phase 9: Smooth Uninterrupted Eccentric Return Overhead -> Hips
        const su = this.smoothstep((mmNorm - 0.91) / 0.09);
        const arcOut = 18 * Math.sin(su * Math.PI);
        hx = 96; hy = 104; spine = -1.55;
        ax = 96; ay = 166;
        bwx = 104 + arcOut;
        bwy = this.lerp(12, 98, su);
        fwx = 106 + arcOut;
        fwy = this.lerp(12, 98, su);
      }

      const st = { hx, hy, spine, ax, ay, bwx, bwy, fwx, fwy };
      frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
      const { shoulderX, shoulderY } = frame.torso;

      const legBack = this.solveIK(st.hx - 2, st.hy, st.ax - 3, st.ay, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(st.hx, st.hy, st.ax, st.ay, L_THIGH, L_SHIN, -1);
      const armBack = this.solveIK(shoulderX - 2, shoulderY, st.bwx, st.bwy, L_UPPER_ARM, L_FOREARM, 1);
      const armFront = this.solveIK(shoulderX, shoulderY, st.fwx, st.fwy, L_UPPER_ARM, L_FOREARM, 1);

      addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
      frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
      addLimb('legB', 'leg', st.hx - 2, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
      frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
      return frame;
    }

    const burpeePeriod = 3200;
    const bNorm = ((timestamp % burpeePeriod) + burpeePeriod) % burpeePeriod / burpeePeriod;
    const isDevilPress = poseType === 'devil_press';

    let st;
    if (poseType === 'burpee_6stage') {
      let hx, hy, spine, ax, ay, wx, wy;
      let polarArm = null; // { angle, len } relative to shoulder when swinging vertically

      if (bNorm < 0.13) {
        // Phase 1: Deep Squat-Hinge & Plant Hands Flat on Floor
        const su = this.smoothstep(bNorm / 0.13);
        hx = this.lerp(96, 84, su);
        hy = this.lerp(104, 136, su);
        spine = this.lerp(-1.55, -0.38, su);
        ax = 96;
        ay = 166;
        wx = this.lerp(104, 136, su);
        wy = this.lerp(98, 164, su);
      } else if (bNorm < 0.25) {
        // Phase 2: Sprawl Feet Back into Rigid High Plank (hands stay planted)
        const u = (bNorm - 0.13) / 0.12;
        const su = this.smoothstep(u);
        hx = this.lerp(84, 92, su);
        hy = this.lerp(136, 138, su) - 2 * Math.sin(u * Math.PI);
        spine = this.lerp(-0.38, -0.42, su);
        ax = this.lerp(96, 35, su);
        ay = this.lerp(166, 164, su) - 5 * Math.sin(u * Math.PI);
        wx = 136;
        wy = 164;
      } else if (bNorm < 0.37) {
        // Phase 3: Lower Chest & Thighs to Deck
        const su = this.smoothstep((bNorm - 0.25) / 0.12);
        hx = this.lerp(92, 91, su);
        hy = this.lerp(138, 154, su);
        spine = this.lerp(-0.42, -0.20, su);
        ax = this.lerp(35, 31, su);
        ay = 164;
        wx = 136;
        wy = 164;
      } else if (bNorm < 0.48) {
        // Phase 4: Press / Peel Chest Up
        const su = this.smoothstep((bNorm - 0.37) / 0.11);
        hx = 91;
        hy = this.lerp(154, 148, su);
        spine = this.lerp(-0.20, -0.68, su);
        ax = this.lerp(31, 33, su);
        ay = 164;
        wx = 136;
        wy = 164;
      } else if (bNorm < 0.62) {
        // Phase 5: Hip Pike & Snap Feet Forward Flat into Athletic Squat
        const u = (bNorm - 0.48) / 0.14;
        const su = this.smoothstep(u);
        hx = this.lerp(91, 84, su);
        hy = this.lerp(148, 132, su) - 12 * Math.sin(u * Math.PI);
        spine = this.lerp(-0.68, -0.82, su) + 0.18 * Math.sin(u * Math.PI);
        ax = this.lerp(33, 96, su);
        ay = this.lerp(164, 166, su) - 14 * Math.sin(u * Math.PI);
        wx = this.lerp(136, 120, su);
        wy = this.lerp(164, 140.1, su);
      } else if (bNorm < 0.73) {
        // Phase 6: Explosive Triple-Extension Push-Off ON THE FLOOR before leaving ground
        const u = (bNorm - 0.62) / 0.11;
        const e = u * u;
        const su = this.smoothstep(u);
        hx = this.lerp(84, 96, e);
        hy = this.lerp(132, 102, e);
        spine = this.lerp(-0.82, -1.52, e);
        ax = 96;
        ay = this.lerp(166, 164, e * e);
        polarArm = {
          angle: this.lerp(1.46, -1.15, su),
          len: this.lerp(42.0, 40.0, su)
        };
      } else if (bNorm < 0.88) {
        // Phase 7: Ballistic Parabolic Jump Flight & Overhead Clap (legs extended)
        const u = (bNorm - 0.73) / 0.15;
        const parabola = 4 * u * (1 - u);
        const jumpH = 20;
        hx = 96;
        hy = 102 - jumpH * parabola;
        spine = -1.52 - 0.03 * parabola;
        ax = 96;
        ay = 164 - jumpH * parabola;
        if (u < 0.5) {
          const su = this.smoothstep(u / 0.5);
          polarArm = {
            angle: this.lerp(-1.15, -1.355, su),
            len: this.lerp(40.0, 32.8, su)
          };
        } else {
          const su = this.smoothstep((u - 0.5) / 0.5);
          polarArm = {
            angle: this.lerp(-1.355, -0.60, su),
            len: this.lerp(32.8, 39.0, su)
          };
        }
      } else if (bNorm < 0.93) {
        // Phase 8a: Soft Landing Absorption (knees flex to absorb downward momentum)
        const u = (bNorm - 0.88) / 0.05;
        const absCurve = 1 - (1 - u) * (1 - u);
        const su = this.smoothstep(u);
        hx = this.lerp(96, 92, absCurve);
        hy = this.lerp(102, 114, absCurve);
        spine = this.lerp(-1.52, -1.34, absCurve);
        ax = 96;
        ay = this.lerp(164, 166, absCurve);
        polarArm = {
          angle: this.lerp(-0.60, 0.45, su),
          len: this.lerp(39.0, 41.0, su)
        };
      } else {
        // Phase 8b: Smooth Rebound to Stand Tall
        const su = this.smoothstep((bNorm - 0.93) / 0.07);
        hx = this.lerp(92, 96, su);
        hy = this.lerp(114, 104, su);
        spine = this.lerp(-1.34, -1.55, su);
        ax = 96;
        ay = 166;
        polarArm = {
          angle: this.lerp(0.45, 1.3976, su),
          len: this.lerp(41.0, 40.61, su)
        };
      }

      if (polarArm) {
        const sx = hx + Math.cos(spine) * L_TORSO;
        const sy = hy + Math.sin(spine) * L_TORSO;
        wx = sx + Math.cos(polarArm.angle) * polarArm.len;
        wy = sy + Math.sin(polarArm.angle) * polarArm.len;
      }
      st = { hx, hy, spine, ax, ay, wx, wy };
    } else {
      const KF = isDevilPress
        ? [
          // 0: Stand Tall / overhead DB lockout finish
          { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, wx: 104, wy: 98 },
          // 1: Deep Squat-Hinge & Plant Hands Flat on DBs
          { hx: 86, hy: 136, spine: -0.38, ax: 96, ay: 166, wx: 136, wy: 164 },
          // 2: Sprawl Feet Back into True Rigid High Plank
          { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
          // 3: Chest & Thighs Touch Deck
          { hx: 91, hy: 154, spine: -0.20, ax: 31, ay: 164, wx: 136, wy: 164 },
          // 4: Press up to High Plank (DBs planted on floor)
          { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
          // 5: Core Hip Pike & Snap: feet hop forward while DBs stay planted on floor!
          { hx: 88, hy: 130, spine: -0.28, ax: 68, ay: 152, wx: 136, wy: 164 },
          // 6: Feet Land Flat Outside DBs in Deep Squat (DBs still planted on floor!)
          { hx: 84, hy: 136, spine: -0.38, ax: 96, ay: 166, wx: 136, wy: 164 },
          // 7: Hip Drive & Swing DBs Forward Through Power Zone
          { hx: 90, hy: 114, spine: -1.15, ax: 98, ay: 166, wx: 134, wy: 84 },
          // 8: DB Snatch to Overhead Lockout
          { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, wx: 106, wy: 10 },
          // 9: Lower DBs Smoothly Forward-Down
          { hx: 96, hy: 106, spine: -1.48, ax: 98, ay: 166, wx: 122, wy: 78 }
        ]
        : [
          // ATHLETIC UP-DOWN:
          // 0: Stand Tall
          { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, wx: 104, wy: 98 },
          // 1: Deep Squat-Hinge & Plant Hands Flat on Floor at (136, 164)
          { hx: 86, hy: 136, spine: -0.38, ax: 96, ay: 166, wx: 136, wy: 164 },
          // 2: Kick Feet Back into Rigid Straight-Arm High Plank
          { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
          // 3: Hold Crisp High Plank Lockout (no push-up, zero hip sag)
          { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
          // 4: Elastic Hip-Pike Hop — Snap Feet Forward Under Hips while Hands Push Off Floor
          { hx: 86, hy: 128, spine: -0.45, ax: 94, ay: 164, wx: 136, wy: 162 },
          // 5: Stand Tall & Finish Rep
          { hx: 94, hy: 110, spine: -1.46, ax: 98, ay: 166, wx: 112, wy: 96 }
        ];
      st = this.sampleKeyframes(KF, bNorm);
    }

    frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
    const { shoulderX, shoulderY } = frame.torso;

    const legBack = this.solveIK(st.hx - 2, st.hy, st.ax - 3, st.ay, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(st.hx, st.hy, st.ax, st.ay, L_THIGH, L_SHIN, -1);
    const arm = this.solveIK(shoulderX, shoulderY, st.wx, st.wy, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', st.hx - 2, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
    addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');

    if (isDevilPress) {
      frame.props.push({ type: 'dumbbell_near', x: arm.ex, y: arm.ey });
    }
    return frame;
  }

  // ===========================================================================
  // 15. MOUNTAIN CLIMBERS (SIDE VIEW - RIGID 46px SPINE & REAR FOOT ON FLOOR)
  // ===========================================================================
  if (poseType === 'mountain_climber') {
    frame.floorY = 170;
    const handX = 138, handY = 164;
    const hipX = 91, hipY = 134;
    const spineAngle = -0.38; // Solid high-plank spine -> shoulder at (133.7, 116.9)
    frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.08);
    const { shoulderX, shoulderY } = frame.torso;

    const climberPeriod = 1100;
    const p = ((timestamp % climberPeriod) + climberPeriod) % climberPeriod / climberPeriod;
    let leg1X, leg1Y, leg2X, leg2Y;
    const backX = 35, backY = 164;
    const frontX = 88, frontY = 146;

    if (p < 0.30) {
      leg1X = frontX; leg1Y = frontY;
      leg2X = backX; leg2Y = backY;
    } else if (p < 0.50) {
      const u = this.smoothstep((p - 0.30) / 0.20);
      leg1X = this.lerp(frontX, backX, u);
      leg1Y = this.lerp(frontY, backY, u);
      leg2X = this.lerp(backX, frontX, u);
      leg2Y = this.lerp(backY, frontY, u);
    } else if (p < 0.80) {
      leg1X = backX; leg1Y = backY;
      leg2X = frontX; leg2Y = frontY;
    } else {
      const u = this.smoothstep((p - 0.80) / 0.20);
      leg1X = this.lerp(backX, frontX, u);
      leg1Y = this.lerp(backY, frontY, u);
      leg2X = this.lerp(frontX, backX, u);
      leg2Y = this.lerp(frontY, backY, u);
    }

    const legBack = this.solveIK(hipX - 2, hipY, leg2X, leg2Y, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(hipX, hipY, leg1X, leg1Y, L_THIGH, L_SHIN, -1);
    const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.5, 'foot', 1);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
    return frame;
  }

  // ===========================================================================
  // 16. BOX JUMPS & BOX STEP-UPS (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'box_jump' || poseType === 'box_step_up') {
    frame.floorY = 170;
    frame.props.push({ type: 'plyo_box', x: 118, y: 122, w: 52, h: 48 });

    if (poseType === 'box_step_up') {
      const stepPeriod = 3800;
      const norm = ((timestamp % stepPeriod) + stepPeriod) % stepPeriod / stepPeriod;
      const isRep2 = norm >= 0.50;
      const u = isRep2 ? (norm - 0.50) / 0.50 : norm / 0.50;
      frame.props.push({ type: 'hud_badge', text: isRep2 ? 'LEFT LEAD' : 'RIGHT LEAD', second: isRep2 });

      let hx, hy, spine, bax, bay, fax, fay, ua, fa;
      if (u < 0.25) {
        // Phase 1: Step lead foot up onto box top (134, 118)
        const t = this.smoothstep(u / 0.25);
        hx = this.lerp(72, 80, t);
        hy = this.lerp(104, 106, t);
        spine = this.lerp(-1.52, -1.38, t);
        if (!isRep2) {
          bax = 70; bay = 166;
          fax = this.lerp(74, 134, t);
          fay = this.lerp(166, 118, t) - 16 * Math.sin(t * Math.PI);
        } else {
          fax = 74; fay = 166;
          bax = this.lerp(70, 134, t);
          bay = this.lerp(166, 118, t) - 16 * Math.sin(t * Math.PI);
        }
        ua = this.lerp(1.48, 1.25, t); fa = this.lerp(1.30, 0.95, t);
      } else if (u < 0.50) {
        // Phase 2: Drive up through heel to full standing lockout on box
        const t = this.smoothstep((u - 0.25) / 0.25);
        hx = this.lerp(80, 134, t);
        hy = this.lerp(106, 60, t);
        spine = this.lerp(-1.38, -1.55, t);
        if (!isRep2) {
          fax = 134; fay = 118;
          bax = this.lerp(70, 128, t);
          bay = this.lerp(166, 118, t) - 18 * Math.sin(t * Math.PI);
        } else {
          bax = 134; bay = 118;
          fax = this.lerp(74, 128, t);
          fay = this.lerp(166, 118, t) - 18 * Math.sin(t * Math.PI);
        }
        ua = this.lerp(1.25, 1.48, t); fa = this.lerp(0.95, 1.30, t);
      } else if (u < 0.75) {
        // Phase 3: Step trailing foot back down to floor
        const t = this.smoothstep((u - 0.50) / 0.25);
        hx = this.lerp(134, 80, t);
        hy = this.lerp(60, 106, t);
        spine = this.lerp(-1.55, -1.38, t);
        if (!isRep2) {
          fax = 134; fay = 118;
          bax = this.lerp(128, 70, t);
          bay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
        } else {
          bax = 134; bay = 118;
          fax = this.lerp(128, 74, t);
          fay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
        }
        ua = this.lerp(1.48, 1.25, t); fa = this.lerp(1.30, 0.95, t);
      } else {
        // Phase 4: Return lead foot to floor
        const t = this.smoothstep((u - 0.75) / 0.25);
        hx = this.lerp(80, 72, t);
        hy = this.lerp(106, 104, t);
        spine = this.lerp(-1.38, -1.52, t);
        if (!isRep2) {
          bax = 70; bay = 166;
          fax = this.lerp(134, 74, t);
          fay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
        } else {
          fax = 74; fay = 166;
          bax = this.lerp(134, 70, t);
          bay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
        }
        ua = this.lerp(1.25, 1.48, t); fa = this.lerp(0.95, 1.30, t);
      }

      frame.torso = this.torsoFromHip(hx, hy, spine, 1, 0.08);
      const { shoulderX, shoulderY } = frame.torso;

      const activeSurfaceYB = bax >= 116 ? 122 : 170;
      const activeSurfaceYF = fax >= 116 ? 122 : 170;
      const legBack = this.solveIK(hx - 2, hy, bax, bay, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(hx, hy, fax, fay, L_THIGH, L_SHIN, -1);
      const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);

      addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, activeSurfaceYB);
      addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, activeSurfaceYF);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
      return frame;
    }

    let hx, hy, spine, ax, ay, ua, fa;
    if (normT < 0.16) {
      // Phase 1: Countermovement Crouch & Arm Backswing on Floor
      const u = this.smoothstep(normT / 0.16);
      hx = this.lerp(72, 58, u);
      hy = this.lerp(106, 126, u);
      spine = this.lerp(-1.48, -1.08, u);
      ax = 74;
      ay = 166;
      ua = this.lerp(1.42, 1.95, u);
      fa = this.lerp(1.12, 1.65, u);
    } else if (normT < 0.28) {
      // Phase 2: Explosive Triple-Extension Push-Off on Floor!
      const u = this.smoothstep((normT - 0.16) / 0.12);
      hx = this.lerp(58, 78, u);
      hy = this.lerp(126, 103, u);
      spine = this.lerp(-1.08, -1.44, u);
      ax = 74;
      ay = this.lerp(166, 163, u);
      ua = this.lerp(1.95, -0.32, u);
      fa = this.lerp(1.65, -0.95, u);
    } else if (normT < 0.50) {
      // Phase 3: Continuous Ballistic Parabolic Flight Onto Box
      const u = (normT - 0.28) / 0.22;
      const su = this.smoothstep(u);
      const parabola = 4 * u * (1 - u);
      hx = this.lerp(78, 130, u);
      hy = this.lerp(103, 84, u) - 24 * parabola;
      spine = this.lerp(-1.44, -1.24, su);
      ax = this.lerp(74, 140, su);
      ay = this.lerp(163, 118, su) - 36 * parabola;
      ua = this.lerp(-0.32, 0.35, su);
      fa = this.lerp(-0.95, -0.45, su);
    } else if (normT < 0.68) {
      // Phase 4: Soft Catch on Box -> Stand Tall to Lockout on Box
      const u = this.smoothstep((normT - 0.50) / 0.18);
      hx = this.lerp(130, 140, u);
      hy = this.lerp(84, 60, u);
      spine = this.lerp(-1.24, -1.55, u);
      ax = 140;
      ay = 118;
      ua = this.lerp(0.35, 1.48, u);
      fa = this.lerp(-0.45, 1.32, u);
    } else if (normT < 0.74) {
      // Phase 5a: Countermovement dip on box to prepare for backward jump
      const u = this.smoothstep((normT - 0.68) / 0.06);
      hx = this.lerp(140, 138, u);
      hy = this.lerp(60, 68, u);
      spine = this.lerp(-1.55, -1.48, u);
      ax = this.lerp(140, 138, u);
      ay = 118;
      ua = this.lerp(1.48, 1.75, u);
      fa = this.lerp(1.32, 1.45, u);
    } else if (normT < 0.88) {
      // Phase 5b: Ballistic Jump Down off the box: pop UP & BACK off box edge into flight!
      const t = (normT - 0.74) / 0.14;
      hx = this.lerp(138, 74, t);
      hy = 125.7 * t * t - 77.7 * t + 68;
      ay = 125.7 * t * t - 77.7 * t + 118;
      ax = this.lerp(138, 74, t);
      spine = this.lerp(-1.48, -1.42, t);
      ua = this.lerp(1.75, 1.25, t);
      fa = this.lerp(1.45, 0.85, t);
    } else {
      // Phase 6: Absorb Floor Landing with deep knee flexion & reset
      const u = this.smoothstep((normT - 0.88) / 0.12);
      hx = this.lerp(74, 72, u);
      hy = this.lerp(106, 106, u) + 12 * Math.sin(u * Math.PI);
      spine = this.lerp(-1.42, -1.48, u);
      ax = 74;
      ay = 166;
      ua = this.lerp(1.25, 1.42, u);
      fa = this.lerp(0.85, 1.12, u);
    }

    frame.torso = this.torsoFromHip(hx, hy, spine, 1, 0.08);
    const { shoulderX, shoulderY } = frame.torso;

    // Surface under foot is box top (122) when over the box (x >= 116), else floor (170)
    const activeSurfaceY = ax >= 116 ? 122 : 170;
    const legBack = this.solveIK(hx - 2, hy, ax - 2, ay, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(hx, hy, ax, ay, L_THIGH, L_SHIN, -1);
    const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);

    addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, activeSurfaceY);
    addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, activeSurfaceY);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    return frame;
  }

  // ===========================================================================
  // 17. SINGLE-UNDERS vs DOUBLE-UNDERS (FRONT VIEW) & SHUTTLE RUN (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'single_unders' || poseType === 'double_unders' || poseType === 'jump_rope') {
    frame.view = 'front';
    frame.floorY = 170;
    const isDoubleUnder = poseType === 'double_unders';
    const ropeRepMs = isDoubleUnder ? 640 : 500;
    const repT = ((timestamp % ropeRepMs) + ropeRepMs) % ropeRepMs / ropeRepMs;
    const ropePhase = isDoubleUnder
      ? (repT - 0.50) * Math.PI * 4 + Math.PI - 0.55 * Math.sin((repT - 0.50) * Math.PI * 2)
      : (repT - 0.50) * Math.PI * 2;

    const maxJumpPx = isDoubleUnder ? 24 : 15;
    const dip = isDoubleUnder ? 10 : 6;
    const baseHipY = 102.5; // 63.5px above footY=166 -> full leg extension at takeoff
    let hipY;
    let footY = 166;

    if (repT < 0.20) {
      // Phase 1: Grounded Push-Off — straighten legs to full extension while feet stay on floor
      const u = repT / 0.20;
      hipY = this.lerp(baseHipY + dip, baseHipY, u * u);
    } else if (repT < 0.80) {
      // Phase 2: Ballistic Parabolic Flight — launch after full extension
      const u = (repT - 0.20) / 0.60;
      const jumpHeight = maxJumpPx * 4 * u * (1 - u);
      hipY = baseHipY - jumpHeight;
      footY = 166 - jumpHeight;
    } else {
      // Phase 3: Landing Absorption — feet plant and knees flex to absorb impact
      const u = (repT - 0.80) / 0.20;
      const absCurve = 1 - (1 - u) * (1 - u);
      hipY = this.lerp(baseHipY, baseHipY + dip, absCurve);
    }

    const shoulderY = hipY - L_TORSO;
    const leftShoulderX = 86, rightShoulderX = 114;
    const leftHipX = 91, rightHipX = 109;

    frame.frontTorso = {
      leftShoulderX, rightShoulderX, shoulderY,
      leftHipX, rightHipX, hipY,
      headX: 100, headY: shoulderY - 14
    };

    // Tucked-elbow jump rope mechanics:
    // Upper arms hang down tucked close beside the ribs (jx ≈ 80 and 120) while forearms
    // angle outward (~50°) to the wrists/handles (ex ≈ 59 and 141) with small circular wrist orbits!
    const uaL = 1.82 + Math.cos(ropePhase) * 0.04;
    const faL = 2.66 + Math.sin(ropePhase) * 0.12;
    const uaR = Math.PI - uaL;
    const faR = Math.PI - faL;

    const armL = this.solveFK(leftShoulderX, shoulderY, uaL, faL, L_UPPER_ARM, L_FOREARM);
    const armR = this.solveFK(rightShoulderX, shoulderY, uaR, faR, L_UPPER_ARM, L_FOREARM);
    addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');

    const legL = this.solveFrontLeg(leftHipX, hipY, leftHipX, footY, true);
    const legR = this.solveFrontLeg(rightHipX, hipY, rightHipX, footY, false);
    addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');

    frame.props.push({
      type: 'jump_rope',
      isDoubleUnder,
      ropePhase,
      leftHandX: armL.ex,
      rightHandX: armR.ex,
      handY: armL.ey
    });
    return frame;
  }

  // ===========================================================================
  // 18. JUMPING JACKS (FRONT VIEW)
  // ===========================================================================
  if (poseType === 'jumping_jacks') {
    frame.view = 'front';
    frame.floorY = 170;

    // 1.2s per jumping jack (2 reps per 2.4s period):
    // Two distinct airborne hops (closed->wide and wide->closed) separated by brief
    // grounded landing/rebound phases so feet never slide across the floor.
    const repT = (normT * 2) % 1;
    let jumpHeight = 0;
    let dip = 0;
    let spreadWave = 0;
    let legExtend = 0;

    if (repT < 0.12) {
      dip = 2.0 * (0.5 + 0.5 * Math.cos((repT / 0.12) * Math.PI));
      spreadWave = 0;
    } else if (repT < 0.42) {
      const u = (repT - 0.12) / 0.30;
      jumpHeight = 11.5 * 4 * u * (1 - u);
      spreadWave = this.smoothstep(u);
      legExtend = 2.0 * Math.sin(u * Math.PI);
    } else if (repT < 0.58) {
      const u = (repT - 0.42) / 0.16;
      dip = 2.0 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
      spreadWave = 1;
    } else if (repT < 0.88) {
      const u = (repT - 0.58) / 0.30;
      jumpHeight = 11.5 * 4 * u * (1 - u);
      spreadWave = 1 - this.smoothstep(u);
      legExtend = 2.0 * Math.sin(u * Math.PI);
    } else {
      dip = 2.0 * (0.5 + 0.5 * Math.cos(((1 - repT) / 0.12) * Math.PI));
      spreadWave = 0;
    }

    const armWave = 0.5 - 0.5 * Math.cos(repT * Math.PI * 2);

    const shoulderY = 59 - jumpHeight + dip;
    const hipY = shoulderY + L_TORSO;
    const leftShoulderX = 86, rightShoulderX = 114;
    const leftHipX = 91, rightHipX = 109;

    frame.frontTorso = {
      leftShoulderX, rightShoulderX, shoulderY,
      leftHipX, rightHipX, hipY,
      headX: 100, headY: shoulderY - 14
    };

    const footSpread = this.lerp(8, 28, spreadWave);
    const footY = 166 - jumpHeight + legExtend;
    const footLX = 100 - footSpread;
    const footRX = 100 + footSpread;

    const legL = this.solveFrontLeg(leftHipX, hipY, footLX, footY, true);
    const legR = this.solveFrontLeg(rightHipX, hipY, footRX, footY, false);
    addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
    addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');

    // Arms sweep wide laterally outward from sides to clapping overhead
    const uaL = this.lerp(1.74, Math.PI + 1.45, armWave);
    const faL = this.lerp(1.74, Math.PI + 1.98, armWave);
    const uaR = Math.PI - uaL;
    const faR = Math.PI - faL;
    const armL = this.solveFK(leftShoulderX, shoulderY, uaL, faL, L_UPPER_ARM, L_FOREARM);
    const armR = this.solveFK(rightShoulderX, shoulderY, uaR, faR, L_UPPER_ARM, L_FOREARM);
    addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
    addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');

    return frame;
  }

  // ===========================================================================
  // 18. FLOOR OLYMPIC LIFTS & COMPLEXES: POWER/SQUAT CLEAN, POWER SNATCH, C&J
  // ===========================================================================
  if (
    poseType === 'bb_power_clean' ||
    poseType === 'bb_squat_clean' ||
    poseType === 'db_power_clean' ||
    poseType === 'kb_clean' ||
    poseType === 'bb_power_snatch' ||
    poseType === 'bb_clean_and_jerk' ||
    poseType === 'db_clean_and_jerk' ||
    poseType === 'kb_clean_and_jerk'
  ) {
    frame.floorY = 170;
    const ankleX = 92, ankleY = 166;
    const isCJ = poseType === 'bb_clean_and_jerk' || poseType === 'db_clean_and_jerk' || poseType === 'kb_clean_and_jerk';
    const isBB = poseType === 'bb_power_clean' || poseType === 'bb_squat_clean' || poseType === 'bb_power_snatch' || poseType === 'bb_clean_and_jerk';
    const isKB = poseType === 'kb_clean' || poseType === 'kb_clean_and_jerk';
    const isDB = poseType === 'db_power_clean' || poseType === 'db_clean_and_jerk';

    const cycleMs = isCJ
      ? 4600
      : (poseType === 'kb_clean'
        ? 2100
        : (poseType === 'db_power_clean'
          ? 2400
          : (poseType === 'bb_power_clean' ? 2900 : (poseType === 'bb_power_snatch' ? 2600 : (poseType === 'bb_squat_clean' ? 3000 : 3800)))));
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;

    if (isKB) {
      frame.props.push({ type: 'hud_badge', text: wantLeft ? 'LEFT ARM' : 'RIGHT ARM', second: wantLeft });
    }

    let kfs, st;
    const spPt = (hx, hy, spine, ua, fa, rack = 0) => ({
      hx, hy, spine, ua, fx: Math.cos(fa), fy: Math.sin(fa), ux: Math.cos(ua), uy: Math.sin(ua), rack
    });
    if (poseType === 'bb_power_snatch') {
      const snPts = [
        { hx: 64, hy: 126, ay: 166, spine: -0.36, bx: 107, by: 158, fd:  0.10 },
        { hx: 70, hy: 121, ay: 166, spine: -0.58, bx: 110, by: 141, fd:  0.10 },
        { hx: 78, hy: 114, ay: 166, spine: -0.88, bx: 111, by: 122, fd:  0.10 },
        { hx: 87, hy: 107, ay: 166, spine: -1.26, bx: 109, by: 109, fd:  0.10 },
        { hx: 98, hy:  98, ay: 162, spine: -1.66, bx: 115, by:  82, fd: -0.20 },
        { hx: 92, hy: 105, ay: 164, spine: -1.72, bx: 116, by:  48, fd: -0.30 },
        { hx: 83, hy: 120, ay: 166, spine: -1.39, bx:  98, by:  26, fd:  0.00 },
        { hx: 86, hy: 116, ay: 166, spine: -1.43, bx:  94, by:  21, fd:  0.00 },
        { hx: 94, hy: 104, ay: 166, spine: -1.55, bx:  95, by:   9, fd:  0.00 },
        { hx: 94, hy: 104, ay: 166, spine: -1.55, bx:  95, by:   9, fd:  0.00 },
        { hx: 91, hy: 107, ay: 166, spine: -1.48, bx: 112, by:  50, fd: -0.25 },
        { hx: 87, hy: 112, ay: 166, spine: -1.40, bx: 110, by: 104, fd:  0.10 },
        { hx: 80, hy: 115, ay: 166, spine: -1.04, bx: 110, by: 122, fd:  0.10 },
        { hx: 70, hy: 122, ay: 166, spine: -0.56, bx: 108, by: 142, fd:  0.10 },
        { hx: 64, hy: 126, ay: 166, spine: -0.36, bx: 107, by: 158, fd:  0.10 }
      ];
      const sp = this.sampleSpline(snPts, uNorm);
      st = { hx: sp.hx, hy: sp.hy, ay: Math.min(ankleY, sp.ay), spine: sp.spine, bx: sp.bx, by: sp.by, fd: this.clamp(sp.fd, -1, 1), rack: 0 };
    } else if (isCJ) {
      let cjPts;
      if (isBB) {
        cjPts = [
          spPt(64, 126, -0.36,  1.60,  1.56, 0),
          spPt(73, 118, -0.68,  1.62,  1.50, 0),
          spPt(86, 108, -1.16,  1.68,  1.28, 0),
          spPt(96, 100, -1.56,  1.88,  0.15, 0),
          spPt(88, 112, -1.46,  1.15, -1.85, 0.6),
          spPt(82, 121, -1.38,  0.52, -2.68, 1),
          spPt(94, 104, -1.54,  0.48, -2.68, 1),
          spPt(86, 117, -1.50,  0.50, -2.68, 1),
          spPt(95, 101, -1.55,  0.10, -1.85, 0.4),
          spPt(83, 121, -1.44, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -0.55, -2.05, 0.3),
          spPt(89, 111, -1.52,  0.48, -2.68, 1),
          spPt(94, 104, -1.54,  0.65, -2.10, 0.6),
          spPt(92, 106, -1.48,  1.42, -0.45, 0),
          spPt(88, 110, -1.36,  1.68,  0.95, 0),
          spPt(78, 117, -0.88,  1.60,  1.56, 0),
          spPt(64, 126, -0.36,  1.60,  1.56, 0)
        ];
      } else if (isDB) {
        cjPts = [
          spPt(66, 126, -0.38,  1.60,  1.56, 0),
          spPt(75, 117, -0.72,  1.62,  1.50, 0),
          spPt(87, 107, -1.20,  1.68,  1.25, 0),
          spPt(96, 100, -1.56,  1.92,  0.15, 0),
          spPt(82, 121, -1.38,  0.90, -1.42, 1),
          spPt(94, 104, -1.54,  0.88, -1.42, 1),
          spPt(86, 117, -1.50,  0.88, -1.42, 1),
          spPt(95, 101, -1.55,  0.05, -1.56, 0.4),
          spPt(88, 112, -1.48, -0.95, -1.56, 0.1),
          spPt(82, 121, -1.44, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(90, 109, -1.52, -0.35, -1.50, 0.4),
          spPt(89, 111, -1.52,  0.88, -1.42, 1),
          spPt(94, 104, -1.54,  1.05, -0.90, 0.6),
          spPt(91, 106, -1.45,  1.46,  0.45, 0),
          spPt(81, 114, -0.96,  1.58,  1.52, 0),
          spPt(66, 126, -0.38,  1.60,  1.56, 0)
        ];
      } else {
        cjPts = [
          spPt(68, 121, -0.56,  2.02,  1.98, 0),
          spPt(79, 113, -0.92,  1.72,  1.60, 0),
          spPt(96,  99, -1.55,  1.68,  0.55, 0.2),
          spPt(84, 117, -1.40,  1.24, -0.95, 0.8),
          spPt(94, 104, -1.54,  1.15, -1.45, 1),
          spPt(86, 117, -1.50,  1.15, -1.45, 1),
          spPt(95, 101, -1.55,  0.10, -1.56, 0.4),
          spPt(88, 112, -1.48, -0.95, -1.56, 0.1),
          spPt(83, 120, -1.44, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(94, 104, -1.55, -1.56, -1.56, 0),
          spPt(90, 109, -1.52, -0.25, -1.50, 0.4),
          spPt(89, 111, -1.52,  1.15, -1.45, 1),
          spPt(93, 105, -1.50,  1.28, -0.75, 0.6),
          spPt(91, 107, -1.46,  1.42,  0.05, 0.2),
          spPt(80, 114, -0.94,  1.66,  1.45, 0)
        ];
      }
      const sp = this.sampleSpline(cjPts, uNorm);
      st = { hx: sp.hx, hy: sp.hy, spine: sp.spine, ua: sp.ua, fa: Math.atan2(sp.fy, sp.fx), rack: sp.rack };
    } else if (poseType === 'bb_power_clean' || poseType === 'db_power_clean' || poseType === 'kb_clean') {
      const spPt = (hx, hy, spine, ua, fa, rack = 0) => ({
        hx, hy, spine, ua, fx: Math.cos(fa), fy: Math.sin(fa), rack
      });
      let pts;
      if (poseType === 'bb_power_clean') {
        pts = [
          spPt(64, 126, -0.36, 1.60,  1.56, 0),
          spPt(73, 118, -0.68, 1.62,  1.50, 0),
          spPt(86, 108, -1.16, 1.68,  1.28, 0),
          spPt(96, 100, -1.56, 1.88,  0.15, 0),
          spPt(88, 112, -1.46, 1.15, -1.85, 0.6),
          spPt(82, 121, -1.38, 0.52, -2.68, 1),
          spPt(91, 107, -1.52, 0.48, -2.68, 1),
          spPt(94, 104, -1.54, 0.48, -2.68, 1),
          spPt(94, 104, -1.54, 0.48, -2.68, 1),
          spPt(93, 105, -1.50, 1.38, -0.55, 0),
          spPt(89, 109, -1.38, 1.68,  0.90, 0),
          spPt(78, 117, -0.88, 1.60,  1.56, 0),
          spPt(67, 124, -0.45, 1.60,  1.56, 0),
          spPt(64, 126, -0.36, 1.60,  1.56, 0)
        ];
      } else if (poseType === 'db_power_clean') {
        pts = [
          spPt(66, 126, -0.38, 1.60,  1.56, 0),
          spPt(75, 117, -0.72, 1.62,  1.50, 0),
          spPt(87, 107, -1.20, 1.68,  1.25, 0),
          spPt(96, 100, -1.56, 1.92,  0.15, 0),
          spPt(82, 121, -1.38, 0.90, -1.42, 1),
          spPt(90, 109, -1.50, 0.88, -1.42, 1),
          spPt(94, 104, -1.54, 0.88, -1.42, 1),
          spPt(94, 104, -1.54, 0.88, -1.42, 1),
          spPt(91, 106, -1.45, 1.46,  0.45, 0),
          spPt(81, 114, -0.96, 1.58,  1.52, 0),
          spPt(68, 124, -0.45, 1.60,  1.56, 0),
          spPt(66, 126, -0.38, 1.60,  1.56, 0)
        ];
      } else {
        pts = [
          spPt(68, 121, -0.56, 2.02,  1.98, 0),
          spPt(79, 113, -0.92, 1.72,  1.60, 0),
          spPt(96,  99, -1.55, 1.68,  0.55, 0.2),
          spPt(84, 117, -1.40, 1.24, -0.95, 0.8),
          spPt(94, 104, -1.54, 1.15, -1.45, 1),
          spPt(94, 104, -1.54, 1.15, -1.45, 1),
          spPt(92, 106, -1.48, 1.38, -0.25, 0.4),
          spPt(80, 114, -0.94, 1.66,  1.45, 0)
        ];
      }
      const sp = this.sampleSpline(pts, uNorm);
      st = { hx: sp.hx, hy: sp.hy, spine: sp.spine, ua: sp.ua, fa: Math.atan2(sp.fy, sp.fx), rack: sp.rack };
    } else {
      const sqCleanPts = [
        spPt(64, 126, -0.36, 1.60,  1.56, 0),
        spPt(73, 118, -0.68, 1.62,  1.50, 0),
        spPt(86, 108, -1.16, 1.68,  1.28, 0),
        spPt(96, 100, -1.56, 1.88,  0.15, 0),
        spPt(86, 115, -1.44, 1.15, -1.85, 0.6),
        spPt(70, 139, -1.22, 0.52, -2.68, 1),
        spPt(82, 122, -1.42, 0.48, -2.68, 1),
        spPt(94, 104, -1.54, 0.48, -2.68, 1),
        spPt(94, 104, -1.54, 0.48, -2.68, 1),
        spPt(93, 105, -1.50, 1.38, -0.55, 0),
        spPt(89, 109, -1.38, 1.68,  0.90, 0),
        spPt(78, 117, -0.88, 1.60,  1.56, 0),
        spPt(64, 126, -0.36, 1.60,  1.56, 0)
      ];
      const sp = this.sampleSpline(sqCleanPts, uNorm);
      st = { hx: sp.hx, hy: sp.hy, spine: sp.spine, ua: sp.ua, fa: Math.atan2(sp.fy, sp.fx), rack: sp.rack };
    }

    frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.08);
    const { shoulderX, shoulderY } = frame.torso;

    const curAnkleY = st.ay ?? ankleY;
    const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, curAnkleY, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(st.hx, st.hy, ankleX, curAnkleY, L_THIGH, L_SHIN, -1);
    addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
    addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

    if (isDB) {
      const armBack = this.solveFK(shoulderX - 2, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
      const armFront = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
      const dbAngle = poseType === 'db_clean_and_jerk' ? st.fa - Math.PI / 2 : 0;
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
      frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey, angle: dbAngle });
      addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey, angle: dbAngle });
    } else if (isKB) {
      const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.52, 1.40, L_UPPER_ARM, L_FOREARM);
      const workArm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
      addLimb(wantLeft ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', wantLeft ? 5.4 : 5, 'hand');
      addLimb(wantLeft ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', wantLeft ? 5 : 5.4, 'hand');
      const rackT = st.rack || 0;
      frame.props.push({
        type: 'kettlebell',
        x: workArm.ex - 5 * rackT,
        y: workArm.ey + 7.2,
        r: 7.2,
        midground: wantLeft
      });
    } else {
      let arm;
      if (poseType === 'bb_power_snatch') {
        let dx = st.bx - shoulderX, dy = st.by - shoulderY;
        let dist = Math.hypot(dx, dy);
        const maxD = L_UPPER_ARM + L_FOREARM - 0.08;
        if (dist > maxD) { dx = dx / dist * maxD; dy = dy / dist * maxD; dist = maxD; }
        if (dist < 2) { dx = 2; dy = 0; dist = 2; }
        const ux = dx / dist, uy = dy / dist;
        const s1 = (dist * dist + L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM) / (2 * dist);
        const hMax = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - s1 * s1));
        const h = st.fd * hMax;
        const jx = shoulderX + s1 * ux + h * (-uy);
        const jy = shoulderY + s1 * uy + h * ux;
        const jz = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - (s1 * s1 + h * h)));
        arm = { jx, jy, jz, ex: shoulderX + dx, ey: shoulderY + dy };
      } else {
        arm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
      }
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand', 1, null, 0, arm.jz ?? 0, 0);
      const rackT = st.rack || 0;
      const alignBarToHand = poseType === 'bb_power_clean' || poseType === 'bb_squat_clean' || poseType === 'bb_clean_and_jerk' || poseType === 'bb_power_snatch';
      const barX = alignBarToHand ? arm.ex : this.lerp(arm.ex, shoulderX + 6, rackT);
      const barY = alignBarToHand ? arm.ey : this.lerp(arm.ey, shoulderY + 1, rackT);
      frame.props.push({ type: 'barbell_end', x: barX, y: barY, r: 9 });
    }
    return frame;
  }

  // ===========================================================================
  // 19. SUMO DEADLIFT HIGH PULL (FRONT VIEW - WIDE SUMO STANCE & HIGH ELBOWS)
  // ===========================================================================
  if (poseType === 'bb_sdhp' || poseType === 'kb_sdhp') {
    frame.view = 'front';
    frame.floorY = 170;
    const isBB = poseType === 'bb_sdhp';

    const hipY = this.lerp(140, 106, p);
    const shoulderY = hipY - L_TORSO;
    const leftShoulderX = 86, rightShoulderX = 114;
    const leftHipX = 90, rightHipX = 110;
    frame.frontTorso = {
      leftShoulderX, rightShoulderX, shoulderY,
      leftHipX, rightHipX, hipY,
      headX: 100, headY: shoulderY - 14
    };

    const leftAnkleX = 72, rightAnkleX = 128, ankleY = 166;
    const legL = this.solveFrontLeg(leftHipX, hipY, leftAnkleX, ankleY, true);
    const legR = this.solveFrontLeg(rightHipX, hipY, rightAnkleX, ankleY, false);
    addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.8, 'foot_front');
    addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.8, 'foot_front');

    const leftHandX = isBB ? 91 : 95;
    const rightHandX = isBB ? 109 : 105;
    const handY = this.lerp(shoulderY + 47.0, shoulderY - 2, p);
    const leftElbowX = this.lerp(isBB ? 88.5 : 91.5, isBB ? 74 : 76, p);
    const rightElbowX = this.lerp(isBB ? 111.5 : 108.5, isBB ? 126 : 124, p);
    const elbowY = this.lerp(shoulderY + 23.5, shoulderY - 14, p);

    const d1 = Math.hypot(leftElbowX - leftShoulderX, elbowY - shoulderY);
    const d2 = Math.hypot(leftHandX - leftElbowX, handY - elbowY);
    const elbowZ = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - d1 * d1));
    const handZ = elbowZ - Math.sqrt(Math.max(0, L_FOREARM * L_FOREARM - d2 * d2));

    addLimb('armL', 'arm', leftShoulderX, shoulderY, leftElbowX, elbowY, leftHandX, handY, '#38bdf8', '#38bdf8', 5.2, 'hand', 1, null, 0, elbowZ, handZ);
    addLimb('armR', 'arm', rightShoulderX, shoulderY, rightElbowX, elbowY, rightHandX, handY, '#38bdf8', '#38bdf8', 5.2, 'hand', 1, null, 0, elbowZ, handZ);

    if (isBB) {
      frame.props.push({ type: 'crossfit_barbell_front', y: handY });
    } else {
      frame.props.push({ type: 'kettlebell', x: 100, y: handY + 8, r: 7.5 });
    }
    return frame;
  }

  // ===========================================================================
  // 20. TURKISH GET-UP (3/4 FRONT-ROTATING VIEW) & KB WINDMILL
  // ===========================================================================
  if (poseType === 'kb_turkish_getup' || poseType === 'db_turkish_getup') {
    frame.view = 'front';
    frame.floorY = 170;
    const isDB = poseType === 'db_turkish_getup';
    const cycleMs = 5600;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;

    frame.props.push({ type: 'hud_badge', text: wantLeft ? 'LEFT ARM' : 'RIGHT ARM', second: wantLeft });

    const solveTguArm3D = (sx, sy, fx, fy, matFlatBlend) => {
      const ik = this.solveIK(sx, sy, fx, fy, L_UPPER_ARM, L_FOREARM, 1);
      if (matFlatBlend <= 0.001) return { ...ik, jz: 0 };
      const dx = fx - sx, dy = fy - sy;
      const dist = Math.hypot(dx, dy);
      if (dist < 2 || dist >= L_UPPER_ARM + L_FOREARM - 0.1) return { ...ik, jz: 0 };
      const d1_2d = (dist * dist + L_UPPER_ARM * L_UPPER_ARM - L_FOREARM * L_FOREARM) / (2 * dist);
      const ux = dx / dist, uy = dy / dist;
      const hMax = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - d1_2d * d1_2d));
      const dirX = -uy, dirY = ux;
      const inPlaneH = (1 - matFlatBlend) * hMax;
      let jx = sx + d1_2d * ux + dirX * inPlaneH;
      let jy = sy + d1_2d * uy + dirY * inPlaneH;
      if (jy > 165 && Math.abs(dirY) > 0.05) {
        const hSafe = (165 - (sy + d1_2d * uy)) / dirY;
        const hClamped = Math.min(inPlaneH, hSafe);
        jx = sx + d1_2d * ux + dirX * hClamped;
        jy = sy + d1_2d * uy + dirY * hClamped;
      }
      const jz = Math.sqrt(Math.max(0, L_UPPER_ARM * L_UPPER_ARM - ((jx - sx) ** 2 + (jy - sy) ** 2)));
      return { jx, jy, jz, ex: fx, ey: fy };
    };

    const solveTguLeg = (hx, hy, ax, ay, upMag) => {
      let dx = ax - hx, dy = ay - hy;
      let dist = Math.hypot(dx, dy);
      const maxD = L_THIGH + L_SHIN - 0.1;
      if (dist > maxD) { dx = dx / dist * maxD; dy = dy / dist * maxD; dist = maxD; }
      if (dist < 2) { dx = 0; dy = 2; dist = 2; }
      const mx = hx + dx * 0.5, my = hy + dy * 0.5;
      const hMax = Math.sqrt(Math.max(0, L_THIGH * L_THIGH - (dist * 0.5) * (dist * 0.5)));
      let nx = -dy / dist, ny = dx / dist;
      if (ny > 0) { nx = -nx; ny = -ny; }
      let s = upMag * (hMax - 0.02);
      let jx = mx + nx * s, jy = my + ny * s;
      if (jy > 164 && Math.abs(ny) > 0.05) {
        const sClamp = (164 - my) / ny;
        s = Math.min(hMax - 0.02, Math.max(-hMax + 0.02, sClamp));
        jx = mx + nx * s;
        jy = my + ny * s;
      }
      const jz = Math.sqrt(Math.max(0, L_THIGH * L_THIGH - ((jx - hx) ** 2 + (jy - hy) ** 2)));
      return { jx, jy, jz, ex: hx + dx, ey: hy + dy };
    };

    const tguPts = [
      { hx: 100, hy: 158, spine: -3.04, shW: 9,  hipW: 7,  fx: 72, fy: 163, fAx: 154, fAy: 164, rUp: 0.05, bAx: 156, bAy: 164, lUp: 0.05,  flat: 1.0 },
      { hx: 100, hy: 158, spine: -3.04, shW: 9,  hipW: 7,  fx: 72, fy: 163, fAx: 154, fAy: 164, rUp: 0.05, bAx: 156, bAy: 164, lUp: 0.05,  flat: 1.0 },
      { hx: 98,  hy: 157, spine: -2.76, shW: 11, hipW: 6,  fx: 65, fy: 164, fAx: 138, fAy: 148, rUp: 0.65, bAx: 154, bAy: 164, lUp: 0.12,  flat: 0.35 },
      { hx: 96,  hy: 156, spine: -2.56, shW: 12, hipW: 6,  fx: 62, fy: 164, fAx: 118, fAy: 165, rUp: 0.92, bAx: 150, bAy: 164, lUp: 0.25,  flat: 0 },
      { hx: 96,  hy: 154, spine: -2.22, shW: 12, hipW: 6,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.92, bAx: 148, bAy: 164, lUp: 0.25,  flat: 0 },
      { hx: 98,  hy: 136, spine: -2.62, shW: 12, hipW: 7,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 142, bAy: 156, lUp: 0.30,  flat: 0 },
      { hx: 98,  hy: 136, spine: -2.56, shW: 12, hipW: 7,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 105, bAy: 160, lUp: 0.40,  flat: 0 },
      { hx: 98,  hy: 136, spine: -2.55, shW: 12, hipW: 8,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 80,  bAy: 163, lUp: -0.40, flat: 0 },
      { hx: 98,  hy: 136, spine: -2.52, shW: 12, hipW: 8,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 70,  bAy: 164, lUp: -0.78, flat: 0 },
      { hx: 100, hy: 132, spine: -1.57, shW: 14, hipW: 10, fx: 72, fy: 128, fAx: 116, fAy: 165, rUp: 0.82, bAx: 70,  bAy: 164, lUp: -0.78, flat: 0 },
      { hx: 102, hy: 118, spine: -1.57, shW: 14, hipW: 10, fx: 80, fy: 114, fAx: 114, fAy: 166, rUp: 0.55, bAx: 82,  bAy: 158, lUp: -0.05, flat: 0 },
      { hx: 100, hy: 104, spine: -1.57, shW: 14, hipW: 10, fx: 82, fy: 105, fAx: 112, fAy: 166, rUp: 0.10, bAx: 88,  bAy: 166, lUp: 0.10,  flat: 0 },
      { hx: 100, hy: 104, spine: -1.57, shW: 14, hipW: 10, fx: 82, fy: 105, fAx: 112, fAy: 166, rUp: 0.10, bAx: 88,  bAy: 166, lUp: 0.10,  flat: 0 },
      { hx: 102, hy: 118, spine: -1.57, shW: 14, hipW: 10, fx: 80, fy: 114, fAx: 114, fAy: 166, rUp: 0.55, bAx: 82,  bAy: 158, lUp: -0.05, flat: 0 },
      { hx: 100, hy: 132, spine: -1.57, shW: 14, hipW: 10, fx: 72, fy: 128, fAx: 116, fAy: 165, rUp: 0.82, bAx: 70,  bAy: 164, lUp: -0.78, flat: 0 },
      { hx: 98,  hy: 136, spine: -2.52, shW: 12, hipW: 8,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 70,  bAy: 164, lUp: -0.78, flat: 0 },
      { hx: 98,  hy: 136, spine: -2.55, shW: 12, hipW: 8,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 80,  bAy: 163, lUp: -0.40, flat: 0 },
      { hx: 98,  hy: 136, spine: -2.56, shW: 12, hipW: 7,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 105, bAy: 160, lUp: 0.40,  flat: 0 },
      { hx: 98,  hy: 136, spine: -2.62, shW: 12, hipW: 7,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.85, bAx: 142, bAy: 156, lUp: 0.30,  flat: 0 },
      { hx: 96,  hy: 154, spine: -2.22, shW: 12, hipW: 6,  fx: 44, fy: 165, fAx: 118, fAy: 165, rUp: 0.92, bAx: 148, bAy: 164, lUp: 0.25,  flat: 0 },
      { hx: 96,  hy: 156, spine: -2.56, shW: 12, hipW: 6,  fx: 62, fy: 164, fAx: 118, fAy: 165, rUp: 0.92, bAx: 150, bAy: 164, lUp: 0.25,  flat: 0 },
      { hx: 98,  hy: 157, spine: -2.76, shW: 11, hipW: 6,  fx: 65, fy: 164, fAx: 138, fAy: 148, rUp: 0.65, bAx: 154, bAy: 164, lUp: 0.12,  flat: 0.35 },
      { hx: 100, hy: 158, spine: -3.04, shW: 9,  hipW: 7,  fx: 72, fy: 163, fAx: 154, fAy: 164, rUp: 0.05, bAx: 156, bAy: 164, lUp: 0.05,  flat: 1.0 },
      { hx: 100, hy: 158, spine: -3.04, shW: 9,  hipW: 7,  fx: 72, fy: 163, fAx: 154, fAy: 164, rUp: 0.05, bAx: 156, bAy: 164, lUp: 0.05,  flat: 1.0 }
    ];
    const spTgu = this.sampleSpline(tguPts, uNorm);
    const st = {
      ...spTgu,
      flat: this.clamp(spTgu.flat, 0, 1),
      rUp: this.clamp(spTgu.rUp, -0.99, 0.99),
      lUp: this.clamp(spTgu.lUp, -0.99, 0.99),
      fx: spTgu.fx,
      fy: Math.min(166, spTgu.fy),
      fAy: Math.min(166, spTgu.fAy),
      bAy: Math.min(166, spTgu.bAy)
    };
    const midSX = st.hx + Math.cos(st.spine) * L_TORSO;
    const midSY = st.hy + Math.sin(st.spine) * L_TORSO;
    const px = -Math.sin(st.spine), py = Math.cos(st.spine);
    const mirX = (x) => (wantLeft ? x : 200 - x);

    const shOX = this.lerp(st.shW * px, 9, st.flat);
    const shOY = this.lerp(st.shW * py, -2, st.flat);
    const hipOX = this.lerp(st.hipW * px, 7, st.flat);
    const hipOY = this.lerp(st.hipW * py, -1.5, st.flat);
    const lsxRaw = midSX - shOX, lsyRaw = midSY - shOY;
    const rsxRaw = midSX + shOX, rsyRaw = midSY + shOY;
    const lhxRaw = st.hx - hipOX, lhyRaw = st.hy - hipOY;
    const rhxRaw = st.hx + hipOX, rhyRaw = st.hy + hipOY;
    const headAng = this.lerp(st.spine + 0.35, -1.57, this.clamp((st.spine + 2.55) / 0.98, 0, 1));
    const headXRaw = midSX + Math.cos(headAng) * L_NECK;
    const headYRaw = midSY + Math.sin(headAng) * L_NECK;

    const freeArmRaw = solveTguArm3D(lsxRaw, lsyRaw, st.fx, st.fy, st.flat * 0.85);
    const workArmRaw = this.solveFK(rsxRaw, rsyRaw, -1.57, -1.57, L_UPPER_ARM, L_FOREARM);
    const backLegRaw = solveTguLeg(lhxRaw, lhyRaw, st.bAx, st.bAy, st.lUp);
    const frontLegRaw = solveTguLeg(rhxRaw, rhyRaw, st.fAx, st.fAy, st.rUp);

    frame.frontTorso = !wantLeft ? {
      leftShoulderX: mirX(rsxRaw), rightShoulderX: mirX(lsxRaw),
      leftShoulderY: rsyRaw, rightShoulderY: lsyRaw,
      leftHipX: mirX(rhxRaw), rightHipX: mirX(lhxRaw),
      leftHipY: rhyRaw, rightHipY: lhyRaw,
      headX: mirX(headXRaw), headY: headYRaw
    } : {
      leftShoulderX: lsxRaw, rightShoulderX: rsxRaw,
      leftShoulderY: lsyRaw, rightShoulderY: rsyRaw,
      leftHipX: lhxRaw, rightHipX: rhxRaw,
      leftHipY: lhyRaw, rightHipY: rhyRaw,
      headX: headXRaw, headY: headYRaw
    };

    const freeNameLeg = wantLeft ? 'legL' : 'legR';
    const workNameLeg = wantLeft ? 'legR' : 'legL';
    const freeNameArm = wantLeft ? 'armL' : 'armR';
    const workNameArm = wantLeft ? 'armR' : 'armL';

    const workLegZ = st.rUp < 0.35 ? -1 : 1;
    addLimb(workNameArm, 'arm', mirX(rsxRaw), rsyRaw, mirX(workArmRaw.jx), workArmRaw.jy, mirX(workArmRaw.ex), workArmRaw.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
    addLimb(workNameLeg, 'leg', mirX(rhxRaw), rhyRaw, mirX(frontLegRaw.jx), frontLegRaw.jy, mirX(frontLegRaw.ex), frontLegRaw.ey, '#bef264', '#94a3b8', 5.8, 'foot_front', 1, null, 0, frontLegRaw.jz, 0, workLegZ);
    addLimb(freeNameLeg, 'leg', mirX(lhxRaw), lhyRaw, mirX(backLegRaw.jx), backLegRaw.jy, mirX(backLegRaw.ex), backLegRaw.ey, '#bef264', '#94a3b8', 5.6, 'foot_front', 1, null, 0, backLegRaw.jz, 0, 0);
    addLimb(freeNameArm, 'arm', mirX(lsxRaw), lsyRaw, mirX(freeArmRaw.jx), freeArmRaw.jy, mirX(freeArmRaw.ex), freeArmRaw.ey, '#38bdf8', '#38bdf8', 5.1, 'hand', 1, null, 0, freeArmRaw.jz, 0);

    const loadX = mirX(workArmRaw.ex);
    frame.props.push(isDB
      ? { type: 'dumbbell_near', x: loadX, y: workArmRaw.ey }
      : { type: 'kettlebell', x: loadX + (wantLeft ? -5 : 5), y: workArmRaw.ey + 7.2, r: 7.2 });
    return frame;
  }

  // ===========================================================================
  // 21. LOADED CARRIES: FARMER'S, SUITCASE & OVERHEAD WALKING CARRIES
  // ===========================================================================
  if (poseType === 'db_farmers_carry' || poseType === 'kb_suitcase_carry' || poseType === 'kb_overhead_carry') {
    frame.floorY = 170;
    const walkPeriod = 1150;
    const wNorm = ((timestamp % walkPeriod) + walkPeriod) % walkPeriod / walkPeriod;
    const wPhase = wNorm * Math.PI * 2;
    frame.props.push({ type: 'march_track', timestamp: (timestamp / walkPeriod) * (80 / 0.22) });

    const hipX = 94;
    const hipY = 104.5 + Math.cos(wPhase * 2) * 1.4;
    frame.torso = this.torsoFromHip(hipX, hipY, -1.53, 1, 0.04);
    const { shoulderX, shoulderY } = frame.torso;

    const walkLegKFs = [
      { thigh: 1.25, shin: 1.32 },
      { thigh: 1.48, shin: 1.54 },
      { thigh: 1.68, shin: 1.72 },
      { thigh: 1.92, shin: 2.04 },
      { thigh: 1.54, shin: 2.26 },
      { thigh: 1.22, shin: 1.64 }
    ];
    const lkF = this.sampleSpline(walkLegKFs, wNorm);
    const lkB = this.sampleSpline(walkLegKFs, wNorm + 0.5);
    const legB = this.solveFK(hipX - 2, hipY, lkB.thigh, lkB.shin, L_THIGH, L_SHIN);
    const legF = this.solveFK(hipX, hipY, lkF.thigh, lkF.shin, L_THIGH, L_SHIN);

    if (poseType === 'kb_overhead_carry') {
      frame.props.push({ type: 'hud_badge', text: wantLeft ? 'LEFT ARM' : 'RIGHT ARM', second: wantLeft });
      const ohArm = this.solveFK(shoulderX, shoulderY, -1.56, -1.56, L_UPPER_ARM, L_FOREARM);
      const freeSwing = Math.sin(wPhase) * 0.14;
      const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.56 - freeSwing, 1.46 - freeSwing, L_UPPER_ARM, L_FOREARM);
      addLimb(wantLeft ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
      addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb(wantLeft ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, ohArm.jx, ohArm.jy, ohArm.ex, ohArm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'kettlebell', x: ohArm.ex - 3.2, y: ohArm.ey + 7.2, r: 7.5, midground: wantLeft });
    } else if (poseType === 'kb_suitcase_carry') {
      frame.props.push({ type: 'hud_badge', text: wantLeft ? 'LEFT HAND' : 'RIGHT HAND', second: wantLeft });
      const holdArm = this.solveFK(shoulderX, shoulderY, 1.56, 1.56, L_UPPER_ARM, L_FOREARM);
      const freeSwing = Math.sin(wPhase) * 0.16;
      const freeArm = this.solveFK(shoulderX - 2, shoulderY, 1.56 - freeSwing, 1.46 - freeSwing, L_UPPER_ARM, L_FOREARM);
      addLimb(wantLeft ? 'armF' : 'armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
      addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb(wantLeft ? 'armB' : 'armF', 'arm', shoulderX, shoulderY, holdArm.jx, holdArm.jy, holdArm.ex, holdArm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'kettlebell', x: holdArm.ex, y: holdArm.ey + 7.5, r: 7.5, midground: wantLeft });
    } else {
      const sway = Math.sin(wPhase) * 0.04;
      const armB = this.solveFK(shoulderX - 2, shoulderY, 1.56 - sway, 1.56 - sway, L_UPPER_ARM, L_FOREARM);
      const armF = this.solveFK(shoulderX, shoulderY, 1.56 + sway, 1.56 + sway, L_UPPER_ARM, L_FOREARM);
      addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 5, 'hand');
      frame.props.push({ type: 'dumbbell_far', x: armB.ex, y: armB.ey });
      addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'dumbbell_near', x: armF.ex, y: armF.ey });
    }
    return frame;
  }

  // ===========================================================================
  // 22. MEDICINE BALL CLEANS & BALL SLAMS (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'med_ball_clean' || poseType === 'med_ball_slam') {
    frame.floorY = 170;
    const ankleX = 92, ankleY = 166;
    if (poseType === 'med_ball_clean') {
      const cycleMs = 2600;
      const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
      const spPt = (hx, hy, ay, spine, ua, fa) => ({
        hx, hy, ay, spine, ua, fx: Math.cos(fa), fy: Math.sin(fa)
      });
      const pts = [
        // Deadlift setup -> first pull -> explosive hip snap + lean back -> ball arcs high cleanly to chest peak while hips sit into deep squat -> stand tall + pause -> lower
        spPt(61, 130, 166, -0.44, 1.70,  1.66),
        spPt(74, 118, 166, -0.78, 1.72,  1.60),
        spPt(86, 108, 166, -1.18, 1.74,  1.52),
        spPt(97,  98, 161, -1.68, 2.05,  0.95),
        spPt(84, 118, 164, -1.52, 2.02, -0.82),
        spPt(71, 136, 166, -1.36, 1.74, -0.68),
        spPt(64, 146, 166, -1.24, 1.56, -0.66),
        spPt(78, 124, 166, -1.40, 1.66, -0.78),
        spPt(94, 104, 166, -1.55, 1.68, -0.92),
        spPt(94, 104, 166, -1.55, 1.68, -0.92),
        spPt(94, 104, 166, -1.55, 1.68, -0.92),
        spPt(89, 108, 166, -1.42, 1.64,  0.42),
        spPt(78, 117, 166, -0.96, 1.68,  1.38),
        spPt(66, 125, 166, -0.56, 1.70,  1.60),
        spPt(61, 130, 166, -0.44, 1.70,  1.66)
      ];
      const sp = this.sampleSpline(pts, uNorm);
      const fa = Math.atan2(sp.fy, sp.fx);
      const curAnkleY = Math.min(ankleY, sp.ay);
      frame.torso = this.torsoFromHip(sp.hx, sp.hy, sp.spine, 1, 0.08);
      const { shoulderX, shoulderY } = frame.torso;
      const legBack = this.solveIK(sp.hx - 3, sp.hy, ankleX - 3, curAnkleY, L_THIGH, L_SHIN, -1);
      const legFront = this.solveIK(sp.hx, sp.hy, ankleX, curAnkleY, L_THIGH, L_SHIN, -1);
      const arm = this.solveFK(shoulderX, shoulderY, sp.ua, fa, L_UPPER_ARM, L_FOREARM);
      addLimb('legB', 'leg', sp.hx - 3, sp.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
      addLimb('legF', 'leg', sp.hx, sp.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
      addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
      frame.props.push({ type: 'med_ball', x: arm.ex + Math.cos(fa) * 3, y: arm.ey + Math.sin(fa) * 3, r: 8, angle: fa });
      return frame;
    }

    // Med Ball Slam: fast bent-arm lift overhead -> explosive violent slam down with slightly bent anatomical elbows -> floor bounce & catch
    const slamPts = [
      { hx: 63, hy: 132, ay: 166, spine: -0.48, ua:  1.62, fa:  1.54 }, // 0: Floor pickup
      { hx: 75, hy: 120, ay: 166, spine: -0.92, ua:  1.58, fa:  0.32 }, // 1: Bend arms past abdomen
      { hx: 88, hy: 108, ay: 165, spine: -1.36, ua:  0.65, fa: -0.98 }, // 2: Elbows bent past chest/chin
      { hx: 95, hy: 100, ay: 162, spine: -1.56, ua: -0.75, fa: -1.45 }, // 3: Press overhead
      { hx: 96, hy:  98, ay: 160, spine: -1.66, ua: -1.68, fa: -1.60 }, // 4: Full tall lat load overhead
      { hx: 86, hy: 112, ay: 165, spine: -1.16, ua:  0.42, fa: -0.28 }, // 5: Violent downward whip with bent elbows (fa < ua)
      { hx: 72, hy: 124, ay: 166, spine: -0.78, ua:  1.42, fa:  0.76 }, // 6: Bent-arm slam release & follow-through
      { hx: 66, hy: 130, ay: 166, spine: -0.58, ua:  1.56, fa:  1.28 }, // 7: Track bounce
      { hx: 63, hy: 132, ay: 166, spine: -0.48, ua:  1.62, fa:  1.54 }, // 8: Catch at floor
      { hx: 63, hy: 132, ay: 166, spine: -0.48, ua:  1.62, fa:  1.54 }  // 9: Hold floor
    ];
    // Fast lift up (0 -> 0.34) + explosive downward whip (0.34 -> 0.44) + bounce/catch/pause (0.44 -> 1.00)
    const evalSlamArm = (tVal) => {
      let sp = tVal;
      if (tVal <= 0.34) sp = (tVal / 0.34) * 0.40;
      else if (tVal <= 0.44) sp = 0.40 + ((tVal - 0.34) / 0.10) * 0.20;
      else sp = 0.60 + ((tVal - 0.44) / 0.56) * 0.40;
      const s = this.sampleSpline(slamPts, sp);
      const t = this.torsoFromHip(s.hx, s.hy, s.spine, 1, 0.08);
      const a = this.solveFK(t.shoulderX, t.shoulderY, s.ua, s.fa, L_UPPER_ARM, L_FOREARM);
      return { st: s, torso: t, arm: a };
    };
    const cur = evalSlamArm(normT);
    const { st, arm } = cur;
    frame.torso = cur.torso;
    const curAnkleY = Math.min(ankleY, st.ay);
    const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, curAnkleY, L_THIGH, L_SHIN, -1);
    const legFront = this.solveIK(st.hx, st.hy, ankleX, curAnkleY, L_THIGH, L_SHIN, -1);
    addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
    addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
    addLimb('arm', 'arm', cur.torso.shoulderX, cur.torso.shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');

    const tRel = 0.43, tImp = 0.49, tCat = 0.72;
    let ballX = arm.ex + Math.cos(st.fa) * 3;
    let ballY = arm.ey + Math.sin(st.fa) * 3;
    let ballAngle = st.fa;
    if (normT > tRel && normT < tCat) {
      const rel = evalSlamArm(tRel);
      const cat = evalSlamArm(tCat);
      const relX = rel.arm.ex + Math.cos(rel.st.fa) * 3;
      const relY = rel.arm.ey + Math.sin(rel.st.fa) * 3;
      const catX = cat.arm.ex + Math.cos(cat.st.fa) * 3;
      const catY = cat.arm.ey + Math.sin(cat.st.fa) * 3;
      const impX = this.lerp(relX, catX, 0.75);
      const impY = 162;
      if (normT <= tImp) {
        const u = (normT - tRel) / (tImp - tRel);
        ballX = this.lerp(relX, impX, u);
        ballY = this.lerp(relY, impY, 0.7 * u + 0.3 * u * u);
      } else {
        const u = (normT - tImp) / (tCat - tImp);
        ballX = this.lerp(impX, catX, u);
        ballY = this.lerp(impY, catY, u) - 15 * 4 * u * (1 - u);
      }
      ballAngle = this.lerp(rel.st.fa, cat.st.fa, (normT - tRel) / (tCat - tRel));
    }
    frame.props.push({ type: 'med_ball', x: ballX, y: ballY, r: 8, angle: ballAngle });
    return frame;
  }

  // ===========================================================================
  // 23. BOX JUMP-OVERS, BAR-FACING BURPEES & WALL WALKS (SIDE VIEW)
  // ===========================================================================
  if (poseType === 'box_jump_over') {
    frame.floorY = 170;
    frame.props.push({ type: 'plyo_box', x: 80, y: 130, w: 40, h: 40 });
    const cycleMs = 4200;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
    const isRep2 = uNorm >= 0.50;
    const u = isRep2 ? (uNorm - 0.50) / 0.50 : uNorm / 0.50;

    let hx, hy, spine, ax, ay, ua, fa;
    if (u < 0.12) {
      const s = this.smoothstep(u / 0.12);
      hx = this.lerp(54, 46, s); hy = this.lerp(103, 124, s);
      spine = this.lerp(-1.55, -1.08, s);
      ax = 54; ay = 166;
      ua = this.lerp(1.48, 1.92, s); fa = this.lerp(1.30, 1.65, s);
    } else if (u < 0.24) {
      const w = (u - 0.12) / 0.12;
      const e = w * w * (2 - w);
      hx = this.lerp(46, 66, e); hy = this.lerp(124, 94, e);
      spine = this.lerp(-1.08, -1.34, e);
      ax = this.lerp(54, 58, e); ay = this.lerp(166, 158, e);
      ua = this.lerp(1.92, 0.05, e); fa = this.lerp(1.65, -0.35, e);
    } else if (u < 0.42) {
      // Pure Newtonian parabolic flight onto box top (zero pauses)
      const f = (u - 0.24) / 0.18;
      hx = this.lerp(66, 94, f);
      hy = this.lerp(94, 96, f) - 4 * 24 * f * (1 - f);
      spine = this.lerp(-1.34, -1.20, f);
      ax = this.lerp(58, 100, f);
      ay = this.lerp(158, 126, f) - 4 * 32 * f * (1 - f);
      ua = this.lerp(0.05, 0.85, f); fa = this.lerp(-0.35, 0.15, f);
    } else if (u < 0.56) {
      // Planted feet on box (ax=100, ay=126) absorbing impact then pushing off
      const c = (u - 0.42) / 0.14;
      if (c < 0.5) {
        const s = this.smoothstep(c / 0.5);
        hx = this.lerp(94, 96, s); hy = this.lerp(96, 102, s);
        spine = this.lerp(-1.20, -1.24, s);
        ax = 100; ay = 126;
        ua = this.lerp(0.85, 1.25, s); fa = this.lerp(0.15, 0.75, s);
      } else {
        const s = (c - 0.5) / 0.5;
        const e = s * s;
        hx = this.lerp(96, 102, e); hy = this.lerp(102, 86, e);
        spine = this.lerp(-1.24, -1.32, e);
        ax = this.lerp(100, 102, e); ay = this.lerp(126, 123, e);
        ua = this.lerp(1.25, 0.82, e); fa = this.lerp(0.75, 0.22, e);
      }
    } else if (u < 0.78) {
      // Pure Newtonian parabolic drop off box onto far floor (zero pauses)
      const f = (u - 0.56) / 0.22;
      hx = this.lerp(102, 140, f);
      hy = this.lerp(86, 118, f) - 4 * 16 * f * (1 - f);
      spine = this.lerp(-1.32, -1.22, f);
      ax = this.lerp(102, 146, f);
      ay = this.lerp(123, 166, f) - 4 * 26 * f * (1 - f);
      ua = this.lerp(0.82, 0.90, f); fa = this.lerp(0.22, 0.40, f);
    } else if (u < 0.94) {
      const d = (u - 0.78) / 0.16;
      if (d < 0.35) {
        const s = this.smoothstep(d / 0.35);
        hx = this.lerp(140, 142, s); hy = this.lerp(118, 125, s);
        spine = this.lerp(-1.22, -1.28, s);
        ax = 146; ay = 166;
        ua = this.lerp(0.90, 1.05, s); fa = this.lerp(0.40, 0.60, s);
      } else {
        const s = this.smoothstep((d - 0.35) / 0.65);
        hx = this.lerp(142, 146, s); hy = this.lerp(125, 103, s);
        spine = this.lerp(-1.28, -1.55, s);
        ax = 146; ay = 166;
        ua = this.lerp(1.05, 1.48, s); fa = this.lerp(0.60, 1.30, s);
      }
    } else {
      hx = 146; hy = 103; spine = -1.55; ax = 146; ay = 166; ua = 1.48; fa = 1.30;
    }

    const fd = isRep2 ? -1 : 1;
    if (isRep2) {
      hx = 200 - hx;
      ax = 200 - ax;
      spine = -Math.PI - spine;
      ua = Math.PI - ua;
      fa = Math.PI - fa;
    }
    frame.torso = this.torsoFromHip(hx, hy, spine, fd, 0.08 * fd);
    const { shoulderX, shoulderY } = frame.torso;

    const surf = (ax >= 78 && ax <= 122) ? 130 : 170;
    const kneeBend = fd > 0 ? -1 : 1;
    const legBack = this.solveIK(hx - 2 * fd, hy, ax - 2 * fd, ay, L_THIGH, L_SHIN, kneeBend);
    const legFront = this.solveIK(hx, hy, ax, ay, L_THIGH, L_SHIN, kneeBend);
    const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);

    addLimb('legB', 'leg', hx - 2 * fd, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', fd, surf);
    addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', fd, surf);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    return frame;
  }

  if (poseType === 'bar_facing_burpee') {
    frame.floorY = 170;
    frame.scale = 0.68;
    frame.originX = 100;
    frame.originY = 170;
    frame.props.push({ type: 'floor_barbell', x: 100, y: 160, r: 10 });
    const cycleMs = 4700;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
    const isRep2 = uNorm >= 0.50;
    const u = isRep2 ? (uNorm - 0.50) / 0.50 : uNorm / 0.50;

    let hx, hy, spine, ax, ay, wx, wy, neck = 0;
    if (u < 0.105) {
      // Phase 1: Squat-Hinge & Plant Hands Flat on Floor behind barbell
      const s = this.smoothstep(u / 0.105);
      hx = this.lerp(56, 42, s); hy = this.lerp(103, 136, s);
      spine = this.lerp(-1.55, -0.38, s);
      ax = 56; ay = 166;
      wx = this.lerp(64, 60, s); wy = this.lerp(146, 165, s);
    } else if (u < 0.255) {
      // Phase 2: Sprawl Feet Back into High Plank
      const s = this.smoothstep((u - 0.105) / 0.15);
      hx = this.lerp(42, 18, s); hy = this.lerp(136, 138, s) - 2 * Math.sin(s * Math.PI);
      spine = this.lerp(-0.38, -0.42, s);
      ax = this.lerp(56, -42, s); ay = this.lerp(166, 165, s) - 5 * Math.sin(s * Math.PI);
      wx = 60; wy = 165;
    } else if (u < 0.345) {
      // Phase 3: Lower Chest, Hips & Thighs to Deck Hover (leaving a tiny bit of space to floor; head clears plate [90..110])
      const s = this.smoothstep((u - 0.255) / 0.09);
      hx = 18; hy = this.lerp(138, 159, s);
      spine = this.lerp(-0.42, -0.04, s);
      ax = this.lerp(-42, -46, s); ay = 165;
      wx = 60; wy = 165;
      neck = this.lerp(0, -0.18, s);
    } else if (u < 0.405) {
      // Phase 4: Brief Short Pause Near Floor at Bottom of Burpee
      hx = 18; hy = 159;
      spine = -0.04;
      ax = -46; ay = 165;
      wx = 60; wy = 165;
      neck = -0.18;
    } else if (u < 0.50) {
      // Phase 5: Lever / Seal-Peel Chest Up While Keeping Hips & Legs Low
      const s = this.smoothstep((u - 0.405) / 0.095);
      hx = 18; hy = this.lerp(159, 158, s);
      spine = this.lerp(-0.04, -0.78, s);
      ax = -46; ay = 165;
      wx = 60; wy = 165;
      neck = this.lerp(-0.18, 0, s);
    } else if (u < 0.655) {
      // Phase 6: Lever Hips High Off Deck First, Then Snap Feet Under Into Loaded Squat
      const t = (u - 0.50) / 0.155;
      const s = this.smoothstep(t);
      const footT = this.smoothstep(Math.pow(t, 1.25));
      hx = this.lerp(18, 52, s);
      hy = this.lerp(158, 132, s) - 24 * Math.sin(Math.PI * Math.pow(t, 0.65));
      spine = this.lerp(-0.78, -0.84, s) + 0.38 * Math.sin(Math.PI * Math.pow(t, 0.75));
      ax = this.lerp(-46, 62, footT);
      ay = this.lerp(165, 166, t) - 9 * Math.sin(t * Math.PI);
      wx = this.lerp(60, 70, s);
      wy = t < 0.25 ? 165 : this.lerp(165, 140, this.smoothstep((t - 0.25) / 0.75));
    } else if (u < 0.72) {
      // Phase 7: Explosive Triple-Extension Push-Off on Floor
      const w = (u - 0.655) / 0.065;
      const e = w * w;
      hx = this.lerp(52, 68, e); hy = this.lerp(132, 98, e);
      spine = this.lerp(-0.84, -1.24, e);
      ax = this.lerp(62, 66, e); ay = this.lerp(166, 158, e);
      const sx = hx + Math.cos(spine) * L_TORSO;
      const sy = hy + Math.sin(spine) * L_TORSO;
      wx = this.lerp(70, sx + 16, e); wy = this.lerp(140, sy + 14, e);
    } else if (u < 0.885) {
      // Phase 8: Smooth Newtonian Parabolic Two-Foot Jump Over Barbell
      const f = (u - 0.72) / 0.165;
      hx = this.lerp(68, 140, f);
      hy = this.lerp(98, 114, f) - 4 * 28 * f * (1 - f);
      spine = this.lerp(-1.24, -1.20, f);
      ax = this.lerp(66, 144, f);
      ay = this.lerp(158, 166, f) - 4 * 44 * f * (1 - f);
      const sx = hx + Math.cos(spine) * L_TORSO;
      const sy = hy + Math.sin(spine) * L_TORSO;
      wx = sx + 16;
      wy = sy + 14 - 16 * Math.sin(Math.PI * f);
    } else if (u < 0.965) {
      // Phase 9: Soft Landing Absorption -> Rebound to Stand
      const d = (u - 0.885) / 0.08;
      if (d < 0.35) {
        const s = this.smoothstep(d / 0.35);
        hx = this.lerp(140, 142, s); hy = this.lerp(114, 122, s);
        spine = this.lerp(-1.20, -1.28, s);
        ax = 144; ay = 166;
        const sx = hx + Math.cos(spine) * L_TORSO;
        const sy = hy + Math.sin(spine) * L_TORSO;
        wx = sx + 16; wy = sy + this.lerp(14, 34, s);
      } else {
        const s = this.smoothstep((d - 0.35) / 0.65);
        hx = this.lerp(142, 144, s); hy = this.lerp(122, 103, s);
        spine = this.lerp(-1.28, -1.55, s);
        ax = 144; ay = 166;
        const sx0 = 142 + Math.cos(-1.28) * L_TORSO;
        const sy0 = 122 + Math.sin(-1.28) * L_TORSO;
        wx = this.lerp(sx0 + 16, 150, s); wy = this.lerp(sy0 + 34, 146, s);
      }
    } else {
      hx = 144; hy = 103; spine = -1.55; ax = 144; ay = 166; wx = 150; wy = 146;
    }

    const fd = isRep2 ? -1 : 1;
    if (isRep2) {
      hx = 200 - hx;
      ax = 200 - ax;
      wx = 200 - wx;
      spine = -Math.PI - spine;
    }
    frame.torso = this.torsoFromHip(hx, hy, spine, fd, neck * fd);
    const { shoulderX, shoulderY } = frame.torso;

    const kneeBend = fd > 0 ? -1 : 1;
    const elbowBend = fd > 0 ? 1 : -1;
    const legBack = this.solveIK(hx - 2 * fd, hy, ax - 2 * fd, ay, L_THIGH, L_SHIN, kneeBend);
    const legFront = this.solveIK(hx, hy, ax, ay, L_THIGH, L_SHIN, kneeBend);
    const arm = this.solveIK(shoulderX, shoulderY, wx, wy, L_UPPER_ARM, L_FOREARM, elbowBend);

    addLimb('legB', 'leg', hx - 2 * fd, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', fd);
    addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', fd);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
    return frame;
  }

  if (poseType === 'wall_walk') {
    frame.floorY = 170;
    frame.props.push({ type: 'wall', x: 168, y1: 12, y2: 170 });
    const cycleMs = 5200;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;

    // Alternating discrete steps so planted hand/foot never skate on floor or wall
    const evalSteps = (pNorm, numSteps) => {
      const s = this.clamp(pNorm, 0, 1) * numSteps;
      const k = Math.min(numSteps - 1, Math.floor(s));
      const u = s - k;
      const evenCount = Math.ceil(numSteps / 2);
      const oddCount = Math.floor(numSteps / 2);
      const stepIdxA = Math.floor(k / 2);
      const stepIdxB = Math.floor((k - 1) / 2);
      let progA, progB, swingA = 0, swingB = 0;
      if (k % 2 === 0) {
        progA = (stepIdxA + this.smoothstep(u)) / evenCount;
        progB = Math.max(0, Math.floor((k + 1) / 2)) / oddCount;
        swingA = Math.sin(Math.PI * u);
      } else {
        progA = (stepIdxA + 1) / evenCount;
        progB = (stepIdxB + this.smoothstep(u)) / oddCount;
        swingB = Math.sin(Math.PI * u);
      }
      return { progA, progB, swingA, swingB };
    };

    let shoulderX, shoulderY, spine, handFX, handFY, handBX, handBY, footFX, footFY, footBX, footBY;
    if (uNorm < 0.08) {
      // Phase 1: Start in solid straight-arm plank with toes cleanly above floor at wall base
      const alpha = 0.34, bodyLen = 106.5;
      shoulderY = 121.0;
      shoulderX = 157 - Math.cos(alpha) * bodyLen;
      spine = alpha + Math.PI;
      footFX = footBX = 157;
      footFY = footBY = shoulderY + Math.sin(alpha) * bodyLen;
      handFX = handBX = shoulderX; handFY = handBY = 166;
    } else if (uNorm < 0.45) {
      // Phase 2: Real 10-step alternating climb up the wall (chest facing right wall)
      const c = (uNorm - 0.08) / 0.37;
      const stp = evalSteps(c, 10);
      const alphaA = this.lerp(0.34, -1.43, stp.progA);
      const alphaB = this.lerp(0.34, -1.43, stp.progB);
      const avgAlpha = (alphaA + alphaB) * 0.5;
      const bodyLen = 106.5;
      shoulderY = 121.0;
      shoulderX = 157 - Math.cos(avgAlpha) * bodyLen;
      spine = avgAlpha + Math.PI;

      handFX = 157 - Math.cos(alphaA) * bodyLen;
      handBX = 157 - Math.cos(alphaB) * bodyLen;
      handFY = 166 - stp.swingA * 5;
      handBY = 166 - stp.swingB * 5;

      footFX = 157 - stp.swingB * 4;
      footBX = 157 - stp.swingA * 4;
      footFY = shoulderY + Math.sin(alphaB) * bodyLen;
      footBY = shoulderY + Math.sin(alphaA) * bodyLen;
    } else if (uNorm < 0.55) {
      // Phase 3: Chest-to-wall handstand hold
      const alpha = -1.43, bodyLen = 106.5;
      shoulderY = 121.0;
      shoulderX = 157 - Math.cos(alpha) * bodyLen;
      spine = alpha + Math.PI;
      handFX = handBX = shoulderX;
      handFY = handBY = 166;
      footFX = footBX = 157;
      footFY = shoulderY + Math.sin(alpha) * bodyLen;
      footBY = footFY - 2;
    } else if (uNorm < 0.92) {
      // Phase 4: Real 10-step alternating descent back down the wall to plank
      const c = 1 - (uNorm - 0.55) / 0.37;
      const stp = evalSteps(c, 10);
      const alphaA = this.lerp(0.34, -1.43, stp.progA);
      const alphaB = this.lerp(0.34, -1.43, stp.progB);
      const avgAlpha = (alphaA + alphaB) * 0.5;
      const bodyLen = 106.5;
      shoulderY = 121.0;
      shoulderX = 157 - Math.cos(avgAlpha) * bodyLen;
      spine = avgAlpha + Math.PI;

      handFX = 157 - Math.cos(alphaA) * bodyLen;
      handBX = 157 - Math.cos(alphaB) * bodyLen;
      handFY = 166 - stp.swingA * 5;
      handBY = 166 - stp.swingB * 5;

      footFX = 157 - stp.swingB * 4;
      footBX = 157 - stp.swingA * 4;
      footFY = shoulderY + Math.sin(alphaB) * bodyLen;
      footBY = shoulderY + Math.sin(alphaA) * bodyLen;
    } else {
      // Phase 5: Finish cleanly in straight-arm plank at wall base
      const alpha = 0.34, bodyLen = 106.5;
      shoulderY = 121.0;
      shoulderX = 157 - Math.cos(alpha) * bodyLen;
      spine = alpha + Math.PI;
      footFX = footBX = 157;
      footFY = footBY = shoulderY + Math.sin(alpha) * bodyLen;
      handFX = handBX = shoulderX; handFY = handBY = 166;
    }

    frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spine, -1, 0.04);
    const { hipX, hipY } = frame.torso;

    const legBack = this.solveIK(hipX - 2, hipY, footBX, footBY, L_THIGH, L_SHIN, 1);
    const legFront = this.solveIK(hipX, hipY, footFX, footFY, L_THIGH, L_SHIN, 1);
    const armBack = this.solveIK(shoulderX - 2, shoulderY, handBX, handBY, L_UPPER_ARM, L_FOREARM, -1);
    const armFront = this.solveIK(shoulderX, shoulderY, handFX, handFY, L_UPPER_ARM, L_FOREARM, -1);

    addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 4.8, 'hand');
    addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', -1, 200);
    addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', -1, 200);
    addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
    return frame;
  }

  // ===========================================================================
  // 24. COSSACK SQUATS, HIGH KNEES, BROAD JUMPS & BEAR CRAWLS
  // ===========================================================================
  if (poseType === 'cossack_squat') {
    frame.view = 'front';
    frame.floorY = 170;
    const cycleMs = 3800;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
    const shift = Math.sin(uNorm * Math.PI * 2); // -1 (left) .. 0 .. +1 (right)
    const absShift = Math.abs(shift);

    frame.props.push({ type: 'hud_badge', text: shift < 0 ? 'LEFT SHIFT' : 'RIGHT SHIFT', second: shift < 0 });
    const midHX = 100 + shift * 29;
    const midHY = 112 + absShift * 38;
    const leanX = -shift * 4;
    const midSX = midHX + leanX;
    const midSY = midHY - Math.sqrt(L_TORSO * L_TORSO - leanX * leanX);
    frame.frontTorso = {
      leftShoulderX: midSX - 13, rightShoulderX: midSX + 13, shoulderY: midSY,
      leftHipX: midHX - 9, rightHipX: midHX + 9, hipY: midHY,
      headX: midSX + leanX * 0.25, headY: midSY - 14
    };

    const solveCossackLeg = (hx, hy, ax, ay, isLeft, squatAmt, z1) => {
      const dx = ax - hx, dy = ay - hy;
      const dist2d = Math.hypot(dx, dy);
      const maxD2 = Math.sqrt(Math.max(1, 64 * 64 - z1 * z1)) - 0.15;
      let cdx = dx, cdy = dy, cdist = dist2d;
      if (cdist > maxD2) { cdx = dx / dist2d * maxD2; cdy = dy / dist2d * maxD2; cdist = maxD2; }
      const mx = hx + cdx * 0.5, my = hy + cdy * 0.5;
      if (squatAmt <= 0.0001) {
        const jz = z1 * 0.5;
        const dz1 = jz - z1;
        const segMaxXY = Math.sqrt(Math.max(1, L_THIGH * L_THIGH - dz1 * dz1));
        const hMax = Math.sqrt(Math.max(0, segMaxXY * segMaxXY - (cdist * 0.5) ** 2));
        const ux = cdx / cdist, uy = cdy / cdist;
        const sign = isLeft ? 1 : -1;
        return { jx: mx + sign * (-uy) * hMax, jy: my + sign * ux * hMax, jz, ex: hx + cdx, ey: hy + cdy, z1 };
      }
      const stand = this.solveFrontLeg(hx, hy, ax, ay, isLeft);
      const outX = isLeft ? -6 : 6;
      const w = this.smoothstep(squatAmt);
      let jx = this.lerp(stand.jx, ax + outX, w);
      let jy = this.lerp(stand.jy, 138, w);
      for (let pass = 0; pass < 3; pass++) {
        const d1 = Math.hypot(jx - hx, jy - hy);
        if (d1 > 31.6) { jx = hx + (jx - hx) / d1 * 31.6; jy = hy + (jy - hy) / d1 * 31.6; }
        const d2 = Math.hypot(jx - ax, jy - ay);
        if (d2 > 31.6) { jx = ax + (jx - ax) / d2 * 31.6; jy = ay + (jy - ay) / d2 * 31.6; }
      }
      const d1sq = (jx - hx) ** 2 + (jy - hy) ** 2;
      const d2sq = (ax - jx) ** 2 + (ay - jy) ** 2;
      const jz = Math.sqrt(Math.max(0, L_SHIN * L_SHIN - d2sq));
      const reqZ1 = jz - Math.sqrt(Math.max(0, L_THIGH * L_THIGH - d1sq));
      return { jx, jy, jz, ex: hx + cdx, ey: hy + cdy, z1: reqZ1 };
    };

    const rightSquat = Math.max(0, shift);
    const leftSquat = Math.max(0, -shift);
    let legL, legR;
    if (rightSquat >= leftSquat) {
      legR = solveCossackLeg(midHX + 9, midHY, 136, 166, false, rightSquat, 0);
      legL = solveCossackLeg(midHX - 9, midHY, 64, 166, true, 0, legR.z1);
    } else {
      legL = solveCossackLeg(midHX - 9, midHY, 64, 166, true, leftSquat, 0);
      legR = solveCossackLeg(midHX + 9, midHY, 136, 166, false, 0, legL.z1);
    }
    addLimb('legL', 'leg', midHX - 9, midHY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 6, 'foot_front', 1, null, legL.z1, legL.jz, 0);
    addLimb('legR', 'leg', midHX + 9, midHY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 6, 'foot_front', 1, null, legR.z1, legR.jz, 0);

    const handY = midSY + 24 - absShift * 14;
    const armL = this.solveFrontArm(midSX - 13, midSY, midSX - 8 + absShift * 3, handY, true);
    const armR = this.solveFrontArm(midSX + 13, midSY, midSX + 8 - absShift * 3, handY, false);
    addLimb('armL', 'arm', midSX - 13, midSY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    addLimb('armR', 'arm', midSX + 13, midSY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    return frame;
  }

  if (poseType === 'high_knees') {
    frame.floorY = 170;
    const hkPeriod = 840;
    const hkNorm = ((timestamp % hkPeriod) + hkPeriod) % hkPeriod / hkPeriod;
    const hipX = 95;
    // Brief airborne bounce (duty factor 40%) with foot planted stationary at x=95 (zero ground sliding!)
    const hipY = 102.5 + 3.0 * Math.cos((hkNorm * 4 - 0.8) * Math.PI);
    frame.torso = this.torsoFromHip(hipX, hipY, -1.52, 1, -0.04);
    const { shoulderX, shoulderY } = frame.torso;

    const evalHKFoot = (uRaw, baseX) => {
      const u = ((uRaw % 1) + 1) % 1;
      if (u < 0.40) return { ax: baseX, ay: 166 };
      const t = (u - 0.40) / 0.60;
      const lift = Math.sin(Math.PI * t);
      return {
        // Place ankle forward under the raised knee so IK drives the thigh & knee UP above hip level (~y=90)
        // rather than kicking the heel backward like a butt-kick, while still planting cleanly back at baseX
        ax: baseX + 16 * lift,
        ay: 166 - 46 * lift
      };
    };
    const fF = evalHKFoot(hkNorm, 95);
    const fB = evalHKFoot(hkNorm + 0.5, 93);

    const legF = this.solveIK(hipX, hipY, fF.ax, fF.ay, L_THIGH, L_SHIN, -1);
    const legB = this.solveIK(hipX - 2, hipY, fB.ax, fB.ay, L_THIGH, L_SHIN, -1);

    // Opposite running arms synced with knee peak (peak at u=0.70, contact at u=0.20)
    const armPhase = ((hkNorm - 0.70) % 1 + 1) % 1;
    const swing = 0.5 - 0.5 * Math.cos(armPhase * Math.PI * 2);
    const armF = this.solveFK(shoulderX, shoulderY, this.lerp(2.14, 0.92, swing), this.lerp(0.58, -0.48, swing), L_UPPER_ARM, L_FOREARM);
    const armB = this.solveFK(shoulderX - 2, shoulderY, this.lerp(0.92, 2.14, swing), this.lerp(-0.48, 0.58, swing), L_UPPER_ARM, L_FOREARM);

    addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 4.8, 'hand');
    addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.5, 'foot', 1);
    addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
    addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    return frame;
  }

  if (poseType === 'broad_jump') {
    frame.floorY = 170;
    frame.props.push({ type: 'jump_lines' });
    const cycleMs = 3600;
    const uNorm = ((timestamp % cycleMs) + cycleMs) % cycleMs / cycleMs;
    const isRep2 = uNorm >= 0.50;
    const u = isRep2 ? (uNorm - 0.50) / 0.50 : uNorm / 0.50;

    let hx, hy, spine, ax, ay, ua, fa;
    if (u < 0.14) {
      const s = this.smoothstep(u / 0.14);
      hx = this.lerp(50, 42, s); hy = this.lerp(104, 126, s);
      spine = this.lerp(-1.52, -0.96, s);
      ax = 50; ay = 166;
      ua = this.lerp(1.48, 2.02, s); fa = this.lerp(1.32, 1.78, s);
    } else if (u < 0.28) {
      const w = (u - 0.14) / 0.14;
      const e = w * w * (2 - w);
      hx = this.lerp(42, 68, e); hy = this.lerp(126, 96, e);
      spine = this.lerp(-0.96, -1.14, e);
      ax = this.lerp(50, 54, e); ay = this.lerp(166, 158, e);
      ua = this.lerp(2.02, 0.02, e); fa = this.lerp(1.78, -0.35, e);
    } else if (u < 0.62) {
      // Pure Newtonian parabolic broad jump (zero pauses in the air)
      const f = (u - 0.28) / 0.34;
      hx = this.lerp(68, 140, f);
      hy = this.lerp(96, 114, f) - 4 * 28 * f * (1 - f);
      spine = this.lerp(-1.14, -1.08, f);
      ax = this.lerp(54, 150, f);
      ay = this.lerp(158, 166, f) - 4 * 36 * f * (1 - f);
      ua = this.lerp(0.02, 0.72, f); fa = this.lerp(-0.35, 0.22, f);
    } else if (u < 0.94) {
      const d = (u - 0.62) / 0.32;
      if (d < 0.30) {
        const s = this.smoothstep(d / 0.30);
        hx = this.lerp(140, 142, s); hy = this.lerp(114, 124, s);
        spine = this.lerp(-1.08, -1.12, s);
        ax = 150; ay = 166;
        ua = this.lerp(0.72, 0.85, s); fa = this.lerp(0.22, 0.35, s);
      } else {
        const s = this.smoothstep((d - 0.30) / 0.70);
        hx = this.lerp(142, 150, s); hy = this.lerp(124, 104, s);
        spine = this.lerp(-1.12, -1.52, s);
        ax = 150; ay = 166;
        ua = this.lerp(0.85, 1.48, s); fa = this.lerp(0.35, 1.32, s);
      }
    } else {
      hx = 150; hy = 104; spine = -1.52; ax = 150; ay = 166; ua = 1.48; fa = 1.32;
    }

    const fd = isRep2 ? -1 : 1;
    if (isRep2) {
      hx = 200 - hx;
      ax = 200 - ax;
      spine = -Math.PI - spine;
      ua = Math.PI - ua;
      fa = Math.PI - fa;
    }
    frame.torso = this.torsoFromHip(hx, hy, spine, fd, 0.06 * fd);
    const { shoulderX, shoulderY } = frame.torso;
    const kneeBend = fd > 0 ? -1 : 1;
    const legBack = this.solveIK(hx - 2 * fd, hy, ax - 2 * fd, ay, L_THIGH, L_SHIN, kneeBend);
    const legFront = this.solveIK(hx, hy, ax, ay, L_THIGH, L_SHIN, kneeBend);
    const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
    addLimb('legB', 'leg', hx - 2 * fd, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', fd);
    addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', fd);
    addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
    return frame;
  }

  if (poseType === 'bear_crawl') {
    frame.floorY = 170;
    const crawlPeriod = 1000;
    const cNorm = ((timestamp % crawlPeriod) + crawlPeriod) % crawlPeriod / crawlPeriod;
    // Match ground track speed (40px per 1000ms) cleanly to stance foot/hand travel (20px per half-cycle)
    frame.props.push({ type: 'march_track', timestamp: timestamp * (0.04 / 0.22) });

    const hipX = 76;
    const hipY = 123 - Math.cos(cNorm * Math.PI * 4) * 1.2;
    frame.torso = this.torsoFromHip(hipX, hipY, -0.02, 1, -0.28);
    const { shoulderX, shoulderY } = frame.torso;

    // Feet behind hips so thighs drop steeply downward and knees hover cleanly ~2-3 inches above deck
    const legCrawlKFs = [
      { ax: 58, ay: 165 },
      { ax: 48, ay: 165 },
      { ax: 38, ay: 165 },
      { ax: 48, ay: 155 }
    ];
    const armCrawlKFs = [
      { wx: 136, wy: 166 },
      { wx: 126, wy: 166 },
      { wx: 116, wy: 166 },
      { wx: 126, wy: 156 }
    ];
    // Contralateral crawl: front leg syncs with back arm
    const fLegP = this.sampleSpline(legCrawlKFs, cNorm);
    const bLegP = this.sampleSpline(legCrawlKFs, cNorm + 0.5);
    const fArmP = this.sampleSpline(armCrawlKFs, cNorm + 0.5);
    const bArmP = this.sampleSpline(armCrawlKFs, cNorm);

    const legB = this.solveIK(hipX - 2, hipY, bLegP.ax, bLegP.ay, L_THIGH, L_SHIN, -1);
    const legF = this.solveIK(hipX, hipY, fLegP.ax, fLegP.ay, L_THIGH, L_SHIN, -1);
    const armB = this.solveIK(shoulderX - 2, shoulderY, bArmP.wx, bArmP.wy, L_UPPER_ARM, L_FOREARM, 1);
    const armF = this.solveIK(shoulderX, shoulderY, fArmP.wx, fArmP.wy, L_UPPER_ARM, L_FOREARM, 1);

    addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 5, 'hand');
    addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.4, 'foot', 1);
    addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
    addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
    return frame;
  }

  // Default / 'run': ATHLETIC RUNNING (SIDE VIEW) - POWERFUL CYCLOID STRIDE & HIGH FLIGHT
  frame.floorY = 170;
  const runPeriod = 800;
  const runNorm = ((timestamp % runPeriod) + runPeriod) % runPeriod / runPeriod;
  const phase = runNorm * Math.PI * 2;

  const bounce = Math.cos(phase * 2) * 3.5;
  const hipX = 92;
  const hipY = 104.5 - bounce;
  const spineAngle = -1.36; // 12-degree athletic running forward lean
  frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.18);
  const { shoulderX, shoulderY } = frame.torso;

  frame.props.push({ type: 'run_track', timestamp });

  const runLegKFs = [
    { thigh: 0.58, shin: 2.10 }, // 0.00: High Knee Drive (exact reference match)
    { thigh: 1.05, shin: 1.48 }, // 0.17: Swing down toward strike
    { thigh: 1.32, shin: 1.85 }, // 0.33: Mid-stance cushion
    { thigh: 2.12, shin: 2.32 }, // 0.50: Push-off extension behind
    { thigh: 1.62, shin: 2.95 }, // 0.67: Heel recovery under glute
    { thigh: 1.00, shin: 2.50 }  // 0.83: Knee drive forward
  ];

  const runArmKFs = [
    { upper: 2.22, forearm: 0.70 },  // 0.00: Back arm pumping back/down
    { upper: 1.85, forearm: 0.40 },  // 0.17: Arm swinging forward
    { upper: 1.35, forearm: -0.10 }, // 0.33: Passing torso
    { upper: 0.82, forearm: -0.48 }, // 0.50: Front arm high punch at chest (exact reference match)
    { upper: 1.25, forearm: -0.15 }, // 0.67: Rebounding downward
    { upper: 1.80, forearm: 0.35 }   // 0.83: Swinging backward
  ];

  const lkF = this.sampleSpline(runLegKFs, runNorm);
  const lkB = this.sampleSpline(runLegKFs, runNorm + 0.5);

  const akF = this.sampleSpline(runArmKFs, runNorm);
  const akB = this.sampleSpline(runArmKFs, runNorm + 0.5);

  const legF = this.solveFK(hipX, hipY, lkF.thigh, lkF.shin, L_THIGH, L_SHIN);
  const legB = this.solveFK(hipX - 2, hipY, lkB.thigh, lkB.shin, L_THIGH, L_SHIN);

  const armF = this.solveFK(shoulderX, shoulderY, akF.upper, akF.forearm, L_UPPER_ARM, L_FOREARM);
  const armB = this.solveFK(shoulderX - 2, shoulderY, akB.upper, akB.forearm, L_UPPER_ARM, L_FOREARM);

  addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 4.8, 'hand');
  addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.5, 'foot', 1);
  addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
  addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
  return frame;
};

// -------------------------------------------------------------------------
// BIOMECHANICAL INVARIANT VALIDATOR
// Samples every pose across its full (up to 2-rep) cycle and asserts:
//  1. Rigid bone lengths (torso, neck, thigh, shin, upper arm, forearm)
//  2. No body part penetrates the floor (or the plyo box)
//  3. Frame-to-frame continuity (no IK branch flips / joint teleports)

function computePose(poseType, timestamp, options = null) {
  const context = (this && typeof this.lerp === 'function') ? this : KinematicMath;
  return _computePose.call(context, poseType, timestamp, options);
}
globalThis.computePose = computePose;
export { computePose };
