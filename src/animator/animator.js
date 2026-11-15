/**
 * WODROLL Biomechanical Stick Animator
 * Coordinates 2D IK computation, rendering, active canvas tracking & requestAnimationFrame loop
 */
const SIDE_SWITCHABLE_POSES = new Set([
  'kb_push_jerk',
  'kb_strict_press',
  'kb_push_press',
  'kb_thruster',
  'bulgarian_split_squat',
  'kb_bulgarian_split_squat',
  'db_bulgarian_split_squat',
  'bb_bulgarian_split_squat',
  'side_plank',
  'rfe_rdl',
  'kb_rfe_rdl',
  'db_rfe_rdl',
  'bb_rfe_rdl',
  'kb_bent_row',
  'kb_hang_power_clean'
]);

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
  solveLegToePivot(hx, hy, tx, ty, L1, L2, b, d) { return globalThis.KinematicMath.solveLegToePivot(hx, hy, tx, ty, L1, L2, b, d); },
  solveFK(rx, ry, a1, a2, L1, L2) { return globalThis.KinematicMath.solveFK(rx, ry, a1, a2, L1, L2); },
  solveFrontArm(sx, sy, hx, hy, l) { return globalThis.KinematicMath.solveFrontArm(sx, sy, hx, hy, l); },
  solveFrontLeg(hx, hy, ax, ay, l, k) { return globalThis.KinematicMath.solveFrontLeg(hx, hy, ax, ay, l, k); },
  torsoFromHip(hx, hy, s, f, n) { return globalThis.KinematicMath.torsoFromHip(hx, hy, s, f, n); },
  torsoFromShoulder(sx, sy, s, f, n) { return globalThis.KinematicMath.torsoFromShoulder(sx, sy, s, f, n); },

  // Pose Computation & Validation
  SIDE_SWITCHABLE_POSES,
  computePose(poseType, timestamp, options = null) { return globalThis.computePose.call(this, poseType, timestamp, options); },
  validatePose(poseType, numSteps, cycleMs) { return globalThis.validatePose.call(this, poseType, numSteps, cycleMs); },
  validateAllPoses(poseTypes) { return globalThis.validateAllPoses.call(this, poseTypes); },

  // Canvas 2D Rendering
  renderFrame(ctx, frame) { return globalThis.renderFrame(ctx, frame); },

  // Canvas Registry & Animation Loop
  activeCanvases: new Map(),
  rafId: null,

  isSideSwitchable(poseType) {
    return SIDE_SWITCHABLE_POSES.has(poseType);
  },

  registerCanvas(canvas, poseType) {
    if (!canvas) return;
    const prev = this.activeCanvases.get(canvas);
    if (!prev || prev.poseType !== poseType) {
      this.activeCanvases.set(canvas, {
        poseType,
        side: 'right',
        pendingSide: null,
        fadeStart: null,
        fadeDuration: 240
      });
    }
    this.syncSideToggle(canvas, poseType);
    if (!this.rafId) this.startLoop();
  },

  setCanvasSide(canvas, targetSide) {
    const meta = this.activeCanvases.get(canvas);
    if (!meta || !this.isSideSwitchable(meta.poseType)) return;
    const side = targetSide === 'left' ? 'left' : 'right';
    const currentEffective = meta.pendingSide || meta.side;
    if (side === currentEffective) return;
    meta.pendingSide = side;
    meta.fadeStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.syncSideToggle(canvas, meta.poseType);
  },

  syncSideToggle(canvas, poseType) {
    if (typeof document === 'undefined' || !canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;
    const existing = parent.querySelector(':scope > .pose-side-toggle');
    const declaredWidth = parseInt(canvas.getAttribute('width'), 10) || canvas.clientWidth || 0;

    if (!this.isSideSwitchable(poseType) || declaredWidth < 120) {
      if (existing) existing.remove();
      return;
    }

    parent.classList.add('relative');
    let toggle = existing;
    if (!toggle) {
      toggle = document.createElement('div');
      toggle.className = 'pose-side-toggle absolute top-1.5 right-1.5 z-10 inline-flex items-center rounded-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 p-0.5 shadow-sm';
      const mkBtn = (side, label, title) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.poseSideBtn = side;
        btn.title = title;
        btn.textContent = label;
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.setCanvasSide(canvas, side);
        });
        return btn;
      };
      // Left button always sits on the left; Right button always sits on the right
      toggle.appendChild(mkBtn('left', declaredWidth >= 240 ? 'Left' : 'L', 'Show left side'));
      toggle.appendChild(mkBtn('right', declaredWidth >= 240 ? 'Right' : 'R', 'Show right side'));
      parent.appendChild(toggle);
    }

    const meta = this.activeCanvases.get(canvas);
    const activeSide = meta ? (meta.pendingSide || meta.side) : 'right';
    const baseCls = declaredWidth >= 240
      ? 'px-2 py-0.5 text-[10px] font-mono rounded transition cursor-pointer leading-tight'
      : 'px-1.5 py-0.5 text-[9px] font-mono rounded transition cursor-pointer leading-tight';

    toggle.querySelectorAll('button[data-pose-side-btn]').forEach(btn => {
      const isSelected = btn.dataset.poseSideBtn === activeSide;
      btn.className = isSelected
        ? `${baseCls} font-bold bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950`
        : `${baseCls} font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white`;
    });
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

        let alpha = 1;
        if (meta.fadeStart !== null) {
          const elapsed = Math.max(0, timestamp - meta.fadeStart);
          const half = meta.fadeDuration * 0.5;
          if (elapsed < half) {
            alpha = 1 - this.smoothstep(elapsed / half);
          } else if (elapsed < meta.fadeDuration) {
            if (meta.pendingSide) {
              meta.side = meta.pendingSide;
              meta.pendingSide = null;
            }
            alpha = this.smoothstep((elapsed - half) / half);
          } else {
            if (meta.pendingSide) {
              meta.side = meta.pendingSide;
              meta.pendingSide = null;
            }
            meta.fadeStart = null;
            alpha = 1;
          }
        }

        this.drawPoseOnCanvas(canvas, meta.poseType, timestamp, { side: meta.side, alpha });
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  },

  drawPoseOnCanvas(canvas, poseType, timestamp, options = null) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 3) : 1;
    const cssW = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10) || 200;
    const cssH = canvas.clientHeight || parseInt(canvas.getAttribute('height'), 10) || 200;
    const targetW = Math.max(Math.round(200 * dpr), Math.round(cssW * dpr));
    const targetH = Math.max(Math.round(200 * dpr), Math.round(cssH * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    const scale = Math.min(w / 200, h / 200);
    ctx.translate((w - 200 * scale) / 2, (h - 200 * scale) / 2);
    ctx.scale(scale, scale);
    const frame = this.computePose(poseType, timestamp, options);
    if (options && options.alpha != null && options.alpha < 1) {
      frame.alpha = options.alpha;
    }
    this.renderFrame(ctx, frame);
    ctx.restore();
  }
};

globalThis.BiomechanicalStickAnimator = BiomechanicalStickAnimator;
