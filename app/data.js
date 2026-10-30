/* Policy Navigator — data layer.
   Every entry is a plain-language summary written from the PDF linked in `u`.
   Read on 2026-10-26 from medicine.illinois.edu/about/policies (73 links) and the
   AY2026-27 academic calendar (rev. 7/9/26). Summaries paraphrase; the PDF governs. */

const BOX = "https://uofi.box.com/s/";
const SOURCE_PAGE = "https://medicine.illinois.edu/about/policies";
const CAL_URL = "https://ws.engr.illinois.edu/sitemanager/getfile.asp?id=9279";
const CATALOG_URL = "https://catalog.illinois.edu/professional/medicine-md";
const READ_ON = "2026-10-26";

/* phases: pre = Preclerkship, ci = Clinical Immersion, fy = Final Year,
   loa = Leave / joint degree / off-cycle, app = applicants, fac = faculty & staff */
const PHASES = [
  { k: "pre", label: "Preclerkship", short: "Pre" },
  { k: "ci", label: "Clinical Immersion", short: "CI" },
  { k: "fy", label: "Final Year", short: "FY" },
  { k: "loa", label: "Leave or joint degree", short: "LOA" }
];

const GROUPS = [
  "Progress and graduation",
  "Assessment and grading",
  "Attendance and scheduling",
  "Clinical work",
  "Professionalism and conduct",
  "Records and rights",
  "Health and compliance",
  "Money and support",
  "Admissions",
  "Faculty and staff"
];

