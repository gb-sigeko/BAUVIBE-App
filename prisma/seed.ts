import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";
import { recalcConflictsForWeek } from "../lib/planung-conflicts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  await prisma.protokoll.deleteMany();
  await prisma.mangel.deleteMany();
  await prisma.vorOrtRueckmeldung.deleteMany();
  await prisma.planungEntry.deleteMany();
  await prisma.chronikEntry.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.vorankuendigung.deleteMany();
  await prisma.telefonnotiz.deleteMany();
  await prisma.begehung.deleteMany();
  await prisma.textbaustein.deleteMany();
  await prisma.substitute.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contactPerson.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.employee.deleteMany();

  const passwordHash = await bcrypt.hash("Bauvibe2026!", 10);

  const e1 = await prisma.employee.create({
    data: { shortCode: "MW", displayName: "Maria Weber", kind: "INTERN" },
  });

  const e2 = await prisma.employee.create({
    data: { shortCode: "TK", displayName: "Tom Klein", kind: "INTERN" },
  });

  const eExt = await prisma.employee.create({
    data: { shortCode: "EXT-01", displayName: "Extern SiGeKo Nord", kind: "EXTERN" },
  });

  const users = [
    { email: "admin@bauvibe.de", role: "ADMIN" as const, name: "Admin", employeeId: null as string | null },
    { email: "fee@bauvibe.local", role: "BUERO" as const, name: "Fee Büro", employeeId: null },
    { email: "sikogo@bauvibe.local", role: "SIKOGO" as const, name: "SiGeKo Leitung", employeeId: e1.id },
    { email: "gf@bauvibe.local", role: "GF" as const, name: "Geschäftsführung", employeeId: null },
    { email: "extern@bauvibe.local", role: "EXTERN" as const, name: "Extern", employeeId: eExt.id },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        employeeId: u.employeeId,
      },
    });
  }

  const p1 = await prisma.project.create({
    data: {
      code: "PRJ-2401",
      name: "Neubau Logistikzentrum",
      client: "LogiBuild GmbH",
      siteAddress: "Hamburg",
      status: "ACTIVE",
      description: "SiGeKo Begleitung Rohbau bis Abnahme",
      targetHours: 420,
      actualHours: 180,
      turnus: "W2",
      contractualBegehungen: 30,
      completedBegehungen: 12,
      responsibleEmployeeId: e1.id,
      substituteEmployeeId: e2.id,
    },
  });

  const p2 = await prisma.project.create({
    data: {
      code: "PRJ-2402",
      name: "Sanierung Parkdeck",
      client: "Stadtwerke Nord",
      siteAddress: "Kiel",
      status: "ACTIVE",
      description: "Koordination Fremdfirmen, wiederkehrende Begehungen",
      targetHours: 260,
      actualHours: 120,
      turnus: "W",
      contractualBegehungen: 20,
      completedBegehungen: 8,
      responsibleEmployeeId: e2.id,
    },
  });

  const org = await prisma.organization.create({
    data: { name: "LogiBuild GmbH", legalForm: "GmbH", address: "Hamburg", active: true },
  });

  const contact = await prisma.contactPerson.create({
    data: {
      organizationId: org.id,
      name: "Alex Beispiel",
      functionTitle: "Bauleitung",
      email: "alex@logibuild.example",
      phone: "+49 40 000000",
    },
  });

  await prisma.projectParticipant.create({
    data: {
      projectId: p1.id,
      organizationId: org.id,
      contactPersonId: contact.id,
      roleInProject: "Bauherr",
      isPrimary: true,
    },
  });

  await prisma.projectContact.create({
    data: {
      projectId: p1.id,
      contactPersonId: contact.id,
      role: "Bauherr",
      isMainContact: true,
    },
  });

  await prisma.textbaustein.create({
    data: {
      name: "Abschlusssatz Protokoll",
      kategorie: "Abschluss",
      inhalt: "Die aufgeführten Mängel sind zeitnah zu beseitigen. Für die Unterstützung bedanken wir uns.",
    },
  });

  await prisma.communication.create({
    data: {
      projectId: p1.id,
      organizationId: org.id,
      contactPersonId: contact.id,
      kind: "PHONE",
      subject: "Kickoff SiGeKo",
      body: "Telefonat zu Zugangswegen und Unterlagen für die erste Begehung.",
      responsibleEmployeeId: e1.id,
    },
  });

  await prisma.availability.create({
    data: {
      employeeId: e1.id,
      startsOn: new Date("2026-05-01"),
      endsOn: new Date("2026-05-10"),
      note: "Urlaub",
      reason: "URLAUB",
    },
  });

  const sub = await prisma.substitute.create({
    data: {
      coveredEmployeeId: e1.id,
      delegateEmployeeId: e2.id,
      startsOn: new Date("2026-05-01"),
      endsOn: new Date("2026-05-10"),
      note: "Vertretung während Urlaub",
      affectedProjectIds: [],
    },
  });

  await prisma.substitute.update({
    where: { id: sub.id },
    data: { affectedProjectIds: [p1.id] },
  });

  const today = new Date();
  const iso = isoWeekAndYear(today);
  const next = nextIsoWeek(iso.year, iso.week);

  await prisma.begehung.createMany({
    data: [
      {
        projectId: p1.id,
        date: addDays(today, -2),
        title: "Sicherheitsbegehung Rohbau",
        notes: "Schutzgeländer EG teilweise fehlend",
        protocolMissing: true,
        employeeId: e1.id,
        laufendeNr: 1,
        begehungStatus: "DURCHGEFUEHRT",
      },
      {
        projectId: p2.id,
        date: addDays(today, 3),
        title: "Absturzsicherung Prüfung",
        protocolMissing: false,
        employeeId: e1.id,
        laufendeNr: 1,
        begehungStatus: "GEPLANT",
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: p1.id,
        title: "Mängelliste Brandabschnitte nachfassen",
        status: "OPEN",
        dueDate: today,
        assigneeId: e1.id,
        protocolMissing: false,
        priority: "HIGH",
        isMangel: true,
      },
      {
        projectId: p2.id,
        title: "Abnahmeprotokoll Unterlagen",
        status: "OPEN",
        dueDate: addDays(today, -5),
        assigneeId: e2.id,
        protocolMissing: true,
        priority: "CRITICAL",
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      { projectId: p1.id, name: "SiGeKo-Plan.pdf", url: "#", docType: "PLAN", docStatus: "VORHANDEN" },
      { projectId: p1.id, name: "Gefährdungsbeurteilung.docx", url: "#", docType: "GBU", docStatus: "VORHANDEN" },
    ],
  });

  await prisma.chronikEntry.create({
    data: {
      projectId: p1.id,
      body: "Kickoff mit Bauleitung, Zugangswege geklärt.",
    },
  });

  await prisma.planungEntry.createMany({
    data: [
      {
        projectId: p1.id,
        isoYear: iso.year,
        isoWeek: iso.week,
        sortOrder: 0,
        employeeId: e1.id,
        turnusLabel: "Turnus A",
        note: "Baustelle 3× / Woche",
        feedback: "OK",
        conflict: false,
        planungStatus: "GEPLANT",
        planungSource: "TURNUS",
        begehungSollNummer: 13,
        begehungIstNummer: 12,
      },
      {
        projectId: p1.id,
        isoYear: next.year,
        isoWeek: next.week,
        sortOrder: 0,
        employeeId: e1.id,
        planungType: "FEST",
        planungStatus: "BESTAETIGT",
        planungSource: "SONDERTERMIN",
        priority: 0,
        note: "Behörden-Termin (Demo fester Termin)",
        conflict: false,
      },
      {
        projectId: p2.id,
        isoYear: iso.year,
        isoWeek: iso.week,
        sortOrder: 0,
        employeeId: e1.id,
        turnusLabel: "Turnus B",
        note: "Überlappung testen",
        feedback: "",
        conflict: false,
        planungStatus: "RUECKMELDUNG_OFFEN",
        planungSource: "TURNUS",
      },
      {
        projectId: p1.id,
        isoYear: next.year,
        isoWeek: next.week,
        sortOrder: 1,
        employeeId: eExt.id,
        turnusLabel: "",
        note: "Externe Unterstützung",
        feedback: "",
        conflict: false,
        planungStatus: "VORGESCHLAGEN",
        planungSource: "MANUELL",
        priority: 3,
      },
    ],
  });

  await recalcConflictsForWeek(iso.year, iso.week, prisma);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isoWeekAndYear(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function nextIsoWeek(year: number, week: number) {
  if (week >= 52) return { year: year + 1, week: 1 };
  return { year, week: week + 1 };
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
