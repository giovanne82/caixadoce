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
  endereco: "",
  cidade: "",
  estado: "",
  tipoDocumento: "CNPJ",
  numeroDocumento: "",
  chavePix: "",
  tipoChavePix: "email",
  responsavel: "",
  telefone: "",
  whatsapp: "",
  email: "",
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
  if (!estabelecimentoCodigo) return [];
  const code = estabelecimentoCodigo.toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_customers_${code}`);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function salvarClientesStorage(estabelecimentoCodigo: string, lista: Cliente[]) {
  if (!estabelecimentoCodigo) return;
  const code = estabelecimentoCodigo.toUpperCase();
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
  availability_type?: "pronta_entrega" | "encomenda";
  available_days?: number[]; // [0,1,2,3,4,5,6] (0 = Dom, 1 = Seg, 2 = Ter, etc.)
  min_lead_time_days?: number; // antecedência mínima em dias
}

export const CATALOGO_PRODUTOS_PADRAO: ProdutoCardapio[] = [
  {
    id: "prod_1",
    estabelecimentoCodigo: "CD-1001",
    nome: "Bolo de Aniversário 2kg",
    descricao: "Massa pão de ló com recheio de brigadeiro gourmet e cobertura de chantininho.",
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
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_cardapio_${code}`);
      if (raw) return JSON.parse(raw);
    }
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
  categoria: "Chocolates & Coberturas" | "Lácteos & Recheios" | "Confeitos & Açúcares" | "Embalagens & Descartáveis" | "Bases & Estruturas" | "Outros Insumos" | "Confeitaria & Insumos";
  marca?: string;
  unidadePadrao?: string;
}

