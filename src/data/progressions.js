import { MOVEMENTS_DB } from './movements.js';

/**
 * 2-Axis Movement Graph & Progression Clusters
 *
 * 1) Vertical axis (`scaleDownId` on MOVEMENTS_DB):
 *    Directed harder -> easier scaling edges (used for Scale-Downs, Progress-To, and regression suppression).
 * 2) Lateral axis (`MOVEMENT_PEER_GROUPS`):
 *    Undirected peer groups of similar complexity across different equipment
 *    (used for missing/optional gear alternatives and cross-gear scale resolution).
 * 3) Suppression rules (`REGRESSION_RULES`):
 *    Explicitly marks scale-down-only movements and lists which higher movements suppress them.
 */

const MOVEMENT_PEER_GROUPS = [
  { id: 'muscle_up', name: 'Muscle-Up', movementIds: ['bar_muscle_up', 'ring_muscle_up'] },
  { id: 'vertical_pull', name: 'Strict Pull-Up / Chin-Up', movementIds: ['pullups', 'chin_ups', 'ring_pullups'] },
  { id: 'bar_hang', name: 'Bar Hangs', exclusiveInWod: true, movementIds: ['bar_hang', 'active_bar_hang'] },
  { id: 'inverted_row', name: 'Inverted Row', movementIds: ['ring_rows', 'bar_inverted_rows', 'table_rows'] },
  { id: 'dips', name: 'Supported Dips', movementIds: ['ring_dips', 'parallel_bar_dips'] },
  { id: 'bench_dips', name: 'Box / Couch Tricep Dips', movementIds: ['box_dips', 'couch_dips'] },
  { id: 'elevated_pike_pushup', name: 'Elevated Pike Push-Ups', movementIds: ['box_pike_pushups', 'couch_pike_pushups'] },
  { id: 'elevated_pushup', name: 'Elevated / Deficit Push-Ups', movementIds: ['ring_pushups', 'pbar_pushups', 'box_decline_pushups'] },
  { id: 'floor_pushup', name: 'Floor Push-Up Variations', movementIds: ['pushups', 'hand_release_pushups', 'diamond_pushups'] },
  { id: 'strict_press', name: 'Strict Overhead Press', movementIds: ['bb_strict_press', 'db_strict_press', 'kb_strict_press'] },
  { id: 'push_press', name: 'Push Press', movementIds: ['bb_push_press', 'db_push_press', 'kb_push_press'] },
  { id: 'push_jerk', name: 'Push Jerk', movementIds: ['bb_push_jerk', 'db_push_jerk', 'kb_push_jerk'] },
  { id: 'bent_row', name: 'Bent-Over Row', movementIds: ['bb_bent_row', 'db_renegade_row', 'kb_bent_row'] },
  { id: 'loaded_squat', name: 'Loaded Squat', movementIds: ['bb_front_squats', 'bb_back_squat', 'db_front_squats', 'goblet_squats'] },
  { id: 'overhead_squat', name: 'Overhead Squat', movementIds: ['bb_overhead_squat', 'db_overhead_squat', 'kb_overhead_squat'] },
  { id: 'loaded_lunge', name: 'Loaded Lunge', movementIds: ['bb_front_rack_lunges', 'db_walking_lunges', 'kb_rack_lunges'] },
  { id: 'loaded_split_squat', name: 'Loaded Bulgarian Split Squat', movementIds: ['bb_bulgarian_split_squats', 'db_bulgarian_split_squats', 'kb_bulgarian_split_squats'] },
  { id: 'deadlift', name: 'Deadlift', movementIds: ['bb_deadlifts', 'db_deadlifts', 'kb_deadlifts'] },
  { id: 'rdl', name: 'Romanian Deadlift (RDL)', movementIds: ['bb_rdl', 'db_rdl', 'kb_rdl'] },
  { id: 'rfe_rdl', name: 'Single-Leg RFE RDL', movementIds: ['bb_rfe_rdl', 'db_rfe_rdl', 'kb_rfe_rdl'] },
  { id: 'hang_power_clean', name: 'Hang Power Clean', movementIds: ['bb_hang_power_clean', 'db_hang_power_clean', 'kb_hang_power_clean'] },
  { id: 'power_clean', name: 'Floor Power Clean', movementIds: ['bb_power_clean', 'db_power_clean', 'kb_clean'] },
  { id: 'clean_and_jerk', name: 'Clean & Jerk', movementIds: ['bb_clean_and_jerk', 'db_clean_and_jerk', 'kb_clean_and_jerk'] },
  { id: 'snatch', name: 'Snatch', movementIds: ['bb_power_snatch', 'db_snatch', 'kb_snatch'] },
  { id: 'thruster', name: 'Thruster', movementIds: ['bb_thrusters', 'db_thrusters', 'kb_thrusters'] },
  { id: 'turkish_getup', name: 'Turkish Get-Up', movementIds: ['kb_turkish_getup', 'db_turkish_getup'] },
  { id: 'sdhp', name: 'Sumo Deadlift High Pull', movementIds: ['bb_sdhp', 'kb_sdhp'] },
  { id: 'leg_raise', name: 'Suspended Leg Raises', movementIds: ['ring_leg_raises', 'hanging_leg_raises', 'pbar_leg_raises'] },
  { id: 'knee_raise', name: 'Suspended Knee Raises', movementIds: ['hanging_knee_raises', 'ring_knee_raises', 'pbar_knee_raises'] },
  { id: 'l_sit', name: 'L-Sit Hold', movementIds: ['l_sit', 'pbar_l_sit'] },
  { id: 'twists', name: 'Twists', exclusiveInWod: true, movementIds: ['twists', 'med_ball_twists', 'kb_twists', 'db_twists'] },
  { id: 'situp', name: 'Sit-Ups', exclusiveInWod: true, movementIds: ['situps', 'med_ball_situps'] },
  { id: 'plank_var', name: 'Plank Variations', movementIds: ['plank_up_downs', 'plank_shoulder_taps', 'straight_arm_plank', 'side_plank'] },
  { id: 'support_hold', name: 'Support Hold', movementIds: ['ring_support_hold', 'pbar_support_hold'] },
  { id: 'overhead_carry', name: 'Overhead Carry', movementIds: ['kb_overhead_carry', 'db_overhead_carry'] },
  { id: 'farmers_carry', name: "Farmer's Carry", movementIds: ['db_farmers_carry', 'kb_farmers_carry'] },
  { id: 'suitcase_carry', name: 'Suitcase Carry', movementIds: ['kb_suitcase_carry', 'db_suitcase_carry'] },
  { id: 'erg_cal', name: 'Erg Calories', movementIds: ['bike_erg_cal', 'row_erg_cal', 'ski_erg_cal'] },
  { id: 'erg_meters', name: 'Run & Erg Distance', movementIds: ['run', 'row_erg_meters', 'bike_erg_meters', 'ski_erg_meters'] }
];

