(() => {
"use strict";

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const P = Object.fromEntries(POLICIES.map((p) => [p.c.toUpperCase(), p]));
const getP = (code) => P[String(code || "").toUpperCase()];
const DAY = 864e5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseD(s) {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1);
}
function isoD(d) { return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : ""; }
function today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(day, last)); return x; }
function addBDays(d, n) {
  const step = n < 0 ? -1 : 1; let c = 0; let x = new Date(d);
  while (c < Math.abs(n)) { x = addDays(x, step); const w = x.getDay(); if (w !== 0 && w !== 6) c++; }
  return x;
}
function nthWeekday(y, m, wd, n) { const first = new Date(y, m, 1); const off = (wd - first.getDay() + 7) % 7; return new Date(y, m, 1 + off + 7 * (n - 1)); }
function diffDays(a, b) { return Math.round((b - a) / DAY); }
function fmt(d) { return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : "—"; }
function fmtMonth(d) { return d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—"; }
function fmtShort(d) { if (!d) return "—"; const sameYear = d.getFullYear() === today().getFullYear(); return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? "" : ", " + d.getFullYear()}`; }
function relDays(d) {
  if (!d) return "";
  const n = diffDays(today(), d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return n > 120 ? `in ${Math.round(n / 30.44)} months` : `in ${n} days`;
  return -n > 120 ? `${Math.round(-n / 30.44)} months ago` : `${-n} days ago`;
}
function monthsBetween(a, b) { return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); }
function plural(n, w) { if (n === 1) return `${n} ${w}`; return `${n} ${/[^aeiou]y$/.test(w) ? w.slice(0, -1) + "ies" : w + "s"}`; }
function storeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
function storeDel(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } }

/* ================= state ================= */
const LS_KEY = "cimed-navigator-v1";
/* The example student follows a real AY2026-27 track (2A) and carries a sample Neurology schedule. */
const EXAMPLE_TRACK = "2A";
function exampleRotations() {
  const posted = { "Surgery": "2026-06-18", "Obstetrics and Gynecology": "2026-07-30", "Psychiatry": "2026-08-24" };
  const seq = (typeof TRACK_SCHEDULE !== "undefined" && TRACK_SCHEDULE.tracks[EXAMPLE_TRACK]) || [];
  return [
    ...seq.map((x, i) => ({ id: "r" + (i + 1), name: x.n === "Elective" ? `Elective (block ${x.blocks})` : x.n, kind: x.n === "Elective" ? "elective" : "clerkship", start: x.a, end: x.b, src: "track", ...(posted[x.n] ? { gradePosted: posted[x.n] } : {}) })),
    { id: "r20", name: "Diagnostic Radiology", kind: "elective", start: "2027-03-29", end: "2027-04-09" },
    { id: "r21", name: "Inpatient Cardiology", kind: "elective", start: "2027-04-12", end: "2027-05-07" }
  ];
}
function exampleNeuroDays() {
  const days = {};
  for (let i = 0; i < 35; i++) {
    const d = new Date(2026, 9, 12 + i); const wd = d.getDay(); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const ev = [];
    if (wd >= 1 && wd <= 5) ev.push(i < 14 ? { time: "7:30am", title: "Inpatient Neurology", details: ["Hospital, 6th floor", "Neurology team"], kind: "clinical" } : i < 21 ? { time: "7:30am", title: "Stroke Service", details: ["Hospital, 6th floor"], kind: "clinical" } : { time: "8:00am", title: "Outpatient Neurology Clinic", details: ["Neurology clinic"], kind: "clinical" });
    if (wd === 2) ev.push({ time: "3-5pm", title: "Didactics", details: ["Conference room B"], kind: "teaching" });
    if (wd === 3) ev.push({ time: "12:00-1:00pm", title: "Grand Rounds/Teams", details: [], kind: "teaching" });
    if (wd === 4 && (i === 3 || i === 17)) ev.push({ time: "5:00-9:00pm", title: "Short call", details: ["Hospital, 6th floor"], kind: "call" });
    if (ev.length) days[k] = ev;
  }
  Object.assign(days, {
    "2026-10-22": [{ time: "8:30am", title: "Practice Exam", details: ["Classroom, then back to the service"], kind: "exam" }],
    "2026-10-23": [{ time: "7:30am", title: "Inpatient Neurology", details: ["Hospital, 6th floor"], kind: "clinical" }, { time: "11:30-11:45am", title: "Mid-Clerkship", details: ["Check in via Zoom"], kind: "meeting" }],
    "2026-11-01": [{ time: "11:59pm", title: "H&P Due", details: ["Submit in the course site"], kind: "due" }],
    "2026-11-07": [{ time: "8:00am", title: "Weekend call", details: ["Hospital, 6th floor"], kind: "call" }],
    "2026-11-10": [{ time: "AM", title: "OSCE", details: ["Simulation center"], kind: "exam" }, { time: "1:00pm", title: "Outpatient Neurology Clinic", details: ["Neurology clinic"], kind: "clinical" }],
    "2026-11-12": [{ time: "", title: "Reading Day", details: [], kind: "off" }],
    "2026-11-13": [{ time: "8:00am", title: "Shelf Exam", details: ["Auditorium; starts 8:30 sharp", "Complete the clerkship evaluation"], kind: "exam" }]
  });
  return days;
}
const EXAMPLE = {
  v: 1, example: true, updatedAt: 0,
  profile: { matric: "2024-07-08", phase: "ci", ciStart: "2026-03-16", ciEnd: "2027-03-14", grad: "2028-05", step1: "passed", step1Date: "", step2: "not", step2Date: "", reqSet: "both", leaveMonths: 0, track: EXAMPLE_TRACK, trackSched: "2026-27" },
  req: { y1: "done", y2: "done", step1: "done", cl_fm: "todo", cl_im: "done", cl_neuro: "inprog", cl_psych: "done", cl_ob: "done", cl_peds: "todo", cl_surg: "done", fmcc: "inprog", idea: "inprog", y3elec: "todo", gateway: "todo", step2: "todo", subi: "todo", cbc: "todo", project: "todo", acls: "todo", prof: "inprog" },
  electives: [
    { id: "e1", name: "Inpatient Cardiology", kind: "clinical", weeks: 4, credits: 4, status: "planned" },
    { id: "e2", name: "Diagnostic Radiology", kind: "clinical", weeks: 2, credits: 2, status: "planned" }
  ],
  rotations: exampleRotations(),
  scheds: [{ id: "s1", name: "Neurology", block: "4A", from: "2026-10-12", to: "2026-11-15", file: "Sample schedule", who: "Example student", sample: true, days: exampleNeuroDays() }]
};
const clone = (o) => JSON.parse(JSON.stringify(o));
/* A new student starts blank and goes through setup. The example lives in its own sandbox and is never saved. */
const BLANK = { v: 1, example: false, updatedAt: 0,
  profile: { matric: "", phase: "ci", ciStart: "", ciEnd: "", grad: "", step1: "not", step1Date: "", step2: "not", step2Date: "", reqSet: "both", leaveMonths: 0, name: "", myName: "", track: "", trackSched: "", setupDone: false },
  req: {}, electives: [], rotations: [], scheds: [], done: {}, askRecent: [], customTracks: null, habits: null, career: null };
function normalize(src) {
  const b = clone(BLANK); const o = { ...b, ...(src || {}) };
  o.profile = { ...b.profile, ...((src && src.profile) || {}) };
  for (const k of ["rotations", "scheds", "electives", "askRecent"]) if (!Array.isArray(o[k])) o[k] = [];
  for (const k of ["req", "done"]) if (!o[k] || typeof o[k] !== "object" || Array.isArray(o[k])) o[k] = {};
  /* a custom track's guessed block ("base", from an assigned track) never stands beside the student's own dates for the
     same clerkship: their entry or the audit's wins, so a clerkship is never on the plan twice */
  const ownNames = new Set(o.rotations.filter((r) => r && r.kind === "clerkship" && r.src !== "base").map((r) => r.name));
  o.rotations = o.rotations.filter((r) => r && !(r.src === "base" && ownNames.has(r.name)));
  return o;
}
/* A guessed block whose dates are already over and that the student never confirmed probably didn't happen on those
   dates (that's why the track is custom). It creates no deadlines and isn't shared with Debrief until confirmed. */
function guessedPast(r) { return !!r && r.src === "base" && String(r.end || "") < isoD(today()); }
let state = clone(BLANK);
let mine = null; /* the student's own plan, held aside while the example sandbox is open */
let booted = false;
/* The one door from shared data to the Debrief space: read-only copies of the schedule and who you are.
   School data (checklist, electives, grades, check-offs, Ask history) never goes through it. */
const own = () => (state.example ? (mine || BLANK) : state);
window.PERL_SHARED = Object.freeze({
  rotations: () => clone((own().rotations || []).filter((r) => !guessedPast(r))),
  scheds: () => clone(own().scheds || []),
  profile: () => ({ name: own().profile.name || "", myName: own().profile.myName || "" }),
  /* School's dated obligations (rotation, profile and calendar deadlines; clerkship-schedule items are already shared above) */
  deadlines: () => (state.example || !booted ? [] : allDated()).filter((x) => !x.sched && !x.feed).map((x) => ({ date: isoD(x.date), label: x.label, code: x.code || "", status: itemState(x), holiday: !!x.holiday, monthOnly: !!x.monthOnly }))
});
const sharedChanged = () => document.dispatchEvent(new CustomEvent("perl:shared"));

const ui = {
  view: "today", sel: null, q: "", phaseF: "mine", groupF: "", overdueOnly: false, reqView: "",
  audit: { open: false, status: "idle", text: "", fileName: "", result: null, error: "", pick: {} },
  ask: { turns: [], draft: "" },
  calc: { rule: "e_drop", base: "" }, savedNote: "", clearConfirm: false, sheet: false, addElective: false, hcSel: null, hcMonths: 0, rotError: "", doneTimer: null, sched: { open: false, text: "", fileName: "", items: null, pick: {}, error: "" }
};

/* storage: a private path in the viewer's Claude account (store.js). The example sandbox is never saved. */
function persist() {
  if (state.example) { ui.savedNote = "Example data. Changes here aren't saved."; return; }
  state.updatedAt = Date.now();
  STORE.save(state);
  ui.savedNote = STORE.note();
  sharedChanged();
}

/* ================= derived data ================= */
function profileDates(pr) {
  const m = parseD(pr.matric) || parseD(EXAMPLE.profile.matric);
  const grad = parseD(pr.grad) || addYears(m, 4);
  const ciStart = parseD(pr.ciStart);
  const ciEnd = parseD(pr.ciEnd);
  const gy = grad.getFullYear();
  const fyStart = ciEnd ? addDays(ciEnd, 1) : null;
  return {
    matric: m, grad, ciStart, ciEnd, fyStart,
    step1Limit: addDays(addMonths(m, 36), 0),
    mdLimit: addMonths(m, 72 + (Number(pr.leaveMonths) || 0)),
    step2: new Date(gy - 1, 6, 31),
    mspeWriter: new Date(gy - 1, 6, 1),
    mspeRelease: nthWeekday(gy - 1, 8, 3, 4),
    decFy: fyStart ? new Date(fyStart.getFullYear() - 1, 11, 1) : null,
    makeup: ciEnd ? addDays(ciEnd, 30) : null,
    awayReady: ciEnd ? addDays(ciEnd, 28) : null,
    step1School: parseD(pr.step1Date)
  };
}
function addYears(d, n) { return addMonths(d, n * 12); }

function personalItems() {
  const pr = state.profile; const D = profileDates(pr);
  const s1done = pr.step1 === "passed"; const s2done = pr.step2 === "passed";
  const items = [
    { id: "step1_limit", label: "Step 1 passed: 3-year limit", rule: "Within 3 years of matriculation, leaves included", date: D.step1Limit, code: "APS-33", kind: "limit", done: s1done },
    { id: "step1_sched", label: pr.step1 === "scheduled" ? "Step 1 exam (scheduled)" : "Step 1 school deadline", rule: pr.step1 === "scheduled" ? "Your test date" : "From your profile; AY2026-27 deadline is Mar 3, 2027", date: D.step1School, code: "APS-31", kind: "school", done: s1done, hide: !D.step1School },
    { id: "makeup_ci", label: "Make up extra missed clinical days", rule: "Within 30 days of the end of the Clinical Immersion Year", date: D.makeup, code: "APS-7", kind: "window", hide: !D.makeup },
    { id: "away_ready", label: "Earliest likely start for a clinical away", rule: "All clerkships graded first; grades are due within 4 weeks of the last one", date: D.awayReady, code: "APS-37", kind: "window", hide: !D.awayReady },
    { id: "dec_before_fy", label: "Tell your course directors and the Registrar about your electives", rule: "By December before your final year starts", date: D.decFy, code: "APS-30", kind: "school", hide: !D.decFy, monthOnly: true },
    { id: "mspe_writer", label: "Last day to ask for a different MSPE writer", rule: "July 1 of your M4 year", date: D.mspeWriter, code: "APS-45", kind: "school" },
    { id: "step2_deadline", label: pr.step2 === "scheduled" && parseD(pr.step2Date) ? "Step 2 CK exam (scheduled)" : "Step 2 CK school deadline", rule: pr.step2 === "scheduled" && parseD(pr.step2Date) ? "Your test date" : "July 31 before graduation, by the AY2026-27 pattern; confirm in your calendar", date: pr.step2 === "scheduled" && parseD(pr.step2Date) ? parseD(pr.step2Date) : D.step2, code: "APS-31", kind: "school", done: s2done },
    { id: "mspe_release", label: "MSPE released; ERAS opens to programs", rule: "Fourth Wednesday of September", date: D.mspeRelease, code: "APS-45", kind: "milestone" },
    { id: "grad", label: "Graduation target", rule: "From your profile", date: D.grad, code: "APS-6", kind: "milestone", monthOnly: true },
    { id: "md_limit", label: "MD complete: 6-year limit", rule: "6 years from matriculation" + (Number(pr.leaveMonths) ? ` plus ${pr.leaveMonths} months of degree leave` : ""), date: D.mdLimit, code: "APS-33", kind: "limit" }
  ];
  return items.filter((i) => !i.hide && i.date).sort((a, b) => a.date - b.date);
}

function applicableReqs() {
  const set = state.profile.reqSet || "both";
  return REQS.filter((r) => !r.only || set === "both" || r.only === set);
}
function reqProgress() {
  const list = applicableReqs();
  const done = list.filter((r) => state.req[r.id] === "done").length;
  return { done, total: list.length };
}
function electiveTally(setKey) {
  const rule = ELECTIVE_RULES[setKey];
  const unit = rule.unit;
  let clin = 0, clinSoon = 0, open = 0, openSoon = 0, subiSeen = 0;
  const sorted = [...(state.electives || [])].sort((a, b) => (a.status === "done" ? 0 : 1) - (b.status === "done" ? 0 : 1));
  for (const e of sorted) {
    const amt = Number(unit === "weeks" ? e.weeks : e.credits) || 0;
    const isDone = e.status === "done";
    let bucket = e.kind;
    if (e.kind === "subi") { subiSeen++; if (subiSeen === 1) continue; bucket = "clinical"; }
    if (bucket === "clinical") { if (isDone) clin += amt; else clinSoon += amt; }
    else { if (isDone) open += amt; else openSoon += amt; }
  }
  const clinOver = Math.max(0, clin - rule.clinical);
  const clinCounted = Math.min(clin, rule.clinical);
  const clinSoonCounted = Math.min(clinSoon, Math.max(0, rule.clinical - clinCounted));
  const clinSoonOver = clinSoon - clinSoonCounted;
  return { rule, unit, clin: clinCounted, clinSoon: clinSoonCounted, open: open + clinOver, openSoon: openSoon + clinSoonOver };
}
function phaseLabel(k) { const p = PHASES.find((x) => x.k === k); return p ? p.label : "—"; }
function isOverdue(p) { const r = parseD(p.rev); return r && r < today(); }

const READ_FIRST = {
  pre: ["APS-31", "APS-33", "APS-16", "APS-17", "APS-7"],
  ci: ["APS-7", "APS-16", "APS-47", "APS-37", "APS-45"],
  fy: ["APS-30", "APS-37", "APS-45", "APS-31", "FS-6"],
  loa: ["APS-9", "APS-33", "APS-31", "APS-27", "SWH-5"]
};

/* ================= small renderers ================= */
const codeBtn = (c) => getP(c) ? `<button class="code-btn" data-act="open-policy" data-code="${esc(c)}" aria-label="Open ${esc(c)}">${esc(c)}</button>` : `<span class="code-btn" aria-disabled="true">${esc(c)}</span>`;
const STATUS = { done: ["Done", "pos"], inprog: ["In progress", "info"], todo: ["Not yet", ""], na: ["Waived", ""], unknown: ["Unknown", "warn"] };
const SEV = { conflict: ["Conflict", "neg"], ambiguity: ["Unclear", "warn"], gap: ["Missing", "warn"], access: ["Access", ""], typo: ["Error", ""] };
const ICON = {
  projects: '<path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.5H14a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 14 15H4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M6 9.5h6"/>',
  today: '<circle cx="9" cy="9" r="6.5"/><path d="M9 5.5V9l2.5 1.5"/>',
  calendar: '<rect x="2.5" y="3.5" width="13" height="12" rx="2.5"/><path d="M2.5 7.5h13M6 2v3M12 2v3"/>',
  rotations: '<path d="M2.5 5h8M2.5 9h13M2.5 13h6"/><circle cx="13" cy="5" r="1.6"/><circle cx="11" cy="13" r="1.6"/>',
  progress: '<path d="M3 4.5l1.5 1.5L7 3.5M3 9.5l1.5 1.5L7 8.5M3 14.5l1.5 1.5L7 13.5M9.5 5h5M9.5 10h5M9.5 15h5"/>',
  policies: '<path d="M4 2.5h7l3 3v10H4z"/><path d="M11 2.5v3h3M6.5 9h5M6.5 12h5"/>',
  ask: '<path d="M3 4h12v8H8l-3.5 3v-3H3z"/>',
  health: '<path d="M9 2.5l7 12.5H2z"/><path d="M9 7.5v3.5M9 13v.5"/>',
  profile: '<circle cx="9" cy="6" r="3"/><path d="M3 16c.6-3 3-4.5 6-4.5s5.4 1.5 6 4.5"/>',
  search: '<circle cx="8" cy="8" r="5"/><path d="M12 12l3.5 3.5"/>',
  action: '<path d="M9 3.5v11M3.5 9h11"/>',
  date: '<rect x="3" y="4" width="12" height="11" rx="2.5"/><path d="M3 7.5h12"/>',
  answer: '<path d="M4 3.5h10v11H4z"/><path d="M6.5 7h5M6.5 10h3.5"/>',
  journal: '<path d="M4.5 2.5h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8z"/><path d="M4.5 2.5v13M7.5 6h4M7.5 9h4"/>',
  history: '<path d="M3 9a6 6 0 1 0 1.8-4.3"/><path d="M3 3v3h3M9 6v3l2 1.5"/>',
  vault: '<rect x="2.5" y="4.5" width="13" height="10" rx="2"/><path d="M6.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M2.5 9h13"/>',
  mspe: '<path d="M4 2.5h7l3 3v10H4z"/><path d="M6.5 8.5l1.5 1.5 3-3.5"/>',
  dsettings: '<path d="M3 5h7M13 5h2M3 9h2M8 9h7M3 13h9M15 13h0"/><circle cx="11.5" cy="5" r="1.5"/><circle cx="6.5" cy="9" r="1.5"/><circle cx="13.5" cy="13" r="1.5"/>',
  schedule: '<rect x="2.5" y="3.5" width="13" height="12" rx="2.5"/><path d="M2.5 7.5h13M6 10.5h2M10 10.5h2M6 13h2"/>',
  habits: '<circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="3"/><path d="M9 2.5v3.5M15.5 9H12"/>',
  career: '<path d="M2.5 15.5l4-5 3 2.5 6-8"/><path d="M11.5 5h4v4"/>',
  school: '<path d="M1.5 7L9 3.5 16.5 7 9 10.5z"/><path d="M4.5 8.5v4c1.2 1.3 2.8 2 4.5 2s3.3-.7 4.5-2v-4M16.5 7v4.5"/>',
  debrief: '<path d="M4.5 2.5h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8z"/><path d="M4.5 2.5v13M7.5 6h3.5M7.5 9h3.5"/>'
};
/* Six destinations. Each section's other pages are tabs at the top of the page; settings live under your name. */
const DEBRIEF_VIEWS = new Set(["journal", "history", "vault", "mspe", "dsettings"]);
const SECTIONS = [
  { k: "today", l: "Today", home: "today", pages: [["today", "Today"]] },
  { k: "calendar", l: "Calendar", home: "calendar", pages: [["calendar", "Calendar"]] },
  { k: "debrief", l: "Debrief", home: "journal", sp: "debrief", pages: [["journal", "Journal"], ["history", "History"], ["vault", "Residency vault"], ["mspe", "MSPE"]] },
  { k: "school", l: "School", home: "progress", sp: "school", pages: [["progress", "Progress"], ["rotations", "Rotations"], ["aways", "Away rotations"], ["schedule", "Schedule"], ["policies", "Policies"], ["ask", "Ask the policies"], ["health", "Policy health"]] },
  { k: "habits", l: "Habits", home: "habits", pages: [["habits", "Habits"]] },
  { k: "career", l: "Career", home: "career", pages: [["career", "Career"]] },
  { k: "projects", l: "Projects", home: "projects", pages: [["projects", "Projects"]] }
];
const SETTINGS_PAGES = [["profile", "Profile and settings"], ["connect", "Connections"], ["phone", "On your phone"], ["dsettings", "Debrief settings"]];
const TITLES = { offline: "Can't reach your plan", today: "Today", calendar: "Calendar", rotations: "Rotations", progress: "Progress", policies: "Policies", ask: "Ask the policies", health: "Policy health", profile: "Profile and settings", schedule: "Schedule", setup: "Set up", journal: "Journal", history: "History", vault: "Residency vault", mspe: "MSPE", dsettings: "Debrief settings", boot: "Charted", habits: "Habits", career: "Career", connect: "Connections", projects: "Projects", aways: "Away rotations", checkin: "Check in", phone: "Charted on your phone" };
const SPACE = { journal: "debrief", history: "debrief", vault: "debrief", mspe: "debrief", dsettings: "debrief", progress: "school", rotations: "school", policies: "school", ask: "school", health: "school", schedule: "school", aways: "school" };
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const KBD = IS_MAC ? "⌘K" : "Ctrl K";
const WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function sectionOf(v) {
  if (SETTINGS_PAGES.some(([k]) => k === v)) return null;
  return SECTIONS.find((s) => s.pages.some(([k]) => k === v)) || (getP(v) ? SECTIONS[3] : null);
}
function navLink(sec) {
  const cur = sectionOf(ui.view) === sec;
  return `<a href="#${sec.home}" class="${sec.sp ? "sp-" + sec.sp : ""}" ${cur ? 'aria-current="page"' : ""}><svg viewBox="0 0 18 18" aria-hidden="true">${ICON[sec.k] || ICON[sec.home]}</svg><span>${esc(sec.l)}</span></a>`;
}
function navHtml() {
  return `<button class="side-new" data-act="new" aria-keyshortcuts="N"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 3.5v11M3.5 9h11"/></svg><span>New debrief</span><kbd aria-hidden="true">N</kbd></button>
  <button class="side-search" data-act="palette" aria-keyshortcuts="${IS_MAC ? "Meta+K" : "Control+K"}"><svg viewBox="0 0 18 18" aria-hidden="true">${ICON.search}</svg><span>Search or ask</span><kbd aria-hidden="true">${KBD}</kbd></button>
  <nav class="nav" aria-label="Main">${SECTIONS.map(navLink).join("")}</nav>
  ${sideExtras()}`;
}
/* under the nav: the evening check-in and what's synced, so neither hides in Settings */
function sideExtras() {
  if (!booted || state.example) return "";
  const st = window.PERL_CONNECT && window.PERL_CONNECT.status ? window.PERL_CONNECT.status() : null;
  const left = window.PERL_CHECKIN ? window.PERL_CHECKIN.left() : 0;
  const ci = `<a class="side-row${ui.view === "checkin" ? " on" : ""}" href="#checkin" ${ui.view === "checkin" ? 'aria-current="page"' : ""}><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3 3 8-8"/></svg><span>Check in</span>${left ? `<span class="count-chip num" aria-label="${left} left today">${left}</span>` : ""}</a>`;
  if (!st) return `<div class="side-extra">${ci}</div>`;
  const dot = (k) => `<i class="sync-dot is-${st[k]}" aria-hidden="true"></i>`;
  const word = { ok: "synced", attn: "needs attention", off: "not connected" };
  const sync = st.canvas === "off" && st.outlook === "off"
    ? `<a class="side-row side-cta${ui.view === "connect" ? " on" : ""}" href="#connect"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7.5 10.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.8.8M10.5 7.5a3 3 0 0 0-4.2 0L3.7 10.1a3 3 0 0 0 4.2 4.2l.8-.8"/></svg><span>Connect Canvas and Outlook</span></a>`
    : `<a class="side-row${ui.view === "connect" ? " on" : ""}" href="#connect" aria-label="Connections: Canvas ${word[st.canvas]}, Outlook ${word[st.outlook]}"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9a6 6 0 0 1 10.3-4.2M15 9a6 6 0 0 1-10.3 4.2M13.5 2.5v2.5H11M4.5 15.5V13H7"/></svg><span class="sync-l">${dot("canvas")}Canvas ${dot("outlook")}Outlook</span></a>`;
  return `<div class="side-extra">${ci}${sync}</div>`;
}
/* the tabs inside a section: shown only when the section has more than one page */
function subnavHtml() {
  if (ui.view === "boot" || ui.view === "setup") return "";
  const settings = SETTINGS_PAGES.some(([k]) => k === ui.view);
  const sec = sectionOf(ui.view); const pages = settings ? SETTINGS_PAGES : sec && sec.pages.length > 1 ? sec.pages : null;
  if (!pages) return "";
  const cur = getP(ui.view) ? "policies" : ui.view;
  return `<nav class="subnav${sec && sec.sp ? " sp-" + sec.sp : ""}" aria-label="${esc(settings ? "Settings" : sec.l)} pages"><div class="subnav-in">${pages.map(([k, l]) => `<a href="#${k}" ${cur === k ? 'aria-current="page"' : ""}>${esc(l)}</a>`).join("")}</div></nav>`;
}
function initials() {
  const n = (state.profile.name || "").trim();
  if (n) return esc(n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase());
  return state.example ? "ES" : "Me";
}
function scopeHtml() {
  const pr = state.profile; const D = profileDates(pr);
  const who = (pr.name || "").trim() || (state.example ? "Example student" : "Your plan");
  const on = SETTINGS_PAGES.some(([k]) => k === ui.view);
  return `<div class="me${ui.meOpen ? " open" : ""}">
    <button class="scope" data-act="me-menu" aria-expanded="${ui.meOpen ? "true" : "false"}" aria-controls="me-menu" ${on ? 'aria-current="page"' : ""}><span class="avatar" aria-hidden="true">${initials()}</span><span class="scope-t"><b>${esc(who)}</b><small>Class of ${D.grad.getFullYear()} · ${esc(phaseLabel(pr.phase))}</small></span><svg class="me-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg></button>
    <div class="me-menu" id="me-menu" ${ui.meOpen ? "" : "hidden"}>
      <a href="#profile" ${ui.view === "profile" ? 'aria-current="page"' : ""}>Profile and settings</a>
      <a href="#connect" ${ui.view === "connect" ? 'aria-current="page"' : ""}>Connections</a>
      <a href="#phone" ${ui.view === "phone" ? 'aria-current="page"' : ""}>On your phone</a>
      <a href="#dsettings" ${ui.view === "dsettings" ? 'aria-current="page"' : ""}>Debrief settings</a>
      ${window.PERL_ACCOUNT ? `<a href="#profile" data-act="go-acct">Account</a>` : ""}
      ${themeBtn()}
    </div>
  </div>`;
}
const MARK = `<svg class="mark" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><g transform="translate(-0.2 0)"><path d="M23.13 24.5A11.1 11.1 0 1 1 17.54 5.01" fill="none" stroke="var(--debrief, #7d9fe0)" stroke-width="2.9" stroke-linecap="round"/><circle cx="25.61" cy="10.45" r="3.5" fill="var(--debrief, #7d9fe0)"/></g></svg>`;
function brandHtml() {
  return `<a class="brand" href="#today">${MARK}<span><b>Charted</b><small>Carle Illinois MD</small></span></a>`;
}
/* ----- light and dark: follows the device until you choose; the choice stays in this browser ----- */
/* ----- appearance: Dark (default), Light or Match device; one choice for both spaces, kept on this device -----
   Our own data-mode attribute, because the claude.ai viewer writes data-theme on the same element. */
