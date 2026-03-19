"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  sendContract,
  revokeSignature,
  countersignContract,
} from "@/lib/actions/contracts";
import { SignatureDialog } from "@/components/signature-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  PenTool,
  Download,
  CheckCircle2,
  ShieldX,
  FileSignature,
  Loader2,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import dynamic from "next/dynamic";

const ContractPdf = dynamic(
  () => import("./contract-pdf").then((mod) => mod.ContractPdf),
  { ssr: false },
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

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: {
    label: "Brouillon",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border/50",
  },
  sent: {
    label: "Envoyé",
    color: "text-blue-600",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  client_signed: {
    label: "Signé par le client",
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  signed: {
    label: "Signé",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ContractView({ contract, isClient, isAdmin }: Props) {
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [isCountersigning, setIsCountersigning] = useState(false);
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

  async function handleCountersign(signatureData: string, signerName: string) {
    setLoading(true);
    try {
      const result = await countersignContract(
        contract.id,
        signatureData,
        signerName,
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Contrat contresigné avec succès !");
      }
    } catch {
      toast.error("Erreur lors de la contresignature");
    } finally {
      setLoading(false);
    }
  }

  const canSign = isClient && contract.status === "sent";
  const canSend = isAdmin && contract.status === "draft";
  const canRevoke = isAdmin && contract.status === "signed";
  const canCountersign = isAdmin && contract.status === "client_signed";
  const stCfg = statusConfig[contract.status] || statusConfig.draft;

  return (
    <div>
      <PageHeader
        title={`Contrat #${contract.id.slice(0, 8)}`}
        description={`Client : ${contract.client?.full_name || "—"}`}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs font-medium border", stCfg.bg, stCfg.color)}
          >
            {stCfg.label}
          </Badge>
          <Link href="/contracts">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contract content */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {contract.content.split("\n").map((line, i) => {
                  if (line.startsWith("# "))
                    return (
                      <h1
                        key={i}
                        className="text-lg font-bold mb-2 text-foreground"
                      >
                        {line.slice(2)}
                      </h1>
                    );
                  if (line.startsWith("## "))
                    return (
                      <h2
                        key={i}
                        className="text-base font-semibold mt-5 mb-1.5 text-foreground"
                      >
                        {line.slice(3)}
                      </h2>
                    );
                  if (line.startsWith("**") && line.endsWith("**"))
                    return (
                      <p key={i} className="font-semibold text-foreground">
                        {line.slice(2, -2)}
                      </p>
                    );
                  if (line.startsWith("- "))
                    return (
                      <li
                        key={i}
                        className="ml-4 text-muted-foreground list-disc"
                      >
                        {line.slice(2)}
                      </li>
                    );
                  if (line === "---")
                    return <hr key={i} className="my-4 border-border/50" />;
                  if (line.trim() === "") return <br key={i} />;
                  return (
                    <p key={i} className="text-muted-foreground">
                      {line}
                    </p>
                  );
                })}
              </div>

              {/* Signature display */}
              {contract.signature_data && (
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileSignature className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold">
                      Signature électronique
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-border/50 inline-block">
                    <img
                      src={contract.signature_data}
                      alt="Signature"
                      className="max-h-24"
                    />
                  </div>
                  <div className="mt-3 space-y-0.5">
                    {contract.signer_name && (
                      <p className="text-xs text-muted-foreground">
                        Signé par :{" "}
                        <span className="font-medium text-foreground">
                          {contract.signer_name}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Signé le{" "}
                      {contract.signed_at
                        ? format(
                            new Date(contract.signed_at),
                            "d MMMM yyyy à HH:mm",
                            { locale: fr },
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Montant
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums">
                  {contract.amount?.toLocaleString("fr-FR")} €
                </p>
              </div>

              {/* Client */}
              {contract.client && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0",
                      getAvatarColor(contract.client.full_name || "?"),
                    )}
                  >
                    {contract.client.full_name
                      ?.split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contract.client.full_name || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {contract.client.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Créé le
                  </span>
                  <span className="text-xs font-medium">
                    {format(new Date(contract.created_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                {contract.signed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <FileSignature className="h-3 w-3" />
                      Signé le
                    </span>
                    <span className="text-xs font-medium">
                      {format(new Date(contract.signed_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {canSend && (
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
                  onClick={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {loading ? "Envoi en cours..." : "Envoyer au client"}
                </Button>
              )}

              {canSign && (
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
                  onClick={() => {
                    setIsCountersigning(false);
                    setSignatureDialogOpen(true);
                  }}
                >
                  <PenTool className="h-4 w-4" />
                  Signer le contrat
                </Button>
              )}

              {canCountersign && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <FileSignature className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        En attente de votre signature
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Le client a signé — contresignez pour finaliser
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
                    onClick={() => {
                      setIsCountersigning(true);
                      setSignatureDialogOpen(true);
                    }}
                  >
                    <PenTool className="h-4 w-4" />
                    Contresigner le contrat
                  </Button>
                </>
              )}

              {isClient && contract.status === "client_signed" && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <FileSignature className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-600">
                      Signature envoyée
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      En attente de la contresignature de SalesSystem Academy
                    </p>
                  </div>
                </div>
              )}

              {contract.status === "signed" && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-600">
                        Contrat signé
                      </p>
                      {contract.signer_name && (
                        <p className="text-[11px] text-muted-foreground">
                          par {contract.signer_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {canRevoke && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      onClick={handleRevoke}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldX className="h-4 w-4" />
                      )}
                      {loading ? "Révocation..." : "Révoquer la signature"}
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setShowPdf(true)}
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPdf && (
        <ContractPdf contract={contract} onClose={() => setShowPdf(false)} />
      )}

      <SignatureDialog
        contractId={contract.id}
        contractName={`Contrat #${contract.id.slice(0, 8)}`}
        amount={contract.amount || 0}
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          setSignatureDialogOpen(open);
          if (!open) setIsCountersigning(false);
        }}
        onCustomSubmit={
          isCountersigning
            ? async (sigData, sigName) => {
                await handleCountersign(sigData, sigName);
                setSignatureDialogOpen(false);
                setIsCountersigning(false);
              }
            : undefined
        }
      />
    </div>
  );
}
