"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  validateEsop,
  requestEsopRevision,
  type EsopSubmission,
} from "@/lib/actions/esop";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  soumis: {
    label: "En attente",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  en_revision: {
    label: "En révision",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  valide: {
    label: "Validé",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

export function EsopValidationList({ esops }: { esops: EsopSubmission[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revisionComments, setRevisionComments] = useState("");
  const [showRevisionFor, setShowRevisionFor] = useState<string | null>(null);

  const pendingEsops = esops.filter(
    (e) => e.status === "soumis" || e.status === "en_revision",
  );
  const otherEsops = esops.filter(
    (e) => e.status !== "soumis" && e.status !== "en_revision",
  );

  function handleValidate(esopId: string) {
    if (!confirm("Valider cet ESOP ? Les SOPs seront automatiquement pré-remplis.")) return;
    startTransition(async () => {
      const result = await validateEsop(esopId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("ESOP validé et SOPs pré-remplis !");
        router.refresh();
      }
    });
  }

  function handleRequestRevision(esopId: string) {
    if (!revisionComments.trim()) {
      toast.error("Veuillez ajouter un commentaire");
      return;
    }
    startTransition(async () => {
      const result = await requestEsopRevision(esopId, revisionComments.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Demande de révision envoyée");
        setShowRevisionFor(null);
        setRevisionComments("");
        router.refresh();
      }
    });
  }

  function renderEsopCard(esop: EsopSubmission) {
    const isExpanded = expandedId === esop.id;
    const statusCfg = STATUS_CONFIG[esop.status];
    const content = esop.content;

    return (
      <Card key={esop.id} className="rounded-xl border-border/50">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {esop.entrepreneur?.full_name || esop.entrepreneur?.company || "Entrepreneur"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {esop.entrepreneur?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn("text-xs", statusCfg?.color)}>
                {statusCfg?.label}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(isExpanded ? null : esop.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
              {/* Offre */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Offre
                </h4>
                <p className="text-sm">
                  {content.nom_offre || "—"} — {content.prix_range || "prix non défini"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.ce_que_client_obtient || "—"}
                </p>
              </div>
              {/* Cible */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Cible
                </h4>
                <p className="text-sm">
                  {content.description_client_ideal || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.tranche_age || "—"} | {content.plateforme_principale || "—"}
                </p>
              </div>
              {/* Contexte */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Contexte
                </h4>
                <p className="text-sm">
                  Vend depuis : {content.anciennete_vente || "—"} |{" "}
                  {content.nombre_clients_total || "—"} clients
                </p>
                {content.objections_frequentes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Objections : {content.objections_frequentes}
                  </p>
                )}
              </div>
              {/* Objectifs */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Objectifs
                </h4>
                <p className="text-sm">
                  {content.volume_messages_jour || "—"} msg/jour |{" "}
                  {content.calls_par_semaine || "—"} calls/semaine
                </p>
              </div>

              {/* Actions */}
              {(esop.status === "soumis" || esop.status === "en_revision") && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleValidate(esop.id)}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Valider
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowRevisionFor(
                          showRevisionFor === esop.id ? null : esop.id,
                        )
                      }
                      className="gap-1.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Demander des révisions
                    </Button>
                  </div>
                  {showRevisionFor === esop.id && (
                    <div className="flex gap-2 mt-2">
                      <Textarea
                        value={revisionComments}
                        onChange={(e) => setRevisionComments(e.target.value)}
                        placeholder="Expliquez les modifications à apporter..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRequestRevision(esop.id)}
                        disabled={isPending || !revisionComments.trim()}
                        className="shrink-0 gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Validation des ESOPs"
        description="Examinez et validez les documents ESOP des entrepreneurs"
      >
        <Link href="/settings/workspaces">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Pending count */}
      {pendingEsops.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-blue-500 font-medium">
            {pendingEsops.length} ESOP{pendingEsops.length > 1 ? "s" : ""} en
            attente de validation
          </span>
        </div>
      )}

      {/* Pending ESOPs */}
      {pendingEsops.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            En attente
          </h3>
          {pendingEsops.map(renderEsopCard)}
        </div>
      )}

      {/* Other ESOPs */}
      {otherEsops.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tous les ESOPs
          </h3>
          {otherEsops.map(renderEsopCard)}
        </div>
      )}

      {esops.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun ESOP</p>
          <p className="text-sm mt-1">
            Les entrepreneurs B2B soumettront leurs ESOPs ici.
          </p>
        </div>
      )}
    </div>
  );
}
