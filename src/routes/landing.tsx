import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Camera,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Crown,
  ShoppingBag,
  Tag,
  Star,
  ChevronDown,
  Check,
  FileText,
  Clock,
  TrendingUp,
  Receipt,
  Layers,
  Heart,
  Lock,
} from "lucide-react";
import { formatarMoeda } from "@/lib/caixadoce-data";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — A Plataforma Inteligente de Gestão para Confeitaria" },
      {
        name: "description",
        content:
          "Scanner de cupons fiscais com IA, conciliação de insumos, gestão de encomendas, cardápio digital e pagamentos online Stripe para doceiras e confeiteiras.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  const irParaLogin = () => {
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-[#0b0512] text-stone-100 selection:bg-purple-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background Decorativo com Gradiante Glowing Neon */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER DA LANDING PAGE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0b0512]/80 border-b border-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-300">
            <a href="#funcionalidades" className="hover:text-purple-400 transition-colors">
              Funcionalidades
            </a>
            <a href="#demonstracao" className="hover:text-purple-400 transition-colors">
              Demonstração IA
            </a>
            <a href="#precos" className="hover:text-purple-400 transition-colors">
              Preços &amp; Planos
            </a>
            <a href="#faq" className="hover:text-purple-400 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={irParaLogin}
              variant="ghost"
              className="text-xs sm:text-sm font-bold text-stone-200 hover:text-white hover:bg-purple-900/30"
            >
              Acessar o App
            </Button>
            <Button
              onClick={irParaLogin}
              className="text-xs sm:text-sm font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30 rounded-xl py-5 px-5"
            >
              Testar 14 Dias Grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-24 sm:space-y-32 pb-24">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
          {/* Badges do Hero */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-1.5 px-4 rounded-full bg-purple-950/60 border border-purple-500/30 backdrop-blur-md shadow-inner">
            <Badge className="bg-amber-500 text-stone-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
              NOVO
            </Badge>
            <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Plano Gratuito Disponível • 14 Dias Grátis no Pro
            </span>
          </div>

          {/* Título Principal */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              A Plataforma Inteligente de Gestão para{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Confeiteiras e Doceiras
              </span>
            </h1>
            <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Diga adeus às planilhas complicadas. O <strong>CaixaDoce</strong> lê suas notinhas de mercado com IA, organiza seus insumos, gerencia encomendas e aceita pagamentos online pela Stripe.
            </p>
          </div>

          {/* Botões de Ação Principal (CTA) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              onClick={irParaLogin}
              className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white rounded-2xl shadow-xl shadow-purple-900/50 border border-purple-300/30 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5 mr-2 text-amber-300" /> Testar 14 Dias Grátis no Plano Pro
            </Button>
            <Button
              onClick={irParaLogin}
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base font-bold bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-stone-700 rounded-2xl"
            >
              Acessar o Aplicativo <ArrowRight className="w-5 h-5 ml-2 text-purple-400" />
            </Button>
          </div>

          {/* Selos de Confiança */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-stone-400 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sem necessidade de cartão de crédito para testar
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Dados 100% protegidos e criptografados
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> Desenvolvido sob medida para confeitaria
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MOCKUPS VISUAIS INTERATIVOS / DEMONSTRAÇÃO DO SISTEMA */}
        {/* ========================================================================= */}
        <section id="demonstracao" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              DEMONSTRAÇÃO REALISTA
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Veja como o CaixaDoce simplifica sua rotina na prática
            </h2>
            <p className="text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
              Telas desenhadas para salvar horas de trabalho manual na cozinha.
            </p>
          </div>

          {/* Grid de Mockups */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* MOCKUP 1: Scanner de Notas com IA */}
            <Card className="bg-stone-900/90 border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-purple-500/60 transition-all">
              <div className="p-4 bg-purple-950/60 border-b border-purple-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Leitura de Cupons com IA</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">Gemini Vision OCR</Badge>
              </div>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-400">🏪 ATACADÃO ALIMENTOS</span>
                      <span className="text-emerald-400 font-bold">NF-e 049.182</span>
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">Data: 22/08/2026 • 14:35:10</div>
                  </div>

                  {/* Itens Extraídos pela IA */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                      Itens Identificados Automaticamente:
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 flex justify-between">
                        <span>4x Leite Condensado Moça 395g</span>
                        <span className="font-mono font-bold text-amber-300">R$ 27,60</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 flex justify-between">
                        <span>2x Chantilly Norcau 1L</span>
                        <span className="font-mono font-bold text-amber-300">R$ 33,80</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 flex justify-between">
                        <span>1x Cobertura Melken Ao Leite 1kg</span>
                        <span className="font-mono font-bold text-amber-300">R$ 42,90</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-semibold">Valor Total Extraído:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">R$ 104,30</span>
                </div>
              </CardContent>
            </Card>

            {/* MOCKUP 2: Card de Encomenda & Insumos */}
            <Card className="bg-stone-900/90 border-pink-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-pink-500/60 transition-all">
              <div className="p-4 bg-pink-950/60 border-b border-pink-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-pink-400" />
                  <span className="text-xs font-bold text-white">Gestão de Encomenda</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Em Produção</Badge>
              </div>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Bolo de Aniversário 2kg (Ninho c/ Morango)</h4>
                    <p className="text-xs text-stone-400">Cliente: Mariana Silva • Entrega: Amanhã às 16:00</p>
                  </div>

                  {/* Insumos Vincular */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">
                      Insumos Reservados no Estoque:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-950/60 text-pink-200 border border-pink-700/50 text-[11px] font-semibold">
                        ✓ Leite Condensado (2 un)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-pink-950/60 text-pink-200 border border-pink-700/50 text-[11px] font-semibold">
                        ✓ Chantilly (1L)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-pink-950/60 text-pink-200 border border-pink-700/50 text-[11px] font-semibold">
                        ✓ Cakeboard 25cm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-semibold">Sinal Pago (Pix/Stripe):</span>
                  <span className="text-base font-black text-amber-400 font-mono">R$ 90,00 (50%)</span>
                </div>
              </CardContent>
            </Card>

            {/* MOCKUP 3: Painel Financeiro */}
            <Card className="bg-stone-900/90 border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-amber-500/60 transition-all">
              <div className="p-4 bg-amber-950/60 border-b border-amber-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold text-white">Dashboard Financeiro</span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Lucro em Tempo Real</Badge>
              </div>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800">
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Faturamento Mês</div>
                      <div className="text-lg font-black text-emerald-400 font-mono">R$ 4.850,00</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800">
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Despesas com Insumos</div>
                      <div className="text-lg font-black text-rose-400 font-mono">R$ 1.420,00</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
                    <div className="flex justify-between text-xs text-emerald-200">
                      <span>Lucro Líquido Estimado:</span>
                      <span className="font-extrabold">70.7% de margem</span>
                    </div>
                    <div className="text-xl font-black text-emerald-400 font-mono">R$ 3.430,00</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-semibold">Integrado com Stripe Connect:</span>
                  <span className="text-xs font-bold text-purple-300">Links de Cobrança ⚡</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* GRID DE FUNCIONALIDADES */}
        {/* ========================================================================= */}
        <section id="funcionalidades" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-amber-400 border-amber-500/40 bg-amber-950/40 text-xs px-3 py-1">
              RECURSOS EXCLUSIVOS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Tudo o que sua doceria precisa em um só lugar
            </h2>
            <p className="text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
              Elimine o caos financeiro e foque no que você faz de melhor: doces incríveis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Funcionalidade 1 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-purple-900/40 hover:border-purple-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/40 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Scanner de Notas Fiscais com IA</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Tire foto do cupom fiscal do mercado. Nossa IA (Google Gemini Vision) lê os produtos, preços e data da compra automaticamente.
              </p>
            </div>

            {/* Funcionalidade 2 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-pink-900/40 hover:border-pink-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-pink-900/40 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Listas de Compras &amp; Seed de Insumos</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Monte listas de compras rapidamente com autocomplete de mais de 200 insumos e itens higienizados da confeitaria nacional.
              </p>
            </div>

            {/* Funcionalidade 3 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-amber-900/40 hover:border-amber-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-900/40 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Calendário &amp; Gestão de Encomendas</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Organize pedidos por data de entrega, vincule insumos necessários e nunca mais perca o prazo de uma festa ou bolo especial.
              </p>
            </div>

            {/* Funcionalidade 4 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-emerald-900/40 hover:border-emerald-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Cardápio Digital &amp; Loja Online</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Compartilhe seu catálogo online exclusivo via WhatsApp para seus clientes fazerem pedidos diretamente no seu link amigável.
              </p>
            </div>

            {/* Funcionalidade 5 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-blue-900/40 hover:border-blue-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-900/40 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Pagamentos Online pela Stripe Connect</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Gere links curtos de cobrança seguros (`caixadoce.com.br/pagar/cob_123`) para receber pagamento de sinal via cartão ou Pix direto na sua conta.
              </p>
            </div>

            {/* Funcionalidade 6 */}
            <div className="p-6 rounded-3xl bg-stone-900/60 border border-purple-900/40 hover:border-purple-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/40 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Fluxo de Caixa &amp; Lucratividade Real</h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Acompanhe o faturamento mensal, despesas com fornecedores e saiba exatamente quanto dinheiro sobra no seu bolso no final do mês.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TABELA DE PREÇOS (PRICING) */}
        {/* ========================================================================= */}
        <section id="precos" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              PLANOS &amp; PREÇOS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Planos acessíveis que cabem no bolso do seu negócio
            </h2>
            <p className="text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
              Comece no plano gratuito ou experimente todos os recursos ilimitados no Plano Pro por 14 dias sem compromisso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PLANO 1: BÁSICO (GRATUITO) */}
            <Card className="bg-stone-900/80 border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Plano Básico</h3>
                  <p className="text-xs text-stone-400">Ideal para quem está começando e quer organizar o financeiro.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">R$ 0</span>
                  <span className="text-xs text-stone-400 font-semibold">/ mês para sempre</span>
                </div>

                <div className="pt-4 border-t border-stone-800 space-y-3 text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Acesso ao Painel Financeiro e DRE Simplificado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cardápio Digital Interativo para Compartilhar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Criação e Gestão de Listas de Compras</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Gestão de Clientes e Produtos do Cardápio</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                variant="outline"
                className="w-full h-12 text-sm font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 rounded-xl"
              >
                Criar Conta Gratuita
              </Button>
            </Card>

            {/* PLANO 2: PRO MENSAL (DESTAQUE NEON) */}
            <Card className="bg-gradient-to-b from-purple-950/80 via-stone-900 to-purple-950/90 border-2 border-purple-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative space-y-6 shadow-2xl shadow-purple-900/40 transform lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-extrabold text-xs px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-stone-950" /> 🔥 14 DIAS GRÁTIS DE TESTE
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white flex items-center justify-between">
                    <span>Plano Pro Mensal</span>
                    <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">Mais Popular</Badge>
                  </h3>
                  <p className="text-xs text-purple-200">Acesso completo com Inteligência Artificial e Automações.</p>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-stone-400 line-through font-mono">De R$ 49,90/mês</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-amber-400">R$ 29,90</span>
                    <span className="text-xs text-stone-300 font-semibold">/ mês (Promoção de Lançamento)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-800/40 space-y-3 text-xs text-stone-200">
                  <div className="flex items-center gap-2 font-bold text-purple-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tudo do Plano Básico incluso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Leitura Ilimitada de Notinhas Fiscais com IA (Gemini OCR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Gestão Completa de Encomendas &amp; Calendário de Entregas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Integração com Stripe Connect e Links de Cobrança Curto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Vínculo Automático de Insumos com Compras Reais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Suporte Prioritário por WhatsApp</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                className="w-full h-12 text-sm font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-stone-950 rounded-xl shadow-lg shadow-amber-500/20"
              >
                Começar 14 Dias Grátis Agora
              </Button>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FAQ (PERGUNTAS FREQUENTES) */}
        {/* ========================================================================= */}
        <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              DÚVIDAS FREQUENTES
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona o período de 14 dias de teste grátis?",
                a: "Ao criar sua conta, você recebe automaticamente 14 dias de acesso total ao Plano Pro sem precisar cadastrar cartão de crédito. Se decidir não assinar ao final dos 14 dias, sua conta passa automaticamente para o Plano Básico Gratuito.",
              },
              {
                q: "Como a Inteligência Artificial lê minhas notinhas de mercado?",
                a: "Basta tirar uma foto do cupom fiscal ou nota diretamente no aplicativo. Nossa IA (baseada no Google Gemini Vision) analisa a imagem e extrai o nome da loja, número da nota, data e todos os itens com seus preços em segundos.",
              },
              {
                q: "Como recebo pagamentos dos meus clientes pela Stripe?",
                a: "Você pode conectar sua conta Stripe no painel financeiro em menos de 2 minutos. O sistema gera links curtos de cobrança profissionais para você enviar no WhatsApp. Os pagamentos são processados de forma segura e caem direto na sua conta bancária.",
              },
              {
                q: "Posso cancelar minha assinatura quando quiser?",
                a: "Sim! Não há fidelidade ou multa. Você pode cancelar sua assinatura mensal a qualquer momento com apenas 1 clique diretamente no menu 'Meu Plano'.",
              },
            ].map((item, index) => (
              <div
                key={index}
                onClick={() => toggleFaq(index)}
                className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 cursor-pointer transition-colors hover:border-purple-500/40 space-y-2"
              >
                <div className="flex items-center justify-between font-bold text-sm text-white">
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-400 transition-transform ${
                      faqAberto === index ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {faqAberto === index && (
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-2 border-t border-stone-800">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BANNER CTA FINAL */}
        {/* ========================================================================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-900 via-pink-900 to-purple-950 border border-purple-500/40 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Pronta para transformar a gestão da sua confeitaria?
              </h2>
              <p className="text-sm sm:text-base text-purple-200 max-w-xl mx-auto">
                Junte-se a centenas de doceiras que economizam tempo e aumentam seu lucro com o CaixaDoce.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={irParaLogin}
                className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl shadow-xl border border-amber-300/40"
              >
                Criar Minha Conta Gratuita <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-stone-800 bg-[#07030c] py-12 px-4 sm:px-6 lg:px-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <span>&copy; 2026 CaixaDoce. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#funcionalidades" className="hover:text-stone-300 transition-colors">
              Funcionalidades
            </a>
            <a href="#precos" className="hover:text-stone-300 transition-colors">
              Planos
            </a>
            <Link to="/login" className="hover:text-stone-300 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
