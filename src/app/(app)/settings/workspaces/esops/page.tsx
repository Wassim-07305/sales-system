import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllEsops } from "@/lib/actions/esop";
import { EsopValidationList } from "./esop-validation-list";

export default async function AdminEsopsPage() {
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

  const esops = await getAllEsops();

  return <EsopValidationList esops={esops} />;
}
