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
  Sparkles,
  CheckCircle2,
  Building2,
  Trash2,
  Plus,
  Cookie,
  UtensilsCrossed,
  User,
  Package,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type CategoriaDespesaItem,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ScannerViewProps {
  despesas: DespesaNotaFiscal[];
  onSalvarDespesa: (despesa: Omit<DespesaNotaFiscal, "id">) => Promise<void>;
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

export function ScannerView({ despesas, onSalvarDespesa }: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Scanner e Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");

  // Modal de Revisão dos Dados Extraídos
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
  const [itensExtraidos, setItensExtraidos] = useState<ItemNotaFiscal[]>([]);
  const [salvando, setSalvando] = useState(false);

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
    }, 800);

    setTimeout(() => {
      setScanStepMessage("🧠 Aplicando IA para categorizar custos de produção e despesas...");
    }, 1600);

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
      setModalRevisaoOpen(true);
      toast.success(`Nota do ${modelo.nomeLoja} lida com sucesso! ${parsedItens.length} itens categorizados.`);
    }, 2400);
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

      setSelectedFile(null);
      setFilePreview(null);
      setItensExtraidos([]);
      setFornecedorNome("");
      setModalRevisaoOpen(false);
      toast.success("Despesa processada e lançada no caixa com sucesso!");
    } finally {
      setSalvando(false);
    }
  };

  // Últimos registros capturados (exibe estritamente Data, Estabelecimento e Valor Total)
  const ultimosRegistros = useMemo(() => {
    return despesas.slice(0, 10);
  }, [despesas]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          Escanear Nota Fiscal <Camera className="w-6 h-6 text-primary" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Envie a foto ou PDF do cupom fiscal para ler e categorizar despesas automaticamente com IA.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. ÁREA SUPERIOR: UPLOAD E PROCESSAMENTO EXCLUSIVO */}
      {/* ========================================================================= */}
      <Card className="border-2 border-dashed border-primary/40 bg-card/80 shadow-md">
        <CardContent className="p-6 space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {isScanning ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <Sparkles className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Analisando Cupom Fiscal...</h3>
              <p className="text-xs text-primary font-semibold animate-fade-in">{scanStepMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Área de Clique / Drag & Drop */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="md:col-span-2 py-10 px-6 text-center cursor-pointer border border-border/70 rounded-2xl bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all flex flex-col items-center justify-center"
              >
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-3">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Clique para tirar foto ou selecionar imagem / PDF da nota
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: JPG, PNG ou PDF (máximo 10MB)
                </p>
                <Button size="sm" className="mt-4 font-semibold shadow-xs">
                  <Camera className="w-4 h-4 mr-1.5" /> Selecionar Nota
                </Button>
              </div>

              {/* Botões de Teste Rápido */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Ou teste agora com cupons modelo:
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Clique para simular a extração OCR de compras reais de confeitaria:
                  </p>
                </div>

                <div className="space-y-2">
                  {MODELOS_NOTAS_DEMO.map((demo) => (
                    <Button
                      key={demo.nomeLoja}
                      variant="outline"
                      size="sm"
                      onClick={() => iniciarLeituraOCR(`cupom_${demo.nomeLoja.toLowerCase()}.jpg`, demo)}
                      disabled={isScanning}
                      className="w-full justify-start text-xs h-8.5 font-medium hover:border-primary/50"
                    >
                      <Building2 className="w-3.5 h-3.5 mr-2 text-primary" />
                      {demo.nomeLoja}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. ÁREA INFERIOR: ÚLTIMOS REGISTROS CAPTURADOS (ESTRITAMENTE 3 COLUNAS) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Últimos Registros Capturados
          </h3>
          <span className="text-xs text-muted-foreground">
            {ultimosRegistros.length} nota(s) recente(s)
          </span>
        </div>

        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold w-40">Data</TableHead>
                <TableHead className="text-xs font-bold">Nome do Estabelecimento</TableHead>
                <TableHead className="text-xs font-bold text-right w-44">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimosRegistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhuma nota fiscal capturada ainda. Envie uma foto acima para começar!
                  </TableCell>
                </TableRow>
              ) : (
                ultimosRegistros.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {d.dataCompra.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> {d.fornecedorNome}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-xs text-foreground">
                      {formatarMoeda(d.valorTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REVISÃO E CONFIRMAÇÃO DA NOTA EXTRAÍDA */}
      {/* ========================================================================= */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" /> Conferência dos Itens Extraídos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verifique os itens identificados pela IA e ajuste as categorias antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
            <div className="rounded-lg border border-border/70 overflow-hidden max-h-[250px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs">Item / Descrição</TableHead>
                    <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                    <TableHead className="text-xs w-20">Unit.</TableHead>
                    <TableHead className="text-xs w-20">Total</TableHead>
                    <TableHead className="text-xs w-40">Categoria</TableHead>
                    <TableHead className="text-xs text-right w-8"></TableHead>
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
                                <Cookie className="w-3.5 h-3.5" /> Produção
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
                                <Package className="w-3.5 h-3.5" /> Outros
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
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
              </Button>
            </div>

            {/* Totalizadores por Categoria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">🍫 Produção</p>
                <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                  {formatarMoeda(totaisNota.producao)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">🥣 Utensílios</p>
                <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
                  {formatarMoeda(totaisNota.utensilios)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">🛒 Pessoal</p>
                <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
                  {formatarMoeda(totaisNota.consumoProprio)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <p className="text-[10px] font-bold text-primary uppercase">💰 Total Nota</p>
                <p className="text-sm font-extrabold text-foreground mt-0.5">
                  {formatarMoeda(totaisNota.total)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRevisaoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarDespesaConfirmada}
              disabled={salvando}
              className="font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {salvando ? "Salvando..." : "Confirmar & Lançar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
