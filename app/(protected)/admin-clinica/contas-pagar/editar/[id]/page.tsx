import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarContaPagarForm } from "./editar-conta-pagar-form";

async function getContaPagar(id: string, clinicaId: string) {
  return await prisma.contaPagar.findFirst({ where: { id, clinicaId } });
}

async function getFormasPagamento(clinicaId: string) {
  return await prisma.formaPagamento.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export default async function EditarContaPagarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const { id } = await params;
  const [conta, formasPagamento] = await Promise.all([getContaPagar(id, clinicaId), getFormasPagamento(clinicaId)]);
  if (!conta) redirect("/admin-clinica/contas-pagar");
  return <EditarContaPagarForm conta={conta} clinicaId={clinicaId} formasPagamento={formasPagamento} />;
}















