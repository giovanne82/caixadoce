import { useState } from "react";
import { Bell, Check, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type TransacaoFinanceira } from "@/lib/caixadoce-data";

interface NotificationBellProps {
  transacoes?: TransacaoFinanceira[];
  onNavigateTab?: (tab: string) => void;
}

export function NotificationBell({ transacoes = [], onNavigateTab }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const pendentes = transacoes.filter((t) => t.status === "pendente");

  const notifs = [
    ...(pendentes.length > 0
      ? [
          {
            id: "notif-pendentes",
            titulo: "Lançamentos Pendentes",
            mensagem: `Você possui ${pendentes.length} cobrança(s) pendente(s) de confirmação.`,
            tipo: "alerta",
            tab: "financeiro",
          },
        ]
      : []),
    {
      id: "notif-bemvindo",
      titulo: "Bem-vindo ao CaixaDoce!",
      mensagem: "Explore o fluxo de caixa, cadastre sua equipe e ative seu plano.",
      tipo: "info",
      tab: "dashboard",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-white/90 hover:text-white hover:bg-white/10"
        >
          <Bell className="w-4 h-4" />
          {notifs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="p-3 border-b border-border bg-muted/30">
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
            Notificações do CaixaDoce
          </h4>
        </div>
        <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onNavigateTab?.(n.tab);
                setOpen(false);
              }}
              className="p-3 hover:bg-muted/40 cursor-pointer transition-colors"
            >
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {n.tipo === "alerta" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                )}
                {n.titulo}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{n.mensagem}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
