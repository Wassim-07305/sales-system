"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Linkedin, Instagram, RefreshCw, Save, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSettingsIA, triggerManualSync } from "@/lib/actions/settings-ia";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SettingsIAViewProps {
  initialSettings: {
    linkedin_url: string;
    instagram_username: string;
    sync_frequency: string;
    business_description: string;
    offer: string;
  };
  lastSync: string | null;
}

export function SettingsIAView({ initialSettings, lastSync }: SettingsIAViewProps) {
  const [linkedinUrl, setLinkedinUrl] = useState(initialSettings.linkedin_url);
  const [instagramUsername, setInstagramUsername] = useState(
    initialSettings.instagram_username
  );
  const [syncFrequency, setSyncFrequency] = useState(
    initialSettings.sync_frequency
  );
  const [businessDescription, setBusinessDescription] = useState(
    initialSettings.business_description
  );
  const [offer, setOffer] = useState(initialSettings.offer);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(lastSync);
  const [isSaving, startSaving] = useTransition();
  const [isSyncing, startSyncing] = useTransition();

  const handleSave = () => {
    startSaving(async () => {
      const result = await saveSettingsIA({
        linkedin_url: linkedinUrl,
        instagram_username: instagramUsername,
        sync_frequency: syncFrequency,
        business_description: businessDescription,
        offer,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Paramètres sauvegardés");
      }
    });
  };

  const handleSync = () => {
    startSyncing(async () => {
      const result = await triggerManualSync();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setLastSyncTime(result.syncedAt ?? null);
        toast.success("Synchronisation déclenchée");
      }
    });
  };

  const lastSyncLabel = lastSyncTime
    ? formatDistanceToNow(new Date(lastSyncTime), {
        addSuffix: true,
        locale: fr,
      })
    : "Jamais synchronisé";

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Settings IA"
        description="Configurez vos intégrations pour la génération de scripts et la synchronisation"
      >
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compte LinkedIn */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Linkedin className="h-4 w-4 text-blue-400" />
              Compte LinkedIn
            </CardTitle>
            <CardDescription>
              Utilisé pour personnaliser vos scripts de prospection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="linkedin-url">URL de votre profil LinkedIn</Label>
              <Input
                id="linkedin-url"
                placeholder="https://linkedin.com/in/votre-profil"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compte Instagram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Instagram className="h-4 w-4 text-pink-400" />
              Compte Instagram
            </CardTitle>
            <CardDescription>
              Connectez votre compte Instagram pour enrichir vos scripts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="instagram-username">Nom d&apos;utilisateur Instagram</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="instagram-username"
                  className="rounded-l-none"
                  placeholder="votre_compte"
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description de l'offre */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Description de votre offre</CardTitle>
            <CardDescription>
              Ces informations permettent à l&apos;IA de personnaliser vos scripts de prospection
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="business-description">Description du business</Label>
              <Textarea
                id="business-description"
                placeholder="Décrivez ce que vous faites, votre secteur d'activité, votre mission..."
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer">Votre offre principale</Label>
              <Textarea
                id="offer"
                placeholder="Décrivez votre produit ou service principal, sa valeur ajoutée..."
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Synchronisation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-[#7af17a]" />
              Synchronisation automatique
            </CardTitle>
            <CardDescription>
              Fréquence de mise à jour automatique de vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sync-frequency">Fréquence</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger id="sync-frequency" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Dernière sync : {lastSyncLabel}</span>
            </div>

            <div className="pt-5">
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")}
                />
                {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

