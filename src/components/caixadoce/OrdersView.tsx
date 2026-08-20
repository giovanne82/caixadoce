import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Sparkles,
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

export function OrdersView({
  encomendas,
  datasBloqueadas,
  onCriarEncomenda,
  onEditarEncomenda,
  onExcluirEncomenda,
  onBloquearData,
  onDesbloquearData,
}: OrdersViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "week">("calendar");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos");

  // State: Modal Encomenda (Criar / Editar)
  const [modalEncomendaOpen, setModalEncomendaOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEntrega, setHorarioEntrega] = useState("14:00");
  const [itens, setItens] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamentoEncomenda>("pendente");
  const [status, setStatus] = useState<StatusEncomenda>("pendente");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  // State: Modal Bloqueio de Data
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [dataParaBloqueio, setDataParaBloqueio] = useState(new Date().toISOString().split("T")[0]);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Agenda Lotada");
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);

  // State: Detalhes de um Dia específico ao clicar no Calendário
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  // Encomendas Filtradas
  const encomendasFiltradas = useMemo(() => {
    return encomendas.filter((enc) => {
      const matchBusca =
        !busca ||
        enc.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
        enc.itens.toLowerCase().includes(busca.toLowerCase()) ||
        enc.clienteWhatsapp.includes(busca);

      const matchStatus = filtroStatus === "todos" || enc.status === filtroStatus;
      const matchPag = filtroPagamento === "todos" || enc.statusPagamento === filtroPagamento;

      return matchBusca && matchStatus && matchPag;
    });
  }, [encomendas, busca, filtroStatus, filtroPagamento]);

  // Abertura para Criação
  const handleOpenNova = (dataPreDefinida?: string) => {
    setEditingId(null);
    setClienteNome("");
    setClienteWhatsapp("");
    setDataEntrega(dataPreDefinida || new Date().toISOString().split("T")[0]);
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

  // Abertura para Edição
  const handleOpenEditar = (enc: Encomenda) => {
    setEditingId(enc.id);
    setClienteNome(enc.clienteNome);
    setClienteWhatsapp(enc.clienteWhatsapp);
    setDataEntrega(enc.dataEntrega);
    setHorarioEntrega(enc.horarioEntrega);
    setItens(enc.itens);
    setValorTotal(enc.valorTotal.toString());
    setValorEntrada(enc.valorEntrada?.toString() || "");
    setStatusPagamento(enc.statusPagamento);
    setStatus(enc.status);
    setTipoEntrega(enc.tipoEntrega || "retirada");
    setEnderecoEntrega(enc.enderecoEntrega || "");
    setObservacoes(enc.observacoes || "");
    setModalEncomendaOpen(true);
  };

  // Salvar Encomenda (Submit)
  const handleSubmitEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(valorTotal.replace(",", "."));
    const entradaNum = valorEntrada ? parseFloat(valorEntrada.replace(",", ".")) : 0;

    if (!clienteNome || !itens || isNaN(totalNum)) {
      toast.error("Preencha o nome do cliente, itens do pedido e o valor total.");
      return;
    }

    // Valida se a data está bloqueada
    const isBloqueada = datasBloqueadas.some((d) => d.data === dataEntrega);
    if (isBloqueada && !editingId) {
      toast.warning("Aviso: Esta data está sinalizada como bloqueada na agenda.");
    }

    setSalvando(true);
    try {
      const payload = {
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens,
        valorTotal: totalNum,
        valorEntrada: entradaNum,
        statusPagamento,
        status,
        tipoEntrega,
        enderecoEntrega,
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
    } finally {
      setSalvando(false);
    }
  };

  // Salvar Bloqueio de Data
  const handleSalvarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataParaBloqueio) return;
    setSalvandoBloqueio(true);
    try {
      await onBloquearData(dataParaBloqueio, motivoBloqueio || "Agenda Lotada");
      setModalBloqueioOpen(false);
      toast.success(`Data ${dataParaBloqueio} bloqueada com sucesso!`);
    } finally {
      setSalvandoBloqueio(false);
    }
  };

  // Funções Auxiliares do Calendário
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(currentDate);

  // Geração dos dias do mês
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Dias do mês anterior para preenchimento
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const str = prevDate.toISOString().split("T")[0];
      days.push({ dateStr: str, dayNum: d, isCurrentMonth: false, isToday: str === todayStr });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ dateStr: str, dayNum: i, isCurrentMonth: true, isToday: str === todayStr });
    }

    // Dias do próximo mês para completar grid de 35 ou 42 células
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const str = nextDate.toISOString().split("T")[0];
      days.push({ dateStr: str, dayNum: i, isCurrentMonth: false, isToday: str === todayStr });
    }

    return days;
  }, [year, month]);

  // Dias da Semana Atual para Visualização Semanal
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const str = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr: str,
        dayNum: d.getDate(),
        weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d),
      });
    }
    return days;
  }, [currentDate]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Encomendas &amp; Calendário <CalendarIcon className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Agendamento de pedidos, controle de produção, entregas e bloqueio de agenda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador de Visualização */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8 text-xs font-semibold"
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" /> Mês
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="h-8 text-xs font-semibold"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Semana
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 text-xs font-semibold"
            >
              <List className="w-3.5 h-3.5 mr-1.5" /> Lista
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDataParaBloqueio(new Date().toISOString().split("T")[0]);
              setModalBloqueioOpen(true);
            }}
            className="h-9 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Bloquear Data
          </Button>

          <Button onClick={() => handleOpenNova()} className="h-9 font-semibold shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> Nova Encomenda
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border-border shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, item, whatsapp..."
              className="pl-9 h-9 text-xs"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status de Produção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="pronta">Pronta p/ Entrega</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filtroPagamento} onValueChange={(v) => setFiltroPagamento(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status de Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Pagamentos</SelectItem>
                <SelectItem value="pendente">Pendente (0%)</SelectItem>
                <SelectItem value="sinal_pago">Sinal Pago (50%)</SelectItem>
                <SelectItem value="pago_integral">100% Pago</SelectItem>
                <SelectItem value="pago_na_entrega">Pagar na Entrega</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO EM CALENDÁRIO MENSAL */}
      {/* ========================================================================= */}
      {viewMode === "calendar" && (
        <Card className="border-border shadow-md overflow-hidden bg-card">
          {/* Navegação do Mês */}
          <div className="flex items-center justify-between p-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold capitalize text-foreground">{nomeMes}</h3>
              <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-7 px-2.5">
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-border/70 text-center bg-muted/40 font-bold text-xs py-2 text-muted-foreground uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-background">
            {calendarDays.map((d, index) => {
              const ordersDoDia = encomendasFiltradas.filter((enc) => enc.dataEntrega === d.dateStr);
              const bloqueio = datasBloqueadas.find((b) => b.data === d.dateStr);

              return (
                <div
                  key={`${d.dateStr}-${index}`}
                  onClick={() => setDiaSelecionado(d.dateStr)}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors relative cursor-pointer hover:bg-muted/30 ${
                    !d.isCurrentMonth ? "opacity-35 bg-muted/10" : ""
                  } ${bloqueio ? "bg-rose-50/30 dark:bg-rose-950/20" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        d.isToday
                          ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                          : "text-foreground"
                      }`}
                    >
                      {d.dayNum}
                    </span>

                    {bloqueio && (
                      <span
                        title={`Bloqueado: ${bloqueio.motivo}`}
                        className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      >
                        <Lock className="w-2.5 h-2.5" /> Bloq
                      </span>
                    )}
                  </div>

                  {/* Lista de Encomendas do Dia */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-[70px]">
                    {ordersDoDia.map((enc) => {
                      const cfg = STATUS_ENCOMENDA_CONFIG[enc.status] || STATUS_ENCOMENDA_CONFIG.pendente;
                      return (
                        <div
                          key={enc.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditar(enc);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${cfg.color} hover:scale-102 transition-transform`}
                          title={`${enc.horarioEntrega} - ${enc.clienteNome}: ${enc.itens}`}
                        >
                          <span className="font-bold mr-1">{enc.horarioEntrega}</span>
                          {enc.clienteNome.split(" ")[0]}
                        </div>
                      );
                    })}
                  </div>

                  {/* Rodapé da célula / Total de pedidos */}
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span>{ordersDoDia.length > 0 ? `${ordersDoDia.length} enc.` : ""}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNova(d.dateStr);
                      }}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/20 text-primary"
                      title="Adicionar encomenda neste dia"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. VISUALIZAÇÃO SEMANAL */}
      {/* ========================================================================= */}
      {viewMode === "week" && (
        <Card className="border-border shadow-md overflow-hidden bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-foreground">
                Semana de {weekDays[0].dateStr.split("-").reverse().join("/")} a{" "}
                {weekDays[6].dateStr.split("-").reverse().join("/")}
              </h3>
              <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-7 px-2.5">
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {weekDays.map((d) => {
              const ordersDoDia = encomendasFiltradas.filter((enc) => enc.dataEntrega === d.dateStr);
              const bloqueio = datasBloqueadas.find((b) => b.data === d.dateStr);
              const isToday = d.dateStr === new Date().toISOString().split("T")[0];

              return (
                <div key={d.dateStr} className={`p-3 min-h-[280px] flex flex-col justify-between ${bloqueio ? "bg-rose-50/30 dark:bg-rose-950/20" : ""}`}>
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                      <div>
                        <span className="text-xs uppercase font-bold text-muted-foreground block">
                          {d.weekday}
                        </span>
                        <span className={`text-lg font-extrabold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {d.dayNum}
                        </span>
                      </div>
                      {bloqueio && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Bloqueado
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      {ordersDoDia.map((enc) => (
                        <div
                          key={enc.id}
                          onClick={() => handleOpenEditar(enc)}
                          className="p-2.5 rounded-lg border border-border/70 bg-card hover:border-primary/50 shadow-xs cursor-pointer space-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary" /> {enc.horarioEntrega}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1.5 py-0 ${STATUS_ENCOMENDA_CONFIG[enc.status].color}`}
                            >
                              {STATUS_ENCOMENDA_CONFIG[enc.status].label}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-foreground truncate">{enc.clienteNome}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{enc.itens}</p>
                          <div className="pt-1 text-[11px] font-bold text-emerald-600 flex justify-between">
                            <span>{formatarMoeda(enc.valorTotal)}</span>
                            {enc.tipoEntrega === "delivery" && <Truck className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenNova(d.dateStr)}
                    className="w-full text-xs font-semibold text-primary mt-3 hover:bg-primary/10"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. VISUALIZAÇÃO EM LISTA / TABELA */}
      {/* ========================================================================= */}
      {viewMode === "list" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens / Pedido</TableHead>
                <TableHead>Tipo Entrega</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status Produção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encomendasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                    Nenhuma encomenda encontrada com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                encomendasFiltradas.map((enc) => {
                  const statusCfg = STATUS_ENCOMENDA_CONFIG[enc.status] || STATUS_ENCOMENDA_CONFIG.pendente;
                  const pagCfg = STATUS_PAGAMENTO_CONFIG[enc.statusPagamento] || STATUS_PAGAMENTO_CONFIG.pendente;

                  return (
                    <TableRow key={enc.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-foreground">
                        <div className="font-bold">{enc.dataEntrega.split("-").reverse().join("/")}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {enc.horarioEntrega}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm text-foreground">{enc.clienteNome}</p>
                        {enc.clienteWhatsapp && (
                          <a
                            href={formatarWhatsappLink(
                              enc.clienteWhatsapp,
                              `Olá ${enc.clienteNome}! Passando para confirmar sua encomenda no CaixaDoce marcada para ${enc.dataEntrega.split("-").reverse().join("/")} às ${enc.horarioEntrega}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> {enc.clienteWhatsapp}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <p className="text-xs text-foreground line-clamp-2">{enc.itens}</p>
                        {enc.observacoes && (
                          <p className="text-[11px] text-amber-600 italic mt-0.5 line-clamp-1">
                            Obs: {enc.observacoes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {enc.tipoEntrega === "delivery" ? (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Truck className="w-3.5 h-3.5" /> Delivery
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground font-medium">
                            <Store className="w-3.5 h-3.5" /> Retirada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-extrabold text-sm text-foreground">
                        {formatarMoeda(enc.valorTotal)}
                        {enc.valorEntrada && enc.valorEntrada > 0 ? (
                          <p className="text-[10px] text-muted-foreground font-normal">
                            Sinal: {formatarMoeda(enc.valorEntrada)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${pagCfg.color}`}>
                          {pagCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditar(enc)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir a encomenda de "${enc.clienteNome}"?`)) {
                                onExcluirEncomenda(enc.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
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
      {/* MODAL: CRIAR OU EDITAR ENCOMENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalEncomendaOpen} onOpenChange={setModalEncomendaOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? "Editar Encomenda" : "Nova Encomenda Manual"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente, itens encomendados, prazos e pagamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEncomenda} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enc-nome">Nome do Cliente *</Label>
                <Input
                  id="enc-nome"
                  placeholder="Ex: Amanda Nogueira"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enc-whats">WhatsApp do Cliente</Label>
                <Input
                  id="enc-whats"
                  placeholder="(11) 98765-4321"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enc-data">Data de Entrega / Retirada *</Label>
                <Input
                  id="enc-data"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enc-hora">Horário Previsto *</Label>
                <Input
                  id="enc-hora"
                  type="time"
                  value={horarioEntrega}
                  onChange={(e) => setHorarioEntrega(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enc-itens">Itens do Pedido &amp; Quantidades *</Label>
              <Textarea
                id="enc-itens"
                rows={3}
                placeholder="Ex: 1x Bolo 2kg Ninho com Morango, 50x Brigadeiros Tradicionais, 25x Beijinhos"
                value={itens}
                onChange={(e) => setItens(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enc-valortotal">Valor Total (R$) *</Label>
                <Input
                  id="enc-valortotal"
                  placeholder="150,00"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enc-valorentrada">Valor Sinal / Entrada (R$)</Label>
                <Input
                  id="enc-valorentrada"
                  placeholder="75,00"
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enc-statuspag">Status do Pagamento</Label>
                <Select value={statusPagamento} onValueChange={(v: any) => setStatusPagamento(v)}>
                  <SelectTrigger id="enc-statuspag">
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

              <div className="space-y-1.5">
                <Label htmlFor="enc-statusprod">Status de Produção</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger id="enc-statusprod">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enc-tipoentrega">Modalidade de Entrega</Label>
                <Select value={tipoEntrega} onValueChange={(v: any) => setTipoEntrega(v)}>
                  <SelectTrigger id="enc-tipoentrega">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retirada">Retirada no Balcão</SelectItem>
                    <SelectItem value="delivery">Delivery / Entrega</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoEntrega === "delivery" && (
                <div className="space-y-1.5">
                  <Label htmlFor="enc-end">Endereço de Entrega</Label>
                  <Input
                    id="enc-end"
                    placeholder="Rua, Número, Bairro, Complemento"
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enc-obs">Observações / Detalhes Adicionais</Label>
              <Input
                id="enc-obs"
                placeholder="Ex: Topo de bolo personalizado, sem lactose, laço dourado..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setModalEncomendaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="font-semibold shadow-md">
                {salvando ? "Salvando..." : editingId ? "Atualizar Encomenda" : "Cadastrar Encomenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: BLOQUEAR DATA NO CALENDÁRIO */}
      {/* ========================================================================= */}
      <Dialog open={modalBloqueioOpen} onOpenChange={setModalBloqueioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Lock className="w-5 h-5" /> Bloquear Data na Agenda
            </DialogTitle>
            <DialogDescription>
              Marque dias em que você não aceitará novas encomendas (feriado, agenda lotada, etc.).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarBloqueio} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bloq-data">Data a Bloquear</Label>
              <Input
                id="bloq-data"
                type="date"
                value={dataParaBloqueio}
                onChange={(e) => setDataParaBloqueio(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bloq-motivo">Motivo do Bloqueio</Label>
              <Select value={motivoBloqueio} onValueChange={setMotivoBloqueio}>
                <SelectTrigger id="bloq-motivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agenda Lotada">Agenda Lotada</SelectItem>
                  <SelectItem value="Feriado / Recesso">Feriado / Recesso</SelectItem>
                  <SelectItem value="Manutenção de Equipamentos">Manutenção de Equipamentos</SelectItem>
                  <SelectItem value="Folga / Férias">Folga / Férias</SelectItem>
                  <SelectItem value="Outro Motivo">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalBloqueioOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={salvandoBloqueio}>
                {salvandoBloqueio ? "Bloqueando..." : "Confirmar Bloqueio"}
              </Button>
            </DialogFooter>
          </form>

          {/* Lista de Datas Bloqueadas no momento */}
          {datasBloqueadas.length > 0 && (
            <div className="mt-4 pt-3 border-t space-y-2">
              <h5 className="text-xs font-bold text-muted-foreground uppercase">Datas Atualmente Bloqueadas:</h5>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {datasBloqueadas.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">
                        {b.data.split("-").reverse().join("/")}
                      </span>
                      <span className="text-muted-foreground ml-2">({b.motivo})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDesbloquearData(b.id)}
                      className="h-6 px-2 text-rose-600 hover:bg-rose-100 text-[11px]"
                      title="Desbloquear data"
                    >
                      <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
