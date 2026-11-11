/**
 * WODFORGE Biomechanical Stick Animator
 * Coordinates 2D IK computation, rendering, active canvas tracking & requestAnimationFrame loop
 */
const BiomechanicalStickAnimator = {
  // Segment Invariants
  get L_TORSO() { return globalThis.L_TORSO || 46; },
  get L_THIGH() { return globalThis.L_THIGH || 32; },
  get L_SHIN() { return globalThis.L_SHIN || 32; },
  get L_UPPER_ARM() { return globalThis.L_UPPER_ARM || 25; },
  get L_FOREARM() { return globalThis.L_FOREARM || 24; },
  get L_NECK() { return globalThis.L_NECK || 15; },

  // Math Solvers
  lerp(a, b, t) { return globalThis.KinematicMath.lerp(a, b, t); },
  clamp(v, min, max) { return globalThis.KinematicMath.clamp(v, min, max); },
  smoothstep(t) { return globalThis.KinematicMath.smoothstep(t); },
  sampleSpline(p, t) { return globalThis.KinematicMath.sampleSpline(p, t); },
  sampleTimedKeyframes(k, t) { return globalThis.KinematicMath.sampleTimedKeyframes(k, t); },
  sampleKeyframes(k, t) { return globalThis.KinematicMath.sampleKeyframes(k, t); },
  solveIK(rx, ry, tx, ty, L1, L2, b) { return globalThis.KinematicMath.solveIK(rx, ry, tx, ty, L1, L2, b); },
  solveFK(rx, ry, a1, a2, L1, L2) { return globalThis.KinematicMath.solveFK(rx, ry, a1, a2, L1, L2); },
  solveFrontArm(sx, sy, hx, hy, l) { return globalThis.KinematicMath.solveFrontArm(sx, sy, hx, hy, l); },
  solveFrontLeg(hx, hy, ax, ay, l, k) { return globalThis.KinematicMath.solveFrontLeg(hx, hy, ax, ay, l, k); },
  torsoFromHip(hx, hy, s, f, n) { return globalThis.KinematicMath.torsoFromHip(hx, hy, s, f, n); },
  torsoFromShoulder(sx, sy, s, f, n) { return globalThis.KinematicMath.torsoFromShoulder(sx, sy, s, f, n); },

  // Pose Computation & Validation
  computePose(poseType, timestamp) { return globalThis.computePose.call(this, poseType, timestamp); },
  validatePose(poseType, numSteps, cycleMs) { return globalThis.validatePose.call(this, poseType, numSteps, cycleMs); },
  validateAllPoses(poseTypes) { return globalThis.validateAllPoses.call(this, poseTypes); },

  // Canvas 2D Rendering
  renderFrame(ctx, frame) { return globalThis.renderFrame(ctx, frame); },

  // Canvas Registry & Animation Loop
  activeCanvases: new Map(),
  rafId: null,

  registerCanvas(canvas, poseType) {
    if (!canvas) return;
    this.activeCanvases.set(canvas, { poseType });
    if (!this.rafId) this.startLoop();
  },

  pruneDetachedCanvases() {
    if (typeof document === 'undefined') return;
    for (const [canvas] of this.activeCanvases.entries()) {
      if (!document.body.contains(canvas)) this.activeCanvases.delete(canvas);
    }
  },

  startLoop() {
    if (typeof requestAnimationFrame === 'undefined') return;
    const tick = (timestamp) => {
      this.pruneDetachedCanvases();
      const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;
      for (const [canvas, meta] of this.activeCanvases.entries()) {
        if (canvas.offsetParent === null) continue;
        const rect = canvas.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) continue;
        this.drawPoseOnCanvas(canvas, meta.poseType, timestamp);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  },

  drawPoseOnCanvas(canvas, poseType, timestamp) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    const scale = Math.min(w / 200, h / 200);
    ctx.translate((w - 200 * scale) / 2, (h - 200 * scale) / 2);
    ctx.scale(scale, scale);
    this.renderFrame(ctx, this.computePose(poseType, timestamp));
    ctx.restore();
  }
};

globalThis.BiomechanicalStickAnimator = BiomechanicalStickAnimator;
