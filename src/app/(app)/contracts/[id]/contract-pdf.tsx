"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const accent = "#7af17a";
const dark = "#14080e";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
    color: "#333333",
  },

  /* Header / branding */
  headerBar: {
    backgroundColor: dark,
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: accent,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 8,
    color: "#cccccc",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  contractRef: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  contractDate: {
    fontSize: 8,
    color: "#cccccc",
    marginTop: 2,
  },

  /* Parties section */
  partiesRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  partyBox: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    padding: 14,
    borderLeft: 3,
    borderLeftColor: accent,
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 1,
  },
  partyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: dark,
  },
  partyDetail: {
    fontSize: 9,
    color: "#666666",
    marginTop: 2,
  },

  /* Summary strip */
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: dark,
    borderRadius: 4,
    padding: 14,
    marginBottom: 24,
    gap: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#aaaaaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: accent,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#333333",
    marginVertical: -14,
  },

  /* Content body */
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: dark,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: 1,
    borderBottomColor: accent,
  },
  h2: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: dark,
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 10,
    color: "#333333",
    marginBottom: 3,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  bullet: {
    fontSize: 10,
    color: "#333333",
    marginBottom: 2,
    paddingLeft: 12,
  },
  hr: {
    borderBottom: 1,
    borderBottomColor: "#e0e0e0",
    marginVertical: 14,
  },
  spacer: {
    marginBottom: 8,
  },

  /* Terms & conditions */
  termsBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: dark,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.7,
    marginBottom: 3,
  },

  /* Signature block */
  signatureSection: {
    marginTop: 24,
    borderTop: 2,
    borderTopColor: dark,
    paddingTop: 16,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 32,
  },
  signatureCol: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    marginBottom: 6,
  },
  signatureLine: {
    borderBottom: 1,
    borderBottomColor: "#cccccc",
    height: 60,
    marginBottom: 6,
  },
  signatureImage: {
    width: 160,
    height: 56,
    marginBottom: 6,
  },
  signatureDate: {
    fontSize: 8,
    color: "#999999",
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#aaaaaa",
  },
});

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
export interface ContractPdfData {
  id: string;
  content: string;
  amount: number | null;
  status: string;
  signed_at: string | null;
  signature_data: string | null;
  created_at: string;
  client: { full_name: string | null; email?: string } | null;
}

interface Props {
  contract: ContractPdfData;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDateFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number | null): string {
  if (value == null) return "0 EUR";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " EUR";
}

const statusLabelFr: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  expired: "Expiré",
};

/* Default terms when none are in the contract content */
const defaultTerms: string[] = [
  "1. Le présent contrat prend effet à la date de signature par les deux parties.",
  "2. Tout retard de paiement entraînera des pénalités de retard au taux légal en vigueur, conformément à l\u2019article L.441-10 du Code de commerce.",
  "3. En cas de litige, les parties s\u2019engagent à rechercher une solution amiable avant toute procédure judiciaire. À défaut, le tribunal compétent sera celui du siège social du prestataire.",
  "4. Chaque partie peut résilier le contrat avec un préavis écrit de trente (30) jours. La résiliation ne libère pas des obligations financières en cours.",
  "5. Les informations échangées dans le cadre de ce contrat sont considérées comme confidentielles et ne peuvent être divulguées à des tiers sans accord préalable.",
  "6. Ce contrat est soumis au droit français.",
];

