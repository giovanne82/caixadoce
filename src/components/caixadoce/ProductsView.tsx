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
import { Switch } from "@/components/ui/switch";
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
  Upload,
  Box,
  Share2,
  Instagram,
  Facebook,
  MessageCircle,
  Music,
  UtensilsCrossed,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { FichaTecnicaModal } from "./FichaTecnicaModal";
import { MontarKitModal } from "./MontarKitModal";
import { InsumosView } from "./InsumosView";
import {
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  type ProdutoCardapio,
  type KitProduto,
} from "@/lib/caixadoce-data";
import { PALETAS_CORES_TEMA, type PaletaCorTema } from "@/lib/cardapio-helpers";
import { toast } from "sonner";

interface ProductsViewProps {
  produtos: ProdutoCardapio[];
  estabelecimentoCodigo: string;
  onCriarProduto: (dados: Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">) => Promise<void>;
  onEditarProduto: (id: string, dados: Partial<ProdutoCardapio>) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  onSalvarKit?: (kit: KitProduto) => Promise<void>;
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
  onSalvarKit,
}: ProductsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [modalProdutoOpen, setModalProdutoOpen] = useState(false);
  const [modalKitOpen, setModalKitOpen] = useState(false);
  const [kitEditing, setKitEditing] = useState<KitProduto | null>(null);
  const [modalQrOpen, setModalQrOpen] = useState(false);
  const [modalNovaCatOpen, setModalNovaCatOpen] = useState(false);
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [modalInsumosOpen, setModalInsumosOpen] = useState(false);
  const [produtoFichaAlvo, setProdutoFichaAlvo] = useState<ProdutoCardapio | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Personalização Visual do Cardápio
  const { profile, updateEstablishmentDetails } = useAuth();
  // Configuração da opção de Entrega (Delivery)
  const [deliveryAtivo, setDeliveryAtivo] = useState<boolean>(() => {
    if (typeof window !== "undefined" && estabelecimentoCodigo) {
      const localVal = localStorage.getItem(`caixadoce_delivery_${estabelecimentoCodigo}`);
      if (localVal !== null) return localVal === "true";
    }
    return profile?.delivery_ativo !== false && profile?.aceita_delivery !== false;
  });

  const handleToggleDelivery = async (checked: boolean) => {
    setDeliveryAtivo(checked);
    if (typeof window !== "undefined" && estabelecimentoCodigo) {
      localStorage.setItem(`caixadoce_delivery_${estabelecimentoCodigo}`, String(checked));
    }
    try {
      await updateEstablishmentDetails({
        delivery_ativo: checked,
        aceita_delivery: checked,
        deliveryHabilitado: checked,
      });
      toast.success(checked ? "Entrega (Delivery) ativada para seus clientes!" : "Delivery desativado (Apenas Retirada no Balcão).");
    } catch (err: any) {
      console.warn("[ProductsView] Erro ao atualizar status de delivery:", err);
      toast.info("Configuração salva no navegador.");
    }
  };

