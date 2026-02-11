import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { NovoMedicamentoForm } from "./novo-medicamento-form";

export default async function NovoMedicamentoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");
  return <NovoMedicamentoForm clinicaId={clinicaId} />;
}















