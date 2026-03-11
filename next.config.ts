import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configuração básica do Next.js
  output: "standalone", // Necessário para Docker

  // Turbopack desabilitado completamente - usando webpack tradicional que é mais estável no Windows
  // O Turbopack causa erros de permissão no Windows (os error 5)

  // Forçar uso do webpack ao invés do Turbopack
  webpack: (config, { isServer }) => {
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
};