  const fileInputRefLogo = useRef<HTMLInputElement>(null);
  const fileInputRefBanner = useRef<HTMLInputElement>(null);
  const [modalPersonalizarOpen, setModalPersonalizarOpen] = useState(false);
  const [logoUrlCustom, setLogoUrlCustom] = useState(profile?.logoUrl || profile?.store_logo_url || "");
  const [bannerUrlCustom, setBannerUrlCustom] = useState(profile?.bannerUrl || profile?.banner_url || profile?.store_banner_url || "");
  const [themeColorCustom, setThemeColorCustom] = useState(profile?.themeColor || profile?.theme_color || profile?.corTema || "#8E7CC3");
  const [tituloCardapioCustom, setTituloCardapioCustom] = useState(profile?.tituloCardapio || profile?.menu_title || "");
  const [sloganCardapioCustom, setSloganCardapioCustom] = useState(profile?.sloganCardapio || profile?.menu_slogan || "");
  const [instagramCustom, setInstagramCustom] = useState(profile?.instagram || profile?.social_instagram || profile?.social_media?.instagram || "");
  const [tiktokCustom, setTiktokCustom] = useState(profile?.tiktok || profile?.social_tiktok || profile?.social_media?.tiktok || "");
  const [facebookCustom, setFacebookCustom] = useState(profile?.facebook || profile?.social_facebook || profile?.social_media?.facebook || "");
  const [salvandoVisual, setSalvandoVisual] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);

  const handleSalvarVisual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoVisual(true);
    try {
      await updateEstablishmentDetails({
        logoUrl: logoUrlCustom,
        store_logo_url: logoUrlCustom,
        bannerUrl: bannerUrlCustom,
        banner_url: bannerUrlCustom,
        store_banner_url: bannerUrlCustom,
        themeColor: themeColorCustom,
        theme_color: themeColorCustom,
        cor_destaque: themeColorCustom,
        tituloCardapio: tituloCardapioCustom,
        menu_title: tituloCardapioCustom,
        sloganCardapio: sloganCardapioCustom,
        menu_slogan: sloganCardapioCustom,
        instagram: instagramCustom,
        social_instagram: instagramCustom,
        tiktok: tiktokCustom,
        social_tiktok: tiktokCustom,
        facebook: facebookCustom,
        social_facebook: facebookCustom,
      });
      toast.success("Personalização visual do Cardápio salva com sucesso!");
      setModalPersonalizarOpen(false);
    } catch (err: any) {
      toast.error("Erro ao salvar personalização visual: " + (err.message || ""));
    } finally {
      setSalvandoVisual(false);
    }
  };

  const handleUploadLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_PRODUTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_PRODUTO_SIZE_BYTES) {
      toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
      if (e.target) e.target.value = "";
      return;
    }

    setEnviandoLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrlCustom(reader.result as string);
      setEnviandoLogo(false);
      toast.success("Logo carregada! Clique em Salvar para aplicar no cardápio.");
    };
    reader.onerror = () => {
      setEnviandoLogo(false);
      toast.error("Erro ao ler imagem.");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BANNER_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_BANNER_SIZE_BYTES) {
      toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
      if (e.target) e.target.value = "";
      return;
    }

    setEnviandoBanner(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBannerUrlCustom(reader.result as string);
      setEnviandoBanner(false);
      toast.success("Banner de capa carregado! Clique em Salvar para aplicar no cardápio.");
    };
    reader.onerror = () => {
      setEnviandoBanner(false);
      toast.error("Erro ao ler imagem do banner.");
    };
    reader.readAsDataURL(file);
  };

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

  // URL do Cardápio Público (prioriza o slug personalizado se existir)
  const slugOuCodigo = profile?.slug || estabelecimentoCodigo;
  const linkPublico = typeof window !== "undefined"
    ? `${window.location.origin}/cardapio/${slugOuCodigo}`
    : `/cardapio/${slugOuCodigo}`;

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

  // Upload de foto do produto
  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_PRODUTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
      if (file.size > MAX_PRODUTO_SIZE_BYTES) {
        toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
        if (e.target) e.target.value = "";
        return;
      }
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
            onClick={() => {
              setLogoUrlCustom(profile?.logoUrl || profile?.store_logo_url || "");
              setTituloCardapioCustom(profile?.tituloCardapio || profile?.menu_title || "");
              setSloganCardapioCustom(profile?.sloganCardapio || profile?.menu_slogan || "");
              setModalPersonalizarOpen(true);
            }}
            className="h-8.5 font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 border-0 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Personalizar Visual
          </Button>

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

          <a href={`/cardapio/${slugOuCodigo}`} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="h-8.5 text-xs bg-black/40 text-white hover:bg-black/60 border border-white/20"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Visualizar Cardápio
            </Button>
          </a>
        </div>
      </div>

      {/* Opção de Delivery (Entrega a Domicílio) no Cardápio Digital */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="space-y-0.5">
          <Label htmlFor="switch-delivery-cardapio" className="text-xs font-bold text-foreground flex items-center gap-2 cursor-pointer">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Habilitar opção de Entrega (Delivery) no Cardápio Digital
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {deliveryAtivo
              ? "Seus clientes poderão escolher entre Entrega / Delivery e Retirada no Balcão ao fazer pedidos."
              : "Delivery desativado. O Cardápio Digital aceitará apenas a modalidade de Retirada no Balcão."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Badge variant={deliveryAtivo ? "default" : "outline"} className="text-[10px] font-bold">
            {deliveryAtivo ? "Delivery Ativo" : "Apenas Retirada"}
          </Badge>
          <Switch
            id="switch-delivery-cardapio"
            checked={deliveryAtivo}
            onCheckedChange={handleToggleDelivery}
          />
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setKitEditing(null);
              setModalKitOpen(true);
            }}
            className="font-bold shadow-md bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
          >
            <Box className="w-4 h-4 mr-1.5" /> + Montar Kit
          </Button>

          <Button
            onClick={handleAbrirCriacao}
            className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
          </Button>
        </div>
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
                      {prod.isKit || prod.categoria === "Kits & Combos" ? (
                        <Badge className="bg-purple-700 text-white border-0 text-[10px] font-bold flex items-center gap-1">
                          <Box className="w-3 h-3" /> Kit ({(prod.itensKit || []).length} itens)
                        </Badge>
                      ) : (
                        <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-semibold">
                          {prod.categoria}
                        </Badge>
                      )}
                      {prod.destaque && (
                        <Badge className="bg-amber-500 text-white border-0 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Destaque
                        </Badge>
                      )}
                      {prod.isKit || prod.categoria === "Kits & Combos" ? (
                        <Badge className="bg-amber-600 text-white border-0 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {prod.prazoEntregaIndependente || "2 dias úteis"}
                        </Badge>
                      ) : prod.availability_type === "pronta_entrega" ? (
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
                  {prod.isKit || prod.categoria === "Kits & Combos" ? (
                    <Button
                      type="button"
                      onClick={() => {
                        setKitEditing({
                          id: prod.id,
                          estabelecimentoCodigo,
                          nome: prod.nome,
                          descricao: prod.descricao,
                          precoVenda: prod.preco,
                          custoTotalInsumos: prod.custoTotalInsumos || 0,
                          margemLucroPercentual: prod.margemLucroPercentual || 0,
                          prazoEntrega: prod.prazoEntregaIndependente || "2 dias úteis",
                          fotoUrl: prod.fotoUrl,
                          categoria: "Kits & Combos",
                          ativo: prod.ativo !== false,
                          itens: prod.itensKit || [],
                        });
                        setModalKitOpen(true);
                      }}
                      className="w-full h-8 text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/40 gap-1.5 flex items-center justify-center rounded-xl transition-all shadow-2xs"
                    >
                      <Box className="w-4 h-4 shrink-0" />
                      <span>📦 Editar Composição do Kit</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleAbrirFichaTecnica(prod)}
                      className="w-full h-8 text-xs font-extrabold bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 gap-1.5 flex items-center justify-center rounded-xl transition-all shadow-2xs"
                    >
                      <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>🧮 Ficha Técnica &amp; Custos</span>
                    </Button>
                  )}
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
              {profile?.slug ? `Link: caixadoce.com.br/cardapio/${profile.slug}` : `Código Único: ${estabelecimentoCodigo}`}
            </p>
          </div>

          <DialogFooter className="flex justify-center sm:justify-center">
            <Button size="sm" onClick={handleCopiarLink} className="text-xs font-bold">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link do Cardápio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PERSONALIZAÇÃO VISUAL DO CARDÁPIO (LOGO, TÍTULO, SLOGAN) */}
      <Dialog open={modalPersonalizarOpen} onOpenChange={setModalPersonalizarOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Personalização Visual do Cardápio Digital
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a logo, o título público e o slogan exibidos aos clientes no seu cardápio público.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarVisual} className="space-y-4 py-2 font-sans">
            {/* 1. Upload de Imagem de Capa (Banner) */}
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" /> Imagem de Capa (Banner do Topo)
                </Label>
                <span className="text-[10px] text-muted-foreground">Recomendado: 1200x400</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibida como topo panorâmico da sua vitrine pública no cardápio.
              </p>

              <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-background border-2 border-dashed border-purple-300 dark:border-purple-800 flex items-center justify-center group">
                {bannerUrlCustom ? (
                  <>
                    <img src={bannerUrlCustom} alt="Capa" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRefBanner.current?.click()}
                        className="text-xs font-bold bg-white/90 hover:bg-white text-stone-900"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Trocar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setBannerUrlCustom("")}
                        className="text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3 space-y-1.5">
                    <ImageIcon className="w-6 h-6 text-purple-400 mx-auto" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={enviandoBanner}
                      onClick={() => fileInputRefBanner.current?.click()}
                      className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {enviandoBanner ? "Enviando..." : "Enviar Imagem de Capa"}
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRefBanner}
                type="file"
                accept="image/*"
                onChange={handleUploadBannerFile}
                className="hidden"
              />

              {bannerUrlCustom && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBannerUrlCustom("")}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover Capa
                  </Button>
                </div>
              )}
            </div>

            {/* 2. Cor Principal de Destaque */}
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Cor Principal de Destaque
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">{themeColorCustom}</span>
                  <div
                    className="w-5 h-5 rounded-full border border-black/20 shadow-xs shrink-0"
                    style={{ backgroundColor: themeColorCustom }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {PALETAS_CORES_TEMA.map((paleta) => {
                  const isSelected = themeColorCustom.toLowerCase() === paleta.hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={paleta.id}
                      onClick={() => setThemeColorCustom(paleta.hex)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-purple-600 ring-2 ring-purple-600/30 bg-purple-50 dark:bg-purple-950/40 font-bold"
                          : "border-border hover:border-border/80 bg-background/60"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 flex items-center justify-center text-white"
                        style={{ backgroundColor: paleta.hex }}
                      >
                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                      </span>
                      <span className="text-[10px] text-foreground truncate">{paleta.nome.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Label className="text-[11px] font-semibold text-muted-foreground shrink-0">
                  Cor personalizada:
                </Label>
                <div className="flex items-center gap-1.5 flex-1 max-w-[160px]">
                  <input
                    type="color"
                    value={themeColorCustom}
                    onChange={(e) => setThemeColorCustom(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                  />
                  <Input
                    value={themeColorCustom}
                    onChange={(e) => setThemeColorCustom(e.target.value)}
                    placeholder="#8E7CC3"
                    className="h-7 text-xs font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* 3. Upload de Logo do Estabelecimento */}
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" /> Logo do Estabelecimento
              </Label>
              <p className="text-xs text-muted-foreground">
                Esta imagem será exibida no cabeçalho do seu cardápio público. Se deixada em branco, será utilizada a marca padrão.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="w-20 h-20 rounded-2xl bg-background border-2 border-dashed border-purple-300 dark:border-purple-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                  {logoUrlCustom ? (
                    <img src={logoUrlCustom} alt="Logo da loja" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1">
                      <CaixaDoceLogo size="sm" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <input
                    ref={fileInputRefLogo}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogoFile}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={enviandoLogo}
                      onClick={() => fileInputRefLogo.current?.click()}
                      className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {enviandoLogo ? "Enviando..." : "Enviar Logo Personalizada"}
                    </Button>
                    {logoUrlCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrlCustom("")}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover Logo
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Formatos suportados: PNG, JPG, WEBP, SVG</p>
                </div>
              </div>
            </div>

            {/* 2. Título e Slogan do Cardápio */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="menu-title-custom" className="text-xs font-bold">
                  Título do Cardápio (Público)
                </Label>
                <Input
                  id="menu-title-custom"
                  value={tituloCardapioCustom}
                  onChange={(e) => setTituloCardapioCustom(e.target.value)}
                  placeholder="Cardápio de Bolos & Doces Especiais"
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Exibido no cabeçalho do seu cardápio público. Padrão: <em>'Cardápio de Bolos & Doces Especiais'</em>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="menu-slogan-custom" className="text-xs font-bold">
                  Slogan / Descrição do Cardápio
                </Label>
                <Textarea
                  id="menu-slogan-custom"
                  rows={2}
                  value={sloganCardapioCustom}
                  onChange={(e) => setSloganCardapioCustom(e.target.value)}
                  placeholder="Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe."
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Exibido como mensagem de apresentação aos clientes.
                </p>
              </div>

              {/* 3. Redes Sociais no Cardápio Público */}
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-extrabold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <Share2 className="w-3.5 h-3.5" /> Redes Sociais no Cardápio Público
                  </Label>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[9px] font-bold">
                    Exibição Automática
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custom-instagram" className="text-[11px] font-semibold flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-pink-600" /> Instagram
                    </Label>
                    <Input
                      id="custom-instagram"
                      placeholder="@suaconfeitaria"
                      value={instagramCustom}
                      onChange={(e) => setInstagramCustom(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="custom-tiktok" className="text-[11px] font-semibold flex items-center gap-1">
                      <Music className="w-3 h-3 text-slate-800 dark:text-slate-200" /> TikTok
                    </Label>
                    <Input
                      id="custom-tiktok"
                      placeholder="@suaconfeitaria"
                      value={tiktokCustom}
                      onChange={(e) => setTiktokCustom(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="custom-facebook" className="text-[11px] font-semibold flex items-center gap-1">
                      <Facebook className="w-3 h-3 text-blue-600" /> Facebook
                    </Label>
                    <Input
                      id="custom-facebook"
                      placeholder="facebook.com/..."
                      value={facebookCustom}
                      onChange={(e) => setFacebookCustom(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalPersonalizarOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoVisual} className="font-extrabold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                {salvandoVisual ? "Salvando..." : "Salvar Alterações Visuais"}
              </Button>
            </DialogFooter>
          </form>
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

      {/* MODAL: MONTAGEM DE KITS */}
      <MontarKitModal
        open={modalKitOpen}
        onOpenChange={setModalKitOpen}
        produtosCardapio={produtos}
        estabelecimentoCodigo={estabelecimentoCodigo}
        kitEditing={kitEditing}
        onSalvarKit={async (kit) => {
          if (onSalvarKit) {
            await onSalvarKit(kit);
          }
        }}
      />

      {/* MODAL: GESTÃO DE INSUMOS */}
      <Dialog open={modalInsumosOpen} onOpenChange={setModalInsumosOpen}>
        <DialogContent className="w-[96vw] sm:w-[950px] max-w-[950px] h-[90vh] max-h-[850px] flex flex-col p-4 sm:p-6 overflow-hidden overflow-y-auto rounded-2xl">
          <InsumosView estabelecimentoCodigo={estabelecimentoCodigo} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
