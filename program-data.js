/* Jon's Run + Lift Training Program
   4 Days/Week — 2 Running, 2 Home-Gym Lifting — Half Marathon Build
   Source: Jon_Run_Lift_Program.docx
*/

const WARMUP_FLOW = [
  { name: "Cat-Cow", detail: "10 reps" },
  { name: "Child's Pose", detail: "30–45 sec" },
  { name: "Bird Dog", detail: "8 reps/side" },
  { name: "Glute Bridge", detail: "12 reps" },
  { name: "Hip Flexor Stretch", detail: "30 sec/side" },
  { name: "Thoracic Rotation (quadruped)", detail: "8 reps/side" },
  { name: "90/90 Hip Stretch", detail: "30 sec/side" },
];

const CORE_OPTIONS = [
  { name: "Bird Dog", detail: "3 x 8/side" },
  { name: "Dead Bug", detail: "3 x 10/side" },
  { name: "Side Plank", detail: "3 x 20–30 sec/side" },
  { name: "Kettlebell Anti-Rotation Hold", detail: "3 x 20–30 sec/side" },
];

const CONDITIONING_FINISHER = { name: "Jump Rope", detail: "5 rounds of 1 min on / 1 min off (optional)" };

// Lift A variants (Monday) — front-loaded squat pattern
const LIFT_A = {
  1: {
    label: "Lift A1 — Front Squat Focus",
    exercises: [
      { name: "Front Squat (clean grip, from floor)", detail: "4 x 6, moderate load, brace hard, upright torso" },
      { name: "Kettlebell Floor Press", detail: "4 x 8" },
      { name: "Kettlebell Single-Arm Row", detail: "3 x 10/side" },
      { name: "Kettlebell Front-Rack Carry", detail: "3 x 30–40 yd" },
    ],
  },
  2: {
    label: "Lift A2 — Goblet Squat / Unilateral Focus",
    exercises: [
      { name: "Kettlebell Goblet Squat", detail: "4 x 10" },
      { name: "Push-Up", detail: "4 x 10–15 (elevate feet or slow the tempo down as it gets easier)" },
      { name: "Bulgarian Split Squat (rear foot elevated)", detail: "3 x 8/side" },
      { name: "Kettlebell Renegade Row", detail: "3 x 8/side" },
    ],
  },
  3: {
    label: "Lift A3 — Zercher Squat / Press Focus",
    exercises: [
      { name: "Zercher Squat (barbell in elbow crease)", detail: "4 x 6, keep torso upright" },
      { name: "Barbell Floor Press", detail: "4 x 6" },
      { name: "Bent-Over Barbell Row", detail: "3 x 8" },
      { name: "Walking Lunges", detail: "3 x 10/side" },
    ],
  },
  4: {
    label: "Lift A4 — Deload / Technique Day",
    note: "Loads drop about 30–40% versus your working weight — technique and recovery, not max-effort.",
    exercises: [
      { name: "Front Squat, light technique focus", detail: "3 x 8" },
      { name: "Push-Up (or light Kettlebell Floor Press)", detail: "3 x 10" },
      { name: "Kettlebell Farmer Carry", detail: "3 x 30 yd" },
    ],
  },
};