export const NOVOS_INSUMOS_SEED: string[] = [
  // Itens de Mercado e Hortifruti Solicitados
  "Pão",
  "Pão de Queijo",
  "Banana",
  "Cenoura",
  "Beterraba",
  "Abobrinha",
  "Salsinha",
  "Pão de Sal",
  "Torrada",
  "Manteiga",
  "Azeite",
  "Queijo Ralado",
  "Macarrão",
  "Milho",
  "Sabão Líquido",
  "Amaciante",
  "Detergente",
  "Coxinha",
  "Batata",
  "Morango",
  "Uva",
  "Nozes",
  "Avelã",
  "Maracujá",
  "Limão",
  "Coco",
  "Pêssego",
  "Frutas Vermelhas",
  "Framboesa",
  "Amora",
  "Mirtilo",
  "Óleo",
  "Cebola",
  "Curry",
  "Vinagre",
  "Vinagre Branco",
  "Mel",
  "Pêra",
  "Ameixa Seca",
  "Iogurte",
  "Tomate",
  "Frango",
  "Camarões",
  "Abóbora",
  "Alho-Poró",
  "Azeitona",
  "Tâmara",
  "Passas",
  "Manga",
  // Bandejas de Isopor
  "Bandeja isopor B1",
  "Bandeja isopor B2",
  "Bandeja isopor B3",
  "Bandeja isopor B4",
  "Bandeja isopor B5",

  // Marmitex de Isopor
  "Marmitex isopor 500ml",
  "Marmitex isopor 750ml",

  // Tapetinhos N7
  "Tapetinho N7 Amarelo",
  "Tapetinho N7 Azul",
  "Tapetinho N7 Azul Claro",
  "Tapetinho N7 Azul Escuro",
  "Tapetinho N7 Branco",
  "Tapetinho N7 Incolor",
  "Tapetinho N7 Laranja",
  "Tapetinho N7 Lilás",
  "Tapetinho N7 Prata",
  "Tapetinho N7 Preto",
  "Tapetinho N7 Rosa",
  "Tapetinho N7 Rosa Claro",
  "Tapetinho N7 Rosa Escuro",
  "Tapetinho N7 Verde",
  "Tapetinho N7 Verde Claro",
  "Tapetinho N7 Verde Escuro",
  "Tapetinho N7 Vermelho",
  "Tapetinho N7 Marrom",
  "Tapetinho N7 Roxo",

  // Tapetinhos N9
  "Tapetinho N9 Amarelo",
  "Tapetinho N9 Azul",
  "Tapetinho N9 Azul Claro",
  "Tapetinho N9 Azul Escuro",
  "Tapetinho N9 Branco",
  "Tapetinho N9 Incolor",
  "Tapetinho N9 Laranja",
  "Tapetinho N9 Lilás",
  "Tapetinho N9 Prata",
  "Tapetinho N9 Preto",
  "Tapetinho N9 Rosa",
  "Tapetinho N9 Rosa Claro",
  "Tapetinho N9 Rosa Escuro",
  "Tapetinho N9 Verde",
  "Tapetinho N9 Verde Claro",
  "Tapetinho N9 Verde Escuro",
  "Tapetinho N9 Vermelho",
  "Tapetinho N9 Marrom",
  "Tapetinho N9 Roxo",

  // Sacos e Cones
  "Saco incolor 10x15cm",
  "Saco incolor 15x30cm",
  "Saco cone incolor 10x15cm",
  "Saco cone incolor 14x22,5cm",
  "Saco adesivado",

  // Bandejas de Alumínio
  "Bandeja de alumínio B1",
  "Bandeja de alumínio B2",
  "Bandeja de alumínio B3",
  "Bandeja de alumínio B4",
  "Bandeja de alumínio B5",
  "Bandeja de alumínio B6",
  "Bandeja de alumínio B7",
  "Bandeja de alumínio B9",
  "Bandeja de alumínio B12",

  // Pratos de Alumínio
  "Prato de alumínio P1",
  "Prato de alumínio P2",
  "Prato de alumínio P3",
  "Prato de alumínio P4",
  "Prato de alumínio P5",
  "Prato de alumínio P6",
  "Prato de alumínio P7",
  "Prato de alumínio P8",
  "Prato de alumínio P9",
  "Prato de alumínio P12",

  // Outros Insumos
  "Recheio forneável",
  "Papel para bem casado",

  // Base de Confeitaria e Insumos Frequentes
  "Cobertura Harald Confeiteiro Ao Leite",
  "Cobertura Harald Confeiteiro Blend",
  "Cobertura Harald Confeiteiro Branco",
  "Cobertura Harald Confeiteiro Meio Amargo",
  "Chocolate em pó 50% Melken",
  "Chocolate em pó 33% Melken",
  "Chocolate em pó 50% SICAO",
  "Chocolate em pó 100% SICAO",
  "Chocolate em pó 100% Melken",
  "Brigadeiro Melken",
  "Brigadeiro Alispec",
  "Beijinho Melken",
  "Beijinho Alispec",
  "Cobertura CMC Arcolor",
  "Castanha de Caju G2T Grossa",
  "Coco Ralado",
  "Coco Flocos",
  "Leite em pó Integral Itambé",
  "Leite em pó Ninho",
  "Pão de ló",
  "Super Liga Neutra",
  "Emustab",
  "Papel Manteiga",
  "Papel Alumínio",
  "Touca TNT",
  "Luva Descartável",
  "Luva Vinil",
  "Lava Nitrílica",
  "Kit Pote Quadrado Prafesta 250ml",
  "Kit Pote Redondo 120ml",
  "Kit Pote Redondo 200ml",
  "Kit Pote Redondo 250ml",
  "Kit Pote Redondo 300ml",
  "Kit Pote Redondo 350ml",
  "Kit Pote Redondo 500ml",
  "Kit Pote Redondo 750ml",
  "Kit Pote Redondo 1000ml",
  "Palito Pequeno N9 BWB",
  "Palito Médio N14 BWB",
  "Palito Grande N28 BWB",
  "Palito Pirulito",
  "Espeto Golf",
  "Palito de Churrasco",
  "Cola Quente",
  "Cola Adesivo",
  "Fio de Nylon",
  "Cola Artesanato",
  "Fita Dupla Face",
  "Emulsão Saborizante",
  "Isopor Bolo Fake 10cm",
  "Isopor Bolo Fake 15cm",
  "Isopor Bolo Fake 20cm",
  "Isopor Bolo Fake 25cm",
  "Isopor Bolo Fake 30cm",
  "Isopor Bolo Fake 35cm",
  "Isopor Bolo Fake 40cm",
  "Cone Isopor",
  "Caixa de Salgado 20cm",
  "Caixa de Salgado 25cm",
  "Caixa de Salgado 30cm",
  "Caixa de Salgado 35cm",
  "Caixa de Salgado 40cm",
  "Caixa de Pizza 20cm",
  "Caixa de Pizza 25cm",
  "Caixa de Pizza 30cm",
  "Caixa de Pizza 35cm",
  "Caixa de Pizza 40cm",
  "Fecho Prático",
  "Saco Delivery P",
  "Saco Delivery PP",
  "Saco Delivery M",
  "Saco Delivery G",
  "Saco Delivery GG",
  "Sacola Delivery PP",
  "Sacola Delivery P",
  "Sacola Delivery M",
  "Sacola Delivery G",
  "Sacola Delivery GG",
  "Sanpack S630",
  "Sanpack S15",
  "Sanpack S13",
  "Sanpack S10",
  "Sanpack S20",
  "Sanpack S29",
  "Galvanotek G683",
  "Galvanotek G682",
  "Galvanotek G679",
  "Galvanotek G681",
  "Galvanotek G34 Mini",
  "Galvanotek G34",
  "Galvanotek GA12",
  "Sanpack S642",
  "Sanpack S640",
  "Sanpack S88",
  "Sanpack S641",
  "MDF Bandeja Retangular 30x40",
  "MDF Bandeja Retangular 50x35",
];

