import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    // Construir filtro de data
    const dateFilter = dataInicio && dataFim ? {
      dataHora: {
        gte: new Date(dataInicio + "T00:00:00"),
        lte: new Date(dataFim + "T23:59:59"),
      },
    } : {};

    // Buscar todas as consultas da clínica no período
    const consultas = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId!,
        ...dateFilter,
      },
      select: {
        id: true,
        valorCobrado: true,
        status: true,
        dataHora: true,
        medico: {
          select: {
            id: true,
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    // Calcular faturamento total da clínica (consultas realizadas)
    const consultasRealizadas = consultas.filter(
      (c) => c.status === "REALIZADA"
    );
    
    const faturamentoClinica = consultasRealizadas.reduce(
      (acc, c) => acc + Number(c.valorCobrado || 0),
      0
    );

    // Calcular faturamento por médico
    const faturamentoPorMedico = consultasRealizadas.reduce((acc, c) => {
      const medicoId = c.medico.id;
      const medicoNome = c.medico.usuario.nome;
      const valor = Number(c.valorCobrado || 0);
      
      if (!acc[medicoId]) {
        acc[medicoId] = {
          medicoId,
          medicoNome,
          valor: 0,
          quantidade: 0,
        };
      }
      
      acc[medicoId].valor += valor;
      acc[medicoId].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { medicoId: string; medicoNome: string; valor: number; quantidade: number }>);

    const faturamentoPorMedicoArray = Object.values(faturamentoPorMedico).sort(
      (a, b) => b.valor - a.valor
    );

    // Total de vendas (atendimentos vendidos = consultas realizadas)
    const totalVendas = consultasRealizadas.length;

    return NextResponse.json({
      faturamentoClinica,
      faturamentoPorMedico: faturamentoPorMedicoArray,
      totalVendas,
      periodo: {
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados do dashboard" },
      { status: 500 }
    );
  }
}

