import { SEMESTER, MODULES, DEADLINE_DATA, TIMETABLE, SLOTS } from "./data.js";

export const TIME_ZONE = "Africa/Johannesburg";
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
// South African Standard Time is UTC+2, with no daylight-saving changes.
const OFFSET_MS = 7_200_000;
export const pad = (n) => String(n).padStart(2, "0");

export function parts(date) {
  const d = new Date(date.getTime() + OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate(), day: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
export function fromParts(year, month, date, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month, date, hour, minute, second, ms) - OFFSET_MS);
}
export function parseYmd(value) {
  const [y, m, d] = value.split("-").map(Number);
  return fromParts(y, m - 1, d);
}
export function ymd(date) { const p = parts(date); return `${p.year}-${pad(p.month + 1)}-${pad(p.date)}`; }
export function addDays(date, n) { return new Date(date.getTime() + n * DAY_MS); }
export function startOfDay(date) { return parseYmd(ymd(date)); }
export function sameDay(a, b) { return ymd(a) === ymd(b); }
export function dayDiff(from, to) { return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS); }
export function atTime(date, time) { const p = parts(date); const [h, m] = time.split(":").map(Number); return fromParts(p.year, p.month, p.date, h, m); }

// Due and counted down to 23:59 SAST (closes); finished at the following midnight (due).
export const DEADLINES = DEADLINE_DATA.map((d) => {
  const day = parseYmd(d.date), due = addDays(day, 1);
  return { ...d, day, due, closes: new Date(due.getTime() - MINUTE_MS) };
}).sort((a, b) => a.due - b.due);

export function isFinished(deadline, now) { return deadline.due <= now; }
export function nextDeadline(now, deadlines = DEADLINES) {
  return deadlines.find((d) => !isFinished(d, now)) || null;
}
export function countdownParts(due, now) {
  const remaining = due - now;
  if (remaining <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
  // Zero displayed minutes is valid during the last minute; it is not expiry.
  return { expired: false, days: Math.floor(remaining / DAY_MS), hours: Math.floor(remaining / 3_600_000) % 24, minutes: Math.floor(remaining / 60_000) % 60 };
}
export function validateData() {
  const errors = [];
  const ids = new Set();
  const codes = new Set(MODULES.map((m) => m.code));
  for (const d of DEADLINE_DATA) {
    if (!d.id || ids.has(d.id)) errors.push(`Duplicate or missing assessment ID: ${d.id}`);
    ids.add(d.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || ymd(parseYmd(d.date)) !== d.date) errors.push(`Invalid assessment date: ${d.date}`);
    if (!codes.has(d.module)) errors.push(`Unknown module: ${d.module}`);
    if (!d.date.startsWith(`${SEMESTER.year}-`)) errors.push(`Assessment outside ${SEMESTER.year}: ${d.id}`);
  }
  const slots = new Map(SLOTS.map((s, i) => [s.key, i]));
  for (const [group, { weeks }] of Object.entries(TIMETABLE)) {
    const starts = new Set();
    weeks.forEach((w, k) => {
      if (starts.has(w.weekStart) || ymd(parseYmd(w.weekStart)) !== w.weekStart || parts(parseYmd(w.weekStart)).day !== 1) errors.push(`Invalid week in Group ${group}: ${w.weekStart}`);
      if (!w.weekStart.startsWith(`${SEMESTER.year}-`)) errors.push(`Week outside ${SEMESTER.year} in Group ${group}: ${w.weekStart}`);
      // The current week is found by scanning in order, so weeks must follow each other with no gaps.
      if (k && dayDiff(parseYmd(weeks[k - 1].weekStart), parseYmd(w.weekStart)) !== 7) errors.push(`Week out of order or after a gap in Group ${group}: ${w.weekStart}`);
      starts.add(w.weekStart);
      for (const [day, data] of Object.entries(w.days)) {
        const items = Array.isArray(data) ? data : [data];
        const occupied = new Set();
        for (const item of items) {
          const a = slots.get(item.start), b = slots.get(item.end);
          if (a === undefined || b === undefined || b < a) { errors.push(`Invalid slot: Group ${group}, ${w.weekStart}, ${day}`); continue; }
          if (item.code && !codes.has(item.code)) errors.push(`Unknown timetable module: ${item.code}`);
          for (let i = a; i <= b; i += 1) {
            if (occupied.has(i)) errors.push(`Overlapping sessions: Group ${group}, ${w.weekStart}, ${day}`);
            occupied.add(i);
          }
        }
      }
    });
  }
  return errors;
}
