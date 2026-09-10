import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Ticket,
  DollarSign,
  Store,
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Cake,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Afiliado, RelatorioAfiliado } from "@/lib/caixadoce-data";
import { useAuth } from "@/context/auth-context";
import { isEmailAdmin, checkCurrentSupabaseUserIsAdmin, sanitizeEmail } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin/afiliados")({
  head: () => ({
    meta: [
      { title: "Gestão de Afiliados — Admin CaixaDoce" },
      { name: "description", content: "Painel interno de gestão de afiliados, cupons e relatórios de acerto financeiro." },
    ],
  }),
  component: AdminAfiliadosComponent,
});

function AdminAfiliadosComponent() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [verificandoAdmin, setVerificandoAdmin] = useState(true);
  const [isAdminAutorizado, setIsAdminAutorizado] = useState(false);

  const [relatorio, setRelatorio] = useState<RelatorioAfiliado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [afiliadoSelecionadoModal, setAfiliadoSelecionadoModal] = useState<RelatorioAfiliado | null>(null);

  // Form de cadastro
  const [nome, setNome] = useState("");
  const [cupom, setCupom] = useState("");
  const [email, setEmail] = useState("");
  const [chavePix, setChavePix] = useState("");

  const [copiouChave, setCopiouChave] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function validarAcessoAdmin() {
      // 1. Sincronia de Carregamento (Loading State): Não bloqueia enquanto a sessão estiver carregando
      if (authLoading) {
        return;
      }

      setVerificandoAdmin(true);

      // 2. Consulta resiliente com sanitização (.toLowerCase().trim()) e busca multi-caminhos
      const { isAdmin, email: emailDetectado } = await checkCurrentSupabaseUserIsAdmin(user);

      if (!active) return;

      if (isAdmin) {
        setIsAdminAutorizado(true);
        setVerificandoAdmin(false);
        carregarRelatorio();
      } else {
        // Se a sessão ainda estiver reidratando no localStorage, aguarda 350ms adicionais antes de confirmar o bloqueio
        if (typeof window !== "undefined" && (localStorage.getItem("caixadoce_user") || localStorage.getItem("caixadoce_profile"))) {
          await new Promise((r) => setTimeout(r, 350));
          if (!active) return;
          const retryCheck = await checkCurrentSupabaseUserIsAdmin(user);
          if (retryCheck.isAdmin) {
            setIsAdminAutorizado(true);
            setVerificandoAdmin(false);
            carregarRelatorio();
            return;
          }
        }

        const userEmailTentado = sanitizeEmail(emailDetectado || user?.email);
        toast.error(`Acesso Restrito: O e-mail "${userEmailTentado || "não autenticado"}" não possui permissão de administrador.`);
        setIsAdminAutorizado(false);
        setVerificandoAdmin(false);
        navigate({ to: "/" });
      }
    }

    validarAcessoAdmin();

    return () => {
      active = false;
    };
  }, [user, authLoading, navigate]);

  async function carregarRelatorio() {
    setCarregando(true);
    try {
      // 1. Tentar via API server
      const res = await fetch("/api/afiliados/relatorio").catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.sucesso && Array.isArray(data.relatorio)) {
          setRelatorio(data.relatorio);
          setCarregando(false);
          return;
        }
      }

      // 2. Fallback direto via Supabase Client
      const { data: dbAfiliados } = await supabase
        .from("afiliados")
        .select("*")
        .order("criado_em", { ascending: false });

      const { data: dbEstabelecimentos } = await supabase
        .from("estabelecimentos")
        .select("codigo, nome, email, plano_status, status_assinatura, created_at, cupom_utilizado, afiliado_id");

      const listaAfiliados: Afiliado[] = (dbAfiliados as any[]) || [];
      const listaLojas = (dbEstabelecimentos as any[]) || [];

      const resultado: RelatorioAfiliado[] = listaAfiliados.map((afil) => {
        const convertidas = listaLojas.filter((est) => {
          const idMatch = est.afiliado_id && String(est.afiliado_id) === String(afil.id);
          const cupomMatch = est.cupom_utilizado && String(est.cupom_utilizado).toUpperCase() === String(afil.cupom_exclusivo).toUpperCase();
          return idMatch || cupomMatch;
        });

        const count = convertidas.length;
        return {
          afiliado: afil,
          lojasConvertidasCount: count,
          comissaoEstimada: Number((count * 10.9).toFixed(2)),
          lojas: convertidas.map((l) => ({
            codigo: l.codigo || "CD-1000",
            nome: l.nome || "Loja",
            email: l.email || "",
            plano_status: l.plano_status || l.status_assinatura || "ativo",
            criado_em: l.created_at,
            cupom_utilizado: l.cupom_utilizado,
          })),
        };
      });

      setRelatorio(resultado);
    } catch (err: any) {
      console.error("[Carregar Relatório Afiliados Error]", err);
      toast.error("Erro ao carregar relatório de afiliados.");
    } finally {
      setCarregando(false);
    }
  }

  async function cadastrarAfiliado(e: React.FormEvent) {
    e.preventDefault();

    const cleanNome = nome.trim();
    const cleanCupom = cupom.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPix = chavePix.trim();

    if (!cleanNome || !cleanCupom || !cleanEmail || !cleanPix) {
      toast.error("Preencha todos os campos obrigatórios para cadastrar o afiliado.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Tentar cadastro via API
      let cadastrado = false;
      const res = await fetch("/api/afiliados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cleanNome,
          cupom_exclusivo: cleanCupom,
          email: cleanEmail,
          chave_pix: cleanPix,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        cadastrado = true;
      }

      // 2. Direct Supabase Fallback
      if (!cadastrado) {
        const { error } = await supabase.from("afiliados").insert([
          {
            nome: cleanNome,
            cupom_exclusivo: cleanCupom,
            email: cleanEmail,
            chave_pix: cleanPix,
          },
        ]);

        if (error) {
          throw new Error(error.message || "Cupom ou e-mail já existente.");
        }
      }

      toast.success(`Afiliado "${cleanNome}" com cupom "${cleanCupom}" cadastrado com sucesso!`);
      setNome("");
      setCupom("");
      setEmail("");
      setChavePix("");
      carregarRelatorio();
    } catch (err: any) {
      console.error("[Cadastrar Afiliado Error]", err);
      toast.error(`Falha no cadastro: ${err.message || "Verifique se o cupom ou e-mail já foram cadastrados."}`);
    } finally {
      setSalvando(false);
    }
  }

  function copiarPix(pix: string, id: string) {
    navigator.clipboard.writeText(pix);
    setCopiouChave(id);
    setTimeout(() => setCopiouChave(null), 2500);
    toast.success(`Chave PIX "${pix}" copiada!`);
  }

  const relatorioFiltrado = relatorio.filter((item) => {
    if (!filtro.trim()) return true;
    const term = filtro.toLowerCase().trim();
    return (
      item.afiliado.nome.toLowerCase().includes(term) ||
      item.afiliado.cupom_exclusivo.toLowerCase().includes(term) ||
      item.afiliado.email.toLowerCase().includes(term)
    );
  });

  const totalAfiliados = relatorio.length;
  const totalLojasConvertidas = relatorio.reduce((acc, curr) => acc + curr.lojasConvertidasCount, 0);
  if (verificandoAdmin || !isAdminAutorizado) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 w-16 h-16 mx-auto flex items-center justify-center border border-amber-500/20">
            <Shield className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white">Verificando Credenciais</h2>
          <p className="text-xs text-slate-400">Validando autorização de acesso ao módulo administrativo CaixaDoce...</p>
          <div className="flex justify-center pt-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Admin */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CaixaDoce</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Painel de Administração
                </span>
              </div>
              <p className="text-xs text-slate-400">Gestão do Módulo de Afiliados & Acerto Financeiro</p>
            </div>
          </div>

          <button
            onClick={carregarRelatorio}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`} />
            Atualizar Relatório
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Resumo Geral de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total de Afiliados</span>
              <p className="text-3xl font-extrabold text-white">{totalAfiliados}</p>
              <p className="text-xs text-slate-400">Parceiros ativos cadastrados</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Lojas Convertidas</span>
              <p className="text-3xl font-extrabold text-blue-400">{totalLojasConvertidas}</p>
              <p className="text-xs text-slate-400">Assinaturas totais via cupom</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total em Comissões</span>
              <p className="text-3xl font-extrabold text-emerald-400">
                R$ {totalComissoesGeral.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-slate-400">Acerto total a pagar (R$ 10,90 / loja)</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Formulário de Cadastro de Novo Afiliado */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-700/60">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cadastrar Novo Afiliado / Parceiro</h2>
              <p className="text-xs text-slate-400">Gere um novo cupom exclusivo e cadastre a chave PIX do parceiro para repasse.</p>
            </div>
          </div>

          <form onSubmit={cadastrarAfiliado} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Nome do Afiliado *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Confeitaria da Ju"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Cupom Exclusivo *
              </label>
              <input
                type="text"
                required
                value={cupom}
                onChange={(e) => setCupom(e.target.value.toUpperCase())}
                placeholder="Ex: JUCANDY30"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                E-mail de Contato *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parceiro@email.com"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Chave PIX *
              </label>
              <input
                type="text"
                required
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="CPF, E-mail ou Celular"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 pt-2">
              <button
                type="submit"
                disabled={salvando}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {salvando ? "Cadastrando..." : "Cadastrar Afiliado"}
              </button>
            </div>
          </form>
        </div>

        {/* Tabela de Relatório Financeiro de Acerto */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="p-6 border-b border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Relatório Financeiro de Acerto / Comissões</h2>
              <p className="text-xs text-slate-400">Controle de repasse de comissões por afiliado com chave PIX e contagem de conversões.</p>
            </div>

            {/* Input de filtro */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Filtrar por nome ou cupom..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {carregando ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              Carregando afiliados e relatórios...
            </div>
          ) : relatorioFiltrado.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-white">Nenhum afiliado encontrado</p>
              <p className="text-xs text-slate-500">Cadastre o primeiro parceiro no formulário acima.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-700/60">
                  <tr>
                    <th className="py-3.5 px-6">Parceiro</th>
                    <th className="py-3.5 px-6">Cupom Exclusivo</th>
                    <th className="py-3.5 px-6">Chave PIX</th>
                    <th className="py-3.5 px-6 text-center">Lojas Convertidas</th>
                    <th className="py-3.5 px-6 text-right">Comissão a Pagar</th>
                    <th className="py-3.5 px-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {relatorioFiltrado.map((item) => {
                    const idKey = item.afiliado.id || item.afiliado.cupom_exclusivo;
                    return (
                      <tr key={idKey} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-white">{item.afiliado.nome}</p>
                          <p className="text-xs text-slate-400">{item.afiliado.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs uppercase">
                            {item.afiliado.cupom_exclusivo}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs">
                          <div className="flex items-center gap-1.5">
                            <code className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-mono">
                              {item.afiliado.chave_pix}
                            </code>
                            <button
                              onClick={() => copiarPix(item.afiliado.chave_pix, idKey)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Copiar Chave PIX"
                            >
                              {copiouChave === idKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-white">
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
                            {item.lojasConvertidasCount} lojas
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-emerald-400 text-base">
                          R$ {item.comissaoEstimada.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setAfiliadoSelecionadoModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                          >
                            Ver Lojas ({item.lojasConvertidasCount})
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes de Lojas do Afiliado */}
      {afiliadoSelecionadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Lojas de {afiliadoSelecionadoModal.afiliado.nome}
                </h3>
                <p className="text-xs text-slate-400">
                  Cupom: <strong className="text-amber-400 font-mono">{afiliadoSelecionadoModal.afiliado.cupom_exclusivo}</strong> — {afiliadoSelecionadoModal.lojasConvertidasCount} conversões
                </p>
              </div>
              <button
                onClick={() => setAfiliadoSelecionadoModal(null)}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {afiliadoSelecionadoModal.lojas.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  Nenhuma loja convertida com este cupom até o momento.
                </p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {afiliadoSelecionadoModal.lojas.map((loja, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{loja.nome}</p>
                        <p className="text-xs text-slate-400">Código: <span className="font-mono text-amber-400">{loja.codigo}</span> {loja.email ? `• ${loja.email}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400">Comissão: R$ 10,90</span>
                        <p className="text-[10px] text-slate-500">
                          {loja.criado_em ? new Date(loja.criado_em).toLocaleDateString("pt-BR") : "Data N/I"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
              <span>Chave PIX: <code className="text-amber-300 font-mono">{afiliadoSelecionadoModal.afiliado.chave_pix}</code></span>
              <span className="font-bold text-emerald-400">Total: R$ {afiliadoSelecionadoModal.comissaoEstimada.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} CaixaDoce Admin. Módulo de Gestão de Afiliados.</p>
      </footer>
    </div>
  );
}
