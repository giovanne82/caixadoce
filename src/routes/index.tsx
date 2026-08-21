import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

// Components
import { LoginView } from "@/components/auth/LoginView";
import { ProfileSelectionView } from "@/components/auth/ProfileSelectionView";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { ScannerView } from "@/components/caixadoce/ScannerView";
import { DespesasView } from "@/components/caixadoce/DespesasView";
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
  Camera,
  Layers,
  CalendarDays,
  DollarSign,
  Users,
  CreditCard,
  Settings,
  LogOut,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TransacaoFinanceira,
  type StatusTransacao,
  type Encomenda,
  type DataBloqueada,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaixaDoce — Escanear Notinhas, Despesas & Encomendas" },
      { name: "description", content: "Sistema inteligente para scanner de cupons, conciliação de insumos e encomendas de confeitaria." },
      { property: "og:title", content: "CaixaDoce — Gestão Inteligente" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile, isMounted, logout, switchProfile } = useAuth();
  // Scanner é a tela inicial padrão
  const [activeTab, setActiveTab] = useState<string>("scanner");
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<DataBloqueada[]>([]);
  const [despesas, setDespesas] = useState<DespesaNotaFiscal[]>([]);

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
          const hoje = new Date().toISOString().split("T")[0];
          const demoOrders: Encomenda[] = [
            {
              id: "ord-1",
              estabelecimentoCodigo: activeCode,
              clienteNome: "Camila Guimarães",
              clienteWhatsapp: "(11) 98765-4321",
              dataEntrega: hoje,
              horarioEntrega: "15:30",
              itens: "1x Bolo Red Velvet 2kg, 30x Brigadeiros Belga",
              insumosNecessarios: [
                { id: "ins-tag-1", nome: "Leite Condensado Moça 395g", comprado: false },
                { id: "ins-tag-2", nome: "Cobertura Harald Melken Ao Leite", comprado: false },
                { id: "ins-tag-3", nome: "Chantilly Norcau Chanty 1L", comprado: true },
              ],
              valorTotal: 180.0,
              valorEntrada: 90.0,
              statusPagamento: "sinal_pago",
              status: "em_producao",
              tipoEntrega: "retirada",
              observacoes: "Vela decorativa dourada inclusa",
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
    } catch (e) {
      console.warn("Erro ao buscar encomendas:", e);
    }

    try {
      const { data, error } = await supabase
        .from("datas_bloqueadas")
        .select("*")
        .eq("estabelecimento_codigo", activeCode);

      if (error || !data || data.length === 0) {
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
    } catch (e) {
      console.warn("Erro ao buscar datas bloqueadas:", e);
    }
  }, [activeCode, profile]);

  // 3. Carrega Despesas do Scanner
  const fetchDespesas = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .order("data_compra", { ascending: false });

      if (error || !data || data.length === 0) {
        const raw = localStorage.getItem(`caixadoce_expenses_${activeCode}`);
        if (raw) {
          setDespesas(JSON.parse(raw));
        } else {
          const demoDespesas: DespesaNotaFiscal[] = [
            {
              id: "exp-1",
              estabelecimentoCodigo: activeCode,
              fornecedorNome: "ArtFesta Confeitaria & Embalagens",
              fornecedorEndereco: "Av. das Américas, 1200 - Centro",
              numeroNota: "NFC-e 000.142.890",
              numeroPedido: "PED-84920",
              dataCompra: new Date().toISOString().split("T")[0],
              horaCompra: "14:35:10",
              valorTotal: 289.40,
              valorProducao: 245.00,
              valorUtensilios: 44.40,
              valorConsumoProprio: 0.00,
              valorOutros: 0.00,
              itens: [
                {
                  id: "it-1",
                  nome: "LEITE CONDENSADO MOÇA 395G",
                  quantidade: 24,
                  valorUnitario: 6.89,
                  valorTotal: 165.36,
                  categoria: "producao",
                },
                {
                  id: "it-2",
                  nome: "COBERTURA SICAO AO LEITE 1.01KG",
                  quantidade: 2,
                  valorUnitario: 39.82,
                  valorTotal: 79.64,
                  categoria: "producao",
                },
                {
                  id: "it-3",
                  nome: "CAKE BOARD MDF REDONDO 25CM",
                  quantidade: 8,
                  valorUnitario: 5.55,
                  valorTotal: 44.40,
                  categoria: "utensilios",
                },
              ],
            },
          ];
          setDespesas(demoDespesas);
          localStorage.setItem(`caixadoce_expenses_${activeCode}`, JSON.stringify(demoDespesas));
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
    } catch (e) {
      console.warn("Erro ao buscar despesas:", e);
    }
  }, [activeCode, profile]);

  useEffect(() => {
    fetchTransacoes();
    fetchEncomendasECalendario();
    fetchDespesas();
  }, [fetchTransacoes, fetchEncomendasECalendario, fetchDespesas]);

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
          cliente_nome: dados.clienteNome,
          cliente_whatsapp: dados.clienteWhatsapp,
          data_entrega: dados.dataEntrega,
          horario_entrega: dados.horarioEntrega,
          itens: dados.itens,
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

      // Atualiza no Supabase
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

    // 1. Salva na tabela expenses do Supabase com metadados
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

    // 2. Lança automaticamente no fluxo de caixa (Financeiro)
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
              <TabsTrigger value="scanner" className="flex items-center gap-1.5 font-semibold text-xs">
                <Camera className="w-4 h-4 text-primary" /> Escanear Notinha
              </TabsTrigger>
              <TabsTrigger value="despesas" className="flex items-center gap-1.5 font-semibold text-xs">
                <Layers className="w-4 h-4 text-primary" /> Despesas
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

          {/* 1. Tela Inicial: Escanear Notinha (com Conciliação Inteligente) */}
          <TabsContent value="scanner">
            <ScannerView
              despesas={despesas}
              encomendas={encomendas}
              onSalvarDespesa={salvarDespesa}
              onConciliarInsumos={conciliarInsumos}
            />
          </TabsContent>

          {/* 2. Aba Dedicada: Despesas */}
          <TabsContent value="despesas">
            <DespesasView
              despesas={despesas}
              onExcluirDespesa={excluirDespesa}
            />
          </TabsContent>

          {/* 3. Encomendas & Calendário & Lista de Compras */}
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

          {/* 4. Financeiro & Caixa */}
          <TabsContent value="financeiro">
            <FinanceiroTab
              transacoes={transacoes}
              onAdicionarTransacao={adicionarTransacao}
              onRemoverTransacao={removerTransacao}
              onAtualizarStatus={atualizarStatusTransacao}
            />
          </TabsContent>

          {/* 5. Equipe & Acessos */}
          <TabsContent value="colaboradores">
            <ColaboradoresTab />
          </TabsContent>

          {/* 6. Meu Plano (Stripe) */}
          <TabsContent value="plano">
            <MeuPlanoTab />
          </TabsContent>

          {/* 7. Configurações & Perfil */}
          <TabsContent value="config">
            <ConfiguracoesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
