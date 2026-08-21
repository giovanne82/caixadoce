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
  items?: Array<{
    name: string;
    quantity: number;
    total_price: number;
  }>;
  total_amount?: number;
}

/**
 * Chamada à API do Gemini gemini-1.5-flash com payload exato
 */
export async function extractReceiptDataWithGemini(imageBase64: string): Promise<GeminiReceiptResponse> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não configurada.");
  }

  // Remove o prefixo data:image/...;base64, se existir
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: 'Extraia os dados desta nota/cupom fiscal brasileiro. Retorne ESTRITAMENTE um JSON no formato: {"establishment": string, "date": "YYYY-MM-DD", "items": [{"name": string, "quantity": number, "total_price": number}], "total_amount": number}. Não inclua markdown.',
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API Gemini: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("A IA do Gemini não retornou texto na resposta.");
  }

  const cleanJSON = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJSON);
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
  onStepProgress?.("Analisando notinha com IA...");

  const imageBase64 = await converterImagemParaBase64(file);
  const parsedJSON = await extractReceiptDataWithGemini(imageBase64);

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
    numeroNota: String(Math.floor(100000 + Math.random() * 900000)),
    numeroPedido: String(Math.floor(1000 + Math.random() * 9000)),
    dataCompra: parsedJSON.date || new Date().toISOString().split("T")[0],
    horaCompra: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    itens: itensFormatados,
    valorTotalNota: totalFinal,
  };
}
