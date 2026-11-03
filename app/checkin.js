/* Check in: one short page for the end of the day, built for a phone. Today's habits (the same rows and taps as on Today)
   and a two-minute debrief in three prompts that saves straight to the private journal, structured, with no review step.
   Plus the ways in: a "Check in" button pinned to the bottom of the screen on phones, a home-screen shortcut, an evening
   calendar reminder that opens this page, and the "On your phone" page that gets Charted onto the home screen.

   Data:
     - the debrief goes through window.PERL_QUICKLOG (debrief.js), which runs the identifier scan and saves into the
       Debrief space. Nothing typed here is kept in School data; the unsent draft stays on this device only.
     - state.checkin (School side, small): { v:1, skip: { "YYYY-MM-DD": true }, phoneAt: ms, remind: "HH:MM" }
       skip = "no clinical day", so the bar stops asking; phoneAt = Charted last ran installed on a phone. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A) return;

const URL_APP = "https://maazimam-stack.github.io/perl-app/";
const DRAFT = "perl.v1.checkin.draft";
const LATER = "perl.v1.phone-later";
const ENERGY = ["", "Drained", "Tired", "Steady", "Engaged", "Locked in"];
const esc = (s) => A.esc(s);
const iso = (d) => A.isoD(d);
const todayIso = () => iso(A.today());
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };
const UA = navigator.userAgent || "";
const IOS = /iPhone|iPad|iPod/.test(UA) || (/Mac/.test(UA) && navigator.maxTouchPoints > 1);
const ANDROID = /Android/.test(UA);
const PHONE = IOS || ANDROID;
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|LinkedInApp|GSA\/|CriOS|FxiOS|EdgiOS/.test(UA);

function doc() { let d = A.state.checkin; if (!d || d.v !== 1) { d = { v: 1, skip: {}, phoneAt: 0, remind: "21:00" }; A.state.checkin = d; } if (!d.skip || typeof d.skip !== "object") d.skip = {}; return d; }
const peek = () => { const d = A.state.checkin; return d && d.v === 1 ? d : null; };
const U = () => { const ui = A.ui; if (!ui.ci) { const dr = (() => { try { return JSON.parse(lsGet(DRAFT) || "null"); } catch { return null; } })(); ui.ci = Object.assign({ did: "", learned: "", said: "", from: "", energy: 0, another: false, busy: false, phi: null, err: "" }, dr && dr.day === todayIso() ? dr : {}); } return ui.ci; };
function saveDraft() { const u = U(); lsSet(DRAFT, JSON.stringify({ day: todayIso(), did: u.did, learned: u.learned, said: u.said, from: u.from, energy: u.energy })); }
function rerender(sel) { A.render(); if (!sel) return; let el = null; try { el = document.querySelector(sel); } catch { return; } if (el) { if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }

const Q = () => window.PERL_QUICKLOG || null;
const H = () => window.PERL_HABITS || null;
function logged() { const q = Q(); return q && q.ready() ? q.loggedToday() : 0; }
function skipped() { const d = peek(); return !!(d && d.skip[todayIso()]); }
/* what's left today: habits not ticked, plus the debrief unless it's done or it was a non-clinical day */
function left() {
  if (!A.booted || A.state.example) return 0;
  const h = H(); const hab = h ? h.count() - h.done() : 0;
  const q = Q(); const dbf = q && q.ready() && !logged() && !skipped() ? 1 : 0;
  return Math.max(0, hab) + dbf;
}
window.PERL_CHECKIN = Object.freeze({ left });