const INSUMOS_BASE_BRUTOS: string[] = [
  ...NOVOS_INSUMOS_SEED,
  "Aditivo",
  "Amendoim Xerem",
  "Açúcar Vermelho",
  "Açúcar Rosa",
  "Açúcar Azul",
  "Açúcar Cristal",
  "Açúcar Impalpável Arcolor",
  "Açúcar Impalpável Mix",
  "Açúcar Impalpável Mavalerio",
  "Açúcar Confeiteiro Arcolor",
  "Açúcar Confeiteiro Mix",
  "Açúcar Confeiteiro Mavalerio",
  "Açucar Gelado",
  "Caixa de Bolo 15cm",
  "Caixa de Bolo 20cm",
  "Caixa de Bolo 25cm",
  "Caixa de Bolo 30cm",
  "Caixa de Bolo 35cm",
  "Caixa de Bolo 40cm",
  "Caixa de Bolo 45cm",
  "Rolinho de Acetato 8cm",
  "Rolinho de Acetato 13cm",
  "Rolinho de Acetato 15cm",
  "Rolinho de Acetato 18cm",
  "Rolinho de Acetato",
  "Paçoca",
  "Saquinho Sacolé",
  "Saquinho Chup-chup",
  "Saco de pipoca",
  "Sacola Kraft Delivery",
  "Saco Kraft Delivery",
  "Saco de Confeitar Pequeno",
  "Saco de Confeitar Médio",
  "Saco de Confeitar Grande",
  "Prato MDF 10cm Redondo",
  "Prato MDF 15cm Redondo",
  "Prato MDF 20cm Redondo",
  "Prato MDF 25cm Redondo",
  "Prato MDF 30cm Redondo",
  "Prato MDF 35cm Redondo",
  "Prato MDF 40cm Redondo",
  "Prato MDF 45cm Redondo",
  "Prato MDF Retangular",
  "Prato MDF 20cm Quadrado",
  "Prato MDF 25cm Quadrado",
  "Prato MDF 30cm Quadrado",
  "Prato MDF 35cm Quadrado",
  "Prato MDF 40cm Quadrado",
  "Cakeboard 28cm",
  "Cakeboard 30cm",
  "Cakeboard",
  "Xarope Glucose",
  "Xarope Glucose Arcolor 500g",
  "Xarope Glucose Arcolor 250g",
  "Casquinhas Sorvete",
  "Cobertura",
  "Chantilly",
  "Glacê Real Arcolor",
  "Glacê Real Mix",
  "Glacê Real Mavalerio",
  "Fondant",
  "Sorvete",
  "Ganache",
  "Marshmallow",
  "Pasta Americana",
  "Confeitos e Granulados",
  "Cereal",
  "Pérolas",
  "Confeitos Artesanais",
  "Confeitos Decorados",
  "Granulado Macio Dona Jura",
  "Granulado Maci Mavalerio Mil Cores",
  "Granulado Confeiteiro Harald",
  "Granulado Macio",
  "Granulado Flocos Macio Mavaleri Mil Cores",
  "Granulado Flocos Macio Dona Jura",
  "Granulado Flocos Crocante",
  "Granulado Flocos Crocante Mavalerio",
  "Granule Melken Branco",
  "Granule Melken Ao Leite",
  "Granule Melken Meio Amargo",
  "Miçanga Azul",
  "Miçanga Vermelho",
  "Miçanga Rosa",
  "Miçanga Amarelo",
  "Miçanga Preta Chocolate",
  "Embalagem de Trufa Tradicional",
  "Embalagem de Trufa Coco",
  "Embalagem de Trufa Morango",
  "Embalagem de Trufa Abacaxi",
  "Embalagem de Trufa Beijinho",
  "Embalagem de Trufa Brigadeiro",
  "Embalagem de Trufa Limão",
  "Embalagem de Trufa Amendoim",
  "Embalagem de Trufa Azul",
  "Embalagem de Trufa Vermelho",
  "Embalagem de Trufa Dourado",
  "Embalagem de Trufa Prata",
  "Embalagem de Trufa Rosa",
  "Embalagem de Trufa Preto",
  "Embalagem de Trufa Laranja",
  "Embalagem de Trufa Lilás",
  "Corante Hidrossolúvel",
  "Corante Lipossolúvel",
  "Corante SoftGel",
  "Corante Líquido",
  "Desmoldante Carlex",
  "Desmoldante Dona Jura",
  "Desmoldante FAB",
  "Forma de Silicone 3 Partes Trufa Grande BWB / Porto Formas",
  "Forma de Silicone 3 Partes Trufa Média BWB / Porto Formas",
  "Forma de Silicone 3 Partes Trufa Pequena BWB / Porto Formas",
  "Desmoldante",
  "Especiarias",
  "Essências",
  "Essências Baunilha",
  "Essências Baunilha Branca",
  "Frutas Seca",
  "Leite Condensado Cemil",
  "Leite Condensado Piracanjuba",
  "Creme de Leite Piracanjuba",
  "Creme de Leite 200g",
  "Pó Decorativo",
  "Pó Cintilante",
  "Glitter",
  "Pó Neon",
  "Recheios",
  "Pasta Saborizante",
  "Pasta Americana Tradicional",
  "Pasta Americana Baunilha",
  "Pasta Americana Tutti-Fruit",
  "Recheio Pronto",
  "Recheio em Pó",
  "Recheio Forneável",
  "Corante SoftGel FAB",
  "Corante SoftGel Mix",
  "Cobertura Harald Top Branco",
  "Cobertura Harald Top Ao leite",
  "Cobertura Harald Top Blend",
  "Cobertura Harald Top Meio Amargo",
  "Chocolate Melken Ao Leite",
  "Chocolate Melken Blend",
  "Chocolate Melken Meio Amargo",
  "Chocolate Melken Branco",
  "Chocolate Sicao Ao Leite",
  "Chocolate Sicao Blend",
  "Chocolate Sicao Meio Amargo",
  "Chocolate Sicao Branco",
  "Chocolate Supreme Ao Leite",
  "Chocolate Supreme Blend",
  "Chocolate Supreme Branco",
  "Chocolate Supreme Meio Amargo",
  "Chantilly Norcau",
  "Chantilly Norcau +",
  "Chantilly Amelia",
  "Chantilly Amelia Supreme",
  "Chantilly Gran Finale FLEISCHMANN",
  "Corante Gel Super Vermelho 25g Fab",
  "Corante Gel Azul 25g Fab",
  "Corante Gel Azul Royal 25g Fab",
  "Corante Gel Preto 25g Fab",
  "Corante Gel Marrom 25g Fab",
  "Corante Gel Mix Preto Intenso 25g",
  "Corante Gel Verde Folha 25g Fab",
  "Corante Gel Azul Marinho 25g Fab",
  "Corante Gel Laranja 25g Fab",
  "Corante Gel Vermelho Morango Mix 25g",
  "Corante Gel Branco 25g Fab",
  "Corante Gel Amarelo Damasco 25g",
  "Corante Gel Rosa 25g Fab",
  "Corante Gel Roxa 25g Fab",
  "Corante Gel Verde 25g Fab",
  "Corante Gel Branco Leite Mix 25g",
  "Corante Gel Verde Musgo 25g",
  "Corante Gel Pink 25g Fab",
  "Corante Gel Verde Menta 25g Fab",
  "Corante Líquido Vermelho 10ml",
  "Corante Gel Amarelo 25g Fab",
  "Corante el Amarelo Gema 25g Fab",
  "Corante Líquido Verde Folha 10ml",
  "Corante GelRosa Intenso Mix 25g",
  "Corante Preto Pó Fosco Aveludado 3g Mix",
  "Corante Gel Rosa Seco 25g Fab",
  "Corante Gel Vermelho Natal 25h Fab",
  "Corante Gel Mix Laranja 25g",
  "Corante Gel Verde Folha Mix 25g",
  "Corante Gel Mix Azul Marinho 25g",
  "Corante Gel Azul Royal Mix 25g",
  "Corante Líquido Azul Anis 10ml",
  "Corante Gel Verde Hortela 25g",
  "Corante Chocolate Rosa 12g Mix",
  "Corante Gel Vermelho Noel 25g",
  "Corante Líquido Laranja com Mix",
  "Corante Líquido Mix Azul Jeans 10ml",
  "Corante Gel 25g Vermelho Rubi Fab",
  "Corante Gel Azul Tiffany 25g Fab",
  "Corante Gel Amarelo Candy Mix 25g",
  "Corante Gel Amarelo.gema Mix 25g",
  "Corante Gel Azul Anis Mix 25g",
  "Corante Gel Rosa Intenso Mix 25g",
  "Corante Gel Vinho Bordo Mix 25g",
  "Corante Líquido Vermelho Morango 10ml Mix",
  "Corante Gel Mix Azul Bebe 25g",
  "Corante Gel Mix Lilas 25g",
  "Corante Líquido 10ml Amarelo Gema",
  "Corante Mix Chocolate Amarelo 12g Mix",
  "Corante Chocolate Verde 12g Mix",
  "Corante Gel Pink Mix 25g",
  "Corante Gel Rosa Bebe Mix 25g",
  "Durex",
  "Fita Adesiva",
  "Pó de Sobremesa Maracujá",
  "Pó de Sobremesa Morango",
  "Pó de Sobremesa Frutas Vermelhas",
  "Pós de Sobremesa Pistache",
  "Sanpack S32 Alta",
  "Sanpack S32 Média",
  "Sanpack S50 Alta",
  "Sanpack S50 Média",
  "Sanpack S65",
  "Sanpack S70",
  "Sanpack S80",
  "Sanpack S78",
  "Sanpack S641",
  "Sanpack S642",
  "Galvanotek G684",
  "Galvanotek G50 Alta",
  "Galvanotek G50 Média",
  "Galvanotek G78",
  "Hiperpack H78",
  "Hiperpack H70",
  "Hiperpack H50 Alta",
  "Creme de Avelã",
  "Nutella",
  "Forma 4 Pétala c/100 Unid.",
  "Porta Forminha 4 Pétalas c/50 Acetato",
  "Forma 4 Pétalas c/50 Azul",
  "Forma 4 Pétalas Rosa Escuro c/50",
  "Forma 4 Pétalas c/50 Azul Claro",
  "Forma 4 Pétalas c/50 Vermelho",
  "Forma 4 Pétalas c/50 Rosa Chiclete",
  "Forma 4 Pétalas Preto c/50",
  "Forma 4 Pétalas Verde Bandeira c/50",
  "Forma 4 Pétalas Marrom c/50",
  "Forma 4 Pétalas c/50 Amarelo",
  "Forma 4 Pétalas c/50 Pink",
  "Forma 4 Pétalas c/50 Branco",
  "Forma 4 Pétalas c/50 Lilás",
  "Forma 4 Pétalas c/ 50 Pct Xadrez Vermelho",
  "Forma 4 Pétalas Verde Folha c/50",
  "Forma 4 Pétalas Areia c/50",
  "Forma 4 Pétalas Roxo c/50",
  "Forma 4 Pétalas Azul Royal c/50",
  "Forma 4 Pétalas c/50 - Salmão",
  "4 Pétala Dourada Metalizada c/50",
  "Forma 4 Pétalas c/50 Laranja",
  "Forma 4 Pétalas c/50 Rosa",
  "Porta Forminha 4 Pétalas c/50 - Bege",
  "Porta Forminha 4 Pétalas c/50 Verde Eucalipto",
  "Forma 4 Pétalas c/50 Poá Amarelo/Branco",
  "Forma 4 Pétalas Neon c/50 Verde Limão",
  "Forma 4 Pétalas - c/50 Laço Vermelho",
  "Forma 4 Pétalas c/ 50 - Xadrez Azul",
  "Porta Forminha 4 Pétalas c/50 Coração",
  "4 Pétala Prata Metalizada",
  "Forma 4 Pétalas c/50 Carros",
  "Forma 4 Pétalas c/50 - Glitter Dourado",
  "Forma 4 Pétalas c/50 Pct c/20 - Gol",
  "Forma 4 Pétalas Francesinha Verde Bandeira c/50",
  "Forma 4 Pétalas Francesinha Vermelho c/50",
  "Forma 4 Pétalas",
  "Fita de Cetim",
  "Fita Gorgurão",
  "Fio de Nylon",
  "Barbante",
  "Bandeja de Isopor Retangular",
  "Bandeja de Isopor Quadrada",
  "Prato de Isopor",
  "Disco de Isopor",
  "Diso de Isopor 18cm",
  "Diso de Isopor 20cm",
  "Diso de Isopor 23cm",
  "Forminha Doce Nº 00",
  "Forminha Doce Nº 0",
  "Forminha Doce Nº 1",
  "Forminha Doce Nº 2",
  "Forminha Doce Nº 3",
  "Forminha Doce Nº 4",
  "Forminha Doce Nº 5",
  "Forminha Doce Nº 6",
];

