import {
  EQUIPMENT_CATALOG,
  MOVEMENTS_DB,
  CLASSICAL_BENCHMARKS
} from '../data/index.js';
import { BiomechanicalStickAnimator, renderFrame } from '../animator/index.js';
import { AppState } from '../state/app-state.js';
import { WorkoutGenerator } from '../generator/workout-generator.js';

const WOD_SHARE_FORMATS = ['AMRAP', 'EMOM', 'FOR_TIME', 'INTERVALS'];
const WOD_SHARE_INTENSITIES = ['moderate', 'standard', 'high'];
const WOD_SHARE_DURATIONS = ['short', 'medium', 'long'];

// Frozen v2 canonical ID registries (codes 0..84 and 0..45).
// Never reorder or remove entries from these arrays: existing v2 links map these
// byte codes directly to these string IDs regardless of MOVEMENTS_DB / CLASSICAL_BENCHMARKS order.
const V2_CANONICAL_MOVEMENT_IDS = Object.freeze([
  'pushups', 'knee_pushups', 'pike_pushups', 'hspu', 'ring_dips', 'parallel_bar_dips',
  'kb_strict_press', 'db_strict_press', 'bb_strict_press', 'kb_push_press', 'db_push_press',
  'bb_push_press', 'kb_push_jerk', 'db_push_jerk', 'bb_push_jerk', 'pullups', 'chin_ups',
  'bar_hang', 'bar_muscle_up', 'ring_muscle_up', 'ring_rows', 'bar_inverted_rows',
  'table_rows', 'doorway_towel_rows', 'superman_pulls', 'kb_bent_row', 'db_renegade_row',
  'bb_bent_row', 'kb_hang_power_clean', 'db_hang_power_clean', 'bb_hang_power_clean',
  'air_squats', 'step_back_lunges', 'walking_lunges', 'bulgarian_split_squats',
  'kb_bulgarian_split_squats', 'db_bulgarian_split_squats', 'bb_bulgarian_split_squats',
  'jumping_lunges', 'pistol_squats', 'goblet_squats', 'db_front_squats', 'bb_front_squats',
  'kb_deadlifts', 'db_deadlifts', 'bb_deadlifts', 'kb_rdl', 'db_rdl', 'bb_rdl', 'rfe_rdl',
  'kb_rfe_rdl', 'db_rfe_rdl', 'bb_rfe_rdl', 'kb_swings', 'situps', 'v_ups', 'tuck_ups',
  'knee_plank', 'plank', 'straight_arm_plank', 'side_plank', 'l_sit', 'hanging_knee_raises',
  'toes_to_bar', 'bike_erg_cal', 'row_erg_cal', 'ski_erg_cal', 'double_unders',
  'single_unders', 'jumping_jacks', 'run', 'mountain_climbers', 'burpees',
  'athletic_up_downs', 'box_jumps', 'box_step_ups', 'wall_balls', 'man_makers',
  'devil_press', 'kb_thrusters', 'db_thrusters', 'bb_thrusters', 'bb_squat_snatch',
  'db_snatch', 'kb_snatch'
]);
const V2_MOVEMENT_ID_TO_CODE = new Map(V2_CANONICAL_MOVEMENT_IDS.map((id, i) => [id, i]));

const V2_CANONICAL_BENCHMARK_IDS = Object.freeze([
  'cindy', 'chelsea', 'fran', 'annie', 'helen', 'mary', 'angie', 'barbara', 'diane',
  'elizabeth', 'grace', 'isabel', 'jackie', 'karen', 'kelly', 'eva', 'nancy', 'amanda',
  'nicole', 'grettel', 'ingrid', 'murph', 'nate', 'dt', 'jt', 'michael', 'badger',
  'danny', 'hansen', 'loredo', 'rene', 'the_seven', 'glen', 'chad', 'severin', 'josh',
  'holleyman', 'jason', 'hyrox_erg_sim', 'erg_bw_crusher', 'iron_bell_engine',
  'death_by_burpees', 'death_by_pullups', 'death_by_thrusters', 'death_by_calories',
  'death_by_kb_swings'
]);
const V2_BENCHMARK_ID_TO_CODE = new Map(V2_CANONICAL_BENCHMARK_IDS.map((id, i) => [id, i]));

