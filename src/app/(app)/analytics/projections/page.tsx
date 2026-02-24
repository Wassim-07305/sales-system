import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRevenueProjections } from "@/lib/actions/analytics-v2";
import { ProjectionsView } from "./projections-view";

export default async function ProjectionsPage() {
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

  // Fetch all three scenarios server-side
  const [conservative, moderate, optimistic] = await Promise.all([
    getRevenueProjections("conservative"),
    getRevenueProjections("moderate"),
    getRevenueProjections("optimistic"),
  ]);

  return (
    <ProjectionsView
      scenarios={{
        conservative: conservative as any,
        moderate: moderate as any,
        optimistic: optimistic as any,
      }}
    />
  );
}
