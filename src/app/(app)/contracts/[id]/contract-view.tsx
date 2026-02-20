"use client";

import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signContract, sendContract } from "@/lib/actions/contracts";
import { toast } from "sonner";
import { ArrowLeft, Send, PenTool, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SignatureCanvas } from "./signature-canvas";
import { ContractPdf } from "./contract-pdf";

interface Props {
  contract: {
    id: string;
    content: string;
    amount: number | null;
    status: string;
    signed_at: string | null;
    signature_data: string | null;
    pdf_url: string | null;
    created_at: string;
    client: { full_name: string | null; email: string } | null;
  };
  isClient: boolean;
  isAdmin: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Envoyé", color: "bg-blue-100 text-blue-700" },
  signed: { label: "Signé", color: "bg-green-100 text-green-700" },
};

export function ContractView({ contract, isClient, isAdmin }: Props) {
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const signatureRef = useRef<{ getSignature: () => string | null; clear: () => void }>(null);

  async function handleSign() {
    const signatureData = signatureRef.current?.getSignature();
    if (!signatureData) {
      toast.error("Veuillez dessiner votre signature");
      return;
    }

    setLoading(true);
    try {
      await signContract(contract.id, signatureData);
      toast.success("Contrat signé avec succès !");
      setSigning(false);
    } catch {
      toast.error("Erreur lors de la signature");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    setLoading(true);
    try {
      await sendContract(contract.id);
      toast.success("Contrat envoyé au client");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }

  const canSign = isClient && contract.status === "sent";
  const canSend = isAdmin && contract.status === "draft";

  return (
    <div>
      <PageHeader
        title={`Contrat #${contract.id.slice(0, 8)}`}
        description={`Client : ${contract.client?.full_name || "—"}`}
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={statusConfig[contract.status]?.color}>
            {statusConfig[contract.status]?.label}
          </Badge>
          <Link href="/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract content */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {contract.content.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mb-2">{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-4 mb-1">{line.slice(3)}</h2>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
                  if (line.startsWith("- ")) return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                  if (line === "---") return <hr key={i} className="my-3" />;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="text-muted-foreground">{line}</p>;
                })}
              </div>

              {/* Signature display */}
              {contract.signature_data && (
                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-medium mb-2">Signature du client :</p>
                  <img
                    src={contract.signature_data}
                    alt="Signature"
                    className="max-h-24 border rounded p-2 bg-white"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Signé le {contract.signed_at ? format(new Date(contract.signed_at), "d MMMM yyyy à HH:mm", { locale: fr }) : "—"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-semibold">{contract.amount?.toLocaleString("fr-FR")} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span>{contract.client?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span>{format(new Date(contract.created_at), "d MMM yyyy", { locale: fr })}</span>
              </div>
              {contract.signed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signé le</span>
                  <span>{format(new Date(contract.signed_at), "d MMM yyyy", { locale: fr })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {canSend && (
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={handleSend}
                  disabled={loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer au client
                </Button>
              )}

              {canSign && !signing && (
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={() => setSigning(true)}
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Signer le contrat
                </Button>
              )}

              {contract.status === "signed" && (
                <>
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Contrat signé
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPdf(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Générer le PDF
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Signature canvas */}
          {signing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Votre signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SignatureCanvas ref={signatureRef} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => signatureRef.current?.clear()}
                  >
                    Effacer
                  </Button>
                  <Button
                    className="flex-1 bg-brand text-brand-dark hover:bg-brand/90"
                    onClick={handleSign}
                    disabled={loading}
                  >
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showPdf && (
        <ContractPdf
          contract={contract}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
