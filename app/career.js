/* Career: reads the student's resume (in this browser) into what makes them distinctive, the people and organisations
   in it, and how both connect to the specialties they're weighing. The resume text is sent to Claude only when the
   student taps Analyze; the quick read runs here. Results live in state.career (School-side document); the resume
   itself is never saved. Nothing is ever sent to a contact: outreach notes are drafts to copy. */
(() => {
"use strict";
const A = window.PERL_APP;
if (!A || !window.PERL_MODULES) return;
const esc = A.esc;
const $ = (s, el = document) => el.querySelector(s);
const st = () => A.state;
const C = () => st().career;
const U = () => (A.ui.career = A.ui.career || { text: "", fileName: "", busy: "", progress: "", error: "", note: "", importOpen: false, edit: null, draft: null, reset: false });
const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clip = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const arr = (x) => (Array.isArray(x) ? x : []);
function ensure() {
  const s = st();
  if (!s.career || typeof s.career !== "object") s.career = { v: 1, profile: null, network: [], removed: [], spec: "", file: "", importedAt: 0 };
  const c = s.career; c.network = arr(c.network); c.removed = arr(c.removed);
  return c;
}
function save(msg) { A.persist(); A.render(); if (msg) A.toast(msg); }

/* ================= specialties ================= */
/* nm: how the specialty is named; kw: resume words that point to it; rot: rotation names that cover it; via: parent rotation */
const SPECS = [
  { n: "Anesthesiology", nm: /anesthe/i, kw: /anesthe|perioperative|critical care|intensive care|\bICU\b|airway|pain medicine/i, rot: /anesth/i },
  { n: "Cardiology", nm: /cardiolog|cardiovascular|heart/i, kw: /cardi|heart|echocardio|\bECG\b|\bEKG\b|arrhythm|atrial|coronary|atheroscler|hypertension|lipid|vascular/i, rot: /cardio/i, via: "Internal Medicine" },
  { n: "Dermatology", nm: /dermat/i, kw: /dermat|skin|melanoma|psoriasis|eczema/i, rot: /derm/i },
  { n: "Emergency Medicine", nm: /emergency/i, kw: /emergency|\bEMT\b|paramedic|trauma|urgent care|resuscitat|wilderness/i, rot: /emergenc|\bEM\b/i },
  { n: "Family Medicine", nm: /family|primary care/i, kw: /family medicine|primary care|community health|rural|underserved|free clinic|preventive/i, rot: /family|primary care|ambulatory/i },
  { n: "General Surgery", nm: /general surg|^surgery$|^surg/i, kw: /surg|operating room|\bOR\b|laparoscop/i, rot: /surg/i },
  { n: "Internal Medicine", nm: /internal medicine|^medicine$|^IM$/i, kw: /internal medicine|hospital medicine|hospitalist|diabetes|infectious disease|nephrolog|gastroenterolog|pulmonar|oncolog|hematolog|rheumatolog|endocrin|geriatric/i, rot: /internal medicine|^medicine|\bIM\b|inpatient medicine/i },
  { n: "Interventional Radiology", nm: /interventional/i, kw: /interventional radiolog|endovascular|embolization|catheter/i, rot: /interventional/i },
  { n: "Neurology", nm: /^neurolog/i, kw: /neurolog|stroke|epilep|seizure|alzheimer|dementia|parkinson|multiple sclerosis|neuroscience/i, rot: /neuro(?!surg)/i },
  { n: "Neurosurgery", nm: /neurosurg/i, kw: /neurosurg|spine surg|brain tumor|glioma/i, rot: /neurosurg/i },
  { n: "Obstetrics & Gynecology", nm: /obstet|gynec|ob\/?gyn/i, kw: /obstet|gynec|ob\/?gyn|maternal|prenatal|reproductive|women'?s health|pregnan|midwi/i, rot: /\bob\b|gyn|obstet|women/i },
  { n: "Ophthalmology", nm: /ophthalm/i, kw: /ophthalm|retina|glaucoma|cataract|vision screening/i, rot: /ophth/i },
  { n: "Orthopaedic Surgery", nm: /orthop/i, kw: /orthop|sports medicine|musculoskeletal|fracture|athlet/i, rot: /ortho/i },
  { n: "Otolaryngology", nm: /otolaryng|\bENT\b/i, kw: /otolaryng|\bENT\b|head and neck|hearing|cochlear|audiolog/i, rot: /otolaryn|\bENT\b/i },
  { n: "Pathology", nm: /patholog/i, kw: /patholog|histolog|cytolog|biobank|laboratory medicine/i, rot: /patholog/i },
  { n: "Pediatrics", nm: /pediatr|paediatr|peds/i, kw: /pediatr|paediatr|child|adolescen|neonat|infant|youth|camp counselor/i, rot: /pediatr|peds/i },
  { n: "Physical Medicine & Rehabilitation", nm: /rehab|physiatr|PM&R/i, kw: /rehabilitat|physiatr|PM&R|spinal cord injury|prosthet|physical therap/i, rot: /rehab|PM&R|physiat/i },
  { n: "Plastic Surgery", nm: /plastic/i, kw: /plastic surg|reconstructive|craniofacial|burn unit/i, rot: /plastic/i },
  { n: "Psychiatry", nm: /psychiat/i, kw: /psychiat|mental health|depress|anxiety|substance use|addiction|behavioral health|suicid|crisis line/i, rot: /psych/i },
  { n: "Radiation Oncology", nm: /radiation onc/i, kw: /radiation oncolog|radiotherap|proton/i, rot: /radiation onc/i },
  { n: "Radiology", nm: /radiolog|imaging/i, kw: /radiolog|imaging|\bMRI\b|\bCT\b|ultrasound|computer vision|image segmentation|echocardiograph/i, rot: /radiolog|imaging/i },
  { n: "Urology", nm: /urolog/i, kw: /urolog|prostate|kidney stone|bladder/i, rot: /urolog/i }
];
const SPEC_BY = Object.fromEntries(SPECS.map((s) => [s.n, s]));
function canonSpec(name) {
  const s = String(name || "").trim(); if (!s) return "";
  if (SPEC_BY[s]) return s;
  const low = s.toLowerCase(); const exact = SPECS.find((x) => x.n.toLowerCase() === low); if (exact) return exact.n;
  for (const x of SPECS) if (x.nm.test(s)) return x.n;
  return "";
}
const specsIn = (text) => SPECS.filter((s) => s.kw.test(text)).map((s) => s.n);

/* ================= reading files ================= */
async function inflateRaw(u8) {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open .docx files. Save it as PDF or paste the text.");
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzipOne(buf, want) {
  const dv = new DataView(buf); const u8 = new Uint8Array(buf); const td = new TextDecoder();
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("That isn't a Word file Perl can open. Save it as PDF or paste the text.");
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + elen + clen;
    if (name !== want) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = u8.subarray(start, start + csize);
    if (method !== 0 && method !== 8) throw new Error("This Word file uses a compression Perl can't read. Save it as PDF instead.");
    return td.decode(method === 0 ? data : await inflateRaw(data));
  }
  throw new Error("No document text in that file. Save it as PDF or paste the text.");
}
const XENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unxml = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : XENT[e] ?? m));
async function docxText(buf) {
  const xml = await unzipOne(buf, "word/document.xml");
  let out = "";
  for (const m of xml.matchAll(/<\/w:p>|<w:tab\/>|<w:br\/>|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)) {
    if (m[0] === "</w:p>") out += "\n"; else if (m[0] === "<w:tab/>") out += "\t"; else if (m[0] === "<w:br/>") out += "\n"; else out += unxml(m[1]);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function readFile(file) {
  const u = U(); u.busy = "reading"; u.error = ""; u.note = ""; u.fileName = file.name; A.render();
  try {
    let text = "";
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") text = await A.pdfText(await file.arrayBuffer());
    else if (/\.docx$/i.test(file.name)) text = await docxText(await file.arrayBuffer());
    else if (/\.doc$/i.test(file.name)) throw new Error("Old .doc files can't be read here. Save it as .docx or PDF.");
    else text = await file.text();
    if (!text.trim()) throw new Error("No text found in that file. If it's a scan, paste the text instead.");
    u.text = text.slice(0, 60000); u.busy = "";
  } catch (e) { u.busy = ""; u.fileName = ""; u.error = (e && e.message) || "Couldn't read that file."; }
  A.render(); A.refocus(U().error ? "#cr-file" : "#cr-go");
}

/* ================= grounding: every claim must trace to the resume ================= */
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function grounder(text) {
  const nt = " " + norm(text) + " "; const toks = new Set(nt.split(" "));
  return (ev) => {
    const ne = norm(ev); if (!ne) return false;
    if (nt.includes(" " + ne + " ") || (ne.length >= 12 && nt.includes(ne))) return true;
    const w = ne.split(" ").filter((x) => x.length > 3); if (w.length < 2) return false;
    return w.filter((x) => toks.has(x)).length / w.length >= 0.75;
  };
}
const TITLES = /^(dr|doctor|prof|professor|mr|mrs|ms|mx)\.?\s+/i;
const CREDS = /,?\s+(md|m\.d\.|phd|ph\.d\.|do|mph|mba|ms|msc|rn|np|pa-c|facc|faha|frcpc)\b\.?/gi;
const nkey = (name) => norm(String(name || "").replace(TITLES, "").replace(CREDS, ""));

/* ================= quick read: a deterministic parser, no network ================= */
const SECTION_RE = [
  ["education", /^(education|academic background|training)/i],
  ["research", /^(research|publications?|presentations?|abstracts?|posters?|peer[- ]reviewed|scholarly|manuscripts?)/i],
  ["leadership", /^(leadership|organizations?|activities|extracurricular|professional (service|activities))/i],
  ["clinical", /^(clinical|patient care|healthcare experience|clinical experience)/i],
  ["teaching", /^(teaching|mentoring|tutoring|education experience)/i],
  ["service", /^(volunteer|service|community|outreach)/i],
  ["venture", /^(entrepreneur|ventures?|startups?|innovation|business|industry)/i],
  ["awards", /^(awards?|honors?|honours?|scholarships?|grants?|distinctions?)/i],
  ["experience", /^(experience|work|employment|professional experience|positions?)/i],
  ["skills", /^(skills|languages|certifications?|technical)/i],
  ["interests", /^(interests|hobbies|personal)/i]
];
const BULLET = /^[•▪◦‣\-–—*·●○]\s*/;
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_RE = new RegExp(`((?:${MONTH}\\s+)?(?:19|20)\\d{2}\\s*(?:[-–—]|to)\\s*(?:(?:${MONTH}\\s+)?(?:19|20)\\d{2}|present|current|now|ongoing)|(?:${MONTH}\\s+)?(?:19|20)\\d{2})`, "i");
const ORG_RE = /\b((?:[A-Z][\w&.'’-]*\s+){0,5}(?:University|College|Hospital|Clinic|Institute|Center|Centre|Foundation|Association|Society|School|Laboratory|Lab|Program|Programme|Consortium|Network|Initiative|Capital|Ventures|Partners|Health|Fellowship)(?:\s+(?:of|for|at|&|and|in)\s+(?:[A-Z][\w&.'’-]*\s*){1,4})?)/g;
const PERSON_RES = [
  /\b(?:Dr|Prof|Professor)\.?\s+([A-Z][a-zA-Z'’-]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-zA-Z'’-]+){0,2})/g,
  /\b([A-Z][a-z'’-]+(?:\s+[A-Z]\.)?\s+[A-Z][a-zA-Z'’-]+),\s*(?:MD|M\.D\.|PhD|Ph\.D\.|DO|MPH)\b/g,
  /\b(?:PI|Mentor|Advisor|Adviser|Supervisor|Preceptor|Principal Investigator)s?\s*[:\-–]\s*(?:Dr\.?\s*)?([A-Z][a-zA-Z'’-]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-zA-Z'’-]+){1,2})/g
];
const STRENGTHS = [
  ["Research output", /publish|journal|manuscript|first author|co-first|abstract|poster|podium|presented|preprint|\bet al\b/i],
  ["Leadership", /president|founder|founded|co-founded|chair|director|\blead\b|led\b|captain|board|executive/i],
  ["Data and AI", /machine learning|artificial intelligence|\bAI\b|deep learning|\bLLM|python|\bR\b|statistic|data analys|natural language|algorithm/i],
  ["Entrepreneurship", /startup|start-up|venture|entrepreneur|commercializ|patent|investor|fellows? program|accelerator|business/i],
  ["Teaching and mentoring", /tutor|teach|teaching assistant|\bTA\b|instructor|mentor(ed|ing)? (students|undergrad)|curriculum/i],
  ["Clinical exposure", /scribe|\bEMT\b|patient|clinic|hospital|shadow|bedside|medical assistant|\bCNA\b/i],
  ["Community service", /volunteer|community|outreach|free clinic|underserved|health equity/i],
  ["Recognition", /award|honor|scholar|selected|fellowship|grant|prize|dean'?s list|1 of \d+|one of \d+/i]
];
const THEMES = [
  ["AI in medicine", /machine learning|artificial intelligence|\bAI\b|deep learning|\bLLM|large language/i],
  ["Cardiovascular health", /cardi|heart|vascular/i],
  ["Health policy", /policy|legislat|advocacy|public health|\bMPH\b/i],
  ["Health equity", /equity|underserved|disparit|social determinants/i],
  ["Global health", /global health|international|low-income countr/i],
  ["Healthcare business", /venture|startup|entrepreneur|business|\bMBA\b|capital|commercializ/i],
  ["Medical education", /curriculum|medical education|teaching|tutor/i],
  ["Digital health", /wearable|digital health|mobile health|mhealth|telehealth|app\b/i],
  ["Quality improvement", /quality improvement|\bQI\b|patient safety/i],
  ["Population data", /cohort|registry|epidemiolog|population|biobank|All of Us/i]
];
const DISTINCT = /co-first|first author|selected|national|1 of \d+|one of \d+|founded|founder|award|grant|patent|president|chair|fellow|published in|invited|only\b/i;
function kindOf(section, line) {
  if (/venture|startup|founder|capital|entrepreneur|fellows? program/i.test(line)) return "venture";
  if (/tutor|teach|instructor|\bTA\b/i.test(line)) return "teaching";
  if (section === "research" || /research|lab\b|investigat/i.test(line)) return "research";
  if (section === "leadership" || /president|chair|founder|director|lead/i.test(line)) return "leadership";
  if (section === "clinical" || /scribe|\bEMT\b|clinic|hospital|patient/i.test(line)) return "clinical";
  if (section === "teaching") return "teaching";
  if (section === "service") return "service";
  if (section === "venture") return "venture";
  return "other";
}
function quickRead(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const self = nkey(lines[0] || "");
  let sec = "top"; const tagged = [];
  for (const raw of lines) {
    const head = raw.replace(/[:\s]+$/, "");
    const hit = head.length <= 48 && !DATE_RE.test(head) ? SECTION_RE.find(([, re]) => re.test(head)) : null;
    if (hit) { sec = hit[0]; continue; }
    tagged.push({ sec, line: raw.replace(BULLET, ""), bullet: BULLET.test(raw) });
  }
  /* entries: a non-bullet line starts one, bullets attach to it */
  const entries = [];
  for (const t of tagged) {
    if (!t.bullet || !entries.length || entries[entries.length - 1].sec !== t.sec) entries.push({ sec: t.sec, head: t.line, lines: [t.line] });
    else entries[entries.length - 1].lines.push(t.line);
  }
  const body = (e) => e.lines.join(" ");
  /* experiences */
  const experiences = [];
  for (const e of entries) {
    if (!["research", "leadership", "clinical", "teaching", "service", "venture", "experience"].includes(e.sec)) continue;
    const d = DATE_RE.exec(e.head);
    if (/\bet al\b|journal|\d{4};\d|\bdoi\b|^[A-Z][a-z'’-]+ [A-Z]{1,2}[,.]|^(poster|podium|oral|presentation|abstract)\b/i.test(e.head)) continue; /* citations aren't experiences */
    const head = e.head.replace(DATE_RE, "").replace(/[|,–—-]\s*$/, "").trim();
    const parts = head.split(/\s+[|–—]\s+|,\s+|\s+-\s+|\s+at\s+/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) continue;
    const orgM = head.match(ORG_RE);
    experiences.push({ title: clip(parts[0], 90), org: clip(orgM ? orgM[0] : parts.slice(1).join(", "), 90), dates: d ? clip(d[0], 40) : "", kind: kindOf(e.sec, body(e)), evidence: clip(e.head, 200) });
  }
  /* people */
  const people = new Map();
  for (const e of entries) {
    const ctx = body(e);
    for (const re of PERSON_RES) for (const m of ctx.matchAll(re)) {
      const name = m[1].replace(/\s+(?:MD|PhD|DO)$/, "").trim(); const k = nkey(name);
      if (!k || k === self || k.split(" ").length < 2 || people.has(k)) continue;
      const near = ctx.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
      const relation = /mentor|advis|preceptor/i.test(near) ? "mentor" : /\bPI\b|principal investigator|lab\b|under\b|laboratory|supervis/i.test(near) || e.sec === "research" ? "PI" : "collaborator";
      const orgM = e.head.match(ORG_RE) || ctx.match(ORG_RE);
      people.set(k, { name: (/^(Dr|Prof)/i.test(m[0]) ? "Dr. " : "") + name, role: clip(e.head.replace(DATE_RE, "").split(/\s+[|–—]\s+|,\s+/)[0], 70), org: clip(orgM ? orgM[0] : "", 80), relation, specialties: specsIn(ctx), evidence: clip(m[0].length > 30 ? m[0] : near, 200) });
    }
  }
  /* organisations and programs */
  const orgs = new Map();
  for (const e of entries) {
    if (["skills", "interests"].includes(e.sec)) continue;
    for (const m of e.head.matchAll(ORG_RE)) {
      const name = m[1].trim().replace(/\s+(of|for|at|and|in|&)$/i, ""); const k = norm(name);
      if (name.split(" ").length < 2 || orgs.has(k)) continue;
      const ctx = body(e);
      orgs.set(k, { name: clip(name, 80), role: clip(e.head.replace(DATE_RE, "").split(/\s+[|–—]\s+|,\s+/)[0], 70), org: "", relation: /fellow|program|scholar|cohort|accelerator/i.test(ctx) ? "program" : "organization", specialties: specsIn(ctx), evidence: clip(e.head, 200) });
    }
  }
  /* strengths, interests, themes */
  const all = tagged.map((t) => t.line);
  const strengths = STRENGTHS.map(([name, re]) => { const hits = all.filter((l) => re.test(l)); return { name, n: hits.length, evidence: clip(hits[0] || "", 200) }; })
    .filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 5).map(({ name, evidence }) => ({ name, evidence }));
  const specHits = SPECS.map((s) => { const hits = all.filter((l) => s.kw.test(l)); return { s, hits }; }).filter((x) => x.hits.length).sort((a, b) => b.hits.length - a.hits.length);
  const interestLines = tagged.filter((t) => t.sec === "interests").flatMap((t) => t.line.split(/[,;]\s*/)).filter((x) => x.length > 2 && x.length < 50).slice(0, 3);
  const interests = [...specHits.slice(0, 3).map(({ s, hits }) => ({ name: s.n, evidence: clip(hits[0], 200) })), ...interestLines.map((x) => ({ name: clip(x, 40), evidence: x }))];
  const themes = THEMES.map(([name, re]) => [name, all.filter((l) => re.test(l)).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);
  const unique = [...new Set(all.filter((l) => DISTINCT.test(l) && l.length > 24))].slice(0, 4).map((l) => ({ text: clip(l, 180), evidence: clip(l, 200) }));
  const headline = strengths.length ? `${strengths.slice(0, 2).map((s) => s.name).join(" and ")}${themes.length ? `, centred on ${themes.slice(0, 2).join(" and ").toLowerCase()}` : ""}.` : "Not enough structure to summarise. Try pasting the text with its section headings.";
  const specialtyFit = specHits.slice(0, 5).map(({ s, hits }) => ({ specialty: s.n, why: `${hits.length} line${hits.length === 1 ? "" : "s"} in your resume point here.`, signals: hits.slice(0, 3).map((h) => clip(h, 160)), gaps: [] }));
  return { profile: { headline, unique, strengths, interests, themes, experiences: experiences.slice(0, 15), specialtyFit }, network: [...people.values(), ...orgs.values()].slice(0, 30) };
}

/* ================= Claude: one prompt, strict JSON, validated ================= */
const KINDS = ["research", "leadership", "clinical", "venture", "teaching", "service", "other"];
const RELS = ["mentor", "PI", "collaborator", "organization", "program"];
const REL_LABEL = { mentor: "Mentors", PI: "PIs and supervisors", collaborator: "Collaborators", program: "Programs", organization: "Organisations" };
const REL_ONE = { mentor: "Mentor", PI: "PI", collaborator: "Collaborator", program: "Program", organization: "Organisation" };
function analysisPrompt(text) {
  return `You read a medical student's resume to help them see what makes them distinctive, who is in their professional network, and how both relate to medical specialties. Use ONLY the resume between the <resume> markers.

Rules:
- Never invent people, publications, organisations, awards, dates, numbers or facts. If the resume doesn't show it, leave it out. Empty arrays are fine.
- Every "evidence" value is a phrase copied word for word from the resume (at most 200 characters), so the student can find it.
- network: people the resume shows a working relationship with (PI, mentor, supervisor, advisor, senior author of the student's own work), named exactly as written, plus the organisations and programs the student belongs or belonged to. Never include the student. Don't list every co-author from a citation.
- relation is one of: mentor, PI, collaborator, organization, program.
- kind is one of: research, leadership, clinical, venture, teaching, service, other.
- Specialty names (in network.specialties and specialtyFit.specialty) come only from this list: ${SPECS.map((s) => s.n).join("; ")}.
- specialtyFit: up to 5 specialties the resume supports best, strongest first. signals are resume phrases. gaps are concrete things a residency program in that specialty looks for that this resume does not show yet (for example "No letter writer in the specialty listed"); never state facts about the student that aren't in the resume.
- unique: 3 to 5 plain sentences on what is distinctive about this person compared with a typical medical student, each tied to one resume phrase. No praise words such as passionate, exceptional, impressive.
- headline: one sentence, at most 20 words, plain.
- Limits: strengths and interests up to 6 each, themes up to 6 short phrases, experiences up to 15, network up to 25.

Reply with only this JSON (no prose, no code fences):
{"headline":"","unique":[{"text":"","evidence":""}],"strengths":[{"name":"","evidence":""}],"interests":[{"name":"","evidence":""}],"themes":[""],"experiences":[{"title":"","org":"","dates":"","kind":"research"}],"network":[{"name":"","role":"","org":"","relation":"mentor","specialties":[""],"evidence":""}],"specialtyFit":[{"specialty":"","why":"","signals":[""],"gaps":[""]}]}

<resume>
${text.slice(0, 40000)}
</resume>`;
}
/* parse a reply that should be JSON: strip fences and prose, drop trailing commas, close a cut-off reply */
function parseReply(t) {
  let s = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const i = s.indexOf("{"); if (i < 0) throw new Error("no json");
  s = s.slice(i);
  const tries = [s, s.slice(0, s.lastIndexOf("}") + 1)];
  for (const x of tries) { try { return JSON.parse(x); } catch { /* try a repair */ } try { return JSON.parse(x.replace(/,\s*([}\]])/g, "$1")); } catch { /* next */ } }
  /* truncated: walk the text, cut back to the last complete value, close open brackets */
  const stack = []; let inStr = false, escp = false, lastSafe = 0;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (inStr) { if (escp) escp = false; else if (ch === "\\") escp = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") stack.push(ch); else if (ch === "}" || ch === "]") { stack.pop(); lastSafe = k + 1; } else if (ch === ",") lastSafe = k;
  }
  let cut = s.slice(0, lastSafe).replace(/,\s*$/, "");
  const st2 = []; inStr = false; escp = false;
  for (const ch of cut) { if (inStr) { if (escp) escp = false; else if (ch === "\\") escp = true; else if (ch === '"') inStr = false; continue; } if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") st2.push(ch); else if (ch === "}" || ch === "]") st2.pop(); }
  cut += st2.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
  return JSON.parse(cut.replace(/,\s*([}\]])/g, "$1"));
}
/* coerce whatever came back into the shape the view expects; drop people the resume doesn't name */
function cleanAnalysis(o, text) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const g = grounder(text); const nt = " " + norm(text) + " ";
  const str = (x, n) => (typeof x === "string" || typeof x === "number" ? clip(x, n) : "");
  const ev = (x) => { const e = str(x, 200); return { evidence: e, unverified: !!e && !g(e) }; };
  const named = (xs, n) => arr(xs).map((x) => (typeof x === "string" ? { name: str(x, 50) } : x && { name: str(x.name, 50), ...ev(x.evidence) })).filter((x) => x && x.name).slice(0, n)
    .map((x) => ({ name: x.name, evidence: x.evidence || "", unverified: x.evidence ? x.unverified : true }));
  const unique = arr(o.unique).map((x) => (typeof x === "string" ? { text: str(x, 240), evidence: "", unverified: true } : x && { text: str(x.text || x.point, 240), ...ev(x.evidence) })).filter((x) => x && x.text).slice(0, 5);
  const experiences = arr(o.experiences).filter((x) => x && typeof x === "object").map((x) => ({ title: str(x.title, 90), org: str(x.org, 90), dates: str(x.dates, 40), kind: KINDS.includes(x.kind) ? x.kind : "other" })).filter((x) => x.title).slice(0, 15);
  const network = arr(o.network).filter((x) => x && typeof x === "object").map((x) => {
    const name = str(x.name, 80); const k = nkey(name); if (!k) return null;
    const words = k.split(" ").filter((w) => w.length > 1);
    if (!(nt.includes(" " + k + " ") || (words.length > 1 && words.every((w) => nt.includes(" " + w + " "))))) return null; /* not in the resume: invented */
    return { name, role: str(x.role, 70), org: str(x.org, 80), relation: RELS.includes(x.relation) ? x.relation : /org/i.test(x.relation) ? "organization" : "collaborator", specialties: [...new Set(arr(x.specialties).map(canonSpec).filter(Boolean))].slice(0, 4), ...ev(x.evidence) };
  }).filter(Boolean).slice(0, 25);
  const specialtyFit = arr(o.specialtyFit).filter((x) => x && typeof x === "object").map((x) => ({ specialty: canonSpec(x.specialty), why: str(x.why, 240), signals: arr(x.signals).map((s) => str(s, 160)).filter(Boolean).slice(0, 4), gaps: arr(x.gaps).map((s) => str(s, 160)).filter(Boolean).slice(0, 4) }))
    .filter((x, i, a) => x.specialty && a.findIndex((y) => y.specialty === x.specialty) === i).slice(0, 5);
  const profile = { headline: str(o.headline, 200), unique, strengths: named(o.strengths, 6), interests: named(o.interests, 6), themes: arr(o.themes).map((x) => str(x, 40)).filter(Boolean).slice(0, 6), experiences, specialtyFit };
  if (!profile.headline && !unique.length && !profile.strengths.length && !network.length) return null;
  return { profile, network };
}

