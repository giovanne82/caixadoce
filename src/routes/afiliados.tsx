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
  UserX,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Afiliado, LojaConvertida } from "@/lib/caixadoce-data";
import { useAuth } from "@/context/auth-context";

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
  const { user, authLoading } = useAuth();
  const [inputBusca, setInputBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [naoEParceiro, setNaoEParceiro] = useState(false);
  const [emailUsuarioLogado, setEmailUsuarioLogado] = useState<string | null>(null);

  const [afiliadoAtivo, setAfiliadoAtivo] = useState<Afiliado | null>(null);
  const [lojasConvertidas, setLojasConvertidas] = useState<LojaConvertida[]>([]);
  const [copiouCupom, setCopiouCupom] = useState(false);
  const [copiouLink, setCopiouLink] = useState(false);

  // Captura o e-mail do usuário logado via Supabase Auth e isola os dados por parceiro
  useEffect(() => {
    async function inicializarPainelAfiliado() {
      if (authLoading) return;
      setVerificandoSessao(true);

      let emailLogado: string | null = null;
      try {
        const { data: { user: spUser } } = await supabase.auth.getUser();
        emailLogado = spUser?.email || null;
        if (!emailLogado) {
          const { data: { session } } = await supabase.auth.getSession();
          emailLogado = session?.user?.email || null;
        }
      } catch (err) {
        console.error("[Auth Session Fetch Error]", err);
      }

      if (!emailLogado && user?.email) {
        emailLogado = user.email;
      }

      setEmailUsuarioLogado(emailLogado);

      const params = new URLSearchParams(window.location.search);
      const cupomParam = params.get("cupom") || params.get("c");
      const emailParam = params.get("email");
      const localCupom = localStorage.getItem("caixadoce_afiliado_cupom");

      const queryTerm = emailLogado || emailParam || cupomParam || localCupom;

      if (queryTerm) {
        const achou = await buscarAfiliado(queryTerm, false);
        if (!achou) {
          setNaoEParceiro(true);
        }
      } else {
        setNaoEParceiro(true);
      }
      setVerificandoSessao(false);
    }

    inicializarPainelAfiliado();
  }, [authLoading, user]);

  async function buscarAfiliado(termo: string, exibirToastSucesso = true): Promise<boolean> {
    const cleanTerm = termo.trim();
    if (!cleanTerm) {
      if (exibirToastSucesso) toast.error("Por favor, digite seu cupom exclusivo ou e-mail cadastrado.");
      return false;
    }

    setCarregando(true);
    try {
      // 1. Buscar afiliado na tabela 'afiliados' onde o email ou cupom bate com a busca
      let afiliadoEncontrado: Afiliado | null = null;

      const resApi = await fetch(`/api/afiliados?cupom=${encodeURIComponent(cleanTerm)}`).catch(() => null);
      if (resApi && resApi.ok) {
        const data = await resApi.json();
        if (data.sucesso && Array.isArray(data.afiliados) && data.afiliados.length > 0) {
          afiliadoEncontrado = data.afiliados[0];
        }
      }

      if (!afiliadoEncontrado) {
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
        if (exibirToastSucesso) {
          toast.error("Afiliado não encontrado para o e-mail/cupom fornecido.");
        }
        setAfiliadoAtivo(null);
        setLojasConvertidas([]);
        setNaoEParceiro(true);
        setCarregando(false);
        return false;
      }

      setAfiliadoAtivo(afiliadoEncontrado);
      setNaoEParceiro(false);
      localStorage.setItem("caixadoce_afiliado_cupom", afiliadoEncontrado.cupom_exclusivo);

      // 2. Query de contagem e lojas convertidas via API do Backend com chave Admin (Bypass de RLS)
      let lojasEncontradas: LojaConvertida[] = [];

      try {
        const statsRes = await fetch(
          `/api/afiliados/estatisticas?cupom=${encodeURIComponent(afiliadoEncontrado.cupom_exclusivo)}`
        );
        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          if (Array.isArray(statsData.lojas)) {
            lojasEncontradas = statsData.lojas;
          }
        }
      } catch (errStats) {
        console.warn("[Afiliados Stats Backend Call Error]", errStats);
      }

      // Fallback para Supabase Client-side caso o backend não responda
      if (lojasEncontradas.length === 0) {
        try {
          const { data: estData, error: estError } = await supabase
            .from("estabelecimentos")
            .select("id, nome, codigo, cupom_utilizado")
            .eq("cupom_utilizado", afiliadoEncontrado.cupom_exclusivo);

          if (estError) {
            console.log("[Estabelecimentos Frontend Query Error]", estError.message, estError.details);
          }

          if (estData) {
            lojasEncontradas = estData.map((est: any) => ({
              id: est.id,
              codigo: est.codigo || "CD-1000",
              nome: est.nome || "Estabelecimento",
              email: "",
              plano_status: "ativo",
              criado_em: "",
              cupom_utilizado: est.cupom_utilizado,
            }));
          }
        } catch (errEst: any) {
          console.log("[Estabelecimentos Catch Error]", errEst?.message, errEst?.details);
        }
      }

      setLojasConvertidas(lojasEncontradas);

      if (exibirToastSucesso) {
        toast.success(`Bem-vindo(a), ${afiliadoEncontrado.nome}! Painel do parceiro carregado.`);
      }
      return true;
    } catch (err: any) {
      console.error("[Afiliado Dashboard Error]", err);
      if (exibirToastSucesso) toast.error("Erro ao carregar dados do afiliado. Tente novamente.");
      return false;
    } finally {
      setCarregando(false);
    }
  }

  function sairPainel() {
    setAfiliadoAtivo(null);
    setLojasConvertidas([]);
    setNaoEParceiro(true);
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

  const comissaoTotal = lojasConvertidas.length * 18.91;
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
        {verificandoSessao ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <p className="text-sm font-semibold text-white">Verificando sessão de parceiro afiliado...</p>
          </div>
        ) : !afiliadoAtivo ? (
          /* Tela quando o usuário não é um parceiro cadastrado */
          <div className="max-w-md mx-auto my-12 animate-in fade-in duration-300">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
              <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
                <UserX className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white">Você ainda não é um parceiro afiliado</h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {emailUsuarioLogado ? (
                    <>
                      O e-mail <strong className="text-amber-400 font-mono">{emailUsuarioLogado}</strong> não foi encontrado na base de parceiros cadastrados.
                    </>
                  ) : (
                    <>Sua conta atualmente não possui um cadastro no Programa de Afiliados CaixaDoce.</>
                  )}
                </p>
              </div>

              {/* Form secundário para busca manual por cupom ou e-mail */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  buscarAfiliado(inputBusca, true);
                }}
                className="space-y-3 pt-2 text-left"
              >
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Já tem um cupom? Digite para acessar:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputBusca}
                    onChange={(e) => setInputBusca(e.target.value)}
                    placeholder="Ex: SEUCUPOMVIP ou outro@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {carregando ? (
                    <span>Buscando...</span>
                  ) : (
                    <>
                      <span>Acessar com Cupom</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-slate-700/60 pt-4 space-y-2 text-xs text-slate-400">
                <p>Ganhe <strong className="text-amber-400 font-bold">R$ 18,91</strong> em cada primeira mensalidade convertida por lojistas indicados!</p>
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
                    {lojasConvertidas.length} x R$ 18,91 (já deduzida a taxa de 5% do Mercado Pago)
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
                  <h2 className="text-lg font-bold text-white">Meus parceiros indicados</h2>
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
                    Compartilhe seu cupom exclusivo <strong className="text-amber-400">{afiliadoAtivo.cupom_exclusivo}</strong> com confeiteiras para acumular comissões de R$ 18,91 por loja!
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
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/60 bg-slate-900/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-6">Loja / Parceiro</th>
                        <th className="py-3 px-6">Data de Entrada</th>
                        <th className="py-3 px-6 text-center">Status</th>
                        <th className="py-3 px-6 text-right">Comissão Estimada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-sm">
                      {lojasConvertidas.map((loja, index) => (
                        <tr key={loja.id || index} className="hover:bg-slate-700/20 transition-colors">
                          <td className="py-4 px-6 font-semibold text-white">
                            <span className="block">{loja.nome || "Estabelecimento Parceiro"}</span>
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
                            R$ 18,91
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
