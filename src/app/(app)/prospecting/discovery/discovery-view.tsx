"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  MessageSquare,
  Loader2,
  UserPlus,
  Check,
  ExternalLink,
  Building2,
  Navigation,
} from "lucide-react";
import {
  searchGoogleMapsLeads,
  importGoogleMapsLead,
} from "@/lib/actions/prospecting";

// ─── Types ──────────────────────────────────────────────────────────

interface GoogleMapsLead {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  googleMapsUrl?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  source: "google_maps";
}

// ─── Component ──────────────────────────────────────────────────────

export function DiscoveryView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [results, setResults] = useState<GoogleMapsLead[]>([]);
  const [importedNames, setImportedNames] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);

  function handleSearch() {
    if (!searchTerm.trim() || !location.trim()) {
      toast.error("Veuillez remplir les champs recherche et localisation.");
      return;
    }

    startSearch(async () => {
      try {
        const data = await searchGoogleMapsLeads({
          searchTerm: searchTerm.trim(),
          location: location.trim(),
          maxResults: parseInt(maxResults, 10),
        });
        setResults(data);
        setImportedNames(new Set());
        if (data.length === 0) {
          toast.info("Aucun résultat trouvé pour cette recherche.");
        } else {
          toast.success(`${data.length} entreprise(s) trouvée(s).`);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erreur lors de la recherche Google Maps."
        );
      }
    });
  }

  async function handleImport(lead: GoogleMapsLead) {
    const key = lead.name + lead.address;
    setImportingId(key);
    try {
      await importGoogleMapsLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        address: lead.address,
        category: lead.category,
        googleMapsUrl: lead.googleMapsUrl,
        platform: "google_maps",
      });
      setImportedNames((prev) => new Set(prev).add(key));
      toast.success(`${lead.name} importé comme prospect.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'import."
      );
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Découverte de Leads"
        description="Recherchez des entreprises sur Google Maps pour trouver de nouveaux prospects B2B"
      />

      {/* Search Form */}
      <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Recherche
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Ex: agence immobilière, restaurant, coach..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Localisation
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Ex: Paris, France"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="w-full space-y-2 md:w-40">
              <Label htmlFor="max" className="text-sm font-medium">
                Résultats
              </Label>
              <Select value={maxResults} onValueChange={setMaxResults}>
                <SelectTrigger id="max">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-10 gap-2 bg-[#7af17a] text-black hover:bg-[#5ad15a]"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </h2>
            <Badge variant="outline" className="gap-1.5 border-[#7af17a]/30 text-[#7af17a]">
              <Navigation className="h-3 w-3" />
              Google Maps
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((lead, i) => {
              const key = lead.name + lead.address;
              const isImported = importedNames.has(key);
              const isImporting = importingId === key;

              return (
                <Card
                  key={i}
                  className="group rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-border/60"
                >
                  <CardContent className="pt-5 pb-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight truncate">
                          {lead.name}
                        </h3>
                        {lead.category && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {lead.category}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-[#7af17a]/30 bg-[#7af17a]/10 text-[#7af17a] text-[10px]"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        Maps
                      </Badge>
                    </div>

                    {/* Rating */}
                    {lead.rating != null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{lead.rating}</span>
                        {lead.reviewCount != null && (
                          <span className="text-muted-foreground">
                            ({lead.reviewCount} avis)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Info rows */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {lead.address && (
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">{lead.address}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a
                            href={`tel:${lead.phone}`}
                            className="hover:text-foreground transition-colors"
                          >
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="truncate hover:text-foreground transition-colors"
                          >
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:text-foreground transition-colors"
                          >
                            {lead.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Social links */}
                    {(lead.socialLinks?.facebook ||
                      lead.socialLinks?.instagram ||
                      lead.socialLinks?.linkedin) && (
                      <div className="flex items-center gap-2 pt-1">
                        {lead.socialLinks.facebook && (
                          <a
                            href={lead.socialLinks.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Facebook"
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {lead.socialLinks.instagram && (
                          <a
                            href={lead.socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Instagram"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {lead.socialLinks.linkedin && (
                          <a
                            href={lead.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="LinkedIn"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      <Button
                        size="sm"
                        variant={isImported ? "outline" : "default"}
                        className={
                          isImported
                            ? "flex-1 gap-1.5 text-[#7af17a] border-[#7af17a]/30"
                            : "flex-1 gap-1.5 bg-[#7af17a] text-black hover:bg-[#5ad15a]"
                        }
                        disabled={isImported || isImporting}
                        onClick={() => handleImport(lead)}
                      >
                        {isImporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isImported ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        {isImported ? "Importé" : "Importer"}
                      </Button>
                      {lead.googleMapsUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          asChild
                        >
                          <a
                            href={lead.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Maps
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && (
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-2xl bg-[#7af17a]/10 p-4">
              <Navigation className="h-10 w-10 text-[#7af17a]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Découvrez de nouveaux prospects
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Recherchez des entreprises sur Google Maps pour trouver de nouveaux
              prospects B2B. Saisissez un type d'activité et une localisation pour
              commencer.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isSearching && (
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#7af17a]" />
            <h3 className="text-lg font-semibold mb-2">
              Recherche en cours...
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Analyse des entreprises sur Google Maps. Cela peut prendre quelques
              instants.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
