import { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  formatarMoeda,
  CATEGORIAS_PADRAO,
  type TransacaoFinanceira,
  type TransacaoTipo,
  type MetodoPagamento,
  type StatusTransacao,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface FinanceiroTabProps {
  transacoes: TransacaoFinanceira[];
  despesas?: DespesaNotaFiscal[];
  onAdicionarTransacao: (transacao: Omit<TransacaoFinanceira, "id">) => Promise<void>;
  onRemoverTransacao: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string, status: StatusTransacao) => Promise<void>;
}

export function FinanceiroTab({
  transacoes,
  despesas = [],
  onAdicionarTransacao,
  onRemoverTransacao,
  onAtualizarStatus,
}: FinanceiroTabProps) {
  const [modalNovaTransacao, setModalNovaTransacao] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusTransacao>("todos");
  const [lojaSelecionadaCard, setLojaSelecionadaCard] = useState<string | null>(null);

  // Form State
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

  const totalReceitas = transacoesFiltradas
    .filter((t) => t.tipo === "receita" && t.status === "concluida")
    .reduce((acc, t) => acc + t.valor, 0);

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

  const exportarCSV = () => {
    if (transacoesFiltradas.length === 0) {
      toast.error("Nenhuma transação para exportar.");
      return;
    }

    const header = "Data;Descrição;Tipo;Categoria;Valor;Método;Status;Contato\n";
    const rows = transacoesFiltradas
      .map(
        (t) =>
          `${t.data};"${t.descricao}";${t.tipo};"${t.categoria}";${t.valor.toFixed(2)};${t.metodoPagamento};${t.status};"${t.clienteOuFornecedor || ""}"`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `caixadoce_relatorio_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV exportado com sucesso!");
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button onClick={() => setModalNovaTransacao(true)} className="font-semibold shadow-md">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Lançamento
          </Button>
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Entradas Filtradas</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatarMoeda(totalReceitas)}</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Saídas Filtradas</p>
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
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
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
                      onClick={() => onRemoverTransacao(t.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
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
                    <CardContent className="space-y-1">
                      <div className="text-xl font-extrabold text-foreground">{formatarMoeda(loja.total)}</div>
                      <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                        <Cookie className="w-3 h-3" /> Produção: {formatarMoeda(loja.producao)}
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
    </div>
  );
}
