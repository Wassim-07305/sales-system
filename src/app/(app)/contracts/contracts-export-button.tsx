"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ExportDialog } from "@/components/export-dialog";

export function ContractsExportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4 mr-2" />
        Exporter
      </Button>
      <ExportDialog type="contracts" open={open} onOpenChange={setOpen} />
    </>
  );
}
