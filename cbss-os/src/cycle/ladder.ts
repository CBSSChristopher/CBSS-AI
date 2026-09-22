import {
  addBusinessDays,
  chicagoNow,
  civilKey,
  dueIso,
  dueReached,
  extraHolidays,
  nextBusinessDayOnOrAfter,
  parseCivil,
  type CivilDate,
} from "./business-days.ts";
import type { CteStep, CycleRecord, SendRecord } from "./store.ts";
import type { TemplateId } from "./templates.ts";

export const CTE_OFFSETS: Record<Exclude<CteStep, "CTE1">, number> = {
  CTE2: 1,
  CTE3: 3,
  CTE4: 7,
};

export function holidayExtras(env: { US_HOLIDAY_EXTRA?: string }): CivilDate[] {
  return extraHolidays(String(env.US_HOLIDAY_EXTRA || ""));
}

export function cte1Civil(rec: CycleRecord, now = new Date()): CivilDate {
  return parseCivil(rec.cte1Date) || chicagoNow(now).civil;
}

export function scheduleFromCte1(cte1: CivilDate, extras: CivilDate[] = []): Record<"cte2" | "cte3" | "cte4", string> {
  const start = nextBusinessDayOnOrAfter(cte1, extras);
  return {
    cte2: dueIso(addBusinessDays(start, CTE_OFFSETS.CTE2, extras)),
    cte3: dueIso(addBusinessDays(start, CTE_OFFSETS.CTE3, extras)),
    cte4: dueIso(addBusinessDays(start, CTE_OFFSETS.CTE4, extras)),
  };
}

function pendingSend(template: TemplateId, dueAt: string): SendRecord {
  return { template, status: "pending", dueAt, attempts: 0 };
}

export function applyNoAnswerSchedule(rec: CycleRecord, extras: CivilDate[] = [], now = new Date()): CycleRecord {
  const cte1 = cte1Civil(rec, now);
  rec.cte1Date = rec.cte1Date || civilKey(cte1);
  const dates = scheduleFromCte1(cte1, extras);
  if (!rec.sends.cte2 || rec.sends.cte2.status === "pending" || rec.sends.cte2.status === "failed") {
    rec.sends.cte2 = pendingSend("cte2", dates.cte2);
  }
  if (!rec.sends.cte3 || rec.sends.cte3.status === "pending" || rec.sends.cte3.status === "failed") {
    rec.sends.cte3 = pendingSend("cte3", dates.cte3);
  }
  if (!rec.sends.cte4 || rec.sends.cte4.status === "pending" || rec.sends.cte4.status === "failed") {
    rec.sends.cte4 = pendingSend("cte4", dates.cte4);
  }
  rec.nextDue = nextOpenDue(rec);
  rec.cteStage = rec.cteStage && rec.cteStage !== "CTE1" ? rec.cteStage : "CTE1";
  return rec;
}

export function nextOpenDue(rec: CycleRecord): string {
  const order: TemplateId[] = ["cte2", "cte3", "cte4"];
  for (const id of order) {
    const send = rec.sends[id];
    if (send && (send.status === "pending" || send.status === "failed" || send.status === "sending")) return send.dueAt || "";
  }
  return "";
}

/**
 * Override the next unsent CTE email.
 * Remaining later steps keep the original gaps from that next step
 * (CTE2=+1, CTE3=+3, CTE4=+7 from CTE1 → later = override + (theirOffset - nextOffset) business days).
 */
export function applyOverride(
  rec: CycleRecord,
  whenLocal: string,
  extras: CivilDate[] = [],
): { ok: true; from: string; to: string; step: TemplateId } | { ok: false; error: string } {
  if (rec.stopped) return { ok: false, error: "Reply-stop already won. Override cannot restart the ladder." };
  const order: Array<{ step: Exclude<CteStep, "CTE1">; id: TemplateId; offset: number }> = [
    { step: "CTE2", id: "cte2", offset: CTE_OFFSETS.CTE2 },
    { step: "CTE3", id: "cte3", offset: CTE_OFFSETS.CTE3 },
    { step: "CTE4", id: "cte4", offset: CTE_OFFSETS.CTE4 },
  ];
  const next = order.find(({ id }) => {
    const send = rec.sends[id];
    return send && send.status !== "sent" && send.status !== "skipped";
  });
  if (!next) return { ok: false, error: "No remaining CTE email to override." };
  const dueDay = parseCivil(whenLocal);
  if (!dueDay) return { ok: false, error: "Type a next-step date and time." };
  const from = rec.sends[next.id]?.dueAt || rec.nextDue || "";
  rec.sends[next.id] = pendingSend(next.id, whenLocal);
  for (const later of order) {
    if (later.offset <= next.offset) continue;
    const send = rec.sends[later.id];
    if (!send || send.status === "sent" || send.status === "skipped") continue;
    const gap = later.offset - next.offset;
    rec.sends[later.id] = pendingSend(later.id, dueIso(addBusinessDays(dueDay, gap, extras)));
  }
  rec.nextDue = whenLocal;
  rec.cteStage = next.step;
  return { ok: true, from, to: whenLocal, step: next.id };
}

export function dueTemplates(rec: CycleRecord, now = new Date()): TemplateId[] {
  if (rec.stopped || rec.paused) return [];
  const out: TemplateId[] = [];
  for (const id of ["cte1", "cte2", "cte3", "cte4"] as TemplateId[]) {
    const send = rec.sends[id];
    if (!send) continue;
    if (send.status === "sent" || send.status === "skipped") continue;
    if (send.status === "sending" && send.attempts > 0 && Date.now() - Date.parse(rec.updatedAt) < 2 * 60 * 1000) continue;
    if (send.dueAt && !dueReached(send.dueAt, now)) continue;
    out.push(id);
  }
  return out;
}
