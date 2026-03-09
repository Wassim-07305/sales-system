"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Download,
  Trash2,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { ConsentSettings, DataProcessingLogEntry } from "@/lib/actions/gdpr";
import {
  exportUserData,
  deleteUserData,
  updateConsent,
} from "@/lib/actions/gdpr";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Jamais";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    gdpr_data_export: "Export des donnees",
    gdpr_data_deletion: "Suppression des donnees",
    gdpr_consent_update: "Mise a jour des consentements",
  };
  return labels[action] ?? action;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrivacyViewProps {
  initialConsents: ConsentSettings;
  processingLog: DataProcessingLogEntry[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrivacyView({ initialConsents, processingLog }: PrivacyViewProps) {
  const [consents, setConsents] = useState<ConsentSettings>(initialConsents);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // --- Consent toggle ---
  async function handleToggle(key: keyof Omit<ConsentSettings, "updated_at">, value: boolean) {
    const updated = { ...consents, [key]: value };
    setConsents(updated);
    setSaving(true);
    const result = await updateConsent({
      analytics: updated.analytics,
      marketing: updated.marketing,
      communication: updated.communication,
      third_party_sharing: updated.third_party_sharing,
    });
    setSaving(false);
    if (result.success) {
      setConsents((c) => ({ ...c, updated_at: new Date().toISOString() }));
      toast.success("Consentement mis a jour");
    } else {
      // Revert on error
      setConsents(consents);
      toast.error(result.error ?? "Erreur lors de la mise a jour");
    }
  }

  // --- Export data ---
  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      if (!data) {
        toast.error("Impossible d\u2019exporter les donnees");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export telecharge avec succes");
    } catch {
      toast.error("Erreur lors de l\u2019export");
    } finally {
      setExporting(false);
    }
  }

  // --- Delete account ---
  async function handleDelete() {
    setDeleting(true);
    const result = await deleteUserData();
    setDeleting(false);
    if (result.success) {
      toast.success("Vos donnees ont ete supprimees");
      setDeleteDialogOpen(false);
      setConfirmText("");
    } else {
      toast.error(result.error ?? "Erreur lors de la suppression");
    }
  }

  // ---------------------------------------------------------------------------
  // Consent items config
  // ---------------------------------------------------------------------------

  const consentItems: {
    key: keyof Omit<ConsentSettings, "updated_at">;
    label: string;
    description: string;
  }[] = [
    {
      key: "analytics",
      label: "Analytiques",
      description: "Collecte de donnees d\u2019utilisation pour ameliorer nos services",
    },
    {
      key: "marketing",
      label: "Marketing",
      description: "Recevoir des offres et communications promotionnelles",
    },
    {
      key: "communication",
      label: "Communication",
      description: "Newsletters, mises a jour produit et notifications par email",
    },
    {
      key: "third_party_sharing",
      label: "Partage avec tiers",
      description: "Partage de donnees anonymisees avec nos partenaires",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Consent Management */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestion des consentements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {consentItems.map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={consents[item.key]}
                  onCheckedChange={(v) => handleToggle(item.key, v)}
                  disabled={saving}
                />
              </div>
              {i < consentItems.length - 1 && <Separator />}
            </div>
          ))}
          {consents.updated_at && (
            <div className="flex items-center gap-2 pt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Derniere mise a jour : {formatDate(consents.updated_at)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Data Portability */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Portabilite des donnees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conformement a l&apos;article 20 du RGPD, vous pouvez exporter l&apos;ensemble de vos
            donnees personnelles dans un format structure et lisible par machine (JSON).
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exporter mes donnees
            </Button>
            <span className="text-xs text-muted-foreground">Format JSON</span>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Privacy Policy Summary */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Politique de confidentialite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span>
                <strong className="text-foreground">Droit d&apos;acces (Art. 15)</strong> - Vous
                pouvez consulter et exporter toutes vos donnees personnelles a tout moment.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span>
                <strong className="text-foreground">Droit a l&apos;effacement (Art. 17)</strong> -
                Vous pouvez demander la suppression de vos donnees personnelles.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span>
                <strong className="text-foreground">Droit a la portabilite (Art. 20)</strong> - Vos
                donnees peuvent etre exportees dans un format structure (JSON).
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span>
                <strong className="text-foreground">Consentement (Art. 7)</strong> - Vous pouvez
                modifier vos consentements a tout moment. Le retrait du consentement est aussi
                simple que son octroi.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span>
                <strong className="text-foreground">Registre des traitements (Art. 30)</strong> -
                Toutes les operations sur vos donnees sont tracees dans le journal ci-dessous.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Data Processing Log */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Journal des traitements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processingLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun traitement enregistre pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">{formatDate(entry.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {actionLabel(entry.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{entry.entity_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {entry.details?.description
                        ? String(entry.details.description)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Danger Zone - Account Deletion */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-red-500">
            <Trash2 className="h-5 w-5" />
            Zone de danger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-500">Suppression du compte</p>
                <p className="text-xs text-muted-foreground">
                  Cette action est irreversible. Toutes vos donnees personnelles seront
                  anonymisees ou supprimees conformement a l&apos;article 17 du RGPD (droit a
                  l&apos;effacement). Les donnees necessaires a des fins legales ou comptables
                  seront conservees sous forme anonymisee.
                </p>
              </div>
            </div>
          </div>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  Cette action est definitive. Vos donnees personnelles seront anonymisees et ne
                  pourront pas etre recuperees. Tapez{" "}
                  <strong className="text-foreground">SUPPRIMER</strong> pour confirmer.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Tapez SUPPRIMER"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setConfirmText("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== "SUPPRIMER" || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmer la suppression
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
