import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { NovoCodigoTussForm } from "./novo-codigo-tuss-form";

export default async function NovoCodigoTussPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAuthorized =
    (await hasUserType(TipoUsuario.ADMIN_CLINICA)) ||
    (await hasUserType(TipoUsuario.SECRETARIA));
  if (!isAuthorized) redirect("/dashboard");

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");

  return <NovoCodigoTussForm />;
}
