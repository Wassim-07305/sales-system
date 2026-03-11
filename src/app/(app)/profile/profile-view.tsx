"use client";

import { useState, useTransition, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Camera } from "lucide-react";
import { updateProfile, updateAvatarUrl } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function ProfileView({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [company, setCompany] = useState(profile.company || "");
  const [niche, setNiche] = useState(profile.niche || "");
  const [goals, setGoals] = useState(profile.goals || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo doit faire moins de 5 Mo");
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrl(publicUrl);
      if (result.error) throw new Error(result.error);

      setAvatarUrl(publicUrl);
      toast.success("Photo de profil mise à jour !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploadingAvatar(false);
    }
  }

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

  const initials = fullName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Mon profil" description="Gérez vos informations" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-20 w-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center text-brand text-3xl font-bold border-2 border-border">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-brand flex items-center justify-center text-brand-dark hover:bg-brand/90 transition-colors"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
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