// Lift B variants (Thursday) — hinge pattern
const LIFT_B = {
  1: {
    label: "Lift B1 — Romanian Deadlift Focus",
    warmupExtra: "2 light kettlebell deadlifts to groove the hinge",
    exercises: [
      { name: "Romanian Deadlift (barbell, floor start)", detail: "4 x 6 — stop above the knee if the low back complains" },
      { name: "Kettlebell Floor Press", detail: "4 x 8" },
      { name: "Kettlebell Swings", detail: "3 x 15 (swap for Glute Bridge x15 if swings bother the back)" },
      { name: "Farmer Carry, both kettlebells", detail: "3 x 40 yd" },
    ],
    conditioning: true,
  },
  2: {
    label: "Lift B2 — Single-Leg Hinge Focus",
    warmupExtra: "hip hinge drill",
    exercises: [
      { name: "Single-Leg Kettlebell Deadlift", detail: "3 x 8/side" },
      { name: "Bent-Over Barbell Row", detail: "4 x 8" },
      { name: "Single-Arm Kettlebell Swings", detail: "3 x 12/side" },
      { name: "Suitcase Carry (single kettlebell)", detail: "3 x 30 yd/side" },
    ],
    conditioning: true,
  },
  3: {
    label: "Lift B3 — Conventional Deadlift Focus",
    warmupExtra: "hip hinge drill",
    exercises: [
      { name: "Barbell Deadlift (conventional, from floor)", detail: "4 x 5, moderate load, strict form" },
      { name: "Single-Arm Kettlebell Floor Press", detail: "3 x 8/side" },
      { name: "Glute Bridge / Hip Thrust", detail: "3 x 12" },
      { name: "Farmer Carry, both kettlebells", detail: "3 x 40 yd" },
    ],
    conditioning: true,
  },
  4: {
    label: "Lift B4 — Deload / Technique Day",
    warmupExtra: "hip hinge drill",
    note: "Loads drop about 30–40% versus your working weight.",
    exercises: [
      { name: "Kettlebell Deadlift, light technique focus", detail: "3 x 10" },
      { name: "Kettlebell Swings, moderate effort", detail: "3 x 12" },
      { name: "Jump Rope Intervals", detail: "5 rounds of 1 min on / 1 min off" },
    ],
  },
};

function tempoWorkoutForWeek(week) {
  if (week <= 4) return { phase: "Base", detail: "3–4 mi continuous tempo @ 9:45–10:00/mi, then 4 x 20 sec strides" };
  if (week <= 8) return { phase: "Build", detail: "1 mi warm-up, 6 x 800m @ 9:00–9:15/mi w/ 400m jog recovery, 1 mi cooldown" };
  if (week <= 10) return { phase: "Peak", detail: "4–5 mi continuous @ goal half marathon pace" };
  return { phase: "Taper", detail: "2–3 mi easy tempo + strides, reduced volume" };
}

// week -> { mon, tue, thu, sun date strings (YYYY-MM-DD), sunMiles, sunNote }
const CALENDAR = [
  { week: 1, mon: null, tue: "2026-07-07", thu: "2026-07-09", sun: "2026-07-12", sunMiles: 5, sunNote: "" },
  { week: 2, mon: "2026-07-13", tue: "2026-07-14", thu: "2026-07-16", sun: "2026-07-19", sunMiles: 6, sunNote: "" },
  { week: 3, mon: "2026-07-20", tue: "2026-07-21", thu: "2026-07-23", sun: "2026-07-26", sunMiles: 7, sunNote: "" },
  { week: 4, mon: "2026-07-27", tue: "2026-07-28", thu: "2026-07-30", sun: "2026-08-02", sunMiles: 5, sunNote: "deload" },
  { week: 5, mon: "2026-08-03", tue: "2026-08-04", thu: "2026-08-06", sun: "2026-08-09", sunMiles: 8, sunNote: "" },
  { week: 6, mon: "2026-08-10", tue: "2026-08-11", thu: "2026-08-13", sun: "2026-08-16", sunMiles: 9, sunNote: "" },
  { week: 7, mon: "2026-08-17", tue: "2026-08-18", thu: "2026-08-20", sun: "2026-08-23", sunMiles: 6, sunNote: "deload" },
  { week: 8, mon: "2026-08-24", tue: "2026-08-25", thu: "2026-08-27", sun: "2026-08-30", sunMiles: 10, sunNote: "" },
  { week: 9, mon: "2026-08-31", tue: "2026-09-01", thu: "2026-09-03", sun: "2026-09-06", sunMiles: 11, sunNote: "" },
  { week: 10, mon: "2026-09-07", tue: "2026-09-08", thu: "2026-09-10", sun: "2026-09-13", sunMiles: 12, sunNote: "peak" },
  { week: 11, mon: "2026-09-14", tue: "2026-09-15", thu: "2026-09-17", sun: "2026-09-20", sunMiles: 7, sunNote: "taper" },
  { week: 12, mon: "2026-09-21", tue: "2026-09-22", thu: "2026-09-24", sun: "2026-09-27", sunMiles: 4, sunNote: "taper" },
];

