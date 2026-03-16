"use client";

import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Play,
  Loader2,
  Volume2,
  Wand2,
} from "lucide-react";
import {
  createOrUpdateVoiceProfile,
  cloneVoice,
  generateVoiceMessage,
  deleteVoiceProfile,
} from "@/lib/actions/voice";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface VoiceProfile {
  id: string;
  voice_id: string | null;
  sample_url: string | null;
  status: string;
}

interface VoiceMessage {
  id: string;
  input_text: string | null;
  audio_url?: string | null;
  status: string;
  scheduled_send_at: string | null;
  sent: boolean;
  prospect: { id: string; name: string } | null;
  created_at: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "En attente",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: "Clonage en cours",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  ready: {
    label: "Prêt",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Erreur",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  error: {
    label: "Erreur",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function VoiceSettings({
  voiceProfile,
  voiceMessages,
}: {
  voiceProfile: VoiceProfile | null;
  voiceMessages: VoiceMessage[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testText, setTestText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast.error("Veuillez sélectionner un fichier audio");
      return;
    }

    // Validate minimum size (~30s audio is typically > 100KB)
    if (file.size < 50_000) {
      toast.error(
        "L'échantillon est trop court. Minimum 30 secondes recommandé.",
      );
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `voice-samples/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploads").getPublicUrl(fileName);
      await createOrUpdateVoiceProfile(publicUrl);
      toast.success("Echantillon vocal uploade avec succes !");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleCloneVoice() {
    if (!voiceProfile?.sample_url) {
      toast.error("Veuillez d'abord uploader un echantillon audio");
      return;
    }

    setCloning(true);
    try {
      const result = await cloneVoice(voiceProfile.sample_url);
      if (result.success) {
        toast.success("Voix clonée avec succès !");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors du clonage");
      }
    } catch {
      toast.error("Erreur lors du clonage vocal");
    } finally {
      setCloning(false);
    }
  }

  async function handleTestVoice() {
    if (!testText.trim()) {
      toast.error("Veuillez saisir un texte a synthetiser");
      return;
    }

    setGenerating(true);
    setGeneratedAudioUrl(null);
    try {
      const result = await generateVoiceMessage(testText);
      if (result.success) {
        if ("audioUrl" in result && result.audioUrl) {
          setGeneratedAudioUrl(result.audioUrl);
          toast.success("Audio généré !");
        }
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur lors de la generation vocale");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteVoice() {
    if (
      !confirm(
        "Etes-vous sur de vouloir supprimer votre profil vocal ? Cette action est irreversible.",
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteVoiceProfile();
      if (result.success) {
        toast.success("Profil vocal supprime");
        setGeneratedAudioUrl(null);
        setTestText("");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  const status =
    statusConfig[voiceProfile?.status || "pending"] || statusConfig.pending;
  const isReady = voiceProfile?.status === "ready";
  const hasSample = !!voiceProfile?.sample_url;

  return (
    <div>
      <PageHeader
        title="Voice Cloning IA"
        description="Clonez votre voix avec ElevenLabs pour generer des messages vocaux personnalises"
      />

      {/* Voice Profile & Upload */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <Mic className="h-4 w-4 text-brand" />
            </div>
            Profil vocal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="h-12 w-12 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                <Mic className="h-6 w-6 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Echantillon audio</h3>
                <p className="text-sm text-muted-foreground">
                  {hasSample
                    ? isReady
                      ? "Voix clonee et prete a l'emploi"
                      : voiceProfile?.status === "processing"
                        ? "Clonage en cours, veuillez patienter..."
                        : "Echantillon uploade. Lancez le clonage ci-dessous."
                    : "Aucun echantillon (minimum 30 secondes recommande)"}
                </p>
              </div>
              <Badge variant="outline" className={`gap-1 ${status.color}`}>
                {status.icon}
                {status.label}
              </Badge>
            </div>

            {/* Audio player for existing sample */}
            {hasSample && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Votre echantillon :
                </p>
                <audio controls className="w-full">
                  <source src={voiceProfile!.sample_url!} />
                </audio>
              </div>
            )}

            {/* Upload button */}
            <input
              type="file"
              accept="audio/*"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || cloning}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading
                ? "Upload en cours..."
                : hasSample
                  ? "Remplacer l'echantillon"
                  : "Uploader un echantillon audio"}
            </Button>

            {/* Clone button */}
            {hasSample && !isReady && voiceProfile?.status !== "processing" && (
              <Button
                onClick={handleCloneVoice}
                disabled={cloning}
                className="w-full"
              >
                {cloning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                {cloning
                  ? "Clonage en cours..."
                  : "Lancer le clonage ElevenLabs"}
              </Button>
            )}

            {/* Delete button */}
            {voiceProfile && (
              <Button
                onClick={handleDeleteVoice}
                disabled={deleting}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Suppression..." : "Supprimer le profil vocal"}
              </Button>
            )}

            {/* Info box */}
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Comment ca marche</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Uploadez un echantillon audio de votre voix (minimum 30
                  secondes)
                </li>
                <li>
                  Lancez le clonage via ElevenLabs pour creer votre clone vocal
                </li>
                <li>Testez votre voix clonee avec du texte personnalise</li>
                <li>Utilisez votre voix dans les messages de prospection</li>
              </ol>
              {!isReady && (
                <p className="mt-2 text-xs italic">
                  Note : une cle API ElevenLabs (variable ELEVENLABS_API_KEY)
                  est necessaire pour le clonage et la synthese vocale.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Voice Section */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
              <Volume2 className="h-4 w-4 text-blue-500" />
            </div>
            Tester votre voix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="Saisissez le texte a synthetiser... (ex: Bonjour {nom}, je vous contacte suite a notre echange.)"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisez {"{nom}"} pour inserer le nom du prospect dans le
                message.
              </p>
            </div>

            <Button
              onClick={handleTestVoice}
              disabled={generating || !testText.trim()}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {generating ? "Generation en cours..." : "Generer et ecouter"}
            </Button>

            {/* Generated audio player */}
            {generatedAudioUrl && (
              <div className="space-y-2 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Audio genere
                </p>
                <audio ref={audioRef} controls className="w-full" autoPlay>
                  <source src={generatedAudioUrl} type="audio/mpeg" />
                </audio>
              </div>
            )}

            {!isReady && !generating && (
              <p className="text-sm text-muted-foreground text-center">
                {hasSample
                  ? "Lancez d'abord le clonage de votre voix pour utiliser cette fonctionnalite."
                  : "Uploadez un echantillon et clonez votre voix pour tester la synthese."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Messages */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Mes vocaux programmes</CardTitle>
        </CardHeader>
        <CardContent>
          {voiceMessages.length > 0 ? (
            <div className="space-y-3">
              {voiceMessages.map((vm) => {
                const vmStatus =
                  statusConfig[vm.status] || statusConfig.pending;
                return (
                  <div
                    key={vm.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {vm.input_text || "\u2014"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {vm.prospect && <span>Pour: {vm.prospect.name}</span>}
                        {vm.scheduled_send_at && (
                          <span>
                            Programme:{" "}
                            {new Date(vm.scheduled_send_at).toLocaleString(
                              "fr-FR",
                            )}
                          </span>
                        )}
                      </div>
                      {vm.audio_url && (
                        <audio controls className="w-full mt-2 h-8">
                          <source src={vm.audio_url} type="audio/mpeg" />
                        </audio>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`gap-1 ml-3 shrink-0 ${vmStatus.color}`}
                    >
                      {vmStatus.icon}
                      {vmStatus.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Mic className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">Aucun vocal programme</p>
              <p className="text-sm">
                Utilisez le bouton de test ci-dessus ou l&apos;IA dans
                l&apos;inbox pour generer des vocaux.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
