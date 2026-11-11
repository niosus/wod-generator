<div align="center">

# ⚡ WODFORGE v4

### Precision Biomechanical HIIT WOD Generator & 2D Skeletal Kinematics Engine

[![Live Demo](https://img.shields.io/badge/🚀_LAUNCH_APP-Live_on_GitHub_Pages-bef264?style=for-the-badge&labelColor=060a12&color=bef264)](https://niosus.github.io/wod-generator/)

[![Kinematics Audit](https://img.shields.io/badge/Kinematics_Audit-49%2F49_Passing-38bdf8?style=flat-square&logo=speedtest&logoColor=38bdf8&labelColor=0b1120)](https://github.com/niosus/wod-generator)
[![Architecture](https://img.shields.io/badge/Architecture-Native_ESM_(Zero_Build)-a3e635?style=flat-square&labelColor=0b1120)](https://github.com/niosus/wod-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square&labelColor=0b1120)](https://github.com/niosus/wod-generator/blob/main/LICENSE)

<br />

<p align="center">
  <b>Generate competition-grade CrossFit and HIIT workouts tailored precisely to your gear, skill level, and timeframe.</b><br />
  Featuring real-time multi-view stick-figure animations driven by pure 2-bone analytical inverse kinematics.
</p>

### 👉 [**Open Live App in Browser**](https://niosus.github.io/wod-generator/) 👈

<br />

---

</div>

## ✨ Key Capabilities

| Feature | Description |
| :--- | :--- |
| **⚡ Smart HIIT Solver** | Algorithmic generator producing balanced **AMRAP**, **EMOM**, **For Time** (including 21-15-9 couplets), and **Tabata/Intervals** protocols that prevent local muscle group interference. |
| **🦴 2D Skeletal Kinematics** | Real-time multi-view stick athlete animations powered by 2-bone analytic IK/FK solvers. Validated across 49 unique movements with 0 bone stretching, 0 floor penetration, and continuous joint trajectories. |
| **🛡️ Collision-Free Substitutions** | When equipment is marked *Optional*, the engine calculates smart alternatives that preserve movement patterns (e.g., Pull never maps to Push). |
| **📉 Built-In Progressions** | Every advanced gymnastics or weightlifting exercise features an authentic, non-colliding scale-down suggestion right on the workout card. |
| **📦 13-Item Granular Gear Matrix** | Precise 3-state control (**HAVE** / **OPTIONAL** / **OFF**) across Dumbbells, Barbell, Kettlebells, Pull-Up Bar, Rings, Plyo Box, Jump Rope, Wall Ball, and Ergs (Bike, Row, Ski). |
| **🔗 Zero-Backend Link Sharing** | Workouts serialize into ultra-compact URL hashes using native raw-deflate stream compression and URL-safe Base64. |
| **🏆 Benchmark Library** | One-click access to classical Hero and Benchmark workouts (*Murph, Cindy, Fran, Chelsea, Helen, DT, etc.*). |

---

## 🏗️ Architecture & Modular Structure

WODFORGE is architected around modern, native **ECMAScript Modules (ESM)** without requiring heavy bundlers or build steps. Every subsystem has a single, isolated responsibility:

```
wod-generator/
├── index.html                   # Semantic markup (~590 lines)
├── package.json                 # Node ESM configuration & test/start scripts
├── validate_kinematics.js       # Kinematic audit script (node validate_kinematics.js)
├── css/
│   └── styles.css               # Animations, micro-bumps, glow sweep, scrollbars & grid
├── js/
│   └── tailwind-config.js       # Tactical dark theme color tokens & fonts
└── src/
    ├── main.js                  # Application entry point & DOM bootstrap
    ├── data/                    # Domain databases
    │   ├── equipment.js         # 13-item granular equipment catalog
    │   ├── patterns.js          # Biomechanical movement patterns & color themes
    │   ├── movements.js         # 49 movements (equipment, difficulty, scale-down, cues)
    │   ├── benchmarks.js        # Classical Girl & Hero benchmark WODs
    │   ├── presets.js           # Equipment presets (Bodyweight, Minimal, Full Gym)
    │   └── index.js             # Barrel re-export
    ├── animator/                # 2D Biomechanical Kinematics Engine
    │   ├── constants.js         # Rigid segment invariants (Torso, Neck, Thigh, Shin, Arms)
    │   ├── math.js              # 2-Bone analytic IK/FK solvers, spline & smoothstep
    │   ├── poses.js             # Pure pose computation for all 49 movements
    │   ├── validator.js         # Invariant audit suite (sampling 120 frames/cycle)
    │   ├── renderer.js          # Multi-view 2D Canvas renderer & equipment props
    │   ├── animator.js          # Canvas registry, viewport culling & RAF loop
    │   └── index.js             # Barrel re-export
    ├── state/
    │   └── app-state.js         # State container, localStorage & collision-free resolvers
    ├── generator/
    │   └── workout-generator.js # HIIT scheme & rep solver (AMRAP, EMOM, For Time, Tabata)
    ├── sharing/
    │   └── workout-sharing.js   # CompressionStream/DecompressionStream & URL serialization
    └── ui/
        └── ui.js                # DOM renderers, interactive modals, toasts & event bindings
```

---

## 🚀 Quickstart & Development

### 1. Run Locally
Open `index.html` in any modern browser via a lightweight local server:

```bash
# Using npm
npm start

# Or using Python
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

### 2. Run Biomechanical Kinematics Audit
Sample every movement across a 120-frame cycle (5,880 frames total) to assert rigid bone invariants, floor/box non-penetration, and trajectory continuity:

```bash
npm test
# or
node validate_kinematics.js
```

---

## 🌐 Live Application

Experience the generator live in your browser:
👉 **[https://niosus.github.io/wod-generator/](https://niosus.github.io/wod-generator/)**

---

<div align="center">
  <sub>Built for athletes, coaches, and functional fitness enthusiasts. Released under the <a href="./LICENSE">MIT License</a>.</sub>
</div>
