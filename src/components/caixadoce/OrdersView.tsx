import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  MessageCircle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Truck,
  Store,
  DollarSign,
  Edit2,
  Trash2,
  AlertCircle,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  formatarMoeda,
  formatarWhatsappLink,
  STATUS_ENCOMENDA_CONFIG,
  STATUS_PAGAMENTO_CONFIG,
  type Encomenda,
  type DataBloqueada,
  type StatusEncomenda,
  type StatusPagamentoEncomenda,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface OrdersViewProps {
  encomendas: Encomenda[];
  datasBloqueadas: DataBloqueada[];
  onCriarEncomenda: (dados: Omit<Encomenda, "id" | "estabelecimentoCodigo">) => Promise<void>;
  onEditarEncomenda: (id: string, dados: Partial<Encomenda>) => Promise<void>;
  onExcluirEncomenda: (id: string) => Promise<void>;
  onBloquearData: (data: string, motivo: string) => Promise<void>;
  onDesbloquearData: (id: string) => Promise<void>;
}

// Helpers de Estilo Semântico para Pílulas de Status
function obterEstiloPilula(status: StatusEncomenda) {
  switch (status) {
    case "pendente":
    case "em_producao":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
    case "pronta":
    case "entregue":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25";
    case "cancelada":
      return "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function OrdersView({
  encomendas,
  datasBloqueadas,
  onCriarEncomenda,
  onEditarEncomenda,
  onExcluirEncomenda,
  onBloquearData,
  onDesbloquearData,
}: OrdersViewProps) {
  // Visualização: 'mes' | 'semana' | 'lista'
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "lista">("mes");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Painel Lateral (Drawer) do Dia Selecionado
  const [selectedDrawerDate, setSelectedDrawerDate] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modais
  const [modalEncomendaOpen, setModalEncomendaOpen] = useState(false);
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros da Lista
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");

  // Formulário de Encomenda
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEntrega, setHorarioEntrega] = useState("14:00");
  const [itens, setItens] = useState("");
  const [valorTotal, setValorTotal] = useState<number | "">("");
  const [valorEntrada, setValorEntrada] = useState<number | "">("");
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamentoEncomenda>("pendente");
  const [status, setStatus] = useState<StatusEncomenda>("pendente");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Formulário de Bloqueio de Data
  const [dataBloqueio, setDataBloqueio] = useState(new Date().toISOString().split("T")[0]);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Agenda Lotada");

  // Abrir Modal de Criação (opcionalmente com data pré-definida)
  const handleAbrirNovaEncomenda = (dataPredefinida?: string) => {
    setEditingId(null);
    setClienteNome("");
    setClienteWhatsapp("");
    setDataEntrega(dataPredefinida || new Date().toISOString().split("T")[0]);
    setHorarioEntrega("14:00");
    setItens("");
    setValorTotal("");
    setValorEntrada("");
    setStatusPagamento("pendente");
    setStatus("pendente");
    setTipoEntrega("retirada");
    setEnderecoEntrega("");
    setObservacoes("");
    setModalEncomendaOpen(true);
  };

  // Abrir Modal de Edição
  const handleAbrirEdicao = (ord: Encomenda) => {
    setEditingId(ord.id);
    setClienteNome(ord.clienteNome);
    setClienteWhatsapp(ord.clienteWhatsapp);
    setDataEntrega(ord.dataEntrega);
    setHorarioEntrega(ord.horarioEntrega || "14:00");
    setItens(ord.itens);
    setValorTotal(ord.valorTotal);
    setValorEntrada(ord.valorEntrada || "");
    setStatusPagamento(ord.statusPagamento);
    setStatus(ord.status);
    setTipoEntrega(ord.tipoEntrega || "retirada");
    setEnderecoEntrega(ord.enderecoEntrega || "");
    setObservacoes(ord.observacoes || "");
    setModalEncomendaOpen(true);
  };

  // Salvar Encomenda (Criar ou Editar)
  const handleSalvarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome || !itens || valorTotal === "") {
      toast.error("Preencha o nome do cliente, itens e valor total.");
      return;
    }

    try {
      const payload = {
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens,
        valorTotal: Number(valorTotal),
        valorEntrada: valorEntrada !== "" ? Number(valorEntrada) : 0,
        statusPagamento,
        status,
        tipoEntrega,
        enderecoEntrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        observacoes,
      };

      if (editingId) {
        await onEditarEncomenda(editingId, payload);
        toast.success("Encomenda atualizada com sucesso!");
      } else {
        await onCriarEncomenda(payload);
        toast.success("Nova encomenda cadastrada com sucesso!");
      }
      setModalEncomendaOpen(false);
    } catch {
      toast.error("Erro ao salvar encomenda.");
    }
  };

  // Salvar Bloqueio de Data
  const handleSalvarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataBloqueio) return;

    try {
      await onBloquearData(dataBloqueio, motivoBloqueio);
      toast.success(`Data ${dataBloqueio} bloqueada no calendário.`);
      setModalBloqueioOpen(false);
    } catch {
      toast.error("Erro ao bloquear data.");
    }
  };

  // Abrir Painel Lateral do Dia
  const handleAbrirDrawerDia = (dataIso: string) => {
    setSelectedDrawerDate(dataIso);
    setDrawerOpen(true);
  };

  // Dados das Encomendas no Dia Selecionado para o Drawer
  const encomendasDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return [];
    return encomendas.filter((e) => e.dataEntrega === selectedDrawerDate);
  }, [encomendas, selectedDrawerDate]);

  const bloqueioDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return null;
    return datasBloqueadas.find((b) => b.data === selectedDrawerDate) || null;
  }, [datasBloqueadas, selectedDrawerDate]);

  // Lista Filtrada para a Tabela
  const encomendasFiltradas = useMemo(() => {
    return encomendas.filter((e) => {
      const matchStatus = filtroStatus === "todos" || e.status === filtroStatus;
      const matchPagamento = filtroPagamento === "todos" || e.statusPagamento === filtroPagamento;
      const matchBusca =
        !busca ||
        e.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
        e.itens.toLowerCase().includes(busca.toLowerCase()) ||
        e.clienteWhatsapp.includes(busca);
      return matchStatus && matchPagamento && matchBusca;
    });
  }, [encomendas, filtroStatus, filtroPagamento, busca]);

  // Navegação de Período
  const navegarPeriodo = (delta: number) => {
    const nova = new Date(currentDate);
    if (viewMode === "mes") {
      nova.setMonth(nova.getMonth() + delta);
    } else {
      nova.setDate(nova.getDate() + delta * 7);
    }
    setCurrentDate(nova);
  };

  // Grid do Calendário Mensal
  const diasDoMesGrid = useMemo(() => {
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();

    const dias = [];

    // Dias do mês anterior para completar a 1ª semana
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const diaNum = ultimoDiaMesAnterior - i;
      const dataIso = new Date(ano, mes - 1, diaNum).toISOString().split("T")[0];
      dias.push({
        dataIso,
        diaNum,
        foraDoMes: true,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= ultimoDiaMes; i++) {
      const dataIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      dias.push({
        dataIso,
        diaNum: i,
        foraDoMes: false,
      });
    }

    // Dias do próximo mês para fechar a grade (múltiplo de 7)
    const restante = 42 - dias.length;
    for (let i = 1; i <= (restante > 7 ? restante - 7 : restante); i++) {
      const dataIso = new Date(ano, mes + 1, i).toISOString().split("T")[0];
      dias.push({
        dataIso,
        diaNum: i,
        foraDoMes: true,
      });
    }

    return dias;
  }, [currentDate]);

  // Dias da Semana Atual
  const diasDaSemanaGrid = useMemo(() => {
    const inicio = new Date(currentDate);
    const diaSemana = inicio.getDay();
    inicio.setDate(inicio.getDate() - diaSemana);

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const dataIso = d.toISOString().split("T")[0];
      dias.push({
        dataIso,
        diaNum: d.getDate(),
        nomeSemana: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i],
      });
    }
    return dias;
  }, [currentDate]);

  const nomeMesAno = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header com Ações e Troca de Visualização */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Encomendas &amp; Calendário <CalendarDays className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie datas de entrega, bloqueios de agenda e pedidos com facilidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalBloqueioOpen(true)}
            className="text-xs border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Bloquear Data
          </Button>

          <Button
            size="sm"
            onClick={() => handleAbrirNovaEncomenda()}
            className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Encomenda
          </Button>
        </div>
      </div>

      {/* Barra de Controle de Visualização e Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        {/* Alternador de Modo: Mês / Semana / Lista */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
          <Button
            variant={viewMode === "mes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("mes")}
            className="h-7 text-xs font-semibold"
          >
            Mensal
          </Button>
          <Button
            variant={viewMode === "semana" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("semana")}
            className="h-7 text-xs font-semibold"
          >
            Semanal
          </Button>
          <Button
            variant={viewMode === "lista" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("lista")}
            className="h-7 text-xs font-semibold"
          >
            Lista Completa
          </Button>
        </div>

        {/* Controles de Navegação de Data (se no modo calendário) */}
        {viewMode !== "lista" && (
          <div className="flex items-center gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarPeriodo(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-foreground capitalize px-2 min-w-[140px] text-center">
              {nomeMesAno}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarPeriodo(1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs h-8 text-primary"
            >
              Hoje
            </Button>
          </div>
        )}

        {/* Filtros para o modo lista */}
        {viewMode === "lista" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, item..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="pronta">Pronta</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Pagamentos</SelectItem>
                <SelectItem value="pendente">Pendente (0%)</SelectItem>
                <SelectItem value="sinal_pago">Sinal Pago (50%)</SelectItem>
                <SelectItem value="pago_integral">100% Pago</SelectItem>
                <SelectItem value="pago_na_entrega">Pagar na Entrega</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO EM CALENDÁRIO MENSAL (COM PÍLULAS COMPACTAS E CORES) */}
      {/* ========================================================================= */}
      {viewMode === "mes" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grade dos Dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-muted/10">
            {diasDoMesGrid.map((dia, idx) => {
              const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso);
              const bloqueio = datasBloqueadas.find((b) => b.data === dia.dataIso);
              const isHoje = dia.dataIso === new Date().toISOString().split("T")[0];

              const totalCount = encomendasDoDia.length;
              const maxExibir = 2;
              const exibidas = encomendasDoDia.slice(0, maxExibir);
              const restantes = totalCount - maxExibir;

              return (
                <div
                  key={`${dia.dataIso}-${idx}`}
                  onClick={() => handleAbrirDrawerDia(dia.dataIso)}
                  className={`min-h-[110px] sm:min-h-[125px] p-1.5 flex flex-col justify-between transition-all cursor-pointer group ${
                    dia.foraDoMes ? "opacity-35 bg-muted/20" : "bg-card"
                  } ${
                    bloqueio
                      ? "bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/30"
                      : "hover:bg-primary/5 hover:border-primary/40"
                  }`}
                >
                  {/* Topo da Célula: Número do Dia + Indicador de Bloqueio */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        isHoje
                          ? "bg-primary text-primary-foreground font-black"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {dia.diaNum}
                    </span>

                    {bloqueio && (
                      <Badge
                        variant="destructive"
                        className="text-[9px] px-1.5 py-0 font-bold bg-rose-600 text-white flex items-center gap-0.5"
                        title={`Agenda Fechada: ${bloqueio.motivo}`}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Fechada</span>
                      </Badge>
                    )}
                  </div>

                  {/* Pílulas Compactas das Encomendas: [Horário] Nome (Item) */}
                  <div className="space-y-1 my-1 flex-1">
                    {exibidas.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      const resumoItem = ord.itens.length > 18 ? `${ord.itens.substring(0, 18)}...` : ord.itens;

                      return (
                        <div
                          key={ord.id}
                          className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md border truncate shadow-2xs flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${estiloPilula}`}
                          title={`${ord.horarioEntrega || "14:00"} ${ord.clienteNome} (${ord.itens}) - ${formatarMoeda(ord.valorTotal)}`}
                        >
                          <span className="font-mono font-bold shrink-0 opacity-80">
                            {ord.horarioEntrega || "14:00"}
                          </span>
                          <span className="truncate">
                            <strong>{ord.clienteNome}</strong> ({resumoItem})
                          </span>
                        </div>
                      );
                    })}

                    {/* Etiqueta +X mais clicável */}
                    {restantes > 0 && (
                      <div className="text-[10px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-md text-center">
                        +{restantes} mais
                      </div>
                    )}
                  </div>

                  {/* Rodapé da Célula */}
                  <div className="text-[9px] text-muted-foreground flex justify-between items-center opacity-70 group-hover:opacity-100">
                    {totalCount > 0 ? (
                      <span className="font-semibold text-foreground font-mono">
                        {totalCount} ped.
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-[9px] text-primary font-bold hidden sm:inline">
                      Ver dia &gt;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. VISUALIZAÇÃO EM CALENDÁRIO SEMANAL */}
      {/* ========================================================================= */}
      {viewMode === "semana" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasDaSemanaGrid.map((dia) => {
            const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso);
            const bloqueio = datasBloqueadas.find((b) => b.data === dia.dataIso);
            const isHoje = dia.dataIso === new Date().toISOString().split("T")[0];

            return (
              <Card
                key={dia.dataIso}
                onClick={() => handleAbrirDrawerDia(dia.dataIso)}
                className={`border cursor-pointer transition-all flex flex-col justify-between ${
                  bloqueio ? "bg-rose-500/10 border-rose-500/30" : "bg-card hover:border-primary/50 shadow-xs"
                }`}
              >
                <CardHeader className="p-3 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">{dia.nomeSemana}</span>
                    <h4 className={`text-base font-extrabold ${isHoje ? "text-primary font-black" : "text-foreground"}`}>
                      {dia.diaNum}
                    </h4>
                  </div>
                  {bloqueio && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                      <Lock className="w-3 h-3 mr-0.5" /> Fechada
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-2 space-y-1.5 flex-1 min-h-[140px]">
                  {encomendasDoDia.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-6">
                      Livre
                    </p>
                  ) : (
                    encomendasDoDia.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      return (
                        <div
                          key={ord.id}
                          className={`p-1.5 rounded-lg border text-xs space-y-1 ${estiloPilula}`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="font-mono text-[10px]">{ord.horarioEntrega || "14:00"}</span>
                            <span className="text-[10px]">{formatarMoeda(ord.valorTotal)}</span>
                          </div>
                          <p className="font-semibold text-xs truncate">{ord.clienteNome}</p>
                          <p className="text-[10px] opacity-80 truncate">{ord.itens}</p>
                        </div>
                      );
                    })
                  )}
                </CardContent>

                <CardFooter className="p-2 border-t border-border/50 text-[10px] text-primary font-bold flex justify-between">
                  <span>{encomendasDoDia.length} encomenda(s)</span>
                  <span>Ver detalhes &gt;</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISUALIZAÇÃO EM LISTA / TABELA COMPLETA */}
      {/* ========================================================================= */}
      {viewMode === "lista" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs">Data &amp; Hora</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Itens do Pedido</TableHead>
                <TableHead className="text-xs">Tipo Entrega</TableHead>
                <TableHead className="text-xs">Valor Total</TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs">Status Produção</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encomendasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhuma encomenda encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                encomendasFiltradas.map((ord) => {
                  const statusCfg = STATUS_ENCOMENDA_CONFIG[ord.status];
                  const pagCfg = STATUS_PAGAMENTO_CONFIG[ord.statusPagamento];

                  return (
                    <TableRow key={ord.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono">
                        <div className="font-bold text-foreground">
                          {ord.dataEntrega.split("-").reverse().join("/")}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-primary" /> {ord.horarioEntrega || "14:00"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{ord.clienteNome}</div>
                        {ord.clienteWhatsapp && (
                          <a
                            href={formatarWhatsappLink(ord.clienteWhatsapp, `Olá ${ord.clienteNome}! Estamos preparando sua encomenda do CaixaDoce.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline font-mono"
                          >
                            <MessageCircle className="w-3 h-3" /> {ord.clienteWhatsapp}
                          </a>
                        )}
                      </TableCell>

                      <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground" title={ord.itens}>
                        {ord.itens}
                      </TableCell>

                      <TableCell className="text-xs">
                        {ord.tipoEntrega === "delivery" ? (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <Truck className="w-3.5 h-3.5" /> Delivery
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-stone-600 font-semibold">
                            <Store className="w-3.5 h-3.5" /> Retirada
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-extrabold text-foreground">
                        {formatarMoeda(ord.valorTotal)}
                        {ord.valorEntrada && ord.valorEntrada > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            Sinal: {formatarMoeda(ord.valorEntrada)}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className={`font-semibold ${pagCfg?.color || ""}`}>
                          {pagCfg?.label || ord.statusPagamento}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${statusCfg?.color || ""}`}>
                          {statusCfg?.label || ord.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicao(ord)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                onExcluirEncomenda(ord.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. PAINEL LATERAL (DRAWER / SHEET) DE DETALHES DO DIA SELECIONADO */}
      {/* ========================================================================= */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col justify-between">
          <div>
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {selectedDrawerDate
                  ? new Date(`${selectedDrawerDate}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Entregas do Dia"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Visualização detalhada de todas as encomendas e controle de agenda da data.
              </SheetDescription>
            </SheetHeader>

            {/* Aviso de Bloqueio no Painel Lateral */}
            {bloqueioDoDiaDrawer && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Agenda Fechada: <strong>{bloqueioDoDiaDrawer.motivo}</strong></span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDesbloquearData(bloqueioDoDiaDrawer.id)}
                  className="h-6 text-[10px] text-rose-600 border-rose-500/40 hover:bg-rose-500/20"
                >
                  <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                </Button>
              </div>
            )}

            {/* Ação Rápida: Adicionar Encomenda para esta data */}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setDrawerOpen(false);
                  handleAbrirNovaEncomenda(selectedDrawerDate || undefined);
                }}
                className="w-full font-bold shadow-xs text-xs h-8.5"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar Encomenda para este dia
              </Button>
            </div>

            {/* Lista das Encomendas do Dia */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Entregas Agendadas ({encomendasDoDiaDrawer.length})
              </h4>

              {encomendasDoDiaDrawer.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  Nenhuma encomenda agendada para este dia.
                </div>
              ) : (
                encomendasDoDiaDrawer.map((ord) => {
                  const statusCfg = STATUS_ENCOMENDA_CONFIG[ord.status];
                  return (
                    <Card key={ord.id} className="border-border shadow-xs bg-card overflow-hidden">
                      <div className="p-3.5 space-y-3">
                        {/* Topo do Card da Encomenda */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-primary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {ord.horarioEntrega || "14:00"}
                          </span>
                          <Badge variant="outline" className={`text-[10px] font-bold ${statusCfg?.color || ""}`}>
                            {statusCfg?.label || ord.status}
                          </Badge>
                        </div>

                        {/* Dados do Cliente e Contato WhatsApp */}
                        <div>
                          <p className="text-sm font-extrabold text-foreground">{ord.clienteNome}</p>
                          {ord.clienteWhatsapp && (
                            <a
                              href={formatarWhatsappLink(ord.clienteWhatsapp, `Olá ${ord.clienteNome}! Entramos em contato referente a sua encomenda agendada para ${ord.dataEntrega.split("-").reverse().join("/")}.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline mt-0.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{ord.clienteWhatsapp} (Conversar)</span>
                            </a>
                          )}
                        </div>

                        {/* Itens e Detalhes */}
                        <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                          <p className="font-medium text-foreground">{ord.itens}</p>
                          {ord.observacoes && (
                            <p className="text-[11px] text-muted-foreground italic">Obs: {ord.observacoes}</p>
                          )}
                        </div>

                        {/* Valores e Entrega */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          <span className="font-extrabold text-foreground text-sm">
                            {formatarMoeda(ord.valorTotal)}
                          </span>
                          <span className="text-muted-foreground text-[11px] font-medium">
                            {ord.tipoEntrega === "delivery" ? "🚚 Delivery" : "🏬 Retirada"}
                          </span>
                        </div>

                        {/* Alteração Rápida de Status */}
                        <div className="space-y-1 pt-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Alterar Status:</Label>
                          <Select
                            value={ord.status}
                            onValueChange={(v: StatusEncomenda) => {
                              onEditarEncomenda(ord.id, { status: v });
                              toast.success(`Status alterado para ${STATUS_ENCOMENDA_CONFIG[v].label}`);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_producao">Em Produção</SelectItem>
                              <SelectItem value="pronta">Pronta p/ Entrega</SelectItem>
                              <SelectItem value="entregue">Entregue</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex justify-end gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDrawerOpen(false);
                              handleAbrirEdicao(ord);
                            }}
                            className="h-7 text-xs px-2.5 font-semibold"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                onExcluirEncomenda(ord.id);
                              }
                            }}
                            className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="w-full text-xs">
              Fechar Painel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* 5. MODAL: CADASTRAR OU EDITAR ENCOMENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalEncomendaOpen} onOpenChange={setModalEncomendaOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CalendarDays className="w-5 h-5 text-primary" />
              {editingId ? "Editar Encomenda" : "Cadastrar Nova Encomenda"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preencha os detalhes do cliente, data, itens encomendados e valor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEncomenda} className="space-y-4 py-2">
            {/* Cliente & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enc-nome" className="text-xs">Nome do Cliente *</Label>
                <Input
                  id="enc-nome"
                  placeholder="Ex: Mariana Silva"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="h-8 text-xs font-semibold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-whats" className="text-xs">WhatsApp (com DDD)</Label>
                <Input
                  id="enc-whats"
                  placeholder="(11) 98765-4321"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Data & Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enc-data" className="text-xs">Data da Entrega / Retirada *</Label>
                <Input
                  id="enc-data"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-hora" className="text-xs">Horário Previsto *</Label>
                <Input
                  id="enc-hora"
                  type="time"
                  value={horarioEntrega}
                  onChange={(e) => setHorarioEntrega(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
            </div>

            {/* Itens Encomendados */}
            <div className="space-y-1">
              <Label htmlFor="enc-itens" className="text-xs">Itens Pedidos / Descrição *</Label>
              <Textarea
                id="enc-itens"
                rows={2}
                placeholder="Ex: 1x Bolo Red Velvet 2kg, 30x Brigadeiros Belga ao Leite"
                value={itens}
                onChange={(e) => setItens(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            {/* Valores & Sinal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enc-valor" className="text-xs">Valor Total (R$) *</Label>
                <Input
                  id="enc-valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value ? Number(e.target.value) : "")}
                  className="h-8 text-xs font-black text-foreground"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-sinal" className="text-xs">Sinal / Entrada Paga (R$)</Label>
                <Input
                  id="enc-sinal"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(e.target.value ? Number(e.target.value) : "")}
                  className="h-8 text-xs text-emerald-600 font-semibold"
                />
              </div>
            </div>

            {/* Status de Pagamento & Produção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status do Pagamento</Label>
                <Select value={statusPagamento} onValueChange={(v: StatusPagamentoEncomenda) => setStatusPagamento(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente (0%)</SelectItem>
                    <SelectItem value="sinal_pago">Sinal Pago (50%)</SelectItem>
                    <SelectItem value="pago_integral">100% Pago</SelectItem>
                    <SelectItem value="pago_na_entrega">Pagar na Entrega</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status de Produção</Label>
                <Select value={status} onValueChange={(v: StatusEncomenda) => setStatus(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="pronta">Pronta p/ Entrega</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modalidade de Entrega */}
            <div className="space-y-2">
              <Label className="text-xs">Modalidade de Entrega</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoEntrega === "retirada" ? "default" : "outline"}
                  onClick={() => setTipoEntrega("retirada")}
                  className="h-8 text-xs font-semibold"
                >
                  <Store className="w-3.5 h-3.5 mr-1.5" /> Retirada no Balcão
                </Button>
                <Button
                  type="button"
                  variant={tipoEntrega === "delivery" ? "default" : "outline"}
                  onClick={() => setTipoEntrega("delivery")}
                  className="h-8 text-xs font-semibold"
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Delivery / Entrega
                </Button>
              </div>
            </div>

            {tipoEntrega === "delivery" && (
              <div className="space-y-1">
                <Label htmlFor="enc-end" className="text-xs">Endereço de Entrega</Label>
                <Input
                  id="enc-end"
                  placeholder="Rua, Número, Bairro, Complemento"
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1">
              <Label htmlFor="enc-obs" className="text-xs">Observações / Detalhes</Label>
              <Input
                id="enc-obs"
                placeholder="Ex: Nome no topo do bolo, vela inclusa, alergias..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalEncomendaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold shadow-md">
                {editingId ? "Salvar Alterações" : "Cadastrar Encomenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL: BLOQUEAR DATA NA AGENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalBloqueioOpen} onOpenChange={setModalBloqueioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Lock className="w-5 h-5 text-rose-500" /> Bloquear Data na Agenda
            </DialogTitle>
            <DialogDescription className="text-xs">
              Datas bloqueadas ficam marcadas como "Agenda Fechada" e impedem agendamentos públicos de clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarBloqueio} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="bloq-data" className="text-xs">Data a ser Bloqueada *</Label>
              <Input
                id="bloq-data"
                type="date"
                value={dataBloqueio}
                onChange={(e) => setDataBloqueio(e.target.value)}
                className="h-8 text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bloq-motivo" className="text-xs">Motivo do Bloqueio *</Label>
              <Select value={motivoBloqueio} onValueChange={setMotivoBloqueio}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agenda Lotada">Agenda Lotada</SelectItem>
                  <SelectItem value="Feriado / Recesso">Feriado / Recesso</SelectItem>
                  <SelectItem value="Folga / Manutenção">Folga / Manutenção</SelectItem>
                  <SelectItem value="Evento Externo">Evento Externo</SelectItem>
                  <SelectItem value="Outro">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lista de Datas Já Bloqueadas */}
            {datasBloqueadas.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border/50">
                <Label className="text-[11px] font-bold text-muted-foreground">Datas Já Bloqueadas:</Label>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {datasBloqueadas.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-xs">
                      <span className="font-mono font-bold text-foreground">
                        {b.data.split("-").reverse().join("/")} ({b.motivo})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDesbloquearData(b.id)}
                        className="h-5 px-1.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
                      >
                        <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalBloqueioOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" size="sm" className="font-bold bg-rose-600 hover:bg-rose-700 text-white">
                <Lock className="w-3.5 h-3.5 mr-1" /> Confirmar Bloqueio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
