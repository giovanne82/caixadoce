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
  establishmentCode = "",
  onAdicionarTransacao,
  onRemoverTransacao,
  onAtualizarStatus,
  onEditarDespesa,
  onReatribuirEstabelecimento,
}: FinanceiroTabProps) {
  const code = establishmentCode || "";

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
        <div className="overflow-x-auto select-none [scrollbar-width:thin]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="whitespace-nowrap">Data</TableHead>
                <TableHead className="whitespace-nowrap">Descrição</TableHead>
                <TableHead className="whitespace-nowrap">Origem</TableHead>
                <TableHead className="whitespace-nowrap">Categoria</TableHead>
                <TableHead className="whitespace-nowrap">Método</TableHead>
                <TableHead className="whitespace-nowrap">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground whitespace-nowrap">
                    Nenhuma transação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                transacoesFiltradas.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{t.data}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="font-semibold text-sm text-foreground">{t.descricao}</p>
                      {t.clienteOuFornecedor && (
                        <p className="text-[11px] text-muted-foreground">{t.clienteOuFornecedor}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
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
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="text-xs font-normal">
                        {t.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs uppercase font-medium text-muted-foreground whitespace-nowrap">
                      {t.metodoPagamento.replace("_", " ")}
                    </TableCell>
                    <TableCell className={`font-bold text-sm whitespace-nowrap ${t.tipo === "receita" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.tipo === "receita" ? "+" : "-"} {formatarMoeda(t.valor)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <button
                        onClick={() =>
                          onAtualizarStatus(t.id, t.status === "concluida" ? "pendente" : "concluida")
                        }
                        title="Clique para alternar status"
                        className="cursor-pointer min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
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
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o lançamento "${t.descricao}" (${formatarMoeda(t.valor)})?`)) {
                            onRemoverTransacao(t.id);
                          }
                        }}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
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
        </div>
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