const POLICIES = [
  /* ---------- Progress and graduation ---------- */
  { c: "APS-6", t: "Promotion and Graduation Requirements", g: "Progress and graduation",
    eff: "2026-07-06", rev: "2029-07-06", ph: ["pre", "ci", "fy"], u: BOX + "yga7ge9i4ect27ezr7tb7sl9924y4o7f",
    s: "The 2026 rulebook for moving between years and graduating. Governing body moved to SPPC on July 1, 2026. Says it applies to all MD students.",
    r: [
      "Into Year 2: every required Year 1 course at S or SR by the college's published date, which falls before the next M1 orientation.",
      "Into Clinical Immersion: every required Year 2 course at S or SR by the published date.",
      "Into Final Year: every Clinical Immersion course at S, SR or Honors; Step 1 passed; every component of the Gateway OSCE attempted.",
      "To graduate: all of the above, program objectives met, Step 1 and Step 2 CK passed, Gateway OSCE passed, elective and Sub-I requirements met (see APS-30), Career Boot Camp, Capstone or Data Science, ACLS or PALS valid through graduation day, professionalism standards (APS-4).",
      "Graduation item 4.6 is blank in the published PDF.",
      "Exceptions: written petition to SPPC, only after you have talked with your advisor, academic support, Student Affairs, financial aid and the registrar."
    ],
    d: [{ l: "Petition SPPC for an exception", w: "Only after counseling; see APS-14 for the 10-business-day petition window" }]
  },
  { c: "APS-6.1", t: "Promotion and Graduation Requirements, 2023+ matriculants", g: "Progress and graduation",
    eff: "2023-11-15", rev: "2026-11-15", ph: ["pre", "ci", "fy"], u: BOX + "npokrup765rh3iifp3flrosfojnpmqxv",
    s: "An amendment written for students who matriculated in 2023 and later. Still posted beside the 2026 APS-6, and several of its rules differ from it.",
    r: [
      "Into Year 2: pass Introduction to Clinical Practice and have no unresolved U, I, DFR or W in required Year 1 courses.",
      "Into Year 3: S on all Year 1 and 2 preclinical courses and sit for Step 1. If you fail Step 1 you may finish the clerkship you are in, but you may not start another required clerkship until you pass.",
      "Into Year 4: S in every clerkship, FM Continuity Clinic and IDEA; S in 4 weeks of elective time during Year 3; pass the Gateway OSCE. You may enter Year 4 provisionally if missing items are scheduled before the Capstone starts.",
      "To graduate: pass Step 1 and Step 2 CK; S in at least one Sub-I; Career Boot Camp; 20 weeks of clinical electives and 20 weeks of open electives (the required Sub-I and Career Boot Camp don't count; extra Sub-Is do); Capstone or Data Science; ACLS or PALS valid through graduation."
    ],
    d: []
  },
  { c: "APS-30", t: "Elective and Selective Policy", g: "Progress and graduation",
    eff: "2026-03-16", rev: "2029-03-04", ph: ["ci", "fy"], u: BOX + "2z9lz67ssi36y6hxhoz4teoupm12cxef",
    s: "How electives, Sub-Is and away electives are counted, registered, dropped and graded.",
    r: [
      "30 credit hours of electives: at least 20 clinical (direct patient care), up to 10 research, engineering, clinical or non-clinical. Credits follow APS-50 (40 hours = 1 credit).",
      "Section IX calls it a ‘30-week elective requirement’, so the policy itself mixes weeks and credits.",
      "Maximum 25 credits per term. Clerkship students register electives only during elective blocks, except approved longitudinal electives.",
      "No retroactive enrollment. Late adds only in extraordinary cases, approved by both Academic and Student Affairs. Not registered means no credit, away electives included.",
      "All electives and Sub-Is are graded S/U whatever the host gives. A U can be remediated by a different elective; it then becomes SR. If you don't remediate, the U stays on the transcript.",
      "At most 2 Sub-Is in one specialty. Extra Sub-Is count toward electives. Nothing is double counted.",
      "An away rotation counts as a Sub-I only if its official title or description says sub-intern, acting intern or PGY-1 role. Students cannot create a Sub-I.",
      "Away electives need an affiliation agreement in place before credit is assigned; these can take months. Non-VSLO aways must be approved by the Electives Subcommittee before you enroll.",
      "No more than 3 clinical electives covering the same content; a fourth earns no credit.",
      "No credit for work with a family member or as paid employment (see APS-25).",
      "Concurrent clinical and non-clinical electives allowed only in good standing. While enrolled in BSE 680 and CLE 680, a concurrent elective may not exceed 72 hours a week (aim for 60). Absolute cap 80 hours a week.",
      "Elective blocks that include holidays may require full participation through the holiday. No electives more than 2 weeks before the University's spring term starts.",
      "One excused absence day per 4 weeks of elective; none in electives under 4 weeks. Expecting several absences means cancel or drop the elective."
    ],
    d: [
      { l: "Drop, cancel or change an elective", w: "At least 14 business days before it starts. Tell the elective director first, then the CI MED Registrar.", calc: "e_drop" },
      { l: "Submit a student-created elective proposal", w: "At least 30 business days before the period starts, to the Electives Subcommittee.", calc: "e_create" },
      { l: "Tell the course director and Registrar about your electives", w: "By December before your final (M4) year starts.", personal: "dec_before_fy" }
    ]
  },
  { c: "APS-31", t: "USMLE Step 1 and Step 2", g: "Progress and graduation",
    eff: "2026-07-06", rev: "2029-07-06", ph: ["pre", "ci", "fy", "loa"], u: BOX + "br7eehpkwzfmurroj6h0jkxw8z7iqxl2",
    s: "When you must sit Step 1 and Step 2 CK and what happens if you miss the school deadline. The page also links a version ‘effective February 1, 2026’ that sits behind a Box login.",
    r: [
      "Take Step 1 by the academic-calendar deadline, before the Clinical Immersion Year. In AY2026-27 that deadline is March 3, 2027.",
      "Joint-degree or external-degree students must pass Step 1 before starting that program, and pass Step 2 before a program that begins after the Clinical Immersion Year.",
      "Not taken or not passed by the deadline: you may continue the Clinical Immersion Year, but your graduation year may move and you may need a leave of absence after it (APS-9).",
      "Take Step 2 CK by the calendar deadline (July 31, 2026 for the Class of 2027). Missing it can move your graduation year and affect your residency application.",
      "Both exams must be passed inside the APS-33 time limits.",
      "Exceptions by written petition to SPPC after counseling."
    ],
    d: [
      { l: "Step 1 school deadline (AY2026-27)", w: "March 3, 2027", date: "2027-03-03" },
      { l: "Step 2 CK school deadline", w: "July 31 of the year before you graduate, going by the AY2026-27 calendar. Confirm in your own year's calendar.", personal: "step2_deadline" }
    ]
  },
  { c: "APS-33", t: "MD Degree Time Limitations", g: "Progress and graduation",
    eff: "2023-09-20", rev: "2026-09-20", ph: ["pre", "ci", "fy", "loa"], u: BOX + "uu2qrq7yghb1hhe2mwgxwxr5l8lxrbfp",
    s: "The two hard clocks: Step 1 passed within 3 years of matriculation, the MD within 6.",
    r: [
      "The MD is designed as 12 semesters over 4 years. Everything, Step 1 and Step 2 CK included, must be done within 6 years of matriculation (your first day of the first class).",
      "Time on a leave to earn another degree or a graduate certificate, and time spent mainly in graduate study as a joint-degree student, is excluded from the 6 years.",
      "Step 1 must be passed within 3 years of matriculation, and that clock includes leaves of absence.",
      "Going over either limit triggers SPPC review and possible dismissal.",
      "Extension: a written petition to the Associate Dean for Student Affairs explaining the extenuating circumstances (health, hardship, family), filed in time for SPPC."
    ],
    d: [
      { l: "Step 1 passed", w: "Within 3 years of matriculation, leaves included", personal: "step1_limit" },
      { l: "MD complete", w: "Within 6 years of matriculation, minus degree leave time", personal: "md_limit" }
    ]
  },
  { c: "APS-27", t: "Good Standing", g: "Progress and graduation",
    eff: "2023-11-09", rev: "2026-11-09", ph: ["pre", "ci", "fy", "loa"], u: BOX + "v8nxd2rolv9bfof96l08l0thi77jrqra",
    s: "What good standing requires, what you lose without it, and how to get it back. Away rotations, leadership roles and travel money all depend on it.",
    r: [
      "Requires: matriculation and clinical onboarding done; S, SR, Honors or an active remediation plan in every required course; passing or remediable OSCEs; Step exams sat and passed by the deadlines; no disciplinary censure; no SPPC letter of concern in your most recent phase; Satisfactory Academic Progress (TFA-1).",
      "Losing it ends your eligibility to hold student office or committee seats, take courses outside the BSE and CLE catalogs, take electives at other institutions, be nominated for awards, and anything else that requires good standing.",
      "SAP is checked at the end of each semester; SPPC reviews standing at the end of each phase.",
      "OSCR, OSFA or SPPC tells you what restores it: remediation, passing the Step exam, a SAP extension, finishing a suspension, or graduating with nothing outstanding."
    ],
    d: []
  },
  { c: "APS-36", t: "Elective Credit for Advanced Degrees", g: "Progress and graduation",
    eff: "2026-06-17", rev: "2029-06-17", ph: ["loa", "fy"], u: BOX + "rykq2r120wp8qpt4xwxygggzfv4gpbt9",
    s: "Lets students who earn a second degree during the MD swap it for some requirements.",
    r: [
      "Applies only to a Master's, PhD or other advanced degree started and finished after you matriculated. Degrees started or earned before matriculation don't count.",
      "If that degree required a capstone, thesis or dissertation, you may petition the Electives Subcommittee to waive the non-clinical elective requirement.",
      "PhD completers may petition the Engineering and Innovation Subcommittee to waive Data Science or Capstone, but must make up those credit hours with electives."
    ],
    d: []
  },
  { c: "APS-50", t: "Credit Hour Policy", g: "Progress and graduation",
    eff: "2026-03-16", rev: "2029-03-04", ph: ["pre", "ci", "fy"], u: BOX + "lzmdtk1zqyyuzkuc1jn5wr8qtc7hwp8r", fl: ["viewonly"],
    s: "How CI MED converts hours into credits. Downloads are disabled on Box; read in the viewer.",
    r: [
      "40 hours = 1 credit, 80 = 2, 120 = 3, 160 = 4, 200 = 5. Minimum 1 credit per course; no credit beyond a course's stated hours.",
      "Full-time is 12 credits in fall and spring and 6 in summer.",
      "The program is 222 weeks long against LCME's 130-week minimum. Longitudinal courses earn credit by term."
    ],
    d: []
  },

  /* ---------- Assessment and grading ---------- */
  { c: "APS-16", t: "Assessment, Assessment Completion and Grading", g: "Assessment and grading",
    eff: "2026-07-01", rev: "2029-07-01", ph: ["pre", "ci", "fy"], u: BOX + "bec18t34ukyxxgke9ta5jubhrzbxb3jc",
    s: "Every assessment type, what a missed one costs, the five permanent grades, and the clerkship grade-review window. Replaced the old APS-26 and APS-35 in July 2026.",
    r: [
      "Grades: S, SR (after remediation), U, Honors (clerkships only, criteria set so roughly 20% earn it) and W. Temporary: I (Incomplete; becomes U if the completion plan date passes) and DFR (placeholder).",
      "Pre-clerkship quizzes allow 3 attempts and keep the highest. TBL composite is 60% IRAT, 40% TRAT; a TBL missed without an approved absence scores zero.",
      "A midterm or final missed without an approved absence scores zero for that attempt; reassessment then follows APS-17.",
      "Three formative CBSE Progress Tests in BSE 666 are required but ungraded. Missing one without approval means a make-up and possibly a professionalism concern.",
      "OSCEs: you must pass every station, with up to 3 attempts per station. A missed OSCE without approval counts as one of the 3.",
      "Shelf exams: passing is the 5th national percentile or higher. A practice shelf is required around the clerkship midpoint. A shelf missed without an approved absence is a failed attempt.",
      "Honors shelf cutoffs may rise across blocks; clerkships can't change grading standards mid-year.",
      "Late assignments aren't accepted unless the syllabus says so. Anatomy table tests can't be made up; a missed lab practical retake is capped at 70%.",
      "BICEP vignettes written with AI must say so and include the prompts used.",
      "You may ask the clerkship director to review assessor scores and comments, on-time assignments, and your MSPE summary paragraph. You may not ask them to review NBME scores, zeros for late work, or missing required components (case logs, DOs, Aquifer)."
    ],
    d: [{ l: "Request a clerkship grade review", w: "In writing to the clerkship director, no later than 5 weeks after the clerkship ends.", calc: "grade_review" }]
  },
  { c: "APS-17", t: "Reassessment and Remediation", g: "Assessment and grading",
    eff: "2017-06-07", rev: "2028-07-16", ph: ["pre", "ci", "fy"], u: BOX + "yj1q29yo4o17g6q6yh9alqyyhhweko2f",
    s: "One retake, then remediation, then SPPC. Plan vacations and conferences around the retake windows.",
    r: [
      "Each course allows one retake of a failed summative written exam, in the academic-calendar window. You hold an I until it's done; passing restores S.",
      "OSCE stations get a second and third attempt.",
      "Late assignments give you an I. Finished inside the syllabus window: S. Finished outside it: SR at best. Never finished: U.",
      "Failing the retake, or never submitting, gives a U and a remediation plan. Success earns SR; failure goes to SPPC.",
      "Same structure for preclerkship courses, clerkships and project courses (IDEA, Data Science, Capstone)."
    ],
    d: [{ l: "Retake and reassessment dates", w: "AY2026-27 reassessment dates: 7/13/26, 9/28/26, 10/12/26, 1/4/27 (M1-M2 and M3), 6/7/27" }]
  },
  { c: "APS-13", t: "Summative Assessment", g: "Assessment and grading",
    eff: "2017-06-07", rev: "2026-09-20", ph: ["pre", "ci", "fy"], u: BOX + "sey8r4dtbd4nduf9vwmvbdgvlw6yf6fl",
    s: "Final grades are due to students within 4 weeks of the end of each course or clerkship.",
    r: ["Course and clerkship directors must release final grades within 4 weeks of completion; the Curriculum Oversight Committee monitors compliance."],
    d: [{ l: "Grade should be released", w: "Within 4 weeks of the course or clerkship end", calc: "grade_release" }]
  },
  { c: "APS-12", t: "Formative Feedback", g: "Assessment and grading",
    eff: "2017-07-07", rev: "2026-09-20", ph: ["pre", "ci"], u: BOX + "1pyqqdszixjjvdm8ybqa41jvsfzqeko6",
    s: "You are owed formal midpoint feedback in every required course or clerkship of 4 weeks or more.",
    r: [
      "Required courses and clerkships of 4+ weeks give formal formative feedback at or near the midpoint, from the director or a designee.",
      "Shorter courses must give some other way to gauge your progress."
    ],
    d: []
  },
  { c: "APS-18", t: "Narrative Assessment", g: "Assessment and grading",
    eff: "2018-03-09", rev: "2024-08-18", ph: ["pre", "ci"], u: BOX + "ixw0pfka2ivlvk8nkyv0et5nzp4p0czk",
    s: "When a course must include written narrative comments on your performance.",
    r: [
      "Required whenever contact allows it: PBL facilitation of 6+ hours with the same facilitator; small groups of 12 or fewer for 6+ hours; preceptorships with 3 or fewer students for 8+ hours.",
      "Directors decide which category their course falls in; the Curriculum Committee reviews."
    ],
    d: []
  },
  { c: "APS-47", t: "Assessment and Evaluation Completion and Confidentiality", g: "Assessment and grading",
    eff: "2024-10-21", rev: "2027-09-24", ph: ["pre", "ci", "fy"], u: BOX + "j5xiu4l2u4vmxahikee30925pev2lmb0",
    s: "Course evaluations and faculty assessments are mandatory and late ones become professionalism concerns.",
    r: [
      "Complete every evaluation and faculty or resident assessment within 1 week of a required course's end, including Data Science, Capstone and at least one Sub-I done at CI MED.",
      "Forms open 3 days before the course's last day and expire 3 weeks after it ends.",
      "Miss week 1: send the missing feedback as a narrative to the Director of Educational Assessment in week 2, and a formative professionalism concern (Reliability and Responsibility) is filed.",
      "Miss week 2 as well: a summative professionalism concern. Several incomplete forms: summative concerns at multiple levels.",
      "Your identity is withheld from faculty; mistreatment comments are flagged and reviewed."
    ],
    d: [
      { l: "Submit evaluations", w: "Within 1 week of the course end date", calc: "evals" },
      { l: "Narrative fallback", w: "During week 2 after the course end", calc: "evals2" }
    ]
  },

  /* ---------- Attendance and scheduling ---------- */
  { c: "APS-7", t: "Attendance, Absence and Vacation", g: "Attendance and scheduling",
    eff: "2026-03-09", rev: "2029-03-09", ph: ["pre", "ci", "fy"], u: BOX + "tg9qzc758m06sy35mlgf2ua4vgxmhhc2",
    s: "How many days you can miss, how far ahead to ask, and what happens when you go over. Requests go through go.medicine.illinois.edu/absence.",
    r: [
      "Planned absences: request at least 2 weeks ahead or they will likely be denied. Unplanned (illness, emergency): as soon as possible and no later than 72 hours after, or it may count as unexcused.",
      "Missing an exam needs supporting documentation within 5 business days of the exam, or you may fail it. Course directors answer requests within 3 business days; sick leave is auto-approved.",
      "Up to 2 hours for your own medical appointment, flagged to your team in advance, is not a day's absence.",
      "Non-clinical courses: excused absence from up to 20% of required sessions.",
      "Clinical courses (ICP, Career Boot Camp, all 7 clerkships, FMCC, Sub-Is, clinical electives): allowances are in each syllabus, from 1 day (Psychiatry) to 8 (ICP). Generally 1 per 5-week clerkship and 3 per 10-week clerkship. The first absence never needs making up.",
      "3 wellness days in the Clinical Immersion Year: at most 1 per clerkship, never on orientation day or in the last week, never combined to exceed 2 days in one week, requested 2 weeks ahead.",
      "Days missed beyond the allowance must be made up within 30 days of the end of the Clinical Immersion Year. Until then: I. After 30 days: U until made up, then S at best, never Honors.",
      "More than 8 ICP clinical-integration sessions or more than 14 days in M3: meeting with the Assistant or Associate Deans of Student and Academic Affairs.",
      "FMCC absences are made up on the same weekday. IDEA: no more than 20% of sessions in any 5-week block and 10% across the course; each session counts separately.",
      "Electives: 1 excused day per 4 weeks, none under 4 weeks.",
      "Some experiences must be made up even under the allowance (for example multiple deliveries on OB/GYN). Check each syllabus.",
      "Holidays on clinical rotations: MLK Day, Memorial Day, Juneteenth, July 4 (or the hospital's observed day), Labor Day, Thanksgiving Thursday through Sunday, Christmas Day, New Year's Day.",
      "Military service and jury duty don't count against your days, but long ones can shift graduation. Pregnancy and childbirth absences follow University Title IX policy.",
      "Unexcused absence can bring a professionalism report and grade impact. Emergencies: studentaffairs@medicine.illinois.edu, 217-300-9391."
    ],
    d: [
      { l: "Request a planned absence", w: "At least 2 weeks before it", calc: "absence" },
      { l: "Report an unplanned absence", w: "Within 72 hours after it", calc: "absence_after" },
      { l: "Documentation for a missed exam", w: "Within 5 business days of the exam", calc: "exam_doc" },
      { l: "Make up extra missed clinical days", w: "Within 30 days of the end of the Clinical Immersion Year", personal: "makeup_ci" }
    ]
  },
  { c: "APS-9", t: "Leave of Absence", g: "Attendance and scheduling",
    eff: "2026-02-01", rev: "2028-11-13", ph: ["loa", "pre", "ci", "fy"], u: BOX + "a6bkip1k3p6nnbag7jxtf8p4rh15d3tb",
    s: "Types of leave, who approves them, and the 60-day notice to come back.",
    r: [
      "Types: academic study, financial, health, administrative, personal (parental, family illness or death, divorce), career reconsideration, research or educational, and joint degree. Career reconsideration, research and joint-degree leaves require good standing.",
      "Request in writing with reasons, start and end dates, and contact information. Student Affairs works with the Registrar and Financial Aid on aid and insurance effects. Health leave needs medical documentation.",
      "The Dean can grant up to 1 year. SPPC must approve anything longer, any second leave, or leaves that add up to more than a year.",
      "SPPC is notified of any leave over 5 consecutive days of instruction, with a recommendation on changing your graduation date.",
      "On leave you can't hold CI MED leadership roles (joint-degree students excepted; under a semester may be allowed). Joint-degree leaves allow up to 12 MD credit hours.",
      "To return: a letter of intent to Student Affairs at least 60 calendar days before, with a plan for any deficiencies. Health and administrative leaves may require a fitness-for-duty exam and a provider letter.",
      "Not returning as planned can lead to a disciplinary hearing and dismissal."
    ],
    d: [{ l: "Letter of intent to return", w: "At least 60 calendar days before your return date", calc: "loa_return" }]
  },
  { c: "APS-37", t: "Away Rotation and Externship Eligibility", g: "Attendance and scheduling",
    eff: "2024-09-04", rev: "2027-09-06", ph: ["ci", "fy"], u: BOX + "b93sqom0ipkl0t4p5mg46uswhnmaugdh",
    s: "Who may rotate away. The key rule: every required clerkship graded before your first clinical away starts.",
    r: [
      "Clinical aways: good standing, S, SR or Honors in every required CI MED clerkship before the away starts, and the host's own requirements.",
      "An away Sub-I must have the Sub-I core features and be listed by the host as a Sub-I or acting internship; otherwise petition the Electives Subcommittee.",
      "Research or non-clinical aways: good standing, host requirements, fit the academic calendar and APS-7. External research in the summer between M1 and M2 must fit that enrollment window.",
      "Clinical Immersion students may ask Student Affairs to alter their clerkship track; no guarantee. Moving a clerkship to the start of year 4 can delay away eligibility."
    ],
    d: [{ l: "Earliest clinical away start", w: "After every required clerkship has a final grade of S, SR or H", personal: "away_ready" }]
  },
  { c: "APS-38", t: "Remote Participation", g: "Attendance and scheduling",
    eff: "2024-06-06", rev: "2027-06-06", ph: ["pre"], u: BOX + "7wlsbp5gax5eyiv3nmnpm7k498jsgqwh",
    s: "Lecture and small-group sessions only, by request, with documentation.",
    r: [
      "Request through the absence form at least 2 business days before the session, with documentation.",
      "Hands-on sessions (physical diagnosis, anatomy, simulation, clinical) can never be remote. Approved remote attendance needs camera and audio.",
      "Examples that qualify: pregnancy bedrest, infection isolation, presenting at an approved conference, DRES accommodation. Repeated requests may lead to a leave instead."
    ],
    d: [{ l: "Request remote participation", w: "At least 2 business days before the session", calc: "remote" }]
  },
  { c: "APS-48", t: "Student Contact Hours and Workload", g: "Attendance and scheduling",
    eff: "2024-02-07", rev: "2027-02-07", ph: ["pre"], u: BOX + "exv6a09jag7gxtpskxxfo61tj932dizr",
    s: "Weekly caps for non-clinical courses, ICP and Career Boot Camp.",
    r: [
      "Contact hours plus assigned prep: 50 hours a week at most. Contact hours alone: 32 a week at most. Travel to clinic sites isn't counted.",
      "At least two unscheduled 4-hour blocks each week for self-directed learning."
    ],
    d: []
  },
  { c: "APS-43", t: "Auditing Request", g: "Attendance and scheduling",
    eff: "2024-05-01", rev: "2027-04-03", ph: ["pre", "ci", "fy", "loa"], u: BOX + "tc8y8v9xci4pgmqjlr38c8icd6u6tl9f",
    s: "You can't audit CI MED courses; you can audit other UIUC courses with the Dean's approval.",
    r: [
      "No BSE or CLE course may be audited.",
      "UIUC courses: file an Auditor's Permit by the 10th day of the course and get written approval from the CI MED Dean."
    ],
    d: [{ l: "Auditor's Permit for a UIUC course", w: "By the 10th day of the course" }]
  },

  /* ---------- Clinical work ---------- */
  { c: "APS-49", t: "Student Clinical Duty and Educational Hours", g: "Clinical work",
    eff: "2024-02-07", rev: "2027-02-07", ph: ["ci", "fy"], u: BOX + "6ew79hvveg3z8faf8ty9g5ifwn3joe65",
    s: "ACGME-style duty hour limits for every clinical course.",
    r: [
      "80 hours a week averaged over 4 weeks, counting in-house work, scheduled education and clinical work from home.",
      "No more than 16 continuous hours in required clinical courses. Sub-Is and ICU electives may use 24-hour shifts if the syllabus says so.",
      "8 hours off between shifts; 1 day off in 7 or 2 in 14 (exam and teaching days don't count as off).",
      "No overnight call the night before an exam or performance assessment.",
      "Rare exceptions, often at the student's request (a case, a conference, a wedding); regular exceptions need the Associate Dean for Academic Affairs."
    ],
    d: []
  },
  { c: "APS-28", t: "Clinical Oversight", g: "Clinical work",
    eff: "2019-07-17", rev: "2025-11-15", ph: ["pre", "ci", "fy"], u: BOX + "9p1sfkhznq2tcswcb0ahdwf1xyir33kg",
    s: "Who may supervise you and what you may do at each stage.",
    r: [
      "Preclerkship: always supervised (direct, or indirect with direct immediately available). You may take histories, examine, document and observe surgery with consent. No written or verbal orders.",
      "Clerkship: you may take part in care and procedures under supervision with patient permission, document, and enter EMR orders that a licensed clinician co-signs. Never verbal orders.",
      "Residents, fellows, NPs, PAs and CRNAs may supervise as delegates of the attending, who keeps overall responsibility."
    ],
    d: []
  },
  { c: "APS-29", t: "Dress Code", g: "Clinical work",
    eff: "2024-05-01", rev: "2027-04-03", ph: ["pre", "ci", "fy"], u: BOX + "dp67cxqwezwyb2n1zo92dhzt1tbs31v3",
    s: "Applies to every real or simulated patient encounter.",
    r: [
      "ID badge visible above the waist at all times. White coat unless the syllabus or supervising faculty says otherwise (some psychiatry placements).",
      "Closed-toe shoes; no athletic leggings, sheer or tank tops, torn clothing. Offensive tattoos covered. Headgear only for religious reasons; headphones only with a DRES accommodation.",
      "Nails short with no artificial enhancements; scented products discouraged. A medical exception needs a clinician's note."
    ],
    d: []
  },
  { c: "APS-32", t: "Clinical Activities During Epidemics", g: "Clinical work",
    eff: "2020-03-11", rev: "2025-02-02", ph: ["ci", "fy"], u: BOX + "25d9yq877wkfr39gnvm8i6dvzzignrqa",
    s: "Your role with patients during a declared epidemic depends on your stage. Written for an older curriculum structure.",
    r: [
      "Clerkship students don't see suspected epidemic cases alone; faculty may bring you with adequate PPE.",
      "Sub-I, EM and ICU students may care for those patients with PPE. Away rotations follow whichever policy is stricter.",
      "You may request a leave if you're not comfortable continuing; high-risk students meet Student and Academic Affairs to adjust experiences."
    ],
    d: []
  },
  { c: "APS-25", t: "Paid Training Opportunity", g: "Clinical work",
    eff: "2024-05-01", rev: "2027-04-03", ph: ["fy", "loa"], u: BOX + "to7y5g6qia9wr8zq3e9ozuxtyfp1if2d",
    s: "No academic credit for paid work, with one exception for distant placements.",
    r: [
      "Paid internships and training earn no credit.",
      "If the opportunity is more than 50 miles from campus, a stipend for living and travel is allowed, and credit is possible if you register it as an elective under APS-30."
    ],
    d: []
  },

  /* ---------- Professionalism and conduct ---------- */
  { c: "APS-4", t: "Statement on Student Professionalism", g: "Professionalism and conduct",
    eff: "2017-06-07", rev: "2026-12-06", ph: ["pre", "ci", "fy", "loa"], u: BOX + "0u71qxrkztq0ov88dnml8uwctyd81grr",
    s: "The 14 attributes you are assessed on throughout school. The bar rises as you advance.",
    r: [
      "Patient-centered care; tolerance; competence; resource stewardship; managing conflicts of interest; prudent use of technology; involvement in the profession; integrity; interpersonal respect; initiative; dependability; attitude; composure under stress; appearance.",
      "Lateness might be a teaching moment for a new M1 and is not tolerated in an M3 with patient care duties. Cheating is never tolerated.",
      "Concerns reach SPPC through course performance, professionalism forms or outside records such as police reports. Outcomes range from remediation to dismissal.",
      "You also remain bound by the Student Code, HIPAA, the Student Handbook and the teacher-learner compact."
    ],
    d: []
  },
  { c: "APS-5", t: "Reporting Student Professionalism", g: "Professionalism and conduct",
    eff: "2024-06-06", rev: "2027-06-06", ph: ["pre", "ci", "fy"], u: BOX + "udtrutx0wdcucxtwoj64w7r0oil8em94",
    s: "How professionalism reports are filed, when they reach your MSPE, and how to respond.",
    r: [
      "Anyone may file a positive or concern report, anonymously or named (go.illinois.edu/med-professionalism).",
      "3 or more exemplary reports: mentioned in your MSPE.",
      "A substantiated concern reaches the MSPE if it is egregious (safety risk, academic-integrity or legal violation) or a pattern: 3 citations preclinical; 2 preclinical plus 1 later; or 2 after the preclinical phase. Those cases go to SPPC, and an MSPE addendum is sent if it's already out.",
      "You have 10 business days to submit a written response to a citation. Appeal to the Executive Vice Dean within 5 business days of the finding.",
      "Retaliation against a reporter is prohibited; report it to the Associate Dean for Student Affairs."
    ],
    d: [
      { l: "Written response to a professionalism citation", w: "Within 10 business days", calc: "prof_resp" },
      { l: "Appeal a professionalism finding", w: "Within 5 business days of the finding", calc: "prof_appeal" }
    ]
  },
  { c: "APS-1", t: "Disciplinary Action and Dismissal", g: "Professionalism and conduct",
    eff: "2018-01-01", rev: "2023-11-11", ph: ["pre", "ci", "fy", "loa"], u: BOX + "x59whho43zp4afqutvkodlnfeyghqtyj",
    s: "SPPC runs discipline and dismissal and must give you due process.",
    r: [
      "Grounds: academic difficulty, professionalism violations, other behavior, or inability to meet the technical standards even with accommodation.",
      "Due process: notice before any hearing, conflicted members recused, appeal under APS-14. University-level discipline runs separately through OSCR."
    ],
    d: []
  },
  { c: "APS-14", t: "Academic Appeals, Grievances and Petitions", g: "Professionalism and conduct",
    eff: "2024-03-14", rev: "2027-03-14", ph: ["pre", "ci", "fy", "loa"], u: BOX + "bq7yo19qoxqi7gicq6kxzu8rbxdo2tzq",
    s: "How to contest an SPPC decision on promotion, graduation eligibility or dismissal. Short windows.",
    r: [
      "Petition (ask SPPC to apply a policy differently): within 10 business days of the decision. One petition per policy or decision.",
      "Appeal (reconsider a petition or SPPC decision): within 5 business days.",
      "Grievance (SPPC didn't follow procedure): within 5 business days.",
      "Appeals and grievances need one of: a procedural deviation that seriously prejudiced you; a decision out of line with precedent; new information that makes the violation substantially less likely.",
      "Individual grade disputes go through the campus capricious-grading process in the Student Code. Details are in the SPPC Procedures document in the Student Handbook."
    ],
    d: [
      { l: "Petition SPPC", w: "Within 10 business days of the decision", calc: "petition" },
      { l: "Appeal or grievance", w: "Within 5 business days", calc: "appeal" }
    ]
  },
  { c: "APS-22", t: "Withdrawal, Temporary Removal and Suspension", g: "Professionalism and conduct",
    eff: "2024-10-25", rev: "2027-10-25", ph: ["pre", "ci", "fy", "loa"], u: BOX + "svavfm6o0olg39pscl8yumsslyeko1yw",
    s: "Voluntary withdrawal, removal for safety or impairment concerns, and suspension.",
    r: [
      "Withdrawal: written request to the Associate Dean for Student Affairs with an effective date. Not final until SPPC approves; coming back means reapplying.",
      "Temporary removal: the Dean's designees may remove you at once after a safety or impairment report, then meet with you by the next business day. Skipping that meeting risks dismissal.",
      "A significant finding can require a fitness-for-participation evaluation at your expense, a referral for involuntary withdrawal, or interim suspension. Removal can delay graduation."
    ],
    d: []
  },
  { c: "APS-2", t: "Learning Environment and Mistreatment", g: "Professionalism and conduct",
    eff: "2024-06-06", rev: "2027-06-06", ph: ["pre", "ci", "fy"], u: BOX + "tfy7giwzyymn5m6q6zaer722kgozbbfj",
    s: "What counts as mistreatment, how to report it, and your duty to report conflicts of interest.",
    r: [
      "Mistreatment includes discrimination (microaggressions too), harassment or public humiliation, exclusion from patient care for non-educational reasons, requests for personal services, grading on improper criteria or threats to, an evaluator's undisclosed conflict of interest, and retaliation.",
      "Report to any senior administrator, Student or Academic Affairs, course evaluations, or go.illinois.edu/med-mistreatment (can be anonymous). Sex-based: Title IX, titleixcoordinator@illinois.edu, 844-616-7978. Discrimination: Office for Access and Equity.",
      "Report a conflict of interest right away to the ADSA, the ADAA or the Director of the Learning Environment; if unresolved, file a mistreatment report. The ombudsperson can help. Example: a doctor who treated you later grading you."
    ],
    d: []
  },
  { c: "APS-46", t: "Process for Reporting Student Mistreatment", g: "Professionalism and conduct",
    eff: "2024-04-01", rev: "2027-02-15", ph: ["pre", "ci", "fy"], u: BOX + "um544cwq5sdq0bx0hdx51vxxioj038d6",
    s: "What happens after you report, and the timelines the school owes you.",
    r: [
      "The intake officer (ombudsperson or Director of the Learning Environment; the Executive Vice Dean if both are conflicted) acknowledges a named report within 2 business days.",
      "If there's an investigation, you get an update within 10 business days. Standard: more likely than not.",
      "Discrimination by employees goes to OAE (217-333-0885, eeodivision@illinois.edu); sexual misconduct to Title IX (844-616-7978). Confidential advisors are listed on We Care.",
      "A student accused of mistreating a peer has 14 calendar days to review and respond."
    ],
    d: [
      { l: "School acknowledges your report", w: "Within 2 business days" },
      { l: "Investigation update", w: "Within 10 business days" },
      { l: "Respond if a peer reports you", w: "Within 14 calendar days of notice", calc: "mistreat_resp" }
    ]
  },
  { c: "APS-3", t: "Nondiscrimination", g: "Professionalism and conduct",
    eff: "2017-01-04", rev: "2024-01-17", ph: ["pre", "ci", "fy", "loa"], u: BOX + "0b01ohvl15clp8ffw73y1ty3akxrfkeh",
    s: "CI MED adopts the University's nondiscrimination policy (HR-48).", r: ["See cam.illinois.edu/policies/hr-48 for the University policy."], d: []
  },
  { c: "APS-15", t: "Intellectual Property Created by Students", g: "Professionalism and conduct",
    eff: "2018-02-26", rev: "2019-02-26", ph: ["pre", "ci", "fy", "loa"], u: BOX + "508k3pf2ydm4ye95beeej4e4qggka3ny",
    s: "Who owns what you invent in school. Read it before an IDEA, Capstone or Data Science project turns into a product.",
    r: [
      "Follows the UIUC Office of Technology Management student ownership guidelines; each course sets its own IP guidelines before it starts.",
      "If a faculty member, University employee or Carle employee contributes enough to be a co-inventor under patent law, the invention is jointly owned with the University and/or Carle under their research agreement.",
      "Read OTM's inventor's handbook (otm.illinois.edu)."
    ],
    d: []
  },
  { c: "FS-6", t: "Industry Relations", g: "Professionalism and conduct",
    eff: "2020-02-25", rev: "2023-02-24", ph: ["pre", "ci", "fy", "loa"], u: BOX + "86tk7sfzop244pgb8b0z49y6mj0tzkab",
    s: "Its header lists faculty and staff, but its text covers students as ‘CI MED Personnel’, on and off campus, in and out of work hours. Relevant to consulting, advisory boards and startups.",
    r: [
      "‘Industry’ includes pharma, biotech, device, data analytics and equipment companies. Owning stock or mutual funds isn't a conflict.",
      "No personal gifts from industry of any value: no branded items, tickets or free meals, on or off campus. Food at ACCME-accredited programs or paid-registration society meetings is fine.",
      "Consulting, advisory boards, industry-funded talks and Significant Financial Interests (US$10,000 or more) are allowed only if not purely commercial or marketing, and must be approved in advance by your supervisor plus a department head, the ADAA, the Dean or a designee.",
      "Over US$10,000 a year from one company: annual reports to the Dean's office. Purely commercial consulting and speakers' bureaus are banned.",
      "No use of CI MED or University names or logos for industry without written approval. Industry meetings involving students only for education and under faculty supervision.",
      "Industry internships for pay or credit: see APS-25."
    ],
    d: []
  },
  { c: "SL-2", t: "Criminal Background Check", g: "Professionalism and conduct",
    eff: "2026-03-19", rev: "2029-03-18", ph: ["app", "pre", "ci", "fy"], u: BOX + "pcnu3efvagphyjatzpre8340v5sgdze6",
    s: "AAMC background check before matriculation plus a fingerprint check. New information while enrolled can still matter.",
    r: [
      "Accepted applicants complete the AAMC background check; matriculants complete an Illinois State Police and FBI fingerprint check before orientation, at their own cost.",
      "A conviction doesn't automatically disqualify; a standing committee decides with University counsel.",
      "Discrepancies with your application, or new incidents after admission, can lead to dismissal."
    ],
    d: []
  },
  { c: "APS-40", t: "Student Listservs", g: "Professionalism and conduct",
    eff: "2021-03-18", rev: "2024-03-18", ph: ["pre", "ci", "fy"], u: BOX + "kn7em5gky272xwhd98l2nv8qs8x4hbwf",
    s: "Class listservs carry curricular and administrative messages only, moderated by Student Affairs.",
    r: ["Club and social announcements belong on student-government channels."], d: []
  },

  /* ---------- Records and rights ---------- */
  { c: "APS-45", t: "Medical School Performance Evaluation (MSPE)", g: "Records and rights",
    eff: "2026-03-30", rev: "2028-11-03", ph: ["fy", "ci"], u: BOX + "ydtjyhv0z9vva7sxwzru48yob1t6s8u1",
    s: "What goes in your MSPE, who writes it, and the dates you control.",
    r: [
      "Written by Student Affairs in your final year after a meeting with you; released on or after the fourth Wednesday of September for ERAS.",
      "Up to 3 noteworthy characteristics, co-written with Student Affairs (who has the final word). Up to 3 IDEA project descriptions of 2 sentences or fewer, and up to 3 CI MED or University awards.",
      "Clerkship grade graphs compare you with the cohort year in which you completed the coursework, not your graduation class.",
      "Electives are not in the MSPE. All leaves, adverse actions and remediations are.",
      "You may ask for a different MSPE writer in writing by July 1 of your M4 year, and you review the draft for factual errors before it's sent.",
      "Addenda follow for factual corrections or professionalism updates, and for re-applicants.",
      "Distinguished service learning (SL-5) can add a comment."
    ],
    d: [
      { l: "Ask for a different MSPE writer", w: "By July 1 of your M4 year", personal: "mspe_writer" },
      { l: "MSPE released to programs", w: "Fourth Wednesday of September before graduation", personal: "mspe_release" }
    ]
  },
  { c: "APS-11", t: "Access to Student Records", g: "Records and rights",
    eff: "2018-02-21", rev: "2030-02-02", ph: ["pre", "ci", "fy", "loa"], u: BOX + "agivia304cijt4b1otw6vccvzmvilo06",
    s: "Your official record lives in CIRIMS; you can't log in to it, but you can review it on request.",
    r: [
      "CIRIMS is the official record (directory, academic history, schedules, professionalism documents, remediation plans, advising notes). Students get no direct access.",
      "Ask in writing at registrar@medicine.illinois.edu. Answer within 45 days; once approved you have 7 business days to review it in person.",
      "Immunizations, BLS and drug screens sit in Medicat, visible only to the Registrar and the Medical Records Officer. Mental-health records are separate (SWH-4).",
      "Parents or others may see your record only with your written, in-person request. Corrections: Registrar, then Dean, then a FERPA hearing panel."
    ],
    d: [{ l: "Registrar responds to a records request", w: "Within 45 days" }]
  },
  { c: "APS-41", t: "Records Retention", g: "Records and rights",
    eff: "2024-08-13", rev: "2027-02-17", ph: ["pre", "ci", "fy", "loa"], u: BOX + "ickr2z0aronkz74owvvu3pucfzwtg9h4",
    s: "How long each piece of your file is kept.",
    r: [
      "75 years: enrollment and leave dates, dismissal or withdrawal records, USMLE scores, MSPE, promotion committee letters, ID photos.",
      "7 years from the final decision: academic warnings and disciplinary records.",
      "5 years: advising records, clerkship information, signed documents, appeals and grievances.",
      "CVs and publications: 1 month after graduation. CI MED recommendation letters: 2 years."
    ],
    d: []
  },

  /* ---------- Health and compliance ---------- */
  { c: "AM-6", t: "Technical Standards", g: "Health and compliance",
    eff: "2024-06-06", rev: "2027-06-06", ph: ["pre", "ci", "fy", "app"], u: BOX + "8oukuoq13mrwn3jmsgo2bf58hjhq7unu",
    s: "The abilities required to enter, progress and graduate, with or without accommodation. You attest to them every year.",
    r: [
      "Annual attestation through the online portal.",
      "Five areas: observation; communication; clinical skills; intellectual, conceptual and integrative skills; behavioral and social attributes.",
      "Meeting them doesn't guarantee you meet any residency's requirements. Accommodations go through DRES."
    ],
    d: [{ l: "Technical standards attestation", w: "Every year", recurring: "annual" }]
  },
  { c: "APS-34", t: "Accommodation", g: "Health and compliance",
    eff: "2025-01-24", rev: "2028-01-23", ph: ["pre", "ci", "fy"], u: BOX + "fokq4zqcv0vuhbwt5e8ory752rgtfjiy",
    s: "DRES decides accommodations; CI MED needs your letter 4 weeks ahead.",
    r: [
      "Apply to DRES as early as possible, then give the DRES letter to the Associate Dean for Student Affairs.",
      "Letters are needed at least 4 weeks before the curricular event so clinical sites can be arranged.",
      "USMLE accommodations are requested directly from NBME. Appeals and employment accommodations go through OAE; Title IX supportive measures are separate."
    ],
    d: [{ l: "DRES letter to Student Affairs", w: "At least 4 weeks before the event", calc: "dres" }]
  },
  { c: "SWH-5", t: "Immunizations", g: "Health and compliance",
    eff: "2024-12-06", rev: "2027-12-05", ph: ["pre", "ci", "fy", "loa", "app"], u: BOX + "mgoxjqpdt18xwn6caqahcfumz4adtwmt",
    s: "What you must keep current to stay in clinical work.",
    r: [
      "Annual: influenza vaccine in flu season, and a TB test (1-step skin test or QuantiFERON) or yearly symptom review if you were positive before.",
      "Tdap: one dose required; the last tetanus-containing dose within 10 years of matriculation, then a booster every 10 years.",
      "COVID-19 up to date with CDC guidance. Hepatitis B series plus titer; MMR and varicella by 2 doses or positive titers. Meningococcal only if 21 or younger.",
      "Reminders arrive 60, 30 and 15 days before an item expires. New requirements come with at least 30 days' notice.",
      "Clinical sites may add a 5-panel drug screen, BLS and mask fit testing.",
      "Lapsed items can stop you starting or continuing clinical work. On leave you're exempt but must be compliant before returning. Exemptions: medical (McKinley reviews), pregnancy, religious (helpdean@illinois.edu)."
    ],
    d: [
      { l: "Flu vaccine", w: "Each flu season", recurring: "annual" },
      { l: "TB test or symptom review", w: "Every year", recurring: "annual" },
      { l: "Td or Tdap booster", w: "Every 10 years" }
    ]
  },
  { c: "SWH-9", t: "Student Exposure", g: "Health and compliance",
    eff: "2024-05-16", rev: "2027-05-16", ph: ["pre", "ci", "fy"], u: BOX + "4wnjp7gko4no2j4bnpp4mdjmpkj4yxfo",
    s: "Needlestick or splash: what to do in the first 2 hours, 24 hours and 90 days.",
    r: [
      "Right away: first aid at the site, tell your supervising clinician, write down exactly what happened.",
      "Within 2 hours: risk evaluation by occupational medicine or the ED (labs, prophylaxis).",
      "Within 24 hours: tell Student Affairs (studentaffairs@medicine.illinois.edu, 217-244-9061). McKinley Dial-a-Nurse: 217-333-2700, option 2.",
      "CI MED reimburses up to US$2,000 of out-of-pocket costs for care in the first 72 hours; claims within 90 days. Later costs are yours and your insurer's."
    ],
    d: [
      { l: "Risk evaluation", w: "Within 2 hours of exposure" },
      { l: "Notify Student Affairs", w: "Within 24 hours" },
      { l: "Reimbursement claim (up to US$2,000)", w: "Within 90 days", calc: "exposure_claim" }
    ]
  },
  { c: "SWH-4", t: "Counseling and Wellness", g: "Health and compliance",
    eff: "2026-04-03", rev: "2029-04-02", ph: ["pre", "ci", "fy", "loa"], u: BOX + "u2na2ohuwlcd1uo8kcpjcnlf4ozz76ac",
    s: "Free, confidential therapy inside CI MED, walled off from grading and promotion.",
    r: [
      "Short-term therapy (typically 8 to 12 sessions) with the Director of Student Wellness at no cost; wellness@medicine.illinois.edu. Walk-in emergency triage during business hours.",
      "Eligible: registered MD students, including on approved leave. Out of state, telehealth only with a PSYPACT provider.",
      "Wellness clinicians never write absence notes or take part in progress or promotion decisions. Records are kept up to 10 years and aren't part of your academic record.",
      "Cancel 24 hours ahead; repeated no-shows can end care."
    ],
    d: []
  },
  { c: "SWH-8", t: "Health Providers Can't Assess You", g: "Health and compliance",
    eff: "2024-08-22", rev: "2027-08-22", ph: ["pre", "ci", "fy"], u: BOX + "ayppuzpeu60cufgcecdic1doq28dnph0",
    s: "Anyone who has treated you must recuse from grading you.",
    r: ["They may still teach you. Tell Student Affairs early if a provider ends up on your team (217-300-9391)."], d: []
  },
  { c: "SWH-6", t: "Professional Liability Insurance", g: "Health and compliance",
    eff: "2024-04-17", rev: "2027-03-26", ph: ["pre", "ci", "fy"], u: BOX + "f6tv8d817xkzfnr3uf6fvdqiuund6sl9",
    s: "You're covered when doing assigned school work. Volunteering outside approved activities isn't covered.",
    r: [
      "Covered under the University self-insurance plan while acting within assigned duties: US$1 million per occurrence and US$3 million aggregate at non-University sites.",
      "Healthcare volunteering that isn't a required or approved school activity is not covered. Tell the clinic or physician that."
    ],
    d: []
  },
  { c: "SWH-7", t: "Health and Disability Insurance", g: "Health and compliance",
    eff: "2018-02-23", rev: "2024-11-04", ph: ["pre", "ci", "fy", "loa"], u: BOX + "45m3sp6aw8yl9pe8yz7vg2xev051uq2x",
    s: "Health insurance is mandatory; the University plan can be waived each semester.",
    r: [
      "Waive the Health Insurance Fee during the Insurance Enrollment Change Period with equivalent coverage that is in force on the plan's first day.",
      "Fees: health service fee each semester (McKinley and the Counseling Center), health insurance fee each semester (waivable), long-term disability fee each summer."
    ],
    d: [{ l: "Insurance waiver", w: "During each semester's Insurance Enrollment Change Period" }]
  },
  { c: "SWH-1", t: "Alcohol and Controlled Substances", g: "Health and compliance",
    eff: "2017-10-30", rev: "2022-09-12", ph: ["pre", "ci", "fy"], u: BOX + "e3qdaiple81bgmoot3w0bvczde9zr5cr",
    s: "University alcohol and drug policy extended to clinical sites. Cannabis banned on University and clinical property despite state law.", r: [], d: []
  },
  { c: "SWH-3", t: "Drug Testing", g: "Health and compliance",
    eff: "2024-12-06", rev: "2027-12-05", ph: ["app", "pre", "ci", "fy"], u: BOX + "nbxp7nv0qvxamr0gfnejsd0vmf8z0omx",
    s: "Pre-matriculation 5-panel screen, plus for-cause testing at any time.",
    r: [
      "For cause: reasonable suspicion, use or possession on campus or at a clinical site, or illicit use at any time.",
      "Refusing is cited as unprofessional and suspends participation. Clinical sites may forbid cannabis even off-site and legal."
    ],
    d: []
  },
  { c: "SWH-2", t: "Tobacco", g: "Health and compliance",
    eff: "2024-12-06", rev: "2027-12-05", ph: ["pre", "ci", "fy"], u: BOX + "gs5sb3i96a8zmynzigvagcvkjrqfbhyi",
    s: "No smoking or vaping anywhere on campus or Carle property, parking lots and vehicles included; 100 feet from any Carle entrance.", r: [], d: []
  },

  /* ---------- Money and support ---------- */
  { c: "TFA-1", t: "Satisfactory Academic Progress", g: "Money and support",
    eff: "2018-02-20", rev: "2024-11-04", ph: ["pre", "ci", "fy", "loa"], u: BOX + "t8xj5eps5fqm5r7qrw98s0vvsezkf18y",
    s: "Financial aid progress check, applied whether or not you take aid. The actual thresholds live on the OSFA website, not in the policy.",
    r: [
      "OSFA reviews progress at the end of every semester.",
      "Not meeting SAP: a warning semester with aid intact, then possible loss of federal, state and institutional aid. Written appeal per OSFA."
    ],
    d: [{ l: "SAP review", w: "End of each semester" }]
  },
  { c: "SL-3", t: "Student Travel Scholarship", g: "Money and support",
    eff: "2024-03-06", rev: "2027-03-06", ph: ["pre", "ci", "fy"], u: BOX + "i50p1evnonyvp6axsbbaztwap9ujf92a",
    s: "US$100 to US$1,500 toward presenting at a domestic conference. Apply the quarter before you travel.",
    r: [
      "Eligible: enrolled, good standing, an author presenting work done with CI MED or UIUC faculty or students (or serving as a school delegate), maker-coin travel funds already used, course or clerkship director approval plus an absence request.",
      "Deadlines: June 20 for July to September travel; September 20 for October to December; December 20 for January to March; March 20 for April to June. One award per quarter.",
      "No international travel and no attend-only trips. Hotel capped at US$250 a night unless it's the conference hotel; poster printing capped at US$70.",
      "Within 10 business days after travel: receipts and your research output (medicine.illinois.edu/research/submit-student-research). Unused funds refunded within 10 business days. Awards count as financial aid."
    ],
    d: [
      { l: "Travel scholarship application", w: "June 20, September 20, December 20, March 20", recurring: "travel" },
      { l: "Receipts and research output", w: "Within 10 business days after travel", calc: "travel_receipts" }
    ]
  },
  { c: "SL-4", t: "Student Publishing Fund", g: "Money and support",
    eff: "2024-03-12", rev: "2027-03-06", ph: ["pre", "ci", "fy"], u: BOX + "v24norzn5wyhti5bdpxeq82ith340psb",
    s: "Up to US$1,500 toward a first-author paper's fees. 20 awards a year, one per student.",
    r: [
      "First author, good standing, maker-coin publishing funds already used, request filed before you submit the manuscript.",
      "Not for work funded by a CI MED faculty grant, or research done at an outside institution with an outside collaborator.",
      "Peer-reviewed, indexed journals; priority to CI MED and then UIUC faculty collaborations. Paid to the journal after acceptance.",
      "Deposit the paper in IDEALS and submit it to CI MED within 10 business days of publication."
    ],
    d: [{ l: "Publishing fund request", w: "Before manuscript submission" }]
  },
  { c: "SL-5", t: "Community Service and Service-Learning", g: "Money and support",
    eff: "2024-07-01", rev: "2017-07-01", ph: ["pre", "ci", "fy"], u: BOX + "y5jwxsckllnq9gyie5fez3lyzbsu702y",
    s: "Hours toward a graduation cord and an ERAS award line. Class of 2028 and later need the full totals.",
    r: [
      "75 service-learning hours: a designation in the ERAS awards section. 100 hours: a cord at convocation. Classes of 2025 to 2027 had prorated targets.",
      "Hours must come from at least 5 events, pre-registered and approved by the service-learning office. Required course service (FM clinical, the SL elective) doesn't count.",
      "Service-learning needs a reflection, submitted on the SL intranet page within 30 days of the event. Community service needs a form.",
      "Hours from before CI MED can be recorded but don't count toward recognition."
    ],
    d: [{ l: "Service-learning reflection", w: "Within 30 days of the event", calc: "sl_reflect" }]
  },

  /* ---------- Admissions (applicants) ---------- */
  { c: "AM-1", t: "Admissions", g: "Admissions", eff: "2024-11-19", rev: "2027-11-19", ph: ["app"], u: BOX + "n07ly2plt8abbxy835cbr6b1zd3pv3se",
    s: "Applicant eligibility: AMCAS, MCAT 498 or higher within 3 years, US citizen or permanent resident, a bachelor's degree, 3 to 4 letters. No transfers.", r: [], d: [] },
  { c: "AM-2", t: "Admission Competency", g: "Admissions", eff: "2024-01-17", rev: "2026-10-17", ph: ["app"], u: BOX + "6495j1szf6lsjqtjatemtulb0tace3km",
    s: "Academic preparation expected of applicants; any major from an accredited institution.", r: [], d: [] },
  { c: "AM-3", t: "Defer", g: "Admissions", eff: "2018-05-15", rev: "2026-10-17", ph: ["app"], u: BOX + "3o2t9vgxvv20pa3nn15o09qzggwbbnow",
    s: "One-year deferral: request by May 1 (500 words max), decision by end of May, letter of intent by January 15. Scholarships don't carry over; no other applications.", r: [], d: [] },
  { c: "AM-4", t: "Multiple Admissions", g: "Admissions", ph: ["app"], u: BOX + "yd99b9mq2xkklbu65h9macoq0qoj4g22", fl: ["dead"],
    s: "The link on the policy page returns ‘not found’.", r: [], d: [] },
  { c: "AM-5", t: "Prescreening", g: "Admissions", ph: ["app"], u: BOX + "tmnw8387wexpkvtdy9vciew9wy8zz0qj", fl: ["dead"],
    s: "The link on the policy page returns ‘not found’.", r: [], d: [] },
  { c: "GS-1", t: "Joint MD/Graduate Admissions", g: "Admissions", ph: ["loa"], u: "https://uofi.app.box.com/folder/345185704135", fl: ["login"],
    s: "Posted as a Box folder that asks for a login, so its text could not be read.", r: [], d: [] },

  /* ---------- Faculty and staff ---------- */
  { c: "FS-1", t: "Clinical Non-Tenure Faculty", g: "Faculty and staff", eff: "2024-08-06", rev: "2027-08-06", ph: ["fac"], u: BOX + "hutk2t0ndsm8tffliz80vizk8yprxaim",
    s: "Appointment and promotion of non-tenured clinical faculty. Faculty are assessed partly on completing student evaluations.", r: [], d: [] },
  { c: "FS-4", t: "Clinical Tenure Track Research Faculty", g: "Faculty and staff", eff: "2019-03-13", rev: "2025-08-02", ph: ["fac"], u: BOX + "uqt7ijns70u1gbx0ko47qc1sdcgl407g",
    s: "Appointment and promotion of clinical tenure-track research faculty.", r: [], d: [] },
  { c: "FS-5", t: "Policy on Policies", g: "Faculty and staff", eff: "2019-06-20", rev: "2024-12-16", ph: ["fac", "pre", "ci", "fy"], u: BOX + "yze01bl72lt2gdhggavjal49v0cg9wj8",
    s: "How policies are drafted and approved. States that every policy can change at any time, with or without notice.", r: [], d: [] },
  { c: "FS-7", t: "Continuous Quality Improvement", g: "Faculty and staff", eff: "2024-08-13", rev: "2027-02-14", ph: ["fac"], u: BOX + "8u2gqy72zw9ggde9qsl4z0ga7pn357su",
    s: "The CQI committee monitors accreditation standards. It seats M1 through M4 student representatives.", r: [], d: [] },
  { c: "FS-13", t: "Diversity, Equity and Inclusion", g: "Faculty and staff", eff: "2024-03-06", rev: "2027-03-06", ph: ["fac"], u: BOX + "8pyco8pjfazhfskfguqt3tmjcgfps8p3",
    s: "College DEI commitments for faculty, staff and students.", r: [], d: [] },
  { c: "FS-14", t: "BMTS Faculty Promotion", g: "Faculty and staff", ph: ["fac"], u: "https://uofi.app.box.com/file/1606325557456", fl: ["notread"],
    s: "Faculty-only; not extracted.", r: [], d: [] },
  { c: "FS-15", t: "BMTS Faculty Review", g: "Faculty and staff", eff: "2024-07-02", rev: "2027-07-02", ph: ["fac"], u: BOX + "1ko81togga6rla9kk1ludni8j0bsyasm",
    s: "Annual review of Biomedical and Translational Sciences faculty.", r: [], d: [] },
  { c: "FS-16", t: "BMTS Faculty Appointment", g: "Faculty and staff", ph: ["fac"], u: "https://uofi.app.box.com/file/1606314772057?s=hgbpy8vj7h9msd3gj2lyvzbfq0m4839u", fl: ["notread"],
    s: "Faculty-only; not extracted.", r: [], d: [] },
  { c: "FS-8", t: "Professional Development Funds (BMTS)", g: "Faculty and staff", ph: ["fac"], u: "https://uofi.app.box.com/file/944229729534?s=yymcemz88tpbafurkk5rslxjzy6m3dmk", fl: ["notread"],
    s: "Faculty-only; not extracted.", r: [], d: [] },

  /* ---------- Web page ---------- */
  { c: "Web", t: "Mistreatment reporting page", g: "Professionalism and conduct", ph: ["pre", "ci", "fy"], u: "https://medicine.illinois.edu/about/policies/mistreatment",
    s: "Every channel for reporting mistreatment on one page.",
    r: [
      "Online form, anonymous or named; end-of-course evaluations; QR posters in the Learning Resource Center and Carle Forum; Student or Academic Affairs; clerkship directors; the ombudsperson; Title IX for sex discrimination (wecare.illinois.edu/report).",
      "Office of the College: 217-300-5700, medicine@illinois.edu."
    ],
    d: []
  }
];

