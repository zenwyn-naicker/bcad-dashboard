import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DEADLINES, TIME_ZONE, parts, fromParts, parseYmd, ymd, addDays, dayDiff, atTime, countdownParts, nextDeadline, isFinished, validateData } from "../assets/model.js";
import { LINKS } from "../assets/data.js";

test("academic data has valid dates, stable unique IDs and non-overlapping timetable slots", () => {
  assert.deepEqual(validateData(), []);
  assert.ok(DEADLINES.length > 0);
});
test("campus date and class times use South African Standard Time", () => {
  assert.equal(TIME_ZONE, "Africa/Johannesburg");
  assert.deepEqual(parts(new Date("2026-10-11T22:30:00Z")), { year: 2026, month: 9, date: 12, day: 1, hour: 0, minute: 30 });
  assert.equal(atTime(parseYmd("2026-10-12"), "08:00").toISOString(), "2026-10-12T06:00:00.000Z");
  assert.equal(ymd(addDays(parseYmd("2026-10-31"), 1)), "2026-11-01");
  assert.equal(dayDiff(parseYmd("2026-10-10"), parseYmd("2026-10-12")), 2);
});
test("assessments finish automatically at next midnight, never during the final second", () => {
  for (const d of DEADLINES) {
    for (const offset of [60_000, 999, 500, 1]) {
      const now = new Date(d.due.getTime() - offset);
      assert.equal(countdownParts(d.due, now).expired, false);
      assert.equal(isFinished(d, now), false);
      assert.equal(nextDeadline(now)?.date, d.date);
    }
    assert.equal(countdownParts(d.due, d.due).expired, true);
    assert.equal(isFinished(d, d.due), true);
    assert.notEqual(nextDeadline(d.due)?.date, d.date);
  }
});
test("countdown runs to the stated 23:59 SAST deadline, a minute before finishing", () => {
  for (const d of DEADLINES) {
    assert.deepEqual(parts(d.closes), { ...parts(d.day), hour: 23, minute: 59 });
    assert.equal(d.due - d.closes, 60_000);
    // 06:15 on the due date shows 17h 44m, not the 17h 45m left until midnight.
    assert.deepEqual(countdownParts(d.closes, atTime(d.day, "06:15")), { expired: false, days: 0, hours: 17, minutes: 44 });
    const lastMinute = new Date(d.closes.getTime() + 30_000);
    assert.equal(countdownParts(d.closes, lastMinute).expired, true);
    assert.equal(isFinished(d, lastMinute), false);
    assert.equal(nextDeadline(lastMinute)?.date, d.date);
  }
});
test("only future assessments remain active, without manual completion state", () => {
  const middle = DEADLINES[Math.floor(DEADLINES.length / 2)];
  const now = atTime(middle.day, "12:00");
  const remaining = DEADLINES.filter((d) => !isFinished(d, now));
  assert.deepEqual(remaining.map((d) => d.id), DEADLINES.filter((d) => d.date >= middle.date).map((d) => d.id));
  assert.equal(nextDeadline(now)?.date, middle.date);
  assert.equal(nextDeadline(DEADLINES.at(-1).due), null);
});
test("displayed countdown uses whole days, hours and minutes without rounding up", () => {
  const due = fromParts(2026, 9, 13);
  assert.deepEqual(countdownParts(due, new Date(due - 90_060_000)), { expired: false, days: 1, hours: 1, minutes: 1 });
  assert.deepEqual(countdownParts(due, new Date(due - 500)), { expired: false, days: 0, hours: 0, minutes: 0 });
  assert.deepEqual(countdownParts(due, new Date(due.getTime() + 1)), { expired: true, days: 0, hours: 0, minutes: 0 });
});
test("device timezone cannot change the campus day, deadline or timetable time", () => {
  const script = `import { parts, nextDeadline, atTime, parseYmd } from './assets/model.js'; const now = new Date('2026-10-12T22:00:00Z'); console.log(JSON.stringify({ day: parts(now), next: nextDeadline(now)?.id ?? null, classAt: atTime(parseYmd('2026-10-12'), '08:00').toISOString() }));`;
  const results = ["Africa/Johannesburg", "UTC", "America/New_York", "Pacific/Auckland"].map((TZ) => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: new URL("../", import.meta.url), env: { ...process.env, TZ }, encoding: "utf8" }));
  for (const result of results) assert.equal(result, results[0]);
});
test("CloudLabs links directly to the Emeris virtual machine page", () => {
  assert.equal(LINKS.find((l) => l.name === "CloudLabs")?.url, "https://emeris.cloudlabs.ai/virtual-machine");
});
