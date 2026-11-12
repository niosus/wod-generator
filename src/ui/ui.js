const UI = {
      isOutdated: false,

      async init() {
        AppState.loadFromStorage();
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
        }
      },

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
          const url = new URL(window.location.href);
          url.searchParams.delete('wod');
          url.searchParams.delete('share');
          if (url.hash.startsWith('#wod=') || url.hash.startsWith('#share=') || url.hash.startsWith('#z.') || url.hash.startsWith('#u.')) {
            url.hash = '';
          }
          window.history.replaceState(null, '', url.toString());
        }
      },

      showToast(message, type = 'success') {
        let toastEl = document.getElementById('wodForgeToast');
        if (!toastEl) {
          toastEl = document.createElement('div');
          toastEl.id = 'wodForgeToast';
          toastEl.className = 'fixed bottom-6 right-6 z-50 transition-all duration-300 opacity-0 translate-y-3 pointer-events-none max-w-sm';
          document.body.appendChild(toastEl);
        }
        const isVolt = type === 'success';
        toastEl.innerHTML = `
          <div class="px-4 py-3 rounded-xl bg-slate-900/95 border ${isVolt ? 'border-volt/40 text-slate-100' : 'border-rose-500/40 text-rose-200'} shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full ${isVolt ? 'bg-volt shadow-[0_0_8px_rgba(216,255,62,0.9)]' : 'bg-rose-500'} shrink-0"></div>
            <p class="text-xs font-semibold leading-relaxed">${message}</p>
          </div>
        `;
        toastEl.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
          toastEl.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
        }, 3200);
      },

      async shareWod(wod) {
        if (!wod) return;
        const shareBtn = document.getElementById('shareWodBtn');
        const shareLabel = document.getElementById('shareWodLabel');
        try {
          const shareUrl = await WorkoutSharing.createShareUrl(wod);

          // Update URL in browser address bar without reload
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', shareUrl);
          }

          // Use native share sheet on mobile when available
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (navigator.share && isMobile) {
            try {
              await navigator.share({
                title: `WODFORGE: ${wod.title}`,
                text: `${wod.title} (${wod.badgeFormat}) - ${wod.prescriptionHeader}`,
                url: shareUrl
              });
              this.showToast('Workout shared successfully!');
              return;
            } catch (err) {
              if (err.name === 'AbortError') return; // User closed share sheet
            }
          }

          // Copy link to clipboard
          await WorkoutSharing.copyToClipboard(shareUrl);

          // Button feedback
          if (shareLabel) shareLabel.textContent = 'Copied!';
          const icon = shareBtn ? shareBtn.querySelector('i') : null;
          if (icon) icon.setAttribute('data-lucide', 'check');
          lucide.createIcons();

          this.showToast('Workout link copied to clipboard! Anyone opening this link will see this exact workout.');

          setTimeout(() => {
            if (shareLabel) shareLabel.textContent = 'Share';
            if (icon) icon.setAttribute('data-lucide', 'share-2');
            lucide.createIcons();
          }, 2200);
        } catch (err) {
          console.error('Share workout error:', err);
          this.showToast('Could not copy link to clipboard', 'error');
        }
      },

      markWodOutdated(isOutdated = true) {
        this.isOutdated = isOutdated;
        const card = document.getElementById('wodCardContainer');
        const badge = document.getElementById('wodOutdatedBadge');
        const floatBtn = document.getElementById('floatingGenerateBtn');
        const mainGenBtn = document.getElementById('generateWodBtn');
        const rerollBtn = document.getElementById('rerollWodBtn');
        const floatLabel = document.getElementById('floatingGenerateLabel');
        const mainLabel = document.getElementById('generateWodBtnLabel');
        const floatSideDot = document.getElementById('floatingSideDot');
        const mainSideDot = document.getElementById('generateWodSideDot');
        const rerollSideDot = document.getElementById('rerollSideDot');

        const sideDots = [floatSideDot, mainSideDot, rerollSideDot].filter(Boolean);
        const actionButtons = [floatBtn, mainGenBtn, rerollBtn].filter(Boolean);

        if (isOutdated) {
          if (card) card.classList.add('wod-outdated');
          if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
          }

          // Calm state change: text to "Update Workout" + solid green dot to the side of regenerate buttons
          if (floatLabel) floatLabel.textContent = 'Update Workout';
          if (mainLabel) mainLabel.textContent = 'Update Workout';
          sideDots.forEach(dot => dot.classList.remove('hidden'));

          // Zero continuous shimmering/pulsing/rings
          actionButtons.forEach(btn => {
            btn.classList.remove('ring-4', 'ring-volt/50', 'animate-pulse');
          });

          // One-shot tactile micro-bump (slower, smooth & deliberate pop)
          actionButtons.forEach(btn => {
            btn.classList.remove('btn-bump');
            void btn.offsetWidth; // Force CSS reflow to re-trigger one-shot keyframe
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

          // Reset to default "Generate Workout" and hide green side dots
          if (floatLabel) floatLabel.textContent = 'Generate Workout';
          if (mainLabel) mainLabel.textContent = 'Generate Workout';
          sideDots.forEach(dot => dot.classList.add('hidden'));

          actionButtons.forEach(btn => {
            btn.classList.remove('ring-4', 'ring-volt/50', 'animate-pulse', 'btn-bump');
          });
        }
        lucide.createIcons();
      },

      scrollToTopAndGenerate() {
        if (window.scrollY > 40) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          let fired = false;
          const trigger = () => {
            if (fired) return;
            fired = true;
            window.removeEventListener('scroll', checkArrival);
            this.generateAndDisplayWod();
          };

          const checkArrival = () => {
            if (window.scrollY <= 15) {
              trigger();
            }
          };

          window.addEventListener('scroll', checkArrival, { passive: true });
          // Fallback: smooth scroll finishes in ~350-480ms
          setTimeout(trigger, 480);
        } else {
          this.generateAndDisplayWod();
        }
      },

      renderEquipmentGrid() {
        const container = document.getElementById('equipmentGrid');
        container.innerHTML = EQUIPMENT_CATALOG.map(eq => {
          const state = AppState.equipmentStates[eq.id] || 'off';
          let cardClass = 'bg-slate-900/60 border-slate-800/90 text-slate-400';
          if (state === 'available') {
            cardClass = 'bg-volt/10 border-volt/70 text-white shadow-sm shadow-volt/10';
          } else if (state === 'optional') {
            cardClass = 'bg-amber-500/10 border-amber-400/70 border-dashed text-amber-100';
          }

          return `
            <div class="rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${cardClass}">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <i data-lucide="${eq.icon}" class="w-4 h-4 shrink-0 ${state === 'available' ? 'text-volt' : (state === 'optional' ? 'text-amber-300' : 'text-slate-500')
            }"></i>
                  <span class="text-xs font-bold truncate">${eq.name}</span>
                </div>
              </div>

              <!-- 3-State Segmented Control -->
              <div class="grid grid-cols-3 gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800/80">
                <button
                  data-eq-id="${eq.id}"
                  data-eq-state="available"
                  class="eq-state-btn py-1 rounded text-[10px] font-mono font-extrabold uppercase transition ${state === 'available'
              ? 'bg-volt text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
            }"
                >HAVE</button>
                <button
                  data-eq-id="${eq.id}"
                  data-eq-state="optional"
                  class="eq-state-btn py-1 rounded text-[10px] font-mono font-extrabold uppercase transition ${state === 'optional'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-amber-300'
            }"
                >OPT</button>
                <button
                  data-eq-id="${eq.id}"
                  data-eq-state="off"
                  class="eq-state-btn py-1 rounded text-[10px] font-mono font-extrabold uppercase transition ${state === 'off'
              ? 'bg-slate-700 text-white'
              : 'text-slate-500 hover:text-slate-300'
            }"
                >OFF</button>
              </div>
            </div>
          `;
        }).join('');
        lucide.createIcons();
      },

      renderMovementMatrix() {
        const availableByEq = AppState.getAvailableMovementsByEquipment();
        const activePool = AppState.getActiveMovementPool();

        // Update Top Header Summary & Floating Badge
        const activeSummaryEl = document.getElementById('activePoolSummary');
        if (activeSummaryEl) {
          activeSummaryEl.innerHTML = `
            <span class="font-bold text-white">${activePool.length}/${availableByEq.length}</span>
            <span class="hidden sm:inline text-slate-400">Movements</span>
            <span class="text-slate-300">Active</span>
          `;
        }
        const floatingBadge = document.getElementById('floatingActiveCountBadge');
        if (floatingBadge) {
          floatingBadge.textContent = `${activePool.length} Active`;
        }

        // Update Hard Movements Switch & Counter
        const availableHard = availableByEq.filter(m => m.difficulty === 'hard');
        const activeHard = activePool.filter(m => m.difficulty === 'hard');
        const hardSwitch = document.getElementById('toggleHardSwitch');
        const hardKnob = document.getElementById('toggleHardKnob');
        const hardBadge = document.getElementById('hardCountBadge');

        if (hardBadge) hardBadge.textContent = `${activeHard.length} / ${availableHard.length} Active`;
        if (hardSwitch && hardKnob) {
          if (AppState.includeHardMovements && activeHard.length > 0) {
            hardSwitch.className = 'relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-rose-500';
            hardKnob.className = 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out translate-x-6';
          } else {
            hardSwitch.className = 'relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-slate-700';
            hardKnob.className = 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-300 shadow transition duration-200 ease-in-out translate-x-0';
          }
        }

        // Highlight active Skill Preset Pill
        const allNormalActive = availableByEq.filter(m => m.difficulty === 'normal').every(m => !AppState.excludedMovements.has(m.id));
        const noHardActive = activeHard.length === 0;
        const allHardActive = availableHard.length > 0 && activeHard.length === availableHard.length;

        let activeSkillPreset = 'custom';
        if (allNormalActive && noHardActive) activeSkillPreset = 'normal_only';
        else if (allNormalActive && allHardActive) activeSkillPreset = 'all_enabled';

        document.querySelectorAll('.skill-preset-btn').forEach(btn => {
          const isMatch = btn.dataset.skillpreset === activeSkillPreset;
          btn.className = `skill-preset-btn py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition ${isMatch
            ? 'bg-volt/20 border-volt text-volt'
            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`;
        });

        // Category Tabs with live counts
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
                class="mcat-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${active
                ? 'bg-cyan-400 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }"
              >
                ${cat.label}
              </button>
            `;
          }).join('');
        }

        // Highlight active Difficulty Filter Pill
        document.querySelectorAll('.diff-filter-btn').forEach(btn => {
          if (btn.dataset.difffilter === AppState.activeDiffFilter) {
            btn.classList.add('ring-2', 'ring-volt');
          } else {
            btn.classList.remove('ring-2', 'ring-volt');
          }
        });

        // Animated Movement Cards Grid
        const gridEl = document.getElementById('movementAnimatedGrid');
        if (gridEl) {
          const filteredMovements = availableByEq.filter(m => {
            const catMatch = AppState.activeMatrixCategory === 'ALL' || m.pattern === AppState.activeMatrixCategory;
            const diffMatch = AppState.activeDiffFilter === 'ALL' || m.difficulty === AppState.activeDiffFilter;
            return catMatch && diffMatch;
          });

          if (filteredMovements.length === 0) {
            gridEl.innerHTML = `
              <div class="col-span-full text-center py-10 text-sm text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6">
                No movements match this filter with your currently enabled equipment. Enable more gear in Step 1 or switch categories!
              </div>
            `;
          } else {
            gridEl.innerHTML = filteredMovements.map(mov => {
              const isIncluded = !AppState.excludedMovements.has(mov.id);
              const patInfo = PATTERNS[mov.pattern];
              const eqInfo = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment);
              const isOptionalEq = AppState.isEquipmentOptional(mov.equipment);
              const isHard = mov.difficulty === 'hard';

              return `
                <div
                  data-mov-card="${mov.id}"
                  class="relative group rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition cursor-pointer select-none ${isIncluded
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-volt/60 shadow-md'
                  : 'bg-slate-950/60 border-slate-850 opacity-45 hover:opacity-75 grayscale hover:grayscale-0'
                }"
                >
                  <!-- Card Top: Difficulty Badge, Optional Gear Tag, and Checkbox -->
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                      mov.difficulty === 'easy'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : (isHard ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')
                    }">${mov.difficulty.toUpperCase()}</span>

                    <div class="flex items-center gap-1">
                      ${isOptionalEq ? `<span class="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">OPT</span>` : ''}
                      <input
                        type="checkbox"
                        data-mov-toggle="${mov.id}"
                        ${isIncluded ? 'checked' : ''}
                        class="w-4 h-4 rounded accent-lime-400 cursor-pointer pointer-events-none"
                      />
                    </div>
                  </div>

                  <!-- Animated 2D Stickman Canvas Viewport -->
                  <div class="w-full aspect-square rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden relative">
                    <canvas
                      data-matrix-pose="${mov.poseType}"
                      width="130"
                      height="130"
                      class="w-full h-full block"
                    ></canvas>
                  </div>

                  <!-- Movement Info -->
                  <div class="min-w-0">
                    <div class="text-xs font-black text-white truncate group-hover:text-volt transition" title="${mov.name}">
                      ${mov.name}
                    </div>
                    <div class="flex items-center justify-between gap-1 mt-1 text-[10px] text-slate-400">
                      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border ${patInfo.color}">
                        ${patInfo.label}
                      </span>
                      <button
                        data-demo-mov="${mov.id}"
                        class="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 transition"
                        title="View form cues & execution"
                      >
                        <span>Cues</span>
                        <i data-lucide="chevron-right" class="w-3 h-3"></i>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('');

            // Register all canvases with the animator loop
            gridEl.querySelectorAll('canvas[data-matrix-pose]').forEach(canvas => {
              BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.matrixPose);
            });
          }
        }
        lucide.createIcons();
      },

      renderParameterControls() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
          const active = btn.dataset.mode === AppState.mode;
          btn.className = `mode-btn py-2 px-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center text-center gap-0.5 ${active
            ? 'bg-volt/15 border-volt text-volt shadow-sm'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`;
        });

        document.querySelectorAll('.format-btn').forEach(btn => {
          const active = btn.dataset.format === AppState.format;
          btn.className = `format-btn py-2 px-2 rounded-xl border text-xs font-mono font-semibold transition ${btn.dataset.format === 'INTERVALS' ? 'col-span-2 sm:col-span-1 ' : ''
            }${active
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`;
        });

        document.querySelectorAll('.duration-btn').forEach(btn => {
          const active = btn.dataset.duration === AppState.duration;
          btn.className = `duration-btn py-2 px-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center ${active
            ? 'bg-volt/15 border-volt text-volt shadow-sm'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`;
        });

        document.querySelectorAll('.intensity-btn').forEach(btn => {
          const active = btn.dataset.intensity === AppState.intensity;
          btn.className = `intensity-btn py-2 px-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center ${active
            ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`;
        });
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

        // Trigger short & sweet generation animation
        const cardContainer = document.getElementById('wodCardContainer');
        const accentBar = document.getElementById('wodAccentBar');
        if (cardContainer) {
          cardContainer.classList.remove('wod-card-refresh');
          void cardContainer.offsetWidth; // force reflow
          cardContainer.classList.add('wod-card-refresh');
        }
        if (accentBar) {
          accentBar.classList.remove('accent-glow-sweep');
          void accentBar.offsetWidth; // force reflow
          accentBar.classList.add('accent-glow-sweep');
        }

        document.getElementById('wodBadgeType').textContent = wod.badgeType;
        document.getElementById('wodBadgeFormat').textContent = wod.badgeFormat;
        document.getElementById('wodBadgeDifficulty').textContent = wod.difficultyLabel;
        document.getElementById('wodTitle').textContent = wod.title;
        document.getElementById('wodPrescriptionHeader').textContent = wod.prescriptionHeader;
        document.getElementById('wodTimeCapBadge').textContent = `${wod.minutes}:00 Clock`;
        document.getElementById('wodStimulusText').textContent = wod.stimulus;
        document.getElementById('wodLogicText').textContent = wod.logic;

        const listEl = document.getElementById('wodMovementsList');
        if (wod.items.length === 0) {
          listEl.innerHTML = `
            <div class="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-center text-sm text-slate-400">
              No active movements selected. Set at least one equipment item to HAVE or OPT below!
            </div>
          `;
        } else {
          listEl.innerHTML = wod.items.map((item, index) => {
            const mov = item.movement;
            const pat = PATTERNS[mov.pattern];
            const isHard = mov.difficulty === 'hard';
            const eqInfo = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment);

            return `
              <div
                class="wod-item-animated bg-slate-900/90 border ${item.isOptionalGear ? 'border-amber-400/50' : 'border-slate-800'
              } rounded-xl p-3 sm:p-3.5 transition space-y-2.5"
                style="animation-delay: ${index * 110}ms;"
              >
                <div class="flex items-center justify-between gap-3">
                  <div
                    data-demo-mov="${mov.id}"
                    class="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group"
                  >
                    <!-- Live 2D IK Canvas Mini Viewport -->
                    <div class="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      <canvas
                        data-ik-pose="${mov.poseType}"
                        width="72"
                        height="72"
                        class="w-16 h-16 block"
                      ></canvas>
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5 mb-1">
                        <span class="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-volt text-slate-950 whitespace-nowrap">
                          ${item.repsDisplay}
                        </span>
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${pat.color} whitespace-nowrap">
                          ${pat.label}
                        </span>
                        <span class="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${isHard
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
              } whitespace-nowrap">
                          ${isHard ? 'HARD SKILL' : 'NORMAL'}
                        </span>
                        ${item.isOptionalGear
                ? `<span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 whitespace-nowrap">
                                 Optional: ${eqInfo ? eqInfo.name : ''}
                               </span>`
                : ''
              }
                      </div>
                      <div class="text-sm sm:text-base font-extrabold text-white group-hover:text-volt transition truncate">
                        ${item.prescriptionText}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate mt-0.5">
                        Tap to inspect 2D biomechanics & execution cues
                      </div>
                    </div>
                  </div>

                  <button
                    data-demo-mov="${mov.id}"
                    class="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 flex items-center gap-1 transition"
                  >
                    <span class="hidden sm:inline">Form</span>
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                  </button>
                </div>

                <!-- Inline Scale-Down Progression Bar (For Hard / Plyo / Skill Exercises) -->
                ${item.scaleDown
                ? `
                      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-500/20 bg-cyan-500/5 -mx-3 px-3 py-1.5">
                        <div class="flex items-center gap-2 text-xs text-cyan-200/90">
                          <i data-lucide="trending-down" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
                          <span><strong>Scale Down:</strong> ${item.scaleDown.text}</span>
                        </div>
                        <button
                          data-scale-item-index="${index}"
                          class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 border border-cyan-400/40 font-mono font-extrabold text-[10px] uppercase tracking-wider transition"
                        >
                          Scale
                        </button>
                      </div>
                    `
                : ''
              }

                <!-- Automatic Inline Alternative Bar when Equipment is OPTIONAL -->
                ${item.isOptionalGear && item.alternative
                ? `
                      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 bg-amber-500/5 -mx-3 -mb-3 px-3 py-2 rounded-b-xl">
                        <div class="flex items-center gap-2 text-xs text-amber-200/90">
                          <i data-lucide="repeat" class="w-3.5 h-3.5 text-amber-400 shrink-0"></i>
                          <span><strong>No ${eqInfo ? eqInfo.name : 'Gear'}? Sub:</strong> ${item.alternative.text}</span>
                        </div>
                        <button
                          data-swap-item-index="${index}"
                          class="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-[11px] uppercase tracking-wider transition shadow-sm"
                        >
                          Use Alternative
                        </button>
                      </div>
                    `
                : ''
              }
              </div>
            `;
          }).join('');
        }

        // Register all newly rendered mini IK canvases
        listEl.querySelectorAll('canvas[data-ik-pose]').forEach(canvas => {
          BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.ikPose);
        });

        const uniquePatterns = Array.from(new Set(wod.items.map(i => i.movement.pattern)));
        document.getElementById('wodPatternTags').innerHTML = uniquePatterns.map(pid => {
          const pat = PATTERNS[pid];
          return `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${pat.color}">${pat.label}</span>`;
        }).join('');

        lucide.createIcons();
      },

      openMovementDemoModal(movementId) {
        const mov = MOVEMENTS_DB.find(m => m.id === movementId);
        if (!mov) return;

        const pat = PATTERNS[mov.pattern];
        const eq = EQUIPMENT_CATALOG.find(e => e.id === mov.equipment);
        const isHard = mov.difficulty === 'hard';
        const usedInCurrentWod = AppState.currentWod
          ? new Set(AppState.currentWod.items.map(i => i.movement.id))
          : new Set();
        const altMov = AppState.resolveUniqueAlternative(mov, usedInCurrentWod);

        const patBadge = document.getElementById('demoModalPatternBadge');
        patBadge.textContent = pat.label;
        patBadge.className = `text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${pat.color}`;

        const diffBadge = document.getElementById('demoModalDifficultyBadge');
        diffBadge.textContent = isHard ? 'HARD / HIGH-SKILL' : 'NORMAL TIER';
        diffBadge.className = `text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${isHard ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`;

        const isFrontView = BiomechanicalStickAnimator.computePose(mov.poseType, 0).view === 'front';
        document.getElementById('demoModalCameraLabel').textContent = isFrontView
          ? 'Front-View Symmetrical Rig'
          : 'Side-View Biomechanical IK Rig';

        document.getElementById('demoModalEquipBadge').textContent = eq ? eq.name : 'Bodyweight';
        document.getElementById('demoModalTitle').textContent = mov.name;
        document.getElementById('demoModalCues').textContent = mov.cues;
        document.getElementById('demoModalScaling').textContent = `${mov.scaling} (Pattern-Matched Sub: ${altMov ? altMov.name : 'Air Squats'})`;

        const modalCanvas = document.getElementById('demoModalCanvas');
        BiomechanicalStickAnimator.registerCanvas(modalCanvas, mov.poseType);

        const modal = document.getElementById('movementDemoModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
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
            <div class="col-span-2 text-center py-8 text-sm text-slate-400">
              No classical benchmarks match your current filter. Enable more gear or switch filter options!
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

          const catBadgeClass = isGirl
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            : (isHero ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40');

          return `
            <div
              data-load-benchmark="${bm.id}"
              class="cursor-pointer bg-slate-900 hover:bg-slate-800/90 border ${eligible ? 'border-volt/40' : 'border-slate-800'
            } rounded-xl p-4 flex flex-col justify-between gap-3 transition"
            >
              <div>
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-black text-base text-white truncate">${bm.title}</span>
                    <span class="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border ${catBadgeClass}">
                      ${isGirl ? 'GIRL' : (isHero ? 'HERO' : 'SPECIAL')}
                    </span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    ${hasHard ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">HARD</span>` : ''}
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${eligible
              ? 'bg-volt/15 text-volt border-volt/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
            }">
                      ${eligible ? 'Ready' : 'Filtered'}
                    </span>
                  </div>
                </div>
                <div class="text-[11px] font-mono text-cyan-300 mb-2">${bm.prescriptionHeader}</div>
                <ul class="text-xs text-slate-300 space-y-1">
                  ${bm.items.map(it => `<li>• ${it.label}</li>`).join('')}
                </ul>
              </div>
              <div class="text-[11px] font-mono text-volt flex items-center justify-end gap-1 pt-2 border-t border-slate-800/80">
                <span>Load onto WOD Board</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </div>
            </div>
          `;
        }).join('');
        lucide.createIcons();
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
            <div class="text-center py-10 text-sm text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6">
              No scale progression ladders match this filter.
            </div>
          `;
          return;
        }

        container.innerHTML = ladders.map(ladder => {
          const patInfo = PATTERNS[ladder.pattern] || { label: ladder.pattern, color: 'text-slate-300 border-slate-700' };

          return `
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
              <!-- Ladder Header -->
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="text-base font-black text-white">${ladder.name}</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${patInfo.color}">${patInfo.label}</span>
                </div>
                <div class="text-[11px] text-slate-400 max-w-md">${ladder.description}</div>
              </div>

              <!-- Ladder Steps Flow with Animated Canvases -->
              <div class="flex flex-wrap items-center gap-2.5 pt-1">
                ${ladder.steps.map((step, idx) => {
                  const mov = MOVEMENTS_DB.find(m => m.id === step.movementId);
                  const isHard = step.tier === 'hard';
                  const isEasy = step.tier === 'easy';

                  const tierBadge = isEasy
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : (isHard ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30');

                  const isLast = idx === ladder.steps.length - 1;
                  const pose = mov ? mov.poseType : 'squat_side';

                  return `
                    <div class="flex items-center gap-2">
                      <div
                        data-demo-mov="${step.movementId}"
                        class="cursor-pointer group rounded-xl p-2.5 border bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-200 transition flex flex-col items-center text-center w-28 sm:w-32 gap-1.5 shadow-sm hover:shadow-md"
                        title="Click to inspect biomechanical cues & form"
                      >
                        <!-- Top meta: Tier & Level -->
                        <div class="w-full flex items-center justify-between gap-1">
                          <span class="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border ${tierBadge}">
                            ${step.tier.toUpperCase()}
                          </span>
                          <span class="text-[9px] font-mono text-slate-400">Lvl ${step.level}</span>
                        </div>

                        <!-- Animated Stickman Viewport -->
                        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative group-hover:border-slate-700 transition">
                          <canvas
                            data-scale-pose="${pose}"
                            width="96"
                            height="96"
                            class="w-full h-full block"
                          ></canvas>
                        </div>

                        <!-- Movement Label & Gear -->
                        <div class="w-full min-w-0">
                          <div class="text-[11px] sm:text-xs font-bold text-white group-hover:text-volt transition truncate" title="${step.label}">
                            ${step.label}
                          </div>
                          <div class="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                            ${mov ? (EQUIPMENT_CATALOG.find(e => e.id === mov.equipment)?.name || 'Bodyweight') : 'Bodyweight'}
                          </div>
                        </div>

                        <!-- Cues link -->
                        <div class="text-[9px] font-mono text-cyan-300 group-hover:text-cyan-200 flex items-center gap-0.5 pt-1 border-t border-slate-800/80 w-full justify-center">
                          <i data-lucide="play" class="w-2.5 h-2.5"></i>
                          <span>Cues</span>
                        </div>
                      </div>

                      ${!isLast ? `
                        <div class="hidden sm:flex text-slate-600 font-bold items-center">
                          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');

        // Register all scale canvases with BiomechanicalStickAnimator
        container.querySelectorAll('canvas[data-scale-pose]').forEach(canvas => {
          BiomechanicalStickAnimator.registerCanvas(canvas, canvas.dataset.scalePose);
        });

        lucide.createIcons();
      },

      bindEvents() {
        // 3-State Equipment Segmented Buttons
        document.getElementById('equipmentGrid').addEventListener('click', e => {
          const btn = e.target.closest('.eq-state-btn');
          if (!btn) return;
          const eqId = btn.dataset.eqId;
          const newState = btn.dataset.eqState;

          AppState.equipmentStates[eqId] = newState;
          // Ensure at least one equipment stays usable
          const anyUsable = Object.values(AppState.equipmentStates).some(s => s === 'available' || s === 'optional');
          if (!anyUsable) {
            AppState.equipmentStates.bodyweight = 'available';
          }

          AppState.saveToStorage();
          this.renderEquipmentGrid();
          this.renderMovementMatrix();
          this.markWodOutdated(true);
        });

        // Equipment Presets (Updated for 13-item split catalog)
        document.querySelectorAll('.preset-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            EQUIPMENT_CATALOG.forEach(e => { AppState.equipmentStates[e.id] = 'off'; });

            if (preset === 'bodyweight') {
              AppState.equipmentStates.bodyweight = 'available';
            } else if (preset === 'minimal') {
              AppState.equipmentStates.bodyweight = 'available';
              AppState.equipmentStates.running_area = 'optional';
              AppState.equipmentStates.pullup_bar = 'available';
              AppState.equipmentStates.rings_dips = 'optional';
              AppState.equipmentStates.kettlebell = 'optional';
              AppState.equipmentStates.bike_erg = 'optional';
              AppState.equipmentStates.jump_rope = 'optional';
            } else if (preset === 'full') {
              EQUIPMENT_CATALOG.forEach(e => { AppState.equipmentStates[e.id] = 'available'; });
            }

            AppState.saveToStorage();
            this.renderEquipmentGrid();
            this.renderMovementMatrix();
            this.markWodOutdated(true);
          });
        });

        // Global Hard Movements Switch
        document.getElementById('toggleHardSwitch').addEventListener('click', () => {
          AppState.includeHardMovements = !AppState.includeHardMovements;
          MOVEMENTS_DB.forEach(m => {
            if (m.difficulty === 'hard') {
              if (AppState.includeHardMovements) {
                AppState.excludedMovements.delete(m.id);
              } else {
                AppState.excludedMovements.add(m.id);
              }
            }
          });
          AppState.saveToStorage();
          this.renderMovementMatrix();
          this.markWodOutdated(true);
        });

        // Quick Skill Filter Preset Buttons (Normal Only vs All Enabled vs Custom)
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
              document.getElementById('movementMatrixCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
              return;
            }
            AppState.saveToStorage();
            this.renderMovementMatrix();
            this.markWodOutdated(true);
          });
        });

        // Quick Jump to Movement Matrix from Header
        document.getElementById('openMatrixQuickBtn').addEventListener('click', () => {
          document.getElementById('movementMatrixCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            document.querySelectorAll('.diff-filter-btn').forEach(b => {
              b.classList.remove('ring-2', 'ring-volt');
            });
            btn.classList.add('ring-2', 'ring-volt');
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

        // Select All Visible / Deselect All
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

        const intensityGrid = document.getElementById('intensitySelectorGrid');
        if (intensityGrid) {
          intensityGrid.addEventListener('click', e => {
            const btn = e.target.closest('.intensity-btn');
            if (!btn) return;
            AppState.intensity = btn.dataset.intensity;
            AppState.saveToStorage();
            this.renderParameterControls();
            this.markWodOutdated(true);
          });
        }

        // Generate & Re-Roll WOD Buttons
        document.getElementById('generateWodBtn').addEventListener('click', () => {
          this.scrollToTopAndGenerate();
        });
        document.getElementById('rerollWodBtn').addEventListener('click', () => {
          this.generateAndDisplayWod();
        });

        // WOD Movements List: Swap Optional Movement, Scale Down Movement, OR Open IK Demo Modal
        document.getElementById('wodMovementsList').addEventListener('click', e => {
          const swapBtn = e.target.closest('[data-swap-item-index]');
          if (swapBtn && AppState.currentWod) {
            const idx = parseInt(swapBtn.dataset.swapItemIndex, 10);
            const currentItem = AppState.currentWod.items[idx];
            if (currentItem && currentItem.alternative) {
              AppState.currentWod.items[idx].movement = currentItem.alternative.movement;
              delete AppState.currentWod.items[idx].benchmarkCustomLabel;
              WorkoutGenerator.refreshWodCollisionFreeMetadata(AppState.currentWod);
              this.displayWod(AppState.currentWod);
            }
            return;
          }

          const scaleBtn = e.target.closest('[data-scale-item-index]');
          if (scaleBtn && AppState.currentWod) {
            const idx = parseInt(scaleBtn.dataset.scaleItemIndex, 10);
            const currentItem = AppState.currentWod.items[idx];
            if (currentItem && currentItem.scaleDown) {
              AppState.currentWod.items[idx].movement = currentItem.scaleDown.movement;
              delete AppState.currentWod.items[idx].benchmarkCustomLabel;
              WorkoutGenerator.refreshWodCollisionFreeMetadata(AppState.currentWod);
              this.displayWod(AppState.currentWod);
            }
            return;
          }

          const card = e.target.closest('[data-demo-mov]');
          if (card) {
            this.openMovementDemoModal(card.dataset.demoMov);
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

        // Copy WOD to Clipboard
        document.getElementById('copyWodBtn').addEventListener('click', async () => {
          const wod = AppState.currentWod;
          if (!wod) return;
          let shareUrl = '';
          try {
            shareUrl = await WorkoutSharing.createShareUrl(wod);
          } catch (e) { }

          const textParts = [
            `${wod.title} (${wod.badgeFormat})`,
            wod.prescriptionHeader,
            ...wod.items.map(i => {
              const subSuffix = (i.isOptionalGear && i.alternative) ? ` [Or Sub: ${i.alternative.text}]` : '';
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
          } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }

          const label = document.getElementById('copyWodLabel');
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = 'Copy'; }, 1800);
        });

        // Close Movement Demo Modal
        const closeDemoModal = () => {
          const modal = document.getElementById('movementDemoModal');
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        };
        document.getElementById('closeDemoModalBtn').addEventListener('click', closeDemoModal);
        document.getElementById('movementDemoModal').addEventListener('click', e => {
          if (e.target.id === 'movementDemoModal') closeDemoModal();
        });

        // Classical Benchmarks Modal
        this._activeBFilter = 'all';
        document.getElementById('openBenchmarksModalBtn').addEventListener('click', () => {
          this._activeBFilter = 'all';
          const searchInput = document.getElementById('benchmarksSearchInput');
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('.bfilter-btn').forEach(b => {
            b.className = b.dataset.bfilter === 'all'
              ? 'bfilter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-volt text-slate-950'
              : 'bfilter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300';
          });
          this.renderBenchmarksModal('all');
          const modal = document.getElementById('benchmarksModal');
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        });

        const closeBenchModal = () => {
          const modal = document.getElementById('benchmarksModal');
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        };
        document.getElementById('closeBenchmarksModalBtn').addEventListener('click', closeBenchModal);
        document.getElementById('benchmarksModal').addEventListener('click', e => {
          if (e.target.id === 'benchmarksModal') closeBenchModal();
        });

        document.querySelectorAll('.bfilter-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.bfilter-btn').forEach(b => {
              b.className = 'bfilter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300';
            });
            btn.className = 'bfilter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-volt text-slate-950';
            this._activeBFilter = btn.dataset.bfilter;
            const searchInput = document.getElementById('benchmarksSearchInput');
            this.renderBenchmarksModal(this._activeBFilter, searchInput ? searchInput.value : '');
          });
        });

        const benchSearch = document.getElementById('benchmarksSearchInput');
        if (benchSearch) {
          benchSearch.addEventListener('input', e => {
            this.renderBenchmarksModal(this._activeBFilter || 'all', e.target.value);
          });
        }

        document.getElementById('benchmarksListContainer').addEventListener('click', e => {
          const card = e.target.closest('[data-load-benchmark]');
          if (!card) return;
          const bm = CLASSICAL_BENCHMARKS.find(b => b.id === card.dataset.loadBenchmark);
          if (bm) {
            this.clearSharedUrl();
            this.displayWod(WorkoutGenerator.formatBenchmarkWod(bm));
            closeBenchModal();
          }
        });

        // Scale Progressions & Ladders Modal
        this._activeScalePattern = 'ALL';
        const openScaleModal = () => {
          this._activeScalePattern = 'ALL';
          document.querySelectorAll('.spattern-btn').forEach(b => {
            b.className = b.dataset.spattern === 'ALL'
              ? 'spattern-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-400 text-slate-950 font-bold'
              : 'spattern-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300';
          });
          this.renderScaleModal('ALL');
          const modal = document.getElementById('scaleModal');
          if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
          }
        };

        const scaleBtn = document.getElementById('openScaleModalBtn');
        if (scaleBtn) scaleBtn.addEventListener('click', openScaleModal);

        const closeScaleModal = () => {
          const modal = document.getElementById('scaleModal');
          if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
          }
        };

        const closeScaleBtn = document.getElementById('closeScaleModalBtn');
        if (closeScaleBtn) closeScaleBtn.addEventListener('click', closeScaleModal);

        const scaleModalEl = document.getElementById('scaleModal');
        if (scaleModalEl) {
          scaleModalEl.addEventListener('click', e => {
            if (e.target.id === 'scaleModal') closeScaleModal();
          });
        }

        const scaleTabs = document.getElementById('scalePatternTabs');
        if (scaleTabs) {
          scaleTabs.addEventListener('click', e => {
            const btn = e.target.closest('.spattern-btn');
            if (!btn) return;
            document.querySelectorAll('.spattern-btn').forEach(b => {
              b.className = 'spattern-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300';
            });
            btn.className = 'spattern-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-400 text-slate-950 font-bold';
            this._activeScalePattern = btn.dataset.spattern;
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
              this.openMovementDemo(mov);
            }
          });
        }

        // Floating "Generate Workout" Button (appears when scrolled down)
        const floatingBar = document.getElementById('floatingGenerateBar');
        if (floatingBar) {
          window.addEventListener('scroll', () => {
            if (window.scrollY > 280) {
              floatingBar.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
              floatingBar.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            } else {
              floatingBar.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
              floatingBar.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
          }, { passive: true });

          document.getElementById('floatingGenerateBtn').addEventListener('click', () => {
            this.scrollToTopAndGenerate();
          });
        }

        // Scroll to Customize Jump Button
        const scrollToCustBtn = document.getElementById('scrollToCustomizeBtn');
        if (scrollToCustBtn) {
          scrollToCustBtn.addEventListener('click', () => {
            document.getElementById('customizeSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }

        // Reset Preferences Button
        document.getElementById('resetPrefsBtn').addEventListener('click', () => {
          localStorage.removeItem(STORAGE_KEY);
          AppState.equipmentStates = {
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
          AppState.includeHardMovements = false;
          AppState.initDefaultExclusions();
          AppState.mode = 'smart';
          AppState.format = 'ANY';
          AppState.duration = 'medium';
          AppState.intensity = 'standard';
          this.renderEquipmentGrid();
          this.renderMovementMatrix();
          this.renderParameterControls();
          this.generateAndDisplayWod();
        });
      }
    };

globalThis.UI = UI;
