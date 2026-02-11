import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json({ error: "Clínica ou médico não encontrado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const consultaId = searchParams.get("consultaId");

    if (!consultaId) {
      return NextResponse.json({ error: "Consulta ID é obrigatório" }, { status: 400 });
    }

    // Verificar se a consulta pertence à clínica e ao médico e obter o pacienteId
    console.log(`[Exames List] Buscando consulta: consultaId=${consultaId}, clinicaId=${clinicaId}, medicoId=${medicoId}`);
    
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId,
        medicoId,
      },
      select: {
        id: true,
        pacienteId: true,
      },
    });

    if (!consulta) {
      console.error(`[Exames List] Consulta não encontrada: consultaId=${consultaId}`);
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    console.log(`[Exames List] Consulta encontrada: pacienteId=${consulta.pacienteId}`);

    // Buscar TODOS os exames do paciente (não apenas da consulta atual)
    // Buscar exames anexados (documentos do tipo exame-imagem ou exame-pdf) de todas as consultas do paciente
    const consultasDoPaciente = await prisma.consulta.findMany({
      where: {
        pacienteId: consulta.pacienteId,
        clinicaId,
      },
      select: {
        id: true,
      },
    });

    const consultasIds = consultasDoPaciente.map(c => c.id);

    // Se não houver consultas do paciente, retornar array vazio
    let exames: any[] = [];
    
    if (consultasIds.length > 0) {
      try {
        exames = await prisma.documentoGerado.findMany({
          where: {
            consultaId: {
              in: consultasIds,
            },
            tipoDocumento: {
              in: ["exame-imagem", "exame-pdf"],
            },
            // Garantir que pertence à clínica correta
            clinicaId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            nomeDocumento: true,
            tipoDocumento: true,
            s3Key: true,
            createdAt: true,
            dados: true,
            consultaId: true,
            consulta: {
              select: {
                id: true,
                dataHora: true,
              },
            },
          },
        });
      } catch (dbError: any) {
        console.error("[Exames List] Erro ao buscar documentos do banco:", dbError);
        throw dbError;
      }
    }

    console.log(`[Exames List] PacienteId: ${consulta.pacienteId}, ConsultaId atual: ${consultaId}, Encontrados: ${exames.length} exames de ${consultasIds.length} consultas`);

    // Mapear exames de forma segura
    const examesMapeados = exames.map((exame) => {
      try {
        return {
          id: exame.id,
          nome: exame.nomeDocumento || "Sem nome",
          tipo: exame.tipoDocumento || "exame-imagem",
          s3Key: exame.s3Key || null,
          data: exame.createdAt,
          isImage: exame.tipoDocumento === "exame-imagem",
          isPdf: exame.tipoDocumento === "exame-pdf",
          originalFileName: (exame.dados as any)?.originalFileName || null,
          consultaId: exame.consultaId || null,
          consultaData: exame.consulta?.dataHora ? new Date(exame.consulta.dataHora).toISOString() : null,
          isFromCurrentConsulta: exame.consultaId === consultaId,
        };
      } catch (mapError) {
        console.error("[Exames List] Erro ao mapear exame:", mapError, exame);
        return null;
      }
    }).filter((exame): exame is NonNullable<typeof exame> => exame !== null);

    return NextResponse.json({
      success: true,
      exames: examesMapeados,
    });
  } catch (error: any) {
    console.error("Erro ao listar exames:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Erro ao listar exames",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
