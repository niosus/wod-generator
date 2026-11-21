/**
 * WODROLL Biomechanical Stick Animator
 * Coordinates 2D IK computation, rendering, active canvas tracking & requestAnimationFrame loop
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
import { computePose } from './poses.js';
import { validatePose, validateAllPoses } from './validator.js';
import { renderFrame } from './renderer.js';

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
  'kb_hang_power_clean',
  'kb_overhead_carry',
  'db_overhead_carry',
  'kb_suitcase_carry',
  'db_suitcase_carry'
]);

const STATIC_POSE_TYPES = new Set([
  'bar_hang',
  'active_bar_hang',
  'knee_plank',
  'side_plank'
]);

const BiomechanicalStickAnimator = {
  // Segment Invariants
  L_TORSO,
  L_THIGH,
  L_SHIN,
  L_UPPER_ARM,
  L_FOREARM,
  L_NECK,

  // Math Solvers
  lerp(a, b, t) { return KinematicMath.lerp(a, b, t); },
  clamp(v, min, max) { return KinematicMath.clamp(v, min, max); },
  smoothstep(t) { return KinematicMath.smoothstep(t); },
  sampleSpline(p, t) { return KinematicMath.sampleSpline(p, t); },
  sampleTimedKeyframes(k, t) { return KinematicMath.sampleTimedKeyframes(k, t); },
  sampleKeyframes(k, t) { return KinematicMath.sampleKeyframes(k, t); },
  solveIK(rx, ry, tx, ty, L1, L2, b) { return KinematicMath.solveIK(rx, ry, tx, ty, L1, L2, b); },
  solveLegToePivot(hx, hy, tx, ty, L1, L2, b, d) { return KinematicMath.solveLegToePivot(hx, hy, tx, ty, L1, L2, b, d); },
  solveFK(rx, ry, a1, a2, L1, L2) { return KinematicMath.solveFK(rx, ry, a1, a2, L1, L2); },
  solveFrontArm(sx, sy, hx, hy, l) { return KinematicMath.solveFrontArm(sx, sy, hx, hy, l); },
  solveFrontLeg(hx, hy, ax, ay, l, k) { return KinematicMath.solveFrontLeg(hx, hy, ax, ay, l, k); },
  torsoFromHip(hx, hy, s, f, n) { return KinematicMath.torsoFromHip(hx, hy, s, f, n); },
  torsoFromShoulder(sx, sy, s, f, n) { return KinematicMath.torsoFromShoulder(sx, sy, s, f, n); },

  // Pose Computation & Validation
  SIDE_SWITCHABLE_POSES,
  computePose(poseType, timestamp, options = null) { return computePose.call(this, poseType, timestamp, options); },
  validatePose(poseType, numSteps, cycleMs) { return validatePose.call(this, poseType, numSteps, cycleMs); },
  validateAllPoses(poseTypes) { return validateAllPoses.call(this, poseTypes); },

  // Canvas 2D Rendering
  renderFrame(ctx, frame, isLightOverride = null) { return renderFrame(ctx, frame, isLightOverride); },

  // Canvas Registry & Low-Power Animation Loop
  TARGET_FPS: 30,
  FRAME_INTERVAL_MS: 31,
  KEY_POSE_MS: 1200,
  DEFAULT_PREVIEW_MS: 4800,
  TIMER_SLEEP_MS: 26,
  PREVIEW_SLEEP_MS: 46,
  // true: visible canvases loop continuously (pause when offscreen/hidden tab/modal-covered).
  // false: ~2-rep preview then rest on a key pose (lowest power).
  ANIMATE_ALWAYS: true,
  MIN_CANVAS_PX: 144,
  activeCanvases: new Map(),
  visibleCanvases: new Set(),
  _observer: null,
  _activeRoots: [],
  _loopTimerId: null,
  _prevTickTs: 0,
  _isWindowBlurred: false,
  _hoveredCanvas: null,
  _boundTick: null,
  _lifecycleBound: false,
  rafId: null,

  isSideSwitchable(poseType) {
    return SIDE_SWITCHABLE_POSES.has(poseType);
  },

  _prefersReducedMotion() {
    return Boolean(
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  },

  _ensureLifecycleListeners() {
    if (this._lifecycleBound || typeof document === 'undefined' || typeof window === 'undefined') return;
    this._lifecycleBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setHoveredCanvas(null);
        this.stopLoop();
      } else {
        this._syncLoopState(true);
      }
    });
    window.addEventListener('blur', () => {
      this._isWindowBlurred = true;
      this.setHoveredCanvas(null);
      this.stopLoop();
    });
    window.addEventListener('focus', () => {
      this._isWindowBlurred = false;
      this._syncLoopState(true);
    });
    window.addEventListener('pagehide', () => this.stopLoop());
    window.addEventListener('pageshow', () => this._syncLoopState(true));
    window.addEventListener('resize', () => {
      for (const meta of this.activeCanvases.values()) {
        meta.cssW = 0;
        meta.cssH = 0;
        meta.hasDrawn = false;
      }
      this.refreshVisibility();
    }, { passive: true });
  },

  _getObserver() {
    if (this._observer || typeof IntersectionObserver === 'undefined') return this._observer;
    this._observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const canvas = entry.target;
        const meta = this.activeCanvases.get(canvas);
        if (!meta) continue;
        meta.isIntersecting = Boolean(entry.isIntersecting);
        if (entry.isIntersecting) {
          this.visibleCanvases.add(canvas);
        } else {
          this.visibleCanvases.delete(canvas);
        }
      }
      this._syncLoopState();
    }, { rootMargin: '80px 0px', threshold: 0 });
    return this._observer;
  },

  _getTopActiveRoot() {
    return this._activeRoots.length > 0 ? this._activeRoots[this._activeRoots.length - 1] : null;
  },

  _isCanvasInActiveRoot(canvas, topRoot) {
    return !topRoot || (typeof topRoot.contains === 'function' && topRoot.contains(canvas));
  },

  _isCanvasPaused(canvas) {
    return Boolean(canvas && typeof canvas.closest === 'function' && canvas.closest('.wod-outdated, .wod-row-dimmed'));
  },

  _isCanvasAnimating(meta) {
    if (meta.fadeStart !== null) return true;
    if (STATIC_POSE_TYPES.has(meta.poseType)) return false;
    if (meta.isHovered) return true;
    if (meta.isPaused) return false;
    if (meta.mode === 'continuous') return true;
    if (meta.previewRemainingMs > 0) return true;
    return false;
  },

  _hasEligibleWork() {
    if (typeof document !== 'undefined' && document.hidden) return false;
    const topRoot = this._getTopActiveRoot();
    for (const canvas of this.visibleCanvases) {
      const meta = this.activeCanvases.get(canvas);
      if (!meta) continue;
      if (!this._isCanvasInActiveRoot(canvas, topRoot)) continue;
      if (!meta.hasDrawn || this._isCanvasAnimating(meta)) {
        return true;
      }
    }
    return false;
  },

  _syncLoopState(immediate = false) {
    if (!this._hasEligibleWork()) {
      this.stopLoop();
      return;
    }
    if (immediate && this._loopTimerId !== null) {
      clearTimeout(this._loopTimerId);
      this._loopTimerId = null;
    }
    if (this.rafId === null && this._loopTimerId === null) {
      this.startLoop();
    }
  },

  stopLoop() {
    if (this._loopTimerId !== null) {
      clearTimeout(this._loopTimerId);
      this._loopTimerId = null;
    }
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this._prevTickTs = 0;
  },

  registerCanvas(canvas, poseType, options = null) {
    if (!canvas) return;
    this._ensureLifecycleListeners();
    let mode = (options && options.mode) ? options.mode : 'preview';
    if (this.ANIMATE_ALWAYS && !this._prefersReducedMotion()) mode = 'continuous';
    const previewMs = options && options.previewMs != null ? options.previewMs : null;
    const effectivePreviewMs = mode === 'preview'
      ? (previewMs != null ? previewMs : (this._prefersReducedMotion() ? 0 : this.DEFAULT_PREVIEW_MS))
      : 0;
    const isPaused = this._isCanvasPaused(canvas);
    const prev = this.activeCanvases.get(canvas);
    if (!prev || prev.poseType !== poseType) {
      this.activeCanvases.set(canvas, {
        poseType,
        side: 'right',
        pendingSide: null,
        fadeStart: null,
        fadeDuration: 240,
        ctx: typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null,
        cssW: 0,
        cssH: 0,
        hasDrawn: false,
        isPaused,
        isIntersecting: false,
        mode,
        isHovered: this._hoveredCanvas === canvas,
        animPhaseMs: this.KEY_POSE_MS,
        previewRemainingMs: effectivePreviewMs
      });
    } else {
      prev.mode = mode;
      prev.isPaused = isPaused;
      prev.previewRemainingMs = effectivePreviewMs;
      prev.hasDrawn = false;
      prev.cssW = 0;
      prev.cssH = 0;
    }
    this.syncSideToggle(canvas, poseType);
    const obs = this._getObserver();
    if (obs) {
      obs.observe(canvas);
    } else {
      const meta = this.activeCanvases.get(canvas);
      if (meta) meta.isIntersecting = true;
      this.visibleCanvases.add(canvas);
    }
    this.refreshVisibility();
  },

  playPreview(target, durationMs = null) {
    if (!target) return;
    const dur = durationMs != null ? durationMs : (this._prefersReducedMotion() ? 0 : this.DEFAULT_PREVIEW_MS);
    const canvases = (target.tagName === 'CANVAS' || target.nodeName === 'CANVAS')
      ? [target]
      : (typeof target.querySelectorAll === 'function' ? Array.from(target.querySelectorAll('canvas')) : []);

    for (const canvas of canvases) {
      const meta = this.activeCanvases.get(canvas);
      if (!meta) continue;
      if (dur <= 0) {
        meta.previewRemainingMs = 0;
      } else {
        const cycle = 2400;
        const targetEnd = Math.ceil((meta.animPhaseMs + dur - this.KEY_POSE_MS) / cycle) * cycle + this.KEY_POSE_MS;
        meta.previewRemainingMs = Math.max(dur * 0.5, targetEnd - meta.animPhaseMs);
      }
    }
    this._syncLoopState(true);
  },

  setHoveredCanvas(canvas) {
    const next = canvas && this.activeCanvases.has(canvas) ? canvas : null;
    if (this._hoveredCanvas === next) return;
    if (this._hoveredCanvas) {
      const prevMeta = this.activeCanvases.get(this._hoveredCanvas);
      if (prevMeta) prevMeta.isHovered = false;
    }
    this._hoveredCanvas = next;
    if (next) {
      const nextMeta = this.activeCanvases.get(next);
      if (nextMeta) nextMeta.isHovered = true;
    }
    this._syncLoopState(true);
  },

  unregisterCanvas(canvas) {
    if (!canvas) return;
    if (this._hoveredCanvas === canvas) {
      this._hoveredCanvas = null;
    }
    if (this._observer) {
      this._observer.unobserve(canvas);
    }
    this.activeCanvases.delete(canvas);
    this.visibleCanvases.delete(canvas);
    this._syncLoopState();
  },

  unregisterCanvasesIn(container) {
    if (!container) return;
    if (container.tagName === 'CANVAS' || container.nodeName === 'CANVAS') {
      this.unregisterCanvas(container);
    }
    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('canvas').forEach(c => this.unregisterCanvas(c));
    }
  },

  pushActiveRoot(el) {
    if (!el) return;
    this._activeRoots = this._activeRoots.filter(r => r !== el);
    this._activeRoots.push(el);
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.refreshVisibility());
    }
    this._syncLoopState(true);
  },

  removeActiveRoot(el) {
    if (!el) return;
    this._activeRoots = this._activeRoots.filter(r => r !== el);
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.refreshVisibility());
    }
    this._syncLoopState(true);
  },

  notifyStateChange({ redraw = false } = {}) {
    this.pruneDetachedCanvases();
    for (const [canvas, meta] of this.activeCanvases.entries()) {
      meta.isPaused = this._isCanvasPaused(canvas);
      if (redraw) {
        meta.hasDrawn = false;
      }
    }
    this._syncLoopState(true);
  },

  refreshVisibility() {
    if (typeof document === 'undefined' || !document.body) {
      this._syncLoopState(true);
      return;
    }
    this.pruneDetachedCanvases();
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const topRoot = this._getTopActiveRoot();
    for (const [canvas, meta] of this.activeCanvases.entries()) {
      if (!this._isCanvasInActiveRoot(canvas, topRoot)) continue;
      if (typeof canvas.getBoundingClientRect !== 'function') {
        meta.isIntersecting = true;
        this.visibleCanvases.add(canvas);
        continue;
      }
      const rect = canvas.getBoundingClientRect();
      const isVis = rect.width > 0 && rect.height > 0 &&
        rect.bottom >= -80 && rect.top <= vh + 80 &&
        rect.right >= -80 && rect.left <= vw + 80;
      meta.isIntersecting = isVis;
      if (isVis) {
        this.visibleCanvases.add(canvas);
      } else {
        this.visibleCanvases.delete(canvas);
      }
    }
    this._syncLoopState(true);
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
    if (meta.mode === 'static') {
      this.playPreview(canvas, 2400);
    } else {
      this._syncLoopState(true);
    }
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
      toggle.className = 'pose-side-toggle absolute top-1.5 right-1.5 z-10 inline-flex items-center rounded-md bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 p-0.5 shadow-sm';
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
    if (typeof document === 'undefined' || !document.body) return;
    for (const [canvas] of this.activeCanvases.entries()) {
      if (!document.body.contains(canvas)) {
        if (this._hoveredCanvas === canvas) {
          this._hoveredCanvas = null;
        }
        if (this._observer) {
          this._observer.unobserve(canvas);
        }
        this.activeCanvases.delete(canvas);
        this.visibleCanvases.delete(canvas);
      }
    }
  },

  _scheduleNextFrame(drawDurationMs = 0, baseSleepMs = this.TIMER_SLEEP_MS) {
    if (this._loopTimerId !== null || this.rafId !== null || typeof requestAnimationFrame === 'undefined') return;
    const sleepMs = Math.max(4, Math.round(baseSleepMs - drawDurationMs));
    this._loopTimerId = setTimeout(() => {
      this._loopTimerId = null;
      if (!this._hasEligibleWork()) {
        this._prevTickTs = 0;
        return;
      }
      this.rafId = requestAnimationFrame(this._boundTick);
    }, sleepMs);
  },

  startLoop() {
    if (typeof requestAnimationFrame === 'undefined' || this.rafId !== null || this._loopTimerId !== null) return;
    if (!this._boundTick) {
      this._boundTick = (timestamp) => this._tick(timestamp);
    }
    this._prevTickTs = 0;
    this.rafId = requestAnimationFrame(this._boundTick);
  },

  _tick(timestamp) {
    this.rafId = null;
    if (typeof document !== 'undefined' && document.hidden) {
      this._prevTickTs = 0;
      return;
    }
    const drawStart = typeof performance !== 'undefined' ? performance.now() : timestamp;
    const dt = this._prevTickTs > 0 ? Math.min(100, Math.max(0, timestamp - this._prevTickTs)) : 0;
    this._prevTickTs = timestamp;

    const isLight = renderFrame.isLightTheme();
    const topRoot = this._getTopActiveRoot();
    let anyKeepRunning = false;
    let needsSmooth30 = false;

    for (const canvas of this.visibleCanvases) {
      const meta = this.activeCanvases.get(canvas);
      if (!meta) continue;
      if (!this._isCanvasInActiveRoot(canvas, topRoot)) continue;

      const wantsAnim = this._isCanvasAnimating(meta);
      if (!wantsAnim && meta.hasDrawn) {
        continue;
      }

      if (wantsAnim && dt > 0) {
        if (meta.mode !== 'continuous' && !meta.isHovered && meta.fadeStart === null && meta.previewRemainingMs > 0) {
          const step = Math.min(dt, meta.previewRemainingMs);
          meta.animPhaseMs += step;
          meta.previewRemainingMs = Math.max(0, meta.previewRemainingMs - step);
        } else {
          meta.animPhaseMs += dt;
          if (meta.previewRemainingMs > 0) {
            meta.previewRemainingMs = Math.max(0, meta.previewRemainingMs - dt);
          }
        }
      }

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

      const stillAnimating = this._isCanvasAnimating(meta);

      this.drawPoseOnCanvas(canvas, meta.poseType, meta.animPhaseMs, { side: meta.side, alpha, isLight, meta });
      meta.hasDrawn = true;
      if (stillAnimating) {
        anyKeepRunning = true;
        if (meta.mode === 'continuous' || meta.fadeStart !== null) {
          needsSmooth30 = true;
        }
      }
    }

    if (anyKeepRunning) {
      const drawDuration = typeof performance !== 'undefined' ? Math.max(0, performance.now() - drawStart) : 0;
      this._scheduleNextFrame(drawDuration, needsSmooth30 ? this.TIMER_SLEEP_MS : this.PREVIEW_SLEEP_MS);
    } else {
      this._prevTickTs = 0;
    }
  },

  drawPoseOnCanvas(canvas, poseType, timestamp, options = null) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1;
    const meta = options && options.meta ? options.meta : null;
    let cssW = meta && meta.cssW ? meta.cssW : 0;
    let cssH = meta && meta.cssH ? meta.cssH : 0;
    if (!cssW || !cssH) {
      cssW = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10) || 72;
      cssH = canvas.clientHeight || parseInt(canvas.getAttribute('height'), 10) || 72;
      if (meta && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        meta.cssW = cssW;
        meta.cssH = cssH;
      }
    }
    const targetW = Math.max(this.MIN_CANVAS_PX, Math.round(cssW * dpr));
    const targetH = Math.max(this.MIN_CANVAS_PX, Math.round(cssH * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = (meta && meta.ctx) || canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    const scale = Math.min(w / 200, h / 200);
    ctx.translate((w - 200 * scale) / 2, (h - 200 * scale) / 2);
    ctx.scale(scale, scale);
    const frame = this.computePose(poseType, timestamp, options);
    if (options && options.alpha != null && options.alpha < 1) {
      frame.alpha = options.alpha;
    }
    this.renderFrame(ctx, frame, options ? (options.isLight ?? null) : null);
    ctx.restore();
  }
};

globalThis.BiomechanicalStickAnimator = BiomechanicalStickAnimator;
export { BiomechanicalStickAnimator };
