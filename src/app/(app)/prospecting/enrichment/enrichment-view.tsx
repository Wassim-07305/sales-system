"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sparkles,
  Building2,
  Search,
  RefreshCw,
  Check,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  Database,
  Clock,
  TrendingUp,
  Briefcase,
  Globe,
  Target,
  Lightbulb,
  AlertTriangle,
  Linkedin,
  Twitter,
} from "lucide-react";
import {
  enrichProspect,
  enrichBatch,
  generateCompanyInsights,
} from "@/lib/actions/enrichment";

// ─── Types ──────────────────────────────────────────────────────────

interface EnrichmentData {
  secteur: string;
  taille_entreprise: string;
  poste_probable: string;
  budget_estime: string;
  meilleur_moment_contact: string;
  profil_linkedin_probable: string;
  profil_twitter_probable: string;
  site_web_probable: string;
  points_cles: string[];
  confiance: number;
  enriched_at: string;
}

interface Prospect {
  id: string;
  name: string;
  email: string;
  company: string;
  platform: string;
  profile_url: string;
  notes: string;
  status: string;
  created_at: string;
  missing_count: number;
  enrichment: EnrichmentData | null;
}

interface CompanyInsights {
  nom: string;
  secteur: string;
  taille_estimee: string;
  description: string;
  concurrents: string[];
  defis_cles: string[];
  opportunites: string[];
  technologies_probables: string[];
  budget_potentiel: string;
  approche_recommandee: string;
  confiance: number;
}

interface Props {
  prospects: Prospect[];
}

// ─── Component ──────────────────────────────────────────────────────

