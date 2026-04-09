import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { MeusDadosContent } from "./meus-dados-content";

export default async function MeusDadosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isPaciente = await hasUserType(TipoUsuario.PACIENTE);

  if (!isPaciente) {
    redirect("/dashboard");
  }

  return <MeusDadosContent />;
}
