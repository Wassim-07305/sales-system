import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllCustomFields } from "@/lib/actions/custom-fields";
import { CustomFieldsView } from "./custom-fields-view";

export default async function CustomFieldsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = await getAllCustomFields();

  return <CustomFieldsView initialFields={fields} />;
}
