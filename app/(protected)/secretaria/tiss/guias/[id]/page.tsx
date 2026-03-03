import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { GuiaDetalheContent } from "./guia-detalhe-content";

export default async function GuiaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);
  if (!isSecretaria) redirect("/dashboard");

  const { id } = await params;
  return <GuiaDetalheContent id={id} />;
}