// Deduplicação estrita (Case-insensitive) para descarte de itens duplicados
const nomesVistosSeed = new Set<string>();
export const LISTA_SUGESTOES_INSUMOS: string[] = [];

for (const item of INSUMOS_BASE_BRUTOS) {
  const clean = item.trim();
  const lower = clean.toLowerCase();
  if (clean && !nomesVistosSeed.has(lower)) {
    nomesVistosSeed.add(lower);
    LISTA_SUGESTOES_INSUMOS.push(clean);
  }
}

export const CATALOGO_INSUMOS_PADRAO: InsumoCatalogo[] = LISTA_SUGESTOES_INSUMOS.map((nome, index) => ({
  id: `ins-${index + 1}`,
  nome,
  categoria: "Confeitaria & Insumos",
}));

export const CATALOGO_INSUMOS_ARTFESTA = CATALOGO_INSUMOS_PADRAO;

export function obterCatalogoInsumos(estabelecimentoCodigo?: string): InsumoCatalogo[] {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_supplies_${code}`);
      if (raw) {
        const list: InsumoCatalogo[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          const nomesExistentes = new Set(list.map((i) => i.nome.toLowerCase().trim()));
          const novosDoSeed = CATALOGO_INSUMOS_PADRAO.filter(
            (item) => !nomesExistentes.has(item.nome.toLowerCase().trim())
          );

          if (novosDoSeed.length > 0) {
            const fundido = [...list, ...novosDoSeed];
            localStorage.setItem(`caixadoce_supplies_${code}`, JSON.stringify(fundido));
            return fundido;
          }
          return list;
        }
      }
    }
  } catch {}
  return CATALOGO_INSUMOS_PADRAO;
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
export type StatusPagamentoEncomenda = "pendente" | "sinal_pago" | "pago_integral" | "pago_na_entrega" | "cartao_pendente" | "pix_pendente";

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

export interface PagamentoItem {
  id: string;
  data: string; // YYYY-MM-DD
  valor: number;
  observacao?: string;
}

export function calcularTotalPagoEncomenda(encomenda: Partial<Encomenda>): number {
  if (encomenda.historicoPagamentos && encomenda.historicoPagamentos.length > 0) {
    return encomenda.historicoPagamentos.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  }
  if (encomenda.paymentsHistory && (encomenda.paymentsHistory as any[]).length > 0) {
    return (encomenda.paymentsHistory as any[]).reduce((sum, item) => sum + (Number(item.valor || item.amount) || 0), 0);
  }
  return Number(encomenda.valorEntrada) || 0;
}

export function isEncomendaTotalmentePaga(encomenda: Partial<Encomenda>): boolean {
  if (!encomenda) return false;
  const valorTotal = Number(encomenda.valorTotal) || 0;
  const totalPago = calcularTotalPagoEncomenda(encomenda);
  if (valorTotal > 0) {
    return totalPago >= valorTotal - 0.01;
  }
  return (encomenda.statusPagamento as string) === "pago" || encomenda.statusPagamento === "pago_integral";
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
  historicoPagamentos?: PagamentoItem[];
  paymentsHistory?: PagamentoItem[];
  statusPagamento: StatusPagamentoEncomenda;
  status: StatusEncomenda;
  observacoes?: string;
  enderecoEntrega?: string;
  tipoEntrega?: "retirada" | "delivery";
  temTopoBolo?: boolean;
  detalhesTopoBolo?: string;
  temVela?: boolean;
  detalhesVela?: string;
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
  cartao_pendente: { label: "Aguardando Cartão", color: "text-purple-600" },
  pix_pendente: { label: "Aguardando Pix", color: "text-indigo-600" },
};

// ==============================================================================
// SCANNER DE NOTAS & DESPESAS INTELIGENTE
// ==============================================================================

export type CategoriaDespesaItem = "producao" | "utensilios" | "consumo_proprio" | "outros";

export interface ItemNotaFiscal {
  id: string;
  nome: string;
  nomePadronizado?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  categoria: CategoriaDespesaItem;
}

export function normalizarNomeInsumo(nome: string): string {
  if (!nome) return "Insumo Diversos";
  let clean = nome.trim();

  // Preserva especificações técnicas cruciais (ex: %, %, fat, etc.)
  // Abreviações de supermercado comuns
  clean = clean
    .replace(/\bLT\b|\bLITE\b/gi, "Leite")
    .replace(/\bCOND\b|\bCONDENS\b/gi, "Condensado")
    .replace(/\bCHOCO\b|\bCHOCOL\b/gi, "Chocolate")
    .replace(/\bMARG\b/gi, "Margarina")
    .replace(/\bDESN\b/gi, "Desnatado")
    .replace(/\bSEMIDESN\b/gi, "Semidesnatado")
    .replace(/\bINTEG\b/gi, "Integral")
    .replace(/\bPO\b/gi, "em Pó")
    .replace(/\bC\/\s*SAL\b/gi, "com Sal")
    .replace(/\bS\/\s*SAL\b/gi, "sem Sal")
    .replace(/\bCX\b|\bPCT\b|\bFD\b|\bTP\b/gi, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/gi, "") // remove apenas dimensões/pesos redundantes do final
    .replace(/\s+/g, " ")
    .trim();

  return clean
    .split(" ")
    .map((word) => {
      if (word.includes("%")) return word; // Preserva porcentagens técnicas exatamente (ex: 8%, 50%)
      if (word.length <= 2 && !word.match(/\d/)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
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

export function converterMoedaInputParaNumero(valorFormatado: string | number): number {
  if (typeof valorFormatado === "number") {
    return isNaN(valorFormatado) ? 0 : valorFormatado;
  }
  if (!valorFormatado) return 0;

  const str = String(valorFormatado).trim();
  if (!str) return 0;

  // Se a string já contiver vírgula decimal (ex: "R$ 470,00" ou "470,00"):
  if (str.includes(",")) {
    const limpo = str.replace(/[^\d,]/g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }

  // Se a string contiver ponto decimal explícito com duas casas (ex: "470.00"):
  if (str.includes(".")) {
    const limpo = str.replace(/[^\d.]/g, "");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }

  // Caso seja apenas dígitos (ex: centavos brutos "47000"):
  const apenasDigitos = str.replace(/\D/g, "");
  if (!apenasDigitos) return 0;
  return Number(apenasDigitos) / 100;
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

import { generatePixPayload } from "./pix-utils";

export { generatePixPayload, calculateCRC16, formatPixKey, type ContaPix } from "./pix-utils";

export interface DadosLojaPix {
  nomeLoja?: string;
  chavePix?: string;
  favorecidoPix?: string;
  cidadeLoja?: string;
}

/**
 * Gera mensagem formatada e elegante com o resumo do pedido para enviar ao cliente no WhatsApp
 */
export function gerarMensagemResumoWhatsApp(
  encomenda: Encomenda,
  dadosLoja?: string | DadosLojaPix
): string {
  const nomeLoja = typeof dadosLoja === "string" ? dadosLoja : dadosLoja?.nomeLoja || "CaixaDoce";
  const chavePix = typeof dadosLoja === "object" ? dadosLoja?.chavePix : undefined;
  const favorecido = typeof dadosLoja === "object" ? dadosLoja?.favorecidoPix : undefined;
  const cidade = typeof dadosLoja === "object" ? dadosLoja?.cidadeLoja : undefined;

  const dataFormatada = encomenda.dataEntrega.split("-").reverse().join("/");
  const hora = encomenda.horarioEntrega || "14:00";
  const totalPago = calcularTotalPagoEncomenda(encomenda);
  const saldoRestanteNum = Math.max(0, encomenda.valorTotal - totalPago);

  const valorTotal = formatarMoeda(encomenda.valorTotal);
  const sinalPago = formatarMoeda(totalPago);
  const saldoRestante = formatarMoeda(saldoRestanteNum);
  const modalidade = encomenda.tipoEntrega === "delivery" ? `🚚 Entrega / Delivery (${encomenda.enderecoEntrega || "A combinar"})` : "🏬 Retirada no Balcão";

  let itensTexto = encomenda.itens;
  if (encomenda.itensDetalhes && encomenda.itensDetalhes.length > 0) {
    itensTexto = encomenda.itensDetalhes.map((it) => `• ${it.quantidade}x ${it.nome}`).join("\n");
  }

  let topoVelaTexto = "";
  if (encomenda.temTopoBolo) {
    topoVelaTexto += `\n🎂 *Topo de Bolo:* ${encomenda.detalhesTopoBolo || "Sim"}`;
  }
  if (encomenda.temVela) {
    topoVelaTexto += `\n🕯️ *Vela:* ${encomenda.detalhesVela || "Sim"}`;
  }

  // Exibe a Chave Pix limpa, o favorecido e o valor devido na mensagem do WhatsApp
  let blocoPix = "";
  const valorParaPix = saldoRestanteNum > 0 ? saldoRestanteNum : (encomenda.valorTotal > 0 ? encomenda.valorTotal : 0);

  if (chavePix && chavePix.trim().length > 0 && valorParaPix > 0) {
    const blocoFavorecido = favorecido ? `\n👤 *Favorecido:* ${favorecido}` : "";
    blocoPix = `\n\n💳 *Forma de Pagamento:* PIX\n💰 *Valor Devido:* ${formatarMoeda(valorParaPix)}${blocoFavorecido}\n🔑 *Chave Pix:* ${chavePix}`;
  }

  return `✨ *Confirmação de Encomenda - ${nomeLoja}* ✨

Olá, *${encomenda.clienteNome}*! Seu pedido foi registrado com sucesso. Seguem os detalhes:

📅 *Data Prevista:* ${dataFormatada} às ${hora}
🎂 *Itens Pedidos:*
${itensTexto}${topoVelaTexto}

📍 *Modalidade:* ${modalidade}
${encomenda.observacoes ? `📝 *Observações:* ${encomenda.observacoes}\n` : ""}
💰 *Valor Total:* ${valorTotal}
💳 *Total Pago:* ${sinalPago}
💵 *Saldo Restante:* ${saldoRestante}${blocoPix}

Agradecemos imensamente pela preferência! Caso precise de algum ajuste, estamos à disposição. 💕`;
}

export function obterNotinhasVinculadasPorLista(
  shoppingListId: string,
  estabelecimentoCodigo?: string
): string[] {
  if (!estabelecimentoCodigo) return [];
  const code = estabelecimentoCodigo.toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_linked_receipts_${code}_${shoppingListId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function salvarNotinhasVinculadasPorLista(
  shoppingListId: string,
  receiptIds: string[],
  estabelecimentoCodigo?: string
) {
  if (!estabelecimentoCodigo) return;
  const code = estabelecimentoCodigo.toUpperCase();
  try {
    localStorage.setItem(`caixadoce_linked_receipts_${code}_${shoppingListId}`, JSON.stringify(receiptIds));
  } catch (e) {
    console.warn("Erro ao salvar notinhas vinculadas por lista:", e);
  }
}

export function obterNotinhasVinculadasLista(estabelecimentoCodigo?: string): string[] {
  if (!estabelecimentoCodigo) return [];
  const code = estabelecimentoCodigo.toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_linked_receipts_${code}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function salvarNotinhasVinculadasLista(estabelecimentoCodigo: string, receiptIds: string[]) {
  if (!estabelecimentoCodigo) return;
  const code = estabelecimentoCodigo.toUpperCase();
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
  data?: string;
  valorEstimado?: number;
  comprovanteUrl?: string;
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

export function formatarCep(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// ==============================================================================
// REGRAS DE AGENDAMENTO E BLOQUEIO DE DATAS (SCHEDULING RULES)
// ==============================================================================

export interface RegrasAgendamento {
  antecedenciaMinimaDias: number; // 0 = mesmo dia, 1 = 24h, 2 = 48h...
  diasSemanaDisponiveis: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  datasBloqueadas: string[]; // YYYY-MM-DD
  horarioAbertura: string; // Ex: "09:00"
  horarioFechamento: string; // Ex: "18:00"
}

export const REGRAS_AGENDAMENTO_PADRAO: RegrasAgendamento = {
  antecedenciaMinimaDias: 1,
  diasSemanaDisponiveis: [1, 2, 3, 4, 5, 6], // Segunda a Sábado por padrão
  datasBloqueadas: [],
  horarioAbertura: "09:00",
  horarioFechamento: "18:00",
};

export function obterRegrasAgendamento(estabelecimentoCodigo?: string): RegrasAgendamento {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_regras_agendamento_${code}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...REGRAS_AGENDAMENTO_PADRAO, ...parsed };
      }
    }
  } catch {}
  return REGRAS_AGENDAMENTO_PADRAO;
}

export function salvarRegrasAgendamentoStorage(estabelecimentoCodigo: string, regras: RegrasAgendamento) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_regras_agendamento_${code}`, JSON.stringify(regras));
  } catch (e) {
    console.warn("Erro ao salvar regras de agendamento:", e);
  }
}

