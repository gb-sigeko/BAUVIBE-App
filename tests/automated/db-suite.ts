import { AvailabilityReason, PlanungSource, PlanungType } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { mondayUtcOfIsoWeek } from "../../lib/iso-week";
import { applyPlanungFeedback } from "../../lib/planung-feedback-apply";
import { syncTurnusSuggestions, applyKrankVertretungForHorizon } from "../../lib/turnus-engine";
import { computeTurnusWeekGrid } from "../../lib/turnus-variants";
import { AUTO_TEST_TENANT, horizonRange, isoKey, TEST_YEAR } from "./constants";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SuiteError = { test: string; message: string };

export async function runDbAutomatedSuite(): Promise<SuiteError[]> {
  const errors: SuiteError[] = [];
  const horizon = horizonRange();
  const anchor = mondayUtcOfIsoWeek(TEST_YEAR, 1);

  const push = (test: string, message: string) => errors.push({ test, message });

  try {
    await testTurnus40Weeks(anchor, horizon, push);
  } catch (e) {
    push("Test1", String(e));
  }

  try {
    await testFestPriority(anchor, horizon, push);
  } catch (e) {
    push("Test2", String(e));
  }

  try {
    await testFeedbackCounting(anchor, push);
  } catch (e) {
    push("Test3", String(e));
  }

  try {
    await testVertretungKrank(anchor, horizon, push);
  } catch (e) {
    push("Test4", String(e));
  }

  try {
    await testArbeitskorbUeberfaellig(push);
  } catch (e) {
    push("Test5", String(e));
  }

  try {
    await testBestOfNTurnus(horizon, push);
  } catch (e) {
    push("BestOfN", String(e));
  }

  return errors;
}

async function testTurnus40Weeks(
  anchor: Date,
  horizon: { isoYear: number; isoWeek: number }[],
  push: (t: string, m: string) => void,
) {
  await syncTurnusSuggestions(prisma, anchor, horizon, { tenantId: AUTO_TEST_TENANT });

  const projects = await prisma.project.findMany({
    where: { tenantId: AUTO_TEST_TENANT },
    include: {
      begehungen: {
        where: { begehungStatus: "DURCHGEFUEHRT" },
        orderBy: { date: "desc" },
        take: 5,
        include: { employee: true },
      },
    },
  });

  for (const p of projects) {
    if (p.status !== "ACTIVE" || !p.turnus) continue;
    if (p.turnus === "ABRUF") {
      const n = await prisma.planungEntry.count({
        where: {
          projectId: p.id,
          planungSource: "TURNUS",
          isoYear: TEST_YEAR,
          isoWeek: { gte: 1, lte: 40 },
        },
      });
      if (n !== 0) push("Test1", `ABRUF ${p.code}: erwartet 0 Turnus-Vorschläge, ist ${n}`);
      continue;
    }

    const lastOk = p.begehungen.find((b) => {
      const sc = b.employee?.shortCode?.toUpperCase();
      return !sc || sc !== "UF";
    });
    const lastInspection = lastOk?.date ?? null;

    const expected = computeTurnusWeekGrid("A", {
      turnus: p.turnus,
      lastInspection,
      startDate: p.startDate,
      createdAt: p.createdAt,
      horizon,
    });

    const festRows = await prisma.planungEntry.findMany({
      where: { projectId: p.id, planungType: PlanungType.FEST, isoYear: TEST_YEAR, isoWeek: { gte: 1, lte: 40 } },
      select: { isoWeek: true },
    });
    for (const f of festRows) {
      expected.delete(isoKey(TEST_YEAR, f.isoWeek));
    }

    const actualRows = await prisma.planungEntry.findMany({
      where: {
        projectId: p.id,
        planungSource: PlanungSource.TURNUS,
        planungStatus: "VORGESCHLAGEN",
        isoYear: TEST_YEAR,
        isoWeek: { gte: 1, lte: 40 },
      },
      select: { isoYear: true, isoWeek: true },
    });
    const actual = new Set(actualRows.map((r) => isoKey(r.isoYear, r.isoWeek)));

    for (const k of actual) {
      if (!expected.has(k)) {
        push("Test1", `Projekt ${p.code}: unerwarteter Turnus-Vorschlag in ${k}`);
      }
    }
    for (const k of expected) {
      if (!actual.has(k)) {
        push("Test1", `Projekt ${p.code}: fehlender Turnus-Vorschlag in ${k} (${p.turnus})`);
      }
    }
  }
}

