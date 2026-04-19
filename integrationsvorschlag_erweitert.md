# Integrationsvorschlag (erweitert) für BAUVIBE

**Hinweis:** standardisierte Hilfe auf Basis von AI-Recherche – keine rechtsverbindliche Auskunft.

## Zielbild

Die Rechercheartefakte (`recherche_erweitert_baua.json`, `recherche_erweitert_bg_bau.json`) sind als **fachliche Seeds** gedacht, nicht als Ersatz für projekt- und gewerkspezifische Gefährdungsbeurteilungen oder behördliche Auslegung.

## Datenmodell (empfohlen, minimal-invasiv)

1. **`regelwerk_item` (neu oder Erweiterung bestehender Textbaustein-Tabelle)**
   - Felder: `kuerzel`, `typ` (Gesetz|Vorschrift|Regel|ASR|RAB|Norm|Leitfaden), `titel`, `url`, `zitatfaehigkeit` (enum: `hoch|mittel|nur_verweis`), `tags[]`, `aktualisiert_am`.
   - UI: Tooltip „Primärquelle öffnen“ mit Link aus `quellenverzeichnis_erweitert.md` / JSON `url`.

2. **`mangel_template`**
   - Verknüpfung zu `regelwerk_item` über `rechtliche_einordnung` als **kurzer Verweis** plus optional `paragraph` strukturiert (`gesetz`, `paragraph`, `absatz`).
   - App-Logik: Mängeltext = `{kurztext} (vgl. {kuerzel} {paragraph})` nur wenn Nutzer „Rechtsverweis einfügen“ aktiviert (Default: sachbeschreibend, ohne Pseudo-Zitate).

3. **`checklist_template` / `checklist_item`**
   - Import aus JSON-Blöcken `checklisten_vorlage` als **Startersets** (Rohdaten), editierbar pro Projekt.
   - Tags: `phase`, `gewerk`, `risiko` für Filter in Begehungen.

4. **`sigeplan_kapitel` (optional, später)**
   - Mapping auf RAB-31-Struktur aus `sigeplan_struktur_rab31_arbeits_hypothese` in `recherche_erweitert_baua.json`.
   - UI: Kapitel als Abschnitte in Projektakte / Dokumenten-Generator.

## Arbeitskorb (Hinweise statt Rechtsberatung)

- **Ampel-Logik nur beschreibend:** Verweise auf BaustellV § 7 (OWi-Tatbestände) ausschließlich als Bildungs-/Risiko-Hinweis, nicht als „Strafbarkeits-Prognose“.
- **Kontextkarten:** Für SiGeKo: Karten zu „Vorankündigung“ (BaustellV § 2 Abs. 2), „SiGe-Plan“ (§ 2 Abs. 3), „Koordination“ (§ 3), „Unterlage spätere Arbeiten“ (§ 3 Abs. 2 Nr. 3).

## Textbausteine (Mängel)

- Nutze `standard_maengel_katalog_auszug` und `gefaehrdungsarten_baustelle` als **Vorschlagsliste** im Editor (Autocomplete).
- Pflicht-Disclaimer im UI-Footer bei allen aus Recherche importierten Texten: „AI-/Wissensbasis, keine Rechtsberatung“.

## Qualitätssicherung (Produktprozess)

- Quartalsweise: Links aus `quellenverzeichnis_erweitert.md` stichprobenartig prüfen (HTTP 200, Fassungsdatum PDF).
- Bei Gesetzesänderungen: `baustellv.paragrafen` neu aus `gesetze-im-internet` diffen.

## Nächste technische Schritte (klein, umsetzbar)

1. JSON-Dateien ins Repo legen (dieser Branch).
2. Optional: einmaliger Import-Skript (`scripts/import-recherche-seeds.ts`) der JSON in die DB seedet – nur wenn Schema steht.
3. UI: „Fachhilfe“-Panel in Begehung mit Filter nach `tags`.
