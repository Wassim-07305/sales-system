"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateProfile } from "@/lib/actions/settings";
import type { Profile } from "@/lib/types/database";

export function ProfileView({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [company, setCompany] = useState(profile.company || "");
  const [niche, setNiche] = useState(profile.niche || "");
  const [goals, setGoals] = useState(profile.goals || "");
  const [isSaving, startSaving] = useTransition();

  function handleSave() {
    startSaving(async () => {
      const result = await updateProfile({
        full_name: fullName,
        phone,
        company,
        niche,
        goals,
      });
      if (result.error) {
        toast.error("Erreur lors de la sauvegarde");
      } else {
        toast.success("Profil mis à jour !");
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Mon profil" description="Gérez vos informations" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold">
              {fullName.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold">{fullName || "Votre nom"}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {profile.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Niche</Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Objectifs</Label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Décrivez vos objectifs..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
