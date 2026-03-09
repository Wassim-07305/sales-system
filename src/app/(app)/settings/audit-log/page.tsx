import { getAuditLogs } from "@/lib/actions/audit-log";
import { AuditLogView } from "./audit-log-view";

export default async function AuditLogPage() {
  const logs = await getAuditLogs();
  return <AuditLogView logs={logs} />;
}
