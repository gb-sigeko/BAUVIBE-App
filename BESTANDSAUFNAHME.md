# BAUVIBE – Bestandsaufnahme

Stand: 2026-04-19 — Abgleich mit Repo: Kontakte, Touren, Kommunikation, zentrale Begehungs-APIs, Mitarbeiter-Detail, Protokoll-UI, Health-Check, GitHub Actions CI; Prisma inkl. `Tour`, `Organization`, `ContactPerson`, `ProjectParticipant`, `Communication`, `Protokoll`.

## Tech-Stack


| Bereich     | Technologie                                                |
| ----------- | ---------------------------------------------------------- |
| Framework   | Next.js 14.2.35 (App Router)                               |
| Sprache     | TypeScript                                                 |
| Styling     | Tailwind CSS, tailwindcss-animate                          |
| UI          | shadcn/ui (Radix), lucide-react                            |
| Auth        | NextAuth.js v5 (Credentials, JWT-Sessions)                 |
| ORM         | Prisma 7.x, Client unter `generated/prisma`                |
| Datenbank   | PostgreSQL (Supabase), `DATABASE_URL` + `prisma.config.ts` |
| Validierung | zod                                                        |
| Sonstiges   | DnD Kit (Planung), bcryptjs, pdf-lib (PDF-Erzeugung)       |


## Seiten (`app/**/page.tsx`)


