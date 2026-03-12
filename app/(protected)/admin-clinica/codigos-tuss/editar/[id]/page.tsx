import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { EditarCodigoTussForm } from "./editar-codigo-tuss-form";

export default async function EditarCodigoTussPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAuthorized =
    (await hasUserType(TipoUsuario.ADMIN_CLINICA)) ||
    (await hasUserType(TipoUsuario.SECRETARIA));
  if (!isAuthorized) redirect("/dashboard");

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");

  const { id } = await params;

  const codigoTuss = await prisma.codigoTuss.findUnique({
    where: { id },
    include: {
      tussEspecialidades: {
        include: { especialidade: true },
      },
    },
  });

  if (!codigoTuss) redirect("/admin-clinica/codigos-tuss");

  return <EditarCodigoTussForm codigoTuss={codigoTuss} />;
}
