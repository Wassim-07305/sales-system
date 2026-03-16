"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureCanvas } from "@/components/signature-canvas";
import { saveSignature } from "@/lib/actions/contracts";
import { toast } from "sonner";
import { FileSignature, Check } from "lucide-react";

interface SignatureDialogProps {
  contractId: string;
  contractName: string;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignatureDialog({
  contractId,
  contractName,
  amount,
  open,
  onOpenChange,
}: SignatureDialogProps) {
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = signerName.trim().length > 0 && signatureData && accepted;

  async function handleSubmit() {
    if (!canSubmit || !signatureData) return;

    setLoading(true);
    try {
      await saveSignature(contractId, signatureData, signerName.trim());
      toast.success("Contrat signe avec succes !");
      onOpenChange(false);
      // Reset state
      setSignerName("");
      setSignatureData(null);
      setAccepted(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la signature",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setSignerName("");
      setSignatureData(null);
      setAccepted(false);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[#7af17a]" />
            Signature electronique
          </DialogTitle>
          <DialogDescription>
            Signez le contrat ci-dessous de maniere electronique.
          </DialogDescription>
        </DialogHeader>

        {/* Contract summary */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-semibold">Resume du contrat</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Contrat</span>
              <p className="font-medium">{contractName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Montant</span>
              <p className="font-medium">
                {amount.toLocaleString("fr-FR")} &euro;
              </p>
            </div>
          </div>
        </div>

        {/* Signer name */}
        <div className="space-y-2">
          <Label htmlFor="signer-name">Nom complet du signataire</Label>
          <Input
            id="signer-name"
            placeholder="Prenom Nom"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>

        {/* Signature canvas */}
        <div className="space-y-2">
          <Label>Votre signature</Label>
          <SignatureCanvas
            onSign={(dataUrl) => setSignatureData(dataUrl)}
            height={180}
          />
        </div>

        {/* Legal text + checkbox */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            En signant, vous acceptez les termes du contrat ci-dessus. Cette
            signature electronique a valeur juridique conformement au reglement
            eIDAS et a la legislation en vigueur.
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <Label
              htmlFor="accept-terms"
              className="text-sm leading-snug cursor-pointer"
            >
              Je confirme avoir lu et accepte les conditions
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-semibold"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            <Check className="h-4 w-4 mr-2" />
            {loading ? "Signature en cours..." : "Signer le contrat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
