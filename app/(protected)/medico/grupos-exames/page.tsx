import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { GruposExamesContent } from "./grupos-exames-content";

export default async function GruposExamesPage() {
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

  return <GruposExamesContent clinicaId={clinicaId} />;
}
