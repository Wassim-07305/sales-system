import { getCohortData } from "@/lib/actions/analytics-v2";
import { CohortView } from "./cohort-view";

export default async function CohortPage() {
  const data = await getCohortData();
  return <CohortView data={data} />;
}