const MODE_KEY = "perl.v1.mode";
const SUN = `<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="3.2"/><path d="M9 1.8v1.6M9 14.6v1.6M1.8 9h1.6M14.6 9h1.6M3.9 3.9L5 5M13 13l1.1 1.1M3.9 14.1L5 13M13 5l1.1-1.1"/></svg>`;
const MOON = `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M14.8 11.2A6.3 6.3 0 0 1 6.8 3.2a6.3 6.3 0 1 0 8 8z"/></svg>`;
function modeNow() { const m = document.documentElement.dataset.mode; return m === "light" || m === "system" ? m : "dark"; }
function themeNow() {
  const m = modeNow(); if (m !== "system") return m;
  const host = document.documentElement.dataset.theme; if (host === "light" || host === "dark") return host;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function modeChanged() {
  const meta = document.querySelector('meta[name="theme-color"]:not([media])'); if (meta) meta.content = themeNow() === "dark" ? "#0f1112" : "#ffffff";
  if (booted) { shell(); const c = $("#clock"); if (c) drawClock(c); }
  document.dispatchEvent(new CustomEvent("perl:mode", { detail: { mode: modeNow(), resolved: themeNow() } }));
}
function setMode(m) {
  m = m === "light" || m === "system" ? m : "dark";
  const root = document.documentElement;
  if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) { root.classList.add("theme-switching"); setTimeout(() => root.classList.remove("theme-switching"), 260); }
  root.dataset.mode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch { /* storage unavailable: the choice lasts for this visit */ }
  modeChanged();
}
function setTheme(v) { setMode(v === "auto" ? "system" : v); }
/* Match device follows the host's theme, then the OS */
new MutationObserver(() => { if (modeNow() === "system") modeChanged(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
if (window.matchMedia) { const mq = window.matchMedia("(prefers-color-scheme: light)"); if (mq.addEventListener) mq.addEventListener("change", () => { if (modeNow() === "system") modeChanged(); }); }
function themeBtn() {
  const dark = themeNow() === "dark";
  return `<button class="theme-btn" data-act="theme-toggle" role="switch" aria-checked="${dark}" title="Switch to ${dark ? "light" : "dark"} mode">${dark ? MOON : SUN}<span>${dark ? "Dark" : "Light"} mode</span><span class="theme-sw" aria-hidden="true"><i></i></span></button>`;
}
function themeSeg() {
  const cur = modeNow();
  return `<div class="seg" role="group" aria-label="Appearance">${[["system", "Match device"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button aria-pressed="${cur === k}" data-act="theme" data-v="${k}">${l}</button>`).join("")}</div>`;
}
function shell() {
  const sig = focusSig(document.activeElement);
  shellDraw();
  if (sig && sig.zone !== "view" && sig.zone !== "dbf-views") restoreFocus(sig, true);
}
function shellDraw() {
  $("#side").innerHTML = `${brandHtml()}${navHtml()}<div class="side-foot">${ui.sheet ? "" : scopeHtml()}<p>Unofficial student tool. Policies read Oct 26, 2026; the linked PDFs govern.</p></div>`;
  const sub = $("#subnav"); if (sub) sub.innerHTML = subnavHtml();
  $("#tb-name").textContent = TITLES[ui.view] || "Charted";
  document.title = ui.view === "boot" ? "Charted" : `${TITLES[ui.view] || "Charted"} · Charted`;
  const sheet = $("#sheet");
  sheet.dataset.open = ui.sheet ? "true" : "false";
  sheet.innerHTML = ui.sheet ? `<div class="sheet-top">${brandHtml()}<button class="btn small" data-act="sheet-close">Close</button></div>${navHtml()}<div class="side-foot">${scopeHtml()}</div>` : "";
}

function exampleNotice() { return ""; } /* the sandbox banner is drawn once, by render() */
/* when saving to the account isn't working, say so once at the top of every page, with the one thing to do about it */
function syncNotice() {
  if (ui.view === "boot" || state.example) return "";
  const pr = STORE.problem();
  if (ui.tabConflict) { const dev = ui.tabConflict === "account"; return `<div class="notice warn" role="alert"><span>${dev ? "Your plan also changed on another device while this one was offline" : "Charted is open in another tab"}, and the same thing was changed in both. ${dev ? "This device's" : "This tab's"} version is the one saved; everything else from both is kept.</span><span class="notice-acts"><button class="btn small" data-act="sync-reload">Use the ${dev ? "other device's" : "other tab's"}</button><button class="btn small quiet" data-act="sync-keep">Keep ${dev ? "this device's" : "this tab's"}</button></span></div>`; }
  if (pr === "session_expired") return `<div class="notice warn" role="status"><span>Your sign-in expired. Your changes are kept in this browser and save to your account when you sign in again.</span>${window.PERL_ACCOUNT && window.PERL_ACCOUNT.reauth ? `<button class="btn small" data-act="reauth">Sign in again</button>` : ""}</div>`;
  if (pr || STORE.offline()) return `<div class="notice warn" role="status"><span>Can't reach your account right now${STORE.offline() ? ", so this is the copy saved in this browser" : ""}. Changes are kept here and save when you're back online.</span><button class="btn small" data-act="sync-retry">Try again</button></div>`;
  return "";
}
function vOffline() {
  return `<div class="title-row"><div><h1>Can't reach your plan</h1><p class="finding">Charted couldn't load your saved plan from your account, and this browser has no copy of it yet. Nothing is lost: your plan is still in your account.</p></div></div>
  <section class="panel"><p>Check your connection, then try again. Charted also tries again on its own when your device is back online.</p>
  <div class="panel-foot"><span class="hint">${esc(STORE.problem() === "session_expired" ? "Your sign-in may have expired." : "Offline, or the server is down.")}</span><button class="btn primary small" data-act="sync-retry">Try again</button></div></section>`;
}
function sandboxNotice() {
  return state.example && ui.view !== "boot" ? `<div class="notice" role="status"><span>You're exploring example data: a Class of 2028 student on Track 2A. Nothing you change here is saved, and none of it touches your own plan.</span><button class="btn small" data-act="example-exit">Back to my plan</button></div>` : "";
}


/* ================= clock ================= */
function clockData() {
  const pr = state.profile; const D = profileDates(pr); const t = today();
  const start = D.matric; const end = addMonths(D.mdLimit, 2);
  const segs = [];
  if (D.ciStart) segs.push({ a: start, b: D.ciStart, label: "Preclerkship", fill: "var(--seg-1)", ink: "var(--text)" });
  if (D.ciStart && D.ciEnd) segs.push({ a: D.ciStart, b: D.ciEnd, label: "Clinical Immersion", fill: "var(--seg-2)", ink: "var(--text)" });
  if (D.fyStart) segs.push({ a: D.fyStart, b: D.grad, label: "Final Year", fill: "var(--seg-3)", ink: "var(--surface)" });
  if (!D.ciStart) segs.push({ a: start, b: D.grad, label: "MD program", fill: "var(--seg-2)", ink: "var(--text)" });
  const marks = personalItems().filter((i) => ["step1_limit", "step1_sched", "step2_deadline", "mspe_release", "grad", "md_limit"].includes(i.id))
    .filter((i) => !i.done).map((i) => ({ d: i.date, label: shortLabel(i.id, i.date), dashed: i.kind === "limit" }));
  return { start, end, t, segs, marks, D };
}
function shortLabel(id, d) {
  const m = fmtMonth(d);
  return { step1_limit: `Step 1 limit ${m}`, step1_sched: `Step 1 ${fmtShort(d)}`, step2_deadline: `Step 2 CK ${m}`, mspe_release: `MSPE ${fmtShort(d)}`, grad: `Graduate ${m}`, md_limit: `6-year limit ${m}` }[id] || m;
}
function drawClock(wrap) {
  if (!wrap) return;
  const W = Math.max(320, Math.floor(wrap.clientWidth));
  const { start, end, t, segs, marks } = clockData();
  const span = end - start;
  const x = (d) => Math.max(0, Math.min(W, ((d - start) / span) * W));
  const cw = 6.6;
  const labels = [...marks.map((m) => ({ ...m, cls: "lbl-ink" })), { d: t, label: `Today`, cls: "lbl-hue", today: true }]
    .map((l) => { const w = l.label.length * cw + 10; let x0 = x(l.d) - w / 2; x0 = Math.max(0, Math.min(W - w, x0)); return { ...l, x0, x1: x0 + w, w }; })
    .sort((a, b) => a.x0 - b.x0);
  const rows = [];
  for (const l of labels) { let r = 0; while (rows[r] !== undefined && rows[r] > l.x0 - 4) r++; rows[r] = l.x1; l.row = r; }
  const nRows = Math.max(1, rows.length);
  const rowH = 18; const top = nRows * rowH + 6; const barY = top + 4; const barH = 22; const axisY = barY + barH + 18;
  const H = axisY + 8;
  let s = `<svg class="clock" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline from matriculation to the 6-year limit">`;
  s += `<rect x="0" y="${barY}" width="${W}" height="${barH}" rx="4" fill="var(--raised)"/>`;
  for (const g of segs) {
    const a = x(g.a), b = x(g.b); if (b - a < 1) continue;
    s += `<rect x="${a.toFixed(1)}" y="${barY}" width="${(b - a).toFixed(1)}" height="${barH}" fill="${g.fill}"/>`;
    if (b - a > g.label.length * 6.8 + 16) s += `<text class="seg-label" x="${(a + 8).toFixed(1)}" y="${barY + 15}" style="fill:${g.ink}">${esc(g.label)}</text>`;
  }
  const tx = x(t);
  s += `<rect x="${tx.toFixed(1)}" y="${barY}" width="${(W - tx).toFixed(1)}" height="${barH}" fill="var(--surface)" opacity="0.45"/>`;
  s += `<rect x="0" y="${barY + barH + 3}" width="${tx.toFixed(1)}" height="3" rx="1.5" fill="var(--hue)"/>`;
  /* leader lines first, labels on top, so a line never crosses another mark's text */
  for (const l of labels) {
    const lx = x(l.d); const ly = top - l.row * rowH - 6;
    const stroke = l.today ? "var(--hue)" : "var(--text)";
    s += `<line x1="${lx.toFixed(1)}" x2="${lx.toFixed(1)}" y1="${ly + 4}" y2="${barY + barH}" stroke="${stroke}" stroke-width="${l.today ? 1.5 : 1}" ${l.dashed ? 'stroke-dasharray="3 3"' : ""} opacity="${l.today ? 1 : 0.75}"/>`;
  }
  for (const l of labels) {
    const ly = top - l.row * rowH - 6;
    s += `<rect x="${(l.x0 + 2).toFixed(1)}" y="${ly - 12}" width="${(l.w - 4).toFixed(1)}" height="16" rx="3" fill="var(--surface)"/>`;
    s += `<text class="${l.cls}" x="${(l.x0 + l.w / 2).toFixed(1)}" y="${ly}" text-anchor="middle">${esc(l.label)}</text>`;
  }
  for (let y = start.getFullYear() + 1; y <= end.getFullYear(); y++) {
    const d = new Date(y, 0, 1); const xx = x(d); if (xx < 16 || xx > W - 16) continue;
    s += `<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${barY + barH + 8}" y2="${barY + barH + 12}" stroke="var(--control)"/>`;
    s += `<text x="${xx.toFixed(1)}" y="${axisY + 2}" text-anchor="middle">${y}</text>`;
  }
  s += `</svg>`;
  wrap.innerHTML = s;
}

/* ================= rotations, dated items, visuals ================= */
const ROT_KINDS = { clerkship: "Clerkship", elective: "Elective", subi: "Sub-I", other: "Other" };
const CLERKSHIPS = ["Family Medicine", "Internal Medicine", "Neurology", "Psychiatry", "Obstetrics and Gynecology", "Pediatrics", "Surgery"];

/* Deadlines each rotation creates under the policies. */
function rotationItems() {
  const out = [];
  for (const r of (state.rotations || []).filter((x) => !guessedPast(x))) {
    const s = parseD(r.start), e = parseD(r.end);
    if (!s || !e || e < s) continue;
    const nm = r.name;
    if (r.kind === "elective" || r.kind === "subi") out.push({ date: addBDays(s, -14), label: `Last day to drop ${nm}`, short: "Drop by", rule: "14 business days before it starts", code: "APS-30", w: 3, rot: r.id });
    if (r.kind === "clerkship" && diffDays(s, e) >= 27) out.push({ date: addDays(s, Math.round(diffDays(s, e) / 2)), label: `${nm}: midpoint feedback and practice shelf`, short: "Midpoint", rule: "Around the clerkship midpoint", code: "APS-12", w: 1, rot: r.id });
    out.push({ date: e, label: `${nm} ends`, short: "Ends", rule: r.kind === "clerkship" ? "Last day; the shelf exam comes at the end" : "Last day of the rotation", code: r.kind === "clerkship" ? "APS-16" : "APS-30", w: 2, rot: r.id });
    out.push({ date: addDays(e, 7), label: `Evaluations due for ${nm}`, short: "Evals due", rule: "Within 1 week of the end", code: "APS-47", w: 3, rot: r.id });
    if (r.kind === "clerkship") {
      out.push({ date: addDays(e, 28), label: `${nm} grade due to you`, short: "Grade due", rule: "Within 4 weeks of the end", code: "APS-13", w: 1, rot: r.id });
      out.push({ date: addDays(e, 35), label: `Last day to ask for a ${nm} grade review`, short: "Grade review by", rule: "In writing, 5 weeks after the end", code: "APS-16", w: 3, rot: r.id });
    }
  }
  return out;
}
const HOLIDAY_RE = /holiday|Thanksgiving|MLK|Christmas|New Year/i;
/* Every dated thing for this student: profile dates, rotations, the calendar. */
function allDated() {
  const phase = state.profile.phase;
  const mine = personalItems().filter((i) => !i.done).map((i) => ({ date: i.monthOnly ? new Date(i.date.getFullYear(), i.date.getMonth(), 1) : i.date, label: i.label, rule: i.rule, code: i.code, w: i.kind === "limit" ? 4 : i.kind === "school" ? 3 : 2, monthOnly: i.monthOnly }));
  const cal = CAL_EVENTS.filter((e) => e.who === "all" || e.who.split(",").includes(phase)).map((e) => {
    const hol = HOLIDAY_RE.test(e.l);
    return { date: parseD(e.d), label: e.l, rule: e.src === "Calendar" ? "AY2026-27 academic calendar" : "", code: e.src === "Calendar" ? "" : e.src, w: hol ? 0 : /deadline|due|application/i.test(e.l) ? 3 : 1, holiday: hol };
  });
  const feeds = typeof window.PERL_FEEDS === "function" ? window.PERL_FEEDS() : [];
  /* feature modules' own dated items (FMCC night clinic, project milestones); read-only here, like feeds */
  for (const f of window.PERL_DATED || []) { try { feeds.push(...(f() || [])); } catch { /* a module's bad item never breaks the plan */ } }   /* connect.js: Outlook, Canvas and .ics events; read-only, never checked off */
  return [...mine, ...rotationItems(), ...schedItems(), ...cal, ...feeds].filter((x) => x.date).map((x) => ({ ...x, done: !x.feed && !!(state.done && state.done[itemKey(x)]) }));
}
function upcoming(limit) {
  const t = today();
  return allDated().filter((x) => x.date >= t && !x.done).sort((a, b) => a.date - b.date || (b.w || 0) - (a.w || 0)).slice(0, limit);
}
function busiestWeek() {
  const t = today(); const end = addDays(t, 365);
  const xs = allDated().filter((x) => !x.holiday && !x.done && x.date >= t && x.date <= end).sort((a, b) => a.date - b.date);
  let best = null;
  for (const x of xs) {
    const b = addDays(x.date, 6); const n = xs.filter((y) => y.date >= x.date && y.date <= b).length;
    if (!best || n > best.n) best = { a: x.date, b, n };
  }
  return best && best.n >= 3 ? best : null;
}
function fmtRange(a, b) {
  const yr = a.getFullYear() !== today().getFullYear() ? `, ${a.getFullYear()}` : "";
  return a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}${yr}` : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}${yr}`;
}

/* ----- rotations as objects with dates ----- */
const ROT_SHORT = { "Obstetrics and Gynecology": "OB/GYN", "Internal Medicine Sub-Internship": "IM Sub-I" };
function rotShort(n) { return ROT_SHORT[n] || n; }
function rotsParsed() {
  return (state.rotations || []).filter((r) => !guessedPast(r)).map((r) => ({ ...r, s: parseD(r.start), e: parseD(r.end) })).filter((r) => r.s && r.e && r.e >= r.s).sort((a, b) => a.s - b.s);
}
function rotById(id) { return rotsParsed().find((r) => r.id === id) || null; }
function currentRotation() { const t = today(); return rotsParsed().filter((r) => r.s <= t && r.e >= t).sort((a, b) => a.e - b.e)[0] || null; }
function nextRotation() { const t = today(); return rotsParsed().find((r) => r.s > t) || null; }
function kindOf(it) { if (!it.rot) return ""; const r = (state.rotations || []).find((x) => x.id === it.rot); return r ? r.kind : ""; }
/* Colour means status. soon/slipped = amber, breach = red, done = teal, the rest neutral. */
const SOON = 14;
function itemState(u) {
  if (state.done && state.done[itemKey(u)]) return "done";
  if (u.holiday) return "hol";
  const n = diffDays(today(), u.date);
  if (u.w === 4 && n < 0) return "breach";
  if (n < 0) return !u.feed && (u.w || 0) >= 2 && n >= -14 ? "slipped" : "past"; /* calendar-feed items are read-only, so a past one is just past */
  if (n <= SOON && (u.w || 0) >= 2) return "soon";
  return "later";
}
function dueText(u, st) {
  const n = diffDays(today(), u.date);
  if (st === "done") return "Done";
  if (st === "breach") return "Limit passed";
  if (st === "slipped") return "Passed, not checked off";
  if (st === "past" || st === "hol") return n < 0 ? relDays(u.date).replace(/^./, (c) => c.toUpperCase()) : u.holiday ? "Holiday" : "";
  if (u.monthOnly) return `In ${MONTHL[u.date.getMonth()]}`;
  if (n === 0) return "Today"; if (n === 1) return "Tomorrow";
  if (n <= 20) return `In ${n} days`; if (n <= 60) return `In ${Math.round(n / 7)} weeks`;
  return relDays(u.date).replace(/^./, (c) => c.toUpperCase());
}
const STATE_TONE = { done: "teal", soon: "amber", slipped: "amber", breach: "red" };
function dotKind(it) { const st = itemState(it); return st === "slipped" ? "soon" : st === "past" ? "later" : st; }
function chipText(it) {
  if (it.rot && it.short) { const r = (state.rotations || []).find((x) => x.id === it.rot); if (r) return `${rotShort(r.name)}: ${it.short.toLowerCase()}`; }
  return it.label;
}
function byDayMap(items) { const m = new Map(); for (const it of items) { const k = isoD(it.date); if (!m.has(k)) m.set(k, []); m.get(k).push(it); } return m; }
function weekStart(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
function relWhen(d) {
  const n = diffDays(today(), d);
  if (n === 0) return "today"; if (n === 1) return "tomorrow";
  if (n > 1 && n < 7) return `on ${WDL[d.getDay()]}`;
  return relDays(d);
}
const KIND_KEY = `<span class="key"><span><i class="sw k-clerkship"></i>Clerkship</span><span><i class="sw k-elective"></i>Elective</span><span><i class="sw k-subi"></i>Sub-I</span></span>`;
const DOT_KEY = `<span class="key"><span><i class="dot soon"></i>Needs you, next 14 days</span><span><i class="dot later"></i>Later</span><span><i class="dot done"></i>Done</span><span><i class="dot breach"></i>Limit passed</span><span><i class="dot hol"></i>Holiday</span></span>`;
const CHEV_L = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>`;
const CHEV_R = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg>`;
const XMARK = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

/* ----- month grid: rotations as bands across the week, deadlines inside the day ----- */
function monthHtml(m) {
  const t = today();
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  const start = weekStart(first); const end = addDays(weekStart(last), 6);
  const all = allDated(); const byDay = byDayMap(all); const rots = rotsParsed();
  let weeks = "";
  for (let ws = start; ws <= end; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const segs = rots.filter((r) => r.s <= we && r.e >= ws).map((r) => ({ r, a: r.s < ws ? ws : r.s, b: r.e > we ? we : r.e }));
    const lanes = [];
    for (const g of segs) { let l = 0; while (lanes[l] && lanes[l] >= g.a) l++; lanes[l] = g.b; g.lane = l; }
    const nl = Math.max(1, lanes.length);
    let cells = "", nums = "", bands = "", items = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i); const k = isoD(d);
      const its = (byDay.get(k) || []).filter((x) => x.short !== "Ends").concat(schedFor(k).filter((e) => e.kind === "call" || e.kind === "off").map((e) => ({ date: d, label: `${e.title}${e.time ? " " + e.time : ""}`, w: 1, schedEv: true })));
      const real = its.filter((x) => !x.holiday);
      const open = real.filter((x) => !x.done).length;
      const out = d.getMonth() !== m.getMonth();
      const lab = `${WDL[d.getDay()]}, ${MONTHL[d.getMonth()]} ${d.getDate()}${real.length ? `, ${plural(real.length, "date")}` : ""}${its.some((x) => x.holiday) ? ", holiday" : ""}${+d === +t ? ", today" : ""}`;
      cells += `<button class="mc-day${out ? " out" : ""}${+d === +t ? " today" : ""}${d.getDay() % 6 === 0 ? " we" : ""}${ui.drawer && ui.drawer.type === "day" && ui.drawer.id === k ? " sel" : ""}" style="grid-column:${i + 1}" data-act="day" data-d="${k}" aria-label="${esc(lab)}"></button>`;
      nums += `<span class="mc-num${+d === +t ? " today" : ""}${out ? " out" : ""}" style="grid-column:${i + 1}" aria-hidden="true">${d.getDate() === 1 ? `${MONTHS[d.getMonth()]} 1` : d.getDate()}</span>`;
      if (its.length) {
        const sorted = [...its].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.w || 0) - (a.w || 0));
        const show = sorted.slice(0, 3); const more = sorted.length - show.length;
        items += `<span class="mc-items${out ? " out" : ""}" style="grid-column:${i + 1}" aria-hidden="true">${show.map((x) => `<span class="mc-chip${x.done ? " done" : ""}${x.holiday ? " hol" : ""}"><i class="dot ${dotKind(x)}"></i><span class="t">${esc(chipText(x))}</span></span>`).join("")}${more > 0 ? `<span class="mc-more">${more} more</span>` : ""}${open ? `<span class="mc-dots">${real.filter((x) => !x.done).slice(0, 4).map((x) => `<i class="dot ${dotKind(x)}"></i>`).join("")}</span>` : ""}</span>`;
      }
    }
    for (const g of segs) {
      const c0 = diffDays(ws, g.a) + 1; const c1 = diffDays(ws, g.b) + 2;
      const contL = g.a > g.r.s ? " cont-l" : ""; const contR = g.b < g.r.e ? " cont-r" : "";
      bands += `<button class="mc-band k-${esc(g.r.kind)}${contL}${contR}" style="grid-column:${c0} / ${c1};grid-row:${2 + g.lane}" data-act="open-rot" data-id="${esc(g.r.id)}" aria-label="${esc(g.r.name)}, ${fmtShort(g.r.s)} to ${fmtShort(g.r.e)}"><span>${esc(rotShort(g.r.name))}</span>${!contR && c1 - c0 >= 2 ? (() => { const n = diffDays(t, g.r.e); return `<small class="${n >= 0 && n <= SOON ? "amber" : ""}">ends ${WD[g.r.e.getDay()]}</small>`; })() : ""}</button>`;
    }
    weeks += `<div class="mc-wk" style="--lanes:${nl}">${cells}${nums}${bands}${items}</div>`;
  }
  const inMonth = all.filter((x) => x.date >= first && x.date <= last && x.short !== "Ends").sort((a, b) => a.date - b.date || (b.w || 0) - (a.w || 0));
  return `<section class="panel mc-panel" aria-label="${MONTHL[m.getMonth()]} ${m.getFullYear()}">
    <div class="mc-dow" aria-hidden="true">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="mc">${weeks}</div>
    <div class="mc-foot">${KIND_KEY}${DOT_KEY}</div>
  </section>
  <section class="panel mc-list" aria-labelledby="h-mlist">
    <div class="panel-head"><h2 id="h-mlist">${MONTHL[m.getMonth()]} at a glance</h2><span class="aside num">${plural(inMonth.filter((x) => !x.holiday).length, "date")}</span></div>
    ${inMonth.length ? `<ul class="rows">${inMonth.map((x) => dateRow(x)).join("")}</ul>` : `<div class="empty">Nothing dated this month.</div>`}
  </section>`;
}

/* ----- year: a heat calendar of the next 12 months ----- */
function heatLevel(w) { return w === 0 ? 0 : w <= 2 ? 1 : w <= 4 ? 2 : w <= 6 ? 3 : 4; }
function yearHtml() {
  const t = today(); const byDay = byDayMap(allDated());
  const start = new Date(t.getFullYear(), t.getMonth(), 1);
  let months = "";
  for (let mm = 0; mm < 12; mm++) {
    const first = new Date(start.getFullYear(), start.getMonth() + mm, 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    let count = 0; let cells = "MTWTFSS".split("").map((d) => `<span class="hc-dow" aria-hidden="true">${d}</span>`).join("");
    for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells += `<span class="hc-pad" aria-hidden="true"></span>`;
    for (let d = 1; d <= days; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d); const k = isoD(date);
      const its = byDay.get(k) || []; const real = its.filter((x) => !x.holiday && !x.done); const hol = its.some((x) => x.holiday);
      const w = real.reduce((s, x) => s + (x.w || 1), 0); if (date >= t) count += real.length;
      const cls = `hc-day lv${heatLevel(w)}${date.getDay() % 6 === 0 ? " we" : ""}${hol ? " hol" : ""}${real.some((x) => ["soon", "slipped"].includes(itemState(x))) ? " soon" : ""}${+date === +t ? " today" : ""}${date < t ? " past" : ""}`;
      const lab = `${WDL[date.getDay()]}, ${fmt(date)}${real.length ? `, ${plural(real.length, "date")}` : ""}${hol ? ", holiday" : ""}${+date === +t ? ", today" : ""}`;
      cells += its.length ? `<button class="${cls}" data-act="day" data-d="${k}" aria-label="${esc(lab)}" title="${esc(its.map((x) => x.label).join(" · "))}">${d}</button>` : `<span class="${cls}" aria-hidden="true">${d}</span>`;
    }
    months += `<div class="hc-month"><h3>${MONTHL[first.getMonth()]}${first.getFullYear() !== t.getFullYear() ? ` ${first.getFullYear()}` : ""}<span class="num">${count ? plural(count, "date") : "None"}</span></h3><div class="hc-grid">${cells}</div></div>`;
  }
  const busy = busiestWeek();
  return `<section class="panel" aria-labelledby="h-year">
    <div class="panel-head"><h2 id="h-year">Deadlines by day</h2><span class="hc-legend" aria-hidden="true"><span>Fewer</span><i class="hc-day lv1"></i><i class="hc-day lv2"></i><i class="hc-day lv3"></i><i class="hc-day lv4"></i><span>More</span><i class="hc-day lv0 soon"></i><span>Needs you within 14 days</span></span></div>
    <div class="hc-months">${months}</div>
    <div class="panel-foot"><span class="hint">Lighter days hold more, and heavier, deadlines. Select a day to see it.${busy ? ` Busiest week: ${fmtRange(busy.a, busy.b)}, with ${plural(busy.n, "date")}.` : ""}</span></div>
  </section>`;
}

