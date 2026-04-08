import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import {
  uploadExamePacienteToS3,
  getSignedUrlFromS3,
  deleteObjectFromS3,
  areAwsCredentialsConfigured,
} from "@/lib/s3-service";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (
    session.user.tipo !== TipoUsuario.PACIENTE &&
    session.user.tipo !== TipoUsuario.SECRETARIA &&
    session.user.tipo !== TipoUsuario.ADMIN_CLINICA
  ) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      ),
    };
  }

  // Se for paciente, buscar pelo usuarioId
  if (session.user.tipo === TipoUsuario.PACIENTE) {
    const paciente = await prisma.paciente.findFirst({
      where: { clinicaId, usuarioId: session.user.id },
      select: { id: true },
    });

    if (!paciente) {
      return {
        authorized: false as const,
        response: NextResponse.json(
          { error: "Paciente não encontrado" },
          { status: 404 }
        ),
      };
    }

    return {
      authorized: true as const,
      clinicaId,
      pacienteId: paciente.id,
      tipo: session.user.tipo,
    };
  }

  // Secretária/Admin pode acessar passando pacienteId como query param
  return {
    authorized: true as const,
    clinicaId,
    pacienteId: null as string | null,
    tipo: session.user.tipo,
  };
}

function getTipoArquivo(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "imagem";
  if (mimeType === "application/pdf") return "pdf";
  return "documento";
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// GET - Listar exames do paciente (ExamePaciente + DocumentoGerado com tipo exame)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    let pacienteId = auth.pacienteId;

    // Secretária/Admin pode passar pacienteId como query param
    if (!pacienteId && auth.tipo !== TipoUsuario.PACIENTE) {
      pacienteId = searchParams.get("pacienteId");
      if (!pacienteId) {
        return NextResponse.json(
          { error: "pacienteId é obrigatório" },
          { status: 400 }
        );
      }
    }

    // 1. Buscar exames enviados pelo paciente (ExamePaciente)
    const examesPaciente = await prisma.examePaciente.findMany({
      where: {
        clinicaId: auth.clinicaId,
        pacienteId: pacienteId!,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Buscar exames anexados pela secretaria (DocumentoGerado com tipo exame-*)
    const consultasPaciente = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        pacienteId: pacienteId!,
      },
      select: { id: true },
    });
    const consultaIds = consultasPaciente.map((c) => c.id);

    const documentosExames = consultaIds.length > 0
      ? await prisma.documentoGerado.findMany({
          where: {
            clinicaId: auth.clinicaId,
            consultaId: { in: consultaIds },
            tipoDocumento: { startsWith: "exame-" },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    // 3. Gerar URLs e unificar em formato comum
    const examesFromPaciente = await Promise.all(
      examesPaciente.map(async (exame) => {
        let url: string | null = null;
        try {
          if (exame.s3Key) url = await getSignedUrlFromS3(exame.s3Key, 3600);
        } catch {}
        return {
          ...exame,
          url,
          origem: "paciente" as const,
        };
      })
    );

    const examesFromSecretaria = await Promise.all(
      documentosExames.map(async (doc) => {
        let url: string | null = null;
        try {
          if (doc.s3Key) url = await getSignedUrlFromS3(doc.s3Key, 3600);
        } catch {}

        const dados = (doc.dados as any) || {};
        const tipoArquivo = doc.tipoDocumento === "exame-imagem"
          ? "imagem"
          : doc.tipoDocumento === "exame-pdf"
            ? "pdf"
            : "documento";

        return {
          id: doc.id,
          clinicaId: doc.clinicaId,
          pacienteId: pacienteId!,
          nome: doc.nomeDocumento,
          tipoArquivo,
          nomeArquivo: dados.originalFileName || doc.nomeDocumento,
          mimeType: dados.mimeType || "application/octet-stream",
          tamanho: dados.fileSize || 0,
          s3Key: doc.s3Key || "",
          observacoes: null,
          dataExame: null,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          url,
          origem: "secretaria" as const,
        };
      })
    );

    // 4. Mesclar e ordenar por data
    const todosExames = [...examesFromPaciente, ...examesFromSecretaria].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ exames: todosExames });
  } catch (error) {
    console.error("Erro ao listar exames:", error);
    return NextResponse.json(
      { error: "Erro ao listar exames" },
      { status: 500 }
    );
  }
}

// POST - Upload de exame
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    if (!areAwsCredentialsConfigured()) {
      return NextResponse.json(
        { error: "Serviço de armazenamento não configurado" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const nome = (formData.get("nome") as string) || "";
    const observacoes = (formData.get("observacoes") as string) || null;
    const dataExame = formData.get("dataExame") as string | null;

    // Secretária pode enviar pacienteId no form
    let pacienteId = auth.pacienteId;
    if (!pacienteId && auth.tipo !== TipoUsuario.PACIENTE) {
      pacienteId = formData.get("pacienteId") as string | null;
      if (!pacienteId) {
        return NextResponse.json(
          { error: "pacienteId é obrigatório" },
          { status: 400 }
        );
      }
    }

    if (!arquivo) {
      return NextResponse.json(
        { error: "Arquivo é obrigatório" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(arquivo.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use: JPG, PNG, WebP, PDF ou DOC/DOCX" },
        { status: 400 }
      );
    }

    if (arquivo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 10MB" },
        { status: 400 }
      );
    }

    const tipoArquivo = getTipoArquivo(arquivo.type);
    const buffer = Buffer.from(await arquivo.arrayBuffer());

    const s3Key = await uploadExamePacienteToS3(
      buffer,
      arquivo.name,
      {
        clinicaId: auth.clinicaId!,
        pacienteId: pacienteId!,
        tipoArquivo,
      },
      arquivo.type
    );

    const exame = await prisma.examePaciente.create({
      data: {
        clinicaId: auth.clinicaId!,
        pacienteId: pacienteId!,
        nome: nome || arquivo.name,
        tipoArquivo,
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type,
        tamanho: arquivo.size,
        s3Key,
        observacoes,
        dataExame: dataExame ? new Date(dataExame) : null,
      },
    });

    let url: string | null = null;
    try {
      url = await getSignedUrlFromS3(s3Key, 3600);
    } catch {
      // ignora
    }

    return NextResponse.json({ exame: { ...exame, url } }, { status: 201 });
  } catch (error) {
    console.error("Erro ao fazer upload do exame:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do exame" },
      { status: 500 }
    );
  }
}

// DELETE - Remover exame
export async function DELETE(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const exameId = searchParams.get("id");

    if (!exameId) {
      return NextResponse.json(
        { error: "ID do exame é obrigatório" },
        { status: 400 }
      );
    }

    const exame = await prisma.examePaciente.findFirst({
      where: {
        id: exameId,
        clinicaId: auth.clinicaId,
        ...(auth.tipo === TipoUsuario.PACIENTE
          ? { pacienteId: auth.pacienteId! }
          : {}),
      },
    });

    if (!exame) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      );
    }

    // Remover do S3
    if (exame.s3Key) {
      try {
        await deleteObjectFromS3(exame.s3Key);
      } catch (error) {
        console.error("Erro ao remover arquivo do S3:", error);
      }
    }

    await prisma.examePaciente.delete({ where: { id: exameId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover exame:", error);
    return NextResponse.json(
      { error: "Erro ao remover exame" },
      { status: 500 }
    );
  }
}
