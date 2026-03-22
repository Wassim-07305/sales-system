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
import { FileSignature, Check, PenTool, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureDialogProps {
  contractId: string;
  contractName: string;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomSubmit?: (signatureData: string, signerName: string) => Promise<void>;
}

export function SignatureDialog({
  contractId,
  contractName,
  amount,
  open,
  onOpenChange,
  onCustomSubmit,
}: SignatureDialogProps) {
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");

  const hasSignature =
    signatureMode === "draw" ? !!signatureData : !!typedSignature.trim();
  const canSubmit = signerName.trim().length > 0 && hasSignature && accepted;

  function textToSignatureImage(text: string): string | null {
    if (!text.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 400, 150);
    ctx.font = "italic 42px 'Segoe Script', 'Dancing Script', cursive";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 200, 75);
    return canvas.toDataURL("image/png");
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    let finalSignatureData = signatureData;
    if (signatureMode === "type") {
      finalSignatureData = textToSignatureImage(typedSignature);
    }
    if (!finalSignatureData) return;

    setLoading(true);
    try {
      if (onCustomSubmit) {
        await onCustomSubmit(finalSignatureData, signerName.trim());
      } else {
        await saveSignature(contractId, finalSignatureData, signerName.trim());
      }
      toast.success("Contrat signe avec succes !");
      onOpenChange(false);
      // Reset state
      setSignerName("");
      setSignatureData(null);
      setAccepted(false);
      setTypedSignature("");
      setSignatureMode("draw");
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
      setTypedSignature("");
      setSignatureMode("draw");
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[#10b981]" />
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

        {/* Signature mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
          <button
            type="button"
            onClick={() => setSignatureMode("draw")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              signatureMode === "draw"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PenTool className="h-3.5 w-3.5" />
            Dessiner
          </button>
          <button
            type="button"
            onClick={() => setSignatureMode("type")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              signatureMode === "type"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Taper
          </button>
        </div>

        {/* Signature input (draw or type) */}
        {signatureMode === "draw" ? (
          <div className="space-y-2">
            <Label>Dessinez votre signature</Label>
            <SignatureCanvas
              onSign={(dataUrl) => setSignatureData(dataUrl)}
              height={180}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Tapez votre signature</Label>
            <Input
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Votre nom complet"
              className="text-xl h-12"
              style={{
                fontFamily:
                  "'Caveat', 'Dancing Script', 'Segoe Script', cursive",
                fontSize: "24px",
              }}
            />
            {/* Preview */}
            {typedSignature && (
              <div className="p-4 bg-white rounded-lg border border-dashed border-border/50 flex items-center justify-center min-h-[120px]">
                <span
                  className="text-3xl text-black"
                  style={{
                    fontFamily:
                      "'Caveat', 'Dancing Script', 'Segoe Script', cursive",
                  }}
                >
                  {typedSignature}
                </span>
              </div>
            )}
          </div>
        )}

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
            className="bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90 font-semibold"
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