async function testFestPriority(
  anchor: Date,
  horizon: { isoYear: number; isoWeek: number }[],
  push: (t: string, m: string) => void,
) {
  const all = await prisma.project.findMany({
    where: { tenantId: AUTO_TEST_TENANT, status: "ACTIVE" },
    select: { id: true, code: true },
  });
  const rnd = mulberry32(99);
  const scored = all.map((p) => ({ p, s: rnd() }));
  scored.sort((a, b) => a.s - b.s);
  const pick = scored.slice(0, 10).map((x) => x.p);

  for (const p of pick) {
    await prisma.planungEntry.deleteMany({
      where: { projectId: p.id, isoYear: TEST_YEAR, isoWeek: 15, planungSource: PlanungSource.TURNUS },
    });
    await prisma.planungEntry.deleteMany({
      where: { projectId: p.id, isoYear: TEST_YEAR, isoWeek: 15, planungType: PlanungType.FEST },
    });
    const resp = await prisma.project.findUnique({
      where: { id: p.id },
      select: { responsibleEmployeeId: true },
    });
    await prisma.planungEntry.create({
      data: {
        projectId: p.id,
        isoYear: TEST_YEAR,
        isoWeek: 15,
        planungType: PlanungType.FEST,
        planungStatus: "BESTAETIGT",
        planungSource: "SONDERTERMIN",
        priority: 0,
        employeeId: resp?.responsibleEmployeeId ?? undefined,
        note: "Test fester Termin KW15",
      },
    });
  }

  await syncTurnusSuggestions(prisma, anchor, horizon, { tenantId: AUTO_TEST_TENANT });

  for (const p of pick) {
    const turnusHit = await prisma.planungEntry.count({
      where: {
        projectId: p.id,
        isoYear: TEST_YEAR,
        isoWeek: 15,
        planungSource: PlanungSource.TURNUS,
      },
    });
    const festHit = await prisma.planungEntry.count({
      where: {
        projectId: p.id,
        isoYear: TEST_YEAR,
        isoWeek: 15,
        planungType: PlanungType.FEST,
      },
    });
    if (turnusHit > 0) push("Test2", `${p.code}: Turnus in KW15 trotz FEST`);
    if (festHit === 0) push("Test2", `${p.code}: FEST in KW15 fehlt`);
  }
}

