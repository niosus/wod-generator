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
    description: 'Foundational knee push-ups scaling to standard deck push-ups, dips, and inverted HSPU.',
    steps: [
      { movementId: 'knee_pushups', level: 1, tier: 'easy', label: 'Knee Push-Ups' },
      { movementId: 'pushups', level: 2, tier: 'normal', label: 'Standard Push-Ups (Rx Baseline)' },
      { movementId: 'ring_dips', level: 3, tier: 'normal', label: 'Ring / Parallel Bar Dips' },
      { movementId: 'pike_pushups', level: 3, tier: 'normal', label: 'Pike Push-Ups' },
      { movementId: 'hspu', level: 4, tier: 'hard', label: 'Handstand Push-Ups (HSPU)' }
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
      { movementId: 'pullups', level: 3, tier: 'normal', label: 'Strict / Kipping Pull-Ups (Rx Baseline)' },
      { movementId: 'chin_ups', level: 3, tier: 'normal', label: 'Strict / Kipping Chin-Ups' },
      { movementId: 'bar_muscle_up', level: 4, tier: 'hard', label: 'Bar Muscle-Ups' },
      { movementId: 'ring_muscle_up', level: 4, tier: 'hard', label: 'Ring Muscle-Ups' }
    ]
  },
  {
    id: 'burpee_ladder',
    name: 'Burpee & Ground-to-Overhead Progression',
    pattern: 'FULL_BODY',
    description: 'Straight-arm sprawls scaling to chest-to-deck burpees, devil presses, and man makers.',
    steps: [
      { movementId: 'athletic_up_downs', level: 1, tier: 'easy', label: 'Athletic Up-Downs (Sprawls)' },
      { movementId: 'burpees', level: 2, tier: 'normal', label: 'Standard Burpees (Chest-to-Deck)' },
      { movementId: 'devil_press', level: 3, tier: 'hard', label: 'Dual Dumbbell Devil Press' },
      { movementId: 'man_makers', level: 4, tier: 'hard', label: 'Dumbbell Man Makers' }
    ]
  },
  {
    id: 'squat_lunge_ladder',
    name: 'Squat & Unilateral Leg Progression',
    pattern: 'SQUAT',
    description: 'Bilateral air squats advancing to walking lunges, jumping lunges, and single-leg pistols.',
    steps: [
      { movementId: 'air_squats', level: 1, tier: 'normal', label: 'Air Squats (Rx Baseline)' },
      { movementId: 'walking_lunges', level: 2, tier: 'normal', label: 'Alternating Walking Lunges' },
      { movementId: 'jumping_lunges', level: 3, tier: 'hard', label: 'Alternating Jumping Lunges' },
      { movementId: 'pistol_squats', level: 4, tier: 'hard', label: 'Alternating Pistol Squats (Single-Leg)' }
    ]
  },
  {
    id: 'plank_ladder',
    name: 'Plank & Isometric Core Progression',
    pattern: 'HINGE_CORE',
    description: 'Foundational knee plank advancing to standard forearm plank, straight-arm plank, and rotational side plank hold.',
    steps: [
      { movementId: 'knee_plank', level: 1, tier: 'easy', label: 'Knee Plank' },
      { movementId: 'plank', level: 2, tier: 'normal', label: 'Forearm Plank' },
      { movementId: 'straight_arm_plank', level: 3, tier: 'normal', label: 'Straight-Arm Plank' },
      { movementId: 'side_plank', level: 3, tier: 'normal', label: 'Side Plank' }
    ]
  },
  {
    id: 'midline_core_ladder',
    name: 'Midline & Dynamic Core Progression',
    pattern: 'HINGE_CORE',
    description: 'Floor sit-ups progressing through tuck V-ups, hanging knee raises, strict toes-to-bar, and L-sits.',
    steps: [
      { movementId: 'situps', level: 1, tier: 'normal', label: 'AbMat / Butterfly Sit-Ups' },
      { movementId: 'tuck_ups', level: 2, tier: 'normal', label: 'Tuck-Ups' },
      { movementId: 'v_ups', level: 2, tier: 'normal', label: 'V-Ups' },
      { movementId: 'hanging_knee_raises', level: 3, tier: 'normal', label: 'Hanging Knee Raises' },
      { movementId: 'l_sit', level: 4, tier: 'hard', label: 'L-Sit Hold' },
      { movementId: 'toes_to_bar', level: 4, tier: 'hard', label: 'Toes-to-Bar (T2B)' }
    ]
  },
  {
    id: 'plyo_box_ladder',
    name: 'Plyometric Box Progression',
    pattern: 'FULL_BODY',
    description: 'Low-impact stepping progressing to explosive two-foot box jumps.',
    steps: [
      { movementId: 'box_step_ups', level: 1, tier: 'easy', label: 'Box Step-Ups' },
      { movementId: 'box_jumps', level: 2, tier: 'normal', label: 'Box Jumps (24/20 in)' }
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
  },
  {
    id: 'deadlift_hinge_ladder',
    name: 'Posterior Hinge & Deadlift Progression',
    pattern: 'HINGE_CORE',
    description: 'Single-kettlebell posterior hinge advancing to standard loaded barbell deadlifts.',
    steps: [
      { movementId: 'kb_deadlifts', level: 1, tier: 'normal', label: 'Kettlebell Deadlifts' },
      { movementId: 'bb_deadlifts', level: 2, tier: 'normal', label: 'Barbell Deadlifts (100/70 kg)' }
    ]
  },
  {
    id: 'thruster_ladder',
    name: 'Thruster & Squat-to-Overhead Progression',
    pattern: 'FULL_BODY',
    description: 'Dual dumbbell thrusters progressing to standard barbell thrusters.',
    steps: [
      { movementId: 'db_thrusters', level: 1, tier: 'normal', label: 'Dumbbell Thrusters (2x15/10 kg)' },
      { movementId: 'bb_thrusters', level: 2, tier: 'normal', label: 'Barbell Thrusters (43/30 kg)' }
    ]
  },
  {
    id: 'snatch_ladder',
    name: 'Snatch & Explosive Ground-to-Overhead',
    pattern: 'FULL_BODY',
    description: 'Kettlebell swings to single-arm snatches and full Olympic barbell squat snatches.',
    steps: [
      { movementId: 'kb_swings', level: 1, tier: 'normal', label: 'Kettlebell Swings' },
      { movementId: 'kb_snatch', level: 2, tier: 'normal', label: 'Alternating Kettlebell Snatches' },
      { movementId: 'bb_squat_snatch', level: 3, tier: 'hard', label: 'Barbell Squat Snatch' }
    ]
  },
  {
    id: 'overhead_press_ladder',
    name: 'Overhead Press Progression',
    pattern: 'PUSH',
    description: 'Dual dumbbell push press advancing to barbell push jerk / shoulder-to-overhead.',
    steps: [
      { movementId: 'db_push_press', level: 1, tier: 'normal', label: 'Dumbbell Push Press' },
      { movementId: 'bb_push_jerk', level: 2, tier: 'normal', label: 'Barbell Push Jerk / S2OH' }
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
   * only movements of the MAXIMUM allowed level on that ladder remain eligible for primary selection.
   *
   * This guarantees:
   * - Knee push-ups are never picked when Standard Push-Ups are allowed.
   * - Table rows/towel rows are never picked when Pull-Ups or Inverted Rows are allowed.
   * - Sprawls are never picked when Burpees are allowed.
   * - Box step-ups are never picked when Box Jumps are allowed.
   * - Single-unders are never picked when Double-Unders are allowed.
   */
  filterPoolToHardestLadderMovements(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return [];
    const poolIds = new Set(pool.map(m => m.id));
    const demotedIds = new Set();

    SCALE_LADDERS.forEach(ladder => {
      const activeSteps = ladder.steps.filter(s => poolIds.has(s.movementId));
      if (activeSteps.length <= 1) return;

      const maxLevel = Math.max(...activeSteps.map(s => s.level));
      activeSteps.forEach(s => {
        if (s.level < maxLevel) {
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
