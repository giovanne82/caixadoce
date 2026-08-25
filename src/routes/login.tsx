import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginView } from "@/components/auth/LoginView";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: search.error as string | undefined,
    error_code: search.error_code as string | undefined,
    error_description: search.error_description as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — CaixaDoce" },
      { name: "description", content: "Acesse sua conta do CaixaDoce." },
    ],
  }),
  component: LoginComponent,
});

function LoginComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const errCode = params.get("error_code") || params.get("error");
      const errDesc = params.get("error_description");

      if (errCode || errDesc) {
        window.history.replaceState({}, "", window.location.pathname);
        if (errCode?.includes("bad_oauth_state") || errDesc?.includes("expired") || errDesc?.includes("OAuth")) {
          toast.error("Sessão de login expirada ou cancelada. Por favor, tente entrar novamente.");
        } else {
          toast.error(`Aviso de Autenticação: ${errDesc || errCode}`);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginView onSuccess={() => navigate({ to: "/" })} />
    </div>
  );
}
