import { useState, useMemo, useRef } from "react";
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
  Cake,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Calculator,
} from "lucide-react";
import { FichaTecnicaModal } from "./FichaTecnicaModal";
import {
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  type ProdutoCardapio,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ProductsViewProps {
  produtos: ProdutoCardapio[];
  estabelecimentoCodigo: string;
  onCriarProduto: (dados: Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">) => Promise<void>;
  onEditarProduto: (id: string, dados: Partial<ProdutoCardapio>) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
}

const CATEGORIAS_PADRAO = [
  "Bolos",
  "Doces",
  "Sobremesas",
  "Salgados",
  "Kit Festas",
  "Bolo no Pote",
];

export function ProductsView({
  produtos,
  estabelecimentoCodigo,
  onCriarProduto,
  onEditarProduto,
  onExcluirProduto,
}: ProductsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [modalProdutoOpen, setModalProdutoOpen] = useState(false);
  const [modalQrOpen, setModalQrOpen] = useState(false);
  const [modalNovaCatOpen, setModalNovaCatOpen] = useState(false);
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [produtoFichaAlvo, setProdutoFichaAlvo] = useState<ProdutoCardapio | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Categorias Customizadas
  const [categoriasCustom, setCategoriasCustom] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`caixadoce_custom_cats_${estabelecimentoCodigo}`);
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });

  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");

  // Formulário de Produto
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoFormatado, setPrecoFormatado] = useState("");
  const [categoria, setCategoria] = useState<string>("Bolos");
  const [fotoUrl, setFotoUrl] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);

  // Disponibilidade e Agendamento por Produto
  const [availabilityType, setAvailabilityType] = useState<"pronta_entrega" | "encomenda">("encomenda");
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [minLeadTimeDays, setMinLeadTimeDays] = useState<number>(1);

  // URL do Cardápio Público
  const linkPublico = typeof window !== "undefined"
    ? `${window.location.origin}/cardapio/${estabelecimentoCodigo}`
    : `/cardapio/${estabelecimentoCodigo}`;

  // Todas as Categorias Disponíveis
  const todasCategoriasDisponiveis = useMemo(() => {
    const conjunto = new Set([...CATEGORIAS_PADRAO, ...categoriasCustom, ...produtos.map((p) => p.categoria)]);
    return Array.from(conjunto);
  }, [categoriasCustom, produtos]);

  // Categorias com Produtos Ativos (Filtro Dinâmico)
  const categoriasComProdutosAtivos = useMemo(() => {
    const ativas = new Set(produtos.filter((p) => p.ativo !== false).map((p) => p.categoria));
    return todasCategoriasDisponiveis.filter((cat) => ativas.has(cat));
  }, [produtos, todasCategoriasDisponiveis]);

  const handleCopiarLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      toast.success("Link do cardápio copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  // Upload simulado de foto
  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFotoUrl(reader.result as string);
        toast.success("Foto carregada com sucesso!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCriarCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novaCategoriaNome.trim();
    if (!nomeLimpo) return;

    if (!categoriasCustom.includes(nomeLimpo) && !CATEGORIAS_PADRAO.includes(nomeLimpo)) {
      const atualizadas = [...categoriasCustom, nomeLimpo];
      setCategoriasCustom(atualizadas);
      try {
        localStorage.setItem(`caixadoce_custom_cats_${estabelecimentoCodigo}`, JSON.stringify(atualizadas));
      } catch {}
      toast.success(`Categoria "${nomeLimpo}" criada com sucesso!`);
    }
    setCategoria(nomeLimpo);
    setNovaCategoriaNome("");
    setModalNovaCatOpen(false);
  };

  const handleAbrirCriacao = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setPrecoFormatado("");
    setCategoria(todasCategoriasDisponiveis[0] || "Bolos");
    setFotoUrl("");
    setDestaque(false);
    setAtivo(true);
    setAvailabilityType("encomenda");
    setAvailableDays([1, 2, 3, 4, 5, 6]);
    setMinLeadTimeDays(1);
    setModalProdutoOpen(true);
  };

  const handleAbrirEdicao = (prod: ProdutoCardapio) => {
    setEditingId(prod.id);
    setNome(prod.nome);
    setDescricao(prod.descricao);
    setPrecoFormatado(prod.preco ? `R$ ${(prod.preco).toFixed(2).replace(".", ",")}` : "");
    setCategoria(prod.categoria);
    setFotoUrl(prod.fotoUrl);
    setDestaque(!!prod.destaque);
    setAtivo(prod.ativo !== false);
    setAvailabilityType(prod.availability_type || "encomenda");
    setAvailableDays(prod.available_days || [1, 2, 3, 4, 5, 6]);
    setMinLeadTimeDays(prod.min_lead_time_days ?? (prod.tempoPreparoHoras ? Math.ceil(prod.tempoPreparoHoras / 24) : 1));
    setModalProdutoOpen(true);
  };

  const handleAbrirFichaTecnica = (prod: ProdutoCardapio) => {
    setProdutoFichaAlvo(prod);
    setModalFichaOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = converterMoedaInputParaNumero(precoFormatado);

    if (!nome || precoNum <= 0) {
      toast.error("Informe o nome e um preço válido para o produto.");
      return;
    }

    try {
      const payload: Partial<ProdutoCardapio> = {
        nome,
        descricao,
        preco: precoNum,
        categoria,
        fotoUrl: fotoUrl || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
        destaque,
        tempoPreparoHoras: availabilityType === "encomenda" ? minLeadTimeDays * 24 : 0,
        ativo,
        availability_type: availabilityType,
        available_days: availableDays,
        min_lead_time_days: minLeadTimeDays,
      };

      if (editingId) {
        await onEditarProduto(editingId, payload);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await onCriarProduto(payload as Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">);
        toast.success("Novo produto adicionado ao cardápio!");
      }
      setModalProdutoOpen(false);
    } catch (err: any) {
      console.error("Erro ao salvar produto no banco de dados:", err);
    }
  };

  const handleToggleAtivo = async (prod: ProdutoCardapio) => {
    const novoStatus = !(prod.ativo !== false);
    await onEditarProduto(prod.id, { ativo: novoStatus });
    toast.info(novoStatus ? "Produto ativado no cardápio." : "Produto pausado do cardápio.");
  };

  // Produtos Filtrados
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoriaFiltro === "todas" || p.categoria === categoriaFiltro;
      const matchBusca =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [produtos, categoriaFiltro, busca]);

  return (
    <div className="space-y-6">
      {/* Banner de Compartilhamento do Cardápio Público em Lilás Suave / Lavanda #8E7CC3 */}
      <div className="bg-gradient-to-r from-[#8E7CC3] via-[#7C69B3] to-[#5B478E] rounded-3xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 border border-white/30 text-white font-mono text-xs font-black px-2.5 py-0.5 rounded-full">
              Código da sua Confeitaria: {estabelecimentoCodigo}
            </span>
            <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-bold">
              Cardápio Ativo
            </Badge>
          </div>
          <h3 className="text-lg font-extrabold">Seu Cardápio Público Digital</h3>
          <p className="text-xs text-white/80 max-w-xl">
            Seus clientes podem acessar seus doces digitando seu código <strong>{estabelecimentoCodigo}</strong> ou direto pelo link.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopiarLink}
            className="h-8.5 font-bold text-xs bg-white text-stone-900 hover:bg-white/90 shadow-sm"
          >
            {copiado ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copiado ? "Copiado!" : "Copiar Link"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalQrOpen(true)}
            className="h-8.5 font-bold text-xs bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/80 shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 mr-1 text-purple-700" /> QR Code
          </Button>

          <a href={`/cardapio/${estabelecimentoCodigo}`} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="h-8.5 text-xs bg-black/40 text-white hover:bg-black/60 border border-white/20"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Visualizar Cardápio
            </Button>
          </a>
        </div>
      </div>

      {/* Header & Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Meus Produtos &amp; Cardápio <Cake className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre seus doces, bolos decorados e kits festa com fotos, descrições e preços.
          </p>
        </div>

        <Button
          onClick={handleAbrirCriacao}
          className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por doce, bolo, descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8.5 pl-9 text-xs"
          />
        </div>

        {/* Filtro Dinâmico: exibe apenas categorias com produtos ativos */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            variant={categoriaFiltro === "todas" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoriaFiltro("todas")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Todos ({produtos.length})
          </Button>
          {categoriasComProdutosAtivos.map((cat) => (
            <Button
              key={cat}
              variant={categoriaFiltro === cat ? "default" : "ghost"}
              size="sm"
              onClick={() => setCategoriaFiltro(cat)}
              className="h-7 text-xs font-semibold shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtosFiltrados.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-border/50">
            Nenhum produto cadastrado nesta categoria. Clique em "+ Novo Produto" para começar!
          </div>
        ) : (
          produtosFiltrados.map((prod) => {
            const isAtivo = prod.ativo !== false;
            return (
              <Card
                key={prod.id}
                className={`overflow-hidden border transition-all flex flex-col justify-between ${
                  !isAtivo ? "opacity-60 bg-muted/20" : "bg-card hover:border-primary/50 shadow-xs"
                }`}
              >
                <div>
                  <div className="relative h-44 w-full bg-muted overflow-hidden">
                    <img
                      src={prod.fotoUrl}
                      alt={prod.nome}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
                      <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-semibold">
                        {prod.categoria}
                      </Badge>
                      {prod.destaque && (
                        <Badge className="bg-amber-500 text-white border-0 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Destaque
                        </Badge>
                      )}
                      {prod.availability_type === "pronta_entrega" ? (
                        <Badge className="bg-emerald-600 text-white border-0 text-[10px] font-bold">
                          ⚡ Pronta Entrega
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-600 text-white border-0 text-[10px] font-bold">
                          📅 {prod.min_lead_time_days || 1}d Encomenda
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="p-3.5 pb-1">
                    <CardTitle className="text-base font-bold text-foreground line-clamp-1">{prod.nome}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-0.5">{prod.descricao}</CardDescription>
                  </CardHeader>
                </div>

                <div className="px-3.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => handleAbrirFichaTecnica(prod)}
                    className="w-full h-8 text-xs font-extrabold bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 gap-1.5 flex items-center justify-center rounded-xl transition-all shadow-2xs"
                  >
                    <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>🧮 Ficha Técnica &amp; Custos</span>
                  </Button>
                </div>

                  <CardFooter className="p-3.5 pt-2 flex items-center justify-between border-t border-border/50 bg-muted/10">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Preço de Venda</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                        {formatarMoeda(prod.preco)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleAtivo(prod)}
                        title={isAtivo ? "Pausar Produto" : "Ativar Produto"}
                      >
                        {isAtivo ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700"
                        onClick={() => handleAbrirEdicao(prod)}
                        title="Editar Produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-700"
                        onClick={() => onExcluirProduto(prod.id)}
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
            );
          })
        )}
      </div>

      {/* MODAL: CRIAR / EDITAR PRODUTO */}
      <Dialog open={modalProdutoOpen} onOpenChange={setModalProdutoOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Cake className="w-5 h-5 text-primary" />
              {editingId ? "Editar Produto" : "Novo Produto para o Cardápio"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preencha os detalhes do produto que ficará disponível para seus clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 py-2">
            {/* Foto do Produto */}
            <div className="space-y-1.5 text-center">
              <Label className="text-xs font-semibold block text-left">Foto do Produto</Label>
              <div className="relative h-32 w-full rounded-2xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center bg-muted/20 overflow-hidden cursor-pointer group">
                {fotoUrl ? (
                  <>
                    <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      Trocar Foto
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground p-3">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-semibold">Clique para carregar uma foto</span>
                    <span className="text-[10px]">JPG, PNG ou WEBP</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-nome" className="text-xs font-semibold">Nome do Produto *</Label>
                <Input
                  id="prod-nome"
                  placeholder="Ex: Bolo Red Velvet Especial"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-8 text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-preco" className="text-xs font-semibold">Preço de Venda (R$) *</Label>
                <Input
                  id="prod-preco"
                  placeholder="R$ 0,00"
                  value={precoFormatado}
                  onChange={(e) => setPrecoFormatado(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-8 text-xs font-black text-foreground"
                  required
                />
              </div>
            </div>

            {editingId && (
              <div className="pt-1 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const p = produtos.find((item) => item.id === editingId);
                    if (p) {
                      setModalProdutoOpen(false);
                      handleAbrirFichaTecnica(p);
                    }
                  }}
                  className="w-full h-8.5 text-xs font-extrabold border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 gap-1.5 flex items-center justify-center rounded-xl transition-all shadow-2xs"
                >
                  <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>🧮 Abrir Ficha Técnica &amp; Calcular Custos</span>
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Categoria *</Label>
                <button
                  type="button"
                  onClick={() => setModalNovaCatOpen(true)}
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nova Categoria
                </button>
              </div>
              <Select value={categoria} onValueChange={(v: string) => setCategoria(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {todasCategoriasDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-desc" className="text-xs font-semibold">Descrição / Ingredientes</Label>
              <Textarea
                id="prod-desc"
                rows={2}
                placeholder="Ex: Massa aveludada vermelha com recheio cremoso e morangos frescos..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* SEÇÃO: DISPONIBILIDADE E AGENDAMENTO */}
            <div className="space-y-3 pt-3 border-t border-border">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Disponibilidade &amp; Agendamento
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAvailabilityType("pronta_entrega")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    availabilityType === "pronta_entrega"
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500"
                      : "bg-muted/40 border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      ⚡ Pronta Entrega / Imediato
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        availabilityType === "pronta_entrega"
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {availabilityType === "pronta_entrega" && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Disponível para entrega/retirada em dias específicos da semana.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAvailabilityType("encomenda")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    availabilityType === "encomenda"
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500"
                      : "bg-muted/40 border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      📅 Sob Encomenda
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        availabilityType === "encomenda"
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {availabilityType === "encomenda" && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Requer antecedência prévia mínima para produção.
                  </p>
                </button>
              </div>

              {availabilityType === "pronta_entrega" ? (
                <div className="space-y-2 pt-2 bg-purple-500/5 p-3 rounded-xl border border-purple-500/20">
                  <Label className="text-xs font-bold text-foreground">
                    Dias da Semana com Pronta Entrega Ativa:
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 pt-1">
                    {[
                      { id: 1, label: "Seg" },
                      { id: 2, label: "Ter" },
                      { id: 3, label: "Qua" },
                      { id: 4, label: "Qui" },
                      { id: 5, label: "Sex" },
                      { id: 6, label: "Sáb" },
                      { id: 0, label: "Dom" },
                    ].map((d) => {
                      const ativo = availableDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setAvailableDays((prev) =>
                              ativo ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                            );
                          }}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all text-center ${
                            ativo
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                              : "bg-background border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-2 bg-purple-500/5 p-3 rounded-xl border border-purple-500/20">
                  <Label htmlFor="prod-lead-time" className="text-xs font-bold text-foreground">
                    Antecedência Mínima Exigida (em Dias)
                  </Label>
                  <Input
                    id="prod-lead-time"
                    type="number"
                    min={0}
                    max={30}
                    value={minLeadTimeDays}
                    onChange={(e) => setMinLeadTimeDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-8 text-xs font-mono font-bold w-full sm:w-48 bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ex: 0 = pode pedir no mesmo dia | 1 = antecedência de 24h | 2 = 48h.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <div className="text-xs">
                <p className="font-bold text-foreground">Exibir como Destaque</p>
                <p className="text-[11px] text-muted-foreground">Aparecerá no topo do cardápio público.</p>
              </div>
              <input
                type="checkbox"
                checked={destaque}
                onChange={(e) => setDestaque(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
            </div>

            <DialogFooter className="pt-3 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalProdutoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold shadow-md">
                {editingId ? "Salvar Alterações" : "Cadastrar Produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CRIAR NOVA CATEGORIA */}
      <Dialog open={modalNovaCatOpen} onOpenChange={setModalNovaCatOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Nova Categoria</DialogTitle>
            <DialogDescription className="text-xs">
              Digite o nome da nova categoria para seus produtos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCriarCategoria} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="nova-cat-nome" className="text-xs font-semibold">Nome da Categoria *</Label>
              <Input
                id="nova-cat-nome"
                placeholder="Ex: Taças da Felicidade"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                className="h-8 text-xs font-semibold"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalNovaCatOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: QR CODE DO CARDÁPIO PÚBLICO */}
      <Dialog open={modalQrOpen} onOpenChange={setModalQrOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-base">QR Code do Cardápio</DialogTitle>
            <DialogDescription className="text-xs text-center">
              Imprima ou exiba este QR Code para seus clientes escanearem no balcão.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-stone-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkPublico)}`}
                alt="QR Code Cardápio"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs font-mono font-bold text-primary">
              Código Único: {estabelecimentoCodigo}
            </p>
          </div>

          <DialogFooter className="flex justify-center sm:justify-center">
            <Button size="sm" onClick={handleCopiarLink} className="text-xs font-bold">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link do Cardápio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL: FICHA TÉCNICA & PRECIFICAÇÃO */}
      <FichaTecnicaModal
        open={modalFichaOpen}
        onOpenChange={setModalFichaOpen}
        produto={produtoFichaAlvo}
        estabelecimentoCodigo={estabelecimentoCodigo}
        onAplicarPrecoProduto={async (prodId, novoPreco) => {
          await onEditarProduto(prodId, { preco: novoPreco });
        }}
      />
    </div>
  );
}
