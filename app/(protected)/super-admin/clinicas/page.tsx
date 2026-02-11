import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ClinicasContent } from "./clinicas-content";

async function getClinicas() {
  const clinicas = await prisma.tenant.findMany({
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
      cep: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      pais: true,
      logoUrl: true,
      planoId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Buscar planos separadamente
  const planosMap = new Map();
  const planosUnicos = [...new Set(clinicas.map(c => c.planoId))];
  const planos = await prisma.plano.findMany({
    where: {
      id: { in: planosUnicos },
    },
  });
  planos.forEach(p => planosMap.set(p.id, p));

  return clinicas
    .filter((clinica) => {
      const plano = planosMap.get(clinica.planoId);
      return plano !== undefined;
    })
    .map((clinica) => {
      const plano = planosMap.get(clinica.planoId)!;
      return {
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
        cep: clinica.cep,
        endereco: clinica.endereco,
        numero: clinica.numero,
        complemento: clinica.complemento,
        bairro: clinica.bairro,
        cidade: clinica.cidade,
        estado: clinica.estado,
        pais: clinica.pais,
        logoUrl: clinica.logoUrl,
        plano: {
          id: plano.id,
          nome: plano.nome,
          tokensMensais: plano.tokensMensais,
          preco: Number(plano.preco),
          telemedicineHabilitada: plano.telemedicineHabilitada,
        },
      };
    });
}

async function getPlanos() {
  const planos = await prisma.plano.findMany({
    where: {
      ativo: true,
    },
    orderBy: {
      preco: "asc",
    },
  });

  return planos.map((plano) => ({
    id: plano.id,
    nome: plano.nome,
    tokensMensais: plano.tokensMensais,
    preco: Number(plano.preco),
    telemedicineHabilitada: plano.telemedicineHabilitada,
  }));
}

export default async function ClinicasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isSuperAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [clinicas, planos] = await Promise.all([getClinicas(), getPlanos()]);

  return <ClinicasContent clinicas={clinicas} planos={planos} />;
}