/* ---------- Discrepancies found while reading ---------- */
const FLAGS = [
  { id: "f-req", sev: "conflict", title: "Two promotion and graduation rulebooks are posted at once",
    body: "APS-6 (effective July 6, 2026) says it applies to all MD students. APS-6.1 (November 2023) says it governs students who matriculated in 2023 and later. Both are linked on the policy page, and they disagree on electives, Step 1 and the Gateway OSCE (below).",
    who: "CI MED Registrar (registrar@medicine.illinois.edu): which document your degree audit is built on.", codes: ["APS-6", "APS-6.1"] },
  { id: "f-elect", sev: "conflict", title: "Elective requirement: 40 weeks or 30 credits",
    body: "APS-6.1: 20 weeks of clinical electives plus 20 weeks of open electives, 40 weeks. APS-30 (March 2026) and the 2026-27 catalog: 30 credit hours, 20 clinical plus 10 any type. APS-30 also calls it a ‘30-week’ requirement in section IX and points to APS-6 for the number, while APS-6 points back to APS-30.",
    who: "Registrar: get your elective total, and whether it is counted in weeks or credits, in writing.", codes: ["APS-6.1", "APS-30", "APS-6"] },
  { id: "f-step1", sev: "conflict", title: "Failing Step 1 during clerkships",
    body: "APS-6.1: you may finish the clerkship you're in but can't start another until you pass. APS-31 (July 2026): if Step 1 isn't taken or passed by the deadline, you may continue the Clinical Immersion Year, with a possible change of graduation year or a leave afterwards.",
    who: "Associate Dean for Student Affairs, before you schedule Step 1 around a clerkship.", codes: ["APS-6.1", "APS-31"] },
  { id: "f-gate", sev: "conflict", title: "Gateway OSCE: pass it or just attempt it",
    body: "APS-6.1: pass the Gateway OSCE to enter Year 4, with provisional entry allowed. APS-6 (2026): attempt every component to be promoted; pass it to graduate. The AY2026-27 calendar lists the Gateway OSCE and its remediation as ‘dates to be determined’.",
    who: "Office of Academic Affairs.", codes: ["APS-6", "APS-6.1"] },
  { id: "f-blank", sev: "gap", title: "APS-6 has a blank graduation requirement",
    body: "Item 4.6 of the graduation list in the 2026 APS-6 is empty. Something was removed or never filled in.",
    who: "Office of Academic Affairs.", codes: ["APS-6"] },
  { id: "f-mspe", sev: "ambiguity", title: "Off-cycle clerkships and MSPE grade graphs",
    body: "APS-45 benchmarks your clerkship grades against the cohort year in which you completed them. If your clerkships ran off the standard March-to-February block, the policy doesn't say which cohort you are compared with.",
    who: "Student Affairs, at your M4 MSPE meeting or earlier.", codes: ["APS-45"] },
  { id: "f-evals", sev: "ambiguity", title: "Late course evaluations can count toward your MSPE",
    body: "APS-47 turns evaluations submitted late into professionalism concerns, summative ones after 2 weeks. APS-5 puts a pattern of citations (for example 2 after the preclinical phase) in the MSPE. Neither policy says whether evaluation concerns count as citations. Treat the 1-week window as hard.",
    who: "Director of Educational Assessment.", codes: ["APS-47", "APS-5"] },
  { id: "f-fs6", sev: "ambiguity", title: "Industry Relations covers students, though its header says faculty",
    body: "FS-6 lists ‘All Faculty and Staff’ as affected, but its text defines CI MED Personnel to include students and applies on and off campus. Consulting, advisory roles and financial interests of US$10,000 or more need advance approval. Its review date (February 2023) has passed.",
    who: "Associate Dean for Academic Affairs, before taking an advisory, consulting or officer role with a health company.", codes: ["FS-6", "APS-25"] },
  { id: "f-apsf", sev: "access", title: "Newer USMLE policy is behind a login",
    body: "The policy page links ‘APS-31 Effective February 1, 2026’ to a Box folder that requires an Illinois Box login. The public APS-31 PDF is the July 6, 2026 version. GS-1 (joint MD/graduate admissions) is behind the same kind of folder.",
    who: "Read them signed in to Illinois Box.", codes: ["APS-31", "GS-1"] },
  { id: "f-dead", sev: "access", title: "Five links on the policy page are dead",
    body: "AM-4 Multiple Admissions, AM-5 Prescreening, and three unlabeled links (beside FS-1, after FS-5, after APS-43) return Box ‘not found’. APS-50 opens view-only with downloads disabled. APS-4 is listed twice.",
    who: "Policy page maintainers.", codes: ["AM-4", "AM-5", "APS-50"] },
  { id: "f-xref", sev: "typo", title: "Broken cross-references inside policies",
    body: "APS-49 points ICP and Career Boot Camp to ‘APS 23.1’, which APS-48 and APS-49 replaced in 2024. APS-45 calls the service-learning policy ‘APS-49’ (it is SL-5). APS-32 still describes a Year 2 Family Medicine clerkship and ‘Phase 2 and 3’. TFA-1 and APS-14 send you to documents (OSFA website, SPPC Procedures) that aren't on the policy page.",
    who: "Use the policy names above when you ask.", codes: ["APS-49", "APS-45", "APS-32", "TFA-1", "APS-14"] },
  { id: "f-contact", sev: "typo", title: "Inconsistent Student Affairs contacts",
    body: "SWH-2 gives studentaffairs@medicine.edu (missing ‘illinois’) and SWH-3 gives studentaffairs@illinois.edu; most policies use studentaffairs@medicine.illinois.edu. Phone numbers differ by purpose: 217-300-5700 main, 217-300-9391 absences, 217-244-9061 exposures.",
    who: "Use studentaffairs@medicine.illinois.edu.", codes: ["SWH-2", "SWH-3", "SWH-9", "APS-7"] },
  { id: "f-sl5", sev: "typo", title: "SL-5's review date is before its effective date",
    body: "Service-learning policy SL-5 is effective July 1, 2024 with a next review date of July 1, 2017.",
    who: "Policy owner (Assistant Dean of Student Affairs).", codes: ["SL-5"] }
];

