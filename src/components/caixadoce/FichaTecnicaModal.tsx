import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  DollarSign,
  PieChart,
  CheckCircle2,
  Info,
  Scale,
  RefreshCw,
} from "lucide-react";
import {
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  type ProdutoCardapio,
  LISTA_SUGESTOES_INSUMOS,
} from "@/lib/caixadoce-data";
import {
  INSUMOS_PADRAO_CATALOGO,
  obterFichaTecnicaProduto,
  salvarFichaTecnicaProduto,
  calcularPrecoMedioInsumo,
  calcularTotaisFichaTecnica,
  calcularCustoItemFichaTecnica,
  type FichaTecnicaItem,
} from "@/lib/ficha-tecnica-service";
import { toast } from "sonner";

interface FichaTecnicaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: ProdutoCardapio | null;
  estabelecimentoCodigo: string;
  onAplicarPrecoProduto: (produtoId: string, novoPreco: number) => Promise<void>;
}

export function FichaTecnicaModal({
  open,
  onOpenChange,
  produto,
  estabelecimentoCodigo,
  onAplicarPrecoProduto,
}: FichaTecnicaModalProps) {
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<FichaTecnicaItem[]>([]);

  // Parâmetros de Precificação
  const [rendimentoQtd, setRendimentoQtd] = useState<number>(1);
  const [custosOperacionaisPerc, setCustosOperacionaisPerc] = useState<number>(15);
  const [margemLucroPerc, setMargemLucroPerc] = useState<number>(100);

  // Form de Inserção de Novo Insumo na Ficha
  const [novoInsumoNome, setNovoInsumoNome] = useState("");
  const [novoInsumoQtd, setNovoInsumoQtd] = useState<number>(100);
  const [novoInsumoUnidade, setNovoInsumoUnidade] = useState<"g" | "kg" | "ml" | "l" | "un" | "bdj" | "pct" | "cx">("g");
  const [novoInsumoPrecoFormatado, setNovoInsumoPrecoFormatado] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buscandoPrecoMedio, setBuscandoPrecoMedio] = useState(false);
  const [origemPrecoInfo, setOrigemPrecoInfo] = useState<string>("");

  // Sugestões para o Autocomplete (Catálogo Padrão + Insumos de Confeitaria)
  const sugestoesFiltradas = useMemo(() => {
    const termo = novoInsumoNome.trim().toLowerCase();
    if (!termo) return [];

    const deCatalogoPadrao = INSUMOS_PADRAO_CATALOGO.map((i) => i.nome);
    const todasSugestoes = Array.from(new Set([...deCatalogoPadrao, ...LISTA_SUGESTOES_INSUMOS]));

    return todasSugestoes
      .filter((s) => s.toLowerCase().includes(termo))
      .slice(0, 8);
  }, [novoInsumoNome]);

  // Carregar a Ficha Técnica ao abrir o modal
  useEffect(() => {
    if (open && produto) {
      setCarregando(true);
      obterFichaTecnicaProduto(estabelecimentoCodigo, produto.id)
        .then((dados) => {
          setItens(dados);
          // Ajusta o rendimento padrão caso o nome contenha indício (ex: "100 un")
          if (produto.nome.toLowerCase().includes("100 un")) {
            setRendimentoQtd(100);
          } else if (produto.nome.toLowerCase().includes("50 un")) {
            setRendimentoQtd(50);
          } else {
            setRendimentoQtd(1);
          }
        })
        .finally(() => setCarregando(false));
    }
  }, [open, produto, estabelecimentoCodigo]);

  // Quando um insumo é selecionado do autocomplete ou digitado, busca seu Preço Médio no Supabase
  const handleSelecionarSugestao = async (nomeInsumo: string) => {
    setNovoInsumoNome(nomeInsumo);
    setDropdownOpen(false);
    setBuscandoPrecoMedio(true);

    try {
      const res = await calcularPrecoMedioInsumo(estabelecimentoCodigo, nomeInsumo, novoInsumoUnidade);
      setNovoInsumoPrecoFormatado(`R$ ${res.precoMedioUnitario.toFixed(4).replace(".", ",")}`);
      
      if (res.deNotaFiscal) {
        setOrigemPrecoInfo(`⚡ Média de ${res.totalComprasRegistradas} notas escaneadas nesta loja`);
      } else {
        setOrigemPrecoInfo("💡 Preço sugerido do catálogo de confeitaria");
      }
    } catch {
      setNovoInsumoPrecoFormatado("R$ 10,00");
    } finally {
      setBuscandoPrecoMedio(false);
    }
  };

  // Adicionar Insumo na Ficha Técnica
  const handleAdicionarInsumo = () => {
    const nomeLimpo = novoInsumoNome.trim();
    const precoNum = converterMoedaInputParaNumero(novoInsumoPrecoFormatado);

    if (!nomeLimpo) {
      toast.error("Informe o nome do insumo.");
      return;
    }

    if (novoInsumoQtd <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    const custoTotalItem = calcularCustoItemFichaTecnica(
      novoInsumoQtd,
      novoInsumoUnidade,
      precoNum
    );

    const novoItem: FichaTecnicaItem = {
      id: crypto.randomUUID(),
      estabelecimentoCodigo,
      produtoId: produto?.id || "",
      insumoNome: nomeLimpo,
      quantidadeUsada: novoInsumoQtd,
      unidadeMedida: novoInsumoUnidade,
      precoUnitarioAplicado: precoNum,
      custoTotalItem,
    };

    setItens((prev) => [...prev, novoItem]);
    setNovoInsumoNome("");
    setNovoInsumoQtd(100);
    setNovoInsumoPrecoFormatado("");
    setOrigemPrecoInfo("");
    toast.success(`Insumo "${nomeLimpo}" adicionado à receita (Custo: ${formatarMoeda(custoTotalItem)}).`);
  };

  // Atualizar campo de um item existente na tabela (100% Editável)
  const handleAtualizarItemExistente = (
    id: string,
    campo: keyof FichaTecnicaItem,
    valor: any
  ) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const atualizado = { ...item, [campo]: valor };
        const qtd = Number(atualizado.quantidadeUsada) || 0;
        const preco = Number(atualizado.precoUnitarioAplicado) || 0;
        atualizado.custoTotalItem = calcularCustoItemFichaTecnica(
          qtd,
          atualizado.unidadeMedida,
          preco
        );
        return atualizado;
      })
    );
  };

  // Remover Insumo
  const handleRemoverItem = (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
  };

  // Totais Calculados em Tempo Real
  const totaisCalculados = useMemo(() => {
    return calcularTotaisFichaTecnica(
      itens,
      rendimentoQtd,
      custosOperacionaisPerc,
      margemLucroPerc
    );
  }, [itens, rendimentoQtd, custosOperacionaisPerc, margemLucroPerc]);

  // Aplicar Preço de Venda Sugerido ao Produto do Cardápio
  const handleSalvarEAplicarPreco = async () => {
    if (!produto) return;
    setSalvando(true);
    try {
      // 1. Salvar Itens da Ficha Técnica no Supabase
      await salvarFichaTecnicaProduto(estabelecimentoCodigo, produto.id, itens);

      // 2. Atualizar Preço do Produto no Cardápio
      const precoFinalAplicar =
        rendimentoQtd > 1
          ? totaisCalculados.precoVendaSugeridoUnitario
          : totaisCalculados.precoVendaSugeridoLote;

      await onAplicarPrecoProduto(produto.id, precoFinalAplicar);

      toast.success(`Preço de R$ ${precoFinalAplicar.toFixed(2).replace(".", ",")} aplicado ao produto com sucesso!`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Erro ao salvar ficha técnica: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[900px] max-w-[900px] h-[92vh] sm:h-[850px] max-h-[850px] flex flex-col p-0 overflow-hidden rounded-2xl border-purple-500/30">
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border bg-gradient-to-r from-purple-900/10 via-card to-purple-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold shrink-0 border border-purple-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
                Ficha Técnica &amp; Precificação: {produto.nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Soma de insumos, margem de lucro e preço de venda sugerido baseado no seu histórico de notas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo Central Rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
          {/* CARDS DE RESUMO DE CUSTOS E PRECIFICAÇÃO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-purple-500/10 border-purple-500/30 shadow-xs">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <PieChart className="w-3 h-3" /> Custo Insumos
                </span>
                <p className="text-lg font-black text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoInsumosTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/10 border-amber-500/30 shadow-xs">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Custo Receita
                </span>
                <p className="text-lg font-black text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoTotalReceita)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/30 shadow-xs">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Calculator className="w-3 h-3" /> Custo Unitário
                </span>
                <p className="text-lg font-black text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoUnitarioItem)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/15 border-emerald-500/40 shadow-xs">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Preço Sugerido
                </span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {rendimentoQtd > 1
                    ? `${formatarMoeda(totaisCalculados.precoVendaSugeridoUnitario)}/un`
                    : formatarMoeda(totaisCalculados.precoVendaSugeridoLote)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* FORMULÁRIO RÁPIDO DE INSERÇÃO DE INSUMO NA FICHA */}
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-purple-600" /> Adicionar Insumo à Receita
                </span>
                {origemPrecoInfo && (
                  <span className="text-[11px] font-mono text-purple-600 dark:text-purple-300">
                    {origemPrecoInfo}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Autocomplete do Insumo */}
                <div className="sm:col-span-5 relative">
                  <Label className="text-xs">Insumo ou Ingrediente</Label>
                  <Input
                    placeholder="Digite (ex: Leite Condensado, Chocolate Melken...)"
                    value={novoInsumoNome}
                    onChange={(e) => {
                      setNovoInsumoNome(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                  />

                  {dropdownOpen && sugestoesFiltradas.length > 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 max-h-48 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-xl py-1">
                      {sugestoesFiltradas.map((sug) => (
                        <div
                          key={sug}
                          onMouseDown={() => handleSelecionarSugestao(sug)}
                          className="px-3 py-2 text-xs hover:bg-purple-500/10 hover:text-purple-600 cursor-pointer font-medium flex items-center justify-between"
                        >
                          <span>{sug}</span>
                          <Badge variant="outline" className="text-[9px]">Sugerido</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div className="sm:col-span-2">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={novoInsumoQtd}
                    onChange={(e) => setNovoInsumoQtd(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Unidade */}
                <div className="sm:col-span-2">
                  <Label className="text-xs">Unidade</Label>
                  <Select
                    value={novoInsumoUnidade}
                    onValueChange={(val: any) => setNovoInsumoUnidade(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="kg">Quilo (kg)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="bdj">Bandeja (bdj)</SelectItem>
                      <SelectItem value="pct">Pacote (pct)</SelectItem>
                      <SelectItem value="cx">Caixa (cx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preço Unitário Aplicado */}
                <div className="sm:col-span-3 flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-semibold">
                      Preço Base{" "}
                      <span className="text-[10px] text-purple-600 dark:text-purple-300 font-bold">
                        {novoInsumoUnidade === "g" || novoInsumoUnidade === "kg"
                          ? "(R$ / kg)"
                          : novoInsumoUnidade === "ml" || novoInsumoUnidade === "l"
                          ? "(R$ / L)"
                          : "(R$ / un)"}
                      </span>
                    </Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={novoInsumoPrecoFormatado}
                      onChange={(e) => setNovoInsumoPrecoFormatado(aplicarMascaraMoedaInput(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAdicionarInsumo}
                    className="h-9 bg-purple-600 hover:bg-purple-700 text-white shrink-0 mt-5"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABELA DE INSUMOS DA FICHA TÉCNICA (100% EDITÁVEL) */}
          <div className="border border-border rounded-xl overflow-hidden shadow-2xs bg-card">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead>Ingrediente / Insumo</TableHead>
                  <TableHead className="w-28">Qtd Usada</TableHead>
                  <TableHead className="w-28">Unidade</TableHead>
                  <TableHead className="w-40">Preço Base (R$)</TableHead>
                  <TableHead className="w-32 text-right">Custo Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum ingrediente adicionado à receita ainda. Digite acima para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {item.insumoNome}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-24 font-semibold"
                          value={item.quantidadeUsada}
                          onChange={(e) =>
                            handleAtualizarItemExistente(
                              item.id,
                              "quantidadeUsada",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unidadeMedida}
                          onValueChange={(val) => handleAtualizarItemExistente(item.id, "unidadeMedida", val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g (grama)</SelectItem>
                            <SelectItem value="kg">kg (quilo)</SelectItem>
                            <SelectItem value="ml">ml (ml)</SelectItem>
                            <SelectItem value="l">l (litro)</SelectItem>
                            <SelectItem value="un">un (unid)</SelectItem>
                            <SelectItem value="bdj">bdj (bandj)</SelectItem>
                            <SelectItem value="pct">pct (pacote)</SelectItem>
                            <SelectItem value="cx">cx (caixa)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="R$ 0,00"
                          className="h-8 text-xs w-36 font-mono font-bold"
                          value={
                            item.precoUnitarioAplicado
                              ? formatarMoeda(item.precoUnitarioAplicado)
                              : ""
                          }
                          onChange={(e) => {
                            const masked = aplicarMascaraMoedaInput(e.target.value);
                            const num = converterMoedaInputParaNumero(masked);
                            handleAtualizarItemExistente(item.id, "precoUnitarioAplicado", num);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-black text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        {formatarMoeda(item.custoTotalItem)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverItem(item.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PARÂMETROS DE RENDIMENTO & MARGEM DE LUCRO */}
          <Card className="border-border bg-gradient-to-r from-muted/40 via-card to-muted/40">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Rendimento da Receita (Peças/Bolo)</Label>
                <Input
                  type="number"
                  min="1"
                  value={rendimentoQtd}
                  onChange={(e) => setRendimentoQtd(parseInt(e.target.value) || 1)}
                />
                <span className="text-[10px] text-muted-foreground">Ex: 100 coxinhas, 50 brigadeiros ou 1 bolo</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Custos Operacionais (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={custosOperacionaisPerc}
                  onChange={(e) => setCustosOperacionaisPerc(parseFloat(e.target.value) || 0)}
                />
                <span className="text-[10px] text-muted-foreground">Gás, energia, água e embalagem</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Margem de Lucro (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={margemLucroPerc}
                  onChange={(e) => setMargemLucroPerc(parseFloat(e.target.value) || 0)}
                />
                <span className="text-[10px] text-muted-foreground">Ex: 100% de lucro sobre os custos</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="p-4 sm:p-6 border-t border-border bg-card shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Preço de Venda Atual no Cardápio: <strong className="text-foreground font-mono">{formatarMoeda(produto.preco)}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEAplicarPreco}
              disabled={salvando || itens.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold gap-1.5 shadow-md flex-1 sm:flex-initial"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplicar Preço Sugerido ({formatarMoeda(rendimentoQtd > 1 ? totaisCalculados.precoVendaSugeridoUnitario : totaisCalculados.precoVendaSugeridoLote)})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
