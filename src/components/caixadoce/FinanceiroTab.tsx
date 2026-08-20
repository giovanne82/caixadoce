import { useState } from "react";
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
} from "lucide-react";
import {
  formatarMoeda,
  CATEGORIAS_PADRAO,
  type TransacaoFinanceira,
  type TransacaoTipo,
  type MetodoPagamento,
  type StatusTransacao,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface FinanceiroTabProps {
  transacoes: TransacaoFinanceira[];
  onAdicionarTransacao: (transacao: Omit<TransacaoFinanceira, "id">) => Promise<void>;
  onRemoverTransacao: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string, status: StatusTransacao) => Promise<void>;
}

export function FinanceiroTab({
  transacoes,
  onAdicionarTransacao,
  onRemoverTransacao,
  onAtualizarStatus,
}: FinanceiroTabProps) {
  const [modalNovaTransacao, setModalNovaTransacao] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusTransacao>("todos");

  // Form State
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<TransacaoTipo>("receita");
  const [categoria, setCategoria] = useState(CATEGORIAS_PADRAO.receitas[0]);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>("pix");
  const [status, setStatus] = useState<StatusTransacao>("concluida");
  const [clienteOuFornecedor, setClienteOuFornecedor] = useState("");
  const [salvando, setSalvando] = useState(false);

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

      {/* Modal: Novo Lançamento */}
      <Dialog open={modalNovaTransacao} onOpenChange={setModalNovaTransacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
            <DialogDescription>
              Adicione uma receita de venda ou registre uma despesa no CaixaDoce.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={tipo === "receita" ? "default" : "outline"}
                className={tipo === "receita" ? "bg-emerald-600 hover:bg-emerald-700 font-bold" : ""}
                onClick={() => {
                  setTipo("receita");
                  setCategoria(CATEGORIAS_PADRAO.receitas[0]);
                }}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" /> Receita (+)
              </Button>
              <Button
                type="button"
                variant={tipo === "despesa" ? "default" : "outline"}
                className={tipo === "despesa" ? "bg-rose-600 hover:bg-rose-700 font-bold" : ""}
                onClick={() => {
                  setTipo("despesa");
                  setCategoria(CATEGORIAS_PADRAO.despesas[0]);
                }}
              >
                <TrendingDown className="w-4 h-4 mr-1.5" /> Despesa (-)
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trans-desc">Descrição do Lançamento</Label>
              <Input
                id="trans-desc"
                placeholder="Ex: Venda Bolo de Cenoura com Chocolate"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trans-valor">Valor (R$)</Label>
                <Input
                  id="trans-valor"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trans-metodo">Forma de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={(v: any) => setMetodoPagamento(v)}>
                  <SelectTrigger id="trans-metodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix Instantâneo</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro Físico</SelectItem>
                    <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trans-cat">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v)}>
                <SelectTrigger id="trans-cat">
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

            <div className="space-y-1.5">
              <Label htmlFor="trans-contato">Cliente / Fornecedor (Opcional)</Label>
              <Input
                id="trans-contato"
                placeholder="Ex: João da Silva / Distribuidora de Doces"
                value={clienteOuFornecedor}
                onChange={(e) => setClienteOuFornecedor(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setModalNovaTransacao(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Registrar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
