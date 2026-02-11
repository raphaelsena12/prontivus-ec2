import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarEstoqueForm } from "./editar-estoque-form";

async function getEstoque(id: string, clinicaId: string) {
  return await prisma.estoqueMedicamento.findFirst({
    where: { id, clinicaId },
    include: { medicamento: true },
  });
}

export default async function EditarEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const { id } = await params;
  const estoque = await getEstoque(id, clinicaId);
  if (!estoque) redirect("/admin-clinica/estoque");
  return <EditarEstoqueForm estoque={estoque} clinicaId={clinicaId} />;
}















