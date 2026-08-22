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
  stripeAccountId?: string | null;
  repassarTaxaStripe?: boolean;
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
  stripeAccountId: null,
  repassarTaxaStripe: true,
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
  origem?: "Stripe" | "Manual";
}

export interface Colaborador {
  id: string;
  estabelecimentoCodigo: string;
  nome: string;
  email: string;
  pin?: string;
  telefone?: string;
  funcao?: "admin" | "gerente" | "operador";
  ativo: boolean;
  dataCadastro: string;
  abasPermitidas: string[];
}

// ==============================================================================
// CLIENTES (CUSTOMERS)
// ==============================================================================

export interface Cliente {
  id: string;
  estabelecimentoCodigo: string;
  nome: string;
  whatsapp: string;
  endereco?: string;
  observacoes?: string;
  createdAt?: string;
}

export const CLIENTES_PADRAO: Cliente[] = [
  {
    id: "cli-1",
    estabelecimentoCodigo: "CD-1001",
    nome: "Mariana Silva",
    whatsapp: "(11) 98765-4321",
    endereco: "Rua das Flores, 120 - Apto 42 - Jardim Paulista, São Paulo/SP",
    observacoes: "Cliente frequente de bolos decorados e brigadeiros.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cli-2",
    estabelecimentoCodigo: "CD-1001",
    nome: "Camila Guimarães",
    whatsapp: "(11) 97123-4567",
    endereco: "Av. Brigadeiro Luís Antônio, 3400 - Cerqueira César, São Paulo/SP",
    observacoes: "Prefere doces menos açucarados (Ninho e 50% Cacau).",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cli-3",
    estabelecimentoCodigo: "CD-1001",
    nome: "Lucas Martins",
    whatsapp: "(11) 99888-7766",
    endereco: "Rua Augusta, 850 - Consolação, São Paulo/SP",
    observacoes: "Pede bentô cakes personalizados para aniversários.",
    createdAt: new Date().toISOString(),
  },
];

export function obterClientes(estabelecimentoCodigo?: string): Cliente[] {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_customers_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function salvarClientesStorage(estabelecimentoCodigo: string, lista: Cliente[]) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_customers_${code}`, JSON.stringify(lista));
  } catch (e) {
    console.warn("Erro ao salvar clientes:", e);
  }
}

// ==============================================================================
// PRODUTOS & CARDÁPIO (PRODUCTS)
// ==============================================================================

export interface ProdutoCardapio {
  id: string;
  estabelecimentoCodigo: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  fotoUrl: string;
  destaque?: boolean;
  tempoPreparoHoras?: number;
  ativo?: boolean;
  createdAt?: string;
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
    ativo: true,
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
    ativo: true,
  },
  {
    id: "prod-3",
    estabelecimentoCodigo: "CD-1001",
    nome: "Caixa Brigadeiros Gourmet (12 un)",
    descricao: "Seleção com Brigadeiro Belga ao Leite, Ninho com Nutella, Churros com Doce de Leite e Pistache.",
    preco: 48.0,
    categoria: "Doces & Brigadeiros",
    fotoUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80",
    destaque: true,
    tempoPreparoHoras: 12,
    ativo: true,
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
    ativo: true,
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
    ativo: true,
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
    ativo: true,
  },
];

export function obterProdutosCardapio(codigoLoja?: string): ProdutoCardapio[] {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_cardapio_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function salvarProdutosCardapio(codigoLoja: string, produtos: ProdutoCardapio[]) {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_cardapio_${code}`, JSON.stringify(produtos));
  } catch (e) {
    console.warn("Erro ao salvar produtos do cardápio:", e);
  }
}

// ==============================================================================
// CATÁLOGO DE INSUMOS (ARTFESTA & PERSONALIZADOS)
// ==============================================================================

export interface InsumoCatalogo {
  id: string;
  nome: string;
  categoria: "Chocolates & Coberturas" | "Lácteos & Recheios" | "Confeitos & Açúcares" | "Embalagens & Descartáveis" | "Bases & Estruturas" | "Outros Insumos";
  marca?: string;
  unidadePadrao?: string;
}

