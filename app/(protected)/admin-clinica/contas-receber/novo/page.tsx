import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NovaContaReceberForm } from "./nova-conta-receber-form";

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

export default async function NovaContaReceberPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const [formasPagamento, pacientes] = await Promise.all([getFormasPagamento(clinicaId), getPacientes(clinicaId)]);
  return <NovaContaReceberForm clinicaId={clinicaId} formasPagamento={formasPagamento} pacientes={pacientes} />;
}















