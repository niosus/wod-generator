---
name: animate-biomechanics
description: >-
  Physics, anatomical conventions, rendering z-order rules, and interactive
  visual reviewer workflow for WODROLL stick-figure animations. Use whenever
  creating or tuning poses in src/animator/poses.js, renderer props in
  src/animator/renderer.js, or presenting animations via HTML reviewers.
---

# WODROLL Biomechanical Animation & Visual Review

Follow these physics, anatomy, rendering, and reviewer parity rules whenever building or revising animations in `src/animator/`.

## Physics & Anatomy Standards

1. **Airborne Trajectories (No Mid-Air Pauses)**
   - Never use `smoothstep` keyframes across mid-air jump segments (`smoothstep` drops velocity to `0` at every knot, making the athlete pause awkwardly in mid-air).
   - Drive airborne horizontal position linearly (`lerp(x0, x1, f)`) paired with a continuous Newtonian parabolic vertical arc (`y - 4 * h * f * (1 - f)`), or a continuous `sampleSpline`.

2. **Ground Contact & No Floor Skating**
   - Keep stance feet pinned cleanly to fixed floor coordinates during stationary moves (e.g., `high_knees`, burpee feet, jump takeoffs) so feet never slide backward across the deck.
   - Seated floor exercises (e.g., Russian twists) must rest hips flush onto `floorY` (around `floorY - 3.5`, e.g., `midHY = 164.5` at `floorY = 168`) rather than floating above the line.
   - Lying prone positions (burpees, back extensions, wall walk start) should leave slight crisp clearance or rest intentionally above `floorY = 170` with elbows/hands grounded as appropriate, and keep heads (`headX + 9.5`) clear of props like `floor_barbell`.

3. **Joint Mechanics & Directionality**
   - **High Knees vs Butt Kicks:** Drive the swing ankle slightly *forward* beneath the raised knee (`ax = baseX + 16 * lift`) so 2-bone IK lifts the knee *above hip height* with the shin dangling cleanly below, rather than pulling the ankle backward toward the glutes.
   - **Burpee Recovery:** Lower flat/near-flat on the deck, pause briefly if styled, then peel/lever the chest up first while hips stay low before popping the hips up onto toes and snapping feet forward—avoid stiff simultaneous push-up rises, and watch knee `solveIK` downward bends on sprawl/snap transitions (`dist` near `64px` prevents knees from dipping below `floorY`).
   - **Held Implements:** Lock prop angles to forearm/hand angles (`angle: fa` or `twist * ...`) so props rotate naturally with the grip instead of sliding across hands. Check elbow `bendSide` sign carefully when hands drive downward (`med_ball_slam`).

4. **Front-View Z-Ordering (`src/animator/renderer.js`)**
   - In `front` view (`renderFrame`), layer order is: `frontTorso` -> `backArms` -> `props` with `behindLegs: true` -> `frontLegs` -> `frontArms` -> `head`.
   - For seated front-view held implements (Russian twists with med ball, kettlebell, or dumbbell), set `midground: true, behindLegs: true` on the prop and place arms in `backArms` (`zOrder < 0`) so legs render in front of the implement and the implement renders in front of the hands holding it.

## Interactive Visual Reviewer Workflow (`<agent-embed>`)

When presenting animations in chat for user review:
1. Write a self-contained HTML reviewer to the artifact directory using a **fresh versioned filename** on every iteration (e.g., `batchN-rK-reviewer.html`) to bypass webview caching.
2. Include **only remaining/unapproved movements** on follow-up rounds once earlier ones are marked good.
3. Copy `constants.js`, `math.js`, `renderer.js`, and `computePose` logic verbatim from `src/animator/`.
4. Run BOTH verification checks before replying:
   - `npm test && npm run build` (`validate_kinematics.js`: `0` violations across 120 frames/pose).
   - A 500-frame Node parity sweep verifying `JSON.stringify(appFrame) === JSON.stringify(reviewerFrame)` (`mismatches = 0`) and finite canvas draw arguments for every movement in the reviewer.
