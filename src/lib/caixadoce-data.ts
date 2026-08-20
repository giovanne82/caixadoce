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
  }).format(valor);
}

export function gerarCodigoEstabelecimento(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CD-${num}`;
}
