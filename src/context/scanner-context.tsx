import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { processarNotinhaComOCR } from "@/lib/ocr-service";
import { ItemNotaFiscal } from "@/lib/caixadoce-data";
import { toast } from "sonner";

export interface ExtractedReceiptData {
  fornecedorNome: string;
  fornecedorEndereco: string;
  numeroNota: string;
  numeroPedido: string;
  dataCompra: string;
  horaCompra: string;
  itens: ItemNotaFiscal[];
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
  processarArquivoOCR: (file: File) => Promise<void>;
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

  const processarArquivoOCR = useCallback(async (file: File) => {
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
    setScanStepMessage("Iniciando leitura de comprovante com IA...");
    setExtractedData(null);

    try {
      const res = await processarNotinhaComOCR(file, (msg) => {
        setScanStepMessage(msg);
      });

      setIsScanning(false);
      setExtractedData(res);
      setModalRevisaoOpen(true);

      if (res.itens.length === 0) {
        toast.info("Não foi possível identificar os produtos automaticamente. Adicione os itens no modal de revisão.");
      } else {
        toast.success(`Leitura de notinha concluída em segundo plano! ${res.itens.length} item(ns) identificado(s). 🎉`);
      }
    } catch (err: any) {
      setIsScanning(false);
      const msg =
        err?.message ||
        "Nossa Inteligência Artificial está com alto volume de processamento no momento. Por favor, tente enviar novamente em instantes ou mais tarde.";
      setError(msg);
      toast.error(msg);
    }
  }, []);

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
