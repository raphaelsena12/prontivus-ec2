import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { RetornoDetalheContent } from "./retorno-detalhe-content";

export default async function RetornoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);
  if (!isSecretaria) redirect("/dashboard");

  const { id } = await params;
  return <RetornoDetalheContent retornoId={id} />;
}
