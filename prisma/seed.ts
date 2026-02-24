import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { TipoPlano, TipoUsuario } from "../lib/generated/prisma/enums";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necessário para RDS AWS com certificado autoassinado
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // ============================================
  // 1. Criar Planos Padrão
  // ============================================
  console.log("📦 Criando planos padrão...");

  const planoBasico = await prisma.plano.upsert({
    where: { nome: TipoPlano.BASICO },
    update: {},
    create: {
      nome: TipoPlano.BASICO,
      tokensMensais: 2000,
      telemedicineHabilitada: false,
      preco: 299.0,
      descricao: "Plano básico com 2000 tokens mensais",
      ativo: true,
    },
  });

  const planoIntermediario = await prisma.plano.upsert({
    where: { nome: TipoPlano.INTERMEDIARIO },
    update: {},
    create: {
      nome: TipoPlano.INTERMEDIARIO,
      tokensMensais: 5000,
      telemedicineHabilitada: false,
      preco: 599.0,
      descricao: "Plano intermediário com 5000 tokens mensais",
      ativo: true,
    },
  });

  const planoProfissional = await prisma.plano.upsert({
    where: { nome: TipoPlano.PROFISSIONAL },
    update: {},
    create: {
      nome: TipoPlano.PROFISSIONAL,
      tokensMensais: 10000,
      telemedicineHabilitada: true,
      preco: 999.0,
      descricao: "Plano profissional com 10000 tokens mensais e telemedicina",
      ativo: true,
    },
  });

  console.log("✅ Planos criados:", {
    basico: planoBasico.id,
    intermediario: planoIntermediario.id,
    profissional: planoProfissional.id,
  });

  // ============================================
  // 2. Criar Super Admin Padrão
  // ============================================
  console.log("👤 Criando Super Admin padrão...");

  const senhaHash = await bcrypt.hash("Admin@123", 10);

  const superAdmin = await prisma.usuario.upsert({
    where: { email: "admin@system.com" },
    update: {
      senha: senhaHash, // Atualiza a senha caso o usuário já exista
    },
    create: {
      email: "admin@system.com",
      senha: senhaHash,
      nome: "Super Administrador",
      cpf: "00000000000", // CPF genérico para Super Admin
      tipo: TipoUsuario.SUPER_ADMIN,
      clinicaId: null, // Super Admin não tem clínica
      ativo: true,
      primeiroAcesso: false,
    },
  });

  console.log("✅ Super Admin criado:", {
    id: superAdmin.id,
    email: superAdmin.email,
    tipo: superAdmin.tipo,
  });

  // ============================================
  // 3. Criar Clínica de Exemplo
  // ============================================
  console.log("🏥 Criando clínica de exemplo...");

  const clinicaExemplo = await prisma.tenant.upsert({
    where: { cnpj: "12345678000190" },
    update: {},
    create: {
      nome: "Clínica Médica Exemplo",
      cnpj: "12345678000190",
      email: "contato@clinicaexemplo.com.br",
      telefone: "11987654321",
      planoId: planoProfissional.id,
      tokensMensaisDisponiveis: planoProfissional.tokensMensais,
      tokensConsumidos: 0,
      telemedicineHabilitada: planoProfissional.telemedicineHabilitada,
      status: "ATIVA",
      dataContratacao: new Date(),
      dataExpiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
    },
  });

  console.log("✅ Clínica criada:", {
    id: clinicaExemplo.id,
    nome: clinicaExemplo.nome,
    cnpj: clinicaExemplo.cnpj,
  });

  // ============================================
  // 4. Criar Usuários de Exemplo para Todos os Tipos
  // ============================================
  console.log("👥 Criando usuários de exemplo...");

  const senhaPadrao = await bcrypt.hash("Senha@123", 10);

  // Admin da Clínica
  const adminClinica = await prisma.usuario.upsert({
    where: { email: "admin@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "admin@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Admin Clínica",
      cpf: "11111111111",
      tipo: TipoUsuario.ADMIN_CLINICA,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  // Médico
  const medico = await prisma.usuario.upsert({
    where: { email: "medico@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "medico@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dr. João Silva",
      cpf: "22222222222",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  // Secretária
  const secretaria = await prisma.usuario.upsert({
    where: { email: "secretaria@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "secretaria@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Maria Santos",
      cpf: "33333333333",
      tipo: TipoUsuario.SECRETARIA,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  // Paciente
  const paciente = await prisma.usuario.upsert({
    where: { email: "paciente@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "paciente@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Carlos Oliveira",
      cpf: "44444444444",
      tipo: TipoUsuario.PACIENTE,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  console.log("✅ Usuários criados:", {
    adminClinica: {
      email: adminClinica.email,
      tipo: adminClinica.tipo,
    },
    medico: {
      email: medico.email,
      tipo: medico.tipo,
    },
    secretaria: {
      email: secretaria.email,
      tipo: secretaria.tipo,
    },
    paciente: {
      email: paciente.email,
      tipo: paciente.tipo,
    },
  });

  // ============================================
  // 5. Criar Médicos Adicionais
  // ============================================
  console.log("👨‍⚕️ Criando médicos adicionais...");

  const medico2 = await prisma.usuario.upsert({
    where: { email: "medico2@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "medico2@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dr. Maria Santos",
      cpf: "55555555555",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  const medico3 = await prisma.usuario.upsert({
    where: { email: "medico3@clinicaexemplo.com.br" },
    update: {},
    create: {
      email: "medico3@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dr. Pedro Costa",
      cpf: "66666666666",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
    },
  });

  // Criar registros de médicos
  const medicoRegistro1 = await prisma.medico.upsert({
    where: { 
      clinicaId_usuarioId: {
        clinicaId: clinicaExemplo.id,
        usuarioId: medico.id,
      }
    },
    update: {},
    create: {
      clinicaId: clinicaExemplo.id,
      usuarioId: medico.id,
      crm: "CRM-SP 123456",
      especialidade: "Clínica Geral",
      ativo: true,
    },
  });

  const medicoRegistro2 = await prisma.medico.upsert({
    where: { 
      clinicaId_usuarioId: {
        clinicaId: clinicaExemplo.id,
        usuarioId: medico2.id,
      }
    },
    update: {},
    create: {
      clinicaId: clinicaExemplo.id,
      usuarioId: medico2.id,
      crm: "CRM-SP 234567",
      especialidade: "Cardiologia",
      ativo: true,
    },
  });

  const medicoRegistro3 = await prisma.medico.upsert({
    where: { 
      clinicaId_usuarioId: {
        clinicaId: clinicaExemplo.id,
        usuarioId: medico3.id,
      }
    },
    update: {},
    create: {
      clinicaId: clinicaExemplo.id,
      usuarioId: medico3.id,
      crm: "CRM-SP 345678",
      especialidade: "Pediatria",
      ativo: true,
    },
  });

  console.log("✅ Médicos criados:", {
    total: 3,
    medicos: [medicoRegistro1.crm, medicoRegistro2.crm, medicoRegistro3.crm],
  });

  // ============================================
  // 6. Criar Exames
  // ============================================
  console.log("🔬 Criando exames...");

  const exames = await Promise.all([
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Hemograma Completo",
        descricao: "Análise completa do sangue incluindo contagem de células",
        tipo: "LABORATORIAL",
        ativo: true,
      },
    }),
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Glicemia de Jejum",
        descricao: "Medição dos níveis de glicose no sangue em jejum",
        tipo: "LABORATORIAL",
        ativo: true,
      },
    }),
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Raio-X de Tórax",
        descricao: "Exame de imagem do tórax",
        tipo: "IMAGEM",
        ativo: true,
      },
    }),
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Ultrassonografia Abdominal",
        descricao: "Exame de imagem dos órgãos abdominais",
        tipo: "IMAGEM",
        ativo: true,
      },
    }),
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Eletrocardiograma",
        descricao: "Registro da atividade elétrica do coração",
        tipo: "OUTROS",
        ativo: true,
      },
    }),
    prisma.exame.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Colesterol Total e Frações",
        descricao: "Análise dos níveis de colesterol",
        tipo: "LABORATORIAL",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Exames criados:", { total: exames.length });

  // ============================================
  // 7. Criar Medicamentos
  // ============================================
  console.log("💊 Criando medicamentos...");

  const medicamentos = await Promise.all([
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Paracetamol",
        principioAtivo: "Paracetamol",
        laboratorio: "Medley",
        apresentacao: "COMPRIMIDO",
        concentracao: "750",
        unidade: "mg",
        ativo: true,
      },
    }),
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Ibuprofeno",
        principioAtivo: "Ibuprofeno",
        laboratorio: "Eurofarma",
        apresentacao: "COMPRIMIDO",
        concentracao: "600",
        unidade: "mg",
        ativo: true,
      },
    }),
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Amoxicilina",
        principioAtivo: "Amoxicilina",
        laboratorio: "EMS",
        apresentacao: "CAPSULA",
        concentracao: "500",
        unidade: "mg",
        ativo: true,
      },
    }),
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Dipirona",
        principioAtivo: "Dipirona Sódica",
        laboratorio: "Sanofi",
        apresentacao: "GOTAS",
        concentracao: "500",
        unidade: "mg/ml",
        ativo: true,
      },
    }),
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Omeprazol",
        principioAtivo: "Omeprazol",
        laboratorio: "Aché",
        apresentacao: "CAPSULA",
        concentracao: "20",
        unidade: "mg",
        ativo: true,
      },
    }),
    prisma.medicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Losartana",
        principioAtivo: "Losartana Potássica",
        laboratorio: "Germed",
        apresentacao: "COMPRIMIDO",
        concentracao: "50",
        unidade: "mg",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Medicamentos criados:", { total: medicamentos.length });

  // ============================================
  // 8. Criar Procedimentos
  // ============================================
  console.log("🏥 Criando procedimentos...");

  const procedimentos = await Promise.all([
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-001",
        nome: "Consulta Médica - Clínica Geral",
        descricao: "Consulta médica de rotina com clínico geral",
        valor: 150.0,
        ativo: true,
      },
    }),
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-002",
        nome: "Consulta Médica - Especialista",
        descricao: "Consulta médica com especialista",
        valor: 250.0,
        ativo: true,
      },
    }),
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-003",
        nome: "Retorno Médico",
        descricao: "Consulta de retorno médico",
        valor: 100.0,
        ativo: true,
      },
    }),
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-004",
        nome: "Avaliação Cardiológica",
        descricao: "Avaliação completa do sistema cardiovascular",
        valor: 350.0,
        ativo: true,
      },
    }),
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-005",
        nome: "Avaliação Pediátrica",
        descricao: "Consulta pediátrica completa",
        valor: 200.0,
        ativo: true,
      },
    }),
    prisma.procedimento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigo: "TUSS-006",
        nome: "Curativo Simples",
        descricao: "Aplicação de curativo em ferida simples",
        valor: 50.0,
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Procedimentos criados:", { total: procedimentos.length });

  // ============================================
  // 9. Criar Formas de Pagamento
  // ============================================
  console.log("💳 Criando formas de pagamento...");

  const formasPagamento = await Promise.all([
    prisma.formaPagamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Dinheiro",
        descricao: "Pagamento em dinheiro",
        tipo: "DINHEIRO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Cartão de Crédito",
        descricao: "Pagamento com cartão de crédito",
        tipo: "CARTAO_CREDITO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Cartão de Débito",
        descricao: "Pagamento com cartão de débito",
        tipo: "CARTAO_DEBITO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "PIX",
        descricao: "Pagamento via PIX",
        tipo: "PIX",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Boleto Bancário",
        descricao: "Pagamento via boleto bancário",
        tipo: "BOLETO",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Formas de pagamento criadas:", { total: formasPagamento.length });

  // ============================================
  // 10. Criar Pacientes
  // ============================================
  console.log("👤 Criando pacientes...");

  const pacientes = await Promise.all([
    prisma.paciente.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Ana Paula Ferreira",
        cpf: "77777777777",
        rg: "123456789",
        dataNascimento: new Date("1985-05-15"),
        sexo: "F",
        email: "ana.ferreira@email.com",
        telefone: "1133334444",
        celular: "11988887777",
        cep: "01310-100",
        endereco: "Avenida Paulista",
        numero: "1000",
        complemento: "Apto 101",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        nomeMae: "Maria Ferreira",
        estadoCivil: "CASADO",
        profissao: "Advogada",
        ativo: true,
      },
    }),
    prisma.paciente.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Roberto Almeida",
        cpf: "88888888888",
        rg: "987654321",
        dataNascimento: new Date("1978-09-22"),
        sexo: "M",
        email: "roberto.almeida@email.com",
        telefone: "1144445555",
        celular: "11977776666",
        cep: "04547-130",
        endereco: "Rua das Flores",
        numero: "500",
        bairro: "Vila Olímpia",
        cidade: "São Paulo",
        estado: "SP",
        nomeMae: "Joana Almeida",
        estadoCivil: "SOLTEIRO",
        profissao: "Engenheiro",
        ativo: true,
      },
    }),
    prisma.paciente.create({
      data: {
        clinicaId: clinicaExemplo.id,
        nome: "Julia Mendes",
        cpf: "99999999999",
        rg: "456789123",
        dataNascimento: new Date("2010-03-10"),
        sexo: "F",
        email: "julia.mendes@email.com",
        telefone: "1155556666",
        celular: "11966665555",
        cep: "02013-000",
        endereco: "Rua Tuiuti",
        numero: "200",
        bairro: "Tatuapé",
        cidade: "São Paulo",
        estado: "SP",
        nomeMae: "Patricia Mendes",
        nomePai: "Carlos Mendes",
        estadoCivil: "SOLTEIRO",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Pacientes criados:", { total: pacientes.length });

  // ============================================
  // 11. Criar Contas a Pagar
  // ============================================
  console.log("📋 Criando contas a pagar...");

  const hoje = new Date();
  const proximoMes = new Date(hoje);
  proximoMes.setMonth(proximoMes.getMonth() + 1);
  const mesPassado = new Date(hoje);
  mesPassado.setMonth(mesPassado.getMonth() - 1);

  const contasPagar = await Promise.all([
    prisma.contaPagar.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Aluguel do Prédio",
        fornecedor: "Imobiliária ABC",
        valor: 5000.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 5),
        status: "PENDENTE",
        observacoes: "Aluguel mensal",
      },
    }),
    prisma.contaPagar.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Fornecedor de Medicamentos",
        fornecedor: "Farmácia XYZ",
        valor: 2500.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 10),
        status: "PENDENTE",
        observacoes: "Compra mensal de medicamentos",
      },
    }),
    prisma.contaPagar.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Energia Elétrica",
        fornecedor: "Energia SP",
        valor: 800.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 15),
        status: "PENDENTE",
        observacoes: "Conta de energia",
      },
    }),
    prisma.contaPagar.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Água e Esgoto",
        fornecedor: "SABESP",
        valor: 350.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 20),
        status: "PENDENTE",
        observacoes: "Conta de água",
      },
    }),
    prisma.contaPagar.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Material de Escritório",
        fornecedor: "Papelaria Central",
        valor: 450.0,
        dataVencimento: new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 25),
        dataPagamento: new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 24),
        status: "PAGO",
        observacoes: "Material já pago",
      },
    }),
  ]);

  console.log("✅ Contas a pagar criadas:", { total: contasPagar.length });

  // ============================================
  // 12. Criar Contas a Receber
  // ============================================
  console.log("💰 Criando contas a receber...");

  const contasReceber = await Promise.all([
    prisma.contaReceber.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Consulta - Ana Paula Ferreira",
        pacienteId: pacientes[0].id,
        valor: 150.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 5),
        status: "PENDENTE",
        formaPagamentoId: formasPagamento[0].id, // Dinheiro
        observacoes: "Consulta de rotina",
      },
    }),
    prisma.contaReceber.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Consulta - Roberto Almeida",
        pacienteId: pacientes[1].id,
        valor: 250.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 8),
        status: "PENDENTE",
        formaPagamentoId: formasPagamento[2].id, // Cartão de Débito
        observacoes: "Consulta com especialista",
      },
    }),
    prisma.contaReceber.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Consulta - Julia Mendes",
        pacienteId: pacientes[2].id,
        valor: 200.0,
        dataVencimento: new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 12),
        dataRecebimento: new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 10),
        status: "RECEBIDO",
        formaPagamentoId: formasPagamento[3].id, // PIX
        observacoes: "Consulta pediátrica - já recebida",
      },
    }),
    prisma.contaReceber.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Procedimento - Avaliação Cardiológica",
        pacienteId: pacientes[0].id,
        valor: 350.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 15),
        status: "PENDENTE",
        formaPagamentoId: formasPagamento[1].id, // Cartão de Crédito
        observacoes: "Avaliação cardiológica completa",
      },
    }),
    prisma.contaReceber.create({
      data: {
        clinicaId: clinicaExemplo.id,
        descricao: "Consulta - Retorno",
        pacienteId: pacientes[1].id,
        valor: 100.0,
        dataVencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 20),
        status: "PENDENTE",
        formaPagamentoId: formasPagamento[3].id, // PIX
        observacoes: "Consulta de retorno",
      },
    }),
  ]);

  console.log("✅ Contas a receber criadas:", { total: contasReceber.length });

  // ============================================
  // 13. Criar Fluxo de Caixa
  // ============================================
  console.log("💵 Criando movimentações de fluxo de caixa...");

  const fluxoCaixa = await Promise.all([
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "ENTRADA",
        descricao: "Recebimento de consulta",
        valor: 150.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        formaPagamentoId: formasPagamento[0].id, // Dinheiro
        observacoes: "Consulta realizada",
      },
    }),
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "ENTRADA",
        descricao: "Recebimento via PIX",
        valor: 200.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 3),
        formaPagamentoId: formasPagamento[3].id, // PIX
        observacoes: "Pagamento de consulta pediátrica",
      },
    }),
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "SAIDA",
        descricao: "Compra de material médico",
        valor: 1200.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 5),
        formaPagamentoId: formasPagamento[2].id, // Cartão de Débito
        observacoes: "Material descartável",
      },
    }),
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "ENTRADA",
        descricao: "Recebimento de procedimento",
        valor: 350.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 7),
        formaPagamentoId: formasPagamento[1].id, // Cartão de Crédito
        observacoes: "Avaliação cardiológica",
      },
    }),
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "SAIDA",
        descricao: "Pagamento de fornecedor",
        valor: 2500.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 10),
        formaPagamentoId: formasPagamento[4].id, // Boleto
        observacoes: "Fornecedor de medicamentos",
      },
    }),
    prisma.fluxoCaixa.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipo: "ENTRADA",
        descricao: "Recebimento de retorno",
        valor: 100.0,
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 12),
        formaPagamentoId: formasPagamento[0].id, // Dinheiro
        observacoes: "Consulta de retorno",
      },
    }),
  ]);

  console.log("✅ Movimentações de fluxo de caixa criadas:", { total: fluxoCaixa.length });

  // ============================================
  // 14. Criar Estoque de Medicamentos
  // ============================================
  console.log("📦 Criando estoque de medicamentos...");

  const estoques = await Promise.all([
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[0].id, // Paracetamol
        quantidadeAtual: 150,
        quantidadeMinima: 50,
        quantidadeMaxima: 300,
        unidade: "UN",
        localizacao: "Prateleira A1",
      },
    }),
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[1].id, // Ibuprofeno
        quantidadeAtual: 200,
        quantidadeMinima: 80,
        quantidadeMaxima: 400,
        unidade: "UN",
        localizacao: "Prateleira A2",
      },
    }),
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[2].id, // Amoxicilina
        quantidadeAtual: 80,
        quantidadeMinima: 30,
        quantidadeMaxima: 200,
        unidade: "UN",
        localizacao: "Prateleira B1",
      },
    }),
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[3].id, // Dipirona
        quantidadeAtual: 120,
        quantidadeMinima: 40,
        quantidadeMaxima: 250,
        unidade: "UN",
        localizacao: "Prateleira B2",
      },
    }),
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[4].id, // Omeprazol
        quantidadeAtual: 90,
        quantidadeMinima: 30,
        quantidadeMaxima: 180,
        unidade: "UN",
        localizacao: "Prateleira C1",
      },
    }),
    prisma.estoqueMedicamento.create({
      data: {
        clinicaId: clinicaExemplo.id,
        medicamentoId: medicamentos[5].id, // Losartana
        quantidadeAtual: 60,
        quantidadeMinima: 20,
        quantidadeMaxima: 150,
        unidade: "UN",
        localizacao: "Prateleira C2",
      },
    }),
  ]);

  console.log("✅ Estoque de medicamentos criado:", { total: estoques.length });

  // ============================================
  // 15. Criar Movimentações de Estoque
  // ============================================
  console.log("📊 Criando movimentações de estoque...");

  const movimentacoesEstoque = await Promise.all([
    prisma.movimentacaoEstoque.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipoEstoque: "MEDICAMENTO",
        estoqueMedicamentoId: estoques[0].id,
        tipo: "ENTRADA",
        quantidade: 100,
        motivo: "Compra de fornecedor",
        observacoes: "Entrada de Paracetamol",
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
      },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipoEstoque: "MEDICAMENTO",
        estoqueMedicamentoId: estoques[1].id,
        tipo: "ENTRADA",
        quantidade: 150,
        motivo: "Compra de fornecedor",
        observacoes: "Entrada de Ibuprofeno",
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 2),
      },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipoEstoque: "MEDICAMENTO",
        estoqueMedicamentoId: estoques[0].id,
        tipo: "SAIDA",
        quantidade: 20,
        motivo: "Uso em consulta",
        observacoes: "Saída de Paracetamol para paciente",
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 5),
      },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipoEstoque: "MEDICAMENTO",
        estoqueMedicamentoId: estoques[2].id,
        tipo: "ENTRADA",
        quantidade: 50,
        motivo: "Compra de fornecedor",
        observacoes: "Entrada de Amoxicilina",
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 8),
      },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        clinicaId: clinicaExemplo.id,
        tipoEstoque: "MEDICAMENTO",
        estoqueMedicamentoId: estoques[3].id,
        tipo: "AJUSTE",
        quantidade: 10,
        motivo: "Ajuste de inventário",
        observacoes: "Correção de estoque",
        data: new Date(hoje.getFullYear(), hoje.getMonth(), 10),
      },
    }),
  ]);

  console.log("✅ Movimentações de estoque criadas:", { total: movimentacoesEstoque.length });

  // ============================================
  // 16. Criar Especialidades Médicas
  // ============================================
  console.log("🏥 Criando especialidades médicas...");

  const especialidades = await Promise.all([
    prisma.especialidadeMedica.upsert({
      where: { codigo: "01" },
      update: {},
      create: {
        codigo: "01",
        nome: "Clínica Médica",
        descricao: "Especialidade médica que trata de doenças gerais e faz o primeiro atendimento. Também conhecida como Medicina Interna.",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "02" },
      update: {},
      create: {
        codigo: "02",
        nome: "Cardiologia",
        descricao: "Especialidade médica que trata do coração e sistema cardiovascular",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "03" },
      update: {},
      create: {
        codigo: "03",
        nome: "Pediatria",
        descricao: "Especialidade médica dedicada ao cuidado de crianças e adolescentes (0 a 18 anos)",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "04" },
      update: {},
      create: {
        codigo: "04",
        nome: "Ortopedia e Traumatologia",
        descricao: "Especialidade médica que trata do sistema musculoesquelético, incluindo ossos, músculos, ligamentos e articulações",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "05" },
      update: {},
      create: {
        codigo: "05",
        nome: "Dermatologia",
        descricao: "Especialidade médica que trata da pele, cabelos, unhas e mucosas",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "06" },
      update: {},
      create: {
        codigo: "06",
        nome: "Ginecologia e Obstetrícia",
        descricao: "Especialidade médica que trata da saúde da mulher, incluindo gestação e parto",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "07" },
      update: {},
      create: {
        codigo: "07",
        nome: "Oftalmologia",
        descricao: "Especialidade médica que trata dos olhos e visão",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "08" },
      update: {},
      create: {
        codigo: "08",
        nome: "Otorrinolaringologia",
        descricao: "Especialidade médica que trata de ouvidos, nariz e garganta",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "09" },
      update: {},
      create: {
        codigo: "09",
        nome: "Psiquiatria",
        descricao: "Especialidade médica que trata de transtornos mentais e comportamentais",
        ativo: true,
      },
    }),
    prisma.especialidadeMedica.upsert({
      where: { codigo: "10" },
      update: {},
      create: {
        codigo: "10",
        nome: "Neurologia",
        descricao: "Especialidade médica que trata do sistema nervoso central e periférico",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Especialidades médicas criadas:", { total: especialidades.length });

  // ============================================
  // 17. Criar Tipos de Consulta
  // ============================================
  console.log("📅 Criando tipos de consulta...");

  const tiposConsulta = await Promise.all([
    prisma.tipoConsulta.upsert({
      where: { codigo: "PRIMEIRA_CONSULTA" },
      update: {},
      create: {
        codigo: "PRIMEIRA_CONSULTA",
        nome: "Primeira Consulta",
        descricao: "Primeira consulta do paciente com o médico",
        ativo: true,
      },
    }),
    prisma.tipoConsulta.upsert({
      where: { codigo: "RETORNO" },
      update: {},
      create: {
        codigo: "RETORNO",
        nome: "Retorno",
        descricao: "Consulta de retorno para acompanhamento",
        ativo: true,
      },
    }),
    prisma.tipoConsulta.upsert({
      where: { codigo: "URGENCIA" },
      update: {},
      create: {
        codigo: "URGENCIA",
        nome: "Urgência",
        descricao: "Consulta de urgência/emergência",
        ativo: true,
      },
    }),
    prisma.tipoConsulta.upsert({
      where: { codigo: "ELETIVA" },
      update: {},
      create: {
        codigo: "ELETIVA",
        nome: "Eletiva",
        descricao: "Consulta eletiva agendada",
        ativo: true,
      },
    }),
    prisma.tipoConsulta.upsert({
      where: { codigo: "SEGUIMENTO" },
      update: {},
      create: {
        codigo: "SEGUIMENTO",
        nome: "Seguimento",
        descricao: "Consulta de seguimento de tratamento",
        ativo: true,
      },
    }),
    prisma.tipoConsulta.upsert({
      where: { codigo: "TELEMEDICINA" },
      update: {},
      create: {
        codigo: "TELEMEDICINA",
        nome: "Telemedicina",
        descricao: "Consulta realizada por telemedicina",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Tipos de consulta criados:", { total: tiposConsulta.length });

  // ============================================
  // 18. Criar Operadoras de Saúde Reais
  // ============================================
  console.log("🏥 Criando operadoras de saúde reais...");

  // Função auxiliar para criar ou atualizar operadora
  const criarOuAtualizarOperadora = async (dados: {
    codigoAns: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string;
    email: string;
  }) => {
    const existente = await prisma.operadora.findFirst({
      where: {
        clinicaId: clinicaExemplo.id,
        codigoAns: dados.codigoAns,
      },
    });

    if (existente) {
      return await prisma.operadora.update({
        where: { id: existente.id },
        data: dados,
      });
    }

    return await prisma.operadora.create({
      data: {
        clinicaId: clinicaExemplo.id,
        ...dados,
        ativo: true,
      },
    });
  };

  const operadoras = await Promise.all([
    criarOuAtualizarOperadora({
      codigoAns: "416703",
      razaoSocial: "Unimed do Brasil S.A.",
      nomeFantasia: "Unimed",
      cnpj: "11.222.333/0001-81",
      telefone: "0800-701-0000",
      email: "contato@unimed.com.br",
    }),
    criarOuAtualizarOperadora({
      codigoAns: "416704",
      razaoSocial: "Amil Assistência Médica Internacional S.A.",
      nomeFantasia: "Amil",
      cnpj: "33.444.555/0001-22",
      telefone: "0800-772-0000",
      email: "contato@amil.com.br",
    }),
    criarOuAtualizarOperadora({
      codigoAns: "416705",
      razaoSocial: "Bradesco Saúde S.A.",
      nomeFantasia: "Bradesco Saúde",
      cnpj: "44.555.666/0001-33",
      telefone: "0800-701-0001",
      email: "contato@bradescosaude.com.br",
    }),
    criarOuAtualizarOperadora({
      codigoAns: "416706",
      razaoSocial: "SulAmérica Saúde S.A.",
      nomeFantasia: "SulAmérica",
      cnpj: "55.666.777/0001-44",
      telefone: "0800-701-0002",
      email: "contato@sulamerica.com.br",
    }),
    criarOuAtualizarOperadora({
      codigoAns: "416707",
      razaoSocial: "NotreDame Intermédica Saúde S.A.",
      nomeFantasia: "NotreDame Intermédica",
      cnpj: "66.777.888/0001-55",
      telefone: "0800-701-0003",
      email: "contato@notredame.com.br",
    }),
  ]);

  console.log("✅ Operadoras criadas:", { total: operadoras.length });

  // ============================================
  // 19. Criar Planos de Saúde Reais
  // ============================================
  console.log("📋 Criando planos de saúde reais...");

  const planosSaude = await Promise.all([
    prisma.planoSaude.create({
      data: {
        operadoraId: operadoras[0].id, // Unimed
        codigoAns: "416703-001",
        nome: "Unimed Nacional",
        tipoPlano: "AMBULATORIAL_HOSPITALAR",
        abrangencia: "NACIONAL",
        ativo: true,
      },
    }),
    prisma.planoSaude.create({
      data: {
        operadoraId: operadoras[0].id, // Unimed
        codigoAns: "416703-002",
        nome: "Unimed Básico",
        tipoPlano: "AMBULATORIAL",
        abrangencia: "NACIONAL",
        ativo: true,
      },
    }),
    prisma.planoSaude.create({
      data: {
        operadoraId: operadoras[1].id, // Amil
        codigoAns: "416704-001",
        nome: "Amil One Health",
        tipoPlano: "AMBULATORIAL_HOSPITALAR",
        abrangencia: "NACIONAL",
        ativo: true,
      },
    }),
    prisma.planoSaude.create({
      data: {
        operadoraId: operadoras[2].id, // Bradesco
        codigoAns: "416705-001",
        nome: "Bradesco Saúde Empresarial",
        tipoPlano: "AMBULATORIAL_HOSPITALAR",
        abrangencia: "NACIONAL",
        ativo: true,
      },
    }),
    prisma.planoSaude.create({
      data: {
        operadoraId: operadoras[3].id, // SulAmérica
        codigoAns: "416706-001",
        nome: "SulAmérica Total",
        tipoPlano: "AMBULATORIAL_HOSPITALAR",
        abrangencia: "NACIONAL",
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Planos de saúde criados:", { total: planosSaude.length });

  // ============================================
  // 20. Criar Códigos TUSS Reais
  // ============================================
  console.log("🔢 Criando códigos TUSS reais...");

  const codigosTuss = await Promise.all([
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101010" },
      update: {},
      create: {
        codigoTuss: "20101010",
        descricao: "Consulta médica em consultório - Clínica geral",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em clínica geral",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101011" },
      update: {},
      create: {
        codigoTuss: "20101011",
        descricao: "Consulta médica em consultório - Cardiologia",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em cardiologia",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101012" },
      update: {},
      create: {
        codigoTuss: "20101012",
        descricao: "Consulta médica em consultório - Pediatria",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em pediatria",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101013" },
      update: {},
      create: {
        codigoTuss: "20101013",
        descricao: "Consulta médica em consultório - Ortopedia",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em ortopedia",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101014" },
      update: {},
      create: {
        codigoTuss: "20101014",
        descricao: "Consulta médica em consultório - Dermatologia",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em dermatologia",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "20101015" },
      update: {},
      create: {
        codigoTuss: "20101015",
        descricao: "Consulta médica em consultório - Ginecologia",
        descricaoDetalhada: "Consulta médica realizada em consultório para atendimento em ginecologia",
        tipoProcedimento: "CONSULTA",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "31001010" },
      update: {},
      create: {
        codigoTuss: "31001010",
        descricao: "Hemograma completo",
        descricaoDetalhada: "Exame laboratorial para análise completa do sangue",
        tipoProcedimento: "EXAME",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "31001011" },
      update: {},
      create: {
        codigoTuss: "31001011",
        descricao: "Glicemia de jejum",
        descricaoDetalhada: "Exame laboratorial para dosagem de glicose no sangue em jejum",
        tipoProcedimento: "EXAME",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "31001012" },
      update: {},
      create: {
        codigoTuss: "31001012",
        descricao: "Colesterol total e frações",
        descricaoDetalhada: "Exame laboratorial para análise do perfil lipídico",
        tipoProcedimento: "EXAME",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
    prisma.codigoTuss.upsert({
      where: { codigoTuss: "31001013" },
      update: {},
      create: {
        codigoTuss: "31001013",
        descricao: "Raio-X de tórax",
        descricaoDetalhada: "Exame de imagem radiológica do tórax",
        tipoProcedimento: "EXAME",
        dataVigenciaInicio: new Date("2024-01-01"),
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Códigos TUSS criados:", { total: codigosTuss.length });

  // ============================================
  // 21. Vincular Códigos TUSS a Especialidades
  // ============================================
  console.log("🔗 Vinculando códigos TUSS a especialidades...");

  const tussEspecialidades = await Promise.all([
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[0].id, // 20101010 - Clínica Geral
          especialidadeId: especialidades[0].id, // Clínica Geral
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[0].id,
        especialidadeId: especialidades[0].id,
      },
    }),
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[1].id, // 20101011 - Cardiologia
          especialidadeId: especialidades[1].id, // Cardiologia
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[1].id,
        especialidadeId: especialidades[1].id,
      },
    }),
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[2].id, // 20101012 - Pediatria
          especialidadeId: especialidades[2].id, // Pediatria
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[2].id,
        especialidadeId: especialidades[2].id,
      },
    }),
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[3].id, // 20101013 - Ortopedia
          especialidadeId: especialidades[3].id, // Ortopedia
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[3].id,
        especialidadeId: especialidades[3].id,
      },
    }),
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[4].id, // 20101014 - Dermatologia
          especialidadeId: especialidades[4].id, // Dermatologia
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[4].id,
        especialidadeId: especialidades[4].id,
      },
    }),
    prisma.tussEspecialidade.upsert({
      where: {
        codigoTussId_especialidadeId: {
          codigoTussId: codigosTuss[5].id, // 20101015 - Ginecologia
          especialidadeId: especialidades[5].id, // Ginecologia
        },
      },
      update: {},
      create: {
        codigoTussId: codigosTuss[5].id,
        especialidadeId: especialidades[5].id,
      },
    }),
  ]);

  console.log("✅ Vínculos TUSS-Especialidade criados:", { total: tussEspecialidades.length });

  // ============================================
  // 22. Criar Valores TUSS
  // ============================================
  console.log("💰 Criando valores TUSS...");

  const hojeDate = new Date();
  const valoresTuss = await Promise.all([
    // Valor padrão para Clínica Geral - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id, // 20101010 - Clínica Geral
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 180.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor padrão para Clínica Geral - Retorno
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id, // 20101010 - Clínica Geral
        tipoConsultaId: tiposConsulta[1].id, // RETORNO
        valor: 120.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor Unimed - Clínica Geral - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id,
        operadoraId: operadoras[0].id, // Unimed
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 200.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor Unimed - Clínica Geral - Retorno
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id,
        operadoraId: operadoras[0].id, // Unimed
        tipoConsultaId: tiposConsulta[1].id, // RETORNO
        valor: 140.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor Amil - Clínica Geral - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id,
        operadoraId: operadoras[1].id, // Amil
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 220.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor Bradesco - Clínica Geral - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[0].id,
        operadoraId: operadoras[2].id, // Bradesco
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 210.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor padrão para Cardiologia - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[1].id, // 20101011 - Cardiologia
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 350.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
    // Valor padrão para Pediatria - Primeira Consulta
    prisma.tussValor.create({
      data: {
        clinicaId: clinicaExemplo.id,
        codigoTussId: codigosTuss[2].id, // 20101012 - Pediatria
        tipoConsultaId: tiposConsulta[0].id, // PRIMEIRA_CONSULTA
        valor: 200.0,
        dataVigenciaInicio: hojeDate,
        ativo: true,
      },
    }),
  ]);

  console.log("✅ Valores TUSS criados:", { total: valoresTuss.length });

  // ============================================
  // 23. Criar Aceitação TUSS por Operadora
  // ============================================
  console.log("✅ Criando regras de aceitação TUSS...");

  // Função auxiliar para criar ou atualizar TussOperadora
  const criarOuAtualizarTussOperadora = async (dados: {
    codigoTussId: string;
    operadoraId: string;
    planoSaudeId?: string | null;
  }) => {
    const existente = await prisma.tussOperadora.findFirst({
      where: {
        codigoTussId: dados.codigoTussId,
        operadoraId: dados.operadoraId,
        planoSaudeId: dados.planoSaudeId || null,
      },
    });

    if (existente) {
      return await prisma.tussOperadora.update({
        where: { id: existente.id },
        data: {
          aceito: true,
        },
      });
    }

    return await prisma.tussOperadora.create({
      data: {
        codigoTussId: dados.codigoTussId,
        operadoraId: dados.operadoraId,
        planoSaudeId: dados.planoSaudeId || null,
        aceito: true,
      },
    });
  };

  const tussOperadoras = await Promise.all([
    // Unimed aceita todos os códigos de consulta
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[0].id, // Clínica Geral
      operadoraId: operadoras[0].id, // Unimed
    }),
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[1].id, // Cardiologia
      operadoraId: operadoras[0].id, // Unimed
    }),
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[2].id, // Pediatria
      operadoraId: operadoras[0].id, // Unimed
    }),
    // Amil aceita todos os códigos de consulta
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[0].id, // Clínica Geral
      operadoraId: operadoras[1].id, // Amil
    }),
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[1].id, // Cardiologia
      operadoraId: operadoras[1].id, // Amil
    }),
    // Bradesco aceita todos os códigos de consulta
    criarOuAtualizarTussOperadora({
      codigoTussId: codigosTuss[0].id, // Clínica Geral
      operadoraId: operadoras[2].id, // Bradesco
    }),
  ]);

  console.log("✅ Regras de aceitação TUSS criadas:", { total: tussOperadoras.length });

  console.log("\n📋 Credenciais de acesso:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Super Admin:");
  console.log("  Email: admin@system.com");
  console.log("  Senha: Admin@123");
  console.log("\nAdmin Clínica:");
  console.log("  Email: admin@clinicaexemplo.com.br");
  console.log("  Senha: Senha@123");
  console.log("\nMédico:");
  console.log("  Email: medico@clinicaexemplo.com.br");
  console.log("  Senha: Senha@123");
  console.log("\nSecretária:");
  console.log("  Email: secretaria@clinicaexemplo.com.br");
  console.log("  Senha: Senha@123");
  console.log("\nPaciente:");
  console.log("  Email: paciente@clinicaexemplo.com.br");
  console.log("  Senha: Senha@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n📊 Resumo dos dados criados:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Médicos: ${3}`);
  console.log(`✅ Exames: ${exames.length}`);
  console.log(`✅ Medicamentos: ${medicamentos.length}`);
  console.log(`✅ Procedimentos: ${procedimentos.length}`);
  console.log(`✅ Formas de Pagamento: ${formasPagamento.length}`);
  console.log(`✅ Pacientes: ${pacientes.length}`);
  console.log(`✅ Contas a Pagar: ${contasPagar.length}`);
  console.log(`✅ Contas a Receber: ${contasReceber.length}`);
  console.log(`✅ Fluxo de Caixa: ${fluxoCaixa.length}`);
  console.log(`✅ Estoque de Medicamentos: ${estoques.length}`);
  console.log(`✅ Movimentações de Estoque: ${movimentacoesEstoque.length}`);
  console.log(`✅ Especialidades Médicas: ${especialidades.length}`);
  console.log(`✅ Tipos de Consulta: ${tiposConsulta.length}`);
  console.log(`✅ Operadoras de Saúde: ${operadoras.length}`);
  console.log(`✅ Planos de Saúde: ${planosSaude.length}`);
  console.log(`✅ Códigos TUSS: ${codigosTuss.length}`);
  console.log(`✅ Vínculos TUSS-Especialidade: ${tussEspecialidades.length}`);
  console.log(`✅ Valores TUSS: ${valoresTuss.length}`);
  console.log(`✅ Regras de Aceitação TUSS: ${tussOperadoras.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
