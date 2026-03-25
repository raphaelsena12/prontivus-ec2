import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { EditarCodigoTussSuperAdminForm } from "./editar-codigo-tuss-super-admin-form";

export default async function EditarCodigoTussSuperAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const ok = await isSuperAdmin();
  if (!ok) redirect("/dashboard");

  const { id } = await params;

  const codigoTuss = await prisma.codigoTuss.findUnique({
    where: { id },
    include: {
      tussEspecialidades: {
        include: { especialidade: true },
      },
    },
  });

  if (!codigoTuss) redirect("/super-admin/codigos-tuss");

  return <EditarCodigoTussSuperAdminForm codigoTuss={codigoTuss} />;
}

