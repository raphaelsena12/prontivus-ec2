"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Mail, ArrowRight, Zap, Loader2 } from "lucide-react";
import Link from "next/link";

function PagamentoSucessoPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [planoNome, setPlanoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    fetch(`/api/stripe/session-info?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plano) setPlanoNome(data.plano);
      })
      .catch(() => {/* silencioso — planoNome fica null */})
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 sm:p-12">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Pagamento confirmado!
              </h1>
              <p className="text-slate-400 text-lg">
                {planoNome ? (
                  <>
                    Sua assinatura do plano{" "}
                    <span className="text-blue-400 font-semibold">{planoNome}</span>{" "}
                    foi ativada com sucesso.
                  </>
                ) : (
                  "Sua assinatura foi ativada com sucesso."
                )}
              </p>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 mb-8">
              <Mail className="w-6 h-6 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">
                  Verifique seu email
                </p>
                <p className="text-slate-400 text-sm">
                  Suas credenciais de acesso foram enviadas para o email
                  cadastrado no pagamento. Verifique também a pasta de spam.
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8">
              <p className="text-amber-400 text-sm">
                <strong>Importante:</strong> A conta é criada automaticamente
                após a confirmação do pagamento. Se não receber o email em até
                5 minutos, entre em contato com{" "}
                <span className="font-medium">suporte@prontivus.com</span>.
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                Ir para o login
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    }>
      <PagamentoSucessoPageContent />
    </Suspense>
  );
}