export function validarDataEntrega(
  dataIso: string,
  regras: RegrasAgendamento
): { valida: boolean; motivo?: string } {
  if (!dataIso) return { valida: false, motivo: "Selecione uma data para a encomenda." };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const parts = dataIso.split("-").map(Number);
  if (parts.length !== 3) return { valida: false, motivo: "Data em formato inválido." };
  const [ano, mes, dia] = parts;
  const dataAlvo = new Date(ano, mes - 1, dia);
  dataAlvo.setHours(0, 0, 0, 0);

  // 1. Antecedência Mínima
  const diffTime = dataAlvo.getTime() - hoje.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < (regras.antecedenciaMinimaDias || 0)) {
    if (regras.antecedenciaMinimaDias === 0) {
      if (diffDays < 0) return { valida: false, motivo: "A data informada já passou." };
    } else {
      return {
        valida: false,
        motivo: `Encomendas devem ser feitas com no mínimo ${regras.antecedenciaMinimaDias} dia(s) de antecedência.`,
      };
    }
  }

  // 2. Dias da Semana Disponíveis
  const diaSemana = dataAlvo.getDay(); // 0 = Dom, 1 = Seg, etc.
  if (!regras.diasSemanaDisponiveis || !regras.diasSemanaDisponiveis.includes(diaSemana)) {
    const NOMES_DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return {
      valida: false,
      motivo: `A loja não realiza entregas em ${NOMES_DIAS[diaSemana]}s.`,
    };
  }

  // 3. Datas Bloqueadas Manualmente (Agenda Cheia / Recesso)
  if (regras.datasBloqueadas && regras.datasBloqueadas.includes(dataIso)) {
    return {
      valida: false,
      motivo: "Esta data está indisponível na agenda da loja (agenda cheia ou recesso).",
    };
  }

  return { valida: true };
}

