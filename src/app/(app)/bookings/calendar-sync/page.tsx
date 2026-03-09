import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarSyncPanel } from "./calendar-sync-panel";
import {
  getCalendarSyncStatus,
  getCalendarSettings,
} from "@/lib/actions/calendar-sync";

export default async function CalendarSyncPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [syncStatus, settings] = await Promise.all([
    getCalendarSyncStatus(),
    getCalendarSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Synchronisation Google Calendar"
        description="Connectez votre Google Calendar pour synchroniser vos rendez-vous"
      />
      <CalendarSyncPanel initialStatus={syncStatus} initialSettings={settings} />
    </div>
  );
}
