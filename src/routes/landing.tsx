import { useState } from "react";
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
  Heart,
  Store,
} from "lucide-react";
import { PLANOS_CONFIG } from "@/lib/planos-utils";
import { formatarMoeda } from "@/lib/caixadoce-data";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Gestão Inteligente para Confeitaria" },
      {
        name: "description",
        content:
          "Escaneie suas notinhas com IA, crie seu cardápio online com encomendas agendadas e receba pagamentos por Pix e Cartão.",
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

  const verCardapioDemo = () => {
    navigate({ to: "/cardapio/$storeCode", params: { storeCode: "CD-1001" } });
  };

  return (
    <div className="dark min-h-screen bg-[#0B0B14] text-slate-100 selection:bg-purple-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background Decorativo com Glow Neon em Roxo/Rosa */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER DA LANDING PAGE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0B14]/85 border-b border-purple-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#como-funciona" className="hover:text-purple-400 transition-colors">
              Como Funciona
            </a>
            <a href="#precos" className="hover:text-purple-400 transition-colors">
              Preços &amp; Planos
            </a>
            <a href="#faq" className="hover:text-purple-400 transition-colors">
              Perguntas Frequentes
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={irParaLogin}
              variant="ghost"
              className="text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-purple-900/30"
            >
              Entrar
            </Button>
            <Button
              onClick={irParaLogin}
              className="text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-lg shadow-purple-900/50 border border-purple-400/30 rounded-xl py-5 px-5"
            >
              Testar 14 Dias Grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-20 sm:space-y-28 pb-20">
        {/* ========================================================================= */}
        {/* SEÇÃO 1: HERO (TOPO VENDEDOR E DIRETO) */}
        {/* ========================================================================= */}
        <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
          {/* Badge de Destaque */}
          <div className="inline-flex items-center justify-center gap-2 p-1.5 px-4 rounded-full bg-purple-950/70 border border-purple-500/40 backdrop-blur-md shadow-inner">
            <Badge className="bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full">
              NOVO
            </Badge>
            <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Gestão Completa para Confeiteiras &amp; Doceiras
            </span>
          </div>

          {/* Título Principal Exato Solicitado */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Sua Confeitaria no Piloto Automático:{" "}
              <span className="bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Da Notinha de Mercado à Venda Online.
              </span>
            </h1>

            {/* Subtítulo Exato Solicitado */}
            <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Esqueça as planilhas. Escaneie suas compras com IA, crie seu cardápio com encomendas agendadas e receba pagamentos por Pix e Cartão.
            </p>
          </div>

          {/* CTAs Exatos Solicitados */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={irParaLogin}
              className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white rounded-2xl shadow-xl shadow-purple-900/60 border border-purple-300/30 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5 mr-2 text-amber-300" /> Testar 14 Dias Grátis
            </Button>

            <Button
              onClick={verCardapioDemo}
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-purple-500/40 hover:border-purple-400 rounded-2xl"
            >
              <Store className="w-5 h-5 mr-2 text-purple-400" /> Ver Cardápio Demo
            </Button>
          </div>

          {/* Selos de Confiança */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sem cartão de crédito para testar
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Setup em menos de 2 minutos
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> Feito para confeitaria artesanal
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: COMO FUNCIONA NA PRÁTICA (3 PILARES VISUAIS EM CARDS RÁPIDOS) */}
        {/* ========================================================================= */}
        <section id="como-funciona" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              COMO FUNCIONA NA PRÁTICA
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Tudo o que sua cozinha precisa em 3 passos simples
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* CARD 1: Escaneie Notinhas com IA */}
            <Card className="bg-slate-900/90 border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-purple-500/80 transition-all">
              <div className="p-4 bg-purple-950/70 border-b border-purple-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span className="text-sm font-bold text-white">📸 1. Escaneie Notinhas com IA</span>
                </div>
                <Badge className="bg-purple-500/30 text-purple-200 text-[10px] font-bold">Leitura IA</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Tire foto do cupom do mercado. A IA cadastra ingredientes, calcula custos e atualiza seu financeiro em segundos.
                </p>

                {/* MOCKUP VISUAL ALTO CONTRASTE */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">🛒 ATACADÃO ALIMENTOS</span>
                    <span className="text-emerald-400 font-bold">NF-e 049.182</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex justify-between items-center text-slate-100">
                      <span className="font-semibold text-slate-100">4x Leite Condensado 395g</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">R$ 27,60</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex justify-between items-center text-slate-100">
                      <span className="font-semibold text-slate-100">2x Chantilly Norcau 1L</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">R$ 33,80</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Total Processado:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">R$ 61,40</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: Cardápio & Encomendas Sob Medida */}
            <Card className="bg-slate-900/90 border-pink-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-pink-500/80 transition-all">
              <div className="p-4 bg-pink-950/70 border-b border-pink-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-400" />
                  <span className="text-sm font-bold text-white">🎂 2. Cardápio &amp; Encomendas</span>
                </div>
                <Badge className="bg-pink-500/30 text-pink-200 text-[10px] font-bold">Loja Online</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Crie sua loja online personalizada. Defina disponibilidade por produto: itens a Pronta Entrega nos dias que você escolher ou Sob Encomenda com antecedência mínima.
                </p>

                {/* MOCKUP VISUAL DISPONIBILIDADE */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Bolo de Aniversário 2kg</span>
                      <span className="text-xs font-bold text-purple-300">R$ 140,00</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-bold">
                      🕒 Antecedência: ~24h
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Caixa Brigadeiros (12 un)</span>
                      <span className="text-xs font-bold text-emerald-300">R$ 48,00</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                      ⚡ Pronta Entrega (Qua a Sáb)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: Pagamentos & Agenda Automática */}
            <Card className="bg-slate-900/90 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-amber-500/80 transition-all">
              <div className="p-4 bg-amber-950/70 border-b border-amber-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-white">💳 3. Pagamentos &amp; Agenda</span>
                </div>
                <Badge className="bg-amber-500/30 text-amber-200 text-[10px] font-bold">Stripe &amp; Pix</Badge>
              </div>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Receba por Pix ou Cartão de Crédito direto na sua conta. Seu cliente escolhe a data/hora permitida e o pedido já entra na sua agenda de produção.
                </p>

                {/* MOCKUP VISUAL PAGAMENTO E CALENDÁRIO */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Status Pagamento</div>
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sinal 50% Confirmado
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-white">R$ 70,00</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Data de Entrega</div>
                      <div className="text-xs font-bold text-amber-300">Sábado às 15:00</div>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Agenda OK</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: PREÇOS & PLANOS (SIMPLES E CLARO) */}
        {/* ========================================================================= */}
        <section id="precos" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              PREÇOS TRANSPARENTES
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Escolha o plano ideal para a sua confeitaria
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PLANO BÁSICO (GRATUITO) */}
            <Card className="bg-slate-900/90 border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Plano Básico</h3>
                  <p className="text-xs text-slate-400">Essencial para organizar seu cadastro e cardápio inicial.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">R$ 0</span>
                  <span className="text-xs text-slate-400 font-semibold">/ mês para sempre</span>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cardápio Digital Online para Compartilhar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cadastro de Clientes e Produtos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Listas de Compras Interativas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lançamentos Financeiros Manuais</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                variant="outline"
                className="w-full h-12 text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl"
              >
                Criar Conta Gratuita
              </Button>
            </Card>

            {/* PLANO PRO (PROMOÇÃO DE LANÇAMENTO + 14 DIAS GRÁTIS) */}
            <Card className="bg-gradient-to-b from-purple-950/90 via-slate-900 to-purple-950/95 border-2 border-purple-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative space-y-6 shadow-2xl shadow-purple-900/50 transform lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-xs px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-slate-950" /> 14 DIAS GRÁTIS DE TESTE
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white flex items-center justify-between">
                    <span>Plano Pro Mensal</span>
                    <Badge className="bg-purple-500/20 text-purple-300 text-[10px] font-bold">Mais Vendido</Badge>
                  </h3>
                  <p className="text-xs text-purple-200">Automação total com Inteligência Artificial e Pagamentos Online.</p>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400 line-through font-mono">De R$ 29,90/mês</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-amber-400">
                      {formatarMoeda(PLANOS_CONFIG.mensal.precoMensal)}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">/ mês (com 14 dias grátis)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-800/50 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center gap-2 font-bold text-purple-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tudo do Plano Básico incluso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Leitura Ilimitada de Cupons de Mercado por IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Disponibilidade e Agendamento por Produto no Checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Recebimentos por Pix e Cartão (Stripe Connect)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Conciliação Automática de Insumos e Estoque</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={irParaLogin}
                className="w-full h-12 text-sm font-black bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/50"
              >
                Testar 14 Dias Grátis Agora
              </Button>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: FAQ RÁPIDO (APENAS 3 PERGUNTAS SANFONADAS) + CTA FINAL */}
        {/* ========================================================================= */}
        <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/40 text-xs px-3 py-1">
              TIRE SUAS DÚVIDAS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
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
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 cursor-pointer transition-colors hover:border-purple-500/50 space-y-2"
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
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* BANNER CTA FINAL DE CONVERSÃO */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-950 via-pink-950 to-purple-900 border border-purple-500/40 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Pronta para transformar a gestão da sua confeitaria?
              </h2>
              <p className="text-sm sm:text-base text-purple-200 max-w-xl mx-auto font-medium">
                Junte-se a doceiras e confeiteiras que economizam horas de trabalho manual e aumentam o lucro com o CaixaDoce.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={irParaLogin}
                className="h-14 px-8 text-base font-extrabold bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white rounded-2xl shadow-xl shadow-purple-900/60 border border-purple-300/30"
              >
                Testar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#07030c] py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <span>&copy; 2026 CaixaDoce. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#como-funciona" className="hover:text-slate-300 transition-colors">
              Como Funciona
            </a>
            <a href="#precos" className="hover:text-slate-300 transition-colors">
              Planos
            </a>
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