export function validarHorarioEntrega(
  horario: string,
  regras: RegrasAgendamento
): { valido: boolean; motivo?: string } {
  if (!horario) return { valido: true };

  const hForm = horario.trim();
  if (hForm < regras.horarioAbertura || hForm > regras.horarioFechamento) {
    return {
      valido: false,
      motivo: `Horário fora do expediente da loja (${regras.horarioAbertura} às ${regras.horarioFechamento}).`,
    };
  }

  return { valido: true };
}

export function formatarBadgeDisponibilidadeProduto(prod: ProdutoCardapio): {
  texto: string;
  isProntaEntrega: boolean;
} {
  const isPronta = prod.availability_type === "pronta_entrega";

  if (isPronta) {
    if (prod.available_days && prod.available_days.length > 0 && prod.available_days.length < 7) {
      const DIAS_SIGLAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const ordenados = [...prod.available_days].sort((a, b) => a - b);
      const primeiro = DIAS_SIGLAS[ordenados[0]];
      const ultimo = DIAS_SIGLAS[ordenados[ordenados.length - 1]];
      const diasTexto = ordenados.length === 1 ? primeiro : `${primeiro} a ${ultimo}`;
      return {
        texto: `⚡ Pronta Entrega (${diasTexto})`,
        isProntaEntrega: true,
      };
    }
    return {
      texto: "⚡ Pronta Entrega",
      isProntaEntrega: true,
    };
  }

  // Sob Encomenda
  const diasLead = prod.min_lead_time_days ?? (prod.tempoPreparoHoras ? Math.ceil(prod.tempoPreparoHoras / 24) : 1);
  if (diasLead === 0) {
    return {
      texto: "🕒 Encomenda no mesmo dia",
      isProntaEntrega: false,
    };
  } else if (diasLead === 1) {
    return {
      texto: "🕒 Antecedência: ~24h",
      isProntaEntrega: false,
    };
  } else {
    return {
      texto: `🕒 Antecedência: ${diasLead} dia(s)`,
      isProntaEntrega: false,
    };
  }
}