/* ---------------- the page ---------------- */
function energyPicker(u) {
  return `<div class="ci-energy" role="radiogroup" aria-labelledby="ci-en-l"><span class="label" id="ci-en-l">How was the day?</span>
    <div class="ci-en-row">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${u.energy === n}" class="ci-en${u.energy === n ? " on" : ""}" data-act="ci-energy" data-n="${n}" id="ci-en-${n}"><b class="num">${n}</b><small>${ENERGY[n]}</small></button>`).join("")}</div></div>`;
}
function field(id, label, val, ph, rows) {
  return `<div class="field ci-f"><label for="ci-${id}">${esc(label)}</label><textarea id="ci-${id}" data-ci="${id}" rows="${rows || 2}" placeholder="${esc(ph)}" autocapitalize="sentences" enterkeyhint="next">${esc(val)}</textarea></div>`;
}
function phiBox(u) {
  if (!u.phi || !u.phi.length) return "";
  return `<div class="ci-phi" role="alert"><p><b>${u.phi.length === 1 ? "1 possible patient identifier" : `${u.phi.length} possible patient identifiers`}:</b> ${u.phi.map((x) => `<mark>${esc(x.match)}</mark> <small>${esc(x.label)}</small>`).join(" ")}</p>
    <div class="ci-phi-act"><button class="btn small primary" data-act="ci-scrub" id="ci-scrub">Replace with placeholders</button><button class="btn small" data-act="ci-phi-ok">They're not identifiers</button></div></div>`;
}
function debriefPanel() {
  const q = Q(); const u = U();
  if (!q) return "";
  const rot = q.rotation() || "your rotation";
  const head = `<div class="panel-head"><span class="ph-t"><h2 id="ci-db-h">Your day on ${esc(rot)}</h2></span><span class="ci-private">Private to you</span></div>`;
  if (!q.ready()) return `<section class="panel ci-db" aria-labelledby="ci-db-h">${head}<p class="hint">Opening your journal…</p></section>`;
  const n = logged(); const st = q.streak();
  if ((n || skipped()) && !u.another) {
    return `<section class="panel ci-db" aria-labelledby="ci-db-h">${head}
      <p class="ci-done-line"><span class="ci-ck" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg></span>${n ? `Logged today${st > 1 ? ` · <b class="num">${st}</b>-day streak` : ""}.` : "No clinical day today. Nothing to log."}</p>
      <div class="ci-row-acts">${n ? `<button class="btn small" data-act="ci-another" id="ci-another">Add another</button>` : `<button class="btn small" data-act="ci-unskip" id="ci-unskip">I do have something to log</button>`}<a class="btn quiet small" href="#journal">Journal</a></div></section>`;
  }
  return `<section class="panel ci-db" aria-labelledby="ci-db-h">${head}
    <form class="ci-form" data-form="ci" novalidate>
      ${energyPicker(u)}
      ${field("did", "What did you do?", u.did, "Admitted a new patient, presented on rounds, did my first LP")}
      ${field("learned", "What did you learn?", u.learned, "One teaching point is enough")}
      ${field("said", "Did anyone say anything about your work?", u.said, "What they said, in their words", 2)}
      ${u.said.trim() ? `<div class="field ci-f"><label for="ci-from">Who said it</label><input type="text" id="ci-from" data-ci="from" value="${esc(u.from)}" placeholder="Dr. Patel, attending" autocomplete="off"></div>` : ""}
      <p class="hint ci-tip">${PHONE ? "Tap the mic on your keyboard to talk instead of typing. " : ""}Skip patient names, dates and room numbers. One line each is plenty; leave any of them blank.</p>
      ${phiBox(u)}
      ${u.err ? `<p class="err" role="alert">${esc(u.err)}</p>` : ""}
      <div class="ci-row-acts"><button class="btn primary" type="submit" id="ci-save" ${u.busy ? "disabled" : ""}>${u.busy ? "Saving…" : "Save to journal"}</button>
        ${u.another ? `<button class="btn quiet small" type="button" data-act="ci-another-x">Cancel</button>` : `<button class="btn quiet small" type="button" data-act="ci-skip" id="ci-skip">No clinical day today</button>`}
        <button class="link ci-long" type="button" data-act="new">Rather talk it out? Full debrief</button></div>
    </form></section>`;
}
function habitsPanel() {
  const h = H(); if (!h) return "";
  if (!h.count()) return `<section class="panel ci-hb" aria-labelledby="ci-hb-h"><div class="panel-head"><h2 id="ci-hb-h">Habits</h2></div><p class="hint">Two or three small habits, one tap a day, right here. <a class="link" href="#habits">Set them up</a>.</p></section>`;
  return `<section class="panel ci-hb hb-today" aria-labelledby="ci-hb-h"><div class="panel-head"><span class="ph-t"><h2 id="ci-hb-h">Habits</h2><span class="count-chip num">${h.done()}/${h.count()}</span></span><a class="link" href="#habits">Edit</a></div>${h.list()}</section>`;
}
function reminderPanel() {
  const d = peek(); const t = (d && d.remind) || "21:00";
  return `<details class="panel ci-rem"${PHONE ? "" : " open"}><summary>Remind me every evening</summary>
    <p class="hint">Adds one repeating event to your phone's calendar. Its alert opens this page.</p>
    <div class="ci-rem-row"><div class="field"><label for="ci-time">Time</label><input type="time" id="ci-time" value="${esc(t)}" step="900"></div><button class="btn small" data-act="ci-remind" id="ci-remind">Add to my calendar</button></div>
  </details>`;
}
function vCheckin() {
  if (A.state.example) return `<div class="title-row"><div><h1>Check in</h1><p class="finding">Check-ins belong to your own plan. Leave the example to check in.</p></div></div>`;
  const n = left(); const q = Q();
  const rot = q ? q.rotation() : "";
  const all = n === 0 && q && q.ready();
  return `<div class="ci">
    <div class="title-row"><div><h1>Check in</h1><p class="finding">${esc(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][A.today().getDay()] + ", " + A.fmtShort(A.today()))}${rot ? ` · ${esc(rot)}` : ""}. ${all ? "<b>All done for today.</b>" : `Habits, then two minutes on your day. <b class="num">${n}</b> ${n === 1 ? "thing" : "things"} left.`}</p></div></div>
    ${habitsPanel()}
    ${debriefPanel()}
    ${reminderPanel()}
  </div>`;
}

