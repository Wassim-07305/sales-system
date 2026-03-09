"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { downloadContractPdf, type ContractPdfData } from "./[id]/contract-pdf";
import { toast } from "sonner";

interface Props {
  contract: ContractPdfData;
}

export function DownloadPdfButton({ contract }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await downloadContractPdf(contract);
      toast.success("PDF téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      disabled={loading}
      title="Télécharger PDF"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}
