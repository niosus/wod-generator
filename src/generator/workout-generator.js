const MOVEMENT_NAME_TOKENS = {
  run: ['TARMAC', 'PAVEMENT', 'BLACKTOP', 'STRIDE', 'TRACK'],
  pullups: ['CHALK', 'HIGH BAR', 'DEAD HANG', 'STRICT BAR', 'LATS'],
  chin_ups: ['CHALK', 'CHIN BAR', 'DEAD HANG', 'HIGH BAR', 'LATS'],
  chest_to_bar: ['CHALK', 'CHEST TO BAR', 'HIGH PULL', 'DEAD HANG', 'LATS'],
  bar_hang: ['DEAD HANG', 'IRON GRIP', 'STATIC BAR', 'HANG TIME'],
  bar_muscle_up: ['HIGH BAR', 'TURNOVER', 'LOCKOUT', 'ABOVE THE BAR'],
  ring_muscle_up: ['FALSE GRIP', 'HIGH RINGS', 'TURNOVER', 'RING LOCKOUT'],
  ring_dips: ['STILL RINGS', 'WOOD & STRAP', 'RING SUPPORT', 'DEEP DIP'],
  ring_rows: ['STILL RINGS', 'WOOD & STRAP', 'RING PULL', 'INVERTED ROW'],
  parallel_bar_dips: ['PARALLEL BARS', 'FULL LOCKOUT', 'BAR SUPPORT', 'DEEP DIP'],
  bar_inverted_rows: ['PARALLEL BARS', 'BAR ROW', 'IRON FRAME', 'HORIZONTAL PULL'],
  hspu: ['INVERTED', 'HANDSTAND', 'WALL LINE', 'VERTICAL PRESS'],
  pike_pushups: ['INVERTED', 'PIKE LINE', 'WALL LINE', 'VERTICAL PRESS'],
  pushups: ['CHEST TO DECK', 'FLOOR PRESS', 'PLANK LINE', 'LOCKOUT'],
  knee_pushups: ['CHEST TO DECK', 'FLOOR PRESS', 'PLANK LINE', 'CLEAN LOCKOUT'],
  kb_swings: ['PENDULUM', 'CAST IRON', 'RUSSIAN SWING', 'BALLISTIC BELL'],
  kb_snatch: ['CAST IRON', 'BELL PULL', 'HIGH BELL', 'IRON ARC'],
  kb_hang_power_clean: ['CAST IRON', 'BELL PULL', 'FRONT RACK', 'IRON ARC'],
  goblet_squats: ['GOBLET', 'FRONT RACK', 'IRON BELL', 'DEEP SQUAT'],
  kb_thrusters: ['GOBLET', 'FRONT RACK', 'IRON BELL', 'HEAVY BELL'],
  kb_strict_press: ['IRON BELL', 'STRICT PRESS', 'OVERHEAD LOCK', 'HEAVY BELL'],
  kb_push_press: ['FRONT RACK', 'IRON BELL', 'HIP DRIVE', 'HEAVY BELL'],
  kb_push_jerk: ['FRONT RACK', 'IRON BELL', 'SPLIT LOCK', 'HEAVY BELL'],
  kb_deadlifts: ['CAST IRON', 'HEAVY HANDLE', 'BELL HINGE', 'FLOOR PULL'],
  kb_rdl: ['CAST IRON', 'HAMSTRING HINGE', 'BELL HINGE', 'IRON PULL'],
  kb_rfe_rdl: ['CAST IRON', 'SINGLE LEG BELL', 'BELL HINGE', 'IRON PULL'],
  kb_bent_row: ['CAST IRON', 'HEAVY HANDLE', 'BELL ROW', 'IRON PULL'],
  kb_bulgarian_split_squats: ['SPLIT BELL', 'SINGLE LEG IRON', 'LOADED LUNGE', 'IRON BELL'],
  devil_press: ['DEVIL PRESS', 'HEX HEAD', 'FLOOR TO OVERHEAD', 'HEAVY HANDLES'],
  man_makers: ['MAN MAKER', 'HEX HEAD', 'FLOOR TO OVERHEAD', 'HEAVY HANDLES'],
  db_snatch: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_hang_power_clean: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_thrusters: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_strict_press: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_push_press: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_push_jerk: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_front_squats: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_deadlifts: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_rdl: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_rfe_rdl: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_renegade_row: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  db_bulgarian_split_squats: ['HEX HEAD', 'DUMBBELL', 'HEAVY HANDLES', 'IRON PAIR'],
  bb_thrusters: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'FRONT RACK', 'FLOOR PULL'],
  bb_squat_snatch: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'OVERHEAD SQUAT', 'FLOOR PULL'],
  bb_hang_power_clean: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'FRONT RACK', 'HANG PULL'],
  bb_push_jerk: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'FRONT RACK', 'SPLIT LOCK'],
  bb_push_press: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'FRONT RACK', 'HIP DRIVE'],
  bb_strict_press: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'STRICT PRESS', 'LOCKOUT'],
  bb_front_squats: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'FRONT RACK', 'DEEP SQUAT'],
  bb_deadlifts: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'HEAVY PULL', 'FLOOR PULL'],
  bb_rdl: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'HINGE', 'FLOOR PULL'],
  bb_rfe_rdl: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'SINGLE LEG', 'HINGE'],
  bb_bent_row: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'BENT ROW', 'FLOOR PULL'],
  bb_bulgarian_split_squats: ['BARBELL', 'IRON BAR', 'COLLAR TO COLLAR', 'SPLIT SQUAT', 'BACK RACK'],
  pistol_squats: ['PISTOL', 'SINGLE LEG', 'ONE LEG', 'BALANCE POINT'],
  bulgarian_split_squats: ['SPLIT STANCE', 'DEEP LUNGE', 'SINGLE LEG', 'BACK STEP'],
  step_back_lunges: ['SPLIT STANCE', 'DEEP LUNGE', 'SINGLE LEG', 'BACK STEP'],
  walking_lunges: ['SPLIT STANCE', 'DEEP LUNGE', 'SINGLE LEG', 'LONG STRIDE'],
  jumping_lunges: ['SPLIT STANCE', 'PLYO LUNGE', 'SINGLE LEG', 'FAST SWITCH'],
  rfe_rdl: ['SPLIT STANCE', 'SINGLE LEG', 'BALANCE HINGE', 'BACK STEP'],
  air_squats: ['BELOW PARALLEL', 'DEEP SQUAT', 'PISTON', 'OPEN HIP'],
  burpees: ['CHEST TO FLOOR', 'SIX COUNT', 'FLOOR DROP', 'REDLINE'],
  athletic_up_downs: ['SPRAWL', 'DECK DROP', 'FAST FEET', 'REDLINE'],
  double_unders: ['WHIPCORD', 'FAST WRISTS', 'SPEED ROPE', 'FLIGHT TIME'],
  single_unders: ['WHIPCORD', 'FAST WRISTS', 'SPEED ROPE', 'FLIGHT TIME'],
  box_jumps: ['PLYO BOX', 'TIMBER', 'HIGH STEP', 'BOX TOP'],
  box_step_ups: ['PLYO BOX', 'TIMBER', 'HIGH STEP', 'BOX TOP'],
  wall_balls: ['TEN FOOT LINE', 'WALL TARGET', 'MEDICINE BALL', 'HIGH TARGET'],
  row_erg_cal: ['FLYWHEEL', 'DAMPER TEN', 'LONG STROKE', 'ERG CHAIN'],
  bike_erg_cal: ['AIR BIKE', 'HEADWIND', 'FAN WHEEL', 'PEDAL STROKE'],
  ski_erg_cal: ['NORDIC PULL', 'SKI CORDS', 'DOUBLE POLE', 'TOP SHELF'],
  toes_to_bar: ['HANGING CORE', 'HIGH BAR', 'KIP & TUCK', 'MIDLINE'],
  knees_to_elbows: ['HANGING CORE', 'HIGH BAR', 'KIP & TUCK', 'MIDLINE'],
  hanging_knee_raises: ['HANGING CORE', 'HIGH BAR', 'KIP & TUCK', 'MIDLINE'],
  l_sit: ['HOLLOW HOLD', 'STATIC CORE', 'ISOMETRIC', 'IRON MIDLINE'],
  plank: ['HOLLOW HOLD', 'STATIC CORE', 'ISOMETRIC', 'IRON MIDLINE'],
  knee_plank: ['HOLLOW HOLD', 'STATIC CORE', 'ISOMETRIC', 'IRON MIDLINE'],
  straight_arm_plank: ['HOLLOW HOLD', 'STATIC CORE', 'ISOMETRIC', 'IRON MIDLINE'],
  side_plank: ['HOLLOW HOLD', 'STATIC CORE', 'ISOMETRIC', 'IRON MIDLINE'],
  situps: ['MIDLINE', 'HOLLOW ROCK', 'JACKKNIFE', 'CORE LINE'],
  v_ups: ['MIDLINE', 'HOLLOW ROCK', 'JACKKNIFE', 'CORE LINE'],
  tuck_ups: ['MIDLINE', 'HOLLOW ROCK', 'JACKKNIFE', 'CORE LINE'],
  jumping_jacks: ['FAST FEET', 'HIGH STEP', 'FLOOR PACE', 'HIGH TURNOVER'],
  mountain_climbers: ['FAST FEET', 'HIGH STEP', 'FLOOR PACE', 'HIGH TURNOVER'],
  table_rows: ['LOW PULL', 'BACK LINE', 'CLEAN PULL', 'FLOOR PULL'],
  doorway_towel_rows: ['LOW PULL', 'BACK LINE', 'CLEAN PULL', 'TOWEL GRIP'],
  superman_pulls: ['LOW PULL', 'BACK LINE', 'CLEAN PULL', 'FLOOR PULL']
};

const FORMAT_NAME_SUFFIXES = {
  FOR_TIME_COUPLET: ['FAST TWITCH', 'REDLINE', 'SHORT FUSE', 'DROP SET', 'BURNDOWN', 'BELL LAP', 'QUICK DRAW', 'NO BRAKES', 'FLASHPOINT', 'SPRINT'],
  FOR_TIME_ROUNDS: ['PACEKEEPER', 'SPLIT TIME', 'NEGATIVE SPLIT', 'BEAT THE CAP', 'CLOSING SPEED', 'CLOCKWORK', 'STEADY BLEED', 'FIVE GEAR', 'STRAIGHT THROUGH'],
  EMOM: ['ON THE BEEP', 'SWING SHIFT', 'METRONOME', 'MINUTE BY MINUTE', 'CADENCE', 'TOP OF THE MINUTE', 'STATION TO STATION', 'CLOCKWORK', 'SIXTY SECOND TAX'],
  INTERVALS: ['TWENTY ON TEN', 'EIGHT COUNT', 'SHORT REST', 'REPEAT OFFENDER', 'SHARP BURSTS', 'TABATA TAX', 'STOP & GO', 'EIGHT ROUNDS DEEP'],
  AMRAP_SHORT: ['OPEN THROTTLE', 'FAST TURNOVER', 'REDLINE PACE', 'HIGH CADENCE', 'SHORT TRACK', 'NO CEILING'],
  AMRAP_MEDIUM: ['SECOND WIND', 'STEADY GRIND', 'LAP COUNTER', 'SUSTAINED OUTPUT', 'WORKING CAP', 'ENGINE ROOM', 'DEEP WATER'],
  AMRAP_LONG: ['LONG HAUL', 'DEEP WATER', 'ENDURANCE TAX', 'DIESEL PACE', 'ROUND AFTER ROUND', 'THIRTY MINUTE GRIT', 'IRON LUNGS']
};

