import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Returns reference data needed for TISS forms:
 * operadoras, pacientes (search), codigos TUSS (search)
 */
export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // operadoras | pacientes | tuss
  const q = searchParams.get("q") ?? "";

  if (tipo === "operadoras") {
    const operadoras = await prisma.operadora.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(q ? { razaoSocial: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, codigoAns: true, razaoSocial: true, nomeFantasia: true },
      orderBy: { razaoSocial: "asc" },
      take: 20,
    });
    return NextResponse.json(operadoras);
  }

  if (tipo === "planos") {
    const operadoraId = searchParams.get("operadoraId");
    if (!operadoraId) return NextResponse.json([]);
    const planos = await prisma.planoSaude.findMany({
      where: { operadoraId, ativo: true },
      select: { id: true, nome: true, tipoPlano: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(planos);
  }

  if (tipo === "pacientes") {
    const pacientes = await prisma.paciente.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: "insensitive" } },
                { cpf: { contains: q } },
              ],
            }
          : {}),
      },
      select: { id: true, nome: true, cpf: true },
      orderBy: { nome: "asc" },
      take: 20,
    });
    return NextResponse.json(pacientes);
  }

  if (tipo === "tuss") {
    const tuss = await prisma.codigoTuss.findMany({
      where: {
        ativo: true,
        ...(q
          ? {
              OR: [
                { codigoTuss: { contains: q } },
                { descricao: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, codigoTuss: true, descricao: true, tipoProcedimento: true },
      orderBy: { codigoTuss: "asc" },
      take: 30,
    });
    return NextResponse.json(tuss);
  }

  if (tipo === "carteirinhas") {
    const pacienteId = searchParams.get("pacienteId");
    if (!pacienteId) return NextResponse.json([]);
    const planos = await prisma.pacientePlano.findMany({
      where: { pacienteId, ativo: true },
      include: {
        planoSaude: {
          include: { operadora: { select: { id: true, codigoAns: true, razaoSocial: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(planos);
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
