import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Building2,
  Cookie,
  UtensilsCrossed,
  User,
  PieChart,
  Layers,
  CreditCard,
  Link as LinkIcon,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Edit2,
} from "lucide-react";
import {
  formatarMoeda,
  CATEGORIAS_PADRAO,
  type TransacaoFinanceira,
  type TransacaoTipo,
  type MetodoPagamento,
  type StatusTransacao,
  type DespesaNotaFiscal,
  type Encomenda,
} from "@/lib/caixadoce-data";
import { calculateDynamicTotal } from "@/lib/stripeFees";
import {
  obterConfiguracoesStripeLoja,
  salvarConfiguracoesStripeLoja,
  createStripeConnectAccount,
  type StripeConnectAccount,
} from "@/lib/stripe-connect-service";
import { toast } from "sonner";

interface FinanceiroTabProps {
  transacoes: TransacaoFinanceira[];
  despesas?: DespesaNotaFiscal[];
  encomendas?: Encomenda[];
  establishmentCode?: string;
  onAdicionarTransacao: (transacao: Omit<TransacaoFinanceira, "id">) => Promise<void>;
  onRemoverTransacao: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string, status: StatusTransacao) => Promise<void>;
  onEditarDespesa?: (id: string, dados: Partial<DespesaNotaFiscal>) => Promise<void>;
  onReatribuirEstabelecimento?: (nomeAntigo: string, novoNome: string) => Promise<void>;
}

