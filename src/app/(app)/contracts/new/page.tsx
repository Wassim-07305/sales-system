import { createClient } from "@/lib/supabase/server";
import { NewContractForm } from "./new-contract-form";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string; clientId?: string; amount?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("contract_templates")
    .select("*")
    .order("name");

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, company")
    .in("role", ["client_b2b", "client_b2c"])
    .order("full_name");

  const { data: rawDeals } = await supabase
    .from("deals")
    .select("id, title, value, contact:profiles(id, full_name, email)")
    .order("created_at", { ascending: false });

  // Normalize contact from array to single object
  const deals = (rawDeals || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    title: d.title as string,
    value: d.value as number,
    contact: Array.isArray(d.contact) ? (d.contact[0] || null) : d.contact,
  }));

  return (
    <NewContractForm
      templates={templates || []}
      clients={clients || []}
      deals={deals}
      initialDealId={params.dealId}
      initialClientId={params.clientId}
      initialAmount={params.amount}
    />
  );
}
