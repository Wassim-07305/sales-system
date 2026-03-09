"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

interface CertificatePDFProps {
  courseName: string;
  userName: string;
  completionDate: string;
  score: number | null;
  certificateId: string;
}

const GREEN = "#7af17a";
const DARK = "#14080e";

function formatDateFR(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFDF7",
    padding: 0,
    fontFamily: "Helvetica",
  },
  outerBorder: {
    margin: 24,
    border: `3px solid ${DARK}`,
    padding: 6,
    height: "auto",
    flexGrow: 1,
  },
  innerBorder: {
    border: `1px solid ${GREEN}`,
    padding: 40,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topAccent: {
    width: 80,
    height: 4,
    backgroundColor: GREEN,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 11,
    color: "#888888",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    color: DARK,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  academy: {
    fontSize: 13,
    color: GREEN,
    letterSpacing: 2,
    marginBottom: 32,
    fontFamily: "Helvetica-Bold",
  },
  awardedTo: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 26,
    color: DARK,
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
    textAlign: "center",
  },
  completionText: {
    fontSize: 11,
    color: "#555555",
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 1.5,
  },
  courseName: {
    fontSize: 18,
    color: DARK,
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  scoreLabel: {
    fontSize: 10,
    color: "#888888",
  },
  scoreValue: {
    fontSize: 16,
    color: GREEN,
    fontFamily: "Helvetica-Bold",
  },
  dateText: {
    fontSize: 11,
    color: "#555555",
    marginBottom: 32,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: GREEN,
    marginBottom: 24,
  },
  signatureSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  signatureLine: {
    width: 180,
    borderBottom: `1px solid ${DARK}`,
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 12,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
  signatureTitle: {
    fontSize: 9,
    color: "#888888",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  certificateId: {
    fontSize: 8,
    color: "#aaaaaa",
    letterSpacing: 1,
  },
});

export function CertificatePDF({
  courseName,
  userName,
  completionDate,
  score,
  certificateId,
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <View style={styles.topAccent} />

            <Text style={styles.subtitle}>Certificat</Text>
            <Text style={styles.title}>CERTIFICAT DE RÉUSSITE</Text>
            <Text style={styles.academy}>SALES SYSTEM ACADEMY</Text>

            <Text style={styles.awardedTo}>Décerné à</Text>
            <Text style={styles.recipientName}>{userName}</Text>

            <Text style={styles.completionText}>
              Pour avoir complété avec succès la formation
            </Text>
            <Text style={styles.courseName}>{courseName}</Text>

            {score !== null && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Score obtenu :</Text>
                <Text style={styles.scoreValue}>{score}/100</Text>
              </View>
            )}

            <Text style={styles.dateText}>
              Délivré le {formatDateFR(completionDate)}
            </Text>

            <View style={styles.divider} />

            <View style={styles.signatureSection}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Damien Reynaud</Text>
              <Text style={styles.signatureTitle}>
                Directeur de Formation
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.certificateId}>
                ID : {certificateId}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
