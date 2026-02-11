import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { buscarValorTuss, verificarAceitacaoTuss } from "@/lib/tuss-helpers";
import { z } from "zod";

const buscarValorSchema = z.object({
  codigoTussId: z.string().uuid("ID do código TUSS inválido"),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional().nullable(),
  dataReferencia: z.string().transform((str) => new Date(str)).optional(),
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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
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

// POST /api/admin-clinica/tuss-valores/buscar
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = buscarValorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código TUSS é aceito pela operadora/plano
    const aceitacao = await verificarAceitacaoTuss(
      data.codigoTussId,
      data.operadoraId || null,
      data.planoSaudeId || null
    );

    if (!aceitacao.aceito) {
      return NextResponse.json(
        {
          error: "Código TUSS não aceito",
          motivo: aceitacao.motivo,
        },
        { status: 400 }
      );
    }

    // Buscar valor hierárquico
    const resultado = await buscarValorTuss({
      clinicaId: auth.clinicaId!,
      codigoTussId: data.codigoTussId,
      operadoraId: data.operadoraId || null,
      planoSaudeId: data.planoSaudeId || null,
      tipoConsultaId: data.tipoConsultaId || null,
      dataReferencia: data.dataReferencia || new Date(),
    });

    if (!resultado.valor) {
      return NextResponse.json(
        {
          error: "Valor não encontrado",
          motivo: resultado.motivo,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valor: resultado.valor,
      valorId: resultado.valorId,
    });
  } catch (error) {
    console.error("Erro ao buscar valor TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao buscar valor TUSS" },
      { status: 500 }
    );
  }
}