/* ---------------- On your phone ---------------- */
function vPhone() {
  const inst = A.install.installed();
  if (inst && PHONE) return `<div class="title-row"><div><h1>Charted on your phone</h1><p class="finding"><b>You're in the installed app.</b> Canvas, Outlook, habits and your journal follow your account, so they're the same here as on your computer.</p></div></div>
    <section class="panel"><h2 class="ph-h">Make it one tap</h2><ul class="ph-list"><li>Move Charted to your dock or first home screen.</li>${IOS ? "" : `<li>Long-press the icon for a <b>Check in</b> shortcut.</li>`}<li><a class="link" href="#checkin">Set the evening reminder</a> so the check-in comes to you.</li></ul></section>`;
  const ios = `<ol class="ph-steps">
      <li>Open <b>${esc(URL_APP.replace(/^https:\/\//, ""))}</b> in <b>Safari</b>${IN_APP_BROWSER && IOS ? ". You're in another app's browser now; open it in Safari first" : ""}.</li>
      <li>Tap <b>Share</b> <span class="ph-ico" aria-hidden="true"><svg viewBox="0 0 18 18"><path d="M9 11.5V2.5M6 5.5l3-3 3 3M4.5 8.5h-1v7h11v-7h-1"/></svg></span>, then <b>Add to Home Screen</b>, then <b>Add</b>.</li>
      <li>Open Charted from your home screen and sign in <b>with your password</b>. An emailed sign-in link opens Safari instead of the app; if you use those, long-press the link, copy it, and paste it into Charted's sign-in.</li>
    </ol>`;
  const android = `<ol class="ph-steps">
      <li>Open <b>${esc(URL_APP.replace(/^https:\/\//, ""))}</b> in <b>Chrome</b>.</li>
      <li>${A.install.available() ? `Tap <button class="btn small primary" data-act="install">Install Charted</button>` : `Tap <b>⋮</b>, then <b>Install app</b> (or <b>Add to Home screen</b>).`}</li>
      <li>Open Charted from your home screen and sign in. Long-press the icon for a <b>Check in</b> shortcut.</li>
    </ol>`;
  if (PHONE) return `<div class="title-row"><div><h1>Charted on your phone</h1><p class="finding">Put Charted on your home screen: it opens full screen like any app, works offline, and keeps your check-in one tap away.</p></div></div>
    <section class="panel">${IOS ? ios : android}</section>
    <p class="hint">Your plan, habits, journal and Canvas and Outlook links follow your account, so there's nothing to set up again.</p>`;
  const d = peek(); const onPhone = d && d.phoneAt;
  return `<div class="title-row"><div><h1>Charted on your phone</h1><p class="finding">${onPhone ? `<b>Installed on your phone</b> (last opened there ${esc(A.fmtShort(new Date(d.phoneAt)))}).` : "Scan this with your phone's camera, then add Charted to your home screen."} Your plan, habits, journal and Canvas and Outlook links follow your account.</p></div></div>
    <div class="ph-grid">
      <section class="panel ph-qr" aria-labelledby="ph-qr-h"><h2 id="ph-qr-h" class="ph-h">Scan to open</h2><img src="qr-phone.svg" width="200" height="200" alt="QR code that opens Charted's check-in page on your phone"><p class="hint"><span class="num">${esc(URL_APP.replace(/^https:\/\//, ""))}</span> <button class="link" data-act="ph-copy">Copy link</button></p></section>
      <section class="panel" aria-labelledby="ph-ios-h"><h2 id="ph-ios-h" class="ph-h">iPhone</h2>${ios}<h2 class="ph-h ph-h2">Android</h2>${android}</section>
    </div>`;
}
/* a small card on Today until it's on the phone (or put off for two weeks) */
function phoneCard() {
  if (!A.booted || A.state.example || !window.PERL_ACCOUNT || A.install.installed()) return "";
  const d = peek(); if (d && d.phoneAt) return "";
  if (Date.now() - (Number(lsGet(LATER)) || 0) < 14 * 864e5) return "";
  return `<section class="cn-invite ph-invite" aria-labelledby="h-ph-invite"><div><h2 id="h-ph-invite">${PHONE ? "Add Charted to your home screen" : "Put Charted on your phone"}</h2>
    <p>${PHONE ? (IOS ? "In Safari: Share, then Add to Home Screen. Then the evening check-in is one tap." : "Install it from Chrome's menu. Then the evening check-in is one tap.") : "Scan a code, add it to your home screen, and check in from bed in two minutes."}</p></div>
    <div class="cn-health-act"><a class="btn small primary" href="#phone" id="ph-invite-go">${PHONE ? "Show me" : "Show the code"}</a><button class="btn quiet small" data-act="ph-later">Not now</button></div></section>`;
}

