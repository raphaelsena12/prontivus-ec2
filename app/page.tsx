"use client";

import { useState } from "react";
import { Check, Zap, Shield, Clock, Headphones, ArrowRight } from "lucide-react";

const PLANOS = {
  BASICO: {
    nome: "Básico",
    preco: 299,
    precoFormatado: "R$ 299",
    descricao: "Ideal para clínicas iniciando sua jornada digital",
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
    preco: 599,
    precoFormatado: "R$ 599",
    descricao: "Perfeito para clínicas em crescimento",
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
    preco: 999,
    precoFormatado: "R$ 999",
    descricao: "Solução completa para clínicas de alta performance",
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

type PlanoKey = keyof typeof PLANOS;

export default function LandingPage() {
  const [loading, setLoading] = useState<PlanoKey | null>(null);

  const handleSelectPlan = async (plano: PlanoKey) => {
    setLoading(plano);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plano }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Erro:", data);
        alert(`Erro ao criar sessão de pagamento: ${data.details || data.error}`);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao processar pagamento: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Prontivus</span>
            </div>
            <a
              href="/login"
              className="text-slate-300 hover:text-white transition-colors font-medium"
            >
              Já tenho conta
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              Potencializado por Inteligência Artificial
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Sistema completo para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              gestão de clínicas
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Prontuário eletrônico, agendamentos, financeiro, TISS/TUSS e muito mais.
            Tudo integrado com IA para otimizar seu tempo.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: "Seguro",
                description: "Dados protegidos com criptografia",
              },
              {
                icon: Clock,
                title: "Rápido",
                description: "Interface otimizada para agilidade",
              },
              {
                icon: Zap,
                title: "Inteligente",
                description: "IA para auxiliar no diagnóstico",
              },
              {
                icon: Headphones,
                title: "Suporte",
                description: "Equipe pronta para ajudar",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" id="precos">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Escolha o plano ideal para sua clínica
            </h2>
            <p className="text-slate-400 text-lg">
              Comece hoje mesmo e transforme a gestão da sua clínica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Object.keys(PLANOS) as PlanoKey[]).map((key) => {
              const plano = PLANOS[key];
              const isPopular = "popular" in plano && plano.popular;

              return (
                <div
                  key={key}
                  className={`relative rounded-2xl p-8 ${
                    isPopular
                      ? "bg-gradient-to-b from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50"
                      : "bg-slate-800/50 border border-slate-700/50"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {plano.nome}
                    </h3>
                    <p className="text-slate-400 text-sm">{plano.descricao}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">
                      {plano.precoFormatado}
                    </span>
                    <span className="text-slate-400">/mês</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plano.recursos.map((recurso) => (
                      <li key={recurso} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-sm">{recurso}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(key)}
                    disabled={loading !== null}
                    className={`w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      isPopular
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === key ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Começar agora
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto para transformar sua clínica?
            </h2>
            <p className="text-slate-400 mb-8">
              Junte-se a centenas de clínicas que já utilizam o Prontivus para
              otimizar seus processos e melhorar o atendimento.
            </p>
            <a
              href="#precos"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Escolher meu plano
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Prontivus</span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Prontivus. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