const LIFT_VARIANT_BY_WEEK = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 1, 6: 2, 7: 3, 8: 4, 9: 1, 10: 2, 11: 3, 12: 4 };

function coreFinisherForSession(week, dayIndex) {
  return CORE_OPTIONS[(week + dayIndex) % CORE_OPTIONS.length];
}

// Build the flat list of all 48 sessions across the 12-week block.
function buildSessions() {
  const sessions = [];
  CALENDAR.forEach((wk, dayOffsetSeed) => {
    const variant = LIFT_VARIANT_BY_WEEK[wk.week];
    const isDeloadLift = variant === 4;

    // Monday — Lift A (skipped in week 1 — program effectively started Tue Jul 7, 2026)
    if (wk.mon) {
      const liftA = LIFT_A[variant];
      sessions.push({
        id: `w${wk.week}-mon`,
        week: wk.week,
        date: wk.mon,
        day: "Monday",
        type: "lift",
        title: liftA.label,
        note: liftA.note || (isDeloadLift ? "Deload week" : ""),
        warmup: WARMUP_FLOW,
        warmupExtra: null,
        exercises: liftA.exercises,
        coreFinisher: coreFinisherForSession(wk.week, 0),
        coreFinisherExtra: isDeloadLift,
        conditioning: null,
      });
    }

    // Tuesday — Tempo/Speed
    const tempo = tempoWorkoutForWeek(wk.week);
    sessions.push({
      id: `w${wk.week}-tue`,
      week: wk.week,
      date: wk.tue,
      day: "Tuesday",
      type: "run",
      title: `Run — ${tempo.phase} Phase Tempo/Speed`,
      note: tempo.detail,
      runKind: "tempo",
    });

    // Thursday — Lift B
    const liftB = LIFT_B[variant];
    sessions.push({
      id: `w${wk.week}-thu`,
      week: wk.week,
      date: wk.thu,
      day: "Thursday",
      type: "lift",
      title: liftB.label,
      note: liftB.note || (isDeloadLift ? "Deload week" : ""),
      warmup: WARMUP_FLOW,
      warmupExtra: liftB.warmupExtra || null,
      exercises: liftB.exercises,
      coreFinisher: coreFinisherForSession(wk.week, 1),
      coreFinisherExtra: isDeloadLift,
      conditioning: liftB.conditioning ? CONDITIONING_FINISHER : null,
    });

    // Sunday — Long Run
    sessions.push({
      id: `w${wk.week}-sun`,
      week: wk.week,
      date: wk.sun,
      day: "Sunday",
      type: "run",
      title: `Run — Long Run (${wk.sunMiles} mi)${wk.sunNote ? " — " + wk.sunNote : ""}`,
      note: "Easy pace, conversational: 10:30–11:00 /mi",
      runKind: "long",
      miles: wk.sunMiles,
    });
  });
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return sessions;
}

const PACE_BANDS = [
  { type: "Easy / Long Run", pace: "10:30–11:00 /mi" },
  { type: "Tempo", pace: "9:30–9:45 /mi" },
  { type: "Intervals / Speed", pace: "9:00–9:15 /mi (“comfortably hard”)" },
];

const PROGRAM_META = {
  goal: "Complete a half marathon, reduce body fat, improve flexibility/core control for daily lower back discomfort.",
  benchmark10k: "59:00 (≈ 9:30/mile)",
  benchmarkThrusters: "5 x 5 @ 75 lb, unbroken, in 15 minutes",
  targetFinish: "2:05–2:15",
  backNote: "Program leans conservative on spinal loading — front-loaded squats, floor-based hinges, no rack work. Stop any movement that aggravates back pain and check in with a doctor/PT.",
};

const PROGRAM = { sessions: buildSessions(), paceBands: PACE_BANDS, meta: PROGRAM_META };
