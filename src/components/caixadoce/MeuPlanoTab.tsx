import { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Zap,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  Check,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  X,
  Flame,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  obterPlanoEfetivoEstabelecimento,
  PLANOS_CONFIG,
  salvarDadosPlanoEstabelecimento,
} from "@/lib/planos-utils";
import { MercadoPagoBrick } from "@/components/caixadoce/MercadoPagoBrick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function MeuPlanoTab() {
  const { user, profile, updateEstablishmentPlan } = useAuth();
  const activeCode = profile?.establishmentCode || "";
  const userCreatedAt = (user as any)?.created_at || (profile as any)?.createdAt;

  const [infoPlano, setInfoPlano] = useState(() => obterPlanoEfetivoEstabelecimento(activeCode, userCreatedAt));
  const [modalCheckoutOpen, setModalCheckoutOpen] = useState(false);
  const [modalCancelOpen, setModalCancelOpen] = useState(false);
  const [processandoCancelamento, setProcessandoCancelamento] = useState(false);

  // ESTADO DE CUPOM PROMOCIONAL DE ASSINATURA (SAAS PROMO CODE)
  const [cupomInput, setCupomInput] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [cupomAplicado, setCupomAplicado] = useState<{
    codigo: string;
    percentualDesconto: number;
    descricao: string;
  } | null>(null);

  const recarregarPlano = () => {
    setInfoPlano(obterPlanoEfetivoEstabelecimento(activeCode, userCreatedAt));
  };

  useEffect(() => {
    recarregarPlano();
  }, [activeCode, userCreatedAt]);

  // VALIDAÇÃO SEGURA NO SERVIDOR DO CUPOM PROMOCIONAL (SERVER-SIDE)
  const handleValidarCupom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codigoLimpo = cupomInput.trim().toUpperCase();
    if (!codigoLimpo) {
      toast.error("Por favor, digite um código promocional.");
      return;
    }

    setValidandoCupom(true);
    try {
      const res = await fetch("/api/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cupom: codigoLimpo }),
      });

      const data = await res.json();

      if (res.ok && data.valido) {
        setCupomAplicado({
          codigo: data.cupom,
          percentualDesconto: data.percentualDesconto,
          descricao: data.descricao,
        });
        toast.success(data.mensagem || `Cupom "${data.cupom}" aplicado com sucesso! 🎉`);
      } else {
        toast.error(data.mensagem || "Código promocional inválido ou expirado.");
      }
    } catch (err) {
      console.error("[Validar Cupom Erro]", err);
      toast.error("Erro ao validar código promocional no servidor.");
    } finally {
      setValidandoCupom(false);
    }
  };

  const handleRemoverCupom = () => {
    setCupomAplicado(null);
    setCupomInput("");
    toast.info("Código promocional removido.");
  };

  const valorOriginalPlano = 19.90;
  const valorPlanoComDesconto = useMemo(() => {
    if (!cupomAplicado) return valorOriginalPlano;
    const fator = (100 - cupomAplicado.percentualDesconto) / 100;
    const calc = valorOriginalPlano * fator;
    return parseFloat(calc.toFixed(2));
  }, [cupomAplicado]);

  const handleAbrirCheckout = () => {
    const jaPossuiAssinaturaAtiva =
      infoPlano.status === "ativo" &&
      infoPlano.planoId !== "basico";

    if (jaPossuiAssinaturaAtiva) {
      toast.info("Seu plano já se encontra ativo! Você possui acesso ilimitado a todas as ferramentas do sistema.", {
        duration: 4500,
      });
      const cardRef = document.getElementById("card-status-plano-ativo");
      if (cardRef) {
        cardRef.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setModalCheckoutOpen(true);
  };

  const handleMudarParaBasico = () => {
    if (isPlanoAtivo) {
      toast.info(
        "Seu estabelecimento já possui um plano superior ativo. Para migrar para o Plano Básico, utilize a opção 'Gerenciar / Cancelar Assinatura' acima.",
        { duration: 4500 }
      );
      return;
    }

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
      const res = await fetch("/api/mercadopago/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estabelecimentoCodigo: activeCode }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao processar cancelamento no Mercado Pago.");
      }

      salvarDadosPlanoEstabelecimento(activeCode, {
        planoId: "basico",
        status: "cancelado",
      });
      if (updateEstablishmentPlan) {
        await updateEstablishmentPlan("basico" as any, false);
      }

      setModalCancelOpen(false);
      recarregarPlano();
      toast.info("Assinatura cancelada com sucesso no Mercado Pago. Seu plano mudou para o Plano Básico.");
    } catch (err: any) {
      console.error("[Cancel Subscription Error]", err);
      toast.error(`Erro ao cancelar assinatura: ${err.message}`);
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const planoAtualConfig = PLANOS_CONFIG[infoPlano.planoId] || PLANOS_CONFIG.mensal;
  const isPlanoAtivo = infoPlano.status === "ativo" && infoPlano.planoId !== "basico";
  const isProOuTrialAtivo = isPlanoAtivo || infoPlano.status === "trial";

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Meu Plano &amp; Assinatura <Crown className="w-6 h-6 text-[#8E7CC3]" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Aproveite 7 dias grátis de acesso ilimitado ou assine o Plano Mensal Completo via Mercado Pago.
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
              🔥 Plano Mensal Completo PRO por Tempo Limitado!
            </h4>
            <p className="text-xs text-white/90">
              Garanta acesso ilimitado a todas as ferramentas: <strong>Plano Mensal Completo por apenas R$ {valorPlanoComDesconto.toFixed(2).replace(".", ",")}/mês</strong> sem fidelidade.
            </p>
          </div>
        </div>
        {!isPlanoAtivo && (
          <Button
            onClick={handleAbrirCheckout}
            className="bg-white text-purple-900 hover:bg-amber-300 hover:text-purple-950 font-black text-xs shrink-0 shadow-md border-0"
          >
            Assinar Agora
          </Button>
        )}
      </div>

      {/* BANNER DE STATUS DO PLANO E TRIAL DE 7 DIAS */}
      <Card id="card-status-plano-ativo" className="border-2 border-primary/30 shadow-md bg-card overflow-hidden">
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
                      ? "Assinatura Ativa (Ilimitado)"
                      : infoPlano.status === "trial"
                      ? `🎁 Trial: ${infoPlano.diasRestantesTrial ?? 7} dias grátis restantes`
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
              {isPlanoAtivo ? (
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
                  onClick={handleAbrirCheckout}
                  className="font-extrabold shadow-md bg-[#8E7CC3] hover:bg-[#7C69B3] text-white w-full sm:w-auto text-xs"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Assinar Mensal (R$ {valorPlanoComDesconto.toFixed(2).replace(".", ",")}/mês)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* CARD LIMPO: INPUT DE CÓDIGO PROMOCIONAL DE ASSINATURA SAAS */}
      {/* ========================================================================= */}
      <Card className="border border-purple-500/30 bg-purple-500/5 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" /> Possui um código promocional?
              </Label>
              <p className="text-xs text-muted-foreground">
                Insira o código do seu cupom SaaS para obter desconto exclusivo na assinatura do aplicativo.
              </p>
            </div>

            <form onSubmit={handleValidarCupom} className="flex items-center gap-2 w-full sm:w-auto">
              {cupomAplicado ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <Badge variant="default" className="bg-emerald-600 font-extrabold text-xs">
                    {cupomAplicado.codigo} (-{cupomAplicado.percentualDesconto}%)
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoverCupom}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                    title="Remover cupom"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Ex: CAIXADOCEVIP20"
                    value={cupomInput}
                    onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-mono uppercase font-bold w-44"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={validandoCupom || !cupomInput.trim()}
                    className="h-9 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {validandoCupom ? "Validando..." : "Aplicar"}
                  </Button>
                </>
              )}
            </form>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* OS CARDS COMPARATIVOS DE PLANOS (GRATUITO E MENSAL R$ 19,90) */}
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
              Para organizar suas compras e matérias-primas com acesso exclusivo à Lista de Compras.
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
                <span><strong>Acesso Exclusivo à Lista de Compras Interativa</strong></span>
              </li>
              <li className="flex items-start gap-2 text-stone-400">
                <X className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-through">Escanear a Notinha com IA (Bloqueado no Básico)</span>
              </li>
              <li className="flex items-start gap-2 text-stone-400">
                <X className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-through">Calendário de Encomendas &amp; Clientes (Bloqueado)</span>
              </li>
              <li className="flex items-start gap-2 text-stone-400">
                <X className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-through">Painel Financeiro &amp; Fluxo de Caixa (Bloqueado)</span>
              </li>
              <li className="flex items-start gap-2 text-stone-400">
                <X className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-through">Cardápio Digital Público &amp; Produtos (Bloqueado)</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              variant="outline"
              className={`w-full text-xs font-bold transition-all ${
                infoPlano.planoId === "basico" || isProOuTrialAtivo
                  ? "opacity-60 bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-300 dark:border-stone-700 cursor-not-allowed pointer-events-none"
                  : ""
              }`}
              disabled={infoPlano.planoId === "basico" || isProOuTrialAtivo}
              onClick={handleMudarParaBasico}
            >
              {infoPlano.planoId === "basico"
                ? "Plano Atual"
                : isProOuTrialAtivo
                ? "Plano Básico Desativado (Possui Assinatura PRO Ativa)"
                : "Usar Plano Gratuito"}
            </Button>
          </div>
        </Card>

        {/* CARD 2: PLANO MENSAL COMPLETO (COM SUPORTE A CUPOM DE DESCONTO) */}
        <Card className="border-2 border-[#8E7CC3] shadow-2xl relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8E7CC3] to-purple-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" /> RECOMENDADO
          </div>

          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-bold text-[#7C3AED] bg-[#F3EEF9] border border-[#8E7CC3]/30">
              🔥 ACESSO COMPLETO PRO
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center justify-between">
              Mensal Completo <Zap className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Acesso total ilimitado a todas as ferramentas com flexibilidade mensal sem fidelidade.
            </CardDescription>
            <div className="pt-3">
              {cupomAplicado ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600 font-mono">
                      R$ {valorPlanoComDesconto.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm line-through text-muted-foreground font-mono">
                      R$ 19,90
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold"> / mês</span>
                  </div>
                  <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white font-extrabold shadow-sm px-2.5 py-1">
                    🎉 Cupom Aplicado! {cupomAplicado.codigo} (-{cupomAplicado.percentualDesconto}% OFF)
                  </Badge>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#7C3AED]">R$ 19,90</span>
                  <span className="text-xs text-muted-foreground font-semibold"> / mês</span>
                </div>
              )}
              <p className="text-[11px] font-bold text-[#7C3AED] mt-1">
                Preço promocional • Cancele quando quiser
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acesso Ilimitado Completo:</p>
            <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Escanear a Notinha com IA (Ilimitado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Ficha Técnica &amp; Precificação de Produtos (Margem Real sem Prejuízo)</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Atualização automática de custos com base no <strong>último preço comprado</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Milhares de pré-cadastros de insumos para agilizar sua Lista de Compras</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Controlar pedidos de clientes (Calendário de Encomendas)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Controle financeiro dos pedidos e fluxo de caixa</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Cardápio digital personalizado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Consolidação automática de receitas na Lista de Compras</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Compartilhamento de conta com outro usuário</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={handleAbrirCheckout}
              disabled={isPlanoAtivo}
              className={`w-full font-extrabold shadow-lg text-xs py-5 ${
                isPlanoAtivo
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white cursor-default opacity-90"
                  : "bg-gradient-to-r from-[#8E7CC3] to-purple-600 hover:from-[#7C69B3] hover:to-purple-700 text-white"
              }`}
            >
              {isPlanoAtivo ? "✓ Plano Já Ativo (Acesso Ilimitado)" : `Assinar Plano Mensal (R$ ${valorPlanoComDesconto.toFixed(2).replace(".", ",")}/mês)`}
              {!isPlanoAtivo && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </Card>

      </div>

      {/* MODAL: CHECKOUT BRICKS MERCADO PAGO COM VALOR ATUALIZADO PELO CUPOM */}
      <Dialog open={modalCheckoutOpen} onOpenChange={setModalCheckoutOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <MercadoPagoBrick
            estabelecimentoCodigo={activeCode}
            userEmail={user?.email || ""}
            planoId="mensal"
            nomePlano={cupomAplicado ? `Plano Mensal Completo PRO (Cupom ${cupomAplicado.codigo})` : "Plano Mensal Completo PRO"}
            valor={valorPlanoComDesconto}
            onSuccess={() => {
              salvarDadosPlanoEstabelecimento(activeCode, {
                planoId: "mensal",
                status: "ativo",
              });
              if (updateEstablishmentPlan) {
                updateEstablishmentPlan("mensal" as any, true);
              }
              recarregarPlano();
              setModalCheckoutOpen(false);
              toast.success("🎉 Assinatura ativada com sucesso!");
            }}
            onCancel={() => setModalCheckoutOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
