import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, CalendarClock, Receipt, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { type TransacaoFinanceira } from "@/lib/caixadoce-data";
import { obterPlanoEfetivoEstabelecimento, PLANOS_CONFIG } from "@/lib/planos-utils";

export interface NotificacaoItem {
  id: string;
  titulo: string;
  mensagem: string;
  detalhe?: string;
  dataHora: string;
  tipo: "plano" | "notinha" | "financeiro" | "sistema";
  lida: boolean;
}

interface NotificationBellProps {
  transacoes?: TransacaoFinanceira[];
  despesas?: any[];
  establishmentCode?: string;
  onNavigateTab?: (tab: string) => void;
}

export function NotificationBell({
  transacoes = [],
  despesas = [],
  establishmentCode = "CD-1001",
  onNavigateTab,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [lidasIds, setLidasIds] = useState<string[]>([]);
  const [notifSelecionada, setNotifSelecionada] = useState<NotificacaoItem | null>(null);

  // Carrega IDs lidos do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`caixadoce_notifs_lidas_${establishmentCode}`);
      if (raw) setLidasIds(JSON.parse(raw));
    } catch {}
  }, [establishmentCode]);

  // Salvar no localStorage quando atualizar
  const marcarComoLida = (id: string) => {
    setLidasIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem(`caixadoce_notifs_lidas_${establishmentCode}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const marcarTodasComoLidas = () => {
    const todosIds = gerarNotificacoes().map((n) => n.id);
    setLidasIds(todosIds);
    try {
      localStorage.setItem(`caixadoce_notifs_lidas_${establishmentCode}`, JSON.stringify(todosIds));
    } catch {}
  };

  // Gerador dinâmico de notificações com base nos dados do sistema
  const gerarNotificacoes = (): NotificacaoItem[] => {
    const lista: NotificacaoItem[] = [];

    // 1. Notificação do Plano (Vencimento/Renovação)
    const plano = obterPlanoEfetivoEstabelecimento(establishmentCode);
    const planoConfig = PLANOS_CONFIG[plano.planoId];
    const planoNome = planoConfig?.nome || "Plano Pro Completo";
    lista.push({
      id: `notif-plano-${establishmentCode}`,
      titulo: `Status do Plano: ${planoNome}`,
      mensagem: "Fique atento à data de renovação da sua assinatura para manter recursos ativos.",
      detalhe: `Seu plano ativo (${planoNome}) inclui automações avançadas de caixa, recebimentos Stripe/Pix e colaboradores ilimitados. Mantenha os pagamentos em dia para evitar interrupções.`,
      dataHora: "Hoje",
      tipo: "plano",
      lida: lidasIds.includes(`notif-plano-${establishmentCode}`),
    });

    // 2. Alerta de Notinha escaneada recente
    if (despesas && despesas.length > 0) {
      const ultimaDespesa = despesas[0];
      const nomeInsumo = ultimaDespesa.nomeInsumo || ultimaDespesa.descricao || "Compra Confeitaria";
      lista.push({
        id: `notif-notinha-${ultimaDespesa.id || "1"}`,
        titulo: "Nova notinha escaneada por colaborador",
        mensagem: `Comprovante de "${nomeInsumo}" registrado no caixa.`,
        detalhe: `Uma nova despesa/notinha foi escaneada e conciliada automaticamente com o fluxo de caixa. Valor: R$ ${(ultimaDespesa.valorTotal || 0).toFixed(2)}.`,
        dataHora: "Recente",
        tipo: "notinha",
        lida: lidasIds.includes(`notif-notinha-${ultimaDespesa.id || "1"}`),
      });
    } else {
      lista.push({
        id: "notif-notinha-demo",
        titulo: "Scanner de Notinhas Ativo",
        mensagem: "Fotografe cupons fiscais para alimentar o estoque e o caixa automaticamente.",
        detalhe: "O leitor de OCR com inteligência artificial detecta itens, valores e datas das notas de insumos enviadas por você ou sua equipe.",
        dataHora: "Recente",
        tipo: "notinha",
        lida: lidasIds.includes("notif-notinha-demo"),
      });
    }

    // 3. Lançamentos Pendentes
    const pendentes = transacoes.filter((t) => t.status === "pendente");
    if (pendentes.length > 0) {
      lista.push({
        id: `notif-financeiro-pendentes-${pendentes.length}`,
        titulo: "Cobranças Pendentes de Liquidação",
        mensagem: `Você tem ${pendentes.length} lançamento(s) aguardando confirmação.`,
        detalhe: `Existem ${pendentes.length} cobranças pendentes na aba Gestão Financeira. Verifique os comprovantes ou pagamentos via Pix/Stripe para dar baixa.`,
        dataHora: "Pendente",
        tipo: "financeiro",
        lida: lidasIds.includes(`notif-financeiro-pendentes-${pendentes.length}`),
      });
    }

    // 4. Aviso do Sistema
    lista.push({
      id: "notif-boas-vindas",
      titulo: "Sistema CaixaDoce Atualizado",
      mensagem: "Gestão financeira, PDV de colaboradores e links de pagamento ativos.",
      detalhe: "Sua plataforma CaixaDoce está 100% pronta. Use a aba Financeiro para gerar cobranças avulsas e gerenciar sua loja.",
      dataHora: "Sistema",
      tipo: "sistema",
      lida: lidasIds.includes("notif-boas-vindas"),
    });

    return lista;
  };

  const notificacoes = gerarNotificacoes();
  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Notificações e Avisos do Sistema"
          className="relative h-8 w-8 p-0 text-[#2E1A47] hover:text-[#7C3AED] bg-white/80 hover:bg-[#7C3AED]/10 border border-[#E8E0F2] rounded-xl transition-all shadow-xs"
        >
          <Bell className="w-4 h-4 text-[#7C3AED]" />
          {naoLidasCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                {naoLidasCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-[#E8E0F2] rounded-2xl overflow-hidden bg-background">
        {/* Cabeçalho do Popover */}
        <div className="p-3.5 border-b border-border bg-[#F3EEF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7C3AED]" />
            <h4 className="font-bold text-xs text-[#2E1A47] uppercase tracking-wider">
              Notificações do Sistema
            </h4>
            {naoLidasCount > 0 && (
              <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {naoLidasCount} nova(s)
              </Badge>
            )}
          </div>

          {naoLidasCount > 0 && (
            <button
              onClick={marcarTodasComoLidas}
              className="text-[11px] font-semibold text-[#7C3AED] hover:underline flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar lidas
            </button>
          )}
        </div>

        {/* Notificação expandida / detalhe */}
        {notifSelecionada ? (
          <div className="p-4 space-y-3 bg-muted/20 animate-in fade-in-50 duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                {notifSelecionada.tipo === "plano" && <CalendarClock className="w-4 h-4 text-purple-600" />}
                {notifSelecionada.tipo === "notinha" && <Receipt className="w-4 h-4 text-amber-500" />}
                {notifSelecionada.tipo === "financeiro" && <AlertCircle className="w-4 h-4 text-rose-500" />}
                {notifSelecionada.tipo === "sistema" && <Sparkles className="w-4 h-4 text-emerald-500" />}
                <h5 className="font-extrabold text-xs text-foreground">{notifSelecionada.titulo}</h5>
              </div>
              <button
                onClick={() => setNotifSelecionada(null)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-foreground leading-relaxed">{notifSelecionada.detalhe || notifSelecionada.mensagem}</p>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">{notifSelecionada.dataHora}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-semibold"
                onClick={() => setNotifSelecionada(null)}
              >
                Voltar à lista
              </Button>
            </div>
          </div>
        ) : (
          /* Lista de Notificações */
          <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
            {notificacoes.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  marcarComoLida(n.id);
                  setNotifSelecionada(n);
                }}
                className={`p-3.5 hover:bg-[#F3EEF9]/60 cursor-pointer transition-colors flex items-start gap-3 relative ${
                  !n.lida ? "bg-purple-50/50 dark:bg-purple-950/20" : ""
                }`}
              >
                {/* Indicador de Não Lida (Bolinha vermelha) */}
                {!n.lida && (
                  <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-rose-500 shadow-xs"></span>
                )}

                <div className="shrink-0 mt-0.5 pl-1">
                  {n.tipo === "plano" && <CalendarClock className="w-4 h-4 text-purple-600" />}
                  {n.tipo === "notinha" && <Receipt className="w-4 h-4 text-amber-500" />}
                  {n.tipo === "financeiro" && <AlertCircle className="w-4 h-4 text-rose-500" />}
                  {n.tipo === "sistema" && <Sparkles className="w-4 h-4 text-emerald-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${!n.lida ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground"}`}>
                      {n.titulo}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{n.dataHora}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                    {n.mensagem}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 self-center" />
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
