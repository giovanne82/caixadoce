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
} from "lucide-react";
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

const CATEGORIAS_PRODUTO = [
  "Bolos Decorados",
  "Doces & Brigadeiros",
  "Tortas & Sobremesas",
  "Bentô Cakes",
  "Kits Festa",
] as const;

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Formulário de Produto
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoFormatado, setPrecoFormatado] = useState("");
  const [categoria, setCategoria] = useState<ProdutoCardapio["categoria"]>("Bolos Decorados");
  const [fotoUrl, setFotoUrl] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [tempoPreparoHoras, setTempoPreparoHoras] = useState<number>(24);
  const [ativo, setAtivo] = useState(true);

  // URL do Cardápio Público
  const linkPublico = typeof window !== "undefined"
    ? `${window.location.origin}/cardapio/${estabelecimentoCodigo}`
    : `/cardapio/${estabelecimentoCodigo}`;

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

  const handleAbrirCriacao = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setPrecoFormatado("");
    setCategoria("Bolos Decorados");
    setFotoUrl("");
    setDestaque(false);
    setTempoPreparoHoras(24);
    setAtivo(true);
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
    setTempoPreparoHoras(prod.tempoPreparoHoras || 24);
    setAtivo(prod.ativo !== false);
    setModalProdutoOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = converterMoedaInputParaNumero(precoFormatado);

    if (!nome || precoNum <= 0) {
      toast.error("Informe o nome e um preço válido para o produto.");
      return;
    }

    try {
      const payload = {
        nome,
        descricao,
        preco: precoNum,
        categoria,
        fotoUrl: fotoUrl || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
        destaque,
        tempoPreparoHoras,
        ativo,
      };

      if (editingId) {
        await onEditarProduto(editingId, payload);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await onCriarProduto(payload);
        toast.success("Novo produto adicionado ao cardápio!");
      }
      setModalProdutoOpen(false);
    } catch {
      toast.error("Erro ao salvar produto.");
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
      {/* Banner de Compartilhamento do Cardápio Público com Código Único */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-800 rounded-3xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
            variant="outline"
            size="sm"
            onClick={() => setModalQrOpen(true)}
            className="h-8.5 text-xs text-white border-white/40 hover:bg-white/10"
          >
            <QrCode className="w-3.5 h-3.5 mr-1" /> QR Code
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

        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            variant={categoriaFiltro === "todas" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoriaFiltro("todas")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Todos ({produtos.length})
          </Button>
          {CATEGORIAS_PRODUTO.map((cat) => (
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
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                        {prod.categoria}
                      </Badge>
                      {prod.destaque && (
                        <Badge className="bg-amber-500 text-white border-0 text-[10px] font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Destaque
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(prod)}
                      className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        isAtivo ? "bg-emerald-600/90 text-white" : "bg-stone-800/80 text-muted-foreground"
                      }`}
                      title={isAtivo ? "Ativo no Cardápio" : "Pausado"}
                    >
                      {isAtivo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <CardHeader className="p-3.5 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-extrabold text-foreground leading-tight">
                        {prod.nome}
                      </CardTitle>
                      <span className="text-base font-black text-foreground shrink-0 font-mono">
                        {formatarMoeda(prod.preco)}
                      </span>
                    </div>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {prod.descricao}
                    </CardDescription>
                  </CardHeader>
                </div>

                <CardFooter className="p-3.5 pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    Preparo: ~{prod.tempoPreparoHoras || 24}h
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAbrirEdicao(prod)}
                      className="h-7 px-2 text-xs font-semibold"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Deseja excluir o produto "${prod.nome}"?`)) {
                          onExcluirProduto(prod.id);
                        }
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR OU EDITAR PRODUTO */}
      {/* ========================================================================= */}
      <Dialog open={modalProdutoOpen} onOpenChange={setModalProdutoOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Cake className="w-5 h-5 text-primary" />
              {editingId ? "Editar Produto" : "Novo Produto no Cardápio"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione fotos e valores para exibir aos clientes no cardápio público e na seleção de encomendas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3.5 py-2">
            {/* Foto do Produto */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Foto do Produto</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadFoto}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs font-semibold"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1" /> Escolher Foto
                  </Button>
                  <Input
                    placeholder="Ou cole o link da imagem (URL)..."
                    value={fotoUrl}
                    onChange={(e) => setFotoUrl(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select value={categoria} onValueChange={(v: any) => setCategoria(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_PRODUTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-tempo" className="text-xs font-semibold">Tempo Médio de Preparo (Horas)</Label>
                <Input
                  id="prod-tempo"
                  type="number"
                  min="1"
                  value={tempoPreparoHoras}
                  onChange={(e) => setTempoPreparoHoras(Number(e.target.value) || 24)}
                  className="h-8 text-xs font-bold"
                />
              </div>
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

      {/* ========================================================================= */}
      {/* MODAL: QR CODE DO CARDÁPIO PÚBLICO */}
      {/* ========================================================================= */}
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
    </div>
  );
}
