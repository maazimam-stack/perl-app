/* Connect: the calendars and inbox a student already lives in, read into Charted. Outlook through Microsoft Graph (a
   hand-rolled PKCE sign-in, no library), Canvas and Google feeds (any .ics "secret address") through the ICS proxy edge
   function, and suggested deadlines from school email. Read-only: nothing is ever written to those services or sent.
   Events reach Today and the Calendar through window.PERL_FEEDS(), which app.js merges into allDated().

   Data: state.connect (the School-side document, created lazily)
     { v: 1, feeds: [{ id, kind: "outlook"|"canvas"|"google"|"ics", name, url, lastSync, status: "ok"|"error", error,
                      events: [{ uid, date, end?, time, title, location, url, allDay }] }],
       ms: { account, lastSync, status, error, calendar: { events }, mail: { domains, scanned, suggestions } } | null,
       settings: { autoSync } }
   Microsoft tokens never enter state: they stay in this browser, localStorage "perl.v1.ms", and go only to
   login.microsoftonline.com and graph.microsoft.com. Email: only subject, sender, date and the 255-character preview of
   messages from the school domains are read, held in memory for the scan, and dropped; what's kept is the suggestions
   the student accepts (label, date, sender line, message link) and the ids of messages already handled. Claude sees
   subject + preview + date of at most 40 school emails, only when the student taps "Find deadlines in my inbox" and
   has allowed Claude. Automatic syncs touch the calendar only.
   Standalone (Supabase) build only: in the Claude artifact the page explains what Connect would do and why it needs
   the installed app. */
(() => {
"use strict";
/* Captured now, synchronously: Microsoft sends the student back to this page as ?code=…&state=ms-…, and the Supabase
   shim strips that query string a moment later on its own auth event. */
const LANDED = typeof location !== "undefined" ? { search: location.search, hash: location.hash } : { search: "", hash: "" };
const A = window.PERL_APP;
if (!A || !window.PERL_MODULES || window.PERL_CONNECT) return;

const MS_KEY = "perl.v1.ms";
const PKCE_KEY = "perl.v1.ms-pkce";
const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = "openid profile offline_access User.Read Calendars.Read Mail.Read";
const SYNC_EVERY = 30 * 60 * 1000;
const DAY = 864e5;
const FEED_BACK = 7, FEED_FWD = 90;       /* ICS feeds: a week back, 90 days forward */
const MS_BACK = 7, MS_FWD = 60;           /* Outlook calendar: a week back, 60 days forward */
const MAIL_BACK = 30, MAIL_PAGES = 3, CLAUDE_MAX = 40;
const MAX_EVENTS = 500, MAX_SCANNED = 500, MAX_FEEDS = 8;
const DEFAULT_DOMAINS = ["illinois.edu", "carle.com"];
const ADMIN_MSG = "Your school's Microsoft admins have to approve this app. Use the Outlook publish link for the calendar instead.";
const SIGN_IN_AGAIN = "Sign in again to keep syncing Outlook.";
const KIND_NAME = { outlook: "Outlook calendar", canvas: "Canvas", google: "Google Calendar", ics: "Calendar feed" };
const KIND_SOURCE = { outlook: "Outlook", canvas: "Canvas", google: "Google" };
const STANDALONE = !!window.PERL_ACCOUNT;
const DUE_RE = /\b(due|deadline|exam|shelf|osce|submit|submission|evaluations?|evals?|registration|register|quiz|test|final|midterm|assignment|step [12])\b/i;

/* ---------- small helpers ---------- */
const esc = (s) => A.esc(s);
const $ = (s, el = document) => el.querySelector(s);
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const ssDel = (k) => { try { sessionStorage.removeItem(k); } catch { /* storage unavailable */ } };
const jparse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const clip = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const iso = (d) => A.isoD(d);
const pad = (n) => String(n).padStart(2, "0");
const fail = (kind, message) => Object.assign(new Error(message), { kind });
function minutesOf(t) { const m = String(t || "").match(/^(\d{1,2}):(\d{2})(am|pm)$/); if (!m) return -1; return ((+m[1] % 12) + (m[3] === "pm" ? 12 : 0)) * 60 + +m[2]; }
function fmtTime(d) { const h = d.getHours(), m = d.getMinutes(); const h12 = h % 12 || 12; return `${h12}:${pad(m)}${h < 12 ? "am" : "pm"}`; }
function ago(ts) {
  if (!ts) return "never";
  const s = Math.max(0, Date.now() - ts) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return h === 1 ? "1 hour ago" : `${h} hours ago`; }
  if (s < 172800) return "yesterday"; return `${Math.round(s / 86400)} days ago`;
}
function localTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } }
function kindOfUrl(u) {
  let h = ""; try { h = new URL(u).hostname.toLowerCase(); } catch { return "ics"; }
  if (/(^|\.)instructure\.com$/.test(h) || /^canvas\./.test(h) || /canvas/.test(h)) return "canvas";
  if (h === "calendar.google.com") return "google";
  if (/(^|\.)(office365|office|live)\.com$/.test(h) && /outlook|calendar/.test(u)) return "outlook";
  return "ics";
}
function sourceOf(f) { return KIND_SOURCE[f.kind] || clip(f.name || "Feed", 20); }

/* ---------- state ---------- */
const U = () => (A.ui.connect = A.ui.connect || { busy: {}, confirm: null, err: {}, draft: {}, msBusy: false, msErr: "", sugg: [], scan: { busy: false, note: "", error: "" } });
const doc = () => (A.state && A.state.connect) || null;
function ensure() {
  const s = A.state;
  if (!s.connect || typeof s.connect !== "object") s.connect = { v: 1, feeds: [], ms: null, settings: { autoSync: true } };
  const c = s.connect;
  if (!Array.isArray(c.feeds)) c.feeds = [];
  if (!c.settings || typeof c.settings !== "object") c.settings = { autoSync: true };
  if (c.ms && typeof c.ms === "object") {
    if (!c.ms.calendar || typeof c.ms.calendar !== "object") c.ms.calendar = { events: [] };
    if (!Array.isArray(c.ms.calendar.events)) c.ms.calendar.events = [];
    if (!c.ms.mail || typeof c.ms.mail !== "object") c.ms.mail = { domains: DEFAULT_DOMAINS.slice(), scanned: [], suggestions: [] };
    if (!Array.isArray(c.ms.mail.domains) || !c.ms.mail.domains.length) c.ms.mail.domains = DEFAULT_DOMAINS.slice();
    if (!Array.isArray(c.ms.mail.scanned)) c.ms.mail.scanned = [];
    if (!Array.isArray(c.ms.mail.suggestions)) c.ms.mail.suggestions = [];
  } else c.ms = null;
  return c;
}
const save = () => A.persist();
const autoSync = () => { const c = doc(); return !c || !c.settings || c.settings.autoSync !== false; };
function rerender(focusSel) { A.render(); if (!focusSel) return; const el = document.querySelector(focusSel); if (el && document.activeElement !== el) el.focus({ preventScroll: true }); }
function refreshIfShown() { if (A.ui.view === "connect" || A.ui.view === "today" || A.ui.view === "calendar") A.render(); }

/* tokens: this browser only */
const tokens = () => { const t = jparse(lsGet(MS_KEY) || "null"); return t && typeof t === "object" && t.accessToken ? t : null; };
const setTokens = (t) => lsSet(MS_KEY, JSON.stringify(t));
const dropTokens = () => lsDel(MS_KEY);

/* config.json carries the Microsoft app id and where the edge functions live (the shim reads the same file) */
let cfgP = null;
function cfg() {
  if (cfgP) return cfgP;
  cfgP = (async () => {
    const out = { msClientId: "", functionsUrl: "", anonKey: "", icsProxy: "" };
    if (!STANDALONE) return out;
    for (const src of ["config.json", "/api/config"]) {
      try { const r = await fetch(src, { cache: "no-store" }); if (!r.ok) continue; const c = await r.json(); if (c && typeof c === "object") { out.msClientId = String(c.msClientId || ""); out.functionsUrl = String(c.functionsUrl || "").replace(/\/$/, ""); out.anonKey = String(c.supabaseAnonKey || ""); out.icsProxy = String(c.icsProxyUrl || ""); break; } } catch { /* try the next source */ }
    }
    if (!out.icsProxy) out.icsProxy = out.functionsUrl ? out.functionsUrl + "/ics-proxy" : "/api/ics-proxy";
    return out;
  })();
  return cfgP;
}
/* the student's Supabase session token, read from where supabase-js keeps it (sb-<project>-auth-token) */
function jwt() {
  const acc = window.PERL_ACCOUNT;
  if (acc && typeof acc.accessToken === "function") { try { const t = acc.accessToken(); if (t) return t; } catch { /* fall through */ } }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!/^sb-.*-auth-token$/.test(k || "")) continue;
      const s = jparse(localStorage.getItem(k) || "null"); if (s && typeof s === "object" && s.access_token) return String(s.access_token);
    }
  } catch { /* storage unavailable */ }
  return "";
}

