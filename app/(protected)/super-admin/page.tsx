import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusClinica, StatusPagamento } from "@/lib/generated/prisma";
import { SuperAdminContent } from "./super-admin-content";

async function getStatistics() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const [
    totalClinicasAtivas,
    totalClinicasInativas,
    totalUsuarios,
    receitaMesAtual,
    receitaTotal,
  ] = await Promise.all([
    prisma.tenant.count({
      where: { status: StatusClinica.ATIVA },
    }),
    prisma.tenant.count({
      where: {
        status: { in: [StatusClinica.INATIVA, StatusClinica.SUSPENSA] },
      },
    }),
    prisma.usuario.count(),
    prisma.pagamento.aggregate({
      where: {
        status: StatusPagamento.PAGO,
        mesReferencia: {
          gte: inicioMes,
          lt: fimMes,
        },
      },
      _sum: {
        valor: true,
      },
    }),
    prisma.pagamento.aggregate({
      where: {
        status: StatusPagamento.PAGO,
      },
      _sum: {
        valor: true,
      },
    }),
  ]);

  const totalClinicas = totalClinicasAtivas + totalClinicasInativas;

  return {
    totalClinicasAtivas,
    totalClinicasInativas,
    totalUsuarios,
    receitaMensal: Number(receitaMesAtual._sum.valor || 0),
    totalClinicas,
    receitaTotal: Number(receitaTotal._sum.valor || 0),
  };
}

export default async function SuperAdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isSuperAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const statistics = await getStatistics();

  return (
    <SuperAdminContent
      statistics={{
        totalClinicasAtivas: statistics.totalClinicasAtivas,
        totalClinicasInativas: statistics.totalClinicasInativas,
        totalUsuarios: statistics.totalUsuarios,
        receitaMensal: statistics.receitaMensal,
        totalClinicas: statistics.totalClinicas,
        receitaTotal: statistics.receitaTotal,
      }}
    />
  );
}
