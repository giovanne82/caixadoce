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
  titulo_cardapio?: string;
  menu_title?: string;
  slogan_cardapio?: string;
  menu_slogan?: string;
  chave_pix?: string;
  tipo_chave_pix?: string;
  cidade?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
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
    <div className="flex items-center gap-1">
      {instaUrl && (
        <a
          href={instaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-full text-[#2E1A47] hover:text-pink-600 hover:bg-white/50 transition-all"
          title="Instagram"
        >
          <Instagram className="w-3.5 h-3.5" />
        </a>
      )}
      {tiktokUrl && (
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-full text-[#2E1A47] hover:text-slate-900 hover:bg-white/50 transition-all"
          title="TikTok"
        >
          <Music className="w-3.5 h-3.5" />
        </a>
      )}
      {fbUrl && (
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-full text-[#2E1A47] hover:text-blue-600 hover:bg-white/50 transition-all"
          title="Facebook"
        >
          <Facebook className="w-3.5 h-3.5" />
        </a>
      )}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-full text-[#2E1A47] hover:text-emerald-600 hover:bg-white/50 transition-all"
          title="WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5" />
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

  // Estados do Formulário de Checkout do Cliente
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<number>(1);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // Dados da Loja
  const [lojaInfo, setLojaInfo] = useState<LojaInfoState | null>(null);

  // Dados de Conclusão do Pix
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pedidoCriadoId, setPedidoCriadoId] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

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
        let title = estData?.titulo_cardapio || estData?.menu_title;
        let slogan = estData?.slogan_cardapio || estData?.menu_slogan;
        let name = estData?.nome;

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
                title = title || p.tituloCardapio || p.menu_title;
                slogan = slogan || p.sloganCardapio || p.menu_slogan;
                name = name || p.establishmentName || p.nome;
              }
            }
          } catch {}
        }

        if (estData || name || title || insta || tk || fb) {
          setLojaInfo({
            whatsapp: wa,
            telefone: wa,
            user_id: estData?.user_id,
            nome: name || "Confeitaria Artesanal",
            logo_url: logo,
            store_logo_url: logo,
            titulo_cardapio: title,
            menu_title: title,
            slogan_cardapio: slogan,
            menu_slogan: slogan,
            chavePix: (estData?.chave_pix || estData?.chavePix || "") === "contato@caixadoce.com.br" ? "" : (estData?.chave_pix || estData?.chavePix || ""),
            cidade: estData?.cidade || "SAO PAULO",
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

  const stripeConfig = useMemo(() => obterConfiguracoesStripeLoja(code), [code]);
  const regrasBase = useMemo(() => obterRegrasAgendamento(code), [code]);
  const regras = useMemo(
    () => calcularRegrasAgendamentoCarrinho(regrasBase, carrinho),
    [regrasBase, carrinho]
  );

  const dataMinimaStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (regras.antecedenciaMinimaDias || 0));
    let safety = 0;
    const permitidos = regras.diasSemanaDisponiveis || [0, 1, 2, 3, 4, 5, 6];
    while (permitidos.length > 0 && !permitidos.includes(d.getDay()) && safety < 7) {
      d.setDate(d.getDate() + 1);
      safety++;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [regras]);

  const handleDataEntregaChange = (val: string) => {
    if (!val) {
      setDataEntrega("");
      return;
    }
    const valRes = validarDataEntrega(val, regras);
    if (!valRes.valida) {
      toast.error(valRes.motivo || "Data indisponível para encomenda.");
      setDataEntrega("");
      return;
    }
    setDataEntrega(val);
  };

  const handleHorarioEntregaChange = (val: string) => {
    setHorarioEntrega(val);
    const horRes = validarHorarioEntrega(val, regras);
    if (!horRes.valido) {
      toast.warning(horRes.motivo || "Horário fora do expediente da loja.");
    }
  };

  useEffect(() => {
    const list = obterProdutosCardapio(code);
    setProdutos(list.filter((p) => p.ativo !== false));

    // Data mínima: amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    setDataEntrega(amanha.toISOString().split("T")[0]);
  }, [code]);

  // Categorias Únicas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(produtos.map((p) => p.categoria)));
    return ["todas", ...cats];
  }, [produtos]);

  // Produtos Filtrados
  const produtosFiltrados = useMemo(() => {
    if (categoriaAtiva === "todas") return produtos;
    return produtos.filter((p) => p.categoria === categoriaAtiva);
  }, [produtos, categoriaAtiva]);

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

  const feeResult = useMemo(() => {
    return calculateDynamicTotal(
      totalCarrinho,
      parcelasSelecionadas,
      metodoPagamento === "cartao" && stripeConfig.repassarTaxaStripe
    );
  }, [totalCarrinho, parcelasSelecionadas, metodoPagamento, stripeConfig]);

  const installmentOptions = useMemo(() => {
    return getInstallmentOptions(
      totalCarrinho,
      stripeConfig.repassarTaxaStripe
    );
  }, [totalCarrinho, stripeConfig]);

  const totalItensCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  }, [carrinho]);

  // Finalizar Encomenda (Salvar no Supabase + WhatsApp/Stripe Dinâmico)
  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome || !clienteWhatsapp || !dataEntrega || carrinho.length === 0) {
      toast.error("Preencha seu nome, WhatsApp e data para entrega.");
      return;
    }

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

    const valTotalCarrinho = Math.max(0, Number(totalCarrinho) || 0);

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
      status_pagamento: metodoPagamento === "pix" ? "pix_pendente" : "cartao_pendente",
      status: "pendente",
      itens: resumoItensTexto,
      itens_detalhes: itensDetalhesJson,
      valor_total: valTotalCarrinho,
      total_amount: valTotalCarrinho,
      total_price: valTotalCarrinho,
      observacoes: observacoes || "",
    };

    let { error: insertError } = await supabase.from("encomendas").insert([payloadInsert]);

    if (insertError) {
      console.error("Erro ao registrar encomenda no Supabase:", insertError);
      toast.error(`Falha ao registrar pedido: ${insertError.message || "Erro no servidor"}`);
      return;
    }

    if (metodoPagamento === "cartao") {
      setProcessandoPagamento(true);
      try {
        const session = await createStripeSession({
          orderId: pedidoId,
          establishmentCode: code,
          customerName: clienteNome,
          customerWhatsapp: clienteWhatsapp,
          items: carrinho.map((it) => ({
            name: it.produto.nome,
            quantity: it.quantidade,
            unitPrice: it.produto.preco,
          })),
          subtotal: totalCarrinho,
          installments: parcelasSelecionadas,
          repassarTaxa: stripeConfig.repassarTaxaStripe,
          stripeAccountId: stripeConfig.accountId,
        });

        toast.success(`Sessão no cartão criada! Total: ${feeResult.formattedTotalAmount}`);
        setTimeout(() => {
          window.open(session.checkoutUrl, "_blank");
        }, 800);
      } catch (err) {
        toast.error("Erro ao iniciar pagamento no cartão.");
      } finally {
        setProcessandoPagamento(false);
      }
      return;
    }

    const dataFormatada = dataEntrega.split("-").reverse().join("/");
    const resumoItens = carrinho
      .map((item) => `• ${item.quantidade}x ${item.produto.nome} (${formatarMoeda(item.produto.preco * item.quantidade)})`)
      .join("\n");

    const modalidade = tipoEntrega === "delivery"
      ? `🚚 Entrega no Endereço: ${enderecoEntrega || "A combinar"}`
      : "🏬 Retirada no Balcão";

    let pixCopiadoComSucesso = false;
    let blocoPixInfo = "";

    if (lojaInfo?.chavePix && totalCarrinho > 0) {
      blocoPixInfo = `\n\n💳 *Forma de Pagamento:* PIX\n💰 *Valor Devido:* ${formatarMoeda(totalCarrinho)}\n🔑 *Chave Pix:* ${lojaInfo.chavePix}`;
      
      try {
        const pixPayload = generatePixPayload({
          pixKey: lojaInfo.chavePix,
          merchantName: lojaInfo.nome || "CaixaDoce",
          merchantCity: (lojaInfo as any).cidade || "SAO PAULO",
          amount: totalCarrinho,
          txid: `PED${Date.now().toString().slice(-8)}`,
          description: `Pedido ${clienteNome.slice(0, 15)}`,
        });

        if (pixPayload && typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(pixPayload);
          pixCopiadoComSucesso = true;
        }
      } catch {}
    }

    const msg = `🎂 *NOVO PEDIDO ONLINE - CARDÁPIO DIGITAL* 🎂

Olá! Acabei de montar meu pedido pelo cardápio digital (Código: *${code}*):

👤 *Cliente:* ${clienteNome}
📱 *WhatsApp do Cliente:* ${clienteWhatsapp}

📅 *Data Prevista:* ${dataFormatada} às ${horarioEntrega}
📍 *Modalidade:* ${modalidade}
${observacoes ? `📝 *Observações:* ${observacoes}\n` : ""}🛒 *Itens do Pedido:*
${resumoItens}

💰 *Valor Total do Pedido:* ${formatarMoeda(totalCarrinho)}${blocoPixInfo}

Poderia confirmar a disponibilidade e os dados do pagamento? Muito obrigado(a)!`;

    if (pixCopiadoComSucesso) {
      toast.info("Mensagem gerada! O Pix Copia e Cola foi copiado para sua área de transferência. Cole-o no WhatsApp após enviar o pedido.");
    } else {
      toast.success("Pedido enviado para a confeiteira com sucesso!");
    }

    const numTarget = lojaInfo?.whatsapp || lojaInfo?.telefone || "";
    const url = formatarWhatsappLink(numTarget, msg);

    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }

    setPedidoConcluido(true);
    toast.success("Pedido enviado para a confeiteira com sucesso!");
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-foreground pb-24">
      {/* Header da Confeitaria em Lilás Suave #F3EEF9 com Botão #8E7CC3 */}
      <header className="bg-[#F3EEF9] text-[#2E1A47] py-4 px-4 shadow-xs border-b border-[#E8E0F2] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {lojaInfo?.logo_url || lojaInfo?.store_logo_url ? (
              <img
                src={lojaInfo.logo_url || lojaInfo.store_logo_url}
                alt={lojaInfo.nome || "Logo"}
                className="w-10 h-10 object-cover rounded-xl border border-[#8E7CC3]/30 shadow-xs shrink-0"
              />
            ) : (
              <CaixaDoceLogo size="md" className="shrink-0" />
            )}
            <div className="border-l border-[#8E7CC3]/30 pl-2.5 sm:pl-3 min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#2E1A47] truncate max-w-[150px] sm:max-w-xs">
                {lojaInfo?.nome || "Confeitaria Artesanal"}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block bg-[#7C3AED]/10 text-[#6D28D9] border border-[#7C3AED]/25 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold whitespace-nowrap">
                  Código Loja: {code}
                </span>

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
          </div>

          {/* Botão do Carrinho Flutuante 'Meu Pedido' no Topo (Lilás da Marca #8E7CC3) */}
          <Button
            onClick={() => setCartOpen(true)}
            className="font-extrabold shrink-0 relative bg-[#8E7CC3] hover:bg-[#7C69B3] text-white text-xs shadow-md rounded-2xl py-2 px-3.5 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Meu Pedido</span>
            {totalItensCarrinho > 0 && (
              <span className="ml-1.5 bg-[#2E1A47] text-white font-mono px-1.5 py-0.2 rounded-full text-[10px]">
                {totalItensCarrinho}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Conteúdo do Cardápio */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Banner de Boas-Vindas */}
        <div className="text-center space-y-3 py-2">
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

        {/* Pílulas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 justify-start sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={categoriaAtiva === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoriaAtiva(cat)}
              className={`h-8 text-xs font-bold rounded-full capitalize shrink-0 ${
                categoriaAtiva === cat ? "shadow-md" : ""
              }`}
            >
              {cat === "todas" ? "Todos os Doces" : cat}
            </Button>
          ))}
        </div>

        {/* Grid de Produtos */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 pt-2">
          {produtosFiltrados.map((prod) => (
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
                      <Badge className="bg-amber-500 text-white border-0 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 flex items-center gap-0.5">
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
                    <span className="text-xs sm:text-lg font-black text-primary font-mono shrink-0">
                      {formatarMoeda(prod.preco)}
                    </span>
                  </div>
                  <CardDescription className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 sm:line-clamp-3 mt-0.5 sm:mt-1.5">
                    {prod.descricao}
                  </CardDescription>
                </CardHeader>
              </div>

              <CardFooter className="p-2.5 sm:p-4 pt-1.5 sm:pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2">
                {(() => {
                  const disp = formatarBadgeDisponibilidadeProduto(prod);
                  return disp.isProntaEntrega ? (
                    <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center justify-center sm:justify-start gap-1 truncate">
                      {disp.texto}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 flex items-center justify-center sm:justify-start gap-1 truncate">
                      {disp.texto}
                    </span>
                  );
                })()}

                <Button
                  size="sm"
                  onClick={() => handleAdicionarAoCarrinho(prod)}
                  className="font-bold text-[11px] sm:text-xs shadow-xs h-7 sm:h-8 px-2 sm:px-3.5 w-full sm:w-auto shrink-0 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" /> Pedir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
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
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                {totalItensCarrinho}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Ver Meu Pedido</p>
                <p className="text-[11px] text-amber-300 font-mono font-bold">{formatarMoeda(totalCarrinho)}</p>
              </div>
            </div>

            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs h-8">
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

                {/* Subtotal */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-bold">
                  <span>Total do Pedido:</span>
                  <span className="text-base font-black text-amber-900 dark:text-amber-300 font-mono">
                    {formatarMoeda(totalCarrinho)}
                  </span>
                </div>

                {/* Formulário do Cliente */}
                <form id="form-checkout" onSubmit={handleFinalizarPedido} className="space-y-3 pt-2 border-t border-border/60">
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Como deseja receber?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={tipoEntrega === "retirada" ? "default" : "outline"}
                        onClick={() => setTipoEntrega("retirada")}
                        className="h-7 text-xs font-semibold"
                      >
                        <Store className="w-3.5 h-3.5 mr-1" /> Retirada no Balcão
                      </Button>
                      <Button
                        type="button"
                        variant={tipoEntrega === "delivery" ? "default" : "outline"}
                        onClick={() => setTipoEntrega("delivery")}
                        className="h-7 text-xs font-semibold"
                      >
                        <Truck className="w-3.5 h-3.5 mr-1" /> Entrega / Delivery
                      </Button>
                    </div>
                  </div>

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
                disabled={processandoPagamento}
                className={`w-full font-black text-xs h-10 shadow-md ${
                  metodoPagamento === "cartao"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {metodoPagamento === "cartao" ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    {processandoPagamento ? "Processando..." : `Pagar ${feeResult.installments}x de ${feeResult.formattedInstallmentValue}`}
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-1.5" /> Enviar Encomenda no WhatsApp
                  </>
                )}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
