import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { blindIndex } from "@/lib/crypto/field-encryption";

export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const operadoraId = searchParams.get("operadoraId");
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    clinicaId,
    status: "REALIZADA",
    preparadoTiss: false,
    operadoraId: { not: null },
    // Só operadoras aceitas pela clínica
    operadora: { tenantsAceitacao: { some: { tenantId: clinicaId, aceita: true } } },
  };

  if (operadoraId) where.operadoraId = operadoraId;

  if (q) {
    const cpfOnly = q.replace(/\D/g, "");
    where.OR = [
      { paciente: { nome: { contains: q, mode: "insensitive" } } },
      ...(cpfOnly.length === 11 ? [{ paciente: { cpfHash: blindIndex(cpfOnly) } }] : []),
    ];
  }

  const [consultas, total] = await Promise.all([
    prisma.consulta.findMany({
      where,
      include: {
        paciente: { select: { id: true, nome: true, cpf: true } },
        operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
        planoSaude: { select: { id: true, nome: true } },
        codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
        medico: { select: { id: true, usuario: { select: { nome: true } } } },
      },
      orderBy: { dataHora: "desc" },
      skip,
      take: limit,
    }),
    prisma.consulta.count({ where }),
  ]);

  return NextResponse.json({ consultas, total, page, limit });
}