async function testFeedbackCounting(_anchor: Date, push: (t: string, m: string) => void) {
  const projects = await prisma.project.findMany({
    where: { tenantId: AUTO_TEST_TENANT, status: "ACTIVE" },
    select: { id: true, code: true },
  });

  const pattern = [
    "erledigt",
    "erledigt",
    "erledigt",
    "erledigt",
    "erledigt",
    "erledigt",
    "erledigt",
    "nicht_erledigt",
    "nb",
    "ob",
  ] as const;
  const ufEmp = await prisma.employee.findFirst({ where: { shortCode: "UF" } });

  let i = 0;
  for (const p of projects) {
    const entry = await prisma.planungEntry.findFirst({
      where: {
        projectId: p.id,
        isoYear: TEST_YEAR,
        isoWeek: { gte: 1, lte: 10 },
        planungStatus: { in: ["VORGESCHLAGEN", "GEPLANT"] },
      },
    });
    if (!entry) continue;

    const useUf = i % 20 === 0 && ufEmp;
    const o = pattern[i % pattern.length];
    i++;

    if (useUf) {
      await prisma.planungEntry.update({
        where: { id: entry.id },
        data: { employeeId: ufEmp!.id, planungStatus: "GEPLANT" },
      });
    }

    const before = await prisma.project.findUnique({
      where: { id: p.id },
      select: { completedBegehungen: true },
    });

    const res = await applyPlanungFeedback(prisma, {
      entryId: entry.id,
      outcome: o,
      horizonWeekCount: 52,
    });
    if (!res.ok) {
      push("Test3", `${p.code}: Feedback fehlgeschlagen`);
      continue;
    }

    const updated = await prisma.planungEntry.findUnique({
      where: { id: entry.id },
      select: {
        planungStatus: true,
        isoYear: true,
        isoWeek: true,
        isCompletedForContract: true,
      },
    });
    const after = await prisma.project.findUnique({
      where: { id: p.id },
      select: { completedBegehungen: true },
    });

    const regularErledigt = o === "erledigt" && !useUf;
    if (regularErledigt) {
      if (updated?.isCompletedForContract !== true) {
        push("Test3", `${p.code}: isCompletedForContract soll true sein bei normaler Erledigung`);
      }
      if ((after?.completedBegehungen ?? 0) < (before?.completedBegehungen ?? 0) + 1) {
        push(
          "Test3",
          `${p.code}: completedBegehungen soll steigen (vor ${before?.completedBegehungen}, nach ${after?.completedBegehungen})`,
        );
      }
    }
    if (o === "nb" || o === "ob" || (o === "erledigt" && useUf)) {
      if ((after?.completedBegehungen ?? 0) !== (before?.completedBegehungen ?? 0)) {
        push("Test3", `${p.code}: Zähler darf bei nb/ob/UF nicht steigen`);
      }
    }
    if (o === "nicht_erledigt") {
      if (updated?.planungStatus !== "NICHT_ERLEDIGT") {
        push("Test3", `${p.code}: Status nicht_erledigt erwartet`);
      }
    }
  }
}

async function testVertretungKrank(
  _anchor: Date,
  horizon: { isoYear: number; isoWeek: number }[],
  push: (t: string, m: string) => void,
) {
  const in1 = await prisma.employee.findFirst({ where: { shortCode: "T42-IN1" } });
  if (!in1) {
    push("Test4", "T42-IN1 fehlt");
    return;
  }

  await prisma.availability.deleteMany({ where: { employeeId: in1.id } });
  await prisma.availability.create({
    data: {
      employeeId: in1.id,
      startsOn: mondayUtcOfIsoWeek(TEST_YEAR, 10),
      endsOn: (() => {
        const d = mondayUtcOfIsoWeek(TEST_YEAR, 12);
        d.setUTCDate(d.getUTCDate() + 6);
        d.setUTCHours(23, 59, 59, 999);
        return d;
      })(),
      reason: AvailabilityReason.KRANKHEIT,
      note: "E2E Krank",
    },
  });

  await prisma.planungEntry.deleteMany({
    where: {
      employeeId: in1.id,
      isoYear: TEST_YEAR,
      isoWeek: { gte: 10, lte: 12 },
      project: { tenantId: AUTO_TEST_TENANT },
    },
  });

  const sampleProjects = await prisma.project.findMany({
    where: { tenantId: AUTO_TEST_TENANT, responsibleEmployeeId: in1.id, status: "ACTIVE" },
    take: 5,
  });
  for (const p of sampleProjects) {
    for (const wk of [10, 11, 12]) {
      await prisma.planungEntry.create({
        data: {
          projectId: p.id,
          isoYear: TEST_YEAR,
          isoWeek: wk,
          employeeId: in1.id,
          planungStatus: "GEPLANT",
          planungSource: "MANUELL",
        },
      });
    }
  }

  await applyKrankVertretungForHorizon(prisma, horizon, { tenantId: AUTO_TEST_TENANT });

  for (const p of sampleProjects) {
    for (const wk of [10, 11, 12]) {
      const e = await prisma.planungEntry.findFirst({
        where: { projectId: p.id, isoYear: TEST_YEAR, isoWeek: wk },
        include: { employee: true, project: { select: { substituteEmployeeId: true } } },
      });
      if (!e) continue;
      if (e.employeeId === in1.id && !e.conflict) {
        push("Test4", `${p.code} KW${wk}: noch IN1 ohne Konflikt`);
      }
    }
  }

  const chronik = await prisma.chronikEntry.count({
    where: {
      project: { tenantId: AUTO_TEST_TENANT },
      action: "planung_vertretung_abwesenheit",
    },
  });
  if (chronik === 0) push("Test4", "Keine Chronik-Einträge zur Vertretung");
}

