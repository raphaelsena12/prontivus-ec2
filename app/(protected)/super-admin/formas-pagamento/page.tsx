import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { FormasPagamentoSuperAdminContent } from "./formas-pagamento-super-admin-content";

export default async function SuperAdminFormasPagamentoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  return <FormasPagamentoSuperAdminContent />;
}

