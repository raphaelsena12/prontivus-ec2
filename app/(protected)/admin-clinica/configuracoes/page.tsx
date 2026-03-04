import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ConfiguracoesContent } from "./configuracoes-content";

export default async function ConfiguracoesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");

  return <ConfiguracoesContent />;
}
