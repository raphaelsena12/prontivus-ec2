import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
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

export default async function UsuariosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isAdminClinica) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    redirect("/dashboard");
  }

  const clinica = await getClinica(clinicaId);

  if (!clinica) {
    redirect("/dashboard");
  }

  return <UsuariosContent clinica={clinica} />;
}














