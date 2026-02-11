import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { MedicamentosContent } from "./medicamentos-content";

export default async function MedicamentosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);

  if (!isSecretaria) {
    redirect("/dashboard");
  }

  return <MedicamentosContent />;
}














