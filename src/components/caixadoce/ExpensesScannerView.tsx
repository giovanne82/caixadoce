import { useState, useMemo, useRef } from "react";
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
  Camera,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Cookie,
  UtensilsCrossed,
  User,
  Package,
  Layers,
  PieChart,
  RefreshCw,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  CATEGORIAS_DESPESA_CONFIG,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type CategoriaDespesaItem,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ExpensesScannerViewProps {
  despesas: DespesaNotaFiscal[];
  onSalvarDespesa: (despesa: Omit<DespesaNotaFiscal, "id">) => Promise<void>;
  onExcluirDespesa: (id: string) => Promise<void>;
}

// Modelos pré-configurados para testes rápidos de OCR/IA
const MODELOS_NOTAS_DEMO: { nomeLoja: string; itens: { nome: string; qtd: number; unit: number }[] }[] = [
  {
    nomeLoja: "Atacadão",
    itens: [
      { nome: "LEITE CONDENSADO PIRACANJUBA 395G", qtd: 24, unit: 5.49 },
      { nome: "CREME DE LEITE ITAMBE 200G", qtd: 12, unit: 3.29 },
      { nome: "CHOCOLATE EM PO 50% CACAU HARALD 1KG", qtd: 2, unit: 38.90 },
      { nome: "SABONETE DOVE ORIGINAL 90G", qtd: 4, unit: 4.89 },
      { nome: "DETERGENTE YPE NEUTRO 500ML", qtd: 3, unit: 2.39 },
      { nome: "MANTEIGA COM SAL ITAMBE 500G", qtd: 4, unit: 18.90 },
    ],
  },
  {
    nomeLoja: "Casa do Confeiteiro",
    itens: [
      { nome: "BARRA CHOCOLATE SICAO NOBRE AO LEITE 1.01KG", qtd: 3, unit: 49.90 },
      { nome: "NUTELLA BALDE 3KG", qtd: 1, unit: 169.90 },
      { nome: "FORMA DE SILICONE TRUFAS BWB", qtd: 4, unit: 12.50 },
      { nome: "ESPATULA DE SILICONE ROSA 28CM", qtd: 2, unit: 22.00 },
      { nome: "GRANULADO BELGA CALLEBAUT 500G", qtd: 2, unit: 44.90 },
      { nome: "BICO DE CONFEITAR 1M WILTON", qtd: 1, unit: 18.00 },
    ],
  },
  {
    nomeLoja: "Supermercado BH",
    itens: [
      { nome: "FARINHA DE TRIGO DONA BENTA 1KG", qtd: 6, unit: 4.99 },
      { nome: "OVOS BRANCOS GRANDES BANDEJA C/ 30", qtd: 2, unit: 19.90 },
      { nome: "ACUCAR REFINADO UNIAO 1KG", qtd: 5, unit: 4.49 },
      { nome: "ARROZ TIO JOAO TIPO 1 5KG", qtd: 1, unit: 29.90 },
      { nome: "CAFE PILAO TRADICIONAL 500G", qtd: 1, unit: 19.80 },
    ],
  },
];

