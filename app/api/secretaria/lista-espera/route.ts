import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const adicionarListaEsperaSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid(),
  observacoes: z.string().optional(),
  prioridade: z.number().int().min(0).default(0),
});

// GET /api/secretaria/lista-espera - Listar pacientes na lista de espera
export async function GET(request: NextRequest) {
  try {
    const auth = await checkSecretariaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(medicoId && { medicoId }),
    };

    const listasEspera = await prisma.listaEspera.findMany({
      where,
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
      },
      orderBy: [
        { prioridade: "desc" }, // Maior prioridade primeiro
        { createdAt: "asc" }, // Mais antigo primeiro
      ],
    });

    return NextResponse.json({ listasEspera }, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar lista de espera:", error);
    return NextResponse.json(
      { error: "Erro ao listar lista de espera" },
      { status: 500 }
    );
  }
}

// POST /api/secretaria/lista-espera - Adicionar paciente à lista de espera
export async function POST(request: NextRequest) {
  try {
    const auth = await checkSecretariaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const data = adicionarListaEsperaSchema.parse(body);

    // Verificar se o paciente já está na lista de espera deste médico
    const jaExiste = await prisma.listaEspera.findFirst({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
        pacienteId: data.pacienteId,
      },
    });

    if (jaExiste) {
      return NextResponse.json(
        { error: "Paciente já está na lista de espera deste médico" },
        { status: 400 }
      );
    }

    // Verificar se o médico pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: data.medicoId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado ou inativo" },
        { status: 404 }
      );
    }

    // Verificar se o paciente pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: data.pacienteId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou inativo" },
        { status: 404 }
      );
    }

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 400 }
      );
    }

    const listaEspera = await prisma.listaEspera.create({
      data: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
        pacienteId: data.pacienteId,
        observacoes: data.observacoes,
        prioridade: data.prioridade,
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
      },
    });

    return NextResponse.json({ listaEspera }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao adicionar à lista de espera:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar à lista de espera" },
      { status: 500 }
    );
  }
}

