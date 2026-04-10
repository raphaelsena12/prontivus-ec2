import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  buildTissXml,
  TissGuia,
  TissGuiaConsulta,
  TissGuiaSPSADT,
  TissProfissionalExecutante,
  TissProcedimentoExecutadoSadt,
} from "@/tiss/xml-builder";

/** Mapeia conselho do sistema para código TISS dm_conselhoProfissional */
function mapConselhoProfissional(_especialidade: string): string {
  // Default "06" = CRM (Conselho Regional de Medicina)
  return "06";
}

/** Mapeia a modalidade da consulta para dm_regimeAtendimento */
function mapRegimeAtendimento(modalidade?: string, regimeSalvo?: string): string {
  if (regimeSalvo) return regimeSalvo;
  if (modalidade === "TELEMEDICINA") return "05"; // Telessaúde
  return "01"; // Ambulatorial
}

/** Extrai apenas dígitos do CRM (ex: "CRM-SP 123456" → "123456") */
function normalizeCRM(crm: string): string {
  return crm.replace(/\D/g, "");
}

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
          medico: {
            include: {
              usuario: { select: { nome: true } },
            },
          },
          consulta: {
            select: {
              medicoId: true,
              modalidade: true,
              medico: {
                include: {
                  usuario: { select: { nome: true } },
                },
              },
            },
          },
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
  const invalid = lote.guias.filter(
    (g) => !["VALIDADA", "LOTE"].includes(g.status)
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: `Guias com status inválido para geração de XML: ${invalid.map((g) => g.numeroGuia).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Buscar dados da clínica (prestador)
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { nome: true, cnpj: true, codigoCnes: true },
  });

  if (!clinica) {
    return NextResponse.json(
      { error: "Clínica não encontrada" },
      { status: 404 }
    );
  }

  const cnpjLimpo = clinica.cnpj.replace(/\D/g, "");
  const cnes = clinica.codigoCnes ?? "";

  if (!cnes) {
    return NextResponse.json(
      { error: "CNES da clínica não cadastrado. Configure nas configurações da clínica." },
      { status: 400 }
    );
  }

  const registroANS = lote.operadora.codigoAns?.replace(/\D/g, "") ?? "";
  if (registroANS.length !== 6) {
    return NextResponse.json(
      { error: `Código ANS da operadora inválido: "${lote.operadora.codigoAns}". Deve ter 6 dígitos.` },
      { status: 400 }
    );
  }

  // Verificar se todas as guias têm médico associado
  const guiasSemMedico = lote.guias.filter(
    (g) => !g.medico && !g.consulta?.medico
  );
  if (guiasSemMedico.length > 0) {
    return NextResponse.json(
      {
        error: `Guias sem médico vinculado: ${guiasSemMedico.map((g) => g.numeroGuia ?? g.id.slice(0, 8)).join(", ")}. Vincule o médico antes de gerar o XML.`,
      },
      { status: 400 }
    );
  }

  // Build guias for XML
  const guiasXml: TissGuia[] = lote.guias.map((guia) => {
    // Determinar médico — prioridade: guia.medico > consulta.medico
    const medico = guia.medico ?? guia.consulta?.medico;
    const nomeMedico = medico?.usuario?.nome ?? "";
    const modalidade = guia.consulta?.modalidade ?? "PRESENCIAL";

    const profissional: TissProfissionalExecutante = {
      nomeProfissional: nomeMedico,
      conselhoProfissional: mapConselhoProfissional(medico?.especialidade ?? ""),
      numeroConselhoProfissional: normalizeCRM(medico?.crm ?? ""),
      uf: medico?.ufCrm ?? "SP",
      cbos: medico?.codigoCbo ?? "225120", // 225120 = Médico clínico geral (fallback)
    };

    const valorTotal = guia.procedimentos.reduce(
      (acc, p) => acc + Number(p.valorTotal),
      0
    );

    const numeroGuiaPrestador = guia.numeroGuia ?? guia.id.slice(0, 20);

    if (guia.tipoGuia === "CONSULTA") {
      const proc = guia.procedimentos[0];
      const consulta: TissGuiaConsulta = {
        tipo: "CONSULTA",
        registroANS,
        numeroGuiaPrestador,
        numeroCarteira: guia.numeroCarteirinha,
        atendimentoRN: "N",
        contratadoExecutante: {
          cnpjContratado: cnpjLimpo,
          cnes,
        },
        profissionalExecutante: profissional,
        indicacaoAcidente: guia.indicacaoAcidente ?? "9",
        dadosAtendimento: {
          regimeAtendimento: mapRegimeAtendimento(
            modalidade,
            guia.regimeAtendimento
          ),
          dataAtendimento: guia.dataAtendimento,
          tipoConsulta: guia.tipoConsulta ?? "1",
          procedimento: {
            codigoTabela: "22", // TUSS - Procedimentos e eventos em saúde
            codigoProcedimento: proc?.codigoTuss?.codigoTuss ?? "",
            valorProcedimento: valorTotal,
          },
        },
      };
      return consulta;
    }

    // SPSADT
    const procedimentosExec: TissProcedimentoExecutadoSadt[] =
      guia.procedimentos.map((p, idx) => ({
        sequencialItem: idx + 1,
        dataExecucao: guia.dataAtendimento,
        procedimento: {
          codigoTabela: "22",
          codigoProcedimento: p.codigoTuss?.codigoTuss ?? "",
          descricaoProcedimento: p.codigoTuss?.descricao ?? "",
        },
        quantidadeExecutada: p.quantidade,
        reducaoAcrescimo: 1.0,
        valorUnitario: Number(p.valorUnitario),
        valorTotal: Number(p.valorTotal),
      }));

    const spsadt: TissGuiaSPSADT = {
      tipo: "SPSADT",
      registroANS,
      numeroGuiaPrestador,
      numeroCarteira: guia.numeroCarteirinha,
      atendimentoRN: "N",
      dadosSolicitante: {
        contratadoSolicitante: {
          cnpjContratado: cnpjLimpo,
        },
        nomeContratadoSolicitante: clinica.nome,
        profissionalSolicitante: profissional,
      },
      dadosSolicitacao: {
        caraterAtendimento: guia.caraterAtendimento ?? "1",
        indicacaoClinica: guia.observacoes ?? undefined,
      },
      dadosExecutante: {
        contratadoExecutante: {
          cnpjContratado: cnpjLimpo,
        },
        cnes,
      },
      dadosAtendimento: {
        tipoAtendimento: guia.tipoGuia === "SPSADT" ? "03" : "04",
        indicacaoAcidente: guia.indicacaoAcidente ?? "9",
        regimeAtendimento: mapRegimeAtendimento(
          modalidade,
          guia.regimeAtendimento
        ),
      },
      procedimentosExecutados: procedimentosExec,
      valorTotal: {
        valorProcedimentos: valorTotal,
        valorTotalGeral: valorTotal,
      },
    };
    return spsadt;
  });

  // Determinar o profissional principal (do primeiro guia, para o cabeçalho)
  const primeiroMedico =
    lote.guias[0].medico ?? lote.guias[0].consulta?.medico;

  const xml = buildTissXml({
    numeroLote: lote.numeroLote,
    sequencialTransacao: `${Date.now()}`.slice(0, 12),
    prestador: {
      cnpj: cnpjLimpo,
      cnes,
      nomeContratado: clinica.nome,
    },
    operadora: {
      registroANS,
    },
    profissionalExecutante: {
      nomeProfissional: primeiroMedico?.usuario?.nome ?? "",
      conselhoProfissional: "06",
      numeroConselhoProfissional: normalizeCRM(primeiroMedico?.crm ?? ""),
      uf: primeiroMedico?.ufCrm ?? "SP",
      cbos: primeiroMedico?.codigoCbo ?? "225120",
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
