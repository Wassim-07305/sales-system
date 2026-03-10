import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsList } from "./contacts-list";
import { PageHeader } from "@/components/layout/page-header";
import { NewContactDialog } from "./new-contact-dialog";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contacts } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Gérez tous vos contacts et clients"
      >
        <NewContactDialog />
      </PageHeader>
      <ContactsList initialContacts={contacts || []} />
    </div>
  );
}
