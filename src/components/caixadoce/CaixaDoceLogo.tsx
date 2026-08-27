import React from "react";

interface CaixaDoceLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  stacked?: boolean;
}

export function CaixaDoceLogo({
  size = "md",
  className = "",
  showTagline = false,
  stacked = false,
}: CaixaDoceLogoProps) {
  const sizeMap = {
    sm: { img: "w-7 h-7", title: "text-sm", tag: "text-[10px]" },
    md: { img: "w-8 h-8 sm:w-10 sm:h-10", title: "text-lg sm:text-xl", tag: "text-xs" },
    lg: { img: "w-12 h-12 sm:w-14 sm:h-14", title: "text-xl sm:text-2xl", tag: "text-sm" },
    xl: { img: "w-16 h-16 sm:w-20 sm:h-20", title: "text-3xl sm:text-4xl", tag: "text-base" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 select-none ${className}`}>
      {/* Imagem Oficial da Logo CaixaDoce (Sem distorção) */}
      <div className="relative flex items-center justify-center shrink-0">
        <img
          src="/logocaixadoce.png"
          alt="CaixaDoce Logo"
          className={`${current.img} object-contain rounded-xl shadow-xs transition-transform hover:scale-105`}
        />
      </div>

      <div className="flex flex-col justify-center leading-none">
        {stacked ? (
          <div className="flex flex-col text-[11px] sm:text-sm font-black tracking-tight leading-[0.95] select-none">
            <span className="text-[#2E1A47] font-black">Caixa</span>
            <span className="text-[#7C3AED] font-black">Doce</span>
          </div>
        ) : (
          <div className={`flex items-center tracking-tight font-black leading-none ${current.title}`}>
            {/* Caixa */}
            <span className="text-[#2E1A47]">Caixa</span>
            {/* Doce */}
            <span className="text-[#7C3AED] ml-0.5 font-black">Doce</span>
          </div>
        )}
        {showTagline && !stacked && (
          <span className={`${current.tag} font-semibold text-[#5B478E] tracking-wide mt-0.5`}>
            Gestão &amp; Finanças
          </span>
        )}
      </div>
    </div>
  );
}
