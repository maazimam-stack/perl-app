/* Degree audit reader and policy search. Both run entirely in the browser:
   nothing a student pastes or types is sent anywhere. */

/* ---------- CI MED course catalog (catalog.illinois.edu CLE list; courses.illinois.edu BSE, 2026) ---------- */
const COURSES = {
  "BSE 602": "Public Health Clinical Applications", "BSE 612": "Foundations", "BSE 631": "Cardiovascular", "BSE 632": "Respiratory",
  "BSE 633": "Renal", "BSE 634": "Clinical Neuroscience", "BSE 635": "Musculoskeletal and Integumentary System",
  "BSE 636": "Digestion, Nutrition, & Metabolism", "BSE 638": "Human Development and Reproductive Health",
  "BSE 642": "Hematology, Oncology, Infection, and Immunity", "BSE 644": "Multisystem Conditions", "BSE 645": "Synthesis & Summary",
  "BSE 655": "Research Elective", "BSE 660": "Self-Designed Study", "BSE 666": "Academic Progress I",
  "BSE 680": "Innovation, Design, Engineering and Analysis Projects", "BSE 685": "Medicine - Capstone Project",
  "BSE 686": "Medicine - Data Science Project", "BSE 702": "Medical Spanish", "BSE 704": "Medicine in Literature",
  "BSE 705": "Race in Medicine", "BSE 706": "Literature Reviews in Pathology", "BSE 707": "Interreligious Perspectives on Health and Medicine",
  "BSE 711": "Climate Change, Planetary Health and Sustainability", "BSE 712": "Artificial Intelligence in Health",
  "BSE 720": "Advanced Anatomy", "BSE 730": "Introduction to Deep Learning on Healthcare Data", "BSE 732": "Healthcare Process Management",
  "BSE 733": "Introduction to Research", "BSE 734": "Medical Chinese", "BSE 735": "Leadership in PBL I",
  "BSE 737": "Exploring Anatomy through the Virtual Reality Lens", "BSE 738": "Advanced Anatomy for Teaching",
  "BSE 740": "Artificial Intelligence in Medicine", "BSE 743": "Introduction to Health Systems Science", "BSE 744": "Simulation I",
  "BSE 745": "Medical Ethics at the Beginning and End of Life", "BSE 746": "Medical Hindi", "BSE 747": "Survey of Health Systems Science",
  "BSE 748": "Residency-Ready: Writing A Review Paper on Medical Innovations in Your Chosen Specialty",
  "BSE 749": "Comprehensive Immunology Course-Level 1", "BSE 750": "Clinical Pharmacology and Therapeutics",
  "BSE 752": "Community Service Learning", "BSE 770": "Service Learning Elective", "BSE 799": "Advanced Non-Clinical Electives",
  "CLE 610": "Faith, Medicine, and End-of-Life Care", "CLE 613": "Introduction to Clinical Practice", "CLE 614": "Introduction to Clinical Practice – M2",
  "CLE 631": "Clinical Elective", "CLE 640": "Family Medicine Clerkship", "CLE 645": "Internal Medicine Clerkship", "CLE 650": "Neurology Clerkship",
  "CLE 655": "Psychiatry Clerkship", "CLE 660": "Obstetrics & Gynecology Clerkship", "CLE 665": "Pediatrics Clerkship", "CLE 670": "Surgery Clerkship",
  "CLE 675": "Adult Reconstruction - Hip and Knee", "CLE 680": "Family Medicine Continuity Clinic", "CLE 681": "General Surgery Sub-Internship",
  "CLE 683": "Pediatrics Sub-Internship", "CLE 684": "Internal Medicine Sub-Internship", "CLE 685": "Anesthesiology Sub-Internship",
  "CLE 686": "Neurology Sub-Internship", "CLE 687": "Obstetrics and Gynecology Sub-Internship", "CLE 688": "Urology Sub-Internship",
  "CLE 689": "Family Medicine Sub-Internship", "CLE 690": "Clinical Research", "CLE 692": "Advanced Clinical and Professional Identity",
  "CLE 693": "Self-designed Clinical Elective", "CLE 694": "Career Boot Camp", "CLE 695": "Inpatient Psychiatry Sub-Internship",
  "CLE 696": "Psychiatry Consult and Liaison Sub-Internship", "CLE 697": "Current Concepts in Obesity and Metabolic Syndrome",
  "CLE 698": "Advanced Clinical Medical Spanish II", "CLE 702": "Anesthesiology", "CLE 704": "Dermatology", "CLE 705": "Spiritual Integration in Healthcare",
  "CLE 706": "Emergency Medicine", "CLE 707": "Emergency Medical Services", "CLE 708": "Advanced Cardiovascular Life Support Simulation and Clinical Immersion",
  "CLE 710": "Advanced Gynecology", "CLE 713": "Palliative Care - Introduction", "CLE 714": "Ambulatory Cardiology", "CLE 715": "Adult Intensive Care",
  "CLE 716": "Hematology/Oncology", "CLE 717": "Infectious Disease", "CLE 718": "Introduction to the HIV Epidemic: A Clinical and Social Medicine Elective",
  "CLE 719": "Inpatient Cardiology", "CLE 720": "Gastroenterology", "CLE 721": "Introduction to Ambulatory Cardiology", "CLE 730": "Clinical Genetics",
  "CLE 731": "Health Systems Leadership", "CLE 732": "Neurosurgery I", "CLE 733": "Neurosurgery II", "CLE 736": "Urogynecology",
  "CLE 737": "Gynecologic Oncology", "CLE 738": "Reproductive Medicine", "CLE 739": "Advanced Obstetrics", "CLE 740": "Introduction to Ophthalmology",
  "CLE 741": "Advanced Ophthalmology", "CLE 742": "Plastic and Reconstructive Surgery", "CLE 743": "Orthopedic Trauma",
  "CLE 744": "Oral & Maxillofacial Surgery I", "CLE 745": "Oral & Maxillofacial Surgery II", "CLE 746": "Otolaryngology - ENT",
  "CLE 748": "Surgical Pathophysiology", "CLE 750": "Developmental Pediatrics", "CLE 751": "Neonatal Intensive Care",
  "CLE 752": "Pediatric Pulmonology & Sleep Medicine", "CLE 753": "Pediatric Hematology", "CLE 755": "Ophthalmology for EM Students",
  "CLE 764": "Physical Medicine and Rehabilitation", "CLE 765": "Orthopedic Sports Medicine", "CLE 767": "Internal Medicine – Interprofessional Practice",
  "CLE 768": "Neurology Sub-I ED rotation", "CLE 770": "Service Learning Clinical Elective", "CLE 771": "Addiction Medicine",
  "CLE 772": "Outpatient Psychiatry", "CLE 773": "Radiation Oncology", "CLE 774": "Simulated Clinical Ultrasound", "CLE 775": "Point of Care Ultrasound",
  "CLE 776": "Diagnostic Radiology and Non-Cardiac Nuclear Medicine", "CLE 777": "Vascular and Interventional Radiology",
  "CLE 778": "Imaging in Critical Care", "CLE 779": "Bariatric Surgery", "CLE 780": "Hand Surgery", "CLE 781": "Vascular Surgery",
  "CLE 782": "Rural Surgery", "CLE 783": "Colon and Rectal Surgery", "CLE 784": "Pediatric Surgery", "CLE 786": "Introduction to Urology",
  "CLE 788": "Introduction to Anatomic Pathology", "CLE 789": "Introduction to Clinical Pathology", "CLE 790": "Advanced Focus in Clinical Pathology",
  "CLE 793": "Quality Improvement & Patient Safety", "CLE 794": "Values in the Physician-Patient Relationship",
  "CLE 795": "Consultation-Liaison Psychiatry", "CLE 796": "Consultation-Liaison with Outpatient Psychiatry", "CLE 797": "Inpatient Psychiatry",
  "CLE 798": "Family Medicine Continuity Clinic Course – Beginning", "CLE 799": "Advanced Clinical Electives"
};
/* Catalog credit hours where the catalog lists one fixed value (CLE only). */
const CLE_CREDITS = { 675: 4, 697: 2, 702: 2, 704: 2, 705: 1, 706: 4, 707: 2, 708: 2, 710: 2, 713: 2, 714: 4, 715: 4, 716: 2, 717: 2, 718: 2, 719: 2, 720: 2, 721: 2, 730: 2, 731: 4, 732: 2, 733: 4, 736: 2, 737: 2, 738: 2, 739: 4, 740: 2, 741: 4, 742: 4, 743: 4, 744: 2, 745: 4, 746: 2, 748: 4, 750: 2, 751: 2, 752: 4, 753: 2, 755: 2, 764: 2, 765: 2, 767: 4, 768: 4, 771: 2, 772: 2, 773: 2, 774: 2, 775: 4, 776: 2, 777: 2, 778: 2, 779: 4, 780: 2, 781: 4, 782: 4, 783: 4, 784: 2, 786: 2, 788: 2, 789: 2, 790: 2, 793: 2, 794: 2, 795: 2, 796: 2, 797: 2, 681: 4, 683: 4, 684: 4, 685: 4, 686: 4, 687: 4, 688: 4, 689: 4, 695: 4, 696: 4, 610: 2, 692: 2 };

