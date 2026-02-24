import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMarketplaceListings, getMyApplications } from "@/lib/actions/marketplace";
import { MarketplaceView } from "./marketplace-view";

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listings = await getMarketplaceListings();
  const myApplications = await getMyApplications();

  return (
    <MarketplaceView
      listings={listings as any}
      myApplications={myApplications as any}
    />
  );
}
