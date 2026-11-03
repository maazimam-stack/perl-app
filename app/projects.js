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
const U = () => { const ui = A.ui; if (!ui.proj) ui.proj = { open: null, del: null, err: "", impOpen: null, imp: null }; return ui.proj; };
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

/* ---------------- import: a deck or doc fills the template ----------------
   A .pptx, .pdf, .docx, .txt or .md (or pasted text) is read here in the browser. With Claude allowed, Claude maps it onto
   the template's sections, team, mentors and dated milestones; without it, slide headings are matched to sections.
   Nothing is uploaded except the extracted text sent to Claude, and only when Claude is allowed. */
const MAX_FILE = 60e6, MAX_TEXT = 60000;
/* a minimal zip reader (pptx and docx are zip files): the central directory, then each wanted entry, inflated with the
   browser's own DecompressionStream. No library. */
async function unzip(buf, want) {
  const dv = new DataView(buf); const u8 = new Uint8Array(buf); let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip");
  const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true); const out = {}; const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
    const nl = dv.getUint16(off + 28, true), xl = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
    const name = dec.decode(u8.subarray(off + 46, off + 46 + nl)); off += 46 + nl + xl + cl;
    if (!want(name)) continue;
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true); const raw = u8.subarray(start, start + csize);
    if (method === 0) out[name] = dec.decode(raw);
    else if (method === 8 && typeof DecompressionStream === "function") out[name] = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }
  return out;
}
const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(Number(c))).replace(/&amp;/g, "&");
const paras = (xml, p, t) => (xml.match(new RegExp(`<${p}[ >][\\s\\S]*?</${p}>`, "g")) || []).map((x) => unxml((x.match(new RegExp(`<${t}(?: [^>]*)?>([\\s\\S]*?)</${t}>`, "g")) || []).map((y) => y.replace(/<[^>]+>/g, "")).join(""))).map((x) => x.trim()).filter(Boolean);
async function fileText(file) {
  const name = file.name.toLowerCase(); const buf = await file.arrayBuffer();
  if (/\.pptx$/.test(name)) {
    const z = await unzip(buf, (n) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(n));
    const num = (n) => Number((n.match(/(\d+)\.xml$/) || [])[1] || 0);
    const slides = Object.keys(z).filter((n) => n.includes("/slides/")).sort((a, b) => num(a) - num(b));
    if (!slides.length) throw new Error("No slides found in that file.");
    return slides.map((n, i) => { const body = paras(z[n], "a:p", "a:t"); const note = z[`ppt/notesSlides/notesSlide${num(n)}.xml`]; const nt = note ? paras(note, "a:p", "a:t").filter((x) => !/^\d+$/.test(x)) : [];
      return `--- Slide ${i + 1}\n${body.join("\n")}${nt.length ? `\nSpeaker notes: ${nt.join(" ")}` : ""}`; }).join("\n\n");
  }
  if (/\.docx$/.test(name)) {
    const z = await unzip(buf, (n) => n === "word/document.xml"); const x = z["word/document.xml"]; if (!x) throw new Error("That Word file is empty.");
    /* a heading paragraph starts a new block, like a slide */
    let k = 0; return (x.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map((pp) => { const t = paras(pp, "w:p", "w:t").join(""); if (!t) return ""; return /<w:pStyle w:val="(?:Heading|Title)/i.test(pp) ? `\n--- Slide ${++k}\n${t}` : t; }).filter(Boolean).join("\n");
  }
  if (/\.pdf$/.test(name)) return (await A.pdfText(buf, "\n--- Slide #\n")).replace(/^[ \t]*[•▪●◦‣–][ \t]*/gm, "");
  if (/\.(txt|md|markdown)$/.test(name) || /^text\//.test(file.type)) return new TextDecoder().decode(buf);
  throw new Error("Charted reads PowerPoint (.pptx), PDF, Word (.docx), or text files. For Keynote or Google Slides, export as PowerPoint or PDF first.");
}
/* which template section a heading belongs to */
const HEADS = [
  ["problem", /problem|issue|gap|pain|background|current state|what'?s wrong|need/i],
  ["evidence", /why it matters|evidence|data|impact|burden|scope|magnitude|significance|findings|observ/i],
  ["people", /stakeholder|team|site|who|partners?|users?|workflow/i],
  ["change", /solution|propos|intervention|design|approach|fix|idea|prototype|plan\b/i],
  ["measure", /measure|metric|outcome|success|evaluat|kpi|target|baseline/i],
  ["next", /next step|timeline|roadmap|ask|milestone|plan for|going forward/i]
];
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const DATE_RE = /\b(?:by|on|due|before)?\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?|(\d{4})-(\d{2})-(\d{2}))\b/i;
/* "Meet PICU director by Nov 20, 2026" -> { label: "Meet PICU director", date: "2026-11-20" } */
function datedLine(l) {
  const m = l.match(DATE_RE); if (!m) return null; const t = A.today(); let d = null;
  if (m[1]) { d = new Date(m[3] ? Number(m[3]) : t.getFullYear(), MONTHS[m[1].toLowerCase()], Number(m[2])); if (!m[3] && d < t) d.setFullYear(d.getFullYear() + 1); }
  else if (m[4]) { let y = m[6] ? Number(m[6]) : t.getFullYear(); if (y < 100) y += 2000; d = new Date(y, Number(m[4]) - 1, Number(m[5])); if (!m[6] && d < t) d.setFullYear(d.getFullYear() + 1); }
  else d = new Date(Number(m[7]), Number(m[8]) - 1, Number(m[9]));
  if (!d || isNaN(d)) return null;
  const label = l.replace(m[0], " ").replace(/\s*[(\-–:,]\s*$/, "").replace(/\s{2,}/g, " ").trim().slice(0, 80);
  return label ? { label, date: iso(d) } : null;
}
const ROLE_RE = /^([\w .'-]*?(?:mentor|partner|advisor|adviser|preceptor|attending|faculty|supervisor|pi))s?\s*[:\-–]\s*(.+)$/i;
function heuristic(text) {
  const out = { title: "", sections: {}, team: "", mentor: "", milestones: [], notes: "" };
  const marked = /--- Slide \d+/.test(text);
  const blocks = marked ? text.split(/\n?--- Slide \d+\n?/).filter((b) => b.trim()) : text.split(/\n\s*\n/);
  const left = []; const mentors = [];
  blocks.forEach((b, i) => {
    const lines = b.split("\n").map((x) => x.replace(/^[•▪●◦‣]\s*/, "").trim()).filter(Boolean).filter((x) => !/^speaker notes:/i.test(x))
      .reduce((a, l) => { if (a.length > 1 && /^[a-z(]/.test(l)) a[a.length - 1] += " " + l; else a.push(l); return a; }, []); if (!lines.length) return;
    for (const l of lines) { const r = l.match(ROLE_RE); if (r) mentors.push(`${r[2].trim()} (${r[1].trim().toLowerCase()})`); }
    if (i === 0) {   /* the title slide: title, then who */
      let k = 1; out.title = lines[0];
      while (k < lines.length && /^[a-z]/.test(lines[k])) out.title += " " + lines[k++];   /* a title wrapped across lines in a PDF */
      out.title = out.title.slice(0, 120);
      const who = lines.slice(k).find((l) => !ROLE_RE.test(l)); if (who) out.team = who.split(/\s[·|•]\s|,\s*M[1-4]\b/)[0].trim().slice(0, 300);
      return;
    }
    const hit = HEADS.find(([, re]) => re.test(lines[0]));
    const body = lines.slice(1).filter((l) => !ROLE_RE.test(l));
    if (hit && body.length) {
      out.sections[hit[0]] = ((out.sections[hit[0]] ? out.sections[hit[0]] + "\n" : "") + body.join("\n")).slice(0, 4000);
      if (hit[0] === "next") for (const l of body) { const d = datedLine(l); if (d) out.milestones.push(d); }
    } else left.push(lines.join("\n"));
  });
  if (out.sections.next && out.milestones.length) out.sections.next = out.milestones[0].label;
  out.mentor = [...new Set(mentors)].join("; ").slice(0, 300);
  out.notes = left.join("\n\n").slice(0, 8000);
  return out;
}
function prompt(text, fileName) {
  return ["You are filling in a medical student's project record from their own slide deck or document. Map the content onto the fields below. Use the student's words where you can; tighten, don't invent. Leave a field empty if the source doesn't cover it. Never add patient identifiers.",
    `Today is ${iso(A.today())}. Resolve any dates in the source to YYYY-MM-DD (assume the nearest future date when a year is missing). Only include milestones that have a date or a clear deadline in the source.`, "",
    "JSON shape:",
    '{"title": string (short, at most 10 words), "idea": boolean (true if this is an IDEA course project or a quality-improvement/innovation project in a clinical setting),',
    ' "status": "idea" | "active" | "paused" | "done", "team": string (students working on it), "mentor": string (faculty, clinical and engineering mentors with roles),',
    ' "problem": string, "evidence": string (why it matters: data, observations, burden), "people": string (stakeholders, owners, site/system),',
    ' "change": string (proposed change or design), "measure": string (measure, baseline, target), "next": string (the next step),',
    ' "summary": string (2-3 sentences, for a non-IDEA project), "milestones": [{"label": string (at most 8 words), "date": "YYYY-MM-DD"}], "notes": string (anything useful that fits nowhere else, briefly)}', "",
    `Source (${fileName || "pasted text"}):`, "<<<", text.slice(0, MAX_TEXT), ">>>"].join("\n");
}
async function claudeMap(text, fileName) {
  if (!(window.PERL_ACCOUNT && window.PERL_ACCOUNT.aiAllowed && window.PERL_ACCOUNT.aiAllowed())) return null;
  const c = window.claude; if (!c || typeof c.use !== "function") return null;
  const s = await c.use("sample"); if (!s || typeof s.json !== "function") return null;
  const o = await s.json(prompt(text, fileName), { modelTier: "quick" });
  if (!o || typeof o !== "object") return null;
  const str = (v, n) => String(v ?? "").trim().slice(0, n || 4000);
  const ms = (Array.isArray(o.milestones) ? o.milestones : []).map((m) => ({ label: str(m && m.label, 80), date: A.parseD(m && m.date) ? str(m.date, 10) : "" })).filter((m) => m.label).slice(0, 20);
  return { title: str(o.title, 120), idea: o.idea !== false, status: STATUS[o.status] ? o.status : "", team: str(o.team, 300), mentor: str(o.mentor, 300),
    sections: { problem: str(o.problem), evidence: str(o.evidence), people: str(o.people), change: str(o.change), measure: str(o.measure), next: str(o.next), summary: str(o.summary) },
    milestones: ms, notes: str(o.notes, 8000), ai: true };
}
/* fill a project from what was read: empty fields only, unless it's a new project; nothing typed by hand is overwritten */
function apply(p, m, src) {
  const put = (k, v) => { if (v && !String(p[k] || "").trim()) p[k] = v; };
  put("title", m.title); put("team", m.team); put("mentor", m.mentor);
  if (m.status && p.status === (p.kind === "idea" ? "active" : "idea")) p.status = m.status;
  p.sections = p.sections || {}; let filled = 0;
  for (const [k] of sectionsFor(p)) { const v = (m.sections || {})[k] || (k === "summary" ? (m.sections || {}).problem : ""); if (v && !String(p.sections[k] || "").trim()) { p.sections[k] = v; filled++; } }
  const have = new Set((p.milestones || []).map((x) => (x.label || "").toLowerCase()));
  const add = (m.milestones || []).filter((x) => !have.has(x.label.toLowerCase())).map((x) => ({ id: uid("m"), label: x.label, date: x.date, done: false }));
  p.milestones = (p.milestones || []).concat(add);
  if (m.notes) p.notes = (p.notes ? p.notes + "\n\n" : "") + (m.ai ? "" : `From ${src}:\n`) + m.notes;
  p.source = { file: src, at: Date.now(), ai: !!m.ai };
  touch(p); return { filled, ms: add.length };
}
async function runImport(text, src, intoId) {
  const u = U(); u.imp = { busy: true, err: "" }; A.render();
  try {
    text = String(text || "").replace(/\u0000/g, "").trim();
    if (text.length < 20) throw new Error("Couldn't find any text in that. If it's a deck of images, export it as PDF with text, or paste the text.");
    let m = null; try { m = await claudeMap(text, src); } catch { m = null; }
    if (!m) m = heuristic(text);
    const d = ensure(); let p = intoId ? byId(intoId) : null;
    if (!p) { p = { id: uid("p"), title: "", kind: m.idea === false ? "project" : "idea", status: m.idea === false ? "idea" : "active", team: "", mentor: "", sections: {}, milestones: [], notes: "", created: Date.now(), updated: Date.now() }; d.items.unshift(p); }
    const r = apply(p, m, src); u.open = p.id; u.imp = null; save();
    rerender(`#pj-h-${p.id}`);
    document.getElementById(`pj-h-${p.id}`)?.scrollIntoView({ block: "start" });
    A.toast(`Filled ${r.filled} ${r.filled === 1 ? "section" : "sections"}${r.ms ? ` and ${r.ms} ${r.ms === 1 ? "milestone" : "milestones"}` : ""} from ${src}${m.ai ? "" : " (matched by slide headings; allow Claude in Profile for a closer read)"}. Look it over; edits save as you type.`);
  } catch (e) { u.imp = { busy: false, err: (e && e.message) || "Couldn't read that file.", paste: u.imp && u.imp.paste }; rerender("#pj-imp-file"); }
}
function importPanel(intoId) {
  const u = U(); const s = u.imp || {}; const ai = !!(window.PERL_ACCOUNT && window.PERL_ACCOUNT.aiAllowed && window.PERL_ACCOUNT.aiAllowed());
  return `<section class="panel pj-imp" aria-labelledby="pj-imp-h"${intoId ? ` data-into="${esc(intoId)}"` : ""}>
    <div class="panel-head"><h2 id="pj-imp-h">${intoId ? "Fill this project from a file" : "Import a project"}</h2><button class="btn quiet small" data-act="pj-imp-x">Cancel</button></div>
    <p class="hint">Drop in your deck, proposal or notes: PowerPoint (.pptx), PDF, Word (.docx) or text. Charted fills the problem, evidence, stakeholders, change, measure, next step, team, mentors and dated milestones${intoId ? ", only where they're still empty" : ""}. ${ai ? "Claude reads the text to place it." : "It matches slide headings to sections; allow Claude in Profile and settings for a closer read."} Exported from Claude Slides? Use Download › PowerPoint or PDF.</p>
    <label class="pj-drop${s.busy ? " is-busy" : ""}" for="pj-imp-file" id="pj-drop"><input type="file" id="pj-imp-file" class="sr" accept=".pptx,.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" ${s.busy ? "disabled" : ""}${intoId ? ` data-into="${esc(intoId)}"` : ""}>
      <b>${s.busy ? "Reading…" : "Choose a file"}</b><span>${s.busy ? "This takes a few seconds." : "or drop it here"}</span></label>
    <details class="pj-paste"${s.paste ? " open" : ""}><summary>Or paste the text</summary>
      <label class="sr" for="pj-imp-text">Project text</label><textarea id="pj-imp-text" rows="6" placeholder="Paste slide text, a proposal or notes"></textarea>
      <button class="btn small" data-act="pj-imp-paste"${intoId ? ` data-into="${esc(intoId)}"` : ""} ${s.busy ? "disabled" : ""}>Fill from this text</button></details>
    ${s.err ? `<p class="err" role="alert">${esc(s.err)}</p>` : ""}
  </section>`;
}
async function importFile(file, intoId) {
  if (!file) return;
  if (file.size > MAX_FILE) { U().imp = { err: "That file is over 60 MB. Export it without videos, or as PDF." }; rerender("#pj-imp-file"); return; }
  const u = U(); u.imp = { busy: true, err: "" }; A.render();
  let text = "";
  try { text = await fileText(file); } catch (e) { u.imp = { busy: false, err: e && e.message && !/zip/.test(e.message) ? e.message : "Couldn't open that file. Try exporting it again as .pptx or PDF." }; rerender("#pj-imp-file"); return; }
  runImport(text, file.name.slice(0, 120), intoId);
}

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
    ${u.impOpen === p.id ? importPanel(p.id) : `<p class="pj-src">${p.source ? `Filled from <b>${esc(p.source.file)}</b>${p.source.ai ? " by Claude" : ""}, ${esc(A.fmtShort(new Date(p.source.at)))}. ` : ""}<button class="link" data-act="pj-imp" data-id="${id}" id="pj-imp-${id}">${p.source ? "Fill from another file" : "Fill from a deck or doc"}</button></p>`}
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
    <div class="title-actions"><button class="btn small primary" data-act="pj-imp" id="pj-imp">Import from a deck</button><button class="btn small" data-act="pj-new" data-kind="idea" id="pj-new-idea">New IDEA project</button><button class="btn small" data-act="pj-new" data-kind="project" id="pj-new-project">New project</button></div></div>
  ${U().impOpen === "new" ? importPanel("") : ""}
  <section class="panel pj" aria-label="Projects">
    ${items.length ? `<ul class="pj-list">${items.map(row).join("")}</ul>` : `<div class="empty"><b>No projects yet.</b> Import your deck and Charted fills the IDEA template for you, or start one from scratch.</div>`}
  </section>`;
}

/* ---------------- events ---------------- */
function create(kind) {
  const d = ensure(); const p = { id: uid("p"), title: "", kind, status: kind === "idea" ? "active" : "idea", team: "", mentor: "", sections: {}, milestones: [], notes: "", created: Date.now(), updated: Date.now() };
  d.items.unshift(p); U().open = p.id; U().err = ""; save(); rerender(`#pj-title-${p.id}`);
}
const acts = {
  "pj-imp": (el) => { const u = U(); u.impOpen = el.dataset.id || "new"; u.imp = null; if (el.dataset.id) u.open = el.dataset.id; rerender("#pj-imp-h"); },
  "pj-imp-x": () => { const u = U(); const back = u.impOpen && u.impOpen !== "new" ? `#pj-imp-${u.impOpen}` : "#pj-imp"; u.impOpen = null; u.imp = null; rerender(back); },
  "pj-imp-paste": (el) => { const t = document.getElementById("pj-imp-text"); const u = U(); const into = el.dataset.into || ""; u.impOpen = null; runImport(t ? t.value : "", "pasted text", into); },
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
    if (t.id === "pj-imp-file") { const f = t.files && t.files[0]; const into = t.dataset.into || ""; t.value = ""; U().impOpen = null; importFile(f, into); return true; }
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
/* drag a file onto the drop area */
document.addEventListener("dragover", (ev) => { const z = ev.target.closest && ev.target.closest("#pj-drop"); if (z) { ev.preventDefault(); z.classList.add("is-over"); } });
document.addEventListener("dragleave", (ev) => { const z = ev.target.closest && ev.target.closest("#pj-drop"); if (z) z.classList.remove("is-over"); });
document.addEventListener("drop", (ev) => {
  const z = ev.target.closest && ev.target.closest("#pj-drop"); if (!z) return; ev.preventDefault();
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; const inp = document.getElementById("pj-imp-file");
  const into = (inp && inp.dataset.into) || ""; U().impOpen = null; importFile(f, into);
});
})();
