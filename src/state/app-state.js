import {
  EQUIPMENT_CATALOG,
  MOVEMENTS_DB,
  EQUIPMENT_PRESETS,
  ProgressionEngine
} from '../data/index.js';

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
       * Returns the active pool with regression-only ladder steps suppressed whenever
       * higher-level movements on the same ladder are available and allowed.
       * Standalone movements (e.g. push-ups, air squats, sit-ups, single-unders) stay eligible.
       */
      getHardestAllowedMovementPool() {
        const pool = this.getActiveMovementPool();
        if (globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.filterPoolToHardestLadderMovements === 'function') {
          return globalThis.ProgressionEngine.filterPoolToHardestLadderMovements(pool);
        }
        return pool;
      },

      /**
       * Returns all usable alternative options when a movement's gear is 'optional' or 'off':
       * 1) All usable different-gear options from its Lateral Peer Group ('available' before 'optional')
       * 2) Usable non-bodyweight fallbacks when no peer group options exist
       * 3) A matching No-Gear (bodyweight) alternative
       */
      resolveAlternativeOptions(mov, forbiddenMovementIds = new Set()) {
        if (!mov) return [];
        const forbidden = new Set(forbiddenMovementIds);
        forbidden.add(mov.id);

        const findById = (id) => globalThis.MOVEMENTS_DB.find(m => m.id === id);
        const isAllowedDiffGear = (c) =>
          c &&
          c.equipment !== mov.equipment &&
          this.isEquipmentUsable(c.equipment) &&
          (this.includeHardMovements || c.difficulty !== 'hard') &&
          !forbidden.has(c.id);

        const options = [];
        const seen = new Set([mov.id]);
        const addOption = (c) => {
          if (!c || seen.has(c.id) || forbidden.has(c.id)) return false;
          seen.add(c.id);
          options.push(c);
          return true;
        };

        const peerIds = globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.getLateralPeers === 'function'
          ? globalThis.ProgressionEngine.getLateralPeers(mov.id)
          : [];
        const usablePeers = peerIds.map(findById).filter(isAllowedDiffGear);

        usablePeers
          .filter(c => this.equipmentStates[c.equipment] === 'available' && c.equipment !== 'bodyweight')
          .forEach(addOption);
        usablePeers
          .filter(c => this.equipmentStates[c.equipment] === 'optional' && c.equipment !== 'bodyweight')
          .forEach(addOption);
        usablePeers
          .filter(c => c.equipment === 'bodyweight')
          .forEach(addOption);

        const candidates = (mov.fallbackCandidates || []).map(findById).filter(Boolean);
        if (options.length === 0) {
          candidates
            .filter(c => c.equipment !== 'bodyweight' && isAllowedDiffGear(c))
            .slice(0, 2)
            .forEach(addOption);
        }

        if (mov.equipment !== 'bodyweight' && !options.some(o => o.equipment === 'bodyweight')) {
          const isValidNoGear = (c, allowRegressions = true) =>
            c &&
            c.equipment === 'bodyweight' &&
            (this.includeHardMovements || c.difficulty !== 'hard') &&
            (allowRegressions || !(globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.isRegressionMovement === 'function' && globalThis.ProgressionEngine.isRegressionMovement(c.id))) &&
            !forbidden.has(c.id);

          let noGear =
            candidates.find(c => isValidNoGear(c, false)) ||
            candidates.find(c => isValidNoGear(c, true));

          if (!noGear && globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.getScaleDownChain === 'function') {
            const chainMovs = globalThis.ProgressionEngine.getScaleDownChain(mov.id).map(findById).filter(Boolean);
            noGear = chainMovs.find(c => isValidNoGear(c, false)) || chainMovs.find(c => isValidNoGear(c, true));
          }

          if (!noGear) {
            noGear =
              globalThis.MOVEMENTS_DB.find(m => m.pattern === mov.pattern && m.difficulty === 'normal' && isValidNoGear(m, false)) ||
              globalThis.MOVEMENTS_DB.find(m => m.pattern === mov.pattern && isValidNoGear(m, true));
          }

          if (noGear) addOption(noGear);
        }

        return options;
      },

      /**
       * Collision-Free Alternative Resolver (2-Axis Graph):
       * Selects the primary alternative movement when prescribed equipment is 'optional' or 'off'.
       */
      resolveUniqueAlternative(mov, forbiddenMovementIds = new Set()) {
        const forbidden = new Set(forbiddenMovementIds);
        forbidden.add(mov.id);
        const options = this.resolveAlternativeOptions(mov, forbidden);
        if (options.length > 0) return options[0];

        const findById = (id) => globalThis.MOVEMENTS_DB.find(m => m.id === id);
        const candidates = (mov.fallbackCandidates || []).map(findById).filter(Boolean);
        const samePatternAny = globalThis.MOVEMENTS_DB.find(
          m => m.pattern === mov.pattern &&
            this.equipmentStates[m.equipment] === 'available' &&
            m.difficulty === 'normal' &&
            !forbidden.has(m.id)
        );
        return samePatternAny || candidates[0] || globalThis.MOVEMENTS_DB[0];
      },

      /**
       * Collision-Free Scale-Down Resolver (Vertical Chain + Lateral Peers):
       * Walks `scaleDownId` downward, checking lateral peers at each tier when
       * the primary step's equipment is unavailable or already used in the WOD.
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
        const isCandidateValid = (candidate) =>
          candidate &&
          isScaleEquipmentAllowed(candidate) &&
          this.isEquipmentUsable(candidate.equipment) &&
          !forbiddenMovementIds.has(candidate.id);

        const visited = new Set([mov.id]);
        let cursor = mov;
        for (let hop = 0; hop < 6 && cursor && cursor.scaleDownId; hop++) {
          if (visited.has(cursor.scaleDownId)) break;
          visited.add(cursor.scaleDownId);
          const candidate = globalThis.MOVEMENTS_DB.find(m => m.id === cursor.scaleDownId);
          if (!candidate) break;

          const peerIds = (globalThis.ProgressionEngine && typeof globalThis.ProgressionEngine.getLateralPeers === 'function')
            ? globalThis.ProgressionEngine.getLateralPeers(candidate.id)
            : [];
          const peers = peerIds.map(pid => globalThis.MOVEMENTS_DB.find(m => m.id === pid)).filter(Boolean);

          // Prefer matching equipment peer when primary target requires different gear
          const sameGearPeer = candidate.equipment !== mov.equipment
            ? peers.find(p => p.equipment === mov.equipment && isCandidateValid(p))
            : null;
          if (sameGearPeer) {
            return {
              movement: sameGearPeer,
              note: sameGearPeer.name
            };
          }

          if (isCandidateValid(candidate)) {
            return {
              movement: candidate,
              note: hop === 0 ? (mov.scaleNote || candidate.name) : candidate.name
            };
          }

          // Check remaining lateral peers at the same vertical tier (e.g. bar_inverted_rows <-> ring_rows)
          for (const peer of peers) {
            if (isCandidateValid(peer)) {
              return {
                movement: peer,
                note: peer.name
              };
            }
          }

          cursor = candidate;
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
export { STORAGE_KEY, AppState };
