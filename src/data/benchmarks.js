/**
 * Classical CrossFit Benchmarks & Hero WODs
 */
const CLASSICAL_BENCHMARKS = [
      {
        id: 'cindy',
        title: 'CINDY',
        category: 'CrossFit Benchmark Girl',
        format: 'AMRAP',
        durationCategory: 'medium',
        minutes: 20,
        prescriptionHeader: 'AMRAP in 20 Minutes:',
        items: [
          { movementId: 'pullups', reps: 5, label: '5 Pull-Ups' },
          { movementId: 'pushups', reps: 10, label: '10 Push-Ups' },
          { movementId: 'air_squats', reps: 15, label: '15 Air Squats' }
        ],
        stimulus: 'Classic gymnastics volume test. Aim for 15–24+ rounds by maintaining fast transitions and breaking push-ups early.',
        logic: 'Non-overlapping Upper Pull + Upper Push + Lower Squat triplet allows continuous cycling for 20 minutes.'
      },
      {
        id: 'chelsea',
        title: 'CHELSEA',
        category: 'CrossFit Benchmark Girl',
        format: 'EMOM',
        durationCategory: 'long',
        minutes: 30,
        prescriptionHeader: 'Every Minute on the Minute for 30 Minutes:',
        items: [
          { movementId: 'pullups', reps: 5, label: '5 Pull-Ups (All inside each minute)' },
          { movementId: 'pushups', reps: 10, label: '10 Push-Ups' },
          { movementId: 'air_squats', reps: 15, label: '15 Air Squats' }
        ],
        stimulus: 'Finish each round of 5-10-15 in ~40 seconds to earn 20 seconds of recovery before the next minute beeps.',
        logic: 'Structured density pacing of the classic Pull + Push + Squat triplet.'
      },
      {
        id: 'mary',
        title: 'MARY (HIGH-SKILL GIRL)',
        category: 'High-Skill Gymnastics Girl',
        format: 'AMRAP',
        durationCategory: 'medium',
        minutes: 20,
        prescriptionHeader: 'AMRAP in 20 Minutes:',
        items: [
          { movementId: 'hspu', reps: 5, label: '5 Handstand Push-Ups' },
          { movementId: 'pistol_squats', reps: 10, label: '10 Alternating Pistol Squats' },
          { movementId: 'pullups', reps: 15, label: '15 Pull-Ups' }
        ],
        stimulus: 'The high-skill counterpart to Cindy. Smooth inversions and balance on single-leg squats keep heart rate controlled.',
        logic: 'Inverted Vertical Press + Single-Leg Squat + Vertical Pull.'
      },
      {
        id: 'nate',
        title: 'NATE (HERO HIGH-SKILL)',
        category: 'Hero Benchmark',
        format: 'AMRAP',
        durationCategory: 'medium',
        minutes: 20,
        prescriptionHeader: 'AMRAP in 20 Minutes:',
        items: [
          { movementId: 'bar_muscle_up', reps: 2, label: '2 Muscle-Ups' },
          { movementId: 'hspu', reps: 4, label: '4 Handstand Push-Ups' },
          { movementId: 'kb_swings', reps: 8, label: '8 Kettlebell Swings (32/24 kg)' }
        ],
        stimulus: 'Upper-body gymnastics power paired with heavy posterior-chain hip extension.',
        logic: 'Dynamic Pull/Dip Transition + Inverted Press + Explosive Hip Hinge.'
      },
      {
        id: 'annie',
        title: 'ANNIE',
        category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
        durationCategory: 'short',
        minutes: 10,
        prescriptionHeader: '50 - 40 - 30 - 20 - 10 Reps For Time (10 Min Cap):',
        items: [
          { movementId: 'double_unders', reps: '50-40-30-20-10', label: 'Double-Unders' },
          { movementId: 'situps', reps: '50-40-30-20-10', label: 'AbMat Sit-Ups' }
        ],
        stimulus: 'Fast, breathless core & coordination sprint. Keep your jump rope neat on the floor for instant transitions.',
        logic: 'Monostructural Cardio paired with Anterior Core flexion.'
      },
      {
        id: 'fran',
        title: 'FRAN',
        category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
        durationCategory: 'short',
        minutes: 8,
        prescriptionHeader: '21 - 15 - 9 Reps For Time (8 Min Cap):',
        items: [
          { movementId: 'bb_thrusters', reps: '21-15-9', label: 'Barbell Thrusters (43/30 kg)' },
          { movementId: 'pullups', reps: '21-15-9', label: 'Pull-Ups' }
        ],
        stimulus: 'The ultimate anaerobic sprint. Choose weights/variations that allow you to complete the round of 21 in at most 2 sets.',
        logic: 'Full-Body Squat-to-Press paired with Upper-Body Vertical Pull.'
      },
      {
        id: 'helen',
        title: 'HELEN',
        category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
        durationCategory: 'medium',
        minutes: 14,
        prescriptionHeader: '3 Rounds For Time (14 Min Cap):',
        items: [
          { movementId: 'shuttle_run', reps: 400, label: '400m Run' },
          { movementId: 'kb_swings', reps: 21, label: '21 Kettlebell Swings (24/16 kg)' },
          { movementId: 'pullups', reps: 12, label: '12 Pull-Ups' }
        ],
        stimulus: 'Push the run pace hard and fight to do the 21 kettlebell swings unbroken.',
        logic: 'Gold-standard triplet: Monostructural Run + Posterior Chain Hinge + Vertical Gymnastics Pull.'
      },
      {
        id: 'hyrox_erg_sim',
        title: 'HYROX ENGINE BUILDER',
        category: 'Hyrox Conditioning',
        format: 'FOR_TIME',
        durationCategory: 'long',
        minutes: 28,
        prescriptionHeader: '4 Rounds For Time (28 Min Cap):',
        items: [
          { movementId: 'bike_erg_cal', reps: 20, label: '20 Cal BikeErg / RowErg' },
          { movementId: 'burpees', reps: 15, label: '15 Burpees' },
          { movementId: 'walking_lunges', reps: 30, label: '30 Alternating Stepping Lunges' },
          { movementId: 'wall_balls', reps: 25, label: '25 Wall Ball Shots' }
        ],
        stimulus: 'Sustained Zone 4 threshold engine workout. Zero bottlenecks—just keep moving at a steady cadence.',
        logic: 'Alternates Monostructural Erg output with full-body sprawl, unilateral lower body, and squat-to-target.'
      },
      {
        id: 'erg_bw_crusher',
        title: 'HOME GARAGE CRUSHER',
        category: 'Minimal Gear Signature',
        format: 'EMOM',
        durationCategory: 'medium',
        minutes: 16,
        prescriptionHeader: '16 Minute EMOM (4 Rounds of 4 Stations):',
        items: [
          { movementId: 'bike_erg_cal', reps: 15, label: 'Min 1: 15/12 Cal BikeErg' },
          { movementId: 'pullups', reps: 10, label: 'Min 2: 10 Pull-Ups (or Ring Rows)' },
          { movementId: 'burpees', reps: 12, label: 'Min 3: 12 Burpees' },
          { movementId: 'air_squats', reps: 22, label: 'Min 4: 22 Air Squats' }
        ],
        stimulus: 'Work for 40–45 seconds each minute, breathe for 15–20 seconds, and transition cleanly.',
        logic: 'Four-station rotation hitting Cardio, Pull, Full-Body Plyo, and Squat with zero muscle group overlap.'
      },
      {
        id: 'dt_benchmark',
        title: 'DT',
        category: 'Hero Barbell Benchmark',
        format: 'FOR_TIME',
        durationCategory: 'short',
        minutes: 12,
        prescriptionHeader: '5 Rounds For Time (70/47.5 kg Barbell):',
        items: [
          { movementId: 'bb_deadlifts', reps: 12, label: '12 Barbell Deadlifts' },
          { movementId: 'bb_hang_power_clean', reps: 9, label: '9 Hang Power Cleans' },
          { movementId: 'bb_push_jerk', reps: 6, label: '6 Push Jerks' }
        ],
        stimulus: 'Grip and barbell cycling test. Strategically break on Deadlifts (11+1) and Hang Power Cleans (8+1) so you can go unbroken into Push Jerks.',
        logic: 'Complex progression from Hinge to Explosive Pull to Overhead Drive.'
      },
      {
        id: 'kb_hell',
        title: 'RUSSIAN ENGINE',
        category: 'Kettlebell & Bodyweight',
        format: 'AMRAP',
        durationCategory: 'medium',
        minutes: 15,
        prescriptionHeader: 'AMRAP in 15 Minutes:',
        items: [
          { movementId: 'kb_swings', reps: 15, label: '15 Kettlebell Swings (24/16 kg)' },
          { movementId: 'goblet_squats', reps: 12, label: '12 Kettlebell Goblet Squats' },
          { movementId: 'pushups', reps: 12, label: '12 Push-Ups' }
        ],
        stimulus: 'Posterior chain + anterior leg + upper press triplet with a single kettlebell.',
        logic: 'Hinge + Squat + Push keeps heart rate elevated while rotating primary prime movers.'
      }
    ];
;

globalThis.CLASSICAL_BENCHMARKS = CLASSICAL_BENCHMARKS;
