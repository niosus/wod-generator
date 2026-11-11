/**
 * Default Equipment States & Equipment Presets
 */
const DEFAULT_EQUIPMENT_STATES = {
  bodyweight: 'available',
  running_area: 'optional',
  pullup_bar: 'available',
  rings_dips: 'optional',
  kettlebell: 'optional',
  dumbbell: 'off',
  barbell: 'off',
  bike_erg: 'optional',
  row_erg: 'off',
  ski_erg: 'off',
  jump_rope: 'optional',
  plyo_box: 'off',
  wall_ball: 'off'
};

const EQUIPMENT_PRESETS = {
  bodyweight: {
    bodyweight: 'available'
  },
  minimal: {
    bodyweight: 'available',
    running_area: 'optional',
    pullup_bar: 'available',
    rings_dips: 'optional',
    kettlebell: 'optional',
    bike_erg: 'optional',
    jump_rope: 'optional'
  },
  full: 'all_available'
};

globalThis.DEFAULT_EQUIPMENT_STATES = DEFAULT_EQUIPMENT_STATES;
globalThis.EQUIPMENT_PRESETS = EQUIPMENT_PRESETS;
