import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const chamarPacienteSchema = z.object({
  dataHora: z.string().transform((str) => new Date(str)),
  codigoTussId: z.string().uuid(),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().optional().nullable(),
  observacoes: z.string().optional(),
});

// POST /api/secretaria/lista-espera/[id]/chamar - Chamar paciente da lista de espera (criar agendamento)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkSecretariaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const data = chamarPacienteSchema.parse(body);

    // Buscar a entrada na lista de espera
    const listaEspera = await prisma.listaEspera.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
      include: {
        paciente: true,
        medico: {
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!listaEspera) {
      return NextResponse.json(
        { error: "Entrada não encontrada na lista de espera" },
        { status: 404 }
      );
    }

    // Verificar se já existe um agendamento no mesmo horário para o médico
    const agendamentoExistente = await prisma.consulta.findFirst({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: listaEspera.medicoId,
        dataHora: data.dataHora,
        status: {
          notIn: ["CANCELADA"],
        },
      },
    });

    if (agendamentoExistente) {
      return NextResponse.json(
        { error: "Já existe um agendamento neste horário para este médico" },
        { status: 400 }
      );
    }

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 400 }
      );
    }

    // Criar o agendamento
    const agendamento = await prisma.consulta.create({
      data: {
        clinicaId: auth.clinicaId,
        pacienteId: listaEspera.pacienteId,
        medicoId: listaEspera.medicoId,
        dataHora: data.dataHora,
        codigoTussId: data.codigoTussId,
        tipoConsultaId: data.tipoConsultaId,
        procedimentoId: data.procedimentoId,
        operadoraId: data.operadoraId,
        planoSaudeId: data.planoSaudeId,
        numeroCarteirinha: data.numeroCarteirinha,
        valorCobrado: data.valorCobrado,
        observacoes: data.observacoes || listaEspera.observacoes,
        status: "AGENDADA",
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            celular: true,
            email: true,
            dataNascimento: true,
            numeroProntuario: true,
          },
        },
        medico: {
          select: {
            id: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                avatar: true,
              },
            },
            crm: true,
            especialidade: true,
          },
        },
        codigoTuss: {
          select: {
            codigoTuss: true,
            descricao: true,
          },
        },
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
        operadora: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
        planoSaude: {
          select: {
            nome: true,
          },
        },
      },
    });

    // Remover da lista de espera
    await prisma.listaEspera.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        agendamento,
        message: "Paciente chamado da lista de espera e agendamento criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao chamar paciente da lista de espera:", error);
    return NextResponse.json(
      { error: "Erro ao chamar paciente da lista de espera" },
      { status: 500 }
    );
  }
}

