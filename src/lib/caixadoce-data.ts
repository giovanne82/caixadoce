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

// ==============================================================================
// SCANNER DE NOTAS & DESPESAS INTELIGENTE
// ==============================================================================

export type CategoriaDespesaItem = "producao" | "utensilios" | "consumo_proprio" | "outros";

export interface ItemNotaFiscal {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  categoria: CategoriaDespesaItem;
}

export interface DespesaNotaFiscal {
  id: string;
  estabelecimentoCodigo: string;
  fornecedorNome: string;
  dataCompra: string; // YYYY-MM-DD
  valorTotal: number;
  valorProducao: number;
  valorUtensilios: number;
  valorConsumoProprio: number;
  valorOutros: number;
  itens: ItemNotaFiscal[];
  comprovanteUrl?: string;
  metodoPagamento?: MetodoPagamento;
  createdAt?: string;
}

export const CATEGORIAS_DESPESA_CONFIG: Record<
  CategoriaDespesaItem,
  { label: string; icon: string; color: string; badgeClass: string; desc: string }
> = {
  producao: {
    label: "Produção",
    icon: "Cookie",
    color: "text-amber-600",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    desc: "Insumos e matérias-primas que compõem o custo direto do doce (leite condensado, farinha, chocolate, confeitos).",
  },
  utensilios: {
    label: "Utensílios / Equipamentos",
    icon: "UtensilsCrossed",
    color: "text-blue-600",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    desc: "Formas, espátulas, bicos de confeitar, balanças e materiais duráveis.",
  },
  consumo_proprio: {
    label: "Consumo Próprio / Pessoal",
    icon: "User",
    color: "text-rose-600",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    desc: "Itens de mercado ou uso pessoal da casa que NÃO devem entrar no custo do doce.",
  },
  outros: {
    label: "Genérico / Outros",
    icon: "Package",
    color: "text-stone-600",
    badgeClass: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
    desc: "Taxas, sacolas descartáveis, materiais de limpeza e despesas gerais.",
  },
};

export function categorizarItemAutomatico(nome: string): CategoriaDespesaItem {
  const n = (nome || "").toLowerCase();

  const termosProducao = [
    "leite condensado", "leite cond", "leite moca", "leite moça", "piracanjuba", "itambe", "nestle",
    "creme de leite", "creme leite", "chocolate", "cacau", "barra choco", "gotas choco", "nutella",
    "doce de leite", "farinha", "trigo", "acucar", "açucar", "açúcar", "refinado", "cristal", "demerara",
    "confeito", "granulado", "chocoball", "pasta americana", "chantilly", "chantypak", "corante",
    "manteiga", "margarina", "ovo", "ovos", "fermento", "bicarbonato", "essencia", "baunilha",
    "leite em po", "leite em pó", "ninho", "coco ralado", "amendoim", "nozes", "castanha",
    "marshmallow", "gelatina", "glicose", "forminha", "glitter comestivel", "desmoldante"
  ];

  if (termosProducao.some((t) => n.includes(t))) {
    return "producao";
  }

  const termosUtensilios = [
    "forma", "assadeira", "espatula", "espátula", "bico", "manga confeitar", "saco confeitar",
    "bailarina", "fouet", "batedor", "balanca", "balança", "termometro", "pincel",
    "tapete silicone", "rolo", "cortador", "grade resfriamento", "pao duro", "pão duro",
    "batedeira", "mixer", "liquidificador", "tigela", "bowl", "estilete culinario"
  ];

  if (termosUtensilios.some((t) => n.includes(t))) {
    return "utensilios";
  }

  const termosPessoal = [
    "sabonete", "shampoo", "condicionador", "pasta dente", "creme dental", "escova dente",
    "papel higienico", "papel higiênico", "desodorante", "detergente", "sabao po", "sabão em pó",
    "amaciante", "agua sanitaria", "água sanitária", "arroz", "feijao", "feijão", "oleo soja",
    "azeite", "carne", "frango", "cerveja", "refrigerante", "coca cola", "biscoito", "bolacha",
    "fralda", "amaciante", "desinfetante", "cerveja", "suco tang"
  ];

  if (termosPessoal.some((t) => n.includes(t))) {
    return "consumo_proprio";
  }

  return "outros";
}

