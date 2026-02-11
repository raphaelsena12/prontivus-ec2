import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UsuariosContent } from "./usuarios-content";

async function getClinica(id: string) {
  const clinica = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cnpj: true,
    },
  });

  return clinica;
}

export default async function UsuariosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isSuperAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const clinica = await getClinica(id);

  if (!clinica) {
    redirect("/super-admin/clinicas");
  }

  return <UsuariosContent clinica={clinica} />;
}














