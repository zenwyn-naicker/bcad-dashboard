import { SEMESTER, SOURCES, MODULES, LINKS, DAY_NAMES, SLOTS, SLOT_INDEX, TIMETABLE } from "./data.js";
import { DEADLINES, parts, fromParts, pad, parseYmd, ymd, addDays, startOfDay, sameDay, dayDiff, atTime, countdownParts, isFinished } from "./model.js";

const root = document.documentElement;
const KEYS = window.BCAD_KEYS;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const reduceMotion = () => motionQuery?.matches === true;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEWS = ["overview", "timetable", "deadlines"];
const EVENT_VARIANTS = ["assessment", "catchup", "poe", "break", "holiday"];
const CAL_YEAR = SEMESTER.year;
const MONO_TINTS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0d9488", "#b45309"];

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function fmtShort(d) { const p = parts(d); return `${DOW3[p.day]} ${p.date} ${MON[p.month]}`; }
function fmtLong(d) { const p = parts(d); return `${DOW[p.day]} ${p.date} ${MONTHS[p.month]}`; }
function titleCase(s) { return String(s).toLowerCase().replace(/(^|\s)(\S)/g, (m, sp, ch) => sp + ch.toUpperCase()); }
function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function durationText(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function monogram(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
function tintFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MONO_TINTS[h % MONO_TINTS.length];
}
function favUrl(url) { return `https://${hostOf(url)}/favicon.ico`; }
function normalizeUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    if (!u.hostname || (!u.hostname.includes(".") && u.hostname !== "localhost")) return null;
    return u.href;
  } catch {
    return null;
  }
}

const ICONS = {
  arrow: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  cap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14Z"/><path d="M6.5 11.8v3.7c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-3.7M21.5 9.5v5"/>',
  idCard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2a3.4 3.4 0 0 1 6.4 0M14.5 10h4M14.5 13.5h3"/>',
  login: '<path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14"/><path d="M4 12h10.5M11 8.5l3.5 3.5-3.5 3.5"/>',
  building: '<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8.5 7.5h2M13.5 7.5h2M8.5 11h2M13.5 11h2M10 20.5v-4h4v4"/>'
};
function icon(name, size = 16, stroke = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
}

/* =========================================================
   1. DATA MODEL AND STATE
   ========================================================= */

const MOD = Object.fromEntries(MODULES.map((m) => [m.code, m]));

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
};

function loadJson(key, fallback) {
  try { const v = JSON.parse(store.get(key) || "null"); return v ?? fallback; } catch { return fallback; }
}

