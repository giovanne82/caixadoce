import React from "react";
import { Sparkles, Cookie, Candy } from "lucide-react";

interface CaixaDoceLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
}

export function CaixaDoceLogo({ size = "md", className = "", showTagline = false }: CaixaDoceLogoProps) {
  const sizeMap = {
    sm: { icon: "w-6 h-6", title: "text-lg", tag: "text-[10px]" },
    md: { icon: "w-8 h-8", title: "text-xl", tag: "text-xs" },
    lg: { icon: "w-10 h-10", title: "text-2xl", tag: "text-sm" },
    xl: { icon: "w-14 h-14", title: "text-4xl", tag: "text-base" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-2 shadow-md shadow-orange-500/20 text-white">
          <Cookie className={current.icon} />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-pulse" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center tracking-tight font-extrabold leading-none">
          <span className="text-foreground">Caixa</span>
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent ml-0.5">
            Doce
          </span>
        </div>
        {showTagline && (
          <span className={`${current.tag} font-medium text-muted-foreground tracking-wide`}>
            Gestão &amp; Finanças
          </span>
        )}
      </div>
    </div>
  );
}
