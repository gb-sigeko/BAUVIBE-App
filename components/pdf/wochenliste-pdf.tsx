import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 12, fontWeight: "bold" },
  meta: { fontSize: 9, marginBottom: 16, color: "#444" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderColor: "#ccc" },
  c1: { width: "32%" },
  c2: { width: "18%" },
  c3: { width: "30%" },
  c4: { width: "20%" },
});

export type WochenlistePdfRow = {
  project: string;
  employee: string;
  status: string;
  begehNr: string;
};

export function WochenlistePdf({
  isoYear,
  isoWeek,
  rows,
}: {
  isoYear: number;
  isoWeek: number;
  rows: WochenlistePdfRow[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Wochenliste</Text>
        <Text style={styles.meta}>
          Kalenderwoche {isoWeek} / {isoYear} · {rows.length} Einträge
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.c1}>Projekt</Text>
          <Text style={styles.c2}>Mitarbeiter</Text>
          <Text style={styles.c3}>Status</Text>
          <Text style={styles.c4}>Begeh. Nr.</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.c1}>{r.project}</Text>
            <Text style={styles.c2}>{r.employee}</Text>
            <Text style={styles.c3}>{r.status}</Text>
            <Text style={styles.c4}>{r.begehNr}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
