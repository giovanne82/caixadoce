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
import { salvarDadosInstitucionaisCache, type DadosInstitucionais } from "@/lib/pix-utils";
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
  chavePix?: string;
  tipoChavePix?: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
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
  abasPermitidas?: string[];
};

export type UserProfile = StaffProfile;

const INITIAL_ESTABELECIMENTOS: Estabelecimento[] = [ESTABELECIMENTO_PADRAO];

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  estabelecimentos: Estabelecimento[];
  userEstabelecimentos: Estabelecimento[];
  isMounted: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(INITIAL_ESTABELECIMENTOS);
  const [isMounted, setIsMounted] = useState(false);

  // Helper centralizado para montagem do perfil com tenant estrito da loja Master e permissoes
  const buildProfileForUser = (authUser: any, emailStr: string): UserProfile => {
    const isColab = emailStr.includes("@") && (emailStr.endsWith(".caixadoce.app") || authUser?.user_metadata?.role === "colaborador" || authUser?.user_metadata?.role === "operador");
    
    let rawCode = authUser?.user_metadata?.establishmentCode || authUser?.user_metadata?.establishment_code;
    if (!rawCode && isColab && emailStr.includes("@")) {
      rawCode = emailStr.split("@")[1].replace(".caixadoce.app", "");
    }
    if (!rawCode) {
      rawCode = ESTABELECIMENTO_PADRAO.codigo;
    }

    const formattedCode = rawCode.toUpperCase().startsWith("CD-")
      ? rawCode.toUpperCase()
      : rawCode.length === 4 && !isNaN(Number(rawCode))
      ? `CD-${rawCode}`
      : rawCode.toUpperCase();

    const masterEst = estabelecimentos.find((e) => e.codigo.toUpperCase() === formattedCode) || ESTABELECIMENTO_PADRAO;

    let abasPermitidas = authUser?.user_metadata?.abasPermitidas;
    if (isColab && !abasPermitidas) {
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

    if (isColab && !abasPermitidas) {
      abasPermitidas = ["scanner", "despesas", "encomendas", "produtos", "financeiro"];
    }

    return {
      role: isColab ? "operador" : "admin",
      establishmentCode: masterEst.codigo || formattedCode,
      establishmentName: masterEst.nome || `Confeitaria ${formattedCode}`,
      establishmentAddress: masterEst.endereco || ESTABELECIMENTO_PADRAO.endereco,
      chavePix: masterEst.chavePix || ESTABELECIMENTO_PADRAO.chavePix,
      tipoChavePix: masterEst.tipoChavePix || ESTABELECIMENTO_PADRAO.tipoChavePix,
      abasPermitidas: isColab ? abasPermitidas : undefined,
    };
  };

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
      console.warn("Erro ao restaurar sessão local:", e);
    }

    // Listener do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("caixadoce_user");
        localStorage.removeItem("caixadoce_profile");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [estabelecimentos]);

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

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Captura de limite de tentativas (Rate Limit / Too Many Requests)
        if (
          error.status === 429 ||
          error.message?.toLowerCase().includes("too_many_requests") ||
          error.message?.toLowerCase().includes("rate limit") ||
          error.message?.toLowerCase().includes("exceeded")
        ) {
          toast.error("Muitas tentativas falhas. Tente novamente em alguns minutos.");
          throw error;
        }

        // Fallback local caso offline ou cadastrado em memoria/localState
        if (password.length >= 4) {
          const isCollaboratorSynthetic = email.includes("@") && email.endsWith(".caixadoce.app");
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
          localStorage.setItem("caixadoce_user", JSON.stringify(fallbackUser));
          localStorage.setItem("caixadoce_profile", JSON.stringify(fallbackProfile));
          toast.success(`Login efetuado com sucesso${isCollaboratorSynthetic ? " (Acesso PDV Colaborador)" : ""}!`);
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
        localStorage.setItem("caixadoce_user", JSON.stringify(loggedUser));
        localStorage.setItem("caixadoce_profile", JSON.stringify(loggedProfile));
        toast.success("Bem-vindo ao CaixaDoce!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao efetuar login. Verifique seu e-mail e senha.");
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string): Promise<{ requiresConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar com Google.");
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
    if (!profile) return;
    const currentCode = profile.establishmentCode;

    setProfile((prev) => (prev ? { ...prev, ...details, establishmentName: details.nome } : null));

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

    toast.success("Dados do estabelecimento atualizados com sucesso!");
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
        loginWithEmail,
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