/* Which courses satisfy which checklist item. Year split follows the block calendar:
   Year 1 = Foundations, Block 1 (631-633), Block 2 (634-636), ICP; Year 2 = Block 3 (638, 642), 644, 645, ICP M2. */
const REQ_COURSES = {
  y1: ["BSE 612", "BSE 631", "BSE 632", "BSE 633", "BSE 634", "BSE 635", "BSE 636", "CLE 613"],
  y2: ["BSE 638", "BSE 642", "BSE 644", "BSE 645", "CLE 614"],
  cl_fm: ["CLE 640"], cl_im: ["CLE 645"], cl_neuro: ["CLE 650"], cl_psych: ["CLE 655"], cl_ob: ["CLE 660"],
  cl_peds: ["CLE 665"], cl_surg: ["CLE 670"], fmcc: ["CLE 680"], idea: ["BSE 680"], cbc: ["CLE 694"], project: ["BSE 685", "BSE 686"]
};
const SUBI_CODES = new Set(["CLE 681", "CLE 683", "CLE 684", "CLE 685", "CLE 686", "CLE 687", "CLE 688", "CLE 689", "CLE 695", "CLE 696", "CLE 768"]);
const NON_CLINICAL_CLE = new Set(["CLE 610", "CLE 690", "CLE 692", "CLE 698", "CLE 705", "CLE 731", "CLE 793", "CLE 794"]);
const NOT_ELECTIVE = new Set([...Object.values(REQ_COURSES).flat(), "BSE 666", "CLE 708", "CLE 798"]);