const WorkoutSharing = {
  toBase64Url(uint8) {
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  },

  fromBase64Url(str) {
    let base = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base.length % 4) base += '=';
    const binary = atob(base);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  async compress(jsonStr) {
    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        const buf = await new Response(stream).arrayBuffer();
        return 'z.' + this.toBase64Url(new Uint8Array(buf));
      } catch (e) {
        console.warn('CompressionStream fallback:', e);
      }
    }
    return 'u.' + this.toBase64Url(new TextEncoder().encode(jsonStr));
  },

  async decompress(str) {
    if (str.startsWith('z.')) {
      const bytes = this.fromBase64Url(str.slice(2));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    }
    if (str.startsWith('u.')) {
      const bytes = this.fromBase64Url(str.slice(2));
      return new TextDecoder().decode(bytes);
    }
    try {
      const bytes = this.fromBase64Url(str);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return str;
    }
  },

  writeCompactScheme(out, scheme) {
    if (scheme === null || scheme === undefined) {
      out.push(0);
      return true;
    }
    if (typeof scheme === 'number' && Number.isInteger(scheme) && scheme >= 1 && scheme <= 250) {
      out.push(scheme);
      return true;
    }
    const bytes = new TextEncoder().encode(String(scheme));
    if (bytes.length > 255) return false;
    out.push(255, bytes.length);
    for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
    return true;
  },

  readCompactScheme(bytes, offsetObj) {
    if (offsetObj.pos >= bytes.length) return null;
    const tag = bytes[offsetObj.pos++];
    if (tag === 0) return null;
    if (tag <= 250) return tag;
    if (tag === 255 && offsetObj.pos < bytes.length) {
      const len = bytes[offsetObj.pos++];
      const str = new TextDecoder().decode(bytes.slice(offsetObj.pos, offsetObj.pos + len));
      offsetObj.pos += len;
      if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
      return str;
    }
    return null;
  },

  hashId16(id) {
    let h = 2166136261;
    const str = String(id || '');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h ^ (h >>> 16)) >>> 0) & 0xffff;
  },

  writeCatalogRef(out, id, flagBit, canonicalMap, catalog) {
    if (!id) return false;
    const flagMask = flagBit ? 0x80 : 0;
    const code = canonicalMap.get(id);
    if (code !== undefined && code < 126) {
      out.push((code & 0x7f) | flagMask);
      return true;
    }
    const h16 = this.hashId16(id);
    let matches = 0;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i]?.id && this.hashId16(catalog[i].id) === h16) {
        matches++;
        if (matches > 1) break;
      }
    }
    if (matches === 1) {
      out.push(126 | flagMask, (h16 >> 8) & 0xff, h16 & 0xff);
      return true;
    }
    const idBytes = new TextEncoder().encode(id);
    if (idBytes.length > 255) return false;
    out.push(127 | flagMask, idBytes.length);
    for (let i = 0; i < idBytes.length; i++) out.push(idBytes[i]);
    return true;
  },

  readCatalogRef(bytes, offsetObj, canonicalList, catalog) {
    if (offsetObj.pos >= bytes.length) return null;
    const raw = bytes[offsetObj.pos++];
    const flag = Boolean(raw & 0x80);
    const code = raw & 0x7f;
    let item = null;
    if (code < canonicalList.length) {
      const targetId = canonicalList[code];
      item = catalog.find(entry => entry.id === targetId) || null;
    } else if (code === 126) {
      if (offsetObj.pos + 2 > bytes.length) return null;
      const h16 = (bytes[offsetObj.pos] << 8) | bytes[offsetObj.pos + 1];
      offsetObj.pos += 2;
      item = catalog.find(entry => entry.id && this.hashId16(entry.id) === h16) || null;
    } else if (code === 127) {
      if (offsetObj.pos >= bytes.length) return null;
      const len = bytes[offsetObj.pos++];
      if (offsetObj.pos + len > bytes.length) return null;
      const targetId = new TextDecoder().decode(bytes.slice(offsetObj.pos, offsetObj.pos + len));
      offsetObj.pos += len;
      item = catalog.find(entry => entry.id === targetId) || null;
    }
    return { item, flag };
  },

  encodeWodBinary(wod) {
    if (!wod || !Array.isArray(wod.items)) return null;
    const wg = globalThis.WorkoutGenerator;
    const db = globalThis.MOVEMENTS_DB || [];
    const bms = globalThis.CLASSICAL_BENCHMARKS || [];
    if (!wg || db.length === 0) return null;

    const format = wod.format || 'AMRAP';
    const formatIdx = WOD_SHARE_FORMATS.indexOf(format);
    if (formatIdx < 0) return null;
    const intensity = wod.intensity || 'standard';
    const intensityIdx = Math.max(0, WOD_SHARE_INTENSITIES.indexOf(intensity));
    const isBenchmark = Boolean(wod.isBenchmark);

    const byte0 = (2 & 0b111)
      | ((isBenchmark ? 1 : 0) << 3)
      | ((formatIdx & 0b11) << 4)
      | ((intensityIdx & 0b11) << 6);

    if (isBenchmark) {
      const bm = bms.find(b => b.id === wod.benchmarkId || b.title === wod.title);
      if (!bm || wod.title !== bm.title || wod.format !== bm.format) return null;

      const items = wod.items;
      if (items.length > 255) return null;
      const isModified = items.length !== bm.items.length ||
        items.some((it, i) => !it.movement || it.movement.id !== bm.items[i].movementId || !it.benchmarkCustomLabel);

      if (!isModified) {
        const out = [byte0];
        if (!this.writeCatalogRef(out, bm.id, false, V2_BENCHMARK_ID_TO_CODE, bms)) return null;
        return new Uint8Array(out);
      }

      const out = [byte0];
      if (!this.writeCatalogRef(out, bm.id, true, V2_BENCHMARK_ID_TO_CODE, bms)) return null;
      out.push(items.length);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const movId = it.movement?.id;
        if (!movId || !db.some(m => m.id === movId)) return null;
        const stationModified = i >= bm.items.length ||
          movId !== bm.items[i].movementId ||
          !it.benchmarkCustomLabel;
        if (!this.writeCatalogRef(out, movId, stationModified, V2_MOVEMENT_ID_TO_CODE, db)) return null;
        if (stationModified) {
          if (!this.writeCompactScheme(out, it.customScheme)) return null;
        }
      }
      return new Uint8Array(out);
    }

    const items = wod.items;
    if (items.length === 0 || items.length > 7 || wod.badgeType === 'CHECK FILTERS') return null;

    const minutes = Math.round(Number(wod.minutes) || 15);
    const rounds = Math.round(Number(wod.rounds) || 0);
    if (minutes < 1 || minutes > 255 || rounds < 0 || rounds > 255) return null;

    const durationCategory = wod.durationCategory || 'medium';
    const durationIdx = Math.max(0, WOD_SHARE_DURATIONS.indexOf(durationCategory));
    const isDescendingCouplet = Boolean(wod.isDescendingCouplet);

    if (items.some(it => !it.movement?.id || !db.some(m => m.id === it.movement.id))) return null;

    const movements = items.map(it => it.movement);
    const hasVeryHighSkill = isDescendingCouplet && movements.some(m => (m.intensity || 1.8) >= 5.0);
    const context = {
      durationCategory,
      intensity,
      totalMinutes: minutes,
      capMinutes: minutes,
      numStations: movements.length,
      roundMovements: movements,
      rounds: rounds || undefined
    };

    const itemIsCustom = items.map(it => {
      const actual = it.customScheme;
      if (isDescendingCouplet) {
        const expected = wg.getDescendingCoupletScheme(it.movement, intensity, hasVeryHighSkill);
        return actual !== null && actual !== undefined && actual !== expected;
      }
      if (actual === null || actual === undefined) return false;
      const expected = wg.calculateDynamicReps(it.movement, format, context);
      return actual !== expected;
    });

    const hasCustomSchemes = itemIsCustom.some(Boolean);
    const hasOptionalMask = items.some(it => Boolean(it.isOptionalGear));
    const expectedTitle = wg.generateName({
      format,
      isDescendingCouplet,
      movements,
      durationCategory,
      totalMinutes: minutes,
      rounds: rounds || undefined
    });
    const hasCustomTitle = Boolean(wod.title && wod.title !== expectedTitle);
    const hasOverrides = hasCustomSchemes || hasCustomTitle;

    const byte1 = (durationIdx & 0b11)
      | ((isDescendingCouplet ? 1 : 0) << 2)
      | ((items.length & 0b111) << 3)
      | ((hasOptionalMask ? 1 : 0) << 6)
      | ((hasOverrides ? 1 : 0) << 7);

    const out = [byte0, byte1, minutes, rounds];
    for (let i = 0; i < items.length; i++) {
      if (!this.writeCatalogRef(out, items[i].movement.id, false, V2_MOVEMENT_ID_TO_CODE, db)) return null;
    }

    if (hasOptionalMask) {
      let mask = 0;
      items.forEach((it, idx) => {
        if (it.isOptionalGear) mask |= (1 << idx);
      });
      out.push(mask);
    }

    if (hasOverrides) {
      out.push((hasCustomSchemes ? 1 : 0) | (hasCustomTitle ? 2 : 0));
      if (hasCustomSchemes) {
        for (let i = 0; i < items.length; i++) {
          const schemeToWrite = itemIsCustom[i] ? items[i].customScheme : null;
          if (!this.writeCompactScheme(out, schemeToWrite)) return null;
        }
      }
      if (hasCustomTitle) {
        const titleBytes = new TextEncoder().encode(wod.title);
        if (titleBytes.length > 255) return null;
        out.push(titleBytes.length);
        for (let i = 0; i < titleBytes.length; i++) out.push(titleBytes[i]);
      }
    }

    return new Uint8Array(out);
  },

  decodeWodBinary(bytes) {
    if (!bytes || bytes.length < 2 || (bytes[0] & 0b111) !== 2) return null;
    const wg = globalThis.WorkoutGenerator;
    const db = globalThis.MOVEMENTS_DB || [];
    const bms = globalThis.CLASSICAL_BENCHMARKS || [];
    if (!wg || db.length === 0) return null;

    const isBenchmark = Boolean((bytes[0] >> 3) & 1);
    const format = WOD_SHARE_FORMATS[(bytes[0] >> 4) & 0b11] || 'AMRAP';
    const intensity = WOD_SHARE_INTENSITIES[(bytes[0] >> 6) & 0b11] || 'standard';

    if (isBenchmark) {
      const offset = { pos: 1 };
      const bmRef = this.readCatalogRef(bytes, offset, V2_CANONICAL_BENCHMARK_IDS, bms);
      if (!bmRef || !bmRef.item) return null;
      const bm = bmRef.item;
      const isModified = bmRef.flag;

      const restoredWod = wg.formatBenchmarkWod(bm);
      if (!isModified) {
        return restoredWod;
      }

      if (offset.pos >= bytes.length) return null;
      const numItems = bytes[offset.pos++];
      const newItems = [];
      for (let i = 0; i < numItems; i++) {
        const movRef = this.readCatalogRef(bytes, offset, V2_CANONICAL_MOVEMENT_IDS, db);
        if (!movRef) return null;
        const stationModified = movRef.flag;
        const mov = movRef.item || db[0];
        const stationIndex = (bm.format === 'EMOM' || bm.format === 'INTERVALS') ? i : null;
        if (stationModified) {
          const customScheme = this.readCompactScheme(bytes, offset);
          newItems.push({
            movement: mov,
            formatKey: bm.format,
            stationIndex,
            customScheme
          });
        } else if (restoredWod.items[i]) {
          newItems.push(restoredWod.items[i]);
        } else {
          newItems.push({
            movement: mov,
            formatKey: bm.format,
            stationIndex,
            customScheme: null
          });
        }
      }
      restoredWod.items = newItems;
      wg.refreshWodCollisionFreeMetadata(restoredWod);
      return restoredWod;
    }

    if (bytes.length < 4) return null;
    const byte1 = bytes[1];
    const durationCategory = WOD_SHARE_DURATIONS[byte1 & 0b11] || 'medium';
    const isDescendingCouplet = Boolean((byte1 >> 2) & 1);
    const numItems = (byte1 >> 3) & 0b111;
    const hasOptionalMask = Boolean((byte1 >> 6) & 1);
    const hasOverrides = Boolean((byte1 >> 7) & 1);
    const minutes = bytes[2];
    const rounds = bytes[3];

    const offset = { pos: 4 };
    const movements = [];
    for (let i = 0; i < numItems; i++) {
      const movRef = this.readCatalogRef(bytes, offset, V2_CANONICAL_MOVEMENT_IDS, db);
      if (!movRef) return null;
      movements.push(movRef.item || db[0]);
    }

    const optionalMask = (hasOptionalMask && offset.pos < bytes.length) ? bytes[offset.pos++] : 0;
    const customSchemes = new Array(numItems).fill(null);
    let customTitle = null;

    if (hasOverrides && offset.pos < bytes.length) {
      const overrideFlags = bytes[offset.pos++];
      if (overrideFlags & 1) {
        for (let i = 0; i < numItems; i++) {
          customSchemes[i] = this.readCompactScheme(bytes, offset);
        }
      }
      if ((overrideFlags & 2) && offset.pos < bytes.length) {
        const titleLen = bytes[offset.pos++];
        customTitle = new TextDecoder().decode(bytes.slice(offset.pos, offset.pos + titleLen));
        offset.pos += titleLen;
      }
    }

    const usedIds = new Set(movements.map(m => m.id));
    const context = {
      durationCategory,
      intensity,
      totalMinutes: minutes,
      capMinutes: minutes,
      numStations: movements.length,
      roundMovements: movements,
      rounds: rounds || undefined
    };
    const hasVeryHighSkill = isDescendingCouplet && movements.some(m => (m.intensity || 1.8) >= 5.0);

    const items = movements.map((mov, idx) => {
      const stationIndex = (format === 'EMOM' || format === 'INTERVALS') ? idx : null;
      let scheme = customSchemes[idx];
      if ((scheme === null || scheme === undefined) && isDescendingCouplet) {
        scheme = wg.getDescendingCoupletScheme(mov, intensity, hasVeryHighSkill);
      }
      const built = wg.buildItemPrescription(mov, format, stationIndex, scheme, usedIds, context);
      if (hasOptionalMask && ((optionalMask >> idx) & 1)) {
        built.isOptionalGear = true;
        if (!built.alternative && globalThis.AppState) {
          const alt = globalThis.AppState.resolveUniqueAlternative(mov, usedIds);
          if (alt) {
            const repVal = wg.convertCustomScheme(mov, alt, format, scheme, context);
            const unit = alt.unit === 'cal' ? 'Cal' : (alt.unit === 'm' ? 'm' : (alt.unit === 'sec' ? 's' : ''));
            const unitSep = (alt.unit === 'm' || alt.unit === 'sec') ? '' : ' ';
            built.alternative = {
              movement: alt,
              repVal,
              text: `${repVal}${unit ? unitSep + unit : ''} ${alt.name}`.replace(/\s+/g, ' ').trim()
            };
            usedIds.add(alt.id);
          }
        }
      }
      return built;
    });

    const coupletSchemeOverride = isDescendingCouplet
      ? (customSchemes.find(s => typeof s === 'string' && /^\d+(\s*-\s*\d+)+$/.test(s)) || null)
      : (format === 'EMOM' && movements.length === 1 && !rounds && typeof customSchemes[0] === 'string' ? customSchemes[0] : null);

    const meta = wg.buildAlgorithmicWodMetadata({
      format,
      isDescendingCouplet,
      minutes,
      rounds,
      intensity,
      movements,
      schemeOverride: coupletSchemeOverride
    });

    const title = customTitle || wg.generateName({
      format,
      isDescendingCouplet,
      movements,
      durationCategory,
      totalMinutes: minutes,
      rounds: rounds || undefined
    });

    return {
      isBenchmark: false,
      title,
      badgeType: 'ALGORITHMIC',
      format,
      minutes,
      durationCategory,
      intensity,
      rounds: rounds || undefined,
      ...(isDescendingCouplet ? { isDescendingCouplet: true } : {}),
      badgeFormat: meta.badgeFormat,
      difficultyLabel: meta.difficultyLabel,
      prescriptionHeader: meta.prescriptionHeader,
      items,
      stimulus: meta.stimulus,
      logic: meta.logic
    };
  },

  isLegacyWodPayload(payload) {
    if (!payload || typeof payload !== 'string') return false;
    const trimmed = payload.trim();
    if (trimmed.startsWith('z.') || trimmed.startsWith('u.')) return true;
    const raw = trimmed.startsWith('w.') ? trimmed.slice(2) : trimmed;
    try {
      const bytes = this.fromBase64Url(raw);
      return bytes.length < 2 || (bytes[0] & 0b111) !== 2;
    } catch (e) {
      return true;
    }
  },

  async encodeWod(wod) {
    if (!wod) return '';
    const binary = this.encodeWodBinary(wod);
    if (binary) {
      return this.toBase64Url(binary);
    }
    const compact = {
      v: 1,
      t: wod.title,
      bt: wod.badgeType,
      f: wod.format,
      m: wod.minutes,
      bf: wod.badgeFormat,
      dl: wod.difficultyLabel,
      ph: wod.prescriptionHeader,
      st: wod.stimulus,
      lg: wod.logic,
      ib: wod.isBenchmark ? 1 : 0,
      in: wod.intensity || 'standard',
      dc: wod.durationCategory || undefined,
      rn: wod.rounds || undefined,
      ic: wod.isDescendingCouplet ? 1 : 0,
      it: (wod.items || []).map(i => ({
        id: i.movement.id,
        fk: i.formatKey,
        si: i.stationIndex,
        cs: i.customScheme,
        emb: i.emomMinuteBadge || undefined,
        rd: i.repsDisplay,
        lb: i.loadBadge || undefined,
        pt: i.prescriptionText,
        ct: i.copyText || undefined,
        og: i.isOptionalGear ? 1 : 0,
        bcl: i.benchmarkCustomLabel || undefined,
        alt: i.alternative ? { id: i.alternative.movement.id, txt: i.alternative.text, rv: i.alternative.repVal } : null,
        sc: i.scaleDown ? { id: i.scaleDown.movement.id, nt: i.scaleDown.note, txt: i.scaleDown.text, rv: i.scaleDown.repVal } : null
      }))
    };
    return await this.compress(JSON.stringify(compact));
  },

  async decodeWod(encodedStr) {
    if (!encodedStr || typeof encodedStr !== 'string') return null;
    const trimmed = encodedStr.trim();
    if (!trimmed.startsWith('z.') && !trimmed.startsWith('u.')) {
      const raw = trimmed.startsWith('w.') ? trimmed.slice(2) : trimmed;
      try {
        const bytes = this.fromBase64Url(raw);
        if (bytes.length >= 2 && (bytes[0] & 0b111) === 2) {
          const binaryDecoded = this.decodeWodBinary(bytes);
          if (binaryDecoded) return binaryDecoded;
        }
      } catch (e) { }
    }

    const jsonStr = await this.decompress(trimmed);
    const data = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.it)) return null;

    const items = data.it.map((ci, idx) => {
      const mov = globalThis.MOVEMENTS_DB.find(m => m.id === ci.id) || globalThis.MOVEMENTS_DB[0];
      const fk = ci.fk || data.f;
      const si = ci.si !== undefined ? ci.si : null;
      let repsDisplay = ci.rd || '';
      let emomMinuteBadge = ci.emb || null;
      if (!emomMinuteBadge && fk === 'EMOM') {
        const legacyMin = repsDisplay.match(/^MIN\s+(\d+|N)\s*:\s*(.*)$/i);
        if (legacyMin) {
          emomMinuteBadge = `MIN ${legacyMin[1].toUpperCase()}`;
          repsDisplay = legacyMin[2].trim();
        } else if (typeof repsDisplay === 'string' && repsDisplay.includes('...')) {
          emomMinuteBadge = 'MIN N';
        } else if (si !== null) {
          emomMinuteBadge = `MIN ${si + 1}`;
        } else {
          emomMinuteBadge = `MIN ${idx + 1}`;
        }
      }
      if (mov.unit === 'm' && /^\d+$/.test(String(repsDisplay).trim())) {
        repsDisplay = `${String(repsDisplay).trim()}m`;
      } else if ((!mov.unit || mov.unit === 'reps') && fk !== 'INTERVALS' && repsDisplay && !/\breps?\b/i.test(repsDisplay) && !/\bCal\b/i.test(repsDisplay)) {
        const parenIdx = repsDisplay.indexOf('(');
        if (parenIdx > 0) {
          repsDisplay = `${repsDisplay.slice(0, parenIdx).trim()} reps ${repsDisplay.slice(parenIdx).trim()}`;
        } else {
          repsDisplay = `${repsDisplay.trim()} reps`;
        }
      }
      return {
        movement: mov,
        formatKey: fk,
        stationIndex: si,
        customScheme: ci.cs || null,
        emomMinuteBadge,
        repsDisplay,
        loadBadge: ci.lb !== undefined ? (ci.lb || null) : (mov.load || null),
        prescriptionText: ci.pt || '',
        copyText: ci.ct || ci.pt || '',
        isOptionalGear: Boolean(ci.og),
        benchmarkCustomLabel: ci.bcl,
        alternative: ci.alt ? {
          movement: globalThis.MOVEMENTS_DB.find(m => m.id === ci.alt.id) || globalThis.MOVEMENTS_DB[0],
          text: ci.alt.txt,
          repVal: ci.alt.rv
        } : null,
        scaleDown: ci.sc ? {
          movement: globalThis.MOVEMENTS_DB.find(m => m.id === ci.sc.id) || globalThis.MOVEMENTS_DB[0],
          note: ci.sc.nt,
          text: ci.sc.txt,
          repVal: ci.sc.rv
        } : null
      };
    });

    const isBenchmark = Boolean(data.ib);
    const restoredWod = {
      title: data.t || (globalThis.WorkoutGenerator ? globalThis.WorkoutGenerator.generateName({ format: data.f, items, durationCategory: data.dc, isDescendingCouplet: Boolean(data.ic) }) : 'CUSTOM WOD'),
      badgeType: (!isBenchmark && data.bt && data.bt !== 'CHECK FILTERS') ? 'ALGORITHMIC' : data.bt,
      format: data.f,
      minutes: data.m,
      badgeFormat: data.bf,
      difficultyLabel: data.dl,
      prescriptionHeader: data.ph,
      stimulus: data.st,
      logic: data.lg,
      isBenchmark,
      intensity: data.in || 'standard',
      durationCategory: data.dc,
      rounds: data.rn,
      isDescendingCouplet: Boolean(
        data.ic ||
        (!data.ib && data.f === 'FOR_TIME' && typeof data.bf === 'string' && data.bf.includes('-'))
      ),
      items
    };

    const context = {
      durationCategory: restoredWod.durationCategory || globalThis.AppState?.duration || 'medium',
      intensity: restoredWod.intensity,
      totalMinutes: restoredWod.minutes,
      capMinutes: restoredWod.minutes,
      numStations: items.length,
      roundMovements: items.map(it => it.movement),
      rounds: restoredWod.rounds
    };

    // Attach alternatives or scale-downs if missing
    items.forEach((item) => {
      if (!item.alternative && item.isOptionalGear) {
        const alt = globalThis.AppState.resolveUniqueAlternative(item.movement, new Set(items.map(it => it.movement.id)));
        if (alt) {
          const repVal = globalThis.WorkoutGenerator?.convertCustomScheme
            ? globalThis.WorkoutGenerator.convertCustomScheme(item.movement, alt, item.formatKey, item.customScheme, context)
            : item.repsDisplay;
          const unit = alt.unit === 'cal' ? 'Cal' : (alt.unit === 'm' ? 'm' : (alt.unit === 'sec' ? 's' : ''));
          item.alternative = { movement: alt, repVal, text: `${repVal} ${unit} ${alt.name}`.replace(/\s+/g, ' ').trim() };
        }
      }
      if (!item.scaleDown) {
        const sc = globalThis.AppState.resolveScaleDown(item.movement, new Set(items.map(it => it.movement.id)));
        if (sc) {
          const repVal = globalThis.WorkoutGenerator?.convertCustomScheme
            ? globalThis.WorkoutGenerator.convertCustomScheme(item.movement, sc.movement, item.formatKey, item.customScheme, context)
            : item.repsDisplay;
          const unit = sc.movement.unit === 'cal' ? 'Cal' : (sc.movement.unit === 'm' ? 'm' : (sc.movement.unit === 'sec' ? 's' : ''));
          item.scaleDown = { movement: sc.movement, repVal, note: sc.note, text: `${repVal} ${unit} ${sc.movement.name}`.replace(/\s+/g, ' ').trim() };
        }
      }
    });

    return restoredWod;
  },

  encodeConfig(appState = globalThis.AppState) {
    if (!appState) return '';
    const themes = ['system', 'light', 'dark'];
    const durations = ['short', 'medium', 'long'];
    const modes = ['smart', 'algorithmic', 'benchmark'];
    const formats = ['ANY', 'AMRAP', 'EMOM', 'FOR_TIME', 'INTERVALS'];
    const eqStateMap = { off: 0, optional: 1, available: 2 };

    const catalog = globalThis.EQUIPMENT_CATALOG || [];
    const db = globalThis.MOVEMENTS_DB || [];

    const themeIdx = Math.max(0, themes.indexOf(appState.theme || 'system'));
    const durationIdx = Math.max(0, durations.indexOf(appState.duration || 'medium'));
    const includeHard = appState.includeHardMovements ? 1 : 0;
    const modeIdx = Math.max(0, modes.indexOf(appState.mode || 'smart'));
    const formatIdx = Math.max(0, formats.indexOf(appState.format || 'ANY'));
    const hasCustomMov = typeof appState.hasCustomMovementExclusions === 'function'
      ? (appState.hasCustomMovementExclusions() ? 1 : 0)
      : 0;

    // v2 format: 6-byte base (supports up to 17 equipment items) + optional 12-byte bitmask (up to 96 movements)
    const byteLen = hasCustomMov ? 18 : 6;
    const bytes = new Uint8Array(byteLen);

    // Byte 0: version=2 (0..2) | theme (3..4) | duration (5..6) | includeHard (7)
    bytes[0] = (2 & 0b111) | ((themeIdx & 0b11) << 3) | ((durationIdx & 0b11) << 5) | ((includeHard & 1) << 7);

    // Byte 1: mode (0..1) | format (2..4) | hasCustomMov (5) | eq[0] (6..7)
    const eq0 = catalog[0] ? (eqStateMap[appState.equipmentStates[catalog[0].id]] ?? 0) : 2;
    bytes[1] = (modeIdx & 0b11) | ((formatIdx & 0b111) << 2) | ((hasCustomMov & 1) << 5) | ((eq0 & 0b11) << 6);

    // Bytes 2..5: eq[1..16] (4 items per byte, 2 bits each)
    for (let i = 1; i < catalog.length && i <= 16; i++) {
      const val = eqStateMap[appState.equipmentStates[catalog[i].id]] ?? 0;
      const byteIdx = 2 + Math.floor((i - 1) / 4);
      const shift = ((i - 1) % 4) * 2;
      bytes[byteIdx] |= (val & 0b11) << shift;
    }

    // Optional Bytes 6..17: 96-bit movement exclusion bitmask
    if (hasCustomMov && appState.excludedMovements) {
      for (let i = 0; i < db.length && i < 96; i++) {
        if (appState.excludedMovements.has(db[i].id)) {
          bytes[6 + (i >> 3)] |= (1 << (i & 7));
        }
      }
    }

    return this.toBase64Url(bytes);
  },

  decodeConfig(encodedStr) {
    if (!encodedStr || typeof encodedStr !== 'string') return null;
    const bytes = this.fromBase64Url(encodedStr.trim());
    if (bytes.length < 5) return null;

    const version = bytes[0] & 0b111;
    if (version !== 1 && version !== 2) return null;
    if (version === 1 && bytes.length !== 5 && bytes.length !== 13) return null;
    if (version === 2 && bytes.length !== 6 && bytes.length !== 18) return null;

    const themes = ['system', 'light', 'dark'];
    const durations = ['short', 'medium', 'long'];
    const modes = ['smart', 'algorithmic', 'benchmark'];
    const formats = ['ANY', 'AMRAP', 'EMOM', 'FOR_TIME', 'INTERVALS'];
    const eqStates = ['off', 'optional', 'available'];

    const catalog = globalThis.EQUIPMENT_CATALOG || [];
    const db = globalThis.MOVEMENTS_DB || [];

    const themeIdx = (bytes[0] >> 3) & 0b11;
    const durationIdx = (bytes[0] >> 5) & 0b11;
    const includeHardMovements = Boolean((bytes[0] >> 7) & 1);

    const modeIdx = bytes[1] & 0b11;
    const formatIdx = (bytes[1] >> 2) & 0b111;
    const hasCustomMov = Boolean((bytes[1] >> 5) & 1);

    const equipmentStates = {};
    if (version === 1) {
      const v1EqIds = [
        'bodyweight', 'running_area', 'pullup_bar', 'rings_dips',
        'kettlebell', 'dumbbell', 'barbell', 'bike_erg',
        'row_erg', 'ski_erg', 'jump_rope', 'plyo_box', 'wall_ball'
      ];
      equipmentStates[v1EqIds[0]] = eqStates[(bytes[1] >> 6) & 0b11] || 'off';
      for (let i = 1; i < v1EqIds.length; i++) {
        const byteIdx = 2 + Math.floor((i - 1) / 4);
        const shift = ((i - 1) % 4) * 2;
        const val = (bytes[byteIdx] >> shift) & 0b11;
        equipmentStates[v1EqIds[i]] = eqStates[val] || 'off';
      }
      if ('rings_dips' in equipmentStates) {
        equipmentStates.gym_rings = equipmentStates.rings_dips;
        equipmentStates.parallel_bars = equipmentStates.rings_dips;
        delete equipmentStates.rings_dips;
      }
    } else {
      if (catalog[0]) {
        equipmentStates[catalog[0].id] = eqStates[(bytes[1] >> 6) & 0b11] || 'off';
      }
      for (let i = 1; i < catalog.length && i <= 16; i++) {
        const byteIdx = 2 + Math.floor((i - 1) / 4);
        const shift = ((i - 1) % 4) * 2;
        const val = (bytes[byteIdx] >> shift) & 0b11;
        equipmentStates[catalog[i].id] = eqStates[val] || 'off';
      }
    }

    const anyUsable = Object.values(equipmentStates).some(s => s === 'available' || s === 'optional');
    if (!anyUsable) {
      equipmentStates.bodyweight = 'available';
    }

    const excludedMovements = new Set();
    const movOffset = version === 1 ? 5 : 6;
    const movMax = version === 1 ? 64 : 96;
    const minLen = version === 1 ? 13 : 18;
    if (hasCustomMov && bytes.length >= minLen) {
      for (let i = 0; i < db.length && i < movMax; i++) {
        if ((bytes[movOffset + (i >> 3)] >> (i & 7)) & 1) {
          excludedMovements.add(db[i].id);
        }
      }
    } else if (!includeHardMovements) {
      db.forEach(m => {
        if (m.difficulty === 'hard') excludedMovements.add(m.id);
      });
    }

    return {
      theme: themes[themeIdx] || 'system',
      duration: durations[durationIdx] || 'medium',
      includeHardMovements,
      mode: modes[modeIdx] || 'smart',
      format: formats[formatIdx] || 'ANY',
      equipmentStates,
      excludedMovements
    };
  },

  getConfigPayloadFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('cfg')) return params.get('cfg');

      const hash = (window.location.hash || '').replace(/^#/, '');
      if (hash && !hash.startsWith('z.') && !hash.startsWith('u.') && !hash.startsWith('w.')) {
        const hashParams = new URLSearchParams(hash);
        if (hashParams.has('cfg')) return hashParams.get('cfg');
      }
    } catch (e) {
      console.warn('Error reading config URL params:', e);
    }
    return null;
  },

  loadConfigFromUrl() {
    const payload = this.getConfigPayloadFromUrl();
    if (!payload) return null;
    try {
      return this.decodeConfig(payload);
    } catch (err) {
      console.warn('Could not decode config from URL:', err);
      return null;
    }
  },

  createConfigShareUrl(appState = globalThis.AppState) {
    const encoded = this.encodeConfig(appState);
    const url = new URL(window.location.href);
    if (url.protocol === 'file:') {
      url.search = '';
      url.hash = 'cfg=' + encoded;
    } else {
      url.searchParams.delete('wod');
      url.searchParams.delete('share');
      url.searchParams.set('cfg', encoded);
      url.hash = '';
    }
    return url.toString();
  },

  getPayloadFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('wod')) return params.get('wod');
      if (params.has('share')) return params.get('share');

      const hash = (window.location.hash || '').replace(/^#/, '');
      if (hash.startsWith('z.') || hash.startsWith('u.') || hash.startsWith('w.')) return hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        if (hashParams.has('wod')) return hashParams.get('wod');
        if (hashParams.has('share')) return hashParams.get('share');
      }
    } catch (e) {
      console.warn('Error reading URL params:', e);
    }
    return null;
  },

  async loadWodFromUrl() {
    const payload = this.getPayloadFromUrl();
    if (!payload) return null;
    try {
      return await this.decodeWod(payload);
    } catch (err) {
      console.warn('Could not decode workout from URL:', err);
      return null;
    }
  },

  async createShareUrl(wod, baseHref = null) {
    const encoded = await this.encodeWod(wod);
    const url = new URL(baseHref || window.location.href);
    if (url.protocol === 'file:') {
      url.search = '';
      url.hash = 'wod=' + encoded;
    } else {
      url.searchParams.delete('cfg');
      url.searchParams.delete('share');
      url.searchParams.set('wod', encoded);
      url.hash = '';
    }
    return url.toString();
  },

  async upgradeShareUrl(urlOrPayload) {
    if (!urlOrPayload || typeof urlOrPayload !== 'string') return null;
    const input = urlOrPayload.trim();
    if (!input) return null;

    const looksLikeUrl = /^[a-z][a-z0-9+.-]*:/i.test(input) || input.includes('?') || input.includes('#');
    if (!looksLikeUrl) {
      const wod = await this.decodeWod(input);
      if (!wod) return null;
      return await this.encodeWod(wod);
    }

    const url = new URL(input, 'https://wodroll.local');
    const hash = (url.hash || '').replace(/^#/, '');
    let payload = url.searchParams.get('wod') || url.searchParams.get('share');
    const usedBareHash = !payload && (hash.startsWith('z.') || hash.startsWith('u.') || hash.startsWith('w.'));
    if (usedBareHash) {
      payload = hash;
    } else if (!payload && hash) {
      const hashParams = new URLSearchParams(hash);
      payload = hashParams.get('wod') || hashParams.get('share');
    }
    if (!payload) return null;

    const wod = await this.decodeWod(payload);
    if (!wod) return null;
    const shortPayload = await this.encodeWod(wod);

    if (url.protocol === 'file:' || (!url.searchParams.has('wod') && !url.searchParams.has('share') && hash)) {
      url.search = '';
      url.hash = 'wod=' + shortPayload;
    } else {
      url.searchParams.delete('cfg');
      url.searchParams.delete('share');
      url.searchParams.set('wod', shortPayload);
      url.hash = '';
    }

    if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  },

  drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  },

  truncateCanvasText(ctx, text, maxWidth) {
    if (!text) return '';
    const str = String(text);
    if (ctx.measureText(str).width <= maxWidth) return str;
    let out = str;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.trimEnd() + '…';
  },

  wrapCanvasText(ctx, text, maxWidth, maxLines = 2) {
    if (!text) return [];
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let current = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
          current = word;
        } else {
          lines.push(this.truncateCanvasText(ctx, word, maxWidth));
          current = '';
        }
        if (lines.length === maxLines) {
          if (current) {
            const rest = [current, ...words.slice(i + 1)].join(' ');
            lines[maxLines - 1] = this.truncateCanvasText(ctx, `${lines[maxLines - 1]} ${rest}`, maxWidth);
          } else if (i < words.length - 1) {
            lines[maxLines - 1] = this.truncateCanvasText(ctx, `${lines[maxLines - 1]} ${words.slice(i + 1).join(' ')}`, maxWidth);
          }
          return lines;
        }
      }
    }
    if (current) {
      if (lines.length >= maxLines) {
        lines[maxLines - 1] = this.truncateCanvasText(ctx, `${lines[maxLines - 1]} ${current}`, maxWidth);
      } else {
        lines.push(current);
      }
    }
    return lines.slice(0, maxLines);
  },

  drawPillBadge(ctx, { x, y, h = 28, padX = 12, text, font, bg, fg, border = null, radius = 8 }) {
    ctx.save();
    ctx.font = font;
    const textW = ctx.measureText(text).width;
    const w = Math.ceil(textW + padX * 2);
    this.drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = bg;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + padX, y + h / 2 + 0.5);
    ctx.restore();
    return w;
  },

  renderWodCardCanvas(wod, shareUrl = '') {
    if (!wod || typeof document === 'undefined') return null;
    const SIZE = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isLight = typeof globalThis.renderFrame?.isLightTheme === 'function'
      ? globalThis.renderFrame.isLightTheme()
      : false;

    const theme = isLight ? {
      outerBg: '#f8fafc',
      outerGrid: 'rgba(15, 23, 42, 0.035)',
      cardBg: '#ffffff',
      cardBorder: '#e4e4e7',
      rowBg: '#fafafa',
      rowBorder: '#e4e4e7',
      thumbBg: '#f4f4f5',
      thumbBorder: '#e4e4e7',
      barBg: '#fafafa',
      barBorder: '#e4e4e7',
      primaryBg: '#09090b',
      primaryFg: '#ffffff',
      mutedPillBg: '#f4f4f5',
      mutedPillFg: '#52525b',
      mutedPillBorder: '#e4e4e7',
      emomBg: 'rgba(14, 165, 233, 0.14)',
      emomFg: '#0369a1',
      emomBorder: 'rgba(14, 165, 233, 0.34)',
      amberBorder: 'rgba(217, 119, 6, 0.55)',
      amberText: '#b45309',
      textPrimary: '#09090b',
      textSecondary: '#27272a',
      textMuted: '#64748b',
      accent: '#0284c7',
      divider: '#e4e4e7',
      gradStart: '#18181b',
      gradMid: '#0284c7',
      gradEnd: '#18181b'
    } : {
      outerBg: '#09090b',
      outerGrid: 'rgba(255, 255, 255, 0.03)',
      cardBg: '#121215',
      cardBorder: '#27272a',
      rowBg: '#09090b',
      rowBorder: '#27272a',
      thumbBg: '#18181b',
      thumbBorder: '#27272a',
      barBg: '#09090b',
      barBorder: '#27272a',
      primaryBg: '#38bdf8',
      primaryFg: '#09090b',
      mutedPillBg: '#18181b',
      mutedPillFg: '#a1a1aa',
      mutedPillBorder: '#27272a',
      emomBg: 'rgba(56, 189, 248, 0.16)',
      emomFg: '#7dd3fc',
      emomBorder: 'rgba(56, 189, 248, 0.35)',
      amberBorder: 'rgba(245, 158, 11, 0.48)',
      amberText: '#fbbf24',
      textPrimary: '#fafafa',
      textSecondary: '#d4d4d8',
      textMuted: '#a1a1aa',
      accent: '#38bdf8',
      divider: '#27272a',
      gradStart: '#38bdf8',
      gradMid: '#e4e4e7',
      gradEnd: '#38bdf8'
    };

    const wg = globalThis.WorkoutGenerator;
    const sansFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const monoFamily = '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';

    // 1. Outer frame (.bg-gym-grid) & card surface
    ctx.fillStyle = theme.outerBg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.strokeStyle = theme.outerGrid;
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= SIZE; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, SIZE);
      ctx.stroke();
    }
    for (let gy = 0; gy <= SIZE; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(SIZE, gy);
      ctx.stroke();
    }
    ctx.restore();

    const cardX = 32;
    const cardY = 32;
    const cardW = SIZE - 64;
    const cardH = SIZE - 64;
    this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.fillStyle = theme.cardBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top 6px accent bar clipped to card
    ctx.save();
    this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.clip();
    const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    grad.addColorStop(0, theme.gradStart);
    grad.addColorStop(0.5, theme.gradMid);
    grad.addColorStop(1, theme.gradEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(cardX, cardY, cardW, 6);
    ctx.restore();

    // 2. Header section
    const contentX = 68;
    const contentW = SIZE - 136; // 944px
    let badgeX = contentX;
    const badgeY = 68;

    if (wod.badgeFormat) {
      badgeX += this.drawPillBadge(ctx, {
        x: badgeX,
        y: badgeY,
        h: 32,
        padX: 14,
        text: String(wod.badgeFormat).toUpperCase(),
        font: `800 14px ${monoFamily}`,
        bg: theme.primaryBg,
        fg: theme.primaryFg,
        radius: 8
      }) + 10;
    }
    if (wod.badgeType) {
      this.drawPillBadge(ctx, {
        x: badgeX,
        y: badgeY,
        h: 32,
        padX: 14,
        text: String(wod.badgeType).toUpperCase(),
        font: `700 14px ${monoFamily}`,
        bg: theme.mutedPillBg,
        fg: theme.mutedPillFg,
        border: theme.mutedPillBorder,
        radius: 8
      });
    }

    // Top-right WODROLL mark
    ctx.save();
    ctx.font = `800 15px ${monoFamily}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const brandText = 'WODROLL';
    const brandW = ctx.measureText(brandText).width;
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(brandText, contentX + contentW, badgeY + 16);
    ctx.beginPath();
    ctx.arc(contentX + contentW - brandW - 14, badgeY + 16, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.restore();

    // Title
    const rawTitle = String(wod.title || 'WORKOUT');
    let titleSize = 48;
    ctx.save();
    ctx.fillStyle = theme.textPrimary;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    while (titleSize > 32) {
      ctx.font = `900 ${titleSize}px ${sansFamily}`;
      if (ctx.measureText(rawTitle).width <= contentW) break;
      titleSize -= 4;
    }
    const titleText = this.truncateCanvasText(ctx, rawTitle, contentW);
    ctx.fillText(titleText, contentX, 118);
    ctx.restore();

    // 3. Prescription & Clock Bar
    const barY = 204;
    const barH = 58;
    this.drawRoundedRect(ctx, contentX, barY, contentW, barH, 16);
    ctx.fillStyle = theme.barBg;
    ctx.fill();
    ctx.strokeStyle = theme.barBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const clockLabel = wg && typeof wg.getClockBadgeLabel === 'function'
      ? wg.getClockBadgeLabel(wod)
      : (wod.minutes ? `${wod.minutes}:00` : '');
    let clockReserveW = 20;
    if (clockLabel) {
      ctx.save();
      ctx.font = `800 18px ${monoFamily}`;
      const clockTextW = ctx.measureText(clockLabel).width;
      const clockPillW = Math.ceil(clockTextW + 52);
      const clockPillX = contentX + contentW - clockPillW - 12;
      const clockPillY = barY + 10;
      const clockPillH = 38;
      this.drawRoundedRect(ctx, clockPillX, clockPillY, clockPillW, clockPillH, 10);
      ctx.fillStyle = theme.cardBg;
      ctx.fill();
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Clock icon
      const cx = clockPillX + 18;
      const cy = clockPillY + clockPillH / 2;
      ctx.strokeStyle = theme.textMuted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 3.2, cy + 1.8);
      ctx.stroke();

      ctx.fillStyle = theme.textPrimary;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(clockLabel, clockPillX + 34, cy + 0.5);
      ctx.restore();
      clockReserveW = clockPillW + 32;
    }

    const headerText = wg && typeof wg.formatBannerPrescriptionHeader === 'function'
      ? wg.formatBannerPrescriptionHeader(wod.prescriptionHeader, wod.format)
      : (wod.prescriptionHeader || '');
    ctx.save();
    ctx.font = `700 21px ${sansFamily}`;
    ctx.fillStyle = theme.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const clippedHeader = this.truncateCanvasText(ctx, headerText, contentW - 24 - clockReserveW);
    ctx.fillText(clippedHeader, contentX + 20, barY + barH / 2 + 0.5);
    ctx.restore();

    // 4. Exercises List
    const items = Array.isArray(wod.items) ? wod.items : [];
    const listTopY = 282;
    const listMaxH = 598; // spans down to 880
    if (items.length === 0) {
      this.drawRoundedRect(ctx, contentX, listTopY, contentW, 140, 20);
      ctx.fillStyle = theme.rowBg;
      ctx.fill();
      ctx.strokeStyle = theme.rowBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      ctx.font = `600 22px ${sansFamily}`;
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No active movements selected.', contentX + contentW / 2, listTopY + 70);
      ctx.restore();
    } else {
      const count = items.length;
      const gap = count <= 3 ? 16 : (count === 4 ? 12 : 8);
      const rowH = Math.min(168, Math.floor((listMaxH - gap * (count - 1)) / count));
      const compact = rowH < 96;
      const thumbSize = Math.min(126, rowH - (compact ? 16 : 24));
      const titleFontSize = count <= 3 ? 27 : (count === 4 ? 23 : (rowH >= 96 ? 21 : 19));

      for (let i = 0; i < count; i++) {
        const item = items[i];
        const mov = item.movement || {};
        const rowY = listTopY + i * (rowH + gap);
        const hasSubHighlight = Boolean(item.isOptionalGear || item.isMissingGear);

        this.drawRoundedRect(ctx, contentX, rowY, contentW, rowH, 20);
        ctx.fillStyle = theme.rowBg;
        ctx.fill();
        ctx.strokeStyle = hasSubHighlight ? theme.amberBorder : theme.rowBorder;
        ctx.lineWidth = 1.75;
        ctx.stroke();

        // Left 2D biomechanical stick-figure thumbnail
        const thumbX = contentX + (compact ? 12 : 16);
        const thumbY = rowY + Math.floor((rowH - thumbSize) / 2);
        this.drawRoundedRect(ctx, thumbX, thumbY, thumbSize, thumbSize, compact ? 12 : 16);
        ctx.fillStyle = theme.thumbBg;
        ctx.fill();
        ctx.strokeStyle = theme.thumbBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (globalThis.BiomechanicalStickAnimator && mov.poseType) {
          ctx.save();
          this.drawRoundedRect(ctx, thumbX, thumbY, thumbSize, thumbSize, compact ? 12 : 16);
          ctx.clip();
          ctx.translate(thumbX, thumbY);
          const poseScale = thumbSize / 200;
          ctx.scale(poseScale, poseScale);
          const frame = globalThis.BiomechanicalStickAnimator.computePose(mov.poseType, 1200);
          globalThis.BiomechanicalStickAnimator.renderFrame(ctx, frame);
          ctx.restore();
        }

        // Right text & badges column
        const infoX = thumbX + thumbSize + (compact ? 16 : 22);
        const infoW = contentX + contentW - infoX - 18;
        const badgeH = compact ? 24 : 28;
        const badgeFont = compact ? `800 12px ${monoFamily}` : `800 14px ${monoFamily}`;
        const hasNote = !compact && Boolean(item.alternative || item.scaleDown);

        const blockH = badgeH + (compact ? 8 : 10) + titleFontSize + (hasNote ? 28 : 0);
        const blockTopY = rowY + Math.max(compact ? 10 : 14, Math.floor((rowH - blockH) / 2));

        let bx = infoX;
        if (item.emomMinuteBadge) {
          bx += this.drawPillBadge(ctx, {
            x: bx,
            y: blockTopY,
            h: badgeH,
            padX: compact ? 8 : 11,
            text: String(item.emomMinuteBadge),
            font: badgeFont,
            bg: theme.emomBg,
            fg: theme.emomFg,
            border: theme.emomBorder,
            radius: 7
          }) + 8;
        }
        if (item.repsDisplay) {
          bx += this.drawPillBadge(ctx, {
            x: bx,
            y: blockTopY,
            h: badgeH,
            padX: compact ? 9 : 12,
            text: String(item.repsDisplay),
            font: badgeFont,
            bg: theme.primaryBg,
            fg: theme.primaryFg,
            radius: 7
          }) + 8;
        }
        if (item.loadBadge) {
          bx += this.drawPillBadge(ctx, {
            x: bx,
            y: blockTopY,
            h: badgeH,
            padX: compact ? 8 : 11,
            text: String(item.loadBadge),
            font: badgeFont,
            bg: theme.mutedPillBg,
            fg: theme.textSecondary,
            border: theme.mutedPillBorder,
            radius: 7
          }) + 8;
        }

        const patLabel = globalThis.PATTERNS?.[mov.pattern]?.label;
        if (patLabel && bx + 60 < infoX + infoW) {
          ctx.save();
          ctx.font = `600 ${compact ? 12 : 13}px ${monoFamily}`;
          ctx.fillStyle = theme.textMuted;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';
          ctx.fillText(patLabel, infoX + infoW, blockTopY + badgeH / 2 + 0.5);
          ctx.restore();
        }

        // Exercise name
        const titleY = blockTopY + badgeH + (compact ? 8 : 11);
        ctx.save();
        ctx.font = `800 ${titleFontSize}px ${sansFamily}`;
        ctx.fillStyle = theme.textPrimary;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const movName = this.truncateCanvasText(ctx, item.prescriptionText || mov.name || '', infoW);
        ctx.fillText(movName, infoX, titleY);
        ctx.restore();

        // Optional alternative or scale-down line
        if (hasNote) {
          const noteY = titleY + titleFontSize + 9;
          const isAlt = Boolean((item.isOptionalGear || item.isMissingGear) && item.alternative);
          const notePrefix = isAlt ? 'OR SUB: ' : (item.scaleDown ? 'SCALE: ' : 'OR SUB: ');
          const noteText = isAlt
            ? item.alternative.text
            : (item.scaleDown ? item.scaleDown.text : item.alternative.text);
          ctx.save();
          ctx.font = `600 15px ${sansFamily}`;
          ctx.fillStyle = isAlt ? theme.amberText : theme.textMuted;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillText(this.truncateCanvasText(ctx, `${notePrefix}${noteText}`, infoW), infoX, noteY);
          ctx.restore();
        }
      }
    }

    // 5. Footer Section
    const footerTopY = 898;
    ctx.strokeStyle = theme.divider;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(contentX, footerTopY);
    ctx.lineTo(contentX + contentW, footerTopY);
    ctx.stroke();

    if (wod.stimulus) {
      ctx.save();
      ctx.font = `500 16px ${sansFamily}`;
      ctx.fillStyle = theme.textMuted;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const stimLines = this.wrapCanvasText(ctx, `Stimulus: ${wod.stimulus}`, contentW, 2);
      stimLines.forEach((line, idx) => {
        ctx.fillText(line, contentX, footerTopY + 14 + idx * 22);
      });
      ctx.restore();
    }

    const bottomY = 1004;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `700 14px ${monoFamily}`;
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('WODROLL • HIIT & CROSSFIT GENERATOR', contentX, bottomY);

    if (shareUrl) {
      const displayUrl = String(shareUrl).replace(/^https?:\/\//i, '');
      ctx.font = `700 14px ${monoFamily}`;
      ctx.fillStyle = theme.textSecondary;
      ctx.textAlign = 'right';
      ctx.fillText(this.truncateCanvasText(ctx, displayUrl, 480), contentX + contentW, bottomY);
    }
    ctx.restore();

    return canvas;
  },

  async renderWodCardBlob(wod) {
    let shareUrl = '';
    try {
      shareUrl = await this.createShareUrl(wod);
    } catch (e) { }
    const canvas = this.renderWodCardCanvas(wod, shareUrl);
    if (!canvas || typeof canvas.toBlob !== 'function') {
      throw new Error('Canvas toBlob unavailable');
    }
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    });
  },

  async copyWodImageToClipboard(wod, fallbackTextOrBuilder = '') {
    if (
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function'
    ) {
      try {
        const blobPromise = this.renderWodCardBlob(wod);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blobPromise })
        ]);
        return { mode: 'image' };
      } catch (err) {
        console.warn('Image clipboard failed, falling back to text:', err);
      }
    }

    const fallbackText = typeof fallbackTextOrBuilder === 'function'
      ? await fallbackTextOrBuilder()
      : fallbackTextOrBuilder;
    await this.copyToClipboard(fallbackText);
    return { mode: 'text' };
  },

  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('execCommand failed');
  }
};

globalThis.WorkoutSharing = WorkoutSharing;
export { WorkoutSharing };
