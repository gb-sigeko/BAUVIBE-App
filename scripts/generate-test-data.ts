/**
 * Deterministische Testdaten (Seed 42) für automatisierte BAUVIBE-Tests.
 * Löscht alle Daten mit tenantId `bauvibe-auto-42` und legt 100 Projekte + 5 Mitarbeitende neu an.
 *
 * Ausführung: `npx tsx scripts/generate-test-data.ts`
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import type { Turnus } from "../generated/prisma/client";
import {
  AvailabilityReason,
  BegehungStatus,
  PlanungSource,
  PlanungStatus,
  PlanungType,
  ProjectStatus,
  Role,
} from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { mondayUtcOfIsoWeek } from "../lib/iso-week";
import { syncTurnusSuggestions } from "../lib/turnus-engine";

const SEED = 42;
const TENANT = "bauvibe-auto-42";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTurnus(r: () => number): Turnus {
  const x = r();
  if (x < 0.4) return "W";
  if (x < 0.7) return "W2";
  if (x < 0.9) return "W3";
  return "ABRUF";
}

function turnusIntervalWeeks(t: Turnus): number | null {
  if (t === "ABRUF") return null;
  if (t === "W") return 1;
  if (t === "W2") return 2;
  if (t === "W3") return 3;
  return null;
}

async function main() {
  const rand = mulberry32(SEED);

  await prisma.planungEntry.deleteMany({ where: { project: { tenantId: TENANT } } });
  await prisma.chronikEntry.deleteMany({ where: { project: { tenantId: TENANT } } });
  await prisma.mangel.deleteMany({ where: { begehung: { project: { tenantId: TENANT } } } });
  await prisma.begehung.deleteMany({ where: { project: { tenantId: TENANT } } });
  await prisma.project.deleteMany({ where: { tenantId: TENANT } });

  const oldEmp = await prisma.employee.findMany({
    where: { shortCode: { startsWith: "T42-" } },
    select: { id: true },
  });
  const oldIds = oldEmp.map((e) => e.id);
  if (oldIds.length) {
    await prisma.substitute.deleteMany({
      where: { OR: [{ coveredEmployeeId: { in: oldIds } }, { delegateEmployeeId: { in: oldIds } }] },
    });
    await prisma.availability.deleteMany({ where: { employeeId: { in: oldIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: oldIds } } });
  }

  let uf = await prisma.employee.findFirst({ where: { shortCode: "UF" } });
  if (!uf) {
    uf = await prisma.employee.create({
      data: { shortCode: "UF", displayName: "Büro UF", kind: "INTERN" },
    });
  }

  const in1 = await prisma.employee.create({
    data: { shortCode: "T42-IN1", displayName: "Test intern 1", kind: "INTERN" },
  });
  const in2 = await prisma.employee.create({
    data: { shortCode: "T42-IN2", displayName: "Test intern 2", kind: "INTERN" },
  });
  const ex1 = await prisma.employee.create({
    data: { shortCode: "T42-EX1", displayName: "Test extern 1", kind: "EXTERN" },
  });
  const ex2 = await prisma.employee.create({
    data: { shortCode: "T42-EX2", displayName: "Test extern 2", kind: "EXTERN" },
  });

  const demoPasswordHash = await bcrypt.hash("Bauvibe2026!", 10);
  const demoUsers: { email: string; name: string; role: Role; employeeId: string | null }[] = [
    { email: "admin@bauvibe.de", name: "Admin", role: Role.ADMIN, employeeId: null },
    { email: "fee@bauvibe.local", name: "Fee Büro", role: Role.BUERO, employeeId: null },
    { email: "gf@bauvibe.local", name: "Geschäftsführung", role: Role.GF, employeeId: null },
    { email: "extern@bauvibe.local", name: "Extern", role: Role.EXTERN, employeeId: ex1.id },
    { email: "sikogo@bauvibe.local", name: "SiGeKo Leitung", role: Role.SIKOGO, employeeId: in1.id },
  ];
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: demoPasswordHash, employeeId: u.employeeId },
      create: {
        email: u.email,
        passwordHash: demoPasswordHash,
        name: u.name,
        role: u.role,
        employeeId: u.employeeId ?? undefined,
      },
    });
  }

  const pool = [in1, in2, ex1, ex2];

  await prisma.substitute.create({
    data: {
      coveredEmployeeId: in1.id,
      delegateEmployeeId: in2.id,
      startsOn: new Date(Date.UTC(2026, 0, 1)),
      endsOn: new Date(Date.UTC(2026, 11, 31)),
      note: "Test-Vertretung IN1→IN2",
      affectedProjectIds: [],
    },
  });
  await prisma.substitute.create({
    data: {
      coveredEmployeeId: in2.id,
      delegateEmployeeId: in1.id,
      startsOn: new Date(Date.UTC(2026, 0, 1)),
      endsOn: new Date(Date.UTC(2026, 11, 31)),
      note: "Test-Vertretung IN2→IN1",
      affectedProjectIds: [],
    },
  });

  const workWeeks2026 = 52;
  const absenceSlots = Math.max(3, Math.floor(workWeeks2026 * 5 * 0.05));
  for (const emp of [in1, in2, uf]) {
    for (let s = 0; s < absenceSlots; s++) {
      const w = 1 + Math.floor(rand() * 50);
      const mon = mondayUtcOfIsoWeek(2026, w);
      const end = new Date(mon);
      end.setUTCDate(mon.getUTCDate() + Math.floor(rand() * 3));
      end.setUTCHours(23, 59, 59, 999);
      await prisma.availability.create({
        data: {
          employeeId: emp.id,
          startsOn: mon,
          endsOn: end,
          reason: rand() < 0.6 ? AvailabilityReason.URLAUB : AvailabilityReason.KRANKHEIT,
        },
      });
    }
  }

  const projectMeta: {
    id: string;
    code: string;
    turnus: Turnus | null;
    startKw: number;
    status: ProjectStatus;
  }[] = [];

  for (let i = 0; i < 100; i++) {
    const turnus = pickTurnus(rand);
    const startKw = 1 + Math.floor(rand() * 30);
    const isActive = rand() < 0.82;
    const status: ProjectStatus = isActive ? "ACTIVE" : "PAUSED";
    const contractual = 5 + Math.floor(rand() * 26);
    const resp = i < 12 ? in1 : pool[Math.floor(rand() * pool.length)]!;
    const sub = pool.find((e) => e.id !== resp.id) ?? in2;

    const p = await prisma.project.create({
      data: {
        tenantId: TENANT,
        code: `T42-P${String(i).padStart(3, "0")}`,
        name: `Auto-Projekt ${i}`,
        status,
        turnus,
        contractualBegehungen: contractual,
        completedBegehungen: 0,
        responsibleEmployeeId: resp.id,
        substituteEmployeeId: sub.id,
        startDate: mondayUtcOfIsoWeek(2026, startKw),
      },
    });

    const interval = turnusIntervalWeeks(turnus);
    if (interval != null) {
      const lastKw = Math.max(1, startKw - interval);
      await prisma.begehung.create({
        data: {
          projectId: p.id,
          date: mondayUtcOfIsoWeek(2026, lastKw),
          title: "Referenz-Begehung",
          begehungStatus: BegehungStatus.DURCHGEFUEHRT,
          employeeId: resp.id === uf.id ? in1.id : resp.id,
        },
      });
    }

    const festKw = 10 + Math.floor(rand() * 11);
    await prisma.planungEntry.create({
      data: {
        projectId: p.id,
        isoYear: 2026,
        isoWeek: festKw,
        planungType: PlanungType.FEST,
        planungStatus: PlanungStatus.BESTAETIGT,
        planungSource: PlanungSource.SONDERTERMIN,
        priority: 0,
        employeeId: resp.id,
        note: "Fester Termin (Testdaten)",
      },
    });

    projectMeta.push({ id: p.id, code: p.code, turnus, startKw, status });
  }

  const anchor = mondayUtcOfIsoWeek(2026, 1);
  const horizon = Array.from({ length: 40 }, (_, i) => ({ isoYear: 2026, isoWeek: i + 1 }));
  await syncTurnusSuggestions(prisma, anchor, horizon, { tenantId: TENANT });

  console.info("[generate-test-data] OK", {
    tenant: TENANT,
    projects: projectMeta.length,
    employees: ["UF", "T42-IN1", "T42-IN2", "T42-EX1", "T42-EX2"],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
