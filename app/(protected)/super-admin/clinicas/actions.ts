"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { StatusClinica, TipoUsuario } from "@/lib/generated/prisma";
import bcrypt from "bcryptjs";

interface CreateClinicaData {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  planoId: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  logoUrl?: string;
}

interface UpdateClinicaData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  planoId: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  logoUrl?: string;
}

export async function createClinica(data: CreateClinicaData) {
  try {
    // Buscar plano para obter tokens e telemedicina
    const plano = await prisma.plano.findUnique({
      where: { id: data.planoId },
    });

    if (!plano) {
      return { error: "Plano não encontrado" };
    }

    // Criar clínica
    const clinica = await prisma.tenant.create({
      data: {
        nome: data.nome,
        cnpj: data.cnpj.replace(/\D/g, ""), // Remove formatação
        email: data.email,
        telefone: data.telefone.replace(/\D/g, ""), // Remove formatação
        planoId: data.planoId,
        tokensMensaisDisponiveis: plano.tokensMensais,
        tokensConsumidos: 0,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        dataContratacao: new Date(),
        status: StatusClinica.ATIVA,
        cep: data.cep?.replace(/\D/g, ""),
        endereco: data.endereco,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        pais: data.pais || "Brasil",
        logoUrl: data.logoUrl,
      },
    });

    // Criar admin da clínica
    const senhaHash = await bcrypt.hash("Clinica@123", 10);
    const cnpjLimpo = data.cnpj.replace(/\D/g, "");
    const emailAdmin = `admin@${cnpjLimpo}.clinica.com`;
    // Gerar CPF único baseado no CNPJ (usando últimos 9 dígitos + prefixo)
    const cpfAdmin = `000${cnpjLimpo.slice(-9)}`;

    await prisma.usuario.create({
      data: {
        email: emailAdmin,
        senha: senhaHash,
        nome: `Admin ${data.nome}`,
        cpf: cpfAdmin,
        tipo: TipoUsuario.ADMIN_CLINICA,
        clinicaId: clinica.id,
        ativo: true,
        primeiroAcesso: true,
      },
    });

    // Simular envio de email (apenas log por enquanto)
    console.log(
      `Email simulado enviado para ${emailAdmin} com credenciais: Clinica@123`
    );

    revalidatePath("/super-admin/clinicas");
    return { success: true, clinica };
  } catch (error) {
    console.error("Erro ao criar clínica:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "CNPJ ou email já cadastrado" };
    }
    return { error: "Erro ao criar clínica" };
  }
}

export async function updateClinica(data: UpdateClinicaData) {
  try {
    // Buscar plano para atualizar tokens se necessário
    const plano = await prisma.plano.findUnique({
      where: { id: data.planoId },
    });

    if (!plano) {
      return { error: "Plano não encontrado" };
    }

    const clinicaAtual = await prisma.tenant.findUnique({
      where: { id: data.id },
    });

    if (!clinicaAtual) {
      return { error: "Clínica não encontrada" };
    }

    // Se mudou de plano, atualizar tokens disponíveis
    const tokensMensaisDisponiveis =
      clinicaAtual.planoId !== data.planoId
        ? plano.tokensMensais
        : clinicaAtual.tokensMensaisDisponiveis;

    await prisma.tenant.update({
      where: { id: data.id },
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone.replace(/\D/g, ""),
        planoId: data.planoId,
        tokensMensaisDisponiveis,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        cep: data.cep?.replace(/\D/g, ""),
        endereco: data.endereco,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        pais: data.pais || "Brasil",
        logoUrl: data.logoUrl,
      },
    });

    revalidatePath("/super-admin/clinicas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar clínica:", error);
    return { error: "Erro ao atualizar clínica" };
  }
}

export async function toggleClinicaStatus(clinicaId: string) {
  try {
    const clinica = await prisma.tenant.findUnique({
      where: { id: clinicaId },
    });

    if (!clinica) {
      return { error: "Clínica não encontrada" };
    }

    const novoStatus =
      clinica.status === StatusClinica.ATIVA
        ? StatusClinica.INATIVA
        : StatusClinica.ATIVA;

    await prisma.tenant.update({
      where: { id: clinicaId },
      data: { status: novoStatus },
    });

    revalidatePath("/super-admin/clinicas");
    return { success: true, novoStatus };
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    return { error: "Erro ao alterar status da clínica" };
  }
}