function loadLinks() {
  const arr = loadJson(KEYS.links, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((l) => ({ id: String(l?.id || Math.random().toString(36).slice(2)), name: String(l?.name || "").slice(0, 60), url: normalizeUrl(l?.url) }))
    .filter((l) => l.url && l.name)
    .slice(0, 40);
}

const state = {
  group: root.dataset.group === "2" ? "2" : "1",
  view: "overview",
  links: loadLinks(),
  ttIndex: 0,
  ttExpandAll: false,
  filter: "all",
  adding: false,
  heroId: null,
  lastDay: ""
};

const weeksFor = (group = state.group) => TIMETABLE[group].weeks;
const upcoming = (now) => DEADLINES.filter((d) => d.due > now);
const saveLinks = () => store.set(KEYS.links, JSON.stringify(state.links.map(({ id, name, url }) => ({ id, name, url }))));

/* ---------- Timetable helpers ---------- */
function slotEnd(key) { const s = SLOTS[SLOT_INDEX[key]]; return s ? s.end : key; }
function itemTimes(date, item) { return { start: atTime(date, item.start), end: atTime(date, slotEnd(item.end)) }; }

function dayItems(wk, dayIndex) {
  const data = wk.days[DAY_NAMES[dayIndex]];
  if (!data) return [];
  if (Array.isArray(data)) return data.map((s) => ({ kind: "session", ...s }));
  return [{ kind: "event", ...data, variant: EVENT_VARIANTS.includes(data.variant) ? data.variant : "catchup" }];
}

function weekIndexContaining(date, weeks = weeksFor()) {
  const d = startOfDay(date);
  return weeks.findIndex((w) => { const s = parseYmd(w.weekStart); return d >= s && d < addDays(s, 7); });
}

function autoWeekIndex(now = new Date()) {
  const weeks = weeksFor();
  let ref = startOfDay(now);
  if (parts(ref).day === 6) ref = addDays(ref, 2);
  else if (parts(ref).day === 0) ref = addDays(ref, 1);
  for (let i = 0; i < weeks.length; i += 1) if (ref < addDays(parseYmd(weeks[i].weekStart), 7)) return i;
  return weeks.length - 1;
}

function specialKind(wk) {
  if (/catch up/i.test(wk.title)) return "catchup";
  if (/assess/i.test(wk.title)) return "assessment";
  return "";
}

function weekDisplayName(wk) {
  if (specialKind(wk)) {
    const ev = Object.values(wk.days).find((d) => !Array.isArray(d) && d.variant !== "holiday");
    if (ev) return titleCase(ev.label);
  }
  return wk.title.replace(/\s+(FP\d+)$/i, " · $1");
}

const TERM_START = parseYmd(TIMETABLE[1].weeks[0].weekStart);

function nextScheduled(now) {
  const today = startOfDay(now);
  for (const wk of weeksFor()) {
    const ws = parseYmd(wk.weekStart);
    if (addDays(ws, 7) <= today) continue;
    for (let i = 0; i < 5; i += 1) {
      const date = addDays(ws, i);
      for (const it of dayItems(wk, i)) {
        if (it.kind === "event" && it.variant === "holiday") continue;
        const t = itemTimes(date, it);
        if (t.start > now) return { date, item: it, ...t };
      }
    }
  }
  return null;
}

/* ---------- Deadline helpers ---------- */
function relText(now, d) {
  const n = dayDiff(now, d.day);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

function urgencyClass(now, d) {
  const n = dayDiff(now, d.day);
  if (n <= 1) return "hot";
  if (n <= 3) return "warn";
  if (n <= 7) return "soon";
  return "";
}

/* =========================================================
   2. RENDERERS
   ========================================================= */

function fill(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
  return el;
}

// Re-render while keeping keyboard focus on the same control.
function keepFocus(fn) {
  const fk = document.activeElement?.dataset?.fk;
  fn();
  if (!fk) return;
  const el = document.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
  if (el && !el.disabled) el.focus({ preventScroll: true });
  else if (fk.startsWith("week-")) $("#tt .tt-nav button:not([disabled])")?.focus({ preventScroll: true });
}

function renderGreeting(now) {
  const names = { overview: "Overview", timetable: "Timetable", deadlines: "Deadlines" };
  $("#pageTitle").textContent = names[state.view];
  $("#pageDate").textContent = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
}

/* ---------- Next deadline ---------- */
function renderNext(now) {
  const el = $("#next");
  if (!el) return;
  const next = upcoming(now)[0];
  const signature = `${next?.id || "none"}-${state.group}`;
  state.heroId = next ? next.id : null;
  if (el.dataset.signature === signature) { updateCountdown(now); return; }
  el.dataset.signature = signature;
  el.classList.remove(...MODULES.map((m) => `mod-${m.code}`));

  if (!next) {
    el.innerHTML = `
      <p class="label">Next deadline</p>
      <h2 class="nx-clear">Semester complete.</h2>
      <p class="nx-meta">All scheduled assessments have finished. Earlier dates are available in the PAS calendar.</p>`;
    return;
  }

  el.classList.add(`mod-${next.module}`);
  const m = MOD[next.module];
  const unit = (id, label) => `<div class="nx-unit"><span id="${id}" class="nx-num">00</span><span class="nx-lbl" ${id === "cdD" ? 'id="cdDL"' : ""}>${label}</span></div>`;
  el.innerHTML = `
    <p class="label">Next deadline</p>
    <h2 class="nx-title"><span class="dot"></span><span class="nx-code">${m.code}</span> ${esc(next.title)}</h2>
    <p class="nx-meta"><span class="nx-modname">${esc(m.name)} · </span>${esc(m.lecturer[state.group])} · <span class="nowrap">${fmtShort(next.day)}, 23:59</span></p>
    <div class="nx-count" aria-hidden="true">${unit("cdD", "days")}${unit("cdH", "hours")}${unit("cdM", "min")}</div>
    <div class="nx-actions">
      <a class="btn btn-primary" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer">Open course ${icon("arrow", 14)}</a>
    </div>
    <p id="cdSr" class="sr-only"></p>`;
  updateCountdown(now);
}

function updateCountdown(now) {
  if (!state.heroId) return;
  const d = DEADLINES.find((x) => x.id === state.heroId);
  if (!d) return;
  if (isFinished(d, now)) { renderNext(now); renderDeadlines(now); renderCounts(now); return; }
  // Count down to 23:59; the assessment stays next until it finishes at midnight.
  const { expired, days, hours, minutes } = countdownParts(d.closes, now);
  const set = (id, text) => { const el = document.getElementById(id); if (el && el.textContent !== text) el.textContent = text; };
  set("cdD", pad(days)); set("cdH", pad(hours)); set("cdM", pad(minutes));
  set("cdDL", days === 1 ? "day" : "days");
  set("cdSr", expired ? `${d.module} ${d.title} was due at 23:59 SAST.` : `${d.module} ${d.title} is due ${days + hours + minutes === 0 ? "in less than a minute" : `in ${plural(days, "day")}, ${plural(hours, "hour")} and ${plural(minutes, "minute")}`}, at 23:59 SAST.`);
}

/* ---------- Today ---------- */
// Right-hand side of a row: a start countdown or Done. A lecture in session shows its progress as a fill instead.
function agendaStatusText(start, end, now) {
  if (now >= end) return "Done";
  return now >= start ? "" : `in ${durationText(start - now)}`;
}
const agendaProgress = (start, end, now) => clamp((now - start) / (end - start), 0, 1).toFixed(3);

function agendaHtml(it, date, now) {
  const t = itemTimes(date, it);
  const today = sameDay(date, now);
  const status = now >= t.end ? "past" : now >= t.start ? "now" : "upcoming";
  // Progress only matters for lectures; catch-up, test and holiday days are listed without it.
  const lecture = it.kind !== "event";
  const attrs = `data-start="${t.start.getTime()}" data-end="${t.end.getTime()}" data-today="${today}" data-lecture="${lecture}" data-fk="agenda-${ymd(date)}-${it.start}-${it.code || it.variant}"` +
    (today && lecture && status === "now" ? ` style="--p:${agendaProgress(t.start, t.end, now)}"` : "");
  const cls = ["ag"];
  if (today && lecture && status === "now") cls.push("is-now");
  if (today && status === "past") cls.push("is-past");
  const time = `<span class="ag-time"><span>${it.start}</span><span>${slotEnd(it.end)}</span></span>`;
  const st = today ? `<span class="ag-status">${agendaStatusText(t.start, t.end, now)}</span>` : "";
  if (it.kind === "event") {
    cls.push("is-event", `ev-${it.variant}`);
    return `<li><div class="${cls.join(" ")}" ${attrs}>${time}<span class="ag-main"><span class="ag-title">${esc(titleCase(it.label))}</span></span>${st}</div></li>`;
  }
  const m = MOD[it.code];
  cls.push(`mod-${it.code}`);
  const inner = `${time}<span class="ag-main"><span class="ag-title"><span class="ag-code">${esc(it.code)}</span> <span class="ag-name">${esc(m ? m.name : "")}</span></span><span class="ag-sub">${esc(it.venue)}${m ? ` · ${esc(m.lecturer[state.group])}` : ""}</span></span>${st}`;
  if (!m) return `<li><div class="${cls.join(" ")}" ${attrs}>${inner}</div></li>`;
  return `<li><a class="${cls.join(" ")}" ${attrs} href="${esc(m.course)}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`;
}

function renderToday(now) {
  const el = $("#today");
  if (!el) return;
  const dayIndex = (parts(now).day + 6) % 7;
  const idx = weekIndexContaining(now);
  const wk = idx >= 0 ? weeksFor()[idx] : null;
  const items = wk && dayIndex < 5 ? dayItems(wk, dayIndex) : [];

  const signature = `${ymd(now)}-${state.group}-${items.every((it) => itemTimes(now, it).end <= now)}`;
  if (el.dataset.signature === signature) { updateToday(now); return; }
  el.dataset.signature = signature;
  let body;
  if (items.length) {
    body = `<ul class="agenda">${items.map((it) => agendaHtml(it, now, now)).join("")}</ul>`;
  } else {
    let text;
    if (now < TERM_START) text = `The semester starts ${fmtLong(TERM_START)}.`;
    else if (wk && dayIndex >= 5) text = "No classes today. Enjoy the weekend.";
    else if (wk) text = "No classes today.";
    else text = DEADLINES.some((d) => d.due > now) ? "Classes are finished. Focus on your POE submissions." : "The semester is over.";
    body = `<p class="empty">${text}</p>`;
  }

  let nextLine = "";
  if (items.every((it) => itemTimes(now, it).end <= now)) {
    const nx = nextScheduled(now);
    if (nx) {
      const diff = dayDiff(now, nx.date);
      const when = diff === 0 ? `today ${nx.item.start}` : diff === 1 ? `tomorrow ${nx.item.start}` : `${fmtShort(nx.date)}, ${nx.item.start}`;
      nextLine = nx.item.kind === "event"
        ? `<p class="ag-next ev-${nx.item.variant}"><span class="dot"></span><span>Next: <b>${esc(titleCase(nx.item.label))}</b>, ${when}</span></p>`
        : `<p class="ag-next mod-${nx.item.code}"><span class="dot"></span><span>Next class: <b>${nx.item.code}</b>, ${when} in ${esc(nx.item.venue)}</span></p>`;
    }
  }

  keepFocus(() => { el.innerHTML = `<h2 class="sec-title today-title">Today</h2>${body}${nextLine}`; });
}

function updateToday(now) {
  $$("#today .ag[data-today='true']").forEach((el) => {
    const start = Number(el.dataset.start), end = Number(el.dataset.end);
    const active = now >= start && now < end, past = now >= end;
    const fill = active && el.dataset.lecture === "true";
    el.classList.toggle("is-now", fill); el.classList.toggle("is-past", past);
    if (fill) el.style.setProperty("--p", agendaProgress(start, end, now)); else el.style.removeProperty("--p");
    const status = el.querySelector(".ag-status"), text = agendaStatusText(start, end, now);
    if (status && status.textContent !== text) status.textContent = text;
  });
}

/* ---------- Sidebar modules ---------- */
function renderModules() {
  fill("sideModules", MODULES.map((m) => `<a class="sb-mod mod-${m.code}" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer" title="${esc(`${m.name} with ${m.lecturer[state.group]}. Opens the course on myStudies.`)}">
      <span class="dot"></span>
      <span class="sb-mod-text"><span class="sb-mod-code">${m.code}</span><span class="sb-mod-name">${esc(m.name)}</span></span>
    </a>`).join(""));
}

/* ---------- Sidebar links ---------- */
function sbLinkHtml(link, custom) {
  const ico = link.glyph
    ? `<span class="sb-ico glyph" style="--tint:${esc(link.tint || "#718096")}">${icon(link.glyph, 13, 2.2)}</span>`
    : `<span class="sb-ico"><img class="fav" src="${esc(favUrl(link.url))}" alt="" width="15" height="15" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-mono="${esc(monogram(link.name))}" data-tint="${tintFor(link.name)}"></span>`;
  const desc = link.desc || hostOf(link.url);
  return `<div class="sb-link-wrap"><a class="sb-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" title="${esc(`${link.name}: ${desc}`)}">${ico}<span class="sb-link-name">${esc(link.short || link.name)}</span></a>` +
    (custom ? `<button class="sb-remove" type="button" data-action="remove-link" data-id="${esc(link.id)}" aria-label="${esc(`Remove ${link.name}`)}" title="Remove">${icon("x", 10, 3)}</button>` : "") +
    `</div>`;
}

function addControlHtml() {
  if (!state.adding) return `<button class="sb-add" type="button" data-action="add-link" data-fk="add-link" title="Add your own link. Only you will see it.">${icon("plus", 13, 2.6)} Add link</button>`;
  return `<form id="addForm" class="add-form" novalidate>
    <label for="addName">Link name <span>(optional)</span></label>
    <input id="addName" class="input" name="name" type="text" maxlength="60" placeholder="Study resources" autocomplete="off">
    <label for="addUrl">Web address</label>
    <input id="addUrl" class="input" name="url" type="text" inputmode="url" placeholder="example.com" aria-describedby="linkHelp linkError" autocomplete="off" spellcheck="false">
    <p id="linkHelp" class="field-help">Use a website address, such as example.com.</p>
    <p id="linkError" class="field-error" role="alert" hidden></p>
    <div class="add-actions"><button class="btn btn-primary btn-sm" type="submit">Add link</button><button class="btn btn-ghost btn-sm" type="button" data-action="cancel-add">Cancel</button></div>
  </form>`;
}

function renderLinks() {
  const el = $("#links");
  if (!el) return;
  keepFocus(() => { el.innerHTML = `<div class="sb-grid">${LINKS.map((l) => sbLinkHtml(l, false)).join("")}${state.links.map((l) => sbLinkHtml(l, true)).join("")}${addControlHtml()}</div>`; });
}

function openAddForm() {
  state.adding = true;
  if (window.matchMedia("(max-width: 960px)").matches) openDrawer();
  renderLinks();
  requestAnimationFrame(() => {
    const input = $("#addName");
    if (!input) return;
    input.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
    input.focus({ preventScroll: true });
  });
}

function closeAddForm() {
  state.adding = false;
  renderLinks();
  $('[data-action="add-link"]')?.focus();
}

/* ---------- Timetable ---------- */
function awayLabel(now, ws) {
  const monday = addDays(startOfDay(now), -((parts(now).day + 6) % 7));
  const n = Math.round(dayDiff(monday, ws) / 7);
  if (n === 0) return "This week";
  if (n === 1) return "Next week";
  if (n === -1) return "Last week";
  return n > 0 ? `In ${n} weeks` : `${-n} weeks ago`;
}

function sessionHtml(it, date, now, name) {
  const m = MOD[it.code];
  if (!m) return "";
  const t = itemTimes(date, it);
  const st = now >= t.end ? " is-past" : "";
  return `<a class="tt-session mod-${it.code}${st}" data-end="${t.end.getTime()}" data-fk="session-${ymd(date)}-${it.start}-${it.code}" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(`${it.code} ${m.name}, ${name} ${it.start} to ${slotEnd(it.end)}, ${it.venue}, ${m.lecturer[state.group]}. Opens course page.`)}">` +
    `<div class="tt-code">${esc(it.code)}</div>` +
    `<div class="tt-module">${esc(m.name)} · ${esc(m.lecturer[state.group])}</div>` +
    `<div class="tt-meta"><span>${it.start} - ${slotEnd(it.end)}</span><span>${esc(it.venue)}</span></div></a>`;
}

function eventHtml(it) {
  return `<div class="tt-event ${it.variant}">${esc(it.label)}</div>`;
}

function weekGridHtml(wk, ws, now, todayCol) {
  let g = `<div class="tt-time-head" style="grid-column:1;grid-row:1">Time</div>`;
  DAY_NAMES.forEach((name, i) => {
    const d = addDays(ws, i);
    g += `<div class="tt-day-head${i === todayCol ? " today-column" : ""}" style="grid-column:${i + 2};grid-row:1"><div><div class="tt-day-date">${parts(d).date} ${MON[parts(d).month]}${i === todayCol ? " · Today" : ""}</div><div class="tt-day-name">${name}</div></div></div>`;
  });
  SLOTS.forEach((slot, r) => {
    const lunch = slot.key === "12:00";
    g += `<div class="tt-time-cell" style="grid-column:1;grid-row:${r + 2}">${slot.start}</div>`;
    DAY_NAMES.forEach((_, i) => {
      g += `<div class="tt-bg-cell${lunch ? " lunch" : ""}${i === todayCol ? " today-column" : ""}" style="grid-column:${i + 2};grid-row:${r + 2}">${lunch && i === 2 ? '<div class="tt-lunch-label">Lunch</div>' : ""}</div>`;
    });
  });
  DAY_NAMES.forEach((name, i) => {
    const date = addDays(ws, i);
    dayItems(wk, i).forEach((it) => {
      const a = SLOT_INDEX[it.start];
      const b = SLOT_INDEX[it.end];
      if (a === undefined || b === undefined || b < a) return;
      const inner = it.kind === "event" ? eventHtml(it) : sessionHtml(it, date, now, name);
      g += `<div class="tt-item${i === todayCol ? " today-column" : ""}" style="grid-column:${i + 2};grid-row:${a + 2} / span ${b - a + 1}">${inner}</div>`;
    });
  });
  if (todayCol >= 0) g += `<div class="tt-nowcol" style="grid-column:${todayCol + 2};grid-row:2 / span ${SLOTS.length}"><div id="ttNow" class="tt-now" hidden></div></div>`;
  return g;
}

function weekMobileHtml(wk, ws, now, todayCol) {
  return DAY_NAMES.map((name, i) => {
    const date = addDays(ws, i);
    const items = dayItems(wk, i);
    const open = state.ttExpandAll || i === todayCol || (todayCol < 0 && i === 0);
    const body = items.length
      ? items.map((it) => (it.kind === "event" ? eventHtml(it) : sessionHtml(it, date, now, name))).join("")
      : '<div class="tt-empty">No classes scheduled</div>';
    return `<details class="tt-mobile-day${i === todayCol ? " is-today" : ""}"${open ? " open" : ""}>` +
      `<summary class="tt-mobile-summary"><div><div class="tt-mobile-date">${parts(date).date} ${MON[parts(date).month]}${i === todayCol ? " · Today" : ""}</div><div class="tt-mobile-name">${name}</div></div></summary>` +
      `<div class="tt-mobile-sessions">${body}</div></details>`;
  }).join("");
}

function renderTimetable(now) {
  const el = $("#tt");
  if (!el) return;
  const weeks = weeksFor();
  state.ttIndex = clamp(state.ttIndex, 0, weeks.length - 1);
  const wk = weeks[state.ttIndex];
  const ws = parseYmd(wk.weekStart);
  let todayCol = -1;
  for (let i = 0; i < 5; i += 1) if (sameDay(addDays(ws, i), now)) todayCol = i;
  const away = awayLabel(now, ws);
  const atAuto = state.ttIndex === autoWeekIndex(now);
  const weekend = parts(now).day === 0 || parts(now).day === 6;
  const openDays = new Set($$("#tt .tt-mobile-day").map((d, i) => (d.open ? i : -1)).filter((i) => i >= 0));
  const sameWeek = el.dataset.week === String(state.ttIndex);

  keepFocus(() => {
    el.innerHTML = `
      <div class="tt-card-head">
        <div class="tt-heading">
          <h2 class="tt-week-title">${esc(weekDisplayName(wk))}${atAuto ? "" : ` <span class="tt-away">${away}</span>`}</h2>
        </div>
          <a class="quiet-link tt-official" href="${esc(SOURCES.timetable)}" target="_blank" rel="noopener noreferrer" aria-label="Official timetable"><span>Official<span class="tt-official-more"> timetable</span></span> ${icon("arrow", 13, 2.4)}</a>
          <div class="tt-nav">
            <button class="icon-btn" type="button" data-action="week" data-dir="-1" data-fk="week-prev" aria-label="Previous week" title="Previous week (left arrow)"${state.ttIndex <= 0 ? " disabled" : ""}>${icon("left", 16, 2.4)}</button>
            <button class="btn btn-sm" type="button" data-action="week" data-dir="0" data-fk="week-now" title="Jump to this week (T)"${atAuto ? " disabled" : ""}>${weekend ? "Coming week" : "This week"}</button>
            <button class="icon-btn" type="button" data-action="week" data-dir="1" data-fk="week-next" aria-label="Next week" title="Next week (right arrow)"${state.ttIndex >= weeks.length - 1 ? " disabled" : ""}>${icon("right", 16, 2.4)}</button>
          </div>
        <button class="tt-expand" type="button" data-action="toggle-days" data-fk="toggle-days" aria-controls="ttMobileDays">Expand all</button>
      </div>
      <div class="tt-grid" aria-label="${esc(`${weekDisplayName(wk)} timetable, Group ${state.group}`)}">${weekGridHtml(wk, ws, now, todayCol)}</div>
      <div id="ttMobileDays" class="tt-mobile" aria-label="${esc(`${weekDisplayName(wk)} timetable by day`)}">${weekMobileHtml(wk, ws, now, todayCol)}</div>`;
  });
  if (sameWeek) $$("#tt .tt-mobile-day").forEach((d, i) => { d.open = openDays.has(i); });
  el.dataset.week = String(state.ttIndex);
  syncTimetableExpand();
  updateNowLine(now);
}

function syncTimetableExpand() {
  const days = $$("#tt .tt-mobile-day");
  state.ttExpandAll = days.length > 0 && days.every((day) => day.open);
  const button = $("[data-action='toggle-days']");
  if (button) {
    button.textContent = state.ttExpandAll ? "Collapse all" : "Expand all";
    button.setAttribute("aria-label", `${state.ttExpandAll ? "Collapse" : "Expand"} all timetable days`);
  }
}

function updateNowLine(now = new Date()) {
  const el = $("#ttNow");
  if (!el) return;
  const p = (parts(now).hour * 60 + parts(now).minute - 8 * 60) / (SLOTS.length * 60);
  el.hidden = p < 0 || p > 1;
  el.style.setProperty("--p", clamp(p, 0, 1).toFixed(4));
}

function shiftWeek(dir) {
  const now = new Date();
  const next = dir === 0 ? autoWeekIndex(now) : clamp(state.ttIndex + dir, 0, weeksFor().length - 1);
  if (next === state.ttIndex) return;
  state.ttIndex = next;
  renderTimetable(now);
}

/* ---------- Deadlines ---------- */
function deadlineRowHtml(d, now, nextId) {
  const m = MOD[d.module];
  return `<div id="dl-${d.id}" class="dl mod-${d.module}${d.id === nextId ? " is-next" : ""}">
    <span class="dl-date"><span class="dl-day">${parts(d.day).date}</span><span class="dl-dow">${DOW3[parts(d.day).day]}</span></span>
    <a class="dl-main" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${d.module} course for ${esc(d.title)}"><span class="dl-title"><span class="dl-code">${d.module}</span> <span class="dl-name">${esc(d.title)}</span></span>
    <span class="dl-sub"><span class="dl-modname">${esc(m.name)} · </span>${esc(m.lecturer[state.group])} · ${fmtShort(d.day)}, 23:59</span></a>
    <span class="dl-tail"><span class="badge ${urgencyClass(now, d)}">${relText(now, d)}</span><span class="dl-actions"><a class="icon-btn" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" title="Open course">${icon("arrow", 14)}</a></span></span>
  </div>`;
}

function renderDeadlines(now, { announce = false } = {}) {
  const el = $("#dlPanel");
  if (!el.dataset.built) {
    el.innerHTML = `<div class="dl-toolbar"><div class="module-filters filters" role="group" aria-label="Filter by module">
      <button class="chip" type="button" data-action="filter" data-filter="all" data-fk="filter-all">All modules</button>
      ${MODULES.map((m) => `<button class="chip mod-${m.code}" type="button" data-action="filter" data-filter="${m.code}" data-fk="filter-${m.code}"><span class="dot"></span>${m.code}</button>`).join("")}
      </div><div class="mobile-module-filter"><label for="moduleFilter">Module</label><select id="moduleFilter" aria-label="Module">${[{ code: "all", name: "All modules" }, ...MODULES].map((m) => `<option value="${m.code}">${m.code === "all" ? m.name : `${m.code} · ${m.name}`}</option>`).join("")}</select></div>
      <a class="quiet-link" href="${esc(SOURCES.pas)}" target="_blank" rel="noopener noreferrer">Official PAS ${icon("arrow", 14)}</a></div>
      <p id="dlStatus" class="sr-only" role="status"></p>
      <div id="deadlineRows"></div>`;
    el.dataset.built = "yes";
  }
  $$("[data-action='filter']", el).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter)));
  $("#moduleFilter").value = state.filter;
  const list = upcoming(now).filter((d) => state.filter === "all" || d.module === state.filter);
  const nextId = upcoming(now)[0]?.id;
  if (announce) {
    const what = state.filter === "all" ? "upcoming" : state.filter;
    $("#dlStatus").textContent = list.length ? `Showing ${plural(list.length, `${what} assessment`)}` : `No ${what} assessments remaining`;
  }
  keepFocus(() => fill("deadlineRows", [...new Set(list.map((d) => parts(d.day).month))].map((month) => `<section class="dl-group" aria-label="${MONTHS[month]} assessments"><h2 class="dl-month">${MONTHS[month]}</h2>${list.filter((d) => parts(d.day).month === month).map((d) => deadlineRowHtml(d, now, nextId)).join("")}</section>`).join("") || `<div class="empty-state">${icon("check", 24)}<h2>No upcoming assessments</h2><p>${state.filter === "all" ? "You’re up to date. Earlier dates are available in the PAS calendar." : "There are no remaining assessments for this module."}</p></div>`));
}

