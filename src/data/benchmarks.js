/**
 * Complete Classical CrossFit Benchmarks & Hero WODs Collection
 * Includes all classic "Girls", "Hero WODs", and signature conditioning tests.
 */
const CLASSICAL_BENCHMARKS = [
// ==========================================
// THE GIRLS BENCHMARKS
// ==========================================
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
                  stimulus: 'Classic gymnastics volume test. Aim for 18–25+ rounds by maintaining fast transitions and breaking push-ups early.',
                    logic: 'Upper Pull + Upper Push + Lower Squat non-overlapping triplet allows continuous cycling for 20 minutes.'
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
                  { movementId: 'pullups', reps: 5, label: '5 Pull-Ups (Inside each minute)' },
                  { movementId: 'pushups', reps: 10, label: '10 Push-Ups' },
                  { movementId: 'air_squats', reps: 15, label: '15 Air Squats' }
                ],
                  stimulus: 'Finish each round of 5-10-15 in ~40 seconds to earn 20 seconds of recovery before the next minute beeps.',
                    logic: 'Structured density pacing of the classic Pull + Push + Squat triplet.'
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
                  stimulus: 'The quintessential anaerobic sprint. Choose weights/variations that allow you to complete the round of 21 in at most 2 sets.',
                    logic: 'Full-Body Squat-to-Press paired with Upper-Body Vertical Pull.'
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
                    logic: 'Monostructural Jump Rope Cardio paired with Midline Core flexion.'
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
                  { movementId: 'run', reps: 400, label: '400m Run' },
                  { movementId: 'kb_swings', reps: 21, label: '21 Kettlebell Swings (24/16 kg)' },
                  { movementId: 'pullups', reps: 12, label: '12 Pull-Ups' }
                ],
                  stimulus: 'Push the run pace hard and fight to do the 21 kettlebell swings unbroken.',
                    logic: 'Gold-standard triplet: Monostructural Run + Posterior Chain Hinge + Vertical Gymnastics Pull.'
},
{
  id: 'mary',
    title: 'MARY',
      category: 'CrossFit Benchmark Girl',
        format: 'AMRAP',
          durationCategory: 'medium',
            minutes: 20,
              prescriptionHeader: 'AMRAP in 20 Minutes:',
                items: [
                  { movementId: 'hspu', reps: 5, label: '5 Handstand Push-Ups' },
                  { movementId: 'pistol_squats', reps: 10, label: '10 Alternating Pistol Squats' },
                  { movementId: 'pullups', reps: 15, label: '15 Pull-Ups' }
                ],
                  stimulus: 'High-skill gymnastics counterpart to Cindy. Smooth inversions and single-leg balance keep heart rate controlled.',
                    logic: 'Inverted Vertical Press + Single-Leg Squat + Vertical Pull.'
},
{
  id: 'angie',
    title: 'ANGIE',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 25,
              prescriptionHeader: 'For Time (25 Min Cap): Complete All Reps of Each Before Moving to the Next:',
                items: [
                  { movementId: 'pullups', reps: 100, label: '100 Pull-Ups' },
                  { movementId: 'pushups', reps: 100, label: '100 Push-Ups' },
                  { movementId: 'situps', reps: 100, label: '100 AbMat Sit-Ups' },
                  { movementId: 'air_squats', reps: 100, label: '100 Air Squats' }
                ],
                  stimulus: 'Pure calisthenics chipper. Manage rep sets from the start (e.g. sets of 5-10 with quick 5-second breaks) to avoid early failure.',
                    logic: 'Sequential 100-rep blocks: Vertical Pull → Horizontal Push → Midline Core → Bilateral Squat.'
},
{
  id: 'barbara',
    title: 'BARBARA',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 30,
              prescriptionHeader: '5 Rounds For Time (Rest Exactly 3 Minutes Between Rounds):',
                items: [
                  { movementId: 'pullups', reps: 20, label: '20 Pull-Ups' },
                  { movementId: 'pushups', reps: 30, label: '30 Push-Ups' },
                  { movementId: 'situps', reps: 40, label: '40 AbMat Sit-Ups' },
                  { movementId: 'air_squats', reps: 50, label: '50 Air Squats' }
                ],
                  stimulus: 'Sprint each round at near-maximal effort knowing you have a full 3-minute recovery window before the next round.',
                    logic: 'High-volume calisthenics intervals with built-in phosphagen/glycolytic recovery periods.'
},
{
  id: 'diane',
    title: 'DIANE',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 9,
              prescriptionHeader: '21 - 15 - 9 Reps For Time (9 Min Cap):',
                items: [
                  { movementId: 'bb_deadlifts', reps: '21-15-9', label: 'Barbell Deadlifts (100/70 kg)' },
                  { movementId: 'hspu', reps: '21-15-9', label: 'Handstand Push-Ups' }
                ],
                  stimulus: 'Heavy posterior-chain hinge paired with upper-body inverted pushing. Keep deadlifts unbroken or in 2 crisp sets.',
                    logic: 'Heavy Posterior Chain Pull/Hinge directly counterbalanced by Inverted Upper Press.'
},
{
  id: 'elizabeth',
    title: 'ELIZABETH',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 10,
              prescriptionHeader: '21 - 15 - 9 Reps For Time (10 Min Cap):',
                items: [
                  { movementId: 'bb_hang_power_clean', reps: '21-15-9', label: 'Barbell Cleans (60/42.5 kg)' },
                  { movementId: 'ring_dips', reps: '21-15-9', label: 'Ring / Parallel Bar Dips' }
                ],
                  stimulus: 'Olympic lifting power paired with gymnastics shoulder stability. Fight to keep dips in manageable chunks.',
                    logic: 'Dynamic Clean Pull + Deep Gymnastic Dip.'
},
{
  id: 'grace',
    title: 'GRACE',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 6,
              prescriptionHeader: '30 Clean and Jerks For Time (60/42.5 kg Barbell):',
                items: [
                  { movementId: 'bb_push_jerk', reps: 30, label: '30 Clean & Jerks (60/42.5 kg)' }
                ],
                  stimulus: 'One of the fastest benchmark sprint tests in CrossFit. Cycle fast singles or quick touch-and-go doubles.',
                    logic: 'Maximal ground-to-overhead power output and aerobic-anaerobic threshold capacity.'
},
{
  id: 'isabel',
    title: 'ISABEL',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 6,
              prescriptionHeader: '30 Snatches For Time (60/42.5 kg Barbell):',
                items: [
                  { movementId: 'bb_squat_snatch', reps: 30, label: '30 Power / Squat Snatches (60/42.5 kg)' }
                ],
                  stimulus: 'Rapid Olympic ground-to-overhead cycling. Maintain crisp hip extension on every single rep.',
                    logic: 'Single-movement speed-endurance test under Olympic weightlifting barbell load.'
},
{
  id: 'jackie',
    title: 'JACKIE',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 12,
              prescriptionHeader: 'For Time (12 Min Cap):',
                items: [
                  { movementId: 'row_erg_cal', reps: 50, label: '1,000m Row (or 50 Cal Erg)' },
                  { movementId: 'bb_thrusters', reps: 50, label: '50 Empty Bar Thrusters (20/15 kg)' },
                  { movementId: 'pullups', reps: 30, label: '30 Pull-Ups' }
                ],
                  stimulus: 'Row at 85% pace, hit the 50 thrusters unbroken or in 2 large sets, and hang on through the pull-ups.',
                    logic: 'Monostructural Erg → High-Volume Unloaded Thruster → Gymnastics Upper Pull.'
},
{
  id: 'karen',
    title: 'KAREN',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 12,
              prescriptionHeader: '150 Wall Ball Shots For Time (9/6 kg to 10/9 ft):',
                items: [
                  { movementId: 'wall_balls', reps: 150, label: '150 Wall Ball Shots (9/6 kg)' }
                ],
                  stimulus: 'Metabolic mental toughness test. Plan a rep cadence like 30-25-25-20-20-15-15 with strict 5-second breathers.',
                    logic: 'Sustained full-body squat-to-target power cycle taxing quads and shoulder endurance.'
},
{
  id: 'kelly',
    title: 'KELLY',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 26,
              prescriptionHeader: '5 Rounds For Time (26 Min Cap):',
                items: [
                  { movementId: 'run', reps: 400, label: '400m Run' },
                  { movementId: 'box_jumps', reps: 30, label: '30 Box Jumps (24/20 in)' },
                  { movementId: 'wall_balls', reps: 30, label: '30 Wall Ball Shots (9/6 kg)' }
                ],
                  stimulus: 'Cardiovascular grind. Settle into a rhythm on the run and move steadily through the box jumps and wall balls.',
                    logic: 'Monostructural Run + Plyometric Box Rebound + Squat-to-Target Thruster.'
},
{
  id: 'eva',
    title: 'EVA',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 30,
              prescriptionHeader: '5 Rounds For Time (30 Min Cap):',
                items: [
                  { movementId: 'run', reps: 800, label: '800m Run' },
                  { movementId: 'kb_swings', reps: 30, label: '30 Heavy Kettlebell Swings (32/24 kg)' },
                  { movementId: 'pullups', reps: 30, label: '30 Pull-Ups' }
                ],
                  stimulus: 'Heavy kettlebell swings test your grip before facing 30 pull-ups per round across 5 grueling rounds.',
                    logic: 'High-volume endurance: 4km total running + 150 heavy hip hinges + 150 vertical pull-ups.'
},
{
  id: 'nancy',
    title: 'NANCY',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'medium',
            minutes: 16,
              prescriptionHeader: '5 Rounds For Time (16 Min Cap):',
                items: [
                  { movementId: 'run', reps: 400, label: '400m Run' },
                  { movementId: 'bb_front_squats', reps: 15, label: '15 Overhead / Front Squats (43/30 kg)' }
                ],
                  stimulus: 'Breathing heavy from the run while stabilizing a barbell overhead or in the front rack.',
                    logic: 'Monostructural Run paired with Core & Thoracic Squat Stabilization.'
},
{
  id: 'amanda',
    title: 'AMANDA',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 10,
              prescriptionHeader: '9 - 7 - 5 Reps For Time (10 Min Cap):',
                items: [
                  { movementId: 'ring_muscle_up', reps: '9-7-5', label: 'Ring Muscle-Ups' },
                  { movementId: 'bb_squat_snatch', reps: '9-7-5', label: 'Barbell Squat Snatches (60/42.5 kg)' }
                ],
                  stimulus: 'High-skill gymnastics coupled with technical Olympic snatching. Keep snatches as crisp, confident singles.',
                    logic: 'Elite Gymnastic Pull/Dip transition paired with full-depth Olympic Barbell Snatch.'
},
{
  id: 'nicole',
    title: 'NICOLE',
      category: 'CrossFit Benchmark Girl',
        format: 'AMRAP',
          durationCategory: 'medium',
            minutes: 20,
              prescriptionHeader: 'AMRAP in 20 Minutes (Score is Total Pull-Ups):',
                items: [
                  { movementId: 'run', reps: 400, label: '400m Run' },
                  { movementId: 'pullups', reps: 15, label: '15 Unbroken Pull-Ups (Max Rep Set)' }
                ],
                  stimulus: 'Run hard, jump straight onto the bar, and hold on for maximum pull-ups before resting.',
                    logic: 'Monostructural aerobic work immediately followed by upper-body grip and lat endurance.'
},
{
  id: 'grettel',
    title: 'GRETTEL',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 8,
              prescriptionHeader: '10 Rounds For Time (8 Min Cap):',
                items: [
                  { movementId: 'bb_push_jerk', reps: 3, label: '3 Clean and Jerks (60/42.5 kg)' },
                  { movementId: 'burpees', reps: 3, label: '3 Bar-Facing Burpees' }
                ],
                  stimulus: 'Fast anaerobic sprint. Move smoothly between the barbell and deck without taking pauses.',
                    logic: '10 rapid 3+3 micro-rounds alternating Ground-to-Overhead and Chest-to-Deck sprawl.'
},
{
  id: 'ingrid',
    title: 'INGRID',
      category: 'CrossFit Benchmark Girl',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 8,
              prescriptionHeader: '10 Rounds For Time (8 Min Cap):',
                items: [
                  { movementId: 'bb_squat_snatch', reps: 3, label: '3 Barbell Snatches (60/42.5 kg)' },
                  { movementId: 'burpees', reps: 3, label: '3 Bar-Facing Burpees' }
                ],
                  stimulus: 'Fast, sharp Olympic snatch couplet. Keep breathing relaxed through the burpees.',
                    logic: 'Micro-interval speed power test combining Olympic Snatches and explosive Burpees.'
},