/* ---------- Requirements model ---------- */
const REQS = [
  { id: "y1", sec: "Preclerkship", label: "Year 1 required courses", v6: "All at S or SR by the college's published date", v61: "Pass ICP; no unresolved U, I, DFR or W", codes: ["APS-6", "APS-6.1"] },
  { id: "y2", sec: "Preclerkship", label: "Year 2 required courses", v6: "All at S or SR by the published date", v61: "S on all Year 1 and 2 preclinical courses", codes: ["APS-6", "APS-6.1"] },
  { id: "step1", sec: "Preclerkship", label: "USMLE Step 1", v6: "Passed before Final Year", v61: "Taken before Year 3; passed before the next clerkship if failed", codes: ["APS-31", "APS-33"] },
  { id: "cl_fm", sec: "Clinical Immersion", label: "Family Medicine clerkship", note: "CLE 640, 5 credits", codes: ["APS-6"] },
  { id: "cl_im", sec: "Clinical Immersion", label: "Internal Medicine clerkship", note: "CLE 645, 10 credits", codes: ["APS-6"] },
  { id: "cl_neuro", sec: "Clinical Immersion", label: "Neurology clerkship", note: "CLE 650, 5 credits", codes: ["APS-6"] },
  { id: "cl_psych", sec: "Clinical Immersion", label: "Psychiatry clerkship", note: "CLE 655, 5 credits", codes: ["APS-6"] },
  { id: "cl_ob", sec: "Clinical Immersion", label: "Obstetrics and Gynecology clerkship", note: "CLE 660, 5 credits", codes: ["APS-6"] },
  { id: "cl_peds", sec: "Clinical Immersion", label: "Pediatrics clerkship", note: "CLE 665, 5 credits", codes: ["APS-6"] },
  { id: "cl_surg", sec: "Clinical Immersion", label: "Surgery clerkship", note: "CLE 670, 10 credits", codes: ["APS-6"] },
  { id: "fmcc", sec: "Clinical Immersion", label: "Family Medicine Continuity Clinic", note: "CLE 680", codes: ["APS-6.1", "APS-7"] },
  { id: "idea", sec: "Clinical Immersion", label: "IDEA Projects", note: "BSE 680, longitudinal", codes: ["APS-6.1", "APS-7"] },
  { id: "y3elec", sec: "Clinical Immersion", label: "4 weeks of elective in Year 3", only: "6.1", v61: "Required to enter Year 4", codes: ["APS-6.1"] },
  { id: "gateway", sec: "Clinical Immersion", label: "Gateway OSCE", v6: "Attempt all parts for promotion; pass to graduate", v61: "Pass to enter Year 4 (provisional entry allowed)", codes: ["APS-6", "APS-6.1"] },
  { id: "step2", sec: "Final Year", label: "USMLE Step 2 CK", v6: "Passed to graduate", v61: "Passed to graduate", codes: ["APS-31", "APS-33"] },
  { id: "subi", sec: "Final Year", label: "Sub-Internship", note: "At least one at S; at most 2 per specialty", codes: ["APS-30", "APS-6.1"] },
  { id: "cbc", sec: "Final Year", label: "Career Boot Camp", note: "CLE 694, 5 credits", codes: ["APS-6"] },
  { id: "project", sec: "Final Year", label: "Capstone or Data Science project", note: "BSE 685 or BSE 686, 12 credits", codes: ["APS-6"] },
  { id: "acls", sec: "Final Year", label: "ACLS or PALS certification", note: "Must be valid through graduation day", codes: ["APS-6"] },
  { id: "prof", sec: "Final Year", label: "Professionalism standards", only: "6", note: "Listed explicitly in APS-6 only", codes: ["APS-4"] }
];

