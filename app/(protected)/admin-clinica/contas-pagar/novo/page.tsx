import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NovaContaPagarForm } from "./nova-conta-pagar-form";

async function getFormasPagamento(clinicaId: string) {
  return await prisma.formaPagamento.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export default async function NovaContaPagarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const formasPagamento = await getFormasPagamento(clinicaId);
  return <NovaContaPagarForm clinicaId={clinicaId} formasPagamento={formasPagamento} />;
}