export const CATALOGO_INSUMOS_ARTFESTA: InsumoCatalogo[] = [
  // Chocolates & Coberturas
  { id: "ins-1", nome: "Cobertura Harald Melken Ao Leite 1.01kg", categoria: "Chocolates & Coberturas", marca: "Harald" },
  { id: "ins-2", nome: "Cobertura Harald Melken Meio Amargo 1.01kg", categoria: "Chocolates & Coberturas", marca: "Harald" },
  { id: "ins-3", nome: "Cobertura Harald Melken Branco 1.01kg", categoria: "Chocolates & Coberturas", marca: "Harald" },
  { id: "ins-4", nome: "Cobertura Sicao Supreme Blend 1.01kg", categoria: "Chocolates & Coberturas", marca: "Sicao" },
  { id: "ins-5", nome: "Cobertura Sicao Supreme Ao Leite 1.01kg", categoria: "Chocolates & Coberturas", marca: "Sicao" },
  { id: "ins-6", nome: "Cobertura Sicao Supreme Branco 1.01kg", categoria: "Chocolates & Coberturas", marca: "Sicao" },
  { id: "ins-7", nome: "Cacau em Pó Alcalino 100% 500g", categoria: "Chocolates & Coberturas", marca: "Harald / Sicao" },
  { id: "ins-8", nome: "Chocolate em Pó 50% Cacau 1kg", categoria: "Chocolates & Coberturas", marca: "Harald" },

  // Lácteos & Recheios
  { id: "ins-9", nome: "Leite Condensado Moça 395g", categoria: "Lácteos & Recheios", marca: "Nestlé" },
  { id: "ins-10", nome: "Leite Condensado Piracanjuba 395g", categoria: "Lácteos & Recheios", marca: "Piracanjuba" },
  { id: "ins-11", nome: "Leite Condensado Itambé 395g", categoria: "Lácteos & Recheios", marca: "Itambé" },
  { id: "ins-12", nome: "Creme de Leite 200g", categoria: "Lácteos & Recheios", marca: "Piracanjuba / Nestlé" },
  { id: "ins-13", nome: "Creme de Leite Tetra Pak 1kg", categoria: "Lácteos & Recheios", marca: "Piracanjuba / Itambé" },
  { id: "ins-14", nome: "Leite em Pó Ninho Integral 380g", categoria: "Lácteos & Recheios", marca: "Nestlé" },
  { id: "ins-15", nome: "Chantilly Norcau Chanty 1L", categoria: "Lácteos & Recheios", marca: "Norcau" },
  { id: "ins-16", nome: "Chantilly ChantyPak Puratos 1L", categoria: "Lácteos & Recheios", marca: "Puratos" },
  { id: "ins-17", nome: "Chantilly Ricca 1L", categoria: "Lácteos & Recheios", marca: "Bunge" },
  { id: "ins-18", nome: "Nutella Balde 3kg", categoria: "Lácteos & Recheios", marca: "Ferrero" },
  { id: "ins-19", nome: "Nutella Pote 650g", categoria: "Lácteos & Recheios", marca: "Ferrero" },
  { id: "ins-20", nome: "Doce de Leite Confeiteiro 1kg", categoria: "Lácteos & Recheios", marca: "Viçosa / Itambé" },

  // Confeitos & Açúcares
  { id: "ins-21", nome: "Coco Ralado Fino Úmido e Adoçado 1kg", categoria: "Confeitos & Açúcares", marca: "Sococo" },
  { id: "ins-22", nome: "Coco Ralado Flococado 500g", categoria: "Confeitos & Açúcares", marca: "Menina / Sococo" },
  { id: "ins-23", nome: "Açúcar Impalpável Confeiteiro 1kg", categoria: "Confeitos & Açúcares", marca: "União / Mavalerio" },
  { id: "ins-24", nome: "Açúcar Glacúcar 1kg", categoria: "Confeitos & Açúcares", marca: "União" },
  { id: "ins-25", nome: "Emulsificante Emustab 200g", categoria: "Confeitos & Açúcares", marca: "Selecta" },
  { id: "ins-26", nome: "Granulado Belga Callebaut Ao Leite 500g", categoria: "Confeitos & Açúcares", marca: "Callebaut" },
  { id: "ins-27", nome: "Confeitos Chocoball Miçangas Coloridas", categoria: "Confeitos & Açúcares", marca: "Mavalerio" },

  // Embalagens & Descartáveis
  { id: "ins-28", nome: "Cake Board MDF Redondo 15cm", categoria: "Bases & Estruturas", marca: "ArtFesta" },
  { id: "ins-29", nome: "Cake Board MDF Redondo 20cm", categoria: "Bases & Estruturas", marca: "ArtFesta" },
  { id: "ins-30", nome: "Cake Board MDF Redondo 25cm", categoria: "Bases & Estruturas", marca: "ArtFesta" },
  { id: "ins-31", nome: "Cake Board MDF Redondo 30cm", categoria: "Bases & Estruturas", marca: "ArtFesta" },
  { id: "ins-32", nome: "Caixa de Bolo Alta com Visor 25x25x30cm", categoria: "Embalagens & Descartáveis", marca: "ArtFesta / Kraft" },
  { id: "ins-33", nome: "Caixa de Bolo Alta com Visor 30x30x30cm", categoria: "Embalagens & Descartáveis", marca: "ArtFesta / Kraft" },
  { id: "ins-34", nome: "Embalagens Articuladas H70 para Fatias", categoria: "Embalagens & Descartáveis", marca: "Sanpack / Hiperpack" },
  { id: "ins-35", nome: "Embalagens Articuladas H78 para Fatias Altas", categoria: "Embalagens & Descartáveis", marca: "Sanpack / Hiperpack" },
  { id: "ins-36", nome: "Copos Tampa Bolha 250ml (C/ 25 un)", categoria: "Embalagens & Descartáveis", marca: "Plastilânia" },
  { id: "ins-37", nome: "Copos Tampa Bolha 400ml (C/ 25 un)", categoria: "Embalagens & Descartáveis", marca: "Plastilânia" },
  { id: "ins-38", nome: "Forminhas 4 Pétalas N°4 (C/ 100 un)", categoria: "Embalagens & Descartáveis", marca: "Regina Festas" },
];

