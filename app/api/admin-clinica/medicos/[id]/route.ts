import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const medicoEspecialidadeItemSchema = z.object({
  especialidadeId: z.string().uuid("especialidadeId inválido"),
  categoriaId: z.string().uuid("categoriaId inválido").nullable().optional(),
  rqe: z.string().min(1, "RQE é obrigatório"),
});

const updateMedicoSchema = z.object({
  crm: z.string().regex(/^\d{4,10}$/, "CRM deve conter apenas números (4 a 10 dígitos)").optional(),
  ufCrm: z.string().regex(/^[A-Z]{2}$/, "UF do CRM deve ter 2 letras maiúsculas (ex: SP)").optional(),
  codigoCbo: z.string().regex(/^\d{6}$/, "Código CBO-S deve ter exatamente 6 dígitos numéricos").optional(),
  especialidades: z.array(medicoEspecialidadeItemSchema).min(1).optional(),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean().optional(),
});

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const medico = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        medicoEspecialidades: {
          select: {
            id: true,
            rqe: true,
            especialidade: { select: { id: true, codigo: true, nome: true } },
            categoria: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ medico });
  } catch (error) {
    console.error("Erro ao buscar médico:", error);
    return NextResponse.json(
      { error: "Erro ao buscar médico" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const medicoExistente = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!medicoExistente) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateMedicoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const data = validation.data;

    // Se CRM foi alterado, verificar duplicidade
    if (data.crm && data.crm !== medicoExistente.crm) {
      const medicoComCrm = await prisma.medico.findFirst({
        where: {
          crm: data.crm,
          clinicaId: auth.clinicaId,
          id: { not: id },
        },
      });

      if (medicoComCrm) {
        return NextResponse.json(
          { error: "CRM já cadastrado para outro médico" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      ...data,
    };

    if (data.especialidades) {
      const especialidadePrincipal = await prisma.especialidadeMedica.findUnique({
        where: { id: data.especialidades[0].especialidadeId },
        select: { nome: true },
      });
      updateData.especialidade = especialidadePrincipal?.nome || medicoExistente.especialidade;

      // Substituir lista inteira
      updateData.medicoEspecialidades = {
        deleteMany: {},
        create: data.especialidades.map((it) => ({
          especialidadeId: it.especialidadeId,
          categoriaId: it.categoriaId ?? null,
          rqe: it.rqe,
        })),
      };
    }

    const medico = await prisma.medico.update({
      where: { id },
      data: updateData,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        medicoEspecialidades: {
          select: {
            id: true,
            rqe: true,
            especialidade: { select: { id: true, codigo: true, nome: true } },
            categoria: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    return NextResponse.json({ medico });
  } catch (error) {
    console.error("Erro ao atualizar médico:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar médico" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const medico = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    await prisma.medico.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Médico excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar médico:", error);
    return NextResponse.json(
      { error: "Erro ao deletar médico" },
      { status: 500 }
    );
  }
}