/**
 * Purely scale-down movements and the higher-level movements that suppress them
 * during algorithmic workout generation.
 */
const REGRESSION_RULES = {
  knee_pushups: ['pushups', 'hand_release_pushups', 'diamond_pushups', 'pike_pushups', 'ring_pushups', 'pbar_pushups', 'box_decline_pushups', 'parallel_bar_dips', 'ring_dips'],
  box_dips: ['pushups', 'parallel_bar_dips', 'ring_dips', 'box_decline_pushups', 'pbar_pushups', 'ring_pushups'],
  couch_dips: ['pushups', 'parallel_bar_dips', 'ring_dips', 'box_decline_pushups', 'pbar_pushups', 'ring_pushups'],
  ring_rows: ['pullups', 'chin_ups', 'ring_pullups', 'chest_to_bar', 'bar_muscle_up', 'ring_muscle_up'],
  bar_inverted_rows: ['pullups', 'chin_ups', 'ring_pullups', 'chest_to_bar', 'bar_muscle_up', 'ring_muscle_up'],
  table_rows: ['ring_rows', 'bar_inverted_rows', 'pullups', 'chin_ups', 'ring_pullups', 'chest_to_bar', 'bar_muscle_up', 'ring_muscle_up'],
  doorway_towel_rows: ['table_rows', 'ring_rows', 'bar_inverted_rows', 'pullups', 'chin_ups', 'ring_pullups', 'chest_to_bar', 'bar_muscle_up', 'ring_muscle_up'],
  superman_pulls: ['doorway_towel_rows', 'table_rows', 'ring_rows', 'bar_inverted_rows', 'pullups', 'chin_ups', 'ring_pullups', 'chest_to_bar', 'bar_muscle_up', 'ring_muscle_up'],
  athletic_up_downs: ['burpees', 'bar_facing_burpees', 'devil_press', 'man_makers'],
  knee_plank: ['plank', 'straight_arm_plank', 'side_plank', 'plank_shoulder_taps', 'plank_up_downs'],
  tuck_ups: ['v_ups', 'hanging_knee_raises', 'ring_knee_raises', 'pbar_knee_raises', 'pbar_leg_raises', 'hanging_leg_raises', 'ring_leg_raises', 'knees_to_elbows', 'toes_to_bar'],
  hanging_knee_raises: ['hanging_leg_raises', 'ring_leg_raises', 'pbar_leg_raises', 'knees_to_elbows', 'toes_to_bar', 'l_sit', 'pbar_l_sit'],
  ring_knee_raises: ['ring_leg_raises', 'hanging_leg_raises', 'pbar_leg_raises', 'knees_to_elbows', 'toes_to_bar', 'l_sit', 'pbar_l_sit'],
  pbar_knee_raises: ['pbar_leg_raises', 'hanging_leg_raises', 'ring_leg_raises', 'pbar_l_sit', 'l_sit'],
  box_step_ups: ['box_jumps', 'box_jump_overs']
};

