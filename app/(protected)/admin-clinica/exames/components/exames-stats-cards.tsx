"use client";

import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  total: number;
  ativos: number;
  inativos: number;
}

interface ExamesStatsCardsProps {
  stats: Stats | null;
  loading: boolean;
}

export function ExamesStatsCards({ stats, loading }: ExamesStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cardsData = [
    {
      title: "Total",
      value: stats?.total || 0,
      icon: FileText,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      title: "Ativos",
      value: stats?.ativos || 0,
      icon: CheckCircle2,
      iconColor: "text-green-600 dark:text-green-500",
      iconBg: "bg-green-500/10",
    },
    {
      title: "Inativos",
      value: stats?.inativos || 0,
      icon: XCircle,
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {cardsData.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-0.5">{card.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