| Route                                    | Zweck                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`                                      | Start/Redirect                                                                                               |
| `/login`                                 | Anmeldung                                                                                                    |
| `/fee`                                   | Zentrale Arbeitsfläche Fee (Dashboard)                                                                       |
| `/projects`                              | Projektliste                                                                                                 |
| `/projects/[id]`                         | Projektakte (Tabs inkl. Angebote, Vorankündigung, Telefonnotizen; Begehungen mit Link zur Detailbearbeitung) |
| `/projects/[id]/begehungen/[begehungId]` | Begehung: Stammdaten, Verteiler (JSON), Mängel, PDF, E-Mail                                                  |
| `/textbausteine`                         | Textbausteine verwalten                                                                                      |
| `/planung`                               | Wochenplanungsraster                                                                                         |
| `/arbeitskorb`                           | Offene Punkte, fehlende Protokolle                                                                           |
| `/mitarbeiter`                           | Mitarbeiter & Verfügbarkeit                                                                                  |
| `/mitarbeiter/[id]`                      | Mitarbeiter-Detail                                                                                           |
| `/kontakte`                              | Kontakte (Organisationen & Ansprechpartner)                                                                  |
| `/touren`                                | Tourenplanung                                                                                                |
| `/begehungen/[id]/protokoll`             | Protokollbearbeitung zu einer Begehung (ohne Projekt-Prefix in der URL)                                      |
| `/gf`                                    | GF-Dashboard                                                                                                 |
| `/eigene-planung`                        | Eingeschränkte Ansicht für Rolle EXTERN                                                                      |


**Hinweis:** Dashboard-Routen liegen unter `app/(dashboard)/` (Route-Gruppe ohne URL-Präfix).

## API-Routen

### Betrieb & Auth


| Pfad                      | Methode / Zweck                                                    |
| ------------------------- | ------------------------------------------------------------------ |
| `/api/health`             | GET — DB-Ping (`SELECT 1`), **ohne Auth** (Middleware lässt durch) |
| `/api/auth/[...nextauth]` | NextAuth Handler                                                   |


### Planung


| Pfad                                        | Methode / Zweck                                              |
| ------------------------------------------- | ------------------------------------------------------------ |
| `/api/planung`                              | GET — Planungshorizont / Einträge (EXTERN nur `?filter=own`) |
| `/api/planung/[id]`                         | Planungseintrag einzeln                                      |
| `/api/planung/move`                         | Planungszellen verschieben                                   |
| `/api/planung/sync-turnus`                  | Turnus synchronisieren                                       |
| `/api/planung/entries/[entryId]/vorort`     | Vor-Ort-Rückmeldungen (GET/POST)                             |
| `/api/projects/[projectId]/planung-entries` | Projektbezogene Planungseinträge                             |


### Organisationen & Kontakte


| Pfad                      | Methode / Zweck                       |
| ------------------------- | ------------------------------------- |
| `/api/organizations`      | Organisationen (GET/POST)             |
| `/api/organizations/[id]` | Organisation (GET/PATCH/DELETE)       |
| `/api/contacts`           | Kontakte / Ansprechpartner (GET/POST) |
| `/api/contacts/[id]`      | Kontakt (GET/PATCH/DELETE)            |


### Touren


| Pfad                     | Methode / Zweck             |
| ------------------------ | --------------------------- |
| `/api/tours`             | Touren (GET/POST)           |
| `/api/tours/[id]`        | Tour (GET/PATCH/DELETE)     |
| `/api/tours/auto-bundle` | Automatische Tour-Bündelung |


### Mitarbeiter, Verfügbarkeit, Vertretung


| Pfad                     | Methode / Zweck                 |
| ------------------------ | ------------------------------- |
| `/api/employees`         | Mitarbeiterliste / -anlage      |
| `/api/availability`      | Verfügbarkeiten / Abwesenheiten |
| `/api/availability/[id]` | Einzelne Verfügbarkeit          |
| `/api/substitutes`       | Vertretungen                    |
| `/api/substitutes/[id]`  | Einzelne Vertretung             |


### Begehungen (über Begehungs-ID, projektunabhängiger Pfad)


| Pfad                               | Methode / Zweck  |
| ---------------------------------- | ---------------- |
| `/api/begehungen/[id]/send`        | Protokollversand |
| `/api/begehungen/[id]/verteiler`   | Verteiler (JSON) |
| `/api/begehungen/[id]/upload-foto` | Foto-Upload      |
| `/api/begehungen/[id]/add-mangel`  | Mangel anlegen   |


### Projekt-Akte (Angebote, VK, Begehung, Telefon, Teilnehmer, Kommunikation)


| Pfad                                                                   | Methode / Zweck                    |
| ---------------------------------------------------------------------- | ---------------------------------- |
| `/api/projects/[projectId]/offers`                                     | Angebote (GET/POST)                |
| `/api/projects/[projectId]/offers/[offerId]`                           | Angebot (PATCH/DELETE)             |
| `/api/projects/[projectId]/offers/[offerId]/pdf`                       | Angebots-PDF (GET)                 |
| `/api/projects/[projectId]/offers/[offerId]/send`                      | Angebot per E-Mail (POST)          |
| `/api/projects/[projectId]/vorankuendigungen`                          | Vorankündigungen (GET/POST)        |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]`                   | Vorankündigung (PATCH/DELETE)      |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]/pdf`               | VK-PDF (GET)                       |
| `/api/projects/[projectId]/vorankuendigungen/[vkId]/send`              | VK per E-Mail (POST)               |
| `/api/projects/[projectId]/begehungen/[begehungId]`                    | Begehung (PATCH)                   |
| `/api/projects/[projectId]/begehungen/[begehungId]/mangels`            | Mängel (GET/POST)                  |
| `/api/projects/[projectId]/begehungen/[begehungId]/mangels/[mangelId]` | Mangel (DELETE)                    |
| `/api/projects/[projectId]/begehungen/[begehungId]/pdf`                | Begehungs-PDF (GET)                |
| `/api/projects/[projectId]/begehungen/[begehungId]/send`               | Protokoll per E-Mail (POST)        |
| `/api/projects/[projectId]/telefonnotizen`                             | Telefonnotizen (GET/POST, Chronik) |
| `/api/projects/[projectId]/telefonnotizen/[noteId]`                    | Telefonnotiz (PATCH/DELETE)        |
| `/api/projects/[projectId]/contacts`                                   | Projekt-Kontakte / Teilnehmerbezug |
| `/api/projects/[projectId]/contacts/[participantId]`                   | Einzelner Projekt-Kontakt          |
| `/api/projects/[projectId]/participants`                               | Projekt-Teilnehmer                 |
| `/api/projects/[projectId]/communications`                             | Kommunikationsprotokoll (GET/POST) |


### Textbausteine & Export-Stubs


| Pfad                      | Methode / Zweck                                      |
| ------------------------- | ---------------------------------------------------- |
| `/api/textbausteine`      | Textbausteine (GET/POST)                             |
| `/api/textbausteine/[id]` | Textbaustein (PATCH/DELETE)                          |
| `/api/export/ping`        | GET — minimaler Export-Test (Rollen laut Middleware) |


## Rollen (NextAuth / Prisma `Role`)

`ADMIN`, `BUERO` (Fee), `SIKOGO`, `EXTERN`, `GF`.

- Navigation und Zugriff: `[components/nav.tsx](components/nav.tsx)`, `[middleware.ts](middleware.ts)`.
- **EXTERN:** Zugriff u. a. auf `/eigene-planung`, `GET /api/planung?filter=own`, `/api/planung/entries/…/vorort`, `/api/availability` (Lesen); zudem erlaubt die Middleware Pfade unter `**/api/me/`**, **ohne** dass dort Routen existieren — Lücke für künftige „Me“-APIs.

## Demo-Zugänge (Seed)

E-Mail-Domäne `@bauvibe.local`, Passwort laut Seed: `Bauvibe2026!`  
Accounts: `admin@`, `fee@`, `sikogo@`, `gf@`, `extern@` (siehe `[prisma/seed.ts](prisma/seed.ts)`).

## Datenmodell (Prisma)

### Kerneinheiten

- **User** – Login, Rolle, optionale Verknüpfung zu **Employee**.
- **Employee** – intern/extern, Kurzzeichen, Planung, Aufgaben, Freigaben für **Offer**; Verknüpfung zu **Tour**, Projektleitung (`responsibleFor` / `substituteFor`).
- **Availability** – Abwesenheitsintervalle; physische Tabelle `**Holiday`** (`@@map("Holiday")`), Enum `AvailabilityReason`.
- **Substitute** – Vertretung zwischen Mitarbeitern; physische Tabelle `**Substitution`** (`@@map("Substitution")`).
- **Project** – Akte inkl. `tenantId`, `turnus`, Pausenfelder, `responsibleEmployee` / `substituteEmployee`, Beziehungen zu Teilnehmern und Kommunikation.
- **Begehung** – Begehungstermin; Tabelle `**Inspection`**. u. a. `begehungStatus`, `laufendeNr`, `employeeId`, `verteiler` (JSON), **Protokoll**-Kinder.
- **Protokoll** – gehört zu **Begehung**; Status laut `ProtokollStatus`.
- **Mangel** – gehört zu einer Begehung; Foto, Beschreibung, Regel, optional **Textbaustein**.
- **Task**, **Document**, **ChronikEntry** (DB-Tabelle u. a. `ChronicleEntry`), **PlanungEntry** – Aufgaben, Dokumente, Chronik, Wochenraster inkl. Konfliktflag / Planungs-Enums.

### Erweiterte Domäne

- **Organization** – Mandantenfähig (`tenantId`), Branche, Adresse, Aktiv-Flag.
- **ContactPerson** – Ansprechpartner, optional **Organization**.
- **ProjectParticipant** – Verknüpfung Projekt ↔ Organisation / Kontakt, Rolle im Projekt, Gültigkeit.
- **Communication** – Kommunikations-Eintrag pro Projekt (`CommunicationKind`, Verantwortlicher, Follow-up).
- **Offer** – Angebot pro Projekt (`emailInput`, `kalkulation` JSON, `OfferStatus`, Freigabe durch Employee, PDF-URL).
- **Vorankuendigung** – PDF-Formular, Arbeitsschutz-JSON, `VKStatus`, generiertes PDF, Versanddatum.
- **Textbaustein** – Name, Kategorie, Inhalt (Platzhalter möglich).
- **Telefonnotiz** – Projektbezug, Notiz, Erfasser, Erledigt-Flag, Follow-up.
- **VorOrtRueckmeldung** – Bezug **PlanungEntry**, Checkboxen Aushang/Werbung, Unterbrechung, Freitext `rueckmeldung`.
- **Tour** – Tourenplanung, Zuordnung zu **Employee**.

### Enums (Auszug)

- `Role`, `EmployeeKind`, `EmployeeJobRole`, `ProjectStatus`, `TaskStatus`, `TaskPriority`, `TaskSource`
- `OfferStatus`, `VKStatus`, `Turnus`, `AvailabilityReason`
- Planung: `PlanungStatus`, `PlanungType`, `PlanungSource`, `SpecialCode`
- Begehung / Dokumente: `BegehungStatus`, `ProtokollStatus`, `DocumentStatus`
- `CommunicationKind`

## Implementierte Domänenmodule (Kurz)

1. **Angebotserstellung** – Tab „Angebote“ in der Projektakte, APIs + PDF + E-Mail (Stub/Resend).
2. **Vorankündigung** – Tab „Vorankündigung“, APIs + PDF + E-Mail.
3. **Begehungsprotokoll & Mängel** – Tab „Begehungen“ + Detailseite `/projects/[id]/begehungen/[begehungId]`; ergänzend UI `/begehungen/[id]/protokoll` und zentrale APIs unter `/api/begehungen/[id]/…`.
4. **Textbausteine** – Seite `/textbausteine`, globale APIs.
5. **Telefonnotizen** – Tab „Telefonnotizen“, Chronik-Eintrag bei Neuanlage.
6. **Vor-Ort-Rückmeldung** – Dialog „Vor Ort“ auf Planungskarten, API unter `/api/planung/entries/...`.
7. **Kontakte & Organisationen** – Seite `/kontakte`, APIs `/api/organizations`, `/api/contacts`; Projektakte: Teilnehmer & Kommunikation.
8. **Touren** – Seite `/touren`, APIs `/api/tours` inkl. Auto-Bundle.
9. **Automatisierung** – `[lib/pdf.ts](lib/pdf.ts)`, `[lib/email.ts](lib/email.ts)`, Bündel `[lib/automation.ts](lib/automation.ts)`; E-Mail: optional `RESEND_API_KEY`, `EMAIL_FROM`.
10. **Next.js** – **14.2.35** (siehe `package.json`).
11. **CI & Qualität** – `[.github/workflows/ci.yml](.github/workflows/ci.yml)`: `npm ci`, `prisma migrate deploy`, Playwright/Chromium, `npm run test:automated`; GitHub Secrets u. a. `TEST_DATABASE_URL`, `AUTH_SECRET`.
12. **Health** – `GET /api/health` für DB-Erreichbarkeit (Monitoring-fähig).

**Deployment:** Hetzner / buehler.zone werden laut Vorgabe erst nach App-Fertigstellung vorbereitet (außerhalb dieses Repos).

## Sicherheit & Betrieb

1. **Next.js** – aktuell 14.2.35; weiter Patches / ggf. Major-Upgrade planen. `eslint-config-next` synchron zu `next` halten.
2. **Auth** – Credentials, JWT; `AUTH_SECRET` muss in allen Umgebungen gesetzt sein (`[auth.ts](auth.ts)`).
3. **Passwort-Hashing** – bcrypt im `authorize`-Callback; Demo-Passwort nur für Entwicklung.
4. **Middleware** – schützt alle nicht-öffentlichen Routen; öffentlich: `/login`, `/api/auth`, `**/api/health`**. EXTERN siehe Rollen-Abschnitt. Hinweis: Schreibschutz für Kommunikation prüft Pfade unter `/api/communication` — die implementierten Projekt-Routen liegen unter `**/api/projects/.../communications`**; bei Bedarf Middleware-Pfade angleichen.
5. **Seed / SSL** – `[prisma/seed.ts](prisma/seed.ts)` nutzt `ssl: { rejectUnauthorized: false }` für Verbindung zur Cloud-DB – für **Produktion** bewusst entscheiden und idealerweise Zertifikatsprüfung aktivieren.
6. **Datenzugriff** – Anwendung nutzt Prisma mit Server-seitigem Zugriff; kein feingranulares RLS auf App-Ebene dokumentiert – bei öffentlicher API zusätzliche Absicherung nötig.
7. **CI (GitHub Actions)** – Secrets `TEST_DATABASE_URL` und `AUTH_SECRET` müssen im Repo hinterlegt sein. Im Workflow erhält der Schritt **Install dependencies** eine syntaktische Platzhalter-`DATABASE_URL`, damit `postinstall` → `prisma generate` ohne echte DB läuft; Migrate und Tests nutzen weiter die Secrets aus dem Job-`env`.

## Migrationen

- Initial: `prisma/migrations/20260419004056_init/`
- Domäne: `prisma/migrations/20260419012845_domain_extensions/`
- Phase 3 Mitarbeiter: `prisma/migrations/20260419140000_phase3_employee_substitute_fields/`
- Touren: `prisma/migrations/20260419160000_tour_model/`
- Kontakte & Kommunikation: `prisma/migrations/20260420100000_contacts_communication/`

## Projekt-Skills (Cursor)

Unter `[.cursor/skills/](.cursor/skills/)`: `bauvibe-bestandsaufnahme`, `bauvibe-prisma-domains`, `bauvibe-agent-ultra`.  
Regeln: `[.cursor/rules/bauvibe-plan-first.mdc](.cursor/rules/bauvibe-plan-first.mdc)`, `[.cursor/rules/bauvibe-mcp.mdc](.cursor/rules/bauvibe-mcp.mdc)`.