export function obterCatalogoInsumos(estabelecimentoCodigo?: string): InsumoCatalogo[] {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_supplies_${code}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return CATALOGO_INSUMOS_ARTFESTA;
}

export function salvarNovoInsumoCatalogo(estabelecimentoCodigo: string, novoNome: string): InsumoCatalogo {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  const catalogoAtual = obterCatalogoInsumos(code);

  const existente = catalogoAtual.find((i) => i.nome.toLowerCase() === novoNome.toLowerCase());
  if (existente) return existente;

  const novo: InsumoCatalogo = {
    id: `ins-${Date.now()}`,
    nome: novoNome.trim(),
    categoria: "Outros Insumos",
    marca: "Personalizado",
  };

  const atualizado = [novo, ...catalogoAtual];
  try {
    localStorage.setItem(`caixadoce_supplies_${code}`, JSON.stringify(atualizado));
  } catch {}

  return novo;
}

// ==============================================================================
// ENCOMENDAS & CALENDÁRIO & INSUMOS NECESSÁRIOS
// ==============================================================================

export type StatusEncomenda = "pendente" | "em_producao" | "pronta" | "entregue" | "cancelada";
export type StatusPagamentoEncomenda = "pendente" | "sinal_pago" | "pago_integral" | "pago_na_entrega";

export interface ItemPedidoEncomenda {
  id: string;
  produtoId?: string;
  nome: string;
  quantidade: number;
  precoUnitario?: number;
}

export interface InsumoNecessarioPedido {
  id: string;
  nome: string;
  comprado: boolean;
  quantidade?: number | string;
}

