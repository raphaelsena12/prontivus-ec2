import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { AdminClinicaContent } from "./admin-clinica-content";

async function getClinicaData(clinicaId: string) {
  const clinica = await prisma.tenant.findUnique({
    select: {
      id: true,
      nome: true,
      cnpj: true,
      email: true,
      telefone: true,
      status: true,
      tokensMensaisDisponiveis: true,
      tokensConsumidos: true,
      telemedicineHabilitada: true,
      dataContratacao: true,
      dataExpiracao: true,
      planoId: true,
    },
    where: { id: clinicaId },
  });

  if (!clinica) {
    return null;
  }

  const plano = await prisma.plano.findUnique({
    where: { id: clinica.planoId },
  });

  if (!plano) {
    return null;
  }

  const [totalMedicos, totalSecretarias, totalPacientes] = await Promise.all([
    prisma.usuario.count({
      where: {
        clinicaId,
        tipo: TipoUsuario.MEDICO,
        ativo: true,
      },
    }),
    prisma.usuario.count({
      where: {
        clinicaId,
        tipo: TipoUsuario.SECRETARIA,
        ativo: true,
      },
    }),
    prisma.usuario.count({
      where: {
        clinicaId,
        tipo: TipoUsuario.PACIENTE,
        ativo: true,
      },
    }),
  ]);

  const percentualTokensUsado =
    clinica.tokensMensaisDisponiveis > 0
      ? Math.round(
          (clinica.tokensConsumidos / clinica.tokensMensaisDisponiveis) * 100
        )
      : 0;

  return {
    clinica: {
      id: clinica.id,
      nome: clinica.nome,
      cnpj: clinica.cnpj,
      email: clinica.email,
      telefone: clinica.telefone,
      status: clinica.status,
      tokensMensaisDisponiveis: clinica.tokensMensaisDisponiveis,
      tokensConsumidos: clinica.tokensConsumidos,
      telemedicineHabilitada: clinica.telemedicineHabilitada,
      dataContratacao: clinica.dataContratacao,
      dataExpiracao: clinica.dataExpiracao,
      plano: {
        nome: plano.nome,
        tokensMensais: plano.tokensMensais,
        preco: Number(plano.preco),
        telemedicineHabilitada: plano.telemedicineHabilitada,
      },
    },
    estatisticas: {
      totalMedicos,
      totalSecretarias,
      totalPacientes,
    },
    percentualTokensUsado,
  };
}

export default async function AdminClinicaPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isAdminClinica) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    redirect("/dashboard");
  }

  const data = await getClinicaData(clinicaId);

  if (!data) {
    redirect("/dashboard");
  }

  return <AdminClinicaContent data={data} />;
}