/* ---------------- the evening reminder: a repeating calendar event whose link opens the check-in ---------------- */
function reminderIcs(hhmm) {
  const [h, m] = String(hhmm || "21:00").split(":").map((x) => Math.max(0, Number(x) || 0));
  const t = A.today(); const p = (n) => String(n).padStart(2, "0");
  const start = `${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}T${p(h)}${p(m)}00`;
  const endM = h * 60 + m + 10; const end = `${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}T${p(Math.floor(endM / 60) % 24)}${p(endM % 60)}00`;
  const now = new Date(); const stamp = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}00Z`;
  const link = URL_APP + "#checkin";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Charted//Check in//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    "UID:charted-checkin-" + Date.now() + "@charted", "DTSTAMP:" + stamp, "DTSTART:" + start, "DTEND:" + end, "RRULE:FREQ=DAILY",
    "SUMMARY:Check in on Charted", "DESCRIPTION:Habits and two minutes on your day: " + link, "URL:" + link, "TRANSP:TRANSPARENT",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Check in on Charted", "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"]
    .map((l) => l.length > 74 ? l.match(/.{1,74}/g).join("\r\n ") : l).join("\r\n") + "\r\n";   /* RFC 5545 folds lines at 75 octets */
}

/* ---------------- the bottom bar on phones ---------------- */
let bar = null;
function drawBar() {
  if (!bar) { bar = document.createElement("a"); bar.className = "ci-bar"; bar.href = "#checkin"; bar.id = "ci-bar"; document.body.append(bar); }
  const v = A.ui.view; const n = left();
  const hide = !A.booted || A.state.example || ["checkin", "setup", "boot", "offline"].includes(v) || document.documentElement.dataset.space === "debrief" || n === 0;
  bar.hidden = hide; if (hide) return;
  bar.innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3 3 8-8"/></svg><span>Check in</span><span class="ci-bar-n num">${n} left</span>`;
  bar.setAttribute("aria-label", `Check in: ${n} left today`);
}
/* remember that Charted runs installed on a phone, so the computer stops suggesting it */
function notePhone() {
  if (!A.booted || A.state.example || !PHONE || !A.install.installed()) return;
  const d = doc(); const day = 864e5;
  if (!d.phoneAt || Date.now() - d.phoneAt > day) { d.phoneAt = Date.now(); A.persist(); }
}
document.addEventListener("perl:view", () => { drawBar(); notePhone(); });
/* the journal finishes loading after the first render; redraw so the count includes today's debrief */
let waited = 0; const poll = setInterval(() => { const q = Q(); if ((q && q.ready()) || ++waited > 40) { clearInterval(poll); if (A.booted) { drawBar(); if (A.ui.view === "checkin") A.render(); } } }, 250);