const ELECTIVE_RULES = {
  "6": { label: "APS-30 and the 2026-27 catalog", unit: "credits", clinical: 20, open: 10 },
  "6.1": { label: "APS-6.1", unit: "weeks", clinical: 20, open: 20 }
};

/* ---------- AY2026-27 academic calendar (rev. 7/9/26) ---------- */
const CAL_EVENTS = [
  { d: "2026-11-26", l: "Thanksgiving: clinical students off Thursday to Sunday", who: "ci,fy", src: "APS-7" },
  { d: "2026-12-20", l: "Travel scholarship application for January to March travel", who: "all", src: "SL-3" },
  { d: "2026-12-25", l: "Christmas Day (clinical holiday)", who: "ci,fy", src: "APS-7" },
  { d: "2027-01-01", l: "New Year's Day (clinical holiday)", who: "ci,fy", src: "APS-7" },
  { d: "2027-01-04", l: "Reassessment date (M1-M2 and M3)", who: "pre,ci", src: "Calendar" },
  { d: "2027-01-18", l: "MLK Jr. Day", who: "all", src: "Calendar" },
  { d: "2027-02-08", l: "MEdX Conference (students may be excused)", who: "all", src: "Calendar" },
  { d: "2027-03-01", l: "Block 5/5B OSCE", who: "pre", src: "Calendar" },
  { d: "2027-03-03", l: "Step 1 deadline (cohort entering Clinical Immersion)", who: "pre", src: "Calendar" },
  { d: "2027-03-08", l: "Clinical Immersion orientation (mandatory, in person)", who: "pre", src: "Calendar" },
  { d: "2027-03-15", l: "Match Day week and spring break", who: "all", src: "Calendar" },
  { d: "2027-03-20", l: "Travel scholarship application for April to June travel", who: "all", src: "SL-3" },
  { d: "2027-03-22", l: "Final Year orientation (mandatory, in person)", who: "ci", src: "Calendar" },
  { d: "2027-03-29", l: "Health Innovation and Research Day", who: "all", src: "Calendar" },
  { d: "2027-03-31", l: "Capstone due; Innovation Week", who: "fy", src: "Calendar" },
  { d: "2027-05-03", l: "Awards program", who: "fy", src: "Calendar" },
  { d: "2027-05-08", l: "Graduation, Class of 2027", who: "fy", src: "Calendar" },
  { d: "2027-05-31", l: "Memorial Day (clinical holiday)", who: "ci,fy", src: "APS-7" },
  { d: "2027-06-07", l: "Reassessment date", who: "pre,ci", src: "Calendar" },
  { d: "2027-06-19", l: "Juneteenth (clinical holiday)", who: "ci,fy", src: "APS-7" },
  { d: "2027-06-20", l: "Travel scholarship application for July to September travel", who: "all", src: "SL-3" },
  { d: "2027-07-04", l: "Independence Day (clinical holiday, or hospital's observed day)", who: "ci,fy", src: "APS-7" },
  { d: "2027-09-06", l: "Labor Day (clinical holiday)", who: "ci,fy", src: "APS-7" },
  { d: "2027-09-20", l: "Travel scholarship application for October to December travel", who: "all", src: "SL-3" }
];

