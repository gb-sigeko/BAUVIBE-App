import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";

/**
 * Stellt sicher, dass ein Büro-Login für E2E existiert (ohne vollständigen Seed).
 * Voraussetzung: DATABASE_URL und erreichbare Datenbank.
 */
export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[e2e] DATABASE_URL fehlt – überspringe User-Setup.");
    return;
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  const passwordHash = await bcrypt.hash("Bauvibe2026!", 10);

  await prisma.user.upsert({
    where: { email: "fee@bauvibe.local" },
    update: { passwordHash },
    create: {
      email: "fee@bauvibe.local",
      passwordHash,
      name: "Fee Büro",
      role: "BUERO",
    },
  });

  const extEmployee =
    (await prisma.employee.findFirst({ where: { shortCode: "EXT-E2E" } })) ??
    (await prisma.employee.create({
      data: { shortCode: "EXT-E2E", displayName: "E2E Extern", kind: "EXTERN", jobRole: "EXTERN" },
    }));

  await prisma.user.upsert({
    where: { email: "extern@bauvibe.local" },
    update: { passwordHash, role: "EXTERN", employeeId: extEmployee.id },
    create: {
      email: "extern@bauvibe.local",
      passwordHash,
      name: "E2E Extern",
      role: "EXTERN",
      employeeId: extEmployee.id,
    },
  });

  await prisma.$disconnect();
  await pool.end();
}
