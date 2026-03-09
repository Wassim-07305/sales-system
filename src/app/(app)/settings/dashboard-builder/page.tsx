import { getDashboardWidgets } from "@/lib/actions/dashboard-builder";
import { BuilderView } from "./builder-view";

export default async function DashboardBuilderPage() {
  const widgets = await getDashboardWidgets();
  return <BuilderView initialWidgets={widgets} />;
}
