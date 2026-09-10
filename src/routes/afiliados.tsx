import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Ticket,
  Store,
  DollarSign,
  Copy,
  Check,
  Share2,
  LogOut,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Cake,
  UserX,
  RefreshCw,
  Clock,
  CheckCircle2,
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

function formatarDataHoraBR(isoString?: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

function formatarDataBR(isoString?: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function AfiliadosComponent() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [naoEParceiro, setNaoEParceiro] = useState(false);
  const [emailUsuarioLogado, setEmailUsuarioLogado] = useState<string | null>(null);

  const [afiliadoAtivo, setAfiliadoAtivo] = useState<Afiliado | null>(null);
  const [lojasConvertidas, setLojasConvertidas] = useState<LojaConvertida[]>([]);
  const [copiouCupom, setCopiouCupom] = useState(false);
  const [copiouLink, setCopiouLink] = useState(false);

  // EXIGÊNCIA ESTRITA 1: Proteção da rota por Supabase Auth.
  // Se não houver usuário logado (session), redireciona imediatamente para /login.
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

      // Redireciona usuários não autenticados para a página de login
      if (!emailLogado) {
        toast.error("Acesso restrito: Por favor, faça login para acessar o painel do afiliado.");
        setVerificandoSessao(false);
        navigate({ to: "/login" });
        return;
      }

      setEmailUsuarioLogado(emailLogado);

      // Carrega os dados do afiliado ESTRITAMENTE pelo e-mail autenticado
      const achou = await carregarDadosAfiliadoPorEmail(emailLogado);
      if (!achou) {
        setNaoEParceiro(true);
      }
      setVerificandoSessao(false);
    }

    inicializarPainelAfiliado();
  }, [authLoading, user, navigate]);

  async function carregarDadosAfiliadoPorEmail(userEmail: string): Promise<boolean> {
    const cleanEmail = userEmail.trim().toLowerCase();
    setCarregando(true);
    try {
      let afiliadoEncontrado: Afiliado | null = null;

      // 1. Query no backend pelo e-mail logado
      const resEmail = await fetch(`/api/afiliados?email=${encodeURIComponent(cleanEmail)}`).catch(() => null);
      if (resEmail && resEmail.ok) {
        const dataEmail = await resEmail.json();
        if (dataEmail.sucesso && Array.isArray(dataEmail.afiliados) && dataEmail.afiliados.length > 0) {
          afiliadoEncontrado = dataEmail.afiliados[0];
        }
      }

      // 2. Direct Supabase Fallback pelo e-mail logado
      if (!afiliadoEncontrado) {
        const { data: dbData } = await supabase
          .from("afiliados")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (dbData) {
          afiliadoEncontrado = dbData as Afiliado;
        }
      }

      if (!afiliadoEncontrado) {
        setAfiliadoAtivo(null);
        setLojasConvertidas([]);
        setNaoEParceiro(true);
        setCarregando(false);
        return false;
      }

      setAfiliadoAtivo(afiliadoEncontrado);
      setNaoEParceiro(false);

      // 3. Query de contagem e lojas convertidas pelo cupom_exclusivo do afiliado
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

      // Fallback para Supabase Client-side
      if (lojasEncontradas.length === 0) {
        try {
          const { data: estData, error: estError } = await supabase
            .from("estabelecimentos")
            .select("id, nome, codigo, created_at, cupom_utilizado, status_repasse, data_repasse")
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
              criado_em: est.created_at || "",
              created_at: est.created_at || "",
              cupom_utilizado: est.cupom_utilizado,
              status_repasse: est.status_repasse || "pendente",
              data_repasse: est.data_repasse || null,
            }));
          }
        } catch (errEst: any) {
          console.log("[Estabelecimentos Catch Error]", errEst?.message, errEst?.details);
        }
      }

      setLojasConvertidas(lojasEncontradas);
      return true;
    } catch (err: any) {
      console.error("[Afiliado Dashboard Error]", err);
      return false;
    } finally {
      setCarregando(false);
    }
  }

  function sairPainel() {
    setAfiliadoAtivo(null);
    setLojasConvertidas([]);
    setNaoEParceiro(true);
    supabase.auth.signOut().catch(() => {});
    toast.info("Você saiu do painel do afiliado.");
    navigate({ to: "/login" });
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
            <p className="text-sm font-semibold text-white">Autenticando sessão do parceiro afiliado...</p>
          </div>
        ) : !afiliadoAtivo ? (
          /* Tela quando o usuário logado não é um parceiro cadastrado */
          <div className="max-w-md mx-auto my-12 animate-in fade-in duration-300">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
              <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
                <UserX className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white">Você ainda não é um parceiro afiliado</h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O e-mail <strong className="text-amber-400 font-mono">{emailUsuarioLogado}</strong> está autenticado, mas não está cadastrado no Programa de Afiliados CaixaDoce.
                </p>
              </div>

              <div className="border-t border-slate-700/60 pt-4 space-y-3 text-xs text-slate-400">
                <p>Entre em contato com o administrador do CaixaDoce para solicitar seu cadastro e cupom exclusivo.</p>
                <button
                  onClick={() => navigate({ to: "/" })}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-all"
                >
                  Voltar para a Página Inicial
                </button>
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
                        <th className="py-3 px-6 text-center">Status do Repasse</th>
                        <th className="py-3 px-6 text-right">Comissão Estimada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-sm">
                      {lojasConvertidas.map((loja, index) => {
                        const dataEntradaFormatada = formatarDataHoraBR(loja.created_at || loja.criado_em);
                        const isPago = loja.status_repasse === "pago";

                        return (
                          <tr key={loja.id || index} className="hover:bg-slate-700/20 transition-colors">
                            <td className="py-4 px-6 font-semibold text-white">
                              <span className="block">{loja.nome || "Estabelecimento Parceiro"}</span>
                              {loja.email && <span className="block text-xs text-slate-400 font-normal">{loja.email}</span>}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                              {dataEntradaFormatada}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {isPago ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Pago em {formatarDataBR(loja.data_repasse)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-emerald-400">
                              R$ 18,91
                            </td>
                          </tr>
                        );
                      })}
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
