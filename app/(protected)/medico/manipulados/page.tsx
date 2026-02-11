import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ManipuladosContent } from "./manipulados-content";

export default async function ManipuladosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isMedico = await hasUserType(TipoUsuario.MEDICO);

  if (!isMedico) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    redirect("/dashboard");
  }

  return <ManipuladosContent clinicaId={clinicaId} />;
}