/* ================= network merge: a re-import never loses the student's edits ================= */
function mergeNetwork(old, fresh) {
  const c = ensure(); const removed = new Set(c.removed);
  const byKey = new Map(old.map((p) => [nkey(p.name), p]));
  const seen = new Set(); const out = [];
  for (const f of fresh) {
    const k = nkey(f.name); if (!k || seen.has(k) || removed.has(k)) continue; seen.add(k);
    const o = byKey.get(k);
    if (o) {
      const keep = o.edited ? { name: o.name, role: o.role, org: o.org, relation: o.relation, specialties: o.specialties } : {};
      out.push({ ...o, ...f, ...keep, id: o.id, note: o.note || "", lastContact: o.lastContact || "", warmth: o.warmth || "", src: o.src, edited: !!o.edited });
    } else out.push({ id: uid(), src: "resume", note: "", lastContact: "", warmth: "", edited: false, ...f });
  }
  /* people the student added or worked on stay even when the new resume doesn't list them */
  for (const o of old) if (!seen.has(nkey(o.name)) && (o.src === "user" || o.edited || o.note || o.lastContact || o.warmth)) out.push(o);
  return out;
}
function apply(res, source) {
  const c = ensure(); const u = U();
  const before = c.network.length;
  c.profile = { ...res.profile, source, at: Date.now() };
  c.network = mergeNetwork(c.network, res.network.map((p) => ({ ...p, specialties: [...new Set(arr(p.specialties).map(canonSpec).filter(Boolean))] })));
  c.file = u.fileName || "Pasted text"; c.importedAt = Date.now();
  c.prefill = countsFrom(u.text || "", c.profile);
  if (!c.spec || !SPEC_BY[c.spec]) c.spec = (c.profile.specialtyFit[0] && c.profile.specialtyFit[0].specialty) || "";
  u.importOpen = false; u.busy = ""; u.progress = "";
  const n = c.network.length;
  save(before ? `Updated. ${n} in your network; your notes and edits are kept.` : `Read your resume. ${n} ${n === 1 ? "person or organisation" : "people and organisations"} in your network.`);
  A.refocus("#cr-who");
}
function inputText() { const ta = $("#cr-text"); const u = U(); if (ta) u.text = ta.value; return (u.text || "").trim(); }
function runQuick() {
  const text = inputText(); const u = U();
  if (!text) { u.error = "Choose a file or paste your resume first."; A.render(); A.refocus("#cr-text"); return; }
  u.error = ""; u.note = "";
  apply(quickRead(text), "quick");
}
async function runClaude() {
  const text = inputText(); const u = U(); const S = A.SAMPLE;
  if (!text) { u.error = "Choose a file or paste your resume first."; A.render(); A.refocus("#cr-text"); return; }
  if (!S) { runQuick(); return; }
  u.error = ""; u.note = ""; u.busy = "claude"; u.progress = "Sending your resume to Claude…"; A.render();
  let reply = "";
  try {
    const out = await S(analysisPrompt(text), { cache: false, onText: ({ text: t }) => {
      reply = t; const n = (t.match(/"evidence"\s*:/g) || []).length; const p = (t.match(/"relation"\s*:/g) || []).length;
      u.progress = `Claude is reading… ${n} grounded ${n === 1 ? "point" : "points"}${p ? `, ${p} in your network` : ""} so far`;
      const el = document.getElementById("cr-progress"); if (el) el.textContent = u.progress;
    } });
    reply = (out && out.text) || reply;
    let parsed = null; try { parsed = parseReply(reply); } catch { parsed = null; }
    const res = cleanAnalysis(parsed, text);
    if (!res) { u.busy = ""; u.note = "Claude's answer couldn't be read, so this is the quick read. Try Analyze again in a moment."; apply(quickRead(text), "quick"); return; }
    apply(res, "claude");
  } catch (e) {
    u.busy = ""; u.progress = "";
    const code = e && e.code;
    u.note = code === "not_granted" ? "Claude is off, so this is the quick read, made in this browser." : code === "rate_limited" ? "Claude is busy right now. This is the quick read; try Analyze again in a minute." : code === "prompt_too_large" ? "That resume is too long for one pass. This is the quick read; trim it and try again." : "Couldn't reach Claude. This is the quick read, made in this browser.";
    apply(quickRead(text), "quick");
  }
}

