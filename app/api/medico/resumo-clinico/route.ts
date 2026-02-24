import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

// POST /api/medico/resumo-clinico - Gerar resumo clínico do paciente
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { pacienteId } = body;

    if (!pacienteId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Validar credenciais OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env",
        },
        { status: 500 }
      );
    }

    // Buscar dados do paciente
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar todos os dados do paciente em paralelo
    const [
      consultas,
      prontuarios,
      solicitacoesExames,
      prescricoes,
      documentos,
    ] = await Promise.all([
      // Consultas
      prisma.consulta.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          tipoConsulta: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          dataHora: "desc",
        },
        take: 50, // Limitar a 50 consultas mais recentes
      }),

      // Prontuários
      prisma.prontuario.findMany({
        where: {
          pacienteId,
          clinicaId: auth.clinicaId,
        },
        include: {
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limitar a 50 prontuários mais recentes
      }),

      // Solicitações de exames
      prisma.solicitacaoExame.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        include: {
          exame: {
            select: {
              nome: true,
              tipo: true,
              descricao: true,
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
        },
        orderBy: {
          dataSolicitacao: "desc",
        },
        take: 100, // Limitar a 100 exames mais recentes
      }),

      // Prescrições de medicamentos
      prisma.prescricaoMedicamento.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        include: {
          medicamento: {
            select: {
              nome: true,
              principioAtivo: true,
              laboratorio: true,
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Limitar a 100 prescrições mais recentes
      }),

      // Documentos gerados (exames, laudos, etc)
      prisma.documentoGerado.findMany({
        where: {
          consulta: {
            pacienteId,
            clinicaId: auth.clinicaId,
          },
        },
        select: {
          id: true,
          nomeDocumento: true,
          tipoDocumento: true,
          createdAt: true,
          consulta: {
            select: {
              dataHora: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limitar a 50 documentos mais recentes
      }),
    ]);

    // Extrair alergias das observações do paciente
    const alergias: string[] = [];
    if (paciente.observacoes) {
      const obs = paciente.observacoes.toLowerCase();
      if (obs.includes('alergia') || obs.includes('alérgico')) {
        // Tentar extrair informações de alergia
        const alergiaMatch = obs.match(/(?:alergia|alérgico)[:\s]+([^,\.\n]+)/i);
        if (alergiaMatch) {
          alergias.push(alergiaMatch[1].trim());
        }
      }
    }

    // Construir contexto para a IA
    const idade = paciente.dataNascimento
      ? Math.floor((new Date().getTime() - new Date(paciente.dataNascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    let contextoClinico = `RESUMO CLÍNICO DO PACIENTE

DADOS PESSOAIS:
- Nome: ${paciente.nome}
- Idade: ${idade ? `${idade} anos` : 'Não informado'}
- Sexo: ${paciente.sexo || 'Não informado'}
- CPF: ${paciente.cpf || 'Não informado'}
${paciente.observacoes ? `- Observações: ${paciente.observacoes}` : ''}
${alergias.length > 0 ? `- Alergias: ${alergias.join(', ')}` : '- Alergias: Nenhuma alergia registrada'}

`;

    // Adicionar histórico de consultas
    if (consultas.length > 0) {
      contextoClinico += `\nHISTÓRICO DE CONSULTAS (${consultas.length} consultas):\n`;
      consultas.forEach((consulta, idx) => {
        const data = new Date(consulta.dataHora).toLocaleDateString('pt-BR');
        contextoClinico += `${idx + 1}. ${data} - ${consulta.tipoConsulta?.nome || 'Consulta'} - Dr(a). ${consulta.medico?.usuario?.nome || 'Não informado'}\n`;
      });
    } else {
      contextoClinico += '\nHISTÓRICO DE CONSULTAS: Nenhuma consulta registrada\n';
    }

    // Adicionar prontuários
    if (prontuarios.length > 0) {
      contextoClinico += `\nPRONTUÁRIOS (${prontuarios.length} registros):\n`;
      prontuarios.forEach((prontuario, idx) => {
        const data = prontuario.consulta?.dataHora
          ? new Date(prontuario.consulta.dataHora).toLocaleDateString('pt-BR')
          : 'Data não disponível';
        contextoClinico += `\n${idx + 1}. Prontuário de ${data}:\n`;
        if (prontuario.anamnese) {
          contextoClinico += `   Anamnese: ${prontuario.anamnese.substring(0, 500)}${prontuario.anamnese.length > 500 ? '...' : ''}\n`;
        }
        if (prontuario.diagnostico) {
          contextoClinico += `   Diagnóstico: ${prontuario.diagnostico}\n`;
        }
        if (prontuario.exameFisico) {
          contextoClinico += `   Exame Físico: ${prontuario.exameFisico.substring(0, 300)}${prontuario.exameFisico.length > 300 ? '...' : ''}\n`;
        }
        if (prontuario.conduta) {
          contextoClinico += `   Conduta: ${prontuario.conduta.substring(0, 300)}${prontuario.conduta.length > 300 ? '...' : ''}\n`;
        }
        if (prontuario.evolucao) {
          contextoClinico += `   Evolução: ${prontuario.evolucao.substring(0, 300)}${prontuario.evolucao.length > 300 ? '...' : ''}\n`;
        }
      });
    } else {
      contextoClinico += '\nPRONTUÁRIOS: Nenhum prontuário registrado\n';
    }

    // Adicionar exames solicitados
    if (solicitacoesExames.length > 0) {
      contextoClinico += `\nEXAMES SOLICITADOS (${solicitacoesExames.length} exames):\n`;
      const examesPorData = solicitacoesExames.reduce((acc: any, exame) => {
        const data = exame.consulta?.dataHora
          ? new Date(exame.consulta.dataHora).toLocaleDateString('pt-BR')
          : 'Data não disponível';
        if (!acc[data]) acc[data] = [];
        acc[data].push(exame.exame.nome);
        return acc;
      }, {});
      Object.entries(examesPorData).forEach(([data, exames]: [string, any]) => {
        contextoClinico += `- ${data}: ${exames.join(', ')}\n`;
      });
    } else {
      contextoClinico += '\nEXAMES SOLICITADOS: Nenhum exame solicitado\n';
    }

    // Adicionar prescrições
    if (prescricoes.length > 0) {
      contextoClinico += `\nPRESCRIÇÕES DE MEDICAMENTOS (${prescricoes.length} prescrições):\n`;
      const prescricoesPorData = prescricoes.reduce((acc: any, presc) => {
        const data = presc.consulta?.dataHora
          ? new Date(presc.consulta.dataHora).toLocaleDateString('pt-BR')
          : 'Data não disponível';
        if (!acc[data]) acc[data] = [];
        acc[data].push(`${presc.medicamento.nome} (${presc.medicamento.principioAtivo || 'N/A'})`);
        return acc;
      }, {});
      Object.entries(prescricoesPorData).forEach(([data, meds]: [string, any]) => {
        contextoClinico += `- ${data}: ${meds.join('; ')}\n`;
      });
    } else {
      contextoClinico += '\nPRESCRIÇÕES: Nenhuma prescrição registrada\n';
    }

    // Adicionar documentos gerados
    if (documentos.length > 0) {
      contextoClinico += `\nDOCUMENTOS GERADOS (${documentos.length} documentos):\n`;
      documentos.forEach((doc) => {
        const data = doc.consulta?.dataHora
          ? new Date(doc.consulta.dataHora).toLocaleDateString('pt-BR')
          : 'Data não disponível';
        contextoClinico += `- ${data}: ${doc.nomeDocumento} (${doc.tipoDocumento})\n`;
      });
    }

    // Prompt para a IA
    const systemPrompt = `Você é um médico especializado em análise de prontuários e histórico clínico.
Sua função é analisar TODO o histórico clínico do paciente fornecido e gerar um RESUMO CLÍNICO COMPLETO e estruturado para o médico.

O resumo deve incluir:
1. RESUMO EXECUTIVO: Visão geral do paciente e principais condições
2. HISTÓRICO CLÍNICO RELEVANTE: Principais eventos, diagnósticos e tratamentos ao longo do tempo
3. CONDIÇÕES ATUAIS: Problemas de saúde ativos ou crônicos
4. MEDICAMENTOS EM USO: Lista de medicamentos prescritos recentemente
5. EXAMES REALIZADOS: Principais exames solicitados e seus propósitos
6. ALERGIAS E CONTRAINDICAÇÕES: Alergias conhecidas e precauções
7. EVOLUÇÃO CLÍNICA: Tendências e progressão das condições
8. RECOMENDAÇÕES: Sugestões para acompanhamento e cuidados

IMPORTANTE:
- Use linguagem médica profissional em português brasileiro
- Seja objetivo e conciso, mas completo
- Destaque informações críticas (alergias, condições graves, etc)
- Organize cronologicamente quando relevante
- Identifique padrões e tendências no histórico
- Retorne APENAS o texto do resumo, sem formatação JSON ou markdown adicional
- Use quebras de linha para separar seções
- Se não houver informações suficientes em alguma área, indique claramente`;

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise o seguinte histórico clínico completo e gere um resumo clínico estruturado:\n\n${contextoClinico}` }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const resumoClinico = completion.choices[0]?.message?.content;
    if (!resumoClinico) {
      throw new Error("Resposta vazia da OpenAI");
    }

    return NextResponse.json({
      success: true,
      resumo: resumoClinico,
    });
  } catch (error: any) {
    console.error("Erro ao gerar resumo clínico:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao gerar resumo clínico",
      },
      { status: 500 }
    );
  }
}
