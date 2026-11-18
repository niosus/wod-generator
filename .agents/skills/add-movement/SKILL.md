---
name: add-movement
description: >-
  Checklist and validation workflow for adding, removing, or modifying WODROLL
  movements across movements data, progressions, workout generation, sharing,
  and biomechanical validation. Use whenever adding new exercises, renaming IDs,
  changing difficulty tiers, or updating movement metadata.
---

# Add or Modify WODROLL Movements

Follow this cross-file checklist so new or updated movements integrate cleanly across workout generation, UI badges, progressions, URL sharing, and kinematics checks.

## Cross-File Checklist

1. **Movement Definition (`src/data/movements.js`)**
   - Define a unique `id`, `name`, valid `equipment` (matching `EQUIPMENT_CATALOG` in `src/data/equipment.js`), `pattern`, `difficulty` (`'easy' | 'normal' | 'hard'`), `intensity`, `repSec`, `muscleFocus`, `poseType`, `unit`, `reps`, `scaleDownId`, `scaleNote`, `fallbackCandidates`, `cues`, and `scaling`.
   - Use singular implement wording/loads (e.g., `'15/10 kg'`) for single-dumbbell or single-kettlebell exercises, vs `'2x...'` for pairs.
   - Use `unilateral: 'alternating'` for alternating left/right reps or `'split'` for evenly split sets; both display L/R UI badges and round prescribed reps cleanly.
   - Cross-link related variants in `fallbackCandidates` on both the new entry and its sibling movements.

2. **Progression Ladders (`src/data/progressions.js`)**
   - Keep any movement's `difficulty` in `src/data/movements.js` consistent with its `tier` (`'easy' | 'normal' | 'hard'`) in `MOVEMENT_PROGRESSIONS`.
   - Understand ladder filtering (`getHardestAllowedMovementPool`): when Hard/RX+ movements are enabled, lower-tier steps on a ladder are suppressed in favor of the highest allowed tier on that ladder. Loaded implement variants (`med_ball_*`, `kb_*`, `db_*`) stay off bodyweight skill ladders unless suppression by higher bodyweight skills is intended.

3. **Workout Generator (`src/generator/workout-generator.js`)**
   - Add tailored tokens to `MOVEMENT_NAME_TOKENS` for every new movement ID (especially single-DB movements so they do not fall back to plural `'IRON PAIR'`).
   - Add sibling variants that use distinct `poseType`s (such as loaded Russian twists or parallel-bar raises) to `MOVEMENT_FAMILY_MAP` so `selectBalancedMovements` avoids picking two near-identical variants in the same WOD.

4. **Animator Registry & Timing (`src/animator/`)**
   - **`src/animator/poses.js`**: Ensure the `poseType` matches both any outer group guard (e.g., the Russian twist / sit-up block) and inner branch so it never falls through to the default fallback (`run_track`).
   - **`src/animator/validator.js`**: Add the `poseType` to the `cycleMs` lookup whenever its period differs from `2400` / `3800` ms.
   - **`src/animator/animator.js`**: Add unilateral asymmetric poses to `SIDE_SWITCHABLE_POSES` if the canvas R/L toggle should appear.

5. **URL Sharing (`src/sharing/workout-sharing.js`)**
   - Never reorder or remove IDs from `V2_CANONICAL_MOVEMENT_IDS` (bytes `0..84` are frozen for backwards-compatible v2 share links). New movement IDs automatically serialize via hash/string codes (`126` / `127`).

## Verification

1. Run the movement metadata audit script:
   `node .agents/skills/add-movement/scripts/audit_movements.mjs`
2. Run the full kinematics test suite and production build:
   `npm test && npm run build`
3. Confirm `0` broken references, `0` missing `MOVEMENT_NAME_TOKENS`, and `0` kinematic violations.
