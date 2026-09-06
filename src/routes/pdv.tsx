import { createFileRoute } from "@tanstack/react-router";
import { PdvView } from "@/components/caixadoce/PdvView";

export const Route = createFileRoute("/pdv")({
  head: () => ({
    meta: [
      { title: "PDV (Ponto de Venda) — CaixaDoce" },
      { name: "description", content: "Frente de caixa ágil para vendas de balcão e registro de pedidos presenciais." },
    ],
  }),
  component: PdvView,
});
