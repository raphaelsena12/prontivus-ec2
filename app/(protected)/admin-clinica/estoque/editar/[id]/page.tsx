import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarEstoqueForm } from "./editar-estoque-form";

async function getEstoque(id: string, clinicaId: string) {
  const estoqueMedicamento = await prisma.estoqueMedicamento.findFirst({
    where: { id, clinicaId },
    include: { medicamento: true },
  });

  if (estoqueMedicamento) {
    return { estoque: estoqueMedicamento, tipoEstoque: "MEDICAMENTO" as const };
  }

  const estoqueInsumo = await prisma.estoqueInsumo.findFirst({
    where: { id, clinicaId },
    include: { insumo: true },
  });

  if (estoqueInsumo) {
    return { estoque: estoqueInsumo, tipoEstoque: "INSUMO" as const };
  }

  return null;
}

export default async function EditarEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  const { id } = await params;
  const result = await getEstoque(id, clinicaId);
  if (!result) redirect("/admin-clinica/estoque");
  return (
    <EditarEstoqueForm
      estoque={result.estoque}
      clinicaId={clinicaId}
      tipoEstoque={result.tipoEstoque}
    />
  );
}















