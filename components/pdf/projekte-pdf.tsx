import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 12, fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderColor: "#ccc" },
  c1: { width: "18%" },
  c2: { width: "38%" },
  c3: { width: "14%" },
  c4: { width: "15%" },
  c5: { width: "15%" },
});

export type ProjektPdfRow = {
  code: string;
  name: string;
  status: string;
  turnus: string;
  fortschritt: string;
};

export function ProjektePdf({ rows }: { rows: ProjektPdfRow[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Projektliste</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.c1}>Code</Text>
          <Text style={styles.c2}>Name</Text>
          <Text style={styles.c3}>Status</Text>
          <Text style={styles.c4}>Turnus</Text>
          <Text style={styles.c5}>Fortschritt</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.c1}>{r.code}</Text>
            <Text style={styles.c2}>{r.name}</Text>
            <Text style={styles.c3}>{r.status}</Text>
            <Text style={styles.c4}>{r.turnus}</Text>
            <Text style={styles.c5}>{r.fortschritt}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
