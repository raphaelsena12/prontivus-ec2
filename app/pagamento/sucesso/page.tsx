"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Mail, ArrowRight, Zap, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import Link from "next/link";

interface ProcessResult {
  success: boolean;
  message: string;
  data?: {
    clinica: string;
    email: string;
    senha: string;
    plano: string;
    emailEnviado: boolean;
  };
  error?: string;
}

function PagamentoSucessoPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionId) {
      processSession();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const processSession = async () => {
    try {
      const response = await fetch(
        `/api/stripe/process-session?session_id=${sessionId}`
      );
      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, ...data });
      } else {
        const errorMessage = data.error || data.message || "Erro desconhecido";
        setResult({ 
          success: false, 
          message: errorMessage,
          error: errorMessage 
        });
      }
    } catch (error) {
      const errorMessage = "Erro ao processar pagamento";
      setResult({
        success: false,
        message: errorMessage,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Processando seu pagamento...</p>
          <p className="text-slate-500 text-sm mt-2">Criando sua conta e enviando credenciais...</p>
        </div>
      </div>
    );
  }

  // Se já foi processado anteriormente (email já cadastrado)
  if (result && !result.success && result.error?.includes("já está cadastrado")) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <main className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-blue-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Conta já ativa!
              </h1>
              <p className="text-slate-400 text-lg mb-8">
                Seu pagamento já foi processado e sua conta está ativa.
                Use as credenciais enviadas por email para acessar.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                Acessar minha conta
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Se houve erro
  if (result && !result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <main className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Ops! Algo deu errado
              </h1>
              <p className="text-slate-400 text-lg mb-4">
                {result.error}
              </p>
              <p className="text-slate-500 text-sm mb-8">
                Entre em contato com o suporte: suporte@prontivus.com
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-600 transition-all"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Sucesso!
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 sm:p-12">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Pagamento confirmado!
              </h1>
              <p className="text-slate-400 text-lg">
                Sua conta foi criada com sucesso no plano{" "}
                <span className="text-blue-400 font-semibold">
                  {result?.data?.plano}
                </span>
              </p>
            </div>

            {/* Credenciais */}
            {result?.data && (
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Suas credenciais de acesso
                </h3>

                {/* Email */}
                <div className="bg-slate-800 rounded-lg p-4 mb-3">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                    Email
                  </p>
                  <p className="text-white font-mono">{result.data.email}</p>
                </div>

                {/* Senha */}
                <div className="bg-slate-800 rounded-lg p-4 mb-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                    Senha temporária
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-green-400 font-mono text-lg font-bold">
                      {result.data.senha}
                    </p>
                    <button
                      onClick={() => copyToClipboard(result.data!.senha)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Copiar senha"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Aviso */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-400 text-sm">
                    <strong>Importante:</strong> Guarde essas credenciais! Por
                    segurança, altere sua senha no primeiro acesso.
                  </p>
                </div>
              </div>
            )}

            {/* Email Status */}
            <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-8">
              <Mail className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-white font-medium">
                  {result?.data?.emailEnviado
                    ? "Email enviado!"
                    : "Email em processamento"}
                </p>
                <p className="text-slate-400 text-sm">
                  {result?.data?.emailEnviado
                    ? "Verifique sua caixa de entrada e spam"
                    : "Você receberá as credenciais em breve"}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                Acessar minha conta
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Prontivus</span>
        </div>
      </div>
    </header>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PagamentoSucessoPageContent />
    </Suspense>
  );
}
