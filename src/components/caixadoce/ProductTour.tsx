import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Step {
  id: string;
  targetAttr: string;
  tab: string;
  title: string;
  description: string;
  badgeText?: string;
}

const TOUR_STEPS: Step[] = [
  {
    id: "step-1",
    targetAttr: "novo-produto",
    tab: "produtos",
    title: "Seu Primeiro Produto",
    badgeText: "Passo 1 de 3",
    description: "🍰 Crie o seu catálogo! Adicione aqui o seu primeiro doce, bolo ou kit com foto e preço.",
  },
  {
    id: "step-2",
    targetAttr: "link-loja",
    tab: "produtos",
    title: "Seu Link de Vendas",
    badgeText: "Passo 2 de 3",
    description: "🔗 O seu Link de Vendas: Este é o link do seu Cardápio Público. Compartilhe na bio do Instagram ou no WhatsApp para seus clientes comprarem.",
  },
  {
    id: "step-3",
    targetAttr: "aba-vendas",
    tab: "encomendas",
    title: "Gestão de Encomendas",
    badgeText: "Passo 3 de 3",
    description: "🛒 Pedidos a chegar: Todos os pedidos feitos pelos clientes no seu link cairão automaticamente aqui. Boas vendas!",
  },
];

interface ProductTourProps {
  userId?: string;
  establishmentCode?: string;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
}

export function ProductTour({
  userId,
  establishmentCode,
  activeTab,
  onNavigateTab,
}: ProductTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const storageKey = userId
    ? `caixadoce_has_seen_tutorial_${userId}`
    : establishmentCode
    ? `caixadoce_has_seen_tutorial_${establishmentCode}`
    : "caixadoce_has_seen_tutorial_default";

  // Check if tour should be opened on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const hasSeenLocal = localStorage.getItem(storageKey);
      if (hasSeenLocal === "true") {
        setIsOpen(false);
        return;
      }
    } catch {}

    // Slight delay so DOM elements and tabs render completely
    const timer = setTimeout(() => {
      setIsOpen(true);
      setCurrentStepIndex(0);
      onNavigateTab(TOUR_STEPS[0].tab);
    }, 1200);

    return () => clearTimeout(timer);
  }, [storageKey]);

  // Complete & dismiss tour permanently
  const finalizeTour = useCallback(async () => {
    setIsOpen(false);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}

    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ has_seen_tutorial: true } as any)
          .eq("id", userId);
      } catch {}
    }
    if (establishmentCode) {
      try {
        await supabase
          .from("estabelecimentos")
          .update({ has_seen_tutorial: true } as any)
          .ilike("codigo", establishmentCode);
      } catch {}
    }
  }, [storageKey, userId, establishmentCode]);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update target rect location
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.querySelector(`[data-tour="${currentStep.targetAttr}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Switch tab if step requires a specific active tab
    if (activeTab !== currentStep.tab) {
      onNavigateTab(currentStep.tab);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 250);

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isOpen, currentStepIndex, activeTab, currentStep, onNavigateTab, updateTargetRect]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNextStep = () => {
    if (isLastStep) {
      finalizeTour();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (TOUR_STEPS[nextIdx]?.tab) {
        onNavigateTab(TOUR_STEPS[nextIdx].tab);
      }
    }
  };

  // Compute position for popover box relative to target rect
  let popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
  };

  const popoverWidth = Math.min(360, typeof window !== "undefined" ? window.innerWidth - 32 : 320);

  if (targetRect && typeof window !== "undefined") {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let top = targetRect.bottom + 12;
    let left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;

    // If target is near bottom, place popover above
    if (spaceBelow < 220 && spaceAbove > 200) {
      top = Math.max(16, targetRect.top - 210);
    }

    // Keep left within viewport margins
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - 240));

    popoverStyle = {
      ...popoverStyle,
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
    };
  } else {
    // Fallback centered modal if target element not found on current screen
    popoverStyle = {
      ...popoverStyle,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: `${popoverWidth}px`,
    };
  }

  return (
    <>
      {/* Dark Backdrop with Spotlight Hole if Target Rect Exists */}
      <div
        className="fixed inset-0 z-[9990] bg-slate-950/60 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        onClick={finalizeTour}
      />

      {/* Spotlight Ring around target element */}
      {targetRect && (
        <div
          className="fixed z-[9995] rounded-2xl pointer-events-none transition-all duration-300 border-2 border-purple-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.65),0_0_25px_rgba(168,85,247,0.5)] animate-pulse"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Popover Card */}
      <div
        style={popoverStyle}
        className="bg-card border-2 border-purple-500/40 rounded-3xl p-5 shadow-2xl text-foreground space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header: Title + Badge + Close 'X' */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-500/30">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                {currentStep.badgeText}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-foreground tracking-tight">
              {currentStep.title}
            </h4>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={finalizeTour}
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Fechar Tutorial"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body Description */}
        <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
          {currentStep.description}
        </p>

        {/* Footer Actions: Sair/Pular (Left) & Next/Concluir (Right) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={finalizeTour}
            className="h-8 text-xs font-bold text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl px-2.5"
          >
            Pular Tutorial
          </Button>

          <Button
            size="sm"
            onClick={handleNextStep}
            className="h-8 text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-3.5 shadow-md flex items-center gap-1 cursor-pointer"
          >
            {isLastStep ? (
              <>
                <span>Entendi!</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              </>
            ) : (
              <>
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
