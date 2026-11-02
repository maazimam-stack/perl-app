/* Store: the one place the app reads and writes saved data.
   Each space has its own document under the viewer's private path, which nobody else can read (the artifact owner included):
     data/users/<uid>/shared  profile, rotations, clerkship schedules, a loaded track spreadsheet
     data/users/<uid>/school  graduation checklist, electives, check-offs, Ask history
     data/users/<uid>/debrief  (slice 2) journal settings; entries in its own collection
   School and shared code never import the debrief store. Without the Claude runtime it falls back to this browser.

   When the account can't be reached (offline, the server is down, the sign-in expired) nothing is lost: the plan is kept
   in this browser, the student is told, and the save is retried when the connection or the sign-in comes back.
   Two tabs: each save is announced to the other tabs of this browser, which take the new copy, or merge it with changes
   of their own that haven't been saved yet (and say so if both tabs changed the same thing). */
const STORE = (() => {
  "use strict";
  const SHARED_KEYS = ["v", "profile", "rotations", "scheds", "customTracks", "updatedAt"];
  const SCHOOL_KEYS = ["req", "electives", "done", "askRecent", "habits", "career", "connect", "projects", "fmcc", "aways"];
  const LS = "perl.v1.";
  let db = null, uid = null, mode = "pending", lastErr = "", errCode = "", offlineAtLoad = false;
  const last = { shared: "", school: "" };
  let timer = null, pending = null, inflight = Promise.resolve(), unsaved = null, retryTimer = null;
  const subs = new Set();
  const emit = (type, detail) => { for (const fn of subs) { try { fn(type, detail); } catch { /* a listener failed */ } } };

  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(LS + k) || "null"); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* storage unavailable or full */ } };
  const lsDel = (k) => { try { localStorage.removeItem(LS + k); } catch { /* storage unavailable */ } };
  const doc = (space) => db.doc(`data/users/${uid}/${space}`);
  /* db documents hold JSON; round-trip so nothing non-serialisable slips in */
  const plain = (o) => JSON.parse(JSON.stringify(o));
  const codeOf = (e) => (e && e.code) || "";

  /* tabs of this browser tell each other when they save */
  let bc = null; const TAB = Math.random().toString(36).slice(2);
  try { bc = new BroadcastChannel("perl.v1.store"); } catch { bc = null; }
  if (bc) bc.onmessage = (m) => { const d = m && m.data; if (d && d.tab !== TAB && d.uid === uid) onOtherTab(d); };

  async function init() {
    try {
      const c = window.claude;
      if (c && typeof c.use === "function") {
        const [d, u] = await Promise.all([c.use("db"), c.use("user")]);
        const id = u ? await u.id() : null;
        if (d && id) { db = d; uid = id; mode = "account"; return mode; }
      }
    } catch (e) { lastErr = (e && e.message) || ""; }
    mode = "browser"; return mode;
  }

  /* returns { shared, school } or null when nothing has been saved yet.
     If the account can't be reached, returns the copy kept in this browser (and offline() says so); it never pretends
     the student is new just because the network is down. */
  async function load() {
    if (mode === "account") {
      try {
        const [a, b] = await Promise.all([doc("shared").get(), doc("school").get()]);
        offlineAtLoad = false; lastErr = ""; errCode = "";
        if (!a.exists && !b.exists) return null;
        const shared = a.exists ? a.data() : {}; const school = b.exists ? b.data() : {};
        last.shared = JSON.stringify(shared); last.school = JSON.stringify(school);
        return { shared, school };
      } catch (e) {
        lastErr = (e && e.message) || "Couldn't reach your saved data."; errCode = codeOf(e) || "unavailable"; offlineAtLoad = true;
        const shared = lsGet("shared"), school = lsGet("school");
        if (!shared && !school) return { shared: {}, school: {}, unreachable: true };
        /* the copy this tab starts from: only spaces changed from it get saved, merged with whatever the account has by then */
        last.shared = JSON.stringify(shared || {}); last.school = JSON.stringify(school || {});
        return { shared: shared || {}, school: school || {}, unreachable: true };
      }
    }
    const shared = lsGet("shared"), school = lsGet("school");
    if (!shared && !school) return null;
    return { shared: shared || {}, school: school || {} };
  }

  async function write(state) {
    const parts = { shared: plain(pick(state, SHARED_KEYS)), school: plain(pick(state, SCHOOL_KEYS)) };
    let failed = false;
    /* after a failure (offline, signed out, server down) the account may have moved on meanwhile, from another device:
       read it first and merge, rather than writing this tab's whole copy over it */
    const reconcile = mode === "account" && (offlineAtLoad || !!lastErr);
    for (const space of ["shared", "school"]) {
      let json = JSON.stringify(parts[space]);
      if (json === last[space]) continue;
      if (mode === "account") {
        try {
          if (reconcile) {
            const got = await doc(space).get(); const remote = got && got.exists ? got.data() : null;
            let base = {}; try { base = JSON.parse(last[space] || "{}"); } catch { base = {}; }
            if (remote && !same(remote, base) && !same(remote, parts[space])) {
              const r = merge3(base, parts[space], remote, 0); parts[space] = r.out; json = JSON.stringify(r.out);
              emit("merge", { space, data: r.out, conflict: r.conflict, theirs: remote, from: "account" });
            }
          }
          await doc(space).set(parts[space]); last[space] = json;
          lsSet(space, parts[space]); /* this browser keeps the latest copy, so a later offline start still opens the plan */
          if (bc) try { bc.postMessage({ tab: TAB, uid, space, at: Date.now() }); } catch { /* fine */ }
        } catch (e) { failed = true; lastErr = (e && e.message) || "Couldn't save."; errCode = codeOf(e) || "unavailable"; lsSet(space, parts[space]); }
      } else { lsSet(space, parts[space]); last[space] = json; }
    }
    if (mode !== "account") return;
    if (failed) { unsaved = state; scheduleRetry(); emit("error", { code: errCode }); }
    else if (lastErr || unsaved) { const was = !!lastErr; lastErr = ""; errCode = ""; unsaved = null; offlineAtLoad = false; clearTimeout(retryTimer); if (was) emit("saved", {}); }
  }
  /* retry a failed save: when the browser says it's back online, after signing in again, and every 20 s meanwhile */
  function scheduleRetry() { clearTimeout(retryTimer); if (errCode === "session_expired") return; retryTimer = setTimeout(retry, 20000); }
  function retry() { clearTimeout(retryTimer); if (!unsaved || mode !== "account") return Promise.resolve(); const s = unsaved; inflight = inflight.then(() => write(s)); return inflight; }
  window.addEventListener("online", () => { if (unsaved) retry(); else if (offlineAtLoad) emit("online", {}); });
  document.addEventListener("perl:reauthed", () => { if (unsaved) retry(); else if (offlineAtLoad) emit("online", {}); });

  /* Browser saves are written at once (they're synchronous and cheap). Account saves are batched, one per space
     at most every 400 ms and one at a time, and flushed when the page is hidden or closed. That last flush is best-effort:
     an account write started during unload may not finish, and the browser copy is the fallback. */
  function flush() { clearTimeout(timer); timer = null; if (!pending) return; const s = pending; pending = null; inflight = inflight.then(() => write(s)); }
  function save(state) {
    if (mode === "browser") { pending = state; flush(); return; }
    pending = state; clearTimeout(timer); timer = setTimeout(flush, 400);
  }
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  /* Another tab saved. If this tab has nothing waiting to save, it takes the new copy. If it does, the two are merged
     against the copy both started from: whatever only one tab changed is kept, field by field (profile.name from one tab,
     profile.myName from the other). Only when both tabs changed the same field does this tab's version win, and the
     student is told. */
  const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function merge3(base, mine, theirs, depth) {
    const out = {}; let conflict = false;
    for (const k of new Set([...Object.keys(base || {}), ...Object.keys(mine || {}), ...Object.keys(theirs || {})])) {
      const b = (base || {})[k], m = (mine || {})[k], t = (theirs || {})[k];
      if (k === "updatedAt") { out[k] = Math.max(Number(m) || 0, Number(t) || 0); continue; }
      if (same(m, b)) { if (t !== undefined) out[k] = t; }
      else if (same(t, b) || same(t, m)) { if (m !== undefined) out[k] = m; }
      else if (depth < 2 && isObj(m) && isObj(t)) { const r = merge3(isObj(b) ? b : {}, m, t, depth + 1); out[k] = r.out; conflict = conflict || r.conflict; }
      else { if (m !== undefined) out[k] = m; conflict = true; }
    }
    return { out, conflict };
  }
  async function onOtherTab(d) {
    try {
      const got = mode === "account" ? await doc(d.space).get() : null;
      const data = mode === "account" ? (got && got.exists ? got.data() : {}) : lsGet(d.space) || {};
      const local = pending || unsaved;
      if (!local) { last[d.space] = JSON.stringify(data); emit("remote", { space: d.space, data }); return; }
      const keys = d.space === "shared" ? SHARED_KEYS : SCHOOL_KEYS;
      let base = {}; try { base = JSON.parse(last[d.space] || "{}"); } catch { base = {}; }
      const { out, conflict } = merge3(base, plain(pick(local, keys)), data, 0);
      last[d.space] = JSON.stringify(data);
      emit("merge", { space: d.space, data: out, conflict, theirs: data, from: "tab" });
    } catch { /* the next load picks it up */ }
  }
  /* in browser mode the storage event does the same job */
  window.addEventListener("storage", (e) => {
    if (mode !== "browser" || !e.key || !e.key.startsWith(LS) || e.newValue == null) return;
    const space = e.key.slice(LS.length); if (space !== "shared" && space !== "school") return;
    try { const data = JSON.parse(e.newValue); last[space] = e.newValue; emit("remote", { space, data }); } catch { /* not ours */ }
  });

  async function clear() {
    clearTimeout(timer); pending = null; unsaved = null; clearTimeout(retryTimer);
    if (mode === "account") { try { await Promise.all([doc("shared").delete(), doc("school").delete()]); } catch (e) { lastErr = (e && e.message) || ""; } }
    lsDel("shared"); lsDel("school"); last.shared = ""; last.school = "";
  }

  function note() {
    if (errCode === "session_expired") return "Your sign-in expired. Changes are kept in this browser until you sign in again.";
    if (lastErr) return "Not saved to your account yet. Kept in this browser; Charted retries when you're back online.";
    return mode === "account" ? (window.PERL_ACCOUNT ? "Saved to your account" : "Saved to your Claude account") : "Saved in this browser";
  }
  /* the size of what one save sends, in bytes, per space (for the large-plan checks) */
  function sizes(state) { return { shared: JSON.stringify(pick(state, SHARED_KEYS)).length, school: JSON.stringify(pick(state, SCHOOL_KEYS)).length }; }
  return {
    init, load, save, clear, note, retry, sizes, mode: () => mode, keys: { SHARED_KEYS, SCHOOL_KEYS },
    problem: () => (lastErr ? errCode || "unavailable" : ""), offline: () => offlineAtLoad, hasUnsaved: () => !!(unsaved || pending),
    on: (fn) => { subs.add(fn); return () => subs.delete(fn); }
  };
})();
