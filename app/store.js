/* Store: the one place the app reads and writes saved data.
   Each space has its own document under the viewer's private path, which nobody else can read (the artifact owner included):
     data/users/<uid>/shared  profile, rotations, clerkship schedules, a loaded track spreadsheet
     data/users/<uid>/school  graduation checklist, electives, check-offs, Ask history
     data/users/<uid>/debrief  (slice 2) journal settings; entries in its own collection
   School and shared code never import the debrief store. Without the Claude runtime it falls back to this browser. */
const STORE = (() => {
  "use strict";
  const SHARED_KEYS = ["v", "profile", "rotations", "scheds", "customTracks", "updatedAt"];
  const SCHOOL_KEYS = ["req", "electives", "done", "askRecent"];
  const LS = "perl.v1.";
  let db = null, uid = null, mode = "pending", lastErr = "";
  const last = { shared: "", school: "" };
  let timer = null, pending = null, inflight = Promise.resolve();

  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(LS + k) || "null"); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  const lsDel = (k) => { try { localStorage.removeItem(LS + k); } catch { /* storage unavailable */ } };
  const doc = (space) => db.doc(`data/users/${uid}/${space}`);
  /* db documents hold JSON; round-trip so nothing non-serialisable slips in */
  const plain = (o) => JSON.parse(JSON.stringify(o));

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

  /* returns { shared, school } or null when nothing has been saved yet */
  async function load() {
    if (mode === "account") {
      try {
        const [a, b] = await Promise.all([doc("shared").get(), doc("school").get()]);
        if (!a.exists && !b.exists) return null;
        const shared = a.exists ? a.data() : {}; const school = b.exists ? b.data() : {};
        last.shared = JSON.stringify(shared); last.school = JSON.stringify(school);
        return { shared, school };
      } catch (e) { lastErr = (e && e.message) || "Couldn't reach your saved data."; mode = "browser"; }
    }
    const shared = lsGet("shared"), school = lsGet("school");
    if (!shared && !school) return null;
    return { shared: shared || {}, school: school || {} };
  }

  async function write(state) {
    const parts = { shared: plain(pick(state, SHARED_KEYS)), school: plain(pick(state, SCHOOL_KEYS)) };
    for (const space of ["shared", "school"]) {
      const json = JSON.stringify(parts[space]);
      if (json === last[space]) continue;
      if (mode === "account") {
        try { await doc(space).set(parts[space]); last[space] = json; lastErr = ""; }
        catch (e) { lastErr = (e && e.message) || "Couldn't save."; lsSet(space, parts[space]); }
      } else { lsSet(space, parts[space]); last[space] = json; }
    }
  }

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

  async function clear() {
    clearTimeout(timer); pending = null;
    if (mode === "account") { try { await Promise.all([doc("shared").delete(), doc("school").delete()]); } catch (e) { lastErr = (e && e.message) || ""; } }
    lsDel("shared"); lsDel("school"); last.shared = ""; last.school = "";
  }

  function note() {
    if (lastErr) return "Not saved to your account. Kept in this browser for now.";
    return mode === "account" ? (window.PERL_ACCOUNT ? "Saved to your account" : "Saved to your Claude account") : "Saved in this browser";
  }
  return { init, load, save, clear, note, mode: () => mode, keys: { SHARED_KEYS, SCHOOL_KEYS } };
})();
