import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, Download, FolderOpen } from "lucide-react";

const resources = [
  {
    title: "Guide de démarrage rapide",
    type: "pdf",
    size: "2.4 MB",
    icon: FileText,
  },
  {
    title: "Template de scripts d'appel",
    type: "pdf",
    size: "1.1 MB",
    icon: FileText,
  },
  {
    title: "Replay — Masterclass Closing",
    type: "video",
    size: "45 min",
    icon: Video,
  },
  {
    title: "Checklist prospection quotidienne",
    type: "pdf",
    size: "0.5 MB",
    icon: FileText,
  },
];

export default function ResourcesPage() {
  return (
    <div>
      <PageHeader
        title="Ressources"
        description="Documents, replays et fichiers utiles"
      />

      <div className="space-y-3">
        {resources.map((resource, i) => {
          const Icon = resource.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{resource.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {resource.type.toUpperCase()} — {resource.size}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
