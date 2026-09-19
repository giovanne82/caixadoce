import { createFileRoute } from "@tanstack/react-router";
import { CardapioLojaView } from "@/components/caixadoce/CardapioLojaView";
import { z } from "zod";

// Validator flexível que aceita tanto códigos (ex: CD-1004) quanto slugs amigáveis (ex: docesdaana)
const storeCodeParamSchema = z
  .string()
  .min(1, "Identificador da loja é obrigatório")
  .max(100, "Identificador muito longo")
  .transform((val) => val.trim());

export const Route = createFileRoute("/cardapio/$storeCode")({
  parseParams: (params) => ({
    storeCode: storeCodeParamSchema.parse(params.storeCode),
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Cardápio Digital — ${params.storeCode}` },
      { name: "description", content: "Faça sua encomenda online com os melhores bolos, doces e sobremesas artesanais." },
    ],
  }),
  component: CardapioLojaView,
});
