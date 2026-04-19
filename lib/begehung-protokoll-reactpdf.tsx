/* eslint-disable jsx-a11y/alt-text -- @react-pdf/render Image hat kein alt-Prop */
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 8 },
  meta: { marginBottom: 12, color: "#333" },
  row: { flexDirection: "row", marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingBottom: 4 },
  colL: { width: "48%", paddingRight: 8 },
  colR: { width: "52%" },
  img: { maxHeight: 120, objectFit: "contain" },
  verteiler: { marginTop: 12 },
  signBox: { marginTop: 24, height: 48, borderWidth: 1, borderColor: "#000", padding: 6 },
});

export type BegehungPdfMangel = {
  beschreibung: string;
  fotoUrl: string | null;
  regel: string | null;
};

export type BegehungPdfInput = {
  projectName: string;
  projectCode: string;
  siteAddress: string | null;
  dateLabel: string;
  title: string | null;
  notes: string | null;
  uebersichtFoto: string | null;
  mangels: BegehungPdfMangel[];
  verteilerLines: string[];
  closingText: string;
};

function MangelRow({ m }: { m: BegehungPdfMangel }) {
  return (
    <View style={styles.row} wrap={false}>
      <View style={styles.colL}>
        <Text>{m.beschreibung}</Text>
        {m.regel ? <Text style={{ marginTop: 4, color: "#555" }}>Regel: {m.regel}</Text> : null}
      </View>
      <View style={styles.colR}>
        {m.fotoUrl && (m.fotoUrl.startsWith("data:") || m.fotoUrl.startsWith("http")) ? (
          <Image style={styles.img} src={m.fotoUrl} />
        ) : (
          <Text>—</Text>
        )}
      </View>
    </View>
  );
}

function ProtokollDoc({ data }: { data: BegehungPdfInput }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Begehungsprotokoll</Text>
        <Text style={styles.meta}>
          Projekt: {data.projectName} ({data.projectCode})
        </Text>
        <Text style={styles.meta}>Ort: {data.siteAddress ?? "—"}</Text>
        <Text style={styles.meta}>Datum: {data.dateLabel}</Text>
        <Text style={styles.meta}>Titel: {data.title ?? "—"}</Text>
        <Text style={styles.meta}>Notizen: {data.notes ?? "—"}</Text>
        {data.uebersichtFoto && (data.uebersichtFoto.startsWith("data:") || data.uebersichtFoto.startsWith("http")) ? (
          <View style={{ marginVertical: 8 }}>
            <Text style={{ marginBottom: 4 }}>Übersichtsfoto</Text>
            <Image style={{ maxHeight: 160, objectFit: "contain" }} src={data.uebersichtFoto} />
          </View>
        ) : null}
        <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 11 }}>Mängel</Text>
        {data.mangels.length === 0 ? <Text>Keine Mängel erfasst.</Text> : data.mangels.map((m, i) => <MangelRow key={i} m={m} />)}
        <View style={styles.verteiler}>
          <Text style={{ fontSize: 11, marginBottom: 4 }}>Verteiler</Text>
          {data.verteilerLines.length === 0 ? (
            <Text>—</Text>
          ) : (
            data.verteilerLines.map((line, i) => <Text key={i}>• {line}</Text>)
          )}
        </View>
        <Text style={{ marginTop: 16 }}>{data.closingText}</Text>
        <Text style={{ marginTop: 8 }}>Digitale Unterschrift (SiGeKo):</Text>
        <View style={styles.signBox}>
          <Text> </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function buildBegehungProtokollPdfBuffer(data: BegehungPdfInput): Promise<Buffer> {
  const el = <ProtokollDoc data={data} />;
  return renderToBuffer(el);
}