/* ================= ICS parsing (own parser; nothing from app.js) ================= */
const WIN_TZ = {
  "Eastern Standard Time": "America/New_York", "Central Standard Time": "America/Chicago", "Mountain Standard Time": "America/Denver", "US Mountain Standard Time": "America/Phoenix",
  "Pacific Standard Time": "America/Los_Angeles", "Alaskan Standard Time": "America/Anchorage", "Hawaiian Standard Time": "Pacific/Honolulu", "Atlantic Standard Time": "America/Halifax",
  "Newfoundland Standard Time": "America/St_Johns", "Central America Standard Time": "America/Guatemala", "Eastern Standard Time (Mexico)": "America/Cancun", "Central Standard Time (Mexico)": "America/Mexico_City",
  "SA Pacific Standard Time": "America/Bogota", "Pacific SA Standard Time": "America/Santiago", "E. South America Standard Time": "America/Sao_Paulo", "Argentina Standard Time": "America/Argentina/Buenos_Aires",
  "UTC": "UTC", "Coordinated Universal Time": "UTC", "GMT Standard Time": "Europe/London", "Greenwich Standard Time": "Atlantic/Reykjavik", "W. Europe Standard Time": "Europe/Berlin", "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest", "Central European Standard Time": "Europe/Warsaw", "E. Europe Standard Time": "Europe/Chisinau", "FLE Standard Time": "Europe/Kiev", "GTB Standard Time": "Europe/Athens",
  "Turkey Standard Time": "Europe/Istanbul", "Russian Standard Time": "Europe/Moscow", "Israel Standard Time": "Asia/Jerusalem", "Arabian Standard Time": "Asia/Dubai", "Arab Standard Time": "Asia/Riyadh",
  "Pakistan Standard Time": "Asia/Karachi", "India Standard Time": "Asia/Kolkata", "Bangladesh Standard Time": "Asia/Dhaka", "SE Asia Standard Time": "Asia/Bangkok", "China Standard Time": "Asia/Shanghai",
  "Singapore Standard Time": "Asia/Singapore", "Taipei Standard Time": "Asia/Taipei", "Tokyo Standard Time": "Asia/Tokyo", "Korea Standard Time": "Asia/Seoul", "AUS Eastern Standard Time": "Australia/Sydney",
  "AUS Central Standard Time": "Australia/Darwin", "W. Australia Standard Time": "Australia/Perth", "New Zealand Standard Time": "Pacific/Auckland", "South Africa Standard Time": "Africa/Johannesburg",
  "Egypt Standard Time": "Africa/Cairo", "W. Central Africa Standard Time": "Africa/Lagos", "E. Africa Standard Time": "Africa/Nairobi"
};
const tzFmt = {};
function fmtFor(tz) { return tzFmt[tz] || (tzFmt[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })); }
function ianaOf(tzid) {
  let t = String(tzid || "").replace(/^"|"$/g, "").trim(); if (!t) return "";
  t = t.replace(/^\/[^/]+\/(?=\w+\/)/, "");                      /* /freeassociation.sourceforge.net/America/Chicago */
  if (WIN_TZ[t]) return WIN_TZ[t];
  if (/\bUTC\b|^Z$|^GMT$/i.test(t) && !/[A-Za-z]\/[A-Za-z]/.test(t)) return "UTC";
  if (/central time|central (standard|daylight)/i.test(t)) return "America/Chicago";
  if (/eastern time|eastern (standard|daylight)/i.test(t)) return "America/New_York";
  if (/mountain time|mountain (standard|daylight)/i.test(t)) return "America/Denver";
  if (/pacific time|pacific (standard|daylight)/i.test(t)) return "America/Los_Angeles";
  try { fmtFor(t); return t; } catch { return ""; }
}
function tzOffset(ms, tz) {
  const p = {}; for (const x of fmtFor(tz).formatToParts(new Date(ms))) p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}
function zonedToDate(y, mo, d, h, mi, s, tz) {
  if (tz === "UTC") return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let off = tzOffset(guess, tz); let t = guess - off; const off2 = tzOffset(t, tz); if (off2 !== off) t = guess - off2;
  return new Date(t);
}
function unescapeIcs(s) { return String(s || "").replace(/\\([nN,;\\])/g, (m, c) => (c === "n" || c === "N" ? "\n" : c)); }
/* NAME;P1=V1;P2="a:b":value → { name, params, value } (params may hold quoted values with ':' or ';' inside) */
function splitProp(line) {
  let i = 0, q = false;
  for (; i < line.length; i++) { const c = line[i]; if (c === '"') q = !q; else if (c === ":" && !q) break; }
  if (i >= line.length) return null;
  const head = line.slice(0, i), value = line.slice(i + 1);
  const parts = []; let cur = ""; q = false;
  for (const c of head) { if (c === '"') { q = !q; cur += c; } else if (c === ";" && !q) { parts.push(cur); cur = ""; } else cur += c; }
  parts.push(cur);
  const params = {};
  for (const p of parts.slice(1)) { const j = p.indexOf("="); if (j < 0) continue; params[p.slice(0, j).trim().toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, ""); }
  return { name: parts[0].trim().toUpperCase(), params, value };
}
function parseDt(val, params, defaultTz) {
  const v = String(val || "").trim(); const p = params || {};
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m || p.VALUE === "DATE") { m = v.match(/^(\d{4})(\d{2})(\d{2})/); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d) ? null : { date: d, allDay: true }; }
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/); if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5], s = +(m[6] || 0);
  let out;
  if (m[7] === "Z") out = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  else { const tz = ianaOf(p.TZID) || defaultTz; out = tz ? zonedToDate(y, mo, d, h, mi, s, tz) : new Date(y, mo - 1, d, h, mi, s); }
  return isNaN(out) ? null : { date: out, allDay: false };
}
function parseDuration(v) {
  const m = String(v || "").match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/); if (!m) return null;
  const ms = ((+m[2] || 0) * 7 + (+m[3] || 0)) * DAY + (+m[4] || 0) * 36e5 + (+m[5] || 0) * 6e4 + (+m[6] || 0) * 1e3;
  return m[1] === "-" ? -ms : ms;
}
const WKD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseRule(v) {
  const r = {}; for (const part of String(v || "").split(";")) { const [k, val] = part.split("="); if (k && val) r[k.trim().toUpperCase()] = val.trim(); }
  if (!r.FREQ) return null;
  const byday = (r.BYDAY || "").split(",").map((x) => x.trim().toUpperCase().replace(/^[+-]?\d+/, "")).filter((x) => x in WKD).map((x) => WKD[x]);
  let until = null;
  if (r.UNTIL) { const u = parseDt(r.UNTIL, {}, ""); if (u) until = u.allDay ? new Date(u.date.getFullYear(), u.date.getMonth(), u.date.getDate(), 23, 59, 59) : u.date; }
  return { freq: r.FREQ.toUpperCase(), interval: Math.max(1, parseInt(r.INTERVAL, 10) || 1), count: parseInt(r.COUNT, 10) || 0, until, byday, wkst: r.WKST in WKD ? WKD[r.WKST] : 1 };
}
/* FREQ=DAILY|WEEKLY with INTERVAL, COUNT, UNTIL and BYDAY; anything else keeps its first instance only */
function expand(start, rule, stop) {
  const r = parseRule(rule);
  if (!r || (r.freq !== "DAILY" && r.freq !== "WEEKLY")) return [start];
  const out = []; const limit = r.count || Infinity;
  const push = (t) => { if (r.until && t > r.until) return false; if (t > stop) return false; out.push(t); return out.length < limit; };
  if (r.freq === "DAILY") {
    for (let i = 0, t = new Date(start); i < 2000; i++) { if (!push(new Date(t))) break; t.setDate(t.getDate() + r.interval); }
    return out;
  }
  const days = (r.byday.length ? r.byday : [start.getDay()]).map((d) => (d - r.wkst + 7) % 7).sort((a, b) => a - b);
  const week0 = new Date(start); week0.setDate(start.getDate() - ((start.getDay() - r.wkst + 7) % 7));
  outer: for (let w = 0; w < 2000; w++) {
    for (const off of days) {
      const t = new Date(week0); t.setDate(week0.getDate() + w * 7 * r.interval + off); t.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
      if (t < start) continue;
      if (!push(t)) break outer;
    }
    if (r.until && new Date(week0.getTime() + (w + 1) * 7 * r.interval * DAY) > new Date(r.until.getTime() + 7 * DAY)) break;
  }
  return out;
}
function calName(text) { const m = String(text || "").replace(/\r\n[ \t]/g, "").match(/^X-WR-CALNAME(?:;[^:\n]*)?:(.*)$/m); return m ? clip(unescapeIcs(m[1]), 60) : ""; }
/* a meeting's join link (Zoom, Teams, Google Meet, Webex), found in whatever text an event carries. Only https links on
   these hosts count, and only the link itself is kept, never the text around it. */
