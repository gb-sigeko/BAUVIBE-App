/**
 * Kuratierte Lesetexte für Kontextkarten im Arbeitskorb (Ticket 1).
 * Inhaltlich abgestimmt mit `lib/recherche_erweitert_baua.json` und `lib/quellenverzeichnis_erweitert.md`
 * (Branch feature/recherche-erweitert). Paragraphen immer am Gesetzestext prüfen.
 */

export const ARBEITSKORB_RECHTSHINWEIS_FOOTER =
  "standardisierte Hilfe auf Basis von AI-Recherche – keine rechtsverbindliche Auskunft. Im Zweifel bitte die Originalquelle konsultieren.";

export type ArbeitskorbRechtshinweis = {
  id: string;
  title: string;
  paragraphs: string[];
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
};

export const ARBEITSKORB_RECHTSHINWEISE: ArbeitskorbRechtshinweis[] = [
  {
    id: "vorankuendigung",
    title: "Vorankündigung nach BaustellV",
    paragraphs: [
      "Nach BaustellV § 2 Abs. 2 kann eine Vorankündigung an die zuständige Behörde erforderlich sein, wenn Schwellenwerte voraussichtlich erreicht werden: mehr als 30 Arbeitstage und zugleich mehr als 20 gleichzeitig Beschäftigte, oder mehr als 500 Personentage. Die Anzeige ist grundsätzlich spätestens zwei Wochen vor Einrichtung der Baustelle zu erfolgen; Mindestinhalt und Aushang regelt der Gesetzestext (u. a. Anhang I).",
      "Ob Ihr Vorhaben die Schwellen erreicht, ist stets konkret zu prüfen – die konsolidierte Fassung der BaustellV ist maßgeblich.",
    ],
    primaryLabel: "BaustellV (gesetze-im-internet.de)",
    primaryUrl: "https://www.gesetze-im-internet.de/baustellv/",
    secondaryLabel: "BAuA – FAQ BaustellV",
    secondaryUrl: "https://www.baua.de/DE/Themen/Arbeitsgestaltung/Arbeitsstaetten/Bauwirtschaft/FAQ/_functions/faq.html",
  },
  {
    id: "sigeplan",
    title: "SiGe-Plan nach BaustellV",
    paragraphs: [
      "BaustellV § 2 Abs. 3 regelt, wann ein Sicherheits- und Gesundheitsschutzplan (SiGe-Plan) vor Einrichtung der Baustelle vorliegen muss – u. a. in Zusammenhang mit der Vorankündigungspflicht und besonders gefährlichen Arbeiten nach Anhang II auf Mehr-Arbeitgeber-Baustellen. Der Plan muss erkennen lassen, welche arbeitsschutzrechtlichen Vorschriften Anwendung finden, und die Maßnahmen für Tätigkeiten nach Anhang II enthalten.",
      "Struktur und fachliche Mindestlogik beschreibt die BAuA in RAB 31; Inhalte sind am Originaltext von RAB 31 und BaustellV zu verifizieren.",
    ],
    primaryLabel: "RAB 31 (BAuA)",
    primaryUrl: "https://www.baua.de/DE/Angebote/Rechtstexte-und-Technische-Regeln/Regelwerk/RAB/RAB-31.html",
    secondaryLabel: "SiGe-Plan-Themenseite (BAuA)",
    secondaryUrl: "https://www.baua.de/DE/Themen/Arbeitsgestaltung/Arbeitsstaetten/Bauwirtschaft/Sicherheits-und-Gesundheitsschutzplan.html",
  },
  {
    id: "koordination",
    title: "Koordinierungspflichten (BaustellV § 3)",
    paragraphs: [
      "§ 3 BaustellV beschreibt die Koordinierung in der Planungs- und Ausführungsphase, u. a. bei Mehr-Arbeitgeber-Baustellen: geeignete Koordinatoren, Abstimmung der Arbeitsschutzmaßnahmen, SiGe-Plan, Unterlagen für spätere Arbeiten und Zusammenarbeit der Arbeitgeber.",
      "Für SiGeKo bedeutet das in der Praxis vor allem klare Schnittstellen, nachvollziehbare Dokumentation und frühzeitige Abstimmung – ohne die Pflichten der einzelnen Arbeitgeber zu ersetzen.",
    ],
    primaryLabel: "BaustellV (gesetze-im-internet.de)",
    primaryUrl: "https://www.gesetze-im-internet.de/baustellv/",
    secondaryLabel: "ArbSchG (Kontext § 4 Grundsätze)",
    secondaryUrl: "https://www.gesetze-im-internet.de/arbschg/",
  },
  {
    id: "ordnungswidrigkeiten",
    title: "Ordnungswidrigkeiten (BaustellV § 7)",
    paragraphs: [
      "§ 7 BaustellV enthält baustellenspezifische Anknüpfungen zu Ordnungswidrigkeiten u. a. bei Verstößen gegen bestimmte Pflichten aus § 2 (u. a. Vorankündigung und SiGe-Plan). Es handelt sich um einen sachlichen Gesetzesrahmen – keine Bewertung einzelner Fälle und keine „Drohkulisse“ durch diese App.",
      "Konkrete Rechtsfolgen sind ausschließlich anhand der jeweils geltenden Fassungen und im Einzelfall durch die zuständigen Stellen zu klären.",
    ],
    primaryLabel: "BaustellV § 7 (gesetze-im-internet.de)",
    primaryUrl: "https://www.gesetze-im-internet.de/baustellv/",
    secondaryLabel: "BG BAU – Vorschriften und Regeln (Überblick)",
    secondaryUrl: "https://www.bgbau.de/themen/sicherheit-und-gesundheit/vorschriften-und-regeln",
  },
];
