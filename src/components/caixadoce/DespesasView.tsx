import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  X,
  Package,
  Receipt,
  Archive,
  ArchiveRestore,
  ListPlus,
  CheckCircle2,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Share2,
  Check,
  Clock,
  FileText,
  MapPin,
} from "lucide-react";
import {
  obterCatalogoInsumos,
  LISTAS_COMPRAS_PADRAO,
  obterNotinhasVinculadasPorLista,
  salvarNotinhasVinculadasPorLista,
  formatarMoeda,
  CATEGORIAS_DESPESA_CONFIG,
  type ItemListaCompra,
  type ListaCompras,
  type Encomenda,
  type Cliente,
  type ProdutoCardapio,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

// Função para gerar nome padrão automático no formato: Lista DD/MM/AAAA - #XXXX
function gerarNomePadraoLista(): string {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Lista ${hoje} - #${code}`;
}

interface DespesasViewProps {
  despesas?: DespesaNotaFiscal[];
  encomendas?: Encomenda[];
  clientes?: Cliente[];
  produtos?: ProdutoCardapio[];
  estabelecimentoCodigo?: string;
  onExcluirDespesa?: (id: string) => Promise<void>;
  listasCompras?: ListaCompras[];
  onAtualizarListasCompras?: (novasListas: ListaCompras[]) => void;
}

export function DespesasView({
  despesas = [],
  encomendas = [],
  clientes = [],
  produtos = [],
  estabelecimentoCodigo = "CD-1001",
  listasCompras: listasProp,
  onAtualizarListasCompras,
}: DespesasViewProps) {
  // Estado local das Listas de Compras
  const [listas, setListas] = useState<ListaCompras[]>(() => {
    if (listasProp && listasProp.length > 0) return listasProp;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`caixadoce_listas_compras_v2_${estabelecimentoCodigo}`);
        return saved ? JSON.parse(saved) : LISTAS_COMPRAS_PADRAO;
      }
    } catch {}
    return LISTAS_COMPRAS_PADRAO;
  });

  // ID da Lista Expandida na Página
  const [expandedListaId, setExpandedListaId] = useState<string | null>(() => {
    return listas.find((l) => l.status === "ativa")?.id || listas[0]?.id || null;
  });

  // Notinhas Vinculadas especificamente por Lista { [shoppingListId]: string[] }
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
          .eq("estabelecimento_codigo", estabelecimentoCodigo);

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
          // Carregar fallback do localStorage por lista existente
          const map: Record<string, string[]> = {};
          listas.forEach((l) => {
            const localIds = obterNotinhasVinculadasPorLista(l.id, estabelecimentoCodigo);
            if (localIds.length > 0) map[l.id] = localIds;
          });
          setLinkedMap(map);
        }
      } catch {}
    }
    carregarNotinhasPorLista();
  }, [estabelecimentoCodigo, listas]);

  // Handlers de vincular / desvincular notinha em lista específica
  const handleVincularNotinhaLista = async (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    if (atuais.includes(receiptId)) return;

    const novosIds = [...atuais, receiptId];
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, estabelecimentoCodigo);
    setBuscaNotinhaMap((prev) => ({ ...prev, [shoppingListId]: "" }));
    setDropdownAbertoMap((prev) => ({ ...prev, [shoppingListId]: false }));

    try {
      await supabase.from("shopping_list_receipts").insert([
        {
          estabelecimento_codigo: estabelecimentoCodigo,
          shopping_list_id: shoppingListId,
          receipt_id: receiptId,
        },
      ]);
    } catch {}
    toast.success("Notinha vinculada a esta lista de compras!");
  };

  const handleDesvincularNotinhaLista = async (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    const novosIds = atuais.filter((id) => id !== receiptId);
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, estabelecimentoCodigo);

    try {
      await supabase
        .from("shopping_list_receipts")
        .delete()
        .eq("estabelecimento_codigo", estabelecimentoCodigo)
        .eq("shopping_list_id", shoppingListId)
        .eq("receipt_id", receiptId);
    } catch {}
    toast.info("Notinha desvinculada desta lista.");
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

  // Campo do Formulário para Criar Nova Lista
  const [nomeNovaListaInput, setNomeNovaListaInput] = useState("");

  // Modal de Adicionar Produtos na Criação da Lista
  const [modalCriarListaOpen, setModalCriarListaOpen] = useState(false);
  const [novaListaNome, setNovaListaNome] = useState("");
  const [novosItensCriacao, setNovosItensCriacao] = useState<ItemListaCompra[]>([]);
  const [modalItemNome, setModalItemNome] = useState("");
  const [modalItemQtd, setModalItemQtd] = useState(1);
  const [modalItemUnidade, setModalItemUnidade] = useState("un");

  // Modal de Edição / Gerenciamento de Lista Existente
  const [modalEditarListaOpen, setModalEditarListaOpen] = useState(false);
  const [listaEditando, setListaEditando] = useState<ListaCompras | null>(null);
  const [editNomeLista, setEditNomeLista] = useState("");
  const [editItensLista, setEditItensLista] = useState<ItemListaCompra[]>([]);
  const [editNovoItemNome, setEditNovoItemNome] = useState("");
  const [editNovoItemQtd, setEditNovoItemQtd] = useState(1);
  const [editNovoItemUnidade, setEditNovoItemUnidade] = useState("un");

  // Autocomplete de Sugestões de Insumos para Lista de Compras
  const catalogoInsumos = useMemo(() => obterCatalogoInsumos(estabelecimentoCodigo), [estabelecimentoCodigo]);

  const [dropdownCriarInsumosAberto, setDropdownCriarInsumosAberto] = useState(false);
  const sugestoesInsumosCriacao = useMemo(() => {
    const termo = modalItemNome.trim().toLowerCase();
    if (!termo) return [];
    return catalogoInsumos.filter((i) => i.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [modalItemNome, catalogoInsumos]);

  const [dropdownEditarInsumosAberto, setDropdownEditarInsumosAberto] = useState(false);
  const sugestoesInsumosEdicao = useMemo(() => {
    const termo = editNovoItemNome.trim().toLowerCase();
    if (!termo) return [];
    return catalogoInsumos.filter((i) => i.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [editNovoItemNome, catalogoInsumos]);

  // Filtro de Busca
  const [busca, setBusca] = useState("");

  // Sincronizar com props externas e localStorage
  useEffect(() => {
    if (listasProp && listasProp.length > 0) {
      setListas(listasProp);
    }
  }, [listasProp]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`caixadoce_listas_compras_v2_${estabelecimentoCodigo}`, JSON.stringify(listas));
      }
    } catch {}
    if (onAtualizarListasCompras) {
      onAtualizarListasCompras(listas);
    }
  }, [listas, estabelecimentoCodigo]);

  // Abrir Modal de Criação de Lista (Box Inicial)
  const handleIniciarCriacaoLista = () => {
    const nomeFinal = nomeNovaListaInput.trim() || gerarNomePadraoLista();
    setNovaListaNome(nomeFinal);
    setNovosItensCriacao([]);
    setModalItemNome("");
    setModalItemQtd(1);
    setModalItemUnidade("un");
    setModalCriarListaOpen(true);
  };

  // Adicionar produto no modal de criação
  const handleAdicionarItemModalCriacao = () => {
    if (!modalItemNome.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const novo: ItemListaCompra = {
      id: crypto.randomUUID(),
      nome: modalItemNome.trim(),
      quantidade: modalItemQtd > 0 ? modalItemQtd : 1,
      unidade: modalItemUnidade,
      comprado: false,
    };
    setNovosItensCriacao((prev) => [...prev, novo]);
    setModalItemNome("");
    setModalItemQtd(1);
  };

  // Salvar a nova lista com todos os itens incluídos
  const handleSalvarNovaListaFinal = () => {
    const nova: ListaCompras = {
      id: crypto.randomUUID(),
      nome: novaListaNome,
      estabelecimentoCodigo,
      status: "ativa",
      itens: novosItensCriacao,
      createdAt: new Date().toISOString(),
    };

    setListas((prev) => [nova, ...prev]);
    setExpandedListaId(nova.id);
    setModalCriarListaOpen(false);
    setNomeNovaListaInput("");
    toast.success(`Lista "${novaListaNome}" salva com sucesso! 🎉`);
  };

  // Alternar Checkbox do Item (Comprado / Pendente)
  const handleToggleItemComprado = (listaId: string, itemId: string) => {
    setListas((prev) =>
      prev.map((l) => {
        if (l.id !== listaId) return l;
        const novosItens = l.itens.map((it) =>
          it.id === itemId ? { ...it, comprado: !it.comprado } : it
        );
        return { ...l, itens: novosItens };
      })
    );
  };

  // Concluir Lista de Compras
  const handleConcluirLista = (listaId: string) => {
    setListas((prev) =>
      prev.map((l) =>
        l.id === listaId
          ? { ...l, status: "concluida", concluidaEm: new Date().toLocaleDateString("pt-BR") }
          : l
      )
    );
    toast.success("Lista concluída com sucesso! 🎉");
  };

  // Reabrir Lista de Compras
  const handleReabrirLista = (listaId: string) => {
    setListas((prev) =>
      prev.map((l) => (l.id === listaId ? { ...l, status: "ativa" } : l))
    );
    toast.info("Lista reaberta.");
  };

  // Excluir Lista de Compras
  const handleExcluirLista = (listaId: string) => {
    setListas((prev) => prev.filter((l) => l.id !== listaId));
    if (expandedListaId === listaId) setExpandedListaId(null);
    toast.info("Lista removida.");
  };

  // Abrir Modal de Edição de Lista
  const handleAbrirEdicaoLista = (lista: ListaCompras) => {
    setListaEditando(lista);
    setEditNomeLista(lista.nome);
    setEditItensLista([...lista.itens]);
    setEditNovoItemNome("");
    setEditNovoItemQtd(1);
    setEditNovoItemUnidade("un");
    setModalEditarListaOpen(true);
  };

  // Adicionar item na edição
  const handleAdicionarItemEdicao = () => {
    if (!editNovoItemNome.trim()) return;
    const novo: ItemListaCompra = {
      id: crypto.randomUUID(),
      nome: editNovoItemNome.trim(),
      quantidade: editNovoItemQtd > 0 ? editNovoItemQtd : 1,
      unidade: editNovoItemUnidade,
      comprado: false,
    };
    setEditItensLista((prev) => [...prev, novo]);
    setEditNovoItemNome("");
    setEditNovoItemQtd(1);
  };

  // Salvar alterações na edição da lista
  const handleSalvarEdicaoLista = () => {
    if (!listaEditando) return;
    setListas((prev) =>
      prev.map((l) =>
        l.id === listaEditando.id
          ? { ...l, nome: editNomeLista.trim() || l.nome, itens: editItensLista }
          : l
      )
    );
    setModalEditarListaOpen(false);
    toast.success("Lista de compras atualizada!");
  };

  // Compartilhar por WhatsApp
  const handleEnviarWhatsAppLista = (lista: ListaCompras) => {
    const total = lista.itens.length;
    const compradosCount = lista.itens.filter((i) => i.comprado).length;

    let texto = `🛒 *LISTA DE COMPRAS - ${lista.nome.toUpperCase()}*\n`;
    texto += `📅 Data: ${new Date(lista.createdAt).toLocaleDateString("pt-BR")}\n\n`;

    if (total === 0) {
      texto += `_(Lista vazia)_\n`;
    } else {
      const pendentes = lista.itens.filter((i) => !i.comprado);
      const comprados = lista.itens.filter((i) => i.comprado);

      if (pendentes.length > 0) {
        texto += `\n*A COMPRAR (PENDENTES):*\n`;
        pendentes.forEach((it) => {
          texto += `◻️ *${it.quantidade} ${it.unidade || "un"} x ${it.nome}*\n`;
        });
      }

      if (comprados.length > 0) {
        texto += `\n*JÁ COMPRADOS:*\n`;
        comprados.forEach((it) => {
          texto += `✅ ~${it.quantidade} ${it.unidade || "un"} x ${it.nome}~\n`;
        });
      }
    }

    const percentual = total > 0 ? Math.round((compradosCount / total) * 100) : 0;
    texto += `\n📊 *Progresso:* ${compradosCount}/${total} itens comprados (${percentual}%)\n`;
    texto += `\n_Gerado por CaixaDoce_ ✨`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  // Listas Filtradas pela busca
  const listasFiltradas = useMemo(() => {
    if (!busca.trim()) return listas;
    const termo = busca.toLowerCase();
    return listas.filter(
      (l) =>
        l.nome.toLowerCase().includes(termo) ||
        l.itens.some((i) => i.nome.toLowerCase().includes(termo))
    );
  }, [listas, busca]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Lista de Compras <ShoppingCart className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie novas listas, inclua insumos e vincule notinhas fiscais direto em cada card.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BOX SIMPLIFICADO NO INÍCIO: NOME DA LISTA E BOTÃO CRIAR LISTA */}
      {/* ========================================================================= */}
      <Card className="border-2 border-primary/40 shadow-lg bg-card overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome-lista-box" className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Digite o Nome da Lista de Compras:
            </Label>
            <Input
              id="nome-lista-box"
              placeholder="Ex: Compras de Sexta, Festa da Maria, Estoque da Semana..."
              value={nomeNovaListaInput}
              onChange={(e) => setNomeNovaListaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleIniciarCriacaoLista();
                }
              }}
              className="h-11 text-sm font-medium border-border"
            />
          </div>

          <Button
            type="button"
            onClick={handleIniciarCriacaoLista}
            className="w-full h-11 font-extrabold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            <Plus className="w-5 h-5 mr-2" /> Criar Lista de Compras
          </Button>
        </CardContent>
      </Card>

      {/* BARRA DE BUSCA EM TODAS AS LISTAS */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar em todas as listas de compras..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-9 pl-9 text-xs bg-card"
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. EXIBIÇÃO DAS LISTAS DE COMPRAS (CARDS INDIVIDUAIS COM RECURSOS INTEGRADOS) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {listasFiltradas.length === 0 ? (
          <Card className="border-dashed border-2 p-10 text-center text-muted-foreground space-y-2">
            <p className="text-sm font-semibold">Nenhuma lista de compras encontrada.</p>
            <p className="text-xs">Digite o nome no box acima para criar sua primeira lista!</p>
          </Card>
        ) : (
          listasFiltradas.map((lista) => {
            const isExpanded = expandedListaId === lista.id;
            const totalItens = lista.itens.length;
            const compradosCount = lista.itens.filter((i) => i.comprado).length;
            const percentual = totalItens > 0 ? Math.round((compradosCount / totalItens) * 100) : 0;

            const idsDaLista = linkedMap[lista.id] || [];
            const notinhasDaLista = despesas.filter((d) => idsDaLista.includes(d.id));
            const totalGastoLista = notinhasDaLista.reduce((acc, d) => acc + (d.valorTotal || 0), 0);
            const sugestoes = obterSugestoesParaLista(lista.id);
            const isDropdownOpen = !!dropdownAbertoMap[lista.id];

            return (
              <Card
                key={lista.id}
                className={`border-2 transition-all shadow-md bg-card overflow-hidden ${
                  isExpanded ? "border-primary/50 ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                }`}
              >
                {/* CABEÇALHO DO CARD (CLICÁVEL PARA EXPANDIR E MOSTRAR DETALHES) */}
                <div
                  onClick={() => setExpandedListaId(isExpanded ? null : lista.id)}
                  className="p-4 cursor-pointer select-none flex flex-wrap items-center justify-between gap-3 bg-muted/20 hover:bg-muted/40 transition-colors border-b border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white ${lista.status === "ativa" ? "bg-primary" : "bg-emerald-600"}`}>
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-foreground">{lista.nome}</h3>
                        <Badge
                          variant={lista.status === "ativa" ? "default" : "secondary"}
                          className={
                            lista.status === "ativa"
                              ? "bg-[#F3EEF9] text-[#5B478E] border border-[#8E7CC3]/30 font-extrabold text-[10px]"
                              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px]"
                          }
                        >
                          {lista.status === "ativa" ? "Ativa" : "Concluída"}
                        </Badge>

                        {totalGastoLista > 0 && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                            Total Notinhas: {formatarMoeda(totalGastoLista)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {compradosCount} de {totalItens} itens comprados ({percentual}%) • Criada em {new Date(lista.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-28">
                      <Progress value={percentual} className="h-2" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* DETALHES EXPANDIDOS DA LISTA */}
                {isExpanded && (
                  <CardContent className="p-5 space-y-4 bg-card animate-fade-in">
                    {/* BARRA DE AÇÕES DA LISTA */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEdicaoLista(lista);
                          }}
                          className="h-8 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar Lista
                        </Button>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnviarWhatsAppLista(lista);
                          }}
                          className="h-8 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-white text-emerald-600" /> Enviar por WhatsApp
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {lista.status === "ativa" ? (
                          <Button
                            size="sm"
                            onClick={() => handleConcluirLista(lista.id)}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir Lista
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReabrirLista(lista.id)}
                            className="h-8 text-xs font-bold"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Reabrir Lista
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Deseja excluir a lista "${lista.nome}"?`)) {
                              handleExcluirLista(lista.id);
                            }
                          }}
                          className="h-8 text-xs text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* LISTAGEM DOS ITENS DA LISTA */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Itens da Lista ({totalItens}):
                      </Label>

                      {lista.itens.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center italic">
                          Nenhum produto nesta lista. Clique em "Editar Lista" para adicionar!
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lista.itens.map((it) => (
                            <div
                              key={it.id}
                              onClick={() => handleToggleItemComprado(lista.id, it.id)}
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                                it.comprado
                                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 line-through opacity-80"
                                  : "bg-muted/30 text-foreground border-border hover:border-primary/40 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span
                                  className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                    it.comprado ? "bg-emerald-600 text-white" : "border-2 border-primary"
                                  }`}
                                >
                                  {it.comprado ? <Check className="w-3 h-3" /> : null}
                                </span>
                                <span className="truncate font-bold">
                                  {it.quantidade} {it.unidade || "un"} x {it.nome}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ========================================================================= */}
                    {/* VINCULAÇÃO DE NOTINHAS DENTRO DESTE CARD DA LISTA INDIVIDUAL */}
                    {/* ========================================================================= */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-amber-600" /> Notinhas Vinculadas a esta Lista ({notinhasDaLista.length})
                        </h4>
                        {totalGastoLista > 0 && (
                          <span className="text-xs font-black text-amber-900 dark:text-amber-300 font-mono">
                            Total Comprovado: {formatarMoeda(totalGastoLista)}
                          </span>
                        )}
                      </div>

                      {/* CHIPS DAS NOTINHAS VINCULADAS A ESTA LISTA */}
                      {notinhasDaLista.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          Nenhum comprovante fiscal vinculado a esta lista. Use a busca abaixo para atrelar notinhas fisicamente compradas a este pedido!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {notinhasDaLista.map((notinha) => (
                            <div
                              key={notinha.id}
                              onClick={() => setNotaDetalheSelecionada(notinha)}
                              className="group cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-amber-500/15 text-foreground border border-amber-500/30 text-xs font-semibold shadow-2xs transition-all select-none"
                              title="Clique para ver os detalhes da notinha"
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
                                  handleDesvincularNotinhaLista(lista.id, notinha.id);
                                }}
                                className="ml-1 p-0.5 rounded-full hover:bg-rose-500/20 text-muted-foreground hover:text-rose-600 transition-colors"
                                title="Desvincular Notinha"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CAMPO DE BUSCA / SELEÇÃO INTEGRADO DENTRO DO CARD DA LISTA */}
                      <div className="relative pt-1">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Vincular notinha salva a esta lista (por loja, data, valor, n° nota)..."
                            value={buscaNotinhaMap[lista.id] || ""}
                            onChange={(e) => {
                              setBuscaNotinhaMap((prev) => ({ ...prev, [lista.id]: e.target.value }));
                              setDropdownAbertoMap((prev) => ({ ...prev, [lista.id]: true }));
                            }}
                            onFocus={() => setDropdownAbertoMap((prev) => ({ ...prev, [lista.id]: true }))}
                            className="h-8 pl-8 text-xs bg-background"
                          />
                        </div>

                        {/* Dropdown Flutuante de Autocomplete de Notinhas */}
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                            {sugestoes.length > 0 ? (
                              sugestoes.map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => handleVincularNotinhaLista(lista.id, n.id)}
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
                                  ? "Nenhuma notinha capturada no sistema."
                                  : "Nenhuma notinha disponível para vinculação nesta lista."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CRIAR NOVA LISTA COM INCLUSÃO DE PRODUTOS */}
      {/* ========================================================================= */}
      <Dialog open={modalCriarListaOpen} onOpenChange={setModalCriarListaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <ShoppingCart className="w-5 h-5 text-primary" /> Adicionar Produtos à Lista
            </DialogTitle>
            <DialogDescription className="text-xs">
              Monte os itens da lista "<strong>{novaListaNome}</strong>" antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
              <div className="sm:col-span-8 space-y-1 relative">
                <Label className="text-xs font-semibold">Produto / Insumo</Label>
                <Input
                  placeholder="Buscar ou digitar insumo (ex: Leite Condensado, Chantilly)..."
                  value={modalItemNome}
                  onChange={(e) => {
                    setModalItemNome(e.target.value);
                    setDropdownCriarInsumosAberto(true);
                  }}
                  onFocus={() => setDropdownCriarInsumosAberto(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdicionarItemModalCriacao();
                    }
                  }}
                  className="h-8 text-xs"
                />
                {dropdownCriarInsumosAberto && sugestoesInsumosCriacao.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesInsumosCriacao.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => {
                          setModalItemNome(sug.nome);
                          setDropdownCriarInsumosAberto(false);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors font-semibold"
                      >
                        <span>{sug.nome}</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/5">
                          {sug.categoria || "Insumo"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={modalItemQtd}
                  onChange={(e) => setModalItemQtd(Number(e.target.value))}
                  className="h-8 text-xs text-center"
                />
              </div>
              <div className="col-span-full pt-1">
                <Button type="button" onClick={handleAdicionarItemModalCriacao} size="sm" variant="secondary" className="w-full text-xs font-bold bg-[#F3EEF9] text-[#5B478E] hover:bg-[#E8E0F2]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Incluir na Lista
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Itens Incluídos ({novosItensCriacao.length}):
              </Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
                {novosItensCriacao.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">
                    Nenhum produto adicionado ainda.
                  </p>
                ) : (
                  novosItensCriacao.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                      <span className="font-bold text-foreground">
                        {it.quantidade}x {it.nome}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNovosItensCriacao((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalCriarListaOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarNovaListaFinal}
              className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Salvar Lista Completa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR LISTA EXISTENTE */}
      {/* ========================================================================= */}
      <Dialog open={modalEditarListaOpen} onOpenChange={setModalEditarListaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Edit2 className="w-5 h-5 text-primary" /> Editar Lista de Compras
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nome da Lista</Label>
              <Input
                value={editNomeLista}
                onChange={(e) => setEditNomeLista(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
              <div className="sm:col-span-8 space-y-1 relative">
                <Label className="text-xs font-semibold">Novo Produto / Insumo</Label>
                <Input
                  placeholder="Buscar ou digitar insumo (ex: Leite Condensado, Chantilly)..."
                  value={editNovoItemNome}
                  onChange={(e) => {
                    setEditNovoItemNome(e.target.value);
                    setDropdownEditarInsumosAberto(true);
                  }}
                  onFocus={() => setDropdownEditarInsumosAberto(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdicionarItemEdicao();
                    }
                  }}
                  className="h-8 text-xs"
                />
                {dropdownEditarInsumosAberto && sugestoesInsumosEdicao.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesInsumosEdicao.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => {
                          setEditNovoItemNome(sug.nome);
                          setDropdownEditarInsumosAberto(false);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors font-semibold"
                      >
                        <span>{sug.nome}</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/5">
                          {sug.categoria || "Insumo"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={editNovoItemQtd}
                  onChange={(e) => setEditNovoItemQtd(Number(e.target.value))}
                  className="h-8 text-xs text-center"
                />
              </div>
              <div className="col-span-full pt-1">
                <Button type="button" onClick={handleAdicionarItemEdicao} size="sm" variant="secondary" className="w-full text-xs font-bold bg-[#F3EEF9] text-[#5B478E] hover:bg-[#E8E0F2]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Incluir na Lista
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Itens na Lista ({editItensLista.length}):
              </Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
                {editItensLista.map((it, idx) => (
                  <div key={it.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                    <span className="font-bold text-foreground">
                      {it.quantidade}x {it.nome}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditItensLista((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalEditarListaOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarEdicaoLista}
              className="font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
