import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import { PerfilContent } from "./perfil-content";

export default async function PerfilPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PerfilContent />;
}














