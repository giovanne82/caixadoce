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

  const [infoPlano, setInfoPlano] = useState(() => obterPlanoEfetivoEstabelecimento(activeCode));
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [modalCancelOpen, setModalCancelOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [processandoCancelamento, setProcessandoCancelamento] = useState(false);

  const recarregarPlano = () => {
    setInfoPlano(obterPlanoEfetivoEstabelecimento(activeCode));
  };

  useEffect(() => {
    recarregarPlano();
  }, [activeCode]);

  const handleAssinarStripe = async (planoKey: PlanoId = "pro") => {
    setLoadingStripe(true);
    try {
      if (updateEstablishmentPlan) {
        await updateEstablishmentPlan(planoKey, true);
      }

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

  const handleConfirmarCancelamento = async () => {
    setProcessandoCancelamento(true);
    try {
      salvarDadosPlanoEstabelecimento(activeCode, {
        status: "cancelado",
      });
      setModalCancelOpen(false);
      recarregarPlano();
      toast.info("Assinatura cancelada.");
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const planoAtualConfig = PLANOS_CONFIG[infoPlano.planoId] || PLANOS_CONFIG.pro;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Meu Plano &amp; Assinatura <Crown className="w-6 h-6 text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie sua assinatura, faturamento via Stripe e recursos do CaixaDoce.
          </p>
        </div>
      </div>

      {/* Current Status Card */}
      <Card className="border-border/80 shadow-md bg-gradient-to-br from-card via-card to-amber-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{planoAtualConfig.nome}</h3>
                  <Badge
                    variant={infoPlano.status === "ativo" ? "default" : "secondary"}
                    className={
                      infoPlano.status === "ativo"
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-500/20 text-amber-700 border-amber-500/30"
                    }
                  >
                    {infoPlano.status === "ativo"
                      ? "Assinatura Ativa"
                      : infoPlano.status === "trial"
                      ? "Período de Teste (Trial)"
                      : "Cancelado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estabelecimento conectado: <span className="font-mono font-bold">{activeCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {infoPlano.status === "ativo" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalCancelOpen(true)}
                  className="text-xs text-rose-500 hover:text-rose-600"
                >
                  Gerenciar / Cancelar
                </Button>
              ) : (
                <Button
                  onClick={() => handleAssinarStripe("pro")}
                  disabled={loadingStripe}
                  className="font-semibold shadow-md bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {loadingStripe ? "Conectando..." : "Assinar com Stripe"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Plano Inicial / Freemium */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Plano Inicial</CardTitle>
            <CardDescription>Para dar os primeiros passos</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-foreground">Grátis</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {PLANOS_CONFIG.freemium.recursos.map((rec) => (
                <li key={rec} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold"
              disabled={infoPlano.planoId === "freemium"}
              onClick={() => {
                salvarDadosPlanoEstabelecimento(activeCode, { planoId: "freemium", status: "ativo" });
                recarregarPlano();
                toast.success("Plano alterado para Inicial.");
              }}
            >
              {infoPlano.planoId === "freemium" ? "Plano Atual" : "Escolher Inicial"}
            </Button>
          </div>
        </Card>

        {/* Plano Pro (Destaque) */}
        <Card className="border-2 border-primary shadow-xl relative flex flex-col justify-between bg-card">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-sm">
            MAIS POPULAR
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center justify-between">
              Profissional <Zap className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <CardDescription>Para lojas, confeitarias e negócios</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-foreground">R$ 79,90</span>
              <span className="text-xs text-muted-foreground"> / mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {PLANOS_CONFIG.pro.recursos.map((rec) => (
                <li key={rec} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAssinarStripe("pro")}
              disabled={loadingStripe}
              className="w-full font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {infoPlano.planoId === "pro" && infoPlano.status === "ativo"
                ? "Plano Ativo"
                : "Assinar Profissional"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>

        {/* Plano Enterprise / Ilimitado */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center justify-between">
              Enterprise / Ilimitado <Crown className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <CardDescription>Para redes e grandes volumes</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-foreground">R$ 149,90</span>
              <span className="text-xs text-muted-foreground"> / mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {PLANOS_CONFIG.ilimitado.recursos.map((rec) => (
                <li key={rec} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              variant="outline"
              onClick={() => handleAssinarStripe("ilimitado")}
              disabled={loadingStripe}
              className="w-full text-xs font-semibold"
            >
              {infoPlano.planoId === "ilimitado" && infoPlano.status === "ativo"
                ? "Plano Ativo"
                : "Assinar Ilimitado"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal: Cancelamento */}
      <Dialog open={modalCancelOpen} onOpenChange={setModalCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar sua assinatura do CaixaDoce?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Ao cancelar, você perderá o acesso aos recursos profissionais no próximo ciclo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarCancelamento}
              disabled={processandoCancelamento}
            >
              {processandoCancelamento ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