/* ---------- PAS calendar ---------- */
const CAL_START = parts(TERM_START).month;
const CAL_END = Math.max(...DEADLINES.map((d) => parts(d.day).month));
const CAL_TOTAL = CAL_END - CAL_START + 1;
// Calendar slide for a date: its month in the semester year, or the first/last month outside it.
const calMonthIndex = (date) => { const p = parts(date); return clamp(p.year === CAL_YEAR ? p.month - CAL_START : p.year < CAL_YEAR ? 0 : CAL_TOTAL - 1, 0, CAL_TOTAL - 1); };
const cal = { index: 0, anchor: 0, frame: 0, built: false, resizing: false, userScrolling: false };

function buildCalendar() {
  const scroller = $("#calScroller");
  if (!scroller) return;
  let html = "";
  for (let m = CAL_START; m <= CAL_END; m += 1) {
    const first = fromParts(CAL_YEAR, m, 1), offset = parts(first).day, count = parts(fromParts(CAL_YEAR, m + 1, 0)).date;
    let cells = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join("");
    for (let i = 0; i < offset; i += 1) cells += '<span class="cal-day blank" aria-hidden="true"></span>';
    for (let day = 1; day <= count; day += 1) {
      const date = fromParts(CAL_YEAR, m, day), key = ymd(date), event = DEADLINES.some((d) => d.date === key);
      const tag = event ? "button" : "span";
      cells += `<${tag} ${event ? 'type="button"' : ""} class="cal-day${parts(date).day % 6 === 0 ? " weekend" : ""}" data-date="${key}">${day}</${tag}>`;
    }
    for (let i = offset + count; i < 42; i += 1) cells += `<span class="cal-day blank${i >= Math.ceil((offset + count) / 7) * 7 ? " extra-row" : ""}" aria-hidden="true"></span>`;
    html += `<div class="cal-slide"><section class="cal" data-month="${m}" aria-label="${MONTHS[m]} ${CAL_YEAR}"><h3 class="cal-title">${MONTHS[m]} <span>${CAL_YEAR}</span></h3><div class="cal-grid">${cells}</div></section></div>`;
  }
  scroller.innerHTML = html;
  fill("calendarLegend", MODULES.map((m) => `<span class="mod-${m.code}"><span class="dot"></span>${m.code}</span>`).join(""));
  scroller.addEventListener("scroll", () => { cancelAnimationFrame(cal.frame); cal.frame = requestAnimationFrame(syncCalFromScroll); }, { passive: true });
  ["pointerdown", "touchstart", "wheel"].forEach((event) => scroller.addEventListener(event, () => { cal.userScrolling = true; }, { passive: true }));
  cal.built = true;
}

