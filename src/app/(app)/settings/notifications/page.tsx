import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationPreferencesView } from "./notifications-preferences-view";

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Try to load existing preferences; fall back to defaults
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const defaults = {
    push_enabled: true,
    email_enabled: true,
    notify_messages: true,
    notify_deals: true,
    notify_bookings: true,
    notify_challenges: true,
    notify_community: true,
    notify_team: true,
  };

  return <NotificationPreferencesView preferences={prefs || defaults} />;
}
