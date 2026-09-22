import { createFileRoute } from "@tanstack/react-router";
import { PrivacidadeComponent } from "./privacidade";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — CaixaDoce" },
      { name: "description", content: "Política de Privacidade e Proteção de Dados (LGPD) do CaixaDoce." },
    ],
  }),
  component: PrivacidadeComponent,
});
