// Update academic content here; keep assessment IDs stable.
// The semester labels the dashboard and sets the calendar year.
const SEMESTER = { name: "Semester 2", year: 2026 };

const SOURCES = {
  pas: "https://advtechonline.sharepoint.com/sites/Emeris/PAS/Forms/AllItems.aspx?id=%2Fsites%2FEmeris%2FPAS%2F2026%2FContact%20Full%20Time%2FFaculty%20of%20Science%20and%20Technology%2FSchool%20of%20Computer%20Science%2FBachelor%20of%20Computer%20and%20Information%20Science%20in%20Application%20Development%20BCAD0701&viewid=7d0c106d%2D7867%2D4ac2%2D84a6%2D782f2662169a&csf=1&CID=a833139f%2D0e51%2D4d4d%2Da457%2D785f3b3f26ba&FolderCTID=0x012000ABD6003807C8E844B9951A17F1456534",
  timetable: "https://advtechonline.sharepoint.com/sites/Emeris/Timetable/Forms/AllItems.aspx?id=%2Fsites%2FEmeris%2FTimetable%2F2026%2FDurban%20North%2FFaculty%20of%20Science%20and%20Technology%2FSchool%20of%20Computer%20Science%2FBachelor%20of%20Computer%20and%20Information%20Science%20in%20Application%20Development%20BCAD0701&viewid=1f54ba53%2Dc00b%2D4529%2Da721%2Da4030a433449&csf=1&CID=5b95a478%2D4532%2D4e1e%2D9a57%2D46c31e08aa55&FolderCTID=0x012000367AF3374754684BA95A7FF798230169",
  materials: "https://advtechonline.sharepoint.com/sites/TertiaryStudents"
};

// Course pages on myStudies (D2L). Lecturers differ per class group.
const MODULES = [
  {
    code: "INSY7314",
    name: "Information Systems 3D",
    course: "https://mystudies.iie.edu.za/d2l/home/86820",
    lecturer: { 1: "Ebrahim Adam", 2: "Ebrahim Adam" }
  },
  {
    code: "INSY7315",
    name: "Information Systems 3E",
    course: "https://mystudies.iie.edu.za/d2l/home/82064",
    lecturer: { 1: "Gareth Grant", 2: "Denzyl Govender" }
  },
  {
    code: "PROG7312",
    name: "Programming 3B",
    course: "https://mystudies.iie.edu.za/d2l/home/86860",
    lecturer: { 1: "Denzyl Govender", 2: "Denzyl Govender" }
  },
  {
    code: "PROG7314",
    name: "Programming 3D",
    course: "https://mystudies.iie.edu.za/d2l/home/95455",
    lecturer: { 1: "Ebrahim Adam", 2: "Ebrahim Adam" }
  }
];

// Term 2 submission dates from PAS Version 4 (23 September 2026).
// ICE and resubmission dates are not included.
const DEADLINE_DATA = [
  { id: "insy7315-task-1", date: "2026-08-17", module: "INSY7315", title: "Task 1" },
  { id: "prog7314-part-1", date: "2026-08-24", module: "PROG7314", title: "Part 1" },
  { id: "insy7314-part-1", date: "2026-09-07", module: "INSY7314", title: "Part 1" },
  { id: "prog7312-part-1", date: "2026-09-14", module: "PROG7312", title: "Part 1" },
  { id: "prog7314-part-2", date: "2026-09-22", module: "PROG7314", title: "Part 2" },
  { id: "insy7315-task-2", date: "2026-10-05", module: "INSY7315", title: "Task 2" },
  { id: "insy7314-part-2", date: "2026-10-12", module: "INSY7314", title: "Part 2" },
  { id: "prog7312-part-2", date: "2026-10-19", module: "PROG7312", title: "Part 2" },
  { id: "insy7315-project-report", date: "2026-10-30", module: "INSY7315", title: "Project Report" },
  { id: "prog7314-poe", date: "2026-11-06", module: "PROG7314", title: "POE" },
  { id: "insy7314-poe", date: "2026-11-09", module: "INSY7314", title: "POE" },
  { id: "prog7312-poe", date: "2026-11-13", module: "PROG7312", title: "POE" }
];

// Sidebar links, each with a built-in symbol ("glyph") and colour ("tint").
const LINKS = [
  { name: "myStudies", desc: "Emeris LMS home", url: "https://mystudies.iie.edu.za/d2l/home", glyph: "cap", tint: "#2563eb" },
  { name: "MyEmeris", desc: "Academics, finance, library", url: "https://my.emeris.ac.za/student/student_home/index", glyph: "idCard", tint: "#ea580c" },
  { name: "VC Student Portal", short: "VC Portal", desc: "Log in with SSO", url: "https://student.varsitycollege.co.za/student-portal/#/login", glyph: "login", tint: "#0d9488" },
  { name: "MyVC Intranet", short: "Intranet", desc: "Student systems and resources", url: "https://advtechonline.sharepoint.com/sites/VarsityCollege/VarsityCollegeStudentPortal/SitePages/Home.aspx", glyph: "building", tint: "#7c3aed" },
  { name: "CloudLabs", desc: "Emeris virtual machines", url: "https://emeris.cloudlabs.ai/virtual-machine", glyph: "monitor", tint: "#0891b2" },
  { name: "Student Materials", short: "Materials", desc: "Module files on SharePoint", url: SOURCES.materials, glyph: "folder", tint: "#1f9150" }
];

