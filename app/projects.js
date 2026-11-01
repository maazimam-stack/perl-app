/* Projects: the IDEA project and every other idea worth keeping, in one list. Kept deliberately simple: a title, a status,
   who's on it, a few written sections and dated milestones. Milestones with a date reach Today and the Calendar through
   window.PERL_DATED. Data lives in state.projects (the School-side document):
     { v:1, items:[{ id, title, kind:"idea"|"project", status, team, mentor, sections:{ [key]: text },
                     milestones:[{ id, label, date, done }], notes, created, updated }] }
   The IDEA template is a starting point the student edits; nothing in it is official course wording. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A) return;

const STATUS = { idea: "Idea", active: "In progress", paused: "Paused", done: "Done" };
const IDEA_SECTIONS = [
  ["problem", "Problem", "What goes wrong, for whom, and where you saw it"],
  ["evidence", "Why it matters", "What you've seen or measured that shows it's real"],
  ["people", "Stakeholders and site", "Who it affects, who owns the fix, which unit or system"],
  ["change", "Proposed change", "The intervention or design you want to try"],
  ["measure", "How you'll know it worked", "The measure, its baseline and the target"],
  ["next", "Next step", "The one thing to do this week"]
];
const BLANK_SECTIONS = [["summary", "What it is", "The idea in a few lines"], ["next", "Next step", "The one thing to do this week"]];
const sectionsFor = (p) => (p.kind === "idea" ? IDEA_SECTIONS : BLANK_SECTIONS);
const esc = (s) => A.esc(s);
const U = () => { const ui = A.ui; if (!ui.proj) ui.proj = { open: null, del: null, err: "" }; return ui.proj; };
function ensure() { let d = A.state.projects; if (!d || d.v !== 1 || !Array.isArray(d.items)) { d = { v: 1, items: [] }; A.state.projects = d; } return d; }
const list = () => { const d = A.state.projects; return d && d.v === 1 && Array.isArray(d.items) ? d.items : []; };
const byId = (id) => list().find((p) => p.id === id) || null;
const save = () => A.persist();
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const iso = (d) => A.isoD(d);
function rerender(sel) { A.render(); if (!sel || sel === "#") return; let el = null; try { el = document.querySelector(sel); } catch { return; } if (el) { if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }
function touch(p) { p.updated = Date.now(); }

/* milestones on Today and the Calendar (read-only there; ticked off here) */
function dated() {
  if (!A.booted) return [];
  const out = [];
  for (const p of list()) {
    if (p.status === "done") continue;
    for (const m of p.milestones || []) {
      const d = A.parseD(m.date); if (!d || m.done) continue;
      out.push({ date: d, label: `${p.title || "Project"}: ${m.label || "Milestone"}`, rule: "Project milestone", code: "", w: 3, feed: true, source: "Projects", uid: "pj-" + m.id });
    }
  }
  return out;
}
(window.PERL_DATED = window.PERL_DATED || []).push(dated);

