/* Habits: a Wheel of Habits (one ring per habit, one spoke per day of the month), a heat map, and a one-tap card on Today.
   Data lives in state.habits (the School-side document), created lazily:
     { v:1, why, motivations, notes, items:[{ id, name, area, anchor, full, tiny, days, reward, color, anki:{deck}|null, created, history:[] }],
       log:{ "YYYY-MM-DD": { [id]: "full"|"tiny" } }, easy:{ "YYYY-MM-DD": true }, anki:{ lastSync, status:{ok,msg}, counts:{ date: n } } }

   Behaviour-change design, and where each piece comes from:
   - Identity first ("I'm someone who…"): identity-based habits (Clear, Atomic Habits 2018), self-determination theory's
     autonomy (Deci & Ryan 2000): the student picks and writes their own habits; starters are only suggestions.
   - Anchor + tiny version + celebrate: Fogg Behavior Model B = MAP and Tiny Habits (Fogg 2019). Every habit is anchored to an
     existing routine ("After I …"), has a 2-minute version that always counts, and a reward line shown right after the tap.
   - The anchor is an implementation intention, if-then planning (Gollwitzer 1999; Gollwitzer & Sheeran 2006, d≈0.65).
   - Target days per week, not forced daily, and a consistency score over 4 weeks rather than a fragile streak:
     habit automaticity grows with repetition and a single missed day doesn't measurably hurt it (Lally et al. 2010, EJSP).
   - Never miss twice: one miss is normal; two in a row get a gentle prompt with the tiny version (Lally 2010; Clear 2018).
   - Hard days (call, exams, pre-dawn starts) lower the ability bar instead of the motivation bar (Fogg: when ability drops,
     make the behaviour smaller), and say why.
   - Gradual progression: ≥80% of target two weeks running offers a step up; <40% two weeks running offers to shrink.
     Offers, never forced (autonomy, SDT); successive approximation / shaping (Skinner), goal-setting at a reachable
     difficulty (Locke & Latham 2002). Every change is recorded in the habit's history.
   - Self-monitoring with immediate visual feedback (Michie et al. 2013 BCT taxonomy 2.3, 2.2) is the wheel itself. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A) return;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const AREAS = { mind: "Mind", body: "Body", spirit: "Spirit" };
const MAX = 7;
const PALETTE = 7; /* --hb-c0 … --hb-c6, validated ≥3:1 against --surface and --raised in both modes */
const CHECK = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>`;
const CELEBRATE = ["Nice. That's who you are.", "Done. Feel that.", "Logged. Small wins compound.", "That counts.", "Yes."];
const ANKI_URL = "http://127.0.0.1:8765";
const ANKI_FAIL = "Anki isn't reachable from this device — open Anki on your computer with AnkiConnect, or tick it yourself.";

const STARTERS = [
  { k: "anki", area: "mind", name: "Anki reviews", anchor: "pour my morning coffee", full: "Finish today's due cards", tiny: "Do 10 cards", days: 7, reward: "Check it off and enjoy the zero", anki: true },
  { k: "read", area: "mind", name: "Read", anchor: "get into bed", full: "Read 20 pages", tiny: "Read one page", days: 5, reward: "A chapter's worth of calm" },
  { k: "plan", area: "mind", name: "Plan tomorrow", anchor: "write my last note of the day", full: "Write tomorrow's top three", tiny: "Write one thing", days: 5, reward: "Walk in tomorrow already ahead" },
  { k: "workout", area: "body", name: "20-min workout", anchor: "change out of scrubs", full: "20-minute workout", tiny: "10 push-ups", days: 4, reward: "Protein shake and a good playlist" },
  { k: "sleep", area: "body", name: "Sleep by 11", anchor: "set my alarm", full: "Lights out by 11", tiny: "Phone on the charger across the room", days: 5, reward: "Wake up before the alarm" },
  { k: "water", area: "body", name: "Water", anchor: "badge in", full: "Fill my bottle twice", tiny: "Drink one glass", days: 5, reward: "Fewer 3 pm headaches" },
  { k: "pray", area: "spirit", name: "Pray or meditate", anchor: "wake up", full: "10 minutes of prayer or meditation", tiny: "Three slow breaths", days: 7, reward: "A steadier start" },
  { k: "family", area: "spirit", name: "Call family", anchor: "eat lunch on Sunday", full: "Call home", tiny: "Send a voice note", days: 2, reward: "Hear their voice" },
  { k: "gratitude", area: "spirit", name: "Gratitude", anchor: "brush my teeth at night", full: "Write three good things", tiny: "Name one good thing", days: 5, reward: "End the day on something good" }
];

/* ---------- state ---------- */
const esc = (s) => A.esc(s);
const U = () => { const ui = A.ui; if (!ui.habits) ui.habits = { month: "", pick: {}, edit: null, add: false, del: null, focus: null, sync: "", syncing: false, tried: 0 }; return ui.habits; };
const doc = () => A.state.habits || null;
function ensure() {
  const s = A.state;
  if (!s.habits || typeof s.habits !== "object") s.habits = { v: 1, why: "", motivations: "", notes: "", items: [], log: {}, easy: {}, anki: { lastSync: 0, status: null, counts: {} } };
  const d = s.habits;
  if (!Array.isArray(d.items)) d.items = [];
  for (const k of ["log", "easy"]) if (!d[k] || typeof d[k] !== "object") d[k] = {};
  if (!d.anki || typeof d.anki !== "object") d.anki = { lastSync: 0, status: null, counts: {} };
  if (!d.anki.counts) d.anki.counts = {};
  return d;
}
const items = () => (doc() && Array.isArray(doc().items) ? doc().items : []);
const T = () => A.today();
const iso = (d) => A.isoD(d);
const todayIso = () => iso(T());
const mark = (d, id) => { const L = doc() && doc().log; return (L && L[d] && L[d][id]) || ""; };
const createdOf = (h) => A.parseD(h.created) || T();
const colorVar = (h) => `var(--hb-c${(Number(h.color) || 0) % PALETTE})`;
const save = () => A.persist();
/* focus is restored synchronously, so a quick next key press (wheel arrows) is never overtaken by a late refocus */
function rerender(focusSel) { A.render(); if (!focusSel) return; const el = document.querySelector(focusSel); if (el && document.activeElement !== el) el.focus({ preventScroll: true }); }
function uid() { return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function nextColor() { const used = new Set(items().map((h) => Number(h.color))); for (let i = 0; i < PALETTE; i++) if (!used.has(i)) return i; return items().length % PALETTE; }

/* ---------- hard days from the clerkship schedule ---------- */
function minutesOf(t) {
  const m = String(t || "").trim().match(/^(\d{1,2})(?::?(\d{2}))?\s*([ap])?\.?m?\b/i); if (!m) return null;
  let h = +m[1]; const mi = +(m[2] || 0); const ap = (m[3] || "").toLowerCase();
  if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0;
  return h > 23 ? null : h * 60 + mi;
}
function hardDay(dIso) {
  const ev = (A.schedFor(dIso) || []);
  const call = ev.find((e) => e.kind === "call");
  if (call) return { why: `${/short/i.test(call.title || "") ? "Short call" : "Call"} today — the 2-minute version counts.`, auto: true };
  if (ev.some((e) => e.kind === "exam")) return { why: "Exam day — the 2-minute version counts.", auto: true };
  const early = ev.filter((e) => e.kind !== "off").map((e) => ({ e, m: minutesOf(e.time) })).filter((x) => x.m !== null && x.m < 6 * 60).sort((a, b) => a.m - b.m)[0];
  if (early) return { why: `${early.e.time} start — the 2-minute version counts.`, auto: true };
  const d = doc(); if (d && d.easy && d.easy[dIso]) return { why: "Rough day — the 2-minute version counts.", auto: false };
  return null;
}

/* ---------- numbers: consistency, run, misses, progression ---------- */
function countDone(h, from, to) { let n = 0; for (let d = new Date(from); d <= to; d = A.addDays(d, 1)) if (mark(iso(d), h.id)) n++; return n; }
function stats(h) {
  const t = T(); const c = createdOf(h); const doneToday = !!mark(iso(t), h.id);
  const end = doneToday ? t : A.addDays(t, -1);
  const start = new Date(Math.max(+A.addDays(end, -27), +c));
  const span = A.diffDays(start, end) + 1;
  let score = null;
  if (span > 0) { const target = Math.max(1, Math.round(h.days * span / 7)); score = Math.min(1, countDone(h, start, end) / target); }
  let run = 0; for (let d = new Date(end); d >= c && mark(iso(d), h.id); d = A.addDays(d, -1)) run++;
  /* never miss twice: count missed slots since the last time it was done (slot = 7/days days) */
  let last = null; for (let d = A.addDays(t, -1), i = 0; i < 90 && d >= c; d = A.addDays(d, -1), i++) if (mark(iso(d), h.id)) { last = d; break; }
  const gap = A.diffDays(last || A.addDays(c, -1), t) - 1;
  const misses = Math.floor(Math.max(0, gap) / (7 / Math.max(1, h.days)));
  return { score, run, doneToday, misses, nudge: !doneToday && misses >= 2 };
}
function offer(h) {
  const t = T(); if (A.diffDays(createdOf(h), t) < 14) return null;
  const recent = (h.history || []).some((x) => ["up", "down", "keep", "grow"].includes(x.type) && A.diffDays(A.parseD(x.at) || t, t) < 14);
  if (recent) return null;
  const r1 = countDone(h, A.addDays(t, -7), A.addDays(t, -1)) / h.days, r2 = countDone(h, A.addDays(t, -14), A.addDays(t, -8)) / h.days;
  if (r1 >= 0.8 && r2 >= 0.8) return h.days < 7 ? { dir: "up", to: h.days + 1 } : { dir: "grow" };
  if (r1 < 0.4 && r2 < 0.4 && h.days > 1) return { dir: "down", to: Math.max(1, h.days - 2) };
  return null;
}

/* ---------- logging ---------- */
function setMark(dIso, id, val) {
  const d = ensure(); const day = d.log[dIso] || (d.log[dIso] = {});
  if (val) day[id] = val; else { delete day[id]; if (!Object.keys(day).length) delete d.log[dIso]; }
}
function celebrate(h, ver) { A.toast(h.reward ? `${ver === "tiny" ? "2-minute version done" : "Done"}. ${h.reward}.`.replace(/\.\.$/, ".") : CELEBRATE[Math.floor(Math.random() * CELEBRATE.length)]); }
function toggle(dIso, id, ver) {
  const h = items().find((x) => x.id === id); if (!h) return false;
  const was = mark(dIso, id);
  if (was && (!ver || ver === was)) { setMark(dIso, id, ""); save(); A.toast(`${h.name}: unmarked.`); return false; }
  const v = ver || (hardDay(dIso) ? "tiny" : "full");
  setMark(dIso, id, v); save(); celebrate(h, v); U().pop = `${dIso}|${id}`; return true;
}

/* ---------- Anki through AnkiConnect (desktop only) ---------- */
async function ankiCall(action, params) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 3000);
  try {
    /* text/plain body keeps this a simple CORS request (no preflight); AnkiConnect parses JSON regardless */
    const r = await fetch(ANKI_URL, { method: "POST", body: JSON.stringify(params ? { action, version: 6, params } : { action, version: 6 }), signal: ctl.signal });
    const j = await r.json();
    if (j && j.error) throw new Error(String(j.error));
    return j ? j.result : null;
  } finally { clearTimeout(to); }
}
const ankiItems = () => items().filter((h) => h.anki);
async function syncAnki(manual) {
  const list = ankiItems(); const u = U(); if (!list.length || u.syncing) return;
  u.syncing = true; u.tried = Date.now(); if (manual) refreshInPlace();
  const tIso = todayIso(); let msg, ok = false, marked = [];
  try {
    const reviewed = Number(await ankiCall("getNumCardsReviewedToday")) || 0;
    const dues = [];
    for (const h of list) {
      const deck = String((h.anki && h.anki.deck) || "").trim().replace(/"/g, "");
      const ids = await ankiCall("findCards", { query: deck ? `deck:"${deck}" is:due` : "is:due" });
      const due = Array.isArray(ids) ? ids.length : 0; dues.push(due);
      if (due === 0 && reviewed > 0 && !mark(tIso, h.id)) { setMark(tIso, h.id, "full"); marked.push(h); }
    }
    const d = ensure(); d.anki.counts[tIso] = reviewed; ok = true;
    const due = Math.max(...dues);
    msg = due === 0 && reviewed > 0 ? `${reviewed} reviewed today, nothing due. Done.` : reviewed === 0 && due === 0 ? "Nothing due and nothing reviewed yet today." : `${reviewed} reviewed, ${due} still due.`;
  } catch (e) { msg = ANKI_FAIL; }
  const d = ensure(); d.anki.lastSync = Date.now(); d.anki.status = { ok, msg, at: Date.now() };
  u.syncing = false; save();
  if (marked.length) A.toast(`Anki's done for today — ${marked.map((h) => h.name).join(", ")} filled in.`);
  else if (manual) A.toast(ok ? `Anki: ${msg}` : "Couldn't reach Anki.");
  refreshInPlace();
}
function refreshInPlace() { const v = A.ui.view; if (v === "habits" || v === "today") A.render(); }
function syncTime() { const s = doc() && doc().anki && doc().anki.status; if (!s || !s.at) return ""; const d = new Date(s.at); return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function ankiLine() {
  const u = U(); if (u.syncing) return `<span class="hb-anki-st" role="status">Checking Anki…</span>`;
  const s = doc() && doc().anki && doc().anki.status; if (!s) return `<span class="hb-anki-st" role="status">Not synced yet.</span>`;
  return `<span class="hb-anki-st ${s.ok ? "" : "is-off"}" role="status">${s.ok ? `Anki · ${esc(syncTime())}: ` : ""}${esc(s.msg)}</span>`;
}

/* ---------- Today rows (shared by the Today card and the Habits page) ---------- */
function rowHtml(h, hard, where) {
  const t = todayIso(); const m = mark(t, h.id); const st = stats(h); const tinyNow = hard || st.nudge;
  const sub = m ? (m === "tiny" ? `2-minute version: ${h.tiny}` : (h.reward ? `Reward: ${h.reward}` : h.full))
    : tinyNow ? `2 min: ${h.tiny}` : `${h.anchor ? `After I ${h.anchor} · ` : ""}${h.full}`;
  const cnt = h.anki && doc().anki.counts[t] != null ? ` · ${doc().anki.counts[t]} cards` : "";
  const alt = m ? "" : tinyNow ? `<button class="hb-alt" id="hb-${where}-a-${h.id}" data-act="hab-today" data-id="${h.id}" data-ver="full">Did the full version</button>` : `<button class="hb-alt" id="hb-${where}-a-${h.id}" data-act="hab-today" data-id="${h.id}" data-ver="tiny">Just 2 min</button>`;
  const pop = U().pop === `${t}|${h.id}` ? " is-pop" : "";
  return `<li class="hb-row${m ? " is-done" : ""}${pop}" style="--hb-c:${colorVar(h)}">
    <button class="hb-tick" id="hb-${where}-${h.id}" data-act="hab-today" data-id="${h.id}" aria-pressed="${m ? "true" : "false"}" aria-label="${esc(h.name)}: ${m ? (m === "tiny" ? "done, 2-minute version" : "done") : "not done"} today${tinyNow && !m ? ". Tap to log the 2-minute version" : ""}">
      <span class="hb-box" aria-hidden="true">${CHECK}</span>
      <span class="hb-tt"><b>${esc(h.name)}${h.anki ? ` <i class="hb-tag">Anki</i>` : ""}</b><small>${esc(sub)}${esc(cnt)}</small></span>
    </button>${alt}
    ${st.nudge ? `<p class="hb-nudge">Two misses in a row is the moment that matters. The 2-minute version keeps it alive: <b>${esc(h.tiny)}</b>.</p>` : ""}
  </li>`;
}
function hardHtml(hard, where) {
  const t = todayIso();
  if (hard) return `<p class="hb-easy" role="note"><span>${esc(hard.why)}</span>${hard.auto ? "" : ` <button class="link" id="hb-${where}-easy" data-act="hab-easy">Undo</button>`}</p>`;
  return `<p class="hb-easy-off"><button class="link" id="hb-${where}-easy" data-act="hab-easy">Rough day? Switch to 2-minute versions</button></p>`;
}
function listHtml(where) {
  const hard = hardDay(todayIso()); const its = items();
  return where === "t" ? `${hard ? hardHtml(hard, where) : ""}<ul class="hb-rows">${its.map((h) => rowHtml(h, hard, where)).join("")}</ul>${hard ? "" : hardHtml(hard, where)}`
    : `${hardHtml(hard, where)}<ul class="hb-rows">${its.map((h) => rowHtml(h, hard, where)).join("")}</ul>`;
}
function todayCard() {
  if (!A.booted) return "";
  const its = items();
  if (!its.length) return `<section class="panel hb-today hb-invite" id="hb-today" aria-labelledby="hb-today-h"><div class="hb-invite-in"><div><h2 id="hb-today-h">Habits</h2><p class="hint">Two or three small habits, anchored to things you already do, one tap a day.</p></div><a class="btn small" href="#habits">Set up habits</a></div></section>`;
  const t = todayIso(); const n = its.filter((h) => mark(t, h.id)).length;
  return `<section class="panel hb-today" id="hb-today" aria-labelledby="hb-today-h">
    <div class="panel-head"><span class="ph-t"><h2 id="hb-today-h">Habits</h2><span class="count-chip num" aria-label="${n} of ${its.length} done today">${n}/${its.length}</span></span>
      <span class="hb-head-acts">${ankiItems().length ? `<button class="btn quiet small" id="hb-today-sync" data-act="hab-sync">Sync Anki</button>` : ""}<a class="link" href="#habits">All habits</a></span></div>
    ${n === its.length ? `<p class="hb-all">All done today. That's who you are.</p>` : ""}
    ${listHtml("t")}
    ${ankiItems().length ? `<p class="hb-foot">${ankiLine()}</p>` : ""}
  </section>`;
}

/* ---------- the wheel ---------- */
const R_OUT = 150, LBL = 163;
function pt(r, a) { const x = r * Math.cos(a), y = r * Math.sin(a); return `${x.toFixed(2)} ${y.toFixed(2)}`; }
function sector(ri, ro, a0, a1) { const large = a1 - a0 > Math.PI ? 1 : 0; return `M${pt(ro, a0)}A${ro} ${ro} 0 ${large} 1 ${pt(ro, a1)}L${pt(ri, a1)}A${ri} ${ri} 0 ${large} 0 ${pt(ri, a0)}Z`; }
function monthOf() { const u = U(); const m = A.parseD((u.month || "") + "-01"); const t = T(); return m || new Date(t.getFullYear(), t.getMonth(), 1); }
function wheelHtml() {
  const its = items(); const m = monthOf(); const y = m.getFullYear(), mo = m.getMonth();
  const D = new Date(y, mo + 1, 0).getDate(); const t = T(); const n = its.length;
  const w = Math.min(30, (R_OUT - 36) / Math.max(1, n)); const r0 = R_OUT - n * w;
  const step = (2 * Math.PI) / D; const gap = Math.min(0.012, step * 0.08); const top = -Math.PI / 2;
  const u = U(); const isCur = y === t.getFullYear() && mo === t.getMonth();
  const focusKey = u.focus || `0-${isCur ? t.getDate() : 1}`;
  let cells = "";
  its.forEach((h, i) => {
    const ri = r0 + i * w + 1, ro = r0 + (i + 1) * w - 1; const c = createdOf(h);
    for (let day = 1; day <= D; day++) {
      const d = new Date(y, mo, day); const dI = iso(d); const a0 = top + (day - 1) * step + gap, a1 = top + day * step - gap;
      const mk = mark(dI, h.id); const future = d > t; const before = d < c;
      const cls = mk ? (mk === "tiny" ? "is-tiny" : "is-done") : future ? "is-future" : before ? "is-before" : "is-miss";
      const label = `${h.name}, ${MON[mo]} ${day}: ${mk ? (mk === "tiny" ? "done, 2-minute version" : "done") : future ? "upcoming" : "not done"}`;
      const key = `${i}-${day}`; const pop = u.pop === `${dI}|${h.id}` ? " is-pop" : "";
      cells += `<path id="hb-c-${key}" class="hb-cell ${cls}${pop}" d="${sector(ri, ro, a0, a1)}" style="--hb-c:${colorVar(h)}" role="button" tabindex="${key === focusKey ? 0 : -1}" aria-label="${esc(label)}" aria-pressed="${mk ? "true" : "false"}"${future ? ` aria-disabled="true"` : ""} data-act="hab-cell" data-id="${h.id}" data-d="${dI}" data-r="${i}" data-day="${day}"/>`;
      if (mk === "tiny") { const am = (a0 + a1) / 2, rm = (ri + ro) / 2; const [cx, cy] = pt(rm, am).split(" "); cells += `<circle class="hb-tiny-dot" cx="${cx}" cy="${cy}" r="${Math.max(1.4, Math.min(3, w / 7))}" aria-hidden="true"/>`; }
    }
  });
  let labels = "";
  for (let day = 1; day <= D; day++) {
    const a = top + (day - 0.5) * step; const [x, yy] = pt(LBL, a).split(" ");
    const isT = isCur && day === t.getDate();
    labels += `<text x="${x}" y="${yy}" class="hb-day${isT ? " is-today" : ""}" text-anchor="middle" dominant-baseline="central">${day}</text>`;
  }
  const todayRing = isCur && n ? `<path class="hb-today-spoke" d="${sector(r0 - 2, R_OUT + 2, top + (t.getDate() - 1) * step, top + t.getDate() * step)}" aria-hidden="true"/>` : "";
  const tI = todayIso(); const doneT = its.filter((h) => mark(tI, h.id)).length;
  const centre = isCur ? `<text class="hb-c-big" y="-4" text-anchor="middle">${doneT}/${n}</text><text class="hb-c-small" y="14" text-anchor="middle">today</text>` : `<text class="hb-c-big" y="-4" text-anchor="middle">${MON[mo]}</text><text class="hb-c-small" y="14" text-anchor="middle">${y}</text>`;
  return `<svg class="hb-wheel" viewBox="-180 -180 360 360" role="group" aria-label="Habit wheel for ${MONTHL[mo]} ${y}. One ring per habit, inner to outer: ${esc(its.map((h) => h.name).join(", "))}. Arrow keys move between days and rings; Enter or Space marks a day.">
    <circle class="hb-hole" r="${Math.max(0, r0 - 3)}" aria-hidden="true"/>${centre}${cells}${todayRing}<g aria-hidden="true">${labels}</g></svg>`;
}
function legendHtml() {
  return `<ol class="hb-legend" aria-label="Rings, inner to outer">${items().map((h) => `<li style="--hb-c:${colorVar(h)}"><i aria-hidden="true"></i>${esc(h.name)}</li>`).join("")}</ol>
  <p class="hb-key hint"><span><i class="k-done" aria-hidden="true"></i>Done</span><span><i class="k-tiny" aria-hidden="true"></i>2-minute version</span><span><i class="k-miss" aria-hidden="true"></i>Missed</span><span><i class="k-fut" aria-hidden="true"></i>Upcoming</span></p>`;
}

/* ---------- heat map ---------- */
function shareOn(d) {
  const act = items().filter((h) => createdOf(h) <= d); if (!act.length) return null;
  const dI = iso(d); return { done: act.filter((h) => mark(dI, h.id)).length, of: act.length };
}
function heatHtml() {
  const t = T(); const mon = A.addDays(t, -((t.getDay() + 6) % 7)); const start = A.addDays(mon, -25 * 7);
  let cells = "", months = "", full = 0, any = 0, lastM = -1;
  for (let wk = 0; wk < 26; wk++) {
    const ws = A.addDays(start, wk * 7); const mo = ws.getMonth();
    months += `<span>${mo !== lastM && ws.getDate() <= 7 ? MON[mo] : wk === 0 ? MON[mo] : ""}</span>`; if (mo !== lastM) lastM = mo;
    for (let i = 0; i < 7; i++) {
      const d = A.addDays(ws, i);
      if (d > t) { cells += `<span class="hb-hm is-fut"></span>`; continue; }
      const s = shareOn(d); let lv = 0, tip = `${MON[d.getMonth()]} ${d.getDate()}: no habits yet`;
      if (s) { const r = s.done / s.of; lv = r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4; tip = `${MON[d.getMonth()]} ${d.getDate()}: ${s.done} of ${s.of}`; if (r === 1) full++; if (s.done) any++; }
      cells += `<span class="hb-hm l${lv}" title="${tip}"></span>`;
    }
  }
  return `<div class="hb-heat-wrap"><div class="hb-heat-m" aria-hidden="true">${months}</div>
    <div class="hb-heat" role="img" aria-label="Last 26 weeks: ${any} days with at least one habit done, ${full} with every habit done.">${cells}</div></div>
    <p class="hb-hlegend hint" aria-hidden="true"><span>Share of the day's habits done:</span><span>none</span>${[0, 1, 2, 3, 4].map((l) => `<i class="hb-hm l${l}"></i>`).join("")}<span>all</span></p>`;
}
function stripHtml(h) {
  const t = T(); const c = createdOf(h); let s = "";
  for (let i = 27; i >= 0; i--) { const d = A.addDays(t, -i); const m = mark(iso(d), h.id); s += `<i class="${m ? "on" : d < c ? "pre" : i === 0 ? "now" : "off"}"></i>`; }
  return `<span class="hb-strip" style="--hb-c:${colorVar(h)}" role="img" aria-label="${esc(h.name)}, last 28 days: ${countDone(h, A.addDays(t, -27), t)} done">${s}</span>`;
}

/* ---------- per-habit progress, offers and nudges ---------- */
function progressHtml() {
  return `<ul class="hb-prog">${items().map((h) => {
    const st = stats(h); const o = offer(h); const pct = st.score === null ? "—" : `${Math.round(st.score * 100)}%`;
    let off = "";
    if (o && o.dir === "up") off = `<div class="hb-offer" role="note"><p>Two strong weeks in a row. Ready to step up to <b>${o.to} days a week</b>?</p><div class="hb-offer-acts"><button class="btn small" id="hb-up-${h.id}" data-act="hab-up" data-id="${h.id}">Step up to ${o.to}</button><button class="btn quiet small" data-act="hab-keep" data-id="${h.id}">Keep it as is</button></div></div>`;
    if (o && o.dir === "grow") off = `<div class="hb-offer" role="note"><p>Every day for two weeks. Want to make the full version a little bigger?</p><div class="hb-offer-acts"><button class="btn small" id="hb-grow-${h.id}" data-act="hab-grow" data-id="${h.id}">Grow the full version</button><button class="btn quiet small" data-act="hab-keep" data-id="${h.id}">Keep it as is</button></div></div>`;
    if (o && o.dir === "down") off = `<div class="hb-offer is-down" role="note"><p>The last two weeks were hard. Make it smaller so it fits: <b>${o.to} ${o.to === 1 ? "day" : "days"} a week</b>, and the 2-minute version still counts.</p><div class="hb-offer-acts"><button class="btn small" id="hb-down-${h.id}" data-act="hab-down" data-id="${h.id}">Shrink to ${o.to}</button><button class="btn quiet small" data-act="hab-keep" data-id="${h.id}">Keep it as is</button></div></div>`;
    return `<li style="--hb-c:${colorVar(h)}"><div class="hb-prog-h"><i class="hb-dot" aria-hidden="true"></i><b>${esc(h.name)}</b><span class="hb-area">${AREAS[h.area] || ""}</span></div>
      <div class="hb-prog-n"><span><b class="num">${pct}</b> <small>of target, 4 weeks</small></span><span><b class="num">${st.run}</b> <small>${st.run === 1 ? "day" : "days"} current run</small></span><span><b class="num">${h.days}</b> <small>days a week</small></span></div>
      ${stripHtml(h)}${off}</li>`;
  }).join("")}</ul>`;
}

/* ---------- setup / onboarding ---------- */
function startersHtml(mode) {
  const u = U(); const have = new Set(items().map((h) => h.starter).filter(Boolean)); const picked = Object.keys(u.pick).filter((k) => u.pick[k]);
  const room = MAX - items().length;
  return Object.keys(AREAS).map((a) => `<fieldset class="hb-area-set"><legend>${AREAS[a]}</legend><div class="hb-chips">${STARTERS.filter((s) => s.area === a).map((s) => {
    const on = !!u.pick[s.k]; const dis = have.has(s.k) || (!on && picked.length >= room);
    return `<button class="hb-chip" id="hb-s-${s.k}" data-act="${mode === "add" ? "hab-add-starter" : "hab-pick"}" data-k="${s.k}" aria-pressed="${on ? "true" : "false"}"${dis ? " disabled" : ""}><b>${esc(s.name)}</b><small>${esc(s.tiny)} on a hard day</small></button>`;
  }).join("")}</div></fieldset>`).join("");
}
function customForm(id) {
  return `<form class="hb-custom" data-hb-form="add" aria-labelledby="${id}-h"><h3 id="${id}-h">Or write your own</h3>
    <div class="hb-grid">
      <div class="field"><label for="${id}-name">Habit</label><input type="text" id="${id}-name" maxlength="40" placeholder="Stretch" required></div>
      <div class="field"><label for="${id}-area">Area</label><select id="${id}-area">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div class="field"><label for="${id}-tiny">2-minute version</label><input type="text" id="${id}-tiny" maxlength="80" placeholder="One stretch"></div>
    </div>
    <button class="btn small" type="submit" id="${id}-go"${items().length >= MAX ? " disabled" : ""}>Add habit</button></form>`;
}
function onboardingHtml() {
  const u = U(); const d = doc(); const picked = Object.keys(u.pick).filter((k) => u.pick[k]).length;
  return `<section class="panel hb-setup" aria-labelledby="hb-setup-h">
    <h2 id="hb-setup-h">Start with who you want to be</h2>
    <div class="field hb-why"><label for="hb-why">I'm someone who…</label><input type="text" id="hb-why" data-hb-doc="why" maxlength="120" placeholder="takes care of my mind, body and faith, even on call weeks" value="${esc(d ? d.why : "")}"></div>
    <h3 class="hb-sub">Pick two or three to start</h3>
    <p class="hint">Small and steady beats ambitious and abandoned. Each comes with an anchor, a 2-minute version for hard days and a reward, all editable. The wheel holds up to seven.</p>
    ${startersHtml("pick")}
    <div class="hb-setup-go"><button class="btn primary" id="hb-start" data-act="hab-start"${picked ? "" : " disabled"}>${picked ? `Start with ${picked}` : "Pick a habit"}</button><span class="hint" role="status">${picked > 3 ? "That's a lot at once. Two or three is the sweet spot." : picked ? `${picked} picked.` : ""}</span></div>
    ${customForm("hb-new")}
  </section>`;
}

/* ---------- editor ---------- */
function editorHtml(h, i) {
  const u = U(); const f = (k, label, ph, max) => `<div class="field"><label for="hb-f-${k}-${h.id}">${label}</label><input type="text" id="hb-f-${k}-${h.id}" data-hb-f="${k}" data-id="${h.id}" maxlength="${max || 80}" placeholder="${esc(ph)}" value="${esc(h[k] || "")}"></div>`;
  const hist = (h.history || []).slice(-6).reverse().map((x) => `<li>${esc(fmtIso(x.at))}: ${esc(histText(x))}</li>`).join("");
  return `<details class="hb-ed" id="hb-ed-${h.id}"${u.edit === h.id ? " open" : ""} style="--hb-c:${colorVar(h)}"><summary><i class="hb-dot" aria-hidden="true"></i><b>${esc(h.name)}</b><span class="hint">Ring ${i + 1} · ${AREAS[h.area] || ""} · ${h.days} days a week${h.anki ? " · Anki" : ""}</span></summary>
    <div class="hb-ed-in">
      <div class="hb-grid">
        ${f("name", "Habit", "Read", 40)}
        <div class="field"><label for="hb-f-area-${h.id}">Area</label><select id="hb-f-area-${h.id}" data-hb-f="area" data-id="${h.id}">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}"${h.area === k ? " selected" : ""}>${v}</option>`).join("")}</select></div>
        <div class="field"><label for="hb-f-days-${h.id}">Days a week</label><select id="hb-f-days-${h.id}" data-hb-f="days" data-id="${h.id}">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}"${h.days === n ? " selected" : ""}>${n}</option>`).join("")}</select></div>
        ${f("anchor", "After I…", "pour my morning coffee")}
        ${f("full", "Full version", "Read 20 pages")}
        ${f("tiny", "2-minute version", "Read one page")}
        ${f("reward", "Reward for completing", "A good playlist")}
      </div>
      <fieldset class="hb-colors"><legend>Colour</legend>${Array.from({ length: PALETTE }, (_, c) => `<label class="hb-sw" style="--hb-c:var(--hb-c${c})"><input type="radio" name="hb-col-${h.id}" data-hb-f="color" data-id="${h.id}" value="${c}"${Number(h.color) === c ? " checked" : ""}><span class="sr">Colour ${c + 1}</span><i aria-hidden="true"></i></label>`).join("")}</fieldset>
      <div class="hb-anki-ed"><label class="hb-check"><input type="checkbox" id="hb-f-anki-${h.id}" data-hb-f="anki" data-id="${h.id}"${h.anki ? " checked" : ""}> Fill this in from Anki</label>
        ${h.anki ? `<div class="field"><label for="hb-f-deck-${h.id}">Deck (optional)</label><input type="text" id="hb-f-deck-${h.id}" data-hb-f="deck" data-id="${h.id}" maxlength="60" placeholder="AnKing" value="${esc(h.anki.deck || "")}"><span class="hint">Done when nothing is due${h.anki.deck ? " in this deck" : ""} and you've reviewed at least one card today.</span></div>` : ""}</div>
      ${hist ? `<div class="hb-hist"><h4>History</h4><ul>${hist}</ul></div>` : ""}
      <div class="hb-ed-acts">
        <button class="btn quiet small" data-act="hab-move" data-id="${h.id}" data-dir="-1"${i === 0 ? " disabled" : ""}>Move in</button>
        <button class="btn quiet small" data-act="hab-move" data-id="${h.id}" data-dir="1"${i === items().length - 1 ? " disabled" : ""}>Move out</button>
        ${u.del === h.id ? `<span class="hb-del-q">Delete ${esc(h.name)} and its history?</span><button class="btn small danger" id="hb-del-yes" data-act="hab-del-yes" data-id="${h.id}">Delete</button><button class="btn quiet small" id="hb-del-no" data-act="hab-del-no">Cancel</button>` : `<button class="btn quiet small danger" id="hb-del-${h.id}" data-act="hab-del" data-id="${h.id}">Delete</button>`}
      </div>
    </div></details>`;
}
function fmtIso(s) { const d = A.parseD(s); return d ? A.fmtShort(d) : s; }
function histText(x) {
  if (x.type === "created") return "Started";
  if (x.type === "up") return `Stepped up from ${x.from} to ${x.to} days a week`;
  if (x.type === "down") return `Shrank from ${x.from} to ${x.to} days a week`;
  if (x.type === "grow") return "Chose to grow the full version";
  if (x.type === "keep") return "Kept it as is";
  if (x.type === "edit") return `Changed ${x.field}${x.to != null ? ` to “${x.to}”` : ""}`;
  return x.type;
}

/* ---------- the page ---------- */
function ankiPanel() {
  const has = ankiItems().length;
  return `<section class="panel hb-anki" aria-labelledby="hb-anki-h">
    <div class="panel-head"><h2 id="hb-anki-h">Anki sync</h2>${has ? `<button class="btn small" id="hb-sync" data-act="hab-sync">Sync now</button>` : ""}</div>
    <p class="hb-anki-line">${has ? ankiLine() : `<span class="hint">Tick “Fill this in from Anki” on a habit to have it fill itself in when you finish your cards.</span>`}</p>
    <details class="hb-guide"${has && doc().anki.status && !doc().anki.status.ok ? " open" : ""}><summary>Set up Anki sync (desktop, about 2 minutes)</summary><ol>
      <li>In Anki on your computer: Tools → Add-ons → Get Add-ons, enter <code>2055492159</code> (AnkiConnect), then restart Anki.</li>
      <li>Tools → Add-ons → AnkiConnect → Config. Add <code>https://maazimam-stack.github.io</code> to <code>webCorsOriginList</code>, save and restart Anki.</li>
      <li>Keep Anki open. When you open Today or Habits here on the same computer, it checks: once nothing's due and you've reviewed today, the habit fills itself in.</li>
    </ol><p class="hint">Phones can't sync this way: AnkiMobile and AnkiDroid don't offer a local connection. On your phone, tap the habit yourself. Sync only ever marks a day done, never undone.</p></details>
  </section>`;
}
/* DOM order is the phone order (Today, wheel, heat map, habits, progress), so focus order matches what you see on a phone;
   on desktop the wheel column spans both rows on the left, Today and How it's going stack on the right. */
function vHabits() {
  const its = items(); const d = doc(); const u = U();
  const lead = d && d.why ? `You're someone who <b>${esc(d.why.replace(/^(i'?m |i am )?someone who /i, ""))}</b>.` : "Small habits anchored to what you already do, one tap a day, with a 2-minute version for call days.";
  const head = `<div class="title-row"><div><h1>Habits</h1><p class="finding">${lead}</p></div>${its.length ? `<div class="title-actions">${ankiItems().length ? `<button class="btn small" id="hb-sync-top" data-act="hab-sync">Sync Anki</button>` : ""}<button class="btn small" id="hb-add" data-act="hab-add" aria-expanded="${u.add ? "true" : "false"}"${its.length >= MAX ? " disabled" : ""}>Add habit</button></div>` : ""}</div>`;
  if (!its.length) return `<div class="hb" id="hb-root">${head}${onboardingHtml()}${ankiPanel()}</div>`;
  const m = monthOf(); const t = T(); const isCur = m.getFullYear() === t.getFullYear() && m.getMonth() === t.getMonth();
  return `<div class="hb" id="hb-root">${head}
    ${u.add ? `<section class="panel hb-addp" aria-labelledby="hb-add-h"><div class="panel-head"><h2 id="hb-add-h">Add a habit</h2><button class="btn quiet small" data-act="hab-add">Close</button></div><p class="hint">${its.length >= 3 ? "You've got " + its.length + ". Add one when the others feel automatic." : "Pick one, or write your own."} ${MAX - its.length} ${MAX - its.length === 1 ? "ring" : "rings"} left.</p>${startersHtml("add")}${customForm("hb-more")}</section>` : ""}
    <div class="hb-cols">
        <section class="panel hb-todayp" aria-labelledby="hb-todayp-h"><div class="panel-head"><h2 id="hb-todayp-h">Today</h2><span class="hint">${A.fmtShort(t)}</span></div>${listHtml("p")}</section>
      <div class="hb-left">
      <section class="panel hb-wheel-p" aria-labelledby="hb-wheel-h">
        <div class="panel-head"><h2 id="hb-wheel-h">${MONTHL[m.getMonth()]} ${m.getFullYear()}</h2>
          <div class="hb-mnav"><button class="btn icon small" id="hb-mprev" data-act="hab-month" data-n="-1" aria-label="Previous month"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg></button><button class="btn small" id="hb-mnow" data-act="hab-month" data-n="0"${isCur ? " disabled" : ""}>This month</button><button class="btn icon small" id="hb-mnext" data-act="hab-month" data-n="1" aria-label="Next month"${isCur ? " disabled" : ""}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg></button></div></div>
        <div class="hb-wheel-box">${wheelHtml()}</div>
        ${legendHtml()}
      </section>
      <section class="panel" aria-labelledby="hb-heat-h"><div class="panel-head"><h2 id="hb-heat-h">Last 26 weeks</h2></div>${heatHtml()}</section>
      <section class="panel" aria-labelledby="hb-eds-h"><div class="panel-head"><h2 id="hb-eds-h">Your habits</h2><span class="hint">Inner ring first</span></div><div class="hb-eds">${its.map(editorHtml).join("")}</div></section>
      </div>
        <section class="panel hb-progp" aria-labelledby="hb-prog-h"><div class="panel-head"><h2 id="hb-prog-h">How it's going</h2></div>${progressHtml()}<p class="hint hb-why-score">Consistency is the share of your target days met over four weeks. One missed day doesn't undo a habit; two in a row is the moment to come back small.</p></section>
    </div>
    <section class="panel hb-notes" aria-labelledby="hb-notes-h"><div class="panel-head"><h2 id="hb-notes-h">Why it matters</h2></div>
      <div class="hb-grid2">
        <div class="field"><label for="hb-why2">I'm someone who…</label><input type="text" id="hb-why2" data-hb-doc="why" maxlength="120" value="${esc(d.why || "")}" placeholder="takes care of my mind, body and faith"></div>
        <div class="field"><label for="hb-mot">Motivations</label><textarea id="hb-mot" data-hb-doc="motivations" rows="3" maxlength="1000" placeholder="Who are you doing this for? What changes when you do?">${esc(d.motivations || "")}</textarea></div>
        <div class="field"><label for="hb-notes">Notes</label><textarea id="hb-notes" data-hb-doc="notes" rows="3" maxlength="2000" placeholder="What helped this month, what got in the way">${esc(d.notes || "")}</textarea></div>
      </div></section>
    ${ankiPanel()}
  </div>`;
}

/* ---------- actions ---------- */
function fromStarter(s) {
  return { id: uid(), starter: s.k, name: s.name, area: s.area, anchor: s.anchor, full: s.full, tiny: s.tiny, days: s.days, reward: s.reward, color: nextColor(), anki: s.anki ? { deck: "" } : null, created: todayIso(), history: [{ at: todayIso(), type: "created" }] };
}
function addItem(h) { const d = ensure(); if (d.items.length >= MAX) { A.toast("The wheel has seven rings. Retire one to add another."); return false; } d.items.push(h); return true; }
function byId(id) { return items().find((h) => h.id === id); }
function cellFocus(r, day) { const u = U(); u.focus = `${r}-${day}`; }

const acts = {
  "hab-today": (el) => { const id = el.dataset.id; const on = toggle(todayIso(), id, el.dataset.ver || ""); const where = el.id.startsWith("hb-t-") ? "t" : "p"; rerender(`#hb-${where}-${id}`); if (on) setTimeout(() => { U().pop = null; }, 600); },
  "hab-cell": (el) => {
    if (el.getAttribute("aria-disabled") === "true") { A.toast("That day hasn't happened yet."); return; }
    toggle(el.dataset.d, el.dataset.id, ""); cellFocus(el.dataset.r, el.dataset.day); rerender(`#hb-c-${el.dataset.r}-${el.dataset.day}`); setTimeout(() => { U().pop = null; }, 600);
  },
  "hab-easy": (el) => { const d = ensure(); const t = todayIso(); if (d.easy[t]) delete d.easy[t]; else d.easy[t] = true; save(); rerender(`#${el.id}`); },
  "hab-month": (el) => {
    const n = Number(el.dataset.n); const u = U(); const t = T();
    if (!n) u.month = ""; else { const m = monthOf(); const x = new Date(m.getFullYear(), m.getMonth() + n, 1); u.month = x > t ? "" : iso(x).slice(0, 7); }
    u.focus = null; rerender(`#${el.disabled ? "hb-mprev" : el.id}`);
    setTimeout(() => { if (document.activeElement && document.activeElement.disabled) document.getElementById("hb-mprev")?.focus(); }, 10);
  },
  "hab-pick": (el) => { const u = U(); u.pick[el.dataset.k] = !u.pick[el.dataset.k]; rerender(`#hb-s-${el.dataset.k}`); },
  "hab-start": () => {
    const u = U(); const ks = STARTERS.filter((s) => u.pick[s.k]); if (!ks.length) return;
    ensure(); ks.forEach((s) => addItem(fromStarter(s))); u.pick = {}; save();
    A.toast(`${ks.length === 1 ? "One habit" : ks.length + " habits"} on the wheel. Edit anchors and rewards below anytime.`);
    rerender("#hb-root h1"); if (ankiItems().length) syncAnki(false);
  },
  "hab-add": () => { const u = U(); u.add = !u.add; u.pick = {}; rerender(u.add ? "#hb-add-h" : "#hb-add"); },
  "hab-add-starter": (el) => { const s = STARTERS.find((x) => x.k === el.dataset.k); if (!s) return; ensure(); if (addItem(fromStarter(s))) { save(); A.toast(`${s.name} added as ring ${items().length}.`); } U().add = false; rerender("#hb-add"); },
  "hab-sync": () => syncAnki(true),
  "hab-up": (el) => step(el.dataset.id, "up"),
  "hab-down": (el) => step(el.dataset.id, "down"),
  "hab-grow": (el) => { const h = byId(el.dataset.id); if (!h) return; (h.history = h.history || []).push({ at: todayIso(), type: "grow" }); U().edit = h.id; save(); rerender(`#hb-f-full-${h.id}`); setTimeout(() => document.getElementById(`hb-ed-${h.id}`)?.scrollIntoView({ block: "center" }), 20); },
  "hab-keep": (el) => { const h = byId(el.dataset.id); if (!h) return; (h.history = h.history || []).push({ at: todayIso(), type: "keep" }); save(); A.toast("Kept as is. We'll check again in two weeks."); rerender("#hb-prog-h"); },
  "hab-move": (el) => { const d = ensure(); const i = d.items.findIndex((h) => h.id === el.dataset.id); const j = i + Number(el.dataset.dir); if (i < 0 || j < 0 || j >= d.items.length) return; [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; U().edit = el.dataset.id; save(); rerender(`#hb-ed-${el.dataset.id} summary`); },
  "hab-del": (el) => { U().del = el.dataset.id; U().edit = el.dataset.id; rerender("#hb-del-no"); },
  "hab-del-no": () => { const id = U().del; U().del = null; rerender(`#hb-del-${id}`); },
  "hab-del-yes": (el) => { const d = ensure(); const h = byId(el.dataset.id); d.items = d.items.filter((x) => x.id !== el.dataset.id); for (const k of Object.keys(d.log)) { delete d.log[k][el.dataset.id]; if (!Object.keys(d.log[k]).length) delete d.log[k]; } U().del = null; save(); if (h) A.toast(`${h.name} removed.`); rerender("#hb-root h1"); }
};
function step(id, dir) {
  const h = byId(id); const o = h && offer(h); if (!h || !o || !o.to) return;
  (h.history = h.history || []).push({ at: todayIso(), type: dir, from: h.days, to: o.to }); h.days = o.to; save();
  A.toast(dir === "up" ? `${h.name}: ${o.to} days a week now.` : `${h.name}: ${o.to} ${o.to === 1 ? "day" : "days"} a week. Small is how it sticks.`);
  rerender("#hb-prog-h");
}

