import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { TipoUsuario } from "@/lib/generated/prisma/enums";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Se estiver autenticado e tentando acessar /login ou /, redirecionar para dashboard
    // Mas se precisar selecionar tenant, redirecionar para seleção
    if ((pathname === "/login" || pathname === "/") && token) {
      const url = req.nextUrl.clone();
      if (token.requiresTenantSelection) {
        url.pathname = "/selecionar-clinica";
      } else {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }

    // Se estiver na página de seleção mas não precisar selecionar, ir para dashboard
    if (pathname === "/selecionar-clinica" && token && !token.requiresTenantSelection) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Criar headers customizados
    const requestHeaders = new Headers(req.headers);

    if (token) {
      // Adicionar headers com dados do usuário
      requestHeaders.set("x-user-id", token.id || "");
      requestHeaders.set("x-user-tipo", token.tipo || "");

      // Adicionar x-clinica-id apenas se não for SUPER_ADMIN
      if (token.tipo !== TipoUsuario.SUPER_ADMIN && token.clinicaId) {
        requestHeaders.set("x-clinica-id", token.clinicaId);
      } else {
        requestHeaders.set("x-clinica-id", "");
      }
    }

    // Criar resposta com headers customizados
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Adicionar headers também na resposta (para uso em client-side se necessário)
    if (token) {
      response.headers.set("x-user-id", token.id || "");
      response.headers.set("x-user-tipo", token.tipo || "");

      if (token.tipo !== TipoUsuario.SUPER_ADMIN && token.clinicaId) {
        response.headers.set("x-clinica-id", token.clinicaId);
      } else {
        response.headers.set("x-clinica-id", "");
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Rotas públicas - sempre permitir acesso
        const publicRoutes = [
          "/login",
          "/api/auth",
          "/api/public",
          "/api/stripe",
          "/pagamento",
        ];

        // Rotas especiais que requerem auth mas não devem redirecionar
        const authSpecialRoutes = ["/selecionar-clinica"];

        // Página raiz (landing page) é pública
        if (pathname === "/") {
          return true;
        }

        const isPublicRoute = publicRoutes.some((route) =>
          pathname.startsWith(route)
        );

        if (isPublicRoute) {
          return true; // Permitir acesso a rotas públicas
        }

        // Rotas especiais requerem autenticação
        const isAuthSpecialRoute = authSpecialRoutes.some((route) =>
          pathname.startsWith(route)
        );

        if (isAuthSpecialRoute) {
          // Requer token mas não redireciona
          return !!token;
        }

        // Rotas protegidas - requer autenticação
        // Se não tiver token, o withAuth redireciona automaticamente para signIn
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