function calDayStatus(now, d) {
  if (isFinished(d, now)) return "Finished";
  const n = dayDiff(now, d.day);
  if (n > 1) return `${n} days left`;
  if (n === 1) return "1 day left";
  if (n === 0) return "Due today";
  return "Past assessment";
}

function renderCalendar(now) {
  if (!cal.built) buildCalendar();
  const scroller = $("#calScroller"), today = startOfDay(now);
  $$(".cal-day[data-date]", scroller).forEach((cell) => {
    const date = parseYmd(cell.dataset.date), events = DEADLINES.filter((d) => d.date === cell.dataset.date);
    cell.classList.toggle("past", date < today); cell.classList.toggle("today", sameDay(date, now));
    if (sameDay(date, now)) cell.setAttribute("aria-current", "date"); else cell.removeAttribute("aria-current");
    if (!events.length) return;
    cell.classList.add("has-event", `event-${events[0].module}`);
    cell.classList.toggle("is-done", events.every((d) => isFinished(d, now)));
    cell.dataset.action = "cal-tip";
    cell.setAttribute("aria-haspopup", "dialog");
    cell.setAttribute("aria-expanded", String(activeAssessmentDate === cell.dataset.date));
    cell.setAttribute("aria-label", `${fmtLong(date)}: ${events.map((d) => `${d.module} ${d.title}, ${calDayStatus(now, d)}`).join("; ")}. Open assessment details.`);
  });
  updateCalControls();
}

