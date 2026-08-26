import { categorizarItemAutomatico, type ItemNotaFiscal } from "@/lib/caixadoce-data";

export type ScanMode = "produtos" | "despesa";

export interface ResultadoOCRNotinha {
  scanMode?: ScanMode;
  fornecedorNome: string;
  fornecedorEndereco: string;
  numeroNota: string;
  numeroPedido: string;
  dataCompra: string;
  horaCompra: string;
  itens: ItemNotaFiscal[];
  valorTotalNota: number;
  categoriaSugerida?: string;
}

export interface GeminiReceiptResponse {
  fornecedor?: string;
  data_emissao?: string;
  valor_total?: number;
  categoria_sugerida?: string;
  establishment?: string;
  date?: string;
  time?: string;
  sale_number?: string;
  items?: Array<{
    name: string;
    standard_name?: string;
    category?: string;
    quantity: number;
    is_fardo_ou_pacote?: boolean;
    embalagem_qtd?: number;
    peso_ou_volume_g_ml?: number;
    unidade_medida_base?: string;
    total_price: number;
    unit_price_calculated?: number;
  }>;
  total_amount?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Modelo oficial suportado pela Google Gemini API (v1beta generateContent)
const GEMINI_MODELS = ["gemini-3.6-flash"];

/**
 * Compacta e redimensiona imagens pesadas tiradas pela câmera do celular
 * reduzindo arquivos de 10MB+ para ~200KB antes do envio para a API do Gemini.
 */
export async function comprimirImagemParaBase64(
  file: File,
  maxWidth = 1200,
  maxHeight = 1600,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se for PDF ou arquivo não imagem, converter direto
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);

        console.log(
          `[OCR Compress] Foto da câmera reduzida de ${(file.size / 1024 / 1024).toFixed(2)}MB para ~${Math.round(
            (compressedBase64.length * 0.75) / 1024
          )}KB (${width}x${height}px)`
        );

        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const converterImagemParaBase64 = comprimirImagemParaBase64;

/**
 * Resgata a lista de chaves de API do Gemini configuradas (Principal + Fallback/Contingência)
 */
export function obterChavesGeminiApi(): { key: string; label: string }[] {
  const mainKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY;

  const fallbackKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY_FALLBACK ||
    (import.meta as any).env?.GEMINI_API_KEY_FALLBACK;

  const keys: { key: string; label: string }[] = [];

  if (mainKey && typeof mainKey === "string" && mainKey.trim()) {
    keys.push({ key: mainKey.trim(), label: "Principal (GEMINI_API_KEY)" });
  }

  if (
    fallbackKey &&
    typeof fallbackKey === "string" &&
    fallbackKey.trim() &&
    fallbackKey.trim() !== mainKey?.trim()
  ) {
    keys.push({ key: fallbackKey.trim(), label: "Contingência (GEMINI_API_KEY_FALLBACK)" });
  }

  return keys;
}

/**
 * Chamada otimizada para a API do Gemini utilizando modelos flash oficiais com sistema de redundância
 * e fallback automático para a chave de contingência em caso de cota esgotada (429) ou instabilidade.
 */
export async function extractReceiptDataWithGemini(
  imageBase64: string,
  scanMode: ScanMode = "produtos",
  onProgress?: (step: string) => void
): Promise<GeminiReceiptResponse> {
  // 1. Tenta processar via rota de backend com fallback de chaves no servidor (/api/gemini/ocr)
  try {
    onProgress?.(
      scanMode === "despesa"
        ? "Lendo conta/fatura de consumo com IA no servidor..."
        : "Processando notinha com IA no servidor..."
    );
    const resServer = await fetch("/api/gemini/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, scanMode }),
    });

    if (resServer.ok) {
      const dataServer = await resServer.json();
      if (dataServer.success && dataServer.data) {
        return dataServer.data;
      }
    }
  } catch (err) {
    console.warn("[OCR Backend Call Warning] Falha na rota do servidor, utilizando fallback do cliente:", err);
  }

  const apiKeys = obterChavesGeminiApi();