/* ---------- Date calculators: rule id -> how to compute from a base date ---------- */
const CALCS = {
  e_drop: { label: "Drop, cancel or change an elective", base: "Elective start date", n: -14, unit: "bdays", code: "APS-30" },
  e_create: { label: "Student-created elective proposal", base: "Elective start date", n: -30, unit: "bdays", code: "APS-30" },
  grade_review: { label: "Clerkship grade review request", base: "Clerkship end date", n: 5, unit: "weeks", code: "APS-16" },
  grade_release: { label: "Final grade due to you", base: "Course or clerkship end date", n: 4, unit: "weeks", code: "APS-13" },
  evals: { label: "Course evaluations due", base: "Course end date", n: 7, unit: "days", code: "APS-47" },
  evals2: { label: "Narrative fallback for missed evaluations", base: "Course end date", n: 14, unit: "days", code: "APS-47" },
  absence: { label: "Planned absence request", base: "First day of the absence", n: -14, unit: "days", code: "APS-7" },
  absence_after: { label: "Report an unplanned absence", base: "Day of the absence", n: 3, unit: "days", code: "APS-7" },
  exam_doc: { label: "Documentation for a missed exam", base: "Exam date", n: 5, unit: "bdays", code: "APS-7" },
  loa_return: { label: "Letter of intent to return from leave", base: "Return date", n: -60, unit: "days", code: "APS-9" },
  remote: { label: "Remote participation request", base: "Session date", n: -2, unit: "bdays", code: "APS-38" },
  prof_resp: { label: "Response to a professionalism citation", base: "Date you were notified", n: 10, unit: "bdays", code: "APS-5" },
  prof_appeal: { label: "Appeal a professionalism finding", base: "Date of the finding", n: 5, unit: "bdays", code: "APS-5" },
  petition: { label: "Petition SPPC", base: "Date of the SPPC decision", n: 10, unit: "bdays", code: "APS-14" },
  appeal: { label: "Appeal or grievance", base: "Date of the decision", n: 5, unit: "bdays", code: "APS-14" },
  mistreat_resp: { label: "Respond to a peer's mistreatment report", base: "Date you were notified", n: 14, unit: "days", code: "APS-46" },
  dres: { label: "DRES letter to Student Affairs", base: "Date of the exam or rotation", n: -28, unit: "days", code: "APS-34" },
  exposure_claim: { label: "Exposure reimbursement claim", base: "Date of exposure", n: 90, unit: "days", code: "SWH-9" },
  travel_receipts: { label: "Travel receipts and research output", base: "Return date", n: 10, unit: "bdays", code: "SL-3" },
  sl_reflect: { label: "Service-learning reflection", base: "Event date", n: 30, unit: "days", code: "SL-5" }
};

