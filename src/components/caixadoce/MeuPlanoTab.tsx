import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  calcularDataExpiracaoAcumulada,
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

  const [cupomInput, setCupomInput] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [cupomAplicado, setCupomAplicado] = useState<{
    codigo: string;
    percentualDesconto: number;
    diasGratis?: number;
    tipoDesconto?: "percentual" | "dias_gratis";
    descricao: string;
  } | null>(null);

  const [planoSelecionadoCheckout, setPlanoSelecionadoCheckout] = useState<"mensal" | "anual">("mensal");

  const recarregarPlano = useCallback(async () => {
    if (!activeCode) return;
    const cleanCode = activeCode.toUpperCase();
    try {
      const { data } = await supabase
        .from("estabelecimentos")
        .select("*")
        .eq("codigo", cleanCode)
        .maybeSingle();

      if (data) {
        const statusBanco = data.status || data.status_assinatura || data.plano_status;
        const planoIdBanco = data.plano || data.plano_id || "mensal";
        const expBanco = data.plano_exp || data.plano_expira_em || data.data_expiracao;
        const expMs = expBanco ? new Date(expBanco).getTime() : 0;
        const isExpValida = !isNaN(expMs) && expMs > Date.now();
        const isStatusAtivo = statusBanco === "ativo" || statusBanco === "active";

        if (isExpValida || (isStatusAtivo && planoIdBanco !== "basico")) {
          const dataExpFinal = isExpValida ? expBanco : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          salvarDadosPlanoEstabelecimento(cleanCode, {
            status: "ativo",
            planoId: (planoIdBanco !== "basico" ? planoIdBanco : "mensal") as any,
            dataExpiracao: dataExpFinal,
            diasRestantesTrial: 0,
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao recarregar plano do Supabase:", e);
    }
    setInfoPlano(obterPlanoEfetivoEstabelecimento(cleanCode, userCreatedAt));
  }, [activeCode, userCreatedAt]);

  useEffect(() => {
    recarregarPlano();
  }, [recarregarPlano]);

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
        if (data.tipoDesconto === "dias_gratis") {
          const diasAdicionados = Number(data.diasGratis || data.valor) || 30;
          try {
            await fetch("/api/aplicar-cupom-trial", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cupom: data.cupom,
                estabelecimentoCodigo: activeCode,
                diasGratis: diasAdicionados,
              }),
            });
          } catch (eTrial) {
            console.error("[Aplicar Cupom Trial Client Error]", eTrial);
          }

          const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, diasAdicionados);
          salvarDadosPlanoEstabelecimento(activeCode, {
            planoId: "mensal",
            status: "ativo",
            tipoPagamento: "cupom_dias_gratis",
            dataExpiracao: novaExp,
            dataInicio: new Date().toISOString(),
          });

          if (updateEstablishmentPlan) {
            await updateEstablishmentPlan("mensal", true);
          }

          recarregarPlano();

          setCupomAplicado({
            codigo: data.cupom,
            percentualDesconto: 0,
            diasGratis: diasAdicionados,
            tipoDesconto: "dias_gratis",
            descricao: data.descricao || `+${diasAdicionados} Dias Grátis`,
          });
          setCupomInput("");
          toast.success(`🎉 Oba! Cupom "${data.cupom}" ativado com sucesso! Você ganhou +${diasAdicionados} dias grátis de acesso PRO!`);
        } else if (Number(data.percentualDesconto) >= 100) {
          const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, 30);
          salvarDadosPlanoEstabelecimento(activeCode, {
            planoId: "mensal",
            status: "ativo",
            tipoPagamento: "cupom_100",
            dataExpiracao: novaExp,
            dataInicio: new Date().toISOString(),
          });
          if (updateEstablishmentPlan) {
            await updateEstablishmentPlan("mensal", true);
          }
          recarregarPlano();
          setCupomAplicado({
            codigo: data.cupom,
            percentualDesconto: 100,
            tipoDesconto: "percentual",
            descricao: data.descricao,
          });
          setCupomInput("");
          toast.success(`🎉 Oba! Cupom de 100% ativado! Plano PRO liberado.`);
        } else {
          setCupomAplicado({
            codigo: data.cupom,
            percentualDesconto: data.percentualDesconto,
            tipoDesconto: "percentual",
            descricao: data.descricao,
          });
          toast.success(data.mensagem || `Cupom "${data.cupom}" aplicado com sucesso! 🎉`);
        }
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

  const valorOriginalPlanoMensal = 19.90;
  const valorPlanoMensalComDesconto = useMemo(() => {
    if (!cupomAplicado) return valorOriginalPlanoMensal;
    const fator = (100 - cupomAplicado.percentualDesconto) / 100;
    const calc = valorOriginalPlanoMensal * fator;
    return parseFloat(calc.toFixed(2));
  }, [cupomAplicado]);

  const valorOriginalPlanoAnual = 149.90;
  const valorPlanoAnualComDesconto = useMemo(() => {
    if (!cupomAplicado) return valorOriginalPlanoAnual;
    const fator = (100 - cupomAplicado.percentualDesconto) / 100;
    const calc = valorOriginalPlanoAnual * fator;
    return parseFloat(calc.toFixed(2));
  }, [cupomAplicado]);

  // CÁLCULOS DINÂMICOS REATIVOS PARA O CARD DO PLANO ANUAL (MODIFICAÇÃO AUTOMÁTICA AO APLICAR CUPOM)
  const valorMensalEquivalenteAnual = useMemo(() => {
    return parseFloat((valorPlanoAnualComDesconto / 12).toFixed(2));
  }, [valorPlanoAnualComDesconto]);

  const percentualEconomiaAnual = useMemo(() => {
    const precoCheio12Meses = 19.90 * 12; // R$ 238,80
    if (precoCheio12Meses <= 0) return 0;
    const desconto = ((precoCheio12Meses - valorPlanoAnualComDesconto) / precoCheio12Meses) * 100;
    return Math.round(Math.max(0, desconto));
  }, [valorPlanoAnualComDesconto]);

  const economiaEmReaisAnual = useMemo(() => {
    const precoCheio12Meses = 19.90 * 12; // R$ 238,80
    const economizado = precoCheio12Meses - valorPlanoAnualComDesconto;
    return parseFloat(Math.max(0, economizado).toFixed(2));
  }, [valorPlanoAnualComDesconto]);

  const isPlanoAtivo = infoPlano.status === "ativo" && infoPlano.planoId !== "basico";
  const isPlanoMensalAtivo = isPlanoAtivo && (infoPlano.planoId === "mensal" || infoPlano.planoId === "pro");
  const isPlanoAnualAtivo = isPlanoAtivo && (infoPlano.planoId === "anual" || infoPlano.planoId === "ilimitado");

  const handleAbrirCheckout = (plano: "mensal" | "anual" = "mensal") => {
    setPlanoSelecionadoCheckout(plano);
    const valorComDesconto = plano === "anual" ? valorPlanoAnualComDesconto : valorPlanoMensalComDesconto;

    if (valorComDesconto <= 0 || cupomAplicado?.percentualDesconto === 100) {
      const duracaoDias = plano === "anual" ? 365 : 30;
      const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, duracaoDias);
      salvarDadosPlanoEstabelecimento(activeCode, {
        planoId: plano,
        status: "ativo",
        tipoPagamento: "cupom_100",
        dataExpiracao: novaExp,
        dataInicio: new Date().toISOString(),
      });
      if (updateEstablishmentPlan) {
        updateEstablishmentPlan(plano as any, true);
      }
      recarregarPlano();
      toast.success(`🎉 Oba! Plano ${plano === "anual" ? "Anual" : "Mensal"} PRO ativado gratuitamente.`);
      setModalCheckoutOpen(false);
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
      if (res.ok && data.success) {
        salvarDadosPlanoEstabelecimento(activeCode, {
          planoId: "basico",
          status: "expirado",
        });
        if (updateEstablishmentPlan) {
          updateEstablishmentPlan("basico", false);
        }
        recarregarPlano();
        setModalCancelOpen(false);
        toast.success("Assinatura cancelada. Seu plano foi alterado para o Básico.");
      } else {
        toast.error(data.error || "Erro ao cancelar assinatura no Mercado Pago.");
      }
    } catch (err) {
      toast.error("Falha ao comunicar com o servidor para cancelamento.");
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const isProOuTrialAtivo = isPlanoAtivo || infoPlano.status === "trial";
  const planoAtualConfig = PLANOS_CONFIG[infoPlano.planoId] || PLANOS_CONFIG.mensal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Meu Plano &amp; Assinatura <Crown className="w-6 h-6 text-[#8E7CC3]" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Aproveite 7 dias grátis de acesso ilimitado ou assine o Plano Mensal/Anual Completo via Mercado Pago.
          </p>
        </div>
      </div>

      {!isPlanoAtivo && (
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
                Garanta acesso ilimitado a todas as ferramentas: <strong>Plano Mensal Completo por apenas R$ {valorPlanoMensalComDesconto.toFixed(2).replace(".", ",")}/mês</strong> sem fidelidade.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleAbrirCheckout("mensal")}
            className="bg-white text-purple-900 hover:bg-amber-300 hover:text-purple-950 font-black text-xs shrink-0 shadow-md border-0"
          >
            Assinar Agora
          </Button>
        </div>
      )}

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
                      ? `Assinatura Ativa (${isPlanoAnualAtivo ? "Anual" : "Mensal"})`
                      : infoPlano.status === "trial"
                      ? "Período de Teste (PRO)"
                      : infoPlano.status === "expirado"
                      ? "⚠️ Trial Expirado"
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
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Acesso PRO Liberado
                </span>
              ) : (
                <Button
                  onClick={() => handleAbrirCheckout("mensal")}
                  className="font-extrabold shadow-md bg-[#8E7CC3] hover:bg-[#7C69B3] text-white w-full sm:w-auto text-xs"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Assinar Mensal (R$ {valorPlanoMensalComDesconto.toFixed(2).replace(".", ",")}/mês)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                    {cupomAplicado.tipoDesconto === "dias_gratis"
                      ? `${cupomAplicado.codigo} (+${cupomAplicado.diasGratis || 30} Dias Grátis)`
                      : `${cupomAplicado.codigo} (-${cupomAplicado.percentualDesconto}%)`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-stretch">
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

        <Card className={`border-2 shadow-lg relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all ${
          isPlanoMensalAtivo ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-[#8E7CC3]"
        }`}>
          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-bold text-[#7C3AED] bg-[#F3EEF9] border border-[#8E7CC3]/30">
              {isPlanoMensalAtivo ? "✓ SEU PLANO ATUAL" : "🔥 FLEXIBILIDADE MENSAL"}
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
                  {cupomAplicado.tipoDesconto === "dias_gratis" ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-emerald-600 font-mono">GRÁTIS</span>
                      <span className="text-xs text-muted-foreground font-semibold"> por {cupomAplicado.diasGratis || 30} dias</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600 font-mono">
                        R$ {valorPlanoMensalComDesconto.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-sm line-through text-muted-foreground font-mono">
                        R$ 19,90
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold"> / mês</span>
                    </div>
                  )}
                  <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white font-extrabold shadow-sm px-2.5 py-1">
                    {cupomAplicado.tipoDesconto === "dias_gratis"
                      ? `🎉 Cupom Aplicado! ${cupomAplicado.codigo} (+${cupomAplicado.diasGratis || 30} Dias Grátis)`
                      : `🎉 Cupom Aplicado! ${cupomAplicado.codigo} (-${cupomAplicado.percentualDesconto}% OFF)`}
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
                <span>Escanear Notinhas com IA (Ilimitado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Ficha Técnica &amp; Precificação Real</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Atualização de custos por último preço comprado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Calendário de Encomendas &amp; Gestão Financeira</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Cardápio Digital Público &amp; Lista de Compras</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAbrirCheckout("mensal")}
              className={`w-full font-extrabold shadow-md text-xs py-5 ${
                isPlanoMensalAtivo
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isPlanoMensalAtivo
                ? "✓ Renovar Antecipado (+30 Dias)"
                : `Assinar Mensal (R$ ${valorPlanoMensalComDesconto.toFixed(2).replace(".", ",")}/mês)`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>

        <Card className="border-2 border-emerald-500 shadow-2xl relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all ring-2 ring-emerald-500/20">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black px-4 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <Crown className="w-3.5 h-3.5 text-amber-300" /> ECONOMIZE {percentualEconomiaAnual}% OFF
          </div>

          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400">
              {isPlanoAnualAtivo ? "✓ SEU PLANO ATUAL" : "🏆 MAIOR ECONOMIA (1 ANO COMPLETO)"}
            </Badge>
            <CardTitle className="text-lg font-black text-foreground flex items-center justify-between">
              Anual Completo <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
            </CardTitle>
            <CardDescription className="text-xs font-semibold">
              Equivalente a apenas <strong className="text-emerald-600 font-mono">R$ {valorMensalEquivalenteAnual.toFixed(2).replace(".", ",")}/mês</strong>. Garanta 1 ano de acesso sem preocupações!
            </CardDescription>
            <div className="pt-3">
              {cupomAplicado ? (
                <div className="space-y-1">
                  {cupomAplicado.tipoDesconto === "dias_gratis" ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-emerald-600 font-mono">GRÁTIS</span>
                      <span className="text-xs text-muted-foreground font-semibold"> (+{cupomAplicado.diasGratis || 30} dias ativados)</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600 font-mono">
                        R$ {valorPlanoAnualComDesconto.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-sm line-through text-muted-foreground font-mono">
                        R$ 149,90
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold"> / ano</span>
                    </div>
                  )}
                  <Badge variant="default" className="text-xs bg-emerald-600 text-white font-extrabold shadow-sm px-2.5 py-1">
                    {cupomAplicado.tipoDesconto === "dias_gratis"
                      ? `🎉 Cupom Aplicado! ${cupomAplicado.codigo} (+${cupomAplicado.diasGratis || 30} Dias Grátis)`
                      : `🎉 Cupom Aplicado! ${cupomAplicado.codigo} (-${cupomAplicado.percentualDesconto}% OFF)`}
                  </Badge>
                  {cupomAplicado.tipoDesconto !== "dias_gratis" && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">
                      <span className="line-through">De R$ 238,80</span> por R$ {valorPlanoAnualComDesconto.toFixed(2).replace(".", ",")} (Economia de R$ {economiaEmReaisAnual.toFixed(2).replace(".", ",")}!)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-emerald-600">R$ 149,90</span>
                    <span className="text-xs text-muted-foreground font-semibold"> / ano</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    <span className="line-through">De R$ 238,80</span> por R$ 149,90 (Economia de R$ {economiaEmReaisAnual.toFixed(2).replace(".", ",")}!)
                  </p>
                </div>
              )}
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                Pagamento único anual • Pix ou Cartão em até 12x
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tudo do Plano PRO por 1 Ano:</p>
            <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Validade de 365 dias (1 Ano Sem Interrupções)</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Escanear Notinhas com IA (Ilimitado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Ficha Técnica &amp; Precificação sem Prejuízo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Calendário de Encomendas &amp; Gestão Financeira</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Cardápio Digital Público &amp; Lista de Compras</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAbrirCheckout("anual")}
              className={`w-full font-black shadow-lg text-xs py-5 ${
                isPlanoAnualAtivo
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              }`}
            >
              {isPlanoMensalAtivo
                ? "🚀 Fazer Upgrade para Anual (+365 Dias)"
                : isPlanoAnualAtivo
                ? "✓ Renovar Antecipado Anual (+365 Dias)"
                : `Assinar Plano Anual (R$ ${valorPlanoAnualComDesconto.toFixed(2).replace(".", ",")}/ano)`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={modalCheckoutOpen} onOpenChange={setModalCheckoutOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 border-2 border-purple-500/30">
          <MercadoPagoBrick
            estabelecimentoCodigo={activeCode}
            userEmail={user?.email || ""}
            planoId={planoSelecionadoCheckout}
            nomePlano={
              planoSelecionadoCheckout === "anual"
                ? cupomAplicado
                  ? `Plano Anual Completo PRO (Cupom ${cupomAplicado.codigo})`
                  : "Plano Anual Completo PRO"
                : cupomAplicado
                ? `Plano Mensal Completo PRO (Cupom ${cupomAplicado.codigo})`
                : "Plano Mensal Completo PRO"
            }
            valor={planoSelecionadoCheckout === "anual" ? valorPlanoAnualComDesconto : valorPlanoMensalComDesconto}
            onSuccess={() => {
              const duracaoDias = planoSelecionadoCheckout === "anual" ? 365 : 30;
              const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, duracaoDias);
              salvarDadosPlanoEstabelecimento(activeCode, {
                planoId: planoSelecionadoCheckout,
                status: "ativo",
                dataExpiracao: novaExp,
              });
              if (updateEstablishmentPlan) {
                updateEstablishmentPlan(planoSelecionadoCheckout as any, true);
              }
              recarregarPlano();
              setModalCheckoutOpen(false);
              toast.success(`🎉 Assinatura ${planoSelecionadoCheckout === "anual" ? "Anual" : "Mensal"} PRO ativada com sucesso!`);
            }}
            onCancel={() => setModalCheckoutOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