let activeAssessmentDate = null;
function renderAssessmentDialog() {
  const now = new Date();
  const list = DEADLINES.filter((d) => d.date === activeAssessmentDate);
  if (!list.length) return;
  $("#assessmentTitle").textContent = list.length === 1 ? `${list[0].module} · ${list[0].title}` : "Assessment details";
  keepFocus(() => fill("assessmentBody", list.map((d) => { const m = MOD[d.module]; return `<section class="assessment-entry mod-${d.module}">${list.length > 1 ? `<h3>${d.module} · ${esc(d.title)}</h3>` : ""}<p class="assessment-module"><span class="dot"></span>${esc(m.name)}</p><dl class="assessment-facts"><div><dt>Due</dt><dd>${fmtLong(d.day)} ${parts(d.day).year}, 23:59</dd></div><div><dt>Lecturer</dt><dd>${esc(m.lecturer[state.group])}</dd></div><div><dt>Status</dt><dd class="${isFinished(d, now) ? "finished" : ""}">${calDayStatus(now, d)}</dd></div></dl><div class="assessment-actions"><a class="btn btn-primary" href="${esc(m.course)}" target="_blank" rel="noopener noreferrer">Open course ${icon("arrow", 14)}</a></div></section>`; }).join("")));
}
function closeCalTips() { if ($("#assessmentDialog").open) $("#assessmentDialog").close(); }
function toggleCalTip(cell) {
  activeAssessmentDate = cell.dataset.date;
  renderAssessmentDialog();
  cell.setAttribute("aria-expanded", "true");
  $("#assessmentDialog").showModal();
}

