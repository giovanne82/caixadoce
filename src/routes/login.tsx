import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginView } from "@/components/auth/LoginView";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
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