const JOIN_RE = /https:\/\/(?:[a-z0-9-]+\.)*(?:zoom\.us\/(?:j|my|w|s)\/[^\s"'<>()\[\]]+|zoomgov\.com\/j\/[^\s"'<>()\[\]]+|teams\.microsoft\.com\/l\/meetup-join\/[^\s"'<>]+|teams\.live\.com\/meet\/[^\s"'<>]+|meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}|webex\.com\/(?:meet|join)\/[^\s"'<>]+|webex\.com\/[a-z0-9-]+\/j\.php\?[^\s"'<>]+)/i;
function joinOf(...xs) {
  for (const x of xs) { const m = String(x || "").match(JOIN_RE); if (m) return m[0].replace(/[.,;:!?>]+$/, "").slice(0, 600); }
  return "";
}

/* events in the window [from, to] (local dates, inclusive); descriptions are never kept (only a join link found in one) */
function parseIcs(text, win) {
  const from = A.parseD(win && win.from) || A.addDays(A.today(), -FEED_BACK); const to = A.parseD(win && win.to) || A.addDays(A.today(), FEED_FWD);
  const stop = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
  const lines = String(text || "").replace(/\r\n|\r|\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  let defaultTz = ""; const raws = []; let cur = null; let depth = 0; let skip = 0;
  for (const line of lines) {
    if (!line) continue;
    if (/^BEGIN:VEVENT$/i.test(line)) { cur = { EXDATE: [] }; depth = 1; continue; }
    if (cur) {
      if (/^BEGIN:/i.test(line)) { skip++; continue; }
      if (/^END:/i.test(line)) { if (skip) { skip--; continue; } if (/^END:VEVENT$/i.test(line)) { raws.push(cur); cur = null; } continue; }
      if (skip) continue;
      const p = splitProp(line); if (!p) continue;
      if (p.name === "EXDATE") { for (const v of p.value.split(",")) cur.EXDATE.push({ value: v, params: p.params }); }
      else if (!(p.name in cur)) cur[p.name] = { value: p.value, params: p.params };
      continue;
    }
    if (/^X-WR-TIMEZONE/i.test(line)) { const p = splitProp(line); if (p) defaultTz = ianaOf(p.value) || ""; }
  }
  const masters = [], overrides = [];
  for (const raw of raws) {
    if (raw.STATUS && /cancelled/i.test(raw.STATUS.value)) continue;
    const st = raw.DTSTART ? parseDt(raw.DTSTART.value, raw.DTSTART.params, defaultTz) : null; if (!st) continue;
    let dur = null;
    if (raw.DTEND) { const en = parseDt(raw.DTEND.value, raw.DTEND.params, defaultTz); if (en) dur = en.date - st.date; }
    else if (raw.DURATION) dur = parseDuration(raw.DURATION.value);
    if (dur == null || dur < 0) dur = st.allDay ? DAY : 0;
    let title = clip(unescapeIcs(raw.SUMMARY ? raw.SUMMARY.value : ""), 120) || "(No title)"; let course = "";
    const cm = title.match(/^(.*?)\s*\[([^\]]{1,80})\]\s*$/); if (cm && cm[1]) { title = cm[1].trim(); course = cm[2].trim(); }   /* Canvas: "Assignment [Course]" */
    const base = { uid: clip(unescapeIcs(raw.UID ? raw.UID.value : ""), 200) || uid(), title, course, location: clip(unescapeIcs(raw.LOCATION ? raw.LOCATION.value : ""), 100), url: /^https?:\/\//i.test(raw.URL ? raw.URL.value.trim() : "") ? raw.URL.value.trim().slice(0, 500) : "", allDay: st.allDay, dur,
      join: joinOf(raw["X-MICROSOFT-SKYPETEAMSMEETINGURL"] && raw["X-MICROSOFT-SKYPETEAMSMEETINGURL"].value, raw.LOCATION && unescapeIcs(raw.LOCATION.value), raw.URL && raw.URL.value, raw.DESCRIPTION && unescapeIcs(raw.DESCRIPTION.value)) };
    if (raw["RECURRENCE-ID"]) { const rid = parseDt(raw["RECURRENCE-ID"].value, raw["RECURRENCE-ID"].params, defaultTz); overrides.push({ base, start: st.date, rid: rid ? rid.date : null }); }
    else masters.push({ raw, base, start: st.date });
  }
  const keyOf = (d, allDay) => (allDay ? iso(d) : String(d.getTime()));
  const ovKeys = new Set(overrides.filter((o) => o.rid).map((o) => o.base.uid + "|" + keyOf(o.rid, o.base.allDay) + "|" + iso(o.rid)));
  const out = [];
  const add = (base, t, recurring) => {
    const date = iso(t); const endD = new Date(t.getTime() + Math.max(0, base.dur) - 1); const end = iso(endD);
    if (t > stop || endD < from) return;
    const e = { uid: recurring ? `${base.uid}@${date}` : base.uid, date, time: base.allDay ? "" : fmtTime(t), title: base.title, location: base.location, url: base.url, allDay: base.allDay, sort: t.getTime() };
    if (end > date) e.end = end;
    if (base.course) e.course = base.course;
    if (base.join) e.join = base.join;
    out.push(e);
  };
  for (const m of masters) {
    const rrule = m.raw.RRULE ? m.raw.RRULE.value : "";
    const ex = new Set(); for (const x of m.raw.EXDATE) { const d = parseDt(x.value, x.params, defaultTz); if (d) { ex.add(keyOf(d.date, m.base.allDay)); ex.add(iso(d.date)); } }
    const times = rrule ? expand(m.start, rrule, stop) : [m.start];
    for (const t of times) {
      if (rrule && (ex.has(keyOf(t, m.base.allDay)) || (m.base.allDay && ex.has(iso(t))))) continue;
      if (rrule && (ovKeys.has(m.base.uid + "|" + keyOf(t, m.base.allDay) + "|" + iso(t)) || [...ovKeys].some((k) => k.startsWith(m.base.uid + "|") && k.endsWith("|" + iso(t))))) continue;
      add(m.base, t, !!rrule);
    }
  }
  for (const o of overrides) add(o.base, o.start, true);
  out.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return out.slice(0, MAX_EVENTS).map((e) => { const { sort, ...rest } = e; return rest; });
}

/* ================= feeds through the ICS proxy ================= */
async function fetchIcs(url) {
  const c = await cfg(); const token = jwt();
  if (!token) throw fail("attention", "Sign in to Charted again, then sync.");
  let r;
  try { r = await fetch(c.icsProxy, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token, ...(c.anonKey ? { apikey: c.anonKey } : {}) }, body: JSON.stringify({ url }) }); }
  catch { throw fail("unavailable", "Couldn't reach the calendar proxy. Check your connection and try again."); }
  if (!r.ok) {
    let j = null; try { j = await r.json(); } catch { /* not JSON */ }
    const msg = (j && j.error && j.error.message) || (r.status === 401 ? "Sign in to Charted again, then sync." : r.status === 429 ? "Too many syncs in a minute. Try again shortly." : `The calendar proxy answered with HTTP ${r.status}.`);
    throw fail(r.status === 401 ? "attention" : "error", msg);
  }
  return r.text();
}
function feedById(id) { const c = doc(); return c ? c.feeds.find((f) => f.id === id) : null; }
async function syncFeed(f, manual) {
  const u = U(); if (u.busy[f.id]) return; u.busy[f.id] = true; if (manual) refreshIfShown();
  try {
    const text = await fetchIcs(f.url);
    f.events = parseIcs(text, null); f.status = "ok"; f.error = ""; f.okAt = Date.now();
    if (!f.name) f.name = calName(text) || KIND_NAME[f.kind] || "Calendar";
  } catch (e) { f.status = "error"; f.error = (e && e.message) || "Couldn't sync."; }
  f.lastSync = Date.now();
  delete u.busy[f.id]; save(); refreshIfShown();
}
function addFeed(kind, raw) {
  const u = U(); const url = String(raw || "").trim();
  const c = ensure();
  if (/^webcals?:/i.test(url)) { u.err[kind] = "Replace webcal:// with https:// and try again."; return null; }
  if (!/^https:\/\/\S+$/i.test(url)) { u.err[kind] = "Paste the calendar's link. It starts with https://."; return null; }
  if (c.feeds.some((f) => f.url === url)) { u.err[kind] = "That calendar is already linked."; return null; }
  if (c.feeds.length >= MAX_FEEDS) { u.err[kind] = `Charted keeps up to ${MAX_FEEDS} feeds. Remove one to add another.`; return null; }
  const k = kind === "outlook" || kind === "canvas" ? kind : kindOfUrl(url);
  const f = { id: uid(), kind: k, name: "", url, lastSync: 0, status: "ok", error: "", events: [] };
  c.feeds.push(f); u.err[kind] = ""; save();
  return f;
}
function removeFeed(id) { const c = ensure(); const f = feedById(id); c.feeds = c.feeds.filter((x) => x.id !== id); U().confirm = null; save(); return f; }

