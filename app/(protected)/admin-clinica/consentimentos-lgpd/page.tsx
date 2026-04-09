import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ConsentimentosContent } from "./consentimentos-content";

export default async function ConsentimentosLGPDPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <ConsentimentosContent />;
}
