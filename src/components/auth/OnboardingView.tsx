import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarSlug, formatarMascaraWhatsapp } from "@/lib/onboarding-utils";
import { toast } from "sonner";
import {
  Store,
  Link as LinkIcon,
  Phone,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Cake,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function OnboardingView() {
  const { user, profile, updateEstablishmentDetails, logout } = useAuth();
  const navigate = useNavigate();

  // Estados dos campos cruciais
  const [nomeLoja, setNomeLoja] = useState(() => {
    if (
      profile?.establishmentName &&
      profile.establishmentName !== "Minha Confeitaria" &&
      !profile.establishmentName.startsWith("Confeitaria CD-") &&
      !profile.establishmentName.startsWith("Loja CD-")
    ) {
      return profile.establishmentName;
    }
    return "";
  });

  const [slug, setSlug] = useState(() => profile?.slug || "");
  const [slugManual, setSlugManual] = useState(Boolean(profile?.slug));

  const [whatsapp, setWhatsapp] = useState(() => {
    if (profile?.whatsapp) {
      return formatarMascaraWhatsapp(profile.whatsapp);
    }
    return "";
  });

  // Estados de validação do slug
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "available" | "taken" | "too_short">("idle");
  const [slugErrorMsg, setSlugErrorMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza campos se o perfil carregar posteriormente
  useEffect(() => {
    if (profile) {
      if (
        !nomeLoja &&
        profile.establishmentName &&
        profile.establishmentName !== "Minha Confeitaria" &&
        !profile.establishmentName.startsWith("Confeitaria CD-") &&
        !profile.establishmentName.startsWith("Loja CD-")
      ) {
        setNomeLoja(profile.establishmentName);
      }
      if (!slug && profile.slug) {
        setSlug(profile.slug);
        setSlugManual(true);
      }
      if (!whatsapp && profile.whatsapp) {
        setWhatsapp(formatarMascaraWhatsapp(profile.whatsapp));
      }
    }
  }, [profile]);

  // Sugere automaticamente o slug conforme o usuário digita o nome da loja (caso não tenha editado manualmente o slug)
  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoNome = e.target.value;
    setNomeLoja(novoNome);

    if (!slugManual) {
      const sugerido = formatarSlug(novoNome);
      setSlug(sugerido);
    }
  };

  // Manipula edição direta do campo Slug
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true);
    const limpo = formatarSlug(e.target.value);
    setSlug(limpo);
  };

  // Manipula edição do WhatsApp com máscara
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarMascaraWhatsapp(e.target.value);
    setWhatsapp(formatado);
  };

  // Verificação de disponibilidade do slug em tempo real com debounce
  useEffect(() => {
    const slugLimpo = slug.trim().toLowerCase();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!slugLimpo || slugLimpo.length < 3) {
      setSlugStatus(slugLimpo.length > 0 ? "too_short" : "idle");
      setSlugErrorMsg(slugLimpo.length > 0 ? "Mínimo de 3 caracteres" : "");
      setCheckingSlug(false);
      return;
    }

    setCheckingSlug(true);
    setSlugStatus("idle");
    setSlugErrorMsg("");

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const activeCode = profile?.establishmentCode || "";
        const { data, error } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, slug")
          .eq("slug", slugLimpo)
          .maybeSingle();

        if (error) {
          console.warn("[Onboarding] Erro ao checar slug:", error);
          setCheckingSlug(false);
          return;
        }

        // Se encontrou outro estabelecimento com o mesmo slug (que não seja a própria loja)
        if (data && data.slug && data.codigo?.toUpperCase() !== activeCode.toUpperCase()) {
          setSlugStatus("taken");
          setSlugErrorMsg("Este link já está em uso por outra confeitaria.");
        } else {
          setSlugStatus("available");
          setSlugErrorMsg("");
        }
      } catch (err) {
        console.warn("[Onboarding] Falha na requisição de slug:", err);
      } finally {
        setCheckingSlug(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [slug, profile?.establishmentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeLimpo = nomeLoja.trim();
    const slugLimpo = slug.trim().toLowerCase();
    const zapNumeros = whatsapp.replace(/\D/g, "");

    // 1. Validações Locais
    if (!nomeLimpo || nomeLimpo.length < 2) {
      toast.error("Por favor, informe o Nome da sua Confeitaria / Loja.");
      return;
    }

    if (!slugLimpo || slugLimpo.length < 3) {
      toast.error("O Link Personalizado (Slug) deve conter no mínimo 3 caracteres (apenas letras, números e hífens).");
      return;
    }

    if (slugStatus === "taken") {
      toast.error("O Link Personalizado escolhido já está em uso. Por favor, escolha outro.");
      return;
    }

    if (!zapNumeros || zapNumeros.length < 10) {
      toast.error("Por favor, informe um número de WhatsApp de atendimento válido com DDD (mínimo 10 dígitos).");
      return;
    }

    setSalvando(true);
    try {
      const activeCode = profile?.establishmentCode || "";

      // 2. Checagem final de segurança no Supabase antes de salvar
      const { data: estComMesmoSlug } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, slug")
        .eq("slug", slugLimpo)
        .maybeSingle();

      if (estComMesmoSlug && estComMesmoSlug.slug && estComMesmoSlug.codigo?.toUpperCase() !== activeCode.toUpperCase()) {
        toast.error("Este link personalizado acabou de ser registrado por outra loja. Escolha outro.");
        setSlugStatus("taken");
        setSlugErrorMsg("Este link já está em uso.");
        setSalvando(false);
        return;
      }

      // 3. Salva os dados no Contexto e no Supabase (estabelecimentos)
      await updateEstablishmentDetails({
        codigo: activeCode,
        nome: nomeLimpo,
        slug: slugLimpo,
        whatsapp: whatsapp,
        telefone: whatsapp,
      });

      // 4. Garante também update direto no Supabase para integridade imediata
      if (activeCode) {
        await supabase
          .from("estabelecimentos")
          .update({
            nome: nomeLimpo,
            slug: slugLimpo,
            whatsapp: whatsapp,
            telefone: whatsapp,
            updated_at: new Date().toISOString(),
          })
          .ilike("codigo", activeCode.toUpperCase().trim());
      }

      toast.success("🧁 Confeitaria configurada com sucesso! Bem-vindo ao CaixaDoce!");

      // 5. Redireciona com segurança para a tela principal (Dashboard)
      setTimeout(() => {
        navigate({ to: "/" } as any);
      }, 300);
    } catch (err: any) {
      console.error("[Onboarding] Erro ao salvar dados da loja:", err);
      toast.error(`Não foi possível salvar as configurações: ${err?.message || "Tente novamente."}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#FAF5FF] to-[#FFF1F2] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Topo com Logo e Indicador */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between pb-6 sm:pb-8">
        <CaixaDoceLogo size="md" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Primeiro Acesso</span>
        </div>
      </header>

      {/* Card Principal de Onboarding */}
      <main className="w-full max-w-xl mx-auto my-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-purple-100 shadow-2xl shadow-purple-900/10 p-6 sm:p-8 space-y-6">
          {/* Cabeçalho do Card */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Cake className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vamos configurar a sua confeitaria! 🧁
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Preencha os dados essenciais da sua loja para liberar o seu <strong>cardápio digital</strong> e acessar o painel de gestão.
            </p>
          </div>

          {/* Destaque das 3 etapas automáticas */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-[11px] font-semibold text-purple-900">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                1
              </span>
              <span className="truncate">Sua Loja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                2
              </span>
              <span className="truncate">Seu Link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                3
              </span>
              <span className="truncate">WhatsApp</span>
            </div>
          </div>

          {/* Formulário Focado */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Nome da Loja */}
            <div className="space-y-1.5">
              <Label htmlFor="nomeLoja" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-purple-600" />
                Nome da Confeitaria / Ateliê <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="nomeLoja"
                type="text"
                placeholder="Ex: Ateliê Doce Sabor, Bolos da Maria..."
                value={nomeLoja}
                onChange={handleNomeChange}
                required
                className="h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Como os clientes conhecem a sua confeitaria ou marca.
              </p>
            </div>

            {/* 2. Link Personalizado (Slug) */}
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
                Link Personalizado do Cardápio (Slug) <span className="text-rose-500">*</span>
              </Label>
              
              <div className="flex rounded-xl shadow-xs overflow-hidden border border-slate-200 focus-within:border-purple-500 bg-slate-50/70 focus-within:bg-white">
                <span className="inline-flex items-center px-3 text-xs font-mono text-purple-700 bg-purple-50 border-r border-purple-100 select-none">
                  caixadoce.com.br/cardapio/
                </span>
                <input
                  id="slug"
                  type="text"
                  placeholder="sua-loja"
                  value={slug}
                  onChange={handleSlugChange}
                  required
                  className="flex-1 px-3 py-2 text-sm font-mono lowercase bg-transparent focus:outline-hidden"
                />
              </div>

              {/* Status de Validação do Slug */}
              <div className="flex items-center justify-between min-h-[20px] px-1 text-[11px]">
                {checkingSlug ? (
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" /> Verificando disponibilidade...
                  </span>
                ) : slugStatus === "available" ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Link disponível!
                  </span>
                ) : slugStatus === "taken" ? (
                  <span className="flex items-center gap-1 text-rose-600 font-bold">
                    <XCircle className="w-3.5 h-3.5" /> {slugErrorMsg || "Este link já está em uso."}
                  </span>
                ) : slugStatus === "too_short" ? (
                  <span className="text-amber-600 font-medium">Mínimo de 3 caracteres</span>
                ) : (
                  <span className="text-muted-foreground">Apenas letras minúsculas, números e hífens</span>
                )}

                {slug && slugStatus === "available" && (
                  <span className="text-[10px] text-purple-600 font-mono font-bold truncate max-w-[180px]">
                    /{slug}
                  </span>
                )}
              </div>
            </div>

            {/* 3. WhatsApp de Atendimento */}
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp de Atendimento <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={handleWhatsappChange}
                maxLength={15}
                required
                className="h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Seus clientes enviarão pedidos e dúvidas diretamente para este número.
              </p>
            </div>

            {/* Botão de Conclusão */}
            <div className="pt-3">
              <Button
                type="submit"
                disabled={salvando || checkingSlug || slugStatus === "taken"}
                className="w-full h-12 text-sm sm:text-base font-extrabold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-purple-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Configurando sua Confeitaria...</span>
                  </>
                ) : (
                  <>
                    <span>Salvar e Acessar Meu Painel</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Rodapé Seguro com Identificação do Usuário e Opção de Logout */}
      <footer className="w-full max-w-xl mx-auto pt-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Conectado como: <strong>{user?.email || "Usuário"}</strong></span>
          {profile?.establishmentCode && (
            <span className="font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
              {profile.establishmentCode}
            </span>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair ou entrar com outra conta</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
