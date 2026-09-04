import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTABELECIMENTO_PADRAO,
  gerarCodigoEstabelecimento,
  type Estabelecimento,
} from "@/lib/caixadoce-data";
import {
  type PlanoId,
  salvarDadosPlanoEstabelecimento,
  obterPlanoEfetivoEstabelecimento,
} from "@/lib/planos-utils";
import { salvarDadosInstitucionaisCache, type DadosInstitucionais, type ContaPix } from "@/lib/pix-utils";
import { toast } from "sonner";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider?: "email" | "google";
  created_at?: string;
};

export type StaffRole = "admin" | "gerente" | "operador";

export type UpdateEstablishmentDetailsInput = {
  estabelecimentoId?: string;
  codigo?: string;
  nome?: string;
  endereco?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  cnpj?: string;
  chavePix?: string;
  tipoChavePix?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  logoUrl?: string;
  store_logo_url?: string;
  tituloCardapio?: string;
  menu_title?: string;
  sloganCardapio?: string;
  menu_slogan?: string;
  bannerUrl?: string;
  banner_url?: string;
  store_banner_url?: string;
  themeColor?: string;
  theme_color?: string;
  corTema?: string;
  cor_destaque?: string;
  contasPix?: ContaPix[];
  instagram?: string;
  social_instagram?: string;
  tiktok?: string;
  social_tiktok?: string;
  facebook?: string;
  social_facebook?: string;
  social_media?: any;
  delivery_ativo?: boolean;
  aceita_delivery?: boolean;
  deliveryHabilitado?: boolean;
};

export type StaffProfile = {
  role: StaffRole;
  establishmentCode: string;
  establishmentName: string;
  establishmentAddress: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  chavePix?: string;
  tipoChavePix?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  logoUrl?: string;
  store_logo_url?: string;
  bannerUrl?: string;
  banner_url?: string;
  store_banner_url?: string;
  themeColor?: string;
  theme_color?: string;
  corTema?: string;
  cor_destaque?: string;
  tituloCardapio?: string;
  menu_title?: string;
  sloganCardapio?: string;
  menu_slogan?: string;
  contasPix?: ContaPix[];
  instagram?: string;
  social_instagram?: string;
  tiktok?: string;
  social_tiktok?: string;
  facebook?: string;
  social_facebook?: string;
  social_media?: any;
  delivery_ativo?: boolean;
  aceita_delivery?: boolean;
  deliveryHabilitado?: boolean;
  abasPermitidas?: string[];
  ownerUserId?: string;
  userCreatedAt?: string;
};

export type UserProfile = StaffProfile;

