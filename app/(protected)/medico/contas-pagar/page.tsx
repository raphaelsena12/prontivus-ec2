import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ContasPagarContent } from "./contas-pagar-content";

export default async function ContasPagarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isMedico = await hasUserType(TipoUsuario.MEDICO);

  if (!isMedico) {
    redirect("/dashboard");
  }

  return <ContasPagarContent />;
}













