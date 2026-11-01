/* FMCC night clinic: one weekly night, one team, all year, minus the weeks you're off for QI or SDOH.
   Data lives in state.fmcc (the School-side document):
     { v:1, day: 1..4 (Mon..Thu), team: "A".."E", from: "YYYY-MM-DD", to: "YYYY-MM-DD",
       off: [{ id, from, to, kind: "QI"|"SDOH"|"Off" }], skip: ["YYYY-MM-DD"] }
   Every student keeps the same night and team all year (CICOM schedule), so set-up happens once; a QI or SDOH week takes
   you off clinic for that week. Clinic nights reach the Calendar through window.PERL_DATED as routine items (they don't
   crowd "Coming up"); off weeks show as changes. On a clinic night Today shows tonight's clinic and a button that opens
   a debrief tagged "FMCC night clinic", so the diary lives in the private Debrief journal with its patient-detail scrub. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A) return;

const DAYS = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday" };
const TEAMS = ["A", "B", "C", "D", "E"];
const KINDS = { QI: "QI project week", SDOH: "SDOH week", Off: "Off" };
const DIARY = "FMCC night clinic";
const esc = (s) => A.esc(s);
const U = () => { const ui = A.ui; if (!ui.fmcc) ui.fmcc = { edit: false, err: "", addErr: "" }; return ui.fmcc; };
const doc = () => { const f = A.state.fmcc; return f && f.v === 1 && DAYS[f.day] && TEAMS.includes(f.team) ? f : null; };
const save = () => A.persist();
const uid = () => "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const iso = (d) => A.isoD(d);
function rerender(sel) { A.render(); if (!sel || sel === "#") return; let el = null; try { el = document.querySelector(sel); } catch { return; } if (el) { if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }

/* a week off can repeat: "every 4 weeks" is how students rotate out of clinic for their QI project */
function offFor(f, d) {
  const k = iso(d);
  return (f.off || []).find((o) => {
    if (o.from <= k && o.to >= k) return true;
    const n = Number(o.every) || 0; if (n < 2 || k < o.from) return false;
    const a = A.parseD(o.from), len = A.diffDays(a, A.parseD(o.to)), off = A.diffDays(a, d);
    return off % (n * 7) <= len;
  }) || null;
}
/* every clinic night in the window, each marked on (clinic), off (a QI/SDOH/off week) or skipped (a one-off) */
function nights(f) {
  const a = A.parseD(f.from), b = A.parseD(f.to); if (!a || !b || b < a) return [];
  let d = a; while (d.getDay() !== f.day) d = A.addDays(d, 1);
  const out = [];
  for (let i = 0; d <= b && i < 120; i++, d = A.addDays(d, 7)) {
    const o = offFor(f, d); const k = iso(d);
    out.push({ date: d, key: k, off: o, skip: (f.skip || []).includes(k) });
  }
  return out;
}
function nextNight(f) { const t = A.today(); return nights(f).find((n) => n.date >= t && !n.off && !n.skip) || null; }

/* for the Calendar and Today's lists */
function dated() {
  if (!A.booted) return []; const f = doc(); if (!f) return [];
  return nights(f).map((n) => n.off
    ? { date: n.date, label: `No night clinic: ${KINDS[n.off.kind] || "off"}`, rule: `Team ${f.team} · back the week after`, code: "", w: 1, feed: true, source: "FMCC", uid: "fmcc-off-" + n.key }
    : n.skip ? null
    : { date: n.date, label: `Night clinic · Team ${f.team}`, rule: "Patients from 6 PM; sign in on arrival", code: "", w: 1, feed: true, routine: true, source: "FMCC", time: "6:00pm", uid: "fmcc-" + n.key }).filter(Boolean);
}
(window.PERL_DATED = window.PERL_DATED || []).push(dated);