// ==========================================
// HERO BENCHMARKS
// ==========================================
{
  id: 'murph',
    title: 'MURPH',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 45,
              prescriptionHeader: 'For Time (Partition Pull-Ups, Push-Ups & Squats as 20 Rounds of 5-10-15):',
                items: [
                  { movementId: 'run', reps: 1600, label: '1-Mile Run (1,600m)' },
                  { movementId: 'pullups', reps: 100, label: '100 Pull-Ups' },
                  { movementId: 'pushups', reps: 200, label: '200 Push-Ups' },
                  { movementId: 'air_squats', reps: 300, label: '300 Air Squats' },
                  { movementId: 'run', reps: 1600, label: '1-Mile Run (1,600m)' }
                ],
                  stimulus: 'Honoring Lt. Michael Murphy. Pace the first mile at 75%, partition the calisthenics into 20 rounds of Cindy, and empty the tank on the final mile.',
                    logic: 'Iconic endurance test: 3.2km running bookending 600 total bodyweight gymnastics repetitions.'
},
{
  id: 'nate',
    title: 'NATE',
      category: 'Hero Benchmark',
        format: 'AMRAP',
          durationCategory: 'medium',
            minutes: 20,
              prescriptionHeader: 'AMRAP in 20 Minutes:',
                items: [
                  { movementId: 'bar_muscle_up', reps: 2, label: '2 Muscle-Ups' },
                  { movementId: 'hspu', reps: 4, label: '4 Handstand Push-Ups' },
                  { movementId: 'kb_swings', reps: 8, label: '8 Heavy Kettlebell Swings (32/24 kg)' }
                ],
                  stimulus: 'Honoring Chief Petty Officer Nate Hardy. Keep muscle-ups clean, stay tight on HSPU, and snap hips powerfully on the swings.',
                    logic: 'High-skill gymnastics power (Pull + Dip) paired with Inverted Pressing and Heavy Posterior Chain Hinge.'
},
{
  id: 'dt',
    title: 'DT',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'short',
            minutes: 12,
              prescriptionHeader: '5 Rounds For Time (70/47.5 kg Barbell):',
                items: [
                  { movementId: 'bb_deadlifts', reps: 12, label: '12 Barbell Deadlifts' },
                  { movementId: 'bb_hang_power_clean', reps: 9, label: '9 Hang Power Cleans' },
                  { movementId: 'bb_push_jerk', reps: 6, label: '6 Push Jerks' }
                ],
                  stimulus: 'Honoring Staff Sgt. Timothy Davis. Break strategically: 11 deadlifts, rest, 1 deadlift + 8 cleans, rest, 1 clean + 6 unbroken push jerks.',
                    logic: 'Barbell cycling masterpiece progressing from Hinge to Explosive Pull to Overhead Jerk.'
},
{
  id: 'jt',
    title: 'JT',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'medium',
            minutes: 14,
              prescriptionHeader: '21 - 15 - 9 Reps For Time (14 Min Cap):',
                items: [
                  { movementId: 'hspu', reps: '21-15-9', label: 'Handstand Push-Ups' },
                  { movementId: 'ring_dips', reps: '21-15-9', label: 'Ring / Parallel Bar Dips' },
                  { movementId: 'pushups', reps: '21-15-9', label: 'Push-Ups' }
                ],
                  stimulus: 'Honoring Petty Officer 1st Class Jeff Taylor. Extreme upper-body pressing endurance. Break all sets before triceps lock up.',
                    logic: 'Triple pushing descending ladder: Inverted Vertical Press → Suspension Dip → Horizontal Deck Press.'
},
{
  id: 'michael',
    title: 'MICHAEL',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'medium',
            minutes: 22,
              prescriptionHeader: '3 Rounds For Time (22 Min Cap):',
                items: [
                  { movementId: 'run', reps: 800, label: '800m Run' },
                  { movementId: 'superman_pulls', reps: 50, label: '50 Back Extensions / Superman Pulls' },
                  { movementId: 'situps', reps: 50, label: '50 AbMat Sit-Ups' }
                ],
                  stimulus: 'Honoring Lt. Michael McGreevy. Balance anterior core with posterior chain extensions after each 800m run.',
                    logic: 'Monostructural Run + Posterior Spine Extension + Anterior Core Flexion.'
},
{
  id: 'badger',
    title: 'BADGER',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 28,
              prescriptionHeader: '3 Rounds For Time (28 Min Cap):',
                items: [
                  { movementId: 'bb_hang_power_clean', reps: 30, label: '30 Barbell Cleans (43/30 kg)' },
                  { movementId: 'pullups', reps: 30, label: '30 Pull-Ups' },
                  { movementId: 'run', reps: 800, label: '800m Run' }
                ],
                  stimulus: 'Honoring Chief Petty Officer Mark Carter. Maintain solid grip management across 30 cleans and 30 pull-ups per round.',
                    logic: 'Olympic barbell cycling + High-volume vertical pull + Monostructural aerobic recovery run.'
},
{
  id: 'danny',
    title: 'DANNY',
      category: 'Hero Benchmark',
        format: 'AMRAP',
          durationCategory: 'medium',
            minutes: 20,
              prescriptionHeader: 'AMRAP in 20 Minutes:',
                items: [
                  { movementId: 'box_jumps', reps: 30, label: '30 Box Jumps (24/20 in)' },
                  { movementId: 'db_push_press', reps: 20, label: '20 Push Presses (2x15/10 kg or 50/35 kg)' },
                  { movementId: 'pullups', reps: 30, label: '30 Pull-Ups' }
                ],
                  stimulus: 'Honoring SWAT Sgt. Daniel Sakai. Step down on box jumps to save Achilles and calves, and keep push presses unbroken.',
                    logic: 'Lower Plyometric Rebound + Vertical Upper Push + Vertical Upper Pull.'
},
{
  id: 'hansen',
    title: 'HANSEN',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 26,
              prescriptionHeader: '5 Rounds For Time (26 Min Cap):',
                items: [
                  { movementId: 'kb_swings', reps: 30, label: '30 Kettlebell Swings (24/16 kg)' },
                  { movementId: 'burpees', reps: 30, label: '30 Burpees' },
                  { movementId: 'situps', reps: 30, label: '30 AbMat Sit-Ups' }
                ],
                  stimulus: 'Honoring Marine Staff Sgt. Daniel Hansen. High-cadence posterior chain and full-body sprawling metcon.',
                    logic: 'Posterior Chain Hinge + Chest-to-Deck Sprawl + Midline Flexion.'
},
{
  id: 'loredo',
    title: 'LOREDO',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 28,
              prescriptionHeader: '6 Rounds For Time (28 Min Cap):',
                items: [
                  { movementId: 'air_squats', reps: 24, label: '24 Air Squats' },
                  { movementId: 'pushups', reps: 24, label: '24 Push-Ups' },
                  { movementId: 'walking_lunges', reps: 24, label: '24 Walking Lunges' },
                  { movementId: 'run', reps: 400, label: '400m Run' }
                ],
                  stimulus: 'Honoring Staff Sgt. Edwardo Loredo. Zero equipment required. High muscular endurance challenge on legs and chest.',
                    logic: 'Bilateral Squat → Horizontal Push → Unilateral Lunge → Monostructural Run.'
},
{
  id: 'rene',
    title: 'RENÉ',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 28,
              prescriptionHeader: '7 Rounds For Time (28 Min Cap):',
                items: [
                  { movementId: 'run', reps: 400, label: '400m Run' },
                  { movementId: 'walking_lunges', reps: 21, label: '21 Walking Lunges' },
                  { movementId: 'pullups', reps: 15, label: '15 Pull-Ups' },
                  { movementId: 'burpees', reps: 9, label: '9 Burpees' }
                ],
                  stimulus: 'Honoring Danish Army Sgt. René Brink Jakobsen. Smooth cadence through 7 continuous rounds.',
                    logic: 'Monostructural Run + Unilateral Quad + Vertical Pull + Full Body Burpee.'
},
{
  id: 'the_seven',
    title: 'THE SEVEN',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 30,
              prescriptionHeader: '7 Rounds For Time (30 Min Cap):',
                items: [
                  { movementId: 'hspu', reps: 7, label: '7 Handstand Push-Ups' },
                  { movementId: 'bb_thrusters', reps: 7, label: '7 Thrusters (60/42.5 kg)' },
                  { movementId: 'hanging_knee_raises', reps: 7, label: '7 Knees-to-Elbows / Hanging Knee Raises' },
                  { movementId: 'bb_deadlifts', reps: 7, label: '7 Deadlifts (110/75 kg)' },
                  { movementId: 'burpees', reps: 7, label: '7 Burpees' },
                  { movementId: 'kb_swings', reps: 7, label: '7 Kettlebell Swings (24/16 kg)' },
                  { movementId: 'pullups', reps: 7, label: '7 Pull-Ups' }
                ],
                  stimulus: 'Honoring 7 fallen CIA officers and contractors. 7 stations per round across 7 rounds. Steady methodical pacing beats rushing.',
                    logic: 'Complete multi-pattern circuit: Inverted Press + Thruster + Core + Deadlift + Burpee + Hinge + Pull.'
},
{
  id: 'glen',
    title: 'GLEN',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 32,
              prescriptionHeader: 'For Time (32 Min Cap):',
                items: [
                  { movementId: 'bb_push_jerk', reps: 30, label: '30 Clean and Jerks (60/42.5 kg)' },
                  { movementId: 'run', reps: 1600, label: '1-Mile Run (1,600m)' },
                  { movementId: 'burpees', reps: 100, label: '100 Burpees' }
                ],
                  stimulus: 'Honoring Navy SEAL Glen Doherty. Opens with Grace, transitions to a mile run, and finishes with a 100-burpee grinder.',
                    logic: 'Barbell Olympic power sprint → Long monostructural run → High-volume full body calisthenics chipper.'
},
{
  id: 'chad',
    title: 'CHAD (1000x STEP-UPS)',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 35,
              prescriptionHeader: 'For Time (35 Min Cap): 500 to 1,000 Box Step-Ups (20 in Box, Optional 20/14 lb Vest):',
                items: [
                  { movementId: 'box_step_ups', reps: 500, label: '500 Box Step-Ups (20 in Box)' }
                ],
                  stimulus: 'Honoring Navy SEAL Chad Wilkinson. Steady rhythmic stepping. Alternate lead legs every 10–25 reps.',
                    logic: 'Single-movement pure unilateral leg endurance and aerobic threshold grind.'
},
{
  id: 'severin',
    title: 'SEVERIN',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'medium',
            minutes: 25,
              prescriptionHeader: 'For Time (25 Min Cap):',
                items: [
                  { movementId: 'pullups', reps: 50, label: '50 Strict Pull-Ups' },
                  { movementId: 'pushups', reps: 100, label: '100 Push-Ups' },
                  { movementId: 'run', reps: 1600, label: '1,600m Run' }
                ],
                  stimulus: 'Honoring Sgt. Christopher Severin. Strict upper-body pulling and pressing followed by a fast mile run.',
                    logic: 'Upper Pull Volume + Horizontal Push Volume + Monostructural Run Finish.'
},
{
  id: 'josh',
    title: 'JOSH',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'medium',
            minutes: 18,
              prescriptionHeader: '21 - 42 - 15 - 30 - 9 - 18 Reps For Time (18 Min Cap):',
                items: [
                  { movementId: 'bb_front_squats', reps: '21-15-9', label: 'Overhead / Front Squats (43/30 kg)' },
                  { movementId: 'pullups', reps: '42-30-18', label: 'Pull-Ups (Double Rep Count)' }
                ],
                  stimulus: 'Honoring Staff Sgt. Joshua Hager. 21 squats + 42 pull-ups, 15 squats + 30 pull-ups, 9 squats + 18 pull-ups.',
                    logic: 'Anterior Quad Squat paired with double-volume Vertical Pull-Ups.'
},
{
  id: 'holleyman',
    title: 'HOLLEYMAN',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 30,
              prescriptionHeader: '30 Rounds For Time (30 Min Cap):',
                items: [
                  { movementId: 'wall_balls', reps: 5, label: '5 Wall Ball Shots (9/6 kg)' },
                  { movementId: 'hspu', reps: 3, label: '3 Handstand Push-Ups' },
                  { movementId: 'bb_hang_power_clean', reps: 1, label: '1 Power Clean (100/70 kg)' }
                ],
                  stimulus: 'Honoring Staff Sgt. Aaron Holleyman. 30 fast, methodical rounds of 5-3-1.',
                    logic: 'High-density micro-triplet: Squat-to-Target + Inverted Vertical Press + Heavy Olympic Clean.'
},
{
  id: 'jason',
    title: 'JASON',
      category: 'Hero Benchmark',
        format: 'FOR_TIME',
          durationCategory: 'long',
            minutes: 26,
              prescriptionHeader: 'For Time: Descending Squats & Ascending Muscle-Ups (26 Min Cap):',
                items: [
                  { movementId: 'air_squats', reps: '100-75-50-25', label: 'Air Squats (100, 75, 50, 25)' },
                  { movementId: 'bar_muscle_up', reps: '5-10-15-20', label: 'Muscle-Ups (5, 10, 15, 20)' }
                ],
                  stimulus: 'Honoring Navy SEAL Jason Workman. 100 squats + 5 muscle-ups, 75+10, 50+15, 25+20.',
                    logic: 'Opposing inverse ladders: massive lower body fatigue paired with increasing high-skill gymnastics demand.'
},

// ==========================================
// SIGNATURE CONDITIONING & HYROX BENCHMARKS
// ==========================================
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
                  { movementId: 'walking_lunges', reps: 30, label: '30 Alternating Walking Lunges' },
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
  id: 'russian_engine',
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

globalThis.CLASSICAL_BENCHMARKS = CLASSICAL_BENCHMARKS;
