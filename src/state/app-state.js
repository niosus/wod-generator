const STORAGE_KEY = 'wodroll_local_prefs_v3';
const LEGACY_STORAGE_KEY = 'wodforge_local_prefs_v3';

    const AppState = {
      // 13-Item 3-State Equipment Map: 'available' | 'optional' | 'off'
      equipmentStates: {
        bodyweight: 'available',
        running_area: 'optional',
        pullup_bar: 'available',
        gym_rings: 'optional',
        parallel_bars: 'optional',
        kettlebell: 'optional',
        dumbbell: 'off',
        barbell: 'off',
        bike_erg: 'optional',
        row_erg: 'off',
        ski_erg: 'off',
        jump_rope: 'optional',
        plyo_box: 'off',
        wall_ball: 'off'
      },
      includeHardMovements: false,
      excludedMovements: new Set(),
      activeMatrixCategory: 'ALL',
      activeDiffFilter: 'ALL',
      theme: 'system',
      mode: 'smart',
      format: 'ANY',
      duration: 'medium',
      currentWod: null,
      recentWorkoutSignatures: [],

      initDefaultExclusions() {
        this.excludedMovements.clear();
        if (!this.includeHardMovements) {
          globalThis.MOVEMENTS_DB.forEach(m => {
            if (m.difficulty === 'hard') this.excludedMovements.add(m.id);
          });
        }
      },

      loadFromStorage() {
        this.initDefaultExclusions();
        try {
          let raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (raw) {
              try {
                localStorage.setItem(STORAGE_KEY, raw);
              } catch (e) { }
            }
          }
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (parsed.equipmentStates && typeof parsed.equipmentStates === 'object') {
            this.equipmentStates = { ...this.equipmentStates, ...parsed.equipmentStates };
            if ('rings_dips' in this.equipmentStates) {
              const legacyState = this.equipmentStates.rings_dips;
              if (!('gym_rings' in parsed.equipmentStates)) {
                this.equipmentStates.gym_rings = legacyState;
              }
              if (!('parallel_bars' in parsed.equipmentStates)) {
                this.equipmentStates.parallel_bars = legacyState;
              }
              delete this.equipmentStates.rings_dips;
            }
            if (!('running_area' in parsed.equipmentStates)) {
              const hadOtherGear = Object.entries(parsed.equipmentStates).some(
                ([k, v]) => k !== 'bodyweight' && (v === 'available' || v === 'optional')
              );
              this.equipmentStates.running_area = hadOtherGear ? 'optional' : 'off';
            }
          }
          if (typeof parsed.includeHardMovements === 'boolean') {
            this.includeHardMovements = parsed.includeHardMovements;
          }
          if (Array.isArray(parsed.excludedMovements)) {
            this.excludedMovements = new Set(parsed.excludedMovements);
          }
          if (!this.includeHardMovements) {
            globalThis.MOVEMENTS_DB.forEach(m => {
              if (m.difficulty === 'hard') this.excludedMovements.add(m.id);
            });
          }
          if (parsed.theme === 'system' || parsed.theme === 'light' || parsed.theme === 'dark') {
            this.theme = parsed.theme;
          }
          if (parsed.mode) this.mode = parsed.mode;
          if (parsed.format) this.format = parsed.format;
          if (parsed.duration) this.duration = parsed.duration;
          if (Array.isArray(parsed.recentWorkoutSignatures)) {
            this.recentWorkoutSignatures = parsed.recentWorkoutSignatures;
          }
        } catch (e) {
          console.warn('Could not read local preferences:', e);
        }
      },

      saveToStorage() {
        try {
          const payload = {
            theme: this.theme,
            equipmentStates: this.equipmentStates,
            includeHardMovements: this.includeHardMovements,
            excludedMovements: Array.from(this.excludedMovements),
            mode: this.mode,
            format: this.format,
            duration: this.duration,
            recentWorkoutSignatures: this.recentWorkoutSignatures
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) { }
      },

      applyEquipmentPreset(presetName) {
        const catalog = globalThis.EQUIPMENT_CATALOG || [];
        const presets = globalThis.EQUIPMENT_PRESETS || {};
        catalog.forEach(e => { this.equipmentStates[e.id] = 'off'; });

        if (presetName === 'full' || presets[presetName] === 'all_available') {
          catalog.forEach(e => { this.equipmentStates[e.id] = 'available'; });
        } else if (presets[presetName] && typeof presets[presetName] === 'object') {
          Object.entries(presets[presetName]).forEach(([k, v]) => {
            this.equipmentStates[k] = v;
          });
        } else {
          this.equipmentStates.bodyweight = 'available';
        }
      },

      getActiveEquipmentPreset() {
        const catalog = globalThis.EQUIPMENT_CATALOG || [];
        const presets = globalThis.EQUIPMENT_PRESETS || {};
        const presetNames = ['bodyweight', 'minimal', 'full'];

        for (const name of presetNames) {
          const def = presets[name];
          const matches = catalog.every(eq => {
            const expected = def === 'all_available' ? 'available' : ((def && def[eq.id]) || 'off');
            return (this.equipmentStates[eq.id] || 'off') === expected;
          });
          if (matches) return name;
        }
        return 'custom';
      },

      hasCustomMovementExclusions() {
        const db = globalThis.MOVEMENTS_DB || [];
        return db.some(m => {
          const shouldBeExcluded = !this.includeHardMovements && m.difficulty === 'hard';
          return this.excludedMovements.has(m.id) !== shouldBeExcluded;
        });
      },

      getCustomOverridesCount() {
        let count = 0;
        if (this.getActiveEquipmentPreset() === 'custom') count++;
        if (this.format && this.format !== 'ANY') count++;
        if (this.hasCustomMovementExclusions()) count++;
        return count;
      },

      applyConfig(cfg) {
        if (!cfg || typeof cfg !== 'object') return;
        if (cfg.theme === 'system' || cfg.theme === 'light' || cfg.theme === 'dark') {
          this.theme = cfg.theme;
        }
        if (cfg.duration) this.duration = cfg.duration;
        if (typeof cfg.includeHardMovements === 'boolean') {
          this.includeHardMovements = cfg.includeHardMovements;
        }
        if (cfg.mode) this.mode = cfg.mode;
        if (cfg.format) this.format = cfg.format;
        if (cfg.equipmentStates && typeof cfg.equipmentStates === 'object') {
          this.equipmentStates = { ...this.equipmentStates, ...cfg.equipmentStates };
        }
        if (cfg.excludedMovements instanceof Set) {
          this.excludedMovements = new Set(cfg.excludedMovements);
        } else if (Array.isArray(cfg.excludedMovements)) {
          this.excludedMovements = new Set(cfg.excludedMovements);
        } else {
          this.initDefaultExclusions();
        }
        if (!this.includeHardMovements) {
          (globalThis.MOVEMENTS_DB || []).forEach(m => {
            if (m.difficulty === 'hard') this.excludedMovements.add(m.id);
          });
        }
      },

      addRecentWorkout(sig) {
        if (!sig) return;
        this.recentWorkoutSignatures = this.recentWorkoutSignatures.filter(s => s !== sig);
        this.recentWorkoutSignatures.push(sig);
        if (this.recentWorkoutSignatures.length > 25) {
          this.recentWorkoutSignatures = this.recentWorkoutSignatures.slice(-25);
        }
        this.saveToStorage();
      },

      isRecentWorkout(sig, windowSize = 5) {
        if (!sig) return false;
        const recent = this.recentWorkoutSignatures.slice(-windowSize);
        return recent.includes(sig);
      },

      getRecentIndex(sig) {
        if (!sig) return -1;
        return this.recentWorkoutSignatures.lastIndexOf(sig);
      },

      isEquipmentUsable(eqId) {
        const st = this.equipmentStates[eqId];
        return st === 'available' || st === 'optional';
      },

      isEquipmentOptional(eqId) {
        return this.equipmentStates[eqId] === 'optional';
      },

      /**
       * Checks if a movement (such as Doorway Towel Rows) should be suppressed
       * because the athlete already has a dedicated Pull-Up Bar or Rings/Dip Bars
       * set to 'available' (HAVE).
       */
      isMovementSuppressedByBetterGear(mov) {
        if (!Array.isArray(mov.suppressedWhenAnyAvailable)) return false;
        return mov.suppressedWhenAnyAvailable.some(
          betterEqId => this.equipmentStates[betterEqId] === 'available'
        );
      },

      getAvailableMovementsByEquipment() {
        return globalThis.MOVEMENTS_DB.filter(
          m => this.isEquipmentUsable(m.equipment) && !this.isMovementSuppressedByBetterGear(m)
        );
      },

      getActiveMovementPool() {
        return globalThis.MOVEMENTS_DB.filter(
          m => this.isEquipmentUsable(m.equipment) &&
            !this.isMovementSuppressedByBetterGear(m) &&
            !this.excludedMovements.has(m.id) &&
            (this.includeHardMovements || m.difficulty !== 'hard')
        );
      },

      /**
       * Returns the active pool filtered to ONLY the hardest allowed movement of each scale ladder.
       * Prevents regression movements (knee push-ups, sprawls, table rows) from being selected
       * when normal Rx baseline movements are available and allowed.
       */
      getHardestAllowedMovementPool() {
        const pool = this.getActiveMovementPool();
        if (globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.filterPoolToHardestLadderMovements === 'function') {
          return globalThis.ProgressionEngine.filterPoolToHardestLadderMovements(pool);
        }
        return pool;
      },

      /**
       * Collision-Free Alternative Resolver:
       * Selects an alternative movement that:
       * 1) Preserves biomechanical pattern integrity (e.g. Pull never swaps to Push-Ups!)
       * 2) Requires strictly 'available' (HAVE) equipment and is not suppressed by better gear
       * 3) Is NOT already present in `forbiddenMovementIds` (movements already in the WOD
       *    or already assigned as alternatives to other stations in the same WOD).
       */
      resolveUniqueAlternative(mov, forbiddenMovementIds = new Set()) {
        const forbidden = new Set(forbiddenMovementIds);
        forbidden.add(mov.id);

        const candidates = (mov.fallbackCandidates || [])
          .map(id => globalThis.MOVEMENTS_DB.find(m => m.id === id))
          .filter(Boolean);

        // Pass 1: Candidate in fallbackCandidates with strictly 'available' gear, not suppressed, enabled in pool, and not in forbidden set
        const pass1 = candidates.find(
          c => this.equipmentStates[c.equipment] === 'available' &&
            !this.isMovementSuppressedByBetterGear(c) &&
            !this.excludedMovements.has(c.id) &&
            !forbidden.has(c.id)
        );
        if (pass1) return pass1;

        // Pass 2: Any movement of the SAME biomechanical pattern with 'available' gear, not suppressed, enabled in pool, and not in forbidden set
        const pass2 = globalThis.MOVEMENTS_DB.find(
          m => m.pattern === mov.pattern &&
            this.equipmentStates[m.equipment] === 'available' &&
            !this.isMovementSuppressedByBetterGear(m) &&
            !this.excludedMovements.has(m.id) &&
            !forbidden.has(m.id)
        );
        if (pass2) return pass2;

        // Pass 3: Any movement of the SAME pattern with 'available' gear (even if suppressed or excluded) not in forbidden set
        const pass3 = globalThis.MOVEMENTS_DB.find(
          m => m.pattern === mov.pattern &&
            this.equipmentStates[m.equipment] === 'available' &&
            !this.isMovementSuppressedByBetterGear(m) &&
            m.difficulty === 'normal' &&
            !forbidden.has(m.id)
        );
        if (pass3) return pass3;

        // Pass 4: Fallback within same pattern (e.g. if Pull-up Bar is only Optional and Rings are Off, Towel Row is valid)
        const pass4 = globalThis.MOVEMENTS_DB.find(
          m => m.pattern === mov.pattern &&
            this.equipmentStates[m.equipment] === 'available' &&
            m.difficulty === 'normal' &&
            !forbidden.has(m.id)
        );
        return pass4 || candidates[0] || globalThis.MOVEMENTS_DB[0];
      },

      /**
       * Collision-Free Scale-Down Progression Resolver:
       * Checks if a movement has a simpler biomechanical progression (`scaleDownId`)
       * and ensures the suggested scale-down does not duplicate another movement already in the WOD.
       */
      resolveScaleDown(mov, forbiddenMovementIds = new Set()) {
        if (!mov || mov.id === 'run') return null;

        const freeWeightEquip = new Set(['kettlebell', 'dumbbell', 'barbell', 'wall_ball']);
        const isScaleEquipmentAllowed = (candidate) => {
          if (!candidate) return false;
          if (freeWeightEquip.has(mov.equipment)) {
            return candidate.equipment === mov.equipment || candidate.equipment === 'bodyweight';
          }
          return !freeWeightEquip.has(candidate.equipment);
        };

        // Walk the explicit scaleDownId chain first (never crossing between KB / DB / BB / Wall Ball)
        const visited = new Set([mov.id]);
        let cursor = mov;
        for (let hop = 0; hop < 6 && cursor && cursor.scaleDownId; hop++) {
          if (visited.has(cursor.scaleDownId)) break;
          visited.add(cursor.scaleDownId);
          const candidate = globalThis.MOVEMENTS_DB.find(m => m.id === cursor.scaleDownId);
          if (!candidate) break;

          if (
            isScaleEquipmentAllowed(candidate) &&
            this.isEquipmentUsable(candidate.equipment) &&
            !forbiddenMovementIds.has(candidate.id)
          ) {
            return {
              movement: candidate,
              note: hop === 0 ? (mov.scaleNote || candidate.name) : candidate.name
            };
          }
          cursor = candidate;
        }

        // Fallback within the same movement pattern using same equipment or bodyweight only
        const patternCandidates = globalThis.MOVEMENTS_DB.filter(candidate =>
          candidate.id !== mov.id &&
          candidate.pattern === mov.pattern &&
          isScaleEquipmentAllowed(candidate) &&
          this.isEquipmentUsable(candidate.equipment) &&
          !this.excludedMovements.has(candidate.id) &&
          !forbiddenMovementIds.has(candidate.id) &&
          (candidate.intensity || 0) <= (mov.intensity || 99)
        );
        patternCandidates.sort((a, b) => {
          const aSameEq = a.equipment === mov.equipment ? 0 : 1;
          const bSameEq = b.equipment === mov.equipment ? 0 : 1;
          if (aSameEq !== bSameEq) return aSameEq - bSameEq;
          return (b.intensity || 0) - (a.intensity || 0);
        });

        const backupScale = patternCandidates[0];
        if (backupScale) {
          return {
            movement: backupScale,
            note: backupScale.name
          };
        }
        return null;
      },

      isBenchmarkEligible(benchmark) {
        const activeIds = new Set(this.getActiveMovementPool().map(m => m.id));
        return benchmark.items.every(item => activeIds.has(item.movementId));
      }
    };

globalThis.STORAGE_KEY = STORAGE_KEY;
globalThis.AppState = AppState;