const FORMAT_HEADLINE_MODIFIERS = {
  FOR_TIME_COUPLET: ['SPRINT', 'BLITZ', 'BURNDOWN', 'REDLINE', 'CHECK'],
  FOR_TIME_ROUNDS: ['PACE', 'SPLIT', 'CLOCK', 'GRIND', 'TAX'],
  EMOM: ['SHIFT', 'CADENCE', 'CLOCK', 'TICK', 'TAX'],
  INTERVALS: ['BURST', 'COUNT', 'TAX', 'BLITZ', 'PACE'],
  AMRAP_SHORT: ['THROTTLE', 'CADENCE', 'SPRINT', 'PACE', 'CHECK'],
  AMRAP_MEDIUM: ['GRIND', 'ENGINE', 'PACE', 'LAP', 'OUTPUT'],
  AMRAP_LONG: ['HAUL', 'GRIT', 'PACE', 'LUNGS', 'TAX']
};

const WOD_ARCHETYPE_RULES = [
  {
    id: 'run_bar',
    match: p => p.ids.has('run') && (p.equipments.has('pullup_bar') || p.ids.has('pullups') || p.ids.has('chin_ups')),
    names: ['CHALK & LUNGS', 'DEAD HANG MILE', 'BAR & PAVEMENT', 'TARMAC & LATS', 'STRIDE & PULL', 'BLACKTOP & CHALK']
  },
  {
    id: 'run_kb',
    match: p => p.ids.has('run') && p.equipments.has('kettlebell'),
    names: ['BELL & PAVEMENT', 'RUSSIAN MILE', 'IRON STRIDE', 'SWING & STRIDE', 'CAST IRON PACE', 'BALLISTIC LUNGS']
  },
  {
    id: 'kb_bar_rings',
    match: p => p.equipments.has('kettlebell') && (p.equipments.has('pullup_bar') || p.equipments.has('gym_rings')),
    names: ['CHALK & KETTLE', 'SWING & KIP', 'BELL & BAR', 'IRON & RINGS', 'PENDULUM & PULL', 'HOOK & BELL']
  },
  {
    id: 'kb_heavy',
    match: p => p.kbCount >= 2 || (p.ids.has('kb_swings') && ['goblet_squats', 'kb_snatch', 'kb_hang_power_clean', 'kb_thrusters'].some(id => p.ids.has(id))),
    names: ['CAST IRON FOUNDRY', 'SWING SHIFT', 'RUSSIAN STEEL', 'BELL RINGER', 'BALLISTIC IRON', 'CANNONBALL']
  },
  {
    id: 'bb_gymnastics',
    match: p => p.equipments.has('barbell') && (p.equipments.has('pullup_bar') || p.equipments.has('gym_rings') || p.ids.has('burpees') || p.ids.has('hspu') || p.ids.has('toes_to_bar') || p.ids.has('pistol_squats')),
    names: ['BARBELL & CHALK', 'COLLAR TO COLLAR', 'CLEAN & KIP', 'IRON & OXYGEN', 'RACK & PULL', 'REDLINE BARBELL']
  },
  {
    id: 'db_featured',
    match: p => p.equipments.has('dumbbell'),
    names: ["DEVIL'S DUE", 'HEX HEAD HUSTLE', 'DOUBLE DUMBBELL', 'DUMBBELL TAX', 'HEAVY HANDLES', 'FLOOR TO OVERHEAD']
  },
  {
    id: 'high_skill_gym',
    match: p => ['hspu', 'ring_muscle_up', 'bar_muscle_up', 'pistol_squats', 'l_sit', 'toes_to_bar'].some(id => p.ids.has(id)),
    names: ['GRAVITY CHECK', 'FALSE GRIP', 'INVERTED TAX', 'CHALK DUST', 'STRICT LIABILITY', 'HIGH WIRE', 'HOLLOW BODY', 'ABOVE THE RINGS']
  },
  {
    id: 'rope_core',
    match: p => (p.ids.has('double_unders') || p.ids.has('single_unders')) && (p.patterns.has('HINGE_CORE') || p.equipments.has('bodyweight')),
    names: ['WIRE & CORE', 'WHIP & SNAP', 'FAST WRISTS', 'ROPE BURN', 'FLIGHT TIME', 'CORD & MIDLINE', 'DOUBLE TAP']
  },
  {
    id: 'erg_weighted',
    match: p => (p.equipments.has('row_erg') || p.equipments.has('bike_erg') || p.equipments.has('ski_erg')) && (p.equipments.has('kettlebell') || p.equipments.has('dumbbell') || p.equipments.has('barbell') || p.ids.has('burpees') || p.ids.has('athletic_up_downs')),
    names: ['DAMPER TEN', 'FLYWHEEL & IRON', 'CALORIE TAX', 'ERG & FLOOR', 'HEADWIND', 'PULL THE CHAIN', 'FAN & FLOOR']
  },
  {
    id: 'wallball_combo',
    match: p => p.ids.has('wall_balls') && (p.equipments.has('plyo_box') || p.equipments.has('row_erg') || p.equipments.has('bike_erg') || p.equipments.has('ski_erg') || p.ids.has('burpees')),
    names: ['TARGET PRACTICE', 'TWENTY FOOT TARGET', 'PAINT THE LINE', 'MEDICINE & LUNGS', 'SQUAT & THROW', 'BOX & BALL']
  },
  {
    id: 'grip_tax',
    match: p => p.gripCount >= 2,
    names: ['FOREARM TAX', 'HOOK GRIP', 'DEAD HANG GRIT', 'CHALK BUCKET', 'KNUCKLE DOWN', 'WHITE KNUCKLE', 'NEVER DROP']
  },
  {
    id: 'leg_burner',
    match: p => p.legCount >= 2,
    names: ['JELLY LEGS', 'QUAD TAX', 'LACTIC TRACK', 'HEAVY WHEELS', 'SPLIT & STRIDE', 'PISTOL PACE', 'BELOW PARALLEL']
  },
  {
    id: 'pure_bodyweight',
    match: p => p.isPureBodyweight,
    names: ['NO IRON NEEDED', 'OWN YOUR WEIGHT', 'BODYWEIGHT TAX', 'CALISTHENIC PACE', 'FLOOR & FRAME', 'DECK & BAR', 'GRAVITY ALONE', 'CLEAN REPS']
  },
  {
    id: 'couplet_21_15_9',
    match: p => p.format === 'FOR_TIME' && p.isDescendingCouplet,
    names: ['FAST TWITCH', 'REDLINE COUPLET', 'SHORT FUSE', 'FINAL NINE', 'DROP SET', 'NO BRAKES', 'TWENTY ONE DOWN', 'SPRINT COUPLET']
  },
  {
    id: 'emom_rotation',
    match: p => p.format === 'EMOM',
    names: ['ON THE BEEP', 'SWING SHIFT', 'CLOCKWORK', 'MINUTE BY MINUTE', 'BEAT THE BEEP', 'STATION TO STATION', 'METRONOME', 'TOP OF THE MINUTE']
  },
  {
    id: 'tabata_intervals',
    match: p => p.format === 'INTERVALS',
    names: ['TWENTY ON TEN', 'EIGHT COUNT', 'TABATA TAX', 'SHORT REST', 'SHARP BURSTS', 'REPEAT OFFENDER', 'EIGHT ROUNDS DEEP']
  }
];