export interface Encomenda {
  id: string;
  estabelecimentoCodigo: string;
  clienteId?: string;
  clienteNome: string;
  clienteWhatsapp: string;
  dataEntrega: string; // YYYY-MM-DD
  horarioEntrega: string; // HH:mm
  itens: string; // Resumo textual
  itensDetalhes?: ItemPedidoEncomenda[]; // Tags estruturadas de produtos
  insumosNecessarios?: InsumoNecessarioPedido[]; // Tags de insumos vinculados com quantidade
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
  horaCompra?: string; // HH:mm:ss
  numeroNota?: string;
  numeroPedido?: string;
  fornecedorEndereco?: string;
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
    "marshmallow", "gelatina", "glicose", "forminha", "glitter comestivel", "desmoldante", "sicao",
    "harald", "melken", "supreme", "norcau", "callebaut"
  ];

  if (termosProducao.some((t) => n.includes(t))) {
    return "producao";
  }

  const termosUtensilios = [
    "forma", "assadeira", "espatula", "espátula", "bico", "manga confeitar", "saco confeitar",
    "bailarina", "fouet", "batedor", "balanca", "balança", "termometro", "pincel",
    "tapete silicone", "rolo", "cortador", "grade resfriamento", "pao duro", "pão duro",
    "batedeira", "mixer", "liquidificador", "tigela", "bowl", "estilete culinario", "cake board",
    "caixa bolo", "embalagem h70", "embalagem h78", "copo bolha"
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

export function correlacionarInsumosComItensNota(
  itensNota: ItemNotaFiscal[],
  encomendas: Encomenda[]
): { encomendaId: string; clienteNome: string; insumoId: string; insumoNome: string; itemNotaNome: string }[] {
  const correspondencias: { encomendaId: string; clienteNome: string; insumoId: string; insumoNome: string; itemNotaNome: string }[] = [];

  for (const enc of encomendas) {
    if (!enc.insumosNecessarios || enc.status === "cancelada" || enc.status === "entregue") continue;

    for (const insumo of enc.insumosNecessarios) {
      if (insumo.comprado) continue;

      const insumoTermo = insumo.nome.toLowerCase().replace(/[^a-z0-9]/g, " ");
      const palavrasChave = insumoTermo.split(" ").filter((p) => p.length >= 4);

      const matchedItemNota = itensNota.find((it) => {
        const itemTermo = it.nome.toLowerCase();
        return palavrasChave.some((palavra) => itemTermo.includes(palavra));
      });

      if (matchedItemNota) {
        correspondencias.push({
          encomendaId: enc.id,
          clienteNome: enc.clienteNome,
          insumoId: insumo.id,
          insumoNome: insumo.nome,
          itemNotaNome: matchedItemNota.nome,
        });
      }
    }
  }

  return correspondencias;
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

// ==============================================================================
// HELPERS DE MÁSCARA, FORMATAÇÃO & WHATSAPP
// ==============================================================================

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function aplicarMascaraTelefone(valor: string): string {
  const limpo = (valor || "").replace(/\D/g, "").slice(0, 11);
  if (!limpo) return "";
  if (limpo.length <= 2) return `(${limpo}`;
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
}

export function aplicarMascaraMoedaInput(valorInput: string): string {
  const digitos = valorInput.replace(/\D/g, "");
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  return `R$ ${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(centavos))}`;
}

export function converterMoedaInputParaNumero(valorFormatado: string): number {
  if (!valorFormatado) return 0;
  const limpo = valorFormatado.replace(/\D/g, "");
  if (!limpo) return 0;
  return Number(limpo) / 100;
}

export function formatarWhatsappLink(whatsapp: string, mensagem?: string): string {
  const cleanPhone = (whatsapp || "").replace(/\D/g, "");
  const textEncoded = mensagem ? encodeURIComponent(mensagem) : "";
  if (!cleanPhone) {
    return `https://api.whatsapp.com/send?text=${textEncoded}`;
  }
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${formattedPhone}${textEncoded ? `?text=${textEncoded}` : ""}`;
}

/**
 * Gera mensagem formatada e elegante com o resumo do pedido para enviar ao cliente no WhatsApp
 */
export function gerarMensagemResumoWhatsApp(encomenda: Encomenda, nomeLoja?: string): string {
  const dataFormatada = encomenda.dataEntrega.split("-").reverse().join("/");
  const hora = encomenda.horarioEntrega || "14:00";
  const valorTotal = formatarMoeda(encomenda.valorTotal);
  const sinalPago = formatarMoeda(encomenda.valorEntrada || 0);
  const saldoRestante = formatarMoeda(Math.max(0, encomenda.valorTotal - (encomenda.valorEntrada || 0)));
  const modalidade = encomenda.tipoEntrega === "delivery" ? `🚚 Entrega / Delivery (${encomenda.enderecoEntrega || "A combinar"})` : "🏬 Retirada no Balcão";

  let itensTexto = encomenda.itens;
  if (encomenda.itensDetalhes && encomenda.itensDetalhes.length > 0) {
    itensTexto = encomenda.itensDetalhes.map((it) => `• ${it.quantidade}x ${it.nome}`).join("\n");
  }

  return `✨ *Confirmação de Encomenda - ${nomeLoja || "CaixaDoce"}* ✨

Olá, *${encomenda.clienteNome}*! Seu pedido foi registrado com sucesso. Seguem os detalhes:

📅 *Data Prevista:* ${dataFormatada} às ${hora}
🎂 *Itens Pedidos:*
${itensTexto}

📍 *Modalidade:* ${modalidade}
${encomenda.observacoes ? `📝 *Observações:* ${encomenda.observacoes}\n` : ""}
💰 *Valor Total:* ${valorTotal}
💳 *Sinal Pago:* ${sinalPago}
💵 *Saldo Restante:* ${saldoRestante}

Agradecemos imensamente pela preferência! Caso precise de algum ajuste, estamos à disposição. 💕`;
}

export function obterNotinhasVinculadasPorLista(
  shoppingListId: string,
  estabelecimentoCodigo?: string
): string[] {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_linked_receipts_${code}_${shoppingListId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function salvarNotinhasVinculadasPorLista(
  shoppingListId: string,
  receiptIds: string[],
  estabelecimentoCodigo?: string
) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_linked_receipts_${code}_${shoppingListId}`, JSON.stringify(receiptIds));
  } catch (e) {
    console.warn("Erro ao salvar notinhas vinculadas por lista:", e);
  }
}