async function testArbeitskorbUeberfaellig(push: (t: string, m: string) => void) {
  const old = new Date();
  old.setDate(old.getDate() - 6);

  const entry = await prisma.planungEntry.findFirst({
    where: { project: { tenantId: AUTO_TEST_TENANT } },
    select: { id: true },
  });
  if (!entry) {
    push("Test5", "Kein PlanungEntry für Arbeitskorb-Test");
    return;
  }

  await prisma.planungEntry.update({
    where: { id: entry.id },
    data: {
      planungStatus: "RUECKMELDUNG_OFFEN",
      updatedAt: old,
    },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(startOfDay);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const overdue = await prisma.planungEntry.findMany({
    where: {
      id: entry.id,
      planungStatus: { in: ["RUECKMELDUNG_OFFEN", "VORGESCHLAGEN"] },
      updatedAt: { lt: threeDaysAgo },
    },
  });

  if (!overdue.length) {
    push("Test5", "Überfällig-Query liefert keinen Testeintrag");
  }
}

async function testBestOfNTurnus(horizon: { isoYear: number; isoWeek: number }[], push: (t: string, m: string) => void) {
  const p = await prisma.project.findFirst({
    where: { tenantId: AUTO_TEST_TENANT, turnus: "W", status: "ACTIVE" },
    include: {
      begehungen: {
        where: { begehungStatus: "DURCHGEFUEHRT" },
        orderBy: { date: "desc" },
        take: 3,
        include: { employee: true },
      },
    },
  });
  if (!p?.turnus) return;

  const lastOk = p.begehungen.find((b) => {
    const sc = b.employee?.shortCode?.toUpperCase();
    return !sc || sc !== "UF";
  });

  const a = computeTurnusWeekGrid("A", {
    turnus: p.turnus,
    lastInspection: lastOk?.date ?? null,
    startDate: p.startDate,
    createdAt: p.createdAt,
    horizon,
  });
  const bSet = computeTurnusWeekGrid("B", {
    turnus: p.turnus,
    lastInspection: lastOk?.date ?? null,
    startDate: p.startDate,
    createdAt: p.createdAt,
    horizon,
  });
  const cSet = computeTurnusWeekGrid("C", {
    turnus: p.turnus,
    lastInspection: lastOk?.date ?? null,
    startDate: p.startDate,
    createdAt: p.createdAt,
    horizon,
  });

  if (a.size === 0) push("BestOfN", "Variante A liefert leeres Raster");
  if (bSet.size === cSet.size && bSet.size > 0 && [...bSet].every((k) => cSet.has(k))) {
    /* B und C identisch auf diesem Projekt — keine Aktion */
  }

  const actual = await prisma.planungEntry.findMany({
    where: {
      projectId: p.id,
      planungSource: "TURNUS",
      isoYear: TEST_YEAR,
      isoWeek: { gte: 1, lte: 40 },
    },
    select: { isoWeek: true },
  });
  const fest = await prisma.planungEntry.findMany({
    where: { projectId: p.id, planungType: "FEST", isoYear: TEST_YEAR },
    select: { isoWeek: true },
  });
  for (const f of fest) {
    a.delete(isoKey(TEST_YEAR, f.isoWeek));
  }

  const actSet = new Set(actual.map((r) => isoKey(TEST_YEAR, r.isoWeek)));
  for (const k of actSet) {
    if (!a.has(k)) push("BestOfN", `Produktions-Raster weicht von Variante A ab: ${k}`);
  }
}
