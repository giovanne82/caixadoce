import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
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
  Clock,
  MessageCircle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Truck,
  Store,
  Edit2,
  Trash2,
  CalendarDays,
  Tag,
  X,
  ShoppingCart,
  Check,
  Send,
  Cake,
  User,
  Receipt,
  FileText,
  Building2,
  Eye,
  Link2,
  UtensilsCrossed,
  Package,
  MapPin,
  CreditCard,
  QrCode,
  Flame,
  Sparkles,
  PlusCircle,
  Users,
  CheckCircle2,
  RotateCcw,
  Copy,
  Loader2,
  Printer,
  Image as ImageIcon,
  Maximize2,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { CustomersView } from "@/components/caixadoce/CustomersView";
import { Checkbox } from "@/components/ui/checkbox";
import {
  obterFichaTecnicaProduto,
  consolidarReceitasEncomendas,
  calcularCustoItemFichaTecnica,
  type FichaTecnicaItem,
  type InsumoConsolidado,
} from "@/lib/ficha-tecnica-service";
import {
  formatarMoeda,
  formatarWhatsappLink,
  gerarMensagemResumoWhatsApp,
  gerarMensagemOrcamentoWhatsApp,
  identificarMetodoPagamento,
  generatePixPayload,
  type ContaPix,
  aplicarMascaraTelefone,
  aplicarMascaraMoedaInput,
  converterMoedaInputParaNumero,
  obterCatalogoInsumos,
  salvarNovoInsumoCatalogo,
  obterClientes,
  salvarClientesStorage,
  obterProdutosCardapio,
  obterNotinhasVinculadasPorLista,
  salvarNotinhasVinculadasPorLista,
  calcularTotalPagoEncomenda,
  isEncomendaTotalmentePaga,
  obterOrigemEncomenda,
  type OrigemEncomendaTipo,
  STATUS_ENCOMENDA_CONFIG,
  CATEGORIAS_DESPESA_CONFIG,
  type Encomenda,
  type DataBloqueada,
  type StatusEncomenda,
  type StatusPagamentoEncomenda,
  type InsumoNecessarioPedido,
  type ItemPedidoEncomenda,
  type Cliente,
  type ProdutoCardapio,
  type DespesaNotaFiscal,
  type PagamentoItem,
  isPedidoIFood,
  extrairDadosIFood,
  enviarAcaoIFood,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface OrdersViewProps {
  encomendas: Encomenda[];
  datasBloqueadas: DataBloqueada[];
  despesas?: DespesaNotaFiscal[];
  clientes?: Cliente[];
  produtos?: ProdutoCardapio[];
  estabelecimentoNome?: string;
  onCriarEncomenda: (dados: Omit<Encomenda, "id" | "estabelecimentoCodigo">) => Promise<void>;
  onEditarEncomenda: (id: string, dados: Partial<Encomenda>) => Promise<void>;
  onExcluirEncomenda: (id: string) => Promise<void>;
  onBloquearData: (data: string, motivo: string) => Promise<void>;
  onDesbloquearData: (id: string) => Promise<void>;
  onCriarClienteRapido?: (nome: string, whatsapp: string, endereco?: string) => Promise<void>;
  onCriarCliente?: (dados: Omit<Cliente, "id" | "estabelecimentoCodigo" | "createdAt">) => Promise<any>;
  onEditarCliente?: (id: string, dados: Partial<Cliente>) => Promise<void>;
  onExcluirCliente?: (id: string) => Promise<void>;
}

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

function renderizarBadgeOrigem(ordOrOrigem?: Encomenda | string) {
  const enc: Partial<Encomenda> | undefined = typeof ordOrOrigem === "string" ? { origem: ordOrOrigem } : ordOrOrigem;
  const origem = obterOrigemEncomenda(enc);

  if (origem === "pdv") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-[10px] font-bold flex items-center gap-1 shrink-0 px-2 py-0.5 shadow-xs">
        <Store className="w-3 h-3 text-white shrink-0" />
        <span>PDV / Balcão</span>
      </Badge>
    );
  }

  if (origem === "ifood") {
    return (
      <Badge className="bg-red-600 hover:bg-red-700 text-white border-none text-[10px] font-black uppercase flex items-center gap-1 shrink-0 px-2 py-0.5 shadow-xs">
        <Store className="w-3 h-3 text-white fill-white shrink-0" />
        <span>iFood</span>
      </Badge>
    );
  }

  if (origem === "99food") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 border-none text-[10px] font-black uppercase flex items-center gap-1 shrink-0 px-2 py-0.5 shadow-xs">
        <Store className="w-3 h-3 text-slate-950 fill-slate-950 shrink-0" />
        <span>99Food</span>
      </Badge>
    );
  }

  if (origem === "cardapio") {
    return (
      <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-none text-[10px] font-bold flex items-center gap-1 shrink-0 px-2 py-0.5 shadow-xs">
        <ShoppingCart className="w-3 h-3 text-white shrink-0" />
        <span>Meu Cardápio</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 text-[10px] font-medium flex items-center gap-1 shrink-0 px-2 py-0.5">
      <Edit2 className="w-3 h-3 text-zinc-500 shrink-0" />
      <span>Manual</span>
    </Badge>
  );
}

function renderizarBadgeOrigemMobile(ordOrOrigem?: Encomenda | string) {
  const enc: Partial<Encomenda> | undefined = typeof ordOrOrigem === "string" ? { origem: ordOrOrigem } : ordOrOrigem;
  const origem = obterOrigemEncomenda(enc);

  if (origem === "pdv") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-[9px] font-bold flex items-center gap-0.5 shrink-0 px-1.5 py-0 shadow-xs">
        <Store className="w-2.5 h-2.5 text-white shrink-0" />
        <span>PDV / Balcão</span>
      </Badge>
    );
  }

  if (origem === "ifood") {
    return (
      <Badge className="bg-red-600 hover:bg-red-700 text-white border-none text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0 px-1.5 py-0 shadow-xs">
        <Store className="w-2.5 h-2.5 text-white fill-white shrink-0" />
        <span>iFood</span>
      </Badge>
    );
  }

  if (origem === "99food") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 border-none text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0 px-1.5 py-0 shadow-xs">
        <Store className="w-2.5 h-2.5 text-slate-950 fill-slate-950 shrink-0" />
        <span>99Food</span>
      </Badge>
    );
  }

  if (origem === "cardapio") {
    return (
      <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-none text-[9px] font-bold flex items-center gap-0.5 shrink-0 px-1.5 py-0 shadow-xs">
        <ShoppingCart className="w-2.5 h-2.5 text-white shrink-0" />
        <span>Cardápio</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 text-[9px] font-medium flex items-center gap-0.5 shrink-0 px-1.5 py-0">
      <Edit2 className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
      <span>Manual</span>
    </Badge>
  );
}

function renderizarBadgePagamento(ord: Encomenda) {
  if (isPedidoIFood(ord)) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Pago (iFood)</span>
      </Badge>
    );
  }

  if (ord.is_orcamento || (ord as any).origem_pagamento === "orcamento" || (ord as any).metodo_pagamento === "Orçamento") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[10px] font-extrabold shadow-xs flex items-center gap-1">
        <span>📝</span>
        <span>ORÇAMENTO</span>
      </Badge>
    );
  }

  const totalPago = calcularTotalPagoEncomenda(ord);
  const statusPag = String(ord.statusPagamento || (ord as any).status_pagamento || "").toLowerCase();
  const isStatusPago =
    statusPag === "pago" ||
    statusPag === "pago_integral" ||
    statusPag === "aprovado" ||
    statusPag === "approved" ||
    statusPag === "paid";

  const isPagoIntegral = isStatusPago || (totalPago >= ord.valorTotal && ord.valorTotal > 0);
  const tipoMetodo = identificarMetodoPagamento(ord);

  if (isPagoIntegral) {
    if (tipoMetodo === "credit_card") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-emerald-500/25">
          <CreditCard className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Pago (Cartão)</span>
        </Badge>
      );
    }
    if (tipoMetodo === "pix") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-emerald-500/25">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Pago (Pix)</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-emerald-500/25">
        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Pago (Manual)</span>
      </Badge>
    );
  }

  if (totalPago > 0) {
    const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
    const labelMetodo = tipoMetodo === "credit_card" ? "Cartão" : tipoMetodo === "pix" ? "Pix" : "Manual";
    return (
      <div className="space-y-0.5">
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
          Pago ({labelMetodo}): {formatarMoeda(totalPago)}
        </Badge>
        <p className="text-[10px] text-rose-600 font-bold">Falta: {formatarMoeda(saldoRestante)}</p>
      </div>
    );
  }

  const labelPendente = tipoMetodo === "credit_card" ? "Pendente (Cartão)" : tipoMetodo === "pix" ? "Pendente (Pix)" : "Pendente (Manual)";

  return (
    <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
      {labelPendente}
    </Badge>
  );
}

function renderizarBadgePagamentoMobile(ord: Encomenda) {
  if (isPedidoIFood(ord)) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0 mt-0.5 font-bold flex items-center gap-0.5">
        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
        <span>Pago (iFood)</span>
      </Badge>
    );
  }

  if (ord.is_orcamento || (ord as any).origem_pagamento === "orcamento" || (ord as any).metodo_pagamento === "Orçamento") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[9px] px-1.5 py-0 mt-0.5 font-extrabold flex items-center gap-0.5">
        <span>📝</span>
        <span>ORÇAMENTO</span>
      </Badge>
    );
  }

  const totalPago = calcularTotalPagoEncomenda(ord);
  const statusPag = String(ord.statusPagamento || (ord as any).status_pagamento || "").toLowerCase();
  const isStatusPago =
    statusPag === "pago" ||
    statusPag === "pago_integral" ||
    statusPag === "aprovado" ||
    statusPag === "approved" ||
    statusPag === "paid";

  const isPagoIntegral = isStatusPago || (totalPago >= ord.valorTotal && ord.valorTotal > 0);
  const tipoMetodo = identificarMetodoPagamento(ord);

  if (isPagoIntegral) {
    if (tipoMetodo === "credit_card") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0 mt-0.5 font-bold flex items-center gap-0.5">
          <CreditCard className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
          <span>Pago (Cartão)</span>
        </Badge>
      );
    }
    if (tipoMetodo === "pix") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0 mt-0.5 font-bold flex items-center gap-0.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
          <span>Pago (Pix)</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0 mt-0.5 font-bold flex items-center gap-0.5">
        <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
        <span>Pago (Manual)</span>
      </Badge>
    );
  }

  if (totalPago > 0) {
    const labelMetodo = tipoMetodo === "credit_card" ? "Cartão" : tipoMetodo === "pix" ? "Pix" : "Manual";
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0 mt-0.5 font-bold">
        Pago ({labelMetodo}): {formatarMoeda(totalPago)}
      </Badge>
    );
  }

  const labelPendente = tipoMetodo === "credit_card" ? "Pendente (Cartão)" : tipoMetodo === "pix" ? "Pendente (Pix)" : "Pendente (Manual)";

  return (
    <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[9px] px-1.5 py-0 mt-0.5">
      {labelPendente}
    </Badge>
  );
}

function obterStatusFinanceiroEncomenda(ord: Encomenda): "pago_integral" | "sinal_pago" | "pendente" {
  const totalPago = calcularTotalPagoEncomenda(ord);
  const statusPag = String(ord.statusPagamento || (ord as any).status_pagamento || "").toLowerCase();
  const isStatusPago =
    statusPag === "pago" ||
    statusPag === "pago_integral" ||
    statusPag === "aprovado" ||
    statusPag === "approved" ||
    statusPag === "paid";

  if (isStatusPago || (totalPago >= ord.valorTotal && ord.valorTotal > 0)) {
    return "pago_integral";
  }
  if (totalPago > 0) {
    return "sinal_pago";
  }
  return "pendente";
}

function obterEstiloCardFinanceiro(status: "pago_integral" | "sinal_pago" | "pendente"): string {
  switch (status) {
    case "pago_integral":
      return "bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 border-t border-r border-b border-green-200 dark:border-green-900/40 shadow-xs hover:border-green-600";
    case "sinal_pago":
      return "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 border-t border-r border-b border-orange-200 dark:border-orange-900/40 shadow-xs hover:border-orange-600";
    case "pendente":
      return "bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 border-t border-r border-b border-red-200 dark:border-red-900/40 shadow-xs hover:border-red-600";
  }
}

function verificarUrgenciaEntrega(dataEntrega?: string, status?: string): "hoje" | "atrasada" | null {
  if (!dataEntrega) return null;
  const statusLower = (status || "").toLowerCase();
  if (statusLower === "entregue" || statusLower === "concluido" || statusLower === "concluida" || statusLower === "cancelada") {
    return null;
  }
  const hoje = new Date().toISOString().split("T")[0];
  if (dataEntrega === hoje) {
    return "hoje";
  }
  if (dataEntrega < hoje) {
    return "atrasada";
  }
  return null;
}

function obterMetodoPagamentoFormatado(ord: Encomenda): string {
  const tipo = identificarMetodoPagamento(ord);
  const metodoRaw = ord.metodoPagamento || ord.metodo_pagamento || (ord as any).forma_pagamento || "";

  if (tipo === "credit_card") {
    if (metodoRaw && (metodoRaw.toLowerCase().includes("cartão") || metodoRaw.toLowerCase().includes("cartao"))) {
      return metodoRaw;
    }
    return "Cartão de Crédito";
  }

  if (tipo === "pix") {
    const origem = ord.origem_pagamento || (ord as any).origem;
    if (origem === "mercadopago" || metodoRaw === "Mercado Pago" || metodoRaw === "pix_mp") {
      return "Pix Automático";
    }
    if (metodoRaw?.toLowerCase().includes("manual") || metodoRaw === "pix_manual") {
      return "Pix Manual";
    }
    return "Pix";
  }

  if (metodoRaw?.toLowerCase().includes("dinheiro")) {
    return "Dinheiro";
  }

  if (metodoRaw) {
    return metodoRaw;
  }

  return "A combinar";
}

