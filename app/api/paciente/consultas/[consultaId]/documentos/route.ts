import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

// GET /api/paciente/consultas/[consultaId]/documentos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consultaId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas pacientes podem acessar." },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const paciente = await prisma.paciente.findFirst({
      where: {
        clinicaId,
        usuarioId: session.user.id,
      },
      select: { id: true },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    const { consultaId } = await params;

    // Verificar se a consulta pertence ao paciente
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId,
        pacienteId: paciente.id,
      },
      select: { id: true },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Buscar documentos da consulta que possuem arquivo no S3
    const documentos = await prisma.documentoGerado.findMany({
      where: {
        consultaId,
        clinicaId,
        s3Key: { not: null },
      },
      select: {
        id: true,
        tipoDocumento: true,
        nomeDocumento: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Gerar URLs assinadas para cada documento
    const documentosComUrl = await Promise.all(
      documentos.map(async (doc) => {
        return {
          ...doc,
          // Não gerar URL aqui - o app vai chamar um endpoint separado para download
        };
      })
    );

    return NextResponse.json({ documentos: documentosComUrl });
  } catch (error: any) {
    console.error("Erro ao listar documentos da consulta:", error);
    return NextResponse.json(
      { error: "Erro ao listar documentos" },
      { status: 500 }
    );
  }
}
