import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Box,
  Plus,
  Minus,
  Trash2,
  Search,
  Sparkles,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  Image as ImageIcon,
  Check,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ProdutoCardapio,
  type KitProduto,
  type KitItemComponente,
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
} from "@/lib/caixadoce-data";
import { calcularCustosEMargemKit } from "@/lib/kits-service";
import { toast } from "sonner";

interface MontarKitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtosCardapio: ProdutoCardapio[];
  estabelecimentoCodigo: string;
  kitEditing?: KitProduto | null;
  onSalvarKit: (kit: KitProduto) => Promise<void>;
}

export function MontarKitModal({
  open,
  onOpenChange,
  produtosCardapio,
  estabelecimentoCodigo,
  kitEditing,
  onSalvarKit,
}: MontarKitModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("2 dias úteis");
  const [fotoUrl, setFotoUrl] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [precoVendaInput, setPrecoVendaInput] = useState("R$ 0,00");
  const [itensSelecionados, setItensSelecionados] = useState<KitItemComponente[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Produtos elegíveis para compor o kit (exclui outros kits para evitar aninhamento circular)
  const produtosDisponiveis = useMemo(() => {
    return produtosCardapio.filter((p) => !p.isKit && p.categoria !== "Kits & Combos");
  }, [produtosCardapio]);

  // Produtos filtrados pela busca
  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) return produtosDisponiveis;
    const term = buscaProduto.toLowerCase().trim();
    return produtosDisponiveis.filter(
      (p) => p.nome.toLowerCase().includes(term) || p.categoria.toLowerCase().includes(term)
    );
  }, [produtosDisponiveis, buscaProduto]);

  // Preenche os campos ao abrir para edição ou reset para criação
  useEffect(() => {
    if (open) {
      if (kitEditing) {
        setNome(kitEditing.nome);
        setDescricao(kitEditing.descricao || "");
        setPrazoEntrega(kitEditing.prazoEntrega || "2 dias úteis");
        setFotoUrl(kitEditing.fotoUrl || "");
        setPrecoVendaInput(formatarMoeda(kitEditing.precoVenda));
        setItensSelecionados(kitEditing.itens || []);
      } else {
        setNome("");
        setDescricao("");
        setPrazoEntrega("2 dias úteis");
        setFotoUrl("");
        setPrecoVendaInput("R$ 0,00");
        setItensSelecionados([]);
      }
      setBuscaProduto("");
      setEnviandoFoto(false);
    }
  }, [open, kitEditing]);

  // Preço numérico de venda
  const precoVendaNumero = useMemo(() => {
    return converterMoedaInputParaNumero(precoVendaInput);
  }, [precoVendaInput]);

  // Cálculo dinâmico em tempo real do Custo e Margem de Lucro (%)
  const { custoTotalInsumos, margemLucroPercentual } = useMemo(() => {
    return calcularCustosEMargemKit(itensSelecionados, produtosDisponiveis, precoVendaNumero);
  }, [itensSelecionados, produtosDisponiveis, precoVendaNumero]);

  // Upload de Imagem do Kit (Supabase Storage com Fallback Base64)
  const handleUploadFotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_PRODUTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_PRODUTO_SIZE_BYTES) {
      toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
      if (e.target) e.target.value = "";
      return;
    }

    setEnviandoFoto(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `kits/${estabelecimentoCodigo || "CD-1001"}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, { upsert: true });

      let finalUrl = "";
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from("public").getPublicUrl(filePath);
        finalUrl = publicUrlData.publicUrl;
      } else {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setFotoUrl(finalUrl);
      toast.success("Foto do kit carregada com sucesso!");
    } catch {
      toast.error("Erro ao processar arquivo de imagem.");
    } finally {
      setEnviandoFoto(false);
    }
  };

  // Adiciona um produto ao kit ou incrementa sua quantidade
  const handleAdicionarProduto = (prod: ProdutoCardapio) => {
    setItensSelecionados((prev) => {
      const idx = prev.findIndex((it) => it.produtoId === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantidade: copy[idx].quantidade + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          produtoId: prod.id,
          nomeProduto: prod.nome,
          quantidade: 1,
          precoUnitarioSnapshot: prod.preco,
          custoUnitarioSnapshot: prod.custoTotalInsumos || prod.preco * 0.4,
        },
      ];
    });
  };

  // Altera quantidade de um item no kit
  const handleAlterarQuantidade = (produtoId: string, delta: number) => {
    setItensSelecionados((prev) => {
      return prev
        .map((it) => {
          if (it.produtoId === produtoId) {
            const novaQtd = it.quantidade + delta;
            return novaQtd > 0 ? { ...it, quantidade: novaQtd } : null;
          }
          return it;
        })
        .filter(Boolean) as KitItemComponente[];
    });
  };

  // Define quantidade direta
  const handleSetQuantidade = (produtoId: string, qtdStr: string) => {
    const val = parseInt(qtdStr, 10);
    setItensSelecionados((prev) => {
      return prev.map((it) => {
        if (it.produtoId === produtoId) {
          const novaQtd = isNaN(val) || val <= 0 ? 1 : val;
          return { ...it, quantidade: novaQtd };
        }
        return it;
      });
    });
  };

  // Remove um item do kit
  const handleRemoverItem = (produtoId: string) => {
    setItensSelecionados((prev) => prev.filter((it) => it.produtoId !== produtoId));
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do Kit.");
      return;
    }
    if (itensSelecionados.length === 0) {
      toast.error("Selecione pelo menos 1 produto para compor o Kit.");
      return;
    }
    if (precoVendaNumero <= 0) {
      toast.error("Informe o preço de venda do Kit.");
      return;
    }

    try {
      setSalvando(true);
      const novoKit: KitProduto = {
        id: kitEditing?.id || crypto.randomUUID(),
        estabelecimentoCodigo: estabelecimentoCodigo || "CD-1001",
        nome: nome.trim(),
        descricao: descricao.trim(),
        precoVenda: precoVendaNumero,
        custoTotalInsumos,
        margemLucroPercentual,
        prazoEntrega: prazoEntrega.trim() || "2 dias úteis",
        fotoUrl: fotoUrl.trim(),
        categoria: "Kits & Combos",
        ativo: true,
        itens: itensSelecionados,
      };

      await onSalvarKit(novoKit);
      toast.success(kitEditing ? "Kit atualizado com sucesso!" : "🎉 Kit montado e cadastrado com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar kit: " + (err.message || "Erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-purple-500/10 rounded-xl">
              <Box className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {kitEditing ? "Editar Kit / Combo" : "Montar Novo Kit ou Combo"}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
                Junte seus produtos já cadastrados e crie combos completos para vendas e festas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1. UX Banner Orientativo */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 my-2 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
            <strong className="block font-bold mb-0.5 text-amber-900 dark:text-amber-100">💡 Dica da CaixaDoce:</strong>
            Cadastre seus doces, embalagens e itens individuais na aba de Produtos antes de montar seu kit. Aqui você apenas junta os itens existentes.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Input Oculto de Seleção de Arquivo */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleUploadFotoFile}
          />

          {/* Dados Gerais do Kit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kit-nome" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Nome do Kit <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="kit-nome"
                placeholder="Ex: Kit Festa Aniversário P (10 pessoas)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kit-prazo" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                Prazo de Entrega (Independente)
              </Label>
              <Input
                id="kit-prazo"
                placeholder="Ex: 2 dias úteis / 48 horas"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="kit-descricao" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Descrição do Kit
              </Label>
              <Textarea
                id="kit-descricao"
                placeholder="Descreva o que acompanha o kit (ex: 1 bolo 2kg + 20 brigadeiros belgas + caixa presenteável)..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Componente de Upload de Imagem do Kit */}
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                Foto do Kit (Upload de Imagem)
              </Label>

              {fotoUrl ? (
                <div className="flex items-center gap-4 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-300 dark:border-stone-700 shrink-0">
                    <img src={fotoUrl} alt="Preview Kit" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                      Imagem selecionada para o kit
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={enviandoFoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-semibold"
                      >
                        {enviandoFoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Carregando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 mr-1.5 text-purple-600" /> Trocar Foto
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFotoUrl("")}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-300 dark:border-purple-900/50 hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/10 p-5 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  {enviandoFoto ? (
                    <>
                      <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        Processando imagem...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 rounded-full text-purple-600 dark:text-purple-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          Clique aqui para selecionar uma foto (JPG, PNG ou WebP)
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Escolha uma imagem do seu dispositivo móvel ou computador.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* 2. Seleção de Produtos e Composição (ORDEM INVERTIDA) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                Composição do Kit ({itensSelecionados.length} itens vinculados)
              </h4>
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 dark:text-purple-300">
                Baixa de Estoque Automática por Componente
              </Badge>
            </div>

            {/* BLOCO 1 (ACIMA): Busca & Cards dos Produtos Cadastrados Disponíveis */}
            <div className="space-y-2.5 bg-stone-50/70 dark:bg-stone-950/70 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  1. Buscar Produtos do Estoque para Adicionar ao Kit
                </span>
                <span className="text-[11px] text-stone-500">
                  {produtosFiltrados.length} produtos disponíveis
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Digite o nome ou categoria do doce/produto..."
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white dark:bg-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {produtosFiltrados.map((prod) => {
                  const jaNoKit = itensSelecionados.some((it) => it.produtoId === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-purple-300 dark:hover:border-purple-800 transition-colors shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {prod.nome}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {formatarMoeda(prod.preco)} ({prod.categoria})
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={jaNoKit ? "secondary" : "outline"}
                        className={`h-7 text-xs px-2.5 shrink-0 ${
                          jaNoKit ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold" : ""
                        }`}
                        onClick={() => handleAdicionarProduto(prod)}
                      >
                        {jaNoKit ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-purple-600" /> +1
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}

                {produtosFiltrados.length === 0 && (
                  <p className="text-xs text-stone-400 col-span-2 text-center py-4 bg-white dark:bg-stone-900 rounded-lg border border-dashed border-stone-200 dark:border-stone-800">
                    Nenhum produto cadastrado encontrado.
                  </p>
                )}
              </div>
            </div>

            {/* BLOCO 2 (ABAIXO): Box/Resumo que Lista os Itens Já Adicionados ao Kit */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-purple-600" />
                2. Itens Já Adicionados a este Kit ({itensSelecionados.length})
              </span>

              {itensSelecionados.length > 0 ? (
                <div className="space-y-2 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800 max-h-48 overflow-y-auto">
                  {itensSelecionados.map((item) => {
                    const prod = produtosDisponiveis.find((p) => p.id === item.produtoId);
                    const nomeProd = item.nomeProduto || prod?.nome || "Produto Componente";
                    const precoProd = prod?.preco || item.precoUnitarioSnapshot || 0;

                    return (
                      <div
                        key={item.produtoId}
                        className="flex items-center justify-between gap-3 bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 block truncate">
                            {nomeProd}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            Unitário: {formatarMoeda(precoProd)} | Subtotal: {formatarMoeda(precoProd * item.quantidade)}
                          </span>
                        </div>

                        {/* Controle de Quantidade */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => handleAlterarQuantidade(item.produtoId, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>

                          <Input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={(e) => handleSetQuantidade(item.produtoId, e.target.value)}
                            className="h-7 w-12 text-center text-xs p-1 font-bold"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => handleAlterarQuantidade(item.produtoId, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => handleRemoverItem(item.produtoId)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-stone-50 dark:bg-stone-950 rounded-xl border border-dashed border-stone-300 dark:border-stone-800">
                  <Box className="w-8 h-8 text-stone-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    Nenhum produto adicionado ao kit ainda.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Clique em "+ Adicionar" na lista acima para incluir os produtos neste kit.
                  </p>
                </div>
              )}
            </div>
          </div>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* 3. Cálculo de Custo e Preço em Tempo Real */}
          <div className="bg-gradient-to-br from-purple-500/5 to-amber-500/5 dark:from-purple-950/20 dark:to-amber-950/20 border border-purple-200 dark:border-purple-900/40 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Painel Financeiro do Kit em Tempo Real
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Custo Total Insumos */}
              <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xs">
                <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                  Custo Total Insumos
                </span>
                <span className="text-lg font-extrabold text-stone-900 dark:text-stone-100 block">
                  {formatarMoeda(custoTotalInsumos)}
                </span>
                <span className="text-[10px] text-stone-400">Soma dos custos unitários</span>
              </div>

              {/* Preço de Venda do Kit (Input Editável) */}
              <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
                <Label htmlFor="kit-preco-venda" className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Preço de Venda do Kit
                </Label>
                <Input
                  id="kit-preco-venda"
                  value={precoVendaInput}
                  onChange={(e) => setPrecoVendaInput(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-8 text-sm font-bold text-purple-700 dark:text-purple-300"
                />
              </div>

              {/* Margem de Lucro Estimada (%) */}
              <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xs">
                <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                  Margem de Lucro Estimada
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-extrabold block ${
                      margemLucroPercentual >= 40
                        ? "text-emerald-600 dark:text-emerald-400"
                        : margemLucroPercentual >= 15
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {margemLucroPercentual.toFixed(1)}%
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-bold ${
                      margemLucroPercentual >= 40
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : margemLucroPercentual >= 15
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : "bg-rose-50 text-rose-700 border-rose-300"
                    }`}
                  >
                    {margemLucroPercentual >= 40 ? "Excelente" : margemLucroPercentual >= 15 ? "Regular" : "Baixa"}
                  </Badge>
                </div>
                <span className="text-[10px] text-stone-400">Calculada sobre o preço final</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {salvando ? "Salvando Kit..." : kitEditing ? "Atualizar Kit" : "Salvar e Cadastrar Kit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
