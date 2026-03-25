import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateCodigoTussSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(500).optional(),
  descricaoDetalhada: z.string().optional(),
  tipoProcedimento: z
    .enum([
      "CONSULTA",
      "EXAME",
      "PROCEDIMENTO_AMBULATORIAL",
      "CIRURGIA",
      "OUTROS",
    ])
    .optional(),
  categoriaExame: z
    .enum([
      "LABORATORIAL",
      "IMAGEM",
      "ANATOMOPATOLOGICO",
      "FUNCIONAL",
      "GENETICO",
      "OUTROS",
    ])
    .optional()
    .nullable(),
  grupoId: z.string().uuid().optional().nullable(),
  dataVigenciaInicio: z.string().transform((str) => new Date(str)).optional(),
  dataVigenciaFim: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .nullable(),
  ativo: z.boolean().optional(),
  observacoes: z.string().optional(),
  especialidadesIds: z.array(z.string().uuid()).optional(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

// PATCH /api/super-admin/codigos-tuss/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const validation = updateCodigoTussSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const codigoTussExistente = await prisma.codigoTuss.findUnique({
      where: { id },
    });
    if (!codigoTussExistente) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.descricaoDetalhada !== undefined)
      updateData.descricaoDetalhada = data.descricaoDetalhada;
    if (data.tipoProcedimento !== undefined)
      updateData.tipoProcedimento = data.tipoProcedimento;
    if (data.categoriaExame !== undefined || data.tipoProcedimento !== undefined) {
      const tipo = data.tipoProcedimento ?? codigoTussExistente.tipoProcedimento;
      updateData.categoriaExame = tipo === "EXAME" ? (data.categoriaExame ?? null) : null;
    }
    if (data.grupoId !== undefined) updateData.grupoId = data.grupoId;
    if (data.dataVigenciaInicio !== undefined)
      updateData.dataVigenciaInicio = data.dataVigenciaInicio;
    if (data.dataVigenciaFim !== undefined)
      updateData.dataVigenciaFim = data.dataVigenciaFim;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

    await prisma.codigoTuss.update({
      where: { id },
      data: updateData,
    });

    if (data.especialidadesIds !== undefined) {
      await prisma.tussEspecialidade.deleteMany({
        where: { codigoTussId: id },
      });

      if (data.especialidadesIds.length > 0) {
        await Promise.all(
          data.especialidadesIds.map((especialidadeId: string) =>
            prisma.tussEspecialidade.create({
              data: {
                codigoTussId: id,
                especialidadeId,
              },
            })
          )
        );
      }
    }

    const codigoTussCompleto = await prisma.codigoTuss.findUnique({
      where: { id },
      include: {
        grupo: true,
        tussEspecialidades: {
          include: {
            especialidade: true,
          },
        },
      },
    });

    return NextResponse.json({ codigoTuss: codigoTussCompleto });
  } catch (error) {
    console.error("Erro ao atualizar código TUSS (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao atualizar código TUSS" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/codigos-tuss/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get("cascade") === "true";

    const { id } = await params;

    const codigoTuss = await prisma.codigoTuss.findUnique({
      where: { id },
    });

    if (!codigoTuss) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    // Evitar violação de FK: se o código estiver em uso, não deletar (a menos que cascade=true).
    const [valoresCount, operadorasCount, consultasCount, guiasProcCount, examesCount] =
      await Promise.all([
        prisma.tussValor.count({ where: { codigoTussId: id } }),
        prisma.tussOperadora.count({ where: { codigoTussId: id } }),
        prisma.consulta.count({ where: { codigoTussId: id } }),
        prisma.guiaTissProcedimento.count({ where: { codigoTussId: id } }),
        prisma.exame.count({ where: { codigoTussId: id } }),
      ]);

    const totalRefs =
      valoresCount + operadorasCount + consultasCount + guiasProcCount + examesCount;

    if (totalRefs > 0 && !cascade) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir este Código TUSS porque ele está sendo usado. Inative o código ao invés de excluir.",
          refs: {
            tussValores: valoresCount,
            tussOperadoras: operadorasCount,
            consultas: consultasCount,
            guiasTissProcedimentos: guiasProcCount,
            exames: examesCount,
          },
        },
        { status: 409 }
      );
    }

    if (cascade) {
      // Exclusão em cascata (controlada): remove dependências que bloqueiam a FK e então remove o código.
      // ATENÇÃO: isso pode remover consultas e seus dependentes (por cascata do schema).
      const result = await prisma.$transaction(
        async (tx) => {
          // 1) Telemedicina: sessões referenciam Consulta (FK restritiva)
          // Evitar IN gigante: filtrar via relações (subquery) pelo codigoTussId das consultas
          await tx.telemedicineConsent.deleteMany({
            where: { session: { consulta: { codigoTussId: id } } },
          });
          await tx.telemedicineLog.deleteMany({
            where: { session: { consulta: { codigoTussId: id } } },
          });
          await tx.telemedicineParticipant.deleteMany({
            where: { session: { consulta: { codigoTussId: id } } },
          });
          await tx.telemedicineSession.deleteMany({
            where: { consulta: { codigoTussId: id } },
          });

        const deletedTussValores = await tx.tussValor.deleteMany({
          where: { codigoTussId: id },
        });
        const deletedTussOperadoras = await tx.tussOperadora.deleteMany({
          where: { codigoTussId: id },
        });
        const deletedTussEspecialidades = await tx.tussEspecialidade.deleteMany({
          where: { codigoTussId: id },
        });
        const deletedGuiasTissProcedimentos = await tx.guiaTissProcedimento.deleteMany({
          where: { codigoTussId: id },
        });
        const deletedConsultas = await tx.consulta.deleteMany({
          where: { codigoTussId: id },
        });

        // Exames têm ON DELETE SET NULL no FK; não precisa deletar.

        const deletedCodigo = await tx.codigoTuss.delete({
          where: { id },
        });

        return {
          deletedCodigo,
          counts: {
            tussValores: deletedTussValores.count,
            tussOperadoras: deletedTussOperadoras.count,
            tussEspecialidades: deletedTussEspecialidades.count,
            guiasTissProcedimentos: deletedGuiasTissProcedimentos.count,
            consultas: deletedConsultas.count,
          },
        };
        },
        // A exclusão em cascata pode ser pesada; aumentar timeout da transação interativa
        { timeout: 600_000, maxWait: 10_000 }
      );

      return NextResponse.json({
        message: "Código TUSS excluído com sucesso (cascade).",
        cascade: true,
        deleted: result.counts,
      });
    } else {
      await prisma.codigoTuss.delete({
        where: { id },
      });
    }

    return NextResponse.json({ message: "Código TUSS excluído com sucesso" });
  } catch (error: any) {
    console.error("Erro ao deletar código TUSS (super-admin):", error);
    // Prisma FK violation
    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir este Código TUSS porque ele está sendo usado (restrição de chave estrangeira). Inative o código ao invés de excluir.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao deletar código TUSS" },
      { status: 500 }
    );
  }
}

