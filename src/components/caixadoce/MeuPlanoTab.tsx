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
  Star,
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
  const [planoSelecionado, setPlanoSelecionado] = useState<"mensal" | "anual">("mensal");
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
        if (data.tipoDesconto === "dias_gratis") {
          const diasAdicionados = Number(data.diasGratis) || 30;
          try {
            await fetch("/api/aplicar-cupom-trial", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cupom: data.cupom, estabelecimentoCodigo: activeCode }),
            });
          } catch {}

          const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, diasAdicionados);
          salvarDadosPlanoEstabelecimento(activeCode, {
            dataExpiracao: novaExp,
            status: "trial",
          });
          if (updateEstablishmentPlan) {
            await updateEstablishmentPlan("mensal", true);
          }
          recarregarPlano();
          setCupomInput("");
          toast.success(`🎉 Oba! Você ganhou +${diasAdicionados} dias de acesso PRO!`);
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
            descricao: data.descricao,
          });
          setCupomInput("");
          toast.success(`🎉 Oba! Cupom de 100% ativado! Plano PRO liberado.`);
        } else {
          setCupomAplicado({
            codigo: data.cupom,
            percentualDesconto: data.percentualDesconto,
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

  const valorOriginalMensal = 19.90;
  const valorOriginalAnual = 178.80;

  const valorMensalComDesconto = useMemo(() => {
    if (!cupomAplicado) return valorOriginalMensal;
    const fator = (100 - cupomAplicado.percentualDesconto) / 100;
    return parseFloat((valorOriginalMensal * fator).toFixed(2));
  }, [cupomAplicado]);

  const valorAnualComDesconto = useMemo(() => {
    if (!cupomAplicado) return valorOriginalAnual;
    const fator = (100 - cupomAplicado.percentualDesconto) / 100;
    return parseFloat((valorOriginalAnual * fator).toFixed(2));
  }, [cupomAplicado]);

  const valorPlanoSelecionadoComDesconto = useMemo(() => {
    return planoSelecionado === "anual" ? valorAnualComDesconto : valorMensalComDesconto;
  }, [planoSelecionado, valorMensalComDesconto, valorAnualComDesconto]);

  const isPlanoAtivo = infoPlano.status === "ativo" && infoPlano.planoId !== "basico";
  const isPlanoMensalAtivo = isPlanoAtivo && (infoPlano.planoId === "mensal" || infoPlano.planoId === "pro");
  const isPlanoAnualAtivo = isPlanoAtivo && (infoPlano.planoId === "anual" || infoPlano.planoId === "ilimitado");

  const handleAbrirCheckout = (planoTarget: "mensal" | "anual" = "mensal") => {
    setPlanoSelecionado(planoTarget);
    const valorFinal = planoTarget === "anual" ? valorAnualComDesconto : valorMensalComDesconto;

    if (valorFinal <= 0 || cupomAplicado?.percentualDesconto === 100) {
      const duracaoDias = planoTarget === "anual" ? 365 : 30;
      const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, duracaoDias);
      salvarDadosPlanoEstabelecimento(activeCode, {
        planoId: planoTarget,
        status: "ativo",
        tipoPagamento: "cupom_100",
        dataExpiracao: novaExp,
        dataInicio: new Date().toISOString(),
      });
      if (updateEstablishmentPlan) {
        updateEstablishmentPlan(planoTarget as any, true);
      }
      recarregarPlano();
      toast.success(`🎉 Oba! Plano ${planoTarget === "anual" ? "Anual" : "Mensal"} PRO ativado gratuitamente.`);
      setModalCheckoutOpen(false);
      return;
    }

    setModalCheckoutOpen(true);
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* STATUS HEADER */}
      <Card id="card-status-plano-ativo" className="border-2 border-[#8E7CC3]/40 shadow-lg bg-gradient-to-r from-[#F3EEF9] via-white to-purple-50">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#7C3AED]" />
              <CardTitle className="text-xl font-extrabold text-foreground">
                Meu Plano &amp; Assinatura
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Gerencie a assinatura do seu estabelecimento e aproveite acesso ilimitado.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isPlanoAtivo ? "default" : infoPlano.status === "trial" ? "secondary" : "outline"}
              className={`text-xs font-bold px-3 py-1 ${
                isPlanoAtivo
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : infoPlano.status === "trial"
                  ? "bg-[#7C3AED] text-white"
                  : "border-stone-300 text-stone-600"
              }`}
            >
              {isPlanoAtivo
                ? `Plano PRO Ativo (${infoPlano.planoId === "anual" ? "Anual" : "Mensal"})`
                : infoPlano.status === "trial"
                ? `Teste Grátis (${infoPlano.diasRestantesTrial} dias restantes)`
                : "Plano Básico Gratuito"}
            </Badge>

            {isPlanoAtivo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalCancelOpen(true)}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold h-7"
              >
                Gerenciar / Cancelar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* SEÇÃO: CUPOM PROMOCIONAL DE ASSINATURA */}
      <Card className="border border-purple-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#7C3AED]" /> Cupom Promocional ou Voucher de Desconto
          </CardTitle>
          <CardDescription className="text-xs">
            Possui um código de desconto ou voucher promocional? Insira abaixo para aplicar o benefício na assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <form onSubmit={handleValidarCupom} className="flex gap-2 w-full max-w-md">
              <Input
                placeholder="Ex: BETA60 ou CAIXADOCEOFF"
                value={cupomInput}
                onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                disabled={validandoCupom}
                className="text-xs font-mono font-bold uppercase"
              />
              <Button
                type="submit"
                disabled={validandoCupom || !cupomInput.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shrink-0"
              >
                {validandoCupom ? "Validando..." : "Aplicar Cupom"}
              </Button>
              {cupomAplicado && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoverCupom}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Remover
                </Button>
              )}
            </form>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* OS CARDS COMPARATIVOS DE PLANOS (GRATUITO, MENSAL E ANUAL) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-stretch">
        
        {/* CARD 1: PLANO BÁSICO (R$ 0,00) */}
        <Card className="border-border shadow-md flex flex-col justify-between bg-card hover:border-border/80 transition-all">
          <CardHeader className="pb-4">
            <Badge variant="outline" className="w-fit mb-2 text-[10px] font-bold text-stone-500 border-stone-300">
              GRATUITO
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Plano Básico
            </CardTitle>
            <CardDescription className="text-xs">
              Para organizar suas compras e matérias-primas essenciais.
            </CardDescription>
            <div className="pt-3">
              <span className="text-3xl font-black text-foreground">R$ 0,00</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Lista de Compras Interativa</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              variant="outline"
              className="w-full text-xs font-bold"
              disabled={infoPlano.planoId === "basico"}
              onClick={handleMudarParaBasico}
            >
              {infoPlano.planoId === "basico" ? "Plano Atual" : "Usar Plano Gratuito"}
            </Button>
          </div>
        </Card>

        {/* CARD 2: PLANO MENSAL */}
        <Card className={`border-2 shadow-xl relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all ${
          isPlanoMensalAtivo ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-[#8E7CC3]"
        }`}>
          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-bold text-[#7C3AED] bg-[#F3EEF9] border border-[#8E7CC3]/30">
              {isPlanoMensalAtivo ? "✓ SEU PLANO ATUAL" : "🔥 MENSAL FLEXÍVEL"}
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center justify-between">
              Mensal Completo <Zap className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Acesso total ilimitado a todas as ferramentas.
            </CardDescription>
            <div className="pt-3">
              <span className="text-3xl font-black text-[#7C3AED]">R$ {valorMensalComDesconto.toFixed(2).replace(".", ",")}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
             <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Escanear Notinha IA (Ilimitado)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Ficha Técnica & Precificação</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAbrirCheckout("mensal")}
              className={`w-full font-extrabold shadow-lg text-xs py-5 ${
                isPlanoMensalAtivo
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-[#8E7CC3] to-purple-600 hover:from-[#7C69B3] hover:to-purple-700 text-white"
              }`}
            >
              {isPlanoMensalAtivo ? `Renovar (+30 Dias)` : `Assinar Mensal`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>

        {/* CARD 3: PLANO ANUAL */}
        <Card className={`border-2 shadow-2xl relative flex flex-col justify-between bg-card hover:scale-[1.01] transition-all ${
          isPlanoAnualAtivo ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-amber-500/80"
        }`}>
           <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-purple-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> ⭐ MAIOR ECONOMIA
          </div>
          <CardHeader className="pb-4 pt-6">
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300">
              {isPlanoAnualAtivo ? "✓ SEU PLANO ATUAL" : "🚀 UPGRADE ANUAL"}
            </Badge>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center justify-between">
              Anual Completo <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Garanta 12 meses de acesso com 25% de desconto.
            </CardDescription>
            <div className="pt-3">
              <span className="text-3xl font-black text-amber-600">R$ {valorAnualComDesconto.toFixed(2).replace(".", ",")}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
             <ul className="space-y-2 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Todos Recursos PRO Incluídos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Prioridade no suporte</span>
              </li>
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              onClick={() => handleAbrirCheckout("anual")}
              className={`w-full font-extrabold shadow-xl text-xs py-5 ${
                isPlanoAnualAtivo
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-amber-500 via-purple-600 to-[#7C3AED] hover:from-amber-600 hover:to-purple-800 text-white"
              }`}
            >
              {isPlanoAnualAtivo ? `Renovar Anual (+365 Dias)` : `Assinar Anual`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      </div>

      {/* MODAL: CHECKOUT */}
      <Dialog open={modalCheckoutOpen} onOpenChange={setModalCheckoutOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <MercadoPagoBrick
            estabelecimentoCodigo={activeCode}
            userEmail={user?.email || ""}
            planoId={planoSelecionado}
            nomePlano={planoSelecionado === "anual" ? "Plano Anual Completo PRO" : "Plano Mensal Completo PRO"}
            valor={valorPlanoSelecionadoComDesconto}
            onSuccess={() => {
              const duracaoDias = planoSelecionado === "anual" ? 365 : 30;
              const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, duracaoDias);
              salvarDadosPlanoEstabelecimento(activeCode, {
                planoId: planoSelecionado,
                status: "ativo",
                dataExpiracao: novaExp,
              });
              if (updateEstablishmentPlan) {
                updateEstablishmentPlan(planoSelecionado as any, true);
              }
              recarregarPlano();
              setModalCheckoutOpen(false);
              toast.success("🎉 Assinatura PRO ativada com sucesso!");
            }}
            onCancel={() => setModalCheckoutOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* MODAL: CANCELAR */}
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
