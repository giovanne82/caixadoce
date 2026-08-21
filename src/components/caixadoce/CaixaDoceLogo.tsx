import React from "react";

interface CaixaDoceLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
}

// Ícone Vetorial SVG em Visão Superior / Aérea (Top-Down View)
// Representando uma caixa de doces quadrada aberta com 4 abas dobradas para fora e 4 mini cupcakes confeitados dentro
export function SweetBoxTopDownIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ABAS DA CAIXA ABERTAS VOLTADAS PARA FORA (TOP-DOWN FLAPS) */}
      {/* Aba Superior (Top Flap) */}
      <polygon points="16,16 22,4 42,4 48,16" fill="#EDE4F7" stroke="#7C3AED" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Aba Inferior (Bottom Flap) */}
      <polygon points="16,48 22,60 42,60 48,48" fill="#EDE4F7" stroke="#7C3AED" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Aba Esquerda (Left Flap) */}
      <polygon points="16,16 4,22 4,42 16,48" fill="#E8E0F2" stroke="#7C3AED" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Aba Direita (Right Flap) */}
      <polygon points="48,16 60,22 60,42 48,48" fill="#E8E0F2" stroke="#7C3AED" strokeWidth="1.8" strokeLinejoin="round" />

      {/* BASE/CORPO DA CAIXA QUADRADA (CENTRAL BOX CAVITY) */}
      <rect x="16" y="16" width="32" height="32" rx="3" fill="#FAF7FC" stroke="#7C3AED" strokeWidth="2.5" />

      {/* GRADE COM 4 MINI CUPCAKES / DOCES CONFEITADOS VISTOS DE CIMA */}
      
      {/* --- CUPCAKE 1: SUPERIOR ESQUERDO (cx: 24, cy: 24) --- */}
      {/* Forminha pregueada */}
      <circle cx="24" cy="24" r="6.5" fill="#F3EEF9" stroke="#8E7CC3" strokeWidth="1.2" strokeDasharray="3 1.5" />
      {/* Base do doce */}
      <circle cx="24" cy="24" r="5" fill="#7C3AED" />
      {/* Espiral de Chantilly / Cobertura */}
      <path d="M 22 24 C 22 21.5, 26.5 21.5, 26.5 24 C 26.5 25.5, 24 26, 24 24" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cereja no topo */}
      <circle cx="24" cy="24" r="1.3" fill="#E53935" />

      {/* --- CUPCAKE 2: SUPERIOR DIREITO (cx: 40, cy: 24) --- */}
      {/* Forminha pregueada */}
      <circle cx="40" cy="24" r="6.5" fill="#F3EEF9" stroke="#8E7CC3" strokeWidth="1.2" strokeDasharray="3 1.5" />
      {/* Base do doce */}
      <circle cx="40" cy="24" r="5" fill="#9333EA" />
      {/* Espiral de Chantilly / Cobertura */}
      <path d="M 38 24 C 38 21.5, 42.5 21.5, 42.5 24 C 42.5 25.5, 40 26, 40 24" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Granulado dourado */}
      <circle cx="40" cy="24" r="1.3" fill="#F59E0B" />

      {/* --- CUPCAKE 3: INFERIOR ESQUERDO (cx: 24, cy: 40) --- */}
      {/* Forminha pregueada */}
      <circle cx="24" cy="40" r="6.5" fill="#F3EEF9" stroke="#8E7CC3" strokeWidth="1.2" strokeDasharray="3 1.5" />
      {/* Base do doce */}
      <circle cx="24" cy="40" r="5" fill="#A855F7" />
      {/* Espiral de Chantilly / Cobertura */}
      <path d="M 22 40 C 22 37.5, 26.5 37.5, 26.5 40 C 26.5 41.5, 24 42, 24 40" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cereja no topo */}
      <circle cx="24" cy="40" r="1.3" fill="#E53935" />

      {/* --- CUPCAKE 4: INFERIOR DIREITO (cx: 40, cy: 40) --- */}
      {/* Forminha pregueada */}
      <circle cx="40" cy="40" r="6.5" fill="#F3EEF9" stroke="#8E7CC3" strokeWidth="1.2" strokeDasharray="3 1.5" />
      {/* Base do doce */}
      <circle cx="40" cy="40" r="5" fill="#6D28D9" />
      {/* Espiral de Chantilly / Cobertura */}
      <path d="M 38 40 C 38 37.5, 42.5 37.5, 42.5 40 C 42.5 41.5, 40 42, 40 40" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Granulado dourado */}
      <circle cx="40" cy="40" r="1.3" fill="#F59E0B" />
    </svg>
  );
}

export function CaixaDoceLogo({ size = "md", className = "", showTagline = false }: CaixaDoceLogoProps) {
  const sizeMap = {
    sm: { icon: "w-7 h-7", title: "text-lg", tag: "text-[10px]" },
    md: { icon: "w-9 h-9", title: "text-xl", tag: "text-xs" },
    lg: { icon: "w-11 h-11", title: "text-2xl", tag: "text-sm" },
    xl: { icon: "w-16 h-16", title: "text-4xl", tag: "text-base" },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Ícone Vetorial SVG: Caixa de Doces Aberta em Visão Superior (Top-Down) com 4 Cupcakes */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="flex items-center justify-center rounded-2xl bg-[#F3EEF9] border border-[#E8E0F2] p-1 shadow-xs">
          <SweetBoxTopDownIcon className={current.icon} />
        </div>
      </div>

      <div className="flex flex-col">
        <div className={`flex items-center tracking-tight font-black leading-none ${current.title}`}>
          {/* Caixa (Grafite / Roxo Escuro #2E1A47) */}
          <span className="text-[#2E1A47]">Caixa</span>
          {/* Doce (Lilás de destaque em alto contraste #7C3AED) */}
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
