import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { NovoAgendamentoForm } from "./novo-agendamento-form";

export default async function NovoAgendamentoPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);

  if (!isSecretaria) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    redirect("/dashboard");
  }

  return <NovoAgendamentoForm clinicaId={clinicaId} />;
}














