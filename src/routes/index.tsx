import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

// Components
import { LoginView } from "@/components/auth/LoginView";
import { ProfileSelectionView } from "@/components/auth/ProfileSelectionView";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { DashboardTab } from "@/components/caixadoce/DashboardTab";
import { OrdersView } from "@/components/caixadoce/OrdersView";
import { FinanceiroTab } from "@/components/caixadoce/FinanceiroTab";
import { ColaboradoresTab } from "@/components/caixadoce/ColaboradoresTab";
import { MeuPlanoTab } from "@/components/caixadoce/MeuPlanoTab";
import { ConfiguracoesTab } from "@/components/caixadoce/ConfiguracoesTab";
import { NotificationBell } from "@/components/caixadoce/NotificationBell";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  Users,
  CreditCard,
  Settings,
  LogOut,
  RefreshCw,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TransacaoFinanceira,
  type StatusTransacao,
  type Encomenda,
  type DataBloqueada,
} from "@/lib/caixadoce-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Gestão Financeira, Encomendas & Assinaturas" },
      { name: "description", content: "Sistema inteligente para gestão de pedidos, caixa, faturamento e equipe." },
      { property: "og:title", content: "CaixaDoce — Gestão Financeira & Encomendas" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile, isMounted, logout, switchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<DataBloqueada[]>([]);

  const activeCode = profile?.establishmentCode || "CD-1001";

  // 1. Carrega transações do Supabase / Cache Local
  const fetchTransacoes = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("transacoes_financeiras")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_transacoes_${activeCode}`);
        if (raw) {
          setTransacoes(JSON.parse(raw));
        } else {
          const demos: TransacaoFinanceira[] = [
            {
              id: "tr-1",
              descricao: "Venda Caixa de Brigadeiros Gourmet (12 un)",
              valor: 48.0,
              tipo: "receita",
              categoria: "Venda Direta / Balcão",
              data: new Date().toLocaleDateString("pt-BR"),
              metodoPagamento: "pix",
              status: "concluida",
              clienteOuFornecedor: "Fernanda Costa",
            },
            {
              id: "tr-2",
              descricao: "Encomenda Bolo Vulcão Ninho com Nutella",
              valor: 110.0,
              tipo: "receita",
              categoria: "Encomenda Especial",
              data: new Date().toLocaleDateString("pt-BR"),
              metodoPagamento: "cartao_credito",
              status: "concluida",
              clienteOuFornecedor: "Lucas Martins",
            },
          ];
          setTransacoes(demos);
          localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify(demos));
        }
        return;
      }

      const mapeadas: TransacaoFinanceira[] = data.map((d: any) => ({
        id: String(d.id),
        estabelecimentoCodigo: d.estabelecimento_codigo,
        descricao: d.descricao,
        valor: Number(d.valor),
        tipo: d.tipo,
        categoria: d.categoria,
        data: d.data || new Date(d.created_at).toLocaleDateString("pt-BR"),
        metodoPagamento: d.metodo_pagamento || "pix",
        status: d.status || "concluida",
        clienteOuFornecedor: d.cliente_ou_fornecedor,
      }));

      setTransacoes(mapeadas);
    } catch (e) {
      console.warn("Erro ao buscar transações:", e);
    }
  }, [activeCode, profile]);

  // 2. Carrega Encomendas e Datas Bloqueadas do Supabase / Cache Local
  const fetchEncomendasECalendario = useCallback(async () => {
    if (!profile) return;

    // A) Encomendas
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .order("data_entrega", { ascending: true });

      if (error || !data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_orders_${activeCode}`);
        if (raw) {
          setEncomendas(JSON.parse(raw));
        } else {
          // Exemplos demonstrativos
          const hoje = new Date().toISOString().split("T")[0];
          const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const demoOrders: Encomenda[] = [
            {
              id: "ord-1",
              estabelecimentoCodigo: activeCode,
              clienteNome: "Camila Guimarães",
              clienteWhatsapp: "(11) 98765-4321",
              dataEntrega: hoje,
              horarioEntrega: "15:30",
              itens: "1x Bolo Red Velvet 2kg, 30x Brigadeiros Belga",
              valorTotal: 180.0,
              valorEntrada: 90.0,
              statusPagamento: "sinal_pago",
              status: "em_producao",
              tipoEntrega: "retirada",
              observacoes: "Vela decorativa dourada inclusa",
            },
            {
              id: "ord-2",
              estabelecimentoCodigo: activeCode,
              clienteNome: "Rodrigo Mendonça",
              clienteWhatsapp: "(11) 99123-4567",
              dataEntrega: amanha,
              horarioEntrega: "11:00",
              itens: "2x Tortas Holandesas Grandes, 50x Mini Coxinhas",
              valorTotal: 220.0,
              valorEntrada: 220.0,
              statusPagamento: "pago_integral",
              status: "pendente",
              tipoEntrega: "delivery",
              enderecoEntrega: "Rua das Flores, 450 - Apto 12B",
            },
          ];
          setEncomendas(demoOrders);
          localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(demoOrders));
        }
      } else {
        const mapeadas: Encomenda[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo,
          clienteNome: d.cliente_nome,
          clienteWhatsapp: d.cliente_whatsapp,
          dataEntrega: d.data_entrega,
          horarioEntrega: d.horario_entrega || "14:00",
          itens: d.itens,
          valorTotal: Number(d.valor_total),
          valorEntrada: d.valor_entrada ? Number(d.valor_entrada) : 0,
          statusPagamento: d.status_pagamento || "pendente",
          status: d.status || "pendente",
          observacoes: d.observacoes,
          enderecoEntrega: d.endereco_entrega,
          tipoEntrega: d.tipo_entrega || "retirada",
          createdAt: d.created_at,
        }));
        setEncomendas(mapeadas);
      }
    } catch (e) {
      console.warn("Erro ao buscar encomendas:", e);
    }

    // B) Datas Bloqueadas
    try {
      const { data, error } = await supabase
        .from("datas_bloqueadas")
        .select("*")
        .eq("estabelecimento_codigo", activeCode);

      if (error || !data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_datas_bloqueadas_${activeCode}`);
        if (raw) {
          setDatasBloqueadas(JSON.parse(raw));
        }
      } else {
        const mapeadas: DataBloqueada[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo,
          data: d.data,
          motivo: d.motivo || "Agenda Lotada",
          createdAt: d.created_at,
        }));
        setDatasBloqueadas(mapeadas);
      }
    } catch (e) {
      console.warn("Erro ao buscar datas bloqueadas:", e);
    }
  }, [activeCode, profile]);

  useEffect(() => {
    fetchTransacoes();
    fetchEncomendasECalendario();
  }, [fetchTransacoes, fetchEncomendasECalendario]);

  // Listener para retorno do Stripe Checkout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout_status") === "success") {
        toast.success("Assinatura Stripe ativada com sucesso! Acesso Pro liberado.");
      }
    }
  }, []);

  // Handlers de Encomendas
  const criarEncomenda = async (dados: Omit<Encomenda, "id" | "estabelecimentoCodigo">) => {
    const item: Encomenda = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
    };

    const atualizadas = [item, ...encomendas];
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}

    try {
      await supabase.from("orders").insert([
        {
          id: item.id,
          estabelecimento_codigo: activeCode,
          cliente_nome: item.clienteNome,
          cliente_whatsapp: item.clienteWhatsapp,
          data_entrega: item.dataEntrega,
          horario_entrega: item.horarioEntrega,
          itens: item.itens,
          valor_total: item.valorTotal,
          valor_entrada: item.valorEntrada || 0,
          status_pagamento: item.statusPagamento,
          status: item.status,
          tipo_entrega: item.tipoEntrega,
          endereco_entrega: item.enderecoEntrega,
          observacoes: item.observacoes,
        },
      ]);
    } catch (err) {
      console.warn("Supabase insert order warning:", err);
    }
  };

  const editarEncomenda = async (id: string, dados: Partial<Encomenda>) => {
    const atualizadas = encomendas.map((e) => (e.id === id ? { ...e, ...dados } : e));
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}

    try {
      await supabase
        .from("orders")
        .update({
          cliente_nome: dados.clienteNome,
          cliente_whatsapp: dados.clienteWhatsapp,
          data_entrega: dados.dataEntrega,
          horario_entrega: dados.horarioEntrega,
          itens: dados.itens,
          valor_total: dados.valorTotal,
          valor_entrada: dados.valorEntrada,
          status_pagamento: dados.statusPagamento,
          status: dados.status,
          tipo_entrega: dados.tipoEntrega,
          endereco_entrega: dados.enderecoEntrega,
          observacoes: dados.observacoes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (err) {
      console.warn("Supabase update order warning:", err);
    }
  };

  const excluirEncomenda = async (id: string) => {
    const atualizadas = encomendas.filter((e) => e.id !== id);
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("orders").delete().eq("id", id);
    } catch {}
    toast.success("Encomenda excluída com sucesso.");
  };

  // Handlers de Bloqueio de Datas
  const bloquearData = async (data: string, motivo: string) => {
    const item: DataBloqueada = {
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      data,
      motivo,
    };

    const atualizadas = [...datasBloqueadas.filter((d) => d.data !== data), item];
    setDatasBloqueadas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_datas_bloqueadas_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("datas_bloqueadas").insert([
        {
          id: item.id,
          estabelecimento_codigo: activeCode,
          data: item.data,
          motivo: item.motivo,
        },
      ]);
    } catch {}
  };

  const desbloquearData = async (id: string) => {
    const atualizadas = datasBloqueadas.filter((d) => d.id !== id);
    setDatasBloqueadas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_datas_bloqueadas_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("datas_bloqueadas").delete().eq("id", id);
    } catch {}
    toast.info("Data desbloqueada na agenda.");
  };

  // Handlers de Transações Financeiras
  const adicionarTransacao = async (nova: Omit<TransacaoFinanceira, "id">) => {
    const item: TransacaoFinanceira = {
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      ...nova,
    };

    const atualizadas = [item, ...transacoes];
    setTransacoes(atualizadas);
    try {
      localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}

    try {
      await supabase.from("transacoes_financeiras").insert([
        {
          id: item.id,
          estabelecimento_codigo: activeCode,
          descricao: item.descricao,
          valor: item.valor,
          tipo: item.tipo,
          categoria: item.categoria,
          metodo_pagamento: item.metodoPagamento,
          status: item.status,
          cliente_ou_fornecedor: item.clienteOuFornecedor,
          data: item.data,
        },
      ]);
    } catch (err) {
      console.warn("Aviso ao salvar no Supabase:", err);
    }
  };

  const removerTransacao = async (id: string) => {
    const atualizadas = transacoes.filter((t) => t.id !== id);
    setTransacoes(atualizadas);
    try {
      localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("transacoes_financeiras").delete().eq("id", id);
    } catch {}
    toast.success("Lançamento excluído com sucesso.");
  };

  const atualizarStatusTransacao = async (id: string, status: StatusTransacao) => {
    const atualizadas = transacoes.map((t) => (t.id === id ? { ...t, status } : t));
    setTransacoes(atualizadas);
    try {
      localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("transacoes_financeiras").update({ status }).eq("id", id);
    } catch {}
    toast.info(`Status alterado para ${status === "concluida" ? "Concluído" : "Pendente"}.`);
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 1. Não autenticado
  if (!user) {
    return <LoginView />;
  }

  // 2. Sem estabelecimento / perfil selecionado
  if (!profile) {
    return <ProfileSelectionView />;
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Principal do CaixaDoce */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Logo & Identidade */}
            <div className="min-w-0 flex items-center gap-3">
              <CaixaDoceLogo size="md" className="text-white" />
              <div className="border-l border-white/20 pl-3">
                <p className="truncate text-xs font-semibold text-white/90">{profile.establishmentName}</p>
                <span className="inline-block bg-black/40 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold mt-0.5">
                  {profile.establishmentCode}
                </span>
              </div>
            </div>

            {/* Usuário, Notificações & Controles */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell transacoes={transacoes} onNavigateTab={setActiveTab} />

              <div className="hidden sm:flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/15 text-xs shadow-inner">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white tracking-wide truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-white/40">|</span>
                <span className="text-amber-300 font-semibold uppercase text-[10px]">
                  {profile.role}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={switchProfile}
                title="Trocar Estabelecimento"
                className="h-8 px-2 sm:px-3 text-xs text-white/90 hover:text-white hover:bg-white/10 border border-white/15"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">Trocar Loja</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Sair da Conta"
                className="h-8 px-2 sm:px-3 text-xs text-white/90 hover:text-rose-300 hover:bg-rose-500/20 border border-white/15"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1.5 text-rose-400" />
                <span className="hidden sm:inline font-medium">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal / Tabs */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList className="w-max bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 font-semibold text-xs">
                <LayoutDashboard className="w-4 h-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="encomendas" className="flex items-center gap-1.5 font-semibold text-xs">
                <CalendarDays className="w-4 h-4 text-primary" /> Encomendas &amp; Calendário
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-1.5 font-semibold text-xs">
                <DollarSign className="w-4 h-4" /> Financeiro &amp; Caixa
              </TabsTrigger>
              <TabsTrigger value="colaboradores" className="flex items-center gap-1.5 font-semibold text-xs">
                <Users className="w-4 h-4" /> Equipe &amp; Acessos
              </TabsTrigger>
              <TabsTrigger value="plano" className="flex items-center gap-1.5 font-semibold text-xs">
                <CreditCard className="w-4 h-4" /> Meu Plano (Stripe)
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-1.5 font-semibold text-xs">
                <Settings className="w-4 h-4" /> Configurações &amp; Perfil
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <DashboardTab
              transacoes={transacoes}
              onNavigateTab={setActiveTab}
              onNovaTransacao={() => setActiveTab("financeiro")}
            />
          </TabsContent>

          <TabsContent value="encomendas">
            <OrdersView
              encomendas={encomendas}
              datasBloqueadas={datasBloqueadas}
              onCriarEncomenda={criarEncomenda}
              onEditarEncomenda={editarEncomenda}
              onExcluirEncomenda={excluirEncomenda}
              onBloquearData={bloquearData}
              onDesbloquearData={desbloquearData}
            />
          </TabsContent>

          <TabsContent value="financeiro">
            <FinanceiroTab
              transacoes={transacoes}
              onAdicionarTransacao={adicionarTransacao}
              onRemoverTransacao={removerTransacao}
              onAtualizarStatus={atualizarStatusTransacao}
            />
          </TabsContent>

          <TabsContent value="colaboradores">
            <ColaboradoresTab />
          </TabsContent>

          <TabsContent value="plano">
            <MeuPlanoTab />
          </TabsContent>

          <TabsContent value="config">
            <ConfiguracoesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
