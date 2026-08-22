import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ShoppingBag,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  QrCode,
  Copy,
  Check,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Phone,
  MapPin,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import {
  formatarMoeda,
  formatarWhatsappLink,
  obterProdutosCardapio,
  obterRegrasAgendamento,
  validarDataEntrega,
  validarHorarioEntrega,
  ESTABELECIMENTO_PADRAO,
  type ProdutoCardapio,
  type DataBloqueada,
  type Encomenda,
} from "@/lib/caixadoce-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  obterConfiguracoesStripeLoja,
  createStripeSession,
} from "@/lib/stripe-connect-service";
import {
  calculateDynamicTotal,
  getInstallmentOptions,
} from "@/lib/stripeFees";
import { toast } from "sonner";

export const Route = createFileRoute("/agendar/$storeSlug")({
  head: () => ({
    meta: [
      { title: "Cardápio & Agendamento de Encomendas — CaixaDoce" },
      { name: "description", content: "Escolha seus doces e bolos favoritos e agende a data de entrega ou retirada." },
    ],
  }),
  component: PublicStoreView,
});

interface ItemCarrinho {
  produto: ProdutoCardapio;
  quantidade: number;
  observacao?: string;
}

function PublicStoreView() {
  const { storeSlug } = useParams({ from: "/agendar/$storeSlug" });
  const cleanCode = (storeSlug || "cd-1001").toUpperCase();

  const regras = useMemo(() => obterRegrasAgendamento(cleanCode), [cleanCode]);

  const dataMinimaStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (regras.antecedenciaMinimaDias || 0));
    return d.toISOString().split("T")[0];
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

  // Dados do Estabelecimento
  const [storeInfo, setStoreInfo] = useState({
    nome: "Confeitaria CaixaDoce",
    endereco: "Av. Principal, 1000 - Centro",
    whatsapp: "(11) 99999-9999",
    chavePix: "contato@caixadoce.com.br",
    tipoChavePix: "email",
  });

  // Produtos do Cardápio
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>(() => obterProdutosCardapio(cleanCode));
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("Todos");

  // Datas Bloqueadas
  const [datasBloqueadas, setDatasBloqueadas] = useState<DataBloqueada[]>([]);

  // Carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Modal / Formulário de Checkout
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [stepCheckout, setStepCheckout] = useState<1 | 2>(1); // 1 = Dados & Data, 2 = Confirmação / Pagamento

  // Form State
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao" | "entrega">("pix");
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<number>(1);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoCriadoId, setPedidoCriadoId] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  const stripeConfig = useMemo(() => obterConfiguracoesStripeLoja(cleanCode), [cleanCode]);

  // Carrega informações da loja e datas bloqueadas do Supabase / Storage
  useEffect(() => {
    async function loadData() {
      try {
        const { data: estData } = await supabase
          .from("estabelecimentos")
          .select("*")
          .eq("codigo", cleanCode)
          .single();

        if (estData) {
          setStoreInfo({
            nome: estData.nome,
            endereco: estData.endereco || ESTABELECIMENTO_PADRAO.endereco,
            whatsapp: estData.whatsapp || ESTABELECIMENTO_PADRAO.whatsapp || "(11) 99999-9999",
            chavePix: estData.chave_pix || estData.chavePix || "contato@caixadoce.com.br",
            tipoChavePix: estData.tipo_chave_pix || "email",
          });
        }
      } catch {}

      try {
        const { data: bloqData } = await supabase
          .from("datas_bloqueadas")
          .select("*")
          .eq("estabelecimento_codigo", cleanCode);

        if (bloqData && bloqData.length > 0) {
          setDatasBloqueadas(bloqData);
        } else {
          const raw = localStorage.getItem(`caixadoce_datas_bloqueadas_${cleanCode}`);
          if (raw) setDatasBloqueadas(JSON.parse(raw));
        }
      } catch {}
    }

    loadData();
  }, [cleanCode]);

  // Categorias disponíveis
  const categoriasDisponiveis = useMemo(() => {
    const cats = Array.from(new Set(produtos.map((p) => p.categoria)));
    return ["Todos", ...cats];
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    if (categoriaSelecionada === "Todos") return produtos;
    return produtos.filter((p) => p.categoria === categoriaSelecionada);
  }, [produtos, categoriaSelecionada]);

  // Manipulação de Carrinho
  const handleAdicionarAoCarrinho = (prod: ProdutoCardapio) => {
    setCarrinho((prev) => {
      const exist = prev.find((item) => item.produto.id === prod.id);
      if (exist) {
        return prev.map((item) =>
          item.produto.id === prod.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { produto: prod, quantidade: 1 }];
    });
    toast.success(`"${prod.nome}" adicionado ao carrinho!`);
  };

  const handleAlterarQtd = (prodId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.produto.id === prodId) {
            const novaQtd = item.quantidade + delta;
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrinho[]
    );
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

  const totalItensCount = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  }, [carrinho]);

  // Validação de Data Bloqueada
  const isDataBloqueada = useMemo(() => {
    return datasBloqueadas.some((b) => b.data === dataEntrega);
  }, [datasBloqueadas, dataEntrega]);

  const motivoBloqueioAtual = useMemo(() => {
    const match = datasBloqueadas.find((b) => b.data === dataEntrega);
    return match?.motivo || "Agenda Indisponível";
  }, [datasBloqueadas, dataEntrega]);

  // Finalização do Pedido
  const handleFinalizarPedido = async () => {
    if (!clienteNome || !clienteWhatsapp) {
      toast.error("Por favor, informe seu nome e WhatsApp.");
      return;
    }

    if (isDataBloqueada) {
      toast.error(`A data ${dataEntrega} está indisponível para novos pedidos (${motivoBloqueioAtual}).`);
      return;
    }

    if (tipoEntrega === "delivery" && !enderecoEntrega) {
      toast.error("Informe o endereço completo para entrega.");
      return;
    }

    if (metodoPagamento === "cartao") {
      setEnviandoPedido(true);
      try {
        const session = await createStripeSession({
          establishmentCode: cleanCode,
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

        toast.success(`Sessão no cartão gerada! Total: ${feeResult.formattedTotalAmount} (${feeResult.installments}x de ${feeResult.formattedInstallmentValue})`);
        setTimeout(() => {
          window.open(session.checkoutUrl, "_blank");
        }, 800);
      } catch (err) {
        toast.error("Erro ao gerar pagamento no cartão.");
      } finally {
        setEnviandoPedido(false);
      }
      return;
    }

    setEnviandoPedido(true);
    try {
      const itensFormatados = carrinho
        .map((it) => `${it.quantidade}x ${it.produto.nome} (${formatarMoeda(it.produto.preco)})`)
        .join(", ");

      const newId = crypto.randomUUID();

      const novaEncomenda: Encomenda = {
        id: newId,
        estabelecimentoCodigo: cleanCode,
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens: itensFormatados,
        valorTotal: totalCarrinho,
        valorEntrada: metodoPagamento === "pix" ? totalCarrinho : 0,
        statusPagamento: metodoPagamento === "pix" ? "pago_integral" : "pago_na_entrega",
        status: "pendente",
        tipoEntrega,
        enderecoEntrega,
        observacoes,
      };

      // 1. Salva no Supabase
      try {
        await supabase.from("orders").insert([
          {
            id: novaEncomenda.id,
            estabelecimento_codigo: cleanCode,
            cliente_nome: novaEncomenda.clienteNome,
            cliente_whatsapp: novaEncomenda.clienteWhatsapp,
            data_entrega: novaEncomenda.dataEntrega,
            horario_entrega: novaEncomenda.horarioEntrega,
            itens: novaEncomenda.itens,
            valor_total: novaEncomenda.valorTotal,
            valor_entrada: novaEncomenda.valorEntrada,
            status_pagamento: novaEncomenda.statusPagamento,
            status: novaEncomenda.status,
            tipo_entrega: novaEncomenda.tipoEntrega,
            endereco_entrega: novaEncomenda.enderecoEntrega,
            observacoes: novaEncomenda.observacoes,
          },
        ]);
      } catch (err) {
        console.warn("Supabase insert order error:", err);
      }

      // 2. Atualiza cache local
      try {
        const raw = localStorage.getItem(`caixadoce_orders_${cleanCode}`);
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(`caixadoce_orders_${cleanCode}`, JSON.stringify([novaEncomenda, ...list]));
      } catch {}

      setPedidoCriadoId(newId.substring(0, 6).toUpperCase());
      setStepCheckout(2);
      setCarrinho([]);
      toast.success("Pedido realizado com sucesso!");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const handleCopiarPix = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(storeInfo.chavePix);
      setPixCopiado(true);
      toast.success("Chave Pix copiada!");
      setTimeout(() => setPixCopiado(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header da Confeitaria */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <div className="border-l border-border pl-3">
              <h1 className="font-extrabold text-sm sm:text-base leading-tight text-foreground">
                {storeInfo.nome}
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> {storeInfo.endereco}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Flutuante do Carrinho */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="relative font-bold shadow-md rounded-full px-4 h-9">
                  <ShoppingBag className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Ver Carrinho</span>
                  {totalItensCount > 0 && (
                    <span className="ml-1.5 bg-white text-primary text-xs px-2 py-0.5 rounded-full font-black">
                      {totalItensCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>

              <SheetContent className="flex flex-col justify-between w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" /> Seu Pedido
                  </SheetTitle>
                  <SheetDescription>
                    Revise os doces e bolos adicionados ao seu carrinho
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 divide-y divide-border/60">
                  {carrinho.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Seu carrinho está vazio. Escolha seus doces favoritos no cardápio!
                    </div>
                  ) : (
                    carrinho.map((item) => (
                      <div key={item.produto.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground truncate">{item.produto.nome}</p>
                          <p className="text-xs text-muted-foreground">{formatarMoeda(item.produto.preco)} cada</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarQtd(item.produto.id, -1)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantidade}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarQtd(item.produto.id, 1)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="text-right w-20">
                          <p className="font-extrabold text-sm text-foreground">
                            {formatarMoeda(item.produto.preco * item.quantidade)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <SheetFooter className="border-t border-border pt-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-muted-foreground">Subtotal:</span>
                    <span className="text-xl font-black text-foreground">{formatarMoeda(totalCarrinho)}</span>
                  </div>

                  <Button
                    disabled={carrinho.length === 0}
                    onClick={() => {
                      setCartOpen(false);
                      setStepCheckout(1);
                      setCheckoutModalOpen(true);
                    }}
                    className="w-full font-bold shadow-md py-5 text-sm"
                  >
                    Prosseguir para Agendamento
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero / Boas-vindas */}
      <section className="bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-background py-8 px-4 text-center border-b border-border/50">
        <div className="mx-auto max-w-2xl space-y-2">
          <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/30 mb-1">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Encomendas Abertas
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Cardápio &amp; Agendamento Online
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Escolha os itens, selecione a melhor data para retirada ou entrega e receba doces frescos feitos com carinho.
          </p>
        </div>
      </section>

      {/* Filtro de Categorias */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-md py-3 border-b border-border">
        <div className="mx-auto max-w-5xl px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categoriasDisponiveis.map((cat) => (
            <Button
              key={cat}
              variant={categoriaSelecionada === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoriaSelecionada(cat)}
              className="h-8 text-xs font-semibold rounded-full shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtosFiltrados.map((prod) => (
            <Card key={prod.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={prod.fotoUrl}
                  alt={prod.nome}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {prod.destaque && (
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                    DESTAQUE
                  </span>
                )}
                {prod.tempoPreparoHoras && (
                  <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Antecedência: {prod.tempoPreparoHoras}h
                  </span>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {prod.categoria}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground leading-snug">
                  {prod.nome}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {prod.descricao}
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-2 flex items-center justify-between border-t border-border/60">
                <span className="text-lg font-black text-foreground">
                  {formatarMoeda(prod.preco)}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleAdicionarAoCarrinho(prod)}
                  className="h-8 font-semibold rounded-lg shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: CHECKOUT & AGENDAMENTO DO CLIENTE */}
      {/* ========================================================================= */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {stepCheckout === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" /> Agendamento e Dados de Entrega
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Escolha o dia, horário e informe seus dados para prepararmos seu pedido.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* 1. Seleção de Data e Horário */}
                <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" /> 1. Data e Horário Desejado
                  </h4>

                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="chk-data" className="text-xs">Data da Entrega / Retirada *</Label>
                        <Input
                          id="chk-data"
                          type="date"
                          value={dataEntrega}
                          min={dataMinimaStr}
                          onChange={(e) => handleDataEntregaChange(e.target.value)}
                          className={`h-8 text-xs font-bold font-mono ${isDataBloqueada ? "border-rose-500 text-rose-600" : ""}`}
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
                          className="h-8 text-xs font-mono font-bold"
                          required
                        />
                      </div>
                    </div>
                    {/* Mensagem Informativa de Regras de Encomenda */}
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 p-1.5 rounded-md border border-purple-500/20 font-medium flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                      <span>
                        {regras.antecedenciaMinimaDias === 0
                          ? `Aceitamos encomendas no mesmo dia. Expediente: ${regras.horarioAbertura} às ${regras.horarioFechamento}.`
                          : `Encomendas com no mínimo ${regras.antecedenciaMinimaDias} dia(s) de antecedência. Expediente: ${regras.horarioAbertura} às ${regras.horarioFechamento}.`}
                      </span>
                    </p>
                  </div>

                  {/* Alerta de Data Bloqueada */}
                  {isDataBloqueada && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Data Indisponível:</strong> {motivoBloqueioAtual}. Por favor, selecione outro dia.
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Dados Pessoais do Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="chk-nome" className="text-xs">Seu Nome Completo *</Label>
                    <Input
                      id="chk-nome"
                      placeholder="Ex: Beatriz Lima"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chk-whats" className="text-xs">Seu WhatsApp (com DDD) *</Label>
                    <Input
                      id="chk-whats"
                      placeholder="(11) 98765-4321"
                      value={clienteWhatsapp}
                      onChange={(e) => setClienteWhatsapp(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* 3. Modalidade de Entrega */}
                <div className="space-y-2">
                  <Label className="text-xs">Como deseja receber?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={tipoEntrega === "retirada" ? "default" : "outline"}
                      onClick={() => setTipoEntrega("retirada")}
                      className="h-8 text-xs font-semibold"
                    >
                      <Store className="w-3.5 h-3.5 mr-1.5" /> Retirar no Balcão
                    </Button>
                    <Button
                      type="button"
                      variant={tipoEntrega === "delivery" ? "default" : "outline"}
                      onClick={() => setTipoEntrega("delivery")}
                      className="h-8 text-xs font-semibold"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1.5" /> Entrega / Delivery
                    </Button>
                  </div>
                </div>

                {tipoEntrega === "delivery" && (
                  <div className="space-y-1">
                    <Label htmlFor="chk-end" className="text-xs">Endereço Completo para Entrega *</Label>
                    <Input
                      id="chk-end"
                      placeholder="Rua, Número, Bairro, Apto/Bloco"
                      value={enderecoEntrega}
                      onChange={(e) => setEnderecoEntrega(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                )}

                {/* 4. Forma de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Forma de Pagamento</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={metodoPagamento === "pix" ? "default" : "outline"}
                      onClick={() => setMetodoPagamento("pix")}
                      className="h-8 text-[11px] font-semibold px-1"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Pix Direto
                    </Button>
                    <Button
                      type="button"
                      variant={metodoPagamento === "cartao" ? "default" : "outline"}
                      onClick={() => setMetodoPagamento("cartao")}
                      className="h-8 text-[11px] font-semibold px-1"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1 text-primary" /> Cartão (Stripe)
                    </Button>
                    <Button
                      type="button"
                      variant={metodoPagamento === "entrega" ? "default" : "outline"}
                      onClick={() => setMetodoPagamento("entrega")}
                      className="h-8 text-[11px] font-semibold px-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Na Entrega
                    </Button>
                  </div>

                  {/* Exibição e Seleção de Parcelas quando escolhe Cartão */}
                  {metodoPagamento === "cartao" && (
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <Label htmlFor="sel-parcelas-agendar" className="text-xs font-semibold">
                          Número de Parcelas no Cartão
                        </Label>
                        <Select
                          value={String(parcelasSelecionadas)}
                          onValueChange={(val) => setParcelasSelecionadas(Number(val))}
                        >
                          <SelectTrigger id="sel-parcelas-agendar" className="h-8 text-xs font-semibold bg-background">
                            <SelectValue placeholder="Selecione as parcelas" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {installmentOptions.map((opt) => (
                              <SelectItem key={opt.installments} value={String(opt.installments)} className="text-xs font-medium">
                                {opt.formattedOptionText}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* RESUMO DE PAGAMENTO REATIVO */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs animate-fade-in">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal:</span>
                          <span className="font-mono font-semibold">{feeResult.formattedSubtotal}</span>
                        </div>
                        {feeResult.feeAmount > 0 ? (
                          <div className="flex justify-between text-amber-700 dark:text-amber-300 font-semibold">
                            <span>Taxa de Conveniência ({feeResult.installments}x):</span>
                            <span className="font-mono">{feeResult.formattedFeeAmount}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Taxa de Conveniência:</span>
                            <span>Isento (absorvido pela loja)</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-primary/20 text-xs font-extrabold text-foreground">
                          <span>Total a Pagar:</span>
                          <span className="font-mono text-primary text-sm">{feeResult.formattedTotalAmount}</span>
                        </div>
                        <p className="text-[11px] font-extrabold text-primary text-right">
                          ou {feeResult.installments}x de {feeResult.formattedInstallmentValue}
                        </p>
                        <p className="text-[10px] text-muted-foreground italic">
                          💳 Taxa de processamento da operadora de cartão.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <Label htmlFor="chk-obs" className="text-xs">Observações do Pedido (Opcional)</Label>
                  <Textarea
                    id="chk-obs"
                    rows={2}
                    placeholder="Ex: Nome no topo do bolo, restrições, preferências..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">Total a Pagar:</p>
                  <p className="text-base font-black text-primary font-mono">{feeResult.formattedTotalAmount}</p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCheckoutModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleFinalizarPedido}
                    disabled={enviandoPedido || isDataBloqueada || !clienteNome || !clienteWhatsapp}
                    size="sm"
                    className={`font-bold shadow-md ${
                      metodoPagamento === "cartao"
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {metodoPagamento === "cartao" ? (
                      <>
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        {enviandoPedido ? "Gerando..." : `Pagar ${feeResult.installments}x de ${feeResult.formattedInstallmentValue}`}
                      </>
                    ) : (
                      <>{enviandoPedido ? "Confirmando..." : "Finalizar Pedido"}</>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            /* PASSO 2: SUCESSO & PAGAMENTO PIX */
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-foreground">Pedido Agendado com Sucesso!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Código do Pedido: <strong className="font-mono text-foreground">#{pedidoCriadoId}</strong>
                </p>
              </div>

              {/* Card Pix */}
              {metodoPagamento === "pix" && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                    Pagamento via Pix ({formatarMoeda(totalCarrinho)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Faça o Pix para a chave abaixo para garantir seu agendamento:
                  </p>
                  <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border">
                    <span className="font-mono text-xs font-bold text-foreground flex-1 truncate">
                      {storeInfo.chavePix}
                    </span>
                    <Button size="sm" variant="outline" onClick={handleCopiarPix} className="h-7 text-xs px-2">
                      {pixCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Botão de Enviar WhatsApp */}
              <div className="pt-2">
                <a
                  href={formatarWhatsappLink(
                    storeInfo.whatsapp,
                    `Olá! Acabei de fazer o pedido #${pedidoCriadoId} no valor de ${formatarMoeda(totalCarrinho)} para o dia ${dataEntrega.split("-").reverse().join("/")} às ${horarioEntrega}. Nome: ${clienteNome}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar Comprovante / Mensagem no WhatsApp
                  </Button>
                </a>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCheckoutModalOpen(false)}
                className="text-xs mt-2"
              >
                Concluir e Voltar ao Cardápio
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
