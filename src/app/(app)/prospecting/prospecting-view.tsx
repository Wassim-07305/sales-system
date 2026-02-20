"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Send, MessageCircle, Target, Linkedin, Instagram } from "lucide-react";
import { addProspect, updateProspectStatus, incrementDmsSent } from "@/lib/actions/prospecting";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Prospect {
  id: string;
  name: string;
  platform: string | null;
  status: string;
  profile_url: string | null;
  last_message_at: string | null;
  created_at: string;
}

interface Quota {
  id: string;
  dms_sent: number;
  dms_target: number;
  replies_received: number;
  bookings_from_dms: number;
}

const statusColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-orange-100 text-orange-700",
  booked: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "Répondu",
  booked: "Booké",
  not_interested: "Pas intéressé",
};

export function ProspectingView({
  prospects,
  quota,
  lists,
}: {
  prospects: Prospect[];
  quota: Quota | null;
  lists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("linkedin");
  const [newUrl, setNewUrl] = useState("");

  const dmsSent = quota?.dms_sent || 0;
  const dmsTarget = quota?.dms_target || 20;
  const replies = quota?.replies_received || 0;
  const bookings = quota?.bookings_from_dms || 0;

  const filtered = prospects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await addProspect({ name: newName, platform: newPlatform, profile_url: newUrl || undefined });
      toast.success("Prospect ajouté");
      setDialogOpen(false);
      setNewName("");
      setNewUrl("");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateProspectStatus(id, status);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDmIncrement() {
    await incrementDmsSent();
    toast.success("+1 DM envoyé !");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Prospection" description="Tracker de prospection et quotas journaliers">
        <div className="flex gap-2">
          <Link href="/prospecting/templates">
            <Button variant="outline" size="sm">Templates DM</Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-dark hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un prospect
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau prospect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div>
                  <Label>Plateforme</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL du profil (optionnel)</Label>
                  <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
                </div>
                <Button onClick={handleAdd} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Daily quota */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Quota journalier</h3>
                <p className="text-sm text-muted-foreground">{dmsSent}/{dmsTarget} DMs envoyés aujourd&apos;hui</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{dmsTarget > 0 ? Math.round((dmsSent / dmsTarget) * 100) : 0}%</span>
              <Button size="sm" variant="outline" onClick={handleDmIncrement}>+1 DM</Button>
            </div>
          </div>
          <Progress value={dmsTarget > 0 ? (dmsSent / dmsTarget) * 100 : 0} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{dmsSent}</p>
            <p className="text-xs text-muted-foreground">DMs envoyés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{replies}</p>
            <p className="text-xs text-muted-foreground">Réponses reçues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{bookings}</p>
            <p className="text-xs text-muted-foreground">RDV bookés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Plateforme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prospects table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Nom</th>
                  <th className="text-left p-4 font-medium">Plateforme</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Dernier message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prospect) => (
                  <tr key={prospect.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">
                      {prospect.profile_url ? (
                        <a href={prospect.profile_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand">{prospect.name}</a>
                      ) : prospect.name}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="gap-1">
                        {prospect.platform === "linkedin" ? <Linkedin className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                        {prospect.platform || "—"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Select value={prospect.status} onValueChange={(v) => handleStatusChange(prospect.id, v)}>
                        <SelectTrigger className="w-[140px] h-8">
                          <Badge variant="outline" className={statusColors[prospect.status]}>
                            {statusLabels[prospect.status] || prospect.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {prospect.last_message_at
                        ? formatDistanceToNow(new Date(prospect.last_message_at), { addSuffix: true, locale: fr })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucun prospect</p>
              <p className="text-sm">Ajoutez votre premier prospect pour commencer.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
