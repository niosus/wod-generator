# WODROLL v4

<img src="./favicon.svg" align="right" width="84" height="84" hspace="16" alt="WODROLL Logo" />

**Precision Biomechanical HIIT WOD Generator**

Generate competition-grade CrossFit, Hyrox, and HIIT workouts tailored to your gear, skill level, and timeframe — powered by real-time multi-view stick-figure animations, collision-free scaling ladders, and compact URL &amp; PNG card sharing.

<br clear="both" />

[![Live App](https://img.shields.io/badge/LAUNCH_APP-Live_on_GitHub_Pages-38bdf8?style=for-the-badge&logo=vercel&logoColor=09090b&labelColor=09090b)](https://niosus.github.io/wod-generator/) [![Zero Build](https://img.shields.io/badge/Zero_Build-Static_HTML_%2B_JS-27272a?style=for-the-badge&labelColor=09090b)](./index.html) [![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge&labelColor=09090b)](./LICENSE)

[![Kinematics Audit](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fniosus%2Fwog-generator%2Fbadges%2Fkinematics.json&style=for-the-badge&labelColor=09090b)](https://github.com/niosus/wog-generator/actions/workflows/ci.yml) [![Movements](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fniosus%2Fwog-generator%2Fbadges%2Fmovements.json&style=for-the-badge&labelColor=09090b)](./src/data/movements.js) [![Benchmarks](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fniosus%2Fwog-generator%2Fbadges%2Fbenchmarks.json&style=for-the-badge&labelColor=09090b)](./src/data/benchmarks.js)

[**Open Live App in Browser**](https://niosus.github.io/wod-generator/) · [**Run Kinematics Audit**](#-2-run-biomechanical-kinematics-audit) · [**Explore Architecture**](#%EF%B8%8F-architecture--modular-structure)

---

## ✨ What WODROLL Does

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>⚡ Smart HIIT Solver &amp; Live Scaling</h3>
      <ul>
        <li><b>3 Programming Modes:</b> <i>Smart Mixed</i> (35% eligible classics + algorithmic), <i>Custom HIIT</i> (pure rules), and <i>Classics Only</i>.</li>
        <li><b>5 Formats:</b> <code>ANY</code>, <code>AMRAP</code>, <code>EMOM</code>, <code>FOR TIME</code> (including <code>21-15-9</code> &amp; <code>15-12-9</code> descending couplets), and <code>TABATA</code> intervals.</li>
        <li><b>3 Time Domains:</b> Sprint/Short (<code>8–12m</code>), Classic Metcon (<code>14–20m</code>), and Engine/Hyrox (<code>24–40m</code>).</li>
        <li><b>Post-Roll Intensity Toggle:</b> Switch between <b>Moderate</b>, <b>Standard</b>, and <b>High</b> directly on the WOD card to rescale reps, distances, calories, and Tabata splits in place.</li>
        <li><b>LRU Deduplication:</b> Remembers recent workouts in <code>localStorage</code> so consecutive rolls stay fresh.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🦴 2D Skeletal Kinematics Engine</h3>
      <ul>
        <li><b>85 Animated Movements:</b> Multi-view (side &amp; front) 2D Canvas stick athlete animations driven by 2-bone analytical IK/FK solvers, splines, and smoothstep keyframes.</li>
        <li><b>Audited Invariants:</b> Tested across <b>10,200 frames</b> (120 frames/cycle) for zero bone stretching, zero floor/box penetration, knee non-hyperextension, and <code>C⁰</code> continuity.</li>
        <li><b>Interactive Demo Modal:</b> Click any movement to inspect a larger live animation, biomechanical coaching cues, and scaling options.</li>
        <li><b>Movement Library:</b> Searchable browser for all 85 movements filtered by pattern, difficulty, or gear.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📦 14-Item Gear Matrix &amp; Ladders</h3>
      <ul>
        <li><b>3-State Equipment Control:</b> Toggle <b>HAVE</b>, <b>OPT</b>, or <b>OFF</b> across 14 items (Bodyweight/Floor, Running Area, Pull-Up Bar, Gymnastic Rings, Parallel/Dip Bars, Kettlebell, Dumbbells, Barbell &amp; Plates, BikeErg, RowErg, SkiErg, Jump Rope, Plyo Box, Wall Ball) plus <i>Bodyweight</i>, <i>Minimal</i>, and <i>Full Gym</i> presets.</li>
        <li><b>Collision-Free Substitutions:</b> <i>Optional</i> gear generates pattern-preserving alternatives with an inline <b>Swap</b> button.</li>
        <li><b>8 Scaling Ladders:</b> <code>ProgressionEngine</code> surfaces <b>Step X/Y</b> badges, one-click <b>Scale</b> buttons, and interactive progression switching without movement collisions.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🔗 Sharing, PNG Cards &amp; Classics</h3>
      <ul>
        <li><b>46 Benchmark WODs:</b> 21 Girls, 17 Hero WODs, 5 <i>Death By</i> EMOM challenges, and 3 Hyrox/signature workouts (<i>Murph, Cindy, Fran, Chelsea, Helen, DT, Nate, Chad</i>, etc.) with live search and <i>Ready With My Gear</i> filtering.</li>
        <li><b>Compact Binary URL Sharing:</b> Share exact workouts (<code>?wod=...</code>) or your full gear/filter setup (<code>?cfg=...</code>) with binary v2 encoding, <code>deflate-raw</code> fallback, and mobile Web Share API support.</li>
        <li><b>1080×1080 PNG Card Export:</b> Click <b>Copy</b> to render a crisp workout card image with 2D stick-figure thumbnails to your clipboard (with plain-text fallback).</li>
        <li><b>Adaptive Theme:</b> Light, Dark, and System <b>Auto</b> mode with zero-FOUC startup.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🎛️ Page Workflow at a Glance

1. **Lead With the Workout:** Opening the app immediately generates a tailored WOD card with live 2D thumbnails, rep/load badges, collapsible **Coach's Notes & Stimulus**, and inline **Scale** / **Swap** / **Progression** actions.
2. **Tune in Place or Rapidly Re-Roll:** Use the **Quick Setup** bar below the card (`Bodyweight` / `Minimal` / `Full Gym`, `~10m` / `~15m` / `25m+`, `Standard` / `Rx+`) or open **Tune** to customize all 14 gear items, format rules, and the 85-movement pool.
3. **Export Anywhere:** Copy a **1080×1080 PNG card**, share a compact `?wod=...` link, or bookmark/share your equipment setup with `?cfg=...`.

---

## 🏗️ Architecture & Modular Structure

WODROLL requires **no build step or bundler**. The browser app loads zero-build `<script>` modules directly into `globalThis` from `index.html` (paired with Tailwind CSS CDN and Lucide icons), while `package.json` (`"type": "module"`), `index.js` barrels, and `validate_kinematics.js` use native Node ESM for the kinematics test suite.

```text
wod-generator/
├── index.html                   # Single-page UI, Quick Setup bar & 4 interactive modals (811 lines)
├── favicon.svg                  # Adaptive light/dark lightning bolt icon
├── package.json                 # Node ESM configuration & test/start scripts
├── validate_kinematics.js       # Kinematic invariant audit script (85/85 poses, 10,200 frames)
├── css/
│   └── styles.css               # Dual-theme CSS variables, animations, scrollbars & grid backdrop
├── js/
│   └── tailwind-config.js       # Tailwind theme tokens, Inter & JetBrains Mono fonts
└── src/
    ├── main.js                  # Application entry point & DOM bootstrap
    ├── data/                    # Domain databases
    │   ├── equipment.js         # 14-item 3-state equipment catalog
    │   ├── patterns.js          # 6 biomechanical movement patterns & badge styles
    │   ├── movements.js         # 85 movements (equipment, difficulty, scale-downs, fallbacks, cues)
    │   ├── progressions.js      # 8 scaling ladders & ProgressionEngine
    │   ├── benchmarks.js        # 46 Girl, Hero, Hyrox, Signature & Death By WODs
    │   ├── presets.js           # Default states & Bodyweight / Minimal / Full Gym presets
    │   └── index.js             # ESM barrel re-export
    ├── animator/                # 2D Biomechanical Kinematics Engine
    │   ├── constants.js         # Rigid segment invariants (Torso, Neck, Thigh, Shin, Arms)
    │   ├── math.js              # 2-Bone analytic IK/FK solvers, splines & smoothstep
    │   ├── poses.js             # Pure pose computation for all 85 movements
    │   ├── validator.js         # Invariant audit suite (120 frames/cycle per pose)
    │   ├── renderer.js          # Multi-view 2D Canvas renderer & equipment props
    │   ├── animator.js          # Canvas registry, viewport culling & RAF loop
    │   └── index.js             # ESM barrel re-export
    ├── state/
    │   └── app-state.js         # State container, localStorage persistence & collision-free resolvers
    ├── generator/
    │   └── workout-generator.js # HIIT solver, dynamic rep/intensity scaling, naming & LRU dedup
    ├── sharing/
    │   └── workout-sharing.js   # Binary v2 / deflate-raw URL serialization (?wod & ?cfg) + PNG card renderer
    └── ui/
        └── ui.js                # DOM renderers, modals, clipboard/share actions, theme & event bindings
```

---

## 🚀 Quickstart & Development

### 1. Run Locally

Serve the repository over HTTP from any static server:

```bash
# Using npm
npm start

# Or using Python
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

### 2. Run Biomechanical Kinematics Audit

Sample all **85** movements across a 120-frame cycle (**10,200 frames total**) to assert rigid bone invariants, floor and plyo-box non-penetration, knee non-hyperextension, and `C⁰` trajectory continuity:

```bash
npm test
# or
node validate_kinematics.js
```

---

## 🌐 Live Application

Experience WODROLL live in your browser:
👉 **[https://niosus.github.io/wod-generator/](https://niosus.github.io/wod-generator/)**

---

<div align="center">
  <sub>Built for athletes, coaches, and functional fitness enthusiasts. Released under the <a href="./LICENSE">MIT License</a>.</sub>
</div>
