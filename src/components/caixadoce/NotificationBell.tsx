import { useState } from "react";
import { Bell, Crown, AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from "lucide-react";
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
 * Sininho de Alerta do Sistema - Focado exclusivamente no Status do Plano de Assinatura
 */
export function NotificationBell({
  establishmentCode = "CD-1001",
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
      onNavigateTab("configuracoes");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={
            isAssinaturaAtiva
              ? "Plano Assinado & Ativo"
              : "Atenção: Regularize sua Assinatura do CaixaDoce"
          }
          className={`relative h-8 w-8 p-0 rounded-xl transition-all shadow-xs ${
            isAssinaturaAtiva
              ? "opacity-40 hover:opacity-100 text-stone-400 bg-stone-100/60 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 hover:bg-stone-200/60"
              : "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white border-2 border-amber-300 animate-pulse shadow-md hover:scale-105"
          }`}
        >
          <Bell className={`w-4 h-4 ${isAssinaturaAtiva ? "text-stone-400" : "text-white animate-bounce"}`} />

          {/* Badge / Indicador de Alerta caso a assinatura NÃO esteja ativa */}
          {!isAssinaturaAtiva && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-[9px] font-black text-white shadow-xs">
                !
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl border-border rounded-2xl overflow-hidden bg-card font-sans">
        {/* Cabeçalho */}
        <div className={`p-4 border-b ${isAssinaturaAtiva ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {isAssinaturaAtiva ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
            )}
            <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider">
              Aviso de Assinatura &amp; Plano
            </h4>
          </div>

          <Badge variant={isAssinaturaAtiva ? "default" : "destructive"} className="text-[10px] px-2 py-0.5 font-bold">
            {isAssinaturaAtiva ? "Plano em Dia" : "Ação Necessária"}
          </Badge>
        </div>

        {/* Corpo Informativo */}
        <div className="p-4 space-y-3">
          {isAssinaturaAtiva ? (
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                <Crown className="w-4 h-4" />
                <span>{planoConfig.nome} (Ativo)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua assinatura do plano está em dia e com todos os recursos ilimitados liberados (Scanner de Notinhas com IA, Gestão Financeira, Impressão de Pedidos e muito mais).
              </p>
              {infoPlano.dataExpiracao && (
                <p className="text-[11px] font-mono text-muted-foreground pt-1">
                  Válido até: <strong>{new Date(infoPlano.dataExpiracao).toLocaleDateString("pt-BR")}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {infoPlano.status === "expirado"
                    ? "Assinatura Expirada"
                    : infoPlano.status === "cancelado"
                    ? "Assinatura Cancelada"
                    : "Plano Básico (Sem Assinatura PRO)"}
                </span>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {infoPlano.status === "expirado" || infoPlano.status === "cancelado"
                  ? "Sua assinatura foi interrompida. Regularize o pagamento para manter liberados o Scanner por IA e a Gestão Financeira."
                  : "Seu estabelecimento está no Plano Básico. Assine o Plano Mensal Completo para liberar o Scanner de Notinhas com IA e o fluxo financeiro."}
              </p>
            </div>
          )}

          {/* Botão de Ação */}
          <div className="pt-2">
            <Button
              onClick={handleIrParaPlanos}
              className={`w-full text-xs font-extrabold shadow-md flex items-center justify-center gap-2 ${
                isAssinaturaAtiva
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-gradient-to-r from-[#8E7CC3] to-purple-600 text-white hover:opacity-90"
              }`}
            >
              <span>{isAssinaturaAtiva ? "Gerenciar Assinatura" : "Regularizar Assinatura Agora"}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
