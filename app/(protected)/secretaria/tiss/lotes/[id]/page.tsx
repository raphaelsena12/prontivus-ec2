import { redirect } from "next/navigation";
import { getSession, hasUserType } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { LoteDetalheContent } from "./lote-detalhe-content";

export default async function LoteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSecretaria = await hasUserType(TipoUsuario.SECRETARIA);
  if (!isSecretaria) redirect("/dashboard");

  const { id } = await params;
  return <LoteDetalheContent id={id} />;
}
