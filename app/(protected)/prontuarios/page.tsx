import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ProntuariosContent } from "./prontuarios-content";

export default async function ProntuariosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isSuperAdmin = await hasUserType(TipoUsuario.SUPER_ADMIN);
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  const isMedico = await hasUserType(TipoUsuario.MEDICO);

  if (!isSuperAdmin && !isAdminClinica && !isMedico) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  return <ProntuariosContent clinicaId={clinicaId} />;
}

