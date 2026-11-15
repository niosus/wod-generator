const UI = {
  isOutdated: false,
  _activeModalCount: 0,
  _activeAdvTab: 'equipment',
  _demoContext: null,
  _returnToDemoState: null,

  async init() {
    AppState.loadFromStorage();

    const sharedCfg = WorkoutSharing.loadConfigFromUrl();
    if (sharedCfg) {
      AppState.applyConfig(sharedCfg);
      AppState.saveToStorage();
    }

    this.initTheme();
    this.renderEquipmentGrid();
    this.renderMovementMatrix();
    this.renderParameterControls();
    this.bindEvents();

    const sharedWod = await WorkoutSharing.loadWodFromUrl();
    if (sharedWod) {
      this.displayWod(sharedWod);
      this.showSharedNotice(sharedWod);
    } else {
      this.generateAndDisplayWod();
      if (sharedCfg) {
        this.showToast('Custom setup loaded from link.');
      }
    }
  },

  // ===========================================================================
  // THEME MANAGEMENT (System default + User override)
  // ===========================================================================
  initTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (AppState.theme === 'system') {
          this.applyTheme();
        }
      };
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onChange);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(onChange);
      }
    }
    this.applyTheme();
  },

  applyTheme() {
    const prefersDark = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = AppState.theme === 'dark' || (AppState.theme === 'system' && prefersDark);

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.toggle('dark', isDark);
    }

    const btn = document.getElementById('themeToggleBtn');
    const iconEl = document.getElementById('themeToggleIcon');
    const labelEl = document.getElementById('themeToggleLabel');
    const autoBtn = document.getElementById('themeAutoResetBtn');

    if (iconEl) iconEl.setAttribute('data-lucide', isDark ? 'moon' : 'sun');

    if (AppState.theme === 'system') {
      if (labelEl) labelEl.textContent = 'Auto';
      if (btn) btn.title = isDark
        ? 'Theme: Auto (Dark) — Click to switch to Light'
        : 'Theme: Auto (Light) — Click to switch to Dark';
      if (autoBtn) {
        autoBtn.classList.add('hidden');
        autoBtn.classList.remove('inline-flex');
      }
    } else {
      if (labelEl) labelEl.textContent = isDark ? 'Dark' : 'Light';
      if (btn) btn.title = isDark
        ? 'Theme: Dark — Click to switch to Light'
        : 'Theme: Light — Click to switch to Dark';
      if (autoBtn) {
        autoBtn.classList.remove('hidden');
        autoBtn.classList.add('inline-flex');
      }
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  cycleTheme() {
    const prefersDark = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = AppState.theme === 'dark' || (AppState.theme === 'system' && prefersDark);
    AppState.theme = isDark ? 'light' : 'dark';
    AppState.saveToStorage();
    this.clearConfigUrl();
    this.applyTheme();
  },

  resetThemeToAuto() {
    AppState.theme = 'system';
    AppState.saveToStorage();
    this.clearConfigUrl();
    this.applyTheme();
  },

  clearConfigUrl() {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        let changed = false;
        if (url.searchParams.has('cfg')) {
          url.searchParams.delete('cfg');
          changed = true;
        }
        if (url.hash && url.hash.includes('cfg=')) {
          url.hash = '';
          changed = true;
        }
        if (changed) {
          window.history.replaceState(null, '', url.toString());
        }
      } catch (e) { }
    }
  },

  // ===========================================================================
  // SHARING & TOAST FEEDBACK
  // ===========================================================================
  showSharedNotice(wod) {
    const notice = document.getElementById('sharedWodNotice');
    const noticeTitle = document.getElementById('sharedWodTitleNotice');
    if (notice && noticeTitle) {
      noticeTitle.textContent = wod.title;
      notice.classList.remove('hidden');
    }
  },

  clearSharedUrl() {
    const notice = document.getElementById('sharedWodNotice');
    if (notice) notice.classList.add('hidden');
    if (window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('wod');
        url.searchParams.delete('share');
        if (url.hash.startsWith('#wod=') || url.hash.startsWith('#share=') || url.hash.startsWith('#z.') || url.hash.startsWith('#u.')) {
          url.hash = '';
        }
        window.history.replaceState(null, '', url.toString());
      } catch (e) { }
    }
  },

  showToast(message, type = 'success') {
    let toastEl = document.getElementById('wodForgeToast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'wodForgeToast';
      toastEl.className = 'fixed bottom-5 right-5 z-[70] transition-all duration-300 opacity-0 translate-y-3 pointer-events-none max-w-sm';
      document.body.appendChild(toastEl);
    }
    const isOk = type === 'success';
    toastEl.innerHTML = `
      <div class="px-4 py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-900 border ${isOk ? 'border-zinc-800 dark:border-volt/40 text-white' : 'border-rose-500/40 text-rose-200'} shadow-xl backdrop-blur-md flex items-center gap-2.5">
        <div class="w-2 h-2 rounded-full ${isOk ? 'bg-volt' : 'bg-rose-500'} shrink-0"></div>
        <p class="text-xs font-medium leading-relaxed">${message}</p>
      </div>
    `;
    toastEl.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toastEl.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
    }, 3200);
  },

  async shareConfig() {
    try {
      const shareUrl = WorkoutSharing.createConfigShareUrl(AppState);
      if (window.history && window.history.replaceState) {
        try {
          window.history.replaceState(null, '', shareUrl);
        } catch (e) { }
      }
      await WorkoutSharing.copyToClipboard(shareUrl);

      const headerLabel = document.getElementById('shareConfigLabel');
      if (headerLabel) {
        headerLabel.textContent = 'Copied!';
        setTimeout(() => { headerLabel.textContent = 'Share Setup'; }, 2000);
      }
      this.showToast('Short setup link copied! Anyone opening it gets your exact gear & settings.');
    } catch (err) {
      console.error('Share config error:', err);
      this.showToast('Could not copy setup link to clipboard.', 'error');
    }
  },

  async shareWod(wod) {
    if (!wod) return;
    const shareBtn = document.getElementById('shareWodBtn');
    const shareLabel = document.getElementById('shareWodLabel');
    try {
      const shareUrl = await WorkoutSharing.createShareUrl(wod);

      if (window.history && window.history.replaceState) {
        try {
          window.history.replaceState(null, '', shareUrl);
        } catch (e) { }
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (navigator.share && isMobile) {
        try {
          const clockLabel = WorkoutGenerator.getClockBadgeLabel(wod);
          await navigator.share({
            title: `WODFORGE: ${wod.title}`,
            text: `${wod.title} (${wod.badgeFormat}${clockLabel ? ' • ' + clockLabel : ''}) - ${wod.prescriptionHeader}`,
            url: shareUrl
          });
          this.showToast('Workout shared!');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      await WorkoutSharing.copyToClipboard(shareUrl);

      if (shareLabel) shareLabel.textContent = 'Copied!';
      const icon = shareBtn ? shareBtn.querySelector('i') : null;
      if (icon) icon.setAttribute('data-lucide', 'check');
      lucide.createIcons();

      this.showToast('Workout link copied to clipboard!');

      setTimeout(() => {
        if (shareLabel) shareLabel.textContent = 'Share';
        if (icon) icon.setAttribute('data-lucide', 'share-2');
        lucide.createIcons();
      }, 2200);
    } catch (err) {
      console.error('Share workout error:', err);
      this.showToast('Could not copy link to clipboard.', 'error');
    }
  },

  // ===========================================================================
  // OUTDATED STATE & QUICK BAR SYNC
  // ===========================================================================
  markWodOutdated(isOutdated = true) {
    this.isOutdated = isOutdated;
    const card = document.getElementById('wodCardContainer');
    const badge = document.getElementById('wodOutdatedBadge');
    const mainGenBtn = document.getElementById('generateWodBtn');
    const rerollBtn = document.getElementById('rerollWodBtn');
    const mainLabel = document.getElementById('generateWodBtnLabel');
    const rerollLabel = document.getElementById('rerollWodLabel');
    const mainSideDot = document.getElementById('generateWodSideDot');
    const rerollSideDot = document.getElementById('rerollSideDot');

    const sideDots = [mainSideDot, rerollSideDot].filter(Boolean);
    const actionButtons = [mainGenBtn, rerollBtn].filter(Boolean);

    if (isOutdated) {
      this.clearConfigUrl();
      if (card) card.classList.add('wod-outdated');
      if (badge) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      }
      if (mainLabel) mainLabel.textContent = 'Update & Roll';
      if (rerollLabel) rerollLabel.textContent = 'Update';
      sideDots.forEach(dot => dot.classList.remove('hidden'));

      actionButtons.forEach(btn => {
        btn.classList.remove('btn-bump');
        void btn.offsetWidth;
        btn.classList.add('btn-bump');
        btn.addEventListener('animationend', () => {
          btn.classList.remove('btn-bump');
        }, { once: true });
      });
    } else {
      if (card) card.classList.remove('wod-outdated');
      if (badge) {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
      }
      if (mainLabel) mainLabel.textContent = 'Apply & Roll Workout';
      if (rerollLabel) rerollLabel.textContent = 'Re-Roll';
      sideDots.forEach(dot => dot.classList.add('hidden'));
      actionButtons.forEach(btn => btn.classList.remove('btn-bump'));
    }
    lucide.createIcons();
  },

  syncQuickBar() {
    const activePreset = typeof AppState.getActiveEquipmentPreset === 'function'
      ? AppState.getActiveEquipmentPreset()
      : 'custom';

    // Quick Bar Preset buttons
    document.querySelectorAll('.quick-preset-btn').forEach(btn => {
      const isMatch = btn.dataset.preset === activePreset;
      btn.className = `quick-preset-btn flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap text-center ${
        isMatch
          ? 'bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950 shadow-sm'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    const customPresetBadge = document.getElementById('customPresetBadge');
    if (customPresetBadge) {
      customPresetBadge.classList.toggle('hidden', activePreset !== 'custom');
    }

    // Advanced Modal Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const isMatch = btn.dataset.preset === activePreset;
      btn.className = `preset-btn text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
        isMatch
          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
          : 'bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
      }`;
    });

    // Quick Bar Duration buttons
    document.querySelectorAll('.quick-duration-btn').forEach(btn => {
      const isMatch = btn.dataset.duration === AppState.duration;
      btn.className = `quick-duration-btn px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition whitespace-nowrap ${
        isMatch
          ? 'bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950 shadow-sm'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    // Quick Bar Skill Toggle
    const skillBtn = document.getElementById('quickSkillToggleBtn');
    const skillDot = document.getElementById('quickSkillDot');
    const skillLabel = document.getElementById('quickSkillLabel');
    if (skillBtn && skillDot && skillLabel) {
      if (AppState.includeHardMovements) {
        skillBtn.className = 'px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-800 dark:text-volt dark:border-volt/50';
        skillDot.className = 'w-1.5 h-1.5 rounded-full bg-volt';
        skillLabel.textContent = 'Rx+';
      } else {
        skillBtn.className = 'px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700';
        skillDot.className = 'w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500';
        skillLabel.textContent = 'Standard';
      }
    }

    // Tune Button Overrides Badge
    const advBadge = document.getElementById('advancedActiveBadge');
    if (advBadge && typeof AppState.getCustomOverridesCount === 'function') {
      const overrides = AppState.getCustomOverridesCount();
      if (overrides > 0) {
        advBadge.textContent = String(overrides);
        advBadge.classList.remove('hidden');
      } else {
        advBadge.classList.add('hidden');
      }
    }
  },

  // ===========================================================================
  // EQUIPMENT, MOVEMENT POOL & PARAMETER RENDERERS (Advanced Mode)
  // ===========================================================================
  renderEquipmentGrid() {
    const container = document.getElementById('equipmentGrid');
    if (container) {
      container.innerHTML = EQUIPMENT_CATALOG.map(eq => {
        const state = AppState.equipmentStates[eq.id] || 'off';
        let cardClass = 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400';
        let iconClass = 'text-zinc-400 dark:text-zinc-500';

        if (state === 'available') {
          cardClass = 'bg-white dark:bg-zinc-900 border-zinc-950 dark:border-volt/60 text-zinc-950 dark:text-white shadow-sm';
          iconClass = 'text-zinc-950 dark:text-volt';
        } else if (state === 'optional') {
          cardClass = 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-600/70 dark:border-amber-400/70 border-dashed text-amber-950 dark:text-amber-100';
          iconClass = 'text-amber-700 dark:text-amber-300';
        }

        return `
          <div class="rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${cardClass}">
            <div class="flex items-center gap-2 min-w-0">
              <i data-lucide="${eq.icon}" class="w-4 h-4 shrink-0 ${iconClass}"></i>
              <span class="text-xs font-bold truncate">${eq.name}</span>
            </div>

            <div class="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <button
                data-eq-id="${eq.id}"
                data-eq-state="available"
                class="eq-state-btn py-1 rounded text-[10px] font-mono font-bold uppercase transition ${state === 'available'
                  ? 'bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }"
              >HAVE</button>
              <button
                data-eq-id="${eq.id}"
                data-eq-state="optional"
                class="eq-state-btn py-1 rounded text-[10px] font-mono font-bold uppercase transition ${state === 'optional'
                  ? 'bg-amber-600 text-white dark:bg-amber-400 dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-300'
                }"
              >OPT</button>
              <button
                data-eq-id="${eq.id}"
                data-eq-state="off"
                class="eq-state-btn py-1 rounded text-[10px] font-mono font-bold uppercase transition ${state === 'off'
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-950 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }"
              >OFF</button>
            </div>
          </div>
        `;
      }).join('');
    }
    this.syncQuickBar();
    lucide.createIcons();
  },

  renderMovementMatrix() {
    const availableByEq = AppState.getAvailableMovementsByEquipment();
    const activePool = AppState.getActiveMovementPool();

    const activeSummaryEl = document.getElementById('activePoolSummary');
    if (activeSummaryEl) {
      activeSummaryEl.textContent = `${activePool.length}/${availableByEq.length}`;
    }

    const availableHard = availableByEq.filter(m => m.difficulty === 'hard');
    const activeHard = activePool.filter(m => m.difficulty === 'hard');
    const hardSwitch = document.getElementById('toggleHardSwitch');
    const hardKnob = document.getElementById('toggleHardKnob');
    const hardBadge = document.getElementById('hardCountBadge');

    if (hardBadge) hardBadge.textContent = `${activeHard.length} / ${availableHard.length} Active`;
    if (hardSwitch && hardKnob) {
      const isOn = AppState.includeHardMovements && activeHard.length > 0;
      hardSwitch.setAttribute('aria-checked', isOn ? 'true' : 'false');
      if (isOn) {
        hardSwitch.className = 'relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-zinc-950 dark:bg-volt';
        hardKnob.className = 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-zinc-950 shadow transition duration-200 ease-in-out translate-x-6';
      } else {
        hardSwitch.className = 'relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-zinc-300 dark:bg-zinc-700';
        hardKnob.className = 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out translate-x-0';
      }
    }

    const allNormalActive = availableByEq.filter(m => m.difficulty === 'normal').every(m => !AppState.excludedMovements.has(m.id));
    const noHardActive = activeHard.length === 0;
    const allHardActive = availableHard.length > 0 && activeHard.length === availableHard.length;

    let activeSkillPreset = 'custom';
    if (allNormalActive && noHardActive) activeSkillPreset = 'normal_only';
    else if (allNormalActive && allHardActive) activeSkillPreset = 'all_enabled';

    document.querySelectorAll('.skill-preset-btn').forEach(btn => {
      const isMatch = btn.dataset.skillpreset === activeSkillPreset;
      btn.className = `skill-preset-btn py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition ${
        isMatch
          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt/20 dark:border-volt dark:text-volt'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    const tabsEl = document.getElementById('matrixCategoryTabs');
    if (tabsEl) {
      const categories = [
        { id: 'ALL', label: `All (${availableByEq.length})` },
        ...Object.values(PATTERNS).map(pat => {
          const count = availableByEq.filter(m => m.pattern === pat.id).length;
          return { id: pat.id, label: `${pat.label} (${count})` };
        })
      ];
      tabsEl.innerHTML = categories.map(cat => {
        const active = AppState.activeMatrixCategory === cat.id;
        return `
          <button
            data-mcat="${cat.id}"
            class="mcat-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap shrink-0 border ${active
              ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
              : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border-zinc-200 dark:border-zinc-800'
            }"
          >${cat.label}</button>
        `;
      }).join('');
    }

    const diffBadgeClasses = {
      easy: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      normal: 'bg-volt-600/10 text-volt-700 dark:bg-volt/15 dark:text-volt border-volt-600/30 dark:border-volt/30',
      hard: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
    };

    document.querySelectorAll('.diff-filter-btn').forEach(btn => {
      const key = btn.dataset.difffilter;
      const active = key === AppState.activeDiffFilter;
      btn.className = `diff-filter-btn px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
        active
          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
          : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    const gridEl = document.getElementById('movementAnimatedGrid');
    if (gridEl) {
      const filteredMovements = availableByEq.filter(m => {
        const catMatch = AppState.activeMatrixCategory === 'ALL' || m.pattern === AppState.activeMatrixCategory;
        const diffMatch = AppState.activeDiffFilter === 'ALL' || m.difficulty === AppState.activeDiffFilter;
        return catMatch && diffMatch;
      });

      if (filteredMovements.length === 0) {
        gridEl.innerHTML = `
          <div class="col-span-full text-center py-8 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            No movements match this filter with your currently enabled equipment.
          </div>
        `;
      } else {
        gridEl.innerHTML = filteredMovements.map(mov => {
          const isIncluded = !AppState.excludedMovements.has(mov.id);
          const patInfo = PATTERNS[mov.pattern];
          const isOptionalEq = AppState.isEquipmentOptional(mov.equipment);

          return `
            <div
              data-mov-card="${mov.id}"
              class="relative group rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition cursor-pointer select-none ${isIncluded
                ? 'bg-white dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-volt/60 shadow-sm'
                : 'bg-zinc-100/70 dark:bg-zinc-950/30 border-zinc-200/70 dark:border-zinc-800/60 opacity-50 hover:opacity-80 grayscale hover:grayscale-0'
              }"
            >
              <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                  diffBadgeClasses[mov.difficulty] || diffBadgeClasses.normal
                }">${mov.difficulty.toUpperCase()}</span>

                <div class="flex items-center gap-1">
                  ${isOptionalEq ? `<span class="text-[8px] font-mono font-bold uppercase px-1 rounded bg-amber-600/15 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-600/35 dark:border-amber-500/30">OPT</span>` : ''}
                  <input
                    type="checkbox"
                    data-mov-toggle="${mov.id}"
                    ${isIncluded ? 'checked' : ''}
                    class="w-3.5 h-3.5 rounded accent-zinc-950 dark:accent-sky-400 cursor-pointer pointer-events-none"
                  />
                </div>
              </div>

              <div class="w-full aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center overflow-hidden relative">
                <canvas
                  data-matrix-pose="${mov.poseType}"
                  width="120"
                  height="120"
                  class="w-full h-full block"
                ></canvas>
              </div>

              <div class="min-w-0">
                <div class="text-xs font-bold text-zinc-950 dark:text-white truncate" title="${mov.name}">
                  ${mov.name}
                </div>
                <div class="flex items-center justify-between gap-1 mt-1 text-[10px]">
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap truncate ${patInfo.color}">
                    ${patInfo.label}
                  </span>
                  <button
                    data-demo-mov="${mov.id}"
                    class="text-[10px] font-mono font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-volt flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 transition shrink-0"
                    title="View form cues & scaling progression"
                  >
                    <span>Cues</span>
                    <i data-lucide="chevron-right" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        gridEl.querySelectorAll('canvas[data-matrix-pose]').forEach(canvas => {
          BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.matrixPose);
        });
      }
    }

    this.syncQuickBar();
    lucide.createIcons();
  },

  renderParameterControls() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const active = btn.dataset.mode === AppState.mode;
      btn.className = `mode-btn py-2.5 px-2 rounded-xl border text-xs font-semibold transition flex flex-col items-center text-center gap-0.5 ${active
        ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt/15 dark:border-volt dark:text-volt shadow-sm'
        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    document.querySelectorAll('.format-btn').forEach(btn => {
      const active = btn.dataset.format === AppState.format;
      btn.className = `format-btn py-2 px-2 rounded-xl border text-xs font-mono font-semibold transition ${
        btn.dataset.format === 'INTERVALS' ? 'col-span-2 sm:col-span-1 ' : ''
      }${active
        ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt/15 dark:border-volt dark:text-volt shadow-sm'
        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    document.querySelectorAll('.duration-btn').forEach(btn => {
      const active = btn.dataset.duration === AppState.duration;
      btn.className = `duration-btn py-2.5 px-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center ${active
        ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt/15 dark:border-volt dark:text-volt shadow-sm'
        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    this.syncQuickBar();
  },

  // ===========================================================================
  // WORKOUT DISPLAY & INLINE INTENSITY / ROW UPDATES
  // ===========================================================================
  animateTextUpdate(el, nextText, animClass = 'rep-pulse') {
    if (!el || el.textContent === nextText) return;
    el.textContent = nextText;
    el.classList.remove('rep-pulse', 'text-pulse');
    void el.offsetWidth;
    el.classList.add(animClass);
    el.addEventListener('animationend', () => {
      el.classList.remove(animClass);
    }, { once: true });
  },

  renderWodIntensityControl(wod) {
    const panel = document.getElementById('wodIntensityPanel');
    const choiceBtns = document.querySelectorAll('.wod-intensity-choice-btn');
    if (!panel) return;

    const baseBtnClass = 'wod-intensity-choice-btn py-1 px-2.5 rounded-md text-[11px] font-mono font-bold transition duration-200';
    const isEmpty = !wod || !Array.isArray(wod.items) || wod.items.length === 0;
    const shouldHide = Boolean(!wod || wod.isBenchmark || isEmpty);

    const applyVisibility = () => {
      panel.classList.toggle('is-collapsed', shouldHide);
      panel.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    };

    if (!this._hasRenderedIntensityOnce) {
      this._hasRenderedIntensityOnce = true;
      panel.style.transition = 'none';
      applyVisibility();
      void panel.offsetHeight;
      panel.style.transition = '';
    } else {
      applyVisibility();
    }

    if (shouldHide) {
      choiceBtns.forEach(btn => {
        btn.disabled = true;
        btn.tabIndex = -1;
      });
      return;
    }

    const activeTier = WorkoutGenerator.normalizeIntensity(wod.intensity);
    const activeTierClasses = {
      moderate: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 shadow-sm',
      standard: 'bg-volt-600 text-white dark:bg-volt dark:text-zinc-950 shadow-sm',
      high: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white shadow-sm'
    };
    const inactiveClass = 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white';

    choiceBtns.forEach(btn => {
      btn.disabled = false;
      btn.tabIndex = 0;
      const tier = btn.dataset.wodIntensity;
      const isActive = tier === activeTier;
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      btn.className = `${baseBtnClass} cursor-pointer ${
        isActive ? (activeTierClasses[tier] || activeTierClasses.standard) : inactiveClass
      }`;
    });
  },

  applyWodIntensity(tier) {
    const wod = AppState.currentWod;
    if (!wod || wod.isBenchmark || !Array.isArray(wod.items) || wod.items.length === 0) return;

    const normalized = WorkoutGenerator.normalizeIntensity(tier);
    if (wod.intensity === normalized) {
      this.renderWodIntensityControl(wod);
      return;
    }

    WorkoutGenerator.rescaleWodIntensity(wod, normalized);

    this.animateTextUpdate(document.getElementById('wodBadgeFormat'), wod.badgeFormat, 'rep-pulse');
    this.animateTextUpdate(document.getElementById('wodBadgeDifficulty'), wod.difficultyLabel, 'rep-pulse');
    this.animateTextUpdate(document.getElementById('wodPrescriptionHeader'), wod.prescriptionHeader, 'text-pulse');

    const listEl = document.getElementById('wodMovementsList');
    if (listEl) {
      wod.items.forEach((item, idx) => {
        const rowEl = listEl.querySelector(`[data-wod-row-index="${idx}"]`);
        if (!rowEl) return;
        this.animateTextUpdate(rowEl.querySelector('[data-wod-reps-badge]'), item.repsDisplay, 'rep-pulse');
        this.animateTextUpdate(rowEl.querySelector('[data-wod-prescription-text]'), item.prescriptionText, 'text-pulse');
        if (item.scaleDown) {
          this.animateTextUpdate(rowEl.querySelector('[data-wod-scale-text]'), item.scaleDown.text, 'text-pulse');
        }
        if (item.alternative) {
          this.animateTextUpdate(rowEl.querySelector('[data-wod-alt-text]'), item.alternative.text, 'text-pulse');
        }
      });
    }

    this.renderWodIntensityControl(wod);
  },

  generateAndDisplayWod() {
    this.clearSharedUrl();
    const wod = WorkoutGenerator.generate();
    this.displayWod(wod);
  },

  displayWod(wod) {
    AppState.currentWod = wod;
    if (wod && typeof WorkoutGenerator.getWodSignature === 'function') {
      const sig = WorkoutGenerator.getWodSignature(wod);
      if (sig) AppState.addRecentWorkout(sig);
    }
    this.markWodOutdated(false);

    const cardContainer = document.getElementById('wodCardContainer');
    const accentBar = document.getElementById('wodAccentBar');
    if (cardContainer) {
      cardContainer.classList.remove('wod-card-refresh');
      void cardContainer.offsetWidth;
      cardContainer.classList.add('wod-card-refresh');
    }
    if (accentBar) {
      accentBar.classList.remove('accent-glow-sweep');
      void accentBar.offsetWidth;
      accentBar.classList.add('accent-glow-sweep');
    }

    document.getElementById('wodBadgeType').textContent = wod.badgeType;
    document.getElementById('wodBadgeFormat').textContent = wod.badgeFormat;
    document.getElementById('wodBadgeDifficulty').textContent = wod.difficultyLabel;
    document.getElementById('wodTitle').textContent = wod.title;
    document.getElementById('wodPrescriptionHeader').textContent =
      WorkoutGenerator.formatBannerPrescriptionHeader(wod.prescriptionHeader, wod.format);

    const clockLabel = WorkoutGenerator.getClockBadgeLabel(wod);
    const timeCapBadgeEl = document.getElementById('wodTimeCapBadge');
    const timeCapTextEl = document.getElementById('wodTimeCapText');
    if (timeCapTextEl) {
      timeCapTextEl.textContent = clockLabel;
    }
    if (timeCapBadgeEl) {
      timeCapBadgeEl.classList.toggle('hidden', !clockLabel);
    }

    document.getElementById('wodStimulusText').textContent = wod.stimulus;
    document.getElementById('wodLogicText').textContent = wod.logic;
    const previewEl = document.getElementById('wodCoachPreviewText');
    if (previewEl) {
      previewEl.textContent = wod.stimulus ? `— ${wod.stimulus}` : '';
    }

    this.renderWodIntensityControl(wod);

    const listEl = document.getElementById('wodMovementsList');
    if (wod.items.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No active movements selected. Open <button type="button" data-open-adv-from-empty class="underline font-semibold text-zinc-950 dark:text-volt">Tune</button> to enable gear or movements.
        </div>
      `;
    } else {
      listEl.innerHTML = wod.items.map((item, index) => this.renderWodItemHtml(item, index, index * 90)).join('');
    }

    listEl.querySelectorAll('canvas[data-ik-pose]').forEach(canvas => {
      BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.ikPose);
    });

    const uniquePatterns = Array.from(new Set(wod.items.map(i => i.movement.pattern)));
    document.getElementById('wodPatternTags').innerHTML = uniquePatterns.map(pid => {
      const pat = PATTERNS[pid];
      return `<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${pat.color}">${pat.label}</span>`;
    }).join('');

    lucide.createIcons();
  },

  renderWodItemHtml(item, index, animationDelay = null, isSingleRow = false) {
    const mov = item.movement;
    const pat = PATTERNS[mov.pattern];
    const isHard = mov.difficulty === 'hard';
    const eqInfo = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment);
    const delay = animationDelay !== null ? animationDelay : (index * 90);
    const animClass = isSingleRow ? '' : 'wod-item-animated';
    const styleAttr = isSingleRow ? '' : `style="animation-delay: ${delay}ms;"`;

    const ladders = globalThis.ProgressionEngine ? ProgressionEngine.getLaddersForMovement(mov.id) : [];
    const primaryLadder = ladders[0] || null;
    const ladderIdx = primaryLadder ? primaryLadder.steps.findIndex(s => s.movementId === mov.id) : -1;
    const hasLadder = Boolean(primaryLadder && ladderIdx >= 0);

    const hasSubBorder = item.isOptionalGear || item.isMissingGear;
    const rowBorderClass = hasSubBorder
      ? 'border-amber-600/65 dark:border-amber-500/50'
      : 'border-zinc-200/90 dark:border-zinc-800/90';

    return `
      <div
        data-wod-row-index="${index}"
        class="${animClass} bg-zinc-50/75 dark:bg-zinc-950/60 border ${rowBorderClass} rounded-xl p-3 sm:p-3.5 transition space-y-2.5"
        ${styleAttr}
      >
        <div class="flex items-center justify-between gap-3">
          <div
            data-demo-mov="${mov.id}"
            data-wod-row="${index}"
            class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <!-- Live 2D IK Canvas Mini Viewport -->
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
              <canvas
                data-ik-pose="${mov.poseType}"
                width="72"
                height="72"
                class="w-14 h-14 sm:w-16 sm:h-16 block"
              ></canvas>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span data-wod-reps-badge class="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950 whitespace-nowrap">
                  ${item.repsDisplay}
                </span>
                ${hasLadder ? `
                  <button
                    type="button"
                    data-open-progression-mov="${mov.id}"
                    data-wod-row="${index}"
                    class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-volt hover:text-zinc-950 dark:hover:text-volt transition whitespace-nowrap flex items-center gap-1"
                    title="View or adjust step in ${primaryLadder.name}"
                  >
                    <i data-lucide="git-merge" class="w-2.5 h-2.5"></i>
                    <span>Step ${ladderIdx + 1}/${primaryLadder.steps.length}</span>
                  </button>
                ` : ''}
                ${item.isOptionalGear ? `
                  <span class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-600/15 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-600/35 dark:border-amber-500/30 whitespace-nowrap">
                    Opt: ${eqInfo ? eqInfo.name : ''}
                  </span>
                ` : (item.isMissingGear ? `
                  <span class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 whitespace-nowrap">
                    No ${eqInfo ? eqInfo.name : 'Gear'}
                  </span>
                ` : '')}
              </div>

              <div data-wod-prescription-text class="text-sm sm:text-base font-bold text-zinc-950 dark:text-white group-hover:text-volt-700 dark:group-hover:text-volt transition truncate">
                ${item.prescriptionText}
              </div>

              <div class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                ${pat.label} · ${eqInfo ? eqInfo.name : 'Bodyweight'}${isHard ? ' · Rx+' : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            data-demo-mov="${mov.id}"
            data-wod-row="${index}"
            class="shrink-0 p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1 transition"
            title="Inspect form cues & scaling progression"
          >
            <span class="hidden sm:inline">Details</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Inline Scale-Down Bar -->
        ${item.scaleDown ? `
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs">
            <div class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 min-w-0">
              <i data-lucide="trending-down" class="w-3.5 h-3.5 text-zinc-400 shrink-0"></i>
              <span class="truncate"><span class="font-medium text-zinc-500 dark:text-zinc-400">Scale:</span> <span data-wod-scale-text class="font-semibold text-zinc-800 dark:text-zinc-200">${item.scaleDown.text}</span></span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${hasLadder ? `
                <button
                  type="button"
                  data-open-progression-mov="${mov.id}"
                  data-wod-row="${index}"
                  class="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono font-semibold text-[10px] uppercase tracking-wider transition"
                >
                  Progression
                </button>
              ` : ''}
              <button
                type="button"
                data-scale-item-index="${index}"
                class="px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-volt dark:hover:text-zinc-950 text-white dark:text-zinc-100 border border-zinc-900 dark:border-zinc-700 font-mono font-bold text-[10px] uppercase tracking-wider transition"
              >
                Scale
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Inline Alternative Bar for Optional / Missing Gear -->
        ${(item.isOptionalGear || item.isMissingGear) && item.alternative ? `
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-600/30 dark:border-amber-400/30 text-xs">
            <div class="flex items-center gap-1.5 text-amber-900 dark:text-amber-200/90 min-w-0">
              <i data-lucide="repeat" class="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0"></i>
              <span class="truncate"><span class="font-semibold">No ${eqInfo ? eqInfo.name : 'Gear'}? Sub:</span> <span data-wod-alt-text>${item.alternative.text}</span></span>
            </div>
            <button
              type="button"
              data-swap-item-index="${index}"
              class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-zinc-950 font-mono font-bold text-[10px] uppercase tracking-wider transition shrink-0"
            >
              Swap
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  updateWodRow(idx) {
    const wod = AppState.currentWod;
    if (!wod || !wod.items || !wod.items[idx]) return;

    if (typeof WorkoutGenerator.getWodSignature === 'function') {
      const sig = WorkoutGenerator.getWodSignature(wod);
      if (sig) AppState.addRecentWorkout(sig);
    }

    const listEl = document.getElementById('wodMovementsList');
    if (!listEl) return;

    const rowEl = listEl.querySelector(`[data-wod-row-index="${idx}"]`) || listEl.children[idx];
    if (!rowEl) return;

    if (rowEl._isRowTransitioning) return;
    rowEl._isRowTransitioning = true;
    rowEl.style.pointerEvents = 'none';

    rowEl.classList.remove('wod-item-animated');
    rowEl.style.animation = 'none';
    void rowEl.offsetHeight;

    rowEl.style.transition = 'opacity 0.16s ease-out, transform 0.16s ease-out';
    rowEl.style.opacity = '0';
    rowEl.style.transform = 'scale(0.97)';

    setTimeout(() => {
      if (!rowEl.parentNode || !document.body.contains(rowEl)) return;

      const item = wod.items[idx];
      const temp = document.createElement('div');
      temp.innerHTML = this.renderWodItemHtml(item, idx, 0, true);
      const newRowEl = temp.firstElementChild;
      if (!newRowEl) return;

      const affectedElements = [
        ...Array.from(listEl.children).slice(idx + 1),
        ...(listEl.nextElementSibling ? [listEl.nextElementSibling] : [])
      ];

      const firstTops = new Map();
      affectedElements.forEach(el => {
        el.classList.remove('wod-item-animated');
        el.style.animation = 'none';
        const top = typeof el.getBoundingClientRect === 'function'
          ? el.getBoundingClientRect().top + window.scrollY
          : el.offsetTop;
        firstTops.set(el, top);
      });

      rowEl.innerHTML = newRowEl.innerHTML;
      rowEl.className = newRowEl.className;
      rowEl.classList.remove('wod-item-animated');
      rowEl.style.animation = 'none';

      const animatingElements = [];
      affectedElements.forEach(el => {
        const firstTop = firstTops.get(el);
        const lastTop = typeof el.getBoundingClientRect === 'function'
          ? el.getBoundingClientRect().top + window.scrollY
          : el.offsetTop;
        const deltaY = firstTop - lastTop;
        if (Math.abs(deltaY) > 0.5) {
          el.classList.remove('wod-item-animated');
          el.style.animation = 'none';
          el.style.transition = 'none';
          el.style.transform = `translateY(${deltaY}px)`;
          animatingElements.push(el);
        }
      });

      void listEl.offsetHeight;

      requestAnimationFrame(() => {
        rowEl.style.transition = 'opacity 0.26s ease-out, transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)';
        rowEl.style.opacity = '1';
        rowEl.style.transform = 'scale(1)';
        rowEl.style.pointerEvents = '';

        animatingElements.forEach(el => {
          el.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translateY(0)';
        });
      });

      setTimeout(() => {
        animatingElements.forEach(el => {
          el.style.transition = '';
          el.style.transform = '';
        });
        rowEl.style.transition = '';
        rowEl.style.opacity = '';
        rowEl.style.transform = '';
        rowEl.style.pointerEvents = '';
        rowEl._isRowTransitioning = false;
      }, 420);

      const canvas = rowEl.querySelector('canvas[data-ik-pose]');
      if (canvas) {
        BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.ikPose);
      }

      const uniquePatterns = Array.from(new Set(wod.items.map(i => i.movement.pattern)));
      const patternTagsEl = document.getElementById('wodPatternTags');
      if (patternTagsEl) {
        patternTagsEl.innerHTML = uniquePatterns.map(pid => {
          const pat = PATTERNS[pid];
          return `<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${pat.color}">${pat.label}</span>`;
        }).join('');
      }

      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }, 140);
  },

  applyLadderMovementToWod(targetMovId) {
    const idx = this._demoContext?.wodRowIndex;
    const wod = AppState.currentWod;
    if (idx === null || idx === undefined || !wod || !wod.items || !wod.items[idx]) return;

    const targetMov = MOVEMENTS_DB.find(m => m.id === targetMovId);
    if (!targetMov) return;

    const currentItem = wod.items[idx];
    let nextCustomScheme = null;
    if (currentItem.customScheme !== null && currentItem.customScheme !== undefined) {
      const context = WorkoutGenerator.buildWodContext(wod);
      nextCustomScheme = WorkoutGenerator.convertCustomScheme(
        currentItem.movement,
        targetMov,
        currentItem.formatKey || wod.format,
        currentItem.customScheme,
        context
      );
    }

    wod.items[idx].movement = targetMov;
    wod.items[idx].customScheme = nextCustomScheme;
    delete wod.items[idx].benchmarkCustomLabel;

    WorkoutGenerator.refreshWodCollisionFreeMetadata(wod);
    this.closeMovementDemoModal();
    this.updateWodRow(idx);
  },

  // ===========================================================================
  // MODAL LIFECYCLE HELPERS
  // ===========================================================================
  lockBodyScroll() {
    this._activeModalCount++;
    if (this._activeModalCount === 1) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0 && window.innerWidth === document.documentElement.clientWidth) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
  },

  unlockBodyScroll() {
    this._activeModalCount = Math.max(0, this._activeModalCount - 1);
    if (this._activeModalCount === 0) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  },

  _openModalEl(modal, card) {
    if (!modal) return;
    const wasHiddenOrClosing = modal.classList.contains('hidden') || modal._isClosing;
    if (modal._closeTimer) {
      clearTimeout(modal._closeTimer);
      modal._closeTimer = null;
    }
    modal._isClosing = false;

    modal.classList.remove('hidden', 'backdrop-fade-out');
    modal.classList.add('flex', 'backdrop-fade-in');

    if (card) {
      card.classList.remove('modal-fade-out', 'modal-open-anim');
      void card.offsetWidth;
      card.classList.add('modal-open-anim');
    }

    if (wasHiddenOrClosing) {
      this.lockBodyScroll();
    }
  },

  _closeModalEl(modal, card, onAfterClose = null) {
    if (!modal || modal.classList.contains('hidden') || modal._isClosing) return;
    modal._isClosing = true;

    modal.classList.remove('backdrop-fade-in');
    modal.classList.add('backdrop-fade-out');

    if (card) {
      card.classList.remove('modal-open-anim');
      void card.offsetWidth;
      card.classList.add('modal-fade-out');
    }

    modal._closeTimer = setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'backdrop-fade-in', 'backdrop-fade-out');
      if (card) {
        card.classList.remove('modal-open-anim', 'modal-fade-out');
      }
      this.unlockBodyScroll();
      modal._isClosing = false;
      modal._closeTimer = null;
      if (onAfterClose) onAfterClose();
    }, 240);
  },

  // ===========================================================================
  // ADVANCED SETUP MODAL
  // ===========================================================================
  openAdvancedModal(initialTab = 'equipment') {
    const modal = document.getElementById('advancedModal');
    const card = document.getElementById('advancedModalCard');
    if (!modal) return;

    this.switchAdvancedTab(initialTab);
    this._openModalEl(modal, card);
    lucide.createIcons();
  },

  closeAdvancedModal() {
    const modal = document.getElementById('advancedModal');
    const card = document.getElementById('advancedModalCard');
    this._closeModalEl(modal, card);
  },

  switchAdvancedTab(tabId) {
    this._activeAdvTab = tabId;
    document.querySelectorAll('.adv-tab-btn').forEach(btn => {
      const active = btn.dataset.advTab === tabId;
      btn.className = `adv-tab-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });

    const eqPanel = document.getElementById('advTabEquipment');
    const rulesPanel = document.getElementById('advTabRules');
    const movPanel = document.getElementById('advTabMovements');

    if (eqPanel) eqPanel.classList.toggle('hidden', tabId !== 'equipment');
    if (rulesPanel) rulesPanel.classList.toggle('hidden', tabId !== 'rules');
    if (movPanel) movPanel.classList.toggle('hidden', tabId !== 'movements');

    const body = document.getElementById('advancedModalBody');
    if (body) body.scrollTop = 0;
  },

  // ===========================================================================
  // MOVEMENT DEMO & PROGRESSION MODAL
  // ===========================================================================
  openMovementDemoModal(movementId, options = {}) {
    const mov = MOVEMENTS_DB.find(m => m.id === movementId);
    if (!mov) return;

    const { wodRowIndex = null, focusProgression = false } = options;
    this._demoContext = {
      movementId,
      wodRowIndex: wodRowIndex !== null && wodRowIndex !== undefined ? Number(wodRowIndex) : null
    };

    const pat = PATTERNS[mov.pattern];
    const eq = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment);
    const isHard = mov.difficulty === 'hard';

    const patBadge = document.getElementById('demoModalPatternBadge');
    patBadge.textContent = pat.label;
    patBadge.className = `text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${pat.color}`;

    const diffBadge = document.getElementById('demoModalDifficultyBadge');
    diffBadge.textContent = isHard ? 'RX+ / HARD' : (mov.difficulty === 'easy' ? 'SCALED / EASY' : 'STANDARD');
    diffBadge.className = `text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
      isHard
        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
        : (mov.difficulty === 'easy'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          : 'bg-volt-600/10 text-volt-700 dark:bg-volt/15 dark:text-volt border-volt-600/30 dark:border-volt/30')
    }`;

    document.getElementById('demoModalEquipBadge').textContent = eq ? eq.name : 'Bodyweight';
    document.getElementById('demoModalTitle').textContent = mov.name;
    document.getElementById('demoModalCues').textContent = mov.cues;
    document.getElementById('demoModalScaling').textContent = mov.scaling;

    const modalCanvas = document.getElementById('demoModalCanvas');
    BiomechanicalStickAnimator.registerCanvas(modalCanvas, mov.poseType);

    this.renderMovementProgressionInDemo(mov, this._demoContext.wodRowIndex);

    const modal = document.getElementById('movementDemoModal');
    const card = document.getElementById('movementDemoCard');
    this._openModalEl(modal, card);

    if (card) {
      if (focusProgression) {
        requestAnimationFrame(() => {
          const progSection = document.getElementById('demoModalProgressionSection');
          if (progSection) {
            progSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      } else {
        card.scrollTop = 0;
      }
    }
    lucide.createIcons();
  },

  renderMovementProgressionInDemo(mov, wodRowIndex) {
    const titleEl = document.getElementById('demoModalProgressionTitle');
    const subEl = document.getElementById('demoModalProgressionSubtitle');
    const stepsContainer = document.getElementById('demoModalProgressionSteps');
    const toAllBtn = document.getElementById('demoToAllProgressionsBtn');
    if (!stepsContainer) return;

    const ladders = globalThis.ProgressionEngine
      ? ProgressionEngine.getLaddersForMovement(mov.id)
      : [];

    if (toAllBtn) {
      toAllBtn.dataset.targetPattern = mov.pattern;
    }

    if (ladders.length === 0) {
      if (titleEl) titleEl.textContent = 'Standalone Movement';
      if (subEl) subEl.textContent = 'Not part of a multi-step ladder. Browse all progressions below.';
      stepsContainer.innerHTML = '';
      return;
    }

    const primaryLadder = ladders[0];
    if (titleEl) titleEl.textContent = primaryLadder.name;
    if (subEl) subEl.textContent = primaryLadder.description;

    const canApplyToWorkout = wodRowIndex !== null && wodRowIndex !== undefined &&
      AppState.currentWod && Array.isArray(AppState.currentWod.items) && AppState.currentWod.items[wodRowIndex];

    stepsContainer.innerHTML = ladders.map((ladder, lIdx) => {
      const headerHtml = lIdx > 0
        ? `<div class="pt-2 pb-1 text-xs font-bold text-zinc-900 dark:text-white">${ladder.name}</div>`
        : '';

      const stepsHtml = ladder.steps.map(step => {
        const stepMov = MOVEMENTS_DB.find(m => m.id === step.movementId);
        const isCurrent = step.movementId === mov.id;
        const eqName = stepMov ? (EQUIPMENT_CATALOG.find(e => e.id === stepMov.equipment)?.name || 'Bodyweight') : 'Bodyweight';
        const pose = stepMov ? stepMov.poseType : 'squat_side';

        return `
          <div
            data-preview-ladder-mov="${step.movementId}"
            class="cursor-pointer rounded-xl border p-2.5 flex items-center justify-between gap-2.5 transition ${
              isCurrent
                ? 'bg-zinc-950/5 dark:bg-volt/10 border-zinc-950 dark:border-volt'
                : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                <canvas data-demo-ladder-pose="${pose}" width="56" height="56" class="w-12 h-12 block"></canvas>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                    step.tier === 'hard'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : (step.tier === 'easy'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-volt-600/10 text-volt-700 dark:bg-volt/15 dark:text-volt border-volt-600/30 dark:border-volt/30')
                  }">Lvl ${step.level} · ${step.tier.toUpperCase()}</span>
                </div>
                <div class="text-xs font-bold text-zinc-950 dark:text-white truncate">${step.label}</div>
                <div class="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">${eqName}</div>
              </div>
            </div>

            <div class="shrink-0 flex items-center gap-1.5">
              ${isCurrent ? `
                <span class="px-2 py-1 rounded-lg bg-zinc-950 text-white dark:bg-volt dark:text-zinc-950 font-mono font-bold text-[10px] uppercase">
                  Current
                </span>
              ` : (canApplyToWorkout ? `
                <button
                  type="button"
                  data-apply-ladder-mov="${step.movementId}"
                  class="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-volt dark:hover:bg-volt-400 text-white dark:text-zinc-950 font-mono font-bold text-[10px] uppercase tracking-wider transition"
                >
                  Use in Workout
                </button>
              ` : `
                <span class="text-[11px] font-mono text-zinc-400 flex items-center gap-0.5">
                  Preview <i data-lucide="chevron-right" class="w-3 h-3"></i>
                </span>
              `)}
            </div>
          </div>
        `;
      }).join('');

      return headerHtml + stepsHtml;
    }).join('');

    stepsContainer.querySelectorAll('canvas[data-demo-ladder-pose]').forEach(canvas => {
      BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.demoLadderPose);
    });
  },

  closeMovementDemoModal() {
    const modal = document.getElementById('movementDemoModal');
    const card = document.getElementById('movementDemoCard');
    this._closeModalEl(modal, card);
  },

  // ===========================================================================
  // BENCHMARKS MODAL
  // ===========================================================================
  openBenchmarksModal(filter = 'all') {
    const modal = document.getElementById('benchmarksModal');
    const card = document.getElementById('benchmarksModalCard');
    if (!modal) return;

    this._activeBFilter = filter;
    const searchInput = document.getElementById('benchmarksSearchInput');
    if (searchInput) searchInput.value = '';
    this.updateBenchmarkFilterButtons(filter);
    this.renderBenchmarksModal(filter);
    this._openModalEl(modal, card);
  },

  updateBenchmarkFilterButtons(activeFilter) {
    document.querySelectorAll('.bfilter-btn').forEach(b => {
      const isMatch = b.dataset.bfilter === activeFilter;
      b.className = `bfilter-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
        isMatch
          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });
  },

  closeBenchmarksModal() {
    const modal = document.getElementById('benchmarksModal');
    const card = document.getElementById('benchmarksModalCard');
    this._closeModalEl(modal, card);
  },

  renderBenchmarksModal(filter = 'all', searchQuery = '') {
    const container = document.getElementById('benchmarksListContainer');
    const list = CLASSICAL_BENCHMARKS.filter(b => {
      let matchesFilter = true;
      if (filter === 'eligible') matchesFilter = AppState.isBenchmarkEligible(b);
      else if (filter === 'girls') matchesFilter = b.category.toLowerCase().includes('girl');
      else if (filter === 'heroes') matchesFilter = b.category.toLowerCase().includes('hero');

      if (!matchesFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) ||
        b.items.some(it => it.label.toLowerCase().includes(q)) ||
        (b.stimulus && b.stimulus.toLowerCase().includes(q));
    });

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 text-center py-8 text-xs text-zinc-500 dark:text-zinc-400">
          No classical benchmarks match your current filter.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(bm => {
      const eligible = AppState.isBenchmarkEligible(bm);
      const isGirl = bm.category.toLowerCase().includes('girl');
      const isHero = bm.category.toLowerCase().includes('hero');
      const hasHard = bm.items.some(it => {
        const m = MOVEMENTS_DB.find(x => x.id === it.movementId);
        return m && m.difficulty === 'hard';
      });

      return `
        <div
          data-load-benchmark="${bm.id}"
          class="cursor-pointer bg-zinc-50 dark:bg-zinc-950/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border ${
            eligible ? 'border-zinc-950/30 dark:border-volt/40' : 'border-zinc-200 dark:border-zinc-800'
          } rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition"
        >
          <div>
            <div class="flex items-start sm:items-center justify-between gap-2 mb-1.5">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <span class="font-bold text-sm text-zinc-950 dark:text-white">${bm.title}</span>
                <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                  ${isGirl ? 'GIRL' : (isHero ? 'HERO' : 'SPECIAL')}
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${hasHard ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">RX+</span>` : ''}
                <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${eligible
                  ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt/15 dark:text-volt dark:border-volt/30'
                  : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }">
                  ${eligible ? 'Ready' : 'Gear Needed'}
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-[11px] font-mono text-zinc-600 dark:text-zinc-300">${WorkoutGenerator.formatBannerPrescriptionHeader(bm.prescriptionHeader, bm.format)}</div>
              <span class="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                <i data-lucide="clock" class="w-3 h-3 shrink-0"></i>
                <span>${WorkoutGenerator.getClockBadgeLabel(bm)}</span>
              </span>
            </div>
            <ul class="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5">
              ${bm.items.map(it => `<li>• ${it.label}</li>`).join('')}
            </ul>
          </div>
          <div class="text-[11px] font-mono font-semibold text-zinc-950 dark:text-volt flex items-center justify-end gap-1 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
            <span>Load Workout</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  // ===========================================================================
  // ALL SCALING PROGRESSIONS MODAL
  // ===========================================================================
  openScaleModal(pattern = 'ALL', options = {}) {
    const modal = document.getElementById('scaleModal');
    const card = document.getElementById('scaleModalCard');
    if (!modal) return;

    const backBtn = document.getElementById('scaleModalBackBtn');
    if (backBtn) {
      const showBack = Boolean(options.showBackButton && this._returnToDemoState);
      backBtn.classList.toggle('hidden', !showBack);
      backBtn.classList.toggle('inline-flex', showBack);
    }

    this._activeScalePattern = pattern;
    this.updateScalePatternButtons(pattern);
    this.renderScaleModal(pattern);
    this._openModalEl(modal, card);
    lucide.createIcons();
  },

  updateScalePatternButtons(activePattern) {
    document.querySelectorAll('.spattern-btn').forEach(b => {
      const isMatch = b.dataset.spattern === activePattern;
      b.className = `spattern-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
        isMatch
          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-volt dark:text-zinc-950 dark:border-volt'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:text-zinc-950 dark:hover:text-white'
      }`;
    });
  },

  closeScaleModal(preserveReturnState = false) {
    const modal = document.getElementById('scaleModal');
    const card = document.getElementById('scaleModalCard');
    if (!preserveReturnState) {
      this._returnToDemoState = null;
    }
    this._closeModalEl(modal, card);
  },

  renderScaleModal(patternFilter = 'ALL', searchQuery = '') {
    const container = document.getElementById('scaleLaddersContainer');
    if (!container) return;

    let ladders = globalThis.SCALE_LADDERS || [];
    if (patternFilter !== 'ALL') {
      ladders = ladders.filter(l => l.pattern === patternFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      ladders = ladders.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.steps.some(s => s.label.toLowerCase().includes(q))
      );
    }

    if (ladders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          No scale progression ladders match this filter.
        </div>
      `;
      return;
    }

    container.innerHTML = ladders.map(ladder => {
      const patInfo = PATTERNS[ladder.pattern] || { label: ladder.pattern, color: 'text-zinc-500 border-zinc-300' };

      return `
        <div class="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5">
            <div class="flex items-center justify-between sm:justify-start gap-2">
              <span class="text-sm font-black text-zinc-950 dark:text-white leading-snug">${ladder.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${patInfo.color}">${patInfo.label}</span>
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">${ladder.description}</div>
          </div>

          <div class="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 pt-0.5">
            ${ladder.steps.map((step, idx) => {
              const mov = MOVEMENTS_DB.find(m => m.id === step.movementId);
              const isHard = step.tier === 'hard';
              const isEasy = step.tier === 'easy';
              const tierBadge = isEasy
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : (isHard ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' : 'bg-volt-600/10 text-volt-700 dark:bg-volt/15 dark:text-volt border-volt-600/30 dark:border-volt/30');

              const isLast = idx === ladder.steps.length - 1;
              const pose = mov ? mov.poseType : 'squat_side';

              return `
                <div class="flex items-center gap-1.5 w-full sm:w-auto">
                  <div
                    data-demo-mov="${step.movementId}"
                    class="cursor-pointer group rounded-xl p-2.5 border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-volt/60 transition flex flex-col items-center text-center w-full sm:w-32 h-[196px] sm:h-[214px] gap-1.5 shadow-sm flex-1 min-w-0"
                    title="Click to inspect cues & form"
                  >
                    <div class="w-full flex items-center justify-between gap-1 shrink-0">
                      <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${tierBadge}">
                        ${step.tier.toUpperCase()}
                      </span>
                      <span class="text-[9px] font-mono text-zinc-400">Lvl ${step.level}</span>
                    </div>

                    <div class="w-20 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center overflow-hidden mx-auto shrink-0">
                      <canvas
                        data-scale-pose="${pose}"
                        width="88"
                        height="88"
                        class="w-full h-full block"
                      ></canvas>
                    </div>

                    <div class="w-full min-w-0 px-0.5 flex flex-col justify-center">
                      <div class="h-8 flex items-center justify-center text-center">
                        <span class="text-[11px] font-bold text-zinc-950 dark:text-white group-hover:text-volt-700 dark:group-hover:text-volt transition line-clamp-2 leading-snug">
                          ${step.label}
                        </span>
                      </div>
                      <div class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        ${mov ? (EQUIPMENT_CATALOG.find(e => e.id === mov.equipment)?.name || 'Bodyweight') : 'Bodyweight'}
                      </div>
                    </div>

                    <div class="text-[9px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-volt flex items-center gap-0.5 pt-1 border-t border-zinc-200/80 dark:border-zinc-800 w-full justify-center mt-auto shrink-0">
                      <span>Cues</span>
                      <i data-lucide="chevron-right" class="w-2.5 h-2.5"></i>
                    </div>
                  </div>

                  ${!isLast ? `
                    <div class="hidden sm:flex text-zinc-400 dark:text-zinc-600 items-center shrink-0">
                      <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('canvas[data-scale-pose]').forEach(canvas => {
      BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.scalePose);
    });
    lucide.createIcons();
  },

  // ===========================================================================
  // EVENT BINDINGS
  // ===========================================================================
  bindEvents() {
    // Theme Toggle & Auto Reset
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.cycleTheme());
    }
    const themeAutoBtn = document.getElementById('themeAutoResetBtn');
    if (themeAutoBtn) {
      themeAutoBtn.addEventListener('click', () => this.resetThemeToAuto());
    }

    // Share Config (Header + Advanced Modal Footer)
    const shareCfgBtn = document.getElementById('shareConfigBtn');
    if (shareCfgBtn) {
      shareCfgBtn.addEventListener('click', () => this.shareConfig());
    }
    const copyCfgModalBtn = document.getElementById('copyConfigModalBtn');
    if (copyCfgModalBtn) {
      copyCfgModalBtn.addEventListener('click', () => this.shareConfig());
    }

    // Simple Mode Quick Bar & Modal: Equipment Presets
    const applyPreset = (preset, autoRoll = false) => {
      AppState.applyEquipmentPreset(preset);
      AppState.saveToStorage();
      this.renderEquipmentGrid();
      this.renderMovementMatrix();
      if (autoRoll) {
        this.generateAndDisplayWod();
      } else {
        this.markWodOutdated(true);
      }
    };

    document.querySelectorAll('.quick-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset, true));
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset, false));
    });

    const customPresetBadge = document.getElementById('customPresetBadge');
    if (customPresetBadge) {
      customPresetBadge.addEventListener('click', () => this.openAdvancedModal('equipment'));
    }

    // Simple Mode Quick Bar: Duration
    document.querySelectorAll('.quick-duration-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.duration = btn.dataset.duration;
        AppState.saveToStorage();
        this.renderParameterControls();
        this.generateAndDisplayWod();
      });
    });

    // Simple Mode Quick Bar: Skill Tier Toggle
    const quickSkillBtn = document.getElementById('quickSkillToggleBtn');
    if (quickSkillBtn) {
      quickSkillBtn.addEventListener('click', () => {
        AppState.includeHardMovements = !AppState.includeHardMovements;
        MOVEMENTS_DB.forEach(m => {
          if (m.difficulty === 'hard') {
            if (AppState.includeHardMovements) AppState.excludedMovements.delete(m.id);
            else AppState.excludedMovements.add(m.id);
          }
        });
        AppState.saveToStorage();
        this.renderMovementMatrix();
        this.generateAndDisplayWod();
      });
    }

    // Advanced Modal Open / Close / Tabs
    const openAdvBtn = document.getElementById('openAdvancedModalBtn');
    if (openAdvBtn) {
      openAdvBtn.addEventListener('click', () => this.openAdvancedModal('equipment'));
    }
    const closeAdvBtn = document.getElementById('closeAdvancedModalBtn');
    if (closeAdvBtn) {
      closeAdvBtn.addEventListener('click', () => this.closeAdvancedModal());
    }
    const advModal = document.getElementById('advancedModal');
    if (advModal) {
      advModal.addEventListener('click', e => {
        if (e.target.id === 'advancedModal') this.closeAdvancedModal();
      });
    }
    document.querySelectorAll('.adv-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchAdvancedTab(btn.dataset.advTab));
    });

    // 3-State Equipment Segmented Buttons
    document.getElementById('equipmentGrid').addEventListener('click', e => {
      const btn = e.target.closest('.eq-state-btn');
      if (!btn) return;
      const eqId = btn.dataset.eqId;
      const newState = btn.dataset.eqState;

      AppState.equipmentStates[eqId] = newState;
      const anyUsable = Object.values(AppState.equipmentStates).some(s => s === 'available' || s === 'optional');
      if (!anyUsable) {
        AppState.equipmentStates.bodyweight = 'available';
      }

      AppState.saveToStorage();
      this.renderEquipmentGrid();
      this.renderMovementMatrix();
      this.markWodOutdated(true);
    });

    // Global Hard Movements Switch inside Advanced Modal
    document.getElementById('toggleHardSwitch').addEventListener('click', () => {
      AppState.includeHardMovements = !AppState.includeHardMovements;
      MOVEMENTS_DB.forEach(m => {
        if (m.difficulty === 'hard') {
          if (AppState.includeHardMovements) AppState.excludedMovements.delete(m.id);
          else AppState.excludedMovements.add(m.id);
        }
      });
      AppState.saveToStorage();
      this.renderMovementMatrix();
      this.markWodOutdated(true);
    });

    // Quick Skill Filter Preset Buttons
    document.querySelectorAll('.skill-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.skillpreset;
        if (preset === 'normal_only') {
          AppState.includeHardMovements = false;
          AppState.excludedMovements.clear();
          MOVEMENTS_DB.forEach(m => {
            if (m.difficulty === 'hard') AppState.excludedMovements.add(m.id);
          });
        } else if (preset === 'all_enabled') {
          AppState.includeHardMovements = true;
          AppState.excludedMovements.clear();
        } else if (preset === 'custom') {
          this.switchAdvancedTab('movements');
          return;
        }
        AppState.saveToStorage();
        this.renderMovementMatrix();
        this.markWodOutdated(true);
      });
    });

    // Matrix Category & Difficulty Sub-Filter Tabs
    document.getElementById('matrixCategoryTabs').addEventListener('click', e => {
      const btn = e.target.closest('.mcat-btn');
      if (!btn) return;
      AppState.activeMatrixCategory = btn.dataset.mcat;
      this.renderMovementMatrix();
    });

    document.querySelectorAll('.diff-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.activeDiffFilter = btn.dataset.difffilter;
        this.renderMovementMatrix();
      });
    });

    // Movement Card Selection & Cues Modal inside Animated Grid
    document.getElementById('movementAnimatedGrid').addEventListener('click', e => {
      const cuesBtn = e.target.closest('[data-demo-mov]');
      if (cuesBtn) {
        e.stopPropagation();
        this.openMovementDemoModal(cuesBtn.dataset.demoMov);
        return;
      }
      const card = e.target.closest('[data-mov-card]');
      if (card) {
        const movId = card.dataset.movCard;
        if (AppState.excludedMovements.has(movId)) {
          AppState.excludedMovements.delete(movId);
          const mov = MOVEMENTS_DB.find(m => m.id === movId);
          if (mov && mov.difficulty === 'hard') AppState.includeHardMovements = true;
        } else {
          AppState.excludedMovements.add(movId);
        }
        AppState.saveToStorage();
        this.renderMovementMatrix();
        this.markWodOutdated(true);
      }
    });

    // Select Visible / Clear Visible
    document.getElementById('enableAllMovementsBtn').addEventListener('click', () => {
      const availableByEq = AppState.getAvailableMovementsByEquipment();
      const filtered = availableByEq.filter(m => {
        const catMatch = AppState.activeMatrixCategory === 'ALL' || m.pattern === AppState.activeMatrixCategory;
        const diffMatch = AppState.activeDiffFilter === 'ALL' || m.difficulty === AppState.activeDiffFilter;
        return catMatch && diffMatch;
      });
      filtered.forEach(m => AppState.excludedMovements.delete(m.id));
      AppState.saveToStorage();
      this.renderMovementMatrix();
      this.markWodOutdated(true);
    });

    document.getElementById('disableAllMovementsBtn').addEventListener('click', () => {
      const availableByEq = AppState.getAvailableMovementsByEquipment();
      const filtered = availableByEq.filter(m => {
        const catMatch = AppState.activeMatrixCategory === 'ALL' || m.pattern === AppState.activeMatrixCategory;
        const diffMatch = AppState.activeDiffFilter === 'ALL' || m.difficulty === AppState.activeDiffFilter;
        return catMatch && diffMatch;
      });
      filtered.forEach(m => AppState.excludedMovements.add(m.id));
      AppState.saveToStorage();
      this.renderMovementMatrix();
      this.markWodOutdated(true);
    });

    // Generator Parameter Controls
    document.getElementById('modeSelectorGrid').addEventListener('click', e => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      AppState.mode = btn.dataset.mode;
      AppState.saveToStorage();
      this.renderParameterControls();
      this.markWodOutdated(true);
    });

    document.getElementById('formatSelectorGrid').addEventListener('click', e => {
      const btn = e.target.closest('.format-btn');
      if (!btn) return;
      AppState.format = btn.dataset.format;
      AppState.saveToStorage();
      this.renderParameterControls();
      this.markWodOutdated(true);
    });

    document.getElementById('durationSelectorGrid').addEventListener('click', e => {
      const btn = e.target.closest('.duration-btn');
      if (!btn) return;
      AppState.duration = btn.dataset.duration;
      AppState.saveToStorage();
      this.renderParameterControls();
      this.markWodOutdated(true);
    });

    // Post-Generation Intensity Selector
    const wodIntensityChoiceGrid = document.getElementById('wodIntensityChoiceGrid');
    if (wodIntensityChoiceGrid) {
      wodIntensityChoiceGrid.addEventListener('click', e => {
        const choiceBtn = e.target.closest('.wod-intensity-choice-btn');
        if (!choiceBtn || choiceBtn.disabled) return;
        this.applyWodIntensity(choiceBtn.dataset.wodIntensity);
      });
    }

    // Generate (from Advanced Modal) & Re-Roll WOD Buttons
    document.getElementById('generateWodBtn').addEventListener('click', () => {
      this.closeAdvancedModal();
      this.generateAndDisplayWod();
    });
    document.getElementById('rerollWodBtn').addEventListener('click', () => {
      this.generateAndDisplayWod();
    });
    const outdatedRollBtn = document.getElementById('outdatedOverlayRollBtn');
    if (outdatedRollBtn) {
      outdatedRollBtn.addEventListener('click', () => {
        this.generateAndDisplayWod();
      });
    }

    // WOD Movements List: Swap, Scale Down, Open Progression, OR Open Movement Detail
    document.getElementById('wodMovementsList').addEventListener('click', e => {
      const emptyTuneBtn = e.target.closest('[data-open-adv-from-empty]');
      if (emptyTuneBtn) {
        this.openAdvancedModal('equipment');
        return;
      }

      const swapBtn = e.target.closest('[data-swap-item-index]');
      if (swapBtn && AppState.currentWod) {
        const idx = parseInt(swapBtn.dataset.swapItemIndex, 10);
        const currentItem = AppState.currentWod.items[idx];
        if (currentItem && currentItem.alternative) {
          AppState.currentWod.items[idx].movement = currentItem.alternative.movement;
          if (currentItem.alternative.repVal !== undefined) {
            AppState.currentWod.items[idx].customScheme = currentItem.alternative.repVal;
          }
          delete AppState.currentWod.items[idx].benchmarkCustomLabel;
          WorkoutGenerator.refreshWodCollisionFreeMetadata(AppState.currentWod);
          this.updateWodRow(idx);
        }
        return;
      }

      const scaleBtn = e.target.closest('[data-scale-item-index]');
      if (scaleBtn && AppState.currentWod) {
        const idx = parseInt(scaleBtn.dataset.scaleItemIndex, 10);
        const currentItem = AppState.currentWod.items[idx];
        if (currentItem && currentItem.scaleDown) {
          AppState.currentWod.items[idx].movement = currentItem.scaleDown.movement;
          if (currentItem.scaleDown.repVal !== undefined) {
            AppState.currentWod.items[idx].customScheme = currentItem.scaleDown.repVal;
          }
          delete AppState.currentWod.items[idx].benchmarkCustomLabel;
          WorkoutGenerator.refreshWodCollisionFreeMetadata(AppState.currentWod);
          this.updateWodRow(idx);
        }
        return;
      }

      const progBtn = e.target.closest('[data-open-progression-mov]');
      if (progBtn) {
        e.stopPropagation();
        const rowIdx = progBtn.dataset.wodRow !== undefined ? parseInt(progBtn.dataset.wodRow, 10) : null;
        this.openMovementDemoModal(progBtn.dataset.openProgressionMov, {
          wodRowIndex: rowIdx,
          focusProgression: true
        });
        return;
      }

      const card = e.target.closest('[data-demo-mov]');
      if (card) {
        const rowIdx = card.dataset.wodRow !== undefined ? parseInt(card.dataset.wodRow, 10) : null;
        this.openMovementDemoModal(card.dataset.demoMov, { wodRowIndex: rowIdx });
      }
    });

    // Share WOD Link
    const shareBtn = document.getElementById('shareWodBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const wod = AppState.currentWod;
        if (!wod) return;
        await this.shareWod(wod);
      });
    }

    // Dismiss Shared Workout Notice Banner
    const dismissNoticeBtn = document.getElementById('dismissSharedNoticeBtn');
    if (dismissNoticeBtn) {
      dismissNoticeBtn.addEventListener('click', () => {
        const notice = document.getElementById('sharedWodNotice');
        if (notice) notice.classList.add('hidden');
      });
    }

    // Copy WOD Text
    document.getElementById('copyWodBtn').addEventListener('click', async () => {
      const wod = AppState.currentWod;
      if (!wod) return;
      let shareUrl = '';
      try {
        shareUrl = await WorkoutSharing.createShareUrl(wod);
      } catch (e) { }

      const clockLabel = WorkoutGenerator.getClockBadgeLabel(wod);
      const textParts = [
        `${wod.title} (${wod.badgeFormat}${clockLabel ? ' • ' + clockLabel : ''})`,
        WorkoutGenerator.formatBannerPrescriptionHeader(wod.prescriptionHeader, wod.format),
        ...wod.items.map(i => {
          const subSuffix = ((i.isOptionalGear || i.isMissingGear) && i.alternative) ? ` [Or Sub: ${i.alternative.text}]` : '';
          return `- ${i.prescriptionText}${subSuffix}`;
        }),
        `\nStimulus: ${wod.stimulus}`
      ];
      if (shareUrl) {
        textParts.push(`\nWorkout Link: ${shareUrl}`);
      }
      const text = textParts.join('\n');

      try {
        await WorkoutSharing.copyToClipboard(text);
      } catch (e) { }

      const label = document.getElementById('copyWodLabel');
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = 'Copy'; }, 1800);
    });

    // Movement Demo Modal Actions (Ladder Step Apply / Preview, Navigate to All Progressions, Close)
    document.getElementById('closeDemoModalBtn').addEventListener('click', () => this.closeMovementDemoModal());
    document.getElementById('movementDemoModal').addEventListener('click', e => {
      if (e.target.id === 'movementDemoModal') this.closeMovementDemoModal();
    });

    const demoStepsEl = document.getElementById('demoModalProgressionSteps');
    if (demoStepsEl) {
      demoStepsEl.addEventListener('click', e => {
        const applyBtn = e.target.closest('[data-apply-ladder-mov]');
        if (applyBtn) {
          e.stopPropagation();
          this.applyLadderMovementToWod(applyBtn.dataset.applyLadderMov);
          return;
        }
        const stepRow = e.target.closest('[data-preview-ladder-mov]');
        if (stepRow) {
          const nextId = stepRow.dataset.previewLadderMov;
          if (nextId !== this._demoContext?.movementId) {
            this.openMovementDemoModal(nextId, {
              wodRowIndex: this._demoContext?.wodRowIndex ?? null,
              focusProgression: false
            });
          }
        }
      });
    }

    const demoToAllBtn = document.getElementById('demoToAllProgressionsBtn');
    if (demoToAllBtn) {
      demoToAllBtn.addEventListener('click', () => {
        const scaleModal = document.getElementById('scaleModal');
        const scaleAlreadyOpen = scaleModal && !scaleModal.classList.contains('hidden') && !scaleModal._isClosing;
        if (scaleAlreadyOpen) {
          this.closeMovementDemoModal();
          return;
        }
        this._returnToDemoState = this._demoContext ? { ...this._demoContext } : null;
        const targetPattern = demoToAllBtn.dataset.targetPattern || 'ALL';
        this.closeMovementDemoModal();
        this.openScaleModal(targetPattern, { showBackButton: Boolean(this._returnToDemoState) });
      });
    }

    // Classical Benchmarks Modal
    this._activeBFilter = 'all';
    document.getElementById('openBenchmarksModalBtn').addEventListener('click', () => {
      this.openBenchmarksModal(this._activeBFilter || 'all');
    });
    document.getElementById('closeBenchmarksModalBtn').addEventListener('click', () => {
      this.closeBenchmarksModal();
    });
    document.getElementById('benchmarksModal').addEventListener('click', e => {
      if (e.target.id === 'benchmarksModal') this.closeBenchmarksModal();
    });

    document.querySelectorAll('.bfilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeBFilter = btn.dataset.bfilter;
        this.updateBenchmarkFilterButtons(this._activeBFilter);
        const searchInput = document.getElementById('benchmarksSearchInput');
        this.renderBenchmarksModal(this._activeBFilter, searchInput ? searchInput.value : '');
        const container = document.getElementById('benchmarksListContainer');
        if (container) container.scrollTop = 0;
      });
    });

    const benchSearch = document.getElementById('benchmarksSearchInput');
    if (benchSearch) {
      benchSearch.addEventListener('input', e => {
        this.renderBenchmarksModal(this._activeBFilter || 'all', e.target.value);
        const container = document.getElementById('benchmarksListContainer');
        if (container) container.scrollTop = 0;
      });
    }

    document.getElementById('benchmarksListContainer').addEventListener('click', e => {
      const card = e.target.closest('[data-load-benchmark]');
      if (!card) return;
      const bm = CLASSICAL_BENCHMARKS.find(b => b.id === card.dataset.loadBenchmark);
      if (bm) {
        this.clearSharedUrl();
        this.displayWod(WorkoutGenerator.formatBenchmarkWod(bm));
        this.closeBenchmarksModal();
      }
    });

    // Scale Progressions & Ladders Modal
    this._activeScalePattern = 'ALL';
    const scaleBtn = document.getElementById('openScaleModalBtn');
    if (scaleBtn) {
      scaleBtn.addEventListener('click', () => {
        this._returnToDemoState = null;
        this.openScaleModal(this._activeScalePattern || 'ALL', { showBackButton: false });
      });
    }

    const scaleBackBtn = document.getElementById('scaleModalBackBtn');
    if (scaleBackBtn) {
      scaleBackBtn.addEventListener('click', () => {
        const ret = this._returnToDemoState;
        this.closeScaleModal(true);
        if (ret && ret.movementId) {
          this._returnToDemoState = null;
          this.openMovementDemoModal(ret.movementId, {
            wodRowIndex: ret.wodRowIndex ?? null,
            focusProgression: true
          });
        }
      });
    }

    const closeScaleBtn = document.getElementById('closeScaleModalBtn');
    if (closeScaleBtn) {
      closeScaleBtn.addEventListener('click', () => this.closeScaleModal());
    }
    const scaleModalEl = document.getElementById('scaleModal');
    if (scaleModalEl) {
      scaleModalEl.addEventListener('click', e => {
        if (e.target.id === 'scaleModal') this.closeScaleModal();
      });
    }

    const scaleTabs = document.getElementById('scalePatternTabs');
    if (scaleTabs) {
      scaleTabs.addEventListener('click', e => {
        const btn = e.target.closest('.spattern-btn');
        if (!btn) return;
        this._activeScalePattern = btn.dataset.spattern;
        this.updateScalePatternButtons(this._activeScalePattern);
        this.renderScaleModal(this._activeScalePattern);
      });
    }

    const scaleContainer = document.getElementById('scaleLaddersContainer');
    if (scaleContainer) {
      scaleContainer.addEventListener('click', e => {
        const item = e.target.closest('[data-demo-mov]');
        if (!item) return;
        const movId = item.dataset.demoMov;
        const mov = MOVEMENTS_DB.find(m => m.id === movId);
        if (mov) {
          this.openMovementDemoModal(mov.id);
        }
      });
    }

    // Global Escape Key listener to gracefully close top-most modal
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const demoModal = document.getElementById('movementDemoModal');
      if (demoModal && !demoModal.classList.contains('hidden') && !demoModal._isClosing) {
        this.closeMovementDemoModal();
        return;
      }
      const scaleModal = document.getElementById('scaleModal');
      if (scaleModal && !scaleModal.classList.contains('hidden') && !scaleModal._isClosing) {
        this.closeScaleModal();
        return;
      }
      const benchModal = document.getElementById('benchmarksModal');
      if (benchModal && !benchModal.classList.contains('hidden') && !benchModal._isClosing) {
        this.closeBenchmarksModal();
        return;
      }
      const advModalEl = document.getElementById('advancedModal');
      if (advModalEl && !advModalEl.classList.contains('hidden') && !advModalEl._isClosing) {
        this.closeAdvancedModal();
      }
    });

    // Reset Preferences Button
    document.getElementById('resetPrefsBtn').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      this.clearConfigUrl();
      AppState.theme = 'system';
      AppState.equipmentStates = { ...globalThis.DEFAULT_EQUIPMENT_STATES };
      AppState.includeHardMovements = false;
      AppState.initDefaultExclusions();
      AppState.mode = 'smart';
      AppState.format = 'ANY';
      AppState.duration = 'medium';
      AppState.saveToStorage();
      this.applyTheme();
      this.renderEquipmentGrid();
      this.renderMovementMatrix();
      this.renderParameterControls();
      this.closeAdvancedModal();
      this.generateAndDisplayWod();
      this.showToast('Preferences reset to defaults.');
    });
  }
};

globalThis.UI = UI;
