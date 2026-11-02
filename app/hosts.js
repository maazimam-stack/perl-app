/* Away rotations: the school's host-institution list (the SharePoint export of every site students can rotate at),
   searchable, with a shortlist that turns each pick into dates.

   Two pieces of data, kept apart on purpose:
     - The host list itself (hundreds of rows, staff contacts, agreement status). It is the school's internal list, so it is
       never shipped in the app's public code: the student imports the CSV once and it is saved to their own private row
       (data/users/<uid>/school/hosts, or this browser without an account). It's only rewritten on a new import.
         { v:1, imported: ms, file: name, updated: "YYYY-MM-DD" (newest "Modified" in the file), rows: [Host] }
     - The shortlist, small, in state.aways (the School-side document, saved with everything else):
         { v:1, picks: { [hostId]: { start: "YYYY-MM-DD", weeks: 4, added: ms } } }

   Dates: a shortlisted host with a start date puts "ask for an affiliation agreement by" (start minus the host's notice)
   and the start itself on Today and the Calendar through window.PERL_DATED. Read-only there, like feeds.
   Rules cited: APS-37 (every required clerkship graded before a clinical away; earliest start = last clerkship + 28 days,
   the same figure the Progress clock uses) and APS-30 (an away needs an agreement before credit; non-VSLO aways need
   Electives Subcommittee approval before enrolling). The linked PDFs govern. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A) return;

const PAGE = 40;
const LS = "perl.v1.hosts";
const esc = (s) => A.esc(s);
const iso = (d) => A.isoD(d);
const U = () => { const ui = A.ui; if (!ui.hosts) ui.hosts = { q: "", filter: "open", region: "", type: "", open: null, shown: PAGE, err: "", busy: false, replace: false }; return ui.hosts; };
function rerender(sel) { A.render(); if (!sel) return; let el = null; try { el = document.querySelector(sel); } catch { return; } if (el) { if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }

/* ---------------- storage for the list (its own private row) ---------------- */
let list = null;          /* the imported document, or null */
let loaded = false, loading = null, dbRef = null;
async function ref() {
  if (dbRef !== null) return dbRef;
  try {
    const c = window.claude;
    if (c && typeof c.use === "function") {
      const [d, u] = await Promise.all([c.use("db"), c.use("user")]);
      const id = u ? await u.id() : null;
      if (d && id) { dbRef = d.doc(`data/users/${id}/school/hosts`); return dbRef; }
    }
  } catch { /* no account: this browser */ }
  dbRef = false; return dbRef;
}
function valid(d) { return d && d.v === 1 && Array.isArray(d.rows) ? d : null; }
function load() {
  if (loading) return loading;
  loading = (async () => {
    const r = await ref();
    try {
      if (r) { const s = await r.get(); list = valid(s && s.exists ? s.data() : null); }
      else { list = valid(JSON.parse(localStorage.getItem(LS) || "null")); }
    } catch { try { list = valid(JSON.parse(localStorage.getItem(LS) || "null")); } catch { list = null; } }
    loaded = true; if (A.booted && (A.ui.view === "aways" || A.ui.view === "today" || A.ui.view === "calendar")) A.render();
  })();
  return loading;
}
async function store(doc) {
  const r = await ref();
  if (r) await r.set(doc);
  else localStorage.setItem(LS, JSON.stringify(doc));
  list = doc;
}

/* ---------------- CSV (quoted fields, commas and line breaks inside quotes, a BOM) ---------------- */
function parseCsv(text) {
  const s = String(text || "").replace(/^﻿/, ""); const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const clean = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n || 200);