export function FinanceiroTab({
  transacoes,
  despesas = [],
  encomendas = [],
  establishmentCode = "CD-1001",
  onAdicionarTransacao,
  onRemoverTransacao,
  onAtualizarStatus,
  onEditarDespesa,
  onReatribuirEstabelecimento,
}: FinanceiroTabProps) {
  const code = establishmentCode || "CD-1001";

  // Busca de Encomendas no Supabase para Agregação no Financeiro
  const [encomendasBanco, setEncomendasBanco] = useState<any[]>([]);

  useEffect(() => {
    let cancelado = false;
    async function carregarEncomendasBanco() {
      try {
        const { data, error } = await supabase
          .from("encomendas")
          .select("*")
          .or(`estabelecimento_codigo.eq.${code},codigo.eq.${code},store_id.eq.${code}`);

        if (!cancelado && !error && data) {
          setEncomendasBanco(data);
        }
      } catch (err) {
        console.error("Erro ao carregar encomendas no financeiro:", err);
      }
    }
    carregarEncomendasBanco();
    return () => {
      cancelado = true;
    };
  }, [code]);

  // Stripe Connect Config State
  const [stripeConfig, setStripeConfig] = useState<StripeConnectAccount>(() =>
    obterConfiguracoesStripeLoja(code)
  );
  const [conectandoStripe, setConectandoStripe] = useState(false);

  const handleConectarStripe = async () => {
    setConectandoStripe(true);
    try {
      const res = await createStripeConnectAccount(code);
      setStripeConfig(obterConfiguracoesStripeLoja(code));
      toast.success(`Conta Stripe Connect vinculada com sucesso! (${res.mockAccountId}) 🎉`);
    } catch {
      toast.error("Erro ao conectar conta Stripe.");
    } finally {
      setConectandoStripe(false);
    }
  };

  const handleToggleRepassarTaxa = (checked: boolean) => {
    const atualizada = salvarConfiguracoesStripeLoja(code, { repassarTaxaStripe: checked });
    setStripeConfig(atualizada);
    if (checked) {
      toast.success("Repasse de taxa ativado! Seu cliente pagará o acréscimo do cartão.");
    } else {
      toast.info("Repasse de taxa desativado. Sua loja absorverá as taxas do cartão.");
    }
  };

  // Form State Cobrança Avulsa & Trava Educativa Stripe
  const [modalCobrancaOpen, setModalCobrancaOpen] = useState(false);
  const [modalEducativoStripeOpen, setModalEducativoStripeOpen] = useState(false);
  const [stepCobranca, setStepCobranca] = useState<1 | 2>(1);
  const [cobrancaDescricao, setCobrancaDescricao] = useState("");
  const [cobrancaValorLiquido, setCobrancaValorLiquido] = useState("");
  const [cobrancaLinkGerado, setCobrancaLinkGerado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);

  const handleAbrirModalCobranca = () => {
    if (stripeConfig.status !== "connected") {
      setModalEducativoStripeOpen(true);
    } else {
      setModalCobrancaOpen(true);
    }
  };

  const valCobrancaLiquido = parseFloat(cobrancaValorLiquido) || 0;
  const previewCobranca = useMemo(() => {
    return calculateDynamicTotal(valCobrancaLiquido, 1, true);
  }, [valCobrancaLiquido]);

  const handleGerarLinkCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobrancaDescricao || valCobrancaLiquido <= 0) {
      toast.error("Informe a descrição e o valor líquido da cobrança.");
      return;
    }

    setGerandoLink(true);
    try {
      const totalAmount = previewCobranca.totalAmount;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: cobrancaDescricao,
          amount: totalAmount,
          valorLiquido: valCobrancaLiquido,
          establishmentCode: code,
        }),
      });

      const data = await res.json();

      if (!res.ok || (!data.shortPayUrl && !data.url)) {
        throw new Error(data.error || "Erro ao comunicar com a API do Stripe");
      }

      const shortUrl = data.shortPayUrl || `${window.location.origin}/pagar/${data.cobrancaId || data.id}`;
      setCobrancaLinkGerado(shortUrl);
      setStepCobranca(2);
      toast.success("Link curto de cobrança gerado com sucesso! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar link de pagamento.");
    } finally {
      setGerandoLink(false);
    }
  };

  const handleCopiarLink = () => {
    if (cobrancaLinkGerado && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cobrancaLinkGerado);
      setLinkCopiado(true);
      toast.success("Link curto de cobrança copiado!");
      setTimeout(() => setLinkCopiado(false), 3000);
    }
  };

  const handleEnviarWhatsapp = () => {
    if (!cobrancaLinkGerado || !cobrancaDescricao) return;
    const msg = `Olá! Aqui está o seu link de pagamento referente a "${cobrancaDescricao}": ${cobrancaLinkGerado}`;
    const linkWa = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(linkWa, "_blank");
    toast.success("Mensagem com o link curto aberta no WhatsApp!");
  };

  const handleFecharModalCobranca = () => {
    setModalCobrancaOpen(false);
    setTimeout(() => {
      setStepCobranca(1);
      setCobrancaDescricao("");
      setCobrancaValorLiquido("");
      setCobrancaLinkGerado(null);
      setLinkCopiado(false);
    }, 200);
  };

  const [modalNovaTransacao, setModalNovaTransacao] = useState(false);

  // Modal State de Reatribuição / Mesclagem de Estabelecimento
  const [modalReatribuirOpen, setModalReatribuirOpen] = useState(false);
  const [reatribuirFornecedorOrigem, setReatribuirFornecedorOrigem] = useState("");
  const [tipoDestino, setTipoDestino] = useState<"existente" | "novo">("existente");
  const [fornecedorDestinoSelecionado, setFornecedorDestinoSelecionado] = useState("");
  const [fornecedorDestinoNovoNome, setFornecedorDestinoNovoNome] = useState("");
  const [processandoReatribuicao, setProcessandoReatribuicao] = useState(false);

  const listaFornecedoresExistentes = useMemo(() => {
    const nomes = new Set<string>();
    despesas.forEach((d) => {
      if (d.fornecedorNome && d.fornecedorNome !== reatribuirFornecedorOrigem) {
        nomes.add(d.fornecedorNome);
      }
    });
    return Array.from(nomes).sort();
  }, [despesas, reatribuirFornecedorOrigem]);

  const handleAbrirReatribuir = (nomeOrigem: string) => {
    setReatribuirFornecedorOrigem(nomeOrigem);
    setTipoDestino("existente");
    const outros = despesas.filter((d) => d.fornecedorNome !== nomeOrigem).map((d) => d.fornecedorNome);
    setFornecedorDestinoSelecionado(outros[0] || "");
    setFornecedorDestinoNovoNome("");
    setModalReatribuirOpen(true);
  };

  const handleConfirmarReatribuicao = async () => {
    const destinoFinal = tipoDestino === "existente" ? fornecedorDestinoSelecionado : fornecedorDestinoNovoNome.trim();
    if (!destinoFinal) {
      toast.error("Informe ou selecione o estabelecimento de destino.");
      return;
    }
    if (destinoFinal === reatribuirFornecedorOrigem) {
      toast.error("O estabelecimento de destino deve ser diferente do original.");
      return;
    }

    setProcessandoReatribuicao(true);
    try {
      if (onReatribuirEstabelecimento) {
        await onReatribuirEstabelecimento(reatribuirFornecedorOrigem, destinoFinal);
      }
      setModalReatribuirOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao reatribuir: ${e.message}`);
    } finally {
      setProcessandoReatribuicao(false);
    }
  };

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusTransacao>("todos");
  const [lojaSelecionadaCard, setLojaSelecionadaCard] = useState<string | null>(null);

  // Form State Lançamento
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<TransacaoTipo>("receita");
  const [categoria, setCategoria] = useState(CATEGORIAS_PADRAO.receitas[0]);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>("pix");
  const [status, setStatus] = useState<StatusTransacao>("concluida");
  const [clienteOuFornecedor, setClienteOuFornecedor] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Métricas Globais de Compras & Despesas
  const metricasDespesas = useMemo(() => {
    let total = 0;
    let producao = 0;
    let utensilios = 0;
    let consumoProprio = 0;

    for (const d of despesas) {
      total += d.valorTotal;
      producao += d.valorProducao || 0;
      utensilios += d.valorUtensilios || 0;
      consumoProprio += d.valorConsumoProprio || 0;
    }

    return { total, producao, utensilios, consumoProprio };
  }, [despesas]);

  // Agrupamento de Despesas por Estabelecimento
  const agrupamentoEstabelecimentos = useMemo(() => {
    const mapa: Record<string, { total: number; producao: number; utensilios: number; notas: DespesaNotaFiscal[] }> = {};

    for (const d of despesas) {
      const nome = d.fornecedorNome || "Outros Fornecedores";
      if (!mapa[nome]) {
        mapa[nome] = { total: 0, producao: 0, utensilios: 0, notas: [] };
      }
      mapa[nome].total += d.valorTotal;
      mapa[nome].producao += d.valorProducao || 0;
      mapa[nome].utensilios += d.valorUtensilios || 0;
      mapa[nome].notas.push(d);
    }

    return Object.entries(mapa).map(([nome, dados]) => ({
      nome,
      total: dados.total,
      producao: dados.producao,
      utensilios: dados.utensilios,
      qtdNotas: dados.notas.length,
      percentual: metricasDespesas.total > 0 ? ((dados.total / metricasDespesas.total) * 100).toFixed(1) : "0",
    })).sort((a, b) => b.total - a.total);
  }, [despesas, metricasDespesas.total]);

  const transacoesFiltradas = transacoes.filter((t) => {
    const matchBusca =
      !busca ||
      t.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      t.categoria.toLowerCase().includes(busca.toLowerCase()) ||
      (t.clienteOuFornecedor && t.clienteOuFornecedor.toLowerCase().includes(busca.toLowerCase()));

    const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
    const matchStatus = filtroStatus === "todos" || t.status === filtroStatus;

    return matchBusca && matchTipo && matchStatus;
  });

  // Agregação de Encomendas (Combinando prop e Supabase sem duplicatas)
  const todasEncomendas = useMemo(() => {
    const mapa = new Map<string, any>();

    if (Array.isArray(encomendasBanco)) {
      for (const item of encomendasBanco) {
        if (item && item.id) mapa.set(item.id, item);
      }
    }

    if (Array.isArray(encomendas)) {
      for (const item of encomendas) {
        if (item && item.id) mapa.set(item.id, item);
      }
    }

    return Array.from(mapa.values());
  }, [encomendasBanco, encomendas]);

  const totalReceitasEncomendas = useMemo(() => {
    if (!Array.isArray(todasEncomendas) || todasEncomendas.length === 0) return 0;

    let soma = 0;
    for (const enc of todasEncomendas) {
      if (!enc) continue;

      const historico = Array.isArray(enc.historicoPagamentos)
        ? enc.historicoPagamentos
        : Array.isArray(enc.paymentsHistory)
        ? enc.paymentsHistory
        : Array.isArray(enc.historico_pagamentos)
        ? enc.historico_pagamentos
        : Array.isArray(enc.payments_history)
        ? enc.payments_history
        : Array.isArray(enc.payments)
        ? enc.payments
        : [];

      if (historico.length > 0) {
        for (const p of historico) {
          if (!p) continue;
          const valNum = Number(p.valor || p.amount || p.val || 0);
          if (!isNaN(valNum) && valNum > 0) {
            soma += valNum;
          }
        }
      } else {
        const entrada = Number(enc.valorEntrada || enc.valor_entrada || enc.down_payment || 0);
        if (!isNaN(entrada) && entrada > 0) {
          soma += entrada;
        } else {
          const statusPag = String(enc.statusPagamento || enc.payment_status || "").toLowerCase();
          if (statusPag === "pago_integral" || statusPag === "pago") {
            const totalEnc = Number(enc.valorTotal || enc.valor_total || enc.total_price || enc.total_amount || 0);
            if (!isNaN(totalEnc) && totalEnc > 0) {
              soma += totalEnc;
            }
          }
        }
      }
    }
    return soma;
  }, [todasEncomendas]);

  const totalReceitasAvulsas = transacoesFiltradas
    .filter((t) => t.tipo === "receita" && t.status === "concluida")
    .reduce((acc, t) => acc + t.valor, 0);

  const totalReceitas = totalReceitasAvulsas + totalReceitasEncomendas;

  const totalDespesas = transacoesFiltradas
    .filter((t) => t.tipo === "despesa" && t.status === "concluida")
    .reduce((acc, t) => acc + t.valor, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valNum = parseFloat(valor.replace(",", "."));
    if (!descricao || isNaN(valNum) || valNum <= 0) {
      toast.error("Preencha descrição e um valor válido.");
      return;
    }

    setSalvando(true);
    try {
      await onAdicionarTransacao({
        descricao,
        valor: valNum,
        tipo,
        categoria,
        data: new Date().toLocaleDateString("pt-BR"),
        metodoPagamento,
        status,
        clienteOuFornecedor,
        origem: "Manual",
      });

      setModalNovaTransacao(false);
      setDescricao("");
      setValor("");
      setClienteOuFornecedor("");
      toast.success("Lançamento adicionado com sucesso!");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">Gestão Financeira &amp; Caixa</h2>
          <p className="text-sm text-muted-foreground">
            Controle de entradas, saídas, emissão de comprovantes e fluxo de vendas.
          </p>
        </div>
        <div>
          <Button onClick={() => setModalNovaTransacao(true)} className="font-semibold shadow-md">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO: RECEBIMENTOS E INTEGRAÇÕES (COBRANÇA AVULSA & STRIPE CONNECT) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            Recebimentos &amp; Integrações <CreditCard className="w-4 h-4 text-primary" />
          </h3>
          <span className="text-xs text-muted-foreground">
            Formas de cobrança e gateways de pagamento
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARD 1: COBRANÇA AVULSA / LINK DE PAGAMENTO (POSICIONADO À ESQUERDA) */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" /> Cobrança Avulsa / Link
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-primary/30 font-bold">
                  Link Direto
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
                Crie um link de pagamento com o valor que desejar e permita que seu cliente pague no cartão de crédito na quantidade de parcelas que ele preferir ou via Pix.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <Button
                type="button"
                onClick={handleAbrirModalCobranca}
                size="lg"
                className="w-full font-black shadow-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 h-10 text-xs"
              >
                <LinkIcon className="w-4 h-4" /> Gerar Link de Cobrança
              </Button>
            </CardContent>
          </Card>

          {/* CARD 2: PAGAMENTOS ONLINE (CARTÃO VIA STRIPE CONNECT) (POSICIONADO À DIREITA) */}
          <Card className="border-border shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Pagamentos Online (Stripe)
                </CardTitle>
                {stripeConfig.status === "connected" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    🟢 Stripe Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                    🟡 Não Conectado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs space-y-1">
                <span>Receba pagamentos automaticamente dos clientes que comprarem pelo seu Cardápio Digital.</span>
                <span className="block text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border mt-1.5 leading-relaxed font-medium">
                  Para habilitar o pagamento por cartão no seu cardápio, conecte sua conta bancária. O CaixaDoce utiliza a Stripe, a plataforma de pagamentos online mais segura e utilizada no mundo todo. É 100% confiável e garante que o dinheiro das suas encomendas caia direto na sua conta, sem intermediários e com proteção total contra fraudes.
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-foreground">
                    {stripeConfig.status === "connected" ? "Conta Stripe Vinculada" : "Conectar Conta"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {stripeConfig.status === "connected" ? stripeConfig.accountId : "Habilite vendas no seu Cardápio Digital"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={stripeConfig.status === "connected" ? "outline" : "default"}
                  onClick={handleConectarStripe}
                  disabled={conectandoStripe}
                  className="font-bold text-xs shrink-0"
                >
                  {conectandoStripe ? "Conectando..." : stripeConfig.status === "connected" ? "Reconectar" : "Conectar Stripe"}
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sw-repassar" className="text-xs font-extrabold text-foreground cursor-pointer">
                    Repassar taxa ao cliente
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    O cliente paga o acréscimo da taxa do cartão.
                  </p>
                </div>
                <Switch
                  id="sw-repassar"
                  checked={stripeConfig.repassarTaxaStripe}
                  onCheckedChange={handleToggleRepassarTaxa}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-border shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, categoria..."
              className="pl-9 h-9 text-xs"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo de Movimentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="receita">Apenas Receitas (Entradas)</SelectItem>
                <SelectItem value="despesa">Apenas Despesas (Saídas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status do Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="concluida">Confirmados / Concluídos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Entrada (Vendas)</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatarMoeda(totalReceitas)}</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Saída (Gastos)</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{formatarMoeda(totalDespesas)}</p>
        </div>
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Saldo Resultante</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{formatarMoeda(totalReceitas - totalDespesas)}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma transação encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              transacoesFiltradas.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.data}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-foreground">{t.descricao}</p>
                    {t.clienteOuFornecedor && (
                      <p className="text-[11px] text-muted-foreground">{t.clienteOuFornecedor}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.origem === "Stripe" || t.categoria.includes("Stripe") || t.descricao.includes("Stripe") ? (
                      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-extrabold flex items-center gap-1 w-fit">
                        <CreditCard className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Stripe (Auto)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border font-semibold flex items-center gap-1 w-fit">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {t.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase font-medium text-muted-foreground">
                    {t.metodoPagamento.replace("_", " ")}
                  </TableCell>
                  <TableCell className={`font-bold text-sm ${t.tipo === "receita" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.tipo === "receita" ? "+" : "-"} {formatarMoeda(t.valor)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() =>
                        onAtualizarStatus(t.id, t.status === "concluida" ? "pendente" : "concluida")
                      }
                      title="Clique para alternar status"
                      className="cursor-pointer"
                    >
                      <Badge
                        variant={t.status === "concluida" ? "default" : "secondary"}
                        className={`text-[11px] ${
                          t.status === "concluida"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        {t.status === "concluida" ? "Concluído" : "Pendente"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o lançamento "${t.descricao}" (${formatarMoeda(t.valor)})?`)) {
                          onRemoverTransacao(t.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 transition-colors"
                      title="Excluir lançamento financeiro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ========================================================================= */}
      {/* BLOCO: GESTÃO DE DESPESAS & COMPRAS (MÉTRICAS E AGRUPAMENTO POR LOJA) */}
      {/* ========================================================================= */}
      <div className="space-y-6 pt-6 border-t border-border/80">
        <div>
          <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            Análise de Despesas &amp; Compras <Layers className="w-5 h-5 text-primary" />
          </h3>
          <p className="text-xs text-muted-foreground">
            Métricas de custos categorizados (Produção, Utensílios, Consumo Pessoal) e consolidação por estabelecimento.
          </p>
        </div>

        {/* CARDS DE TOTAIS POR CATEGORIA DE DESPESA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">🍫 Custo Produção</CardTitle>
              <Cookie className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-amber-600">
                {formatarMoeda(metricasDespesas.producao)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Insumos e doces (custo direto)</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">🥣 Utensílios</CardTitle>
              <UtensilsCrossed className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-blue-600">
                {formatarMoeda(metricasDespesas.utensilios)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Formas, espátulas e materiais</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">🛒 Consumo Pessoal</CardTitle>
              <User className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-rose-600">
                {formatarMoeda(metricasDespesas.consumoProprio)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Mercado particular da casa</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/40 bg-card shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-primary uppercase">💰 Total de Compras</CardTitle>
              <PieChart className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">
                {formatarMoeda(metricasDespesas.total)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{despesas.length} notas digitalizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* DESPESAS AGRUPADAS POR ESTABELECIMENTO */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Despesas Agrupadas por Estabelecimento
            </h4>
            <p className="text-xs text-muted-foreground">
              Volume total de compras em cada fornecedor/mercado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agrupamentoEstabelecimentos.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                Nenhum fornecedor ou notinha registrada até o momento.
              </div>
            ) : (
              agrupamentoEstabelecimentos.map((loja) => {
                const isSelected = lojaSelecionadaCard === loja.nome;
                return (
                  <Card
                    key={loja.nome}
                    onClick={() => setLojaSelecionadaCard(isSelected ? null : loja.nome)}
                    className={`cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 shadow-md bg-primary/5"
                        : "border-border shadow-xs hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">{loja.nome}</CardTitle>
                        <CardDescription className="text-[11px]">{loja.qtdNotas} nota(s) fiscais</CardDescription>
                      </div>
                      <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] font-bold">
                        {loja.percentual}% do total
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xl font-extrabold text-foreground">{formatarMoeda(loja.total)}</div>
                      <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                        <Cookie className="w-3 h-3" /> Produção: {formatarMoeda(loja.producao)}
                      </div>
                      <div className="pt-2 border-t border-border/40">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirReatribuir(loja.nome);
                          }}
                          className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 border-primary/30 w-full justify-center"
                          title="Reatribuir ou mesclar compras para outro estabelecimento"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Reatribuir / Mesclar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      <Dialog open={modalNovaTransacao} onOpenChange={setModalNovaTransacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
            <DialogDescription>
              Adicione uma receita (entrada) ou despesa (saída) ao fluxo de caixa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="t-tipo">Tipo</Label>
                <Select
                  value={tipo}
                  onValueChange={(v: TransacaoTipo) => {
                    setTipo(v);
                    setCategoria(v === "receita" ? CATEGORIAS_PADRAO.receitas[0] : CATEGORIAS_PADRAO.despesas[0]);
                  }}
                >
                  <SelectTrigger id="t-tipo" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita (Entrada)</SelectItem>
                    <SelectItem value="despesa">Despesa (Saída)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="t-valor">Valor (R$)</Label>
                <Input
                  id="t-valor"
                  type="text"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="h-9 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="t-desc">Descrição / Motivo</Label>
              <Input
                id="t-desc"
                type="text"
                placeholder="Ex: Venda de Bolo Vulcão, Pagamento de Fornecedor..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="t-cat">Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger id="t-cat" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(tipo === "receita" ? CATEGORIAS_PADRAO.receitas : CATEGORIAS_PADRAO.despesas).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="t-metodo">Forma de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={(v: MetodoPagamento) => setMetodoPagamento(v)}>
                  <SelectTrigger id="t-metodo" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="t-status">Status</Label>
                <Select value={status} onValueChange={(v: StatusTransacao) => setStatus(v)}>
                  <SelectTrigger id="t-status" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concluida">Concluída / Paga</SelectItem>
                    <SelectItem value="pendente">Pendente / A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="t-contato">Cliente / Fornecedor</Label>
                <Input
                  id="t-contato"
                  type="text"
                  placeholder="Nome (opcional)"
                  value={clienteOuFornecedor}
                  onChange={(e) => setClienteOuFornecedor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalNovaTransacao(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={salvando} className="font-semibold">
                {salvando ? "Salvando..." : "Salvar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE GERAR LINK DE COBRANÇA AVULSA (STRIPE CONNECT INTEGRATED) */}
      {/* ========================================================================= */}
      <Dialog open={modalCobrancaOpen} onOpenChange={handleFecharModalCobranca}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" /> Gerar Link de Cobrança Avulsa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie um link de pagamento direto para seu cliente com repasse automático de taxas no cartão.
            </DialogDescription>
          </DialogHeader>

          {stepCobranca === 1 ? (
            <form onSubmit={handleGerarLinkCobranca} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cob-desc" className="text-xs font-bold">
                  Descrição da Cobrança *
                </Label>
                <Input
                  id="cob-desc"
                  placeholder="Ex: Sinal do Bolo de Casamento, Encomenda Especial..."
                  value={cobrancaDescricao}
                  onChange={(e) => setCobrancaDescricao(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cob-val" className="text-xs font-bold">
                  Valor líquido a receber (R$) *
                </Label>
                <Input
                  id="cob-val"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Ex: 150.00"
                  value={cobrancaValorLiquido}
                  onChange={(e) => setCobrancaValorLiquido(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                  required
                />
              </div>

              {/* SIMULAÇÃO DE PREVISÃO DE TAXAS NA TELA */}
              {valCobrancaLiquido > 0 && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs animate-fade-in">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Valor desejado para a loja:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {previewCobranca.formattedSubtotal}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-700 dark:text-amber-300 font-semibold">
                    <span>Taxa estimada no cartão (1x):</span>
                    <span className="font-mono">{previewCobranca.formattedFeeAmount}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-primary/20 text-xs font-extrabold text-foreground">
                    <span>Total inicial do cliente (1x):</span>
                    <span className="font-mono text-primary text-sm">
                      {previewCobranca.formattedTotalAmount}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    💡 O cliente pagará a partir de <strong>{previewCobranca.formattedTotalAmount}</strong> (as taxas de parcelamento até 12x serão custeadas por ele na tela de pagamento).
                  </p>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFecharModalCobranca}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!cobrancaDescricao || valCobrancaLiquido <= 0 || gerandoLink}
                  className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <LinkIcon className="w-4 h-4 mr-1.5" />
                  {gerandoLink ? "Gerando no Stripe..." : "Gerar Link"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* STEP 2: SUCESSO E COMPARTILHAMENTO DO LINK */
            <div className="space-y-4 py-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-foreground">Link de Cobrança Criado!</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Referente a <strong>"{cobrancaDescricao}"</strong> • Valor Líquido:{" "}
                  <strong>{previewCobranca.formattedSubtotal}</strong>
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Link de Pagamento Gerado
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={cobrancaLinkGerado || ""}
                    readOnly
                    className="h-9 text-xs font-mono bg-muted/50 border-primary/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopiarLink}
                    className="h-9 px-3 shrink-0 font-bold"
                  >
                    {linkCopiado ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-emerald-600" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" /> Copiar Link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-left space-y-1 text-xs">
                <p className="text-muted-foreground">
                  <strong>Como funciona para o cliente?</strong> Ao abrir o link, ele verá o detalhamento da cobrança e poderá pagar via Pix Direto ou no Cartão em até 12x com o acréscimo automático das taxas.
                </p>
              </div>

              <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row gap-2 justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStepCobranca(1)}
                  className="w-full sm:w-auto text-xs"
                >
                  Nova Cobrança
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnviarWhatsapp}
                  className="w-full sm:w-auto font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Enviar por WhatsApp
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL EDUCATIVO & TRAVA DE SEGURANÇA STRIPE */}
      {/* ========================================================================= */}
      <Dialog open={modalEducativoStripeOpen} onOpenChange={setModalEducativoStripeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-1">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Conecte sua Conta Stripe para Gerar Links
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Para receber pagamentos por cartão, você precisa conectar sua conta. Utilizamos a Stripe, o sistema de pagamentos mais seguro e utilizado no mundo, para garantir que o dinheiro caia diretamente na sua conta bancária.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalEducativoStripeOpen(false)}
              className="text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setModalEducativoStripeOpen(false);
                handleConectarStripe();
              }}
              disabled={conectandoStripe}
              className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              {conectandoStripe ? "Conectando..." : "Criar Conta / Conectar Stripe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL REATRIBUIR / MESCLAR ESTABELECIMENTO */}
      {/* ========================================================================= */}
      <Dialog open={modalReatribuirOpen} onOpenChange={setModalReatribuirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" /> Reatribuir / Mesclar Estabelecimento
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mova todas as compras e notinhas registradas em <strong>"{reatribuirFornecedorOrigem}"</strong> para outro estabelecimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Selecione a Opção de Destino:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoDestino === "existente" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDestino("existente")}
                  className="text-xs h-8 font-semibold"
                >
                  Estabelecimento Existente
                </Button>
                <Button
                  type="button"
                  variant={tipoDestino === "novo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDestino("novo")}
                  className="text-xs h-8 font-semibold"
                >
                  Criar Novo Nome
                </Button>
              </div>
            </div>

            {tipoDestino === "existente" ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Escolha um Estabelecimento Existente</Label>
                {listaFornecedoresExistentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhum outro estabelecimento cadastrado.</p>
                ) : (
                  <select
                    value={fornecedorDestinoSelecionado}
                    onChange={(e) => setFornecedorDestinoSelecionado(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-bold"
                  >
                    {listaFornecedoresExistentes.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Novo Nome do Estabelecimento / Mercado</Label>
                <Input
                  value={fornecedorDestinoNovoNome}
                  onChange={(e) => setFornecedorDestinoNovoNome(e.target.value)}
                  placeholder="ex: Atacadão Central S/A"
                  className="h-9 text-xs font-bold"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setModalReatribuirOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarReatribuicao}
              disabled={processandoReatribuicao}
              className="font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {processandoReatribuicao ? "Reatribuindo..." : "Confirmar & Mesclar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
