import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCashFlowData } from "@/lib/actions/cash-flow";
import { CashFlowView } from "./cash-flow-view";

export default async function CashFlowPage() {
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

  const cashFlowData = await getCashFlowData();

  return <CashFlowView data={cashFlowData} />;
}
