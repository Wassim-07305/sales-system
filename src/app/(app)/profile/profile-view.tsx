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
import {
  Loader2,
  Save,
  Camera,
  User,
  Building2,
  Phone,
  Target,
  Briefcase,
} from "lucide-react";
import { updateProfile, updateAvatarUrl } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const roleLabels: Record<string, string> = {
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
  setter: "Setter",
  closer: "Closer",
  manager: "Manager",
  admin: "Admin",
};

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

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrl(publicUrl);
      if (result.error) throw new Error(result.error);

      setAvatarUrl(publicUrl);
      toast.success("Photo de profil mise à jour !");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'upload",
      );
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

  const initials = (() => {
    const parts = (fullName || "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0]?.charAt(0)?.toUpperCase() || "?";
  })();

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles"
      />

      {/* Avatar & Identity Card */}
      <Card className="rounded-2xl shadow-sm border-border/60 mb-6 overflow-hidden">
        {/* Gradient header strip */}
        <div className="h-24 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-zinc-950 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16, 185, 129,0.15)_0%,_transparent_60%)]" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        </div>
        <CardContent className="px-6 pb-6 -mt-10 relative z-10">
          <div className="flex items-end gap-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-24 w-24 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center text-emerald-500 text-3xl font-bold border-4 border-white shadow-md">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black hover:bg-emerald-400 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-muted-foreground/60">
                Max 5 Mo
              </p>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-black">
                {fullName || "Votre nom"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <Badge
                variant="outline"
                className="mt-2 text-xs px-3 py-0.5 rounded-lg border-emerald-500/30 bg-emerald-500/5 text-black font-medium"
              >
                {roleLabels[profile.role] || profile.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="rounded-2xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-black flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10">
              <User className="h-4 w-4 text-emerald-500" />
            </div>
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Nom complet
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 rounded-xl border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                T&eacute;l&eacute;phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="h-11 rounded-xl border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Entreprise
              </Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11 rounded-xl border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Niche
              </Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="h-11 rounded-xl border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              Objectifs
            </Label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Décrivez vos objectifs..."
              rows={3}
              className="rounded-xl border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl h-11 px-6 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer les modifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
