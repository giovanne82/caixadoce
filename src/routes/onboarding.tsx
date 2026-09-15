import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { OnboardingView } from "@/components/auth/OnboardingView";
import { isStoreNeedsOnboarding } from "@/lib/onboarding-utils";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";

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
      navigate({ to: "/login" as any });
      return;
    }

    // 2. Se a loja já tiver todos os dados essenciais configurados -> Redireciona para o painel principal
    if (profile && !isStoreNeedsOnboarding(profile)) {
      navigate({ to: "/" as any });
    }
  }, [user, profile, isMounted, authLoading, navigate]);

  if (!isMounted || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF5FF] text-slate-900 space-y-4 p-4 select-none">
        <div className="flex items-center justify-center bg-white p-5 rounded-3xl shadow-sm border border-purple-100/80">
          <CaixaDoceLogo size="lg" stacked />
        </div>
        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border border-purple-200/60 shadow-xs">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-purple-900 tracking-wide animate-pulse">Abrindo CaixaDoce...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <OnboardingView />;
}
