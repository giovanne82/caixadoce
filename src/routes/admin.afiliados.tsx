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
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [processandoLote, setProcessandoLote] = useState(false);

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

      let listaLojas: any[] = [];
      try {
        const { data: dbEstabelecimentos, error: estErr } = await supabase
          .from("estabelecimentos")
          .select("id, nome, codigo, created_at, status_repasse, data_repasse, cupom_utilizado");

        if (estErr) {
          console.log("[Admin Estabelecimentos Query Error]", estErr.message, estErr.details);
        }
        listaLojas = (dbEstabelecimentos as any[]) || [];
      } catch (err: any) {
        console.log("[Admin Estabelecimentos Exception]", err?.message, err?.details);
      }

      const listaAfiliados: Afiliado[] = (dbAfiliados as any[]) || [];

      const resultado: RelatorioAfiliado[] = listaAfiliados.map((afil) => {
        const convertidas = listaLojas.filter((est) => {
          return est.cupom_utilizado && String(est.cupom_utilizado).toUpperCase() === String(afil.cupom_exclusivo).toUpperCase();
        });

        const count = convertidas.length;
        return {
          afiliado: afil,
          lojasConvertidasCount: count,
          comissaoEstimada: Number((count * 18.91).toFixed(2)),
          lojas: convertidas.map((l) => ({
            id: l.id,
            codigo: l.codigo || "CD-1000",
            nome: l.nome || "Loja",
            email: l.email || "",
            plano_status: l.plano_status || l.status_assinatura || "ativo",
            criado_em: l.created_at || l.criado_em || "",
            created_at: l.created_at || l.criado_em || "",
            cupom_utilizado: l.cupom_utilizado,
            status_repasse: l.status_repasse || "pendente",
            data_repasse: l.data_repasse || null,
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

  async function marcarRepasseComoPago(loja: any) {
    if (!loja?.id && !loja?.codigo) return;

    try {
      let ok = false;
      const res = await fetch("/api/afiliados/marcar-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojaId: loja.id, codigo: loja.codigo }),
      }).catch(() => null);

      if (res && res.ok) {
        ok = true;
      }

      if (!ok) {
        const nowIso = new Date().toISOString();
        let q = supabase
          .from("estabelecimentos")
          .update({ status_repasse: "pago", data_repasse: nowIso });

        if (loja.id) {
          q = q.eq("id", loja.id);
        } else {
          q = q.eq("codigo", loja.codigo);
        }

        const { error } = await q;
        if (error) {
          console.error("[Marcar Pago Direct Error]", error);
          throw error;
        }
      }

      const nowIso = new Date().toISOString();
      toast.success(`Repasse da loja "${loja.nome || loja.codigo}" marcado como PAGO!`);

      if (afiliadoSelecionadoModal) {
        const lojasAtualizadas = (afiliadoSelecionadoModal.lojas || []).map((l: any) => {
          if ((l.id && l.id === loja.id) || (l.codigo && l.codigo === loja.codigo)) {
            return { ...l, status_repasse: "pago", data_repasse: nowIso };
          }
          return l;
        });
        setAfiliadoSelecionadoModal({
          ...afiliadoSelecionadoModal,
          lojas: lojasAtualizadas,
        });
      }

      carregarRelatorio();
    } catch (err: any) {
      console.error("[Marcar Pago Error]", err);
      toast.error("Falha ao marcar repasse como pago.");
    }
  }

  async function pagarSelecionados() {
    if (!selecionados.length || !afiliadoSelecionadoModal) return;

    setProcessandoLote(true);
    try {
      const nowIso = new Date().toISOString();
      const ids = selecionados;

      // Direct Supabase Batch Update
      const { error } = await supabase
        .from("estabelecimentos")
        .update({ status_repasse: "pago", data_repasse: nowIso })
        .in("id", ids);

      if (error) {
        console.error("[Pagar Selecionados Direct Error]", error);
        // Fallback for codes if IDs don't match
        await supabase
          .from("estabelecimentos")
          .update({ status_repasse: "pago", data_repasse: nowIso })
          .in("codigo", ids);
      }

      toast.success(`${selecionados.length} repasse(s) marcado(s) como PAGO!`);

      // Update modal list locally
      const lojasAtualizadas = (afiliadoSelecionadoModal.lojas || []).map((l: any) => {
        const key = l.id || l.codigo;
        if (selecionados.includes(key)) {
          return { ...l, status_repasse: "pago", data_repasse: nowIso };
        }
        return l;
      });

      setAfiliadoSelecionadoModal({
        ...afiliadoSelecionadoModal,
        lojas: lojasAtualizadas,
      });

      setSelecionados([]);
      carregarRelatorio();
    } catch (err: any) {
      console.error("[Pagar Selecionados Error]", err);
      toast.error("Falha ao processar repasses em lote.");
    } finally {
      setProcessandoLote(false);
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
    navigator.clipboard.writeText(pix || "");
    setCopiouChave(id);
    setTimeout(() => setCopiouChave(null), 2500);
    toast.success(`Chave PIX "${pix}" copiada!`);
  }

  const relatorioSeguro = Array.isArray(relatorio) ? relatorio : [];

  const relatorioFiltrado = relatorioSeguro.filter((item) => {
    if (!filtro.trim()) return true;
    const term = filtro.toLowerCase().trim();
    const nomeAfil = item?.afiliado?.nome?.toLowerCase() || "";
    const cupomAfil = item?.afiliado?.cupom_exclusivo?.toLowerCase() || "";
    const emailAfil = item?.afiliado?.email?.toLowerCase() || "";
    return nomeAfil.includes(term) || cupomAfil.includes(term) || emailAfil.includes(term);
  });

  const totalAfiliados = relatorioSeguro.length;
  const totalLojasConvertidas = relatorioSeguro.reduce(
    (acc, curr) => acc + (Number(curr?.lojasConvertidasCount) || 0),
    0
  );
  const totalComissoesGeral = relatorioSeguro.reduce(
    (acc, curr) => acc + (Number(curr?.comissaoEstimada) || 0),
    0
  );

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
              <p className="text-xs text-slate-400">Acerto total a pagar (R$ 18,91 / loja)</p>
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
                  {relatorioFiltrado.map((item, idx) => {
                    const idKey = item?.afiliado?.id || item?.afiliado?.cupom_exclusivo || `afil_${idx}`;
                    const comissaoVal = Number(item?.comissaoEstimada) || 0;
                    const countLojas = Number(item?.lojasConvertidasCount) || 0;
                    return (
                      <tr key={idKey} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-white">{item?.afiliado?.nome || "Sem Nome"}</p>
                          <p className="text-xs text-slate-400">{item?.afiliado?.email || ""}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs uppercase">
                            {item?.afiliado?.cupom_exclusivo || "N/I"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs">
                          <div className="flex items-center gap-1.5">
                            <code className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-mono">
                              {item?.afiliado?.chave_pix || "N/I"}
                            </code>
                            <button
                              onClick={() => copiarPix(item?.afiliado?.chave_pix || "", idKey)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Copiar Chave PIX"
                            >
                              {copiouChave === idKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-white">
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
                            {countLojas} lojas
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-emerald-400 text-base">
                          R$ {comissaoVal.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setAfiliadoSelecionadoModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                          >
                            Ver Lojas ({countLojas})
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
      {afiliadoSelecionadoModal && (() => {
        const lojasModal = afiliadoSelecionadoModal?.lojas || [];
        const lojasPendentes = lojasModal.filter((l: any) => l.status_repasse !== "pago");
        const todasPendentesSelecionadas =
          lojasPendentes.length > 0 &&
          lojasPendentes.every((l: any) => {
            const key = l.id || l.codigo;
            return selecionados.includes(key);
          });

        const toggleSelecionarTodas = () => {
          if (todasPendentesSelecionadas) {
            setSelecionados([]);
          } else {
            const todosKeys = lojasPendentes.map((l: any) => l.id || l.codigo).filter(Boolean);
            setSelecionados(todosKeys);
          }
        };

        const toggleSelecionarLoja = (key: string) => {
          if (selecionados.includes(key)) {
            setSelecionados(selecionados.filter((k) => k !== key));
          } else {
            setSelecionados([...selecionados, key]);
          }
        };

        const totalSelecionadoValor = (selecionados.length * 18.91).toFixed(2).replace(".", ",");

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Lojas de {afiliadoSelecionadoModal?.afiliado?.nome || "Afiliado"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cupom: <strong className="text-amber-400 font-mono">{afiliadoSelecionadoModal?.afiliado?.cupom_exclusivo || "N/I"}</strong> — {afiliadoSelecionadoModal?.lojasConvertidasCount || 0} conversões
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAfiliadoSelecionadoModal(null);
                    setSelecionados([]);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Fechar
                </button>
              </div>

              {lojasPendentes.length > 0 && (
                <div className="flex items-center justify-between bg-slate-950/60 px-6 py-2.5 border-b border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white font-medium select-none">
                    <input
                      type="checkbox"
                      checked={todasPendentesSelecionadas}
                      onChange={toggleSelecionarTodas}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                    />
                    <span>Selecionar Todos ({lojasPendentes.length} pendente{lojasPendentes.length > 1 ? "s" : ""})</span>
                  </label>
                  {selecionados.length > 0 && (
                    <span className="text-amber-400 font-bold">
                      {selecionados.length} selecionada(s)
                    </span>
                  )}
                </div>
              )}

              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                {lojasModal.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">
                    Nenhuma loja convertida com este cupom até o momento.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {lojasModal.map((loja: any, i: number) => {
                      const isPago = loja?.status_repasse === "pago";
                      const key = loja?.id || loja?.codigo || `loja_${i}`;
                      const isChecked = selecionados.includes(key);
                      const dataCriacaoStr = formatarDataHoraBR(loja?.created_at || loja?.criado_em);

                      return (
                        <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 last:border-0">
                          <div className="flex items-center gap-3">
                            {!isPago && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelecionarLoja(key)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{loja?.nome || "Loja"}</p>
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-400">
                                  {loja?.codigo || "N/I"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                Entrada: <span className="text-slate-300 font-mono">{dataCriacaoStr}</span> {loja?.email ? `• ${loja.email}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:justify-end">
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-400 block">Comissão: R$ 18,91</span>
                              {isPago ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Pago em {formatarDataBR(loja?.data_repasse)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 mt-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </div>

                            {!isPago && (
                              <button
                                onClick={() => marcarRepasseComoPago(loja)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1 shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Marcar como Pago
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div>
                  Chave PIX: <code className="text-amber-300 font-mono select-all">{afiliadoSelecionadoModal?.afiliado?.chave_pix || "N/I"}</code>
                </div>
                <div className="flex items-center gap-4">
                  {selecionados.length > 0 && (
                    <span className="font-extrabold text-amber-400 text-sm">
                      Total Selecionado: R$ {totalSelecionadoValor}
                    </span>
                  )}
                  <button
                    onClick={pagarSelecionados}
                    disabled={selecionados.length === 0 || processandoLote}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {processandoLote ? "Processando..." : `Pagar Selecionados (${selecionados.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} CaixaDoce Admin. Módulo de Gestão de Afiliados.</p>
      </footer>
    </div>
  );
}
