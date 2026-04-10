import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

/** Valida CPF com dígito verificador */
function validaCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(limpo[10]);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const guia = await prisma.guiaTiss.findFirst({
    where: { id, clinicaId },
    include: {
      procedimentos: {
        include: { codigoTuss: true },
      },
      paciente: true,
      medico: {
        include: { usuario: { select: { nome: true } } },
      },
      consulta: {
        select: {
          medicoId: true,
          medico: {
            include: { usuario: { select: { nome: true } } },
          },
        },
      },
      operadora: true,
    },
  });

  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  if (guia.status === "ENVIADA") {
    return NextResponse.json(
      { error: "Guia já foi enviada" },
      { status: 400 }
    );
  }

  const erros: string[] = [];

  // 1. Procedimentos
  if (guia.procedimentos.length === 0) {
    erros.push("A guia deve ter pelo menos um procedimento");
  } else {
    guia.procedimentos.forEach((p, i) => {
      if (!p.codigoTuss) {
        erros.push(`Procedimento #${i + 1}: código TUSS não vinculado`);
      }
      if (Number(p.valorTotal) <= 0) {
        erros.push(`Procedimento #${i + 1}: valor total deve ser maior que zero`);
      }
    });
  }

  // 2. Data de atendimento
  if (guia.dataAtendimento > new Date()) {
    erros.push("A data de atendimento não pode ser futura");
  }

  // 3. Carteirinha
  if (!guia.numeroCarteirinha || guia.numeroCarteirinha.trim() === "") {
    erros.push("Número da carteirinha é obrigatório");
  }

  // 4. CPF do paciente (validação com dígito verificador)
  if (!guia.paciente.cpf) {
    erros.push("CPF do paciente não está preenchido");
  } else if (!validaCPF(guia.paciente.cpf)) {
    erros.push("CPF do paciente é inválido");
  }

  // 5. Médico/profissional executante
  const medico = guia.medico ?? guia.consulta?.medico;
  if (!medico) {
    erros.push("Médico executante não vinculado à guia. Vincule um médico antes de validar.");
  } else {
    if (!medico.crm || medico.crm.trim() === "") {
      erros.push("CRM do médico não está preenchido");
    }
    // Verificar se o CRM contém pelo menos dígitos
    const crmNumeros = medico.crm?.replace(/\D/g, "") ?? "";
    if (medico.crm && crmNumeros.length === 0) {
      erros.push("CRM do médico não contém números válidos");
    }
    if (!medico.ufCrm || medico.ufCrm.trim() === "") {
      erros.push("UF do CRM do médico não está preenchida");
    }
    if (!medico.codigoCbo || medico.codigoCbo.trim() === "") {
      erros.push("Código CBO-S do médico não está preenchido (obrigatório para TISS)");
    }
  }

  // 6. Código ANS da operadora (6 dígitos)
  const codigoAns = guia.operadora.codigoAns?.replace(/\D/g, "") ?? "";
  if (codigoAns.length !== 6) {
    erros.push(`Código ANS da operadora inválido: "${guia.operadora.codigoAns}". Deve ter 6 dígitos.`);
  }

  // 7. Clínica — CNES
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { codigoCnes: true, cnpj: true },
  });
  if (!clinica?.codigoCnes) {
    erros.push("CNES da clínica não cadastrado. Configure nas configurações.");
  }
  if (!clinica?.cnpj) {
    erros.push("CNPJ da clínica não cadastrado.");
  }

  if (erros.length > 0) {
    return NextResponse.json({ valida: false, erros }, { status: 422 });
  }

  await prisma.guiaTiss.update({
    where: { id },
    data: { status: "VALIDADA" },
  });

  return NextResponse.json({ valida: true, erros: [] });
}
