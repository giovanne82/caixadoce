import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  QrCode,
  ArrowUpRight,
  Sparkles,
  Cookie,
  UtensilsCrossed,
  PiggyBank,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Building2,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  formatarMoeda,
  type TransacaoFinanceira,
  type Encomenda,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardTabProps {
  transacoes: TransacaoFinanceira[];
  encomendas: Encomenda[];
  despesas: DespesaNotaFiscal[];
  activeCode: string;
  storeName: string;
  onNavigateTab: (tab: string) => void;
  onNovaTransacao: () => void;
}

export function DashboardTab({
  transacoes,
  encomendas,
  despesas,
  activeCode,
  storeName,
  onNavigateTab,
  onNovaTransacao,
}: DashboardTabProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [periodoGrafico, setPeriodoGrafico] = useState<"mes" | "semana">("mes");
  const [mostrarAnalise, setMostrarAnalise] = useState(false);

  // 1. Total Faturado (Entrada): Receitas financeiras concluídas + Encomendas confirmadas
  const totalReceitasFinanceiro = useMemo(() => {
    if (!Array.isArray(transacoes)) return 0;
    return transacoes
      .filter((t) => {
        if (!t) return false;
        const tp = String(t.tipo || "").toLowerCase();
        const st = String(t.status || "").toLowerCase();
        return (tp === "receita" || tp === "entrada") && (st === "concluida" || st === "pago" || st === "paga");
      })
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  }, [transacoes]);

  const totalEncomendasPagas = useMemo(() => {
    if (!Array.isArray(encomendas)) return 0;
    return encomendas
      .filter((e) => e && String(e.status || "").toLowerCase() !== "cancelada")
      .reduce((acc, e) => {
        const total = Number(e.valorTotal || 0) || 0;
        const entrada = Number(e.valorEntrada || 0) || total * 0.5;
        if (e.statusPagamento === "pago_integral") return acc + total;
        if (e.statusPagamento === "sinal_pago") return acc + entrada;
        return acc;
      }, 0);
  }, [encomendas]);

  const totalFaturado = useMemo(
    () => Math.max(totalReceitasFinanceiro, totalEncomendasPagas),
    [totalReceitasFinanceiro, totalEncomendasPagas]
  );

  // 2. Custos de Produção (Insumos dos doces)
  const custoProducao = useMemo(() => {
    if (!Array.isArray(despesas)) return 0;
    return despesas.reduce((acc, d) => acc + (Number(d.valorProducao || 0) || 0), 0);
  }, [despesas]);

  // 3. Gastos Operacionais / Utensílios / Outros
  const gastosOperacionais = useMemo(() => {
    if (!Array.isArray(despesas)) return 0;
    return despesas.reduce(
      (acc, d) =>
        acc +
        (Number(d.valorUtensilios || 0) || 0) +
        (Number(d.valorOutros || 0) || 0),
      0
    );
  }, [despesas]);

  // 4. ELEVAÇÃO E SOMA DE ESTADO: SAÍDA (GASTOS) = (somaDespesasManuais + somaTotalCompras)
  const somaDespesasManuais = useMemo(() => {
    if (!Array.isArray(transacoes)) return 0;
    return transacoes
      .filter((t) => {
        if (!t) return false;
        const tp = String(t.tipo || "").toLowerCase();
        const st = String(t.status || "").toLowerCase();
        const isSaida = tp === "despesa" || tp === "saida";
        const isOk = !st || st === "concluida" || st === "pago" || st === "paga";
        return isSaida && isOk;
      })
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  }, [transacoes]);

  const somaTotalCompras = useMemo(() => {
    if (!Array.isArray(despesas)) return 0;
    return despesas.reduce((acc, d) => {
      if (!d) return acc;
      const vTotal = Number(d.valorTotal ?? (d as any).valor_total ?? 0) || 0;
      const vProd = Number(d.valorProducao || 0) || 0;
      const vUtens = Number(d.valorUtensilios || 0) || 0;
      const vCons = Number(d.valorConsumoProprio || 0) || 0;
      const vOutros = Number(d.valorOutros || 0) || 0;
      const valSub = vProd + vUtens + vCons + vOutros;
      return acc + (vTotal > 0 ? vTotal : valSub);
    }, 0);
  }, [despesas]);

  // Fórmula final explicita para renderização de Saída: (somaDespesasManuais + somaTotalCompras)
  const totalSaidasGlobal = useMemo(() => {
    return (Number(somaDespesasManuais) || 0) + (Number(somaTotalCompras) || 0);
  }, [somaDespesasManuais, somaTotalCompras]);

  // 5. Saldo Líquido Real = Total Faturado - Saídas
  const lucroLiquidoReal = totalFaturado - totalSaidasGlobal;
  const margemLucro = totalFaturado > 0 ? (lucroLiquidoReal / totalFaturado) * 100 : 0;

  // Link da Página Pública
  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/agendar/${activeCode.toLowerCase()}`
      : `/agendar/${activeCode.toLowerCase()}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(publicLink);
      setCopiedLink(true);
      toast.success("Link do Cardápio copiado para a área de transferência!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Dados do Gráfico Comparativo
  const dadosGrafico = useMemo(() => {
    if (periodoGrafico === "mes") {
      return [
        { periodo: "Mai", Faturamento: 2800, Producao: 1100, Operacional: 350, Lucro: 1350 },
        { periodo: "Jun", Faturamento: 3400, Producao: 1300, Operacional: 420, Lucro: 1680 },
        { periodo: "Jul", Faturamento: 4200, Producao: 1600, Operacional: 480, Lucro: 2120 },
        {
          periodo: "Ago (Atual)",
          Faturamento: totalFaturado || 4800,
          Producao: custoProducao || 1850,
          Operacional: gastosOperacionais || 520,
          Lucro: lucroLiquidoReal || 2430,
        },
      ];
    } else {
      return [
        { periodo: "Sem 1", Faturamento: 950, Producao: 380, Operacional: 110, Lucro: 460 },
        { periodo: "Sem 2", Faturamento: 1200, Producao: 460, Operacional: 140, Lucro: 600 },
        { periodo: "Sem 3", Faturamento: 1450, Producao: 580, Operacional: 160, Lucro: 710 },
        {
          periodo: "Sem 4 (Atual)",
          Faturamento: totalFaturado > 0 ? totalFaturado * 0.35 : 1600,
          Producao: custoProducao > 0 ? custoProducao * 0.35 : 620,
          Operacional: gastosOperacionais > 0 ? gastosOperacionais * 0.35 : 180,
          Lucro: lucroLiquidoReal > 0 ? lucroLiquidoReal * 0.35 : 800,
        },
      ];
    }
  }, [periodoGrafico, totalFaturado, custoProducao, gastosOperacionais, lucroLiquidoReal]);

  // Gastos Agrupados por Estabelecimento
  const gastosPorLoja = useMemo(() => {
    const mapa: Record<string, { total: number; producao: number; count: number }> = {};
    if (Array.isArray(despesas)) {
      for (const d of despesas) {
        if (!d) continue;
        const nome = d.fornecedorNome || "Outros Fornecedores";
        if (!mapa[nome]) mapa[nome] = { total: 0, producao: 0, count: 0 };
        mapa[nome].total += Number(d.valorTotal || 0) || 0;
        mapa[nome].producao += Number(d.valorProducao || 0) || 0;
        mapa[nome].count += 1;
      }
    }
    const array = Object.entries(mapa).map(([nome, d]) => ({
      nome,
      ...d,
      percentual:
        totalSaidasGlobal > 0
          ? ((d.total / totalSaidasGlobal) * 100).toFixed(1)
          : "0",
    }));
    return array.sort((a, b) => b.total - a.total);
  }, [despesas, totalSaidasGlobal]);

  return (
    <div className="space-y-6">
      {/* Banner Principal com Link do Cardápio Público */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 p-5 rounded-2xl border border-amber-500/25 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
              Painel de Lucro Real &amp; Vendas
            </h2>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe a lucratividade líquida da sua confeitaria com clareza e transparência.
          </p>
        </div>

        {/* Card do Link do Cardápio */}
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md p-2 rounded-xl border border-border shadow-xs w-full md:w-auto">
          <div className="min-w-0 flex-1 md:w-56 px-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Cardápio do Cliente</p>
            <p className="text-xs font-mono font-semibold truncate text-foreground">{publicLink}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 px-2.5 text-xs">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copiedLink ? "Copiado!" : "Copiar"}
          </Button>
          <a href={`/agendar/${activeCode.toLowerCase()}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-8 px-2.5 text-xs font-semibold shadow-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
            </Button>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CARDS CENTRAIS DE RESUMO (ENTRADA, SAÍDA, SALDO) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entrada (Vendas / Faturamento) */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Entrada (Vendas)
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatarMoeda(totalFaturado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Pedidos &amp; Balcão
            </p>
          </CardContent>
        </Card>

        {/* Saída (Gastos Globais / Despesas + Compras) */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Saída (Gastos Totais)
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600">
              {formatarMoeda(totalSaidasGlobal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Insumos, contas e compras operacionais
            </p>
          </CardContent>
        </Card>

        {/* Saldo Líquido Real */}
        <Card className="border-2 border-primary/40 bg-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider">
              Saldo Líquido Real
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${lucroLiquidoReal >= 0 ? "text-foreground" : "text-rose-600"}`}>
              {formatarMoeda(lucroLiquidoReal)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                {margemLucro.toFixed(1)}% Margem
              </Badge>
              <span className="text-[11px] text-muted-foreground">de lucro livre</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* BOTÃO TOGGLE OBRIGATÓRIO SOLICITADO */}
      {/* ========================================================================= */}
      <button
        onClick={() => setMostrarAnalise(!mostrarAnalise)}
        className="w-full py-3 mb-6 bg-purple-100 text-purple-700 rounded-lg font-semibold border border-purple-200"
      >
        {mostrarAnalise ? "Ocultar Detalhes de Despesas" : "Ver Detalhes de Despesas"}
      </button>

      {/* ========================================================================= */}
      {/* 2. SEÇÃO DE ANÁLISE DE DESPESAS & MÉTRICAS (RENDERIZAÇÃO CONDICIONAL COM MOSTRARANALISE) */}
      {/* ========================================================================= */}
      {mostrarAnalise && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Cards secundários de custos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border shadow-xs bg-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Custo de Produção (Insumos)
                </CardTitle>
                <Cookie className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-amber-600">{formatarMoeda(custoProducao)}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Leite cond., chocolate, farinha, morangos</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs bg-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Gastos Operacionais / Utensílios
                </CardTitle>
                <UtensilsCrossed className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-blue-600">{formatarMoeda(gastosOperacionais)}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Formas, bicos, embalagens e utensílios</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs bg-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
                  Consumo Pessoal / Outros
                </CardTitle>
                <PiggyBank className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-purple-600">
                  {formatarMoeda(
                    Array.isArray(despesas)
                      ? despesas.reduce((a, b) => a + (Number(b?.valorConsumoProprio || 0) || 0), 0)
                      : 0
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Gastos pessoais/casa passados no cartão</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Comparativo */}
          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Faturamento vs. Custos &amp; Lucro
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento da evolução de faturamento e lucro líquido
                </CardDescription>
              </div>

              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50">
                <Button
                  variant={periodoGrafico === "mes" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPeriodoGrafico("mes")}
                  className="h-7 text-[11px] px-2"
                >
                  Mensal
                </Button>
                <Button
                  variant={periodoGrafico === "semana" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPeriodoGrafico("semana")}
                  className="h-7 text-[11px] px-2"
                >
                  Semanal
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip
                      formatter={(val: any) => formatarMoeda(Number(val))}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Producao" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Custo Produção" />
                    <Bar dataKey="Operacional" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Gastos Operacionais" />
                    <Bar dataKey="Lucro" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Lucro Líquido" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela Agrupada por Loja */}
          <Card className="border-border shadow-xs bg-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Despesas Agrupadas por Estabelecimento
                </CardTitle>
                <CardDescription className="text-xs">
                  Resumo consolidado das compras feitas em atacados, lojas de confeitaria e mercados
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {gastosPorLoja.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhuma despesa de compras lançada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground border-y border-border/60">
                      <tr>
                        <th className="p-3 font-semibold">Estabelecimento</th>
                        <th className="p-3 font-semibold text-center">Notas</th>
                        <th className="p-3 font-semibold">Custo de Produção</th>
                        <th className="p-3 font-semibold">Gasto Total</th>
                        <th className="p-3 font-semibold text-right">% do Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {gastosPorLoja.map((loja) => (
                        <tr key={loja.nome} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-primary" /> {loja.nome}
                          </td>
                          <td className="p-3 text-center font-mono">{loja.count}</td>
                          <td className="p-3 font-bold text-amber-600">{formatarMoeda(loja.producao)}</td>
                          <td className="p-3 font-extrabold text-foreground">{formatarMoeda(loja.total)}</td>
                          <td className="p-3 text-right">
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {loja.percentual}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AÇÕES RÁPIDAS DE NAVEGAÇÃO */}
      {/* ========================================================================= */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">Ações Rápidas</CardTitle>
          <CardDescription className="text-xs">Acesse os fluxos centrais da sua doceria</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => onNavigateTab("encomendas")}
            className="w-full justify-start text-xs font-medium h-9"
          >
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Agendar Encomenda
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateTab("scanner")}
            className="w-full justify-start text-xs font-medium h-9"
          >
            <QrCode className="w-4 h-4 mr-2 text-primary" />
            Escanear Nota (OCR)
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateTab("financeiro")}
            className="w-full justify-start text-xs font-medium h-9"
          >
            <DollarSign className="w-4 h-4 mr-2 text-primary" />
            Fluxo de Caixa
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateTab("plano")}
            className="w-full justify-start text-xs font-medium h-9"
          >
            <CreditCard className="w-4 h-4 mr-2 text-primary" />
            Assinatura &amp; Planos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
