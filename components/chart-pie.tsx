"use client"

import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "Um gráfico de pizza interativo"

const chartData = [
  { categoria: "consultas", valor: 450 },
  { categoria: "exames", valor: 320 },
  { categoria: "procedimentos", valor: 280 },
  { categoria: "telemedicina", valor: 150 },
  { categoria: "outros", valor: 100 },
]

const chartConfig = {
  consultas: {
    label: "Consultas",
    color: "var(--chart-1)",
  },
  exames: {
    label: "Exames",
    color: "var(--chart-2)",
  },
  procedimentos: {
    label: "Procedimentos",
    color: "var(--chart-3)",
  },
  telemedicina: {
    label: "Telemedicina",
    color: "var(--chart-4)",
  },
  outros: {
    label: "Outros",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function ChartPie() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Distribuição de Atendimentos</CardTitle>
        <CardDescription>
          Distribuição por tipo de atendimento no período
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="valor"
              nameKey="categoria"
              innerRadius={50}
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`var(--color-${entry.categoria})`}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {chartData.map((entry) => {
            const config = chartConfig[entry.categoria as keyof typeof chartConfig]
            return (
              <div
                key={entry.categoria}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: `var(--color-${entry.categoria})`,
                  }}
                />
                <span className="text-muted-foreground">
                  {config?.label || entry.categoria}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

