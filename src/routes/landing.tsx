import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Camera,
  CreditCard,
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
} from "lucide-react";
import { PLANOS_CONFIG } from "@/lib/planos-utils";
import { formatarMoeda } from "@/lib/caixadoce-data";
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

export function LandingPageContent() {
  const navigate = useNavigate();
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  const irParaLogin = () => {
    navigate({ to: "/login" });
  };

  const verCardapioDemo = () => {
    navigate({ to: "/cardapio/$storeCode", params: { storeCode: "CD-DEMO" } });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-600 selection:text-white font-sans overflow-x-hidden relative">
      {/* Background Decorativo com Tons Suaves e Confeitaria Clean (Sem Neon Escuro) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-amber-100/60 rounded-full blur-3xl"></div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER DA LANDING PAGE (LIGHT THEME COM LOGIN EM ALTO CONTRASTE) */}
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
            <a href="#precos" className="hover:text-purple-600 transition-colors">
              Preços &amp; Planos
            </a>
            <a href="#faq" className="hover:text-purple-600 transition-colors">
              Perguntas Frequentes
            </a>
          </nav>

          {/* Destaque para o Login (Botões de Alto Contraste) */}
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
        {/* SEÇÃO 1: HERO (TOPO VENDEDOR E DIRETO - LIGHT THEME) */}
        {/* ========================================================================= */}
        <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
          {/* Badge de Destaque */}
          <div className="inline-flex items-center justify-center gap-2 p-1.5 px-4 rounded-full bg-purple-100/90 border border-purple-200 shadow-xs">
            <Badge className="bg-purple-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
              NOVO
            </Badge>
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Gestão Completa para Confeiteiras &amp; Doceiras
            </span>
          </div>

          {/* Título Principal */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Sua Confeitaria no Piloto Automático:{" "}
              <span className="bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                Da Notinha de Mercado à Venda Online.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
              Esqueça as planilhas. Escaneie suas compras com IA, crie seu cardápio com encomendas agendadas e receba pagamentos por Pix e Cartão.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={irParaLogin}
              className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl shadow-xl shadow-purple-600/25 border border-purple-400/30 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5 mr-2 text-amber-300" /> Testar 14 Dias Grátis
            </Button>

            <Button
              onClick={verCardapioDemo}
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base font-bold bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-200 hover:border-purple-300 rounded-2xl shadow-xs"
            >
              <Store className="w-5 h-5 mr-2 text-purple-600" /> Ver Cardápio Demo
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
        {/* SEÇÃO 2: COMO FUNCIONA NA PRÁTICA (3 PILARES VISUAIS EM CARDS RÁPIDOS) */}
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

                {/* MOCKUP VISUAL LIGHT THEME */}
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

                {/* MOCKUP VISUAL DISPONIBILIDADE */}
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
              </CardContent>
            </Card>

            {/* CARD 3: Pagamentos & Agenda Automática */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col relative group hover:border-amber-300 transition-all">
              <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-950">💳 3. Pagamentos &amp; Agenda</span>
                </div>
                <Badge className="bg-amber-200 text-amber-900 text-[10px] font-bold">Stripe &amp; Pix</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Receba por Pix ou Cartão de Crédito direto na sua conta. Seu cliente escolhe a data/hora permitida e o pedido já entra na sua agenda de produção.
                </p>

                {/* MOCKUP VISUAL PAGAMENTO E CALENDÁRIO */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Status Pagamento</div>
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sinal 50% Confirmado
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-900">R$ 70,00</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Data de Entrega</div>
                      <div className="text-xs font-bold text-amber-800">Sábado às 15:00</div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">Agenda OK</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: PREÇOS & PLANOS (LIGHT THEME TRANSPARENTE) */}
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
            {/* PLANO BÁSICO (GRATUITO) */}
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
                    <span className="line-through">Calendário de Encomendas &amp; Clientes (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Painel Financeiro &amp; Fluxo de Caixa (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Cardápio Digital Personalizado (Bloqueado)</span>
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
                  <p className="text-xs text-purple-700 font-medium">Automação total com Inteligência Artificial e Pagamentos Online.</p>
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
                    <span>Cobrança via cartão com o Stripe</span>
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
        {/* SEÇÃO 4: FAQ RÁPIDO + CTA FINAL */}
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
                a: "Basta tirar uma foto do cupom fiscal do supermercado pelo celular ou subir a imagem no computador. Nossa IA (Gemini Vision) reconhece os insumos, quantidades e preços automaticamente.",
              },
              {
                q: "Como recebo o pagamento das minhas encomendas?",
                a: "Você pode aceitar Pix com chave própria ou conectar sua conta Stripe para receber cartão de crédito à vista ou parcelado direto na sua conta bancária.",
              },
              {
                q: "Preciso cadastrar cartão de crédito para testar?",
                a: "Não! Você pode começar no plano gratuito ou iniciar o teste de 14 dias do Plano Pro sem digitar nenhum cartão de crédito.",
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

          {/* BANNER CTA FINAL DE CONVERSÃO (LIGHT THEME PURPLE) */}
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