const lines = (v) => String(v ?? "").split(/\r?\n|;\s*|\s+\/\s+/).map((x) => clean(x, 160)).filter(Boolean).slice(0, 8);
/* "6/26/2026" or "2026-06-26" -> "2026-06-26" */
function usDate(v) {
  const s = clean(v, 40); let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : "";
}
function notice(v) { const s = clean(v, 40); if (/^none$/i.test(s)) return 0; const m = s.match(/(\d+)/); return m ? Math.min(Number(m[1]), 720) : null; }
const COLS = {
  name: /^host institution$|^institution$|^host$|^name$/i, alt: /alternate/i, type: /rotation type/i, active: /active agreement/i,
  apps: /applications permitted/i, exp: /expir/i, notice: /notice/i, atype: /agreement type/i, astatus: /agreement status/i,
  state: /^state$/i, country: /^country$/i, notes: /^notes?$/i, contact: /contact/i, email: /e-?mail/i, phone: /phone/i,
  modified: /^modified$/i, id: /^id$/i
};
function toRows(text) {
  const t = parseCsv(text); if (t.length < 2) throw new Error("That file has no rows.");
  const head = t[0].map((h) => clean(h, 80)); const at = {};
  for (const [k, re] of Object.entries(COLS)) { const i = head.findIndex((h) => re.test(h)); if (i >= 0) at[k] = i; }
  if (at.name === undefined) throw new Error("Couldn't find a “Host Institution” column. Export the list as CSV with its headers.");
  const g = (r, k) => (at[k] === undefined ? "" : r[at[k]] ?? "");
  const seen = new Set(); let newest = "";
  const rows = [];
  for (const r of t.slice(1)) {
    const name = clean(g(r, "name"), 160); if (!name) continue;
    let id = clean(g(r, "id"), 20) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    while (seen.has(id)) id += "x"; seen.add(id);
    let exp = usDate(g(r, "exp")); const evergreen = exp >= "2100"; if (evergreen) exp = ""; /* "12/31/4000" is the list's "no end date" */
    const mod = usDate(g(r, "modified")); if (mod > newest) newest = mod;
    const st = clean(g(r, "state"), 40), country = clean(g(r, "country"), 60);
    const digits = String(g(r, "phone")).replace(/\D/g, "");
    rows.push({
      id, name, alt: lines(g(r, "alt")).filter((x) => x.toLowerCase() !== name.toLowerCase()),
      vslo: !/non/i.test(g(r, "type")),
      active: /^(true|yes|y|1)$/i.test(clean(g(r, "active"), 10)),
      apps: clean(g(r, "apps"), 20), exp, evergreen, notice: notice(g(r, "notice")),
      atype: clean(g(r, "atype"), 60), astatus: clean(g(r, "astatus"), 40),
      state: /^n\/?a$/i.test(st) ? "" : st, country: country || (st && !/^n\/?a$/i.test(st) ? "United States" : ""),
      notes: clean(g(r, "notes"), 600), contact: clean(g(r, "contact"), 120),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(g(r, "email"), 120)) ? clean(g(r, "email"), 120) : "",
      phone: digits.length >= 7 ? digits.slice(0, 15) : ""
    });
  }
  if (!rows.length) throw new Error("No host institutions in that file.");
  return { rows, updated: newest };
}

/* ---------------- what a row means for the student ---------------- */
const US = "United States";
/* one status per host, from what the school recorded */
function status(h) {
  const t = today();
  if (/^no$/i.test(h.apps) || /cannot negotiate/i.test(h.astatus)) return { k: "closed", l: "Not taking our students", pill: "" };
  if (h.active && (!h.exp || h.exp >= t)) return { k: "ready", l: "Agreement in place", pill: "pos" };
  if (/in process/i.test(h.astatus)) return { k: "process", l: "Agreement in process", pill: "info" };
  if (/inquire/i.test(h.apps)) return { k: "ask", l: "Ask first", pill: "" };
  if (/expired/i.test(h.astatus) || (h.exp && h.exp < t)) return { k: "needs", l: "Agreement expired", pill: "" };
  return { k: "needs", l: "Needs an agreement", pill: "" };
}
const today = () => iso(A.today());
const where = (h) => [h.state, h.country && h.country !== US ? h.country : ""].filter(Boolean).join(", ") || (h.country === US ? US : "Location not listed");
const fmtD = (s) => (s ? A.fmt(A.parseD(s)) : "—");
const phone = (p) => (p.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p.length === 11 && p[0] === "1" ? `(${p.slice(1, 4)}) ${p.slice(4, 7)}-${p.slice(7)}` : p);
const code = (c) => `<button class="code-btn" data-act="open-policy" data-code="${c}" aria-label="Open ${c}">${c}</button>`;

