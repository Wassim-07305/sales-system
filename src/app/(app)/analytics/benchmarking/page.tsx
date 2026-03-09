import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBenchmarkData } from "@/lib/actions/analytics";
import { BenchmarkingView } from "./benchmarking-view";

export default async function BenchmarkingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const data = await getBenchmarkData("current");

  return <BenchmarkingView initialData={data} />;
}