const GRADE = {
  S: "done", SR: "done", H: "done", HON: "done", HONORS: "done", P: "done", PASS: "done", PASSED: "done", CR: "done",
  U: "fail", F: "fail", FAIL: "fail", FAILED: "fail", I: "inc", INC: "inc", INCOMPLETE: "inc",
  DFR: "inprog", IP: "inprog", EN: "inprog", ENR: "inprog", ENROLLED: "inprog", CURRENT: "inprog", REGISTERED: "inprog",
  W: "wd", WD: "wd", WITHDRAWN: "wd", PLANNED: "planned", PLAN: "planned"
};
const ONE_LETTER = new Set(["S", "H", "P", "U", "F", "I", "W"]);

function gradeOf(rest) {
  const toks = rest.replace(/in[\s-]progress/gi, " IP ").replace(/not\s+started/gi, " PLANNED ").split(/[\s|,;:()[\]/]+/).filter(Boolean);
  for (let i = toks.length - 1; i >= 0; i--) {
    const raw = toks[i]; const up = raw.toUpperCase().replace(/\.$/, "");
    if (!GRADE[up]) continue;
    if (up.length === 1 && raw !== up) continue; // single letters must be capitals
    return GRADE[up];
  }
  return null;
}
function creditsOf(rest) {
  const m = rest.match(/(?:^|\s)(\d{1,2})(?:\.(\d{1,2}))?(?=\s|$)/g);
  if (!m) return null;
  for (const x of m) { const n = Number(x.trim()); if (n > 0 && n <= 25) return n; }
  return null;
}

