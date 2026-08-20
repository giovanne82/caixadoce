import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  CreditCard,
  QrCode,
  ArrowUpRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import { formatarMoeda, type TransacaoFinanceira } from "@/lib/caixadoce-data";

interface DashboardTabProps {
  transacoes: TransacaoFinanceira[];
  onNavigateTab: (tab: string) => void;
  onNovaTransacao: () => void;
}

export function DashboardTab({ transacoes, onNavigateTab, onNovaTransacao }: DashboardTabProps) {
  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita" && t.status === "concluida")
    .reduce((acc, t) => acc + t.valor, 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa" && t.status === "concluida")
    .reduce((acc, t) => acc + t.valor, 0);

  const saldoLiquido = totalReceitas - totalDespesas;
  const pendentesCount = transacoes.filter((t) => t.status === "pendente").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 p-5 rounded-2xl border border-amber-500/20">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
            Visão Geral do Caixa <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe em tempo real as entradas, saídas e faturamento do seu estabelecimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNovaTransacao} className="font-semibold shadow-md">
            + Nova Venda / Lançamento
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total de Entradas
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatarMoeda(totalReceitas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Vendas e recebimentos
            </p>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total de Saídas
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600">
              {formatarMoeda(totalDespesas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Insumos, despesas e custos</p>
          </CardContent>
        </Card>

        {/* Saldo Líquido */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Saldo em Caixa
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${saldoLiquido >= 0 ? "text-foreground" : "text-rose-600"}`}>
              {formatarMoeda(saldoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resultado acumulado</p>
          </CardContent>
        </Card>

        {/* Pendências */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pendentes
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <QrCode className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600">
              {pendentesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cobranças a confirmar</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Transações */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Últimos Lançamentos</CardTitle>
              <CardDescription>Movimentações mais recentes no fluxo de caixa</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab("financeiro")} className="text-xs text-primary">
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent>
            {transacoes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum lançamento registrado ainda. Clique em "+ Nova Venda / Lançamento" para iniciar!
              </div>
            ) : (
              <div className="space-y-2.5">
                {transacoes.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          t.tipo === "receita"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {t.tipo === "receita" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.categoria} • {t.data}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-extrabold text-sm ${
                          t.tipo === "receita" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {t.tipo === "receita" ? "+" : "-"} {formatarMoeda(t.valor)}
                      </p>
                      <Badge
                        variant={t.status === "concluida" ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {t.status === "concluida" ? "Confirmado" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atalhos e Dicas */}
        <div className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">Ações Rápidas</CardTitle>
              <CardDescription>Acesse facilmente as áreas essenciais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={() => onNavigateTab("financeiro")}
                className="w-full justify-start text-xs font-medium h-9"
              >
                <DollarSign className="w-4 h-4 mr-2 text-primary" />
                Relatório Financeiro Completo
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateTab("colaboradores")}
                className="w-full justify-start text-xs font-medium h-9"
              >
                <Users className="w-4 h-4 mr-2 text-primary" />
                Gerenciar Equipe e Acessos
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateTab("plano")}
                className="w-full justify-start text-xs font-medium h-9"
              >
                <CreditCard className="w-4 h-4 mr-2 text-primary" />
                Assinatura Stripe &amp; Planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
