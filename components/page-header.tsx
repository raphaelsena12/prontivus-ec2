import { type LucideIcon } from "lucide-react";
import { type Icon as TablerIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon | TablerIcon;
  title: string;
  subtitle: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, className, children }: PageHeaderProps) {
  return (
    <div className={cn(
      "relative mb-6 rounded-xl border border-blue-100/80 bg-gradient-to-r from-white via-blue-50/50 to-blue-50 px-6 py-5 shadow-sm",
      className
    )}>
      {/* Detalhe decorativo sutil */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-blue-400 to-blue-600" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {subtitle}
            </p>
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
