import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { RelatorioContent } from "./relatorio-content";

const TIPOS_VALIDOS = [
  "faturamento",
  "vendas",
  "faturamento-medico",
  "estoque",
  "contas-pagar",
  "contas-receber",
] as const;

type TipoRelatorio = (typeof TIPOS_VALIDOS)[number];

interface PageProps {
  params: Promise<{ tipo: string }>;
}

export default async function RelatorioPage({ params }: PageProps) {
  const { tipo } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
  if (!isAdminClinica) redirect("/dashboard");

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) redirect("/dashboard");

  if (!TIPOS_VALIDOS.includes(tipo as TipoRelatorio)) redirect("/dashboard");

  return <RelatorioContent tipo={tipo as TipoRelatorio} clinicaId={clinicaId} />;
}
