#!/usr/bin/env node
/**
 * WODFORGE Biomechanical Kinematics Validator (`validate_kinematics.js`)
 *
 * Extracts `MOVEMENTS_DB` and `BiomechanicalStickAnimator` directly from `index.html`
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

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dbMatch = html.match(/const MOVEMENTS_DB = (\[[\s\S]*?\n    \]);/);
const animMatch = html.match(/const BiomechanicalStickAnimator = \(\(\) => \{[\s\S]*?\n    \}\)\(\);/);

if (!dbMatch || !animMatch) {
  console.error('Failed to extract MOVEMENTS_DB or BiomechanicalStickAnimator from index.html');
  process.exit(1);
}

const sandbox = {
  console,
  Math,
  Map,
  Set,
  requestAnimationFrame: () => 1,
  document: { body: { contains: () => false } }
};

vm.createContext(sandbox);
vm.runInContext(
  `${dbMatch[0]}\n${animMatch[0]}\nglobalThis.MOVEMENTS_DB = MOVEMENTS_DB;\nglobalThis.BiomechanicalStickAnimator = BiomechanicalStickAnimator;`,
  sandbox
);

const { MOVEMENTS_DB, BiomechanicalStickAnimator } = sandbox;
const uniquePoseTypes = [...new Set(MOVEMENTS_DB.map((m) => m.poseType))];

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

