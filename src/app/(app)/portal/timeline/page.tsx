import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClientTimeline } from "@/lib/actions/timeline";
import { ClientTimeline } from "@/components/client-timeline";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PortalTimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const events = await getClientTimeline(user.id, 100);

  return (
    <div>
      <PageHeader
        title="Mon parcours"
        description="Historique complet de votre activité sur la plateforme"
      >
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Retour au portail
          </Button>
        </Link>
      </PageHeader>

      <ClientTimeline events={events} />
    </div>
  );
}