/* ---------------- events ---------------- */
async function save() {
  const u = U(); const q = Q(); if (!q || u.busy) return;
  u.err = ""; u.busy = true; A.render();
  const r = await q.save({ did: u.did, learned: u.learned, said: u.said, from: u.from, energy: u.energy, phiOk: u.phiOk });
  u.busy = false;
  if (!r.ok && r.why === "empty") { u.err = "Write a line in any of the three, or tap No clinical day today."; rerender("#ci-did"); return; }
  if (!r.ok && r.why === "phi") { u.phi = r.hits; rerender("#ci-scrub"); return; }
  if (!r.ok) { u.err = "Couldn't save. Try again."; rerender("#ci-save"); return; }
  Object.assign(u, { did: "", learned: "", said: "", from: "", energy: 0, phi: null, phiOk: false, another: false }); lsDel(DRAFT);
  const st = q.streak();
  A.toast(st > 1 ? `In your journal. ${st} days in a row.` : "In your journal. Two minutes today keeps September easy.");
  rerender("#ci-db-h");
}
const acts = {
  "ci-energy": (el) => { const u = U(); const n = Number(el.dataset.n); u.energy = u.energy === n ? 0 : n; saveDraft(); rerender(`#ci-en-${n}`); },
  "ci-skip": () => { doc().skip[todayIso()] = true; A.persist(); A.toast("Marked as a non-clinical day."); rerender("#ci-unskip"); },
  "ci-unskip": () => { const d = doc(); delete d.skip[todayIso()]; A.persist(); rerender("#ci-did"); },
  "ci-another": () => { U().another = true; rerender("#ci-did"); },
  "ci-another-x": () => { U().another = false; rerender("#ci-another"); },
  "ci-scrub": () => { const u = U(); const q = Q(); if (!q) return; for (const k of ["did", "learned", "said"]) u[k] = q.scrub(u[k]); u.phi = null; saveDraft(); A.toast("Replaced with placeholders."); rerender("#ci-save"); },
  "ci-phi-ok": () => { const u = U(); u.phiOk = true; u.phi = null; rerender("#ci-save"); },
  "ci-remind": async () => {
    const el = document.getElementById("ci-time"); const t = el && /^\d{2}:\d{2}$/.test(el.value) ? el.value : "21:00";
    doc().remind = t; A.persist();
    await A.saveFile("charted-check-in.ics", reminderIcs(t), "text/calendar");
    A.toast(PHONE ? "Open the file to add the reminder to your calendar." : "Open the file to add it to your calendar. It syncs to your phone with that calendar.");
  },
  "ph-later": () => { lsSet(LATER, String(Date.now())); A.render(); },
  "ph-copy": async () => { try { await navigator.clipboard.writeText(URL_APP); A.toast("Link copied. Text it to yourself, or open it on your phone."); } catch { A.toast(URL_APP); } }
};
const on = {
  input(ev) {
    const t = ev.target; if (!t || !t.dataset || !t.dataset.ci) return false;
    const u = U(); const k = t.dataset.ci; const had = !!u.said.trim();
    u[k] = String(t.value).slice(0, k === "from" ? 80 : 1500); u.phi = null; saveDraft();
    if (k === "said" && had !== !!u.said.trim()) rerender(`#${t.id}`);   /* show or hide "Who said it" */
    return true;
  },
  change(ev) { const t = ev.target; return !!(t && t.dataset && t.dataset.ci); },
  submit(ev) { const f = ev.target; if (!f.dataset || f.dataset.form !== "ci") return false; save(); return true; }
};

window.PERL_MODULES.push({ views: { checkin: vCheckin, phone: vPhone }, acts, on, today: phoneCard, todaySlot: "later" });
})();
