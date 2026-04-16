import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { brazilDayStart, brazilDayEnd } from "@/lib/timezone-utils";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { generateRelatorioFechamentoCaixaPDF } from "@/lib/pdf/relatorio-fechamento-caixa";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return { authorized: false, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return { authorized: false, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return { authorized: false, response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }) };
  }
  return { authorized: true, clinicaId, session };
}

// GET /api/secretaria/fechamento-caixa/pdf?data=YYYY-MM-DD&medicoId=xxx&nomeSecretaria=xxx
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response!;

    const { clinicaId, session } = auth;
    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");
    const medicoId = searchParams.get("medicoId");
    const nomeSecretaria = searchParams.get("nomeSecretaria") || session!.user.nome || "";

    if (!dataParam) {
      return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
    }

    const inicioDia = brazilDayStart(dataParam);
    const fimDia = brazilDayEnd(dataParam);

    // ── Consultas ────────────────────────────────────────────────────────────
    const consultas = await prisma.consulta.findMany({
      where: {
        clinicaId: clinicaId!,
        dataHora: { gte: inicioDia, lte: fimDia },
        ...(medicoId && { medicoId }),
      },
      include: {
        paciente: { select: { id: true, nome: true, cpf: true } },
        tipoConsulta: { select: { nome: true } },
        operadora: { select: { nomeFantasia: true, razaoSocial: true } },
        planoSaude: { select: { nome: true } },
      },
      orderBy: { dataHora: "asc" },
    });

    // ── Pagamentos ────────────────────────────────────────────────────────────
    const pagamentos = await prisma.pagamentoConsulta.findMany({
      where: {
        clinicaId: clinicaId!,
        dataPagamento: { gte: inicioDia, lte: fimDia },
        status: "PAGO",
        ...(medicoId && { consulta: { medicoId } }),
      },
      include: {
        consulta: {
          include: {
            operadora: { select: { nomeFantasia: true, razaoSocial: true } },
          },
        },
      },
    });

    // ── Totais ────────────────────────────────────────────────────────────────
    const totalPorFormaPagamento: Record<string, number> = {};
    const totalPorConvenio: Record<string, number> = {};
    let totalGeral = 0;

    pagamentos.forEach((p) => {
      const forma = p.metodoPagamento || "NÃO_INFORMADO";
      const valor = Number(p.valor);
      totalPorFormaPagamento[forma] = (totalPorFormaPagamento[forma] || 0) + valor;
      totalGeral += valor;

      const convenio = p.consulta?.operadora
        ? p.consulta.operadora.nomeFantasia || p.consulta.operadora.razaoSocial || "Particular"
        : "Particular";
      totalPorConvenio[convenio] = (totalPorConvenio[convenio] || 0) + valor;
    });

    // ── Clínica ───────────────────────────────────────────────────────────────
    const clinica = await prisma.tenant.findUnique({
      where: { id: clinicaId! },
      select: {
        nome: true, cnpj: true, telefone: true, email: true,
        endereco: true, numero: true, bairro: true,
        cidade: true, estado: true, cep: true, site: true,
      },
    });

    // ── Autorização ───────────────────────────────────────────────────────────
    const autorizacao = medicoId
      ? await prisma.autorizacaoFechamentoCaixa.findUnique({
          where: { clinicaId_medicoId_data: { clinicaId: clinicaId!, medicoId, data: inicioDia } },
          include: { medico: { include: { usuario: { select: { nome: true } } } } },
        })
      : await prisma.autorizacaoFechamentoCaixa.findFirst({
          where: { clinicaId: clinicaId!, data: inicioDia, status: { in: ["AUTORIZADO", "FECHADO"] } },
          include: { medico: { include: { usuario: { select: { nome: true } } } } },
        });

    // ── Logo ──────────────────────────────────────────────────────────────────
    let logoBase64: string | undefined;
    try {
      const admin = await prisma.usuario.findFirst({
        where: { clinicaId: clinicaId!, tipo: TipoUsuario.ADMIN_CLINICA, ativo: true },
        select: { avatar: true },
        orderBy: { createdAt: "asc" },
      });

      if (admin?.avatar) {
        let imageBuffer: Buffer;
        const av = admin.avatar;

        if (av.startsWith("usuarios/")) {
          const s3 = new S3Client({
            region: process.env.AWS_REGION || "sa-east-1",
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            },
          });
          const cmd = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos",
            Key: av,
          });
          const res = await s3.send(cmd);
          const chunks: Uint8Array[] = [];
          if (res.Body) {
            // @ts-ignore
            for await (const chunk of res.Body) chunks.push(chunk);
          }
          const buf = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
          let off = 0;
          for (const c of chunks) { buf.set(c, off); off += c.length; }
          imageBuffer = Buffer.from(buf);
        } else if (av.startsWith("data:image")) {
          imageBuffer = Buffer.from(av.split(",")[1], "base64");
        } else if (av.startsWith("https://")) {
          const r = await fetch(av);
          imageBuffer = Buffer.from(await r.arrayBuffer());
        } else {
          throw new Error("Formato não reconhecido");
        }

        const pngBuffer = await sharp(imageBuffer).png().toBuffer();
        logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
      }
    } catch {
      logoBase64 = undefined;
    }

    // ── Gerar PDF ─────────────────────────────────────────────────────────────
    const clinicaData = {
      clinicaNome: clinica?.nome || "",
      clinicaCnpj: clinica?.cnpj || "",
      clinicaTelefone: clinica?.telefone || undefined,
      clinicaEmail: clinica?.email || undefined,
      clinicaEndereco: clinica?.endereco || undefined,
      clinicaNumero: clinica?.numero || undefined,
      clinicaBairro: clinica?.bairro || undefined,
      clinicaCidade: clinica?.cidade || undefined,
      clinicaEstado: clinica?.estado || undefined,
      clinicaCep: clinica?.cep || undefined,
      clinicaSite: clinica?.site || undefined,
      logoBase64,
    };

    const consultasNormalized = consultas.map((c) => ({
      ...c,
      valorCobrado: c.valorCobrado != null ? Number(c.valorCobrado) : null,
    }));

    const pdfBuffer = generateRelatorioFechamentoCaixaPDF(
      { data: dataParam, clinica, consultas: consultasNormalized, totalPorFormaPagamento, totalPorConvenio, totalGeral, autorizacao },
      nomeSecretaria,
      clinicaData
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio-financeiro-${dataParam}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF de fechamento de caixa:", error);
    return NextResponse.json({ error: error.message || "Erro ao gerar PDF" }, { status: 500 });
  }
}
