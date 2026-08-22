import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { ScannerProvider, useScanner } from "@/context/scanner-context";
import { supabase } from "@/integrations/supabase/client";

// Components
import { LoginView } from "@/components/auth/LoginView";
import { ProfileSelectionView } from "@/components/auth/ProfileSelectionView";
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
  const { user, profile, isMounted, logout, switchProfile } = useAuth();
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

  // 1. Carrega transações do Supabase / Cache Local com interceptação silenciosa de erros (400 / 404 / tabela inexistente)
  const safeFetchSupabase = useCallback(
    async (tableName: string, activeCode: string, orderColumn?: string, ascending = false): Promise<any[]> => {
      try {
        let query = supabase.from(tableName as any).select("*");
        if (activeCode) {
          query = query.eq("estabelecimento_codigo", activeCode);
        }
        if (orderColumn) {
          query = query.order(orderColumn, { ascending });
        }
        const res = await query;

        if (!res.error && res.data) return res.data;

        if (res.error) {
          // Se a coluna estabelecimento_codigo não existir na tabela (HTTP 400 / 42703), tenta sem o filtro
          if (res.error.code === "42703" || res.status === 400 || res.error.message?.includes("estabelecimento_codigo")) {
            try {
              let fallbackQuery = supabase.from(tableName as any).select("*");
              if (orderColumn) {
                fallbackQuery = fallbackQuery.order(orderColumn, { ascending });
              }
              const fallbackRes = await fallbackQuery;
              if (!fallbackRes.error && fallbackRes.data) {
                return fallbackRes.data;
              }
            } catch {}
          }
        }
        return [];
      } catch {
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
      const data = await safeFetchSupabase("orders", activeCode, "data_entrega", true);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_orders_${activeCode}`);
        if (raw) {
          setEncomendas(JSON.parse(raw));
        } else {
          setEncomendas([]);
          localStorage.setItem(`caixadoce_orders_${activeCode}`, JSON.stringify([]));
        }
      } else {
        const mapeadas: Encomenda[] = data.map((d: any) => ({
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
          statusPagamento: d.status_pagamento || "pendente",
          status: d.status || "pendente",
          observacoes: d.observacoes,
          enderecoEntrega: d.endereco_entrega,
          tipoEntrega: d.tipo_entrega || "retirada",
          createdAt: d.created_at,
        }));
        setEncomendas(mapeadas);
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

  // 3. Carrega Despesas do Scanner
  const fetchDespesas = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await safeFetchSupabase("expenses", activeCode, "data_compra", false);

      if (!data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_expenses_${activeCode}`);
        if (raw) {
          setDespesas(JSON.parse(raw));
        } else {
          setDespesas([]);
          localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify([]));
        }
      } else {
        const mapeadas: DespesaNotaFiscal[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo,
          fornecedorNome: d.fornecedor_nome,
          fornecedorEndereco: d.fornecedor_endereco,
          numeroNota: d.numero_nota,
          numeroPedido: d.numero_pedido,
          dataCompra: d.data_compra,
          horaCompra: d.hora_compra,
          valorTotal: Number(d.valor_total),
          valorProducao: Number(d.valor_producao),
          valorUtensilios: Number(d.valor_utensilios),
          valorConsumoProprio: Number(d.valor_consumo_proprio),
          valorOutros: Number(d.valor_outros),
          itens: Array.isArray(d.itens) ? d.itens : [],
          comprovanteUrl: d.comprovante_url,
          metodoPagamento: d.metodo_pagamento,
          createdAt: d.created_at,
        }));
        setDespesas(mapeadas);
      }
    } catch {}
  }, [activeCode, profile, safeFetchSupabase]);

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

  // 5. Carrega Produtos do Cardápio (Products)
  const fetchProdutos = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await safeFetchSupabase("products", activeCode, "name", true);

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
          estabelecimentoCodigo: p.estabelecimento_codigo,
          nome: p.name,
          descricao: p.description,
          preco: Number(p.price),
          fotoUrl: p.image_url,
          categoria: p.category,
          destaque: false,
          tempoPreparoHoras: p.prep_time_hours || 24,
          ativo: p.is_active !== false,
          createdAt: p.created_at,
        }));
        setProdutos(mapeados);
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
          data: d.data || new Date().toISOString().split("T")[0],
          status: d.status || "pendente",
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

  // Handlers de Produtos
  const criarProduto = async (dados: Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">) => {
    const novo: ProdutoCardapio = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      createdAt: new Date().toISOString(),
    };

    const atualizados = [novo, ...produtos];
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
      await supabase.from("products").insert([
        {
          id: novo.id,
          estabelecimento_codigo: activeCode,
          name: novo.nome,
          description: novo.descricao,
          price: novo.preco,
          image_url: novo.fotoUrl,
          category: novo.categoria,
          is_active: novo.ativo !== false,
          prep_time_hours: novo.tempoPreparoHoras || 24,
        },
      ]);
    } catch (e) {
      console.warn("Aviso ao salvar produto:", e);
    }
  };

  const editarProduto = async (id: string, dados: Partial<ProdutoCardapio>) => {
    const atualizados = produtos.map((p) => (p.id === id ? { ...p, ...dados } : p));
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
      await supabase
        .from("products")
        .update({
          name: dados.nome,
          description: dados.descricao,
          price: dados.preco,
          image_url: dados.fotoUrl,
          category: dados.categoria,
          is_active: dados.ativo,
          prep_time_hours: dados.tempoPreparoHoras,
        })
        .eq("id", id);
    } catch (e) {
      console.warn("Aviso ao editar produto:", e);
    }
  };

  const excluirProduto = async (id: string) => {
    const atualizados = produtos.filter((p) => p.id !== id);
    setProdutos(atualizados);
    try {
      localStorage.setItem(`caixadoce_cardapio_${activeCode}`, JSON.stringify(atualizados));
      await supabase.from("products").delete().eq("id", id);
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
          cliente_id: item.clienteId,
          cliente_nome: item.clienteNome,
          cliente_whatsapp: item.clienteWhatsapp,
          data_entrega: item.dataEntrega,
          horario_entrega: item.horarioEntrega,
          itens: item.itens,
          itens_detalhes: item.itensDetalhes || [],
          insumos_necessarios: item.insumosNecessarios || [],
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
          cliente_id: dados.clienteId,
          cliente_nome: dados.clienteNome,
          cliente_whatsapp: dados.clienteWhatsapp,
          data_entrega: dados.dataEntrega,
          horario_entrega: dados.horarioEntrega,
          itens: dados.itens,
          itens_detalhes: dados.itensDetalhes,
          insumos_necessarios: dados.insumosNecessarios,
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
            .from("orders")
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

  // Handlers de Despesas do Scanner
  const salvarDespesa = async (dados: Omit<DespesaNotaFiscal, "id">) => {
    const item: DespesaNotaFiscal = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
    };

    const atualizadas = [item, ...despesas];
    setDespesas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(atualizadas));
    } catch {}

    try {
      await supabase.from("expenses").insert([
        {
          id: item.id,
          estabelecimento_codigo: activeCode,
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
    } catch (e) {
      console.warn("Supabase insert expense warning:", e);
    }

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
    const atualizadas = despesas.filter((d) => d.id !== id);
    setDespesas(atualizadas);
    try {
      localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(atualizadas));
      await supabase.from("expenses").delete().eq("id", id);
    } catch {}
    toast.success("Registro de despesa excluído com sucesso.");
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
    <ScannerProvider>
      <div className="min-h-screen bg-background pb-16 sm:pb-12">
        {/* Header Principal do CaixaDoce em Lilás Suave / Lavanda Claro #F3EEF9 com Alto Contraste */}
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

            {/* Bloco Direita: Botões de Ação Fixados (Notificações, Trocar Loja, Sair) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <NotificationBell
                transacoes={transacoes}
                despesas={despesas}
                establishmentCode={activeCode}
                onNavigateTab={setActiveTab}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={switchProfile}
                title="Trocar Estabelecimento"
                className="h-8 px-2 sm:px-3 text-xs text-[#2E1A47] hover:text-[#7C3AED] bg-white/70 hover:bg-[#7C3AED]/10 border border-[#E8E0F2] shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5 text-[#7C3AED]" />
                <span className="hidden sm:inline font-bold">Trocar Loja</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Sair da Conta"
                className="h-8 px-2 sm:px-3 text-xs text-[#2E1A47] hover:text-rose-600 bg-white/70 hover:bg-rose-500/10 border border-[#E8E0F2] shrink-0"
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
            <TabsList className="w-max bg-muted/60 p-1 rounded-xl">
              {podeAcessarAba("scanner") && (
                <TabsTrigger value="scanner" className="flex items-center gap-1.5 font-semibold text-xs">
                  <Camera className="w-4 h-4 text-primary" /> Escanear
                </TabsTrigger>
              )}
              {podeAcessarAba("despesas") && (
                <TabsTrigger value="despesas" className="flex items-center gap-1.5 font-semibold text-xs">
                  <Layers className="w-4 h-4 text-primary" /> Lista de Compras
                </TabsTrigger>
              )}
              {podeAcessarAba("encomendas") && (
                <TabsTrigger value="encomendas" className="flex items-center gap-1.5 font-semibold text-xs">
                  <CalendarDays className="w-4 h-4 text-primary" /> Calendário
                </TabsTrigger>
              )}
              {podeAcessarAba("produtos") && (
                <TabsTrigger value="produtos" className="flex items-center gap-1.5 font-semibold text-xs">
                  <Cake className="w-4 h-4 text-primary" /> Cardápio
                </TabsTrigger>
              )}
              {podeAcessarAba("financeiro") && (
                <TabsTrigger value="financeiro" className="flex items-center gap-1.5 font-semibold text-xs">
                  <DollarSign className="w-4 h-4" /> Financeiro
                </TabsTrigger>
              )}
              {podeAcessarAba("config") && (
                <TabsTrigger value="config" className="flex items-center gap-1.5 font-semibold text-xs">
                  <Settings className="w-4 h-4" /> Configurações
                </TabsTrigger>
              )}
              {podeAcessarAba("plano") && (
                <TabsTrigger value="plano" className="flex items-center gap-1.5 font-semibold text-xs">
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
                establishmentCode={activeCode}
                onAdicionarTransacao={adicionarTransacao}
                onRemoverTransacao={removerTransacao}
                onAtualizarStatus={atualizarStatusTransacao}
              />
            ) : (
              <UpgradeBanner onIrParaPlano={() => setActiveTab("plano")} />
            )}
          </TabsContent>

          {/* 7. Configurações & Perfil (com sub-aba Equipe & Acessos) */}
          <TabsContent value="config">
            <ConfiguracoesTab />
          </TabsContent>

          {/* 8. Meu Plano (Stripe) — Último Item */}
          <TabsContent value="plano">
            <MeuPlanoTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Barra de Navegação Inferior Fixa para Dispositivos Móveis (Bottom Bar Compacta) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950/95 backdrop-blur-md border-t border-amber-900/30 text-white md:hidden py-1 px-1 shadow-2xl">
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
              <CalendarDays className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[9px] leading-none truncate w-full">Agenda</span>
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
