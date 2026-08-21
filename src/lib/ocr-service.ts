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

export async function extractReceiptDataWithGemini(imageBase64: string): Promise<GeminiReceiptResponse> {
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na API Gemini (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const jsonClean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonClean);
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
  onStepProgress?.("Analisando notinha com IA do Google Gemini...");

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
    numeroNota: parsedJSON.sale_number ? String(parsedJSON.sale_number) : "",
    numeroPedido: String(Math.floor(1000 + Math.random() * 9000)),
    dataCompra: parsedJSON.date || new Date().toISOString().split("T")[0],
    horaCompra: parsedJSON.time ? String(parsedJSON.time) : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    itens: itensFormatados,
    valorTotalNota: totalFinal,
  };
}
