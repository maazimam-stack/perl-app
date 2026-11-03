/* SOURCE OF TRUTH. Originally generated once by tools/port_debrief.py from handoff/perl/, then edited by hand; edit this file directly. The port script is retired and refuses to run, so nothing regenerates or overwrites it. */
/* Debrief space, ported from Perl (Clerkship Debrief v7). Owns the journal, the residency vault, the MSPE draft and
   debrief settings, in its own store at data/users/<uid>/debrief. Reads the shared schedule one way through window.PERL_SHARED.
   Nothing here is exported by School, and School code never reads it. */
(() => {
"use strict";
(() => { const tpl = document.getElementById("dbf-views-tpl"); const host = document.getElementById("dbf-views"); if (tpl && host) host.append(tpl.content.cloneNode(true)); })();

/* ---------- icons ---------- */
const ICONS = {
  today:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  calendar:'<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/>',
  journal:'<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
  vault:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  chevL:'<path d="m15 6-6 6 6 6"/>', chevR:'<path d="m9 6 6 6-6 6"/>', chevD:'<path d="m6 9 6 6 6-6"/>',
  check:'<path d="M5 12.5 9.5 17 19 7"/>',
  spark:'<path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9z"/><path d="M19 3v3M17.5 4.5h3"/>',
  download:'<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  arrowR:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.6 2.8-5.6 3.8-8.9 2.3 1.3 3.2 3.4 3.2 5 1-.6 1.6-1.8 1.7-3 2 1.6 4.3 4 4.3 7 0 3.5-2.6 6-6.5 6z"/>',
  pulse:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  quote:'<path d="M5 18c2.5-1 4-3.2 4-6V7H5v5h4M15 18c2.5-1 4-3.2 4-6V7h-4v5h4"/>',
  shield:'<path d="M12 3 19 6v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z"/>',
  words:'<path d="M4 7h16M4 12h10M4 17h13"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  book:'<path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  letter:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  upload:'<path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
  moon:'<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
  monitor:'<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>',
};
function icon(n, cls){
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "i" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONS[n] || ""; return s;
}
document.querySelectorAll("i[data-icon]").forEach(el => el.replaceWith(icon(el.dataset.icon, el.dataset.cls)));

/* ---------- reference data ---------- */
const COMPS = [["PC","Patient Care"],["MK","Medical Knowledge"],["PBLI","Practice-Based Learning"],["ICS","Communication"],["PROF","Professionalism"],["SBP","Systems-Based Practice"]];
const COMP_KEYS = COMPS.map(c => c[0]);
const COMP_NAME = Object.fromEntries(COMPS);
const EPAS = {1:"History & physical",2:"Differential",3:"Order & interpret tests",4:"Orders & prescriptions",5:"Documentation",6:"Oral presentation",7:"Clinical question & evidence",8:"Handover",9:"Interprofessional team",10:"Urgent care recognition",11:"Informed consent",12:"Procedures",13:"Safety & systems"};
const THEMES = {"meaningful-patient":"Meaningful patient","acute":"Acute / crashing patient","mistake":"Mistake","feedback":"Critical feedback","conflict":"Team conflict","teamwork":"Teamwork","advocacy":"Advocacy","difficult-conversation":"Hard conversation","leadership":"Leadership","ethics":"Ethical dilemma","uncertainty":"Out of my depth","systems-fix":"Systems fix","procedure":"Procedure","specialty-pull":"Specialty pull"};
const THEME_KEYS = Object.keys(THEMES);
const ROLES = ["attending","resident","fellow","nurse","other"];
const PROMPTS = [
  {q:"Tell me about a patient who stayed with you.", themes:["meaningful-patient"]},
  {q:"Tell me about a mistake you made and what you did next.", themes:["mistake"]},
  {q:"Tell me about a time you got critical feedback.", themes:["feedback"]},
  {q:"Describe a conflict on your team and how you handled it.", themes:["conflict","teamwork"]},
  {q:"Describe a time you advocated for a patient.", themes:["advocacy"]},
  {q:"Walk me through a difficult conversation with a patient or family.", themes:["difficult-conversation"]},
  {q:"Tell me about a time you were out of your depth.", themes:["uncertainty","acute"]},
  {q:"Tell me about a time you led without the title.", themes:["leadership"]},
  {q:"Describe an ethical dilemma you faced on the wards.", themes:["ethics"]},
  {q:"What pulled you toward this specialty?", themes:["specialty-pull"]},
];
const STARTERS = [["Patient I'll remember","The patient I'll remember from today: "],["What I did","What I actually did myself: "],["Feedback I got","Feedback I got today (who, what they said): "],["Do differently","Something I'd do differently: "],["Most useful","I felt most useful when "]];
const STYLES = {
  clean:{name:"Clean", desc:"Fix fillers and punctuation. Keep my wording.", instr:"light touch: remove fillers and fix punctuation only; otherwise keep the student's exact wording"},
  polished:{name:"Polished", desc:"Tighten sentences, keep my voice.", instr:"tighten wordy sentences and fix grammar while keeping the student's voice and word choices"},
  reflective:{name:"Reflective", desc:"First-person prose for a personal statement.", instr:"rewrite as clear first-person reflective prose a student could quote in a residency personal statement, adding nothing they did not say"},
};
const DEF_ROT = [["Pediatrics",6,2],["Psychiatry",6,4],["OB/GYN",6,6],["Surgery",8,1],["Internal Medicine",8,0],["Family Medicine",4,3],["Neurology",4,5]];
const DEFAULTS = {
  rotations: DEF_ROT.map(([name, weeks, color]) => ({name, weeks, color, start:""})),
  current:"Pediatrics", style:"polished", specialty:"",
  dictionary:[{word:"AFib", heard:"a fib"},{word:"NSTEMI", heard:"n stemi"},{word:"BiPAP", heard:"bi pap"},{word:"CBC", heard:"see bc"},{word:"Kawasaki disease", heard:""}],
  snippets:[
    {trigger:"day recap", text:"Day recap\nPatients I followed: \nBest moment: \nHardest moment: \nFeedback I got (who, what they said): \nOne thing I'll read tonight: "},
    {trigger:"feedback note", text:"Feedback from [name, role]: \nWhat they saw me do: \nWhat I'll change: "},
    {trigger:"case pearl", text:"Case in one line: \nThe teaching point: \nWhere I'll read about it: "},
    {trigger:"letter ask", text:"Possible letter writer: [name]\nWhat they saw me do: \nWhen I'll ask: "},
  ],
};
const ERAS = {desc:750, reflect:300};
const VIEWS = [["today","Today","today"],["calendar","Calendar","calendar"],["journal","Journal","journal"],["vault","Residency vault","vault"],["mspe","MSPE","letter"],["toolkit","Toolkit","sliders"]];

/* ---------- PHI scanner (local, before anything leaves the page) ---------- */
const MONTHS = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const PHI_RULES = [
  {label:"ID number", re:/\b(?:MRN|med(?:ical)? rec(?:ord)?(?: (?:number|no\.?|#))?|acct|account|CSN|FIN)\s*[:#]?\s*\d{3,}\b/gi, token:"[ID]"},
  {label:"SSN", re:/\b\d{3}-\d{2}-\d{4}\b/g, token:"[ID]"},
  {label:"Phone", re:/(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, token:"[PHONE]"},
  {label:"Long number", re:/\b\d{7,}\b/g, token:"[ID]"},
  {label:"Email", re:/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, token:"[EMAIL]"},
  {label:"Date", re:/\b\d{1,2}[\/-]\d{1,2}[\/-](?:\d{4}|\d{2})\b/g, token:"[DATE]"},
  {label:"Date", re:/(\b(?:on|since|from|admitted|discharged|until|by|born)\s)(\d{1,2}\/\d{1,2})\b/gi, token:"[DATE]", pre:true},
  {label:"Date", re:new RegExp("\\b" + MONTHS + "\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b","g"), token:"[DATE]"},
  {label:"Birth date", re:/\b(?:DOB|date of birth)\b[:\s]*[^.,;\n]{0,18}/gi, token:"[DOB]"},
  {label:"Room / bed", re:/\b(?:room|rm|bed|bay)\s*#?\s*\d+[A-Za-z]?\b/gi, token:"[ROOM]"},
  {label:"Age 90+", re:/\b(?:9\d|1[01]\d)[\s-]?(?:y\/?o|yo|year[\s-]old|years[\s-]old)\b/gi, token:"[AGE 90+]"},
  {label:"Name", re:/\b(?:Mr|Mrs|Ms|Miss|Mx)\.?\s+[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?/g, token:"[NAME]"},
  {label:"Name", re:/(\b(?:named|called)\s)([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)/g, token:"[NAME]", pre:true},
  {label:"Address", re:/\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Ct|Court|Way|Drive)\b\.?/g, token:"[ADDRESS]"},
];
function scanPHI(text){
  const hits = []; if (!text) return hits;
  for (const r of PHI_RULES){
    r.re.lastIndex = 0; let m;
    while ((m = r.re.exec(text))){
      if (!m[0]) { r.re.lastIndex++; continue; }
      if (r.pre) hits.push({label:r.label, match:m[2], index:m.index + m[1].length, token:r.token});
      else hits.push({label:r.label, match:m[0], index:m.index, token:r.token});
    }
  }
  hits.sort((a, b) => a.index - b.index || b.match.length - a.match.length);
  const out = []; let end = -1;
  for (const x of hits){ if (x.index >= end){ out.push(x); end = x.index + x.match.length; } }
  return out;
}
function scrubPHI(text){ const hits = scanPHI(text); let res = "", pos = 0; for (const x of hits){ res += text.slice(pos, x.index) + x.token; pos = x.index + x.match.length; } return res + text.slice(pos); }
const sigOf = hits => hits.map(x => x.match.toLowerCase()).sort().join("|");

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag); let val;
  if (attrs) for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "value") val = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)){ if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  if (val !== undefined) el.value = val;
  return el;
}
const clone = o => JSON.parse(JSON.stringify(o));
const str = v => (typeof v === "string" ? v : v == null ? "" : String(v)).trim();
const arr = v => Array.isArray(v) ? v : [];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const wordsIn = t => (str(t).match(/\S+/g) || []).length;
const firstWords = (t, n = 7) => { const w = str(t).replace(/\s+/g, " ").split(" ").slice(0, n).join(" "); return w ? w.replace(/[.,;:]$/, "") + (wordsIn(t) > n ? "…" : "") : "Untitled entry"; };
const newId = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad2 = n => String(n).padStart(2, "0");
const dayKey = d => { const x = d instanceof Date ? d : new Date(d); return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate()); };
const isDayKey = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const parseDay = k => { const [y, m, d] = String(k).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayKey = () => dayKey(new Date());
const diffDays = (a, b) => Math.round((parseDay(dayKey(a)) - parseDay(dayKey(b))) / 864e5);
const weekStart = d => { const x = parseDay(dayKey(d)); return addDays(x, -((x.getDay() + 6) % 7)); };
const monthStart = d => new Date(d.getFullYear(), d.getMonth(), 1);
const entryDay = e => isDayKey(e.date) ? e.date : dayKey(e.createdAt || Date.now());
const fmt = (k, o) => parseDay(k).toLocaleDateString(undefined, o || {month:"short", day:"numeric"});
function relDay(k){ const t = todayKey(); if (k === t) return "Today"; if (k === dayKey(addDays(new Date(), -1))) return "Yesterday"; return fmt(k, {weekday:"short", month:"short", day:"numeric"}); }
const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const K = {entries:"perl.v1.debrief.entries", settings:"perl.v1.debrief.settings", draft:"perl.v1.debrief.draft", appearance:"perl.v1.debrief.appearance"};
const APPEARANCES = ["light","dark","system"];
const APPEAR_LABEL = {light:"Light", dark:"Dark", system:"Match system"};
let appearance = "dark"; /* dark only in the merged app */
function applyAppearance(){}
function applyAppearanceUnused(v){
  appearance = APPEARANCES.includes(v) ? v : "light";
  if (appearance === "system") document.documentElement.removeAttribute("data-appearance");
  else document.documentElement.setAttribute("data-appearance", appearance);
  lsSet(K.appearance, appearance);
}
function isDarkNow(){ return true; }
function setAppearance(){}
const initials = n => str(n).replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";

function normRot(r, i){
  if (typeof r === "string"){ const d = DEF_ROT.find(x => x[0] === r); return {name:r, weeks:d ? d[1] : 4, color:d ? d[2] : i % 8, start:""}; }
  if (!r || typeof r !== "object" || !str(r.name)) return null;
  return {name:str(r.name), weeks:clamp(Number.parseInt(r.weeks, 10) || 4, 1, 52), color:clamp(Number.parseInt(r.color, 10) || 0, 0, 7), start:isDayKey(r.start) ? r.start : ""};
}
function normSettings(s){
  const d = clone(DEFAULTS); if (!s || typeof s !== "object") return d;
  const rot = arr(s.rotations).map(normRot).filter(Boolean);
  return {
    rotations: rot.length ? rot : d.rotations,
    current: str(s.current) || (rot[0] ? rot[0].name : d.current),
    style: STYLES[s.style] ? s.style : d.style,
    specialty: str(s.specialty),
    appearance: APPEARANCES.includes(s.appearance) ? s.appearance : null,
    myName: str(s.myName),
    dictionary: Array.isArray(s.dictionary) ? s.dictionary.filter(x => x && str(x.word)).map(x => ({word:str(x.word), heard:str(x.heard)})) : d.dictionary,
    snippets: Array.isArray(s.snippets) ? s.snippets.filter(x => x && str(x.trigger) && typeof x.text === "string").map(x => ({trigger:str(x.trigger), text:x.text})) : d.snippets,
  };
}
async function copyText(text){
  try { await navigator.clipboard.writeText(text); toast("Copied"); }
  catch {
    const ta = h("textarea", {class:"sr", value:text}); document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    ta.remove(); toast(ok ? "Copied" : "Couldn't copy here. Select the text and copy it yourself.");
  }
}
let toastTimer;
function toast(msg, action){
  const host = $("#toastHost"); host.textContent = "";
  host.append(h("div", {class:"toast", role:"status"}, h("span", {text:msg}), action ? h("button", {type:"button", text:action.label, onclick:() => { host.textContent = ""; action.fn(); }}) : null));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { host.textContent = ""; }, action ? 6000 : 3000);
}

/* ---------- state ---------- */
let schedIndex = new Map();
const draft0 = lsGet(K.draft) || {};
const state = {
  view:null, settings:normSettings(lsGet(K.settings)),
  entries:[], loaded:false, mode:"loading", ai:null,
  energy:Number.isInteger(draft0.energy) ? draft0.energy : null,
  phiAckSig:"", busy:null,
  compose:{step:"write", date:isDayKey(draft0.date) ? draft0.date : null, rotation:str(draft0.rotation) || null, review:null},
  drawer:{id:null, edit:null, confirmDel:false},
  pal:{items:[], idx:0},
  cal:{month:monthStart(new Date()), sel:todayKey()},
  filter:{q:"", rot:"all", comp:"all"},
  cmd:{}, drafts:{}, imports:[], imp:null, confirmImp:null,
};

/* ---------- schedule: read from the shared Schedule (window.PERL_SHARED), never written from here ---------- */
const CORE = ["Family Medicine", "Internal Medicine", "Neurology", "Psychiatry", "Obstetrics and Gynecology", "Pediatrics", "Surgery"];
const CORE_COLOR = {"Internal Medicine":0, "Surgery":1, "Pediatrics":2, "Family Medicine":3, "Psychiatry":4, "Neurology":5, "Obstetrics and Gynecology":6};
let sharedProfile = {};
function syncShared(){
  const S = window.PERL_SHARED; if (!S) return;
  const rots = arr(S.rotations()).filter(r => r && str(r.name) && isDayKey(r.start) && isDayKey(r.end)).sort((a, b) => a.start.localeCompare(b.start));
  /* every rotation is kept, even two with the same name (a repeated elective, a split clerkship): days are matched to a
     rotation by its id and dates, never by name alone */
  state.settings.rotations = rots.length ? rots.map((r, i) => ({id:str(r.id) || "rot" + i, name:r.name, kind:r.kind || "clerkship", start:r.start, end:r.end, weeks:Math.max(1, Math.round((diffDays(parseDay(r.end), parseDay(r.start)) + 1) / 7)), color:CORE_COLOR[r.name] ?? rotColor(r.name)}))
    : CORE.map(n => ({name:n, kind:"clerkship", start:"", end:"", weeks:5, color:CORE_COLOR[n]}));
  if (!state.settings.rotations.some(r => r.name === state.settings.current)) state.settings.current = (state.settings.rotations[0] || {}).name || "Clerkship";
  const scheds = arr(S.scheds());
  state.imports = scheds.filter(x => isDayKey(x.from) && isDayKey(x.to)).map(x => ({rotation:x.name, start:x.from, end:x.to}));
  schedIndex = new Map();
  for (const s of scheds) for (const [k, evs] of Object.entries(s.days || {})){ if (!isDayKey(k)) continue; for (const e of arr(evs)){ if (!schedIndex.has(k)) schedIndex.set(k, []); schedIndex.get(k).push({rotation:s.name, date:k, time:str(e.time), title:str(e.title), details:arr(e.details).map(str), kind:e.kind === "teaching" || e.kind === "meeting" ? "teach" : e.kind || "clinical"}); } }
  for (const l of schedIndex.values()) l.sort((a, b) => startMin(a.time) - startMin(b.time));
  sharedProfile = S.profile() || {};
  deadlineIndex = new Map();
  for (const d of arr(S.deadlines ? S.deadlines() : [])){ if (!isDayKey(d.date) || d.monthOnly) continue; if (!deadlineIndex.has(d.date)) deadlineIndex.set(d.date, []); deadlineIndex.get(d.date).push(d); }
}
let deadlineIndex = new Map();
const deadlinesOn = k => deadlineIndex.get(k) || [];
function schedule(){ return state.settings.rotations.map(r => { if (!isDayKey(r.start)) return Object.assign({}, r, {s:null, e:null}); const s = parseDay(r.start); return Object.assign({}, r, {s, e:isDayKey(r.end) ? parseDay(r.end) : addDays(s, r.weeks * 7 - 1)}); }); }
const hasSchedule = () => state.settings.rotations.some(r => isDayKey(r.start));
function rotationOn(k){
  const d = parseDay(k), sch = schedule(), imp = state.imports.find(i => k >= i.start && k <= i.end);
  if (imp){ const r = sch.find(x => x.name === imp.rotation && x.s && d >= x.s && d <= x.e); if (r) return r; }
  return sch.find(r => r.s && d >= r.s && d <= r.e) || null;
}
function currentRotation(){ const r = rotationOn(todayKey()); return r ? r.name : state.settings.current; }
function rotColor(name){ if (CORE_COLOR[name] != null) return CORE_COLOR[name]; const r = state.settings.rotations.find(x => x.name === name); if (r && r.color != null) return r.color; let hh = 0; for (const c of String(name)) hh = (hh * 31 + c.charCodeAt(0)) | 0; return Math.abs(hh) % 8; }
const cc = name => "c" + rotColor(name);
function allRotations(){ const list = [...new Set(state.settings.rotations.map(r => r.name))]; for (const e of state.entries) if (e.rotation && !list.includes(e.rotation)) list.push(e.rotation); return list; }
/* the entries logged on one rotation: by name, and when two rotations share the name, by the dates too */
function entriesFor(r){ const twin = state.settings.rotations.filter(x => x.name === r.name).length > 1; return state.entries.filter(e => e.rotation === r.name && (!twin || !r.s || (entryDay(e) >= dayKey(r.s) && entryDay(e) <= dayKey(r.e)))); }
function buildSchedule(){ toGo("schedule"); } /* dates come from the shared Schedule page */
function buildScheduleUnused(anchor, startKey){
  const rs = state.settings.rotations; const i = rs.findIndex(r => r.name === anchor); if (i < 0 || !isDayKey(startKey)) return;
  rs[i].start = startKey;
  for (let k = i + 1; k < rs.length; k++) rs[k].start = dayKey(addDays(parseDay(rs[k - 1].start), rs[k - 1].weeks * 7));
  for (let k = i - 1; k >= 0; k--) rs[k].start = dayKey(addDays(parseDay(rs[k + 1].start), -rs[k].weeks * 7));
}

/* ---------- storage: private db subtree, browser fallback ---------- */
let db = null, uid = null, unsubE = null, unsubS = null;
const debriefDoc = () => db.doc("data/users/" + uid + "/debrief");
const entriesCol = () => debriefDoc().collection("entries");
const settingsDoc = () => debriefDoc().collection("meta").doc("settings");
const localEntries = () => arr(lsGet(K.entries));
/* entries saved by older versions (or edited elsewhere) may miss fields; read them into today's shape so nothing renders "undefined" */
function normEntry(e){
  if (!e || typeof e !== "object" || !str(e.id)) return null;
  const o = Object.assign({}, e);
  o.text = str(o.text); o.title = str(o.title) || firstWords(o.text); o.rotation = str(o.rotation) || "Clerkship"; o.oneLiner = str(o.oneLiner);
  for (const k of ["did", "learned", "people", "competencies", "epas", "themes", "phiLeft"]) o[k] = arr(o[k]);
  o.feedback = arr(o.feedback).filter(f => f && typeof f === "object").map(f => Object.assign({}, f, {said:str(f.said || f.text || f.quote), from:str(f.from), tone:f.tone === "constructive" ? "constructive" : "positive"})).filter(f => f.said);
  return o;
}
const sortEntries = list => arr(list).map(normEntry).filter(Boolean).sort((a, b) => entryDay(b).localeCompare(entryDay(a)) || (b.createdAt || "").localeCompare(a.createdAt || ""));
async function initStore(){
  let dbNs = null, userNs = null;
  if (window.claude && typeof window.claude.use === "function"){
    try { [dbNs, userNs] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); } catch {}
  }
  let id = null;
  if (dbNs && userNs){ try { id = await userNs.id(); } catch {} }
  if (dbNs && id){
    db = dbNs; uid = id; state.mode = "account";
    unsubE = entriesCol().orderBy("createdAt", "desc").limit(20000).onSnapshot(snap => {
      state.entries = sortEntries(withOutbox(snap.docs.map(d => Object.assign(clone(d.data() || {}), {id:d.id}))));
      state.loaded = true; state.offline = false; renderAll(true); flushOutbox();
    }, (err) => {
      if (err && (err.code === "unavailable" || err.code === "session_expired")){ state.loaded = true; state.entries = sortEntries(withOutbox(state.entries)); state.offline = true; renderAll(); return; } /* the page-wide notice says so; the journal says what it means for the list */
      toBrowserMode("Lost the connection to your account. Showing entries saved in this browser.");
    });
    unsubM = mspeDoc().onSnapshot(s => { if (s.exists && !mspeDirty){ state.mspe = normMspe(s.data()); if (state.view === "mspe") renderMspe(true); else if (state.view === "vault") renderVault(); } }, () => {});
    unsubS = settingsDoc().onSnapshot(s => { if (s.exists){ state.settings = normSettings(s.data()); syncShared(); renderAll(true); } }, () => {});
  } else toBrowserMode();
}
function toBrowserMode(msg){
  if (unsubE){ try { unsubE(); } catch {} unsubE = null; }
  if (unsubS){ try { unsubS(); } catch {} unsubS = null; }
  if (unsubI){ try { unsubI(); } catch {} unsubI = null; }
  if (unsubM){ try { unsubM(); } catch {} unsubM = null; }
  state.mspe = normMspe(lsGet(K_MSPE));
  db = null; state.mode = "browser"; state.entries = sortEntries(localEntries()); state.loaded = true; state.settings = normSettings(lsGet(K.settings)); syncShared();
  if (msg) toast(msg);
  renderAll();
}
function localUpsert(e){ const list = localEntries().filter(x => x.id !== e.id); list.push(e); lsSet(K.entries, sortEntries(list)); if (state.mode !== "account") state.entries = sortEntries(localEntries()); }
/* entries that couldn't reach the account (offline, server down, sign-in expired) wait here, on this device, and are sent
   when the connection or the sign-in comes back. They show in the journal meanwhile. */
const K_OUTBOX = "perl.v1.debrief.outbox";
const outbox = () => arr(lsGet(K_OUTBOX));
function toOutbox(body){ lsSet(K_OUTBOX, outbox().filter(x => x.id !== body.id).concat([body])); state.entries = sortEntries(state.entries.filter(x => x.id !== body.id).concat([body])); renderAll(); }
const withOutbox = list => { const ids = new Set(list.map(x => x.id)); return list.concat(outbox().filter(x => !ids.has(x.id))); };
let flushingOutbox = false;
async function flushOutbox(){
  if (flushingOutbox || state.mode !== "account" || !db || !outbox().length) return;
  flushingOutbox = true; let sent = 0;
  try { for (const body of outbox()){ try { await entriesCol().doc(body.id).set(body); lsSet(K_OUTBOX, outbox().filter(x => x.id !== body.id)); sent++; } catch { break; } } }
  finally { flushingOutbox = false; }
  if (sent) toast(sent === 1 ? "Your saved-offline entry is now in your account." : sent + " saved-offline entries are now in your account.");
}
window.addEventListener("online", () => flushOutbox());
document.addEventListener("perl:reauthed", () => flushOutbox());
setInterval(() => { if (outbox().length) flushOutbox(); }, 30000);
async function putEntry(e){
  const body = clone(e); delete body.phiOk;
  if (state.mode === "account" && db){
    for (let attempt = 0; attempt < 2; attempt++){
      try { await entriesCol().doc(body.id).set(body); lsSet(K_OUTBOX, outbox().filter(x => x.id !== body.id)); return true; }
      catch (err){
        const c = err && err.code;
        if (c === "unavailable" && attempt === 0){ await sleep(400 + Math.random() * 600); continue; }
        if (c === "quota_exceeded"){ toast("Your journal storage is full. Delete a few entries, then save again."); return false; }
        if (c === "session_expired"){ toOutbox(body); toast("Your sign-in expired, so this entry is saved on this device. It goes to your account when you sign in again."); return true; }
        if (c === "invalid_argument" || c === "revoked" || c === "not_granted"){ localUpsert(body); toBrowserMode("This view can't write to your account, so the entry was saved in this browser."); return true; }
        toOutbox(body); toast("You're offline, so this entry is saved on this device. It goes to your account when you're back online."); return true;
      }
    }
  }
  localUpsert(body); renderAll(); return true;
}
async function removeEntry(id){
  if (state.mode === "account" && db){ try { await entriesCol().doc(id).delete(); return true; } catch { toast("Couldn't delete. Try again."); return false; } }
  lsSet(K.entries, localEntries().filter(x => x.id !== id)); state.entries = sortEntries(localEntries()); renderAll(); return true;
}
let settingsTimer = null, settingsChain = Promise.resolve();
/* settings are written to this browser at once and to the account after 450 ms; a pending write is flushed when the page hides */
function flushSettings(){ if (settingsTimer){ clearTimeout(settingsTimer); settingsTimer = null; writeSettings(); } }
window.addEventListener("pagehide", flushSettings);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSettings(); });
function commitSettings(){
  renderAll();
  clearTimeout(settingsTimer);
  { const snap0 = clone(state.settings); delete snap0.rotations; delete snap0.appearance; lsSet(K.settings, snap0); }
  settingsTimer = setTimeout(() => { settingsTimer = null; writeSettings(); }, 450);
}
function writeSettings(){ {
    const snap = clone(state.settings); delete snap.rotations; delete snap.appearance; lsSet(K.settings, snap);
    if (state.mode === "account" && db) settingsChain = settingsChain.then(() => settingsDoc().set(snap)).catch(err => {
      const c = err && err.code;
      if (c === "invalid_argument" || c === "revoked" || c === "not_granted") toBrowserMode("Your access to this page is view-only, so your changes are kept in this browser.");
      else toast("Couldn't save your toolkit changes.");
    });
  }
}

/* ---------- Claude (sample) + downloads ---------- */
let samplePromise = null, dlPromise = null;
const getSample = () => samplePromise || (samplePromise = (window.claude && window.claude.use) ? window.claude.use("sample").catch(() => null) : Promise.resolve(null));
const getDownloads = () => dlPromise || (dlPromise = (window.claude && window.claude.use) ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null));
const AI_OFF = new Set(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"]);
function aiError(e){
  const c = e && e.code;
  if (c === "cancelled") return null;
  if (AI_OFF.has(c)){ state.ai = false; renderAll(); return "Claude is off for this page. You can still review and save notes yourself."; }
  if (c === "rate_limited") return "Too many requests right now. Try again in a minute.";
  if (c === "timeout") return "Claude took too long. Try again, or review it yourself.";
  if (c === "session_expired") return window.PERL_ACCOUNT ? "Your sign-in expired. Sign in again, then retry. Your text is kept." : "Sign in to Claude again, then retry.";
  if (c === "bad_reply") return "Claude's reply came back broken. Try again, or review it yourself.";
  if (c === "refused") return "Claude wouldn't process this text. Edit it and try again, or review it yourself.";
  if (c === "prompt_too_large") return "This is too long for one pass. Split it into two entries.";
  if (c === "invalid_json") return "The cleanup came back garbled. Try again.";
  return "Couldn't reach Claude. Try again.";
}
async function needSample(){ const s = await getSample(); if (!s){ state.ai = false; renderAll(); toast("Claude isn't available in this view. Use Review myself."); return null; } state.ai = true; return s; }

/* ---------- dictionary + snippets ---------- */
function applyDict(text){ for (const d of state.settings.dictionary){ if (!d.heard || !d.word) continue; text = text.replace(new RegExp("(^|[^\\w])" + escRe(d.heard) + "(?=$|[^\\w])", "gi"), (m, p) => p + d.word); } return text; }
function applySnippets(text){ for (const s of state.settings.snippets){ if (!s.trigger) continue; text = text.replace(new RegExp("(^|[^\\w])(?:insert\\s+)?" + escRe(s.trigger) + "(?=$|[^\\w])[.!]?", "gi"), (m, p) => p + (p && p !== "\n" ? "\n" : "") + s.text + "\n"); } return text; }
function quickClean(text){
  return text.replace(/\b(?:um+|uh+|erm+|uhm+|hmm+)\b[,.]?\s*/gi, "").replace(/,?\s*\byou know\b,?/gi, "").replace(/[ \t]{2,}/g, " ").replace(/ +([,.;:!?])/g, "$1").replace(/(^|[.!?]\s+|\n)([a-z])/g, (m, p, c) => p + c.toUpperCase()).trim();
}

/* ---------- overlays ---------- */
const openStack = [];
let lastFocus = null, lastFocusKey = null;
function showOverlay(id){
  const el = document.getElementById(id); if (!el.hidden) return;
  if (!openStack.length){ lastFocus = document.activeElement; lastFocusKey = focusKey(lastFocus) || (lastFocus && lastFocus.closest && lastFocus.closest("#side, #sheet, #subnav, #view") ? {id:lastFocus.id, tag:lastFocus.tagName, cls:lastFocus.className, label:lastFocus.getAttribute("aria-label") || "", text:(lastFocus.textContent || "").trim().slice(0, 60)} : null); }
  el.hidden = false; openStack.push(id); document.body.classList.add("locked");
}
function closeOverlay(id){
  const el = document.getElementById(id); if (el.hidden) return;
  el.hidden = true; const i = openStack.indexOf(id); if (i >= 0) openStack.splice(i, 1);
  if (id === "entry"){ state.drawer = {id:null, edit:null, confirmDel:false}; drawerEditor = null; }
  if (id === "composer" && state.compose.step === "done") state.compose.step = "write";
  if (id === "importer") state.imp = null;
  if (!openStack.length){ document.body.classList.remove("locked"); if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus(); else refocusKey(lastFocusKey); }
}
document.addEventListener("click", e => {
  const c = e.target.closest("[data-close]"); if (c) { closeOverlay(c.dataset.close); return; }
  const a = e.target.closest("[data-act]"); if (a){ if (a.dataset.act === "new") openComposer(a.dataset.rotation ? {date:a.dataset.date, rotation:a.dataset.rotation} : {}); else if (a.dataset.act === "find") openPalette(); return; }
  const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
});

/* ---------- composer ---------- */
const pad = $("#pad");
let lastLen = 0, draftTimer = null, phiTimer = null, composeEditor = null, cleanupCtl = null;
const composeRotation = () => state.compose.rotation || (rotationOn(state.compose.date || todayKey()) || {}).name || state.settings.current;
function saveDraft(){ lsSet(K.draft, {text:pad.value, energy:state.energy, date:state.compose.date, rotation:state.compose.rotation}); }
function autogrow(){ const min = window.matchMedia("(max-width:640px)").matches ? 200 : 256; pad.style.height = "auto"; pad.style.height = Math.max(min, pad.scrollHeight) + "px"; }
function onPadInput(){
  const added = pad.value.length - lastLen; lastLen = pad.value.length;
  if (added > 0) ecgPulse(added);
  autogrow();
  const n = wordsIn(pad.value); $("#wc").textContent = n + (n === 1 ? " word" : " words");
  clearTimeout(draftTimer); draftTimer = setTimeout(() => { saveDraft(); if (state.view === "today") renderToday(true); }, 500);
  clearTimeout(phiTimer); phiTimer = setTimeout(renderPhi, 350);
}
pad.addEventListener("input", onPadInput);
pad.addEventListener("blur", () => { const v = applySnippets(pad.value); if (v !== pad.value){ pad.value = v; onPadInput(); } });
function setPad(v){ pad.value = v; lastLen = v.length; onPadInput(); }
function insertAtCursor(text){
  const s = pad.selectionStart ?? pad.value.length, e = pad.selectionEnd ?? s;
  const before = pad.value.slice(0, s), after = pad.value.slice(e);
  const ins = (before && !before.endsWith("\n") ? "\n" : "") + text;
  pad.value = before + ins + after; const pos = (before + ins).length;
  pad.focus(); pad.setSelectionRange(pos, pos); onPadInput();
}
function platformHint(){
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return ["Tap the ", "mic on your keyboard", " and talk."];
  if (/Android/.test(ua)) return ["Tap the ", "mic on your keyboard", " and talk."];
  if (/Mac/.test(ua)) return ["Press your ", "dictation key (or Fn twice)", " and talk."];
  if (/Win/.test(ua)) return ["Press ", "Windows + H", " and talk."];
  return ["Use your device's ", "dictation", " and talk."];
}
function renderHint(open){ const [a, b, c] = platformHint(); const el = $("#hint"); el.textContent = ""; el.append(a, h("b", {text:b}), c); if (open) el.append(" Have Wispr Flow? Hold your Flow key here."); }
$("#dictateBtn").addEventListener("click", () => { renderHint(true); pad.focus(); const n = pad.value.length; pad.setSelectionRange(n, n); });
$("#clearBtn").addEventListener("click", () => { if (!pad.value) return; const old = pad.value; setPad(""); saveDraft(); toast("Draft cleared", {label:"Undo", fn:() => { setPad(old); saveDraft(); }}); });

function openComposer(opts = {}){
  closeOverlay("palette"); closeOverlay("entry");
  if (opts.date){ state.compose.date = opts.date; state.compose.rotation = null; }
  else if (!pad.value.trim() && !state.compose.review){ state.compose.date = todayKey(); state.compose.rotation = null; }
  if (!state.compose.date) state.compose.date = todayKey();
  /* a prompt elsewhere (the FMCC clinic-night card) can name the setting; the student can still change it in the composer */
  if (opts.rotation && typeof opts.rotation === "string" && !state.compose.review) state.compose.rotation = opts.rotation.slice(0, 60);
  state.compose.step = state.compose.review ? "review" : "write";
  showOverlay("composer");
  renderComposer();
  if (opts.insert && state.compose.step === "write") insertAtCursor(opts.insert);
  requestAnimationFrame(() => { autogrow(); ecgSize(); if (state.compose.step === "write" && !opts.insert){ pad.focus(); const n = pad.value.length; pad.setSelectionRange(n, n); } });
}
function renderComposer(){
  const done = state.compose.step === "done";
  const review = !done && state.compose.step === "review" && state.compose.review;
  $("#composeTitle").textContent = done ? "Saved" : review ? (state.compose.review.aiTagged ? "Review what Claude pulled out" : "Review and tag") : "New debrief";
  $("#composeWrite").hidden = !!review || done; $("#composeReview").hidden = !review; $("#composeDone").hidden = !done; $("#composeMeta").hidden = done;
  renderComposeMeta(); renderStarters(); renderEnergy(); renderPhi(); renderComposeFoot();
  /* a step change replaces the control that was just used; keep the reader inside the sheet */
  if (!$("#composer").hidden && (document.activeElement === document.body || !document.contains(document.activeElement))) $("#composeTitle").focus();
  if (done) renderDone();
  if (review){ const box = $("#composeReview"); box.textContent = ""; composeEditor = editorEl(state.compose.review); box.append(composeEditor.el); box.scrollTop = 0; }
  else composeEditor = null;
}
function renderComposeMeta(){
  const m = $("#composeMeta"); if (typingIn(m)) return; m.textContent = "";
  const d = state.compose.review ? state.compose.review.date : state.compose.date || todayKey();
  const rot = state.compose.review ? state.compose.review.rotation : composeRotation();
  const dateIn = h("input", {type:"date", value:d, max:todayKey(), "aria-label":"Shift date", onchange:e => {
    if (!isDayKey(e.target.value)) return;
    if (state.compose.review){ state.compose.review.date = e.target.value; }
    else { state.compose.date = e.target.value; state.compose.rotation = null; saveDraft(); }
    renderComposeMeta(); renderStarters();
  }});
  const dateLbl = h("label", {class:"metapill", title:"Change the shift date", onclick:() => { try { dateIn.showPicker && dateIn.showPicker(); } catch {} }}, icon("calendar", "sm"), h("span", {text:relDay(d)}), dateIn);
  const sel = h("select", {"aria-label":"Rotation", onchange:e => {
    if (state.compose.review) state.compose.review.rotation = e.target.value; else { state.compose.rotation = e.target.value; saveDraft(); }
    renderComposeMeta();
  }}, allRotations().map(r => h("option", {value:r, text:r})));
  sel.value = rot;
  const rotLbl = h("label", {class:"metapill " + cc(rot)}, h("span", {class:"dot"}), h("span", {text:rot}), icon("chevD", "sm"), sel);
  m.append(dateLbl, rotLbl);
}
function renderStarters(){
  const s = $("#starters"); s.textContent = "";
  for (const e of schedOn(state.compose.date || todayKey()).filter(x => x.kind === "clinical" || x.kind === "call").slice(0, 3)){
    const doc = docOf(e), ins = (e.kind === "call" ? "On " + e.title.toLowerCase() : "At " + e.title) + (doc ? " with " + doc : "") + ": ";
    s.append(h("button", {type:"button", class:"chip", title:"From your schedule", onclick:() => insertAtCursor(ins)}, icon("calendar", "sm"), e.title + (doc ? " · " + doc : "")));
  }
  for (const [lab, t] of STARTERS) s.append(h("button", {type:"button", class:"chip", text:lab, onclick:() => insertAtCursor(t)}));
  for (const sn of state.settings.snippets) s.append(h("button", {type:"button", class:"chip", title:"Or say “" + sn.trigger + "” while dictating", onclick:() => insertAtCursor(sn.text)}, icon("book", "sm"), sn.trigger));
}
function renderPhi(pulse){
  const box = $("#phi"); box.textContent = ""; box.className = "";
  const text = pad.value.trim(); if (!text) return;
  const hits = scanPHI(text);
  if (!hits.length){ box.className = "phi ok"; box.append(icon("shield", "sm"), "No identifiers spotted. Nothing leaves your device until you clean up."); return; }
  if (sigOf(hits) === state.phiAckSig){ box.className = "phi ok"; box.append(icon("shield", "sm"), "You marked the flagged items as not identifiers."); return; }
  box.className = "phi" + (pulse ? " pulse" : "");
  box.append(
    h("p", null, h("strong", {text:hits.length === 1 ? "1 possible identifier. " : hits.length + " possible identifiers. "}), "Still on your device. Replace them before Claude sees this note."),
    h("div", {class:"flags"}, hits.map(x => h("mark", null, x.match, h("small", {text:x.label})))),
    h("div", {class:"acts"},
      h("button", {type:"button", class:"btn sm primary", text:"Replace with placeholders", onclick:() => { setPad(scrubPHI(pad.value)); saveDraft(); toast("Replaced " + hits.length + (hits.length === 1 ? " item" : " items")); }}),
      h("button", {type:"button", class:"btn sm", text:"They're not identifiers", onclick:() => { state.phiAckSig = sigOf(hits); renderPhi(); }})));
}
const ENERGY = ["", "Drained", "Tired", "Steady", "Engaged", "Locked in"];
function energySlider(get, set, id){
  const box = h("div", {class:"slider"}), rd = h("span", {class:"rd", "aria-hidden":"true"});
  const input = h("input", {type:"range", class:"range", id, min:"1", max:"5", step:"1", value:String(get() || 3), "aria-label":"How locked in were you, 1 drained to 5 locked in"});
  const ticks = h("div", {class:"ticks", "aria-hidden":"true"}, [1,2,3,4,5].map(n => h("span", {text:String(n)})));
  const clear = h("button", {type:"button", class:"linkbtn", text:"Clear", onclick:() => { set(null); draw(); }});
  let last = get();
  function draw(){
    const v = get(); box.classList.toggle("unset", !v); input.value = String(v || 3);
    input.style.setProperty("--p", ((Number(input.value) - 1) / 4 * 100) + "%");
    input.setAttribute("aria-valuetext", v ? v + " of 5, " + ENERGY[v] : "Not rated");
    rd.textContent = v ? v + " · " + ENERGY[v] : "Slide to rate"; clear.hidden = !v;
    [...ticks.children].forEach((t, i) => t.classList.toggle("on", v === i + 1));
  }
  input.addEventListener("input", () => {
    const v = Number(input.value); set(v); draw();
    if (v !== last){ last = v; if (!reduced){ rd.classList.remove("tick"); void rd.offsetWidth; rd.classList.add("tick"); } try { navigator.vibrate && navigator.vibrate(6); } catch {} }
  });
  input.addEventListener("pointerdown", () => { if (!get()){ set(Number(input.value)); draw(); } });
  box.append(h("div", {class:"slider-h"}, h("label", {class:"sq", for:id, text:"How locked in were you?"}), h("span", {style:"display:flex;gap:10px;align-items:baseline"}, rd, clear)), input, ticks, h("div", {class:"ends"}, h("span", {text:"Drained"}), h("span", {text:"Locked in"})));
  draw(); return box;
}
function renderEnergy(){
  const box = $("#energyBox"); if (typingIn(box)) return; box.textContent = "";
  box.append(energySlider(() => state.energy, v => { state.energy = v; saveDraft(); }, "energyRange"));
}
function holdButton(label, onDone, before){
  const b = h("button", {type:"button", class:"hold", "aria-label":label}, h("span", {class:"fill"}), icon("check", "sm"), h("span", {text:label}));
  let timer = null, busy = false;
  const finish = async () => { clearTimeout(timer); if (busy) return; busy = true; b.classList.remove("on"); b.classList.add("done"); const ok = await onDone(); if (ok === false){ busy = false; b.classList.remove("done"); } };
  const start = e => { if (busy || b.classList.contains("on")) return; if (e && e.cancelable) e.preventDefault(); if (before && !before()) return; if (reduced){ finish(); return; } b.classList.add("on"); timer = setTimeout(finish, 650); };
  const stop = () => { if (busy) return; clearTimeout(timer); b.classList.remove("on"); };
  b.addEventListener("pointerdown", start); b.addEventListener("pointerup", stop); b.addEventListener("pointerleave", stop); b.addEventListener("pointercancel", stop);
  /* pointer users press and hold; a key press, or a click synthesised by assistive technology (no pointer), confirms at once */
  let pointerHeld = false;
  b.addEventListener("pointerdown", () => { pointerHeld = true; }); b.addEventListener("pointerup", () => { setTimeout(() => { pointerHeld = false; }, 50); });
  b.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat){ e.preventDefault(); if (before && !before()) return; finish(); } });
  b.addEventListener("click", e => { e.preventDefault(); if (!pointerHeld && e.detail === 0 && !busy){ if (before && !before()) return; finish(); } });
  return b;
}
const storeNote = () => state.mode === "account" ? "Saves privately to your account" : state.mode === "browser" ? "Saves in this browser only" : "Connecting…";
function renderComposeFoot(){
  const f = $("#composeFoot"); f.textContent = "";
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
  if (state.compose.step === "done"){
    const id = state.compose.savedId;
    f.append(h("span", {class:"grow"}), h("button", {type:"button", class:"btn", text:"Open entry", onclick:() => { closeOverlay("composer"); openEntry(id); }}), h("button", {type:"button", class:"btn primary", id:"doneBtn", text:"Done", onclick:() => closeOverlay("composer")}));
    return;
  }
  if (state.compose.step === "review" && state.compose.review){
    f.append(h("button", {type:"button", class:"btn ghost", onclick:() => { state.compose.step = "write"; renderComposer(); }}, icon("arrowL", "sm"), "Back to draft"),
      h("span", {class:"grow"}),
      h("button", {type:"button", class:"btn ghost", text:"Discard", onclick:() => { state.compose.review = null; state.compose.step = "write"; renderComposer(); }}),
      h("span", {class:"holdhint", "aria-hidden":"true", text:reduced ? "" : "Press and hold"}),
      holdButton("Save entry", () => saveReview(true), () => !!(composeEditor && composeEditor.check())));
    return;
  }
  f.append(h("span", {class:"grow"}, h("span", {class:"status" + (state.mode === "browser" ? " local" : "")}, h("i"), storeNote())));
  if (state.busy === "cleanup"){
    f.append(h("button", {type:"button", class:"btn ghost", text:"Stop", onclick:() => cleanupCtl && cleanupCtl.abort()}),
      h("button", {type:"button", class:"btn primary", disabled:true}, h("span", {class:"spin", "aria-hidden":"true"}), "Cleaning up…"));
    return;
  }
  /* on a busy night: keep the words now, tag them later from the entry (Clean up with Claude works there too) */
  f.append(h("button", {type:"button", class:"btn ghost", text:"Save as is", title:"Save the note now without reviewing or tagging", onclick:saveAsIs}));
  f.append(h("button", {type:"button", class:"btn" + (state.ai === false ? " primary" : ""), text:"Review myself", onclick:reviewManually}));
  if (state.ai !== false) f.append(h("button", {type:"button", class:"btn primary", onclick:runCleanup}, icon("spark", "sm"), "Clean up with Claude", h("kbd", {text:mod + "↵"})));
}
function prepText(){
  const raw = pad.value.trim();
  if (!raw){ toast("Dictate or type something first."); pad.focus(); return null; }
  const pre = applyDict(applySnippets(raw)); if (pre !== raw) setPad(pre);
  const hits = scanPHI(pre);
  if (hits.length && sigOf(hits) !== state.phiAckSig){ renderPhi(true); $("#phi").scrollIntoView({behavior:"smooth", block:"center"}); return null; }
  return pre;
}
function cleanupPrompt(text){
  const s = state.settings; const docs = schedOn(state.compose.date || todayKey()).flatMap(e => e.details.join(" ").match(/Dr\.?\s+[A-Z][A-Za-z'-]+/g) || []);
  const vocab = [...new Set([...s.dictionary.map(d => d.word), ...docs])].join(", ");
  return ["You are the cleanup engine in a voice journal for a medical student on clinical rotations. The student dictated the note below; a local filter has already replaced obvious identifiers with tokens like [NAME] or [DATE].", "",
    "Do three things, then reply with ONLY one JSON object.",
    "1. CLEAN it the way a good dictation app would: remove filler words, apply spoken self-corrections (\"Tuesday, no, Wednesday\" becomes \"Wednesday\"), fix punctuation and paragraph breaks, put spoken lists on separate lines, and use the spellings in the vocabulary list. Style: " + STYLES[s.style].instr + ". Keep the first-person voice. Never add facts, outcomes, or feelings the student did not state.",
    "2. DE-IDENTIFY anything that could still point to a patient: names, initials, exact dates, places, room numbers, or rare details tied to one person. Use generic phrases (\"the patient\", \"her mother\", \"earlier this week\"). Clinicians on the team may stay named.",
    "3. TAG it for a residency application.", "",
    "Vocabulary: " + (vocab || "none"), "Rotation: " + composeRotation(), "",
    "JSON shape:",
    "{\"title\": string (at most 8 words, no patient identifiers),",
    " \"text\": string (the cleaned, de-identified note),",
    " \"one_liner\": string (de-identified case one-liner such as \"Toddler with first febrile seizure\", or \"\"),",
    " \"did\": string[] (what the student personally did, short phrases),",
    " \"learned\": string[] (teaching points),",
    " \"feedback\": [{\"from\": string (name and role as stated), \"said\": string, \"tone\": \"positive\" | \"constructive\"}],",
    " \"people\": [{\"name\": string, \"role\": \"attending\" | \"resident\" | \"fellow\" | \"nurse\" | \"other\"}] (care team only, never patients or family),",
    " \"competencies\": subset of [\"PC\",\"MK\",\"PBLI\",\"ICS\",\"PROF\",\"SBP\"] (ACGME),",
    " \"epas\": subset of integers 1-13 (AAMC Core EPAs),",
    " \"themes\": subset of " + JSON.stringify(THEME_KEYS) + ",",
    " \"story\": {\"situation\": string, \"task\": string, \"action\": string, \"result\": string, \"reflection\": string} or null if this is not a story,",
    " \"strength\": 0-3 (how usable as an interview story: 0 none, 1 thin, 2 solid, 3 standout),",
    " \"phi_left\": string[] (anything you were unsure could identify a patient),",
    " \"energy\": integer 1-5 or null (only if the student said how engaged or drained they felt)}", "",
    "Dictation:", "<<<", text, ">>>"].join("\n");
}
function baseEntry(text){
  return {id:newId(), createdAt:new Date().toISOString(), date:state.compose.date || todayKey(), rotation:composeRotation(), title:firstWords(text), text, oneLiner:"", did:[], learned:[], feedback:[], people:[], competencies:[], epas:[], themes:[], story:null, strength:1, energy:state.energy, phiLeft:[], aiTagged:false};
}
function entryFromAI(out, text){
  const o = out && typeof out === "object" ? out : {}; const e = baseEntry(text);
  const st = o.story && typeof o.story === "object" ? o.story : null;
  const story = st && ["situation","task","action","result","reflection"].some(k => str(st[k])) ? {situation:str(st.situation), task:str(st.task), action:str(st.action), result:str(st.result), reflection:str(st.reflection)} : null;
  const en = Number.parseInt(o.energy, 10);
  return Object.assign(e, {
    title:str(o.title) || e.title, text:str(o.text) || text, oneLiner:str(o.one_liner),
    did:arr(o.did).map(str).filter(Boolean).slice(0, 8), learned:arr(o.learned).map(str).filter(Boolean).slice(0, 8),
    feedback:arr(o.feedback).filter(f => f && str(f.said)).map(f => ({from:str(f.from), said:str(f.said), tone:f.tone === "constructive" ? "constructive" : "positive"})).slice(0, 6),
    people:arr(o.people).filter(p => p && str(p.name)).map(p => ({name:str(p.name), role:ROLES.includes(p.role) ? p.role : "other"})).slice(0, 8),
    competencies:[...new Set(arr(o.competencies).filter(c => COMP_KEYS.includes(c)))],
    epas:[...new Set(arr(o.epas).map(Number).filter(n => n >= 1 && n <= 13))].sort((a, b) => a - b),
    themes:[...new Set(arr(o.themes).filter(t => THEMES[t]))],
    story, strength:clamp(Number.parseInt(o.strength, 10) || 0, 0, 3),
    energy:state.energy ?? (en >= 1 && en <= 5 ? en : null),
    phiLeft:arr(o.phi_left).map(str).filter(Boolean).slice(0, 6), aiTagged:true,
  });
}
async function runCleanup(){
  const text = prepText(); if (!text) return;
  const sample = await needSample(); if (!sample) return;
  cleanupCtl = new AbortController(); state.busy = "cleanup"; renderComposeFoot();
  try {
    const out = await sample.json(cleanupPrompt(text), {modelTier:"quick", signal:cleanupCtl.signal, cache:false});
    state.compose.review = entryFromAI(out, text); state.compose.step = "review";
  } catch (e){ const m = aiError(e); if (m) toast(m); }
  finally { state.busy = null; renderComposer(); }
}
async function saveAsIs(){
  const text = prepText(); if (!text) return;
  const d = Object.assign(baseEntry(quickClean(text)), {quick:true}); d.words = wordsIn(d.text);
  const ok = await putEntry(d); if (!ok) return;
  state.energy = null; state.phiAckSig = ""; state.compose.rotation = null; state.compose.date = todayKey();
  state.compose.step = "done"; state.compose.savedId = d.id; fresh.add(d.id);
  setPad(""); saveDraft(); renderComposer(); renderAll();
  requestAnimationFrame(() => { const b = $("#doneBtn"); if (b) b.focus(); });
}
function reviewManually(){ const text = prepText(); if (!text) return; state.compose.review = baseEntry(quickClean(text)); state.compose.step = "review"; renderComposer(); $("#composeTitle").focus(); }
async function saveReview(checked){
  if (!composeEditor || (!checked && !composeEditor.check())) return false;
  const d = state.compose.review; const ok = await putEntry(d); if (!ok) return false;
  state.compose.review = null; state.energy = null; state.phiAckSig = ""; state.compose.rotation = null; state.compose.date = todayKey();
  state.compose.step = "done"; state.compose.savedId = d.id; fresh.add(d.id);
  setPad(""); saveDraft(); renderComposer(); renderAll();
  requestAnimationFrame(() => { const b = $("#doneBtn"); if (b) b.focus(); });
  return true;
}
const fresh = new Set();
function renderDone(){
  const box = $("#composeDone"); box.textContent = "";
  const e = state.entries.find(x => x.id === state.compose.savedId); const rot = e ? e.rotation : currentRotation();
  const days = new Set(state.entries.filter(x => x.rotation === rot).map(entryDay)).size;
  box.append(h("div", {class:"donev"}, h("span", {class:"done-ck"}, icon("check")), h("h3", {class:"done-t", text:"Logged."}), h("p", {class:"done-l", text:"Two minutes today keeps September easy."}),
    h("p", {class:"done-m"}, h("b", {text:String(days)}), (days === 1 ? " day" : " days") + " logged on " + rot + " · ", h("b", {text:coveredPrompts() + "/" + PROMPTS.length}), " interview questions covered")));
}

/* ECG strip: beats as words arrive */
const ecgCv = $("#ecg"), ecgCtx = ecgCv.getContext("2d");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ecg = {beats:[], raf:0, last:0, idleAt:0, colors:null};
function ecgColors(){ const cs = getComputedStyle(document.getElementById("composer") || document.documentElement); return {line:cs.getPropertyValue("--border-2").trim() || "#ccc", beat:cs.getPropertyValue("--accent").trim() || "#36c"}; }
function ecgSize(){ const dpr = window.devicePixelRatio || 1, w = ecgCv.clientWidth, hh = ecgCv.clientHeight; if (!w) return; ecgCv.width = Math.round(w * dpr); ecgCv.height = Math.round(hh * dpr); ecgCtx.setTransform(dpr, 0, 0, dpr, 0, 0); ecg.colors = ecgColors(); ecgDraw(); }
const BEAT = [[-14,0],[-10,-.12],[-6,0],[-3,0],[-1,.28],[1,-1],[3,.5],[5,0],[10,0],[14,-.22],[18,0]];
function ecgDraw(){
  const w = ecgCv.clientWidth, hh = ecgCv.clientHeight, mid = hh / 2 + 3; if (!w) return;
  const c = ecg.colors || ecgColors(); ecgCtx.clearRect(0, 0, w, hh);
  ecgCtx.lineWidth = 1.2; ecgCtx.strokeStyle = c.line; ecgCtx.beginPath(); ecgCtx.moveTo(0, mid); ecgCtx.lineTo(w, mid); ecgCtx.stroke();
  ecgCtx.lineWidth = 1.6; ecgCtx.strokeStyle = c.beat; ecgCtx.lineJoin = "round";
  for (const b of ecg.beats){ ecgCtx.globalAlpha = clamp(b.x / (w * .35), 0, 1); ecgCtx.beginPath(); BEAT.forEach(([dx, dy], i) => { const x = b.x + dx, y = mid + dy * b.a * (hh / 2 - 2); i ? ecgCtx.lineTo(x, y) : ecgCtx.moveTo(x, y); }); ecgCtx.stroke(); }
  ecgCtx.globalAlpha = 1;
}
function ecgTick(t){
  const dt = ecg.last ? Math.min(64, t - ecg.last) : 16; ecg.last = t;
  for (const b of ecg.beats) b.x -= dt * .07; ecg.beats = ecg.beats.filter(b => b.x > -24); ecgDraw();
  if (ecg.beats.length || t < ecg.idleAt) ecg.raf = requestAnimationFrame(ecgTick); else { ecg.raf = 0; ecg.last = 0; }
}
function ecgPulse(n){
  if (reduced || document.hidden) return; const w = ecgCv.clientWidth; if (!w) return;
  const lb = ecg.beats[ecg.beats.length - 1];
  if (lb && lb.x > w - 26) lb.a = Math.min(1, lb.a + n / 30); else ecg.beats.push({x:w + 14, a:clamp(.35 + n / 18, .35, 1)});
  ecg.idleAt = performance.now() + 2000; if (!ecg.raf){ ecg.colors = ecgColors(); ecg.raf = requestAnimationFrame(ecgTick); }
}
window.addEventListener("resize", () => { if (!$("#composer").hidden) ecgSize(); });
const themeChanged = () => { ecg.colors = ecgColors(); ecgDraw(); };
try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeChanged); } catch {}
new MutationObserver(() => { themeChanged(); renderThemeControls(); }).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme","data-appearance"]});
function themeSeg(){ return null; }
function themeSegUnused(){
  return h("div", {class:"themeseg", role:"group", "aria-label":"Appearance"}, [["light","today"],["dark","moon"],["system","monitor"]].map(([v, ic]) => h("button", {type:"button", "aria-pressed":String(appearance === v), "aria-label":APPEAR_LABEL[v], title:APPEAR_LABEL[v], onclick:() => setAppearance(v)}, icon(ic))));
}
function renderThemeControls(){
  const b = null; if (!b) return; const dark = isDarkNow();
  b.textContent = ""; b.append(icon(dark ? "today" : "moon")); b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

/* ---------- entry editor ---------- */
function editorEl(d){
  const wrap = h("div", {class:"ed"});
  const toggles = (list, keys, label) => h("div", {class:"chips"}, keys.map(k => { const b = h("button", {type:"button", class:"chip", "aria-pressed":String(list.includes(k)), text:label(k), onclick:() => { const i = list.indexOf(k); if (i >= 0) list.splice(i, 1); else list.push(k); b.setAttribute("aria-pressed", String(list.includes(k))); }}); return b; }));
  const segOf = (labels, get, set, wide) => { const s = h("span", {class:"seg", role:"group"}); const draw = () => { s.textContent = ""; labels.forEach((lab, i) => s.append(h("button", {type:"button", "aria-pressed":String(get() === i + (wide ? 0 : 1)), text:lab, onclick:() => { const v = i + (wide ? 0 : 1); set(get() === v && !wide ? null : v); draw(); }}))); }; draw(); return s; };
  const phiBox = h("div");
  const titleIn = h("input", {class:"input title", id:"ed-title-" + d.id, value:d.title, oninput:e => { d.title = e.target.value; drawPhi(); }});
  const ta = h("textarea", {class:"ta", id:"ed-text-" + d.id, value:d.text, oninput:e => { d.text = e.target.value; grow(); drawPhi(); }});
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(150, ta.scrollHeight + 2) + "px"; };
  const oneIn = h("input", {class:"input", id:"ed-one-" + d.id, value:d.oneLiner, placeholder:"e.g. Toddler with first febrile seizure", oninput:e => { d.oneLiner = e.target.value; drawPhi(); }});
  function drawPhi(){
    phiBox.textContent = "";
    const hits = scanPHI([d.title, d.oneLiner, d.text].join("\n")); const left = d.phiLeft || [];
    if (!hits.length && !left.length) return;
    if (d.phiOk){ phiBox.append(h("div", {class:"phi ok"}, icon("shield", "sm"), "You confirmed the flagged items aren't identifiers.")); return; }
    phiBox.append(h("div", {class:"phi"},
      h("p", null, h("strong", {text:"Check before saving. "}), hits.length ? "These look like identifiers." : "Claude wasn't sure about these."),
      h("div", {class:"flags"}, hits.map(x => h("mark", null, x.match, h("small", {text:x.label}))), left.map(x => h("mark", null, x, h("small", {text:"Claude flagged"})))),
      h("div", {class:"acts"},
        hits.length ? h("button", {type:"button", class:"btn sm primary", text:"Replace with placeholders", onclick:() => { d.text = scrubPHI(d.text); d.title = scrubPHI(d.title); d.oneLiner = scrubPHI(d.oneLiner); ta.value = d.text; titleIn.value = d.title; oneIn.value = d.oneLiner; d.phiLeft = []; drawPhi(); }}) : null,
        h("button", {type:"button", class:"btn sm", text:"Looks fine", onclick:() => { d.phiOk = true; drawPhi(); }}))));
  }
  const pulled = h("div", {class:"secs"});
  const drawPulled = () => {
    pulled.textContent = "";
    if (d.did.length) pulled.append(h("div", {class:"sec"}, h("h4", {text:"What you did"}), h("ul", null, d.did.map(x => h("li", {text:x})))));
    if (d.learned.length) pulled.append(h("div", {class:"sec"}, h("h4", {text:"What you learned"}), h("ul", null, d.learned.map(x => h("li", {text:x})))));
    if (d.feedback.length) pulled.append(h("div", {class:"sec"}, h("h4", {text:"Feedback"}), d.feedback.map((f, i) => h("div", {class:"fb"}, h("span", {class:"tone " + f.tone, text:f.tone === "positive" ? "praise" : "growth"}), h("span", null, f.from ? h("b", {text:f.from + ": "}) : null, h("q", {text:f.said})), h("button", {type:"button", class:"x", "aria-label":"Remove feedback", text:"×", onclick:() => { d.feedback.splice(i, 1); drawPulled(); }})))));
    if (d.people.length) pulled.append(h("div", {class:"sec"}, h("h4", {text:"Team mentioned"}), d.people.map((p, i) => h("div", {class:"fb"}, h("span", {text:p.name}), h("span", {class:"tag", text:p.role}), h("button", {type:"button", class:"x", "aria-label":"Remove " + p.name, text:"×", onclick:() => { d.people.splice(i, 1); drawPulled(); }})))));
    if (d.story) pulled.append(h("div", {class:"sec", style:"grid-column:1/-1"}, h("h4", {text:"Story outline"}), starEl(d.story)));
  };
  drawPulled();
  wrap.append(
    h("div", {class:"field"}, h("label", {class:"lbl", for:titleIn.id, text:"Title"}), titleIn),
    h("div", {class:"field"}, h("label", {class:"lbl", for:ta.id, text:"Entry"}), ta),
    phiBox,
    h("div", {class:"field"}, h("label", {class:"lbl", for:oneIn.id, text:"Case one-liner"}), oneIn),
    h("div", {class:"field"}, h("span", {class:"lbl", text:"ACGME competencies"}), toggles(d.competencies, COMP_KEYS, k => COMP_NAME[k])),
    h("div", {class:"field"}, h("span", {class:"lbl", text:"Interview themes"}), toggles(d.themes, THEME_KEYS, k => THEMES[k])),
    h("div", {class:"grid2"},
      h("div", {class:"field"}, h("span", {class:"lbl", text:"Story strength"}), h("div", null, segOf(["None","Thin","Solid","Standout"], () => d.strength, v => { d.strength = v; }, true))),
      h("div", {class:"field", style:"grid-column:1/-1"}, energySlider(() => d.energy, v => { d.energy = v; }, "ed-energy-" + d.id))),
    pulled);
  drawPhi(); requestAnimationFrame(grow);
  return {el:wrap, check(){
    d.text = str(d.text); if (!d.text){ toast("The entry is empty."); return false; }
    const hits = scanPHI([d.title, d.oneLiner, d.text].join("\n"));
    if ((hits.length || (d.phiLeft || []).length) && !d.phiOk){ drawPhi(); const b = phiBox.firstChild; if (b){ b.classList.add("pulse"); b.scrollIntoView({behavior:"smooth", block:"center"}); } toast("Clear the flagged items first."); return false; }
    d.title = str(d.title) || firstWords(d.text); d.oneLiner = str(d.oneLiner); d.words = wordsIn(d.text); d.phiLeft = []; return true;
  }};
}
function starEl(s){ return h("div", {class:"star"}, [["Situation", s.situation], ["Task", s.task], ["Action", s.action], ["Result", s.result], ["Reflection", s.reflection]].filter(r => r[1]).map(([k, v]) => h("div", null, h("span", {class:"k", text:k}), h("span", {text:v})))); }
function dots(n){ return h("span", {class:"dots", role:"img", "aria-label":"Story strength " + n + " of 3", title:"Story strength " + n + " of 3"}, "●".repeat(n), h("span", {class:"off", "aria-hidden":"true", text:"●".repeat(3 - n)})); }

/* ---------- entry drawer ---------- */
let drawerEditor = null;
function openEntry(id){ closeOverlay("palette"); state.drawer = {id, edit:null, confirmDel:false}; showOverlay("entry"); renderDrawer(); requestAnimationFrame(() => { const b = $("#entryPanel .iconbtn"); if (b) b.focus(); }); }
function renderDrawer(){
  const p = $("#entryPanel"); if ($("#entry").hidden) return;
  const e = state.entries.find(x => x.id === state.drawer.id);
  if (!e){ closeOverlay("entry"); return; }
  p.textContent = "";
  const head = h("header", {class:"panel-h"}, h("div", {class:"grow"}, h("span", {class:"pill " + cc(e.rotation)}, h("span", {class:"dot"}), e.rotation), h("span", {class:"muted", text:fmt(entryDay(e), {weekday:"short", month:"short", day:"numeric", year:"numeric"})}), e.example ? h("span", {class:"tag ex", text:"Example"}) : null), h("button", {type:"button", class:"iconbtn", "aria-label":"Close", onclick:() => closeOverlay("entry")}, icon("x")));
  p.append(head);
  const body = h("div", {class:"panel-b"}); p.append(body);
  const foot = h("footer", {class:"panel-f"}); p.append(foot);
  if (state.drawer.edit){
    drawerEditor = editorEl(state.drawer.edit); body.append(drawerEditor.el);
    foot.append(h("span", {class:"grow"}), h("button", {type:"button", class:"btn ghost", text:"Cancel", onclick:() => { state.drawer.edit = null; drawerEditor = null; renderDrawer(); }}),
      h("button", {type:"button", class:"btn primary", text:"Save changes", onclick:async () => { if (!drawerEditor.check()) return; const ok = await putEntry(state.drawer.edit); if (ok){ state.drawer.edit = null; drawerEditor = null; toast("Saved"); renderDrawer(); } }}));
    return;
  }
  body.append(h("div", null, h("h2", {class:"e-title", text:e.title || "Untitled entry"}), e.oneLiner ? h("div", {class:"e-one", text:e.oneLiner}) : null),
    h("div", {class:"chips"}, (e.competencies || []).map(c => h("span", {class:"tag", title:COMP_NAME[c], text:COMP_NAME[c]})), (e.themes || []).map(t => h("span", {class:"tag", text:THEMES[t]})), (e.epas || []).map(n => h("span", {class:"tag", title:EPAS[n], text:"EPA " + n})), e.energy ? h("span", {class:"tag", text:"Energy " + e.energy + "/5"}) : null, (e.strength || 0) > 0 ? h("span", {class:"tag"}, "Story", dots(e.strength)) : null),
    h("div", {class:"e-text", text:e.text}));
  const secs = h("div", {class:"secs"});
  if ((e.did || []).length) secs.append(h("div", {class:"sec"}, h("h4", {text:"What you did"}), h("ul", null, e.did.map(x => h("li", {text:x})))));
  if ((e.learned || []).length) secs.append(h("div", {class:"sec"}, h("h4", {text:"What you learned"}), h("ul", null, e.learned.map(x => h("li", {text:x})))));
  if ((e.feedback || []).length) secs.append(h("div", {class:"sec", style:"grid-column:1/-1"}, h("h4", {text:"Feedback"}), e.feedback.map(f => h("div", {class:"fb"}, h("span", {class:"tone " + f.tone, text:f.tone === "positive" ? "praise" : "growth"}), h("span", null, f.from ? h("b", {text:f.from + ": "}) : null, h("q", {text:f.said}))))));
  if (e.story) secs.append(h("div", {class:"sec", style:"grid-column:1/-1"}, h("h4", {text:"Story outline"}), starEl(e.story)));
  if (secs.childNodes.length) body.append(secs);
  if (state.ai !== false) body.append(commandBox(e));
  if (state.drawer.confirmDel){
    foot.append(h("span", {class:"grow", text:"Delete this entry for good?"}), h("button", {type:"button", class:"btn ghost", text:"Keep it", onclick:() => { state.drawer.confirmDel = false; renderDrawer(); }}),
      h("button", {type:"button", class:"btn danger", text:"Delete", onclick:async () => { const ok = await removeEntry(e.id); if (ok){ closeOverlay("entry"); toast("Deleted"); renderAll(); } }}));
  } else {
    foot.append(h("button", {type:"button", class:"btn sm", onclick:() => { state.drawer.edit = Object.assign({did:[], learned:[], feedback:[], people:[], competencies:[], epas:[], themes:[], story:null, strength:0, energy:null, oneLiner:"", phiLeft:[]}, clone(e)); if (!isDayKey(state.drawer.edit.date)) state.drawer.edit.date = entryDay(e); renderDrawer(); }}, icon("edit", "sm"), "Edit"),
      h("button", {type:"button", class:"btn sm", onclick:() => copyText(e.title + "\n\n" + e.text)}, icon("copy", "sm"), "Copy"),
      h("span", {class:"grow"}),
      h("button", {type:"button", class:"btn sm ghost danger", onclick:() => { state.drawer.confirmDel = true; renderDrawer(); }}, icon("trash", "sm"), "Delete"));
  }
}
const COMMANDS = [
  {label:"Tighten it", instr:"Make this tighter and clearer. Keep every fact and my voice."},
  {label:"STAR story", instr:"Rewrite as a spoken interview story in STAR order (situation, task, action, result), ending with one line on what I learned. 150-200 words."},
  {label:"Teaching point", instr:"State the clinical teaching point from this entry in 2-3 sentences I could use to study."},
  {label:"ERAS experience · 750", instr:"Draft an ERAS Experiences description of my role and what I did, in under " + ERAS.desc + " characters including spaces. Plain prose, no bullet points.", limit:ERAS.desc},
  {label:"Reflection · 300", instr:"Draft an ERAS 'most meaningful experience' reflection in under " + ERAS.reflect + " characters including spaces: why this mattered and how it changed me.", limit:ERAS.reflect},
];
function commandBox(e){
  const st = state.cmd[e.id] || (state.cmd[e.id] = {busy:false, out:"", err:"", limit:0, instr:""});
  const box = h("div", {class:"cmd"}, h("div", {class:"cmd-h"}, icon("spark", "sm"), "Ask Claude to rework this"));
  box.append(h("div", {class:"chips"}, COMMANDS.map(c => h("button", {type:"button", class:"chip", disabled:st.busy, text:c.label, onclick:() => runCommand(e, c.instr, c.limit || 0)}))));
  box.append(h("form", {onsubmit:ev => { ev.preventDefault(); if (str(st.instr)) runCommand(e, st.instr, 0); }}, h("input", {class:"input", id:"cmd-" + e.id, placeholder:"Or say what to change, e.g. “cut it to 3 sentences”", value:st.instr, oninput:ev => { st.instr = ev.target.value; }}), h("button", {type:"submit", class:"btn", disabled:st.busy, text:"Run"})));
  if (st.busy) box.append(h("div", {class:"cnt"}, h("span", {class:"spin", "aria-hidden":"true"}), " Working…"));
  if (st.err) box.append(h("div", {class:"cnt over", text:st.err}));
  if (st.out){
    const n = st.out.length;
    box.append(h("div", {class:"cmd-out", text:st.out}), h("div", {class:"rowacts"},
      h("span", {class:"cnt" + (st.limit && n > st.limit ? " over" : ""), text:n + (st.limit ? " / " + st.limit : "") + " characters"}),
      h("span", {style:"margin-left:auto"}),
      h("button", {type:"button", class:"btn sm", onclick:() => copyText(st.out)}, icon("copy", "sm"), "Copy"),
      h("button", {type:"button", class:"btn sm", text:"Replace entry text", onclick:async () => { const upd = Object.assign(clone(e), {text:st.out, words:wordsIn(st.out)}); if (await putEntry(upd)){ st.out = ""; toast("Entry updated"); renderDrawer(); } }}),
      h("button", {type:"button", class:"linkbtn", text:"Dismiss", onclick:() => { st.out = ""; renderDrawer(); }})));
  }
  return box;
}
async function runCommand(e, instr, limit){
  const sample = await needSample(); if (!sample) return;
  const st = state.cmd[e.id]; st.busy = true; st.err = ""; st.out = ""; st.limit = limit; renderDrawer();
  const prompt = ["You edit one entry from a medical student's clinical rotation journal. Apply the instruction and reply with ONLY the rewritten text: no preface, no quotes around it.",
    "Keep it de-identified: no patient names, dates, room numbers or ID numbers. Never invent facts, outcomes or feelings that are not in the entry.",
    state.settings.specialty ? "The student is aiming for " + state.settings.specialty + "." : "", "", "Instruction: " + instr, "", "Entry (" + e.rotation + "): " + e.title, "<<<", e.text, ">>>"].join("\n");
  try { const r = await sample(prompt, {modelTier:"quick", cache:false}); st.out = r.text.trim(); }
  catch (err){ st.err = aiError(err) || ""; }
  finally { st.busy = false; if (state.drawer.id === e.id) renderDrawer(); }
}

/* ---------- derived data ---------- */
function streak(){ const days = new Set(state.entries.map(entryDay)); const d = new Date(); if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); let n = 0; while (days.has(dayKey(d))){ n++; d.setDate(d.getDate() - 1); } return n; }
const entriesOn = k => state.entries.filter(e => entryDay(e) === k);
function storyMatches(themes){ return state.entries.filter(e => (e.themes || []).some(t => themes.includes(t))).sort((a, b) => (b.strength || 0) - (a.strength || 0) || (b.energy || 0) - (a.energy || 0) || entryDay(b).localeCompare(entryDay(a))); }
function letterWriters(rotation){
  const map = new Map();
  for (const e of state.entries){
    if (rotation && e.rotation !== rotation) continue;
    for (const p of e.people || []){
      if (!["attending","fellow"].includes(p.role)) continue;
      const key = str(p.name).toLowerCase(); if (!key) continue;
      const short = key.replace(/^dr\.?\s*/, "");
      const r = map.get(key) || {name:str(p.name), rotation:e.rotation, rotations:new Set(), count:0, pos:0, last:"", quote:""};
      r.rotations.add(e.rotation); r.count++;
      for (const f of e.feedback || []) if (f.tone === "positive" && short && str(f.from).toLowerCase().includes(short)){ r.pos++; if (!r.quote || entryDay(e) >= r.last) r.quote = f.said; }
      if (entryDay(e) > r.last) r.last = entryDay(e);
      map.set(key, r);
    }
  }
  return [...map.values()].sort((a, b) => b.pos - a.pos || b.count - a.count).slice(0, 8);
}
const coveredPrompts = () => PROMPTS.filter(p => storyMatches(p.themes).length).length;
const compGaps = () => COMP_KEYS.filter(c => !state.entries.some(e => (e.competencies || []).includes(c)));
function nudges(){
  const list = [], t = todayKey(), cur = currentRotation(), sch = rotationOn(t), today = entriesOn(t);
  list.push(today.length ? {done:true, t:"Debriefed today", s:today.length + (today.length === 1 ? " entry" : " entries") + " · add another anytime", fn:() => openComposer()} : {t:"Debrief today's shift", s:pad.value.trim() ? "Your draft is waiting" : "Two minutes. Just talk it out.", fn:() => openComposer()});
  const call = schedOn(t).find(e => e.kind === "call");
  if (call) list.push({t:call.title + " today", s:[call.time, docOf(call)].filter(Boolean).join(" · "), fn:() => { state.cal.sel = t; state.cal.month = monthStart(new Date()); go("calendar"); }});
  const ahead = [...schedIndex.keys()].filter(k => k >= t && diffDays(parseDay(k), new Date()) <= 21).sort().flatMap(k => schedOn(k).filter(e => KEY_KINDS.has(e.kind)));
  for (const e of ahead.slice(0, 2)){ const n = diffDays(parseDay(e.date), new Date()); list.push({warn:e.kind === "exam", t:e.title + (n === 0 ? " today" : n === 1 ? " tomorrow" : n < 7 ? " " + parseDay(e.date).toLocaleDateString(undefined, {weekday:"long"}) : " in " + n + " days"), s:fmt(e.date, {weekday:"short", month:"short", day:"numeric"}) + (e.time ? " · " + e.time : ""), fn:() => { state.cal.sel = e.date; state.cal.month = monthStart(parseDay(e.date)); go("calendar"); }}); }
  if (!hasSchedule()) list.push({warn:true, t:"Set your track", s:"Rotations and clerkship schedules live on Schedule", fn:pickSchedule});
  if (sch){
    const left = diffDays(sch.e, new Date());
    if (left <= 14){
      const w = letterWriters(cur)[0];
      list.push(w ? {warn:true, t:"Ask " + w.name + " for a letter", s:cur + " ends " + fmt(dayKey(sch.e)) + " · " + left + " days left", fn:() => go("vault")} : {warn:true, t:"Name an attending who saw your work", s:cur + " ends in " + left + " days", fn:() => openComposer({insert:"Attending who saw my work this rotation: "})});
    }
  }
  if (state.entries.length >= 3){ const g = compGaps()[0]; if (g) list.push({t:"Find a " + COMP_NAME[g] + " moment", s:"No entries tagged with it yet", fn:() => go("vault")}); }
  const untagged = state.entries.filter(e => !(e.competencies || []).length).length;
  if (untagged) list.push({t:"Tag " + untagged + (untagged === 1 ? " entry" : " entries"), s:"Untagged entries don't reach your vault", fn:() => { state.filter = {q:"", rot:"all", comp:"none"}; go("journal"); }});
  if (state.entries.length){ const miss = PROMPTS.length - coveredPrompts(); if (miss) list.push({t:miss + " interview questions need a story", s:coveredPrompts() + " of " + PROMPTS.length + " covered", fn:() => go("vault")}); }
  if (state.entries.some(e => e.example)) list.push({t:"Remove the example entries", s:"When you've seen how it works", fn:removeExamples});
  return list.slice(0, 5);
}