/* ---------------- view ---------------- */
function nextMs(p) { const t = iso(A.today()); return (p.milestones || []).filter((m) => !m.done && m.date && m.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0] || null; }
function row(p) {
  const nm = nextMs(p); const u = U(); const open = u.open === p.id;
  return `<li class="pj-row${open ? " is-open" : ""}">
    <button class="pj-head" data-act="pj-open" data-id="${esc(p.id)}" aria-expanded="${open}" aria-controls="pj-ed-${esc(p.id)}" id="pj-h-${esc(p.id)}">
      <span class="pj-t">${esc(p.title || "Untitled project")}</span>
      <span class="pj-meta">${p.kind === "idea" ? `<span class="pj-tag">IDEA</span>` : ""}<span>${esc(STATUS[p.status] || "Idea")}</span>${nm ? `<span class="num">Next: ${esc(nm.label || "milestone")}, ${esc(A.fmtShort(A.parseD(nm.date)))}</span>` : ""}</span>
    </button>
    ${open ? editor(p) : ""}
  </li>`;
}
function editor(p) {
  const u = U(); const id = esc(p.id);
  const f = (k, label, val, ph, area) => `<div class="field"><label for="pj-${k}-${id}">${esc(label)}</label>${area
    ? `<textarea id="pj-${k}-${id}" data-pj-f="${k}" data-id="${id}" rows="3" placeholder="${esc(ph || "")}">${esc(val || "")}</textarea>`
    : `<input type="text" id="pj-${k}-${id}" data-pj-f="${k}" data-id="${id}" value="${esc(val || "")}" placeholder="${esc(ph || "")}">`}</div>`;
  const ms = [...(p.milestones || [])].sort((a, b) => String(a.date || "9").localeCompare(String(b.date || "9")));
  return `<div class="pj-ed" id="pj-ed-${id}">
    <div class="pj-grid">
      ${f("title", "Title", p.title, "Name it in a few words")}
      <div class="field"><label for="pj-status-${id}">Status</label><select id="pj-status-${id}" data-pj-f="status" data-id="${id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${p.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      ${f("team", "Team", p.team, "Who's working on it")}
      ${f("mentor", p.kind === "idea" ? "Faculty and clinical mentors" : "Mentors", p.mentor, "Who's advising")}
    </div>
    ${sectionsFor(p).map(([k, label, ph]) => f("s-" + k, label, (p.sections || {})[k], ph, true)).join("")}
    <h3 class="pj-h">Milestones</h3>
    ${ms.length ? `<ul class="pj-ms">${ms.map((m) => `<li><label class="pj-chk"><input type="checkbox" id="pj-mc-${esc(m.id)}" data-pj-ms="done" data-id="${id}" data-m="${esc(m.id)}" ${m.done ? "checked" : ""}><span class="sr">Done: </span></label>
      <label class="sr" for="pj-ml-${esc(m.id)}">Milestone</label><input type="text" id="pj-ml-${esc(m.id)}" data-pj-ms="label" data-id="${id}" data-m="${esc(m.id)}" value="${esc(m.label || "")}">
      <label class="sr" for="pj-md-${esc(m.id)}">Due</label><input type="date" id="pj-md-${esc(m.id)}" data-pj-ms="date" data-id="${id}" data-m="${esc(m.id)}" value="${esc(m.date || "")}">
      <button class="btn quiet small" data-act="pj-ms-rm" data-id="${id}" data-m="${esc(m.id)}" aria-label="Remove milestone ${esc(m.label || "")}">Remove</button></li>`).join("")}</ul>` : `<p class="hint">${p.kind === "idea" ? "Add the IDEA deadlines from the course's Canvas page. Dated milestones show up on Today and the Calendar." : "Dated milestones show up on Today and the Calendar."}</p>`}
    <form class="pj-add" data-form="pj-ms" data-id="${id}">
      <label class="sr" for="pj-new-l-${id}">New milestone</label><input type="text" id="pj-new-l-${id}" placeholder="e.g. Proposal due" maxlength="80">
      <label class="sr" for="pj-new-d-${id}">Due date</label><input type="date" id="pj-new-d-${id}">
      <button class="btn small" type="submit">Add milestone</button>
    </form>
    ${u.err ? `<p class="err" role="alert">${esc(u.err)}</p>` : ""}
    ${f("notes", "Notes", p.notes, "Anything else: links, meeting notes, open questions", true)}
    <div class="pj-foot">${u.del === p.id ? `<span>Delete this project and its milestones?</span><button class="btn small" data-act="pj-del-no" data-id="${id}">Keep</button><button class="btn small danger" data-act="pj-del-yes" data-id="${id}" id="pj-del-yes">Delete</button>` : `<button class="btn quiet small" data-act="pj-del" data-id="${id}" id="pj-del-${id}">Delete project</button>`}<button class="btn small" data-act="pj-open" data-id="${id}">Done</button></div>
  </div>`;
}
function vProjects() {
  const items = [...list()].sort((a, b) => (a.status === "done") - (b.status === "done") || (b.updated || 0) - (a.updated || 0));
  return `<div class="title-row"><div><h1>Projects</h1><p class="finding">Your IDEA project and every idea worth keeping. Milestones with dates show up on Today and the Calendar.</p></div>
    <div class="title-actions"><button class="btn small primary" data-act="pj-new" data-kind="idea" id="pj-new-idea">New IDEA project</button><button class="btn small" data-act="pj-new" data-kind="project" id="pj-new-project">New project</button></div></div>
  <section class="panel pj" aria-label="Projects">
    ${items.length ? `<ul class="pj-list">${items.map(row).join("")}</ul>` : `<div class="empty"><b>No projects yet.</b> Start an IDEA project from the template, or drop in any idea you want to keep.</div>`}
  </section>`;
}

