/* Offline shell for Charted: network first, the last good copy when offline.
   Only the app's own code and static files are cached. Nothing from /api/ and nothing from Supabase (your data) is stored here. */
const CACHE = "perl-3e85817cb2ef";
const SHELL = ["./", "boot.js", "shim.js", "shim.css", "vendor/supabase.js", "app/styles.css", "app/data.js", "app/audit.js", "app/sched.js", "app/store.js", "app/app.js", "app/habits.js", "app/career.js", "app/connect.js", "app/fmcc.js", "app/projects.js", "app/hosts.js", "app/debrief.js", "manifest.webmanifest", "config.json", "favicon.svg", "icon-192.png", "icon-512.png", "vendor/pdf.worker.min.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("perl-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  /* no-cache: always ask the server whether there's something newer (a cheap revalidation), so an update shows on the next open
     instead of after GitHub Pages' 10-minute browser cache runs out */
  e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok && res.type === "basic" && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : undefined))));
});
