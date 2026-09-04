import { useState, useMemo, useRef, useEffect } from "react";
import { registrarCompraInsumo } from "@/lib/ficha-tecnica-service";
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
  RefreshCw,
  ShoppingBag,
  Receipt,
  Zap,
  Link2,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  formatarMoeda,
  categorizarItemAutomatico,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  obterInsumosCadastrados,
  salvarInsumosCadastradosStorage,
  salvarMapeamentoDePara,
  encontrarVinculoDeParaAutomatico,
  atualizarCustoInsumoECascataFichas,
  normalizarNomeInsumo,
  type DespesaNotaFiscal,
  type ItemNotaFiscal,
  type Encomenda,
  type ListaCompras,
  type TransacaoFinanceira,
  type MetodoPagamento,
  type StatusTransacao,
  type InsumoCadastrado,
} from "@/lib/caixadoce-data";
import { useScanner } from "@/context/scanner-context";
import { useAuth } from "@/context/auth-context";
import { type ScanMode } from "@/lib/ocr-service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScannerViewProps {
  despesas: DespesaNotaFiscal[];
  transacoes?: TransacaoFinanceira[];
  encomendas?: Encomenda[];
  listasCompras?: ListaCompras[];
  onSalvarDespesa: (despesa: Omit<DespesaNotaFiscal, "id">) => Promise<void>;
  onSaveSuccess?: () => void;
  onSalvarTransacaoFinanceira?: (transacao: Omit<TransacaoFinanceira, "id">) => Promise<void>;
  onEditarDespesa?: (id: string, dados: Partial<DespesaNotaFiscal>) => Promise<void>;
  onExcluirDespesa?: (id: string) => Promise<void>;
  onReenviarFinanceiro?: (despesa: DespesaNotaFiscal) => Promise<void>;
  onConciliarInsumos?: (conciliacoes: { encomendaId: string; insumoId: string }[]) => Promise<void>;
  onConciliarListasCompras?: (listaIds: string[], itensNota: ItemNotaFiscal[]) => Promise<void>;
}

