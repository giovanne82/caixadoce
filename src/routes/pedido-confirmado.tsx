import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageCircle, ArrowLeft, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pedido-confirmado")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      session_id: (search.session_id as string) || "",
    };
  },
  head: () => ({
    meta: [
      { title: "Pedido Confirmado — CaixaDoce" },
      { name: "description", content: "Seu pagamento foi aprovado com sucesso." },
    ],
  }),
  component: PedidoConfirmadoView,
});

function PedidoConfirmadoView() {
  const navigate = useNavigate();
  const { session_id } = Route.useSearch();

  const handleEnviarWhatsapp = () => {
    const sessaoText = session_id ? ` (Comprovante Stripe ID: ${session_id})` : "";
    const msg = `Olá! Acabei de realizar o pagamento via cartão de crédito.${sessaoText}\n\nAbaixo está o meu comprovante de confirmação da Stripe. Podem confirmar o recebimento do pedido? Obrigado(a)!`;
    const linkWa = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(linkWa, "_blank");
    toast.success("WhatsApp aberto com a mensagem formatada do comprovante!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-lg space-y-6 text-center animate-fade-in">
        {/* Header / Logo */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <CaixaDoceLogo size="lg" className="text-white" />
          <p className="text-xs text-stone-400">Confirmação de Pagamento Online</p>
        </div>

        {/* Card Principal de Sucesso */}
        <Card className="border-emerald-500/30 bg-card/95 backdrop-blur-xl shadow-2xl text-foreground text-left overflow-hidden">
          {/* Faixa Superior Verde */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <Badge variant="secondary" className="mx-auto mb-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Pagamento Processado
            </Badge>

            <CardTitle className="text-2xl font-extrabold text-foreground">
              Pagamento Aprovado!
            </CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
              Seu pedido foi confirmado com sucesso.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6">
            {/* Detalhes da Transação */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Método de Pagamento:</span>
                <span className="font-extrabold text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Cartão de Crédito (Stripe)
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-muted-foreground font-medium">Status da Operação:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  APROVADO 🟢
                </span>
              </div>

              {session_id && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-muted-foreground font-medium">ID da Transação:</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {session_id}
                  </span>
                </div>
              )}
            </div>

            {/* Texto Informativo Amigável */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                Sua encomenda/pedido já foi registrado. Clique no botão abaixo para enviar o comprovante de pagamento diretamente no WhatsApp da confeitaria.
              </p>
            </div>

            {/* BOTÃO EM DESTAQUE VERDE: ENVIAR COMPROVANTE VIA WHATSAPP */}
            <Button
              onClick={handleEnviarWhatsapp}
              size="lg"
              className="w-full font-black text-sm h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Enviar Comprovante para a Loja</span>
            </Button>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t border-border/50 p-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/cardapio/$storeCode", params: { storeCode: "CD-1001" } })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Voltar ao Cardápio Online
            </Button>
          </CardFooter>
        </Card>

        {/* Rodapé institucional */}
        <p className="text-[11px] text-stone-400">
          Pagamento seguro processado via <strong>Stripe Connect</strong> &amp; <strong>CaixaDoce</strong>
        </p>
      </div>
    </div>
  );
}