/* ---------- schedule import (.xlsx read in the browser, no library) ---------- */
async function readXlsx(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), dec = new TextDecoder();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if (eocd < 0) throw {msg:"This file isn't a readable .xlsx workbook."};
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let k = 0; k < count; k++){
    if (dv.getUint32(p, true) !== 0x02014b50) throw {msg:"This file isn't a readable .xlsx workbook."};
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    files[dec.decode(buf.subarray(p + 46, p + 46 + nlen))] = {method, csize, off};
    p += 46 + nlen + xlen + clen;
  }
  async function read(name){
    const f = files[name] || files[Object.keys(files).find(k => k.toLowerCase() === name.toLowerCase())]; if (!f) return null;
    const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = buf.subarray(start, start + f.csize);
    if (f.method === 0) return dec.decode(data);
    if (f.method !== 8 || typeof DecompressionStream === "undefined") throw {msg:"This browser can't open .xlsx files. Try the latest Chrome, Safari or Firefox."};
    return dec.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  }
  const xml = s => new DOMParser().parseFromString(s, "application/xml");
  const wbx = await read("xl/workbook.xml"); if (!wbx) throw {msg:"This file isn't a readable .xlsx workbook."};
  const wb = xml(wbx), sheetEl = wb.getElementsByTagName("sheet")[0];
  const d1904 = /^(1|true)$/i.test((wb.getElementsByTagName("workbookPr")[0] || {getAttribute:() => ""}).getAttribute("date1904") || "");
  let target = "xl/worksheets/sheet1.xml";
  const relx = await read("xl/_rels/workbook.xml.rels");
  if (relx && sheetEl){
    const rid = sheetEl.getAttribute("r:id") || sheetEl.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = [...xml(relx).getElementsByTagName("Relationship")].find(r => r.getAttribute("Id") === rid);
    if (rel){ const t = rel.getAttribute("Target") || ""; target = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""); }
  }
  const sst = [];
  const ssx = await read("xl/sharedStrings.xml");
  if (ssx) for (const si of xml(ssx).getElementsByTagName("si")) sst.push([...si.getElementsByTagName("t")].filter(t => t.parentNode && t.parentNode.nodeName !== "rPh").map(t => t.textContent).join(""));
  const shx = await read(target); if (!shx) throw {msg:"Couldn't find a worksheet in this file."};
  const grid = [];
  const colIdx = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, "").toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  for (const row of xml(shx).getElementsByTagName("row")){
    const r = Number(row.getAttribute("r")) || grid.length + 1, cells = grid[r] = [];
    let c = 0;
    for (const el of row.getElementsByTagName("c")){
      c = el.getAttribute("r") ? colIdx(el.getAttribute("r")) : c + 1;
      const t = el.getAttribute("t"), v = el.getElementsByTagName("v")[0];
      let val;
      if (t === "s") val = v ? sst[Number(v.textContent)] : undefined;
      else if (t === "inlineStr") val = [...el.getElementsByTagName("t")].map(x => x.textContent).join("");
      else if (t === "str" || t === "e") val = t === "e" ? undefined : v ? v.textContent : undefined;
      else if (t === "b") val = v ? v.textContent === "1" : undefined;
      else val = v && v.textContent !== "" ? Number(v.textContent) : undefined;
      if (val !== undefined && val !== "") cells[c] = val;
    }
  }
  return {grid, d1904};
}
const SCHED_LABEL = /^(clinic night:?|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?|week\s*\d*|notes?:?|key:?|legend:?|students?:?|names?:?)$/i;
const TIME_RE = /^((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:am|pm))(?![a-z])\s*/i;
function serialKey(n, d1904){ const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n + (d1904 ? 1462 : 0)) * 864e5); return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()); }
function dateFromText(s, yearHint){
  s = String(s || "").trim(); let m;
  if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + pad2(m[2]) + "-" + pad2(m[3]);
  if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))){ const y = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : String(yearHint); return y + "-" + pad2(m[1]) + "-" + pad2(m[2]); }
  if ((m = s.match(new RegExp("\\b" + MONTHS + "\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?", "i")))){ const mi = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[0].slice(0, 3).toLowerCase()); const day = (m[0].match(/\s(\d{1,2})/) || [])[1]; const y = (m[0].match(/(\d{4})$/) || [])[1] || yearHint; if (mi >= 0 && day) return y + "-" + pad2(mi + 1) + "-" + pad2(day); }
  return null;
}
function fracTime(n){ const mins = Math.round(n * 1440), hh = Math.floor(mins / 60) % 24, mm = mins % 60; return (hh % 12 || 12) + ":" + pad2(mm) + (hh < 12 ? "am" : "pm"); }
function parseWeeklyGrid(grid, d1904){
  const txt = (r, c) => { const v = (grid[r] || [])[c]; if (v == null) return ""; if (typeof v === "number") return v > 0 && v < 1 ? fracTime(v) : String(v); return String(v).replace(/\s+/g, " ").trim(); };
  const yearHint = new Date().getFullYear(), weeks = [];
  for (let r = 1; r < grid.length; r++){
    if (!/^week\b/i.test(txt(r, 1))) continue;
    const next = grid[r + 1] || [], cols = []; let fromNext = false;
    for (let c = 2; c < Math.max((grid[r] || []).length, next.length); c++){
      const dv = next[c]; let date = null;
      if (typeof dv === "number" && dv > 20000 && dv < 80000){ date = serialKey(dv, d1904); fromNext = true; }
      else if (typeof dv === "string" && (date = dateFromText(dv, yearHint))) fromNext = true;
      if (!date) date = dateFromText(txt(r, c), yearHint);
      if (date) cols.push({c, date});
    }
    if (cols.length) weeks.push({row:r, dateRow:fromNext ? r + 1 : r, cols});
  }
  const people = new Map(); let text = "";
  weeks.forEach((w, i) => {
    const end = (weeks[i + 1] ? weeks[i + 1].row : grid.length) - 1, starts = [];
    let skip = 0;
    for (let r = w.dateRow + 1; r <= end; r++){
      for (const c of w.cols) text += " " + txt(r, c.c);
      const A = txt(r, 1);
      if (!A || SCHED_LABEL.test(A) || r === skip) continue;
      const B = txt(r + 1, 1); let name = A;
      if (!/\s/.test(A) && B && !SCHED_LABEL.test(B) && !/\d/.test(B)){ name = A + " " + B; skip = r + 1; }
      starts.push({name, from:r});
    }
    starts.forEach((s, j) => { const blk = {week:w, from:s.from, to:(starts[j + 1] ? starts[j + 1].from : end + 1) - 1}; if (!people.has(s.name)) people.set(s.name, []); people.get(s.name).push(blk); });
  });
  return {weeks, people, txt, text};
}
function schedKind(e){
  const s = (e.title + " " + e.details.join(" ")).toLowerCase();
  if (/\bexam\b|\bosce\b|\bshelf\b(?! prep)/.test(s)) return "exam";
  if (/\bdue\b|\beval(uation)?\b|deadline|\bsubmit/.test(s)) return "due";
  if (/\bcall\b/.test(s)) return "call";
  if (/reading day|retreat|holiday|vacation|\bday off\b/.test(s)) return "off";
  if (/didactic|grand rounds|journal club|clinical case|shelf prep|lecture|conference|\bidea\b|ep meeting|check.?in|orientation/.test(s)) return "teach";
  return "clinical";
}
function startMin(t){
  t = String(t || "").toLowerCase(); if (!t) return -1;
  if (t === "am") return 480; if (t === "pm") return 780;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*[-–]\s*(\d{1,2})(?::\d{2})?\s*(am|pm))?/); if (!m) return -1;
  let hh = Number(m[1]); const mm = Number(m[2] || 0); let mer = m[3] || m[5] || "";
  if (!m[3] && m[5] === "pm" && m[4] && hh > Number(m[4]) && hh !== 12) mer = "am";
  hh = hh % 12 + (mer === "pm" ? 12 : 0); return hh * 60 + mm;
}
const fmtMin = m => m < 0 ? "" : (Math.floor(m / 60) % 12 || 12) + ":" + pad2(m % 60) + (m < 720 ? "a" : "p");
function eventsFor(parsed, name){
  const out = [];
  for (const blk of parsed.people.get(name) || []){
    for (const {c, date} of blk.week.cols){
      let cur = null, gap = false, any = false;
      for (let r = blk.from; r <= blk.to; r++){
        const v = parsed.txt(r, c);
        if (!v){ if (any) gap = true; continue; }
        const m = v.match(TIME_RE);
        if (m || !cur || gap){ cur = {date, time:m ? ((t => /^(am|pm)$/.test(t) ? t.toUpperCase() : t)(m[1].replace(/\s+/g, "").replace("–", "-").toLowerCase())) : "", title:(m ? v.slice(m[0].length) : v).trim(), details:[]}; out.push(cur); }
        else if (!cur.title) cur.title = v;
        else cur.details.push(v);
        gap = false; any = true;
      }
    }
  }
  return out.filter(e => e.title || e.time).map(e => { e.title = e.title || "Scheduled"; e.kind = schedKind(e); return e; })
    .sort((a, b) => a.date.localeCompare(b.date) || startMin(a.time) - startMin(b.time));
}
const ROT_KEYS = [["Family Medicine", ["family medicine", "family"]], ["Internal Medicine", ["internal medicine", "internal", "medicine"]], ["Pediatrics", ["pediatric", "peds", "paeds"]], ["Psychiatry", ["psychiatr", "psych"]], ["OB/GYN", ["obgyn", "ob gyn", "obstetric", "gynecolog"]], ["Surgery", ["surgery", "surg"]], ["Neurology", ["neurology", "neuro"]]];
function guessRotation(fileName, text){
  const names = state.settings.rotations.map(r => r.name);
  for (const hay of [String(fileName).toLowerCase().replace(/[_\-.]+/g, " "), String(text).toLowerCase()]){
    for (const n of names) if (n.length > 3 && hay.includes(n.toLowerCase())) return n;
    for (const [canon, keys] of ROT_KEYS) for (const k of keys) if (new RegExp("\\b" + escRe(k)).test(hay)) return names.find(n => n.toLowerCase() === canon.toLowerCase()) || canon;
  }
  return null;
}

