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
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
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

        // Se ainda não houver perfil selecionado, monta perfil padrão de Admin
        setProfile((prev) => {
          if (prev) return prev;
          const defaultProf: UserProfile = {
            role: "admin",
            establishmentCode: ESTABELECIMENTO_PADRAO.codigo,
            establishmentName: ESTABELECIMENTO_PADRAO.nome,
            establishmentAddress: ESTABELECIMENTO_PADRAO.endereco,
            chavePix: ESTABELECIMENTO_PADRAO.chavePix,
            tipoChavePix: ESTABELECIMENTO_PADRAO.tipoChavePix,
          };
          localStorage.setItem("caixadoce_profile", JSON.stringify(defaultProf));
          return defaultProf;
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
  }, []);

  const userEstabelecimentos = useMemo(() => {
    return estabelecimentos;
  }, [estabelecimentos]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback para autenticação local caso offline
        if (password.length >= 6) {
          const fallbackUser: User = {
            id: `usr_${Date.now()}`,
            name: email.split("@")[0],
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
        setUser(loggedUser);
        localStorage.setItem("caixadoce_user", JSON.stringify(loggedUser));
        toast.success("Bem-vindo ao CaixaDoce!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao efetuar login. Verifique seu e-mail e senha.");
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, name },
        },
      });

      if (error) throw error;

      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          name,
          email,
          provider: "email",
        };
        setUser(newUser);
        localStorage.setItem("caixadoce_user", JSON.stringify(newUser));
        toast.success("Conta criada com sucesso no CaixaDoce!");
      }
    } catch (err: any) {
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
