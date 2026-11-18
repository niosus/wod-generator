/**
 * Movement Scale Progressions & Ladders Database
 *
 * Each ladder establishes a clear biomechanical progression from beginner/regression
 * movements up to elite Rx skills.
 */

const SCALE_LADDERS = [
  {
    id: 'pushup_ladder',
    name: 'Push-Up & Upper Press Progression',
    pattern: 'PUSH',
    description: 'Foundational knee push-ups and box dips scaling to standard, hand-release, diamond, ring/parallel bar push-ups, dips, and inverted HSPU.',
    steps: [
      { movementId: 'knee_pushups', level: 1, tier: 'easy', label: 'Knee Push-Ups' },
      { movementId: 'box_dips', level: 1, tier: 'easy', label: 'Box Tricep Dips' },
      { movementId: 'pushups', level: 2, tier: 'normal', label: 'Push-Ups' },
      { movementId: 'hand_release_pushups', level: 2, tier: 'normal', label: 'Hand-Release Push-Ups' },
      { movementId: 'diamond_pushups', level: 3, tier: 'normal', label: 'Diamond / Close-Grip Push-Ups' },
      { movementId: 'pbar_pushups', level: 3, tier: 'normal', label: 'Parallel Bar / Deficit Push-Ups' },
      { movementId: 'box_decline_pushups', level: 3, tier: 'normal', label: 'Box Decline Push-Ups' },
      { movementId: 'ring_pushups', level: 3, tier: 'normal', label: 'Ring Push-Ups' },
      { movementId: 'parallel_bar_dips', level: 3, tier: 'normal', label: 'Parallel Bar Dips' },
      { movementId: 'pike_pushups', level: 3, tier: 'normal', label: 'Pike Push-Ups' },
      { movementId: 'ring_dips', level: 4, tier: 'normal', label: 'Ring Dips' },
      { movementId: 'box_pike_pushups', level: 4, tier: 'hard', label: 'Box Pike Push-Ups' },
      { movementId: 'hspu', level: 5, tier: 'hard', label: 'Handstand Push-Ups (HSPU)' }
    ]
  },
  {
    id: 'pull_ladder',
    name: 'Pull & Inverted Row Progression',
    pattern: 'PULL',
    description: 'Floor & table rows progressing through suspension ring/bar rows, strict pull-ups, and explosive muscle-ups.',
    steps: [
      { movementId: 'superman_pulls', level: 1, tier: 'easy', label: 'Prone Superman Lat Pull-Downs' },
      { movementId: 'doorway_towel_rows', level: 1, tier: 'easy', label: 'Doorway Towel Rows' },
      { movementId: 'table_rows', level: 1, tier: 'easy', label: 'Table Inverted Rows' },
      { movementId: 'bar_inverted_rows', level: 2, tier: 'normal', label: 'Bar Inverted Rows' },
      { movementId: 'ring_rows', level: 2, tier: 'normal', label: 'Ring Inverted Rows' },
      { movementId: 'pullups', level: 3, tier: 'normal', label: 'Pull-Ups' },
      { movementId: 'chin_ups', level: 3, tier: 'normal', label: 'Chin-Ups' },
      { movementId: 'ring_pullups', level: 3, tier: 'normal', label: 'Ring Pull-Ups' },
      { movementId: 'chest_to_bar', level: 4, tier: 'hard', label: 'Chest-to-Bar Pull-Ups' },
      { movementId: 'bar_muscle_up', level: 5, tier: 'hard', label: 'Bar Muscle-Ups' },
      { movementId: 'ring_muscle_up', level: 5, tier: 'hard', label: 'Ring Muscle-Ups' }
    ]
  },
  {
    id: 'burpee_ladder',
    name: 'Burpee & Ground-to-Overhead Progression',
    pattern: 'FULL_BODY',
    description: 'Straight-arm sprawls scaling to burpees, bar-facing burpees, devil presses, and man makers.',
    steps: [
      { movementId: 'athletic_up_downs', level: 1, tier: 'easy', label: 'Athletic Up-Downs (Sprawls)' },
      { movementId: 'burpees', level: 2, tier: 'normal', label: 'Standard Burpees' },
      { movementId: 'bar_facing_burpees', level: 2, tier: 'normal', label: 'Bar-Facing Burpees' },
      { movementId: 'devil_press', level: 3, tier: 'hard', label: 'Dual Dumbbell Devil Press' },
      { movementId: 'man_makers', level: 4, tier: 'hard', label: 'Dumbbell Man Makers' }
    ]
  },
  {
    id: 'squat_lunge_ladder',
    name: 'Squat & Unilateral Leg Progression',
    pattern: 'SQUAT',
    description: 'Wall sits and bilateral air squats advancing through lunges, Cossack squats, Bulgarian split squats, jumping lunges, and single-leg pistols.',
    steps: [
      { movementId: 'wall_sit', level: 1, tier: 'easy', label: 'Wall Sit Hold' },
      { movementId: 'air_squats', level: 1, tier: 'normal', label: 'Air Squats' },
      { movementId: 'step_back_lunges', level: 2, tier: 'normal', label: 'Alternating Step-Back Lunges' },
      { movementId: 'walking_lunges', level: 3, tier: 'normal', label: 'Alternating Step-Forward Lunges' },
      { movementId: 'cossack_squats', level: 3, tier: 'normal', label: 'Alternating Cossack Squats' },
      { movementId: 'bulgarian_split_squats', level: 4, tier: 'normal', label: 'Bulgarian Split Squats (Rear-Foot Elevated)' },
      { movementId: 'jumping_lunges', level: 5, tier: 'hard', label: 'Alternating Jumping Lunges' },
      { movementId: 'pistol_squats', level: 6, tier: 'hard', label: 'Alternating Pistol Squats (Single-Leg)' }
    ]
  },
  {
    id: 'plank_ladder',
    name: 'Plank & Isometric Core Progression',
    pattern: 'HINGE_CORE',
    description: 'Foundational knee plank advancing through forearm, straight-arm, side plank, shoulder taps, plank up-downs, and ring fallouts.',
    steps: [
      { movementId: 'knee_plank', level: 1, tier: 'easy', label: 'Knee Plank' },
      { movementId: 'plank', level: 2, tier: 'normal', label: 'Forearm Plank' },
      { movementId: 'straight_arm_plank', level: 3, tier: 'normal', label: 'Straight-Arm Plank' },
      { movementId: 'side_plank', level: 3, tier: 'normal', label: 'Side Plank' },
      { movementId: 'plank_shoulder_taps', level: 3, tier: 'normal', label: 'Plank Shoulder Taps' },
      { movementId: 'plank_up_downs', level: 4, tier: 'normal', label: 'Plank Up-Downs (Commandos)' },
      { movementId: 'ring_fallouts', level: 5, tier: 'hard', label: 'Ring Ab Rollouts / Fallouts' }
    ]
  },
  {
    id: 'midline_core_ladder',
    name: 'Midline & Dynamic Core Progression',
    pattern: 'HINGE_CORE',
    description: 'Floor sit-ups and hollow holds progressing through V-ups, hanging knee raises, strict toes-to-bar, and L-sits.',
    steps: [
      { movementId: 'situps', level: 1, tier: 'normal', label: 'AbMat / Butterfly Sit-Ups' },
      { movementId: 'hollow_hold', level: 1, tier: 'normal', label: 'Hollow Body Hold' },
      { movementId: 'russian_twists', level: 1, tier: 'normal', label: 'Russian Twists' },
      { movementId: 'hollow_rocks', level: 2, tier: 'normal', label: 'Hollow Rocks' },
      { movementId: 'tuck_ups', level: 2, tier: 'normal', label: 'Tuck-Ups' },
      { movementId: 'v_ups', level: 2, tier: 'normal', label: 'V-Ups' },
      { movementId: 'hanging_knee_raises', level: 3, tier: 'normal', label: 'Hanging Knee Raises' },
      { movementId: 'ring_knee_raises', level: 3, tier: 'normal', label: 'Ring Hanging Knee Raises' },
      { movementId: 'pbar_knee_raises', level: 3, tier: 'normal', label: 'Parallel Bar Knee Raises' },
      { movementId: 'pbar_leg_raises', level: 4, tier: 'normal', label: 'Parallel Bar Leg Raises' },
      { movementId: 'knees_to_elbows', level: 4, tier: 'normal', label: 'Knees-to-Elbows' },
      { movementId: 'l_sit', level: 5, tier: 'hard', label: 'L-Sit Hold' },
      { movementId: 'pbar_l_sit', level: 5, tier: 'hard', label: 'Parallel Bar L-Sit Hold' },
      { movementId: 'toes_to_bar', level: 5, tier: 'hard', label: 'Toes-to-Bar (T2B)' }
    ]
  },
  {
    id: 'posterior_hinge_ladder',
    name: 'Posterior Chain & Glute-Ham Progression',
    pattern: 'HINGE_CORE',
    description: 'Bodyweight glute bridges and arch-ups scaling to barbell good mornings, hip thrusts, and deadlifts.',
    steps: [
      { movementId: 'glute_bridges', level: 1, tier: 'easy', label: 'Glute Bridges' },
      { movementId: 'back_extensions', level: 2, tier: 'normal', label: 'Back Extensions / Superman Arch-Ups' },
      { movementId: 'bb_good_morning', level: 3, tier: 'normal', label: 'Barbell Good Mornings' },
      { movementId: 'bb_hip_thrust', level: 3, tier: 'normal', label: 'Barbell Hip Thrusts / Glute Bridges' }
    ]
  },
  {
    id: 'olympic_clean_ladder',
    name: 'Olympic Clean & Ground-to-Overhead Ladder',
    pattern: 'FULL_BODY',
    description: 'Barbell hang power cleans scaling to floor power cleans, squat cleans, and full clean & jerks.',
    steps: [
      { movementId: 'bb_hang_power_clean', level: 1, tier: 'normal', label: 'Barbell Hang Power Cleans' },
      { movementId: 'bb_power_clean', level: 2, tier: 'normal', label: 'Barbell Power Cleans (From Floor)' },
      { movementId: 'bb_squat_clean', level: 3, tier: 'hard', label: 'Barbell Squat Cleans' },
      { movementId: 'bb_clean_and_jerk', level: 4, tier: 'hard', label: 'Barbell Clean & Jerks' }
    ]
  },
  {
    id: 'plyo_box_ladder',
    name: 'Plyometric Box Progression',
    pattern: 'FULL_BODY',
    description: 'Low-impact stepping progressing to explosive two-foot box jumps and box jump-overs.',
    steps: [
      { movementId: 'box_step_ups', level: 1, tier: 'easy', label: 'Box Step-Ups' },
      { movementId: 'box_jumps', level: 2, tier: 'normal', label: 'Box Jumps (24/20 in)' },
      { movementId: 'box_jump_overs', level: 3, tier: 'normal', label: 'Box Jump-Overs' }
    ]
  },
  {
    id: 'jump_rope_ladder',
    name: 'Jump Rope Coordination Progression',
    pattern: 'CARDIO',
    description: 'Single-under bounding rhythm advancing to high-turnover double-unders.',
    steps: [
      { movementId: 'single_unders', level: 1, tier: 'normal', label: 'Single-Unders (Jump Rope)' },
      { movementId: 'double_unders', level: 2, tier: 'hard', label: 'Double-Unders (Jump Rope)' }
    ]
  }
];

