import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { MovimentacoesEstoqueContent } from "./movimentacoes-estoque-content";

async function getEstoques(clinicaId: string) {
  return await prisma.estoqueMedicamento.findMany({
    where: { clinicaId },
    include: { medicamento: { select: { id: true, nome: true } } },
    orderBy: { medicamento: { nome: "asc" } },
  });
}

export default async function MovimentacoesEstoquePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const estoques = await getEstoques(clinicaId);
  return <MovimentacoesEstoqueContent clinicaId={clinicaId} estoques={estoques} />;
}















