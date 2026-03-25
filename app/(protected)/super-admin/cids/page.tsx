import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { CidsSuperAdminContent } from "./cids-super-admin-content";

export default async function SuperAdminCidsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <CidsSuperAdminContent />;
}

