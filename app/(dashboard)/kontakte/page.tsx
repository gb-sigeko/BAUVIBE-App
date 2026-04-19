import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateContactForm, CreateOrganizationForm } from "@/components/kontakte/kontakte-forms";
import { KontakteSearchBar } from "@/components/kontakte/kontakte-search-bar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KontaktePage({ searchParams }: { searchParams: { q?: string; contact?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const highlightId = searchParams.contact;

  const [orgsForForms, organizations, contacts] = await Promise.all([
    prisma.organization.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.organization.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contactPerson.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { organization: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kontakte</h1>
        <p className="text-muted-foreground">
          Organisationen und Ansprechpartner für Büro und Projektakten. Daten werden über dieselben Tabellen wie in den Projekt-Tabs geführt.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Suche lädt…</div>}>
        <KontakteSearchBar initialQ={q} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Neue Organisation</CardTitle>
          <CardDescription>Schnellerfassung für die Kontaktdatenbank.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Kontakt</CardTitle>
          <CardDescription>Optional einer Organisation zuordnen.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateContactForm organizations={orgsForForms} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organisationen</CardTitle>
          <CardDescription>{organizations.length} Einträge</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rechtsform</TableHead>
                <TableHead>Ort / Adresse</TableHead>
                <TableHead className="text-right">Kontakte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{o.legalForm ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{o.address ?? "—"}</TableCell>
                  <TableCell className="text-right">{o._count.contacts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontaktpersonen</CardTitle>
          <CardDescription>{contacts.length} Einträge</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Funktion</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Telefon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow
                  key={c.id}
                  className={cn(highlightId === c.id && "bg-muted ring-2 ring-primary/40")}
                  data-contact-id={c.id}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.organization?.name ?? "—"}</TableCell>
                  <TableCell>{c.functionTitle ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
