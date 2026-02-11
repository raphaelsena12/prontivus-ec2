import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { NovoAgendamentoContent } from "./novo-agendamento-content";

export default async function NovoAgendamentoPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isPaciente = await hasUserType(TipoUsuario.PACIENTE);

  if (!isPaciente) {
    redirect("/dashboard");
  }

  return <NovoAgendamentoContent />;
}
