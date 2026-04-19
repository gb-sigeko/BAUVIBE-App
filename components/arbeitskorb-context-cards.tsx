import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ARBEITSKORB_RECHTSHINWEISE, ARBEITSKORB_RECHTSHINWEIS_FOOTER } from "@/lib/arbeitskorb-rechtshinweise";

/**
 * Nicht-blockierende Kontextkarten (Lesetext + Primärlinks) für den Arbeitskorb.
 * Keine Pflichtaktionen, keine Persistenz.
 */
export function ArbeitskorbContextCards() {
  return (
    <div className="space-y-4" data-testid="arbeitskorb-context-cards">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Hinweise &amp; Quellen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kurzinfos zu häufigen BaustellV-Themen – rein informativ, neben Ihren offenen Punkten.
        </p>
      </div>

      {ARBEITSKORB_RECHTSHINWEISE.map((h) => (
        <Card key={h.id} className="border-muted shadow-none" data-testid={`arbeitskorb-hinweis-${h.id}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base leading-snug">{h.title}</CardTitle>
            <CardDescription className="text-xs">Lesetext mit Verweis auf Paragraphen im Gesetz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {h.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="flex flex-col gap-1.5 pt-1 text-sm">
              <Link
                href={h.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
                data-testid={`arbeitskorb-link-primary-${h.id}`}
              >
                {h.primaryLabel} (neues Fenster)
              </Link>
              {h.secondaryUrl && h.secondaryLabel ? (
                <Link
                  href={h.secondaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                  data-testid={`arbeitskorb-link-secondary-${h.id}`}
                >
                  {h.secondaryLabel} (neues Fenster)
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed bg-muted/30 shadow-none">
        <CardFooter className="flex flex-col items-stretch gap-2 py-4 text-xs text-muted-foreground">
          <p className="italic leading-relaxed">*{ARBEITSKORB_RECHTSHINWEIS_FOOTER}*</p>
          <p>
            Methodischer Hinweis: Paragraphen-Zählungen können sich ändern; vergleiche{" "}
            <Link
              href="https://www.gesetze-im-internet.de/baustellv/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              gesetze-im-internet.de/baustellv
            </Link>{" "}
            statt veralteter Schulungszitate (siehe Quellenverzeichnis im Projekt).
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
