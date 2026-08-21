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
  Building2,
  Calendar,
  Layers,
  Search,
  Cookie,
  UtensilsCrossed,
  User,
  Trash2,
  Eye,
  PieChart,
  MapPin,
  FileText,
  Clock,
} from "lucide-react";
import {
  formatarMoeda,
  CATEGORIAS_DESPESA_CONFIG,
  type DespesaNotaFiscal,
} from "@/lib/caixadoce-data";

interface DespesasViewProps {
  despesas: DespesaNotaFiscal[];
  onExcluirDespesa: (id: string) => Promise<void>;
}

export function DespesasView({ despesas, onExcluirDespesa }: DespesasViewProps) {
  const [modoAgrupamento, setModoAgrupamento] = useState<"estabelecimento" | "data">("estabelecimento");

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroEstabelecimento, setFiltroEstabelecimento] = useState("todos");
  const [lojaSelecionadaCard, setLojaSelecionadaCard] = useState<string | null>(null);

  // Modal de Detalhes
  const [notaSelecionada, setNotaSelecionada] = useState<DespesaNotaFiscal | null>(null);

  // Métricas Globais
  const metricas = useMemo(() => {
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

  // Agrupamento por Estabelecimento
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
      notas: dados.notas,
      percentual: metricas.total > 0 ? ((dados.total / metricas.total) * 100).toFixed(1) : "0",
    })).sort((a, b) => b.total - a.total);
  }, [despesas, metricas.total]);

  // Fornecedores Únicos
  const lojasUnicas = useMemo(() => {
    return Array.from(new Set(despesas.map((d) => d.fornecedorNome).filter(Boolean)));
  }, [despesas]);

  // Despesas Filtradas
  const despesasFiltradas = useMemo(() => {
    return despesas.filter((d) => {
      const matchLoja = filtroEstabelecimento === "todos" || d.fornecedorNome === filtroEstabelecimento;
      const matchLojaCard = !lojaSelecionadaCard || d.fornecedorNome === lojaSelecionadaCard;
      const matchBusca =
        !busca ||
        d.fornecedorNome.toLowerCase().includes(busca.toLowerCase()) ||
        d.itens.some((it) => it.nome.toLowerCase().includes(busca.toLowerCase()));

      return matchLoja && matchLojaCard && matchBusca;
    });
  }, [despesas, filtroEstabelecimento, lojaSelecionadaCard, busca]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Gestão de Despesas &amp; Compras <Layers className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe gastos detalhados por estabelecimento, insumos de produção e histórico de compras.
          </p>
        </div>

        {/* Alternador de Agrupamento */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
          <Button
            variant={modoAgrupamento === "estabelecimento" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setModoAgrupamento("estabelecimento");
              setLojaSelecionadaCard(null);
            }}
            className="h-8 text-xs font-semibold"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Por Local de Compra
          </Button>
          <Button
            variant={modoAgrupamento === "data" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setModoAgrupamento("data");
              setLojaSelecionadaCard(null);
            }}
            className="h-8 text-xs font-semibold"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Por Data / Período
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARDS DE TOTAIS POR CATEGORIA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">🍫 Custo Produção</CardTitle>
            <Cookie className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600">
              {formatarMoeda(metricas.producao)}
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
              {formatarMoeda(metricas.utensilios)}
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
              {formatarMoeda(metricas.consumoProprio)}
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
              {formatarMoeda(metricas.total)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{despesas.length} notas digitalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO: AGRUPADO POR LOCAL DE COMPRA (ESTABELECIMENTO) */}
      {/* ========================================================================= */}
      {modoAgrupamento === "estabelecimento" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Despesas Agrupadas por Estabelecimento
            </h3>
            <p className="text-xs text-muted-foreground">
              Selecione uma loja para filtrar os registros ou visualize o volume total gasto em cada uma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agrupamentoEstabelecimentos.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                Nenhum estabelecimento registrado. Digitalize uma notinha para começar!
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

          {lojaSelecionadaCard && (
            <div className="flex items-center justify-between bg-primary/10 p-2.5 rounded-xl border border-primary/20 text-xs">
              <span className="font-semibold text-primary">
                Exibindo notas filtradas de: <strong>{lojaSelecionadaCard}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLojaSelecionadaCard(null)}
                className="h-6 text-xs text-primary hover:bg-primary/20"
              >
                Limpar Filtro
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TABELA COMPLETA DE REGISTROS (COM BOTÃO 'VER DETALHES') */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Registros Detalhados
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por loja, item..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={filtroEstabelecimento} onValueChange={setFiltroEstabelecimento}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Todas as Lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Estabelecimentos</SelectItem>
                {lojasUnicas.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs w-28">Data</TableHead>
                <TableHead className="text-xs">Estabelecimento</TableHead>
                <TableHead className="text-xs">Custo Produção</TableHead>
                <TableHead className="text-xs">Utensílios</TableHead>
                <TableHead className="text-xs">Pessoal</TableHead>
                <TableHead className="text-xs font-bold">Valor Total</TableHead>
                <TableHead className="text-xs text-right w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhuma despesa encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                despesasFiltradas.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {d.dataCompra.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> {d.fornecedorNome}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-amber-600">
                      {formatarMoeda(d.valorProducao)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-blue-600">
                      {formatarMoeda(d.valorUtensilios)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-rose-600">
                      {formatarMoeda(d.valorConsumoProprio)}
                    </TableCell>
                    <TableCell className="font-extrabold text-xs text-foreground">
                      {formatarMoeda(d.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNotaSelecionada(d)}
                          className="h-7 px-2.5 text-xs text-primary font-semibold hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Ver Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Deseja excluir o registro de compra do "${d.fornecedorNome}"?`)) {
                              onExcluirDespesa(d.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DETALHES COMPLETOS COM METADADOS FISCAIS */}
      {/* ========================================================================= */}
      {notaSelecionada && (
        <Dialog open={!!notaSelecionada} onOpenChange={() => setNotaSelecionada(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground text-base">
                <Building2 className="w-5 h-5 text-primary" /> {notaSelecionada.fornecedorNome}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Comprovante fiscal registrado em {notaSelecionada.dataCompra.split("-").reverse().join("/")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Metadados Fiscais Completos */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° da Nota:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaSelecionada.numeroNota || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° do Pedido:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaSelecionada.numeroPedido || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Data &amp; Hora:
                  </span>
                  <p className="font-mono text-foreground mt-0.5">
                    {notaSelecionada.dataCompra.split("-").reverse().join("/")} {notaSelecionada.horaCompra ? `às ${notaSelecionada.horaCompra}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Endereço:
                  </span>
                  <p className="text-foreground truncate mt-0.5" title={notaSelecionada.fornecedorEndereco}>
                    {notaSelecionada.fornecedorEndereco || "Local físico"}
                  </p>
                </div>
              </div>

              {/* Tabela dos Itens */}
              <div className="rounded-lg border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Item / Descrição</TableHead>
                      <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                      <TableHead className="text-xs w-20">Unit.</TableHead>
                      <TableHead className="text-xs w-20">Total</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notaSelecionada.itens.map((it) => {
                      const cfg = CATEGORIAS_DESPESA_CONFIG[it.categoria] || CATEGORIAS_DESPESA_CONFIG.outros;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-xs font-semibold text-foreground">{it.nome}</TableCell>
                          <TableCell className="text-xs text-center font-mono">{it.quantidade}</TableCell>
                          <TableCell className="text-xs">{formatarMoeda(it.valorUnitario)}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {formatarMoeda(it.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${cfg.badgeClass}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Subtotais por Categoria */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex justify-between">
                  <span>🍫 Produção (Doces):</span>
                  <span>{formatarMoeda(notaSelecionada.valorProducao)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold flex justify-between">
                  <span>🥣 Utensílios:</span>
                  <span>{formatarMoeda(notaSelecionada.valorUtensilios)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold flex justify-between">
                  <span>🛒 Consumo Pessoal:</span>
                  <span>{formatarMoeda(notaSelecionada.valorConsumoProprio)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300 font-semibold flex justify-between">
                  <span>💰 Total Notinha:</span>
                  <span className="font-extrabold">{formatarMoeda(notaSelecionada.valorTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setNotaSelecionada(null)} className="text-xs font-semibold">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
