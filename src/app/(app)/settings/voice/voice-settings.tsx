"use client";

import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Upload, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { createOrUpdateVoiceProfile } from "@/lib/actions/voice";
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
  status: string;
  scheduled_send_at: string | null;
  sent: boolean;
  prospect: { id: string; name: string } | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
  processing: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: <Clock className="h-3 w-3" /> },
  ready: { label: "Prêt", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
};

export function VoiceSettings({ voiceProfile, voiceMessages }: { voiceProfile: VoiceProfile | null; voiceMessages: VoiceMessage[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `voice-samples/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(fileName);
      await createOrUpdateVoiceProfile(publicUrl);
      toast.success("Échantillon vocal uploadé !");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  const status = statusConfig[voiceProfile?.status || "pending"] || statusConfig.pending;

  return (
    <div>
      <PageHeader title="Voice Cloning IA" description="Configuration du profil vocal" />

      {/* Voice Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Profil vocal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Échantillon audio</h3>
                <p className="text-sm text-muted-foreground">
                  {voiceProfile?.sample_url ? "Échantillon uploadé" : "Aucun échantillon (minimum 30 secondes)"}
                </p>
              </div>
              <Badge variant="outline" className={`gap-1 ${status.color}`}>
                {status.icon}
                {status.label}
              </Badge>
            </div>

            {voiceProfile?.sample_url && (
              <audio controls className="w-full">
                <source src={voiceProfile.sample_url} />
              </audio>
            )}

            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Upload en cours..." : voiceProfile?.sample_url ? "Remplacer l'échantillon" : "Uploader un échantillon audio"}
            </Button>

            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Note</p>
              <p>L&apos;intégration ElevenLabs sera activée prochainement. Pour l&apos;instant, uploadez votre échantillon vocal pour préparer la configuration.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Mes vocaux programmés</CardTitle>
        </CardHeader>
        <CardContent>
          {voiceMessages.length > 0 ? (
            <div className="space-y-3">
              {voiceMessages.map((vm) => {
                const vmStatus = statusConfig[vm.status] || statusConfig.pending;
                return (
                  <div key={vm.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{vm.input_text || "—"}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {vm.prospect && <span>Pour: {vm.prospect.name}</span>}
                        {vm.scheduled_send_at && (
                          <span>Programmé: {new Date(vm.scheduled_send_at).toLocaleString("fr-FR")}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`gap-1 ${vmStatus.color}`}>
                      {vmStatus.icon}
                      {vmStatus.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucun vocal programmé</p>
              <p className="text-sm">Utilisez le bouton IA dans l&apos;inbox pour programmer des vocaux.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
