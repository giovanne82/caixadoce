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
  TableFooter,
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
  AlertTriangle,
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
  type HistoricoCompraInsumo,
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

  // Preço de Venda Personalizado & Escolha de Opção
  const [opcaoPrecoUsar, setOpcaoPrecoUsar] = useState<"sugerido" | "personalizado">("sugerido");
  const [precoPersonalizadoFormatado, setPrecoPersonalizadoFormatado] = useState("");

  // Helper para leitura limpa de números em campos de texto livre (aceita "100", "0,5", "0.5")
  const parseNumberInput = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(",", ".").replace(/[^0-9.]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Form de Inserção de Novo Insumo na Ficha (Campos livres sem setas numéricas)
  const [novoInsumoNome, setNovoInsumoNome] = useState("");
  const [novoInsumoQtdStr, setNovoInsumoQtdStr] = useState<string>("100");
  const [novoInsumoQtdOriginalStr, setNovoInsumoQtdOriginalStr] = useState<string>("1");
  const [novoInsumoQtd, setNovoInsumoQtd] = useState<number>(100);
  const [novoInsumoQtdOriginal, setNovoInsumoQtdOriginal] = useState<number>(1);
  const [novoInsumoUnidadeCompra, setNovoInsumoUnidadeCompra] = useState<string>("kg");
  const [novoInsumoUnidade, setNovoInsumoUnidade] = useState<string>("g");
  const [novoInsumoPrecoFormatado, setNovoInsumoPrecoFormatado] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buscandoPrecoMedio, setBuscandoPrecoMedio] = useState(false);
  const [origemPrecoInfo, setOrigemPrecoInfo] = useState<string>("");

  // Sugestões para o Autocomplete (Order-independent token search: "harald top", "top harald", etc.)
  const sugestoesFiltradas = useMemo(() => {
    const termo = novoInsumoNome.trim().toLowerCase();
    if (!termo) return [];

    const queryTokens = termo.split(/\s+/).filter(Boolean);

    const deCatalogoPadrao = INSUMOS_PADRAO_CATALOGO.map((i) => i.nome);
    
    let deHistoricoUsuario: string[] = [];
    try {
      const rawH = localStorage.getItem(`caixadoce_historico_insumos_${estabelecimentoCodigo}`);
      if (rawH) {
        const parsed: HistoricoCompraInsumo[] = JSON.parse(rawH);
        deHistoricoUsuario = parsed.map((h) => h.nomeInsumo);
      }
    } catch {}

    const todasSugestoes = Array.from(
      new Set([...deHistoricoUsuario, ...deCatalogoPadrao, ...LISTA_SUGESTOES_INSUMOS])
    );

    return todasSugestoes
      .filter((sug) => {
        const sugLower = sug.toLowerCase();
        // Todas as palavras digitadas no termo devem estar presentes na sugestão (em qualquer ordem)
        return queryTokens.every((tok) => sugLower.includes(tok));
      })
      .slice(0, 10);
  }, [novoInsumoNome, estabelecimentoCodigo]);

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
      const valorFormatado = `R$ ${res.precoMedioUnitario.toFixed(2).replace(".", ",")}`;
      setNovoInsumoPrecoFormatado(valorFormatado);
      
      if (res.deNotaFiscal) {
        setOrigemPrecoInfo(`⚡ Média Real de ${valorFormatado} em ${res.totalComprasRegistradas} nota(s) escaneada(s)`);
      } else {
        setOrigemPrecoInfo(`💡 Preço Sugerido: ${valorFormatado}`);
      }
    } catch {
      setNovoInsumoPrecoFormatado("R$ 38,50");
    } finally {
      setBuscandoPrecoMedio(false);
    }
  };

  // Adicionar Insumo na Ficha Técnica (Proporcional com conversão automática de unidades)
  const handleAdicionarInsumo = () => {
    const nomeLimpo = novoInsumoNome.trim();
    const precoEmb = converterMoedaInputParaNumero(novoInsumoPrecoFormatado);
    const qtdEmbOrig = novoInsumoQtdOriginal > 0 ? novoInsumoQtdOriginal : 1;
    const qtdUsadaVal = novoInsumoQtd > 0 ? novoInsumoQtd : 0;

    if (!nomeLimpo) {
      toast.error("Informe o nome do insumo.");
      return;
    }

    if (qtdUsadaVal <= 0) {
      toast.error("Informe uma quantidade válida para a receita.");
      return;
    }

    const custoTotalItem = calcularCustoItemFichaTecnica(
      qtdUsadaVal,
      novoInsumoUnidade,
      precoEmb,
      qtdEmbOrig,
      novoInsumoUnidadeCompra
    );

    const novoItem: FichaTecnicaItem = {
      id: crypto.randomUUID(),
      estabelecimentoCodigo,
      produtoId: produto?.id || "",
      insumoNome: nomeLimpo,
      precoEmbalagem: precoEmb,
      qtdEmbalagemOriginal: qtdEmbOrig,
      quantidadeUsada: qtdUsadaVal,
      unidadeMedida: novoInsumoUnidade,
      unidadeEmbalagem: novoInsumoUnidadeCompra,
      precoUnitarioAplicado: precoEmb,
      custoTotalItem,
    };

    setItens((prev) => [...prev, novoItem]);
    setNovoInsumoNome("");
    setNovoInsumoQtdStr("100");
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
        const precoEmb = Number(atualizado.precoEmbalagem ?? atualizado.precoUnitarioAplicado ?? 0);
        const qtdEmbOrig = Number(atualizado.qtdEmbalagemOriginal) > 0 ? Number(atualizado.qtdEmbalagemOriginal) : 1;
        const qtdUsada = Number(atualizado.quantidadeUsada) || 0;
        const unidUso = atualizado.unidadeMedida || "g";
        const unidCompra = atualizado.unidadeEmbalagem || unidUso;
        
        atualizado.custoTotalItem = calcularCustoItemFichaTecnica(
          qtdUsada,
          unidUso,
          precoEmb,
          qtdEmbOrig,
          unidCompra
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

  // Preço Sugerido Efetivo (Unitário se rendimento > 1, ou Lote/Receita)
  const precoSugeridoEfetivo = useMemo(() => {
    return rendimentoQtd > 1
      ? totaisCalculados.precoVendaSugeridoUnitario
      : totaisCalculados.precoVendaSugeridoLote;
  }, [rendimentoQtd, totaisCalculados]);

  // Custo Base Efetivo (Unitário se rendimento > 1, ou Receita Total)
  const custoBaseEfetivo = useMemo(() => {
    return rendimentoQtd > 1
      ? totaisCalculados.custoUnitarioItem
      : totaisCalculados.custoTotalReceita;
  }, [rendimentoQtd, totaisCalculados]);

  // Inicializa o campo de Preço Personalizado quando o modal abre ou a sugestão muda
  useEffect(() => {
    if (open && produto) {
      const precoInicial = precoSugeridoEfetivo > 0 ? precoSugeridoEfetivo : produto.preco || 0;
      if (precoInicial > 0) {
        setPrecoPersonalizadoFormatado(formatarMoeda(precoInicial));
      }
    }
  }, [open, produto, precoSugeridoEfetivo]);

  // Preço Personalizado convertido para número
  const precoPersonalizadoNum = useMemo(() => {
    return converterMoedaInputParaNumero(precoPersonalizadoFormatado);
  }, [precoPersonalizadoFormatado]);

  // Cálculos de Lucro Comparativo (Sugerido vs Personalizado)
  const comparativoLucro = useMemo(() => {
    const lucroSugeridoVal = precoSugeridoEfetivo - custoBaseEfetivo;
    const percSugerido = custoBaseEfetivo > 0 ? (lucroSugeridoVal / custoBaseEfetivo) * 100 : margemLucroPerc;

    const lucroPersonalizadoVal = precoPersonalizadoNum - custoBaseEfetivo;
    const percPersonalizado = custoBaseEfetivo > 0 ? (lucroPersonalizadoVal / custoBaseEfetivo) * 100 : 0;

    return {
      lucroSugeridoVal: parseFloat(lucroSugeridoVal.toFixed(2)),
      percSugerido: parseFloat(percSugerido.toFixed(1)),
      lucroPersonalizadoVal: parseFloat(lucroPersonalizadoVal.toFixed(2)),
      percPersonalizado: parseFloat(percPersonalizado.toFixed(1)),
    };
  }, [precoSugeridoEfetivo, custoBaseEfetivo, precoPersonalizadoNum, margemLucroPerc]);

  // Preço Final Escolhido para Salvar no Cardápio
  const precoFinalSalvar = useMemo(() => {
    return opcaoPrecoUsar === "sugerido" ? precoSugeridoEfetivo : precoPersonalizadoNum;
  }, [opcaoPrecoUsar, precoSugeridoEfetivo, precoPersonalizadoNum]);

  // Aplicar Preço de Venda Selecionado ao Produto do Cardápio
  const handleSalvarEAplicarPreco = async () => {
    if (!produto) return;
    setSalvando(true);
    try {
      // 1. Salvar Itens da Ficha Técnica no Supabase
      await salvarFichaTecnicaProduto(estabelecimentoCodigo, produto.id, itens);

      // 2. Atualizar Preço do Produto no Cardápio com o valor escolhido
      await onAplicarPrecoProduto(produto.id, precoFinalSalvar);

      toast.success(`Preço de ${formatarMoeda(precoFinalSalvar)} aplicado ao produto com sucesso!`);
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-[900px] max-w-[900px] h-[95vh] sm:h-[850px] max-h-[850px] flex flex-col p-0 overflow-hidden rounded-2xl border-purple-500/30">
        {/* Conteúdo Central Rolável (Incluindo Cabeçalho Estático) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 sm:space-y-6 min-h-0">
          {/* Cabeçalho do Modal (Estático / Rola junto com a página) */}
          <DialogHeader className="p-3.5 sm:p-5 -mx-3.5 sm:-mx-6 -mt-3.5 sm:-mt-6 border-b border-border bg-gradient-to-r from-purple-900/10 via-card to-purple-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold shrink-0 border border-purple-500/30">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-xl font-extrabold text-foreground truncate">
                  Ficha Técnica &amp; Precificação: {produto.nome}
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                  Soma de insumos, margem de lucro e preço de venda sugerido baseado no seu histórico de notas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* FORMULÁRIO RÁPIDO DE INSERÇÃO DE INSUMO NA FICHA */}
          <Card className="border-border bg-muted/30">
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-purple-600" /> Adicionar Insumo à Receita
                  </span>
                  {origemPrecoInfo && (
                    <span className="text-[10px] sm:text-[11px] font-mono text-purple-600 dark:text-purple-300 font-semibold truncate max-w-[200px] sm:max-w-none">
                      {origemPrecoInfo}
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-purple-900 dark:text-purple-200 bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                  💡 <strong>Dica:</strong> Selecione o ingrediente como você comprou no mercado (ex: o pacote fechado de 1kg ou a caixa de 395g) e o valor pago. Depois, na tabela abaixo, basta informar o quanto usou na receita!
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {/* LINHA 1: Ingrediente / Insumo (100% de largura) */}
                <div className="w-full relative">
                  <Label className="text-xs font-bold whitespace-nowrap block mb-1.5">
                    Ingrediente / Insumo
                  </Label>
                  <Input
                    placeholder="Ex: Chocolate Melken, Leite Condensado..."
                    value={novoInsumoNome}
                    onChange={(e) => {
                      setNovoInsumoNome(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    className="h-10 text-xs w-full"
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

                {/* LINHA 2: Valores - Preço do produto / Qtd Embalagem / Qtd Receita em Grid 3 Colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 items-end w-full">
                  {/* Preço do produto */}
                  <div className="min-w-0">
                    <Label className="text-xs font-bold whitespace-nowrap block mb-1.5" title="Valor pago no produto/embalagem">
                      Preço do produto
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      className="h-10 text-xs font-mono font-bold w-full"
                      value={novoInsumoPrecoFormatado}
                      onChange={(e) => setNovoInsumoPrecoFormatado(aplicarMascaraMoedaInput(e.target.value))}
                    />
                  </div>

                  {/* Qtd Embalagem com dropdown de Unidade de Compra */}
                  <div className="min-w-0">
                    <Label className="text-xs font-bold whitespace-nowrap block mb-1.5" title="Quantidade contida na embalagem original de compra">
                      Qtd Embalagem
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        className="h-10 text-xs font-semibold text-center flex-1 min-w-[70px]"
                        value={novoInsumoQtdOriginalStr}
                        onChange={(e) => {
                          setNovoInsumoQtdOriginalStr(e.target.value);
                          setNovoInsumoQtdOriginal(parseNumberInput(e.target.value));
                        }}
                      />
                      <Select
                        value={novoInsumoUnidadeCompra}
                        onValueChange={(val: any) => setNovoInsumoUnidadeCompra(val)}
                      >
                        <SelectTrigger className="h-10 w-24 shrink-0 text-xs px-2.5 font-bold bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="l">L</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="un">Unid.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Qtd Receita com dropdown de Unidade de Uso */}
                  <div className="min-w-0">
                    <Label className="text-xs font-bold whitespace-nowrap block mb-1.5 text-purple-700 dark:text-purple-300" title="Quantidade utilizada nesta receita">
                      Qtd na Receita
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="100"
                        className="h-10 text-xs font-bold text-center text-purple-700 dark:text-purple-300 border-purple-500/40 flex-1 min-w-[70px]"
                        value={novoInsumoQtdStr}
                        onChange={(e) => {
                          setNovoInsumoQtdStr(e.target.value);
                          setNovoInsumoQtd(parseNumberInput(e.target.value));
                        }}
                      />
                      <Select
                        value={novoInsumoUnidade}
                        onValueChange={(val: any) => setNovoInsumoUnidade(val)}
                      >
                        <SelectTrigger className="h-10 w-24 shrink-0 text-xs px-2.5 font-bold bg-background text-purple-600 dark:text-purple-300 border-purple-500/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="l">L</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="un">Unid.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* LINHA 3: Botão de Adicionar Insumo isolado abaixo */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleAdicionarInsumo}
                    className="w-full sm:w-auto h-10 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Insumo à Receita</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTA DE INSUMOS RESPONSIVA (CARDS NO CELULAR / TABELA NO DESKTOP) */}
          <div className="space-y-3">
            {/* VISTA MOBILE: CARDS EMPILHADOS */}
            <div className="space-y-3 block sm:hidden">
              {itens.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs bg-card rounded-xl border border-border">
                  Nenhum ingrediente adicionado à receita ainda. Digite acima para começar.
                </div>
              ) : (
                itens.map((item) => {
                  const precoEmbVal = item.precoEmbalagem ?? item.precoUnitarioAplicado ?? 0;
                  const qtdEmbOrigVal =
                    item.qtdEmbalagemOriginal ?? 1;

                  return (
                    <div key={item.id} className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <span className="font-extrabold text-sm text-foreground truncate">{item.insumoNome}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverItem(item.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {/* Preço do produto */}
                        <div>
                          <Label className="text-xs font-bold text-muted-foreground mb-1 block">Preço do produto (R$)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="R$ 0,00"
                            className="h-9 text-xs font-mono font-bold w-full"
                            value={precoEmbVal ? formatarMoeda(precoEmbVal) : ""}
                            onChange={(e) => {
                              const masked = aplicarMascaraMoedaInput(e.target.value);
                              const num = converterMoedaInputParaNumero(masked);
                              handleAtualizarItemExistente(item.id, "precoEmbalagem", num);
                              handleAtualizarItemExistente(item.id, "precoUnitarioAplicado", num);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Qtd Embalagem + Unidade de Compra */}
                          <div>
                            <Label className="text-xs font-bold text-muted-foreground mb-1 block">Qtd Embalagem</Label>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-9 text-xs font-semibold text-center flex-1 min-w-0"
                                value={qtdEmbOrigVal}
                                onChange={(e) =>
                                  handleAtualizarItemExistente(
                                    item.id,
                                    "qtdEmbalagemOriginal",
                                    parseNumberInput(e.target.value)
                                  )
                                }
                              />
                              <Select
                                value={item.unidadeEmbalagem || (item.unidadeMedida === "g" || item.unidadeMedida === "ml" ? "kg" : item.unidadeMedida)}
                                onValueChange={(val) => handleAtualizarItemExistente(item.id, "unidadeEmbalagem", val)}
                              >
                                <SelectTrigger className="h-9 text-xs w-20 px-2 shrink-0 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">Kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="l">L</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="un">Unid.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Qtd na Receita + Unidade de Uso */}
                          <div>
                            <Label className="text-xs font-bold text-purple-600 dark:text-purple-300 mb-1 block">Qtd na Receita</Label>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-9 text-xs font-bold text-center text-purple-700 dark:text-purple-300 border-purple-500/40 flex-1 min-w-0"
                                value={item.quantidadeUsada}
                                onChange={(e) =>
                                  handleAtualizarItemExistente(
                                    item.id,
                                    "quantidadeUsada",
                                    parseNumberInput(e.target.value)
                                  )
                                }
                              />
                              <Select
                                value={item.unidadeMedida}
                                onValueChange={(val) => handleAtualizarItemExistente(item.id, "unidadeMedida", val)}
                              >
                                <SelectTrigger className="h-9 text-xs w-20 px-2 shrink-0 font-bold text-purple-600 dark:text-purple-300 border-purple-500/40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">Kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="l">L</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="un">Unid.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="font-bold text-muted-foreground">Custo na Receita:</span>
                        <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatarMoeda(item.custoTotalItem)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {itens.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-purple-900 dark:text-purple-200 uppercase">Total Insumos Receita:</span>
                  <span className="font-black text-sm font-mono text-purple-700 dark:text-purple-300">
                    {formatarMoeda(totaisCalculados.custoInsumosTotal)}
                  </span>
                </div>
              )}
            </div>

            {/* VISTA DESKTOP: TABELA (100% visível sem rolagem horizontal) */}
            <div className="hidden sm:block border border-border rounded-xl shadow-2xs bg-card overflow-hidden w-full">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-muted/60">
                  <TableRow className="border-b border-border">
                    <TableHead className="py-2.5 px-2 text-left text-xs font-bold">Ingrediente / Insumo</TableHead>
                    <TableHead className="w-24 py-2.5 px-1 text-left text-xs font-bold">Preço (R$)</TableHead>
                    <TableHead className="w-36 py-2.5 px-1 text-center text-xs font-bold">Qtd Embalagem</TableHead>
                    <TableHead className="w-36 py-2.5 px-1 text-center text-xs font-bold">Qtd na Receita</TableHead>
                    <TableHead className="w-24 py-2.5 px-2 text-right text-xs font-bold">Custo Total</TableHead>
                    <TableHead className="w-9 py-2.5 px-1 text-center"></TableHead>
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
                    itens.map((item) => {
                      const precoEmbVal = item.precoEmbalagem ?? item.precoUnitarioAplicado ?? 0;
                      const qtdEmbOrigVal = item.qtdEmbalagemOriginal ?? 1;

                      return (
                        <TableRow key={item.id} className="border-b border-border/60 hover:bg-muted/30">
                          {/* Nome do Ingrediente com quebra de linha permitida */}
                          <TableCell className="py-2 px-2 text-xs font-semibold text-foreground whitespace-normal break-words leading-tight">
                            {item.insumoNome}
                          </TableCell>

                          {/* Preço do produto */}
                          <TableCell className="py-2 px-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              className="h-8 text-xs font-mono font-bold w-full px-1.5"
                              value={precoEmbVal ? formatarMoeda(precoEmbVal) : ""}
                              onChange={(e) => {
                                const masked = aplicarMascaraMoedaInput(e.target.value);
                                const num = converterMoedaInputParaNumero(masked);
                                handleAtualizarItemExistente(item.id, "precoEmbalagem", num);
                                handleAtualizarItemExistente(item.id, "precoUnitarioAplicado", num);
                              }}
                            />
                          </TableCell>

                          {/* Qtd Embalagem Original com Dropdown de Unidade de Compra */}
                          <TableCell className="py-2 px-1">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8 text-xs font-semibold w-14 text-center px-1 shrink-0"
                                value={qtdEmbOrigVal}
                                onChange={(e) =>
                                  handleAtualizarItemExistente(
                                    item.id,
                                    "qtdEmbalagemOriginal",
                                    parseNumberInput(e.target.value)
                                  )
                                }
                              />
                              <Select
                                value={item.unidadeEmbalagem || (item.unidadeMedida === "g" || item.unidadeMedida === "ml" ? "kg" : item.unidadeMedida)}
                                onValueChange={(val) => handleAtualizarItemExistente(item.id, "unidadeEmbalagem", val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[68px] px-1 shrink-0 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">Kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="l">L</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="un">Unid.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>

                          {/* Qtd Usada na Receita com Dropdown de Unidade de Uso */}
                          <TableCell className="py-2 px-1">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8 text-xs font-bold w-14 text-center text-purple-700 dark:text-purple-300 px-1 border-purple-500/40 shrink-0"
                                value={item.quantidadeUsada}
                                onChange={(e) =>
                                  handleAtualizarItemExistente(
                                    item.id,
                                    "quantidadeUsada",
                                    parseNumberInput(e.target.value)
                                  )
                                }
                              />
                              <Select
                                value={item.unidadeMedida}
                                onValueChange={(val) => handleAtualizarItemExistente(item.id, "unidadeMedida", val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[68px] px-1 shrink-0 font-bold text-purple-600 dark:text-purple-300 border-purple-500/40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">Kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="l">L</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="un">Unid.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>

                          {/* Custo Total */}
                          <TableCell className="py-2 px-2 text-right font-black font-mono text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatarMoeda(item.custoTotalItem)}
                          </TableCell>

                          {/* Ação */}
                          <TableCell className="py-2 px-1 text-center">
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
                      );
                    })
                  )}
                </TableBody>
                {itens.length > 0 && (
                  <TableFooter className="bg-purple-500/10 border-t-2 border-purple-500/30">
                    <TableRow>
                      <TableCell colSpan={4} className="font-extrabold text-xs text-purple-900 dark:text-purple-200 uppercase tracking-wider py-3 px-2">
                        Total Insumos / Custo da Receita:
                      </TableCell>
                      <TableCell className="text-right font-black text-sm font-mono text-purple-700 dark:text-purple-300 py-3 px-2 whitespace-nowrap">
                        {formatarMoeda(totaisCalculados.custoInsumosTotal)}
                      </TableCell>
                      <TableCell className="py-3 px-1"></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </div>

          {/* BLOCO DE DESTAQUE: CUSTO TOTAL DA RECEITA (APENAS INSUMOS) */}
          <div className="p-3.5 bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-purple-500/15 border-2 border-purple-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 dark:text-purple-200">
                    Custo Total da Receita (Insumos)
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 font-extrabold">
                    {itens.length} ingrediente(s)
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Soma direta do custo proporcional de todos os insumos utilizados (sem custos operacionais ou margem).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end w-full sm:w-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Custo Base dos Insumos:
              </span>
              <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300">
                {formatarMoeda(totaisCalculados.custoInsumosTotal)}
              </span>
            </div>
          </div>

          {/* PARÂMETROS DE RENDIMENTO & MARGEM DE LUCRO */}
          <Card className="border-border bg-gradient-to-r from-muted/40 via-card to-muted/40">
            <CardContent className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Rendimento (Peças/Bolo)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rendimentoQtd}
                  onChange={(e) => setRendimentoQtd(parseNumberInput(e.target.value) || 1)}
                />
                <span className="text-[10px] text-muted-foreground">Ex: 100 coxinhas, 50 brigadeiros</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Custos Operacionais (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={custosOperacionaisPerc}
                  onChange={(e) => setCustosOperacionaisPerc(parseNumberInput(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">Gás, energia, água e embalagem</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Margem de Lucro (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={margemLucroPerc}
                  onChange={(e) => setMargemLucroPerc(parseNumberInput(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">Ex: 100% de lucro sobre custos</span>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO: PREÇO PERSONALIZADO E COMPARATIVO DE LUCRO */}
          <Card className="border-purple-500/30 bg-purple-500/5 shadow-xs">
            <CardContent className="p-3.5 sm:p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-purple-600" /> Escolha de Preço &amp; Lucro
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Escolha entre o preço sugerido ou digite seu valor personalizado.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border w-full sm:w-auto justify-between">
                  <Button
                    type="button"
                    size="sm"
                    variant={opcaoPrecoUsar === "sugerido" ? "default" : "ghost"}
                    onClick={() => setOpcaoPrecoUsar("sugerido")}
                    className="h-7 text-[11px] sm:text-xs font-bold flex-1 sm:flex-initial"
                  >
                    Usar Sugerido ({formatarMoeda(precoSugeridoEfetivo)})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={opcaoPrecoUsar === "personalizado" ? "default" : "ghost"}
                    onClick={() => setOpcaoPrecoUsar("personalizado")}
                    className="h-7 text-[11px] sm:text-xs font-bold flex-1 sm:flex-initial"
                  >
                    Usar Personalizado
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* CARD DO PREÇO SUGERIDO */}
                <div
                  onClick={() => setOpcaoPrecoUsar("sugerido")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    opcaoPrecoUsar === "sugerido"
                      ? "bg-purple-600/10 border-purple-500 ring-2 ring-purple-500/30"
                      : "bg-card border-border hover:border-purple-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Preço Sugerido (IA)</span>
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold">
                      Margem {margemLucroPerc}%
                    </Badge>
                  </div>
                  <p className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 mt-1">
                    {formatarMoeda(precoSugeridoEfetivo)}
                    {rendimentoQtd > 1 && <span className="text-xs text-muted-foreground font-normal"> /un</span>}
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Lucro Estimado:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{formatarMoeda(comparativoLucro.lucroSugeridoVal)} ({comparativoLucro.percSugerido}%)
                    </span>
                  </div>
                </div>

                {/* CARD DO PREÇO PERSONALIZADO */}
                <div
                  onClick={() => setOpcaoPrecoUsar("personalizado")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    opcaoPrecoUsar === "personalizado"
                      ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30"
                      : "bg-card border-border hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-bold text-foreground">Preço Personalizado *</Label>
                    <span className="text-[10px] text-muted-foreground">Digite seu valor</span>
                  </div>

                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={precoPersonalizadoFormatado}
                    onChange={(e) => {
                      const masked = aplicarMascaraMoedaInput(e.target.value);
                      setPrecoPersonalizadoFormatado(masked);
                      setOpcaoPrecoUsar("personalizado");
                    }}
                    className="h-9 text-base font-black font-mono text-foreground bg-background border-emerald-500/40 focus:border-emerald-600"
                  />

                  <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Lucro Estimado:</span>
                    <span className={`font-extrabold font-mono ${
                      comparativoLucro.lucroPersonalizadoVal <= 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {comparativoLucro.lucroPersonalizadoVal >= 0 ? "+" : ""}
                      {formatarMoeda(comparativoLucro.lucroPersonalizadoVal)} ({comparativoLucro.percPersonalizado}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* AVISO DE PREJUÍZO OBJETIVO */}
              {comparativoLucro.lucroPersonalizadoVal < 0 && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    <strong>Atenção (Prejuízo Detectado):</strong> O preço personalizado de {formatarMoeda(precoPersonalizadoNum)} resulta em prejuízo de {formatarMoeda(Math.abs(comparativoLucro.lucroPersonalizadoVal))} ({comparativoLucro.percPersonalizado}%).
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUADROS DE RESUMO FINANCEIRO COMPACTOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <Card className="bg-purple-500/10 border-purple-500/30 shadow-2xs">
              <CardContent className="p-2 sm:p-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <PieChart className="w-3 h-3" /> Custo Insumos
                </span>
                <p className="text-sm sm:text-base font-black font-mono text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoInsumosTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/10 border-amber-500/30 shadow-2xs">
              <CardContent className="p-2 sm:p-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Custo Receita
                </span>
                <p className="text-sm sm:text-base font-black font-mono text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoTotalReceita)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/30 shadow-2xs">
              <CardContent className="p-2 sm:p-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Calculator className="w-3 h-3" /> Custo Unitário
                </span>
                <p className="text-sm sm:text-base font-black font-mono text-foreground mt-0.5">
                  {formatarMoeda(totaisCalculados.custoUnitarioItem)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/15 border-emerald-500/40 shadow-2xs">
              <CardContent className="p-2 sm:p-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Preço Sugerido
                </span>
                <p className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {rendimentoQtd > 1
                    ? `${formatarMoeda(totaisCalculados.precoVendaSugeridoUnitario)}/un`
                    : formatarMoeda(totaisCalculados.precoVendaSugeridoLote)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* BANNER DE AVISO E RESPONSABILIDADE */}
          <div className="p-3 bg-muted/60 border border-border rounded-xl text-[11px] leading-relaxed text-muted-foreground flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Aviso Importante:</strong> Esta ferramenta de precificação é um auxílio gerencial. Recomendamos a conferência periódica dos custos.
            </p>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="p-3.5 sm:p-5 border-t border-border bg-card shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            Preço Atual no Cardápio: <strong className="text-foreground font-mono">{formatarMoeda(produto.preco)}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-1/3 sm:w-auto">
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEAplicarPreco}
              disabled={salvando || itens.length === 0}
              className="w-2/3 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplicar ({formatarMoeda(precoFinalSalvar)})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
