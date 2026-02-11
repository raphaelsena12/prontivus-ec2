import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarContaReceberForm } from "./editar-conta-receber-form";

async function getContaReceber(id: string, clinicaId: string) {
  return await prisma.contaReceber.findFirst({ where: { id, clinicaId }, include: { paciente: { select: { id: true, nome: true } } } });
}

async function getFormasPagamento(clinicaId: string) {
  return await prisma.formaPagamento.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

async function getPacientes(clinicaId: string) {
  return await prisma.paciente.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export default async function EditarContaReceberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const { id } = await params;
  const [conta, formasPagamento, pacientes] = await Promise.all([getContaReceber(id, clinicaId), getFormasPagamento(clinicaId), getPacientes(clinicaId)]);
  if (!conta) redirect("/admin-clinica/contas-receber");
  return <EditarContaReceberForm conta={conta} clinicaId={clinicaId} formasPagamento={formasPagamento} pacientes={pacientes} />;
}















