import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { ScannerProvider, useScanner } from "@/context/scanner-context";
import { supabase } from "@/integrations/supabase/client";

// Components
import { LoginView } from "@/components/auth/LoginView";
import { ProfileSelectionView } from "@/components/auth/ProfileSelectionView";
import { LandingPageContent } from "./landing";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { ScannerView } from "@/components/caixadoce/ScannerView";
import { DespesasView } from "@/components/caixadoce/DespesasView";
import { OrdersView } from "@/components/caixadoce/OrdersView";
import { CustomersView } from "@/components/caixadoce/CustomersView";
import { ProductsView } from "@/components/caixadoce/ProductsView";
import { FinanceiroTab } from "@/components/caixadoce/FinanceiroTab";
import { ColaboradoresTab } from "@/components/caixadoce/ColaboradoresTab";
import { MeuPlanoTab } from "@/components/caixadoce/MeuPlanoTab";
import { ConfiguracoesTab } from "@/components/caixadoce/ConfiguracoesTab";
import { NotificationBell } from "@/components/caixadoce/NotificationBell";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Layers,
  CalendarDays,
  Package,
  Users,
  Cake,
  DollarSign,
  UserCheck,
  CreditCard,
  Settings,
  LogOut,
  RefreshCw,
  Shield,
  Crown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { obterPlanoEfetivoEstabelecimento, verificarAcessoModulo } from "@/lib/planos-utils";
import {
  type TransacaoFinanceira,
  type StatusTransacao,
  type Encomenda,
  type DataBloqueada,
  type DespesaNotaFiscal,
  type Cliente,
  type ProdutoCardapio,
  type ListaCompras,
  CLIENTES_PADRAO,
  CATALOGO_PRODUTOS_PADRAO,
  LISTAS_COMPRAS_PADRAO,
} from "@/lib/caixadoce-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Gestão Financeira, Scanner, Encomendas & Cardápio" },
      { name: "description", content: "Sistema inteligente para scanner de cupons, conciliação de insumos, encomendas e cardápio de confeitaria." },
      { property: "og:title", content: "CaixaDoce — Gestão Inteligente" },
    ],
  }),
  component: Index,
});

function UpgradeBanner({ onIrParaPlano }: { onIrParaPlano: () => void }) {
  return (
    <div className="py-12 px-6 text-center max-w-xl mx-auto space-y-5 bg-card border-2 border-dashed border-amber-500/40 rounded-3xl shadow-xl">
      <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto">
        <Crown className="w-9 h-9 animate-bounce text-amber-500" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-foreground">Recurso Exclusivo do Plano Mensal</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Seu período de testes de 14 dias grátis expirou ou você está no <strong>Plano Básico Gratuito</strong> (que inclui acesso à Lista de Compras, Painel Financeiro e Cardápio).
        </p>
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
          Assine o Plano Mensal (R$ 14,90/mês) para desbloquear o acesso completo.
        </p>
      </div>

      <Button
        onClick={onIrParaPlano}
        className="font-extrabold shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs py-5 px-6"
      >
        <Sparkles className="w-4 h-4 mr-2" /> Ver Plano &amp; Desbloquear Acesso Completo
      </Button>
    </div>
  );
}

function ScannerProgressBanner({ activeTab, onNavigateTab }: { activeTab: string; onNavigateTab: (tab: string) => void }) {
  const { isScanning, scanStepMessage } = useScanner();

  if (!isScanning) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 text-xs font-bold shadow-md flex items-center justify-between gap-3 animate-fade-in sticky top-[57px] z-30">
      <div className="flex items-center gap-2 truncate">
        <Sparkles className="w-4 h-4 text-amber-200 animate-spin shrink-0" />
        <span className="truncate">
          ⚡ <strong>Processando leitura da notinha em segundo plano...</strong>{" "}
          <span className="font-mono text-amber-100 font-normal">({scanStepMessage || "Aguarde..."})</span>
        </span>
      </div>
      {activeTab !== "scanner" && (
        <Button
          type="button"
          size="sm"
          onClick={() => onNavigateTab("scanner")}
          className="h-6 text-[10px] font-extrabold bg-white/20 hover:bg-white/30 text-white border border-white/40 shadow-xs shrink-0"
        >
          Ver no Scanner
        </Button>
      )}
    </div>
  );
}