export function ScannerView({
  despesas,
  transacoes = [],
  onSalvarDespesa,
  onSaveSuccess,
  onSalvarTransacaoFinanceira,
  onEditarDespesa,
  onExcluirDespesa,
  onReenviarFinanceiro,
}: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contexto da Leitura (produtos vs despesa)
  const [scanMode, setScanMode] = useState<ScanMode>("produtos");

  // Estado Local do Modal de Confirmar Despesa / Conta de Consumo
  const [despesaCategoria, setDespesaCategoria] = useState<string>("Energia");
  const [despesaMetodoPagamento, setDespesaMetodoPagamento] = useState<MetodoPagamento>("pix");
  const [despesaStatus, setDespesaStatus] = useState<StatusTransacao>("concluida");
  const [despesaValorStr, setDespesaValorStr] = useState<string>("");

  // Contexto Global de Leitura OCR em Background
  const {
    isScanning,
    scanStepMessage,
    selectedFile,
    filePreview,
    extractedData,
    modalRevisaoOpen,
    setModalRevisaoOpen,
    processarArquivoOCR,
    limparScanner,
  } = useScanner();

  const { profile } = useAuth();
  const activeCode = profile?.establishmentCode || "";

  // Modal de Visualização de Detalhes da Notinha
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [registroDetalhes, setRegistroDetalhes] = useState<DespesaNotaFiscal | null>(null);
  const [editFornecedorNome, setEditFornecedorNome] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Modal de Confirmação de Exclusão
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [notaParaExcluir, setNotaParaExcluir] = useState<DespesaNotaFiscal | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const handleConfirmarExclusao = async () => {
    if (!notaParaExcluir) return;
    setExcluindo(true);
    try {
      if (onExcluirDespesa) {
        await onExcluirDespesa(notaParaExcluir.id);
      }
      setModalExcluirOpen(false);
      setNotaParaExcluir(null);
    } catch (e: any) {
      toast.error(`Erro ao excluir notinha: ${e.message}`);
    } finally {
      setExcluindo(false);
    }
  };

  const abrirDetalhesRegistro = (registro: DespesaNotaFiscal) => {
    setRegistroDetalhes(registro);
    setEditFornecedorNome(registro.fornecedorNome || "");
    setModalDetalhesOpen(true);
  };

  const handleSalvarEdicaoNotinha = async () => {
    if (!registroDetalhes || !editFornecedorNome.trim()) {
      toast.error("Informe o nome do estabelecimento.");
      return;
    }
    setSalvandoEdicao(true);
    try {
      if (onEditarDespesa) {
        await onEditarDespesa(registroDetalhes.id, { fornecedorNome: editFornecedorNome.trim() });
      }
      setRegistroDetalhes((prev) => (prev ? { ...prev, fornecedorNome: editFornecedorNome.trim() } : null));
      toast.success("Nome do estabelecimento atualizado!");
    } catch (e: any) {
      toast.error(`Erro ao atualizar notinha: ${e.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const compartilharNotinhaWhatsApp = (despesa: DespesaNotaFiscal) => {
    const docTexto = despesa.numeroNota ? `\n📄 *Nº Documento:* ${despesa.numeroNota}` : "";
    const horaTexto = despesa.horaCompra ? ` às ${despesa.horaCompra}` : "";
    const mensagem = `*Resumo da Compra* 🧾\n🏪 *Estabelecimento:* ${despesa.fornecedorNome}${docTexto}\n📅 *Data:* ${despesa.dataCompra}${horaTexto}\n💰 *Total:* ${formatarMoeda(despesa.valorTotal)}`;
    const textoCodificado = encodeURIComponent(mensagem);
    window.open(`https://api.whatsapp.com/send?text=${textoCodificado}`, "_blank");
  };

  // Metadados Fiscais Extraídos (Sincronizados com o Contexto Global)
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorEndereco, setFornecedorEndereco] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
  const [horaCompra, setHoraCompra] = useState("14:35:10");

  const [itensExtraidos, setItensExtraidos] = useState<ItemNotaFiscal[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Insumos Cadastrados da Loja & Memória de Vínculo De-Para
  const [insumosCadastrados, setInsumosCadastrados] = useState<InsumoCadastrado[]>([]);
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeCode) {
      setInsumosCadastrados(obterInsumosCadastrados(activeCode));
    }
  }, [activeCode]);

  useEffect(() => {
    const handleInsumosUpdate = () => {
      if (activeCode) {
        setInsumosCadastrados(obterInsumosCadastrados(activeCode));
      }
    };
    window.addEventListener("insumosUpdated", handleInsumosUpdate);
    return () => window.removeEventListener("insumosUpdated", handleInsumosUpdate);
  }, [activeCode]);

  const toggleExpandReceipt = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedReceipts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal de Cadastro Rápido de Insumo no Seletor De-Para
  const [modalCadastroRapidoOpen, setModalCadastroRapidoOpen] = useState(false);
  const [novoInsumoNome, setNovoInsumoNome] = useState("");
  const [novoInsumoUnidade, setNovoInsumoUnidade] = useState("kg");
  const [novoInsumoQtdEmb, setNovoInsumoQtdEmb] = useState("1");
  const [novoInsumoCustoStr, setNovoInsumoCustoStr] = useState("");
  const [novoInsumoFornecedor, setNovoInsumoFornecedor] = useState("");
  const [salvandoRapidoInsumo, setSalvandoRapidoInsumo] = useState(false);

  const [targetItemParaVincular, setTargetItemParaVincular] = useState<{
    despesaId: string;
    itemId: string;
    itemNome: string;
    fornecedorNome: string;
    valorTotal: number;
    quantidade: number;
  } | null>(null);

  const handleAbrirCadastroRapidoInsumo = (itemContext: {
    despesaId: string;
    itemId: string;
    itemNome: string;
    fornecedorNome: string;
    valorTotal: number;
    quantidade: number;
  }) => {
    setTargetItemParaVincular(itemContext);
    const nomeLimpo = normalizarNomeInsumo(itemContext.itemNome);
    setNovoInsumoNome(nomeLimpo);

    const qtd = itemContext.quantidade > 0 ? itemContext.quantidade : 1;
    const valUnit = itemContext.valorTotal > 0 ? parseFloat((itemContext.valorTotal / qtd).toFixed(2)) : itemContext.valorTotal;

    setNovoInsumoQtdEmb(String(qtd));
    setNovoInsumoUnidade("un");
    setNovoInsumoCustoStr(valUnit > 0 ? formatarMoeda(valUnit) : "");
    setNovoInsumoFornecedor(itemContext.fornecedorNome || "");

    setModalCadastroRapidoOpen(true);
  };

  const handleSalvarCadastroRapidoInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCode || !novoInsumoNome.trim()) {
      toast.error("Informe o nome do insumo.");
      return;
    }

    const valCusto = converterMoedaInputParaNumero(novoInsumoCustoStr);
    const qtdEmb = parseFloat(novoInsumoQtdEmb.replace(",", ".")) || 1;

    if (valCusto <= 0) {
      toast.error("Informe o custo do insumo.");
      return;
    }

    setSalvandoRapidoInsumo(true);
    try {
      const novoId = crypto.randomUUID();
      const novoInsumoObj: InsumoCadastrado = {
        id: novoId,
        estabelecimentoCodigo: activeCode,
        nome: novoInsumoNome.trim(),
        unidadeMedida: novoInsumoUnidade,
        custoAtual: valCusto,
        qtdEmbalagemOriginal: qtdEmb,
        unidadeEmbalagemOriginal: novoInsumoUnidade,
        fornecedor: novoInsumoFornecedor.trim(),
        createdAt: new Date().toISOString(),
      };

      const atuais = obterInsumosCadastrados(activeCode);
      const novalista = [novoInsumoObj, ...atuais];
      salvarInsumosCadastradosStorage(activeCode, novalista);

      try {
        await supabase.from("insumos").upsert(
          [
            {
              id: novoInsumoObj.id,
              estabelecimento_codigo: activeCode,
              user_id: profile?.ownerUserId || null,
              nome: novoInsumoObj.nome,
              unidade_medida: novoInsumoObj.unidadeMedida,
              custo_atual: novoInsumoObj.custoAtual,
              qtd_embalagem_original: novoInsumoObj.qtdEmbalagemOriginal,
              unidade_embalagem_original: novoInsumoObj.unidadeMedida,
              fornecedor: novoInsumoObj.fornecedor || "",
            },
          ],
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("[Scanner] Erro ao salvar insumo rápido no Supabase:", err);
      }

      if (targetItemParaVincular) {
        const { despesaId, itemId, itemNome, fornecedorNome } = targetItemParaVincular;

        salvarMapeamentoDePara(activeCode, itemNome, fornecedorNome, novoId, novoInsumoObj.nome);

        await atualizarCustoInsumoECascataFichas(
          activeCode,
          novoId,
          valCusto,
          profile?.ownerUserId
        );

        const targetDespesa = ultimosRegistros.find((d) => d.id === despesaId);
        if (targetDespesa) {
          const novosItens = (targetDespesa.itens || []).map((it) => {
            if (it.id === itemId || it.nome === itemNome) {
              return {
                ...it,
                insumoVinculadoId: novoId,
                insumoVinculadoNome: novoInsumoObj.nome,
              };
            }
            return it;
          });

          try {
            await supabase.from("despesas").update({ itens: novosItens as any }).eq("id", despesaId);
          } catch {}
          if (onEditarDespesa) await onEditarDespesa(despesaId, { itens: novosItens });

          if (registroDetalhes && registroDetalhes.id === despesaId) {
            setRegistroDetalhes({ ...registroDetalhes, itens: novosItens });
          }
        } else {
          // Atualiza no modal de revisão OCR se for notinha nova
          setItensExtraidos((prev) =>
            prev.map((it) =>
              it.id === itemId || it.nome === itemNome
                ? { ...it, insumoVinculadoId: novoId, insumoVinculadoNome: novoInsumoObj.nome }
                : it
            )
          );
        }
      }

      setInsumosCadastrados(novalista);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("insumosUpdated", { detail: { insumoId: novoId, novoCusto: valCusto } }));
      }

      toast.success(`✨ Insumo "${novoInsumoObj.nome}" cadastrado e vinculado com sucesso!`);
      setModalCadastroRapidoOpen(false);
      setTargetItemParaVincular(null);
    } catch (e: any) {
      toast.error(`Erro ao cadastrar insumo: ${e.message || "Erro desconhecido"}`);
    } finally {
      setSalvandoRapidoInsumo(false);
    }
  };

  const handleVincularInsumoNota = async (
    despesaId: string,
    itemId: string,
    itemNome: string,
    fornecedorNome: string,
    insumoId: string,
    itemValorTotal: number,
    itemQtd: number
  ) => {
    if (!activeCode) return;

    if (insumoId === "_novo_insumo") {
      handleAbrirCadastroRapidoInsumo({
        despesaId,
        itemId,
        itemNome,
        fornecedorNome,
        valorTotal: itemValorTotal,
        quantidade: itemQtd,
      });
      return;
    }

    if (insumoId === "_none" || !insumoId) {
      const targetDespesa = ultimosRegistros.find((d) => d.id === despesaId);
      if (targetDespesa) {
        const novosItens = (targetDespesa.itens || []).map((it) =>
          it.id === itemId || it.nome === itemNome
            ? { ...it, insumoVinculadoId: undefined, insumoVinculadoNome: undefined }
            : it
        );
        try {
          await supabase.from("despesas").update({ itens: novosItens as any }).eq("id", despesaId);
        } catch {}
        if (onEditarDespesa) await onEditarDespesa(despesaId, { itens: novosItens });
      }
      toast.info("Vínculo removido.");
      return;
    }

    const insumoSel = insumosCadastrados.find((i) => i.id === insumoId);
    if (!insumoSel) return;

    salvarMapeamentoDePara(activeCode, itemNome, fornecedorNome, insumoSel.id, insumoSel.nome);

    const qtd = itemQtd > 0 ? itemQtd : 1;
    const valorUnitarioNota = itemValorTotal > 0 ? parseFloat((itemValorTotal / qtd).toFixed(2)) : 0;
    const novoCusto = valorUnitarioNota > 0 ? valorUnitarioNota : insumoSel.custoAtual;

    const resCascata = await atualizarCustoInsumoECascataFichas(
      activeCode,
      insumoSel.id,
      novoCusto,
      profile?.ownerUserId
    );

    const targetDespesa = ultimosRegistros.find((d) => d.id === despesaId);
    if (targetDespesa) {
      const novosItens = (targetDespesa.itens || []).map((it) => {
        if (it.id === itemId || it.nome === itemNome) {
          return {
            ...it,
            insumoVinculadoId: insumoSel.id,
            insumoVinculadoNome: insumoSel.nome,
          };
        }
        return it;
      });

      try {
        await supabase.from("despesas").update({ itens: novosItens as any }).eq("id", despesaId);
      } catch {}
      if (onEditarDespesa) await onEditarDespesa(despesaId, { itens: novosItens });

      if (registroDetalhes && registroDetalhes.id === despesaId) {
        setRegistroDetalhes({ ...registroDetalhes, itens: novosItens });
      }
    }

    setInsumosCadastrados(obterInsumosCadastrados(activeCode));

    const msgFichas =
      resCascata.fichasAtualizadasCount > 0
        ? ` e recalculado o custo de ${resCascata.fichasAtualizadasCount} ficha(s) técnica(s) em tempo real!`
        : "!";

    toast.success(
      `✨ Item vinculado a "${insumoSel.nome}"! Custo do insumo atualizado para ${formatarMoeda(novoCusto)}${msgFichas}`
    );
  };

  // Sincronizar dados extraídos do contexto global com os campos editáveis locais
  useEffect(() => {
    if (extractedData) {
      setFornecedorNome(extractedData.fornecedorNome || "");
      setFornecedorEndereco(extractedData.fornecedorEndereco || "");
      setNumeroNota(extractedData.numeroNota || "");
      setNumeroPedido(extractedData.numeroPedido || "");
      setDataCompra(extractedData.dataCompra || new Date().toISOString().split("T")[0]);
      setHoraCompra(extractedData.horaCompra || "14:35:10");

      const rawItens = extractedData.itens || [];
      const forn = extractedData.fornecedorNome || "";

      const itensComVinculo = rawItens.map((item) => {
        const auto = encontrarVinculoDeParaAutomatico(activeCode, item.nome, forn);
        if (auto) {
          return {
            ...item,
            insumoVinculadoId: auto.insumoId,
            insumoVinculadoNome: auto.insumoNome,
          };
        }
        return item;
      });

      setItensExtraidos(itensComVinculo);

      if (extractedData.scanMode === "despesa") {
        if (extractedData.categoriaSugerida) {
          setDespesaCategoria(extractedData.categoriaSugerida);
        }
        const val = extractedData.valorTotalNota || 0;
        setDespesaValorStr(val > 0 ? `R$ ${val.toFixed(2).replace(".", ",")}` : "");
      }
    }
  }, [extractedData, activeCode]);

  // Manipular Upload do Arquivo (Foto / PDF)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_NOTINHA_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_NOTINHA_SIZE_BYTES) {
        toast.error("O arquivo é muito grande. Por favor, envie uma imagem ou PDF de no máximo 5 MB.");
        if (e.target) e.target.value = "";
        return;
      }
      if (!isScanning) {
        processarArquivoOCR(file, scanMode);
      }
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  // Salvar Conta de Consumo / Despesa Direto no Caixa
  const handleSalvarContaDespesa = async () => {
    if (salvando) return;
    const valNum = converterMoedaInputParaNumero(despesaValorStr);
    const fornNome = fornecedorNome.trim() || extractedData?.fornecedorNome || "Fornecedor / Emissor";

    if (isNaN(valNum) || valNum <= 0) {
      toast.error("Informe um valor válido maior que zero para a despesa.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Mapeamento da Data de Emissão / Vencimento
      const rawData = dataCompra || extractedData?.dataCompra || new Date().toISOString().split("T")[0];
      const [yyyy, mm, dd] = rawData.split("-");
      const dataEmissaoFormatada = yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : rawData;

      // Verificação de Duplicidade (SELECT no Supabase)
      try {
        const { data: dupCheck } = await supabase
          .from("transacoes_financeiras")
          .select("id, valor, data, descricao")
          .or(`estabelecimento_codigo.eq.${activeCode},estabelecimento_codigo.eq.${activeCode.toLowerCase()}`)
          .eq("valor", Number(valNum))
          .eq("data", dataEmissaoFormatada);

        if (dupCheck && dupCheck.length > 0) {
          toast.error("Atenção: Este documento já foi capturado e salvo no sistema anteriormente.");
          setSalvando(false);
          return;
        }
      } catch {}

      // 2. Mapeamento exato do payload para as colunas do Supabase espelhando o formulário manual:
      // - descricao: Mapear para o fornecedor
      // - valor: Mapear para o valor_total (Number / Float)
      // - data: Mapear para a data_emissao
      // - categoria: Mapear para a categoria_sugerida
      // - tipo: Setar como 'despesa' (mesma grafia do formulário manual de lançamentos)
      // - status: Setar como 'concluida' (mesma grafia do formulário manual de lançamentos)
      // - estabelecimento_codigo: Puxar do contexto global (activeCode)
      // - IMPORTANTE: NÃO enviar NENHUMA propriedade 'id'. Deixar o banco gerar o UUID sozinho!
      const payloadDespesaDirect: any = {
        descricao: fornNome,
        valor: Number(valNum),
        data: dataEmissaoFormatada,
        categoria: despesaCategoria || extractedData?.categoriaSugerida || "Outras Despesas",
        tipo: "despesa",
        status: "concluida",
        estabelecimento_codigo: activeCode,
        metodo_pagamento: despesaMetodoPagamento || "pix",
        cliente_ou_fornecedor: fornNome,
        origem: "Scanner AI (Conta/Fatura)",
      };

      delete payloadDespesaDirect.id;

      try {
        const { data: estData } = await supabase
          .from("estabelecimentos")
          .select("id, codigo")
          .or(`codigo.eq.${activeCode},codigo.eq.${activeCode.toLowerCase()}`);
        if (estData && estData.length > 0) {
          payloadDespesaDirect.estabelecimento_id = estData[0].id;
        }
      } catch {}

      delete payloadDespesaDirect.id;

      let { data: insertedRows, error } = await supabase
        .from("transacoes_financeiras")
        .insert([payloadDespesaDirect])
        .select();

      if (error) {
        console.warn("[Scanner Supabase Warning] Erro na inserção de despesa escaneada:", error.message);
        if (error.code === "23503" || error.message?.includes("foreign key")) {
          await supabase
            .from("estabelecimentos")
            .upsert([{ codigo: activeCode, nome: `Loja ${activeCode}` }], { onConflict: "codigo" });
          delete payloadDespesaDirect.id;
          const retryRes = await supabase
            .from("transacoes_financeiras")
            .insert([payloadDespesaDirect])
            .select();
          error = retryRes.error;
          insertedRows = retryRes.data;
        }

        if (error) {
          const payloadMinimal: any = {
            estabelecimento_codigo: activeCode,
            descricao: fornNome,
            valor: Number(valNum),
            data: dataEmissaoFormatada,
            categoria: despesaCategoria || "Outras Despesas",
            tipo: "despesa",
            status: "concluida",
          };
          delete payloadMinimal.id;
          const resMin = await supabase
            .from("transacoes_financeiras")
            .insert([payloadMinimal])
            .select();
          if (resMin.error) {
            throw new Error(resMin.error.message);
          }
          insertedRows = resMin.data;
        }
      }

      if (onSalvarTransacaoFinanceira) {
        await onSalvarTransacaoFinanceira({
          descricao: fornNome,
          valor: Number(valNum),
          tipo: "despesa",
          categoria: despesaCategoria || "Outras Despesas",
          data: dataEmissaoFormatada,
          metodoPagamento: despesaMetodoPagamento,
          status: "concluida",
          clienteOuFornecedor: fornNome,
          origem: "Scanner AI (Conta/Fatura)",
        });
      }

      setModalRevisaoOpen(false);
      limparScanner();
      toast.success(`Despesa de ${fornNome} (${formatarMoeda(valNum)}) gravada com sucesso no Supabase! 🎉`);
    } catch (e: any) {
      toast.error(`Erro ao gravar despesa no banco: ${e.message || "Erro desconhecido"}`);
    } finally {
      setSalvando(false);
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
    if (salvando) return;
    if (itensExtraidos.length === 0) {
      toast.error("Por favor, adicione pelo menos 1 item na notinha.");
      return;
    }

    setSalvando(true);
    try {
      // Verificação de Duplicidade (SELECT no Supabase)
      try {
        const { data: dupCheck } = await supabase
          .from("despesas")
          .select("id, valor_total, data_compra, fornecedor_nome")
          .or(`estabelecimento_codigo.eq.${activeCode},estabelecimento_codigo.eq.${activeCode.toLowerCase()}`)
          .eq("valor_total", totaisNota.total)
          .eq("data_compra", dataCompra);

        if (dupCheck && dupCheck.length > 0) {
          toast.error("Atenção: Este documento já foi capturado e salvo no sistema anteriormente.");
          setSalvando(false);
          return;
        }
      } catch {}

      const itensComFallback = itensExtraidos.map((item) => ({
        ...item,
        valorUnitario: item.valorUnitario || (item.quantidade > 0 ? parseFloat((item.valorTotal / item.quantidade).toFixed(2)) : item.valorTotal),
        categoria: item.categoria || categorizarItemAutomatico(item.nome),
      }));

      await onSalvarDespesa({
        estabelecimentoCodigo: activeCode,
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

      // Registra cada insumo no histórico individual e atualiza de-para / fichas tecnicas se vinculado
      for (const item of itensComFallback) {
        if (item.insumoVinculadoId) {
          salvarMapeamentoDePara(
            activeCode,
            item.nome,
            fornecedorNome,
            item.insumoVinculadoId,
            item.insumoVinculadoNome || ""
          );
          await atualizarCustoInsumoECascataFichas(
            activeCode,
            item.insumoVinculadoId,
            item.valorUnitario,
            profile?.ownerUserId
          );
        }

        try {
          await registrarCompraInsumo({
            estabelecimentoCodigo: activeCode,
            nomeInsumo: item.nome,
            categoria: item.categoria || "Outros Insumos",
            fornecedorNome,
            dataCompra,
            quantidadeComprada: item.quantidade || 1,
            embalagemQtd: 1,
            quantidadeTotalUnidades: item.quantidade || 1,
            valorPagoTotal: item.valorTotal,
            valorUnitarioCalculado: item.valorUnitario,
            unidadeMedida: "un",
          });
        } catch {}
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      if (onSalvarTransacaoFinanceira) {
        try {
          const rawData = dataCompra || new Date().toISOString().split("T")[0];
          const [yyyy, mm, dd] = rawData.split("-");
          const dataEmissaoFormatada = yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : rawData;
          await onSalvarTransacaoFinanceira({
            descricao: `Compra: ${fornecedorNome || "Insumos / Notinha"}`,
            valor: totaisNota.total,
            tipo: "despesa",
            categoria: "Insumos & Produção",
            data: dataEmissaoFormatada,
            metodoPagamento: "pix",
            status: "concluida",
            clienteOuFornecedor: fornecedorNome || "Fornecedor",
            origem: "Scanner AI (Notinha Insumos)",
          });
        } catch {}
      }

      setModalRevisaoOpen(false);
      limparScanner();
      toast.success("✨ Notinha armazenada com sucesso no menu Financeiro para sua conferência!");
    } catch (e: any) {
      toast.error(`Erro ao salvar notinha: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  // Unificação na Tabela "Últimos Registros Capturados" (compras + transações do scanner/saídas)
  const ultimosRegistros = useMemo(() => {
    const lista: (DespesaNotaFiscal & { tipoOrigem?: string })[] = despesas.map((d) => ({
      ...d,
      tipoOrigem: "produtos",
    }));

    const idsExistentes = new Set(despesas.map((d) => d.id));

    if (Array.isArray(transacoes)) {
      for (const t of transacoes) {
        if (!t || !t.id || idsExistentes.has(t.id)) continue;
        const isSaida = String(t.tipo || "").toLowerCase() === "despesa" || String(t.tipo || "").toLowerCase() === "saida";
        const isFromScanner = t.origem?.includes("Scanner") || t.descricao?.toLowerCase().includes("notinha") || isSaida;

        if (isFromScanner) {
          const [dd, mm, yyyy] = (t.data || "").split("/");
          const dataCompraIso = yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : new Date().toISOString().split("T")[0];
          lista.push({
            id: t.id,
            estabelecimentoCodigo: activeCode,
            fornecedorNome: t.clienteOuFornecedor || t.descricao || "Conta / Fatura",
            dataCompra: dataCompraIso,
            valorTotal: Number(t.valor || 0),
            valorProducao: 0,
            valorUtensilios: 0,
            valorConsumoProprio: 0,
            valorOutros: Number(t.valor || 0),
            itens: [],
            tipoOrigem: "despesa",
          });
        }
      }
    }

    return lista.sort((a, b) => {
      const parseDate = (dStr?: string) => {
        if (!dStr) return 0;
        if (dStr.includes("-")) return new Date(dStr).getTime() || 0;
        const [dd, mm, yyyy] = dStr.split("/");
        if (dd && mm && yyyy) return new Date(`${yyyy}-${mm}-${dd}`).getTime();
        return new Date(dStr).getTime() || 0;
      };
      return parseDate(b.dataCompra) - parseDate(a.dataCompra);
    });
  }, [despesas, transacoes]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Escanear Documento <Camera className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha o tipo de documento e envie a foto ou PDF para leitura automática com IA.
          </p>
        </div>
      </div>

      {/* BANNER INFORMATIVO DE ENVIO DIRETO AO FINANCEIRO */}
      <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-xs text-purple-950 dark:text-purple-200 flex items-center gap-2.5 shadow-2xs">
        <Sparkles className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400 shrink-0" />
        <span>
          <strong>Envio Automático:</strong> Toda notinha ou conta escaneada é armazenada e enviada diretamente para o seu menu <strong>Financeiro</strong> para conferência.
        </span>
      </div>

      {/* 1. SELEÇÃO DO TIPO DE DOCUMENTO (CARDS COMPACTOS LADO A LADO) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div
          onClick={() => setScanMode("produtos")}
          className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-2 sm:gap-3 ${
            scanMode === "produtos"
              ? "border-2 border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
              : "border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${scanMode === "produtos" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-foreground truncate">
                Nota de Insumos / Produtos
              </h3>
              {scanMode === "produtos" && (
                <Badge className="bg-primary text-white text-[8px] sm:text-[9px] font-bold py-0 px-1 shrink-0">Ativo</Badge>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5 hidden sm:block">
              Cupons fiscais e compras de mercado
            </p>
          </div>
        </div>

        <div
          onClick={() => setScanMode("despesa")}
          className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-2 sm:gap-3 ${
            scanMode === "despesa"
              ? "border-2 border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
              : "border border-border/70 bg-card hover:border-amber-500/40 hover:bg-muted/30"
          }`}
        >
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${scanMode === "despesa" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-foreground truncate">
                Conta / Despesa Fixa
              </h3>
              {scanMode === "despesa" && (
                <Badge className="bg-amber-600 text-white text-[8px] sm:text-[9px] font-bold py-0 px-1 shrink-0">Ativo</Badge>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5 hidden sm:block">
              Água, luz, aluguel, boletos
            </p>
          </div>
        </div>
      </div>

      {/* 2. ÁREA DE UPLOAD CENTRALIZADA E COMPACTA */}
      <Card className="border-2 border-dashed border-primary/40 bg-card/80 shadow-md">
        <CardContent className="p-3 sm:p-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            disabled={isScanning}
            className="hidden"
            onChange={handleFileChange}
          />

          {isScanning ? (
            <div className="py-6 text-center flex flex-col items-center justify-center space-y-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Capturando dados com IA.</h3>
              <p className="text-[11px] text-primary font-semibold animate-fade-in">{scanStepMessage}</p>
            </div>
          ) : (
            <div
              onClick={() => {
                if (!isScanning) fileInputRef.current?.click();
              }}
              className={`py-4 px-3 sm:py-5 sm:px-6 text-center border border-border/70 rounded-2xl bg-muted/20 transition-all flex flex-col items-center justify-center max-w-xl mx-auto ${
                isScanning ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40 hover:border-primary/50"
              }`}
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-2">
                <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                Tirar foto ou selecionar PDF / Imagem da Notinha
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Formatos aceitos: JPG, PNG ou PDF (comprovantes fiscais de compras)
              </p>
              <Button size="sm" disabled={isScanning} className="mt-3 font-bold shadow-sm px-4 h-8 text-xs">
                <Camera className="w-3.5 h-3.5 mr-1.5" /> Selecionar Arquivo da Notinha
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

        {/* LAYOUT MOBILE (CARDS EMPILHADOS - sm:hidden) */}
        <div className="space-y-3 sm:hidden">
          {ultimosRegistros.length === 0 ? (
            <Card className="p-6 text-center text-xs text-muted-foreground italic border-border shadow-sm">
              Nenhuma notinha capturada ainda. Envie uma foto acima para começar!
            </Card>
          ) : (
            ultimosRegistros.map((d) => (
              <Card
                key={d.id}
                onClick={() => abrirDetalhesRegistro(d)}
                className="p-4 border-l-4 border-l-purple-600 border-t border-r border-b border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card active:scale-[0.99] rounded-xl"
              >
                <div className="space-y-3">
                  {/* Parte Superior (Linha 1): Nome do Estabelecimento + Doc (Esquerda) e Data/Hora (Direita) */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary">
                        {d.fornecedorNome}
                      </h4>
                      {d.numeroNota && (
                        <span className="inline-block text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-normal">
                          Doc: {d.numeroNota}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground font-mono">
                        {d.dataCompra}
                      </div>
                      {d.horaCompra && (
                        <div className="text-[10px] text-muted-foreground/80 font-mono">
                          {d.horaCompra}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parte Inferior (Linha 2): Valor Total (Esquerda) e Botões de Ação (Direita) */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Valor Total
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatarMoeda(d.valorTotal)}
                      </span>
                    </div>

                    {/* Botões de Ação Alinhados à Direita */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {d.itens && d.itens.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => toggleExpandReceipt(d.id, e)}
                          className="h-8 text-[11px] gap-1 font-semibold border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          {d.itens.length} {d.itens.length === 1 ? "item" : "itens"}
                          {expandedReceipts[d.id] ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReenviarFinanceiro) {
                            onReenviarFinanceiro(d);
                          }
                        }}
                        className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full inline-flex items-center justify-center shrink-0"
                        title="Reenviar para o Financeiro"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          compartilharNotinhaWhatsApp(d);
                        }}
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full inline-flex items-center justify-center shrink-0"
                        title="Compartilhar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotaParaExcluir(d);
                          setModalExcluirOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full inline-flex items-center justify-center shrink-0"
                        title="Excluir notinha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* EXPANSAO DOS ITENS COM SELETOR DE-PARA */}
                  {expandedReceipts[d.id] && d.itens && d.itens.length > 0 && (
                    <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30 space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                        Itens Escaneados & Vínculo com Insumos Cadastrados (De-Para):
                      </div>
                      <div className="space-y-2">
                        {d.itens.map((it, idx) => (
                          <div key={it.id || idx} className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-foreground truncate max-w-[200px]">{it.nome}</span>
                              <span className="font-bold text-emerald-600">{formatarMoeda(it.valorTotal)}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                              <Label className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">Vínculo:</Label>
                              <Select
                                value={it.insumoVinculadoId || "_none"}
                                onValueChange={(val) =>
                                  handleVincularInsumoNota(
                                    d.id,
                                    it.id,
                                    it.nome,
                                    d.fornecedorNome,
                                    val,
                                    it.valorTotal,
                                    it.quantidade
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="Vincular a Insumo Cadastrado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">Sem vínculo</SelectItem>
                                  {insumosCadastrados.map((ins) => (
                                    <SelectItem key={ins.id} value={ins.id}>
                                      {ins.nome} ({formatarMoeda(ins.custoAtual)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* LAYOUT DESKTOP (TABELA TRADICIONAL - hidden sm:block) */}
        <Card className="hidden sm:block border-border shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto select-none [scrollbar-width:thin]">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold w-32 whitespace-nowrap">Data</TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap">Nome do Estabelecimento</TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap">Itens / Vínculo De-Para</TableHead>
                  <TableHead className="text-xs font-bold text-right w-32 whitespace-nowrap">Valor Total</TableHead>
                  <TableHead className="text-xs font-bold text-center w-36 whitespace-nowrap">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosRegistros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground whitespace-nowrap">
                      Nenhuma notinha capturada ainda. Envie uma foto acima para começar!
                    </TableCell>
                  </TableRow>
                ) : (
                  ultimosRegistros.map((d) => (
                    <>
                      <TableRow
                        key={d.id}
                        onClick={() => abrirDetalhesRegistro(d)}
                        className="cursor-pointer hover:bg-purple-50/50 transition-colors group"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          <div>{d.dataCompra}</div>
                          {d.horaCompra && <div className="text-[10px] text-muted-foreground/70">{d.horaCompra}</div>}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                          <div>{d.fornecedorNome}</div>
                          {d.numeroNota && <div className="text-[10px] text-muted-foreground font-mono font-normal">Doc: {d.numeroNota}</div>}
                        </TableCell>
                        <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                          {d.itens && d.itens.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => toggleExpandReceipt(d.id, e)}
                              className="h-7 text-[11px] gap-1 border-purple-300 text-purple-800 dark:text-purple-200"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              {d.itens.length} {d.itens.length === 1 ? "item" : "itens"}
                              {expandedReceipts[d.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Sem itens</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-emerald-600 text-right whitespace-nowrap">
                          {formatarMoeda(d.valorTotal)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onReenviarFinanceiro) {
                                  onReenviarFinanceiro(d);
                                }
                              }}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full inline-flex items-center justify-center"
                              title="Reenviar para o Financeiro"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotaParaExcluir(d);
                                setModalExcluirOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full inline-flex items-center justify-center"
                              title="Excluir notinha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedReceipts[d.id] && d.itens && d.itens.length > 0 && (
                        <TableRow key={`${d.id}-items-expanded`} className="bg-purple-50/30 dark:bg-purple-950/10">
                          <TableCell colSpan={5} className="p-3">
                            <div className="p-3 bg-card border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-2">
                              <div className="text-xs font-bold text-purple-900 dark:text-purple-300">
                                Itens da Nota de {d.fornecedorNome} & Vínculo com Insumos Cadastrados (De-Para):
                              </div>
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    <TableHead className="text-xs">Descrição do Item na Nota</TableHead>
                                    <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                                    <TableHead className="text-xs w-24 text-right">Valor Total</TableHead>
                                    <TableHead className="text-xs min-w-[220px]">Insumo Cadastrado (Vínculo De-Para)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {d.itens.map((it, idx) => (
                                    <TableRow key={it.id || idx}>
                                      <TableCell className="text-xs font-medium">{it.nome}</TableCell>
                                      <TableCell className="text-xs text-center">{it.quantidade}</TableCell>
                                      <TableCell className="text-xs text-right font-bold text-emerald-600">
                                        {formatarMoeda(it.valorTotal)}
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={it.insumoVinculadoId || "_none"}
                                          onValueChange={(val) => {
                                            if (val === "_novo_insumo") {
                                              setInsumoParaCadastroRapido({ nome: it.nome, valor: it.valorTotal / (it.quantidade || 1) });
                                              setModalInsumoOpen(true);
                                            } else {
                                              handleVincularInsumoNota(d.id, it.id, it.nome, d.fornecedorNome, val, it.valorTotal, it.quantidade);
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs bg-background">
                                            <SelectValue placeholder="Vincular a Insumo Cadastrado..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="_novo_insumo" className="font-bold text-purple-700 dark:text-purple-300 border-b border-purple-100 dark:border-purple-900/40">
                                              ＋ Cadastrar Novo Insumo
                                            </SelectItem>
                                            <SelectItem value="_none">Sem vínculo</SelectItem>
                                            {insumosCadastrados.map((ins) => (
                                              <SelectItem key={ins.id} value={ins.id}>
                                                {ins.nome} ({formatarMoeda(ins.custoAtual)})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DA NOTINHA */}
        <Dialog open={modalExcluirOpen} onOpenChange={setModalExcluirOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Excluir Registro de Notinha
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Tem certeza que deseja excluir a notinha de{" "}
                <span className="font-bold text-foreground">"{notaParaExcluir?.fornecedorNome}"</span> no valor de{" "}
                <span className="font-bold text-emerald-600">
                  {formatarMoeda(notaParaExcluir?.valorTotal || 0)}
                </span>
                ? Esta ação removerá o registro do Supabase e atualizará o caixa financeiro.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalExcluirOpen(false)}
                disabled={excluindo}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="text-xs font-semibold"
              >
                {excluindo ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SIMPLIFICADO E LIMPO DE REVISÃO DA NOTINHA */}
      {/* ========================================================================= */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {extractedData?.scanMode === "despesa" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Receipt className="w-5 h-5 text-amber-600" /> Confirmar Conta / Despesa de Consumo
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Confira os dados extraídos da fatura pela IA e altere a categoria se necessário antes de salvar direto nas Transações Financeiras.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="space-y-1">
                    <Label htmlFor="desp-forn" className="text-xs font-bold text-foreground">
                      Emissor / Concessionária / Fornecedor *
                    </Label>
                    <Input
                      id="desp-forn"
                      value={fornecedorNome}
                      placeholder="ex: Sabesp, Enel, Cemig, Claro, Imobiliária..."
                      onChange={(e) => setFornecedorNome(e.target.value)}
                      className="h-9 text-xs font-bold bg-background"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="desp-data" className="text-xs font-bold text-foreground">
                        Data Emissão / Vencimento
                      </Label>
                      <Input
                        id="desp-data"
                        type="date"
                        value={dataCompra}
                        onChange={(e) => setDataCompra(e.target.value)}
                        className="h-9 text-xs bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="desp-val" className="text-xs font-bold text-foreground">
                        Valor Total (R$) *
                      </Label>
                      <Input
                        id="desp-val"
                        type="text"
                        inputMode="decimal"
                        placeholder="R$ 0,00"
                        value={despesaValorStr}
                        onChange={(e) => setDespesaValorStr(aplicarMascaraMoedaInput(e.target.value))}
                        className="h-9 text-xs font-bold font-mono text-amber-700 dark:text-amber-400 bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="desp-cat" className="text-xs font-bold text-foreground">
                        Categoria Sugerida
                      </Label>
                      <Select value={despesaCategoria} onValueChange={setDespesaCategoria}>
                        <SelectTrigger id="desp-cat" className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Energia">Energia (Luz)</SelectItem>
                          <SelectItem value="Água">Água & Saneamento</SelectItem>
                          <SelectItem value="Internet">Internet & Telefone</SelectItem>
                          <SelectItem value="Aluguel">Aluguel & Condomínio</SelectItem>
                          <SelectItem value="Impostos">Impostos & Taxas</SelectItem>
                          <SelectItem value="Serviços">Serviços & Manutenção</SelectItem>
                          <SelectItem value="Outras Despesas">Outras Despesas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="desp-metodo" className="text-xs font-bold text-foreground">
                        Forma de Pagamento
                      </Label>
                      <Select value={despesaMetodoPagamento} onValueChange={(v: MetodoPagamento) => setDespesaMetodoPagamento(v)}>
                        <SelectTrigger id="desp-metodo" className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto Bancário</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="desp-status" className="text-xs font-bold text-foreground">
                      Status do Pagamento
                    </Label>
                    <Select value={despesaStatus} onValueChange={(v: StatusTransacao) => setDespesaStatus(v)}>
                      <SelectTrigger id="desp-status" className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concluida">Concluída / Já Paga</SelectItem>
                        <SelectItem value="pendente">Pendente / A Pagar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  onClick={handleSalvarContaDespesa}
                  disabled={salvando}
                  className="font-bold shadow-md bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {salvando ? "Salvando..." : "Confirmar e Salvar no Caixa"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
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
                          <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                          <TableHead className="text-xs w-24 text-right">Valor Total</TableHead>
                          <TableHead className="text-xs min-w-[160px]">Insumo Cadastrado (Vínculo)</TableHead>
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
                            <TableCell>
                              <Select
                                value={item.insumoVinculadoId || "_none"}
                                onValueChange={(val) => {
                                  const insObj = insumosCadastrados.find((i) => i.id === val);
                                  handleEditarItem(item.id, "insumoVinculadoId" as any, val === "_none" ? undefined : val);
                                  if (insObj) {
                                    handleEditarItem(item.id, "insumoVinculadoNome" as any, insObj.nome);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="Vincular insumo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">Sem vínculo</SelectItem>
                                  {insumosCadastrados.map((ins) => (
                                    <SelectItem key={ins.id} value={ins.id}>
                                      {ins.nome} ({formatarMoeda(ins.custoAtual)})
                                    </SelectItem>
                                  ))}
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO DE DETALHES DA NOTINHA */}
      {/* ========================================================================= */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                <div className="sm:col-span-2">
                  <Label htmlFor="det-forn" className="text-xs font-bold text-foreground">
                    Estabelecimento / Razão Social (Editável)
                  </Label>
                  <Input
                    id="det-forn"
                    value={editFornecedorNome}
                    onChange={(e) => setEditFornecedorNome(e.target.value)}
                    className="h-8 text-xs font-bold mt-1"
                    placeholder="ex: Atacadão S/A"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Número do Documento</Label>
                  <p className="text-sm font-bold text-foreground font-mono">
                    {registroDetalhes.numeroNota || "Não informado"}
                  </p>
                </div>
                <div>
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
                        <TableHead className="text-xs font-bold text-center w-12">Qtd</TableHead>
                        <TableHead className="text-xs font-bold text-right w-20">Total</TableHead>
                        <TableHead className="text-xs font-bold min-w-[150px]">Vínculo De-Para (Insumo Cadastrado)</TableHead>
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
                            <TableCell className="text-xs font-bold text-right text-foreground">
                              {formatarMoeda(item.valorTotal)}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.insumoVinculadoId || "_none"}
                                onValueChange={(val) =>
                                  handleVincularInsumoNota(
                                    registroDetalhes.id,
                                    item.id,
                                    item.nome,
                                    registroDetalhes.fornecedorNome,
                                    val,
                                    item.valorTotal,
                                    item.quantidade
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="Vincular a Insumo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">Sem vínculo</SelectItem>
                                  {insumosCadastrados.map((ins) => (
                                    <SelectItem key={ins.id} value={ins.id}>
                                      {ins.nome} ({formatarMoeda(ins.custoAtual)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t flex flex-wrap justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (registroDetalhes) compartilharNotinhaWhatsApp(registroDetalhes);
                }}
                className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs h-8"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSalvarEdicaoNotinha}
                disabled={salvandoEdicao}
                className="gap-1.5 font-bold text-xs bg-[#8E7CC3] hover:bg-[#7C69B3] text-white h-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setModalDetalhesOpen(false)} className="text-xs h-8">
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL DE CADASTRO RÁPIDO DE INSUMO NO VÍNCULO DE-PARA */}
      <Dialog open={modalCadastroRapidoOpen} onOpenChange={setModalCadastroRapidoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Plus className="w-5 h-5" /> Cadastrar Novo Insumo & Vincular
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre o ingrediente na hora para que fique salvo na sua loja e vinculado a esta notinha fiscal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarCadastroRapidoInsumo} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="req-nome" className="text-xs font-bold text-foreground">
                Nome do Insumo / Ingrediente *
              </Label>
              <Input
                id="req-nome"
                value={novoInsumoNome}
                onChange={(e) => setNovoInsumoNome(e.target.value)}
                placeholder="Ex: Leite Condensado Moça 395g"
                className="h-8 text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="req-qtd" className="text-xs font-semibold">
                  Qtd Embalagem *
                </Label>
                <Input
                  id="req-qtd"
                  value={novoInsumoQtdEmb}
                  onChange={(e) => setNovoInsumoQtdEmb(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="req-unid" className="text-xs font-semibold">
                  Unidade Medida *
                </Label>
                <Select value={novoInsumoUnidade} onValueChange={setNovoInsumoUnidade}>
                  <SelectTrigger id="req-unid" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="kg">Quilo (kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="l">Litro (L)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                    <SelectItem value="bdj">Bandeja (bdj)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="req-custo" className="text-xs font-bold text-foreground">
                Custo Pago na Embalagem (R$) *
              </Label>
              <Input
                id="req-custo"
                value={novoInsumoCustoStr}
                onChange={(e) => setNovoInsumoCustoStr(aplicarMascaraMoedaInput(e.target.value))}
                placeholder="R$ 0,00"
                className="h-8 text-xs font-mono font-bold text-purple-700 dark:text-purple-300"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="req-fornec" className="text-xs font-semibold">
                Fornecedor / Estabelecimento
              </Label>
              <Input
                id="req-fornec"
                value={novoInsumoFornecedor}
                onChange={(e) => setNovoInsumoFornecedor(e.target.value)}
                placeholder="Ex: Mercado Atacadão"
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCadastroRapidoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoRapidoInsumo}
                size="sm"
                className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {salvandoRapidoInsumo ? "Salvando..." : "Salvar e Vincular"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