/* ---------------- events ---------------- */
function create(kind) {
  const d = ensure(); const p = { id: uid("p"), title: "", kind, status: kind === "idea" ? "active" : "idea", team: "", mentor: "", sections: {}, milestones: [], notes: "", created: Date.now(), updated: Date.now() };
  d.items.unshift(p); U().open = p.id; U().err = ""; save(); rerender(`#pj-title-${p.id}`);
}
const acts = {
  "pj-new": (el) => create(el.dataset.kind === "idea" ? "idea" : "project"),
  "pj-open": (el) => { const u = U(); const id = el.dataset.id; u.open = u.open === id ? null : id; u.del = null; u.err = ""; rerender(u.open ? `#pj-title-${id}` : `#pj-h-${id}`); },
  "pj-del": (el) => { U().del = el.dataset.id; rerender("#pj-del-yes"); },
  "pj-del-no": (el) => { U().del = null; rerender(`#pj-del-${el.dataset.id}`); },
  "pj-del-yes": (el) => { const d = ensure(); const p = byId(el.dataset.id); d.items = d.items.filter((x) => x.id !== el.dataset.id); const u = U(); u.del = null; u.open = null; save(); rerender("#pj-new-idea"); if (p) A.toast(`Deleted ${p.title || "the project"}.`); },
  "pj-ms-rm": (el) => { const p = byId(el.dataset.id); if (!p) return; p.milestones = (p.milestones || []).filter((m) => m.id !== el.dataset.m); touch(p); save(); rerender(`#pj-new-l-${p.id}`); }
};
const on = {
  change(ev) {
    const t = ev.target; if (!t.dataset) return false;
    if (t.dataset.pjF) {
      const p = byId(t.dataset.id); if (!p) return true; const k = t.dataset.pjF;
      if (k === "status") p.status = STATUS[t.value] ? t.value : p.status;
      else if (k.startsWith("s-")) { p.sections = p.sections || {}; p.sections[k.slice(2)] = String(t.value).slice(0, 4000); }
      else if (k === "notes") p.notes = String(t.value).slice(0, 8000);
      else p[k] = String(t.value).trim().slice(0, k === "title" ? 120 : 300);
      touch(p); save(); if (k === "status") rerender(`#${t.id}`); return true;
    }
    if (t.dataset.pjMs) {
      const p = byId(t.dataset.id); if (!p) return true; const m = (p.milestones || []).find((x) => x.id === t.dataset.m); if (!m) return true;
      const k = t.dataset.pjMs;
      if (k === "done") m.done = !!t.checked;
      else if (k === "date") { if (t.value && !A.parseD(t.value)) return true; m.date = t.value || ""; }
      else m.label = String(t.value).trim().slice(0, 80);
      touch(p); save(); if (k !== "label") rerender(`#${t.id}`); if (k === "done" && m.done) A.toast(`Done: ${m.label || "milestone"}.`); return true;
    }
    return false;
  },
  /* typing saves as you go (no redraw), so nothing is lost if the app closes before the field loses focus */
  input(ev) {
    const t = ev.target; if (!t.dataset || !(t.dataset.pjF || t.dataset.pjMs === "label")) return false;
    if (t.dataset.pjF === "status") return false;
    return on.change(Object.assign({}, ev, { target: t, quiet: true })) || true;
  },
  submit(ev) {
    const form = ev.target; if (!form.dataset || form.dataset.form !== "pj-ms") return false;
    const p = byId(form.dataset.id); if (!p) return true; const u = U();
    const l = document.getElementById(`pj-new-l-${p.id}`), d = document.getElementById(`pj-new-d-${p.id}`);
    const label = String(l && l.value || "").trim(), date = String(d && d.value || "");
    if (!label) { u.err = "Name the milestone."; rerender(`#pj-new-l-${p.id}`); return true; }
    if (date && !A.parseD(date)) { u.err = "That date isn't valid."; rerender(`#pj-new-d-${p.id}`); return true; }
    p.milestones = (p.milestones || []).concat([{ id: uid("m"), label: label.slice(0, 80), date, done: false }]); u.err = ""; touch(p); save(); rerender(`#pj-new-l-${p.id}`);
    A.toast(date ? `Added: ${label}, ${A.fmtShort(A.parseD(date))}. It's on your Calendar.` : `Added: ${label}.`);
    return true;
  }
};

window.PERL_MODULES.push({ views: { projects: vProjects }, acts, on });
})();
