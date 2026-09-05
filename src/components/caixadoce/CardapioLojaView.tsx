import { useState, useMemo, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
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
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Cake,
  ShoppingCart,
  Plus,
  Minus,
  MessageCircle,
  Clock,
  Sparkles,
  Store,
  Truck,
  QrCode,
  CreditCard,
  Instagram,
  Facebook,
  Music,
  Check,
  Copy,
  AlertCircle,
  FileText,
  Loader2,
  User,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  MapPin,
  ChevronDown,
  X,
  AlertTriangle,
  HeartHandshake,
  History,
} from "lucide-react";
import {
  formatarMoeda,
  formatarWhatsappLink,
  formatarLinkRedeSocial,
  aplicarMascaraTelefone,
  obterProdutosCardapio,
  obterRegrasAgendamento,
  calcularRegrasAgendamentoCarrinho,
  formatarBadgeDisponibilidadeProduto,
  validarDataEntrega,
  validarHorarioEntrega,
} from "@/lib/cardapio-helpers";
import { generatePixPayload, CATALOGO_PRODUTOS_PADRAO, type ProdutoCardapio } from "@/lib/caixadoce-data";
import {
  obterConfiguracoesStripeLoja,
  createStripeSession,
} from "@/lib/stripe-connect-service";
import {
  calculateDynamicTotal,
  getInstallmentOptions,
} from "@/lib/stripeFees";
import {
  obterConfiguracaoFrete,
  carregarConfiguracaoFreteAsync,
  calcularFretePedido,
  type ConfiguracaoFrete,
  CONFIG_FRETE_PADRAO,
} from "@/lib/frete-service";
import { gerarPixMercadoPago } from "@/lib/mercadopago-service";
import { toast } from "sonner";

// ==========================================
// 1. INTERFACES & TIPAGENS DO CARDÁPIO
// ==========================================

export interface ItemCarrinho {
  produto: ProdutoCardapio;
  quantidade: number;
}

export interface SocialLinksProps {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  whatsapp?: string;
  telefone?: string;
  variant?: "header" | "banner" | "footer";
}

export interface LojaInfoState {
  id?: string;
  estabelecimento_id?: string;
  codigo?: string;
  slug?: string;
  whatsapp?: string;
  telefone?: string;
  user_id?: string;
  nome?: string;
  logo_url?: string;
  store_logo_url?: string;
  banner_url?: string;
  store_banner_url?: string;
  bannerUrl?: string;
  theme_color?: string;
  themeColor?: string;
  cor_destaque?: string;
  corTema?: string;
  titulo_cardapio?: string;
  menu_title?: string;
  slogan_cardapio?: string;
  menu_slogan?: string;
  chave_pix?: string;
  chavePix?: string;
  tipo_chave_pix?: string;
  cidade?: string;
  endereco?: string;
  delivery_ativo?: boolean;
  aceita_delivery?: boolean;
  usar_mercadopago?: boolean;
  mp_access_token?: string | null;
  chave_pix_manual?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  social_media?: any;
}

// ==========================================
// 2. COMPONENTES AUXILIARES PUROS NO TOPO
// ==========================================

export function SocialLinks({
  instagram,
  tiktok,
  facebook,
  whatsapp,
  telefone,
  variant = "header",
}: SocialLinksProps) {
  const instaUrl = formatarLinkRedeSocial("instagram", instagram);
  const tiktokUrl = formatarLinkRedeSocial("tiktok", tiktok);
  const fbUrl = formatarLinkRedeSocial("facebook", facebook);
  const waUrl = formatarLinkRedeSocial("whatsapp", whatsapp || telefone);

  if (!instaUrl && !tiktokUrl && !fbUrl && !waUrl) return null;

  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
        {instaUrl && (
          <a
            href={instaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-xs hover:opacity-95 transition-all transform hover:scale-105"
          >
            <Instagram className="w-3.5 h-3.5 text-white" />
            <span>Instagram</span>
          </a>
        )}
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white shadow-xs hover:bg-black transition-all transform hover:scale-105"
          >
            <Music className="w-3.5 h-3.5 text-pink-400" />
            <span>TikTok</span>
          </a>
        )}
        {fbUrl && (
          <a
            href={fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-all transform hover:scale-105"
          >
            <Facebook className="w-3.5 h-3.5 text-white" />
            <span>Facebook</span>
          </a>
        )}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-all transform hover:scale-105"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp</span>
          </a>
        )}
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className="flex items-center justify-center gap-3 pt-1">
        {instaUrl && (
          <a
            href={instaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 transition-all"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
        )}
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-800/10 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-800/20 transition-all"
            title="TikTok"
          >
            <Music className="w-4 h-4" />
          </a>
        )}
        {fbUrl && (
          <a
            href={fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all"
            title="Facebook"
          >
            <Facebook className="w-4 h-4" />
          </a>
        )}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
            title="WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {instaUrl && (
        <a
          href={instaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 bg-pink-500/10 hover:bg-pink-500/20 px-2 py-0.5 rounded-full transition-all"
          title="Instagram da loja"
        >
          <Instagram className="w-3 h-3 text-pink-600 dark:text-pink-400" />
          <span className="hidden sm:inline">Instagram</span>
        </a>
      )}
      {tiktokUrl && (
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:text-black bg-slate-800/10 dark:bg-white/10 hover:bg-slate-800/20 px-2 py-0.5 rounded-full transition-all"
          title="TikTok da loja"
        >
          <Music className="w-3 h-3" />
          <span className="hidden sm:inline">TikTok</span>
        </a>
      )}
      {fbUrl && (
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-full transition-all"
          title="Facebook da loja"
        >
          <Facebook className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Facebook</span>
        </a>
      )}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full transition-all"
          title="WhatsApp da loja"
        >
          <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </div>
  );
}

// ==========================================
// 3. COMPONENTE PRINCIPAL DO CARDÁPIO
// ==========================================

