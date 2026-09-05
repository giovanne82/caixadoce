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
import { generatePixPayload, type ProdutoCardapio } from "@/lib/caixadoce-data";
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
  // Leitura desacoplada e segura dos parâmetros de rota
  const routeParams = useParams({ strict: false }) as Record<string, string> | undefined;
  const storeCodeFromParam = routeParams?.storeCode;
  const code = (storeCodeFromParam || "CD-1001").toUpperCase();

  // Estados dos Produtos e Carrinho
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
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

  // Estados do Formulário de Checkout do Cliente
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [endLogradouro, setEndLogradouro] = useState("");
  const [endNumero, setEndNumero] = useState("");
  const [endBairro, setEndBairro] = useState("");
  const [endPontoRef, setEndPontoRef] = useState("");

  const enderecoEntrega = useMemo(() => {
    const partes = [];
    if (endLogradouro.trim()) partes.push(endLogradouro.trim());
    if (endNumero.trim()) partes.push(`nº ${endNumero.trim()}`);
    if (endBairro.trim()) partes.push(`Bairro: ${endBairro.trim()}`);
    if (endPontoRef.trim()) partes.push(`Ref: ${endPontoRef.trim()}`);
    return partes.join(", ");
  }, [endLogradouro, endNumero, endBairro, endPontoRef]);

  const [observacoes, setObservacoes] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<number>(1);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // Configurações de Frete & Entrega
  const [freteConfig, setFreteConfig] = useState<ConfiguracaoFrete>(() => obterConfiguracaoFrete(code));
  const [bairroDropdownOpen, setBairroDropdownOpen] = useState(false);

  useEffect(() => {
    setFreteConfig(obterConfiguracaoFrete(code));
    let isMounted = true;
    carregarConfiguracaoFreteAsync(code).then((cfg) => {
      if (isMounted && cfg) {
        setFreteConfig(cfg);
      }
    });

    const handleFreteUpdate = (e: any) => {
      setFreteConfig(e.detail || obterConfiguracaoFrete(code));
    };
    window.addEventListener("freteConfigUpdated", handleFreteUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("freteConfigUpdated", handleFreteUpdate);
    };
  }, [code]);

  // Sugestões de Bairros filtradas dinamicamente
  const bairrosSugeridos = useMemo(() => {
    const lista = freteConfig.regrasBairros.filter((b) => b.ativo);
    if (!endBairro.trim()) return lista;
    const q = endBairro.trim().toLowerCase();
    const isExactMatch = lista.some((b) => b.bairro.toLowerCase() === q);
    // Se o usuário selecionou exatamente um bairro, ainda exibimos todos os bairros na lista para troca rápida
    if (isExactMatch) return lista;
    const filtrados = lista.filter((b) => b.bairro.toLowerCase().includes(q));
    return filtrados.length > 0 ? filtrados : lista;
  }, [freteConfig.regrasBairros, endBairro]);

  // Dados da Loja
  const [lojaInfo, setLojaInfo] = useState<LojaInfoState | null>(null);

  // Dados de Conclusão do Pix
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pedidoCriadoId, setPedidoCriadoId] = useState<string | null>(null);

  // 1. Carregamento de Dados da Confeitaria (Supabase + LocalStorage Fallback)
  useEffect(() => {
    let cancelado = false;

    async function carregarDadosLoja() {
      try {
        if (code === "CD-DEMO" || code === "DEMO-01") {
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
          return;
        }

        let estData = null;

        // 1. Busca por codigo
        const { data: d1, error: err1 } = await supabase
          .from("estabelecimentos")
          .select("*")
          .eq("codigo", code)
          .maybeSingle();

        if (!err1 && d1) {
          estData = d1;
        } else {
          // 2. Busca por estabelecimento_codigo
          const { data: d2, error: err2 } = await supabase
            .from("estabelecimentos")
            .select("*")
            .eq("estabelecimento_codigo", code)
            .maybeSingle();

          if (!err2 && d2) {
            estData = d2;
          }
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

        // Fallback resiliente: se no Supabase não vierem preenchidos (por exemplo, se as colunas remota estivem nulas), recupera do localStorage do navegador
        if (typeof window !== "undefined") {
          try {
            const savedProfileStr = localStorage.getItem("caixadoce_profile");
            if (savedProfileStr) {
              const p = JSON.parse(savedProfileStr);
              if (p.establishmentCode === code || p.codigo === code || !estData) {
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
            const localDel = localStorage.getItem(`caixadoce_delivery_${code}`);
            if (localDel !== null) {
              delAtivoVal = localDel === "true";
            }
          } catch {}
        }

        if (estData || name || title || insta || tk || fb || banner || themeCol) {
          setLojaInfo({
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
            instagram: insta,
            tiktok: tk,
            facebook: fb,
            social_media: estData?.social_media || { instagram: insta, tiktok: tk, facebook: fb, whatsapp: wa },
          });
        }
      } catch (err) {
        console.warn("[Cardápio Público] Aviso no carregamento do estabelecimento:", err);
      }
    }
    carregarDadosLoja();
  }, [code]);

  // Garante que se o lojista desativou o delivery, a modalidade seja forçada para "retirada"
  useEffect(() => {
    if (lojaInfo?.delivery_ativo === false || lojaInfo?.aceita_delivery === false) {
      setTipoEntrega("retirada");
    }
  }, [lojaInfo]);

  const stripeConfig = useMemo(() => obterConfiguracoesStripeLoja(code), [code]);
  const regrasBase = useMemo(() => obterRegrasAgendamento(code), [code]);
  const regras = useMemo(
    () => calcularRegrasAgendamentoCarrinho(regrasBase, carrinho),
    [regrasBase, carrinho]
  );

  // Calculo da data minima de seleção no calendario (apenas hoje em diante, sem bloqueio por antecedencia)
  const dataMinimaStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const handleDataEntregaChange = (val: string) => {
    setDataEntrega(val);
  };

  // Checagem dinêmica se a data escolhida e inferior ao prazo de antecedencia exigido pelos produtos
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

  const handleHorarioEntregaChange = (val: string) => {
    setHorarioEntrega(val);
    const horRes = validarHorarioEntrega(val, regras);
    if (!horRes.valido) {
      toast.warning(horRes.motivo || "Horário fora do expediente da loja.");
    }
  };

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
  const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState<number | "todos">(() => new Date().getDay());
  const [tabModoHibrido, setTabModoHibrido] = useState<"todos" | "pronta_entrega" | "encomenda">("todos");

  useEffect(() => {
    const list = obterProdutosCardapio(code);
    setProdutos(list.filter((p) => p.ativo !== false));

    // Data mínima inicial: amanhã por padrão
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    setDataEntrega(amanha.toISOString().split("T")[0]);
  }, [code]);

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

  // Adicionar ao Carrinho
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

  const totalCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);
  }, [carrinho]);

  // Cálculo Dinâmico do Frete do Pedido
  const freteCalculado = useMemo(() => {
    return calcularFretePedido(
      freteConfig,
      totalCarrinho,
      endBairro,
      tipoEntrega
    );
  }, [freteConfig, totalCarrinho, endBairro, tipoEntrega]);

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

  // 1. Gravação Automática na Base de Dados e Abertura do Modal de Confirmação & Pagamento
  const handleConfirmarPedido = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clienteNome.trim() || !clienteWhatsapp.trim() || !dataEntrega || carrinho.length === 0) {
      toast.error("Preencha seu nome, WhatsApp e data para entrega.");
      return;
    }

    if (tipoEntrega === "delivery") {
      if (!endLogradouro.trim() || !endNumero.trim() || !endBairro.trim()) {
        toast.error("Preencha o logradouro, número e bairro para a entrega.");
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

      const payloadInsert: Record<string, any> = {
        id: pedidoId,
        estabelecimento_codigo: code,
        user_id: lojaInfo?.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaInfo.user_id) ? lojaInfo.user_id : null,
        cliente_nome: clienteNome,
        cliente_whatsapp: clienteWhatsapp,
        data_entrega: dataEntrega,
        horario_entrega: horarioEntrega || "15:00",
        tipo_entrega: tipoEntrega,
        endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        taxa_entrega: tipoEntrega === "delivery" ? freteCalculado.valorFrete : 0,
        status_pagamento: metodoPagamento === "pix" ? "pix_pendente" : "cartao_pendente",
        status: "pendente",
        itens: resumoItensTexto,
        itens_detalhes: itensDetalhesJson,
        valor_total: valTotalCarrinho,
        total_amount: valTotalCarrinho,
        total_price: valTotalCarrinho,
        observacoes: obsFinal,
      };

      let { error: insertError } = await supabase.from("encomendas").insert([payloadInsert]);

      if (insertError) {
        console.warn("Tentativa de insert em encomendas falhou com payload estendido, tentando fallback minimalista:", insertError.message);
        
        const payloadMinimal = {
          id: pedidoId,
          estabelecimento_codigo: code,
          user_id: payloadInsert.user_id,
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
          observacoes: obsFinal,
        };

        const resMin = await supabase.from("encomendas").insert([payloadMinimal]);
        insertError = resMin.error;
      }

      if (insertError) {
        console.error("Erro ao registrar encomenda no Supabase:", insertError);
        toast.error(`Falha ao registrar pedido: ${insertError.message || "Erro no servidor"}`);
        return;
      }

      // Gravação / Consolidação do Cliente no Banco e no Storage
      try {
        const rawCust = typeof window !== "undefined" ? localStorage.getItem(`caixadoce_customers_${code}`) : null;
        let listaCust: any[] = rawCust ? JSON.parse(rawCust) : [];
        const cleanPhone = clienteWhatsapp.replace(/\D/g, "");
        const foundIndex = listaCust.findIndex((c: any) => {
          const p = (c.whatsapp || "").replace(/\D/g, "");
          return (cleanPhone && p && cleanPhone === p) || (c.nome || c.name || "").trim().toLowerCase() === clienteNome.trim().toLowerCase();
        });

        const custId = foundIndex >= 0 ? listaCust[foundIndex].id : crypto.randomUUID();
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

      // Tentar gerar Pix Payload para a chave Pix da loja
      let pixPayloadGerado = "";
      const pixKeyToUse = lojaInfo?.chavePix || "";
      if (pixKeyToUse && valTotalCarrinho > 0) {
        try {
          pixPayloadGerado = generatePixPayload({
            pixKey: pixKeyToUse,
            merchantName: lojaInfo?.nome || "CaixaDoce",
            merchantCity: lojaInfo?.cidade || "SAO PAULO",
            amount: valTotalCarrinho,
            txid: `PED${Date.now().toString().slice(-8)}`,
            description: `Pedido ${clienteNome.slice(0, 15)}`,
          });
          setPixCopiaCola(pixPayloadGerado);

          if (pixPayloadGerado && typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(pixPayloadGerado);
            setPixCopiado(true);
          }
        } catch (e) {
          console.warn("Aviso ao gerar QR Code / Pix Copia e Cola:", e);
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
        {produtosFiltrados.length === 0 ? (
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
                          <Badge variant="outline" className="text-[10px] text-purple-700 dark:text-purple-300 border-purple-300">
                            {freteCalculado.motivo}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2 space-y-1">
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
                        <div className="space-y-1">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="end-bairro" className="text-[11px] font-semibold">Bairro *</Label>
                            {freteConfig.regrasBairros.filter((b) => b.ativo).length > 0 && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                {freteConfig.regrasBairros.filter((b) => b.ativo).length} atendidos
                              </span>
                            )}
                          </div>

                          <div className="relative">
                            <Input
                              id="end-bairro"
                              placeholder={
                                freteConfig.regrasBairros.filter((b) => b.ativo).length > 0
                                  ? "Digite ou escolha o bairro..."
                                  : "Ex: Centro"
                              }
                              value={endBairro}
                              onClick={() => {
                                if (freteConfig.regrasBairros.filter((b) => b.ativo).length > 0) {
                                  setBairroDropdownOpen(true);
                                }
                              }}
                              onFocus={() => {
                                if (freteConfig.regrasBairros.filter((b) => b.ativo).length > 0) {
                                  setBairroDropdownOpen(true);
                                }
                              }}
                              onChange={(e) => {
                                setEndBairro(e.target.value);
                                if (!bairroDropdownOpen && freteConfig.regrasBairros.filter((b) => b.ativo).length > 0) {
                                  setBairroDropdownOpen(true);
                                }
                              }}
                              className={`h-8 text-xs font-medium ${
                                endBairro.trim() && freteConfig.regrasBairros.filter((b) => b.ativo).length > 0
                                  ? "pr-14"
                                  : "pr-7"
                              }`}
                              required={tipoEntrega === "delivery"}
                              autoComplete="off"
                            />
                            
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                              {endBairro.trim() && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEndBairro("");
                                    setBairroDropdownOpen(true);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/15 rounded-full transition-colors"
                                  title="Limpar e escolher outro bairro"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}

                              {freteConfig.regrasBairros.filter((b) => b.ativo).length > 0 && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBairroDropdownOpen((prev) => !prev);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                  title="Ver lista de bairros atendidos"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bairroDropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                              )}
                            </div>

                            {/* Dropdown de Sugestões de Bairros */}
                            {bairroDropdownOpen && freteConfig.regrasBairros.filter((b) => b.ativo).length > 0 && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setBairroDropdownOpen(false)}
                                />
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border/80 rounded-xl shadow-xl max-h-52 overflow-y-auto p-1 text-xs divide-y divide-border/30">
                                  {bairrosSugeridos.length > 0 ? (
                                    bairrosSugeridos.map((b) => {
                                      const isSelected = endBairro.trim().toLowerCase() === b.bairro.toLowerCase();
                                      return (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() => {
                                            setEndBairro(b.bairro);
                                            setBairroDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                                            isSelected
                                              ? "bg-purple-500/15 text-purple-800 dark:text-purple-300 font-bold"
                                              : "hover:bg-muted/70 text-foreground"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-600" : "text-muted-foreground"}`} />
                                            <span className="truncate">{b.bairro}</span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {b.prazoEstimadoMinutos && (
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                ⏱️ {b.prazoEstimadoMinutos}min
                                              </span>
                                            )}
                                            <Badge
                                              variant={b.valor === 0 ? "default" : "outline"}
                                              className={`text-[10px] px-1.5 py-0 ${
                                                b.valor === 0
                                                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                                                  : "border-purple-300 text-purple-700 dark:text-purple-300"
                                              }`}
                                            >
                                              {b.valor === 0 ? "Grátis" : formatarMoeda(b.valor)}
                                            </Badge>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">
                                      Nenhum bairro cadastrado com esse nome.
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Indicador Dinâmico de Frete para o Bairro com Botão Trocar */}
                          {endBairro.trim() && (
                            <div className="flex items-center justify-between pt-0.5 text-[10px]">
                              {freteCalculado.isGratis ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 truncate">
                                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                  Entrega Grátis ({endBairro.trim()})
                                </span>
                              ) : (
                                <span className="text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1 truncate">
                                  <Truck className="w-3 h-3 text-purple-600 shrink-0" />
                                  Taxa: {formatarMoeda(freteCalculado.valorFrete)} ({endBairro.trim()})
                                </span>
                              )}

                              {freteConfig.regrasBairros.filter((b) => b.ativo).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setBairroDropdownOpen(true)}
                                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-bold hover:underline shrink-0 ml-1.5 cursor-pointer"
                                >
                                  Trocar
                                </button>
                              )}
                            </div>
                          )}
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
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
              🎉 Pedido Registrado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
              Sua encomenda foi gravada diretamente no sistema da confeitaria <strong>{lojaInfo?.nome || "CaixaDoce"}</strong>.
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

          {/* BLOCO PIX COPIA E COLA */}
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Pagamento via Pix Copia e Cola
              </span>
              {lojaInfo?.chavePix && (
                <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                  Chave: {lojaInfo.chavePix}
                </span>
              )}
            </div>

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
                        <Copy className="w-3.5 h-3.5" /> Copiar Pix
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-purple-700 dark:text-purple-300">
                  Abra o app do seu banco, escolha a opção <strong>Pix Copia e Cola</strong> e cole o código acima para realizar o pagamento.
                </p>
              </div>
            ) : lojaInfo?.chavePix ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-background border border-purple-200 text-xs">
                <span className="font-mono text-purple-900 dark:text-purple-200 font-bold truncate">
                  {lojaInfo.chavePix}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(lojaInfo.chavePix || "");
                      setPixCopiado(true);
                      toast.success("Chave Pix copiada!");
                    }
                  }}
                  className="h-8 px-2.5 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 flex items-center gap-1"
                >
                  {pixCopiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {pixCopiado ? "Copiada!" : "Copiar Chave"}
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Chave Pix não cadastrada no perfil da loja. Entre em contato pelo WhatsApp para obter os dados de pagamento.
              </p>
            )}
          </div>

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
    </div>
  );
}
