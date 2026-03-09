import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getInvoices } from "@/lib/actions/payments";
import { InvoicesView, type Invoice, type Contract } from "./invoices-view";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoices = await getInvoices();

  // Fetch contracts for the generate invoice dialog
  const { data: contractsRaw } = await supabase
    .from("contracts")
    .select("id, amount, status, client:profiles(id, full_name)")
    .order("created_at", { ascending: false });

  // Transform to match Contract interface (Supabase returns single relation as array)
  const contracts: Contract[] = (contractsRaw || []).map((c) => ({
    id: c.id,
    amount: c.amount,
    status: c.status,
    client: Array.isArray(c.client) ? c.client[0] : c.client,
  }));

  return (
    <InvoicesView
      invoices={invoices as Invoice[]}
      contracts={contracts}
    />
  );
}
