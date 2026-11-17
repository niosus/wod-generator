#!/usr/bin/env node
/**
 * WODROLL Biomechanical Kinematics Validator (`validate_kinematics.js`)
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

import { MOVEMENTS_DB } from './src/data/movements.js';
import { BiomechanicalStickAnimator } from './src/animator/index.js';

const jsonMode = process.argv.includes('--json');
const uniquePoseTypes = [...new Set(MOVEMENTS_DB.map((m) => m.poseType))];

// Ensure no poseType silently falls through to default fallback
const fallbackFailures = [];
for (const pt of uniquePoseTypes) {
  const f = BiomechanicalStickAnimator.computePose(pt, 0);
  const hasRunTrack = f.props.some((p) => p.type === 'run_track');
  if (pt !== 'run' && hasRunTrack) {
    fallbackFailures.push(pt);
    if (!jsonMode) {
      console.error(`  [FAIL] ${pt}: fell through to default fallback!`);
    }
  }
}

const report = BiomechanicalStickAnimator.validateAllPoses(uniquePoseTypes);
const allOk = fallbackFailures.length === 0 && report.passed === report.total;

if (jsonMode) {
  console.log(JSON.stringify({
    movements: MOVEMENTS_DB.length,
    uniquePoseTypes: report.total,
    framesPerPose: 120,
    totalFrames: report.total * 120,
    passed: report.passed,
    total: report.total,
    fallbackFailures,
    ok: allOk
  }));
  if (!allOk) process.exit(1);
} else {
  if (fallbackFailures.length > 0) {
    process.exit(1);
  }

  console.log(`WODROLL Kinematics Audit:`);
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
}
