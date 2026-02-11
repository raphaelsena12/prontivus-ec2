import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { AtendimentoContent } from "./atendimento-content";

export default async function AtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ consultaId?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isMedico = await hasUserType(TipoUsuario.MEDICO);

  if (!isMedico) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const consultaId = params.consultaId;

  if (!consultaId) {
    redirect("/medico/fila-atendimento");
  }

  return <AtendimentoContent consultaId={consultaId} />;
}