const INITIAL_ESTABELECIMENTOS: Estabelecimento[] = [];

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  estabelecimentos: Estabelecimento[];
  userEstabelecimentos: Estabelecimento[];
  isMounted: boolean;
  authLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginComPin: (codigoLoja: string, pin: string) => Promise<{ success: boolean }>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ requiresConfirmation: boolean }>;
  sendEmailOtpSignUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resendEmailOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  createEstablishment: (nome: string, endereco: string, role?: StaffRole) => Promise<{ code: string }>;
  updateEstablishmentDetails: (details: UpdateEstablishmentDetailsInput) => Promise<void>;
  updateEstablishmentPlan: (planoId: PlanoId, pagamentoConfirmado?: boolean) => Promise<void>;
  selectProfile: (profile: UserProfile) => void;
  switchProfile: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUserProfile: (dados: { name?: string; avatar?: string; telefone?: string }) => Promise<void>;
  deleteUserAccount: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getAppBaseUrl(path: string = ""): string {
  let origin = "https://www.caixadoce.com.br";
  if (typeof window !== "undefined" && window.location.origin) {
    const host = window.location.hostname;
    if (!host.includes("caixadoce-nine") && !host.includes("vercel.app")) {
      origin = window.location.origin;
    }
  }

  if (!path) return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [isMounted, setIsMounted] = useState(false);

const generateUniqueCodeFromUserId = (userId?: string): string => {
  if (!userId) return "";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const codeNum = 1000 + (Math.abs(hash) % 8999);
  return `CD-${codeNum}`;
};

  // Helper centralizado para montagem do perfil com tenant estrito da loja Master e permissoes
  const buildProfileForUser = (authUser: any, emailStr: string): UserProfile => {
    const isColab = emailStr.includes("@") && (emailStr.endsWith(".caixadoce.app") || authUser?.user_metadata?.role === "colaborador" || authUser?.user_metadata?.role === "operador");
    
    let rawCode = authUser?.user_metadata?.establishmentCode || authUser?.user_metadata?.establishment_code;
    if (!rawCode && isColab && emailStr.includes("@")) {
      rawCode = emailStr.split("@")[1].replace(".caixadoce.app", "");
    }
    if (!rawCode && authUser?.id) {
      rawCode = generateUniqueCodeFromUserId(authUser.id);
      // Salva permanentemente nos metadados do Supabase para manter o mesmo código em todos os dispositivos
      supabase.auth.updateUser({ data: { establishmentCode: rawCode } }).catch(() => {});
    }
    if (!rawCode) {
      rawCode = "";
    }

    const formattedCode = rawCode
      ? (rawCode.toUpperCase().startsWith("CD-")
          ? rawCode.toUpperCase()
          : rawCode.length === 4 && !isNaN(Number(rawCode))
          ? `CD-${rawCode}`
          : rawCode.toUpperCase())
      : "";

    const masterEst = estabelecimentos.find((e) => formattedCode && e.codigo.toUpperCase() === formattedCode);

    let abasPermitidas = authUser?.user_metadata?.abasPermitidas;
    if (isColab && !abasPermitidas && typeof window !== "undefined" && formattedCode) {
      try {
        const rawColabs = localStorage.getItem(`caixadoce_colaboradores_${formattedCode}`);
        if (rawColabs) {
          const colabs = JSON.parse(rawColabs);
          const colabCleanName = emailStr.split("@")[0].toLowerCase();
          const matchColab = colabs.find((c: any) =>
            c.email?.toLowerCase().startsWith(colabCleanName) ||
            c.nome?.toLowerCase().replace(/[^a-z0-9]/g, "") === colabCleanName
          );
          if (matchColab?.abasPermitidas) {
            abasPermitidas = matchColab.abasPermitidas;
          }
        }
      } catch {}
    }

    if (isColab) {
      abasPermitidas = ["despesas", "produtos", "encomendas"];
    }

    const isUserUuid = authUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUser.id);
    return {
      role: isColab ? "operador" : "admin",
      establishmentCode: formattedCode,
      establishmentName: masterEst?.nome || (formattedCode ? `Confeitaria ${formattedCode}` : "Minha Confeitaria"),
      establishmentAddress: masterEst?.endereco || "",
      chavePix: masterEst?.chavePix || "",
      tipoChavePix: masterEst?.tipoChavePix || "cpf",
      abasPermitidas: isColab ? abasPermitidas : undefined,
      ownerUserId: isUserUuid ? authUser.id : undefined,
      userCreatedAt: authUser?.created_at || authUser?.user_metadata?.created_at || masterEst?.created_at,
    };
  };

  const [authLoading, setAuthLoading] = useState(true);

  // Inicialização e Carregamento de Sessão
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedUser = localStorage.getItem("caixadoce_user");
      const savedProfile = localStorage.getItem("caixadoce_profile");

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch (e) {
      console.warn("[Auth] Erro ao restaurar sessão local:", e);
    }

    // Buscador assíncrono de sessão inicial com filtro estrito de tenant por user_id
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn("[Auth] Erro ao recuperar getSession():", error.message);
        }
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
            email: session.user.email || "",
            avatar: session.user.user_metadata?.avatar_url || "",
            provider: session.user.app_metadata?.provider === "google" ? "google" : "email",
            created_at: session.user.created_at,
          };
          setUser(u);
          localStorage.setItem("caixadoce_user", JSON.stringify(u));

          const baseProf = buildProfileForUser(session.user, u.email);
          setProfile(baseProf);
          localStorage.setItem("caixadoce_profile", JSON.stringify(baseProf));

          // CHECAGEM PRÉVIA DE SEGURANÇA: Busca primeiro por user_id ou por codigo da loja para evitar 409 Conflict
          const carregarOuCriarEstabelecimento = async () => {
            let data: any = null;

            // 1. Busca por user_id
            const { data: byUser } = await supabase
              .from("estabelecimentos")
              .select("*")
              .eq("user_id", u.id)
              .maybeSingle();

            if (byUser) {
              data = byUser;
            } else if (baseProf.establishmentCode) {
              // 2. Busca por código da loja (case-insensitive)
              const { data: byCode } = await supabase
                .from("estabelecimentos")
                .select("*")
                .ilike("codigo", baseProf.establishmentCode)
                .maybeSingle();

              if (byCode) {
                data = byCode;
                if (!byCode.user_id && u.id) {
                  await supabase
                    .from("estabelecimentos")
                    .update({ user_id: u.id })
                    .eq("id", byCode.id);
                }
              }
            }

            if (data) {
              // SINCRONIZAÇÃO ESTRITA DE PLANO E ASSINATURA DO BANCO (SOBRESCREVE CACHE LOCAL)
              const statusBanco = data.status || data.status_assinatura || data.plano_status;
              const planoIdBanco = data.plano || data.plano_id || "mensal";
              const expBanco = data.plano_exp || data.plano_expira_em || data.data_expiracao;
              const expMs = expBanco ? new Date(expBanco).getTime() : 0;
              const temDataExpiracao = Boolean(expBanco) && !isNaN(expMs);

              const targetCode = data.codigo || baseProf.establishmentCode;
              if (targetCode) {
                if (temDataExpiracao) {
                  if (expMs > Date.now()) {
                    salvarDadosPlanoEstabelecimento(targetCode, {
                      status: "ativo",
                      planoId: (planoIdBanco !== "basico" ? planoIdBanco : "mensal") as any,
                      dataExpiracao: expBanco,
                      diasRestantesTrial: 0,
                    });
                  } else {
                    salvarDadosPlanoEstabelecimento(targetCode, {
                      status: "expirado",
                      planoId: "basico",
                      dataExpiracao: expBanco,
                      diasRestantesTrial: 0,
                    });
                  }
                } else if (statusBanco === "ativo" && (data.mercadopago_pagamento_id || data.mercadopago_assinatura_id || data.stripe_subscription_id)) {
                  salvarDadosPlanoEstabelecimento(targetCode, {
                    status: "ativo",
                    planoId: (planoIdBanco !== "basico" ? planoIdBanco : "mensal") as any,
                    diasRestantesTrial: 0,
                  });
                } else if (statusBanco === "expirado" || statusBanco === "cancelado" || statusBanco === "basic" || statusBanco === "basico") {
                  salvarDadosPlanoEstabelecimento(targetCode, {
                    status: "expirado",
                    planoId: "basico",
                    diasRestantesTrial: 0,
                  });
                }
              }

              const merged: UserProfile = {
                ...baseProf,
                establishmentCode: data.codigo || baseProf.establishmentCode,
                establishmentName: data.nome || baseProf.establishmentName,
                establishmentAddress: data.endereco || baseProf.establishmentAddress,
                logradouro: data.logradouro || baseProf.logradouro,
                numero: data.numero || baseProf.numero,
                complemento: data.complemento || baseProf.complemento,
                bairro: data.bairro || baseProf.bairro,
                cidade: data.cidade || baseProf.cidade,
                estado: data.estado || baseProf.estado,
                cep: data.cep || baseProf.cep,
                tipoDocumento: data.tipo_documento || baseProf.tipoDocumento,
                numeroDocumento: data.numero_documento || baseProf.numeroDocumento,
                chavePix: data.chave_pix || baseProf.chavePix,
                tipoChavePix: data.tipo_chave_pix || baseProf.tipoChavePix,
                contasPix: Array.isArray(data.pix_accounts) && data.pix_accounts.length > 0
                  ? data.pix_accounts
                  : (Array.isArray(data.pix_keys) && data.pix_keys.length > 0 ? data.pix_keys : baseProf.contasPix),
                responsavel: data.responsavel || baseProf.responsavel,
                telefone: data.telefone || baseProf.telefone,
                whatsapp: data.whatsapp || baseProf.whatsapp,
                logoUrl: data.logo_url || data.store_logo_url || baseProf.logoUrl,
                store_logo_url: data.store_logo_url || data.logo_url || baseProf.store_logo_url,
                tituloCardapio: data.titulo_cardapio || data.menu_title || baseProf.tituloCardapio,
                menu_title: data.menu_title || data.titulo_cardapio || baseProf.menu_title,
                sloganCardapio: data.slogan_cardapio || data.menu_slogan || baseProf.sloganCardapio,
                menu_slogan: data.menu_slogan || data.slogan_cardapio || baseProf.menu_slogan,
                ownerUserId: data.user_id || u.id,
                userCreatedAt: data.created_at || session.user.created_at || baseProf.userCreatedAt,
              };
              setProfile(merged);
              localStorage.setItem("caixadoce_profile", JSON.stringify(merged));
            } else if (baseProf.establishmentCode) {
              // Somente executa UPSERT se a loja realmente não existir no banco
              const { data: insertedData } = await supabase
                .from("estabelecimentos")
                .upsert(
                  [
                    {
                      codigo: baseProf.establishmentCode,
                      nome: baseProf.establishmentName || `Confeitaria ${baseProf.establishmentCode}`,
                      user_id: u.id,
                      created_at: session.user.created_at || new Date().toISOString(),
                    },
                  ],
                  { onConflict: "codigo" }
                )
                .select("*")
                .maybeSingle();

              if (insertedData) {
                const d = insertedData;
                const newProf: UserProfile = {
                  ...baseProf,
                  establishmentCode: d.codigo,
                  establishmentName: d.nome,
                  ownerUserId: u.id,
                };
                setProfile(newProf);
                localStorage.setItem("caixadoce_profile", JSON.stringify(newProf));
              }
            }
          };

          carregarOuCriarEstabelecimento();
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });

    // Listener de mudanças de estado do Supabase Auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] Evento onAuthStateChange:", event, session?.user?.email);

      if (session?.user) {
        const u: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url || "",
          provider: session.user.app_metadata?.provider === "google" ? "google" : "email",
        };
        setUser(u);
        localStorage.setItem("caixadoce_user", JSON.stringify(u));

        // Monta ou atualiza o perfil garantindo o vinculo correto com a loja Master
        setProfile((prev) => {
          if (prev && prev.establishmentCode && prev.role !== "operador") return prev;
          const prof = buildProfileForUser(session.user, u.email);
          localStorage.setItem("caixadoce_profile", JSON.stringify(prof));
          return prof;
        });

        // Limpeza de hash fragmentos de OAuth/Auth Callbacks SOMENTE APÓS O SUPABASE PROCESSAR E VALIDAR A SESSÃO
        if (typeof window !== "undefined" && window.location.hash) {
          if (
            window.location.hash.includes("access_token") ||
            window.location.hash.includes("error") ||
            window.location.hash.includes("type=recovery") ||
            window.location.hash === "#"
          ) {
            try {
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
              );
            } catch {}
          }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("caixadoce_user");
        localStorage.removeItem("caixadoce_profile");
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Timeout de Sessão: Listener de Inatividade (Auto-Logout PDV 4h)
  useEffect(() => {
    const isColab = profile?.role === "operador" || user?.email?.endsWith(".caixadoce.app");
    if (!user || !isColab) return;

    const TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 horas
    let timer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast.warning("Sessão encerra automaticamente após 4 horas de inatividade no PDV.");
        logout();
      }, TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));

    resetInactivityTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
    };
  }, [user, profile?.role]);

  const userEstabelecimentos = useMemo(() => {
    return estabelecimentos;
  }, [estabelecimentos]);

  const loginComPin = async (codigoLoja: string, pin: string) => {
    const rawCode = (codigoLoja || "").trim();
    const rawPin = (pin || "").trim();

    if (!rawCode || !rawPin) {
      const err = new Error("Preencha o Código da Loja e o PIN de Acesso.");
      toast.error(err.message);
      throw err;
    }

    const formattedCode = rawCode.toUpperCase().startsWith("CD-")
      ? rawCode.toUpperCase()
      : rawCode.length === 4 && !isNaN(Number(rawCode))
      ? `CD-${rawCode}`
      : rawCode.toUpperCase();

    // 1. Consulta OBRIGATÓRIA na tabela colaboradores (e fallback staff_members) no Supabase
    let colabEncontrado: any = null;
    try {
      const { data: dbColabs, error: dbErr } = await supabase
        .from("colaboradores")
        .select("*")
        .eq("estabelecimento_codigo", formattedCode);

      if (!dbErr && dbColabs && dbColabs.length > 0) {
        colabEncontrado = dbColabs.find((c: any) => {
          const matchPin =
            String(c.pin || c.codigo_pin || c.pin_code || c.senha || "") === String(rawPin);
          const isAtivo = c.ativo !== false && c.is_active !== false;
          return matchPin && isAtivo;
        });
      }

      if (!colabEncontrado) {
        const { data: staffColabs } = await supabase
          .from("staff_members")
          .select("*")
          .eq("estabelecimento_codigo", formattedCode);

        if (staffColabs && staffColabs.length > 0) {
          colabEncontrado = staffColabs.find((c: any) => {
            const matchPin =
              String(c.pin || c.codigo_pin || c.pin_code || c.senha || "") === String(rawPin);
            const isAtivo = c.ativo !== false && c.is_active !== false;
            return matchPin && isAtivo;
          });
        }
      }
    } catch (e) {
      console.warn("Aviso ao consultar colaboradores no Supabase:", e);
    }

    // Fallback de cache local da loja se offline ou durante transição
    if (!colabEncontrado && typeof window !== "undefined") {
      try {
        const rawLocal = localStorage.getItem(`caixadoce_colaboradores_${formattedCode}`);
        if (rawLocal) {
          const listLocal = JSON.parse(rawLocal);
          colabEncontrado = listLocal.find(
            (c: any) => String(c.pin) === String(rawPin) && c.ativo !== false
          );
        }
      } catch {}
    }

    // 2. SE O PIN NÃO FOR VÁLIDO E ATIVO PARA ESSA LOJA ESPECÍFICA, BLOQUEIA O ACESSO
    if (!colabEncontrado) {
      const err = new Error("Código da Loja ou PIN de Acesso inválidos.");
      toast.error("Código da Loja ou PIN inválidos.");
      throw err;
    }

    // 3. Obter dados da loja se disponível
    let estNome = `Confeitaria ${formattedCode}`;
    let estEndereco = "";
    const estLocal = estabelecimentos.find((e) => e.codigo.toUpperCase() === formattedCode);
    if (estLocal) {
      estNome = estLocal.nome;
      estEndereco = estLocal.endereco || "";
    } else {
      try {
        const { data: estData } = await supabase
          .from("estabelecimentos")
          .select("nome, name, endereco")
          .eq("codigo", formattedCode)
          .maybeSingle();

        if (estData) {
          estNome = estData.nome || estData.name || estNome;
          estEndereco = estData.endereco || "";
        }
      } catch {}
    }

    // 4. COLABORADOR VÁLIDO: Concede acesso com perfil restrito
    const colabName = colabEncontrado.nome || colabEncontrado.name || "Colaborador";
    const cleanName = colabName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const syntheticEmail = colabEncontrado.email || `${cleanName}@${formattedCode.toLowerCase()}.caixadoce.app`;

    const colabUser: User = {
      id: colabEncontrado.id || `colab_${Date.now()}`,
      name: colabName,
      email: syntheticEmail,
      provider: "email",
    };

    const colabProfile: UserProfile = {
      role: "operador",
      establishmentCode: formattedCode,
      establishmentName: estNome,
      establishmentAddress: estEndereco,
      chavePix: estLocal?.chavePix || "",
      tipoChavePix: estLocal?.tipoChavePix || "cpf",
      abasPermitidas: colabEncontrado.abas_permitidas || colabEncontrado.allowed_tabs || colabEncontrado.abasPermitidas || ["despesas", "produtos", "encomendas"],
    };

    setUser(colabUser);
    setProfile(colabProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem("caixadoce_user", JSON.stringify(colabUser));
      localStorage.setItem("caixadoce_profile", JSON.stringify(colabProfile));
    }

    toast.success(`Acesso PDV liberado para ${colabName}!`);
    return { success: true };
  };

  const loginWithEmail = async (email: string, password: string) => {
    const isCollaboratorSynthetic = email.includes("@") && email.endsWith(".caixadoce.app");
    if (isCollaboratorSynthetic) {
      const parts = email.split("@")[0];
      const codePart = email.split("@")[1]?.replace(".caixadoce.app", "") || "";
      await loginComPin(codePart, password);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Auth] Erro no signInWithPassword:", error);
      if (
        error.status === 429 ||
        error.message?.toLowerCase().includes("too_many_requests") ||
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.toLowerCase().includes("exceeded")
      ) {
        toast.error("Muitas tentativas falhas. Tente novamente em alguns minutos.");
      } else if (
        error.status === 400 ||
        error.message?.toLowerCase().includes("invalid login credentials") ||
        error.message?.toLowerCase().includes("invalid_grant")
      ) {
        toast.error("E-mail ou senha incorretos. Verifique suas credenciais.");
      } else {
        toast.error(error.message || "Credenciais inválidas. Tente novamente.");
      }
      throw error;
    }

    if (data?.session && data?.user) {
      const loggedUser: User = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0] || "Usuário",
        email: data.user.email || email,
        avatar: data.user.user_metadata?.avatar_url || "",
        provider: "email",
      };
      const loggedProfile = buildProfileForUser(data.user, email);
      setUser(loggedUser);
      setProfile(loggedProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem("caixadoce_user", JSON.stringify(loggedUser));
        localStorage.setItem("caixadoce_profile", JSON.stringify(loggedProfile));
      }
      toast.success("Bem-vindo ao CaixaDoce!");
    } else {
      toast.error("Credenciais inválidas ou erro na autenticação.");
      throw new Error("Sessão inválida do Supabase Auth.");
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string): Promise<{ requiresConfirmation: boolean }> => {
    const redirectUrl = getAppBaseUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: name, name },
      },
    });

    if (error) {
      toast.error(error.message || "Erro ao criar conta no Supabase Auth.");
      throw error;
    }

    if (data?.session && data?.user) {
      const newUser: User = {
        id: data.user.id,
        name,
        email,
        provider: "email",
      };
      const newProfile = buildProfileForUser(data.user, email);
      setUser(newUser);
      setProfile(newProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem("caixadoce_user", JSON.stringify(newUser));
        localStorage.setItem("caixadoce_profile", JSON.stringify(newProfile));
      }
      toast.success("Conta criada e login efetuado com sucesso!");
      return { requiresConfirmation: false };
    } else if (data?.user) {
      return { requiresConfirmation: true };
    }

    return { requiresConfirmation: false };
  };

  const sendEmailOtpSignUp = async (name: string, email: string, password: string) => {
    try {
      const redirectUrl = getAppBaseUrl();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: name, name },
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Falha ao enviar código OTP." };
    }
  };

  const verifyEmailOtp = async (email: string, token: string, name: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });

      if (error) throw error;

      if (data.user) {
        const verifiedUser: User = {
          id: data.user.id,
          name: name || data.user.email?.split("@")[0] || "Usuário",
          email,
          provider: "email",
        };
        setUser(verifiedUser);
        localStorage.setItem("caixadoce_user", JSON.stringify(verifiedUser));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Código de verificação incorreto ou expirado." };
    }
  };

  const resendEmailOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Falha ao reenviar código." };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const redirectUrl = getAppBaseUrl();
      console.log("[Auth] Iniciando OAuth do Google com redirectTo:", redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("[Auth] Erro no login com Google:", err);
      toast.error(err?.message || "Erro ao conectar com Google. Tente novamente.");
    }
  };

  const createEstablishment = async (nome: string, endereco: string, role: StaffRole = "admin") => {
    const code = gerarCodigoEstabelecimento();
    const novo: Estabelecimento = {
      id: crypto.randomUUID(),
      codigo: code,
      nome,
      endereco,
      responsavel: user?.name || "Administrador",
    };

    const atualizados = [...estabelecimentos, novo];
    setEstabelecimentos(atualizados);
    localStorage.setItem("caixadoce_estabelecimentos", JSON.stringify(atualizados));

    const newProfile: UserProfile = {
      role,
      establishmentCode: code,
      establishmentName: nome,
      establishmentAddress: endereco,
    };
    setProfile(newProfile);
    localStorage.setItem("caixadoce_profile", JSON.stringify(newProfile));

    toast.success(`Estabelecimento "${nome}" criado com sucesso! Código: ${code}`);
    return { code };
  };

  const updateEstablishmentDetails = async (details: UpdateEstablishmentDetailsInput) => {
    if (!user || !profile) return;
    const currentCode = profile.establishmentCode;

    const updatedProfile: UserProfile = {
      ...profile,
      ...details,
      establishmentName: details.nome || profile.establishmentName,
      establishmentAddress: details.endereco || profile.establishmentAddress,
    };
    setProfile(updatedProfile);
    localStorage.setItem("caixadoce_profile", JSON.stringify(updatedProfile));

    setEstabelecimentos((prev) =>
      prev.map((e) =>
        e.codigo === currentCode
          ? {
              ...e,
              ...details,
              nome: details.nome || e.nome,
              endereco: details.endereco || e.endereco,
            }
          : e
      )
    );

    // Gravação REAL via UPDATE / INSERT no Supabase na tabela estabelecimentos
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      // Objeto de dados para UPDATE contendo estritamente os campos modificados (NUNCA envia 'codigo', 'user_id' ou 'id')
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (details.nome !== undefined) updatePayload.nome = details.nome;
      if (details.responsavel !== undefined) updatePayload.responsavel = details.responsavel;

      if (details.tipoDocumento !== undefined) updatePayload.tipo_documento = details.tipoDocumento;

      const docNum = details.numeroDocumento || details.cnpj;
      if (docNum !== undefined) {
        updatePayload.numero_documento = docNum || null;
        updatePayload.cnpj = docNum || null;
      }

      if (details.tipoChavePix !== undefined) updatePayload.tipo_chave_pix = details.tipoChavePix;
      if (details.chavePix !== undefined) updatePayload.chave_pix = details.chavePix || null;

      if (details.contasPix !== undefined) {
        updatePayload.pix_accounts = details.contasPix || null;
        updatePayload.pix_keys = details.contasPix || null;
      }

      if (details.cep !== undefined) updatePayload.cep = details.cep || null;
      if (details.endereco !== undefined) updatePayload.endereco = details.endereco || null;
      if (details.logradouro !== undefined) updatePayload.logradouro = details.logradouro || null;
      if (details.numero !== undefined) updatePayload.numero = details.numero || null;
      if (details.complemento !== undefined) updatePayload.complemento = details.complemento || null;
      if (details.bairro !== undefined) updatePayload.bairro = details.bairro || null;
      if (details.cidade !== undefined) updatePayload.cidade = details.cidade || null;
      if (details.estado !== undefined) updatePayload.estado = details.estado || null;
      if (details.telefone !== undefined) updatePayload.telefone = details.telefone || null;
      if (details.whatsapp !== undefined) updatePayload.whatsapp = details.whatsapp || null;

      const logo = details.logoUrl || details.store_logo_url;
      if (logo !== undefined) {
        updatePayload.logo_url = logo || null;
        updatePayload.store_logo_url = logo || null;
      }

      const banner = details.bannerUrl || details.banner_url || details.store_banner_url;
      if (banner !== undefined) {
        updatePayload.banner_url = banner || null;
        updatePayload.store_banner_url = banner || null;
      }

      const themeCol = details.themeColor || details.theme_color || details.corTema || details.cor_destaque;
      if (themeCol !== undefined) {
        updatePayload.theme_color = themeCol || null;
        updatePayload.cor_destaque = themeCol || null;
      }

      const titulo = details.tituloCardapio || details.menu_title;
      if (titulo !== undefined) {
        updatePayload.titulo_cardapio = titulo || null;
        updatePayload.menu_title = titulo || null;
      }

      const slogan = details.sloganCardapio || details.menu_slogan;
      if (slogan !== undefined) {
        updatePayload.slogan_cardapio = slogan || null;
        updatePayload.menu_slogan = slogan || null;
      }

      const instaVal = details.instagram || details.social_instagram;
      if (instaVal !== undefined) {
        updatePayload.instagram = instaVal || null;
        updatePayload.social_instagram = instaVal || null;
      }

      const tiktokVal = details.tiktok || details.social_tiktok;
      if (tiktokVal !== undefined) {
        updatePayload.tiktok = tiktokVal || null;
        updatePayload.social_tiktok = tiktokVal || null;
      }

      const fbVal = details.facebook || details.social_facebook;
      if (fbVal !== undefined) {
        updatePayload.facebook = fbVal || null;
        updatePayload.social_facebook = fbVal || null;
      }

      const delAtivo = details.delivery_ativo ?? details.aceita_delivery ?? details.deliveryHabilitado;
      if (delAtivo !== undefined) {
        updatePayload.delivery_ativo = delAtivo;
        updatePayload.aceita_delivery = delAtivo;
      }

      if (
        instaVal !== undefined ||
        tiktokVal !== undefined ||
        fbVal !== undefined ||
        details.whatsapp !== undefined
      ) {
        updatePayload.social_media = {
          instagram: instaVal || "",
          tiktok: tiktokVal || "",
          facebook: fbVal || "",
          whatsapp: details.whatsapp || details.telefone || "",
        };
      }

      const activeStoreCode = details.codigo || currentCode;

      // 1. Busca o ID do estabelecimento ativo estritamente pelo código da loja atual (ex: CD-5411) ou pelo ID fornecido
      let targetId: string | null = details.estabelecimentoId || null;

      if (!targetId && activeStoreCode) {
        const { data: estByCode } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, user_id")
          .eq("codigo", activeStoreCode)
          .maybeSingle();

        if (estByCode?.id) {
          targetId = estByCode.id;
        }
      }

      if (!targetId && user?.id) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        if (isUuid) {
          const { data: estByUser } = await supabase
            .from("estabelecimentos")
            .select("id, codigo, user_id")
            .eq("user_id", user.id)
            .limit(1);

          if (estByUser && estByUser.length > 0) {
            targetId = estByUser[0].id;
          }
        }
      }

      let saveError: any = null;

      // Garantia extrema: Remove completamente 'codigo', 'user_id', 'id' e 'estabelecimentoId' do payload de update
      delete (updatePayload as any).codigo;
      delete (updatePayload as any).user_id;
      delete (updatePayload as any).id;
      delete (updatePayload as any).estabelecimentoId;

      console.log("ACTIVE CODE PARA UPDATE:", activeStoreCode);
      console.log("TARGET ID PARA UPDATE:", targetId);
      console.log("PAYLOAD ENVIADO (UPDATE por id):", updatePayload);

      if (targetId) {
        // Se a loja já existe no banco, faz UPDATE direcionado exclusivamente pelo id da chave primária
        const { data, error } = await supabase
          .from("estabelecimentos")
          .update(updatePayload)
          .eq("id", targetId)
          .select();

        console.log("RESPOSTA SUPABASE UPDATE:", { data, error });

        saveError = error;

        // Se o Supabase retornou 0 linhas atualizadas, tenta o update por codigo
        if (!error && (!data || data.length === 0)) {
          console.warn("[Supabase] 0 linhas atualizadas por ID. Tentando UPDATE por codigo:", currentCode);
          const resCodigo = await supabase
            .from("estabelecimentos")
            .update(updatePayload)
            .eq("codigo", currentCode)
            .select();

          console.log("RESPOSTA SUPABASE UPDATE POR CODIGO:", resCodigo);
          if (resCodigo.error) saveError = resCodigo.error;
        }
      } else {
        // Se o registro ainda não existir no banco, cria a nova linha via INSERT com os identificadores
        const insertPayload = {
          ...updatePayload,
          codigo: currentCode,
          user_id: isUuid ? user.id : null,
        };
        const insertRes = await supabase
          .from("estabelecimentos")
          .upsert([insertPayload], { onConflict: "codigo" })
          .select();

        console.log("RESPOSTA SUPABASE UPSERT:", insertRes);
        saveError = insertRes.error;
      }

      // 2. Tratamento para colunas opcionais que possam não existir na tabela no Supabase (ex: PGRST204)
      if (saveError) {
        console.error(
          "[Supabase UPDATE estabelecimentos Error]:",
          `Code: ${saveError.code}`,
          `Message: ${saveError.message}`,
          `Details: ${saveError.details}`,
          `Hint: ${saveError.hint}`,
          saveError
        );

        const msg = saveError.message || "";
        const isColumnError = msg.includes("column") || msg.includes("does not exist") || saveError.code === "PGRST204";

        if (isColumnError) {
          console.warn("[Supabase] Removendo colunas estendidas não mapeadas e tentando fallback...");
          const fallbackUpdatePayload = { ...updatePayload };
          delete fallbackUpdatePayload.logo_url;
          delete fallbackUpdatePayload.store_logo_url;
          delete fallbackUpdatePayload.titulo_cardapio;
          delete fallbackUpdatePayload.menu_title;
          delete fallbackUpdatePayload.slogan_cardapio;
          delete fallbackUpdatePayload.menu_slogan;
          delete fallbackUpdatePayload.pix_accounts;
          delete fallbackUpdatePayload.pix_keys;
          delete fallbackUpdatePayload.cnpj;
          delete (fallbackUpdatePayload as any).codigo;
          delete (fallbackUpdatePayload as any).user_id;

          if (targetId) {
            const fbRes = await supabase.from("estabelecimentos").update(fallbackUpdatePayload).eq("id", targetId).select();
            console.log("RESPOSTA SUPABASE FALLBACK UPDATE:", fbRes);
            if (fbRes.error) {
              console.warn("[Supabase Fallback Update Error]:", fbRes.error.message);
            }
          } else {
            const fallbackInsertPayload = {
              ...fallbackUpdatePayload,
              codigo: currentCode,
              user_id: isUuid ? user.id : null,
            };
            await supabase.from("estabelecimentos").upsert([fallbackInsertPayload], { onConflict: "codigo" }).select();
          }
        } else {
          console.warn("[Supabase estabelecimentos update warning]:", saveError.message);
        }
      }

      // Sincronização na tabela auxiliar public.pix_accounts se existir
      if (details.contasPix && user?.id) {
        try {
          const pixRows = details.contasPix.map((c) => ({
            user_id: user.id,
            tipo: c.tipo,
            chave: c.chave,
            favorecido: c.favorecido,
            is_default: c.isDefault,
          }));
          await supabase.from("pix_accounts").delete().eq("user_id", user.id);
          await supabase.from("pix_accounts").insert(pixRows);
        } catch (e) {
          console.warn("[Supabase] Não foi possível sincronizar na tabela pix_accounts:", e);
        }
      }
    } catch (err: any) {
      console.error("[Supabase] Erro ao salvar estabelecimento no banco:", err);
      throw err;
    }

    setProfile((prev) => {
      const current = prev || profile;
      const merged: UserProfile = {
        ...current,
        ...details,
        establishmentName: details.nome !== undefined ? details.nome : current.establishmentName,
        establishmentAddress: details.endereco !== undefined ? details.endereco : current.establishmentAddress,
        chavePix: details.chavePix !== undefined ? details.chavePix : current.chavePix,
        tipoChavePix: details.tipoChavePix !== undefined ? details.tipoChavePix : current.tipoChavePix,
        contasPix: details.contasPix !== undefined ? details.contasPix : current.contasPix,
      };
      localStorage.setItem("caixadoce_profile", JSON.stringify(merged));
      return merged;
    });

    setEstabelecimentos((prev) => {
      const next = prev.map((e) =>
        e.codigo === currentCode
          ? {
              ...e,
              ...details,
              nome: details.nome !== undefined ? details.nome : e.nome,
              endereco: details.endereco !== undefined ? details.endereco : e.endereco,
            }
          : e
      );
      localStorage.setItem("caixadoce_estabelecimentos", JSON.stringify(next));
      return next;
    });

    try {
      queryClient.invalidateQueries({ queryKey: ["estabelecimento"] });
      queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {}

    salvarDadosInstitucionaisCache(currentCode, {
      nome: details.nome,
      chavePix: details.chavePix,
      tipoChavePix: details.tipoChavePix,
      tipoDocumento: details.tipoDocumento,
      numeroDocumento: details.numeroDocumento,
      responsavel: details.responsavel,
      telefone: details.telefone,
      whatsapp: details.whatsapp,
    });

    toast.success("Dados do estabelecimento salvos com sucesso!");
  };

  const updateEstablishmentPlan = async (planoId: PlanoId, pagamentoConfirmado: boolean = false) => {
    if (!profile) return;
    salvarDadosPlanoEstabelecimento(profile.establishmentCode, {
      planoId,
      status: pagamentoConfirmado ? "ativo" : "trial",
      dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    toast.success(`Plano atualizado para: ${planoId.toUpperCase()}`);
  };

  const selectProfile = (p: UserProfile) => {
    setProfile(p);
    localStorage.setItem("caixadoce_profile", JSON.stringify(p));
  };

  const switchProfile = () => {
    setProfile(null);
    localStorage.removeItem("caixadoce_profile");
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setProfile(null);
    localStorage.removeItem("caixadoce_user");
    localStorage.removeItem("caixadoce_profile");
    queryClient.clear();
    toast.info("Você saiu da conta.");
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = getAppBaseUrl("/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast.success("Link de redefinição enviado para seu e-mail!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao solicitar redefinição de senha.");
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar senha.");
    }
  };

  const updateUserProfile = async (dados: { name?: string; avatar?: string; telefone?: string }) => {
    if (!user) return;
    const updated = { ...user, ...dados };
    setUser(updated);
    localStorage.setItem("caixadoce_user", JSON.stringify(updated));

    try {
      await supabase.auth.updateUser({
        data: { full_name: dados.name, avatar_url: dados.avatar },
      });
    } catch {}

    toast.success("Perfil atualizado com sucesso!");
  };

  const deleteUserAccount = async (): Promise<boolean> => {
    try {
      if (user?.id) {
        await supabase.rpc("delete_user_account");
      }
      await logout();
      return true;
    } catch (err: any) {
      toast.error("Erro ao excluir conta: " + err.message);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        estabelecimentos,
        userEstabelecimentos,
        isMounted,
        authLoading,
        loginWithEmail,
        loginComPin,
        registerWithEmail,
        sendEmailOtpSignUp,
        verifyEmailOtp,
        resendEmailOtp,
        loginWithGoogle,
        createEstablishment,
        updateEstablishmentDetails,
        updateEstablishmentPlan,
        selectProfile,
        switchProfile,
        logout,
        resetPassword,
        updatePassword,
        updateUserProfile,
        deleteUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
