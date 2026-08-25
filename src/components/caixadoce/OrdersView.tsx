import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
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
  UtensilsCrossed,
  Package,
  MapPin,
  CreditCard,
  QrCode,
  Flame,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  obterFichaTecnicaProduto,
  consolidarReceitasEncomendas,
  calcularCustoItemFichaTecnica,
  type FichaTecnicaItem,
  type InsumoConsolidado,
} from "@/lib/ficha-tecnica-service";
import {
  formatarMoeda,
  formatarWhatsappLink,
  gerarMensagemResumoWhatsApp,
  generatePixPayload,
  type ContaPix,
  aplicarMascaraTelefone,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  obterCatalogoInsumos,
  salvarNovoInsumoCatalogo,
  obterClientes,
  obterProdutosCardapio,
  obterNotinhasVinculadasPorLista,
  salvarNotinhasVinculadasPorLista,
  calcularTotalPagoEncomenda,
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
  type PagamentoItem,
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
  const { profile } = useAuth();
  const activeCode = profile?.establishmentCode || "";
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
          .select("shopping_list_id, receipt_id");

        if (!error && data && data.length > 0) {
          const map: Record<string, string[]> = {};
          data.forEach((row: any) => {
            const listId = String(row.shopping_list_id);
            const rId = String(row.receipt_id);
            if (!map[listId]) map[listId] = [];
            if (!map[listId].includes(rId)) map[listId].push(rId);
          });
          setLinkedMap(map);
        } else {
          const map: Record<string, string[]> = {};
          encomendas.forEach((e) => {
            const localIds = activeCode ? obterNotinhasVinculadasPorLista(e.id, activeCode) : [];
            if (localIds.length > 0) map[e.id] = localIds;
          });
          setLinkedMap(map);
        }
      } catch {}
    }
    carregarNotinhasPorLista();
  }, [encomendas, activeCode]);

  // Handlers para Vincular / Desvincular Notinha em Lista Específica
  const handleVincularNotinhaLista = async (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    if (atuais.includes(receiptId)) return;

    const novosIds = [...atuais, receiptId];
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    if (activeCode) salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, activeCode);
    setBuscaNotinhaMap((prev) => ({ ...prev, [shoppingListId]: "" }));
    setDropdownAbertoMap((prev) => ({ ...prev, [shoppingListId]: false }));

    try {
      await supabase.from("shopping_list_receipts").insert([
        {
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
    try {
      const { error } = await supabase
        .from("shopping_list_receipts")
        .delete()
        .eq("shopping_list_id", shoppingListId)
        .eq("receipt_id", receiptId)
        .select();

      if (error) {
        toast.error(`Falha ao desvincular notinha no banco: ${error.message}`);
        return;
      }

      const atuais = linkedMap[shoppingListId] || [];
      const novosIds = atuais.filter((id) => id !== receiptId);
      setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
      if (activeCode) salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, activeCode);
      toast.info("Notinha desvinculada deste pedido.");
    } catch (e: any) {
      toast.error(`Erro ao desvincular notinha: ${e?.message || e}`);
    }
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
  const catalogoInsumos = useMemo(() => (activeCode ? obterCatalogoInsumos(activeCode) : []), [activeCode]);
  const listaProdutos = useMemo(() => (produtos.length > 0 ? produtos : (activeCode ? obterProdutosCardapio(activeCode) : [])), [produtos, activeCode]);
  const listaClientes = useMemo(() => (clientes.length > 0 ? clientes : (activeCode ? obterClientes(activeCode) : [])), [clientes, activeCode]);

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

  // Personalização Especial (Topo de Bolo & Vela)
  const [temTopoBolo, setTemTopoBolo] = useState(false);
  const [detalhesTopoBolo, setDetalhesTopoBolo] = useState("");
  const [temVela, setTemVela] = useState(false);
  const [detalhesVela, setDetalhesVela] = useState("");

  // Sugestão de Compra Automática de Insumos calculada a partir da Ficha Técnica dos produtos do pedido
  const [sugestaoCompraInsumos, setSugestaoCompraInsumos] = useState<
    Array<{
      insumoNome: string;
      quantidadeTotal: number;
      unidadeMedida: string;
      custoEstimadoTotal: number;
      produtosRelacionados: string[];
    }>
  >([]);

  useEffect(() => {
    async function calcularSugestaoFicha() {
      if (!itensTags || itensTags.length === 0) {
        setSugestaoCompraInsumos([]);
        return;
      }

      const mapaInsumos: Record<
        string,
        {
          insumoNome: string;
          quantidadeTotal: number;
          unidadeMedida: string;
          custoEstimadoTotal: number;
          produtos: Set<string>;
        }
      > = {};

      for (const item of itensTags) {
        const prodId = item.produtoId || listaProdutos.find((p) => p.nome.toLowerCase() === item.nome.toLowerCase())?.id;
        if (!prodId) continue;

        try {
          const itensFicha = activeCode ? await obterFichaTecnicaProduto(activeCode, prodId) : [];
          if (!itensFicha || itensFicha.length === 0) continue;

          const qtdEncomendada = item.quantidade || 1;

          for (const fItem of itensFicha) {
            const key = `${fItem.insumoNome.toLowerCase()}_${fItem.unidadeMedida}`;
            const precoEmb = Number(fItem.precoEmbalagem ?? fItem.precoUnitarioAplicado ?? 0);
            const qtdEmbOrig = Number(fItem.qtdEmbalagemOriginal) > 0 ? Number(fItem.qtdEmbalagemOriginal) : 1;

            // Usa o custoTotalItem já calculado da Ficha Técnica do Produto
            const custoUnitarioInsumo = Number(fItem.custoTotalItem) > 0
              ? Number(fItem.custoTotalItem)
              : calcularCustoItemFichaTecnica(
                  fItem.quantidadeUsada,
                  fItem.unidadeMedida || "g",
                  precoEmb,
                  qtdEmbOrig,
                  fItem.unidadeEmbalagem || fItem.unidadeMedida
                );

            const custoItemTotal = custoUnitarioInsumo * qtdEncomendada;
            const qtdNecessaria = (Number(fItem.quantidadeUsada) || 0) * qtdEncomendada;

            if (!mapaInsumos[key]) {
              mapaInsumos[key] = {
                insumoNome: fItem.insumoNome,
                quantidadeTotal: 0,
                unidadeMedida: fItem.unidadeMedida || "un",
                custoEstimadoTotal: 0,
                produtos: new Set<string>(),
              };
            }

            mapaInsumos[key].quantidadeTotal += qtdNecessaria;
            mapaInsumos[key].custoEstimadoTotal += custoItemTotal;
            mapaInsumos[key].produtos.add(`${item.nome} (${qtdEncomendada}x)`);
          }
        } catch {}
      }

      const resultado = Object.values(mapaInsumos).map((m) => ({
        insumoNome: m.insumoNome,
        quantidadeTotal: m.quantidadeTotal,
        unidadeMedida: m.unidadeMedida,
        custoEstimadoTotal: parseFloat(m.custoEstimadoTotal.toFixed(2)),
        produtosRelacionados: Array.from(m.produtos),
      }));

      setSugestaoCompraInsumos(resultado);
    }

    calcularSugestaoFicha();
  }, [itensTags, listaProdutos]);

  const handleImportarSugestaoParaPedido = () => {
    if (sugestaoCompraInsumos.length === 0) return;

    let adicionados = 0;
    setInsumosTags((prev) => {
      const novos = [...prev];
      for (const sug of sugestaoCompraInsumos) {
        const jaExiste = novos.find(
          (t) => t.nome.toLowerCase() === sug.insumoNome.toLowerCase()
        );
        if (!jaExiste) {
          novos.push({
            id: crypto.randomUUID(),
            nome: sug.insumoNome,
            quantidade: `${sug.quantidadeTotal} ${sug.unidadeMedida}`,
            comprado: false,
          });
          adicionados++;
        }
      }
      return novos;
    });

    toast.success(`${adicionados} insumo(s) da Ficha Técnica importado(s) para o pedido!`);
  };

  // Modal de Seleção Rápida de Conta Pix no momento do Envio
  const [modalSelecaoPixOpen, setModalSelecaoPixOpen] = useState(false);
  const [encomendaParaEnvioPix, setEncomendaParaEnvioPix] = useState<Encomenda | null>(null);

  // Modal de Detalhes do Pedido (Somente Leitura)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [encomendaDetalhes, setEncomendaDetalhes] = useState<Encomenda | null>(null);
  const [receitaConsolidadaPedido, setReceitaConsolidadaPedido] = useState<InsumoConsolidado[]>([]);

  const handleAbrirDetalhes = async (ord: Encomenda) => {
    setEncomendaDetalhes(ord);
    setModalDetalhesOpen(true);
    try {
      const res = await consolidarReceitasEncomendas(activeCode, [ord], produtos);
      setReceitaConsolidadaPedido(res);
    } catch {
      setReceitaConsolidadaPedido([]);
    }
  };

  // Histórico de Pagamentos Recebidos (Mini histórico)
  const [historicoPagamentos, setHistoricoPagamentos] = useState<PagamentoItem[]>([]);
  const [novoPagamentoValorFormatado, setNovoPagamentoValorFormatado] = useState("");
  const [novoPagamentoData, setNovoPagamentoData] = useState(() => new Date().toISOString().split("T")[0]);
  const [mostrarFormNovoPagamento, setMostrarFormNovoPagamento] = useState(false);

  const totalPagoCalculado = useMemo(() => {
    return historicoPagamentos.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  }, [historicoPagamentos]);

  const valorTotalNum = useMemo(() => {
    return converterMoedaInputParaNumero(valorTotalFormatado);
  }, [valorTotalFormatado]);

  const saldoDevedorCalculado = useMemo(() => {
    return Math.max(0, valorTotalNum - totalPagoCalculado);
  }, [valorTotalNum, totalPagoCalculado]);

  const handleAdicionarPagamentoHistorico = () => {
    const val = converterMoedaInputParaNumero(novoPagamentoValorFormatado);
    if (val <= 0) {
      toast.error("Informe um valor maior que R$ 0,00 para registrar o pagamento.");
      return;
    }
    if (!novoPagamentoData) {
      toast.error("Informe a data do pagamento.");
      return;
    }

    const novoItem: PagamentoItem = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      data: novoPagamentoData,
      valor: val,
    };

    setHistoricoPagamentos((prev) => [...prev, novoItem]);
    setNovoPagamentoValorFormatado("");
    toast.success(`Pagamento de ${formatarMoeda(val)} adicionado!`);
  };

  const handleRemoverPagamentoHistorico = (id: string) => {
    setHistoricoPagamentos((prev) => prev.filter((p) => p.id !== id));
    toast.info("Pagamento removido do histórico.");
  };

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

  // Sugestões de Produtos para Itens do Pedido (com logs de diagnóstico)
  const sugestoesProdutos = useMemo(() => {
    const termo = buscaItemProduto.trim().toLowerCase();
    const result = !termo
      ? listaProdutos.slice(0, 10)
      : listaProdutos.filter(
          (p) => p.nome.toLowerCase().includes(termo) || (p.categoria && p.categoria.toLowerCase().includes(termo))
        ).slice(0, 10);

    console.log(
      `[Autocomplete Produtos] Total no Cardápio: ${listaProdutos.length} | Termo Busca: "${buscaItemProduto}" | Sugestões Encontradas: ${result.length}`,
      result
    );
    return result;
  }, [buscaItemProduto, listaProdutos]);

  useEffect(() => {
    console.log("[OrdersView Autocomplete] Produtos do cardápio recebidos/carregados:", listaProdutos.length, listaProdutos);
  }, [listaProdutos]);

  const defaultInsumosTags = useMemo(
    () => [
      "Pão", "Pão de Queijo", "Banana", "Cenoura", "Beterraba", "Abobrinha", "Salsinha", 
      "Pão de Sal", "Torrada", "Manteiga", "Azeite", "Queijo Ralado", "Macarrão", "Milho", 
      "Sabão Líquido", "Amaciante", "Detergente", "Coxinha", "Batata", "Morango", "Uva", 
      "Nozes", "Avelã", "Maracujá", "Limão", "Coco", "Pêssego", "Frutas Vermelhas", 
      "Framboesa", "Amora", "Mirtilo", "Óleo", "Cebola", "Curry", "Vinagre", "Vinagre Branco", 
      "Mel", "Pêra", "Ameixa Seca", "Iogurte", "Tomate", "Frango", "Camarões", "Abóbora", 
      "Alho-Poró", "Azeitona", "Tâmara", "Passas", "Manga", "Farinha"
    ],
    []
  );

  // Sugestões de Insumos (Catálogo + Opções Padrão)
  const sugestoesInsumos = useMemo(() => {
    const termo = buscaTagInsumo.trim().toLowerCase();

    const insumosBase: Array<{ id: string; nome: string; categoria: string }> = [
      ...catalogoInsumos.map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria || "Insumo" })),
      ...defaultInsumosTags.map((nome) => ({
        id: `def_${nome}`,
        nome,
        categoria: "Sugestão Padrão",
      })),
    ];

    const nomesJaSelecionados = new Set(insumosTags.map((t) => t.nome.toLowerCase()));
    const unicosDisponiveis = insumosBase.filter(
      (ins, index, self) =>
        !nomesJaSelecionados.has(ins.nome.toLowerCase()) &&
        index === self.findIndex((t) => t.nome.toLowerCase() === ins.nome.toLowerCase())
    );

    if (!termo) {
      return unicosDisponiveis.slice(0, 10);
    }

    return unicosDisponiveis
      .filter(
        (i) => i.nome.toLowerCase().includes(termo) || i.categoria.toLowerCase().includes(termo)
      )
      .slice(0, 10);
  }, [buscaTagInsumo, catalogoInsumos, insumosTags, defaultInsumosTags]);

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

    // Se o usuário digitou sem selecionar do dropdown, buscar no cardápio se existe um produto correspondente
    const prodMatch =
      precoSugerido !== undefined && precoSugerido > 0
        ? null
        : listaProdutos.find((p) => p.nome.toLowerCase() === nomeLimpo.toLowerCase());

    const precoFinal =
      precoSugerido !== undefined && precoSugerido > 0
        ? precoSugerido
        : prodMatch
        ? prodMatch.preco
        : 0;

    const prodIdFinal = produtoId || (prodMatch ? prodMatch.id : undefined);

    const existente = itensTags.find((it) => it.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existente) {
      setItensTags((prev) =>
        prev.map((it) =>
          it.id === existente.id
            ? { ...it, quantidade: it.quantidade + 1, precoUnitario: it.precoUnitario || precoFinal }
            : it
        )
      );
    } else {
      const novoItem: ItemPedidoEncomenda = {
        id: crypto.randomUUID(),
        produtoId: prodIdFinal,
        nome: nomeLimpo,
        quantidade: 1,
        precoUnitario: precoFinal,
      };
      setItensTags((prev) => [...prev, novoItem]);
    }

    setBuscaItemProduto("");
    setDropdownItensAberto(false);
  };

  const handleAlterarQuantidadeItem = (itemId: string, novaQtd: number) => {
    const qtdSegura = isNaN(novaQtd) ? 0 : Math.max(0, novaQtd);
    setItensTags((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantidade: qtdSegura } : it))
    );
  };

  const handleAlterarPrecoUnitarioItem = (itemId: string, novoPreco: number) => {
    const precoSeguro = isNaN(novoPreco) ? 0 : Math.max(0, novoPreco);
    setItensTags((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, precoUnitario: precoSeguro } : it))
    );
  };

  // Reatividade Automática: Recalcula Valor Total em tempo real sempre que itensTags mudar
  useEffect(() => {
    const totalCalculadoItens = itensTags.reduce(
      (acc, it) => acc + (it.quantidade || 0) * (it.precoUnitario || 0),
      0
    );
    setValorTotalFormatado(aplicarMascaraMoedaInput(String(Math.round(totalCalculadoItens * 100))));
  }, [itensTags]);

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
    if (activeCode) salvarNovoInsumoCatalogo(activeCode, nomeLimpo);
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
    setHistoricoPagamentos([]);
    setNovoPagamentoValorFormatado("");
    setNovoPagamentoData(new Date().toISOString().split("T")[0]);
    setMostrarFormNovoPagamento(false);
    setInsumosTags([]);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setDropdownClientesAberto(false);
    setDropdownItensAberto(false);
    setDropdownInsumosAberto(false);
    setTipoEntrega("retirada");
    setEnderecoEntrega("");
    setObservacoes("");
    setTemTopoBolo(false);
    setDetalhesTopoBolo("");
    setTemVela(false);
    setDetalhesVela("");
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
    
    // Histórico de Pagamentos ou Fallback do Sinal
    const histExistente = ord.historicoPagamentos || ord.paymentsHistory;
    if (Array.isArray(histExistente) && histExistente.length > 0) {
      setHistoricoPagamentos(
        histExistente.map((p: any) => ({
          id: p.id || `pay_${Math.random().toString(36).substr(2, 6)}`,
          data: p.data || p.date || ord.createdAt?.split("T")[0] || ord.dataEntrega,
          valor: Number(p.valor || p.amount || 0),
          observacao: p.observacao || p.note || "",
        }))
      );
    } else if (ord.valorEntrada && ord.valorEntrada > 0) {
      setHistoricoPagamentos([
        {
          id: "pay_initial",
          data: ord.createdAt?.split("T")[0] || ord.dataEntrega || new Date().toISOString().split("T")[0],
          valor: Number(ord.valorEntrada),
          observacao: "Sinal / Entrada Inicial",
        },
      ]);
    } else {
      setHistoricoPagamentos([]);
    }

    setNovoPagamentoValorFormatado("");
    setNovoPagamentoData(new Date().toISOString().split("T")[0]);
    setMostrarFormNovoPagamento(false);
    setInsumosTags(ord.insumosNecessarios || []);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setTipoEntrega(ord.tipoEntrega || "retirada");
    setEnderecoEntrega(ord.enderecoEntrega || "");
    setObservacoes(ord.observacoes || "");
    setTemTopoBolo(ord.temTopoBolo || false);
    setDetalhesTopoBolo(ord.detalhesTopoBolo || "");
    setTemVela(ord.temVela || false);
    setDetalhesVela(ord.detalhesVela || "");
    setModalEncomendaOpen(true);
  };

  // Salvar Encomenda
  const handleSalvarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = converterMoedaInputParaNumero(valorTotalFormatado);
    const totalPago = historicoPagamentos.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);

    if (!clienteNome || itensTags.length === 0 || valorNum <= 0) {
      toast.error("Preencha o cliente, adicione ao menos 1 item e informe o valor total.");
      return;
    }

    try {
      const statusPag: StatusPagamentoEncomenda =
        totalPago >= valorNum && valorNum > 0
          ? "pago_integral"
          : totalPago > 0
          ? "sinal_pago"
          : "pendente";

      const itensSanitizados = itensTags.map((it) => ({
        ...it,
        quantidade: it.quantidade && it.quantidade > 0 ? it.quantidade : 1,
      }));

      const resumoItens = itensSanitizados.map((it) => `${it.quantidade}x ${it.nome}`).join(", ");

      const payload = {
        clienteId,
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens: resumoItens,
        itensDetalhes: itensSanitizados,
        insumosNecessarios: insumosTags,
        valorTotal: valorNum,
        valorEntrada: totalPago,
        historicoPagamentos,
        paymentsHistory: historicoPagamentos,
        statusPagamento: statusPag,
        status: "pendente" as StatusEncomenda,
        tipoEntrega,
        enderecoEntrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        observacoes,
        temTopoBolo,
        detalhesTopoBolo: temTopoBolo ? detalhesTopoBolo : "",
        temVela,
        detalhesVela: temVela ? detalhesVela : "",
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

  // Executa o envio do WhatsApp e a cópia da Chave Pix selecionada
  const executarEnvioWhatsAppComContaPix = (
    ord: Encomenda,
    conta: { chave: string; favorecido?: string }
  ) => {
    const nomeLoja = estabelecimentoNome || profile?.establishmentName || "CaixaDoce";
    const chavePix = conta.chave || profile?.chavePix || "contato@caixadoce.com.br";
    const favorecidoPix = (conta.favorecido && conta.favorecido.trim().length > 0)
      ? conta.favorecido.trim()
      : (nomeLoja || profile?.responsavel || "CaixaDoce");
    const cidadeLoja = profile?.cidade || "SAO PAULO";

    const totalPago = calcularTotalPagoEncomenda(ord);
    const saldoRestanteNum = Math.max(0, ord.valorTotal - totalPago);
    const valorParaPix = saldoRestanteNum > 0 ? saldoRestanteNum : (ord.valorTotal > 0 ? ord.valorTotal : 0);

    // 1. Gera mensagem com a chave Pix, favorecido e valor devido
    const mensagem = gerarMensagemResumoWhatsApp(ord, {
      nomeLoja,
      chavePix,
      favorecidoPix,
      cidadeLoja,
    });

    // 2. Copia automaticamente a string bruta do Pix Copia e Cola EMVCo para a área de transferência
    let pixCopiadoComSucesso = false;
    if (chavePix && valorParaPix > 0) {
      try {
        const pixPayload = generatePixPayload({
          pixKey: chavePix,
          merchantName: favorecidoPix || nomeLoja,
          merchantCity: cidadeLoja,
          amount: valorParaPix,
          txid: (ord.id || "ORDER").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20),
          description: `Encomenda ${ord.clienteNome.slice(0, 15)}`,
        });

        if (pixPayload && typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(pixPayload);
          pixCopiadoComSucesso = true;
        }
      } catch {}
    }

    // 3. Exibe o toast informativo
    if (pixCopiadoComSucesso) {
      toast.info(
        "Mensagem gerada! O Pix Copia e Cola foi copiado para sua área de transferência. Cole-o no WhatsApp após enviar o pedido."
      );
    } else {
      toast.success("Resumo gerado! Abrindo o WhatsApp...");
    }

    // 4. Abre o WhatsApp
    const url = formatarWhatsappLink(ord.clienteWhatsapp, mensagem);
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  // Enviar Resumo Formatado no WhatsApp para o Cliente
  const handleEnviarResumoWhatsApp = (ord: Encomenda) => {
    if (!ord.clienteWhatsapp) {
      toast.error("Esta encomenda não possui número de WhatsApp cadastrado.");
      return;
    }

    const contas = profile?.contasPix && profile.contasPix.length > 0 ? profile.contasPix : [];

    // Se tiver 2 ou mais contas Pix cadastradas, exibe o modal de seleção rápida
    if (contas.length >= 2) {
      setEncomendaParaEnvioPix(ord);
      setModalSelecaoPixOpen(true);
      return;
    }

    // Se tiver 0 ou 1 chave, envia direto com a chave principal
    const contaUsar = contas.find((c) => c.isDefault) || contas[0] || {
      chave: profile?.chavePix || "contato@caixadoce.com.br",
      favorecido: profile?.establishmentName || profile?.responsavel || "CaixaDoce",
    };

    executarEnvioWhatsAppComContaPix(ord, contaUsar);
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
      const matchPagamento =
        filtroPagamento === "pendente"
          ? e.statusPagamento === "pendente" || e.statusPagamento === "cartao_pendente" || e.statusPagamento === "pix_pendente" || !e.statusPagamento
          : (e.statusPagamento as string) === "pago" || e.statusPagamento === "pago_integral" || e.statusPagamento === "sinal_pago" || e.statusPagamento === "pago_na_entrega";
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
            Minhas Encomendas <Package className="w-6 h-6 text-primary" />
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
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger className="h-8 text-xs w-32 font-semibold">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
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
      {/* 3. VISUALIZAÇÃO EM LISTA COMPLETA (LIMPA & CLICÁVEL) */}
      {/* ========================================================================= */}
      {viewMode === "lista" && (
        <div className="space-y-4">
          {/* VISUALIZAÇÃO DESKTOP (TABELA LIMPA DE 5 COLUNAS) */}
          <Card className="hidden md:block border-border shadow-xs overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs">Data &amp; Hora</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Valor Total</TableHead>
                  <TableHead className="text-xs">Status de Pagamento</TableHead>
                  <TableHead className="text-xs text-right w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encomendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                      Nenhuma encomenda encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  encomendasFiltradas.map((ord) => {
                    const totalPago = calcularTotalPagoEncomenda(ord);
                    const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
                    return (
                      <TableRow
                        key={ord.id}
                        onClick={() => handleAbrirDetalhes(ord)}
                        className="hover:bg-purple-500/5 cursor-pointer transition-colors"
                      >
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
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-mono">
                              <MessageCircle className="w-3 h-3" /> {ord.clienteWhatsapp}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-extrabold text-foreground">
                          {formatarMoeda(ord.valorTotal)}
                        </TableCell>

                        <TableCell className="text-xs">
                          {totalPago >= ord.valorTotal && ord.valorTotal > 0 ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              100% Pago ({formatarMoeda(totalPago)})
                            </Badge>
                          ) : totalPago > 0 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                                Pago: {formatarMoeda(totalPago)}
                              </Badge>
                              <p className="text-[10px] text-rose-600 font-bold">Falta: {formatarMoeda(saldoRestante)}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
                              Pendente (0%)
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnviarResumoWhatsApp(ord);
                              }}
                              title="Enviar resumo do pedido para o WhatsApp do cliente"
                              className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 font-bold"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 fill-emerald-600" />
                              Enviar
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAbrirEdicao(ord);
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
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

          {/* VISUALIZAÇÃO MOBILE (CARDS LIMPOS & CLICÁVEIS) */}
          <div className="block md:hidden space-y-3">
            {encomendasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
                Nenhuma encomenda encontrada.
              </div>
            ) : (
              encomendasFiltradas.map((ord) => {
                const totalPago = calcularTotalPagoEncomenda(ord);
                const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
                return (
                  <div
                    key={ord.id}
                    onClick={() => handleAbrirDetalhes(ord)}
                    className="p-3.5 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/50 cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <div className="text-xs font-bold text-foreground">{ord.clienteNome}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-primary" />
                          {ord.dataEntrega.split("-").reverse().join("/")} às {ord.horarioEntrega || "14:00"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-extrabold text-foreground">{formatarMoeda(ord.valorTotal)}</div>
                        {totalPago >= ord.valorTotal && ord.valorTotal > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 mt-0.5">
                            100% Pago
                          </Badge>
                        ) : totalPago > 0 ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0 mt-0.5">
                            Pago: {formatarMoeda(totalPago)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[9px] px-1.5 py-0 mt-0.5">
                            Pendente (0%)
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-primary font-bold">Ver todos os detalhes &gt;</span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnviarResumoWhatsApp(ord);
                          }}
                          className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 fill-emerald-600" />
                          Enviar
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEdicao(ord);
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                              onExcluirEncomenda(ord.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
                          {(ord.temTopoBolo || ord.temVela) && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/50">
                              {ord.temTopoBolo && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                  🎂 Topo: {ord.detalhesTopoBolo || "Sim"}
                                </Badge>
                              )}
                              {ord.temVela && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  🕯️ Vela: {ord.detalhesVela || "Sim"}
                                </Badge>
                              )}
                            </div>
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
        <DialogContent className="w-[95vw] max-w-2xl sm:w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
              <CalendarDays className="w-5 h-5 text-primary shrink-0" />
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
                  onBlur={() => setTimeout(() => setDropdownClientesAberto(false), 200)}
                  className="h-8 text-xs font-semibold"
                  required
                />

                {dropdownClientesAberto && sugestoesClientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-48 overflow-y-auto bg-popover bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-xl p-1 divide-y divide-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 block">
                      Clientes Cadastrados:
                    </span>
                    {sugestoesClientes.map((cli) => (
                      <div
                        key={cli.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelecionarCliente(cli);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-bold text-foreground">{cli.nome}</span>
                        <span className="text-[11px] font-mono text-emerald-600 font-bold">{cli.whatsapp}</span>
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

            <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20 relative w-full overflow-visible">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-primary shrink-0" /> Itens do Pedido (Produtos / Doces) *
                </Label>
                <span className="text-[10px] text-muted-foreground">{itensTags.length} item(ns) selecionado(s)</span>
              </div>

              <div className="flex flex-col gap-2 min-h-[36px] p-2 bg-background rounded-lg border border-border divide-y divide-border/40 w-full overflow-hidden">
                {itensTags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic p-2">
                    Nenhum produto adicionado. Digite abaixo para selecionar do cardápio.
                  </span>
                ) : (
                  itensTags.map((it) => {
                    const precoUnit =
                      it.precoUnitario ||
                      listaProdutos.find((p) => p.id === it.produtoId || p.nome.toLowerCase() === it.nome.toLowerCase())?.preco ||
                      0;
                    const subtotalItem = (it.quantidade || 1) * (it.precoUnitario || precoUnit || 0);

                    return (
                      <div
                        key={it.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 sm:px-3 bg-muted/20 hover:bg-muted/40 rounded-xl transition-colors w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
                          <Cake className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-bold text-xs text-foreground truncate">{it.nome}</span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t border-border/30 sm:border-t-0">
                          {/* QTD Input */}
                          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-input shadow-2xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Qtd:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={it.quantidade === 0 ? "" : it.quantidade}
                              onKeyDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const valLimpo = e.target.value.replace(/\D/g, "");
                                const num = valLimpo === "" ? 0 : Number(valLimpo);
                                handleAlterarQuantidadeItem(it.id, num);
                              }}
                              onBlur={() => {
                                if (!it.quantidade || it.quantidade <= 0) {
                                  handleAlterarQuantidadeItem(it.id, 1);
                                }
                              }}
                              className="w-8 h-5 text-center text-xs font-bold font-mono bg-transparent outline-none border-none focus:ring-0 text-foreground"
                            />
                          </div>

                          {/* Preço Unitário Editável (Mascara Moeda BRL) */}
                          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-input shadow-2xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Unit:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="R$ 0,00"
                              value={
                                it.precoUnitario !== undefined && it.precoUnitario > 0
                                  ? aplicarMascaraMoedaInput(String(Math.round(it.precoUnitario * 100)))
                                  : precoUnit > 0
                                  ? aplicarMascaraMoedaInput(String(Math.round(precoUnit * 100)))
                                  : ""
                              }
                              onKeyDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const valMascara = aplicarMascaraMoedaInput(e.target.value);
                                const num = converterMoedaInputParaNumero(valMascara);
                                handleAlterarPrecoUnitarioItem(it.id, num);
                              }}
                              className="w-20 h-5 text-right text-xs font-bold font-mono bg-transparent outline-none border-none focus:ring-0 text-foreground"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="text-right min-w-[70px]">
                            <div className="text-xs font-extrabold text-purple-700 dark:text-purple-300 font-mono">
                              {formatarMoeda(subtotalItem)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoverItemPedido(it.id)}
                            className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remover item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
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
                    onBlur={() => setTimeout(() => setDropdownItensAberto(false), 200)}
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

                {dropdownItensAberto && sugestoesProdutos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-52 overflow-y-auto bg-popover bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesProdutos.map((prod) => (
                      <div
                        key={prod.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAdicionarItemPedido(prod.nome, prod.preco, prod.id);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {prod.fotoUrl && <img src={prod.fotoUrl} alt={prod.nome} className="w-6 h-6 rounded object-cover" />}
                          <span className="font-bold text-foreground">{prod.nome}</span>
                        </div>
                        <span className="font-mono font-black text-emerald-600">{formatarMoeda(prod.preco)}</span>
                      </div>
                    ))}
                    {buscaItemProduto.trim().length > 0 &&
                      !sugestoesProdutos.some((p) => p.nome.toLowerCase() === buscaItemProduto.trim().toLowerCase()) && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAdicionarItemPedido(buscaItemProduto);
                          }}
                          className="p-2.5 hover:bg-primary/10 cursor-pointer rounded-lg text-xs text-primary font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar "{buscaItemProduto}" como item personalizado
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* PAINEL DE SUGESTÃO DE COMPRA AUTOMÁTICA DE INSUMOS DA FICHA TÉCNICA */}
            {sugestaoCompraInsumos.length > 0 && (
              <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-emerald-600 shrink-0" /> Sugestão de Compra de Insumos para este Pedido
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Calculado automaticamente a partir das Fichas Técnicas dos produtos selecionados.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleImportarSugestaoParaPedido}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 rounded-xl shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Importar para Insumos do Pedido
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sugestaoCompraInsumos.map((sug, idx) => (
                      <div key={idx} className="p-2.5 bg-background border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-foreground truncate">{sug.insumoNome}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Qtd: <strong className="text-foreground font-bold">{sug.quantidadeTotal} {sug.unidadeMedida}</strong>
                            {sug.produtosRelacionados.length > 0 && ` • (${sug.produtosRelacionados.join(", ")})`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border-emerald-500/30 shrink-0">
                          ~{(Number(sug.custoEstimadoTotal) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VALOR TOTAL DA ENCOMENDA */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <Label htmlFor="enc-valor" className="text-xs font-bold text-foreground">Valor Total da Encomenda (R$) *</Label>
              <Input
                id="enc-valor"
                placeholder="R$ 0,00"
                value={valorTotalFormatado}
                onChange={(e) => setValorTotalFormatado(aplicarMascaraMoedaInput(e.target.value))}
                className="h-9 text-sm font-black text-foreground"
                required
              />
            </div>

            {/* CARD VISUAL: HISTÓRICO DE PAGAMENTOS */}
            <div className="space-y-3 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Histórico de Pagamentos
                  </h4>
                </div>

                {/* REGRA DE QUITAÇÃO: TAG PAGO */}
                {saldoDevedorCalculado <= 0 && valorTotalNum > 0 ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 shadow-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> PAGO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    {historicoPagamentos.length} registro(s)
                  </Badge>
                )}
              </div>

              {/* RENDERIZAÇÃO DA LISTA LINHA POR LINHA */}
              {historicoPagamentos.length > 0 ? (
                <div className="divide-y divide-border/60 bg-muted/20 rounded-xl border border-border overflow-hidden">
                  {historicoPagamentos.map((pag) => (
                    <div
                      key={pag.id}
                      className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-foreground font-semibold text-xs">
                          {pag.data.split("-").reverse().join("/")}
                        </span>
                        {pag.observacao && (
                          <span className="text-[11px] text-muted-foreground italic truncate max-w-[120px]">
                            ({pag.observacao})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatarMoeda(pag.valor)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverPagamentoHistorico(pag.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-full"
                          title="Remover pagamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground italic bg-muted/10 rounded-xl border border-dashed border-border">
                  Nenhum pagamento registrado nesta encomenda.
                </div>
              )}

              {/* FLUXO DE ADICIONAR NOVO PAGAMENTO */}
              {saldoDevedorCalculado > 0 && (
                <div>
                  {!mostrarFormNovoPagamento ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFormNovoPagamento(true)}
                      className="w-full text-xs font-bold border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-600 h-9"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> + Adicionar pagamento
                    </Button>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Novo Pagamento Recebido
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarFormNovoPagamento(false)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="pay-val" className="text-[11px] font-semibold text-muted-foreground">
                            Valor Recebido (R$)
                          </Label>
                          <Input
                            id="pay-val"
                            placeholder="R$ 0,00"
                            value={novoPagamentoValorFormatado}
                            onChange={(e) => setNovoPagamentoValorFormatado(aplicarMascaraMoedaInput(e.target.value))}
                            className="h-8 text-xs font-bold font-mono bg-background"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="pay-date" className="text-[11px] font-semibold text-muted-foreground">
                            Data
                          </Label>
                          <Input
                            id="pay-date"
                            type="date"
                            value={novoPagamentoData}
                            onChange={(e) => setNovoPagamentoData(e.target.value)}
                            className="h-8 text-xs font-mono font-bold bg-background"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarFormNovoPagamento(false)}
                          className="text-xs h-7 text-muted-foreground"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleAdicionarPagamentoHistorico();
                            setMostrarFormNovoPagamento(false);
                          }}
                          className="text-xs h-7 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Salvar Pagamento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAINEL DE RESUMO DINÂMICO (MATEMÁTICA E QUITAÇÃO) */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    Total Pago
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200">
                    {formatarMoeda(totalPagoCalculado)}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl text-center border ${
                    saldoDevedorCalculado <= 0
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-rose-500/10 border-rose-500/25"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                      saldoDevedorCalculado <= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    Falta Pagar
                  </span>
                  <span
                    className={`text-sm font-black font-mono ${
                      saldoDevedorCalculado <= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    {formatarMoeda(saldoDevedorCalculado)}
                  </span>
                </div>
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

                {dropdownInsumosAberto && sugestoesInsumos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesInsumos.map((sug) => (
                      <div
                        key={sug.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAdicionarInsumo(sug.nome);
                        }}
                        className="p-2 hover:bg-amber-500/15 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold text-foreground">{sug.nome}</span>
                        <span className="text-[10px] text-muted-foreground">{sug.categoria}</span>
                      </div>
                    ))}
                    {buscaTagInsumo.trim().length > 0 &&
                      !sugestoesInsumos.some((s) => s.nome.toLowerCase() === buscaTagInsumo.trim().toLowerCase()) && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAdicionarInsumo(buscaTagInsumo);
                          }}
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
                placeholder="Ex: Entregar com cuidado, embalagem especial..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* PERSONALIZAÇÃO ESPECIAL DO PEDIDO (TOPO DE BOLO E VELA) */}
            <div className="p-4 border border-purple-500/25 bg-purple-500/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" /> Personalização Especial do Pedido
                </h4>
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold">
                  Opcional
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* TOPO DE BOLO */}
                <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chkTopoBolo"
                      checked={temTopoBolo}
                      onCheckedChange={(checked) => {
                        setTemTopoBolo(!!checked);
                        if (!checked) setDetalhesTopoBolo("");
                      }}
                    />
                    <Label htmlFor="chkTopoBolo" className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer text-foreground">
                      <Cake className="w-4 h-4 text-purple-600 shrink-0" /> [ ] Tem Topo de Bolo?
                    </Label>
                  </div>

                  {temTopoBolo && (
                    <div className="pt-1.5 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Detalhes do Topo de Bolo (Tema, Nome, Idade)
                      </Label>
                      <Input
                        placeholder="Ex: Tema Patrulha Canina, Nome Gabriel, 5 anos"
                        value={detalhesTopoBolo}
                        onChange={(e) => setDetalhesTopoBolo(e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* VELA */}
                <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chkVela"
                      checked={temVela}
                      onCheckedChange={(checked) => {
                        setTemVela(!!checked);
                        if (!checked) setDetalhesVela("");
                      }}
                    />
                    <Label htmlFor="chkVela" className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer text-foreground">
                      <Flame className="w-4 h-4 text-amber-600 shrink-0" /> [ ] Tem Vela?
                    </Label>
                  </div>

                  {temVela && (
                    <div className="pt-1.5 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Numeração ou Tipo da Vela
                      </Label>
                      <Input
                        placeholder="Ex: Número 3, Vela Sparkler, Vela Glitter Rosa"
                        value={detalhesVela}
                        onChange={(e) => setDetalhesVela(e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
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

      {/* MODAL DE SELEÇÃO RÁPIDA DE CONTA PIX PARA ENVIO */}
      <Dialog open={modalSelecaoPixOpen} onOpenChange={setModalSelecaoPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Em qual conta você deseja receber este Pix?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione a conta bancária / chave Pix para a qual o cliente enviará o pagamento deste pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {(profile?.contasPix || []).map((conta) => (
              <div
                key={conta.id}
                onClick={() => {
                  if (encomendaParaEnvioPix) {
                    executarEnvioWhatsAppComContaPix(encomendaParaEnvioPix, conta);
                    setModalSelecaoPixOpen(false);
                  }
                }}
                className="p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      👤 {conta.favorecido}
                    </span>
                    {conta.isDefault && (
                      <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono font-semibold text-muted-foreground">
                    🔑 {conta.chave} <span className="uppercase text-[10px]">({conta.tipo})</span>
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  Selecionar
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalSelecaoPixOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHES DA ENCOMENDA (SOMENTE LEITURA) */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Detalhes do Pedido
              </span>
              {encomendaDetalhes && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = encomendaDetalhes;
                      setModalDetalhesOpen(false);
                      if (target) {
                        handleAbrirEdicao(target);
                      }
                    }}
                    title="Editar esta encomenda"
                    className="h-7 px-2 text-xs font-bold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40 border border-purple-200"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Badge className={STATUS_ENCOMENDA_CONFIG[encomendaDetalhes.status || "pendente"]?.color || "bg-amber-500"}>
                    {STATUS_ENCOMENDA_CONFIG[encomendaDetalhes.status || "pendente"]?.label || "Pendente"}
                  </Badge>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visualização completa de cliente, itens solicitados, notinhas/insumos vinculados e histórico de pagamentos.
            </DialogDescription>
          </DialogHeader>

          {encomendaDetalhes && (
            <div className="space-y-4 py-2">
              {/* BLOCO 1: DADOS DO CLIENTE & DATA/ENTREGA */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Cliente</span>
                    <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-primary" /> {encomendaDetalhes.clienteNome}
                    </span>
                    {encomendaDetalhes.clienteWhatsapp && (
                      <span className="text-muted-foreground text-[11px] font-mono block mt-0.5">
                        📱 {encomendaDetalhes.clienteWhatsapp}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Data &amp; Horário</span>
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      {encomendaDetalhes.dataEntrega.split("-").reverse().join("/")} às {encomendaDetalhes.horarioEntrega || "14:00"}
                    </span>
                    <span className="text-muted-foreground text-[11px] block mt-0.5 font-medium">
                      {encomendaDetalhes.tipoEntrega === "delivery"
                        ? `🚚 Entrega: ${encomendaDetalhes.enderecoEntrega || "A combinar"}`
                        : "🏬 Retirada no Balcão"}
                    </span>
                  </div>
                </div>

                {encomendaDetalhes.observacoes && (
                  <div className="pt-2 border-t border-border/50 text-xs">
                    <span className="font-bold text-foreground">📝 Observações:</span>{" "}
                    <span className="text-muted-foreground italic">{encomendaDetalhes.observacoes}</span>
                  </div>
                )}

                {(encomendaDetalhes.temTopoBolo || encomendaDetalhes.temVela) && (
                  <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                    <span className="font-bold text-foreground block">✨ Personalização Especial:</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {encomendaDetalhes.temTopoBolo && (
                        <Badge variant="outline" className="text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                          🎂 Topo: {encomendaDetalhes.detalhesTopoBolo || "Sim"}
                        </Badge>
                      )}
                      {encomendaDetalhes.temVela && (
                        <Badge variant="outline" className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                          🕯️ Vela: {encomendaDetalhes.detalhesVela || "Sim"}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BLOCO 2: ITENS DO PEDIDO */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Cake className="w-4 h-4 text-purple-600" /> Itens Pedidos pelo Cliente
                </h4>
                {encomendaDetalhes.itensDetalhes && encomendaDetalhes.itensDetalhes.length > 0 ? (
                  <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                    {encomendaDetalhes.itensDetalhes.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-border/50">
                        <span className="font-semibold text-foreground">
                          {it.quantidade}x {it.nome}
                        </span>
                        <span className="font-mono font-bold text-muted-foreground">
                          {formatarMoeda((it.preco || it.valorUnitario || 0) * (it.quantidade || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-border bg-card text-xs text-muted-foreground font-medium">
                    {encomendaDetalhes.itens || "Nenhum detalhe de item informado."}
                  </div>
                )}
              </div>

              {/* BLOCO 2.5: RECEITA & INGREDIENTES CONSOLIDADOS DO PEDIDO */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-purple-600" /> Receita Consolidada do Pedido
                  </h4>
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                    Ficha Técnica &amp; Receita
                  </Badge>
                </div>

                {receitaConsolidadaPedido.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {receitaConsolidadaPedido.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-purple-200/50">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                          {ing.insumoNome}
                        </span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {ing.quantidadeTotal} {ing.unidadeMedida}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic px-1">
                    Cadastre a receita dos produtos no Cardápio para ver os ingredientes consolidados aqui.
                  </p>
                )}
              </div>

              {/* BLOCO 3: INSUMOS NECESSÁRIOS / NOTINHAS VINCULADAS */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" /> Insumos &amp; Compras da Encomenda
                </h4>
                {encomendaDetalhes.insumosNecessarios && encomendaDetalhes.insumosNecessarios.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-card">
                    {encomendaDetalhes.insumosNecessarios.map((ins, idx) => (
                      <Badge key={idx} variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                        {ins.comprado ? "✓ " : "• "} {ins.quantidade ? `${ins.quantidade} ` : ""}{ins.nome}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">Nenhum insumo ou notinha vinculado ainda.</p>
                )}
              </div>

              {/* BLOCO 4: FINANCEIRO & HISTÓRICO DE PAGAMENTOS */}
              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Valor Total do Pedido:</span>
                  <span className="font-mono font-extrabold text-base text-foreground">
                    {formatarMoeda(encomendaDetalhes.valorTotal)}
                  </span>
                </div>

                {/* HISTÓRICO DE PAGAMENTOS */}
                <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                  <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block">
                    Pagamentos Registrados:
                  </span>
                  {encomendaDetalhes.historicoPagamentos && encomendaDetalhes.historicoPagamentos.length > 0 ? (
                    <div className="space-y-1">
                      {encomendaDetalhes.historicoPagamentos.map((pag) => (
                        <div key={pag.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/60">
                          <div>
                            <span className="font-mono text-[11px] text-muted-foreground block">
                              📅 {pag.data.split("-").reverse().join("/")}
                            </span>
                            {pag.observacao && <span className="text-[10px] text-muted-foreground">{pag.observacao}</span>}
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatarMoeda(pag.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhum pagamento registrado até o momento.</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-500/20 font-bold">
                  <span>Saldo Devedor Restante:</span>
                  <span className={Math.max(0, encomendaDetalhes.valorTotal - calcularTotalPagoEncomenda(encomendaDetalhes)) > 0 ? "text-rose-600 font-mono" : "text-emerald-600 font-mono"}>
                    {formatarMoeda(Math.max(0, encomendaDetalhes.valorTotal - calcularTotalPagoEncomenda(encomendaDetalhes)))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalDetalhesOpen(false)} className="text-xs">
                Fechar
              </Button>
              {encomendaDetalhes && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = encomendaDetalhes;
                    setModalDetalhesOpen(false);
                    if (target) {
                      handleAbrirEdicao(target);
                    }
                  }}
                  className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-950/40"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar Pedido
                </Button>
              )}
            </div>

            {encomendaDetalhes && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setModalDetalhesOpen(false);
                  handleEnviarResumoWhatsApp(encomendaDetalhes);
                }}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp Resumo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
