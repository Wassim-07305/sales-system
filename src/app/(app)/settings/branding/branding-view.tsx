"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Palette, User, Save, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { saveBrandingSettings } from "@/lib/actions/settings";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  niche: string | null;
}

interface Props {
  profile: Profile | null;
  initialPalette?: string;
}

const COLOR_PALETTES = [
  {
    id: "default",
    name: "Sales System",
    primary: "#7af17a",
    secondary: "#14080e",
    accent: "#22c55e",
  },
  {
    id: "ocean",
    name: "Océan",
    primary: "#3b82f6",
    secondary: "#0f172a",
    accent: "#06b6d4",
  },
  {
    id: "sunset",
    name: "Coucher de soleil",
    primary: "#f97316",
    secondary: "#1c1917",
    accent: "#ef4444",
  },
  {
    id: "purple",
    name: "Améthyste",
    primary: "#a855f7",
    secondary: "#1e1b4b",
    accent: "#6366f1",
  },
  {
    id: "gold",
    name: "Premium Gold",
    primary: "#eab308",
    secondary: "#1c1917",
    accent: "#f59e0b",
  },
  {
    id: "rose",
    name: "Rose",
    primary: "#ec4899",
    secondary: "#1a0a14",
    accent: "#f43f5e",
  },
];

export function BrandingView({ profile, initialPalette = "default" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [selectedPalette, setSelectedPalette] = useState(initialPalette);

  function handleSave() {
    startTransition(async () => {
      const result = await saveBrandingSettings({
        full_name: displayName,
        bio,
        avatar_url: avatarUrl,
        color_palette: selectedPalette,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding mis à jour avec succès !");
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Branding Personnel"
        description="Personnalisez votre identité visuelle"
      >
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </Link>
      </PageHeader>

      {/* Profile branding */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <User className="h-4 w-4 text-brand" />
            </div>
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center text-brand text-xl font-bold">
              {displayName?.charAt(0) || "?"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {displayName || "Votre nom"}
              </p>
              <p className="text-xs text-muted-foreground">
                {bio || "Votre tagline"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nom d&apos;affichage</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom complet"
            />
          </div>

          <div className="space-y-2">
            <Label>Bio / Tagline</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Expert en closing B2B..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>URL de l&apos;avatar</Label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Color scheme */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
              <Palette className="h-4 w-4 text-purple-500" />
            </div>
            Palette de couleurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choisissez un thème qui vous représente
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette.id)}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all text-left hover:shadow-sm",
                  selectedPalette === palette.id
                    ? "border-brand ring-2 ring-brand/20"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                {selectedPalette === palette.id && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                    <Check className="h-3 w-3 text-brand-dark" />
                  </div>
                )}
                <div className="flex gap-1.5 mb-2">
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: palette.secondary }}
                  />
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: palette.accent }}
                  />
                </div>
                <p className="text-sm font-medium">{palette.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-brand text-brand-dark hover:bg-brand/90"
      >
        <Save className="h-4 w-4 mr-2" />
        {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </div>
  );
}
