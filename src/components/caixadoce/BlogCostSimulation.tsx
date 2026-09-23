import { Link } from "@tanstack/react-router";
import { CostSimulation } from "@/types/blog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  TrendingUp,
  Sparkles,
  ArrowRight,
  PieChart,
  CheckCircle2,
  Clock,
  Cake,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

interface BlogCostSimulationProps {
  simulation: CostSimulation;
  recipeTitle?: string;
}

export function BlogCostSimulation({ simulation, recipeTitle }: BlogCostSimulationProps) {
  if (!simulation || !simulation.ingredientes || simulation.ingredientes.length === 0) {
    return null;
  }

  const {
    rendimento,
    tempo_preparo,
    ingredientes,
    custo_total,
    preco_sugerido,
    margem_lucro,
    lucro_bruto,
    observacoes,
  } = simulation;

  return (
    <section className="my-10 overflow-hidden rounded-3xl border-2 border-purple-200 bg-gradient-to-b from-purple-50/60 via-white to-pink-50/50 p-6 sm:p-8 shadow-xl relative">
      {/* Glow decorative effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-pink-300/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-600/10 px-3.5 py-1 text-xs font-black text-purple-800">
            <Calculator className="h-3.5 w-3.5 text-purple-600" />
            <span>Ficha Técnica &amp; Simulação de Custos</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Quanto Custa Fazer Esta Receita?
          </h3>
          {recipeTitle && (
            <p className="text-xs sm:text-sm text-slate-600">
              Estimativa de insumos e margem média para: <strong className="text-purple-900">{recipeTitle}</strong>
            </p>
          )}
        </div>

        {/* Badges de Rendimento e Tempo */}
        <div className="flex flex-wrap items-center gap-2">
          {rendimento && (
            <Badge variant="outline" className="bg-white/80 border-purple-200 text-purple-900 font-bold text-xs py-1 px-2.5">
              <Cake className="w-3.5 h-3.5 mr-1 text-purple-600" /> {rendimento}
            </Badge>
          )}
          {tempo_preparo && (
            <Badge variant="outline" className="bg-white/80 border-purple-200 text-slate-700 font-bold text-xs py-1 px-2.5">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" /> {tempo_preparo}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabela / Lista de Ingredientes com Preços */}
      <div className="relative z-10 my-6">
        <div className="rounded-2xl border border-purple-100 bg-white shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 grid grid-cols-12 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            <span className="col-span-6 sm:col-span-7">Ingrediente / Insumo</span>
            <span className="col-span-3 sm:col-span-2 text-right">Qtd Usada</span>
            <span className="col-span-3 text-right">Custo Estimado</span>
          </div>

          <div className="divide-y divide-slate-100">
            {ingredientes.map((ing, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center px-4 py-3 text-xs sm:text-sm hover:bg-purple-50/30 transition-colors"
              >
                <div className="col-span-6 sm:col-span-7 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="truncate">{ing.item}</span>
                </div>
                <div className="col-span-3 sm:col-span-2 text-right font-mono text-xs text-slate-600">
                  {ing.quantidade}
                </div>
                <div className="col-span-3 text-right font-mono font-bold text-slate-900">
                  R$ {ing.custo_proporcional.toFixed(2).replace(".", ",")}
                </div>
              </div>
            ))}
          </div>

          {observacoes && (
            <div className="bg-purple-50/50 px-4 py-2.5 text-[11px] sm:text-xs text-purple-900 border-t border-purple-100">
              💡 <strong>Nota da Chef:</strong> {observacoes}
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro (Cards com Custo, Sugestão e Margem) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {/* Custo Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Custo da Receita</span>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-800">
              R$ {custo_total.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Soma de todos os insumos</p>
          </div>
        </div>

        {/* Preço Sugerido */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center justify-between">
            <span>Preço de Venda Sugerido</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-950">
              R$ {preco_sugerido.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Lucro líquido de ~R$ {(lucro_bruto || (preco_sugerido - custo_total)).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>

        {/* Margem de Lucro */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center justify-between">
            <span>Margem de Lucro Estimada</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900">
              {margem_lucro.toFixed(1).replace(".", ",")}%
            </div>
            <Badge className="bg-emerald-600 text-white font-black text-[10px]">
              Alta Lucratividade
            </Badge>
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Excelente retorno por fornada</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* O GANCHO / CTA DE CONVERSÃO EXATO SOLICITADO */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-900 p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-extrabold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Precificação Automática por Notinha</span>
          </div>
          <h4 className="text-base sm:text-lg font-black leading-snug">
            Quer calcular essa margem com os preços da sua cidade? Cadastre-se grátis e precifique no CaixaDoce.
          </h4>
          <p className="text-xs text-purple-200 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Teste 7 dias grátis
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Sem necessidade de cartão
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Leitura por foto da notinha
            </span>
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <Link to="/login" search={{} as any} className="w-full block">
            <Button
              size="lg"
              className="w-full md:w-auto font-black text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 px-7 py-6 rounded-xl shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>Cadastrar Grátis Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
