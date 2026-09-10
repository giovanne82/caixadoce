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
  FileText,
  Repeat,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Afiliado, HistoricoComissao, LojaConvertida } from "@/lib/caixadoce-data";
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
  const [historicoComissoes, setHistoricoComissoes] = useState<HistoricoComissao[]>([]);
  const [lojasConvertidas, setLojasConvertidas] = useState<LojaConvertida[]>([]);

  const [totalAdesoes, setTotalAdesoes] = useState(0);
  const [rendimentoAdesao, setRendimentoAdesao] = useState(0);
  const [totalRecorrentes, setTotalRecorrentes] = useState(0);
  const [rendimentoRecorrente, setRendimentoRecorrente] = useState(0);
  const [rendimentoTotal, setRendimentoTotal] = useState(0);

  const [aceitandoTermos, setAceitandoTermos] = useState(false);
  const [copiouCupom, setCopiouCupom] = useState(false);
  const [copiouLink, setCopiouLink] = useState(false);

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

      if (!emailLogado) {
        toast.error("Acesso restrito: Por favor, faça login para acessar o painel do afiliado.");
        setVerificandoSessao(false);
        navigate({ to: "/login" });
        return;
      }

      setEmailUsuarioLogado(emailLogado);

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

      // 1. Backend fetch
      const resEmail = await fetch(`/api/afiliados?email=${encodeURIComponent(cleanEmail)}`).catch(() => null);
      if (resEmail && resEmail.ok) {
        const dataEmail = await resEmail.json();
        if (dataEmail.sucesso && Array.isArray(dataEmail.afiliados) && dataEmail.afiliados.length > 0) {
          afiliadoEncontrado = dataEmail.afiliados[0];
        }
      }

      // 2. Direct Supabase Fallback
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
        setHistoricoComissoes([]);
        setNaoEParceiro(true);
        setCarregando(false);
        return false;
      }

      setAfiliadoAtivo(afiliadoEncontrado);
      setNaoEParceiro(false);

      // 3. Stats & Extrato Fetch
      try {
        const statsRes = await fetch(
          `/api/afiliados/estatisticas?cupom=${encodeURIComponent(afiliadoEncontrado.cupom_exclusivo)}`
        );
        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.afiliado) {
            setAfiliadoAtivo((prev) => ({ ...prev, ...statsData.afiliado }));
          }
          if (Array.isArray(statsData.lojas)) {
            setLojasConvertidas(statsData.lojas);
          }
          if (Array.isArray(statsData.historico)) {
            setHistoricoComissoes(statsData.historico);
          }
          setTotalAdesoes(statsData.total_adesoes || 0);
          setRendimentoAdesao(statsData.rendimento_adesao || 0);
          setTotalRecorrentes(statsData.total_recorrentes || 0);
          setRendimentoRecorrente(statsData.rendimento_recorrente || 0);
          setRendimentoTotal(statsData.rendimento_total || 0);
        }
      } catch (errStats) {
        console.warn("[Afiliados Stats Backend Call Error]", errStats);
      }

      return true;
    } catch (err: any) {
      console.error("[Afiliado Dashboard Error]", err);
      return false;
    } finally {
      setCarregando(false);
    }
  }

  async function aceitarTermos() {
    if (!afiliadoAtivo) return;
    setAceitandoTermos(true);
    try {
      const nowIso = new Date().toISOString();
      let ok = false;

      // 1. API route call
      const res = await fetch("/api/afiliados/aceitar-termos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: afiliadoAtivo.email,
          cupom: afiliadoAtivo.cupom_exclusivo,
          id: afiliadoAtivo.id,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        ok = true;
      }

      // 2. Supabase direct fallback
      if (!ok) {
        let q = supabase
          .from("afiliados")
          .update({ termos_aceitos: true, data_aceite: nowIso });

        if (afiliadoAtivo.id) {
          q = q.eq("id", afiliadoAtivo.id);
        } else {
          q = q.ilike("cupom_exclusivo", afiliadoAtivo.cupom_exclusivo);
        }
        await q;
      }

      setAfiliadoAtivo({
        ...afiliadoAtivo,
        termos_aceitos: true,
        data_aceite: nowIso,
      });

      toast.success("Termos do Programa de Parceiros aceitos com sucesso!");
    } catch (err: any) {
      console.error("[Aceitar Termos Error]", err);
      toast.error("Falha ao registrar aceite dos termos. Tente novamente.");
    } finally {
      setAceitandoTermos(false);
    }
  }

  function sairPainel() {
    setAfiliadoAtivo(null);
    setLojasConvertidas([]);
    setHistoricoComissoes([]);
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

  const linkIndicacao = afiliadoAtivo ? `https://www.caixadoce.com.br/?cupom=${afiliadoAtivo.cupom_exclusivo}` : "";

  const precisaAceitarTermos = Boolean(afiliadoAtivo && !afiliadoAtivo.termos_aceitos);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative">
      {/* MODAL DE BLOQUEIO INCONTORNÁVEL — ACEITE DE TERMOS */}
      {precisaAceitarTermos && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">Termos do Programa de Parceiros</h2>
                <p className="text-xs text-amber-400 font-medium">Aceite obrigatório para liberar o painel de comissões</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300 max-h-60 overflow-y-auto pr-2 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p className="font-bold text-white text-sm">Contrato de Adesão & Regras do Programa CaixaDoce:</p>
              
              <ul className="space-y-2 list-disc list-inside text-slate-300">
                <li>
                  <strong className="text-white">Comissão de Adesão Inicial:</strong> Você receberá <strong className="text-emerald-400">R$ 18,91</strong> por cada nova loja que se cadastrar com seu cupom exclusivo e realizar o primeiro pagamento ativando o plano PRO.
                </li>
                <li>
                  <strong className="text-white">Comissão Recorrente Mensal:</strong> A partir da segunda mensalidade da loja indicada, você receberá <strong className="text-emerald-400">10% de comissão recorrente</strong> sobre todos os pagamentos mensais ativos daquela loja.
                </li>
                <li>
                  <strong className="text-white">Pagamentos & Repasses:</strong> Os pagamentos das comissões acumuladas são consolidados periodicamente e transferidos via PIX para a chave cadastrada em seu perfil.
                </li>
                <li>
                  <strong className="text-white">Política Antifraude & Auto-indicação:</strong> É expressamente proibida a auto-indicação (utilização do próprio cupom em estabelecimentos próprios ou sob o mesmo CPF/CNPJ) para fins de simulação de comissão.
                </li>
                <li>
                  <strong className="text-white">Alteração de Regras:</strong> O CaixaDoce reserva-se o direito de atualizar as diretrizes do programa mediante notificação prévia aos parceiros cadastrados.
                </li>
              </ul>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={aceitarTermos}
                disabled={aceitandoTermos}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aceitandoTermos ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Registrando aceite...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Li e Aceito os Termos de Parceiro
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Ao clicar em &quot;Li e Aceito os Termos de Parceiro&quot;, você concorda integralmente com as regras descritas acima.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  Divulgue seu cupom exclusivo para confeiteiras e receba adesões + 10% de comissões recorrentes.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    Chave PIX: <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-mono">{afiliadoAtivo.chave_pix}</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Os 4 Cards de Métricas Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CARD 1: Cupom Exclusivo */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cupom Exclusivo</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2.5 text-center my-1">
                    <span className="text-xl font-black tracking-widest text-amber-400 font-mono uppercase">
                      {afiliadoAtivo.cupom_exclusivo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 text-center mt-1">
                    Concede +30 dias grátis para confeiteiras!
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => copiarTexto(afiliadoAtivo.cupom_exclusivo, "cupom")}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-amber-500/30"
                  >
                    {copiouCupom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiouCupom ? "Cupom Copiado!" : "Copiar Cupom"}
                  </button>

                  <button
                    onClick={() => copiarTexto(linkIndicacao, "link")}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-600"
                  >
                    {copiouLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiouLink ? "Link Copiado!" : "Copiar Link"}
                  </button>
                </div>
              </div>

              {/* CARD 2: Adesões Totais */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Adesões Totais</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {totalAdesoes} <span className="text-xs font-normal text-slate-400">loja(s)</span>
                  </p>
                  <p className="text-sm font-bold text-emerald-400">
                    R$ {rendimentoAdesao.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <p className="text-[11px] text-slate-400">
                    Bônus fixo de R$ 18,91 por nova loja ativada
                  </p>
                </div>
              </div>

              {/* CARD 3: Rendimentos Recorrentes */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rendimentos Recorrentes</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Repeat className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {totalRecorrentes} <span className="text-xs font-normal text-slate-400">renovação(ões)</span>
                  </p>
                  <p className="text-sm font-bold text-purple-400">
                    R$ {rendimentoRecorrente.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <p className="text-[11px] text-slate-400">
                    10% sobre todas as mensalidades recorrentes
                  </p>
                </div>
              </div>

              {/* CARD 4: Rendimento Total Disponível */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Estimado</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-amber-400 tracking-tight">
                    R$ {rendimentoTotal.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs text-slate-400">
                    Soma de adesões + recorrências
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Repasse via PIX:</span>
                    <span className="font-semibold text-slate-200">Mensal / Periódico</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Extrato de Comissões */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-700/80 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Extrato de Comissões</h2>
                  <p className="text-xs text-slate-400">Detalhamento de comissões por adesão e recorrências das lojas parceiras.</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">
                  Registros: {historicoComissoes.length}
                </span>
              </div>

              {historicoComissoes.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="inline-flex p-4 rounded-full bg-slate-700/40 text-slate-400 mb-1">
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Nenhuma comissão registrada ainda</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Compartilhe seu cupom exclusivo <strong className="text-amber-400">{afiliadoAtivo.cupom_exclusivo}</strong> com confeiteiras para receber comissões automáticas!
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
                        <th className="py-3 px-6">Data</th>
                        <th className="py-3 px-6 text-center">Tipo de Comissão</th>
                        <th className="py-3 px-6 text-center">Status do Repasse</th>
                        <th className="py-3 px-6 text-right">Valor da Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-sm">
                      {historicoComissoes.map((item, index) => {
                        const dataFormatada = formatarDataHoraBR(item.created_at);
                        const isPago = item.status_repasse === "pago";
                        const isRecorrente = item.tipo_comissao === "recorrente";

                        return (
                          <tr key={item.id || index} className="hover:bg-slate-700/20 transition-colors">
                            <td className="py-4 px-6 font-semibold text-white">
                              <span className="block">{item.loja_nome || `Loja ${item.estabelecimento_codigo || item.loja_id}`}</span>
                              {item.estabelecimento_codigo && (
                                <span className="block text-xs text-slate-400 font-mono font-normal">
                                  Código: {item.estabelecimento_codigo}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                              {dataFormatada}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {isRecorrente ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                  <Repeat className="w-3 h-3" />
                                  Recorrência (10%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                  <Sparkles className="w-3 h-3" />
                                  Adesão Inicial
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {isPago ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Pago em {formatarDataBR(item.data_repasse)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-emerald-400">
                              R$ {(Number(item.valor_comissao) || 0).toFixed(2).replace(".", ",")}
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
