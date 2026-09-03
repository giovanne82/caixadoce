import { useState } from "react";
import { Bell, Crown, AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert, MessageCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { obterPlanoEfetivoEstabelecimento, PLANOS_CONFIG } from "@/lib/planos-utils";

interface NotificationBellProps {
  transacoes?: any[];
  despesas?: any[];
  establishmentCode?: string;
  onNavigateTab?: (tab: string) => void;
}

/**
 * Central de Notificações & Alertas do Sistema
 */
export function NotificationBell({
  establishmentCode = "",
  onNavigateTab,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  // Status do plano de assinatura do estabelecimento
  const infoPlano = obterPlanoEfetivoEstabelecimento(establishmentCode);
  const isAssinaturaAtiva = infoPlano.status === "ativo" && infoPlano.planoId !== "basico";
  const planoConfig = PLANOS_CONFIG[infoPlano.planoId] || PLANOS_CONFIG.mensal;

  const handleIrParaPlanos = () => {
    setOpen(false);
    if (onNavigateTab) {
      onNavigateTab("plano");
    }
  };

  const suporteWhatsAppUrl = "https://wa.me/5531987109828?text=" + encodeURIComponent("Olá! Estou entrando em contato sobre o CaixaDoce.");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Notificações & Avisos do Sistema"
          className="relative h-8 w-8 p-0 rounded-xl transition-all shadow-xs bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-200/60 text-purple-900 dark:text-purple-200"
        >
          <Bell className="w-4 h-4 text-purple-700 dark:text-purple-300" />

          {/* Badge de Nova Notificação / Aviso Importante */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-purple-600 text-[9px] font-black text-white shadow-xs">
              1
            </span>
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-84 sm:w-96 p-0 shadow-2xl border-border rounded-3xl overflow-hidden bg-card font-sans">
        {/* 1. AVISO OFICIAL DE MANUTENÇÃO TÉCNICA */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 p-4 border-b border-purple-200/60 dark:border-purple-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">
              <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Aviso do Sistema</span>
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold border-0 shadow-xs">
              Normalizado
            </Badge>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📢 Aviso de Manutenção Técnica</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Tivemos uma instabilidade técnica momentânea que afetou o acesso ao menu do cardápio digital, mas o problema já foi totalmente resolvido e normalizado. Caso ainda encontre qualquer dificuldade ou tenha dúvidas, entre em contato conosco pelo WhatsApp: <strong>(31) 98710-9828</strong>.
            </p>

            <a
              href={suporteWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Falar com Suporte no WhatsApp</span>
            </a>
          </div>
        </div>

        {/* 2. STATUS DO PLANO DE ASSINATURA */}
        <div
          onClick={handleIrParaPlanos}
          className="p-4 space-y-2.5 cursor-pointer hover:bg-muted/30 transition-colors bg-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isAssinaturaAtiva ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <h5 className="font-extrabold text-xs text-foreground">
                {isAssinaturaAtiva ? `${planoConfig.nome} (Ativo)` : "Status da Assinatura"}
              </h5>
            </div>

            <Badge variant={isAssinaturaAtiva ? "outline" : "destructive"} className="text-[10px] px-2 py-0.5 font-bold">
              {isAssinaturaAtiva ? "Em dia" : "Pendente"}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {isAssinaturaAtiva
              ? "Sua assinatura está ativa com todos os módulos e recursos liberados."
              : "Acesse a aba Meu Plano para gerenciar sua assinatura do CaixaDoce."}
          </p>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleIrParaPlanos();
            }}
            variant="outline"
            className="w-full text-xs font-bold rounded-xl h-8 mt-1"
          >
            <span>{isAssinaturaAtiva ? "Ver Detalhes do Plano" : "Acessar Meu Plano"}</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