/* ---------------- Today ---------------- */
function todayCard() {
  const f = doc(); if (!f || A.state.example) return "";
  const t = A.today(); const tk = iso(t); const y = iso(A.addDays(t, -1));
  const ns = nights(f); const tonight = ns.find((n) => n.key === tk); const last = ns.find((n) => n.key === y && !n.off && !n.skip);
  if (tonight && tonight.off) return `<section class="fm-today" aria-labelledby="h-fm-t"><div><h2 id="h-fm-t">No night clinic this week</h2><p>${esc(KINDS[tonight.off.kind] || "Off")}. Back on ${esc(DAYS[f.day])}s with Team ${esc(f.team)} after it.</p></div></section>`;
  if (tonight && !tonight.skip) return `<section class="fm-today" aria-labelledby="h-fm-t"><div><h2 id="h-fm-t">Night clinic tonight · Team ${esc(f.team)}</h2><p>Be ready to walk into the room at 6 PM; sign in when you arrive.</p></div>
    <div class="fm-act"><button class="btn small" data-act="new" data-rotation="${esc(DIARY)}" data-date="${esc(tk)}" id="fm-diary">Write tonight's clinic diary</button></div></section>`;
  if (last) return `<section class="fm-today" aria-labelledby="h-fm-t"><div><h2 id="h-fm-t">How was night clinic?</h2><p>Two minutes on last night while it's fresh. No patient names, MRNs or dates.</p></div>
    <div class="fm-act"><button class="btn small" data-act="new" data-rotation="${esc(DIARY)}" data-date="${esc(y)}" id="fm-diary">Write the clinic diary</button></div></section>`;
  return "";
}

