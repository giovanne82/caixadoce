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
  Clock,
  MessageCircle,
  Share2,
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

  // ID da Lista Ativa Selecionada
  const [activeListaId, setActiveListaId] = useState<string>(() => {
    return listas.find((l) => l.status === "ativa")?.id || listas[0]?.id || "";
  });

  // Filtro de Visão das Listas: 'ativas' | 'arquivadas'
  const [visaoStatusListas, setVisaoStatusListas] = useState<"ativas" | "arquivadas">("ativas");

  // Estado do Histórico de Concluídas Retrátil
  const [historicoConcluidasAberto, setHistoricoConcluidasAberto] = useState(true);
  const [expandedListaId, setExpandedListaId] = useState<string | null>(null);

  // Filtros de Itens da Lista Selecionada
  const [filtroStatusItem, setFiltroStatusItem] = useState<"todos" | "pendentes" | "comprados">("todos");
  const [busca, setBusca] = useState("");

  // Campo do Formulário para Criar Nova Lista Nomeada
  const [nomeNovaListaInput, setNomeNovaListaInput] = useState("");

  // Modal de Renomear Lista
  const [modalRenomearOpen, setModalRenomearOpen] = useState(false);
  const [nomeEditListaInput, setNomeEditListaInput] = useState("");

  // Formulário de Adição Rápida de Item
  const [nomeInput, setNomeInput] = useState("");
  const [qtdInput, setQtdInput] = useState<number>(1);
  const [unidadeInput, setUnidadeInput] = useState<string>("un");
  
  // Tags/Chips de Clientes
  const [clienteTagInput, setClienteTagInput] = useState("");
  const [clienteTags, setClienteTags] = useState<string[]>([]);
  const [dropdownClienteAberto, setDropdownClienteAberto] = useState(false);
  const [dropdownItemAberto, setDropdownItemAberto] = useState(false);

  // Modal de Edição de Item
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemListaCompra | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editQtd, setEditQtd] = useState(1);
  const [editUnidade, setEditUnidade] = useState("un");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  // Sincronizar com props externas ou localStorage
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

  // Lista Ativa Selecionada
  const listaAtual = useMemo(() => {
    return listas.find((l) => l.id === activeListaId) || listas[0] || null;
  }, [listas, activeListaId]);

  // Listas Concluídas para o Histórico Retrátil
  const listasConcluidas = useMemo(() => {
    return listas.filter((l) => l.status === "concluida");
  }, [listas]);

  // Listas Ativas para o Dropdown do Formulário
  const listasAtivas = useMemo(() => {
    return listas.filter((l) => l.status === "ativa");
  }, [listas]);

  // Auto-conciliação pós-scanner (para todas as listas ativas)
  useEffect(() => {
    if (despesas.length === 0) return;
    let alterado = false;

    const novasListas = listas.map((lista) => {
      if (lista.status !== "ativa") return lista;
      const novosItens = lista.itens.map((item) => {
        if (item.comprado) return item;
        const encontradoNaNotinha = despesas.some((d) =>
          d.itens.some((itNota) =>
            itNota.nome.toLowerCase().includes(item.nome.toLowerCase()) ||
            item.nome.toLowerCase().includes(itNota.nome.toLowerCase())
          )
        );
        if (encontradoNaNotinha) {
          alterado = true;
          return { ...item, comprado: true };
        }
        return item;
      });
      return { ...lista, itens: novosItens };
    });

    if (alterado) {
      setListas(novasListas);
      toast.success("Itens conciliados automaticamente com notinha escaneada! 🎉");
    }
  }, [despesas]);

  // Sugestões para Autocomplete de Insumos / Produtos
  const catalogoInsumos = useMemo(() => obterCatalogoInsumos(estabelecimentoCodigo), [estabelecimentoCodigo]);
  const sugestoesInsumos = useMemo(() => {
    const termo = nomeInput.trim().toLowerCase();
    if (!termo) return [];
    const nomesInsumos = catalogoInsumos.map((i) => i.nome);
    const nomesProdutos = produtos.map((p) => p.nome);
    const todos = Array.from(new Set([...nomesInsumos, ...nomesProdutos]));

    return todos.filter((n) => n.toLowerCase().includes(termo)).slice(0, 6);
  }, [nomeInput, catalogoInsumos, produtos]);

  // Sugestões para Autocomplete de Clientes
  const sugestoesClientes = useMemo(() => {
    const termo = clienteTagInput.trim().toLowerCase();
    if (!termo) return [];
    const nomesClientes = clientes.map((c) => c.nome);
    const nomesEncomendas = encomendas.map((e) => e.clienteNome);
    const todos = Array.from(new Set([...nomesClientes, ...nomesEncomendas]));

    return todos.filter((n) => n.toLowerCase().includes(termo)).slice(0, 5);
  }, [clienteTagInput, clientes, encomendas]);

  // Criar Nova Lista Nomeada (com fallback de Nome Padrão)
  const handleCriarNovaListaRapida = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeFinal = nomeNovaListaInput.trim() || gerarNomePadraoLista();

    const nova: ListaCompras = {
      id: crypto.randomUUID(),
      nome: nomeFinal,
      estabelecimentoCodigo,
      status: "ativa",
      itens: [],
      createdAt: new Date().toISOString(),
    };

    setListas((prev) => [nova, ...prev]);
    setActiveListaId(nova.id);
    setVisaoStatusListas("ativas");
    setNomeNovaListaInput("");
    toast.success(`Nova lista "${nomeFinal}" criada e selecionada! 🎉`);
  };

  // Renomear Lista de Compras
  const handleRenomearLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listaAtual) return;
    const novoNome = nomeEditListaInput.trim() || listaAtual.nome;

    setListas((prev) =>
      prev.map((l) => (l.id === listaAtual.id ? { ...l, nome: novoNome } : l))
    );

    setModalRenomearOpen(false);
    toast.success(`Lista renomeada para "${novoNome}"!`);
  };

  // Concluir Lista de Compras (Mover para o Histórico)
  const handleConcluirLista = (listaId: string) => {
    setListas((prev) =>
      prev.map((l) => {
        if (l.id === listaId) {
          const concluida: ListaCompras = {
            ...l,
            status: "concluida",
            concluidaEm: new Date().toISOString(),
          };
          toast.success(`Lista "${l.nome}" concluída com sucesso! Movida para o Histórico. 🎉`);
          return concluida;
        }
        return l;
      })
    );

    const ativasRestantes = listas.filter((l) => l.id !== listaId && l.status === "ativa");
    if (ativasRestantes.length > 0) {
      setActiveListaId(ativasRestantes[0].id);
    }
  };

  // Alternar Status de Arquivamento da Lista
  const handleToggleArquivarLista = (listaId: string) => {
    setListas((prev) =>
      prev.map((l) => {
        if (l.id === listaId) {
          const novoStatus = l.status === "ativa" ? "arquivada" : "ativa";
          toast.info(`Lista "${l.nome}" ${novoStatus === "arquivada" ? "arquivada" : "reativada"}.`);
          return { ...l, status: novoStatus };
        }
        return l;
      })
    );
  };

  // Excluir Lista
  const handleExcluirLista = (listaId: string) => {
    if (listas.length <= 1) {
      toast.error("Você precisa manter ao menos 1 lista de compras.");
      return;
    }
    const listaAlvo = listas.find((l) => l.id === listaId);
    setListas((prev) => prev.filter((l) => l.id !== listaId));
    const restante = listas.filter((l) => l.id !== listaId);
    if (restante.length > 0) setActiveListaId(restante[0].id);
    toast.success(`Lista "${listaAlvo?.nome}" excluída.`);
  };

  // Adicionar Tag de Cliente
  const handleAdicionarTagCliente = (nomeTag?: string) => {
    const tag = (nomeTag || clienteTagInput).trim();
    if (!tag) return;
    if (!clienteTags.includes(tag)) {
      setClienteTags((prev) => [...prev, tag]);
    }
    setClienteTagInput("");
    setDropdownClienteAberto(false);
  };

  const handleRemoverTagCliente = (tag: string) => {
    setClienteTags((prev) => prev.filter((t) => t !== tag));
  };

  // Adicionar Novo Item à Lista Selecionada
  const handleAdicionarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listaAtual) return;
    const nomeLimpo = nomeInput.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome do item a ser comprado.");
      return;
    }

    const novoItem: ItemListaCompra = {
      id: crypto.randomUUID(),
      estabelecimentoCodigo,
      nome: nomeLimpo,
      quantidade: Math.max(1, Number(qtdInput) || 1),
      unidade: unidadeInput,
      comprado: false,
      clienteTags: [...clienteTags],
      createdAt: new Date().toISOString(),
    };

    setListas((prev) =>
      prev.map((l) =>
        l.id === listaAtual.id
          ? { ...l, itens: [novoItem, ...l.itens] }
          : l
      )
    );

    setNomeInput("");
    setQtdInput(1);
    setUnidadeInput("un");
    setClienteTags([]);
    setClienteTagInput("");
    setDropdownItemAberto(false);
    setDropdownClienteAberto(false);
    toast.success(`"${nomeLimpo}" adicionado à lista "${listaAtual.nome}"!`);
  };

  // Alternar Checkbox Comprado (✓)
  const handleToggleComprado = (itemId: string) => {
    if (!listaAtual) return;
    setListas((prev) =>
      prev.map((l) => {
        if (l.id === listaAtual.id) {
          const novos = l.itens.map((it) =>
            it.id === itemId ? { ...it, comprado: !it.comprado } : it
          );
          return { ...l, itens: novos };
        }
        return l;
      })
    );
  };

  // Excluir Item
  const handleExcluirItem = (itemId: string) => {
    if (!listaAtual) return;
    setListas((prev) =>
      prev.map((l) =>
        l.id === listaAtual.id
          ? { ...l, itens: l.itens.filter((it) => it.id !== itemId) }
          : l
      )
    );
    toast.info("Item removido do cupom.");
  };

  // Limpar Concluídos
  const handleLimparComprados = () => {
    if (!listaAtual) return;
    setListas((prev) =>
      prev.map((l) =>
        l.id === listaAtual.id
          ? { ...l, itens: l.itens.filter((it) => !it.comprado) }
          : l
      )
    );
    toast.success("Itens comprados removidos do cupom.");
  };

  // Abrir Edição
  const handleAbrirEdicao = (item: ItemListaCompra) => {
    setEditingItem(item);
    setEditNome(item.nome);
    setEditQtd(item.quantidade);
    setEditUnidade(item.unidade || "un");
    setEditTags(item.clienteTags || (item.encomendaClienteNome ? [item.encomendaClienteNome] : []));
    setEditTagInput("");
    setModalEditOpen(true);
  };

  // Salvar Edição
  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !listaAtual || !editNome.trim()) return;

    setListas((prev) =>
      prev.map((l) => {
        if (l.id === listaAtual.id) {
          const novos = l.itens.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  nome: editNome.trim(),
                  quantidade: Math.max(1, Number(editQtd) || 1),
                  unidade: editUnidade,
                  clienteTags: [...editTags],
                }
              : it
          );
          return { ...l, itens: novos };
        }
        return l;
      })
    );

    setModalEditOpen(false);
    toast.success("Item atualizado no cupom!");
  };

  // Listas Filtradas por Status (Ativas / Arquivadas)
  const listasFiltradasPorStatus = useMemo(() => {
    return listas.filter((l) => l.status === visaoStatusListas);
  }, [listas, visaoStatusListas]);

  // Itens da Lista Atual Filtrados por Busca e Status do Item
  const itensFiltrados = useMemo(() => {
    if (!listaAtual) return [];
    return listaAtual.itens.filter((it) => {
      const matchStatus =
        filtroStatusItem === "todos"
          ? true
          : filtroStatusItem === "pendentes"
          ? !it.comprado
          : it.comprado;

      const matchBusca =
        !busca ||
        it.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (it.clienteTags && it.clienteTags.some((t) => t.toLowerCase().includes(busca.toLowerCase()))) ||
        (it.encomendaClienteNome && it.encomendaClienteNome.toLowerCase().includes(busca.toLowerCase()));

      return matchStatus && matchBusca;
    });
  }, [listaAtual, filtroStatusItem, busca]);

  const qtdPendentes = useMemo(() => (listaAtual ? listaAtual.itens.filter((i) => !i.comprado).length : 0), [listaAtual]);
  const qtdComprados = useMemo(() => (listaAtual ? listaAtual.itens.filter((i) => i.comprado).length : 0), [listaAtual]);
  const totalItens = listaAtual ? listaAtual.itens.length : 0;
  const percentualConcluido = totalItens > 0 ? Math.round((qtdComprados / totalItens) * 100) : 0;

  const todasTagsClientesVinculados = useMemo(() => {
    if (!listaAtual) return [];
    const conjunto = new Set<string>();
    for (const item of listaAtual.itens) {
      if (item.clienteTags) item.clienteTags.forEach((t) => conjunto.add(t));
      if (item.encomendaClienteNome) conjunto.add(item.encomendaClienteNome);
    }
    return Array.from(conjunto);
  }, [listaAtual]);

  const handleCompartilharWhatsApp = () => {
    if (!listaAtual) return;

    const dataAtual = new Date().toLocaleDateString("pt-BR");
    let texto = `🛒 *LISTA DE COMPRAS - ${listaAtual.nome.toUpperCase()}*\n📅 Data: ${dataAtual}\n`;

    const tagsFormatadas = Array.from(
      new Set([
        ...(listaAtual.clienteTags || []),
        ...todasTagsClientesVinculados,
      ])
    );

    if (tagsFormatadas.length > 0) {
      texto += `👤 *Clientes:* ${tagsFormatadas.join(", ")}\n`;
    }

    if (listaAtual.estabelecimentosVinculados && listaAtual.estabelecimentosVinculados.length > 0) {
      texto += `🏷️ *Comprado em:* ${listaAtual.estabelecimentosVinculados.join(", ")}\n`;
    }

    texto += `\n📌 *ITENS DA LISTA:*\n`;

    const total = listaAtual.itens.length;
    const compradosCount = listaAtual.itens.filter((i) => i.comprado).length;

    if (total === 0) {
      texto += `_(Lista vazia)_\n`;
    } else {
      const pendentes = listaAtual.itens.filter((i) => !i.comprado);
      const comprados = listaAtual.itens.filter((i) => i.comprado);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Lista de Compras <ShoppingCart className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie múltiplas listas nomeadas, adicione insumos e concilie automaticamente com notinhas escaneadas.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE SELEÇÃO E GESTÃO DE MÚLTIPLAS LISTAS NOMEADAS */}
      {/* ========================================================================= */}
      <Card className="border-border shadow-sm p-3.5 bg-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Alternador Ativas vs Arquivadas */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <Button
                variant={visaoStatusListas === "ativas" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setVisaoStatusListas("ativas");
                  const primeiraAtiva = listas.find((l) => l.status === "ativa");
                  if (primeiraAtiva) setActiveListaId(primeiraAtiva.id);
                }}
                className="h-7 text-xs font-semibold"
              >
                Listas Ativas ({listas.filter((l) => l.status === "ativa").length})
              </Button>
              <Button
                variant={visaoStatusListas === "arquivadas" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setVisaoStatusListas("arquivadas");
                  const primeiraArq = listas.find((l) => l.status === "arquivada");
                  if (primeiraArq) setActiveListaId(primeiraArq.id);
                }}
                className="h-7 text-xs font-semibold text-stone-500"
              >
                <Archive className="w-3.5 h-3.5 mr-1" /> Arquivadas ({listas.filter((l) => l.status === "arquivada").length})
              </Button>
            </div>
          </div>

          {/* Abas das Listas Selecionáveis */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-full overflow-x-auto py-1">
            {listasFiltradasPorStatus.length === 0 ? (
              <span className="text-xs text-muted-foreground italic px-2">
                Nenhuma lista {visaoStatusListas === "ativas" ? "ativa" : "arquivada"}.
              </span>
            ) : (
              listasFiltradasPorStatus.map((l) => {
                const isSelected = l.id === activeListaId;
                const total = l.itens.length;
                const comp = l.itens.filter((i) => i.comprado).length;

                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveListaId(l.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <span>{l.nome}</span>
                    <Badge
                      variant={isSelected ? "secondary" : "outline"}
                      className="text-[10px] font-mono font-bold px-1.5 py-0"
                    >
                      {comp}/{total}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          {/* Ações da Lista Selecionada */}
          {listaAtual && (
            <div className="flex items-center gap-1 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border">
              {listaAtual.status === "ativa" && (
                <Button
                  size="sm"
                  onClick={() => handleConcluirLista(listaAtual.id)}
                  className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleArquivarLista(listaAtual.id)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={listaAtual.status === "ativa" ? "Arquivar esta lista" : "Reativar esta lista"}
              >
                {listaAtual.status === "ativa" ? (
                  <>
                    <Archive className="w-3.5 h-3.5 mr-1" /> Arquivar
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Reativar
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExcluirLista(listaAtual.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                title="Excluir Lista"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 1. ÁREA DE CRIAÇÃO RÁPIDA DE ITEM COM PAINEL LADO A LADO NO TOPO */}
      {/* ========================================================================= */}
      {listaAtual && (
        <Card className="border-2 border-primary/30 shadow-lg bg-card/95 backdrop-blur-md overflow-visible">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                  <ShoppingCart className="w-5 h-5 text-primary" /> Destino dos Itens da Compra
                </CardTitle>

                <Badge
                  variant={listaAtual.status === "ativa" ? "default" : "secondary"}
                  className="text-xs font-bold"
                >
                  Lista Focada: {listaAtual.nome}
                </Badge>
              </div>

              {/* PAINEL LADO A LADO: CRIAR NOVA LISTA vs USAR EXISTENTE */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-muted/30 p-3.5 rounded-2xl border border-border/70">
                {/* CAMPO 1: CRIAR NOVA LISTA */}
                <form onSubmit={handleCriarNovaListaRapida} className="md:col-span-5 space-y-1">
                  <Label htmlFor="quick-nova-lista" className="text-xs font-bold text-foreground">
                    1. Nome da Lista (Nova Lista):
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="quick-nova-lista"
                      placeholder="Ex: Compras da Semana, Festa do Pedro..."
                      value={nomeNovaListaInput}
                      onChange={(e) => setNomeNovaListaInput(e.target.value)}
                      className="h-9 text-xs font-medium bg-background"
                    />
                    <Button type="submit" size="sm" className="h-9 font-bold shrink-0 text-xs shadow-xs">
                      <Plus className="w-4 h-4 mr-1" /> Criar
                    </Button>
                  </div>
                </form>

                {/* SEPARADOR VISUAL */}
                <div className="md:col-span-1 text-center font-extrabold text-xs text-muted-foreground uppercase py-1 md:py-0">
                  <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px]">OU</span>
                </div>

                {/* CAMPO 2: ADICIONAR A UMA LISTA EXISTENTE */}
                <div className="md:col-span-5 space-y-1">
                  <Label htmlFor="select-lista-existente" className="text-xs font-bold text-foreground">
                    2. Adicionar a uma lista existente:
                  </Label>
                  <Select value={activeListaId} onValueChange={(val) => setActiveListaId(val)}>
                    <SelectTrigger id="select-lista-existente" className="h-9 text-xs font-extrabold bg-background border-primary/40 text-primary shadow-xs">
                      <SelectValue placeholder="Selecione a lista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {listasAtivas.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs font-semibold">
                          {l.nome} ({l.itens.filter((i) => i.comprado).length}/{l.itens.length} itens)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleAdicionarItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Nome do Item com Autocomplete */}
                <div className="sm:col-span-5 relative space-y-1">
                  <Label htmlFor="item-nome" className="text-xs font-semibold">
                    O que precisa comprar? *
                  </Label>
                  <Input
                    id="item-nome"
                    placeholder="Ex: Leite Condensado, Chocolate 50%, Morango..."
                    value={nomeInput}
                    onChange={(e) => {
                      setNomeInput(e.target.value);
                      setDropdownItemAberto(true);
                    }}
                    onFocus={() => setDropdownItemAberto(true)}
                    className="h-10 text-xs font-medium"
                    required
                  />

                  {/* Dropdown Autocomplete Insumos */}
                  {dropdownItemAberto && sugestoesInsumos.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                      <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Sugestões do Catálogo:
                      </p>
                      {sugestoesInsumos.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 flex items-center gap-2 transition-colors"
                          onClick={() => {
                            setNomeInput(sug);
                            setDropdownItemAberto(false);
                          }}
                        >
                          <Package className="w-3.5 h-3.5 text-primary" />
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="item-qtd" className="text-xs font-semibold">
                    Qtd *
                  </Label>
                  <Input
                    id="item-qtd"
                    type="number"
                    min="1"
                    step="any"
                    value={qtdInput}
                    onChange={(e) => setQtdInput(Number(e.target.value) || 1)}
                    className="h-10 text-xs font-bold text-center"
                    required
                  />
                </div>

                {/* Unidade */}
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="item-un" className="text-xs font-semibold">
                    Unidade
                  </Label>
                  <Select value={unidadeInput} onValueChange={setUnidadeInput}>
                    <SelectTrigger id="item-un" className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">un (Unidades)</SelectItem>
                      <SelectItem value="kg">kg (Quilos)</SelectItem>
                      <SelectItem value="g">g (Gramas)</SelectItem>
                      <SelectItem value="cx">cx (Caixas)</SelectItem>
                      <SelectItem value="pct">pct (Pacotes)</SelectItem>
                      <SelectItem value="L">L (Litros)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão Adicionar */}
                <div className="sm:col-span-3">
                  <Button type="submit" className="w-full h-10 font-bold shadow-md bg-primary hover:bg-primary/90 text-xs">
                    <Plus className="w-4 h-4 mr-1.5" /> Adicionar à Lista
                  </Button>
                </div>
              </div>

              {/* VÍNCULO FLEXÍVEL DE CLIENTES VIA TAGS / CHIPS */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Vincular a Clientes ou Pedidos (Tags/Chips Flexíveis):
                </Label>

                <div className="flex flex-wrap items-center gap-2">
                  {clienteTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-xs font-bold py-1 px-2.5 rounded-full flex items-center gap-1.5"
                    >
                      <User className="w-3 h-3 text-amber-600" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverTagCliente(tag)}
                        className="hover:text-rose-600 ml-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}

                  <div className="relative flex-1 min-w-[220px]">
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Digite nome de cliente ou pedido..."
                        value={clienteTagInput}
                        onChange={(e) => {
                          setClienteTagInput(e.target.value);
                          setDropdownClienteAberto(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdicionarTagCliente();
                          }
                        }}
                        onFocus={() => setDropdownClienteAberto(true)}
                        className="h-8 text-xs font-medium"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdicionarTagCliente()}
                        className="h-8 px-2.5 text-xs font-bold shrink-0"
                      >
                        + Tag
                      </Button>
                    </div>

                    {/* Dropdown Autocomplete Clientes */}
                    {dropdownClienteAberto && sugestoesClientes.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-40 overflow-y-auto">
                        <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Clientes Cadastrados / Pedidos:
                        </p>
                        {sugestoesClientes.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 flex items-center gap-2 transition-colors"
                            onClick={() => handleAdicionarTagCliente(sug)}
                          >
                            <User className="w-3.5 h-3.5 text-amber-500" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. FILTROS E BUSCA NOS ITENS DA LISTA SELECIONADA */}
      {/* ========================================================================= */}
      {listaAtual && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar em "${listaAtual.nome}"...`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8.5 pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={filtroStatusItem === "todos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFiltroStatusItem("todos")}
              className="h-7 text-xs font-semibold"
            >
              Todos ({totalItens})
            </Button>
            <Button
              variant={filtroStatusItem === "pendentes" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFiltroStatusItem("pendentes")}
              className="h-7 text-xs font-semibold text-amber-600"
            >
              A Comprar ({qtdPendentes})
            </Button>
            <Button
              variant={filtroStatusItem === "comprados" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFiltroStatusItem("comprados")}
              className="h-7 text-xs font-semibold text-emerald-600"
            >
              Comprados ({qtdComprados})
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUPOM DE NOTINHA INDIVIDUAL DA LISTA SELECIONADA (COM RENOMEAR) */}
      {/* ========================================================================= */}
      {listaAtual ? (
        <div className="bg-stone-50 dark:bg-stone-900/90 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden font-mono text-stone-900 dark:text-stone-100">
          {/* Cabeçalho do Cupom */}
          <div className="text-center space-y-2 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
            <div className="flex items-center justify-center gap-2">
              <Receipt className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-black tracking-wider uppercase flex items-center gap-2">
                CUPOM — {listaAtual.nome}
                {/* BOTÃO PARA RENOMEAR A LISTA */}
                <button
                  type="button"
                  onClick={() => {
                    setNomeEditListaInput(listaAtual.nome);
                    setModalRenomearOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                  title="Renomear Lista de Compras"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span>📅 Data: {new Date().toLocaleDateString("pt-BR")}</span>
              <span>•</span>
              <span>🏬 Código: {estabelecimentoCodigo}</span>
              <span>•</span>
              <span>📊 Progresso: {percentualConcluido}%</span>
            </div>

            {/* BOTÃO DE COMPARTILHAR NO WHATSAPP */}
            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                onClick={handleCompartilharWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md rounded-2xl py-2 px-4 flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                Compartilhar no WhatsApp
              </Button>
            </div>

            {/* ESTABELECENTOS VINCULADOS (CUPOM FISCAL ESCANEADO) */}
            {listaAtual.estabelecimentosVinculados && listaAtual.estabelecimentosVinculados.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">🏷️ Comprado em:</span>
                {listaAtual.estabelecimentosVinculados.map((est) => (
                  <Badge
                    key={est}
                    variant="secondary"
                    className="bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-400/30 text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3 text-blue-600" /> {est}
                  </Badge>
                ))}
              </div>
            )}

            {/* Chips de Clientes Vinculados nesta Notinha */}
            {todasTagsClientesVinculados.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Clientes Vinculados:</span>
                {todasTagsClientesVinculados.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full"
                  >
                    <User className="w-3 h-3 text-amber-600" /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* Botão de Concluir no Topo do Cupom */}
            {listaAtual.status === "ativa" && (
              <div className="pt-2 flex justify-center">
                <Button
                  onClick={() => handleConcluirLista(listaAtual.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md h-8 px-4"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Concluir Lista de Compras
                </Button>
              </div>
            )}
          </div>

          {/* Linhas dos Itens do Cupom */}
          <div className="py-4 space-y-2.5">
            {itensFiltrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500 font-sans space-y-1">
                <p className="font-bold">Nenhum insumo nesta lista de compras.</p>
                <p>Adicione novos itens no formulário acima para compor seu cupom.</p>
              </div>
            ) : (
              itensFiltrados.map((item) => {
                const tagsDoItem = item.clienteTags || (item.encomendaClienteNome ? [item.encomendaClienteNome] : []);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      item.comprado
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                        : "bg-white/80 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 shadow-xs"
                    }`}
                  >
                    {/* Ação de Check (✓) + Nome + Qtd */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleComprado(item.id)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all shrink-0 active:scale-90 ${
                          item.comprado
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "border-stone-400 dark:border-stone-500 text-transparent hover:text-emerald-600 hover:border-emerald-600 bg-stone-100 dark:bg-stone-800"
                        }`}
                        title={item.comprado ? "Desmarcar item" : "Marcar como comprado (✓)"}
                      >
                        ✓
                      </button>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-bold text-sm leading-tight ${
                              item.comprado ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-900 dark:text-stone-100"
                            }`}
                          >
                            {item.nome}
                          </span>

                          <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {item.quantidade} {item.unidade || "un"}
                          </span>
                        </div>

                        {/* Chips/Tags de Clientes Vinculados a este Item */}
                        {tagsDoItem.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {tagsDoItem.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 text-[10px] font-sans font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20"
                              >
                                <User className="w-2.5 h-2.5 text-amber-600" /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações Discretas (Editar & Excluir) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAbrirEdicao(item)}
                        className="h-7 w-7 p-0 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700"
                        title="Editar Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluirItem(item.id)}
                        className="h-7 w-7 p-0 text-stone-500 hover:text-rose-600 hover:bg-rose-500/10"
                        title="Excluir Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé do Cupom */}
          <div className="pt-4 border-t-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
            <div className="text-center sm:text-left text-stone-600 dark:text-stone-400">
              <span>Total de Itens no Recibo: <strong>{totalItens}</strong></span>
              <span className="mx-2">•</span>
              <span>Comprados: <strong className="text-emerald-600 dark:text-emerald-400">{qtdComprados}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {qtdComprados > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparComprados}
                  className="h-7 text-xs font-semibold text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Limpar Comprados ({qtdComprados})
                </Button>
              )}
              <Badge variant="outline" className="font-mono text-xs font-bold border-stone-300 dark:border-stone-700">
                {percentualConcluido}% Concluído
              </Badge>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* SEÇÃO RETRÁTIL: HISTÓRICO DE LISTAS CONCLUÍDAS */}
      {/* ========================================================================= */}
      {listasConcluidas.length > 0 && (
        <div className="pt-4 border-t border-border/60 space-y-3">
          <div
            onClick={() => setHistoricoConcluidasAberto((prev) => !prev)}
            className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border cursor-pointer hover:bg-muted/40 transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Listas Concluídas / Histórico ({listasConcluidas.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Listas de compras finalizadas com registro de fornecedores e itens comprados.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {historicoConcluidasAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {historicoConcluidasAberto && (
            <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-emerald-500/40">
              {listasConcluidas.map((lista) => {
                const isExpanded = expandedListaId === lista.id;
                const compCount = lista.itens.filter((i) => i.comprado).length;

                return (
                  <div
                    key={lista.id}
                    className="bg-stone-50 dark:bg-stone-900/80 border border-stone-300 dark:border-stone-700 rounded-2xl p-4 shadow-sm space-y-3 font-mono"
                  >
                    <div
                      onClick={() => setExpandedListaId(isExpanded ? null : lista.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{lista.nome}</span>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-sans">
                            ✓ Concluída
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans text-muted-foreground">
                          {lista.concluidaEm && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              Finalizada em: {new Date(lista.concluidaEm).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <span>•</span>
                          <span>{compCount}/{lista.itens.length} itens marcados</span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" className="h-7 text-xs font-sans">
                        {isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}
                      </Button>
                    </div>

                    {/* Detalhes Expandidos da Lista Concluída */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-stone-200 dark:border-stone-700 space-y-3">
                        {/* Estabelecimentos onde as compras foram efetuadas */}
                        {lista.estabelecimentosVinculados && lista.estabelecimentosVinculados.length > 0 && (
                          <div className="space-y-1 font-sans">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase">🏷️ Comprado em:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {lista.estabelecimentosVinculados.map((est) => (
                                <Badge key={est} variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                                  <Building2 className="w-3 h-3 mr-1" /> {est}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lista de Itens Comprados */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">Itens do Recibo:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {lista.itens.map((it) => (
                              <div
                                key={it.id}
                                className="p-2 rounded-xl bg-white/70 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                              >
                                <span className="font-bold flex items-center gap-2">
                                  <span className="text-emerald-600">✓</span> {it.nome}
                                </span>
                                <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                                  {it.quantidade} {it.unidade || "un"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RENOMEAR LISTA SELECIONADA */}
      {/* ========================================================================= */}
      <Dialog open={modalRenomearOpen} onOpenChange={setModalRenomearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" /> Renomear Lista de Compras
            </DialogTitle>
            <DialogDescription className="text-xs">
              Digite o novo nome para identificar esta lista.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenomearLista} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome-lista" className="text-xs font-semibold">
                Novo Nome *
              </Label>
              <Input
                id="edit-nome-lista"
                value={nomeEditListaInput}
                onChange={(e) => setNomeEditListaInput(e.target.value)}
                className="h-9 text-xs font-bold"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalRenomearOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Salvar Nome
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR ITEM DA LISTA */}
      {/* ========================================================================= */}
      <Dialog open={modalEditOpen} onOpenChange={setModalEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar Item do Cupom</DialogTitle>
            <DialogDescription className="text-xs">
              Altere o nome, quantidade ou tags de clientes vinculados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-nome" className="text-xs font-semibold">
                Nome do Item *
              </Label>
              <Input
                id="edit-nome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="h-8 text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-qtd" className="text-xs font-semibold">
                  Quantidade *
                </Label>
                <Input
                  id="edit-qtd"
                  type="number"
                  min="1"
                  step="any"
                  value={editQtd}
                  onChange={(e) => setEditQtd(Number(e.target.value) || 1)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-un" className="text-xs font-semibold">
                  Unidade
                </Label>
                <Select value={editUnidade} onValueChange={setEditUnidade}>
                  <SelectTrigger id="edit-un" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un (Unidades)</SelectItem>
                    <SelectItem value="kg">kg (Quilos)</SelectItem>
                    <SelectItem value="g">g (Gramas)</SelectItem>
                    <SelectItem value="cx">cx (Caixas)</SelectItem>
                    <SelectItem value="pct">pct (Pacotes)</SelectItem>
                    <SelectItem value="L">L (Litros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tags de Clientes Vinculados</Label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-muted/40 border border-border min-h-[38px]">
                {editTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[11px] font-bold py-0.5 px-2 flex items-center gap-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  placeholder="Adicionar tag..."
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editTagInput.trim()) {
                      e.preventDefault();
                      if (!editTags.includes(editTagInput.trim())) {
                        setEditTags((prev) => [...prev, editTagInput.trim()]);
                      }
                      setEditTagInput("");
                    }
                  }}
                  className="bg-transparent text-xs focus:outline-none flex-1 min-w-[100px]"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