  if (apiKeys.length === 0) {
    throw new Error(
      "Chave de API não configurada. Por favor, adicione sua VITE_GEMINI_API_KEY do Google AI Studio no arquivo .env."
    );
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const promptText =
    scanMode === "despesa"
      ? `Você é um leitor e classificador especialista em contas de consumo, faturas e boletos bancários (água, luz, energia, internet, aluguel, impostos).
Analise a imagem da conta/fatura e extraia os dados estritamente em JSON puro no formato abaixo sem buscar itens individuais:
{
  "fornecedor": "Nome do emissor ou concessionária (ex: Sabesp, Enel, Cemig, Claro, Vivo, Prefeitura, Imobiliária)",
  "data_emissao": "YYYY-MM-DD",
  "valor_total": 150.00,
  "categoria_sugerida": "Energia | Água | Internet | Aluguel | Impostos | Telefone | Outros"
}
Responda apenas com o JSON puro sem formatação markdown.`
      : `Você é um leitor e classificador especialista em notas fiscais, NFC-e e cupons fiscais brasileiros para Confeitarias.

ATENÇÃO - VERIFICAÇÃO DE DOCUMENTO:
Verifique se o documento é uma nota fiscal de compra de produtos/insumos. Se for uma conta de consumo (água, energia, aluguel, telefone) ou boleto bancário, retorne APENAS um JSON puro com a chave:
{"erro_contexto": "Este documento é uma conta de consumo. Por favor, utilize o botão 'Escanear Conta/Despesa'."}

Caso seja uma notinha fiscal de compra de produtos, analise a imagem e extraia os dados estritamente em JSON puro no formato abaixo:
{
  "establishment": "Nome do estabelecimento ou supermercado",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "sale_number": "número da NF, NFCe, NFe, pedido ou cupom",
  "items": [
    {
      "name": "Nome/Descrição exata do item no cupom",
      "standard_name": "Nome normalizado de confeitaria (ex: Chocolate Nobre Ao Leite Melken, Cobertura Fracionada Top Harald, Granulado Gourmet, Caixa Bolo Alta 25x25x18, Caixa Salgado Rasa 25x25x3, Morango Bandeja 250g)",
      "category": "Chocolates & Coberturas | Lácteos & Recheios | Confeitos & Açúcares | Embalagens & Caixas | Aditivos & Corantes | Hortifrúti & Frutas | Outros Insumos",
      "quantity": 1,
      "is_fardo_ou_pacote": false,
      "embalagem_qtd": 1,
      "peso_ou_volume_g_ml": 1000,
      "unidade_medida_base": "g | kg | ml | l | un | bdj | cx | pct",
      "total_price": 10.50,
      "unit_price_calculated": 10.50
    }
  ],
  "total_amount": 10.50
}

Regras Específicas de Confeitaria:
1. DIFERENCIE CHOCOLATE NOBRE DE COBERTURA FRACIONADA: Se contiver 'MELKEN', 'SICAO', 'CALLEBAUT' ou 'NOBRE', classifique como 'Chocolate Nobre'. Se contiver 'TOP', 'HARALD TOP', 'FRACIONADO' ou 'MAVALERIO', classifique como 'Cobertura Fracionada'.
2. EMBALAGENS E CAIXAS: Se contiver dimensões de altura (ex: 25x25x18, 20x20x15), classifique como 'Caixa para Bolo Alta'. Se for rasa (ex: 25x25x3, 30x30x4), classifique como 'Caixa para Salgados/Tortas Rasa'.
3. MULTI-PACKS / FARDOS: Se o nome mencionar 'FD C/25', 'CX C/50', 'PCT C/10', marque "is_fardo_ou_pacote": true, coloque "embalagem_qtd": 25 (ou a quantidade do pacote) e calcule o "unit_price_calculated" dividindo o valor total pela quantidade de unidades contidas no fardo.
4. HORTIFRÚTI: Morangos e uvas em bandeja devem ter unidade "bdj" (bandeja).
Responda apenas com o JSON puro sem formatação markdown.`;

  const body = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
  };

  const MAX_TENTATIVAS_POR_CHAVE = 3;
  const TIMEOUT_MS = 30000;
  const MENSAGEM_ERRO_ALTO_VOLUME =
    "Devido ao alto volume de leituras no momento, o servidor de escaneamento está temporariamente instável. Por favor, aguarde alguns segundos e envie a imagem novamente.";

