import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pagar/$cobrancaId")({
  head: () => ({
    meta: [
      { title: "Pagamento Seguro — CaixaDoce" },
      { name: "description", content: "Redirecionando para a plataforma de pagamento segura Stripe." },
    ],
  }),
  component: PagarRedirectView,
});

function PagarRedirectView() {
  const { cobrancaId } = useParams({ from: "/pagar/$cobrancaId" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveLink() {
      try {
        // 1. Tenta via API backend
        const res = await fetch(`/api/resolve-pay-link?id=${encodeURIComponent(cobrancaId)}`);
        const data = await res.json();

        if (active) {
          if (res.ok && data.url) {
            window.location.href = data.url;
            return;
          }
        }
      } catch (err) {
        console.warn("[Client Pay Link Resolve API error, trying Supabase direct]", err);
      }

      // 2. Fallback via cliente Supabase
      try {
        const { data: dbData, error: dbError } = await supabase
          .from("transacoes_financeiras")
          .select("comprovante_url")
          .eq("id", cobrancaId)
          .maybeSingle();

        if (active) {
          if (dbData?.comprovante_url) {
            window.location.href = dbData.comprovante_url;
            return;
          }
          if (dbError) {
            console.error("[Supabase Client Query Error]", dbError);
          }
          setError("Link de cobrança não encontrado ou expirado.");
        }
      } catch (err) {
        if (active) {
          setError("Erro ao se comunicar com o servidor de pagamentos.");
        }
      }
    }

    resolveLink();

    return () => {
      active = false;
    };
  }, [cobrancaId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-purple-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
        <div className="flex flex-col items-center justify-center space-y-2">
          <CaixaDoceLogo size="lg" className="text-white" />
          <p className="text-xs text-stone-400">Checkout de Pagamento Seguro</p>
        </div>

        <Card className="border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl text-foreground text-left overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />
          <CardHeader className="text-center pb-6 pt-6">
            {!error ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Loader2 className="w-9 h-9 animate-spin text-primary" />
                </div>
                <CardTitle className="text-xl font-extrabold text-foreground flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Redirecionando...
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Aguarde um instante enquanto abrimos a tela de pagamento segura na Stripe.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-9 h-9 text-rose-600" />
                </div>
                <CardTitle className="text-xl font-extrabold text-foreground">
                  Link Indisponível
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-2">{error}</p>
                <Button
                  onClick={() => (window.location.href = "/")}
                  className="mt-4 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Ir para a Página Inicial
                </Button>
              </>
            )}
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
