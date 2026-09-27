import { Link, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  CalendarDays,
  Calculator,
  Star,
  Plus,
  Check,
  Zap,
} from "lucide-react";

export function LandingPageContent() {
  const navigate = useNavigate();

  const irParaLogin = () => {
    navigate({ to: "/login", search: {} as any });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Background Decorativo Minimalista */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-pink-200/25 rounded-full blur-3xl" />
      </div>

      {/* ========================================================================= */}
      {/* HEADER MINIMALISTA */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/blog/"
              className="text-xs sm:text-sm font-bold text-slate-600 hover:text-purple-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-purple-50"
            >
              Blog &amp; Receitas
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={irParaLogin}
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-purple-700"
            >
              Entrar
            </Button>

            <Button
              onClick={irParaLogin}
              size="sm"
              className="font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-md px-4 py-2 flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Criar Minha Loja</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (DESIGN SPLIT 50/50) */}
      {/* ========================================================================= */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* LADO ESQUERDO: COPY E AÇÃO */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-800 px-4 py-1.5 text-xs font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>O Aplicativo Perfeito para Confeiteiras</span>
              </div>

              {/* Título Principal (H1) */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
                A sua confeitaria merece uma{" "}
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                  loja virtual de verdade.
                </span>
              </h1>

              {/* Subtítulo focado na dor */}
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Organize seu cardápio, receba pedidos automaticamente e pare de perder vendas no meio das mensagens do WhatsApp. Tudo em um só link.
              </p>

              {/* Botão de Ação Principal (CTA) */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  onClick={irParaLogin}
                  size="lg"
                  className="w-full sm:w-auto font-black text-sm bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl shadow-xl hover:shadow-2xl px-8 py-6 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Criar Minha Loja Grátis</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Micro-benefícios / Prova social */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" /> Sem taxa por pedido
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" /> 7 dias grátis para testar
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" /> Pronto em 2 minutos
                </span>
              </div>
            </div>

            {/* LADO DIREITO: VISUAL / MOCKUP DE CELULAR */}
            <div className="relative flex items-center justify-center lg:justify-end">
              {/* Glow decorativo de fundo */}
              <div className="absolute w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-tr from-purple-400/30 to-pink-400/30 rounded-full blur-3xl -z-10" />

              {/* Moldura do Celular */}
              <div className="relative w-full max-w-[320px] sm:max-w-[350px] bg-slate-950 p-3 rounded-[3rem] shadow-2xl ring-1 ring-slate-900/10 border-4 border-slate-800/80">
                {/* Speaker e Câmera (Notch) */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-3 h-3 bg-slate-950 rounded-full mr-2" />
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Tela do Aplicativo / Loja Virtual */}
                <div className="bg-[#FDFBF7] rounded-[2.3rem] overflow-hidden text-slate-900 pt-8 pb-4 flex flex-col h-[580px] select-none shadow-inner border border-purple-100">
                  {/* Banner & Header da Loja */}
                  <div className="relative bg-gradient-to-r from-purple-600 to-pink-500 p-4 text-white text-center pb-6">
                    <div className="w-14 h-14 rounded-full bg-white p-1 shadow-md mx-auto mb-2 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&q=80"
                        alt="Logo Loja"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <h3 className="font-extrabold text-sm leading-tight">Doce Encanto Confeitaria</h3>
                    <p className="text-[10px] text-purple-100 mt-0.5">Bolos artesanais, bentôs e docinhos gourmet</p>
                    
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="bg-white/20 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-300 fill-amber-300" /> 4.9 (142)
                      </span>
                      <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Aberto
                      </span>
                    </div>
                  </div>

                  {/* Categorias Pills */}
                  <div className="px-3 py-2.5 flex gap-1.5 overflow-x-hidden border-b border-purple-100 bg-white">
                    <span className="bg-purple-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs">
                      🔥 Destaques
                    </span>
                    <span className="bg-purple-50 text-purple-800 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                      Bolos
                    </span>
                    <span className="bg-purple-50 text-purple-800 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                      Docinhos
                    </span>
                  </div>

                  {/* Lista de Produtos Mockup */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                    {/* Item 1 */}
                    <div className="bg-white rounded-2xl p-2.5 border border-purple-100 shadow-2xs flex items-center justify-between gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=120&q=80"
                        alt="Bentô Cake"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">Mini Bentô Cake Meme</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">Massa fofinha com frase personalizada</p>
                        <span className="font-black text-xs text-purple-700 mt-0.5 block">R$ 38,00</span>
                      </div>
                      <button className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-purple-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-white rounded-2xl p-2.5 border border-purple-100 shadow-2xs flex items-center justify-between gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=120&q=80"
                        alt="Docinhos Gourmet"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">Cento Brigadeiros Gourmet</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">Ninho com Nutella, Belga e Pistache</p>
                        <span className="font-black text-xs text-purple-700 mt-0.5 block">R$ 120,00</span>
                      </div>
                      <button className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-purple-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item 3 */}
                    <div className="bg-white rounded-2xl p-2.5 border border-purple-100 shadow-2xs flex items-center justify-between gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=120&q=80"
                        alt="Fatia Suprema"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">Fatia Suprema Red Velvet</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">Com recheio suave de cream cheese</p>
                        <span className="font-black text-xs text-purple-700 mt-0.5 block">R$ 18,50</span>
                      </div>
                      <button className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-purple-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra Flutuante de Carrinho na Loja */}
                  <div className="p-3 pt-0">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl py-2.5 px-3.5 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">
                          2
                        </div>
                        <span className="text-xs font-extrabold">Ver Sacola</span>
                      </div>
                      <span className="font-black text-xs">R$ 56,50 →</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Flutuantes Interativas ao redor do mockup */}
              <div className="absolute -top-4 -left-6 sm:-left-10 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-purple-100 shadow-xl hidden sm:flex items-center gap-2.5 animate-bounce [animation-duration:4s]">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900">Novo Pedido Recebido!</div>
                  <div className="text-[10px] text-slate-500">Bolo Bentô • R$ 38,00</div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 sm:-right-8 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-purple-100 shadow-xl hidden sm:flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900">Pix Confirmado</div>
                  <div className="text-[10px] text-emerald-600 font-bold">0% de taxa sobre vendas</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SEÇÃO SECUNDÁRIA: 3 BENEFÍCIOS PRINCIPAIS (MINIMALISTA) */}
        {/* ========================================================================= */}
        <section className="bg-white border-y border-purple-100/80 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
                Tudo o que você precisa, sem complicação.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Desenvolvido especialmente para confeiteiras que querem economizar tempo e faturar mais.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: Cardápio Digital */}
              <Card className="rounded-3xl border border-purple-100/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 bg-[#FDFBF7]/50 flex flex-col justify-between p-7 sm:p-8">
                <CardContent className="p-0 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-950">Cardápio Digital</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Link único com suas fotos e preços. Seus clientes escolhem e compram sozinhos 24h por dia direto no link da sua bio do Instagram ou WhatsApp.
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Gestão de Pedidos */}
              <Card className="rounded-3xl border border-purple-100/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 bg-[#FDFBF7]/50 flex flex-col justify-between p-7 sm:p-8">
                <CardContent className="p-0 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-xs">
                    <CalendarDays className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-950">Gestão de Pedidos</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Receba tudo organizado, sem confusão. Controle datas de entrega, horários agendados e status de produção em um calendário visual inteligente.
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Precificação Integrada */}
              <Card className="rounded-3xl border border-purple-100/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 bg-[#FDFBF7]/50 flex flex-col justify-between p-7 sm:p-8">
                <CardContent className="p-0 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                    <Calculator className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-950">Precificação Integrada</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Saiba exatamente o seu lucro. Ficha técnica automática de insumos e custo real de cada fornada para você nunca mais pagar para trabalhar.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. CTA FINAL DIRETO AO PONTO */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-purple-900 via-purple-950 to-slate-950 rounded-3xl p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden">
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Pronta para profissionalizar as vendas da sua confeitaria?
              </h2>
              <p className="text-sm sm:text-base text-purple-200 leading-relaxed font-normal">
                Comece agora mesmo com 7 dias grátis. Não pedimos cartão de crédito e leva menos de 2 minutos para configurar seu cardápio.
              </p>

              <div className="pt-2">
                <Button
                  onClick={irParaLogin}
                  size="lg"
                  className="font-black text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-2xl shadow-xl px-8 py-6 flex items-center justify-center gap-2 mx-auto transition-all transform hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Criar Minha Loja Grátis</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER MINIMALISTA */}
      {/* ========================================================================= */}
      <footer className="border-t border-purple-100 bg-white py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <span>&copy; {new Date().getFullYear()} CaixaDoce. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <Link to="/" className="hover:text-purple-700 transition-colors">
              Início
            </Link>
            <Link to="/blog/" className="hover:text-purple-700 transition-colors">
              Blog &amp; Receitas
            </Link>
            <Link to="/afiliados" className="hover:text-purple-700 transition-colors">
              Programa de Afiliados
            </Link>
            <Link to="/privacidade" className="hover:text-purple-700 transition-colors">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-purple-700 transition-colors">
              Termos de Uso
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={irParaLogin}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 p-0 h-auto"
            >
              Entrar
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