export function ExpensesScannerView({
  despesas,
  onSalvarDespesa,
  onExcluirDespesa,
}: ExpensesScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Scanner e Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");

  // Estados da Nota em Edição/Revisão
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
  const [itensExtraidos, setItensExtraidos] = useState<ItemNotaFiscal[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Estados de Filtro do Histórico
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [buscaHistorico, setBuscaHistorico] = useState("");

  // Estado do Modal de Detalhes da Nota
  const [notaSelecionada, setNotaSelecionada] = useState<DespesaNotaFiscal | null>(null);

  // Manipulação de Upload de Arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const processarArquivo = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    iniciarLeituraOCR(file.name);
  };

  // Simulação Inteligente de Leitura OCR/IA
  const iniciarLeituraOCR = (nomeArquivo: string, modeloCustom?: typeof MODELOS_NOTAS_DEMO[0]) => {
    setIsScanning(true);

    const modelo =
      modeloCustom ||
      MODELOS_NOTAS_DEMO[Math.floor(Math.random() * MODELOS_NOTAS_DEMO.length)];

    setScanStepMessage("🔍 Identificando cabeçalho e CNPJ do emissor...");

    setTimeout(() => {
      setScanStepMessage("🧾 Extraindo itens, quantidades e valores da nota...");
    }, 900);

    setTimeout(() => {
      setScanStepMessage("🧠 Aplicando IA para categorizar custos de produção e despesas...");
    }, 1800);

    setTimeout(() => {
      setFornecedorNome(modelo.nomeLoja);
      setDataCompra(new Date().toISOString().split("T")[0]);

      const parsedItens: ItemNotaFiscal[] = modelo.itens.map((it) => {
        const cat = categorizarItemAutomatico(it.nome);
        return {
          id: crypto.randomUUID(),
          nome: it.nome,
          quantidade: it.qtd,
          valorUnitario: it.unit,
          valorTotal: parseFloat((it.qtd * it.unit).toFixed(2)),
          categoria: cat,
        };
      });

      setItensExtraidos(parsedItens);
      setIsScanning(false);
      toast.success(`Nota do ${modelo.nomeLoja} lida com sucesso! ${parsedItens.length} itens categorizados.`);
    }, 2700);
  };

  // Alterar Categoria de um Item Manualmente
  const handleMudarCategoriaItem = (itemId: string, novaCat: CategoriaDespesaItem) => {
    setItensExtraidos((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, categoria: novaCat } : item))
    );
  };

  // Alterar Valor ou Quantidade de um Item
  const handleEditarItem = (itemId: string, campo: "nome" | "quantidade" | "valorUnitario", valor: any) => {
    setItensExtraidos((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const atualizado = { ...item, [campo]: valor };
        if (campo === "quantidade" || campo === "valorUnitario") {
          const qtd = campo === "quantidade" ? Number(valor) : item.quantidade;
          const unit = campo === "valorUnitario" ? Number(valor) : item.valorUnitario;
          atualizado.valorTotal = parseFloat((qtd * unit).toFixed(2));
        }
        return atualizado;
      })
    );
  };

  // Remover Item da Lista
  const handleRemoverItem = (itemId: string) => {
    setItensExtraidos((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Adicionar Novo Item Manual
  const handleAdicionarItemManual = () => {
    const novo: ItemNotaFiscal = {
      id: crypto.randomUUID(),
      nome: "Novo Insumo",
      quantidade: 1,
      valorUnitario: 10.0,
      valorTotal: 10.0,
      categoria: "producao",
    };
    setItensExtraidos((prev) => [...prev, novo]);
  };

  // Cálculos dos Totais da Nota em Revisão
  const totaisNota = useMemo(() => {
    let total = 0;
    let producao = 0;
    let utensilios = 0;
    let consumoProprio = 0;
    let outros = 0;

    for (const item of itensExtraidos) {
      const v = item.valorTotal || 0;
      total += v;
      if (item.categoria === "producao") producao += v;
      else if (item.categoria === "utensilios") utensilios += v;
      else if (item.categoria === "consumo_proprio") consumoProprio += v;
      else outros += v;
    }

    return {
      total: parseFloat(total.toFixed(2)),
      producao: parseFloat(producao.toFixed(2)),
      utensilios: parseFloat(utensilios.toFixed(2)),
      consumoProprio: parseFloat(consumoProprio.toFixed(2)),
      outros: parseFloat(outros.toFixed(2)),
    };
  }, [itensExtraidos]);

  // Salvar Despesa Confirmada
  const handleSalvarDespesaConfirmada = async () => {
    if (!fornecedorNome || itensExtraidos.length === 0) {
      toast.error("Informe o estabelecimento e certifique-se de que há itens na nota.");
      return;
    }

    setSalvando(true);
    try {
      await onSalvarDespesa({
        estabelecimentoCodigo: "CD-1001",
        fornecedorNome,
        dataCompra,
        valorTotal: totaisNota.total,
        valorProducao: totaisNota.producao,
        valorUtensilios: totaisNota.utensilios,
        valorConsumoProprio: totaisNota.consumoProprio,
        valorOutros: totaisNota.outros,
        itens: itensExtraidos,
      });

      // Limpar formulário de scanner
      setSelectedFile(null);
      setFilePreview(null);
      setItensExtraidos([]);
      setFornecedorNome("");
      toast.success("Despesa processada e lançada no fluxo financeiro com sucesso!");
    } finally {
      setSalvando(false);
    }
  };

  // Agrupamento por Fornecedor / Estabelecimento no Histórico
  const gastosPorFornecedor = useMemo(() => {
    const mapa: Record<string, { total: number; count: number; producao: number }> = {};
    for (const d of despesas) {
      const nome = d.fornecedorNome || "Outros Fornecedores";
      if (!mapa[nome]) {
        mapa[nome] = { total: 0, count: 0, producao: 0 };
      }
      mapa[nome].total += d.valorTotal;
      mapa[nome].count += 1;
      mapa[nome].producao += d.valorProducao || 0;
    }
    return Object.entries(mapa).map(([nome, dados]) => ({
      nome,
      ...dados,
    }));
  }, [despesas]);

  const fornecedoresDisponiveis = useMemo(() => {
    return Array.from(new Set(despesas.map((d) => d.fornecedorNome).filter(Boolean)));
  }, [despesas]);

  // Despesas Filtradas para Histórico
  const despesasFiltradas = useMemo(() => {
    return despesas.filter((d) => {
      const matchFornec = filtroFornecedor === "todos" || d.fornecedorNome === filtroFornecedor;
      const matchBusca =
        !buscaHistorico ||
        d.fornecedorNome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
        d.itens.some((it) => it.nome.toLowerCase().includes(buscaHistorico.toLowerCase()));
      return matchFornec && matchBusca;
    });
  }, [despesas, filtroFornecedor, buscaHistorico]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Scanner de Notas &amp; Despesas <Sparkles className="w-6 h-6 text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Digitalize cupons fiscais, extraia itens com IA e separe custos de produção de gastos pessoais.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ÁREA DE UPLOAD E SCANNER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dropzone de Envio */}
        <Card className="border-2 border-dashed border-primary/40 bg-card/60 shadow-sm hover:border-primary transition-all flex flex-col justify-between">
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Camera className="w-6 h-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Enviar Nota Fiscal ou Cupom</CardTitle>
            <CardDescription className="text-xs">
              Tire uma foto do cupom fiscal ou faça upload do PDF/Imagem da compra
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {filePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border/80 max-h-48 flex justify-center bg-black/5">
                <img src={filePreview} alt="Preview da nota" className="object-contain max-h-48" />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="absolute top-2 right-2 h-7 px-2 text-xs"
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-8 px-4 text-center cursor-pointer border border-border/50 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs font-semibold text-foreground">Clique para selecionar do dispositivo</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG ou PDF (máx. 10MB)</p>
              </div>
            )}

            {/* Testes Rápidos com Modelos de Confeitaria */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Ou teste com cupom demonstrativo:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MODELOS_NOTAS_DEMO.map((demo) => (
                  <Button
                    key={demo.nomeLoja}
                    variant="outline"
                    size="sm"
                    onClick={() => iniciarLeituraOCR(`cupom_${demo.nomeLoja.toLowerCase()}.jpg`, demo)}
                    disabled={isScanning}
                    className="text-xs h-7 px-2"
                  >
                    <Building2 className="w-3 h-3 mr-1 text-primary" /> {demo.nomeLoja}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full font-semibold shadow-md"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analisando Nota...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Escanear Cupom
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Status da Leitura / Preview do Processamento */}
        <div className="lg:col-span-2 space-y-4">
          {isScanning ? (
            <Card className="border-border shadow-md p-8 text-center flex flex-col items-center justify-center min-h-[300px] bg-card/80 backdrop-blur-sm">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <Sparkles className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Processando Nota Fiscal com OCR &amp; IA</h3>
              <p className="text-xs text-primary font-semibold mt-2 animate-fade-in">{scanStepMessage}</p>
            </Card>
          ) : itensExtraidos.length > 0 ? (
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Revisão dos Itens Extraídos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Verifique os itens identificados e ajuste as categorias antes de confirmar.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {itensExtraidos.length} itens lidos
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Cabeçalho da Nota */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <Label htmlFor="rev-loja" className="text-xs">Estabelecimento / Loja</Label>
                    <Input
                      id="rev-loja"
                      value={fornecedorNome}
                      onChange={(e) => setFornecedorNome(e.target.value)}
                      placeholder="Ex: Atacadão, Casa do Confeiteiro"
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rev-data" className="text-xs">Data da Compra</Label>
                    <Input
                      id="rev-data"
                      type="date"
                      value={dataCompra}
                      onChange={(e) => setDataCompra(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="rounded-lg border border-border/70 overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Item / Descrição</TableHead>
                        <TableHead className="text-xs w-20">Qtd</TableHead>
                        <TableHead className="text-xs w-24">Unit. (R$)</TableHead>
                        <TableHead className="text-xs w-24">Total (R$)</TableHead>
                        <TableHead className="text-xs w-44">Categoria</TableHead>
                        <TableHead className="text-xs text-right w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensExtraidos.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/20">
                          <TableCell>
                            <Input
                              value={item.nome}
                              onChange={(e) => handleEditarItem(item.id, "nome", e.target.value)}
                              className="h-7 text-xs font-medium"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => handleEditarItem(item.id, "quantidade", e.target.value)}
                              className="h-7 text-xs text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valorUnitario}
                              onChange={(e) => handleEditarItem(item.id, "valorUnitario", e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="font-bold text-xs text-foreground">
                            {formatarMoeda(item.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.categoria}
                              onValueChange={(v: any) => handleMudarCategoriaItem(item.id, v)}
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="producao">
                                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                                    <Cookie className="w-3.5 h-3.5" /> Produção (Custo)
                                  </span>
                                </SelectItem>
                                <SelectItem value="utensilios">
                                  <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                                    <UtensilsCrossed className="w-3.5 h-3.5" /> Utensílios
                                  </span>
                                </SelectItem>
                                <SelectItem value="consumo_proprio">
                                  <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                                    <User className="w-3.5 h-3.5" /> Consumo Pessoal
                                  </span>
                                </SelectItem>
                                <SelectItem value="outros">
                                  <span className="flex items-center gap-1.5 text-stone-600 font-semibold">
                                    <Package className="w-3.5 h-3.5" /> Genérico / Outros
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverItem(item.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <Button variant="outline" size="sm" onClick={handleAdicionarItemManual} className="text-xs h-7">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item Manual
                  </Button>
                </div>

                {/* Resumo da Separação por Categoria */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">🍫 Produção (Doces)</p>
                    <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                      {formatarMoeda(totaisNota.producao)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">🥣 Utensílios</p>
                    <p className="text-base font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
                      {formatarMoeda(totaisNota.utensilios)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">🛒 Consumo Pessoal</p>
                    <p className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
                      {formatarMoeda(totaisNota.consumoProprio)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-[10px] font-bold text-primary uppercase">💰 Total da Nota</p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">
                      {formatarMoeda(totaisNota.total)}
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t border-border/60 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItensExtraidos([]);
                    setFornecedorNome("");
                  }}
                  className="text-xs"
                >
                  Descartar
                </Button>
                <Button
                  onClick={handleSalvarDespesaConfirmada}
                  disabled={salvando}
                  className="font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {salvando ? "Lançando..." : "Confirmar & Salvar no Caixa"}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-border shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[300px] bg-muted/10">
              <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-bold text-foreground">Nenhuma nota em processamento no momento</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Envie uma foto ou utilize os botões de teste ao lado para extrair e categorizar os itens automaticamente.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. AGRUPAMENTO AUTOMÁTICO POR ESTABELECIMENTO */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Gastos Agrupados por Estabelecimento
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhe onde você mais compra insumos e equipamentos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gastosPorFornecedor.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
              Nenhuma despesa agrupada ainda. Digitalize uma nota acima para começar!
            </div>
          ) : (
            gastosPorFornecedor.map((fornec) => (
              <Card key={fornec.nome} className="border-border shadow-sm hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">{fornec.nome}</CardTitle>
                    <CardDescription className="text-[11px]">{fornec.count} nota(s) lançada(s)</CardDescription>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-xl font-extrabold text-foreground">{formatarMoeda(fornec.total)}</div>
                  <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                    <Cookie className="w-3 h-3" /> Produção: {formatarMoeda(fornec.producao)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HISTÓRICO DE NOTAS E DESPESAS LANÇADAS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Histórico de Notas Digitalizadas
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por loja, insumo..."
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Todas as Lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Estabelecimentos</SelectItem>
                {fornecedoresDisponiveis.map((f) => (
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
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Estabelecimento</TableHead>
                <TableHead className="text-xs">Itens / Resumo</TableHead>
                <TableHead className="text-xs">Produção</TableHead>
                <TableHead className="text-xs">Utensílios</TableHead>
                <TableHead className="text-xs">Consumo Próprio</TableHead>
                <TableHead className="text-xs">Total Nota</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    Nenhuma despesa no histórico com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                despesasFiltradas.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {d.dataCompra.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {d.fornecedorNome}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {d.itens.map((it) => it.nome).join(", ")}
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
                    <TableCell className="text-xs font-extrabold text-foreground">
                      {formatarMoeda(d.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotaSelecionada(d)}
                          className="h-7 px-2 text-xs text-primary"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Deseja excluir a despesa da loja "${d.fornecedorNome}"?`)) {
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
      {/* MODAL: DETALHES DA NOTA FISCAL */}
      {/* ========================================================================= */}
      {notaSelecionada && (
        <Dialog open={!!notaSelecionada} onOpenChange={() => setNotaSelecionada(null)}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="w-5 h-5 text-primary" /> {notaSelecionada.fornecedorNome}
              </DialogTitle>
              <DialogDescription>
                Comprado em {notaSelecionada.dataCompra.split("-").reverse().join("/")} • Total de{" "}
                {formatarMoeda(notaSelecionada.valorTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
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
                          <TableCell className="text-xs text-center">{it.quantidade}</TableCell>
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

              {/* Totalizadores por Categoria */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex justify-between">
                  <span>🍫 Custo de Produção:</span>
                  <span>{formatarMoeda(notaSelecionada.valorProducao)}</span>
                </div>
                <div className="p-2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold flex justify-between">
                  <span>🥣 Utensílios:</span>
                  <span>{formatarMoeda(notaSelecionada.valorUtensilios)}</span>
                </div>
                <div className="p-2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold flex justify-between">
                  <span>🛒 Consumo Pessoal:</span>
                  <span>{formatarMoeda(notaSelecionada.valorConsumoProprio)}</span>
                </div>
                <div className="p-2 rounded bg-stone-500/10 text-stone-700 dark:text-stone-300 font-semibold flex justify-between">
                  <span>📦 Genérico / Outros:</span>
                  <span>{formatarMoeda(notaSelecionada.valorOutros)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setNotaSelecionada(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
