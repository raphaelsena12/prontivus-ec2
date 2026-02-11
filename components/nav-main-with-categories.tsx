"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Icon } from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface NavItem {
  title: string;
  url: string;
  icon?: Icon;
}

export interface NavCategory {
  title: string;
  icon?: Icon;
  items: NavItem[];
  defaultOpen?: boolean;
}

export function NavMainWithCategories({
  categories,
  topItem,
  topItems,
}: {
  categories: NavCategory[];
  topItem?: NavItem;
  topItems?: NavItem[];
}) {
  const pathname = usePathname();
  // Inicializar com null para evitar diferenças entre servidor e cliente
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Atualizar o estado apenas no cliente após a montagem
  useEffect(() => {
    setIsMounted(true);
    const activeCategory = categories.find(cat =>
      cat.items.some(item => pathname?.startsWith(item.url))
    );
    if (activeCategory) {
      setOpenCategory(activeCategory.title);
      return;
    }

    const defaultCategory = categories.find(cat => cat.defaultOpen);
    if (defaultCategory) {
      setOpenCategory(defaultCategory.title);
    }
  }, [pathname, categories]);

  const toggleCategory = (title: string) => {
    setOpenCategory((prev) => {
      if (prev === title) return null;
      return title;
    });
  };

  // Usar topItems se fornecido, caso contrário usar topItem se fornecido
  const itemsToShow = topItems || (topItem ? [topItem] : []);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 px-2">
          {itemsToShow.map((item) => (
            <SidebarMenuItem key={item.url} className="mb-1">
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url || pathname?.startsWith(item.url + "/")}
                tooltip={item.title}
                className="h-10"
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            const isOpen = openCategory === category.title;
            const hasActiveItem = category.items.some(
              (item) => pathname === item.url || pathname.startsWith(item.url + "/")
            );

            return (
              <Collapsible
                key={category.title}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.title)}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "h-10 text-sm transition-colors",
                        "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-transparent",
                        hasActiveItem && "text-sidebar-foreground"
                      )}
                      tooltip={category.title}
                    >
                      {CategoryIcon && <CategoryIcon className="h-4 w-4" />}
                      <span className="flex-1 text-left">{category.title}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarMenuSub className="border-l-0 ml-0 px-0 py-1 gap-0.5 bg-sidebar">
                      {category.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = pathname === item.url || pathname.startsWith(item.url + "/");

                        return (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                              className={cn(
                                "h-10 text-sm transition-all duration-150",
                                "hover:bg-sidebar-accent",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary ml-0 pl-[calc(1rem-2px)]"
                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground pl-4"
                              )}
                            >
                              <Link href={item.url} className="flex items-center gap-3 w-full">
                                {ItemIcon && (
                                  <ItemIcon
                                    className={cn(
                                      "h-[18px] w-[18px] shrink-0 transition-colors",
                                      isActive
                                        ? "text-sidebar-primary"
                                        : "text-sidebar-foreground/50"
                                    )}
                                  />
                                )}
                                <span className="truncate">{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
