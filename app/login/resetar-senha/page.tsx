import { ResetarSenhaForm } from "@/components/resetar-senha-form";
import { Shield, Lock, CheckCircle2 } from "lucide-react";

export default function ResetarSenhaPage() {
  return (
    <div className="min-h-svh relative overflow-hidden" style={{ backgroundColor: 'oklch(0.25 0.08 250)' }}>
      {/* Gradiente com cores do sidebar */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, oklch(0.25 0.08 250), oklch(0.3 0.1 250), oklch(0.2 0.06 250))' }}>
        {/* Overlay escuro para melhorar legibilidade */}
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom right, oklch(0.25 0.08 250 / 0.95), oklch(0.3 0.1 250 / 0.9), oklch(0.2 0.06 250 / 0.95))' }}></div>
        
        {/* Imagem médica de fundo */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
          }}
        ></div>
        
        {/* Padrão sutil de grade médica */}
        <div 
          className="absolute inset-0 opacity-5 z-10"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        ></div>
      </div>

      {/* Conteúdo centralizado */}
      <div className="relative z-20 flex min-h-svh items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Formulário com tudo dentro */}
          <ResetarSenhaForm />
        </div>
      </div>
    </div>
  );
}