// ==============================================================================
// CARDÁPIO PÚBLICO & PRODUTOS
// ==============================================================================

export interface ProdutoCardapio {
  id: string;
  estabelecimentoCodigo: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: "Bolos Decorados" | "Doces & Brigadeiros" | "Tortas & Sobremesas" | "Bentô Cakes" | "Kits Festa";
  fotoUrl: string;
  destaque?: boolean;
  tempoPreparoHoras?: number;
}

export const CATALOGO_PRODUTOS_PADRAO: ProdutoCardapio[] = [
  {
    id: "prod-1",
    estabelecimentoCodigo: "CD-1001",
    nome: "Bolo Vulcão Ninho com Nutella",
    descricao: "Massa fofinha de chocolate ou baunilha, com piscina cremosa de brigadeiro de Leite Ninho e cobertura generosa de Nutella pura.",
    preco: 95.0,
    categoria: "Bolos Decorados",
    fotoUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    destaque: true,
    tempoPreparoHoras: 24,
  },
  {
    id: "prod-2",
    estabelecimentoCodigo: "CD-1001",
    nome: "Bolo Red Velvet Especial",
    descricao: "Massa aveludada vermelha, recheio especial de cream cheese frosting suave e morangos frescos no topo.",
    preco: 140.0,
    categoria: "Bolos Decorados",
    fotoUrl: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=600&q=80",
    destaque: true,
    tempoPreparoHoras: 24,
  },
  {
    id: "prod-3",
    estabelecimentoCodigo: "CD-1001",
    nome: "Caixa Brigadeiros Gourmet (12 un)",
    descricao: "Seleção com Brigadeiro Belga ao Leite, Ninho com Nutella, Churros com Doce de Leite e Pistache.",
    preco: 48.0,
    categoria: "Doces & Brigadeiros",
    fotoUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80",
    destaque: true,
    tempoPreparoHoras: 12,
  },
  {
    id: "prod-4",
    estabelecimentoCodigo: "CD-1001",
    nome: "Bentô Cake Personalizado",
    descricao: "Mini bolo de 10cm com frase ou meme personalizado no topo. Ideal para presentes e comemorações intimistas.",
    preco: 45.0,
    categoria: "Bentô Cakes",
    fotoUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80",
    tempoPreparoHoras: 24,
  },
  {
    id: "prod-5",
    estabelecimentoCodigo: "CD-1001",
    nome: "Torta Holandesa Tradicional",
    descricao: "Base crocante de biscoitos Calypso, creme holandês aerado e ganache de chocolate meio amargo brilhante.",
    preco: 85.0,
    categoria: "Tortas & Sobremesas",
    fotoUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80",
    tempoPreparoHoras: 24,
  },
  {
    id: "prod-6",
    estabelecimentoCodigo: "CD-1001",
    nome: "Cento de Docinhos para Festa (100 un)",
    descricao: "Mix com 40 Brigadeiros, 30 Beijinhos de Coco e 30 Dois Amores. Enrolados na hora.",
    preco: 160.0,
    categoria: "Kits Festa",
    fotoUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    tempoPreparoHoras: 48,
  },
];

export function obterProdutosCardapio(codigoLoja?: string): ProdutoCardapio[] {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_cardapio_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return CATALOGO_PRODUTOS_PADRAO;
}

export function salvarProdutosCardapio(codigoLoja: string, produtos: ProdutoCardapio[]) {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_cardapio_${code}`, JSON.stringify(produtos));
  } catch (e) {
    console.warn("Erro ao salvar produtos do cardápio:", e);
  }
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
    "Insumos & Ingredientes (Produção)",
    "Utensílios & Equipamentos",
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
