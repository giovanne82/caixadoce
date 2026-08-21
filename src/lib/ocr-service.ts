import { GoogleGenerativeAI } from "@google/generative-ai";
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
 * Leitura de Cupons Fiscais utilizando o SDK Oficial @google/generative-ai
 */
export async function extractReceiptDataWithGemini(imageBase64: string): Promise<GeminiReceiptResponse> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const prompt = `Você é especialista em cupons fiscais e relatórios gerenciais do Brasil.
Extraia os dados da imagem em JSON puro com o seguinte formato:
{
"establishment": "Nome da loja/empresa",
"date": "YYYY-MM-DD",
"items": [
{ "name": "Descrição do item", "quantity": 1, "total_price": 4.90 }
],
"total_amount": 72.60
}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    },
  ]);

  const response = await result.response;
  const rawText = response.text();
  return JSON.parse(rawText);
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
    numeroNota: String(Math.floor(100000 + Math.random() * 900000)),
    numeroPedido: String(Math.floor(1000 + Math.random() * 9000)),
    dataCompra: parsedJSON.date || new Date().toISOString().split("T")[0],
    horaCompra: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    itens: itensFormatados,
    valorTotalNota: totalFinal,
  };
}
