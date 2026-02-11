import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não está definida");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PLANOS_STRIPE = {
  BASICO: {
    nome: "Básico",
    preco: 29900, // em centavos
    precoFormatado: "R$ 299,00",
    descricao: "Plano básico com 2000 tokens mensais",
    recursos: [
      "2.000 tokens de IA por mês",
      "Gestão de pacientes",
      "Agendamento de consultas",
      "Prontuário eletrônico",
      "Relatórios básicos",
      "Suporte por email",
    ],
  },
  INTERMEDIARIO: {
    nome: "Intermediário",
    preco: 59900, // em centavos
    precoFormatado: "R$ 599,00",
    descricao: "Plano intermediário com 5000 tokens mensais",
    recursos: [
      "5.000 tokens de IA por mês",
      "Todas as funcionalidades do Básico",
      "Gestão financeira completa",
      "Controle de estoque",
      "Integração TISS/TUSS",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    popular: true,
  },
  PROFISSIONAL: {
    nome: "Profissional",
    preco: 99900, // em centavos
    precoFormatado: "R$ 999,00",
    descricao: "Plano profissional com 10000 tokens mensais e telemedicina",
    recursos: [
      "10.000 tokens de IA por mês",
      "Todas as funcionalidades do Intermediário",
      "Telemedicina integrada",
      "API para integrações",
      "Múltiplos usuários ilimitados",
      "Backup automático",
      "Suporte 24/7",
    ],
  },
} as const;

export type PlanoKey = keyof typeof PLANOS_STRIPE;
