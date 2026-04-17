"use client";

import dynamic from "next/dynamic";

const AgendamentosContent = dynamic(
  () => import("./agendamentos-content").then((m) => ({ default: m.AgendamentosContent })),
  { ssr: false }
);

export function AgendamentosClientWrapper() {
  return <AgendamentosContent />;
}