function calSlides() { return $$("#calScroller .cal-slide"); }

function calVisible() {
  const sc = $("#calScroller");
  const slides = calSlides();
  if (!sc || !slides.length || !sc.clientWidth) return 1;
  const gap = parseFloat(getComputedStyle(sc).columnGap) || 0;
  return Math.max(1, Math.round((sc.clientWidth + gap) / (slides[0].getBoundingClientRect().width + gap)));
}

function calScrollTo(index, smooth = true) {
  const sc = $("#calScroller");
  const slides = calSlides();
  if (!sc || !slides.length) return;
  cal.anchor = clamp(index, 0, CAL_TOTAL - 1);
  cal.userScrolling = false;
  cal.index = clamp(index, 0, Math.max(0, CAL_TOTAL - calVisible()));
  sc.scrollTo({ left: slides[cal.index].offsetLeft - slides[0].offsetLeft, behavior: smooth && !reduceMotion() ? "smooth" : "instant" });
  updateCalControls();
}

function syncCalFromScroll() {
  if (cal.resizing) return;
  const sc = $("#calScroller");
  const slides = calSlides();
  if (!sc || slides.length < 2) return;
  const step = slides[1].offsetLeft - slides[0].offsetLeft;
  if (step > 0) {
    cal.index = clamp(Math.round(sc.scrollLeft / step), 0, Math.max(0, CAL_TOTAL - calVisible()));
    if (cal.userScrolling) cal.anchor = cal.index;
  }
  updateCalControls();
}

function updateCalControls() {
  const prev = $("#calPrev");
  const next = $("#calNext");
  if (!prev || !next) return;
  const visible = calVisible();
  prev.disabled = cal.index <= 0;
  next.disabled = cal.index >= CAL_TOTAL - visible;
  const end = Math.min(CAL_TOTAL - 1, cal.index + visible - 1);
  calSlides().forEach((slide, index) => { const hidden = index < cal.index || index > end; slide.inert = hidden; slide.setAttribute("aria-hidden", String(hidden)); });
  $("#calScroller")?.setAttribute("aria-label", `PAS calendar showing ${MONTHS[cal.index + CAL_START]}${end > cal.index ? ` to ${MONTHS[end + CAL_START]}` : ""} ${CAL_YEAR}`);
}

/* ---------- Deadlines count in the sidebar ---------- */
function renderCounts(now) {
  const n = upcoming(now).length;
  $$("[data-count]").forEach((el) => { el.textContent = n ? String(n) : ""; el.hidden = !n; });
}

/* ---------- Everything ---------- */
function renderDynamic(now = new Date()) {
  renderGreeting(now);
  renderNext(now);
  renderToday(now);
  renderModules();
  renderDeadlines(now);
  renderCalendar(now);
  renderCounts(now);

}

function renderAll(now = new Date()) {
  renderDynamic(now);
  renderTimetable(now);
}

/* =========================================================
   3. ACTIONS
   ========================================================= */

