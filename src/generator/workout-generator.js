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

      selectBalancedMovements(pool, count) {
        if (pool.length === 0) return [];
        const byPattern = {};
        pool.forEach(m => {
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

        const remaining = this.shuffle(pool.filter(m => !usedIds.has(m.id)));
        while (selected.length < count && remaining.length > 0) {
          selected.push(remaining.pop());
        }

        return selected;
      },

      /**
       * Formats a single movement prescription and attaches collision-free
       * Optional Equipment alternatives and Scale-Down progressions.
       */
      buildItemPrescription(mov, formatKey, stationIndex = null, customScheme = null, usedMovementIds = new Set()) {
        const isOptionalGear = globalThis.AppState.isEquipmentOptional(mov.equipment);
        const formatRepField = formatKey === 'EMOM' ? 'emom' : (formatKey === 'FOR_TIME' ? 'forTime' : 'amrap');
        const repVal = customScheme || mov.reps[formatRepField];
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
            const altRepVal = customScheme || altMov.reps[formatRepField];
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
          const scRepVal = customScheme || scMov.reps[formatRepField];
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
        wod.items = wod.items.map((item, idx) => {
          const rebuilt = this.buildItemPrescription(
            item.movement,
            item.formatKey || wod.format,
            item.stationIndex !== undefined ? item.stationIndex : (wod.format === 'EMOM' ? idx : null),
            item.customScheme,
            usedIds
          );
          if (wod.isBenchmark && item.benchmarkCustomLabel) {
            rebuilt.prescriptionText = item.benchmarkCustomLabel;
            rebuilt.benchmarkCustomLabel = item.benchmarkCustomLabel;
          }
          return rebuilt;
        });
        return wod;
      },

      generate() {
        const activePool = globalThis.AppState.getActiveMovementPool();
        if (activePool.length === 0) {
          return this.createFallbackEmptyWod();
        }

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

        if (globalThis.AppState.mode === 'benchmark') {
          const candidateList = eligibleBenchmarks.length > 0
            ? eligibleBenchmarks
            : (broaderBenchmarks.length > 0 ? broaderBenchmarks : globalThis.CLASSICAL_BENCHMARKS);
          return this.formatBenchmarkWod(this.pickRandom(candidateList));
        }

        if (globalThis.AppState.mode === 'smart' && eligibleBenchmarks.length > 0 && Math.random() < 0.35) {
          return this.formatBenchmarkWod(this.pickRandom(eligibleBenchmarks));
        }

        return this.generateAlgorithmicWod(activePool);
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

          const items = selected.map((mov, idx) => this.buildItemPrescription(mov, 'EMOM', idx, null, usedIds));

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
            stimulus: `Target ~40 seconds of crisp work each minute, leaving 20 seconds to breathe and transition to the next station.`,
            logic: `Alternates ${selected.map(s => globalThis.PATTERNS[s.pattern].label).join(' → ')} across alternating minutes so local muscle groups recover while systemic heart rate stays high.`
          };
        }

        if (chosenFormat === 'FOR_TIME') {
          const is21_15_9 = globalThis.AppState.duration === 'short' && Math.random() < 0.45 && pool.length >= 2;
          const numMovements = is21_15_9 ? 2 : (pool.length >= 3 ? 3 : Math.min(2, pool.length));
          const selected = this.selectBalancedMovements(pool, numMovements);
          const usedIds = new Set(selected.map(m => m.id));
          const capMinutes = dom.forTimeCap;

          if (is21_15_9) {
            const items = selected.map(mov => {
              const scheme = mov.unit === 'm' ? '400m - 300m - 200m' : '21 - 15 - 9';
              return this.buildItemPrescription(mov, 'FOR_TIME', null, scheme, usedIds);
            });

            return {
              isBenchmark: false,
              title: this.generateName(),
              badgeType: 'ALGORITHMIC SPRINT',
              format: 'FOR_TIME',
              minutes: capMinutes,
              badgeFormat: `21-15-9 FOR TIME`,
              difficultyLabel: `Descending Couplet`,
              prescriptionHeader: `21 - 15 - 9 Reps For Time (${capMinutes} Min Cap):`,
              items,
              stimulus: `Classic anaerobic threshold couplet. Push the set of 21 aggressively and hold on through the 15s.`,
              logic: `Complementary ${selected.map(s => globalThis.PATTERNS[s.pattern].label).join(' + ')} couplet eliminates muscular interference during high-speed cycling.`
            };
          } else {
            const rounds = dom.rounds;
            const items = selected.map(mov => this.buildItemPrescription(mov, 'FOR_TIME', null, null, usedIds));

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
              logic: `Synergistic ${selected.map(s => globalThis.PATTERNS[s.pattern].label).join(' + ')} sequence engineered for continuous multi-round output.`
            };
          }
        }

        if (chosenFormat === 'INTERVALS') {
          const numMovements = Math.min(pool.length, globalThis.AppState.duration === 'short' ? 2 : 3);
          const selected = this.selectBalancedMovements(pool, numMovements);
          const usedIds = new Set(selected.map(m => m.id));
          const totalMinutes = numMovements * 4;

          const items = selected.map((mov, i) => this.buildItemPrescription(mov, 'INTERVALS', i, null, usedIds));

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
            logic: `High-turnover intervals targeting ${selected.map(s => globalThis.PATTERNS[s.pattern].label).join(' & ')} energy systems.`
          };
        }

        // Default: AMRAP
        const totalMinutes = this.pickRandom(dom.amrap);
        const numMovements = pool.length >= 3 ? 3 : Math.min(2, pool.length);
        const selected = this.selectBalancedMovements(pool, numMovements);
        const usedIds = new Set(selected.map(m => m.id));
        const items = selected.map(mov => this.buildItemPrescription(mov, 'AMRAP', null, null, usedIds));

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
          logic: `Pairs ${selected.map(s => globalThis.PATTERNS[s.pattern].label).join(' + ')} to avoid local muscular bottlenecks across the ${totalMinutes}-minute window.`
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