export function calcularRegrasAgendamentoCarrinho(
  regrasLoja: RegrasAgendamento,
  itensCarrinho: { produto: ProdutoCardapio; quantidade: number }[]
): RegrasAgendamento {
  if (!itensCarrinho || itensCarrinho.length === 0) return regrasLoja;

  const todosProntaEntrega = itensCarrinho.every(
    (item) => item.produto.availability_type === "pronta_entrega"
  );

  let maxLeadTime = todosProntaEntrega ? 0 : (regrasLoja.antecedenciaMinimaDias || 0);
  let diasPermitidos = [...(regrasLoja.diasSemanaDisponiveis || [0, 1, 2, 3, 4, 5, 6])];

  itensCarrinho.forEach(({ produto }) => {
    // 1. Maior prazo de antecedência exigido pelos produtos de encomenda
    const isEncomenda = produto.availability_type !== "pronta_entrega";

    if (isEncomenda) {
      const leadTime =
        produto.min_lead_time_days ??
        (produto.tempoPreparoHoras ? Math.ceil(produto.tempoPreparoHoras / 24) : 1);
      if (leadTime > maxLeadTime) {
        maxLeadTime = leadTime;
      }
    }

    // 2. Intersecção dos dias permitidos para pronta entrega
    if (produto.availability_type === "pronta_entrega" && produto.available_days && produto.available_days.length > 0) {
      diasPermitidos = diasPermitidos.filter((d) => produto.available_days!.includes(d));
    }
  });

  return {
    ...regrasLoja,
    antecedenciaMinimaDias: maxLeadTime,
    diasSemanaDisponiveis: diasPermitidos,
  };
}
