# BAUVIBE – Bestandsaufnahme

Stand: 2026-04-19 (Schema-Migration `20260419012845_domain_extensions`; UI/API-Erweiterungen für Domänenmodule).

## Tech-Stack

| Bereich | Technologie |
|--------|-------------|
| Framework | Next.js 14.2.35 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS, tailwindcss-animate |
| UI | shadcn/ui (Radix), lucide-react |
| Auth | NextAuth.js v5 (Credentials, JWT-Sessions) |
| ORM | Prisma 7.x, Client unter `generated/prisma` |
| Datenbank | PostgreSQL (Supabase), `DATABASE_URL` + `prisma.config.ts` |
| Validierung | zod |
| Sonstiges | DnD Kit (Planung), bcryptjs, pdf-lib (PDF-Erzeugung) |

## Seiten (`app/**/page.tsx`)

| Route | Zweck |
|-------|--------|
| `/` | Start/Redirect |
| `/login` | Anmeldung |
| `/fee` | Zentrale Arbeitsfläche Fee (Dashboard) |
| `/projects` | Projektliste |
| `/projects/[id]` | Projektakte (Tabs inkl. Angebote, Vorankündigung, Telefonnotizen; Begehungen mit Link zur Detailbearbeitung) |
| `/projects/[id]/begehungen/[begehungId]` | Begehung: Stammdaten, Verteiler (JSON), Mängel, PDF, E-Mail |
| `/textbausteine` | Textbausteine verwalten |
| `/planung` | Wochenplanungsraster |
| `/arbeitskorb` | Offene Punkte, fehlende Protokolle |
| `/mitarbeiter` | Mitarbeiter & Verfügbarkeit |
| `/gf` | GF-Dashboard |
| `/eigene-planung` | Eingeschränkte Ansicht für Rolle EXTERN |

**Hinweis:** Dashboard-Routen liegen unter `app/(dashboard)/` (Route-Gruppe ohne URL-Präfix).

## API-Routen