/* storage for imported schedules: data/users/<uid>/schedule/imports/<id>, browser fallback cd.v1.schedules */
const K_SCHED = "perl.v1.debrief.legacy-schedules"; /* Perl's own importer is retired; the shared Schedule page owns this */
let unsubI = null;
const importsCol = () => db.doc("data/users/" + uid + "/schedule").collection("imports");
const localImports = () => arr(lsGet(K_SCHED));
function setImports(list){
  state.imports = list.filter(x => x && isDayKey(x.start) && isDayKey(x.end));
  schedIndex = new Map();
  for (const imp of state.imports) for (const e of arr(imp.events)){ if (!isDayKey(e.date)) continue; if (!schedIndex.has(e.date)) schedIndex.set(e.date, []); schedIndex.get(e.date).push(Object.assign({rotation:imp.rotation}, e, {details:arr(e.details)})); }
  for (const l of schedIndex.values()) l.sort((a, b) => startMin(a.time) - startMin(b.time));
}
const schedOn = k => schedIndex.get(k) || [];
const KEY_KINDS = new Set(["exam", "due"]);
async function putImport(doc){
  if (JSON.stringify(doc).length > 240000){ toast("This schedule is too large to save. Split it into separate files."); return false; }
  if (state.mode === "account" && db){
    try { await importsCol().doc(doc.id).set(doc); return true; }
    catch (err){
      const c = err && err.code;
      if (c === "invalid_argument" || c === "revoked" || c === "not_granted"){ localPutImport(doc); toBrowserMode("Your access to this page is view-only, so the schedule was saved in this browser."); return true; }
      toast("Couldn't save the schedule. Try again."); return false;
    }
  }
  localPutImport(doc); return true;
}
function localPutImport(doc){ const list = localImports().filter(x => x.id !== doc.id); list.push(doc); lsSet(K_SCHED, list); if (state.mode !== "account") setImports(list); }
async function removeImport(id){
  if (state.mode === "account" && db){ try { await importsCol().doc(id).delete(); } catch { toast("Couldn't remove it. Try again."); return false; } }
  else { lsSet(K_SCHED, localImports().filter(x => x.id !== id)); setImports(localImports()); }
  return true;
}

