import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesContent } from "./configuracoes-content";

async function getPlanos() {
  const planos = await prisma.plano.findMany({
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
    descricao: plano.descricao,
    ativo: plano.ativo,
    createdAt: plano.createdAt,
    updatedAt: plano.updatedAt,
  }));
}

async function getEstatisticasPlanos() {
  const [planos, clinicasPorPlano] = await Promise.all([
    prisma.plano.findMany({
      select: {
        id: true,
        nome: true,
      },
    }),
    prisma.tenant.groupBy({
      by: ["planoId"],
      _count: {
        id: true,
      },
    }),
  ]);

  const clinicasPorPlanoMap = new Map(
    clinicasPorPlano.map((item) => [item.planoId, item._count.id])
  );

  return planos.map((plano) => ({
    id: plano.id,
    nome: plano.nome,
    totalClinicas: clinicasPorPlanoMap.get(plano.id) || 0,
  }));
}

export default async function ConfiguracoesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isSuperAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [planos, estatisticasPlanos] = await Promise.all([
    getPlanos(),
    getEstatisticasPlanos(),
  ]);

  return (
    <ConfiguracoesContent
      planos={planos}
      estatisticasPlanos={estatisticasPlanos}
    />
  );
}