const on = {
  change(ev) {
    const t = ev.target; if (!t.dataset) return false;
    if (t.dataset.hbF) {
      const h = byId(t.dataset.id); if (!h) return true; const k = t.dataset.hbF;
      if (k === "days") { const v = Math.max(1, Math.min(7, Number(t.value) || h.days)); if (v !== h.days) { (h.history = h.history || []).push({ at: todayIso(), type: v > h.days ? "up" : "down", from: h.days, to: v }); h.days = v; } }
      else if (k === "color") h.color = Number(t.value) || 0;
      else if (k === "area") h.area = AREAS[t.value] ? t.value : h.area;
      else if (k === "anki") h.anki = t.checked ? { deck: (h.anki && h.anki.deck) || "" } : null;
      else if (k === "deck") { if (h.anki) h.anki.deck = String(t.value).trim().slice(0, 60); save(); return true; }
      else { const v = String(t.value).trim().slice(0, k === "name" ? 40 : 80); if (k === "name" && !v) { t.value = h.name; return true; } if (h[k] !== v) { h[k] = v; if (k === "full" || k === "tiny") (h.history = h.history || []).push({ at: todayIso(), type: "edit", field: k === "full" ? "the full version" : "the 2-minute version", to: v }); } save(); return true; }
      U().edit = h.id; save(); rerender(`#${t.id || `hb-ed-${h.id} summary`}`);
      if (k === "anki" && h.anki) syncAnki(false);
      return true;
    }
    if (t.dataset.hbDoc) return true; /* saved on input */
    return false;
  },
  input(ev) {
    const t = ev.target; if (!t.dataset || !t.dataset.hbDoc) return false;
    const d = ensure(); d[t.dataset.hbDoc] = String(t.value).slice(0, t.dataset.hbDoc === "why" ? 120 : 2000); save(); return true;
  },
  submit(ev) {
    const f = ev.target; if (!f.dataset || f.dataset.hbForm !== "add") return false;
    const id = f.querySelector("input[type=text]").id.replace(/-name$/, "");
    const name = String(document.getElementById(`${id}-name`).value).trim().slice(0, 40); if (!name) return true;
    const area = document.getElementById(`${id}-area`).value; const tiny = String(document.getElementById(`${id}-tiny`).value).trim().slice(0, 80);
    ensure();
    const h = { id: uid(), name, area: AREAS[area] ? area : "mind", anchor: "", full: name, tiny: tiny || `Two minutes of ${name.toLowerCase()}`, days: 5, reward: "", color: nextColor(), anki: null, created: todayIso(), history: [{ at: todayIso(), type: "created" }] };
    if (addItem(h)) { save(); U().edit = h.id; U().add = false; A.toast(`${name} added. Give it an anchor below.`); rerender(`#hb-f-anchor-${h.id}`); }
    return true;
  }
};