/* ----- timeline: every rotation as a bar, with the deadlines it creates ----- */
function timelineHtml() {
  const rots = rotsParsed(); const t = today();
  if (!rots.length) return `<section class="panel" aria-labelledby="h-tl"><div class="panel-head"><h2 id="h-tl">Rotation timeline</h2></div><div class="empty">No rotations yet. <a class="link" href="#rotations">Add them or import your schedule</a> and they line up here with their deadlines.</div></section>`;
  const s0 = rots[0].s < t ? rots[0].s : t;
  const start = new Date(s0.getFullYear(), s0.getMonth(), 1);
  const lastEnd = rots.reduce((mx, r) => (addDays(r.e, 36) > mx ? addDays(r.e, 36) : mx), t);
  const end = new Date(lastEnd.getFullYear(), lastEnd.getMonth() + 1, 1);
  const span = end - start; const pc = (d) => Math.max(0, Math.min(100, ((d - start) / span) * 100)).toFixed(3);
  let axis = "";
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    axis += `<span class="${d.getMonth() % 3 === 0 ? "q" : ""}" style="left:${pc(d)}%;width:${(pc(nx) - pc(d)).toFixed(3)}%">${MONTHS[d.getMonth()]}${d.getMonth() === 0 ? ` <small>${d.getFullYear()}</small>` : ""}</span>`;
  }
  const ri = rotationItems().map((x) => ({ ...x, done: !!state.done[itemKey(x)] }));
  const rows = rots.map((r) => {
    const ticks = ri.filter((x) => x.rot === r.id && x.short !== "Ends" && x.short !== "Midpoint").map((x) => `<i class="tl-tick ${dotKind(x)}" style="left:${pc(x.date)}%" title="${esc(`${x.short} ${fmtShort(x.date)}`)}"></i>`).join("");
    const now = r.s <= t && r.e >= t;
    return `<div class="tl-row${now ? " now" : ""}"><button class="tl-label" data-act="open-rot" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(ROT_KINDS[r.kind] || "Rotation")} · ${fmtRange(r.s, r.e)}</small></button>
      <div class="tl-track"><button class="tl-bar k-${esc(r.kind)}" style="left:${pc(r.s)}%;width:${Math.max(0.6, pc(addDays(r.e, 1)) - pc(r.s)).toFixed(3)}%" data-act="open-rot" data-id="${esc(r.id)}" aria-label="${esc(r.name)}, ${fmtShort(r.s)} to ${fmtShort(r.e)}">${(pc(addDays(r.e, 1)) - pc(r.s)) * 8.4 > rotShort(r.name).length * 7 + 20 ? `<span>${esc(rotShort(r.name))}</span>` : ""}</button>${ticks}</div></div>`;
  }).join("");
  const graded = rots.map(gradeStatus).filter((g) => g && g[2] !== null); const onTime = graded.filter((g) => g[2]).length;
  return `<section class="panel tl" aria-labelledby="h-tl">
    <div class="panel-head"><h2 id="h-tl">${MONTHS[start.getMonth()]} ${start.getFullYear()} to ${MONTHS[addDays(end, -1).getMonth()]} ${addDays(end, -1).getFullYear()}</h2><span class="aside num">${graded.length ? `Grades posted within APS-13's 4 weeks: ${onTime} of ${graded.length}` : plural(rots.length, "rotation")}</span></div>
    <div class="tl-body" style="--now:${pc(t)}">
      <div class="tl-row tl-axis" aria-hidden="true"><span></span><div class="tl-track">${axis}</div></div>
      ${rows}
      <div class="tl-now" aria-hidden="true"><span>Today</span></div>
    </div>
    <div class="panel-foot">${KIND_KEY}<span class="key"><span><i class="tl-tick demo later"></i>Evaluation, grade and review deadlines</span><span><i class="tl-tick demo soon"></i>Needs you, next 14 days</span><span><i class="tl-tick demo done"></i>Done</span></span></div>
  </section>`;
}

/* ----- the whole program: matriculation clock ----- */
function programPanel() {
  const pr = state.profile; const D = profileDates(pr); const t = today();
  const s1done = pr.step1 === "passed"; const left = diffDays(t, D.mdLimit);
  return `<section class="panel" aria-labelledby="h-clock">
    <div class="panel-head"><h2 id="h-clock">Your whole program</h2><span class="aside">From ${fmt(D.matric)} to the 6-year MD limit (APS-33)</span></div>
    <div class="clock-svg-wrap" id="clock"></div>
    <ul class="rows plain clock-key">${personalItems().filter((i) => ["step1_limit", "step2_deadline", "mspe_release", "grad", "md_limit"].includes(i.id)).map((i) => `<li><div class="what"><span class="t">${esc(i.label)}</span><small>${esc(i.rule)}</small></div><div class="tail num">${i.monthOnly ? fmtMonth(i.date) : fmtShort(i.date)}</div></li>`).join("")}</ul>
    <div class="figures">
      <div class="fig"><span class="k">${s1done ? "Step 1" : "Step 1 limit"}</span><span class="v">${s1done ? "Passed" : `${Math.max(0, diffDays(t, D.step1Limit))}<small>days</small>`}</span><span class="sub">${s1done ? "3-year limit met" : fmt(D.step1Limit)}</span></div>
      <div class="fig"><span class="k">Into the program</span><span class="v">${Math.max(0, monthsBetween(D.matric, t))}<small>of 48 months</small></span><span class="sub">${esc(phaseLabel(pr.phase))}</span></div>
      <div class="fig"><span class="k">Graduation target</span><span class="v">${MONTHS[D.grad.getMonth()]} ${D.grad.getFullYear()}</span><span class="sub">${relDays(D.grad)}</span></div>
      <div class="fig"><span class="k">Room before the 6-year limit</span><span class="v">${Math.max(0, monthsBetween(D.grad, D.mdLimit))}<small>months</small></span><span class="sub">Limit ${fmtMonth(D.mdLimit)}${left > 0 ? "" : ", passed"}</span></div>
    </div>
  </section>`;
}

function vCalendar() {
  const t = today(); const mode = ui.calMode || "month";
  const m = parseD(ui.calMonth) || new Date(t.getFullYear(), t.getMonth(), 1);
  const first = new Date(m.getFullYear(), m.getMonth(), 1); const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  let title = "Rotation timeline", finding = "";
  if (mode === "month") {
    title = `${MONTHL[m.getMonth()]} ${m.getFullYear()}`;
    const n = allDated().filter((x) => !x.holiday && x.short !== "Ends" && x.date >= first && x.date <= last).length;
    const rs = rotsParsed().filter((r) => r.s <= last && r.e >= first).map((r) => rotShort(r.name));
    finding = `${n ? plural(n, "date") : "No dates"} this month${rs.length ? `, during ${rs.length > 2 ? rs.slice(0, -1).join(", ") + " and " + rs[rs.length - 1] : rs.join(" and ")}` : ""}. Select a day or a rotation to see what it needs.`;
  } else if (mode === "year") {
    title = "The year ahead";
    finding = "Twelve months of deadlines, lighter where more fall on the same day. Amber marks the ones that need you in the next 14 days.";
  } else finding = "Each rotation with the evaluation, grade and grade-review deadlines it sets off.";
  const nav = mode === "month" ? `<div class="cal-nav"><button class="btn icon small" data-act="cal-prev" aria-label="Previous month">${CHEV_L}</button><button class="btn small" data-act="cal-today" ${+first === +new Date(t.getFullYear(), t.getMonth(), 1) ? 'aria-pressed="true"' : ""}>Today</button><button class="btn icon small" data-act="cal-next" aria-label="Next month">${CHEV_R}</button></div>` : "";
  const modes = `<div class="seg" role="group" aria-label="Calendar view">${[["month", "Month"], ["year", "Year"], ["timeline", "Timeline"]].map(([k, l]) => `<button aria-pressed="${mode === k}" data-act="cal-mode" data-mode="${k}">${l}</button>`).join("")}</div>`;
  const ics = `<button class="btn small" data-act="export-ics">${CAL_PLUS} Add all to my calendar</button>`;
  const body = mode === "month" ? monthHtml(m) : mode === "year" ? yearHtml() : timelineHtml();
  return `${exampleNotice()}
  <div class="title-row"><div><h1>${title}</h1><p class="finding">${finding}</p></div><div class="title-actions">${nav}${modes}${ics}</div></div>
  ${body}`;
}

/* ================= drawer: the details of a day, a rotation or a policy ================= */
function drawerHtml() {
  const d = ui.drawer; if (!d) return "";
  const close = `<button class="btn icon small" data-act="drawer-close" aria-label="Close">${XMARK}</button>`;
  if (d.type === "policy") {
    const p = getP(d.id); if (!p) return "";
    return `<div class="dr-head"><div class="dr-t"><p class="dr-k">${esc(p.c)} · ${esc(p.g)}</p><h2 id="dr-title">${esc(p.t)}</h2></div>${close}</div>
      <div class="dr-body">${policyBody(p, "dr")}</div>`;
  }
  if (d.type === "day") {
    const dt = parseD(d.id); if (!dt) return "";
    const its = allDated().filter((x) => isoD(x.date) === d.id).sort((a, b) => (b.w || 0) - (a.w || 0));
    const rs = rotsParsed().filter((r) => r.s <= dt && r.e >= dt);
    return `<div class="dr-head"><div class="dr-t"><p class="dr-k">${relDays(dt) === "today" ? "Today" : relDays(dt).replace(/^./, (c) => c.toUpperCase())}</p><h2 id="dr-title">${WDL[dt.getDay()]}, ${MONTHL[dt.getMonth()]} ${dt.getDate()}</h2></div>${close}</div>
      <div class="dr-body">
        ${rs.map((r) => `<button class="rot-card k-${esc(r.kind)}" data-act="open-rot" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>Day ${diffDays(r.s, dt) + 1} of ${diffDays(r.s, r.e) + 1} · ${esc(ROT_KINDS[r.kind] || "Rotation")} until ${fmtShort(r.e)}</small></button>`).join("")}
        ${schedFor(d.id).length ? `<h3>Your ${esc(rotShort(schedFor(d.id)[0].sched))} schedule</h3><ul class="day-list">${schedFor(d.id).map(evRow).join("")}</ul><h3>Deadlines</h3>` : ""}
        ${its.length ? `<ul class="rows">${its.map((x) => dateRow(x)).join("")}</ul>` : `<div class="empty">${schedFor(d.id).length ? "No deadlines on this day." : "Nothing dated on this day."}</div>`}
      </div>`;
  }
  if (d.type === "rot") {
    const r = rotById(d.id); if (!r) return "";
    const t = today(); const len = diffDays(r.s, r.e) + 1;
    const its = rotationItems().filter((x) => x.rot === r.id).map((x) => ({ ...x, done: !!state.done[itemKey(x)] })).sort((a, b) => a.date - b.date);
    const g = gradeStatus(r);
    const st = r.e < t ? "Finished" : r.s <= t ? `Day ${diffDays(r.s, t) + 1} of ${len}` : `Starts ${relDays(r.s)}`;
    return `<div class="dr-head"><div class="dr-t"><p class="dr-k">${esc(ROT_KINDS[r.kind] || "Rotation")} · ${esc(st)}</p><h2 id="dr-title">${esc(r.name)}</h2></div>${close}</div>
      <div class="dr-body">
        <div class="dr-span k-${esc(r.kind)}"><span>${WD[r.s.getDay()]}, ${fmt(r.s)}</span><span class="num">${plural(Math.round(len / 7), "week")}</span><span>${WD[r.e.getDay()]}, ${fmt(r.e)}</span></div>
        ${r.s <= t && r.e >= t ? `<span class="meter" role="img" aria-label="Day ${diffDays(r.s, t) + 1} of ${len}"><span style="width:${(((diffDays(r.s, t) + 1) / len) * 100).toFixed(1)}%"></span></span>` : ""}
        <h3>What it sets off</h3>
        <ul class="rows">${its.map((x) => dateRow(x)).join("")}</ul>
        ${g ? `<h3>Grade</h3><div class="gp"><label for="dgp-${esc(r.id)}">Posted on</label><input type="date" id="dgp-${esc(r.id)}" data-act="grade-posted" data-id="${esc(r.id)}" value="${esc(r.gradePosted || "")}"><span class="pill ${g[0]}">${esc(g[1])}</span></div><p class="hint">APS-13 says 4 weeks; LCME element 9.8 says no more than 6.</p>` : ""}
        <div class="dr-foot"><a class="btn small" href="#rotations">Edit rotations</a><button class="btn quiet small danger" data-act="del-rot" data-id="${esc(r.id)}">Remove ${esc(rotShort(r.name))}</button></div>
      </div>`;
  }
  return "";
}
let drawerTimer = null; let drawerReturn = null; let drawerReturnSig = null;
function renderDrawer() {
  const el = $("#drawer"); if (!el) return;
  if (!ui.drawer) return;
  /* a page re-render (a check-off settling, a sync) redraws the open drawer too: keep focus where it was inside it */
  const a = document.activeElement; const inside = !!(a && a !== el && el.contains(a));
  const was = inside ? { id: a.id, ds: JSON.stringify(a.dataset || {}), tag: a.tagName } : null;
  const body = el.querySelector(".dr-body"); const top = body ? body.scrollTop : 0;
  el.innerHTML = drawerHtml();
  const nb = el.querySelector(".dr-body"); if (nb) nb.scrollTop = top;
  if (was) {
    const t = (was.id && document.getElementById(was.id)) || [...el.querySelectorAll(was.tag)].find((x) => JSON.stringify(x.dataset || {}) === was.ds) || el.querySelector("[data-act='drawer-close']");
    if (t) t.focus({ preventScroll: true });
  }
}
function openDrawer(type, id) {
  const el = $("#drawer"); if (!el) return;
  const wasOpen = !!ui.drawer;
  if (!wasOpen) { drawerReturn = document.activeElement; drawerReturnSig = focusSig(drawerReturn); }
  clearTimeout(drawerTimer);
  ui.drawer = { type, id };
  el.innerHTML = drawerHtml();
  el.dataset.open = "true"; $("#scrim").dataset.open = "true";
  if (ui.view === "calendar") render();
  setTimeout(() => el.querySelector("[data-act='drawer-close']")?.focus({ preventScroll: true }), 30);
}
function closeDrawer() {
  const el = $("#drawer"); if (!el || !ui.drawer) return;
  ui.drawer = null; el.dataset.open = "false"; $("#scrim").dataset.open = "false";
  drawerTimer = setTimeout(() => { if (!ui.drawer) el.innerHTML = ""; }, 360);
  if (ui.view === "calendar") render();
  if (drawerReturn && drawerReturn.isConnected) drawerReturn.focus({ preventScroll: true });
  else if (drawerReturnSig) { if (el.contains(document.activeElement)) document.activeElement.blur(); restoreFocus(drawerReturnSig); } /* the opener was redrawn meanwhile: its replacement */
  drawerReturn = null; drawerReturnSig = null;
}

/* ================= command palette: search, jump, ask ================= */
const pal = { open: false, q: "", idx: 0, items: [] };
function go(view) { if (location.hash === `#${view}`) render(); else location.hash = view; }
function palCommands() {
  const cmds = [
    { g: "Actions", icon: "action", label: "Check in for today", hint: "Habits and a quick debrief", run: () => go("checkin") },
    { g: "Actions", icon: "action", label: "Connect Canvas", hint: "Assignments and due dates", run: () => { go("connect"); setTimeout(() => document.getElementById("cn-url-canvas")?.focus(), 80); } },
    { g: "Actions", icon: "action", label: "Connect Outlook", hint: "Your calendar", run: () => { go("connect"); setTimeout(() => document.getElementById("cn-url-outlook")?.focus(), 80); } },
    { g: "Actions", icon: "action", label: "Get Charted on my phone", hint: "Install it in two taps", run: () => go("phone") },
    { g: "Actions", icon: "action", label: "Add a rotation", run: () => { go("rotations"); setTimeout(() => $("#rot-name")?.focus(), 60); } },
    { g: "Actions", icon: "action", label: "Pick my clerkship track", hint: "Fills in your year", run: () => { go("schedule"); setTimeout(() => document.getElementById("track")?.scrollIntoView({ block: "start" }), 60); } },
    { g: "Actions", icon: "action", label: "Drop in my clerkship schedule", hint: "The Excel file your clerkship sends", run: () => { go("schedule"); setTimeout(() => { document.getElementById("drop-sched")?.scrollIntoView({ block: "start" }); document.getElementById("sched-x")?.click(); }, 80); } },
    ...(schedule() ? Object.keys(schedule().tracks).map((k) => ({ g: "Tracks", icon: "rotations", label: `Use Track ${k}`, hint: schedule().tracks[k].map((x) => TRACK_SHORT[x.n] || x.n).join(" → "), run: () => applyTrack(k) })) : []),
    { g: "Actions", icon: "action", label: "Import a rotation schedule", hint: "Paste it, or a .csv or .ics file", run: () => { ui.sched.open = true; go("rotations"); setTimeout(() => $("#sched-text")?.focus(), 60); } },
    { g: "Actions", icon: "action", label: "Import my degree audit", hint: "Read in this browser", run: () => { ui.audit.open = true; ui.audit.status = "idle"; go("progress"); } },
    { g: "Actions", icon: "action", label: "Work out a deadline", hint: "From a date and a rule", run: () => { go("rotations"); setTimeout(() => $("#calc-base")?.focus(), 60); } },
    { g: "Actions", icon: "action", label: "Add all deadlines to my calendar", hint: "Saves an .ics file with reminders", run: exportIcs },
    { g: "Actions", icon: "action", label: "Download the policy health report", hint: "CSV", run: exportHealthCsv },
    ...PHASES.filter((p) => p.k !== state.profile.phase).map((p) => ({ g: "Actions", icon: "action", label: `Show my plan as ${p.k === "loa" ? "on leave" : p.label}`, hint: "Changes your stage", run: () => { state.profile.phase = p.k; persist(); render(); toast(`Stage: ${p.label}`); } }))
  ];
  const pages = Object.entries(TITLES).filter(([k]) => k !== "boot" && k !== "setup").map(([k, l]) => ({ g: "Go to", icon: k, label: l, run: () => go(k) }));
  return { cmds, pages };
}
function palScore(text, q) { const s = text.toLowerCase(); if (s === q) return 100; if (s.startsWith(q)) return 60; if (s.includes(` ${q}`)) return 40; if (s.includes(q)) return 25; return 0; }
function palBuild(qRaw) {
  const q = qRaw.trim().toLowerCase(); const { cmds, pages } = palCommands(); const t = today();
  if (!q) {
    const up = upcoming(3).map((x) => ({ g: "Coming up", icon: "date", label: x.label, hint: `${WD[x.date.getDay()]}, ${fmtShort(x.date)} · ${relDays(x.date)}`, run: () => openDrawer("day", isoD(x.date)) }));
    const rf = (READ_FIRST[state.profile.phase] || READ_FIRST.ci).slice(0, 4).map(getP).filter(Boolean).map((p) => ({ g: `Read first in ${phaseLabel(state.profile.phase)}`, icon: "policies", label: p.t, hint: p.c, run: () => openDrawer("policy", p.c) }));
    return [...palExtra(""), ...up, ...rf, ...pages, ...cmds.slice(0, 4)];
  }
  const words = q.split(/\s+/).filter(Boolean);
  const out = [];
  const looksLikeQuestion = words.length >= 3 || /\?$/.test(q);
  if (looksLikeQuestion && typeof searchRules === "function") {
    const hits = searchRules(qRaw);
    for (const h of hits.slice(0, 4)) {
      const code = (h.f.codes || [h.f.code])[0];
      out.push({ g: "Answers from the policies", icon: "answer", label: h.f.text.length > 120 ? h.f.text.slice(0, 118) + "…" : h.f.text, hint: `${h.f.title}${code ? ` · ${code}` : ""}`, run: () => code ? openDrawer("policy", code) : go("ask") });
    }
  }
  if (looksLikeQuestion && typeof searchRules === "function") {
    const codes = [...new Set(searchRules(qRaw).flatMap((h) => h.f.codes || [h.f.code]).filter(Boolean))].slice(0, 4);
    out.push(...codes.map(getP).filter(Boolean).map((p) => ({ g: "Policies", icon: "policies", label: p.t, hint: `${p.c} · ${p.g}`, run: () => openDrawer("policy", p.c) })));
  }
  const pol = looksLikeQuestion ? [] : POLICIES.filter((p) => p.c !== "Web").map((p) => {
    const sc = Math.max(palScore(p.c, q) * 1.5, palScore(p.t, q), words.every((w) => `${p.c} ${p.t} ${p.g} ${p.s}`.toLowerCase().includes(w)) ? 18 : 0);
    return [sc, p];
  }).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([, p]) => ({ g: "Policies", icon: "policies", label: p.t, hint: `${p.c} · ${p.g}`, run: () => openDrawer("policy", p.c) }));
  out.push(...pol);
  const dates = allDated().filter((x) => x.date >= addDays(t, -14) && !x.holiday && words.every((w) => x.label.toLowerCase().includes(w))).sort((a, b) => a.date - b.date).slice(0, 4)
    .map((x) => ({ g: "Dates", icon: "date", label: x.label, hint: `${WD[x.date.getDay()]}, ${fmtShort(x.date)} · ${relDays(x.date)}`, run: () => openDrawer("day", isoD(x.date)) }));
  out.push(...dates);
  const rots = rotsParsed().filter((r) => words.every((w) => r.name.toLowerCase().includes(w))).slice(0, 3).map((r) => ({ g: "Rotations", icon: "rotations", label: r.name, hint: `${fmtShort(r.s)} to ${fmtShort(r.e)}`, run: () => openDrawer("rot", r.id) }));
  out.push(...rots);
  out.push(...pages.filter((p) => p.label.toLowerCase().includes(q)));
  out.push(...cmds.filter((c) => c.g !== "Tracks" ? words.every((w) => c.label.toLowerCase().includes(w)) : /track|^[1-9][ab]$/i.test(q) && words.every((w) => `${c.label} ${c.hint}`.toLowerCase().includes(w) || w === "track")));
  out.push(...palExtra(qRaw));
  out.push({ g: "Ask", icon: "ask", label: `Ask the policies: “${qRaw.trim().slice(0, 80)}”`, hint: "Every rule that matches, with its code", run: () => { ui.ask.draft = qRaw.trim(); go("ask"); setTimeout(() => ask(ui.ask.draft), 0); } });
  return out;
}
/* other spaces add their own results; the palette shows them without knowing what they are */
function palExtra(q) { const out = []; for (const fn of (window.PERL_PALETTE || [])) { try { for (const it of fn(q) || []) out.push({ g: it.g, icon: it.icon || "journal", label: it.label, hint: it.hint || "", run: it.run }); } catch { /* a provider failed; skip it */ } } return out; }
function palRender() {
  const res = $("#pal-res"); if (!res) return;
  pal.items = palBuild(pal.q); if (pal.idx >= pal.items.length) pal.idx = 0;
  let g = ""; let html = "";
  pal.items.forEach((it, i) => {
    if (it.g !== g) { g = it.g; html += `<div class="pal-g" role="presentation">${esc(g)}</div>`; }
    html += `<button class="pal-it" role="option" id="pal-${i}" data-act="pal-run" data-i="${i}" aria-selected="${i === pal.idx}"><svg viewBox="0 0 18 18" aria-hidden="true">${ICON[it.icon] || ICON.search}</svg><span class="pi-t">${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ""}</span></button>`;
  });
  res.innerHTML = html || `<div class="pal-empty">No matches.</div>`;
  $("#pal-q")?.setAttribute("aria-activedescendant", pal.items.length ? `pal-${pal.idx}` : "");
  res.querySelector(`#pal-${pal.idx}`)?.scrollIntoView({ block: "nearest" });
}
const MODAL_CLOSE_MS = 150;
let palReturn = null;
/* Keep Tab inside an open dialog (WCAG 2.4.3): cycle within `root`, and pull focus back in when it has strayed. */
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";
function trapTab(ev, root) {
  if (!root || ev.key !== "Tab") return false;
  const a = document.activeElement;
  /* another layer is on top (palette, sign-in or consent gate, a Debrief overlay, a drawer): it owns Tab, not this root */
  if (root.closest("[inert]") || (a && !root.contains(a) && a.closest("#pal, .perl-gate, .dbf .overlay:not([hidden]), #drawer, #sheet"))) return false;
  const f = [...root.querySelectorAll(FOCUSABLE)].filter(shown);
  if (!f.length) { ev.preventDefault(); return true; }
  const first = f[0], last = f[f.length - 1];
  if (ev.shiftKey && (a === first || !root.contains(a))) { ev.preventDefault(); last.focus(); return true; }
  if (!ev.shiftKey && (a === last || !root.contains(a))) { ev.preventDefault(); first.focus(); return true; }
  return false;
}
window.PERL_TRAP = trapTab;
function openPalette(prefill) {
  const wrap = $("#pal"); const modal = wrap && wrap.querySelector(".t-modal"); if (!modal) return;
  if (ui.sheet) { ui.sheet = false; shell(); }
  palReturn = document.activeElement;
  pal.open = true; pal.q = prefill || ""; pal.idx = 0;
  wrap.dataset.open = "true"; wrap.classList.add("on");
  const input = $("#pal-q"); input.value = pal.q;
  palRender();
  modal.classList.remove("is-closing");
  requestAnimationFrame(() => { modal.classList.add("is-open"); input.focus(); });
}
function closePalette(keepFocus) {
  const wrap = $("#pal"); const modal = wrap && wrap.querySelector(".t-modal"); if (!modal || !pal.open) return;
  pal.open = false;
  modal.classList.remove("is-open"); modal.classList.add("is-closing"); wrap.classList.remove("on");
  setTimeout(() => { modal.classList.remove("is-closing"); if (!pal.open) wrap.dataset.open = "false"; }, MODAL_CLOSE_MS);
  if (!keepFocus && palReturn && palReturn.isConnected) palReturn.focus({ preventScroll: true });
  palReturn = null;
}
function palRun(i) {
  const it = pal.items[i]; if (!it) return;
  closePalette(true); $("#pal-q")?.blur();
  setTimeout(() => it.run(), 10);
  /* a command that navigates leaves nothing focused; start the reader at the new page's heading */
  setTimeout(() => { if (document.activeElement === document.body && !pal.open && !ui.drawer) pageHeading()?.focus({ preventScroll: true }); }, 200);
}



/* ----- path to the MD ----- */
const SHORT = { y1: "Year 1 courses", y2: "Year 2 courses", step1: "USMLE Step 1", cl_fm: "Family Medicine", cl_im: "Internal Medicine", cl_neuro: "Neurology", cl_psych: "Psychiatry", cl_ob: "OB/GYN", cl_peds: "Pediatrics", cl_surg: "Surgery", fmcc: "FM Continuity Clinic", idea: "IDEA Projects", y3elec: "Year 3 electives", gateway: "Gateway OSCE", step2: "USMLE Step 2 CK", subi: "Sub-Internship", cbc: "Career Boot Camp", project: "Capstone or Data Science", acls: "ACLS or PALS", prof: "Professionalism" };
const NEXT_STATUS = { todo: "inprog", inprog: "done", done: "todo", na: "todo", unknown: "todo" };
const CHECK = `<svg class="tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>`;
function boardHtml() {
  const set = state.profile.reqSet || "both";
  const list = applicableReqs();
  const secs = [...new Set(list.map((r) => r.sec))];
  return `<div class="lanes">${secs.map((sec) => {
    const rs = list.filter((r) => r.sec === sec); const done = rs.filter((r) => state.req[r.id] === "done").length;
    return `<div class="lane"><div class="lane-h">${esc(sec)}<small class="num">${done} of ${rs.length} done</small></div>
      <div class="tiles">${rs.map((r) => {
        const st = state.req[r.id] || "todo"; const differs = set === "both" && r.v6 && r.v61 && r.v6 !== r.v61;
        return `<button class="tile ${st}" data-act="tile" data-id="${r.id}" aria-label="${esc(r.label)}: ${STATUS[st][0]}. Select to change." title="${esc(r.label)}${differs ? " (the two rulebooks differ here)" : ""}"><b>${esc(SHORT[r.id] || r.label)}</b><span>${st === "done" ? CHECK : ""}${STATUS[st][0]}</span>${differs ? `<i class="differs" aria-hidden="true"></i>` : ""}</button>`;
      }).join("")}</div></div>`;
  }).join("")}</div>
  <div class="board-key" aria-hidden="true"><span><i class="tile-key done"></i>Done</span><span><i class="tile-key inprog"></i>In progress</span><span><i class="tile-key todo"></i>Not yet</span>${set === "both" ? `<span><i class="differs-key"></i>Rulebooks differ</span>` : ""}</div>`;
}
function stageSwitch() {
  return `<div class="seg stage" role="group" aria-label="Your stage">${PHASES.map((p) => `<button aria-pressed="${state.profile.phase === p.k}" data-act="set-phase" data-phase="${p.k}">${p.k === "loa" ? "Leave" : esc(p.label)}</button>`).join("")}</div>`;
}

/* ----- policy health map ----- */
function health(p) {
  const fl = p.fl || [];
  if (fl.includes("dead")) return ["gone", "Dead link on the policy page"];
  if (fl.includes("login")) return ["gone", "Behind a login"];
  if (fl.includes("notread")) return ["gone", "Faculty-only, not summarized"];
  if (FLAGS.some((f) => f.sev === "conflict" && f.codes.includes(p.c))) return ["clash", "Conflicts with another policy"];
  const r = parseD(p.rev);
  if (r && r < today()) { const m = Math.max(1, monthsBetween(r, today())); return [m > 24 ? "od3" : m > 6 ? "od2" : "od1", `Review ${plural(m, "month")} overdue`]; }
  return ["ok", r ? `Current, next review ${fmtMonth(r)}` : "Current"];
}
function healthMapHtml() {
  const pol = POLICIES.filter((p) => p.c !== "Web");
  const hs = pol.map((p) => [p, health(p)]);
  const n = (k) => hs.filter(([, h]) => k.includes(h[0])).length;
  const rows = GROUPS.map((g) => [g, hs.filter(([p]) => p.g === g)]).filter(([, xs]) => xs.length);
  return `<section class="panel" aria-labelledby="h-health">
    <div class="panel-head"><h2 id="h-health">Every policy</h2>
      <span class="hm-legend" aria-hidden="true"><span><i class="hm-tile ok"></i>Current</span><span><i class="hm-tile od1"></i><i class="hm-tile od2"></i><i class="hm-tile od3"></i>Review overdue, by how long</span><span><i class="hm-tile clash"></i>In a conflict</span><span><i class="hm-tile gone"></i>Unreadable</span></span></div>
    <p class="hm-sum">Of ${pol.length} policies, <b class="num">${n(["od1", "od2", "od3"])}</b> are past their own review date, <b class="num">${n(["clash"])}</b> sit in a conflict and <b class="num">${n(["gone"])}</b> can't be read from the policy page.</p>
    <div class="hm-rows">${rows.map(([g, xs]) => `<div class="hm-row"><div class="hm-label">${esc(g)}<small class="num">${xs.length}</small></div><div class="hm-tiles">${xs.map(([p, h]) => `<button class="hm-tile ${h[0]}" data-act="open-policy" data-code="${esc(p.c)}" title="${esc(p.c + " " + p.t + ": " + h[1])}" aria-label="${esc(p.c + " " + p.t + ", " + h[1])}">${esc(p.c)}</button>`).join("")}</div></div>`).join("")}</div>
  </section>`;
}