/**
 * Tiered Progression Clusters ordered Top-to-Bottom (Hardest -> Scale-Downs).
 * `nodes` within a tier can be a movementId string or `{ peerGroup: '<groupId>' }`.
 */
const RAW_CLUSTERS = [
  {
    id: 'pushup_ladder',
    name: 'Bodyweight & Gymnastics Push',
    pattern: 'PUSH',
    description: 'Inverted HSPU scaling down through box pike and pike push-ups, supported dips to box tricep dips, elevated/floor push-up variations, and knee push-ups.',
    tiers: [
      { label: 'Elite Inverted', nodes: ['hspu'] },
      { label: 'Box Pike & Dips', nodes: [{ peerGroup: 'elevated_pike_pushup' }, { peerGroup: 'dips' }] },
      { label: 'Pike & Box Dips', nodes: ['pike_pushups', { peerGroup: 'bench_dips' }] },
      { label: 'Elevated / Deficit Push-Ups', nodes: [{ peerGroup: 'elevated_pushup' }] },
      { label: 'Push-Up Variations', nodes: [{ peerGroup: 'floor_pushup' }] },
      { label: 'Scale-Down', nodes: ['knee_pushups'] }
    ]
  },
  {
    id: 'overhead_press_ladder',
    name: 'Loaded Overhead Press & Jerk',
    pattern: 'PUSH',
    description: 'Push jerk, strict press, and push press with lateral gear swaps (scale by weight; Pike Push-Ups is the no-gear alternative).',
    tiers: [
      { label: 'Overhead Press & Jerk', nodes: [{ peerGroup: 'push_jerk' }, { peerGroup: 'strict_press' }, { peerGroup: 'push_press' }] }
    ]
  },
  {
    id: 'pull_ladder',
    name: 'Pull-Up, Chin-Up & Row',
    pattern: 'PULL',
    description: 'Muscle-ups scaling down through chest-to-bar pull-ups, vertical pull-ups/chin-ups, inverted rows, and doorway/floor regressions.',
    tiers: [
      { label: 'Muscle-Up', nodes: [{ peerGroup: 'muscle_up' }] },
      { label: 'High Bar Pull', nodes: ['chest_to_bar'] },
      { label: 'Vertical Pull-Up & Renegade Row', nodes: [{ peerGroup: 'vertical_pull' }, 'db_plank_renegade_row', { peerGroup: 'bar_hang' }] },
      { label: 'Inverted & Bent-Over Rows', nodes: [{ peerGroup: 'inverted_row' }, { peerGroup: 'bent_row' }] },
      { label: 'Home Row Scale-Downs', nodes: ['doorway_towel_rows', 'superman_pulls'] }
    ]
  },
  {
    id: 'squat_lunge_ladder',
    name: 'Bodyweight Squat & Lunge',
    pattern: 'SQUAT',
    description: 'Single-leg pistols scaling down through jumping, walking, and step-back lunges, split/cossack squats, plyo squats, and air squats.',
    tiers: [
      { label: 'Single-Leg Pistol', nodes: ['pistol_squats'] },
      { label: 'Plyo & Broad Jump', nodes: ['jumping_lunges', 'broad_jumps'] },
      { label: 'Bodyweight Unilateral & Jump Squat', nodes: ['walking_lunges', 'bulgarian_split_squats', 'jump_squats'] },
      { label: 'Step-Back Lunge, Cossack & Wall Sit', nodes: ['step_back_lunges', 'cossack_squats', 'wall_sit'] },
      { label: 'Foundational Squat', nodes: ['air_squats'] }
    ]
  },
  {
    id: 'loaded_squat_hinge_ladder',
    name: 'Weighted Squat, Lunge & Thruster',
    pattern: 'SQUAT',
    description: 'Independent barbell, dumbbell, and kettlebell squat and thruster equipment-swap groups (scale by weight).',
    tiers: [
      { label: 'Thruster & Overhead Squat', nodes: [{ peerGroup: 'thruster' }, { peerGroup: 'overhead_squat' }] },
      { label: 'Loaded Squat, Lunge & Split Squat', nodes: [{ peerGroup: 'loaded_squat' }, { peerGroup: 'loaded_lunge' }, { peerGroup: 'loaded_split_squat' }] }
    ]
  },
  {
    id: 'midline_core_ladder',
    name: 'Core, Planks & Carries',
    pattern: 'HINGE_CORE',
    description: 'Toes-to-bar and L-sits scaling down through suspended leg/knee raises, V-ups, tuck-ups, and sit-ups, alongside planks, support holds, hollow holds, twists, bear crawls, and carries.',
    tiers: [
      { label: 'Toes-to-Bar, L-Sit & Ring Rollout', nodes: ['toes_to_bar', { peerGroup: 'l_sit' }, 'ring_fallouts', { peerGroup: 'support_hold' }, { peerGroup: 'overhead_carry' }] },
      { label: 'Knees-to-Elbows, Leg Raises & Carry', nodes: ['knees_to_elbows', { peerGroup: 'leg_raise' }, { peerGroup: 'farmers_carry' }] },
      { label: 'Suspended Knee Raises, Plank Var & Carry', nodes: [{ peerGroup: 'knee_raise' }, { peerGroup: 'plank_var' }, { peerGroup: 'suitcase_carry' }] },
      { label: 'Dynamic Core, Plank & Bear Crawl', nodes: ['v_ups', 'hollow_rocks', 'plank', 'bear_crawls'] },
      { label: 'Floor Scale-Downs, Hollow & Twists', nodes: ['tuck_ups', { peerGroup: 'situp' }, 'hollow_hold', { peerGroup: 'twists' }, 'knee_plank'] }
    ]
  },
  {
    id: 'posterior_hinge_ladder',
    name: 'Deadlift & Posterior Hinge',
    pattern: 'HINGE_CORE',
    description: 'Independent barbell, dumbbell, and kettlebell hinge groups (scale by weight), plus bodyweight RFE RDL and back extensions to glute bridges.',
    tiers: [
      { label: 'Weighted Hinge & RFE RDL', nodes: [{ peerGroup: 'rfe_rdl' }, 'bb_good_morning', 'bb_hip_thrust', { peerGroup: 'rdl' }, { peerGroup: 'deadlift' }] },
      { label: 'Bodyweight Hinge', nodes: ['rfe_rdl', 'back_extensions'] },
      { label: 'Glute Bridge Base', nodes: ['glute_bridges'] }
    ]
  },
  {
    id: 'olympic_clean_ladder',
    name: 'Olympic & Explosive Lifts',
    pattern: 'FULL_BODY',
    description: 'Independent barbell, dumbbell, and kettlebell Olympic lifts, SDHP, and kettlebell swings (scale by weight; swap laterally across gear).',
    tiers: [
      { label: 'Squat Lifts & Clean & Jerk', nodes: ['bb_squat_snatch', 'bb_squat_clean', { peerGroup: 'clean_and_jerk' }] },
      { label: 'Power Clean, Snatch & Hang Clean', nodes: [{ peerGroup: 'power_clean' }, { peerGroup: 'snatch' }, { peerGroup: 'hang_power_clean' }] },
      { label: 'SDHP & Kettlebell Swings', nodes: [{ peerGroup: 'sdhp' }, 'kb_swings'] }
    ]
  },
  {
    id: 'burpee_ladder',
    name: 'Full-Body Conditioning & Get-Ups',
    pattern: 'FULL_BODY',
    description: 'Independent loaded conditioning (man makers, devil press, Turkish get-ups), plus burpees, bar-facing burpees, and med-ball scale-downs.',
    tiers: [
      { label: 'Loaded Conditioning & Wall Walks', nodes: ['man_makers', 'devil_press', { peerGroup: 'turkish_getup' }, 'wall_walks'] },
      { label: 'Bar-Facing Burpees', nodes: ['bar_facing_burpees'] },
      { label: 'Burpees, Slams & Wall Ball', nodes: ['burpees', 'med_ball_slams', 'wall_balls', 'med_ball_cleans'] },
      { label: 'Scale-Down Base', nodes: ['athletic_up_downs'] }
    ]
  },
  {
    id: 'plyo_box_ladder',
    name: 'Plyometric Box',
    pattern: 'FULL_BODY',
    description: 'Box jump-overs scaling down to two-foot box jumps and low-impact alternating box step-ups.',
    tiers: [
      { label: 'Box Jump-Over', nodes: ['box_jump_overs'] },
      { label: 'Box Jump', nodes: ['box_jumps'] },
      { label: 'Scale-Down', nodes: ['box_step_ups'] }
    ]
  },
  {
    id: 'jump_rope_ladder',
    name: 'Cardio, Jump Rope & Ergs',
    pattern: 'CARDIO',
    description: 'Double-unders, single-unders, bodyweight cardio, and ergs with lateral machine swaps and floor scale-downs.',
    tiers: [
      { label: 'High-Skill / High-Output', nodes: ['double_unders', 'mountain_climbers', { peerGroup: 'erg_cal' }] },
      { label: 'Standard Rhythm & Distance', nodes: ['single_unders', 'high_knees', { peerGroup: 'erg_meters' }] },
      { label: 'Floor Cardio Base', nodes: ['jumping_jacks'] }
    ]
  }
];