/* ================= specialty timing and next steps ================= */
const DAYMS = 864e5;
function rotFor(spec) {
  const s = SPEC_BY[spec]; if (!s) return null;
  const rots = A.rotsParsed(); const t = A.today();
  const own = rots.filter((r) => s.rot.test(r.name));
  const parent = s.via && SPEC_BY[s.via] ? rots.filter((r) => SPEC_BY[s.via].rot.test(r.name)) : [];
  const list = own.length ? own : parent; const via = !own.length && parent.length ? s.via : "";
  const cur = list.find((r) => r.s <= t && r.e >= t);
  const next = list.filter((r) => r.s > t).sort((a, b) => a.s - b.s)[0];
  const past = list.filter((r) => r.e < t).sort((a, b) => b.e - a.e)[0];
  const days = next ? Math.round((next.s - t) / DAYMS) : 0;
  const when = days <= 13 ? `in ${days} day${days === 1 ? "" : "s"}` : `in ${Math.round(days / 7)} weeks`;
  const pre = via ? `${spec} comes through ${via}. ` : "";
  let text = "", tone = "";
  if (cur) { text = `${pre}You're on ${cur.name} until ${A.fmtShort(cur.e)}.`; tone = "now"; }
  else if (next) { text = `${pre}${next.name} starts ${A.fmtShort(next.s)}, ${when}.`; tone = "next"; }
  else if (past) { text = `${pre}You finished ${past.name} on ${A.fmtShort(past.e)}.`; tone = "past"; }
  else text = `No ${via || spec} rotation on your schedule yet.`;
  return { cur, next, past, via, text, tone };
}
const surname = (p) => (p.relation === "organization" || p.relation === "program" ? p.name : /^(dr|prof)/i.test(p.name) ? p.name.split(" ").filter((w) => !/^[A-Z]\.$/.test(w)).slice(0, 1).concat(p.name.split(" ").slice(-1)).join(" ") : p.name);
function peopleFor(spec) {
  const c = C(); if (!c) return [];
  const rank = { warm: 0, "": 1, cold: 2 };
  return c.network.filter((p) => arr(p.specialties).includes(spec)).sort((a, b) => (rank[a.warmth || ""] - rank[b.warmth || ""]) || ((a.relation === "organization" || a.relation === "program") - (b.relation === "organization" || b.relation === "program")));
}
function signalsFor(spec) {
  const c = C(); const pr = c && c.profile; if (!pr) return { fit: null, signals: [] };
  const fit = arr(pr.specialtyFit).find((f) => f.specialty === spec) || null;
  if (fit && fit.signals.length) return { fit, signals: fit.signals };
  const s = SPEC_BY[spec]; const pool = [...arr(pr.unique).map((x) => x.evidence || x.text), ...arr(pr.strengths).map((x) => x.evidence), ...arr(pr.interests).map((x) => x.evidence), ...arr(pr.experiences).map((x) => [x.title, x.org].filter(Boolean).join(", "))];
  return { fit, signals: [...new Set(pool.filter((x) => x && s.kw.test(x)))].slice(0, 3) };
}
function gapsFor(spec, fit, people, tm, signals) {
  const out = [...arr(fit && fit.gaps)];
  if (!people.some((p) => p.relation !== "organization" && p.relation !== "program")) out.push(`No one in your network is linked to ${spec} yet.`);
  if (tm && !tm.cur && !tm.next && !tm.past) out.push(`No ${tm.via || spec} rotation on your schedule yet.`);
  if (!signals.length) out.push(`Nothing on your resume points to ${spec} yet.`);
  return [...new Set(out)].slice(0, 5);
}
function actionsFor(spec, people, tm, gaps, signals) {
  const out = []; const person = people.find((p) => p.relation !== "organization" && p.relation !== "program");
  const rotName = tm && (tm.cur || tm.next) ? (tm.cur || tm.next).name : "";
  if (person) {
    const when = tm && tm.cur ? `this week, while you're on ${tm.cur.name}` : tm && tm.next ? `before ${tm.next.name} starts ${A.fmtShort(tm.next.s)}` : "this month";
    out.push({ t: `Ask ${surname(person)} for a 20-minute call about ${spec} ${when}.`, draft: person.id });
  } else out.push({ t: tm && tm.cur ? `Ask your ${tm.cur.name} attending to introduce you to one ${spec} faculty member.` : `Find one ${spec} faculty mentor: ask your clerkship director or the department coordinator for a name, then add them below.` });
  if (tm && tm.cur) out.push({ t: `Tell your team you're considering ${spec} and ask for mid-rotation feedback on what would make you stand out.` });
  else if (tm && tm.next) out.push({ t: `Before ${rotName} (${A.fmtShort(tm.next.s)}), read up on its common admissions and plan to ask for letter-quality feedback.` });
  else out.push({ t: `Find a ${spec} elective in your school's catalog and add it on Rotations.`, go: "rotations" });
  const org = people.find((p) => p.relation === "organization" || p.relation === "program");
  if (gaps.length && !/network|rotation/i.test(gaps[0])) out.push({ t: `Work on a gap: ${gaps[0].replace(/\.$/, "")}.` });
  else if (org) out.push({ t: `Use ${org.name}: look for a ${spec}-related project, talk or person there.` });
  else if (signals.length) out.push({ t: `Turn "${clip(signals[0], 70)}" into a two-minute story for interviews about why ${spec}.` });
  else out.push({ t: `Join the ${spec} interest group at your school and go to one meeting this month.` });
  return out.slice(0, 3);
}