function Index() {
  const { user, profile, isMounted, authLoading, logout, switchProfile } = useAuth();
  // Scanner é a tela inicial padrão
  const [activeTab, setActiveTab] = useState<string>("scanner");
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<DataBloqueada[]>([]);
  const [despesas, setDespesas] = useState<DespesaNotaFiscal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [listasCompras, setListasCompras] = useState<ListaCompras[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("caixadoce_listas_compras_v2_CD-1001");
        return saved ? JSON.parse(saved) : LISTAS_COMPRAS_PADRAO;
      }
    } catch {}
    return LISTAS_COMPRAS_PADRAO;
  });

  const activeCode = profile?.establishmentCode || "CD-1001";
  const activeName = profile?.establishmentName || "CaixaDoce Matriz";

  const podeAcessarAba = useCallback((abaId: string): boolean => {
    if (!profile || profile.role === "admin") return true;
    const permitidas = profile.abasPermitidas || ["dashboard", "scanner", "despesas", "encomendas", "produtos", "financeiro"];
    if (abaId === "scanner") return permitidas.includes("scanner") || permitidas.includes("dashboard");
    return permitidas.includes(abaId);
  }, [profile]);

  useEffect(() => {
    if (profile && profile.role === "operador" && !podeAcessarAba(activeTab)) {
      const permitidas = profile.abasPermitidas || ["scanner", "despesas", "encomendas", "produtos", "financeiro"];
      const primeira = permitidas.find((a) => podeAcessarAba(a)) || "despesas";
      toast.error("Acesso Negado: Você não possui permissão para acessar este módulo.");
      setActiveTab(primeira);
    }
  }, [activeTab, profile, podeAcessarAba]);

  const infoPlano = useMemo(() => obterPlanoEfetivoEstabelecimento(activeCode), [activeCode, activeTab]);

  // 1. Carrega dados do Supabase confiantemente no RLS / tabela direta sem filtros obsoletos
  const safeFetchSupabase = useCallback(
    async (tableName: string, activeCode: string, orderColumn?: string, ascending = false): Promise<any[]> => {
      try {
        let query = supabase.from(tableName as any).select("*");
        if (orderColumn) {
          query = query.order(orderColumn, { ascending });
        }
        const res = await query;

        if (!res.error && res.data) return res.data;

        if (res.error) {
          console.error(
            `[Supabase GET Error] Tabela: "${tableName}" | Status: ${res.status} | Mensagem:`,
            res.error.message
          );

          // Fallback sem ordenação caso a coluna de ordenação não exista
          try {
            const rawRes = await supabase.from(tableName as any).select("*");
            if (!rawRes.error && rawRes.data) return rawRes.data;
          } catch {}
        }
        return [];
      } catch (err: any) {
        console.error(`[Supabase Exception] Tabela "${tableName}":`, err?.message || err);
        return [];
      }
    },
    []
  );

  // 1. Carrega Transações Financeiras do Supabase ou LocalStorage
  const fetchTransacoes = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await safeFetchSupabase("transacoes_financeiras", activeCode, "created_at", false);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_transacoes_${activeCode}`);
        if (raw) {
          setTransacoes(JSON.parse(raw));
        } else {
          setTransacoes([]);
          localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify([]));
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
        origem: d.origem || (d.descricao?.includes("Stripe") || d.categoria?.includes("Stripe") ? "Stripe" : "Manual"),
      }));

    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

  // 2. Carrega Encomendas e Datas Bloqueadas
  const fetchEncomendasECalendario = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await safeFetchSupabase("encomendas", activeCode, "data_entrega", true);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_orders_${activeCode}`);
        if (raw) {
          setEncomendas(JSON.parse(raw));
        } else {
          setEncomendas([]);
          localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify([]));
        }
      } else {
        const mapeadas: Encomenda[] = data.map((d: any) => {
          const histRaw = d.historico_pagamentos || d.payments_history;
          const historicoMapeado = Array.isArray(histRaw) && histRaw.length > 0
            ? histRaw.map((p: any) => ({
                id: p.id || `pay_${Math.random().toString(36).substr(2, 6)}`,
                data: p.data || p.date || d.created_at?.split("T")[0] || d.data_entrega,
                valor: Number(p.valor || p.amount || 0),
                observacao: p.observacao || p.note || "",
              }))
            : d.valor_entrada && Number(d.valor_entrada) > 0
            ? [{
                id: "pay_initial",
                data: d.created_at?.split("T")[0] || d.data_entrega,
                valor: Number(d.valor_entrada),
                observacao: "Sinal / Entrada Inicial",
              }]
            : [];

          return {
            id: String(d.id),
            estabelecimentoCodigo: d.estabelecimento_codigo,
            clienteId: d.cliente_id,
            clienteNome: d.cliente_nome,
            clienteWhatsapp: d.cliente_whatsapp,
            dataEntrega: d.data_entrega,
            horarioEntrega: d.horario_entrega || "14:00",
            itens: d.itens,
            itensDetalhes: Array.isArray(d.itens_detalhes) ? d.itens_detalhes : [],
            insumosNecessarios: Array.isArray(d.insumos_necessarios) ? d.insumos_necessarios : [],
            valorTotal: Number(d.valor_total),
            valorEntrada: d.valor_entrada ? Number(d.valor_entrada) : 0,
            historicoPagamentos: historicoMapeado,
            paymentsHistory: historicoMapeado,
            statusPagamento: d.status_pagamento || "pendente",
            status: d.status || "pendente",
            observacoes: d.observacoes,
            enderecoEntrega: d.endereco_entrega,
            tipoEntrega: d.tipo_entrega || "retirada",
            createdAt: d.created_at,
          };
        });
        setEncomendas(mapeadas);
        try {
          localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(mapeadas));
        } catch {}
      }
    } catch {}

    try {
      const data = await safeFetchSupabase("datas_bloqueadas", activeCode);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_datas_bloqueadas_${activeCode}`);
        if (raw) setDatasBloqueadas(JSON.parse(raw));
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
    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

  // 3. Carrega e Sincroniza Despesas (Notinhas) exclusivamente na tabela "despesas"
  const fetchDespesas = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await safeFetchSupabase("despesas", activeCode, "created_at", false);

      let localItems: DespesaNotaFiscal[] = [];
      try {
        const raw = localStorage.getItem(`caixadoce_expenses_${activeCode}`);
        if (raw) localItems = JSON.parse(raw);
      } catch {}

      // Migra notinhas que estavam gravadas localmente no localStorage para o Supabase
      if (localItems.length > 0 && Array.isArray(data)) {
        const remoteIds = new Set(data.map((d: any) => String(d.id)));
        const pendentes = localItems.filter((it) => !remoteIds.has(String(it.id)));

        if (pendentes.length > 0) {
          for (const item of pendentes) {
            try {
              await supabase.from("despesas").insert([
                {
                  id: item.id,
                  estabelecimento_codigo: activeCode,
                  user_id: user?.id || null,
                  fornecedor_nome: item.fornecedorNome,
                  fornecedor_endereco: item.fornecedorEndereco,
                  numero_nota: item.numeroNota,
                  numero_pedido: item.numeroPedido,
                  data_compra: item.dataCompra,
                  hora_compra: item.horaCompra,
                  valor_total: item.valorTotal,
                  valor_producao: item.valorProducao,
                  valor_utensilios: item.valorUtensilios,
                  valor_consumo_proprio: item.valorConsumoProprio,
                  valor_outros: item.valorOutros,
                  itens: item.itens,
                },
              ]);
            } catch {}
          }
        }
      }

      if (data.length > 0) {
        const mapeadas: DespesaNotaFiscal[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo || d.codigo || activeCode,
          fornecedorNome: d.fornecedor_nome || "Fornecedor",
          fornecedorEndereco: d.fornecedor_endereco || "",
          numeroNota: d.numero_nota || "",
          numeroPedido: d.numero_pedido || "",
          dataCompra: d.data_compra || d.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          horaCompra: d.hora_compra || "12:00",
          valorTotal: Number(d.valor_total || d.total || 0),
          valorProducao: Number(d.valor_producao || 0),
          valorUtensilios: Number(d.valor_utensilios || 0),
          valorConsumoProprio: Number(d.valor_consumo_proprio || 0),
          valorOutros: Number(d.valor_outros || 0),
          itens: Array.isArray(d.itens) ? d.itens : [],
          comprovanteUrl: d.comprovante_url,
          metodoPagamento: d.metodo_pagamento || "dinheiro",
          createdAt: d.created_at || d.data_compra || new Date().toISOString(),
        }));

        mapeadas.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dataCompra || 0).getTime();
          const dateB = new Date(b.createdAt || b.dataCompra || 0).getTime();
          return dateB - dateA;
        });

        setDespesas(mapeadas);
        localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(mapeadas));
      } else {
        localItems.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dataCompra || 0).getTime();
          const dateB = new Date(b.createdAt || b.dataCompra || 0).getTime();
          return dateB - dateA;
        });
        setDespesas(localItems);
      }
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
    }
  }, [activeCode, profile, safeFetchSupabase, user]);

  // 4. Carrega Clientes (Customers)
  const fetchClientes = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await safeFetchSupabase("customers", activeCode, "name", true);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_customers_${activeCode}`);
        if (raw) {
          setClientes(JSON.parse(raw));
        } else {
          setClientes([]);
          localStorage.setItem(`caixadoce_customers_${activeCode}`, JSON.stringify([]));
        }
      } else {
        const mapeados: Cliente[] = data.map((c: any) => ({
          id: String(c.id),
          estabelecimentoCodigo: c.estabelecimento_codigo,
          nome: c.name,
          whatsapp: c.whatsapp,
          endereco: c.address,
          observacoes: c.notes,
          createdAt: c.created_at,
        }));
        setClientes(mapeados);
      }
    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

  // 5. Carrega Produtos do Cardápio (Tabela Oficial produtos)
  const fetchProdutos = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await safeFetchSupabase("produtos", activeCode, "nome", true);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_cardapio_${activeCode}`);
        if (raw) {
          setProdutos(JSON.parse(raw));
        } else {
          setProdutos([]);
          localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify([]));
        }
      } else {
        const mapeados: ProdutoCardapio[] = data.map((p: any) => ({
          id: String(p.id),
          estabelecimentoCodigo: p.estabelecimento_codigo || p.codigo || activeCode,
          nome: p.nome || p.name,
          descricao: p.descricao || p.description || "",
          preco: Number(p.preco ?? p.price ?? 0),
          fotoUrl: p.foto_url || p.image_url || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
          categoria: p.categoria || p.category || "Bolos Decorados",
          destaque: false,
          tempoPreparoHoras: p.tempo_preparo_horas ?? p.prep_time_hours ?? 24,
          ativo: (p.ativo ?? p.is_active) !== false,
          createdAt: p.created_at,
        }));
        setProdutos(mapeados);
        try {
          localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(mapeados));
        } catch {}
      }
    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

  // 6. Carrega Listas de Compras (ListasCompras) do Supabase ou Cache Local
  const fetchListasCompras = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await safeFetchSupabase("listas_compras", activeCode, "data", false);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_listas_compras_v2_${activeCode}`);
        if (raw) {
          try {
            setListasCompras(JSON.parse(raw));
          } catch {}
        }
      } else {
        const mapeadas: ListaCompras[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo,
          nome: d.nome || d.name,
          data: d.data || d.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          status: d.status || (d.concluida ? "concluida" : "pendente"),
          concluida: d.concluida ?? d.is_completed ?? false,
          itens: Array.isArray(d.itens) ? d.itens : Array.isArray(d.items) ? d.items : [],
          valorEstimado: d.valor_estimado ? Number(d.valor_estimado) : 0,
          comprovanteUrl: d.comprovante_url,
          createdAt: d.created_at || d.data || new Date().toISOString(),
        }));
        setListasCompras(mapeadas);
        localStorage.setItem(`caixadoce_listas_compras_v2_${activeCode}`, JSON.stringify(mapeadas));
      }
    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

  useEffect(() => {
    fetchTransacoes();
    fetchEncomendasECalendario();
    fetchDespesas();
    fetchClientes();
    fetchProdutos();
    fetchListasCompras();
  }, [fetchTransacoes, fetchEncomendasECalendario, fetchDespesas, fetchClientes, fetchProdutos, fetchListasCompras]);

  // Listener em tempo real do Supabase para notinhas/despesas escaneadas em qualquer dispositivo (Celular <-> PC)
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("expenses_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchDespesas();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "despesas" },
        () => {
          fetchDespesas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchDespesas]);

  // Listener para re-fetch automático quando a janela ganha foco ou visibilidade no celular/PC
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        fetchTransacoes();
        fetchEncomendasECalendario();
        fetchDespesas();
        fetchClientes();
        fetchProdutos();
        fetchListasCompras();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchTransacoes, fetchEncomendasECalendario, fetchDespesas, fetchClientes, fetchProdutos, fetchListasCompras]);

  // Listener em tempo real do Supabase para Encomendas (Sincronização PC <-> Celular)
  useEffect(() => {
    const channel = supabase
      .channel("encomendas_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "encomendas" },
        () => {
          fetchEncomendasECalendario();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchEncomendasECalendario]);

  // Listener em tempo real do Supabase para Produtos do Cardápio
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("produtos_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        () => {
          fetchProdutos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchProdutos]);

  // Handlers de Clientes
  const criarCliente = async (dados: Omit<Cliente, "id" | "estabelecimentoCodigo" | "createdAt">) => {
    const novo: Cliente = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      createdAt: new Date().toISOString(),
    };

    const atualizados = [novo, ...clientes];
    setClientes(atualizados);
    try {
      localStorage.setItem(`caixadoce_customers_${activeCode}`, JSON.stringify(atualizados));
      await supabase.from("customers").insert([
        {
          id: novo.id,
          estabelecimento_codigo: activeCode,
          name: novo.nome,
          whatsapp: novo.whatsapp,
          address: novo.endereco,
          notes: novo.observacoes,
        },
      ]);
    } catch (e) {
      console.warn("Aviso ao salvar cliente:", e);
    }
  };

  const editarCliente = async (id: string, dados: Partial<Cliente>) => {
    const atualizados = clientes.map((c) => (c.id === id ? { ...c, ...dados } : c));
    setClientes(atualizados);
    try {
      localStorage.setItem(`caixadoce_customers_${activeCode}`, JSON.stringify(atualizados));
      await supabase
        .from("customers")
        .update({
          name: dados.nome,
          whatsapp: dados.whatsapp,
          address: dados.endereco,
          notes: dados.observacoes,
        })
        .eq("id", id);
    } catch (e) {
      console.warn("Aviso ao editar cliente:", e);
    }
  };

  const excluirCliente = async (id: string) => {
    const atualizados = clientes.filter((c) => c.id !== id);
    setClientes(atualizados);
    try {
      localStorage.setItem(`caixadoce_customers_${activeCode}`, JSON.stringify(atualizados));
      await supabase.from("customers").delete().eq("id", id);
    } catch {}
    toast.success("Cliente removido com sucesso.");
  };

  const criarClienteRapido = async (nome: string, whatsapp: string, endereco?: string) => {
    const existe = clientes.find((c) => c.nome.toLowerCase() === nome.toLowerCase() || (whatsapp && c.whatsapp.replace(/\D/g, "") === whatsapp.replace(/\D/g, "")));
    if (!existe) {
      await criarCliente({ nome, whatsapp, endereco });
    }
  };

  // Handlers de Produtos (Tabela Oficial produtos)
  const criarProduto = async (dados: Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">) => {
    const novo: ProdutoCardapio = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      createdAt: new Date().toISOString(),
    };

    // 1. Enviar para o Supabase PRIMEIRO
    const { error } = await supabase.from("produtos").insert([
      {
        id: novo.id,
        user_id: user?.id || null,
        estabelecimento_codigo: activeCode,
        codigo: activeCode,
        store_id: activeCode,
        nome: novo.nome,
        name: novo.nome,
        descricao: novo.descricao,
        description: novo.descricao,
        preco: novo.preco,
        price: novo.preco,
        foto_url: novo.fotoUrl,
        image_url: novo.fotoUrl,
        categoria: novo.categoria,
        category: novo.categoria,
        ativo: novo.ativo !== false,
        is_active: novo.ativo !== false,
        tempo_preparo_horas: novo.tempoPreparoHoras || 24,
        prep_time_hours: novo.tempoPreparoHoras || 24,
      },
    ]);

    if (error) {
      console.error("[Supabase Error] Falha ao criar produto:", error);
      toast.error(`Falha ao salvar produto no banco: ${error.message || "Erro de conexão"}`);
      throw error; // Interrompe a submissão para não fechar o formulário nem atualizar o estado local
    }

    // 2. Atualizar estado visual (React) SOMENTE após sucesso no Supabase
    const atualizados = [novo, ...produtos];
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
    } catch {}
  };

  const editarProduto = async (id: string, dados: Partial<ProdutoCardapio>) => {
    // 1. Atualizar no Supabase PRIMEIRO
    const { error } = await supabase
      .from("produtos")
      .update({
        nome: dados.nome,
        name: dados.nome,
        descricao: dados.descricao,
        description: dados.descricao,
        preco: dados.preco,
        price: dados.preco,
        foto_url: dados.fotoUrl,
        image_url: dados.fotoUrl,
        categoria: dados.categoria,
        category: dados.categoria,
        ativo: dados.ativo,
        is_active: dados.ativo,
        tempo_preparo_horas: dados.tempoPreparoHoras,
        prep_time_hours: dados.tempoPreparoHoras,
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase Error] Falha ao editar produto:", error);
      toast.error(`Falha ao atualizar produto no banco: ${error.message || "Erro de conexão"}`);
      throw error; // Interrompe a submissão
    }

    // 2. Atualizar estado visual (React) SOMENTE após sucesso no Supabase
    const atualizados = produtos.map((p) => (p.id === id ? { ...p, ...dados } : p));
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
    } catch {}
  };

  const excluirProduto = async (id: string) => {
    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      console.error("[Supabase Error] Falha ao excluir produto:", error);
      toast.error(`Falha ao remover produto do banco: ${error.message}`);
      return;
    }

    const atualizados = produtos.filter((p) => p.id !== id);
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
    } catch {}
    toast.success("Produto removido do cardápio.");
  };

  // Handlers de Encomendas
  const criarEncomenda = async (dados: Omit<Encomenda, "id" | "estabelecimentoCodigo">) => {
    const item: Encomenda = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
    };

    // 1. Tentar salvar no Supabase PRIMEIRO (Tabela Oficial encomendas)
    const { error } = await supabase.from("encomendas").insert([
      {
        id: item.id,
        user_id: user?.id || null,
        estabelecimento_codigo: activeCode,
        codigo: activeCode,
        store_id: activeCode,
        cliente_id: item.clienteId,
        cliente_nome: item.clienteNome,
        customer_name: item.clienteNome,
        client_name: item.clienteNome,
        cliente_whatsapp: item.clienteWhatsapp,
        customer_phone: item.clienteWhatsapp,
        client_phone: item.clienteWhatsapp,
        data_entrega: item.dataEntrega,
        delivery_date: item.dataEntrega,
        horario_entrega: item.horarioEntrega,
        delivery_time: item.horarioEntrega,
        itens: item.itens,
        itens_detalhes: item.itensDetalhes || [],
        insumos_necessarios: item.insumosNecessarios || [],
        valor_total: Number(item.valorTotal) || 0,
        total_price: Number(item.valorTotal) || 0,
        total_amount: Number(item.valorTotal) || 0,
        amount: Number(item.valorTotal) || 0,
        valor_entrada: Number(item.valorEntrada) || 0,
        down_payment: Number(item.valorEntrada) || 0,
        historico_pagamentos: item.historicoPagamentos || item.paymentsHistory || [],
        payments_history: item.paymentsHistory || item.historicoPagamentos || [],
        status_pagamento: item.statusPagamento,
        payment_status: item.statusPagamento,
        status: item.status,
        tipo_entrega: item.tipoEntrega,
        delivery_type: item.tipoEntrega,
        endereco_entrega: item.enderecoEntrega,
        delivery_address: item.enderecoEntrega,
        observacoes: item.observacoes,
      },
    ]);

    if (error) {
      console.error("[Supabase Error] Falha ao criar encomenda:", error);
      toast.error(`Falha ao salvar no banco: ${error.message || "Erro desconhecido"}`);
      throw error; // Lança erro para interromper a submissão e não fechar o formulário
    }

    // 2. Atualizar estado local SOMENTE se a gravação no Supabase retornou sucesso
    const atualizadas = [item, ...encomendas];
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}
  };

  const editarEncomenda = async (id: string, dados: Partial<Encomenda>) => {
    // 1. Atualizar no Supabase PRIMEIRO
    const { error } = await supabase
      .from("encomendas")
      .update({
        cliente_id: dados.clienteId,
        cliente_nome: dados.clienteNome,
        customer_name: dados.clienteNome,
        client_name: dados.clienteNome,
        cliente_whatsapp: dados.clienteWhatsapp,
        customer_phone: dados.clienteWhatsapp,
        client_phone: dados.clienteWhatsapp,
        data_entrega: dados.dataEntrega,
        delivery_date: dados.dataEntrega,
        horario_entrega: dados.horarioEntrega,
        delivery_time: dados.horarioEntrega,
        itens: dados.itens,
        itens_detalhes: dados.itensDetalhes,
        insumos_necessarios: dados.insumosNecessarios,
        valor_total: Number(dados.valorTotal) || 0,
        total_price: Number(dados.valorTotal) || 0,
        total_amount: Number(dados.valorTotal) || 0,
        amount: Number(dados.valorTotal) || 0,
        valor_entrada: Number(dados.valorEntrada) || 0,
        down_payment: Number(dados.valorEntrada) || 0,
        historico_pagamentos: dados.historicoPagamentos || dados.paymentsHistory || [],
        payments_history: dados.paymentsHistory || dados.historicoPagamentos || [],
        status_pagamento: dados.statusPagamento,
        payment_status: dados.statusPagamento,
        status: dados.status,
        tipo_entrega: dados.tipoEntrega,
        delivery_type: dados.tipoEntrega,
        endereco_entrega: dados.enderecoEntrega,
        delivery_address: dados.enderecoEntrega,
        observacoes: dados.observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase Error] Falha ao atualizar encomenda:", error);
      toast.error(`Falha ao atualizar no banco: ${error.message || "Erro desconhecido"}`);
      throw error; // Lança erro para o formulário tratar
    }

    // 2. Atualizar estado local SOMENTE se o Supabase retornou sucesso
    const atualizadas = encomendas.map((e) => (e.id === id ? { ...e, ...dados } : e));
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}
  };

  const excluirEncomenda = async (id: string) => {
    const { error } = await supabase.from("encomendas").delete().eq("id", id);
    if (error) {
      console.error("[Supabase Error] Falha ao excluir encomenda:", error);
      toast.error(`Falha ao excluir no banco: ${error.message}`);
      return;
    }

    const atualizadas = encomendas.filter((e) => e.id !== id);
    setEncomendas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}
    toast.success("Encomenda excluída com sucesso.");
  };

  // Conciliação de Insumos Automática
  const conciliarInsumos = async (conciliacoes: { encomendaId: string; insumoId: string }[]) => {
    let novasEncomendas = [...encomendas];

    for (const { encomendaId, insumoId } of conciliacoes) {
      novasEncomendas = novasEncomendas.map((enc) => {
        if (enc.id !== encomendaId || !enc.insumosNecessarios) return enc;
        const insumosAtualizados = enc.insumosNecessarios.map((ins) =>
          ins.id === insumoId ? { ...ins, comprado: true } : ins
        );
        return { ...enc, insumosNecessarios: insumosAtualizados };
      });

      const encAlvo = novasEncomendas.find((e) => e.id === encomendaId);
      if (encAlvo) {
        try {
          await supabase
            .from("encomendas")
            .update({ insumos_necessarios: encAlvo.insumosNecessarios })
            .eq("id", encomendaId);
        } catch {}
      }
    }

    setEncomendas(novasEncomendas);
    try {
      localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify(novasEncomendas));
    } catch {}
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

  // Handlers de Despesas do Scanner (Tabela Única despesas)
  const salvarDespesa = async (dados: Omit<DespesaNotaFiscal, "id">) => {
    const item: DespesaNotaFiscal = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
    };

    const payload = {
      id: item.id,
      estabelecimento_codigo: activeCode,
      user_id: user?.id || null,
      fornecedor_nome: item.fornecedorNome,
      fornecedor_endereco: item.fornecedorEndereco || null,
      numero_nota: item.numeroNota || null,
      numero_pedido: item.numeroPedido || null,
      data_compra: item.dataCompra || new Date().toISOString().split("T")[0],
      hora_compra: item.horaCompra || "12:00",
      valor_total: item.valorTotal || 0,
      valor_producao: item.valorProducao || 0,
      valor_utensilios: item.valorUtensilios || 0,
      valor_consumo_proprio: item.valorConsumoProprio || 0,
      valor_outros: item.valorOutros || 0,
      itens: item.itens || [],
      comprovante_url: item.comprovanteUrl || null,
      metodo_pagamento: item.metodoPagamento || "dinheiro",
    };

    const { error } = await supabase.from("despesas").insert([payload]);

    if (error) {
      console.error("[Supabase Erro Despesa]:", error.message);
      toast.error(`Falha ao salvar notinha no Supabase: ${error.message}`);
      return;
    }

    const atualizadas = [item, ...despesas];
    setDespesas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}

    toast.success("Notinha salva no banco de dados com sucesso!");

    const custoEmpresa = item.valorProducao + item.valorUtensilios + item.valorOutros;
    if (custoEmpresa > 0) {
      await adicionarTransacao({
        descricao: `Compra Insumos / Notinha - ${item.fornecedorNome}`,
        valor: custoEmpresa,
        tipo: "despesa",
        categoria: "Insumos & Ingredientes (Produção)",
        data: item.dataCompra.split("-").reverse().join("/"),
        metodoPagamento: "pix",
        status: "concluida",
        clienteOuFornecedor: item.fornecedorNome,
      });
    }
  };

  const excluirDespesa = async (id: string) => {
    const notaTarget = despesas.find((d) => d.id === id);

    // Deleção simultânea em cascata na tabela despesas e na tabela transacoes_financeiras
    const reqDeleteDespesa = supabase.from("despesas").delete().eq("id", id);
    let reqDeleteTransacao: any = null;

    if (notaTarget) {
      const descMatch = `Compra Insumos / Notinha - ${notaTarget.fornecedorNome}`;
      reqDeleteTransacao = supabase
        .from("transacoes_financeiras")
        .delete()
        .or(`descricao.eq.${descMatch},cliente_ou_fornecedor.eq.${notaTarget.fornecedorNome}`);
    }

    const [resDespesa] = await Promise.all([
      reqDeleteDespesa,
      reqDeleteTransacao || Promise.resolve({ error: null }),
    ]);

    if (resDespesa.error) {
      toast.error(`Erro ao excluir notinha no Supabase: ${resDespesa.error.message}`);
      return;
    }

    const despesasAtualizadas = despesas.filter((d) => d.id !== id);
    setDespesas(despesasAtualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(despesasAtualizadas));
    } catch {}

    if (notaTarget) {
      const descMatch = `Compra Insumos / Notinha - ${notaTarget.fornecedorNome}`;
      const transacoesAtualizadas = transacoes.filter(
        (t) => t.descricao !== descMatch && t.clienteOuFornecedor !== notaTarget.fornecedorNome
      );
      setTransacoes(transacoesAtualizadas);
      try {
        localStorage.setItem(`caixadoce_transacoes_${activeCode}`, JSON.stringify(transacoesAtualizadas));
      } catch {}
    }

    toast.success("Notinha e lançamento financeiro em cascata excluídos com sucesso!");
  };

  const reenviarFinanceiro = async (despesa: DespesaNotaFiscal) => {
    const descMatch = `Compra Insumos / Notinha - ${despesa.fornecedorNome}`;

    try {
      const { data, error } = await supabase
        .from("transacoes_financeiras")
        .select("*")
        .or(`descricao.eq.${descMatch},cliente_ou_fornecedor.eq.${despesa.fornecedorNome}`);

      const existeRemoto = !error && Array.isArray(data) && data.length > 0;
      const existeLocal = transacoes.some(
        (t) => t.descricao === descMatch || t.clienteOuFornecedor === despesa.fornecedorNome
      );

      if (existeRemoto || existeLocal) {
        toast.info("Essa notinha já está registrada no seu financeiro. ℹ️");
        return;
      }

      const custoEmpresa =
        despesa.valorProducao + despesa.valorUtensilios + despesa.valorOutros > 0
          ? despesa.valorProducao + despesa.valorUtensilios + despesa.valorOutros
          : despesa.valorTotal;

      await adicionarTransacao({
        descricao: descMatch,
        valor: custoEmpresa,
        tipo: "despesa",
        categoria: "Insumos & Ingredientes (Produção)",
        data: despesa.dataCompra ? despesa.dataCompra.split("-").reverse().join("/") : new Date().toLocaleDateString("pt-BR"),
        metodoPagamento: despesa.metodoPagamento || "pix",
        status: "concluida",
        clienteOuFornecedor: despesa.fornecedorNome,
      });

      toast.success("Notinha enviada para o financeiro com sucesso! 🎉");
    } catch (err: any) {
      toast.error(`Erro ao reenviar notinha para o financeiro: ${err.message || err}`);
    }
  };

  const editarDespesa = async (id: string, dados: Partial<DespesaNotaFiscal>) => {
    const updatePayload: any = {};
    if (dados.fornecedorNome !== undefined) updatePayload.fornecedor_nome = dados.fornecedorNome;
    if (dados.fornecedorEndereco !== undefined) updatePayload.fornecedor_endereco = dados.fornecedorEndereco;
    if (dados.numeroNota !== undefined) updatePayload.numero_nota = dados.numeroNota;
    if (dados.dataCompra !== undefined) updatePayload.data_compra = dados.dataCompra;
    if (dados.horaCompra !== undefined) updatePayload.hora_compra = dados.horaCompra;
    if (dados.valorTotal !== undefined) updatePayload.valor_total = dados.valorTotal;
    if (dados.valorProducao !== undefined) updatePayload.valor_producao = dados.valorProducao;
    if (dados.valorUtensilios !== undefined) updatePayload.valor_utensilios = dados.valorUtensilios;
    if (dados.valorConsumoProprio !== undefined) updatePayload.valor_consumo_proprio = dados.valorConsumoProprio;
    if (dados.valorOutros !== undefined) updatePayload.valor_outros = dados.valorOutros;
    if (dados.itens !== undefined) updatePayload.itens = dados.itens;

    const { error } = await supabase.from("despesas").update(updatePayload).eq("id", id);
    if (error) {
      toast.error(`Erro ao atualizar notinha no Supabase: ${error.message}`);
      return;
    }

    const atualizadas = despesas.map((d) => (d.id === id ? { ...d, ...dados } : d));
    setDespesas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}
    toast.success("Dados da notinha atualizados com sucesso!");
  };

  const reatribuirEstabelecimentoDespesas = async (nomeAntigo: string, novoNome: string) => {
    if (!nomeAntigo || !novoNome || nomeAntigo === novoNome) return;

    const novoNomeTrim = novoNome.trim();
    const { error } = await supabase
      .from("despesas")
      .update({ fornecedor_nome: novoNomeTrim })
      .eq("fornecedor_nome", nomeAntigo);

    if (error) {
      toast.error(`Erro ao reatribuir fornecedor no Supabase: ${error.message}`);
      return;
    }

    const atualizadas = despesas.map((d) =>
      d.fornecedorNome === nomeAntigo ? { ...d, fornecedorNome: novoNomeTrim } : d
    );
    setDespesas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}
    toast.success(`Todas as notinhas de "${nomeAntigo}" foram reatribuídas para "${novoNomeTrim}"!`);
  };

  // Handlers de Transações Financeiras
  const adicionarTransacao = async (nova: Omit<TransacaoFinanceira, "id">) => {
    const item: TransacaoFinanceira = {
      ...nova,
      id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      estabelecimentoCodigo: activeCode,
      origem: nova.origem || "Manual",
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
          origem: item.origem,
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

  if (!isMounted || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">Conectando ao CaixaDoce...</p>
      </div>
    );
  }

  // 1. Não autenticado -> Renderiza a Landing Page na rota principal (/)
  if (!user) {
    return <LandingPageContent />;
  }

  // 2. Sem estabelecimento / perfil selecionado
  if (!profile) {
    return <ProfileSelectionView />;
  }

  return (
    <ScannerProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 sm:pb-12">
        {/* Header Principal do CaixaDoce em Lavanda Suave / Lilás Clean #F3EEF9 com Alto Contraste */}
        <header className="sticky top-0 z-40 bg-[#F3EEF9] text-[#2E1A47] shadow-xs border-b border-[#E8E0F2]">
          <div className="mx-auto max-w-6xl px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Bloco Esquerda: Logo + Nome da Loja + Badge CD-1001 */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <CaixaDoceLogo size="md" className="shrink-0" />
                
                <div className="border-l border-[#8E7CC3]/30 pl-2.5 sm:pl-3 min-w-0 flex items-center gap-2">
                  <p className="truncate text-xs sm:text-sm font-bold text-[#2E1A47] max-w-[140px] sm:max-w-[260px]" title={profile.establishmentName}>
                    {profile.establishmentName}
                  </p>
                  <span className="inline-block bg-[#7C3AED]/10 text-[#6D28D9] border border-[#7C3AED]/25 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold shrink-0">
                    {profile.establishmentCode}
                  </span>
                </div>
              </div>

              {/* Bloco Direita: Apenas Notificações + Sair/Logout */}
              <div className="flex items-center gap-2 shrink-0">
                <NotificationBell
                  transacoes={transacoes}
                  despesas={despesas}
                  establishmentCode={activeCode}
                  onNavigateTab={setActiveTab}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  title="Sair da Conta"
                  className="h-8 px-2 sm:px-3 text-xs text-[#2E1A47] hover:text-rose-600 bg-white/80 hover:bg-rose-500/10 border border-[#E8E0F2] shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 sm:mr-1.5 text-rose-500" />
                  <span className="hidden sm:inline font-bold">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

      {/* Banner Discreto de Leitura OCR em Background */}
      <ScannerProgressBanner activeTab={activeTab} onNavigateTab={setActiveTab} />

      {/* Conteúdo Principal / Tabs */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="hidden md:block -mx-4 overflow-x-auto px-4">
            <TabsList className="w-max bg-slate-200/80 border border-slate-300/60 p-1 rounded-xl">
              {podeAcessarAba("scanner") && (
                <TabsTrigger value="scanner" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Camera className="w-4 h-4" /> Escanear
                </TabsTrigger>
              )}
              {podeAcessarAba("despesas") && (
                <TabsTrigger value="despesas" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Layers className="w-4 h-4" /> Lista de Compras
                </TabsTrigger>
              )}
              {podeAcessarAba("encomendas") && (
                <TabsTrigger value="encomendas" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Package className="w-4 h-4" /> Encomendas
                </TabsTrigger>
              )}
              {podeAcessarAba("produtos") && (
                <TabsTrigger value="produtos" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Cake className="w-4 h-4" /> Cardápio
                </TabsTrigger>
              )}
              {podeAcessarAba("financeiro") && (
                <TabsTrigger value="financeiro" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <DollarSign className="w-4 h-4" /> Financeiro
                </TabsTrigger>
              )}
              {podeAcessarAba("config") && (
                <TabsTrigger value="config" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Settings className="w-4 h-4" /> Configurações
                </TabsTrigger>
              )}
              {podeAcessarAba("plano") && (
                <TabsTrigger value="plano" className="flex items-center gap-1.5 font-bold text-xs text-slate-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <CreditCard className="w-4 h-4" /> Meu Plano
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* 1. Tela Inicial: Escanear Notinha (com Conciliação Inteligente) */}
          <TabsContent value="scanner">
            {verificarAcessoModulo("scanner", infoPlano) ? (
              <ScannerView
                despesas={despesas}
                encomendas={encomendas}
                listasCompras={listasCompras}
                onSalvarDespesa={salvarDespesa}
                onEditarDespesa={editarDespesa}
                onExcluirDespesa={excluirDespesa}
                onReenviarFinanceiro={reenviarFinanceiro}
                onConciliarInsumos={conciliarInsumos}
              />
            ) : (
              <UpgradeBanner onIrParaPlano={() => setActiveTab("plano")} />
            )}
          </TabsContent>

          {/* 2. Aba Dedicada: Compras (Lista de Compras Interativa - Sempre Gratuita!) */}
          <TabsContent value="despesas">
            <DespesasView
              despesas={despesas}
              encomendas={encomendas}
              clientes={clientes}
              produtos={produtos}
              estabelecimentoCodigo={activeCode}
              onExcluirDespesa={excluirDespesa}
              onEditarDespesa={editarDespesa}
              onReatribuirEstabelecimento={reatribuirEstabelecimentoDespesas}
              listasCompras={listasCompras}
              onAtualizarListasCompras={setListasCompras}
            />
          </TabsContent>

          {/* 3. Encomendas & Calendário (com Histórico Permanente) */}
          <TabsContent value="encomendas">
            {verificarAcessoModulo("encomendas", infoPlano) ? (
              <OrdersView
                encomendas={encomendas}
                datasBloqueadas={datasBloqueadas}
                despesas={despesas}
                clientes={clientes}
                produtos={produtos}
                estabelecimentoNome={activeName}
                onCriarEncomenda={criarEncomenda}
                onEditarEncomenda={editarEncomenda}
                onExcluirEncomenda={excluirEncomenda}
                onBloquearData={bloquearData}
                onDesbloquearData={desbloquearData}
                onCriarClienteRapido={criarClienteRapido}
              />
            ) : (
              <UpgradeBanner onIrParaPlano={() => setActiveTab("plano")} />
            )}
          </TabsContent>

          {/* 4. Aba: Meus Produtos / Cardápio (ProductsView) */}
          <TabsContent value="produtos">
            {verificarAcessoModulo("produtos", infoPlano) ? (
              <ProductsView
                produtos={produtos}
                estabelecimentoCodigo={activeCode}
                onCriarProduto={criarProduto}
                onEditarProduto={editarProduto}
                onExcluirProduto={excluirProduto}
              />
            ) : (
              <UpgradeBanner onIrParaPlano={() => setActiveTab("plano")} />
            )}
          </TabsContent>

          {/* 6. Financeiro & Caixa */}
          <TabsContent value="financeiro">
            {verificarAcessoModulo("financeiro", infoPlano) ? (
              <FinanceiroTab
                transacoes={transacoes}
                despesas={despesas}
                encomendas={encomendas}
                establishmentCode={activeCode}
                onAdicionarTransacao={adicionarTransacao}
                onRemoverTransacao={removerTransacao}
                onAtualizarStatus={atualizarStatusTransacao}
                onEditarDespesa={editarDespesa}
                onReatribuirEstabelecimento={reatribuirEstabelecimentoDespesas}
              />
            ) : (
              <UpgradeBanner onIrParaPlano={() => setActiveTab("plano")} />
            )}
          </TabsContent>

          {/* 7. Configurações & Perfil (com sub-aba Equipe & Acessos) */}
          <TabsContent value="config">
            <ConfiguracoesTab onIrParaPlano={() => setActiveTab("plano")} />
          </TabsContent>

          {/* 8. Meu Plano (Stripe) — Último Item */}
          <TabsContent value="plano">
            <MeuPlanoTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Barra de Navegação Inferior Fixa para Dispositivos Móveis (Bottom Bar Compacta) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-purple-900/40 text-white md:hidden py-1 px-1 shadow-2xl">
        <div className="grid grid-cols-6 w-full items-center text-center">
          {podeAcessarAba("scanner") && (
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "scanner" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Camera className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Escanear</span>
            </button>
          )}

          {podeAcessarAba("despesas") && (
            <button
              onClick={() => setActiveTab("despesas")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "despesas" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Layers className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Compras</span>
            </button>
          )}

          {podeAcessarAba("encomendas") && (
            <button
              onClick={() => setActiveTab("encomendas")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "encomendas" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Package className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Encomendas</span>
            </button>
          )}

          {podeAcessarAba("produtos") && (
            <button
              onClick={() => setActiveTab("produtos")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "produtos" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Cake className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Cardápio</span>
            </button>
          )}

          {podeAcessarAba("financeiro") && (
            <button
              onClick={() => setActiveTab("financeiro")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "financeiro" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <DollarSign className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Financeiro</span>
            </button>
          )}

          {(podeAcessarAba("config") || podeAcessarAba("plano")) && (
            <button
              onClick={() => setActiveTab("config")}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === "config" || activeTab === "plano" ? "text-amber-400 bg-amber-500/15 font-bold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Settings className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Ajustes</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  </ScannerProvider>
);
}