/* ------------------------------------------------------------------ */
/*  PDF Document                                                       */
/* ------------------------------------------------------------------ */
function ContractDocument({ contract }: { contract: ContractPdfData }) {
  const lines = contract.content.split("\n");

  return (
    <Document
      title={`Contrat #${contract.id.slice(0, 8)}`}
      author="Sales System"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header / branding ── */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.brandName}>SALES SYSTEM</Text>
            <Text style={styles.brandTagline}>
              Plateforme CRM &amp; Gestion Commerciale
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractRef}>
              Contrat #{contract.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.contractDate}>
              {formatDateFr(contract.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Parties ── */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Prestataire</Text>
            <Text style={styles.partyName}>Sales System</Text>
            <Text style={styles.partyDetail}>Damien Reynaud</Text>
            <Text style={styles.partyDetail}>contact@salessystem.fr</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>
              {contract.client?.full_name || "Client"}
            </Text>
            {contract.client?.email && (
              <Text style={styles.partyDetail}>{contract.client.email}</Text>
            )}
          </View>
        </View>

        {/* ── Summary strip ── */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Montant Total</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(contract.amount)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Statut</Text>
            <Text style={styles.summaryValue}>
              {statusLabelFr[contract.status] || contract.status}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Date de création</Text>
            <Text style={[styles.summaryValue, { fontSize: 10 }]}>
              {formatDateFr(contract.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Contract body (parsed from markdown-like content) ── */}
        <Text style={styles.sectionTitle}>Détail du contrat</Text>
        {lines.map((line, i) => {
          if (line.startsWith("# "))
            return (
              <Text key={i} style={[styles.h2, { fontSize: 13 }]}>
                {line.slice(2)}
              </Text>
            );
          if (line.startsWith("## "))
            return (
              <Text key={i} style={styles.h2}>
                {line.slice(3)}
              </Text>
            );
          if (line.startsWith("**") && line.endsWith("**"))
            return (
              <Text key={i} style={[styles.text, styles.bold]}>
                {line.slice(2, -2)}
              </Text>
            );
          if (line.startsWith("- "))
            return (
              <Text key={i} style={styles.bullet}>
                {"\u2022"} {line.slice(2)}
              </Text>
            );
          if (line === "---") return <View key={i} style={styles.hr} />;
          if (line.trim() === "") return <View key={i} style={styles.spacer} />;
          return (
            <Text key={i} style={styles.text}>
              {line}
            </Text>
          );
        })}

        {/* ── Conditions générales ── */}
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Conditions générales</Text>
          {defaultTerms.map((term, i) => (
            <Text key={i} style={styles.termsText}>
              {term}
            </Text>
          ))}
        </View>

        {/* ── Signature area ── */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            {/* Prestataire */}
            <View style={styles.signatureCol}>
              <Text style={styles.signatureLabel}>
                Signature du prestataire
              </Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureDate}>
                Date : ____________________
              </Text>
            </View>

            {/* Client */}
            <View style={styles.signatureCol}>
              <Text style={styles.signatureLabel}>Signature du client</Text>
              {contract.signature_data ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={contract.signature_data}
                    style={styles.signatureImage}
                  />
                  <Text style={styles.signatureDate}>
                    {"Signé le "}
                    {contract.signed_at
                      ? formatDateFr(contract.signed_at)
                      : "\u2014"}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureDate}>
                    Date : ____________________
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sales System {"\u2014"} Damien Reynaud {"\u2014"} Ce document a
            valeur contractuelle
          </Text>
          <Text style={styles.footerText}>
            Contrat #{contract.id.slice(0, 8).toUpperCase()} {"\u2014"}{" "}
            {formatDateFr(contract.created_at)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal wrapper                                                      */
/* ------------------------------------------------------------------ */
export function ContractPdf({ contract, onClose }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const blob = await pdf(<ContractDocument contract={contract} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-${contract.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Télécharger le contrat</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Le PDF sera généré avec l&apos;en-tête Sales System, le détail du
          contrat, les conditions générales
          {contract.signature_data
            ? " et la signature du client"
            : " et un espace de signature"}
          .
        </p>
        <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Référence</span>
            <span className="font-medium">
              #{contract.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">
              {contract.client?.full_name || "\u2014"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-medium">
              {formatCurrency(contract.amount)}
            </span>
          </div>
        </div>
        <Button
          className="w-full bg-brand text-brand-dark hover:bg-brand/90"
          onClick={handleDownload}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {generating ? "Génération en cours\u2026" : "Télécharger PDF"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Standalone download helper (used from contract list)               */
/* ------------------------------------------------------------------ */
export async function downloadContractPdf(contract: ContractPdfData) {
  const blob = await pdf(<ContractDocument contract={contract} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contrat-${contract.id.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
