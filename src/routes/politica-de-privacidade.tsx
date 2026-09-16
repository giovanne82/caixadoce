import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — CaixaDoce" },
      { name: "description", content: "Política de Privacidade e Proteção de Dados (LGPD) do CaixaDoce." },
    ],
  }),
  component: PoliticaDePrivacidadeRouteComponent,
});

function PoliticaDePrivacidadeRouteComponent() {
  return <Navigate to="/privacidade" replace />;
}