/* Returns { matriculation, expectedGraduation, reqSet, statuses, electives, notes, found } */
function parseAudit(text) {
  const out = { matriculation: null, expectedGraduation: null, reqSet: null, statuses: {}, electives: [], notes: [], found: 0 };
  const seen = new Map(); // code -> [{grade, credits, line}]
  const lines = String(text).replace(/\r/g, "").split("\n");
  const codeRe = /\b(BSE|CLE)\s*-?\s*(\d{3})\b/gi;
  for (const line of lines) {
    const hits = [...line.matchAll(codeRe)];
    hits.forEach((h, i) => {
      const code = `${h[1].toUpperCase()} ${h[2]}`;
      let rest = line.slice(h.index + h[0].length, i + 1 < hits.length ? hits[i + 1].index : line.length);
      const title = COURSES[code];
      if (title) { const at = rest.toLowerCase().indexOf(title.toLowerCase()); if (at >= 0) rest = rest.slice(0, at) + " " + rest.slice(at + title.length); }
      const g = gradeOf(rest);
      if (!seen.has(code)) seen.set(code, []);
      seen.get(code).push({ grade: g, credits: creditsOf(rest), line: line.trim() });
    });
    if (/\bhold\b/i.test(line) && !/household/i.test(line)) out.notes.push(line.trim().slice(0, 140));
  }
  out.found = seen.size;

  /* one state per course: a later IP after an S means it's still running; a pass after a U is a remediation */
  const stateOf = (code) => {
    const rows = seen.get(code); if (!rows) return null;
    const gs = rows.map((r) => r.grade).filter(Boolean);
    if (!gs.length) return "unknown";
    if (gs.includes("inprog") && gs.includes("done")) return "inprog";
    if (gs.includes("done")) return "done";
    if (gs.includes("inprog")) return "inprog";
    if (gs.includes("inc")) return "inc";
    if (gs.includes("fail")) return "fail";
    if (gs.includes("planned")) return "planned";
    return gs[gs.length - 1];
  };
  const label = (code) => `${code} ${COURSES[code] || ""}`.trim();

  for (const [id, codes] of Object.entries(REQ_COURSES)) {
    const states = codes.map((c) => [c, stateOf(c)]).filter(([, s]) => s);
    if (!states.length) continue;
    states.forEach(([c, s]) => {
      if (s === "fail") out.notes.push(`${label(c)}: U or failing grade on the audit. Check your remediation plan (APS-17).`);
      if (s === "inc") out.notes.push(`${label(c)}: Incomplete (I). It becomes U if the completion date passes (APS-16).`);
    });
    const ss = states.map(([, s]) => s);
    if (id === "project") { out.statuses[id] = ss.includes("done") ? "done" : ss.some((s) => s === "inprog" || s === "inc") ? "inprog" : "todo"; continue; }
    if (id === "y1" || id === "y2") {
      const need = id === "y1" ? 6 : 4;
      if (ss.every((s) => s === "done") && ss.length >= need) out.statuses[id] = "done";
      else if (ss.some((s) => s === "inprog" || s === "inc")) out.statuses[id] = "inprog";
      else if (ss.some((s) => s === "fail")) out.statuses[id] = "todo";
      continue;
    }
    const s = ss[0];
    if (s === "done") out.statuses[id] = "done";
    else if (s === "inprog" || s === "inc") out.statuses[id] = "inprog";
    else if (s === "fail" || s === "planned") out.statuses[id] = "todo";
  }
  if (!out.statuses.fmcc && stateOf("CLE 798") === "done") out.statuses.fmcc = "inprog";
  if (stateOf("CLE 708") === "done") { out.statuses.acls = "done"; out.notes.push("CLE 708 (ACLS) passed. Your ACLS card must still be valid on graduation day (APS-6)."); }

  for (const code of seen.keys()) {
    if (NOT_ELECTIVE.has(code)) continue;
    const n = Number(code.slice(4));
    const isSubi = SUBI_CODES.has(code);
    const elective = isSubi || code.startsWith("CLE") ? (n === 631 || n >= 675) || n === 610 : (n === 602 || n === 655 || n === 660 || n >= 700);
    if (!elective) continue;
    const s = stateOf(code);
    if (s === "fail") { out.notes.push(`${label(code)}: U on the audit. Electives are remediated by a different elective (APS-30).`); continue; }
    if (s === "wd") continue;
    const rows = seen.get(code); const cr = rows.map((r) => r.credits).find(Boolean) || (code.startsWith("CLE") ? CLE_CREDITS[n] : null) || null;
    out.electives.push({
      code, name: COURSES[code] || code, credits: cr, weeks: cr,
      kind: isSubi ? "subi" : code.startsWith("CLE") && !NON_CLINICAL_CLE.has(code) ? "clinical" : "open",
      status: s === "done" ? "done" : s === "inprog" || s === "inc" ? "inprog" : "planned"
    });
  }

  const flat = text.replace(/\s+/g, " ");
  const step = (re) => { const m = flat.match(re); if (!m) return null; return /fail/i.test(m[0]) ? "fail" : /pass|\bP\b/i.test(m[0]) ? "done" : null; };
  const s1 = step(/step\s*(?:1|one|i)\b[^.]{0,50}?\b(pass(?:ed)?|fail(?:ed)?)\b/i);
  const s2 = step(/step\s*(?:2|two|ii)(?:\s*ck)?\b[^.]{0,50}?\b(pass(?:ed)?|fail(?:ed)?)\b/i);
  if (s1) { out.statuses.step1 = s1 === "done" ? "done" : "todo"; if (s1 === "fail") out.notes.push("Step 1 shows a fail. See APS-31 and APS-33 (3-year limit) and talk with Student Affairs."); }
  if (s2) { out.statuses.step2 = s2 === "done" ? "done" : "todo"; if (s2 === "fail") out.notes.push("Step 2 CK shows a fail. See APS-31."); }
  const gw = step(/gateway\s*osce\b[^.]{0,50}?\b(pass(?:ed)?|fail(?:ed)?)\b/i);
  if (gw) out.statuses.gateway = gw === "done" ? "done" : "todo";
  const acls = flat.match(/\b(ACLS|PALS)\b[^.]{0,40}?(?:expires?|exp\.?|valid (?:through|until))\s*:?\s*([0-9/.-]{6,10}|[A-Z][a-z]+ \d{4})/);
  if (acls) out.notes.push(`${acls[1]} expires ${acls[2]}. It must be valid through graduation day (APS-6).`);

  const mat = flat.match(/matricul\w*[^0-9]{0,30}(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i) || flat.match(/matricul\w*[^0-9]{0,30}(\d{4})-(\d{2})-(\d{2})/i);
  if (mat) out.matriculation = mat[1].length === 4 ? `${mat[1]}-${mat[2]}-${mat[3]}` : `${mat[3]}-${String(mat[1]).padStart(2, "0")}-${String(mat[2]).padStart(2, "0")}`;
  const MONTHS_L = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const gm = flat.match(/graduat\w*[^0-9a-z]{0,6}(?:date|term)?[^0-9a-z]{0,6}(\d{1,2})[/-](\d{4})/i);
  const gn = flat.match(/graduat\w*[^a-z]{0,20}(?:date|term)?[^a-z]{0,6}(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
  if (gm) out.expectedGraduation = `${gm[2]}-${String(gm[1]).padStart(2, "0")}`;
  else if (gn) out.expectedGraduation = `${gn[2]}-${String(MONTHS_L.indexOf(gn[1].toLowerCase()) + 1).padStart(2, "0")}`;

  if (/APS[\s-]?6\.1\b/i.test(flat)) out.reqSet = "6.1";
  else if (/APS[\s-]?6\b(?!\.\d)/i.test(flat)) out.reqSet = "6";

  out.notes = [...new Set(out.notes)].slice(0, 8);
  return out;
}

const SAMPLE_AUDIT = `CARLE ILLINOIS COLLEGE OF MEDICINE - DEGREE AUDIT (SAMPLE, NOT A REAL STUDENT)
Program: Doctor of Medicine        Requirement version: APS-6.1
Matriculation date: 07/08/2024     Expected graduation: 05/2028

PRECLERKSHIP                                              CR   GRADE
SU24  BSE 612  Foundations                                 6.00  S
FA24  BSE 631  Cardiovascular                              5.00  S
FA24  BSE 632  Respiratory                                 4.00  S
FA24  BSE 633  Renal                                       4.00  S
SP25  BSE 634  Clinical Neuroscience                       5.00  S
SP25  BSE 635  Musculoskeletal and Integumentary System    4.00  S
SP25  BSE 636  Digestion, Nutrition, & Metabolism          4.00  S
FA24  CLE 613  Introduction to Clinical Practice           5.00  S
FA25  BSE 638  Human Development and Reproductive Health   5.00  S
FA25  BSE 642  Hematology, Oncology, Infection, and Immunity 6.00 S
SP26  BSE 644  Multisystem Conditions                      4.00  S
SP26  BSE 645  Synthesis & Summary                         4.00  S
FA25  CLE 614  Introduction to Clinical Practice – M2      2.00  S
USMLE Step 1: PASS (02/2026)

CLINICAL IMMERSION
SP26  CLE 665  Pediatrics Clerkship                        5.00  H
SP26  CLE 655  Psychiatry Clerkship                        5.00  S
SU26  CLE 640  Family Medicine Clerkship                   5.00  S
SU26  CLE 645  Internal Medicine Clerkship                10.00  H
FA26  CLE 650  Neurology Clerkship                         5.00  S
FA26  CLE 660  Obstetrics & Gynecology Clerkship           5.00  S
FA26  CLE 670  Surgery Clerkship                          10.00  IP
FA26  CLE 680  Family Medicine Continuity Clinic           2.00  IP
FA26  BSE 680  Innovation, Design, Engineering and Analysis Projects  IP

ELECTIVES
FA26  CLE 719  Inpatient Cardiology                        2.00  S
FA26  BSE 655  Research Elective                           4.00  S

Holds: none`;

/* ---------- policy search for "Ask the policies" ---------- */
const STOP = new Set("a an and are as at be been but by can could did do does for from get got had has have how i if in into is it its me my need needs of on or our should so than that the their them then there these they this to up us was we what when where which who why will with would you your am im also any about after before during just like much many more most only other some such very".split(" "));
const SYN = {
  sick: ["absence", "unplanned", "illness"], ill: ["absence", "illness"], illness: ["absence"], vacation: ["absence", "vacation"],
  miss: ["absence", "missed"], missed: ["absence", "missed"], missing: ["absence", "missed"], off: ["absence"],
  send: ["documentation", "submit"], proof: ["documentation"], note: ["documentation"], test: ["exam"],
  shelf: ["shelf"], fail: ["fail", "remediation", "retake"], failed: ["fail", "remediation", "retake"], failing: ["fail", "remediation"],
  retake: ["retake", "reassessment"], graded: ["grade"], honors: ["honors"], away: ["away"], visiting: ["away"], vslo: ["away", "vslo"],
  rotate: ["away", "rotation"], step: ["step", "usmle"], boards: ["usmle"],
  startup: ["industry", "consulting", "advisory"], company: ["industry"], companies: ["industry"], advisory: ["advisory", "consulting"],
  board: ["advisory"], consult: ["consulting"], equity: ["financial", "interest"], stock: ["stock"],
  graduate: ["graduate", "graduation"], graduation: ["graduate", "graduation"], harassment: ["mistreatment", "harassment"],
  mistreated: ["mistreatment"], bullied: ["mistreatment"], needlestick: ["exposure"], needle: ["exposure"], splash: ["exposure"],
  pregnant: ["pregnancy"], baby: ["pregnancy", "parental"], conference: ["conference", "travel"], present: ["conference", "presenting"],
  poster: ["poster", "conference"], publish: ["publishing", "journal"], paper: ["publishing", "manuscript"], journal: ["journal"],
  disability: ["accommodation", "dres"], accommodations: ["accommodation"], marijuana: ["cannabis"], weed: ["cannabis"],
  attire: ["dress"], scrubs: ["dress"], call: ["call", "overnight"], evals: ["evaluation"],
  zoom: ["remote"], virtual: ["remote"], online: ["remote"], subi: ["sub-i", "sub-internship"],
  appeal: ["appeal", "petition"], grievance: ["grievance"], break: ["leave"], weeks: ["week", "credit"], credits: ["credit", "week"],
  join: [], health: [], approval: ["approved", "approval"], start: ["start", "before"]
};
function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}
function wordsOf(s) { return String(s).toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9.\-]+/).map((w) => w.replace(/^[.\-]+|[.\-]+$/g, "")).filter(Boolean); }
function tokMatch(a, b) { return a === b || (a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6)); }

