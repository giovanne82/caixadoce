import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Camera,
  CreditCard,
  Calculator,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Crown,
  ShoppingBag,
  ChevronDown,
  Check,
  X,
  Heart,
  Store,
  UserCheck,
  LogIn,
  ShoppingCart,
  CalendarDays,
  TrendingUp,
  Receipt,
  Eye,
  Layers,
  Clock,
  DollarSign,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Gestão Inteligente para Confeiteiras & Doceiras" },
      {
        name: "description",
        content:
          "Escaneie suas notinhas de mercado com IA, crie seu cardápio online com encomendas agendadas e receba pagamentos por Pix e Cartão.",
      },
    ],
  }),
  component: LandingPage,
});

type DemoModalType = "notinha" | "lista" | "encomendas" | "cardapio" | "financeiro" | null;

export function LandingPageContent() {
  const navigate = useNavigate();
  const [faqAberto, setFaqAberto] = useState<number | null>(0);
  const [modalDemo, setModalDemo] = useState<DemoModalType>(null);

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  const irParaLogin = () => {
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-600 selection:text-white font-sans overflow-x-hidden relative">
      {/* Background Decorativo Suave */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-amber-100/60 rounded-full blur-3xl"></div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER DA LANDING PAGE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#como-funciona" className="hover:text-purple-600 transition-colors">
              Como Funciona
            </a>
            <a href="#demonstracao" className="hover:text-purple-600 transition-colors">
              Demonstração
            </a>
            <a href="#precos" className="hover:text-purple-600 transition-colors">
              Preços &amp; Planos
            </a>
            <a href="#faq" className="hover:text-purple-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Destaque para o Login */}
          <div className="flex items-center gap-3">
            <Button
              onClick={irParaLogin}
              variant="outline"
              className="hidden sm:flex font-bold border-2 border-purple-600 text-purple-700 hover:bg-purple-50 rounded-xl px-4 h-10 transition-all"
            >
              <LogIn className="w-4 h-4 mr-1.5" /> Entrar
            </Button>

            <Button
              onClick={irParaLogin}
              className="font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 rounded-xl py-2 px-5 h-10 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <UserCheck className="w-4 h-4" /> Acessar Sistema
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-20 sm:space-y-28 pb-20">
        {/* ========================================================================= */}
        {/* SEÇÃO 1: HERO */}
        {/* ========================================================================= */}
        <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center gap-2 p-1.5 px-4 rounded-full bg-purple-100/90 border border-purple-200 shadow-xs">
            <Badge className="bg-purple-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
              NOVO
            </Badge>
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Gestão Completa para Confeiteiras &amp; Doceiras
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Sua Confeitaria no Piloto Automático:{" "}
              <span className="bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                Da Notinha de Mercado à Venda Online.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
              Esqueça as planilhas. Escaneie suas compras com IA, crie seu cardápio com encomendas agendadas e receba pagamentos por Pix e Cartão.
            </p>
          </div>

          {/* CTA Principal Único */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={irParaLogin}
              className="h-14 px-8 text-base font-extrabold bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl shadow-xl shadow-purple-600/25 border border-purple-400/30 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5 mr-2 text-amber-300" /> Testar 14 Dias Grátis Agora
            </Button>
          </div>

          {/* Selos de Confiança */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sem cartão de crédito para testar
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Setup em menos de 2 minutos
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" /> Feito para confeitaria artesanal
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: COMO FUNCIONA NA PRÁTICA (3 PILARES VISUAIS) */}
        {/* ========================================================================= */}
        <section id="como-funciona" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3 py-1 font-bold">
              COMO FUNCIONA NA PRÁTICA
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Tudo o que sua cozinha precisa em 3 passos simples
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* CARD 1: Escaneie Notinhas com IA */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col relative group hover:border-purple-300 transition-all">
              <div className="p-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600 animate-pulse" />
                  <span className="text-sm font-bold text-purple-950">📸 1. Escaneie Notinhas com IA</span>
                </div>
                <Badge className="bg-purple-200 text-purple-900 text-[10px] font-bold">Leitura IA</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Tire foto do cupom do mercado. A IA cadastra ingredientes, calcula custos e atualiza seu financeiro em segundos.
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-800 font-bold">🛒 ATACADÃO ALIMENTOS</span>
                    <span className="text-emerald-700 font-bold">NF-e 049.182</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center text-slate-900 shadow-2xs">
                      <span className="font-semibold text-slate-800">4x Leite Condensado 395g</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">R$ 27,60</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center text-slate-900 shadow-2xs">
                      <span className="font-semibold text-slate-800">2x Chantilly Norcau 1L</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">R$ 33,80</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Total Processado:</span>
                    <span className="text-base font-black text-emerald-700 font-mono">R$ 61,40</span>
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("notinha")}
                  variant="outline"
                  className="w-full text-xs font-bold border-purple-200 hover:bg-purple-50 text-purple-700 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Demonstração da Leitura
                </Button>
              </CardContent>
            </Card>

            {/* CARD 2: Cardápio & Encomendas Sob Medida */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col relative group hover:border-pink-300 transition-all">
              <div className="p-4 bg-pink-50 border-b border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-600" />
                  <span className="text-sm font-bold text-pink-950">🎂 2. Cardápio &amp; Encomendas</span>
                </div>
                <Badge className="bg-pink-200 text-pink-900 text-[10px] font-bold">Loja Online</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Crie sua loja online personalizada. Defina disponibilidade por produto: itens a Pronta Entrega nos dias que você escolher ou Sob Encomenda com antecedência mínima.
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950">Bolo de Aniversário 2kg</span>
                      <span className="text-xs font-bold text-purple-800">R$ 140,00</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-200 text-purple-900 text-[11px] font-bold">
                      🕒 Antecedência: ~24h
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950">Caixa Brigadeiros (12 un)</span>
                      <span className="text-xs font-bold text-emerald-800">R$ 48,00</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[11px] font-bold">
                      ⚡ Pronta Entrega (Qua a Sáb)
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("cardapio")}
                  variant="outline"
                  className="w-full text-xs font-bold border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Exemplo de Cardápio
                </Button>
              </CardContent>
            </Card>

            {/* CARD 3: Ficha Técnica & Precificação Exata Sem Prejuízo */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col relative group hover:border-amber-300 transition-all">
              <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-950">📊 3. Ficha Técnica &amp; Precificação</span>
                </div>
                <Badge className="bg-amber-200 text-amber-900 text-[10px] font-bold">Mercado Pago &amp; Pix</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Descubra o custo real exato do seu produto final e precifique corretamente para NUNCA ter prejuízo. À medida que você adiciona notinhas, o sistema atualiza o custo dos insumos automaticamente com base no <strong>último preço comprado</strong>!
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Custo Real da Receita</div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        🎂 Bolo Vulcano Ninho (2kg)
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-rose-600">R$ 28,40</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-emerald-800 font-bold uppercase">Preço Venda Sugerido</div>
                      <div className="text-xs font-bold text-emerald-700">Lucro Garantido (62%)</div>
                    </div>
                    <span className="text-base font-mono font-black text-emerald-700">R$ 75,00</span>
                  </div>

                  <div className="text-[10px] text-center font-bold text-purple-700 bg-purple-50 p-1.5 rounded-lg border border-purple-200">
                    ⚡ Custos atualizados automaticamente pela última compra!
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("encomendas")}
                  variant="outline"
                  className="w-full text-xs font-bold border-amber-200 hover:bg-amber-50 text-amber-800 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Exemplo de Encomendas
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO NOVAS DEMONSTRAÇÕES INTERATIVAS (MODAIS DE FERRAMENTAS) */}
        {/* ========================================================================= */}
        <section id="demonstracao" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3 py-1 font-bold">
              EXPLORE AS FERRAMENTAS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Veja como cada funcionalidade funciona na prática
            </h2>
            <p className="text-sm text-slate-600 font-normal">
              Clique em qualquer módulo para abrir uma demonstração visual interativa do sistema CaixaDoce.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* ITEM 1: Escanear Notinha */}
            <Card
              onClick={() => setModalDemo("notinha")}
              className="bg-white border border-slate-200 hover:border-purple-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-center space-y-3"
            >
              <div className="p-3.5 bg-purple-100 text-purple-700 rounded-2xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                  Escanear Notinha
                </h4>
                <p className="text-xs text-slate-500 mt-1">Leitura automática de comprovantes fiscais por IA.</p>
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-[10px] font-bold mx-auto">
                <Eye className="w-3 h-3 mr-1" /> Ver Exemplo
              </Badge>
            </Card>

            {/* ITEM 2: Lista de Compras */}
            <Card
              onClick={() => setModalDemo("lista")}
              className="bg-white border border-slate-200 hover:border-emerald-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-center space-y-3"
            >
              <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Lista de Compras
                </h4>
                <p className="text-xs text-slate-500 mt-1">Insumos organizados e vinculados às compras.</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-bold mx-auto">
                <Eye className="w-3 h-3 mr-1" /> Ver Exemplo
              </Badge>
            </Card>

            {/* ITEM 3: Encomendas */}
            <Card
              onClick={() => setModalDemo("encomendas")}
              className="bg-white border border-slate-200 hover:border-amber-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-center space-y-3"
            >
              <div className="p-3.5 bg-amber-100 text-amber-700 rounded-2xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                  Encomendas &amp; Agenda
                </h4>
                <p className="text-xs text-slate-500 mt-1">Calendário de produção e prazos de entrega.</p>
              </div>
              <Badge variant="secondary" className="bg-amber-50 text-amber-800 text-[10px] font-bold mx-auto">
                <Eye className="w-3 h-3 mr-1" /> Ver Exemplo
              </Badge>
            </Card>

            {/* ITEM 4: Cardápio Digital */}
            <Card
              onClick={() => setModalDemo("cardapio")}
              className="bg-white border border-slate-200 hover:border-pink-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-center space-y-3"
            >
              <div className="p-3.5 bg-pink-100 text-pink-700 rounded-2xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-pink-600 transition-colors">
                  Cardápio Digital
                </h4>
                <p className="text-xs text-slate-500 mt-1">Vitrine online com encomendas e prontas entregas.</p>
              </div>
              <Badge variant="secondary" className="bg-pink-50 text-pink-700 text-[10px] font-bold mx-auto">
                <Eye className="w-3 h-3 mr-1" /> Ver Exemplo
              </Badge>
            </Card>

            {/* ITEM 5: Financeiro */}
            <Card
              onClick={() => setModalDemo("financeiro")}
              className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-center space-y-3"
            >
              <div className="p-3.5 bg-blue-100 text-blue-700 rounded-2xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  Painel Financeiro
                </h4>
                <p className="text-xs text-slate-500 mt-1">Fluxo de caixa, despesas e lucro real por receita.</p>
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold mx-auto">
                <Eye className="w-3 h-3 mr-1" /> Ver Exemplo
              </Badge>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: PREÇOS & PLANOS */}
        {/* ========================================================================= */}
        <section id="precos" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3 py-1 font-bold">
              PREÇOS TRANSPARENTES
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Escolha o plano ideal para a sua confeitaria
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PLANO BÁSICO (GRATUITO - APENAS LISTA DE COMPRAS) */}
            <Card className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-md">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Plano Básico</h3>
                  <p className="text-xs text-slate-500">Para organizar suas listas de compras de forma simples.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">R$ 0</span>
                  <span className="text-xs text-slate-500 font-semibold">/ mês para sempre</span>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Acesso Exclusivo à Lista de Compras Interativa</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Escanear a Notinha com IA (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Ficha Técnica &amp; Precificação Sem Prejuízo (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Calendário de Encomendas &amp; Clientes (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Painel Financeiro &amp; Fluxo de Caixa (Bloqueado)</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                variant="outline"
                className="w-full h-12 text-sm font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 rounded-xl"
              >
                Criar Conta Gratuita
              </Button>
            </Card>

            {/* PLANO PRO (MENSAL COMPLETO - R$ 19,90 / MÊS) */}
            <Card className="bg-white border-2 border-purple-600 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative space-y-6 shadow-xl shadow-purple-600/15 transform lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-slate-950" /> 14 DIAS GRÁTIS DE TESTE
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center justify-between">
                    <span>Plano Pro Mensal</span>
                    <Badge className="bg-purple-100 text-purple-800 font-bold text-[10px]">Mais Vendido</Badge>
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">Automação total com Inteligência Artificial e Precificação Sem Prejuízo.</p>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400 line-through font-mono">De R$ 29,90/mês</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-purple-700">
                      R$ 19,90
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">/ mês (com 14 dias grátis)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Escanear a Notinha com IA (Ilimitado)</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Ficha Técnica &amp; Precificação (Custo Real sem Prejuízo)</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Atualização automática com base no <strong>último preço comprado</strong></span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Milhares de pré-cadastros de insumos para Lista de Compras</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Controlar pedidos de clientes (Calendário de Encomendas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Controle financeiro dos pedidos e fluxo de caixa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Cardápio digital personalizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Emissão de link de pagamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Cobrança via Pix ou Cartão com Mercado Pago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Compartilhamento de conta com outro usuário</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                className="w-full h-12 text-sm font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all"
              >
                Testar 14 Dias Grátis Agora
              </Button>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: FAQ (APENAS PERGUNTAS ATIVAS E RELEVANTES) */}
        {/* ========================================================================= */}
        <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3 py-1 font-bold">
              TIRE SUAS DÚVIDAS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona a leitura de notinhas por IA?",
                a: "Basta tirar uma foto do cupom fiscal do supermercado pelo celular ou subir o arquivo. Nossa IA lê os insumos, quantidades e preços automaticamente, atualizando seus custos sem digitação manual.",
              },
              {
                q: "Preciso cadastrar cartão de crédito para testar?",
                a: "Não! Você pode iniciar o seu teste gratuito de 14 dias do Plano Pro imediatamente sem informar nenhum cartão de crédito.",
              },
              {
                q: "Como o CaixaDoce ajuda a controlar o lucro da minha confeitaria?",
                a: "O sistema cruza automaticamente o custo real das suas compras (notinhas escaneadas) com os preços de venda das encomendas e produtos do cardápio, mostrando sua margem de lucro exata por pedido.",
              },
            ].map((item, index) => (
              <div
                key={index}
                onClick={() => toggleFaq(index)}
                className="p-5 rounded-2xl bg-white border border-slate-200 cursor-pointer transition-colors hover:border-purple-300 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-600 transition-transform ${
                      faqAberto === index ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {faqAberto === index && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* BANNER CTA FINAL DE CONVERSÃO */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-800 text-white text-center space-y-6 relative overflow-hidden shadow-xl shadow-purple-900/20">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Pronta para transformar a gestão da sua confeitaria?
              </h2>
              <p className="text-sm sm:text-base text-purple-100 max-w-xl mx-auto font-medium">
                Junte-se a doceiras e confeiteiras que economizam horas de trabalho manual e aumentam o lucro com o CaixaDoce.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={irParaLogin}
                className="h-14 px-8 text-base font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl shadow-xl transition-all"
              >
                Testar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAIS DE DEMONSTRAÇÃO VISUAL DAS FERRAMENTAS */}
      {/* ========================================================================= */}

      {/* MODAL 1: Escanear Notinha (IA) */}
      <Dialog open={modalDemo === "notinha"} onOpenChange={(open) => !open && setModalDemo(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-purple-950">
              <Camera className="w-6 h-6 text-purple-600" /> Demonstração: Leitura de Notinhas por IA
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              A Inteligência Artificial lê o cupom fiscal do mercado e cadastra todos os insumos sem digitação manual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 font-mono">📸 Cupom Escaneado #4918</span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">100% Processado por IA</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Leite Condensado Moça 395g (cx c/4)</div>
                    <div className="text-[11px] text-purple-700 font-medium">Categoria: Lácteos &amp; Recheios</div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>4 un</div>
                    <div className="text-emerald-700">R$ 27,60</div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Chantilly Norcau Chanty 1L</div>
                    <div className="text-[11px] text-purple-700 font-medium">Categoria: Confeitaria</div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>2 un</div>
                    <div className="text-emerald-700">R$ 33,80</div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Cobertura Harald Top Ao Leite 1kg</div>
                    <div className="text-[11px] text-purple-700 font-medium">Categoria: Chocolates</div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>1 un</div>
                    <div className="text-emerald-700">R$ 29,90</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950">Total da Compra Registrado:</span>
                <span className="text-base font-black text-emerald-700 font-mono">R$ 91,30</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
              💡 <strong>Como beneficia você:</strong> Cada insumo escaneado atualiza automaticamente seu estoque e calcula o custo exato das suas receitas de bolos e doces.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Lista de Compras */}
      <Dialog open={modalDemo === "lista"} onOpenChange={(open) => !open && setModalDemo(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-emerald-950">
              <ShoppingCart className="w-6 h-6 text-emerald-600" /> Demonstração: Lista de Compras
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Crie listas de reposição de matérias-primas com sugestões inteligentes e vincule às notinhas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-950">🛒 Lista: Reposição de Insumos (Final de Semana)</span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">4 Itens Pendentes</Badge>
              </div>

              <div className="space-y-2 text-xs">
                {["Farinha de Trigo Especial 1kg (x5)", "Morango Bandeja Fresh (x4)", "Caixa de Bolo Alta 25x25 (x10)", "Creme de Leite 200g (x6)"].map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{item}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">Pendente</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
              💡 <strong>Autocomplete Inteligente:</strong> A lista conta com mais de 50 insumos e ingredientes de mercado pré-cadastrados para digitação ultra rápida no celular.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Encomendas & Agenda */}
      <Dialog open={modalDemo === "encomendas"} onOpenChange={(open) => !open && setModalDemo(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-amber-950">
              <CalendarDays className="w-6 h-6 text-amber-600" /> Demonstração: Calendário de Encomendas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Organize todas as entregas por data e horário e evite surpresas na sua cozinha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-950">📅 Agenda de Produção — Sábado (15/Out)</span>
                <Badge className="bg-amber-500 text-white text-[10px] font-bold">2 Pedidos Confirmados</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">🎂 Bolo Red Velvet 2kg + 20 Brigadeiros</span>
                    <span className="font-mono font-bold text-amber-900">R$ 185,00</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Cliente: Juliana Costa (WhatsApp)</span>
                    <span className="font-bold text-emerald-700">Sinal 50% Pago (Pix)</span>
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold pt-1">🕒 Retirada agendada para 14:30</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">🧁 50 Copos da Felicidade Ninho c/ Nutella</span>
                    <span className="font-mono font-bold text-amber-900">R$ 450,00</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Cliente: Festa Infantil Buffet</span>
                    <span className="font-bold text-emerald-700">Pago Integral (Cartão)</span>
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold pt-1">🚚 Entrega no local às 17:00</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
              💡 <strong>Trava de Horários:</strong> O sistema bloqueia automaticamente datas com agenda cheia para evitar sobrecarga de trabalho.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Cardápio Digital */}
      <Dialog open={modalDemo === "cardapio"} onOpenChange={(open) => !open && setModalDemo(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-pink-950">
              <Store className="w-6 h-6 text-pink-600" /> Demonstração: Cardápio Digital Público
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Sua loja online pronta para o cliente escolher produtos, antecedência de pedido e pagar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-pink-950">🏪 Loja: Doce Sonho Confeitaria</span>
                <Badge className="bg-pink-600 text-white text-[10px] font-bold">Vitrine Online Ativa</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-pink-200 space-y-1.5 text-center">
                  <div className="font-bold text-slate-900 text-xs">Bolo Vulcão Ninho</div>
                  <div className="text-pink-700 font-black font-mono">R$ 65,00</div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ⚡ Pronta Entrega
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-pink-200 space-y-1.5 text-center">
                  <div className="font-bold text-slate-900 text-xs">Bolo Decorado Chantininho</div>
                  <div className="text-pink-700 font-black font-mono">R$ 130,00</div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                    🕒 Pedir com 24h
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
              💡 <strong>Vendas pelo WhatsApp:</strong> Seu cliente faz o pedido no cardápio e recebe a confirmação direta no WhatsApp com link de pagamento seguro Mercado Pago.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Financeiro */}
      <Dialog open={modalDemo === "financeiro"} onOpenChange={(open) => !open && setModalDemo(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-blue-950">
              <TrendingUp className="w-6 h-6 text-blue-600" /> Demonstração: Painel Financeiro
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Acompanhe seu faturamento, gastos com compras de insumos e margem de lucro em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-blue-950">📊 Resumo do Mês Vigente</span>
                <Badge className="bg-blue-600 text-white text-[10px] font-bold">Fluxo de Caixa OK</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">Vendas (Receitas)</div>
                  <div className="text-sm font-black text-emerald-600 font-mono">R$ 3.840,00</div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">Despesas Insumos</div>
                  <div className="text-sm font-black text-rose-600 font-mono">R$ 1.120,00</div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">Lucro Líquido</div>
                  <div className="text-sm font-black text-blue-600 font-mono">R$ 2.720,00</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
              💡 <strong>Lucro Real Sem Complicação:</strong> O sistema calcula a margem exata descontando o custo das notinhas escaneadas do valor cobrado das encomendas.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <span>&copy; 2026 CaixaDoce. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#como-funciona" className="hover:text-purple-700 transition-colors">
              Como Funciona
            </a>
            <a href="#demonstracao" className="hover:text-purple-700 transition-colors">
              Demonstração
            </a>
            <a href="#precos" className="hover:text-purple-700 transition-colors">
              Planos
            </a>
            <Link to="/login" className="hover:text-purple-700 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  return <LandingPageContent />;
}
