import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { DSARContent } from "./dsar-content";

export default async function DSARPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <DSARContent />;
}
