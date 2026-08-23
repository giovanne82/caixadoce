import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Clock,
  MessageCircle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Truck,
  Store,
  Edit2,
  Trash2,
  CalendarDays,
  Tag,
  X,
  ShoppingCart,
  Check,
  Send,
  Cake,
  User,
  Receipt,
  FileText,
  Building2,
  Eye,
  Link2,
  Unlink,
  Cookie,
  UtensilsCrossed,
  Package,
  MapPin,
} from "lucide-react";
import {
  formatarMoeda,
  formatarWhatsappLink,
  gerarMensagemResumoWhatsApp,
  aplicarMascaraTelefone,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  obterCatalogoInsumos,
  salvarNovoInsumoCatalogo,
  obterClientes,
  obterProdutosCardapio,
  obterNotinhasVinculadasPorLista,
  salvarNotinhasVinculadasPorLista,
  STATUS_ENCOMENDA_CONFIG,
  CATEGORIAS_DESPESA_CONFIG,
  type Encomenda,
  type DataBloqueada,
  type StatusEncomenda,
  type StatusPagamentoEncomenda,
  type InsumoNecessarioPedido,
  type ItemPedidoEncomenda,
  type Cliente,
  type ProdutoCardapio,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface OrdersViewProps {
  encomendas: Encomenda[];
  datasBloqueadas: DataBloqueada[];
  despesas?: DespesaNotaFiscal[];
  clientes?: Cliente[];
  produtos?: ProdutoCardapio[];
  estabelecimentoNome?: string;
  onCriarEncomenda: (dados: Omit<Encomenda, "id" | "estabelecimentoCodigo">) => Promise<void>;
  onEditarEncomenda: (id: string, dados: Partial<Encomenda>) => Promise<void>;
  onExcluirEncomenda: (id: string) => Promise<void>;
  onBloquearData: (data: string, motivo: string) => Promise<void>;
  onDesbloquearData: (id: string) => Promise<void>;
  onCriarClienteRapido?: (nome: string, whatsapp: string, endereco?: string) => Promise<void>;
}

function obterEstiloPilula(status: StatusEncomenda) {
  switch (status) {
    case "pendente":
    case "em_producao":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
    case "pronta":
    case "entregue":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25";
    case "cancelada":
      return "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function OrdersView({
  encomendas,
  datasBloqueadas,
  despesas = [],
  clientes = [],
  produtos = [],
  estabelecimentoNome = "CaixaDoce",
  onCriarEncomenda,
  onEditarEncomenda,
  onExcluirEncomenda,
  onBloquearData,
  onDesbloquearData,
  onCriarClienteRapido,
}: OrdersViewProps) {
  // Modos de Visualização: 'lista' | 'semana' | 'mes' | 'compras'
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "lista" | "compras">("lista");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Aba dentro da Lista de Compras: 'hoje' | 'semana' | 'encomenda'
  const [abaCompras, setAbaCompras] = useState<"hoje" | "semana" | "encomenda">("semana");

  // Painel Lateral (Drawer) do Dia Selecionado
  const [selectedDrawerDate, setSelectedDrawerDate] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modais
  const [modalEncomendaOpen, setModalEncomendaOpen] = useState(false);
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notinhas Vinculadas especificamente por Lista/Encomenda { [shoppingListId]: string[] }
  const [linkedMap, setLinkedMap] = useState<Record<string, string[]>>({});
  const [buscaNotinhaMap, setBuscaNotinhaMap] = useState<Record<string, string>>({});
  const [dropdownAbertoMap, setDropdownAbertoMap] = useState<Record<string, boolean>>({});
  const [notaDetalheSelecionada, setNotaDetalheSelecionada] = useState<DespesaNotaFiscal | null>(null);

  // Carregar vinculações do Supabase no mount por lista
  useEffect(() => {
    async function carregarNotinhasPorLista() {
      try {
        const { data, error } = await supabase
          .from("shopping_list_receipts")
          .select("shopping_list_id, receipt_id")
          .eq("estabelecimento_codigo", "CD-1001");

        if (!error && data && data.length > 0) {
          const map: Record<string, string[]> = {};
          data.forEach((row: any) => {
            const listId = row.shopping_list_id || "global";
            const rId = String(row.receipt_id);
            if (!map[listId]) map[listId] = [];
            if (!map[listId].includes(rId)) map[listId].push(rId);
          });
          setLinkedMap(map);
        } else {
          const map: Record<string, string[]> = {};
          encomendas.forEach((e) => {
            const localIds = obterNotinhasVinculadasPorLista(e.id, "CD-1001");
            if (localIds.length > 0) map[e.id] = localIds;
          });
          setLinkedMap(map);
        }
      } catch {}
    }
    carregarNotinhasPorLista();
  }, [encomendas]);

  // Handlers para Vincular / Desvincular Notinha em Lista Específica
  const handleVincularNotinhaLista = async (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    if (atuais.includes(receiptId)) return;

    const novosIds = [...atuais, receiptId];
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, "CD-1001");
    setBuscaNotinhaMap((prev) => ({ ...prev, [shoppingListId]: "" }));
    setDropdownAbertoMap((prev) => ({ ...prev, [shoppingListId]: false }));

    try {
      await supabase.from("shopping_list_receipts").insert([
        {
          estabelecimento_codigo: "CD-1001",
          shopping_list_id: shoppingListId,
          receipt_id: receiptId,
        },
      ]);
    } catch (e) {
      console.warn("Aviso ao vincular no Supabase:", e);
    }
    toast.success("Notinha vinculada a este pedido!");
  };

  const handleDesvincularNotinhaLista = async (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    const novosIds = atuais.filter((id) => id !== receiptId);
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, "CD-1001");

    try {
      await supabase
        .from("shopping_list_receipts")
        .delete()
        .eq("estabelecimento_codigo", "CD-1001")
        .eq("shopping_list_id", shoppingListId)
        .eq("receipt_id", receiptId);
    } catch (e) {
      console.warn("Aviso ao desvincular do Supabase:", e);
    }
    toast.info("Notinha desvinculada deste pedido.");
  };

  // Sugestões de Notinhas para uma Lista Específica
  const obterSugestoesParaLista = (shoppingListId: string) => {
    const termo = (buscaNotinhaMap[shoppingListId] || "").trim().toLowerCase();
    const vinculadosDaLista = linkedMap[shoppingListId] || [];
    return despesas.filter((d) => {
      if (vinculadosDaLista.includes(d.id)) return false;
      if (!termo) return true;
      const fornecedorMatch = d.fornecedorNome.toLowerCase().includes(termo);
      const dataMatch =
        d.dataCompra.toLowerCase().includes(termo) ||
        d.dataCompra.split("-").reverse().join("/").includes(termo);
      const valorMatch =
        String(d.valorTotal).includes(termo) ||
        formatarMoeda(d.valorTotal).toLowerCase().includes(termo);
      const notaMatch = (d.numeroNota || "").toLowerCase().includes(termo);
      const pedidoMatch = (d.numeroPedido || "").toLowerCase().includes(termo);
      return fornecedorMatch || dataMatch || valorMatch || notaMatch || pedidoMatch;
    }).slice(0, 8);
  };

  // Catálogo de Insumos & Produtos & Clientes
  const catalogoInsumos = useMemo(() => obterCatalogoInsumos("CD-1001"), []);
  const listaProdutos = useMemo(() => (produtos.length > 0 ? produtos : obterProdutosCardapio("CD-1001")), [produtos]);
  const listaClientes = useMemo(() => (clientes.length > 0 ? clientes : obterClientes("CD-1001")), [clientes]);

  // Autocomplete de Clientes
  const [dropdownClientesAberto, setDropdownClientesAberto] = useState(false);

  // Tags de Itens do Pedido (Produtos Conectados)
  const [itensTags, setItensTags] = useState<ItemPedidoEncomenda[]>([]);
  const [buscaItemProduto, setBuscaItemProduto] = useState("");
  const [dropdownItensAberto, setDropdownItensAberto] = useState(false);

  // Tags de Insumos (ArtFesta)
  const [insumosTags, setInsumosTags] = useState<InsumoNecessarioPedido[]>([]);
  const [buscaTagInsumo, setBuscaTagInsumo] = useState("");
  const [dropdownInsumosAberto, setDropdownInsumosAberto] = useState(false);

  // Filtros da Lista
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");

  // Formulário de Encomenda
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEntrega, setHorarioEntrega] = useState("14:00");
  const [valorTotalFormatado, setValorTotalFormatado] = useState("");
  const [valorEntradaFormatado, setValorEntradaFormatado] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Formulário de Bloqueio de Data
  const [dataBloqueio, setDataBloqueio] = useState(new Date().toISOString().split("T")[0]);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Agenda Lotada");

  // Sugestões de Clientes
  const sugestoesClientes = useMemo(() => {
    const termo = clienteNome.trim().toLowerCase();
    if (!termo) return [];
    return listaClientes.filter(
      (c) => c.nome.toLowerCase().includes(termo) || c.whatsapp.includes(termo)
    ).slice(0, 5);
  }, [clienteNome, listaClientes]);

  // Sugestões de Produtos para Itens do Pedido
  const sugestoesProdutos = useMemo(() => {
    const termo = buscaItemProduto.trim().toLowerCase();
    if (!termo) return [];
    return listaProdutos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo)
    ).slice(0, 8);
  }, [buscaItemProduto, listaProdutos]);

  // Sugestões de Insumos ArtFesta
  const sugestoesInsumos = useMemo(() => {
    const termo = buscaTagInsumo.trim().toLowerCase();
    if (!termo) return [];
    return catalogoInsumos.filter(
      (i) => i.nome.toLowerCase().includes(termo) || i.categoria.toLowerCase().includes(termo)
    ).slice(0, 8);
  }, [buscaTagInsumo, catalogoInsumos]);

  // Selecionar Cliente Existente
  const handleSelecionarCliente = (cli: Cliente) => {
    setClienteId(cli.id);
    setClienteNome(cli.nome);
    setClienteWhatsapp(aplicarMascaraTelefone(cli.whatsapp));
    if (cli.endereco) {
      setEnderecoEntrega(cli.endereco);
    }
    setDropdownClientesAberto(false);
  };

  // Manipulação de Itens Pedidos (Tags de Produtos)
  const handleAdicionarItemPedido = (nomeItem: string, precoSugerido?: number, produtoId?: string) => {
    const nomeLimpo = nomeItem.trim();
    if (!nomeLimpo) return;

    const existente = itensTags.find((it) => it.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existente) {
      setItensTags((prev) =>
        prev.map((it) => (it.id === existente.id ? { ...it, quantidade: it.quantidade + 1 } : it))
      );
    } else {
      const novoItem: ItemPedidoEncomenda = {
        id: crypto.randomUUID(),
        produtoId,
        nome: nomeLimpo,
        quantidade: 1,
        precoUnitario: precoSugerido || 0,
      };
      setItensTags((prev) => [...prev, novoItem]);
    }

    if (precoSugerido && precoSugerido > 0) {
      const valorAtual = converterMoedaInputParaNumero(valorTotalFormatado);
      const novoValor = valorAtual + precoSugerido;
      setValorTotalFormatado(aplicarMascaraMoedaInput(String(Math.round(novoValor * 100))));
    }

    setBuscaItemProduto("");
    setDropdownItensAberto(false);
  };

  const handleAlterarQuantidadeItem = (itemId: string, novaQtd: number) => {
    if (novaQtd <= 0) {
      handleRemoverItemPedido(itemId);
      return;
    }
    setItensTags((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantidade: novaQtd } : it))
    );
  };

  const handleRemoverItemPedido = (itemId: string) => {
    setItensTags((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Manipulação de Insumos (ArtFesta)
  const handleAdicionarInsumo = (nomeInsumo: string) => {
    const nomeLimpo = nomeInsumo.trim();
    if (!nomeLimpo) return;

    if (insumosTags.some((t) => t.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      toast.info("Este insumo já foi adicionado.");
      setBuscaTagInsumo("");
      setDropdownInsumosAberto(false);
      return;
    }

    const novaTag: InsumoNecessarioPedido = {
      id: crypto.randomUUID(),
      nome: nomeLimpo,
      quantidade: 1,
      comprado: false,
    };

    setInsumosTags((prev) => [...prev, novaTag]);
    salvarNovoInsumoCatalogo("CD-1001", nomeLimpo);
    setBuscaTagInsumo("");
    setDropdownInsumosAberto(false);
  };

  const handleAlterarQuantidadeInsumo = (tagId: string, novaQtd: number | string) => {
    setInsumosTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, quantidade: novaQtd } : t))
    );
  };

  const handleRemoverInsumo = (tagId: string) => {
    setInsumosTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  // Abrir Modal de Criação
  const handleAbrirNovaEncomenda = (dataPredefinida?: string) => {
    setEditingId(null);
    setClienteId(undefined);
    setClienteNome("");
    setClienteWhatsapp("");
    setDataEntrega(dataPredefinida || new Date().toISOString().split("T")[0]);
    setHorarioEntrega("14:00");
    setItensTags([]);
    setValorTotalFormatado("");
    setValorEntradaFormatado("");
    setInsumosTags([]);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setDropdownClientesAberto(false);
    setDropdownItensAberto(false);
    setDropdownInsumosAberto(false);
    setTipoEntrega("retirada");
    setEnderecoEntrega("");
    setObservacoes("");
    setModalEncomendaOpen(true);
  };

  // Abrir Modal de Edição
  const handleAbrirEdicao = (ord: Encomenda) => {
    setEditingId(ord.id);
    setClienteId(ord.clienteId);
    setClienteNome(ord.clienteNome);
    setClienteWhatsapp(aplicarMascaraTelefone(ord.clienteWhatsapp));
    setDataEntrega(ord.dataEntrega);
    setHorarioEntrega(ord.horarioEntrega || "14:00");

    if (ord.itensDetalhes && ord.itensDetalhes.length > 0) {
      setItensTags(ord.itensDetalhes);
    } else if (ord.itens) {
      setItensTags([{ id: crypto.randomUUID(), nome: ord.itens, quantidade: 1 }]);
    } else {
      setItensTags([]);
    }

    setValorTotalFormatado(ord.valorTotal ? `R$ ${(ord.valorTotal).toFixed(2).replace(".", ",")}` : "");
    setValorEntradaFormatado(ord.valorEntrada ? `R$ ${(ord.valorEntrada).toFixed(2).replace(".", ",")}` : "");
    setInsumosTags(ord.insumosNecessarios || []);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setTipoEntrega(ord.tipoEntrega || "retirada");
    setEnderecoEntrega(ord.enderecoEntrega || "");
    setObservacoes(ord.observacoes || "");
    setModalEncomendaOpen(true);
  };

  // Salvar Encomenda
  const handleSalvarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = converterMoedaInputParaNumero(valorTotalFormatado);
    const entradaNum = converterMoedaInputParaNumero(valorEntradaFormatado);

    if (!clienteNome || itensTags.length === 0 || valorNum <= 0) {
      toast.error("Preencha o cliente, adicione ao menos 1 item e informe o valor total.");
      return;
    }

    try {
      const statusPag: StatusPagamentoEncomenda =
        entradaNum >= valorNum
          ? "pago_integral"
          : entradaNum > 0
          ? "sinal_pago"
          : "pendente";

      const resumoItens = itensTags.map((it) => `${it.quantidade}x ${it.nome}`).join(", ");

      const payload = {
        clienteId,
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens: resumoItens,
        itensDetalhes: itensTags,
        insumosNecessarios: insumosTags,
        valorTotal: valorNum,
        valorEntrada: entradaNum,
        statusPagamento: statusPag,
        status: "pendente" as StatusEncomenda,
        tipoEntrega,
        enderecoEntrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        observacoes,
      };

      if (editingId) {
        await onEditarEncomenda(editingId, payload);
        toast.success("Encomenda atualizada com sucesso!");
      } else {
        await onCriarEncomenda(payload);
        toast.success("Nova encomenda cadastrada com sucesso!");
      }

      if (onCriarClienteRapido && !clienteId && clienteNome && clienteWhatsapp) {
        onCriarClienteRapido(clienteNome, clienteWhatsapp, enderecoEntrega);
      }

      setModalEncomendaOpen(false);
    } catch {
      toast.error("Erro ao salvar encomenda.");
    }
  };

  // Enviar Resumo Formatado no WhatsApp para o Cliente
  const handleEnviarResumoWhatsApp = (ord: Encomenda) => {
    if (!ord.clienteWhatsapp) {
      toast.error("Esta encomenda não possui número de WhatsApp cadastrado.");
      return;
    }

    const mensagem = gerarMensagemResumoWhatsApp(ord, estabelecimentoNome);
    const url = formatarWhatsappLink(ord.clienteWhatsapp, mensagem);
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  // Alternar Insumo Comprado/Pendente
  const handleToggleInsumoComprado = async (encomendaId: string, insumoId: string) => {
    const enc = encomendas.find((e) => e.id === encomendaId);
    if (!enc || !enc.insumosNecessarios) return;

    const insumosAtualizados = enc.insumosNecessarios.map((ins) =>
      ins.id === insumoId ? { ...ins, comprado: !ins.comprado } : ins
    );

    await onEditarEncomenda(encomendaId, { insumosNecessarios: insumosAtualizados });
    toast.success("Status do insumo atualizado!");
  };

  // Salvar Bloqueio de Data
  const handleSalvarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataBloqueio) return;

    try {
      await onBloquearData(dataBloqueio, motivoBloqueio);
      toast.success(`Data ${dataBloqueio} bloqueada no calendário.`);
      setModalBloqueioOpen(false);
    } catch {
      toast.error("Erro ao bloquear data.");
    }
  };

  // Abrir Painel Lateral do Dia
  const handleAbrirDrawerDia = (dataIso: string) => {
    setSelectedDrawerDate(dataIso);
    setDrawerOpen(true);
  };

  const encomendasDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return [];
    return encomendas.filter((e) => e.dataEntrega === selectedDrawerDate);
  }, [encomendas, selectedDrawerDate]);

  const bloqueioDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return null;
    return datasBloqueadas.find((b) => b.data === selectedDrawerDate) || null;
  }, [datasBloqueadas, selectedDrawerDate]);

  // Lista Filtrada para a Tabela
  const encomendasFiltradas = useMemo(() => {
    return encomendas.filter((e) => {
      const matchPagamento = filtroPagamento === "todos" || e.statusPagamento === filtroPagamento;
      const matchBusca =
        !busca ||
        e.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
        e.itens.toLowerCase().includes(busca.toLowerCase()) ||
        e.clienteWhatsapp.includes(busca);
      return matchPagamento && matchBusca;
    });
  }, [encomendas, filtroPagamento, busca]);

  // Navegação de Período
  const navegarPeriodo = (delta: number) => {
    const nova = new Date(currentDate);
    if (viewMode === "mes") {
      nova.setMonth(nova.getMonth() + delta);
    } else {
      nova.setDate(nova.getDate() + delta * 7);
    }
    setCurrentDate(nova);
  };

  // Grid do Calendário Mensal
  const diasDoMesGrid = useMemo(() => {
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();

    const dias = [];

    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const diaNum = ultimoDiaMesAnterior - i;
      const dataIso = new Date(ano, mes - 1, diaNum).toISOString().split("T")[0];
      dias.push({ dataIso, diaNum, foraDoMes: true });
    }

    for (let i = 1; i <= ultimoDiaMes; i++) {
      const dataIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      dias.push({ dataIso, diaNum: i, foraDoMes: false });
    }

    const restante = 42 - dias.length;
    for (let i = 1; i <= (restante > 7 ? restante - 7 : restante); i++) {
      const dataIso = new Date(ano, mes + 1, i).toISOString().split("T")[0];
      dias.push({ dataIso, diaNum: i, foraDoMes: true });
    }

    return dias;
  }, [currentDate]);

  // Grid Semanal
  const diasDaSemanaGrid = useMemo(() => {
    const inicio = new Date(currentDate);
    const diaSemana = inicio.getDay();
    inicio.setDate(inicio.getDate() - diaSemana);

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const dataIso = d.toISOString().split("T")[0];
      dias.push({
        dataIso,
        diaNum: d.getDate(),
        nomeSemana: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i],
      });
    }
    return dias;
  }, [currentDate]);

  const nomeMesAno = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Processamento da Lista de Compras
  const listaComprasDados = useMemo(() => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const agora = new Date();
    const seteDiasDepois = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const ativas = encomendas.filter((e) => e.status !== "cancelada" && e.status !== "entregue");

    let filtradas = ativas;
    if (abaCompras === "hoje") {
      filtradas = ativas.filter((e) => e.dataEntrega === hojeStr);
    } else if (abaCompras === "semana") {
      filtradas = ativas.filter((e) => e.dataEntrega >= hojeStr && e.dataEntrega <= seteDiasDepois);
    }

    const todosInsumos: { encomendaId: string; clienteNome: string; dataEntrega: string; insumo: InsumoNecessarioPedido }[] = [];

    for (const enc of filtradas) {
      if (enc.insumosNecessarios && enc.insumosNecessarios.length > 0) {
        for (const ins of enc.insumosNecessarios) {
          todosInsumos.push({
            encomendaId: enc.id,
            clienteNome: enc.clienteNome,
            dataEntrega: enc.dataEntrega,
            insumo: ins,
          });
        }
      }
    }

    const totalInsumos = todosInsumos.length;
    const comprados = todosInsumos.filter((i) => i.insumo.comprado).length;
    const pendentes = totalInsumos - comprados;

    return {
      encomendasComInsumos: filtradas,
      todosInsumos,
      totalInsumos,
      comprados,
      pendentes,
    };
  }, [encomendas, abaCompras]);

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Encomendas &amp; Calendário <CalendarDays className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie datas de entrega, produtos pedidos e envie resumo no WhatsApp com 1 clique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalBloqueioOpen(true)}
            className="text-xs border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Bloquear Data
          </Button>

          <Button
            onClick={() => {
              setEditingId(null);
              setClienteNome("");
              setClienteWhatsapp("");
              setItensTags([]);
              setInsumosTags([]);
              setValorTotalFormatado("");
              setValorEntradaFormatado("");
              setModalEncomendaOpen(true);
            }}
            size="sm"
            className="font-bold shadow-md text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Encomenda
          </Button>
        </div>
      </div>

      {/* Barra de Controle de Visualização */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto">
          <Button
            variant={viewMode === "lista" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("lista")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Lista Completa
          </Button>
          <Button
            variant={viewMode === "semana" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("semana")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Semanal
          </Button>
          <Button
            variant={viewMode === "mes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("mes")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Mensal
          </Button>
          <Button
            variant={viewMode === "compras" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("compras")}
            className="h-7 text-xs font-semibold shrink-0 text-amber-600 dark:text-amber-400"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Lista de Compras / Produção
          </Button>
        </div>

        {(viewMode === "mes" || viewMode === "semana") && (
          <div className="flex items-center gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarPeriodo(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-foreground capitalize px-2 min-w-[140px] text-center">
              {nomeMesAno}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarPeriodo(1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs h-8 text-primary"
            >
              Hoje
            </Button>
          </div>
        )}

        {viewMode === "lista" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, item..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Pagamentos</SelectItem>
                <SelectItem value="pendente">Pendente (0%)</SelectItem>
                <SelectItem value="sinal_pago">Sinal Pago (50%)</SelectItem>
                <SelectItem value="pago_integral">100% Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO EM CALENDÁRIO MENSAL */}
      {/* ========================================================================= */}
      {viewMode === "mes" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-muted/10">
            {diasDoMesGrid.map((dia, idx) => {
              const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso);
              const bloqueio = datasBloqueadas.find((b) => b.data === dia.dataIso);
              const isHoje = dia.dataIso === new Date().toISOString().split("T")[0];

              const totalCount = encomendasDoDia.length;
              const maxExibir = 2;
              const exibidas = encomendasDoDia.slice(0, maxExibir);
              const restantes = totalCount - maxExibir;

              return (
                <div
                  key={`${dia.dataIso}-${idx}`}
                  onClick={() => handleAbrirDrawerDia(dia.dataIso)}
                  className={`min-h-[110px] sm:min-h-[125px] p-1.5 flex flex-col justify-between transition-all cursor-pointer group ${
                    dia.foraDoMes ? "opacity-35 bg-muted/20" : "bg-card"
                  } ${
                    bloqueio
                      ? "bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/30"
                      : "hover:bg-primary/5 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        isHoje
                          ? "bg-primary text-primary-foreground font-black"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {dia.diaNum}
                    </span>

                    {bloqueio && (
                      <Badge
                        variant="destructive"
                        className="text-[9px] px-1.5 py-0 font-bold bg-rose-600 text-white flex items-center gap-0.5"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Fechada</span>
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 my-1 flex-1">
                    {exibidas.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      const resumoItem = ord.itens.length > 18 ? `${ord.itens.substring(0, 18)}...` : ord.itens;

                      return (
                        <div
                          key={ord.id}
                          className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md border truncate shadow-2xs flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${estiloPilula}`}
                        >
                          <span className="font-mono font-bold shrink-0 opacity-80">
                            {ord.horarioEntrega || "14:00"}
                          </span>
                          <span className="truncate">
                            <strong>{ord.clienteNome}</strong> ({resumoItem})
                          </span>
                        </div>
                      );
                    })}

                    {restantes > 0 && (
                      <div className="text-[10px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-md text-center">
                        +{restantes} mais
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-muted-foreground flex justify-between items-center opacity-70 group-hover:opacity-100">
                    {totalCount > 0 ? (
                      <span className="font-semibold text-foreground font-mono">
                        {totalCount} ped.
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-[9px] text-primary font-bold hidden sm:inline">
                      Ver dia &gt;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. VISUALIZAÇÃO EM CALENDÁRIO SEMANAL */}
      {/* ========================================================================= */}
      {viewMode === "semana" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasDaSemanaGrid.map((dia) => {
            const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso);
            const bloqueio = datasBloqueadas.find((b) => b.data === dia.dataIso);
            const isHoje = dia.dataIso === new Date().toISOString().split("T")[0];

            return (
              <Card
                key={dia.dataIso}
                onClick={() => handleAbrirDrawerDia(dia.dataIso)}
                className={`border cursor-pointer transition-all flex flex-col justify-between ${
                  bloqueio ? "bg-rose-500/10 border-rose-500/30" : "bg-card hover:border-primary/50 shadow-xs"
                }`}
              >
                <CardHeader className="p-3 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">{dia.nomeSemana}</span>
                    <h4 className={`text-base font-extrabold ${isHoje ? "text-primary font-black" : "text-foreground"}`}>
                      {dia.diaNum}
                    </h4>
                  </div>
                  {bloqueio && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                      <Lock className="w-3 h-3 mr-0.5" /> Fechada
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-2 space-y-1.5 flex-1 min-h-[140px]">
                  {encomendasDoDia.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-6">Livre</p>
                  ) : (
                    encomendasDoDia.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      return (
                        <div key={ord.id} className={`p-1.5 rounded-lg border text-xs space-y-1 ${estiloPilula}`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className="font-mono text-[10px]">{ord.horarioEntrega || "14:00"}</span>
                            <span className="text-[10px]">{formatarMoeda(ord.valorTotal)}</span>
                          </div>
                          <p className="font-semibold text-xs truncate">{ord.clienteNome}</p>
                          <p className="text-[10px] opacity-80 truncate">{ord.itens}</p>
                        </div>
                      );
                    })
                  )}
                </CardContent>

                <CardFooter className="p-2 border-t border-border/50 text-[10px] text-primary font-bold flex justify-between">
                  <span>{encomendasDoDia.length} ped.</span>
                  <span>Ver detalhes &gt;</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISUALIZAÇÃO EM LISTA COMPLETA */}
      {/* ========================================================================= */}
      {viewMode === "lista" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs">Data &amp; Hora</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Itens do Pedido</TableHead>
                <TableHead className="text-xs">Insumos Vinculados</TableHead>
                <TableHead className="text-xs">Valor Total</TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs text-right w-48">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encomendasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhuma encomenda encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                encomendasFiltradas.map((ord) => {
                  const saldoRestante = Math.max(0, ord.valorTotal - (ord.valorEntrada || 0));
                  return (
                    <TableRow key={ord.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono">
                        <div className="font-bold text-foreground">
                          {ord.dataEntrega.split("-").reverse().join("/")}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-primary" /> {ord.horarioEntrega || "14:00"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{ord.clienteNome}</div>
                        {ord.clienteWhatsapp && (
                          <a
                            href={formatarWhatsappLink(ord.clienteWhatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline font-mono"
                          >
                            <MessageCircle className="w-3 h-3" /> {ord.clienteWhatsapp}
                          </a>
                        )}
                      </TableCell>

                      <TableCell className="text-xs max-w-[220px] text-foreground">
                        {ord.itensDetalhes && ord.itensDetalhes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ord.itensDetalhes.map((it) => (
                              <Badge key={it.id} variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                {it.quantidade}x {it.nome}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="truncate">{ord.itens}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {ord.insumosNecessarios && ord.insumosNecessarios.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {ord.insumosNecessarios.map((ins) => (
                              <Badge
                                key={ins.id}
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${
                                  ins.comprado
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold"
                                    : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                }`}
                              >
                                {ins.comprado ? <Check className="w-2.5 h-2.5 mr-0.5" /> : null}
                                {ins.quantidade ? `${ins.quantidade}x ` : ""}{ins.nome}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Nenhum</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-extrabold text-foreground">
                        {formatarMoeda(ord.valorTotal)}
                      </TableCell>

                      <TableCell className="text-xs">
                        {ord.valorEntrada && ord.valorEntrada >= ord.valorTotal ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                            100% Pago
                          </Badge>
                        ) : ord.valorEntrada && ord.valorEntrada > 0 ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                              Sinal: {formatarMoeda(ord.valorEntrada)}
                            </Badge>
                            <p className="text-[10px] text-rose-600 font-bold">Falta: {formatarMoeda(saldoRestante)}</p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
                            Pendente (0%)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnviarResumoWhatsApp(ord)}
                            title="Enviar resumo do pedido para o WhatsApp do cliente"
                            className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 fill-emerald-600" />
                            Enviar
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicao(ord)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                onExcluirEncomenda(ord.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. VISUALIZAÇÃO: LISTA DE COMPRAS / PRODUÇÃO */}
      {/* ========================================================================= */}
      {viewMode === "compras" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600" /> Lista de Insumos para Compras &amp; Produção
              </h3>
              <p className="text-xs text-muted-foreground">
                Insumos e notinhas vinculadas por encomenda / pedido.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border">
              <Button
                variant={abaCompras === "hoje" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("hoje")}
                className="h-7 text-xs font-semibold"
              >
                📌 Hoje
              </Button>
              <Button
                variant={abaCompras === "semana" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("semana")}
                className="h-7 text-xs font-semibold"
              >
                🗓️ Esta Semana
              </Button>
              <Button
                variant={abaCompras === "encomenda" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("encomenda")}
                className="h-7 text-xs font-semibold"
              >
                📋 Por Encomenda
              </Button>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-border shadow-xs p-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Total de Insumos</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{listaComprasDados.totalInsumos}</p>
            </Card>
            <Card className="border-border shadow-xs p-3 bg-emerald-500/5 border-emerald-500/20">
              <p className="text-[11px] font-bold text-emerald-600 uppercase">🟢 Comprados</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{listaComprasDados.comprados}</p>
            </Card>
            <Card className="border-border shadow-xs p-3 bg-amber-500/5 border-amber-500/20">
              <p className="text-[11px] font-bold text-amber-600 uppercase">🟡 Pendentes de Compra</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{listaComprasDados.pendentes}</p>
            </Card>
          </div>

          {/* LISTA POR ENCOMENDA COM RECURSOS DE VINCULAÇÃO INTEGRADOS EM CADA CARD */}
          {abaCompras === "encomenda" ? (
            <div className="space-y-4">
              {listaComprasDados.encomendasComInsumos.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-border/50">
                  Nenhuma encomenda com tags de insumos vinculadas.
                </div>
              ) : (
                listaComprasDados.encomendasComInsumos.map((enc) => {
                  const idsDaEncomenda = linkedMap[enc.id] || [];
                  const notinhasDaEncomenda = despesas.filter((d) => idsDaEncomenda.includes(d.id));
                  const totalComprovado = notinhasDaEncomenda.reduce((acc, d) => acc + (d.valorTotal || 0), 0);
                  const sugestoes = obterSugestoesParaLista(enc.id);
                  const isDropdownOpen = !!dropdownAbertoMap[enc.id];

                  return (
                    <Card key={enc.id} className="border-border shadow-xs bg-card">
                      <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">
                            {enc.clienteNome} • {enc.dataEntrega.split("-").reverse().join("/")}
                          </CardTitle>
                          <CardDescription className="text-xs">{enc.itens}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {totalComprovado > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                              Comprovado: {formatarMoeda(totalComprovado)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {enc.insumosNecessarios?.filter((i) => i.comprado).length} de {enc.insumosNecessarios?.length} comprados
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 space-y-4">
                        {/* INSUMOS DA ENCOMENDA */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Insumos do Pedido:</Label>
                          <div className="flex flex-wrap gap-2">
                            {enc.insumosNecessarios?.map((ins) => (
                              <div
                                key={ins.id}
                                onClick={() => handleToggleInsumoComprado(enc.id, ins.id)}
                                className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all select-none ${
                                  ins.comprado
                                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 line-through opacity-80"
                                    : "bg-card text-foreground border-amber-500/50 hover:border-amber-600 shadow-xs"
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  ins.comprado ? "bg-emerald-600 text-white" : "border border-muted-foreground"
                                }`}>
                                  {ins.comprado ? <Check className="w-2.5 h-2.5" /> : null}
                                </span>
                                <span>{ins.quantidade ? `(${ins.quantidade}x) ` : ""}{ins.nome}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* VINCULAÇÃO DE NOTINHAS DENTRO DESTE CARD DA ENCOMENDA */}
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-amber-600" /> Notinhas Vinculadas a esta Encomenda ({notinhasDaEncomenda.length})
                            </h4>
                          </div>

                          {notinhasDaEncomenda.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">
                              Nenhuma notinha vinculada a este pedido.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {notinhasDaEncomenda.map((notinha) => (
                                <div
                                  key={notinha.id}
                                  onClick={() => setNotaDetalheSelecionada(notinha)}
                                  className="group cursor-pointer inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card hover:bg-amber-500/15 text-foreground border border-amber-500/30 text-xs font-semibold shadow-2xs transition-all select-none"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    <strong>{notinha.fornecedorNome}</strong> • {notinha.dataCompra.split("-").reverse().join("/")} •{" "}
                                    <span className="font-mono font-bold text-amber-600">{formatarMoeda(notinha.valorTotal)}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDesvincularNotinhaLista(enc.id, notinha.id);
                                    }}
                                    className="ml-1 p-0.5 rounded-full hover:bg-rose-500/20 text-muted-foreground hover:text-rose-600 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* CAMPO COMBOBOX/AUTOCOMPLETE INTEGRADO NO CARD */}
                          <div className="relative pt-1">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Vincular notinha salva a este pedido (por loja, data, valor, n° nota)..."
                                value={buscaNotinhaMap[enc.id] || ""}
                                onChange={(e) => {
                                  setBuscaNotinhaMap((prev) => ({ ...prev, [enc.id]: e.target.value }));
                                  setDropdownAbertoMap((prev) => ({ ...prev, [enc.id]: true }));
                                }}
                                onFocus={() => setDropdownAbertoMap((prev) => ({ ...prev, [enc.id]: true }))}
                                className="h-8 pl-8 text-xs bg-background"
                              />
                            </div>

                            {isDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                                {sugestoes.length > 0 ? (
                                  sugestoes.map((n) => (
                                    <div
                                      key={n.id}
                                      onClick={() => handleVincularNotinhaLista(enc.id, n.id)}
                                      className="p-2 hover:bg-amber-500/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <div>
                                          <p className="font-bold text-foreground">{n.fornecedorNome}</p>
                                          <p className="text-[10px] text-muted-foreground">
                                            Data: {n.dataCompra.split("-").reverse().join("/")} {n.numeroNota ? `• ${n.numeroNota}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="font-mono font-black text-foreground">{formatarMoeda(n.valorTotal)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-2.5 text-center text-xs text-muted-foreground">
                                    {despesas.length === 0
                                      ? "Nenhuma notinha capturada."
                                      : "Nenhuma notinha disponível para este pedido."}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <Card className="border-border shadow-xs bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs w-12 text-center">Status</TableHead>
                    <TableHead className="text-xs">Insumo / Tag</TableHead>
                    <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                    <TableHead className="text-xs">Cliente / Pedido</TableHead>
                    <TableHead className="text-xs">Data de Entrega</TableHead>
                    <TableHead className="text-xs text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaComprasDados.todosInsumos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Nenhum insumo pendente para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    listaComprasDados.todosInsumos.map(({ encomendaId, clienteNome, dataEntrega, insumo }) => (
                      <TableRow key={`${encomendaId}-${insumo.id}`} className="hover:bg-muted/20">
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleInsumoComprado(encomendaId, insumo.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors mx-auto ${
                              insumo.comprado
                                ? "bg-emerald-600 text-white"
                                : "border-2 border-amber-500 hover:bg-amber-500/20"
                            }`}
                          >
                            {insumo.comprado ? <Check className="w-3.5 h-3.5" /> : null}
                          </button>
                        </TableCell>
                        <TableCell className={`text-xs font-bold ${insumo.comprado ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {insumo.nome}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono font-bold">
                          {insumo.quantidade || 1}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {clienteNome}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {dataEntrega.split("-").reverse().join("/")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={insumo.comprado ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => handleToggleInsumoComprado(encomendaId, insumo.id)}
                            className="h-6 text-[10px] px-2"
                          >
                            {insumo.comprado ? "Desmarcar" : "Marcar Comprado"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA NOTINHA SELECIONADA A PARTIR DO CHIP */}
      {/* ========================================================================= */}
      {notaDetalheSelecionada && (
        <Dialog open={!!notaDetalheSelecionada} onOpenChange={() => setNotaDetalheSelecionada(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground text-base">
                <Building2 className="w-5 h-5 text-primary" /> {notaDetalheSelecionada.fornecedorNome}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Comprovante fiscal registrado em {notaDetalheSelecionada.dataCompra.split("-").reverse().join("/")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° da Nota:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaDetalheSelecionada.numeroNota || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° do Pedido:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaDetalheSelecionada.numeroPedido || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Data &amp; Hora:
                  </span>
                  <p className="font-mono text-foreground mt-0.5">
                    {notaDetalheSelecionada.dataCompra.split("-").reverse().join("/")}{" "}
                    {notaDetalheSelecionada.horaCompra ? `às ${notaDetalheSelecionada.horaCompra}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Endereço:
                  </span>
                  <p className="text-foreground truncate mt-0.5" title={notaDetalheSelecionada.fornecedorEndereco}>
                    {notaDetalheSelecionada.fornecedorEndereco || "Local físico"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Item / Descrição</TableHead>
                      <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                      <TableHead className="text-xs w-20">Unit.</TableHead>
                      <TableHead className="text-xs w-20">Total</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notaDetalheSelecionada.itens.map((it) => {
                      const cfg = CATEGORIAS_DESPESA_CONFIG[it.categoria] || CATEGORIAS_DESPESA_CONFIG.outros;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-xs font-semibold text-foreground">{it.nome}</TableCell>
                          <TableCell className="text-xs text-center font-mono">{it.quantidade}</TableCell>
                          <TableCell className="text-xs">{formatarMoeda(it.valorUnitario)}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {formatarMoeda(it.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${cfg.badgeClass}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex justify-between">
                  <span>🍫 Produção (Doces):</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorProducao)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold flex justify-between">
                  <span>🥣 Utensílios:</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorUtensilios)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold flex justify-between">
                  <span>🛒 Consumo Pessoal:</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorConsumoProprio)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300 font-semibold flex justify-between">
                  <span>💰 Total Notinha:</span>
                  <span className="font-extrabold">{formatarMoeda(notaDetalheSelecionada.valorTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setNotaDetalheSelecionada(null)} className="text-xs font-semibold">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. PAINEL LATERAL (DRAWER) DE DETALHES DO DIA SELECIONADO */}
      {/* ========================================================================= */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col justify-between">
          <div>
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {selectedDrawerDate
                  ? new Date(`${selectedDrawerDate}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Entregas do Dia"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Visualização detalhada de todas as encomendas e insumos da data.
              </SheetDescription>
            </SheetHeader>

            {bloqueioDoDiaDrawer && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Agenda Fechada: <strong>{bloqueioDoDiaDrawer.motivo}</strong></span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDesbloquearData(bloqueioDoDiaDrawer.id)}
                  className="h-6 text-[10px] text-rose-600 border-rose-500/40 hover:bg-rose-500/20"
                >
                  <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                </Button>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setDrawerOpen(false);
                  handleAbrirNovaEncomenda(selectedDrawerDate || undefined);
                }}
                className="w-full font-bold shadow-xs text-xs h-8.5"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar Encomenda para este dia
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Entregas Agendadas ({encomendasDoDiaDrawer.length})
              </h4>

              {encomendasDoDiaDrawer.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  Nenhuma encomenda agendada para este dia.
                </div>
              ) : (
                encomendasDoDiaDrawer.map((ord) => {
                  const statusCfg = STATUS_ENCOMENDA_CONFIG[ord.status];
                  return (
                    <Card key={ord.id} className="border-border shadow-xs bg-card overflow-hidden">
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-primary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {ord.horarioEntrega || "14:00"}
                          </span>
                          <Badge variant="outline" className={`text-[10px] font-bold ${statusCfg?.color || ""}`}>
                            {statusCfg?.label || ord.status}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm font-extrabold text-foreground">{ord.clienteNome}</p>
                          {ord.clienteWhatsapp && (
                            <a
                              href={formatarWhatsappLink(ord.clienteWhatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline mt-0.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{ord.clienteWhatsapp}</span>
                            </a>
                          )}
                        </div>

                        <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                          <p className="font-medium text-foreground">{ord.itens}</p>
                          {ord.observacoes && (
                            <p className="text-[11px] text-muted-foreground italic">Obs: {ord.observacoes}</p>
                          )}
                        </div>

                        {/* Insumos Necessários */}
                        {ord.insumosNecessarios && ord.insumosNecessarios.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Insumos:</Label>
                            <div className="flex flex-wrap gap-1">
                              {ord.insumosNecessarios.map((ins) => (
                                <Badge
                                  key={ins.id}
                                  variant="outline"
                                  onClick={() => handleToggleInsumoComprado(ord.id, ins.id)}
                                  className={`cursor-pointer text-[10px] px-2 py-0.5 ${
                                    ins.comprado
                                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 line-through"
                                      : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                  }`}
                                >
                                  {ins.comprado ? <Check className="w-3 h-3 mr-1" /> : null}
                                  {ins.quantidade ? `${ins.quantidade}x ` : ""}{ins.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          <span className="font-extrabold text-foreground text-sm">
                            {formatarMoeda(ord.valorTotal)}
                          </span>
                          <span className="text-muted-foreground text-[11px] font-medium">
                            {ord.tipoEntrega === "delivery" ? "🚚 Delivery" : "🏬 Retirada"}
                          </span>
                        </div>

                        <div className="flex justify-end gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnviarResumoWhatsApp(ord)}
                            className="h-7 text-xs px-2 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDrawerOpen(false);
                              handleAbrirEdicao(ord);
                            }}
                            className="h-7 text-xs px-2 font-semibold"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                onExcluirEncomenda(ord.id);
                              }
                            }}
                            className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="w-full text-xs">
              Fechar Painel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* 6. MODAL: CADASTRAR OU EDITAR ENCOMENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalEncomendaOpen} onOpenChange={setModalEncomendaOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CalendarDays className="w-5 h-5 text-primary" />
              {editingId ? "Editar Encomenda" : "Cadastrar Nova Encomenda"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione o cliente, adicione os produtos do cardápio e vincule os insumos da encomenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEncomenda} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <div className="space-y-1 relative">
                <Label htmlFor="enc-nome" className="text-xs font-semibold flex items-center justify-between">
                  <span>Nome do Cliente *</span>
                  {clienteId && <span className="text-[10px] text-emerald-600 font-bold">✓ Cadastrado</span>}
                </Label>
                <Input
                  id="enc-nome"
                  placeholder="Digite para buscar ou cadastrar..."
                  value={clienteNome}
                  onChange={(e) => {
                    setClienteNome(e.target.value);
                    setClienteId(undefined);
                    setDropdownClientesAberto(true);
                  }}
                  onFocus={() => setDropdownClientesAberto(true)}
                  className="h-8 text-xs font-semibold"
                  required
                />

                {dropdownClientesAberto && sugestoesClientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 block">
                      Clientes Cadastrados:
                    </span>
                    {sugestoesClientes.map((cli) => (
                      <div
                        key={cli.id}
                        onClick={() => handleSelecionarCliente(cli)}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-bold text-foreground">{cli.nome}</span>
                        <span className="text-[11px] font-mono text-emerald-600">{cli.whatsapp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="enc-whats" className="text-xs font-semibold">WhatsApp (com DDD) *</Label>
                <Input
                  id="enc-whats"
                  placeholder="(11) 99999-9999"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(aplicarMascaraTelefone(e.target.value))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enc-data" className="text-xs font-semibold">Data da Entrega / Retirada *</Label>
                <Input
                  id="enc-data"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-hora" className="text-xs font-semibold">Horário Previsto *</Label>
                <Input
                  id="enc-hora"
                  type="time"
                  value={horarioEntrega}
                  onChange={(e) => setHorarioEntrega(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-primary" /> Itens do Pedido (Produtos / Doces) *
                </Label>
                <span className="text-[10px] text-muted-foreground">{itensTags.length} item(ns) selecionado(s)</span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-background rounded-lg border border-border">
                {itensTags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic">
                    Nenhum produto adicionado. Digite abaixo para selecionar do cardápio.
                  </span>
                ) : (
                  itensTags.map((it) => (
                    <div
                      key={it.id}
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-semibold shadow-2xs"
                    >
                      <span className="truncate max-w-[160px] font-bold">{it.nome}</span>
                      <span className="text-muted-foreground/60">|</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={it.quantidade}
                          onChange={(e) => handleAlterarQuantidadeItem(it.id, Number(e.target.value) || 1)}
                          className="w-10 h-5 px-1 text-xs font-mono font-bold bg-background border border-primary/40 rounded text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverItemPedido(it.id)}
                        className="hover:text-rose-600 ml-1 text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite para buscar doce/bolo do cardápio (ex: Red Velvet, Brigadeiros)..."
                    value={buscaItemProduto}
                    onChange={(e) => {
                      setBuscaItemProduto(e.target.value);
                      setDropdownItensAberto(true);
                    }}
                    onFocus={() => setDropdownItensAberto(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdicionarItemPedido(buscaItemProduto);
                      }
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdicionarItemPedido(buscaItemProduto)}
                    disabled={!buscaItemProduto.trim()}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>

                {dropdownItensAberto && buscaItemProduto.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesProdutos.length > 0 ? (
                      sugestoesProdutos.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleAdicionarItemPedido(prod.nome, prod.preco, prod.id)}
                          className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <img src={prod.fotoUrl} alt={prod.nome} className="w-6 h-6 rounded object-cover" />
                            <span className="font-bold text-foreground">{prod.nome}</span>
                          </div>
                          <span className="font-mono font-black text-foreground">{formatarMoeda(prod.preco)}</span>
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => handleAdicionarItemPedido(buscaItemProduto)}
                        className="p-2.5 hover:bg-primary/10 cursor-pointer rounded-lg text-xs text-primary font-bold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar "{buscaItemProduto}" como item personalizado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="space-y-1">
                <Label htmlFor="enc-valor" className="text-xs font-bold text-foreground">Valor Total (R$) *</Label>
                <Input
                  id="enc-valor"
                  placeholder="R$ 0,00"
                  value={valorTotalFormatado}
                  onChange={(e) => setValorTotalFormatado(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-8 text-xs font-black text-foreground"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-sinal" className="text-xs font-bold text-emerald-600">Sinal / Entrada (R$)</Label>
                <Input
                  id="enc-sinal"
                  placeholder="R$ 0,00"
                  value={valorEntradaFormatado}
                  onChange={(e) => setValorEntradaFormatado(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-8 text-xs text-emerald-600 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Insumos Necessários
                </Label>
                <span className="text-[10px] text-muted-foreground">{insumosTags.length} insumo(s)</span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-background rounded-lg border border-border">
                {insumosTags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic">
                    Nenhum insumo vinculado. Digite abaixo para buscar no catálogo de insumos.
                  </span>
                ) : (
                  insumosTags.map((t) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-2xs"
                    >
                      <span className="truncate max-w-[150px]">{t.nome}</span>
                      <span className="text-muted-foreground/60">|</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={t.quantidade ?? 1}
                          onChange={(e) => handleAlterarQuantidadeInsumo(t.id, Number(e.target.value) || 1)}
                          className="w-10 h-5 px-1 text-xs font-mono font-bold bg-background border border-amber-500/40 rounded text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverInsumo(t.id)}
                        className="hover:text-rose-600 ml-1 text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar insumo (ex: Leite Condensado, Chantilly, Nutella)..."
                    value={buscaTagInsumo}
                    onChange={(e) => {
                      setBuscaTagInsumo(e.target.value);
                      setDropdownInsumosAberto(true);
                    }}
                    onFocus={() => setDropdownInsumosAberto(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdicionarInsumo(buscaTagInsumo);
                      }
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdicionarInsumo(buscaTagInsumo)}
                    disabled={!buscaTagInsumo.trim()}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>

                {dropdownInsumosAberto && buscaTagInsumo.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesInsumos.length > 0 ? (
                      sugestoesInsumos.map((sug) => (
                        <div
                          key={sug.id}
                          onClick={() => handleAdicionarInsumo(sug.nome)}
                          className="p-2 hover:bg-amber-500/15 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                        >
                          <span className="font-semibold text-foreground">{sug.nome}</span>
                          <span className="text-[10px] text-muted-foreground">{sug.categoria}</span>
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => handleAdicionarInsumo(buscaTagInsumo)}
                        className="p-2.5 hover:bg-amber-500/15 cursor-pointer rounded-lg text-xs text-primary font-bold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Criar nova tag "{buscaTagInsumo}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Modalidade de Entrega</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoEntrega === "retirada" ? "default" : "outline"}
                  onClick={() => setTipoEntrega("retirada")}
                  className="h-8 text-xs font-semibold"
                >
                  <Store className="w-3.5 h-3.5 mr-1.5" /> Retirada no Balcão
                </Button>
                <Button
                  type="button"
                  variant={tipoEntrega === "delivery" ? "default" : "outline"}
                  onClick={() => setTipoEntrega("delivery")}
                  className="h-8 text-xs font-semibold"
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Delivery / Entrega
                </Button>
              </div>
            </div>

            {tipoEntrega === "delivery" && (
              <div className="space-y-1">
                <Label htmlFor="enc-end" className="text-xs font-semibold">Endereço de Entrega</Label>
                <Input
                  id="enc-end"
                  placeholder="Rua, Número, Bairro, Complemento"
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="enc-obs" className="text-xs font-semibold">Observações / Detalhes</Label>
              <Input
                id="enc-obs"
                placeholder="Ex: Nome no topo do bolo, vela inclusa..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalEncomendaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold shadow-md">
                {editingId ? "Salvar Alterações" : "Cadastrar Encomenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. MODAL: BLOQUEAR DATA NA AGENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalBloqueioOpen} onOpenChange={setModalBloqueioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Lock className="w-5 h-5 text-rose-500" /> Bloquear Data na Agenda
            </DialogTitle>
            <DialogDescription className="text-xs">
              Datas bloqueadas ficam marcadas como "Agenda Fechada" no calendário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarBloqueio} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="bloq-data" className="text-xs">Data a ser Bloqueada *</Label>
              <Input
                id="bloq-data"
                type="date"
                value={dataBloqueio}
                onChange={(e) => setDataBloqueio(e.target.value)}
                className="h-8 text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bloq-motivo" className="text-xs">Motivo do Bloqueio *</Label>
              <Select value={motivoBloqueio} onValueChange={setMotivoBloqueio}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agenda Lotada">Agenda Lotada</SelectItem>
                  <SelectItem value="Feriado / Recesso">Feriado / Recesso</SelectItem>
                  <SelectItem value="Folga / Manutenção">Folga / Manutenção</SelectItem>
                  <SelectItem value="Evento Externo">Evento Externo</SelectItem>
                  <SelectItem value="Outro">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datasBloqueadas.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border/50">
                <Label className="text-[11px] font-bold text-muted-foreground">Datas Já Bloqueadas:</Label>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {datasBloqueadas.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-xs">
                      <span className="font-mono font-bold text-foreground">
                        {b.data.split("-").reverse().join("/")} ({b.motivo})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDesbloquearData(b.id)}
                        className="h-5 px-1.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
                      >
                        <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalBloqueioOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" size="sm" className="font-bold bg-rose-600 hover:bg-rose-700 text-white">
                <Lock className="w-3.5 h-3.5 mr-1" /> Confirmar Bloqueio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