/* wheel keyboard: arrows move between days (left/right) and rings (up = outward, down = inward); Enter/Space toggles */
document.addEventListener("keydown", (ev) => {
  const t = ev.target; if (!t || !t.classList || !t.classList.contains("hb-cell")) return;
  const r = Number(t.dataset.r), day = Number(t.dataset.day); const n = items().length; const m = monthOf(); const D = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  let nr = r, nd = day;
  switch (ev.key) {
    case "ArrowRight": nd = day % D + 1; break;
    case "ArrowLeft": nd = (day + D - 2) % D + 1; break;
    case "ArrowUp": nr = Math.min(n - 1, r + 1); break;
    case "ArrowDown": nr = Math.max(0, r - 1); break;
    case "Home": nd = 1; break;
    case "End": nd = D; break;
    case "Enter": case " ": ev.preventDefault(); acts["hab-cell"](t); return;
    default: return;
  }
  ev.preventDefault();
  const nx = document.getElementById(`hb-c-${nr}-${nd}`); if (!nx) return;
  t.setAttribute("tabindex", "-1"); nx.setAttribute("tabindex", "0"); nx.focus(); cellFocus(nr, nd);
});

/* sync Anki quietly when Today or Habits opens (at most once a minute) */
document.addEventListener("perl:view", (ev) => {
  const v = ev.detail && ev.detail.view; if (v !== "today" && v !== "habits") return;
  if (!A.booted || !ankiItems().length) return;
  const u = U(); if (u.syncing || Date.now() - (u.tried || 0) < 60000) return;
  setTimeout(() => syncAnki(false), 0);
});

window.PERL_MODULES = window.PERL_MODULES || [];
window.PERL_MODULES.push({ views: { habits: vHabits }, acts, on, today: todayCard });
})();
