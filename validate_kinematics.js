#!/usr/bin/env node
/**
 * WODFORGE Biomechanical Kinematics Validator (`validate_kinematics.js`)
 *
 * Imports `MOVEMENTS_DB` and `BiomechanicalStickAnimator` directly from modular source
 * and verifies across a 120-frame cycle (3800ms) for every movement:
 *   1. Every movement in `MOVEMENTS_DB` has a supported `poseType`.
 *   2. Rigid segment lengths never stretch or shrink:
 *      - Torso = 46px, Neck = 15px, Thigh = 32px, Shin = 32px, Upper Arm = 25px, Forearm = 24px.
 *   3. No joint, end-effector, torso, or head penetrates the floor (`floorY`) or plyo box (`box_jump`).
 *   4. Side-view knees never hyperextend backward (`cross(thigh, shin) >= -35`).
 *   5. Continuous joint trajectories (`C^0` continuity: no single-frame IK branch flips > 18px).
 *
 * Run with:
 *   node validate_kinematics.js
 */

import './src/data/movements.js';
import './src/animator/constants.js';
import './src/animator/math.js';
import './src/animator/poses.js';
import './src/animator/validator.js';
import './src/animator/renderer.js';
import './src/animator/animator.js';

const { MOVEMENTS_DB, BiomechanicalStickAnimator } = globalThis;

const uniquePoseTypes = [...new Set(MOVEMENTS_DB.map((m) => m.poseType))];

// Ensure no poseType silently falls through to default fallback
for (const pt of uniquePoseTypes) {
  const f = BiomechanicalStickAnimator.computePose(pt, 0);
  const hasRunTrack = f.props.some((p) => p.type === 'run_track');
  if (pt !== 'run' && hasRunTrack) {
    console.error(`  [FAIL] ${pt}: fell through to default fallback!`);
    process.exit(1);
  }
}

const report = BiomechanicalStickAnimator.validateAllPoses(uniquePoseTypes);

console.log(`WODFORGE Kinematics Audit:`);
console.log(`- Movements in MOVEMENTS_DB : ${MOVEMENTS_DB.length}`);
console.log(`- Unique poseTypes tested   : ${report.total}`);
console.log(`- Frames sampled per pose   : 120 (total ${report.total * 120} frames)`);
console.log(`- Passing poseTypes         : ${report.passed}/${report.total}`);

if (report.passed !== report.total) {
  for (const [pt, res] of Object.entries(report.results)) {
    if (!res.ok) {
      console.error(`  [FAIL] ${pt}:`, res.violations.slice(0, 5));
    }
  }
  process.exit(1);
}

console.log('ALL ANATOMICAL & KINEMATIC INVARIANTS PASSED (0 VIOLATIONS)!');
