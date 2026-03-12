"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendContract, revokeSignature } from "@/lib/actions/contracts";
import { SignatureDialog } from "@/components/signature-dialog";
import { toast } from "sonner";
import { ArrowLeft, Send, PenTool, Download, CheckCircle2, ShieldX, FileSignature, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import dynamic from "next/dynamic";

const ContractPdf = dynamic(
  () => import("./contract-pdf").then((mod) => mod.ContractPdf),
  { ssr: false }
);

interface Props {
  contract: {
    id: string;
    content: string;
    amount: number | null;
    status: string;
    signed_at: string | null;
    signature_data: string | null;
    signer_name: string | null;
    signer_user_id: string | null;
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
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await sendContract(contract.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Contrat envoyé au client");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette signature ?")) return;
    setLoading(true);
    try {
      const result = await revokeSignature(contract.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Signature révoquée");
      }
    } catch {
      toast.error("Erreur lors de la révocation");
    } finally {
      setLoading(false);
    }
  }

  const canSign = isClient && contract.status === "sent";
  const canSend = isAdmin && contract.status === "draft";
  const canRevoke = isAdmin && contract.status === "signed";

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
                  <div className="flex items-center gap-2 mb-2">
                    <FileSignature className="h-4 w-4 text-[#7af17a]" />
                    <p className="text-sm font-medium">Signature électronique</p>
                  </div>
                  <img
                    src={contract.signature_data}
                    alt="Signature"
                    className="max-h-24 border rounded p-2 bg-white"
                  />
                  <div className="mt-2 space-y-0.5">
                    {contract.signer_name && (
                      <p className="text-xs text-muted-foreground">
                        Signé par : <span className="font-medium text-foreground">{contract.signer_name}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Signé le {contract.signed_at ? format(new Date(contract.signed_at), "d MMMM yyyy à HH:mm", { locale: fr }) : "—"}
                    </p>
                  </div>
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
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {loading ? "Envoi en cours..." : "Envoyer au client"}
                </Button>
              )}

              {canSign && (
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={() => setSignatureDialogOpen(true)}
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
                    {contract.signer_name && (
                      <span className="text-muted-foreground font-normal">
                        par {contract.signer_name}
                      </span>
                    )}
                  </div>
                  {canRevoke && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={handleRevoke}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
                      {loading ? "Révocation..." : "Révoquer la signature"}
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPdf(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {showPdf && (
        <ContractPdf
          contract={contract}
          onClose={() => setShowPdf(false)}
        />
      )}

      <SignatureDialog
        contractId={contract.id}
        contractName={`Contrat #${contract.id.slice(0, 8)}`}
        amount={contract.amount || 0}
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
      />
    </div>
  );
}