export function EnrichmentView({ prospects }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [batchEnriching, setBatchEnriching] = useState(false);

  // Company insights state
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyInsights, setCompanyInsights] = useState<CompanyInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const enriched = prospects.filter((p) => p.enrichment !== null).length;
    const pending = prospects.length - enriched;
    const totalFields = prospects.length * 4; // email, company, notes, profile_url
    const filledFields = prospects.reduce(
      (acc, p) => acc + (4 - p.missing_count),
      0
    );
    const completionRate =
      totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    return { enriched, pending, completionRate };
  }, [prospects]);

  // ── Filtered prospects ──
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return prospects;
    const q = searchQuery.toLowerCase();
    return prospects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q)
    );
  }, [prospects, searchQuery]);

  // ── Handlers ──

  async function handleEnrich(prospectId: string) {
    setEnrichingId(prospectId);
    startTransition(async () => {
      try {
        await enrichProspect(prospectId);
        toast.success("Prospect enrichi avec succès");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'enrichissement");
      } finally {
        setEnrichingId(null);
      }
    });
  }

  async function handleBatchEnrich() {
    if (selectedIds.size === 0) {
      toast.error("Sélectionnez au moins un prospect");
      return;
    }
    setBatchEnriching(true);
    startTransition(async () => {
      try {
        const result = await enrichBatch(Array.from(selectedIds));
        toast.success(
          `${result.success} prospect(s) enrichi(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ""}`
        );
        setSelectedIds(new Set());
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'enrichissement en lot");
      } finally {
        setBatchEnriching(false);
      }
    });
  }

  async function handleCompanyInsights() {
    if (!companyQuery.trim()) {
      toast.error("Entrez un nom d'entreprise");
      return;
    }
    setInsightsLoading(true);
    try {
      const insights = await generateCompanyInsights(companyQuery.trim());
      setCompanyInsights(insights);
    } catch {
      toast.error("Erreur lors de la génération des insights");
    } finally {
      setInsightsLoading(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function getConfidenceBadge(confiance: number) {
    if (confiance >= 70)
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 gap-1">
          <Check className="h-3 w-3" />
          {confiance}%
        </Badge>
      );
    if (confiance >= 40)
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          {confiance}%
        </Badge>
      );
    return (
      <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 gap-1">
        <AlertTriangle className="h-3 w-3" />
        {confiance}%
      </Badge>
    );
  }

  function getMissingLabel(count: number) {
    if (count === 0) return "Complet";
    return `${count} champ${count > 1 ? "s" : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Enrichissement IA des prospects"
        description="Enrichissez automatiquement vos fiches prospects grâce à l'intelligence artificielle"
      >
        <Button
          onClick={handleBatchEnrich}
          disabled={selectedIds.size === 0 || batchEnriching}
          className="bg-brand hover:bg-brand/90 text-brand-foreground"
        >
          {batchEnriching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Enrichir la sélection ({selectedIds.size})
        </Button>
      </PageHeader>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.enriched}</p>
              <p className="text-xs text-muted-foreground">
                Prospects enrichis
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">
                En attente d&apos;enrichissement
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
              <p className="text-xs text-muted-foreground">
                Taux de complétion données
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un prospect par nom, email ou entreprise..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ── Prospect Table ── */}
      <Card className="mb-8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 p-4 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 && selectedIds.size === filtered.length
                }
                onChange={toggleSelectAll}
                className="rounded border-muted-foreground/30"
              />
            </div>
            <div className="col-span-2">Nom</div>
            <div className="col-span-2">Entreprise</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Données manquantes</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-2">Actions</div>
          </div>

          <div className="divide-y">
            {filtered.map((prospect) => {
              const isExpanded = expandedId === prospect.id;
              const isEnriching = enrichingId === prospect.id;
              const hasEnrichment = prospect.enrichment !== null;

              return (
                <div key={prospect.id}>
                  {/* Main row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 items-center hover:bg-muted/50 transition-colors">
                    {/* Checkbox */}
                    <div className="sm:col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(prospect.id)}
                        onChange={() => toggleSelection(prospect.id)}
                        className="rounded border-muted-foreground/30"
                      />
                    </div>

                    {/* Name */}
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                        {prospect.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm truncate">
                        {prospect.name}
                      </span>
                    </div>

                    {/* Company */}
                    <div className="sm:col-span-2 text-sm text-muted-foreground truncate">
                      {prospect.company || (
                        <span className="italic text-muted-foreground/50">
                          Non renseigné
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="sm:col-span-2 text-sm text-muted-foreground truncate">
                      {prospect.email || (
                        <span className="italic text-muted-foreground/50">
                          Non renseigné
                        </span>
                      )}
                    </div>

                    {/* Missing data */}
                    <div className="sm:col-span-2">
                      <Badge
                        variant="outline"
                        className={
                          prospect.missing_count === 0
                            ? "border-brand/30 text-brand"
                            : "border-amber-500/30 text-amber-500"
                        }
                      >
                        {getMissingLabel(prospect.missing_count)}
                      </Badge>
                    </div>

                    {/* Enrichment status */}
                    <div className="sm:col-span-1">
                      {hasEnrichment ? (
                        <Badge className="bg-brand/10 text-brand gap-1">
                          <Check className="h-3 w-3" />
                          Enrichi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          En attente
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-2 flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => handleEnrich(prospect.id)}
                        disabled={isEnriching}
                      >
                        {isEnriching ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : hasEnrichment ? (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {hasEnrichment ? "Régénérer" : "Enrichir"}
                      </Button>
                      {hasEnrichment && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : prospect.id)
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded enrichment panel ── */}
                  {isExpanded && prospect.enrichment && (
                    <div className="px-4 pb-4 pt-0 bg-muted/30">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Données enrichies par IA
                          </p>
                          {getConfidenceBadge(prospect.enrichment.confiance)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Secteur */}
                          <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Secteur
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.secteur}
                              </p>
                            </div>
                          </div>

                          {/* Taille entreprise */}
                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Taille entreprise
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.taille_entreprise} employés
                              </p>
                            </div>
                          </div>

                          {/* Poste probable */}
                          <div className="flex items-start gap-2">
                            <Briefcase className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Poste probable
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.poste_probable}
                              </p>
                            </div>
                          </div>

                          {/* Budget estimé */}
                          <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Budget estimé
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.budget_estime}
                              </p>
                            </div>
                          </div>

                          {/* Meilleur moment */}
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Meilleur moment de contact
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.meilleur_moment_contact}
                              </p>
                            </div>
                          </div>

                          {/* Site web */}
                          <div className="flex items-start gap-2">
                            <Globe className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Site web probable
                              </p>
                              <p className="text-sm font-medium">
                                {prospect.enrichment.site_web_probable}
                              </p>
                            </div>
                          </div>

                          {/* LinkedIn */}
                          {prospect.enrichment.profil_linkedin_probable && (
                            <div className="flex items-start gap-2">
                              <Linkedin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  LinkedIn probable
                                </p>
                                <p className="text-sm font-medium truncate">
                                  {prospect.enrichment.profil_linkedin_probable}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Twitter */}
                          {prospect.enrichment.profil_twitter_probable && (
                            <div className="flex items-start gap-2">
                              <Twitter className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Twitter/X probable
                                </p>
                                <p className="text-sm font-medium truncate">
                                  {prospect.enrichment.profil_twitter_probable}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Points clés */}
                        {prospect.enrichment.points_cles.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              Points clés pour l&apos;approche commerciale
                            </p>
                            <ul className="space-y-1">
                              {prospect.enrichment.points_cles.map(
                                (point, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm flex items-start gap-2"
                                  >
                                    <span className="text-brand mt-0.5">
                                      &bull;
                                    </span>
                                    {point}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Enriched at timestamp */}
                        {prospect.enrichment.enriched_at && (
                          <p className="text-[10px] text-muted-foreground mt-3">
                            Enrichi le{" "}
                            {new Date(
                              prospect.enrichment.enriched_at
                            ).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-7 w-7 opacity-50" />
                </div>
                Aucun prospect trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Company Insights Panel ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand" />
            Insights entreprise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom de l'entreprise..."
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCompanyInsights();
                }}
              />
            </div>
            <Button
              onClick={handleCompanyInsights}
              disabled={insightsLoading || !companyQuery.trim()}
              className="bg-brand hover:bg-brand/90 text-brand-foreground"
            >
              {insightsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analyser
            </Button>
          </div>

          {companyInsights && (
            <div className="rounded-lg border p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {companyInsights.nom}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {companyInsights.description}
                  </p>
                </div>
                {getConfidenceBadge(companyInsights.confiance)}
              </div>

              {/* Key info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-brand shrink-0" />
                  <span className="text-muted-foreground">Secteur:</span>
                  <span className="font-medium">{companyInsights.secteur}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-muted-foreground">Taille:</span>
                  <span className="font-medium">
                    {companyInsights.taille_estimee} employés
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">
                    {companyInsights.budget_potentiel}
                  </span>
                </div>
              </div>

              {/* Competitors, Challenges, Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                {/* Concurrents */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Concurrents
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {companyInsights.concurrents.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Défis */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Défis clés
                  </p>
                  <ul className="space-y-1">
                    {companyInsights.defis_cles.map((d, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunités */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Opportunités
                  </p>
                  <ul className="space-y-1">
                    {companyInsights.opportunites.map((o, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <Lightbulb className="h-3 w-3 text-brand mt-0.5 shrink-0" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Technologies */}
              {companyInsights.technologies_probables.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Technologies probables
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {companyInsights.technologies_probables.map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-brand/20 text-brand"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Approche recommandée */}
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Approche recommandée
                </p>
                <p className="text-sm bg-brand/5 rounded-lg p-3 border border-brand/10">
                  {companyInsights.approche_recommandee}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
