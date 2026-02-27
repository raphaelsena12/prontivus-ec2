import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getObjectBufferFromS3 } from "@/lib/s3-service";
import { decryptStringAESGCM } from "@/lib/crypto/aes-gcm";
import { signPdfBufferWithP12 } from "@/lib/pdf/pades-sign";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json(
        { error: "Clínica ou médico não encontrado" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const consultaId = (formData.get("consultaId") as string | null) || undefined;
    const tipoDocumento = (formData.get("tipoDocumento") as string | null) || undefined;
    const nomeDocumento = (formData.get("nomeDocumento") as string | null) || undefined;
    const pdfFile = formData.get("pdfFile") as File | null;

    if (!pdfFile) {
      return NextResponse.json({ error: "Arquivo PDF é obrigatório" }, { status: 400 });
    }

    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    console.log("[Assinar PDF] PDF recebido:", {
      tamanhoOriginal: pdfBuffer.length,
      tipoDocumento,
      nomeDocumento,
    });

    const [cert, medico] = await Promise.all([
      prisma.medicoCertificadoDigital.findFirst({
        where: { clinicaId, medicoId },
        select: { pfxS3Key: true, senhaEnc: true, validTo: true },
      }),
      prisma.medico.findFirst({
        where: { id: medicoId },
        select: { crm: true, especialidade: true },
      }),
    ]);

    if (!cert) {
      return NextResponse.json(
        { error: "Certificado digital não configurado", type: "MissingCertificate" },
        { status: 400 }
      );
    }

    if (cert.validTo && cert.validTo.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Certificado digital expirado", type: "CertificateExpired" },
        { status: 400 }
      );
    }

    const pfxBuffer = await getObjectBufferFromS3(cert.pfxS3Key);
    const passphrase = decryptStringAESGCM(cert.senhaEnc);

    const signed = await signPdfBufferWithP12({
      pdfBuffer,
      pfxBuffer,
      passphrase,
      signingTime: new Date(),
      reason: `Assinatura digital${tipoDocumento ? ` (${tipoDocumento})` : ""}`,
      name: session.user.nome || "",
      location: "",
      contactInfo: session.user.email || "",
      crm: medico?.crm || "",
      especialidade: medico?.especialidade || "",
    });

    console.log("[Assinar PDF] PDF assinado:", {
      tamanhoOriginal: pdfBuffer.length,
      tamanhoAssinado: signed.length,
      diferenca: signed.length - pdfBuffer.length,
      mudou: signed.length !== pdfBuffer.length,
    });

    const safeName =
      (tipoDocumento || "documento")
        .toString()
        .replace(/[^a-zA-Z0-9._-]/g, "_") + "-assinado.pdf";

    return new NextResponse(new Uint8Array(signed), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "X-Documento-Nome": encodeURIComponent(nomeDocumento || ""),
        "X-Consulta-Id": encodeURIComponent(consultaId || ""),
      },
    });
  } catch (error: any) {
    console.error("[Assinar PDF] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao assinar documento" },
      { status: 500 }
    );
  }
}

