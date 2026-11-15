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

      async encodeWod(wod) {
        if (!wod) return '';
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
        const jsonStr = await this.decompress(encodedStr.trim());
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
          title: data.t,
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
          if (hash && !hash.startsWith('z.') && !hash.startsWith('u.')) {
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
          if (hash.startsWith('z.') || hash.startsWith('u.')) return hash;
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

      async createShareUrl(wod) {
        const encoded = await this.encodeWod(wod);
        const url = new URL(window.location.href);
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
