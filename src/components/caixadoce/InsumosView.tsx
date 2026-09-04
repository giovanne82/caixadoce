import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  UtensilsCrossed,
  Package,
  Sparkles,
  RefreshCw,
  Building2,
  Tag,
} from "lucide-react";
import {
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  obterInsumosCadastrados,
  salvarInsumosCadastradosStorage,
  atualizarCustoInsumoECascataFichas,
  NOVOS_INSUMOS_SEED,
  type InsumoCadastrado,
} from "@/lib/caixadoce-data";
import { INSUMOS_PADRAO_CATALOGO } from "@/lib/ficha-tecnica-service";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

interface InsumosViewProps {
  estabelecimentoCodigo: string;
  onInsumosChange?: (insumos: InsumoCadastrado[]) => void;
}

export function InsumosView({
  estabelecimentoCodigo,
  onInsumosChange,
}: InsumosViewProps) {
  const { profile } = useAuth();
  const [insumos, setInsumos] = useState<InsumoCadastrado[]>(() =>
    obterInsumosCadastrados(estabelecimentoCodigo)
  );
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("kg");
  const [qtdEmbalagemStr, setQtdEmbalagemStr] = useState("1");
  const [custoAtualFormatado, setCustoAtualFormatado] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Lista unificada de sugestões (insumos da loja + catálogo padrão + seeds)
  const todasSugestoes = useMemo(() => {
    const map = new Map<string, { nome: string; insumoCadastrado?: InsumoCadastrado }>();

    // 1. Insumos cadastrados pela loja prioritariamente
    for (const ins of insumos) {
      if (ins.nome) {
        map.set(ins.nome.toLowerCase().trim(), {
          nome: ins.nome.trim(),
          insumoCadastrado: ins,
        });
      }
    }

    // 2. Insumos do catálogo mestre de confeitaria
    if (Array.isArray(INSUMOS_PADRAO_CATALOGO)) {
      for (const cat of INSUMOS_PADRAO_CATALOGO) {
        if (cat.nome) {
          const key = cat.nome.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, { nome: cat.nome.trim() });
          }
        }
      }
    }

    // 3. Insumos seeds de mercado e hortifruti
    if (Array.isArray(NOVOS_INSUMOS_SEED)) {
      for (const seed of NOVOS_INSUMOS_SEED) {
        if (seed) {
          const key = seed.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, { nome: seed.trim() });
          }
        }
      }
    }

    return Array.from(map.values());
  }, [insumos]);

  // Sugestões filtradas dinamicamente conforme digitação
  const sugestoesFiltradas = useMemo(() => {
    const termo = nome.trim().toLowerCase();
    if (!termo) {
      return todasSugestoes.slice(0, 10);
    }
    return todasSugestoes
      .filter((s) => s.nome.toLowerCase().includes(termo))
      .slice(0, 12);
  }, [nome, todasSugestoes]);

  const handleSelecionarSugestaoChip = (sugestao: { nome: string; insumoCadastrado?: InsumoCadastrado }) => {
    setNome(sugestao.nome);
    setShowSuggestions(false);

    if (sugestao.insumoCadastrado) {
      const ins = sugestao.insumoCadastrado;
      setUnidadeMedida(ins.unidadeMedida || "kg");
      setQtdEmbalagemStr(String(ins.qtdEmbalagemOriginal || 1));
      if (ins.custoAtual > 0) {
        setCustoAtualFormatado(formatarMoeda(ins.custoAtual));
      }
      if (ins.fornecedor) {
        setFornecedor(ins.fornecedor);
      }
      toast.info(`Preenchido com dados de "${ins.nome}"`);
    }
  };

  // Carrega do Supabase e sincroniza no Mount
  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      if (!estabelecimentoCodigo) return;
      setCarregando(true);
      try {
        const { data, error } = await supabase
          .from("insumos")
          .select("*")
          .eq("estabelecimento_codigo", estabelecimentoCodigo)
          .order("nome", { ascending: true });

        if (!cancelado && !error && data && Array.isArray(data)) {
          const mapeados: InsumoCadastrado[] = data.map((d: any) => ({
            id: String(d.id),
            estabelecimentoCodigo: d.estabelecimento_codigo || estabelecimentoCodigo,
            nome: d.nome,
            unidadeMedida: d.unidade_medida || "kg",
            custoAtual: Number(d.custo_atual) || 0,
            qtdEmbalagemOriginal: Number(d.qtd_embalagem_original) || 1,
            unidadeEmbalagemOriginal: d.unidade_embalagem_original || d.unidade_medida || "kg",
            fornecedor: d.fornecedor || "",
            observacoes: d.observacoes || "",
            createdAt: d.created_at,
          }));

          if (mapeados.length > 0) {
            setInsumos(mapeados);
            salvarInsumosCadastradosStorage(estabelecimentoCodigo, mapeados);
            if (onInsumosChange) onInsumosChange(mapeados);
          }
        }
      } catch (e) {
        console.warn("[InsumosView] Aviso ao carregar do Supabase:", e);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [estabelecimentoCodigo]);

  // Lista Filtrada por Busca
  const insumosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return insumos;
    return insumos.filter(
      (i) =>
        i.nome.toLowerCase().includes(termo) ||
        (i.fornecedor && i.fornecedor.toLowerCase().includes(termo))
    );
  }, [insumos, busca]);

  const handleAbrirCriacao = () => {
    setEditingId(null);
    setNome("");
    setUnidadeMedida("kg");
    setQtdEmbalagemStr("1");
    setCustoAtualFormatado("");
    setFornecedor("");
    setObservacoes("");
    setShowSuggestions(true);
    setModalOpen(true);
  };

  const handleAbrirEdicao = (ins: InsumoCadastrado) => {
    setEditingId(ins.id);
    setNome(ins.nome);
    setUnidadeMedida(ins.unidadeMedida || "kg");
    setQtdEmbalagemStr(String(ins.qtdEmbalagemOriginal || 1));
    setCustoAtualFormatado(formatarMoeda(ins.custoAtual));
    setFornecedor(ins.fornecedor || "");
    setObservacoes(ins.observacoes || "");
    setShowSuggestions(false);
    setModalOpen(true);
  };

  const handleSalvarInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const valorCusto = converterMoedaInputParaNumero(custoAtualFormatado);
    const qtdEmb = parseFloat(qtdEmbalagemStr.replace(",", ".")) || 1;

    if (!nomeLimpo) {
      toast.error("Informe o nome do insumo.");
      return;
    }

    if (valorCusto <= 0) {
      toast.error("Informe o custo atual do insumo.");
      return;
    }

    setSalvando(true);
    try {
      const insumoObj: InsumoCadastrado = {
        id: editingId || crypto.randomUUID(),
        estabelecimentoCodigo,
        nome: nomeLimpo,
        unidadeMedida,
        custoAtual: valorCusto,
        qtdEmbalagemOriginal: qtdEmb,
        unidadeEmbalagemOriginal: unidadeMedida,
        fornecedor: fornecedor.trim(),
        observacoes: observacoes.trim(),
        createdAt: editingId
          ? insumos.find((i) => i.id === editingId)?.createdAt
          : new Date().toISOString(),
      };

      let novalista: InsumoCadastrado[];
      if (editingId) {
        novalista = insumos.map((i) => (i.id === editingId ? insumoObj : i));
      } else {
        novalista = [insumoObj, ...insumos];
      }

      setInsumos(novalista);
      salvarInsumosCadastradosStorage(estabelecimentoCodigo, novalista);
      if (onInsumosChange) onInsumosChange(novalista);

      // Persistência no Supabase (Insert puro para novos, Update para edições) e Cascata de Fichas Técnicas
      try {
        if (editingId) {
          await supabase
            .from("insumos")
            .update({
              nome: insumoObj.nome,
              unidade_medida: insumoObj.unidadeMedida,
              custo_atual: insumoObj.custoAtual,
              qtd_embalagem_original: insumoObj.qtdEmbalagemOriginal,
              unidade_embalagem_original: insumoObj.unidadeMedida,
              fornecedor: insumoObj.fornecedor || "",
              observacoes: insumoObj.observacoes || "",
            })
            .eq("id", editingId);
        } else {
          await supabase.from("insumos").insert([
            {
              id: insumoObj.id,
              estabelecimento_codigo: estabelecimentoCodigo,
              user_id: profile?.ownerUserId || null,
              nome: insumoObj.nome,
              unidade_medida: insumoObj.unidadeMedida,
              custo_atual: insumoObj.custoAtual,
              qtd_embalagem_original: insumoObj.qtdEmbalagemOriginal,
              unidade_embalagem_original: insumoObj.unidadeMedida,
              fornecedor: insumoObj.fornecedor || "",
              observacoes: insumoObj.observacoes || "",
            },
          ]);
        }

        // Atualização em cascata nas fichas técnicas que utilizam este insumo
        await atualizarCustoInsumoECascataFichas(
          estabelecimentoCodigo,
          insumoObj.id,
          valorCusto,
          profile?.ownerUserId
        );
      } catch (err) {
        console.warn("[InsumosView] Aviso ao salvar no Supabase:", err);
      }

      toast.success(
        editingId
          ? `Insumo "${nomeLimpo}" atualizado!`
          : `Insumo "${nomeLimpo}" cadastrado com sucesso!`
      );
      setModalOpen(false);
    } catch {
      toast.error("Erro ao salvar insumo.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirInsumo = async (id: string, nomeInsumo: string) => {
    if (!confirm(`Deseja realmente excluir o insumo "${nomeInsumo}"?`)) return;

    const novalista = insumos.filter((i) => i.id !== id);
    setInsumos(novalista);
    salvarInsumosCadastradosStorage(estabelecimentoCodigo, novalista);
    if (onInsumosChange) onInsumosChange(novalista);

    try {
      await supabase.from("insumos").delete().eq("id", id);
    } catch {}

    toast.success(`Insumo "${nomeInsumo}" removido.`);
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Cadastro de Insumos <UtensilsCrossed className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre e atualize os custos atuais dos seus ingredientes para cálculo automático nas fichas técnicas.
          </p>
        </div>

        <Button
          onClick={handleAbrirCriacao}
          size="sm"
          className="font-bold shadow-md bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo Insumo
        </Button>
      </div>

      {/* Busca & Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do insumo ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs">
          <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
            <Package className="w-4 h-4 text-purple-600" /> Total Cadastrado:
          </span>
          <Badge variant="secondary" className="font-bold text-xs">
            {insumos.length} Insumo(s)
          </Badge>
        </div>
      </div>

      {/* Tabela de Insumos */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {insumosFiltrados.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                Nenhum insumo encontrado.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Cadastre seus ingredientes (Leite Condensado, Chocolate, Farinha, Embalagens) para calcular o custo automático das receitas.
              </p>
              <Button
                onClick={handleAbrirCriacao}
                size="sm"
                variant="outline"
                className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Primeiro Insumo
              </Button>
            </div>
          ) : (
            <div>
              {/* LAYOUT MOBILE (CARDS EMPILHADOS RESPONSIVOS - sm:hidden) */}
              <div className="space-y-3 p-3 sm:hidden">
                {insumosFiltrados.map((ins) => {
                  const custUnit =
                    ins.qtdEmbalagemOriginal > 0
                      ? ins.custoAtual / ins.qtdEmbalagemOriginal
                      : ins.custoAtual;
                  const unidProp =
                    ins.unidadeMedida === "kg"
                      ? "g"
                      : ins.unidadeMedida === "l"
                      ? "ml"
                      : ins.unidadeMedida;

                  return (
                    <Card key={ins.id} className="p-3.5 border-border shadow-2xs space-y-2 bg-card rounded-xl">
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/50">
                        <div className="min-w-0 pr-1">
                          <h4 className="font-extrabold text-sm text-foreground truncate">{ins.nome}</h4>
                          {ins.fornecedor && (
                            <span className="text-[11px] text-muted-foreground block truncate">
                              Fornecedor: {ins.fornecedor}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicao(ins)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-600 rounded-full"
                            title="Editar Insumo"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirInsumo(ins.id, ins.nome)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-full"
                            title="Excluir Insumo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block">Embalagem</span>
                          <span className="font-semibold font-mono text-foreground">
                            {ins.qtdEmbalagemOriginal} {ins.unidadeMedida}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block">Custo Pago</span>
                          <span className="font-extrabold font-mono text-purple-700 dark:text-purple-300">
                            {formatarMoeda(ins.custoAtual)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block">Proporcional</span>
                          <span className="font-semibold font-mono text-muted-foreground text-[11px]">
                            {formatarMoeda(custUnit)}/{unidProp}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* LAYOUT DESKTOP (TABELA FLUIDA - hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-bold">Insumo / Ingrediente</TableHead>
                      <TableHead className="text-xs font-bold text-center">Qtd Embalagem</TableHead>
                      <TableHead className="text-xs font-bold text-right">Custo Atual (Embalagem)</TableHead>
                      <TableHead className="text-xs font-bold text-right">Custo Proporcional</TableHead>
                      <TableHead className="text-xs font-bold">Fornecedor</TableHead>
                      <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insumosFiltrados.map((ins) => {
                      const custUnit =
                        ins.qtdEmbalagemOriginal > 0
                          ? ins.custoAtual / ins.qtdEmbalagemOriginal
                          : ins.custoAtual;

                      return (
                        <TableRow key={ins.id} className="hover:bg-muted/30">
                          <TableCell className="font-bold text-xs text-foreground">
                            {ins.nome}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono">
                            {ins.qtdEmbalagemOriginal} {ins.unidadeMedida}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                            {formatarMoeda(ins.custoAtual)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {formatarMoeda(custUnit)} / {ins.unidadeMedida === "kg" ? "g" : ins.unidadeMedida === "l" ? "ml" : ins.unidadeMedida}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ins.fornecedor || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAbrirEdicao(ins)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-purple-600"
                                title="Editar Insumo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluirInsumo(ins.id, ins.nome)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                                title="Excluir Insumo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro / Edição de Insumo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {editingId ? "Editar Insumo" : "Cadastrar Novo Insumo"}{" "}
              <UtensilsCrossed className="w-5 h-5 text-purple-600" />
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre o nome, a quantidade da embalagem e o valor pago para atualizar o cálculo nas fichas técnicas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarInsumo} className="space-y-3 pt-2">
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="ins-nome" className="text-xs font-semibold">
                  Nome do Insumo / Ingrediente *
                </Label>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                  💡 Digite para filtrar chips
                </span>
              </div>
              <Input
                id="ins-nome"
                placeholder="Ex: Leite Condensado Moça, Farinha de Trigo..."
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="h-8 text-xs font-medium"
                required
                autoComplete="off"
              />

              {/* LISTA SUSPENSA DE CHIPS/TAGS DE SUGESTÃO INTELIGENTE */}
              {showSuggestions && sugestoesFiltradas.length > 0 && (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-1.5 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-900 dark:text-purple-200">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      Sugestões inteligentes (Clique no chip para selecionar):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-purple-600 hover:text-purple-800 text-[10px] underline"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {sugestoesFiltradas.map((sug, idx) => {
                      const isExactMatch = sug.nome.toLowerCase() === nome.trim().toLowerCase();
                      return (
                        <Badge
                          key={idx}
                          type="button"
                          onClick={() => handleSelecionarSugestaoChip(sug)}
                          className={`cursor-pointer font-medium text-xs py-1 px-2.5 rounded-full transition-all flex items-center gap-1 select-none ${
                            isExactMatch
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-background text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 hover:bg-purple-600 hover:text-white hover:border-purple-600 shadow-2xs"
                          }`}
                        >
                          <Tag className="w-3 h-3 opacity-70 shrink-0" />
                          <span>{sug.nome}</span>
                          {sug.insumoCadastrado && (
                            <span className="text-[9px] opacity-75 font-mono ml-0.5">
                              ({formatarMoeda(sug.insumoCadastrado.custoAtual)})
                            </span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="ins-qtd" className="text-xs font-semibold">
                  Qtd da Embalagem *
                </Label>
                <Input
                  id="ins-qtd"
                  placeholder="Ex: 1 (para 1kg) ou 395"
                  value={qtdEmbalagemStr}
                  onChange={(e) => setQtdEmbalagemStr(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ins-unid" className="text-xs font-semibold">
                  Unidade de Medida *
                </Label>
                <Select value={unidadeMedida} onValueChange={setUnidadeMedida}>
                  <SelectTrigger id="ins-unid" className="h-8 text-xs font-medium">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Quilo (kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="l">Litro (L)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                    <SelectItem value="bdj">Bandeja (bdj)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ins-custo" className="text-xs font-semibold">
                Custo Atual Pago na Embalagem (R$) *
              </Label>
              <Input
                id="ins-custo"
                placeholder="R$ 0,00"
                value={custoAtualFormatado}
                onChange={(e) =>
                  setCustoAtualFormatado(aplicarMascaraMoedaInput(e.target.value))
                }
                className="h-8 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ins-fornec" className="text-xs font-semibold">
                Fornecedor / Marca (Opcional)
              </Label>
              <Input
                id="ins-fornec"
                placeholder="Ex: Nestlé, Atacadão, Mercado X..."
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {salvando ? "Salvando..." : "Salvar Insumo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
