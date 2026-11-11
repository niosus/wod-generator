const STORAGE_KEY = 'wodforge_local_prefs_v3';

    const AppState = {
      // 13-Item 3-State Equipment Map: 'available' | 'optional' | 'off'
      equipmentStates: {
        bodyweight: 'available',
        running_area: 'optional',
        pullup_bar: 'available',
        rings_dips: 'optional',
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
      mode: 'smart',
      format: 'ANY',
      duration: 'medium',
      intensity: 'standard', // 'moderate' | 'standard' | 'high'
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
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (parsed.equipmentStates && typeof parsed.equipmentStates === 'object') {
            this.equipmentStates = { ...this.equipmentStates, ...parsed.equipmentStates };
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
          if (parsed.mode) this.mode = parsed.mode;
          if (parsed.format) this.format = parsed.format;
          if (parsed.duration) this.duration = parsed.duration;
          if (parsed.intensity) this.intensity = parsed.intensity;
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
            equipmentStates: this.equipmentStates,
            includeHardMovements: this.includeHardMovements,
            excludedMovements: Array.from(this.excludedMovements),
            mode: this.mode,
            format: this.format,
            duration: this.duration,
            intensity: this.intensity,
            recentWorkoutSignatures: this.recentWorkoutSignatures
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) { }
      },

      addRecentWorkout(sig) {
        if (!sig) return;
        this.recentWorkoutSignatures = this.recentWorkoutSignatures.filter(s => s !== sig);
        this.recentWorkoutSignatures.push(sig);
        if (this.recentWorkoutSignatures.length > 10) {
          this.recentWorkoutSignatures = this.recentWorkoutSignatures.slice(-10);
        }
        this.saveToStorage();
      },

      isRecentWorkout(sig) {
        if (!sig) return false;
        const last5 = this.recentWorkoutSignatures.slice(-5);
        return last5.includes(sig);
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
            !this.excludedMovements.has(m.id)
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
        if (!mov.scaleDownId) return null;
        const primaryScale = globalThis.MOVEMENTS_DB.find(m => m.id === mov.scaleDownId);
        if (!primaryScale) return null;

        if (!forbiddenMovementIds.has(primaryScale.id)) {
          return {
            movement: primaryScale,
            note: mov.scaleNote || primaryScale.name
          };
        }

        // If primary scale-down is already in the WOD, find a non-colliding normal movement in the same pattern
        const backupScale = this.resolveUniqueAlternative(mov, forbiddenMovementIds);
        if (backupScale && backupScale.id !== mov.id && !forbiddenMovementIds.has(backupScale.id)) {
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
