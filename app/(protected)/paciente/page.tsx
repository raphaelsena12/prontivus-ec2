import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { PacienteContent } from "./paciente-content";

export default async function PacientePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isPaciente = await hasUserType(TipoUsuario.PACIENTE);

  if (!isPaciente) {
    redirect("/dashboard");
  }

  return <PacienteContent nome={session.user.nome} />;
}














