import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { CodigosTussSuperAdminContent } from "./codigos-tuss-super-admin-content";

export default async function SuperAdminCodigosTussPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <CodigosTussSuperAdminContent />;
}

