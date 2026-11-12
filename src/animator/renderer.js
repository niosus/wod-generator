/**
 * Biomechanical 2D Canvas Renderer
 * Renders pure skeleton frame objects with multi-view perspective, shading & equipment props
 */
      const lerpAngle = (a, b, t) => {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
      };

      const drawLimb = (ctx, limb) => {
        const { x1, y1, jx, jy, x2, y2, color1, color2, width, endType, footDir, surfaceY } = limb;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color1;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(jx, jy);
        ctx.stroke();

        ctx.strokeStyle = color2;
        ctx.lineWidth = width - 0.5;
        ctx.beginPath();
        ctx.moveTo(jx, jy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = color1;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(jx, jy, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (endType === 'hand') {
          ctx.fillStyle = '#bef264';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x2, y2, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (endType === 'foot') {
          // Surface-aware foot: flat on whatever it stands on (floor, box top), smoothly
          // blending to perpendicular-to-shin when airborne (no 1-frame ankle snaps).
          const dir = footDir >= 0 ? 1 : -1;
          const shinAngle = Math.atan2(y2 - jy, x2 - jx);
          const flatAngle = dir > 0 ? 0 : Math.PI;
          const perpAngle = shinAngle - dir * Math.PI * 0.48;
          const airT = Math.max(0, Math.min(1, (surfaceY - 4 - y2) / 10));
          const soleAngle = lerpAngle(flatAngle, perpAngle, airT);
          ctx.strokeStyle = '#bef264';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(x2 - Math.cos(soleAngle) * 2.5, y2 - Math.sin(soleAngle) * 2.5);
          ctx.lineTo(x2 + Math.cos(soleAngle) * 10.5, y2 + Math.sin(soleAngle) * 10.5);
          ctx.stroke();
        } else if (endType === 'foot_front') {
          ctx.fillStyle = '#bef264';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(x2, y2 + 2, 4.2, 2.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      };

      const drawHead = (ctx, x, y, r = 9.5) => {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#bef264';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };

      const drawSideTorso = (ctx, t) => {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t.hipX, t.hipY);
        ctx.lineTo(t.shoulderX, t.shoulderY);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(t.hipX, t.hipY, 3.8, 0, Math.PI * 2);
        ctx.arc(t.shoulderX, t.shoulderY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        drawHead(ctx, t.headX, t.headY);

        // Gaze visor: the face is always on the anterior side of the body, i.e. the
        // spine direction rotated 90° clockwise when facing right, counter-clockwise when facing left.
        const nx = t.headX - t.shoulderX;
        const ny = t.headY - t.shoulderY;
        const nl = Math.hypot(nx, ny) || 1;
        const fd = t.facingDir !== undefined ? t.facingDir : 1;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(t.headX + fd * (-ny / nl) * 4.5, t.headY + fd * (nx / nl) * 4.5, 2, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawFrontTorso = (ctx, ft) => {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const syL = ft.leftShoulderY !== undefined ? ft.leftShoulderY : ft.shoulderY;
        const syR = ft.rightShoulderY !== undefined ? ft.rightShoulderY : ft.shoulderY;
        const hyR = ft.rightHipY !== undefined ? ft.rightHipY : ft.hipY;
        const hyL = ft.leftHipY !== undefined ? ft.leftHipY : ft.hipY;
        ctx.moveTo(ft.leftShoulderX, syL);
        ctx.lineTo(ft.rightShoulderX, syR);
        ctx.lineTo(ft.rightHipX, hyR);
        ctx.lineTo(ft.leftHipX, hyL);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        drawHead(ctx, ft.headX, ft.headY, 9.8);
      };

      const drawGymRing = (ctx, strapX, strapY, cx, cy, r) => {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(strapX, strapY);
        ctx.lineTo(cx, cy - r);
        ctx.stroke();
        const bx = strapX + (cx - strapX) * 0.45;
        const by = strapY + (cy - r - strapY) * 0.45;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bx - 2.5, by - 2, 5, 4);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      };

      const drawLoad = (ctx, x, y, r) => {
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };

      // behind=true: faded back half of the rope turn (drawn before the body)
      // behind=false: front half of the turn (only when rope is in front) + handles (always)
      const drawJumpRope = (ctx, pr, behind) => {
        const { isDoubleUnder, ropePhase, leftHandX, rightHandX, handY } = pr;
        const ropeInFront = Math.sin(ropePhase) >= 0;
        // Cubic bezier midpoint = 0.25*handY + 0.75*ctrlY -> sweep rope from overhead to under the feet
        const ctrlFor = (phase) => ((89.5 + Math.cos(phase) * 79.5) - 0.25 * handY) / 0.75;
        ctx.save();
        if (behind || ropeInFront) {
          ctx.strokeStyle = behind ? 'rgba(56, 189, 248, 0.40)' : (isDoubleUnder ? '#38bdf8' : '#bef264');
          ctx.lineWidth = behind ? 2.2 : 3.2;
          const ctrlY = ctrlFor(ropePhase);
          ctx.beginPath();
          ctx.moveTo(leftHandX, handY);
          ctx.bezierCurveTo(leftHandX - 16, ctrlY, rightHandX + 16, ctrlY, rightHandX, handY);
          ctx.stroke();
        }
        if (!behind) {
          if (isDoubleUnder && ropeInFront) {
            const trailCtrl = ctrlFor(ropePhase - 0.45);
            ctx.strokeStyle = 'rgba(190, 242, 100, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(leftHandX, handY);
            ctx.bezierCurveTo(leftHandX - 16, trailCtrl, rightHandX + 16, trailCtrl, rightHandX, handY);
            ctx.stroke();
          }
          // Rope handles
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(leftHandX, handY);
          ctx.lineTo(leftHandX - 5, handY + 2);
          ctx.moveTo(rightHandX, handY);
          ctx.lineTo(rightHandX + 5, handY + 2);
          ctx.stroke();
        }
        if (Math.cos(ropePhase) > 0.86) {
          ctx.strokeStyle = '#bef264';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(86, 169);
          ctx.lineTo(114, 169);
          ctx.stroke();
        }
        ctx.restore();
      };

      // Props drawn BEHIND the athlete (environment / equipment)
      const drawBackgroundProp = (ctx, pr, frame) => {
        switch (pr.type) {
          case 'overhead_beam':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(pr.x1, pr.y1);
            ctx.lineTo(pr.x2, pr.y2);
            ctx.stroke();
            break;
          case 'gym_ring':
            drawGymRing(ctx, pr.strapX, pr.strapY, pr.cx, pr.cy, pr.r);
            break;
          case 'rig_uprights': {
            const bottomY = pr.floorY || 184;
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(32, 10); ctx.lineTo(32, bottomY);
            ctx.moveTo(168, 10); ctx.lineTo(168, bottomY);
            ctx.stroke();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 5.5;
            ctx.beginPath();
            ctx.moveTo(26, pr.barY);
            ctx.lineTo(174, pr.barY);
            ctx.stroke();
            break;
          }
          case 'side_rig':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(pr.postX, 14);
            ctx.lineTo(pr.postX, pr.floorY);
            ctx.moveTo(pr.postX, pr.barY);
            ctx.lineTo(pr.barX, pr.barY);
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(pr.barX, pr.barY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'wall':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pr.x, pr.y1);
            ctx.lineTo(pr.x, pr.y2);
            ctx.stroke();
            break;
          case 'towel_pillar': {
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(pr.pillarX, 20);
            ctx.lineTo(pr.pillarX, frame.floorY);
            ctx.stroke();
            // Towel always ends exactly in the athlete's hand (uses the solved arm end)
            const arm = frame.limbs.find(l => l.name === 'arm');
            const hx = arm ? arm.x2 : pr.handX;
            const hy = arm ? arm.y2 : pr.handY;
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pr.pillarX, pr.anchorY);
            ctx.lineTo(hx, hy);
            ctx.stroke();
            break;
          }
          case 'sturdy_table':
            // Heavy tabletop
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.5;
            ctx.fillRect(pr.x1, pr.topY - 6, pr.x2 - pr.x1, 7);
            ctx.strokeRect(pr.x1, pr.topY - 6, pr.x2 - pr.x1, 7);
            // Thick table legs down to floor
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(pr.x1 + 6, pr.topY + 1);
            ctx.lineTo(pr.x1 + 6, pr.floorY);
            ctx.moveTo(pr.x2 - 6, pr.topY + 1);
            ctx.lineTo(pr.x2 - 6, pr.floorY);
            ctx.stroke();
            break;
          case 'low_barbell':
            // Squat rack upright
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pr.barX, pr.barY - 30);
            ctx.lineTo(pr.barX, pr.floorY);
            ctx.stroke();
            // J-cup hook
            ctx.fillStyle = '#64748b';
            ctx.fillRect(pr.barX - 4, pr.barY - 2, 8, 6);
            // Barbell shaft end & collar
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(pr.barX, pr.barY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            break;
          case 'plyo_box':
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
            ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
            break;
          case 'bike_erg': {
            // 1. Heavy horizontal base rail & front/rear stabilizer feet
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(38, 166);
            ctx.lineTo(168, 166);
            ctx.stroke();
            ctx.fillStyle = '#334155';
            ctx.fillRect(40, 164, 14, 6);
            ctx.fillRect(150, 164, 16, 6);
            // Front transport caster wheels
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(166, 167, 3, 0, Math.PI * 2);
            ctx.fill();

            // 2. Main structural frame triangle & chainstay (double-walled high-visibility tubing)
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 7;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            // Rear stabilizer up to bottom bracket
            ctx.moveTo(50, 166);
            ctx.lineTo(pr.crankX, pr.crankY);
            // Seat mast from bottom bracket to saddle
            ctx.moveTo(pr.crankX - 4, pr.crankY + 4);
            ctx.lineTo(pr.seatX, pr.seatY + 3);
            // Heavy down-tube from bottom bracket to handlebar mast & flywheel
            ctx.moveTo(pr.crankX, pr.crankY);
            ctx.lineTo(126, 110);
            ctx.lineTo(pr.barX - 2, pr.barY + 2);
            // Fork / strut from front mast to flywheel axle & front base
            ctx.moveTo(126, 110);
            ctx.lineTo(pr.wheelX, pr.wheelY);
            ctx.lineTo(154, 166);
            // Horizontal chainstay from bottom bracket to flywheel axle
            ctx.moveTo(pr.crankX, pr.crankY);
            ctx.lineTo(pr.wheelX, pr.wheelY);
            ctx.stroke();

            // Inner frame highlight for 3D tubing contrast
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pr.crankX - 4, pr.crankY + 4);
            ctx.lineTo(pr.seatX, pr.seatY + 3);
            ctx.moveTo(pr.crankX, pr.crankY);
            ctx.lineTo(126, 110);
            ctx.lineTo(pr.barX - 2, pr.barY + 2);
            ctx.moveTo(pr.crankX, pr.crankY);
            ctx.lineTo(pr.wheelX, pr.wheelY);
            ctx.stroke();

            // 3. Contoured saddle pad & seat slider rail
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(pr.seatX - 11, pr.seatY + 1);
            ctx.lineTo(pr.seatX + 10, pr.seatY + 1);
            ctx.stroke();

            // 4. Bullhorn handlebars & angled PM5 Performance Monitor
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pr.barX - 8, pr.barY + 2);
            ctx.lineTo(pr.barX + 7, pr.barY - 2);
            ctx.stroke();
            // PM5 Monitor stalk & backlit screen
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pr.barX + 2, pr.barY - 1);
            ctx.lineTo(pr.barX + 9, pr.barY - 14);
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.fillRect(pr.barX + 5, pr.barY - 22, 11, 10);
            ctx.strokeRect(pr.barX + 5, pr.barY - 22, 11, 10);

            // 5. Large Concept2 Flywheel Drum & Spinning Turbine Fan Blades
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(pr.wheelX, pr.wheelY, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pr.wheelX, pr.wheelY, 17, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = pr.theta * 4 + (k * Math.PI * 2) / 6;
              ctx.moveTo(pr.wheelX, pr.wheelY);
              ctx.lineTo(pr.wheelX + Math.cos(a) * 21, pr.wheelY + Math.sin(a) * 21);
            }
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(pr.wheelX, pr.wheelY, 4, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'row_erg':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(28, 152);
            ctx.lineTo(168, 152);
            ctx.moveTo(108, 152);
            ctx.lineTo(116, 140); // foot stretcher
            ctx.moveTo(pr.hipX - 9, 148);
            ctx.lineTo(pr.hipX + 9, 148); // sliding seat
            ctx.stroke();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(158, 122, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(154, 116);
            ctx.lineTo(pr.handX, pr.handY);
            ctx.stroke();
            break;
          case 'ski_erg':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(148, 18);
            ctx.lineTo(148, 170);
            ctx.stroke();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(146, 22);
            ctx.lineTo(pr.handX, pr.handY);
            ctx.stroke();
            break;
          case 'wall_ball_rig':
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pr.wallX, -48);
            ctx.lineTo(pr.wallX, 170);
            ctx.stroke();
            ctx.strokeStyle = pr.hit ? '#bef264' : '#f43f5e';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(pr.wallX - 3, pr.targetY - 7);
            ctx.lineTo(pr.wallX - 3, pr.targetY + 7);
            ctx.stroke();
            break;
          case 'run_track': {
            const trackOffset = (pr.timestamp * 0.22) % 40;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 2;
            for (let gx = 24; gx < 180; gx += 40) {
              const lx = 180 - ((gx + trackOffset) % 160);
              ctx.beginPath();
              ctx.moveTo(lx, 176);
              ctx.lineTo(lx - 14, 176);
              ctx.stroke();
            }
            break;
          }
          case 'shuttle_track': {
            const trackOffset = (pr.timestamp * 0.22) % 40;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 2;
            for (let gx = 24; gx < 180; gx += 40) {
              const lx = 180 - ((gx + trackOffset) % 160);
              ctx.beginPath();
              ctx.moveTo(lx, 176);
              ctx.lineTo(lx - 14, 176);
              ctx.stroke();
            }
            // Agility turnaround marker line & cone
            ctx.strokeStyle = '#bef264';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(135, 162);
            ctx.lineTo(135, 174);
            ctx.stroke();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(135, 161);
            ctx.lineTo(131, 169);
            ctx.lineTo(139, 169);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'parallettes': {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pr.x - 14, 149);
            ctx.lineTo(pr.x + 14, 149);
            ctx.moveTo(pr.x - 10, 149);
            ctx.lineTo(pr.x - 12, pr.floorY);
            ctx.moveTo(pr.x + 10, 149);
            ctx.lineTo(pr.x + 12, pr.floorY);
            ctx.stroke();
            break;
          }
          case 'jump_lines':
            ctx.strokeStyle = 'rgba(190, 242, 100, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(44, 148); ctx.lineTo(44, 164);
            ctx.moveTo(152, 148); ctx.lineTo(152, 164);
            ctx.stroke();
            break;
          case 'dumbbell_far':
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pr.x - 6, pr.y); ctx.lineTo(pr.x + 6, pr.y);
            ctx.stroke();
            ctx.fillStyle = '#b45309';
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.2;
            ctx.fillRect(pr.x - 9, pr.y - 4.5, 3.5, 9);
            ctx.strokeRect(pr.x - 9, pr.y - 4.5, 3.5, 9);
            ctx.fillRect(pr.x + 5.5, pr.y - 4.5, 3.5, 9);
            ctx.strokeRect(pr.x + 5.5, pr.y - 4.5, 3.5, 9);
            break;
          case 'jump_rope':
            if (Math.sin(pr.ropePhase) < 0) drawJumpRope(ctx, pr, true);
            break;
        }
      };

      // Props drawn IN FRONT of the athlete (held loads, HUD, effects)
      const drawForegroundProp = (ctx, pr) => {
        switch (pr.type) {
          case 'kettlebell':
            // Round iron bell with flat base
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Distinct kettlebell handle horn loop at top
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(pr.x, pr.y - pr.r * 0.72, pr.r * 0.62, Math.PI, 0, false);
            ctx.stroke();
            break;
          case 'barbell_end':
            drawLoad(ctx, pr.x, pr.y, pr.r);
            break;
          case 'dumbbell_near':
            // Center chrome handle grip
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(pr.x - 7, pr.y); ctx.lineTo(pr.x + 7, pr.y);
            ctx.stroke();
            // Dual hex weight heads
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.4;
            ctx.fillRect(pr.x - 10, pr.y - 5, 4, 10);
            ctx.strokeRect(pr.x - 10, pr.y - 5, 4, 10);
            ctx.fillRect(pr.x + 6, pr.y - 5, 4, 10);
            ctx.strokeRect(pr.x + 6, pr.y - 5, 4, 10);
            break;
          case 'wall_ball_rig':
            // CrossFit 14/20lb medicine ball with center seam
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(pr.ballX, pr.ballY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(pr.ballX - 6, pr.ballY);
            ctx.lineTo(pr.ballX + 6, pr.ballY);
            ctx.stroke();
            break;
          case 'bike_erg': {
            // Foreground bottom bracket chainring & rotating near-side pedal crank arm
            const p1X = pr.crankX + Math.cos(pr.theta * 2) * 15;
            const p1Y = pr.crankY + Math.sin(pr.theta * 2) * 15;
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(pr.crankX, pr.crankY, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pr.crankX, pr.crankY);
            ctx.lineTo(p1X, p1Y);
            ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(pr.crankX, pr.crankY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'strike_ring':
            ctx.strokeStyle = '#bef264';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'jump_rope':
            drawJumpRope(ctx, pr, false);
            break;
          case 'hud_badge': {
            ctx.font = 'bold 10px JetBrains Mono, monospace';
            const w = ctx.measureText(pr.text).width + 10;
            ctx.fillStyle = pr.second ? 'rgba(56, 189, 248, 0.18)' : 'rgba(190, 242, 100, 0.18)';
            ctx.fillRect(14, 14, w, 18);
            ctx.fillStyle = pr.second ? '#38bdf8' : '#bef264';
            ctx.fillText(pr.text, 19, 26);
            break;
          }
        }
      };

      const drawFloor = (ctx, y) => {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(184, y);
        ctx.stroke();
      };

      function renderFrame(ctx, frame) {
        if (frame.scale && frame.scale !== 1) {
          ctx.save();
          const ox = frame.originX ?? 100;
          const oy = frame.originY ?? frame.floorY;
          ctx.translate(ox, oy);
          ctx.scale(frame.scale, frame.scale);
          ctx.translate(-ox, -oy);
        }
        drawFloor(ctx, frame.floorY);
        for (const pr of frame.props) drawBackgroundProp(ctx, pr, frame);

        if (frame.view === 'front') {
          drawFrontTorso(ctx, frame.frontTorso);
          for (const limb of frame.limbs) drawLimb(ctx, limb);
        } else {
          // Depth ordering: far-side limbs -> torso & head -> near-side limbs
          const isFar = (l) => l.name.endsWith('B');
          for (const limb of frame.limbs) if (isFar(limb)) drawLimb(ctx, limb);
          drawSideTorso(ctx, frame.torso);
          for (const limb of frame.limbs) if (!isFar(limb)) drawLimb(ctx, limb);
        }

        for (const pr of frame.props) drawForegroundProp(ctx, pr);
        if (frame.scale && frame.scale !== 1) {
          ctx.restore();
        }
      };

      // -------------------------------------------------------------------------

globalThis.renderFrame = renderFrame;
