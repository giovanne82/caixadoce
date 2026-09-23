export interface CostSimulationIngredient {
  item: string;
  quantidade: string;
  preco_unitario: number;
  custo_proporcional: number;
}

export interface CostSimulation {
  rendimento?: string;
  tempo_preparo?: string;
  ingredientes: CostSimulationIngredient[];
  custo_total: number;
  preco_sugerido: number;
  margem_lucro: number; // e.g. 65.5 for 65.5%
  lucro_bruto?: number;
  observacoes?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  cost_simulation?: CostSimulation | null;
  status: "draft" | "published";
  cover_image?: string | null;
  category?: string;
  reading_time?: string;
  author?: string;
  excerpt?: string;
  created_at: string;
  updated_at?: string;
}