  let ultimoErro: any = null;

  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const keyInfo = apiKeys[keyIdx];
    const isFallbackKey = keyIdx > 0;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_POR_CHAVE; tentativa++) {
      const modelName = GEMINI_MODELS[(tentativa - 1) % GEMINI_MODELS.length];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyInfo.key}`;

      const labelBase = isFallbackKey
        ? `Alternado para Chave de Contingência (${modelName})...`
        : `Lendo documento com IA (${modelName})...`;

      onProgress?.(tentativa > 1 ? `${labelBase} (tentativa ${tentativa}/${MAX_TENTATIVAS_POR_CHAVE})` : labelBase);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          console.error(
            `[Gemini API Log] Chave: ${keyInfo.label} | Modelo: ${modelName} | HTTP Status: ${response.status} (tentativa ${tentativa}/${MAX_TENTATIVAS_POR_CHAVE}) | Detalhe:`,
            errText
          );

          if (response.status === 429 || response.status === 403 || response.status === 401) {
            console.warn(
              `[Gemini API Fallback] Chave ${keyInfo.label} retornou HTTP ${response.status} (Cota Esgotada/Bloqueio). Alternando para chave de contingência...`
            );
            ultimoErro = new Error(`Chave ${keyInfo.label} indisponível (HTTP ${response.status}).`);
            break;
          }

          if (response.status === 413 || response.status === 400) {
            if (errText.toLowerCase().includes("payload") || errText.toLowerCase().includes("size") || errText.toLowerCase().includes("too large")) {
              throw new Error("A imagem do documento é muito grande. O aplicativo a comprimiu automaticamente, por favor tente novamente.");
            }
          }

          if (tentativa < MAX_TENTATIVAS_POR_CHAVE) {
            const delayMs = 1500 * tentativa;
            await sleep(delayMs);
            continue;
          }

          ultimoErro = new Error(MENSAGEM_ERRO_ALTO_VOLUME);
          break;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonClean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonClean);

      } catch (err: any) {
        clearTimeout(timer);
        console.error(`[Gemini API Error] Chave: ${keyInfo.label} | Modelo: ${modelName} | Erro na tentativa ${tentativa}/${MAX_TENTATIVAS_POR_CHAVE}:`, err.message || err);
        ultimoErro = err;

        if (err.message?.includes("imagem do documento é muito grande") || err.name === "AbortError") {
          throw err;
        }

        if (tentativa < MAX_TENTATIVAS_POR_CHAVE) {
          const delayMs = 1500 * tentativa;
          await sleep(delayMs);
          continue;
        }
      }
    }
  }

  throw new Error(
    ultimoErro?.name === "AbortError"
      ? "A leitura do documento demorou mais que o esperado (Timeout de rede). Por favor, tente enviar novamente."
      : ultimoErro?.message || MENSAGEM_ERRO_ALTO_VOLUME
  );
}

export async function processarNotinhaComOCR(
  file: File,
  scanMode: ScanMode = "produtos",
  onStepProgress?: (step: string) => void
): Promise<ResultadoOCRNotinha> {
  onStepProgress?.("Otimizando e comprimindo imagem do documento...");

  const imageBase64 = await comprimirImagemParaBase64(file);
  const parsedJSON = await extractReceiptDataWithGemini(imageBase64, scanMode, onStepProgress);

  if ((parsedJSON as any)?.erro_contexto) {
    const msgErro = (parsedJSON as any).erro_contexto;
    throw new Error(msgErro);
  }

  if (scanMode === "despesa") {
    onStepProgress?.("Extraindo dados da conta de consumo...");
    const valTotal = Number(parsedJSON.valor_total || parsedJSON.total_amount) || 0;
    return {
      scanMode: "despesa",
      fornecedorNome: parsedJSON.fornecedor || parsedJSON.establishment || "Emissor Não Identificado",
      fornecedorEndereco: "Conta de Consumo / Fatura",
      numeroNota: parsedJSON.sale_number ? String(parsedJSON.sale_number) : "",
      numeroPedido: String(Math.floor(1000 + Math.random() * 9000)),
      dataCompra: parsedJSON.data_emissao || parsedJSON.date || new Date().toISOString().split("T")[0],
      horaCompra: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      itens: [],
      valorTotalNota: valTotal,
      categoriaSugerida: parsedJSON.categoria_sugerida || parsedJSON.category || "Outras Despesas",
    };
  }

  onStepProgress?.("Organizando itens e populando o modal de revisão...");

  const itensFormatados: ItemNotaFiscal[] = (parsedJSON.items || []).map((it) => {
    const qtd = Number(it.quantity) || 1;
    const total = Number(it.total_price) || 0;
    const unit = it.unit_price_calculated && it.unit_price_calculated > 0
      ? Number(it.unit_price_calculated)
      : qtd > 0 ? parseFloat((total / qtd).toFixed(2)) : total;
    const nomeOriginal = String(it.name || "Insumo").trim();
    const nomePadronizado = it.standard_name ? String(it.standard_name).trim() : nomeOriginal;

    return {
      id: crypto.randomUUID(),
      nome: nomePadronizado,
      quantidade: qtd,
      valorUnitario: unit,
      valorTotal: total,
      categoria: (it.category as any) || categorizarItemAutomatico(nomePadronizado),
    };
  });

  const totalCalculado = itensFormatados.reduce((sum, item) => sum + item.valorTotal, 0);
  const totalFinal =
    parsedJSON.total_amount && parsedJSON.total_amount > 0
      ? Number(parsedJSON.total_amount)
      : parseFloat(totalCalculado.toFixed(2));

  return {
    scanMode: "produtos",
    fornecedorNome: parsedJSON.establishment || "Estabelecimento Não Identificado",
    fornecedorEndereco: "Endereço extraído do comprovante",
    numeroNota: parsedJSON.sale_number ? String(parsedJSON.sale_number) : "",
    numeroPedido: String(Math.floor(1000 + Math.random() * 9000)),
    dataCompra: parsedJSON.date || new Date().toISOString().split("T")[0],
    horaCompra: parsedJSON.time ? String(parsedJSON.time) : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    itens: itensFormatados,
    valorTotalNota: totalFinal,
  };
}
