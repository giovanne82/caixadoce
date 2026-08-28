import { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Check,
  ArrowRight,
  ShoppingCart,
  Tag,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  obterPlanoEfetivoEstabelecimento,
  salvarDadosPlanoEstabelecimento,
  calcularDataExpiracaoAcumulada,
} from "@/lib/planos-utils";
import { MercadoPagoBrick } from "@/components/caixadoce/MercadoPagoBrick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        toast.success(data.mensagem || "Cupom aplicado com sucesso!");
      } else {
        toast.error(data.mensagem || "Código promocional inválido.");
      }
    } catch (err) {
      toast.error("Erro ao validar cupom.");
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
  const valorOriginalAnual = 149.90;

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
      return;
    }
    setModalCheckoutOpen(true);
  };

  const handleMudarParaBasico = () => {
    salvarDadosPlanoEstabelecimento(activeCode, { planoId: "basico", status: "ativo" });
    recarregarPlano();
    toast.info("Plano alterado para o Básico.");
  };

  const handleConfirmarCancelamento = async () => {
    setProcessandoCancelamento(true);
    try {
      salvarDadosPlanoEstabelecimento(activeCode, { planoId: "basico", status: "expirado" });
      if (updateEstablishmentPlan) updateEstablishmentPlan("basico", false);
      recarregarPlano();
      setModalCancelOpen(false);
      toast.success("Assinatura cancelada.");
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <Card className="border-2 border-[#8E7CC3]/40 shadow-lg bg-gradient-to-r from-[#F3EEF9] via-white to-purple-50">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#7C3AED]" />
              <CardTitle className="text-xl font-extrabold text-foreground">Meu Plano &amp; Assinatura</CardTitle>
            </div>
            <CardDescription className="text-xs">Gerencie a assinatura do seu estabelecimento.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-purple-200 bg-white shadow-xs">
        <CardContent className="pt-6">
          <form onSubmit={handleValidarCupom} className="flex gap-2 max-w-md">
            <Input
              placeholder="Código Promocional"
              value={cupomInput}
              onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
            />
            <Button type="submit" disabled={validandoCupom}>Aplicar</Button>
            {cupomAplicado && <Button type="button" variant="outline" onClick={handleRemoverCupom}>Remover</Button>}
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-stretch">
        <Card className="border-border shadow-md flex flex-col justify-between bg-card">
          <CardHeader>
            <Badge variant="outline" className="w-fit mb-2 text-[10px]">GRATUITO</Badge>
            <CardTitle className="text-lg font-extrabold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Plano Básico
            </CardTitle>
            <div className="pt-3 text-3xl font-black">R$ 0,00</div>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full" disabled={infoPlano.planoId === "basico"} onClick={handleMudarParaBasico}>
              {infoPlano.planoId === "basico" ? "Plano Atual" : "Usar Plano Gratuito"}
            </Button>
          </div>
        </Card>

        <Card className={`border-2 shadow-xl flex flex-col justify-between ${isPlanoMensalAtivo ? "border-emerald-500" : "border-[#8E7CC3]"}`}>
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] text-[#7C3AED]">
              {isPlanoMensalAtivo ? "✓ ATUAL" : "🔥 MENSAL FLEXÍVEL"}
            </Badge>
            <CardTitle className="text-lg font-extrabold flex items-center justify-between">
              Mensal Completo <Zap className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <div className="pt-3 text-3xl font-black text-[#7C3AED]">R$ {valorMensalComDesconto.toFixed(2).replace(".", ",")}</div>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button onClick={() => handleAbrirCheckout("mensal")} className="w-full font-extrabold py-5">
              {isPlanoMensalAtivo ? `Renovar Antecipado (+30 Dias)` : `Assinar Plano Mensal`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>

        <Card className={`border-2 shadow-2xl flex flex-col justify-between ${isPlanoAnualAtivo ? "border-emerald-500" : "border-amber-500/80"}`}>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-purple-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-300" /> ⭐ MAIOR ECONOMIA (37% OFF)
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2 text-[10px] text-amber-700">
              {isPlanoAnualAtivo ? "✓ ATUAL" : "🚀 UPGRADE ANUAL"}
            </Badge>
            <CardTitle className="text-lg font-extrabold flex items-center justify-between">
              Anual Completo <Crown className="w-5 h-5 text-amber-500" />
            </CardTitle>
            <div className="pt-3 text-3xl font-black text-amber-600">R$ {valorAnualComDesconto.toFixed(2).replace(".", ",")}</div>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button onClick={() => handleAbrirCheckout("anual")} className="w-full font-extrabold py-5">
              {isPlanoMensalAtivo ? `🚀 Upgrade para Anual (+365 Dias)` : `Assinar Plano Anual`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={modalCheckoutOpen} onOpenChange={setModalCheckoutOpen}>
        <DialogContent className="sm:max-w-xl">
          <MercadoPagoBrick
            estabelecimentoCodigo={activeCode}
            userEmail={user?.email || ""}
            planoId={planoSelecionado}
            nomePlano={planoSelecionado === "anual" ? "Plano Anual Completo PRO" : "Plano Mensal Completo PRO"}
            valor={valorPlanoSelecionadoComDesconto}
            onSuccess={() => {
              const duracaoDias = planoSelecionado === "anual" ? 365 : 30;
              const novaExp = calcularDataExpiracaoAcumulada(infoPlano.dataExpiracao, duracaoDias);
              salvarDadosPlanoEstabelecimento(activeCode, { planoId: planoSelecionado, status: "ativo", dataExpiracao: novaExp });
              if (updateEstablishmentPlan) updateEstablishmentPlan(planoSelecionado as any, true);
              recarregarPlano();
              setModalCheckoutOpen(false);
              toast.success("Assinatura ativada!");
            }}
            onCancel={() => setModalCheckoutOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalCancelOpen} onOpenChange={setModalCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleConfirmarCancelamento}>Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