let FACTS = null, NF = 0;
function buildFacts() {
  FACTS = [];
  for (const p of POLICIES) {
    if (p.ph.every((k) => k === "fac" || k === "app")) continue;
    FACTS.push({ code: p.c, title: p.t, text: p.s, kind: "summary" });
    (p.r || []).forEach((r) => FACTS.push({ code: p.c, title: p.t, text: r, kind: "rule" }));
    (p.d || []).forEach((d) => FACTS.push({ code: p.c, title: p.t, text: `${d.l}: ${d.w}`, kind: "deadline", calc: d.calc }));
  }
  FLAGS.forEach((f) => FACTS.push({ code: f.codes[0], codes: f.codes, title: f.title, text: `${f.body} Ask: ${f.who}`, kind: "conflict", sev: f.sev }));
  for (const f of FACTS) { f.toks = [...new Set(wordsOf(f.text).map(stem))]; f.ttoks = [...new Set(wordsOf(f.title).map(stem))]; }
  NF = FACTS.length;
}
function searchRules(q) {
  if (!FACTS) buildFacts();
  const qw = wordsOf(q);
  const codes = new Set((q.match(/\b(APS|SWH|SL|TFA|AM|FS|GS)[\s-]?\d+(?:\.\d)?\b/gi) || []).map((c) => c.toUpperCase().replace(/\s/, "-")));
  const concepts = qw.filter((w) => !STOP.has(w) && !/^(aps|swh|sl|tfa|am|fs|gs)-/.test(w)).map((w) => [...new Set([stem(w), ...(SYN[w] || []).map(stem)])]).filter((c) => c.length);
  const df = (t) => FACTS.reduce((n, f) => n + (f.toks.some((x) => tokMatch(x, t)) ? 1 : 0), 0);
  const idf = new Map(); concepts.flat().forEach((t) => { if (!idf.has(t)) idf.set(t, Math.log(1 + NF / (1 + df(t)))); });
  const scored = FACTS.map((f) => {
    let s = 0, hit = 0; const matched = [];
    for (const c of concepts) {
      let best = 0;
      for (const t of c) {
        if (f.toks.some((x) => tokMatch(x, t))) { const w = idf.get(t) * (f.ttoks.some((x) => tokMatch(x, t)) ? 1.3 : 1); if (w > best) best = w; matched.push(t); }
        else if (f.ttoks.some((x) => tokMatch(x, t))) { const w = idf.get(t) * 0.8; if (w > best) best = w; matched.push(t); }
      }
      if (best) { s += best; hit++; }
    }
    s *= 1 + 0.5 * hit;
    if (codes.has(f.code.toUpperCase()) || (f.codes || []).some((c) => codes.has(c))) s += 8;
    if (f.kind === "summary") s *= 0.8;
    return { f, s, matched };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  const top = scored[0].s;
  let hits = scored.filter((x) => x.s >= top * 0.5).slice(0, 6);
  /* if a known conflict involves the policies that answer this, show it first */
  const topCodes = new Set(hits.slice(0, 3).map((x) => x.f.code));
  const clash = scored.find((x) => x.f.kind === "conflict" && x.f.sev === "conflict" && x.s >= top * 0.3 && x.f.codes.some((c) => topCodes.has(c)));
  if (clash) hits = [clash, ...hits.filter((x) => x !== clash)].slice(0, 6);
  return hits;
}
const escA = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function highlight(text, matched) {
  const set = matched || [];
  return String(text).split(/([A-Za-z0-9][A-Za-z0-9’'\-]*)/).map((seg, i) => {
    if (i % 2 === 0) return escA(seg);
    const st = stem(seg.toLowerCase().replace(/[’']/g, ""));
    return set.some((t) => tokMatch(st, t)) ? `<mark>${escA(seg)}</mark>` : escA(seg);
  }).join("");
}