const ProgressionEngine = {
  getLadders() {
    return SCALE_LADDERS;
  },

  getLadderById(id) {
    return SCALE_LADDERS.find(l => l.id === id);
  },

  /**
   * Returns all ladders that include the specified movementId.
   */
  getLaddersForMovement(movementId) {
    return SCALE_LADDERS.filter(ladder =>
      ladder.steps.some(s => s.movementId === movementId)
    );
  },

  /**
   * Finds the hardest allowed movement on a given ladder among the activePool.
   * If multiple movements share the highest level, picks one (or prefers matching active pool candidates).
   */
  getHardestAllowedStep(ladder, activePool) {
    if (!ladder || !Array.isArray(ladder.steps) || !Array.isArray(activePool)) return null;
    const activeIds = new Set(activePool.map(m => m.id));
    const matchingSteps = ladder.steps.filter(s => activeIds.has(s.movementId));
    if (matchingSteps.length === 0) return null;

    // Highest level first
    matchingSteps.sort((a, b) => b.level - a.level);
    const maxLevel = matchingSteps[0].level;
    const topSteps = matchingSteps.filter(s => s.level === maxLevel);

    // Pick top step
    return topSteps[0];
  },

  /**
   * Filters an active movement pool so that for any scale ladder represented in the pool,
   * only movements of the MAXIMUM allowed difficulty tier on that ladder remain eligible
   * for primary selection (preserving variety across same-tier implements and variations).
   *
   * This guarantees:
   * - Knee push-ups are never picked when Push-Ups are allowed.
   * - Table rows/towel rows are never picked when Pull-Ups or Inverted Rows are allowed.
   * - Sprawls are never picked when Burpees are allowed.
   * - Box step-ups are never picked when Box Jumps are allowed.
   * - Same-tier progressions (DB vs KB vs BB, Step-Back vs Step-Forward Lunges, RDL vs Deadlift) stay selectable together.
   */
  filterPoolToHardestLadderMovements(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return [];
    const TIER_RANK = { easy: 1, normal: 2, hard: 3 };
    const poolIds = new Set(pool.map(m => m.id));
    const demotedIds = new Set();

    SCALE_LADDERS.forEach(ladder => {
      const activeSteps = ladder.steps.filter(s => poolIds.has(s.movementId));
      if (activeSteps.length <= 1) return;

      const maxTier = Math.max(...activeSteps.map(s => TIER_RANK[s.tier] || 2));
      activeSteps.forEach(s => {
        if ((TIER_RANK[s.tier] || 2) < maxTier) {
          demotedIds.add(s.movementId);
        }
      });
    });

    const result = pool.filter(m => !demotedIds.has(m.id));
    return result.length > 0 ? result : pool;
  }
};

globalThis.SCALE_LADDERS = SCALE_LADDERS;
globalThis.ProgressionEngine = ProgressionEngine;
export { SCALE_LADDERS, ProgressionEngine };
