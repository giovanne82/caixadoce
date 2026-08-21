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
  maxRetries: 2, // 2 retentativas (total 3 chamadas)
  delayMs: 1500, // 1,5 segundos de intervalo entre tentativas
  retryStatuses: [503, 429], // Status 503 (Service Unavailable) ou 429 (Rate Limit)
};
