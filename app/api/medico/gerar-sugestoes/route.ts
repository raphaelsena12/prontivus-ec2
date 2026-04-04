import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateMedicalSuggestions } from "@/lib/openai-medical-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { anamnese, alergias, medicamentosEmUso, examesIds } = body;

    if (!anamnese || typeof anamnese !== "string" || !anamnese.trim()) {
      return NextResponse.json({ error: "Anamnese não fornecida ou inválida" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env" },
        { status: 500 }
      );
    }

    const suggestions = await generateMedicalSuggestions({
      anamnese,
      alergias: alergias || [],
      medicamentosEmUso: medicamentosEmUso || [],
      examesIds: examesIds || [],
    });

    // Validar CIDs sugeridos contra o catálogo real do banco.
    // CIDs inexistentes no catálogo são marcados com `validado: false` para o
    // frontend exibir aviso ao médico. Não são removidos para não perder a informação.
    if (suggestions.cidCodes.length > 0) {
      // Normaliza: remove pontos para corresponder ao formato do banco (G43.0 → G430)
      const normalize = (code: string) => code.toUpperCase().replace(/\./g, "");

      const codigosIA = suggestions.cidCodes.map((c) => normalize(c.code));

      const cidsCatalogo = await prisma.cid.findMany({
        where: { codigo: { in: codigosIA } },
        select: { codigo: true, descricao: true },
      });

      const catalogoMap = new Map(cidsCatalogo.map((c) => [normalize(c.codigo), c.descricao]));

      suggestions.cidCodes = suggestions.cidCodes.map((cid) => {
        const codigoNorm = normalize(cid.code);
        return {
          ...cid,
          validado: catalogoMap.has(codigoNorm),
          // Usa descrição oficial do catálogo se disponível
          description: catalogoMap.get(codigoNorm) ?? cid.description,
        };
      });
    }

    return NextResponse.json({ success: true, ...suggestions });
  } catch (error: any) {
    console.error("Erro ao gerar sugestões:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar sugestões com IA" },
      { status: 500 }
    );
  }
}
