const WOD_ADJECTIVES = ['IRON', 'VOLT', 'APEX', 'SAVAGE', 'KINETIC', 'DIESEL', 'TITAN', 'HYBRID', 'FORGE', 'NITRO', 'RELENTLESS', 'PRIMAL'];
const WOD_NOUNS = ['PROTOCOL', 'ENGINE', 'CRUCIBLE', 'METCON', 'GRINDER', 'IGNITION', 'TURBINE', 'MATRIX', 'SHIFT', 'SURGE', 'CATALYST'];

const WorkoutGenerator = {
  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  generateName() {
    return `"${this.pickRandom(WOD_ADJECTIVES)} ${this.pickRandom(WOD_NOUNS)}"`;
  },

  /**
   * Snaps a raw rep count to standard functional fitness rep cadences.
   */
  snapToStandardReps(val, unit, minVal = 3, maxVal = 100) {
    const clamped = Math.max(minVal, Math.min(maxVal, Math.round(val)));
    if (unit === 'cal') {
      const standardCals = [8, 10, 12, 14, 15, 18, 20, 22, 25, 30];
      return standardCals.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (unit === 'm') {
      const standardDist = [100, 200, 300, 400, 800];
      return standardDist.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 6) return clamped;
    if (clamped <= 16) {
      const standardMid = [6, 8, 10, 12, 14, 15, 16];
      return standardMid.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 30) {
      const standardLarge = [18, 20, 22, 24, 25, 30];
      return standardLarge.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 60) {
      const standardHuge = [35, 40, 45, 50, 60];
      return standardHuge.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    return Math.round(clamped / 5) * 5;
  },

  /**
   * Dynamic Workload & Rep Engine:
   * Replaces static hardcoded reps by calculating target volume based on:
   * 1) Biomechanical intensity & cadence (repSec) of the movement
   * 2) Workout format (EMOM vs AMRAP vs FOR_TIME)
   * 3) Workout duration (short, medium, long) & set count
   * 4) Muscular interference: reduces local rep load if multiple exercises share prime movers
   */
  calculateDynamicReps(mov, formatKey, context = {}) {
    const duration = context.durationCategory || globalThis.AppState?.duration || 'medium';
    const intensityLevel = context.intensity || globalThis.AppState?.intensity || 'standard';
    const intensity = mov.intensity || 1.8;
    const repSec = mov.repSec || 1.5;
    const unit = mov.unit || 'reps';
    const roundMovements = context.roundMovements || [];

    // Calculate muscular overlap across other movements in the round
    let muscularOverlapCount = 0;
    if (Array.isArray(mov.muscleFocus) && roundMovements.length > 1) {
      roundMovements.forEach(other => {
        if (other && other.id !== mov.id && Array.isArray(other.muscleFocus)) {
          const hasSharedMuscle = other.muscleFocus.some(m => mov.muscleFocus.includes(m));
          if (hasSharedMuscle) muscularOverlapCount++;
        }
      });
    }

    // Fatigue modifier: reduce reps per station if multiple exercises fatigue the same muscles
    const interferenceMod = muscularOverlapCount > 0 ? (1 / (1 + 0.30 * muscularOverlapCount)) : 1.0;

    // Unit-specific overrides for meters and calories
    if (unit === 'm') {
      if (formatKey === 'EMOM') {
        if (intensityLevel === 'moderate') return 150;
        if (intensityLevel === 'high') return 250;
        return 200;
      }
      return duration === 'long' ? 400 : 200;
    }
    if (unit === 'cal') {
      if (formatKey === 'EMOM') {
        const baseCal = intensityLevel === 'moderate' ? 12 : (intensityLevel === 'high' ? 18 : 15);
        const durMod = duration === 'short' ? 1.05 : (duration === 'long' ? 0.95 : 1.0);
        return this.snapToStandardReps(baseCal * durMod, 'cal');
      }
      const baseCal = intensityLevel === 'moderate' ? 12 : (intensityLevel === 'high' ? 20 : 16);
      return this.snapToStandardReps(baseCal, 'cal');
    }

    // Jump rope specific logic
    if (mov.id === 'double_unders') {
      if (formatKey === 'EMOM') {
        const baseDU = intensityLevel === 'moderate' ? 35 : (intensityLevel === 'high' ? 60 : 45);
        return Math.round(baseDU / 5) * 5;
      }
      if (formatKey === 'FOR_TIME') {
        const baseDU = intensityLevel === 'moderate' ? 35 : (intensityLevel === 'high' ? 60 : 45);
        return Math.round(baseDU / 5) * 5;
      }
      const baseDU = intensityLevel === 'moderate' ? 30 : (intensityLevel === 'high' ? 50 : 40);
      return Math.round(baseDU / 5) * 5;
    }
    if (mov.id === 'single_unders') {
      if (formatKey === 'EMOM') {
        const baseSU = intensityLevel === 'moderate' ? 60 : (intensityLevel === 'high' ? 95 : 75);
        return Math.round(baseSU / 5) * 5;
      }
      const baseSU = intensityLevel === 'moderate' ? 50 : (intensityLevel === 'high' ? 80 : 60);
      return Math.round(baseSU / 5) * 5;
    }

    // 1. EMOM Format: Target ~40-50 seconds of consistent work per minute (leaving 10-20s rest)
    if (formatKey === 'EMOM') {
      const baseEmom = (mov.reps && mov.reps.emom) ? mov.reps.emom : 12;
      // Intensity factor: moderate ~0.80 (leaves ~20s rest), standard ~1.00 (leaves ~15s rest), high ~1.20 (leaves ~10s rest)
      const intensityFactor = intensityLevel === 'moderate' ? 0.80 : (intensityLevel === 'high' ? 1.20 : 1.00);
      const durFactor = duration === 'short' ? 1.05 : (duration === 'long' ? 0.95 : 1.0);

      let rawReps = baseEmom * intensityFactor * durFactor * interferenceMod;

      // Safety ceilings calibrated for 40-50s work window (leaving 10-20s rest)
      if (mov.id === 'pushups') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 18 : (intensityLevel === 'standard' ? 15 : 12));
      else if (mov.id === 'burpees') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 14 : (intensityLevel === 'standard' ? 12 : 10));
      else if (mov.id === 'pullups') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 12 : (intensityLevel === 'standard' ? 10 : 8));
      else if (mov.id === 'hspu') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 10 : (intensityLevel === 'standard' ? 8 : 6));
      else if (mov.id === 'ring_muscle_up' || mov.id === 'bar_muscle_up') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 6 : (intensityLevel === 'standard' ? 4 : 3));
      else if (mov.id === 'ring_dips') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 13 : (intensityLevel === 'standard' ? 10 : 8));

      return this.snapToStandardReps(rawReps, unit, 3, 35);
    }

    // Intensity scaling multiplier for FOR_TIME and AMRAP
    const intensityScale = intensityLevel === 'moderate' ? 0.8 : (intensityLevel === 'high' ? 1.25 : 1.0);

    // 2. FOR_TIME Format: Calibrated for fixed rounds (e.g. 4-6 rounds with time cap)
    if (formatKey === 'FOR_TIME') {
      const rounds = context.rounds || 5;
      const capMinutes = context.capMinutes || (duration === 'short' ? 11 : (duration === 'long' ? 28 : 16));
      const targetRoundSec = (capMinutes * 60 * 0.8) / rounds;
      const numStations = Math.max(1, context.numStations || roundMovements.length || 3);
      const stationWorkSec = targetRoundSec / numStations;

      let rawReps = (stationWorkSec / repSec) * interferenceMod * intensityScale;

      if (intensity >= 5.0) rawReps = Math.min(rawReps, 7);
      else if (intensity >= 3.5) rawReps = Math.min(rawReps, 12);
      else if (intensity <= 1.2) rawReps = Math.max(rawReps, 18);

      return this.snapToStandardReps(rawReps, unit, 4, 35);
    }

    // 3. AMRAP Format (Default): Target balanced station volume allowing unbroken/2-set pacing
    const durationMultiplier = duration === 'short' ? 1.15 : (duration === 'long' ? 0.85 : 1.0);
    const basePointsPerStation = 28 * durationMultiplier * intensityScale;
    let rawReps = (basePointsPerStation / intensity) * interferenceMod;

    if (intensity >= 5.0) rawReps = Math.min(rawReps, 5);
    else if (intensity >= 3.5) rawReps = Math.min(rawReps, 10);
    else if (intensity <= 1.2) rawReps = Math.max(rawReps, 15);

    return this.snapToStandardReps(rawReps, unit, 3, 30);
  },

  /**
   * Movement Selection:
   * 1. Filters the pool to ONLY the hardest allowed movement from each scale ladder.
   *    (e.g., standard push-ups instead of knee push-ups, burpees instead of sprawls,
   *    ring/bar rows instead of table rows, box jumps instead of step-ups).
   * 2. Selects balanced movement patterns across stations.
   */
  selectBalancedMovements(pool, count) {
    if (pool.length === 0) return [];

    // 1. Filter down to hardest allowed movement of each scale ladder
    const effectivePool = globalThis.AppState && typeof globalThis.AppState.getHardestAllowedMovementPool === 'function'
      ? globalThis.AppState.getHardestAllowedMovementPool()
      : pool;

    let sourcePool = effectivePool.length >= count ? effectivePool : pool;

    // 2. Pattern-level Easy filter:
    // Unless the athlete explicitly requested the "easy" tier,
    // never select an "easy" movement in any pattern where normal or hard movements exist.
    if (globalThis.AppState?.activeDiffFilter !== 'easy') {
      const byPat = {};
      sourcePool.forEach(m => {
        if (!byPat[m.pattern]) byPat[m.pattern] = [];
        byPat[m.pattern].push(m);
      });

      const filtered = [];
      Object.values(byPat).forEach(movs => {
        const nonEasy = movs.filter(m => m.difficulty !== 'easy');
        if (nonEasy.length > 0) {
          filtered.push(...nonEasy);
        } else {
          // If no normal/hard movement exists for this pattern with current gear, keep easy
          filtered.push(...movs);
        }
      });

      if (filtered.length >= count) {
        sourcePool = filtered;
      }
    }

    const byPattern = {};
    sourcePool.forEach(m => {
      if (!byPattern[m.pattern]) byPattern[m.pattern] = [];
      byPattern[m.pattern].push(m);
    });

    const availablePatterns = this.shuffle(Object.keys(byPattern));
    const selected = [];
    const usedIds = new Set();

    for (const pat of availablePatterns) {
      if (selected.length >= count) break;
      const candidate = this.pickRandom(byPattern[pat]);
      selected.push(candidate);
      usedIds.add(candidate.id);
    }

    const remaining = this.shuffle(sourcePool.filter(m => !usedIds.has(m.id)));
    while (selected.length < count && remaining.length > 0) {
      selected.push(remaining.pop());
    }

    return selected;
  },

  /**
   * Formats a single movement prescription and attaches collision-free
   * Optional Equipment alternatives and Scale-Down progressions.
   */
  buildItemPrescription(mov, formatKey, stationIndex = null, customScheme = null, usedMovementIds = new Set(), context = {}) {
    const isOptionalGear = globalThis.AppState.isEquipmentOptional(mov.equipment);
    const repVal = customScheme !== null && customScheme !== undefined
      ? customScheme
      : this.calculateDynamicReps(mov, formatKey, context);

    const unitLabel = mov.unit === 'cal' ? 'Cal' : (mov.unit === 'm' ? 'm' : '');
    const loadSuffix = mov.load ? ` (${mov.load})` : '';

    let repsDisplay = `${repVal}${unitLabel ? ' ' + unitLabel : ''}`;
    let prescriptionText = `${repVal} ${unitLabel} ${mov.name}${loadSuffix}`.replace(/\s+/g, ' ').trim();

    if (formatKey === 'EMOM' && stationIndex !== null) {
      repsDisplay = `MIN ${stationIndex + 1}: ${repVal}${unitLabel ? ' ' + unitLabel : ''}`;
      prescriptionText = `Minute ${stationIndex + 1}: ${repVal} ${unitLabel} ${mov.name}${loadSuffix}`.replace(/\s+/g, ' ').trim();
    } else if (formatKey === 'INTERVALS' && stationIndex !== null) {
      repsDisplay = `8x 20s:10s`;
      prescriptionText = `Block ${stationIndex + 1} (4 Min): 8x (20s Max ${mov.name}${loadSuffix} / 10s Rest)`;
    }

    // 1. Optional Equipment Alternative (collision-free against usedMovementIds)
    let altPrescription = null;
    if (isOptionalGear) {
      const altMov = globalThis.AppState.resolveUniqueAlternative(mov, usedMovementIds);
      if (altMov) {
        usedMovementIds.add(altMov.id);
        const altRepVal = customScheme !== null && customScheme !== undefined
          ? customScheme
          : this.calculateDynamicReps(altMov, formatKey, context);
        const altUnit = altMov.unit === 'cal' ? 'Cal' : (altMov.unit === 'm' ? 'm' : '');
        const altLoad = altMov.load ? ` (${altMov.load})` : '';
        altPrescription = {
          movement: altMov,
          text: `${altRepVal} ${altUnit} ${altMov.name}${altLoad}`.replace(/\s+/g, ' ').trim()
        };
      }
    }

    // 2. Scale-Down Progression Badge (collision-free against usedMovementIds)
    let scaleDownPrescription = null;
    const scaleResolved = globalThis.AppState.resolveScaleDown(mov, usedMovementIds);
    if (scaleResolved && (!altPrescription || scaleResolved.movement.id !== altPrescription.movement.id)) {
      const scMov = scaleResolved.movement;
      const scRepVal = customScheme !== null && customScheme !== undefined
        ? customScheme
        : this.calculateDynamicReps(scMov, formatKey, context);
      const scUnit = scMov.unit === 'cal' ? 'Cal' : (scMov.unit === 'm' ? 'm' : '');
      const scLoad = scMov.load ? ` (${scMov.load})` : '';
      scaleDownPrescription = {
        movement: scMov,
        note: scaleResolved.note,
        text: `${scRepVal} ${scUnit} ${scMov.name}${scLoad}`.replace(/\s+/g, ' ').trim()
      };
    }

    return {
      movement: mov,
      formatKey,
      stationIndex,
      customScheme,
      repsDisplay,
      prescriptionText,
      isOptionalGear,
      alternative: altPrescription,
      scaleDown: scaleDownPrescription
    };
  },

  /**
   * Recomputes all alternatives and scale-downs across a WOD's items so that
   * no substitute or scale-down ever duplicates an exercise already in the WOD.
   */
  refreshWodCollisionFreeMetadata(wod) {
    if (!wod || !Array.isArray(wod.items)) return wod;
    const usedIds = new Set(wod.items.map(it => it.movement.id));
    const roundMovements = wod.items.map(it => it.movement);
    const context = {
      durationCategory: globalThis.AppState?.duration || 'medium',
      intensity: globalThis.AppState?.intensity || 'standard',
      totalMinutes: wod.minutes,
      numStations: wod.items.length,
      roundMovements
    };

    wod.items = wod.items.map((item, idx) => {
      const built = this.buildItemPrescription(
        item.movement,
        item.formatKey || wod.format,
        item.stationIndex !== undefined ? item.stationIndex : (wod.format === 'EMOM' ? idx : null),
        item.customScheme,
        usedIds,
        context
      );
      if (wod.isBenchmark && item.benchmarkCustomLabel) {
        built.prescriptionText = item.benchmarkCustomLabel;
        built.benchmarkCustomLabel = item.benchmarkCustomLabel;
      }
      return built;
    });
    return wod;
  },

  /**
   * Computes a unique signature for a workout for history and deduplication.
   */
  getWodSignature(wod) {
    if (!wod) return '';
    if (wod.isBenchmark) {
      const id = wod.benchmarkId || wod.id || wod.title;
      return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    const itemIds = (wod.items || [])
      .map(it => it.movement?.id)
      .filter(Boolean)
      .sort()
      .join('-');
    const format = wod.format || 'AMRAP';
    return `${format}:${itemIds}`;
  },

  getWodMovementSignature(wod) {
    if (!wod) return '';
    if (wod.isBenchmark) {
      const id = wod.benchmarkId || wod.id || wod.title;
      return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    return (wod.items || [])
      .map(it => it.movement?.id)
      .filter(Boolean)
      .sort()
      .join('-');
  },

  getBenchmarkSignature(bm) {
    if (!bm) return '';
    const id = bm.id || bm.title;
    return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  },

  /**
   * Main Generator Entrypoint:
   * Keeps track of the last workouts shown to the user and guarantees that:
   * 1) The exact same workout currently displayed is NEVER repeated consecutively.
   * 2) Any workout shown within the last 5 workouts is excluded whenever the candidate pool allows.
   * 3) If candidate pool has fewer than 5 unique options, cycles through them via Least-Recently-Used (LRU).
   */
  generate() {
    const activePool = globalThis.AppState.getActiveMovementPool();
    if (activePool.length === 0) {
      return this.createFallbackEmptyWod();
    }

    const currentWodSig = this.getWodSignature(globalThis.AppState.currentWod);
    const currentMovSig = this.getWodMovementSignature(globalThis.AppState.currentWod);

    const eligibleBenchmarks = globalThis.CLASSICAL_BENCHMARKS.filter(b => {
      const matchesPool = globalThis.AppState.isBenchmarkEligible(b);
      const matchesFormat = globalThis.AppState.format === 'ANY' || b.format === globalThis.AppState.format;
      const matchesDuration = b.durationCategory === globalThis.AppState.duration;
      return matchesPool && matchesFormat && matchesDuration;
    });

    const broaderBenchmarks = globalThis.CLASSICAL_BENCHMARKS.filter(b => {
      const matchesPool = globalThis.AppState.isBenchmarkEligible(b);
      const matchesFormat = globalThis.AppState.format === 'ANY' || b.format === globalThis.AppState.format;
      return matchesPool && matchesFormat;
    });

    // 1. CLASSICS ONLY MODE
    if (globalThis.AppState.mode === 'benchmark') {
      const candidateList = eligibleBenchmarks.length > 0
        ? eligibleBenchmarks
        : (broaderBenchmarks.length > 0 ? broaderBenchmarks : globalThis.CLASSICAL_BENCHMARKS);

      if (candidateList.length === 0) {
        return this.createFallbackEmptyWod();
      }

      // Filter out benchmarks seen in the last 5 workouts AND exclude the currently shown workout
      const nonRecent = candidateList.filter(b => {
        const sig = this.getBenchmarkSignature(b);
        return sig !== currentWodSig && !globalThis.AppState.isRecentWorkout(sig, 5);
      });

      let chosen = null;
      if (nonRecent.length > 0) {
        chosen = this.pickRandom(nonRecent);
      } else {
        // When pool <= 5, exclude current workout if possible and pick Least Recently Used (LRU)
        const candidates = candidateList.length > 1
          ? candidateList.filter(b => this.getBenchmarkSignature(b) !== currentWodSig)
          : candidateList;

        candidates.sort((a, b) => {
          const idxA = globalThis.AppState.getRecentIndex(this.getBenchmarkSignature(a));
          const idxB = globalThis.AppState.getRecentIndex(this.getBenchmarkSignature(b));
          return idxA - idxB;
        });
        chosen = candidates[0];
      }

      const wod = this.formatBenchmarkWod(chosen);
      globalThis.AppState.addRecentWorkout(this.getWodSignature(wod));
      return wod;
    }

    // 2. SMART HYBRID MODE (Benchmark chance: 35%, but ONLY if a fresh benchmark is available)
    if (globalThis.AppState.mode === 'smart' && eligibleBenchmarks.length > 0 && Math.random() < 0.35) {
      const freshBenchmarks = eligibleBenchmarks.filter(b => {
        const sig = this.getBenchmarkSignature(b);
        return sig !== currentWodSig && !globalThis.AppState.isRecentWorkout(sig, 5);
      });

      if (freshBenchmarks.length > 0) {
        const chosen = this.pickRandom(freshBenchmarks);
        const wod = this.formatBenchmarkWod(chosen);
        globalThis.AppState.addRecentWorkout(this.getWodSignature(wod));
        return wod;
      }
      // If all eligible benchmarks were already shown in the last 5 workouts,
      // fall through to algorithmic generation to create a fresh custom workout!
    }

    // 3. ALGORITHMIC GENERATION (Deduplicated against last 5 workouts + current WOD)
    const hardestPool = globalThis.AppState.getHardestAllowedMovementPool();
    const effectivePool = hardestPool.length > 0 ? hardestPool : activePool;

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 60; attempt++) {
      const candidate = this.generateAlgorithmicWod(effectivePool);
      const sig = this.getWodSignature(candidate);
      const movSig = this.getWodMovementSignature(candidate);

      // Strict rejection: never return the exact same workout that is currently on screen
      if (sig === currentWodSig) {
        continue;
      }

      const inLast5 = globalThis.AppState.isRecentWorkout(sig, 5);
      const inLastMov = currentMovSig && movSig === currentMovSig;
      const recentIndex = globalThis.AppState.getRecentIndex(sig);

      // Ideal candidate: not in last 5 workouts AND does not duplicate the current movement set
      if (!inLast5 && !inLastMov) {
        bestCandidate = candidate;
        break;
      }

      // If all attempts hit recent history (e.g. tightly constrained gear), rank by LRU
      let score = 0;
      if (!inLast5) score += 100;
      if (!inLastMov) score += 50;
      score -= (recentIndex >= 0 ? recentIndex : 0);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    const finalWod = bestCandidate || this.generateAlgorithmicWod(effectivePool);
    globalThis.AppState.addRecentWorkout(this.getWodSignature(finalWod));
    return finalWod;
  },

  formatBenchmarkWod(bm) {
    const usedIds = new Set(bm.items.map(i => i.movementId));
    const enrichedItems = bm.items.map((item, idx) => {
      const mov = globalThis.MOVEMENTS_DB.find(m => m.id === item.movementId) || globalThis.MOVEMENTS_DB[0];
      const built = this.buildItemPrescription(mov, bm.format, bm.format === 'EMOM' ? idx : null, item.reps, usedIds);
      built.prescriptionText = item.label;
      built.benchmarkCustomLabel = item.label;
      built.repsDisplay = String(item.reps);
      return built;
    });

    return {
      isBenchmark: true,
      benchmarkId: bm.id,
      title: bm.title,
      badgeType: bm.category.toUpperCase(),
      format: bm.format,
      minutes: bm.minutes,
      badgeFormat: `${bm.minutes} MIN ${bm.format.replace('_', ' ')}`,
      difficultyLabel: `Classical Benchmark`,
      prescriptionHeader: bm.prescriptionHeader,
      items: enrichedItems,
      stimulus: bm.stimulus,
      logic: bm.logic
    };
  },

  generateAlgorithmicWod(pool) {
    const chosenFormat = globalThis.AppState.format === 'ANY'
      ? this.pickRandom(['AMRAP', 'EMOM', 'FOR_TIME'])
      : globalThis.AppState.format;

    const durationMap = {
      short: { amrap: [8, 10, 12], emom: [9, 10, 12], forTimeCap: 11, rounds: 4 },
      medium: { amrap: [14, 15, 16, 18], emom: [15, 16, 18, 20], forTimeCap: 16, rounds: 5 },
      long: { amrap: [24, 25, 30], emom: [24, 28, 30], forTimeCap: 28, rounds: 6 }
    };
    const dom = durationMap[globalThis.AppState.duration] || durationMap.medium;

    if (chosenFormat === 'EMOM') {
      const numStations = pool.length >= 3 ? this.pickRandom([2, 3, 4]) : Math.min(2, pool.length);
      const selected = this.selectBalancedMovements(pool, numStations);
      const usedIds = new Set(selected.map(m => m.id));
      const baseMin = this.pickRandom(dom.emom);
      const totalMinutes = Math.max(numStations * 2, Math.round(baseMin / numStations) * numStations);
      const rounds = totalMinutes / numStations;

      const context = {
        durationCategory: globalThis.AppState.duration,
        intensity: globalThis.AppState.intensity,
        totalMinutes,
        numStations,
        roundMovements: selected,
        rounds
      };

      const items = selected.map((mov, idx) =>
        this.buildItemPrescription(mov, 'EMOM', idx, null, usedIds, context)
      );

      return {
        isBenchmark: false,
        title: this.generateName(),
        badgeType: 'ALGORITHMIC EMOM',
        format: 'EMOM',
        minutes: totalMinutes,
        badgeFormat: `${totalMinutes} MIN EMOM`,
        difficultyLabel: `${numStations}-Station Rotation (${rounds} Sets)`,
        prescriptionHeader: `Every Minute on the Minute for ${totalMinutes} Minutes (${rounds} Rounds):`,
        items,
        stimulus: `Target ~40–50 seconds of consistent work each minute, leaving 10–20 seconds to breathe and transition to the next station.`,
        logic: `Alternates ${selected.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern).join(' → ')} across alternating minutes so local muscle groups recover while systemic heart rate stays high.`
      };
    }

    if (chosenFormat === 'FOR_TIME') {
      const is21_15_9 = globalThis.AppState.duration === 'short' && Math.random() < 0.45 && pool.length >= 2;
      const numMovements = is21_15_9 ? 2 : (pool.length >= 3 ? 3 : Math.min(2, pool.length));
      const selected = this.selectBalancedMovements(pool, numMovements);
      const usedIds = new Set(selected.map(m => m.id));
      const capMinutes = dom.forTimeCap;

      if (is21_15_9) {
        // High skill or heavy movement downshifts from 21-15-9 to 15-12-9
        const hasVeryHighSkill = selected.some(m => (m.intensity || 1.8) >= 5.0);
        const standardRepScheme = hasVeryHighSkill ? '15 - 12 - 9' : '21 - 15 - 9';

        const context = {
          durationCategory: globalThis.AppState.duration,
          totalMinutes: capMinutes,
          numStations: selected.length,
          roundMovements: selected
        };

        const items = selected.map(mov => {
          const scheme = mov.unit === 'm' ? '400m - 300m - 200m' : standardRepScheme;
          return this.buildItemPrescription(mov, 'FOR_TIME', null, scheme, usedIds, context);
        });

        return {
          isBenchmark: false,
          title: this.generateName(),
          badgeType: 'ALGORITHMIC SPRINT',
          format: 'FOR_TIME',
          minutes: capMinutes,
          badgeFormat: `${standardRepScheme} FOR TIME`,
          difficultyLabel: `Descending Couplet`,
          prescriptionHeader: `${standardRepScheme} Reps For Time (${capMinutes} Min Cap):`,
          items,
          stimulus: `Classic anaerobic threshold couplet. Push the opening set aggressively and fight through the fatigue on set 2.`,
          logic: `Complementary ${selected.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern).join(' + ')} couplet eliminates muscular interference during high-speed cycling.`
        };
      } else {
        const rounds = dom.rounds;
        const context = {
          durationCategory: globalThis.AppState.duration,
          intensity: globalThis.AppState.intensity,
          totalMinutes: capMinutes,
          capMinutes,
          numStations: selected.length,
          roundMovements: selected,
          rounds
        };

        const items = selected.map(mov =>
          this.buildItemPrescription(mov, 'FOR_TIME', null, null, usedIds, context)
        );

        return {
          isBenchmark: false,
          title: this.generateName(),
          badgeType: 'ALGORITHMIC METCON',
          format: 'FOR_TIME',
          minutes: capMinutes,
          badgeFormat: `${rounds} ROUNDS FOR TIME`,
          difficultyLabel: `Balanced ${selected.length}-Movement Metcon`,
          prescriptionHeader: `${rounds} Rounds For Time (${capMinutes} Min Time Cap):`,
          items,
          stimulus: `Aim for consistent round splits within 10 seconds of each other. Smooth transitions beat early redlining.`,
          logic: `Synergistic ${selected.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern).join(' + ')} sequence engineered for continuous multi-round output.`
        };
      }
    }

    if (chosenFormat === 'INTERVALS') {
      const numMovements = Math.min(pool.length, globalThis.AppState.duration === 'short' ? 2 : 3);
      const selected = this.selectBalancedMovements(pool, numMovements);
      const usedIds = new Set(selected.map(m => m.id));
      const totalMinutes = numMovements * 4;

      const context = {
        durationCategory: globalThis.AppState.duration,
        totalMinutes,
        numStations: selected.length,
        roundMovements: selected
      };

      const items = selected.map((mov, i) =>
        this.buildItemPrescription(mov, 'INTERVALS', i, null, usedIds, context)
      );

      return {
        isBenchmark: false,
        title: this.generateName(),
        badgeType: 'TABATA HIIT',
        format: 'INTERVALS',
        minutes: totalMinutes,
        badgeFormat: `${totalMinutes} MIN TABATA`,
        difficultyLabel: `20s Work / 10s Rest`,
        prescriptionHeader: `Tabata Intervals (20 Seconds Max Effort / 10 Seconds Rest):`,
        items,
        stimulus: `Score is your lowest rep count across any of the 8 intervals. Pace intervals 1–3 at 85% so you don't crash on interval 6.`,
        logic: `High-turnover intervals targeting ${selected.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern).join(' & ')} energy systems.`
      };
    }

    // Default: AMRAP
    const totalMinutes = this.pickRandom(dom.amrap);
    const numMovements = pool.length >= 3 ? 3 : Math.min(2, pool.length);
    const selected = this.selectBalancedMovements(pool, numMovements);
    const usedIds = new Set(selected.map(m => m.id));

    const context = {
      durationCategory: globalThis.AppState.duration,
      intensity: globalThis.AppState.intensity,
      totalMinutes,
      numStations: selected.length,
      roundMovements: selected
    };

    const items = selected.map(mov =>
      this.buildItemPrescription(mov, 'AMRAP', null, null, usedIds, context)
    );

    return {
      isBenchmark: false,
      title: this.generateName(),
      badgeType: 'ALGORITHMIC AMRAP',
      format: 'AMRAP',
      minutes: totalMinutes,
      badgeFormat: `${totalMinutes} MIN AMRAP`,
      difficultyLabel: `Balanced ${selected.length}-Movement Triplet`,
      prescriptionHeader: `AMRAP in ${totalMinutes} Minutes:`,
      items,
      stimulus: `Find a sustainable pace from round 1 and aim for unbroken sets with minimal transition rest across the ${totalMinutes}-minute window.`,
      logic: `Pairs ${selected.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern).join(' + ')} to avoid local muscular bottlenecks across the ${totalMinutes}-minute window.`
    };
  },

  createFallbackEmptyWod() {
    return {
      isBenchmark: false,
      title: '"NO MOVEMENTS ENABLED"',
      badgeType: 'CHECK FILTERS',
      format: 'AMRAP',
      minutes: 10,
      badgeFormat: 'SELECT MOVEMENTS',
      difficultyLabel: 'Pool Empty',
      prescriptionHeader: 'Please enable at least 1 equipment type & movement on the left panel:',
      items: [],
      stimulus: 'Set at least one Equipment card to HAVE or OPTIONAL in Step 1, or click "Normal Only" in Step 2.',
      logic: 'The constraint solver requires at least one enabled movement in your whitelist.'
    };
  }
};

globalThis.WOD_ADJECTIVES = WOD_ADJECTIVES;
globalThis.WOD_NOUNS = WOD_NOUNS;
globalThis.WorkoutGenerator = WorkoutGenerator;
