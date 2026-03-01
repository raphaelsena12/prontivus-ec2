import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { gerarRelatorioPdf } from "@/lib/pdf/gerar-relatorio";
import { TipoRelatorio } from "@/lib/pdf/relatorios";

const TIPOS_VALIDOS: TipoRelatorio[] = [
  "faturamento",
  "vendas",
  "faturamento-medico",
  "estoque",
  "contas-pagar",
  "contas-receber",
];

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response!;

    const clinicaId = auth.clinicaId!;

    const body = await request.json();
    const { tipo, dataInicio, dataFim } = body as {
      tipo: string;
      dataInicio: string;
      dataFim: string;
    };

    if (!tipo || !TIPOS_VALIDOS.includes(tipo as TipoRelatorio)) {
      return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: "Período obrigatório" }, { status: 400 });
    }

    const pdfBuffer = await gerarRelatorioPdf(tipo as TipoRelatorio, clinicaId, dataInicio, dataFim);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio-${tipo}-${dataInicio}-${dataFim}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
