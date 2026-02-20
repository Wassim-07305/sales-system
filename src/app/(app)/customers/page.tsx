import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersView } from "./customers-view";

export default async function CustomersPage() {
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

  const { data: clients } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["client_b2b", "client_b2c"])
    .order("health_score", { ascending: true });

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*, client:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  return (
    <CustomersView
      clients={clients || []}
      testimonials={testimonials || []}
    />
  );
}