/* import flow */
function pickSchedule(){ toGo("schedule"); }
async function openImport(file){
  closeOverlay("palette");
  state.imp = {fileName:file.name, busy:true}; showOverlay("importer"); renderImport();
  try {
    if (!/\.xlsx$/i.test(file.name)) throw {msg:/\.xls$/i.test(file.name) ? "This is an older .xls file. Open it in Excel or Numbers, save it as .xlsx, then drop it here again." : "Drop the Excel schedule your clerkship sent, saved as .xlsx."};
    const {grid, d1904} = await readXlsx(file);
    const parsed = parseWeeklyGrid(grid, d1904);
    if (!parsed.weeks.length || !parsed.people.size) throw {msg:"Couldn't find a weekly schedule in this file. It needs WEEK rows with Monday to Sunday dates, and each student's name in the first column."};
    const names = [...parsed.people.keys()], dates = parsed.weeks.flatMap(w => w.cols.map(c => c.date)).sort();
    const start = dates[0], end = dates[dates.length - 1], weeks = Math.max(1, Math.ceil((diffDays(parseDay(end), parseDay(start)) + 1) / 7));
    const my = str(state.settings.myName).toLowerCase();
    const person = names.find(n => n.toLowerCase() === my) || (names.length === 1 ? names[0] : null);
    const rotation = guessRotation(file.name, parsed.text) || currentRotation();
    state.imp = {fileName:file.name, parsed, names, person, rotation, start, end, weeks, chain:!state.imports.some(i => i.rotation !== rotation), busy:false};
  } catch (e){ state.imp = {fileName:file.name, error:e && e.msg ? e.msg : "Couldn't read this file. Make sure it's an .xlsx schedule and try again."}; }
  if (!$("#importer").hidden) renderImport();
}
function renderImport(){
  const im = state.imp, body = $("#impBody"), foot = $("#impFoot"); if (!im) return;
  body.textContent = ""; foot.textContent = "";
  const fileRow = h("div", {class:"impfile"}, icon("grid", "sm"), h("span", {text:im.fileName}));
  if (im.busy){ body.append(fileRow, h("p", {class:"muted"}, h("span", {class:"spin", "aria-hidden":"true"}), " Reading your schedule…")); return; }
  if (im.error){
    body.append(fileRow, h("div", {class:"phi"}, h("p", {text:im.error})));
    foot.append(h("span", {class:"grow"}), h("button", {type:"button", class:"btn ghost", text:"Cancel", onclick:() => closeOverlay("importer")}), h("button", {type:"button", class:"btn primary", onclick:pickSchedule}, icon("upload", "sm"), "Choose another file"));
    return;
  }
  const events = im.person ? eventsFor(im.parsed, im.person) : [];
  const key = events.filter(e => KEY_KINDS.has(e.kind)), calls = events.filter(e => e.kind === "call");
  const existing = state.imports.find(i => i.rotation === im.rotation);
  const rotSel = h("select", {class:"sel", id:"impRot", onchange:e => { im.rotation = e.target.value; renderImport(); }}, [...new Set([...allRotations(), im.rotation])].map(r => h("option", {value:r, text:state.settings.rotations.some(x => x.name === r) ? r : r + " (new)"})));
  rotSel.value = im.rotation;
  body.append(fileRow,
    h("div", {class:"impsum " + cc(im.rotation)}, h("span", {class:"pill"}, h("span", {class:"dot"}), im.rotation), h("b", {text:fmt(im.start, {month:"short", day:"numeric"}) + " – " + fmt(im.end, {month:"short", day:"numeric", year:"numeric"})}), h("span", {class:"muted", text:im.weeks + (im.weeks === 1 ? " week" : " weeks") + " · " + im.parsed.weeks.length + " week blocks found"})),
    h("div", {class:"field"}, h("span", {class:"lbl", text:"Which one is you?"}),
      h("div", {class:"chips"}, im.names.map(n => h("button", {type:"button", class:"chip", "aria-pressed":String(im.person === n), text:n, onclick:() => { im.person = n; im.err = ""; renderImport(); }}))),
      h("span", {class:"ksub", style:"margin:2px 0 0", text:"Only your rows are saved. Everyone else's stay out of the app."}),
      im.err ? h("span", {class:"cnt over", text:im.err}) : null),
    im.person ? h("div", {class:"field"}, h("span", {class:"lbl", text:"What's in it for you"}),
      h("p", {style:"margin:0;font-size:14px", text:events.length + " schedule items · " + calls.length + (calls.length === 1 ? " call shift" : " call shifts") + " · " + key.length + (key.length === 1 ? " key date" : " key dates")}),
      key.length ? h("ul", {class:"sched-list"}, key.slice(0, 6).map(e => h("li", {class:"k-" + e.kind}, h("span", {class:"tm", text:fmt(e.date, {weekday:"short", month:"short", day:"numeric"})}), h("span", null, h("b", {text:(e.time ? e.time + " " : "") + e.title}), e.details.length ? h("span", {class:"d", text:e.details.join(" · ")}) : null)))) : null) : null,
    h("label", {class:"field", for:"impRot"}, h("span", {class:"lbl", text:"Rotation"}), rotSel),
    h("label", {class:"check"}, h("input", {type:"checkbox", id:"impChain", checked:im.chain, onchange:e => { im.chain = e.target.checked; }}), h("span", null, "Line up my other rotations around this one", h("span", {class:"ksub", style:"display:block;margin:2px 0 0", text:"Uses the lengths in Toolkit. Imported rotations keep their real dates."}))),
    existing ? h("p", {class:"ksub", style:"margin:0", text:"Replaces the " + im.rotation + " schedule you imported " + fmt(dayKey(existing.importedAt || new Date())) + "."}) : null);
  foot.append(h("span", {class:"grow"}, h("span", {class:"status"}, h("i"), "Read on your device")), h("button", {type:"button", class:"btn ghost", text:"Cancel", onclick:() => closeOverlay("importer")}), h("button", {type:"button", class:"btn primary", onclick:applyImport}, icon("check", "sm"), "Import schedule"));
}
async function applyImport(){
  const im = state.imp; if (!im || !im.parsed) return;
  if (!im.person){ im.err = "Pick your name first."; renderImport(); return; }
  const events = eventsFor(im.parsed, im.person).map(e => ({date:e.date, time:e.time, title:e.title, details:e.details.slice(0, 6), kind:e.kind}));
  const s = state.settings; let r = s.rotations.find(x => x.name === im.rotation);
  if (!r){ r = {name:im.rotation, weeks:im.weeks, color:s.rotations.length % 8, start:im.start}; s.rotations.push(r); }
  r.start = im.start; r.weeks = im.weeks;
  if (im.chain) buildSchedule(r.name, im.start);
  for (const imp of state.imports){ const rr = s.rotations.find(x => x.name === imp.rotation); if (rr && imp.rotation !== r.name){ rr.start = imp.start; rr.weeks = imp.weeks || rr.weeks; } }
  s.myName = im.person;
  const t = todayKey(); if (t >= im.start && t <= im.end) s.current = r.name;
  const doc = {id:"s-" + r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), rotation:r.name, fileName:im.fileName, importedAt:new Date().toISOString(), start:im.start, end:im.end, weeks:im.weeks, events};
  const ok = await putImport(doc); if (!ok) return;
  if (state.mode === "account") setImports(state.imports.filter(x => x.id !== doc.id).concat([doc]));
  commitSettings(); closeOverlay("importer");
  state.cal.month = monthStart(t >= im.start && t <= im.end ? new Date() : parseDay(im.start)); state.cal.sel = t >= im.start && t <= im.end ? t : im.start;
  toast(r.name + " schedule imported · " + events.length + " items", {label:"View calendar", fn:() => go("calendar")});
}
function docOf(e){ const d = arr(e.details).find(x => /^dr\.?\s/i.test(x)); return d ? d.split(",")[0].trim() : ""; }

/* dropping a schedule is handled once, by the shared Schedule page */

