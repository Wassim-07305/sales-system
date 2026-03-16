import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getVoiceProfile, getVoiceMessages } from "@/lib/actions/voice";
import { VoiceSettings } from "./voice-settings";

export default async function VoiceSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/settings");

  const voiceProfile = await getVoiceProfile();
  const voiceMessages = await getVoiceMessages();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <VoiceSettings
      voiceProfile={voiceProfile}
      voiceMessages={voiceMessages as any}
    />
  );
}
