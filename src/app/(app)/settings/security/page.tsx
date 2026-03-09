import { PageHeader } from "@/components/layout/page-header";
import {
  getMfaStatus,
  getSecuritySettings,
  getLoginHistory,
  getActiveSessions,
} from "@/lib/actions/security";
import { SecurityView } from "./security-view";

export default async function SecurityPage() {
  const [mfaStatus, securitySettings, loginHistory, activeSessions] =
    await Promise.all([
      getMfaStatus(),
      getSecuritySettings(),
      getLoginHistory(),
      getActiveSessions(),
    ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Securite & Authentification"
        description="Gerez l'authentification a deux facteurs, les sessions et les parametres de securite"
      />
      <SecurityView
        initialMfaStatus={mfaStatus}
        initialSecuritySettings={securitySettings}
        initialLoginHistory={loginHistory}
        initialActiveSessions={activeSessions}
      />
    </div>
  );
}
