import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Redireciona cada tipo de usuário para seu dashboard específico
  const isSuperAdmin = await hasUserType(TipoUsuario.SUPER_ADMIN);
  if (isSuperAdmin) {
    redirect("/super-admin");
  }

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (isAdminClinica) {
    redirect("/admin-clinica");
  }

  const isMedico = await hasUserType(TipoUsuario.MEDICO);
  if (isMedico) {
    redirect("/medico");
  }

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);
  if (isSecretaria) {
    redirect("/secretaria");
  }

  const isPaciente = await hasUserType(TipoUsuario.PACIENTE);
  if (isPaciente) {
    redirect("/paciente");
  }

  // Fallback - não deveria chegar aqui
  redirect("/login");
}