/* ----- where the rules are: stage x topic ----- */
function ptMapHtml() {
  const groups = GROUPS.filter((g) => g !== "Admissions" && g !== "Faculty and staff");
  const phase = state.profile.phase;
  const cnt = (g, k) => POLICIES.filter((p) => p.g === g && p.ph.includes(k)).length;
  const max = Math.max(...groups.flatMap((g) => PHASES.map((p) => cnt(g, p.k))));
  const lv = (c) => c === 0 ? 0 : c <= max * 0.25 ? 1 : c <= max * 0.5 ? 2 : c <= max * 0.75 ? 3 : 4;
  return `<section class="panel" aria-labelledby="h-pt">
    <div class="panel-head"><h2 id="h-pt">Where the rules are</h2><span class="aside">Policies by topic and stage. Select a square to list them.</span></div>
    <div class="table-wrap"><table class="pt"><thead><tr><th>Topic</th>${PHASES.map((p) => `<th class="${p.k === phase ? "you" : ""}">${p.k === "loa" ? "Leave" : esc(p.label)}${p.k === phase ? `<small>Your stage</small>` : ""}</th>`).join("")}</tr></thead>
    <tbody>${groups.map((g) => `<tr><th scope="row">${esc(g)}</th>${PHASES.map((p) => { const c = cnt(g, p.k); const on = ui.phaseF === p.k && ui.groupF === g; return `<td class="${p.k === phase ? "you" : ""}">${c ? `<button class="pt-cell lv${lv(c)}${on ? " on" : ""}" data-act="pt-cell" data-phase="${p.k}" data-group="${esc(g)}" aria-label="${c} ${esc(g)} policies for ${esc(p.label)}">${c}</button>` : `<span class="pt-cell lv0">0</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  </section>`;
}

/* ================= calendar export, check-off, schedule import, files ================= */
/* The Claude-hosted copy sets window.PN_HOST = "claude" before this script; the Vercel build does not. */
const IN_CLAUDE = window.PN_HOST === "claude";
let dlFn = null;
if (IN_CLAUDE) (async () => { try { const c = window.claude; if (c && typeof c.use === "function") dlFn = await c.use("downloads"); } catch { dlFn = null; } })();

function itemKey(it) { return `${isoD(it.date)}|${it.label}`; }
function ymd(d) { return isoD(d).replace(/-/g, ""); }
function gcalUrl(it) {
  const det = `${it.rule || ""}${it.code ? ` (${it.code})` : ""}\nAdded from Policy Navigator for CI MED students. The linked policy PDF governs.`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(it.label)}&dates=${ymd(it.date)}/${ymd(addDays(it.date, 1))}&details=${encodeURIComponent(det)}`;
}
const CAL_PLUS = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3M8 8.5v4M6 10.5h4"/></svg>`;
const DOWN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7l3.5 3.5L11.5 7M3 13.5h10"/></svg>`;
const CHECK_PATH = `<svg viewBox="0 0 10.1668 10.1668" aria-hidden="true"><path d="M1 5.52L3.92 9.17L9.17 1"/></svg>`;

/* one dated row: check it off, read the rule, open the policy, add it to a calendar */
function dateRow(u) {
  const k = itemKey(u); const st = itemState(u); const done = st === "done";
  const chk = u.holiday || u.feed ? `<span class="chk-pad" aria-hidden="true"></span>`
    : `<button class="t-check chk" role="checkbox" aria-checked="${done}" data-act="toggle-done" data-key="${esc(k)}" aria-label="${esc(u.label)}: ${done ? "done" : "not done"}">${CHECK_PATH}</button>`;
  const when = u.monthOnly ? `<b>${MONTHS[u.date.getMonth()]}</b><span>${u.date.getFullYear()}</span>` : `<b>${WD[u.date.getDay()]}</b><span>${MONTHS[u.date.getMonth()]} ${u.date.getDate()}</span>`;
  const tone = STATE_TONE[st] || ""; const dt = dueText(u, st);
  /* feed items (connect.js): the source leads the small line, and the link goes back to Outlook/Canvas instead of adding to Google */
  const sub = u.feed ? [u.source, u.rule].filter(Boolean).join(" · ") : u.rule;
  const out = u.feed ? (u.url ? `<a class="gcal" href="${esc(u.url)}" target="_blank" rel="noopener" title="Open in ${esc(u.source || "the source")}" aria-label="Open ${esc(u.label)} in ${esc(u.source || "the source")}">${CAL_PLUS}</a>` : "")
    : `<a class="gcal" href="${esc(gcalUrl(u))}" target="_blank" rel="noopener" title="Add to Google Calendar" aria-label="Add ${esc(u.label)} to Google Calendar">${CAL_PLUS}</a>`;
  const join = u.feed && u.join && /^https:\/\//.test(u.join) && diffDays(today(), u.date) >= 0 ? `<a class="btn small join" href="${esc(u.join)}" target="_blank" rel="noopener" aria-label="Join ${esc(u.label)}">Join</a>` : "";
  return `<li class="st-${st}">${chk}<div class="when num">${when}</div><div class="what"><span class="t">${esc(u.label)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</div><div class="tail">${join}${dt ? `<span class="due ${tone} num">${tone === "amber" || tone === "red" ? `<i class="dot ${st === "breach" ? "breach" : "soon"}"></i>` : ""}${esc(dt)}</span>` : ""}${u.code ? codeBtn(u.code) : ""}${out}</div></li>`;
}

/* ----- files ----- */
function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsFold(line) { const out = []; let s = line; while (s.length > 73) { out.push(s.slice(0, 73)); s = " " + s.slice(73); } out.push(s); return out.join("\r\n"); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function buildIcs(items) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Policy Navigator//CI MED student demo//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:CI MED deadlines"];
  for (const it of items) {
    L.push("BEGIN:VEVENT", `UID:${hashStr(itemKey(it))}@policy-navigator`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(it.date, 1))}`,
      `SUMMARY:${icsEscape(it.label)}`, `DESCRIPTION:${icsEscape(`${it.rule || ""}${it.code ? ` (${it.code})` : ""}. From Policy Navigator for CI MED students; the linked policy PDF governs.`)}`, "TRANSP:TRANSPARENT");
    const alarms = it.holiday ? [] : (it.w || 0) >= 3 ? ["-P2DT15H", "-PT15H"] : ["-PT15H"];
    for (const tr of alarms) L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(it.label)}`, `TRIGGER:${tr}`, "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(icsFold).join("\r\n") + "\r\n";
}
async function saveFile(filename, text, mime) {
  if (IN_CLAUDE) {
    if (!dlFn) { try { const c = window.claude; dlFn = c && typeof c.use === "function" ? await c.use("downloads") : null; } catch { dlFn = null; } }
    if (!dlFn) { toast("Downloads aren't available in this view."); return false; }
    try { await dlFn.save({ filename, data: text }); toast(`Saved ${filename}`); return true; }
    catch (e) { toast(e && e.code === "declined" ? "Download cancelled." : "Couldn't save the file here."); return false; }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Downloaded ${filename}`); return true;
  } catch { toast("Couldn't create the file in this browser."); return false; }
}
function exportIcs() {
  const t = today(); const items = allDated().filter((x) => x.date >= t && !x.done && !x.feed).sort((a, b) => a.date - b.date);
  if (!items.length) { toast("No upcoming dates to add."); return; }
  saveFile("ci-med-deadlines.ics", buildIcs(items), "text/calendar");
}
function csvCell(v) { const s = String(v ?? ""); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function exportHealthCsv() {
  const rows = [["Code", "Title", "Topic", "Status", "Detail", "Effective", "Next review", "Months overdue", "Problems found", "Policy link"]];
  const label = { ok: "Current", od1: "Review overdue", od2: "Review overdue", od3: "Review overdue", clash: "In a conflict", gone: "Unreadable" };
  for (const p of POLICIES.filter((x) => x.c !== "Web")) {
    const [cls, detail] = health(p); const r = parseD(p.rev); const over = r && r < today() ? Math.max(1, monthsBetween(r, today())) : "";
    rows.push([p.c, p.t, p.g, label[cls], detail, p.eff || "", p.rev || "", over, FLAGS.filter((f) => f.codes.includes(p.c)).map((f) => f.title).join("; "), p.u]);
  }
  saveFile(`ci-med-policy-health-${isoD(today())}.csv`, rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n", "text/csv");
}

/* ----- toast ----- */
let toastTimer = null;
/* a short message; with an action (like Undo) it stays a little longer and the action is one tap away */
function toast(msg, action) {
  const el = document.getElementById("toast"); if (!el) return;
  el.textContent = msg;
  if (action && action.label && typeof action.fn === "function") {
    const b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = action.label;
    b.addEventListener("click", () => { el.classList.remove("is-open"); clearTimeout(toastTimer); action.fn(); });
    el.append(b);
  }
  el.classList.add("is-open");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("is-open"), action ? 7000 : 2600);
}
/* removing something is one tap, and so is putting it back */
function removeWithUndo(key, id, what) {
  const list = state[key] || []; const i = list.findIndex((x) => x.id === id); if (i < 0) return null;
  const [gone] = list.splice(i, 1); persist(); render();
  toast(`Removed ${what || gone.name}.`, { label: "Undo", fn: () => { const l = state[key] || (state[key] = []); if (!l.some((x) => x.id === gone.id)) l.splice(Math.min(i, l.length), 0, gone); persist(); render(); toast(`${what || gone.name} is back.`); } });
  return gone;
}

/* ----- grades: APS-13 says 4 weeks, LCME element 9.8 says 6 ----- */
function gradeStatus(r) {
  const e = parseD(r.end); if (!e || e >= today()) return null;
  const gp = parseD(r.gradePosted);
  if (gp) { const n = diffDays(e, gp); return n <= 28 ? ["pos", `Posted in ${n} days`, true] : n <= 42 ? ["warn", `Posted in ${n} days, past APS-13's 4 weeks`, false] : ["neg", `Posted in ${n} days, past LCME's 6 weeks`, false]; }
  const n = diffDays(e, today());
  return n <= 28 ? ["", `Due to you by ${fmtShort(addDays(e, 28))}`, null] : n <= 42 ? ["warn", `Not posted after ${n} days (APS-13: 28)`, false] : ["neg", `Not posted after ${n} days (LCME: 42)`, false];
}

/* ----- schedule import ----- */
const MON3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function datesIn(line) {
  const hits = [];
  for (const m of line.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) hits.push({ i: m.index, s: m[0], d: new Date(+m[1], +m[2] - 1, +m[3]) });
  for (const m of line.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; hits.push({ i: m.index, s: m[0], d: new Date(y, +m[1] - 1, +m[2]) }); }
  for (const m of line.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi)) hits.push({ i: m.index, s: m[0], d: new Date(+m[3], MON3.indexOf(m[1].toLowerCase().slice(0, 3)), +m[2]) });
  return hits.filter((h) => !isNaN(h.d)).sort((a, b) => a.i - b.i);
}
function parseIcsEvents(text) {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const evs = []; let cur = null;
  for (const ln of lines) {
    if (ln.trim() === "BEGIN:VEVENT") { cur = {}; continue; }
    if (ln.trim() === "END:VEVENT") { if (cur) evs.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = ln.indexOf(":"); if (i < 0) continue;
    const head = ln.slice(0, i); const key = head.split(";")[0].toUpperCase(); const v = ln.slice(i + 1).trim();
    if (key === "SUMMARY") cur.name = v.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ");
    if (key === "DTSTART" || key === "DTEND") cur[key] = { v, allDay: /VALUE=DATE(?!-)/i.test(head) || /^\d{8}$/.test(v) };
  }
  return evs.map((e) => {
    const p = (x) => x && /^(\d{4})(\d{2})(\d{2})/.exec(x.v); const s = p(e.DTSTART); if (!s) return null;
    const start = new Date(+s[1], +s[2] - 1, +s[3]); const en = p(e.DTEND);
    let end = en ? new Date(+en[1], +en[2] - 1, +en[3]) : start; if (en && e.DTEND.allDay) end = addDays(end, -1);
    return { raw: e.name || "Rotation", start, end };
  }).filter(Boolean);
}
const CLERK_ALIASES = [["Family Medicine", /\b(family med(icine)?|fm)\b/i], ["Internal Medicine", /\b(internal med(icine)?|im)\b/i], ["Neurology", /\bneuro(logy)?\b/i], ["Psychiatry", /\bpsych(iatry)?\b/i], ["Obstetrics and Gynecology", /\b(ob\s*\/?\s*gyn|obgyn|obstetrics?)\b/i], ["Pediatrics", /\b(peds|pediatrics?)\b/i], ["Surgery", /\bsurg(ery)?\b/i]];
const NOT_CORE = /elective|sub-?i|intern|consult|outpatient|inpatient|advanced|introduction|neurosurgery|pediatric (surgery|hematology|pulmonology)|critical|bariatric|vascular|rural|colon|hand|plastic|oral|ortho/i;
const NON_CLINICAL = /^(Clinical Research|Health Systems Leadership|Quality Improvement|Values in the|Spiritual Integration|Faith, Medicine|Advanced Clinical and Professional|Advanced Clinical Medical Spanish)/;
function classifyRotation(raw) {
  const name = String(raw).replace(/\s+/g, " ").replace(/^[\s\-–:|,]+|[\s\-–:|,]+$/g, "").slice(0, 60);
  if (/\bsub-?i\b|sub-?intern|acting intern/i.test(name)) return { name, kind: "subi" };
  const cat = Object.values(COURSES).find((v) => v.toLowerCase() === name.toLowerCase());
  if (cat && !/clerkship/i.test(cat)) return { name: cat, kind: NON_CLINICAL.test(cat) ? "other" : "elective" };
  if (!NOT_CORE.test(name)) for (const [canon, re] of CLERK_ALIASES) if (re.test(name)) return { name: canon, kind: "clerkship" };
  return { name, kind: "elective" };
}
function parseSchedule(text) {
  let rows = [];
  if (/BEGIN:VEVENT/.test(text)) rows = parseIcsEvents(text).filter((e) => diffDays(e.start, e.end) >= 4);
  else for (const line of String(text).split(/\r?\n/)) {
    const ds = datesIn(line); if (ds.length < 2) continue;
    let raw = line; for (const d of ds.slice(0, 2)) raw = raw.replace(d.s, " ");
    raw = raw.replace(/[\t|;,"]+/g, " ").replace(/\b(to|through|thru|from|until)\b/gi, " ").replace(/\s[-–]\s/g, " ");
    rows.push({ raw, start: ds[0].d, end: ds[1].d });
  }
  const have = new Set((state.rotations || []).map((r) => `${r.name.toLowerCase()}|${r.start}`));
  return rows.filter((r) => r.end >= r.start).map((r) => { const c = classifyRotation(r.raw); const start = isoD(r.start); return { ...c, start, end: isoD(r.end), dup: have.has(`${c.name.toLowerCase()}|${start}`) }; });
}
const SAMPLE_SCHEDULE = `Rotation,Start,End
Neurology,10/05/2026,11/06/2026
OB/GYN,11/09/2026,12/11/2026
Surgery,12/14/2026,02/26/2027
Emergency Medicine,05/10/2027,06/04/2027
Internal Medicine Sub-Internship,06/07/2027,07/02/2027`;

function schedulePanel() {
  const s = ui.sched;
  if (!s.open) return `<div class="panel-foot"><button class="btn small" data-act="sched-open">${DOWN} Import a schedule</button><span class="hint">Paste it, or choose a calendar (.ics) or spreadsheet (.csv) file</span></div>`;
  const review = s.items ? (s.items.length ? `<ul class="changes">${s.items.map((it, i) => `<li><input type="checkbox" id="sp-${i}" data-spick="${i}" ${it.dup ? "disabled" : s.pick[i] !== false ? "checked" : ""}><label for="sp-${i}"><b>${esc(it.name)}</b> · ${esc(ROT_KINDS[it.kind])} · ${fmtShort(parseD(it.start))} to ${fmtShort(parseD(it.end))}${it.dup ? ` <span class="muted">already in your list</span>` : ""}</label></li>`).join("")}</ul>` : `<div class="empty">No rotations found. Each line needs a name and two dates.</div>`) : "";
  return `<div class="sched">
    <div class="field"><label for="sched-text">Paste your rotation schedule</label>
      <textarea id="sched-text" rows="5" placeholder="One rotation per line with its start and end dates, for example: Neurology, 10/05/2026, 11/06/2026">${esc(s.text)}</textarea></div>
    <div class="sched-row"><label class="btn small" for="sched-file">Choose a file</label><input id="sched-file" type="file" accept=".ics,.csv,.txt,text/calendar,text/csv,text/plain" class="sr"><button class="btn small quiet" type="button" data-act="sched-sample">Try a sample schedule</button><span class="hint">${s.fileName ? esc(s.fileName) : "Dates like 10/05/2026, 2026-10-05 or Oct 5, 2026 all work"}</span></div>
    ${s.error ? `<p class="small" style="color:var(--negative)" role="alert">${esc(s.error)}</p>` : ""}
    ${review}
    <div class="panel-foot"><button class="btn small" data-act="sched-close">Cancel</button>${s.items && s.items.some((x) => !x.dup) ? `<button class="btn primary small" data-act="sched-apply">Add selected rotations</button>` : `<button class="btn primary small" data-act="sched-read">Read schedule</button>`}</div>
  </div>`;
}

/* ----- rotations editor ----- */
function rotationsPanel() {
  const t = today(); const ri = rotationItems();
  const rots = [...(state.rotations || [])].sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const graded = rots.map(gradeStatus).filter((g) => g && g[2] !== null);
  const onTime = graded.filter((g) => g[2]).length;
  const row = (r) => {
    const s = parseD(r.start), e = parseD(r.end);
    const st = !s || !e ? "" : e < t ? `<span class="pill">Finished</span>` : s <= t ? `<span class="pill info">Now</span>` : "";
    const rank = { soon: 0, slipped: 0, breach: 0, later: 1, done: 2, past: 2 };
    const ds = ri.filter((x) => x.rot === r.id && x.short !== "Ends" && x.short !== "Midpoint").map((x) => ({ ...x, st: itemState(x) })).sort((a, b) => rank[a.st] - rank[b.st] || a.date - b.date);
    const g = gradeStatus(r);
    return `<li><div class="what"><span class="sw k-${esc(r.kind)}" aria-hidden="true"></span><button class="link strong" data-act="open-rot" data-id="${esc(r.id)}">${esc(r.name)}</button><small>${esc(ROT_KINDS[r.kind] || "Rotation")} · ${s ? fmtShort(s) : "—"} to ${e ? fmtShort(e) : "—"}${r.src === "track" && state.profile.track ? ` · ${esc(trackLabel())}` : r.src === "audit" ? " · from your audit" : r.src === "base" ? (guessedPast(r) ? " · not confirmed, so no deadlines" : " · confirm dates") : ""}${hasDays(r) ? " · daily schedule in" : ""}</small></div>
      <div class="rot-dates">${ds.map((x) => `<span class="dchip ${x.st}">${["soon", "slipped", "breach"].includes(x.st) ? `<i class="dot ${x.st === "breach" ? "breach" : "soon"}"></i>` : ""}${esc(x.short)} <b class="num">${fmtShort(x.date)}</b>${x.st === "done" ? " · done" : x.st === "slipped" ? " · not checked off" : ""}</span>`).join("")}
        ${g ? `<span class="gp"><label for="gp-${esc(r.id)}">Grade posted</label><input type="date" id="gp-${esc(r.id)}" data-act="grade-posted" data-id="${esc(r.id)}" value="${esc(r.gradePosted || "")}"><span class="pill ${g[0]}">${esc(g[1])}</span></span>` : ""}</div>
      <div class="tail">${st}<button class="btn quiet small" data-act="del-rot" data-id="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">Remove</button></div></li>`;
  };
  return `<section class="panel" aria-labelledby="h-rot">
    <div class="panel-head"><h2 id="h-rot">Your rotations</h2><span class="aside">${graded.length ? `Grades on time under APS-13: <b class="num">${onTime} of ${graded.length}</b>` : "Each one adds its evaluation, grade and drop deadlines"}</span></div>
    ${rots.length ? `<ul class="list two rot-list">${rots.map(row).join("")}</ul>` : `<div class="empty">No rotations yet. Add your clerkships and electives below, or import a schedule, to see their deadlines on Today and in the Calendar.</div>`}
    <form class="rot-form" data-form="rotation">
      <div class="field"><label for="rot-name">Rotation</label><input type="text" id="rot-name" list="rot-names" required placeholder="Neurology"><datalist id="rot-names">${[...CLERKSHIPS, ...Object.values(COURSES).filter((v, i, a) => a.indexOf(v) === i)].map((v) => `<option value="${esc(v)}">`).join("")}</datalist></div>
      <div class="field"><label for="rot-kind">Type</label><select id="rot-kind">${Object.entries(ROT_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div class="field"><label for="rot-start">Starts</label><input type="date" id="rot-start" required></div>
      <div class="field"><label for="rot-end">Ends</label><input type="date" id="rot-end" required></div>
      <div class="field rot-add"><span class="label" aria-hidden="true">&nbsp;</span><button class="btn primary" type="submit">Add rotation</button></div>
    </form>
    ${ui.rotError ? `<p class="small" style="color:var(--negative)" role="alert">${esc(ui.rotError)}</p>` : ""}
    ${schedulePanel()}
  </section>`;
}

/* ================= views ================= */
/* ----- Today: one focal point (the current rotation and what needs you next), quiet figures beneath ----- */
function nextAction(cur) {
  const t = today();
  return allDated().filter((x) => !x.done && !x.holiday && (x.w || 0) >= 2 && x.date >= addDays(t, -14) && !(x.feed && x.date < t) && !(cur && x.rot === cur.id && x.short === "Ends"))
    .sort((a, b) => a.date - b.date || (b.w || 0) - (a.w || 0))[0] || null;
}
function heroFact(cur, nx) {
  const t = today();
  if (cur) {
    const n = diffDays(t, cur.e);
    if (n <= 1) return `${rotShort(cur.name)} ${n === 0 ? "ends today" : `ends ${relWhen(cur.e)}`}.`;   /* the week count stays up until the last two days */
    return `Week ${Math.floor(diffDays(cur.s, t) / 7) + 1} of ${Math.ceil((diffDays(cur.s, cur.e) + 1) / 7)} in ${rotShort(cur.name)}.`;
  }
  if (nx && diffDays(t, nx.date) <= SOON) return `${nx.label}, ${diffDays(t, nx.date) < 0 ? "not yet checked off" : relWhen(nx.date)}.`;
  return `Clear for the next ${SOON} days.`;
}
/* the rotation as its weeks: done weeks filled, this week filling, the rest empty */
function weeksMeter(cur) {
  const t = today(); const len = diffDays(cur.s, cur.e) + 1; const day = Math.min(len, diffDays(cur.s, t) + 1); const n = Math.max(1, Math.ceil(len / 7));
  const segs = Array.from({ length: n }, (_, i) => { const f = Math.max(0, Math.min(1, (day - i * 7) / Math.min(7, len - i * 7))); return `<i${f >= 1 ? ' class="full"' : ""}>${f > 0 && f < 1 ? `<b style="width:${(f * 100).toFixed(0)}%"></b>` : ""}</i>`; }).join("");
  return `<span class="weeks" role="img" aria-label="Day ${day} of ${len}, week ${Math.floor((day - 1) / 7) + 1} of ${n}">${segs}</span>`;
}
/* "starts tomorrow", "starts on Monday", or a date when it's further off */
function startsWhen(d) { const n = diffDays(today(), d); return n >= 1 && n < 7 ? `starts ${relWhen(d)} (${fmtShort(d)})` : `from ${WD[d.getDay()]}, ${fmtShort(d)}`; }
function heroHtml() {
  const t = today(); const pr = state.profile; const cur = currentRotation(); const nr = nextRotation(); const nx = nextAction(cur);
  const h = new Date().getHours(); const hello = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const name = (pr.name || "").trim().split(/\s+/)[0];
  const meta = `${hello}${name ? `, ${esc(name)}` : ""}. ${WDL[t.getDay()]}, ${MONTHL[t.getMonth()]} ${t.getDate()}<span class="hero-where">${esc(phaseLabel(pr.phase))}${pr.track ? `, ${esc(trackLabel(pr))}` : ""}</span>`;
  const todayEv = schedFor(isoD(t)); const tm = addDays(t, 1); const tomEv = schedFor(isoD(tm));
  const late = new Date().getHours() >= 15;
  const tomSec = tomEv.length && (late || !todayEv.length) ? `<h2 class="label">Tomorrow, ${WDL[tm.getDay()]}</h2><ul class="day-list">${tomEv.map(evRow).join("")}</ul>` : "";
  const daySec = todayEv.length || tomSec ? (late && tomSec ? tomSec : "") + (todayEv.length ? `<h2 class="label">${late && tomSec ? "Earlier today" : `Today on ${esc(rotShort(todayEv[0].sched))}`}</h2><ul class="day-list${late && tomSec ? " is-past" : ""}">${todayEv.map(evRow).join("")}</ul>` : "") + (!late && tomSec ? tomSec : "")
    : cur && (state.scheds || []).some((x) => x.from <= isoD(t) && x.to >= isoD(t)) ? `<p class="hero-hint">Nothing on your ${esc(rotShort(cur.name))} schedule today.</p>`
    : cur ? `<p class="hero-hint">Add your ${esc(rotShort(cur.name))} schedule to see each day here. <a class="link" href="#schedule" data-act="go-drop">Add schedule</a></p>`
    : !(state.rotations || []).length ? `<p class="hero-hint">Pick your clerkship track and your year fills in. <a class="link" href="#schedule" data-act="go-track">Choose a track</a></p>` : "";
  let rot = "";
  if (cur) {
    const len = diffDays(cur.s, cur.e) + 1; const day = diffDays(cur.s, t) + 1;
    rot = `<div class="hero-rot">${weeksMeter(cur)}
      <p class="hero-sub num"><button class="link" data-act="open-rot" data-id="${esc(cur.id)}">${esc(cur.name)}</button>, day ${day} of ${len}, until ${WD[cur.e.getDay()]}, ${fmtShort(cur.e)}.${nr ? ` Then <button class="link" data-act="open-rot" data-id="${esc(nr.id)}">${esc(rotShort(nr.name))}</button> ${startsWhen(nr.s)}.` : ""}</p></div>`;
  } else if (nr) rot = `<p class="hero-sub">Next: <button class="link" data-act="open-rot" data-id="${esc(nr.id)}">${esc(rotShort(nr.name))}</button> ${startsWhen(nr.s)}.</p>`;
  const next = nx ? `<ul class="rows next-rows">${dateRow(nx)}</ul>` : `<p class="hero-hint">Nothing needs you in the next ${SOON} days.</p>`;
  return `<section class="hero" aria-labelledby="h-hero">
    <div class="hero-main"><p class="hero-meta">${meta}</p><h1 id="h-hero">${esc(heroFact(cur, nx))}</h1>${rot}</div>
    <div class="hero-next"><h2 class="label">Next for you</h2>${next}${daySec}</div>
  </section>`;
}
function agendaGroups() {
  const t = today(); const cur = currentRotation(); const nx = nextAction(cur);
  const items = allDated().filter((x) => !x.done && !x.routine && !(nx && itemKey(x) === itemKey(nx))).sort((a, b) => a.date - b.date || (b.w || 0) - (a.w || 0));
  return [
    ["Not checked off", items.filter((x) => itemState(x) === "slipped"), "passed in the last 14 days"],
    [`Next ${SOON} days`, items.filter((x) => x.date >= t && x.date <= addDays(t, SOON)), `to ${fmtShort(addDays(t, SOON))}`],
    ["Later", items.filter((x) => x.date > addDays(t, SOON) && x.date <= addDays(t, 63)).slice(0, 5), "the next five"]
  ].filter(([, xs]) => xs.length);
}
function comingUpPanel() {
  const all = agendaGroups().flatMap(([, x]) => x); const xs = all.slice(0, 3); const more = all.length - xs.length;
  return `<section class="panel agenda coming" aria-labelledby="h-agenda">
    <div class="panel-head"><h2 id="h-agenda">Coming up</h2><a class="link" href="#calendar">${more > 0 ? `${more} more in Calendar` : "Calendar"}</a></div>
    ${xs.length ? `<ul class="rows">${xs.map((x) => dateRow(x)).join("")}</ul>` : `<div class="empty">Nothing else dated in the next nine weeks. <a class="link" href="#rotations">Add your rotations</a> to see the deadlines they set off.</div>`}
  </section>`;
}
function limitsPanel() {
  const pi = personalItems(); const pr = state.profile;
  const want = [["step1_limit", "Step 1 within 3 years"], ["step2_deadline", pr.step2 === "scheduled" ? "Step 2 CK exam" : "Step 2 CK school deadline"], ["md_limit", "MD within 6 years"]];
  const rows = want.map(([id, label]) => { const i = pi.find((x) => x.id === id); return i ? { i, label } : null; }).filter(Boolean)
    .sort((a, b) => (a.i.done ? 1 : 0) - (b.i.done ? 1 : 0) || a.i.date - b.i.date);
  return `<section class="panel" aria-labelledby="h-limits">
    <div class="panel-head"><h2 id="h-limits">Hard limits</h2><span class="aside">Soonest first</span></div>
    <ul class="facts">${rows.map(({ i, label }) => {
      const st = i.done ? "done" : itemState({ ...i, w: 4 }); const n = diffDays(today(), i.date);
      const right = i.done ? `<span class="due teal">Met</span>` : st === "breach" ? `<span class="due red"><i class="dot breach"></i>Passed</span>` : `<span class="due ${st === "soon" ? "amber" : ""} num">${st === "soon" ? `<i class="dot soon"></i>` : ""}${n < 60 ? plural(n, "day") : n < 730 ? plural(Math.round(n / 30.44), "month") : `${(n / 365.25).toFixed(1)} years`}</span>`;
      return `<li><button class="fact" data-act="open-policy" data-code="${esc(i.code)}"><span class="what"><span class="t">${esc(label)}</span><small class="num">${i.done ? `Done · ${esc(i.code)}` : `${i.monthOnly ? fmtMonth(i.date) : fmt(i.date)} · ${esc(i.code)}`}</small></span>${right}</button></li>`;
    }).join("")}</ul>
  </section>`;
}
function readFirstPanel() {
  const pr = state.profile; const list = (READ_FIRST[pr.phase] || READ_FIRST.ci).slice(0, 3).map(getP).filter(Boolean);
  return `<section class="panel" aria-labelledby="h-read">
    <div class="panel-head"><h2 id="h-read">Read first in ${esc(phaseLabel(pr.phase))}</h2></div>
    <ul class="facts">${list.map((p) => `<li><button class="fact" data-act="open-policy" data-code="${esc(p.c)}"><span class="what"><span class="t">${esc(p.t)}</span><small>${esc(p.c)}</small></span></button></li>`).join("")}</ul>
    <div class="panel-foot"><a class="link" href="#policies">All policies for your stage</a></div>
  </section>`;
}
function progressPanel() {
  const list = applicableReqs(); const secs = [...new Set(list.map((r) => r.sec))]; const set = state.profile.reqSet || "both";
  const tallies = (set === "both" ? ["6", "6.1"] : [set]).map((k) => electiveTally(k));
  return `<section class="panel s6" aria-labelledby="h-prog">
    <div class="panel-head"><span class="ph-t"><h2 id="h-prog">Path to the MD</h2><span class="aside num">${reqProgress().done} of ${list.length} done</span></span></div>
    <div class="secs">${secs.map((sec) => {
      const rs = list.filter((r) => r.sec === sec); const done = rs.filter((r) => state.req[r.id] === "done").length;
      return `<div class="pm-sec"><span class="sec-t"><b>${esc(sec)}</b><span class="num">${done} of ${rs.length}</span></span><span class="segbar" role="img" aria-label="${esc(sec)}: ${done} of ${rs.length} done">${rs.map((r) => `<i class="${esc(state.req[r.id] || "todo")}" title="${esc(SHORT[r.id] || r.label)}: ${STATUS[state.req[r.id] || "todo"][0]}"></i>`).join("")}</span></div>`;
    }).join("")}</div>
    <div class="pm-sec mt8"><span class="sec-t"><b>Clinical electives</b><span>${tallies.length > 1 ? "Under each rulebook" : esc(tallies[0].rule.label)}</span></span>${tallies.map((tl) => miniPlan(tl, tallies.length > 1)).join("")}</div>
  </section>`;
}
function miniPlan(tl, named) {
  const pct = (v) => Math.max(0, Math.min(100, (v / tl.rule.clinical) * 100)); const d = pct(tl.clin); const sn = Math.min(100 - d, pct(tl.clinSoon));
  const who = tl.unit === "weeks" ? "APS-6.1" : "APS-30";
  return `<span class="mini"><span class="mini-t num">${named ? `<span>${who}</span>` : ""}<span>${tl.clin}${tl.clinSoon ? ` + ${tl.clinSoon} planned` : ""} of ${tl.rule.clinical} ${tl.unit}</span></span><span class="track" role="img" aria-label="${who}: ${tl.clin} of ${tl.rule.clinical} ${tl.unit} done, ${tl.clinSoon} planned"><span class="done" style="width:${d}%"></span><span class="soon" style="left:${d}%;width:${sn}%"></span></span></span>`;
}
function conflictsPanel() {
  const conflicts = FLAGS.filter((f) => f.sev === "conflict");
  return `<section class="panel s6" aria-labelledby="h-conf">
    <div class="panel-head"><span class="ph-t"><h2 id="h-conf">Where the policies disagree</h2><span class="count-chip num">${conflicts.length}</span></span><a class="link" href="#health">Policy health</a></div>
    <ul class="rows plain">${conflicts.map((f) => `<li><div class="what"><span class="t">${esc(f.title)}</span><small>Ask: ${esc(f.who.split(/[:(]/)[0].trim())}</small></div><div class="tail">${f.codes.slice(0, 2).map(codeBtn).join("")}</div></li>`).join("")}</ul>
    <div class="panel-foot"><span class="hint">Until they're fixed, get the answer that applies to you in writing. The linked PDF governs.</span></div>
  </section>`;
}
/* Today answers three things first: where you are and what's next, today's habits, and today's debrief. Then what's coming. */
/* A clerkship schedule the student dropped in is the ground truth for that block's dates. If the rotation list has the
   same clerkship somewhere else (or not at all), the week count, deadlines and Debrief's rotation are all off. */
function schedMismatches() {
  if (state.example) return [];
  const out = [];
  for (const sc of state.scheds || []) {
    if (sc.sample || !sc.from || !sc.to || !sc.name) continue;
    const same = (state.rotations || []).filter((r) => r.name === sc.name || r.name.startsWith(sc.name) || sc.name.startsWith(r.name));
    if (same.some((r) => r.start <= sc.to && r.end >= sc.from)) continue;
    out.push({ sc, rot: same.length === 1 ? same[0] : null });
  }
  return out;
}
function mismatchCard() {
  const ms = schedMismatches(); if (!ms.length) return "";
  const { sc, rot } = ms[0]; const f = parseD(sc.from), to = parseD(sc.to);
  const span = `${fmtShort(f)} to ${fmtShort(to)}`;
  return `<section class="cn-health" role="status" aria-labelledby="h-sched-mm"><div><h2 id="h-sched-mm">Your ${esc(rotShort(sc.name))} dates don't match its schedule</h2>
    <p>The ${esc(rotShort(sc.name))} schedule you dropped in runs <b class="num">${esc(span)}</b>${rot ? `, but your rotations list has ${esc(rotShort(rot.name))} from ${esc(fmtShort(parseD(rot.start)))} to ${esc(fmtShort(parseD(rot.end)))}` : `, but it isn't on your rotations list`}. Until they match, Today can't count your weeks and its deadlines are off.</p></div>
    <div class="cn-health-act"><button class="btn small primary" data-act="sched-fix" data-sid="${esc(sc.id)}" id="sched-fix">${rot ? `Move ${esc(rotShort(rot.name))} to ${esc(span)}` : `Add ${esc(rotShort(sc.name))}, ${esc(span)}`}</button><a class="btn quiet small" href="#rotations">Edit rotations</a></div></section>`;
}
function fixSchedMismatch(sid) {
  const m = schedMismatches().find((x) => x.sc.id === sid); if (!m) return;
  const { sc, rot } = m;
  if (rot) { rot.start = sc.from; rot.end = sc.to; rot.src = "you"; }
  else state.rotations = (state.rotations || []).concat([{ id: "r" + Date.now().toString(36), name: sc.name, kind: "clerkship", start: sc.from, end: sc.to, src: "you" }]);
  persist(); render(); toast(`${rotShort(sc.name)} is now ${fmtShort(parseD(sc.from))} to ${fmtShort(parseD(sc.to))}. Its deadlines moved with it.`);
}
function vToday() {
  const pend = state.example ? [] : (state.rotations || []).filter(guessedPast);
  const pendCard = pend.length ? `<section class="cn-health" role="status" aria-labelledby="h-ct-alert"><div><h2 id="h-ct-alert">Confirm ${pend.length === 1 ? "a past clerkship" : `${pend.length} past clerkships`}</h2>
      <p>${esc(pend.map((r) => `${rotShort(r.name)} ${fmtShort(parseD(r.start))}–${fmtShort(parseD(r.end))}`).join(", "))} came from a standard track's dates, so ${pend.length === 1 ? "its" : "their"} evaluations, grades and grade-review deadlines aren't counted until you confirm or fix ${pend.length === 1 ? "it" : "them"}.</p></div>
      <div class="cn-health-act"><button class="btn small" data-act="wiz-open">Build my year</button><a class="btn quiet small" href="#schedule" data-act="go-track">Review one by one</a></div></section>` : "";
  return `<div class="home">
    ${mismatchCard()}${pendCard}${modToday("alert")}
    ${heroHtml()}
    <div class="today-pair">${modToday("main")}<section class="dbf dbf-today" id="view-today" aria-label="Debrief"></section></div>
    ${comingUpPanel()}
    ${modToday("later")}
  </div>`;
}
function firstSentence(s) { const m = String(s).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : s; }
function planBar(label, done, soon, target, unit) {
  const pct = (v) => Math.max(0, Math.min(100, (v / target) * 100));
  const d = pct(done); const s = Math.min(100 - d, pct(soon));
  return `<div class="plan"><div class="plan-top"><span>${esc(label)}</span><b class="num">${done}${soon ? ` <span class="muted">+${soon} planned</span>` : ""}</b></div>
    <div class="track" role="img" aria-label="${done} of ${target} ${unit} done, ${soon} planned"><span class="done" style="width:${d}%"></span><span class="soon" style="left:${d}%;width:${s}%"></span></div>
    <div class="plan-ends"><span>0</span><span>${target} ${unit}</span></div></div>`;
}

/* ----- requirements ----- */
/* ----- Progress: the whole program as one journey, the requirements hanging off its phases ----- */
const TICK_SVG = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6.3l2 2 4-4.6"/></svg>`;
function journeyPhases() {
  const D = profileDates(state.profile);
  const ciS = D.ciStart || addMonths(D.matric, 20); const ciE = D.ciEnd || addMonths(ciS, 12); const fyS = addDays(ciE, 1);
  return [
    { k: "pre", sec: "Preclerkship", label: "Preclerkship", a: D.matric, b: ciS, fr: 3 },
    { k: "ci", sec: "Clinical Immersion", label: "Clinical Immersion", a: ciS, b: ciE, fr: 5 },
    { k: "fy", sec: "Final Year", label: "Final Year", a: fyS, b: D.grad, fr: 4 },
    { k: "room", sec: "", label: "Room before the limit", a: D.grad, b: D.mdLimit, fr: 2 }
  ];
}
function journeyHtml() {
  const pr = state.profile; const D = profileDates(pr); const t = today();
  const ph = journeyPhases(); const tot = ph.reduce((s, p) => s + p.fr, 0);
  let acc = 0; for (const p of ph) { p.x0 = (acc / tot) * 100; acc += p.fr; p.x1 = (acc / tot) * 100; }
  const pos = (d) => { for (const p of ph) if (d <= p.b || p === ph[ph.length - 1]) { const f = Math.max(0, Math.min(1, (d - p.a) / Math.max(1, p.b - p.a))); return p.x0 + f * (p.x1 - p.x0); } return 100; };
  const s1 = pr.step1 === "passed"; const pi = personalItems();
  const ms = [
    ...(s1 ? [] : [{ d: D.step1Limit, l: "Step 1 limit", sub: fmtMonth(D.step1Limit), cls: diffDays(t, D.step1Limit) < 0 ? "breach" : "" }]),
    ...pi.filter((i) => i.id === "step2_deadline" && !i.done).map((i) => ({ d: i.date, l: "Step 2 CK", sub: fmtMonth(i.date), cls: diffDays(t, i.date) >= 0 && diffDays(t, i.date) <= SOON ? "soon" : "" })),
    { d: D.mspeRelease, l: "MSPE out", sub: fmtShort(D.mspeRelease) },
    { d: D.grad, l: "Graduation", sub: fmtMonth(D.grad), strong: true },
    { d: D.mdLimit, l: "6-year limit", sub: fmtMonth(D.mdLimit), end: true }
  ].filter((m) => m.d && m.d >= t).map((m) => ({ ...m, x: pos(m.d) })).sort((a, b) => a.x - b.x);
  const lastX = { up: -99, down: -99 }; ms.forEach((m, i) => { let side = i % 2 ? "down" : "up"; if (m.x - lastX[side] < 11) side = side === "up" ? "down" : "up"; m.side = side; lastX[side] = m.x; });
  const tx = pos(t);
  const segs = ph.map((p) => `<span class="j-seg ${p.k}${t > p.b ? " past" : t >= p.a ? " now" : ""}" style="left:${p.x0}%;width:${p.x1 - p.x0}%">${t >= p.a && t <= p.b ? `<i style="width:${(((tx - p.x0) / (p.x1 - p.x0)) * 100).toFixed(1)}%"></i>` : ""}</span>`).join("");
  const marks = ms.map((m) => `<span class="j-ms ${m.side}${m.cls ? " " + m.cls : ""}${m.strong ? " strong" : ""}${m.end ? " end" : ""}" style="left:${m.x.toFixed(2)}%"><i></i><span class="j-l"><b>${esc(m.l)}</b><small class="num">${esc(m.sub)}</small></span></span>`).join("");
  const set = pr.reqSet || "both"; const list = applicableReqs(); const prog = reqProgress();
  const cols = ph.map((p) => {
    if (p.k === "room") return `<div class="j-col room"><h2>After graduation</h2><p class="num">${Math.max(0, monthsBetween(D.grad, D.mdLimit))} months of room before the 6-year limit in ${fmtMonth(D.mdLimit)}.</p><p class="muted">Leave for another degree pauses this clock; other leave doesn't (APS-33).</p></div>`;
    const rs = list.filter((r) => r.sec === p.sec); const done = rs.filter((r) => state.req[r.id] === "done").length;
    return `<div class="j-col"><h2>${esc(p.label)}<span class="num">${done} of ${rs.length}</span></h2><div class="j-tiles">${rs.map((r) => {
      const st = state.req[r.id] || "todo"; const differs = set === "both" && r.v6 && r.v61 && r.v6 !== r.v61;
      return `<button class="jt ${st}" data-act="tile" data-id="${r.id}" title="${esc(r.label)}${differs ? " (the two rulebooks differ here)" : ""}"><span class="jt-i" aria-hidden="true">${TICK_SVG}</span><span class="jt-t">${esc(SHORT[r.id] || r.label)}<small>${STATUS[st][0]}${differs ? ` · <em>rulebooks differ</em>` : ""}</small></span><span class="sr">. Select to change.</span></button>`;
    }).join("")}</div></div>`;
  }).join("");
  const toGrad = monthsBetween(t, D.grad);
  return `<section class="panel journey" aria-labelledby="h-journey">
    <div class="j-top"><div><p class="hero-meta">Matriculated ${fmtMonth(D.matric)} · month ${Math.max(1, monthsBetween(D.matric, t) + 1)} of ${Math.max(1, monthsBetween(D.matric, D.grad))} · ${esc(phaseLabel(pr.phase))}</p>
      <h1 id="h-journey">${toGrad > 0 ? `${plural(toGrad, "month")} to graduation.` : "Graduation month."}</h1>
      <p class="j-sub"><span class="num">${prog.done} of ${prog.total}</span> requirements done. ${Math.max(0, monthsBetween(D.grad, D.mdLimit))} months of room before the 6-year limit.</p></div>
      <div class="title-actions"><div class="seg" role="group" aria-label="Rulebook">${[["both", "Both"], ["6", "APS-6 (2026)"], ["6.1", "APS-6.1"]].map(([k, l]) => `<button aria-pressed="${set === k}" data-act="req-set" data-set="${k}">${l}</button>`).join("")}</div><button class="btn primary" data-act="open-audit">Import degree audit</button></div></div>
    <div class="j-line" role="img" aria-label="Program from ${fmtMonth(D.matric)} to graduation in ${fmtMonth(D.grad)} and the 6-year limit in ${fmtMonth(D.mdLimit)}; today is in ${esc(phaseLabel(pr.phase))}">
      ${segs}${marks}<span class="j-today" style="left:${tx.toFixed(2)}%"><i></i><span>Today</span></span>
    </div>
    <div class="j-cols" style="grid-template-columns:${ph.map((p) => `${p.fr}fr`).join(" ")}">${cols}</div>
  </section>`;
}
function vRequirements() {
  const set = state.profile.reqSet || "both";
  const list = applicableReqs();
  const prog = reqProgress();
  const secs = [...new Set(list.map((r) => r.sec))];
  const ruleCell = (r) => {
    if (r.note && !r.v6 && !r.v61) return `<span class="req-rule">${esc(r.note)}</span>`;
    const a = r.v6, b = r.v61;
    if (set === "6") return `<span class="req-rule">${esc(a || r.note || "")}</span>`;
    if (set === "6.1") return `<span class="req-rule">${esc(b || r.note || "")}</span>`;
    if (a && b && a !== b) return `<span class="req-rule"><b>APS-6:</b> ${esc(a)}<br><b>APS-6.1:</b> ${esc(b)}</span><span class="diff">The two rulebooks differ here</span>`;
    return `<span class="req-rule">${esc(a || b || r.note || "")}${r.only ? ` <span class="muted">(APS-${r.only} only)</span>` : ""}</span>`;
  };
  const sel = (r) => `<label class="sr" for="st-${r.id}">Status of ${esc(r.label)}</label><select class="status-sel" id="st-${r.id}" data-act="req-status" data-id="${r.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${((state.req[r.id] || "todo") === k) ? "selected" : ""}>${v[0]}</option>`).join("")}</select>`;
  const tallies = (set === "both" ? ["6", "6.1"] : [set]).map((k) => electiveTally(k));
  return `${journeyHtml()}
  ${ui.audit.open ? auditPanel() : ""}
  <div class="g12 overview">${limitsPanel()}${progressPanel()}${readFirstPanel()}${conflictsPanel()}</div>
  <div class="grid">
    <section class="panel span-3" aria-labelledby="h-checklist">
      <div class="panel-head"><h2 id="h-checklist">Graduation checklist</h2><span class="aside">APS-6, APS-6.1, APS-30 and the 2026-27 catalog</span></div>
      <div class="table-wrap"><table class="req-table"><thead><tr><th>Requirement</th><th>Rule</th><th>Source</th><th class="num">Status</th></tr></thead><tbody>
      ${secs.map((sec) => `<tr class="sec"><td colspan="4">${esc(sec)}</td></tr>` + list.filter((r) => r.sec === sec).map((r) => `<tr><td>${esc(r.label)}${r.note && (r.v6 || r.v61) ? `<small>${esc(r.note)}</small>` : ""}</td><td class="rule-cell">${ruleCell(r)}</td><td class="src-cell">${r.codes.slice(0, 2).map(codeBtn).join(" ")}</td><td class="num">${sel(r)}</td></tr>`).join("")).join("")}
      </tbody></table></div>
    </section>
    <div class="span-3 g12">
      <section class="panel s8" aria-labelledby="h-elec">
        <div class="panel-head"><h2 id="h-elec">Electives</h2><span class="aside">The first Sub-I counts separately</span></div>
        <div class="plans">${tallies.map((tl) => planBar(`Clinical · ${tl.rule.label}`, tl.clin, tl.clinSoon, tl.rule.clinical, tl.unit) + planBar(`Other · ${tl.rule.label}`, tl.open, tl.openSoon, tl.rule.open, tl.unit)).join("")}</div>
        <h3 class="label mt16">Your electives</h3>
        ${(state.electives || []).length ? `<ul class="list two">${state.electives.map((e) => `<li><div class="what">${esc(e.name)}<small>${e.kind === "subi" ? "Sub-Internship" : e.kind === "clinical" ? "Clinical" : "Research or other"} · ${e.weeks || 0} wk · ${e.credits || 0} cr</small></div><div class="tail"><span class="pill ${STATUS[e.status === "planned" ? "todo" : e.status]?.[1] || ""}">${e.status === "planned" ? "Planned" : e.status === "inprog" ? "In progress" : "Done"}</span> <button class="btn quiet small" data-act="del-elective" data-id="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">Remove</button></div></li>`).join("")}</ul>` : `<div class="empty">No electives yet. Add them here or import your audit.</div>`}
        ${ui.addElective ? electiveForm() : `<div class="panel-foot"><button class="btn small" data-act="add-elective">Add an elective</button><span class="hint">1 full-time week ≈ 1 credit (APS-50)</span></div>`}
      </section>
      <section class="panel s4" aria-labelledby="h-comp">
        <div class="panel-head"><h2 id="h-comp">Keep current to stay on rotation</h2></div>
        <ul class="list two">
          <li><div class="what">Flu vaccine<small>Every flu season</small></div><div class="tail">${codeBtn("SWH-5")}</div></li>
          <li><div class="what">TB test or symptom review<small>Every year</small></div><div class="tail">${codeBtn("SWH-5")}</div></li>
          <li><div class="what">Technical standards attestation<small>Every year, online portal</small></div><div class="tail">${codeBtn("AM-6")}</div></li>
          <li><div class="what">Health insurance waiver<small>Each semester's change period</small></div><div class="tail">${codeBtn("SWH-7")}</div></li>
          <li><div class="what">ACLS or PALS<small>Valid through graduation day</small></div><div class="tail">${codeBtn("APS-6")}</div></li>
        </ul>
      </section>
    </div>
  </div>`;
}
function electiveForm() {
  return `<form class="mt16" data-form="elective" style="display:grid;gap:12px">
    <div class="field"><label for="el-name">Elective name</label><input type="text" id="el-name" required placeholder="Inpatient Cardiology"></div>
    <div class="form-grid">
      <div class="field"><label for="el-kind">Type</label><select id="el-kind"><option value="clinical">Clinical</option><option value="open">Research or other</option><option value="subi">Sub-Internship</option></select></div>
      <div class="field"><label for="el-status">Status</label><select id="el-status"><option value="planned">Planned</option><option value="inprog">In progress</option><option value="done">Done</option></select></div>
      <div class="field"><label for="el-weeks">Weeks</label><input type="number" id="el-weeks" min="1" max="52" value="4"></div>
      <div class="field"><label for="el-credits">Credits</label><input type="number" id="el-credits" min="1" max="25" value="4"></div>
    </div>
    <div style="display:flex;gap:8px"><button class="btn primary small" type="submit">Add elective</button><button class="btn small" type="button" data-act="cancel-elective">Cancel</button></div>
  </form>`;
}

/* ----- degree audit import ----- */
function auditPanel() {
  const a = ui.audit;
  let body = "";
  if (a.status === "review" && a.result) body = auditReview(a.result);
  else body = `<div class="drop" id="drop">
      <div class="field"><label for="audit-text">Paste your degree audit or transcript</label>
      <textarea id="audit-text" placeholder="Paste the text of your degree audit, unofficial transcript or a list of completed courses with grades.">${esc(a.text)}</textarea></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label class="btn small" for="audit-file">Choose a file</label><input id="audit-file" type="file" accept=".pdf,.txt,.csv,.html,.htm,.md" class="sr"><button class="btn small quiet" type="button" data-act="sample-audit">Try a sample audit</button>
        <span class="hint" id="audit-file-name">${a.fileName ? esc(a.fileName) : "PDF, text or saved web page. A scanned image won't read; paste the text instead."}</span>
      </div>
    </div>
    ${a.error ? `<p class="small" style="color:var(--negative)" role="alert">${esc(a.error)}</p>` : ""}
    <div class="panel-foot">
      <span class="hint">Read in this browser; nothing is uploaded. Nothing changes until you apply it.</span>
      <div style="display:flex;gap:8px"><button class="btn small" data-act="close-audit">Cancel</button><button class="btn primary small" data-act="run-audit" ${a.status === "reading" ? "disabled" : ""}>${a.status === "parsing" ? "Reading your audit…" : a.status === "reading" ? "Opening file…" : "Read my audit"}</button></div>
    </div>`;
  return `<section class="panel" aria-labelledby="h-audit"><div class="panel-head"><h2 id="h-audit" tabindex="-1">Import degree audit</h2><span class="aside">Read and kept in this browser only</span></div>${body}</section>`;
}
function matchElective(e) {
  const n = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (state.electives || []).find((x) => (x.code && x.code === e.code) || n(x.name) === n(e.name) || (n(x.name).length > 6 && n(e.name).startsWith(n(x.name))));
}
function auditReview(r) {
  const rows = [];
  const label = (id) => (REQS.find((x) => x.id === id) || {}).label || id;
  for (const [id, st] of Object.entries(r.statuses || {})) {
    if (!REQS.find((x) => x.id === id) || !STATUS[st]) continue;
    const cur = state.req[id] || "todo";
    if (cur === st) continue;
    rows.push({ key: "s:" + id, text: `${esc(label(id))}: ${STATUS[cur][0]} → <b>${STATUS[st][0]}</b>` });
  }
  (r.electives || []).forEach((e, i) => {
    const ex = matchElective(e);
    const st = e.status === "planned" ? "Planned" : e.status === "inprog" ? "In progress" : "Done";
    const kind = e.kind === "subi" ? "Sub-I" : e.kind === "clinical" ? "clinical" : "research or other";
    if (ex) {
      if (ex.status !== e.status || (e.credits && Number(ex.credits) !== Number(e.credits))) rows.push({ key: "e:" + i, text: `Update elective <b>${esc(ex.name)}</b>: ${st}${e.credits ? ` · ${e.credits} cr` : ""}` });
    } else rows.push({ key: "e:" + i, text: `Add elective <b>${esc(e.name)}</b> (${esc(e.code)}) · ${kind} · ${e.credits ? e.credits + " cr" : "credits not listed"} · ${st}` });
  });
  if ((r.rotations || []).length) { const bt = bestTrack(r.rotations); rows.push({ key: "rot", text: `Schedule → ${r.rotations.map((x) => `<b>${esc(rotShort(x.name))}</b> ${esc(fmtShort(parseD(x.start)))}–${esc(fmtShort(parseD(x.end)))}`).join(", ")} · ${bt.exact ? `matches Track ${esc(bt.id)}` : `custom track${bt.id ? ` (started from Track ${esc(bt.id)})` : ""}`}` }); }
  if (r.step1Date && r.step1Date !== state.profile.step1Date) rows.push({ key: "s1d", text: `Step 1 → <b>passed ${esc(fmt(parseD(r.step1Date)))}</b>` });
  if (r.reqSet && r.reqSet !== state.profile.reqSet) rows.push({ key: "r", text: `Rulebook → <b>APS-${esc(r.reqSet)}</b> (named in the audit)` });
  if (r.matriculation && parseD(r.matriculation) && r.matriculation !== state.profile.matric) rows.push({ key: "m", text: `Matriculation date → <b>${esc(fmt(parseD(r.matriculation)))}</b>` });
  if (r.expectedGraduation && parseD(r.expectedGraduation) && r.expectedGraduation !== state.profile.grad) rows.push({ key: "g", text: `Graduation → <b>${esc(fmtMonth(parseD(r.expectedGraduation)))}</b>` });
  const notes = (r.notes || []).filter(Boolean).slice(0, 8);
  return `<p class="hint">Read ${plural(r.found, "course")} from the audit and found ${plural(rows.length, "change")}. Untick anything that's wrong, then apply.</p>
    ${rows.length ? `<ul class="changes">${rows.map((x) => `<li><input type="checkbox" id="ch-${esc(x.key)}" data-pick="${esc(x.key)}" ${ui.audit.pick[x.key] !== false ? "checked" : ""}><label for="ch-${esc(x.key)}">${x.text}</label></li>`).join("")}</ul>` : `<div class="empty">Nothing in the audit differs from what's already here.</div>`}
    ${notes.length ? `<h3 class="label mt16">Check these</h3><ul class="rules mt8">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    <div class="panel-foot"><button class="btn small" data-act="close-audit">Discard</button><button class="btn primary small" data-act="apply-audit" ${rows.length ? "" : "disabled"}>Apply selected changes</button></div>`;
}
let pdfReady = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load the PDF reader")); document.head.appendChild(s); }); }
async function pdfText(buf, pageMark) {
  if (!pdfReady) pdfReady = loadScript("vendor/pdf.min.js");
  await pdfReady;
  const lib = window.pdfjsLib;
  if (!lib) throw new Error("PDF reader unavailable");
  lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  const doc = await lib.getDocument({ data: buf, isEvalSupported: false }).promise;
  let out = "";
  for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
    const pg = await doc.getPage(i); const tc = await pg.getTextContent();
    out += (pageMark ? pageMark.replace("#", String(i)) : "") + pdfJoin(tc.items) + "\n";
  }
  return out.replace(/[ \t]+/g, " ").trim();
}
/* pdf.js hands back text in fragments, often mid-word; join by position so words stay whole and lines stay lines */
function pdfJoin(items) {
  let out = "", prev = null;
  for (const it of items) {
    if (!it.str && !it.hasEOL) continue;
    const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10;
    if (prev) {
      if (Math.abs(y - prev.y) >= h * 0.5) { if (!out.endsWith("\n")) out += "\n"; }
      else if (x - (prev.x + prev.w) > h * 0.18 && !/[ \n]$/.test(out) && !it.str.startsWith(" ")) out += " ";
    }
    out += it.str; prev = { x, y, w: it.width || 0 };
    if (it.hasEOL) out += "\n";
  }
  return out;
}
async function readAuditFile(file) {
  ui.audit.status = "reading"; ui.audit.fileName = file.name; ui.audit.error = ""; render();
  try {
    let text = "";
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") text = await pdfText(await file.arrayBuffer());
    else if (/\.html?$/i.test(file.name)) { const doc = new DOMParser().parseFromString(await file.text(), "text/html"); text = (doc.body && doc.body.textContent || "").replace(/\s+\n/g, "\n"); }
    else text = await file.text();
    if (!text.trim()) throw new Error("No text found in that file. If it's a scan, paste the text instead.");
    ui.audit.text = text.slice(0, 120000); ui.audit.status = "idle";
  } catch (e) { ui.audit.status = "idle"; ui.audit.error = e.message || "Couldn't read that file."; }
  render();
}
function runAudit() {
  const ta = $("#audit-text"); if (ta) ui.audit.text = ta.value;
  const text = (ui.audit.text || "").trim();
  if (!text) { ui.audit.error = "Paste your audit or choose a file first."; render(); return; }
  const r = parseAudit(text);
  if (!r.found && !Object.keys(r.statuses).length) {
    ui.audit.error = "No CI MED course numbers (like CLE 645 or BSE 680) found in that text. Paste the page that lists your courses and grades.";
    render(); return;
  }
  ui.audit.result = r; ui.audit.status = "review"; ui.audit.pick = {}; ui.audit.error = "";
  render(); refocus("#h-audit");
}
function applyAudit() {
  const r = ui.audit.result; if (!r) return;
  applyAuditResult(r, (k) => ui.audit.pick[k] !== false);
  becomeMine(); persist();
  ui.audit = { open: false, status: "idle", text: "", fileName: "", result: null, error: "", pick: {} };
  render(); const pg = reqProgress(); toast(`Audit applied. Graduation checklist: ${pg.done} of ${pg.total}.`);
}
/* everything an audit can fill in; used by Progress (with the review ticks) and by setup (all of it) */
function applyAuditResult(r, ok) {
  ok = ok || (() => true);
  for (const [id, st] of Object.entries(r.statuses || {})) if (REQS.find((x) => x.id === id) && STATUS[st] && ok("s:" + id)) state.req[id] = st;
  (r.electives || []).forEach((e, i) => {
    if (!e || !e.name || !ok("e:" + i)) return;
    const ex = matchElective(e);
    if (ex) { ex.status = e.status; ex.code = e.code; if (e.credits) { ex.credits = e.credits; ex.weeks = e.weeks || e.credits; } return; }
    state.electives.push({ id: "e" + Date.now().toString(36) + i, code: e.code, name: String(e.name).slice(0, 80), kind: e.kind, weeks: e.weeks || 0, credits: e.credits || 0, status: e.status });
  });
  if (ok("r") && r.reqSet) state.profile.reqSet = r.reqSet;
  if (ok("m") && r.matriculation && parseD(r.matriculation)) state.profile.matric = r.matriculation;
  if (ok("g") && r.expectedGraduation && parseD(r.expectedGraduation)) state.profile.grad = r.expectedGraduation.slice(0, 7);
  const pr = state.profile;
  if (ok("s:step1") && r.statuses && r.statuses.step1 === "done") pr.step1 = "passed";
  if (ok("s1d") && r.step1Date) { pr.step1 = "passed"; pr.step1Date = r.step1Date; }
  if (ok("s:step2") && r.statuses && r.statuses.step2 === "done") pr.step2 = "passed";
  if (ok("rot") && (r.rotations || []).length) {
    const bt = bestTrack(r.rotations);
    if (bt.exact && !(pr.track === "custom")) { applyTrackQuiet(bt.id); }
    else { const base = pr.track && pr.track !== "custom" ? pr.track : pr.trackBase || bt.id; setCustomRotations(customPlan(r.rotations, base), base); }
    const t = today(); if (r.rotations.some((x) => parseD(x.start) <= t)) pr.phase = "ci";
  }
}
/* the example sandbox never turns into a student's plan; their own plan is kept apart from it */
function becomeMine() { return false; }
function statusAfterDone() {
  const n = allDated().filter((x) => itemState(x) === "soon").length;
  return n ? `Done. ${plural(n, "date")} left in the next ${SOON} days.` : `Done. Clear for the next ${SOON} days.`;
}

/* ----- clerkship tracks: pick one and the year fills in ----- */
const CUSTOM_TRACKS_KEY = "pn-track-schedule";
const REQ_FOR = { "Family Medicine": "cl_fm", "Internal Medicine": "cl_im", "Neurology": "cl_neuro", "Psychiatry": "cl_psych", "Obstetrics and Gynecology": "cl_ob", "Pediatrics": "cl_peds", "Surgery": "cl_surg" };
const TRACK_SHORT = { "Obstetrics and Gynecology": "OB/GYN", "Internal Medicine": "Medicine", "Family Medicine": "Family Med", "Neurology": "Neuro", "Pediatrics": "Peds", "Psychiatry": "Psych" };
function customTracks() { const v = state.customTracks; return v && v.tracks && Array.isArray(v.blocks) ? v : null; }
function schedule() { return customTracks() || (typeof TRACK_SCHEDULE !== "undefined" ? TRACK_SCHEDULE : null); }
function tracksMatching(clerk, a, b) {
  const s = schedule(); if (!s || !clerk) return [];
  return Object.entries(s.tracks).filter(([, seq]) => seq.some((x) => x.n === clerk && Math.abs(diffDays(parseD(x.a), parseD(a))) <= 7 && Math.abs(diffDays(parseD(x.b), parseD(b))) <= 7)).map(([k]) => k);
}
function applyTrackQuiet(id) { applyTrack(id, true); }
function applyTrack(id, quiet) {
  const s = schedule(); const seq = s && s.tracks[id]; if (!seq) return;
  const a0 = seq[0].a, b1 = seq[seq.length - 1].b; const t = today();
  const old = state.rotations || [];
  const replaced = old.filter((r) => r.src === "track" || ((r.kind === "clerkship" || /^Elective \(block/.test(r.name)) && r.end >= a0 && r.start <= b1));
  const grades = Object.fromEntries(replaced.filter((r) => r.gradePosted).map((r) => [r.name, r.gradePosted]));
  const stamp = Date.now().toString(36);
  state.rotations = old.filter((r) => !replaced.includes(r)).concat(seq.map((x, i) => {
    const el = x.n === "Elective";
    return { id: `t${id}-${i}-${stamp}`, name: el ? `Elective (block ${x.blocks})` : x.n, kind: el ? "elective" : "clerkship", start: x.a, end: x.b, src: "track", ...(grades[x.n] ? { gradePosted: grades[x.n] } : {}) };
  }));
  const pr = state.profile; pr.track = id; pr.trackSched = s.id; pr.ciStart = a0; pr.ciEnd = b1;
  if (t >= parseD(a0) && t <= parseD(b1)) pr.phase = "ci"; else if (t > parseD(b1) && (pr.phase === "pre" || pr.phase === "ci")) pr.phase = "fy";
  const cur = seq.find((x) => parseD(x.a) <= t && parseD(x.b) >= t);
  if (cur && REQ_FOR[cur.n] && (state.req[REQ_FOR[cur.n]] || "todo") === "todo") state.req[REQ_FOR[cur.n]] = "inprog";
  if (quiet) return;
  const first = becomeMine(true); persist(); render();
  const what = cur ? `You're on ${cur.n === "Elective" ? "an elective" : rotShort(cur.n)} until ${WD[parseD(cur.b).getDay()]}, ${fmtShort(parseD(cur.b))}.` : `${plural(seq.length, "rotation")} added.`;
  toast(`${first ? "Your plan is set up. " : ""}Track ${id} set. ${what}`);
}
function trackPanel() {
  const s = schedule(); if (!s) return "";
  const pr = state.profile; const t = today(); const mine = pr.track && s.tracks[pr.track] ? pr.track : "";
  const curB = s.blocks.findIndex((b) => parseD(b.a) <= t && parseD(b.b) >= t);
  const covering = (seq, b) => seq.find((x) => x.a <= b.a && x.b >= b.b);
  const onNow = curB >= 0 ? [...new Set(Object.values(s.tracks).map((seq) => (covering(seq, s.blocks[curB]) || {}).n).filter(Boolean))] : [];
  const f = ui.trackFind && onNow.includes(ui.trackFind) ? ui.trackFind : "";
  const head = `<tr><th scope="col">Track</th>${s.blocks.map((b, i) => `<th scope="col" class="${i === curB ? "now" : ""}">${esc(b.k)}<small class="num">${fmtShort(parseD(b.a))}</small>${i === curB ? `<em>Now</em>` : ""}</th>`).join("")}</tr>`;
  const rows = Object.entries(s.tracks).map(([id, seq]) => {
    const match = !f || (curB >= 0 && (covering(seq, s.blocks[curB]) || {}).n === f);
    let cells = ""; let bi = 0;
    while (bi < s.blocks.length) {
      const b = s.blocks[bi]; const x = seq.find((y) => y.a <= b.a && y.b >= b.b);
      if (!x) { cells += `<td></td>`; bi++; continue; }
      let span = 1; while (bi + span < s.blocks.length && s.blocks[bi + span].b <= x.b) span++;
      const now = curB >= bi && curB < bi + span;
      cells += `<td ${span > 1 ? `colspan="${span}"` : ""} class="${now ? "now" : ""}${x.n === "Elective" ? " el" : ""}">${esc(TRACK_SHORT[x.n] || x.n)}</td>`; bi += span;
    }
    return `<tr class="${id === mine ? "sel" : ""}${match ? "" : " dim"}" data-act="pick-track" data-t="${esc(id)}"><th scope="row"><button class="tk-btn" data-act="pick-track" data-t="${esc(id)}" aria-pressed="${id === mine}" aria-label="Use track ${esc(id)}">${esc(id)}</button></th>${cells}</tr>`;
  }).join("");
  const seqMine = mine ? s.tracks[mine] : null; const curMine = seqMine && seqMine.find((x) => parseD(x.a) <= t && parseD(x.b) >= t);
  const lead = mine ? `<b>Track ${esc(mine)}.</b> ${curMine ? `You're on ${curMine.n === "Elective" ? "an elective" : esc(curMine.n)} until ${fmtShort(parseD(curMine.b))}. ` : ""}Pick another row to switch; your grade dates stay.` : "Pick your track and every clerkship, elective and the deadlines they set off fill in. Not sure which one? Tap what you're on now.";
  return `<section class="panel" aria-labelledby="h-track" id="track">
    <div class="panel-head"><h2 id="h-track">Your clerkship track</h2><span class="aside">${esc(s.label)}${customTracks() ? ` · <button class="link" data-act="tracks-reset">Use the built-in AY2026-27 schedule</button>` : ""}</span></div>
    <p class="tk-lead">${lead}</p>
    ${onNow.length ? `<div class="tk-find" role="group" aria-label="What you're on now"><span class="hint">On now:</span>${onNow.map((n) => `<button class="chip" aria-pressed="${f === n}" data-act="track-find" data-n="${esc(n)}">${esc(TRACK_SHORT[n] || n)}</button>`).join("")}${f ? `<button class="link" data-act="track-find" data-n="">Show all</button>` : ""}</div>` : ""}
    <div class="table-wrap"><table class="tk"><caption class="sr">Clerkship tracks by block</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

/* ----- custom tracks: your own clerkship sequence, built from your degree audit or by hand -----
   Students who start off-cycle (a later Step 1, a leave, a swap approved by Student Affairs) don't match any of the ten
   tracks. Their plan is their rotations, each tagged with where it came from: the audit (registrar dates), a standard
   track they started from (to confirm), or themselves. */
const CLERK_WEEKS = { "Internal Medicine": 10, "Surgery": 10 };
function trackLabel(pr) { pr = pr || state.profile; return pr.track === "custom" ? (pr.trackBase ? `Custom track (from ${pr.trackBase})` : "Custom track") : pr.track ? `Track ${pr.track}` : ""; }
function bestTrack(rots) {
  const s = schedule(); if (!s || !rots.length) return { id: "", score: 0, exact: false };
  let best = { id: "", score: 0, exact: false };
  for (const [id, seq] of Object.entries(s.tracks)) {
    const score = rots.filter((r) => seq.some((x) => x.n === r.name && Math.abs(diffDays(parseD(x.a), parseD(r.start))) <= 7 && Math.abs(diffDays(parseD(x.b), parseD(r.end))) <= 7)).length;
    if (score > best.score) best = { id, score, exact: score === rots.length };
  }
  return best;
}
function clerkState(name) { const id = REQ_FOR[name]; return id ? state.req[id] || "todo" : ""; }
/* builds the rotation list for a custom track: audit dates first, then the base track's future blocks for clerkships the audit doesn't cover */
function customPlan(auditRots, base) {
  const t = today(); const s = schedule(); const seq = base && s && s.tracks[base] ? s.tracks[base] : [];
  const out = auditRots.map((r) => ({ id: `a-${r.code.replace(/\s/g, "")}-${r.start}`, name: r.name, kind: "clerkship", start: r.start, end: r.end, src: "audit" }));
  const covered = new Set(out.map((r) => r.name));
  for (const [i, x] of seq.entries()) {
    if (x.n === "Elective" || covered.has(x.n) || parseD(x.a) <= t || clerkState(x.n) === "done") continue;
    out.push({ id: `b${base}-${i}`, name: x.n, kind: "clerkship", start: x.a, end: x.b, src: "base" });
    covered.add(x.n);
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
function setCustomRotations(rots, base) {
  /* clerkships the student added or edited by hand survive a re-import, unless the audit itself lists that clerkship;
     the audit's dates are the official ones. A track's guess never replaces the student's own dates. */
  const audited = new Set(rots.filter((r) => r.src === "audit").map((r) => r.name));
  const own = (state.rotations || []).filter((r) => r.kind === "clerkship" && !["audit", "base", "track"].includes(r.src) && !audited.has(r.name) && !rots.some((x) => x.id === r.id));
  rots = rots.filter((r) => !(r.src === "base" && own.some((m) => m.name === r.name))).concat(own);
  const keep = (state.rotations || []).filter((r) => r.kind !== "clerkship" && !/^Elective \(block/.test(r.name));
  const grades = Object.fromEntries((state.rotations || []).filter((r) => r.gradePosted).map((r) => [r.name + r.start, r.gradePosted]));
  state.rotations = keep.concat(rots.map((r) => (grades[r.name + r.start] ? { ...r, gradePosted: grades[r.name + r.start] } : r)));
  const pr = state.profile; pr.track = "custom"; pr.trackBase = base || ""; pr.trackSched = schedule() ? schedule().id : "";
  const cl = state.rotations.filter((r) => r.kind === "clerkship").sort((a, b) => a.start.localeCompare(b.start));
  if (cl.length) { pr.ciStart = cl[0].start; pr.ciEnd = cl[cl.length - 1].end; }
}
function missingClerkships() {
  const have = new Set((state.rotations || []).filter((r) => r.kind === "clerkship" && !guessedPast(r)).map((r) => r.name));
  return CLERKSHIPS.filter((n) => !have.has(n) && clerkState(n) !== "done");
}
function nextSlot(name) {
  const weeks = CLERK_WEEKS[name] || 5; const s = schedule(); const t = today();
  const ends = (state.rotations || []).filter((r) => r.kind === "clerkship" && r.end).map((r) => r.end).sort();
  const after = ends.length ? ends[ends.length - 1] : isoD(t);
  const blk = s ? s.blocks.find((b) => b.a > after) : null;
  if (blk) {
    const i = s.blocks.indexOf(blk); const last = s.blocks[Math.min(s.blocks.length - 1, i + (weeks > 5 ? 1 : 0))];
    return { start: blk.a, end: last.b };
  }
  let st = addDays(parseD(after), 1); while (st.getDay() !== 1) st = addDays(st, 1);
  return { start: isoD(st), end: isoD(addDays(st, weeks * 7 - 1)) };
}
function makeCustom() {
  const base = state.profile.track && state.profile.track !== "custom" ? state.profile.track : state.profile.trackBase || "";
  const cl = (state.rotations || []).filter((r) => r.kind === "clerkship").map((r) => ({ ...r, src: r.src === "track" ? "base" : r.src || "you" }));
  setCustomRotations(cl, base); becomeMine(); persist(); render();
  toast("Custom track on. Change any date and everything that depends on it follows.");
}
function rotPill(r) {
  const t = today(); const s = parseD(r.start), e = parseD(r.end); const st = clerkState(r.name);
  if (st === "done") return `<span class="pill pos">Done</span>`;
  if (s && e && s <= t && e >= t) return `<span class="pill info">Now</span>`;
  if (e && e < t) return `<span class="pill warn">Grade pending</span>`;
  return `<span class="pill">Upcoming</span>`;
}
const SRC_TAG = { audit: "From your audit", base: "From your assigned track, confirm", you: "Added by you", track: "From your track", est: "Estimated: with the next class, confirm when their schedule is out" };

/* ----- Build my year: the track you move with, where you started, and only the blocks that were different -----
   Off-cycle students mostly follow one track with a few blocks swapped, then finish the clerkships they missed with the
   next class. So: pick the track, pick the block your year started, change the blocks that differ; everything not
   placed lines up after the track ends (estimated dates, reorderable). Saving replaces the clerkships and block
   electives on the plan; other rotations (sub-Is, aways) stay. */
const WIZ_OFF = "off", WIZ_BEFORE = "before";
function wizSeq(base) { const s = schedule(); return s && s.tracks[base] ? s.tracks[base] : []; }
function wizInit(base) {
  const s = schedule(); const pr = state.profile;
  base = base || pr.trackBase || (pr.track && pr.track !== "custom" ? pr.track : "") || (s ? Object.keys(s.tracks)[0] : "");
  const seq = wizSeq(base);
  const rots = (state.rotations || []).filter((r) => !guessedPast(r) && (r.kind === "clerkship" || r.kind === "elective"));
  const own = (r) => !["base", "track", "est"].includes(r.src);
  const near = (x) => rots.find((r) => own(r) && Math.abs(diffDays(parseD(r.start), parseD(x.a))) <= 7);
  /* where the year started: the first block the student's own plan has something in, else their recorded start */
  const firstOwn = seq.find((x) => near(x));
  const start = firstOwn ? firstOwn.a : (seq.find((x) => pr.ciStart && x.a >= pr.ciStart) || seq[0] || {}).a || "";
  const picks = seq.map((x) => { const h = near(x); return h ? (h.kind === "elective" ? "Elective" : h.name) : x.n; });
  return { base, start, picks, order: [] };
}
function wizLater(w) {
  const seq = wizSeq(w.base); const placed = new Set();
  seq.forEach((x, i) => { if (x.a >= w.start && CLERKSHIPS.includes(w.picks[i])) placed.add(w.picks[i]); });
  /* first order: the order the plan already has them in (dates the student set), else the usual one */
  const had = (n) => ((state.rotations || []).find((r) => r.kind === "clerkship" && r.name === n && !["base", "track"].includes(r.src)) || {}).start || "9999";
  const need = CLERKSHIPS.filter((n) => !placed.has(n) && clerkState(n) !== "done").sort((a, b) => had(a).localeCompare(had(b)));
  const order = w.order.filter((n) => need.includes(n)).concat(need.filter((n) => !w.order.includes(n)));
  w.order = order;
  /* back to back from the Monday after the track's last block, at each clerkship's usual length; editable after saving */
  const last = seq.filter((x, i) => x.a >= w.start && w.picks[i] !== WIZ_OFF).map((x) => x.b).sort().pop() || isoD(today());
  let st = addDays(parseD(last), 1); while (st.getDay() !== 1) st = addDays(st, 1);
  return order.map((n) => {
    const weeks = CLERK_WEEKS[n] || 5; const a = st; const b = addDays(a, weeks * 7 - 1); st = addDays(b, 1); while (st.getDay() !== 1) st = addDays(st, 1);
    return { name: n, start: isoD(a), end: isoD(b) };
  });
}
function wizErrors(w) {
  const seq = wizSeq(w.base); const seen = {}; const out = [];
  seq.forEach((x, i) => { const p = w.picks[i]; if (x.a < w.start || !CLERKSHIPS.includes(p)) return; if (seen[p]) out.push(`${rotShort(p)} is in two blocks. Pick it once.`); seen[p] = true; });
  return out;
}
function wizPanel() {
  const w = ui.wiz; const s = schedule(); if (!w || !s) return "";
  const seq = wizSeq(w.base); const later = wizLater(w); const errs = wizErrors(w);
  const opts = (cur) => [...CLERKSHIPS, "Elective"].map((n) => `<option value="${esc(n)}" ${cur === n ? "selected" : ""}>${esc(n === "Elective" ? "Elective" : rotShort(n))}</option>`).join("") + `<option value="${WIZ_OFF}" ${cur === WIZ_OFF ? "selected" : ""}>Off (leave, study or vacation)</option>`;
  const rows = seq.map((x, i) => {
    const before = x.a < w.start; const p = w.picks[i]; const changed = !before && p !== x.n;
    return `<li class="wiz-row${before ? " wiz-before" : ""}${changed ? " wiz-changed" : ""}">
      <div class="what"><span class="t num">${esc(fmtShort(parseD(x.a)))} – ${esc(fmtShort(parseD(x.b)))}</span><small>Block ${esc(x.blocks)} · Track ${esc(w.base)} has ${esc(x.n === "Elective" ? "an elective" : rotShort(x.n))}</small></div>
      <div class="tail">${before ? `<span class="muted">Before your year started</span>` : `<label class="sr" for="wiz-p-${i}">What you did or will do, ${esc(fmtShort(parseD(x.a)))}</label><select id="wiz-p-${i}" data-act="wiz-pick" data-i="${i}">${opts(p)}</select>`}</div></li>`;
  }).join("");
  const lrows = later.map((l, i) => `<li class="wiz-row"><div class="what"><span class="t">${esc(l.name)}</span><small class="num">${esc(fmtShort(parseD(l.start)))} – ${esc(fmtShort(parseD(l.end)))} · estimated</small></div>
      <div class="tail"><button class="btn quiet small" data-act="wiz-move" data-n="${esc(l.name)}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(l.name)} earlier">Earlier</button><button class="btn quiet small" data-act="wiz-move" data-n="${esc(l.name)}" data-d="1" ${i === later.length - 1 ? "disabled" : ""} aria-label="Move ${esc(l.name)} later">Later</button></div></li>`).join("");
  return `<section class="panel wiz" id="wiz" aria-labelledby="h-wiz">
    <div class="panel-head"><h2 id="h-wiz">Build my year</h2></div>
    <p class="tk-lead">Pick the track you move with and the block your year started, then change only the blocks that were different. Clerkships you haven't placed line up after your track ends, with the next class.</p>
    <div class="wiz-top">
      <div class="field"><label for="wiz-base">Track you move with</label><select id="wiz-base">${Object.keys(s.tracks).map((k) => `<option value="${esc(k)}" ${w.base === k ? "selected" : ""}>Track ${esc(k)}</option>`).join("")}</select></div>
      <div class="field"><label for="wiz-start">Your clerkship year started</label><select id="wiz-start">${seq.map((x) => `<option value="${esc(x.a)}" ${w.start === x.a ? "selected" : ""}>${esc(fmtShort(parseD(x.a)))} (block ${esc(x.blocks)})</option>`).join("")}</select></div>
    </div>
    <ol class="list wiz-list" aria-label="Your blocks on Track ${esc(w.base)}">${rows}</ol>
    ${later.length ? `<div class="wiz-later"><h3>After your track: with the next class</h3><ol class="list wiz-list">${lrows}</ol><p class="hint">Estimated dates until the next class's schedule is out. Put them in the order you'll take them; change the dates anytime after saving.</p></div>` : `<p class="hint mt8">Every core clerkship is placed or done.</p>`}
    ${errs.length ? `<p class="err" role="alert">${esc(errs.join(" "))}</p>` : ""}
    <div class="wiz-act"><button class="btn primary" data-act="wiz-apply" ${errs.length ? "disabled" : ""}>Save my year</button><button class="btn quiet" data-act="wiz-cancel">Cancel</button></div>
  </section>`;
}
function wizApply() {
  const w = ui.wiz; const s = schedule(); if (!w || !s || wizErrors(w).length) return;
  const seq = wizSeq(w.base); const out = [];
  seq.forEach((x, i) => {
    const p = w.picks[i]; if (x.a < w.start || p === WIZ_OFF) return;
    if (p === "Elective") out.push({ id: `w-el-${x.a}`, name: `Elective (block ${x.blocks})`, kind: "elective", start: x.a, end: x.b, src: "you" });
    else out.push({ id: `w-${REQ_FOR[p] || "c"}-${x.a}`, name: p, kind: "clerkship", start: x.a, end: x.b, src: "you" });
  });
  for (const l of wizLater(w)) out.push({ id: `w-${REQ_FOR[l.name] || "c"}-${l.start}`, name: l.name, kind: "clerkship", start: l.start, end: l.end, src: "est" });
  const grades = Object.fromEntries((state.rotations || []).filter((r) => r.gradePosted).map((r) => [r.name + r.start, r.gradePosted]));
  const keep = (state.rotations || []).filter((r) => r.kind !== "clerkship" && !/^Elective \(block/.test(r.name));
  state.rotations = keep.concat(out.map((r) => (grades[r.name + r.start] ? { ...r, gradePosted: grades[r.name + r.start] } : r)));
  const pr = state.profile; pr.track = "custom"; pr.trackBase = w.base; pr.trackSched = s.id;
  const cl = out.filter((r) => r.kind === "clerkship").sort((a, b) => a.start.localeCompare(b.start));
  if (cl.length) { pr.ciStart = [...out].sort((a, b) => a.start.localeCompare(b.start))[0].start; pr.ciEnd = cl[cl.length - 1].end; }
  ui.wiz = null; becomeMine(); persist(); render(); refocus("#h-ct");
  toast(`Your year is saved: ${plural(cl.length, "clerkship")} in order. Today, the Calendar and every deadline now follow it.`);
}
function customTrackPanel(opts) {
  opts = opts || {};
  const pr = state.profile; const all = (state.rotations || []).filter((r) => r.kind === "clerkship").sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const pend = all.filter(guessedPast); const rots = all.filter((r) => !guessedPast(r));
  const miss = missingClerkships(); const s = schedule(); const t = today();
  const nowR = rots.find((r) => parseD(r.start) <= t && parseD(r.end) >= t); const nextR = rots.find((r) => parseD(r.start) > t);
  const doneN = CLERKSHIPS.filter((n) => clerkState(n) === "done");
  const left = CLERKSHIPS.filter((n) => clerkState(n) !== "done" && !(nowR && nowR.name === n));
  const summary = `<p class="ct-sum">${nowR ? `<span><b>Now</b> ${esc(rotShort(nowR.name))} <small class="num">to ${esc(fmtShort(parseD(nowR.end)))}</small></span>` : ""}${nextR ? `<span><b>Next</b> ${esc(rotShort(nextR.name))} <small class="num">${esc(fmtShort(parseD(nextR.start)))}</small></span>` : ""}<span><b>Done</b> ${doneN.length ? esc(doneN.map((n) => TRACK_SHORT[n] || n).join(", ")) : "none yet"}</span><span><b>Still to do</b> ${left.length ? esc(left.map((n) => TRACK_SHORT[n] || n).join(", ")) : "nothing"}</span></p>`;
  const prow = (r) => `<li class="ct-row ct-confirm">
      <div class="what"><span class="t">${esc(r.name)}</span><small>Track ${esc(pr.trackBase || "")} had this here. Not counted until you say so.</small></div>
      <div class="ct-dates"><label class="sr" for="cs-${esc(r.id)}">${esc(r.name)} starts</label><input type="date" id="cs-${esc(r.id)}" data-act="ct-date" data-id="${esc(r.id)}" data-k="start" value="${esc(r.start)}"><span aria-hidden="true">to</span><label class="sr" for="ce-${esc(r.id)}">${esc(r.name)} ends</label><input type="date" id="ce-${esc(r.id)}" data-act="ct-date" data-id="${esc(r.id)}" data-k="end" value="${esc(r.end)}"></div>
      <div class="tail"><button class="btn small" data-act="ct-confirm" data-id="${esc(r.id)}">Yes, these dates</button><button class="btn quiet small" data-act="del-rot" data-id="${esc(r.id)}" aria-label="${esc(r.name)} didn't happen then: remove it">Didn't happen</button></div></li>`;
  const row = (r) => `<li class="ct-row${r.src === "base" || r.src === "est" ? " ct-confirm" : ""}">
      <div class="what"><span class="t">${esc(r.name)}</span><small>${esc(SRC_TAG[r.src] || SRC_TAG.you)}</small></div>
      <div class="ct-dates"><label class="sr" for="cs-${esc(r.id)}">${esc(r.name)} starts</label><input type="date" id="cs-${esc(r.id)}" data-act="ct-date" data-id="${esc(r.id)}" data-k="start" value="${esc(r.start)}"><span aria-hidden="true">to</span><label class="sr" for="ce-${esc(r.id)}">${esc(r.name)} ends</label><input type="date" id="ce-${esc(r.id)}" data-act="ct-date" data-id="${esc(r.id)}" data-k="end" value="${esc(r.end)}"></div>
      <div class="tail">${rotPill(r)}${r.src === "base" || r.src === "est" ? `<button class="btn small" data-act="ct-confirm" data-id="${esc(r.id)}">Confirm</button>` : ""}<button class="btn quiet small" data-act="del-rot" data-id="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">Remove</button></div></li>`;
  const bases = s ? Object.keys(s.tracks) : [];
  return `<section class="panel" aria-labelledby="h-ct" id="custom-track">
    <div class="panel-head"><h2 id="h-ct">${opts.title || "Your clerkship track"}</h2><span class="aside">${esc(trackLabel())}</span></div>
    <p class="tk-lead">${opts.lead || "Your own sequence. Change a date and Today, the Calendar, deadlines and your debriefs follow."}</p>
    ${all.length ? summary : ""}
    ${!ui.wiz && !opts.noBase ? `<p class="hint">Off-cycle or swapped blocks? <button class="link" data-act="wiz-open">Build my year</button> from your track instead of editing dates one by one.</p>` : ""}
    ${pend.length ? `<div class="ct-pend" role="group" aria-labelledby="h-ct-pend"><h3 id="h-ct-pend">Did ${pend.length === 1 ? "this" : "these"} happen?</h3><p class="hint">${pend.length === 1 ? "This block is" : "These blocks are"} already over and came from a standard track's dates, not yours. ${pend.length === 1 ? "It creates" : "They create"} no deadlines and ${pend.length === 1 ? "doesn't" : "don't"} tag your debriefs until you confirm. Fix the dates if they were different.</p><ul class="list ct-list">${pend.map(prow).join("")}</ul></div>` : ""}
    ${rots.length ? `<ul class="list ct-list">${rots.map(row).join("")}</ul>` : `<div class="empty">No clerkships yet. Add the ones you know below.</div>`}
    ${miss.length ? `<div class="ct-miss"><span class="label">Still to schedule</span><div class="ct-chips">${miss.map((n) => { const sl = nextSlot(n); return `<button class="chip" data-act="ct-add" data-n="${esc(n)}" aria-label="Add ${esc(n)} starting ${esc(fmtShort(parseD(sl.start)))}">+ ${esc(TRACK_SHORT[n] || n)} <small class="num">${esc(fmtShort(parseD(sl.start)))}</small></button>`; }).join("")}</div><span class="hint">Adds it at the next open block; adjust the dates once you know them.</span></div>` : rots.length ? `<p class="hint mt8">Every core clerkship is on your plan or done.</p>` : ""}
    ${bases.length && !opts.noBase ? `<div class="ct-base"><label for="ct-base">Assigned track</label><select id="ct-base" data-act="ct-base"><option value="">None</option>${bases.map((k) => `<option value="${esc(k)}" ${pr.trackBase === k ? "selected" : ""}>Track ${esc(k)}</option>`).join("")}</select><span class="hint">Fills the clerkships your audit doesn't list yet from that track's dates, for you to confirm.</span></div>` : ""}
  </section>`;
}

/* ----- your clerkship's own schedule, dropped in as a spreadsheet ----- */
function schedFor(iso) { return (state.scheds || []).flatMap((s) => (s.days && s.days[iso] || []).map((e) => ({ ...e, sched: s.name, sid: s.id }))); }
function schedItems() {
  const out = [];
  for (const s of state.scheds || []) for (const [d, evs] of Object.entries(s.days || {})) for (const e of evs) {
    if (e.kind !== "exam" && e.kind !== "due") continue;
    const date = parseD(d); if (!date) continue;
    out.push({ date, label: `${rotShort(s.name)}: ${e.title}`, rule: [e.time, e.details[0]].filter(Boolean).join(" · "), code: "", w: /practice/i.test(e.title) ? 2 : 3, sched: s.id });
  }
  return out;
}
const EV_TAG = { exam: "Exam", due: "Due", call: "Call", off: "Off" };
/* A schedule cell's extra lines are a place and a person, unlabelled ("Carle Mattis", "James Farris, APP",
   "Dr. Chavez, Center Bldg. 3rd fl."). Sort them so the day reads: when, what, where, with whom. */
const PLACE_RE = /\b(carle|mattis|osf|presence|bldg|building|rm|room|fl|floor|center|centre|clinic|hospital|conf|conference|suite|unit|lab|hall|campus|zoom|teams|virtual|online|tower|wing|pavilion|ed|er|icu|picu|nicu|or|ward|lobby|library|auditorium|street|st|ave|rd|drive|dr\.?\s*\d)\b|\d+(?:st|nd|rd|th)\b/i;
const CRED_RE = /^(?:md|do|app|np|pa|pa-c|phd|lcsw|lcpc|rn|aprn|dnp|psyd|fnp|pmhnp|cnm|crnp)\.?$/i;
const PERSON_RE = /^(?:dr\.?\s|prof\.?\s)|,\s*(?:md|do|app|np|pa|pa-c|phd|lcsw|lcpc|rn|aprn|dnp|psyd|fnp|pmhnp|cnm|crnp)\.?$/i;
function evParts(e) {
  const where = [], who = [], other = [];
  for (const raw of e.details || []) {
    const parts = String(raw).split(/,\s*/).reduce((a, x) => { if (a.length && CRED_RE.test(x.trim())) a[a.length - 1] += ", " + x.trim(); else a.push(x.trim()); return a; }, []).filter(Boolean);
    /* keep "Dr. Chavez" apart from "Center Bldg. 3rd fl.", but a plain "James Farris, APP" stays one person */
    for (const x of parts) {
      if (PERSON_RE.test(x)) who.push(x);
      else if (PLACE_RE.test(x)) where.push(x);
      else if (/^[A-Z][a-z'’-]+(?:\s[A-Z]\.?)?(?:\s[A-Z][a-z'’-]+){1,2}$/.test(x)) who.push(x);
      else other.push(x);
    }
  }
  return { where: where.join(", "), who: who.join(", "), other: other.join(" · ") };
}
const PIN = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12.5s4-3.6 4-6.8a4 4 0 0 0-8 0c0 3.2 4 6.8 4 6.8z"/><circle cx="7" cy="5.7" r="1.4"/></svg>`;
const PERSON = `<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="4.6" r="2.3"/><path d="M2.6 12.3a4.4 4.4 0 0 1 8.8 0"/></svg>`;
function evRow(e) {
  const p = evParts(e);
  const meta = [p.where ? `<span class="ev-m"><span class="sr">Where: </span>${PIN}${esc(p.where)}</span>` : "", p.who ? `<span class="ev-m"><span class="sr">With: </span>${PERSON}${esc(p.who)}</span>` : "", p.other ? `<span class="ev-m ev-o">${esc(p.other)}</span>` : ""].join("");
  return `<li class="ev k-${esc(e.kind || "other")}"><span class="tm num">${esc(e.time || "All day").replace(/\s*[-–]\s*/, "–<wbr>")}</span><span class="ev-t"><b>${esc(e.title)}</b>${meta ? `<span class="ev-meta">${meta}</span>` : ""}</span>${EV_TAG[e.kind] ? `<span class="ev-tag">${EV_TAG[e.kind]}</span>` : ""}</li>`;
}
function hasDays(r) { return (state.scheds || []).some((s) => s.from <= r.end && s.to >= r.start && (s.name === r.name || r.name.startsWith(s.name))); }
async function readDroppedFile(file) {
  ui.drop = { status: "reading", file: file.name };
  if (ui.view !== "schedule") location.hash = "schedule"; else render();
  try {
    const sheets = await SHEETS.read(file);
    for (const sh of sheets) {
      const tr = SHEETS.tracks(sh.grid, sh.merges);
      if (tr) { const y0 = tr.blocks[0].a.slice(0, 4), y1 = tr.blocks[tr.blocks.length - 1].b.slice(2, 4); ui.drop = { status: "tracks", file: file.name, tracks: { id: `${y0}-${y1}`, label: `AY${y0}-${y1} clerkship schedule`, source: file.name, ...tr } }; render(); return; }
    }
    for (const sh of sheets) {
      const ds = SHEETS.days(sh.grid); if (!ds) continue;
      const g = SHEETS.fromFilename(file.name);
      const nm = (state.profile.myName || state.profile.name || "").trim().toLowerCase();
      const hits = nm ? ds.people.filter((p) => p.name.toLowerCase() === nm || p.name.toLowerCase().split(" ")[0] === nm.split(/\s+/)[0]) : [];
      const me = ds.people.length === 1 ? ds.people[0] : hits.length === 1 ? hits[0] : null;
      ui.drop = { status: me ? "review" : "pick", file: file.name, guess: g, from: ds.from, to: ds.to, names: me ? [] : ds.people.map((p) => p.name), people: me ? null : ds.people, person: me ? { name: me.name, days: me.days } : null };
      render(); return;
    }
    throw new Error("No schedule found in that file. Drop your clerkship's weekly schedule or the school's track schedule (.xlsx or .csv).");
  } catch (e) { ui.drop = { status: "error", file: file.name, error: e.message || "Couldn't read that file." }; render(); }
}
function dropPanel() {
  const d = ui.drop || { status: "idle" }; const sc = state.scheds || [];
  const list = sc.length ? `<ul class="rows plain">${sc.map((s) => {
    const n = Object.keys(s.days || {}).length; const ex = Object.entries(s.days || {}).flatMap(([k, evs]) => evs.filter((e) => e.kind === "exam").map((e) => `${e.title} ${fmtShort(parseD(k))}`));
    return `<li><div class="what"><span class="t">${esc(s.name)}${s.block ? `, block ${esc(s.block)}` : ""}${s.sample ? " (sample)" : ""}</span><small class="num">${fmtShort(parseD(s.from))} to ${fmtShort(parseD(s.to))} · ${plural(n, "day")}${ex.length ? ` · ${esc(ex.join(", "))}` : ""}</small></div><div class="tail"><button class="btn quiet small" data-act="sched-del" data-id="${esc(s.id)}">Remove</button></div></li>`;
  }).join("")}</ul>` : "";
  let body = "";
  if (d.status === "reading") body = `<div class="dz busy" aria-live="polite">Reading ${esc(d.file)}…</div>`;
  else if (d.status === "error") body = `<div class="dz-msg" role="alert"><p>${esc(d.error)}</p><button class="btn small" data-act="drop-reset">Try another file</button></div>`;
  else if (d.status === "tracks") body = `<div class="dz-msg"><p><b>${esc(d.tracks.label)}</b> with ${plural(Object.keys(d.tracks.tracks).length, "track")}, ${fmtShort(parseD(d.tracks.blocks[0].a))} to ${fmt(parseD(d.tracks.blocks[d.tracks.blocks.length - 1].b))}. Use it for the track table above?</p><div class="dz-acts"><button class="btn small" data-act="drop-reset">Cancel</button><button class="btn primary small" data-act="tracks-use">Use this schedule</button></div></div>`;
  else if (d.status === "pick") body = `<div class="dz-msg"><p>This schedule lists ${plural(d.names.length, "student")}. Which one is you? <span class="muted">Only your rows are kept; everyone else's are dropped.</span></p><div class="dz-names">${d.names.map((n, i) => `<button class="btn small" data-act="drop-me" data-i="${i}">${esc(n)}</button>`).join("")}</div><button class="link" data-act="drop-reset">Cancel</button></div>`;
  else if (d.status === "review" && d.person) {
    const clerk = d.clerk || d.guess.clerkship || "";
    const evs = Object.entries(d.person.days).sort(); const ex = evs.flatMap(([k, es]) => es.filter((e) => e.kind === "exam" || e.kind === "due").map((e) => `${e.title}, ${WD[parseD(k).getDay()]} ${fmtShort(parseD(k))}`));
    const calls = evs.reduce((n, [, es]) => n + es.filter((e) => e.kind === "call").length, 0);
    const tm = tracksMatching(clerk, d.from, d.to); const pr = state.profile;
    const offer = tm.length === 1 && tm[0] !== pr.track;
    body = `<div class="dz-msg"><p><b>${esc(d.person.name)}</b>: ${plural(evs.length, "day")} from ${fmtShort(parseD(d.from))} to ${fmt(parseD(d.to))}${calls ? `, ${plural(calls, "call")}` : ""}.</p>
      ${ex.length ? `<p class="muted">Exams and due dates: ${esc(ex.join(" · "))}</p>` : ""}
      <div class="dz-row"><div class="field"><label for="drop-clerk">Clerkship</label><select id="drop-clerk" data-act="drop-clerk"><option value="">Choose…</option>${[...CLERKSHIPS, "Elective"].map((n) => `<option ${n === clerk ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
      ${offer ? `<label class="dz-check"><input type="checkbox" id="drop-track" checked> ${esc(clerk)} in these dates matches <b>Track ${esc(tm[0])}</b>. Set it and fill in the rest of my year.</label>` : tm.length === 1 ? `<p class="muted">Matches your Track ${esc(tm[0])}.</p>` : ""}</div>
      <div class="dz-acts"><button class="btn small" data-act="drop-reset">Cancel</button><button class="btn primary small" data-act="drop-add" ${clerk ? "" : "disabled"}>Add to my calendar</button></div></div>`;
  } else body = `<label class="dz" for="sched-x" id="dz"><b>Drop your schedule here</b><span>The Excel file your clerkship sends you, or the school's track schedule. You can also drop it anywhere on the page.</span><span class="hint">Read in this browser. Only your own rows are kept.</span></label><input id="sched-x" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" class="sr">`;
  return `<section class="panel" aria-labelledby="h-drop" id="drop-sched">
    <div class="panel-head"><h2 id="h-drop">Your clerkship schedules</h2><span class="aside">Each day shows on Today and in the Calendar</span></div>
    ${body}${list ? `<div class="mt16">${list}</div>` : ""}
  </section>`;
}
function addDroppedSchedule() {
  const d = ui.drop; if (!d || !d.person) return;
  const clerk = (document.getElementById("drop-clerk") || {}).value || d.clerk || d.guess.clerkship; if (!clerk) return;
  const setTrack = document.getElementById("drop-track"); const tm = tracksMatching(clerk, d.from, d.to);
  const s = { id: "s" + Date.now().toString(36), name: clerk, block: d.guess.block || "", from: d.from, to: d.to, file: d.file, who: d.person.name, days: d.person.days };
  state.scheds = (state.scheds || []).filter((x) => !x.sample && !(x.name === s.name && x.from === s.from)).concat([s]);
  ui.drop = { status: "idle" };
  if (setTrack && setTrack.checked && tm.length === 1) applyTrack(tm[0]);
  if (!(state.rotations || []).some((r) => r.end >= s.from && r.start <= s.to && (r.name === clerk || r.name.startsWith(clerk)))) state.rotations.push({ id: "r" + Date.now().toString(36), name: clerk === "Elective" ? `Elective (block ${s.block || "?"})` : clerk, kind: clerk === "Elective" ? "elective" : "clerkship", start: s.from, end: s.to, src: "schedule" });
  const first = becomeMine(true); persist(); render();
  const ex = Object.entries(s.days).sort().flatMap(([k, es]) => es.filter((e) => e.kind === "exam" && /shelf/i.test(e.title)).map(() => k))[0];
  toast(`${first ? "Your plan is set up. " : ""}${rotShort(clerk)} schedule added: ${plural(Object.keys(s.days).length, "day")}.${ex ? ` Shelf exam ${WD[parseD(ex).getDay()]}, ${fmtShort(parseD(ex))}.` : ""}`);
}

/* ----- rotations and timed rules ----- */
function vRotations() {
  const items = personalItems();
  const cur = currentRotation(); const nx = nextRotation();
  const c = ui.calc; const rule = CALCS[c.rule];
  const base = parseD(c.base);
  let out = "";
  if (base && rule) {
    const due = rule.unit === "bdays" ? addBDays(base, rule.n) : rule.unit === "weeks" ? addDays(base, rule.n * 7) : addDays(base, rule.n);
    out = `<div class="calc-out"><span class="k">${esc(rule.label)}</span><span class="v">${WD[due.getDay()]}, ${fmt(due)}</span><span class="sub">${relDays(due)} · ${Math.abs(rule.n)} ${rule.unit === "bdays" ? "business days" : rule.unit} ${rule.n < 0 ? "before" : "after"} ${esc(rule.base.toLowerCase())}</span></div>
    ${rule.unit === "bdays" ? `<p class="hint mt8">Business days skip weekends only. University holidays may push it later; check the academic calendar.</p>` : ""}`;
  } else out = `<p class="hint">Pick a rule and enter the date it counts from.</p>`;
  const allRules = POLICIES.flatMap((p) => (p.d || []).map((d) => ({ ...d, code: p.c })));
  const finding = cur ? `You're on <b>${esc(cur.name)}</b> until ${fmtShort(cur.e)}${nx ? `, then <b>${esc(rotShort(nx.name))}</b>` : ""}. Each rotation adds its own evaluation, grade and drop deadlines to Today and the Calendar.` : "Add your clerkships and electives. Each one adds its own evaluation, grade and drop deadlines to Today and the Calendar.";
  return `${exampleNotice()}
  <div class="title-row"><div><h1>Rotations</h1><p class="finding">${finding}</p></div><div class="title-actions"><a class="btn small" href="#schedule">Track and schedules</a><a class="btn small" href="#calendar" data-act="cal-mode" data-mode="timeline">See the timeline</a></div></div>
  ${rotationsPanel()}
  <div class="g12">
    <section class="panel s4" aria-labelledby="h-calc">
      <div class="panel-head"><h2 id="h-calc">Work out a deadline</h2></div>
      <div class="stack">
        <div class="field"><label for="calc-rule">Rule</label><select id="calc-rule" data-act="calc-rule">${Object.entries(CALCS).map(([k, v]) => `<option value="${k}" ${k === c.rule ? "selected" : ""}>${esc(v.label)} (${esc(v.code)})</option>`).join("")}</select></div>
        <div class="field"><label for="calc-base">${esc(rule ? rule.base : "Date")}</label><input type="date" id="calc-base" data-act="calc-base" value="${esc(c.base)}"></div>
        <div aria-live="polite">${out}</div>
      </div>
      <h3 class="sub-h">Common ones</h3>
      <ul class="facts">${["e_drop", "absence", "absence_after", "exam_doc", "grade_review", "evals"].filter((k) => CALCS[k]).map((k) => `<li><button class="fact${k === c.rule ? " on" : ""}" data-act="use-calc" data-calc="${k}"><span class="what"><span class="t">${esc(CALCS[k].label)}</span><small>${Math.abs(CALCS[k].n)} ${CALCS[k].unit === "bdays" ? "business days" : CALCS[k].unit} ${CALCS[k].n < 0 ? "before" : "after"} · ${esc(CALCS[k].code)}</small></span></button></li>`).join("")}</ul>
    </section>
    <section class="panel s8" aria-labelledby="h-yours">
      <div class="panel-head"><h2 id="h-yours">Program dates</h2><span class="aside">Worked out from your profile</span></div>
      <div class="table-wrap"><table><thead><tr><th>What</th><th>Source</th><th class="num">Date</th><th class="num">When</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(i.label)}${i.kind === "limit" ? ` <span class="pill ${i.done ? "pos" : "neg"}">${i.done ? "Met" : "Hard limit"}</span>` : ""}<small>${esc(i.rule)}</small></td><td>${codeBtn(i.code)}</td><td class="num">${i.monthOnly ? fmtMonth(i.date) : fmt(i.date)}</td><td class="num muted">${i.done ? "Done" : relDays(i.date)}</td></tr>`).join("")}
      </tbody></table></div>
    </section>
  </div>
  <section class="panel" aria-labelledby="h-rules">
    <div class="panel-head"><h2 id="h-rules">Every timed rule</h2><span class="aside">${allRules.length} windows across the policies</span></div>
    <div class="table-wrap"><table><thead><tr><th>Rule</th><th>Window</th><th>Source</th><th><span class="sr">Calculator</span></th></tr></thead><tbody>
    ${allRules.map((r) => `<tr><td>${esc(r.l)}</td><td class="muted">${esc(r.w)}</td><td>${codeBtn(r.code)}</td><td class="num">${r.calc ? `<button class="btn quiet small" data-act="use-calc" data-calc="${esc(r.calc)}">Work it out</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="panel-foot"><a class="link" href="${CAL_URL}" target="_blank" rel="noopener">Open the AY2026-27 calendar PDF</a><span class="hint">Gateway OSCE dates: to be determined</span></div>
  </section>`;
}

/* ----- policies ----- */
function filteredPolicies() {
  const q = ui.q.trim().toLowerCase();
  const ph = ui.phaseF === "mine" ? state.profile.phase : ui.phaseF;
  return POLICIES.filter((p) => {
    if (ph && ph !== "all") { if (!p.ph.includes(ph)) return false; }
    if (ui.groupF && p.g !== ui.groupF) return false;
    if (ui.overdueOnly && !isOverdue(p)) return false;
    if (q) {
      const hay = [p.c, p.t, p.g, p.s, ...(p.r || []), ...(p.d || []).map((d) => d.l + " " + d.w)].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  });
}
function policyFlags(p) {
  const out = [];
  if ((p.fl || []).includes("dead")) out.push(`<span class="pill neg">Dead link</span>`);
  if ((p.fl || []).includes("login")) out.push(`<span class="pill">Needs Box login</span>`);
  if ((p.fl || []).includes("viewonly")) out.push(`<span class="pill">View only</span>`);
  if (FLAGS.some((f) => f.sev === "conflict" && f.codes.includes(p.c))) out.push(`<span class="pill neg">Conflict</span>`);
  else if (isOverdue(p)) out.push(`<span class="pill warn">Review overdue</span>`);
  return out.join(" ");
}
function vPolicies() {
  const list = filteredPolicies();
  if (ui.sel && !list.find((p) => p.c === ui.sel) && getP(ui.sel)) { /* keep selection visible even if filtered out */ }
  const selected = ui.sel ? getP(ui.sel) : (window.innerWidth > 900 ? list[0] : null);
  const phaseOpts = [["mine", `My phase (${phaseLabel(state.profile.phase)})`], ["all", "All"], ["pre", "Preclerkship"], ["ci", "Clinical Immersion"], ["fy", "Final Year"], ["loa", "Leave or joint degree"], ["app", "Applicants"], ["fac", "Faculty and staff"]];
  const readable = POLICIES.filter((p) => p.c !== "Web" && !(p.fl || []).some((f) => ["dead", "login", "notread"].includes(f))).length;
  return `<div class="title-row"><div><h1>Policies</h1><p class="finding">${readable} policy PDFs read and summarized; ${POLICIES.filter((p) => isOverdue(p) && p.rev).length} are past their own review date. Summaries are plain language; the PDF governs.</p></div>
    <div class="title-actions">${stageSwitch()}<a class="btn small" href="${SOURCE_PAGE}" target="_blank" rel="noopener">Official policy page</a></div></div>
  ${ptMapHtml()}
  <div class="toolbar">
    <label class="sr" for="pq">Search policies</label><input type="search" id="pq" placeholder="Search: wellness day, away, Step 1, honors…" value="${esc(ui.q)}" data-act="pq">
    <label class="sr" for="pf">Phase</label><select id="pf" data-act="pf">${phaseOpts.map(([k, l]) => `<option value="${k}" ${ui.phaseF === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
    <label class="sr" for="pg">Topic</label><select id="pg" data-act="pg"><option value="">All topics</option>${GROUPS.map((g) => `<option ${ui.groupF === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
    <button class="chip" aria-pressed="${ui.overdueOnly}" data-act="overdue">Review overdue</button>
    <span class="hint num">${plural(list.length, "policy")}</span>
  </div>
  <div class="split ${ui.sel ? "has-sel" : ""}">
    <section class="panel plist" aria-label="Policy list">
      ${list.length ? list.map((p) => `<button class="prow" aria-current="${selected && selected.c === p.c ? "true" : "false"}" data-act="sel-policy" data-code="${esc(p.c)}"><span class="pc">${esc(p.c)}</span><span class="pt">${esc(p.t)}<small>${esc(p.g)}</small></span><span class="pr">${policyFlags(p) || (p.eff ? "Effective " + fmtMonth(parseD(p.eff)) : "")}</span></button>`).join("") : `<div class="empty">No policy matches. Clear the search or switch the phase to All.</div>`}
    </section>
    <div class="detail-wrap">${selected ? policyDetail(selected) : `<section class="panel"><div class="empty">Pick a policy to read its summary.</div></section>`}</div>
  </div>`;
}
function policyBody(p, where) {
  const flags = FLAGS.filter((f) => f.codes.includes(p.c));
  const phases = p.ph.map((k) => ({ pre: "Preclerkship", ci: "Clinical Immersion", fy: "Final Year", loa: "Leave or joint degree", app: "Applicants", fac: "Faculty and staff" }[k])).join(", ");
  return `<div class="meta num">${p.eff ? `<span>Effective ${fmt(parseD(p.eff))}</span>` : ""}${p.rev ? `<span>${isOverdue(p) ? `<span class="warn-t">Review was due ${fmt(parseD(p.rev))}</span>` : `Next review ${fmt(parseD(p.rev))}`}</span>` : ""}<span>${esc(phases)}</span></div>
    <p class="lede">${esc(p.s)}</p>
    ${(p.r || []).length ? `<h3>Key rules</h3><ul class="rules">${p.r.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
    ${(p.d || []).length ? `<h3>Deadlines and windows</h3><ul class="dl">${p.d.map((d) => `<li><div>${esc(d.l)}<small>${esc(d.w)}</small></div>${d.calc ? `<button class="btn quiet small" data-act="use-calc" data-calc="${esc(d.calc)}">Work it out</button>` : ""}</li>`).join("")}</ul>` : ""}
    ${flags.length ? `<h3>Problems found in this policy</h3><ul class="dl">${flags.map((f) => `<li><div>${esc(f.title)}<small>${esc(f.who)}</small></div><span class="pill ${SEV[f.sev][1]}">${SEV[f.sev][0]}</span></li>`).join("")}</ul>` : ""}
    <div class="${where === "dr" ? "dr-foot" : "panel-foot"}"><a class="btn small primary" href="${esc(p.u)}" target="_blank" rel="noopener">Open the PDF</a><button class="btn quiet small" data-act="ask-about" data-code="${esc(p.c)}">Ask about this policy</button></div>`;
}
function policyDetail(p) {
  return `<section class="panel detail" aria-labelledby="pd-title">
    <button class="btn small back" data-act="unsel">All policies</button>
    <p class="dr-k">${esc(p.c)} · ${esc(p.g)}</p>
    <h2 id="pd-title">${esc(p.t)}</h2>
    ${policyBody(p, "page")}
  </section>`;
}

/* ----- discrepancies ----- */
function flagCard(f) {
  return `<article class="flag sev-${f.sev}"><div><span class="pill ${SEV[f.sev][1]}">${SEV[f.sev][0]}</span></div><div><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p><div class="who">Ask: ${esc(f.who)}</div><div class="codes">${f.codes.map(codeBtn).join("")}</div></div></article>`;
}
function vFlags() {
  const conflicts = FLAGS.filter((f) => f.sev === "conflict");
  const unclear = FLAGS.filter((f) => f.sev === "ambiguity" || f.sev === "gap");
  const other = FLAGS.filter((f) => f.sev === "access" || f.sev === "typo");
  /* a review date before the effective date is a typo (flagged below), not a 9-year lapse */
  const overdue = POLICIES.filter((p) => p.rev && isOverdue(p) && !(p.eff && parseD(p.rev) < parseD(p.eff))).map((p) => ({ p, m: Math.max(1, monthsBetween(parseD(p.rev), today())) })).sort((a, b) => b.m - a.m);
  const pol = POLICIES.filter((p) => p.c !== "Web");
  return `<section class="triage" aria-labelledby="h-triage">
    <div class="j-top"><div><p class="hero-meta">${FLAGS.length} problems across ${pol.length} policies, read Oct 26, 2026</p>
      <h1 id="h-triage">${plural(conflicts.length, "conflict")} could change what you have to do.</h1>
      <p class="j-sub">Bring each one to the office named under it, and get the answer that applies to you in writing.</p></div>
      <div class="title-actions"><button class="btn" data-act="export-health">${DOWN} Download report (CSV)</button></div></div>
  </section>
  <section class="panel" aria-labelledby="h-conflicts">
    <div class="panel-head"><h2 id="h-conflicts">Conflicts</h2><span class="aside">Two policies say different things</span></div>
    ${conflicts.map(flagCard).join("")}
  </section>
  <div class="g12">
    <section class="panel s7" aria-labelledby="h-over">
      <div class="panel-head"><h2 id="h-over">Longest past their review date</h2><span class="aside num">${overdue.length} policies</span></div>
      <ul class="rows plain">${overdue.slice(0, 8).map(({ p, m }) => `<li><button class="fact" data-act="open-policy" data-code="${esc(p.c)}"><span class="what"><span class="t">${esc(p.t)}</span><small class="num">${esc(p.c)} · review was due ${fmtMonth(parseD(p.rev))}</small></span><span class="due amber num"><i class="dot soon"></i>${plural(m, "month")} late</span></button></li>`).join("")}</ul>
      ${overdue.length > 8 ? `<p class="hint mt16">${overdue.length - 8} more are shown in the map below. A passed review date doesn't void a policy, but a rewrite may be coming (FS-5).</p>` : ""}
    </section>
    <section class="panel s5" aria-labelledby="h-unclear">
      <div class="panel-head"><h2 id="h-unclear">Unclear or missing</h2><span class="aside">Worth asking about</span></div>
      ${unclear.map(flagCard).join("")}
    </section>
  </div>
  ${healthMapHtml()}
  <section class="panel" aria-labelledby="h-other">
    <div class="panel-head"><h2 id="h-other">Access and housekeeping</h2><span class="aside">Won't change what you have to do</span></div>
    ${other.map(flagCard).join("")}
  </section>`;
}

/* ----- ask: matched in this browser ----- */
function hitsHtml(hits) {
  if (!hits.length) return `<div class="empty">No rule matched those words. Try other words (for example "absence" instead of "day off"), browse the Policies page, or ask Student Affairs: studentaffairs@medicine.illinois.edu, 217-300-5700.</div>`;
  return `<ul class="list two hits">${hits.map(({ f, matched }) => `<li><div class="what"><span class="hit-text">${highlight(f.text, matched)}</span><small>${f.kind === "conflict" ? `<span class="pill ${SEV[f.sev] ? SEV[f.sev][1] : ""}">${SEV[f.sev] ? SEV[f.sev][0] : "Problem"}</span> ` : ""}${esc(f.title)}${f.kind === "deadline" ? " · deadline" : ""}</small></div><div class="tail">${(f.codes || [f.code]).slice(0, 2).map(codeBtn).join(" ")}${f.calc ? ` <button class="btn quiet small" data-act="use-calc" data-calc="${esc(f.calc)}">Work it out</button>` : ""}</div></li>`).join("")}</ul>`;
}
function vAsk() {
  const a = ui.ask;
  const examples = [
    "Can I take a wellness day during the last week of surgery?",
    "I was sick on my shelf exam day. What do I need to send and by when?",
    "Can I start an away rotation before all my clerkships are graded?",
    "Do I need approval to join a health startup's advisory board?",
    "How many weeks of electives do I need to graduate?",
    "When will my clerkship grade be posted, and what if it's late?"
  ];
  const n = POLICIES.filter((p) => !p.ph.every((k) => k === "fac" || k === "app")).length;
  const turns = a.turns.map((t, i) => `<div class="turn"><p class="q" id="ask-turn-${i}" tabindex="-1">${esc(t.q)}</p>${aiHtml(t, i)}<div class="answer">${hitsHtml(t.hits)}</div></div>`).reverse().join("");
  return `<div class="title-row"><div><h1>Ask the policies</h1><p class="finding">Ask in plain words. ${SAMPLE ? "Claude answers from the text of " + n + " student policies and the known conflicts, citing each code, and the rules it matched sit underneath." : "The app pulls the rules that answer it from " + n + " student policies and the known conflicts, each with its policy code."} ${KBD} asks from any page.</p></div></div>
  <section class="panel" aria-labelledby="h-ask">
    <div class="panel-head"><h2 id="h-ask">Your question</h2>${a.turns.length ? `<button type="button" class="link" data-act="ask-clear">Clear answers</button>` : ""}</div>
    <form class="ask-box" data-form="ask">
      <label class="sr" for="ask-q">Question</label>
      <textarea id="ask-q" rows="3" maxlength="1000" style="min-height:84px" placeholder="Ask about absences, grades, Step deadlines, electives, leave…">${esc(a.draft)}</textarea>
      <div class="ask-row"><span class="hint">This is an unofficial reading. Open the policy before acting on anything high-stakes; the linked PDF governs.</span><button class="btn primary" type="submit">${SAMPLE ? "Ask" : "Find the rules"}</button></div>
    </form>
    ${turns ? `<div class="mt16">${turns}</div>` : ""}
  </section>
  ${recentQs().length ? `<section class="panel" aria-labelledby="h-recent">
    <div class="panel-head"><h2 id="h-recent">Your recent questions</h2><button type="button" class="link" data-act="recent-clear">Clear</button></div>
    <ul class="facts cols">${recentQs().map((e) => `<li><button class="fact" data-act="ask-example"><span class="what"><span class="t">${esc(e)}</span></span></button></li>`).join("")}</ul>
  </section>` : ""}
  <section class="panel" aria-labelledby="h-try">
    <div class="panel-head"><h2 id="h-try">Questions students ask</h2></div>
    <ul class="facts cols">${examples.map((e) => `<li><button class="fact" data-act="ask-example"><span class="what"><span class="t">${esc(e)}</span></span></button></li>`).join("")}</ul>
  </section>`;
}
const RECENT_KEY = "pn-recent-questions";
function recentQs() { return (state.askRecent || []).filter((x) => typeof x === "string").slice(0, 6); }
function ask(q) {
  q = (q || "").trim(); if (!q) { toast("Type a question first, like “Can I miss a shelf exam?”"); refocus("#ask-q"); return; }
  state.askRecent = [q.slice(0, 300), ...recentQs().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6); persist();
  const turn = { q, hits: searchRules(q), ai: SAMPLE ? { status: "thinking", text: "" } : null };
  ui.ask.turns.push(turn); ui.ask.draft = "";
  render();
  if (ui.view === "ask") refocus(`#ask-turn-${ui.ask.turns.length - 1}`);
  if (turn.ai) askClaude(turn);
}
let SAMPLE = null;
(async () => { try { const c = window.claude; if (c && typeof c.use === "function") SAMPLE = await c.use("sample"); } catch { SAMPLE = null; } if (SAMPLE && booted && ui.view === "ask") render(); })();
const CODE_RE = /\b(?:APS|FS|SWH|SL|AM|TFA|GS)-(?:x?\d+(?:\.\d+)?)\b/g;
async function policyText(c) {
  try { const r = await fetch(`policies/${encodeURIComponent(c)}.txt`); if (!r.ok) throw new Error(String(r.status)); return (await r.text()).replace(/[ \t]+/g, " ").slice(0, 14000); }
  catch { const p = getP(c); return p ? [p.s, ...(p.r || []), ...(p.d || []).map((d) => `${d.l}: ${d.w}`)].join("\n") : ""; }
}
async function askClaude(turn) {
  const codes = [...new Set(turn.hits.flatMap(({ f }) => f.codes || [f.code]).filter((c) => c && getP(c)))].slice(0, 4);
  const full = await Promise.all(codes.map(async (c) => `=== ${c}: ${getP(c).t} ===\n${await policyText(c)}`));
  const flags = FLAGS.filter((x) => x.codes.some((c) => codes.includes(c))).map((x) => `- ${x.title} (${x.codes.join(", ")}): ${x.body} Who to ask: ${x.who}`);
  const catalog = POLICIES.filter((p) => !p.ph.every((k) => k === "fac" || k === "app")).map((p) => `${p.c} | ${p.t} | ${p.s}`).join("\n");
  const pr = state.profile; const cur = currentRotation();
  const ctx = [`Today is ${fmt(today())}.`, `Phase: ${phaseLabel(pr.phase)}.`, cur ? `Current rotation per the student's own schedule: ${cur.name}, until ${fmt(cur.e)}.` : "", `Rulebook: ${pr.reqSet === "both" ? "not confirmed, APS-6 and APS-6.1 both posted" : "APS-" + pr.reqSet}.`].filter(Boolean).join(" ");
  const prompt = `You answer a Carle Illinois College of Medicine (CI MED) MD student's question about the college's official policies, using only the policy text below.
Rules:
- Answer in one to three short sentences of plain text. No headings, lists or markdown.
- Put the policy code you relied on in parentheses, like (APS-7).
- If the text does not settle the question, say plainly that you can't confirm it from the posted policies and name who to ask (the office the policy names, or Student Affairs).
- If a known conflict below applies, say so in one sentence.
- Keep the student's own schedule distinct from official policy: when you use their dates, say "your schedule shows".
- Never invent dates, numbers, offices or policy codes.

Student context (their own entries, not policy): ${ctx}

Known conflicts and gaps:
${flags.join("\n") || "None for these policies."}

Policy catalog (code | title | summary):
${catalog}

Full text of the policies that best match the question:
${full.join("\n\n") || "No close match; rely on the catalog summaries."}

Question: ${turn.q}`;
  const idx = ui.ask.turns.indexOf(turn);
  try {
    const out = await SAMPLE(prompt, { cache: false, onText: ({ text }) => { turn.ai.text = text; const el = document.getElementById(`ai-${idx}`); if (el) el.textContent = text; } });
    const text = String((out && out.text) || "").trim();
    turn.ai = text ? { status: "done", text } : { status: "error", text: "Claude didn't send an answer back. The matching rules are below." };
  } catch (e) {
    const c = e && e.code;
    if (c === "not_granted") { SAMPLE = null; turn.ai = null; }
    else turn.ai = { status: "error", text: ({ rate_limited: "Too many questions at once. Wait a minute and ask again; the matching rules are below.",
      timeout: "Claude took too long to answer. Try again in a moment; the matching rules are below.",
      session_expired: "Your sign-in expired. Sign in again to ask Claude; the matching rules are below.",
      unavailable: "Couldn't reach Claude just now. The matching rules are below." })[c] || "Claude couldn't answer this time. The matching rules are below." };
  }
  if (ui.view === "ask") render();
}
function aiHtml(t, i) {
  if (!t.ai) return "";
  const body = t.ai.status === "done" ? esc(t.ai.text).replace(CODE_RE, (c) => codeBtn(c)) : esc(t.ai.text || "Reading the policies…");
  const k = t.ai.status === "error" ? "Claude couldn't answer this time" : "Answer from the policy text";
  return `<div class="ai-ans${t.ai.status === "thinking" ? " busy" : ""}"><span class="ai-k">${k}</span><p id="ai-${i}" aria-live="polite">${body}</p></div><h3 class="label mt16">${t.ai.status === "error" ? "Rules that match your words" : "Rules it drew on, matched by wording"}</h3>`;
}

/* ----- profile ----- */
function vProfile() {
  const pr = state.profile; const D = profileDates(pr);
  const f = (id, label, input, hint) => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<span class="hint" id="${id}-h">${hint}</span>` : ""}</div>`;
  const sel = (id, key, opts) => `<select id="${id}" data-prof="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(pr[key]) === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return `${exampleNotice()}
  <div class="title-row"><div><h1>Profile and settings</h1><p class="finding">These dates drive every deadline in the app. ${STORE.mode() === "account" ? `They're saved to a private space in your ${window.PERL_ACCOUNT ? "Charted account" : "Claude account"} that only you can read.` : "They're saved in this browser only, on this device."}</p></div><div class="title-actions"><span class="saved" aria-live="polite">${esc(ui.savedNote)}</span>${themeSeg()}<label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-act="single-keys" ${singleKeysOn() ? "checked" : ""}> Single-key shortcuts (N, /, T)</label>${state.example ? "" : `<button class="btn small" data-act="example-enter">Explore example data</button>`}</div></div>
  <div class="grid">
    <section class="panel span-2" aria-labelledby="h-prof">
      <div class="panel-head"><h2 id="h-prof">Where you are</h2></div>
      <div class="form-grid">
        ${f("p-name", "First name (optional)", `<input type="text" id="p-name" data-prof="name" value="${esc(pr.name || "")}" autocomplete="given-name" aria-describedby="p-name-h">`, "Only used to greet you on Today.")}
        ${f("p-myname", "Your name on clerkship schedules", `<input type="text" id="p-myname" data-prof="myName" value="${esc(pr.myName || "")}" autocomplete="name" aria-describedby="p-myname-h">`, "As it appears in column A of a weekly schedule. Picks out your rows when you import one.")}
        ${schedule() ? f("p-track", "Clerkship track", `<select id="p-track" data-act="track-select"><option value="">Not set</option>${pr.track === "custom" ? `<option value="custom" selected>${esc(trackLabel(pr))}</option>` : ""}${Object.keys(schedule().tracks).map((k) => `<option value="${esc(k)}" ${pr.track === k ? "selected" : ""}>Track ${esc(k)}</option>`).join("")}</select>`, pr.track === "custom" ? `Your own dates. <a class="link" href="#schedule">Edit them in Schedule</a>, or pick a standard track here.` : `${esc(schedule().label)}. Fills in your clerkships and their deadlines.`) : ""}
        ${f("p-matric", "Matriculation date", `<input type="date" id="p-matric" data-prof="matric" value="${esc(pr.matric)}" aria-describedby="p-matric-h">`, "Your first day of the first class. Starts both APS-33 clocks.")}
        ${f("p-phase", "Current phase", sel("p-phase", "phase", [["pre", "Preclerkship"], ["ci", "Clinical Immersion"], ["fy", "Final Year"], ["loa", "On leave or in a joint degree"]]))}
        ${f("p-cistart", "Clinical Immersion start", `<input type="date" id="p-cistart" data-prof="ciStart" value="${esc(pr.ciStart)}">`)}
        ${f("p-ciend", "Clinical Immersion end (last clerkship)", `<input type="date" id="p-ciend" data-prof="ciEnd" value="${esc(pr.ciEnd)}" aria-describedby="p-ciend-h">`, "Sets the 30-day make-up window and away eligibility.")}
        ${f("p-grad", "Graduation target", `<input type="month" id="p-grad" data-prof="grad" value="${esc(pr.grad)}">`)}
        ${f("p-set", "Which rulebook applies to you", sel("p-set", "reqSet", [["both", "Not confirmed: show both"], ["6", "APS-6 (2026)"], ["6.1", "APS-6.1 (2023 and later)"]]), "Ask the Registrar; your degree audit should say.")}
        ${f("p-s1", "Step 1", sel("p-s1", "step1", [["not", "Not taken"], ["scheduled", "Scheduled"], ["passed", "Passed"]]))}
        ${f("p-s1d", pr.step1 === "scheduled" ? "Step 1 test date" : "Step 1 school deadline for your cohort", `<input type="date" id="p-s1d" data-prof="step1Date" value="${esc(pr.step1Date)}" aria-describedby="p-s1d-h">`, "AY2026-27 calendar: March 3, 2027.")}
        ${f("p-s2", "Step 2 CK", sel("p-s2", "step2", [["not", "Not taken"], ["scheduled", "Scheduled"], ["passed", "Passed"]]))}
        ${f("p-s2d", "Step 2 CK test date", `<input type="date" id="p-s2d" data-prof="step2Date" value="${esc(pr.step2Date)}">`)}
        ${f("p-leave", "Months on leave for another degree", `<input type="number" id="p-leave" min="0" max="60" data-prof="leaveMonths" value="${esc(pr.leaveMonths || 0)}" aria-describedby="p-leave-h">`, "Excluded from the 6-year limit (APS-33). Other leaves are not.")}
      </div>
    </section>
    ${accountPanel()}
    <section class="panel" aria-labelledby="h-comp2">
      <div class="panel-head"><h2 id="h-comp2">What this works out</h2></div>
      <ul class="list two">${personalItems().map((i) => `<li><div class="what">${esc(i.label)}</div><div class="tail num">${i.done ? `<span class="pill pos">Done</span>` : i.monthOnly ? fmtMonth(i.date) : fmtShort(i.date)}</div></li>`).join("")}</ul>
      <div class="panel-foot">${ui.clearConfirm ? `<span class="small">Erase your profile, schedule, checklist, electives, habits and career notes? Your Debrief journal is kept.</span><span style="display:flex;gap:8px"><button class="btn small" data-act="clear-cancel">Keep</button><button class="btn small" style="color:var(--negative);border-color:var(--negative)" data-act="clear-yes">Erase</button></span>` : `<button class="btn small" style="color:var(--negative)" data-act="clear">Erase my saved data</button>`}</div>
    </section>
  </div>`;
}

/* ----- first run ----- */
/* ----- setup: drop the degree audit and most of the plan fills itself in -----
   With an audit: two screens (you + your audit, then check your plan). Without one: the four manual steps. */
const SETUP_STEPS = ["You", "Program", "Schedule", "Boards and rulebook"];
const SETUP_AUDIT_STEPS = ["You", "Your plan"];
function setupSteps() { return ui.setupAudit ? SETUP_AUDIT_STEPS : SETUP_STEPS; }
async function fileText(file) {
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") return pdfText(await file.arrayBuffer());
  if (/\.html?$/i.test(file.name)) { const doc = new DOMParser().parseFromString(await file.text(), "text/html"); return (doc.body && doc.body.innerText || doc.body.textContent || "").replace(/\s+\n/g, "\n"); }
  return file.text();
}
async function setupAuditText(text, fileName) {
  const r = parseAudit(String(text || ""));
  if (!r.found && !Object.keys(r.statuses || {}).length) { ui.setupErr = "That doesn't look like a degree audit: no CI MED course numbers (like CLE 645) in it. In CI CARE, open Degree Audit, choose Expand All, then print and save as PDF."; ui.setupBusy = false; render(); return; }
  applyAuditResult(r);
  ui.setupAudit = { ...r, fileName: fileName || "Pasted text" }; ui.setupErr = ""; ui.setupBusy = false; ui.setupPaste = false;
  persist(); render(); refocus("#su-read");
}
async function setupAuditFile(file) {
  ui.setupBusy = true; ui.setupErr = ""; render();
  try { const text = await fileText(file); if (!String(text).trim()) throw new Error("No text in that file. If it's a scan or a photo, paste the text instead."); await setupAuditText(text, file.name); }
  catch (e) { ui.setupBusy = false; ui.setupErr = (e && e.message) || "Couldn't read that file."; render(); }
}
function auditFacts(r) {
  const pr = state.profile; const out = [];
  if (pr.matric) out.push(["Started", fmt(parseD(pr.matric))]);
  const sx = (id) => state.req[id] || "todo";
  if (sx("y1") === "done" && sx("y2") === "done") out.push(["Years 1 and 2", "Complete"]);
  if (pr.step1 === "passed") out.push(["Step 1", pr.step1Date ? `Passed ${fmtShort(parseD(pr.step1Date))}` : "Passed"]);
  const clDone = CLERKSHIPS.filter((n) => clerkState(n) === "done").length;
  out.push(["Core clerkships", `${clDone} of 7 done`]);
  const el = (state.electives || []).filter((e) => e.status === "done").reduce((t, e) => t + (Number(e.credits) || 0), 0);
  if (el) out.push(["Electives", `${el} credits done`]);
  out.push(["Step 2 CK", pr.step2 === "passed" ? "Passed" : "Not yet"]);
  return out;
}
function vSetup() {
  const pr = state.profile; const steps = setupSteps(); const N = steps.length; const st = Math.min(ui.setupStep || 1, N);
  const f = (id, label, input, hint) => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<span class="hint" id="${id}-h">${hint}</span>` : ""}</div>`;
  const sel = (id, key, opts) => `<select id="${id}" data-prof="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(pr[key]) === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const a = ui.setupAudit;
  let lead = "", body = "", wrap = true;
  if (st === 1) {
    lead = a ? "Your audit is in. Check your name, then continue to your plan." : "Drop your degree audit and Charted fills in your courses, Step 1, clerkships and their dates. Or set it up by hand.";
    const audit = a ? `<div class="su-read" id="su-read" tabindex="-1" role="status"><span class="su-ok" aria-hidden="true">${TICK_SVG}</span><div><b>Read ${esc(a.fileName)}</b><small>${esc(plural(a.found, "course"))}${(a.rotations || []).length ? ` · ${esc(plural(a.rotations.length, "clerkship"))} with dates` : ""}. Nothing left this browser.</small></div><button class="btn quiet small" data-act="su-undo">Use a different file</button></div>`
      : `<div class="su-drop${ui.setupBusy ? " busy" : ""}" id="su-drop">
          <p class="su-drop-t">${ui.setupBusy ? "Reading your audit…" : "Drop your degree audit here"}</p>
          <p class="hint">CI CARE → Degree Audit → Expand All → Print → Save as PDF. Read in this browser; nothing is uploaded.</p>
          <div class="su-acts"><label class="btn primary small" for="su-file">Choose the PDF</label><input id="su-file" type="file" accept=".pdf,.txt,.html,.htm" class="sr"><button class="btn small quiet" type="button" data-act="su-paste">Paste the text instead</button></div>
          ${ui.setupPaste ? `<div class="field mt8"><label for="su-text">Audit text</label><textarea id="su-text" rows="6" placeholder="Select all on the Degree Audit page (Expand All first), copy, and paste here."></textarea><div class="su-acts"><button class="btn primary small" type="button" data-act="su-read">Read it</button></div></div>` : ""}
          ${ui.setupErr ? `<p class="small" style="color:var(--negative)" role="alert">${esc(ui.setupErr)}</p>` : ""}
        </div>`;
    body = `<section class="panel">${audit}<div class="form-grid mt16">
      ${f("p-name", "First name", `<input type="text" id="p-name" data-prof="name" value="${esc(pr.name || "")}" autocomplete="given-name" aria-describedby="p-name-h">`, "Used to greet you on Today.")}
      ${f("p-myname", "Your name on clerkship schedules", `<input type="text" id="p-myname" data-prof="myName" value="${esc(pr.myName || "")}" autocomplete="name" aria-describedby="p-myname-h">`, "As it appears on a weekly schedule, so imports keep only your rows.")}</div></section>`;
    wrap = false;
  } else if (a) {
    lead = "Here's what your audit says. Fix anything that's off; every date here drives your deadlines.";
    const bt = bestTrack(a.rotations || []);
    body = `<section class="panel"><div class="panel-head"><h2>From your audit</h2><span class="aside">${esc(a.fileName)}</span></div>
        <dl class="su-facts">${auditFacts(a).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${(a.notes || []).length ? `<ul class="rules mt8">${a.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      </section>
      ${pr.track === "custom" ? customTrackPanel({ title: "Your clerkship track", lead: bt.id ? `Your dates don't follow one standard track, so this is a custom track. Track ${esc(bt.id)} is the closest; the clerkships your audit doesn't list yet come from it for you to confirm. Pick your assigned track below if it's different.` : "Your dates don't follow a standard track, so this is a custom track. Add the clerkships still to come." }) : trackPanel()}
      <section class="panel">${f("p-grad", "Graduation target", `<input type="month" id="p-grad" data-prof="grad" value="${esc(pr.grad)}" aria-describedby="p-grad-h">`, "Not on the audit. Leave blank for four years after you started.")}</section>`;
    wrap = false;
  } else {
    lead = ["", "Your matriculation date starts two hard clocks under APS-33: three years to pass Step 1 and six years to finish the MD.",
      "Pick your AY2026-27 track and your clerkships, electives and the deadlines they set off fill in. Off-cycle? Make it a custom track.",
      "APS-6 and APS-6.1 are both posted and disagree on electives, Step 1 during clerkships and the Gateway OSCE. Until the Registrar confirms yours, keep both."][st - 1];
    if (st === 2) body = `<div class="form-grid">
      ${f("p-matric", "Matriculation date", `<input type="date" id="p-matric" data-prof="matric" value="${esc(pr.matric)}" aria-describedby="p-matric-h" required>`, "Your first day of the first class. Required.")}
      ${f("p-phase", "Current phase", sel("p-phase", "phase", [["pre", "Preclerkship"], ["ci", "Clinical Immersion"], ["fy", "Final Year"], ["loa", "On leave or in a joint degree"]]))}
      ${f("p-grad", "Graduation target", `<input type="month" id="p-grad" data-prof="grad" value="${esc(pr.grad)}" aria-describedby="p-grad-h">`, "Leave blank to use four years from matriculation.")}
      ${f("p-leave", "Months on leave for another degree", `<input type="number" id="p-leave" min="0" max="60" data-prof="leaveMonths" value="${esc(pr.leaveMonths || 0)}" aria-describedby="p-leave-h">`, "Excluded from the six-year limit (APS-33). Other leaves are not.")}</div>`;
    if (st === 3) { body = pr.track === "custom" ? customTrackPanel() : trackPanel() + `<p class="hint mt8">Not on one of these? <button class="link" data-act="make-custom">Make a custom track</button></p>`; wrap = false; }
    if (st === 4) body = `<div class="form-grid">
      ${f("p-set", "Which rulebook applies to you", sel("p-set", "reqSet", [["both", "Not confirmed: show both"], ["6", "APS-6 (2026)"], ["6.1", "APS-6.1 (2023 and later)"]]), "Your degree audit should say.")}
      ${f("p-s1", "Step 1", sel("p-s1", "step1", [["not", "Not taken"], ["scheduled", "Scheduled"], ["passed", "Passed"]]))}
      ${f("p-s1d", "Step 1 date or cohort deadline", `<input type="date" id="p-s1d" data-prof="step1Date" value="${esc(pr.step1Date)}" aria-describedby="p-s1d-h">`, "AY2026-27 calendar deadline: March 3, 2027.")}
      ${f("p-s2", "Step 2 CK", sel("p-s2", "step2", [["not", "Not taken"], ["scheduled", "Scheduled"], ["passed", "Passed"]]))}
      ${f("p-s2d", "Step 2 CK test date", `<input type="date" id="p-s2d" data-prof="step2Date" value="${esc(pr.step2Date)}">`)}</div>`;
  }
  const later = !a && st >= 3 ? `<button class="btn quiet small" data-act="setup-done">Finish later</button>` : `<span></span>`;
  return `<div class="setup">
    <ol class="steps" aria-label="Setup steps">${steps.map((x, i) => `<li class="${i + 1 === st ? "on" : i + 1 < st ? "done" : ""}" ${i + 1 === st ? 'aria-current="step"' : ""}><span class="num">${i + 1}</span>${esc(x)}</li>`).join("")}</ol>
    <div class="title-row"><div><h1>${st === 1 ? "Set up your plan" : esc(steps[st - 1])}</h1><p class="finding">${lead}</p></div></div>
    ${wrap ? `<section class="panel">${body}</section>` : body}
    <div class="setup-foot">${later}<span class="setup-acts">${st > 1 ? `<button class="btn small" data-act="setup-back">Back</button>` : ""}<button class="btn primary" data-act="setup-next">${st === N ? "Finish" : !a && st === 1 ? "Set up by hand" : "Continue"}</button></span></div>
    <p class="hint setup-note">You can change any of this later in Profile and Schedule. Want to look around first? <button class="link" data-act="example-enter">Explore example data</button></p>
  </div>`;
}
function setupNext() {
  const st = ui.setupStep || 1; const N = setupSteps().length;
  for (const el of document.querySelectorAll("#view [data-prof]")) { const k = el.dataset.prof; let v = el.value; if (k === "leaveMonths") v = Math.max(0, Math.min(60, Number(v) || 0)); else v = String(v).trim(); if ((k === "matric" || k === "grad") && !v) continue; state.profile[k] = v; }
  if (!ui.setupAudit && st === 2 && !parseD(state.profile.matric)) { toast("Add your matriculation date. It starts the Step 1 and six-year clocks."); $("#p-matric")?.focus(); return; }
  if (st < N) { ui.setupStep = st + 1; persist(); render(); window.scrollTo(0, 0); refocus("#view h1"); return; }
  setupDone();
}
function setupDone() { state.profile.setupDone = true; persist(); ui.setupStep = 1; ui.setupAudit = null; go("today"); toast(state.profile.track ? `Plan set up on your ${trackLabel().replace(/^Track/, "track")}.` : "Plan set up. Add your track from Schedule when you know it."); }

function vSchedule() {
  return `<div class="title-row"><div><h1>Schedule</h1><p class="finding">One schedule feeds Today, the Calendar, Rotations and your Debrief journal. Pick your track, then drop in each clerkship's weekly schedule as it comes.</p></div><div class="title-actions"><button class="btn small primary" data-act="open-audit">Import degree audit</button><a class="btn small" href="#rotations">Edit rotations</a></div></div>
  ${ui.wiz ? wizPanel() : ""}
  ${state.profile.track === "custom" ? customTrackPanel() + `<details class="panel tk-std"><summary>Standard AY2026-27 tracks</summary>${trackPanel()}</details>` : trackPanel() + `<p class="hint">Off-cycle, swapped a block, or finishing with the next class? <button class="link" data-act="wiz-open">Build my year</button> from your track in a few clicks, or <button class="link" data-act="make-custom">make a custom track</button> and set every date yourself.</p>`}
  ${window.PERL_FMCC ? window.PERL_FMCC.panel() : ""}
  ${dropPanel()}`;
}
function vNone() { return ""; } /* Debrief views are drawn by the Debrief space into #dbf-views */
function vBoot() { return `<div class="boot" aria-live="polite"><p class="muted">Opening your plan…</p></div>`; }

/* ----- install as an app (standalone builds): the browser's own prompt where there is one, short steps where not ----- */
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (booted && ui.view === "profile") render(); });
window.addEventListener("appinstalled", () => { installPrompt = null; ui.installed = true; if (booted) { toast("Charted is installed. Open it from your Dock, taskbar or apps."); if (ui.view === "profile") render(); } });
function runningInstalled() { return !!((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true || ui.installed); }
function installSteps() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "In Edge, open the … menu, then Apps › Install this site as an app.";
  if (/Firefox\//.test(ua)) return "Firefox can't install sites as apps. Open Charted in Chrome, Edge or Safari to install it.";
  if (/iPhone|iPad/.test(ua)) return "In Safari, tap Share, then Add to Home Screen.";
  if (/Chrome\//.test(ua)) return "In Chrome, click the install icon in the address bar, or ⋮ › Cast, save and share › Install page as app.";
  if (/Safari\//.test(ua)) return "In Safari, choose File › Add to Dock.";
  return "Use your browser's menu to install this site as an app.";
}
function installRow() {
  if (!window.PERL_ACCOUNT || runningInstalled()) return "";
  return `<li class="install-row"><div class="what"><span class="t">Install Charted on this computer</span><small>Its own window in your Dock or taskbar, and it opens offline.</small>${installPrompt ? "" : `<small class="install-how">${esc(installSteps())}</small>`}</div><div class="tail">${installPrompt ? `<button class="btn small primary" data-act="install">Install</button>` : ""}</div></li>`;
}
async function runInstall() {
  const p = installPrompt; if (!p) { toast(installSteps()); return; }
  installPrompt = null;
  try { await p.prompt(); const r = await p.userChoice; if (r && r.outcome === "accepted") ui.installed = true; else toast("Not installed. You can install Charted later from here."); } catch { toast(installSteps()); }
  render(); refocus("#h-acct");
}

/* ----- account (standalone app only): sign out, Claude consent, delete everything ----- */
function accountPanel() {
  const A = window.PERL_ACCOUNT; if (!A) return "";
  const ai = A.aiAllowed();
  return `<section class="panel span-2" aria-labelledby="h-acct">
    <div class="panel-head"><h2 id="h-acct">Your account</h2><span class="aside">${esc(A.email())}</span></div>
    <ul class="list two">
      ${installRow()}
      <li><div class="what"><span class="t">Claude</span><small>${ai ? "Allowed. Cleanup, interview drafts and policy answers send the text involved to Claude, made by Anthropic." : "Off. You review debriefs yourself, and Ask uses keyword search."}</small></div><div class="tail"><button class="btn small" data-act="ai-toggle">${ai ? "Turn off" : "Allow"}</button></div></li>
      <li><div class="what"><span class="t">Password</span><small>Sign in with your email and this password on any device; no email link needed. At least 8 characters.</small></div><div class="tail acct-pw"><label class="sr" for="acct-pw">New password</label><input type="password" id="acct-pw" autocomplete="new-password" minlength="8" placeholder="New password"><button class="btn small" data-act="set-pw">Save password</button></div></li>
      <li><div class="what"><span class="t">Sign out</span><small>Your plan and journal stay in your account.</small></div><div class="tail"><button class="btn small" data-act="sign-out">Sign out</button></div></li>
      <li><div class="what"><span class="t">Delete account</span><small>Deletes your sign-in, plan, checklist and every journal entry. This can't be undone.</small></div><div class="tail">${ui.delAcct ? `<button class="btn small" data-act="del-acct-cancel">Keep</button><button class="btn small" style="color:var(--negative);border-color:var(--negative)" data-act="del-acct-yes">Delete everything</button>` : `<button class="btn small" style="color:var(--negative)" data-act="del-acct">Delete account</button>`}</div></li>
    </ul>
  </section>`;
}

/* ================= feature modules =================
   habits.js and career.js load after this file and register here: their own views, click actions, form events
   and an optional card on Today. They keep their data in state.habits / state.career (the School-side document). */
window.PERL_MODULES = window.PERL_MODULES || [];
function modView(v) { for (const m of window.PERL_MODULES) if (m.views && m.views[v]) return m.views[v]; return null; }
function modAct(act, el, ev) { for (const m of window.PERL_MODULES) if (m.acts && m.acts[act]) { m.acts[act](el, ev); return true; } return false; }
function modEvent(type, ev) { for (const m of window.PERL_MODULES) if (m.on && m.on[type] && m.on[type](ev)) return true; return false; }
/* the bridge feature modules use: app.js runs inside an IIFE, so its state and helpers aren't globals */
window.PERL_APP = Object.freeze({
  get state() { return state; }, get ui() { return ui; }, get SAMPLE() { return SAMPLE; }, get booted() { return booted; },
  persist: () => persist(), render: () => render(), toast: (m) => toast(m), go: (v) => go(v), refocus: (s) => refocus(s),
  esc, today, isoD, parseD, fmt, fmtShort, addDays, diffDays, plural,
  schedFor: (iso) => schedFor(iso), currentRotation: () => currentRotation(), nextRotation: () => nextRotation(), rotsParsed: () => rotsParsed(),
  pdfText: (buf, mark) => pdfText(buf, mark), saveFile: (n, t, m) => saveFile(n, t, m),
  install: Object.freeze({ available: () => !!installPrompt, installed: () => runningInstalled(), run: () => runInstall(), steps: () => installSteps() })
});
function modToday(slot) { return window.PERL_MODULES.filter((m) => (m.todaySlot || "main") === slot).map((m) => { try { return m.today ? m.today() || "" : ""; } catch { return ""; } }).join(""); }

/* ================= router and render ================= */
const VIEWS = { offline: vOffline, today: vToday, calendar: vCalendar, rotations: vRotations, progress: vRequirements, policies: vPolicies, health: vFlags, ask: vAsk, profile: vProfile, schedule: vSchedule, setup: vSetup, journal: vNone, history: vNone, vault: vNone, mspe: vNone, dsettings: vNone, boot: vBoot };
const ALIAS = { path: "today", deadlines: "rotations", requirements: "progress", discrepancies: "health" };
Object.assign(ui, { view: "today", calMode: "month", calMonth: "", drawer: null, trackFind: "", drop: { status: "idle" } });
function route() {
  if (!booted) { ui.view = "boot"; render(); return; }
  let h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (!state.example && ui.unreachable && !state.profile.setupDone) { ui.view = "offline"; ui.sheet = false; ui.meOpen = false; render(); return; }
  if (!state.example && !state.profile.setupDone && h !== "setup") { if (location.hash !== "#setup") { location.hash = "setup"; return; } h = "setup"; }
  if (ALIAS[h]) h = ALIAS[h];
  if (VIEWS[h] || modView(h)) { ui.view = h; if (h === "policies" && !ui.keepSel) ui.sel = null; }
  else if (getP(h)) { ui.view = "policies"; ui.sel = getP(h).c; }
  else ui.view = "today";
  ui.keepSel = false; ui.sheet = false; ui.meOpen = false;
  render(); window.scrollTo(0, 0);
}
/* A re-render replaces the control that was just used. Put focus back on its replacement (same id, or same action and data,
   or same link), or on the page heading, so keyboard and screen-reader users never get dropped back to the top of the page. */
function focusSig(el) {
  if (!el || el === document.body || !el.closest || el.closest("#pal, #drawer, .perl-gate")) return null;
  const zone = el.closest("#side, #sheet, #subnav, #view, #dbf-views"); if (!zone) return null;
  return { id: el.id || "", tag: el.tagName, href: el.getAttribute("href"), ds: Object.entries(el.dataset || {}), zone: zone.id, cls: el.className, text: (el.textContent || "").trim().slice(0, 60) };
}
function sigMatch(x, sig) { return x.tagName === sig.tag && x.getAttribute("href") === sig.href && Object.keys(x.dataset).length === sig.ds.length && sig.ds.every(([k, v]) => x.dataset[k] === v); }
function shown(el) { return !!el && (el.checkVisibility ? el.checkVisibility() : !!el.offsetParent); }
function pageHeading() {
  const dbf = $("#dbf-views"); const v = dbf && !dbf.hidden ? dbf.querySelector(".view:not([hidden]) h1") : null;
  const h = v || $("#view h1"); if (h && !h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); return h;
}
function restoreFocus(sig, noFallback) {
  if (!sig) return; const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
  if (pal.open || ui.drawer) return;
  let el = sig.id ? document.getElementById(sig.id) : null;
  if (!shown(el)) {
    const pool = [...document.querySelectorAll(`#${sig.zone} ${sig.tag}`), ...document.querySelectorAll(sig.tag)].filter((x) => sigMatch(x, sig) && shown(x));
    el = pool.find((x) => x.className === sig.cls && (x.textContent || "").trim().slice(0, 60) === sig.text) || pool.find((x) => x.className === sig.cls) || pool[0] || null;
  }
  if (!el && !noFallback) el = pageHeading();
  if (el && el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); /* a heading can take focus too */
  if (el) el.focus({ preventScroll: true });
}
document.addEventListener("perl:refocus", (e) => restoreFocus(e.detail));
function render() {
  const active = document.activeElement; const fid = active && active.id; const selStart = active && "selectionStart" in active ? active.selectionStart : null;
  const sig = focusSig(active);
  shell();
  document.documentElement.dataset.space = SPACE[ui.view] || "";
  document.documentElement.dataset.boot = ui.view === "boot" || ui.view === "setup" ? "true" : "false";
  const dbfView = DEBRIEF_VIEWS.has(ui.view);
  $("#view").hidden = dbfView; const dh = $("#dbf-views"); if (dh) dh.hidden = !dbfView;
  const notes = sandboxNotice() + syncNotice();
  $("#view").innerHTML = dbfView ? notes : notes + (VIEWS[ui.view] || modView(ui.view))();
  if (dbfView && notes) $("#view").hidden = false;
  document.dispatchEvent(new CustomEvent("perl:view", { detail: { view: ui.view } }));
  $("#view").dataset.view = ui.view;
  for (const w of document.querySelectorAll("#view .table-wrap")) { if (w.scrollWidth > w.clientWidth + 1 && !w.hasAttribute("tabindex")) { w.tabIndex = 0; w.setAttribute("role", "region"); w.setAttribute("aria-label", ((w.querySelector("caption") || w.closest("section")?.querySelector("h2") || {}).textContent?.trim() || "Table") + " (scrolls sideways)"); } }
  if (ui.view === "progress" || (ui.view === "calendar" && ui.calMode === "timeline")) drawClock($("#clock"));
  renderDrawer();
  if (fid && !(pal.open && fid === "pal-q")) { const el = document.getElementById(fid); if (el && el !== document.body && !el.closest("#pal")) { el.focus({ preventScroll: true }); if (selStart !== null && "setSelectionRange" in el) { try { el.setSelectionRange(selStart, selStart); } catch { /* not a text input */ } } } }
  restoreFocus(sig);
}
/* jump to a section of the page: scroll to it and move focus there, so the keyboard lands where the eyes do */
function focusSection(id) { const el = document.getElementById(id); if (!el) return; if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.scrollIntoView({ block: "start" }); el.focus({ preventScroll: true }); }
function refocus(sel) { setTimeout(() => { const el = document.querySelector(sel); if (!el) return; if (el.tabIndex < 0 && !el.hasAttribute("tabindex") && !el.disabled) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }, 0); }
function shiftMonth(n) {
  const t = today(); const m = parseD(ui.calMonth) || new Date(t.getFullYear(), t.getMonth(), 1);
  const x = new Date(m.getFullYear(), m.getMonth() + n, 1); ui.calMonth = isoD(x).slice(0, 7); render();
}

/* ================= events ================= */
document.addEventListener("click", (ev) => {
  if (ui.meOpen && !ev.target.closest(".me")) { ui.meOpen = false; shell(); }
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act;
  if (t.tagName === "SELECT" || (t.tagName === "INPUT" && t.type !== "checkbox")) return;
  if (t.tagName === "A" && ["open-policy", "cal-mode"].includes(act)) ev.preventDefault();
  switch (act) {
    case "toggle-done": { const k = t.dataset.key; const on = t.getAttribute("aria-checked") !== "true"; t.setAttribute("aria-checked", String(on)); if (on) state.done[k] = Date.now(); else delete state.done[k]; persist(); toast(on ? statusAfterDone() : "Marked not done"); clearTimeout(ui.doneTimer); ui.doneTimer = setTimeout(() => { render(); if (on) refocus(`[data-key="${CSS.escape(k)}"]`); }, 450); break; }
    case "export-ics": exportIcs(); break;
    case "export-health": exportHealthCsv(); break;
    case "sched-open": ui.sched.open = true; render(); setTimeout(() => $("#sched-text")?.focus(), 0); break;
    case "sched-close": ui.sched = { open: false, text: "", fileName: "", items: null, pick: {}, error: "" }; render(); break;
    case "sched-sample": ui.sched.text = SAMPLE_SCHEDULE; ui.sched.fileName = ""; ui.sched.items = null; ui.sched.error = ""; render(); break;
    case "sched-read": { const ta = $("#sched-text"); if (ta) ui.sched.text = ta.value; if (!ui.sched.text.trim()) { ui.sched.error = "Paste a schedule or choose a file first."; render(); break; } ui.sched.items = parseSchedule(ui.sched.text); ui.sched.pick = {}; ui.sched.error = ""; render(); break; }
    case "sched-apply": { const add = (ui.sched.items || []).filter((it, i) => !it.dup && ui.sched.pick[i] !== false); add.forEach((it, i) => state.rotations.push({ id: "r" + Date.now().toString(36) + i, name: it.name, kind: it.kind, start: it.start, end: it.end })); ui.sched = { open: false, text: "", fileName: "", items: null, pick: {}, error: "" }; becomeMine(); persist(); render(); toast(`Added ${plural(add.length, "rotation")}`); break; }
    case "day": openDrawer("day", t.dataset.d); break;
    case "open-rot": if (rotById(t.dataset.id)) openDrawer("rot", t.dataset.id); break;
    case "open-policy": if (getP(t.dataset.code)) openDrawer("policy", getP(t.dataset.code).c); break;
    case "drawer-close": closeDrawer(); break;
    case "cal-prev": shiftMonth(-1); refocus('[data-act="cal-prev"]'); break;
    case "cal-next": shiftMonth(1); refocus('[data-act="cal-next"]'); break;
    case "cal-today": ui.calMonth = ""; render(); refocus('[data-act="cal-today"]'); break;
    case "cal-mode": ui.calMode = t.dataset.mode || "month"; if (ui.view !== "calendar") location.hash = "calendar"; else { render(); refocus(`[data-act="cal-mode"][data-mode="${ui.calMode}"]`); } break;
    case "palette": openPalette(); break;
    case "pick-track": if (t.dataset.t) applyTrack(t.dataset.t); break;
    case "track-find": ui.trackFind = t.dataset.n || ""; render(); refocus(`[data-act="track-find"][data-n="${t.dataset.n || ""}"]`); break;
    case "tracks-reset": state.customTracks = null; persist(); render(); toast("Using the built-in AY2026-27 schedule."); break;
    case "tracks-use": if (ui.drop && ui.drop.tracks) { state.customTracks = ui.drop.tracks; persist(); toast(`${ui.drop.tracks.label} loaded. Pick your track.`); ui.drop = { status: "idle" }; render(); document.getElementById("track")?.scrollIntoView({ block: "start" }); } break;
    case "drop-reset": ui.drop = { status: "idle" }; render(); break;
    case "drop-me": { const p = ui.drop && ui.drop.people && ui.drop.people[+t.dataset.i]; if (p) { ui.drop = { ...ui.drop, status: "review", person: { name: p.name, days: p.days }, people: null, names: [] }; render(); } break; }
    case "drop-add": addDroppedSchedule(); break;
    case "sched-del": { const sc = (state.scheds || []).find((x) => x.id === t.dataset.id); if (sc) removeWithUndo("scheds", sc.id, `the ${rotShort(sc.name)} schedule`); break; }
    case "go-drop": ev.preventDefault(); go("schedule"); setTimeout(() => focusSection("drop-sched"), 60); break;
    case "go-track": ev.preventDefault(); go("schedule"); setTimeout(() => focusSection(state.profile.track === "custom" ? "custom-track" : "track"), 60); break;
    case "theme-toggle": setMode(themeNow() === "dark" ? "light" : "dark"); if (ui.view === "profile") render(); refocus('.me.open [data-act="theme-toggle"]'); break;
    case "theme": setTheme(t.dataset.v); render(); refocus(`[data-act="theme"][data-v="${t.dataset.v}"]`); break;
    case "single-keys": { try { localStorage.setItem(KEYS_KEY, t.checked ? "on" : "off"); } catch { /* storage unavailable */ } toast(t.checked ? "Single-key shortcuts on." : "Single-key shortcuts off."); break; }
    case "palette-close": closePalette(); break;
    case "pal-run": palRun(Number(t.dataset.i)); break;
    case "set-phase": state.profile.phase = t.dataset.phase; persist(); render(); refocus(`[data-act="set-phase"][data-phase="${t.dataset.phase}"]`); break;
    case "tile": {
      const id = t.dataset.id; const nxt = NEXT_STATUS[state.req[id] || "todo"] || "inprog"; state.req[id] = nxt; becomeMine(); persist();
      t.classList.remove("todo", "inprog", "done", "na", "unknown"); t.classList.add(nxt);
      const r = REQS.find((x) => x.id === id); const pg = reqProgress();
      toast(nxt === "done" ? `Graduation checklist: ${pg.done} of ${pg.total}.` : `${SHORT[id] || (r && r.label) || "Step"}: ${STATUS[nxt][0].toLowerCase()}.`);
      clearTimeout(ui.doneTimer); ui.doneTimer = setTimeout(() => { render(); refocus(`[data-act="tile"][data-id="${id}"]`); }, 450); break;
    }
    case "pt-cell": ui.phaseF = t.dataset.phase; ui.groupF = t.dataset.group; ui.sel = null; render(); document.querySelector(".toolbar")?.scrollIntoView({ block: "start" }); break;
    case "del-rot": { if (ui.drawer && ui.drawer.type === "rot" && ui.drawer.id === t.dataset.id) closeDrawer(); removeWithUndo("rotations", t.dataset.id); break; }
    case "go": location.hash = t.dataset.to; break;
    case "sel-policy": ui.sel = t.dataset.code; render(); if (window.innerWidth <= 900) window.scrollTo(0, 0); break;
    case "unsel": ui.sel = null; render(); break;
    case "overdue": ui.overdueOnly = !ui.overdueOnly; render(); break;
    case "req-set": state.profile.reqSet = t.dataset.set; becomeMine(); persist(); render(); break;
    case "open-audit": ui.audit.open = true; ui.audit.status = "idle"; if (ui.view !== "progress") location.hash = "progress"; else render(); break;
    case "close-audit": ui.audit = { open: false, status: "idle", text: "", fileName: "", result: null, error: "", pick: {} }; render(); break;
    case "run-audit": runAudit(); break;
    case "apply-audit": applyAudit(); break;
    case "add-elective": ui.addElective = true; render(); setTimeout(() => $("#el-name")?.focus(), 0); break;
    case "cancel-elective": ui.addElective = false; render(); break;
    case "del-elective": removeWithUndo("electives", t.dataset.id); break;
    case "use-calc": ui.calc.rule = t.dataset.calc; closeDrawer(); if (location.hash !== "#rotations") location.hash = "rotations"; else render(); setTimeout(() => $("#calc-base")?.focus(), 30); break;
    case "ask-example": ui.ask.draft = t.textContent; if (ui.view !== "ask") location.hash = "ask"; else render(); setTimeout(() => ask(ui.ask.draft), 0); break;
    case "ask-about": ui.ask.draft = `What does ${t.dataset.code} require of me right now, and what deadlines does it set?`; closeDrawer(); location.hash = "ask"; break;
    case "sample-audit": ui.audit.text = SAMPLE_AUDIT; ui.audit.fileName = ""; ui.audit.error = ""; render(); break;
    case "ask-clear": ui.ask.turns = []; render(); break;
    case "setup-next": setupNext(); break;
    case "sync-retry": if (STORE.hasUnsaved()) STORE.retry().then(() => { if (STORE.problem()) toast("Still can't reach your account. Charted will keep trying."); render(); }); else reloadFromStore(false); break;
    case "sync-reload": ui.tabConflict = false; if (ui.otherTab) { takeSpace(ui.otherTab.space, ui.otherTab.data); ui.otherTab = null; persist(); render(); toast("Using the other version."); } else reloadFromStore(false); break;
    case "sync-keep": ui.tabConflict = false; ui.otherTab = null; persist(); render(); toast("Kept this version. It's saved now."); break;
    case "install": runInstall(); break;
    case "sched-fix": fixSchedMismatch(t.dataset.sid); break;
    case "reauth": if (window.PERL_ACCOUNT && window.PERL_ACCOUNT.reauth) window.PERL_ACCOUNT.reauth(); break;
    case "ai-toggle": if (window.PERL_ACCOUNT) { window.PERL_ACCOUNT.setAiAllowed(!window.PERL_ACCOUNT.aiAllowed()); render(); toast(window.PERL_ACCOUNT.aiAllowed() ? "Claude allowed." : "Claude turned off."); } break;
    case "sign-out": if (window.PERL_ACCOUNT) window.PERL_ACCOUNT.signOut(); break;
    case "set-pw": { const el = document.getElementById("acct-pw"); if (!window.PERL_ACCOUNT || !el) break; const v = el.value;
      if (v.length < 8) { toast("Use at least 8 characters."); el.focus(); break; }
      window.PERL_ACCOUNT.setPassword(v).then(() => { el.value = ""; toast("Password saved. Sign in with your email and this password from now on."); }).catch((e) => { toast((e && e.message) || "Couldn't save the password."); el.focus(); }); break; }
    case "del-acct": ui.delAcct = true; render(); refocus('[data-act="del-acct-cancel"]'); break;
    case "del-acct-cancel": ui.delAcct = false; render(); break;
    case "del-acct-yes": if (window.PERL_ACCOUNT) window.PERL_ACCOUNT.deleteAccount().catch((e) => toast((e && e.message) || "Couldn't delete your account.")); break;
    case "setup-back": ui.setupStep = Math.max(1, (ui.setupStep || 1) - 1); render(); refocus("#view h1"); break;
    case "setup-done": setupDone(); break;
    case "su-paste": ui.setupPaste = !ui.setupPaste; render(); refocus("#su-text"); break;
    case "su-read": { const v = ($("#su-text") || {}).value || ""; if (!v.trim()) { ui.setupErr = "Paste your audit text first."; render(); break; } setupAuditText(v, "Pasted text"); break; }
    case "su-undo": ui.setupAudit = null; ui.setupErr = ""; render(); refocus("#su-file"); break;
    case "make-custom": makeCustom(); break;
    case "wiz-open": ev.preventDefault && ev.preventDefault(); ui.wiz = wizInit(); if (ui.view !== "schedule") go("schedule"); else render(); setTimeout(() => focusSection("wiz"), 60); break;
    case "wiz-cancel": ui.wiz = null; render(); refocus("#h-ct, #track"); break;
    case "wiz-apply": wizApply(); break;
    case "wiz-move": { const w = ui.wiz; if (!w) break; wizLater(w); const i = w.order.indexOf(t.dataset.n); const j = i + Number(t.dataset.d); if (i < 0 || j < 0 || j >= w.order.length) break; [w.order[i], w.order[j]] = [w.order[j], w.order[i]]; render(); refocus(`[data-act=wiz-move][data-n="${CSS.escape(t.dataset.n)}"][data-d="${t.dataset.d}"]:not([disabled]), #h-wiz`); break; }
    case "ct-add": { const n = t.dataset.n; const sl = nextSlot(n); const rot = { id: "c" + Date.now().toString(36), name: n, kind: "clerkship", start: sl.start, end: sl.end, src: "you" };
      if (state.profile.track !== "custom") makeCustom(); state.rotations = state.rotations.filter((r) => !(r.src === "base" && r.name === n)); state.rotations.push(rot); becomeMine(); persist(); render(); refocus(`#cs-${CSS.escape(rot.id)}`); toast(`${rotShort(n)} added ${fmtShort(parseD(sl.start))} to ${fmtShort(parseD(sl.end))}. Adjust the dates if they're different.`); break; }
    case "ct-confirm": { const r = (state.rotations || []).find((x) => x.id === t.dataset.id); if (r) { r.src = "you"; persist(); render(); refocus("#h-ct"); toast(`${rotShort(r.name)} dates confirmed.`); } break; }
    case "example-enter": if (!state.example) { mine = state; state = normalize(clone(EXAMPLE)); seedExample(); } go("today"); break;
    case "example-exit": if (mine) { state = mine; mine = null; } ui.ask.turns = []; go(state.profile.setupDone ? "today" : "setup"); break;
    case "recent-clear": state.askRecent = []; persist(); render(); break;
    case "me-menu": ui.meOpen = !ui.meOpen; shell(); refocus(ui.meOpen ? "#me-menu a" : '[data-act="me-menu"]'); break;
    case "go-acct": ev.preventDefault(); go("profile"); setTimeout(() => focusSection("h-acct"), 60); break;
    case "sheet-close": ui.sheet = false; shell(); $("#menu-btn")?.focus(); break;
    case "clear": ui.clearConfirm = true; render(); break;
    case "clear-cancel": ui.clearConfirm = false; render(); break;
    case "clear-yes": {
      ui.clearConfirm = false; STORE.clear(); state = clone(BLANK); mine = null; ui.setupStep = 1;
      ui.savedNote = "Erased"; go("setup"); break;
    }
    default: modAct(act, t, ev);
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (modEvent("change", ev)) return;
  if (t.matches("[data-act='req-status']")) { state.req[t.dataset.id] = t.value; becomeMine(); persist(); render(); return; }
  if (t.matches("[data-prof]")) {
    const k = t.dataset.prof; let v = t.value;
    if (k === "leaveMonths") v = Math.max(0, Math.min(60, Number(v) || 0));
    if (k === "name") v = String(v).trim().slice(0, 40);
    if (k === "myName") v = String(v).trim().slice(0, 60);
    if (ui.view === "setup") { if ((k === "matric" || k === "grad") && !v) return; state.profile[k] = v; persist(); return; } /* no re-render mid-form, so the Continue click lands */
    if ((k === "matric" || k === "grad") && !v) return;
    state.profile[k] = v; becomeMine(); persist(); render(); return;
  }
  if (t.matches("[data-act='calc-rule']")) { ui.calc.rule = t.value; render(); return; }
  if (t.matches("[data-act='calc-base']")) { ui.calc.base = t.value; render(); return; }
  if (t.matches("[data-act='pf']")) { ui.phaseF = t.value; ui.sel = null; render(); return; }
  if (t.matches("[data-act='pg']")) { ui.groupF = t.value; ui.sel = null; render(); return; }
  if (t.matches("[data-pick]")) { ui.audit.pick[t.dataset.pick] = t.checked; return; }
  if (t.matches("[data-act='grade-posted']")) { const r = state.rotations.find((x) => x.id === t.dataset.id); if (r) { r.gradePosted = t.value; becomeMine(); persist(); render(); const g = gradeStatus(r); if (t.value && g) toast(`${rotShort(r.name)} grade logged. ${g[1]}.`); } return; }
  if (t.matches("[data-spick]")) { ui.sched.pick[t.dataset.spick] = t.checked; return; }
  if (t.id === "sched-x" && t.files && t.files[0]) { readDroppedFile(t.files[0]); return; }
  if (t.id === "drop-clerk") { if (ui.drop) ui.drop.clerk = t.value; render(); return; }
  if (t.matches("[data-act='ct-date']")) {
    const r = (state.rotations || []).find((x) => x.id === t.dataset.id); if (!r || !parseD(t.value)) return;
    const k = t.dataset.k; const other = k === "start" ? r.end : r.start; const wasPending = guessedPast(r);
    if (k === "end" && other && t.value < other) { toast("The end date is before the start date."); t.value = r[k]; return; }
    /* a later start moves the whole block: the end keeps the block's length, so a rotation can be moved with one field */
    if (k === "start" && other && t.value > other) { const len = Math.max(0, diffDays(parseD(r.start), parseD(r.end))); r.end = isoD(addDays(parseD(t.value), len)); }
    r[k] = t.value; if (r.src === "base" || r.src === "est") r.src = "you"; if (state.profile.track !== "custom") makeCustom(); becomeMine(); persist(); toast(`${rotShort(r.name)}: ${fmtShort(parseD(r.start))} to ${fmtShort(parseD(r.end))}.`);
    if (wasPending || k === "start") { render(); refocus(`#${CSS.escape(t.id)}`); }
    return;
  }
  if (t.id === "ct-base") { const base = t.value; const auditRots = (state.rotations || []).filter((r) => r.kind === "clerkship" && r.src === "audit").map((r) => ({ name: r.name, code: r.id.split("-")[1] || "", start: r.start, end: r.end }));
    const mineRots = (state.rotations || []).filter((r) => r.kind === "clerkship" && r.src === "you");
    const plan = customPlan(auditRots, base).filter((x) => !mineRots.some((m) => m.name === x.name)).map((x) => (x.src === "audit" ? { ...x, id: (state.rotations.find((r) => r.src === "audit" && r.name === x.name && r.start === x.start) || x).id } : x));
    setCustomRotations(plan.concat(mineRots), base); becomeMine(); persist(); render(); refocus("#ct-base"); toast(base ? `Started from Track ${base}. Confirm the dates marked to confirm.` : "Assigned track cleared."); return; }
  if (t.id === "su-file" && t.files && t.files[0]) { setupAuditFile(t.files[0]); return; }
  if (ui.wiz && t.id === "wiz-base") { ui.wiz = wizInit(t.value); render(); refocus("#wiz-base"); return; }
  if (ui.wiz && t.id === "wiz-start") { ui.wiz.start = t.value; render(); refocus("#wiz-start"); return; }
  if (ui.wiz && t.matches("[data-act='wiz-pick']")) { ui.wiz.picks[Number(t.dataset.i)] = t.value; render(); refocus(`#${CSS.escape(t.id)}`); return; }
  if (t.id === "p-track") { if (t.value === "custom") return; if (t.value) applyTrack(t.value); else { state.profile.track = ""; persist(); render(); } return; }
  if (t.id === "sched-file" && t.files && t.files[0]) { const f0 = t.files[0]; const ta = $("#sched-text"); if (ta) ui.sched.text = ta.value; f0.text().then((txt) => { ui.sched.text = txt.slice(0, 200000); ui.sched.fileName = f0.name; ui.sched.items = null; ui.sched.error = ""; render(); }).catch(() => { ui.sched.error = "Couldn't read that file."; render(); }); return; }
  if (t.id === "audit-file" && t.files && t.files[0]) { const ta = $("#audit-text"); if (ta) ui.audit.text = ta.value; readAuditFile(t.files[0]); }
});
let qTimer = null;
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (modEvent("input", ev)) return;
  if (t.id === "pal-q") { pal.q = t.value; pal.idx = 0; palRender(); return; }
  if (t.matches("[data-act='pq']")) { clearTimeout(qTimer); qTimer = setTimeout(() => { ui.q = t.value; ui.sel = null; render(); }, 160); }
  if (t.id === "ask-q") ui.ask.draft = t.value;
  if (t.id === "audit-text") ui.audit.text = t.value;
  if (t.id === "sched-text") { ui.sched.text = t.value; if (ui.sched.items) { ui.sched.items = null; render(); } }
});
document.addEventListener("submit", (ev) => {
  const f = ev.target; ev.preventDefault();
  if (modEvent("submit", ev)) return;
  if (f.dataset.form === "ask") ask($("#ask-q").value);
  if (f.dataset.form === "rotation") {
    const name = $("#rot-name").value.trim(); const st = $("#rot-start").value; const en = $("#rot-end").value;
    if (!name || !parseD(st) || !parseD(en)) { ui.rotError = "Add a name, a start date and an end date."; render(); return; }
    if (parseD(en) < parseD(st)) { ui.rotError = "The end date is before the start date."; render(); return; }
    let kind = $("#rot-kind").value; if (/sub-?intern/i.test(name)) kind = "subi";
    ui.rotError = "";
    state.rotations.push({ id: "r" + Date.now().toString(36), name: name.slice(0, 60), kind, start: st, end: en });
    becomeMine(); persist(); render(); toast(`Added ${name.slice(0, 60)}`);
  }
  if (f.dataset.form === "elective") {
    const name = $("#el-name").value.trim(); if (!name) { toast("Give the elective a name first."); $("#el-name").focus(); return; }
    const weeks = Math.max(0, Number($("#el-weeks").value) || 0); const credits = Math.max(0, Number($("#el-credits").value) || weeks);
    state.electives.push({ id: "e" + Date.now().toString(36), name: name.slice(0, 80), kind: $("#el-kind").value, weeks, credits, status: $("#el-status").value });
    ui.addElective = false; becomeMine(); persist(); render();
  }
});
function typing(el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
/* single-character shortcuts (N, /, T, arrows on the calendar) can be switched off in Profile (WCAG 2.1.4) */
const KEYS_KEY = "perl.v1.keys";
function singleKeysOn() { try { return localStorage.getItem(KEYS_KEY) !== "off"; } catch { return true; } }
window.PERL_SINGLE_KEYS = singleKeysOn;
document.addEventListener("keydown", (ev) => {
  if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && ev.key.toLowerCase() === "k") { ev.preventDefault(); if (pal.open) closePalette(); else openPalette(); return; }
  if (ev.key === "Tab" && !pal.open && !document.querySelector(".perl-gate")) { const top = ui.drawer ? $("#drawer") : ui.sheet ? $("#sheet") : null; if (top && trapTab(ev, top)) return; }
  if (pal.open) {
    if (ev.key === "Escape") { ev.preventDefault(); closePalette(); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); const n = pal.items.length; if (n) { pal.idx = (pal.idx + (ev.key === "ArrowDown" ? 1 : -1) + n) % n; palRender(); } return; }
    if (ev.key === "Enter" && ev.target.id === "pal-q") { ev.preventDefault(); palRun(pal.idx); return; }
    if (ev.key === "Tab") { ev.preventDefault(); $("#pal-q")?.focus(); return; }
    return;
  }
  if (ev.key === "Escape") {
    if (ui.drawer) { closeDrawer(); return; }
    if (ui.meOpen) { ui.meOpen = false; shell(); $('#side [data-act="me-menu"], #sheet [data-act="me-menu"]')?.focus(); return; }
    if (ui.sheet) { ui.sheet = false; shell(); $("#menu-btn")?.focus(); return; }
  }
  if (typing(ev.target) || ev.metaKey || ev.ctrlKey || ev.altKey || !singleKeysOn()) return;
  if (ev.key === "/") { ev.preventDefault(); openPalette(); return; }
  if (ui.view === "calendar" && ui.calMode === "month" && !ui.drawer) {
    if (ev.key === "ArrowLeft" && !ev.target.closest(".mc")) { shiftMonth(-1); }
    if (ev.key === "ArrowRight" && !ev.target.closest(".mc")) { shiftMonth(1); }
    if (ev.key === "t") { ui.calMonth = ""; render(); }
  }
});
$("#scrim").addEventListener("click", closeDrawer);
/* a schedule dropped anywhere outside the audit box is read as a clerkship schedule */
let dragDepth = 0;
const hasFiles = (ev) => ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files");
["dragenter", "dragover", "dragleave", "drop"].forEach((type) => document.addEventListener(type, (ev) => {
  if (!hasFiles(ev) || (ev.target.closest && ev.target.closest("#drop"))) return;
  ev.preventDefault();
  if (type === "dragenter") dragDepth++;
  if (type === "dragleave") dragDepth = Math.max(0, dragDepth - 1);
  if (type === "drop") dragDepth = 0;
  document.documentElement.classList.toggle("dropping", dragDepth > 0 && type !== "drop");
  if (type === "drop" && ev.dataTransfer.files[0]) { if (ui.view === "setup") setupAuditFile(ev.dataTransfer.files[0]); else readDroppedFile(ev.dataTransfer.files[0]); }
}));
["dragover", "dragleave", "drop"].forEach((type) => document.addEventListener(type, (ev) => {
  const d = ev.target.closest && ev.target.closest("#drop"); if (!d) return;
  ev.preventDefault();
  if (type === "dragover") d.classList.add("over"); else d.classList.remove("over");
  if (type === "drop" && ev.dataTransfer.files[0]) readAuditFile(ev.dataTransfer.files[0]);
}));
let rz = null;
window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if ($("#clock")) drawClock($("#clock")); }, 120); });
window.addEventListener("hashchange", route);
$("#menu-btn").addEventListener("click", () => { ui.sheet = true; shell(); $("#sheet [data-act='sheet-close']")?.focus(); });

/* the store reports: a save failed, saving works again, another tab saved, or this tab and another both have changes */
function adoptSaved(data) {
  const fresh = normalize(data); if (state.example) { mine = fresh; return; }
  state = fresh; sharedChanged();
}
function onStore(type, d) {
  if (type === "error") { if (!ui.syncWarned) { ui.syncWarned = true; toast(d && d.code === "session_expired" ? "Your sign-in expired. Changes are kept in this browser for now." : "Can't reach your account. Changes are kept in this browser for now."); } render(); return; }
  if (type === "saved") { ui.syncWarned = false; ui.savedNote = STORE.note(); toast("Back online. Your changes are saved to your account."); render(); return; }
  if (type === "online") { reloadFromStore(true); return; }
  if (type === "remote" || type === "merge") {
    takeSpace(d.space, d.data);
    if (type === "merge") { if (!state.example) STORE.save(state); if (d.conflict) { ui.tabConflict = d.from || "tab"; ui.otherTab = { space: d.space, data: d.theirs }; } else toast(d.from === "account" ? "Saved, and merged with changes made on another device." : "Merged with changes from your other tab."); }
    else toast("Updated with changes from your other tab.");
    render(); return;
  }
}
/* replace one saved space (shared or school) of the plan with another copy of it */
function takeSpace(space, data) {
  const base = state.example ? (mine || BLANK) : state; const keys = space === "shared" ? STORE.keys.SHARED_KEYS : STORE.keys.SCHOOL_KEYS;
  const next = { ...base }; for (const k of keys) { if (k in data) next[k] = data[k]; else if (k !== "v") delete next[k]; }
  adoptSaved(next);
}
async function reloadFromStore(quiet) {
  let saved = null; try { saved = await STORE.load(); } catch { saved = null; }
  if (saved && saved.unreachable) { if (!quiet) toast("Still can't reach your account. Charted will keep trying."); render(); return; }
  ui.unreachable = false; ui.tabConflict = false;
  adoptSaved(saved ? { ...saved.shared, ...saved.school } : null);
  if (!quiet) toast("Your plan is up to date.");
  route();
}
function seedExample() { if (!state.example || Object.keys(state.done).length) return; const t = today(); for (const x of [...rotationItems(), ...schedItems()]) if (x.date < t) state.done[itemKey(x)] = 1; }
/* the app puts each page at the top itself; the browser restoring an old scroll offset after a reload would land
   mid-page once the plan has drawn, with the page's first lines (and any notice) out of view */
try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* not allowed here */ }
async function boot() {
  route();
  await STORE.init();
  let saved = null; try { saved = await STORE.load(); } catch { saved = null; }
  ui.unreachable = !!(saved && saved.unreachable);
  state = normalize(saved ? { ...saved.shared, ...saved.school } : null);
  STORE.on(onStore);
  /* feature modules (habits.js, career.js) load after this script; wait for them before the first real route */
  if (document.readyState === "loading") await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
  booted = true; ui.savedNote = saved ? STORE.note() : "";
  sharedChanged();
  route();
}
boot();
/* a page left open overnight (or across New Year) moves on to the new day by itself, unless you're mid-typing */
let dayShown = isoD(today());
function checkDay() {
  const d = isoD(today()); if (d === dayShown || !booted) return;
  if (typing(document.activeElement) || pal.open) return;
  dayShown = d; ui.calMonth = ""; render(); sharedChanged();
}
setInterval(checkDay, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkDay(); });
if (false && "serviceWorker" in navigator && !IN_CLAUDE && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable */ });
document.fonts && document.fonts.ready.then(() => { if ($("#clock")) drawClock($("#clock")); });
})();
