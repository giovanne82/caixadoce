import {
  extractReceiptDataWithGemini,
  processarNotinhaComOCR,
  converterImagemParaBase64,
  type GeminiReceiptResponse,
  type ResultadoOCRNotinha,
} from "./ocr-service";

/**
 * scannerService.ts
 * Módulo de serviço do Scanner de Notinhas com suporte a retry automático e backoff na API Gemini.
 */

export {
  extractReceiptDataWithGemini,
  processarNotinhaComOCR,
  converterImagemParaBase64,
  type GeminiReceiptResponse,
  type ResultadoOCRNotinha,
};

export const SCANNER_RETRY_CONFIG = {
  maxRetries: 4, // 4 retentativas (total 5 chamadas)
  delayMs: 1000, // Backoff progressivo entre tentativas
};
