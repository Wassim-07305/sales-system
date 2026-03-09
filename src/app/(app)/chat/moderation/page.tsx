import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getModerationSettings,
  getReportedMessages,
  getModeratedUsers,
  getModerationLog,
} from "@/lib/actions/moderation";
import { ModerationView } from "./moderation-view";

export default async function ModerationPage() {
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [settings, reportedMessages, users, log] = await Promise.all([
    getModerationSettings(),
    getReportedMessages(),
    getModeratedUsers(),
    getModerationLog(),
  ]);

  return (
    <ModerationView
      settings={settings}
      reportedMessages={reportedMessages}
      users={users}
      log={log}
    />
  );
}
