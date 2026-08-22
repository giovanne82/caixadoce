import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  MapPin,
  Truck,
  CheckCircle2,
  Trash2,
  Share2,
  QrCode,
  CreditCard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatarMoeda,
  formatarWhatsappLink,
  aplicarMascaraTelefone,
  obterProdutosCardapio,
  obterRegrasAgendamento,
  calcularRegrasAgendamentoCarrinho,
  validarDataEntrega,
  validarHorarioEntrega,
  type ProdutoCardapio,
} from "@/lib/caixadoce-data";
import {
  obterConfiguracoesStripeLoja,
  createStripeSession,
} from "@/lib/stripe-connect-service";
import {
  calculateDynamicTotal,
  getInstallmentOptions,
} from "@/lib/stripeFees";
import { toast } from "sonner";

export const Route = createFileRoute("/cardapio/$storeCode")({
  head: ({ params }) => ({
    meta: [
      { title: `Cardápio Digital — ${params.storeCode}` },
      { name: "description", content: "Faça sua encomenda online com os melhores bolos, doces e sobremesas artesanais." },
    ],
  }),
  component: CardapioLojaView,
});

interface ItemCarrinho {
  produto: ProdutoCardapio;
  quantidade: number;
}

function CardapioLojaView() {
  const { storeCode } = Route.useParams();
  const code = (storeCode || "CD-1001").toUpperCase();

  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todas");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);

  // Formulário do Cliente no Checkout
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

  const stripeConfig = useMemo(() => obterConfiguracoesStripeLoja(code), [code]);
  const regrasBase = useMemo(() => obterRegrasAgendamento(code), [code]);
  const regras = useMemo(
    () => calcularRegrasAgendamentoCarrinho(regrasBase, carrinho),
    [regrasBase, carrinho]
  );

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

  // Finalizar Encomenda (Pix no WhatsApp ou Cartão na Stripe)
  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome || !clienteWhatsapp || !dataEntrega || carrinho.length === 0) {
      toast.error("Preencha seu nome, WhatsApp e data para entrega.");
      return;
    }

    if (metodoPagamento === "cartao") {
      setProcessandoPagamento(true);
      try {
        const session = await createStripeSession({
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

        toast.success(`Sessão de pagamento no cartão criada! Total: ${feeResult.formattedTotalAmount} (${feeResult.installments}x de ${feeResult.formattedInstallmentValue})`);
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

    const msg = `🎂 *NOVO PEDIDO ONLINE - CARDÁPIO DIGITAL* 🎂

Olá! Acabei de montar meu pedido pelo cardápio digital (Código: *${code}*):

👤 *Cliente:* ${clienteNome}
📱 *WhatsApp:* ${clienteWhatsapp}

📅 *Data Prevista:* ${dataFormatada} às ${horarioEntrega}
📍 *Modalidade:* ${modalidade}
💳 *Pagamento:* Pix Direto (Sem taxa)
${observacoes ? `📝 *Observações:* ${observacoes}\n` : ""}
🛒 *Itens do Pedido:*
${resumoItens}

💰 *Valor Total do Pedido:* ${formatarMoeda(totalCarrinho)}

Poderia confirmar a disponibilidade e a chave Pix para o sinal? Muito obrigado(a)!`;

    const url = `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`;
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
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
            <div className="border-l border-[#8E7CC3]/30 pl-3">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#2E1A47]">
                Confeitaria Artesanal
              </h1>
              <span className="inline-block bg-[#7C3AED]/10 text-[#6D28D9] border border-[#7C3AED]/25 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                Código Loja: {code}
              </span>
            </div>
          </div>

          {/* Botão do Carrinho Flutuante 'Meu Pedido' no Topo (Lilás da Marca #8E7CC3) */}
          <Button
            onClick={() => setCartOpen(true)}
            className="font-extrabold relative bg-[#8E7CC3] hover:bg-[#7C69B3] text-white text-xs shadow-md rounded-2xl py-2 px-3.5"
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
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
        <div className="text-center space-y-2 py-2">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            Cardápio de Bolos &amp; Doces Especiais
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.
          </p>
        </div>

        {/* Pílulas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 justify-start sm:justify-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {produtosFiltrados.map((prod) => (
            <Card
              key={prod.id}
              className="overflow-hidden border-border/80 hover:border-primary/50 transition-all hover:shadow-lg flex flex-col justify-between bg-card group"
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <img
                    src={prod.fotoUrl}
                    alt={prod.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                </div>

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-extrabold text-foreground leading-tight">
                      {prod.nome}
                    </CardTitle>
                    <span className="text-lg font-black text-primary font-mono shrink-0">
                      {formatarMoeda(prod.preco)}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-3 mt-1.5">
                    {prod.descricao}
                  </CardDescription>
                </CardHeader>
              </div>

              <CardFooter className="p-4 pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Antecedência: ~{prod.tempoPreparoHoras || 24}h
                </span>

                <Button
                  size="sm"
                  onClick={() => handleAdicionarAoCarrinho(prod)}
                  className="font-bold text-xs shadow-xs h-8 px-3.5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Pedir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

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

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={metodoPagamento === "pix" ? "default" : "outline"}
                        onClick={() => setMetodoPagamento("pix")}
                        className="h-9 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                        Pix Direto (Sem taxa)
                      </Button>

                      <Button
                        type="button"
                        variant={metodoPagamento === "cartao" ? "default" : "outline"}
                        onClick={() => setMetodoPagamento("cartao")}
                        className="h-9 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        Cartão (Stripe)
                      </Button>
                    </div>

                    {/* Exibição e Seleção de Parcelas quando escolhe Cartão */}
                    {metodoPagamento === "cartao" && (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <Label htmlFor="sel-parcelas" className="text-xs font-semibold">
                            Número de Parcelas no Cartão
                          </Label>
                          <Select
                            value={String(parcelasSelecionadas)}
                            onValueChange={(val) => setParcelasSelecionadas(Number(val))}
                          >
                            <SelectTrigger id="sel-parcelas" className="h-9 text-xs font-semibold bg-background">
                              <SelectValue placeholder="Selecione as parcelas" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {installmentOptions.map((opt) => (
                                <SelectItem key={opt.installments} value={String(opt.installments)} className="text-xs font-medium">
                                  {opt.formattedOptionText}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* RESUMO DE PAGAMENTO REATIVO */}
                        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs animate-fade-in">
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
                          <div className="flex justify-between pt-2 border-t border-primary/20 text-sm font-extrabold text-foreground">
                            <span>Total a Pagar:</span>
                            <span className="font-mono text-primary">{feeResult.formattedTotalAmount}</span>
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
