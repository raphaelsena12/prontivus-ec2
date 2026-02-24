import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ProntuarioPacienteContent } from "./prontuario-paciente-content";

export default async function ProntuarioPacientePage({
  params,
}: {
  params: Promise<{ pacienteId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Permitir acesso para médico, secretaria e admin-clinica
  const isMedico = await hasUserType(TipoUsuario.MEDICO);
  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isMedico && !isSecretaria && !isAdminClinica) {
    redirect("/dashboard");
  }

  const { pacienteId } = await params;

  return <ProntuarioPacienteContent pacienteId={pacienteId} />;
}
