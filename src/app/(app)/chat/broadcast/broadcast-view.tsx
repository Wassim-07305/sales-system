"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Send, Users, Clock, Mail } from "lucide-react";
import { sendBroadcast } from "@/lib/actions/communication";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface Broadcast {
  id: string;
  sender_id: string;
  target_roles: string[];
  target_audience: string;
  subject: string | null;
  content: string;
  sent_count: number;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "setter", label: "Setter" },
  { value: "closer", label: "Closer" },
  { value: "client_b2b", label: "Client B2B" },
  { value: "client_b2c", label: "Client B2C" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
];

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-foreground/10 text-foreground border-foreground/20";
    case "manager":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "setter":
      return "bg-muted/60 text-muted-foreground border-border/50";
    case "closer":
      return "bg-muted/60 text-muted-foreground border-border/50";
    case "client_b2b":
      return "bg-muted/40 text-muted-foreground/80 border-border/30";
    case "client_b2c":
      return "bg-muted/40 text-muted-foreground/80 border-border/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function BroadcastView({ broadcasts }: { broadcasts: Broadcast[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function handleSend() {
    if (!content.trim()) {
      toast.error("Le contenu du message est requis");
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error("Sélectionnez au moins un rôle cible");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendBroadcast({
          targetRoles: selectedRoles,
          targetAudience: audience,
          subject,
          content,
        });
        toast.success(`Message diffusé à ${result.sentCount} utilisateur(s)`);
        setSelectedRoles([]);
        setAudience("all");
        setSubject("");
        setContent("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'envoi de la diffusion");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Diffusion"
        description="Envoyez des messages à des groupes ciblés"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Megaphone className="h-4 w-4" />
          <span>{broadcasts.length} diffusion(s)</span>
        </div>
      </PageHeader>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* Compose Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-emerald-500" />
              Nouveau message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Role checkboxes */}
            <div>
              <Label className="mb-2 block">Rôles ciblés</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => toggleRole(role.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedRoles.includes(role.value)
                        ? "bg-emerald-500 text-black border-emerald-500"
                        : "bg-muted border-transparent hover:border-border"
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <Label className="mb-2 block">Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <Label className="mb-2 block">Sujet</Label>
              <Input
                placeholder="Objet du message..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Content */}
            <div>
              <Label className="mb-2 block">Contenu</Label>
              <Textarea
                placeholder="Rédigez votre message de diffusion..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
            </div>

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={isPending}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              {isPending ? "Envoi en cours..." : "Envoyer la diffusion"}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Historique des diffusions
          </h2>

          {broadcasts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucune diffusion envoyée</p>
                <p className="text-sm mt-1">
                  Composez votre premier message ci-contre
                </p>
              </CardContent>
            </Card>
          ) : (
            broadcasts.map((broadcast) => (
              <Card key={broadcast.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {broadcast.subject && (
                        <h3 className="font-semibold text-sm">
                          {broadcast.subject}
                        </h3>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(
                          new Date(broadcast.created_at),
                          "d MMMM yyyy 'à' HH:mm",
                          { locale: fr },
                        )}
                        {" — "}
                        {formatDistanceToNow(new Date(broadcast.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <Users className="h-3 w-3 mr-1" />
                      {broadcast.sent_count}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {broadcast.content}
                  </p>

                  <Separator className="my-3" />

                  <div className="flex flex-wrap gap-1.5">
                    {broadcast.target_roles.map((role) => (
                      <span
                        key={role}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getRoleBadgeColor(role)}`}
                      >
                        {role}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                      {broadcast.target_audience === "all"
                        ? "Tous"
                        : broadcast.target_audience.toUpperCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
