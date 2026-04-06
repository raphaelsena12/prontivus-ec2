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
      tokensMensais: 100000,
      telemedicineHabilitada: false,
      preco: 299.0,
      descricao: "Plano básico com 100.000 tokens mensais de IA",
      ativo: true,
    },
  });

  const planoIntermediario = await prisma.plano.upsert({
    where: { nome: TipoPlano.INTERMEDIARIO },
    update: {},
    create: {
      nome: TipoPlano.INTERMEDIARIO,
      tokensMensais: 500000,
      telemedicineHabilitada: false,
      preco: 599.0,
      descricao: "Plano intermediário com 500.000 tokens mensais de IA",
      ativo: true,
    },
  });

  const planoProfissional = await prisma.plano.upsert({
    where: { nome: TipoPlano.PROFISSIONAL },
    update: {},
    create: {
      nome: TipoPlano.PROFISSIONAL,
      tokensMensais: 2000000,
      telemedicineHabilitada: true,
      preco: 999.0,
      descricao: "Plano profissional com 2.000.000 tokens mensais de IA e telemedicina",
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
    update: { avatar: "https://randomuser.me/api/portraits/men/1.jpg" },
    create: {
      email: "medico@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dr. João Silva",
      cpf: "22222222222",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
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
    update: { avatar: "https://randomuser.me/api/portraits/women/2.jpg" },
    create: {
      email: "medico2@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dra. Maria Santos",
      cpf: "55555555555",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    },
  });

  const medico3 = await prisma.usuario.upsert({
    where: { email: "medico3@clinicaexemplo.com.br" },
    update: { avatar: "https://randomuser.me/api/portraits/men/3.jpg" },
    create: {
      email: "medico3@clinicaexemplo.com.br",
      senha: senhaPadrao,
      nome: "Dr. Pedro Costa",
      cpf: "66666666666",
      tipo: TipoUsuario.MEDICO,
      clinicaId: clinicaExemplo.id,
      ativo: true,
      primeiroAcesso: false,
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
        nome: "Dinheiro",
        descricao: "Pagamento em dinheiro",
        tipo: "DINHEIRO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
        nome: "Cartão de Crédito",
        descricao: "Pagamento com cartão de crédito",
        tipo: "CARTAO_CREDITO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
        nome: "Cartão de Débito",
        descricao: "Pagamento com cartão de débito",
        tipo: "CARTAO_DEBITO",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
        nome: "PIX",
        descricao: "Pagamento via PIX",
        tipo: "PIX",
        ativo: true,
      },
    }),
    prisma.formaPagamento.create({
      data: {
        // Catálogo global (gerenciado pelo SUPER_ADMIN)
        clinicaId: null,
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
  // 18. Criar Operadoras de Saúde (Catálogo Global via ANS)
  // ============================================
  console.log("🏥 Importando operadoras (ANS) para o catálogo global...");

  type AnsOperadoraListItem = {
    registro_ans: string;
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    classificacao_sigla?: string;
    ativa: boolean;
  };

  type AnsOperadoraDetalhe = {
    registro_ans: string;
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    ativa: boolean;
    classificacao_sigla?: string;
    endereco_logradouro?: string;
    endereco_numero?: string;
    endereco_bairro?: string;
    endereco_cep?: string;
    endereco_municipio_nome?: string;
    endereco_uf_sigla?: string;
    telefone_ddd?: string;
    telefone_numero?: string;
  };

  const ANS_BASE = "https://www.ans.gov.br/operadoras-entity/v1";

  async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ANS API error ${res.status} em ${url}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  function isOdonto(sigla?: string) {
    return !!sigla && sigla.toUpperCase().startsWith("OD");
  }

  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

  async function listarOperadorasAns(): Promise<AnsOperadoraListItem[]> {
    // Importante: a ANS ocasionalmente bloqueia requests com filtros (ativa/nome_fantasia).
    // Para evitar WAF, buscamos por paginação SEM filtros e fazemos o match localmente.
    const size = 100;
    const firstUrl = `${ANS_BASE}/operadoras/?page=1&size=${size}`;
    const first = await fetchJson<{
      total_pages: number;
      content: AnsOperadoraListItem[];
    }>(firstUrl);

    const all: AnsOperadoraListItem[] = [...(first.content ?? [])];
    const totalPages = first.total_pages ?? 1;

    for (let page = 2; page <= totalPages; page++) {
      const url = `${ANS_BASE}/operadoras/?page=${page}&size=${size}`;
      const data = await fetchJson<{ content: AnsOperadoraListItem[] }>(url);
      all.push(...(data.content ?? []));
    }

    return all;
  }

  function acharOperadoraPorTermoNoCatalogo(
    catalogo: AnsOperadoraListItem[],
    termo: string
  ): AnsOperadoraListItem | null {
    const t = norm(termo);
    const candidatas = catalogo.filter((o) => o.ativa && !isOdonto(o.classificacao_sigla));
    if (candidatas.length === 0) return null;

    const best =
      candidatas.find((o) => norm(o.nome_fantasia ?? "").includes(t)) ??
      candidatas.find((o) => norm(o.razao_social).includes(t)) ??
      null;

    return best;
  }

  async function importarOperadoraGlobalPorRegistro(registroAns: string) {
    const det = await fetchJson<AnsOperadoraDetalhe>(`${ANS_BASE}/operadoras/${registroAns}`);
    const telefone =
      det.telefone_ddd && det.telefone_numero ? `${det.telefone_ddd}${det.telefone_numero}` : null;

    const existente = await prisma.operadora.findFirst({
      where: { clinicaId: null, codigoAns: det.registro_ans },
    });

    if (existente) {
      return prisma.operadora.update({
        where: { id: existente.id },
        data: {
          razaoSocial: det.razao_social,
          nomeFantasia: det.nome_fantasia ?? null,
          cnpj: det.cnpj ?? null,
          telefone,
          email: null, // ANS não disponibiliza email no endpoint
          cep: det.endereco_cep ?? null,
          endereco: det.endereco_logradouro ?? null,
          numero: det.endereco_numero ?? null,
          complemento: null,
          bairro: det.endereco_bairro ?? null,
          cidade: det.endereco_municipio_nome ?? null,
          estado: det.endereco_uf_sigla ?? null,
          pais: "Brasil",
          ativo: det.ativa ?? true,
        },
      });
    }

    return prisma.operadora.create({
      data: {
        clinicaId: null,
        codigoAns: det.registro_ans,
        razaoSocial: det.razao_social,
        nomeFantasia: det.nome_fantasia ?? null,
        cnpj: det.cnpj ?? null,
        telefone,
        email: null,
        cep: det.endereco_cep ?? null,
        endereco: det.endereco_logradouro ?? null,
        numero: det.endereco_numero ?? null,
        complemento: null,
        bairro: det.endereco_bairro ?? null,
        cidade: det.endereco_municipio_nome ?? null,
        estado: det.endereco_uf_sigla ?? null,
        pais: "Brasil",
        ativo: det.ativa ?? true,
      },
    });
  }

  // Lista curada (marcas) — buscamos na ANS e importamos o registro encontrado.
  // Observação: “Unimed” possui múltiplas operadoras por UF/município; aqui importamos o primeiro match ativo.
  const PRINCIPAIS_TERMOS = [
    "BRADESCO SAUDE",
    "SULAMERICA",
    "AMIL",
    "HAPVIDA",
    "NOTREDAME INTERMEDICA",
    "PORTO SEGURO",
    "PREVENT SENIOR",
    "ASSIM SAUDE",
    "UNIMED",
    "ALLIANZ",
  ];

  const operadorasGlobaisImportadas = [];
  const catalogoAns = await listarOperadorasAns();
  for (const termo of PRINCIPAIS_TERMOS) {
    const item = acharOperadoraPorTermoNoCatalogo(catalogoAns, termo);
    if (!item) {
      console.warn(`⚠️ Não encontrei na ANS (ativa) para termo: ${termo}`);
      continue;
    }
    const op = await importarOperadoraGlobalPorRegistro(item.registro_ans);
    operadorasGlobaisImportadas.push(op);
    console.log(`✅ Operadora importada: ${op.codigoAns} - ${op.nomeFantasia ?? op.razaoSocial}`);
  }

  console.log("✅ Operadoras globais importadas:", { total: operadorasGlobaisImportadas.length });

  // Alias para manter compatibilidade com o restante do seed (TUSS valores/aceitação)
  // Índices usados mais abaixo:
  // 0 = Unimed (ou primeiro match do termo)
  // 1 = Amil
  // 2 = Bradesco
  const operadoras = operadorasGlobaisImportadas;

  // ============================================
  // 19. Planos de Saúde
  // ============================================
  console.log("📋 Planos de saúde: pulando (você pediu apenas operadoras por enquanto).");
  const planosSaude: any[] = [];

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

  // ============================================
  // 24. Criar Médicos Adicionais com Avatar
  // ============================================
  console.log("👨‍⚕️ Criando médicos adicionais com avatar...");

  const dadosMedicosExtras = [
    {
      usuario: {
        email: "camila.rocha@clinicaexemplo.com.br",
        nome: "Dra. Camila Rocha",
        cpf: "20200000001",
        avatar: "https://randomuser.me/api/portraits/women/10.jpg",
      },
      medico: { crm: "CRM-SP 456789", especialidade: "Dermatologia" },
      codigoTussIdx: 4, // Dermatologia (20101014)
    },
    {
      usuario: {
        email: "ricardo.fonseca@clinicaexemplo.com.br",
        nome: "Dr. Ricardo Fonseca",
        cpf: "20200000002",
        avatar: "https://randomuser.me/api/portraits/men/10.jpg",
      },
      medico: { crm: "CRM-SP 567890", especialidade: "Ortopedia e Traumatologia" },
      codigoTussIdx: 3, // Ortopedia (20101013)
    },
    {
      usuario: {
        email: "beatriz.mendonca@clinicaexemplo.com.br",
        nome: "Dra. Beatriz Mendonça",
        cpf: "20200000003",
        avatar: "https://randomuser.me/api/portraits/women/20.jpg",
      },
      medico: { crm: "CRM-SP 678901", especialidade: "Ginecologia e Obstetrícia" },
      codigoTussIdx: 5, // Ginecologia (20101015)
    },
    {
      usuario: {
        email: "augusto.silveira@clinicaexemplo.com.br",
        nome: "Dr. Augusto Silveira",
        cpf: "20200000004",
        avatar: "https://randomuser.me/api/portraits/men/20.jpg",
      },
      medico: { crm: "CRM-SP 789012", especialidade: "Neurologia" },
      codigoTussIdx: 0, // Clínica Geral como fallback
    },
    {
      usuario: {
        email: "fernanda.leal@clinicaexemplo.com.br",
        nome: "Dra. Fernanda Leal",
        cpf: "20200000005",
        avatar: "https://randomuser.me/api/portraits/women/30.jpg",
      },
      medico: { crm: "CRM-SP 890123", especialidade: "Psiquiatria" },
      codigoTussIdx: 0, // Clínica Geral como fallback
    },
    {
      usuario: {
        email: "leonardo.machado@clinicaexemplo.com.br",
        nome: "Dr. Leonardo Machado",
        cpf: "20200000006",
        avatar: "https://randomuser.me/api/portraits/men/30.jpg",
      },
      medico: { crm: "CRM-SP 901234", especialidade: "Oftalmologia" },
      codigoTussIdx: 0, // Clínica Geral como fallback
    },
    {
      usuario: {
        email: "isabela.torres@clinicaexemplo.com.br",
        nome: "Dra. Isabela Torres",
        cpf: "20200000007",
        avatar: "https://randomuser.me/api/portraits/women/40.jpg",
      },
      medico: { crm: "CRM-SP 012345", especialidade: "Otorrinolaringologia" },
      codigoTussIdx: 0, // Clínica Geral como fallback
    },
  ];

  const medicosExtrasRegistros: { medico: { id: string }, codigoTussIdx: number }[] = [];

  for (const dados of dadosMedicosExtras) {
    const usuarioMedico = await prisma.usuario.upsert({
      where: { email: dados.usuario.email },
      update: { avatar: dados.usuario.avatar },
      create: {
        email: dados.usuario.email,
        senha: senhaPadrao,
        nome: dados.usuario.nome,
        cpf: dados.usuario.cpf,
        tipo: TipoUsuario.MEDICO,
        clinicaId: clinicaExemplo.id,
        ativo: true,
        primeiroAcesso: false,
        avatar: dados.usuario.avatar,
      },
    });

    const medicoReg = await prisma.medico.upsert({
      where: {
        clinicaId_usuarioId: {
          clinicaId: clinicaExemplo.id,
          usuarioId: usuarioMedico.id,
        },
      },
      update: {},
      create: {
        clinicaId: clinicaExemplo.id,
        usuarioId: usuarioMedico.id,
        crm: dados.medico.crm,
        especialidade: dados.medico.especialidade,
        ativo: true,
      },
    });

    medicosExtrasRegistros.push({ medico: medicoReg, codigoTussIdx: dados.codigoTussIdx });
  }

  console.log("✅ Médicos extras criados:", { total: medicosExtrasRegistros.length });

  // ============================================
  // 25. Criar Muitos Pacientes Adicionais (50 pacientes)
  // ============================================
  console.log("👥 Criando pacientes adicionais (50 pacientes)...");

  const dadosPacientesAdicionais = [
    // Masculinos
    { nome: "Lucas Rodrigues Silva",      cpf: "10100000001", sexo: "M", dataNascimento: new Date("1990-03-15"), email: "lucas.rodrigues@email.com",    celular: "11991110001", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Analista de Sistemas" },
    { nome: "Felipe Carvalho Santos",     cpf: "10100000002", sexo: "M", dataNascimento: new Date("1985-07-22"), email: "felipe.carvalho@email.com",    celular: "11991110002", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Contador" },
    { nome: "Gabriel Nascimento Lima",    cpf: "10100000003", sexo: "M", dataNascimento: new Date("1995-11-08"), email: "gabriel.nascimento@email.com", celular: "11991110003", cidade: "Guarulhos",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estudante" },
    { nome: "Mateus Oliveira Costa",      cpf: "10100000004", sexo: "M", dataNascimento: new Date("1988-04-30"), email: "mateus.oliveira@email.com",    celular: "11991110004", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Professor" },
    { nome: "Guilherme Souza Ferreira",   cpf: "10100000005", sexo: "M", dataNascimento: new Date("1975-09-12"), email: "guilherme.souza@email.com",    celular: "11991110005", cidade: "Santo André",    estado: "SP", estadoCivil: "DIVORCIADO",  profissao: "Empresário" },
    { nome: "Rafael Barbosa Alves",       cpf: "10100000006", sexo: "M", dataNascimento: new Date("1992-01-25"), email: "rafael.barbosa@email.com",     celular: "11991110006", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Designer" },
    { nome: "Diego Santos Pereira",       cpf: "10100000007", sexo: "M", dataNascimento: new Date("1983-06-18"), email: "diego.santos@email.com",       celular: "11991110007", cidade: "Osasco",         estado: "SP", estadoCivil: "CASADO",       profissao: "Motorista" },
    { nome: "Bruno Costa Ribeiro",        cpf: "10100000008", sexo: "M", dataNascimento: new Date("1997-12-05"), email: "bruno.costa@email.com",        celular: "11991110008", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estagiário" },
    { nome: "Eduardo Lima Martins",       cpf: "10100000009", sexo: "M", dataNascimento: new Date("1970-08-14"), email: "eduardo.lima@email.com",       celular: "11991110009", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Engenheiro" },
    { nome: "Thiago Alves Gomes",         cpf: "10100000010", sexo: "M", dataNascimento: new Date("1993-02-27"), email: "thiago.alves@email.com",       celular: "11991110010", cidade: "Campinas",       estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Arquiteto" },
    { nome: "Rodrigo Pereira Nunes",      cpf: "10100000011", sexo: "M", dataNascimento: new Date("1980-05-19"), email: "rodrigo.pereira@email.com",    celular: "11991110011", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Advogado" },
    { nome: "Vinicius Martins Rocha",     cpf: "10100000012", sexo: "M", dataNascimento: new Date("1998-10-03"), email: "vinicius.martins@email.com",   celular: "11991110012", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Universitário" },
    { nome: "Leandro Gomes Freitas",      cpf: "10100000013", sexo: "M", dataNascimento: new Date("1986-03-29"), email: "leandro.gomes@email.com",      celular: "11991110013", cidade: "Barueri",        estado: "SP", estadoCivil: "CASADO",       profissao: "Gerente Comercial" },
    { nome: "Anderson Ribeiro Dias",      cpf: "10100000014", sexo: "M", dataNascimento: new Date("1979-07-11"), email: "anderson.ribeiro@email.com",   celular: "11991110014", cidade: "São Paulo",      estado: "SP", estadoCivil: "SEPARADO",    profissao: "Técnico em TI" },
    { nome: "Marcelo Freitas Lopes",      cpf: "10100000015", sexo: "M", dataNascimento: new Date("1965-12-20"), email: "marcelo.freitas@email.com",    celular: "11991110015", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Aposentado" },
    { nome: "Caio Dias Machado",          cpf: "10100000016", sexo: "M", dataNascimento: new Date("2000-04-08"), email: "caio.dias@email.com",          celular: "11991110016", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estudante" },
    { nome: "Renato Lopes Mendes",        cpf: "10100000017", sexo: "M", dataNascimento: new Date("1977-09-16"), email: "renato.lopes@email.com",       celular: "11991110017", cidade: "São Bernardo",   estado: "SP", estadoCivil: "CASADO",       profissao: "Supervisor de Produção" },
    { nome: "Alex Machado Cardoso",       cpf: "10100000018", sexo: "M", dataNascimento: new Date("1991-01-07"), email: "alex.machado@email.com",       celular: "11991110018", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Programador" },
    { nome: "Henrique Mendes Teixeira",   cpf: "10100000019", sexo: "M", dataNascimento: new Date("1968-06-25"), email: "henrique.mendes@email.com",    celular: "11991110019", cidade: "São Paulo",      estado: "SP", estadoCivil: "VIUVO",       profissao: "Dentista" },
    { nome: "Fábio Cardoso Cruz",         cpf: "10100000020", sexo: "M", dataNascimento: new Date("1984-11-13"), email: "fabio.cardoso@email.com",      celular: "11991110020", cidade: "Mogi das Cruzes",estado: "SP", estadoCivil: "CASADO",       profissao: "Farmacêutico" },
    { nome: "Paulo Cruz Moreira",         cpf: "10100000021", sexo: "M", dataNascimento: new Date("1973-02-04"), email: "paulo.cruz@email.com",         celular: "11991110021", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Engenheiro Civil" },
    { nome: "Jorge Moreira Correia",      cpf: "10100000022", sexo: "M", dataNascimento: new Date("1960-08-28"), email: "jorge.moreira@email.com",      celular: "11991110022", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Aposentado" },
    { nome: "Márcio Correia Monteiro",    cpf: "10100000023", sexo: "M", dataNascimento: new Date("1989-05-17"), email: "marcio.correia@email.com",     celular: "11991110023", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Nutricionista" },
    { nome: "Adriano Monteiro Pinto",     cpf: "10100000024", sexo: "M", dataNascimento: new Date("1994-10-09"), email: "adriano.monteiro@email.com",   celular: "11991110024", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Personal Trainer" },
    { nome: "Cristiano Pinto Cavalcanti", cpf: "10100000025", sexo: "M", dataNascimento: new Date("1982-03-21"), email: "cristiano.pinto@email.com",    celular: "11991110025", cidade: "Guarulhos",      estado: "SP", estadoCivil: "CASADO",       profissao: "Arquiteto" },
    // Femininas
    { nome: "Mariana Silva Rodrigues",    cpf: "10100000026", sexo: "F", dataNascimento: new Date("1992-04-14"), email: "mariana.silva@email.com",      celular: "11991110026", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Designer Gráfico" },
    { nome: "Fernanda Santos Carvalho",   cpf: "10100000027", sexo: "F", dataNascimento: new Date("1987-08-03"), email: "fernanda.santos@email.com",    celular: "11991110027", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Professora" },
    { nome: "Camila Lima Nascimento",     cpf: "10100000028", sexo: "F", dataNascimento: new Date("1996-01-19"), email: "camila.lima@email.com",        celular: "11991110028", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Nutricionista" },
    { nome: "Larissa Costa Oliveira",     cpf: "10100000029", sexo: "F", dataNascimento: new Date("1990-06-07"), email: "larissa.costa@email.com",      celular: "11991110029", cidade: "Campinas",       estado: "SP", estadoCivil: "CASADO",       profissao: "Psicóloga" },
    { nome: "Patrícia Ferreira Souza",    cpf: "10100000030", sexo: "F", dataNascimento: new Date("1978-11-22"), email: "patricia.ferreira@email.com",  celular: "11991110030", cidade: "São Paulo",      estado: "SP", estadoCivil: "DIVORCIADO",  profissao: "Assistente Social" },
    { nome: "Aline Alves Barbosa",        cpf: "10100000031", sexo: "F", dataNascimento: new Date("1994-03-10"), email: "aline.alves@email.com",        celular: "11991110031", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Enfermeira" },
    { nome: "Vanessa Pereira Santos",     cpf: "10100000032", sexo: "F", dataNascimento: new Date("1983-07-28"), email: "vanessa.pereira@email.com",    celular: "11991110032", cidade: "Santo André",    estado: "SP", estadoCivil: "CASADO",       profissao: "Advogada" },
    { nome: "Natalia Ribeiro Costa",      cpf: "10100000033", sexo: "F", dataNascimento: new Date("1999-12-05"), email: "natalia.ribeiro@email.com",    celular: "11991110033", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estudante" },
    { nome: "Isabela Martins Lima",       cpf: "10100000034", sexo: "F", dataNascimento: new Date("1988-05-16"), email: "isabela.martins@email.com",    celular: "11991110034", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Farmacêutica" },
    { nome: "Beatriz Gomes Alves",        cpf: "10100000035", sexo: "F", dataNascimento: new Date("1993-09-02"), email: "beatriz.gomes@email.com",      celular: "11991110035", cidade: "Osasco",         estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Bióloga" },
    { nome: "Priscila Nunes Pereira",     cpf: "10100000036", sexo: "F", dataNascimento: new Date("1981-02-14"), email: "priscila.nunes@email.com",     celular: "11991110036", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Contadora" },
    { nome: "Juliana Rocha Martins",      cpf: "10100000037", sexo: "F", dataNascimento: new Date("1995-07-23"), email: "juliana.rocha@email.com",      celular: "11991110037", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Fisioterapeuta" },
    { nome: "Carla Freitas Gomes",        cpf: "10100000038", sexo: "F", dataNascimento: new Date("1976-04-11"), email: "carla.freitas@email.com",      celular: "11991110038", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Secretária Executiva" },
    { nome: "Simone Dias Ribeiro",        cpf: "10100000039", sexo: "F", dataNascimento: new Date("1969-10-30"), email: "simone.dias@email.com",        celular: "11991110039", cidade: "São Paulo",      estado: "SP", estadoCivil: "VIUVO",       profissao: "Aposentada" },
    { nome: "Amanda Lopes Freitas",       cpf: "10100000040", sexo: "F", dataNascimento: new Date("1997-08-17"), email: "amanda.lopes@email.com",       celular: "11991110040", cidade: "Barueri",        estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estagiária" },
    { nome: "Leticia Machado Dias",       cpf: "10100000041", sexo: "F", dataNascimento: new Date("2001-03-26"), email: "leticia.machado@email.com",    celular: "11991110041", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Estudante" },
    { nome: "Andressa Mendes Lopes",      cpf: "10100000042", sexo: "F", dataNascimento: new Date("1986-06-08"), email: "andressa.mendes@email.com",    celular: "11991110042", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Médica" },
    { nome: "Raquel Cardoso Machado",     cpf: "10100000043", sexo: "F", dataNascimento: new Date("1991-11-20"), email: "raquel.cardoso@email.com",     celular: "11991110043", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Jornalista" },
    { nome: "Débora Teixeira Mendes",     cpf: "10100000044", sexo: "F", dataNascimento: new Date("1984-01-15"), email: "debora.teixeira@email.com",    celular: "11991110044", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Vendedora" },
    { nome: "Eliane Cruz Cardoso",        cpf: "10100000045", sexo: "F", dataNascimento: new Date("1972-09-04"), email: "eliane.cruz@email.com",        celular: "11991110045", cidade: "Guarulhos",      estado: "SP", estadoCivil: "CASADO",       profissao: "Dentista" },
    { nome: "Tatiana Moreira Cruz",       cpf: "10100000046", sexo: "F", dataNascimento: new Date("1989-05-27"), email: "tatiana.moreira@email.com",    celular: "11991110046", cidade: "São Paulo",      estado: "SP", estadoCivil: "SOLTEIRO",    profissao: "Publicitária" },
    { nome: "Viviane Correia Moreira",    cpf: "10100000047", sexo: "F", dataNascimento: new Date("1980-02-18"), email: "viviane.correia@email.com",    celular: "11991110047", cidade: "São Paulo",      estado: "SP", estadoCivil: "DIVORCIADO",  profissao: "Gerente de RH" },
    { nome: "Sandra Monteiro Correia",    cpf: "10100000048", sexo: "F", dataNascimento: new Date("1967-12-09"), email: "sandra.monteiro@email.com",    celular: "11991110048", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Enfermeira" },
    { nome: "Célia Pinto Monteiro",       cpf: "10100000049", sexo: "F", dataNascimento: new Date("1975-04-21"), email: "celia.pinto@email.com",        celular: "11991110049", cidade: "São Paulo",      estado: "SP", estadoCivil: "CASADO",       profissao: "Fisioterapeuta" },
    { nome: "Vera Cavalcanti Pinto",      cpf: "10100000050", sexo: "F", dataNascimento: new Date("1963-08-13"), email: "vera.cavalcanti@email.com",    celular: "11991110050", cidade: "São Paulo",      estado: "SP", estadoCivil: "VIUVO",       profissao: "Aposentada" },
  ];

  const pacientesAdicionais: { id: string }[] = [];
  for (const dados of dadosPacientesAdicionais) {
    const p = await prisma.paciente.create({
      data: { clinicaId: clinicaExemplo.id, ativo: true, ...dados },
    });
    pacientesAdicionais.push(p);
  }

  console.log("✅ Pacientes adicionais criados:", { total: pacientesAdicionais.length });

  // ============================================
  // 25. Criar Agendamentos para os Próximos Dias
  // ============================================
  console.log("📅 Criando agendamentos para os próximos 7 dias úteis...");

  const getProximosDiasUteis = (quantidade: number): Date[] => {
    const dias: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    let offset = 1;
    while (dias.length < quantidade) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) dias.push(d);
      offset++;
    }
    return dias;
  };

  const diasUteis = getProximosDiasUteis(7);
  const horariosAgenda = [8, 9, 10, 11, 14, 15, 16, 17];
  const statusRotacao = ["AGENDADA", "AGENDADA", "CONFIRMADA", "AGENDADA", "CONFIRMADA"];

  const medicosAgenda = [
    { medico: medicoRegistro1, codigoTuss: codigosTuss[0], tipoConsulta: tiposConsulta[0] }, // Clínica Geral
    { medico: medicoRegistro2, codigoTuss: codigosTuss[1], tipoConsulta: tiposConsulta[0] }, // Cardiologia
    { medico: medicoRegistro3, codigoTuss: codigosTuss[2], tipoConsulta: tiposConsulta[0] }, // Pediatria
    ...medicosExtrasRegistros.map(({ medico, codigoTussIdx }) => ({
      medico,
      codigoTuss: codigosTuss[codigoTussIdx],
      tipoConsulta: tiposConsulta[0],
    })),
  ];

  const todosPacientesPool = [...pacientes, ...pacientesAdicionais];

  const consultasData: {
    clinicaId: string;
    pacienteId: string;
    medicoId: string;
    dataHora: Date;
    status: string;
    codigoTussId: string;
    tipoConsultaId: string;
    modalidade: string;
    valorCobrado: number;
  }[] = [];

  let pIdx = 0;
  for (const dia of diasUteis) {
    for (const { medico, codigoTuss, tipoConsulta } of medicosAgenda) {
      for (const hora of horariosAgenda) {
        const dataHora = new Date(dia);
        dataHora.setHours(hora, 0, 0, 0);

        consultasData.push({
          clinicaId: clinicaExemplo.id,
          pacienteId: todosPacientesPool[pIdx % todosPacientesPool.length].id,
          medicoId: medico.id,
          dataHora,
          status: statusRotacao[pIdx % statusRotacao.length],
          codigoTussId: codigoTuss.id,
          tipoConsultaId: tipoConsulta.id,
          modalidade: "PRESENCIAL",
          valorCobrado: 180.0,
        });

        pIdx++;
      }
    }
  }

  const resultConsultas = await prisma.consulta.createMany({
    data: consultasData,
    skipDuplicates: true,
  });

  console.log("✅ Agendamentos criados:", { total: resultConsultas.count });

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
  console.log(`✅ Médicos: ${3 + medicosExtrasRegistros.length} (3 base + ${medicosExtrasRegistros.length} com avatar)`);
  console.log(`✅ Exames: ${exames.length}`);
  console.log(`✅ Medicamentos: ${medicamentos.length}`);
  console.log(`✅ Procedimentos: ${procedimentos.length}`);
  console.log(`✅ Formas de Pagamento: ${formasPagamento.length}`);
  console.log(`✅ Pacientes: ${pacientes.length + pacientesAdicionais.length} (${pacientes.length} base + ${pacientesAdicionais.length} adicionais)`);
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
  console.log(`✅ Agendamentos (próximos 7 dias úteis): ${resultConsultas.count}`);
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