/* ================= how competitive am I: the student's numbers against benchmarks they type in =================
   No benchmark figures ship with Perl and none are ever sent to Claude: NRMP's terms forbid reproducing Charting
   Outcomes or using it with AI tools. The comparison below is plain arithmetic in this browser. */
const METRICS = [
  { k: "research", l: "Research experiences", t: "n" },
  { k: "abstracts", l: "Abstracts, presentations and posters", t: "n" },
  { k: "pubs", l: "Publications", t: "n" },
  { k: "work", l: "Work experiences", t: "n" },
  { k: "volunteer", l: "Volunteer experiences", t: "n" },
  { k: "step2", l: "Step 2 CK score", t: "score" },
  { k: "aoa", l: "AOA", t: "yn", bl: "% of matched with AOA" },
  { k: "grad", l: "Graduate degree", t: "yn", bl: "% of matched with one" }
];
function countsFrom(text, prof) {
  const out = { research: null, abstracts: null, pubs: null, work: null, volunteer: null, aoa: "unknown", grad: "" };
  if (!text) { const ex = arr(prof && prof.experiences); if (ex.length) { out.research = ex.filter((e) => e.kind === "research").length; out.volunteer = ex.filter((e) => e.kind === "service").length; out.work = ex.filter((e) => ["clinical", "venture", "teaching", "other"].includes(e.kind)).length; } return out; }
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  let head = ""; const by = {};
  for (const l of lines) {
    const h = l.replace(/[:\s]+$/, "");
    if (h.length <= 48 && !DATE_RE.test(h) && SECTION_RE.some(([, re]) => re.test(h))) { head = h.toLowerCase(); continue; }
    (by[head] = by[head] || []).push(l);
  }
  const count = (re, ok) => Object.entries(by).filter(([h]) => re.test(h)).reduce((n, [, ls]) => n + ls.filter(ok).length, 0);
  const cite = (l) => l.length > 30 && /\bet al\b|journal|\(\d{4}\)|\d{4}[;.]|doi|accepted|in press|submitted|under review|\b[A-Z][a-z]+ [A-Z]{1,2}[,.]/.test(l.replace(BULLET, ""));
  out.pubs = count(/publication|manuscript|peer/i, cite);
  out.abstracts = count(/abstract|poster|presentation/i, (l) => l.length > 25 && !BULLET.test(l) || cite(l));
  const ex = arr(prof && prof.experiences);
  out.research = ex.filter((e) => e.kind === "research").length;
  out.volunteer = ex.filter((e) => e.kind === "service").length;
  out.work = ex.filter((e) => ["clinical", "venture", "teaching", "other"].includes(e.kind)).length;
  if (/alpha omega alpha|\bAOA\b/i.test(text)) out.aoa = "yes";
  const edu = Object.entries(by).filter(([h]) => /education|training|academic/i.test(h)).flatMap(([, ls]) => ls).join(" \n");
  out.grad = /\b(M\.?P\.?H|MsPH|M\.?S\.?c?|Ph\.?D|M\.?B\.?A|M\.?A|M\.?Eng|M\.?Ed|M\.?H\.?A|Master'?s?|Master of)\b/.test(edu) ? "yes" : "no";
  return out;
}
const numOr = (v) => (v === "" || v === null || v === undefined || !isFinite(+v) ? null : +v);
function mine(k) {
  const c = C(); const me = (c && c.me) || {}; const pf = (c && c.prefill) || {};
  if (me[k] !== undefined && me[k] !== null && me[k] !== "") return me[k];
  if (k === "step2") return "";
  return pf[k] ?? (k === "aoa" ? "unknown" : "");
}
function compare(m, you, bm) {
  if (m.t === "yn") {
    const pct = numOr(bm); if (pct === null || you === "unknown" || you === "") return null;
    const has = you === "yes";
    return { st: has ? (pct < 50 ? "above" : "near") : (pct >= 50 ? "below" : "near"), words: `${has ? "You have it" : "You don't"}; ${pct}% of matched applicants in your benchmark did.` };
  }
  const y = numOr(you), b = numOr(bm); if (y === null || b === null) return null;
  const d = y - b; const tol = m.t === "score" ? 3 : Math.max(1, b * 0.15);
  const unit = m.t === "score" ? "points" : "";
  const amt = m.t === "score" ? `${Math.abs(d)} ${unit}` : `${+Math.abs(d).toFixed(1)}`;
  if (Math.abs(d) <= tol) return { st: "near", words: d === 0 ? "Level with the benchmark." : `Near the benchmark (${d > 0 ? "+" : "−"}${amt}).` };
  return d > 0 ? { st: "above", words: `Above the benchmark by ${amt}.` } : { st: "below", words: `Below the benchmark by ${amt}.` };
}
const ST_LABEL = { above: "Above", near: "Near", below: "Below" };
function compBlock(spec, tm) {
  const c = C(); const bm = (c.benchmarks && c.benchmarks[spec]) || {};
  const sid = spec.replace(/[^a-z]/gi, "").toLowerCase();
  const rows = METRICS.map((m) => {
    const you = mine(m.k); const r = compare(m, you, bm[m.k]);
    const youCtl = m.t === "yn"
      ? `<select id="cr-me-${m.k}" data-cr-me="${m.k}" aria-label="You: ${esc(m.l)}">${(m.k === "aoa" ? [["unknown", "Not yet known"], ["yes", "Yes"], ["no", "No"]] : [["", "Not set"], ["yes", "Yes"], ["no", "No"]]).map(([v, l]) => `<option value="${v}" ${String(you) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`
      : `<input type="number" inputmode="numeric" min="0" max="${m.t === "score" ? 300 : 200}" id="cr-me-${m.k}" data-cr-me="${m.k}" value="${esc(you)}" aria-label="You: ${esc(m.l)}"${m.t === "score" ? ' placeholder="Optional"' : ""}>`;
    const bmCtl = `<input type="number" inputmode="decimal" min="0" max="${m.t === "score" ? 300 : m.t === "yn" ? 100 : 200}" step="any" id="cr-bm-${m.k}" data-cr-bm="${m.k}" value="${esc(bm[m.k] ?? "")}" aria-label="Benchmark for ${esc(spec)}: ${esc(m.bl || m.l)}">`;
    return `<div class="cr-m" role="row">
      <span class="cr-m-l" role="rowheader">${esc(m.l)}${m.bl ? `<small>Benchmark: ${esc(m.bl)}</small>` : ""}</span>
      <span class="cr-m-c" role="cell"><span class="cr-m-cap" aria-hidden="true">You</span>${youCtl}</span>
      <span class="cr-m-c" role="cell"><span class="cr-m-cap" aria-hidden="true">Benchmark</span>${bmCtl}</span>
      <span class="cr-m-r" role="cell">${r ? `<span class="cr-st ${r.st}">${ST_LABEL[r.st]}</span><small>${esc(r.words)}</small>` : `<small class="muted">${numOr(bm[m.k]) === null ? "Add a benchmark" : "Add yours"}</small>`}</span>
    </div>`;
  }).join("");
  const filled = METRICS.map((m) => compare(m, mine(m.k), bm[m.k])).filter(Boolean);
  const tally = filled.length ? ["above", "near", "below"].map((s) => [s, filled.filter((r) => r.st === s).length]).filter((x) => x[1]).map(([s, n]) => `${n} ${s}`).join(", ") : "";
  const when = !tm ? "" : tm.cur ? `You're on ${tm.cur.name} now: its grade and letters will weigh more than any number here.` : tm.next ? `Your ${tm.via ? `${spec}-relevant ` : ""}${tm.next.name} clerkship starts ${A.fmtShort(tm.next.s)}; its grade and letters aren't in this comparison yet.` : tm.past ? `You finished ${tm.past.name}; its grade and letters count too, and aren't captured here.` : `Your ${tm.via ? `${spec}-relevant ${tm.via}` : spec} clerkship isn't scheduled yet, so there's no grade or letter from it to weigh.`;
  return `<div class="cr-comp" id="cr-comp-${sid}">
    <h3 class="label mt16" id="cr-h-comp">How competitive am I</h3>
    <p class="hint">Your side is filled from your resume where possible; check each number. ${tally ? `<b class="cr-tally">${esc(spec)}: ${esc(tally)}.</b>` : ""}</p>
    <div class="cr-bm-head">
      <span class="label">Your benchmarks (typed from your copy of NRMP Charting Outcomes)</span>
      <a class="link" href="https://www.nrmp.org/match-data/" target="_blank" rel="noopener noreferrer">NRMP match data<span class="sr"> (opens in a new tab)</span></a>
    </div>
    <div class="field cr-bm-src"><label for="cr-bm-label">Year and table for ${esc(spec)}</label><input type="text" id="cr-bm-label" data-cr-bm="label" maxlength="80" value="${esc(bm.label || "")}" placeholder="e.g. Charting Outcomes, your year, U.S. MD seniors"></div>
    <div class="cr-mt" role="table" aria-labelledby="cr-h-comp">
      <div class="cr-m cr-m-h" role="row"><span role="columnheader">Measure</span><span role="columnheader">You</span><span role="columnheader">Matched (median or mean)</span><span role="columnheader">Comparison</span></div>
      ${rows}
    </div>
    <p class="hint mt8">${when ? esc(when) + " " : ""}Not captured: letters of recommendation, clerkship grades, interviews, program signals and your personal statement. These numbers describe people who matched; they aren't a match probability. Benchmarks stay on your device and are never sent to Claude.</p>
  </div>`;
}

/* ================= outreach drafts (Claude, or a plain starter without it) ================= */
function starter(p, spec) {
  const tm = rotFor(spec); const c = C(); const pr = c && c.profile;
  return `Subject: A quick question about ${spec}

Dear ${surname(p)},

I hope you're well. I'm [your year] at [your school], and I'm thinking seriously about ${spec}.${tm && tm.next ? ` My ${tm.next.name} rotation starts ${A.fmtShort(tm.next.s)}.` : ""} ${p.evidence ? `I've valued our work together (${clip(p.evidence, 90)}), and ` : ""}I'd be grateful for 20 minutes of your perspective on the field and how to prepare.${pr && pr.headline ? `\n\nA little about me: ${pr.headline}` : ""}

Would any time in the next few weeks work? [Offer two times]

Thank you,
[Your name]`;
}
async function draftFor(id, where = "net") {
  const c = C(); const p = c && c.network.find((x) => x.id === id); if (!p) return;
  const u = U(); const spec = (c.spec && SPEC_BY[c.spec]) ? c.spec : (p.specialties[0] || "your specialty interests");
  const S = A.SAMPLE;
  if (!S) { u.draft = { id, where, status: "done", text: starter(p, spec), starter: true }; A.render(); A.refocus("#cr-draft-text"); return; }
  u.draft = { id, where, status: "busy", text: "" }; A.render();
  const tm = rotFor(spec);
  const prompt = `Draft a short outreach note from a medical student to ${p.name}${p.role ? `, ${p.role}` : ""}${p.org ? `, ${p.org}` : ""}.
What the student's resume says about them: ${REL_ONE[p.relation] || "contact"}${p.evidence ? `; "${p.evidence}"` : ""}.
${p.note ? `The student's own note about this person: "${clip(p.note, 300)}".` : ""}
Purpose: ask for a 20-minute conversation about ${spec}.${tm && (tm.cur || tm.next) ? ` Timing the student may mention: ${tm.text}` : ""}
The student in one line: ${(c.profile && c.profile.headline) || "a medical student"}.
Rules: under 120 words; first line "Subject: ..."; warm, direct, first person, plain text. Use only the facts given here; never invent shared history, papers, dates or praise. Put anything the student must fill in inside [square brackets]. End with "[Your name]".`;
  try {
    const out = await S(prompt, { cache: false, onText: ({ text }) => { u.draft.text = text; const el = document.getElementById("cr-draft-text"); if (el) el.value = text; } });
    u.draft = { id, where, status: "done", text: String(out.text || "").trim() };
  } catch (e) {
    u.draft = { id, where, status: "done", text: starter(p, spec), starter: true, why: e && e.code === "rate_limited" ? "Claude is busy, so here's a starter to edit." : "Claude isn't available, so here's a starter to edit." };
  }
  A.render(); A.refocus("#cr-draft-text");
}
function draftBox(id, where = "net") {
  const d = U().draft; if (!d || d.id !== id || d.where !== where) return "";
  return `<div class="cr-draft">
    <label class="label" for="cr-draft-text">${d.status === "busy" ? "Claude is drafting…" : "Draft note"}</label>
    <textarea id="cr-draft-text" rows="9" ${d.status === "busy" ? "aria-busy=\"true\" readonly" : ""}>${esc(d.text)}</textarea>
    <div class="cr-draft-foot"><span class="hint">${d.why ? esc(d.why) + " " : ""}A draft to edit and send yourself. Perl never sends anything.</span><span class="cr-btns"><button class="btn small" data-act="cr-draft-close">Close</button><button class="btn primary small" data-act="cr-copy" ${d.status === "busy" ? "disabled" : ""}>Copy</button></span></div>
  </div>`;
}

/* ================= views ================= */
const ICON = {
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
};
function importPanel() {
  const u = U(); const c = C(); const has = !!(c && c.profile);
  if (has && !u.importOpen && !u.busy) {
    const when = c.importedAt ? A.fmtShort(new Date(c.importedAt)) : "";
    return `<section class="cr-bar" aria-label="Resume">
      <span class="cr-bar-t">${ICON.doc}<span><b>${esc(c.file || "Your resume")}</b> <span class="muted">· read ${esc(when)} · ${c.profile.source === "claude" ? "analysed with Claude" : "quick read"}</span></span></span>
      <span class="cr-btns">${c.profile.source !== "claude" && A.SAMPLE && u.text ? `<button class="btn small" data-act="cr-analyze">Analyze with Claude</button>` : ""}<button class="btn small" data-act="cr-import-open">Import a newer resume</button></span>
    </section>${u.note ? `<p class="cr-note" role="status">${esc(u.note)}</p>` : ""}`;
  }
  const busy = !!u.busy;
  return `<section class="panel cr-import" aria-labelledby="cr-h-import">
    <div class="panel-head"><h2 id="cr-h-import">${has ? "Import a newer resume" : "Start with your resume"}</h2>${has ? `<button class="btn quiet small" data-act="cr-import-cancel">Cancel</button>` : ""}</div>
    <label class="dz cr-dz${u.busy === "reading" ? " busy" : ""}" for="cr-file">
      <b>${u.busy === "reading" ? "Reading " + esc(u.fileName) + "…" : u.fileName ? esc(u.fileName) + " is ready" : "Drop your resume here, or choose a file"}</b>
      <span>PDF, Word (.docx) or text. It's read in this browser.</span>
      <input type="file" id="cr-file" class="sr" accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" ${busy ? "disabled" : ""}>
    </label>
    <div class="field mt16"><label for="cr-text">Or paste the text</label>
      <textarea id="cr-text" rows="${u.text ? 8 : 4}" placeholder="Paste your CV, including the section headings" ${busy ? "readonly" : ""}>${esc(u.text)}</textarea></div>
    ${u.error ? `<p class="cr-err" role="alert">${esc(u.error)}</p>` : ""}
    ${u.busy === "claude" ? `<p class="cr-progress" id="cr-progress" role="status" aria-live="polite">${esc(u.progress)}</p>` : ""}
    <div class="panel-foot">
      <span class="hint cr-privacy">${A.SAMPLE ? "Your resume stays in this browser until you tap Analyze, which sends its text to Claude. Quick read never leaves this device." : "Quick read runs in this browser; nothing is sent anywhere."} Perl saves what it finds, not the resume.</span>
      <span class="cr-btns">${A.SAMPLE ? `<button class="btn small" data-act="cr-quick" ${busy ? "disabled" : ""}>Quick read</button><button class="btn primary small" id="cr-go" data-act="cr-analyze" ${busy ? "disabled" : ""}>${u.busy === "claude" ? "Analyzing…" : "Analyze with Claude"}</button>` : `<button class="btn primary small" id="cr-go" data-act="cr-quick" ${busy ? "disabled" : ""}>Read my resume</button>`}</span>
    </div>
  </section>`;
}
const evTip = (x) => (x.evidence ? `<p class="cr-ev"><span class="sr">From your resume: </span>“${esc(x.evidence)}”${x.unverified ? ` <em>not found word for word in your resume</em>` : ""}</p>` : `<p class="cr-ev"><em>No resume line given.</em></p>`);
function chips(list, cls) {
  if (!list.length) return `<p class="hint">None found.</p>`;
  return `<ul class="cr-chips">${list.map((x) => `<li><details class="cr-chip ${cls}${x.unverified ? " unv" : ""}"><summary>${esc(x.name)}</summary>${evTip(x)}</details></li>`).join("")}</ul>`;
}
function whoPanel() {
  const pr = C().profile;
  return `<section class="panel cr-who" aria-labelledby="cr-who">
    <div class="panel-head"><h2 id="cr-who" tabindex="-1">What makes you you</h2><span class="pill ${pr.source === "claude" ? "pos" : ""}">${pr.source === "claude" ? "Claude, checked against your resume" : "Quick read"}</span></div>
    <p class="cr-headline">${esc(pr.headline)}</p>
    ${pr.unique.length ? `<ol class="cr-unique">${pr.unique.map((x) => `<li><p>${esc(x.text)}</p>${x.evidence && x.evidence !== x.text ? evTip(x) : x.unverified ? evTip(x) : ""}</li>`).join("")}</ol>` : ""}
    <div class="cr-two">
      <div><h3 class="label">Strengths</h3>${chips(pr.strengths, "s")}</div>
      <div><h3 class="label">Interests</h3>${chips(pr.interests, "i")}</div>
    </div>
    ${pr.themes.length ? `<p class="cr-themes"><span class="label">Threads</span> ${pr.themes.map((t) => `<span class="pill">${esc(t)}</span>`).join(" ")}</p>` : ""}
    ${pr.source === "quick" ? `<p class="hint mt8">Quick read: pattern matching on your headings and keywords. Tap a chip to see the line it came from.${A.SAMPLE ? " Analyze with Claude for a fuller reading." : ""}</p>` : `<p class="hint mt8">Tap a chip to see the line it came from.</p>`}
  </section>`;
}
function contactForm(p) {
  const v = p || { name: "", role: "", org: "", relation: "mentor", specialties: [], note: "", lastContact: "", warmth: "" };
  const id = p ? p.id : "new";
  return `<form class="cr-form" data-form="cr-contact" data-id="${esc(id)}" aria-label="${p ? "Edit " + esc(p.name) : "Add someone"}">
    <div class="cr-form-g">
      <div class="field"><label for="cr-f-name">Name</label><input type="text" id="cr-f-name" name="name" value="${esc(v.name)}" required maxlength="80" autocomplete="off"></div>
      <div class="field"><label for="cr-f-rel">Relationship</label><select id="cr-f-rel" name="relation">${RELS.map((r) => `<option value="${r}" ${v.relation === r ? "selected" : ""}>${REL_ONE[r]}</option>`).join("")}</select></div>
      <div class="field"><label for="cr-f-role">Role</label><input type="text" id="cr-f-role" name="role" value="${esc(v.role)}" maxlength="70" placeholder="e.g. Cardiology attending"></div>
      <div class="field"><label for="cr-f-org">Where</label><input type="text" id="cr-f-org" name="org" value="${esc(v.org)}" maxlength="80"></div>
      <div class="field cr-span"><label for="cr-f-spec">Specialties they connect to</label><input type="text" id="cr-f-spec" name="specialties" value="${esc(arr(v.specialties).join(", "))}" list="cr-spec-list" placeholder="Cardiology, Internal Medicine" aria-describedby="cr-f-spec-h"><span class="hint" id="cr-f-spec-h">Separate with commas.</span></div>
      <div class="field"><label for="cr-f-last">Last contacted</label><input type="date" id="cr-f-last" name="lastContact" value="${esc(v.lastContact)}"></div>
      <fieldset class="field cr-warmth"><legend class="label">Relationship temperature</legend><div class="seg" role="radiogroup" aria-label="Relationship temperature">${[["warm", "Warm"], ["cold", "Cold"], ["", "Not sure"]].map(([k, l]) => `<label class="cr-radio"><input type="radio" name="warmth" value="${k}" ${(v.warmth || "") === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
      <div class="field cr-span"><label for="cr-f-note">Note</label><textarea id="cr-f-note" name="note" rows="3" maxlength="1000" placeholder="How you know them, what you talked about last">${esc(v.note)}</textarea></div>
    </div>
    <div class="panel-foot"><span></span><span class="cr-btns"><button type="button" class="btn small" data-act="cr-edit-cancel">Cancel</button><button type="submit" class="btn primary small">${p ? "Save" : "Add"}</button></span></div>
  </form>`;
}
function lastLabel(p) {
  const d = A.parseD(p.lastContact); if (!d) return "Not contacted yet";
  const n = Math.round((A.today() - d) / DAYMS);
  return n <= 0 ? "Contacted today" : `Last contact ${A.fmtShort(d)}${n > 90 ? ` · ${Math.round(n / 30)} months ago` : ""}`;
}
function personRow(p) {
  const u = U(); if (u.edit === p.id) return `<li class="cr-p editing">${contactForm(p)}</li>`;
  const meta = [REL_ONE[p.relation] && (p.relation === "organization" || p.relation === "program") ? "" : p.role, p.org].filter(Boolean).join(" · ");
  return `<li class="cr-p" data-id="${esc(p.id)}">
    <div class="cr-p-main">
      <div class="cr-p-t"><b>${esc(p.name)}</b>${p.warmth ? `<span class="cr-temp ${p.warmth}">${p.warmth === "warm" ? "Warm" : "Cold"}</span>` : ""}</div>
      ${meta ? `<small>${esc(meta)}</small>` : ""}
      ${p.specialties.length ? `<div class="cr-p-specs">${p.specialties.map((s) => `<button class="cr-tag" data-act="cr-spec-pick" data-spec="${esc(s)}" aria-label="Explore ${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}
      ${p.note ? `<p class="cr-p-note">${esc(clip(p.note, 220))}</p>` : ""}
      <small class="cr-p-last">${esc(lastLabel(p))}${p.evidence ? ` · <span title="${esc(p.evidence)}">from your resume</span>` : p.src === "user" ? " · added by you" : ""}</small>
    </div>
    <div class="cr-p-acts">
      <button class="btn small" data-act="cr-draft" data-id="${esc(p.id)}" aria-label="Draft an outreach note to ${esc(p.name)}">Draft note</button>
      <button class="btn quiet small" data-act="cr-touch" data-id="${esc(p.id)}" aria-label="Mark ${esc(p.name)} contacted today">Contacted today</button>
      <button class="btn quiet small" data-act="cr-edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">Edit</button>
      <button class="btn quiet small danger" data-act="cr-remove" data-id="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">Remove</button>
    </div>
    ${draftBox(p.id)}
  </li>`;
}
function networkPanel() {
  const c = C(); const u = U(); const net = c.network;
  const warm = net.filter((p) => p.warmth === "warm").length;
  const groups = RELS.map((r) => [r, net.filter((p) => p.relation === r)]).filter(([, l]) => l.length);
  return `<section class="panel cr-net" aria-labelledby="cr-h-net">
    <div class="panel-head"><h2 id="cr-h-net">Your network</h2><span class="aside">${net.length} ${net.length === 1 ? "entry" : "entries"}${warm ? ` · ${warm} warm` : ""}</span><button class="btn small" data-act="cr-add">${ICON.plus}Add someone</button></div>
    ${u.edit === "new" ? `<div class="cr-new">${contactForm(null)}</div>` : ""}
    ${groups.length ? groups.map(([r, l]) => `<h3 class="cr-gh">${REL_LABEL[r]} <span class="count-chip">${l.length}</span></h3><ul class="cr-people">${l.map(personRow).join("")}</ul>`).join("") : `<div class="empty">No people or organisations found in your resume. Add the attendings, PIs and mentors you know: each one you link to a specialty shows up in the explorer.</div>`}
    <datalist id="cr-spec-list">${SPECS.map((s) => `<option value="${esc(s.n)}">`).join("")}</datalist>
  </section>`;
}
function explorerPanel() {
  const c = C(); const spec = SPEC_BY[c.spec] ? c.spec : "";
  const fits = arr(c.profile && c.profile.specialtyFit).map((f) => f.specialty);
  const head = `<div class="panel-head"><h2 id="cr-h-spec">Specialty explorer</h2></div>
    <div class="cr-pick"><label class="sr" for="cr-spec">Specialty</label><select id="cr-spec"><option value="">Choose a specialty</option>${fits.length ? `<optgroup label="Your resume points here">${fits.map((n) => `<option ${n === spec ? "selected" : ""}>${esc(n)}</option>`).join("")}</optgroup><optgroup label="All specialties">` : ""}${SPECS.map((s) => s.n).filter((n) => !fits.includes(n)).map((n) => `<option ${n === spec ? "selected" : ""}>${esc(n)}</option>`).join("")}${fits.length ? "</optgroup>" : ""}</select>
    ${fits.length ? `<div class="cr-quick" role="group" aria-label="Specialties your resume points to">${fits.slice(0, 4).map((n) => `<button class="chip" data-act="cr-spec-pick" data-spec="${esc(n)}" aria-pressed="${n === spec}">${esc(n)}</button>`).join("")}</div>` : ""}</div>`;
  if (!spec) return `<section class="panel cr-spec" aria-labelledby="cr-h-spec">${head}<p class="hint mt8">Pick a specialty to see your fit, who you know there, when you rotate through it, and what to do next.</p></section>`;
  const tm = rotFor(spec); const people = peopleFor(spec); const { fit, signals } = signalsFor(spec);
  const gaps = gapsFor(spec, fit, people, tm, signals); const acts = actionsFor(spec, people, tm, gaps, signals);
  return `<section class="panel cr-spec" aria-labelledby="cr-h-spec">${head}
    <p class="cr-when ${tm.tone}" id="cr-when"><span class="dot ${tm.tone === "now" ? "done" : tm.tone === "next" ? "soon" : "later"}" aria-hidden="true"></span>${esc(tm.text)}</p>
    ${fit && fit.why ? `<p class="cr-why">${esc(fit.why)}</p>` : ""}
    <div class="cr-two">
      <div><h3 class="label">Fit signals</h3>${signals.length ? `<ul class="cr-bul pos">${signals.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p class="hint">None in your resume yet.</p>`}</div>
      <div><h3 class="label">Gaps</h3>${gaps.length ? `<ul class="cr-bul gap">${gaps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p class="hint">No gaps flagged.</p>`}</div>
    </div>
    <h3 class="label mt16">Who you know here</h3>
    ${people.length ? `<ul class="cr-mini">${people.slice(0, 6).map((p) => `<li><span><b>${esc(p.name)}</b> <small>${esc([REL_ONE[p.relation], p.org].filter(Boolean).join(" · "))}</small></span>${p.warmth ? `<span class="cr-temp ${p.warmth}">${p.warmth === "warm" ? "Warm" : "Cold"}</span>` : ""}</li>`).join("")}</ul>` : `<p class="hint">No one yet. Link a contact to ${esc(spec)} with Edit, or add someone you met on a rotation.</p>`}
    ${compBlock(spec, tm)}
    <h3 class="label mt16">Next three steps</h3>
    <ol class="cr-acts">${acts.map((a) => `<li><span>${esc(a.t)}</span>${a.draft ? `<button class="btn small" data-act="cr-draft" data-id="${esc(a.draft)}" data-where="spec">Draft note</button>` : a.go ? `<button class="btn small" data-act="cr-go" data-to="${esc(a.go)}">Open Rotations</button>` : ""}${a.draft ? draftBox(a.draft, "spec") : ""}</li>`).join("")}</ol>
  </section>`;
}
function vCareer() {
  const c = C(); const u = U(); const has = !!(c && c.profile);
  const finding = has ? `Built from ${esc(c.file || "your resume")}. Everything here is yours to edit; a newer resume updates it without touching your notes.` : "Import your resume. Perl finds what sets you apart, maps the people and organisations in it, and connects them to the specialties you're weighing and the rotations ahead.";
  return `<div id="cr-root" class="cr">
    <div class="title-row"><div><h1>Career</h1><p class="finding">${finding}</p></div>${has ? `<div class="title-actions">${u.reset ? `<span class="hint">Delete your career profile and network?</span><button class="btn small" data-act="cr-reset-no">Keep</button><button class="btn small danger" data-act="cr-reset-yes">Delete</button>` : `<button class="btn quiet small" data-act="cr-reset">Start over</button>`}</div>` : ""}</div>
    ${importPanel()}
    ${has ? `<div class="cr-grid"><div class="cr-col">${whoPanel()}${explorerPanel()}</div><div class="cr-col">${networkPanel()}</div></div>` : ""}
  </div>`;
}
function todayCard() {
  const c = C(); if (!c || !c.profile) return "";
  const cur = A.currentRotation(); if (!cur) return "";
  const spec = SPECS.find((s) => s.rot.test(cur.name)); if (!spec) return "";
  const people = peopleFor(spec.n).filter((p) => p.relation !== "organization" && p.relation !== "program");
  const card = SPECS.filter((s) => s.via === spec.n).map((s) => s.n).find((n) => peopleFor(n).length);
  const n = people.length;
  if (!n && !card) return "";
  return `<section class="cr-today" aria-label="Career">
    <p><b>On ${esc(cur.name)}:</b> ${n ? `${n} ${n === 1 ? "person" : "people"} in your network ${n === 1 ? "connects" : "connect"} to ${esc(spec.n)}${people[0] ? `, including ${esc(people[0].name)}` : ""}.` : `a way into ${esc(card)}, which your network connects to.`}</p>
    <button class="btn small" data-act="cr-spec-pick" data-spec="${esc(n ? spec.n : card)}" data-nav="1">Open in Career</button>
  </section>`;
}

/* ================= events ================= */
function contactFromForm(f) {
  const fd = new FormData(f); const g = (k) => String(fd.get(k) || "").trim();
  return { name: clip(g("name"), 80), role: clip(g("role"), 70), org: clip(g("org"), 80), relation: RELS.includes(g("relation")) ? g("relation") : "collaborator",
    specialties: [...new Set(g("specialties").split(/[,;]/).map(canonSpec).filter(Boolean))].slice(0, 6), note: g("note").slice(0, 1000), lastContact: A.parseD(g("lastContact")) ? g("lastContact") : "", warmth: ["warm", "cold"].includes(g("warmth")) ? g("warmth") : "" };
}
const find = (id) => { const c = C(); return c ? c.network.find((p) => p.id === id) : null; };
window.PERL_MODULES.push({
  views: { career: vCareer },
  today: todayCard,
  acts: {
    "cr-quick": () => runQuick(),
    "cr-analyze": () => runClaude(),
    "cr-import-open": () => { const u = U(); u.importOpen = true; u.error = ""; u.note = ""; A.render(); A.refocus("#cr-file"); },
    "cr-import-cancel": () => { const u = U(); u.importOpen = false; u.error = ""; A.render(); A.refocus('[data-act="cr-import-open"]'); },
    "cr-add": () => { U().edit = "new"; A.render(); A.refocus("#cr-f-name"); },
    "cr-edit": (el) => { U().edit = el.dataset.id; A.render(); A.refocus("#cr-f-name"); },
    "cr-edit-cancel": () => { const u = U(); const id = u.edit; u.edit = null; A.render(); A.refocus(id && id !== "new" ? `[data-act="cr-edit"][data-id="${CSS.escape(id)}"]` : '[data-act="cr-add"]'); },
    "cr-remove": (el) => {
      const c = C(); const p = find(el.dataset.id); if (!p) return;
      c.network = c.network.filter((x) => x.id !== p.id);
      if (p.src !== "user") c.removed = [...new Set([...c.removed, nkey(p.name)])].slice(-300);
      U().edit = null; save(`Removed ${p.name}. A newer resume won't add them back.`); A.refocus('[data-act="cr-add"]');
    },
    "cr-touch": (el) => { const p = find(el.dataset.id); if (!p) return; p.lastContact = A.isoD(A.today()); save(`${p.name}: contacted today.`); A.refocus(`[data-act="cr-touch"][data-id="${CSS.escape(p.id)}"]`); },
    "cr-draft": (el) => draftFor(el.dataset.id, el.dataset.where || "net"),
    "cr-draft-close": () => { U().draft = null; A.render(); },
    "cr-copy": async () => {
      const ta = $("#cr-draft-text"); if (!ta) return; const t = ta.value;
      try { await navigator.clipboard.writeText(t); A.toast("Copied. Paste it into your email."); }
      catch { ta.focus(); ta.select(); A.toast("Selected. Press Ctrl C or ⌘C to copy."); }
    },
    "cr-spec-pick": (el) => { const c = ensure(); if (!SPEC_BY[el.dataset.spec]) return; c.spec = el.dataset.spec; A.persist(); if (el.dataset.nav) { A.go("career"); } else A.render(); setTimeout(() => { document.getElementById("cr-h-spec")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); document.getElementById("cr-spec")?.focus({ preventScroll: true }); }, 30); },
    "cr-go": (el) => A.go(el.dataset.to),
    "cr-reset": () => { U().reset = true; A.render(); A.refocus('[data-act="cr-reset-no"]'); },
    "cr-reset-no": () => { U().reset = false; A.render(); A.refocus('[data-act="cr-reset"]'); },
    "cr-reset-yes": () => { st().career = null; A.ui.career = null; save("Career profile deleted."); A.refocus("#cr-file"); }
  },
  on: {
    change(ev) {
      const t = ev.target;
      if (t.id === "cr-file") { if (t.files && t.files[0]) readFile(t.files[0]); return true; }
      if (t.dataset && (t.dataset.crMe || t.dataset.crBm)) {
        const c = ensure();
        if (t.dataset.crMe) { const m = METRICS.find((x) => x.k === t.dataset.crMe); if (!m) return true; c.me = c.me || {}; c.me[m.k] = m.t === "yn" ? t.value : t.value === "" ? "" : Math.max(0, Math.min(m.t === "score" ? 300 : 200, Math.round(+t.value || 0))); }
        else if (SPEC_BY[c.spec]) { c.benchmarks = c.benchmarks || {}; const b = (c.benchmarks[c.spec] = c.benchmarks[c.spec] || {}); const k = t.dataset.crBm; if (k === "label") b.label = clip(t.value, 80); else if (METRICS.some((x) => x.k === k)) b[k] = t.value === "" ? "" : Math.max(0, Math.min(k === "step2" ? 300 : 200, +t.value || 0)); }
        A.persist(); setTimeout(() => A.render(), 0); return true; /* after focus moves on, so Tab lands where expected */
      }
      if (t.id === "cr-spec") { const c = ensure(); c.spec = SPEC_BY[t.value] ? t.value : ""; U().draft = null; A.persist(); A.render(); return true; }
      return !!(t.closest && t.closest(".cr-form, #cr-text, #cr-draft-text"));
    },
    input(ev) {
      const t = ev.target;
      if (t.id === "cr-text") { U().text = t.value; return true; }
      if (t.id === "cr-draft-text") { const d = U().draft; if (d) d.text = t.value; return true; }
      return !!(t.closest && t.closest(".cr-form"));
    },
    submit(ev) {
      const f = ev.target; if (f.dataset.form !== "cr-contact") return false;
      const v = contactFromForm(f); const c = ensure(); const u = U();
      if (!v.name) { A.toast("Add a name."); $("#cr-f-name")?.focus(); return true; }
      if (f.dataset.id === "new") { const p = { id: uid(), src: "user", evidence: "", edited: true, ...v }; c.network.push(p); u.edit = null; save(`Added ${p.name}.`); A.refocus(`[data-act="cr-edit"][data-id="${CSS.escape(p.id)}"]`); }
      else { const p = find(f.dataset.id); if (!p) return true; Object.assign(p, v, { edited: true }); u.edit = null; save(`Saved ${p.name}.`); A.refocus(`[data-act="cr-edit"][data-id="${CSS.escape(p.id)}"]`); }
      return true;
    }
  }
});

/* a resume dropped on the import box is read here, not as a clerkship schedule */
const inDz = (ev) => ev.target && ev.target.closest && ev.target.closest(".cr-dz");
["dragenter", "dragover", "dragleave", "drop"].forEach((type) => window.addEventListener(type, (ev) => {
  const dz = inDz(ev); if (!dz) return;
  ev.preventDefault(); ev.stopPropagation();
  document.documentElement.classList.remove("dropping");
  if (type === "dragenter" || type === "dragover") dz.classList.add("over"); else dz.classList.remove("over");
  if (type === "drop" && ev.dataTransfer && ev.dataTransfer.files[0]) readFile(ev.dataTransfer.files[0]);
}, true));
/* Claude becomes available a moment after load; redraw so Analyze appears */
(async () => { try { const c = window.claude; if (c && typeof c.use === "function") await c.use("sample"); } catch { /* no Claude */ } setTimeout(() => { if (A.booted && A.ui.view === "career") A.render(); }, 0); })();
/* exposed for tests and for a future School-side use; read-only helpers, no data */
window.PERL_CAREER = Object.freeze({ quickRead, parseReply, cleanAnalysis, countsFrom, specialties: () => SPECS.map((s) => s.n) });
})();
