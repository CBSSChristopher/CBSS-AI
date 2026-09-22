export const CHICAGO = "America/Chicago";

export type CivilDate = { y: number; m: number; d: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function civilKey(d: CivilDate): string {
  return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
}

export function parseCivil(raw: string): CivilDate | null {
  const m = String(raw || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function chicagoNow(now = new Date()): { civil: CivilDate; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { civil: { y: num("year"), m: num("month"), d: num("day") }, hour: num("hour"), minute: num("minute") };
}

export function addCalendarDays(d: CivilDate, days: number): CivilDate {
  const utc = new Date(Date.UTC(d.y, d.m - 1, d.d + days));
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}

export function weekdayMonday0(d: CivilDate): number {
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
}

function nthWeekday(y: number, m: number, weekday: number, n: number): CivilDate {
  const first = { y, m, d: 1 };
  const firstWd = weekdayMonday0(first);
  const delta = (weekday - firstWd + 7) % 7;
  return addCalendarDays(first, delta + (n - 1) * 7);
}

function lastWeekday(y: number, m: number, weekday: number): CivilDate {
  const next = m === 12 ? { y: y + 1, m: 1, d: 1 } : { y, m: m + 1, d: 1 };
  let d = addCalendarDays(next, -1);
  while (weekdayMonday0(d) !== weekday) d = addCalendarDays(d, -1);
  return d;
}

function observeWeekend(d: CivilDate): CivilDate {
  const wd = weekdayMonday0(d);
  if (wd === 6) return addCalendarDays(d, -1);
  if (wd === 0) return addCalendarDays(d, 1);
  return d;
}

/** U.S. federal holidays for any year (observed Sat→Fri, Sun→Mon). */
export function usFederalHolidays(year: number): CivilDate[] {
  const raw = [
    { y: year, m: 1, d: 1 },
    nthWeekday(year, 1, 1, 3),
    nthWeekday(year, 2, 1, 3),
    lastWeekday(year, 5, 1),
    { y: year, m: 6, d: 19 },
    { y: year, m: 7, d: 4 },
    nthWeekday(year, 9, 1, 1),
    nthWeekday(year, 10, 1, 2),
    { y: year, m: 11, d: 11 },
    nthWeekday(year, 11, 4, 4),
    { y: year, m: 12, d: 25 },
  ];
  return raw.map(observeWeekend);
}

export function extraHolidays(raw: string): CivilDate[] {
  return String(raw || "")
    .split(/[,\s]+/)
    .map(parseCivil)
    .filter((d): d is CivilDate => Boolean(d));
}

export function isWeekend(d: CivilDate): boolean {
  const wd = weekdayMonday0(d);
  return wd === 0 || wd === 6;
}

export function isHoliday(d: CivilDate, extra: CivilDate[] = []): boolean {
  const key = civilKey(d);
  if (extra.some((h) => civilKey(h) === key)) return true;
  return usFederalHolidays(d.y).some((h) => civilKey(h) === key);
}

export function isBusinessDay(d: CivilDate, extra: CivilDate[] = []): boolean {
  return !isWeekend(d) && !isHoliday(d, extra);
}

export function addBusinessDays(start: CivilDate, n: number, extra: CivilDate[] = []): CivilDate {
  if (n <= 0) return start;
  let d = start;
  let left = n;
  while (left > 0) {
    d = addCalendarDays(d, 1);
    if (isBusinessDay(d, extra)) left -= 1;
  }
  return d;
}

export function nextBusinessDayOnOrAfter(start: CivilDate, extra: CivilDate[] = []): CivilDate {
  let d = start;
  while (!isBusinessDay(d, extra)) d = addCalendarDays(d, 1);
  return d;
}

export function chicagoBusinessHours(now = new Date()): boolean {
  const { hour } = chicagoNow(now);
  return hour >= 8 && hour < 19;
}

export function dueIso(d: CivilDate, hour = 10, minute = 0): string {
  return `${civilKey(d)}T${pad(hour)}:${pad(minute)}`;
}

export function dueReached(dueLocal: string, now = new Date()): boolean {
  const raw = String(dueLocal || "").trim();
  if (!raw) return false;
  const { civil, hour, minute } = chicagoNow(now);
  const due = parseCivil(raw);
  if (!due) return false;
  const hm = raw.match(/T(\d{2}):(\d{2})/);
  const dh = hm ? Number(hm[1]) : 10;
  const dm = hm ? Number(hm[2]) : 0;
  if (civil.y !== due.y) return civil.y > due.y;
  if (civil.m !== due.m) return civil.m > due.m;
  if (civil.d !== due.d) return civil.d > due.d;
  return hour > dh || (hour === dh && minute >= dm);
}