/* ---------- Semester 2 timetable, Groups 1 and 2 ---------- */
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = [
  { key: "08:00", start: "08:00", end: "08:50" },
  { key: "09:00", start: "09:00", end: "09:50" },
  { key: "10:00", start: "10:00", end: "10:50" },
  { key: "11:00", start: "11:00", end: "11:50" },
  { key: "12:00", start: "12:00", end: "12:50" },
  { key: "13:00", start: "13:00", end: "13:50" },
  { key: "14:00", start: "14:00", end: "14:50" },
  { key: "15:00", start: "15:00", end: "15:50" },
  { key: "16:00", start: "16:00", end: "16:50" }
];
const SLOT_INDEX = Object.fromEntries(SLOTS.map((slot, index) => [slot.key, index]));

function session(start, end, code, venue) {
  return { start, end, code, venue };
}
function eventDay(label, variant, start, end) {
  return { label, variant: variant || "catchup", start: start || "08:00", end: end || "16:00" };
}
function eventWeek(label, variant, start, end) {
  return Object.fromEntries(DAY_NAMES.map((day) => [day, eventDay(label, variant, start, end)]));
}
function eventDaysWithClasses(label, variant, classDays, start, end) {
  const days = eventWeek(label, variant, start, end);
  Object.entries(classDays).forEach(([day, value]) => { days[day] = value; });
  return days;
}
function clone(items) {
  return items.map((item) => Object.assign({}, item));
}
function week(title, weekStart, days) {
  return { title, weekStart, days };
}

function buildGroupOneWeeks() {
  const mondayCore = [session("08:00", "09:00", "PROG7314", "CR3"), session("10:00", "11:00", "INSY7314", "CR3")];
  const tuesdayProg = [session("08:00", "09:00", "PROG7312", "CR3")];
  const tuesdayProgAndInsy = [session("08:00", "09:00", "PROG7312", "CR3"), session("10:00", "11:00", "INSY7315", "CR3")];
  const tuesdayProgBothRooms = [session("08:00", "09:00", "PROG7312", "CR3"), session("10:00", "11:00", "PROG7312", "CR2")];
  const wednesdayAfternoon = [session("13:00", "14:00", "INSY7314", "CR4"), session("15:00", "16:00", "PROG7314", "CR4")];
  const thursdayProg = [session("10:00", "11:00", "PROG7312", "CR3")];
  const thursdayInsy = [session("08:00", "09:00", "INSY7315", "CR3")];
  const thursdayInsyAndProg = [session("08:00", "09:00", "INSY7315", "CR3"), session("10:00", "11:00", "PROG7312", "CR3")];
  const fridayCore = [session("08:00", "09:00", "PROG7314", "CR3"), session("10:00", "11:00", "PROG7312", "CR3")];

  function standardWeek(tuesday, thursday) {
    return {
      Monday: clone(mondayCore),
      Tuesday: clone(tuesday),
      Wednesday: clone(wednesdayAfternoon),
      Thursday: clone(thursday),
      Friday: clone(fridayCore)
    };
  }

  return [
    week("Academic Week 1", "2026-07-13", standardWeek(tuesdayProg, thursdayProg)),
    week("Academic Week 2", "2026-07-20", standardWeek(tuesdayProgAndInsy, thursdayProg)),
    week("Academic Week 3 FP1", "2026-07-27", standardWeek(tuesdayProgBothRooms, [])),
    week("Academic Week 4 FP2", "2026-08-03", standardWeek(tuesdayProgBothRooms, thursdayInsy)),
    week("Academic Week 5 FP3", "2026-08-10", {
      Monday: eventDay("WOMEN'S DAY", "holiday"),
      Tuesday: clone(tuesdayProgBothRooms),
      Wednesday: clone(wednesdayAfternoon),
      Thursday: [],
      Friday: clone(fridayCore)
    }),
    week("Catch Up Week", "2026-08-17", eventWeek("CATCH UP WEEK", "catchup", "08:00", "11:00")),
    week("Academic Week 6", "2026-08-24", standardWeek(tuesdayProgBothRooms, thursdayInsy)),
    week("Academic Week 7 FP4", "2026-08-31", standardWeek(tuesdayProg, [])),
    week("Academic Week 8 FP5", "2026-09-07", standardWeek([], thursdayInsyAndProg)),
    week("Academic Week 9 FP6", "2026-09-14", standardWeek(tuesdayProg, [])),
    week("Assess Week", "2026-09-21", eventDaysWithClasses("TEST WEEK 2", "assessment", { Monday: clone(mondayCore) }, "08:00", "11:00")),
    week("Assess Week", "2026-09-28", eventWeek("TEST WEEK 2", "assessment", "08:00", "11:00")),
    week("Academic Week 10", "2026-10-05", standardWeek([], thursdayInsyAndProg)),
    week("Academic Week 11", "2026-10-12", standardWeek(tuesdayProg, [])),
    week("Academic Week 12", "2026-10-19", standardWeek([], thursdayInsyAndProg)),
    week("Assessment Week", "2026-10-26", eventWeek("ASSESSMENT WEEK", "assessment", "08:00", "11:00"))
  ];
}

