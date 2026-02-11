"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  FileText,
  Calendar,
  Stethoscope,
  Menu,
  User,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TipoUsuario } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

interface ProtectedLayoutClientProps {
  children: React.ReactNode;
  user: {
    id: string;
    nome: string;
    email: string;
    tipo: TipoUsuario;
    clinicaId: string | null;
    avatar?: string | null;
  };
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: TipoUsuario[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      TipoUsuario.SUPER_ADMIN,
      TipoUsuario.ADMIN_CLINICA,
      TipoUsuario.MEDICO,
      TipoUsuario.SECRETARIA,
    ],
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: Users,
    roles: [
      TipoUsuario.SUPER_ADMIN,
      TipoUsuario.ADMIN_CLINICA,
      TipoUsuario.MEDICO,
      TipoUsuario.SECRETARIA,
    ],
  },
  {
    label: "Consultas",
    href: "/consultas",
    icon: Calendar,
    roles: [
      TipoUsuario.SUPER_ADMIN,
      TipoUsuario.ADMIN_CLINICA,
      TipoUsuario.MEDICO,
      TipoUsuario.SECRETARIA,
    ],
  },
  {
    label: "Prontuários",
    href: "/prontuarios",
    icon: FileText,
    roles: [
      TipoUsuario.SUPER_ADMIN,
      TipoUsuario.ADMIN_CLINICA,
      TipoUsuario.MEDICO,
    ],
  },
  {
    label: "Médicos",
    href: "/medicos",
    icon: Stethoscope,
    roles: [TipoUsuario.SUPER_ADMIN, TipoUsuario.ADMIN_CLINICA],
  },
];

const adminMenuItems: MenuItem[] = [
  {
    label: "Clínicas",
    href: "/clinicas",
    icon: Building2,
    roles: [TipoUsuario.SUPER_ADMIN],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: Users,
    roles: [TipoUsuario.SUPER_ADMIN, TipoUsuario.ADMIN_CLINICA],
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    roles: [
      TipoUsuario.SUPER_ADMIN,
      TipoUsuario.ADMIN_CLINICA,
      TipoUsuario.MEDICO,
    ],
  },
];

function SidebarContent({
  user,
  onNavigate,
}: {
  user: ProtectedLayoutClientProps["user"];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Ajustar o href de Prontuários para médicos
  const adjustedMenuItems = menuItems.map((item) => {
    if (item.label === "Prontuários" && user.tipo === TipoUsuario.MEDICO) {
      return { ...item, href: "/medico/prontuarios" };
    }
    return item;
  });

  const filteredMenuItems = adjustedMenuItems.filter((item) =>
    item.roles.includes(user.tipo)
  );
  const filteredAdminItems = adminMenuItems.filter((item) =>
    item.roles.includes(user.tipo)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo/Header */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="/LogotipoemFundoTransparente.webp" 
            alt="Prontivus" 
            width={150} 
            height={45}
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <NavigationMenu orientation="vertical" className="w-full">
          <NavigationMenuList className="flex flex-col gap-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <NavigationMenuItem key={item.href} className="w-full">
                  <Link href={item.href} legacyBehavior passHref>
                    <NavigationMenuLink
                      onClick={onNavigate}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              );
            })}

            {filteredAdminItems.length > 0 && (
              <>
                <div className="my-2">
                  <Separator />
                </div>
                {filteredAdminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <NavigationMenuItem key={item.href} className="w-full">
                      <Link href={item.href} legacyBehavior passHref>
                        <NavigationMenuLink
                          onClick={onNavigate}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  );
                })}
              </>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.nome}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtectedLayoutClient({
  children,
  user,
}: ProtectedLayoutClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-background lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent
            user={user}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Image 
                src="/LogotipoemFundoTransparente.webp" 
                alt="Prontivus" 
                width={120} 
                height={36}
                priority
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Nome da Clínica (se não for SUPER_ADMIN) */}
            {user.tipo !== TipoUsuario.SUPER_ADMIN && user.clinicaId && (
              <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <Building2 className="h-4 w-4" />
                <span>Clínica</span>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden font-medium md:inline-block">
                    {user.nome}
                  </span>
                  <ChevronRight className="hidden h-4 w-4 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
