"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyToListing } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Store,
  Search,
  Building2,
  Tag,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react";

interface MarketplaceListing {
  id: string;
  entrepreneur_id: string;
  title: string;
  description: string | null;
  niche: string | null;
  commission_type: string | null;
  commission_value: number | null;
  requirements: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  entrepreneur?: { id: string; full_name: string | null; company: string | null } | null;
}

interface Application {
  id: string;
  listing_id: string;
  setter_id: string;
  status: string;
  message: string | null;
  created_at: string;
  listing?: { id: string; title: string } | null;
}

interface Props {
  listings: MarketplaceListing[];
  myApplications: Application[];
}

const appStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

const appStatusLabels: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const appStatusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
};

export function MarketplaceView({ listings, myApplications }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [message, setMessage] = useState("");

  // Build niche list from listings
  const niches = Array.from(
    new Set(listings.map((l) => l.niche).filter(Boolean))
  ) as string[];

  // Map of listing IDs to applications
  const applicationMap = new Map(
    myApplications.map((app) => [app.listing_id, app])
  );

  const filtered = listings.filter((l) => {
    const matchSearch =
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.entrepreneur?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.entrepreneur?.company || "").toLowerCase().includes(search.toLowerCase());

    const matchNiche = nicheFilter === "all" || l.niche === nicheFilter;

    return matchSearch && matchNiche;
  });

  function openApplyDialog(listing: MarketplaceListing) {
    setSelectedListing(listing);
    setMessage("");
    setApplyDialogOpen(true);
  }

  function handleApply() {
    if (!selectedListing || !message.trim()) {
      toast.error("Veuillez écrire un message de candidature");
      return;
    }

    startTransition(async () => {
      try {
        await applyToListing(selectedListing.id, message.trim());
        toast.success("Candidature envoyée avec succès");
        setApplyDialogOpen(false);
        setSelectedListing(null);
        setMessage("");
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'envoi";
        toast.error(message);
      }
    });
  }

  function formatCommission(listing: MarketplaceListing) {
    if (!listing.commission_value) return null;
    if (listing.commission_type === "percentage") {
      return `${listing.commission_value}%`;
    }
    return `${listing.commission_value.toLocaleString("fr-FR")} \u20AC`;
  }

  function formatRequirements(requirements: Record<string, unknown>) {
    if (!requirements || Object.keys(requirements).length === 0) return null;
    const entries = Object.entries(requirements);
    return entries
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(", ");
  }

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Trouvez des opportunités de placement"
      />

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une offre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par niche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les niches</SelectItem>
            {niches.map((niche) => (
              <SelectItem key={niche} value={niche}>
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Listings grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((listing) => {
          const existingApp = applicationMap.get(listing.id);
          const commission = formatCommission(listing);
          const requirements = formatRequirements(listing.requirements);
          const StatusIcon = existingApp ? appStatusIcons[existingApp.status] || Clock : null;

          return (
            <Card key={listing.id} className="flex flex-col border-border/50 hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">
                    {listing.title}
                  </CardTitle>
                  {listing.niche && (
                    <Badge variant="outline" className="bg-brand/10 text-brand shrink-0 ml-2">
                      <Tag className="h-3 w-3 mr-1" />
                      {listing.niche}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Entrepreneur info */}
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {listing.entrepreneur?.full_name || "Entrepreneur"}
                    {listing.entrepreneur?.company && (
                      <span className="text-muted-foreground">
                        {" "}({listing.entrepreneur.company})
                      </span>
                    )}
                  </span>
                </div>

                {/* Description */}
                {listing.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {listing.description}
                  </p>
                )}

                {/* Commission */}
                {commission && (
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-brand" />
                    <span className="text-sm font-medium">
                      Commission : {commission}
                      {listing.commission_type === "percentage" ? " par vente" : " fixe"}
                    </span>
                  </div>
                )}

                {/* Requirements summary */}
                {requirements && (
                  <p className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded">
                    {requirements}
                  </p>
                )}

                {/* Action / Status */}
                <div className="mt-auto pt-3">
                  {existingApp ? (
                    <div className="flex items-center gap-2">
                      {StatusIcon && (
                        <StatusIcon className="h-4 w-4" />
                      )}
                      <Badge
                        variant="outline"
                        className={appStatusColors[existingApp.status] || ""}
                      >
                        {appStatusLabels[existingApp.status] || existingApp.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Candidature envoyée
                      </span>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                      onClick={() => openApplyDialog(listing)}
                      disabled={isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Postuler
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Store className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-medium">Aucune offre trouvée</p>
            <p className="text-sm mt-1">Essayez de modifier vos filtres de recherche</p>
          </CardContent>
        </Card>
      )}

      {/* Apply dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Postuler : {selectedListing?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedListing?.entrepreneur && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {selectedListing.entrepreneur.full_name}
                {selectedListing.entrepreneur.company && ` (${selectedListing.entrepreneur.company})`}
              </div>
            )}
            <div className="space-y-2">
              <Label>Votre message de candidature</Label>
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous êtes le bon setter pour cette mission..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
            <Button
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              onClick={handleApply}
              disabled={isPending || !message.trim()}
            >
              {isPending ? "Envoi en cours..." : "Envoyer ma candidature"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
