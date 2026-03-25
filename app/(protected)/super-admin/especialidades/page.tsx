import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { EspecialidadesSuperAdminContent } from "./especialidades-super-admin-content";

export default async function SuperAdminEspecialidadesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <EspecialidadesSuperAdminContent />;
}

