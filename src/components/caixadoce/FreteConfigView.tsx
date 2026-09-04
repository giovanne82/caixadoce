import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  MapPin,
  Gift,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  Store,
  HelpCircle,
  Percent,
} from "lucide-react";
import {
  formatarMoeda,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
} from "@/lib/caixadoce-data";
import {
  obterConfiguracaoFrete,
  salvarConfiguracaoFrete,
  type ConfiguracaoFrete,
  type RegraFreteBairro,
  CONFIG_FRETE_PADRAO,
} from "@/lib/frete-service";
import { toast } from "sonner";

interface FreteConfigViewProps {
  estabelecimentoCodigo: string;
}

export function FreteConfigView({ estabelecimentoCodigo }: FreteConfigViewProps) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  const [config, setConfig] = useState<ConfiguracaoFrete>(() => obterConfiguracaoFrete(code));
  const [salvando, setSalvando] = useState(false);

  // Form de Valor Fixo
  const [valorFixoStr, setValorFixoStr] = useState<string>(
    formatarMoeda(config.valorFixoPadrao || 10)
  );

  // Form de Frete Grátis por Valor Mínimo
  const [valorMinimoFreteGratisStr, setValorMinimoFreteGratisStr] = useState<string>(
    formatarMoeda(config.valorMinimoFreteGratis || 120)
  );

  // Form de Novo Bairro
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroValorStr, setNovoBairroValorStr] = useState("");
  const [novoBairroPrazo, setNovoBairroPrazo] = useState<string>("45");

  useEffect(() => {
    const carregada = obterConfiguracaoFrete(code);
    setConfig(carregada);
    setValorFixoStr(formatarMoeda(carregada.valorFixoPadrao || 10));
    setValorMinimoFreteGratisStr(formatarMoeda(carregada.valorMinimoFreteGratis || 120));
  }, [code]);

  // Alterar modalidade de frete
  const handleSelecionarModalidade = (tipo: ConfiguracaoFrete["tipoFretePadrao"]) => {
    setConfig((prev) => ({ ...prev, tipoFretePadrao: tipo }));
  };

  // Adicionar Bairro
  const handleAdicionarBairro = () => {
    const nomeLimpo = novoBairroNome.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome do bairro ou região.");
      return;
    }

    const valor = converterMoedaInputParaNumero(novoBairroValorStr);
    const prazo = parseInt(novoBairroPrazo, 10) || config.tempoMedioMinutos || 45;

    const novoBairro: RegraFreteBairro = {
      id: crypto.randomUUID(),
      bairro: nomeLimpo,
      valor,
      prazoMinutos: prazo,
      ativo: true,
    };

    setConfig((prev) => ({
      ...prev,
      regrasBairros: [...prev.regrasBairros, novoBairro],
    }));

    setNovoBairroNome("");
    setNovoBairroValorStr("");
    toast.success(`Bairro "${nomeLimpo}" adicionado à tabela de frete!`);
  };

  // Remover Bairro
  const handleRemoverBairro = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      regrasBairros: prev.regrasBairros.filter((b) => b.id !== id),
    }));
  };

  // Toggle Ativo por Bairro
  const handleToggleBairroAtivo = (id: string, ativo: boolean) => {
    setConfig((prev) => ({
      ...prev,
      regrasBairros: prev.regrasBairros.map((b) => (b.id === id ? { ...b, ativo } : b)),
    }));
  };

  // Salvar tudo
  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const configFinal: ConfiguracaoFrete = {
        ...config,
        valorFixoPadrao: converterMoedaInputParaNumero(valorFixoStr),
        valorMinimoFreteGratis: converterMoedaInputParaNumero(valorMinimoFreteGratisStr),
      };

      await salvarConfiguracaoFrete(code, configFinal);
      setConfig(configFinal);
      toast.success("Regras e taxas de frete salvas com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar regras de frete.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div>
        <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Taxas &amp; Regras de Frete (Delivery)
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure as taxas de entrega, bairros atendidos e regras promocionais de frete grátis para o seu cardápio.
        </p>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-300">
                Modalidade Ativa
              </span>
              <p className="text-sm font-black text-foreground">
                {config.tipoFretePadrao === "fixo"
                  ? `Fixo (${valorFixoStr})`
                  : config.tipoFretePadrao === "bairros"
                  ? "Por Bairros / Regiões"
                  : config.tipoFretePadrao === "gratis_total"
                  ? "Frete 100% Grátis"
                  : "Sob Consulta"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300">
                Frete Grátis por Valor
              </span>
              <p className="text-sm font-black text-foreground">
                {config.freteGratisAtivo ? `Acima de ${valorMinimoFreteGratisStr}` : "Desativado"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Gift className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">
                Bairros Cadastrados
              </span>
              <p className="text-sm font-black text-foreground">
                {config.regrasBairros.filter((b) => b.ativo).length} de {config.regrasBairros.length} ativos
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 1: MODALIDADE PRINCIPAL DE COBRANÇA */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>1. Modalidade de Cobrança da Entrega</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Escolha como o frete padrão será calculado para os clientes no seu cardápio online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Opção 1: Frete Fixo */}
            <div
              onClick={() => handleSelecionarModalidade("fixo")}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                config.tipoFretePadrao === "fixo"
                  ? "border-purple-600 bg-purple-500/10 shadow-xs"
                  : "border-border hover:border-purple-300 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" /> Frete Fixo
                </span>
                <input
                  type="radio"
                  name="modalidadeFrete"
                  checked={config.tipoFretePadrao === "fixo"}
                  onChange={() => handleSelecionarModalidade("fixo")}
                  className="accent-purple-600"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Valor único de entrega para qualquer pedido na cidade.
              </p>
            </div>

            {/* Opção 2: Por Bairros */}
            <div
              onClick={() => handleSelecionarModalidade("bairros")}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                config.tipoFretePadrao === "bairros"
                  ? "border-purple-600 bg-purple-500/10 shadow-xs"
                  : "border-border hover:border-purple-300 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600" /> Por Bairros
                </span>
                <input
                  type="radio"
                  name="modalidadeFrete"
                  checked={config.tipoFretePadrao === "bairros"}
                  onChange={() => handleSelecionarModalidade("bairros")}
                  className="accent-purple-600"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O cliente escolhe o bairro e a taxa correspondente é aplicada.
              </p>
            </div>

            {/* Opção 3: Frete Grátis Total */}
            <div
              onClick={() => handleSelecionarModalidade("gratis_total")}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                config.tipoFretePadrao === "gratis_total"
                  ? "border-emerald-600 bg-emerald-500/10 shadow-xs"
                  : "border-border hover:border-emerald-300 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-600" /> 100% Grátis
                </span>
                <input
                  type="radio"
                  name="modalidadeFrete"
                  checked={config.tipoFretePadrao === "gratis_total"}
                  onChange={() => handleSelecionarModalidade("gratis_total")}
                  className="accent-emerald-600"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Entrega gratuita em todos os pedidos da loja (Promoção).
              </p>
            </div>

            {/* Opção 4: Sob Consulta */}
            <div
              onClick={() => handleSelecionarModalidade("consulta")}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                config.tipoFretePadrao === "consulta"
                  ? "border-amber-600 bg-amber-500/10 shadow-xs"
                  : "border-border hover:border-amber-300 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" /> Sob Consulta
                </span>
                <input
                  type="radio"
                  name="modalidadeFrete"
                  checked={config.tipoFretePadrao === "consulta"}
                  onChange={() => handleSelecionarModalidade("consulta")}
                  className="accent-amber-600"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O valor é combinado diretamente com o cliente via WhatsApp.
              </p>
            </div>
          </div>

          {/* Campo de Valor Fixo (se selecionado) */}
          {config.tipoFretePadrao === "fixo" && (
            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-2 max-w-sm">
              <Label className="text-xs font-bold text-foreground">
                Valor da Taxa Fixa de Entrega (R$)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={valorFixoStr}
                onChange={(e) => setValorFixoStr(aplicarMascaraMoedaInput(e.target.value))}
                placeholder="R$ 10,00"
                className="font-mono font-bold text-sm bg-background"
              />
            </div>
          )}

          {/* Switch de Retirada no Local */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-muted/20">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Store className="w-4 h-4 text-purple-600" /> Permitir Retirada no Local (Grátis)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Oferece ao cliente a opção de retirar a encomenda no endereço da sua confeitaria.
              </p>
            </div>
            <Switch
              checked={config.permitirRetirada}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, permitirRetirada: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: REGRA DE FRETE GRÁTIS CONDICIONAL */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-600" />
              <span>2. Frete Grátis Promocional (Por Valor Mínimo de Pedido)</span>
            </CardTitle>
            <Switch
              checked={config.freteGratisAtivo}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, freteGratisAtivo: checked }))}
            />
          </div>
          <CardDescription className="text-xs">
            Incentive pedidos de maior valor oferecendo entrega gratuita quando o carrinho atingir determinado valor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.freteGratisAtivo ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2 max-w-sm">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Valor Mínimo do Pedido para Frete Grátis (R$)
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={valorMinimoFreteGratisStr}
                  onChange={(e) => setValorMinimoFreteGratisStr(aplicarMascaraMoedaInput(e.target.value))}
                  placeholder="R$ 120,00"
                  className="font-mono font-bold text-sm bg-background border-emerald-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Como o cliente verá no Cardápio:</strong> "🎉 Frete Grátis em compras acima de {valorMinimoFreteGratisStr}!"
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              O benefício de frete grátis por valor mínimo está desativado no momento. Ative a chave acima para configurar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 3: TABELA DE TAXAS POR BAIRRO / REGIÃO */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            <span>3. Tabela de Bairros &amp; Regiões Atendidas</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Cadastre os bairros da sua cidade e suas respectivas taxas de entrega personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form de Adicionar Bairro */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-3">
            <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-purple-600" /> Cadastrar Novo Bairro / Região
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold text-foreground">Nome do Bairro / Região</Label>
                <Input
                  placeholder="Ex: Lourdes, Savassi, Centro, Belvedere..."
                  value={novoBairroNome}
                  onChange={(e) => setNovoBairroNome(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Taxa de Frete (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={novoBairroValorStr}
                  onChange={(e) => setNovoBairroValorStr(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <Button
                  type="button"
                  onClick={handleAdicionarBairro}
                  className="w-full h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Tabela de Bairros */}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-bold">Bairro / Região</TableHead>
                  <TableHead className="text-xs font-bold w-32 text-right">Taxa (R$)</TableHead>
                  <TableHead className="text-xs font-bold w-24 text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold w-16 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.regrasBairros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      Nenhum bairro cadastrado ainda. Use o formulário acima para adicionar os bairros da sua cidade.
                    </TableCell>
                  </TableRow>
                ) : (
                  config.regrasBairros.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-semibold text-foreground">
                        {b.bairro}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                        {b.valor === 0 ? "Grátis" : formatarMoeda(b.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={b.ativo}
                          onCheckedChange={(checked) => handleToggleBairroAtivo(b.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverBairro(b.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 4: INSTRUÇÕES & PRAZO MÉDIO DE ENTREGA */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>4. Prazos &amp; Orientações para o Cliente</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Informações complementares exibidas na tela de confirmação do pedido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-bold text-foreground">
              Tempo Médio Estimado de Entrega (Minutos)
            </Label>
            <Input
              type="number"
              value={config.tempoMedioMinutos}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  tempoMedioMinutos: parseInt(e.target.value, 10) || 45,
                }))
              }
              className="h-9 text-xs max-w-[120px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Instruções de Entrega no Cardápio
            </Label>
            <Textarea
              value={config.instrucoesEntrega}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  instrucoesEntrega: e.target.value,
                }))
              }
              placeholder="Ex: Entregas realizadas via motoboy próprio com bolsa térmica."
              rows={2}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* BOTÃO SALVAR */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 rounded-xl shadow-md gap-2"
        >
          <Save className="w-4 h-4" />
          {salvando ? "Salvando..." : "Salvar Configurações de Frete"}
        </Button>
      </div>
    </div>
  );
}