/* earliest clinical away (APS-37): every required clerkship graded first; grades are due within 4 weeks of the last one */
function awayReady() { const e = A.parseD(A.state.profile && A.state.profile.ciEnd); return e ? A.addDays(e, 28) : null; }

const picksDoc = () => { let d = A.state.aways; if (!d || d.v !== 1 || typeof d.picks !== "object" || !d.picks) { d = { v: 1, picks: {} }; A.state.aways = d; } return d; };
const picks = () => { const d = A.state.aways; return d && d.v === 1 && d.picks ? d.picks : {}; };
const host = (id) => (list ? list.rows.find((h) => h.id === id) : null) || null;

/* for a host and a planned start: the date to ask by, and anything that blocks or needs attention */
function plan(h, p) {
  const out = { askBy: null, end: null, issues: [] };
  const s = A.parseD(p && p.start); const st = status(h);
  if (st.k === "closed") out.issues.push({ sev: "neg", t: h.notes ? `Not taking our students: ${h.notes}` : "The school records this host as not taking our students." });
  if (!s) return out;
  const weeks = Math.min(Math.max(Number(p.weeks) || 4, 1), 12); out.end = A.addDays(s, weeks * 7 - 1);
  const ready = awayReady();
  if (ready && s < ready) out.issues.push({ sev: "neg", t: `Starts before your earliest clinical away, ${A.fmt(ready)}: every required clerkship has to be graded first.`, c: "APS-37" });
  if (st.k !== "ready" && st.k !== "closed" && h.notice !== null && h.notice > 0) {
    out.askBy = A.addDays(s, -h.notice);
    if (out.askBy < A.today()) out.issues.push({ sev: "neg", t: `This host needs ${h.notice} days' notice for a new agreement; that window closed ${A.fmt(out.askBy)}. Ask the school whether a later start works.`, c: "APS-30" });
  }
  if (st.k === "ready" && h.exp && A.parseD(h.exp) < out.end) out.issues.push({ sev: "warn", t: `The agreement ends ${fmtD(h.exp)}, before your away does. Ask the school whether it's being renewed.`, c: "APS-30" });
  if (st.k === "process") out.issues.push({ sev: "warn", t: "The agreement is still in process. It has to be in place before credit is assigned.", c: "APS-30" });
  if (!h.vslo) out.issues.push({ sev: "", t: "Not on VSLO: the Electives Subcommittee approves it before you enroll.", c: "APS-30" });
  return out;
}

/* ---------------- Today and the Calendar ---------------- */
function dated() {
  if (!A.booted || !list) return [];
  const out = [];
  for (const [id, p] of Object.entries(picks())) {
    const h = host(id); const s = A.parseD(p && p.start); if (!h || !s) continue;
    const pl = plan(h, p);
    if (pl.askBy) out.push({ date: pl.askBy, label: `Ask the school to start an agreement with ${h.name}`, short: "Ask by", rule: `${h.notice}-day notice for a new affiliation agreement`, code: "APS-30", w: 3, feed: true, source: "Away rotations", uid: "aw-ask-" + id });
    out.push({ date: s, label: `Away starts: ${h.name}`, rule: `${p.weeks || 4}-week away`, code: "", w: 2, feed: true, source: "Away rotations", uid: "aw-start-" + id });
  }
  return out;
}
(window.PERL_DATED = window.PERL_DATED || []).push(dated);

