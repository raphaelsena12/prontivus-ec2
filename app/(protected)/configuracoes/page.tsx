import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma/enums";

export default async function ConfiguracoesPage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  // Redirecionar baseado no tipo de usuário
  const userType = session.user.tipo as TipoUsuario;

  if (!userType) {
    redirect("/dashboard");
  }

  switch (userType) {
    case TipoUsuario.SUPER_ADMIN:
      redirect("/super-admin/configuracoes");
    case TipoUsuario.ADMIN_CLINICA:
      // TODO: Criar página de configurações do admin da clínica
      redirect("/admin-clinica");
    case TipoUsuario.MEDICO:
      // TODO: Criar página de configurações do médico
      redirect("/medico");
    case TipoUsuario.SECRETARIA:
      // TODO: Criar página de configurações da secretária
      redirect("/secretaria");
    default:
      redirect("/dashboard");
  }
}

