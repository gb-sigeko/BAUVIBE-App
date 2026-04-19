import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 8 },
  meta: { marginBottom: 12, color: "#444" },
  row: { flexDirection: "row", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8 },
  colL: { width: "48%", paddingRight: 8 },
  colR: { width: "52%" },
  mlabel: { fontSize: 9, color: "#666", marginBottom: 4 },
  img: { maxHeight: 120, objectFit: "contain" },
  footer: { marginTop: 20, fontSize: 9 },
});

export type ProtokollMangelPdf = {
  id: string;
  beschreibung: string;
  fotoUrl: string | null;
  absUrl?: string | null;
};

export function BegehungProtokollPdfDocument(props: {
  projectName: string;
  projectCode: string;
  siteAddress: string | null;
  dateLabel: string;
  title: string | null;
  mangels: ProtokollMangelPdf[];
  verteilerLines: string[];
  abschluss: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Begehungsprotokoll</Text>
        <View style={styles.meta}>
          <Text>Projekt: {props.projectName} ({props.projectCode})</Text>
          {props.siteAddress ? <Text>Adresse: {props.siteAddress}</Text> : null}
          <Text>Datum: {props.dateLabel}</Text>
          {props.title ? <Text>Titel: {props.title}</Text> : null}
        </View>
        <Text style={{ ...styles.mlabel, marginBottom: 6 }}>Mängel (links Beschreibung, rechts Bild)</Text>
        {props.mangels.map((m) => (
          <View key={m.id} style={styles.row} wrap={false}>
            <View style={styles.colL}>
              <Text style={styles.mlabel}>Mangel</Text>
              <Text>{m.beschreibung}</Text>
            </View>
            <View style={styles.colR}>
              {m.absUrl ? (
                /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/image ohne alt-Prop */
                <Image style={styles.img} src={m.absUrl} />
              ) : (
                <Text style={{ color: "#999" }}>Kein Bild</Text>
              )}
            </View>
          </View>
        ))}
        <Text style={{ marginTop: 12, fontFamily: "Helvetica-Bold" }}>Verteiler</Text>
        {props.verteilerLines.map((line, i) => (
          <Text key={i} style={{ fontSize: 9 }}>
            {line}
          </Text>
        ))}
        <Text style={styles.footer}>{props.abschluss}</Text>
        <Text style={{ marginTop: 24 }}>Unterschrift SiGeKo: ________________________________</Text>
      </Page>
    </Document>
  );
}
