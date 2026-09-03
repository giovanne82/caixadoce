import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { LandingPageContent } from "@/components/caixadoce/LandingPageContent";

export { LandingPageContent };

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Gestão Inteligente para Confeiteiras & Doceiras" },
      { name: "google-site-verification", content: "9ZitsOhCj6JHbtCUMaIxy1KXNvSsBnUSjpvHVWG2xRg" },
      {
        name: "description",
        content:
          "Escaneie suas notinhas de mercado com IA, crie seu cardápio online com encomendas agendadas e receba pagamentos por Pix e Cartão.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  return <LandingPageContent />;
}
