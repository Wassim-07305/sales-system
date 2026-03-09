import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCallReviews, getReviewStats } from "@/lib/actions/call-review";
import { ReviewsView } from "./reviews-view";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [reviews, stats] = await Promise.all([getCallReviews(), getReviewStats()]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReviewsView reviews={reviews as any} stats={stats as any} />;
}
