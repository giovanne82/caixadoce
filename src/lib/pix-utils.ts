export interface DadosInstitucionais {
  nome: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  chavePix?: string;
  tipoChavePix?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
}

export function salvarDadosInstitucionaisCache(codigo: string, dados: DadosInstitucionais) {
  try {
    const key = `caixadoce_institucional_${codigo.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(dados));
  } catch (e) {
    console.warn("Erro ao salvar dados institucionais no cache local:", e);
  }
}

export function carregarDadosInstitucionaisCache(codigo: string): DadosInstitucionais | null {
  try {
    const key = `caixadoce_institucional_${codigo.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
