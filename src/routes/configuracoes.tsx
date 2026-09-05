import { createFileRoute } from "@tanstack/react-router";
import { Index } from "./index";

export const Route = createFileRoute("/configuracoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    state: search.state as string | undefined,
    error: search.error as string | undefined,
    error_code: search.error_code as string | undefined,
    error_description: search.error_description as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Configurações — CaixaDoce" },
      { name: "description", content: "Configurações do estabelecimento e integrações de pagamento." },
    ],
  }),
  component: ConfiguracoesRouteComponent,
});

function ConfiguracoesRouteComponent() {
  return <Index defaultTab="config" />;
}
