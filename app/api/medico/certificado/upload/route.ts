import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { uploadMedicoCertificadoToS3 } from "@/lib/s3-service";
import { encryptStringAESGCM } from "@/lib/crypto/aes-gcm";
import * as forge from "node-forge";

function parsePfxMetadata(pfxBuffer: Buffer, password: string): {
  validTo?: Date;
  subject?: string;
  issuer?: string;
  serialNumber?: string;
} {
  // node-forge trabalha bem com string binária DER
  const der = pfxBuffer.toString("binary");
  const asn1 = forge.asn1.fromDer(der);

  // Compatibilidade: algumas versões aceitam (asn1, password) e outras (asn1, strict, password)
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ];
  const cert = certBags?.[0]?.cert;
  if (!cert) return {};

  const fmtAttrs = (attrs: any[]) =>
    attrs
      .map((a) => `${a.shortName || a.name}=${a.value}`)
      .filter(Boolean)
      .join(", ");

  return {
    validTo: cert.validity?.notAfter,
    subject: cert.subject?.attributes ? fmtAttrs(cert.subject.attributes) : undefined,
    issuer: cert.issuer?.attributes ? fmtAttrs(cert.issuer.attributes) : undefined,
    serialNumber: cert.serialNumber,
  };
}

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
    const file = formData.get("file") as File | null;
    const senha = (formData.get("senha") as string | null) || "";

    if (!file) {
      return NextResponse.json({ error: "Arquivo .pfx é obrigatório" }, { status: 400 });
    }
    if (!senha) {
      return NextResponse.json({ error: "Senha do certificado é obrigatória" }, { status: 400 });
    }

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith(".pfx") && !fileNameLower.endsWith(".p12")) {
      return NextResponse.json(
        { error: "Formato inválido. Envie um arquivo .pfx (ou .p12)" },
        { status: 400 }
      );
    }

    // Limite básico (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo: 10MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Valida o PFX abrindo com a senha (se senha estiver errada, cai no catch)
    let meta: ReturnType<typeof parsePfxMetadata> = {};
    try {
      meta = parsePfxMetadata(buffer, senha);
    } catch (e) {
      console.error("[Certificado] Erro ao abrir/validar .pfx:", e);
      return NextResponse.json(
        { error: "Não foi possível abrir o certificado. Verifique o arquivo e a senha." },
        { status: 400 }
      );
    }

    const contentType = file.type || "application/x-pkcs12";
    const pfxS3Key = await uploadMedicoCertificadoToS3(
      buffer,
      file.name,
      { clinicaId, medicoId, tipoDocumento: "certificado-digital-pfx" },
      contentType
    );

    const senhaEnc = encryptStringAESGCM(senha);

    const certificado = await prisma.medicoCertificadoDigital.upsert({
      where: { medicoId },
      create: {
        clinicaId,
        medicoId,
        pfxS3Key,
        pfxMimeType: contentType,
        pfxTamanho: file.size,
        senhaEnc,
        validTo: meta.validTo,
        subject: meta.subject,
        issuer: meta.issuer,
        serialNumber: meta.serialNumber,
      },
      update: {
        pfxS3Key,
        pfxMimeType: contentType,
        pfxTamanho: file.size,
        senhaEnc,
        validTo: meta.validTo,
        subject: meta.subject,
        issuer: meta.issuer,
        serialNumber: meta.serialNumber,
      },
      select: {
        id: true,
        validTo: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, certificado });
  } catch (error: any) {
    console.error("[Certificado] Erro inesperado:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao enviar certificado" },
      { status: 500 }
    );
  }
}

