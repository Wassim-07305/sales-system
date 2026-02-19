import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ContactDetail } from "./contact-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const { data: deals } = await supabase
    .from("deals")
    .select("*, stage:pipeline_stages(*)")
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  const { data: activities } = await supabase
    .from("deal_activities")
    .select("*, user:profiles(*)")
    .in(
      "deal_id",
      (deals || []).map((d) => d.id)
    )
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ContactDetail
      contact={contact}
      deals={deals || []}
      activities={activities || []}
    />
  );
}
