import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { processarNotinhaComOCR, type ScanMode } from "@/lib/ocr-service";
import { ItemNotaFiscal } from "@/lib/caixadoce-data";
import { toast } from "sonner";

export interface ExtractedReceiptData {
  scanMode?: ScanMode;
  fornecedorNome: string;
  fornecedorEndereco: string;
  numeroNota: string;
  numeroPedido: string;
  dataCompra: string;
  horaCompra: string;
  itens: ItemNotaFiscal[];
  valorTotalNota?: number;
  categoriaSugerida?: string;
}

interface ScannerContextType {
  isScanning: boolean;
  scanStepMessage: string;
  selectedFile: File | null;
  filePreview: string | null;
  extractedData: ExtractedReceiptData | null;
  modalRevisaoOpen: boolean;
  error: string | null;
  setModalRevisaoOpen: (open: boolean) => void;
  setExtractedData: React.Dispatch<React.SetStateAction<ExtractedReceiptData | null>>;
  processarArquivoOCR: (file: File, scanMode?: ScanMode) => Promise<void>;
  limparScanner: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processarArquivoOCR = useCallback(async (file: File, scanMode: ScanMode = "produtos") => {
    if (isScanning) {
      toast.warning("Já existe um escaneamento de documento em andamento. Aguarde a conclusão.");
      return;
    }

    setSelectedFile(file);
    setError(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    setIsScanning(true);
    setScanStepMessage("⚡ Conectando ao Gemini 3.6 Flash AI...");
    setExtractedData(null);

    try {
      const res = await processarNotinhaComOCR(file, scanMode, (msg) => {
        setScanStepMessage(msg);
      });

      setIsScanning(false);
      setExtractedData(res);
      setModalRevisaoOpen(true);

      if (scanMode === "despesa") {
        toast.success(`Leitura da conta de consumo concluída! Emissor: ${res.fornecedorNome}. 🎉`);
      } else if (res.itens.length === 0) {
        toast.info("Não foi possível identificar os produtos automaticamente. Adicione os itens no modal de revisão.");
      } else {
        toast.success(`Leitura de notinha concluída em segundo plano! ${res.itens.length} item(ns) identificado(s). 🎉`);
      }
    } catch (err: any) {
      setIsScanning(false);
      const rawMsg = String(err?.message || err || "");
      let msg = rawMsg;

      if (
        rawMsg.includes("RATE_LIMIT_429") ||
        rawMsg.includes("429") ||
        rawMsg.includes("RESOURCE_EXHAUSTED") ||
        rawMsg.includes("Quota exceeded") ||
        rawMsg.includes("Too Many Requests") ||
        rawMsg.includes("indisponível (HTTP 429)")
      ) {
        msg = "Limite de leituras por minuto atingido. Aguarde 1 minuto e tente novamente.";
      } else if (!rawMsg || rawMsg.includes("[object Object]")) {
        msg = "Nossa Inteligência Artificial está com alto volume de processamento no momento. Por favor, tente enviar novamente em instantes ou mais tarde.";
      }

      setError(msg);
      toast.error(msg);
    }
  }, [isScanning]);

  const limparScanner = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    setIsScanning(false);
    setScanStepMessage("");
    setExtractedData(null);
    setModalRevisaoOpen(false);
    setError(null);
  }, []);

  return (
    <ScannerContext.Provider
      value={{
        isScanning,
        scanStepMessage,
        selectedFile,
        filePreview,
        extractedData,
        modalRevisaoOpen,
        error,
        setModalRevisaoOpen,
        setExtractedData,
        processarArquivoOCR,
        limparScanner,
      }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error("useScanner deve ser usado dentro de um ScannerProvider");
  }
  return context;
}
