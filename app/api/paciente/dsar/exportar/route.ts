import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { auditLog } from "@/lib/audit-log";

/**
 * GET /api/paciente/dsar/exportar
 * Exporta todos os dados pessoais do paciente em formato JSON (Art. 18 LGPD).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const pacienteSelect = {
      id: true,
      nome: true,
      cpf: true,
      rg: true,
      dataNascimento: true,
      sexo: true,
      email: true,
      telefone: true,
      celular: true,
      cep: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      profissao: true,
      estadoCivil: true,
      observacoes: true,
      cns: true,
      numeroCarteirinha: true,
      clinicaId: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    let paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        ...(session.user.clinicaId ? { clinicaId: session.user.clinicaId } : {}),
        ativo: true,
      },
      select: pacienteSelect,
    });

    if (!paciente) {
      paciente = await prisma.paciente.findFirst({
        where: { usuarioId: session.user.id, ativo: true },
        select: pacienteSelect,
      });
    }

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const clinicaId = paciente.clinicaId;

    // Buscar dados relacionados em paralelo
    const [consultas, prontuarios, prescricoes, exames, consentimentos, pagamentos] =
      await Promise.all([
        prisma.consulta.findMany({
          where: { pacienteId: paciente.id, clinicaId },
          select: {
            id: true,
            dataHora: true,
            dataHoraFim: true,
            status: true,
            observacoes: true,
            modalidade: true,
            pressaoSistolica: true,
            pressaoDiastolica: true,
            frequenciaCardiaca: true,
            saturacaoO2: true,
            temperatura: true,
            peso: true,
            altura: true,
            medico: {
              select: {
                usuario: { select: { nome: true } },
                especialidade: true,
              },
            },
          },
          orderBy: { dataHora: "desc" },
        }),
        prisma.prontuario.findMany({
          where: { pacienteId: paciente.id, clinicaId },
          select: {
            id: true,
            anamnese: true,
            exameFisico: true,
            diagnostico: true,
            conduta: true,
            orientacoesConduta: true,
            orientacoes: true,
            evolucao: true,
            createdAt: true,
            medico: {
              select: {
                usuario: { select: { nome: true } },
                especialidade: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.consultaPrescricao.findMany({
          where: { clinicaId, consulta: { pacienteId: paciente.id } },
          select: {
            id: true,
            medicamento: true,
            dosagem: true,
            posologia: true,
            duracao: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.examePaciente.findMany({
          where: { pacienteId: paciente.id, clinicaId },
          select: {
            id: true,
            nome: true,
            tipoArquivo: true,
            nomeArquivo: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.consentimentoLGPD.findMany({
          where: { pacienteId: paciente.id, clinicaId },
          select: {
            id: true,
            versaoTermo: true,
            canalAceite: true,
            aceitoEm: true,
            revogadoEm: true,
          },
          orderBy: { aceitoEm: "desc" },
        }),
        prisma.pagamentoConsulta.findMany({
          where: { pacienteId: paciente.id, clinicaId },
          select: {
            id: true,
            valor: true,
            metodoPagamento: true,
            status: true,
            dataPagamento: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const exportData = {
      exportadoEm: new Date().toISOString(),
      tipoExportacao: "LGPD - Art. 18 - Direito de Acesso aos Dados",
      dadosPessoais: paciente,
      consultas: consultas.map((c) => ({
        ...c,
        medico: c.medico
          ? `${c.medico.usuario.nome} (${c.medico.especialidade})`
          : null,
      })),
      prontuarios: prontuarios.map((p) => ({
        ...p,
        medico: p.medico
          ? `${p.medico.usuario.nome} (${p.medico.especialidade})`
          : null,
      })),
      prescricoes,
      exames: exames.map((e) => ({
        id: e.id,
        nome: e.nome,
        tipoArquivo: e.tipoArquivo,
        nomeArquivo: e.nomeArquivo,
        dataUpload: e.createdAt,
      })),
      consentimentosLGPD: consentimentos,
      pagamentos,
    };

    auditLog({
      userId: session.user.id,
      userTipo: session.user.tipo,
      clinicaId,
      action: "EXPORT",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        operacao: "Exportação de dados pessoais (LGPD Art. 18)",
        pacienteNome: paciente.nome,
        totalConsultas: consultas.length,
        totalProntuarios: prontuarios.length,
        totalPrescricoes: prescricoes.length,
        totalExames: exames.length,
      },
      req: request,
    });

    // Retornar como JSON com header de download
    const fileName = `dados-pessoais-${paciente.nome.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao exportar dados do paciente:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