/* ---------- MSPE builder ---------- */
const K_MSPE = "perl.v1.debrief.mspe";
const ACT_TYPES = [["leadership","Leadership"],["research","Research"],["publication","Publication or presentation"],["teaching","Teaching"],["service","Service"],["innovation","Innovation"],["award","Award or honor"],["clinical","Clinical"],["other","Other"]];
const ACT_NAME = Object.fromEntries(ACT_TYPES);
const GRADES = ["", "Honors", "Satisfactory", "Satisfactory with Remediation", "Unsatisfactory"];
const COMPONENT = ["", "H", "S"];
const MSPE_TABS = [["noteworthy","Noteworthy"],["activities","Activities"],["clerkships","Clerkships"],["record","Summary and record"],["preview","Preview"]];
const tx = v => typeof v === "string" ? v : "";
function normMspe(m){
  const o = x => x && typeof x === "object" && !Array.isArray(x) ? x : {};
  m = o(m);
  const ncs = arr(m.ncs).slice(0, 3).map(n => ({id:str(o(n).id) || newId(), text:tx(o(n).text), sources:arr(o(n).sources).map(str).filter(Boolean)}));
  while (ncs.length < 3) ncs.push({id:newId(), text:"", sources:[]});
  const cl = {};
  for (const [k, v0] of Object.entries(o(m.clerkships))){ const v = o(v0); cl[k] = {grade:GRADES.includes(v.grade) ? v.grade : "", clinical:COMPONENT.includes(v.clinical) ? v.clinical : "", exam:COMPONENT.includes(v.exam) ? v.exam : "", comments:tx(v.comments), preview:tx(v.preview)}; }
  const s = o(m.summary), hi = o(m.history), id = o(m.ident);
  return {
    ident:{name:tx(id.name), undergrad:tx(id.undergrad)},
    ncs,
    cands:arr(m.cands).filter(c => c && str(c.text)).slice(0, 6).map(c => ({theme:str(c.theme), text:str(c.text), evidence:arr(c.evidence).map(str).filter(Boolean).slice(0, 5)})),
    activities:arr(m.activities).filter(a => a && str(a.title)).map(a => ({id:str(a.id) || newId(), type:ACT_NAME[a.type] ? a.type : "other", title:str(a.title), org:str(a.org), start:str(a.start), end:str(a.end), desc:tx(a.desc), impact:str(a.impact)})),
    clerkships:cl,
    idea:arr(m.idea).map(tx).slice(0, 5),
    summary:{recognition:tx(s.recognition), dataScience:tx(s.dataScience), capstone:tx(s.capstone), other:tx(s.other)},
    history:{matric:tx(hi.matric), grad:tx(hi.grad), gaps:tx(hi.gaps), dual:tx(hi.dual), remediation:hi.remediation === "Yes" ? "Yes" : "No", adverse:hi.adverse === "Yes" ? "Yes" : "No"},
    prof:{recognized:!!o(m.prof).recognized},
  };
}
let unsubM = null, mspeTimer = null, mspeChain = Promise.resolve(), mspeDirty = false;
const mspeDoc = () => debriefDoc().collection("meta").doc("mspe");
function commitMspe(rerender){
  mspeDirty = true;
  if (rerender) renderMspe();
  clearTimeout(mspeTimer);
  mspeTimer = setTimeout(() => {
    const snap = clone(state.mspe); lsSet(K_MSPE, snap);
    if (state.mode === "account" && db){
      mspeChain = mspeChain.then(() => mspeDoc().set(snap)).then(() => { mspeDirty = false; }).catch(err => {
        mspeDirty = false; const c = err && err.code;
        if (c === "invalid_argument" || c === "revoked" || c === "not_granted") toBrowserMode("Your access to this page is view-only, so your MSPE draft is kept in this browser.");
        else toast("Couldn't save your MSPE draft. Check your connection.");
      });
    } else mspeDirty = false;
  }, 700);
}
function sentenceCount(t){
  const s = String(t || "").replace(/\b(Dr|Mr|Mrs|Ms|St|vs|Inc|Jr|Sr|Prof|No|e\.g|i\.e|U\.S|M\.D|Ph\.D|B\.S|M\.S)\./gi, m => m.replace(/\./g, "·")).trim();
  if (!s) return 0;
  return (s.match(/[^.!?]+(?:[.!?]+|$)/g) || []).filter(x => x.trim()).length;
}
const firstName = () => (str(state.mspe.ident.name) || str(sharedProfile.name) || str(sharedProfile.myName)).split(/\s+/)[0] || "FIRST NAME";
const fullName = () => str(state.mspe.ident.name) || str(sharedProfile.myName) || "Your Name";
function fmtMonth(k){ const m = String(k || "").match(/^(\d{4})-(\d{2})/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(undefined, {month:"short", year:"numeric"}) : (k === "present" ? "Present" : str(k)); }
const actDates = a => [a.start ? fmtMonth(a.start) : "", a.end ? fmtMonth(a.end) : (a.start ? "Present" : "")].filter(Boolean).join(" – ");
function mspeReady(){
  const m = state.mspe, rots = mspeRots().map(r => r.name);
  const nc = m.ncs.filter(n => str(n.text)).length, acts = m.activities.length, actNum = m.activities.filter(a => /\d/.test(a.impact + " " + a.desc)).length;
  const tracked = rots.filter(r => { const c = m.clerkships[r]; return c && (c.grade || str(c.comments)); }).length;
  const hl = ["recognition", "dataScience", "capstone"].filter(k => str(m.summary[k])).length;
  const pct = (Math.min(nc, 3) / 3 + Math.min(acts, 8) / 8 + (rots.length ? tracked / rots.length : 0) + hl / 3) / 4;
  return {nc, acts, actNum, tracked, total:rots.length, hl, pct};
}
function who(kind){ return h("span", {class:"own " + kind, text:kind === "you" ? "You draft" : kind === "school" ? "School writes" : "You track"}); }
const ta = (id, value, oninput, attrs) => { const el = h("textarea", Object.assign({class:"ta", id, value}, attrs || {})); el.addEventListener("input", e => { oninput(e.target.value); grow(); }); const grow = () => { el.style.height = "auto"; el.style.height = Math.max(Number((attrs || {})["data-min"]) || 88, el.scrollHeight + 2) + "px"; }; requestAnimationFrame(grow); return el; };
const inp = (id, value, oninput, attrs) => h("input", Object.assign({class:"input", id, value, oninput:e => oninput(e.target.value)}, attrs || {}));

function renderMspe(passive){
  const host = $("#view-mspe"); if (!host) return;
  if (passive && typingIn(host)){ pending.mspe = true; return; }
  host.textContent = "";
  const m = state.mspe, rd = mspeReady(), tab = state.mspeTab;
  host.append(h("div", {class:"vh"}, h("div", null, h("div", {class:"eyebrow", text:"Medical Student Performance Evaluation"}), h("h1", {text:"Your MSPE"}),
      h("div", {class:"sub", text:"Student Affairs writes your MSPE. You draft the noteworthy characteristics and summary highlights; this keeps everything they draw on in one place."})),
    h("div", {class:"vh-r"}, h("button", {type:"button", class:"btn", onclick:mspeExport}, icon("download", "sm"), "Export draft"), h("button", {type:"button", class:"btn primary", onclick:() => { state.mspeTab = "preview"; renderMspe(); }}, "Preview letter"))));
  host.append(h("section", {class:"card", style:"margin-bottom:16px"}, h("div", {class:"card-b", style:"padding-top:20px"},
    h("div", {class:"ready"},
      h("div", {class:"it"}, h("b", null, String(Math.min(rd.nc, 3)), h("small", {text:"/ 3"})), h("span", {text:"Noteworthy characteristics drafted"})),
      h("div", {class:"it"}, h("b", null, String(rd.acts), h("small", {text:rd.actNum + " with numbers"})), h("span", {text:"Activities and achievements"})),
      h("div", {class:"it"}, h("b", null, String(rd.tracked), h("small", {text:"/ " + rd.total})), h("span", {text:"Clerkships tracked"})),
      h("div", {class:"it"}, h("b", null, String(rd.hl), h("small", {text:"/ 3"})), h("span", {text:"Summary highlights"}))),
    h("div", {class:"prog gold"}, h("i", {style:"width:" + Math.round(rd.pct * 100) + "%"})))));
  host.append(h("div", {class:"seg wide", role:"group", "aria-label":"MSPE sections", style:"margin-bottom:16px"}, MSPE_TABS.map(([k, l]) => h("button", {type:"button", "aria-pressed":String(tab === k), text:l, onclick:() => { state.mspeTab = k; renderMspe(); }}))));
  if (tab === "noteworthy") host.append(mspeNoteworthy());
  else if (tab === "activities") host.append(mspeActivities());
  else if (tab === "clerkships") host.append(mspeClerkships());
  else if (tab === "record") host.append(mspeRecord());
  else host.append(mspePreview());
}

/* noteworthy characteristics */
function ncMeta(n){
  const sc = sentenceCount(n.text), num = /\d/.test(n.text), len = str(n.text).length;
  return [h("span", {class:sc > 2 ? "bad" : sc ? "ok" : "", text:sc + (sc === 1 ? " sentence" : " sentences") + (sc > 2 ? ", AAMC asks for 2 or fewer" : "")}), h("span", {class:num ? "ok" : "", text:num ? "Has a number" : "No number yet"}), h("span", {text:len + " characters"})];
}
function mspeNoteworthy(){
  const m = state.mspe, wrap = h("div", {class:"bento"});
  const list = h("div", {class:"nclist"});
  m.ncs.forEach((n, i) => {
    const meta = h("div", {class:"ncmeta"}, ncMeta(n));
    const field = ta("nc-" + i, n.text, v => { n.text = v; meta.textContent = ""; meta.append(...ncMeta(n)); row.classList.toggle("filled", !!str(v)); commitMspe(); }, {placeholder:i === 0 ? "As president of …, " + firstName() + " led … that …. They …" : "Another distinct strength, with a concrete result", "aria-label":"Noteworthy characteristic " + (i + 1)});
    const ev = n.sources.map(sid => m.activities.find(a => a.id === sid)).filter(Boolean);
    const addEv = h("select", {class:"sel", style:"width:auto;max-width:min(240px,100%);height:30px;padding:2px 8px;font-size:12.5px", "aria-label":"Link an activity as evidence", onchange:e => { if (e.target.value){ n.sources.push(e.target.value); commitMspe(true); } }},
      h("option", {value:"", text:"Link evidence…"}), m.activities.filter(a => !n.sources.includes(a.id)).map(a => h("option", {value:a.id, text:a.title + (a.org ? " · " + a.org : "")})));
    const st = state.mspeBusy["nc" + i];
    const row = h("div", {class:"nc" + (str(n.text) ? " filled" : "")}, h("span", {class:"num", text:String(i + 1)}),
      h("div", {class:"ncbody"}, field, meta,
        h("div", {class:"rowacts"},
          ev.map(a => h("span", {class:"tag"}, a.title, h("button", {type:"button", class:"x", "aria-label":"Unlink " + a.title, text:"×", onclick:() => { n.sources = n.sources.filter(x => x !== a.id); commitMspe(true); }}))),
          m.activities.length ? addEv : null,
          h("span", {style:"margin-left:auto"}),
          state.ai !== false && str(n.text) ? h("button", {type:"button", class:"btn sm ghost", disabled:!!st, onclick:() => tightenNC(i)}, st ? h("span", {class:"spin", "aria-hidden":"true"}) : icon("spark", "sm"), st ? "Tightening…" : "Tighten") : null,
          str(n.text) ? h("button", {type:"button", class:"btn sm ghost", text:"Clear", onclick:() => { const old = n.text; n.text = ""; n.sources = []; commitMspe(true); toast("Cleared", {label:"Undo", fn:() => { n.text = old; commitMspe(true); }}); }}) : null)));
    list.append(row);
  });
  wrap.append(h("section", {class:"card s8"}, h("div", {class:"card-h"}, h("h2", {text:"Noteworthy characteristics"}), h("div", {class:"act"}, who("you"))),
    h("div", {class:"card-b"}, h("p", {class:"ksub", style:"margin:0", text:"Up to three bullets, two sentences or fewer each. Write in third person. Your school's sample has you finalize these with the Director of Student Success between M3 and M4."}), list)));
  const busy = state.mspeBusy.suggest;
  const side = h("section", {class:"card s4"}, h("div", {class:"card-h"}, h("h2", {text:"Find your three"})), h("div", {class:"card-b"},
    state.ai !== false ? h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn primary", disabled:!!busy, onclick:suggestNCs}, busy ? h("span", {class:"spin", "aria-hidden":"true"}) : icon("spark", "sm"), busy ? "Reading your record…" : "Suggest from my record"), busy ? h("button", {type:"button", class:"btn ghost", text:"Stop", onclick:() => state.mspeCtl && state.mspeCtl.abort()}) : null) : null,
    h("p", {class:"ksub", style:"margin:0", text:"Claude reads your activities, summary highlights, journal and clerkship comments, then proposes five distinct options. It uses only what's in your record."}),
    m.cands.length ? h("div", {class:"cands"}, m.cands.map((c, ci) => h("div", {class:"cand"}, h("b", {text:c.theme || "Option " + (ci + 1)}), h("span", {text:c.text}), c.evidence.length ? h("span", {class:"ev", text:"From: " + c.evidence.join(" · ")}) : null,
      h("div", {class:"rowacts"}, h("span", {class:"lbl", text:"Use as"}), [0, 1, 2].map(k => h("button", {type:"button", class:"btn sm", text:String(k + 1), "aria-label":"Use as characteristic " + (k + 1), onclick:() => { const n = m.ncs[k], old = n.text; n.text = c.text; n.sources = c.evidence.map(t => (m.activities.find(a => a.title.toLowerCase() === t.toLowerCase()) || {}).id).filter(Boolean); commitMspe(true); toast("Placed in slot " + (k + 1), old ? {label:"Undo", fn:() => { n.text = old; commitMspe(true); }} : null); }})))))) : null,
    h("div", {class:"tips"}, h("div", {class:"lbl", text:"What makes one strong"}), h("ul", null,
      h("li", {text:"One theme per bullet: a role, what you did, and the result."}),
      h("li", {text:"A number a program director can't skim past: people served, dollars, papers, teams."}),
      h("li", {text:"Three different sides of you, not three versions of research."}),
      h("li", {text:"Nothing your evaluations or CV can't back up."})))));
  wrap.append(side);
  return wrap;
}
function recordDigest(){
  const m = state.mspe, lines = [];
  if (m.activities.length){ lines.push("ACTIVITIES:"); for (const a of m.activities) lines.push("- [" + ACT_NAME[a.type] + "] " + a.title + (a.org ? ", " + a.org : "") + (actDates(a) ? " (" + actDates(a) + ")" : "") + (a.desc ? ": " + a.desc.slice(0, 400) : "") + (a.impact ? " Impact: " + a.impact : "")); }
  const sm = [["Recognition", m.summary.recognition], ["Data science project", m.summary.dataScience], ["Capstone project", m.summary.capstone], ["Other", m.summary.other]].filter(x => str(x[1]));
  if (sm.length){ lines.push("", "SUMMARY HIGHLIGHTS:"); for (const [k, v] of sm) lines.push("- " + k + ": " + v.slice(0, 400)); }
  const idea = m.idea.filter(x => str(x)); if (idea.length){ lines.push("", "INNOVATION COURSE (IDEA) EXAMPLES:"); idea.forEach(x => lines.push("- " + x.slice(0, 300))); }
  const js = state.entries.filter(e => (e.strength || 0) >= 2 || (e.feedback || []).some(f => f.tone === "positive")).slice(0, 25);
  if (js.length){ lines.push("", "JOURNAL HIGHLIGHTS (clinical debriefs):"); for (const e of js) lines.push("- [" + e.rotation + "] " + e.title + (e.oneLiner ? " — " + e.oneLiner : "") + ((e.themes || []).length ? ". Themes: " + e.themes.map(t => THEMES[t]).join(", ") : "") + ((e.feedback || []).filter(f => f.tone === "positive").map(f => ". Praise: \"" + f.said + "\"").join(""))); }
  const cl = Object.entries(m.clerkships).filter(([, c]) => str(c.comments));
  if (cl.length){ lines.push("", "CLERKSHIP EVALUATION EXCERPTS:"); for (const [r, c] of cl) lines.push("- " + r + (c.grade ? " (" + c.grade + ")" : "") + ": " + scrubPHI(c.comments).slice(0, 600)); }
  return lines.join("\n");
}
async function suggestNCs(){
  const rec = recordDigest();
  if (rec.length < 80){ toast("Add a few activities or journal entries first, so there's something to draw from."); return; }
  const sample = await needSample(); if (!sample) return;
  state.mspeBusy.suggest = true; state.mspeCtl = new AbortController(); renderMspe();
  const name = firstName();
  const prompt = ["You help a medical student draft the Noteworthy Characteristics section of their MSPE (Medical Student Performance Evaluation). Their dean's office finalizes it.",
    "Rules from AAMC guidance: at most three characteristics, bulleted, each two sentences or fewer.",
    "Write in third person using the name \"" + name + "\" and they/their. Each option should show program directors what is distinctive: a specific role, what the student did, and a concrete result. Use numbers only when the record states them.",
    "Never invent facts, numbers, titles, awards or outcomes. Make the options distinct from each other. Don't cram several activities into one bullet.",
    state.settings.specialty ? "Target specialty: " + state.settings.specialty + " (mention it only if the record supports it)." : "",
    "", "Reply with ONLY a JSON array of 5 objects: {\"theme\": a 2-5 word label, \"text\": the bullet, \"evidence\": array of the exact activity or entry titles it draws on}.",
    "", "STUDENT RECORD:", "<<<", rec.slice(0, 60000), ">>>"].join("\n");
  try {
    const out = await sample.json(prompt, {signal:state.mspeCtl.signal, cache:false});
    state.mspe.cands = arr(out).filter(c => c && str(c.text)).slice(0, 6).map(c => ({theme:str(c.theme), text:str(c.text), evidence:arr(c.evidence).map(str).filter(Boolean).slice(0, 5)}));
    commitMspe();
    if (!state.mspe.cands.length) toast("Claude didn't find enough to suggest from yet.");
  } catch (e){ const msg = aiError(e); if (msg) toast(msg); }
  finally { state.mspeBusy.suggest = false; if (state.view === "mspe") renderMspe(); }
}
async function tightenNC(i){
  const n = state.mspe.ncs[i]; if (!str(n.text)) return;
  const sample = await needSample(); if (!sample) return;
  state.mspeBusy["nc" + i] = true; renderMspe();
  const prompt = ["Rewrite this MSPE noteworthy characteristic so it is two sentences or fewer, in third person (\"" + firstName() + "\", they/their). Keep every fact, title and number. Cut adjectives the facts don't support. Never add facts.",
    "Reply with only the rewritten bullet, no quotes.", "", "<<<", n.text, ">>>"].join("\n");
  try { const r = await sample(prompt, {modelTier:"quick", cache:false}); const old = n.text; n.text = r.text.trim().replace(/^[-•]\s*/, ""); commitMspe(); toast("Tightened", {label:"Undo", fn:() => { n.text = old; commitMspe(true); }}); }
  catch (e){ const msg = aiError(e); if (msg) toast(msg); }
  finally { state.mspeBusy["nc" + i] = false; if (state.view === "mspe") renderMspe(); }
}

/* activities */
function blankAct(){ return {id:newId(), type:"leadership", title:"", org:"", start:"", end:"", desc:"", impact:""}; }
function actForm(a, isNew){
  const d = clone(a);
  const ongoing = h("input", {type:"checkbox", id:"af-on", checked:d.end === "present"});
  const endIn = h("input", {class:"input", id:"af-end", type:"month", value:d.end === "present" ? "" : d.end, disabled:d.end === "present", onchange:e => { d.end = e.target.value; }});
  ongoing.addEventListener("change", () => { d.end = ongoing.checked ? "present" : endIn.value; endIn.disabled = ongoing.checked; });
  const cnt = h("span", {class:"cnt", text:d.desc.length + " / 750 (ERAS)"});
  const typeSel = h("select", {class:"sel", id:"af-type", onchange:e => { d.type = e.target.value; }}, ACT_TYPES.map(([k, l]) => h("option", {value:k, text:l}))); typeSel.value = d.type;
  return h("form", {class:"aform", onsubmit:e => {
    e.preventDefault(); d.title = str(d.title); if (!d.title){ toast("Give it a title or role."); return; }
    const list = state.mspe.activities, i = list.findIndex(x => x.id === d.id);
    if (i >= 0) list[i] = d; else list.unshift(d);
    state.mspeEdit = null; commitMspe(true); toast(isNew ? "Activity added" : "Saved");
  }},
    h("div", {class:"grid3"}, h("label", {class:"field", for:"af-type"}, h("span", {class:"lbl", text:"Type"}), typeSel),
      h("label", {class:"field", for:"af-title", style:"grid-column:span 2"}, h("span", {class:"lbl", text:"Title or role"}), inp("af-title", d.title, v => { d.title = v; }, {placeholder:"President, AxisMED"}))),
    h("label", {class:"field", for:"af-org"}, h("span", {class:"lbl", text:"Organization"}), inp("af-org", d.org, v => { d.org = v; }, {placeholder:"Where it happened"})),
    h("div", {class:"grid3"}, h("label", {class:"field", for:"af-start"}, h("span", {class:"lbl", text:"Started"}), h("input", {class:"input", id:"af-start", type:"month", value:d.start, onchange:e => { d.start = e.target.value; }})),
      h("label", {class:"field", for:"af-end"}, h("span", {class:"lbl", text:"Ended"}), endIn),
      h("label", {class:"ck-row", for:"af-on", style:"align-self:end;padding-bottom:8px"}, ongoing, "Ongoing")),
    h("label", {class:"field", for:"af-desc"}, h("span", {class:"lbl", text:"What you did"}), ta("af-desc", d.desc, v => { d.desc = v; cnt.textContent = v.length + " / 750 (ERAS)"; cnt.classList.toggle("over", v.length > 750); }, {placeholder:"Your role and what you personally did."}), cnt),
    h("label", {class:"field", for:"af-imp"}, h("span", {class:"lbl", text:"Impact in numbers"}), inp("af-imp", d.impact, v => { d.impact = v; }, {placeholder:"11 teams led · $88k in grants · 2 first-author papers"})),
    h("div", {class:"rowacts"}, !isNew ? h("button", {type:"button", class:"btn sm ghost danger", onclick:() => { state.mspe.activities = state.mspe.activities.filter(x => x.id !== d.id); state.mspe.ncs.forEach(n => { n.sources = n.sources.filter(s => s !== d.id); }); state.mspeEdit = null; commitMspe(true); toast("Activity deleted"); }}, icon("trash", "sm"), "Delete") : null,
      h("span", {style:"margin-left:auto"}), h("button", {type:"button", class:"btn ghost", text:"Cancel", onclick:() => { state.mspeEdit = null; renderMspe(); }}), h("button", {type:"submit", class:"btn primary", text:isNew ? "Add activity" : "Save"})));
}
function mspeActivities(){
  const m = state.mspe, card = h("section", {class:"card"});
  const f = state.mspeFilter || "all";
  card.append(h("div", {class:"card-h"}, h("h2", {text:"Activities and achievements"}), h("div", {class:"act"}, who("you"))));
  const b = h("div", {class:"card-b"}); card.append(b);
  b.append(h("p", {class:"ksub", style:"margin:0", text:"Everything the dean's office, your noteworthy characteristics and ERAS can draw on. Numbers make the difference: people served, dollars raised, papers, teams led."}),
    h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn primary", onclick:() => { state.mspeEdit = "new"; state.mspeNew = blankAct(); renderMspe(); }}, icon("plus", "sm"), "Add activity"),
      state.ai !== false ? h("button", {type:"button", class:"btn", onclick:() => { state.cvOpen = !state.cvOpen; renderMspe(); }}, icon("spark", "sm"), "Import from CV") : null));
  if (state.cvOpen && state.ai !== false) b.append(cvBox());
  if (state.mspeEdit === "new") b.append(actForm(state.mspeNew || blankAct(), true));
  const used = new Set(m.activities.map(a => a.type));
  if (m.activities.length) b.append(h("div", {class:"chiprow"}, h("button", {type:"button", class:"chip", "aria-pressed":String(f === "all"), text:"All · " + m.activities.length, onclick:() => { state.mspeFilter = "all"; renderMspe(); }}), ACT_TYPES.filter(([k]) => used.has(k)).map(([k, l]) => h("button", {type:"button", class:"chip", "aria-pressed":String(f === k), text:l, onclick:() => { state.mspeFilter = k; renderMspe(); }}))));
  const order = ACT_TYPES.map(x => x[0]);
  const list = m.activities.filter(a => f === "all" || a.type === f).slice().sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type) || (y.start || "").localeCompare(x.start || ""));
  if (!m.activities.length && state.mspeEdit !== "new") b.append(h("div", {class:"empty"}, h("p", null, h("strong", {text:"Start with what you'd put on a CV. "}), "Leadership roles, research and publications, teaching, service and awards. Paste your CV and Claude sorts it for you, or add them one at a time.")));
  else b.append(h("ul", {class:"acts"}, list.map(a => h("li", {class:"act"}, state.mspeEdit === a.id ? actForm(a, false) :
    h("button", {type:"button", onclick:() => { state.mspeEdit = a.id; renderMspe(); }},
      h("span", {class:"ty", text:ACT_NAME[a.type]}),
      h("span", {style:"min-width:0"}, h("span", {class:"tt", text:a.title}), a.org ? h("span", {class:"sub", text:a.org}) : null, a.impact ? h("span", {class:"imp", text:a.impact}) : (a.desc ? h("span", {class:"imp", text:firstWords(a.desc, 18)}) : null)),
      h("span", {class:"dt", text:actDates(a)}))))));
  return card;
}
function cvBox(){
  const st = state.cv || (state.cv = {text:"", busy:false, found:null});
  const box = h("div", {class:"aform"});
  if (st.found){
    box.append(h("div", {class:"lbl", text:"Found " + st.found.length + " — uncheck any you don't want"}),
      h("ul", {class:"acts"}, st.found.map((a, i) => h("li", {class:"act"}, h("label", {class:"ck-row", style:"padding:10px 4px;align-items:flex-start"}, h("input", {type:"checkbox", checked:a.keep !== false, onchange:e => { a.keep = e.target.checked; }}), h("span", {style:"min-width:0"}, h("b", {style:"font-weight:500", text:a.title}), h("span", {class:"sub", style:"display:block;font-size:12.5px;color:var(--ink-3)", text:[ACT_NAME[a.type], a.org, actDates(a)].filter(Boolean).join(" · ")})))))),
      h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn ghost", text:"Start over", onclick:() => { st.found = null; renderMspe(); }}), h("span", {style:"margin-left:auto"}),
        h("button", {type:"button", class:"btn primary", onclick:() => { const add = st.found.filter(a => a.keep !== false).map(a => { const c = Object.assign({}, a); delete c.keep; return c; }); state.mspe.activities = add.concat(state.mspe.activities); state.cv = null; state.cvOpen = false; commitMspe(true); toast("Added " + add.length + (add.length === 1 ? " activity" : " activities")); }}, icon("check", "sm"), "Add selected")));
    return box;
  }
  box.append(h("label", {class:"field", for:"cv-text"}, h("span", {class:"lbl", text:"Paste your CV or activity list"}), ta("cv-text", st.text, v => { st.text = v; }, {placeholder:"Paste the text of your CV. Contact details are stripped before Claude reads it.", "data-min":"160"})),
    h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn ghost", text:"Cancel", onclick:() => { state.cvOpen = false; renderMspe(); }}), h("span", {style:"margin-left:auto"}),
      h("button", {type:"button", class:"btn primary", disabled:st.busy, onclick:importCV}, st.busy ? h("span", {class:"spin", "aria-hidden":"true"}) : icon("spark", "sm"), st.busy ? "Sorting…" : "Sort with Claude")));
  return box;
}
async function importCV(){
  const st = state.cv; const text = str(st && st.text); if (text.length < 40){ toast("Paste more of your CV first."); return; }
  const sample = await needSample(); if (!sample) return;
  st.busy = true; renderMspe();
  const clean = text.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]").replace(/(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, "[phone]").slice(0, 40000);
  const prompt = ["Turn this CV or activity list into structured activities for a medical student's MSPE and residency application prep.",
    "Reply with ONLY a JSON array. Each item: {\"type\": one of " + JSON.stringify(ACT_TYPES.map(x => x[0])) + ", \"title\": the role or item title, \"org\": organization, \"start\": \"YYYY-MM\" or \"\", \"end\": \"YYYY-MM\", \"present\" or \"\", \"desc\": 1-3 sentences on what the student did, \"impact\": numbers or outcomes stated in the text, else \"\"}.",
    "One item per distinct role, project, publication, presentation or award. Keep publication titles as written. Never invent anything; leave a field empty when the text doesn't say.",
    "", "<<<", clean, ">>>"].join("\n");
  try {
    const out = await sample.json(prompt, {cache:false});
    st.found = arr(out).filter(a => a && str(a.title)).slice(0, 80).map(a => ({id:newId(), type:ACT_NAME[a.type] ? a.type : "other", title:str(a.title), org:str(a.org), start:/^\d{4}-\d{2}$/.test(str(a.start)) ? str(a.start) : "", end:a.end === "present" ? "present" : /^\d{4}-\d{2}$/.test(str(a.end)) ? str(a.end) : "", desc:str(a.desc), impact:str(a.impact), keep:true}));
    if (!st.found.length){ st.found = null; toast("Couldn't find activities in that text."); }
  } catch (e){ const msg = aiError(e); if (msg) toast(msg); }
  finally { st.busy = false; if (state.view === "mspe") renderMspe(); }
}