function setView(view, { updateUrl = true, moveFocus = true } = {}) {
  if (!VIEWS.includes(view)) view = "overview";
  closeDrawer({ returnFocus: false });
  const changed = state.view !== view;
  state.view = view;
  $$("[data-view-panel]").forEach((panel) => {
    const on = panel.dataset.viewPanel === view;
    panel.hidden = !on;
  });
  $$("[data-nav]").forEach((btn) => {
    if (btn.dataset.view === view) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  if (updateUrl) {
    try { if (changed) history.pushState({ view }, "", view === "overview" ? location.pathname + location.search : `#${view}`); } catch { /* sandboxed */ }
  }
  renderGreeting(new Date());
  if (changed) { window.scrollTo({ top: 0, behavior: "auto" }); if (moveFocus) $("#pageTitle")?.focus({ preventScroll: true }); }
  refreshView();
  if (view === "overview") calScrollTo(cal.anchor, false);
}

function setGroup(group, { announce = false } = {}) {
  if (group !== "1" && group !== "2") return;
  const changed = group !== state.group;
  state.group = group;
  root.dataset.group = group;
  store.set(KEYS.group, group);
  const ob = $("#onboard");
  const fromOnboard = ob?.contains(document.activeElement);
  if (ob) ob.hidden = true;
  syncGroupButtons();
  // The onboarding buttons disappear, so keep focus on the matching group control.
  if (fromOnboard) $(`.group-btn[data-group="${group}"]`)?.focus();
  if (changed) {
    state.ttIndex = autoWeekIndex();
    renderAll();
  }
  if (announce) toast(`Showing Group ${group}`);
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  // Use the token: the body's computed colour is still mid-transition here.
  const meta = $('meta[name="theme-color"]');
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (meta && bg) meta.content = bg;
}

function toggleTheme() {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set(KEYS.theme, next);
}

function syncGroupButtons() {
  $$("[role='radio'][data-action='group']").forEach((b) => { const selected = b.dataset.group === state.group; b.setAttribute("aria-checked", String(selected)); b.tabIndex = selected ? 0 : -1; });
}
let drawerOpener = null;
function openDrawer() {
  if (!window.matchMedia("(max-width: 960px)").matches) return;
  drawerOpener = document.activeElement?.matches("[data-action='menu']") ? document.activeElement : $("[data-action='menu']");
  document.body.classList.add("drawer-open");
  $("#sidebar").inert = false;
  $(".main").inert = true; $(".bottom-nav").inert = true;
  $("#sidebar").setAttribute("role", "dialog"); $("#sidebar").setAttribute("aria-modal", "true");
  $("[data-action='menu']").setAttribute("aria-expanded", "true");
  $("#sidebar").focus({ preventScroll: true });
}
function closeDrawer({ returnFocus = true } = {}) {
  const wasOpen = document.body.classList.contains("drawer-open");
  document.body.classList.remove("drawer-open");
  $("#sidebar").inert = window.matchMedia("(max-width: 960px)").matches;
  $(".main").inert = false; $(".bottom-nav").inert = false;
  $("#sidebar").removeAttribute("role"); $("#sidebar").removeAttribute("aria-modal");
  $("[data-action='menu']").setAttribute("aria-expanded", "false");
  if (wasOpen && returnFocus && drawerOpener?.getClientRects().length) drawerOpener.focus({ preventScroll: true });
}

/* ---------- Toast ---------- */
let toastTimer = 0;
let toastReturnFocus = null;
function hideToast() {
  const el = $("#toast");
  clearTimeout(toastTimer);
  if (el.contains(document.activeElement)) {
    const target = toastReturnFocus?.isConnected ? toastReturnFocus : $("[data-action='add-link']") || $("#pageTitle");
    target?.focus({ preventScroll: true });
  }
  el.classList.remove("show"); el.hidden = true; el.inert = true; el.replaceChildren();
}
function toast(message, action) {
  hideToast();
  const el = $("#toast");
  toastReturnFocus = document.activeElement;
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  el.hidden = false; el.inert = false; el.classList.add("show");
  if (action) el.querySelector("button").addEventListener("click", () => { hideToast(); action.run(); }, { once: true });
  toastTimer = setTimeout(hideToast, action ? 12000 : 4000);
}

function goThisWeek() {
  state.ttIndex = autoWeekIndex();
  renderTimetable(new Date());
  setView("timetable");
}

/* =========================================================
   4. EVENTS
   ========================================================= */

function bindEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t || t.tagName === "INPUT") return;
    const { action, id } = t.dataset;
    switch (action) {
      case "view": e.preventDefault(); setView(t.dataset.view); break;
      case "theme": toggleTheme(); break;
      case "group": setGroup(t.dataset.group, { announce: t.hasAttribute("data-announce") }); break;
      case "cal-tip": toggleCalTip(t); break;
      case "week": shiftWeek(Number(t.dataset.dir)); break;
      case "toggle-days": {
        const expand = !state.ttExpandAll;
        $$("#tt .tt-mobile-day").forEach((day) => { day.open = expand; });
        syncTimetableExpand();
        break;
      }
      case "filter": state.filter = t.dataset.filter; renderDeadlines(new Date(), { announce: true }); break;
      case "calendar-today": calScrollTo(calMonthIndex(new Date())); break;
      case "close-assessment": closeCalTips(); break;
      case "add-link": openAddForm(); break;
      case "cancel-add": closeAddForm(); break;
      case "remove-link": {
        const index = state.links.findIndex((l) => l.id === id);
        if (index < 0) break;
        const [removed] = state.links.splice(index, 1);
        saveLinks();
        renderLinks();
        $('[data-action="add-link"]')?.focus();
        toast(`Removed ${removed.name}`, { label: "Undo", run: () => { state.links.splice(index, 0, removed); saveLinks(); renderLinks(); } });
        break;
      }
      case "menu": document.body.classList.contains("drawer-open") ? closeDrawer() : openDrawer(); break;
      case "close-drawer": closeDrawer(); break;
      default: break;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "moduleFilter") { state.filter = e.target.value; renderDeadlines(new Date(), { announce: true }); return; }
  });
  document.addEventListener("toggle", (e) => { if (e.target.matches?.("#tt .tt-mobile-day")) syncTimetableExpand(); }, true);

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "addForm") return;
    e.preventDefault();
    const urlInput = $("#addUrl");
    const url = normalizeUrl(urlInput.value);
    if (!url) {
      urlInput.setAttribute("aria-invalid", "true");
      urlInput.focus();
      $("#linkError").textContent = "Enter a valid web address, such as example.com.";
      $("#linkError").hidden = false;
      return;
    }
    if (state.links.length >= 40) { $("#linkError").textContent = "You can save up to 40 links. Remove a link before adding another."; $("#linkError").hidden = false; return; }
    const name = ($("#addName").value.trim() || hostOf(url)).slice(0, 60);
    state.links.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, url });
    saveLinks();
    state.adding = false;
    renderLinks();
    $('[data-action="add-link"]')?.focus();
    toast(`Added ${name}`);
  });

  document.addEventListener("input", (e) => { if (e.target.id === "addUrl") { e.target.removeAttribute("aria-invalid"); $("#linkError").hidden = true; } });

  // Your own links use the site's own icon. When it has none, show initials instead.
  const useMonogram = (img) => {
    const holder = img.parentElement;
    if (!holder) return;
    holder.classList.add("mono");
    holder.style.setProperty("--tint", img.dataset.tint || "#71717a");
    holder.textContent = (img.dataset.mono || "•").slice(0, 2);
  };
  document.addEventListener("error", (e) => { if (e.target instanceof HTMLImageElement && e.target.classList.contains("fav")) useMonogram(e.target); }, true);

  // Group radios: arrow keys.
  $$("[role='radiogroup']").forEach((rg) => rg.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = state.group === "1" ? "2" : "1";
    setGroup(next);
    rg.querySelector(`[data-group="${next}"]`)?.focus();
  }));

  // Swipe sideways on the timetable to change week.
  let touch = null;
  document.addEventListener("touchstart", (e) => {
    if (!e.target.closest?.("#tt .tt-grid, #tt .tt-mobile")) { touch = null; return; }
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) shiftWeek(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Keyboard shortcuts.
  document.addEventListener("keydown", (e) => {
    const key = e.key;
    if ($("#assessmentDialog").open) return;
    if (document.body.classList.contains("drawer-open") && key === "Tab") {
      const sidebar = $("#sidebar");
      const controls = $$("a[href], button:not([disabled]), input, select, [tabindex='0']", sidebar).filter((el) => el.getClientRects().length && !el.closest("[hidden]"));
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sidebar)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === sidebar)) { e.preventDefault(); first?.focus(); }
      return;
    }
    if (key === "Escape") {
      if (e.target.closest?.("#addForm")) { e.preventDefault(); closeAddForm(); return; }
      if (document.body.classList.contains("drawer-open")) { closeDrawer(); return; }
    }
    const target = e.target;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (target.closest?.("input, textarea, select, [contenteditable='true']")) return;
    switch (key) {
      case "1":
      case "2":
      case "3": setView(VIEWS[Number(key) - 1]); break;
      case "g":
      case "G": setGroup(state.group === "1" ? "2" : "1", { announce: true }); break;
      case "t":
      case "T": goThisWeek(); break;
      case "ArrowLeft":
      case "ArrowRight": {
        if (target.closest?.("[role='radiogroup']")) return;
        const dir = key === "ArrowLeft" ? -1 : 1;
        if (state.view === "timetable") { e.preventDefault(); shiftWeek(dir); }
        else if (state.view === "overview" && !target.closest?.(".sidebar")) { e.preventDefault(); calScrollTo(cal.index + dir); }
        break;
      }
      default: break;
    }
  });

  const syncView = () => setView(location.hash.slice(1) || "overview", { updateUrl: false, moveFocus: false });
  window.addEventListener("popstate", syncView);
  window.addEventListener("hashchange", syncView);
  const dialog = $("#assessmentDialog");
  dialog.addEventListener("close", () => { activeAssessmentDate = null; $$(".cal-day[aria-expanded='true']").forEach((cell) => cell.setAttribute("aria-expanded", "false")); });
  dialog.addEventListener("click", (e) => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); });
  $("#toast").addEventListener("focusin", () => clearTimeout(toastTimer));
  $("#toast").addEventListener("pointerenter", () => clearTimeout(toastTimer));
  $("#toast").addEventListener("pointerleave", () => { if (!$("#toast").hidden) toastTimer = setTimeout(hideToast, 12000); });

  document.addEventListener("visibilitychange", () => {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    tick(); scheduleClock();
  });
}

