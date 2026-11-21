import { MOVEMENTS_DB, EQUIPMENT_CATALOG, PATTERNS, ProgressionEngine } from '../data/index.js';
import { AppState } from '../state/app-state.js';
import { BiomechanicalStickAnimator } from '../animator/index.js';

/**
 * Single-Stack Progression Tree View + Cross-Stack Portals
 *
 * - Displays ONE focused stack tree at a time (6–13 blocks), fitted cleanly to the viewport.
 * - Equipment-equivalent movements are grouped into dashed Peer Blocks (`↔`).
 * - Blue directed SVG arrows only connect blocks within the active tree (zero cross-map wires).
 * - Cross-stack scale-downs render as clickable Portal Pills (`↓ Target ↗`) that jump to the target tree.
 */

const BLOCK_W = 192;
const SINGLE_H = 102;
const GROUP_HEADER_H = 26;
const GROUP_ITEM_H = 34;
const GROUP_PAD_BOTTOM = 8;
const PORTAL_H = 24;
const COL_GAP = 42;
const ROW_GAP = 54;
const WORLD_PAD_X = 48;
const WORLD_PAD_Y = 54;

const GROUP_BLOCKS = {
  // Push
  dips: { label: 'Supported Dips', movementIds: ['ring_dips', 'parallel_bar_dips'] },
  bench_dips: { label: 'Box / Couch Dips', movementIds: ['box_dips', 'couch_dips'] },
  elevated_pike_pushup: { label: 'Elevated Pike Push-Ups', movementIds: ['box_pike_pushups', 'couch_pike_pushups'] },
  elevated_pushup: { label: 'Elevated Push-Ups', movementIds: ['ring_pushups', 'pbar_pushups', 'box_decline_pushups'] },
  pushup_var: { label: 'Push-Up Variations', movementIds: ['diamond_pushups', 'hand_release_pushups', 'pushups'] },
  push_jerk: { label: 'Push Jerk', movementIds: ['bb_push_jerk', 'db_push_jerk', 'kb_push_jerk'] },
  strict_press: { label: 'Strict Press', movementIds: ['bb_strict_press', 'db_strict_press', 'kb_strict_press'] },
  push_press: { label: 'Push Press', movementIds: ['bb_push_press', 'db_push_press', 'kb_push_press'] },
  // Pull
  muscle_up: { label: 'Muscle-Up', movementIds: ['ring_muscle_up', 'bar_muscle_up'] },
  vertical_pull: { label: 'Pull-Ups & Chin-Ups', movementIds: ['ring_pullups', 'pullups', 'chin_ups'] },
  bar_hang: { label: 'Bar Hangs', movementIds: ['active_bar_hang', 'bar_hang'] },
  inverted_row: { label: 'Inverted Rows', movementIds: ['ring_rows', 'bar_inverted_rows', 'table_rows'] },
  bent_row: { label: 'Bent-Over Rows', movementIds: ['bb_bent_row', 'db_renegade_row', 'kb_bent_row'] },
  // Squat
  overhead_squat: { label: 'Overhead Squat', movementIds: ['bb_overhead_squat', 'db_overhead_squat', 'kb_overhead_squat'] },
  loaded_squat: { label: 'Loaded Squat', movementIds: ['bb_front_squats', 'bb_back_squat', 'db_front_squats', 'goblet_squats'] },
  loaded_lunge: { label: 'Loaded Lunge', movementIds: ['bb_front_rack_lunges', 'kb_rack_lunges', 'db_walking_lunges'] },
  loaded_split_squat: { label: 'Loaded Split Squat', movementIds: ['bb_bulgarian_split_squats', 'db_bulgarian_split_squats', 'kb_bulgarian_split_squats'] },
  // Hinge & Olympic
  clean_and_jerk: { label: 'Clean & Jerk', movementIds: ['bb_clean_and_jerk', 'db_clean_and_jerk', 'kb_clean_and_jerk'] },
  power_clean: { label: 'Power Clean', movementIds: ['bb_power_clean', 'db_power_clean', 'kb_clean'] },
  hang_power_clean: { label: 'Hang Power Clean', movementIds: ['bb_hang_power_clean', 'db_hang_power_clean', 'kb_hang_power_clean'] },
  deadlift: { label: 'Deadlift', movementIds: ['bb_deadlifts', 'db_deadlifts', 'kb_deadlifts'] },
  rdl: { label: 'Romanian Deadlift', movementIds: ['bb_rdl', 'db_rdl', 'kb_rdl'] },
  rfe_rdl: { label: 'RFE Single-Leg RDL', movementIds: ['bb_rfe_rdl', 'db_rfe_rdl', 'kb_rfe_rdl'] },
  turkish_getup: { label: 'Turkish Get-Up', movementIds: ['kb_turkish_getup', 'db_turkish_getup'] },
  snatch: { label: 'Snatch', movementIds: ['bb_power_snatch', 'db_snatch', 'kb_snatch'] },
  thruster: { label: 'Thruster', movementIds: ['bb_thrusters', 'db_thrusters', 'kb_thrusters'] },
  sdhp: { label: 'Sumo Deadlift High Pull', movementIds: ['bb_sdhp', 'kb_sdhp'] },
  // Core & Plank
  l_sit: { label: 'L-Sit Hold', movementIds: ['pbar_l_sit', 'l_sit'] },
  leg_raise: { label: 'Suspended Leg Raises', movementIds: ['ring_leg_raises', 'hanging_leg_raises', 'pbar_leg_raises'] },
  knee_raise: { label: 'Suspended Knee Raises', movementIds: ['ring_knee_raises', 'pbar_knee_raises', 'hanging_knee_raises'] },
  twists: { label: 'Twists', movementIds: ['kb_twists', 'db_twists', 'med_ball_twists', 'twists'] },
  situp: { label: 'Sit-Ups', movementIds: ['med_ball_situps', 'situps'] },
  plank_var: { label: 'Plank Variations', movementIds: ['plank_up_downs', 'plank_shoulder_taps', 'straight_arm_plank', 'side_plank'] },
  support_hold: { label: 'Support Hold', movementIds: ['ring_support_hold', 'pbar_support_hold'] },
  overhead_carry: { label: 'Overhead Carry / March', movementIds: ['kb_overhead_carry', 'db_overhead_carry'] },
  farmers_carry: { label: "Farmer's Carry / March", movementIds: ['db_farmers_carry', 'kb_farmers_carry'] },
  suitcase_carry: { label: 'Suitcase Carry / March', movementIds: ['kb_suitcase_carry', 'db_suitcase_carry'] },
  // Cardio
  erg_cal: { label: 'Erg Calories', movementIds: ['bike_erg_cal', 'row_erg_cal', 'ski_erg_cal'] },
  erg_meters: { label: 'Run & Erg Distance', movementIds: ['row_erg_meters', 'ski_erg_meters', 'run', 'bike_erg_meters'] }
};