/* clerkships */
function mspeRots(){ const seen = new Set(); const core = state.settings.rotations.filter(r => (r.kind === "clerkship" || CORE.includes(r.name)) && !seen.has(r.name) && seen.add(r.name)); return core.length ? core : CORE.map(n => ({name:n})); }
function rotRange(name){ const r = schedule().find(x => x.name === name && x.s); return r ? r.s.toLocaleDateString(undefined, {month:"long", year:"numeric"}) + " – " + r.e.toLocaleDateString(undefined, {month:"long", year:"numeric"}) : ""; }
function mspeClerkships(){
  const m = state.mspe, wrap = h("div", {class:"clk"});
  wrap.append(h("p", {class:"ksub", style:"margin:0 0 4px", text:"Your clerkship director writes each MSPE summary from the comments on your emailed grade form. Paste those comments here to see the story forming and check it against your journal. If a summary misrepresents you, the appeal path is the clerkship grade adjustment process in your syllabus."}));
  for (const r of mspeRots()){
    const c = m.clerkships[r.name] || (m.clerkships[r.name] = {grade:"", clinical:"", exam:"", comments:"", preview:""});
    const praise = state.entries.filter(e => e.rotation === r.name).flatMap(e => (e.feedback || []).filter(f => f.tone === "positive").map(f => ({f, e}))).slice(0, 5);
    const sel = (id, label, opts, key) => { const s = h("select", {class:"sel", id, onchange:e => { c[key] = e.target.value; commitMspe(); }}, opts.map(o => h("option", {value:o, text:o || "Not yet"}))); s.value = c[key]; return h("label", {class:"field", for:id}, h("span", {class:"lbl", text:label}), s); };
    const busy = state.mspeBusy["cl-" + r.name];
    const key = r.name.replace(/[^a-z0-9]/gi, "");
    wrap.append(h("section", {class:"card " + cc(r.name)}, h("div", {class:"card-h"}, h("span", {class:"pill"}, h("span", {class:"dot"}), r.name), h("span", {class:"muted", style:"font-size:12.5px", text:rotRange(r.name)}), h("div", {class:"act"}, who("school"))),
      h("div", {class:"card-b"},
        h("div", {class:"grid3"}, sel("cg-" + key, "Grade", GRADES, "grade"), sel("cc-" + key, "Clinical eval", COMPONENT, "clinical"), sel("ce-" + key, "Exam", COMPONENT, "exam")),
        h("label", {class:"field", for:"cm-" + key}, h("span", {class:"lbl", text:"Evaluator comments from your grade form"}), ta("cm-" + key, c.comments, v => { c.comments = v; commitMspe(); }, {placeholder:"Paste the faculty comments when your grade form arrives."})),
        praise.length ? h("div", {class:"field"}, h("span", {class:"lbl", text:"Praise you logged in your journal"}), h("ul", {class:"praise"}, praise.map(({f, e}) => h("li", null, "“" + f.said + "”", h("span", {class:"muted", text:" — " + (f.from || "Team") + ", " + fmt(entryDay(e))}))))) : null,
        c.preview ? h("div", {class:"field"}, h("span", {class:"lbl", text:"Summary preview (not the official statement)"}), h("div", {class:"cmd-out", text:c.preview})) : null,
        state.ai !== false ? h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn sm", disabled:!!busy, onclick:() => previewClerkship(r.name)}, busy ? h("span", {class:"spin", "aria-hidden":"true"}) : icon("spark", "sm"), busy ? "Drafting…" : c.preview ? "Redraft preview" : "Preview the summary statement")) : null)));
  }
  return wrap;
}
async function previewClerkship(name){
  const c = state.mspe.clerkships[name]; if (!c || !str(c.comments)){ toast("Paste the evaluator comments first."); return; }
  const sample = await needSample(); if (!sample) return;
  state.mspeBusy["cl-" + name] = true; renderMspe();
  const prompt = ["A clerkship director writes a short summary statement for a medical student's MSPE from faculty evaluation comments.",
    "Using only the comments below, draft that 3-4 sentence summary in third person (\"" + firstName() + "\", they/their). Then, on a new line starting \"Themes:\", list the 3-5 qualities evaluators repeat most. Don't invent praise or criticism. Plain text only.",
    "Rotation: " + name + (c.grade ? ". Grade: " + c.grade : ""), "", "<<<", scrubPHI(c.comments).slice(0, 20000), ">>>"].join("\n");
  try { const r = await sample(prompt, {modelTier:"quick", cache:false}); c.preview = r.text.trim(); commitMspe(); }
  catch (e){ const msg = aiError(e); if (msg) toast(msg); }
  finally { state.mspeBusy["cl-" + name] = false; if (state.view === "mspe") renderMspe(); }
}

/* summary, IDEA, academic history, identity */
function mspeRecord(){
  const m = state.mspe, wrap = h("div", {class:"bento"});
  const hiField = (key, label, ph) => h("label", {class:"field", for:"hl-" + key}, h("span", {class:"lbl", text:label}), ta("hl-" + key, m.summary[key], v => { m.summary[key] = v; commitMspe(); }, {placeholder:ph, "data-min":"64"}));
  wrap.append(h("section", {class:"card s7"}, h("div", {class:"card-h"}, h("h2", {text:"Summary highlights"}), h("div", {class:"act"}, who("you"))), h("div", {class:"card-b"},
    h("p", {class:"ksub", style:"margin:0", text:"Student Affairs works with you on these for the summary section. One or two sentences each, with the result."}),
    hiField("recognition", "Recognition", "Clinical honors, awards, positive professionalism reports"),
    hiField("dataScience", "Data science project", "What your data science study assessed and found"),
    hiField("capstone", "Capstone project", "The problem, your solution and the team you led"),
    hiField("other", "Anything else distinctive", "Optional"))));
  const idea = m.idea.length ? m.idea : [""];
  wrap.append(h("section", {class:"card s5"}, h("div", {class:"card-h"}, h("h2", {text:"IDEA course examples"}), h("div", {class:"act"}, who("you"))), h("div", {class:"card-b"},
    h("p", {class:"ksub", style:"margin:0", text:"Your sample lists up to three: the clinical problem you noticed and what you built."}),
    idea.map((x, i) => h("div", {class:"field"}, ta("idea-" + i, x, v => { m.idea[i] = v; commitMspe(); }, {placeholder:"Recognizing …, " + firstName() + " developed …", "aria-label":"IDEA example " + (i + 1), "data-min":"64"}))),
    idea.length < 3 ? h("div", null, h("button", {type:"button", class:"btn sm", onclick:() => { if (!m.idea.length) m.idea.push(""); m.idea.push(""); commitMspe(true); }}, icon("plus", "sm"), "Add example")) : null)));
  const yn = (id, label, key) => { const s = h("select", {class:"sel", id, onchange:e => { m.history[key] = e.target.value; commitMspe(); }}, ["No", "Yes"].map(v => h("option", {value:v, text:v}))); s.value = m.history[key]; return h("label", {class:"field", for:id}, h("span", {class:"lbl", text:label}), s); };
  wrap.append(h("section", {class:"card s7"}, h("div", {class:"card-h"}, h("h2", {text:"Academic history and professionalism"}), h("div", {class:"act"}, who("school"))), h("div", {class:"card-b"},
    h("p", {class:"ksub", style:"margin:0", text:"Student Affairs fills these from your record. Enter them only so you can check the final letter."}),
    h("div", {class:"grid3"}, h("label", {class:"field", for:"h-m"}, h("span", {class:"lbl", text:"Matriculated"}), h("input", {class:"input", id:"h-m", type:"month", value:m.history.matric, onchange:e => { m.history.matric = e.target.value; commitMspe(); }})),
      h("label", {class:"field", for:"h-g"}, h("span", {class:"lbl", text:"Expected graduation"}), h("input", {class:"input", id:"h-g", type:"month", value:m.history.grad, onchange:e => { m.history.grad = e.target.value; commitMspe(); }}))),
    h("label", {class:"field", for:"h-gap"}, h("span", {class:"lbl", text:"Extensions, leaves or gaps"}), inp("h-gap", m.history.gaps, v => { m.history.gaps = v; commitMspe(); }, {placeholder:"None, or a one-line explanation"})),
    h("label", {class:"field", for:"h-dual"}, h("span", {class:"lbl", text:"Dual or joint degree"}), inp("h-dual", m.history.dual, v => { m.history.dual = v; commitMspe(); }, {placeholder:"N/A"})),
    h("div", {class:"grid3"}, yn("h-rem", "Remediated coursework", "remediation"), yn("h-adv", "Adverse action", "adverse")),
    h("label", {class:"check"}, h("input", {type:"checkbox", checked:m.prof.recognized, onchange:e => { m.prof.recognized = e.target.checked; commitMspe(); }}), h("span", {text:"I received a Positive Professionalism Report"})))));
  wrap.append(h("section", {class:"card s5"}, h("div", {class:"card-h"}, h("h2", {text:"Identifying information"}), h("div", {class:"act"}, who("school"))), h("div", {class:"card-b"},
    h("label", {class:"field", for:"id-n"}, h("span", {class:"lbl", text:"Your name"}), inp("id-n", m.ident.name, v => { m.ident.name = v; commitMspe(); }, {placeholder:str(sharedProfile.myName) || "First Last"})),
    h("label", {class:"field", for:"id-u"}, h("span", {class:"lbl", text:"Undergraduate degree and institution"}), inp("id-u", m.ident.undergrad, v => { m.ident.undergrad = v; commitMspe(); }, {placeholder:"BS, Community Health, University of Illinois"})))));
  return wrap;
}

/* preview + export */
function mspePreview(){
  const m = state.mspe, fn = firstName(), name = fullName();
  const ph = t => h("div", {class:"ph", text:t});
  const doc = h("article", {class:"doc", "aria-label":"MSPE preview"});
  doc.append(h("div", {class:"note", text:"Preview built from your drafts. Dashed boxes are written by your school."}));
  doc.append(h("section", null, h("h3", {text:"Identifying information"}), h("ul", null, h("li", {text:name + " is a medical student at your school."}), m.ident.undergrad ? h("li", {text:fn + " completed their " + m.ident.undergrad + "."}) : null)));
  const ncs = m.ncs.filter(n => str(n.text));
  doc.append(h("section", null, h("h3", {text:"Noteworthy characteristics"}), ncs.length ? h("ul", null, ncs.map(n => h("li", {text:n.text}))) : ph("Draft up to three in the Noteworthy tab.")));
  doc.append(h("section", null, h("h3", {text:"Academic history"}), m.history.matric || m.history.grad ? h("ul", null,
    m.history.matric ? h("li", {text:"Initial matriculation: " + fmtMonth(m.history.matric)}) : null, m.history.grad ? h("li", {text:"Expected graduation: " + fmtMonth(m.history.grad)}) : null,
    h("li", {text:"Extensions, leaves or gaps: " + (str(m.history.gaps) || "None")}), h("li", {text:"Dual or joint degree: " + (str(m.history.dual) || "N/A")}),
    h("li", {text:"Remediated coursework: " + m.history.remediation}), h("li", {text:"Adverse action: " + m.history.adverse})) : ph("Student Affairs fills this from your enrollment record.")));
  const sec = h("section", null, h("h3", {text:"Academic progress"}), h("p", {style:"margin:0 0 8px", text:fn + " met all professional standards." + (m.prof.recognized ? " They were recognized for their positive impact on the learning environment." : "")}), ph("Preclinical coursework statement written by Student Affairs."));
  for (const r of mspeRots()){
    const c = m.clerkships[r.name] || {};
    sec.append(h("div", {class:"clk-doc"}, h("div", {class:"row2"}, h("span", {text:r.name + (rotRange(r.name) ? " (" + rotRange(r.name) + ")" : "")}), h("span", {text:"Grade: " + (c.grade || "pending")})),
      c.clinical || c.exam ? h("div", {class:"note", text:"Clinical eval: " + (c.clinical || "–") + "   Exam: " + (c.exam || "–")}) : null,
      c.preview ? h("p", {style:"margin:6px 0 0"}, c.preview.split(/\n\s*Themes:/i)[0], h("span", {class:"note", text:"  (your preview, not the official summary)"})) : ph("Summary statement written by the clerkship director from your evaluations.")));
  }
  const idea = m.idea.filter(x => str(x));
  if (idea.length) sec.append(h("div", {class:"clk-doc"}, h("div", {class:"row2"}, h("span", {text:"IDEA"})), h("ul", null, idea.map(x => h("li", {text:x})))));
  doc.append(sec);
  const hl = [["Recognition", m.summary.recognition], ["Data science project", m.summary.dataScience], ["Capstone project", m.summary.capstone], ["Highlight", m.summary.other]].filter(x => str(x[1]));
  doc.append(h("section", null, h("h3", {text:"Summary"}), ph("Your school's standard summary paragraph."), hl.length ? h("ul", {style:"margin-top:10px"}, hl.map(([k, v]) => h("li", null, h("b", {style:"font-weight:500", text:k + ": "}), v))) : null));
  return h("div", null, h("div", {class:"rowacts", style:"justify-content:flex-end;margin-bottom:12px"}, h("button", {type:"button", class:"btn", onclick:() => copyText(mspeMarkdown())}, icon("copy", "sm"), "Copy draft"), h("button", {type:"button", class:"btn", onclick:mspeExport}, icon("download", "sm"), "Download .md")), doc);
}
function mspeMarkdown(){
  const m = state.mspe, L = ["# MSPE draft — " + fullName(), "", "Drafted " + new Date().toLocaleDateString() + ". Student Affairs writes the final MSPE; this collects what I'm contributing.", ""];
  const ncs = m.ncs.filter(n => str(n.text)); L.push("## Noteworthy characteristics", ""); ncs.length ? ncs.forEach(n => L.push("- " + n.text)) : L.push("_Not drafted yet._"); L.push("");
  const hl = [["Recognition", m.summary.recognition], ["Data science project", m.summary.dataScience], ["Capstone project", m.summary.capstone], ["Other", m.summary.other]].filter(x => str(x[1]));
  if (hl.length){ L.push("## Summary highlights", ""); hl.forEach(([k, v]) => L.push("- **" + k + ":** " + str(v))); L.push(""); }
  const idea = m.idea.filter(x => str(x)); if (idea.length){ L.push("## IDEA examples", ""); idea.forEach(x => L.push("- " + str(x))); L.push(""); }
  if (m.activities.length){ L.push("## Activities and achievements", ""); for (const [k, l] of ACT_TYPES){ const as = m.activities.filter(a => a.type === k); if (!as.length) continue; L.push("### " + l, ""); for (const a of as) L.push("- **" + a.title + "**" + (a.org ? ", " + a.org : "") + (actDates(a) ? " (" + actDates(a) + ")" : "") + (a.desc ? ". " + str(a.desc) : "") + (a.impact ? " _Impact:_ " + a.impact : "")); L.push(""); } }
  const cl = mspeRots().filter(r => { const c = m.clerkships[r.name]; return c && (c.grade || str(c.comments)); });
  if (cl.length){ L.push("## Clerkship record", ""); for (const r of cl){ const c = m.clerkships[r.name]; L.push("### " + r.name + (c.grade ? " — " + c.grade : "") + (c.clinical || c.exam ? " (Clinical eval " + (c.clinical || "–") + ", Exam " + (c.exam || "–") + ")" : ""), ""); if (str(c.comments)) L.push("Evaluator comments: " + str(c.comments), ""); if (str(c.preview)) L.push("My summary preview (not official): " + str(c.preview), ""); } }
  if (m.history.matric || m.history.grad){ L.push("## Academic history (to check against the final letter)", "", "- Matriculated: " + fmtMonth(m.history.matric), "- Expected graduation: " + fmtMonth(m.history.grad), "- Extensions, leaves or gaps: " + (str(m.history.gaps) || "None"), "- Dual or joint degree: " + (str(m.history.dual) || "N/A"), ""); }
  return L.join("\n");
}
async function mspeExport(){
  const md = mspeMarkdown(), dl = await getDownloads();
  if (!dl){ copyText(md); return; }
  try { await dl.save({filename:"mspe-draft-" + todayKey() + ".md", data:md}); toast("Saved"); }
  catch (e){ const c = e && e.code; if (c === "declined") return; toast("Download isn't available here, so it was copied instead."); copyText(md); }
}

state.mspe = normMspe(lsGet(K_MSPE)); state.mspeTab = "noteworthy"; state.mspeBusy = {}; state.mspeEdit = null;

/* ---------- shell ---------- */
function typingIn(host){ const a = document.activeElement; return !!(a && host && host.contains(a) && a.matches("input:not([type=radio]):not([type=date]),textarea")); }
function renderShell(){
  const nav = $("#sideNav"); nav.textContent = "";
  for (const [v, label, ic] of VIEWS) nav.append(h("button", {type:"button", "aria-current":state.view === v ? "page" : null, onclick:() => go(v)}, icon(ic), label, v === "journal" && state.entries.length ? h("span", {class:"n", text:String(state.entries.length)}) : null));
  const tb = $("#tabbar"); tb.textContent = "";
  for (const [v, label, ic] of VIEWS.slice(0, 4)) tb.append(h("button", {type:"button", "aria-current":state.view === v ? "page" : null, onclick:() => go(v)}, icon(ic), v === "vault" ? "Vault" : label));
  const rl = $("#sideRots"); rl.textContent = "";
  const cur = currentRotation(), sched = schedule(), curR = rotationOn(todayKey());
  for (const r of sched){
    const n = entriesFor(r).length, isNow = curR ? curR.id === r.id : r.name === cur;
    rl.append(h("li", null, h("button", {type:"button", class:cc(r.name), title:r.s ? fmt(dayKey(r.s)) + " – " + fmt(dayKey(r.e)) : r.name, onclick:() => { state.filter = {q:"", rot:r.name, comp:"all"}; go("journal"); }},
      h("span", {class:"dot"}), h("span", {class:"nm", text:r.name}), isNow ? h("span", {class:"now", text:"now"}) : n ? h("span", {class:"cnt", text:String(n)}) : null)));
  }
  const f = $("#sideFoot"); f.textContent = "";
  f.append(themeSeg(), h("span", {class:"status" + (state.mode === "browser" ? " local" : "")}, h("i"), storeNote()));
  renderThemeControls();
}

/* ---------- today ---------- */
/* Today keeps one card: today's question and the button that starts it. The rotation facts live on Journal;
   only an ending rotation's evaluation-and-letter nudge rides along here. */
function renderToday(soft){
  const host = $("#view-today"); if (!host || (soft && typingIn(host))) return; host.textContent = "";
  const t = todayKey(), cur = currentRotation(), sch = rotationOn(t);
  const draftWords = wordsIn(pad.value), today = entriesOn(t);
  const hero = h("section", {class:"hero " + cc(cur), "aria-labelledby":"heroQ"});
  hero.append(h("div", {class:"hero-top"},
    h("h2", {class:"hq", id:"heroQ"}, today.length ? "Anything else from " : "What happened on ", h("span", {class:"rot", text:cur}), " today?"),
    today.length ? h("p", {class:"logged"}, h("span", {class:"gk"}, icon("check")), today.length === 1 ? "1 entry today" : today.length + " entries today") : null),
    h("p", {class:"lead", text:draftWords ? "Your draft is waiting: “" + firstWords(pad.value, 12) + "”" : "Two minutes is enough. Talk it out and Claude tidies it after. Private to you."}));
  hero.append(h("div", {class:"hero-act"},
    h("button", {type:"button", class:"micbtn", "aria-label":draftWords ? "Continue your draft" : "Start a debrief", onclick:() => openComposer()}, icon("mic")),
    h("div", {class:"hero-lbl"}, h("b", {text:draftWords ? "Continue draft" : today.length ? "Add another" : "Start debrief"}), h("span", null, draftWords ? draftWords + " words saved" : null, h("span", {class:"kbd-hint"}, (draftWords ? " · " : "") + "or press", h("kbd", {text:"N"}))))));
  if (today.length) hero.append(h("ul", {class:"mini"}, today.map(e => h("li", null, h("button", {type:"button", class:cc(e.rotation), onclick:() => openEntry(e.id)}, h("span", {class:"dot"}), h("span", {class:"tt", text:e.title}), (e.strength || 0) > 0 ? dots(e.strength) : null, icon("chevR", "sm"))))));
  const strip = thisRotation(cur, sch, true);
  if (strip) hero.append(strip);
  host.append(hero);
}
/* Three facts for the rotation you're on: the evaluation deadline and who to ask for a letter, the competencies this
   rotation hasn't touched yet, and the next interview question without a story. School supplies the deadline; the
   journal supplies the rest; nothing here is written back to School. */
function thisRotation(cur, sch, endingOnly){
  if (!cur || !sch) return null;
  const now = new Date(), left = diffDays(sch.e, now), mine = state.entries.filter(e => e.rotation === cur);
  const cards = [];
  const ev = [...deadlineIndex.values()].flat().find(d => /^Evaluations due for /.test(d.label) && d.label.endsWith(cur) && d.date >= dayKey(sch.e));
  const w = letterWriters(cur).find(x => x.pos > 0) || letterWriters(cur)[0];
  if (left <= 14){
    const evText = ev ? "Evaluations due " + fmt(ev.date, {weekday:"short", month:"short", day:"numeric"}) + (ev.code ? " (" + ev.code + ")" : "") + ". " : "";
    cards.push({k:cur + " ends " + (left <= 0 ? "today" : "in " + left + (left === 1 ? " day" : " days")), t:w ? evText + (w.pos ? w.name + " praised your work " + (w.pos === 1 ? "once" : w.pos + " times") + "; ask about a letter before you leave." : w.name + " saw your work; ask about a letter before you leave.") : evText + "No attending named in your debriefs yet. Name one who saw your work.", fn:() => w ? go("vault") : openComposer({insert:"Attending who saw my work this rotation: "}), warn:!!ev && left <= 7});
  }
  if (endingOnly){ if (!cards.length) return null; }
  else {
  const got = new Set(mine.flatMap(e => e.competencies || [])), miss = COMP_KEYS.filter(c => !got.has(c));
  cards.push(mine.length ? {k:"Competencies on " + cur, t:miss.length ? "Not yet: " + miss.map(c => COMP_NAME[c]).join(", ") + "." : "All six covered on this rotation.", fn:() => go("vault")}
    : {k:"Competencies on " + cur, t:"No " + cur + " debriefs yet. Each one fills a row of your clerkship by competency grid.", fn:() => openComposer()});
  const q = PROMPTS.find(p => !storyMatches(p.themes).length);
  if (q) cards.push({k:"Interview story missing", t:"“" + q.q + "”", fn:() => openComposer({insert:"A story for: " + q.q + "\n"})});
  }
  return h("section", {class:"rot-strip", "aria-label":"This rotation"}, cards.map(c => h("button", {type:"button", class:"rs-card" + (c.warn ? " warn" : ""), onclick:c.fn}, h("span", {class:"rs-k", text:c.k}), h("span", {class:"rs-t", text:c.t}))));
}
/* the rest of Perl's Today now opens History: your year as a path, what's next, and this week */
function renderExtras(bento){
  const t = todayKey(), now = new Date();
  bento.append(journeyCard());

  // Up next
  const nl = nudges();
  bento.append(h("section", {class:"card s4"}, h("div", {class:"card-h"}, h("h2", {text:"Up next"})),
    h("div", {class:"card-b"}, h("ul", {class:"todo"}, nl.map(n => h("li", null, h("button", {type:"button", class:n.done ? "done" : n.warn ? "warn" : "", onclick:n.fn}, h("span", {class:"ck"}, icon("check")), h("span", null, h("span", {class:"t", text:n.t}), h("span", {class:"s", text:n.s})), icon("chevR", "sm chev"))))))));

  // This week
  const ws = weekStart(now); const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const weekEntries = state.entries.filter(e => { const d = parseDay(entryDay(e)); return d >= ws && d <= addDays(ws, 6); });
  const doneDays = new Set(weekEntries.map(entryDay)).size;
  bento.append(h("section", {class:"card s8"}, h("div", {class:"card-h"}, h("h2", {text:"This week"}), h("div", {class:"act"}, h("button", {type:"button", class:"btn sm ghost", onclick:() => { state.cal.month = monthStart(now); state.cal.sel = t; go("calendar"); }}, "Calendar", icon("arrowR", "sm")))),
    h("div", {class:"card-b"},
      h("div", {class:"week"}, days.map(d => { const k = dayKey(d), r = rotationOn(k), es = entriesOn(k);
        return h("button", {type:"button", class:"wday" + (es.length ? " done" : "") + (k === t ? " today" : "") + (d > now && k !== t ? " future" : "") + (r ? " " + cc(r.name) : ""), "aria-label":fmt(k, {weekday:"long", month:"short", day:"numeric"}) + (es.length ? ", debriefed" : ""), onclick:() => { state.cal.sel = k; state.cal.month = monthStart(d); go("calendar"); }},
          h("span", {class:"wn", text:d.toLocaleDateString(undefined, {weekday:"short"})}), h("span", {class:"wd", text:String(d.getDate())}), h("span", {class:"wr"}), h("span", {class:"wc", text:es.length > 1 ? "×" + es.length : ""})); })),
      h("div", {class:"wsum"}, doneDays ? h("span", null, h("b", {text:String(doneDays)}), (doneDays === 1 ? " day" : " days") + " logged this week") : h("span", {text:"A new week. Nothing to catch up on."})),
      weekEntries.length ? h("ul", {class:"mini"}, weekEntries.slice(0, 3).map(e => h("li", null, h("button", {type:"button", class:cc(e.rotation), onclick:() => openEntry(e.id)}, h("span", {class:"dot"}), h("span", {class:"tt", text:e.title}), h("span", {class:"muted", style:"font:400 11.5px var(--mono)", text:relDay(entryDay(e))}), icon("chevR", "sm"))))) : null)));
}
function bestRun(){ const days = [...new Set(state.entries.map(entryDay))].sort(); let best = 0, run = 0, prev = null; for (const d of days){ run = prev && diffDays(parseDay(d), parseDay(prev)) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; } return best; }
function momentum(){
  const t = todayKey(), days = new Set(state.entries.map(entryDay));
  if (!state.entries.length) return ["Fresh page.", "Today's debrief starts your run."];
  if (days.has(t)){ const r = streak(); return r > 1 ? [r + " days running.", "Each one makes September easier."] : ["Logged today.", "That's the habit. Same time tomorrow."]; }
  const last = [...days].sort().pop(), gap = diffDays(new Date(), parseDay(last));
  if (gap === 1) return ["Yesterday's on the page.", "Tonight keeps it going."];
  return ["Last debrief " + (gap < 7 ? parseDay(last).toLocaleDateString(undefined, {weekday:"long"}) : fmt(last)) + ".", "Pick it up tonight. Every entry still counts."];
}
let journeyDrawn = false;
function journeyCard(){
  const card = h("section", {class:"card s12"}, h("div", {class:"card-h"}, h("h2", {text:"Your clerkship year"}), h("div", {class:"act"}, h("button", {type:"button", class:"btn sm ghost", text:"Edit schedule", onclick:() => toGo("schedule")}))));
  const b = h("div", {class:"card-b"}); card.append(b);
  const [big, small] = momentum(), cur = currentRotation();
  const rotDays = new Set(state.entries.filter(e => e.rotation === cur).map(entryDay)).size;
  const words = state.entries.reduce((a, e) => a + (e.words || 0), 0);
  b.append(h("div", {class:"mo"}, h("p", {class:"big", text:big}), h("p", {class:"small", text:small})),
    h("div", {class:"jstats"}, h("span", null, h("b", {text:String(rotDays)}), " days logged on " + cur), h("span", null, "best run ", h("b", {text:String(bestRun())})), h("span", null, h("b", {text:coveredPrompts() + "/" + PROMPTS.length}), " questions covered"), h("span", null, h("b", {text:words >= 1000 ? (words / 1000).toFixed(1) + "k" : String(words)}), " words")));
  if (!hasSchedule()){
    b.append(h("p", {class:"bridge-note"}, "Your year lays out here once your rotations are set. ", h("a", {href:"#schedule", text:"Pick your track on Schedule"}), "."));
    return card;
    const anchor = state.settings.current;
    const inp = h("input", {class:"input", id:"setupDate", type:"date", value:todayKey()});
    b.append(h("p", {class:"muted", style:"margin:4px 0 0;max-width:60ch;font-size:13px", text:"Tell it when " + anchor + " started and your whole year lays out as a path, with every debrief as a step. Lengths are typical placeholders you can edit."}),
      h("form", {class:"setup", onsubmit:e => { e.preventDefault(); if (!isDayKey(inp.value)) return; buildSchedule(anchor, inp.value); commitSettings(); toast("Schedule built. Adjust lengths in Toolkit."); }},
        h("label", {class:"field"}, h("span", {class:"lbl", text:anchor + " started on"}), inp), h("button", {type:"submit", class:"btn primary", text:"Build my path"}), h("button", {type:"button", class:"btn ghost", onclick:pickSchedule}, icon("upload", "sm"), "Import schedule instead")));
    return card;
  }
  const sch = schedule().filter(r => r.s); const min = sch.reduce((a, r) => r.s < a ? r.s : a, sch[0].s), max = sch.reduce((a, r) => r.e > a ? r.e : a, sch[0].e);
  const total = diffDays(max, min) + 1, pos = d => clamp(diffDays(d, min) / total * 100, 0, 100), now = new Date();
  const path = h("div", {class:"jpath" + (journeyDrawn ? "" : " draw"), role:"group", "aria-label":"Clerkship path from " + fmt(dayKey(min)) + " to " + fmt(dayKey(max)) + ", " + state.entries.length + " debriefs logged"});
  for (const r of sch){
    const len = diffDays(r.e, r.s) + 1, done = diffDays(now, r.e) > 0, frac = clamp((diffDays(now, r.s) + 1) / len, 0, 1);
    path.append(h("button", {type:"button", class:"jstage " + cc(r.name), style:"left:" + pos(r.s).toFixed(3) + "%;width:" + (len / total * 100).toFixed(3) + "%;background:none;border:0;padding:0;text-align:left", title:r.name + " · " + fmt(dayKey(r.s)) + " – " + fmt(dayKey(r.e)), onclick:() => { state.filter = {q:"", rot:r.name, comp:"all"}; go("journal"); }},
      h("span", {class:"nm", text:r.name}), h("span", {class:"dt", text:fmt(dayKey(r.s))}),
      h("span", {class:"jseg"}), frac > 0 ? h("span", {class:"jseg past", style:"width:calc(" + (frac * 100).toFixed(2) + "% - " + (frac >= 1 ? 4 : 0) + "px)"}) : null,
      done ? h("span", {class:"jend", title:r.name + " complete"}, icon("check")) : null));
  }
  for (const e of state.entries){ const d = parseDay(entryDay(e)); if (d < min || d > max) continue; path.append(h("span", {class:"jstep " + cc(e.rotation), style:"left:" + pos(d).toFixed(3) + "%", title:e.title + " · " + relDay(entryDay(e))})); }
  if (now >= min && now <= max){
    const p = pos(now), sr = rotationOn(todayKey());
    path.append(h("span", {class:"jnow", style:"left:" + p.toFixed(3) + "%", title:"Today"}, h("i")),
      h("span", {class:"jnow-l" + (p < 8 ? " l" : p > 92 ? " r" : ""), style:"left:" + p.toFixed(3) + "%", text:"Today" + (sr ? " · day " + (diffDays(now, sr.s) + 1) + " of " + sr.weeks * 7 : "")}));
  }
  journeyDrawn = true;
  b.append(h("div", {class:"jscroll"}, path));
  return card;
}

/* ---------- calendar ---------- */
function renderCalendar(){
  const host = $("#view-calendar"); host.textContent = "";
  host.append(h("div", {class:"vh"}, h("div", null, h("div", {class:"eyebrow", text:"Your debriefs over time, on the shared schedule"}), h("h1", {text:"History"}))));
  const extras = h("div", {class:"dbf-extras bento"}); renderExtras(extras); host.append(extras);
  const m = state.cal.month, t = todayKey();
  const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0), nowD = new Date();
  const elapsed = mEnd < nowD ? mEnd.getDate() : (m > nowD ? 0 : nowD.getDate());
  const logged = new Set(state.entries.map(entryDay).filter(k => { const d = parseDay(k); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })).size;
  host.append(h("div", {class:"vh"}, h("div", null, h("h2", {style:"font:500 20px/26px var(--display);margin:0", text:m.toLocaleDateString(undefined, {month:"long", year:"numeric"})}),
      elapsed ? h("div", {class:"msum"}, h("span", null, h("b", {text:String(logged)}), " of " + elapsed + " days logged" + (mEnd < nowD ? "" : " so far")), h("span", {class:"prog gold"}, h("i", {style:"width:" + Math.round(logged / elapsed * 100) + "%"}))) : null),
    h("div", {class:"vh-r"}, h("button", {type:"button", class:"btn sm ghost", onclick:pickSchedule}, icon("calendar", "sm"), "Schedule"), h("button", {type:"button", class:"btn sm", text:"Today", onclick:() => { state.cal.month = monthStart(new Date()); state.cal.sel = t; renderCalendar(); }}),
      h("button", {type:"button", class:"iconbtn", "aria-label":"Previous month", onclick:() => { state.cal.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); renderCalendar(); }}, icon("chevL")),
      h("button", {type:"button", class:"iconbtn", "aria-label":"Next month", onclick:() => { state.cal.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); renderCalendar(); }}, icon("chevR")))));
  const start = weekStart(m); const cal = h("section", {class:"card cal"});
  const dow = h("div", {class:"cal-dow"}); for (let i = 0; i < 7; i++) dow.append(h("span", {text:addDays(start, i).toLocaleDateString(undefined, {weekday:"short"})})); cal.append(dow);
  const visRot = new Set();
  for (let w = 0; w < 6; w++){
    const ws = addDays(start, w * 7); if (w >= 4 && ws.getMonth() !== m.getMonth() && ws > m) break;
    const wk = h("div", {class:"cal-wk"}), cells = h("div", {class:"cal-cells"}); wk.append(cells);
    const rots = [];
    for (let i = 0; i < 7; i++){
      const d = addDays(ws, i), k = dayKey(d), es = entriesOn(k), r = rotationOn(k); rots.push(r ? r.name : null); if (r) visRot.add(r.name);
      const si = schedOn(k), showE = es.slice(0, 2), showS = si.slice(0, 3 - showE.length), more = es.length - showE.length + si.length - showS.length, keyDay = si.some(e => KEY_KINDS.has(e.kind));
      const cell = h("div", {class:"cal-d" + (es.length ? " done" : "") + (d.getMonth() !== m.getMonth() ? " out" : "") + (k === t ? " today" : "") + (k === state.cal.sel ? " sel" : ""), role:"button", tabindex:"0", "aria-label":fmt(k, {weekday:"long", month:"long", day:"numeric"}) + (es.length ? ", debriefed, " + es.length + (es.length === 1 ? " entry" : " entries") : ""), onclick:() => { state.cal.sel = k; renderCalendar(); }, onkeydown:ev => { if (ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); state.cal.sel = k; renderCalendar(); } }},
        h("span", {class:"dn", text:String(d.getDate())}), h("span", {class:"cal-gap"}),
        showE.map(e => h("span", {class:"ep " + cc(e.rotation), "aria-hidden":"true", onclick:ev => { ev.stopPropagation(); openEntry(e.id); }}, h("span", {class:"dot"}), h("span", {text:e.title}))),
        showS.map(e => h("span", {class:"si k-" + e.kind, title:[e.time, e.title, ...e.details].filter(Boolean).join(" · ")}, e.time ? h("span", {class:"tm", text:fmtMin(startMin(e.time)) || e.time}) : null, h("span", {text:e.title}))),
        deadlinesOn(k).filter(x => !x.holiday).slice(0, 1).map(x => h("span", {class:"si sd st-" + x.status, title:x.label + (x.code ? " · " + x.code : "")}, h("span", {text:x.label}))),
        more > 0 ? h("span", {class:"ep-more", text:"+" + more + " more"}) : null,
        es.length || keyDay ? h("span", {class:"cal-dotrow"}, es.slice(0, 4).map(e => h("i", {class:cc(e.rotation)})), keyDay ? h("i", {class:"kx"}) : null) : null);
      cells.append(cell);
    }
    let i = 0;
    while (i < 7){ if (!rots[i]){ i++; continue; } let j = i; while (j + 1 < 7 && rots[j + 1] === rots[i]) j++; const n = j - i + 1;
      wk.append(h("div", {class:"cal-bar " + cc(rots[i]), style:"left:calc(" + (i / 7 * 100).toFixed(4) + "% + 4px);width:calc(" + (n / 7 * 100).toFixed(4) + "% - 8px)", text:rots[i]})); i = j + 1; }
    cal.append(wk);
  }
  const sel = state.cal.sel, sr = rotationOn(sel), ses = entriesOn(sel), ssi = schedOn(sel);
  const side = h("section", {class:"card"}, h("div", {class:"card-h"}, h("h2", {text:fmt(sel, {weekday:"long", month:"long", day:"numeric"})})),
    h("div", {class:"card-b"},
      ses.length ? h("div", {class:"daydone"}, h("span", {class:"logged"}, h("span", {class:"gk"}, icon("check")), "Logged")) : null,
      sr ? h("div", null, h("span", {class:"pill " + cc(sr.name)}, h("span", {class:"dot"}), sr.name), h("span", {class:"muted", style:"margin-left:8px;font-size:12.5px", text:"Day " + (diffDays(parseDay(sel), sr.s) + 1) + " of " + sr.weeks * 7})) : null,
      deadlinesOn(sel).length ? h("div", null, h("div", {class:"lbl", style:"margin-bottom:2px", text:"School"}), h("ul", {class:"sched-list"}, deadlinesOn(sel).map(x => h("li", {class:"sd st-" + x.status}, h("span", {class:"tm", text:x.holiday ? "Holiday" : x.status === "done" ? "Done" : "Due"}), h("span", null, h("b", {text:x.label}), x.code ? h("span", {class:"d", text:x.code + " · the policy governs; check it off in School"}) : null))))) : null,
      ssi.length ? h("div", null, h("div", {class:"lbl", style:"margin-bottom:2px", text:"Schedule"}), h("ul", {class:"sched-list"}, ssi.map(e => h("li", {class:"k-" + e.kind}, h("span", {class:"tm", text:e.time || "All day"}), h("span", null, h("b", null, e.title, ["exam","due","call"].includes(e.kind) ? h("span", {class:"kbadge k-" + e.kind, text:e.kind === "due" ? "Due" : e.kind === "call" ? "Call" : "Exam"}) : null), e.details.length ? h("span", {class:"d", text:e.details.join(" · ")}) : null))))) : null,
      ses.length ? h("div", null, ssi.length ? h("div", {class:"lbl", style:"margin-bottom:6px", text:"Debriefs"}) : null, h("ul", {class:"daylist"}, ses.map(e => h("li", null, h("button", {type:"button", class:"dayitem " + cc(e.rotation), onclick:() => openEntry(e.id)}, h("b", {text:e.title}), e.oneLiner ? h("span", {text:e.oneLiner}) : null))))) : h("p", {class:"muted", style:"margin:0", text:parseDay(sel) > new Date() ? "Nothing logged yet. This day hasn't happened." : "No debrief for this day."}),
      parseDay(sel) <= new Date() ? h("button", {type:"button", class:"btn" + (ses.length ? "" : " primary"), onclick:() => openComposer({date:sel})}, icon("plus", "sm"), sel === t ? "Debrief today" : "Debrief this day") : null));
  host.append(h("div", {class:"cal-wrap"}, cal, side));
  if (visRot.size) host.append(h("div", {class:"legend", style:"margin-top:14px"}, [...visRot].map(r => h("span", {class:cc(r)}, h("i", {style:"background:var(--rf)"}), r))));
  else if (!hasSchedule()) host.append(h("div", {class:"legend", style:"margin-top:14px"}, h("span", {text:"Rotation bars appear once your track is set on Schedule."}), h("button", {type:"button", class:"btn sm", onclick:pickSchedule}, icon("calendar", "sm"), "Open Schedule")));
}

