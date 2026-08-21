import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import {
  obterCatalogoInsumos,
  LISTAS_COMPRAS_PADRAO,
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
    if (!editNovoItemNome.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
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

  // Salvar alterações da edição da lista
  const handleSalvarEdicaoLista = () => {
    if (!listaEditando) return;
    const nomeFinal = editNomeLista.trim() || listaEditando.nome;

    setListas((prev) =>
      prev.map((l) =>
        l.id === listaEditando.id ? { ...l, nome: nomeFinal, itens: editItensLista } : l
      )
    );
    setModalEditarListaOpen(false);
    toast.success("Lista atualizada com sucesso!");
  };

  // Compartilhar Lista no WhatsApp
  const handleEnviarWhatsAppLista = (lista: ListaCompras) => {
    const dataAtual = new Date().toLocaleDateString("pt-BR");
    let texto = `🛒 *LISTA DE COMPRAS - ${lista.nome.toUpperCase()}*\n📅 Data: ${dataAtual}\n`;

    if (lista.clienteTags && lista.clienteTags.length > 0) {
      texto += `👤 *Clientes:* ${lista.clienteTags.join(", ")}\n`;
    }

    if (lista.estabelecimentosVinculados && lista.estabelecimentosVinculados.length > 0) {
      texto += `🏷️ *Comprado em:* ${lista.estabelecimentosVinculados.join(", ")}\n`;
    }

    texto += `\n📌 *ITENS DA LISTA:*\n`;

    const total = lista.itens.length;
    const compradosCount = lista.itens.filter((i) => i.comprado).length;

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
            Crie novas listas, inclua os insumos necessários e acompanhe seus itens em compras.
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
      {/* 2. EXIBIÇÃO DAS LISTAS DE COMPRAS (CARDS COM ACORDEÃO EXPANSÍVEL) */}
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
                    {/* BARRA DE AÇÕES DA LISTA (EDITAR & ENVIAR WHATSAPP) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* BOTÃO EDITAR LISTA */}
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

                        {/* BOTÃO ENVIAR POR WHATSAPP */}
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
                            <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Reabrir
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExcluirLista(lista.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          title="Excluir Lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* CHECKLIST DE ITENS DA LISTA */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                        Itens da Lista ({totalItens}):
                      </h4>

                      {totalItens === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3">
                          Nenhum item cadastrado nesta lista. Clique no botão "Editar Lista" acima para incluir produtos.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lista.itens.map((item) => (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                item.comprado
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground line-through"
                                  : "bg-muted/30 border-border text-foreground font-semibold hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.comprado}
                                  onChange={() => handleToggleItemComprado(lista.id, item.id)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                                />
                                <span className="text-xs truncate font-bold">
                                  {item.quantidade} {item.unidade || "un"} x {item.nome}
                                </span>
                              </div>
                              {item.comprado && (
                                <Badge variant="secondary" className="text-[9px] bg-emerald-600 text-white font-bold no-underline">
                                  ✓ Comprado
                                </Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADICIONAR PRODUTOS E SALVAR NOVA LISTA */}
      {/* ========================================================================= */}
      <Dialog open={modalCriarListaOpen} onOpenChange={setModalCriarListaOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ListPlus className="w-5 h-5 text-primary" /> Adicionar Produtos na Lista: "{novaListaNome}"
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe os produtos e quantidades para montar sua lista de compras. Ao terminar, clique em <strong>Salvar Lista</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Formulário para Inserir Produto */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs font-semibold">Nome do Produto / Insumo</Label>
                <Input
                  placeholder="Ex: Leite Condensado, Cobertura 1kg..."
                  value={modalItemNome}
                  onChange={(e) => setModalItemNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdicionarItemModalCriacao();
                    }
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Qtd</Label>
                <Input
                  type="number"
                  min={1}
                  value={modalItemQtd}
                  onChange={(e) => setModalItemQtd(Number(e.target.value))}
                  className="h-9 text-xs text-center"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Unidade</Label>
                <Select value={modalItemUnidade} onValueChange={setModalItemUnidade}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="cx">cx</SelectItem>
                    <SelectItem value="pct">pct</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-full pt-1">
                <Button
                  type="button"
                  onClick={handleAdicionarItemModalCriacao}
                  variant="secondary"
                  className="w-full h-8 text-xs font-bold bg-[#F3EEF9] text-[#5B478E] hover:bg-[#E8E0F2]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Adicionar Produto
                </Button>
              </div>
            </div>

            {/* Lista dos Itens Inseridos nesta Criação */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Produtos Adicionados ({novosItensCriacao.length}):
              </Label>
              {novosItensCriacao.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded-xl">
                  Nenhum produto adicionado ainda. Preencha o campo acima e clique em "+ Adicionar Produto".
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
                  {novosItensCriacao.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                      <span className="font-bold text-foreground">
                        {it.quantidade} {it.unidade} x {it.nome}
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
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalCriarListaOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarNovaListaFinal}
              className="font-extrabold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Salvar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR LISTA EXISTENTE */}
      {/* ========================================================================= */}
      <Dialog open={modalEditarListaOpen} onOpenChange={setModalEditarListaOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Edit2 className="w-5 h-5 text-primary" /> Editar Lista de Compras
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere o nome da lista ou adicione/remova produtos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-nome-lista" className="text-xs font-bold">
                Nome da Lista
              </Label>
              <Input
                id="edit-nome-lista"
                value={editNomeLista}
                onChange={(e) => setEditNomeLista(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            {/* Adicionar Produto no Modal de Edição */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs font-semibold">Novo Produto</Label>
                <Input
                  placeholder="Nome do insumo..."
                  value={editNovoItemNome}
                  onChange={(e) => setEditNovoItemNome(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Qtd</Label>
                <Input
                  type="number"
                  min={1}
                  value={editNovoItemQtd}
                  onChange={(e) => setEditNovoItemQtd(Number(e.target.value))}
                  className="h-8 text-xs text-center"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Unidade</Label>
                <Select value={editNovoItemUnidade} onValueChange={setEditNovoItemUnidade}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="cx">cx</SelectItem>
                    <SelectItem value="pct">pct</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full pt-1">
                <Button type="button" onClick={handleAdicionarItemEdicao} size="sm" variant="secondary" className="w-full text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Incluir no Cupom
                </Button>
              </div>
            </div>

            {/* Lista dos Itens da Edição */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Itens na Lista ({editItensLista.length}):
              </Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
                {editItensLista.map((it, idx) => (
                  <div key={it.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                    <span className="font-bold text-foreground">
                      {it.quantidade} {it.unidade || "un"} x {it.nome}
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
    </div>
  );
}