const STACK_TREES = [
  {
    id: 'push',
    label: 'Push & OH Press',
    pattern: 'PUSH',
    columns: [
      { 0: 'hspu', 1: 'group:elevated_pike_pushup', 2: 'group:elevated_pushup' },
      { 2: 'pike_pushups', 3: 'group:pushup_var', 4: 'knee_pushups' },
      { 1: 'group:push_jerk', 2: 'group:dips', 3: 'group:bench_dips' },
      { 1: 'group:strict_press' },
      { 1: 'group:push_press' }
    ]
  },
  {
    id: 'pull',
    label: 'Pull-Ups & Rows',
    pattern: 'PULL',
    columns: [
      { 0: 'group:muscle_up', 1: 'chest_to_bar', 2: 'group:vertical_pull', 3: 'group:inverted_row', 4: 'doorway_towel_rows', 5: 'superman_pulls' },
      { 2: 'db_plank_renegade_row', 3: 'group:bent_row' },
      { 2: 'group:bar_hang' }
    ]
  },
  {
    id: 'squat',
    label: 'Squats & Lunges',
    pattern: 'SQUAT',
    columns: [
      { 2: 'broad_jumps', 3: 'jump_squats' },
      { 0: 'pistol_squats', 1: 'jumping_lunges', 2: 'walking_lunges', 3: 'step_back_lunges', 4: 'air_squats' },
      { 2: 'bulgarian_split_squats', 3: 'cossack_squats', 4: 'wall_sit' },
      { 0: 'group:thruster', 1: 'group:overhead_squat', 2: 'group:loaded_squat' },
      { 1: 'group:loaded_lunge', 2: 'group:loaded_split_squat' }
    ]
  },
  {
    id: 'olympic',
    label: 'Olympic & Explosive',
    pattern: 'FULL_BODY',
    columns: [
      { 0: 'bb_squat_snatch', 1: 'group:snatch', 2: 'group:sdhp' },
      { 0: 'bb_squat_clean', 1: 'group:power_clean', 2: 'group:hang_power_clean' },
      { 1: 'group:clean_and_jerk', 2: 'kb_swings' }
    ]
  },
  {
    id: 'hinge',
    label: 'Deadlift & Hinge',
    pattern: 'HINGE_CORE',
    columns: [
      { 0: 'bb_hip_thrust', 1: 'rfe_rdl', 2: 'glute_bridges' },
      { 0: 'group:rfe_rdl', 1: 'back_extensions' },
      { 0: 'bb_good_morning', 1: 'group:rdl', 2: 'group:deadlift' }
    ]
  },
  {
    id: 'core',
    label: 'Core & Planks',
    pattern: 'HINGE_CORE',
    columns: [
      { 0: 'toes_to_bar', 1: 'knees_to_elbows', 2: 'group:knee_raise', 3: 'v_ups', 4: 'tuck_ups', 5: 'group:situp' },
      { 0: 'group:l_sit', 1: 'group:leg_raise', 3: 'hollow_rocks', 4: 'hollow_hold' },
      { 0: 'ring_fallouts', 3: 'plank', 4: 'knee_plank', 5: 'group:twists' },
      { 1: 'group:support_hold', 2: 'group:plank_var', 3: 'bear_crawls' },
      { 0: 'group:overhead_carry', 1: 'group:farmers_carry', 2: 'group:suitcase_carry' }
    ]
  },
  {
    id: 'full_body',
    label: 'Full-Body Conditioning',
    pattern: 'FULL_BODY',
    columns: [
      { 0: 'wall_walks', 1: 'box_jump_overs', 2: 'box_jumps', 3: 'box_step_ups' },
      { 0: 'bar_facing_burpees', 1: 'burpees', 2: 'athletic_up_downs' },
      { 1: 'med_ball_slams', 2: 'wall_balls' },
      { 0: 'man_makers', 2: 'med_ball_cleans' },
      { 0: 'devil_press', 1: 'group:turkish_getup' }
    ]
  },
  {
    id: 'cardio',
    label: 'Cardio & Jump Rope',
    pattern: 'CARDIO',
    columns: [
      { 0: 'double_unders', 1: 'single_unders', 2: 'jumping_jacks' },
      { 0: 'mountain_climbers', 1: 'high_knees' },
      { 0: 'group:erg_cal', 1: 'group:erg_meters' }
    ]
  }
];

class ProgressionGraphView {
  constructor() {
    this._container = null;
    this._viewportEl = null;
    this._worldEl = null;
    this._svgEl = null;
    this._cardsLayerEl = null;
    this._inspectorEl = null;
    this._stackBarEl = null;

    this._blocks = [];
    this._blockById = new Map();
    this._blockByMovId = new Map();
    this._blockByTreeAndMov = new Map();
    this._movById = new Map();
    this._trees = [];
    this._treeById = new Map();

    this._adjScaleIn = new Map();
    this._adjScaleOut = new Map();
    this._adjPeers = new Map();
    this._searchMatchMovIds = new Set();

    this._patternFilter = 'ALL';
    this._searchQuery = '';
    this._activeTreeId = STACK_TREES[0].id;
    this._selectedId = null;

    this._cam = { tx: 0, ty: 0, zoom: 1 };
    this._pointers = new Map();
    this._panStart = null;
    this._pinchStart = null;
    this._dragMoved = false;
    this._wasMultiTouch = false;
    this._downNodeId = null;
    this._onInspectMovement = null;
    this._keyHandler = null;
    this._resizeObserver = null;
    this._lastViewportSize = { w: 0, h: 0 };
  }

  mount(container, options = {}) {
    this.destroy();
    if (!container) return;

    this._container = container;
    this._patternFilter = options.patternFilter || 'ALL';
    this._searchQuery = options.searchQuery || '';
    this._onInspectMovement = options.onInspectMovement || null;
    this._selectedId = options.selectedId || null;

    this._buildTreesAndGraph();

    // Pick initial stack tree matching selectedId, search query, or patternFilter
    if (this._selectedId && this._blockByMovId.has(this._selectedId)) {
      this._activeTreeId = this._blockByMovId.get(this._selectedId).treeId;
    } else {
      this._activeTreeId = this._pickBestTreeForFilter();
    }

    container.innerHTML = `
      <div class="flex flex-col gap-2 flex-1 min-h-0 h-full">
        <!-- Stack Tree Selector Pills -->
        <div id="graphStackBar" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
        </div>

        <!-- Legend & Interaction Hint -->
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-[10px] font-mono shrink-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
              <span>↓</span><span>Scale-Down</span>
            </span>
            <span class="text-zinc-300 dark:text-zinc-700">·</span>
            <span class="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
              <span class="w-2.5 h-2.5 rounded-sm border border-dashed border-orange-500 inline-block"></span>
              <span>Gear Swap</span>
            </span>
            <span class="text-zinc-300 dark:text-zinc-700">·</span>
            <span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
              <span>⇄</span><span>No-Gear Alt</span>
            </span>
          </div>
          <span id="graphInteractionHint" class="text-zinc-400 dark:text-zinc-500 hidden sm:inline">Tap movement for form &amp; cues · Drag to pan · Scroll to zoom</span>
        </div>

        <!-- Pan & Zoom Tree Viewport -->
        <div id="graphViewport" class="relative flex-1 min-h-[200px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing">
          <div id="graphWorld" class="absolute top-0 left-0 origin-top-left will-change-transform">
            <svg id="graphEdgesSvg" class="absolute top-0 left-0 pointer-events-none overflow-visible"></svg>
            <div id="graphCardsLayer" class="relative"></div>
          </div>

          <!-- Zoom Controls -->
          <div class="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10">
            <button type="button" data-graph-action="zoom-in" title="Zoom In"
              class="w-7 h-7 rounded-lg bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-volt text-zinc-700 dark:text-zinc-200 font-mono text-sm font-bold flex items-center justify-center shadow-sm transition">+</button>
            <button type="button" data-graph-action="zoom-out" title="Zoom Out"
              class="w-7 h-7 rounded-lg bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-volt text-zinc-700 dark:text-zinc-200 font-mono text-sm font-bold flex items-center justify-center shadow-sm transition">−</button>
            <button type="button" data-graph-action="fit" title="Fit Tree"
              class="w-7 h-7 rounded-lg bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-volt text-zinc-700 dark:text-zinc-200 font-mono text-[9px] font-bold flex items-center justify-center shadow-sm transition">FIT</button>
          </div>
        </div>
      </div>
    `;

    this._viewportEl = container.querySelector('#graphViewport');
    this._worldEl = container.querySelector('#graphWorld');
    this._svgEl = container.querySelector('#graphEdgesSvg');
    this._cardsLayerEl = container.querySelector('#graphCardsLayer');
    this._inspectorEl = null;
    this._stackBarEl = container.querySelector('#graphStackBar');

    this._applySearch();
    this._renderStackPills();
    this._renderActiveTree();
    this._bindEvents();

    requestAnimationFrame(() => {
      if (!this._viewportEl) return;
      this._fitActiveTree(false);
    });

    if (globalThis.lucide) globalThis.lucide.createIcons();
  }

