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
  Clock,
  Check,
  Tag,
  Receipt,
  FileText,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  correlacionarInsumosComItensNota,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type CategoriaDespesaItem,
  type Encomenda,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ScannerViewProps {
  despesas: DespesaNotaFiscal[];
  encomendas?: Encomenda[];
  onSalvarDespesa: (despesa: Omit<DespesaNotaFiscal, "id">) => Promise<void>;
  onConciliarInsumos?: (conciliacoes: { encomendaId: string; insumoId: string }[]) => Promise<void>;
}

export function ScannerView({
  despesas,
  encomendas = [],
  onSalvarDespesa,
  onConciliarInsumos,
}: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Scanner e Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");

  // Modal de Revisão dos Dados Extraídos
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false);

  // Metadados Fiscais Extraídos
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorEndereco, setFornecedorEndereco] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
  const [horaCompra, setHoraCompra] = useState("14:35:10");

  const [itensExtraidos, setItensExtraidos] = useState<ItemNotaFiscal[]>([]);
  const [conciliacoesSugeridas, setConciliacoesSugeridas] = useState<{
    encomendaId: string;
    clienteNome: string;
    insumoId: string;
    insumoNome: string;
    itemNotaNome: string;
    selecionado: boolean;
  }[]>([]);

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

  // Simulação de Leitura Inteligente OCR / IA com Metadados Completos
  const iniciarLeituraOCR = (nomeArquivo: string) => {
    setIsScanning(true);

    setScanStepMessage("🔍 Identificando CNPJ, razão social, número da nota e endereço...");

    setTimeout(() => {
      setScanStepMessage("🧾 Extraindo número do cupom, data/hora exata e itens com valores...");
    }, 700);

    setTimeout(() => {
      setScanStepMessage("🧠 Categorizando insumos e conciliando com sua Lista de Compras de Encomendas...");
    }, 1400);

    setTimeout(() => {
      const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const hojeData = new Date().toISOString().split("T")[0];

      // Metadados extraídos
      setFornecedorNome("ArtFesta Confeitaria & Embalagens");
      setFornecedorEndereco("Av. das Américas, 1200 - Loja 4 - Centro");
      setNumeroNota(`NFC-e 000.${Math.floor(100000 + Math.random() * 900000)}`);
      setNumeroPedido(`PED-${Math.floor(10000 + Math.random() * 90000)}`);
      setDataCompra(hojeData);
      setHoraCompra(horaAtual);

      // Itens reais de confeitaria
      const mockItens: { nome: string; qtd: number; unit: number }[] = [
        { nome: "COBERTURA HARALD MELKEN AO LEITE 1.01KG", qtd: 2, unit: 44.90 },
        { nome: "LEITE CONDENSADO MOÇA 395G", qtd: 12, unit: 6.89 },
        { nome: "CHANTILLY NORCAU CHANTY 1L", qtd: 3, unit: 18.50 },
        { nome: "CAKE BOARD MDF REDONDO 25CM", qtd: 4, unit: 5.20 },
        { nome: "GRANULADO BELGA CALLEBAUT 500G", qtd: 1, unit: 45.00 },
        { nome: "DETERGENTE YPE NEUTRO 500ML", qtd: 2, unit: 2.49 },
      ];

      const parsedItens: ItemNotaFiscal[] = mockItens.map((it) => {
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

      // Conciliação Inteligente com Encomendas Pendentes
      const matches = correlacionarInsumosComItensNota(parsedItens, encomendas);
      setConciliacoesSugeridas(matches.map((m) => ({ ...m, selecionado: true })));

      setIsScanning(false);
      setModalRevisaoOpen(true);
      toast.success("Notinha escaneada e metadados extraídos com sucesso!");
    }, 2100);
  };

  // Alterar Categoria de um Item Manualmente
  const handleMudarCategoriaItem = (itemId: string, novaCat: CategoriaDespesaItem) => {
    setItensExtraidos((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, categoria: novaCat } : item))
    );
  };

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

  const handleRemoverItem = (itemId: string) => {
    setItensExtraidos((prev) => prev.filter((it) => it.id !== itemId));
  };

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

  // Alternar Seleção de Conciliação
  const handleToggleConciliacao = (insumoId: string) => {
    setConciliacoesSugeridas((prev) =>
      prev.map((c) => (c.insumoId === insumoId ? { ...c, selecionado: !c.selecionado } : c))
    );
  };

  // Totais da Nota
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

  // Salvar Despesa Confirmada & Executar Conciliação
  const handleSalvarDespesaConfirmada = async () => {
    if (!fornecedorNome || itensExtraidos.length === 0) {
      toast.error("Informe o estabelecimento e certifique-se de que há itens na notinha.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Salva despesa com metadados completos
      await onSalvarDespesa({
        estabelecimentoCodigo: "CD-1001",
        fornecedorNome,
        fornecedorEndereco,
        numeroNota,
        numeroPedido,
        dataCompra,
        horaCompra,
        valorTotal: totaisNota.total,
        valorProducao: totaisNota.producao,
        valorUtensilios: totaisNota.utensilios,
        valorConsumoProprio: totaisNota.consumoProprio,
        valorOutros: totaisNota.outros,
        itens: itensExtraidos,
      });

      // 2. Executa conciliação inteligente dos insumos nas encomendas selecionadas
      if (onConciliarInsumos && conciliacoesSugeridas.length > 0) {
        const selecionadas = conciliacoesSugeridas
          .filter((c) => c.selecionado)
          .map((c) => ({ encomendaId: c.encomendaId, insumoId: c.insumoId }));

        if (selecionadas.length > 0) {
          await onConciliarInsumos(selecionadas);
          toast.success(`${selecionadas.length} insumo(s) marcados como Comprados nas Encomendas!`);
        }
      }

      setSelectedFile(null);
      setFilePreview(null);
      setItensExtraidos([]);
      setFornecedorNome("");
      setModalRevisaoOpen(false);
      toast.success("Notinha processada e salva no caixa com sucesso!");
    } finally {
      setSalvando(false);
    }
  };

  const ultimosRegistros = useMemo(() => despesas.slice(0, 10), [despesas]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          Escanear Notinha <Camera className="w-6 h-6 text-primary" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Envie a foto ou PDF do cupom fiscal para ler itens, extrair metadados e conciliar com a lista de compras.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. ÁREA DE UPLOAD CENTRALIZADA E LIMPA */}
      {/* ========================================================================= */}
      <Card className="border-2 border-dashed border-primary/40 bg-card/80 shadow-md">
        <CardContent className="p-8">
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
              <h3 className="text-lg font-bold text-foreground">Lendo e Processando Notinha...</h3>
              <p className="text-xs text-primary font-semibold animate-fade-in">{scanStepMessage}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-12 px-6 text-center cursor-pointer border border-border/70 rounded-2xl bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all flex flex-col items-center justify-center max-w-xl mx-auto"
            >
              <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-3">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h4 className="text-base font-extrabold text-foreground">
                Tirar foto ou selecionar PDF / Imagem da Notinha
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG ou PDF (comprovantes fiscais de compras)
              </p>
              <Button size="sm" className="mt-5 font-bold shadow-sm px-6 h-9">
                <Camera className="w-4 h-4 mr-2" /> Selecionar Arquivo da Notinha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. ÚLTIMOS REGISTROS CAPTURADOS (ESTRITAMENTE 3 COLUNAS) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Últimos Registros Capturados
          </h3>
          <span className="text-xs text-muted-foreground">
            {ultimosRegistros.length} registro(s) recente(s)
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
                    Nenhuma notinha capturada ainda. Envie uma foto acima para começar!
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
      {/* 3. MODAL: REVISÃO, METADADOS & CONCILIAÇÃO INTELIGENTE */}
      {/* ========================================================================= */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Receipt className="w-5 h-5 text-primary" /> Conferência dos Dados Extraídos da Notinha
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verifique os metadados fiscais, itens e as conciliações automáticas com suas encomendas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Metadados Fiscais Identificados */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Metadados Fiscais Identificados
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Estabelecimento *</Label>
                  <Input
                    value={fornecedorNome}
                    onChange={(e) => setFornecedorNome(e.target.value)}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Endereço do Estabelecimento</Label>
                  <Input
                    value={fornecedorEndereco}
                    onChange={(e) => setFornecedorEndereco(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">N° da Nota / Cupom</Label>
                  <Input
                    value={numeroNota}
                    onChange={(e) => setNumeroNota(e.target.value)}
                    placeholder="Ex: NFC-e 12345"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">N° do Pedido</Label>
                  <Input
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="Ex: PED-9821"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data da Compra</Label>
                  <Input
                    type="date"
                    value={dataCompra}
                    onChange={(e) => setDataCompra(e.target.value)}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora Exata</Label>
                  <Input
                    value={horaCompra}
                    onChange={(e) => setHoraCompra(e.target.value)}
                    placeholder="14:30:00"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* CARD DE CONCILIAÇÃO INTELIGENTE COM ENCOMENDAS */}
            {conciliacoesSugeridas.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    🎯 Conciliação Inteligente com a Lista de Compras ({conciliacoesSugeridas.length})
                  </h4>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    Baixa automática em encomendas
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Identificamos itens desta notinha que correspondem aos insumos pedidos para suas encomendas. Selecione os itens que deseja marcar como comprados:
                </p>

                <div className="space-y-1.5 pt-1">
                  {conciliacoesSugeridas.map((conc) => (
                    <div
                      key={`${conc.encomendaId}-${conc.insumoId}`}
                      onClick={() => handleToggleConciliacao(conc.insumoId)}
                      className={`cursor-pointer p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                        conc.selecionado
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-semibold"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                          conc.selecionado ? "bg-emerald-600 text-white" : "border border-muted-foreground"
                        }`}>
                          {conc.selecionado ? <Check className="w-3 h-3" /> : null}
                        </span>
                        <span>
                          <strong>{conc.insumoNome}</strong> &rarr; Encomenda de <em>{conc.clienteNome}</em>
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        Item na Nota: {conc.itemNotaNome}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabela de Itens */}
            <div className="rounded-lg border border-border/70 overflow-hidden max-h-[240px] overflow-y-auto">
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
                <p className="text-[10px] font-bold text-primary uppercase">💰 Total Notinha</p>
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
              {salvando ? "Salvando..." : "Confirmar & Conciliar Insumos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
