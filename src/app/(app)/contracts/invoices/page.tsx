import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getInvoices } from "@/lib/actions/payments";
import { InvoicesView } from "./invoices-view";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoices = await getInvoices();

  // Fetch contracts for the generate invoice dialog
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, amount, status, client:profiles(id, full_name)")
    .order("created_at", { ascending: false });

  return (
    <InvoicesView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices={invoices as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contracts={(contracts || []) as any}
    />
  );
}
