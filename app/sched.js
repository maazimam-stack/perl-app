/* Policy Navigator: reads clerkship spreadsheets in the browser. Nothing is uploaded and no library is used.
   SHEETS.read(file)            -> [{ name, grid, merges }] from .xlsx (zip + XML) or .csv
   SHEETS.tracks(grid, merges)  -> { blocks, tracks } from the school's track schedule, or null
   SHEETS.days(grid)            -> { people: [{ name, days }], from, to } from a clerkship's weekly schedule, or null
   Only the person the student picks is kept by the app; this file never stores anything. */
const SHEETS = (() => {
  "use strict";
  const td = new TextDecoder();

  /* ---------- zip ---------- */
  async function inflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open .xlsx files. Save the sheet as .csv and drop that in instead.");
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(buf, want) {
    const dv = new DataView(buf); const u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("That file isn't a spreadsheet Excel can save (.xlsx).");
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const out = {};
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + elen + clen;
      if (!want(name)) continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = u8.subarray(start, start + csize);
      if (method !== 0 && method !== 8) throw new Error("This spreadsheet uses a compression this reader doesn't support. Save it as .csv instead.");
      out[name] = td.decode(method === 0 ? data : await inflateRaw(data));
    }
    return out;
  }

  /* ---------- xlsx ---------- */
  const colIdx = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const ref = (a1) => { const m = /^([A-Z]+)(\d+)$/.exec(a1 || ""); return m ? { c: colIdx(m[1]), r: +m[2] - 1 } : null; };
  const kids = (el, tag) => Array.from(el.getElementsByTagName(tag));
  async function readXlsx(buf) {
    const files = await unzip(buf, (n) => /^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/.test(n));
    const dp = new DOMParser(); const xml = (s) => dp.parseFromString(s, "application/xml");
    const shared = files["xl/sharedStrings.xml"] ? kids(xml(files["xl/sharedStrings.xml"]), "si").map((si) => kids(si, "t").filter((t) => t.parentNode.nodeName !== "rPh").map((t) => t.textContent).join("")) : [];
    let order = [];
    if (files["xl/workbook.xml"] && files["xl/_rels/workbook.xml.rels"]) {
      const rels = Object.fromEntries(kids(xml(files["xl/_rels/workbook.xml.rels"]), "Relationship").map((r) => [r.getAttribute("Id"), r.getAttribute("Target")]));
      order = kids(xml(files["xl/workbook.xml"]), "sheet").map((s) => {
        const t = rels[s.getAttribute("r:id")] || ""; return { name: s.getAttribute("name") || "", path: "xl/" + t.replace(/^\/?xl\//, "").replace(/^\//, ""), hidden: s.getAttribute("state") === "hidden" };
      }).filter((s) => files[s.path] && !s.hidden);
    }
    if (!order.length) order = Object.keys(files).filter((n) => /^xl\/worksheets\//.test(n)).sort().map((path, i) => ({ name: `Sheet${i + 1}`, path }));
    return order.map(({ name, path }) => {
      const doc = xml(files[path]); const grid = [];
      for (const c of kids(doc, "c")) {
        const at = ref(c.getAttribute("r")); if (!at) continue;
        const t = c.getAttribute("t"); const v = kids(c, "v")[0]; let val = "";
        if (t === "s") val = v ? shared[+v.textContent] || "" : "";
        else if (t === "inlineStr") val = kids(c, "t").map((x) => x.textContent).join("");
        else if (v) val = v.textContent;
        (grid[at.r] = grid[at.r] || [])[at.c] = String(val).trim();
      }
      for (let i = 0; i < grid.length; i++) grid[i] = Array.from(grid[i] || [], (x) => x || "");
      const merges = kids(doc, "mergeCell").map((m) => { const [a, b] = (m.getAttribute("ref") || "").split(":").map(ref); return a && b ? { r0: a.r, c0: a.c, r1: b.r, c1: b.c } : null; }).filter(Boolean);
      return { name, grid, merges };
    });
  }

  /* ---------- csv ---------- */
  function parseCsv(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; continue; }
      if (ch === '"') q = true; else if (ch === ",") { row.push(cur.trim()); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows;
  }

  async function read(file) {
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") return [{ name: file.name, grid: parseCsv(await file.text()), merges: [] }];
    if (/\.xls$/i.test(file.name)) throw new Error("That's the old Excel format (.xls). Open it in Excel and save as .xlsx or .csv.");
    return readXlsx(await file.arrayBuffer());
  }

  /* ---------- shared helpers ---------- */
  const NAMES = [[/ob\s*\/?\s*gyn|obstet/i, "Obstetrics and Gynecology"], [/psych/i, "Psychiatry"], [/neuro/i, "Neurology"], [/peds|pediat/i, "Pediatrics"], [/surg/i, "Surgery"], [/family/i, "Family Medicine"], [/^(internal\s+)?med(icine)?$|^im$|internal\s*med/i, "Internal Medicine"], [/elective/i, "Elective"]];
  function canon(v) { const s = String(v || "").replace(/\s+/g, " ").trim(); for (const [rx, n] of NAMES) if (rx.test(s)) return n; return s; }
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => { y = +y; if (y < 100) y += 2000; return `${y}-${pad(m)}-${pad(d)}`; };
  function toIso(v) {
    const s = String(v || "").trim(); if (!s) return null;
    if (/^\d{5}(\.\d+)?$/.test(s)) { const n = Math.floor(+s); if (n > 30000 && n < 70000) { const d = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); } }
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); if (m) return iso(m[1], m[2], m[3]);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); if (m) return iso(m[3], m[1], m[2]);
    return null;
  }

  /* ---------- the school's track schedule ---------- */
  const RANGE = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
  function tracks(grid, merges) {
    const cell = (r, c) => (grid[r] && grid[r][c]) || "";
    const hdr = grid.findIndex((r) => (r || []).filter((c) => /^block\s*\w+/i.test(c || "")).length >= 4);
    if (hdr < 0) return null;
    const cols = grid[hdr].map((c, j) => (/^block\s*\w+/i.test(c || "") ? j : -1)).filter((j) => j >= 0);
    let drow = -1; for (let i = hdr + 1; i < Math.min(grid.length, hdr + 4); i++) if (cols.filter((j) => RANGE.test(cell(i, j))).length >= 4) { drow = i; break; }
    if (drow < 0) return null;
    const blocks = cols.map((j) => { const m = RANGE.exec(cell(drow, j)); return m ? { k: cell(hdr, j).replace(/^block\s*/i, ""), a: iso(m[3], m[1], m[2]), b: iso(m[6], m[4], m[5]), col: j } : null; }).filter(Boolean);
    const out = {};
    grid.forEach((r, i) => {
      const m = /^track\s*([0-9]+[a-z]?)/i.exec(cell(i, 0)); if (!m) return;
      const seq = [];
      blocks.forEach((b, bi) => {
        const v = cell(i, b.col);
        if (!v) { if (seq.length && seq[seq.length - 1].last === bi - 1) seq[seq.length - 1].last = bi; return; }
        let last = bi;
        for (const g of merges) if (g.r0 <= i && i <= g.r1 && g.c0 <= b.col && b.col <= g.c1) last = Math.max(...blocks.map((bb, k) => (bb.col <= g.c1 ? k : -1)));
        if (seq.length && bi <= seq[seq.length - 1].last) return;
        seq.push({ n: canon(v), first: bi, last });
      });
      out[m[1].toUpperCase()] = seq.map((s) => ({ n: s.n, a: blocks[s.first].a, b: blocks[s.last].b, blocks: blocks[s.first].k + (s.first === s.last ? "" : "–" + blocks[s.last].k) }));
    });
    if (Object.keys(out).length < 2) return null;
    return { blocks: blocks.map(({ k, a, b }) => ({ k, a, b })), tracks: out };
  }

  /* ---------- a clerkship's weekly schedule ---------- */
  const LABEL = /^(clinic\s*night:?|mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?|week\s*\d+|name|student|am|pm)$/i;
  const TIME = /^((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:am|pm))(?![a-z])\s*(.*)$/i;
  function kindOf(e) {
    const t = e.title;
    if (/\bexam\b|\bnbme\b|\bosce\b/i.test(t)) return "exam";
    if (/\bdue\b/i.test(t)) return "due";
    if (/\bcall\b/i.test(t)) return "call";
    if (/reading day|day off|holiday|no clinic|\boff\b/i.test(t)) return "off";
    if (/didactic|grand rounds|journal club|clinical case|conference|lecture|shelf prep|teaching|\bcase\b/i.test(t)) return "teaching";
    if (/check.?in|mid-clerkship|meeting|retreat|orientation|\bidea\b/i.test(t)) return "meeting";
    return "clinical";
  }
  function dayEvents(lines) {
    const out = [];
    for (const raw of lines) {
      const ln = raw.replace(/\s+/g, " ").trim(); if (!ln) continue;
      const m = TIME.exec(ln);
      if (m) { const time = m[1].replace(/\s+/g, "").replace(/^(am|pm)$/i, (x) => x.toUpperCase()); out.push({ time, title: m[2].trim(), details: [] }); continue; }
      const last = out[out.length - 1];
      if (last && !last.title) { last.title = ln; continue; }
      if (last && !/^(reading day|day off|holiday|no clinic)/i.test(ln)) { last.details.push(ln); continue; }
      out.push({ time: "", title: ln, details: [] });
    }
    return out.filter((e) => e.title || e.details.length).map((e) => ({ ...e, title: e.title || e.details.shift() || "", kind: kindOf(e) }));
  }
  function days(grid) {
    const cell = (r, c) => (grid[r] && grid[r][c]) || "";
    const weeks = []; grid.forEach((r, i) => { if (/^\s*week\s*\d+/i.test(cell(i, 0))) weeks.push(i); });
    if (!weeks.length) return null;
    const people = new Map(); let from = null, to = null;
    weeks.forEach((w, wi) => {
      const end = wi + 1 < weeks.length ? weeks[wi + 1] : grid.length;
      let dr = -1, dates = [];
      for (let i = w; i < Math.min(end, w + 3); i++) { const ds = [1, 2, 3, 4, 5, 6, 7].map((j) => toIso(cell(i, j))); if (ds.filter(Boolean).length >= 3) { dr = i; dates = ds; break; } }
      if (dr < 0) return;
      const starts = [];
      for (let i = dr + 1; i < end; i++) {
        const a = cell(i, 0); if (!a || LABEL.test(a)) continue;
        const b = cell(i + 1, 0); const two = !!(b && !LABEL.test(b) && i + 1 < end);
        starts.push({ i, name: (two ? `${a} ${b}` : a).replace(/\s+/g, " ").trim() }); if (two) i++;
      }
      starts.forEach((s, k) => {
        const stop = k + 1 < starts.length ? starts[k + 1].i : end;
        if (!people.has(s.name)) people.set(s.name, {});
        const pd = people.get(s.name);
        dates.forEach((d, j) => {
          if (!d) return;
          if (!from || d < from) from = d; if (!to || d > to) to = d;
          const lines = []; for (let i = s.i; i < stop; i++) { const v = cell(i, j + 1); if (v) lines.push(...v.split(/\n+/)); }
          const evs = dayEvents(lines); if (evs.length) pd[d] = (pd[d] || []).concat(evs);
        });
      });
    });
    if (!people.size) return null;
    return { people: [...people].map(([name, d]) => ({ name, days: d })), from, to };
  }
  function fromFilename(name) {
    const base = String(name || "").replace(/\.[a-z0-9]+$/i, "");
    const blk = /(?:^|[_\s-])([1-9][AB])(?=[_\s-]|$)/i.exec(base);
    const words = base.split(/[_\s-]+/); let clerk = "";
    for (const w of words) if (NAMES.some(([rx]) => rx.test(w))) { clerk = canon(w); break; }
    return { block: blk ? blk[1].toUpperCase() : "", clerkship: clerk };
  }
  return { read, parseCsv, tracks, days, dayEvents, canon, fromFilename, toIso };
})();
