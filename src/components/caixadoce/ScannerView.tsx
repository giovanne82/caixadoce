import { useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Trash2,
  Plus,
  Clock,
  FileText,
  MessageCircle,
  Eye,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type Encomenda,
  type ListaCompras,
} from "@/lib/caixadoce-data";
import { processarNotinhaComOCR } from "@/lib/ocr-service";
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
  onSalvarDespesa,
}: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Scanner e Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");

  // Modal de Revisão dos Dados Extraídos
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false);

  // Modal de Visualização de Detalhes da Notinha
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [registroDetalhes, setRegistroDetalhes] = useState<DespesaNotaFiscal | null>(null);

  const abrirDetalhesRegistro = (registro: DespesaNotaFiscal) => {
    setRegistroDetalhes(registro);
    setModalDetalhesOpen(true);
  };

  const compartilharNotinhaWhatsApp = (despesa: DespesaNotaFiscal) => {
    const docTexto = despesa.numeroNota ? `\n📄 *Nº Documento:* ${despesa.numeroNota}` : "";
    const horaTexto = despesa.horaCompra ? ` às ${despesa.horaCompra}` : "";
    const mensagem = `*Resumo da Compra* 🧾\n🏪 *Estabelecimento:* ${despesa.fornecedorNome}${docTexto}\n📅 *Data:* ${despesa.dataCompra}${horaTexto}\n💰 *Total:* ${formatarMoeda(despesa.valorTotal)}`;
    const textoCodificado = encodeURIComponent(mensagem);
    window.open(`https://api.whatsapp.com/send?text=${textoCodificado}`, "_blank");
  };

  // Metadados Fiscais Extraídos
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorEndereco, setFornecedorEndereco] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
  const [horaCompra, setHoraCompra] = useState("14:35:10");

  const [itensExtraidos, setItensExtraidos] = useState<ItemNotaFiscal[]>([]);
  const [salvando, setSalvando] = useState(false);

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
      processarOCRReal(file);
    }
  };

  // Leitura com IA do Google Gemini (extractReceiptDataWithGemini)
  const processarOCRReal = async (file: File) => {
    setIsScanning(true);
    setScanStepMessage("Processando notinha...");

    try {
      const res = await processarNotinhaComOCR(file, (msg) => {
        setScanStepMessage(msg);
      });

      setIsScanning(false);
      setFornecedorNome(res.fornecedorNome);
      setFornecedorEndereco(res.fornecedorEndereco);
      setNumeroNota(res.numeroNota);
      setNumeroPedido(res.numeroPedido);
      setDataCompra(res.dataCompra);
      setHoraCompra(res.horaCompra);
      setItensExtraidos(res.itens);
      setModalRevisaoOpen(true);
      if (res.itens.length === 0) {
        toast.info("Não foi possível identificar os produtos automaticamente. Adicione os itens no modal abaixo.");
      } else {
        toast.success(`Leitura de notinha concluída! ${res.itens.length} item(ns) identificado(s). 🎉`);
      }
    } catch (e: any) {
      setIsScanning(false);
      toast.error(e.message || "Nossa Inteligência Artificial está com alto volume de processamento no momento. Por favor, tente enviar novamente em instantes ou mais tarde.");
    }
  };

  // Edição Simplificada dos Itens (Nome, Qtd, Valor Total)
  const handleEditarItem = (itemId: string, campo: keyof ItemNotaFiscal, valor: any) => {
    setItensExtraidos((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const atualizado = { ...item, [campo]: valor };
        if (campo === "quantidade" || campo === "valorTotal") {
          const qtd = campo === "quantidade" ? Number(valor) : item.quantidade;
          const total = campo === "valorTotal" ? Number(valor) : item.valorTotal;
          atualizado.valorUnitario = qtd > 0 ? parseFloat((total / qtd).toFixed(2)) : total;
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
      const cat = item.categoria || categorizarItemAutomatico(item.nome);
      if (cat === "producao") producao += v;
      else if (cat === "utensilios") utensilios += v;
      else if (cat === "consumo_proprio") consumoProprio += v;
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
      toast.error("Informe o estabelecimento e certifique-se de que há itens na notinha.");
      return;
    }

    setSalvando(true);
    try {
      const itensComFallback = itensExtraidos.map((item) => ({
        ...item,
        valorUnitario: item.valorUnitario || (item.quantidade > 0 ? parseFloat((item.valorTotal / item.quantidade).toFixed(2)) : item.valorTotal),
        categoria: item.categoria || categorizarItemAutomatico(item.nome),
      }));

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
        itens: itensComFallback,
      });

      setModalRevisaoOpen(false);
      toast.success("Notinha salva no caixa com sucesso!");
    } catch (e: any) {
      toast.error(`Erro ao salvar notinha: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const ultimosRegistros = despesas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Escanear Notinha <Camera className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Envie a foto ou PDF do cupom fiscal para ler itens e extrair metadados automaticamente.
          </p>
        </div>
      </div>

      {/* 1. ÁREA DE UPLOAD CENTRALIZADA E LIMPA */}
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

      {/* 2. ÚLTIMOS REGISTROS CAPTURADOS */}
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
                <TableHead className="text-xs font-bold w-36">Data</TableHead>
                <TableHead className="text-xs font-bold">Nome do Estabelecimento</TableHead>
                <TableHead className="text-xs font-bold text-right w-36">Valor Total</TableHead>
                <TableHead className="text-xs font-bold text-center w-28">Compartilhar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimosRegistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhuma notinha capturada ainda. Envie uma foto acima para começar!
                  </TableCell>
                </TableRow>
              ) : (
                ultimosRegistros.map((d) => (
                  <TableRow
                    key={d.id}
                    onClick={() => abrirDetalhesRegistro(d)}
                    className="cursor-pointer hover:bg-purple-50/50 transition-colors group"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div>{d.dataCompra}</div>
                      {d.horaCompra && <div className="text-[10px] text-muted-foreground/70">{d.horaCompra}</div>}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      <div>{d.fornecedorNome}</div>
                      {d.numeroNota && <div className="text-[10px] text-muted-foreground font-mono font-normal">Doc: {d.numeroNota}</div>}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-emerald-600 text-right">
                      {formatarMoeda(d.valorTotal)}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          compartilharNotinhaWhatsApp(d);
                        }}
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full inline-flex items-center justify-center"
                        title="Compartilhar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SIMPLIFICADO E LIMPO DE REVISÃO DA NOTINHA */}
      {/* ========================================================================= */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> Revisar Dados da Notinha Lida
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confira os dados extraídos pelo OCR e edite os itens da notinha antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Metadados Fiscais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-1 sm:col-span-2">
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
                <Label htmlFor="sc-doc" className="text-xs font-semibold">
                  Nº do Documento (NF / Pedido / Cupom)
                </Label>
                <Input
                  id="sc-doc"
                  value={numeroNota}
                  placeholder="ex: NF 000379"
                  onChange={(e) => setNumeroNota(e.target.value)}
                  className="h-8 text-xs font-medium font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Data e Hora da Compra
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    id="sc-data"
                    type="date"
                    value={dataCompra}
                    onChange={(e) => setDataCompra(e.target.value)}
                    className="h-8 text-xs px-2"
                  />
                  <Input
                    id="sc-hora"
                    type="text"
                    placeholder="HH:mm"
                    value={horaCompra}
                    onChange={(e) => setHoraCompra(e.target.value)}
                    className="h-8 text-xs px-2 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* TABELA SIMPLIFICADA DE ITENS IDENTIFICADOS (NOME, QUANTIDADE E VALOR TOTAL) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Itens Identificados na Notinha ({itensExtraidos.length}):
                </Label>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Nome do Item / Descrição</TableHead>
                      <TableHead className="text-xs w-20 text-center">Qtd</TableHead>
                      <TableHead className="text-xs w-28 text-right">Valor Total</TableHead>
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
                            value={item.valorTotal}
                            onChange={(e) => handleEditarItem(item.id, "valorTotal", e.target.value)}
                            className="h-7 text-xs text-right font-bold"
                          />
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

              <div className="pt-1">
                <Button variant="outline" size="sm" onClick={handleAdicionarItemManual} className="text-xs h-7">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
                </Button>
              </div>
            </div>

            {/* TOTAL DA NOTINHA EM DESTAQUE NO RODAPÉ */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F3EEF9] border border-[#8E7CC3]/30">
              <span className="text-xs font-extrabold text-[#5B478E] uppercase tracking-wider">
                Total da Notinha:
              </span>
              <span className="text-xl font-black text-[#2E1A47]">
                {formatarMoeda(totaisNota.total)}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRevisaoOpen(false)}
              className="text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarDespesaConfirmada}
              disabled={salvando}
              className="font-bold shadow-md bg-[#8E7CC3] hover:bg-[#7C69B3] text-white text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {salvando ? "Salvando..." : "Salvar Notinha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO DE DETALHES DA NOTINHA */}
      {/* ========================================================================= */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> Detalhes da Notinha Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visualização completa dos itens e metadados capturados da nota.
            </DialogDescription>
          </DialogHeader>

          {registroDetalhes && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <Label className="text-xs text-muted-foreground">Estabelecimento / Mercado</Label>
                  <p className="text-sm font-bold text-foreground">{registroDetalhes.fornecedorNome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Número do Documento</Label>
                  <p className="text-sm font-bold text-foreground font-mono">
                    {registroDetalhes.numeroNota || "Não informado"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Data e Hora da Compra</Label>
                  <p className="text-sm font-semibold text-foreground">
                    {registroDetalhes.dataCompra}{registroDetalhes.horaCompra ? ` às ${registroDetalhes.horaCompra}` : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Itens da Notinha ({registroDetalhes.itens?.length || 0}):
                </Label>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Descrição do Item</TableHead>
                        <TableHead className="text-xs font-bold text-center w-16">Qtd</TableHead>
                        <TableHead className="text-xs font-bold text-right w-24">Unitário</TableHead>
                        <TableHead className="text-xs font-bold text-right w-24">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!registroDetalhes.itens || registroDetalhes.itens.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                            Nenhum item discriminado nesta notinha.
                          </TableCell>
                        </TableRow>
                      ) : (
                        registroDetalhes.itens.map((item, idx) => (
                          <TableRow key={item.id || idx}>
                            <TableCell className="text-xs font-medium text-foreground">{item.nome}</TableCell>
                            <TableCell className="text-xs font-bold text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">
                              {formatarMoeda(item.valorUnitario || 0)}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-right text-foreground">
                              {formatarMoeda(item.valorTotal)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F3EEF9] border border-[#8E7CC3]/30">
                <span className="text-xs font-extrabold text-[#5B478E] uppercase tracking-wider">
                  TOTAL DA NOTINHA:
                </span>
                <span className="text-xl font-black text-[#2E1A47]">
                  {formatarMoeda(registroDetalhes.valorTotal)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (registroDetalhes) compartilharNotinhaWhatsApp(registroDetalhes);
              }}
              className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" /> Compartilhar no WhatsApp
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalDetalhesOpen(false)} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
