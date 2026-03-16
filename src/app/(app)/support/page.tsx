import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTickets, getTicketStats } from "@/lib/actions/support";
import { SupportView } from "./support-view";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const [tickets, stats] = await Promise.all([getTickets(), getTicketStats()]);

  return (
    <SupportView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tickets={tickets as any}
      stats={stats}
      userRole={profile?.role || "setter"}
      userName={profile?.full_name || user.email || "Utilisateur"}
    />
  );
}
