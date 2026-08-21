import { useState, useMemo, useRef, useEffect } from "react";
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
  ShoppingCart,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  correlacionarInsumosComItensNota,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type CategoriaDespesaItem,
  type Encomenda,
  type ListaCompras,
  LISTAS_COMPRAS_PADRAO,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface ScannerViewProps {
  despesas: DespesaNotaFiscal[];
  encomendas?: Encomenda[];
  listasCompras?: ListaCompras[];
  onSalvarDespesa: (despesa: Omit<DespesaNotaFiscal, "id">) => Promise<void>;
  onConciliarInsumos?: (conciliacoes: { encomendaId: string; insumoId: string }[]) => Promise<void>;
  onConciliarListasCompras?: (listaIds: string[], itensNota: ItemNotaFiscal[]) => Promise<void>;
}

export function ScannerView({
  despesas,
  encomendas = [],
  listasCompras: listasProp,
  onSalvarDespesa,
  onConciliarInsumos,
  onConciliarListasCompras,
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
    insumoId: string;
    insumoNome: string;
    clienteNome: string;
    selecionado: boolean;
  }[]>([]);

  // Seleção Múltipla de Listas de Compras Ativas
  const [selectedListasIds, setSelectedListasIds] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Listas de compras ativas para seleção múltipla
  const listasAtivas = useMemo(() => {
    if (listasProp && listasProp.length > 0) {
      return listasProp.filter((l) => l.status === "ativa");
    }
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("caixadoce_listas_compras_v2_CD-1001");
        if (saved) {
          const parsed: ListaCompras[] = JSON.parse(saved);
          return parsed.filter((l) => l.status === "ativa");
        }
      }
    } catch {}
    return LISTAS_COMPRAS_PADRAO.filter((l) => l.status === "ativa");
  }, [listasProp]);

  // Inicializa a seleção com todas as listas ativas ao abrir o modal
  useEffect(() => {
    if (modalRevisaoOpen) {
      setSelectedListasIds(listasAtivas.map((l) => l.id));
    }
  }, [modalRevisaoOpen, listasAtivas]);

  // Manipular Upload do Arquivo (Foto / PDF)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      processarOCRSimulado(file);
    }
  };

  // Leitura OCR Simulado com Alta Precisão
  const processarOCRSimulado = (file: File) => {
    setIsScanning(true);
    setScanStepMessage("Lendo metadados do cupom fiscal...");

    setTimeout(() => {
      setScanStepMessage("Identificando insumos, embalagens e valores...");
    }, 1200);

    setTimeout(() => {
      setScanStepMessage("Sugerindo categorização automática para o caixa...");
    }, 2400);

    setTimeout(() => {
      setIsScanning(false);

      // Dados Simulados Extraídos
      const estNome = file.name.toLowerCase().includes("super") ? "Supermercado Doce Preço Ltda" : "Atacadão dos Confeiteiros S/A";
      setFornecedorNome(estNome);
      setFornecedorEndereco("Av. das Confeiteiras, 1500 - Centro");
      setNumeroNota(String(Math.floor(100000 + Math.random() * 900000)));
      setNumeroPedido(String(Math.floor(1000 + Math.random() * 9000)));
      setDataCompra(new Date().toISOString().split("T")[0]);
      setHoraCompra("14:35:10");

      // Itens lidos do cupom
      const mockItens: ItemNotaFiscal[] = [
        {
          id: crypto.randomUUID(),
          nome: "Leite Condensado Moça 395g",
          quantidade: 6,
          valorUnitario: 7.90,
          valorTotal: 47.40,
          categoria: categorizarItemAutomatico("Leite Condensado Moça 395g"),
        },
        {
          id: crypto.randomUUID(),
          nome: "Cobertura Harald Melken Ao Leite 1kg",
          quantidade: 2,
          valorUnitario: 34.50,
          valorTotal: 69.00,
          categoria: categorizarItemAutomatico("Cobertura Harald Melken Ao Leite 1kg"),
        },
        {
          id: crypto.randomUUID(),
          nome: "Chantilly Norcau 1L",
          quantidade: 4,
          valorUnitario: 14.20,
          valorTotal: 56.80,
          categoria: categorizarItemAutomatico("Chantilly Norcau 1L"),
        },
        {
          id: crypto.randomUUID(),
          nome: "Forma de Acetato BWB Coração lapidado",
          quantidade: 3,
          valorUnitario: 12.00,
          valorTotal: 36.00,
          categoria: categorizarItemAutomatico("Forma de Acetato BWB Coração lapidado"),
        },
      ];

      setItensExtraidos(mockItens);

      // Conciliação Sugerida com Encomendas da Agenda
      if (encomendas.length > 0) {
        const sugestoes = correlacionarInsumosComItensNota(encomendas, mockItens);
        setConciliacoesSugeridas(sugestoes.map((s) => ({ ...s, selecionado: true })));
      }

      setModalRevisaoOpen(true);
      toast.success("Leitura do cupom concluída com sucesso!");
    }, 3200);
  };

  // Edição de Campos dos Itens Extraídos
  const handleMudarCategoriaItem = (itemId: string, novaCategoria: CategoriaDespesaItem) => {
    setItensExtraidos((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, categoria: novaCategoria } : item))
    );
  };

  const handleEditarItem = (itemId: string, campo: keyof ItemNotaFiscal, valor: any) => {
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

  // Alternar Seleção de Conciliação de Encomendas
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

  // Salvar Despesa Confirmada & Executar Conciliação Múltipla com Listas de Compras
  const handleSalvarDespesaConfirmada = async () => {
    if (!fornecedorNome || itensExtraidos.length === 0) {
      toast.error("Informe o estabelecimento e certifique-se de que há itens na notinha.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Salva despesa com metadados completos no caixa
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

      // 2. Executa conciliação inteligente nas encomendas selecionadas
      if (onConciliarInsumos && conciliacoesSugeridas.length > 0) {
        const selecionadas = conciliacoesSugeridas
          .filter((c) => c.selecionado)
          .map((c) => ({ encomendaId: c.encomendaId, insumoId: c.insumoId }));

        if (selecionadas.length > 0) {
          await onConciliarInsumos(selecionadas);
        }
      }

      // 3. Executa conciliação inteligente em MÚLTIPLAS LISTAS DE COMPRAS ATIVAS
      if (selectedListasIds.length > 0) {
        try {
          const savedStr = localStorage.getItem("caixadoce_listas_compras_v2_CD-1001");
          let currentListas: ListaCompras[] = savedStr ? JSON.parse(savedStr) : LISTAS_COMPRAS_PADRAO;

          let totalConciliados = 0;
          const updated = currentListas.map((lista) => {
            if (!selectedListasIds.includes(lista.id)) return lista;
            const novosItens = lista.itens.map((item) => {
              if (item.comprado) return item;
              const match = itensExtraidos.some((itNota) =>
                itNota.nome.toLowerCase().includes(item.nome.toLowerCase()) ||
                item.nome.toLowerCase().includes(itNota.nome.toLowerCase())
              );
              if (match) {
                totalConciliados++;
                return { ...item, comprado: true };
              }
              return item;
            });

            const estsExistentes = lista.estabelecimentosVinculados || [];
            const novosEsts = estsExistentes.includes(fornecedorNome)
              ? estsExistentes
              : [...estsExistentes, fornecedorNome];

            return { ...lista, estabelecimentosVinculados: novosEsts, itens: novosItens };
          });

          localStorage.setItem("caixadoce_listas_compras_v2_CD-1001", JSON.stringify(updated));

          if (onConciliarListasCompras) {
            await onConciliarListasCompras(selectedListasIds, itensExtraidos);
          }

          if (totalConciliados > 0) {
            toast.success(`${totalConciliados} insumo(s) marcados como comprados em ${selectedListasIds.length} lista(s)! 🎉`);
          }
        } catch {}
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
          Envie a foto ou PDF do cupom fiscal para ler itens, extrair metadados e conciliar com múltiplas listas de compras.
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
      {/* 2. ÚLTIMOS REGISTROS CAPTURADOS */}
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
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.dataCompra}</TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{d.fornecedorNome}</TableCell>
                    <TableCell className="font-bold text-xs text-emerald-600 text-right">
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
      {/* MODAL DE REVISÃO E CONCILIAÇÃO MÚLTIPLA */}
      {/* ========================================================================= */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> Revisar Dados da Notinha Lida
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confira os dados extraídos pelo OCR, edite a categoria dos itens e selecione as listas de compras a vincular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Metadados Fiscais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-1">
                <Label htmlFor="sc-forn" className="text-xs font-semibold">
                  Estabelecimento / Mercado
                </Label>
                <Input
                  id="sc-forn"
                  value={fornecedorNome}
                  onChange={(e) => setFornecedorNome(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sc-data" className="text-xs font-semibold">
                  Data da Compra
                </Label>
                <Input
                  id="sc-data"
                  type="date"
                  value={dataCompra}
                  onChange={(e) => setDataCompra(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* SEÇÃO: VINCULAR ITENS A MÚLTIPLAS LISTAS DE COMPRAS PENDENTES */}
            <div className="p-3.5 rounded-2xl border-2 border-primary/40 bg-card space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-primary" /> Vincular itens a listas de compras pendentes:
                </Label>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {selectedListasIds.length} lista(s) selecionada(s)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Selecione as listas ativas onde os insumos correspondentes desta notinha serão marcados como comprados automaticamente:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {listasAtivas.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic col-span-full py-1">
                    Nenhuma lista de compras ativa encontrada.
                  </p>
                ) : (
                  listasAtivas.map((lista) => {
                    const isSelected = selectedListasIds.includes(lista.id);
                    const pendentes = lista.itens.filter((i) => !i.comprado).length;

                    return (
                      <label
                        key={lista.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground font-bold shadow-xs"
                            : "bg-muted/30 border-border text-stone-500 hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedListasIds((prev) => prev.filter((id) => id !== lista.id));
                            } else {
                              setSelectedListasIds((prev) => [...prev, lista.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{lista.nome}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {pendentes} item(ns) a comprar
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tabela de Itens Extraídos */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Itens Identificados na Notinha ({itensExtraidos.length}):</Label>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Insumo / Produto</TableHead>
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
              {salvando ? "Salvando..." : "Confirmar & Conciliar Listas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
