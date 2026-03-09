"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CertificatePDF } from "./certificate-pdf";
import { Award, Download, GraduationCap, Calendar, Star } from "lucide-react";
import { toast } from "sonner";

interface Certificate {
  courseId: string;
  courseName: string;
  completionDate: string;
  score: number | null;
  totalLessons: number;
  completedLessons: number;
  certificateId: string;
}

interface CertificatesViewProps {
  certificates: Certificate[];
  userName: string;
}

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

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

export function CertificatesView({
  certificates,
  userName,
}: CertificatesViewProps) {
  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Certificats"
        description="Téléchargez vos certificats de réussite pour les formations complétées."
      >
        <Badge
          variant="secondary"
          className="text-sm px-3 py-1 bg-[#7af17a]/10 text-[#7af17a] border-[#7af17a]/20"
        >
          <Award className="w-4 h-4 mr-1" />
          {certificates.length} certificat{certificates.length !== 1 ? "s" : ""}{" "}
          obtenu{certificates.length !== 1 ? "s" : ""}
        </Badge>
      </PageHeader>

      {certificates.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#7af17a]/10 flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-[#7af17a]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Aucun certificat pour le moment
            </h3>
            <p className="text-muted-foreground max-w-md">
              Complétez toutes les leçons d&apos;un cours dans l&apos;Academy
              pour obtenir votre certificat de réussite.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card
              key={cert.courseId}
              className="bg-card border-border hover:border-[#7af17a]/30 transition-colors"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#7af17a]/10 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-[#7af17a]" />
                  </div>
                  {cert.score !== null && (
                    <Badge
                      variant="outline"
                      className={`${scoreColor(cert.score)} border-current/20`}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {cert.score}/100
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-base leading-tight mb-1">
                    {cert.courseName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDateFR(cert.completionDate)}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {cert.totalLessons} leçon{cert.totalLessons > 1 ? "s" : ""}{" "}
                  complétée{cert.totalLessons > 1 ? "s" : ""}
                </div>

                <PDFDownloadLink
                  document={
                    <CertificatePDF
                      courseName={cert.courseName}
                      userName={userName}
                      completionDate={cert.completionDate}
                      score={cert.score}
                      certificateId={cert.certificateId}
                    />
                  }
                  fileName={`certificat-${cert.courseName.toLowerCase().replace(/\s+/g, "-")}.pdf`}
                >
                  {({ loading, error }) => {
                    if (error && !readyMap[cert.courseId]) {
                      setReadyMap((prev) => ({ ...prev, [cert.courseId]: true }));
                      toast.error("Erreur lors de la génération du PDF");
                    }
                    return (
                      <Button
                        className="w-full bg-[#7af17a]/10 text-[#7af17a] hover:bg-[#7af17a]/20 border border-[#7af17a]/20"
                        variant="outline"
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? "Préparation..." : "Télécharger PDF"}
                      </Button>
                    );
                  }}
                </PDFDownloadLink>

                <p className="text-[10px] text-muted-foreground text-center">
                  ID : {cert.certificateId}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