const movById = new Map(MOVEMENTS_DB.map(m => [m.id, m]));
const peerGroupById = new Map(MOVEMENT_PEER_GROUPS.map(g => [g.id, g]));
const peerGroupByMovementId = new Map();
MOVEMENT_PEER_GROUPS.forEach(group => {
  group.movementIds.forEach(id => {
    if (!peerGroupByMovementId.has(id)) {
      peerGroupByMovementId.set(id, group);
    }
  });
});

// Precompute vertical parents (who scales down directly to `movementId`)
const verticalParentsMap = new Map();
MOVEMENTS_DB.forEach(mov => {
  if (!mov.scaleDownId) return;
  if (!verticalParentsMap.has(mov.scaleDownId)) {
    verticalParentsMap.set(mov.scaleDownId, []);
  }
  verticalParentsMap.get(mov.scaleDownId).push(mov.id);
});

/**
 * Enrich each cluster with normalized tiers and derived `steps` (easiest -> hardest)
 * directly from MOVEMENTS_DB so labels/tiers never drift out of sync.
 */
const SCALE_LADDERS = RAW_CLUSTERS.map(cluster => {
  const totalTiers = cluster.tiers.length;
  const enrichedTiers = cluster.tiers.map((tier, idx) => {
    const level = totalTiers - idx; // Top tier = highest level, bottom tier = level 1
    const items = tier.nodes.map(node => {
      if (typeof node === 'string') {
        return { type: 'node', movementId: node };
      }
      const group = peerGroupById.get(node.peerGroup);
      return {
        type: 'peerGroup',
        peerGroupId: node.peerGroup,
        groupName: group ? group.name : node.peerGroup,
        movementIds: group ? [...group.movementIds] : []
      };
    });
    return {
      level,
      label: tier.label,
      items
    };
  });

  // Flatten easiest -> hardest (`steps`) for backwards compatibility with step indicators
  const seen = new Set();
  const steps = [];
  for (let i = enrichedTiers.length - 1; i >= 0; i--) {
    const t = enrichedTiers[i];
    for (const item of t.items) {
      const ids = item.type === 'peerGroup' ? item.movementIds : [item.movementId];
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const mov = movById.get(id);
        steps.push({
          movementId: id,
          level: t.level,
          tier: mov ? mov.difficulty : 'normal',
          regression: Boolean(REGRESSION_RULES[id]),
          label: mov ? mov.name : id
        });
      }
    }
  }

  return {
    ...cluster,
    tiers: enrichedTiers,
    steps
  };
});