/* ---------------- the Schedule panel ---------------- */
function setupForm(f) {
  const pr = A.state.profile; const u = U();
  const day = f ? f.day : 1, team = f ? f.team : "", from = f ? f.from : pr.ciStart || iso(A.today()), to = f ? f.to : pr.ciEnd || "";
  return `<form class="fm-form" data-form="fm-setup">
    <div class="field"><label for="fm-day">Your night</label><select id="fm-day">${Object.entries(DAYS).map(([k, v]) => `<option value="${k}" ${Number(k) === day ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label for="fm-team">Your team</label><select id="fm-team"><option value="">Pick</option>${TEAMS.map((x) => `<option ${x === team ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    <div class="field"><label for="fm-from">From</label><input type="date" id="fm-from" value="${esc(from)}"></div>
    <div class="field"><label for="fm-to">Until</label><input type="date" id="fm-to" value="${esc(to)}"></div>
    <div class="fm-form-act"><button class="btn small primary" type="submit">${f ? "Save" : "Set up night clinic"}</button>${f ? `<button class="btn small quiet" type="button" data-act="fm-cancel">Cancel</button>` : ""}</div>
    ${u.err ? `<p class="err" role="alert">${esc(u.err)}</p>` : ""}
  </form>`;
}
function panel() {
  const f = doc(); const u = U();
  if (!f || u.edit) return `<section class="panel" aria-labelledby="h-fm" id="fmcc">
    <div class="panel-head"><h2 id="h-fm">FMCC night clinic</h2></div>
    <p class="tk-lead">Set your night and team once. Every clinic night lands on your Calendar, QI and SDOH weeks show as off, and Today asks for a two-minute clinic diary on clinic nights.</p>
    ${setupForm(f)}</section>`;
  const nx = nextNight(f); const offs = [...(f.off || [])].sort((a, b) => a.from.localeCompare(b.from));
  const ns = nights(f); const total = ns.filter((n) => !n.off && !n.skip).length;
  return `<section class="panel" aria-labelledby="h-fm" id="fmcc">
    <div class="panel-head"><h2 id="h-fm">FMCC night clinic</h2><button class="link" data-act="fm-edit">Edit</button></div>
    <p class="fm-sum"><b>${esc(DAYS[f.day])}s · Team ${esc(f.team)}</b> · ${esc(A.fmtShort(A.parseD(f.from)))} to ${esc(A.fmtShort(A.parseD(f.to)))} · ${A.plural(total, "clinic night")}${nx ? ` · next ${esc(A.fmtShort(nx.date))}` : ""}</p>
    <h3 class="fm-h">Weeks off clinic</h3>
    ${offs.length ? `<ul class="list fm-offs">${offs.map((o) => `<li><div class="what"><span class="t">${esc(KINDS[o.kind] || "Off")}</span><small class="num">${esc(A.fmtShort(A.parseD(o.from)))} – ${esc(A.fmtShort(A.parseD(o.to)))}${Number(o.every) >= 2 ? ` · then every ${Number(o.every)} weeks` : ""}</small></div><div class="tail"><button class="btn quiet small" data-act="fm-off-rm" data-id="${esc(o.id)}" aria-label="Remove ${esc(KINDS[o.kind] || "off")} week starting ${esc(A.fmtShort(A.parseD(o.from)))}">Remove</button></div></li>`).join("")}</ul>` : `<p class="hint">None yet. Add your QI and SDOH weeks from the FMCC Canvas page.</p>`}
    <form class="fm-form fm-add" data-form="fm-off">
      <div class="field"><label for="fm-o-kind">Week</label><select id="fm-o-kind"><option value="QI">QI project week</option><option value="SDOH">SDOH week</option><option value="Off">Other time off</option></select></div>
      <div class="field"><label for="fm-o-from">Starts</label><input type="date" id="fm-o-from" required></div>
      <div class="field"><label for="fm-o-to">Ends</label><input type="date" id="fm-o-to"></div>
      <div class="field fm-rep"><label for="fm-o-every">Repeats</label><select id="fm-o-every"><option value="0">Just this once</option><option value="4">Every 4 weeks</option></select></div>
      <div class="fm-form-act"><button class="btn small" type="submit">Add week off</button></div>
      ${u.addErr ? `<p class="err" role="alert">${esc(u.addErr)}</p>` : ""}
    </form>
    <p class="hint">Leave "Ends" empty for a single week: it runs Monday to Sunday of the week you pick.</p>
  </section>`;
}

/* ---------------- events ---------------- */
function weekOf(k) { const d = A.parseD(k); const mon = A.addDays(d, -((d.getDay() + 6) % 7)); return [iso(mon), iso(A.addDays(mon, 6))]; }
const acts = {
  "fm-edit": () => { U().edit = true; U().err = ""; rerender("#fm-day"); },
  "fm-cancel": () => { U().edit = false; U().err = ""; rerender("#h-fm"); },
  "fm-off-rm": (el) => { const f = doc(); if (!f) return; const o = f.off.find((x) => x.id === el.dataset.id); f.off = f.off.filter((x) => x.id !== el.dataset.id); save(); rerender("#fm-o-kind"); if (o) A.toast(`${KINDS[o.kind] || "Week off"} removed. Clinic is back on that week.`); }
};
const on = {
  submit(ev) {
    const form = ev.target; if (!form.dataset) return false; const u = U();
    if (form.dataset.form === "fm-setup") {
      const day = Number($v("#fm-day")), team = $v("#fm-team"), from = $v("#fm-from"), to = $v("#fm-to");
      if (!team) { u.err = "Pick your team."; rerender("#fm-team"); return true; }
      if (!A.parseD(from) || !A.parseD(to)) { u.err = "Add both dates: when your FMCC year starts and ends."; rerender(!A.parseD(from) ? "#fm-from" : "#fm-to"); return true; }
      if (to < from) { u.err = "The end date is before the start."; rerender("#fm-to"); return true; }
      const old = doc();
      A.state.fmcc = { v: 1, day, team, from, to, off: old ? old.off : [], skip: old ? old.skip : [] };
      u.edit = false; u.err = ""; save(); rerender("#h-fm");
      const nx = nextNight(A.state.fmcc); A.toast(`Night clinic set: ${DAYS[day]}s with Team ${team}.${nx ? ` Next one ${A.fmtShort(nx.date)}.` : ""}`);
      return true;
    }
    if (form.dataset.form === "fm-off") {
      const f = doc(); if (!f) return true;
      const kind = $v("#fm-o-kind"); let from = $v("#fm-o-from"), to = $v("#fm-o-to"); const every = Number($v("#fm-o-every")) === 4 ? 4 : 0;
      if (!A.parseD(from)) { u.addErr = "Pick the week's start date."; rerender("#fm-o-from"); return true; }
      if (!to) [from, to] = weekOf(from);
      else if (to < from) { u.addErr = "The end date is before the start."; rerender("#fm-o-to"); return true; }
      if (every && A.diffDays(A.parseD(from), A.parseD(to)) >= every * 7) { u.addErr = "A repeating week off has to be shorter than the repeat."; rerender("#fm-o-to"); return true; }
      if ((f.off || []).some((o) => o.from <= to && o.to >= from)) { u.addErr = "That overlaps a week you already added."; rerender("#fm-o-from"); return true; }
      f.off = (f.off || []).concat([{ id: uid(), from, to, kind: KINDS[kind] ? kind : "Off", every }]); u.addErr = ""; save(); rerender("#fm-o-from");
      A.toast(`${KINDS[kind] || "Week off"} added: ${A.fmtShort(A.parseD(from))} to ${A.fmtShort(A.parseD(to))}${every ? `, then every ${every} weeks` : ""}. No night clinic then.`);
      return true;
    }
    return false;
  }
};
function $v(sel) { const el = document.querySelector(sel); return el ? String(el.value || "").trim() : ""; }

window.PERL_MODULES.push({ acts, on, today: todayCard, todaySlot: "alert" });
window.PERL_FMCC = Object.freeze({ panel: () => { try { return panel(); } catch { return ""; } }, nights: () => { const f = doc(); return f ? nights(f).map((n) => ({ date: n.key, off: n.off ? n.off.kind : "", skip: n.skip })) : []; } });
})();
