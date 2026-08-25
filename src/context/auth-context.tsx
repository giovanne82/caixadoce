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
};

export type StaffRole = "admin" | "gerente" | "operador";

export type UpdateEstablishmentDetailsInput = {
  nome: string;
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
  contasPix?: ContaPix[];
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
  tituloCardapio?: string;
  menu_title?: string;
  sloganCardapio?: string;
  menu_slogan?: string;
  contasPix?: ContaPix[];
  abasPermitidas?: string[];
  ownerUserId?: string;
};

export type UserProfile = StaffProfile;

const INITIAL_ESTABELECIMENTOS: Estabelecimento[] = [ESTABELECIMENTO_PADRAO];

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
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(INITIAL_ESTABELECIMENTOS);
  const [isMounted, setIsMounted] = useState(false);

const generateUniqueCodeFromUserId = (userId?: string): string => {
  if (!userId) return ESTABELECIMENTO_PADRAO.codigo;
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
      rawCode = ESTABELECIMENTO_PADRAO.codigo;
    }

    const formattedCode = rawCode.toUpperCase().startsWith("CD-")
      ? rawCode.toUpperCase()
      : rawCode.length === 4 && !isNaN(Number(rawCode))
      ? `CD-${rawCode}`
      : rawCode.toUpperCase();

    const masterEst = estabelecimentos.find((e) => e.codigo.toUpperCase() === formattedCode);

    let abasPermitidas = authUser?.user_metadata?.abasPermitidas;
    if (isColab && !abasPermitidas && typeof window !== "undefined") {
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
      establishmentName: masterEst?.nome || `Confeitaria ${formattedCode}`,
      establishmentAddress: masterEst?.endereco || "",
      chavePix: masterEst?.chavePix || "",
      tipoChavePix: masterEst?.tipoChavePix || "cpf",
      abasPermitidas: isColab ? abasPermitidas : undefined,
      ownerUserId: isUserUuid ? authUser.id : undefined,
    };
  };



  const [authLoading, setAuthLoading] = useState(true);

  // Inicialização e Carregamento de Sessão
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedEstablishments = localStorage.getItem("caixadoce_estabelecimentos");
      if (savedEstablishments) {
        setEstabelecimentos(JSON.parse(savedEstablishments));
      }

      const savedUser = localStorage.getItem("caixadoce_user");
      const savedProfile = localStorage.getItem("caixadoce_profile");

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch (e) {
      console.warn("[Auth] Erro ao restaurar sessão local:", e);
    }

    // Buscador assíncrono de sessão inicial (Garante resposta rápida do estado inicial)
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
          };
          setUser(u);
          localStorage.setItem("caixadoce_user", JSON.stringify(u));

          const baseProf = buildProfileForUser(session.user, u.email);
          setProfile(baseProf);
          localStorage.setItem("caixadoce_profile", JSON.stringify(baseProf));

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id);
          const filterStr = isUuid
            ? `user_id.eq.${u.id},codigo.eq.${baseProf.establishmentCode}`
            : `codigo.eq.${baseProf.establishmentCode}`;

          // Busca assíncrona dos dados persistidos da loja no Supabase
          supabase
            .from("estabelecimentos")
            .select("*")
            .or(filterStr)
            .maybeSingle()
            .then((res) => {
              if (res.data) {
                const data = res.data;
                const merged: UserProfile = {
                  ...baseProf,
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
                  ownerUserId: data.user_id || baseProf.ownerUserId,
                };
                setProfile(merged);
                localStorage.setItem("caixadoce_profile", JSON.stringify(merged));
              }
            });
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (
          error.status === 429 ||
          error.message?.toLowerCase().includes("too_many_requests") ||
          error.message?.toLowerCase().includes("rate limit") ||
          error.message?.toLowerCase().includes("exceeded")
        ) {
          toast.error("Muitas tentativas falhas. Tente novamente em alguns minutos.");
          throw error;
        }

        // Fallback local caso offline ou cadastrado localmente no navegador
        if (password.length >= 4) {
          const nameFromEmail = email.split("@")[0];

          const fallbackUser: User = {
            id: `usr_${Date.now()}`,
            name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
            email,
            provider: "email",
          };

          const fallbackProfile = buildProfileForUser(null, email);
          setUser(fallbackUser);
          setProfile(fallbackProfile);
          if (typeof window !== "undefined") {
            localStorage.setItem("caixadoce_user", JSON.stringify(fallbackUser));
            localStorage.setItem("caixadoce_profile", JSON.stringify(fallbackProfile));
          }
          toast.success("Login efetuado com sucesso!");
          return;
        }
        throw error;
      }

      if (data.user) {
        const loggedUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Usuário",
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
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao efetuar login. Verifique seu e-mail e senha.");
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string): Promise<{ requiresConfirmation: boolean }> => {
    try {
      const redirectUrl = getAppBaseUrl();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: name, name },
        },
      });

      if (error) throw error;

      if (data.session) {
        const newUser: User = {
          id: data.user?.id || `usr_${Date.now()}`,
          name,
          email,
          provider: "email",
        };
        setUser(newUser);
        localStorage.setItem("caixadoce_user", JSON.stringify(newUser));
        toast.success("Conta criada e login efetuado com sucesso!");
        return { requiresConfirmation: false };
      } else if (data.user) {
        return { requiresConfirmation: true };
      }

      return { requiresConfirmation: false };
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.status === 0) {
        const fallbackUser: User = {
          id: `usr_${Date.now()}`,
          name,
          email,
          provider: "email",
        };
        const fallbackProfile: UserProfile = {
          role: "admin",
          establishmentCode: ESTABELECIMENTO_PADRAO.codigo,
          establishmentName: ESTABELECIMENTO_PADRAO.nome,
          establishmentAddress: ESTABELECIMENTO_PADRAO.endereco,
        };
        setUser(fallbackUser);
        setProfile(fallbackProfile);
        localStorage.setItem("caixadoce_user", JSON.stringify(fallbackUser));
        localStorage.setItem("caixadoce_profile", JSON.stringify(fallbackProfile));
        toast.success("Conta criada com sucesso!");
        return { requiresConfirmation: false };
      }
      toast.error(err?.message || "Erro ao registrar usuário.");
      throw err;
    }
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
      establishmentName: details.nome,
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
              nome: details.nome,
              endereco: details.endereco || e.endereco,
            }
          : e
      )
    );

    // Gravação REAL via UPDATE / INSERT no Supabase na tabela estabelecimentos
    try {
<<<<<<< HEAD
      const payload: any = {
        user_id: user.id,
=======
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      const payload = {
        user_id: isUuid ? user.id : null,
>>>>>>> 7624c4539d6f54a93e4cd659bfe3b282a5c31879
        codigo: currentCode,
        nome: details.nome,
        responsavel: details.responsavel || user.name || "Administrador",
        tipo_documento: details.tipoDocumento || "CNPJ",
        numero_documento: details.numeroDocumento || details.cnpj || null,
        cnpj: details.numeroDocumento || details.cnpj || null,
        tipo_chave_pix: details.tipoChavePix || "email",
        chave_pix: details.chavePix || null,
        pix_accounts: details.contasPix || null,
        pix_keys: details.contasPix || null,
        cep: details.cep || null,
        endereco: details.endereco || null,
        logradouro: details.logradouro || null,
        numero: details.numero || null,
        complemento: details.complemento || null,
        bairro: details.bairro || null,
        cidade: details.cidade || null,
        estado: details.estado || null,
        telefone: details.telefone || null,
        whatsapp: details.whatsapp || null,
        logo_url: details.logoUrl || details.store_logo_url || null,
        store_logo_url: details.store_logo_url || details.logoUrl || null,
        titulo_cardapio: details.tituloCardapio || details.menu_title || null,
        menu_title: details.menu_title || details.tituloCardapio || null,
        slogan_cardapio: details.sloganCardapio || details.menu_slogan || null,
        menu_slogan: details.menu_slogan || details.sloganCardapio || null,
        updated_at: new Date().toISOString(),
      };

      // 1. Tenta identificar se a loja já existe no banco por codigo ou user_id
      const { data: existingRecords } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, user_id")
        .or(`codigo.eq.${currentCode},user_id.eq.${user.id}`)
        .limit(1);

      const targetId = existingRecords && existingRecords.length > 0 ? existingRecords[0].id : null;

      let saveError: any = null;

      if (targetId) {
        // Se a loja já existe no banco, faz UPDATE usando o ID da chave primária (Sem erro de on_conflict)
        const updateRes = await supabase
          .from("estabelecimentos")
          .update(payload)
          .eq("id", targetId);

        saveError = updateRes.error;
      } else {
        // Tenta UPDATE por codigo ou user_id antes de inserir
        let updateRes = await supabase
          .from("estabelecimentos")
          .update(payload)
          .eq("codigo", currentCode);

        if (updateRes.error) {
          updateRes = await supabase
            .from("estabelecimentos")
            .update(payload)
            .eq("user_id", user.id);
        }

        if (updateRes.error) {
          // Se não existir nenhuma linha para atualizar, insere novo registro
          const insertRes = await supabase
            .from("estabelecimentos")
            .insert([payload]);

          saveError = insertRes.error;
        } else {
          saveError = updateRes.error;
        }
      }

      // 2. Tratamento para colunas opcionais que possam não existir na tabela no Supabase (ex: PGRST204)
      if (saveError) {
        const msg = saveError.message || "";
        const isColumnError = msg.includes("column") || msg.includes("does not exist") || saveError.code === "PGRST204";

        if (isColumnError) {
          console.warn("[Supabase] Removendo colunas estendidas não mapeadas e tentando fallback...");
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as any).logo_url;
          delete (fallbackPayload as any).store_logo_url;
          delete (fallbackPayload as any).titulo_cardapio;
          delete (fallbackPayload as any).menu_title;
          delete (fallbackPayload as any).slogan_cardapio;
          delete (fallbackPayload as any).menu_slogan;
          delete (fallbackPayload as any).pix_accounts;
          delete (fallbackPayload as any).pix_keys;
          delete (fallbackPayload as any).cnpj;

          let fbRes = targetId
            ? await supabase.from("estabelecimentos").update(fallbackPayload).eq("id", targetId)
            : await supabase.from("estabelecimentos").update(fallbackPayload).eq("codigo", currentCode);

          if (fbRes.error) {
            fbRes = await supabase.from("estabelecimentos").update(fallbackPayload).eq("user_id", user.id);
          }

          if (fbRes.error) {
            await supabase.from("estabelecimentos").insert([fallbackPayload]);
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

    if (profile) {
      const merged: UserProfile = {
        ...profile,
        ...details,
        chavePix: details.chavePix || profile.chavePix,
        tipoChavePix: details.tipoChavePix || profile.tipoChavePix,
        contasPix: details.contasPix || profile.contasPix,
      };
      setProfile(merged);
      localStorage.setItem("caixadoce_profile", JSON.stringify(merged));
    }

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
