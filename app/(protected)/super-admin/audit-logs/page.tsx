import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { AuditLogsContent } from "./audit-logs-content";

export default async function AuditLogsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isSuperAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <AuditLogsContent />;
}
