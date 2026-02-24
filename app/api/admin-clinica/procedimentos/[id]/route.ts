import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProcedimentoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório").optional(),
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  ativo: z.boolean().optional(),
  medicamentos: z.array(z.object({
    medicamentoId: z.string(),
    quantidade: z.number().optional(),
    observacoes: z.string().optional(),
  })).optional(),
  insumos: z.array(z.object({
    insumoId: z.string(),
    quantidade: z.number().optional(),
    observacoes: z.string().optional(),
  })).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const procedimento = await prisma.procedimento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
      include: {
        procedimentosMedicamentos: {
          include: {
            medicamento: true,
          },
        },
        procedimentosInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });

    if (!procedimento) {
      return NextResponse.json(
        { error: "Procedimento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ procedimento });
  } catch (error) {
    console.error("Erro ao buscar procedimento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar procedimento" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const procedimentoExistente = await prisma.procedimento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!procedimentoExistente) {
      return NextResponse.json(
        { error: "Procedimento não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateProcedimentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Se código foi alterado, verificar duplicidade
    if (data.codigo && data.codigo !== procedimentoExistente.codigo) {
      const procedimentoComCodigo = await prisma.procedimento.findFirst({
        where: {
          codigo: data.codigo,
          clinicaId: auth.clinicaId!,
          id: { not: id },
        },
      });

      if (procedimentoComCodigo) {
        return NextResponse.json(
          { error: "Código já cadastrado para outro procedimento" },
          { status: 409 }
        );
      }
    }

    const updateData: any = { ...data };
    if (data.valor !== undefined) {
      updateData.valor = data.valor;
    }

    // Remover medicamentos e insumos do updateData para processar separadamente
    const { medicamentos, insumos, ...procedimentoData } = updateData;

    // Atualizar procedimento
    const procedimento = await prisma.procedimento.update({
      where: { id },
      data: procedimentoData,
    });

    // Atualizar medicamentos se fornecidos
    if (medicamentos !== undefined) {
      // Deletar relações antigas
      await prisma.procedimentoMedicamento.deleteMany({
        where: { procedimentoId: id },
      });
      // Criar novas relações
      if (medicamentos.length > 0) {
        await prisma.procedimentoMedicamento.createMany({
          data: medicamentos.map((m: any) => ({
            procedimentoId: id,
            medicamentoId: m.medicamentoId,
            quantidade: m.quantidade ? m.quantidade : null,
            observacoes: m.observacoes || null,
          })),
        });
      }
    }

    // Atualizar insumos se fornecidos
    if (insumos !== undefined) {
      // Deletar relações antigas
      await prisma.procedimentoInsumo.deleteMany({
        where: { procedimentoId: id },
      });
      // Criar novas relações
      if (insumos.length > 0) {
        await prisma.procedimentoInsumo.createMany({
          data: insumos.map((i: any) => ({
            procedimentoId: id,
            insumoId: i.insumoId,
            quantidade: i.quantidade ? i.quantidade : null,
            observacoes: i.observacoes || null,
          })),
        });
      }
    }

    // Buscar procedimento atualizado com relações
    const procedimentoAtualizado = await prisma.procedimento.findFirst({
      where: { id },
      include: {
        procedimentosMedicamentos: {
          include: {
            medicamento: true,
          },
        },
        procedimentosInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });

    return NextResponse.json({ procedimento: procedimentoAtualizado });
  } catch (error) {
    console.error("Erro ao atualizar procedimento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar procedimento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const procedimento = await prisma.procedimento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!procedimento) {
      return NextResponse.json(
        { error: "Procedimento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.procedimento.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Procedimento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar procedimento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar procedimento" },
      { status: 500 }
    );
  }
}