/* ================= Microsoft: PKCE sign-in, tokens, Graph ================= */
function b64url(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function randomB64(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }
async function sha256b64(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return b64url(new Uint8Array(d)); }
function redirectUri() { return location.origin + location.pathname.replace(/index\.html$/, ""); }
function landing() {
  const q = new URLSearchParams(LANDED.search || ""); const st = q.get("state") || "";
  if (!st.startsWith("ms-")) return null;
  return { code: q.get("code") || "", state: st, error: q.get("error") || "", desc: q.get("error_description") || "" };
}
/* drop ?code=&state= (or ?error=) from the address bar; the hash stays as it is so A.go("connect") below is a real change */
function cleanUrl() { if (/[?&]state=ms-/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash); }
async function msStart() {
  const c = await cfg(); const u = U();
  if (!c.msClientId) { u.msErr = "Microsoft sign-in isn't set up in this copy of Charted yet. See docs/CONNECT.md, or use the Outlook publish link below."; rerender("#cn-url-outlook"); return; }
  if (!window.crypto || !crypto.subtle) { u.msErr = "This browser can't do the secure sign-in (it needs https). Use the Outlook publish link below."; rerender("#cn-url-outlook"); return; }
  const verifier = randomB64(64); const challenge = await sha256b64(verifier); const state = "ms-" + randomB64(16);
  ssSet(PKCE_KEY, JSON.stringify({ verifier, state, at: Date.now() }));
  const p = new URLSearchParams({ client_id: c.msClientId, response_type: "code", redirect_uri: redirectUri(), response_mode: "query", scope: SCOPES, code_challenge: challenge, code_challenge_method: "S256", state, prompt: "select_account" });
  location.assign(`${MS_AUTH}/authorize?${p}`);
}
function consentMsg(err, desc) { return /AADSTS(65001|90094)/.test(desc || "") || /consent_required|interaction_required/.test(err || "") ? ADMIN_MSG : ""; }
async function msFinish(land) {
  const u = U(); const saved = jparse(ssGet(PKCE_KEY) || "null"); ssDel(PKCE_KEY); cleanUrl();
  if (!saved || saved.state !== land.state) { u.msErr = "That Microsoft sign-in didn't match this browser session. Try again."; A.go("connect"); return; }
  if (land.error || !land.code) { u.msErr = consentMsg(land.error, land.desc) || `Microsoft didn't complete the sign-in (${clip(land.desc || land.error || "no code", 160)}).`; A.go("connect"); return; }
  const c = await cfg();
  let r, j = {};
  try {
    r = await fetch(`${MS_AUTH}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.msClientId, grant_type: "authorization_code", code: land.code, redirect_uri: redirectUri(), code_verifier: saved.verifier, scope: SCOPES }) });
    j = await r.json().catch(() => ({}));
  } catch { u.msErr = "Couldn't reach Microsoft to finish the sign-in. Try again."; A.go("connect"); return; }
  if (!r.ok || !j.access_token) { u.msErr = consentMsg(j.error, j.error_description) || `Microsoft refused the sign-in (${clip(j.error_description || j.error || r.status, 160)}).`; A.go("connect"); return; }
  setTokens({ accessToken: j.access_token, refreshToken: j.refresh_token || "", expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000, account: "" });
  const d = ensure();
  if (!d.ms) d.ms = { account: "", lastSync: 0, status: "ok", error: "", calendar: { events: [] }, mail: { domains: DEFAULT_DOMAINS.slice(), scanned: [], suggestions: [] } };
  d.ms.status = "ok"; d.ms.error = ""; u.msErr = ""; save();
  A.go("connect"); A.toast("Microsoft connected. Syncing your calendar…");
  syncMs(true);
}
async function accessToken() {
  const t = tokens(); if (!t) throw fail("attention", SIGN_IN_AGAIN);
  if ((t.expiresAt || 0) - Date.now() > 5 * 60 * 1000) return t.accessToken;
  if (!t.refreshToken) { dropTokens(); throw fail("attention", SIGN_IN_AGAIN); }
  const c = await cfg(); let r, j = {};
  try {
    r = await fetch(`${MS_AUTH}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.msClientId, grant_type: "refresh_token", refresh_token: t.refreshToken, scope: SCOPES }) });
    j = await r.json().catch(() => ({}));
  } catch { throw fail("unavailable", "Couldn't reach Microsoft to renew the sign-in. Try again later."); }
  if (!r.ok || !j.access_token) {
    if (j.error === "invalid_grant" || r.status === 400 || r.status === 401) { dropTokens(); throw fail("attention", consentMsg(j.error, j.error_description) || SIGN_IN_AGAIN); }
    throw fail("unavailable", `Microsoft didn't renew the sign-in (HTTP ${r.status}). Try again later.`);
  }
  setTokens({ accessToken: j.access_token, refreshToken: j.refresh_token || t.refreshToken, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000, account: t.account || "" });
  return j.access_token;
}
async function graph(url) {
  const tok = await accessToken();
  let r; try { r = await fetch(url.startsWith("http") ? url : GRAPH + url, { headers: { authorization: "Bearer " + tok, accept: "application/json", prefer: `outlook.timezone="${localTz()}", outlook.body-content-type="text"` } }); }
  catch { throw fail("unavailable", "Couldn't reach Outlook. Check your connection and try again."); }
  if (r.status === 401) { dropTokens(); throw fail("attention", SIGN_IN_AGAIN); }
  if (r.status === 403) throw fail("attention", "Outlook refused the request. Sign in again and allow calendar and mail access.");
  if (r.status === 429) throw fail("unavailable", "Outlook is busy. Try again in a few minutes.");
  if (!r.ok) throw fail("unavailable", `Outlook didn't answer (HTTP ${r.status}). Try again later.`);
  return r.json();
}
function fromGraph(ev) {
  const parse = (o) => {
    const m = String((o && o.dateTime) || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/); if (!m) return null;
    const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
    if (ev.isAllDay) return new Date(y, mo - 1, d);
    const z = ianaOf(o.timeZone) || localTz();
    return zonedToDate(y, mo, d, h, mi, s, z);
  };
  const st = parse(ev.start); if (!st || isNaN(st)) return null; const en = parse(ev.end);
  const e = { uid: String(ev.id || uid()).slice(0, 200), date: iso(st), time: ev.isAllDay ? "" : fmtTime(st), title: clip(ev.subject || "(No subject)", 120), location: clip((ev.location && ev.location.displayName) || "", 100), url: /^https?:\/\//.test(ev.webLink || "") ? String(ev.webLink).slice(0, 500) : "", allDay: !!ev.isAllDay };
  if (en && !isNaN(en)) { const end = iso(new Date(en.getTime() - 1)); if (end > e.date) e.end = end; }
  const join = joinOf(ev.onlineMeeting && ev.onlineMeeting.joinUrl, ev.onlineMeetingUrl, ev.location && ev.location.displayName, ev.body && ev.body.content, ev.bodyPreview);
  if (join) e.join = join;   /* the body is read for this link only and never stored */
  return e;
}
async function syncCalendar(ms) {
  const t = A.today(); const a = A.addDays(t, -MS_BACK), b = A.addDays(t, MS_FWD + 1);
  let url = `${GRAPH}/me/calendarView?startDateTime=${encodeURIComponent(a.toISOString())}&endDateTime=${encodeURIComponent(b.toISOString())}&$select=${encodeURIComponent("subject,start,end,location,isAllDay,webLink,onlineMeeting,onlineMeetingUrl,body")}&$top=250`;
  const out = [];
  for (let page = 0; page < 10 && url && out.length < MAX_EVENTS; page++) {
    const j = await graph(url);
    for (const ev of Array.isArray(j.value) ? j.value : []) { const e = fromGraph(ev); if (e) out.push(e); }
    url = j["@odata.nextLink"] || "";
  }
  out.sort((x, y) => x.date.localeCompare(y.date) || minutesOf(x.time) - minutesOf(y.time));
  ms.calendar = { events: out.slice(0, MAX_EVENTS) };
}
async function syncMs(manual) {
  const u = U(); if (u.msBusy) return; const d = ensure(); if (!d.ms) return;
  u.msBusy = true; u.msErr = ""; if (manual) refreshIfShown();
  const ms = d.ms;
  try {
    if (!ms.account) { const me = await graph("/me"); ms.account = clip(me.mail || me.userPrincipalName || me.displayName || "", 120); const t = tokens(); if (t) setTokens({ ...t, account: ms.account }); }
    await syncCalendar(ms);
    ms.status = "ok"; ms.error = ""; ms.lastSync = Date.now(); ms.okAt = ms.lastSync;
    if (manual) { u.msBusy = false; save(); refreshIfShown(); await scanMail(false); return; }
  } catch (e) { ms.status = e && e.kind === "attention" ? "attention" : "error"; ms.error = (e && e.message) || "Couldn't sync Outlook."; ms.lastSync = Date.now(); }
  u.msBusy = false; save(); refreshIfShown();
}
function removeMs() {
  const d = ensure(); dropTokens(); d.ms = null; const u = U(); u.sugg = []; u.msErr = ""; u.confirm = null; u.scan = { busy: false, note: "", error: "" }; save();
}

/* ================= suggested deadlines from email ================= */
const SIGNAL_RE = /\b(due|deadline|submit(?:ted|ting)?|no later than|registration|register|evaluations?|evals?|shelf|exam|osce|required|complete by|by (?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|by \d)/i;
const MONTHS3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;
const NUM_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const WD_RE = /\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/i;
const REL_RE = /\b(today|tonight|end of (?:the )?day|eod|cob|tomorrow)\b/i;
const WDN = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };
function resolveDate(text, received) {
  const rd = new Date(received); const base = isNaN(rd) ? A.today() : new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
  let m = text.match(MON_RE);
  if (m) {
    const mo = MONTHS3.indexOf(m[1].slice(0, 3).toLowerCase()); const day = +m[2]; if (day < 1 || day > 31) return null;
    let d = new Date(m[3] ? +m[3] : base.getFullYear(), mo, day); if (!m[3] && d < base) d = new Date(base.getFullYear() + 1, mo, day);
    return isNaN(d) ? null : d;
  }
  m = text.match(NUM_RE);
  if (m) {
    const mo = +m[1] - 1, day = +m[2]; if (mo < 0 || mo > 11 || day < 1 || day > 31) return null;
    const yr = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : base.getFullYear();
    let d = new Date(yr, mo, day); if (!m[3] && d < base) d = new Date(yr + 1, mo, day);
    return isNaN(d) ? null : d;
  }
  m = text.match(WD_RE);
  if (m) { const wd = WDN[m[1].slice(0, 2).toLowerCase()]; const d = new Date(base); d.setDate(base.getDate() + ((wd - base.getDay() + 7) % 7)); return d; }
  m = text.match(REL_RE);
  if (m) { const d = new Date(base); if (/tomorrow/i.test(m[1])) d.setDate(d.getDate() + 1); return d; }
  return null;
}
function cleanSubject(s) { return clip(String(s || "").replace(/^\s*(?:(?:re|fw|fwd|aw|wg|tr)\s*:\s*)+/i, ""), 100) || "Deadline from email"; }
function heuristic(msgs) {
  const out = [];
  for (const m of msgs) {
    const text = `${m.subject} ${m.preview}`;
    if (!SIGNAL_RE.test(text)) continue;
    const d = resolveDate(m.subject, m.received) || resolveDate(m.preview, m.received); if (!d) continue;
    out.push({ id: uid(), msgId: m.id, date: iso(d), label: cleanSubject(m.subject), from: m.from, received: m.received, webLink: m.webLink });
  }
  return out;
}
function mailPrompt(cands, todayIso) {
  const list = cands.map((m) => ({ msgId: m.id, received: String(m.received || "").slice(0, 10), subject: m.subject, preview: m.preview }));
  return `These are emails from a medical student's school inbox: for each, an id, the date it arrived, its subject and the first 255 characters. Pick out the ones that set a specific deadline, due date, exam, registration or required action, and give the date it falls on as YYYY-MM-DD. Resolve relative dates ("by Friday", "end of day") from the date the email arrived. Today is ${todayIso}. Skip anything without a clear date.\n\nReply with only valid JSON: an array of {"msgId": "...", "date": "YYYY-MM-DD", "label": "under 80 characters, what is due"} and nothing else. An empty array is fine.\n\n${JSON.stringify(list)}`;
}
function parseJson(t) {
  const s = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(s); } catch { /* fall through */ }
  const m = s.match(/\[[\s\S]*\]/); if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  return null;
}
function cleanClaude(reply, cands) {
  const arr = parseJson(reply); if (!Array.isArray(arr)) return null;
  const by = new Map(cands.map((m) => [m.id, m])); const seen = new Set(); const out = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue; const m = by.get(String(x.msgId)); if (!m || seen.has(m.id)) continue;
    const d = A.parseD(String(x.date || "")); if (!d) continue; seen.add(m.id);
    out.push({ id: uid(), msgId: m.id, date: iso(d), label: clip(typeof x.label === "string" && x.label.trim() ? x.label : cleanSubject(m.subject), 100), from: m.from, received: m.received, webLink: m.webLink });
  }
  return out;
}
const aiAllowed = () => !!(window.PERL_ACCOUNT && window.PERL_ACCOUNT.aiAllowed && window.PERL_ACCOUNT.aiAllowed());
async function claudeSuggest(cands) {
  const c = window.claude; if (!c || typeof c.use !== "function" || !cands.length) return null;
  const sample = await c.use("sample"); if (typeof sample !== "function") return null;
  const r = await sample(mailPrompt(cands, iso(A.today())), { modelTier: "quick" });
  return cleanClaude(typeof r === "string" ? r : (r && r.text) || "", cands);
}
function schoolAddr(addr, doms) { return doms.some((d) => addr.endsWith("@" + d) || addr.endsWith("." + d)); }
function fromLine(from) { const e = (from && from.emailAddress) || {}; const n = clip(e.name || "", 60), a = clip(e.address || "", 80); return n && a && n.toLowerCase() !== a.toLowerCase() ? `${n} <${a}>` : a || n; }
/* held in memory for the scan only; nothing here is saved */
async function fetchSchoolMessages(domains) {
  const since = new Date(Date.now() - MAIL_BACK * DAY).toISOString().replace(/\.\d{3}Z$/, "Z");
  let url = `${GRAPH}/me/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${since}`)}&$select=${encodeURIComponent("id,subject,from,receivedDateTime,bodyPreview,webLink")}&$top=100`;
  const doms = domains.map((d) => String(d).toLowerCase()); const out = [];
  for (let page = 0; page < MAIL_PAGES && url; page++) {
    const j = await graph(url);
    for (const m of Array.isArray(j.value) ? j.value : []) {
      const addr = String((m.from && m.from.emailAddress && m.from.emailAddress.address) || "").toLowerCase();
      if (!m.id || !schoolAddr(addr, doms)) continue;
      out.push({ id: String(m.id), subject: clip(m.subject || "(No subject)", 200), from: fromLine(m.from), received: String(m.receivedDateTime || ""), preview: clip(m.bodyPreview || "", 255), webLink: /^https?:\/\//.test(m.webLink || "") ? String(m.webLink).slice(0, 500) : "" });
    }
    url = j["@odata.nextLink"] || "";
  }
  out.sort((x, y) => y.received.localeCompare(x.received));
  return out;
}
function addScanned(ms, ids) { const set = new Set(ms.mail.scanned); for (const id of ids) set.add(id); ms.mail.scanned = [...set].slice(-MAX_SCANNED); }
async function scanMail(manual) {
  const u = U(); const d = ensure(); if (!d.ms || u.scan.busy) return;
  u.scan = { busy: true, note: "", error: "" }; if (manual) refreshIfShown();
  try {
    const ms = d.ms; const scanned = new Set(ms.mail.scanned);
    const fresh = (await fetchSchoolMessages(ms.mail.domains)).filter((m) => !scanned.has(m.id));
    let sugg = null, judged = [];
    if (manual && aiAllowed() && fresh.length) {
      const cands = fresh.slice(0, CLAUDE_MAX);
      try { sugg = await claudeSuggest(cands); } catch { sugg = null; }
      if (sugg) judged = cands.map((m) => m.id);
    }
    if (!sugg) sugg = heuristic(fresh);
    const got = new Set(sugg.map((s) => s.msgId));
    if (judged.length) addScanned(ms, judged.filter((id) => !got.has(id)));   /* Claude saw these and found nothing: don't send them twice */
    u.sugg = sugg; u.scan = { busy: false, note: sugg.length ? "" : "No new deadlines in your school email from the last 30 days.", error: "" };
  } catch (e) {
    const ms = d.ms; if (ms && e && e.kind === "attention") { ms.status = "attention"; ms.error = e.message; }
    u.scan = { busy: false, note: "", error: (e && e.message) || "Couldn't read your inbox." };
  }
  save(); refreshIfShown();
}
function acceptSuggestion(id) {
  const u = U(); const d = ensure(); if (!d.ms) return; const s = u.sugg.find((x) => x.id === id); if (!s) return;
  d.ms.mail.suggestions = d.ms.mail.suggestions.filter((x) => x.msgId !== s.msgId).concat([{ ...s, status: "added" }]).slice(-200);
  addScanned(d.ms, [s.msgId]); u.sugg = u.sugg.filter((x) => x.id !== id); save();
}
function dismissSuggestion(id) {
  const u = U(); const d = ensure(); if (!d.ms) return; const s = u.sugg.find((x) => x.id === id); if (!s) return;
  addScanned(d.ms, [s.msgId]); u.sugg = u.sugg.filter((x) => x.id !== id); save();
}

/* ================= what Today and the Calendar read ================= */
function item(e, source) {
  const date = A.parseD(e.date); if (!date) return null;
  const loc = e.join && e.location && joinOf(e.location) ? "" : e.location;   /* a bare Zoom URL as the location is shown as the Join button instead */
  return { date, label: e.title, rule: [e.time, loc || e.course].filter(Boolean).join(" · "), code: "", w: DUE_RE.test(e.title) || /^event-assignment-/.test(e.uid || "") ? 3 : 1, source, url: e.url || "", join: e.join || "", time: e.time || "", feed: true, uid: e.uid };
}
function feedItems() {
  if (!A.booted || A.state.example) return []; const c = doc(); if (!c) return [];
  const out = [];
  for (const f of Array.isArray(c.feeds) ? c.feeds : []) { const src = sourceOf(f); for (const e of Array.isArray(f.events) ? f.events : []) { const x = item(e, src); if (x) out.push(x); } }
  if (c.ms && c.ms.calendar) for (const e of Array.isArray(c.ms.calendar.events) ? c.ms.calendar.events : []) { const x = item(e, "Outlook"); if (x) out.push(x); }
  if (c.ms && c.ms.mail) for (const s of Array.isArray(c.ms.mail.suggestions) ? c.ms.mail.suggestions : []) {
    if (s.status !== "added") continue; const date = A.parseD(s.date); if (!date) continue;
    out.push({ date, label: s.label, rule: `From your inbox${s.from ? " · " + clip(s.from.replace(/\s*<.*>$/, ""), 40) : ""}`, code: "", w: 3, source: "Outlook", url: s.webLink || "", time: "", feed: true, uid: "mail:" + s.msgId });
  }
  return out;
}
window.PERL_FEEDS = () => { try { return feedItems(); } catch { return []; } };

/* ================= sync health: nothing goes missing silently ================= */
const STALE_MS = 24 * 3600 * 1000;
function problems() {
  if (!STANDALONE || !A.booted || A.state.example) return []; const c = doc(); if (!c) return [];
  const out = []; const now = Date.now();
  const check = (name, s, last) => {
    if (s.status === "error" || s.status === "attention") out.push({ name, why: s.error || "The last sync failed." });
    else if (last && now - last > STALE_MS) out.push({ name, why: `Last synced ${ago(last)}.` });
  };
  for (const f of Array.isArray(c.feeds) ? c.feeds : []) check(f.name || KIND_NAME[f.kind] || "Calendar", f, f.okAt || f.lastSync);
  if (c.ms) {
    const last = c.ms.okAt || c.ms.lastSync;
    if (tokens()) check("Outlook", c.ms, last);
    /* Microsoft sign-in lives on one device; the events it synced are shared, so only a stale copy is a problem */
    else if (last && now - last > STALE_MS) out.push({ name: "Outlook", why: `Last synced ${ago(last)}. Outlook syncs from the device where you signed in to Microsoft: open Charted there, or sign in on this one in Connections.` });
  }
  return out;
}
/* whether this copy of Charted has a Microsoft app registration; without one, the publish link is the way in */
let msReady = null;
if (STANDALONE) cfg().then((c) => { msReady = !!c.msClientId; if (A.booted && A.ui.view === "connect") A.render(); });

/* what's linked, for the sidebar: ok, attn (linked but failing or stale) or off */
function status() {
  const c = doc(); const ps = problems(); const bad = (n) => ps.some((p) => p.name === n);
  const feeds = c && Array.isArray(c.feeds) ? c.feeds : [];
  const can = feeds.filter((f) => f.kind === "canvas");
  const out = feeds.filter((f) => f.kind === "outlook");
  const canvas = !can.length ? "off" : can.some((f) => f.status === "error" || bad(f.name || KIND_NAME.canvas)) ? "attn" : "ok";
  const hasMs = !!(c && c.ms);
  const outlook = !out.length && !hasMs ? "off" : (out.some((f) => f.status === "error" || bad(f.name || KIND_NAME.outlook)) || (hasMs && bad("Outlook"))) ? "attn" : "ok";
  return { canvas, outlook };
}
const INVITE_KEY = "perl.v1.cn-invite-later";
function inviteCard() {
  if (!STANDALONE || !A.booted || A.state.example || !A.state.profile.setupDone) return "";
  const st = status(); if (st.canvas !== "off" || st.outlook !== "off") return "";
  const later = Number(lsGet(INVITE_KEY)) || 0; if (Date.now() - later < 7 * DAY) return "";
  return `<section class="cn-invite" aria-labelledby="h-cn-invite"><div><h2 id="h-cn-invite">Bring in Canvas and Outlook</h2>
    <p>Due dates and meetings land on Today by themselves, with links back. Two links to paste, about two minutes.</p></div>
    <div class="cn-health-act"><a class="btn small primary" href="#connect" id="cn-invite-go">Connect</a><button class="btn quiet small" data-act="cn-invite-later" id="cn-invite-later">Not now</button></div></section>`;
}
function healthCard() {
  const ps = problems(); if (!ps.length) return inviteCard();
  return `<section class="cn-health" role="alert" aria-labelledby="h-cn-health"><div><h2 id="h-cn-health">${ps.length === 1 ? `${esc(ps[0].name)} isn't up to date` : `${ps.length} connections aren't up to date`}</h2>
    <p>Things due there may be missing below. ${ps.map((p) => `<b>${esc(p.name)}:</b> ${esc(p.why)}`).join(" ")}</p></div>
    <div class="cn-health-act"><button class="btn small" data-act="cn-sync-all" id="cn-health-sync">Sync now</button><a class="btn quiet small" href="#connect">Connections</a></div></section>`;
}

/* ================= sync scheduler ================= */
let timer = 0, started = false;
async function syncAll(manual) {
  if (!STANDALONE || !A.booted || A.state.example) return; const c = doc(); if (!c) return;
  const stale = (ts) => manual || Date.now() - (ts || 0) > SYNC_EVERY;
  const jobs = [];
  for (const f of c.feeds) if (stale(f.lastSync)) jobs.push(syncFeed(f, manual));
  if (c.ms && tokens() && stale(c.ms.lastSync)) jobs.push(syncMs(false));
  await Promise.allSettled(jobs);
}
/* tokens left behind after the plan was erased, or the connection removed in another browser: drop them (only once the
   student's own document was really read, so an offline start never throws a sign-in away) */
function reconcile() { const c = doc(); const loaded = typeof STORE === "undefined" || typeof STORE.mode !== "function" || STORE.mode() === "account"; if (loaded && tokens() && !(c && c.ms)) dropTokens(); }
function onBoot() {
  if (started || !A.booted) return; started = true;
  if (!STANDALONE) return;
  const land = landing();
  if (land) msFinish(land);
  else { reconcile(); if (autoSync()) setTimeout(() => syncAll(false), 0); }
  timer = setInterval(() => { if (autoSync()) syncAll(false); }, SYNC_EVERY);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && autoSync()) syncAll(false); });
}
document.addEventListener("perl:view", () => onBoot());
if (A.booted) setTimeout(onBoot, 0);

/* ================= the Connections page ================= */
const ICONS = {
  ms: `<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="2.5" width="13" height="13" rx="2"/><path d="M2.5 7h13M6.5 2.5v4"/></svg>`,
  mail: `<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="4" width="14" height="10" rx="2"/><path d="M2.5 5l6.5 5 6.5-5"/></svg>`,
  canvas: `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 4.5h12M3 9h12M3 13.5h8"/></svg>`,
  google: `<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="3.5" width="13" height="12" rx="2"/><path d="M2.5 7.5h13M6 2v3M12 2v3"/></svg>`,
  elsewhere: `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7.5 10.5l3-3M6 12l-1.5 1.5a2.1 2.1 0 0 1-3-3L4 8M12 6l1.5-1.5a2.1 2.1 0 0 1 3 3L14 10"/></svg>`
};
function statusLine(cls, text, extra) { return `<p class="cn-status ${cls}" role="status">${text}${extra || ""}</p>`; }
function feedStatus(f) {
  const u = U(); if (u.busy[f.id]) return statusLine("is-busy", "Syncing…");
  if (f.status === "error") return statusLine("is-attn", `Needs attention: ${esc(f.error || "couldn't sync")}`);
  const n = (f.events || []).length;
  return statusLine("is-ok", `Connected · synced ${esc(ago(f.lastSync))} · ${n === 1 ? "1 event" : `${n} events`}`);
}
function feedRows(kinds) {
  const c = doc(); const u = U(); const fs = c ? c.feeds.filter((f) => kinds.includes(f.kind)) : [];
  if (!fs.length) return "";
  return `<ul class="cn-feeds">${fs.map((f) => `<li data-id="${esc(f.id)}"><div class="cn-feed-main"><span class="cn-feed-name">${esc(f.name || KIND_NAME[f.kind] || "Calendar")}</span>${feedStatus(f)}</div>
    <div class="cn-feed-acts">${u.confirm === f.id ? `<span class="cn-confirm">Remove this calendar and its ${(f.events || []).length} events?</span><button class="btn small danger" id="cn-rm-yes-${esc(f.id)}" data-act="cn-feed-remove-yes" data-id="${esc(f.id)}">Remove</button><button class="btn quiet small" data-act="cn-remove-no">Keep</button>`
      : `<button class="btn quiet small" id="cn-sync-${esc(f.id)}" data-act="cn-feed-sync" data-id="${esc(f.id)}"${u.busy[f.id] ? " disabled" : ""}>Sync now</button><button class="btn quiet small" id="cn-rm-${esc(f.id)}" data-act="cn-feed-remove" data-id="${esc(f.id)}">Remove</button>`}</div></li>`).join("")}</ul>`;
}
function addForm(kind, label, placeholder) {
  const u = U(); const err = u.err[kind];
  return `<form class="cn-add" data-form="cn-add" data-kind="${kind}"><label class="cn-add-l" for="cn-url-${kind}">${esc(label)}</label><div class="cn-add-row"><input type="text" id="cn-url-${kind}" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${esc(placeholder)}" value="${esc(u.draft[kind] || "")}" aria-describedby="cn-err-${kind}"><button class="btn small" type="submit" id="cn-add-${kind}">Add</button></div>${err ? `<p class="cn-err" id="cn-err-${kind}" role="alert">${esc(err)}</p>` : `<p class="cn-err" id="cn-err-${kind}" hidden></p>`}</form>`;
}
function card(kind, title, body) { return `<section class="panel cn-card" data-kind="${kind}" aria-labelledby="cn-h-${kind}"><div class="panel-head"><span class="cn-h">${ICONS[kind] || ""}<h2 id="cn-h-${kind}">${esc(title)}</h2></span></div>${body}</section>`; }
function msCard() {
  const c = doc(); const u = U(); const ms = c && c.ms; const tok = tokens();
  let status, acts;
  if (u.msErr) { status = statusLine("is-attn", `Needs attention: ${esc(u.msErr)}`); }
  else if (u.msBusy) status = statusLine("is-busy", `Connected as ${esc(ms && ms.account || "…")} · syncing…`);
  else if (ms && ms.status && ms.status !== "ok") status = statusLine("is-attn", `${ms.account ? `Connected as ${esc(ms.account)} · ` : ""}Needs attention: ${esc(ms.error || SIGN_IN_AGAIN)}`);
  else if (ms && tok) { const n = ms.calendar.events.length; status = statusLine("is-ok", `Connected as ${esc(ms.account || "your Microsoft account")} · synced ${esc(ago(ms.lastSync))} · ${n === 1 ? "1 event" : `${n} events`}`); }
  else if (ms) status = statusLine("is-attn", `Needs attention: ${esc(SIGN_IN_AGAIN)}`);
  else if (c && c.feeds.some((f) => f.kind === "outlook")) status = "";
  else status = statusLine("is-off", "Not linked");
  if (u.confirm === "ms") acts = `<span class="cn-confirm">Remove the Microsoft connection, its ${ms ? ms.calendar.events.length : 0} events and the deadlines added from email? The sign-in is forgotten on this device.</span><button class="btn small danger" id="cn-ms-rm-yes" data-act="cn-ms-remove-yes">Remove</button><button class="btn quiet small" data-act="cn-remove-no">Keep</button>`;
  else acts = `${ms && tok ? `<button class="btn small" id="cn-ms-sync" data-act="cn-ms-sync"${u.msBusy ? " disabled" : ""}>Sync now</button>` : `<button class="btn small" id="cn-ms-start" data-act="cn-ms-start">Sign in with Microsoft</button>`}${ms ? `<button class="btn quiet small" id="cn-ms-rm" data-act="cn-ms-remove">Remove</button>` : ""}`;
  const linked = c && c.feeds.some((f) => f.kind === "outlook");
  const steps = `<ol class="cn-steps">
      <li><a href="https://outlook.office.com/calendar/options/calendar/SharedCalendars" target="_blank" rel="noopener">Open Outlook's shared-calendar settings ↗</a> and sign in with your Illinois account.</li>
      <li>Under <b>Publish a calendar</b>, pick <b>Calendar</b> and <b>Can view all details</b>, then <b>Publish</b>.</li>
      <li>Copy the <b>ICS</b> link (not the HTML one) and paste it below.</li>
    </ol>`;
  const publish = `${linked ? "" : steps}${feedRows(["outlook"])}
    ${addForm("outlook", linked ? "Add another Outlook calendar link" : "Outlook ICS link", "https://outlook.office365.com/owa/calendar/…/calendar.ics")}
    ${linked ? "" : `<p class="hint">No <b>Publish a calendar</b> option? Your school has turned it off for your account. Microsoft sign-in is the other route, and it has to be set up once for Charted first.</p>`}`;
  /* without an app registration the sign-in button only leads to an error, so it isn't offered */
  if (msReady === false && !ms) return card("ms", "Outlook calendar", `<p class="hint">Your meetings, clinic and lectures from the past week and the next 90 days. Read-only: Charted never writes to your calendar.</p>${linked ? "" : statusLine("is-off", "Not linked")}${publish}`);
  return card("ms", "Outlook calendar", `<p class="hint">Events from the next 60 days and the past week, through Microsoft. Read-only: Charted never writes to your calendar. The sign-in stays in this browser.</p>
    ${status}<div class="cn-acts">${acts}</div>
    <div class="cn-or"><span>Or paste an Outlook “publish calendar” link</span></div>
    ${publish}`);
}
function suggRow(s) {
  const d = A.parseD(s.date);
  return `<li data-id="${esc(s.id)}"><div class="cn-sugg-main"><span class="cn-sugg-when num">${d ? esc(A.fmtShort(d)) : esc(s.date)}</span><span class="cn-sugg-t"><b>${esc(s.label)}</b><small>${esc(s.from)}${s.webLink ? ` · <a href="${esc(s.webLink)}" target="_blank" rel="noopener">Open email</a>` : ""}</small></span></div>
    <div class="cn-sugg-acts"><button class="btn small" id="cn-add-s-${esc(s.id)}" data-act="cn-sugg-add" data-id="${esc(s.id)}">Add</button><button class="btn quiet small" id="cn-dis-s-${esc(s.id)}" data-act="cn-sugg-dismiss" data-id="${esc(s.id)}">Dismiss</button></div></li>`;
}
function mailCard() {
  const c = doc(); const u = U(); const ms = c && c.ms;
  if (!ms) return card("mail", "Outlook email", `<p class="hint">Suggested deadlines from messages your school sends: subject, sender, date and a 255-character preview are read, nothing else, and only the ones you accept are kept.</p>${statusLine("is-off", msReady === false ? "Needs Microsoft sign-in, which isn't set up for Charted yet. Your calendar works without it." : "Sign in with Microsoft above to scan your school inbox.")}`);
  const added = ms.mail.suggestions.filter((s) => s.status === "added").length; const ai = aiAllowed();
  const list = u.sugg.length ? `<ul class="cn-sugg">${u.sugg.map(suggRow).join("")}</ul>` : "";
  return card("mail", "Outlook email", `<p class="hint">Suggested deadlines from messages your school sends. Charted reads the subject, sender, date and 255-character preview of mail from these domains, keeps only what you add, and never reads message bodies.</p>
    <div class="field cn-domains"><label for="cn-domains">School sender domains</label><input type="text" id="cn-domains" value="${esc(u.draft.domains != null ? u.draft.domains : ms.mail.domains.join(", "))}" autocomplete="off" spellcheck="false" placeholder="illinois.edu, carle.com"></div>
    <div class="cn-acts"><button class="btn small" id="cn-scan" data-act="cn-scan"${u.scan.busy ? " disabled" : ""}>${u.scan.busy ? "Reading your inbox…" : "Find deadlines in my inbox"}</button><span class="hint">${ai ? "Claude reads the subjects and previews of up to 40 school emails to pick the dates. " : "Checked here in your browser; allow Claude in Profile and settings for a smarter read. "}${added ? `${added} added · on your Calendar.` : ""}</span></div>
    ${u.scan.error ? `<p class="cn-err" role="alert">${esc(u.scan.error)}</p>` : ""}${u.scan.note ? `<p class="cn-note" role="status">${esc(u.scan.note)}</p>` : ""}
    ${list}`);
}
function feedCard(kind, title, intro, label, placeholder) {
  const kinds = [kind].concat(kind === "google" ? ["ics"] : []);   /* any other .ics lives on the Google card */
  const c = doc(); const has = c && c.feeds.some((f) => kinds.includes(f.kind));
  return card(kind, title, `<p class="hint">${intro}</p>${has ? "" : statusLine("is-off", "Not linked")}${feedRows(kinds)}${addForm(kind, label, placeholder)}`);
}
function canvasCard() {
  const c = doc(); const has = c && c.feeds.some((f) => f.kind === "canvas");
  return card("canvas", "Canvas", `<p class="hint">Assignments, due dates and course events from your Canvas calendar.</p>
    ${has ? "" : `${statusLine("is-off", "Not linked")}<ol class="cn-steps">
      <li><a href="https://canvas.illinois.edu/calendar" target="_blank" rel="noopener">Open your Canvas calendar ↗</a> in a browser (the Canvas phone app doesn't show the link).</li>
      <li>At the bottom of the right-hand column, choose <b>Calendar Feed</b> and copy the link.</li>
      <li>Paste it below.</li>
    </ol>`}${feedRows(["canvas"])}${addForm("canvas", has ? "Add another Canvas feed" : "Canvas calendar feed link", "https://canvas.illinois.edu/feeds/calendars/user_….ics")}`);
}
function elsewhereCard() {
  return card("elsewhere", "Already connected elsewhere", `<ul class="cn-else">
    <li><a href="#habits"><b>Anki</b><small>Habits fills in your review habit from AnkiConnect on your computer.</small></a></li>
    <li><a href="#schedule"><b>Clerkship schedules (one45, CI CARE exports)</b><small>Schedule reads the posted schedule into each day.</small></a></li>
    <li><a href="#career"><b>Resume</b><small>Career reads your CV for what makes you distinctive and who's in your network.</small></a></li>
  </ul>`);
}
function vConnect() {
  const head = `<div class="title-row"><div><h1>Connections</h1><p class="finding">Paste two links once: Canvas and Outlook. From then on their dates show up on Today and the Calendar, and sync every time Charted opens. Read-only: Charted never writes to them or sends anything.</p></div>${STANDALONE && !A.state.example && doc() && (doc().feeds.length || (doc().ms && tokens())) ? `<div class="title-actions"><button class="btn small" id="cn-sync-all" data-act="cn-sync-all">Sync all</button></div>` : ""}</div>`;
  if (!STANDALONE) return `<div class="cn" id="cn-root">${head}
    <section class="panel cn-needs-app" aria-labelledby="cn-needs-h"><h2 id="cn-needs-h">Connections need the installed app</h2><p>Here in Claude, Charted has nowhere private to keep a Microsoft sign-in and no proxy to fetch calendar feeds through. Open Charted as the installed app and go to Settings › Connections there. This is what you'll be able to link:</p></section>
    <div class="cn-cards">${[["ms", "Outlook calendar", "Sign in with Microsoft, or paste an Outlook publish link. Events from the next 60 days."], ["mail", "Outlook email", "Suggested deadlines from school senders; you tick which to add."], ["canvas", "Canvas", "Assignments, due dates and course events from the Canvas calendar feed."], ["google", "Google Calendar, or any .ics", "Events from the calendar's secret iCal address."]].map(([k, t, d]) => card(k, t, `<p class="hint">${esc(d)}</p>`)).join("")}${elsewhereCard()}</div></div>`;
  if (A.state.example) return `<div class="cn" id="cn-root">${head}<section class="panel cn-needs-app"><p>Connections belong to your own plan, not the example. Go back to your plan to link a calendar.</p></section></div>`;
  const c = doc();
  return `<div class="cn" id="cn-root">${head}
    <div class="cn-cards">
      ${canvasCard()}${msCard()}${mailCard()}
      ${feedCard("google", "Google Calendar, or any .ics", "Events from a calendar's secret iCal address. In Google Calendar: Settings › your calendar › Secret address in iCal format.", "Secret iCal address", "https://calendar.google.com/calendar/ical/…/basic.ics")}
      ${elsewhereCard()}
    </div>
    <p class="cn-foot"><label class="cn-check"><input type="checkbox" id="cn-autosync"${autoSync() ? " checked" : ""}> Sync when Charted opens (if it's been 30 minutes) and every 30 minutes while it's open</label>${c && c.feeds.length ? `<span class="hint">Feed links are kept in your own Charted document; the proxy fetches them when asked and stores nothing.</span>` : ""}</p>
  </div>`;
}

/* ================= actions and events ================= */
const acts = {
  "cn-ms-start": () => { U().msErr = ""; msStart(); },
  "cn-ms-sync": () => { const d = doc(); if (d && d.ms) { syncMs(true); } },
  "cn-ms-remove": () => { U().confirm = "ms"; rerender("#cn-ms-rm-yes"); },
  "cn-ms-remove-yes": () => { removeMs(); A.toast("Microsoft connection removed from this device."); rerender("#cn-ms-start"); },
  "cn-remove-no": () => { const id = U().confirm; U().confirm = null; rerender(id === "ms" ? "#cn-ms-rm" : `#cn-rm-${CSS.escape(String(id))}`); },
  "cn-feed-sync": (el) => { const f = feedById(el.dataset.id); if (f) syncFeed(f, true); },
  "cn-feed-remove": (el) => { U().confirm = el.dataset.id; rerender(`#cn-rm-yes-${CSS.escape(el.dataset.id)}`); },
  "cn-feed-remove-yes": (el) => { const f = removeFeed(el.dataset.id); if (f) A.toast(`${f.name || KIND_NAME[f.kind] || "Calendar"} removed.`); rerender(`#cn-url-${f ? f.kind : "canvas"}`); },
  "cn-scan": () => scanMail(true),
  "cn-invite-later": () => { lsSet(INVITE_KEY, String(Date.now())); A.toast("Okay. Connections are in the sidebar whenever you want them."); A.render(); },
  "cn-sugg-add": (el) => { const s = U().sugg.find((x) => x.id === el.dataset.id); acceptSuggestion(el.dataset.id); if (s) A.toast(`Added: ${s.label}, ${A.fmtShort(A.parseD(s.date))}.`); rerender(U().sugg.length ? `#cn-add-s-${CSS.escape(U().sugg[0].id)}` : "#cn-scan"); },
  "cn-sugg-dismiss": (el) => { dismissSuggestion(el.dataset.id); rerender(U().sugg.length ? `#cn-dis-s-${CSS.escape(U().sugg[0].id)}` : "#cn-scan"); },
  "cn-sync-all": (el) => { syncAll(true).then(() => { if (A.ui.view === "today") A.render(); }); A.toast("Syncing your connections…"); if (el && el.id === "cn-health-sync") return; rerender("#cn-sync-all"); }
};
const on = {
  change(ev) {
    const t = ev.target; if (!t || !t.id) return false;
    if (t.id === "cn-domains") {
      const d = ensure(); if (!d.ms) return true;
      const doms = [...new Set(String(t.value).toLowerCase().split(/[,\s;]+/).map((x) => x.replace(/^@/, "").trim()).filter((x) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(x)))].slice(0, 10);
      d.ms.mail.domains = doms.length ? doms : DEFAULT_DOMAINS.slice(); delete U().draft.domains; save(); A.render(); return true;
    }
    if (t.id === "cn-autosync") { const d = ensure(); d.settings.autoSync = !!t.checked; save(); if (t.checked) syncAll(false); return true; }
    return false;
  },
  input(ev) {
    const t = ev.target; if (!t || !t.id) return false;
    if (t.id.startsWith("cn-url-")) { U().draft[t.id.slice(7)] = t.value; return true; }
    if (t.id === "cn-domains") { U().draft.domains = t.value; return true; }
    return false;
  },
  submit(ev) {
    const f = ev.target; if (!f.dataset || f.dataset.form !== "cn-add") return false;
    const kind = f.dataset.kind; const inp = $(`#cn-url-${kind}`); const feed = addFeed(kind, inp ? inp.value : "");
    if (!feed) { rerender(`#cn-url-${kind}`); return true; }
    delete U().draft[kind]; A.toast(`${KIND_NAME[feed.kind] || "Calendar"} linked. Syncing…`); rerender(`#cn-url-${kind}`);
    syncFeed(feed, true);
    return true;
  }
};

/* the command palette: a way in, and a way to sync */
(window.PERL_PALETTE = window.PERL_PALETTE || []).push((q) => {
  const s = String(q || "").toLowerCase(); const out = [];
  if (STANDALONE && /sync/.test(s)) out.push({ g: "Actions", icon: "action", label: "Sync calendars now", run: () => { syncAll(true); A.toast("Syncing your connections…"); } });
  return out;
});

/* read-only helpers for tests; no data */
window.PERL_CONNECT = Object.freeze({ status: () => { try { return STANDALONE ? status() : null; } catch { return null; } }, parseIcs: (text, win) => parseIcs(text, win), heuristic: (msgs) => heuristic(msgs || []), mailPrompt: (msgs) => mailPrompt(msgs || [], iso(A.today())), cleanClaude: (reply, cands) => cleanClaude(reply, cands || []), resolveDate: (t, r) => { const d = resolveDate(t, r); return d ? iso(d) : ""; } });

window.PERL_MODULES.push({ views: { connect: vConnect }, acts, on, today: healthCard, todaySlot: "alert" });
})();