/* ---------- Clock ---------- */
let clockTimer = 0;
// Time-dependent parts of the view on screen; a view catches up as soon as it is shown.
function refreshView(now = new Date()) {
  if (state.view === "overview") renderToday(now);
  if (state.view === "timetable") {
    $$("#tt .tt-session[data-end]").forEach((el) => el.classList.toggle("is-past", now >= Number(el.dataset.end)));
    updateNowLine(now);
  }
}
function tick() {
  const now = new Date(), dayKey = ymd(now);
  if (dayKey !== state.lastDay) {
    // Follow the new day only where the current week or month was on screen; keep any other choice.
    const yesterday = parseYmd(state.lastDay);
    const followWeek = state.ttIndex === autoWeekIndex(yesterday);
    const followMonth = cal.anchor === calMonthIndex(yesterday);
    state.lastDay = dayKey;
    if (followWeek) state.ttIndex = autoWeekIndex(now);
    keepFocus(() => renderAll(now));
    if (followMonth) calScrollTo(calMonthIndex(now));
    return;
  }
  updateCountdown(now);
  renderGreeting(now);
  refreshView(now);
}
function scheduleClock() {
  clearTimeout(clockTimer);
  if (!document.hidden) clockTimer = setTimeout(() => { tick(); scheduleClock(); }, 60000 - (Date.now() % 60000) + 20);
}

/* =========================================================
   5. INIT
   ========================================================= */

function init() {
  const now = new Date();
  state.lastDay = ymd(now);
  state.ttIndex = autoWeekIndex(now);

  $$("[data-src]").forEach((a) => { const url = SOURCES[a.dataset.src]; if (url) a.href = url; });
  $(".brand-text small").textContent = `${SEMESTER.name} · ${SEMESTER.year}`;
  syncGroupButtons();
  if (root.dataset.groupChosen !== "yes") { const ob = $("#onboard"); if (ob) ob.hidden = false; }

  // Phones and tablets: group switch and theme toggle live in the top bar.
  const headActions = $(".head-actions");
  const phoneQuery = window.matchMedia("(max-width: 960px)");
  const placeHeadActions = () => {
    (phoneQuery.matches ? $(".mobilebar") : $(".page-head"))?.appendChild(headActions);
    if (!phoneQuery.matches) closeDrawer();
    else $("#sidebar").inert = !document.body.classList.contains("drawer-open");
  };
  if (headActions) { placeHeadActions(); phoneQuery.addEventListener?.("change", placeHeadActions); }

  bindEvents();
  renderLinks();
  renderAll(now);
  $("#calPrev")?.addEventListener("click", () => calScrollTo(cal.index - 1));
  $("#calNext")?.addEventListener("click", () => calScrollTo(cal.index + 1));
  cal.index = calMonthIndex(now);
  cal.anchor = cal.index;
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    cal.resizing = true;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cal.resizing = false;
      if (state.view === "overview") calScrollTo(cal.anchor, false);
    }, 150);
  }, { passive: true });
  applyTheme(root.dataset.theme === "dark" ? "dark" : "light");
  // Until a theme is chosen here, follow the device's light or dark setting as it changes.
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
    if (!["light", "dark"].includes(store.get(KEYS.theme))) applyTheme(e.matches ? "dark" : "light");
  });
  setView(location.hash.slice(1) || "overview", { updateUrl: false, moveFocus: false });
  requestAnimationFrame(() => calScrollTo(cal.index, false));
  document.fonts?.ready?.then(() => calScrollTo(cal.anchor, false));

  scheduleClock();
}

init();
