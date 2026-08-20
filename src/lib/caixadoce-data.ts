export interface Estabelecimento {
  id: string;
  codigo: string;
  nome: string;
  endereco: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  chavePix?: string;
  tipoChavePix?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  logoUrl?: string;
}

export const ESTABELECIMENTO_PADRAO: Estabelecimento = {
  id: "est-1",
  codigo: "CD-1001",
  nome: "CaixaDoce Matriz",
  endereco: "Av. Principal, 1000 - Centro",
  cidade: "São Paulo",
  estado: "SP",
  tipoDocumento: "CNPJ",
  numeroDocumento: "00.000.000/0001-00",
  chavePix: "contato@caixadoce.com.br",
  tipoChavePix: "email",
  responsavel: "Administrador",
  telefone: "(11) 99999-9999",
  whatsapp: "(11) 99999-9999",
  email: "contato@caixadoce.com.br",
};

export type TransacaoTipo = "receita" | "despesa";
export type MetodoPagamento = "pix" | "cartao_credito" | "cartao_debito" | "dinheiro" | "boleto";
export type StatusTransacao = "concluida" | "pendente" | "cancelada";

export interface TransacaoFinanceira {
  id: string;
  estabelecimentoCodigo?: string;
  descricao: string;
  valor: number;
  tipo: TransacaoTipo;
  categoria: string;
  data: string;
  metodoPagamento: MetodoPagamento;
  status: StatusTransacao;
  clienteOuFornecedor?: string;
  observacoes?: string;
}

export interface Colaborador {
  id: string;
  estabelecimentoCodigo: string;
  nome: string;
  email: string;
  telefone?: string;
  funcao: "admin" | "gerente" | "operador";
  ativo: boolean;
  dataCadastro: string;
  abasPermitidas: string[];
}

// ==============================================================================
// ENCOMENDAS & CALENDÁRIO
// ==============================================================================

export type StatusEncomenda = "pendente" | "em_producao" | "pronta" | "entregue" | "cancelada";
export type StatusPagamentoEncomenda = "pendente" | "sinal_pago" | "pago_integral" | "pago_na_entrega";

export interface ItemEncomenda {
  id?: string;
  nome: string;
  quantidade: number;
  valorUnitario?: number;
  observacao?: string;
}

export interface Encomenda {
  id: string;
  estabelecimentoCodigo: string;
  clienteNome: string;
  clienteWhatsapp: string;
  dataEntrega: string; // YYYY-MM-DD
  horarioEntrega: string; // HH:mm
  itens: string; // Descrição ou resumo dos itens pedidos
  valorTotal: number;
  valorEntrada?: number;
  statusPagamento: StatusPagamentoEncomenda;
  status: StatusEncomenda;
  observacoes?: string;
  enderecoEntrega?: string;
  tipoEntrega?: "retirada" | "delivery";
  createdAt?: string;
}

export interface DataBloqueada {
  id: string;
  estabelecimentoCodigo: string;
  data: string; // YYYY-MM-DD
  motivo: string;
  createdAt?: string;
}

export const STATUS_ENCOMENDA_CONFIG: Record<
  StatusEncomenda,
  { label: string; color: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendente: { label: "Pendente", color: "text-amber-600 bg-amber-500/10 border-amber-500/30", badgeVariant: "secondary" },
  em_producao: { label: "Em Produção", color: "text-blue-600 bg-blue-500/10 border-blue-500/30", badgeVariant: "secondary" },
  pronta: { label: "Pronta p/ Entrega", color: "text-purple-600 bg-purple-500/10 border-purple-500/30", badgeVariant: "secondary" },
  entregue: { label: "Entregue", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30", badgeVariant: "default" },
  cancelada: { label: "Cancelada", color: "text-rose-600 bg-rose-500/10 border-rose-500/30", badgeVariant: "destructive" },
};

export const STATUS_PAGAMENTO_CONFIG: Record<
  StatusPagamentoEncomenda,
  { label: string; color: string }
> = {
  pendente: { label: "Pendente (0%)", color: "text-rose-600" },
  sinal_pago: { label: "Sinal Pago (50%)", color: "text-amber-600" },
  pago_integral: { label: "100% Pago", color: "text-emerald-600" },
  pago_na_entrega: { label: "Pagar na Entrega", color: "text-blue-600" },
};

export const CATEGORIAS_PADRAO = {
  receitas: [
    "Venda Direta / Balcão",
    "Encomenda Especial",
    "Assinatura / Mensalidade",
    "Delivery",
    "Eventos & Parcerias",
    "Outras Receitas",
  ],
  despesas: [
    "Insumos & Ingredientes",
    "Embalagens",
    "Equipe & Salários",
    "Aluguel & Contas (Água/Luz/Gás)",
    "Marketing & Anúncios",
    "Taxas & Impostos",
    "Manutenção de Equipamentos",
    "Outras Despesas",
  ],
};

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function formatarWhatsappLink(whatsapp: string, mensagem?: string): string {
  const cleanPhone = whatsapp.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const textEncoded = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${formattedPhone}${textEncoded}`;
}

export function gerarCodigoEstabelecimento(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CD-${num}`;
}
