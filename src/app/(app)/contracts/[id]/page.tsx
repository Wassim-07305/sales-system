import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ContractView } from "./contract-view";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, client:profiles(full_name, email)")
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isClient = contract.client_id === user.id;
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  return (
    <ContractView
      contract={contract}
      isClient={isClient}
      isAdmin={isAdmin}
    />
  );
}
