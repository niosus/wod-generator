/**
 * WODROLL Workout Timer Engine
 * Drift-free workout-aware timer with Web Audio cues, Wake Lock support,
 * and live station/interval tracking for AMRAP, EMOM, Tabata, and For Time.
 */
import { WorkoutGenerator } from '../generator/workout-generator.js';

const MUTE_STORAGE_KEY = 'wodroll_timer_muted_v1';

  const WorkoutTimer = {
    COUNTDOWN_SECONDS: 3,

    _plan: null,
    _status: 'idle', // 'idle' | 'countdown' | 'running' | 'paused' | 'finished'
    _finishReason: null, // 'completed' | 'time_cap'
    _countdownMs: 3000,
    _elapsedMs: 0,
    _lastTickTs: 0,
    _timeoutId: null,
    _audioSuspendTimer: null,
    _rounds: 0,
    _lastCueKey: null,

    _audioCtx: null,
    _nativeAudioPlugin: null,
    _isMuted: false,
    _wakeLock: null,

    _onTick: null,
    _onCue: null,

    init({ onTick, onCue } = {}) {
      this._onTick = typeof onTick === 'function' ? onTick : null;
      this._onCue = typeof onCue === 'function' ? onCue : null;

      try {
        this._isMuted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
      } catch (e) {
        this._isMuted = false;
      }

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.isActive()) {
            this._requestWakeLock();
            this._stepClock(performance.now());
            this._scheduleNextTick();
          } else if (document.visibilityState === 'hidden' && !this.isActive()) {
            this.suspendAudio(0);
          }
        });
      }
    },

    isMuted() {
      return this._isMuted;
    },

    toggleMute() {
      this._isMuted = !this._isMuted;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, this._isMuted ? '1' : '0');
      } catch (e) { }
      if (this._isMuted) {
        this.suspendAudio(0);
      } else {
        this._prepareAudio();
        this._playCueWithFallback('countdown_pip', () => this._playTone(784, 0.06, 0.08, 'sine'));
      }
      this._emitTick();
      return this._isMuted;
    },

    isActive() {
      return this._status === 'countdown' || this._status === 'running';
    },

    getStatus() {
      return this._status;
    },

    getPlan() {
      return this._plan;
    },

    /**
     * Builds a normalized timing plan tailored to the current WOD.
     */
    buildPlan(wod) {
      if (!wod) return null;

      const format = wod.format || 'AMRAP';
      const items = Array.isArray(wod.items) ? wod.items : [];
      const minutes = Math.max(1, Number(wod.minutes) || 15);

      if (format === 'INTERVALS') {
        const split = globalThis.WorkoutGenerator && typeof WorkoutGenerator.getIntervalSplit === 'function'
          ? WorkoutGenerator.getIntervalSplit(wod.intensity)
          : { work: 20, rest: 10 };
        const roundsPerBlock = 8;
        const blocksCount = Math.max(1, items.length);
        const cycleSec = split.work + split.rest;
        const blockSec = roundsPerBlock * cycleSec;
        const totalSeconds = blocksCount * blockSec;

        return {
          wod,
          format: 'INTERVALS',
          totalSeconds,
          workSec: split.work,
          restSec: split.rest,
          cycleSec,
          roundsPerBlock,
          blocksCount,
          blockSec
        };
      }

      if (format === 'EMOM') {
        const isEveryMin = items.length > 1 && items.every(it => it.emomMinuteBadge === 'EVERY MIN');
        const isAscending = items.length === 1 && (
          items[0].emomMinuteBadge === 'MIN N' ||
          String(items[0].repsDisplay || '').includes('...') ||
          String(items[0].customScheme || '').includes('...')
        );

        let ascendingRule = null;
        if (isAscending) {
          const raw = String(items[0].customScheme || items[0].repsDisplay || '1, 2, 3, ...');
          const match = raw.match(/(\d+)\s*,\s*(\d+)/);
          const start = match ? parseInt(match[1], 10) : 1;
          const second = match ? parseInt(match[2], 10) : start + 1;
          const step = Math.max(1, second - start);
          const unit = items[0].movement?.unit === 'cal' ? 'Cal' : 'reps';
          ascendingRule = { start, step, unit };
        }

        const emomMode = isAscending ? 'ascending' : (isEveryMin ? 'every_min' : 'stations');
        const stationsCount = Math.max(1, items.length);

        return {
          wod,
          format: 'EMOM',
          emomMode,
          ascendingRule,
          stationsCount,
          totalMinutes: minutes,
          totalSeconds: minutes * 60
        };
      }

      if (format === 'FOR_TIME') {
        return {
          wod,
          format: 'FOR_TIME',
          totalSeconds: minutes * 60
        };
      }

      return {
        wod,
        format: 'AMRAP',
        totalSeconds: minutes * 60
      };
    },

    setWorkout(wod, { preserveIfSame = false } = {}) {
      const nextPlan = this.buildPlan(wod);
      if (preserveIfSame && this._plan && nextPlan && this._isSamePlan(this._plan, nextPlan)) {
        this._plan.wod = wod;
        this._emitTick();
        return;
      }
      this.stopLoop();
      this._releaseWakeLock();
      this.suspendAudio(0);
      this._plan = nextPlan;
      this._status = 'idle';
      this._finishReason = null;
      this._countdownMs = this.COUNTDOWN_SECONDS * 1000;
      this._elapsedMs = 0;
      this._rounds = 0;
      this._lastCueKey = null;
      this._emitTick();
    },

    _isSamePlan(a, b) {
      if (!a || !b || a.format !== b.format || a.totalSeconds !== b.totalSeconds) return false;
      if (a.format === 'INTERVALS') {
        return a.workSec === b.workSec && a.restSec === b.restSec && a.blocksCount === b.blocksCount;
      }
      if (a.format === 'EMOM') {
        return a.emomMode === b.emomMode && a.stationsCount === b.stationsCount;
      }
      return true;
    },

    startOrPause() {
      if (!this._plan) return;
      this._prepareAudio();

      if (this._status === 'idle' || this._status === 'finished') {
        if (this._status === 'finished') {
          this._rounds = 0;
        }
        this._finishReason = null;
        this._elapsedMs = 0;
        this._countdownMs = this.COUNTDOWN_SECONDS * 1000;
        this._status = 'countdown';
        this._lastCueKey = `cd:${this.COUNTDOWN_SECONDS}`;
        this._playCountdownPip();
        this._emitCue({ type: 'countdown_pip', sec: this.COUNTDOWN_SECONDS });
        this._startLoop();
        this._requestWakeLock();
        this._emitTick();
        return;
      }

      if (this._status === 'countdown' || this._status === 'running') {
        this._stepClock(performance.now());
        this._status = 'paused';
        this.stopLoop();
        this._releaseWakeLock();
        this.suspendAudio(0);
        this._emitTick();
        return;
      }

      if (this._status === 'paused') {
        this._status = this._countdownMs > 0 ? 'countdown' : 'running';
        this._startLoop();
        this._requestWakeLock();
        this._emitTick();
      }
    },

    reset() {
      this.stopLoop();
      this._releaseWakeLock();
      this.suspendAudio(0);
      this._status = 'idle';
      this._finishReason = null;
      this._countdownMs = this.COUNTDOWN_SECONDS * 1000;
      this._elapsedMs = 0;
      this._rounds = 0;
      this._lastCueKey = null;
      this._emitTick();
    },

    finishNow() {
      if (!this._plan || (this._status !== 'running' && this._status !== 'paused')) return;
      if (this._status === 'running') {
        this._stepClock(performance.now());
      }
      this.stopLoop();
      this._releaseWakeLock();
      this._status = 'finished';
      this._finishReason = 'completed';
      this._playComplete();
      this.suspendAudio(1400);
      this._emitCue({ type: 'complete' });
      this._emitTick();
    },

    adjustRounds(delta) {
      if (!this._plan || this._plan.format !== 'AMRAP') return;
      this._rounds = Math.max(0, this._rounds + delta);
      this._emitTick();
    },

    _startLoop() {
      this.stopLoop();
      this._lastTickTs = performance.now();
      this._scheduleNextTick();
    },

    _scheduleNextTick() {
      if (this._timeoutId !== null) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      if (!this.isActive() || !this._plan) return;

      let delayMs = 250;
      if (this._status === 'countdown') {
        const msToSecBoundary = ((Math.max(1, this._countdownMs) - 1) % 1000) + 1;
        delayMs = Math.min(100, msToSecBoundary) + 4;
      } else if (this._status === 'running') {
        const totalMs = this._plan.totalSeconds * 1000;
        const remainingMs = Math.max(0, totalMs - this._elapsedMs);
        const msToNextSec = 1000 - (this._elapsedMs % 1000);
        delayMs = Math.min(remainingMs, msToNextSec) + 5;
      }

      this._timeoutId = setTimeout(() => {
        this._timeoutId = null;
        if (!this.isActive()) return;
        this._stepClock(performance.now());
        if (this.isActive()) {
          this._scheduleNextTick();
        }
      }, delayMs);
    },

    stopLoop() {
      if (this._timeoutId !== null) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
    },

    _stepClock(now) {
      if (!this._plan || !this.isActive()) return;
      const dt = Math.max(0, now - this._lastTickTs);
      this._lastTickTs = now;

      if (this._status === 'countdown') {
        this._countdownMs -= dt;
        if (this._countdownMs > 0) {
          const secLeft = Math.ceil(this._countdownMs / 1000);
          const cueKey = `cd:${secLeft}`;
          if (cueKey !== this._lastCueKey && secLeft >= 1 && secLeft <= this.COUNTDOWN_SECONDS) {
            this._lastCueKey = cueKey;
            this._playCountdownPip();
            this._emitCue({ type: 'countdown_pip', sec: secLeft });
          }
          this._emitTick();
          return;
        }

        // Countdown finished -> transition into running
        const overflow = Math.abs(this._countdownMs);
        this._countdownMs = 0;
        this._status = 'running';
        this._elapsedMs = overflow;
        this._lastCueKey = 'go';
        this._playStartOrWork();
        this._emitCue({ type: 'start' });
      } else if (this._status === 'running') {
        this._elapsedMs += dt;
      }

      const totalMs = this._plan.totalSeconds * 1000;
      if (this._elapsedMs >= totalMs) {
        this._elapsedMs = totalMs;
        this._status = 'finished';
        this._finishReason = this._plan.format === 'FOR_TIME' ? 'time_cap' : 'completed';
        this.stopLoop();
        this._releaseWakeLock();
        this._playComplete();
        this.suspendAudio(1400);
        this._emitCue({
          type: this._finishReason === 'time_cap' ? 'time_cap' : 'complete'
        });
        this._emitTick();
        return;
      }

      this._evaluateFormatCues();
      this._emitTick();
    },

    _evaluateFormatCues() {
      const plan = this._plan;
      if (!plan || this._status !== 'running') return;

      const elapsedSec = Math.floor(this._elapsedMs / 1000);
      const remainingSec = Math.max(0, plan.totalSeconds - elapsedSec);

      if (plan.format === 'EMOM') {
        const currentMin = Math.floor(elapsedSec / 60); // 0-indexed
        const secIntoMin = elapsedSec % 60;
        const secLeftInMin = 60 - secIntoMin;

        // Minute transition cue (skip minute 0 which already had GO cue)
        const minKey = `emom-min:${currentMin}`;
        if (currentMin > 0 && secIntoMin === 0 && this._lastCueKey !== minKey) {
          this._lastCueKey = minKey;
          this._playStartOrWork();
          this._emitCue({ type: 'minute_change', minuteIndex: currentMin });
          return;
        }

        // 3-2-1 countdown before next minute or finish
        if (secLeftInMin <= 3 && secLeftInMin >= 1) {
          const pipKey = `emom-pip:${currentMin}:${secLeftInMin}`;
          if (this._lastCueKey !== pipKey) {
            this._lastCueKey = pipKey;
            this._playCountdownPip();
            this._emitCue({ type: 'countdown_pip', sec: secLeftInMin });
          }
        }
        return;
      }

      if (plan.format === 'INTERVALS') {
        const blockIdx = Math.floor(elapsedSec / plan.blockSec);
        const secInBlock = elapsedSec % plan.blockSec;
        const roundIdx = Math.floor(secInBlock / plan.cycleSec);
        const secInCycle = secInBlock % plan.cycleSec;
        const isWork = secInCycle < plan.workSec;
        const secLeftInPhase = isWork ? (plan.workSec - secInCycle) : (plan.cycleSec - secInCycle);

        const phaseKey = `tabata:${blockIdx}:${roundIdx}:${isWork ? 'W' : 'R'}`;
        if (secInCycle === 0 && !(blockIdx === 0 && roundIdx === 0) && this._lastCueKey !== phaseKey) {
          this._lastCueKey = phaseKey;
          this._playStartOrWork();
          this._emitCue({ type: 'phase_change', phase: 'work', blockIdx, roundIdx });
          return;
        }
        if (!isWork && secInCycle === plan.workSec && this._lastCueKey !== phaseKey) {
          this._lastCueKey = phaseKey;
          this._playRest();
          this._emitCue({ type: 'phase_change', phase: 'rest', blockIdx, roundIdx });
          return;
        }

        if (secLeftInPhase <= 3 && secLeftInPhase >= 1) {
          const pipKey = `tabata-pip:${blockIdx}:${roundIdx}:${isWork ? 'W' : 'R'}:${secLeftInPhase}`;
          if (this._lastCueKey !== pipKey) {
            this._lastCueKey = pipKey;
            this._playCountdownPip();
            this._emitCue({ type: 'countdown_pip', sec: secLeftInPhase });
          }
        }
        return;
      }

      // AMRAP & FOR_TIME: Halfway + final 3-2-1
      const halfwaySec = Math.floor(plan.totalSeconds / 2);
      if (plan.totalSeconds >= 120 && elapsedSec === halfwaySec) {
        const halfKey = `half:${halfwaySec}`;
        if (this._lastCueKey !== halfKey) {
          this._lastCueKey = halfKey;
          this._playHalfway();
          this._emitCue({ type: 'halfway' });
          return;
        }
      }

      if (remainingSec <= 3 && remainingSec >= 1) {
        const endPipKey = `end-pip:${remainingSec}`;
        if (this._lastCueKey !== endPipKey) {
          this._lastCueKey = endPipKey;
          this._playCountdownPip();
          this._emitCue({ type: 'countdown_pip', sec: remainingSec });
        }
      }
    },

    formatClock(totalSec) {
      const safe = Math.max(0, Math.floor(totalSec));
      const m = Math.floor(safe / 60);
      const s = safe % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    /**
     * Returns a complete UI snapshot of the current timer state.
     */
    getSnapshot() {
      const plan = this._plan;
      if (!plan) return null;

      const items = plan.wod?.items || [];
      const totalSec = plan.totalSeconds;
      const elapsedSec = Math.floor(this._elapsedMs / 1000);
      const overallProgressPct = totalSec > 0 ? Math.min(100, (this._elapsedMs / (totalSec * 1000)) * 100) : 0;
      const common = {
        status: this._status,
        format: plan.format,
        elapsedSec,
        totalSec,
        overallProgressPct,
        rounds: this._rounds,
        isMuted: this._isMuted
      };

      // Pre-start 3s countdown snapshot
      if (this._status === 'countdown' || (this._status === 'paused' && this._countdownMs > 0)) {
        const cdSec = Math.max(1, Math.ceil(this._countdownMs / 1000));
        return {
          ...common,
          elapsedSec: 0,
          primaryDisplay: `0:${String(cdSec).padStart(2, '0')}`,
          secondaryDisplay: `Starting ${this.formatClock(totalSec)} ${plan.format === 'FOR_TIME' ? 'Cap' : ''}`.trim(),
          phaseLabel: 'GET READY',
          phaseTone: 'countdown',
          subPhaseLabel: items[0] ? `First: ${items[0].movement?.name || ''}` : 'Starting soon',
          progressPct: ((this.COUNTDOWN_SECONDS * 1000 - this._countdownMs) / (this.COUNTDOWN_SECONDS * 1000)) * 100,
          overallProgressPct: 0,
          activeItemIndex: (plan.format === 'EMOM' || plan.format === 'INTERVALS') ? (plan.emomMode === 'every_min' ? 'all' : 0) : null,
          nextItemIndex: (plan.format === 'EMOM' || plan.format === 'INTERVALS') && items.length > 1 ? 1 : null,
          liveTargetText: this._getItemSummary(items[0], plan, 0),
          nextTargetText: items.length > 1 ? this._getItemSummary(items[1], plan, 1) : null
        };
      }

      if (plan.format === 'EMOM') {
        const completed = this._status === 'finished';
        const activeMinIdx = completed
          ? Math.max(0, plan.totalMinutes - 1)
          : Math.min(plan.totalMinutes - 1, Math.floor(elapsedSec / 60));
        const secIntoMin = completed ? 60 : (elapsedSec % 60);
        const secLeftInMin = completed ? 0 : (60 - secIntoMin);
        const minNumber = activeMinIdx + 1;
        const roundNumber = Math.floor(activeMinIdx / plan.stationsCount) + 1;
        const totalRounds = Math.ceil(plan.totalMinutes / plan.stationsCount);

        let activeItemIndex = null;
        let nextItemIndex = null;
        if (plan.emomMode === 'every_min') {
          activeItemIndex = 'all';
        } else if (plan.emomMode === 'ascending') {
          activeItemIndex = 0;
        } else if (items.length > 0) {
          activeItemIndex = activeMinIdx % items.length;
          if (items.length > 1 && minNumber < plan.totalMinutes) {
            nextItemIndex = (activeMinIdx + 1) % items.length;
          }
        }

        const isWarning = this._status === 'running' && secLeftInMin <= 3 && secLeftInMin >= 1;
        const remainingTotalSec = Math.max(0, totalSec - elapsedSec);

        let subPhaseLabel = `Round ${roundNumber} of ${totalRounds}`;
        if (plan.emomMode === 'ascending' && plan.ascendingRule) {
          const target = plan.ascendingRule.start + activeMinIdx * plan.ascendingRule.step;
          subPhaseLabel = `Min ${minNumber} Target: ${target} ${plan.ascendingRule.unit}`;
        } else if (plan.emomMode === 'every_min') {
          subPhaseLabel = `All movements inside minute`;
        }

        const liveTargetText = plan.emomMode === 'ascending' && plan.ascendingRule
          ? `${plan.ascendingRule.start + activeMinIdx * plan.ascendingRule.step} ${plan.ascendingRule.unit} ${items[0]?.movement?.name || ''}`.trim()
          : (activeItemIndex === 'all'
            ? items.map(it => `${it.repsDisplay} ${it.movement?.name || ''}`).join(' · ')
            : this._getItemSummary(items[activeItemIndex], plan, activeMinIdx));

        const nextTargetText = plan.emomMode === 'ascending' && plan.ascendingRule && minNumber < plan.totalMinutes
          ? `${plan.ascendingRule.start + (activeMinIdx + 1) * plan.ascendingRule.step} ${plan.ascendingRule.unit} ${items[0]?.movement?.name || ''}`.trim()
          : (nextItemIndex !== null ? this._getItemSummary(items[nextItemIndex], plan, activeMinIdx + 1) : null);

        return {
          ...common,
          format: 'EMOM',
          primaryDisplay: completed ? '00:00' : (this._status === 'idle' ? '01:00' : this.formatClock(secLeftInMin)),
          secondaryDisplay: this._status === 'idle'
            ? `${plan.totalMinutes}:00 total • ${plan.stationsCount > 1 && plan.emomMode === 'stations' ? `${plan.stationsCount} stations` : '1-min intervals'}`
            : `${this.formatClock(remainingTotalSec)} total left`,
          phaseLabel: completed ? 'COMPLETE' : `MIN ${minNumber} / ${plan.totalMinutes}`,
          phaseTone: completed ? 'done' : (isWarning ? 'warning' : (this._status === 'idle' ? 'idle' : 'work')),
          subPhaseLabel,
          progressPct: completed ? 100 : ((secIntoMin / 60) * 100),
          activeItemIndex: this._status === 'idle' ? (plan.emomMode === 'every_min' ? 'all' : 0) : activeItemIndex,
          nextItemIndex: this._status === 'idle' ? (items.length > 1 && plan.emomMode === 'stations' ? 1 : null) : nextItemIndex,
          liveTargetText,
          nextTargetText,
          ascendingTarget: plan.emomMode === 'ascending' && plan.ascendingRule
            ? `${plan.ascendingRule.start + activeMinIdx * plan.ascendingRule.step} ${plan.ascendingRule.unit}`
            : null
        };
      }

      if (plan.format === 'INTERVALS') {
        const completed = this._status === 'finished';
        const clampedSec = Math.min(Math.max(0, elapsedSec), Math.max(0, totalSec - 1));
        const blockIdx = completed ? plan.blocksCount - 1 : Math.floor(clampedSec / plan.blockSec);
        const secInBlock = completed ? plan.blockSec : (clampedSec % plan.blockSec);
        const roundIdx = completed ? plan.roundsPerBlock - 1 : Math.floor(secInBlock / plan.cycleSec);
        const secInCycle = completed ? plan.cycleSec : (secInBlock % plan.cycleSec);
        const isWork = completed ? false : (secInCycle < plan.workSec);
        const phaseDuration = isWork ? plan.workSec : plan.restSec;
        const secIntoPhase = isWork ? secInCycle : (secInCycle - plan.workSec);
        const secLeftInPhase = completed ? 0 : (phaseDuration - secIntoPhase);

        const activeItemIndex = items.length > 0 ? Math.min(blockIdx, items.length - 1) : null;
        let nextItemIndex = null;
        if (!completed && items.length > 1 && blockIdx + 1 < items.length) {
          nextItemIndex = blockIdx + 1;
        }

        const isWarning = this._status === 'running' && secLeftInPhase <= 3 && secLeftInPhase >= 1;
        const remainingTotalSec = Math.max(0, totalSec - elapsedSec);

        const phaseLabel = completed
          ? 'COMPLETE'
          : (this._status === 'idle'
            ? `${plan.workSec}s : ${plan.restSec}s TABATA`
            : (isWork ? 'WORK' : 'REST'));

        const liveTargetText = this._getItemSummary(items[activeItemIndex], plan, blockIdx);
        const nextTargetText = !isWork && !completed
          ? (roundIdx + 1 < plan.roundsPerBlock
            ? `Set ${roundIdx + 2}/${plan.roundsPerBlock}: ${items[activeItemIndex]?.movement?.name || ''}`
            : (nextItemIndex !== null ? `Next Block: ${items[nextItemIndex]?.movement?.name || ''}` : 'Final sprint ahead'))
          : (nextItemIndex !== null && roundIdx === plan.roundsPerBlock - 1
            ? `Next Block: ${items[nextItemIndex]?.movement?.name || ''}`
            : (isWork ? `Rest ${plan.restSec}s next` : null));

        return {
          ...common,
          format: 'INTERVALS',
          primaryDisplay: completed
            ? '00:00'
            : (this._status === 'idle' ? this.formatClock(plan.workSec) : this.formatClock(secLeftInPhase)),
          secondaryDisplay: this._status === 'idle'
            ? `${plan.blocksCount} ${plan.blocksCount === 1 ? 'block' : 'blocks'} • ${this.formatClock(totalSec)} total`
            : `${this.formatClock(remainingTotalSec)} total left`,
          phaseLabel,
          phaseTone: completed ? 'done' : (isWarning ? 'warning' : (this._status === 'idle' ? 'idle' : (isWork ? 'work' : 'rest'))),
          subPhaseLabel: `Block ${blockIdx + 1}/${plan.blocksCount} • Interval ${roundIdx + 1}/${plan.roundsPerBlock}`,
          progressPct: completed ? 100 : (this._status === 'idle' ? 0 : ((secIntoPhase / Math.max(1, phaseDuration)) * 100)),
          activeItemIndex,
          nextItemIndex,
          liveTargetText,
          nextTargetText
        };
      }

      if (plan.format === 'FOR_TIME') {
        const completed = this._status === 'finished';
        const isCap = this._finishReason === 'time_cap';
        const remainingToCapSec = Math.max(0, totalSec - elapsedSec);
        const isWarning = this._status === 'running' && remainingToCapSec <= 3 && remainingToCapSec >= 1;

        return {
          ...common,
          format: 'FOR_TIME',
          primaryDisplay: this.formatClock(elapsedSec),
          secondaryDisplay: completed
            ? (isCap ? `Reached ${this.formatClock(totalSec)} Time Cap` : `Finished under ${this.formatClock(totalSec)} cap`)
            : `Time Cap ${this.formatClock(totalSec)} • ${this.formatClock(remainingToCapSec)} left`,
          phaseLabel: completed ? (isCap ? 'TIME CAP' : 'FINISHED') : 'FOR TIME',
          phaseTone: completed ? (isCap ? 'warning' : 'done') : (isWarning ? 'warning' : (this._status === 'idle' ? 'idle' : 'work')),
          subPhaseLabel: completed
            ? (isCap ? 'Cap reached' : `Logged time: ${this.formatClock(elapsedSec)}`)
            : (this._status === 'idle' ? 'Counts up to time cap' : 'Clock running'),
          progressPct: overallProgressPct,
          activeItemIndex: null,
          nextItemIndex: null,
          liveTargetText: null,
          nextTargetText: null
        };
      }

      // Default: AMRAP
      const completed = this._status === 'finished';
      const remainingSec = Math.max(0, totalSec - elapsedSec);
      const isWarning = this._status === 'running' && remainingSec <= 3 && remainingSec >= 1;

      return {
        ...common,
        format: 'AMRAP',
        primaryDisplay: this.formatClock(remainingSec),
        secondaryDisplay: `${this.formatClock(elapsedSec)} elapsed of ${this.formatClock(totalSec)}`,
        phaseLabel: completed ? 'TIME!' : 'AMRAP',
        phaseTone: completed ? 'done' : (isWarning ? 'warning' : (this._status === 'idle' ? 'idle' : 'work')),
        subPhaseLabel: `Rounds completed: ${this._rounds}`,
        progressPct: overallProgressPct,
        activeItemIndex: null,
        nextItemIndex: null,
        liveTargetText: null,
        nextTargetText: null
      };
    },

    _getItemSummary(item, plan, idx = 0) {
      if (!item) return null;
      const name = item.movement?.name || '';
      if (plan.format === 'EMOM' && plan.emomMode === 'ascending' && plan.ascendingRule) {
        const target = plan.ascendingRule.start + idx * plan.ascendingRule.step;
        return `${target} ${plan.ascendingRule.unit} ${name}`.trim();
      }
      if (plan.format === 'INTERVALS') {
        return `${name} (${plan.workSec}s/${plan.restSec}s)`.trim();
      }
      const reps = item.repsDisplay ? `${item.repsDisplay} ` : '';
      return `${reps}${name}`.trim();
    },

    _emitTick() {
      if (this._onTick) {
        this._onTick(this.getSnapshot());
      }
    },

    _emitCue(cue) {
      if (this._onCue) {
        this._onCue(cue, this.getSnapshot());
      }
    },

    // =========================================================================
    // NATIVE & WEB AUDIO SYNTHESIZER (Zero external audio assets)
    // =========================================================================
    _getNativeAudioPlugin() {
      if (this._nativeAudioPlugin) return this._nativeAudioPlugin;
      if (typeof window === 'undefined') return null;
      const cap = window.Capacitor;
      if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return null;
      const direct = cap.Plugins && cap.Plugins.TimerAudio;
      if (direct && typeof direct.playCue === 'function') {
        this._nativeAudioPlugin = direct;
        return this._nativeAudioPlugin;
      }
      if (typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('TimerAudio')) return null;
      if (typeof cap.registerPlugin === 'function') {
        try {
          this._nativeAudioPlugin = cap.registerPlugin('TimerAudio');
          return this._nativeAudioPlugin;
        } catch (e) {
          return null;
        }
      }
      return null;
    },

    _isIOSWeb() {
      return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    },

    _cancelAudioSuspend() {
      if (this._audioSuspendTimer !== null) {
        clearTimeout(this._audioSuspendTimer);
        this._audioSuspendTimer = null;
      }
    },

    suspendAudio(delayMs = 0) {
      this._cancelAudioSuspend();
      if (!this._audioCtx || this._audioCtx.state === 'closed') return;
      const doSuspend = () => {
        this._audioSuspendTimer = null;
        if (this._audioCtx && this._audioCtx.state === 'running' && typeof this._audioCtx.suspend === 'function') {
          try {
            Promise.resolve(this._audioCtx.suspend()).catch(() => { });
          } catch (e) { }
        }
      };
      if (delayMs <= 0) {
        doSuspend();
      } else {
        this._audioSuspendTimer = setTimeout(doSuspend, delayMs);
      }
    },

    _prepareAudio() {
      this._cancelAudioSuspend();
      const plugin = this._getNativeAudioPlugin();
      if (plugin) {
        if (typeof plugin.prepare === 'function') {
          try {
            Promise.resolve(plugin.prepare()).catch(() => { });
          } catch (e) { }
        }
        return;
      }
      if (!this._isMuted) {
        this._ensureAudioContext();
      }
    },

    _ensureAudioContext() {
      this._cancelAudioSuspend();
      if (typeof window === 'undefined') return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this._audioCtx) {
        try {
          this._audioCtx = new AudioCtx();
        } catch (e) {
          return null;
        }
      }
      if (this._audioCtx.state !== 'running') {
        try {
          Promise.resolve(this._audioCtx.resume()).catch(() => { });
        } catch (e) { }
      }
      return this._audioCtx;
    },

    _playTone(freq, durationSec = 0.12, volume = 0.18, type = 'triangle', startOffset = 0) {
      if (this._isMuted) return;
      this._cancelAudioSuspend();
      const ctx = this._ensureAudioContext();
      if (!ctx) return;

      const schedule = (c) => {
        try {
          const now = c.currentTime + startOffset;
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + durationSec + 0.02);
        } catch (e) { }
      };

      if (ctx.state === 'running') {
        schedule(ctx);
      } else {
        try {
          Promise.resolve(ctx.resume())
            .then(() => {
              if (ctx.state === 'running') {
                schedule(ctx);
              }
            })
            .catch(() => { });
        } catch (e) { }
      }

      if (!this._isIOSWeb()) {
        this.suspendAudio(Math.ceil((startOffset + durationSec) * 1000) + 2000);
      }
    },

    _playCueWithFallback(cueName, webFallbackFn) {
      if (this._isMuted) return;
      const plugin = this._getNativeAudioPlugin();
      if (plugin && typeof plugin.playCue === 'function') {
        try {
          Promise.resolve(plugin.playCue({ cue: cueName })).catch(() => {
            webFallbackFn();
          });
          return;
        } catch (e) { }
      }
      webFallbackFn();
    },

    _playCountdownPip() {
      this._playCueWithFallback('countdown_pip', () => {
        this._playTone(620, 0.09, 0.16, 'triangle', 0);
      });
    },

    _playStartOrWork() {
      this._playCueWithFallback('start_work', () => {
        this._playTone(880, 0.14, 0.22, 'triangle', 0);
        this._playTone(1174.66, 0.16, 0.18, 'sine', 0.09);
      });
    },

    _playRest() {
      this._playCueWithFallback('rest', () => {
        this._playTone(523.25, 0.12, 0.17, 'sine', 0);
        this._playTone(392.0, 0.18, 0.16, 'sine', 0.1);
      });
    },

    _playHalfway() {
      this._playCueWithFallback('halfway', () => {
        this._playTone(740, 0.09, 0.14, 'sine', 0);
        this._playTone(740, 0.11, 0.14, 'sine', 0.13);
      });
    },

    _playComplete() {
      this._playCueWithFallback('complete', () => {
        this._playTone(880, 0.14, 0.22, 'triangle', 0);
        this._playTone(880, 0.14, 0.22, 'triangle', 0.18);
        this._playTone(1318.5, 0.34, 0.24, 'triangle', 0.36);
      });
    },

    // =========================================================================
    // SCREEN WAKE LOCK
    // =========================================================================
    async _requestWakeLock() {
      const plugin = this._getNativeAudioPlugin();
      if (plugin && typeof plugin.setKeepAwake === 'function') {
        try {
          Promise.resolve(plugin.setKeepAwake({ enabled: true })).catch(() => { });
        } catch (e) { }
      }
      if (typeof navigator === 'undefined' || !navigator.wakeLock || this._wakeLock) return;
      try {
        this._wakeLock = await navigator.wakeLock.request('screen');
        this._wakeLock.addEventListener('release', () => {
          this._wakeLock = null;
        });
      } catch (e) {
        this._wakeLock = null;
      }
    },

    _releaseWakeLock() {
      const plugin = this._getNativeAudioPlugin();
      if (plugin && typeof plugin.setKeepAwake === 'function') {
        try {
          Promise.resolve(plugin.setKeepAwake({ enabled: false })).catch(() => { });
        } catch (e) { }
      }
      if (!this._wakeLock) return;
      try {
        this._wakeLock.release().catch(() => { });
      } catch (e) { }
      this._wakeLock = null;
    }
  };

  globalThis.WorkoutTimer = WorkoutTimer;
export { WorkoutTimer };
