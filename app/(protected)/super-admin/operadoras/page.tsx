import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { OperadorasSuperAdminContent } from "./operadoras-super-admin-content";

export default async function SuperAdminOperadorasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <OperadorasSuperAdminContent />;
}

