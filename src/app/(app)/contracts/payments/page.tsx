import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPaymentInstallments, getOverduePayments } from "@/lib/actions/payments";
import { PaymentsView } from "./payments-view";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const installments = await getPaymentInstallments();
  const overdue = await getOverduePayments();

  return (
    <PaymentsView
      installments={installments as any}
      overdue={overdue as any}
    />
  );
}
