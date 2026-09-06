import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  QrCode,
  Flame,
  Palette,
  Smartphone,
  RefreshCw,
  SlidersHorizontal,
  BadgeCheck,
  AlertCircle,
  Truck,
  MessageCircle,
} from "lucide-react";

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
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl"></div>
      </div>

      {/* BANNER PROMOCIONAL FIXO NO TOPO - 7 DIAS GRÁTIS */}
      <div className="bg-gradient-to-r from-purple-900 via-pink-800 to-amber-700 text-white text-xs font-bold py-2.5 px-4 text-center flex flex-wrap items-center justify-center gap-2 shadow-md relative z-50">
        <Crown className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
        <span>
          <strong>7 dias grátis para testar:</strong> Teste grátis por 7 dias sem compromisso e sem precisar de cartão!
        </span>
        <Button
          onClick={irParaLogin}
          size="sm"
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] h-7 px-3.5 rounded-full shadow-md shrink-0 ml-1 flex items-center gap-1 transition-all transform hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>Criar minha Loja Grátis agora</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* HEADER DA LANDING PAGE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#vitrine" className="hover:text-purple-600 transition-colors">
              Loja &amp; Pix
            </a>
            <a href="#encomendas" className="hover:text-purple-600 transition-colors">
              Gestão de Encomendas
            </a>
            <a href="#precificacao" className="hover:text-purple-600 transition-colors">
              Precificação &amp; Ficha Técnica
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

          {/* Destaque para o Login / CTA */}
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
              className="font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md shadow-purple-600/20 rounded-xl py-2 px-5 h-10 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Criar Loja Grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-24 sm:space-y-32 pb-24">
        {/* ========================================================================= */}
        {/* SEÇÃO 1: HERO SECTION */}
        {/* ========================================================================= */}
        <section className="pt-8 sm:pt-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center gap-2 p-1.5 px-4 rounded-full bg-purple-100/90 border border-purple-200 shadow-xs">
            <Badge className="bg-purple-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
              NOVO
            </Badge>
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" /> A Solução Definitiva de Gestão e Vendas para Confeiteiros
            </span>
          </div>

          <div className="space-y-5">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
              Transforme sua Confeitaria em um Negócio Profissional e{" "}
              <span className="bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                Venda no Piloto Automático
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
              Crie sua loja virtual personalizada, controle todas as suas entregas e nunca mais perca dinheiro por calcular o preço errado dos seus doces.
            </p>
          </div>

          {/* CTA PRINCIPAL DO HERO */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              onClick={irParaLogin}
              className="w-full sm:w-auto font-black text-base sm:text-lg bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-14 px-8 rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Criar minha Loja Grátis agora</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* CARD DE BENEFÍCIOS DO TESTE */}
          <div className="mx-auto max-w-3xl p-1 sm:p-1.5 rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 shadow-xl shadow-purple-600/15 transform hover:scale-[1.01] transition-all">
            <div className="bg-white rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left border border-purple-100">
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <Badge className="bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-slate-950" /> 7 DIAS GRÁTIS PARA TESTAR
                  </Badge>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Sem Cartão de Crédito
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  Teste grátis por 7 dias sem compromisso
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Acesso completo e imediato: Cardápio Digital, Pix Mercado Pago, Gestão de Encomendas e Ficha Técnica.
                </p>
              </div>

              <Button
                onClick={irParaLogin}
                variant="outline"
                className="w-full sm:w-auto font-bold border-2 border-purple-600 text-purple-700 hover:bg-purple-50 text-xs sm:text-sm h-11 px-5 rounded-xl shrink-0 transition-all"
              >
                <span>Acessar e Começar</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Selos de Confiança */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sem cartão de crédito para testar
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Setup em menos de 2 minutos
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" /> Feito sob medida para confeitarias &amp; docerias
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: LOJA E PAGAMENTOS AUTOMÁTICOS */}
        {/* ========================================================================= */}
        <section id="vitrine" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-pink-700 border-pink-300 bg-pink-50 text-xs px-3.5 py-1 font-bold">
              LOJA VIRTUAL &amp; CHECKOUT PIX
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Sua Vitrine, Suas Regras
            </h2>
            <p className="text-base text-slate-600 font-normal leading-relaxed">
              Esqueça a confusão de tirar pedidos pelo WhatsApp. Monte uma loja virtual profissional com as suas cores em poucos minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo: Diferenciais e Bullet Points */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-pink-100 shadow-lg shadow-pink-500/5 space-y-4 hover:border-pink-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    Pix com Baixa Automática
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Mercado Pago</Badge>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Integração direta com o Mercado Pago. O cliente paga e o sistema reconhece sozinho, sem precisar de comprovante.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-lg shadow-purple-500/5 space-y-4 hover:border-purple-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Zero Atrito para seu Cliente
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Uma experiência de compra fluida e rápida para o seu cliente final: escolha de sabores, cálculo de frete por delivery/retirada e pagamento instantâneo.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Personalização Completa da sua Marca
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Defina banner, logotipo, cores da sua identidade visual e regras de agendamento por produto (Pronta Entrega ou Encomendas com antecedência).
                  </p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Mockup Visual Interativo da Vitrine & Checkout Pix */}
            <div className="lg:col-span-6">
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-pink-50 via-purple-50 to-white border-2 border-pink-200/80 shadow-xl space-y-5 relative overflow-hidden">
                {/* Cabeçalho do Mockup da Loja */}
                <div className="flex items-center justify-between pb-3 border-b border-pink-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      🎂
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">Doce Encanto Confeitaria</div>
                      <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Loja Aberta • Entregas &amp; Retiradas
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">caixadoce.com/doceencanto</Badge>
                </div>

                {/* Itens do Cardápio */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Bolo Vulcão Ninho com Nutella</div>
                      <div className="text-[11px] text-pink-700 font-semibold font-mono">R$ 68,00</div>
                      <Badge className="mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold">⚡ Pronta Entrega</Badge>
                    </div>
                    <Button size="sm" className="h-8 px-3 bg-purple-600 text-white text-xs font-bold rounded-xl">
                      + Adicionar
                    </Button>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Bolo Festivo Chantininho 2kg</div>
                      <div className="text-[11px] text-pink-700 font-semibold font-mono">R$ 145,00</div>
                      <Badge className="mt-1 bg-purple-100 text-purple-800 text-[9px] font-bold">🕒 Encomenda (24h de antecedência)</Badge>
                    </div>
                    <Button size="sm" className="h-8 px-3 bg-purple-600 text-white text-xs font-bold rounded-xl">
                      + Adicionar
                    </Button>
                  </div>
                </div>

                {/* Box de Checkout com Pix Automático */}
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" /> Pagamento Pix Instantâneo
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-black animate-pulse">
                      ✓ Baixa Automática
                    </Badge>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div className="text-xs">
                      <div className="text-slate-500 font-medium">Status do Pagamento:</div>
                      <div className="text-emerald-700 font-black text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aprovado pelo Mercado Pago
                      </div>
                    </div>
                    <span className="font-mono font-black text-slate-900 text-sm">R$ 213,00</span>
                  </div>

                  <div className="text-[10px] text-emerald-800 font-semibold text-center">
                    🚀 O pedido cai direto no seu painel com status <strong>"Pago (100%)"</strong> sem precisar pedir comprovante!
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("cardapio")}
                  variant="outline"
                  className="w-full text-xs font-bold border-pink-300 text-pink-800 hover:bg-pink-100/50 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Abrir Demonstração da Loja Virtual
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: GESTÃO DE ENCOMENDAS */}
        {/* ========================================================================= */}
        <section id="encomendas" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50 text-xs px-3.5 py-1 font-bold">
              GESTÃO DE ENCOMENDAS &amp; PRODUÇÃO
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              O Fim do Caos na sua Produção
            </h2>
            <p className="text-base text-slate-600 font-normal leading-relaxed">
              Diga adeus às agendas de papel. Uma tela inteligente desenhada para a rotina acelerada da confeitaria.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo: Mockup Visual dos Cards de Encomenda com Cores e Alertas */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-50 via-slate-50 to-white border-2 border-amber-200/80 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-amber-700" />
                    <span className="text-xs font-black text-slate-900">Painel "Minhas Encomendas"</span>
                  </div>
                  <Badge className="bg-amber-500 text-white text-[10px] font-bold">Hoje &amp; Próximos Dias</Badge>
                </div>

                {/* Card 1: Pago Integral + Entrega Hoje */}
                <div className="p-3.5 rounded-2xl bg-green-50 border-l-4 border-green-500 border border-green-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-rose-600 text-white text-[10px] font-black animate-pulse flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-300 fill-amber-300" /> ENTREGA HOJE
                    </Badge>
                    <Badge className="bg-green-200 text-green-900 text-[10px] font-bold">
                      Pago (Mercado Pago)
                    </Badge>
                  </div>
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Bolo de Cenoura c/ Brigadeiro + 12 Docinhos</div>
                      <div className="text-[11px] text-slate-600">Cliente: Amanda Ribeiro • 🕒 16:00</div>
                    </div>
                    <span className="font-mono font-black text-green-800 text-sm">R$ 95,00</span>
                  </div>
                </div>

                {/* Card 2: Sinal 50% Pago */}
                <div className="p-3.5 rounded-2xl bg-orange-50 border-l-4 border-orange-500 border border-orange-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">📅 Sábado (Amanhã) às 14:00</span>
                    <Badge className="bg-orange-200 text-orange-950 text-[10px] font-bold">
                      Sinal 50% Pago
                    </Badge>
                  </div>
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Bolo Red Velvet Casamento (3kg)</div>
                      <div className="text-[11px] text-slate-600">Cliente: Carlos &amp; Beatriz • Entrega Local</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-rose-600 text-sm">Falta: R$ 130,00</div>
                      <div className="text-[10px] text-slate-400 font-mono">Total: R$ 260,00</div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Pendente */}
                <div className="p-3.5 rounded-2xl bg-red-50 border-l-4 border-red-500 border border-red-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">📅 Domingo às 11:30</span>
                    <Badge className="bg-red-200 text-red-950 text-[10px] font-bold">
                      Pendente (0%)
                    </Badge>
                  </div>
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Cento de Salgados Finos + Torta Doce</div>
                      <div className="text-[11px] text-slate-600">Cliente: Renata Silva</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-rose-600 text-sm">Cobrar: R$ 180,00</div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("encomendas")}
                  variant="outline"
                  className="w-full text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Abrir Demonstração da Gestão de Encomendas
                </Button>
              </div>
            </div>

            {/* Lado Direito: Bullet Points da Gestão de Encomendas */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-amber-100 shadow-lg shadow-amber-500/5 space-y-4 hover:border-amber-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Calendário de Entregas
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Separe facilmente os pedidos para entrega imediata dos agendados para o futuro. Nunca mais se perca em conversas perdidas no WhatsApp.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-lg shadow-purple-500/5 space-y-4 hover:border-purple-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Status Financeiro Visual
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Identifique em um segundo quem pagou integral, quem deu sinal e quem está pendente. Cores vivas e fonte destacada para saber exatamente quanto resta a cobrar.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Destaque de Urgência Automático
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    O sistema alerta automaticamente com a tag <strong>"🔥 ENTREGA HOJE"</strong> e destaca pedidos prioritários para a cozinha produzir primeiro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: FICHA TÉCNICA E PRECIFICAÇÃO AUTOMÁTICA */}
        {/* ========================================================================= */}
        <section id="precificacao" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3.5 py-1 font-bold">
              FICHA TÉCNICA &amp; MARGEM DE LUCRO
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              O Leite Condensado subiu? O CaixaDoce atualiza tudo com 1 clique!
            </h2>
            <p className="text-base text-slate-600 font-normal leading-relaxed">
              Nunca mais pague para trabalhar. Sua margem de lucro sempre protegida contra a inflação.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo: Diferenciais da Precificação em Cascata */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border-2 border-purple-200 shadow-xl shadow-purple-600/10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    Atualização em Cascata
                    <Badge className="bg-purple-600 text-white text-[10px] font-bold">Exclusivo</Badge>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Mudou o preço do insumo? O sistema recalcula o custo e o preço de venda de <strong>TODOS</strong> os produtos que usam aquele ingrediente instantaneamente.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-purple-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Escaneamento de Notinhas com IA
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Tire foto do cupom fiscal do mercado. A Inteligência Artificial extrai os preços pagos e atualiza os custos dos seus insumos no sistema sem digitação.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-purple-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Margem de Lucro Blindada
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    Defina sua margem de lucro desejada (ex: 60%) e o sistema calcula o preço de venda sugerido para você nunca vender com prejuízo.
                  </p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Simulação Visual da Atualização em Cascata */}
            <div className="lg:col-span-6">
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-white border-2 border-purple-200 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-purple-200">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-purple-700" />
                    <span className="text-xs font-black text-slate-900">Simulação de Atualização em Cascata</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">1 Insumo ➔ 8 Receitas Atualizadas</Badge>
                </div>

                {/* Bloco 1: Alteração do Insumo */}
                <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    🛒 Insumo Base: Leite Condensado 395g
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="line-through text-slate-400 font-mono">R$ 5,90</span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-mono font-black text-purple-700 text-sm">R$ 7,40</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-900 text-[10px] font-bold">
                      Preço Novo da Notinha
                    </Badge>
                  </div>
                </div>

                {/* Bloco 2: Produtos Recalculados Automaticamente */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Produtos recalculados em tempo real:
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">🎂 Bolo Vulcão Brigadeiro (1.5kg)</div>
                      <div className="text-[10px] text-slate-500">Custo: R$ 18,20 ➔ <strong className="text-purple-700">R$ 21,20</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700 text-sm">R$ 65,00</div>
                      <div className="text-[9px] text-emerald-700 font-bold">Lucro 67%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">🍬 Cento de Brigadeiros Gourmet</div>
                      <div className="text-[10px] text-slate-500">Custo: R$ 34,50 ➔ <strong className="text-purple-700">R$ 40,50</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700 text-sm">R$ 130,00</div>
                      <div className="text-[9px] text-emerald-700 font-bold">Lucro 69%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">🍮 Copo da Felicidade Ninho (x4)</div>
                      <div className="text-[10px] text-slate-500">Custo: R$ 12,00 ➔ <strong className="text-purple-700">R$ 14,20</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700 text-sm">R$ 48,00</div>
                      <div className="text-[9px] text-emerald-700 font-bold">Lucro 70%</div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setModalDemo("notinha")}
                  variant="outline"
                  className="w-full text-xs font-bold border-purple-300 text-purple-800 hover:bg-purple-100/50 rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Demonstração da Leitura de Insumos por IA
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 5: DEMONSTRAÇÕES INTERATIVAS (MODAIS DE FERRAMENTAS) */}
        {/* ========================================================================= */}
        <section id="demonstracao" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3.5 py-1 font-bold">
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
        {/* SEÇÃO 6: PREÇOS & PLANOS */}
        {/* ========================================================================= */}
        <section id="precos" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3.5 py-1 font-bold">
              PREÇOS TRANSPARENTES
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Escolha o plano ideal para a sua confeitaria
            </h2>
          </div>

          {/* BANNER DESTACADO DE DESTAQUE — 7 DIAS GRÁTIS */}
          <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-900 via-pink-900 to-amber-800 border-2 border-amber-400/80 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                <Crown className="w-6 h-6 text-slate-950" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>7 dias grátis para testar</span>
                  <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[9px] px-2 py-0.2 rounded-full font-bold">Sem Cartão</span>
                </div>
                <div className="text-sm font-extrabold text-white">Teste grátis por 7 dias sem compromisso</div>
                <div className="text-xs text-purple-200">Acesso completo liberado em menos de 1 minuto!</div>
              </div>
            </div>
            <Button
              onClick={irParaLogin}
              className="w-full sm:w-auto font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 shrink-0 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Criar minha Loja Grátis agora</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
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
                    <span className="line-through">Loja Virtual com Pix Mercado Pago (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Escanear a Notinha com IA (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Ficha Técnica &amp; Precificação em Cascata (Bloqueado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-through">Calendário de Encomendas &amp; Gestão Visual (Bloqueado)</span>
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

            {/* PLANO PRO (MENSAL COMPLETO - R$ 10,90 / MÊS) */}
            <Card className="bg-white border-2 border-purple-600 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative space-y-6 shadow-xl shadow-purple-600/15 transform lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-slate-950" /> 7 DIAS GRÁTIS DE TESTE
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center justify-between">
                    <span>Plano Pro Completo</span>
                    <Badge className="bg-purple-100 text-purple-800 font-bold text-[10px]">Mais Vendido</Badge>
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">Automação total: Loja Virtual, Pix Automático, Encomendas e Precificação em Cascata.</p>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400 line-through font-mono">De R$ 19,90/mês</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-purple-700">
                      R$ 10,90
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">/ mês (com 7 dias grátis)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Loja Virtual personalizada com Pix Mercado Pago automático</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Gestão visual de Encomendas (Status financeiro &amp; Entrega Hoje)</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Ficha Técnica com Atualização de Preços em Cascata</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Escanear a Notinha com IA (Ilimitado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Controle financeiro, fluxo de caixa e lucro líquido</span>
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
                Testar 7 Dias Grátis Agora
              </Button>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 7: FAQ & BANNER FINAL */}
        {/* ========================================================================= */}
        <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs px-3.5 py-1 font-bold">
              TIRE SUAS DÚVIDAS
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona a Loja Virtual com Pix do Mercado Pago?",
                a: "Você cria sua vitrine com seus produtos, fotos e preços em minutos. Ao finalizar a compra, seu cliente paga via Pix do Mercado Pago e o CaixaDoce confirma o pagamento automaticamente, sem que você precise conferir comprovante.",
              },
              {
                q: "O que é a Atualização em Cascata na Ficha Técnica?",
                a: "Quando você altera o preço de um insumo (como o leite condensado ou chocolate) ou escaneia uma notinha com novo valor, o sistema recalcula instantaneamente o custo e a margem de lucro de todas as receitas que utilizam aquele ingrediente.",
              },
              {
                q: "Como funciona o teste grátis de 7 dias?",
                a: "Você cria sua conta gratuitamente e tem 7 dias completos para usar todas as funcionalidades Pro, incluindo a vitrine online, baixa automática de Pix, calendário de encomendas e precificação por IA, sem precisar cadastrar cartão de crédito.",
              },
              {
                q: "Como o sistema me ajuda a não perder prazos de entrega?",
                a: "A tela de Gestão de Encomendas organiza seus pedidos por data e horário, com alertas visuais '🔥 ENTREGA HOJE', separando pedidos imediatos dos futuros e indicando com clareza quem já pagou o sinal ou valor total.",
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
                Pronta para transformar sua confeitaria em um negócio profissional?
              </h2>
              <p className="text-sm sm:text-base text-purple-100 max-w-xl mx-auto font-medium">
                Junte-se a confeiteiros e doceiras que vendem no piloto automático, economizam tempo e nunca mais perdem dinheiro na precificação.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={irParaLogin}
                className="h-14 px-8 text-base font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl shadow-xl transition-all flex items-center gap-2 transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>Criar minha Loja Grátis agora</span>
                <ArrowRight className="w-5 h-5" />
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
              💡 <strong>Vendas pelo WhatsApp:</strong> Seu cliente faz o pedido no cardápio e você recebe a confirmação organizada diretamente no seu WhatsApp.
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
            <a href="#vitrine" className="hover:text-purple-700 transition-colors">
              Loja &amp; Pix
            </a>
            <a href="#encomendas" className="hover:text-purple-700 transition-colors">
              Encomendas
            </a>
            <a href="#precificacao" className="hover:text-purple-700 transition-colors">
              Precificação
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
