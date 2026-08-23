/**
 * Utilitário de Geração de Payload Pix Copia e Cola (BR Code EMVCo) com Checksum CRC16-CCITT
 * Padrão Oficial do Banco Central do Brasil (BCB)
 */

export interface PixPayloadInput {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txid?: string;
  description?: string;
}

export interface DadosInstitucionais {
  nome?: string;
  chavePix?: string;
  tipoChavePix?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
}

export function salvarDadosInstitucionaisCache(codigoLoja: string, dados: Partial<DadosInstitucionais>): void {
  try {
    const key = `caixadoce_store_profile_${codigoLoja}`;
    const raw = localStorage.getItem(key);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...prev, ...dados }));
  } catch {}
}

/**
 * Remove acentos e caracteres especiais do texto para conformidade com a especificação EMVCo
 */
export function sanitizePixText(text: string, maxLength: number): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "") // remove caracteres nao alfa-numericos
    .trim()
    .slice(0, maxLength);
}

/**
 * Formata e higieniza a chave Pix (telefone com +55, CPF/CNPJ sem pontuação, e-mail/EVP preservados)
 */
export function formatPixKey(key: string): string {
  if (!key) return "";
  const clean = key.trim();
  
  // Se for e-mail ou chave aleatória UUID (contém hífen/arroba e não é apenas números)
  if (clean.includes("@") || (clean.length === 36 && clean.includes("-"))) {
    return clean;
  }

  // Tratamento de telefone ou documento (apenas dígitos)
  const onlyDigits = clean.replace(/\D/g, "");

  // Telefone (10 ou 11 dígitos)
  if (onlyDigits.length === 10 || onlyDigits.length === 11) {
    if (!clean.startsWith("+")) {
      return `+55${onlyDigits}`;
    }
    return `+${onlyDigits}`;
  }

  // CPF (11 dígitos) ou CNPJ (14 dígitos)
  if (onlyDigits.length === 11 || onlyDigits.length === 14) {
    return onlyDigits;
  }

  return clean;
}

/**
 * Calcula o Checksum CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Formata um campo TLV (Tag-Length-Value) no padrão EMVCo
 */
function formatEMV(tag: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${tag}${len}${value}`;
}

/**
 * Gera a string Pix Copia e Cola (BR Code) pronta para ser colada em apps bancários
 */
export function generatePixPayload(input: PixPayloadInput): string {
  if (!input.pixKey) return "";

  const key = formatPixKey(input.pixKey);
  const name = sanitizePixText(input.merchantName || "CaixaDoce", 25) || "CaixaDoce";
  const city = sanitizePixText(input.merchantCity || "SAO PAULO", 15) || "SAO PAULO";
  const txid = sanitizePixText(input.txid || "***", 25) || "***";

  // Tag 26: Merchant Account Information - Pix
  const gui = formatEMV("00", "br.gov.bcb.pix");
  const keyEMV = formatEMV("01", key);
  const descEMV = input.description ? formatEMV("02", sanitizePixText(input.description, 25)) : "";
  const merchantAccountInfo = formatEMV("26", `${gui}${keyEMV}${descEMV}`);

  // Tag 54: Transaction Amount (opcional se zerado)
  let amountEMV = "";
  if (input.amount && input.amount > 0) {
    amountEMV = formatEMV("54", input.amount.toFixed(2));
  }

  // Tag 62: Additional Data Field (TxID)
  const txidEMV = formatEMV("05", txid);
  const additionalData = formatEMV("62", txidEMV);

  // Monta a string bruta do payload antes da Tag 63 (CRC16)
  const rawPayload =
    formatEMV("00", "01") + // Payload Format Indicator
    formatEMV("01", input.amount && input.amount > 0 ? "12" : "11") + // Point of Initiation
    merchantAccountInfo +
    formatEMV("52", "0000") + // Merchant Category Code
    formatEMV("53", "986") + // Transaction Currency (BRL = 986)
    amountEMV +
    formatEMV("58", "BR") + // Country Code
    formatEMV("59", name) + // Merchant Name
    formatEMV("60", city) + // Merchant City
    additionalData +
    "6304"; // Tag CRC16 ID + Tamanho

  // Calcula o CRC16 dos caracteres do rawPayload e anexa ao final
  const crc = calculateCRC16(rawPayload);
  return `${rawPayload}${crc}`;
}