function formatarDataHoraCriacao(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${data} às ${hora}`;
  } catch {
    return "";
  }
}

export function OrdersView({
  encomendas: rawEncomendas = [],
  datasBloqueadas,
  despesas = [],
  clientes = [],
  produtos = [],
  estabelecimentoNome = "CaixaDoce",
  onCriarEncomenda,
  onEditarEncomenda,
  onExcluirEncomenda,
  onBloquearData,
  onDesbloquearData,
  onCriarClienteRapido,
  onCriarCliente,
  onEditarCliente,
  onExcluirCliente,
}: OrdersViewProps) {
  const { profile } = useAuth();
  const activeCode = profile?.establishmentCode || "";

  // Hidratação automática de pedidos com origem iFood (extraindo valor total e itens do payload bruto)
  const encomendas = useMemo(() => {
    return (rawEncomendas || []).map((enc) => {
      if (!isPedidoIFood(enc)) return enc;
      const extraidos = extrairDadosIFood(enc);
      const valAtual = Number(enc.valorTotal || 0);
      const valorTotal = (valAtual === 0 && extraidos.valorTotal > 0) ? extraidos.valorTotal : valAtual;
      const itens = (!enc.itens || enc.itens === "[]" || enc.itens === "{}" || enc.itens === "Pedido iFood" || enc.itens.startsWith("Pedido iFood #")) && extraidos.itens ? extraidos.itens : enc.itens;
      const itensDetalhes = (!enc.itensDetalhes || enc.itensDetalhes.length === 0) && extraidos.itensDetalhes.length > 0 ? extraidos.itensDetalhes : enc.itensDetalhes;
      const clienteNome = (!enc.clienteNome || enc.clienteNome === "Cliente iFood" || enc.clienteNome === "Cliente") && extraidos.clienteNome ? extraidos.clienteNome : (enc.clienteNome || "Cliente iFood");
      const clienteWhatsapp = !enc.clienteWhatsapp && extraidos.clienteWhatsapp ? extraidos.clienteWhatsapp : enc.clienteWhatsapp;
      const tipoEntrega = enc.tipoEntrega || extraidos.tipoEntrega || "delivery";

      return {
        ...enc,
        origem: enc.origem || "iFood",
        valorTotal,
        itens,
        itensDetalhes,
        clienteNome,
        clienteWhatsapp,
        tipoEntrega,
      };
    });
  }, [rawEncomendas]);

  // Aba Sub-View: 'pedidos' | 'clientes'
  const [abaSubView, setAbaSubView] = useState<"pedidos" | "clientes">("pedidos");

  // Modos de Visualização: 'lista' | 'concluidos' | 'semana' | 'mes' | 'compras'
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "lista" | "concluidos" | "compras">("lista");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Aba dentro da Lista de Compras: 'hoje' | 'semana' | 'encomenda'
  const [abaCompras, setAbaCompras] = useState<"hoje" | "semana" | "encomenda">("semana");

  // Painel Lateral (Drawer) do Dia Selecionado
  const [selectedDrawerDate, setSelectedDrawerDate] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modais
  const [modalEncomendaOpen, setModalEncomendaOpen] = useState(false);
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado de processamento de ações iFood (Confirmar / Despachar / Cancelar)
  const [processandoAcaoIfood, setProcessandoAcaoIfood] = useState<Record<string, "confirm" | "dispatch" | "cancel" | null>>({});

  const handleAcaoIFood = async (
    ord: Encomenda,
    acao: "confirm" | "dispatch" | "cancel",
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    const orderIfoodId = ord.codigo_pedido_ifood || ord.id;
    if (!orderIfoodId) {
      toast.error("Identificador do pedido iFood não encontrado.");
      return;
    }

    if (acao === "cancel") {
      const confirmou = window.confirm(`Deseja realmente solicitar o cancelamento do pedido iFood #${orderIfoodId}?`);
      if (!confirmou) return;
    }

    setProcessandoAcaoIfood((prev) => ({ ...prev, [ord.id]: acao }));
    try {
      const res = await enviarAcaoIFood(orderIfoodId, acao, ord.estabelecimentoCodigo || activeCode);
      if (res.success) {
        toast.success(res.message || "Ação executada com sucesso no iFood!");
        const novoStatus: StatusEncomenda = acao === "confirm" ? "em_producao" : acao === "dispatch" ? "pronta" : "cancelada";
        await onEditarEncomenda(ord.id, { status: novoStatus });
        if (encomendaDetalhes && encomendaDetalhes.id === ord.id) {
          setEncomendaDetalhes({ ...encomendaDetalhes, status: novoStatus });
        }
      } else {
        toast.error(res.error || "Não foi possível executar a ação no iFood.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao comunicar com o iFood.");
    } finally {
      setProcessandoAcaoIfood((prev) => ({ ...prev, [ord.id]: null }));
    }
  };

  const renderBotoesAcaoIFood = (ord: Encomenda, mode: "desktop" | "mobile" = "desktop") => {
    const acaoAtual = processandoAcaoIfood[ord.id];
    const stAny = ord.status as any;
    const isCancelado = ord.status === "cancelada" || stAny === "cancelado";
    const isEntregue = ord.status === "entregue" || stAny === "concluido" || stAny === "concluida";
    const isProduzindo = ord.status === "em_producao";
    const isPronto = ord.status === "pronta";

    if (mode === "mobile") {
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full pt-1" onClick={(e) => e.stopPropagation()}>
          {/* 1. CONFIRMAR */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(acaoAtual) || isProduzindo || isPronto || isEntregue || isCancelado}
            onClick={(e) => handleAcaoIFood(ord, "confirm", e)}
            title="Confirmar pedido no iFood"
            className="col-span-1 h-8 px-2 text-xs bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 font-bold disabled:opacity-50 flex items-center justify-center gap-1 rounded-xl shadow-2xs"
          >
            {acaoAtual === "confirm" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>Confirmar</span>
          </Button>

          {/* 2. DESPACHAR */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(acaoAtual) || isPronto || isEntregue || isCancelado}
            onClick={(e) => handleAcaoIFood(ord, "dispatch", e)}
            title="Despachar pedido para entrega no iFood"
            className="col-span-1 h-8 px-2 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 font-bold disabled:opacity-50 flex items-center justify-center gap-1 rounded-xl shadow-2xs"
          >
            {acaoAtual === "dispatch" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Truck className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Despachar</span>
          </Button>

          {/* 3. CANCELAR */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={Boolean(acaoAtual) || isCancelado || isEntregue}
            onClick={(e) => handleAcaoIFood(ord, "cancel", e)}
            title="Solicitar cancelamento do pedido no iFood"
            className="col-span-2 h-7 px-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-transparent hover:bg-rose-500/10 border border-rose-500/20 disabled:opacity-40 flex items-center justify-center gap-1 rounded-xl"
          >
            {acaoAtual === "cancel" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Cancelar Pedido</span>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-row items-center justify-end gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
        {/* 1. CONFIRMAR */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(acaoAtual) || isProduzindo || isPronto || isEntregue || isCancelado}
          onClick={(e) => handleAcaoIFood(ord, "confirm", e)}
          title="Confirmar pedido no iFood"
          className="h-7 px-2 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20 font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {acaoAtual === "confirm" ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
          )}
          Confirmar
        </Button>

        {/* 2. DESPACHAR */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(acaoAtual) || isPronto || isEntregue || isCancelado}
          onClick={(e) => handleAcaoIFood(ord, "dispatch", e)}
          title="Despachar pedido para entrega no iFood"
          className="h-7 px-2 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {acaoAtual === "dispatch" ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Truck className="w-3.5 h-3.5 mr-1 text-amber-600" />
          )}
          Despachar
        </Button>

        {/* 3. CANCELAR */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(acaoAtual) || isCancelado || isEntregue}
          onClick={(e) => handleAcaoIFood(ord, "cancel", e)}
          title="Solicitar cancelamento do pedido no iFood"
          className="h-7 px-2 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {acaoAtual === "cancel" ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
          )}
          Cancelar
        </Button>
      </div>
    );
  };

  // Notinhas Vinculadas especificamente por Lista/Encomenda { [shoppingListId]: string[] }
  const [linkedMap, setLinkedMap] = useState<Record<string, string[]>>({});
  const [buscaNotinhaMap, setBuscaNotinhaMap] = useState<Record<string, string>>({});
  const [dropdownAbertoMap, setDropdownAbertoMap] = useState<Record<string, boolean>>({});
  const [notaDetalheSelecionada, setNotaDetalheSelecionada] = useState<DespesaNotaFiscal | null>(null);  // Carregar vinculações de notinha por lista/encomenda (Persistência Local Confiável)
  useEffect(() => {
    const map: Record<string, string[]> = {};
    encomendas.forEach((e) => {
      const localIds = activeCode ? obterNotinhasVinculadasPorLista(e.id, activeCode) : [];
      if (localIds.length > 0) map[e.id] = localIds;
    });
    setLinkedMap(map);
  }, [encomendas, activeCode]);

  // Handlers para Vincular / Desvincular Notinha em Lista Específica
  const handleVincularNotinhaLista = (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    if (atuais.includes(receiptId)) return;

    const novosIds = [...atuais, receiptId];
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    if (activeCode) salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, activeCode);
    setBuscaNotinhaMap((prev) => ({ ...prev, [shoppingListId]: "" }));
    setDropdownAbertoMap((prev) => ({ ...prev, [shoppingListId]: false }));
    toast.success("Notinha vinculada a este pedido!");
  };

  const handleDesvincularNotinhaLista = (shoppingListId: string, receiptId: string) => {
    const atuais = linkedMap[shoppingListId] || [];
    const novosIds = atuais.filter((id) => id !== receiptId);
    setLinkedMap((prev) => ({ ...prev, [shoppingListId]: novosIds }));
    if (activeCode) salvarNotinhasVinculadasPorLista(shoppingListId, novosIds, activeCode);
    toast.success("Notinha desvinculada do pedido!");
  };

  // Sugestões de Notinhas para uma Lista Específica
  const obterSugestoesParaLista = (shoppingListId: string) => {
    const termo = (buscaNotinhaMap[shoppingListId] || "").trim().toLowerCase();
    const vinculadosDaLista = linkedMap[shoppingListId] || [];
    return despesas.filter((d) => {
      if (vinculadosDaLista.includes(d.id)) return false;
      if (!termo) return true;
      const fornecedorMatch = d.fornecedorNome.toLowerCase().includes(termo);
      const dataMatch =
        d.dataCompra.toLowerCase().includes(termo) ||
        d.dataCompra.split("-").reverse().join("/").includes(termo);
      const valorMatch =
        String(d.valorTotal).includes(termo) ||
        formatarMoeda(d.valorTotal).toLowerCase().includes(termo);
      const notaMatch = (d.numeroNota || "").toLowerCase().includes(termo);
      const pedidoMatch = (d.numeroPedido || "").toLowerCase().includes(termo);
      return fornecedorMatch || dataMatch || valorMatch || notaMatch || pedidoMatch;
    }).slice(0, 8);
  };

  // Catálogo de Insumos & Produtos & Clientes
  const catalogoInsumos = useMemo(() => (activeCode ? obterCatalogoInsumos(activeCode) : []), [activeCode]);
  const listaProdutos = useMemo(() => (produtos.length > 0 ? produtos : (activeCode ? obterProdutosCardapio(activeCode) : [])), [produtos, activeCode]);
  const listaClientes = useMemo(() => (clientes.length > 0 ? clientes : (activeCode ? obterClientes(activeCode) : [])), [clientes, activeCode]);

  // Autocomplete de Clientes
  const [dropdownClientesAberto, setDropdownClientesAberto] = useState(false);

  // Tags de Itens do Pedido (Produtos Conectados)
  const [itensTags, setItensTags] = useState<ItemPedidoEncomenda[]>([]);
  const [buscaItemProduto, setBuscaItemProduto] = useState("");
  const [dropdownItensAberto, setDropdownItensAberto] = useState(false);

  // Tags de Insumos (ArtFesta)
  const [insumosTags, setInsumosTags] = useState<InsumoNecessarioPedido[]>([]);
  const [buscaTagInsumo, setBuscaTagInsumo] = useState("");
  const [dropdownInsumosAberto, setDropdownInsumosAberto] = useState(false);

  // Filtros da Lista & Período (Data / Mês)
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "hoje" | "data_especifica" | "mes_atual" | "mes_especifico">("todos");
  const [dataFiltroEspecifica, setDataFiltroEspecifica] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [mesFiltroEspecifico, setMesFiltroEspecifico] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [busca, setBusca] = useState<string>("");
  const [modalRelatorioVendasOpen, setModalRelatorioVendasOpen] = useState(false);

  // Formulário de Encomenda
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEntrega, setHorarioEntrega] = useState("14:00");
  const [valorTotalFormatado, setValorTotalFormatado] = useState("");
  const [taxaEntregaFormatada, setTaxaEntregaFormatada] = useState("");
  const [isOrcamento, setIsOrcamento] = useState(false);
  const [valorEntradaFormatado, setValorEntradaFormatado] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [statusEncomenda, setStatusEncomenda] = useState<StatusEncomenda>("pendente");
  const [observacoes, setObservacoes] = useState("");

  // Personalização Especial (Topo de Bolo & Vela)
  const [temTopoBolo, setTemTopoBolo] = useState(false);
  const [detalhesTopoBolo, setDetalhesTopoBolo] = useState("");
  const [temVela, setTemVela] = useState(false);
  const [detalhesVela, setDetalhesVela] = useState("");

  // Sugestão de Compra Automática de Insumos calculada a partir da Ficha Técnica dos produtos do pedido
  const [sugestaoCompraInsumos, setSugestaoCompraInsumos] = useState<
    Array<{
      insumoNome: string;
      quantidadeTotal: number;
      unidadeMedida: string;
      custoEstimadoTotal: number;
      produtosRelacionados: string[];
    }>
  >([]);

  useEffect(() => {
    async function calcularSugestaoFicha() {
      if (!itensTags || itensTags.length === 0) {
        setSugestaoCompraInsumos([]);
        return;
      }

      const mapaInsumos: Record<
        string,
        {
          insumoNome: string;
          quantidadeTotal: number;
          unidadeMedida: string;
          custoEstimadoTotal: number;
          produtos: Set<string>;
        }
      > = {};

      for (const item of itensTags) {
        const prodId = item.produtoId || listaProdutos.find((p) => p.nome.toLowerCase() === item.nome.toLowerCase())?.id;
        if (!prodId) continue;

        try {
          const itensFicha = activeCode ? await obterFichaTecnicaProduto(activeCode, prodId) : [];
          if (!itensFicha || itensFicha.length === 0) continue;

          const qtdEncomendada = item.quantidade || 1;

          for (const fItem of itensFicha) {
            const key = `${fItem.insumoNome.toLowerCase()}_${fItem.unidadeMedida}`;
            const precoEmb = Number(fItem.precoEmbalagem ?? fItem.precoUnitarioAplicado ?? 0);
            const qtdEmbOrig = Number(fItem.qtdEmbalagemOriginal) > 0 ? Number(fItem.qtdEmbalagemOriginal) : 1;

            // Usa o custoTotalItem já calculado da Ficha Técnica do Produto
            const custoUnitarioInsumo = Number(fItem.custoTotalItem) > 0
              ? Number(fItem.custoTotalItem)
              : calcularCustoItemFichaTecnica(
                  fItem.quantidadeUsada,
                  fItem.unidadeMedida || "g",
                  precoEmb,
                  qtdEmbOrig,
                  fItem.unidadeEmbalagem || fItem.unidadeMedida
                );

            const custoItemTotal = custoUnitarioInsumo * qtdEncomendada;
            const qtdNecessaria = (Number(fItem.quantidadeUsada) || 0) * qtdEncomendada;

            if (!mapaInsumos[key]) {
              mapaInsumos[key] = {
                insumoNome: fItem.insumoNome,
                quantidadeTotal: 0,
                unidadeMedida: fItem.unidadeMedida || "un",
                custoEstimadoTotal: 0,
                produtos: new Set<string>(),
              };
            }

            mapaInsumos[key].quantidadeTotal += qtdNecessaria;
            mapaInsumos[key].custoEstimadoTotal += custoItemTotal;
            mapaInsumos[key].produtos.add(`${item.nome} (${qtdEncomendada}x)`);
          }
        } catch {}
      }

      const resultado = Object.values(mapaInsumos).map((m) => ({
        insumoNome: m.insumoNome,
        quantidadeTotal: m.quantidadeTotal,
        unidadeMedida: m.unidadeMedida,
        custoEstimadoTotal: parseFloat(m.custoEstimadoTotal.toFixed(2)),
        produtosRelacionados: Array.from(m.produtos),
      }));

      setSugestaoCompraInsumos(resultado);
    }

    calcularSugestaoFicha();
  }, [itensTags, listaProdutos]);

  const handleCopiarListaSugestaoInsumos = () => {
    if (sugestaoCompraInsumos.length === 0) {
      toast.warning("Nenhum insumo sugerido para copiar.");
      return;
    }

    const identificador = clienteNome.trim() || (editingId ? `Pedido #${editingId.slice(0, 6)}` : "Novo Pedido");
    const linhas = sugestaoCompraInsumos.map((sug) => {
      return `- ${sug.quantidadeTotal}${sug.unidadeMedida}: ${sug.insumoNome}`;
    });

    const textoFormatado = `🛒 *Lista de Insumos - Pedido [${identificador}]*\n${linhas.join("\n")}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textoFormatado)
        .then(() => {
          toast.success("Lista copiada para a área de transferência!");
        })
        .catch(() => {
          const el = document.createElement("textarea");
          el.value = textoFormatado;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
          toast.success("Lista copiada para a área de transferência!");
        });
    } else {
      toast.success("Lista copiada para a área de transferência!");
    }
  };

  // Modal de Seleção Rápida de Conta Pix no momento do Envio
  const [modalSelecaoPixOpen, setModalSelecaoPixOpen] = useState(false);
  const [encomendaParaEnvioPix, setEncomendaParaEnvioPix] = useState<Encomenda | null>(null);

  // Modal de Detalhes do Pedido (Somente Leitura)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [encomendaDetalhes, setEncomendaDetalhes] = useState<Encomenda | null>(null);
  const [receitaConsolidadaPedido, setReceitaConsolidadaPedido] = useState<InsumoConsolidado[]>([]);
  const [fotoExpandidaModalUrl, setFotoExpandidaModalUrl] = useState<string | null>(null);

  const extrairFotosReferenciaPedido = useCallback((ord: Encomenda | null): string[] => {
    if (!ord) return [];
    const fotos: string[] = [];
    const rawOrd = ord as any;
    if (rawOrd.foto_url && typeof rawOrd.foto_url === "string") fotos.push(rawOrd.foto_url);
    if (rawOrd.fotoUrl && typeof rawOrd.fotoUrl === "string") fotos.push(rawOrd.fotoUrl);
    if (rawOrd.foto_referencia && typeof rawOrd.foto_referencia === "string") fotos.push(rawOrd.foto_referencia);
    if (rawOrd.imagem_referencia && typeof rawOrd.imagem_referencia === "string") fotos.push(rawOrd.imagem_referencia);

    if (Array.isArray(ord.itensDetalhes)) {
      for (const it of ord.itensDetalhes) {
        if (it.fotoUrl && typeof it.fotoUrl === "string") fotos.push(it.fotoUrl);
        if (it.foto_url && typeof it.foto_url === "string") fotos.push(it.foto_url);
        if (it.referenceImage && typeof it.referenceImage === "string") fotos.push(it.referenceImage);
        if (it.imagem_referencia && typeof it.imagem_referencia === "string") fotos.push(it.imagem_referencia);
      }
    }

    const textoCombinado = `${ord.observacoes || ""} ${ord.itens || ""}`;
    const urlRegex = /(https?:\/\/[^\s<"']+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s<"']*)?|data:image\/[a-zA-Z]+;base64,[^\s<"']+)/gi;
    let match;
    while ((match = urlRegex.exec(textoCombinado)) !== null) {
      if (match[0]) fotos.push(match[0]);
    }

    return Array.from(new Set(fotos.map((f) => f.trim()).filter(Boolean)));
  }, []);

  const handleAbrirDetalhes = async (ord: Encomenda) => {
    setEncomendaDetalhes(ord);
    setModalDetalhesOpen(true);
    try {
      const res = await consolidarReceitasEncomendas(activeCode, [ord], produtos);
      setReceitaConsolidadaPedido(res);
    } catch {
      setReceitaConsolidadaPedido([]);
    }
  };

  // Histórico de Pagamentos Recebidos (Mini histórico)
  const [historicoPagamentos, setHistoricoPagamentos] = useState<PagamentoItem[]>([]);
  const [novoPagamentoValorFormatado, setNovoPagamentoValorFormatado] = useState("");
  const [novoPagamentoData, setNovoPagamentoData] = useState(() => new Date().toISOString().split("T")[0]);
  const [novoPagamentoForma, setNovoPagamentoForma] = useState("Pix");
  const [novoPagamentoStatus, setNovoPagamentoStatus] = useState<"pago" | "pendente">("pago");
  const [novoPagamentoDataEfetiva, setNovoPagamentoDataEfetiva] = useState(() => new Date().toISOString().split("T")[0]);
  const [mostrarFormNovoPagamento, setMostrarFormNovoPagamento] = useState(false);

  // Modal para Marcar como Pago com confirmação de Data Efetiva
  const [modalMarcarPagoOpen, setModalMarcarPagoOpen] = useState(false);
  const [itemMarcarPagoTarget, setItemMarcarPagoTarget] = useState<PagamentoItem | null>(null);
  const [dataEfetivaMarcarPago, setDataEfetivaMarcarPago] = useState(() => new Date().toISOString().split("T")[0]);

  const totalPagoCalculado = useMemo(() => {
    return historicoPagamentos.reduce((sum, item) => {
      const isPaid = item.pago === true || item.is_paid === true || item.status === "pago";
      return isPaid ? sum + (Number(item.valor) || 0) : sum;
    }, 0);
  }, [historicoPagamentos]);

  const valorTotalNum = useMemo(() => {
    return converterMoedaInputParaNumero(valorTotalFormatado);
  }, [valorTotalFormatado]);

  const saldoDevedorCalculado = useMemo(() => {
    return Math.max(0, valorTotalNum - totalPagoCalculado);
  }, [valorTotalNum, totalPagoCalculado]);

  const primeiraParcelaEntradaQuitada = useMemo(() => {
    const primeira = historicoPagamentos.find((p) => p.isEntrada) || historicoPagamentos[0];
    if (!primeira) return false;
    return primeira.pago === true || primeira.is_paid === true || primeira.status === "pago";
  }, [historicoPagamentos]);

  const handleAdicionarPagamentoHistorico = () => {
    const val = converterMoedaInputParaNumero(novoPagamentoValorFormatado);
    if (val <= 0) {
      toast.error("Informe um valor maior que R$ 0,00 para registrar o pagamento.");
      return;
    }
    if (!novoPagamentoData) {
      toast.error("Informe a data prevista/acordada do pagamento.");
      return;
    }

    const isEntrada = historicoPagamentos.length === 0;
    const isPaid = novoPagamentoStatus === "pago";
    const novoItem: PagamentoItem = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      data: novoPagamentoData,
      valor: val,
      formaPagamento: novoPagamentoForma,
      status: isPaid ? "pago" : "pendente",
      pago: isPaid,
      is_paid: isPaid,
      dataEfetiva: isPaid ? (novoPagamentoDataEfetiva || novoPagamentoData) : undefined,
      data_pagamento: isPaid ? (novoPagamentoDataEfetiva || novoPagamentoData) : null,
      isEntrada,
    };

    setHistoricoPagamentos((prev) => [...prev, novoItem]);
    setNovoPagamentoValorFormatado("");
    setNovoPagamentoStatus("pago");
    toast.success(`Pagamento de ${formatarMoeda(val)} (${isPaid ? "Pago" : "Pendente"}) adicionado!`);
  };

  const handleRemoverPagamentoHistorico = (id: string) => {
    setHistoricoPagamentos((prev) => prev.filter((p) => p.id !== id));
    toast.info("Pagamento removido do histórico.");
  };

  const handleAbrirMarcarComoPago = (pag: PagamentoItem) => {
    setItemMarcarPagoTarget(pag);
    setDataEfetivaMarcarPago(new Date().toISOString().split("T")[0]);
    setModalMarcarPagoOpen(true);
  };

  const handleConfirmarMarcarComoPago = () => {
    if (!itemMarcarPagoTarget) return;
    const dataEf = dataEfetivaMarcarPago || new Date().toISOString().split("T")[0];
    setHistoricoPagamentos((prev) =>
      prev.map((p) =>
        p.id === itemMarcarPagoTarget.id
          ? {
              ...p,
              status: "pago",
              pago: true,
              is_paid: true,
              dataEfetiva: dataEf,
              data_pagamento: dataEf,
            }
          : p
      )
    );
    setModalMarcarPagoOpen(false);
    setItemMarcarPagoTarget(null);
    toast.success("Pagamento marcado como Pago!");
  };

  const handleReverterPagamento = (pag: PagamentoItem) => {
    if (confirm("Deseja reverter este pagamento para a condição 'Pendente'?")) {
      setHistoricoPagamentos((prev) =>
        prev.map((p) =>
          p.id === pag.id
            ? {
                ...p,
                status: "pendente",
                pago: false,
                is_paid: false,
                dataEfetiva: undefined,
                data_pagamento: null,
              }
            : p
        )
      );
      toast.info("Pagamento revertido para Pendente.");
    }
  };

  // Gerador de Orçamento Completo em PDF A4 (com assinatura, rodapé e integração WhatsApp)
  const handleGerarOrcamentoPDF = (ord: Encomenda) => {
    // Abre a janela de documento A4 formatada com suporte a Impressão/PDF e WhatsApp
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      toast.error("Permita pop-ups no navegador para visualizar o orçamento em PDF.");
      return;
    }

    const estNome = profile?.establishmentName || estabelecimentoNome || "CaixaDoce Confeitaria";
    const estEnd = profile?.establishmentAddress || (
      [profile?.logradouro, profile?.numero, profile?.bairro, profile?.cidade && profile?.estado ? `${profile.cidade}/${profile.estado}` : "", profile?.cep ? `CEP: ${profile.cep}` : ""]
        .filter(Boolean).join(", ")
    ) || "";
    const estTel = profile?.whatsapp || profile?.telefone || "";
    const numPedido = ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood || ord.id.slice(-6).toUpperCase();
    const isOrc = ord.is_orcamento || (ord as any).origem_pagamento === "orcamento" || (ord as any).metodo_pagamento === "Orçamento";
    const tituloDoc = isOrc ? "ORÇAMENTO DE ENCOMENDA" : "COMPROVANTE DE PEDIDO / ORÇAMENTO";

    const totalPago = calcularTotalPagoEncomenda(ord);
    const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
    const formaPagto = obterMetodoPagamentoFormatado(ord);
    const dataEntregaFmt = ord.dataEntrega ? ord.dataEntrega.split("-").reverse().join("/") : "A combinar";
    const horaEntregaFmt = ord.horarioEntrega || "14:00";

    const itemsRowsHtml = ord.itensDetalhes && ord.itensDetalhes.length > 0
      ? ord.itensDetalhes.map((it: any) => {
          const opcaoNome =
            (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
              ? it.opcoes_selecionadas
                  .map((o: any) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
                  .join(", ")
              : null) ||
            it.opcaoNome ||
            it.opcao_selecionada?.nome;
          const qtd = it.quantidade || 1;
          const precoUnit = it.precoUnitario ?? it.preco ?? it.valorUnitario ?? 0;
          const subtotal = it.subtotal ?? (precoUnit * qtd);

          return `
            <tr>
              <td style="text-align: center; font-weight: bold;">${qtd}x</td>
              <td>
                <div style="font-weight: bold; color: #1e293b;">${it.nome}</div>
                ${opcaoNome ? `<div style="font-size: 11px; color: #7c3aed; margin-top: 2px;">• Sabores: ${opcaoNome}</div>` : ""}
              </td>
              <td style="text-align: right; font-family: monospace;">${precoUnit > 0 ? formatarMoeda(precoUnit) : "-"}</td>
              <td style="text-align: right; font-weight: bold; font-family: monospace;">${subtotal > 0 ? formatarMoeda(subtotal) : "-"}</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td style="text-align: center; font-weight: bold;">1x</td>
          <td>${ord.itens || "Itens do orçamento"}</td>
          <td style="text-align: right; font-family: monospace;">${formatarMoeda(ord.valorTotal)}</td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">${formatarMoeda(ord.valorTotal)}</td>
        </tr>
      `;

    const htmlA4Content = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Orçamento #${numPedido} - ${ord.clienteNome}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
            font-size: 13px;
            line-height: 1.5;
          }
          .no-print {
            max-width: 210mm;
            margin: 0 auto 16px auto;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
          .no-print button {
            padding: 10px 18px;
            font-weight: bold;
            font-size: 13px;
            border-radius: 10px;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .btn-pdf { background: #7c3aed; color: #fff; }
          .btn-close { background: #e2e8f0; color: #334155; }
          
          .a4-container {
            width: 210mm;
            min-height: 270mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; padding: 0; }
            .a4-container {
              box-shadow: none;
              border: none;
              width: 100%;
              padding: 0;
              margin: 0;
            }
          }
          .header-banner {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: #ffffff;
            padding: 18px 24px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .header-banner h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-banner p { font-size: 12px; opacity: 0.9; }
          .header-badge {
            background: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 8px;
            text-align: right;
            font-size: 12px;
            font-weight: bold;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
          }
          .info-card h3 {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          .info-card p { font-size: 12.5px; margin-bottom: 4px; }
          .info-card strong { color: #0f172a; }

          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          table.items-table th {
            background: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 10px 12px;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 800;
            border-bottom: 2px solid #cbd5e1;
          }
          table.items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12.5px;
          }
          table.items-table tr:nth-child(even) { background: #fafafa; }

          .obs-box {
            background: #fcf5ff;
            border: 1px solid #f0abfc;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .obs-box strong { color: #86198f; }

          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-card {
            width: 280px;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 10px;
            padding: 16px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12.5px;
          }
          .totals-row.final {
            font-size: 16px;
            font-weight: 900;
            color: #5b21b6;
            border-top: 1px solid #c4b5fd;
            padding-top: 8px;
            margin-top: 6px;
          }

          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 60px;
            padding-top: 20px;
          }
          .sig-box {
            text-align: center;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 6px;
          }
          .sig-name { font-weight: bold; font-size: 12px; color: #334155; }
          .sig-role { font-size: 10.5px; color: #64748b; }

          .doc-footer {
            text-align: center;
            margin-top: 30px;
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-pdf" onclick="window.print()">📄 Salvar como PDF / Imprimir</button>
          <button class="btn-close" onclick="window.close()">Fechar</button>
        </div>

        <div class="a4-container">
          <div class="header-banner">
            <div>
              <h1>${estNome}</h1>
              <p>${tituloDoc}</p>
            </div>
            <div class="header-badge">
              <div>PEDIDO #${numPedido}</div>
              <div style="font-weight: normal; font-size: 11px;">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="info-card">
              <h3>DADOS DO ESTABELECIMENTO</h3>
              <p><strong>Loja:</strong> ${estNome}</p>
              ${estEnd ? `<p><strong>Endereço:</strong> ${estEnd}</p>` : ""}
              ${estTel ? `<p><strong>Contato / WhatsApp:</strong> ${estTel}</p>` : ""}
            </div>

            <div class="info-card">
              <h3>DADOS DO CLIENTE &amp; ENTREGA</h3>
              <p><strong>Cliente:</strong> ${ord.clienteNome}</p>
              ${ord.clienteWhatsapp ? `<p><strong>WhatsApp:</strong> ${ord.clienteWhatsapp}</p>` : ""}
              <p><strong>Data de Entrega:</strong> ${dataEntregaFmt} às ${horaEntregaFmt}</p>
              <p><strong>Modalidade:</strong> ${ord.tipoEntrega === "delivery" ? "🚚 Delivery / Entrega" : "🏬 Retirada no Balcão"}</p>
              ${ord.tipoEntrega === "delivery" && ord.enderecoEntrega ? `<p><strong>Endereço de Entrega:</strong> ${ord.enderecoEntrega}</p>` : ""}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Qtd</th>
                <th>Descrição do Item</th>
                <th style="width: 110px; text-align: right;">Valor Unit.</th>
                <th style="width: 110px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          ${(ord.temTopoBolo || ord.temVela || ord.observacoes) ? `
            <div class="obs-box">
              ${(ord.temTopoBolo || ord.temVela) ? `
                <p style="margin-bottom: 4px;"><strong>✨ Personalização Especial:</strong> ${ord.temTopoBolo ? `🎂 Topo (${ord.detalhesTopoBolo || "Sim"}) ` : ""} ${ord.temVela ? `🕯️ Vela (${ord.detalhesVela || "Sim"})` : ""}</p>
              ` : ""}
              ${ord.observacoes ? `<p><strong>📝 Observações:</strong> ${ord.observacoes}</p>` : ""}
            </div>
          ` : ""}

          <div class="totals-section">
            <div class="totals-card">
              ${ord.taxaEntrega && Number(ord.taxaEntrega) > 0 ? `
                <div class="totals-row">
                  <span>Taxa de Entrega:</span>
                  <span style="font-family: monospace;">${formatarMoeda(Number(ord.taxaEntrega))}</span>
                </div>
              ` : ""}
              <div class="totals-row final">
                <span>TOTAL:</span>
                <span style="font-family: monospace;">${formatarMoeda(ord.valorTotal)}</span>
              </div>
              <div class="totals-row" style="margin-top: 8px;">
                <span>Forma de Pagto:</span>
                <strong>${formaPagto}</strong>
              </div>
              <div class="totals-row">
                <span>Total Quitado:</span>
                <span style="font-family: monospace;">${formatarMoeda(totalPago)}</span>
              </div>
              <div class="totals-row" style="font-weight: bold; margin-top: 4px; color: ${saldoRestante > 0 ? '#e11d48' : '#16a34a'};">
                <span>${saldoRestante > 0 ? "Saldo Restante:" : "Situação:"}</span>
                <span style="font-family: monospace;">${saldoRestante > 0 ? formatarMoeda(saldoRestante) : "PAGO INTEGRALMENTE"}</span>
              </div>
            </div>
          </div>

          <div class="signatures-grid">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-name">${estNome}</div>
              <div class="sig-role">Assinatura do Responsável</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-name">${ord.clienteNome}</div>
              <div class="sig-role">Assinatura do Cliente</div>
            </div>
          </div>

          <div class="doc-footer">
            Agradecemos imensamente pela preferência! — CaixaDoce Gestão Inteligente
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlA4Content);
    printWindow.document.close();
  };

  // Gerador de Impressão de Comanda / Cupom Térmico (80mm / 58mm)
  const handleGerarPdfOrcamento = (ord: Encomenda) => {
    const printWindow = window.open("", "_blank", "width=420,height=700");
    if (!printWindow) {
      toast.error("Permita pop-ups no seu navegador para imprimir a comanda do pedido.");
      return;
    }

    const estNome = profile?.establishmentName || estabelecimentoNome || "CaixaDoce Confeitaria";
    const estEnd = profile?.establishmentAddress || (
      [profile?.logradouro, profile?.numero, profile?.bairro, profile?.cidade && profile?.estado ? `${profile.cidade}/${profile.estado}` : "", profile?.cep ? `CEP: ${profile.cep}` : ""]
        .filter(Boolean).join(", ")
    ) || "";
    const estTel = profile?.whatsapp || profile?.telefone || "";

    const totalPago = calcularTotalPagoEncomenda(ord);
    const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
    const formaPagto = obterMetodoPagamentoFormatado(ord);
    const dataEntregaFmt = ord.dataEntrega ? ord.dataEntrega.split("-").reverse().join("/") : "A combinar";
    const horaEntregaFmt = ord.horarioEntrega || "14:00";
    const numPedido = ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood || ord.id.slice(-6).toUpperCase();

    const itemsHtml = ord.itensDetalhes && ord.itensDetalhes.length > 0
      ? ord.itensDetalhes.map((it: any) => {
          const opcaoNome =
            (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
              ? it.opcoes_selecionadas
                  .map((o: any) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
                  .join(", ")
              : null) ||
            it.opcaoNome ||
            it.opcao_selecionada?.nome;
          const qtd = it.quantidade || 1;
          const subtotal = it.subtotal ?? ((it.precoUnitario || it.preco || 0) * qtd);

          return `
            <div class="item-block">
              <div class="item-main">
                <span class="item-name"><strong>${qtd}x</strong> ${it.nome}</span>
                <span class="item-val">${subtotal > 0 ? formatarMoeda(subtotal) : ""}</span>
              </div>
              ${opcaoNome ? `<div class="item-sub">Sabores: ${opcaoNome}</div>` : ""}
            </div>
          `;
        }).join("")
      : `
        <div class="item-block">
          <div class="item-main">
            <span class="item-name">${ord.itens || "Itens diversos"}</span>
          </div>
        </div>
      `;

    const hist = ord.historicoPagamentos || ord.paymentsHistory || [];
    const histHtml = hist.length > 0 ? `
      <div class="divider"></div>
      <div class="section-title">HISTÓRICO DE PAGAMENTOS</div>
      ${hist.map((pag, idx) => {
        const isPaid = pag.pago === true || pag.is_paid === true || pag.status === "pago";
        const rotulo = pag.isEntrada || idx === 0 ? "Entrada/Sinal" : `Parcela ${idx + 1}`;
        return `
          <div class="row text-xs">
            <span>${rotulo} (${pag.formaPagamento || "Pix"}):</span>
            <span><strong>${formatarMoeda(pag.valor)}</strong> [${isPaid ? "PAGO" : "PENDENTE"}]</span>
          </div>
        `;
      }).join("")}
    ` : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comanda #${numPedido} - ${ord.clienteNome}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px 8px 30px 8px;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: flex;
            gap: 6px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ccc;
          }
          .no-print button {
            flex: 1;
            padding: 8px 12px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
          }
          .btn-print {
            background: #000;
            color: #fff;
            border: 1px solid #000;
          }
          .btn-close {
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 4px 6px 12px 6px !important;
            }
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .divider-solid {
            border-top: 1px solid #000;
            margin: 6px 0;
          }
          .divider-double {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-bold { font-weight: bold; }
          .text-xs { font-size: 11px; }
          .store-name {
            font-size: 15px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .store-info {
            font-size: 10px;
            text-align: center;
            margin-top: 2px;
          }
          .cupom-header {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 4px 0 2px 0;
            text-transform: uppercase;
          }
          .section-title {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .item-block {
            margin-bottom: 5px;
          }
          .item-main {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .item-name {
            flex: 1;
            padding-right: 6px;
            word-break: break-word;
          }
          .item-val {
            white-space: nowrap;
            font-weight: bold;
          }
          .item-sub {
            font-size: 10.5px;
            padding-left: 10px;
            margin-top: 1px;
            word-break: break-word;
          }
          .total-highlight {
            font-size: 14px;
            font-weight: 900;
            margin: 4px 0;
          }
          .obs-box {
            font-size: 11px;
            word-break: break-word;
            margin-top: 2px;
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            margin-top: 12px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir Comanda</button>
          <button class="btn-close" onclick="window.close()">Fechar</button>
        </div>

        <div class="store-name">${estNome}</div>
        ${estEnd ? `<div class="store-info">${estEnd}</div>` : ""}
        ${estTel ? `<div class="store-info">WhatsApp / Tel: ${estTel}</div>` : ""}

        <div class="divider"></div>

        <div class="cupom-header">*** COMPROVANTE DE PEDIDO ***</div>
        <div class="row">
          <span><strong>PEDIDO: #${numPedido}</strong></span>
          <span>${isPedidoIFood(ord) ? "iFood" : "Cardápio"}</span>
        </div>
        <div class="row text-xs">
          <span>Emissão:</span>
          <span>${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <div class="divider"></div>

        <div class="section-title">DADOS DO CLIENTE &amp; ENTREGA</div>
        <div class="row">
          <span>Cliente:</span>
          <span><strong>${ord.clienteNome}</strong></span>
        </div>
        ${ord.clienteWhatsapp ? `
          <div class="row">
            <span>WhatsApp:</span>
            <span>${ord.clienteWhatsapp}</span>
          </div>
        ` : ""}
        <div class="row">
          <span>Tipo:</span>
          <span><strong>${ord.tipoEntrega === "delivery" ? "DELIVERY / ENTREGA" : "RETIRADA NO BALCÃO"}</strong></span>
        </div>
        <div class="row">
          <span>Data/Hora:</span>
          <span><strong>${dataEntregaFmt} às ${horaEntregaFmt}</strong></span>
        </div>
        ${ord.tipoEntrega === "delivery" && ord.enderecoEntrega ? `
          <div class="row">
            <span>Endereço:</span>
            <span style="text-align: right; max-width: 65%;"><strong>${ord.enderecoEntrega}</strong></span>
          </div>
        ` : ""}

        <div class="divider"></div>

        <div class="section-title">ITENS DO PEDIDO</div>
        ${itemsHtml}

        ${(ord.temTopoBolo || ord.temVela) ? `
          <div class="divider"></div>
          <div class="section-title">PERSONALIZAÇÃO ESPECIAL</div>
          ${ord.temTopoBolo ? `<div class="row text-xs"><span>🎂 Topo de Bolo:</span><span>${ord.detalhesTopoBolo || "Sim"}</span></div>` : ""}
          ${ord.temVela ? `<div class="row text-xs"><span>🕯️ Vela:</span><span>${ord.detalhesVela || "Sim"}</span></div>` : ""}
        ` : ""}

        ${ord.observacoes ? `
          <div class="divider"></div>
          <div class="section-title">OBSERVAÇÕES</div>
          <div class="obs-box">${ord.observacoes}</div>
        ` : ""}

        <div class="divider-solid"></div>

        ${ord.taxaEntrega !== undefined && Number(ord.taxaEntrega) > 0 ? `
          <div class="row text-xs">
            <span>Subtotal Produtos:</span>
            <span>${formatarMoeda(ord.valorTotal - Number(ord.taxaEntrega))}</span>
          </div>
          <div class="row text-xs">
            <span>Taxa de Entrega:</span>
            <span>${formatarMoeda(Number(ord.taxaEntrega))}</span>
          </div>
        ` : ""}

        <div class="row total-highlight">
          <span>TOTAL DO PEDIDO:</span>
          <span>${formatarMoeda(ord.valorTotal)}</span>
        </div>

        <div class="row">
          <span>Forma de Pagto:</span>
          <span><strong>${formaPagto}</strong></span>
        </div>
        <div class="row text-xs">
          <span>Total Pago:</span>
          <span>${formatarMoeda(totalPago)}</span>
        </div>
        ${saldoRestante > 0 ? `
          <div class="row text-bold" style="color: #000;">
            <span>A PAGAR NA ENTREGA:</span>
            <span>${formatarMoeda(saldoRestante)}</span>
          </div>
        ` : `
          <div class="row text-bold">
            <span>SITUAÇÃO:</span>
            <span>PAGO INTEGRALMENTE</span>
          </div>
        `}

        ${histHtml}

        <div class="divider-double"></div>

        <div class="footer-note">
          OBRIGADO PELA PREFERÊNCIA!<br/>
          ${estNome}
        </div>
        <div style="height: 18px;"></div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const gerarPdfOrcamento = (ord: Encomenda, _nomeLoja?: string) => handleGerarPdfOrcamento(ord);

  // Formulário de Bloqueio de Data
  const [dataBloqueio, setDataBloqueio] = useState(new Date().toISOString().split("T")[0]);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Agenda Lotada");

  // Sugestões de Clientes
  const sugestoesClientes = useMemo(() => {
    const termo = clienteNome.trim().toLowerCase();
    if (!termo) return [];
    return listaClientes.filter(
      (c) => c.nome.toLowerCase().includes(termo) || c.whatsapp.includes(termo)
    ).slice(0, 5);
  }, [clienteNome, listaClientes]);

  // Sugestões de Produtos para Itens do Pedido (com logs de diagnóstico)
  const sugestoesProdutos = useMemo(() => {
    const termo = buscaItemProduto.trim().toLowerCase();
    if (!termo) return [];

    const result = listaProdutos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || (p.categoria && p.categoria.toLowerCase().includes(termo))
    ).slice(0, 10);

    return result;
  }, [buscaItemProduto, listaProdutos]);

  useEffect(() => {
    console.log("[OrdersView Autocomplete] Produtos do cardápio recebidos/carregados:", listaProdutos.length, listaProdutos);
  }, [listaProdutos]);

  const defaultInsumosTags = useMemo(
    () => [
      "Pão", "Pão de Queijo", "Banana", "Cenoura", "Beterraba", "Abobrinha", "Salsinha", 
      "Pão de Sal", "Torrada", "Manteiga", "Azeite", "Queijo Ralado", "Macarrão", "Milho", 
      "Sabão Líquido", "Amaciante", "Detergente", "Coxinha", "Batata", "Morango", "Uva", 
      "Nozes", "Avelã", "Maracujá", "Limão", "Coco", "Pêssego", "Frutas Vermelhas", 
      "Framboesa", "Amora", "Mirtilo", "Óleo", "Cebola", "Curry", "Vinagre", "Vinagre Branco", 
      "Mel", "Pêra", "Ameixa Seca", "Iogurte", "Tomate", "Frango", "Camarões", "Abóbora", 
      "Alho-Poró", "Azeitona", "Tâmara", "Passas", "Manga", "Farinha"
    ],
    []
  );

  // Sugestões de Insumos (Catálogo + Opções Padrão)
  const sugestoesInsumos = useMemo(() => {
    const termo = buscaTagInsumo.trim().toLowerCase();
    if (!termo) return [];

    const insumosBase: Array<{ id: string; nome: string; categoria: string }> = [
      ...catalogoInsumos.map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria || "Insumo" })),
      ...defaultInsumosTags.map((nome) => ({
        id: `def_${nome}`,
        nome,
        categoria: "Sugestão Padrão",
      })),
    ];

    const nomesJaSelecionados = new Set(insumosTags.map((t) => t.nome.toLowerCase()));
    const unicosDisponiveis = insumosBase.filter(
      (ins, index, self) =>
        !nomesJaSelecionados.has(ins.nome.toLowerCase()) &&
        index === self.findIndex((t) => t.nome.toLowerCase() === ins.nome.toLowerCase())
    );

    return unicosDisponiveis
      .filter(
        (i) => i.nome.toLowerCase().includes(termo) || i.categoria.toLowerCase().includes(termo)
      )
      .slice(0, 10);
  }, [buscaTagInsumo, catalogoInsumos, insumosTags, defaultInsumosTags]);

  // Selecionar Cliente Existente
  const handleSelecionarCliente = (cli: Cliente) => {
    setClienteId(cli.id);
    setClienteNome(cli.nome);
    setClienteWhatsapp(aplicarMascaraTelefone(cli.whatsapp));
    if (cli.endereco) {
      setEnderecoEntrega(cli.endereco);
    }
    setDropdownClientesAberto(false);
  };

  // Manipulação de Itens Pedidos (Tags de Produtos)
  const handleAdicionarItemPedido = (nomeItem: string, precoSugerido?: number, produtoId?: string) => {
    const nomeLimpo = nomeItem.trim();
    if (!nomeLimpo) return;

    // Se o usuário digitou sem selecionar do dropdown, buscar no cardápio se existe um produto correspondente
    const prodMatch =
      precoSugerido !== undefined && precoSugerido > 0
        ? null
        : listaProdutos.find((p) => p.nome.toLowerCase() === nomeLimpo.toLowerCase());

    const precoFinal =
      precoSugerido !== undefined && precoSugerido > 0
        ? precoSugerido
        : prodMatch
        ? prodMatch.preco
        : 0;

    const prodIdFinal = produtoId || (prodMatch ? prodMatch.id : undefined);

    const existente = itensTags.find((it) => it.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existente) {
      setItensTags((prev) =>
        prev.map((it) =>
          it.id === existente.id
            ? { ...it, quantidade: it.quantidade + 1, precoUnitario: it.precoUnitario || precoFinal }
            : it
        )
      );
    } else {
      const novoItem: ItemPedidoEncomenda = {
        id: crypto.randomUUID(),
        produtoId: prodIdFinal,
        nome: nomeLimpo,
        quantidade: 1,
        precoUnitario: precoFinal,
      };
      setItensTags((prev) => [...prev, novoItem]);
    }

    setBuscaItemProduto("");
    setDropdownItensAberto(false);
  };

  const handleAlterarQuantidadeItem = (itemId: string, novaQtd: number) => {
    const qtdSegura = isNaN(novaQtd) ? 0 : Math.max(0, novaQtd);
    setItensTags((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantidade: qtdSegura } : it))
    );
  };

  const handleAlterarPrecoUnitarioItem = (itemId: string, novoPreco: number) => {
    const precoSeguro = isNaN(novoPreco) ? 0 : Math.max(0, novoPreco);
    setItensTags((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, precoUnitario: precoSeguro } : it))
    );
  };

  // Reatividade Automática: Recalcula Valor Total em tempo real sempre que itensTags mudar
  useEffect(() => {
    const totalCalculadoItens = itensTags.reduce(
      (acc, it) => acc + (it.quantidade || 0) * (it.precoUnitario || 0),
      0
    );
    setValorTotalFormatado(aplicarMascaraMoedaInput(String(Math.round(totalCalculadoItens * 100))));
  }, [itensTags]);

  const handleRemoverItemPedido = (itemId: string) => {
    setItensTags((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Manipulação de Insumos (ArtFesta)
  const handleAdicionarInsumo = (nomeInsumo: string) => {
    const nomeLimpo = nomeInsumo.trim();
    if (!nomeLimpo) return;

    if (insumosTags.some((t) => t.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      toast.info("Este insumo já foi adicionado.");
      setBuscaTagInsumo("");
      setDropdownInsumosAberto(false);
      return;
    }

    const novaTag: InsumoNecessarioPedido = {
      id: crypto.randomUUID(),
      nome: nomeLimpo,
      quantidade: 1,
      comprado: false,
    };

    setInsumosTags((prev) => [...prev, novaTag]);
    if (activeCode) salvarNovoInsumoCatalogo(activeCode, nomeLimpo);
    setBuscaTagInsumo("");
    setDropdownInsumosAberto(false);
  };

  const handleAlterarQuantidadeInsumo = (tagId: string, novaQtd: number | string) => {
    setInsumosTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, quantidade: novaQtd } : t))
    );
  };

  const handleRemoverInsumo = (tagId: string) => {
    setInsumosTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  // Reset Limpo e Completo de Todos os Estados do Formulário de Encomenda (Evita State Leak)
  const resetFormularioEncomenda = () => {
    setEditingId(null);
    setClienteId(undefined);
    setClienteNome("");
    setClienteWhatsapp("");
    setDataEntrega(new Date().toISOString().split("T")[0]);
    setHorarioEntrega("14:00");
    setItensTags([]);
    setValorTotalFormatado("");
    setTaxaEntregaFormatada("");
    setIsOrcamento(false);
    setValorEntradaFormatado("");
    setHistoricoPagamentos([]);
    setNovoPagamentoValorFormatado("");
    setNovoPagamentoData(new Date().toISOString().split("T")[0]);
    setMostrarFormNovoPagamento(false);
    setInsumosTags([]);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setDropdownClientesAberto(false);
    setDropdownItensAberto(false);
    setDropdownInsumosAberto(false);
    setTipoEntrega("retirada");
    setEnderecoEntrega("");
    setStatusEncomenda("pendente");
    setObservacoes("");
    setTemTopoBolo(false);
    setDetalhesTopoBolo("");
    setTemVela(false);
    setDetalhesVela("");
  };

  // Abrir Modal de Criação (Garante Reset de Estado Completo)
  const handleAbrirNovaEncomenda = (dataPredefinida?: string) => {
    resetFormularioEncomenda();
    if (dataPredefinida) {
      setDataEntrega(dataPredefinida);
    }
    setModalEncomendaOpen(true);
  };

  // Abrir Modal de Edição
  const handleAbrirEdicao = (ord: Encomenda) => {
    setEditingId(ord.id);
    setClienteId(ord.clienteId);
    setClienteNome(ord.clienteNome);
    setClienteWhatsapp(aplicarMascaraTelefone(ord.clienteWhatsapp));
    setDataEntrega(ord.dataEntrega);
    setHorarioEntrega(ord.horarioEntrega || "14:00");
    setStatusEncomenda(ord.status || "pendente");
    setIsOrcamento(Boolean(ord.is_orcamento || (ord as any).origem_pagamento === "orcamento" || (ord as any).metodo_pagamento === "Orçamento"));

    if (ord.itensDetalhes && ord.itensDetalhes.length > 0) {
      setItensTags(ord.itensDetalhes);
    } else if (ord.itens) {
      setItensTags([{ id: crypto.randomUUID(), nome: ord.itens, quantidade: 1 }]);
    } else {
      setItensTags([]);
    }

    setValorTotalFormatado(ord.valorTotal ? `R$ ${(ord.valorTotal).toFixed(2).replace(".", ",")}` : "");
    setTaxaEntregaFormatada(ord.taxaEntrega ? `R$ ${(ord.taxaEntrega).toFixed(2).replace(".", ",")}` : "");
    
    // Histórico de Pagamentos ou Fallback do Sinal
    const histExistente = ord.historicoPagamentos || ord.paymentsHistory;
    if (Array.isArray(histExistente) && histExistente.length > 0) {
      setHistoricoPagamentos(
        histExistente.map((p: any) => {
          const isPaid = p.pago === true || p.is_paid === true || p.status === "pago";
          return {
            id: p.id || `pay_${Math.random().toString(36).substr(2, 6)}`,
            data: p.data || p.date || ord.createdAt?.split("T")[0] || ord.dataEntrega,
            valor: Number(p.valor || p.amount || 0),
            observacao: p.observacao || p.note || "",
            formaPagamento: p.formaPagamento || p.forma_pagamento || "Pix",
            status: isPaid ? "pago" : "pendente",
            pago: isPaid,
            is_paid: isPaid,
            dataEfetiva: isPaid ? (p.dataEfetiva || p.data_efetiva || p.data_pagamento || undefined) : undefined,
            data_pagamento: isPaid ? (p.data_pagamento || p.dataEfetiva || null) : null,
            isEntrada: Boolean(p.isEntrada),
          };
        })
      );
    } else if (ord.valorEntrada && ord.valorEntrada > 0) {
      setHistoricoPagamentos([
        {
          id: "pay_initial",
          data: ord.createdAt?.split("T")[0] || ord.dataEntrega || new Date().toISOString().split("T")[0],
          valor: Number(ord.valorEntrada),
          observacao: "Sinal / Entrada Inicial",
          formaPagamento: "Pix",
          status: "pago",
          pago: true,
          is_paid: true,
          dataEfetiva: ord.createdAt?.split("T")[0] || ord.dataEntrega,
          isEntrada: true,
        },
      ]);
    } else {
      setHistoricoPagamentos([]);
    }

    setNovoPagamentoValorFormatado("");
    setNovoPagamentoData(new Date().toISOString().split("T")[0]);
    setMostrarFormNovoPagamento(false);
    setInsumosTags(ord.insumosNecessarios || []);
    setBuscaItemProduto("");
    setBuscaTagInsumo("");
    setTipoEntrega(ord.tipoEntrega || "retirada");
    setEnderecoEntrega(ord.enderecoEntrega || "");
    setObservacoes(ord.observacoes || "");
    setTemTopoBolo(ord.temTopoBolo || false);
    setDetalhesTopoBolo(ord.detalhesTopoBolo || "");
    setTemVela(ord.temVela || false);
    setDetalhesVela(ord.detalhesVela || "");
    setModalEncomendaOpen(true);
  };

  // Salvar Encomenda
  const handleSalvarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = converterMoedaInputParaNumero(valorTotalFormatado);
    const taxaNum = converterMoedaInputParaNumero(taxaEntregaFormatada);
    const totalPagoQuitado = historicoPagamentos
      .filter((item) => item.pago === true || item.is_paid === true || item.status === "pago")
      .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);

    if (!clienteNome || itensTags.length === 0 || valorNum <= 0) {
      toast.error("Preencha o cliente, adicione ao menos 1 item e informe o valor total.");
      return;
    }

    try {
      const statusPag: StatusPagamentoEncomenda =
        totalPagoQuitado >= valorNum && valorNum > 0
          ? "pago_integral"
          : totalPagoQuitado > 0
          ? "sinal_pago"
          : (isOrcamento ? "pendente" : "pendente");

      const itensSanitizados = itensTags.map((it) => ({
        ...it,
        quantidade: it.quantidade && it.quantidade > 0 ? it.quantidade : 1,
      }));

      const resumoItens = itensSanitizados.map((it) => `${it.quantidade}x ${it.nome}`).join(", ");

      const payload = {
        clienteId,
        clienteNome,
        clienteWhatsapp,
        dataEntrega,
        horarioEntrega,
        itens: resumoItens,
        itensDetalhes: itensSanitizados,
        insumosNecessarios: insumosTags,
        valorTotal: valorNum,
        taxaEntrega: taxaNum > 0 ? taxaNum : undefined,
        is_orcamento: isOrcamento,
        valorEntrada: totalPagoQuitado,
        historicoPagamentos,
        paymentsHistory: historicoPagamentos,
        statusPagamento: statusPag,
        status: statusEncomenda,
        tipoEntrega,
        enderecoEntrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
        observacoes,
        temTopoBolo,
        detalhesTopoBolo: temTopoBolo ? detalhesTopoBolo : "",
        temVela,
        detalhesVela: temVela ? detalhesVela : "",
        origem: editingId ? undefined : "manual",
      };

      if (editingId) {
        await onEditarEncomenda(editingId, payload);
        toast.success(isOrcamento ? "Orçamento atualizado com sucesso!" : "Encomenda atualizada com sucesso!");
      } else {
        await onCriarEncomenda(payload);
        toast.success(isOrcamento ? "Novo orçamento cadastrado com sucesso!" : "Nova encomenda cadastrada com sucesso!");
      }

      if (onCriarClienteRapido && !clienteId && clienteNome && clienteWhatsapp) {
        onCriarClienteRapido(clienteNome, clienteWhatsapp, enderecoEntrega);
      }

      resetFormularioEncomenda();
      setModalEncomendaOpen(false);
    } catch {
      toast.error("Erro ao salvar encomenda.");
    }
  };

  // Executa o envio do WhatsApp e a cópia da Chave Pix selecionada
  const executarEnvioWhatsAppComContaPix = (
    ord: Encomenda,
    conta: { chave: string; favorecido?: string }
  ) => {
    const nomeLoja = estabelecimentoNome || profile?.establishmentName || "";
    const chavePix = conta.chave || profile?.chavePix || "";
    const favorecidoPix = (conta.favorecido && conta.favorecido.trim().length > 0)
      ? conta.favorecido.trim()
      : (nomeLoja || profile?.responsavel || "");
    const cidadeLoja = profile?.cidade || "SAO PAULO";

    const totalPago = calcularTotalPagoEncomenda(ord);
    const saldoRestanteNum = Math.max(0, ord.valorTotal - totalPago);
    const valorParaPix = saldoRestanteNum > 0 ? saldoRestanteNum : (ord.valorTotal > 0 ? ord.valorTotal : 0);

    // 1. Gera mensagem com a formatação dinâmica conforme o método da encomenda ou orçamento
    const mensagem = (ord.is_orcamento || (ord as any).origem_pagamento === "orcamento" || (ord as any).metodo_pagamento === "Orçamento")
      ? gerarMensagemOrcamentoWhatsApp(ord, {
          nomeLoja,
          chavePix,
          favorecidoPix,
          cidadeLoja,
        })
      : gerarMensagemResumoWhatsApp(ord, {
          nomeLoja,
          chavePix,
          favorecidoPix,
          cidadeLoja,
        });

    const tipoMetodo = identificarMetodoPagamento(ord);

    // 2. Copia automaticamente a string bruta do Pix Copia e Cola EMVCo para a área de transferência APENAS SE FOR PIX
    let pixCopiadoComSucesso = false;
    if (tipoMetodo === "pix" && chavePix && valorParaPix > 0) {
      try {
        const pixPayload = generatePixPayload({
          pixKey: chavePix,
          merchantName: favorecidoPix || nomeLoja,
          merchantCity: cidadeLoja,
          amount: valorParaPix,
          txid: (ord.id || "ORDER").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20),
          description: `Encomenda ${ord.clienteNome.slice(0, 15)}`,
        });

        if (pixPayload && typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(pixPayload);
          pixCopiadoComSucesso = true;
        }
      } catch {}
    }

    // 3. Exibe o toast informativo
    if (pixCopiadoComSucesso) {
      toast.info(
        "Mensagem gerada! O Pix Copia e Cola foi copiado para sua área de transferência. Cole-o no WhatsApp após enviar o pedido."
      );
    } else {
      toast.success("Resumo gerado! Abrindo o WhatsApp...");
    }

    // 4. Abre o WhatsApp
    const url = formatarWhatsappLink(ord.clienteWhatsapp, mensagem);
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  // Enviar Resumo Formatado no WhatsApp para o Cliente
  const handleEnviarResumoWhatsApp = (ord: Encomenda) => {
    if (!ord.clienteWhatsapp) {
      toast.error("Esta encomenda não possui número de WhatsApp cadastrado.");
      return;
    }

    const contas = (profile?.contasPix && profile.contasPix.length > 0)
      ? profile.contasPix.filter((c) => c.chave && c.chave !== "contato@caixadoce.com.br")
      : (profile?.chavePix && profile.chavePix !== "contato@caixadoce.com.br"
          ? [{ id: "def", chave: profile.chavePix, favorecido: profile?.establishmentName || profile?.responsavel || "", isDefault: true }]
          : []);

    if (contas.length > 1) {
      setEncomendaParaEnvioPix(ord);
      setModalSelecaoPixOpen(true);
      return;
    }

    // Se tiver 0 ou 1 chave, envia direto com a chave principal
    const contaUsar = contas.find((c) => c.isDefault) || contas[0] || {
      chave: profile?.chavePix && profile.chavePix !== "contato@caixadoce.com.br" ? profile.chavePix : "",
      favorecido: profile?.establishmentName || profile?.responsavel || "",
    };

    executarEnvioWhatsAppComContaPix(ord, contaUsar);
  };

  // Alternar Insumo Comprado/Pendente
  const handleToggleInsumoComprado = async (encomendaId: string, insumoId: string) => {
    const enc = encomendas.find((e) => e.id === encomendaId);
    if (!enc || !enc.insumosNecessarios) return;

    const insumosAtualizados = enc.insumosNecessarios.map((ins) =>
      ins.id === insumoId ? { ...ins, comprado: !ins.comprado } : ins
    );

    await onEditarEncomenda(encomendaId, { insumosNecessarios: insumosAtualizados });
    toast.success("Status do insumo atualizado!");
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

  // Função de validação unificada de filtros (Pagamento, Origem, Período e Busca)
  const atendeFiltrosGerais = useCallback((e: Encomenda) => {
    const totalmentePaga = isEncomendaTotalmentePaga(e);

    let matchPagamento = true;
    if (filtroPagamento === "pendente") {
      matchPagamento = !totalmentePaga; // Possui qualquer saldo devedor em aberto (valor_pago < valor_total)
    } else if (filtroPagamento === "pago") {
      matchPagamento = totalmentePaga; // Totalmente quitada (valor_pago >= valor_total)
    }

    let matchOrigem = true;
    if (filtroOrigem !== "todas") {
      matchOrigem = obterOrigemEncomenda(e) === filtroOrigem;
    }

    let matchPeriodo = true;
    const dataVenda = e.dataEntrega || (e.createdAt ? e.createdAt.split("T")[0] : "");
    if (filtroPeriodo === "hoje") {
      const hojeStr = new Date().toISOString().split("T")[0];
      matchPeriodo = dataVenda === hojeStr;
    } else if (filtroPeriodo === "data_especifica") {
      matchPeriodo = dataVenda === dataFiltroEspecifica;
    } else if (filtroPeriodo === "mes_atual") {
      const mesAtualStr = new Date().toISOString().slice(0, 7);
      matchPeriodo = dataVenda.startsWith(mesAtualStr);
    } else if (filtroPeriodo === "mes_especifico") {
      matchPeriodo = dataVenda.startsWith(mesFiltroEspecifico);
    }

    const matchBusca =
      !busca ||
      e.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      e.itens.toLowerCase().includes(busca.toLowerCase()) ||
      e.clienteWhatsapp.includes(busca) ||
      (e.codigoPedidoIfood && e.codigoPedidoIfood.toLowerCase().includes(busca.toLowerCase())) ||
      (e.codigo_pedido_ifood && e.codigo_pedido_ifood.toLowerCase().includes(busca.toLowerCase())) ||
      (e.id && e.id.toLowerCase().includes(busca.toLowerCase()));

    return matchPagamento && matchOrigem && matchPeriodo && matchBusca;
  }, [filtroPagamento, filtroOrigem, filtroPeriodo, dataFiltroEspecifica, mesFiltroEspecifico, busca]);

  // Métricas Consolidadas para o Relatório Geral de Vendas do Período
  const relatorioVendasConsolidado = useMemo(() => {
    const vendasPeriodo = encomendas.filter(atendeFiltrosGerais);

    let totalFaturado = 0;
    let totalQuitado = 0;
    let totalPendente = 0;

    const porOrigem: Record<OrigemEncomendaTipo, { qtd: number; total: number }> = {
      pdv: { qtd: 0, total: 0 },
      cardapio: { qtd: 0, total: 0 },
      ifood: { qtd: 0, total: 0 },
      "99food": { qtd: 0, total: 0 },
      manual: { qtd: 0, total: 0 },
    };

    const porMetodoPagamento: Record<string, { qtd: number; total: number }> = {};

    for (const v of vendasPeriodo) {
      const valTotal = Number(v.valorTotal) || 0;
      const valPago = calcularTotalPagoEncomenda(v);
      const orig = obterOrigemEncomenda(v);

      totalFaturado += valTotal;
      totalQuitado += valPago;
      totalPendente += Math.max(0, valTotal - valPago);

      if (!porOrigem[orig]) {
        porOrigem[orig] = { qtd: 0, total: 0 };
      }
      porOrigem[orig].qtd += 1;
      porOrigem[orig].total += valTotal;

      const metStr = String((v as any).metodo_pagamento || (v as any).metodoPagamento || (v as any).forma_pagamento || "Outro").trim();
      const metKey = metStr || "Outro";
      if (!porMetodoPagamento[metKey]) {
        porMetodoPagamento[metKey] = { qtd: 0, total: 0 };
      }
      porMetodoPagamento[metKey].qtd += 1;
      porMetodoPagamento[metKey].total += valTotal;
    }

    return {
      vendasPeriodo,
      qtdTotal: vendasPeriodo.length,
      totalFaturado,
      totalQuitado,
      totalPendente,
      porOrigem,
      porMetodoPagamento,
    };
  }, [encomendas, atendeFiltrosGerais]);

  const handleImprimirRelatorioVendas = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      toast.error("Permita pop-ups no navegador para imprimir o relatório.");
      return;
    }

    const estNome = estabelecimentoNome || profile?.establishmentName || "Minha Confeitaria";
    const { qtdTotal, totalFaturado, totalQuitado, totalPendente, porOrigem, porMetodoPagamento, vendasPeriodo } = relatorioVendasConsolidado;

    const labelPeriodo =
      filtroPeriodo === "hoje"
        ? `Hoje (${new Date().toLocaleDateString("pt-BR")})`
        : filtroPeriodo === "data_especifica"
        ? `Data Específica (${dataFiltroEspecifica.split("-").reverse().join("/")})`
        : filtroPeriodo === "mes_atual"
        ? `Mês Atual (${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})`
        : filtroPeriodo === "mes_especifico"
        ? `Mês (${mesFiltroEspecifico})`
        : "Todos os Períodos";

    const origensRowsHtml = Object.entries(porOrigem)
      .map(([k, v]) => {
        if (v.qtd === 0) return "";
        const nomeOrig =
          k === "pdv" ? "PDV / Balcão" : k === "cardapio" ? "Meu Cardápio" : k === "ifood" ? "iFood" : k === "99food" ? "99Food" : "Manual";
        return `<div class="row"><span>${nomeOrig} (${v.qtd}x):</span><span><strong>${formatarMoeda(v.total)}</strong></span></div>`;
      })
      .join("");

    const metodosRowsHtml = Object.entries(porMetodoPagamento)
      .map(([k, v]) => {
        if (v.qtd === 0) return "";
        return `<div class="row"><span>${k} (${v.qtd}x):</span><span><strong>${formatarMoeda(v.total)}</strong></span></div>`;
      })
      .join("");

    const vendasListaHtml = vendasPeriodo
      .slice(0, 100)
      .map((v, i) => {
        const orig = obterOrigemEncomenda(v);
        const origLabel = orig === "pdv" ? "PDV" : orig === "cardapio" ? "Cardápio" : orig === "ifood" ? "iFood" : orig === "99food" ? "99Food" : "Manual";
        return `
          <div style="font-size: 11px; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; display: flex; justify-content: space-between;">
            <div>
              <strong>#${i + 1} ${v.clienteNome}</strong> (${origLabel})<br/>
              <span style="color: #64748b; font-size: 10px;">${v.itens.slice(0, 40)}${v.itens.length > 40 ? "..." : ""}</span>
            </div>
            <div style="text-align: right;">
              <strong>${formatarMoeda(v.valorTotal)}</strong><br/>
              <span style="font-size: 10px; color: ${isEncomendaTotalmentePaga(v) ? '#059669' : '#dc2626'};">${isEncomendaTotalmentePaga(v) ? 'Pago' : 'Pendente'}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Geral de Vendas — ${estNome}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: monospace, sans-serif; font-size: 12px; margin: 0; padding: 12px; color: #000; }
          .header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 4px; text-transform: uppercase; }
          .sub { text-align: center; font-size: 11px; color: #475569; margin-bottom: 12px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .divider-solid { border-top: 2px solid #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
          .highlight { font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 6px; margin: 6px 0; border-radius: 4px; }
          @media print { .no-print { display: none !important; } }
          .btn-print { background: #7c3aed; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir Relatório</button>
        </div>
        <div class="header">${estNome}</div>
        <div class="sub">RELATÓRIO GERAL DE VENDAS<br/>Período: ${labelPeriodo}</div>
        
        <div class="divider-solid"></div>
        
        <div class="row"><span>Total de Vendas:</span><span><strong>${qtdTotal} pedidos</strong></span></div>
        <div class="row highlight"><span>FATURAMENTO TOTAL:</span><span>${formatarMoeda(totalFaturado)}</span></div>
        <div class="row"><span>Total Quitado / Recebido:</span><span><strong style="color: #059669;">${formatarMoeda(totalQuitado)}</strong></span></div>
        <div class="row"><span>Saldo a Receber / Pendente:</span><span><strong style="color: #dc2626;">${formatarMoeda(totalPendente)}</strong></span></div>
        
        <div class="divider"></div>
        <div style="font-weight: bold; margin-bottom: 4px;">VENDAS POR ORIGEM</div>
        ${origensRowsHtml}

        <div class="divider"></div>
        <div style="font-weight: bold; margin-bottom: 4px;">FORMAS DE PAGAMENTO</div>
        ${metodosRowsHtml}

        <div class="divider-solid"></div>
        <div style="font-weight: bold; margin-bottom: 6px;">LISTAGEM DE VENDAS (${qtdTotal})</div>
        ${vendasListaHtml}

        <div class="divider-solid"></div>
        <div style="text-align: center; font-size: 10px; margin-top: 12px; color: #64748b;">
          Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — CaixaDoce
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 400); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const encomendasDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return [];
    return encomendas.filter((e) => e.dataEntrega === selectedDrawerDate && atendeFiltrosGerais(e));
  }, [encomendas, selectedDrawerDate, atendeFiltrosGerais]);

  const bloqueioDoDiaDrawer = useMemo(() => {
    if (!selectedDrawerDate) return null;
    return datasBloqueadas.find((b) => b.data === selectedDrawerDate) || null;
  }, [datasBloqueadas, selectedDrawerDate]);

  // Encomendas Ativas (Pendentes / Em Produção / Prontas)
  const encomendasAtivas = useMemo(() => {
    return encomendas.filter((e) => {
      const st = (e.status || "").toLowerCase();
      return st !== "entregue" && st !== "cancelada" && st !== "cancelado" && st !== "concluido" && st !== "concluida";
    });
  }, [encomendas]);

  // Encomendas Concluídas (Entregues)
  const encomendasConcluidas = useMemo(() => {
    return encomendas.filter((e) => {
      const st = (e.status || "").toLowerCase();
      return st === "entregue" || st === "concluido" || st === "concluida";
    });
  }, [encomendas]);

  // Lista Filtrada para a Tabela / Cards (Regra Matemática: valor_pago < valor_total -> Pendente)
  const encomendasFiltradas = useMemo(() => {
    const listaBase = viewMode === "concluidos" ? encomendasConcluidas : (viewMode === "lista" ? encomendasAtivas : encomendas);
    return listaBase.filter(atendeFiltrosGerais);
  }, [viewMode, encomendasAtivas, encomendasConcluidas, encomendas, atendeFiltrosGerais]);

  // Identificador de Orçamento vs Compra Imediata (Pedido Direto)
  const isOrcamentoPedido = useCallback((ord: Partial<Encomenda> | null | undefined): boolean => {
    if (!ord) return false;
    if (ord.is_orcamento) return true;
    if ((ord as any).isOrcamento) return true;
    const metodo = String(ord.metodoPagamento || ord.metodo_pagamento || "").toLowerCase();
    if (metodo.includes("orçamento") || metodo.includes("orcamento")) return true;
    const forma = String((ord as any).forma_pagamento || (ord as any).formaPagamento || "").toLowerCase();
    if (forma.includes("orçamento") || forma.includes("orcamento")) return true;
    const itens = String(ord.itens || "").toLowerCase();
    if (itens.includes("orçamento personalizado") || itens.includes("sob medida") || itens.includes("modo orçamento")) return true;
    const obs = String(ord.observacoes || "").toLowerCase();
    if (obs.includes("modo orçamento") || obs.includes("orcamento personalizado") || obs.includes("orçamento personalizado")) return true;
    if (ord.status === "em_analise" || ord.status === "aprovado") return true;
    return false;
  }, []);

  // Renderização Dinâmica de Badge de Status da Máquina de Estados
  const renderizarBadgeStatus = useCallback((status: StatusEncomenda | string | undefined, isOrcamento = false) => {
    const st = (status || "novo").toLowerCase();

    if (isOrcamento) {
      if (st === "novo" || st === "pendente") {
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
            📝 Orçamento Novo
          </Badge>
        );
      }
      if (st === "em_analise") {
        return (
          <Badge className="bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
            🔍 Em Análise
          </Badge>
        );
      }
      if (st === "aprovado") {
        return (
          <Badge className="bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
            ✨ Orçamento Aprovado
          </Badge>
        );
      }
      if (st === "entregue" || st === "concluido" || st === "concluida") {
        return (
          <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
            ✓ Entregue & Concluído
          </Badge>
        );
      }
      if (st === "cancelado" || st === "cancelada") {
        return (
          <Badge className="bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
            ✕ Cancelado
          </Badge>
        );
      }
    }

    // Pedido Direto (Compra Imediata)
    if (st === "novo" || st === "pendente") {
      return (
        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          🟡 Novo Pedido
        </Badge>
      );
    }
    if (st === "confirmado") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          ⚡ Confirmado
        </Badge>
      );
    }
    if (st === "em_producao") {
      return (
        <Badge className="bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          👨‍🍳 Em Produção
        </Badge>
      );
    }
    if (st === "pronta") {
      return (
        <Badge className="bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          📦 Pronto p/ Entrega
        </Badge>
      );
    }
    if (st === "entregue" || st === "concluido" || st === "concluida") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          ✓ Entregue
        </Badge>
      );
    }
    if (st === "cancelado" || st === "cancelada") {
      return (
        <Badge className="bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 text-[9.5px] font-extrabold px-2 py-0.5">
          ✕ Cancelado
        </Badge>
      );
    }

    return (
      <Badge className="bg-muted text-muted-foreground text-[9.5px] font-extrabold px-2 py-0.5">
        {status}
      </Badge>
    );
  }, []);

  // Renderização dos Botões de Ação da Máquina de Estados (Card & Tabela)
  const renderBotoesAcaoPedido = useCallback((ord: Encomenda, variant: "card" | "table" = "card") => {
    if (isPedidoIFood(ord)) {
      return renderBotoesAcaoIFood(ord, variant === "card" ? "mobile" : "desktop");
    }

    const isOrc = isOrcamentoPedido(ord);
    const status = (ord.status || "novo").toLowerCase();

    // 1. LÓGICA PARA ORÇAMENTO
    if (isOrc) {
      if (status === "novo" || status === "pendente") {
        return (
          <div className="pt-1 flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                await onEditarEncomenda(ord.id, { status: "em_analise" });
                toast.success("Orçamento marcado como Em Análise!");
              }}
              title="Marcar como Recebido (Em Análise)"
              className={`flex-1 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white ${variant === "card" ? "h-8 text-xs" : "h-7 text-xs px-2.5"}`}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Marcar como Recebido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                await onEditarEncomenda(ord.id, { status: "cancelado" });
                toast.info("Orçamento cancelado.");
              }}
              title="Cancelar orçamento"
              className={`font-semibold rounded-xl text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 ${variant === "card" ? "h-8 px-2.5 text-xs" : "h-7 px-2 text-xs"}`}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Cancelar
            </Button>
          </div>
        );
      }

      if (status === "em_analise") {
        return (
          <div className="pt-1 flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                await onEditarEncomenda(ord.id, { status: "aprovado" });
                toast.success("Orçamento aprovado pelo cliente!");
              }}
              title="Aprovar orçamento"
              className={`flex-1 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white ${variant === "card" ? "h-8 text-xs" : "h-7 text-xs px-2.5"}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Aprovar Orçamento
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                await onEditarEncomenda(ord.id, { status: "cancelado" });
                toast.info("Orçamento cancelado.");
              }}
              title="Cancelar orçamento"
              className={`font-semibold rounded-xl text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 ${variant === "card" ? "h-8 px-2.5 text-xs" : "h-7 px-2 text-xs"}`}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Cancelar
            </Button>
          </div>
        );
      }

      if (status === "aprovado") {
        return (
          <div className="pt-1 flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                await onEditarEncomenda(ord.id, { status: "entregue" });
                toast.success("Orçamento concluído e marcado como Entregue!");
              }}
              title="Marcar como Entregue"
              className={`flex-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold rounded-xl hover:bg-emerald-500/20 ${variant === "card" ? "h-8 text-xs" : "h-7 text-xs px-2.5"}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Marcar como Entregue
            </Button>
          </div>
        );
      }

      // Se entregue ou cancelado:
      return (
        <div className="pt-1 flex items-center justify-between gap-1 w-full" onClick={(e) => e.stopPropagation()}>
          <Badge
            className={
              status === "entregue"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px]"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold text-[10px]"
            }
          >
            {status === "entregue" ? "✅ Concluído & Entregue" : "❌ Orçamento Cancelado"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              await onEditarEncomenda(ord.id, { status: "em_analise" });
              toast.success("Orçamento reaberto para análise!");
            }}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-semibold"
          >
            <RotateCcw className="w-3 h-3 mr-0.5" /> Reabrir
          </Button>
        </div>
      );
    }

    // 2. LÓGICA PARA COMPRA IMEDIATA (Pedido Direto)
    if (status === "novo" || status === "pendente") {
      return (
        <div className="pt-1 flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="default"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              await onEditarEncomenda(ord.id, { status: "confirmado" });
              toast.success("Pedido confirmado com sucesso!");
            }}
            title="Confirmar Pedido"
            className={`flex-1 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white ${variant === "card" ? "h-8 text-xs" : "h-7 text-xs px-2.5"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Confirmar Pedido
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              await onEditarEncomenda(ord.id, { status: "cancelado" });
              toast.info("Pedido cancelado.");
            }}
            title="Cancelar pedido"
            className={`font-semibold rounded-xl text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 ${variant === "card" ? "h-8 px-2.5 text-xs" : "h-7 px-2 text-xs"}`}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>
        </div>
      );
    }

    if (status === "confirmado" || status === "em_producao" || status === "pronta") {
      return (
        <div className="pt-1 flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              await onEditarEncomenda(ord.id, { status: "entregue" });
              toast.success("Pedido marcado como entregue!");
            }}
            title="Marcar como Entregue"
            className={`flex-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold rounded-xl hover:bg-emerald-500/20 ${variant === "card" ? "h-8 text-xs" : "h-7 text-xs px-2.5"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Marcar como Entregue
          </Button>
        </div>
      );
    }

    // Se entregue ou cancelado:
    return (
      <div className="pt-1 flex items-center justify-between gap-1 w-full" onClick={(e) => e.stopPropagation()}>
        <Badge
          className={
            status === "entregue"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px]"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold text-[10px]"
          }
        >
          {status === "entregue" ? "✅ Entregue & Finalizado" : "❌ Pedido Cancelado"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={async (e) => {
            e.stopPropagation();
            await onEditarEncomenda(ord.id, { status: "confirmado" });
            toast.success("Pedido reaberto como confirmado!");
          }}
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-semibold"
        >
          <RotateCcw className="w-3 h-3 mr-0.5" /> Reabrir
        </Button>
      </div>
    );
  }, [onEditarEncomenda, isOrcamentoPedido]);

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

    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const diaNum = ultimoDiaMesAnterior - i;
      const dataIso = new Date(ano, mes - 1, diaNum).toISOString().split("T")[0];
      dias.push({ dataIso, diaNum, foraDoMes: true });
    }

    for (let i = 1; i <= ultimoDiaMes; i++) {
      const dataIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      dias.push({ dataIso, diaNum: i, foraDoMes: false });
    }

    const restante = 42 - dias.length;
    for (let i = 1; i <= (restante > 7 ? restante - 7 : restante); i++) {
      const dataIso = new Date(ano, mes + 1, i).toISOString().split("T")[0];
      dias.push({ dataIso, diaNum: i, foraDoMes: true });
    }

    return dias;
  }, [currentDate]);

  // Grid Semanal
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

  // Processamento da Lista de Compras
  const listaComprasDados = useMemo(() => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const agora = new Date();
    const seteDiasDepois = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const ativas = encomendas.filter((e) => e.status !== "cancelada" && e.status !== "entregue");

    let filtradas = ativas;
    if (abaCompras === "hoje") {
      filtradas = ativas.filter((e) => e.dataEntrega === hojeStr);
    } else if (abaCompras === "semana") {
      filtradas = ativas.filter((e) => e.dataEntrega >= hojeStr && e.dataEntrega <= seteDiasDepois);
    }

    const todosInsumos: { encomendaId: string; clienteNome: string; dataEntrega: string; insumo: InsumoNecessarioPedido }[] = [];

    for (const enc of filtradas) {
      if (enc.insumosNecessarios && enc.insumosNecessarios.length > 0) {
        for (const ins of enc.insumosNecessarios) {
          todosInsumos.push({
            encomendaId: enc.id,
            clienteNome: enc.clienteNome,
            dataEntrega: enc.dataEntrega,
            insumo: ins,
          });
        }
      }
    }

    const totalInsumos = todosInsumos.length;
    const comprados = todosInsumos.filter((i) => i.insumo.comprado).length;
    const pendentes = totalInsumos - comprados;

    return {
      encomendasComInsumos: filtradas,
      todosInsumos,
      totalInsumos,
      comprados,
      pendentes,
    };
  }, [encomendas, abaCompras]);
  const handleCriarClienteFallback = async (dados: Omit<Cliente, "id" | "estabelecimentoCodigo" | "createdAt">) => {
    if (onCriarCliente) {
      await onCriarCliente(dados);
      return;
    }
    const novo: Cliente = {
      ...dados,
      id: crypto.randomUUID(),
      estabelecimentoCodigo: activeCode,
      createdAt: new Date().toISOString(),
    };
    const atualizados = [novo, ...listaClientes];
    salvarClientesStorage(activeCode, atualizados);
    try {
      await supabase.from("customers").upsert([
        {
          id: novo.id,
          user_id: profile?.ownerUserId || null,
          estabelecimento_codigo: activeCode,
          name: novo.nome,
          whatsapp: novo.whatsapp,
          address: novo.endereco || "",
          notes: novo.observacoes || "",
        },
      ], { onConflict: "id" });
    } catch {}
    toast.success("Cliente cadastrado com sucesso.");
  };

  const handleEditarClienteFallback = async (id: string, dados: Partial<Cliente>) => {
    if (onEditarCliente) {
      await onEditarCliente(id, dados);
      return;
    }
    const atualizados = listaClientes.map((c) => (c.id === id ? { ...c, ...dados } : c));
    salvarClientesStorage(activeCode, atualizados);
    try {
      await supabase.from("customers").update({
        name: dados.nome,
        whatsapp: dados.whatsapp,
        address: dados.endereco,
        notes: dados.observacoes,
      }).eq("id", id);
    } catch {}
    toast.success("Dados do cliente atualizados.");
  };

  const handleExcluirClienteFallback = async (id: string) => {
    if (onExcluirCliente) {
      await onExcluirCliente(id);
      return;
    }
    const atualizados = listaClientes.filter((c) => c.id !== id);
    salvarClientesStorage(activeCode, atualizados);
    try {
      await supabase.from("customers").delete().eq("id", id);
    } catch {}
    toast.success("Cliente removido.");
  };

  if (abaSubView === "clientes") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              Meus Clientes <Users className="w-6 h-6 text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">
              Consulte e gerencie a lista consolidada dos clientes que já realizaram pedidos pelo cardápio.
            </p>
          </div>

          <div className="flex items-center bg-muted/80 p-1 rounded-xl border border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAbaSubView("pedidos")}
              className="h-8 text-xs font-bold rounded-lg px-3"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" /> Pedidos
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setAbaSubView("clientes")}
              className="h-8 text-xs font-bold rounded-lg px-3"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Clientes ({listaClientes.length})
            </Button>
          </div>
        </div>

        <CustomersView
          clientes={listaClientes}
          encomendas={encomendas}
          onCriarCliente={handleCriarClienteFallback}
          onEditarCliente={handleEditarClienteFallback}
          onExcluirCliente={handleExcluirClienteFallback}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Minhas Vendas <Package className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie vendas, pedidos do PDV, entregas e relatórios consolidados por período.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Seção: Vendas vs Clientes */}
          <div className="flex items-center bg-muted/80 p-1 rounded-xl border border-border/60">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAbaSubView("pedidos")}
              className="h-8 text-xs font-bold rounded-lg px-3"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" /> Vendas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAbaSubView("clientes")}
              className="h-8 text-xs font-bold rounded-lg px-3"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Clientes ({listaClientes.length})
            </Button>
          </div>

          <Link to="/pdv">
            <Button
              size="sm"
              className="font-extrabold shadow-md text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
            >
              <Store className="w-4 h-4" /> Abrir Meu PDV
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalBloqueioOpen(true)}
            className="text-xs border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Bloquear Data
          </Button>

          <Button
            onClick={() => handleAbrirNovaEncomenda()}
            size="sm"
            className="font-bold shadow-md text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Venda
          </Button>
        </div>
      </div>
      {/* Barra de Controle de Visualização & Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            variant={viewMode === "lista" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("lista")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Vendas ({encomendasAtivas.length})
          </Button>
          <Button
            variant={viewMode === "concluidos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("concluidos")}
            className="h-7 text-xs font-semibold shrink-0 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Vendas Concluídas ({encomendasConcluidas.length})
          </Button>
          <Button
            variant={viewMode === "semana" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("semana")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Semanal
          </Button>
          <Button
            variant={viewMode === "mes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("mes")}
            className="h-7 text-xs font-semibold shrink-0"
          >
            Mensal
          </Button>
        </div>

        {(viewMode === "mes" || viewMode === "semana") && (
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs pl-8 w-44 sm:w-52 font-medium"
            />
          </div>

          {/* Filtro de Período (Data Específica / Mês) */}
          <Select value={filtroPeriodo} onValueChange={(val: any) => setFiltroPeriodo(val)}>
            <SelectTrigger className="h-8 text-xs w-40 font-semibold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Períodos</SelectItem>
              <SelectItem value="hoje">Vendas de Hoje</SelectItem>
              <SelectItem value="data_especifica">Data Específica</SelectItem>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
              <SelectItem value="mes_especifico">Selecionar Mês</SelectItem>
            </SelectContent>
          </Select>

          {filtroPeriodo === "data_especifica" && (
            <Input
              type="date"
              value={dataFiltroEspecifica}
              onChange={(e) => setDataFiltroEspecifica(e.target.value)}
              className="h-8 text-xs font-mono font-bold w-36"
            />
          )}

          {filtroPeriodo === "mes_especifico" && (
            <Input
              type="month"
              value={mesFiltroEspecifico}
              onChange={(e) => setMesFiltroEspecifico(e.target.value)}
              className="h-8 text-xs font-mono font-bold w-36"
            />
          )}

          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="h-8 text-xs w-40 font-semibold">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Origens</SelectItem>
              <SelectItem value="pdv">Balcão / PDV</SelectItem>
              <SelectItem value="manual">Inserida Manualmente</SelectItem>
              <SelectItem value="cardapio">Meu Cardápio</SelectItem>
              <SelectItem value="ifood">iFood</SelectItem>
              <SelectItem value="99food">99Food</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
            <SelectTrigger className="h-8 text-xs w-40 font-semibold">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Pagamentos</SelectItem>
              <SelectItem value="pendente">Pendente (Com Saldo)</SelectItem>
              <SelectItem value="pago">Pago (Quitado)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => setModalRelatorioVendasOpen(true)}
            className="h-8 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relatório Geral</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO EM CALENDÁRIO MENSAL */}
      {/* ========================================================================= */}
      {viewMode === "mes" && (
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-muted/10">
            {diasDoMesGrid.map((dia, idx) => {
              const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso && atendeFiltrosGerais(e));
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
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Fechada</span>
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 my-1 flex-1">
                    {exibidas.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      const textoItens = ord.itens || "Pedido";
                      const resumoItem = textoItens.length > 18 ? `${textoItens.substring(0, 18)}...` : textoItens;

                      return (
                        <div
                          key={ord.id}
                          className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md border truncate shadow-2xs flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${estiloPilula}`}
                        >
                          <span className="font-mono font-bold shrink-0 opacity-80">
                            {ord.horarioEntrega || (ord.origem === "iFood" ? "iFood" : "14:00")}
                          </span>
                          <span className="truncate">
                            <strong>{ord.clienteNome || "Cliente"}</strong> ({resumoItem})
                          </span>
                        </div>
                      );
                    })}

                    {restantes > 0 && (
                      <div className="text-[10px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-md text-center">
                        +{restantes} mais
                      </div>
                    )}
                  </div>

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
            const encomendasDoDia = encomendas.filter((e) => e.dataEntrega === dia.dataIso && atendeFiltrosGerais(e));
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
                    <p className="text-[11px] text-muted-foreground text-center py-6">Livre</p>
                  ) : (
                    encomendasDoDia.map((ord) => {
                      const estiloPilula = obterEstiloPilula(ord.status);
                      return (
                        <div key={ord.id} className={`p-1.5 rounded-lg border text-xs space-y-1 ${estiloPilula}`}>
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
                  <span>{encomendasDoDia.length} ped.</span>
                  <span>Ver detalhes &gt;</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISUALIZAÇÃO EM LISTA (ATIVAS & CONCLUÍDAS) (LIMPA & CLICÁVEL) */}
      {/* ========================================================================= */}
      {(viewMode === "lista" || viewMode === "concluidos") && (
        <div className="space-y-4">
          {/* VISUALIZAÇÃO DESKTOP (TABELA LIMPA DE 5 COLUNAS) */}
          <Card className="hidden md:block border-border shadow-xs overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs">Data &amp; Hora</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Valor Total</TableHead>
                  <TableHead className="text-xs">Status de Pagamento</TableHead>
                  <TableHead className="text-xs text-right w-72">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encomendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                      {viewMode === "concluidos"
                        ? "Nenhum pedido concluído / entregue encontrado."
                        : "Nenhuma encomenda ativa encontrada."}
                    </TableCell>
                  </TableRow>
                ) : (
                  encomendasFiltradas.map((ord) => {
                    const totalPago = calcularTotalPagoEncomenda(ord);
                    const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
                    const statusFin = obterStatusFinanceiroEncomenda(ord);
                    const urgencia = verificarUrgenciaEntrega(ord.dataEntrega, ord.status);

                    const rowBgClass =
                      statusFin === "pago_integral"
                        ? "bg-green-50/70 dark:bg-green-950/20 hover:bg-green-100/80 border-l-4 border-l-green-500"
                        : statusFin === "sinal_pago"
                        ? "bg-orange-50/70 dark:bg-orange-950/20 hover:bg-orange-100/80 border-l-4 border-l-orange-500"
                        : "bg-red-50/70 dark:bg-red-950/20 hover:bg-red-100/80 border-l-4 border-l-red-500";

                    return (
                      <TableRow
                        key={ord.id}
                        onClick={() => handleAbrirDetalhes(ord)}
                        className={`cursor-pointer transition-colors ${rowBgClass}`}
                      >
                        <TableCell className="text-xs">
                          {urgencia === "hoje" && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white font-black text-[9px] tracking-wide px-1.5 py-0 mb-1 uppercase shadow-xs flex items-center gap-1 w-fit border-0 animate-pulse">
                              🔥 ENTREGA HOJE
                            </Badge>
                          )}
                          {urgencia === "atrasada" && (
                            <Badge className="bg-red-700 text-white font-black text-[9px] tracking-wide px-1.5 py-0 mb-1 uppercase shadow-xs flex items-center gap-1 w-fit border-0">
                              ⚠️ ENTREGA ATRASADA
                            </Badge>
                          )}
                          <div className="font-extrabold text-foreground flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{ord.dataEntrega ? ord.dataEntrega.split("-").reverse().join("/") : (ord.origem === "iFood" ? "Data a confirmar" : "A confirmar")}</span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-mono mt-0.5">
                            <Clock className="w-3 h-3 text-primary shrink-0" /> {ord.horarioEntrega || (ord.origem === "iFood" ? "Hora a confirmar" : "14:00")}
                          </div>
                          {ord.createdAt && (
                            <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1 font-sans">
                              <span>Pedido feito em: {formatarDataHoraCriacao(ord.createdAt)}</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>{ord.clienteNome}</span>
                            {renderizarBadgeOrigem(ord.origem)}
                            {renderizarBadgeStatus(ord.status, isOrcamentoPedido(ord))}
                          </div>
                          {(isPedidoIFood(ord) || ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood) && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              ID: #{ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood || ord.id.slice(0, 8)}
                            </div>
                          )}
                          {ord.clienteWhatsapp && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-mono mt-0.5">
                              <MessageCircle className="w-3 h-3" /> {ord.clienteWhatsapp}
                            </span>
                          )}
                          <div className="mt-1 space-y-0.5 max-w-xs">
                            {ord.itensDetalhes && ord.itensDetalhes.length > 0 ? (
                              ord.itensDetalhes.map((it: any, idx: number) => {
                                const opcaoNome =
                                  (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
                                    ? it.opcoes_selecionadas
                                        .map((o: any) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
                                        .join(", ")
                                    : null) ||
                                  it.opcaoNome ||
                                  it.opcao_selecionada?.nome;
                                return (
                                  <div key={idx} className="text-[11px] text-muted-foreground flex items-center flex-wrap gap-1">
                                    <span className="font-medium text-foreground">{it.quantidade ? `${it.quantidade}x ` : ""}{it.nome}</span>
                                    {opcaoNome && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                        Sabores: {opcaoNome}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[11px] text-muted-foreground line-clamp-1">
                                {(!ord.itens || ord.itens.toLowerCase().startsWith("pedido ifood #") || ord.itens.toLowerCase().startsWith("pedido ifood"))
                                  ? "Itens integrados do pedido iFood"
                                  : ord.itens}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          {saldoRestante > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide block">
                                {statusFin === "sinal_pago" ? "Resta Pagar:" : "A Cobrar (100%):"}
                              </span>
                              <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-tight">
                                {formatarMoeda(saldoRestante)}
                              </div>
                              <div className="text-[10.5px] text-muted-foreground font-medium">
                                Total: {formatarMoeda(ord.valorTotal)}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">
                                Total Quitado:
                              </span>
                              <div className="text-xs font-extrabold text-foreground font-mono">
                                {formatarMoeda(ord.valorTotal)}
                              </div>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs space-y-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {renderizarBadgePagamento(ord)}
                          </div>
                          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium pt-0.5">
                            <CreditCard className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                            <span>{obterMetodoPagamentoFormatado(ord)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-row items-center justify-end gap-1 flex-nowrap">
                            {isPedidoIFood(ord) ? (
                              renderBotoesAcaoIFood(ord, "desktop")
                            ) : (
                              renderBotoesAcaoPedido(ord, "table")
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnviarResumoWhatsApp(ord);
                              }}
                              title="Enviar resumo do pedido para o WhatsApp do cliente"
                              className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 font-bold whitespace-nowrap"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 fill-emerald-600" />
                              Enviar
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGerarPdfOrcamento(ord);
                              }}
                              title="Imprimir comanda térmica (80mm)"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary shrink-0"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>

                            {isOrcamentoPedido(ord) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAbrirEdicao(ord);
                                }}
                                title="Ver e editar detalhes do orçamento"
                                className="h-7 px-2.5 text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 font-bold whitespace-nowrap"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                                Ver Orçamento
                              </Button>
                            )}

                            {!isOrcamentoPedido(ord) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAbrirEdicao(ord);
                                }}
                                title="Editar pedido"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                  onExcluirEncomenda(ord.id);
                                }
                              }}
                              title="Excluir pedido"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 shrink-0"
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

          {/* VISUALIZAÇÃO MOBILE (CARDS REFATORADOS COM IDENTIFICAÇÃO IMEDIATA) */}
          <div className="block md:hidden space-y-3">
            {encomendasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
                {viewMode === "concluidos"
                  ? "Nenhum pedido concluído / entregue encontrado."
                  : "Nenhuma encomenda ativa encontrada."}
              </div>
            ) : (
              encomendasFiltradas.map((ord) => {
                const totalPago = calcularTotalPagoEncomenda(ord);
                const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
                const statusFin = obterStatusFinanceiroEncomenda(ord);
                const cardStyle = obterEstiloCardFinanceiro(statusFin);
                const urgencia = verificarUrgenciaEntrega(ord.dataEntrega, ord.status);

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleAbrirDetalhes(ord)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-3 ${cardStyle}`}
                  >
                    {/* Tag visual de Urgência no topo do card */}
                    {urgencia === "hoje" && (
                      <div className="flex items-center justify-between pb-0.5">
                        <Badge className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] tracking-wide px-2 py-0.5 uppercase shadow-xs flex items-center gap-1 border-0 animate-pulse">
                          🔥 ENTREGA HOJE
                        </Badge>
                        <span className="text-[10.5px] font-mono font-bold text-red-700 dark:text-red-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-600" /> {ord.horarioEntrega || "14:00"}
                        </span>
                      </div>
                    )}
                    {urgencia === "atrasada" && (
                      <div className="flex items-center justify-between pb-0.5">
                        <Badge className="bg-red-700 hover:bg-red-800 text-white font-black text-[10px] tracking-wide px-2 py-0.5 uppercase shadow-xs flex items-center gap-1 border-0">
                          ⚠️ ENTREGA ATRASADA
                        </Badge>
                        <span className="text-[10.5px] font-mono font-bold text-red-800 dark:text-red-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-700" /> {ord.horarioEntrega || "14:00"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-extrabold truncate">{ord.clienteNome}</span>
                          {renderizarBadgeOrigemMobile(ord.origem)}
                          {renderizarBadgeStatus(ord.status, isOrcamentoPedido(ord))}
                        </div>

                        {/* ID do Pedido em texto pequeno e cinza logo abaixo do nome */}
                        {(isPedidoIFood(ord) || ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood) && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            ID: #{ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood || ord.id.slice(0, 8)}
                          </div>
                        )}

                        <div className="text-[11.5px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                          <span>Entrega: {ord.dataEntrega ? ord.dataEntrega.split("-").reverse().join("/") : (ord.origem === "iFood" ? "Data a confirmar" : "A confirmar")} às {ord.horarioEntrega || (ord.origem === "iFood" ? "Hora a confirmar" : "14:00")}</span>
                        </div>
                        {ord.createdAt && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>Pedido feito em: {formatarDataHoraCriacao(ord.createdAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium pt-0.5">
                          <CreditCard className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>{obterMetodoPagamentoFormatado(ord)}</span>
                        </div>
                      </div>

                      {/* Top Right: Botões Secundários & Hierarquia Financeira */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGerarPdfOrcamento(ord);
                            }}
                            title="Imprimir comanda térmica (80mm)"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-lg"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          {ord.clienteWhatsapp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnviarResumoWhatsApp(ord);
                              }}
                              title="Enviar WhatsApp"
                              className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/15 rounded-lg"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600" />
                            </Button>
                          )}
                          {!isOrcamentoPedido(ord) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAbrirEdicao(ord);
                              }}
                              title="Editar pedido"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja excluir a encomenda de ${ord.clienteNome}?`)) {
                                onExcluirEncomenda(ord.id);
                              }
                            }}
                            title="Excluir pedido"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {saldoRestante > 0 ? (
                          <div>
                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                              {statusFin === "sinal_pago" ? "Restante:" : "A Cobrar:"}
                            </span>
                            <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-tight">
                              {formatarMoeda(saldoRestante)}
                            </div>
                            <div className="text-[9.5px] text-muted-foreground font-medium">
                              Total: <span className="font-semibold text-foreground">{formatarMoeda(ord.valorTotal)}</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                              Total Quitado:
                            </span>
                            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                              {formatarMoeda(ord.valorTotal)}
                            </div>
                          </div>
                        )}
                        <div className="pt-0.5">{renderizarBadgePagamentoMobile(ord)}</div>
                      </div>
                    </div>

                    {/* ITENS DO PEDIDO COM OPÇÕES NO CARD MOBILE */}
                    <div className="space-y-1 bg-background/60 p-2.5 rounded-xl border border-border/60 text-xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Cake className="w-3 h-3 text-purple-600" /> Itens a Produzir:
                      </span>
                      {ord.itensDetalhes && ord.itensDetalhes.length > 0 ? (
                        <div className="space-y-1 pt-0.5">
                          {ord.itensDetalhes.map((it: any, idx: number) => {
                            const opcaoNome =
                              (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
                                ? it.opcoes_selecionadas
                                    .map((o: any) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
                                    .join(", ")
                                : null) ||
                              it.opcaoNome ||
                              it.opcao_selecionada?.nome;
                            return (
                              <div key={idx} className="text-xs">
                                <span className="font-bold text-foreground">{it.quantidade ? `${it.quantidade}x ` : ""}{it.nome}</span>
                                {opcaoNome && (
                                  <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                                    <span className="bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                      Sabores: {opcaoNome}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-foreground/90 font-medium">
                          {(!ord.itens || ord.itens.toLowerCase().startsWith("pedido ifood #") || ord.itens.toLowerCase().startsWith("pedido ifood"))
                            ? "Itens integrados do pedido iFood"
                            : ord.itens}
                        </p>
                      )}
                    </div>

                    {/* BOTÃO EM EVIDÊNCIA PARA ORÇAMENTO */}
                    {isOrcamentoPedido(ord) && (
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEdicao(ord);
                          }}
                          className="w-full h-9 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/40 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Ver Pedido de Orçamento</span>
                        </Button>
                      </div>
                    )}

                    {/* BOTÕES DE AÇÃO DO RODAPÉ DO CARD */}
                    {isPedidoIFood(ord) ? (
                      renderBotoesAcaoIFood(ord, "mobile")
                    ) : (
                      renderBotoesAcaoPedido(ord, "card")
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VISUALIZAÇÃO: LISTA DE COMPRAS / PRODUÇÃO */}
      {/* ========================================================================= */}
      {viewMode === "compras" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600" /> Lista de Insumos para Compras &amp; Produção
              </h3>
              <p className="text-xs text-muted-foreground">
                Insumos e notinhas vinculadas por encomenda / pedido.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border">
              <Button
                variant={abaCompras === "hoje" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("hoje")}
                className="h-7 text-xs font-semibold"
              >
                📌 Hoje
              </Button>
              <Button
                variant={abaCompras === "semana" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("semana")}
                className="h-7 text-xs font-semibold"
              >
                🗓️ Esta Semana
              </Button>
              <Button
                variant={abaCompras === "encomenda" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAbaCompras("encomenda")}
                className="h-7 text-xs font-semibold"
              >
                📋 Por Encomenda
              </Button>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-border shadow-xs p-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Total de Insumos</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{listaComprasDados.totalInsumos}</p>
            </Card>
            <Card className="border-border shadow-xs p-3 bg-emerald-500/5 border-emerald-500/20">
              <p className="text-[11px] font-bold text-emerald-600 uppercase">🟢 Comprados</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{listaComprasDados.comprados}</p>
            </Card>
            <Card className="border-border shadow-xs p-3 bg-amber-500/5 border-amber-500/20">
              <p className="text-[11px] font-bold text-amber-600 uppercase">🟡 Pendentes de Compra</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{listaComprasDados.pendentes}</p>
            </Card>
          </div>

          {/* LISTA POR ENCOMENDA COM RECURSOS DE VINCULAÇÃO INTEGRADOS EM CADA CARD */}
          {abaCompras === "encomenda" ? (
            <div className="space-y-4">
              {listaComprasDados.encomendasComInsumos.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-border/50">
                  Nenhuma encomenda com tags de insumos vinculadas.
                </div>
              ) : (
                listaComprasDados.encomendasComInsumos.map((enc) => {
                  const idsDaEncomenda = linkedMap[enc.id] || [];
                  const notinhasDaEncomenda = despesas.filter((d) => idsDaEncomenda.includes(d.id));
                  const totalComprovado = notinhasDaEncomenda.reduce((acc, d) => acc + (d.valorTotal || 0), 0);
                  const sugestoes = obterSugestoesParaLista(enc.id);
                  const isDropdownOpen = !!dropdownAbertoMap[enc.id];

                  return (
                    <Card key={enc.id} className="border-border shadow-xs bg-card">
                      <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">
                            {enc.clienteNome || "Cliente"} • {enc.dataEntrega ? enc.dataEntrega.split("-").reverse().join("/") : "A confirmar"}
                          </CardTitle>
                          <CardDescription className="text-xs">{enc.itens}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {totalComprovado > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                              Comprovado: {formatarMoeda(totalComprovado)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {enc.insumosNecessarios?.filter((i) => i.comprado).length} de {enc.insumosNecessarios?.length} comprados
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 space-y-4">
                        {/* INSUMOS DA ENCOMENDA */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Insumos do Pedido:</Label>
                          <div className="flex flex-wrap gap-2">
                            {enc.insumosNecessarios?.map((ins) => (
                              <div
                                key={ins.id}
                                onClick={() => handleToggleInsumoComprado(enc.id, ins.id)}
                                className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all select-none ${
                                  ins.comprado
                                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 line-through opacity-80"
                                    : "bg-card text-foreground border-amber-500/50 hover:border-amber-600 shadow-xs"
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  ins.comprado ? "bg-emerald-600 text-white" : "border border-muted-foreground"
                                }`}>
                                  {ins.comprado ? <Check className="w-2.5 h-2.5" /> : null}
                                </span>
                                <span>{ins.quantidade ? `(${ins.quantidade}x) ` : ""}{ins.nome}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* VINCULAÇÃO DE NOTINHAS DENTRO DESTE CARD DA ENCOMENDA */}
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-amber-600" /> Notinhas Vinculadas a esta Encomenda ({notinhasDaEncomenda.length})
                            </h4>
                          </div>

                          {notinhasDaEncomenda.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">
                              Nenhuma notinha vinculada a este pedido.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {notinhasDaEncomenda.map((notinha) => (
                                <div
                                  key={notinha.id}
                                  onClick={() => setNotaDetalheSelecionada(notinha)}
                                  className="group cursor-pointer inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card hover:bg-amber-500/15 text-foreground border border-amber-500/30 text-xs font-semibold shadow-2xs transition-all select-none"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    <strong>{notinha.fornecedorNome}</strong> • {notinha.dataCompra.split("-").reverse().join("/")} •{" "}
                                    <span className="font-mono font-bold text-amber-600">{formatarMoeda(notinha.valorTotal)}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDesvincularNotinhaLista(enc.id, notinha.id);
                                    }}
                                    className="ml-1 p-0.5 rounded-full hover:bg-rose-500/20 text-muted-foreground hover:text-rose-600 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* CAMPO COMBOBOX/AUTOCOMPLETE INTEGRADO NO CARD */}
                          <div className="relative pt-1">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Vincular notinha salva a este pedido (por loja, data, valor, n° nota)..."
                                value={buscaNotinhaMap[enc.id] || ""}
                                onChange={(e) => {
                                  setBuscaNotinhaMap((prev) => ({ ...prev, [enc.id]: e.target.value }));
                                  setDropdownAbertoMap((prev) => ({ ...prev, [enc.id]: true }));
                                }}
                                onFocus={() => setDropdownAbertoMap((prev) => ({ ...prev, [enc.id]: true }))}
                                className="h-8 pl-8 text-xs bg-background"
                              />
                            </div>

                            {isDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                                {sugestoes.length > 0 ? (
                                  sugestoes.map((n) => (
                                    <div
                                      key={n.id}
                                      onClick={() => handleVincularNotinhaLista(enc.id, n.id)}
                                      className="p-2 hover:bg-amber-500/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <div>
                                          <p className="font-bold text-foreground">{n.fornecedorNome}</p>
                                          <p className="text-[10px] text-muted-foreground">
                                            Data: {n.dataCompra ? String(n.dataCompra || "").split("-").reverse().join("/") : "-"} {n.numeroNota ? `• ${n.numeroNota}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="font-mono font-black text-foreground">{formatarMoeda(n.valorTotal)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-2.5 text-center text-xs text-muted-foreground">
                                    {despesas.length === 0
                                      ? "Nenhuma notinha capturada."
                                      : "Nenhuma notinha disponível para este pedido."}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <Card className="border-border shadow-xs bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs w-12 text-center">Status</TableHead>
                    <TableHead className="text-xs">Insumo / Tag</TableHead>
                    <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                    <TableHead className="text-xs">Cliente / Pedido</TableHead>
                    <TableHead className="text-xs">Data de Entrega</TableHead>
                    <TableHead className="text-xs text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaComprasDados.todosInsumos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Nenhum insumo pendente para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    listaComprasDados.todosInsumos.map(({ encomendaId, clienteNome, dataEntrega, insumo }) => (
                      <TableRow key={`${encomendaId}-${insumo.id}`} className="hover:bg-muted/20">
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleInsumoComprado(encomendaId, insumo.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors mx-auto ${
                              insumo.comprado
                                ? "bg-emerald-600 text-white"
                                : "border-2 border-amber-500 hover:bg-amber-500/20"
                            }`}
                          >
                            {insumo.comprado ? <Check className="w-3.5 h-3.5" /> : null}
                          </button>
                        </TableCell>
                        <TableCell className={`text-xs font-bold ${insumo.comprado ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {insumo.nome}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono font-bold">
                          {insumo.quantidade || 1}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {clienteNome}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {dataEntrega ? String(dataEntrega || "").split("-").reverse().join("/") : "A confirmar"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={insumo.comprado ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => handleToggleInsumoComprado(encomendaId, insumo.id)}
                            className="h-6 text-[10px] px-2"
                          >
                            {insumo.comprado ? "Desmarcar" : "Marcar Comprado"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA NOTINHA SELECIONADA A PARTIR DO CHIP */}
      {/* ========================================================================= */}
      {notaDetalheSelecionada && (
        <Dialog open={!!notaDetalheSelecionada} onOpenChange={() => setNotaDetalheSelecionada(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground text-base">
                <Building2 className="w-5 h-5 text-primary" /> {notaDetalheSelecionada.fornecedorNome}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Comprovante fiscal registrado em {notaDetalheSelecionada.dataCompra ? String(notaDetalheSelecionada.dataCompra || "").split("-").reverse().join("/") : "-"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° da Nota:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaDetalheSelecionada.numeroNota || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" /> N° do Pedido:
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {notaDetalheSelecionada.numeroPedido || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Data &amp; Hora:
                  </span>
                  <p className="font-mono text-foreground mt-0.5">
                    {notaDetalheSelecionada.dataCompra ? String(notaDetalheSelecionada.dataCompra || "").split("-").reverse().join("/") : "-"}{" "}
                    {notaDetalheSelecionada.horaCompra ? `às ${notaDetalheSelecionada.horaCompra}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Endereço:
                  </span>
                  <p className="text-foreground truncate mt-0.5" title={notaDetalheSelecionada.fornecedorEndereco}>
                    {notaDetalheSelecionada.fornecedorEndereco || "Local físico"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Item / Descrição</TableHead>
                      <TableHead className="text-xs w-16 text-center">Qtd</TableHead>
                      <TableHead className="text-xs w-20">Unit.</TableHead>
                      <TableHead className="text-xs w-20">Total</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notaDetalheSelecionada.itens.map((it) => {
                      const cfg = CATEGORIAS_DESPESA_CONFIG[it.categoria] || CATEGORIAS_DESPESA_CONFIG.outros;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-xs font-semibold text-foreground">{it.nome}</TableCell>
                          <TableCell className="text-xs text-center font-mono">{it.quantidade}</TableCell>
                          <TableCell className="text-xs">{formatarMoeda(it.valorUnitario)}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {formatarMoeda(it.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${cfg.badgeClass}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex justify-between">
                  <span>🍫 Produção (Doces):</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorProducao)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold flex justify-between">
                  <span>🥣 Utensílios:</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorUtensilios)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold flex justify-between">
                  <span>🛒 Consumo Pessoal:</span>
                  <span>{formatarMoeda(notaDetalheSelecionada.valorConsumoProprio)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300 font-semibold flex justify-between">
                  <span>💰 Total Notinha:</span>
                  <span className="font-extrabold">{formatarMoeda(notaDetalheSelecionada.valorTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setNotaDetalheSelecionada(null)} className="text-xs font-semibold">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. PAINEL LATERAL (DRAWER) DE DETALHES DO DIA SELECIONADO */}
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
                Visualização detalhada de todas as encomendas e insumos da data.
              </SheetDescription>
            </SheetHeader>

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
                  const totalPago = calcularTotalPagoEncomenda(ord);
                  const saldoRestante = Math.max(0, ord.valorTotal - totalPago);
                  const statusFin = obterStatusFinanceiroEncomenda(ord);
                  const cardStyle = obterEstiloCardFinanceiro(statusFin);
                  const urgencia = verificarUrgenciaEntrega(ord.dataEntrega, ord.status);

                  return (
                    <Card key={ord.id} className={`shadow-xs overflow-hidden ${cardStyle}`}>
                      <div className="p-3.5 space-y-3">
                        {urgencia === "hoje" && (
                          <div className="flex items-center justify-between pb-0.5">
                            <Badge className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] px-2 py-0.5 uppercase border-0 animate-pulse">
                              🔥 ENTREGA HOJE
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-primary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {ord.horarioEntrega || "14:00"}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderizarBadgeOrigemMobile(ord.origem)}
                            {renderizarBadgePagamentoMobile(ord)}
                            <Badge variant="outline" className={`text-[10px] font-bold ${statusCfg?.color || ""}`}>
                              {statusCfg?.label || ord.status}
                            </Badge>
                          </div>
                        </div>

                        {ord.createdAt && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>Pedido feito em: {formatarDataHoraCriacao(ord.createdAt)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium">
                          <CreditCard className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>{obterMetodoPagamentoFormatado(ord)}</span>
                        </div>

                        <div>
                          <p className="text-sm font-extrabold text-foreground">{ord.clienteNome}</p>
                          {(isPedidoIFood(ord) || ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood) && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              ID: #{ord.codigoPedidoIfood || (ord as any).codigo_pedido_ifood || ord.id.slice(0, 8)}
                            </div>
                          )}
                          {ord.clienteWhatsapp && (
                            <a
                              href={formatarWhatsappLink(ord.clienteWhatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline mt-0.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{ord.clienteWhatsapp}</span>
                            </a>
                          )}
                        </div>

                        <div className="p-2.5 rounded-lg bg-background/60 text-xs space-y-1.5 border border-border/40">
                          {ord.itensDetalhes && ord.itensDetalhes.length > 0 ? (
                            <div className="space-y-1">
                              {ord.itensDetalhes.map((it: any, idx: number) => {
                                const opcaoNome = it.opcaoNome || it.opcao_selecionada?.nome;
                                return (
                                  <div key={idx} className="text-xs">
                                    <span className="font-semibold text-foreground">{it.quantidade ? `${it.quantidade}x ` : ""}{it.nome}</span>
                                    {opcaoNome && (
                                      <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                                        <span className="bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                          Opção / Sabor: {opcaoNome}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="font-medium text-foreground">
                              {(!ord.itens || ord.itens.toLowerCase().startsWith("pedido ifood #") || ord.itens.toLowerCase().startsWith("pedido ifood"))
                                ? "Itens integrados do pedido iFood"
                                : ord.itens}
                            </p>
                          )}
                          {ord.observacoes && (
                            <p className="text-[11px] text-muted-foreground italic">Obs: {ord.observacoes}</p>
                          )}
                          {(ord.temTopoBolo || ord.temVela) && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/50">
                              {ord.temTopoBolo && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                  🎂 Topo: {ord.detalhesTopoBolo || "Sim"}
                                </Badge>
                              )}
                              {ord.temVela && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  🕯️ Vela: {ord.detalhesVela || "Sim"}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Insumos Necessários */}
                        {ord.insumosNecessarios && ord.insumosNecessarios.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Insumos:</Label>
                            <div className="flex flex-wrap gap-1">
                              {ord.insumosNecessarios.map((ins) => (
                                <Badge
                                  key={ins.id}
                                  variant="outline"
                                  onClick={() => handleToggleInsumoComprado(ord.id, ins.id)}
                                  className={`cursor-pointer text-[10px] px-2 py-0.5 ${
                                    ins.comprado
                                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 line-through"
                                      : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                  }`}
                                >
                                  {ins.comprado ? <Check className="w-3 h-3 mr-1" /> : null}
                                  {ins.quantidade ? `${ins.quantidade}x ` : ""}{ins.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          {saldoRestante > 0 ? (
                            <div>
                              <span className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide block">
                                {statusFin === "sinal_pago" ? "Resta Pagar:" : "A Cobrar (100%):"}
                              </span>
                              <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                                {formatarMoeda(saldoRestante)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Total: {formatarMoeda(ord.valorTotal)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">
                                Total Pago:
                              </span>
                              <div className="text-sm font-extrabold text-foreground font-mono">
                                {formatarMoeda(ord.valorTotal)}
                              </div>
                            </div>
                          )}
                          <span className="text-muted-foreground text-[11px] font-medium self-end">
                            {ord.tipoEntrega === "delivery" ? "🚚 Delivery" : "🏬 Retirada"}
                          </span>
                        </div>

                        <div className="flex justify-end items-center gap-1 pt-1">
                          {isPedidoIFood(ord) ? (
                            renderBotoesAcaoIFood(ord)
                          ) : ord.status === "entregue" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onEditarEncomenda(ord.id, { status: "pendente" });
                                toast.success("Pedido reaberto como pendente!");
                              }}
                              className="h-7 text-xs px-2 font-semibold text-muted-foreground"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reabrir
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onEditarEncomenda(ord.id, { status: "entregue" });
                                toast.success("Pedido marcado como entregue!");
                              }}
                              className="h-7 text-xs px-2 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold border-emerald-500/30"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Entregue
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnviarResumoWhatsApp(ord)}
                            className="h-7 text-xs px-2 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGerarPdfOrcamento(ord)}
                            className="h-7 text-xs px-2 font-bold"
                            title="Imprimir comanda térmica (80mm)"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDrawerOpen(false);
                              handleAbrirEdicao(ord);
                            }}
                            className="h-7 text-xs px-2 font-semibold"
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
      {/* 6. MODAL: CADASTRAR OU EDITAR ENCOMENDA */}
      {/* ========================================================================= */}
      <Dialog
        open={modalEncomendaOpen}
        onOpenChange={(open) => {
          setModalEncomendaOpen(open);
          if (!open) {
            resetFormularioEncomenda();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl sm:w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
              <CalendarDays className="w-5 h-5 text-primary shrink-0" />
              {editingId ? "Editar Encomenda" : "Cadastrar Nova Encomenda"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione o cliente, adicione os produtos do cardápio e vincule os insumos da encomenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEncomenda} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <div className="space-y-1 relative">
                <Label htmlFor="enc-nome" className="text-xs font-semibold flex items-center justify-between">
                  <span>Nome do Cliente *</span>
                  {clienteId && <span className="text-[10px] text-emerald-600 font-bold">✓ Cadastrado</span>}
                </Label>
                <Input
                  id="enc-nome"
                  placeholder="Digite para buscar ou cadastrar..."
                  value={clienteNome}
                  onChange={(e) => {
                    setClienteNome(e.target.value);
                    setClienteId(undefined);
                    setDropdownClientesAberto(true);
                  }}
                  onFocus={() => setDropdownClientesAberto(true)}
                  onBlur={() => setTimeout(() => setDropdownClientesAberto(false), 200)}
                  className="h-8 text-xs font-semibold"
                  required
                />

                {dropdownClientesAberto && sugestoesClientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-48 overflow-y-auto bg-popover bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-xl p-1 divide-y divide-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 block">
                      Clientes Cadastrados:
                    </span>
                    {sugestoesClientes.map((cli) => (
                      <div
                        key={cli.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelecionarCliente(cli);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-bold text-foreground">{cli.nome}</span>
                        <span className="text-[11px] font-mono text-emerald-600 font-bold">{cli.whatsapp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="enc-whats" className="text-xs font-semibold">WhatsApp (com DDD) *</Label>
                <Input
                  id="enc-whats"
                  placeholder="(11) 99999-9999"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(aplicarMascaraTelefone(e.target.value))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enc-data" className="text-xs font-semibold">Data da Entrega / Retirada *</Label>
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
                <Label htmlFor="enc-hora" className="text-xs font-semibold">Horário Previsto *</Label>
                <Input
                  id="enc-hora"
                  type="time"
                  value={horarioEntrega}
                  onChange={(e) => setHorarioEntrega(e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enc-status" className="text-xs font-semibold">Status do Pedido</Label>
                <Select value={statusEncomenda} onValueChange={(val: StatusEncomenda) => setStatusEncomenda(val)}>
                  <SelectTrigger id="enc-status" className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">🟡 Novo Pedido</SelectItem>
                    <SelectItem value="em_analise">🔍 Em Análise (Orçamento)</SelectItem>
                    <SelectItem value="aprovado">✨ Aprovado (Orçamento)</SelectItem>
                    <SelectItem value="confirmado">⚡ Confirmado</SelectItem>
                    <SelectItem value="pendente">⏳ Pendente</SelectItem>
                    <SelectItem value="em_producao">👨‍🍳 Em Produção</SelectItem>
                    <SelectItem value="pronta">📦 Pronta p/ Entrega</SelectItem>
                    <SelectItem value="entregue">🟢 Entregue (Concluído)</SelectItem>
                    <SelectItem value="cancelado">🔴 Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20 relative w-full overflow-visible">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-primary shrink-0" /> Itens do Pedido (Produtos / Doces) *
                </Label>
                <span className="text-[10px] text-muted-foreground">{itensTags.length} item(ns) selecionado(s)</span>
              </div>

              {/* INPUT DE BUSCA E BOTÃO ADICIONAR NO TOPO DO CARD */}
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite para buscar doce/bolo do cardápio (ex: Red Velvet, Brigadeiros)..."
                    value={buscaItemProduto}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBuscaItemProduto(val);
                      setDropdownItensAberto(val.trim().length > 0);
                    }}
                    onFocus={() => {
                      if (buscaItemProduto.trim().length > 0) {
                        setDropdownItensAberto(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setDropdownItensAberto(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdicionarItemPedido(buscaItemProduto);
                      }
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdicionarItemPedido(buscaItemProduto)}
                    disabled={!buscaItemProduto.trim()}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>

                {dropdownItensAberto && buscaItemProduto.trim().length > 0 && sugestoesProdutos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-52 overflow-y-auto bg-popover bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesProdutos.map((prod) => (
                      <div
                        key={prod.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAdicionarItemPedido(prod.nome, prod.preco, prod.id);
                        }}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {prod.fotoUrl && <img src={prod.fotoUrl} alt={prod.nome} className="w-6 h-6 rounded object-cover" />}
                          <span className="font-bold text-foreground">{prod.nome}</span>
                        </div>
                        <span className="font-mono font-black text-emerald-600">{formatarMoeda(prod.preco)}</span>
                      </div>
                    ))}
                    {buscaItemProduto.trim().length > 0 &&
                      !sugestoesProdutos.some((p) => p.nome.toLowerCase() === buscaItemProduto.trim().toLowerCase()) && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAdicionarItemPedido(buscaItemProduto);
                          }}
                          className="p-2.5 hover:bg-primary/10 cursor-pointer rounded-lg text-xs text-primary font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar "{buscaItemProduto}" como item personalizado
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* LISTA DE PRODUTOS SELECIONADOS ABAIXO DO INPUT */}
              <div className="flex flex-col gap-2 min-h-[36px] p-2 bg-background rounded-lg border border-border divide-y divide-border/40 w-full overflow-hidden">
                {itensTags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic p-2">
                    Nenhum produto adicionado. Digite acima para selecionar do cardápio.
                  </span>
                ) : (
                  itensTags.map((it) => {
                    const precoUnit =
                      it.precoUnitario ||
                      listaProdutos.find((p) => p.id === it.produtoId || p.nome.toLowerCase() === it.nome.toLowerCase())?.preco ||
                      0;
                    const subtotalItem = (it.quantidade || 1) * (it.precoUnitario || precoUnit || 0);

                    return (
                      <div
                        key={it.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 sm:px-3 bg-muted/20 hover:bg-muted/40 rounded-xl transition-colors w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
                          <Cake className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-bold text-xs text-foreground truncate">{it.nome}</span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t border-border/30 sm:border-t-0">
                          {/* QTD Input */}
                          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-input shadow-2xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Qtd:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={it.quantidade === 0 ? "" : it.quantidade}
                              onKeyDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const valLimpo = e.target.value.replace(/\D/g, "");
                                const num = valLimpo === "" ? 0 : Number(valLimpo);
                                handleAlterarQuantidadeItem(it.id, num);
                              }}
                              onBlur={() => {
                                if (!it.quantidade || it.quantidade <= 0) {
                                  handleAlterarQuantidadeItem(it.id, 1);
                                }
                              }}
                              className="w-8 h-5 text-center text-xs font-bold font-mono bg-transparent outline-none border-none focus:ring-0 text-foreground"
                            />
                          </div>

                          {/* Preço Unitário Editável (Mascara Moeda BRL) */}
                          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-input shadow-2xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Unit:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="R$ 0,00"
                              value={
                                it.precoUnitario !== undefined && it.precoUnitario > 0
                                  ? aplicarMascaraMoedaInput(String(Math.round(it.precoUnitario * 100)))
                                  : precoUnit > 0
                                  ? aplicarMascaraMoedaInput(String(Math.round(precoUnit * 100)))
                                  : ""
                              }
                              onKeyDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const valMascara = aplicarMascaraMoedaInput(e.target.value);
                                const num = converterMoedaInputParaNumero(valMascara);
                                handleAlterarPrecoUnitarioItem(it.id, num);
                              }}
                              className="w-20 h-5 text-right text-xs font-bold font-mono bg-transparent outline-none border-none focus:ring-0 text-foreground"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="text-right min-w-[70px]">
                            <div className="text-xs font-extrabold text-purple-700 dark:text-purple-300 font-mono">
                              {formatarMoeda(subtotalItem)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoverItemPedido(it.id)}
                            className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remover item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* PAINEL DE SUGESTÃO DE COMPRA AUTOMÁTICA DE INSUMOS DA FICHA TÉCNICA */}
            {sugestaoCompraInsumos.length > 0 && (
              <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-emerald-600 shrink-0" /> Sugestão de Compra de Insumos para este Pedido
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Calculado automaticamente a partir das Fichas Técnicas dos produtos selecionados.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopiarListaSugestaoInsumos}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 rounded-xl shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" /> 📋 Copiar Lista
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sugestaoCompraInsumos.map((sug, idx) => (
                      <div key={idx} className="p-2.5 bg-background border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-foreground truncate">{sug.insumoNome}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Qtd: <strong className="text-foreground font-bold">{sug.quantidadeTotal} {sug.unidadeMedida}</strong>
                            {sug.produtosRelacionados.length > 0 && ` • (${sug.produtosRelacionados.join(", ")})`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border-emerald-500/30 shrink-0">
                          ~{(Number(sug.custoEstimadoTotal) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VALOR TOTAL E TAXA DE ENTREGA DA ENCOMENDA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="space-y-1">
                <Label htmlFor="enc-valor" className="text-xs font-bold text-foreground">Valor Total da Encomenda (R$) *</Label>
                <Input
                  id="enc-valor"
                  placeholder="R$ 0,00"
                  value={valorTotalFormatado}
                  onChange={(e) => setValorTotalFormatado(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-9 text-sm font-black text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="enc-taxa-frete" className="text-xs font-bold text-foreground">Taxa de Entrega Customizada (R$)</Label>
                <Input
                  id="enc-taxa-frete"
                  placeholder="R$ 0,00"
                  value={taxaEntregaFormatada}
                  onChange={(e) => setTaxaEntregaFormatada(aplicarMascaraMoedaInput(e.target.value))}
                  className="h-9 text-sm font-semibold text-foreground"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOrcamento}
                    onChange={(e) => setIsOrcamento(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    📝 Tratar este pedido como Solicitação de Orçamento
                  </span>
                </label>
              </div>
            </div>

            {/* CARD VISUAL: HISTÓRICO DE PAGAMENTOS E PARCELAS */}
            <div className="space-y-3 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Histórico de Pagamentos &amp; Parcelas
                  </h4>
                </div>

                {/* REGRA DE QUITAÇÃO: TAG PAGO */}
                {saldoDevedorCalculado <= 0 && valorTotalNum > 0 ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 shadow-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> TOTALMENTE PAGO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    {historicoPagamentos.length} registro(s)
                  </Badge>
                )}
              </div>

              {/* DESTAQUE DE ENTRADA / SINAL */}
              {historicoPagamentos.length > 0 && (
                <div className="flex items-center justify-between p-2 px-3 rounded-lg bg-muted/40 text-xs border border-border">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${primeiraParcelaEntradaQuitada ? "text-emerald-600" : "text-amber-500"}`} />
                    Entrada / Sinal (1ª Parcela):
                  </span>
                  <Badge className={primeiraParcelaEntradaQuitada ? "bg-emerald-600 text-white font-extrabold text-[10px]" : "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-500/30 text-[10px]"}>
                    {primeiraParcelaEntradaQuitada ? "✓ Quitada" : "⌛ Pendente"}
                  </Badge>
                </div>
              )}

              {/* RENDERIZAÇÃO DA LISTA LINHA POR LINHA */}
              {historicoPagamentos.length > 0 ? (
                <div className="divide-y divide-border/60 bg-muted/20 rounded-xl border border-border overflow-hidden">
                  {historicoPagamentos.map((pag, idx) => {
                    const isPaid = pag.status === undefined || pag.status === "pago";
                    const isEntrada = pag.isEntrada || idx === 0;

                    return (
                      <div
                        key={pag.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-foreground font-bold text-xs">
                              📅 {pag.data ? String(pag.data || "").split("-").reverse().join("/") : "-"}
                            </span>
                            {isEntrada && (
                              <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold px-1.5 py-0">
                                Entrada / Sinal
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] uppercase font-mono text-muted-foreground px-1.5 py-0">
                              {pag.formaPagamento || "Pix"}
                            </Badge>
                          </div>
                          {pag.observacao && (
                            <p className="text-[11px] text-muted-foreground italic truncate">
                              ({pag.observacao})
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5">
                          <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatarMoeda(pag.valor)}
                          </span>

                          {/* TOGGLE / INTERACTIVE STATUS BUTTON */}
                          {isPaid ? (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 shadow-2xs">
                                ✓ Pago {pag.dataEfetiva ? `em ${String(pag.dataEfetiva || "").split("-").reverse().join("/")}` : ""}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReverterPagamento(pag)}
                                className="h-7 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 px-2 rounded-lg"
                                title="Reverter para Pendente"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" /> Desfazer
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAbrirMarcarComoPago(pag)}
                              className="h-7 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 rounded-lg shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Marcar como Pago
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverPagamentoHistorico(pag.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-full shrink-0"
                            title="Remover pagamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground italic bg-muted/10 rounded-xl border border-dashed border-border">
                  Nenhum pagamento registrado nesta encomenda.
                </div>
              )}

              {/* FLUXO DE ADICIONAR NOVO PAGAMENTO */}
              {saldoDevedorCalculado > 0 && (
                <div>
                  {!mostrarFormNovoPagamento ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFormNovoPagamento(true)}
                      className="w-full text-xs font-bold border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-600 h-9"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> + Agendar ou Adicionar Pagamento
                    </Button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Novo Registro de Pagamento
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarFormNovoPagamento(false)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label htmlFor="pay-val" className="text-[11px] font-semibold text-muted-foreground">
                            Valor (R$) *
                          </Label>
                          <Input
                            id="pay-val"
                            placeholder="R$ 0,00"
                            value={novoPagamentoValorFormatado}
                            onChange={(e) => setNovoPagamentoValorFormatado(aplicarMascaraMoedaInput(e.target.value))}
                            className="h-8 text-xs font-bold font-mono bg-background"
                            autoFocus
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="pay-date" className="text-[11px] font-semibold text-muted-foreground">
                            Data Acordada / Prevista *
                          </Label>
                          <Input
                            id="pay-date"
                            type="date"
                            value={novoPagamentoData}
                            onChange={(e) => setNovoPagamentoData(e.target.value)}
                            className="h-8 text-xs font-mono font-bold bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Forma de Pagamento
                          </Label>
                          <Select value={novoPagamentoForma} onValueChange={setNovoPagamentoForma}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                              <SelectItem value="Transferência / TED">Transferência / TED</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Status Inicial
                          </Label>
                          <Select value={novoPagamentoStatus} onValueChange={(val: any) => setNovoPagamentoStatus(val)}>
                            <SelectTrigger className="h-8 text-xs bg-background font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pago" className="text-emerald-600 font-bold">✓ Pago (Quitado)</SelectItem>
                              <SelectItem value="pendente" className="text-amber-600 font-bold">⌛ Pendente (Agendado)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {novoPagamentoStatus === "pago" && (
                        <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                          <Label htmlFor="pay-date-efetiva" className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Data Efetiva do Recebimento
                          </Label>
                          <Input
                            id="pay-date-efetiva"
                            type="date"
                            value={novoPagamentoDataEfetiva}
                            onChange={(e) => setNovoPagamentoDataEfetiva(e.target.value)}
                            className="h-8 text-xs font-mono font-bold bg-background"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarFormNovoPagamento(false)}
                          className="text-xs h-7 text-muted-foreground"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleAdicionarPagamentoHistorico();
                            setMostrarFormNovoPagamento(false);
                          }}
                          className="text-xs h-7 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Salvar Pagamento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAINEL DE RESUMO DINÂMICO (MATEMÁTICA E QUITAÇÃO) */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    Total Pago
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200">
                    {formatarMoeda(totalPagoCalculado)}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl text-center border ${
                    saldoDevedorCalculado <= 0
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-rose-500/10 border-rose-500/25"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                      saldoDevedorCalculado <= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    Falta Pagar
                  </span>
                  <span
                    className={`text-sm font-black font-mono ${
                      saldoDevedorCalculado <= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    {formatarMoeda(saldoDevedorCalculado)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Insumos Necessários
                </Label>
                <span className="text-[10px] text-muted-foreground">{insumosTags.length} insumo(s)</span>
              </div>

              {/* INPUT DE BUSCA DE INSUMOS E BOTÃO ADICIONAR NO TOPO DO CARD */}
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar insumo (ex: Leite Condensado, Chantilly, Nutella)..."
                    value={buscaTagInsumo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBuscaTagInsumo(val);
                      setDropdownInsumosAberto(val.trim().length > 0);
                    }}
                    onFocus={() => {
                      if (buscaTagInsumo.trim().length > 0) {
                        setDropdownInsumosAberto(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdicionarInsumo(buscaTagInsumo);
                      }
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdicionarInsumo(buscaTagInsumo)}
                    disabled={!buscaTagInsumo.trim()}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>

                {dropdownInsumosAberto && buscaTagInsumo.trim().length > 0 && sugestoesInsumos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 divide-y divide-border/40">
                    {sugestoesInsumos.map((sug) => (
                      <div
                        key={sug.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAdicionarInsumo(sug.nome);
                        }}
                        className="p-2 hover:bg-amber-500/15 cursor-pointer rounded-lg text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold text-foreground">{sug.nome}</span>
                        <span className="text-[10px] text-muted-foreground">{sug.categoria}</span>
                      </div>
                    ))}
                    {buscaTagInsumo.trim().length > 0 &&
                      !sugestoesInsumos.some((s) => s.nome.toLowerCase() === buscaTagInsumo.trim().toLowerCase()) && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAdicionarInsumo(buscaTagInsumo);
                          }}
                          className="p-2.5 hover:bg-amber-500/15 cursor-pointer rounded-lg text-xs text-primary font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Criar nova tag "{buscaTagInsumo}"
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* LISTA DE INSUMOS VINCULADOS ABAIXO DO INPUT */}
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-background rounded-lg border border-border">
                {insumosTags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic">
                    Nenhum insumo vinculado. Digite acima para buscar no catálogo de insumos.
                  </span>
                ) : (
                  insumosTags.map((t) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-2xs"
                    >
                      <span className="truncate max-w-[150px]">{t.nome}</span>
                      <span className="text-muted-foreground/60">|</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Qtd:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={t.quantidade ?? 1}
                          onChange={(e) => handleAlterarQuantidadeInsumo(t.id, parseFloat(e.target.value.replace(",", ".")) || 1)}
                          className="w-12 h-5 px-1 text-xs font-mono font-bold bg-background border border-amber-500/40 rounded text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverInsumo(t.id)}
                        className="hover:text-rose-600 ml-1 text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Modalidade de Entrega</Label>
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
                <Label htmlFor="enc-end" className="text-xs font-semibold">Endereço de Entrega</Label>
                <Input
                  id="enc-end"
                  placeholder="Rua, Número, Bairro, Complemento"
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="enc-obs" className="text-xs font-semibold">Observações / Detalhes</Label>
              <Input
                id="enc-obs"
                placeholder="Ex: Entregar com cuidado, embalagem especial..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* PERSONALIZAÇÃO ESPECIAL DO PEDIDO (TOPO DE BOLO E VELA) */}
            <div className="p-4 border border-purple-500/25 bg-purple-500/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" /> Personalização Especial do Pedido
                </h4>
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold">
                  Opcional
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* TOPO DE BOLO */}
                <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chkTopoBolo"
                      checked={temTopoBolo}
                      onCheckedChange={(checked) => {
                        setTemTopoBolo(!!checked);
                        if (!checked) setDetalhesTopoBolo("");
                      }}
                    />
                    <Label htmlFor="chkTopoBolo" className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer text-foreground">
                      <Cake className="w-4 h-4 text-purple-600 shrink-0" /> [ ] Tem Topo de Bolo?
                    </Label>
                  </div>

                  {temTopoBolo && (
                    <div className="pt-1.5 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Detalhes do Topo de Bolo (Tema, Nome, Idade)
                      </Label>
                      <Input
                        placeholder="Ex: Tema Patrulha Canina, Nome Gabriel, 5 anos"
                        value={detalhesTopoBolo}
                        onChange={(e) => setDetalhesTopoBolo(e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* VELA */}
                <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chkVela"
                      checked={temVela}
                      onCheckedChange={(checked) => {
                        setTemVela(!!checked);
                        if (!checked) setDetalhesVela("");
                      }}
                    />
                    <Label htmlFor="chkVela" className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer text-foreground">
                      <Flame className="w-4 h-4 text-amber-600 shrink-0" /> [ ] Tem Vela?
                    </Label>
                  </div>

                  {temVela && (
                    <div className="pt-1.5 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Numeração ou Tipo da Vela
                      </Label>
                      <Input
                        placeholder="Ex: Número 3, Vela Sparkler, Vela Glitter Rosa"
                        value={detalhesVela}
                        onChange={(e) => setDetalhesVela(e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
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
      {/* 7. MODAL: BLOQUEAR DATA NA AGENDA */}
      {/* ========================================================================= */}
      <Dialog open={modalBloqueioOpen} onOpenChange={setModalBloqueioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Lock className="w-5 h-5 text-rose-500" /> Bloquear Data na Agenda
            </DialogTitle>
            <DialogDescription className="text-xs">
              Datas bloqueadas ficam marcadas como "Agenda Fechada" no calendário.
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

            {datasBloqueadas.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border/50">
                <Label className="text-[11px] font-bold text-muted-foreground">Datas Já Bloqueadas:</Label>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {datasBloqueadas.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-xs">
                      <span className="font-mono font-bold text-foreground">
                        {b.data ? String(b.data || "").split("-").reverse().join("/") : ""} ({b.motivo})
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

      {/* MODAL DE SELEÇÃO RÁPIDA DE CONTA PIX PARA ENVIO */}
      <Dialog open={modalSelecaoPixOpen} onOpenChange={setModalSelecaoPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Em qual conta você deseja receber este Pix?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione a conta bancária / chave Pix para a qual o cliente enviará o pagamento deste pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {(profile?.contasPix || []).map((conta) => (
              <div
                key={conta.id}
                onClick={() => {
                  if (encomendaParaEnvioPix) {
                    executarEnvioWhatsAppComContaPix(encomendaParaEnvioPix, conta);
                    setModalSelecaoPixOpen(false);
                  }
                }}
                className="p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      👤 {conta.favorecido}
                    </span>
                    {conta.isDefault && (
                      <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono font-semibold text-muted-foreground">
                    🔑 {conta.chave} <span className="uppercase text-[10px]">({conta.tipo})</span>
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  Selecionar
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalSelecaoPixOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHES DA ENCOMENDA (SOMENTE LEITURA) */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="w-[96vw] max-w-4xl lg:max-w-5xl max-h-[90vh] p-4 sm:p-6 flex flex-col gap-0 rounded-2xl sm:rounded-3xl border border-border shadow-2xl bg-card overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-border/60 text-left">
            <DialogTitle className="text-base sm:text-lg font-extrabold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pr-8">
              <span className="flex items-center gap-2 text-foreground">
                <Package className="w-5 h-5 text-primary" /> Detalhes do Pedido
              </span>
              {encomendaDetalhes && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isPedidoIFood(encomendaDetalhes) ? (
                    renderBotoesAcaoIFood(encomendaDetalhes)
                  ) : encomendaDetalhes.status === "entregue" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await onEditarEncomenda(encomendaDetalhes.id, { status: "pendente" });
                        setEncomendaDetalhes({ ...encomendaDetalhes, status: "pendente" });
                        toast.success("Pedido reaberto como pendente!");
                      }}
                      className="h-7 px-2 text-xs font-semibold text-muted-foreground border-border"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reabrir
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await onEditarEncomenda(encomendaDetalhes.id, { status: "entregue" });
                        setEncomendaDetalhes({ ...encomendaDetalhes, status: "entregue" });
                        toast.success("Pedido marcado como entregue!");
                      }}
                      className="h-7 px-2 text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Marcar Entregue
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = encomendaDetalhes;
                      setModalDetalhesOpen(false);
                      if (target) {
                        handleAbrirEdicao(target);
                      }
                    }}
                    title="Editar esta encomenda"
                    className="h-7 px-2 text-xs font-bold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40 border border-purple-200"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  {renderizarBadgeStatus(encomendaDetalhes.status, isOrcamentoPedido(encomendaDetalhes))}
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Visualização completa de cliente, itens solicitados, notinhas/insumos vinculados e histórico de pagamentos.
            </DialogDescription>
          </DialogHeader>

          {encomendaDetalhes && (
            <div className="flex-1 overflow-y-auto py-4 pr-1 sm:pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* COLUNA ESQUERDA: CLIENTE, ITENS & RECEITA (7 cols em desktop) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* BLOCO 1: DADOS DO CLIENTE & DATA/ENTREGA */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3 shadow-2xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Cliente</span>
                        <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                          <User className="w-4 h-4 text-primary" /> {encomendaDetalhes.clienteNome}
                        </span>
                        {encomendaDetalhes.clienteWhatsapp && (
                          <span className="text-muted-foreground text-[11px] font-mono block mt-0.5">
                            📱 {encomendaDetalhes.clienteWhatsapp}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Data de Entrega / Retirada</span>
                          <span className="font-bold text-foreground text-xs flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                            <CalendarDays className="w-4 h-4 text-purple-600 shrink-0" />
                            {encomendaDetalhes.dataEntrega ? String(encomendaDetalhes.dataEntrega || "").split("-").reverse().join("/") : (encomendaDetalhes.origem === "iFood" ? "Data a confirmar" : "A confirmar")} às {encomendaDetalhes.horarioEntrega || (encomendaDetalhes.origem === "iFood" ? "Hora a confirmar" : "14:00")}
                          </span>
                          <span className="text-muted-foreground text-[11px] block mt-0.5 font-medium">
                            {encomendaDetalhes.tipoEntrega === "delivery"
                              ? `🚚 Entrega: ${encomendaDetalhes.enderecoEntrega || "A combinar"}`
                              : "🏬 Retirada no Balcão"}
                          </span>
                        </div>

                        {encomendaDetalhes.createdAt && (
                          <div className="pt-0.5 text-[10.5px] text-muted-foreground">
                            <span className="font-medium">🕒 Pedido feito em:</span> {formatarDataHoraCriacao(encomendaDetalhes.createdAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" /> Forma de Pagamento Escolhida:
                      </span>
                      <span className="font-bold text-foreground">
                        {obterMetodoPagamentoFormatado(encomendaDetalhes)}
                      </span>
                    </div>

                    {encomendaDetalhes.observacoes && (
                      <div className="pt-2 border-t border-border/50 text-xs">
                        <span className="font-bold text-foreground">📝 Observações:</span>{" "}
                        <span className="text-muted-foreground italic">{encomendaDetalhes.observacoes}</span>
                      </div>
                    )}

                    {(encomendaDetalhes.temTopoBolo || encomendaDetalhes.temVela) && (
                      <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                        <span className="font-bold text-foreground block">✨ Personalização Especial:</span>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {encomendaDetalhes.temTopoBolo && (
                            <Badge variant="outline" className="text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                              🎂 Topo: {encomendaDetalhes.detalhesTopoBolo || "Sim"}
                            </Badge>
                          )}
                          {encomendaDetalhes.temVela && (
                            <Badge variant="outline" className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                              🕯️ Vela: {encomendaDetalhes.detalhesVela || "Sim"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BLOCO 2: ITENS DO PEDIDO */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Cake className="w-4 h-4 text-purple-600" /> Itens Pedidos pelo Cliente
                    </h4>
                    {encomendaDetalhes.itensDetalhes && encomendaDetalhes.itensDetalhes.length > 0 ? (
                      <div className="p-3.5 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                        {encomendaDetalhes.itensDetalhes.map((it: any, idx: number) => {
                          const opcaoNome =
                            (Array.isArray(it.opcoes_selecionadas) && it.opcoes_selecionadas.length > 0
                              ? it.opcoes_selecionadas
                                  .map((o: any) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
                                  .join(", ")
                              : null) ||
                            it.opcaoNome ||
                            it.opcao_selecionada?.nome;
                          const precoUnit = it.precoUnitario ?? it.preco ?? it.valorUnitario ?? 0;
                          const qtd = it.quantidade || 1;

                          const isCustomItem =
                            it.categoria === "Orçamento Personalizado" ||
                            (it.nome && (it.nome.includes("Sob Medida") || it.nome.includes("Orçamento") || it.nome.startsWith("📝"))) ||
                            Boolean(it.descricao && (it.descricao.includes("•") || it.descricao.includes("Sabores/Recheios")));

                          const fotoItem = it.fotoUrl || it.foto_url || it.referenceImage || it.imagem_referencia || "";

                          // Linhas de descrição customizada (separadas por \n ou •)
                          const descLinhas = typeof it.descricao === "string" ? it.descricao.split("\n").filter((l: string) => l.trim()) : [];

                          return (
                            <div key={idx} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                                <div className="flex items-center gap-2">
                                  {isCustomItem && <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
                                  <span className="font-extrabold text-foreground text-sm">
                                    {qtd}x {it.nome}
                                  </span>
                                  {isCustomItem && (
                                    <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9px] font-black">
                                      SOB MEDIDA
                                    </Badge>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-muted-foreground self-end sm:self-auto">
                                  {precoUnit > 0 ? formatarMoeda(precoUnit * qtd) : "Sob Consulta"}
                                </span>
                              </div>

                              {/* Sabores / Opções selecionadas normais */}
                              {opcaoNome && (
                                <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                  <span className="bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 inline-block">
                                    Sabores / Opções: {opcaoNome}
                                  </span>
                                </div>
                              )}

                              {/* Detalhes do Orçamento Personalizado */}
                              {descLinhas.length > 0 && (
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 text-amber-950 dark:text-amber-200">
                                  <p className="font-black text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1 pb-0.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Especificações da Personalização:
                                  </p>
                                  {descLinhas.map((linha: string, lIdx: number) => (
                                    <p key={lIdx} className="font-medium leading-relaxed pl-1 text-[11.5px]">
                                      {linha}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Foto de Referência do Item */}
                              {fotoItem && (
                                <div className="pt-1.5 flex items-start gap-3 p-2.5 rounded-xl bg-background border border-amber-500/20">
                                  <div
                                    onClick={() => setFotoExpandidaModalUrl(fotoItem)}
                                    className="relative group cursor-pointer shrink-0"
                                  >
                                    <img
                                      src={fotoItem}
                                      alt="Foto de Referência"
                                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-border shadow-xs transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold">
                                      <Maximize2 className="w-4 h-4" />
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-xs flex-1 min-w-0">
                                    <span className="font-bold text-foreground flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Imagem Anexa / Referência
                                    </span>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Modelo enviado pelo cliente para esta opção.
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFotoExpandidaModalUrl(fotoItem)}
                                        className="h-7 px-2.5 text-[11px] font-bold border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-lg cursor-pointer"
                                      >
                                        <Maximize2 className="w-3 h-3 mr-1" /> Ampliar
                                      </Button>
                                      {fotoItem.startsWith("http") && (
                                        <a
                                          href={fotoItem}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                        >
                                          <ExternalLink className="w-3 h-3" /> Abrir Link
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border border-border bg-card text-xs text-muted-foreground font-medium">
                        {encomendaDetalhes.itens || "Nenhum detalhe de item informado."}
                      </div>
                    )}
                  </div>

                  {/* BLOCO DEDICADO DE FOTO DE REFERÊNCIA / MODELO DO CLIENTE */}
                  {(() => {
                    const fotos = extrairFotosReferenciaPedido(encomendaDetalhes);
                    if (fotos.length === 0) return null;

                    return (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-amber-600" /> Foto de Referência / Modelo da Festa (Cliente)
                          </h4>
                          <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">
                            {fotos.length} Arquivo(s)
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {fotos.map((urlFoto, fIdx) => (
                            <div key={fIdx} className="flex items-start gap-3 p-2.5 rounded-xl bg-background border border-amber-500/20 shadow-2xs">
                              <div
                                onClick={() => setFotoExpandidaModalUrl(urlFoto)}
                                className="relative group cursor-pointer shrink-0"
                              >
                                <img
                                  src={urlFoto}
                                  alt={`Referência ${fIdx + 1}`}
                                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-border transition-transform group-hover:scale-105 shadow-xs"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Maximize2 className="w-4 h-4" />
                                </div>
                              </div>

                              <div className="space-y-1 min-w-0 flex-1">
                                <span className="text-xs font-extrabold text-foreground block truncate">
                                  Modelo de Referência #{fIdx + 1}
                                </span>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Imagem enviada pelo cliente durante a solicitação do orçamento.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFotoExpandidaModalUrl(urlFoto)}
                                    className="h-7 px-2.5 text-[11px] font-bold border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-lg cursor-pointer"
                                  >
                                    <Maximize2 className="w-3 h-3 mr-1" /> Ampliar Foto
                                  </Button>
                                  {urlFoto.startsWith("http") && (
                                    <a
                                      href={urlFoto}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" /> Link
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* BLOCO 2.5: RECEITA & INGREDIENTES CONSOLIDADOS */}
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-4 h-4 text-purple-600" /> Receita Consolidada do Pedido
                      </h4>
                      <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                        Ficha Técnica &amp; Receita
                      </Badge>
                    </div>

                    {receitaConsolidadaPedido.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {receitaConsolidadaPedido.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-purple-200/50">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                              {ing.insumoNome}
                            </span>
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                              {ing.quantidadeTotal} {ing.unidadeMedida}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic px-1">
                        Cadastre a receita dos produtos no Cardápio para ver os ingredientes consolidados aqui.
                      </p>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: FINANCEIRO & INSUMOS (5 cols em desktop) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* BLOCO 4: FINANCEIRO & HISTÓRICO DE PAGAMENTOS */}
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {(encomendaDetalhes.is_orcamento || (encomendaDetalhes as any).origem_pagamento === "orcamento" || (encomendaDetalhes as any).metodo_pagamento === "Orçamento") ? "Valor Total Orçado:" : "Valor Total do Pedido:"}
                      </span>
                      <div className="flex items-center gap-2">
                        {renderizarBadgePagamento(encomendaDetalhes)}
                        <span className="font-mono font-extrabold text-base text-foreground">
                          {formatarMoeda(encomendaDetalhes.valorTotal)}
                        </span>
                      </div>
                    </div>

                    {encomendaDetalhes.taxaEntrega !== undefined && Number(encomendaDetalhes.taxaEntrega) > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-500/10 text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Truck className="w-3.5 h-3.5 text-primary shrink-0" /> Taxa de Entrega Inclusa:
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {formatarMoeda(encomendaDetalhes.taxaEntrega)}
                        </span>
                      </div>
                    )}

                    {/* HISTÓRICO DE PAGAMENTOS */}
                    <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block">
                          Pagamentos Registrados:
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          Total Quitado: {formatarMoeda(calcularTotalPagoEncomenda(encomendaDetalhes))}
                        </span>
                      </div>
                      {encomendaDetalhes.historicoPagamentos && encomendaDetalhes.historicoPagamentos.length > 0 ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                          {encomendaDetalhes.historicoPagamentos.map((pag, idx) => {
                            const isPaid = pag.pago === true || pag.is_paid === true || pag.status === "pago";
                            const isEntrada = pag.isEntrada || idx === 0;
                            const dataPrev = pag.data ? String(pag.data || "").split("-").reverse().join("/") : "-";
                            const dataEf = pag.dataEfetiva || pag.data_pagamento;
                            const dataEfFmt = dataEf ? String(dataEf || "").split("-").reverse().join("/") : dataPrev;

                            return (
                              <div key={pag.id || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/60">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-[11px] font-semibold text-foreground">
                                      📅 {dataPrev}
                                    </span>
                                    {isEntrada && (
                                      <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold px-1.5 py-0">
                                        Entrada / Sinal
                                      </Badge>
                                    )}
                                    {pag.formaPagamento && (
                                      <Badge variant="outline" className="text-[9px] uppercase font-mono text-muted-foreground px-1.5 py-0">
                                        {pag.formaPagamento}
                                      </Badge>
                                    )}
                                  </div>
                                  {pag.observacao && <span className="text-[10px] text-muted-foreground block">({pag.observacao})</span>}
                                </div>

                                <div className="text-right flex items-center gap-2">
                                  <span className={`font-mono font-bold text-xs ${isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {formatarMoeda(pag.valor)}
                                  </span>
                                  {isPaid ? (
                                    <Badge className="bg-emerald-600 text-white font-extrabold text-[9px] px-1.5 py-0">
                                      ✓ Pago {dataEfFmt ? `em ${dataEfFmt}` : ""}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold text-[9px] px-1.5 py-0">
                                      ⌛ Pendente
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhum pagamento registrado até o momento.</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-500/20 font-bold">
                      <span>Saldo Devedor Restante:</span>
                      <span className={Math.max(0, encomendaDetalhes.valorTotal - calcularTotalPagoEncomenda(encomendaDetalhes)) > 0 ? "text-rose-600 font-mono text-sm" : "text-emerald-600 font-mono text-sm"}>
                        {formatarMoeda(Math.max(0, encomendaDetalhes.valorTotal - calcularTotalPagoEncomenda(encomendaDetalhes)))}
                      </span>
                    </div>
                  </div>

                  {/* BLOCO 3: INSUMOS NECESSÁRIOS / NOTINHAS VINCULADAS */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" /> Insumos &amp; Compras da Encomenda
                    </h4>
                    {encomendaDetalhes.insumosNecessarios && encomendaDetalhes.insumosNecessarios.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-border bg-card shadow-2xs">
                        {encomendaDetalhes.insumosNecessarios.map((ins, idx) => (
                          <Badge key={idx} variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            {ins.comprado ? "✓ " : "• "} {ins.quantidade ? `${ins.quantidade} ` : ""}{ins.nome}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic px-1">Nenhum insumo ou notinha vinculado ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/60 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDetalhesOpen(false)}
                className="text-xs h-9 px-4 rounded-xl border-border hover:bg-muted font-semibold"
              >
                Fechar
              </Button>
              {encomendaDetalhes && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = encomendaDetalhes;
                    setModalDetalhesOpen(false);
                    if (target) {
                      handleAbrirEdicao(target);
                    }
                  }}
                  className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-950/40 h-9 px-4 rounded-xl"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar Pedido
                </Button>
              )}
            </div>

            {encomendaDetalhes && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleGerarOrcamentoPDF(encomendaDetalhes);
                  }}
                  title="Gerar e baixar o Orçamento em PDF A4 completo"
                  className="text-xs font-bold border-purple-300 text-purple-800 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 h-9 px-3.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>📄 Orçamento em PDF</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      handleGerarPdfOrcamento(encomendaDetalhes);
                      toast.success("Comanda de impressão aberta!");
                    } catch (err) {
                      console.error("Erro ao imprimir:", err);
                      toast.error("Erro ao abrir comanda.");
                    }
                  }}
                  title="Imprimir comanda para impressoras térmicas (80mm/58mm)"
                  className="text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 h-9 px-3.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>🖨️ Impressão Térmica</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setModalDetalhesOpen(false);
                    handleEnviarResumoWhatsApp(encomendaDetalhes);
                  }}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{(encomendaDetalhes.is_orcamento || (encomendaDetalhes as any).origem_pagamento === "orcamento" || (encomendaDetalhes as any).metodo_pagamento === "Orçamento") ? "WhatsApp Orçamento" : "WhatsApp Resumo"}</span>
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: MARCAR PAGAMENTO COMO PAGO (CONFIRMAR DATA EFETIVA) */}
      <Dialog open={modalMarcarPagoOpen} onOpenChange={setModalMarcarPagoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Confirmar Pagamento Recebido
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a Data Efetiva em que o valor de {itemMarcarPagoTarget ? formatarMoeda(itemMarcarPagoTarget.valor) : ""} foi pago/creditado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {itemMarcarPagoTarget && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Data Acordada / Prevista:</span>
                  <span className="font-mono font-bold">{itemMarcarPagoTarget.data ? String(itemMarcarPagoTarget.data || "").split("-").reverse().join("/") : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Forma de Pagamento:</span>
                  <span className="font-bold uppercase">{itemMarcarPagoTarget.formaPagamento || "Pix"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Valor da Parcela:</span>
                  <span className="font-mono font-extrabold text-emerald-600">{formatarMoeda(itemMarcarPagoTarget.valor)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="date-efetiva-confirm" className="text-xs font-bold">
                Data Efetiva do Pagamento *
              </Label>
              <Input
                id="date-efetiva-confirm"
                type="date"
                value={dataEfetivaMarcarPago}
                onChange={(e) => setDataEfetivaMarcarPago(e.target.value)}
                className="font-mono font-bold text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Por padrão, sugerimos a data de hoje. Você pode alterar para a data do extrato bancário.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalMarcarPagoOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarMarcarComoPago}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-4 h-4 mr-1" /> Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RELATÓRIO GERAL DE VENDAS (RESUMO POR PERÍODO / DATA / MÊS) */}
      <Dialog open={modalRelatorioVendasOpen} onOpenChange={setModalRelatorioVendasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <FileText className="w-5 h-5 text-purple-600" /> Relatório Geral de Vendas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visão consolidada de faturamento, fatias de mercado por origem e formas de pagamento para o período selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Banner de Período Ativo */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-900 dark:text-purple-200">
                📌 Período Selecionado:{" "}
                <span className="font-extrabold underline">
                  {filtroPeriodo === "hoje"
                    ? `Hoje (${new Date().toLocaleDateString("pt-BR")})`
                    : filtroPeriodo === "data_especifica"
                    ? `Data (${dataFiltroEspecifica.split("-").reverse().join("/")})`
                    : filtroPeriodo === "mes_atual"
                    ? `Mês Atual (${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})`
                    : filtroPeriodo === "mes_especifico"
                    ? `Mês (${mesFiltroEspecifico})`
                    : "Todos os Períodos"}
                </span>
              </span>
              <Badge variant="outline" className="font-mono text-purple-700 dark:text-purple-300 border-purple-300">
                {relatorioVendasConsolidado.qtdTotal} vendas
              </Badge>
            </div>

            {/* Cards de Métricas Financeiras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">Faturamento Total</span>
                <span className="text-lg font-mono font-extrabold text-purple-950 dark:text-purple-100">
                  {formatarMoeda(relatorioVendasConsolidado.totalFaturado)}
                </span>
              </Card>
              <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">Total Quitado / Recebido</span>
                <span className="text-lg font-mono font-extrabold text-emerald-950 dark:text-emerald-100">
                  {formatarMoeda(relatorioVendasConsolidado.totalQuitado)}
                </span>
              </Card>
              <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">Saldo Pendente</span>
                <span className="text-lg font-mono font-extrabold text-rose-950 dark:text-rose-100">
                  {formatarMoeda(relatorioVendasConsolidado.totalPendente)}
                </span>
              </Card>
            </div>

            {/* Vendas por Origem */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-primary" /> Vendas por Origem / Canal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(relatorioVendasConsolidado.porOrigem).map(([k, v]) => {
                  const nomeOrig =
                    k === "pdv" ? "Balcão / PDV" : k === "cardapio" ? "Meu Cardápio" : k === "ifood" ? "iFood" : k === "99food" ? "99Food" : "Inserida Manualmente";
                  return (
                    <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
                      <span className="font-semibold">{nomeOrig} ({v.qtd}x)</span>
                      <span className="font-mono font-bold">{formatarMoeda(v.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formas de Pagamento Utilizadas */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" /> Distribuição por Forma de Pagamento
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(relatorioVendasConsolidado.porMetodoPagamento).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
                    <span className="font-semibold">{k} ({v.qtd}x)</span>
                    <span className="font-mono font-bold">{formatarMoeda(v.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo da Lista de Vendas */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Vendas no Período ({relatorioVendasConsolidado.vendasPeriodo.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-background">
                {relatorioVendasConsolidado.vendasPeriodo.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma venda encontrada para o período selecionado.</p>
                ) : (
                  relatorioVendasConsolidado.vendasPeriodo.map((v, i) => (
                    <div key={v.id || i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <span className="font-bold">{v.clienteNome}</span>
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[220px]">{v.itens}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold block">{formatarMoeda(v.valorTotal)}</span>
                        {renderizarBadgeOrigemMobile(v)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalRelatorioVendasOpen(false)} className="text-xs">
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImprimirRelatorioVendas}
              className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Relatório Geral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ZOOM DE FOTO DE REFERÊNCIA / MODELO DO CLIENTE */}
      <Dialog open={!!fotoExpandidaModalUrl} onOpenChange={() => setFotoExpandidaModalUrl(null)}>
        <DialogContent className="max-w-3xl p-4 sm:p-6 rounded-3xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-500" /> Foto de Referência do Orçamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Visualização em alta resolução do modelo enviado pelo cliente para este pedido.
            </DialogDescription>
          </DialogHeader>

          {fotoExpandidaModalUrl && (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="max-h-[65vh] overflow-auto rounded-2xl border border-border shadow-lg bg-black/5 p-1 flex items-center justify-center w-full">
                <img
                  src={fotoExpandidaModalUrl}
                  alt="Foto de Referência em Alta Resolução"
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 w-full justify-end pt-2">
                {fotoExpandidaModalUrl.startsWith("http") && (
                  <a
                    href={fotoExpandidaModalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir Link Original
                  </a>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFotoExpandidaModalUrl(null)}
                  className="h-9 px-4 font-bold text-xs rounded-xl"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