export function CardapioLojaView() {
  // Leitura desacoplada e segura dos parâmetros de rota (suporta slug ou código)
  const routeParams = useParams({ strict: false }) as Record<string, string> | undefined;
  const rawParam = (routeParams?.storeCode || routeParams?.idOuSlug || routeParams?.slug || "CD-1001").trim();
  const [code, setCode] = useState<string>(rawParam.toUpperCase());

  // Dados da Loja
  const [lojaInfo, setLojaInfo] = useState<LojaInfoState | null>(null);

  // Estados dos Produtos e Carrinho
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState<boolean>(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todas");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);

  // Modais de Resumo e Sucesso do Pedido
  const [resumoModalOpen, setResumoModalOpen] = useState(false);
  const [sucessoModalOpen, setSucessoModalOpen] = useState(false);
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [ultimoPedidoId, setUltimoPedidoId] = useState("");
  const [pedidoCriadoId, setPedidoCriadoId] = useState<string | null>(null);

  // Dados de Conclusão do Pix & Mercado Pago
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [mpPaymentId, setMpPaymentId] = useState<string | number | null>(null);
  const [pagamentoAprovadoMp, setPagamentoAprovadoMp] = useState<boolean>(false);

  // Estados de Identificação e Retenção do Cliente (Local Storage)
  const [savedUserPhone, setSavedUserPhone] = useState<string>("");
  const [savedUserName, setSavedUserName] = useState<string>("");
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string;
    data: string;
    data_entrega?: string;
    horario_entrega?: string;
    tipo_entrega?: string;
    valor_total: number;
    status: string;
    itens: string;
    total_itens?: number;
    loja_codigo?: string;
    loja_nome?: string;
  }>>([]);
  const [ultimosPedidosModalOpen, setUltimosPedidosModalOpen] = useState(false);

  // Estados do Formulário de Checkout do Cliente
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [endLogradouro, setEndLogradouro] = useState("");
  const [endNumero, setEndNumero] = useState("");
  const [endBairro, setEndBairro] = useState("");
  const [endCep, setEndCep] = useState("");
  const [endPontoRef, setEndPontoRef] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [observacoes, setObservacoes] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<number>(1);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // Configurações de Frete & Entrega
  const [freteConfig, setFreteConfig] = useState<ConfiguracaoFrete>(() => obterConfiguracaoFrete(code));
  const [regiaoEntregaId, setRegiaoEntregaId] = useState<string>("");

  // Dias e Modos
  const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState<number | "todos">(() => new Date().getDay());
  const [tabModoHibrido, setTabModoHibrido] = useState<"todos" | "pronta_entrega" | "encomenda">("todos");

  // ==========================================
  // VALORES CALCULADOS & MEMOS
  // ==========================================
  const DIAS_SEMANA_KANBAN = [
    { dia: 1, label: "Seg", nome: "Segunda" },
    { dia: 2, label: "Ter", nome: "Terça" },
    { dia: 3, label: "Qua", nome: "Quarta" },
    { dia: 4, label: "Qui", nome: "Quinta" },
    { dia: 5, label: "Sex", nome: "Sexta" },
    { dia: 6, label: "Sáb", nome: "Sábado" },
    { dia: 0, label: "Dom", nome: "Domingo" },
  ];

  const hojeDiaSemana = useMemo(() => new Date().getDay(), []);

  const stripeConfig = useMemo(() => obterConfiguracoesStripeLoja(code), [code]);
  const regrasBase = useMemo(() => obterRegrasAgendamento(code), [code]);
  const regras = useMemo(
    () => calcularRegrasAgendamentoCarrinho(regrasBase, carrinho),
    [regrasBase, carrinho]
  );

  const dataMinimaStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const necessitaConfirmacaoDisponibilidade = useMemo(() => {
    if (!dataEntrega) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const partes = dataEntrega.split("-").map(Number);
    if (partes.length !== 3) return false;
    const dataEscolhida = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0, 0);
    const diffTime = dataEscolhida.getTime() - hoje.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const antecedenciaMinima = regras.antecedenciaMinimaDias || 0;
    return diffDays < antecedenciaMinima;
  }, [dataEntrega, regras]);

  // Identificação Dinâmica do Modelo de Negócio
  const produtosProntaEntrega = useMemo(() => produtos.filter((p) => p.availability_type === "pronta_entrega"), [produtos]);
  const produtosEncomenda = useMemo(() => produtos.filter((p) => p.availability_type !== "pronta_entrega"), [produtos]);

  const modeloNegocio = useMemo<"pronta_entrega" | "encomendas" | "hibrido">(() => {
    if (produtosProntaEntrega.length > 0 && produtosEncomenda.length === 0) return "pronta_entrega";
    if (produtosProntaEntrega.length === 0 && produtosEncomenda.length > 0) return "encomendas";
    if (produtosProntaEntrega.length > 0 && produtosEncomenda.length > 0) return "hibrido";
    return "encomendas";
  }, [produtosProntaEntrega, produtosEncomenda]);

  // Cor de destaque da confeitaria
  const corTemaDestaque = useMemo(() => {
    return lojaInfo?.theme_color || lojaInfo?.themeColor || lojaInfo?.cor_destaque || lojaInfo?.corTema || "#8E7CC3";
  }, [lojaInfo]);

  // Imagem de capa / banner da confeitaria
  const bannerUrlCapa = useMemo(() => {
    return lojaInfo?.banner_url || lojaInfo?.store_banner_url || lojaInfo?.bannerUrl || "";
  }, [lojaInfo]);

  // Categorias Únicas
  const categorias = useMemo(() => {
    let base = produtos;
    if (modeloNegocio === "pronta_entrega" || (modeloNegocio === "hibrido" && tabModoHibrido === "pronta_entrega")) {
      base = produtosProntaEntrega;
    } else if (modeloNegocio === "encomendas" || (modeloNegocio === "hibrido" && tabModoHibrido === "encomenda")) {
      base = produtosEncomenda;
    }
    const cats = Array.from(new Set(base.map((p) => p.categoria))).filter(Boolean);
    return ["todas", ...cats];
  }, [produtos, modeloNegocio, tabModoHibrido, produtosProntaEntrega, produtosEncomenda]);

  // Produtos Filtrados Dinamicamente
  const produtosFiltrados = useMemo(() => {
    let baseList = produtos;

    if (modeloNegocio === "pronta_entrega") {
      baseList = produtosProntaEntrega;
      if (diaSemanaSelecionado !== "todos") {
        baseList = baseList.filter(
          (p) =>
            !p.available_days ||
            p.available_days.length === 0 ||
            p.available_days.includes(diaSemanaSelecionado)
        );
      }
    } else if (modeloNegocio === "encomendas") {
      baseList = produtosEncomenda;
    } else {
      // Híbrido
      if (tabModoHibrido === "pronta_entrega") {
        baseList = produtosProntaEntrega;
        if (diaSemanaSelecionado !== "todos") {
          baseList = baseList.filter(
            (p) =>
              !p.available_days ||
              p.available_days.length === 0 ||
              p.available_days.includes(diaSemanaSelecionado)
          );
        }
      } else if (tabModoHibrido === "encomenda") {
        baseList = produtosEncomenda;
      } else {
        baseList = produtos;
      }
    }

    if (categoriaAtiva !== "todas") {
      baseList = baseList.filter((p) => p.categoria === categoriaAtiva);
    }

    return baseList;
  }, [produtos, modeloNegocio, produtosProntaEntrega, produtosEncomenda, diaSemanaSelecionado, tabModoHibrido, categoriaAtiva]);

  const totalCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);
  }, [carrinho]);

  // Cálculo Dinâmico do Frete do Pedido
  const freteCalculado = useMemo(() => {
    return calcularFretePedido(
      freteConfig,
      totalCarrinho,
      regiaoEntregaId,
      tipoEntrega
    );
  }, [freteConfig, totalCarrinho, regiaoEntregaId, tipoEntrega]);

  // Valor Total do Pedido (Produtos + Frete)
  const totalComFrete = useMemo(() => {
    return totalCarrinho + (tipoEntrega === "delivery" ? freteCalculado.valorFrete : 0);
  }, [totalCarrinho, tipoEntrega, freteCalculado]);

  const feeResult = useMemo(() => {
    return calculateDynamicTotal(
      totalComFrete,
      parcelasSelecionadas,
      metodoPagamento === "cartao" && stripeConfig.repassarTaxaStripe
    );
  }, [totalComFrete, parcelasSelecionadas, metodoPagamento, stripeConfig]);

  const installmentOptions = useMemo(() => {
    return getInstallmentOptions(
      totalComFrete,
      stripeConfig.repassarTaxaStripe
    );
  }, [totalComFrete, stripeConfig]);

  const totalItensCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  }, [carrinho]);

  const enderecoEntrega = useMemo(() => {
    const partes = [];
    if (endLogradouro.trim()) partes.push(endLogradouro.trim());
    if (endNumero.trim()) partes.push(`nº ${endNumero.trim()}`);
    if (endBairro.trim()) partes.push(`Bairro: ${endBairro.trim()}`);
    if (endCep.trim()) partes.push(`CEP: ${endCep.trim()}`);
    if (endPontoRef.trim()) partes.push(`Ref: ${endPontoRef.trim()}`);
    return partes.join(", ");
  }, [endLogradouro, endNumero, endBairro, endCep, endPontoRef]);

  // ==========================================
  // EFEITOS (useEffect)
  // ==========================================

  // Efeito de Configurações de Frete
  useEffect(() => {
    const carregada = obterConfiguracaoFrete(code);
    setFreteConfig(carregada);
    if (carregada.regrasBairros && carregada.regrasBairros.length > 0) {
      const primeiraAtiva = carregada.regrasBairros.find((b) => b.ativo);
      if (primeiraAtiva && !regiaoEntregaId) {
        setRegiaoEntregaId(primeiraAtiva.id);
      }
    }

    let isMounted = true;
    carregarConfiguracaoFreteAsync(code).then((cfg) => {
      if (isMounted && cfg) {
        setFreteConfig(cfg);
        if (cfg.regrasBairros && cfg.regrasBairros.length > 0) {
          const primeiraAtiva = cfg.regrasBairros.find((b) => b.ativo);
          if (primeiraAtiva && !regiaoEntregaId) {
            setRegiaoEntregaId(primeiraAtiva.id);
          }
        }
      }
    });

    const handleFreteUpdate = (e: any) => {
      const novaConfig = e.detail || obterConfiguracaoFrete(code);
      setFreteConfig(novaConfig);
      if (novaConfig.regrasBairros && novaConfig.regrasBairros.length > 0) {
        const primeiraAtiva = novaConfig.regrasBairros.find((b: any) => b.ativo);
        if (primeiraAtiva && !regiaoEntregaId) {
          setRegiaoEntregaId(primeiraAtiva.id);
        }
      }
    };
    window.addEventListener("freteConfigUpdated", handleFreteUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("freteConfigUpdated", handleFreteUpdate);
    };
  }, [code]);

  // 1. Carregamento de Dados da Confeitaria e Produtos em Cascata (Supabase + LocalStorage Fallback)
  useEffect(() => {
    let cancelado = false;

    async function carregarDadosLojaEProdutos() {
      setLoadingProdutos(true);
      try {
        if (code === "CD-DEMO" || code === "DEMO-01" || rawParam.toUpperCase() === "CD-DEMO" || rawParam.toUpperCase() === "DEMO-01") {
          setLojaInfo({
            nome: "Loja Caixa Doce (Demo)",
            titulo_cardapio: "Cardápio de Demonstração — CaixaDoce",
            slogan_cardapio: "Navegue pelos doces, teste as fotos e simule a experiência real do seu cliente!",
            whatsapp: "11999999999",
            telefone: "(11) 99999-9999",
            logo_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80",
            store_logo_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80",
            chavePix: "",
            cidade: "São Paulo / SP",
            instagram: "@caixadoce",
            tiktok: "@caixadoce",
            facebook: "caixadoce",
          });
          setProdutos(CATALOGO_PRODUTOS_PADRAO);
          return;
        }

        let estData: any = null;
        const paramLower = rawParam.toLowerCase();
        const paramUpper = rawParam.toUpperCase();

        // 1. Busca flexível do Estabelecimento por slug OU codigo OU estabelecimento_codigo
        const { data: dFlex } = await supabase
          .from("estabelecimentos")
          .select("*")
          .or(`slug.eq.${paramLower},codigo.eq.${paramUpper},estabelecimento_codigo.eq.${paramUpper}`)
          .maybeSingle();

        if (dFlex) {
          estData = dFlex;
        } else {
          // Fallback por código direto caso .or() não case
          const { data: d1 } = await supabase
            .from("estabelecimentos")
            .select("*")
            .eq("codigo", paramUpper)
            .maybeSingle();

          if (d1) {
            estData = d1;
          }
        }

        const resolvedCode = estData?.codigo || estData?.estabelecimento_codigo || paramUpper;
        if (resolvedCode !== code) {
          setCode(resolvedCode);
        }

        let insta = estData?.instagram || estData?.social_instagram || estData?.social_media?.instagram;
        let tk = estData?.tiktok || estData?.social_tiktok || estData?.social_media?.tiktok;
        let fb = estData?.facebook || estData?.social_facebook || estData?.social_media?.facebook;
        let wa = estData?.whatsapp || estData?.telefone || estData?.social_media?.whatsapp;
        let logo = estData?.logo_url || estData?.store_logo_url;
        let banner = estData?.banner_url || estData?.store_banner_url || estData?.bannerUrl;
        let themeCol = estData?.theme_color || estData?.themeColor || estData?.cor_destaque || estData?.corTema || "#8E7CC3";
        let title = estData?.titulo_cardapio || estData?.menu_title;
        let slogan = estData?.slogan_cardapio || estData?.menu_slogan;
        let name = estData?.nome;
        let endLoja = estData?.endereco;
        if (!endLoja && (estData?.logradouro || estData?.cidade)) {
          endLoja = `${estData.logradouro || ''}, ${estData.numero || ''} ${estData.complemento ? `- ${estData.complemento}` : ''} - ${estData.bairro || ''}, ${estData.cidade || ''}/${estData.estado || ''}`.replace(/^[\s,]+|[\s,]+$/g, '');
        }

        let delAtivoVal = estData?.delivery_ativo !== false && estData?.aceita_delivery !== false;

        // Fallback resiliente: se no Supabase não vierem preenchidos, recupera do localStorage do navegador
        if (typeof window !== "undefined") {
          try {
            const savedProfileStr = localStorage.getItem("caixadoce_profile");
            if (savedProfileStr) {
              const p = JSON.parse(savedProfileStr);
              if (p.establishmentCode === resolvedCode || p.codigo === resolvedCode || !estData) {
                insta = insta || p.instagram || p.social_instagram || p.social_media?.instagram;
                tk = tk || p.tiktok || p.social_tiktok || p.social_media?.tiktok;
                fb = fb || p.facebook || p.social_facebook || p.social_media?.facebook;
                wa = wa || p.whatsapp || p.telefone || p.social_media?.whatsapp;
                logo = logo || p.logoUrl || p.store_logo_url;
                banner = banner || p.bannerUrl || p.banner_url || p.store_banner_url;
                themeCol = themeCol || p.themeColor || p.theme_color || p.corTema || p.cor_destaque || "#8E7CC3";
                title = title || p.tituloCardapio || p.menu_title;
                slogan = slogan || p.sloganCardapio || p.menu_slogan;
                name = name || p.establishmentName || p.nome;
                endLoja = endLoja || p.establishmentAddress || p.endereco;
              }
            }
            const localDel = localStorage.getItem(`caixadoce_delivery_${resolvedCode}`);
            if (localDel !== null) {
              delAtivoVal = localDel === "true";
            }
          } catch {}
        }

        if (!cancelado && (estData || name || title || insta || tk || fb || banner || themeCol)) {
          setLojaInfo({
            id: estData?.id,
            estabelecimento_id: estData?.id,
            codigo: resolvedCode,
            slug: estData?.slug,
            whatsapp: wa,
            telefone: wa,
            user_id: estData?.user_id,
            nome: name || "Confeitaria Artesanal",
            logo_url: logo,
            store_logo_url: logo,
            banner_url: banner,
            store_banner_url: banner,
            theme_color: themeCol,
            themeColor: themeCol,
            cor_destaque: themeCol,
            titulo_cardapio: title,
            menu_title: title,
            slogan_cardapio: slogan,
            menu_slogan: slogan,
            chavePix: (estData?.chave_pix || estData?.chavePix || "") === "contato@caixadoce.com.br" ? "" : (estData?.chave_pix || estData?.chavePix || ""),
            cidade: estData?.cidade || "SAO PAULO",
            endereco: endLoja || "",
            delivery_ativo: delAtivoVal,
            aceita_delivery: delAtivoVal,
            usar_mercadopago: Boolean(estData?.usar_mercadopago),
            mp_access_token: estData?.mp_access_token || null,
            chave_pix_manual: estData?.chave_pix_manual || estData?.chave_pix || estData?.chavePix || "",
            instagram: insta,
            tiktok: tk,
            facebook: fb,
            social_media: estData?.social_media || { instagram: insta, tiktok: tk, facebook: fb, whatsapp: wa },
          });
        }

        // =====================================================================
        // 2. NOVA LÓGICA DE CASCATA: BUSCA DOS PRODUTOS PELO ID DO ESTABELECIMENTO
        // =====================================================================
        let prodsDb: any[] = [];
        const estUuid = estData?.id;

        if (estUuid) {
          console.log(`[Cardápio Público] Buscando produtos em cascata por estabelecimento_id (${estUuid})...`);
          const { data: pByEstId, error: errEstId } = await supabase
            .from("produtos" as any)
            .select("*")
            .eq("estabelecimento_id", estUuid)
            .order("nome", { ascending: true });

          if (!errEstId && pByEstId && pByEstId.length > 0) {
            prodsDb = pByEstId;
          }
        }

        // Fallback caso estejam vinculados por código de estabelecimento
        if (prodsDb.length === 0 && resolvedCode) {
          console.log(`[Cardápio Público] Fallback: buscando produtos por estabelecimento_codigo (${resolvedCode})...`);
          const { data: pByCode } = await supabase
            .from("produtos" as any)
            .select("*")
            .or(`estabelecimento_codigo.eq.${resolvedCode},codigo.eq.${resolvedCode},store_id.eq.${resolvedCode}`)
            .order("nome", { ascending: true });

          if (pByCode && pByCode.length > 0) {
            prodsDb = pByCode;
          }
        }

        if (cancelado) return;

        if (prodsDb.length > 0) {
          const mapeados: ProdutoCardapio[] = prodsDb.map((p: any) => ({
            id: String(p.id),
            estabelecimentoCodigo: p.estabelecimento_codigo || p.codigo || resolvedCode,
            nome: p.nome || p.name || "Doce Artesanal",
            descricao: p.descricao || p.description || "",
            preco: Number(p.preco ?? p.price ?? 0),
            fotoUrl: p.foto_url || p.image_url || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
            categoria: p.categoria || p.category || "Doces & Bolos",
            destaque: Boolean(p.destaque),
            tempoPreparoHoras: p.tempo_preparo_horas ?? p.prep_time_hours ?? 24,
            ativo: (p.ativo ?? p.is_active) !== false,
            createdAt: p.created_at,
            availability_type: p.availability_type || "encomenda",
            available_days: Array.isArray(p.available_days)
              ? p.available_days
              : (typeof p.available_days === "string" ? (() => { try { return JSON.parse(p.available_days); } catch { return undefined; } })() : undefined),
            min_lead_time_days: p.min_lead_time_days !== undefined ? Number(p.min_lead_time_days) : undefined,
            isKit: Boolean(p.is_kit),
            custoTotalInsumos: p.custo_total_insumos ? Number(p.custo_total_insumos) : undefined,
            margemLucroPercentual: p.margem_lucro ? Number(p.margem_lucro) : undefined,
            prazoEntregaIndependente: p.prazo_entrega,
            itensKit: Array.isArray(p.itens_kit) ? p.itens_kit : undefined,
          }));

          const ativos = mapeados.filter((p) => p.ativo !== false);
          setProdutos(ativos);

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`caixadoce_cardapio_${resolvedCode}`, JSON.stringify(mapeados));
            } catch {}
          }
        } else {
          // Fallback para localStorage
          const localList = obterProdutosCardapio(resolvedCode);
          if (localList && localList.length > 0) {
            setProdutos(localList.filter((p) => p.ativo !== false));
          } else {
            setProdutos([]);
          }
        }
      } catch (err) {
        console.warn("[Cardápio Público] Aviso no carregamento do estabelecimento e produtos:", err);
      } finally {
        if (!cancelado) {
          setLoadingProdutos(false);
        }
      }
    }

    carregarDadosLojaEProdutos();

    return () => {
      cancelado = true;
    };
  }, [rawParam]);

  // Garante que se o lojista desativou o delivery, a modalidade seja forçada para "retirada"
  useEffect(() => {
    if (lojaInfo?.delivery_ativo === false || lojaInfo?.aceita_delivery === false) {
      setTipoEntrega("retirada");
    }
  }, [lojaInfo]);

  // =========================================================================
  // POLLING EM TEMPO REAL DO STATUS DO PAGAMENTO PIX NO MERCADO PAGO (3 em 3 segundos)
  // =========================================================================
  useEffect(() => {
    if (!sucessoModalOpen || !mpPaymentId || pagamentoAprovadoMp) {
      return;
    }

    const tokenLojista = lojaInfo?.mp_access_token;
    const targetCode = lojaInfo?.codigo || code;
    let isCancelled = false;

    console.log(`[Polling Pix MP] Iniciando monitoramento a cada 3s para payment_id=${mpPaymentId}...`);

    const timer = setInterval(async () => {
      if (isCancelled || pagamentoAprovadoMp) return;

      try {
        let statusResult: any = null;

        // 1. Consulta rota dedicada /api/check-payment-status
        try {
          const queryParams = new URLSearchParams({
            payment_id: String(mpPaymentId),
            ...(tokenLojista ? { mp_access_token: tokenLojista } : {}),
            ...(targetCode ? { estabelecimentoCodigo: targetCode } : {}),
          });
          const res = await fetch(`/api/check-payment-status?${queryParams.toString()}`);
          if (res.ok) {
            statusResult = await res.json();
          }
        } catch (errApi) {
          console.warn("[Polling Pix MP] Falha na consulta /api/check-payment-status:", errApi);
        }

        // 2. Fallback para Edge Function do Supabase
        if (!statusResult || (!statusResult.status && !statusResult.approved)) {
          try {
            const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("check-payment-status", {
              body: {
                payment_id: mpPaymentId,
                mp_access_token: tokenLojista,
                establishmentCode: targetCode,
              },
            });
            if (!edgeErr && edgeData) {
              statusResult = edgeData;
            }
          } catch (edgeEx) {
            console.warn("[Polling Pix MP] Falha na consulta Edge Function:", edgeEx);
          }
        }

        const isApproved =
          statusResult?.status === "approved" ||
          statusResult?.status === "authorized" ||
          Boolean(statusResult?.approved);

        if (isApproved && !isCancelled) {
          clearInterval(timer);
          setPagamentoAprovadoMp(true);
          toast.success("🎉 Pagamento via Pix confirmado com sucesso pelo Mercado Pago!");

          // Update no Supabase na tabela encomendas
          const targetPedidoId = ultimoPedidoId || pedidoCriadoId;
          if (targetPedidoId) {
            try {
              await supabase
                .from("encomendas")
                .update({
                  status_pagamento: "pago_integral",
                  metodo_pagamento: "Mercado Pago",
                  forma_pagamento: "Mercado Pago",
                  origem_pagamento: "mercadopago",
                  valor_entrada: totalComFrete,
                  historico_pagamentos: [
                    {
                      id: `mp_${mpPaymentId}`,
                      data: new Date().toISOString().split("T")[0],
                      valor: totalComFrete,
                      observacao: "Pagamento aprovado via Mercado Pago (Pix Automático)",
                    },
                  ],
                  updated_at: new Date().toISOString(),
                })
                .eq("id", targetPedidoId);

              console.log(`[Polling Pix MP] Encomenda ${targetPedidoId} atualizada no Supabase como 100% Paga via Mercado Pago!`);
            } catch (supErr) {
              console.error("[Polling Pix MP] Erro ao atualizar status no Supabase:", supErr);
            }
          }
        }
      } catch (cycleErr) {
        console.warn("[Polling Pix MP] Erro no ciclo de verificação:", cycleErr);
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [sucessoModalOpen, mpPaymentId, pagamentoAprovadoMp, lojaInfo, code, ultimoPedidoId, pedidoCriadoId, totalComFrete]);

  // Inicialização de data mínima e histórico do cliente
  useEffect(() => {
    // Data mínima inicial: amanhã por padrão
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    setDataEntrega(amanha.toISOString().split("T")[0]);

    // Leitura e Reconhecimento Automático do Cliente no LocalStorage
    if (typeof window !== "undefined") {
      try {
        const phone = localStorage.getItem("caixadoce_user_phone") || "";
        const name = localStorage.getItem("caixadoce_user_name") || "";
        const addr = localStorage.getItem("caixadoce_user_address") || "";

        if (phone) {
          setSavedUserPhone(phone);
          setClienteWhatsapp((prev) => prev || phone);
        }
        if (name) {
          setSavedUserName(name);
          setClienteNome((prev) => prev || name);
        }
        if (addr) {
          setEndLogradouro((prev) => prev || addr);
        }

        const rawOrders = localStorage.getItem("caixadoce_recent_orders");
        if (rawOrders) {
          const parsed = JSON.parse(rawOrders);
          if (Array.isArray(parsed)) {
            setRecentOrders(parsed);
          }
        }
      } catch (e) {
        console.warn("Aviso ao ler histórico do cliente do localStorage:", e);
      }
    }
  }, [code]);

  // Preenchimento automático ao abrir o carrinho
  useEffect(() => {
    if (cartOpen && typeof window !== "undefined") {
      const phone = localStorage.getItem("caixadoce_user_phone");
      const name = localStorage.getItem("caixadoce_user_name");
      if (phone) setClienteWhatsapp((prev) => prev || phone);
      if (name) setClienteNome((prev) => prev || name);
    }
  }, [cartOpen]);

  // ==========================================
  // FUNÇÕES DE MANIPULAÇÃO (HANDLERS)
  // ==========================================
  const handleBuscarCep = async (cepInput: string) => {
    setEndCep(cepInput);
    const limpo = cepInput.replace(/\D/g, "");
    if (limpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) setEndLogradouro(data.logradouro);
            if (data.bairro) setEndBairro(data.bairro);
            toast.success(`Endereço localizado: ${data.bairro}${data.localidade ? ` - ${data.localidade}/${data.uf}` : ""}`);
          } else {
            toast.error("CEP não localizado. Preencha o bairro e a rua manualmente.");
          }
        }
      } catch (e) {
        console.warn("Aviso ao consultar CEP:", e);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const handleDataEntregaChange = (val: string) => {
    setDataEntrega(val);
  };

  const handleHorarioEntregaChange = (val: string) => {
    setHorarioEntrega(val);
    const horRes = validarHorarioEntrega(val, regras);
    if (!horRes.valido) {
      toast.warning(horRes.motivo || "Horário fora do expediente da loja.");
    }
  };

  const handleAdicionarAoCarrinho = (prod: ProdutoCardapio) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((item) => item.produto.id === prod.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].quantidade += 1;
        return novo;
      }
      return [...prev, { produto: prod, quantidade: 1 }];
    });
    toast.success(`${prod.nome} adicionado ao pedido!`);
  };

  const handleAlterarQuantidade = (prodId: string, delta: number) => {
    setCarrinho((prev) => {
      return prev
        .map((item) => {
          if (item.produto.id === prodId) {
            const novaQtd = item.quantidade + delta;
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrinho[];
    });
  };

  // 1. Gravação Automática na Base de Dados e Abertura do Modal de Confirmação & Pagamento
  const handleConfirmarPedido = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clienteNome.trim() || !clienteWhatsapp.trim() || !dataEntrega || carrinho.length === 0) {
      toast.error("Preencha seu nome, WhatsApp e data para entrega.");
      return;
    }

    if (tipoEntrega === "delivery") {
      const temRegras = freteConfig.regrasBairros.filter((b) => b.ativo).length > 0;
      if (temRegras && !regiaoEntregaId) {
        toast.error("Por favor, selecione sua Região / Zona de Entrega.");
        return;
      }
      if (!endLogradouro.trim() || !endNumero.trim() || !endBairro.trim()) {
        toast.error("Preencha a rua, número e bairro para a entrega.");
        return;
      }
    }

    const horRes = validarHorarioEntrega(horarioEntrega, regras);
    if (!horRes.valido) {
      toast.warning(horRes.motivo || "Horário fora do expediente da loja.");
    }

    setSalvandoPedido(true);
    try {
      const pedidoId = crypto.randomUUID();
      setUltimoPedidoId(pedidoId);
      setPedidoCriadoId(pedidoId);
      const resumoItensTexto = carrinho
        .map((item) => `${item.quantidade}x ${item.produto.nome} (${formatarMoeda(item.produto.preco * item.quantidade)})`)
        .join(", ");

      const itensDetalhesJson = carrinho.map((item) => ({
        id: item.produto.id,
        nome: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: item.produto.preco,
        subtotal: item.produto.preco * item.quantidade,
      }));

      const valTotalCarrinho = Math.max(0, Number(totalComFrete) || 0);

      const avisoTexto = "⚠️ Confirme a disponibilidade do produto com a loja.";
      const obsFinal = necessitaConfirmacaoDisponibilidade
        ? (observacoes.trim() ? `${observacoes.trim()} | ${avisoTexto}` : avisoTexto)
        : (observacoes.trim() || "");

      // 1. Gestão e Identificação de Clientes no Supabase (tabela clientes_loja)
      let clienteId: string | null = null;
      const cleanPhone = clienteWhatsapp.replace(/\D/g, "");

      // Resolução segura do ID (UUID) do estabelecimento para respeitar Foreign Key
      let estDbId: string | null = null;
      if (lojaInfo?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaInfo.id)) {
        estDbId = lojaInfo.id;
      } else {
        try {
          const { data: estRow } = await supabase
            .from("estabelecimentos")
            .select("id")
            .or(`codigo.eq.${code},estabelecimento_codigo.eq.${code}`)
            .maybeSingle();
          if (estRow?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(estRow.id)) {
            estDbId = estRow.id;
          }
        } catch {}
      }

      try {
        const phoneFilter = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
        let query = supabase
          .from("clientes_loja")
          .select("id, nome, telefone, total_pedidos, total_gasto");

        if (estDbId) {
          query = query.or(`estabelecimento_id.eq.${estDbId},estabelecimento_codigo.eq.${code}`);
        } else {
          query = query.eq("estabelecimento_codigo", code);
        }

        if (phoneFilter) {
          query = query.ilike("telefone", `%${phoneFilter}%`);
        } else {
          query = query.eq("nome", clienteNome);
        }

        const { data: clienteExistente } = await query.limit(1);

        if (clienteExistente && clienteExistente.length > 0 && clienteExistente[0]?.id) {
          clienteId = clienteExistente[0].id;
          const novoTotal = (Number(clienteExistente[0].total_pedidos) || 0) + 1;
          const novoGasto = (Number(clienteExistente[0].total_gasto) || 0) + valTotalCarrinho;

          await supabase
            .from("clientes_loja")
            .update({
              nome: clienteNome,
              estabelecimento_id: estDbId || undefined,
              endereco: tipoEntrega === "delivery" ? enderecoEntrega : undefined,
              total_pedidos: novoTotal,
              total_gasto: novoGasto,
              ultimo_pedido_em: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", clienteId);
        } else {
          const novoClienteId = crypto.randomUUID();
          const { data: criado, error: errInsertCli } = await supabase
            .from("clientes_loja")
            .insert([
              {
                id: novoClienteId,
                estabelecimento_id: estDbId,
                estabelecimento_codigo: code,
                nome: clienteNome,
                telefone: clienteWhatsapp,
                endereco: tipoEntrega === "delivery" ? enderecoEntrega : "",
                total_pedidos: 1,
                total_gasto: valTotalCarrinho,
                ultimo_pedido_em: new Date().toISOString(),
              },
            ])
            .select("id")
            .maybeSingle();

          if (errInsertCli) {
            console.warn("Aviso ao criar em clientes_loja:", errInsertCli.message);
          }
          clienteId = criado?.id || novoClienteId;
        }
      } catch (eCli) {
        console.warn("Aviso ao processar tabela clientes_loja:", eCli);
      }

      // 2. Criação do Pedido em 'encomendas' vinculado ao cliente_id
      const payloadInsert: Record<string, any> = {
        id: pedidoId,
        estabelecimento_codigo: code,
        user_id: lojaInfo?.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaInfo.user_id) ? lojaInfo.user_id : null,
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        cliente_whatsapp: clienteWhatsapp,
        data_entrega: dataEntrega,
        horario_entrega: horarioEntrega || "15:00",
        tipo_entrega: tipoEntrega,
        endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        taxa_entrega: tipoEntrega === "delivery" ? freteCalculado.valorFrete : 0,
        status_pagamento: lojaInfo?.usar_mercadopago ? "pix_pendente" : (metodoPagamento === "pix" ? "pix_pendente" : "cartao_pendente"),
        metodo_pagamento: lojaInfo?.usar_mercadopago ? "Mercado Pago" : (metodoPagamento === "pix" ? "Pix Manual" : "Cartão"),
        forma_pagamento: lojaInfo?.usar_mercadopago ? "Mercado Pago" : (metodoPagamento === "pix" ? "Pix Manual" : "Cartão"),
        origem_pagamento: lojaInfo?.usar_mercadopago ? "mercadopago" : "manual",
        status: "pendente",
        itens: resumoItensTexto,
        itens_detalhes: itensDetalhesJson,
        valor_total: valTotalCarrinho,
        total_amount: valTotalCarrinho,
        observacoes: obsFinal,
      };

      let { error: insertError } = await supabase.from("encomendas").insert([payloadInsert]);

      if (insertError) {
        console.warn("Tentativa de insert em encomendas falhou com payload estendido, tentando fallback minimalista:", insertError.message);
        
        const payloadMinimal: Record<string, any> = {
          id: pedidoId,
          estabelecimento_codigo: code,
          user_id: payloadInsert.user_id,
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          cliente_whatsapp: clienteWhatsapp,
          data_entrega: dataEntrega,
          horario_entrega: horarioEntrega || "15:00",
          tipo_entrega: tipoEntrega,
          endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
          taxa_entrega: tipoEntrega === "delivery" ? freteCalculado.valorFrete : 0,
          itens: resumoItensTexto,
          valor_total: valTotalCarrinho,
          total_amount: valTotalCarrinho,
          status: "pendente",
          status_pagamento: payloadInsert.status_pagamento,
          metodo_pagamento: payloadInsert.metodo_pagamento,
          forma_pagamento: payloadInsert.forma_pagamento,
          origem_pagamento: payloadInsert.origem_pagamento,
          observacoes: obsFinal,
        };

        const resMin = await supabase.from("encomendas").insert([payloadMinimal]);
        insertError = resMin.error;

        // Se falhar caso cliente_id não exista na versão específica do schema
        if (insertError && insertError.message?.toLowerCase().includes("cliente_id")) {
          const { cliente_id: _cid, ...payloadSemCli } = payloadMinimal;
          const resFallback = await supabase.from("encomendas").insert([payloadSemCli]);
          insertError = resFallback.error;
        }
      }

      if (insertError) {
        console.error("Erro ao registrar encomenda no Supabase:", insertError);
        toast.error(`Falha ao registrar pedido: ${insertError.message || "Erro no servidor"}`);
        return;
      }

      // 3. Sincronização de Clientes no Storage e na tabela 'customers'
      try {
        const rawCust = typeof window !== "undefined" ? localStorage.getItem(`caixadoce_customers_${code}`) : null;
        let listaCust: any[] = rawCust ? JSON.parse(rawCust) : [];
        const foundIndex = listaCust.findIndex((c: any) => {
          const p = (c.whatsapp || "").replace(/\D/g, "");
          return (cleanPhone && p && cleanPhone === p) || (c.nome || c.name || "").trim().toLowerCase() === clienteNome.trim().toLowerCase();
        });

        const custId = clienteId || (foundIndex >= 0 ? listaCust[foundIndex].id : crypto.randomUUID());
        const novoCust = {
          id: custId,
          estabelecimentoCodigo: code,
          nome: clienteNome,
          whatsapp: clienteWhatsapp,
          endereco: tipoEntrega === "delivery" ? enderecoEntrega : (foundIndex >= 0 ? (listaCust[foundIndex].endereco || "") : ""),
          observacoes: "Cadastrado via Cardápio Digital",
          createdAt: foundIndex >= 0 ? (listaCust[foundIndex].createdAt || new Date().toISOString()) : new Date().toISOString(),
        };

        if (foundIndex >= 0) {
          listaCust[foundIndex] = { ...listaCust[foundIndex], ...novoCust };
        } else {
          listaCust = [novoCust, ...listaCust];
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(`caixadoce_customers_${code}`, JSON.stringify(listaCust));
        }

        await supabase.from("customers").upsert(
          [
            {
              id: custId,
              user_id: lojaInfo?.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaInfo.user_id) ? lojaInfo.user_id : null,
              estabelecimento_codigo: code,
              name: clienteNome,
              whatsapp: clienteWhatsapp,
              address: tipoEntrega === "delivery" ? enderecoEntrega : "",
              notes: "Cadastrado via Cardápio Digital",
            },
          ],
          { onConflict: "id" }
        );
      } catch (custErr) {
        console.warn("Aviso ao atualizar base de clientes do cardápio digital:", custErr);
      }

      // 4. Memória do Navegador: Salva telefone, nome e histórico dos últimos 3 pedidos
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("caixadoce_user_phone", clienteWhatsapp);
          localStorage.setItem("caixadoce_user_name", clienteNome);
          if (tipoEntrega === "delivery" && enderecoEntrega) {
            localStorage.setItem("caixadoce_user_address", enderecoEntrega);
          }

          setSavedUserPhone(clienteWhatsapp);
          setSavedUserName(clienteNome);

          const novoResumoPedido = {
            id: pedidoId,
            data: new Date().toISOString(),
            data_entrega: dataEntrega,
            horario_entrega: horarioEntrega || "15:00",
            tipo_entrega: tipoEntrega,
            valor_total: valTotalCarrinho,
            status: "pendente",
            itens: resumoItensTexto,
            total_itens: totalItensCarrinho,
            loja_codigo: code,
            loja_nome: lojaInfo?.nome || "Confeitaria",
          };

          const rawOrders = localStorage.getItem("caixadoce_recent_orders");
          const pedidosAnteriores = rawOrders ? JSON.parse(rawOrders) : [];
          const atualizados = [novoResumoPedido, ...pedidosAnteriores.filter((p: any) => p.id !== pedidoId)].slice(0, 3);
          localStorage.setItem("caixadoce_recent_orders", JSON.stringify(atualizados));
          setRecentOrders(atualizados);
        } catch (memErr) {
          console.warn("Aviso ao salvar histórico do pedido no localStorage:", memErr);
        }
      }

      // Reset de estados do Pix
      setPixCopiaCola("");
      setPixQrCodeBase64(null);
      setPixCopiado(false);

      if (valTotalCarrinho > 0) {
        let gerouMp = false;

        // 1. SE TRUE (Mercado Pago Connect): Gera Pix via proxy backend (/api/create-pix-payment) com o mp_access_token do lojista
        if (lojaInfo?.usar_mercadopago) {
          try {
            let tokenLojista = lojaInfo?.mp_access_token;
            if (!tokenLojista) {
              const { data: estRow } = await supabase
                .from("estabelecimentos")
                .select("mp_access_token")
                .ilike("codigo", code)
                .maybeSingle();
              if (estRow?.mp_access_token) {
                tokenLojista = estRow.mp_access_token;
              }
            }

            console.log(`[Checkout Cardápio] Gerando Pix Mercado Pago via proxy seguro (/api/create-pix-payment) para ${code}...`);
            
            const pixPayload = {
              transaction_amount: valTotalCarrinho,
              amount: valTotalCarrinho,
              establishmentCode: code,
              mp_access_token: tokenLojista || undefined,
              accessToken: tokenLojista || undefined,
              description: `Pedido ${clienteNome.slice(0, 15)} (${code})`,
              payer: {
                email: "cliente@caixadoce.com.br",
                first_name: clienteNome || "Cliente",
              },
            };

            let mpData: any = null;

            // 1.1 Tenta rota backend da aplicação (/api/create-pix-payment)
            try {
              const resBackend = await fetch("/api/create-pix-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pixPayload),
              });
              if (resBackend.ok) {
                mpData = await resBackend.json();
              } else {
                console.warn("[Checkout Cardápio] /api/create-pix-payment retornou:", await resBackend.text());
              }
            } catch (errApi) {
              console.warn("[Checkout Cardápio] Rota /api/create-pix-payment indisponível, tentando Edge Function:", errApi);
            }

            // 1.2 Fallback para Edge Function do Supabase (create-pix-payment)
            if (!mpData?.point_of_interaction && !mpData?.qr_code_base64 && !mpData?.qr_code) {
              try {
                const { data: edgeData, error: edgeError } = await supabase.functions.invoke("create-pix-payment", {
                  body: pixPayload,
                });
                if (!edgeError && edgeData) {
                  mpData = edgeData;
                }
              } catch (errEdge) {
                console.warn("[Checkout Cardápio] Edge Function create-pix-payment falhou:", errEdge);
              }
            }

            // 1.3 Fallback para rota legada do backend (/api/mercadopago/create-pix-payment)
            if (!mpData?.point_of_interaction && !mpData?.qr_code_base64 && !mpData?.qr_code) {
              try {
                const resMpPix = await gerarPixMercadoPago({
                  establishmentCode: code,
                  amount: valTotalCarrinho,
                  description: `Pedido ${clienteNome.slice(0, 15)} (${code})`,
                  payerEmail: "cliente@caixadoce.com.br",
                  accessToken: tokenLojista || undefined,
                });
                if (resMpPix && resMpPix.success) {
                  mpData = resMpPix;
                }
              } catch (errGerar) {
                console.warn("[Checkout Cardápio] gerarPixMercadoPago falhou:", errGerar);
              }
            }

            // Processa o retorno com QR Code e Copia-e-Cola
            if (mpData) {
              const pointOfInteraction = mpData.point_of_interaction;
              const qrBase64 = mpData.qr_code_base64 || pointOfInteraction?.transaction_data?.qr_code_base64;
              const qrCode = mpData.qr_code || pointOfInteraction?.transaction_data?.qr_code;
              const payId = mpData.payment_id || mpData.id;

              if (payId) {
                setMpPaymentId(payId);
                setPagamentoAprovadoMp(false);
              }

              if (qrBase64 || qrCode) {
                if (qrBase64) setPixQrCodeBase64(qrBase64);
                if (qrCode) {
                  setPixCopiaCola(qrCode);
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(qrCode).catch(() => {});
                    setPixCopiado(true);
                  }
                }
                gerouMp = true;
                console.log(`[Checkout Cardápio] Pix Mercado Pago gerado com sucesso via Backend Proxy! Payment ID: ${payId}`);
              }
            }
          } catch (mpErr: any) {
            console.warn("[Checkout Cardápio] Erro ao gerar Pix Mercado Pago, aplicando fallback manual:", mpErr);
          }
        }

        // 2. FALLBACK PLANO B: Se usar_mercadopago for false OU se a API do Mercado Pago falhou
        if (!gerouMp) {
          const pixKeyToUse = lojaInfo?.chave_pix_manual || lojaInfo?.chavePix || "";
          if (pixKeyToUse) {
            try {
              const pixPayloadGerado = generatePixPayload({
                pixKey: pixKeyToUse,
                merchantName: lojaInfo?.nome || "CaixaDoce",
                merchantCity: lojaInfo?.cidade || "SAO PAULO",
                amount: valTotalCarrinho,
                txid: `PED${Date.now().toString().slice(-8)}`,
                description: `Pedido ${clienteNome.slice(0, 15)}`,
              });
              if (pixPayloadGerado) {
                setPixCopiaCola(pixPayloadGerado);
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(pixPayloadGerado).catch(() => {});
                  setPixCopiado(true);
                }
              }
            } catch (e) {
              console.warn("Aviso ao gerar QR Code / Pix Copia e Cola manual:", e);
            }
          }
        }
      }

      setUltimoPedidoId(pedidoId);
      setCartOpen(false);
      setPedidoConcluido(true);
      setSucessoModalOpen(true);
      toast.success("Pedido gravado com sucesso no sistema!");
    } catch (err: any) {
      toast.error(`Erro ao finalizar pedido: ${err?.message || "Ocorreu uma falha na gravação."}`);
    } finally {
      setSalvandoPedido(false);
    }
  };

  // 2. Envio Formatado no WhatsApp
  const handleEnviarWhatsApp = () => {
    const dataFormatada = dataEntrega ? dataEntrega.split("-").reverse().join("/") : "";
    const resumoItens = carrinho
      .map((item) => `• ${item.quantidade}x ${item.produto.nome} (${formatarMoeda(item.produto.preco * item.quantidade)})`)
      .join("\n");

    const modalidade =
      tipoEntrega === "delivery"
        ? `🚚 Entrega / Delivery${enderecoEntrega ? ` (${enderecoEntrega})` : ""}`
        : "🏬 Retirada no Balcão";

    const taxaTexto = tipoEntrega === "delivery"
      ? (freteCalculado.isGratis ? "Grátis (Cortesia/Promoção)" : formatarMoeda(freteCalculado.valorFrete))
      : "R$ 0,00 (Retirada no Local)";

    let blocoPixInfo = "";
    if (lojaInfo?.chavePix && totalComFrete > 0) {
      blocoPixInfo = `\n\n💳 *PAGAMENTO VIA PIX*\n💰 *Valor Total do Pedido:* ${formatarMoeda(totalComFrete)}\n🔑 *Chave Pix:* ${lojaInfo.chavePix}`;
      if (pixCopiaCola) {
        blocoPixInfo += `\n📋 *Pix Copia e Cola:*\n${pixCopiaCola}`;
      }
    }

    const blocoAvisoData = necessitaConfirmacaoDisponibilidade
      ? "\n⚠️ *ATENÇÃO:* Confirme a disponibilidade do produto com a loja.\n"
      : "";

    const msg = `🎂 *CONFIRMAÇÃO DE PEDIDO ONLINE - CARDÁPIO DIGITAL* 🎂

Olá! Confirmei meu pedido pelo cardápio digital (Código: *${code}*):

👤 *Cliente:* ${clienteNome}
📱 *WhatsApp:* ${clienteWhatsapp}

📅 *Data Prevista:* ${dataFormatada} às ${horarioEntrega}
📍 *Modalidade:* ${modalidade}${blocoAvisoData}
${observacoes ? `📝 *Observações:* ${observacoes}\n` : ""}
🛒 *Itens do Pedido:*
${resumoItens}

📦 *Subtotal dos Itens:* ${formatarMoeda(totalCarrinho)}
🚚 *Taxa de Entrega:* ${taxaTexto}
💰 *Total com Entrega:* ${formatarMoeda(totalComFrete)}${blocoPixInfo}

Já gravei o pedido no sistema. Aguardo a confirmação da confeitaria! Muito obrigado(a)!`;

    const numTarget = lojaInfo?.whatsapp || lojaInfo?.telefone || "";
    const url = formatarWhatsappLink(numTarget, msg);

    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  const handleConcluirELimpar = () => {
    setSucessoModalOpen(false);
    setCarrinho([]);
    setPixCopiado(false);
    setPixCopiaCola("");
    setPixQrCodeBase64(null);
    setMpPaymentId(null);
    setPagamentoAprovadoMp(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-foreground pb-24">
      {/* Top Header Fixo / Sticky com Valorização da Marca */}
      <header className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-foreground py-3.5 px-4 shadow-xs border-b border-border sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {lojaInfo?.logo_url || lojaInfo?.store_logo_url ? (
              <img
                src={lojaInfo.logo_url || lojaInfo.store_logo_url}
                alt={lojaInfo.nome || "Logo"}
                className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-2xl border border-border shadow-xs shrink-0"
              />
            ) : (
              <CaixaDoceLogo size="md" className="shrink-0" />
            )}
            <div className="border-l border-border/80 pl-3 min-w-0 flex flex-col justify-center space-y-0.5">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-foreground truncate max-w-[180px] sm:max-w-sm md:max-w-md">
                {lojaInfo?.nome || "Confeitaria Artesanal"}
              </h1>

              <SocialLinks
                instagram={lojaInfo?.instagram}
                tiktok={lojaInfo?.tiktok}
                facebook={lojaInfo?.facebook}
                whatsapp={lojaInfo?.whatsapp}
                telefone={lojaInfo?.telefone}
                variant="header"
              />
            </div>
          </div>

          {/* Botão do Carrinho Flutuante 'Meu Pedido' no Topo */}
          <Button
            onClick={() => setCartOpen(true)}
            style={{ backgroundColor: corTemaDestaque }}
            className="font-extrabold shrink-0 relative text-white text-xs shadow-md rounded-2xl py-2 px-3.5 whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Meu Pedido</span>
            {totalItensCarrinho > 0 && (
              <span className="ml-1.5 bg-black/40 text-white font-mono px-1.5 py-0.2 rounded-full text-[10px]">
                {totalItensCarrinho}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* HERO BANNER DE CAPA (Caso Cadastrado pelo Lojista) */}
      {bannerUrlCapa ? (
        <div className="relative w-full h-44 sm:h-64 md:h-72 overflow-hidden bg-stone-900 shadow-md">
          <img
            src={bannerUrlCapa}
            alt="Capa do Cardápio"
            className="w-full h-full object-cover object-center transform scale-100 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 flex flex-col justify-end p-4 sm:p-8">
            <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    style={{ backgroundColor: corTemaDestaque }}
                    className="text-white border-0 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 shadow-sm"
                  >
                    {modeloNegocio === "pronta_entrega"
                      ? "⚡ Apenas Pronta-Entrega"
                      : modeloNegocio === "encomendas"
                      ? "🎂 Apenas Sob Encomenda"
                      : "✨ Pronta-Entrega & Encomendas"}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                  {lojaInfo?.titulo_cardapio || lojaInfo?.menu_title || "Cardápio de Bolos & Doces Especiais"}
                </h2>
                <p className="text-xs sm:text-sm text-stone-200 max-w-xl drop-shadow-sm font-medium line-clamp-2">
                  {lojaInfo?.slogan_cardapio || lojaInfo?.menu_slogan || "Doces frescos feitos com ingredientes nobres e amor em cada detalhe."}
                </p>
              </div>

              <div className="shrink-0 pt-1 sm:pt-0">
                <SocialLinks
                  instagram={lojaInfo?.instagram}
                  tiktok={lojaInfo?.tiktok}
                  facebook={lojaInfo?.facebook}
                  whatsapp={lojaInfo?.whatsapp}
                  telefone={lojaInfo?.telefone}
                  variant="banner"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Banner de Boas-Vindas Padrão (Sem Foto de Capa) */
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-2 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-primary/20 bg-primary/5 text-primary">
            {modeloNegocio === "pronta_entrega"
              ? "⚡ Vitrine de Pronta-Entrega Diária"
              : modeloNegocio === "encomendas"
              ? "🎂 Vitrine de Doces Sob Encomenda"
              : "✨ Pronta-Entrega & Encomendas Especiais"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            {lojaInfo?.titulo_cardapio || lojaInfo?.menu_title || "Cardápio de Bolos & Doces Especiais"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {lojaInfo?.slogan_cardapio || lojaInfo?.menu_slogan || "Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe."}
          </p>

          <SocialLinks
            instagram={lojaInfo?.instagram}
            tiktok={lojaInfo?.tiktok}
            facebook={lojaInfo?.facebook}
            whatsapp={lojaInfo?.whatsapp}
            telefone={lojaInfo?.telefone}
            variant="banner"
          />
        </div>
      )}

      {/* 0. COMPONENTE DISCRETO DE RECONHECIMENTO E BOAS-VINDAS */}
      {savedUserPhone && (
        <div className="max-w-5xl mx-auto px-4 pt-3 pb-0">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-950 dark:text-purple-200">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
              <span>
                Bem-vindo(a) de volta{savedUserName ? `, ` : "!"}
                {savedUserName && <strong className="text-purple-700 dark:text-purple-300 font-black">{savedUserName}</strong>}
                !
              </span>
            </div>

            {recentOrders.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUltimosPedidosModalOpen(true)}
                className="h-7 px-3 text-[11px] font-bold rounded-xl border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <History className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                Ver meus últimos pedidos ({recentOrders.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Cardápio */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 1. SELETOR DE MODALIDADE HÍBRIDA (Apenas no Modo Híbrido) */}
        {modeloNegocio === "hibrido" && (
          <div className="p-1.5 rounded-2xl bg-muted/60 border border-border flex items-center justify-center gap-1 max-w-md mx-auto shadow-xs">
            <button
              type="button"
              onClick={() => setTabModoHibrido("todos")}
              style={tabModoHibrido === "todos" ? { backgroundColor: corTemaDestaque, color: "#fff" } : {}}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                tabModoHibrido === "todos"
                  ? "shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Todos ({produtos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabModoHibrido("pronta_entrega")}
              style={tabModoHibrido === "pronta_entrega" ? { backgroundColor: corTemaDestaque, color: "#fff" } : {}}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                tabModoHibrido === "pronta_entrega"
                  ? "shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <span>⚡ Pronta-Entrega ({produtosProntaEntrega.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabModoHibrido("encomenda")}
              style={tabModoHibrido === "encomenda" ? { backgroundColor: corTemaDestaque, color: "#fff" } : {}}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                tabModoHibrido === "encomenda"
                  ? "shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <span>🎂 Encomendas ({produtosEncomenda.length})</span>
            </button>
          </div>
        )}

        {/* 2. KANBAN / SELETOR DE DIAS DA SEMANA (Para Modo Pronta-Entrega ou Aba Pronta-Entrega do Híbrido) */}
        {(modeloNegocio === "pronta_entrega" || (modeloNegocio === "hibrido" && tabModoHibrido === "pronta_entrega")) && (
          <div className="space-y-2.5 p-4 rounded-3xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-300">
                  ⚡ Cardápio do Dia — Pronta-Entrega
                </h3>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Selecione o dia da semana para ver os doces disponíveis:
              </span>
            </div>

            {/* Carrossel de Dias da Semana */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setDiaSemanaSelecionado("todos")}
                style={diaSemanaSelecionado === "todos" ? { backgroundColor: corTemaDestaque, color: "#fff" } : {}}
                className={`py-2 px-3 rounded-2xl text-xs font-black transition-all shrink-0 border ${
                  diaSemanaSelecionado === "todos"
                    ? "border-transparent shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                }`}
              >
                ✨ Todos os Dias
              </button>

              {DIAS_SEMANA_KANBAN.map((item) => {
                const isSelected = diaSemanaSelecionado === item.dia;
                const isToday = hojeDiaSemana === item.dia;
                return (
                  <button
                    key={item.dia}
                    type="button"
                    onClick={() => setDiaSemanaSelecionado(item.dia)}
                    style={isSelected ? { backgroundColor: corTemaDestaque, color: "#fff" } : {}}
                    className={`py-2 px-3 rounded-2xl text-xs font-black transition-all shrink-0 border flex items-center gap-1.5 ${
                      isSelected
                        ? "border-transparent shadow-sm"
                        : isToday
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                        : "bg-background border-border text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                    }`}
                  >
                    <span>{item.nome}</span>
                    {isToday && (
                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0 h-4 border-0">
                        Hoje
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. AVISO EXPLICATIVO DO MODO ENCOMENDA (Apenas quando no Modo Encomenda) */}
        {(modeloNegocio === "encomendas" || (modeloNegocio === "hibrido" && tabModoHibrido === "encomenda")) && (
          <div className="p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-300">
            <Clock className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>Doces Sob Encomenda:</strong> Cada produto possui um prazo mínimo de preparo. Escolha a data de entrega ideal no momento de fechar seu pedido.
            </span>
          </div>
        )}

        {/* 4. PÍLULAS DE CATEGORIAS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 justify-start sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categorias.map((cat) => {
            const isSelected = categoriaAtiva === cat;
            return (
              <Button
                key={cat}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoriaAtiva(cat)}
                style={isSelected ? { backgroundColor: corTemaDestaque, borderColor: corTemaDestaque, color: "#fff" } : {}}
                className={`h-8 text-xs font-bold rounded-full capitalize shrink-0 transition-all ${
                  isSelected ? "shadow-md" : ""
                }`}
              >
                {cat === "todas" ? "Todos os Doces" : cat}
              </Button>
            );
          })}
        </div>

        {/* 5. GRID DE PRODUTOS */}
        {loadingProdutos ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <Card
                key={idx}
                className="overflow-hidden border-border/80 bg-card rounded-2xl sm:rounded-3xl animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 sm:h-48 w-full bg-muted/60" />
                  <div className="p-2.5 sm:p-4 space-y-2">
                    <div className="h-4 bg-muted/70 rounded-md w-3/4" />
                    <div className="h-3 bg-muted/40 rounded-md w-full" />
                    <div className="h-3 bg-muted/40 rounded-md w-2/3" />
                  </div>
                </div>
                <div className="p-2.5 sm:p-4 pt-0 flex items-center justify-between gap-2 border-t border-border/40 mt-2">
                  <div className="h-4 bg-muted/60 rounded-md w-1/3" />
                  <div className="h-7 bg-muted/70 rounded-xl w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/20 rounded-3xl border border-dashed border-border space-y-3">
            <Cake className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h4 className="text-base font-bold text-foreground">Nenhum doce encontrado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Não encontramos produtos para os filtros selecionados neste momento. Experimente alternar a categoria ou o dia da semana.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoriaAtiva("todas");
                setDiaSemanaSelecionado("todos");
                setTabModoHibrido("todos");
              }}
              className="text-xs font-bold"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 pt-2">
            {produtosFiltrados.map((prod) => {
              const disp = formatarBadgeDisponibilidadeProduto(prod);
              return (
                <Card
                  key={prod.id}
                  className="overflow-hidden border-border/80 hover:border-primary/50 transition-all hover:shadow-lg flex flex-col justify-between bg-card group rounded-2xl sm:rounded-3xl"
                >
                  <div>
                    <div className="relative h-32 sm:h-48 w-full overflow-hidden bg-muted">
                      <img
                        src={prod.fotoUrl}
                        alt={prod.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-wrap gap-1">
                        <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5">
                          {prod.categoria}
                        </Badge>
                        {prod.destaque && (
                          <Badge className="bg-amber-500 text-white border-0 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 flex items-center gap-0.5 shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" /> Destaque
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2 space-y-1 sm:space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                        <CardTitle className="text-xs sm:text-base font-extrabold text-foreground leading-tight line-clamp-2">
                          {prod.nome}
                        </CardTitle>
                        <span
                          style={{ color: corTemaDestaque }}
                          className="text-xs sm:text-lg font-black font-mono shrink-0"
                        >
                          {formatarMoeda(prod.preco)}
                        </span>
                      </div>
                      <CardDescription className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 sm:line-clamp-3 mt-0.5 sm:mt-1.5">
                        {prod.descricao}
                      </CardDescription>
                    </CardHeader>
                  </div>

                  <CardFooter className="p-2.5 sm:p-4 pt-1.5 sm:pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2">
                    {disp.isProntaEntrega ? (
                      <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center justify-center sm:justify-start gap-1 truncate">
                        {disp.texto}
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 flex items-center justify-center sm:justify-start gap-1 truncate">
                        {disp.texto}
                      </span>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleAdicionarAoCarrinho(prod)}
                      style={{ backgroundColor: corTemaDestaque }}
                      className="font-bold text-[11px] sm:text-xs text-white shadow-xs h-7 sm:h-8 px-2 sm:px-3.5 w-full sm:w-auto shrink-0 flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" /> Pedir
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Rodapé da Confeitaria com Redes Sociais */}
      <footer className="mt-12 border-t border-border/60 bg-stone-100 dark:bg-stone-900 py-8 px-4 text-center space-y-4">
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-xs font-bold text-foreground">
            {lojaInfo?.nome || "Confeitaria Artesanal"} — Cardápio Digital
          </p>

          <SocialLinks
            instagram={lojaInfo?.instagram}
            tiktok={lojaInfo?.tiktok}
            facebook={lojaInfo?.facebook}
            whatsapp={lojaInfo?.whatsapp}
            telefone={lojaInfo?.telefone}
            variant="footer"
          />

          <p className="text-[11px] text-muted-foreground pt-1">
            Powered by <a href="/" target="_blank" rel="noopener noreferrer" className="font-extrabold text-purple-600 dark:text-purple-400 hover:underline">CaixaDoce</a> — Gestão para Confeiteiras
          </p>
        </div>
      </footer>

      {/* Barra Flutuante Inferior se houver itens no Carrinho */}
      {carrinho.length > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 animate-slide-up">
          <div
            onClick={() => setCartOpen(true)}
            className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between cursor-pointer hover:bg-stone-850 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: corTemaDestaque }}
                className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black"
              >
                {totalItensCarrinho}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Ver Meu Pedido</p>
                <p className="text-[11px] text-amber-300 font-mono font-bold">{formatarMoeda(totalCarrinho)}</p>
              </div>
            </div>

            <Button
              size="sm"
              style={{ backgroundColor: corTemaDestaque }}
              className="text-white hover:opacity-90 font-extrabold text-xs h-8"
            >
              Continuar &gt;
            </Button>
          </div>
        </div>
      )}

      {/* Drawer do Carrinho / Checkout */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col justify-between">
          <div>
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" /> Meu Pedido ({totalItensCarrinho} itens)
              </SheetTitle>
              <SheetDescription className="text-xs">
                Revise os doces selecionados e informe seus dados para envio direto no WhatsApp.
              </SheetDescription>
            </SheetHeader>

            {carrinho.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <Cake className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p>Seu carrinho está vazio.</p>
                <Button variant="outline" size="sm" onClick={() => setCartOpen(false)} className="text-xs">
                  Escolher Doces
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Lista de Itens */}
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {carrinho.map((item) => (
                    <div
                      key={item.produto.id}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate flex-1">
                        <p className="font-bold text-foreground truncate">{item.produto.nome}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {formatarMoeda(item.produto.preco)} cada
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlterarQuantidade(item.produto.id, -1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-mono font-bold px-1">{item.quantidade}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlterarQuantidade(item.produto.id, 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <span className="font-black font-mono text-xs text-foreground shrink-0 min-w-[60px] text-right">
                        {formatarMoeda(item.produto.preco * item.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* BANNER PROMOCIONAL DE FRETE GRÁTIS */}
                {freteConfig.freteGratisAtivo && tipoEntrega === "delivery" && (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    totalCarrinho >= freteConfig.valorMinimoFreteGratis
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      : "bg-purple-500/10 border-purple-500/20 text-purple-800 dark:text-purple-300"
                  }`}>
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {totalCarrinho >= freteConfig.valorMinimoFreteGratis ? (
                        <strong>🎉 Parabéns! Você ganhou Frete Grátis neste pedido!</strong>
                      ) : (
                        <>
                          Adicione mais <strong>{formatarMoeda(freteConfig.valorMinimoFreteGratis - totalCarrinho)}</strong> em doces para ganhar <strong>Frete Grátis</strong>!
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Subtotal & Taxa de Frete */}
                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono font-bold text-foreground">{formatarMoeda(totalCarrinho)}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-purple-600" />
                      Taxa de Entrega:
                    </span>
                    <span className={`font-mono font-bold ${freteCalculado.isGratis ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {tipoEntrega === "retirada" ? "Grátis (Retirada)" : freteCalculado.isGratis ? "Grátis" : formatarMoeda(freteCalculado.valorFrete)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between font-bold text-sm">
                    <span className="text-foreground">Total do Pedido:</span>
                    <span className="text-base font-black text-purple-700 dark:text-purple-300 font-mono">
                      {formatarMoeda(totalComFrete)}
                    </span>
                  </div>
                </div>

                {/* Formulário do Cliente */}
                <form id="form-checkout" onSubmit={handleConfirmarPedido} className="space-y-3 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Dados para Encomenda
                  </h4>

                  <div className="space-y-1">
                    <Label htmlFor="chk-nome" className="text-xs">Seu Nome Completo *</Label>
                    <Input
                      id="chk-nome"
                      placeholder="Ex: Mariana Silva"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="h-8 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="chk-whats" className="text-xs">Seu WhatsApp com DDD *</Label>
                    <Input
                      id="chk-whats"
                      placeholder="(11) 99999-9999"
                      value={clienteWhatsapp}
                      onChange={(e) => setClienteWhatsapp(aplicarMascaraTelefone(e.target.value))}
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="chk-data" className="text-xs">Data Desejada *</Label>
                        <Input
                          id="chk-data"
                          type="date"
                          min={dataMinimaStr}
                          value={dataEntrega}
                          onChange={(e) => handleDataEntregaChange(e.target.value)}
                          className="h-8 text-xs font-bold font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="chk-hora" className="text-xs">Horário Previsto *</Label>
                        <Input
                          id="chk-hora"
                          type="time"
                          value={horarioEntrega}
                          onChange={(e) => handleHorarioEntregaChange(e.target.value)}
                          className="h-8 text-xs font-bold font-mono"
                          required
                        />
                      </div>
                    </div>
                    {/* Mensagem Informativa de Regras de Encomenda */}
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 p-1.5 rounded-md border border-purple-500/20 font-medium flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                      <span>
                        {regras.antecedenciaMinimaDias === 0
                          ? `Aceitamos encomendas no mesmo dia. Expediente: ${regras.horarioAbertura} às ${regras.horarioFechamento}.`
                          : `Encomendas com no mínimo ${regras.antecedenciaMinimaDias} dia(s) de antecedência. Expediente: ${regras.horarioAbertura} às ${regras.horarioFechamento}.`}
                      </span>
                    </p>

                    {necessitaConfirmacaoDisponibilidade && (
                      <p className="text-xs text-amber-900 dark:text-amber-300 bg-amber-500/15 p-2 rounded-lg border border-amber-500/30 font-extrabold flex items-center gap-1.5 mt-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>⚠️ Confirme a disponibilidade do produto com a loja.</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Como deseja receber?</Label>
                    <div className={lojaInfo?.delivery_ativo !== false ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
                      <Button
                        type="button"
                        variant={tipoEntrega === "retirada" ? "default" : "outline"}
                        onClick={() => setTipoEntrega("retirada")}
                        className="h-7 text-xs font-semibold"
                      >
                        <Store className="w-3.5 h-3.5 mr-1" /> Retirada no Balcão
                      </Button>
                      {lojaInfo?.delivery_ativo !== false && (
                        <Button
                          type="button"
                          variant={tipoEntrega === "delivery" ? "default" : "outline"}
                          onClick={() => setTipoEntrega("delivery")}
                          className="h-7 text-xs font-semibold"
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" /> Entrega / Delivery
                        </Button>
                      )}
                    </div>
                  </div>

                  {tipoEntrega === "retirada" && (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                      <p className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        Endereço de Retirada no Balcão:
                      </p>
                      <p className="text-foreground font-medium pl-5 text-[11px] leading-snug">
                        {lojaInfo?.endereco || "Endereço cadastrado no sistema da confeitaria."}
                      </p>
                    </div>
                  )}

                  {tipoEntrega === "delivery" && lojaInfo?.delivery_ativo !== false && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          Endereço para Entrega em Domicílio
                        </p>
                        {freteCalculado.motivo && (
                          <Badge
                            variant={freteCalculado.naoAtendido ? "destructive" : "outline"}
                            className={`text-[10px] ${
                              freteCalculado.naoAtendido
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 font-bold"
                                : "text-purple-700 dark:text-purple-300 border-purple-300"
                            }`}
                          >
                            {freteCalculado.motivo}
                          </Badge>
                        )}
                      </div>

                      {/* 1. CEP + Logradouro + Número */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="space-y-1 sm:col-span-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="end-cep" className="text-[11px] font-semibold">CEP (Opcional)</Label>
                            {buscandoCep && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono animate-pulse">
                                Buscando...
                              </span>
                            )}
                          </div>
                          <Input
                            id="end-cep"
                            placeholder="00000-000"
                            value={endCep}
                            onChange={(e) => handleBuscarCep(e.target.value)}
                            className="h-8 text-xs font-medium font-mono"
                            maxLength={9}
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="end-rua" className="text-[11px] font-semibold">Logradouro (Rua / Av) *</Label>
                          <Input
                            id="end-rua"
                            placeholder="Ex: Rua das Flores"
                            value={endLogradouro}
                            onChange={(e) => setEndLogradouro(e.target.value)}
                            className="h-8 text-xs font-medium"
                            required={tipoEntrega === "delivery"}
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-1">
                          <Label htmlFor="end-num" className="text-[11px] font-semibold">Número *</Label>
                          <Input
                            id="end-num"
                            placeholder="Ex: 123"
                            value={endNumero}
                            onChange={(e) => setEndNumero(e.target.value)}
                            className="h-8 text-xs font-medium"
                            required={tipoEntrega === "delivery"}
                          />
                        </div>
                      </div>

                      {/* 1. Seleção Obrigatória de Região / Zona de Entrega */}
                      {freteConfig.regrasBairros.filter((b) => b.ativo).length > 0 && (
                        <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="regiao-entrega-select" className="text-[11px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              Selecione sua Região / Zona de Entrega *
                            </Label>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              Taxa aplicada ao pedido
                            </span>
                          </div>

                          <select
                            id="regiao-entrega-select"
                            value={regiaoEntregaId}
                            onChange={(e) => setRegiaoEntregaId(e.target.value)}
                            className="w-full h-9 text-xs font-bold bg-background border border-purple-300 dark:border-purple-800 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground cursor-pointer"
                            required={tipoEntrega === "delivery"}
                          >
                            <option value="">-- Clique para escolher sua região/zona --</option>
                            {freteConfig.regrasBairros
                              .filter((b) => b.ativo)
                              .map((reg) => (
                                <option key={reg.id} value={reg.id}>
                                  {reg.bairro} — {reg.valor === 0 ? "Frete Grátis" : formatarMoeda(reg.valor)} {reg.prazoMinutos ? `(⏱️ ${reg.prazoMinutos} min)` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* 2. Bairro (Texto Livre) + Ponto de Referência */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="end-bairro" className="text-[11px] font-semibold">Bairro *</Label>
                          <Input
                            id="end-bairro"
                            placeholder="Ex: Jardim América, Centro, etc."
                            value={endBairro}
                            onChange={(e) => setEndBairro(e.target.value)}
                            className="h-8 text-xs font-medium"
                            required={tipoEntrega === "delivery"}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="end-ref" className="text-[11px] font-semibold">Ponto de Referência (Opcional)</Label>
                          <Input
                            id="end-ref"
                            placeholder="Ex: Ao lado do mercado"
                            value={endPontoRef}
                            onChange={(e) => setEndPontoRef(e.target.value)}
                            className="h-8 text-xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORMA DE PAGAMENTO */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Forma de Pagamento
                    </Label>

                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        variant="default"
                        className="h-9 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-white" />
                        Pix Direto
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="chk-obs" className="text-xs">Observações (Opcional)</Label>
                    <Input
                      id="chk-obs"
                      placeholder="Ex: Nome da aniversariante no topo..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {carrinho.length > 0 && (
            <SheetFooter className="pt-4 border-t border-border/60">
              <Button
                type="submit"
                form="form-checkout"
                disabled={salvandoPedido}
                className="w-full font-black text-xs h-10 shadow-md bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5"
              >
                {salvandoPedido ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gravando Pedido...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Pedido
                  </>
                )}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* MODAL DE CONFIRMAÇÃO E PAGAMENTO */}
      <Dialog
        open={sucessoModalOpen}
        onOpenChange={(open) => {
          if (!open) handleConcluirELimpar();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl space-y-4">
          {/* Cabeçalho de Sucesso */}
          <DialogHeader className="text-center space-y-2 border-b border-border/60 pb-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 transition-all duration-300 ${
              pagamentoAprovadoMp
                ? "bg-emerald-500 text-white ring-emerald-500/20 shadow-emerald-500/30 scale-105"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/10"
            }`}>
              <CheckCircle2 className={`w-8 h-8 ${pagamentoAprovadoMp ? "animate-pulse stroke-[2.5]" : ""}`} />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
              {pagamentoAprovadoMp ? "🎉 Pagamento Aprovado com Sucesso!" : "🎉 Pedido Registrado com Sucesso!"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
              {pagamentoAprovadoMp
                ? `Seu pagamento via Mercado Pago foi confirmado! O pedido já está aprovado na confeitaria ${lojaInfo?.nome || "CaixaDoce"}.`
                : `Sua encomenda foi gravada diretamente no sistema da confeitaria ${lojaInfo?.nome || "CaixaDoce"}.`}
            </DialogDescription>
          </DialogHeader>

          {/* RESUMO COMPLETO DO PEDIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold border-b border-border/40 pb-1">
              <span className="flex items-center gap-1.5 text-foreground">
                <FileText className="w-4 h-4 text-purple-600" />
                Resumo do Pedido
              </span>
              <Badge variant="outline" className="font-mono text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                Loja {code}
              </Badge>
            </div>

            {/* Dados do Cliente e Agendamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-purple-600" /> {clienteNome}
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">{clienteWhatsapp}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  {dataEntrega ? dataEntrega.split("-").reverse().join("/") : ""} às {horarioEntrega}
                </p>
                <p className="text-muted-foreground text-[11px] truncate">
                  {tipoEntrega === "delivery" ? `🚚 Delivery: ${enderecoEntrega || "A combinar"}` : "🏬 Retirada no Balcão"}
                </p>
              </div>
            </div>

            {/* Endereço da Loja para Retirada / Referência */}
            {lojaInfo?.endereco && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 text-xs space-y-0.5">
                <p className="font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  Endereço da Loja:
                </p>
                <p className="text-foreground font-medium pl-5 text-[11px] leading-tight">
                  {lojaInfo.endereco}
                </p>
              </div>
            )}

            {necessitaConfirmacaoDisponibilidade && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>⚠️ Confirme a disponibilidade do produto com a loja.</span>
              </div>
            )}

            {observacoes && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
                <strong>Obs:</strong> {observacoes}
              </div>
            )}

            {/* Itens do Pedido */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                Itens ({totalItensCarrinho})
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-border/60">
                {carrinho.map((item) => (
                  <div key={item.produto.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-background border border-border/40">
                    <span className="font-semibold text-foreground truncate max-w-[220px]">
                      {item.quantidade}x {item.produto.nome}
                    </span>
                    <span className="font-bold font-mono text-foreground shrink-0">
                      {formatarMoeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Valores Detalhados (Subtotal + Frete = Total) */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal dos Itens:</span>
                <span className="font-mono font-bold text-foreground">{formatarMoeda(totalCarrinho)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> Taxa de Entrega:
                </span>
                <span className={`font-mono font-bold ${freteCalculado.isGratis ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                  {tipoEntrega === "retirada" ? "Grátis (Retirada)" : freteCalculado.isGratis ? "Grátis (Promoção)" : formatarMoeda(freteCalculado.valorFrete)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between font-bold">
                <span className="text-emerald-900 dark:text-emerald-300">Valor Total a Pagar:</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatarMoeda(totalComFrete)}
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO PIX DE PAGAMENTO (AUTOMÁTICO OU MANUAL) */}
          {pagamentoAprovadoMp ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-center space-y-3 animate-in fade-in zoom-in duration-300 shadow-xs">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30 animate-bounce">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-emerald-950 dark:text-emerald-200">
                  Pagamento Confirmado no Mercado Pago!
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Identificamos seu pagamento via Pix automaticamente. Seu pedido foi atualizado para 100% Pago e o lojista já foi notificado.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs px-3 py-1 flex items-center gap-1 shadow-xs border-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  Status: Pago • Mercado Pago
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Pagamento via Pix {pixQrCodeBase64 ? "(Mercado Pago)" : lojaInfo?.usar_mercadopago ? "(Mercado Pago)" : "(Manual)"}
                </span>
                <Badge className={`text-[10px] font-mono font-bold border-0 ${pixQrCodeBase64 ? "bg-blue-600 text-white" : lojaInfo?.usar_mercadopago ? "bg-blue-600 text-white" : "bg-purple-600 text-white"}`}>
                  {pixQrCodeBase64 ? "Pix Automático" : lojaInfo?.usar_mercadopago ? "Pix Automático" : "Pix Manual"}
                </Badge>
              </div>

              {/* SE TEM IMAGEM QR CODE BASE64 */}
              {pixQrCodeBase64 && (
                <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-stone-900 rounded-2xl border border-purple-200 shadow-inner space-y-2">
                  <img
                    src={pixQrCodeBase64.startsWith("data:") ? pixQrCodeBase64 : `data:image/png;base64,${pixQrCodeBase64}`}
                    alt="QR Code Pix Mercado Pago"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 text-center">
                    Escaneie o QR Code no aplicativo do seu banco
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium pt-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    Aguardando pagamento... Verificando em tempo real
                  </div>
                </div>
              )}

              {/* CÓDIGO PIX COPIA E COLA */}
              {pixCopiaCola ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={pixCopiaCola}
                      className="font-mono text-[11px] h-9 bg-background select-all border-purple-300 focus-visible:ring-purple-400"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(pixCopiaCola);
                          setPixCopiado(true);
                          toast.success("Código Pix Copia e Cola copiado!");
                        }
                      }}
                      className="h-9 px-3 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      {pixCopiado ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Código Pix
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-purple-700 dark:text-purple-300">
                    Abra o app do seu banco, escolha a opção <strong>Pix Copia e Cola</strong> e cole o código acima para realizar o pagamento.
                  </p>
                </div>
              ) : (lojaInfo?.chave_pix_manual || lojaInfo?.chavePix) ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-purple-800 dark:text-purple-200 font-medium">Chave Pix da Loja:</p>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-background border border-purple-200 text-xs">
                    <span className="font-mono text-purple-900 dark:text-purple-200 font-bold truncate">
                      {lojaInfo.chave_pix_manual || lojaInfo.chavePix}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const keyToCopy = lojaInfo.chave_pix_manual || lojaInfo.chavePix || "";
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(keyToCopy);
                          setPixCopiado(true);
                          toast.success("Chave Pix copiada!");
                        }
                      }}
                      className="h-8 px-2.5 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 flex items-center gap-1"
                    >
                      {pixCopiado ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      {pixCopiado ? "Copiada!" : "Copiar Chave"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Chave Pix não cadastrada no perfil da loja. Entre em contato pelo WhatsApp para obter os dados de pagamento.
                </p>
              )}
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Button
              onClick={handleEnviarWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar resumo pelo WhatsApp
            </Button>

            <Button
              variant="outline"
              onClick={handleConcluirELimpar}
              className="w-full text-xs font-bold text-muted-foreground hover:text-foreground h-9 rounded-xl"
            >
              Concluir e Limpar Carrinho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE HISTÓRICO DE PEDIDOS RECENTES DO CLIENTE */}
      <Dialog open={ultimosPedidosModalOpen} onOpenChange={setUltimosPedidosModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-5 sm:p-6 rounded-3xl space-y-4">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">
                  Meus Últimos Pedidos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Histórico salvo no seu navegador {savedUserPhone ? `(${savedUserPhone})` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Nenhum pedido recente registrado neste navegador.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((ord, idx) => (
                <div
                  key={ord.id || idx}
                  className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs hover:border-purple-300 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="font-bold font-mono text-[11px] text-purple-600 dark:text-purple-400">
                      Pedido #{ord.id ? ord.id.slice(0, 8).toUpperCase() : `REC-${idx + 1}`}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold capitalize">
                      {ord.status || "Pendente"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <p className="line-clamp-2 font-medium text-foreground">
                      🛒 {ord.itens}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span>
                        📅 {ord.data_entrega ? ord.data_entrega.split("-").reverse().join("/") : new Date(ord.data).toLocaleDateString("pt-BR")} {ord.horario_entrega ? `às ${ord.horario_entrega}` : ""}
                      </span>
                      <span className="font-mono font-black text-xs text-foreground">
                        {formatarMoeda(ord.valor_total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setUltimosPedidosModalOpen(false)}
            className="w-full text-xs font-bold rounded-xl h-9"
          >
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
