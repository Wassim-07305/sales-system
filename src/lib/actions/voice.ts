"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getApiKey } from "@/lib/api-keys";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// ─── Voice Profile ────────────────────────────────────────────

export async function getVoiceProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function createOrUpdateVoiceProfile(sampleUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("voice_profiles").update({ sample_url: sampleUrl, status: "pending" }).eq("id", existing.id);
  } else {
    await supabase.from("voice_profiles").insert({ user_id: user.id, sample_url: sampleUrl, status: "pending" });
  }

  revalidatePath("/settings/voice");
}

export async function deleteVoiceProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("voice_profiles")
    .select("id, voice_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Aucun profil vocal trouvé" };

  const ELEVENLABS_API_KEY = await getApiKey("ELEVENLABS_API_KEY");

  // Delete from ElevenLabs if we have a voice_id and API key
  if (profile.voice_id && ELEVENLABS_API_KEY) {
    try {
      await fetch(`${ELEVENLABS_BASE_URL}/voices/${profile.voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
    } catch {
      // Continue with local deletion even if ElevenLabs fails
    }
  }

  await supabase.from("voice_profiles").delete().eq("id", profile.id);
  revalidatePath("/settings/voice");
  return { success: true };
}

// ─── Voice Cloning (ElevenLabs) ───────────────────────────────

export async function cloneVoice(sampleUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // Ensure voice profile exists
  let profile = await getVoiceProfile();
  if (!profile) {
    await createOrUpdateVoiceProfile(sampleUrl);
    profile = await getVoiceProfile();
  }
  if (!profile) return { success: false, error: "Impossible de créer le profil" };

  const ELEVENLABS_API_KEY = await getApiKey("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    // Mock mode: mark as pending, user is informed the key is missing
    await supabase
      .from("voice_profiles")
      .update({ sample_url: sampleUrl, status: "pending" })
      .eq("id", profile.id);
    revalidatePath("/settings/voice");
    return {
      success: true,
      mock: true,
      message: "Clé API ElevenLabs non configurée. Le clonage sera effectué dès que la clé sera ajoutée.",
    };
  }

  // Update status to processing
  await supabase
    .from("voice_profiles")
    .update({ status: "processing", sample_url: sampleUrl })
    .eq("id", profile.id);
  revalidatePath("/settings/voice");

  try {
    // Download the audio sample
    const audioResponse = await fetch(sampleUrl);
    if (!audioResponse.ok) throw new Error("Impossible de télécharger l'échantillon audio");
    const audioBlob = await audioResponse.blob();

    // Call ElevenLabs voice clone API
    const formData = new FormData();
    formData.append("name", `clone-${user.id.slice(0, 8)}`);
    formData.append("description", "Voice clone created via Sales System");
    formData.append("files", audioBlob, "sample.mp3");

    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail?.message || `ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    const voiceId = data.voice_id;

    // Update profile with voice_id and ready status
    await supabase
      .from("voice_profiles")
      .update({ voice_id: voiceId, status: "ready" })
      .eq("id", profile.id);

    revalidatePath("/settings/voice");
    return { success: true, voiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await supabase
      .from("voice_profiles")
      .update({ status: "failed" })
      .eq("id", profile.id);
    revalidatePath("/settings/voice");
    return { success: false, error: message };
  }
}

// ─── Text-to-Speech (ElevenLabs) ──────────────────────────────

export async function generateVoiceMessage(text: string, prospectName?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const profile = await getVoiceProfile();

  const ELEVENLABS_API_KEY = await getApiKey("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    // Store the message request even without API key
    await supabase.from("voice_messages").insert({
      voice_profile_id: profile?.id || null,
      input_text: text,
      target_prospect_id: null,
      status: "pending",
    });
    revalidatePath("/settings/voice");
    return {
      success: true,
      mock: true,
      message: "Clé API ElevenLabs non configurée. Le message sera généré dès que la clé sera ajoutée.",
    };
  }

  if (!profile?.voice_id || profile.status !== "ready") {
    return {
      success: false,
      error: "Votre profil vocal n'est pas encore prêt. Veuillez d'abord cloner votre voix.",
    };
  }

  try {
    const finalText = prospectName
      ? text.replace(/\{nom\}/gi, prospectName).replace(/\{name\}/gi, prospectName)
      : text;

    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${profile.voice_id}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: finalText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail?.message || `ElevenLabs TTS error: ${response.status}`);
    }

    // Upload generated audio to Supabase storage
    const audioBuffer = await response.arrayBuffer();
    const fileName = `voice-generated/${Date.now()}-${user.id.slice(0, 8)}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, audioBuffer, { contentType: "audio/mpeg" });

    if (uploadError) throw new Error("Erreur lors de la sauvegarde de l'audio");

    const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(fileName);

    // Save voice message record
    await supabase.from("voice_messages").insert({
      voice_profile_id: profile.id,
      input_text: text,
      audio_url: publicUrl,
      target_prospect_id: null,
      status: "ready",
    });

    revalidatePath("/settings/voice");
    return { success: true, audioUrl: publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ─── Voice Messages ───────────────────────────────────────────

export async function getVoiceMessages() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    prospect: Array.isArray(d.prospect) ? d.prospect[0] || null : d.prospect,
  }));
}

export async function createVoiceMessage(formData: {
  input_text: string;
  scheduled_send_at?: string;
  target_prospect_id?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get voice profile
  const { data: profile } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  await supabase.from("voice_messages").insert({
    voice_profile_id: profile?.id || null,
    input_text: formData.input_text,
    scheduled_send_at: formData.scheduled_send_at || null,
    target_prospect_id: formData.target_prospect_id || null,
    status: "pending",
  });

  revalidatePath("/settings/voice");
}