| Pfad | Methode / Zweck |
|------|------------------|
| `/api/auth/[...nextauth]` | NextAuth Handler |
| `/api/planung/move` | Planungszellen verschieben |
| `/api/planung/entries/[entryId]/vorort` | Vor-Ort-Rückmeldungen (GET/POST) |
| `/api/projects/[projectId]/offers` | Angebote (GET/POST) |
| `/api/projects/[projectId]/offers/[offerId]` | Angebot (PATCH/DELETE) |
| `/api/projects/[projectId]/offers/[offerId]/pdf` | Angebots-PDF (GET) |
| `/api/projects/[projectId]/offers/[offerId]/send` | Angebot per E-Mail (POST, optional Resend) |
| `/api/projects/[projectId]/vorankuendigungen` | Vorankündigungen (GET/POST) |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]` | Vorankündigung (PATCH/DELETE) |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]/pdf` | VK-PDF (GET) |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]/send` | VK per E-Mail (POST) |
| `/api/projects/[projectId]/begehungen/[begehungId]` | Begehung (PATCH) |
| `/api/projects/[projectId]/begehungen/[begehungId]/mangels` | Mängel (GET/POST) |
| `/api/projects/[projectId]/begehungen/[begehungId]/mangels/[mangelId]` | Mangel (DELETE) |
| `/api/projects/[projectId]/begehungen/[begehungId]/pdf` | Begehungs-PDF (GET) |
| `/api/projects/[projectId]/begehungen/[begehungId]/send` | Protokoll per E-Mail (POST) |
| `/api/projects/[projectId]/telefonnotizen` | Telefonnotizen (GET/POST, schreibt Chronik) |
| `/api/projects/[projectId]/telefonnotizen/[noteId]` | Telefonnotiz (PATCH/DELETE) |
| `/api/textbausteine` | Textbausteine (GET/POST) |
| `/api/textbausteine/[id]` | Textbaustein (PATCH/DELETE) |

## Rollen (NextAuth / Prisma `Role`)

`ADMIN`, `BUERO` (Fee), `SIKOGO`, `EXTERN`, `GF`.

- Navigation und Zugriff: [`components/nav.tsx`](components/nav.tsx), [`middleware.ts`](middleware.ts).
- **EXTERN:** Zugriff nur auf `/eigene-planung` und laut Middleware auf Pfade unter `/api/me/` – **es existiert derzeit keine `app/api/me/`-Implementierung** (Middleware und Implementierung weichen ab).

## Demo-Zugänge (Seed)

E-Mail-Domäne `@bauvibe.local`, Passwort laut Seed: `Bauvibe2026!`  
Accounts: `admin@`, `fee@`, `sikogo@`, `gf@`, `extern@` (siehe [`prisma/seed.ts`](prisma/seed.ts)).

## Datenmodell (Prisma)

### Kerneinheiten

- **User** – Login, Rolle, optionale Verknüpfung zu **Employee**.
- **Employee** – intern/extern, Kurzzeichen, Planung, Aufgaben, Freigaben für **Offer**.
- **Holiday**, **Substitution** – Verfügbarkeit / Vertretung.
- **Project** – Akte (Code, Bauherr, Ort, Status, Soll/Ist-Stunden).
- **Begehung** – Begehungstermin; physische Tabelle **`Inspection`** (`@@map("Inspection")`). Felder u. a.: Datum, Titel, Notizen, `protocolMissing`, optional `uebersichtFoto`, `protokollPdf`, `textbausteine`, `verteiler` (JSON, Default `[]`), `versendetAm`.
- **Mangel** – gehört zu einer Begehung; Foto, Beschreibung, Regel, optional **Textbaustein**.
- **Task**, **Document**, **ChronicleEntry**, **PlanungEntry** – Aufgaben, Dokumente, Chronik, Wochenraster inkl. Konfliktflag.

### Erweiterte Domäne (neu)

- **Offer** – Angebot pro Projekt (`emailInput`, `kalkulation` JSON, `OfferStatus`, Freigabe durch Employee, PDF-URL).
- **Vorankuendigung** – PDF-Formular, Arbeitsschutz-JSON, `VKStatus`, generiertes PDF, Versanddatum.
- **Textbaustein** – Name, Kategorie, Inhalt (Platzhalter möglich).
- **Telefonnotiz** – Projektbezug, Notiz, Erfasser, Erledigt-Flag, Follow-up.
- **VorOrtRueckmeldung** – Bezug **PlanungEntry**, Checkboxen Aushang/Werbung, Unterbrechung, Freitext `rueckmeldung`.

### Enums

- `Role`, `EmployeeKind`, `ProjectStatus`, `TaskStatus`
- `OfferStatus` (DB: `entwurf`, `freigegeben`, `versendet`, `abgelehnt`)
- `VKStatus` (DB: `entwurf`, `pdf_erzeugt`, `versendet`)

## Implementierte Domänenmodule (Kurz)

1. **Angebotserstellung** – Tab „Angebote“ in der Projektakte, APIs + PDF + E-Mail (Stub/Resend).
2. **Vorankündigung** – Tab „Vorankündigung“, APIs + PDF + E-Mail.
3. **Begehungsprotokoll & Mängel** – Tab „Begehungen“ + Detailseite `/projects/[id]/begehungen/[begehungId]`.
4. **Textbausteine** – Seite `/textbausteine`, globale APIs.
5. **Telefonnotizen** – Tab „Telefonnotizen“, Chronik-Eintrag bei Neuanlage.
6. **Vor-Ort-Rückmeldung** – Dialog „Vor Ort“ auf Planungskarten, API unter `/api/planung/entries/...`.
7. **Automatisierung** – [`lib/pdf.ts`](lib/pdf.ts), [`lib/email.ts`](lib/email.ts), Bündel [`lib/automation.ts`](lib/automation.ts); E-Mail: optional `RESEND_API_KEY`, `EMAIL_FROM`.
8. **Next.js** – Upgrade auf **14.2.35** (siehe `package.json`).

**Deployment:** Hetzner / buehler.zone werden laut Vorgabe erst nach App-Fertigstellung vorbereitet (außerhalb dieses Repos).

## Sicherheit & Betrieb

1. **Next.js** – aktuell 14.2.35; weiter Patches / ggf. Major-Upgrade planen. `eslint-config-next` synchron zu `next` halten.
2. **Auth** – Credentials, JWT; `AUTH_SECRET` muss in allen Umgebungen gesetzt sein ([`auth.ts`](auth.ts)).
3. **Passwort-Hashing** – bcrypt im `authorize`-Callback; Demo-Passwort nur für Entwicklung.
4. **Middleware** – schützt alle nicht-öffentlichen Routen; Diskrepanz **`/api/me/`** ohne Route siehe oben.
5. **Seed / SSL** – [`prisma/seed.ts`](prisma/seed.ts) nutzt `ssl: { rejectUnauthorized: false }` für Verbindung zur Cloud-DB – für **Produktion** bewusst entscheiden und idealerweise Zertifikatsprüfung aktivieren.
6. **Datenzugriff** – Anwendung nutzt Prisma mit Server-seitigem Zugriff; kein feingranulares RLS auf App-Ebene dokumentiert – bei öffentlicher API zusätzliche Absicherung nötig.

## Migrationen

- Initial: `prisma/migrations/20260419004056_init/`
- Domäne: `prisma/migrations/20260419012845_domain_extensions/`

## Projekt-Skills (Cursor)

Unter [`.cursor/skills/`](.cursor/skills/): `bauvibe-bestandsaufnahme`, `bauvibe-prisma-domains`, `bauvibe-agent-ultra`.  
Regeln: [`.cursor/rules/bauvibe-plan-first.mdc`](.cursor/rules/bauvibe-plan-first.mdc), [`.cursor/rules/bauvibe-mcp.mdc`](.cursor/rules/bauvibe-mcp.mdc).
