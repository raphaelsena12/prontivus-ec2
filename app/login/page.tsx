import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh relative overflow-hidden bg-white">
      {/* Degradê branco para azul vivo */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #f0f7ff 25%, #dbeafe 50%, #93c5fd 75%, #1E4ED8 100%)',
        }}
      />

      {/* Formas decorativas sutis */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #1E4ED8 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #1E4ED8 0%, transparent 70%)',
        }}
      />

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex min-h-svh items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
