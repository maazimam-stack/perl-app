/* Charted standalone runtime.
   The app was written against the Claude artifact runtime (window.claude.use("db" | "user" | "sample" | "downloads")).
   This file provides the same interface outside Claude:
     db        Supabase Postgres, one table per space (docs_shared, docs_school, docs_debrief), row-level security per user
     user      the signed-in Supabase user
     sample    Claude through this site's /api/claude route (the API key never reaches the browser), after the student consents
     downloads a normal file download
   Sign-in is by email. Tap the link, or (in an installed app, where the link opens the browser instead) paste the link
   or a 6-digit code into the sign-in box. The implicit flow is used so the link works in any browser it opens in.
   window.PERL_BACKEND = "memory" (set before this script) swaps Supabase for a local in-browser store; tests use it. */
(() => {
  "use strict";
  const MEMORY = window.PERL_BACKEND === "memory";
  const CONSENT_KEY = "perl.v1.ai-consent";
  const TABLE = { shared: "docs_shared", school: "docs_school", debrief: "docs_debrief" };
  const err = (code, message) => Object.assign(new Error(message), { code, message });
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  /* a gate is modal: the app behind it is inert and Tab stays inside the card (WCAG 2.4.3) */
  const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  function gateOpen(wrap) {
    for (const el of document.body.children) if (el !== wrap && el.tagName !== "SCRIPT" && !el.inert) { el.dataset.perlInert = "1"; el.inert = true; }
    wrap.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = [...wrap.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null); if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || !wrap.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !wrap.contains(a))) { e.preventDefault(); first.focus(); }
    });
  }
  function gateClose(wrap, back) {
    wrap.remove();
    for (const el of document.querySelectorAll("[data-perl-inert]")) { el.inert = false; delete el.dataset.perlInert; }
    if (back && back.focus && document.contains(back)) back.focus();
  }

  let client = null, session = null, uid = null, email = "";
  /* server routes: Supabase Edge Functions when config.json names them (static hosting), else this site's /api */
  let API = { claude: "/api/claude", deleteAccount: "/api/delete-account", headers: {} };
  let readyResolve; const ready = new Promise((r) => { readyResolve = r; });

  /* ---------------- backends: rows of { table, path, data } for the signed-in user ---------------- */
  function supabaseBackend() {
    /* an expired or missing sign-in is "session_expired" (sign in again and carry on); a row the policy refuses is
       "not_granted"; anything else (offline, server down) is "unavailable" and worth retrying */
    const map = (e) => {
      const m = (e && e.message) || "Request failed"; const code = String((e && (e.code || e.status)) || "");
      if (/JWT|jwt expired|invalid claim|not authenticated|session/i.test(m) || /^(401|PGRST30\d)$/.test(code)) { expired(); return err("session_expired", "Your sign-in expired."); }
      if (/permission|policy|42501/i.test(m + code) || code === "403") return err("not_granted", m);
      return err("unavailable", m);
    };
    const run = async (fn) => { let r; try { r = await fn(); } catch (e) { throw map(e); } if (r && r.error) throw map(r.error); return r || {}; };
    return {
      async get(table, path) { const { data } = await run(() => client.from(table).select("data").eq("path", path).maybeSingle()); return data ? data.data : null; },
      async list(table, prefix) { const { data } = await run(() => client.from(table).select("path,data").like("path", prefix.replace(/[%_\\]/g, "\\$&") + "%")); return data || []; },
      async set(table, path, value) { await run(() => client.from(table).upsert({ path, data: value }, { onConflict: "user_id,path" })); },
      async del(table, path) { await run(() => client.from(table).delete().eq("path", path)); },
      watch(onChange) {
        try {
          const ch = client.channel("perl-docs-" + uid);
          for (const t of Object.values(TABLE)) ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `user_id=eq.${uid}` }, (p) => onChange(t, (p.new && p.new.path) || (p.old && p.old.path)));
          ch.subscribe();
        } catch { /* live updates are a bonus; the app works without them */ }
      }
    };
  }
  function memoryBackend() {
    const KEY = "perl.test.db";
    const load = () => { try { return JSON.parse(lsGet(KEY) || "{}"); } catch { return {}; } };
    const save = (db) => lsSet(KEY, JSON.stringify(db));
    return {
      async get(table, path) { const db = load(); return clone((db[table] || {})[path] ?? null); },
      async list(table, prefix) { const db = load(); return Object.entries(db[table] || {}).filter(([p]) => p.startsWith(prefix)).map(([path, data]) => ({ path, data: clone(data) })); },
      async set(table, path, value) { const db = load(); (db[table] = db[table] || {})[path] = clone(value); save(db); },
      async del(table, path) { const db = load(); if (db[table]) delete db[table][path]; save(db); },
      watch() {}
    };
  }
  let backend = null;

  /* ---------------- the db namespace (the subset of the artifact contract the app uses) ---------------- */
  /* "data/users/<uid>/debrief/entries/e1" -> { table: "docs_debrief", path: "debrief/entries/e1" } */
  function locate(full) {
    const seg = String(full || "").split("/").filter(Boolean);
    if (seg[0] !== "data" || seg[1] !== "users" || !seg[2]) throw err("invalid_argument", "Only data/users/<you>/... paths are stored");
    if (seg[2] !== uid) throw err("not_granted", "That path belongs to someone else");
    const rest = seg.slice(3); const table = TABLE[rest[0]];
    if (!table) throw err("invalid_argument", `Unknown space "${rest[0]}"`);
    return { table, path: rest.join("/"), full: seg.join("/") };
  }
  const listeners = new Set(); /* { kind: "doc"|"query", table, path, fire } */
  function notify(table, path) {
    for (const l of listeners) {
      if (l.table !== table) continue;
      if (l.kind === "doc" && l.path === path) l.fire();
      if (l.kind === "query" && path && path.startsWith(l.path + "/") && !path.slice(l.path.length + 1).includes("/")) l.fire();
    }
  }
  const META = { fromCache: false, hasPendingWrites: false };
  const docSnap = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : clone(data)), metadata: META });
  const leaf = (p) => p.split("/").pop();

  function docRef(full) {
    const loc = locate(full);
    return {
      id: leaf(loc.path), path: loc.full,
      async get() { return docSnap(leaf(loc.path), await backend.get(loc.table, loc.path)); },
      async set(data) { if (!data || typeof data !== "object") throw err("invalid_argument", "A document is an object"); await backend.set(loc.table, loc.path, clone(data)); notify(loc.table, loc.path); },
      async update(data) { const cur = (await backend.get(loc.table, loc.path)) || {}; await backend.set(loc.table, loc.path, { ...cur, ...clone(data) }); notify(loc.table, loc.path); },
      async delete() { await backend.del(loc.table, loc.path); notify(loc.table, loc.path); },
      async acquire() { return { acquired: true }; },
      onSnapshot(next, onError) {
        let live = true; let seq = 0;
        const fire = () => { const my = ++seq; backend.get(loc.table, loc.path).then((d) => { if (live && my === seq) next(docSnap(leaf(loc.path), d)); }, (e) => { if (live && onError) onError(e); }); };
        const l = { kind: "doc", table: loc.table, path: loc.path, fire }; listeners.add(l); fire();
        return () => { live = false; listeners.delete(l); };
      },
      collection(sub) { return collectionRef(loc.full + "/" + sub); }
    };
  }
  const getField = (o, f) => String(f).split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const OPS = { "==": (a, b) => a === b, "!=": (a, b) => a !== b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "array-contains": (a, b) => Array.isArray(a) && a.includes(b) };
  function collectionRef(full, q = { where: [], order: null, limit: 0 }) {
    const loc = locate(full);
    const run = async () => {
      const rows = (await backend.list(loc.table, loc.path + "/")).filter((r) => !r.path.slice(loc.path.length + 1).includes("/"));
      let docs = rows.map((r) => ({ id: leaf(r.path), data: r.data }));
      for (const [f, op, v] of q.where) docs = docs.filter((d) => (OPS[op] || (() => false))(getField(d.data, f), v));
      if (q.order) { const [f, dir] = q.order; docs.sort((a, b) => { const x = getField(a.data, f), y = getField(b.data, f); const c = x == null ? -1 : y == null ? 1 : x < y ? -1 : x > y ? 1 : 0; return dir === "desc" ? -c : c; }); }
      if (q.limit) docs = docs.slice(0, q.limit);
      const snaps = docs.map((d) => docSnap(d.id, d.data));
      return { docs: snaps, size: snaps.length, empty: !snaps.length, docChanges: () => snaps.map((doc, i) => ({ type: "added", doc, oldIndex: -1, newIndex: i })), metadata: META };
    };
    return {
      path: loc.full,
      doc(id) { return docRef(loc.full + "/" + (id || "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7))); },
      async add(data) { const r = this.doc(); await r.set(data); return r; },
      where(f, op, v) { return collectionRef(full, { ...q, where: [...q.where, [f, op, v]] }); },
      orderBy(f, dir = "asc") { return collectionRef(full, { ...q, order: [f, dir] }); },
      limit(n) { return collectionRef(full, { ...q, limit: n }); },
      get: run,
      onSnapshot(next, onError) {
        let live = true; let seq = 0;
        const fire = () => { const my = ++seq; run().then((s) => { if (live && my === seq) next(s); }, (e) => { if (live && onError) onError(e); }); };
        const l = { kind: "query", table: loc.table, path: loc.path, fire }; listeners.add(l); fire();
        return () => { live = false; listeners.delete(l); };
      }
    };
  }
  const db = Object.freeze({ doc: (p) => docRef(p), collection: (p) => collectionRef(p) });

  /* ---------------- user ---------------- */
  const user = Object.freeze({
    id: async () => uid, me: async () => ({ id: uid, name: "", email, isMe: true }),
    isOwner: () => true, canEdit: () => true, can: () => true,
    profiles: async (ids) => Object.fromEntries((ids || []).map((i) => [i, { id: i, name: i === uid ? "You" : "", isMe: i === uid }])),
    search: async () => []
  });

  /* ---------------- sample: Claude through /api/claude, after consent ---------------- */
  function consentGiven() { return lsGet(CONSENT_KEY) === "yes"; }
  function askConsent() {
    if (consentGiven()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const wrap = document.createElement("div"); wrap.className = "perl-gate"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "perl-ai-h");
      wrap.innerHTML = `<div class="perl-card"><h2 id="perl-ai-h">Send this to Claude?</h2>
        <p>To clean up a debrief, draft interview answers or answer a policy question, Charted sends the text involved to <b>Claude, an AI model made by Anthropic</b>, through this app's server. Anthropic processes it to write the reply.</p>
        <p>Before a debrief leaves your device, Charted scans it for names, ID numbers, dates and rooms and asks you to remove them. Your school's rules on patient information still apply.</p>
        <p class="perl-quiet">You can say no and keep using Charted: review debriefs yourself, and Ask falls back to keyword search. Change this later in Profile and settings.</p>
        <div class="perl-row"><button type="button" class="perl-btn" data-a="no">Not now</button><button type="button" class="perl-btn perl-primary" data-a="yes">Allow Claude</button></div></div>`;
      const back = document.activeElement;
      document.body.append(wrap); gateOpen(wrap);
      const done = (ok) => { if (ok) lsSet(CONSENT_KEY, "yes"); gateClose(wrap, back); resolve(ok); };
      wrap.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (b) done(b.dataset.a === "yes"); });
      wrap.querySelector('[data-a="yes"]').focus();
    });
  }
  const PROMPT_MAX = 400000;
  const CLAUDE_START_MS = Number(window.PERL_CLAUDE_START_MS) || 45000, CLAUDE_IDLE_MS = Number(window.PERL_CLAUDE_IDLE_MS) || 30000;
  async function callClaude(input, opts = {}) {
    if (!(await askConsent())) throw err("not_granted", "You chose not to send text to Claude.");
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : Array.isArray(input) ? input : null;
    if (!messages || !messages.length) throw err("invalid_argument", "Nothing to send");
    if (JSON.stringify(messages).length > PROMPT_MAX) throw err("prompt_too_large", "This is too long for one pass.");
    if (MEMORY) {
      const text = typeof window.PERL_FAKE_CLAUDE === "function" ? String(await window.PERL_FAKE_CLAUDE(messages, opts)) : "Test reply (APS-7).";
      if (opts.onText) opts.onText({ text, delta: text });
      return { text, truncated: false };
    }
    const { data: { session: s } } = await client.auth.getSession();
    if (!s) { expired(); throw err("session_expired", "Sign in again, then retry."); }
    /* a reply that hasn't started in 45 s, or stalls for 30 s, is given up on with a clear message instead of spinning forever */
    const ctl = new AbortController(); let timedOut = false; let watchdog = null;
    const arm = (ms) => { clearTimeout(watchdog); watchdog = setTimeout(() => { timedOut = true; ctl.abort(); }, ms); };
    if (opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener("abort", () => ctl.abort(), { once: true }); }
    const stopped = () => (timedOut ? err("timeout", "Claude took too long to answer.") : err("cancelled", "Cancelled"));
    let res;
    arm(CLAUDE_START_MS);
    try {
      res = await fetch(API.claude, { method: "POST", signal: ctl.signal, headers: { ...API.headers, "content-type": "application/json", authorization: "Bearer " + s.access_token }, body: JSON.stringify({ messages, tier: opts.modelTier || "default" }) });
    } catch (e) { clearTimeout(watchdog); if (e && e.name === "AbortError") throw stopped(); throw err("unavailable", "Couldn't reach the server."); }
    if (!res.ok || !res.body) {
      clearTimeout(watchdog); let j = {}; try { j = await res.json(); } catch { /* not JSON */ }
      const code = (j.error && j.error.code) || (res.status === 401 ? "session_expired" : res.status === 429 ? "rate_limited" : res.status === 413 ? "prompt_too_large" : "unavailable");
      if (code === "session_expired") expired();
      throw err(code, (j.error && j.error.message) || (code === "rate_limited" ? "Too many requests right now. Try again in a minute." : "Claude is unavailable right now."));
    }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", text = "", truncated = false;
    try {
      for (;;) {
        arm(CLAUDE_IDLE_MS);
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
          let m; try { m = JSON.parse(line); } catch { throw Object.assign(err("bad_reply", "Claude's reply came back broken."), { text }); }
          if (m.error) throw Object.assign(err(m.error.code || "unavailable", m.error.message || "Claude stopped."), { text });
          if (m.delta) { text += m.delta; if (opts.onText) { try { opts.onText({ text, delta: m.delta }); } catch (e) { console.error(e); } } }
          if (m.done) truncated = m.stop === "max_tokens";
        }
      }
    } catch (e) { if (e && e.name === "AbortError") throw Object.assign(stopped(), { text }); throw e; }
    finally { clearTimeout(watchdog); }
    return { text, truncated };
  }
  function parseJsonReply(t) {
    const s = String(t).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(s); } catch { /* fall through */ }
    const m = s.match(/[[{][\s\S]*[\]}]/); if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
    throw err("invalid_json", "The reply wasn't valid JSON.");
  }
  const sample = Object.assign((input, opts) => callClaude(input, opts), {
    json: async (input, opts = {}) => {
      const tail = "\n\nReply with only valid JSON: no prose, no code fences.";
      const msgs = typeof input === "string" ? input + tail : (input || []).map((m, i, a) => (i === a.length - 1 && m.role === "user" ? { ...m, content: m.content + tail } : m));
      return parseJsonReply((await callClaude(msgs, { ...opts, onText: undefined })).text);
    },
    limits: async () => ({ images: false, maxInputChars: PROMPT_MAX })
  });

  /* ---------------- downloads ---------------- */
  const downloads = Object.freeze({
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.ics$/.test(filename) ? "text/calendar" : /\.csv$/.test(filename) ? "text/csv" : /\.md$/.test(filename) ? "text/markdown" : "text/plain" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename || "download.txt";
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  });

  /* ---------------- the runtime the app already calls ---------------- */
  const NS = { db, user, sample, downloads };
  window.claude = Object.freeze({ use: async (name) => { if (!(name in NS)) return null; await ready; return NS[name]; } });

  /* account controls for Profile and settings: sign out, AI consent, delete account */
  window.PERL_ACCOUNT = Object.freeze({
    email: () => email,
    accessToken: () => (session && session.access_token) || "",
    aiAllowed: () => consentGiven(),
    setAiAllowed: (on) => lsSet(CONSENT_KEY, on ? "yes" : "no"),
    async signOut() {
      /* journal entries still queued for the account (perl.v1.debrief.outbox, flushed every 30 s) would go with the copies */
      let queued = 0; try { queued = (JSON.parse(lsGet("perl.v1.debrief.outbox") || "[]") || []).length; } catch { queued = 0; }
      if (queued && !confirm(`${queued} journal ${queued === 1 ? "entry hasn't" : "entries haven't"} reached your account yet (you may be offline). Sign out anyway and lose ${queued === 1 ? "it" : "them"}?`)) return;
      signingOut = true; forgetLocalCopy(); if (client) await client.auth.signOut(); forgetLocalCopy(); location.hash = ""; location.reload();
    },
    reauth: () => expired(true),
    /* set or change the password while signed in, so a used-up email link never locks anyone out again */
    async setPassword(pw) {
      if (typeof pw !== "string" || pw.length < 8) throw err("invalid_argument", "Use at least 8 characters.");
      if (MEMORY) return true;
      const { error } = await client.auth.updateUser({ password: pw });
      if (error) {
        const m = String(error.message || "");
        if (/different from the old/i.test(m)) return true;   /* already that password: nothing to change */
        if (/weak|pwned|leaked|characters/i.test(m)) throw err("invalid_argument", m);
        if (/session|jwt|auth/i.test(m)) throw err("session_expired", "Sign in again, then set your password.");
        throw err("unavailable", "Couldn't save the password. Try again.");
      }
      return true;
    },
    async deleteAccount() {
      if (MEMORY) { lsSet("perl.test.db", "{}"); location.reload(); return; }
      const { data: { session: s } } = await client.auth.getSession(); if (!s) throw err("session_expired", "Sign in again first.");
      const r = await fetch(API.deleteAccount, { method: "POST", headers: { ...API.headers, authorization: "Bearer " + s.access_token } });
      if (!r.ok) throw err("unavailable", "Couldn't delete your account. Try again.");
      try { localStorage.clear(); } catch { /* fine */ }
      await client.auth.signOut(); location.reload();
    }
  });

  /* This browser keeps copies while you're signed in: the plan (so Charted opens offline), and on the Debrief side the
     composer draft, browser-only entries, the MSPE draft and settings (perl.v1.debrief.*), plus the AI consent answer.
     All of it belongs to one account, so signing out removes all of it, and so does a different account signing in,
     even on a later visit (perl.v1.owner remembers whose copies these are). Appearance settings are kept. */
  const OWNER_KEY = "perl.v1.owner";
  const LOCAL_KEEP = new Set(["perl.v1.mode", "perl.v1.debrief.appearance", "perl.v1.keys"]);
  function forgetLocalCopy() {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith("perl.v1.") && !LOCAL_KEEP.has(k)) localStorage.removeItem(k); } catch { /* fine */ }
  }
  /* the sign-in ran out while Charted was open: ask to sign in again over the page, without reloading it, so nothing typed is lost */
  let gate = null, signingOut = false, reauthDismissed = false, lapsed = false;
  function expired(asked) {
    if (MEMORY || signingOut) return;
    lapsed = true;
    if (gate || (reauthDismissed && !asked)) return;
    gate = signInGate({ reauth: true });
  }
  /* ---------------- sign-in ---------------- */
  function signInGate(o = {}) {
    const wrap = document.createElement("div"); wrap.className = "perl-gate perl-solid"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "perl-in-h");
    wrap.innerHTML = `<form class="perl-card" novalidate>
      <h2 id="perl-in-h">${o.reauth ? "Sign in again" : "Sign in to Charted"}</h2>
      <p>${o.reauth ? "Your sign-in expired. Sign in again to keep saving to your account. Everything on the page stays as it is, including anything you were typing." : "Your plan and your journal are private to you. Sign in with your email and a password, or get a link by email."}</p>
      <label for="perl-email">Email</label><input id="perl-email" type="email" autocomplete="email" required>
      <label for="perl-pass">Password <span class="perl-quiet">(leave blank to get an email link instead)</span></label><input id="perl-pass" type="password" autocomplete="current-password" minlength="8">
      <div class="perl-code" hidden><label for="perl-code">Paste the link from the email (or a 6-digit code)</label><input id="perl-code" autocomplete="one-time-code" spellcheck="false" placeholder="https://… or 123456"></div>
      <p class="perl-msg" role="status" aria-live="polite"></p>
      <div class="perl-row">${o.reauth ? `<button type="button" class="perl-btn perl-later">Not now</button>` : ""}<button type="button" class="perl-btn perl-new" hidden>Create account</button><button type="submit" class="perl-btn perl-primary">Email me a sign-in link</button></div></form>`;
    document.body.append(wrap); gateOpen(wrap);
    if (o.reauth) {
      /* over the page, not instead of it: Not now (or Escape) goes back to exactly where you were */
      const back = document.activeElement;
      wrap.classList.remove("perl-solid"); wrap.querySelector("#perl-email").value = email || "";
      const later = () => { reauthDismissed = true; gateClose(wrap, back); if (gate === wrap) gate = null; };
      wrap.querySelector(".perl-later").addEventListener("click", later);
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); later(); } });
      wrap.perlBack = back;
    }
    const form = wrap.querySelector("form"), msg = wrap.querySelector(".perl-msg"), btn = wrap.querySelector(".perl-primary"), code = wrap.querySelector(".perl-code");
    const pass = wrap.querySelector("#perl-pass"), make = wrap.querySelector(".perl-new");
    let sent = false;
    /* with a password typed, the form signs in (or creates the account) with no email at all */
    pass.addEventListener("input", () => { const p = !!pass.value; btn.textContent = p || sent ? "Sign in" : "Email me a sign-in link"; make.hidden = !p; });
    const emailOk = () => { const em = wrap.querySelector("#perl-email").value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { msg.textContent = "Enter a valid email address."; return null; } return em; };
    make.addEventListener("click", async () => {
      const em = emailOk(); if (!em) return;
      if (pass.value.length < 8) { msg.textContent = "Use a password of at least 8 characters."; pass.focus(); return; }
      make.disabled = btn.disabled = true;
      const { data, error } = await client.auth.signUp({ email: em, password: pass.value, options: { emailRedirectTo: location.origin + location.pathname } });
      make.disabled = btn.disabled = false;
      if (error) { msg.textContent = /already|registered/i.test(error.message || "") ? "That email already has an account. Tap Sign in." : (error.message || "Couldn't create the account. Try again."); return; }
      if (!data || !data.session) msg.textContent = "Account created. Confirm it from the email Supabase sent, then come back and tap Sign in.";
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); const em = emailOk(); if (!em) return;
      btn.disabled = true;
      if (pass.value) { /* a password always signs in directly, even after a link was emailed */
        const { error } = await client.auth.signInWithPassword({ email: em, password: pass.value });
        btn.disabled = false;
        if (error) msg.textContent = /confirm/i.test(error.message || "") ? "Confirm your email first, then sign in." : "Wrong email or password. New here? Tap Create account.";
        return;
      }
      if (!sent) {
        const { error } = await client.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
        btn.disabled = false;
        if (error) { msg.textContent = error.message || "Couldn't send the email. Try again."; return; }
        sent = true; code.hidden = false; btn.textContent = "Sign in";
        msg.textContent = "Check your email and tap the link. Using the installed app? Long-press the link, copy it, and paste it here."; wrap.querySelector("#perl-code").focus(); return;
      }
      const v = wrap.querySelector("#perl-code").value.trim();
      const hash = linkToken(v);
      const { error } = hash ? await client.auth.verifyOtp({ token_hash: hash.token, type: hash.type })
        : /^\d{6,10}$/.test(v) ? await client.auth.verifyOtp({ email: em, token: v, type: "email" })
        : { error: { message: "bad input" } };
      btn.disabled = false;
      if (error) msg.textContent = "That link or code didn't work. Links work once and expire after an hour, and school or work email may use them up by scanning them. Try a personal email such as Gmail.";
    });
    (o.reauth ? pass : wrap.querySelector("#perl-email")).focus();
    return wrap;
  }
  /* the sign-in link: https://<project>.supabase.co/auth/v1/verify?token=<hash>&type=magiclink|signup&redirect_to=... */
  function linkToken(v) {
    try { const u = new URL(v); const t = u.searchParams.get("token") || u.searchParams.get("token_hash"); if (!t) return null;
      const ty = u.searchParams.get("type"); return { token: t, type: ty === "signup" ? "signup" : ty === "magiclink" ? "magiclink" : "email" }; }
    catch { return null; }
  }
  function useSession(s) {
    if (!s || !s.user) return false;
    /* someone else signed in (now, or since the last visit): drop the previous account's copies and start clean.
       debrief.js reads its draft at load, so a reload is the only way to be sure nothing of theirs is on screen. */
    const prevOwner = lsGet(OWNER_KEY);
    if ((uid && s.user.id !== uid) || (prevOwner && prevOwner !== s.user.id)) { forgetLocalCopy(); lsSet(OWNER_KEY, s.user.id); location.reload(); return false; }
    lsSet(OWNER_KEY, s.user.id);
    const back = !!uid && lapsed; session = s; uid = s.user.id; email = s.user.email || "";
    if (back) { lapsed = false; reauthDismissed = false; document.dispatchEvent(new CustomEvent("perl:reauthed")); } /* not on routine token refreshes */
    if (!backend) { backend = supabaseBackend(); backend.watch(notify); }
    readyResolve(); return true;
  }

  async function start() {
    if (MEMORY) { uid = "test-user"; email = "you@example.com"; backend = memoryBackend(); readyResolve(); return; }
    let cfg;
    for (const src of ["config.json", "/api/config"]) {
      try { const r = await fetch(src, { cache: "no-store" }); if (!r.ok) continue; const c = await r.json(); if (c.supabaseUrl && c.supabaseAnonKey) { cfg = c; break; } } catch { /* try the next source */ }
    }
    try { if (!cfg) throw new Error("missing"); }
    catch { document.body.insertAdjacentHTML("beforeend", `<div class="perl-gate perl-solid"><div class="perl-card"><h2>Charted isn't configured yet</h2><p>This copy is missing its Supabase settings: config.json, or SUPABASE_URL and SUPABASE_ANON_KEY on the server. See the setup steps in the README.</p></div></div>`); return; }
    if (cfg.functionsUrl) API = { claude: cfg.functionsUrl + "/claude", deleteAccount: cfg.functionsUrl + "/delete-account", headers: { apikey: cfg.supabaseAnonKey } };
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { flowType: "implicit", detectSessionInUrl: (url, params) => !String(params.state || "").startsWith("ms-") && !!(params.access_token || params.error || params.error_description || params.error_code), persistSession: true, autoRefreshToken: true } });
    client.auth.onAuthStateChange((ev, s) => {
      if (s && useSession(s)) { if (gate) { const back = gate.perlBack; gateClose(gate, back); gate = null; } if (/access_token=|[?&]code=/.test(location.hash + location.search)) history.replaceState(null, "", location.pathname + "#today"); }
      else if (!s && ev === "SIGNED_OUT" && uid && !signingOut) expired();  /* the session couldn't be refreshed */
    });
    const { data: { session: s } } = await client.auth.getSession();
    if (!useSession(s)) {
      gate = signInGate();
      /* a used or expired link comes back as #error=...&error_code=otp_expired. School email systems (Outlook Safe Links,
         Proofpoint) often open every link the moment it arrives, which uses it up before the student taps it. */
      const h = new URLSearchParams(location.hash.slice(1));
      if (h.get("error_code") || h.get("error")) {
        gate.querySelector(".perl-msg").textContent = "That sign-in link was already used or expired. School and work email often opens links automatically to scan them, which uses them up. Sign in with a personal email such as Gmail instead.";
        history.replaceState(null, "", location.pathname);
      }
    }
  }
  start();
})();