/* ---------- AY2026-27 clerkship tracks (26-27 Clerkship Schedule, advising copy) ----------
   Ten tracks across ten 5-week blocks; Surgery and Internal Medicine run two blocks. Generated from the spreadsheet;
   students can load a newer one in the app. */
const TRACK_SCHEDULE = {
  id: "2026-27", label: "AY2026-27 clerkship schedule", source: "26-27 Clerkship Schedule (advising copy)",
  blocks: [{ k: "1A", a: "2026-03-16", b: "2026-04-19" }, { k: "1B", a: "2026-04-20", b: "2026-05-24" }, { k: "2A", a: "2026-05-25", b: "2026-06-28" }, { k: "2B", a: "2026-06-30", b: "2026-08-02" }, { k: "3A", a: "2026-08-03", b: "2026-09-06" }, { k: "3B", a: "2026-09-07", b: "2026-10-11" }, { k: "4A", a: "2026-10-12", b: "2026-11-15" }, { k: "4B", a: "2026-11-16", b: "2026-12-20" }, { k: "5A", a: "2027-01-04", b: "2027-02-07" }, { k: "5B", a: "2027-02-08", b: "2027-03-14" }],
  tracks: {
    "1A": [{ n: "Obstetrics and Gynecology", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Psychiatry", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Neurology", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Pediatrics", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Surgery", a: "2026-08-03", b: "2026-10-11", blocks: "3A–3B" }, { n: "Family Medicine", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Elective", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Internal Medicine", a: "2027-01-04", b: "2027-03-14", blocks: "5A–5B" }],
    "1B": [{ n: "Psychiatry", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Obstetrics and Gynecology", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Pediatrics", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Neurology", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Surgery", a: "2026-08-03", b: "2026-10-11", blocks: "3A–3B" }, { n: "Elective", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Family Medicine", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Internal Medicine", a: "2027-01-04", b: "2027-03-14", blocks: "5A–5B" }],
    "2A": [{ n: "Surgery", a: "2026-03-16", b: "2026-05-24", blocks: "1A–1B" }, { n: "Obstetrics and Gynecology", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Psychiatry", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Internal Medicine", a: "2026-08-03", b: "2026-10-11", blocks: "3A–3B" }, { n: "Neurology", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Pediatrics", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Family Medicine", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Elective", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }],
    "2B": [{ n: "Surgery", a: "2026-03-16", b: "2026-05-24", blocks: "1A–1B" }, { n: "Psychiatry", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Obstetrics and Gynecology", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Internal Medicine", a: "2026-08-03", b: "2026-10-11", blocks: "3A–3B" }, { n: "Pediatrics", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Neurology", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Elective", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Family Medicine", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }],
    "3A": [{ n: "Family Medicine", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Elective", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Internal Medicine", a: "2026-05-25", b: "2026-08-02", blocks: "2A–2B" }, { n: "Neurology", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Pediatrics", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Obstetrics and Gynecology", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Psychiatry", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Surgery", a: "2027-01-04", b: "2027-03-14", blocks: "5A–5B" }],
    "3B": [{ n: "Elective", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Family Medicine", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Internal Medicine", a: "2026-05-25", b: "2026-08-02", blocks: "2A–2B" }, { n: "Pediatrics", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Neurology", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Psychiatry", a: "2026-10-12", b: "2026-11-15", blocks: "4A" }, { n: "Obstetrics and Gynecology", a: "2026-11-16", b: "2026-12-20", blocks: "4B" }, { n: "Surgery", a: "2027-01-04", b: "2027-03-14", blocks: "5A–5B" }],
    "4A": [{ n: "Internal Medicine", a: "2026-03-16", b: "2026-05-24", blocks: "1A–1B" }, { n: "Family Medicine", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Elective", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Obstetrics and Gynecology", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Psychiatry", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Surgery", a: "2026-10-12", b: "2026-12-20", blocks: "4A–4B" }, { n: "Neurology", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Pediatrics", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }],
    "4B": [{ n: "Internal Medicine", a: "2026-03-16", b: "2026-05-24", blocks: "1A–1B" }, { n: "Elective", a: "2026-05-25", b: "2026-06-28", blocks: "2A" }, { n: "Family Medicine", a: "2026-06-30", b: "2026-08-02", blocks: "2B" }, { n: "Psychiatry", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Obstetrics and Gynecology", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Surgery", a: "2026-10-12", b: "2026-12-20", blocks: "4A–4B" }, { n: "Pediatrics", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Neurology", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }],
    "5A": [{ n: "Neurology", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Pediatrics", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Surgery", a: "2026-05-25", b: "2026-08-02", blocks: "2A–2B" }, { n: "Family Medicine", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Elective", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Internal Medicine", a: "2026-10-12", b: "2026-12-20", blocks: "4A–4B" }, { n: "Obstetrics and Gynecology", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Psychiatry", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }],
    "5B": [{ n: "Pediatrics", a: "2026-03-16", b: "2026-04-19", blocks: "1A" }, { n: "Neurology", a: "2026-04-20", b: "2026-05-24", blocks: "1B" }, { n: "Surgery", a: "2026-05-25", b: "2026-08-02", blocks: "2A–2B" }, { n: "Elective", a: "2026-08-03", b: "2026-09-06", blocks: "3A" }, { n: "Family Medicine", a: "2026-09-07", b: "2026-10-11", blocks: "3B" }, { n: "Internal Medicine", a: "2026-10-12", b: "2026-12-20", blocks: "4A–4B" }, { n: "Psychiatry", a: "2027-01-04", b: "2027-02-07", blocks: "5A" }, { n: "Obstetrics and Gynecology", a: "2027-02-08", b: "2027-03-14", blocks: "5B" }]
  }
};