  updateFilter({ patternFilter, searchQuery }) {
    if (!this._viewportEl) return;
    if (patternFilter !== undefined) this._patternFilter = patternFilter;
    if (searchQuery !== undefined) this._searchQuery = searchQuery;

    this._applySearch();
    const eligible = this._getEligibleTrees();
    if (!eligible.some(t => t.id === this._activeTreeId)) {
      this._activeTreeId = this._pickBestTreeForFilter();
    } else if (this._searchMatchMovIds.size > 0) {
      const activeTree = this._treeById.get(this._activeTreeId);
      const activeHasMatch = activeTree?.blocks.some(b => b.movements.some(m => this._searchMatchMovIds.has(m.id)));
      if (!activeHasMatch) {
        this._activeTreeId = this._pickBestTreeForFilter();
      }
    }

    if (this._selectedId && !this._blockByTreeAndMov.has(`${this._activeTreeId}:${this._selectedId}`)) {
      this._selectedId = null;
    }

    this._renderStackPills();
    this._renderActiveTree();
    this._fitActiveTree(false);
  }

  selectNode(movId, centerOnNode = false) {
    const block = this._blockByTreeAndMov.get(`${this._activeTreeId}:${movId}`) || this._blockByMovId.get(movId);
    if (!block) return;
    this._selectedId = movId;
    if (block.treeId !== this._activeTreeId) {
      this._activeTreeId = block.treeId;
      this._renderStackPills();
      this._renderActiveTree();
      this._fitActiveTree(false);
      if (centerOnNode) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this._viewportEl || this._activeTreeId !== block.treeId) return;
            this.focusNode(movId, 420);
            this._pulseNode(movId);
          });
        });
      }
    } else {
      this._updateHighlightStates();
      if (centerOnNode) {
        this.focusNode(movId, 400);
        this._pulseNode(movId);
      }
    }
  }

  switchTree(treeId) {
    if (!this._treeById.has(treeId)) return;
    this._activeTreeId = treeId;
    if (this._selectedId && !this._blockByTreeAndMov.has(`${treeId}:${this._selectedId}`)) {
      this._selectedId = null;
    }
    this._renderStackPills();
    this._renderActiveTree();
    this._fitActiveTree(false);
  }

  focusNode(movId, durationMs = 360) {
    const block = this._blockByTreeAndMov.get(`${this._activeTreeId}:${movId}`) || this._blockByMovId.get(movId);
    if (!block || !this._viewportEl || block.treeId !== this._activeTreeId) return;
    const vw = this._viewportEl.clientWidth || 360;
    const vh = this._viewportEl.clientHeight || 300;
    const targetZoom = Math.max(this._cam.zoom, vw < 640 ? 0.85 : 0.95);
    this._cam.zoom = Math.min(1.4, Math.max(0.35, targetZoom));
    this._cam.tx = vw / 2 - block.cx * this._cam.zoom;
    this._cam.ty = vh / 2 - block.cy * this._cam.zoom;
    this._applyTransform(true, durationMs);
  }

  _pulseNode(movId) {
    if (!this._cardsLayerEl) return;
    const el = this._cardsLayerEl.querySelector(`[data-graph-node="${movId}"]`);
    if (!el) return;
    el.classList.add('ring-2', 'ring-amber-500', 'dark:ring-volt', 'animate-pulse');
    setTimeout(() => {
      el.classList.remove('animate-pulse');
    }, 1100);
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._cardsLayerEl) {
      BiomechanicalStickAnimator.unregisterCanvasesIn(this._cardsLayerEl);
    }
    if (this._inspectorEl) {
      BiomechanicalStickAnimator.unregisterCanvasesIn(this._inspectorEl);
    }
    this._pointers.clear();
    this._wasMultiTouch = false;
    this._lastViewportSize = { w: 0, h: 0 };
    this._container = null;
    this._viewportEl = null;
    this._worldEl = null;
    this._svgEl = null;
    this._cardsLayerEl = null;
    this._inspectorEl = null;
    this._stackBarEl = null;
  }

  _buildTreesAndGraph() {
    this._blocks = [];
    this._blockById.clear();
    this._blockByMovId.clear();
    this._blockByTreeAndMov.clear();
    this._movById = new Map(MOVEMENTS_DB.map(m => [m.id, m]));
    this._trees = [];
    this._treeById.clear();
    this._adjScaleIn.clear();
    this._adjScaleOut.clear();
    this._adjPeers.clear();

    MOVEMENTS_DB.forEach(m => {
      this._adjScaleIn.set(m.id, []);
      this._adjPeers.set(m.id, []);
    });

    // Movement-level adjacency
    MOVEMENTS_DB.forEach(mov => {
      if (!mov.scaleDownId || !this._movById.has(mov.scaleDownId)) return;
      this._adjScaleOut.set(mov.id, mov.scaleDownId);
      this._adjScaleIn.get(mov.scaleDownId).push(mov.id);
    });
    (ProgressionEngine.getPeerGroups() || []).forEach(group => {
      const ids = group.movementIds.filter(id => this._movById.has(id));
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          this._adjPeers.get(ids[i]).push(ids[j]);
          this._adjPeers.get(ids[j]).push(ids[i]);
        }
      }
    });

    const placedMovIds = new Set();

    // First pass: map movement -> Set<treeId> so shared nodes resolve intra-tree without portals
    const movTreeSetMap = new Map();
    const movPrimaryTreeMap = new Map();
    const treeMovTargetHasBw = new Map();
    const addMovTree = (id, treeId, targetHasBw) => {
      if (!movTreeSetMap.has(id)) movTreeSetMap.set(id, new Set());
      movTreeSetMap.get(id).add(treeId);
      if (!movPrimaryTreeMap.has(id)) movPrimaryTreeMap.set(id, treeId);
      if (targetHasBw) treeMovTargetHasBw.set(`${treeId}:${id}`, true);
    };
    STACK_TREES.forEach(treeDef => {
      treeDef.columns.forEach(colObj => {
        Object.values(colObj).forEach(spec => {
          const cellIds = (typeof spec === 'string' && spec.startsWith('group:'))
            ? (GROUP_BLOCKS[spec.slice(6)]?.movementIds || [])
            : [spec];
          const hasBw = cellIds.some(id => this._movById.get(id)?.equipment === 'bodyweight');
          cellIds.forEach(id => addMovTree(id, treeDef.id, hasBw));
        });
      });
    });

    const getBlockPortals = (treeId, movs) => {
      const portals = [];
      const seen = new Set();
      movs.forEach(m => {
        if (!m.scaleDownId) return;
        const targetTrees = movTreeSetMap.get(m.scaleDownId);
        if (!targetTrees || targetTrees.has(treeId)) return;
        const targetTree = movPrimaryTreeMap.get(m.scaleDownId);
        if (targetTree && !seen.has(m.scaleDownId)) {
          seen.add(m.scaleDownId);
          const targetMov = this._movById.get(m.scaleDownId);
          if (targetMov) {
            portals.push({ targetId: targetMov.id, targetName: targetMov.name, targetTreeId: targetTree, kind: 'scale' });
          }
        }
      });

      const allRequireGear = movs.length > 0 && movs.every(m => m.equipment !== 'bodyweight');
      const hasIntraBwScaleDown = movs.some(m => m.scaleDownId && treeMovTargetHasBw.get(`${treeId}:${m.scaleDownId}`));
      if (portals.length === 0 && allRequireGear && !hasIntraBwScaleDown) {
        let bwAlt = null;
        let fallbackBwAlt = null;
        for (const m of movs) {
          for (const cid of (m.fallbackCandidates || [])) {
            const fc = this._movById.get(cid);
            if (!fc || fc.equipment !== 'bodyweight') continue;
            if (!fallbackBwAlt) fallbackBwAlt = fc;
            if (!ProgressionEngine.isRegressionMovement(fc.id)) {
              bwAlt = fc;
              break;
            }
          }
          if (bwAlt) break;
        }
        const chosen = bwAlt || fallbackBwAlt;
        if (chosen) {
          portals.push({
            targetId: chosen.id,
            targetName: chosen.name,
            targetTreeId: movTreeSetMap.get(chosen.id)?.has(treeId)
              ? treeId
              : (movPrimaryTreeMap.get(chosen.id) || treeId),
            kind: 'alt'
          });
        }
      }

      return portals;
    };

    const getSpecHeight = (treeId, spec) => {
      let movs = [];
      let baseH = SINGLE_H;
      if (typeof spec === 'string' && spec.startsWith('group:')) {
        const g = GROUP_BLOCKS[spec.slice(6)];
        movs = (g ? g.movementIds : []).map(id => this._movById.get(id)).filter(Boolean);
        baseH = GROUP_HEADER_H + movs.length * GROUP_ITEM_H + GROUP_PAD_BOTTOM;
      } else {
        const mov = this._movById.get(spec);
        if (mov) movs = [mov];
      }
      const portals = getBlockPortals(treeId, movs);
      return baseH + (portals.length > 0 ? PORTAL_H : 0);
    };

    // Second pass: lay out each tree independently in compact local coordinates
    STACK_TREES.forEach(treeDef => {
      const rowMaxH = new Map();
      let maxRow = 0;
      treeDef.columns.forEach(colObj => {
        Object.entries(colObj).forEach(([rStr, spec]) => {
          const r = Number(rStr);
          maxRow = Math.max(maxRow, r);
          rowMaxH.set(r, Math.max(rowMaxH.get(r) || SINGLE_H, getSpecHeight(treeDef.id, spec)));
        });
      });

      const rowTops = new Map();
      const rowBottoms = new Map();
      let yCursor = WORLD_PAD_Y;
      for (let r = 0; r <= maxRow; r++) {
        rowTops.set(r, yCursor);
        const h = rowMaxH.get(r) || SINGLE_H;
        rowBottoms.set(r, yCursor + h);
        yCursor += h + ROW_GAP;
      }

      const treeBlocks = [];
      treeDef.columns.forEach((colObj, colOffset) => {
        const x = WORLD_PAD_X + colOffset * (BLOCK_W + COL_GAP);
        Object.entries(colObj).forEach(([rowStr, spec]) => {
          const row = Number(rowStr);
          const y = rowTops.get(row);

          if (typeof spec === 'string' && spec.startsWith('group:')) {
            const gKey = spec.slice(6);
            const g = GROUP_BLOCKS[gKey];
            if (!g) return;
            const movs = g.movementIds
              .map(id => this._movById.get(id))
              .filter(Boolean)
              .sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
            if (movs.length === 0) return;

            const portals = getBlockPortals(treeDef.id, movs);
            const h = GROUP_HEADER_H + movs.length * GROUP_ITEM_H + GROUP_PAD_BOTTOM + (portals.length > 0 ? PORTAL_H : 0);
            const blockId = this._blockById.has(`grp_${gKey}`) ? `${treeDef.id}__grp_${gKey}` : `grp_${gKey}`;
            const block = {
              id: blockId,
              type: 'group',
              label: g.label,
              movements: movs,
              portals,
              treeId: treeDef.id,
              col: colOffset,
              row,
              x,
              y,
              w: BLOCK_W,
              h,
              cx: x + BLOCK_W / 2,
              cy: y + h / 2
            };
            treeBlocks.push(block);
            this._blocks.push(block);
            this._blockById.set(block.id, block);
            movs.forEach(m => {
              placedMovIds.add(m.id);
              this._blockByTreeAndMov.set(`${treeDef.id}:${m.id}`, block);
              if (!this._blockByMovId.has(m.id)) this._blockByMovId.set(m.id, block);
            });
          } else {
            const mov = this._movById.get(spec);
            if (!mov) return;
            const portals = getBlockPortals(treeDef.id, [mov]);
            const h = SINGLE_H + (portals.length > 0 ? PORTAL_H : 0);
            const blockId = this._blockById.has(`mov_${mov.id}`) ? `${treeDef.id}__mov_${mov.id}` : `mov_${mov.id}`;
            const block = {
              id: blockId,
              type: 'single',
              label: mov.name,
              movements: [mov],
              portals,
              treeId: treeDef.id,
              col: colOffset,
              row,
              x,
              y,
              w: BLOCK_W,
              h,
              cx: x + BLOCK_W / 2,
              cy: y + h / 2
            };
            treeBlocks.push(block);
            this._blocks.push(block);
            this._blockById.set(block.id, block);
            placedMovIds.add(mov.id);
            this._blockByTreeAndMov.set(`${treeDef.id}:${mov.id}`, block);
            if (!this._blockByMovId.has(mov.id)) this._blockByMovId.set(mov.id, block);
          }
        });
      });

      // Intra-tree blue scale-down edges only
      const edgeKeys = new Set();
      const treeEdges = [];
      treeBlocks.forEach(srcBlock => {
        srcBlock.movements.forEach(mov => {
          if (!mov.scaleDownId) return;
          const tgtBlock = this._blockByTreeAndMov.get(`${treeDef.id}:${mov.scaleDownId}`);
          if (!tgtBlock || srcBlock.id === tgtBlock.id) return;
          const key = `${srcBlock.id}->${tgtBlock.id}`;
          if (edgeKeys.has(key)) return;
          edgeKeys.add(key);
          treeEdges.push({ source: srcBlock.id, target: tgtBlock.id });
        });
      });

      const width = WORLD_PAD_X * 2 + treeDef.columns.length * BLOCK_W + Math.max(0, treeDef.columns.length - 1) * COL_GAP;
      const height = Math.max(240, yCursor - ROW_GAP + WORLD_PAD_Y);

      const treeObj = {
        ...treeDef,
        blocks: treeBlocks,
        edges: treeEdges,
        rowBottoms,
        width,
        height
      };
      this._trees.push(treeObj);
      this._treeById.set(treeDef.id, treeObj);
    });
  }

  _applySearch() {
    const q = (this._searchQuery || '').trim().toLowerCase();
    this._searchMatchMovIds.clear();
    if (!q) return;

    MOVEMENTS_DB.forEach(mov => {
      const eqName = (EQUIPMENT_CATALOG.find(e => e.id === mov.equipment)?.name || 'Bodyweight').toLowerCase();
      const patLabel = (PATTERNS[mov.pattern]?.label || mov.pattern).toLowerCase();
      const block = this._blockByMovId.get(mov.id);
      if (
        mov.name.toLowerCase().includes(q) ||
        eqName.includes(q) ||
        patLabel.includes(q) ||
        (block && block.label.toLowerCase().includes(q))
      ) {
        this._searchMatchMovIds.add(mov.id);
      }
    });

    if (this._searchMatchMovIds.size === 1) {
      this._selectedId = Array.from(this._searchMatchMovIds)[0];
    }
  }

  _getEligibleTrees() {
    const pat = this._patternFilter || 'ALL';
    if (pat === 'ALL') return this._trees;
    return this._trees.filter(t => t.pattern === pat || t.blocks.some(b => b.movements.some(m => m.pattern === pat)));
  }

  _pickBestTreeForFilter() {
    const eligible = this._getEligibleTrees();
    if (this._searchMatchMovIds.size > 0) {
      const withMatch = eligible.find(t => t.blocks.some(b => b.movements.some(m => this._searchMatchMovIds.has(m.id))));
      if (withMatch) return withMatch.id;
    }
    return (eligible[0] || this._trees[0]).id;
  }

  _getFocusBlockSet(tree) {
    if (!this._selectedId || !tree) return null;
    const selBlock = this._blockByTreeAndMov.get(`${tree.id}:${this._selectedId}`);
    if (!selBlock) return null;
    const blockIds = new Set([selBlock.id]);
    tree.edges.forEach(e => {
      if (e.source === selBlock.id) blockIds.add(e.target);
      if (e.target === selBlock.id) blockIds.add(e.source);
    });
    return { focusBlockId: selBlock.id, neighborBlockIds: blockIds };
  }

  _hasBlockBetweenVertical(tree, x, yMin, yMax, excludeBlockIds) {
    for (const b of tree.blocks) {
      if (excludeBlockIds.has(b.id)) continue;
      if (x > b.x - 2 && x < b.x + b.w + 2 && yMax > b.y - 2 && yMin < b.y + b.h + 2) {
        return true;
      }
    }
    return false;
  }

  _roundedPolyPath(points, radius = 8) {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      if (len1 < 0.5 || len2 < 0.5) continue;
      const r = Math.min(radius, len1 / 2, len2 / 2);
      const p1x = curr.x - (v1x / len1) * r;
      const p1y = curr.y - (v1y / len1) * r;
      const p2x = curr.x + (v2x / len2) * r;
      const p2y = curr.y + (v2y / len2) * r;
      d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  _buildTreeEdgePaths(tree) {
    const laneTrack = new Map();
    const allocOffset = (bucketKey, stepPx, maxTracks = 5) => {
      const idx = laneTrack.get(bucketKey) || 0;
      laneTrack.set(bucketKey, idx + 1);
      const slot = idx % maxTracks;
      return (slot - Math.floor(maxTracks / 2)) * stepPx;
    };

    // Interval-aware horizontal track allocator so non-overlapping or opposite-side converging
    // edges sharing the same row stay on the same horizontal line instead of staggering.
    const rowTrackIntervals = new Map();
    const allocRowYOffset = (row, xMin, xMax, targetId, side) => {
      const key = `h-${row}`;
      if (!rowTrackIntervals.has(key)) rowTrackIntervals.set(key, []);
      const tracks = rowTrackIntervals.get(key);
      const order = [0, 1, -1, 2, -2];
      for (const slotIdx of order) {
        if (!tracks[slotIdx + 2]) tracks[slotIdx + 2] = [];
        const occupied = tracks[slotIdx + 2];
        const collides = occupied.some(seg => {
          const sameTargetOppSide = seg.targetId === targetId && seg.side !== side;
          const margin = sameTargetOppSide ? 0.5 : 4;
          return Math.min(xMax, seg.xMax) - Math.max(xMin, seg.xMin) > margin;
        });
        if (!collides) {
          occupied.push({ xMin, xMax, targetId, side });
          return slotIdx * 6;
        }
      }
      return 0;
    };

    return tree.edges.map(edge => {
      const a = this._blockById.get(edge.source);
      const b = this._blockById.get(edge.target);
      if (!a || !b) return null;
      const exclude = new Set([a.id, b.id]);

      const startX = a.cx;
      const startY = a.y + a.h;
      const endX = b.cx;
      const endY = b.y - 4;

      if (Math.abs(startX - endX) < 6 && endY > startY && !this._hasBlockBetweenVertical(tree, startX, startY, endY, exclude)) {
        return {
          edge,
          d: this._roundedPolyPath([{ x: startX, y: startY }, { x: endX, y: endY }])
        };
      }

      const rowBottom = tree.rowBottoms.get(a.row) || startY;
      const xMin = Math.min(startX, endX);
      const xMax = Math.max(startX, endX);
      const side = startX < endX ? 'left' : 'right';
      const outGutterY = rowBottom + 18 + allocRowYOffset(a.row, xMin, xMax, edge.target, side);
      const inGutterY = b.y - 20 + allocOffset(`in-${b.row}`, 5, 5);

      if (b.row === a.row + 1 && !this._hasBlockBetweenVertical(tree, endX, outGutterY, endY, exclude)) {
        return {
          edge,
          d: this._roundedPolyPath([
            { x: startX, y: startY },
            { x: startX, y: outGutterY },
            { x: endX, y: outGutterY },
            { x: endX, y: endY }
          ])
        };
      }

      if (b.row > a.row) {
        let laneX = Math.abs(startX - endX) < 6
          ? a.x - COL_GAP * 0.48 + allocOffset(`v-${a.col}`, 5, 4)
          : (startX < endX ? b.x - COL_GAP * 0.48 : b.x + b.w + COL_GAP * 0.48) + allocOffset(`v-${b.col}`, 5, 4);

        if (this._hasBlockBetweenVertical(tree, laneX, outGutterY, inGutterY, exclude)) {
          laneX = a.x + a.w + COL_GAP * 0.48;
        }

        return {
          edge,
          d: this._roundedPolyPath([
            { x: startX, y: startY },
            { x: startX, y: outGutterY },
            { x: laneX, y: outGutterY },
            { x: laneX, y: inGutterY },
            { x: endX, y: inGutterY },
            { x: endX, y: endY }
          ])
        };
      }

      const enterX = b.x - COL_GAP * 0.45;
      return {
        edge,
        d: this._roundedPolyPath([
          { x: startX, y: startY },
          { x: startX, y: outGutterY },
          { x: enterX, y: outGutterY },
          { x: enterX, y: b.y - 18 },
          { x: endX, y: b.y - 18 },
          { x: endX, y: endY }
        ])
      };
    }).filter(Boolean);
  }

  _getBadgeMeta(mov) {
    const isReg = ProgressionEngine.isRegressionMovement(mov.id);
    if (isReg) {
      return {
        label: 'SCALE-DOWN',
        cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
      };
    }
    if (mov.difficulty === 'hard') {
      return { label: 'HARD', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' };
    }
    if (mov.difficulty === 'easy') {
      return { label: 'EASY', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
    }
    return { label: 'NORMAL', cls: 'bg-volt-600/10 text-volt-700 dark:bg-volt/15 dark:text-volt border-volt-600/30 dark:border-volt/30' };
  }

  _renderStackPills() {
    if (!this._stackBarEl) return;
    const eligible = this._getEligibleTrees();
    const hasSearch = this._searchMatchMovIds.size > 0;

    this._stackBarEl.innerHTML = eligible.map(tree => {
      const isActive = tree.id === this._activeTreeId;
      const matchCount = hasSearch
        ? tree.blocks.reduce((sum, b) => sum + b.movements.filter(m => this._searchMatchMovIds.has(m.id)).length, 0)
        : 0;
      const countTag = matchCount > 0
        ? ` <span class="ml-1 px-1 rounded bg-volt/25 text-volt-800 dark:text-volt">${matchCount}</span>`
        : '';

      return `
        <button type="button" data-stack-jump="${tree.id}"
          class="stack-pill-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition whitespace-nowrap shrink-0 ${
            isActive
              ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
              : (matchCount > 0
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-volt-600/60 dark:border-volt/60'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600')
          }">
          ${tree.label}${countTag}
        </button>
      `;
    }).join('');
  }

  _renderActiveTree() {
    if (!this._worldEl || !this._svgEl || !this._cardsLayerEl) return;
    const tree = this._treeById.get(this._activeTreeId) || this._trees[0];
    if (!tree) return;

    BiomechanicalStickAnimator.unregisterCanvasesIn(this._cardsLayerEl);

    this._worldEl.style.width = `${tree.width}px`;
    this._worldEl.style.height = `${tree.height}px`;
    this._svgEl.setAttribute('width', String(tree.width));
    this._svgEl.setAttribute('height', String(tree.height));
    this._svgEl.setAttribute('viewBox', `0 0 ${tree.width} ${tree.height}`);

    const focus = this._getFocusBlockSet(tree);
    const hasSearch = this._searchMatchMovIds.size > 0;
    const builtEdges = this._buildTreeEdgePaths(tree);

    const scalePaths = builtEdges.map(({ edge: e, d }) => {
      const isFocusedEdge = focus ? (e.source === focus.focusBlockId || e.target === focus.focusBlockId) : false;
      const srcBlock = this._blockById.get(e.source);
      const tgtBlock = this._blockById.get(e.target);
      const isSearchEdge = hasSearch && (
        srcBlock?.movements.some(m => this._searchMatchMovIds.has(m.id)) ||
        tgtBlock?.movements.some(m => this._searchMatchMovIds.has(m.id))
      );

      let opacity = 0.82;
      if (focus) opacity = isFocusedEdge ? 1 : 0.25;
      else if (hasSearch) opacity = isSearchEdge ? 0.95 : 0.25;

      const marker = isFocusedEdge ? 'url(#blueArrowActive)' : 'url(#blueArrow)';
      return `<path data-edge-src="${e.source}" data-edge-tgt="${e.target}" d="${d}" fill="none" stroke="currentColor" class="text-blue-600 dark:text-blue-400 transition-opacity" stroke-width="${isFocusedEdge ? 2.6 : 2}" opacity="${opacity}" style="opacity: ${opacity}" marker-end="${marker}" />`;
    });

    this._svgEl.innerHTML = `
      <defs>
        <marker id="blueArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" class="fill-blue-600 dark:fill-blue-400" />
        </marker>
        <marker id="blueArrowActive" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" class="fill-blue-600 dark:fill-blue-400" />
        </marker>
      </defs>
      ${scalePaths.join('')}
    `;

    const patInfo = PATTERNS[tree.pattern] || { label: tree.pattern, color: '' };
    const headerHtml = `
      <div style="left:${WORLD_PAD_X}px; top:16px; width:${tree.width - WORLD_PAD_X * 2}px;"
        class="absolute flex items-center gap-2 pointer-events-none">
        <span class="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100 whitespace-nowrap">${tree.label}</span>
        <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border whitespace-nowrap ${patInfo.color}">${patInfo.label}</span>
        <div class="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
      </div>
    `;

    const blocksHtml = tree.blocks.map(b => {
      const isBlockFocused = focus ? focus.neighborBlockIds.has(b.id) : false;
      const isSelectedBlock = focus ? focus.focusBlockId === b.id : false;
      const hasSearchHit = hasSearch && b.movements.some(m => this._searchMatchMovIds.has(m.id));

      let opacityCls = 'opacity-100';
      if (focus) opacityCls = isBlockFocused ? 'opacity-100' : 'opacity-30';
      else if (hasSearch) opacityCls = hasSearchHit ? 'opacity-100' : 'opacity-30';

      const portalFooterHtml = b.portals.length > 0
        ? `
          <div class="pt-1 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1 overflow-hidden shrink-0">
            ${b.portals.slice(0, 1).map(p => {
              const isAlt = p.kind === 'alt';
              const crossMark = p.targetTreeId !== this._activeTreeId ? ' ↗' : '';
              const cls = isAlt
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 text-blue-700 dark:text-blue-300';
              const label = isAlt ? `⇄ No gear: ${p.targetName}${crossMark}` : `↓ ${p.targetName} ↗`;
              const title = isAlt
                ? `No-gear alternative: ${p.targetName}${this._treeById.get(p.targetTreeId)?.label ? ` (${this._treeById.get(p.targetTreeId).label})` : ''}`
                : `Jump to ${p.targetName} in ${this._treeById.get(p.targetTreeId)?.label || ''}`;
              return `
                <button type="button" data-portal-target="${p.targetId}"
                  class="w-full px-1.5 py-0.5 rounded border text-[8px] font-mono font-semibold truncate text-center transition ${cls}"
                  title="${title}">
                  ${label}
                </button>
              `;
            }).join('')}
          </div>
        `
        : '';

      if (b.type === 'single') {
        const mov = b.movements[0];
        const eqName = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment)?.name || 'Bodyweight';
        const eqState = AppState.equipmentStates[mov.equipment] || 'off';
        const badge = this._getBadgeMeta(mov);
        const isSelected = mov.id === this._selectedId;
        const ringCls = isSelected
          ? 'border-blue-600 dark:border-volt ring-2 ring-blue-500/30 dark:ring-volt/30 shadow-md'
          : (hasSearchHit
            ? 'border-volt-600 dark:border-volt ring-1 ring-volt/40'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600');
        const statusPill = eqState === 'off'
          ? `<span class="text-[8px] font-mono uppercase px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">Off</span>`
          : (eqState === 'optional' ? `<span class="text-[8px] font-mono uppercase px-1 rounded bg-amber-600/15 text-amber-800 dark:text-amber-300">Opt</span>` : '');

        return `
          <div
            data-graph-block="${b.id}"
            data-graph-node="${mov.id}"
            style="left:${b.x}px; top:${b.y}px; width:${b.w}px; height:${b.h}px;"
            class="absolute rounded-xl p-2 bg-white dark:bg-zinc-900 border ${ringCls} ${opacityCls} cursor-pointer transition-opacity flex flex-col justify-between shadow-sm select-none"
          >
            <div class="flex items-center justify-between gap-1 shrink-0">
              <span class="text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${badge.cls}">
                ${badge.label}
              </span>
              ${statusPill}
            </div>

            <div class="flex items-center gap-2 min-w-0 my-auto">
              <div class="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                <canvas data-graph-pose="${mov.poseType}" width="44" height="44" class="w-10 h-10 block"></canvas>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold text-zinc-950 dark:text-white leading-tight line-clamp-2 break-words">
                  ${mov.name}
                </div>
              </div>
            </div>

            <div class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 truncate border-t border-zinc-100 dark:border-zinc-800/80 pt-0.5">
              ${eqName}
            </div>
            ${portalFooterHtml}
          </div>
        `;
      }

      const groupBorder = isSelectedBlock
        ? 'border-blue-600 dark:border-volt ring-2 ring-blue-500/25 dark:ring-volt/25 shadow-md'
        : (hasSearchHit
          ? 'border-volt-600 dark:border-volt ring-1 ring-volt/40'
          : 'border-dashed border-orange-400/70 dark:border-orange-500/45');

      const rowsHtml = b.movements.map(mov => {
        const eqName = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment)?.name || 'Bodyweight';
        const eqState = AppState.equipmentStates[mov.equipment] || 'off';
        const isMovSel = mov.id === this._selectedId;
        const isMovHit = hasSearch && this._searchMatchMovIds.has(mov.id);
        const badge = this._getBadgeMeta(mov);
        const rowCls = isMovSel
          ? 'bg-blue-50 dark:bg-volt/15 border-blue-500 dark:border-volt'
          : (isMovHit
            ? 'bg-volt/10 border-volt-600 dark:border-volt'
            : 'bg-zinc-50 dark:bg-zinc-950/70 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600');
        const statusDot = eqState === 'off'
          ? `<span class="text-[7px] font-mono uppercase px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">Off</span>`
          : (eqState === 'optional' ? `<span class="text-[7px] font-mono uppercase px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">Opt</span>` : '');

        return `
          <div
            data-graph-node="${mov.id}"
            class="h-[30px] px-1.5 rounded-lg border ${rowCls} cursor-pointer flex items-center gap-1.5 min-w-0 transition-colors"
            title="${mov.name} (${eqName})"
          >
            <canvas data-graph-pose="${mov.poseType}" width="26" height="26" class="w-6 h-6 rounded bg-white dark:bg-zinc-900 shrink-0 block"></canvas>
            <div class="min-w-0 flex-1 leading-none">
              <div class="text-[10px] font-bold text-zinc-950 dark:text-white truncate">${mov.name}</div>
              <div class="text-[8px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">${eqName}</div>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              ${statusDot}
              <span class="text-[7px] font-mono font-bold uppercase px-1 py-0.2 rounded border ${badge.cls}">${badge.label === 'SCALE-DOWN' ? 'SCALE' : badge.label[0]}</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div
          data-graph-block="${b.id}"
          style="left:${b.x}px; top:${b.y}px; width:${b.w}px; height:${b.h}px;"
          class="absolute rounded-xl p-1.5 bg-white/95 dark:bg-zinc-900/95 border ${groupBorder} ${opacityCls} transition-opacity flex flex-col justify-between shadow-sm select-none"
        >
          <div class="flex items-center justify-between gap-1 px-0.5 pb-1 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 truncate">
              ↔ ${b.label}
            </span>
            <span class="text-[8px] font-mono text-zinc-400 shrink-0">${b.movements.length}</span>
          </div>
          <div class="flex flex-col gap-1 pt-1">
            ${rowsHtml}
          </div>
          ${portalFooterHtml}
        </div>
      `;
    }).join('');

    this._cardsLayerEl.innerHTML = headerHtml + blocksHtml;
    this._cardsLayerEl.querySelectorAll('canvas[data-graph-pose]').forEach(canvas => {
      BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.graphPose, { mode: 'static' });
    });
  }

  _updateHighlightStates() {
    if (!this._svgEl || !this._cardsLayerEl) return;
    const tree = this._treeById.get(this._activeTreeId);
    if (!tree) return;
    const focus = this._getFocusBlockSet(tree);
    const hasSearch = this._searchMatchMovIds.size > 0;

    this._svgEl.querySelectorAll('path[data-edge-src]').forEach(path => {
      const src = path.dataset.edgeSrc;
      const tgt = path.dataset.edgeTgt;
      const isFocusedEdge = focus ? (src === focus.focusBlockId || tgt === focus.focusBlockId) : false;
      const srcBlock = this._blockById.get(src);
      const tgtBlock = this._blockById.get(tgt);
      const isSearchEdge = hasSearch && (
        srcBlock?.movements.some(m => this._searchMatchMovIds.has(m.id)) ||
        tgtBlock?.movements.some(m => this._searchMatchMovIds.has(m.id))
      );

      let opacity = 0.82;
      if (focus) opacity = isFocusedEdge ? 1 : 0.25;
      else if (hasSearch) opacity = isSearchEdge ? 0.95 : 0.25;

      path.setAttribute('opacity', String(opacity));
      path.style.opacity = String(opacity);
      path.setAttribute('stroke-width', isFocusedEdge ? '2.6' : '2');
      path.setAttribute('marker-end', isFocusedEdge ? 'url(#blueArrowActive)' : 'url(#blueArrow)');
    });

    this._cardsLayerEl.querySelectorAll('[data-graph-block]').forEach(el => {
      const id = el.dataset.graphBlock;
      const block = this._blockById.get(id);
      const isFocused = focus ? focus.neighborBlockIds.has(id) : false;
      const hasHit = hasSearch && block?.movements.some(m => this._searchMatchMovIds.has(m.id));
      el.classList.remove('opacity-30', 'opacity-100');
      if (focus) el.classList.add(isFocused ? 'opacity-100' : 'opacity-30');
      else if (hasSearch) el.classList.add(hasHit ? 'opacity-100' : 'opacity-30');
      else el.classList.add('opacity-100');
    });

    this._cardsLayerEl.querySelectorAll('[data-graph-node]').forEach(el => {
      const movId = el.dataset.graphNode;
      const block = this._blockByTreeAndMov.get(`${this._activeTreeId}:${movId}`) || this._blockByMovId.get(movId);
      const isSel = movId === this._selectedId;
      if (block?.type === 'single') {
        el.classList.toggle('border-blue-600', isSel);
        el.classList.toggle('dark:border-volt', isSel);
        el.classList.toggle('ring-2', isSel);
        el.classList.toggle('ring-blue-500/30', isSel);
        el.classList.toggle('dark:ring-volt/30', isSel);
      } else {
        el.classList.toggle('bg-blue-50', isSel);
        el.classList.toggle('dark:bg-volt/15', isSel);
        el.classList.toggle('border-blue-500', isSel);
        el.classList.toggle('dark:border-volt', isSel);
      }
    });
  }

  _fitActiveTree(animate = true) {
    const tree = this._treeById.get(this._activeTreeId) || this._trees[0];
    if (!tree || !this._viewportEl) return;
    const vw = this._viewportEl.clientWidth || 360;
    const vh = this._viewportEl.clientHeight || 300;
    const zoom = Math.min(1.05, Math.max(0.28, Math.min(vw / tree.width, vh / tree.height)));
    this._cam.zoom = zoom;
    this._cam.tx = vw / 2 - (tree.width / 2) * zoom;
    this._cam.ty = vh / 2 - (tree.height / 2) * zoom;
    this._applyTransform(animate);
  }

  _applyTransform(animate = false, durationMs = 200) {
    if (!this._worldEl) return;
    this._worldEl.style.transition = animate ? `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none';
    this._worldEl.style.transform = `translate3d(${this._cam.tx}px, ${this._cam.ty}px, 0) scale(${this._cam.zoom})`;
  }

  _renderInspector() {}

  _bindEvents() {
    const vp = this._viewportEl;
    const rootEl = this._container ? this._container.firstElementChild : null;
    if (!vp || !rootEl) return;

    const getLocalPos = (e) => {
      const rect = vp.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    vp.addEventListener('pointerdown', (e) => {
      const isInteractiveTarget = Boolean(e.target.closest('[data-graph-action]') || e.target.closest('[data-portal-target]'));
      if (this._pointers.size === 0 && isInteractiveTarget) return;
      const pos = getLocalPos(e);
      const wasEmpty = this._pointers.size === 0;
      this._pointers.set(e.pointerId, pos);

      if (this._pointers.size === 1) {
        if (wasEmpty) {
          this._wasMultiTouch = false;
          this._dragMoved = false;
          const downCard = e.target.closest('[data-graph-node]');
          this._downNodeId = downCard ? downCard.dataset.graphNode : null;
        }
        this._panStart = { x: pos.x, y: pos.y, tx: this._cam.tx, ty: this._cam.ty };
      } else if (this._pointers.size >= 2) {
        this._wasMultiTouch = true;
        this._dragMoved = true;
        this._downNodeId = null;
        this._panStart = null;
        if (this._pointers.size === 2) {
          const pts = Array.from(this._pointers.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          this._pinchStart = {
            dist: Math.max(10, dist),
            zoom: this._cam.zoom,
            worldMidX: (midX - this._cam.tx) / this._cam.zoom,
            worldMidY: (midY - this._cam.ty) / this._cam.zoom
          };
        }
      }
    });

    vp.addEventListener('pointermove', (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      const pos = getLocalPos(e);
      this._pointers.set(e.pointerId, pos);

      if (this._pointers.size === 2 && this._pinchStart) {
        this._dragMoved = true;
        const pts = Array.from(this._pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const nextZoom = Math.min(1.6, Math.max(0.28, this._pinchStart.zoom * (dist / this._pinchStart.dist)));
        this._cam.zoom = nextZoom;
        this._cam.tx = midX - this._pinchStart.worldMidX * nextZoom;
        this._cam.ty = midY - this._pinchStart.worldMidY * nextZoom;
        this._applyTransform(false);
        return;
      }

      if (this._panStart && this._pointers.size === 1) {
        const dx = pos.x - this._panStart.x;
        const dy = pos.y - this._panStart.y;
        if (!this._dragMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          this._dragMoved = true;
          try { vp.setPointerCapture(e.pointerId); } catch {}
        }
        if (this._dragMoved) {
          this._cam.tx = this._panStart.tx + dx;
          this._cam.ty = this._panStart.ty + dy;
          this._applyTransform(false);
        }
      }
    });

    const onPointerEnd = (e) => {
      const hadPointer = this._pointers.has(e.pointerId);
      const wasTap = e.type === 'pointerup' && hadPointer && !this._dragMoved && !this._wasMultiTouch && this._pointers.size === 1;
      const downNodeId = this._downNodeId;
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._pinchStart = null;
      if (this._pointers.size === 1 && this._wasMultiTouch) {
        const [remPos] = Array.from(this._pointers.values());
        this._panStart = { x: remPos.x, y: remPos.y, tx: this._cam.tx, ty: this._cam.ty };
      }
      if (this._pointers.size === 0) {
        this._panStart = null;
        this._downNodeId = null;
        this._wasMultiTouch = false;
      }

      if (wasTap) {
        if (e.target.closest('[data-portal-target]') || e.target.closest('[data-graph-action]')) return;
        const movId = e.target.closest('[data-graph-node]')?.dataset.graphNode || downNodeId;
        if (movId) {
          this._selectedId = movId;
          this._updateHighlightStates();
          if (typeof this._onInspectMovement === 'function') {
            this._onInspectMovement(movId);
          }
        } else {
          this._selectedId = null;
          this._updateHighlightStates();
        }
      }
    };

    vp.addEventListener('pointerup', onPointerEnd);
    vp.addEventListener('pointercancel', onPointerEnd);

    if (typeof ResizeObserver !== 'undefined') {
      this._lastViewportSize = { w: vp.clientWidth, h: vp.clientHeight };
      this._resizeObserver = new ResizeObserver(() => {
        if (!this._viewportEl) return;
        const vw = this._viewportEl.clientWidth;
        const vh = this._viewportEl.clientHeight;
        if (vw <= 0 || vh <= 0) return;
        const prev = this._lastViewportSize;
        const widthChanged = Math.abs(vw - prev.w) > 40;
        const becameVisible = (prev.w === 0 || prev.h === 0);
        this._lastViewportSize = { w: vw, h: vh };
        if (becameVisible || widthChanged) {
          this._fitActiveTree(false);
        }
      });
      this._resizeObserver.observe(vp);
    }

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getLocalPos(e);
      const wx = (pos.x - this._cam.tx) / this._cam.zoom;
      const wy = (pos.y - this._cam.ty) / this._cam.zoom;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const nextZoom = Math.min(1.6, Math.max(0.28, this._cam.zoom * factor));
      this._cam.zoom = nextZoom;
      this._cam.tx = pos.x - wx * nextZoom;
      this._cam.ty = pos.y - wy * nextZoom;
      this._applyTransform(false);
    }, { passive: false });

    rootEl.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-graph-action]');
      if (actionBtn) {
        const act = actionBtn.dataset.graphAction;
        const vw = vp.clientWidth || 360;
        const vh = vp.clientHeight || 300;
        const cx = vw / 2;
        const cy = vh / 2;
        const wx = (cx - this._cam.tx) / this._cam.zoom;
        const wy = (cy - this._cam.ty) / this._cam.zoom;
        if (act === 'zoom-in') {
          this._cam.zoom = Math.min(1.6, this._cam.zoom * 1.25);
          this._cam.tx = cx - wx * this._cam.zoom;
          this._cam.ty = cy - wy * this._cam.zoom;
          this._applyTransform(true);
        } else if (act === 'zoom-out') {
          this._cam.zoom = Math.max(0.28, this._cam.zoom * 0.8);
          this._cam.tx = cx - wx * this._cam.zoom;
          this._cam.ty = cy - wy * this._cam.zoom;
          this._applyTransform(true);
        } else if (act === 'fit') {
          this._fitActiveTree();
        }
        return;
      }

      const portalBtn = e.target.closest('[data-portal-target]');
      if (portalBtn) {
        e.stopPropagation();
        this.selectNode(portalBtn.dataset.portalTarget, true);
        return;
      }

      const stackBtn = e.target.closest('[data-stack-jump]');
      if (stackBtn) {
        this.switchTree(stackBtn.dataset.stackJump);
        return;
      }

      const focusBtn = e.target.closest('[data-graph-focus]');
      if (focusBtn) {
        this.selectNode(focusBtn.dataset.graphFocus, false);
        return;
      }

      const inspectBtn = e.target.closest('[data-graph-inspect]');
      if (inspectBtn && typeof this._onInspectMovement === 'function') {
        this._onInspectMovement(inspectBtn.dataset.graphInspect);
      }
    });

    this._keyHandler = (e) => {
      if (!this._selectedId || !this._viewportEl || this._viewportEl.offsetParent === null) return;
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowDown') {
        const next = this._adjScaleOut.get(this._selectedId);
        if (next) {
          e.preventDefault();
          this.selectNode(next, false);
        }
      } else if (e.key === 'ArrowUp') {
        const parents = this._adjScaleIn.get(this._selectedId) || [];
        if (parents.length > 0) {
          e.preventDefault();
          this.selectNode(parents[0], false);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const peers = this._adjPeers.get(this._selectedId) || [];
        if (peers.length > 0) {
          e.preventDefault();
          const allPeers = [...peers, this._selectedId];
          const idx = allPeers.indexOf(this._selectedId);
          const step = e.key === 'ArrowRight' ? 1 : -1;
          const nextId = allPeers[(idx + step + allPeers.length) % allPeers.length];
          if (nextId && nextId !== this._selectedId) {
            this.selectNode(nextId, false);
          }
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }
}

const graphViewInstance = new ProgressionGraphView();
export { ProgressionGraphView, graphViewInstance };
