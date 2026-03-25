import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { NovoCodigoTussSuperAdminForm } from "./novo-codigo-tuss-super-admin-form";

export default async function NovoCodigoTussSuperAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <NovoCodigoTussSuperAdminForm />;
}

