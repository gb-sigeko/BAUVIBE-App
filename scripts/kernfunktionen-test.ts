/**
 * Kernfunktionen-Integrationstest gegen echte DATABASE_URL (z. B. Supabase).
 * Isolation über tenantId + eindeutige Projekt-Codes. Am Ende werden alle Daten des Laufs gelöscht.
 *
 * Ausführung: `npm run test:kern`
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { buildPlanungHorizon, horizonToIsoWeeks } from "../lib/planung-horizon";
import { syncTurnusSuggestions } from "../lib/turnus-engine";
import { syncProjectCompletedBegehungenCount } from "../lib/planung-contract-sync";
import { computeIsCompletedForContract } from "../lib/turnus-engine";
import { buildBegehungProtokollPdfBuffer } from "../lib/begehung-protokoll-reactpdf";
import { sendTransactionalEmail } from "../lib/email";

process.env.EMAIL_MOCK = "1";

const tag = `e2e-${Date.now()}`;
const PROJECT_COUNT = Number.parseInt(process.env.KERN_E2E_PROJECTS ?? "50", 10);

async function main() {
  const employees: { id: string; shortCode: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const sc = `${tag}-E${i}`.slice(0, 20);
    const e = await prisma.employee.create({
      data: { shortCode: sc, displayName: `Test ${i}`, kind: i % 3 === 0 ? "EXTERN" : "INTERN" },
    });
    employees.push({ id: e.id, shortCode: e.shortCode });
  }

  let uf = await prisma.employee.findFirst({ where: { shortCode: "UF" } });
  if (!uf) {
    uf = await prisma.employee.create({
      data: { shortCode: "UF", displayName: "UF Büro", kind: "INTERN" },
    });
  }

  const turnusCycle = ["W", "W2", "W3", "ABRUF"] as const;
  const projects: { id: string; code: string; turnus: string | null }[] = [];
  console.log(`[kern] creating ${PROJECT_COUNT} projects…`);
  for (let i = 0; i < PROJECT_COUNT; i++) {
    const t = turnusCycle[i % 4];
    const p = await prisma.project.create({
      data: {
        tenantId: tag,
        code: `${tag}-P${i}`,
        name: `Testprojekt ${i}`,
        status: "ACTIVE",
        turnus: t === "ABRUF" ? "ABRUF" : t,
        responsibleEmployeeId: employees[i % employees.length].id,
        contractualBegehungen: 40,
        completedBegehungen: 0,
      },
    });
    projects.push({ id: p.id, code: p.code, turnus: p.turnus });
    await prisma.begehung.create({
      data: {
        projectId: p.id,
        date: new Date(Date.now() - (14 + (i % 5)) * 86400000),
        title: "Letzte Begehung",
        begehungStatus: "DURCHGEFUEHRT",
        employeeId: employees[1].id,
      },
    });
  }

  const anchor = new Date();
  const weeks = buildPlanungHorizon(anchor, 12);
  const horizon = horizonToIsoWeeks(weeks);
  console.log("[kern] sync turnus…");
  await syncTurnusSuggestions(prisma, anchor, horizon, { tenantId: tag });

  const turnusSuggestions = await prisma.planungEntry.count({
    where: {
      project: { tenantId: tag },
      planungSource: "TURNUS",
      planungStatus: "VORGESCHLAGEN",
    },
  });
  assert.ok(turnusSuggestions > 0, "Es sollten Turnus-Vorschläge erzeugt worden sein");

  const abrufTurnus = await prisma.planungEntry.count({
    where: { project: { tenantId: tag, turnus: "ABRUF" }, planungSource: "TURNUS" },
  });
  assert.equal(abrufTurnus, 0, "ABRUF-Projekte dürfen keine Turnus-Vorschläge erhalten");

  const festProject = projects.find((p) => p.turnus === "W");
  assert.ok(festProject);
  const festWeek = horizon[3];
  await prisma.planungEntry.deleteMany({
    where: {
      projectId: festProject.id,
      isoYear: festWeek.isoYear,
      isoWeek: festWeek.isoWeek,
      planungSource: "TURNUS",
    },
  });
  await prisma.planungEntry.create({
    data: {
      projectId: festProject.id,
      isoYear: festWeek.isoYear,
      isoWeek: festWeek.isoWeek,
      planungType: "FEST",
      planungStatus: "BESTAETIGT",
      planungSource: "SONDERTERMIN",
      priority: 0,
      employeeId: employees[0].id,
      note: "E2E fester Termin",
    },
  });
  await syncTurnusSuggestions(prisma, anchor, horizon, { tenantId: tag });
  const turnusOnFestCell = await prisma.planungEntry.count({
    where: {
      projectId: festProject.id,
      isoYear: festWeek.isoYear,
      isoWeek: festWeek.isoWeek,
      planungSource: "TURNUS",
    },
  });
  assert.equal(turnusOnFestCell, 0, "Bei FEST-Termin darf kein Turnus-Vorschlag in derselben KW liegen");

  const p0 = projects[0];
  const week0 = horizon[1];
  const entry = await prisma.planungEntry.create({
    data: {
      projectId: p0.id,
      isoYear: week0.isoYear,
      isoWeek: week0.isoWeek,
      employeeId: employees[2].id,
      planungStatus: "GEPLANT",
      planungSource: "MANUELL",
    },
  });

  assert.equal(
    computeIsCompletedForContract({
      planungStatus: "ERLEDIGT",
      specialCode: "NB",
      employeeShortCode: "MW",
    }),
    false,
  );
  assert.equal(
    computeIsCompletedForContract({
      planungStatus: "ERLEDIGT",
      specialCode: "NONE",
      employeeShortCode: uf.shortCode,
    }),
    false,
  );

  await prisma.planungEntry.update({
    where: { id: entry.id },
    data: {
      planungStatus: "ERLEDIGT",
      specialCode: "NONE",
      employeeId: employees[2].id,
      isCompletedForContract: computeIsCompletedForContract({
        planungStatus: "ERLEDIGT",
        specialCode: "NONE",
        employeeShortCode: employees[2].shortCode,
      }),
    },
  });
  await syncProjectCompletedBegehungenCount(prisma, p0.id);
  const proj = await prisma.project.findUnique({ where: { id: p0.id } });
  assert.ok(proj && proj.completedBegehungen >= 1);

  const buf = await buildBegehungProtokollPdfBuffer({
    projectName: "E2E",
    projectCode: "E2E",
    siteAddress: null,
    dateLabel: "1.1.2026",
    title: "T",
    notes: "N",
    uebersichtFoto: null,
    mangels: [
      { beschreibung: "M1", fotoUrl: null, regel: null },
      { beschreibung: "M2", fotoUrl: null, regel: "VBG" },
      { beschreibung: "M3", fotoUrl: null, regel: null },
    ],
    verteilerLines: ["A <a@b.de>"],
    closingText: "Ende",
  });
  assert.ok(buf.length > 500, "PDF-Buffer sollte Inhalt haben");

  const mail = await sendTransactionalEmail({
    to: "test@example.com",
    subject: "E2E",
    text: "Hallo",
    attachments: [{ filename: "t.pdf", contentBase64: buf.toString("base64") }],
  });
  assert.equal(mail.ok, true);

  await prisma.planungEntry.deleteMany({ where: { project: { tenantId: tag } } });
  await prisma.begehung.deleteMany({ where: { project: { tenantId: tag } } });
  await prisma.project.deleteMany({ where: { tenantId: tag } });
  await prisma.employee.deleteMany({
    where: { shortCode: { startsWith: `${tag}-` } },
  });

  console.log("[kern] kernfunktionen-test: OK");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
