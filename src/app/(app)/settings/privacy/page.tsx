import { PageHeader } from "@/components/layout/page-header";
import { getConsentStatus, getDataProcessingLog } from "@/lib/actions/gdpr";
import { PrivacyView } from "./privacy-view";

export default async function PrivacyPage() {
  const [consents, processingLog] = await Promise.all([
    getConsentStatus(),
    getDataProcessingLog(),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Confidentialite & RGPD"
        description="Gerez vos consentements, exportez vos donnees et exercez vos droits RGPD"
      />
      <PrivacyView initialConsents={consents} processingLog={processingLog} />
    </div>
  );
}
