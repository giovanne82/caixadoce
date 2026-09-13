import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { OnboardingView } from "@/components/auth/OnboardingView";
import { isStoreNeedsOnboarding } from "@/lib/onboarding-utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurar Confeitaria — CaixaDoce" },
      { name: "description", content: "Configuração inicial dos dados da sua confeitaria no CaixaDoce." },
    ],
  }),
  component: OnboardingRouteComponent,
});

function OnboardingRouteComponent() {
  const { user, profile, isMounted, authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMounted || authLoading) return;

    // 1. Não autenticado -> Redireciona para o login
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // 2. Se a loja já tiver todos os dados essenciais configurados -> Redireciona para o painel principal
    if (profile && !isStoreNeedsOnboarding(profile)) {
      navigate({ to: "/" });
    }
  }, [user, profile, isMounted, authLoading, navigate]);

  if (!isMounted || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF5FF] space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="text-xs font-semibold text-purple-900 animate-pulse">Carregando dados da sua confeitaria...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <OnboardingView />;
}