/* ---------- journal ---------- */
$("#q").addEventListener("input", e => { state.filter.q = e.target.value; renderJournalList(); });
function renderJournal(){
  const fr = $("#frot"), fc = $("#fcomp"); fr.textContent = ""; fc.textContent = "";
  const js = $("#jstrip"); if (js){ js.textContent = ""; const cur = currentRotation(), st = thisRotation(cur, rotationOn(todayKey())); if (st) js.append(st); }
  const used = new Set(state.entries.map(e => e.rotation));
  fr.append(h("button", {type:"button", class:"chip", "aria-pressed":String(state.filter.rot === "all"), text:"All rotations", onclick:() => { state.filter.rot = "all"; renderJournal(); }}));
  for (const r of allRotations().filter(x => used.has(x))) fr.append(h("button", {type:"button", class:"chip " + cc(r), "aria-pressed":String(state.filter.rot === r), onclick:() => { state.filter.rot = r; renderJournal(); }}, h("span", {class:"dot"}), r));
  for (const c of ["all", ...COMP_KEYS, "none"]) fc.append(h("button", {type:"button", class:"chip", "aria-pressed":String(state.filter.comp === c), title:COMP_NAME[c] || "", text:c === "all" ? "Any competency" : c === "none" ? "Untagged" : COMP_NAME[c], onclick:() => { state.filter.comp = c; renderJournal(); }}));
  if ($("#q").value !== state.filter.q) $("#q").value = state.filter.q;
  renderJournalList();
}
function filtered(){
  const q = state.filter.q.trim().toLowerCase();
  return state.entries.filter(e => (state.filter.rot === "all" || e.rotation === state.filter.rot) &&
    (state.filter.comp === "all" || (state.filter.comp === "none" ? !(e.competencies || []).length : (e.competencies || []).includes(state.filter.comp))) &&
    (!q || [e.title, e.text, e.oneLiner, (e.themes || []).map(t => THEMES[t]).join(" "), (e.people || []).map(p => p.name).join(" "), e.rotation].join(" ").toLowerCase().includes(q)));
}
function renderJournalList(){
  const host = $("#jlist"); host.textContent = "";
  if (!state.loaded){ host.append(h("div", {class:"empty"}, h("p", {text:"Loading your journal…"}))); return; }
  if (!state.entries.length){
    host.append(h("div", {class:"empty"}, h("p", null, h("strong", {text:"No entries yet. "}), "Each debrief lands here tagged by rotation, ACGME competency and interview theme, so you can find the right story in September instead of reconstructing it."),
      h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn primary", onclick:() => openComposer()}, icon("plus", "sm"), "Write today's debrief"), h("button", {type:"button", class:"btn", text:"Add 3 example entries", onclick:addExamples}))));
    return;
  }
  if (state.offline || outbox().length) host.append(h("p", {class:"ksub", role:"status", style:"margin:0 0 10px", text:state.offline ? "Can't reach your account, so recent entries from your other devices may be missing here. New entries are kept on this device and sent when you're back." : outbox().length === 1 ? "One entry is saved on this device and waiting to go to your account." : outbox().length + " entries are saved on this device and waiting to go to your account."}));
  const list = filtered();
  if (!list.length){ host.append(h("div", {class:"empty"}, h("p", {text:"Nothing matches those filters."}), h("button", {type:"button", class:"btn sm", text:"Clear filters", onclick:() => { state.filter = {q:"", rot:"all", comp:"all"}; renderJournal(); }}))); return; }
  const thisWk = dayKey(weekStart(new Date())), lastWk = dayKey(addDays(weekStart(new Date()), -7));
  const newest = state.entries.reduce((a, e) => !a || (e.createdAt || "") > (a.createdAt || "") ? e : a, null)?.id;
  const groups = new Map();
  for (const e of list){ const ws = dayKey(weekStart(parseDay(entryDay(e)))); if (!groups.has(ws)) groups.set(ws, []); groups.get(ws).push(e); }
  for (const [ws, es] of groups){
    const label = ws === thisWk ? "This week" : ws === lastWk ? "Last week" : fmt(ws) + " – " + fmt(dayKey(addDays(parseDay(ws), 6)));
    host.append(h("div", {class:"jgroup"}, h("div", {class:"jgh"}, h("span", {text:label}), h("span", {text:"· " + es.length})),
      h("ul", {class:"jrows card"}, es.map(e => { const isNew = e.id === newest && Date.now() - Date.parse(e.createdAt || 0) < 12 * 36e5; const anim = isNew && !freshShown.has(e.id); if (anim) freshShown.add(e.id);
        return h("li", null, h("button", {type:"button", class:"jr " + cc(e.rotation) + (anim ? " fresh" : ""), onclick:() => openEntry(e.id)},
        h("span", {style:"min-width:0"}, h("span", {class:"tt", text:e.title || "Untitled entry"}), h("span", {class:"ol"}, h("span", {class:"rn", text:e.rotation}), e.oneLiner ? " · " + e.oneLiner : "")),
        h("span", {class:"tg"}, isNew ? h("span", {class:"tag gold", text:"Just logged"}) : null, e.example ? h("span", {class:"tag ex", text:"Example"}) : null, (e.competencies || []).slice(0, 3).map(c => h("span", {class:"tag", title:COMP_NAME[c], text:c})), (e.strength || 0) > 0 ? dots(e.strength) : null),
        h("span", {class:"dt", text:relDay(entryDay(e))}))); }))));
  }
}
const freshShown = new Set();

/* ---------- vault ---------- */
const draftEls = {};
function renderVault(){
  const host = $("#view-vault"); host.textContent = "";
  const es = state.entries, rots = allRotations().filter(r => state.settings.rotations.some(x => x.name === r) || es.some(e => e.rotation === r));
  host.append(h("div", {class:"vh"}, h("div", null, h("div", {class:"eyebrow", text:"Applying " + (state.settings.specialty ? "in " + state.settings.specialty : "to residency")}), h("h1", {text:"Residency vault"}), h("div", {class:"sub", text:es.length ? "What your journal can prove when you sit down to write ERAS and prep interviews." : "Save a few debriefs and this fills in: competencies you can back up, questions you have stories for, and who saw your best work."})),
    h("div", {class:"vh-r"}, h("button", {type:"button", class:"btn", disabled:!es.length, onclick:downloadExport}, icon("download", "sm"), "Export"))));
  const covered = coveredPrompts(), gaps = compGaps(), writers = letterWriters();
  const mr = mspeReady();
  host.append(h("section", {class:"card", style:"margin-bottom:16px"}, h("div", {class:"card-b", style:"padding-top:20px;grid-template-columns:minmax(0,1fr) auto;align-items:center"},
    h("div", {style:"display:grid;gap:8px;min-width:0"}, h("div", {style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"}, icon("letter", "sm"), h("b", {style:"font-weight:500", text:"Your MSPE draft"}), h("span", {class:"muted", style:"font-size:12.5px", text:Math.min(mr.nc, 3) + " of 3 noteworthy characteristics · " + mr.acts + " activities · " + mr.tracked + " of " + mr.total + " clerkships tracked"})), h("div", {class:"prog gold"}, h("i", {style:"width:" + Math.round(mr.pct * 100) + "%"}))),
    h("button", {type:"button", class:"btn", onclick:() => go("mspe")}, "Open builder", icon("arrowR", "sm")))));
  host.append(h("div", {class:"sumrow"},
    sumCard(covered, "/ " + PROMPTS.length, "Interview questions covered", covered / PROMPTS.length),
    sumCard(6 - gaps.length, "/ 6", "Competencies with evidence", (6 - gaps.length) / 6),
    sumCard(es.filter(e => (e.strength || 0) >= 2).length, "", "Interview-ready stories", null),
    sumCard(writers.filter(w => w.pos).length, "", "Letter candidates", null)));
  const bento = h("div", {class:"bento"}); host.append(bento);

  // Story bank
  const ql = h("ul", {class:"qlist"});
  PROMPTS.forEach((p, i) => {
    const m = storyMatches(p.themes), best = m[0], st = state.drafts[i] || {};
    const li = h("li", {class:"q" + (best ? " has" : "")});
    li.append(h("div", {class:"qhead"}, h("span", {class:"ck"}, icon("check")),
      h("div", {style:"min-width:0"}, h("div", {class:"qtext", text:p.q}), h("div", {class:"qmatch"}, best ? [h("button", {type:"button", text:best.title, onclick:() => openEntry(best.id)}), dots(best.strength || 0), m.length > 1 ? h("span", {text:"+" + (m.length - 1) + " more"}) : null] : h("span", {text:"No story yet"}))),
      h("div", {class:"qacts"}, best && state.ai !== false ? (st.busy ? h("button", {type:"button", class:"btn sm ghost", text:"Stop", onclick:() => st.ctl && st.ctl.abort()}) : h("button", {type:"button", class:"btn sm", onclick:() => draftAnswer(i)}, icon("spark", "sm"), st.text ? "Redraft" : "Draft")) : null)));
    if (st.busy || st.text){ const out = h("div", {class:"draft", text:st.text || "Thinking…"}); draftEls[i] = out; li.append(out); if (st.text && !st.busy) li.append(h("div", {class:"rowacts", style:"margin-left:30px"}, h("button", {type:"button", class:"btn sm", onclick:() => copyText(st.text)}, icon("copy", "sm"), "Copy"), h("span", {class:"cnt", text:"Fill anything marked [add detail]. Say it out loud twice."}))); }
    else delete draftEls[i];
    if (st.err) li.append(h("div", {class:"cnt over", style:"margin-left:30px", text:st.err}));
    ql.append(li);
  });
  bento.append(h("section", {class:"card s7"}, h("div", {class:"card-h"}, icon("quote", "sm"), h("h2", {text:"Interview story bank"}), h("div", {class:"act"}, h("span", {class:"tag gold", text:covered + " of " + PROMPTS.length + " answered"}))), h("div", {class:"card-b"}, h("div", {class:"prog gold"}, h("i", {style:"width:" + (covered / PROMPTS.length * 100) + "%"})), ql)));

  // Letter writers
  bento.append(h("section", {class:"card s5"}, h("div", {class:"card-h"}, icon("users", "sm"), h("h2", {text:"Letter writers"})),
    h("div", {class:"card-b"}, h("p", {class:"muted", style:"margin:0;font-size:12.5px", text:"Attendings and fellows you've named, ranked by praise you recorded. Ask before the rotation ends."}),
      writers.length ? h("ul", {class:"writers"}, writers.map(w => { const sr = schedule().find(r => r.name === w.rotation && r.e); return h("li", {class:cc(w.rotation)}, h("span", {class:"av", text:initials(w.name)}), h("div", {style:"min-width:0"}, h("div", {class:"nm", text:w.name}), h("div", {class:"meta", text:[...w.rotations].join(", ") + " · " + w.pos + " praise · " + w.count + (w.count === 1 ? " entry" : " entries") + (sr ? " · rotation ends " + fmt(dayKey(sr.e)) : "")}), w.quote ? h("q", {text:w.quote}) : null)); })) : h("div", {class:"empty"}, h("p", {text:"Mention your attending by name in a debrief (“Dr. Lee said…”) and they show up here."})))));

  // Coverage
  const counts = rots.map(r => COMP_KEYS.map(c => es.filter(e => e.rotation === r && (e.competencies || []).includes(c)).length));
  const max = Math.max(1, ...counts.flat());
  const table = h("table", {class:"heat"},
    h("thead", null, h("tr", null, h("th", {class:"rowh", scope:"col"}, h("span", {class:"sr", text:"Rotation"})), COMP_KEYS.map(c => h("th", {scope:"col", title:COMP_NAME[c], text:c})), h("th", {scope:"col", text:"ALL"}))),
    h("tbody", null, rots.map((r, i) => h("tr", null, h("th", {class:"rowh " + cc(r), scope:"row"}, h("span", null, h("span", {class:"dot"}), r)),
      counts[i].map((n, j) => { if (!n) return h("td", {class:"z", title:r + " · " + COMP_NAME[COMP_KEYS[j]] + ": none yet", text:"–"}); const pct = Math.round(18 + 70 * n / max); return h("td", {title:r + " · " + COMP_NAME[COMP_KEYS[j]] + ": " + n, style:"background:color-mix(in srgb,var(--accent) " + pct + "%,var(--surface));color:" + (pct > 55 ? "var(--on-accent)" : "var(--ink)"), text:String(n)}); }),
      h("td", {class:"tot", text:String(es.filter(e => e.rotation === r).length)})))));
  bento.append(h("section", {class:"card s12"}, h("div", {class:"card-h"}, icon("grid", "sm"), h("h2", {text:"Competency coverage"}), h("div", {class:"act"}, es.length && gaps.length ? h("span", {class:"muted", style:"font-size:12.5px", text:"Missing: " + gaps.map(c => COMP_NAME[c]).join(", ")}) : null)),
    h("div", {class:"card-b"}, h("div", {class:"heat-wrap", tabindex:"0", role:"region", "aria-label":"Competency heat map"}, table))));

  // Signal
  const sig = rots.map(r => { const v = es.filter(e => e.rotation === r && e.energy).map(e => e.energy); return {r, n:v.length, avg:v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0}; }).filter(x => x.n);
  bento.append(h("section", {class:"card s6"}, h("div", {class:"card-h"}, icon("pulse", "sm"), h("h2", {text:"Specialty signal"})),
    h("div", {class:"card-b"}, h("p", {class:"muted", style:"margin:0;font-size:12.5px", text:"Average “how locked in were you” by rotation. Six or more entries per rotation before you trust it."}),
      sig.length ? h("div", {class:"bars"}, sig.map(x => h("div", {class:"bar " + cc(x.r)}, h("span", {text:x.r}), h("span", {class:"track"}, h("span", {class:"fill", style:"width:" + (x.avg / 5 * 100).toFixed(0) + "%"})), h("span", {class:"v", text:x.avg.toFixed(1) + " · n=" + x.n})))) : h("div", {class:"empty"}, h("p", {text:"Rate your energy when you debrief and this fills in."})))));

  // Export
  bento.append(h("section", {class:"card s6"}, h("div", {class:"card-h"}, icon("download", "sm"), h("h2", {text:"Export for ERAS"})),
    h("div", {class:"card-b"}, h("p", {class:"muted", style:"margin:0;font-size:12.5px", text:"Everything grouped by rotation as Markdown, ready to paste into a doc when you draft experiences and your personal statement."}),
      h("div", {class:"rowacts"}, h("button", {type:"button", class:"btn primary", disabled:!es.length, onclick:downloadExport}, icon("download", "sm"), "Download .md"), h("button", {type:"button", class:"btn", disabled:!es.length, onclick:() => copyText(exportMarkdown())}, icon("copy", "sm"), "Copy as text")),
      h("div", {class:"limits", text:"Current ERAS limits: " + ERAS.desc + "-character experience descriptions · " + ERAS.reflect + "-character meaningful reflections · up to 10 experiences, 3 most meaningful."}))));
}
function sumCard(n, suffix, label, frac){ return h("div", {class:"card sum"}, h("b", null, String(n), suffix ? h("small", {text:suffix}) : null), h("span", {text:label}), frac != null ? h("div", {class:"prog gold"}, h("i", {style:"width:" + (frac * 100).toFixed(0) + "%"})) : null); }
async function draftAnswer(i){
  const p = PROMPTS[i], m = storyMatches(p.themes).slice(0, 3); if (!m.length) return;
  const sample = await needSample(); if (!sample) return;
  const st = state.drafts[i] = {busy:true, text:"", err:"", ctl:new AbortController()}; renderVault();
  const prompt = ["A medical student is preparing for residency interviews. Using ONLY the journal entries below, draft their spoken answer to the question.",
    "Rules: first person; about 90 seconds aloud (180-230 words); STAR order (situation, task, action, result) ending with what they learned and how it shapes the resident they will be. Pick the single strongest entry and put \"Using: <entry title>\" on the first line. Do not invent details; where the entry is thin, write [add detail: what's missing] for the student to fill in. No patient identifiers.",
    "Target specialty: " + (state.settings.specialty || "not chosen yet"), "Question: " + p.q, "",
    m.map((e, k) => "Entry " + (k + 1) + " — " + e.title + " (" + e.rotation + ")\n" + e.text + (e.feedback && e.feedback.length ? "\nFeedback: " + e.feedback.map(f => f.from + ": " + f.said).join(" | ") : "")).join("\n\n---\n\n")].join("\n");
  try { const r = await sample(prompt, {cache:false, signal:st.ctl.signal, onText:({text}) => { st.text = text; if (draftEls[i]) draftEls[i].textContent = text; }}); st.text = r.text; }
  catch (e){ st.err = aiError(e) || ""; if (e && e.text) st.text = e.text; }
  finally { st.busy = false; if (state.view === "vault") renderVault(); }
}
function exportMarkdown(){
  const lines = ["# Clerkship Debrief export", "", "Exported " + new Date().toLocaleDateString() + " · " + state.entries.length + " entries", ""];
  for (const r of allRotations()){
    const es = state.entries.filter(e => e.rotation === r).slice().sort((a, b) => entryDay(a).localeCompare(entryDay(b)));
    if (!es.length) continue;
    lines.push("## " + r + " (" + es.length + ")", "");
    for (const e of es){
      lines.push("### " + (e.title || "Untitled") + " — " + fmt(entryDay(e), {month:"short", day:"numeric", year:"numeric"}) + (e.example ? " (example)" : ""));
      if (e.oneLiner) lines.push("*" + e.oneLiner + "*");
      const meta = [];
      if ((e.competencies || []).length) meta.push("Competencies: " + e.competencies.map(c => COMP_NAME[c]).join(", "));
      if ((e.themes || []).length) meta.push("Themes: " + e.themes.map(t => THEMES[t]).join(", "));
      if ((e.epas || []).length) meta.push("EPAs: " + e.epas.join(", "));
      if (e.energy) meta.push("Energy: " + e.energy + "/5");
      if (e.strength) meta.push("Story strength: " + e.strength + "/3");
      if (meta.length) lines.push(meta.join(" · "));
      lines.push("", e.text, "");
      if ((e.feedback || []).length){ lines.push("**Feedback**"); for (const f of e.feedback) lines.push("- " + (f.from ? f.from + ": " : "") + "\"" + f.said + "\" (" + (f.tone === "positive" ? "praise" : "growth") + ")"); lines.push(""); }
      if (e.story){ lines.push("**STAR**"); for (const [k, v] of [["Situation", e.story.situation], ["Task", e.story.task], ["Action", e.story.action], ["Result", e.story.result], ["Reflection", e.story.reflection]]) if (v) lines.push("- " + k + ": " + v); lines.push(""); }
    }
  }
  return lines.join("\n");
}
async function downloadExport(){
  const md = exportMarkdown(); const dl = await getDownloads();
  if (!dl){ copyText(md); return; }
  try { await dl.save({filename:"clerkship-debrief-" + todayKey() + ".md", data:md}); toast("Saved"); }
  catch (e){ const c = e && e.code; if (c === "declined") return; if (c === "rate_limited") toast("A save is already waiting for you. Try again in a moment."); else { toast("Download isn't available here, so it was copied instead."); copyText(md); } }
}

/* ---------- toolkit ---------- */
function renderToolkit(){
  const host = $("#view-toolkit"); host.textContent = "";
  const s = state.settings;
  host.append(h("div", {class:"vh"}, h("div", null, h("div", {class:"eyebrow", text:"How debriefs are cleaned up and tagged"}), h("h1", {text:"Debrief settings"}))));
  const kit = h("div", {class:"kit"}); host.append(kit);
  const section = (ic, title, sub, ...body) => h("section", {class:"card"}, h("div", {class:"card-h"}, icon(ic, "sm"), h("h2", {text:title})), h("div", {class:"card-b"}, sub ? h("p", {class:"ksub", text:sub}) : null, body));

  kit.append(section("calendar", "Rotations and schedules", null, h("p", {class:"bridge-note"}, "Your rotation dates and clerkship schedules come from ", h("a", {href:"#schedule", text:"Schedule"}), ", shared with School. Debriefs read them; nothing here changes them.")));

  // Specialty + style
  kit.append(section("vault", "Target specialty", "Used only to aim interview drafts. Leave it blank while you decide; the specialty signal in your vault helps with that.",
    h("input", {class:"input", id:"spec", value:s.specialty, placeholder:"e.g. Internal Medicine, Radiology, or undecided", onchange:e => { s.specialty = str(e.target.value); commitSettings(); }})));
  kit.append(section("spark", "Cleanup style", "How Claude rewrites your dictation. You review everything before it saves.",
    h("div", {class:"styles"}, Object.entries(STYLES).map(([k, v]) => h("button", {type:"button", class:"stylecard", "aria-pressed":String(s.style === k), onclick:() => { s.style = k; commitSettings(); }}, h("b", {text:v.name}), h("span", {text:v.desc}))))));

  // Dictionary
  const dw = h("input", {class:"input", id:"dw", placeholder:"Spell it as (e.g. Dr. Nakamura, SVT)"}), dh = h("input", {class:"input", id:"dh", placeholder:"When I say (optional)"});
  kit.append(section("words", "Dictionary", "Attending names, drugs, eponyms and abbreviations. Add what you say when dictation keeps mangling it; it's swapped before cleanup.",
    s.dictionary.length ? h("ul", {class:"klist"}, s.dictionary.map((d, i) => h("li", null, h("span", {class:"main"}, h("b", {text:d.word}), h("div", {class:"heard", text:d.heard ? "when I say “" + d.heard + "”" : "spelling hint"})), h("button", {type:"button", class:"iconbtn", "aria-label":"Remove " + d.word, onclick:() => { s.dictionary.splice(i, 1); commitSettings(); }}, icon("x", "sm"))))) : null,
    h("form", {class:"kform", onsubmit:e => { e.preventDefault(); const w = str(dw.value); if (!w){ toast("Type the word as it should be spelled first."); dw.focus(); return; } s.dictionary.push({word:w, heard:str(dh.value).toLowerCase()}); dw.value = ""; dh.value = ""; commitSettings(); }}, dw, dh, h("button", {type:"submit", class:"btn", text:"Add"}))));

  // Snippets
  const st = h("input", {class:"input", id:"st", placeholder:"Trigger phrase (e.g. procedure log)"}), sx = h("textarea", {class:"ta", id:"sx", style:"min-height:90px", placeholder:"What it expands to"});
  kit.append(section("book", "Snippets", "Say the trigger phrase while dictating, or tap it in the composer, and it expands into a template.",
    s.snippets.length ? h("ul", {class:"klist"}, s.snippets.map((sn, i) => h("li", null, h("span", {class:"main"}, h("b", {text:"“" + sn.trigger + "”"}), h("div", {class:"prev", text:sn.text.replace(/\n/g, " · ")})), h("button", {type:"button", class:"iconbtn", "aria-label":"Remove " + sn.trigger, onclick:() => { s.snippets.splice(i, 1); commitSettings(); }}, icon("x", "sm"))))) : null,
    h("form", {style:"display:grid;gap:8px", onsubmit:e => { e.preventDefault(); const t = str(st.value), x = sx.value; if (!t || !str(x)){ toast(!t ? "Give the snippet a trigger word first." : "Type the text the snippet should insert."); (!t ? st : sx).focus(); return; } s.snippets.push({trigger:t.toLowerCase(), text:x}); st.value = ""; sx.value = ""; commitSettings(); }}, st, sx, h("div", null, h("button", {type:"submit", class:"btn", text:"Add snippet"})))));

  // Shortcuts
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
  kit.append(section("sliders", "Keyboard shortcuts", null, h("div", {class:"keys"}, h("kbd", {text:"N"}), h("span", {text:"New debrief"}), h("kbd", {text:mod + " K"}), h("span", {text:"Search and jump anywhere"}), h("kbd", {text:"/"}), h("span", {text:"Search"}), h("kbd", {text:mod + " ↵"}), h("span", {text:"Clean up, or save while reviewing"}), h("kbd", {text:"Esc"}), h("span", {text:"Close"}))));

  // Privacy
  const browserOnly = state.mode === "account" ? localEntries().length : 0;
  kit.append(section("shield", "Privacy", null, h("div", {class:"privacy"},
    h("p", null, h("span", {class:"lbl", text:"Dictation"}), "Your device's dictation turns speech into text. This page never hears audio."),
    h("p", null, h("span", {class:"lbl", text:"Before Claude"}), "Text stays on your device until you press Clean up. The page scans for names, ID numbers, dates, phone numbers and rooms first, and makes you replace them or confirm they're not identifiers."),
    h("p", null, h("span", {class:"lbl", text:"Storage"}), state.mode === "account" ? (window.PERL_ACCOUNT ? "Entries save to a private space in your account" : "Entries save to a private space on your Claude account") + " that other people who open this page can't read. Only the reviewed entry is saved, never your raw dictation." : "Entries save in this browser only. Open this page signed in to Claude to keep them in your account."),
    h("p", null, h("span", {class:"lbl", text:"Your school"}), "Your school's rules on patient information still apply. Log what you did and learned; leave the chart in the chart."),
    browserOnly ? h("div", {class:"rowacts"}, h("span", {text:browserOnly + (browserOnly === 1 ? " entry is" : " entries are") + " saved in this browser only."}), h("button", {type:"button", class:"btn sm", text:"Move to my account", onclick:migrate})) : null)));
}
async function renameRotation(){ return; }
async function renameRotationUnused(i, val){
  const s = state.settings, r = s.rotations[i], v = str(val); if (!v || v === r.name) return;
  if (s.rotations.some((x, j) => j !== i && x.name === v)){ toast("You already have a rotation with that name."); renderToolkit(); return; }
  const old = r.name; r.name = v; if (s.current === old) s.current = v; commitSettings();
  for (const e of state.entries.filter(x => x.rotation === old)){ const ok = await putEntry(Object.assign(clone(e), {rotation:v})); if (!ok) break; }
}
async function migrate(){
  const list = localEntries(); let n = 0;
  for (const e of list){ try { await entriesCol().doc(e.id).set(e); n++; } catch { break; } }
  const left = list.slice(n); lsSet(K.entries, left);
  if (lsGet(K_MSPE)){ try { await mspeDoc().set(clone(state.mspe)); localStorage.removeItem(K_MSPE); } catch {} }
  toast(left.length ? "Moved " + n + "; " + left.length + " couldn't move." : "Moved " + n + " to your account"); renderAll();
}

/* ---------- examples ---------- */
async function addExamples(){
  const now = Date.now(), day = 864e5;
  const mk = (o, ago) => Object.assign({id:newId(), createdAt:new Date(now - ago * day).toISOString(), date:dayKey(new Date(now - ago * day)), example:true, aiTagged:true, phiLeft:[], epas:[], people:[], rotation:currentRotation()}, o, {words:wordsIn(o.text)});
  const ex = [
    mk({title:"Flagged worsening breathing before rounds", oneLiner:"Infant with bronchiolitis and increasing work of breathing",
      text:"Pre-rounded on an infant admitted overnight with bronchiolitis. Work of breathing was clearly worse than the overnight note: head bobbing, subcostal retractions, and sats dipping to 89% during feeds. I told my resident right away instead of saving it for my presentation, and we started high-flow and moved the reassessment up.\n\nDr. Rivera told me afterward that flagging it early was exactly the right call. Lesson: pre-rounds are an assessment, not data collection.",
      did:["Examined the patient on pre-rounds","Escalated to the resident before rounds","Presented the change on rounds"], learned:["Feeds are a stress test in bronchiolitis; check sats during feeds","Escalate a change in work of breathing right away"],
      feedback:[{from:"Dr. Rivera (attending)", said:"Flagging it early instead of waiting for your presentation was exactly the right call.", tone:"positive"}], people:[{name:"Dr. Rivera", role:"attending"}],
      competencies:["PC","ICS","PROF"], epas:[1,6,10], themes:["acute","advocacy","meaningful-patient"],
      story:{situation:"An infant with bronchiolitis whose breathing had worsened overnight.", task:"Pre-round and decide what needed attention before rounds.", action:"Recognized retractions and desaturation with feeds and escalated to my resident immediately.", result:"High-flow started early and the plan changed before rounds.", reflection:"I now treat pre-rounds as a real assessment and escalate instead of waiting my turn."}, strength:3, energy:5}, 1),
    mk({title:"Stayed with a parent who wanted to leave", oneLiner:"Teen with new-onset type 1 diabetes; parent pushing to go home",
      text:"A parent of a teenager admitted with new type 1 diabetes was upset about the length of stay and wanted to take her home before teaching was finished. The resident asked me to stay while she found the attending. I mostly listened, then summarized back what I heard: they were worried about missed work and that their daughter would be embarrassed about injections at school. That changed the conversation, and the team brought in the school nurse plan first.\n\nMy resident said my summary statement was the turning point. The hardest part was not trying to fix it right away.",
      did:["Stayed with the family","Used reflective listening and a summary statement","Briefed the attending on the family's main worry"], learned:["Name the fear before defending the plan","A good summary statement de-escalates"],
      feedback:[{from:"Resident", said:"Your summary statement was the turning point in that conversation.", tone:"positive"}],
      competencies:["ICS","PROF"], epas:[9], themes:["difficult-conversation","teamwork"],
      story:{situation:"A parent wanted to leave before diabetes teaching was complete.", task:"Keep the conversation going until the attending arrived.", action:"Listened, then reflected back their worries about work and school.", result:"The family engaged and the team addressed the school plan first.", reflection:"Naming the fear works better than defending the plan."}, strength:2, energy:3}, 3),
    mk({title:"Reported the wrong maternal GBS status", oneLiner:"Newborn nursery; maternal GBS pulled from an old note",
      text:"On nursery rounds I presented a newborn's maternal GBS status as negative. I had taken it from mom's note from a prior pregnancy. My resident caught it before it changed the sepsis risk plan, and told me afterward to verify labs in the results tab, not copy them from notes.\n\nI was embarrassed, but it's a fair rule. I now open the primary result for anything that changes management, and I told the team the next day what I'd changed.",
      did:["Presented on nursery rounds","Owned the error with the team","Changed how I verify labs"], learned:["Verify management-changing labs at the source","Copied-forward notes carry stale data"],
      feedback:[{from:"Resident", said:"Always verify labs in the results tab, not from notes.", tone:"constructive"}],
      competencies:["PBLI","PROF","SBP"], epas:[3,6,13], themes:["mistake","feedback","systems-fix"],
      story:{situation:"I reported a maternal GBS result from the wrong pregnancy on rounds.", task:"Own it and make sure it couldn't recur.", action:"Acknowledged it, changed how I verify labs, and told the team what I changed.", result:"No harm; I now check primary results for anything that changes management.", reflection:"Copy-forward is a system risk, not just a personal slip."}, strength:2, energy:2}, 6),
  ];
  for (const e of ex){ const ok = await putEntry(e); if (!ok) return; }
  toast("Added 3 example entries"); renderAll();
}
async function removeExamples(){ for (const e of state.entries.filter(x => x.example)){ const ok = await removeEntry(e.id); if (!ok) return; } toast("Examples removed"); renderAll(); }

/* ---------- command palette ---------- */
const palQ = $("#palQ");
function openPalette(){ showOverlay("palette"); palQ.value = ""; renderPalette(); palQ.focus(); }
function closePalette(){ closeOverlay("palette"); }
function paletteItems(q){
  const items = [], ql = q.trim().toLowerCase(), y = dayKey(addDays(new Date(), -1));
  const acts = [
    {g:"Actions", ic:"plus", t:"New debrief", k:"N", fn:() => openComposer()},
    {g:"Actions", ic:"calendar", t:"Debrief yesterday", fn:() => openComposer({date:y})},
    {g:"Actions", ic:"upload", t:"Import schedule", fn:pickSchedule},
    {g:"Actions", ic:"download", t:"Export journal", fn:downloadExport},
    ...VIEWS.map(([v, l, ic]) => ({g:"Go to", ic, t:l, fn:() => go(v)})),
  ];
  if (!state.entries.length) acts.push({g:"Actions", ic:"journal", t:"Add 3 example entries", fn:addExamples});
  for (const a of acts) if (!ql || a.t.toLowerCase().includes(ql)) items.push(a);
  const es = state.entries.filter(e => !ql || [e.title, e.text, e.oneLiner, e.rotation].join(" ").toLowerCase().includes(ql)).slice(0, ql ? 8 : 5);
  for (const e of es) items.push({g:ql ? "Entries" : "Recent entries", ic:"journal", t:e.title, meta:relDay(entryDay(e)), cls:cc(e.rotation), fn:() => openEntry(e.id)});
  return items;
}
function renderPalette(){
  const list = $("#palList"); list.textContent = "";
  const items = state.pal.items = paletteItems(palQ.value); state.pal.idx = clamp(state.pal.idx, 0, Math.max(0, items.length - 1));
  if (!items.length){ list.append(h("li", {class:"none", text:"No matches. Press Enter to start a debrief instead."})); return; }
  let g = "";
  items.forEach((it, i) => {
    if (it.g !== g){ g = it.g; list.append(h("li", {class:"grp", role:"presentation", text:g})); }
    list.append(h("li", {role:"option", id:"pal-" + i, "aria-selected":String(i === state.pal.idx)}, h("button", {type:"button", tabindex:"-1", class:it.cls || "", onclick:() => runPal(i), onmousemove:() => { if (state.pal.idx !== i){ state.pal.idx = i; markPal(); } }},
      it.cls ? h("span", {class:"dot"}) : icon(it.ic, "sm"), h("span", {class:"tt", text:it.t}), it.meta ? h("span", {class:"muted", style:"font-size:12px", text:it.meta}) : null, it.k ? h("kbd", {text:it.k}) : null)));
  });
  palQ.setAttribute("aria-activedescendant", "pal-" + state.pal.idx);
}
function markPal(){ document.querySelectorAll("#palList li[role=option]").forEach(li => li.setAttribute("aria-selected", String(li.id === "pal-" + state.pal.idx))); palQ.setAttribute("aria-activedescendant", "pal-" + state.pal.idx); const el = document.getElementById("pal-" + state.pal.idx); if (el) el.scrollIntoView({block:"nearest"}); }
function runPal(i){ const it = state.pal.items[i]; closePalette(); if (it) it.fn(); }
palQ.addEventListener("input", () => { state.pal.idx = 0; renderPalette(); });
palQ.addEventListener("keydown", e => {
  if (e.key === "ArrowDown"){ e.preventDefault(); state.pal.idx = Math.min(state.pal.items.length - 1, state.pal.idx + 1); markPal(); }
  else if (e.key === "ArrowUp"){ e.preventDefault(); state.pal.idx = Math.max(0, state.pal.idx - 1); markPal(); }
  else if (e.key === "Enter"){ e.preventDefault(); if (state.pal.items.length) runPal(state.pal.idx); else { const q = palQ.value; closePalette(); openComposer(); if (q) insertAtCursor(q); } }
});

(window.PERL_PALETTE = window.PERL_PALETTE || []).push(q => {
  const ql = q.trim().toLowerCase(); const out = [{g:"Debrief", label:"New debrief", hint:"N", run:() => openComposer()}, {g:"Debrief", label:"Debrief yesterday", run:() => openComposer({date:dayKey(addDays(new Date(), -1))})}, {g:"Debrief", label:"Export journal for ERAS", hint:"Markdown", run:downloadExport}];
  const acts = ql ? out.filter(a => a.label.toLowerCase().includes(ql)) : out.slice(0, 1);
  const es = ql ? state.entries.filter(e => [e.title, e.text, e.oneLiner, e.rotation].join(" ").toLowerCase().includes(ql)).slice(0, 6) : [];
  return acts.concat(es.map(e => ({g:"Journal entries", label:e.title, hint:e.rotation + " · " + relDay(entryDay(e)), run:() => openEntry(e.id)})));
});

/* ---------- keyboard ---------- */
document.addEventListener("keydown", e => {
  const mod = e.metaKey || e.ctrlKey;

  if (e.key === "Escape" && openStack.length){ e.preventDefault(); closeOverlay(openStack[openStack.length - 1]); return; }
  if (e.key === "Tab" && openStack.length && window.PERL_TRAP){ const root = document.getElementById(openStack[openStack.length - 1]); if (root && window.PERL_TRAP(e, root)) return; }
  if (mod && e.key === "Enter" && !$("#composer").hidden){ e.preventDefault(); if (state.compose.step === "done") closeOverlay("composer"); else if (state.compose.step === "review") saveReview(); else if (state.busy !== "cleanup"){ if (state.ai === false) reviewManually(); else runCleanup(); } return; }
  const typing = e.target.closest && e.target.closest("input,textarea,select,[contenteditable]");
  if (typing || mod || e.altKey || openStack.length || document.querySelector("#pal[data-open=true]")) return;
  if ((e.key === "n" || e.key === "N") && (!window.PERL_SINGLE_KEYS || window.PERL_SINGLE_KEYS())){ e.preventDefault(); openComposer(); }

});

/* ---------- routing: the merged app's router owns the URL; Debrief only shows its views ---------- */
const VIEW_KEYS = VIEWS.map(v => v[0]);
const TO_HASH = {today:"today", calendar:"history", journal:"journal", vault:"vault", mspe:"mspe", toolkit:"dsettings"};
const FROM_HASH = {today:"today", history:"calendar", journal:"journal", vault:"vault", mspe:"mspe", dsettings:"toolkit"};
function toGo(hash){ if (location.hash !== "#" + hash) location.hash = hash; }
function go(v){ const hh = TO_HASH[v] || v; if (location.hash !== "#" + hh) location.hash = hh; else show(v); }
function show(v){
  state.view = VIEW_KEYS.includes(v) ? v : null;
  for (const x of VIEW_KEYS){ if (x === "today") continue; const el = $("#view-" + x); if (el) el.hidden = x !== state.view; }
  if (state.view) renderAll();
}
document.addEventListener("perl:view", e => show(FROM_HASH[e.detail && e.detail.view] || null));
document.addEventListener("perl:shared", () => { syncShared(); if (state.view) renderAll(true); });
document.addEventListener("perl:mode", () => { ecg.colors = ecgColors(); ecgDraw(); if (state.view) renderAll(true); });
let passiveRender = false, pending = {};
function renderView(v){
  const host = $("#view-" + v); if (!host) return;
  if (passiveRender && typingIn(host)){ pending[v] = true; return; }
  if (v === "today") renderToday(); else if (v === "calendar") renderCalendar(); else if (v === "journal") renderJournal(); else if (v === "vault") renderVault(); else if (v === "mspe") renderMspe(); else if (v === "toolkit") renderToolkit();
}
function renderAll(passive){
  passiveRender = !!passive;
  try {
    if (state.view) renderView(state.view);
    if (!$("#composer").hidden){ renderComposeMeta(); renderComposeFoot(); }
    if (!$("#entry").hidden && !(passive && typingIn($("#entryPanel")))) renderDrawer();
  } finally { passiveRender = false; }
}
document.addEventListener("focusout", () => setTimeout(() => {
  for (const v of Object.keys(pending)){ if (v === state.view && !typingIn($("#view-" + v))){ delete pending[v]; renderView(v); } else if (v !== state.view) delete pending[v]; }
}, 0));

/* ---------- focus: a re-render replaces the control just used; put focus on its replacement (or the view heading) ---------- */
function focusKey(el){
  if (!el || el === document.body || !el.isConnected || !el.closest || !el.closest("#dbf-views, #composer, #entry, #palette, #importer")) return null;
  return {id:el.id, tag:el.tagName, cls:el.className, label:el.getAttribute("aria-label") || "", text:(el.textContent || "").trim().slice(0, 60)};
}
function refocusKey(k){
  if (!k) return; const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
  const vis = x => x && (x.checkVisibility ? x.checkVisibility() : !!x.offsetParent);
  let el = k.id ? document.getElementById(k.id) : null;
  if (!vis(el)){ const pool = [...document.querySelectorAll(k.tag)].filter(vis); el = pool.find(x => x.className === k.cls && (x.getAttribute("aria-label") || "") === k.label && (x.textContent || "").trim().slice(0, 60) === k.text) || pool.find(x => x.className === k.cls && (x.getAttribute("aria-label") || "") === k.label) || null; }
  if (!el){ const open = openStack.length ? document.getElementById(openStack[openStack.length - 1]) : $("#view-" + state.view); el = open && (open.querySelector("h1, h2, [role=dialog], .panel-h button") || open); if (el && !el.hasAttribute("tabindex") && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.setAttribute("tabindex", "-1"); }
  if (el && el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  if (el && el.focus) el.focus({preventScroll:true});
}
function keepFocus(fn){ return function(...a){ const k = focusKey(document.activeElement); try { return fn.apply(this, a); } finally { refocusKey(k); } }; }
renderToday = keepFocus(renderToday); renderCalendar = keepFocus(renderCalendar); renderJournal = keepFocus(renderJournal); renderJournalList = keepFocus(renderJournalList);
renderVault = keepFocus(renderVault); renderMspe = keepFocus(renderMspe); renderToolkit = keepFocus(renderToolkit); renderDrawer = keepFocus(renderDrawer);
renderComposer = keepFocus(renderComposer); renderComposeFoot = keepFocus(renderComposeFoot); renderImport = keepFocus(renderImport);

/* ---------- quick log: the evening check-in (checkin.js) writes a structured entry without the full composer ----------
   A write-only door into the journal: it takes what the student typed in the check-in, runs the same identifier scan as
   the composer, and saves through putEntry. It hands back only what the check-in page shows (logged today or not, the
   streak, the current rotation's name); entries themselves never leave the Debrief space. */
window.PERL_QUICKLOG = Object.freeze({
  ready: () => !!state.loaded,
  rotation: () => currentRotation(),
  loggedToday: () => entriesOn(todayKey()).length,
  streak: () => streak(),
  scan: (text) => scanPHI(str(text)).map(x => ({match:x.match, label:x.label})),
  scrub: (text) => scrubPHI(str(text)),
  async save(o){
    o = o || {};
    const lines = (v) => str(v).split(/\n+|;\s*/).map(s => s.trim()).filter(Boolean).slice(0, 8);
    const did = lines(o.did), learned = lines(o.learned), said = str(o.said).trim();
    if (!did.length && !learned.length && !said) return {ok:false, why:"empty"};
    const all = [str(o.did), str(o.learned), said].join("\n");
    const hits = scanPHI(all); if (hits.length && !o.phiOk) return {ok:false, why:"phi", hits:hits.map(x => ({match:x.match, label:x.label}))};
    const parts = [did.length ? "What I did: " + did.join("; ") : "", learned.length ? "What I learned: " + learned.join("; ") : "", said ? "Feedback: " + said : ""].filter(Boolean);
    const text = parts.join("\n");
    const date = isDayKey(o.date) ? o.date : todayKey();
    const e = Object.assign(baseEntry(text), {date, rotation:str(o.rotation) || rotationName(date), title:firstWords(did[0] || learned[0] || said), did, learned,
      feedback:said ? [{from:str(o.from), said, tone:"positive"}] : [], energy:o.energy >= 1 && o.energy <= 5 ? Number(o.energy) : null, words:wordsIn(text), quick:true});
    const ok = await putEntry(e); if (ok) renderAll();
    return {ok, id:e.id};
  },
  open: (id) => { if (id) openEntry(id); else openComposer({}); }
});
function rotationName(d){ const r = rotationOn(d); return r ? r.name : state.settings.current; }

/* ---------- boot ---------- */
if (typeof draft0.text === "string" && draft0.text){ pad.value = draft0.text; lastLen = draft0.text.length; }
renderHint(false);
syncShared();
/* the app may have finished booting before this script ran: pick up the view already on screen */
{ const cur = (document.getElementById("view") || {}).dataset; if (cur && cur.view) show(FROM_HASH[cur.view] || null); }
onPadInput();
initStore();
getSample().then(s => { if (!s){ state.ai = false; renderAll(); } });
})();