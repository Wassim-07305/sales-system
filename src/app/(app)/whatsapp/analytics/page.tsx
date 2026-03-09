import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWhatsAppAnalytics } from "@/lib/actions/whatsapp";
import { WhatsAppAnalyticsView } from "./analytics-view";

export default async function WhatsAppAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const analytics = await getWhatsAppAnalytics();

  return <WhatsAppAnalyticsView analytics={analytics} />;
}