function buildGroupTwoWeeks() {
  const mondayAfternoon = [session("13:00", "14:00", "INSY7314", "CR4"), session("15:00", "16:00", "PROG7314", "CR4")];
  const tuesdayProg = [session("10:00", "11:00", "PROG7312", "CR2")];
  const tuesdayInsyAtTen = [session("10:00", "11:00", "INSY7315", "CR2")];
  const tuesdayInsyAndProg = [session("08:00", "09:00", "INSY7315", "CR2"), session("10:00", "11:00", "PROG7312", "CR2")];
  const wednesdayCore = [session("08:00", "09:00", "PROG7314", "CR2"), session("10:00", "11:00", "INSY7314", "CR2")];
  const thursdayProgCr2 = [session("08:00", "09:00", "PROG7312", "CR2")];
  const thursdayProgCr2AndCr3 = [session("08:00", "09:00", "PROG7312", "CR2"), session("10:00", "11:00", "PROG7312", "CR3")];
  const thursdayInsyAndProgCr3 = [session("08:00", "09:00", "INSY7315", "CR2"), session("10:00", "11:00", "PROG7312", "CR3")];
  const fridayCore = [session("08:00", "09:00", "PROG7312", "CR2"), session("10:00", "11:00", "PROG7314", "CR2")];

  function standardWeek(tuesday, thursday) {
    return {
      Monday: clone(mondayAfternoon),
      Tuesday: clone(tuesday),
      Wednesday: clone(wednesdayCore),
      Thursday: clone(thursday),
      Friday: clone(fridayCore)
    };
  }

  return [
    week("Academic Week 1", "2026-07-13", standardWeek(tuesdayProg, thursdayProgCr2)),
    week("Academic Week 2", "2026-07-20", standardWeek(tuesdayInsyAtTen, thursdayProgCr2)),
    week("Academic Week 3 FP1", "2026-07-27", standardWeek([], thursdayProgCr2AndCr3)),
    week("Academic Week 4 FP2", "2026-08-03", standardWeek([], thursdayInsyAndProgCr3)),
    week("Academic Week 5 FP3", "2026-08-10", {
      Monday: eventDay("WOMEN'S DAY", "holiday"),
      Tuesday: [],
      Wednesday: clone(wednesdayCore),
      Thursday: clone(thursdayProgCr2AndCr3),
      Friday: clone(fridayCore)
    }),
    week("Catch Up Week", "2026-08-17", eventWeek("CATCH UP WEEK", "catchup", "08:00", "11:00")),
    week("Academic Week 6", "2026-08-24", standardWeek([], thursdayInsyAndProgCr3)),
    week("Academic Week 7 FP4", "2026-08-31", standardWeek([], thursdayProgCr2AndCr3)),
    week("Academic Week 8 FP5", "2026-09-07", standardWeek(tuesdayInsyAndProg, [])),
    week("Academic Week 9 FP6", "2026-09-14", standardWeek([], thursdayProgCr2AndCr3)),
    week("Assess Week", "2026-09-21", eventDaysWithClasses("TEST WEEK 2", "assessment", { Monday: clone(mondayAfternoon) }, "13:00", "16:00")),
    week("Assess Week", "2026-09-28", eventWeek("TEST WEEK 2", "assessment", "08:00", "11:00")),
    week("Academic Week 10", "2026-10-05", standardWeek(tuesdayInsyAndProg, [])),
    week("Academic Week 11", "2026-10-12", standardWeek([], thursdayProgCr2AndCr3)),
    week("Academic Week 12", "2026-10-19", standardWeek(tuesdayInsyAndProg, [])),
    week("Assessment Week", "2026-10-26", eventWeek("ASSESSMENT WEEK", "assessment", "08:00", "11:00"))
  ];
}

const TIMETABLE = {
  1: { weeks: buildGroupOneWeeks() },
  2: { weeks: buildGroupTwoWeeks() }
};



export { SEMESTER, SOURCES, MODULES, DEADLINE_DATA, LINKS, DAY_NAMES, SLOTS, SLOT_INDEX, TIMETABLE };