const ProgressionEngine = {
  getLadders() {
    return SCALE_LADDERS;
  },

  getClusters() {
    return SCALE_LADDERS;
  },

  getLadderById(id) {
    return SCALE_LADDERS.find(l => l.id === id);
  },

  getPeerGroups() {
    return MOVEMENT_PEER_GROUPS;
  },

  getPeerGroupForMovement(movementId) {
    return peerGroupByMovementId.get(movementId) || null;
  },

  getLateralPeers(movementId) {
    const group = peerGroupByMovementId.get(movementId);
    if (!group) return [];
    return group.movementIds.filter(id => id !== movementId);
  },

  getExclusiveFamily(movementId) {
    const group = peerGroupByMovementId.get(movementId);
    if (group && group.exclusiveInWod) return group.id;
    if (movementId === 'pbar_knee_raises' || movementId === 'pbar_leg_raises') return 'pbar_raise';
    return null;
  },

  getVerticalParents(movementId) {
    return [...(verticalParentsMap.get(movementId) || [])];
  },

  getScaleDownChain(movementId, maxHops = 6) {
    const chain = [];
    const visited = new Set([movementId]);
    let cursor = movById.get(movementId);
    for (let hop = 0; hop < maxHops && cursor && cursor.scaleDownId; hop++) {
      const nextId = cursor.scaleDownId;
      if (visited.has(nextId)) break;
      visited.add(nextId);
      const nextMov = movById.get(nextId);
      if (!nextMov) break;
      chain.push(nextId);
      cursor = nextMov;
    }
    return chain;
  },

  /**
   * Returns true if the movement is a scale-down-only regression.
   */
  isRegressionMovement(movementId) {
    return Boolean(REGRESSION_RULES[movementId]);
  },

  /**
   * Returns all clusters/ladders that include the specified movementId.
   */
  getLaddersForMovement(movementId) {
    return SCALE_LADDERS.filter(ladder =>
      ladder.steps.some(s => s.movementId === movementId)
    );
  },

  /**
   * Returns the tier number (1 = bottom, totalTiers = top) for a movement within a cluster.
   */
  getMovementTierInCluster(cluster, movementId) {
    if (!cluster || !Array.isArray(cluster.tiers)) return null;
    for (const tier of cluster.tiers) {
      const hasMov = tier.items.some(item =>
        item.type === 'peerGroup' ? item.movementIds.includes(movementId) : item.movementId === movementId
      );
      if (hasMov) return tier.level;
    }
    return null;
  },

  /**
   * Finds the hardest allowed movement on a given ladder among the activePool.
   */
  getHardestAllowedStep(ladder, activePool) {
    if (!ladder || !Array.isArray(ladder.steps) || !Array.isArray(activePool)) return null;
    const activeIds = new Set(activePool.map(m => m.id));
    const matchingSteps = ladder.steps.filter(s => activeIds.has(s.movementId));
    if (matchingSteps.length === 0) return null;

    matchingSteps.sort((a, b) => b.level - a.level);
    return matchingSteps[0];
  },

  /**
   * Suppresses regression-only movements (`REGRESSION_RULES`) whenever any of their
   * designated higher movements are active in `pool`, while keeping all standalone
   * movements eligible regardless of tier.
   */
  filterPoolToHardestLadderMovements(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return [];
    const poolIds = new Set(pool.map(m => m.id));
    const demotedIds = new Set();

    Object.entries(REGRESSION_RULES).forEach(([regId, suppressedByIds]) => {
      if (!poolIds.has(regId)) return;
      if (suppressedByIds.some(higherId => poolIds.has(higherId))) {
        demotedIds.add(regId);
      }
    });

    const result = pool.filter(m => !demotedIds.has(m.id));
    return result.length > 0 ? result : pool;
  }
};

globalThis.MOVEMENT_PEER_GROUPS = MOVEMENT_PEER_GROUPS;
globalThis.REGRESSION_RULES = REGRESSION_RULES;
globalThis.SCALE_LADDERS = SCALE_LADDERS;
globalThis.ProgressionEngine = ProgressionEngine;
export { MOVEMENT_PEER_GROUPS, REGRESSION_RULES, SCALE_LADDERS, ProgressionEngine };
