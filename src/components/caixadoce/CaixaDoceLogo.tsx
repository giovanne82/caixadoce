import React from "react";

interface CaixaDoceLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
}

export function CaixaDoceLogo({ size = "md", className = "", showTagline = false }: CaixaDoceLogoProps) {
  const sizeMap = {
    sm: { img: "w-8 h-8", title: "text-lg", tag: "text-[10px]" },
    md: { img: "w-10 h-10", title: "text-xl", tag: "text-xs" },
    lg: { img: "w-14 h-14", title: "text-2xl", tag: "text-sm" },
    xl: { img: "w-20 h-20", title: "text-4xl", tag: "text-base" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Imagem Oficial da Logo CaixaDoce (Sem distorção) */}
      <div className="relative flex items-center justify-center shrink-0">
        <img
          src="/logocaixadoce.png"
          alt="CaixaDoce Logo"
          className={`${current.img} object-contain rounded-xl shadow-xs transition-transform hover:scale-105`}
        />
      </div>

      <div className="flex flex-col">
        <div className={`flex items-center tracking-tight font-black leading-none ${current.title}`}>
          {/* Caixa */}
          <span className="text-[#2E1A47]">Caixa</span>
          {/* Doce */}
          <span className="text-[#7C3AED] ml-0.5 font-black">
            Doce
          </span>
        </div>
        {showTagline && (
          <span className={`${current.tag} font-semibold text-[#5B478E] tracking-wide mt-0.5`}>
            Gestão &amp; Finanças
          </span>
        )}
      </div>
    </div>
  );
}
