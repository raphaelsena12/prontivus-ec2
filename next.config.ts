import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configuração básica do Next.js
  output: "standalone", // Necessário para Docker
  
  // Turbopack está desabilitado no server.ts (turbo: false)
  // Usando webpack tradicional que é mais estável no Windows
  // O aviso sobre múltiplos lockfiles pode ser ignorado, pois não afeta o funcionamento
};

export default nextConfig;
