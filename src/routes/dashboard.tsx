import { createFileRoute } from "@tanstack/react-router";
import { Index } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CaixaDoce" },
      { name: "description", content: "Painel de controle e gestão da sua confeitaria." },
    ],
  }),
  component: DashboardRouteComponent,
});

function DashboardRouteComponent() {
  return <Index />;
}