export function obterNotinhasVinculadasLista(estabelecimentoCodigo?: string): string[] {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_linked_receipts_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function salvarNotinhasVinculadasLista(estabelecimentoCodigo: string, receiptIds: string[]) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_linked_receipts_${code}`, JSON.stringify(receiptIds));
  } catch (e) {
    console.warn("Erro ao salvar notinhas vinculadas:", e);
  }
}

export function gerarCodigoEstabelecimento(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CD-${num}`;
}

export interface ItemListaCompra {
  id: string;
  estabelecimentoCodigo?: string;
  nome: string;
  quantidade: number;
  unidade?: string;
  comprado: boolean;
  encomendaId?: string;
  encomendaClienteNome?: string;
  clienteTags?: string[];
  categoria?: string;
  createdAt?: string;
}

export const ITENS_COMPRA_PADRAO: ItemListaCompra[] = [
  {
    id: "ic-1",
    estabelecimentoCodigo: "CD-1001",
    nome: "Leite Condensado Moça 395g",
    quantidade: 6,
    unidade: "un",
    comprado: false,
    categoria: "Insumos",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ic-2",
    estabelecimentoCodigo: "CD-1001",
    nome: "Cobertura Harald Melken Ao Leite 1kg",
    quantidade: 2,
    unidade: "kg",
    comprado: false,
    categoria: "Insumos",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ic-3",
    estabelecimentoCodigo: "CD-1001",
    nome: "Embalagem para Bolo de Pote 250ml (caixa c/ 50)",
    quantidade: 1,
    unidade: "cx",
    comprado: true,
    categoria: "Embalagens",
    createdAt: new Date().toISOString(),
  },
];

export interface ListaCompras {
  id: string;
  nome: string;
  estabelecimentoCodigo?: string;
  estabelecimentosVinculados?: string[];
  clienteTags?: string[];
  status: "ativa" | "concluida" | "arquivada";
  concluidaEm?: string;
  itens: ItemListaCompra[];
  createdAt: string;
}

export const LISTAS_COMPRAS_PADRAO: ListaCompras[] = [
  {
    id: "lc-1",
    nome: "Compras de Sexta",
    estabelecimentoCodigo: "CD-1001",
    estabelecimentosVinculados: ["Atacadão dos Confeiteiros S/A"],
    status: "ativa",
    itens: ITENS_COMPRA_PADRAO,
    createdAt: new Date().toISOString(),
  },
  {
    id: "lc-2",
    nome: "Festa da Maria",
    estabelecimentoCodigo: "CD-1001",
    estabelecimentosVinculados: ["ArtFesta Confeitaria & Embalagens"],
    status: "ativa",
    itens: [
      {
        id: "ic-201",
        estabelecimentoCodigo: "CD-1001",
        nome: "Chantilly Norcau 1L",
        quantidade: 4,
        unidade: "cx",
        comprado: false,
        clienteTags: ["Maria Silva"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "ic-202",
        estabelecimentoCodigo: "CD-1001",
        nome: "Granulado Crocante Melken 500g",
        quantidade: 2,
        unidade: "pct",
        comprado: true,
        clienteTags: ["Maria Silva"],
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "lc-3",
    nome: "Doces do Fim de Semana",
    estabelecimentoCodigo: "CD-1001",
    estabelecimentosVinculados: ["Supermercado Doce Preço Ltda"],
    status: "concluida",
    concluidaEm: new Date().toISOString(),
    itens: [
      {
        id: "ic-301",
        estabelecimentoCodigo: "CD-1001",
        nome: "Açúcar de Confeiteiro Impalpável 1kg",
        quantidade: 3,
        unidade: "kg",
        comprado: true,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

export function formatarCpfCnpj(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatarCodigoLoja(val: string): string {
  if (!val) return "";
  const upper = val.toUpperCase().trim();
  const clean = upper.replace(/[^A-Z0-9]/g, "");

  if (clean.startsWith("CD")) {
    const numPart = clean.slice(2);
    return numPart ? `CD-${numPart}` : "CD";
  }

  if (/^\d+$/.test(clean)) {
    return `CD-${clean}`;
  }

  return upper;
}
