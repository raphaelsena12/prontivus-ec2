import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarMovimentacaoForm } from "./editar-movimentacao-form";

async function getMovimentacao(id: string, clinicaId: string) {
  return await prisma.fluxoCaixa.findFirst({ where: { id, clinicaId }, include: { formaPagamento: { select: { id: true, nome: true } } } });
}

async function getFormasPagamento(clinicaId: string) {
  return await prisma.formaPagamento.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export default async function EditarMovimentacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const { id } = await params;
  const [movimentacao, formasPagamento] = await Promise.all([getMovimentacao(id, clinicaId), getFormasPagamento(clinicaId)]);
  if (!movimentacao) redirect("/admin-clinica/fluxo-caixa");
  return <EditarMovimentacaoForm movimentacao={movimentacao} clinicaId={clinicaId} formasPagamento={formasPagamento} />;
}















