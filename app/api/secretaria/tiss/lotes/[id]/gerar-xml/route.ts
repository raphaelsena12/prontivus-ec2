import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { buildTissXml, TissGuia } from "@/tiss/xml-builder";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const lote = await prisma.loteTiss.findFirst({
    where: { id, clinicaId },
    include: {
      operadora: true,
      guias: {
        include: {
          paciente: true,
          procedimentos: {
            include: { codigoTuss: true },
          },
        },
      },
    },
  });

  if (!lote) {
    return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
  }

  if (lote.guias.length === 0) {
    return NextResponse.json({ error: "Lote sem guias" }, { status: 400 });
  }

  // Verify all guias are VALIDADA or LOTE
  const invalid = lote.guias.filter((g) => !["VALIDADA", "LOTE"].includes(g.status));
  if (invalid.length > 0) {
    return NextResponse.json({
      error: `Guias com status inválido para geração de XML: ${invalid.map((g) => g.numeroGuia).join(", ")}`,
    }, { status: 400 });
  }

  // Buscar dados da clínica (prestador)
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { nome: true, cnpj: true },
  });

  if (!clinica) {
    return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
  }

  // Build guias for XML
  const guiasXml: TissGuia[] = lote.guias.map((guia) => {
    const base = {
      numeroGuia: guia.numeroGuia ?? guia.id,
      numeroCarteirinha: guia.numeroCarteirinha,
      nomeBeneficiario: guia.paciente.nome,
      cpfBeneficiario: guia.paciente.cpf,
      dataAtendimento: guia.dataAtendimento,
      valorTotal: guia.procedimentos.reduce((acc, p) => acc + Number(p.valorTotal), 0),
    };

    if (guia.tipoGuia === "CONSULTA") {
      const proc = guia.procedimentos[0];
      return {
        tipo: "CONSULTA" as const,
        ...base,
        codigoTuss: proc?.codigoTuss.codigoTuss ?? "",
        descricaoProcedimento: proc?.codigoTuss.descricao ?? "",
      };
    }

    return {
      tipo: "SPSADT" as const,
      ...base,
      procedimentos: guia.procedimentos.map((p) => ({
        codigoTuss: p.codigoTuss.codigoTuss,
        descricao: p.codigoTuss.descricao,
        quantidade: p.quantidade,
        valorUnitario: Number(p.valorUnitario),
        valorTotal: Number(p.valorTotal),
      })),
    };
  });

  const xml = buildTissXml({
    numeroLote: lote.numeroLote,
    sequencialTransacao: `${Date.now()}`,
    prestador: {
      codigoPrestador: clinica.cnpj.replace(/\D/g, ""),
      nomeEmpresarial: clinica.nome,
    },
    operadora: {
      codigoAns: lote.operadora.codigoAns,
      razaoSocial: lote.operadora.razaoSocial,
    },
    guias: guiasXml,
  });

  // Save XML and update status
  await prisma.loteTiss.update({
    where: { id },
    data: {
      xmlLote: xml,
      status: "XML_GERADO",
      dataGeracao: new Date(),
    },
  });

  await prisma.guiaTiss.updateMany({
    where: { loteId: id },
    data: { status: "GERADA" },
  });

  return NextResponse.json({ success: true, xml });
}
