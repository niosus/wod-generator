/**
 * Pure 2D Skeletal Kinematics Pose Computation
 * Computes pure skeleton frames for all 49 WODFORGE movements
 */
function _computePose (poseType, timestamp) {
        const periodMs = 2400;
        const normT = ((timestamp % periodMs) + periodMs) % periodMs / periodMs;
        const theta = normT * Math.PI * 2;
        const p = 0.5 - 0.5 * Math.cos(theta); // 0 -> 1 -> 0 smooth cosine wave

        const frame = {
          poseType,
          view: 'side',
          floorY: 170,
          torso: null,       // { hipX, hipY, shoulderX, shoulderY, headX, headY, facingDir }
          frontTorso: null,  // { leftShoulderX, rightShoulderX, shoulderY, leftHipX, rightHipX, hipY, headX, headY }
          limbs: [],         // { name, kind: 'leg'|'arm', x1, y1, jx, jy, x2, y2, color1, color2, width, endType, footDir, surfaceY }
          props: []          // custom equipment / environment primitives to render
        };

        const addLimb = (name, kind, x1, y1, jx, jy, x2, y2, color1, color2, width, endType = 'hand', footDir = 1, surfaceY = null) => {
          frame.limbs.push({ name, kind, x1, y1, jx, jy, x2, y2, color1, color2, width, endType, footDir, surfaceY: surfaceY ?? frame.floorY });
        };

        // ===========================================================================
        // 1. BAR & RING PULLING / MUSCLE-UP EXERCISES
        //    - pullup_front: Front-view high bar (barY=16, floorY=192) so athlete starts
        //      in a full straight-arm, straight-leg dead hang well above the floor.
        //    - muscle_up_front & ring_muscle_up_front: Side-view with vertical camera
        //      tracking so athlete starts in a full dead hang above the floor, performs
        //      an authentic kip & hip-to-bar pull, and transitions shoulders forward
        //      over the bar/rings with elbows bending strictly backward (never crossing!).
        // ===========================================================================
        if (poseType === 'pullup_front') {
          frame.view = 'front';
          frame.floorY = 192;
          const barY = 16;
          const leftHandX = 74, rightHandX = 126, handY = barY;
          frame.props.push({ type: 'rig_uprights', barY, floorY: 192 });

          const leftShoulderX = 85, rightShoulderX = 115;
          const leftHipX = 91, rightHipX = 109;
          // Full straight-arm dead hang (p=0: shoulderY=62, dist=47.3px) to chin-over-bar (p=1: shoulderY=24, headY=10)
          const shoulderY = this.lerp(62, 24, p);
          const hipY = shoulderY + L_TORSO;

          frame.frontTorso = {
            leftShoulderX, rightShoulderX, shoulderY,
            leftHipX, rightHipX, hipY,
            headX: 100, headY: shoulderY - 14
          };

          const armL = this.solveFrontArm(leftShoulderX, shoulderY, leftHandX, handY, true);
          const armR = this.solveFrontArm(rightShoulderX, shoulderY, rightHandX, handY, false);
          addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');

          // Straight hanging legs (63.2px extension) that stay well above floorY=192 even at bottom of dead hang (y=171.2)
          const targetFootY = hipY + 63.2;
          const legL = this.solveFrontLeg(leftHipX, hipY, leftHipX, targetFootY, true);
          const legR = this.solveFrontLeg(rightHipX, hipY, rightHipX, targetFootY, false);
          addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
          addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
          return frame;
        }

        if (poseType === 'muscle_up_front' || poseType === 'ring_muscle_up_front') {
          const isRingMU = poseType === 'ring_muscle_up_front';
          const barX = 104;
          const barY = 74; // 100% stationary bar & rings inside a static environment!
          frame.scale = 0.72;
          frame.originX = 100;
          frame.originY = 4;
          frame.floorY = 246; // Stationary floor below full dead hang (footY=231 < 246)

          // 6-stage Muscle-Up in Side View with 100% stationary barY = 74:
          // Keeping relSX < 0 (shoulder slightly behind bar/ring center while head/chest transition over it)
          // guarantees dx = barX - shoulderX > 0 across all phases so solveIK(bendSide=1) never flips or crosses!
          const muKF = [
            // 0: Full straight-arm, straight-leg dead hang well above stationary floor
            { relSX: -2, relSY: 47, spine: -1.56, thigh: 1.56, shin: 1.58, neck: 0.05 },
            // 1: Kip swing & lat press (arms straight pressing down on bar/rings, hips load & drive forward)
            { relSX: -14, relSY: 44, spine: -1.32, thigh: 0.92, shin: 1.06, neck: 0.10 },
            // 2: Explosive hip-to-bar pull (elbows drive back behind ribs)
            { relSX: -18, relSY: 14, spine: -1.16, thigh: 0.62, shin: 0.88, neck: 0.16 },
            // 3: Fast forward turnover into bottom of dip above bar/rings (shoulders above hands, elbows back!)
            { relSX: -10, relSY: -10, spine: -1.24, thigh: 1.42, shin: 1.62, neck: 0.18 },
            // 4: Locked-out top support press above bar/rings (arms fully extended 46.5px above stationary bar/rings!)
            { relSX: -3, relSY: -46, spine: -1.52, thigh: 1.52, shin: 1.56, neck: 0.08 },
            // 5: Controlled eccentric return to hang
            { relSX: -14, relSY: 20, spine: -1.42, thigh: 1.48, shin: 1.56, neck: 0.08 }
          ];
          const st = this.sampleKeyframes(muKF, normT);

          if (isRingMU) {
            frame.props.push({ type: 'overhead_beam', x1: 48, y1: 6, x2: 160, y2: 6 });
            frame.props.push({ type: 'gym_ring', strapX: barX, strapY: 6, cx: barX, cy: barY, r: 8.5 });
          } else {
            frame.props.push({ type: 'side_rig', postX: 38, barX, barY, floorY: frame.floorY });
          }

          const shoulderX = barX + st.relSX;
          const shoulderY = barY + st.relSY;
          frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, st.spine, 1, st.neck);
          const { hipX, hipY } = frame.torso;

          const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);
          const legBack = this.solveFK(hipX - 2, hipY, st.thigh, st.shin, L_THIGH, L_SHIN);
          const legFront = this.solveFK(hipX, hipY, st.thigh, st.shin, L_THIGH, L_SHIN);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 300);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 300);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 1B. SIDE-VIEW HANGING KNEE RAISES & TOES-TO-BAR (T2B)
        // ===========================================================================
        if (poseType === 'knee_raise_side' || poseType === 'toes_to_bar_side') {
          frame.floorY = 188;
          const barX = 96, barY = 20;
          frame.props.push({ type: 'side_rig', postX: 44, barX, barY, floorY: 188 });

          if (poseType === 'toes_to_bar_side') {
            // Kipping Toes-to-Bar:
            // Straight arms press back on the bar (armAngle: 1.60 -> 2.46 rad) while hips rise & compress
            // (torsoDownAngle: 1.54 -> 0.72 rad) so hip = (92.8, 84.8) is 60.9px below bar (96, 20).
            // Legs sweep up with natural anatomical knee flexion (shinAngle >= thighAngle at all times, zero hyperextension!)
            const armAngle = this.lerp(1.60, 2.46, p);
            const armFK = this.solveFK(barX, barY, armAngle, armAngle + 0.04, L_FOREARM, L_UPPER_ARM);
            const shoulderX = armFK.ex;
            const shoulderY = armFK.ey;

            const torsoDownAngle = this.lerp(1.54, 0.72, p);
            const spineAngle = torsoDownAngle + Math.PI;
            frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, -0.15);
            const { hipX, hipY } = frame.torso;

            const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

            // Keep shinAngle >= thighAngle throughout the entire sweep so knees never hyperextend backward!
            const thighAngle = this.lerp(1.56, -1.66, p);
            const shinAngle = this.lerp(1.62, -1.36, p);
            const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
            const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 200);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

            if (p > 0.88) {
              frame.props.push({ type: 'strike_ring', x: barX + 1, y: barY + 1, r: 10 });
            }
          } else {
            // Hanging Knee Raise: active hang from bar, knees tuck smoothly above hip crease with exact 32+32=64px segments
            const shoulderX = this.lerp(95, 86, p);
            const shoulderY = this.lerp(66, 62, p);
            const spineAngle = this.lerp(-1.55, -1.72, p);
            frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.08);
            const { hipX, hipY } = frame.torso;

            const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

            const thighAngle = this.lerp(1.56, -0.38, p);
            const shinAngle = this.lerp(1.60, 1.72, p);
            const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
            const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1, 200);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
          }
          return frame;
        }

        // ===========================================================================
        // 2. PUSH-UPS & KNEE PUSH-UPS (SIDE VIEW - RIGID PLANK, ELBOW BENDS BACKWARD +1)
        // ===========================================================================
        if (poseType === 'pushup' || poseType === 'knee_pushup') {
          frame.floorY = 166;

          if (poseType === 'knee_pushup') {
            // Knee Push-Ups: pivot point is planted knees on the floor (66, 164)
            // with shins and feet angled up into the air behind the knees!
            const kneeX = 66, kneeY = 164;
            const handX = 138, handY = 162;
            const plankAngle = this.lerp(-0.46, -0.14, p);
            const hipX = kneeX + Math.cos(plankAngle) * L_THIGH;
            const hipY = kneeY + Math.sin(plankAngle) * L_THIGH;

            frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, -0.05);
            const { shoulderX, shoulderY } = frame.torso;

            // Feet/shins angled up into the air behind the planted knees (elevated ~20px off deck)
            const shinAngle = 3.82;
            const ankleX = kneeX + Math.cos(shinAngle) * L_SHIN;
            const ankleY = kneeY + Math.sin(shinAngle) * L_SHIN;

            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, kneeX - 2, kneeY, ankleX - 2, ankleY, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, kneeX, kneeY, ankleX, ankleY, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
            return frame;
          }

          const ankleX = 36, ankleY = 162;
          const handX = 140, handY = 162;

          // Rigid plank rotates cleanly around planted toes (ankleX, ankleY)
          const plankAngle = this.lerp(-0.42, -0.11, p);
          const legLen = 62.5;
          const hipX = ankleX + Math.cos(plankAngle) * legLen;
          const hipY = ankleY + Math.sin(plankAngle) * legLen;

          frame.torso = this.torsoFromHip(hipX, hipY, plankAngle, 1, -0.05);
          const { shoulderX, shoulderY } = frame.torso;

          const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
          const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 3. PIKE PUSH-UPS (SIDE VIEW - STEEP INVERTED-V LOCKOUT TO DEEP TRIPOD)
        // ===========================================================================
        if (poseType === 'pike_pushup') {
          frame.floorY = 166;
          const ankleX = 46, ankleY = 158;
          const handX = 124, handY = 162;

          // High-hip Inverted-V geometry:
          // Top (p=0): Hipsiked high at (66.3, 98.9) on tiptoes, torso angled steeply down (spineAngle=0.64 rad)
          //   to shoulders at (103.2, 126.4) with extended arms (41.2px) aligned with the inverted V.
          // Bottom (p=1): Shoulders travel 20px diagonally forward & down to (114.8, 142.4) with deep 90° backward
          //   elbow bend (elbow at (99.4, 161.6)) while the crown of the head kisses the mat in front of the hands!
          const legAngle = this.lerp(-1.24, -0.92, p);
          const hipX = ankleX + Math.cos(legAngle) * 62.5;
          const hipY = ankleY + Math.sin(legAngle) * 62.5;

          const spineAngle = this.lerp(0.64, 0.84, p);
          const neckOffset = this.lerp(-0.08, -0.38, p);
          frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, neckOffset);
          const { shoulderX, shoulderY } = frame.torso;

          const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
          const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 4. HANDSTAND PUSH-UPS (SIDE VIEW - FACING LEFT AWAY FROM WALL, TOES LEFT)
        // ===========================================================================
        if (poseType === 'hspu') {
          frame.floorY = 170;
          frame.props.push({ type: 'wall', x: 142, y1: 16, y2: 170 });

          const handX = 112, handY = 166;
          const shoulderX = this.lerp(112, 105, p);
          const shoulderY = this.lerp(120, 143, p);
          const spineAngle = this.lerp(1.44, 1.38, p); // hip -> shoulder points downward
          frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, -1, 0.05);
          const { hipX, hipY } = frame.torso;

          const ankleX = 135;
          const ankleY = hipY - 60.5;
          const legBack = this.solveIK(hipX + 2, hipY, ankleX + 1, ankleY, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
          const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, -1);

          addLimb('legB', 'leg', hipX + 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', -1, 200);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', -1, 200);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 5. RING / PARALLEL BAR DIPS (SIDE VIEW - LOCKED SUPPORT TO DEEP DIP)
        // ===========================================================================
        if (poseType === 'ring_dip') {
          frame.floorY = 176;
          const handX = 104, handY = 82;
          frame.props.push({ type: 'gym_ring', strapX: 104, strapY: 14, cx: handX, cy: handY, r: 8.5 });

          // Top support (p=0): shoulder stacked over rings at (102, 36); Bottom dip (p=1): shoulder drops to (110, 78) below elbow crease
          const shoulderX = this.lerp(102, 110, p);
          const shoulderY = this.lerp(36, 78, p);
          // Slight athletic forward lean during dip
          const spineAngle = this.lerp(-1.42, -1.26, p);
          frame.torso = this.torsoFromShoulder(shoulderX, shoulderY, spineAngle, 1, 0.12);
          const { hipX, hipY } = frame.torso;

          // Knees bent backward behind athlete so feet stay well above the floor (y <= 166)
          const thighAngle = this.lerp(1.58, 1.62, p);
          const shinAngle = this.lerp(2.25, 2.65, p);
          const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
          const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

          const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 6. RING / BAR INVERTED ROWS, STURDY TABLE ROWS & DOORWAY TOWEL ROWS (SIDE VIEW)
        // ===========================================================================
        if (poseType === 'inverted_row_side' || poseType === 'bar_row_side' || poseType === 'table_row_side' || poseType === 'towel_row_side') {
          frame.floorY = 170;
          if (poseType === 'inverted_row_side' || poseType === 'bar_row_side') {
            const handX = 104, handY = 80;
            if (poseType === 'inverted_row_side') {
              frame.props.push({ type: 'gym_ring', strapX: 104, strapY: 14, cx: handX, cy: handY, r: 8.5 });
            } else {
              frame.props.push({ type: 'low_barbell', barX: handX, barY: handY, floorY: 170 });
            }

            const ankleX = 156, ankleY = 166;
            // Rigid plank from planted heels (156, 166). At p=0, arms are 100% fully extended at 48.6px!
            const bodyAngle = this.lerp(-2.578, -2.26, p); // ankle -> hip -> shoulder
            const legLen = 62.5;
            const hipX = ankleX + Math.cos(bodyAngle) * legLen;
            const hipY = ankleY + Math.sin(bodyAngle) * legLen;

            frame.torso = this.torsoFromHip(hipX, hipY, bodyAngle, 1, 0.15);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            // Shoulder -> Hand: bendSide = +1 bends elbow down-left behind the back!
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          } else if (poseType === 'table_row_side') {
            // Sturdy Table Inverted Row: waist-height table (topY=96, spanning x1=96..175)
            // Athlete grips the front edge of the tabletop at (96, 93) with head outside in open air!
            const handX = 96, handY = 93;
            frame.props.push({ type: 'sturdy_table', x1: 96, x2: 175, topY: 96, floorY: 170 });

            const ankleX = 160, ankleY = 166;
            // At p=0, body hangs below table with arms 100% fully extended at 48.54px!
            const bodyAngle = this.lerp(-2.754, -2.48, p); // rigid body plank pulling chest to table edge
            const legLen = 62.5;
            const hipX = ankleX + Math.cos(bodyAngle) * legLen;
            const hipY = ankleY + Math.sin(bodyAngle) * legLen;

            frame.torso = this.torsoFromHip(hipX, hipY, bodyAngle, 1, -0.15);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          } else {
            // Doorway Towel Row: vertical doorframe pillar at x=142, towel anchored at (142, 86)
            const pillarX = 142;
            const handX = this.lerp(116, 112, p);
            const handY = this.lerp(90, 88, p);
            frame.props.push({ type: 'towel_pillar', pillarX, anchorY: 86, handX, handY });

            const ankleX = 128, ankleY = 166;
            const hipX = this.lerp(82, 96, p);
            const hipY = this.lerp(132, 126, p);
            const spineAngle = this.lerp(-1.95, -1.65, p);
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.15);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          }
          return frame;
        }

        // ===========================================================================
        // 7. PRONE SUPERMAN LAT PULL-DOWNS (SIDE VIEW - ARCH & ELBOW DRIVE TO RIBS)
        // ===========================================================================
        if (poseType === 'superman_pull_side') {
          frame.floorY = 168;
          const hipX = 84, hipY = 160;
          // Thoracic extension lifts chest off floor from -0.12 rad to -0.42 rad
          const spineAngle = this.lerp(-0.12, -0.42, p);
          frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.12);
          const { shoulderX, shoulderY } = frame.torso;

          // Posterior hip/thigh extension lifts knees & feet UP off the mat behind the athlete (angles > Math.PI have sin < 0 = UP!)
          const thighAngle = this.lerp(3.16, 3.38, p);
          const shinAngle = this.lerp(3.18, 3.48, p);
          const legBack = this.solveFK(hipX - 2, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);
          const legFront = this.solveFK(hipX, hipY, thighAngle, shinAngle, L_THIGH, L_SHIN);

          // Arms sweep above the mat from overhead reach (-0.15 rad) to lat pull-down contraction at ribs (-2.55 rad)
          const upperArmAngle = this.lerp(-0.15, -2.55, p);
          const forearmAngle = this.lerp(-0.10, -0.35, p);
          const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
          return frame;
        }

        // ===========================================================================
        // 8. SQUAT FAMILY: AIR SQUAT, GOBLET SQUAT, DB FRONT SQUAT, BB FRONT SQUAT, PISTOL
        // ===========================================================================
        if (
          poseType === 'squat' ||
          poseType === 'goblet_squat' ||
          poseType === 'db_front_squat' ||
          poseType === 'bb_front_squat' ||
          poseType === 'pistol_squat'
        ) {
          frame.floorY = 170;
          const ankleX = 96, ankleY = 166;

          if (poseType === 'pistol_squat') {
            const pistolPeriod = 3600;
            const fullNorm = ((timestamp % pistolPeriod) + pistolPeriod) % pistolPeriod / pistolPeriod;
            const isSecondLeg = fullNorm >= 0.5;
            const repNorm = (fullNorm % 0.5) * 2;
            const repP = 0.5 - 0.5 * Math.cos(repNorm * Math.PI * 2);

            const hipX = this.lerp(94, 70, repP);
            const hipY = this.lerp(104, 140, repP);
            const spineAngle = this.lerp(-1.53, -1.16, repP); // natural forward lean for 1-leg balance
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.14);
            const { shoulderX, shoulderY } = frame.torso;

            const workingLeg = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            // Non-working leg lifts & extends straight out horizontally in front using exact 32+32=64px segments
            const freeThighAngle = this.lerp(1.48, -0.14, repP);
            const freeShinAngle = this.lerp(1.52, -0.06, repP);
            const freeLeg = this.solveFK(hipX, hipY, freeThighAngle, freeShinAngle, L_THIGH, L_SHIN);

            frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEG' : 'RIGHT LEG', second: isSecondLeg });

            if (!isSecondLeg) {
              addLimb('legB', 'leg', hipX, hipY, freeLeg.jx, freeLeg.jy, freeLeg.ex, freeLeg.ey, '#38bdf8', '#38bdf8', 5.4, 'foot', 1, 200);
              addLimb('legF', 'leg', hipX, hipY, workingLeg.jx, workingLeg.jy, workingLeg.ex, workingLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            } else {
              addLimb('legB', 'leg', hipX, hipY, workingLeg.jx, workingLeg.jy, workingLeg.ex, workingLeg.ey, '#38bdf8', '#38bdf8', 5.6, 'foot', 1);
              addLimb('legF', 'leg', hipX, hipY, freeLeg.jx, freeLeg.jy, freeLeg.ex, freeLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);
            }

            const handX = this.lerp(shoulderX + 8, shoulderX + 45, repP);
            const handY = this.lerp(shoulderY + 44, shoulderY + 6, repP);
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          } else {
            const hipX = this.lerp(94, 70, p);
            const hipY = this.lerp(104, 139, p);
            const spineAngle = this.lerp(-1.53, -1.20, p); // exact 46px spine leans forward ~20° at bottom of squat
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.12);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            if (poseType === 'goblet_squat') {
              // Cup kettlebell horns at upper chest/collarbone height with elbows tucked down
              const handX = shoulderX + 11;
              const handY = shoulderY + 2;
              const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
              frame.props.push({ type: 'kettlebell', x: shoulderX + 13, y: shoulderY + 9, r: 7.5 });
            } else if (poseType === 'db_front_squat') {
              // Dual hex dumbbells resting on the shoulders with forward-angled elbows
              const armB = this.solveFK(shoulderX - 2, shoulderY, 0.58, -2.15, L_UPPER_ARM, L_FOREARM);
              const armF = this.solveFK(shoulderX, shoulderY, 0.58, -2.15, L_UPPER_ARM, L_FOREARM);
              addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 5, 'hand');
              frame.props.push({ type: 'dumbbell_far', x: armB.ex, y: armB.ey });
              addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
              frame.props.push({ type: 'dumbbell_near', x: armF.ex, y: armF.ey });
            } else if (poseType === 'bb_front_squat') {
              // High horizontal Olympic front-rack elbows extending forward at chest height
              const arm = this.solveFK(shoulderX, shoulderY, 0.08, -2.85, L_UPPER_ARM, L_FOREARM);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
              frame.props.push({ type: 'barbell_end', x: shoulderX + 6, y: shoulderY + 1, r: 9 });
            } else {
              const handX = this.lerp(shoulderX + 6, shoulderX + 44, p);
              const handY = this.lerp(shoulderY + 44, shoulderY + 4, p);
              const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
            }
          }
          return frame;
        }

        // ===========================================================================
        // 9. OVERHEAD PRESS, PUSH JERK, BARBELL THRUSTER, DB THRUSTER & WALL BALLS
        //    (Kinetic chain transfer: leg drive precedes rapid vertical arm punch!)
        // ===========================================================================
        if (
          poseType === 'overhead_press' ||
          poseType === 'push_jerk' ||
          poseType === 'thruster' ||
          poseType === 'db_thruster' ||
          poseType === 'wall_ball'
        ) {
          frame.floorY = 170;
          const ankleX = 96, ankleY = 166;

          if (poseType === 'wall_ball') {
            // Smaller figure so medicine ball launches high up the wall to target!
            frame.scale = 0.74;
            frame.originX = 100;
            frame.originY = 170;
          }

          if (poseType === 'push_jerk') {
            // Barbell Push Jerk:
            // 0) Front Rack -> 1) Vertical Dip -> 2) Explosive Upward Leg Drive ->
            // 3) Rapid Drop-Under into Quarter-Squat Catch with Locked Arms ->
            // 4) Stabilize Catch -> 5) Stand Tall to Overhead Lockout -> 6) Return to Rack
            const jerkKF = [
              // 0: Tall Front Rack setup (bar resting on front delts)
              { hx: 95, hy: 104, spine: -1.55, bx: 104, by: 56 },
              // 1: Controlled Vertical Dip (hips drop straight down, torso stays vertical, bar stays on shoulders)
              { hx: 91, hy: 116, spine: -1.52, bx: 102, by: 68 },
              // 2: Explosive Upward Leg Drive! (hips & knees extend violently to hy=101, launching bar upward)
              { hx: 96, hy: 101, spine: -1.56, bx: 100, by: 42 },
              // 3: Rapid Drop-Under into Quarter-Squat Catch! (hips drop to hy=123 while arms lock out overhead!)
              { hx: 83, hy: 123, spine: -1.42, bx: 97, by: 30 },
              // 4: Hold Quarter-Squat Catch briefly
              { hx: 85, hy: 120, spine: -1.44, bx: 97, by: 27 },
              // 5: Stand Tall with Bar Locked Out Overhead
              { hx: 95, hy: 104, spine: -1.55, bx: 97, by: 11 },
              // 6: Lower bar controlled back to Front Rack
              { hx: 93, hy: 108, spine: -1.52, bx: 104, by: 60 }
            ];
            const st = this.sampleKeyframes(jerkKF, normT);
            frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.06);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(st.hx, st.hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            const arm = this.solveIK(shoulderX, shoulderY, st.bx, st.by, L_UPPER_ARM, L_FOREARM, 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
            frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 8.5 });
            return frame;
          }

          const isFullSquat = poseType === 'thruster' || poseType === 'db_thruster' || poseType === 'wall_ball';
          const isDumbbell = poseType === 'db_thruster' || poseType === 'overhead_press';

          const legDrive = this.smoothstep(this.clamp(p / 0.78, 0, 1));
          const armPunch = this.smoothstep(this.clamp((p - 0.22) / 0.78, 0, 1));

          const hipX = this.lerp(isFullSquat ? 70 : 89, 95, legDrive);
          const hipY = this.lerp(isFullSquat ? 139 : 115, 104, legDrive);
          const spineAngle = this.lerp(isFullSquat ? -1.22 : -1.46, -1.55, legDrive);
          frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.08 * (1 - legDrive));
          const { shoulderX, shoulderY } = frame.torso;

          const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
          addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

          if (isDumbbell) {
            // Dual hex dumbbells pressed from shoulders into overhead lockout
            const startUA = 0.58, startFA = -2.05;
            const endUA = -1.54, endFA = -1.54;
            const ua = this.lerp(startUA, endUA, armPunch);
            const fa = this.lerp(startFA, endFA, armPunch);

            const armBack = this.solveFK(shoulderX - 3, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
            const armFront = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
            addLimb('armB', 'arm', shoulderX - 3, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
            frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
            addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
            frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
          } else if (poseType === 'thruster') {
            // Barbell Thruster: high horizontal front-rack elbows extending to overhead barbell lockout
            const startUA = 0.16, startFA = -2.45;
            const endUA = -1.52, endFA = -1.52;
            const ua = this.lerp(startUA, endUA, armPunch);
            const fa = this.lerp(startFA, endFA, armPunch);
            const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
            frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 8.5 });
          } else {
            // Wall ball: two hands thrusting medicine ball high up the wall to 10ft target
            const upperArmAngle = this.lerp(0.68, -1.05, armPunch);
            const forearmAngle = this.lerp(-1.15, -1.12, armPunch);
            const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');

            // High 10ft target at (156, -34); medicine ball launches high in an arc!
            const targetY = -34;
            const flight = Math.max(0, (p - 0.48) / 0.52);
            const ballX = this.lerp(arm.ex + 4, 147, flight);
            const ballY = this.lerp(arm.ey - 2, targetY, Math.sin(flight * Math.PI * 0.5));
            frame.props.push({ type: 'wall_ball_rig', wallX: 156, targetY, ballX, ballY, hit: p > 0.90 });
          }
          return frame;
        }

        // ===========================================================================
        // 10. STEPPING LUNGES (ALTERNATING L & R) vs. JUMPING LUNGES
        // ===========================================================================
        if (poseType === 'stepping_lunge' || poseType === 'jumping_lunge') {
          frame.floorY = 170;

          if (poseType === 'stepping_lunge') {
            const lungeCycleMs = 3800;
            const fullNorm = ((timestamp % lungeCycleMs) + lungeCycleMs) % lungeCycleMs / lungeCycleMs;
            const isSecondLeg = fullNorm >= 0.5;
            const repNorm = (fullNorm % 0.5) * 2;

            const lungeKF = [
              // 0: Stand tall, feet together at x=75
              { hx: 75, hy: 104, spine: -1.54, fax: 76, fay: 166, rax: 74, ray: 166 },
              // 1: Stepping foot lifts & strides forward cleanly over floor
              { hx: 86, hy: 106, spine: -1.52, fax: 106, fay: 146, rax: 74, ray: 166 },
              // 2: Stepping foot plants flat at x=128
              { hx: 98, hy: 112, spine: -1.50, fax: 128, fay: 166, rax: 74, ray: 166 },
              // 3: Deep 90/90 lunge bottom (back knee kisses floor at y=160, front knee at 90°)
              { hx: 101, hy: 133, spine: -1.52, fax: 128, fay: 166, rax: 74, ray: 164 },
              // 4: Drive up through front heel
              { hx: 96, hy: 112, spine: -1.50, fax: 128, fay: 166, rax: 74, ray: 166 },
              // 5: Step back together to standing
              { hx: 82, hy: 106, spine: -1.53, fax: 96, fay: 150, rax: 74, ray: 166 }
            ];
            const st = this.sampleKeyframes(lungeKF, repNorm);
            frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
            const { shoulderX, shoulderY } = frame.torso;

            frame.props.push({ type: 'hud_badge', text: isSecondLeg ? 'LEFT LEAD' : 'RIGHT LEAD', second: isSecondLeg });

            const stepLeg = this.solveIK(st.hx, st.hy, st.fax, st.fay, L_THIGH, L_SHIN, -1);
            const anchorLeg = this.solveIK(st.hx, st.hy, st.rax, st.ray, L_THIGH, L_SHIN, -1);

            if (!isSecondLeg) {
              addLimb('legB', 'leg', st.hx, st.hy, anchorLeg.jx, anchorLeg.jy, anchorLeg.ex, anchorLeg.ey, '#38bdf8', '#38bdf8', 5.5, 'foot', 1);
              addLimb('legF', 'leg', st.hx, st.hy, stepLeg.jx, stepLeg.jy, stepLeg.ex, stepLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            } else {
              addLimb('legB', 'leg', st.hx, st.hy, stepLeg.jx, stepLeg.jy, stepLeg.ex, stepLeg.ey, '#38bdf8', '#38bdf8', 5.8, 'foot', 1);
              addLimb('legF', 'leg', st.hx, st.hy, anchorLeg.jx, anchorLeg.jy, anchorLeg.ex, anchorLeg.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            }

            const lungeDepth = Math.max(0, (st.hy - 104) / 30);
            const handX = this.lerp(shoulderX + 6, shoulderX + 26, lungeDepth);
            const handY = this.lerp(shoulderY + 43, shoulderY + 14, lungeDepth);
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          } else {
            // Jumping Lunge: split lunge bottom -> explosive leg drive (feet push off floor) -> vertical flight & scissor switch -> deep landing absorption
            const jlPeriod = 2400;
            const norm = ((timestamp % jlPeriod) + jlPeriod) % jlPeriod / jlPeriod;
            const isRep2 = norm >= 0.50;
            const u = isRep2 ? (norm - 0.50) / 0.50 : norm / 0.50;

            let hx = 96, hy, ax1, ay1, ax2, ay2, armUA, armFA;
            const posFrontX = 120, posBackX = 72;

            if (u < 0.22) {
              // Phase 1: Explosive Leg Drive! Feet STAY ON FLOOR while hips drive up & knees extend forcefully
              const t = this.smoothstep(u / 0.22);
              hy = this.lerp(132, 104, t);
              const f1X = isRep2 ? posBackX : posFrontX;
              const f2X = isRep2 ? posFrontX : posBackX;
              ax1 = f1X; ay1 = 166;
              ax2 = f2X; ay2 = 166;
              armUA = this.lerp(1.25, 0.45, t); armFA = armUA - 1.25;
            } else if (u < 0.72) {
              // Phase 2: Aerial Flight & Scissor Switch in mid-air
              const t = (u - 0.22) / 0.50;
              const st = this.smoothstep(t);
              const parabola = 4 * t * (1 - t);
              hy = this.lerp(104, 104, t) - 20 * parabola; // apex at 84 in the air!
              const start1X = isRep2 ? posBackX : posFrontX;
              const end1X = isRep2 ? posFrontX : posBackX;
              const start2X = isRep2 ? posFrontX : posBackX;
              const end2X = isRep2 ? posBackX : posFrontX;

              ax1 = this.lerp(start1X, end1X, st);
              ax2 = this.lerp(start2X, end2X, st);
              const airLift = 26 * parabola;
              ay1 = 166 - airLift;
              ay2 = 166 - airLift;
              armUA = this.lerp(0.45, 1.25, st); armFA = armUA - 1.25;
            } else {
              // Phase 3: Touchdown & Deep Absorption
              const t = this.smoothstep((u - 0.72) / 0.28);
              hy = this.lerp(104, 132, t);
              const f1X = isRep2 ? posFrontX : posBackX;
              const f2X = isRep2 ? posBackX : posFrontX;
              ax1 = f1X; ay1 = 166;
              ax2 = f2X; ay2 = 166;
              armUA = this.lerp(1.25, 1.25, t); armFA = armUA - 1.25;
            }

            frame.torso = this.torsoFromHip(hx, hy, -1.54, 1, 0);
            const { shoulderX, shoulderY } = frame.torso;

            const legFront = this.solveIK(hx, hy, ax1, ay1, L_THIGH, L_SHIN, -1);
            const legBack = this.solveIK(hx - 2, hy, ax2, ay2, L_THIGH, L_SHIN, -1);
            const arm = this.solveFK(shoulderX, shoulderY, armUA, armFA, L_UPPER_ARM, L_FOREARM);

            addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.5, 'foot', 1);
            addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          }
          return frame;
        }

        // ===========================================================================
        // 11. ABMAT SIT-UPS & V-UPS (SIDE VIEW - SUPINE ANATOMICAL CURL)
        // ===========================================================================
        if (poseType === 'situp' || poseType === 'vup') {
          frame.floorY = 168;

          if (poseType === 'situp') {
            const hipX = 86, hipY = 160;
            const ankleX = 138, ankleY = 164;

            const spineAngle = this.lerp(-2.98, -1.35, p);
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.22 * (1 - p));
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            // Arms sweep overhead above mat (-2.68 rad) to touching shoes (-0.05 rad) with exact segment lengths
            const upperArmAngle = this.lerp(-2.68, -0.05, p);
            const forearmAngle = upperArmAngle - this.lerp(0.32, 0.25, p);
            const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          } else {
            // V-UPS: Simultaneous torso + straight-leg jackknife fold
            const hipX = 96, hipY = 160;
            const spineAngle = this.lerp(-2.96, -2.02, p);
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.20 * (1 - p));
            const { shoulderX, shoulderY } = frame.torso;

            const legAngle = this.lerp(-0.14, -1.12, p);
            const legBack = this.solveFK(hipX - 2, hipY, legAngle - 0.03, legAngle + 0.03, L_THIGH, L_SHIN);
            const legFront = this.solveFK(hipX, hipY, legAngle - 0.03, legAngle + 0.03, L_THIGH, L_SHIN);
            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, 200);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, 200);

            const upperArmAngle = this.lerp(-2.68, -0.58, p);
            const forearmAngle = upperArmAngle - this.lerp(0.28, 0.18, p);
            const arm = this.solveFK(shoulderX, shoulderY, upperArmAngle, forearmAngle, L_UPPER_ARM, L_FOREARM);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          }
          return frame;
        }

        // ===========================================================================
        // 12. KETTLEBELL SWINGS, KB SNATCH, KB DEADLIFT, DEADLIFTS, DB BENT-OVER ROWS,
        //     HANG POWER CLEANS & SQUAT SNATCH
        // ===========================================================================
        if (
          poseType === 'kb_swing' ||
          poseType === 'kb_snatch' ||
          poseType === 'kb_deadlift' ||
          poseType === 'deadlift_row' ||
          poseType === 'db_bent_row' ||
          poseType === 'hang_power_clean' ||
          poseType === 'clean_snatch'
        ) {
          frame.floorY = 170;
          const ankleX = 92, ankleY = 166;

          if (poseType === 'db_bent_row') {
            const hipX = 72, hipY = 114;
            const spineAngle = -0.52; // Fixed flat-back hinge
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.15);
            const { shoulderX, shoulderY } = frame.torso;

            const farPull = 0.5 + 0.5 * Math.cos(theta);
            const farHandX = this.lerp(shoulderX + 2, hipX + 10, farPull);
            const farHandY = this.lerp(shoulderY + 45, hipY + 2, farPull);
            const farArm = this.solveIK(shoulderX, shoulderY, farHandX, farHandY, L_UPPER_ARM, L_FOREARM, 1);

            const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);

            const nearHandX = this.lerp(shoulderX + 4, hipX + 12, p);
            const nearHandY = this.lerp(shoulderY + 46, hipY + 4, p);
            const nearArm = this.solveIK(shoulderX, shoulderY, nearHandX, nearHandY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('armB', 'arm', shoulderX, shoulderY, farArm.jx, farArm.jy, farArm.ex, farArm.ey, '#64748b', '#475569', 5, 'hand');
            frame.props.push({ type: 'dumbbell_far', x: farArm.ex, y: farArm.ey });
            addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('armF', 'arm', shoulderX, shoulderY, nearArm.jx, nearArm.jy, nearArm.ex, nearArm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
            frame.props.push({ type: 'dumbbell_near', x: nearArm.ex, y: nearArm.ey });
          } else if (poseType === 'hang_power_clean' || poseType === 'clean_snatch') {
            const isHangClean = poseType === 'hang_power_clean';
            // Keep ua and fa on the same anatomical branch throughout (no 2*PI wrap-around spin!):
            // - Hang Power Clean: straight arms at knee (ua=1.54, fa=1.58) -> triple extension & upright pull
            //   with elbows pulling back/up (ua=1.75, fa=0.85) -> fast elbow whip forward under the bar into
            //   Quarter-Squat Front Rack catch (ua=0.35, fa=-1.62) -> stand tall in Front Rack (ua=0.42, fa=-1.55).
            // - Squat Snatch: setup from shin (ua=1.52, fa=1.55) -> explosive triple extension & Snatch High Pull
            //   with elbows high above the bar (ua=-0.35, fa=0.95) -> rapid turnover into deep Overhead Squat catch
            //   with locked-out overhead arms (ua=-1.50, fa=-1.50) -> stand tall to full Snatch Lockout (ua=-1.55, fa=-1.55).
            const olyKF = isHangClean
              ? [
                // 0: Hang setup at top of knee (hips hinged back, straight arms holding bar at knee height)
                { hx: 72, hy: 116, spine: -0.72, ua: 1.54, fa: 1.58 },
                // 1: Violent triple extension & shrug / upright pull along thighs
                { hx: 95, hy: 102, spine: -1.55, ua: 1.75, fa: 0.85 },
                // 2: Whip elbows forward under bar into Quarter-Squat Front Rack Catch!
                { hx: 82, hy: 122, spine: -1.38, ua: 0.35, fa: -1.62 },
                // 3: Stand Tall with High Front-Rack Elbows
                { hx: 94, hy: 104, spine: -1.54, ua: 0.42, fa: -1.55 },
                // 4: Return bar controlled to hang position
                { hx: 84, hy: 110, spine: -1.12, ua: 1.18, fa: 0.82 }
              ]
              : [
                // 0: Snatch setup from mid-shin (deep hip hinge, straight arms down to bar)
                { hx: 68, hy: 122, spine: -0.62, ua: 1.52, fa: 1.55 },
                // 1: Explosive triple extension + Snatch High Pull (hips tall, elbows pull high above bar!)
                { hx: 95, hy: 102, spine: -1.56, ua: -0.35, fa: 0.95 },
                // 2: Rapid turnover & drop under into deep Overhead Squat Catch (arms locked overhead!)
                { hx: 70, hy: 139, spine: -1.24, ua: -1.50, fa: -1.50 },
                // 3: Stabilize bottom of Overhead Squat briefly
                { hx: 72, hy: 136, spine: -1.26, ua: -1.50, fa: -1.50 },
                // 4: Stand tall from Overhead Squat to full Snatch Lockout
                { hx: 94, hy: 104, spine: -1.55, ua: -1.55, fa: -1.55 },
                // 5: Controlled return toward hang
                { hx: 82, hy: 112, spine: -1.08, ua: 0.55, fa: 0.85 }
              ];
            const st = this.sampleKeyframes(olyKF, normT);
            frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.10);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(st.hx, st.hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            const arm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
            frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9 });
          } else if (poseType === 'kb_snatch') {
            // Kettlebell Snatch: Alternating single-arm Olympic lift
            // 5-stage cycle: Hike back between knees -> violent hip snap & vertical zip high pull (elbow high above bell!) ->
            // rapid punch-through to vertical overhead lockout -> lockout hold (bell on forearm) -> drop through rack
            const snatchPeriod = 3400;
            const fullNorm = ((timestamp % snatchPeriod) + snatchPeriod) % snatchPeriod / snatchPeriod;
            const isSecondArm = fullNorm >= 0.5;
            const repNorm = (fullNorm % 0.5) * 2;
            frame.props.push({ type: 'hud_badge', text: isSecondArm ? 'LEFT ARM' : 'RIGHT ARM', second: isSecondArm });

            const snatchKF = [
              // 0: Setup & back-hike between knees (both arms aligned at bottom of hike)
              { hx: 70, hy: 118, spine: -0.58, ua: 2.10, fa: 2.15, fua: 2.10, ffa: 2.15, bellOff: 0 },
              // 1: Violent triple extension + vertical zip high-pull (elbow pulls HIGH above bell close to body!)
              { hx: 95, hy: 102, spine: -1.55, ua: -0.45, fa: 1.05, fua: 2.15, ffa: 2.35, bellOff: 0.15 },
              // 2: Fast punch-through into vertical overhead lockout
              { hx: 90, hy: 108, spine: -1.52, ua: -1.55, fa: -1.55, fua: 1.85, ffa: 2.05, bellOff: 0.35 },
              // 3: Hold tall vertical overhead lockout (bell settled on back of forearm)
              { hx: 94, hy: 104, spine: -1.55, ua: -1.55, fa: -1.55, fua: 1.75, ffa: 1.95, bellOff: 0.35 },
              // 4: Drop bell close to torso through rack back toward hike
              { hx: 84, hy: 112, spine: -1.18, ua: 1.25, fa: 0.35, fua: 1.95, ffa: 2.10, bellOff: 0.10 }
            ];
            const st = this.sampleKeyframes(snatchKF, repNorm);
            frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0.08);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(st.hx - 3, st.hy, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(st.hx, st.hy, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', st.hx - 3, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            if (!isSecondArm) {
              const workArm = this.solveFK(shoulderX, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
              const freeArm = this.solveFK(shoulderX - 2, shoulderY, st.fua, st.ffa, L_UPPER_ARM, L_FOREARM);
              addLimb('armB', 'arm', shoulderX - 2, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#64748b', '#475569', 5, 'hand');
              addLimb('armF', 'arm', shoulderX, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
              frame.props.push({
                type: 'kettlebell',
                x: workArm.ex + Math.cos(st.ua + st.bellOff) * 8.5,
                y: workArm.ey + Math.sin(st.ua + st.bellOff) * 8.5,
                r: 7.5
              });
            } else {
              const workArm = this.solveFK(shoulderX - 2, shoulderY, st.ua, st.fa, L_UPPER_ARM, L_FOREARM);
              const freeArm = this.solveFK(shoulderX, shoulderY, st.fua, st.ffa, L_UPPER_ARM, L_FOREARM);
              addLimb('armB', 'arm', shoulderX - 2, shoulderY, workArm.jx, workArm.jy, workArm.ex, workArm.ey, '#64748b', '#475569', 5.5, 'hand');
              frame.props.push({
                type: 'kettlebell',
                x: workArm.ex + Math.cos(st.ua + st.bellOff) * 8.5,
                y: workArm.ey + Math.sin(st.ua + st.bellOff) * 8.5,
                r: 7.5
              });
              addLimb('armF', 'arm', shoulderX, shoulderY, freeArm.jx, freeArm.jy, freeArm.ex, freeArm.ey, '#38bdf8', '#38bdf8', 5, 'hand');
            }
          } else {
            const hipX = this.lerp(68, 95, p);
            const hipY = this.lerp(116, 104, p);
            const spineAngle = this.lerp(-0.55, -1.55, p);
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.14 * (1 - p));
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(hipX - 3, hipY, ankleX - 3, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            addLimb('legB', 'leg', hipX - 3, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);

            if (poseType === 'kb_swing') {
              // Two-handed pendulum Kettlebell Swing floating to eye level (-0.82 rad)
              const swingAngle = this.lerp(2.05, -0.82, p);
              const arm = this.solveFK(shoulderX, shoulderY, swingAngle, swingAngle, L_UPPER_ARM, L_FOREARM);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
              frame.props.push({
                type: 'kettlebell',
                x: arm.ex + Math.cos(swingAngle) * 9,
                y: arm.ey + Math.sin(swingAngle) * 9,
                r: 7.5
              });
            } else if (poseType === 'kb_deadlift') {
              // Kettlebell Deadlift: straight arms holding kettlebell handle between feet
              const handX = this.lerp(96, 96, p);
              const handY = shoulderY + 47.5;
              const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
              frame.props.push({ type: 'kettlebell', x: arm.ex, y: arm.ey + 7.5, r: 7.5 });
            } else {
              // Barbell Deadlift
              const handX = this.lerp(100, 98, p);
              const handY = shoulderY + 47.5;
              const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);
              addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.4, 'hand');
              frame.props.push({ type: 'barbell_end', x: arm.ex, y: arm.ey, r: 9.5 });
            }
          }
          return frame;
        }

        // ===========================================================================
        // 13. ERGS: BIKEERG, ROWERG & SKIERG (SIDE VIEW)
        // ===========================================================================
        if (poseType === 'bike_erg' || poseType === 'row_erg' || poseType === 'ski_erg') {
          frame.floorY = 170;

          if (poseType === 'bike_erg') {
            const crankX = 96, crankY = 138;
            const wheelX = 148, wheelY = 138;
            const seatX = 62, seatY = 104;
            const barX = 130, barY = 78;
            frame.props.push({ type: 'bike_erg', crankX, crankY, wheelX, wheelY, seatX, seatY, barX, barY, theta });

            const hipX = seatX + 2, hipY = seatY - 4;
            const spineAngle = -0.82; // Exact 46px torso leaning forward to handlebars
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.22);
            const { shoulderX, shoulderY } = frame.torso;

            const pedal1X = crankX + Math.cos(theta * 2) * 15;
            const pedal1Y = crankY + Math.sin(theta * 2) * 15;
            const pedal2X = crankX + Math.cos(theta * 2 + Math.PI) * 15;
            const pedal2Y = crankY + Math.sin(theta * 2 + Math.PI) * 15;

            const legBack = this.solveIK(hipX, hipY, pedal2X, pedal2Y, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, pedal1X, pedal1Y, L_THIGH, L_SHIN, -1);
            const arm = this.solveIK(shoulderX, shoulderY, barX, barY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.2, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          } else if (poseType === 'row_erg') {
            // Authentic Rowing Stroke Sequencing:
            // 0: Catch (compressed knees, forward torso lean, straight arms reaching toward cage)
            // 1: Leg Drive (hips slide back while torso holds forward lean and arms stay straight)
            // 2: Finish (legs extended, slight layback, elbows row handle to lower ribs)
            // 3: Arms & Body Recovery (arms extend forward & torso rocks over before knees re-compress)
            const rowKF = [
              { hx: 98, spine: -1.22, wx: 136, wy: 114 },
              { hx: 68, spine: -1.42, wx: 112, wy: 114 },
              { hx: 52, spine: -1.84, wx: 58, wy: 112 },
              { hx: 76, spine: -1.32, wx: 116, wy: 114 }
            ];
            const st = this.sampleKeyframes(rowKF, normT);
            const ankleX = 112, ankleY = 148;
            const hipX = st.hx, hipY = 144;

            frame.torso = this.torsoFromHip(hipX, hipY, st.spine, 1, 0.12);
            const { shoulderX, shoulderY } = frame.torso;

            frame.props.push({ type: 'row_erg', handX: st.wx, handY: st.wy, hipX, hipY });

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            const arm = this.solveIK(shoulderX, shoulderY, st.wx, st.wy, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          } else {
            // SKIERG
            const ankleX = 88, ankleY = 166;
            const hipX = this.lerp(86, 70, p);
            const hipY = this.lerp(104, 120, p);
            const spineAngle = this.lerp(-1.50, -0.75, p);
            frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, 0.10);
            const { shoulderX, shoulderY } = frame.torso;

            const handX = this.lerp(116, 86, p);
            const handY = this.lerp(36, 134, p);
            frame.props.push({ type: 'ski_erg', handX, handY });

            const legBack = this.solveIK(hipX - 2, hipY, ankleX - 2, ankleY, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hipX, hipY, ankleX, ankleY, L_THIGH, L_SHIN, -1);
            const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          }
          return frame;
        }

        // ===========================================================================
        // 14. BURPEES, DEVIL PRESS, MAN MAKERS & ATHLETIC UP-DOWNS (NO PUSH-UP)
        //     Every keyframe uses (hx, hy, spine) so torso length is strictly 46.0px!
        // ===========================================================================
        if (
          poseType === 'burpee_6stage' ||
          poseType === 'devil_press' ||
          poseType === 'man_maker' ||
          poseType === 'athletic_up_down'
        ) {
          frame.floorY = 170;

          if (poseType === 'man_maker') {
            const mmPeriod = 6400;
            const mmNorm = ((timestamp % mmPeriod) + mmPeriod) % mmPeriod / mmPeriod;
            const mmKFs = [
              // 0: Stand tall holding DBs at hips (exact burpee KF 0)
              { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, bwx: 104, bwy: 98, fwx: 106, fwy: 98 },
              // 1: Deep Squat-Hinge & Plant DBs on Floor (exact burpee KF 1)
              { hx: 86, hy: 136, spine: -0.38, ax: 96, ay: 166, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 2: Sprawl Feet Back into High Plank (exact burpee KF 2)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 3: Chest to Deck Push-Up (exact burpee KF 3)
              { hx: 91, hy: 154, spine: -0.20, ax: 31, ay: 164, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 4: Press up to High Plank (exact burpee KF 4)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 5: Renegade Row 1 (Near arm rows DB to ribs, far arm holds plank)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 136, bwy: 164, fwx: 98, fwy: 126 },
              // 6: Lower Near DB to floor in plank
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 7: Renegade Row 2 (Far arm rows DB to ribs, near arm holds plank)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 98, bwy: 126, fwx: 136, fwy: 164 },
              // 8: Lower Far DB to floor in plank
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 9: Elastic Hip Pike & Snap: feet hop forward (exact burpee KF 5)
              { hx: 86, hy: 124, spine: -0.46, ax: 70, ay: 154, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 10: Feet Land Flat in Deep Squat outside DBs (exact burpee KF 6)
              { hx: 84, hy: 136, spine: -0.40, ax: 96, ay: 166, bwx: 136, bwy: 164, fwx: 136, fwy: 164 },
              // 11: DB Squat Clean Catch at shoulders (front rack)
              { hx: 72, hy: 139, spine: -1.24, ax: 96, ay: 166, bwx: 104, bwy: 74, fwx: 106, fwy: 74 },
              // 12: Explosive Thruster Drive to Overhead Lockout (exact devil press KF 7)
              { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, bwx: 104, bwy: 12, fwx: 106, fwy: 12 },
              // 13: Absorb / Swing DBs Forward-Down (exact burpee KF 8)
              { hx: 96, hy: 106, spine: -1.48, ax: 98, ay: 166, bwx: 122, bwy: 78, fwx: 124, fwy: 78 }
            ];
            const st = this.sampleKeyframes(mmKFs, mmNorm);
            frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
            const { shoulderX, shoulderY } = frame.torso;

            const legBack = this.solveIK(st.hx - 2, st.hy, st.ax - 3, st.ay, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(st.hx, st.hy, st.ax, st.ay, L_THIGH, L_SHIN, -1);
            const armBack = this.solveIK(shoulderX - 2, shoulderY, st.bwx, st.bwy, L_UPPER_ARM, L_FOREARM, 1);
            const armFront = this.solveIK(shoulderX, shoulderY, st.fwx, st.fwy, L_UPPER_ARM, L_FOREARM, 1);

            addLimb('armB', 'arm', shoulderX - 2, shoulderY, armBack.jx, armBack.jy, armBack.ex, armBack.ey, '#64748b', '#475569', 5, 'hand');
            frame.props.push({ type: 'dumbbell_far', x: armBack.ex, y: armBack.ey });
            addLimb('legB', 'leg', st.hx - 2, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
            addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
            addLimb('armF', 'arm', shoulderX, shoulderY, armFront.jx, armFront.jy, armFront.ex, armFront.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
            frame.props.push({ type: 'dumbbell_near', x: armFront.ex, y: armFront.ey });
            return frame;
          }

          const burpeePeriod = 3200;
          const bNorm = ((timestamp % burpeePeriod) + burpeePeriod) % burpeePeriod / burpeePeriod;
          const isDevilPress = poseType === 'devil_press';

          const KF = (poseType === 'burpee_6stage' || isDevilPress)
            ? [
              // 0: Stand Tall (or overhead DB lockout finish)
              { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, wx: 104, wy: 98 },
              // 1: Deep Squat-Hinge & Plant Hands Flat on Floor/DBs (shoulderY=119 so 49px arms physically reach wy=164!)
              { hx: 86, hy: 136, spine: -0.38, ax: 96, ay: 166, wx: 136, wy: 164 },
              // 2: Sprawl Feet Back into True Rigid High Plank (dist(hip,ankle)=62.6px < 64px so toes rest on floor!)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
              // 3: Chest & Thighs Touch Deck
              { hx: 91, hy: 156, spine: -0.18, ax: 31, ay: 164, wx: 136, wy: 164 },
              // 4: LEVER / PEEL CHEST UP
              { hx: 91, hy: 152, spine: -0.76, ax: 31, ay: 164, wx: 136, wy: 164 },
              // 5: ELASTIC HIP PIKE & SNAP (feet hop forward toward hands)
              { hx: 86, hy: 122, spine: -0.48, ax: 72, ay: 152, wx: 136, wy: 162 },
              // 6: Feet Land Flat Under Hips (Swing DBs / arms forward through power zone)
              { hx: 84, hy: 122, spine: -0.75, ax: 100, ay: 166, wx: 134, wy: isDevilPress ? 92 : 84 },
              // 7: Vertical Jump & Overhead Clap (or DB Snatch to Overhead Lockout!)
              { hx: 98, hy: isDevilPress ? 104 : 82, spine: -1.55, ax: 98, ay: isDevilPress ? 166 : 142, wx: 106, wy: isDevilPress ? 10 : 2 },
              // 8: Absorb Landing & Swing Arms Forward Down
              { hx: 96, hy: 106, spine: -1.48, ax: 98, ay: 166, wx: 122, wy: 78 }
            ]
            : [
              // ATHLETIC UP-DOWN:
              // 0: Stand Tall
              { hx: 96, hy: 104, spine: -1.55, ax: 98, ay: 166, wx: 104, wy: 98 },
              // 1: Deep Squat-Hinge & Plant Hands Flat on Floor at (136, 164) (shoulder=(128.7, 119.0), dist=45.6px < 49px!)
              { hx: 86, hy: 136, spine: -0.38, ax: 96, ay: 166, wx: 136, wy: 164 },
              // 2: Kick Feet Back into Rigid Straight-Arm High Plank (ankle=(35, 164) -> hip=(92, 138) -> shoulder=(134, 119.3))
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
              // 3: Hold Crisp High Plank Lockout (no push-up, zero hip sag)
              { hx: 92, hy: 138, spine: -0.42, ax: 35, ay: 164, wx: 136, wy: 164 },
              // 4: Elastic Hip-Pike Hop — Snap Feet Forward Under Hips while Hands Push Off Floor
              { hx: 86, hy: 128, spine: -0.45, ax: 94, ay: 164, wx: 136, wy: 162 },
              // 5: Stand Tall & Finish Rep
              { hx: 94, hy: 110, spine: -1.46, ax: 98, ay: 166, wx: 112, wy: 96 }
            ];

          const st = this.sampleKeyframes(KF, bNorm);
          frame.torso = this.torsoFromHip(st.hx, st.hy, st.spine, 1, 0);
          const { shoulderX, shoulderY } = frame.torso;

          const legBack = this.solveIK(st.hx - 2, st.hy, st.ax - 3, st.ay, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(st.hx, st.hy, st.ax, st.ay, L_THIGH, L_SHIN, -1);
          const arm = this.solveIK(shoulderX, shoulderY, st.wx, st.wy, L_UPPER_ARM, L_FOREARM, 1);

          addLimb('legB', 'leg', st.hx - 2, st.hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1);
          addLimb('legF', 'leg', st.hx, st.hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');

          if (isDevilPress) {
            frame.props.push({ type: 'dumbbell_near', x: arm.ex, y: arm.ey });
          }
          return frame;
        }

        // ===========================================================================
        // 15. MOUNTAIN CLIMBERS (SIDE VIEW - RIGID 46px SPINE & REAR FOOT ON FLOOR)
        // ===========================================================================
        if (poseType === 'mountain_climber') {
          frame.floorY = 170;
          const handX = 138, handY = 164;
          const hipX = 91, hipY = 134;
          const spineAngle = -0.38; // Solid high-plank spine -> shoulder at (133.7, 116.9)
          frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.08);
          const { shoulderX, shoulderY } = frame.torso;

          const climberPeriod = 1100;
          const p = ((timestamp % climberPeriod) + climberPeriod) % climberPeriod / climberPeriod;
          let leg1X, leg1Y, leg2X, leg2Y;
          const backX = 35, backY = 164;
          const frontX = 88, frontY = 146;

          if (p < 0.30) {
            leg1X = frontX; leg1Y = frontY;
            leg2X = backX; leg2Y = backY;
          } else if (p < 0.50) {
            const u = this.smoothstep((p - 0.30) / 0.20);
            leg1X = this.lerp(frontX, backX, u);
            leg1Y = this.lerp(frontY, backY, u);
            leg2X = this.lerp(backX, frontX, u);
            leg2Y = this.lerp(backY, frontY, u);
          } else if (p < 0.80) {
            leg1X = backX; leg1Y = backY;
            leg2X = frontX; leg2Y = frontY;
          } else {
            const u = this.smoothstep((p - 0.80) / 0.20);
            leg1X = this.lerp(backX, frontX, u);
            leg1Y = this.lerp(backY, frontY, u);
            leg2X = this.lerp(frontX, backX, u);
            leg2Y = this.lerp(frontY, backY, u);
          }

          const legBack = this.solveIK(hipX - 2, hipY, leg2X, leg2Y, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hipX, hipY, leg1X, leg1Y, L_THIGH, L_SHIN, -1);
          const arm = this.solveIK(shoulderX, shoulderY, handX, handY, L_UPPER_ARM, L_FOREARM, 1);

          addLimb('legB', 'leg', hipX - 2, hipY, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.5, 'foot', 1);
          addLimb('legF', 'leg', hipX, hipY, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.5, 'hand');
          return frame;
        }

        // ===========================================================================
        // 16. BOX JUMPS & BOX STEP-UPS (SIDE VIEW)
        // ===========================================================================
        if (poseType === 'box_jump' || poseType === 'box_step_up') {
          frame.floorY = 170;
          frame.props.push({ type: 'plyo_box', x: 118, y: 122, w: 52, h: 48 });

          if (poseType === 'box_step_up') {
            const stepPeriod = 3800;
            const norm = ((timestamp % stepPeriod) + stepPeriod) % stepPeriod / stepPeriod;
            const isRep2 = norm >= 0.50;
            const u = isRep2 ? (norm - 0.50) / 0.50 : norm / 0.50;

            let hx, hy, spine, bax, bay, fax, fay, ua, fa;
            if (u < 0.25) {
              // Phase 1: Step lead foot up onto box top (134, 118)
              const t = this.smoothstep(u / 0.25);
              hx = this.lerp(72, 80, t);
              hy = this.lerp(104, 106, t);
              spine = this.lerp(-1.52, -1.38, t);
              if (!isRep2) {
                bax = 70; bay = 166;
                fax = this.lerp(74, 134, t);
                fay = this.lerp(166, 118, t) - 16 * Math.sin(t * Math.PI);
              } else {
                fax = 74; fay = 166;
                bax = this.lerp(70, 134, t);
                bay = this.lerp(166, 118, t) - 16 * Math.sin(t * Math.PI);
              }
              ua = this.lerp(1.48, 1.25, t); fa = this.lerp(1.30, 0.95, t);
            } else if (u < 0.50) {
              // Phase 2: Drive up through heel to full standing lockout on box
              const t = this.smoothstep((u - 0.25) / 0.25);
              hx = this.lerp(80, 134, t);
              hy = this.lerp(106, 60, t);
              spine = this.lerp(-1.38, -1.55, t);
              if (!isRep2) {
                fax = 134; fay = 118;
                bax = this.lerp(70, 128, t);
                bay = this.lerp(166, 118, t) - 18 * Math.sin(t * Math.PI);
              } else {
                bax = 134; bay = 118;
                fax = this.lerp(74, 128, t);
                fay = this.lerp(166, 118, t) - 18 * Math.sin(t * Math.PI);
              }
              ua = this.lerp(1.25, 1.48, t); fa = this.lerp(0.95, 1.30, t);
            } else if (u < 0.75) {
              // Phase 3: Step trailing foot back down to floor
              const t = this.smoothstep((u - 0.50) / 0.25);
              hx = this.lerp(134, 80, t);
              hy = this.lerp(60, 106, t);
              spine = this.lerp(-1.55, -1.38, t);
              if (!isRep2) {
                fax = 134; fay = 118;
                bax = this.lerp(128, 70, t);
                bay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
              } else {
                bax = 134; bay = 118;
                fax = this.lerp(128, 74, t);
                fay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
              }
              ua = this.lerp(1.48, 1.25, t); fa = this.lerp(1.30, 0.95, t);
            } else {
              // Phase 4: Return lead foot to floor
              const t = this.smoothstep((u - 0.75) / 0.25);
              hx = this.lerp(80, 72, t);
              hy = this.lerp(106, 104, t);
              spine = this.lerp(-1.38, -1.52, t);
              if (!isRep2) {
                bax = 70; bay = 166;
                fax = this.lerp(134, 74, t);
                fay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
              } else {
                fax = 74; fay = 166;
                bax = this.lerp(134, 70, t);
                bay = this.lerp(118, 166, t) - 16 * Math.sin(t * Math.PI);
              }
              ua = this.lerp(1.25, 1.48, t); fa = this.lerp(0.95, 1.30, t);
            }

            frame.torso = this.torsoFromHip(hx, hy, spine, 1, 0.08);
            const { shoulderX, shoulderY } = frame.torso;

            const activeSurfaceYB = bax >= 116 ? 122 : 170;
            const activeSurfaceYF = fax >= 116 ? 122 : 170;
            const legBack = this.solveIK(hx - 2, hy, bax, bay, L_THIGH, L_SHIN, -1);
            const legFront = this.solveIK(hx, hy, fax, fay, L_THIGH, L_SHIN, -1);
            const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);

            addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, activeSurfaceYB);
            addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, activeSurfaceYF);
            addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
            return frame;
          }

          let hx, hy, spine, ax, ay, ua, fa;
          if (normT < 0.16) {
            // Phase 1: Countermovement Crouch & Arm Backswing on Floor
            const u = this.smoothstep(normT / 0.16);
            hx = this.lerp(72, 58, u);
            hy = this.lerp(106, 126, u);
            spine = this.lerp(-1.48, -1.08, u);
            ax = 74;
            ay = 166;
            ua = this.lerp(1.42, 1.95, u);
            fa = this.lerp(1.12, 1.65, u);
          } else if (normT < 0.28) {
            // Phase 2: Explosive Triple-Extension Push-Off on Floor!
            const u = this.smoothstep((normT - 0.16) / 0.12);
            hx = this.lerp(58, 78, u);
            hy = this.lerp(126, 103, u);
            spine = this.lerp(-1.08, -1.44, u);
            ax = 74;
            ay = this.lerp(166, 163, u);
            ua = this.lerp(1.95, -0.32, u);
            fa = this.lerp(1.65, -0.95, u);
          } else if (normT < 0.50) {
            // Phase 3: Continuous Ballistic Parabolic Flight Onto Box
            const u = (normT - 0.28) / 0.22;
            const su = this.smoothstep(u);
            const parabola = 4 * u * (1 - u);
            hx = this.lerp(78, 130, u);
            hy = this.lerp(103, 84, u) - 24 * parabola;
            spine = this.lerp(-1.44, -1.24, su);
            ax = this.lerp(74, 140, su);
            ay = this.lerp(163, 118, su) - 36 * parabola;
            ua = this.lerp(-0.32, 0.35, su);
            fa = this.lerp(-0.95, -0.45, su);
          } else if (normT < 0.68) {
            // Phase 4: Soft Catch on Box -> Stand Tall to Lockout on Box
            const u = this.smoothstep((normT - 0.50) / 0.18);
            hx = this.lerp(130, 140, u);
            hy = this.lerp(84, 60, u);
            spine = this.lerp(-1.24, -1.55, u);
            ax = 140;
            ay = 118;
            ua = this.lerp(0.35, 1.48, u);
            fa = this.lerp(-0.45, 1.32, u);
          } else if (normT < 0.74) {
            // Phase 5a: Countermovement dip on box to prepare for backward jump
            const u = this.smoothstep((normT - 0.68) / 0.06);
            hx = this.lerp(140, 138, u);
            hy = this.lerp(60, 68, u);
            spine = this.lerp(-1.55, -1.48, u);
            ax = this.lerp(140, 138, u);
            ay = 118;
            ua = this.lerp(1.48, 1.75, u);
            fa = this.lerp(1.32, 1.45, u);
          } else if (normT < 0.88) {
            // Phase 5b: Ballistic Jump Down off the box: pop UP & BACK off box edge into flight!
            const t = (normT - 0.74) / 0.14;
            hx = this.lerp(138, 74, t);
            hy = 125.7 * t * t - 77.7 * t + 68;
            ay = 125.7 * t * t - 77.7 * t + 118;
            ax = this.lerp(138, 74, t);
            spine = this.lerp(-1.48, -1.42, t);
            ua = this.lerp(1.75, 1.25, t);
            fa = this.lerp(1.45, 0.85, t);
          } else {
            // Phase 6: Absorb Floor Landing with deep knee flexion & reset
            const u = this.smoothstep((normT - 0.88) / 0.12);
            hx = this.lerp(74, 72, u);
            hy = this.lerp(106, 106, u) + 12 * Math.sin(u * Math.PI);
            spine = this.lerp(-1.42, -1.48, u);
            ax = 74;
            ay = 166;
            ua = this.lerp(1.25, 1.42, u);
            fa = this.lerp(0.85, 1.12, u);
          }

          frame.torso = this.torsoFromHip(hx, hy, spine, 1, 0.08);
          const { shoulderX, shoulderY } = frame.torso;

          // Surface under foot is box top (122) when over the box (x >= 116), else floor (170)
          const activeSurfaceY = ax >= 116 ? 122 : 170;
          const legBack = this.solveIK(hx - 2, hy, ax - 2, ay, L_THIGH, L_SHIN, -1);
          const legFront = this.solveIK(hx, hy, ax, ay, L_THIGH, L_SHIN, -1);
          const arm = this.solveFK(shoulderX, shoulderY, ua, fa, L_UPPER_ARM, L_FOREARM);

          addLimb('legB', 'leg', hx - 2, hy, legBack.jx, legBack.jy, legBack.ex, legBack.ey, '#64748b', '#475569', 5.4, 'foot', 1, activeSurfaceY);
          addLimb('legF', 'leg', hx, hy, legFront.jx, legFront.jy, legFront.ex, legFront.ey, '#bef264', '#94a3b8', 6, 'foot', 1, activeSurfaceY);
          addLimb('arm', 'arm', shoulderX, shoulderY, arm.jx, arm.jy, arm.ex, arm.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
          return frame;
        }

        // ===========================================================================
        // 17. SINGLE-UNDERS vs DOUBLE-UNDERS (FRONT VIEW) & SHUTTLE RUN (SIDE VIEW)
        // ===========================================================================
        if (poseType === 'single_unders' || poseType === 'double_unders' || poseType === 'jump_rope') {
          frame.view = 'front';
          frame.floorY = 170;
          const isDoubleUnder = poseType === 'double_unders';
          const jumpPhase = theta * 2;
          const ropePhase = isDoubleUnder ? theta * 4 : theta * 2;

          const jumpWave = Math.pow(Math.max(0, 0.5 + 0.5 * Math.cos(jumpPhase)), 0.75);
          const maxJumpPx = isDoubleUnder ? 24 : 15;
          const jumpHeight = jumpWave * maxJumpPx;

          const shoulderY = 58 - jumpHeight;
          const hipY = shoulderY + L_TORSO;
          const leftShoulderX = 86, rightShoulderX = 114;
          const leftHipX = 91, rightHipX = 109;

          frame.frontTorso = {
            leftShoulderX, rightShoulderX, shoulderY,
            leftHipX, rightHipX, hipY,
            headX: 100, headY: shoulderY - 14
          };

          // Tucked-elbow jump rope mechanics:
          // Upper arms hang down tucked close beside the ribs (jx ≈ 80 and 120) while forearms
          // angle outward (~50°) to the wrists/handles (ex ≈ 59 and 141) with small circular wrist orbits!
          const uaL = 1.82 + Math.cos(ropePhase) * 0.04;
          const faL = 2.66 + Math.sin(ropePhase) * 0.12;
          const uaR = Math.PI - uaL;
          const faR = Math.PI - faL;

          const armL = this.solveFK(leftShoulderX, shoulderY, uaL, faL, L_UPPER_ARM, L_FOREARM);
          const armR = this.solveFK(rightShoulderX, shoulderY, uaR, faR, L_UPPER_ARM, L_FOREARM);
          addLimb('armL', 'arm', leftShoulderX, shoulderY, armL.jx, armL.jy, armL.ex, armL.ey, '#38bdf8', '#38bdf8', 5, 'hand');
          addLimb('armR', 'arm', rightShoulderX, shoulderY, armR.jx, armR.jy, armR.ex, armR.ey, '#38bdf8', '#38bdf8', 5, 'hand');

          const footY = 166 - jumpHeight;
          const legL = this.solveFrontLeg(leftHipX, hipY, leftHipX, footY, true);
          const legR = this.solveFrontLeg(rightHipX, hipY, rightHipX, footY, false);
          addLimb('legL', 'leg', leftHipX, hipY, legL.jx, legL.jy, legL.ex, legL.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');
          addLimb('legR', 'leg', rightHipX, hipY, legR.jx, legR.jy, legR.ex, legR.ey, '#bef264', '#94a3b8', 5.5, 'foot_front');

          frame.props.push({
            type: 'jump_rope',
            isDoubleUnder,
            ropePhase,
            leftHandX: armL.ex,
            rightHandX: armR.ex,
            handY: armL.ey
          });
          return frame;
        }

        // Default / 'run': ATHLETIC RUNNING (SIDE VIEW) - POWERFUL CYCLOID STRIDE & HIGH FLIGHT
        frame.floorY = 170;
        const runPeriod = 800;
        const runNorm = ((timestamp % runPeriod) + runPeriod) % runPeriod / runPeriod;
        const phase = runNorm * Math.PI * 2;

        const bounce = Math.cos(phase * 2) * 3.5;
        const hipX = 92;
        const hipY = 104.5 - bounce;
        const spineAngle = -1.36; // 12-degree athletic running forward lean
        frame.torso = this.torsoFromHip(hipX, hipY, spineAngle, 1, -0.18);
        const { shoulderX, shoulderY } = frame.torso;

        frame.props.push({ type: 'run_track', timestamp });

        const runLegKFs = [
          { thigh: 0.58, shin: 2.10 }, // 0.00: High Knee Drive (exact reference match)
          { thigh: 1.05, shin: 1.48 }, // 0.17: Swing down toward strike
          { thigh: 1.32, shin: 1.85 }, // 0.33: Mid-stance cushion
          { thigh: 2.12, shin: 2.32 }, // 0.50: Push-off extension behind
          { thigh: 1.62, shin: 2.95 }, // 0.67: Heel recovery under glute
          { thigh: 1.00, shin: 2.50 }  // 0.83: Knee drive forward
        ];

        const runArmKFs = [
          { upper: 2.22, forearm: 0.70 },  // 0.00: Back arm pumping back/down
          { upper: 1.85, forearm: 0.40 },  // 0.17: Arm swinging forward
          { upper: 1.35, forearm: -0.10 }, // 0.33: Passing torso
          { upper: 0.82, forearm: -0.48 }, // 0.50: Front arm high punch at chest (exact reference match)
          { upper: 1.25, forearm: -0.15 }, // 0.67: Rebounding downward
          { upper: 1.80, forearm: 0.35 }   // 0.83: Swinging backward
        ];

        const lkF = this.sampleSpline(runLegKFs, runNorm);
        const lkB = this.sampleSpline(runLegKFs, runNorm + 0.5);

        const akF = this.sampleSpline(runArmKFs, runNorm);
        const akB = this.sampleSpline(runArmKFs, runNorm + 0.5);

        const legF = this.solveFK(hipX, hipY, lkF.thigh, lkF.shin, L_THIGH, L_SHIN);
        const legB = this.solveFK(hipX - 2, hipY, lkB.thigh, lkB.shin, L_THIGH, L_SHIN);

        const armF = this.solveFK(shoulderX, shoulderY, akF.upper, akF.forearm, L_UPPER_ARM, L_FOREARM);
        const armB = this.solveFK(shoulderX - 2, shoulderY, akB.upper, akB.forearm, L_UPPER_ARM, L_FOREARM);

        addLimb('armB', 'arm', shoulderX - 2, shoulderY, armB.jx, armB.jy, armB.ex, armB.ey, '#64748b', '#475569', 4.8, 'hand');
        addLimb('legB', 'leg', hipX - 2, hipY, legB.jx, legB.jy, legB.ex, legB.ey, '#64748b', '#475569', 5.5, 'foot', 1);
        addLimb('legF', 'leg', hipX, hipY, legF.jx, legF.jy, legF.ex, legF.ey, '#bef264', '#94a3b8', 6, 'foot', 1);
        addLimb('armF', 'arm', shoulderX, shoulderY, armF.jx, armF.jy, armF.ex, armF.ey, '#38bdf8', '#38bdf8', 5.2, 'hand');
        return frame;
      };

      // -------------------------------------------------------------------------
      // BIOMECHANICAL INVARIANT VALIDATOR
      // Samples every pose across its full (up to 2-rep) cycle and asserts:
      //  1. Rigid bone lengths (torso, neck, thigh, shin, upper arm, forearm)
      //  2. No body part penetrates the floor (or the plyo box)
      //  3. Frame-to-frame continuity (no IK branch flips / joint teleports)

function computePose(poseType, timestamp) {
  const context = (this && typeof this.lerp === 'function') ? this : KinematicMath;
  return _computePose.call(context, poseType, timestamp);
}
globalThis.computePose = computePose;
