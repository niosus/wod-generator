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
          it: (wod.items || []).map(i => ({
            id: i.movement.id,
            fk: i.formatKey,
            si: i.stationIndex,
            cs: i.customScheme,
            rd: i.repsDisplay,
            pt: i.prescriptionText,
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

        const items = data.it.map(ci => {
          const mov = globalThis.MOVEMENTS_DB.find(m => m.id === ci.id) || globalThis.MOVEMENTS_DB[0];
          return {
            movement: mov,
            formatKey: ci.fk || data.f,
            stationIndex: ci.si !== undefined ? ci.si : null,
            customScheme: ci.cs || null,
            repsDisplay: ci.rd || '',
            prescriptionText: ci.pt || '',
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

        const restoredWod = {
          title: data.t,
          badgeType: data.bt,
          format: data.f,
          minutes: data.m,
          badgeFormat: data.bf,
          difficultyLabel: data.dl,
          prescriptionHeader: data.ph,
          stimulus: data.st,
          logic: data.lg,
          isBenchmark: Boolean(data.ib),
          items
        };

        // Attach alternatives or scale-downs if missing
        items.forEach((item) => {
          if (!item.alternative && item.isOptionalGear) {
            const alt = globalThis.AppState.resolveUniqueAlternative(item.movement, new Set(items.map(it => it.movement.id)));
            if (alt) {
              const repVal = globalThis.WorkoutGenerator?.convertCustomScheme
                ? globalThis.WorkoutGenerator.convertCustomScheme(item.movement, alt, item.formatKey, item.customScheme)
                : item.repsDisplay;
              const unit = alt.unit === 'cal' ? 'Cal' : (alt.unit === 'm' ? 'm' : (alt.unit === 'sec' ? 's' : ''));
              item.alternative = { movement: alt, repVal, text: `${repVal} ${unit} ${alt.name}`.replace(/\s+/g, ' ').trim() };
            }
          }
          if (!item.scaleDown) {
            const sc = globalThis.AppState.resolveScaleDown(item.movement, new Set(items.map(it => it.movement.id)));
            if (sc) {
              const repVal = globalThis.WorkoutGenerator?.convertCustomScheme
                ? globalThis.WorkoutGenerator.convertCustomScheme(item.movement, sc.movement, item.formatKey, item.customScheme)
                : item.repsDisplay;
              const unit = sc.movement.unit === 'cal' ? 'Cal' : (sc.movement.unit === 'm' ? 'm' : (sc.movement.unit === 'sec' ? 's' : ''));
              item.scaleDown = { movement: sc.movement, repVal, note: sc.note, text: `${repVal} ${unit} ${sc.movement.name}`.replace(/\s+/g, ' ').trim() };
            }
          }
        });

        return restoredWod;
      },

      getPayloadFromUrl() {
        try {
          const params = new URLSearchParams(window.location.search);
          if (params.has('wod')) return params.get('wod');
          if (params.has('share')) return params.get('share');

          const hash = (window.location.hash || '').replace(/^#/, '');
          if (hash.startsWith('wod=')) return hash.slice(4);
          if (hash.startsWith('share=')) return hash.slice(6);
          if (hash.startsWith('z.') || hash.startsWith('u.')) return hash;
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
