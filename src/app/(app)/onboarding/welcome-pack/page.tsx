import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWelcomePack } from "@/lib/actions/onboarding";
import { WelcomePackView } from "./welcome-pack-view";

export default async function WelcomePackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getWelcomePack(user.id);
  return <WelcomePackView data={data} />;
}