const WorkoutGenerator = {
  INTENSITY_TIERS: ['moderate', 'standard', 'high'],

  normalizeIntensity(level) {
    return this.INTENSITY_TIERS.includes(level) ? level : 'standard';
  },

  /**
   * Returns work/rest seconds per 30s Tabata interval for the given intensity tier,
   * preserving the 4-minute (8x 30s) block duration across all tiers.
   */
  getIntervalSplit(intensityLevel = 'standard') {
    const tier = this.normalizeIntensity(intensityLevel);
    if (tier === 'moderate') return { work: 15, rest: 15 };
    if (tier === 'high') return { work: 25, rest: 5 };
    return { work: 20, rest: 10 };
  },

  isUnilateral(mov) {
    return Boolean(mov && (mov.unilateral === 'split' || mov.unilateral === 'alternating'));
  },

  ensureEvenUnilateralValue(mov, val) {
    if (!this.isUnilateral(mov) || typeof val !== 'number') return val;
    if (mov.unit === 'sec') {
      return val % 2 !== 0 ? val + 5 : val;
    }
    if (mov.unit === 'reps' || !mov.unit) {
      return val % 2 !== 0 ? val + 1 : val;
    }
    return val;
  },

  formatUnilateralBreakdown(mov, repVal, formatKey, compact = false) {
    if (!this.isUnilateral(mov)) return '';
    if (formatKey === 'INTERVALS') {
      if (compact) return '(Alt L/R)';
      return mov.unilateral === 'split' ? '— Alt L/R each interval' : '— Alt L/R each rep';
    }
    if (typeof repVal === 'number') {
      if (repVal % 2 !== 0) {
        return compact ? '(Alt L/R)' : '— Alt L/R';
      }
      const half = repVal / 2;
      if (mov.unit === 'sec') {
        return compact ? `(${half}s L/R)` : `(${half}s L / ${half}s R)`;
      }
      if (mov.unit === 'reps' || !mov.unit) {
        return compact ? `(${half} L/R)` : `(${half} L / ${half} R)`;
      }
    }
    if (typeof repVal === 'string' && /^\d+(\s*-\s*\d+)+$/.test(repVal.trim())) {
      const halves = repVal.split('-').map(n => Math.round(Number(n.trim()) / 2)).join('-');
      return compact ? `(${halves} L/R)` : `(${halves} L / R)`;
    }
    return '';
  },

  /**
   * Returns the stepped descending couplet rep or distance scheme for the given tier.
   */
  getDescendingCoupletScheme(mov, intensityLevel = 'standard', hasVeryHighSkill = false) {
    const tier = this.normalizeIntensity(intensityLevel);
    if (mov && mov.unit === 'm') {
      if (tier === 'moderate') return '300m - 200m - 100m';
      if (tier === 'high') return '500m - 400m - 300m';
      return '400m - 300m - 200m';
    }
    if (this.isUnilateral(mov)) {
      if (hasVeryHighSkill) {
        if (tier === 'moderate') return '12 - 8 - 4';
        if (tier === 'high') return '20 - 16 - 10';
        return '16 - 12 - 8';
      }
      if (tier === 'moderate') return '16 - 12 - 8';
      if (tier === 'high') return '28 - 20 - 12';
      return '20 - 16 - 12';
    }
    if (hasVeryHighSkill) {
      if (tier === 'moderate') return '12 - 9 - 6';
      if (tier === 'high') return '21 - 15 - 9';
      return '15 - 12 - 9';
    }
    if (tier === 'moderate') return '15 - 12 - 9';
    if (tier === 'high') return '27 - 21 - 15';
    return '21 - 15 - 9';
  },

  /**
   * Formats a clean clock/time-cap badge label consistently across all workouts.
   */
  getClockBadgeLabel(wod) {
    if (!wod || !wod.minutes) return '';
    return wod.format === 'FOR_TIME' ? `${wod.minutes}:00 Cap` : `${wod.minutes}:00`;
  },

  /**
   * Strips redundant time-cap or minute-duration phrasing from a prescription
   * header since duration/cap is displayed in the dedicated clock badge.
   */
  formatBannerPrescriptionHeader(header, formatKey = '') {
    if (!header || typeof header !== 'string') return '';
    let out = header.trim();

    // "For Time (25 Min Cap): Rest..." -> "For Time — Rest..." (or "For Time:" if nothing follows)
    out = out.replace(/^For Time\s*\(\d+\s*Min(?:ute)?s?\s*(?:Time\s*)?Cap\)\s*:\s*(.+)$/i, 'For Time — $1');
    out = out.replace(/^For Time\s*\(\d+\s*Min(?:ute)?s?\s*(?:Time\s*)?Cap\)\s*:$/i, 'For Time:');
    // Trailing "(16 Min Cap)" or "(16 Min Time Cap)"
    out = out.replace(/\s*\(\d+\s*Min(?:ute)?s?\s*(?:Time\s*)?Cap\)/gi, '');
    // "AMRAP in 20 Minutes (extra):" -> "AMRAP (extra):" or "AMRAP in 20 Minutes:" -> "AMRAP • Max Rounds & Reps:"
    if (/^AMRAP in \d+\s*Min(?:ute)?s?:$/i.test(out)) {
      return 'AMRAP • Max Rounds & Reps:';
    }
    out = out.replace(/^AMRAP in \d+\s*Min(?:ute)?s?\s*/i, 'AMRAP ');
    // "Every Minute on the Minute for 30 Minutes:" -> "EMOM:"
    out = out.replace(/^Every Minute on the Minute for \d+\s*Min(?:ute)?s?\s*:$/i, 'EMOM:');
    out = out.replace(/^Every Minute on the Minute for \d+\s*Min(?:ute)?s?\s*/i, 'EMOM ');
    // "16 Minute EMOM (...):" -> "EMOM (...):"
    out = out.replace(/^\d+\s*Min(?:ute)?s?\s*EMOM\b/i, 'EMOM');
    // Normalize "For Time: Foo:" -> "For Time — Foo:"
    out = out.replace(/^For Time:\s*(.+:)$/i, 'For Time — $1');

    if (formatKey === 'AMRAP' && /^AMRAP:$/i.test(out)) {
      return 'AMRAP • Max Rounds & Reps:';
    }

    return out.replace(/\s{2,}/g, ' ').replace(/\s+:/g, ':').trim();
  },

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  /**
   * Deterministic 32-bit FNV-1a hash for mapping a canonical workout signature
   * to a reproducible integer.
   */
  hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  },

  /**
   * Returns evocative movement-specific imagery tokens, falling back by
   * equipment and biomechanical pattern for unrecognized movements.
   */
  getMovementNameTokens(mov) {
    if (mov && mov.id && MOVEMENT_NAME_TOKENS[mov.id]) {
      return MOVEMENT_NAME_TOKENS[mov.id];
    }
    const eqFallback = {
      kettlebell: ['CAST IRON', 'IRON BELL'],
      dumbbell: ['HEX HEAD', 'IRON PAIR'],
      barbell: ['BARBELL', 'IRON BAR'],
      pullup_bar: ['CHALK', 'HIGH BAR'],
      gym_rings: ['STILL RINGS', 'RING SUPPORT'],
      parallel_bars: ['PARALLEL BARS', 'IRON FRAME'],
      plyo_box: ['PLYO BOX', 'TIMBER'],
      wall_ball: ['WALL TARGET', 'MEDICINE BALL'],
      jump_rope: ['WHIPCORD', 'SPEED ROPE'],
      row_erg: ['FLYWHEEL', 'DAMPER TEN'],
      bike_erg: ['AIR BIKE', 'HEADWIND'],
      ski_erg: ['NORDIC PULL', 'SKI CORDS'],
      running_area: ['TARMAC', 'PAVEMENT']
    };
    if (mov && mov.equipment && eqFallback[mov.equipment]) {
      return eqFallback[mov.equipment];
    }
    const patFallback = {
      PUSH: ['LOCKOUT', 'FLOOR PRESS'],
      PULL: ['CLEAN PULL', 'BACK LINE'],
      SQUAT: ['BELOW PARALLEL', 'DEEP SQUAT'],
      HINGE_CORE: ['MIDLINE', 'IRON HINGE'],
      CARDIO: ['REDLINE', 'LUNGS'],
      FULL_BODY: ['FULL BODY', 'CHEST TO FLOOR']
    };
    return (mov && mov.pattern && patFallback[mov.pattern]) || ['CHALK', 'GRIT'];
  },

  getFormatSuffixBucket(format, durationCategory = 'medium', isDescendingCouplet = false) {
    if (format === 'FOR_TIME') {
      return isDescendingCouplet ? 'FOR_TIME_COUPLET' : 'FOR_TIME_ROUNDS';
    }
    if (format === 'EMOM') return 'EMOM';
    if (format === 'INTERVALS') return 'INTERVALS';
    if (durationCategory === 'short') return 'AMRAP_SHORT';
    if (durationCategory === 'long') return 'AMRAP_LONG';
    return 'AMRAP_MEDIUM';
  },

  buildNamingProfile(sortedMovements, format, durationCategory, isDescendingCouplet) {
    const ids = new Set(sortedMovements.map(m => m.id));
    const equipments = new Set(sortedMovements.map(m => m.equipment));
    const patterns = new Set(sortedMovements.map(m => m.pattern));
    const gripGear = new Set(['pullup_bar', 'gym_rings', 'kettlebell', 'dumbbell', 'barbell']);
    const legIds = new Set(['box_jumps', 'box_step_ups', 'run', 'wall_balls', 'kb_thrusters', 'db_thrusters', 'bb_thrusters', 'bb_squat_snatch']);
    const calisthenicsGear = new Set(['bodyweight', 'pullup_bar', 'gym_rings', 'parallel_bars']);

    return {
      ids,
      equipments,
      patterns,
      format,
      durationCategory,
      isDescendingCouplet,
      kbCount: sortedMovements.filter(m => m.equipment === 'kettlebell').length,
      gripCount: sortedMovements.filter(m => gripGear.has(m.equipment)).length,
      legCount: sortedMovements.filter(m => m.pattern === 'SQUAT' || legIds.has(m.id)).length,
      isPureBodyweight: sortedMovements.every(m => calisthenicsGear.has(m.equipment))
    };
  },

  /**
   * Generates a deterministic, context-aware CrossFit/conditioning workout title
   * tied to the workout's actual movements, equipment, and format.
   */
  generateName(context = {}) {
    const rawMovements = Array.isArray(context.movements)
      ? context.movements
      : (Array.isArray(context.items) ? context.items.map(it => it?.movement || it) : []);

    const seenIds = new Set();
    const sortedMovements = rawMovements
      .filter(m => {
        if (!m || !m.id || seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    if (sortedMovements.length === 0) {
      return 'CHALK & LUNGS';
    }

    const format = context.format || 'AMRAP';
    const durationCategory = context.durationCategory || 'medium';
    const isDescendingCouplet = Boolean(context.isDescendingCouplet);

    const sigKey = `${format}:${sortedMovements.map(m => m.id).join('-')}`;
    const hash = this.hashString(sigKey);

    const shareSignificantWord = (a, b) => {
      const wordsA = new Set(a.split(/[\s&/-]+/).filter(w => w.length >= 3));
      return b.split(/[\s&/-]+/).some(w => w.length >= 3 && wordsA.has(w));
    };

    const candidateSet = new Set();
    const addCandidate = name => {
      if (name && typeof name === 'string') {
        candidateSet.add(name.trim());
      }
    };

    const profile = this.buildNamingProfile(sortedMovements, format, durationCategory, isDescendingCouplet);
    WOD_ARCHETYPE_RULES.forEach(rule => {
      if (rule.match(profile)) {
        rule.names.forEach(addCandidate);
      }
    });

    // Movement-pair titles (<TokenA> & <TokenB>) from distinct movement token lists
    const tokenLists = [];
    const seenTokenKeys = new Set();
    sortedMovements.forEach(mov => {
      const tokens = this.getMovementNameTokens(mov);
      const key = tokens.join('|');
      if (!seenTokenKeys.has(key)) {
        seenTokenKeys.add(key);
        tokenLists.push(tokens);
      }
    });

    for (let i = 0; i < tokenLists.length; i++) {
      for (let j = i + 1; j < tokenLists.length; j++) {
        for (const tokenA of tokenLists[i]) {
          if (tokenA.includes('&')) continue;
          for (const tokenB of tokenLists[j]) {
            if (tokenB.includes('&') || tokenA === tokenB) continue;
            if (shareSignificantWord(tokenA, tokenB)) continue;
            const paired = `${tokenA} & ${tokenB}`;
            if (paired.length <= 24) {
              addCandidate(paired);
            }
          }
        }
      }
    }

    // Movement + format/stimulus titles
    const bucket = this.getFormatSuffixBucket(format, durationCategory, isDescendingCouplet);
    const suffixes = FORMAT_NAME_SUFFIXES[bucket] || FORMAT_NAME_SUFFIXES.AMRAP_MEDIUM;
    const modifiers = FORMAT_HEADLINE_MODIFIERS[bucket] || FORMAT_HEADLINE_MODIFIERS.AMRAP_MEDIUM;

    sortedMovements.forEach(mov => {
      const tokens = this.getMovementNameTokens(mov);
      for (const tok of tokens) {
        if (tok.includes('&')) continue;
        const tokWords = tok.split(/\s+/).length;
        for (const mod of modifiers) {
          if (shareSignificantWord(tok, mod)) continue;
          const combo = `${tok} ${mod}`;
          if (tokWords + 1 <= 3 && combo.length <= 24) {
            addCandidate(combo);
          }
        }
        for (const suf of suffixes) {
          const sufWords = suf.split(/\s+/).length;
          if (tokWords + sufWords > 3 || suf.includes('&') || shareSignificantWord(tok, suf)) continue;
          const combo = `${tok} ${suf}`;
          if (combo.length <= 24) {
            addCandidate(combo);
          }
        }
      }
    });

    if (candidateSet.size < 6) {
      suffixes.forEach(addCandidate);
    }

    const candidates = Array.from(candidateSet);
    const mixed = (hash ^ (hash >>> 16)) >>> 0;
    return candidates[mixed % candidates.length];
  },

  /**
   * Snaps a raw rep count to standard functional fitness rep cadences.
   */
  snapToStandardReps(val, unit, minVal = 3, maxVal = 100) {
    const clamped = Math.max(minVal, Math.min(maxVal, Math.round(val)));
    if (unit === 'cal') {
      const standardCals = [8, 10, 12, 14, 15, 18, 20, 22, 25, 30];
      return standardCals.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (unit === 'm') {
      const standardDist = [100, 200, 300, 400, 800];
      return standardDist.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 7) return clamped;
    if (clamped <= 16) {
      const standardMid = [6, 8, 10, 12, 14, 15, 16];
      return standardMid.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 30) {
      const standardLarge = [18, 20, 22, 24, 25, 30];
      return standardLarge.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    if (clamped <= 60) {
      const standardHuge = [30, 35, 40, 45, 50, 55, 60];
      return standardHuge.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
    }
    return Math.round(clamped / 5) * 5;
  },

  /**
   * Dynamic Workload & Rep Engine:
   * Replaces static hardcoded reps by calculating target volume based on:
   * 1) Biomechanical intensity & cadence (repSec) of the movement
   * 2) Workout format (EMOM vs AMRAP vs FOR_TIME)
   * 3) Workout duration (short, medium, long) & set count
   * 4) Muscular interference: reduces local rep load if multiple exercises share prime movers
   */
  calculateDynamicReps(mov, formatKey, context = {}) {
    const duration = context.durationCategory || globalThis.AppState?.duration || 'medium';
    const intensityLevel = this.normalizeIntensity(context.intensity);
    const intensity = mov.intensity || 1.8;
    const repSec = mov.repSec || 1.5;
    const unit = mov.unit || 'reps';
    const roundMovements = context.roundMovements || [];

    // Calculate muscular overlap across other movements in the round
    let muscularOverlapCount = 0;
    if (Array.isArray(mov.muscleFocus) && roundMovements.length > 1) {
      roundMovements.forEach(other => {
        if (other && other.id !== mov.id && Array.isArray(other.muscleFocus)) {
          const hasSharedMuscle = other.muscleFocus.some(m => mov.muscleFocus.includes(m));
          if (hasSharedMuscle) muscularOverlapCount++;
        }
      });
    }

    // Fatigue modifier: reduce reps per station if multiple exercises fatigue the same muscles
    const interferenceMod = muscularOverlapCount > 0 ? (1 / (1 + 0.30 * muscularOverlapCount)) : 1.0;

    // Unit-specific overrides for meters, calories, and seconds
    if (unit === 'sec') {
      const baseSec = (mov.reps && mov.reps[formatKey === 'EMOM' ? 'emom' : (formatKey === 'FOR_TIME' ? 'forTime' : 'amrap')]) || 40;
      const intensityFactor = intensityLevel === 'moderate' ? 0.75 : (intensityLevel === 'high' ? 1.25 : 1.0);
      const durFactor = duration === 'short' ? 0.9 : (duration === 'long' ? 1.1 : 1.0);
      return this.ensureEvenUnilateralValue(mov, Math.round((baseSec * intensityFactor * durFactor) / 5) * 5);
    }
    if (unit === 'm') {
      if (formatKey === 'EMOM') {
        if (intensityLevel === 'moderate') return 150;
        if (intensityLevel === 'high') return 250;
        return 200;
      }
      if (duration === 'long') {
        if (intensityLevel === 'moderate') return 300;
        if (intensityLevel === 'high') return 500;
        return 400;
      }
      if (intensityLevel === 'moderate') return 150;
      if (intensityLevel === 'high') return 250;
      return 200;
    }
    if (unit === 'cal') {
      if (formatKey === 'EMOM') {
        const baseCal = intensityLevel === 'moderate' ? 12 : (intensityLevel === 'high' ? 18 : 15);
        const durMod = duration === 'short' ? 1.05 : (duration === 'long' ? 0.95 : 1.0);
        return this.snapToStandardReps(baseCal * durMod, 'cal');
      }
      const baseCal = intensityLevel === 'moderate' ? 12 : (intensityLevel === 'high' ? 20 : 16);
      return this.snapToStandardReps(baseCal, 'cal');
    }

    // Jump rope specific logic
    if (mov.id === 'double_unders') {
      if (formatKey === 'EMOM') {
        const baseDU = intensityLevel === 'moderate' ? 35 : (intensityLevel === 'high' ? 60 : 45);
        return Math.round(baseDU / 5) * 5;
      }
      if (formatKey === 'FOR_TIME') {
        const baseDU = intensityLevel === 'moderate' ? 35 : (intensityLevel === 'high' ? 60 : 45);
        return Math.round(baseDU / 5) * 5;
      }
      const baseDU = intensityLevel === 'moderate' ? 30 : (intensityLevel === 'high' ? 50 : 40);
      return Math.round(baseDU / 5) * 5;
    }
    if (mov.id === 'single_unders') {
      if (formatKey === 'EMOM') {
        const baseSU = intensityLevel === 'moderate' ? 60 : (intensityLevel === 'high' ? 95 : 75);
        return Math.round(baseSU / 5) * 5;
      }
      const baseSU = intensityLevel === 'moderate' ? 50 : (intensityLevel === 'high' ? 80 : 60);
      return Math.round(baseSU / 5) * 5;
    }

    // 1. EMOM Format: Target ~40-50 seconds of consistent work per minute (leaving 10-20s rest)
    if (formatKey === 'EMOM') {
      const baseEmom = (mov.reps && mov.reps.emom) ? mov.reps.emom : 12;
      // Intensity factor: moderate ~0.80, standard ~1.00, high ~1.25 (fitter athletes complete faster)
      const intensityFactor = intensityLevel === 'moderate' ? 0.80 : (intensityLevel === 'high' ? 1.25 : 1.00);
      const durFactor = duration === 'short' ? 1.05 : (duration === 'long' ? 0.95 : 1.0);

      let rawReps = baseEmom * intensityFactor * durFactor * interferenceMod;

      // Safety ceilings calibrated by tier (fitter athletes clear higher rep targets within 60s)
      if (mov.id === 'pushups') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 18 : (intensityLevel === 'standard' ? 15 : 12));
      else if (mov.id === 'burpees') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 14 : (intensityLevel === 'standard' ? 12 : 10));
      else if (mov.id === 'pullups') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 12 : (intensityLevel === 'standard' ? 10 : 8));
      else if (mov.id === 'chest_to_bar') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 10 : (intensityLevel === 'standard' ? 8 : 6));
      else if (mov.id === 'hspu') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 10 : (intensityLevel === 'standard' ? 8 : 6));
      else if (mov.id === 'ring_muscle_up' || mov.id === 'bar_muscle_up') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 6 : (intensityLevel === 'standard' ? 4 : 3));
      else if (mov.id === 'ring_dips' || mov.id === 'parallel_bar_dips') rawReps = Math.min(rawReps, intensityLevel === 'high' ? 14 : (intensityLevel === 'standard' ? 10 : 8));

      return this.ensureEvenUnilateralValue(mov, this.snapToStandardReps(rawReps, unit, 3, 50));
    }

    // Intensity scaling multiplier for FOR_TIME and AMRAP
    const intensityScale = intensityLevel === 'moderate' ? 0.8 : (intensityLevel === 'high' ? 1.25 : 1.0);
    const durFactor = duration === 'short' ? 1.05 : (duration === 'long' ? 0.90 : 1.0);

    // 2. FOR_TIME Format: Scale around movement's calibrated forTime baseline
    if (formatKey === 'FOR_TIME') {
      const baseForTime = (mov.reps && mov.reps.forTime) ? mov.reps.forTime : 15;
      const rawReps = baseForTime * intensityScale * durFactor * interferenceMod;
      return this.ensureEvenUnilateralValue(mov, this.snapToStandardReps(rawReps, unit, 3, 80));
    }

    // 3. AMRAP Format (Default): Scale around movement's calibrated amrap baseline
    const baseAmrap = (mov.reps && mov.reps.amrap) ? mov.reps.amrap : 12;
    const rawReps = baseAmrap * intensityScale * durFactor * interferenceMod;
    return this.ensureEvenUnilateralValue(mov, this.snapToStandardReps(rawReps, unit, 3, 80));
  },

  /**
   * Filters a candidate movement pool using the same progression-ladder,
   * hard-skill, and pattern-level easy rules applied during workout selection.
   */
  getSelectionSourcePool(pool, count) {
    if (!Array.isArray(pool) || pool.length === 0) return [];

    // 1. Filter down to hardest allowed movement of each scale ladder
    const effectivePool = globalThis.AppState && typeof globalThis.AppState.getHardestAllowedMovementPool === 'function'
      ? globalThis.AppState.getHardestAllowedMovementPool()
      : pool;

    let sourcePool = effectivePool.length >= count ? effectivePool : pool;

    // Strict Hard Movement Protection: never select hard movements when includeHardMovements is off
    if (!globalThis.AppState?.includeHardMovements) {
      sourcePool = sourcePool.filter(m => m.difficulty !== 'hard');
    }

    // 2. Pattern-level Easy filter:
    // Unless the athlete explicitly requested the "easy" tier,
    // never select an "easy" movement in any pattern where normal or hard movements exist.
    if (globalThis.AppState?.activeDiffFilter !== 'easy') {
      const byPat = {};
      sourcePool.forEach(m => {
        if (!byPat[m.pattern]) byPat[m.pattern] = [];
        byPat[m.pattern].push(m);
      });

      const filtered = [];
      Object.values(byPat).forEach(movs => {
        const nonEasy = movs.filter(m => m.difficulty !== 'easy');
        if (nonEasy.length > 0) {
          filtered.push(...nonEasy);
        } else {
          // If no normal/hard movement exists for this pattern with current gear, keep easy
          filtered.push(...movs);
        }
      });

      if (filtered.length >= count) {
        sourcePool = filtered;
      }
    }

    return sourcePool;
  },

  /**
   * Movement Selection:
   * 1. Filters the pool to ONLY the hardest allowed movement from each scale ladder.
   *    (e.g., standard push-ups instead of knee push-ups, burpees instead of sprawls,
   *    ring/bar rows instead of table rows, box jumps instead of step-ups).
   * 2. Selects balanced movement patterns across stations.
   */
  selectBalancedMovements(pool, count) {
    if (pool.length === 0) return [];

    const sourcePool = this.getSelectionSourcePool(pool, count);

    const byPattern = {};
    sourcePool.forEach(m => {
      if (!byPattern[m.pattern]) byPattern[m.pattern] = [];
      byPattern[m.pattern].push(m);
    });

    const availablePatterns = this.shuffle(Object.keys(byPattern));
    const selected = [];
    const usedIds = new Set();

    for (const pat of availablePatterns) {
      if (selected.length >= count) break;
      const candidate = this.pickRandom(byPattern[pat]);
      selected.push(candidate);
      usedIds.add(candidate.id);
    }

    const remaining = this.shuffle(sourcePool.filter(m => !usedIds.has(m.id)));
    while (selected.length < count && remaining.length > 0) {
      selected.push(remaining.pop());
    }

    return selected;
  },

  /**
   * Intelligently scales or converts a custom repetition/distance/calorie scheme
   * between two movements (e.g. when substituting an alternative or scale-down).
   *
   * Prevents unit mismatches such as substituting a 1,600m run with 1,600 jumping jacks.
   */
  convertCustomScheme(sourceMov, targetMov, formatKey, customScheme, context = {}) {
    if (customScheme === null || customScheme === undefined) {
      return this.calculateDynamicReps(targetMov, formatKey, context);
    }

    const srcUnit = (sourceMov && sourceMov.unit) || 'reps';
    const tgtUnit = (targetMov && targetMov.unit) || 'reps';

    if (typeof customScheme === 'string') {
      if (/^\d+(\s*-\s*\d+)+$/.test(customScheme)) {
        if (sourceMov?.id === 'double_unders' && targetMov?.id === 'single_unders') {
          return customScheme.split('-').map(n => Math.round(Number(n.trim()) * 2)).join('-');
        }
        if (sourceMov?.id === 'single_unders' && targetMov?.id === 'double_unders') {
          return customScheme.split('-').map(n => Math.max(5, Math.round(Number(n.trim()) / 2))).join('-');
        }
        if (srcUnit === tgtUnit) {
          if (this.isUnilateral(targetMov)) {
            const sep = customScheme.includes(' - ') ? ' - ' : '-';
            return customScheme.split('-').map(n => {
              const v = Math.round(Number(n.trim()));
              return v % 2 !== 0 ? Math.max(2, v - 1) : v;
            }).join(sep);
          }
          return customScheme;
        }
      }
      const numVal = parseFloat(customScheme);
      if (!isNaN(numVal) && String(numVal) === customScheme.trim()) {
        customScheme = numVal;
      } else {
        return srcUnit === tgtUnit ? customScheme : this.calculateDynamicReps(targetMov, formatKey, context);
      }
    }

    if (typeof customScheme === 'number') {
      // 1. Same units: retain scheme (with specific jump-rope scale adjustments)
      if (srcUnit === tgtUnit) {
        if (sourceMov?.id === 'double_unders' && targetMov?.id === 'single_unders') {
          return Math.round(customScheme * 2);
        }
        if (sourceMov?.id === 'single_unders' && targetMov?.id === 'double_unders') {
          return Math.max(5, Math.round((customScheme / 2) / 5) * 5);
        }
        return this.ensureEvenUnilateralValue(targetMov, customScheme);
      }

      // 2. Different units: convert based on relative work volume
      const repKey = formatKey === 'EMOM' ? 'emom' : (formatKey === 'FOR_TIME' ? 'forTime' : 'amrap');
      const srcBase = (sourceMov?.reps && sourceMov.reps[repKey]) || (sourceMov?.reps && sourceMov.reps.forTime) || (sourceMov?.reps && sourceMov.reps.amrap) || 15;
      const tgtBase = (targetMov?.reps && targetMov.reps[repKey]) || (targetMov?.reps && targetMov.reps.forTime) || (targetMov?.reps && targetMov.reps.amrap) || 15;
      const ratio = tgtBase / srcBase;
      const rawVal = customScheme * ratio;

      if (tgtUnit === 'm') {
        if (rawVal >= 400) return Math.round(rawVal / 100) * 100;
        return Math.max(50, Math.round(rawVal / 50) * 50);
      }
      if (tgtUnit === 'cal') {
        if (rawVal >= 30) return Math.round(rawVal / 5) * 5;
        return Math.max(5, Math.round(rawVal));
      }
      if (tgtUnit === 'sec') {
        return this.ensureEvenUnilateralValue(targetMov, Math.max(10, Math.round(rawVal / 5) * 5));
      }
      // Target is standard repetitions
      if (rawVal >= 100) return this.ensureEvenUnilateralValue(targetMov, Math.round(rawVal / 10) * 10);
      if (rawVal >= 20) return this.ensureEvenUnilateralValue(targetMov, Math.round(rawVal / 5) * 5);
      return this.ensureEvenUnilateralValue(targetMov, Math.max(3, Math.round(rawVal)));
    }

    return customScheme;
  },

  extractLoadFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/\b(\d+(?:x\d+)?(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*kg)\b/i);
    return match ? match[1].replace(/\s+/g, ' ').trim() : null;
  },

  cleanBenchmarkLabel(rawLabel, mov, repsVal) {
    if (!rawLabel || typeof rawLabel !== 'string') return mov?.name || '';
    let text = rawLabel.trim();

    // 1. Strip leading Min 1: / Min N: / Minute X:
    text = text.replace(/^Min(?:ute)?\s+(?:\d+|N)\s*:\s*/i, '');

    // 2. Strip weight in kg from parentheticals, keeping non-weight notes like "+1 rep/min"
    text = text.replace(/\(([^)]*\bkg\b[^)]*)\)/gi, (_full, inner) => {
      const cleanedInner = inner
        .replace(/\b\d+(?:x\d+)?(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*kg\b/gi, '')
        .replace(/^\s*[,;•·-]+\s*|\s*[,;•·-]+\s*$/g, '')
        .trim();
      return cleanedInner ? `(${cleanedInner})` : '';
    });

    // 3. Strip redundant distance/rep/calorie prefixes that are already shown in the badge
    text = text
      .replace(/^\(?\s*4\s*\+\s*N\s*\)?\s*/i, '')
      .replace(/^3\s*×\s*N\s+/i, '')
      .replace(/^N\s+/i, '')
      .replace(/^\d+(?:\/\d+)?\s*Cal\s+/i, '')
      .replace(/^\d+(?:-\d+)+\s+/, '');

    if (mov && mov.unit === 'm') {
      text = text.replace(/^\d[\d,]*\s*m\s+/i, '');
      text = text.replace(/\(\s*1,600\s*m\s*\)/gi, '').trim();
    }

    if (typeof repsVal === 'number' || (typeof repsVal === 'string' && /^\d+$/.test(repsVal.trim()))) {
      const numEscaped = String(repsVal).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`^${numEscaped}\\s+`), '');
    }

    text = text.replace(/\(\s*Inside each minute\s*\)/gi, '').trim();

    if (typeof repsVal === 'string' && repsVal.includes('-')) {
      const commaList = repsVal.split('-').map(s => s.trim()).join(', ');
      text = text.replace(`(${commaList})`, '').trim();
    }

    return text.replace(/\s+/g, ' ').trim() || mov?.name || '';
  },

  applyBenchmarkItemFormatting(built, mov, rawLabel, bmFormat, headerLoad = null) {
    if (!built || !rawLabel) return built;
    built.benchmarkCustomLabel = rawLabel;
    built.copyText = rawLabel;

    // Item-level kg overrides header-level kg (for weighted movements), else fall back to movement default load
    const itemLoad = this.extractLoadFromText(rawLabel);
    const effectiveHeaderLoad = mov && mov.load ? headerLoad : null;
    built.loadBadge = itemLoad || effectiveHeaderLoad || mov?.load || null;

    if (bmFormat === 'EMOM') {
      const minMatch = rawLabel.match(/^Min(?:ute)?\s+(\d+|N)\s*:/i);
      built.emomMinuteBadge = minMatch ? `MIN ${minMatch[1].toUpperCase()}` : 'EVERY MIN';
    }

    const calSlashMatch = rawLabel.match(/\b(\d+\/\d+)\s*Cal\b/i);
    if (calSlashMatch) {
      built.repsDisplay = `${calSlashMatch[1]} Cal`;
    }

    built.prescriptionText = this.cleanBenchmarkLabel(rawLabel, mov, built.customScheme);
    return built;
  },

  /**
   * Formats a single movement prescription and attaches collision-free
   * Optional Equipment alternatives and Scale-Down progressions.
   */
  buildItemPrescription(mov, formatKey, stationIndex = null, customScheme = null, usedMovementIds = new Set(), context = {}) {
    const isOptionalGear = globalThis.AppState.isEquipmentOptional(mov.equipment);
    const isMissingGear = !globalThis.AppState.isEquipmentUsable(mov.equipment);
    const repVal = customScheme !== null && customScheme !== undefined
      ? customScheme
      : this.calculateDynamicReps(mov, formatKey, context);

    const unitLabel = mov.unit === 'cal' ? 'Cal' : (mov.unit === 'm' ? 'm' : (mov.unit === 'sec' ? 's' : ''));
    const badgeUnitLabel = mov.unit === 'cal' ? 'Cal' : (mov.unit === 'm' ? 'm' : (mov.unit === 'sec' ? 's' : 'reps'));
    const loadBadge = context.customLoad !== undefined ? context.customLoad : (mov.load || null);
    const loadSuffix = loadBadge ? ` (${loadBadge})` : '';
    const uniCompact = this.formatUnilateralBreakdown(mov, repVal, formatKey, true);
    const uniFull = this.formatUnilateralBreakdown(mov, repVal, formatKey, false);

    const hasTrailingUnit = unitLabel && typeof repVal === 'string' && repVal.trim().endsWith(unitLabel);
    const unitSep = (mov.unit === 'm' || mov.unit === 'sec') ? '' : ' ';
    const unitText = unitLabel && !hasTrailingUnit ? `${unitSep}${unitLabel}` : '';
    const hasTrailingBadgeUnit = badgeUnitLabel && typeof repVal === 'string' && repVal.trim().toLowerCase().endsWith(badgeUnitLabel.toLowerCase());
    const badgeUnitSep = (mov.unit === 'm' || mov.unit === 'sec') ? '' : ' ';
    const badgeUnitText = badgeUnitLabel && !hasTrailingBadgeUnit ? `${badgeUnitSep}${badgeUnitLabel}` : '';
    const isAscendingScheme = typeof repVal === 'string' && repVal.includes('...');

    let emomMinuteBadge = null;
    if (formatKey === 'EMOM') {
      if (isAscendingScheme) {
        emomMinuteBadge = 'MIN N';
      } else if (stationIndex !== null && stationIndex !== undefined) {
        emomMinuteBadge = `MIN ${stationIndex + 1}`;
      }
    }

    let repsDisplay = `${repVal}${badgeUnitText}${uniCompact ? ' ' + uniCompact : ''}`.trim();
    let prescriptionText = mov.name;
    let copyText = `${repVal}${unitText} ${mov.name}${loadSuffix}${uniFull ? ' ' + uniFull : ''}`.replace(/\s+/g, ' ').trim();

    if (formatKey === 'EMOM' && stationIndex !== null && !isAscendingScheme) {
      copyText = `Minute ${stationIndex + 1}: ${repVal}${unitText} ${mov.name}${loadSuffix}${uniFull ? ' ' + uniFull : ''}`.replace(/\s+/g, ' ').trim();
    } else if (formatKey === 'INTERVALS' && stationIndex !== null) {
      const split = this.getIntervalSplit(context.intensity);
      repsDisplay = `8x ${split.work}s:${split.rest}s${uniCompact ? ' ' + uniCompact : ''}`;
      prescriptionText = `${mov.name} (${split.work}s Work / ${split.rest}s Rest)`.replace(/\s+/g, ' ').trim();
      copyText = `Block ${stationIndex + 1} (4 Min): 8x (${split.work}s Max ${mov.name}${loadSuffix} ${uniFull || ''} / ${split.rest}s Rest)`.replace(/\s+/g, ' ').trim();
    }

    // 1. Equipment Alternative (collision-free against usedMovementIds)
    let altPrescription = null;
    if (isOptionalGear || isMissingGear) {
      const altMov = globalThis.AppState.resolveUniqueAlternative(mov, usedMovementIds);
      if (altMov) {
        const altLoad = altMov.load ? ` (${altMov.load})` : '';
        if (formatKey === 'INTERVALS') {
          const split = this.getIntervalSplit(context.intensity);
          const altUni = this.formatUnilateralBreakdown(altMov, null, formatKey, false);
          altPrescription = {
            movement: altMov,
            repVal: null,
            text: `${altMov.name}${altLoad} (${split.work}s:${split.rest}s${altUni ? ' ' + altUni : ''})`.replace(/\s+/g, ' ').trim()
          };
        } else {
          const altRepVal = this.convertCustomScheme(mov, altMov, formatKey, customScheme, context);
          const altUnit = altMov.unit === 'cal' ? 'Cal' : (altMov.unit === 'm' ? 'm' : (altMov.unit === 'sec' ? 's' : ''));
          const altUnitSep = (altMov.unit === 'm' || altMov.unit === 'sec') ? '' : ' ';
          const altUnitStr = altUnit ? `${altUnitSep}${altUnit}` : '';
          const altUni = this.formatUnilateralBreakdown(altMov, altRepVal, formatKey, false);
          altPrescription = {
            movement: altMov,
            repVal: altRepVal,
            text: `${altRepVal}${altUnitStr} ${altMov.name}${altLoad}${altUni ? ' ' + altUni : ''}`.replace(/\s+/g, ' ').trim()
          };
        }
      }
    }

    // 2. Scale-Down Progression Badge (collision-free against usedMovementIds)
    let scaleDownPrescription = null;
    const scaleResolved = globalThis.AppState.resolveScaleDown(mov, usedMovementIds);
    if (scaleResolved) {
      const scMov = scaleResolved.movement;
      const scLoad = scMov.load ? ` (${scMov.load})` : '';
      if (formatKey === 'INTERVALS') {
        const split = this.getIntervalSplit(context.intensity);
        const scUni = this.formatUnilateralBreakdown(scMov, null, formatKey, false);
        scaleDownPrescription = {
          movement: scMov,
          repVal: null,
          note: scaleResolved.note,
          text: `${scMov.name}${scLoad} (${split.work}s:${split.rest}s${scUni ? ' ' + scUni : ''})`.replace(/\s+/g, ' ').trim()
        };
      } else {
        const scRepVal = this.convertCustomScheme(mov, scMov, formatKey, customScheme, context);
        const scUnit = scMov.unit === 'cal' ? 'Cal' : (scMov.unit === 'm' ? 'm' : (scMov.unit === 'sec' ? 's' : ''));
        const scUnitSep = (scMov.unit === 'm' || scMov.unit === 'sec') ? '' : ' ';
        const scUnitStr = scUnit ? `${scUnitSep}${scUnit}` : '';
        const scUni = this.formatUnilateralBreakdown(scMov, scRepVal, formatKey, false);
        scaleDownPrescription = {
          movement: scMov,
          repVal: scRepVal,
          note: scaleResolved.note,
          text: `${scRepVal}${scUnitStr} ${scMov.name}${scLoad}${scUni ? ' ' + scUni : ''}`.replace(/\s+/g, ' ').trim()
        };
      }
    }

    // Register assigned options to usedMovementIds so subsequent stations do not duplicate them
    if (altPrescription) usedMovementIds.add(altPrescription.movement.id);
    if (scaleDownPrescription) usedMovementIds.add(scaleDownPrescription.movement.id);

    return {
      movement: mov,
      formatKey,
      stationIndex,
      customScheme,
      emomMinuteBadge,
      repsDisplay,
      loadBadge,
      prescriptionText,
      copyText,
      isOptionalGear,
      isMissingGear,
      alternative: altPrescription,
      scaleDown: scaleDownPrescription
    };
  },

  buildWodContext(wod, intensityOverride = null) {
    const roundMovements = (wod.items || []).map(it => it.movement);
    return {
      durationCategory: wod.durationCategory || globalThis.AppState?.duration || 'medium',
      intensity: this.normalizeIntensity(intensityOverride || wod.intensity),
      totalMinutes: wod.minutes,
      capMinutes: wod.minutes,
      numStations: roundMovements.length,
      roundMovements,
      rounds: wod.rounds
    };
  },

  /**
   * Recomputes all alternatives and scale-downs across a WOD's items so that
   * no substitute or scale-down ever duplicates an exercise already in the WOD.
   */
  refreshWodCollisionFreeMetadata(wod) {
    if (!wod || !Array.isArray(wod.items)) return wod;
    const usedIds = new Set(wod.items.map(it => it.movement.id));
    const context = this.buildWodContext(wod);
    const headerLoad = wod.isBenchmark ? this.extractLoadFromText(wod.prescriptionHeader) : null;

    wod.items = wod.items.map((item, idx) => {
      const built = this.buildItemPrescription(
        item.movement,
        item.formatKey || wod.format,
        item.stationIndex !== undefined ? item.stationIndex : (wod.format === 'EMOM' ? idx : null),
        item.customScheme,
        usedIds,
        context
      );
      if (wod.isBenchmark && item.benchmarkCustomLabel) {
        this.applyBenchmarkItemFormatting(built, item.movement, item.benchmarkCustomLabel, wod.format, headerLoad);
      }
      return built;
    });
    return wod;
  },

  /**
   * Rescales an already-generated non-benchmark WOD to a new intensity tier
   * without changing its movements, title, or time cap.
   */
  rescaleWodIntensity(wod, newIntensity) {
    if (!wod || wod.isBenchmark || !Array.isArray(wod.items)) return wod;
    const tier = this.normalizeIntensity(newIntensity);
    wod.intensity = tier;

    const roundMovements = wod.items.map(it => it.movement);
    const usedIds = new Set(roundMovements.map(m => m.id));
    const context = this.buildWodContext(wod, tier);

    const isCouplet = Boolean(
      wod.isDescendingCouplet ||
      (wod.format === 'FOR_TIME' && typeof wod.badgeFormat === 'string' && wod.badgeFormat.includes('-'))
    );
    if (isCouplet) {
      wod.isDescendingCouplet = true;
      const hasVeryHighSkill = roundMovements.some(m => (m.intensity || 1.8) >= 5.0);
      const schemeSampleMov = roundMovements.every(m => this.isUnilateral(m))
        ? { unit: 'reps', unilateral: 'split' }
        : { unit: 'reps' };
      const scheme = this.getDescendingCoupletScheme(schemeSampleMov, tier, hasVeryHighSkill);
      wod.badgeFormat = `${scheme} FOR TIME`;
      wod.prescriptionHeader = `${scheme} Reps For Time:`;
    } else if (wod.format === 'INTERVALS') {
      const split = this.getIntervalSplit(tier);
      wod.difficultyLabel = `${split.work}s Work / ${split.rest}s Rest`;
      wod.prescriptionHeader = `Tabata • ${split.work}s Work / ${split.rest}s Rest:`;
    }

    const hasVeryHighSkill = isCouplet && roundMovements.some(m => (m.intensity || 1.8) >= 5.0);

    wod.items = wod.items.map((item, idx) => {
      const formatKey = item.formatKey || wod.format;
      const stationIndex = item.stationIndex !== undefined
        ? item.stationIndex
        : ((formatKey === 'EMOM' || formatKey === 'INTERVALS') ? idx : null);
      const customScheme = isCouplet
        ? this.getDescendingCoupletScheme(item.movement, tier, hasVeryHighSkill)
        : null;
      return this.buildItemPrescription(item.movement, formatKey, stationIndex, customScheme, usedIds, context);
    });

    return wod;
  },

  /**
   * Computes a unique signature for a workout for history and deduplication.
   */
  getWodSignature(wod) {
    if (!wod) return '';
    if (wod.isBenchmark) {
      const id = wod.benchmarkId || wod.id || wod.title;
      return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    const itemIds = (wod.items || [])
      .map(it => it.movement?.id)
      .filter(Boolean)
      .sort()
      .join('-');
    const format = wod.format || 'AMRAP';
    return `${format}:${itemIds}`;
  },

  getWodMovementSignature(wod) {
    if (!wod) return '';
    if (wod.isBenchmark) {
      const id = wod.benchmarkId || wod.id || wod.title;
      return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    return (wod.items || [])
      .map(it => it.movement?.id)
      .filter(Boolean)
      .sort()
      .join('-');
  },

  getBenchmarkSignature(bm) {
    if (!bm) return '';
    const id = bm.id || bm.title;
    return `bm:${String(id).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  },

  _binomial(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - i + 1)) / i;
    }
    return Math.round(res);
  },

  /**
   * Counts the exact number of unique `count`-movement combinations
   * reachable by `selectBalancedMovements(pool, count)`.
   */
  countBalancedCombinations(pool, count) {
    const sourcePool = this.getSelectionSourcePool(pool, count);
    if (sourcePool.length === 0 || count <= 0) return 0;
    if (sourcePool.length <= count) return 1;

    const byPattern = {};
    sourcePool.forEach(m => {
      if (!byPattern[m.pattern]) byPattern[m.pattern] = [];
      byPattern[m.pattern].push(m);
    });
    const sizes = Object.values(byPattern).map(arr => arr.length);

    if (sizes.length >= count) {
      const dp = new Array(count + 1).fill(0);
      dp[0] = 1;
      for (const n of sizes) {
        for (let k = count; k >= 1; k--) {
          dp[k] += dp[k - 1] * n;
        }
      }
      return dp[count];
    }

    let dp = new Array(count + 1).fill(0);
    dp[0] = 1;
    for (const n of sizes) {
      const next = new Array(count + 1).fill(0);
      for (let prev = 0; prev <= count; prev++) {
        if (dp[prev] === 0) continue;
        for (let take = 1; take <= n && prev + take <= count; take++) {
          next[prev + take] += dp[prev] * this._binomial(n, take);
        }
      }
      dp = next;
    }
    return dp[count];
  },

  _getAlgorithmicStationCounts(poolLength, formatKey, durationCategory) {
    if (poolLength <= 0) return [];
    if (formatKey === 'AMRAP') {
      return [poolLength >= 3 ? 3 : Math.min(2, poolLength)];
    }
    if (formatKey === 'EMOM') {
      const raw = poolLength >= 3 ? [2, 3, 4] : [Math.min(2, poolLength)];
      return Array.from(new Set(raw.map(c => Math.min(c, poolLength))));
    }
    if (formatKey === 'FOR_TIME') {
      const sizes = new Set();
      if (durationCategory === 'short' && poolLength >= 2) sizes.add(2);
      sizes.add(poolLength >= 3 ? 3 : Math.min(2, poolLength));
      return Array.from(sizes);
    }
    if (formatKey === 'INTERVALS') {
      return [Math.min(poolLength, durationCategory === 'short' ? 2 : 3)];
    }
    return [];
  },

  getMatchingBenchmarks() {
    const benchmarks = globalThis.CLASSICAL_BENCHMARKS || [];
    const format = globalThis.AppState.format || 'ANY';
    const duration = globalThis.AppState.duration || 'medium';

    const broaderBenchmarks = benchmarks.filter(b => {
      const matchesPool = globalThis.AppState.isBenchmarkEligible(b);
      const matchesFormat = format === 'ANY' || b.format === format;
      return matchesPool && matchesFormat;
    });
    const eligibleBenchmarks = broaderBenchmarks.filter(b => b.durationCategory === duration);

    return { eligibleBenchmarks, broaderBenchmarks };
  },

  /**
   * Computes the exact number of unique workouts (algorithmic combinations +
   * eligible classical benchmarks) in the current selection pool.
   */
  getSelectionWorkoutStats() {
    const activePool = globalThis.AppState.getActiveMovementPool();
    const hardestPool = globalThis.AppState.getHardestAllowedMovementPool();
    const effectivePool = hardestPool.length > 0 ? hardestPool : activePool;
    const mode = globalThis.AppState.mode || 'smart';
    const format = globalThis.AppState.format || 'ANY';
    const duration = globalThis.AppState.duration || 'medium';
    const totalBenchmarksCatalog = (globalThis.CLASSICAL_BENCHMARKS || []).length;

    if (activePool.length === 0) {
      return {
        totalCount: 0,
        algoCount: 0,
        benchmarkCount: 0,
        broaderBenchmarkCount: 0,
        fallbackBenchmarkCount: 0,
        fallbackScope: null,
        activeMovementCount: 0,
        effectiveMovementCount: 0,
        mode,
        format,
        duration
      };
    }

    const { eligibleBenchmarks, broaderBenchmarks } = this.getMatchingBenchmarks();

    let algoCount = 0;
    if (mode === 'smart' || mode === 'algorithmic') {
      const formatsToCount = format === 'ANY' ? ['AMRAP', 'EMOM', 'FOR_TIME'] : [format];
      for (const fmt of formatsToCount) {
        const stationCounts = this._getAlgorithmicStationCounts(effectivePool.length, fmt, duration);
        for (const k of stationCounts) {
          algoCount += this.countBalancedCombinations(effectivePool, k);
        }
      }
    }

    if (mode === 'benchmark') {
      const exactCount = eligibleBenchmarks.length;
      const fallbackBenchmarkCount = exactCount > 0
        ? exactCount
        : (broaderBenchmarks.length > 0 ? broaderBenchmarks.length : totalBenchmarksCatalog);
      const fallbackScope = exactCount > 0
        ? null
        : (broaderBenchmarks.length > 0 ? 'broader' : 'all');

      return {
        totalCount: exactCount,
        algoCount: 0,
        benchmarkCount: exactCount,
        broaderBenchmarkCount: broaderBenchmarks.length,
        fallbackBenchmarkCount,
        fallbackScope,
        activeMovementCount: activePool.length,
        effectiveMovementCount: effectivePool.length,
        mode,
        format,
        duration
      };
    }

    const benchmarkCount = mode === 'smart' ? eligibleBenchmarks.length : 0;
    return {
      totalCount: algoCount + benchmarkCount,
      algoCount,
      benchmarkCount,
      broaderBenchmarkCount: broaderBenchmarks.length,
      fallbackBenchmarkCount: 0,
      fallbackScope: null,
      activeMovementCount: activePool.length,
      effectiveMovementCount: effectivePool.length,
      mode,
      format,
      duration
    };
  },

  /**
   * Main Generator Entrypoint:
   * Keeps track of the last workouts shown to the user and guarantees that:
   * 1) The exact same workout currently displayed is NEVER repeated consecutively.
   * 2) Any workout shown within the last 5 workouts is excluded whenever the candidate pool allows.
   * 3) If candidate pool has fewer than 5 unique options, cycles through them via Least-Recently-Used (LRU).
   */
  generate() {
    const activePool = globalThis.AppState.getActiveMovementPool();
    if (activePool.length === 0) {
      return this.createFallbackEmptyWod();
    }

    const currentWodSig = this.getWodSignature(globalThis.AppState.currentWod);
    const currentMovSig = this.getWodMovementSignature(globalThis.AppState.currentWod);

    const { eligibleBenchmarks, broaderBenchmarks } = this.getMatchingBenchmarks();

    // 1. CLASSICS ONLY MODE
    if (globalThis.AppState.mode === 'benchmark') {
      const candidateList = eligibleBenchmarks.length > 0
        ? eligibleBenchmarks
        : (broaderBenchmarks.length > 0 ? broaderBenchmarks : globalThis.CLASSICAL_BENCHMARKS);

      if (candidateList.length === 0) {
        return this.createFallbackEmptyWod();
      }

      // Filter out benchmarks seen in the last 5 workouts AND exclude the currently shown workout
      const nonRecent = candidateList.filter(b => {
        const sig = this.getBenchmarkSignature(b);
        return sig !== currentWodSig && !globalThis.AppState.isRecentWorkout(sig, 5);
      });

      let chosen = null;
      if (nonRecent.length > 0) {
        chosen = this.pickRandom(nonRecent);
      } else {
        // When pool <= 5, exclude current workout if possible and pick Least Recently Used (LRU)
        const candidates = candidateList.length > 1
          ? candidateList.filter(b => this.getBenchmarkSignature(b) !== currentWodSig)
          : candidateList;

        candidates.sort((a, b) => {
          const idxA = globalThis.AppState.getRecentIndex(this.getBenchmarkSignature(a));
          const idxB = globalThis.AppState.getRecentIndex(this.getBenchmarkSignature(b));
          return idxA - idxB;
        });
        chosen = candidates[0];
      }

      const wod = this.formatBenchmarkWod(chosen);
      globalThis.AppState.addRecentWorkout(this.getWodSignature(wod));
      return wod;
    }

    // 2. SMART HYBRID MODE (Benchmark chance: 35%, but ONLY if a fresh benchmark is available)
    if (globalThis.AppState.mode === 'smart' && eligibleBenchmarks.length > 0 && Math.random() < 0.35) {
      const freshBenchmarks = eligibleBenchmarks.filter(b => {
        const sig = this.getBenchmarkSignature(b);
        return sig !== currentWodSig && !globalThis.AppState.isRecentWorkout(sig, 5);
      });

      if (freshBenchmarks.length > 0) {
        const chosen = this.pickRandom(freshBenchmarks);
        const wod = this.formatBenchmarkWod(chosen);
        globalThis.AppState.addRecentWorkout(this.getWodSignature(wod));
        return wod;
      }
      // If all eligible benchmarks were already shown in the last 5 workouts,
      // fall through to algorithmic generation to create a fresh custom workout!
    }

    // 3. ALGORITHMIC GENERATION (Deduplicated against last 5 workouts + current WOD)
    const hardestPool = globalThis.AppState.getHardestAllowedMovementPool();
    const effectivePool = hardestPool.length > 0 ? hardestPool : activePool;

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 60; attempt++) {
      const candidate = this.generateAlgorithmicWod(effectivePool);
      const sig = this.getWodSignature(candidate);
      const movSig = this.getWodMovementSignature(candidate);

      // Strict rejection: never return the exact same workout that is currently on screen
      if (sig === currentWodSig) {
        continue;
      }

      const inLast5 = globalThis.AppState.isRecentWorkout(sig, 5);
      const inLastMov = currentMovSig && movSig === currentMovSig;
      const recentIndex = globalThis.AppState.getRecentIndex(sig);

      // Ideal candidate: not in last 5 workouts AND does not duplicate the current movement set
      if (!inLast5 && !inLastMov) {
        bestCandidate = candidate;
        break;
      }

      // If all attempts hit recent history (e.g. tightly constrained gear), rank by LRU
      let score = 0;
      if (!inLast5) score += 100;
      if (!inLastMov) score += 50;
      score -= (recentIndex >= 0 ? recentIndex : 0);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    const finalWod = bestCandidate || this.generateAlgorithmicWod(effectivePool);
    globalThis.AppState.addRecentWorkout(this.getWodSignature(finalWod));
    return finalWod;
  },

  formatBenchmarkWod(bm) {
    const usedIds = new Set(bm.items.map(i => i.movementId));
    const headerLoad = this.extractLoadFromText(bm.prescriptionHeader);
    const enrichedItems = bm.items.map((item, idx) => {
      const mov = globalThis.MOVEMENTS_DB.find(m => m.id === item.movementId) || globalThis.MOVEMENTS_DB[0];
      const built = this.buildItemPrescription(mov, bm.format, bm.format === 'EMOM' ? idx : null, item.reps, usedIds);
      this.applyBenchmarkItemFormatting(built, mov, item.label, bm.format, headerLoad);
      return built;
    });

    return {
      isBenchmark: true,
      benchmarkId: bm.id,
      title: bm.title,
      badgeType: bm.category.toUpperCase(),
      format: bm.format,
      minutes: bm.minutes,
      intensity: 'standard',
      badgeFormat: `${bm.minutes} MIN ${bm.format.replace('_', ' ')}`,
      difficultyLabel: `Classical Benchmark`,
      prescriptionHeader: this.formatBannerPrescriptionHeader(bm.prescriptionHeader, bm.format),
      items: enrichedItems,
      stimulus: bm.stimulus,
      logic: bm.logic
    };
  },

  /**
   * Builds deterministic display metadata (badges, header, stimulus, and logic)
   * for algorithmic workouts so both generation and compact binary share decoding
   * stay 100% consistent.
   */
  buildAlgorithmicWodMetadata({ format, isDescendingCouplet = false, minutes = 15, rounds = 0, intensity = 'standard', movements = [], schemeOverride = null }) {
    const tier = this.normalizeIntensity(intensity);
    const patternList = movements.map(s => globalThis.PATTERNS[s.pattern]?.label || s.pattern);

    if (format === 'EMOM') {
      return {
        badgeFormat: `${minutes} MIN EMOM`,
        difficultyLabel: `${movements.length}-Station Rotation (${rounds} Sets)`,
        prescriptionHeader: `EMOM • ${rounds} Rounds:`,
        stimulus: 'Target ~40–50 seconds of consistent work each minute, leaving 10–20 seconds to breathe and transition to the next station.',
        logic: `Alternates ${patternList.join(' → ')} across alternating minutes so local muscle groups recover while systemic heart rate stays high.`,
        standardRepScheme: null
      };
    }

    if (format === 'FOR_TIME') {
      if (isDescendingCouplet) {
        const hasVeryHighSkill = movements.some(m => (m.intensity || 1.8) >= 5.0);
        const schemeSampleMov = movements.every(m => this.isUnilateral(m))
          ? { unit: 'reps', unilateral: 'split' }
          : { unit: 'reps' };
        const standardRepScheme = schemeOverride || this.getDescendingCoupletScheme(schemeSampleMov, tier, hasVeryHighSkill);
        return {
          badgeFormat: `${standardRepScheme} FOR TIME`,
          difficultyLabel: 'Descending Couplet',
          prescriptionHeader: `${standardRepScheme} Reps For Time:`,
          stimulus: 'Classic anaerobic threshold couplet. Push the opening set aggressively and fight through the fatigue on set 2.',
          logic: `Complementary ${patternList.join(' + ')} couplet eliminates muscular interference during high-speed cycling.`,
          standardRepScheme
        };
      }

      return {
        badgeFormat: `${rounds} ROUNDS FOR TIME`,
        difficultyLabel: `Balanced ${movements.length}-Movement Metcon`,
        prescriptionHeader: `${rounds} Rounds For Time:`,
        stimulus: 'Aim for consistent round splits within 10 seconds of each other. Smooth transitions beat early redlining.',
        logic: `Synergistic ${patternList.join(' + ')} sequence engineered for continuous multi-round output.`,
        standardRepScheme: null
      };
    }

    if (format === 'INTERVALS') {
      const split = this.getIntervalSplit(tier);
      return {
        badgeFormat: `${minutes} MIN TABATA`,
        difficultyLabel: `${split.work}s Work / ${split.rest}s Rest`,
        prescriptionHeader: `Tabata • ${split.work}s Work / ${split.rest}s Rest:`,
        stimulus: `Score is your lowest rep count across any of the 8 intervals. Pace intervals 1–3 at 85% so you don't crash on interval 6.`,
        logic: `High-turnover intervals targeting ${patternList.join(' & ')} energy systems.`,
        standardRepScheme: null
      };
    }

    // Default: AMRAP
    return {
      badgeFormat: `${minutes} MIN AMRAP`,
      difficultyLabel: `Balanced ${movements.length}-Movement Triplet`,
      prescriptionHeader: 'AMRAP • Max Rounds & Reps:',
      stimulus: `Find a sustainable pace from round 1 and aim for unbroken sets with minimal transition rest across the ${minutes}-minute window.`,
      logic: `Pairs ${patternList.join(' + ')} to avoid local muscular bottlenecks across the ${minutes}-minute window.`,
      standardRepScheme: null
    };
  },

  generateAlgorithmicWod(pool) {
    const chosenFormat = globalThis.AppState.format === 'ANY'
      ? this.pickRandom(['AMRAP', 'EMOM', 'FOR_TIME'])
      : globalThis.AppState.format;

    const durationCategory = globalThis.AppState.duration || 'medium';
    const initialIntensity = 'standard';

    const durationMap = {
      short: { amrap: [8, 10, 12], emom: [9, 10, 12], forTimeCap: 11, rounds: 4 },
      medium: { amrap: [14, 15, 16, 18], emom: [15, 16, 18, 20], forTimeCap: 16, rounds: 5 },
      long: { amrap: [24, 25, 30], emom: [24, 28, 30], forTimeCap: 28, rounds: 6 }
    };
    const dom = durationMap[durationCategory] || durationMap.medium;

    if (chosenFormat === 'EMOM') {
      const numStations = pool.length >= 3 ? this.pickRandom([2, 3, 4]) : Math.min(2, pool.length);
      const selected = this.selectBalancedMovements(pool, numStations);
      const usedIds = new Set(selected.map(m => m.id));
      const baseMin = this.pickRandom(dom.emom);
      const totalMinutes = Math.max(numStations * 2, Math.round(baseMin / numStations) * numStations);
      const rounds = totalMinutes / numStations;

      const context = {
        durationCategory,
        intensity: initialIntensity,
        totalMinutes,
        numStations,
        roundMovements: selected,
        rounds
      };

      const items = selected.map((mov, idx) =>
        this.buildItemPrescription(mov, 'EMOM', idx, null, usedIds, context)
      );

      const meta = this.buildAlgorithmicWodMetadata({
        format: 'EMOM',
        minutes: totalMinutes,
        rounds,
        intensity: initialIntensity,
        movements: selected
      });

      return {
        isBenchmark: false,
        title: this.generateName({ format: 'EMOM', movements: selected, durationCategory, totalMinutes, rounds }),
        badgeType: 'ALGORITHMIC',
        format: 'EMOM',
        minutes: totalMinutes,
        durationCategory,
        intensity: initialIntensity,
        rounds,
        badgeFormat: meta.badgeFormat,
        difficultyLabel: meta.difficultyLabel,
        prescriptionHeader: meta.prescriptionHeader,
        items,
        stimulus: meta.stimulus,
        logic: meta.logic
      };
    }

    if (chosenFormat === 'FOR_TIME') {
      const is21_15_9 = durationCategory === 'short' && Math.random() < 0.45 && pool.length >= 2;
      const numMovements = is21_15_9 ? 2 : (pool.length >= 3 ? 3 : Math.min(2, pool.length));
      const selected = this.selectBalancedMovements(pool, numMovements);
      const usedIds = new Set(selected.map(m => m.id));
      const capMinutes = dom.forTimeCap;

      if (is21_15_9) {
        // High skill or heavy movement downshifts from 21-15-9 to 15-12-9
        const hasVeryHighSkill = selected.some(m => (m.intensity || 1.8) >= 5.0);

        const context = {
          durationCategory,
          intensity: initialIntensity,
          totalMinutes: capMinutes,
          capMinutes,
          numStations: selected.length,
          roundMovements: selected
        };

        const items = selected.map(mov => {
          const scheme = this.getDescendingCoupletScheme(mov, initialIntensity, hasVeryHighSkill);
          return this.buildItemPrescription(mov, 'FOR_TIME', null, scheme, usedIds, context);
        });

        const meta = this.buildAlgorithmicWodMetadata({
          format: 'FOR_TIME',
          isDescendingCouplet: true,
          minutes: capMinutes,
          intensity: initialIntensity,
          movements: selected
        });

        return {
          isBenchmark: false,
          title: this.generateName({ format: 'FOR_TIME', isDescendingCouplet: true, movements: selected, durationCategory, totalMinutes: capMinutes }),
          badgeType: 'ALGORITHMIC',
          format: 'FOR_TIME',
          minutes: capMinutes,
          durationCategory,
          intensity: initialIntensity,
          isDescendingCouplet: true,
          badgeFormat: meta.badgeFormat,
          difficultyLabel: meta.difficultyLabel,
          prescriptionHeader: meta.prescriptionHeader,
          items,
          stimulus: meta.stimulus,
          logic: meta.logic
        };
      } else {
        const rounds = dom.rounds;
        const context = {
          durationCategory,
          intensity: initialIntensity,
          totalMinutes: capMinutes,
          capMinutes,
          numStations: selected.length,
          roundMovements: selected,
          rounds
        };

        const items = selected.map(mov =>
          this.buildItemPrescription(mov, 'FOR_TIME', null, null, usedIds, context)
        );

        const meta = this.buildAlgorithmicWodMetadata({
          format: 'FOR_TIME',
          isDescendingCouplet: false,
          minutes: capMinutes,
          rounds,
          intensity: initialIntensity,
          movements: selected
        });

        return {
          isBenchmark: false,
          title: this.generateName({ format: 'FOR_TIME', isDescendingCouplet: false, movements: selected, durationCategory, totalMinutes: capMinutes, rounds }),
          badgeType: 'ALGORITHMIC',
          format: 'FOR_TIME',
          minutes: capMinutes,
          durationCategory,
          intensity: initialIntensity,
          rounds,
          badgeFormat: meta.badgeFormat,
          difficultyLabel: meta.difficultyLabel,
          prescriptionHeader: meta.prescriptionHeader,
          items,
          stimulus: meta.stimulus,
          logic: meta.logic
        };
      }
    }

    if (chosenFormat === 'INTERVALS') {
      const numMovements = Math.min(pool.length, durationCategory === 'short' ? 2 : 3);
      const selected = this.selectBalancedMovements(pool, numMovements);
      const usedIds = new Set(selected.map(m => m.id));
      const totalMinutes = numMovements * 4;

      const context = {
        durationCategory,
        intensity: initialIntensity,
        totalMinutes,
        numStations: selected.length,
        roundMovements: selected
      };

      const items = selected.map((mov, i) =>
        this.buildItemPrescription(mov, 'INTERVALS', i, null, usedIds, context)
      );

      const meta = this.buildAlgorithmicWodMetadata({
        format: 'INTERVALS',
        minutes: totalMinutes,
        intensity: initialIntensity,
        movements: selected
      });

      return {
        isBenchmark: false,
        title: this.generateName({ format: 'INTERVALS', movements: selected, durationCategory, totalMinutes }),
        badgeType: 'ALGORITHMIC',
        format: 'INTERVALS',
        minutes: totalMinutes,
        durationCategory,
        intensity: initialIntensity,
        badgeFormat: meta.badgeFormat,
        difficultyLabel: meta.difficultyLabel,
        prescriptionHeader: meta.prescriptionHeader,
        items,
        stimulus: meta.stimulus,
        logic: meta.logic
      };
    }

    // Default: AMRAP
    const totalMinutes = this.pickRandom(dom.amrap);
    const numMovements = pool.length >= 3 ? 3 : Math.min(2, pool.length);
    const selected = this.selectBalancedMovements(pool, numMovements);
    const usedIds = new Set(selected.map(m => m.id));

    const context = {
      durationCategory,
      intensity: initialIntensity,
      totalMinutes,
      numStations: selected.length,
      roundMovements: selected
    };

    const items = selected.map(mov =>
      this.buildItemPrescription(mov, 'AMRAP', null, null, usedIds, context)
    );

    const meta = this.buildAlgorithmicWodMetadata({
      format: 'AMRAP',
      minutes: totalMinutes,
      intensity: initialIntensity,
      movements: selected
    });

    return {
      isBenchmark: false,
      title: this.generateName({ format: 'AMRAP', movements: selected, durationCategory, totalMinutes }),
      badgeType: 'ALGORITHMIC',
      format: 'AMRAP',
      minutes: totalMinutes,
      durationCategory,
      intensity: initialIntensity,
      badgeFormat: meta.badgeFormat,
      difficultyLabel: meta.difficultyLabel,
      prescriptionHeader: meta.prescriptionHeader,
      items,
      stimulus: meta.stimulus,
      logic: meta.logic
    };
  },

  createFallbackEmptyWod() {
    return {
      isBenchmark: false,
      title: 'NO MOVEMENTS ENABLED',
      badgeType: 'CHECK FILTERS',
      format: 'AMRAP',
      minutes: 10,
      badgeFormat: 'SELECT MOVEMENTS',
      difficultyLabel: 'Pool Empty',
      prescriptionHeader: 'Please enable at least 1 equipment type & movement on the left panel:',
      items: [],
      stimulus: 'Set at least one Equipment card to HAVE or OPTIONAL in Step 1, or click "Normal Only" in Step 2.',
      logic: 'The constraint solver requires at least one enabled movement in your whitelist.'
    };
  }
};

globalThis.MOVEMENT_NAME_TOKENS = MOVEMENT_NAME_TOKENS;
globalThis.FORMAT_NAME_SUFFIXES = FORMAT_NAME_SUFFIXES;
globalThis.WOD_ARCHETYPE_RULES = WOD_ARCHETYPE_RULES;
globalThis.WorkoutGenerator = WorkoutGenerator;
