import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Ticket,
  Store,
  DollarSign,
  Copy,
  Check,
  Share2,
  Search,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Cake,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Afiliado, LojaConvertida } from "@/lib/caixadoce-data";

export const Route = createFileRoute("/afiliados")({
  head: () => ({
    meta: [
      { title: "Painel do Afiliado — CaixaDoce" },
      { name: "description", content: "Acompanhe suas indicações e comissões do Programa de Afiliados CaixaDoce." },
    ],
  }),
  component: AfiliadosComponent,
});

function AfiliadosComponent() {
  const [inputBusca, setInputBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [afiliadoAtivo, setAfiliadoAtivo] = useState<Afiliado | null>(null);
  const [lojasConvertidas, setLojasConvertidas] = useState<LojaConvertida[]>([]);
  const [copiouCupom, setCopiouCupom] = useState(false);
  const [copiouLink, setCopiouLink] = useState(false);

  // Carregar parceiro ao montar caso exista na URL (?cupom=... ou ?email=...) ou localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cupomParam = params.get("cupom") || params.get("c");
    const emailParam = params.get("email");
    const localCupom = localStorage.getItem("caixadoce_afiliado_cupom");

    const query = cupomParam || emailParam || localCupom;
    if (query) {
      buscarAfiliado(query, false);
    }
  }, []);

  async function buscarAfiliado(termo: string, exibirToastSucesso = true) {
    const cleanTerm = termo.trim();
    if (!cleanTerm) {
      toast.error("Por favor, digite seu cupom exclusivo ou e-mail cadastrado.");
      return;
    }

    setCarregando(true);
    try {
      // 1. Buscar afiliado via API server ou Supabase client direct
      let afiliadoEncontrado: Afiliado | null = null;

      const resApi = await fetch(`/api/afiliados?cupom=${encodeURIComponent(cleanTerm)}`).catch(() => null);
      if (resApi && resApi.ok) {
        const data = await resApi.json();
        if (data.sucesso && Array.isArray(data.afiliados) && data.afiliados.length > 0) {
          afiliadoEncontrado = data.afiliados[0];
        }
      }

      if (!afiliadoEncontrado) {
        // Tentar busca por e-mail
        const resEmail = await fetch(`/api/afiliados?email=${encodeURIComponent(cleanTerm)}`).catch(() => null);
        if (resEmail && resEmail.ok) {
          const dataEmail = await resEmail.json();
          if (dataEmail.sucesso && Array.isArray(dataEmail.afiliados) && dataEmail.afiliados.length > 0) {
            afiliadoEncontrado = dataEmail.afiliados[0];
          }
        }
      }

      // Direct Supabase Fallback
      if (!afiliadoEncontrado) {
        const { data: dbData } = await supabase
          .from("afiliados")
          .select("*")
          .or(`cupom_exclusivo.ilike.${cleanTerm},email.ilike.${cleanTerm}`)
          .limit(1);

        if (dbData && dbData.length > 0) {
          afiliadoEncontrado = dbData[0] as Afiliado;
        }
      }

      if (!afiliadoEncontrado) {
        toast.error("Afiliado não encontrado. Verifique o cupom/e-mail digitado ou entre em contato com o suporte.");
        setCarregando(false);
        return;
      }

      setAfiliadoAtivo(afiliadoEncontrado);
      localStorage.setItem("caixadoce_afiliado_cupom", afiliadoEncontrado.cupom_exclusivo);

      // 2. Buscar lojas convertidas
      let lojasEncontradas: LojaConvertida[] = [];

      const { data: estData } = await supabase
        .from("estabelecimentos")
        .select("codigo, nome, email, plano_status, status_assinatura, created_at, cupom_utilizado, afiliado_id")
        .or(`afiliado_id.eq.${afiliadoEncontrado.id},cupom_utilizado.ilike.${afiliadoEncontrado.cupom_exclusivo}`);

      if (estData) {
        lojasEncontradas = estData.map((est: any) => ({
          codigo: est.codigo || "CD-1000",
          nome: est.nome || "Estabelecimento",
          email: est.email || "",
          plano_status: est.plano_status || est.status_assinatura || "ativo",
          criado_em: est.created_at,
          cupom_utilizado: est.cupom_utilizado,
        }));
      }

      setLojasConvertidas(lojasEncontradas);

      if (exibirToastSucesso) {
        toast.success(`Bem-vindo(a), ${afiliadoEncontrado.nome}! Painel carregado com sucesso.`);
      }
    } catch (err: any) {
      console.error("[Afiliado Dashboard Error]", err);
      toast.error("Erro ao carregar dados do afiliado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function sairPainel() {
    setAfiliadoAtivo(null);
    setLojasConvertidas([]);
    localStorage.removeItem("caixadoce_afiliado_cupom");
    toast.info("Você saiu do painel do afiliado.");
  }

  function copiarTexto(texto: string, tipo: "cupom" | "link") {
    navigator.clipboard.writeText(texto);
    if (tipo === "cupom") {
      setCopiouCupom(true);
      setTimeout(() => setCopiouCupom(false), 2500);
      toast.success(`Cupom "${texto}" copiado para a área de transferência!`);
    } else {
      setCopiouLink(true);
      setTimeout(() => setCopiouLink(false), 2500);
      toast.success("Link de indicação copiado com sucesso!");
    }
  }

  const comissaoTotal = lojasConvertidas.length * 10.9;
  const linkIndicacao = afiliadoAtivo ? `https://www.caixadoce.com.br/?cupom=${afiliadoAtivo.cupom_exclusivo}` : "";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header do Afiliado */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 py-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CaixaDoce</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Parceiros
                </span>
              </div>
              <p className="text-xs text-slate-400">Programa Oficial de Afiliados</p>
            </div>
          </div>

          {afiliadoAtivo && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-white">{afiliadoAtivo.nome}</p>
                <p className="text-xs text-slate-400">{afiliadoAtivo.email}</p>
              </div>
              <button
                onClick={sairPainel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {!afiliadoAtivo ? (
          /* Tela de Login / Busca do Parceiro */
          <div className="max-w-md mx-auto my-12">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-white">Acessar Painel do Afiliado</h1>
                <p className="text-sm text-slate-400">
                  Informe seu cupom exclusivo ou e-mail cadastrado para visualizar suas indicações e saldo de comissões.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  buscarAfiliado(inputBusca);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Cupom Exclusivo ou E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputBusca}
                      onChange={(e) => setInputBusca(e.target.value)}
                      placeholder="Ex: CUPOMVIP ou seu@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {carregando ? (
                    <span>Buscando...</span>
                  ) : (
                    <>
                      <span>Entrar no Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-slate-700/60 pt-4 space-y-2 text-center text-xs text-slate-400">
                <p>Ganhe <strong className="text-amber-400">R$ 10,90</strong> em cada primeira mensalidade convertida por lojistas indicados!</p>
                <p className="text-slate-500">Dúvidas? Entre em contato com nossa equipe de suporte.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard do Afiliado Conectado */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Banner de Boas-Vindas */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Parceiro {afiliadoAtivo.nome}</h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Afiliado Ativo
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Divulgue seu cupom exclusivo para confeiteiras e receba comissões automáticas.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    Chave PIX: <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-mono">{afiliadoAtivo.chave_pix}</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Os 3 Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CARD 1: Cupom Exclusivo */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cupom Exclusivo</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 text-center my-1">
                    <span className="text-2xl font-black tracking-widest text-amber-400 font-mono uppercase">
                      {afiliadoAtivo.cupom_exclusivo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Concede +30 dias grátis para novas confeiteiras!
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => copiarTexto(afiliadoAtivo.cupom_exclusivo, "cupom")}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-amber-500/30"
                  >
                    {copiouCupom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiouCupom ? "Cupom Copiado!" : "Copiar Apenas o Cupom"}
                  </button>

                  <button
                    onClick={() => copiarTexto(linkIndicacao, "link")}
                    className="w-full py-2 px-3 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-600"
                  >
                    {copiouLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiouLink ? "Link Copiado!" : "Copiar Link de Indicação"}
                  </button>
                </div>
              </div>

              {/* CARD 2: Lojas Convertidas */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lojas Convertidas</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Store className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-4xl font-extrabold text-white tracking-tight">
                    {lojasConvertidas.length}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {lojasConvertidas.length === 1 ? "1 Loja cadastrada com seu cupom" : `${lojasConvertidas.length} Lojas cadastradas com seu cupom`}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Taxa de Ativação:</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      100% Ativas
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Comissão Estimada */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Comissão Estimada</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-4xl font-extrabold text-emerald-400 tracking-tight">
                    R$ {comissaoTotal.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {lojasConvertidas.length} × R$ 10,90 por primeira mensalidade
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Repasse via PIX:</span>
                    <span className="font-semibold text-slate-200">Mensal / Sob Consulta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Lojas Indicadas */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-700/80 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Minhas Lojas Indicadas</h2>
                  <p className="text-xs text-slate-400">Histórico de estabelecimentos convertidos através da sua parceria.</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">
                  Total: {lojasConvertidas.length}
                </span>
              </div>

              {lojasConvertidas.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="inline-flex p-4 rounded-full bg-slate-700/40 text-slate-400 mb-1">
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Nenhuma loja cadastrada ainda</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Compartilhe seu cupom exclusivo <strong className="text-amber-400">{afiliadoAtivo.cupom_exclusivo}</strong> com confeiteiras para acumular comissões de R$ 10,90 por loja!
                  </p>
                  <button
                    onClick={() => copiarTexto(linkIndicacao, "link")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors mt-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Copiar Link de Divulgação
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-xs font-semibold uppercase text-slate-400 border-b border-slate-700/60">
                      <tr>
                        <th className="py-3.5 px-6">Código Loja</th>
                        <th className="py-3.5 px-6">Estabelecimento</th>
                        <th className="py-3.5 px-6">Data de Cadastro</th>
                        <th className="py-3.5 px-6 text-center">Status</th>
                        <th className="py-3.5 px-6 text-right">Sua Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {lojasConvertidas.map((loja, idx) => (
                        <tr key={loja.codigo || idx} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-amber-400">
                            {loja.codigo}
                          </td>
                          <td className="py-4 px-6 font-medium text-white">
                            {loja.nome}
                            {loja.email && <span className="block text-xs text-slate-400 font-normal">{loja.email}</span>}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-400">
                            {loja.criado_em ? new Date(loja.criado_em).toLocaleDateString("pt-BR") : "Recentemente"}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" />
                              Convertida
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-400">
                            R$ 10,90
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer do Afiliado */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} CaixaDoce. Sistema de Afiliados e Gestão para Confeitarias.</p>
      </footer>
    </div>
  );
}