/* ---------------- view ---------------- */
function counts() {
  const c = { all: list.rows.length, ready: 0, process: 0, needs: 0, ask: 0, closed: 0 };
  for (const h of list.rows) c[status(h).k]++;
  return c;
}
function matches(h, u) {
  const k = status(h).k;
  if (u.filter === "open" && k === "closed") return false;
  if (u.filter === "ready" && k !== "ready") return false;
  if (u.filter === "needs" && !(k === "needs" || k === "process" || k === "ask")) return false;
  if (u.filter === "closed" && k !== "closed") return false;
  if (u.filter === "mine" && !picks()[h.id]) return false;
  if (u.type === "vslo" && !h.vslo) return false;
  if (u.type === "non" && h.vslo) return false;
  if (u.region === "intl" && (!h.country || h.country === US)) return false;
  if (u.region && u.region !== "intl" && h.state !== u.region) return false;
  const q = u.q.trim().toLowerCase();
  if (q) { const hay = [h.name, ...h.alt, h.state, h.country, h.contact].join(" ").toLowerCase(); if (!q.split(/\s+/).every((w) => hay.includes(w))) return false; }
  return true;
}
function importPanel(again) {
  const u = U();
  return `<section class="panel aw-import" aria-labelledby="aw-imp-h">
    <div class="panel-head"><h2 id="aw-imp-h">${again ? "Replace the host list" : "Bring in your school's host list"}</h2></div>
    <p class="aw-p">${again ? "Import a newer export of the same list. Your shortlist and start dates stay." : "Export the Host Institutions list as a CSV and choose it here. It's saved to your account only: the list never goes into the app's code, and nobody else can see it."}</p>
    <div class="aw-imp-row"><label class="btn small${again ? "" : " primary"}" for="aw-file">${u.busy ? "Reading…" : "Choose the CSV"}</label><input id="aw-file" type="file" accept=".csv,text/csv" class="sr" ${u.busy ? "disabled" : ""}>
    ${again ? `<button class="btn small quiet" data-act="aw-replace" id="aw-replace-x">Cancel</button>` : ""}</div>
    ${u.err ? `<p class="err" role="alert">${esc(u.err)}</p>` : ""}
  </section>`;
}
function issueList(iss) {
  if (!iss.length) return "";
  return `<ul class="aw-iss">${iss.map((i) => `<li class="${i.sev ? "aw-" + i.sev : ""}"><span class="dot ${i.sev === "neg" ? "breach" : i.sev === "warn" ? "soon" : "later"}" aria-hidden="true"></span><span>${esc(i.t)}</span>${i.c ? code(i.c) : ""}</li>`).join("")}</ul>`;
}
function shortlist() {
  const ps = Object.entries(picks()).map(([id, p]) => [host(id), p]).filter(([h]) => h)
    .sort((a, b) => String(a[1].start || "9").localeCompare(String(b[1].start || "9")) || a[0].name.localeCompare(b[0].name));
  if (!ps.length) return "";
  return `<section class="panel" aria-labelledby="aw-sl-h">
    <div class="panel-head"><h2 id="aw-sl-h">Your shortlist</h2><span class="aside">${ps.length} ${ps.length === 1 ? "host" : "hosts"} · dates go to Today and the Calendar</span></div>
    <ul class="aw-sl">${ps.map(([h, p]) => {
      const st = status(h); const pl = plan(h, p);
      const when = A.parseD(p.start) ? `${A.fmtShort(A.parseD(p.start))} to ${A.fmtShort(pl.end)}` : "No start date yet";
      const ask = pl.askBy ? `Ask the school by <b class="num">${esc(A.fmt(pl.askBy))}</b>` : st.k === "ready" ? "Agreement in place, nothing to request" : st.k === "closed" ? "" : h.notice === null ? "Notice period not listed: ask the school" : "No notice period";
      return `<li><button class="aw-sl-h" data-act="aw-open" data-id="${esc(h.id)}" id="aw-sl-${esc(h.id)}"><b>${esc(h.name)}</b><span class="pill ${st.pill}">${esc(st.l)}</span></button>
        <p class="aw-sl-m"><span class="num">${esc(when)}</span>${ask ? `<span>${ask}</span>` : ""}</p>${issueList(pl.issues)}</li>`;
    }).join("")}</ul>
  </section>`;
}
function detail(h) {
  const id = esc(h.id); const p = picks()[h.id]; const pl = plan(h, p);
  const fact = (k, v) => (v ? `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>` : "");
  return `<div class="aw-d" id="aw-d-${id}">
    <dl class="aw-facts">
      ${fact("Rotation type", h.vslo ? "VSLO" : "Non-VSLO")}
      ${fact("Applications", esc(h.apps || "Not listed"))}
      ${fact("Agreement", esc([h.atype, h.astatus].filter(Boolean).join(", ") || (h.active ? "Active" : "None on file")))}
      ${fact("Agreement ends", h.exp ? `<span class="num">${esc(fmtD(h.exp))}</span>` : h.evergreen ? "No end date" : "")}
      ${fact("Notice for a new agreement", h.notice === null ? "Not listed" : h.notice === 0 ? "None" : `<span class="num">${h.notice} days</span>`)}
      ${fact("Also known as", h.alt.length ? h.alt.map(esc).join("<br>") : "")}
    </dl>
    ${h.notes ? `<p class="aw-note">${esc(h.notes)}</p>` : ""}
    ${h.contact || h.email || h.phone ? `<p class="aw-contact"><span class="muted">Host contact</span> ${esc(h.contact)}${h.email ? ` · <a href="mailto:${esc(h.email)}">${esc(h.email)}</a>` : ""}${h.phone ? ` · <a href="tel:+${h.phone.length === 10 ? "1" + esc(h.phone) : esc(h.phone)}" class="num">${esc(phone(h.phone))}</a>` : ""}</p>` : ""}
    ${p ? `<div class="aw-plan">
        <div class="field"><label for="aw-start-${id}">Planned start</label><input type="date" id="aw-start-${id}" data-aw="start" data-id="${id}" value="${esc(p.start || "")}"></div>
        <div class="field"><label for="aw-weeks-${id}">Length</label><select id="aw-weeks-${id}" data-aw="weeks" data-id="${id}">${[2, 3, 4, 6, 8].map((w) => `<option value="${w}" ${Number(p.weeks || 4) === w ? "selected" : ""}>${w} weeks</option>`).join("")}</select></div>
        <button class="btn small quiet" data-act="aw-pick" data-id="${id}" id="aw-pick-${id}">Remove from shortlist</button>
      </div>
      ${pl.askBy ? `<p class="aw-ask">Ask the school to start the agreement by <b class="num">${esc(A.fmt(pl.askBy))}</b>. It's on your Calendar.</p>` : ""}
      ${issueList(pl.issues)}`
    : `<div class="aw-plan"><button class="btn small primary" data-act="aw-pick" data-id="${id}" id="aw-pick-${id}" ${status(h).k === "closed" ? "disabled" : ""}>Add to shortlist</button>${status(h).k === "closed" ? `<span class="hint">The school records this host as not taking our students.</span>` : `<span class="hint">Add a start date and Charted works out when to ask the school.</span>`}</div>`}
  </div>`;
}
function hostRow(h, u) {
  const st = status(h); const open = u.open === h.id; const mine = !!picks()[h.id];
  return `<li class="aw-row${open ? " is-open" : ""}">
    <button class="aw-h" data-act="aw-open" data-id="${esc(h.id)}" id="aw-h-${esc(h.id)}" aria-expanded="${open}" aria-controls="aw-d-${esc(h.id)}">
      <span class="aw-t"><b>${esc(h.name)}</b><small>${esc(where(h))}${h.vslo ? "" : " · Non-VSLO"}${h.alt.length ? " · " + esc(h.alt[0]) : ""}</small></span>
      <span class="aw-meta">${mine ? `<span class="pill info">Shortlisted</span>` : ""}<span class="pill ${st.pill}">${esc(st.l)}</span>${st.k === "needs" && h.notice ? `<span class="num muted">${h.notice} days</span>` : ""}</span>
    </button>
    ${open ? detail(h) : ""}
  </li>`;
}
function vAways() {
  const u = U();
  if (!loaded) { load(); return `<div class="title-row"><div><h1>Away rotations</h1><p class="finding">Loading your host list…</p></div></div>`; }
  const ready = awayReady();
  const head = (finding, actions) => `<div class="title-row"><div><h1>Away rotations</h1><p class="finding">${finding}</p></div>${actions ? `<div class="title-actions">${actions}</div>` : ""}</div>`;
  const readyLine = ready ? ` Your earliest clinical away is <b>${esc(A.fmt(ready))}</b> ${code("APS-37")}.` : ` Add your last clerkship's end date in <a class="link" href="#profile">Profile</a> to see your earliest clinical away.`;
  if (!list) return head(`Every site you can rotate at, what each one needs, and when to ask.${readyLine}`) + importPanel(false);
  const c = counts();
  const regions = [...new Set(list.rows.map((h) => h.state).filter(Boolean))].sort();
  const intl = list.rows.some((h) => h.country && h.country !== US);
  const rows = list.rows.filter((h) => matches(h, u)).sort((a, b) => a.name.localeCompare(b.name));
  const shown = rows.slice(0, u.shown);
  const seg = (k, l, n) => `<button data-act="aw-filter" data-f="${k}" aria-pressed="${u.filter === k}">${esc(l)}${n !== undefined ? ` <span class="num">${n}</span>` : ""}</button>`;
  const nPicks = Object.keys(picks()).filter((id) => host(id)).length;
  return head(`<b class="num">${c.ready}</b> of <b class="num">${c.all}</b> hosts have an agreement in place; most others need one requested months ahead.${readyLine}`,
      `<button class="btn small quiet" data-act="aw-replace" id="aw-replace">Replace list</button>`)
    + (u.replace ? importPanel(true) : "")
    + shortlist()
    + `<section class="panel" aria-labelledby="aw-all-h">
      <div class="panel-head"><h2 id="aw-all-h">All hosts</h2><span class="aside">${list.updated ? `School list updated ${esc(fmtD(list.updated))}` : `Imported ${esc(A.fmt(new Date(list.imported)))}`}</span></div>
      <div class="aw-tools">
        <label class="sr" for="aw-q">Search hosts</label><input type="search" id="aw-q" data-aw-q placeholder="Search by name, other name or state" value="${esc(u.q)}">
        <label class="sr" for="aw-region">Where</label><select id="aw-region" data-aw-f="region"><option value="">Anywhere</option>${intl ? `<option value="intl" ${u.region === "intl" ? "selected" : ""}>Outside the US</option>` : ""}${regions.map((r) => `<option ${u.region === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
        <label class="sr" for="aw-type">Rotation type</label><select id="aw-type" data-aw-f="type"><option value="">VSLO and non-VSLO</option><option value="vslo" ${u.type === "vslo" ? "selected" : ""}>VSLO only</option><option value="non" ${u.type === "non" ? "selected" : ""}>Non-VSLO only</option></select>
      </div>
      <div class="seg aw-seg" role="group" aria-label="Show">${seg("open", "Taking students", c.all - c.closed)}${seg("ready", "Agreement in place", c.ready)}${seg("needs", "Need an agreement", c.needs + c.process + c.ask)}${seg("closed", "Not taking us", c.closed)}${nPicks ? seg("mine", "Shortlist", nPicks) : ""}</div>
      <p class="aw-count" aria-live="polite">${rows.length === 1 ? "1 host" : `${rows.length} hosts`}${u.q.trim() ? ` match “${esc(u.q.trim())}”` : ""}</p>
      ${rows.length ? `<ul class="aw-list">${shown.map((h) => hostRow(h, u)).join("")}</ul>` : `<div class="empty">No hosts match. Try another name, or clear the filters.</div>`}
      ${rows.length > shown.length ? `<div class="panel-foot"><button class="btn small" data-act="aw-more" id="aw-more">Show ${Math.min(PAGE, rows.length - shown.length)} more</button><span class="hint">${rows.length - shown.length} more</span></div>` : ""}
    </section>
    <p class="hint">From the school's host-institution list. Agreement status changes; confirm with the school before you apply. The linked policies govern.</p>`;
}

/* ---------------- events ---------------- */
const acts = {
  "aw-open": (el) => { const u = U(); const id = el.dataset.id; u.open = u.open === id ? null : id;
    if (u.open) { const i = list.rows.filter((h) => matches(h, u)).sort((a, b) => a.name.localeCompare(b.name)).findIndex((h) => h.id === id); if (i < 0) { u.filter = "mine"; } else if (i >= u.shown) u.shown = i + 1; }
    rerender(`#aw-h-${id}`); if (u.open) document.getElementById(`aw-h-${id}`)?.scrollIntoView({ block: "nearest" }); },
  "aw-filter": (el) => { const u = U(); u.filter = el.dataset.f; u.shown = PAGE; rerender(`[data-act="aw-filter"][data-f="${el.dataset.f}"]`); },
  "aw-more": () => { const u = U(); u.shown += PAGE; rerender("#aw-more"); },
  "aw-replace": () => { const u = U(); u.replace = !u.replace; u.err = ""; rerender(u.replace ? "#aw-imp-h" : "#aw-replace"); },
  "aw-pick": (el) => {
    const d = picksDoc(); const id = el.dataset.id; const h = host(id); if (!h) return;
    if (d.picks[id]) { delete d.picks[id]; A.persist(); rerender(`#aw-pick-${id}`); A.toast(`Removed ${h.name} from your shortlist.`); }
    else { d.picks[id] = { start: "", weeks: 4, added: Date.now() }; U().open = id; A.persist(); rerender(`#aw-start-${id}`); A.toast(`Shortlisted ${h.name}. Add a start date.`); }
  }
};
async function importFile(file) {
  const u = U();
  if (!file) return;
  if (file.size > 5e6) { u.err = "That file is too large for a host list (over 5 MB)."; rerender("#aw-file"); return; }
  u.busy = true; u.err = ""; A.render();
  try {
    const { rows, updated } = toRows(await file.text());
    await store({ v: 1, imported: Date.now(), file: clean(file.name, 120), updated, rows });
    u.replace = false; u.open = null; u.shown = PAGE; loaded = true;
    const gone = Object.keys(picks()).filter((id) => !host(id));
    A.toast(`Imported ${rows.length} host institutions.${gone.length ? ` ${gone.length} shortlisted ${gone.length === 1 ? "host isn't" : "hosts aren't"} in the new list.` : ""}`);
  } catch (e) {
    u.err = e && e.message && !/fetch|network|unavailable/i.test(e.message) ? e.message : "Couldn't save the list to your account. Check your connection and try again.";
  }
  u.busy = false; rerender(u.err ? "#aw-file" : "#aw-q");
}
const on = {
  change(ev) {
    const t = ev.target; if (!t || !t.id) return false;
    if (t.id === "aw-file") { importFile(t.files && t.files[0]); t.value = ""; return true; }
    if (t.dataset.awF) { const u = U(); u[t.dataset.awF] = t.value; u.shown = PAGE; rerender(`#${t.id}`); return true; }
    if (t.dataset.aw) {
      const p = picks()[t.dataset.id]; if (!p) return true;
      if (t.dataset.aw === "start") { if (t.value && !A.parseD(t.value)) return true; p.start = t.value || ""; }
      else p.weeks = Math.min(Math.max(Number(t.value) || 4, 1), 12);
      A.persist(); rerender(`#${t.id}`); return true;
    }
    return false;
  },
  input(ev) {
    const t = ev.target; if (!t || t.id !== "aw-q") return false;
    const u = U(); u.q = String(t.value).slice(0, 80); u.shown = PAGE; u.open = null; A.render(); return true;
  },
  submit() { return false; }
};

window.PERL_MODULES.push({ views: { aways: vAways }, acts, on });
/* the list loads once the app is up, so shortlist dates reach Today without visiting the page */
document.addEventListener("perl:view", () => { if (A.booted && !loaded) load(); });
})();
