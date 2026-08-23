import { useState, useEffect } from "react";
import {
  Crown,
  Zap,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertTriangle,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ShoppingCart,
  Receipt,
  CalendarDays,
  Cake,
  DollarSign,
  X,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  obterPlanoEfetivoEstabelecimento,
  PLANOS_CONFIG,
  type PlanoId,
  salvarDadosPlanoEstabelecimento,
} from "@/lib/planos-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { initiateStripeCheckout } from "@/lib/stripe-service";

export function MeuPlanoTab() {
  const { user, profile, updateEstablishmentPlan } = useAuth();
  const activeCode = profile?.establishmentCode || "CD-1001";
  const userCreatedAt = (user as any)?.created_at || (profile as any)?.createdAt;

  const [infoPlano, setInfoPlano] = useState(() => obterPlanoEfetivoEstabelecimento(activeCode, userCreatedAt));
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [modalCancelOpen, setModalCancelOpen] = useState(false);
  const [processandoCancelamento, setProcessandoCancelamento] = useState(false);

  const recarregarPlano = () => {
    setInfoPlano(obterPlanoEfetivoEstabelecimento(activeCode, userCreatedAt));
  };

  useEffect(() => {
    recarregarPlano();
  }, [activeCode, userCreatedAt]);

  const handleAssinarStripe = async (planoKey: PlanoId) => {
    setLoadingStripe(true);
    try {
      if (updateEstablishmentPlan) {
        await updateEstablishmentPlan(planoKey, true);
      }

      salvarDadosPlanoEstabelecimento(activeCode, {
        planoId: planoKey,
        status: "ativo",
      });

      const { checkoutUrl } = await initiateStripeCheckout({
        establishmentCode: activeCode,
        userEmail: user?.email || "contato@caixadoce.com.br",
        planId: planoKey,
        returnUrl: window.location.href.split("?")[0],
      });

      toast.success("Redirecionando para o Stripe Checkout...");
      recarregarPlano();
      window.location.href = checkoutUrl;
    } catch (e: any) {
      toast.error(`Erro no checkout Stripe: ${e.message}`);
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleMudarParaBasico = () => {
    salvarDadosPlanoEstabelecimento(activeCode, {
      planoId: "basico",
      status: "ativo",
    });
    recarregarPlano();
    toast.info("Plano alterado para o Plano Básico (Gratuito).");
  };

  const handleConfirmarCancelamento = async () => {
    setProcessandoCancelamento(true);
    try {
      salvarDadosPlanoEstabelecimento(activeCode, {
        planoId: "basico",
        status: "cancelado",
      });
      setModalCancelOpen(false);
      recarregarPlano();
      toast.info("Assinatura cancelada. Seu plano mudou para o Plano Básico.");
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const planoAtualConfig = PLANOS_CONFIG[infoPlano.planoId] || PLANOS_CONFIG.mensal;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Meu Plano &amp; Assinatura <Crown className="w-6 h-6 text-[#8E7CC3]" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Aproveite 14 dias grátis de acesso ilimitado ou assine o Plano Mensal Completo.
          </p>
        </div>
      </div>

      {/* BANNER PROMOÇÃO DE LANÇAMENTO POR TEMPO LIMITADO */}
      <div className="bg-gradient-to-r from-[#8E7CC3] via-purple-600 to-[#5B478E] rounded-2xl p-4 text-white shadow-lg flex items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
            <Flame className="w-6 h-6 text-amber-300 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
              🔥 Promoção de Lançamento por Tempo Limitado!
            </h4>
            <p className="text-xs text-white/90">
              Garanta acesso ilimitado com preço promocional exclusivo: <strong>Plano Mensal Completo por apenas R$ 14,90/mês</strong> sem fidelidade.
            </p>
          </div>
        </div>
      </div>

      {/* BANNER DE STATUS DO PLANO E TRIAL DE 14 DIAS */}
      <Card className="border-2 border-primary/30 shadow-md bg-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-[#F3EEF9] text-[#7C3AED]">
                <Crown className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold text-foreground">{planoAtualConfig.nome}</h3>
                  <Badge
                    variant={infoPlano.status === "ativo" ? "default" : "secondary"}
                    className={
                      infoPlano.status === "ativo"
                        ? "bg-emerald-600 text-white font-bold"
                        : infoPlano.status === "trial"
                        ? "bg-[#F3EEF9] text-[#5B478E] border border-[#8E7CC3]/40 font-extrabold animate-pulse"
                        : infoPlano.status === "expirado"
                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold"
                        : "bg-stone-500/20 text-stone-700 font-bold"
                    }
                  >
                    {infoPlano.status === "ativo"
                      ? "Assinatura Ativa"
                      : infoPlano.status === "trial"
                      ? `🎁 Trial: ${infoPlano.diasRestantesTrial ?? 14} dias grátis restantes`
                      : infoPlano.status === "expirado"
                      ? "⚠️ Trial Expirado (0 dias restantes)"
                      : "Plano Básico (Gratuito)"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Estabelecimento conectado: <span className="font-mono font-bold text-foreground">{activeCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {infoPlano.status === "ativo" && infoPlano.planoId !== "basico" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalCancelOpen(true)}
                  className="text-xs text-rose-600 hover:bg-rose-500/10 font-bold"
                >
                  Gerenciar / Cancelar Assinatura
                </Button>
              ) : (
                <Button
                  onClick={() => handleAssinarStripe("mensal")}
                  disabled={loadingStripe}
                  className="font-extrabold shadow-md bg-[#8E7CC3] hover:bg-[#7C69B3] text-white w-full sm:w-auto text-xs"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {loadingStripe ? "Conectando..." : "Assinar Mensal (R$ 14,90/mês)"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* OS CARDS COMPARATIVOS DE PLANOS (GRATUITO E MENSAL R$ 14,90) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-stretch">
        
        {/* CARD 1: PLANO BÁSICO (R$ 0,00) */}
        <Card className="border-border shadow-md flex flex-col justify-between bg-card hover:border-border/80 transition-all">
          <CardHeader className="pb-4">
            <Badge variant="outline" className="w-fit mb-2 text-[10px] font-bold text-stone-500 border-stone-300">
              GRATUITO PARA SEMPRE
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Plano Básico
            </CardTitle>
            <CardDescription className="text-xs">
              Para organizar suas compras, finanças e produtos de forma simples e gratuita.
            </CardDescription>
            <div className="pt-3">
              <span className="text-3xl font-black text-foreground">R$ 0,00</span>
              <span className="text-xs text-muted-foreground font-semibold"> / mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Recursos Incluídos:</p>
            <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Acesso Completo ao Painel Financeiro</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Acesso Completo ao Cardápio Digital</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Lista de Compras Interativa (Ilimitada)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Gestão de Múltiplas Listas e Clientes</span>
              </li>
              <li className="flex items-start gap-2 text-stone-400">
                <X className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-through">Scanner de Notinhas com IA &amp; Calendário</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              variant="outline"
              className="w-full text-xs font-bold"
              disabled={infoPlano.planoId === "basico" && infoPlano.status === "ativo"}
              onClick={handleMudarParaBasico}
            >
              {infoPlano.planoId === "basico" && infoPlano.status === "ativo" ? "Plano Atual" : "Usar Plano Gratuito"}
            </Button>
          </div>
        </Card>

        {/* CARD 2: PLANO MENSAL COMPLETO (R$ 14,90 / MÊS - PROMOÇÃO DE LANÇAMENTO) */}
        <Card className="border-2 border-[#8E7CC3] shadow-2xl relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8E7CC3] to-purple-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" /> RECOMENDADO
          </div>

          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-bold text-[#7C3AED] bg-[#F3EEF9] border border-[#8E7CC3]/30">
              🔥 PROMOÇÃO DE LANÇAMENTO
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center justify-between">
              Mensal Completo <Zap className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Acesso total ilimitado a todas as ferramentas com flexibilidade mensal sem fidelidade.
            </CardDescription>
            <div className="pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#7C3AED]">R$ 14,90</span>
                <span className="text-xs text-muted-foreground font-semibold"> / mês</span>
              </div>
              <p className="text-[11px] font-bold text-[#7C3AED] mt-0.5">
                Preço promocional de lançamento • Cancele quando quiser
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acesso Ilimitado Completo:</p>
            <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Scanner de Notinhas com IA (Ilimitado)</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Calendário de Encomendas &amp; Agendamentos</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Painel Financeiro &amp; Fluxo de Caixa Completo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Cardápio Digital Público &amp; Gestão de Produtos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Lista de Compras Interativa &amp; Conciliação</span>
              </li>
              <li className="flex items-start gap-2 text-[#5B478E] font-extrabold">
                <ShieldCheck className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                <span>Suporte Prioritário no WhatsApp</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAssinarStripe("mensal")}
              disabled={loadingStripe}
              className="w-full font-extrabold shadow-lg bg-gradient-to-r from-[#8E7CC3] to-purple-600 hover:from-[#7C69B3] hover:to-purple-700 text-white text-xs py-5"
            >
              {infoPlano.planoId === "mensal" && infoPlano.status === "ativo" ? "Plano Ativo" : "Assinar Plano Mensal (R$ 14,90/mês)"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>

      </div>

      {/* MODAL: CONFIRMAR CANCELAMENTO */}
      <Dialog open={modalCancelOpen} onOpenChange={setModalCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Cancelar Assinatura do CaixaDoce
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza de que deseja cancelar? Ao cancelar, você manterá acesso exclusivo à Lista de Compras no Plano Básico Gratuito.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmarCancelamento}
              disabled={processandoCancelamento}
              className="font-bold"
            >
              {processandoCancelamento ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
