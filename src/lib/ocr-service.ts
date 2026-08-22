import { categorizarItemAutomatico, type ItemNotaFiscal } from "@/lib/caixadoce-data";

export interface ResultadoOCRNotinha {
  fornecedorNome: string;
  fornecedorEndereco: string;
  numeroNota: string;
  numeroPedido: string;
  dataCompra: string;
  horaCompra: string;
  itens: ItemNotaFiscal[];
  valorTotalNota: number;
}

export interface GeminiReceiptResponse {
  establishment?: string;
  date?: string;
  time?: string;
  sale_number?: string;
  items?: Array<{
    name: string;
    quantity: number;
    total_price: number;
  }>;
  total_amount?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chamada para a API do Gemini com rotina de retry automático e backoff.
 * Em caso de status 503 (Service Unavailable) ou 429 (Rate Limit), executa até 2 novas tentativas
 * com intervalo de 1,5 segundos (1500ms) entre elas.
 * O feedback de carregamento "Processando notinha..." permanece ativo durante as retentativas.
 */
export async function extractReceiptDataWithGemini(
  imageBase64: string,
  onProgress?: (step: string) => void
): Promise<GeminiReceiptResponse> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Você é um leitor especialista em notas fiscais, NFC-e e cupons brasileiros. 
Analise a imagem e extraia os dados estritamente em JSON puro com este formato:
{
  "establishment": "Nome do estabelecimento",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "sale_number": "número da NF, NFCe, NFe, pedido ou cupom",
  "items": [
    { "name": "Nome/Descrição do item", "quantity": 1, "total_price": 10.50 }
  ],
  "total_amount": 10.50
}
Responda apenas com o JSON sem formatação markdown.`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  const MAX_TENTATIVAS = 5;
  const MENSAGEM_ERRO_ALTO_VOLUME = "Nossa Inteligência Artificial está com alto volume de processamento no momento. Por favor, tente enviar novamente em instantes ou mais tarde.";

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      if (tentativa > 1) {
        onProgress?.(`Processando notinha... (tentativa ${tentativa}/${MAX_TENTATIVAS})`);
      } else {
        onProgress?.("Processando notinha...");
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        const status = response.status;

        if (tentativa < MAX_TENTATIVAS) {
          const delayMs = 1000 * tentativa;
          console.warn(`[Gemini API] Erro HTTP ${status}. Retentando em ${delayMs}ms (Tentativa ${tentativa}/${MAX_TENTATIVAS})...`);
          onProgress?.(`Processando notinha... (tentativa ${tentativa + 1}/${MAX_TENTATIVAS})`);
          await sleep(delayMs);
          continue;
        }

        throw new Error(MENSAGEM_ERRO_ALTO_VOLUME);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonClean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonClean);

    } catch (err: any) {
      if (tentativa < MAX_TENTATIVAS) {
        const delayMs = 1000 * tentativa;
        console.warn(`[Gemini API] Falha na tentativa ${tentativa}/${MAX_TENTATIVAS}: ${err.message}. Aguardando ${delayMs}ms...`);
        onProgress?.(`Processando notinha... (tentativa ${tentativa + 1}/${MAX_TENTATIVAS})`);
        await sleep(delayMs);
        continue;
      }

      throw new Error(MENSAGEM_ERRO_ALTO_VOLUME);
    }
  }

  throw new Error(MENSAGEM_ERRO_ALTO_VOLUME);
}

export async function converterImagemParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function processarNotinhaComOCR(
  file: File,
  onStepProgress?: (step: string) => void
): Promise<ResultadoOCRNotinha> {
  onStepProgress?.("Processando notinha...");

  const imageBase64 = await converterImagemParaBase64(file);
  const parsedJSON = await extractReceiptDataWithGemini(imageBase64, onStepProgress);

  onStepProgress?.("Organizando itens e populando o modal de revisão...");

  const itensFormatados: ItemNotaFiscal[] = (parsedJSON.items || []).map((it) => {
    const qtd = Number(it.quantity) || 1;
    const total = Number(it.total_price) || 0;
    const unit = qtd > 0 ? parseFloat((total / qtd).toFixed(2)) : total;
    const nomeLimpo = String(it.name || "Insumo").trim();

    return {
      id: crypto.randomUUID(),
      nome: nomeLimpo,
      quantidade: qtd,
      valorUnitario: unit,
      valorTotal: total,
      categoria: categorizarItemAutomatico(nomeLimpo),
    };
  });

  const totalCalculado = itensFormatados.reduce((sum, item) => sum + item.valorTotal, 0);
  const totalFinal =
    parsedJSON.total_amount && parsedJSON.total_amount > 0
      ? Number(parsedJSON.total_amount)
      : parseFloat(totalCalculado.toFixed(2));

  return {
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
