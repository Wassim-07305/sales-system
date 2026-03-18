"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTestimonialStatus } from "@/lib/actions/nps";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Search,
  Users,
  Star,
  ThumbsUp,
  Eye,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  niche: string | null;
  health_score: number;
  onboarding_completed: boolean;
  created_at: string;
  role: string;
}

interface Testimonial {
  id: string;
  content: string | null;
  video_url: string | null;
  status: string;
  created_at: string;
  client: { full_name: string | null; email: string } | null;
}

interface Props {
  clients: Client[];
  testimonials: Testimonial[];
}

export function CustomersView({ clients, testimonials }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const atRisk = useMemo(
    () => clients.filter((c) => c.health_score < 40),
    [clients],
  );
  const healthy = useMemo(
    () => clients.filter((c) => c.health_score >= 70),
    [clients],
  );
  const moderate = useMemo(
    () => clients.filter((c) => c.health_score >= 40 && c.health_score < 70),
    [clients],
  );

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        const matchSearch =
          (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          (c.niche || "").toLowerCase().includes(search.toLowerCase());

        if (filter === "at_risk") return matchSearch && c.health_score < 40;
        if (filter === "moderate")
          return matchSearch && c.health_score >= 40 && c.health_score < 70;
        if (filter === "healthy") return matchSearch && c.health_score >= 70;
        return matchSearch;
      }),
    [clients, search, filter],
  );

  function getScoreColor(score: number) {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-orange-400";
    return "text-red-500";
  }

  function getScoreBarColor(score: number) {
    if (score >= 70) return "[&>div]:bg-green-500";
    if (score >= 40) return "[&>div]:bg-orange-400";
    return "[&>div]:bg-red-500";
  }

  async function handleTestimonialAction(
    id: string,
    status: "approved" | "published" | "rejected",
  ) {
    try {
      await updateTestimonialStatus(id, status);
      toast.success(
        status === "published"
          ? "Témoignage publié"
          : status === "approved"
            ? "Témoignage approuvé"
            : "Témoignage rejeté",
      );
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  return (
    <div>
      <PageHeader
        title="Customer Success"
        description="Suivi de la santé et de l'engagement de vos clients"
      />

      <Tabs defaultValue="clients">
        <TabsList className="mb-6">
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-2" />
            Clients ({clients.length})
          </TabsTrigger>
          <TabsTrigger value="testimonials">
            <Star className="h-4 w-4 mr-2" />
            Témoignages ({testimonials.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{healthy.length}</p>
                  <p className="text-xs text-muted-foreground">Clients sains</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center ring-1 ring-orange-500/20">
                  <TrendingDown className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{moderate.length}</p>
                  <p className="text-xs text-muted-foreground">À surveiller</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{atRisk.length}</p>
                  <p className="text-xs text-muted-foreground">À risque</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="healthy">Sains (≥70)</SelectItem>
                <SelectItem value="moderate">Modéré (40-69)</SelectItem>
                <SelectItem value="at_risk">À risque (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client list */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                        {client.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {client.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.niche || client.company || client.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress
                          value={client.health_score}
                          className={`h-2 ${getScoreBarColor(client.health_score)}`}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold w-8 ${getScoreColor(client.health_score)}`}
                      >
                        {client.health_score}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(client.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucun client trouvé</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials">
          <div className="space-y-4">
            {testimonials.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">
                        {t.client?.full_name || "Client"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.client?.email}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        t.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : t.status === "approved"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            : "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {t.status === "published"
                        ? "Publié"
                        : t.status === "approved"
                          ? "Approuvé"
                          : "En attente"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.content}
                  </p>
                  <div className="flex gap-2">
                    {t.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTestimonialAction(t.id, "approved")
                        }
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" /> Approuver
                      </Button>
                    )}
                    {(t.status === "pending" || t.status === "approved") && (
                      <Button
                        size="sm"
                        className="bg-brand text-brand-dark hover:bg-brand/90"
                        onClick={() =>
                          handleTestimonialAction(t.id, "published")
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" /> Publier
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTestimonialAction(t.id, "rejected")}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {testimonials.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Star className="h-7 w-7 opacity-50" />
                  </div>
                  <p className="font-medium">Aucun témoignage</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Client detail panel */}
      <Sheet
        open={!!selectedClient}
        onOpenChange={() => setSelectedClient(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedClient.full_name || "Client"}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold mx-auto mb-3">
                    {selectedClient.full_name?.charAt(0) || "?"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient.email}
                  </p>
                  {selectedClient.company && (
                    <p className="text-sm">{selectedClient.company}</p>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Health Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Progress
                        value={selectedClient.health_score}
                        className={`h-4 flex-1 ${getScoreBarColor(selectedClient.health_score)}`}
                      />
                      <span
                        className={`text-2xl font-bold ${getScoreColor(selectedClient.health_score)}`}
                      >
                        {selectedClient.health_score}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Niche</span>
                      <span>{selectedClient.niche || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rôle</span>
                      <span className="capitalize">
                        {selectedClient.role.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Onboarding</span>
                      <Badge
                        variant="outline"
                        className={
                          selectedClient.onboarding_completed
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        }
                      >
                        {selectedClient.onboarding_completed
                          ? "Complété"
                          : "En cours"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Membre depuis
                      </span>
                      <span>
                        {formatDistanceToNow(
                          new Date(selectedClient.created_at),
                          { addSuffix: true, locale: fr },
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
