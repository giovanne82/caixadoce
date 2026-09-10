import { useState, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Pencil,
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
  MessageCircle,
  UtensilsCrossed,
  AlertTriangle,
  Scale,
  Store,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  type ProdutoOpcao,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ProductsViewProps {
  produtos: ProdutoCardapio[];
  estabelecimentoCodigo: string;
  onCriarProduto: (dados: Omit<ProdutoCardapio, "id" | "estabelecimentoCodigo" | "createdAt">) => Promise<void>;
  onEditarProduto: (id: string, dados: Partial<ProdutoCardapio>) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  onSalvarKit?: (kit: KitProduto) => Promise<void>;
  onIrParaConfiguracoes?: () => void;
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
  onIrParaConfiguracoes,
}: ProductsViewProps) {
  const navigate = useNavigate();
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

  // Informações do Estabelecimento & Delivery
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
  const [galeriaFotos, setGaleriaFotos] = useState<string[]>([]);
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  const [servePessoas, setServePessoas] = useState<number | "">("");
  const [pesoDetalhe, setPesoDetalhe] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [vendePorPeso, setVendePorPeso] = useState(false);
  const [visivelCardapioDigital, setVisivelCardapioDigital] = useState(true);
  const [visivelPdv, setVisivelPdv] = useState(true);

  // Opções de Escolha do Produto (Sabores, Tamanhos, etc.)
  const [opcoes, setOpcoes] = useState<ProdutoOpcao[]>([]);
  const [nomeNovaOpcao, setNomeNovaOpcao] = useState("");
  const [precoAdicionalNovaOpcao, setPrecoAdicionalNovaOpcao] = useState("");
  const [permiteMultiplasOpcoes, setPermiteMultiplasOpcoes] = useState<boolean>(false);
  const [editingOpcaoId, setEditingOpcaoId] = useState<string | null>(null);

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

  // Upload múltiplo de fotos do produto para o Storage com fallback
  const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_PRODUTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    setEnviandoFotos(true);
    try {
      const urlsAdicionadas: string[] = [];
      for (const file of files) {
        if (file.size > MAX_PRODUTO_SIZE_BYTES) {
          toast.warning(`A imagem "${file.name}" é muito pesada (>5MB) e foi ignorada.`);
          continue;
        }

        let uploadedUrl = "";
        try {
          const fileExt = file.name.split(".").pop() || "jpg";
          const filePath = `produtos/${estabelecimentoCodigo || "CD-1001"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("public")
            .upload(filePath, file, { upsert: true });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage.from("public").getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              uploadedUrl = publicUrlData.publicUrl;
            }
          }
        } catch (errUpload) {
          console.warn("[Upload Storage Fallback]", errUpload);
        }

        if (!uploadedUrl) {
          // Fallback base64
          uploadedUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        if (uploadedUrl) {
          urlsAdicionadas.push(uploadedUrl);
        }
      }

      if (urlsAdicionadas.length > 0) {
        setGaleriaFotos((prev) => {
          const combined = [...prev, ...urlsAdicionadas];
          if (combined.length > 0) {
            setFotoUrl(combined[0]);
          }
          return combined;
        });
        toast.success(`${urlsAdicionadas.length} foto(s) adicionada(s) à galeria!`);
      }
    } catch (e: any) {
      console.error("Erro no upload de fotos:", e);
      toast.error("Erro ao enviar imagem.");
    } finally {
      setEnviandoFotos(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoverFotoGaleria = (indexRemover: number) => {
    setGaleriaFotos((prev) => {
      const nova = prev.filter((_, idx) => idx !== indexRemover);
      setFotoUrl(nova.length > 0 ? nova[0] : "");
      return nova;
    });
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

  const handleAdicionarOuSalvarOpcao = () => {
    const nomeLimpo = nomeNovaOpcao.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome da opção (ex: Morango, 1kg, etc).");
      return;
    }
    const precoNum = converterMoedaInputParaNumero(precoAdicionalNovaOpcao);

    if (editingOpcaoId) {
      setOpcoes((prev) =>
        prev.map((o) =>
          o.id === editingOpcaoId
            ? { ...o, nome: nomeLimpo, preco_adicional: precoNum >= 0 ? precoNum : 0 }
            : o
        )
      );
      setEditingOpcaoId(null);
      setNomeNovaOpcao("");
      setPrecoAdicionalNovaOpcao("");
      toast.success(`Opção "${nomeLimpo}" atualizada!`);
    } else {
      const nova: ProdutoOpcao = {
        id: crypto.randomUUID(),
        nome: nomeLimpo,
        preco_adicional: precoNum >= 0 ? precoNum : 0,
      };
      setOpcoes((prev) => [...prev, nova]);
      setNomeNovaOpcao("");
      setPrecoAdicionalNovaOpcao("");
      toast.success(`Opção "${nomeLimpo}" adicionada!`);
    }
  };

  const handleEditarOpcao = (opc: ProdutoOpcao) => {
    setEditingOpcaoId(opc.id);
    setNomeNovaOpcao(opc.nome);
    setPrecoAdicionalNovaOpcao(
      opc.preco_adicional > 0 ? `R$ ${opc.preco_adicional.toFixed(2).replace(".", ",")}` : ""
    );
  };

  const handleCancelarEdicaoOpcao = () => {
    setEditingOpcaoId(null);
    setNomeNovaOpcao("");
    setPrecoAdicionalNovaOpcao("");
  };

  const handleRemoverOpcao = (idOpcao: string) => {
    if (editingOpcaoId === idOpcao) {
      handleCancelarEdicaoOpcao();
    }
    setOpcoes((prev) => prev.filter((o) => o.id !== idOpcao));
  };

  const handleAbrirCriacao = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setPrecoFormatado("");
    setCategoria(todasCategoriasDisponiveis[0] || "Bolos");
    setFotoUrl("");
    setGaleriaFotos([]);
    setServePessoas("");
    setPesoDetalhe("");
    setDestaque(false);
    setAtivo(true);
    setVendePorPeso(false);
    setVisivelCardapioDigital(true);
    setVisivelPdv(true);
    setOpcoes([]);
    setNomeNovaOpcao("");
    setPrecoAdicionalNovaOpcao("");
    setPermiteMultiplasOpcoes(false);
    setEditingOpcaoId(null);
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
    const fotos = Array.isArray(prod.galeria_fotos) && prod.galeria_fotos.length > 0
      ? prod.galeria_fotos
      : (prod.fotoUrl ? [prod.fotoUrl] : []);
    setGaleriaFotos(fotos);
    setFotoUrl(prod.fotoUrl || (fotos[0] || ""));
    setServePessoas(prod.serve_pessoas !== null && prod.serve_pessoas !== undefined ? prod.serve_pessoas : "");
    setPesoDetalhe(prod.peso_detalhe || "");
    setDestaque(!!prod.destaque);
    setAtivo(prod.ativo !== false);
    setVendePorPeso(Boolean(prod.vende_por_peso || prod.unidade_venda === "kg"));
    setVisivelCardapioDigital((prod.visivel_cardapio_digital ?? true) !== false);
    setVisivelPdv((prod.visivel_pdv ?? true) !== false);
    setOpcoes(prod.opcoes && Array.isArray(prod.opcoes) ? prod.opcoes : []);
    setNomeNovaOpcao("");
    setPrecoAdicionalNovaOpcao("");
    setPermiteMultiplasOpcoes(Boolean(prod.permite_multiplas_opcoes));
    setEditingOpcaoId(null);
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
      const fotosParaSalvar = galeriaFotos.length > 0
        ? galeriaFotos
        : (fotoUrl ? [fotoUrl] : []);
      const fotoPrincipal = fotosParaSalvar[0] || fotoUrl || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80";

      const payload: Partial<ProdutoCardapio> = {
        nome,
        descricao,
        preco: precoNum,
        categoria,
        fotoUrl: fotoPrincipal,
        galeria_fotos: fotosParaSalvar,
        serve_pessoas: servePessoas !== "" && !isNaN(Number(servePessoas)) ? Number(servePessoas) : undefined,
        peso_detalhe: pesoDetalhe.trim() || undefined,
        destaque,
        tempoPreparoHoras: availabilityType === "encomenda" ? minLeadTimeDays * 24 : 0,
        ativo,
        availability_type: availabilityType,
        available_days: availableDays,
        min_lead_time_days: minLeadTimeDays,
        opcoes,
        permite_multiplas_opcoes: permiteMultiplasOpcoes,
        vende_por_peso: Boolean(vendePorPeso),
        unidade_venda: vendePorPeso ? "kg" : "un",
        visivel_cardapio_digital: Boolean(visivelCardapioDigital),
        visivel_pdv: Boolean(visivelPdv),
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
              if (onIrParaConfiguracoes) {
                onIrParaConfiguracoes();
              } else {
                navigate({ to: "/configuracoes", hash: "identidade-visual" });
              }
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

                    {/* Badges Flutuantes Superiores */}
                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 max-w-[70%]">
                      {prod.isKit || prod.categoria === "Kits & Combos" ? (
                        <Badge className="bg-purple-700 text-white border-0 text-[10.5px] font-black flex items-center gap-1 shadow-md">
                          <Box className="w-3.5 h-3.5" /> Kit ({(prod.itensKit || []).length} itens)
                        </Badge>
                      ) : (
                        <Badge className="bg-black/75 backdrop-blur-md text-white border-0 text-[10.5px] font-bold shadow-md">
                          {prod.categoria}
                        </Badge>
                      )}
                      {prod.destaque && (
                        <Badge className="bg-amber-400 text-slate-950 border-0 text-[10px] font-black flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3" /> Destaque
                        </Badge>
                      )}
                    </div>

                    {/* Status Ativo / Pausado no Canto Superior Direito */}
                    <div className="absolute top-2 right-2">
                      {isAtivo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 text-[10.5px] font-black px-2 py-0.5 shadow-md flex items-center gap-1">
                          <Eye className="w-3 h-3 stroke-[2.5]" /> Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 hover:bg-rose-600 text-white border-0 text-[10.5px] font-black px-2 py-0.5 shadow-md flex items-center gap-1">
                          <EyeOff className="w-3 h-3 stroke-[2.5]" /> Pausado
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* BARRA DE CANAIS & VISIBILIDADE (ALTO CONTRASTE) */}
                  <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-1.5 flex-wrap">
                    {/* Canal Cardápio Digital */}
                    {prod.visivel_cardapio_digital !== false ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10.5px] font-black shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>🌐 Cardápio Online</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-500/50 text-[10.5px] font-bold shadow-xs">
                        <EyeOff className="w-3 h-3 text-rose-400" />
                        <span>🌐 Cardápio: Oculto</span>
                      </div>
                    )}

                    {/* Canal PDV de Balcão */}
                    {prod.visivel_pdv !== false ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10.5px] font-black shadow-xs">
                        <Store className="w-3 h-3" />
                        <span>🏪 PDV Balcão</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10.5px] font-bold shadow-xs">
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        <span>🏪 PDV: Oculto</span>
                      </div>
                    )}

                    {/* Modalidade Peso vs Unidade */}
                    {prod.vende_por_peso ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10.5px] font-black shadow-xs">
                        <Scale className="w-3 h-3 stroke-[2.5]" />
                        <span>⚖️ R$/kg</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        <span>📦 Unidade</span>
                      </div>
                    )}
                  </div>

                  <CardHeader className="p-3.5 pt-1.5 pb-1">
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

                <CardFooter className="p-3.5 pt-2.5 flex items-center justify-between border-t border-border/50 bg-muted/10">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                      {prod.vende_por_peso ? "Preço do Quilo" : "Preço de Venda"}
                    </span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                      {formatarMoeda(prod.preco)} {prod.vende_por_peso ? <span className="text-xs font-semibold text-muted-foreground">/kg</span> : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2.5 text-xs font-black gap-1 rounded-xl transition-all ${
                        isAtivo
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/40"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 border-rose-500/40"
                      }`}
                      onClick={() => handleToggleAtivo(prod)}
                      title={isAtivo ? "Clique para pausar produto" : "Clique para ativar produto"}
                    >
                      {isAtivo ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Pausado</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30"
                      onClick={() => handleAbrirEdicao(prod)}
                      title="Editar Produto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30"
                      onClick={() => onExcluirProduto(prod.id)}
                      title="Excluir Produto"
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
            {/* Galeria de Fotos do Produto (Upload Múltiplo) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  Galeria de Fotos do Produto
                </Label>
                {galeriaFotos.length > 0 && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                    {galeriaFotos.length} {galeriaFotos.length === 1 ? "foto" : "fotos"}
                  </Badge>
                )}
              </div>

              {/* Grid de Miniaturas da Galeria */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {galeriaFotos.map((url, idx) => (
                  <div
                    key={`${url}_${idx}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border/80 bg-muted/30 group shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        Principal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoverFotoGaleria(idx)}
                      title="Remover foto"
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-all shadow-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Botão para Adicionar Mais Fotos */}
                <label className={`relative aspect-square rounded-xl border-2 border-dashed border-purple-400/50 hover:border-purple-600 dark:border-purple-800/60 dark:hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${enviandoFotos ? "opacity-60 cursor-not-allowed" : "hover:bg-purple-100/40"}`}>
                  {enviandoFotos ? (
                    <>
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 text-center px-1">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 text-center px-1">Adicionar Fotos</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={enviandoFotos}
                    onChange={handleUploadFotos}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Selecione uma ou mais fotos (JPG, PNG ou WEBP). A primeira foto será a capa principal.
              </p>
            </div>

            {/* Tipo de Venda (Unidade vs Peso/Quilo) */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-600" />
                Modalidade de Venda
              </Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setVendePorPeso(false)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !vendePorPeso
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Por Unidade (R$/un)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVendePorPeso(true)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    vendePorPeso
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Por Peso (R$/kg)</span>
                </button>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                {vendePorPeso
                  ? "⚖️ No PDV de Balcão, o operador poderá digitar a pesagem em gramas (ex: 350g) e o sistema calculará o valor proporcional."
                  : "📦 Preço cobrado por unidade inteira do item."}
              </p>
            </div>

            {/* Novos Campos: Rendimento e Peso/Tamanho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/80">
              <div className="space-y-1">
                <Label htmlFor="prod-rendimento" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  Rendimento (Serve quantas pessoas?)
                </Label>
                <Input
                  id="prod-rendimento"
                  type="number"
                  min="1"
                  placeholder="Ex: 15"
                  value={servePessoas}
                  onChange={(e) => setServePessoas(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-8 text-xs bg-background font-semibold"
                />
                <span className="text-[10px] text-muted-foreground">Opcional. Exibido no cardápio</span>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-peso" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  Peso / Tamanho
                </Label>
                <Input
                  id="prod-peso"
                  placeholder="Ex: 1,5kg, 500g, 20 fatias"
                  value={pesoDetalhe}
                  onChange={(e) => setPesoDetalhe(e.target.value)}
                  className="h-8 text-xs bg-background font-semibold"
                />
                <span className="text-[10px] text-muted-foreground">Opcional. Exibido no cardápio</span>
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
                <Label htmlFor="prod-preco" className="text-xs font-semibold">
                  {vendePorPeso ? "Preço do Quilo (R$/kg) *" : "Preço de Venda (R$) *"}
                </Label>
                <Input
                  id="prod-preco"
                  placeholder={vendePorPeso ? "R$ 0,00 /kg" : "R$ 0,00"}
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

            {/* SEÇÃO: OPÇÕES DE ESCOLHA (EX: SABORES, TAMANHOS) */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-purple-600" />
                    Opções de Escolha (Ex: Sabores, Tamanhos)
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Permita que o cliente escolha o sabor ou tamanho no cardápio público.
                  </p>
                </div>
                {opcoes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {opcoes.length} {opcoes.length === 1 ? "opção" : "opções"}
                  </Badge>
                )}
              </div>

              {/* Inputs para adicionar ou editar opção */}
              <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <Label htmlFor="nome-opcao" className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Nome da Opção / Sabor *</span>
                      {editingOpcaoId && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          ✏️ Editando Opção
                        </span>
                      )}
                    </Label>
                    <Input
                      id="nome-opcao"
                      placeholder="Ex: Ninho com Morango"
                      value={nomeNovaOpcao}
                      onChange={(e) => setNomeNovaOpcao(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdicionarOuSalvarOpcao();
                        }
                      }}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label htmlFor="preco-opcao" className="text-[11px] font-semibold text-foreground">
                      Preço Extra (Opcional)
                    </Label>
                    <Input
                      id="preco-opcao"
                      placeholder="R$ 0,00"
                      value={precoAdicionalNovaOpcao}
                      onChange={(e) => setPrecoAdicionalNovaOpcao(aplicarMascaraMoedaInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdicionarOuSalvarOpcao();
                        }
                      }}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarOuSalvarOpcao}
                      className="flex-1 h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1 shadow-xs"
                    >
                      {editingOpcaoId ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </>
                      )}
                    </Button>
                    {editingOpcaoId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelarEdicaoOpcao}
                        className="h-8 px-2 text-xs text-muted-foreground"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Listagem das opções já adicionadas */}
                {opcoes.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Opções Ativas para este Produto:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {opcoes.map((opc) => (
                        <div
                          key={opc.id}
                          className={`flex items-center justify-between p-2 rounded-xl bg-background border shadow-2xs text-xs transition-all ${
                            editingOpcaoId === opc.id
                              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20"
                              : "border-border"
                          }`}
                        >
                          <div className="truncate flex-1 mr-2">
                            <span className="font-bold text-foreground truncate block">{opc.nome}</span>
                            {opc.preco_adicional > 0 ? (
                              <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                + {formatarMoeda(opc.preco_adicional)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sem custo adicional</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarOpcao(opc)}
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg"
                              title="Editar Opção"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverOpcao(opc.id)}
                              className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              title="Excluir Opção"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Toggle / Switch de Múltipla Escolha */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/80 mt-2">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="toggle-multiplas-opcoes" className="text-xs font-bold text-foreground cursor-pointer block">
                      Permitir que o cliente selecione mais de uma opção
                    </Label>
                    <p className="text-[10.5px] text-muted-foreground">
                      Quando ativado, o cardápio exibe caixas de seleção (Checkboxes) para múltipla escolha.
                    </p>
                  </div>
                  <Switch
                    id="toggle-multiplas-opcoes"
                    checked={permiteMultiplasOpcoes}
                    onCheckedChange={setPermiteMultiplasOpcoes}
                  />
                </div>
              </div>
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

            {/* Canais de Exibição */}
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Store className="w-4 h-4 text-primary" /> Canais de Exibição do Produto
                </Label>
              </div>

              <div className="space-y-2 pt-0.5">
                {/* Switch Cardápio Digital */}
                <div
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    visivelCardapioDigital
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-2xs"
                      : "bg-rose-500/10 border-rose-500/30 opacity-80"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="toggle-visivel-cardapio" className="text-xs font-black text-foreground cursor-pointer block">
                        🌐 Cardápio Digital (Online)
                      </Label>
                      <Badge
                        className={`text-[9.5px] font-black px-1.5 py-0 border-0 ${
                          visivelCardapioDigital
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {visivelCardapioDigital ? "Ativo no Cardápio" : "Oculto no Cardápio"}
                      </Badge>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      {visivelCardapioDigital
                        ? "Visível para clientes navegarem e encomendarem online."
                        : "Desativado do cardápio público dos clientes."}
                    </p>
                  </div>
                  <Switch
                    id="toggle-visivel-cardapio"
                    checked={visivelCardapioDigital}
                    onCheckedChange={setVisivelCardapioDigital}
                  />
                </div>

                {/* Switch PDV Balcão */}
                <div
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    visivelPdv
                      ? "bg-indigo-500/10 border-indigo-500/40 shadow-2xs"
                      : "bg-slate-800/40 border-slate-700/60 opacity-80"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="toggle-visivel-pdv" className="text-xs font-black text-foreground cursor-pointer block">
                        🏪 PDV de Balcão (Frente de Caixa)
                      </Label>
                      <Badge
                        className={`text-[9.5px] font-black px-1.5 py-0 border-0 ${
                          visivelPdv
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {visivelPdv ? "Ativo no PDV" : "Oculto no PDV"}
                      </Badge>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      {visivelPdv
                        ? "Disponível para operadores lançarem vendas na tela de PDV."
                        : "Ocultado da grade de produtos do PDV."}
                    </p>
                  </div>
                  <Switch
                    id="toggle-visivel-pdv"
                    checked={visivelPdv}
                    onCheckedChange={setVisivelPdv}
                  />
                </div>
              </div>
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
