import { createFileRoute } from "@tanstack/react-router";
import { CardapioLojaView } from "@/components/caixadoce/CardapioLojaView";

export const Route = createFileRoute("/cardapio/$storeCode")({
  head: ({ params }) => ({
    meta: [
      { title: `Cardápio Digital — ${params.storeCode}` },
      { name: "description", content: "Faça sua encomenda online com os melhores bolos, doces e sobremesas artesanais." },
    ],
  }),
  component: CardapioLojaView,
});
