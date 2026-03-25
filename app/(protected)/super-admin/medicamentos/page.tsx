import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { MedicamentosSuperAdminContent } from "./medicamentos-super-admin-content";

export default async function SuperAdminMedicamentosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <MedicamentosSuperAdminContent />;
}

