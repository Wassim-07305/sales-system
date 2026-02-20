"use client";

import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.5 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, borderBottom: 1, borderBottomColor: "#e5e5e5", paddingBottom: 16 },
  logo: { width: 40, height: 40, marginRight: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#14080e" },
  subtitle: { fontSize: 10, color: "#6b6b6b" },
  section: { marginBottom: 12 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, color: "#14080e" },
  text: { fontSize: 10, color: "#333333", marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  hr: { borderBottom: 1, borderBottomColor: "#e5e5e5", marginVertical: 12 },
  signatureBlock: { marginTop: 24, borderTop: 1, borderTopColor: "#e5e5e5", paddingTop: 16 },
  signatureImage: { width: 160, height: 60, marginTop: 8 },
  signatureLabel: { fontSize: 9, color: "#6b6b6b", marginTop: 4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999999" },
});

interface Props {
  contract: {
    id: string;
    content: string;
    signature_data: string | null;
    signed_at: string | null;
    client: { full_name: string | null } | null;
  };
  onClose: () => void;
}

function ContractDocument({ contract }: { contract: Props["contract"] }) {
  const lines = contract.content.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sales System</Text>
            <Text style={styles.subtitle}>Contrat #{contract.id.slice(0, 8)}</Text>
          </View>
        </View>

        {lines.map((line, i) => {
          if (line.startsWith("# "))
            return <Text key={i} style={[styles.h2, { fontSize: 14 }]}>{line.slice(2)}</Text>;
          if (line.startsWith("## "))
            return <Text key={i} style={styles.h2}>{line.slice(3)}</Text>;
          if (line.startsWith("**") && line.endsWith("**"))
            return <Text key={i} style={[styles.text, styles.bold]}>{line.slice(2, -2)}</Text>;
          if (line.startsWith("- "))
            return <Text key={i} style={styles.text}>  {"\u2022"} {line.slice(2)}</Text>;
          if (line === "---")
            return <View key={i} style={styles.hr} />;
          if (line.trim() === "")
            return <Text key={i} style={{ marginBottom: 6 }}> </Text>;
          return <Text key={i} style={styles.text}>{line}</Text>;
        })}

        {contract.signature_data && (
          <View style={styles.signatureBlock}>
            <Text style={[styles.text, styles.bold]}>Signature du client :</Text>
            <Image src={contract.signature_data} style={styles.signatureImage} />
            <Text style={styles.signatureLabel}>
              Signé le {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString("fr-FR") : "—"}
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          Sales System — Damien Reynaud — Ce document a valeur contractuelle.
        </Text>
      </Page>
    </Document>
  );
}

export function ContractPdf({ contract, onClose }: Props) {
  async function handleDownload() {
    const blob = await pdf(<ContractDocument contract={contract} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrat-${contract.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Générer le PDF</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Le PDF sera généré avec le contenu du contrat, la signature du client et le logo Sales System.
        </p>
        <Button
          className="w-full bg-brand text-brand-dark hover:bg-brand/90"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger le PDF
        </Button>
      </div>
    </div>
  );
}
