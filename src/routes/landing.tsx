import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { LandingPageContent } from "@/components/caixadoce/LandingPageContent";

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/" as any });
    }
  }, [user, navigate]);

  return <LandingPageContent />;
}

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "CaixaDoce | Aplicativo de Gestão para Confeitaria e Doceria" },
      { name: "google-site-verification", content: "9ZitsOhCj6JHbtCUMaIxy1KXNvSsBnUSjpvHVWG2xRg" },
      { name: "description", content: "O aplicativo completo para confeiteiras. Crie seu cardápio digital, calcule fichas técnicas exatas e receba pedidos no piloto automático. Teste grátis!" },
      { property: "og:title", content: "CaixaDoce | Aplicativo de Gestão para Confeitaria e Doceria" },
      { property: "og:description", content: "O aplicativo completo para confeiteiras. Crie seu cardápio digital, calcule fichas técnicas exatas e receba pedidos no piloto automático. Teste grátis!" },
    ],
  }),
  component: LandingPage,
});
