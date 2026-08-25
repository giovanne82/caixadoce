import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff, MailCheck } from "lucide-react";
import { formatarCodigoLoja } from "@/lib/caixadoce-data";

interface LoginViewProps {
  onSuccess?: () => void;
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Toggle password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Email confirmation banner state
  const [emailConfirmationSentEmail, setEmailConfirmationSentEmail] = useState<string | null>(null);

  // Reset password state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Sub-tab / Role selection in Login
  const [loginRoleMode, setLoginRoleMode] = useState<"admin" | "colaborador">("admin");

  // Colaborador login fields
  const [colabNome, setColabNome] = useState("");
  const [colabCodigoLoja, setColabCodigoLoja] = useState("");
  const [colabPin, setColabPin] = useState("");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      onSuccess?.();
    } catch (error) {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (registerPassword.length < 6) {
      toast.error("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    setEmailConfirmationSentEmail(null);
    try {
      const res = await registerWithEmail(registerName, registerEmail, registerPassword);
      if (res?.requiresConfirmation) {
        setEmailConfirmationSentEmail(registerEmail);
        toast.info(`Link de ativação enviado para ${registerEmail}`);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetModalOpen(false);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabCodigoLoja || !colabPin) {
      toast.error("Preencha o Código da Loja e o PIN de Acesso.");
      return;
    }
    if (!/^\d{4,6}$/.test(colabPin)) {
      toast.error("O PIN de Acesso deve conter entre 4 e 6 dígitos numéricos.");
      return;
    }

    setLoading(true);
    try {
      let rawName = colabNome.trim();
      let rawCode = colabCodigoLoja.trim();

      if (rawCode.includes("@")) {
        const parts = rawCode.split("@");
        rawName = parts[0];
        rawCode = parts[1];
      }

      const cleanName = (rawName || "colaborador").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const cleanCode = rawCode.toLowerCase().replace(/[^a-z0-9]/g, "");
      const syntheticEmail = `${cleanName}@${cleanCode}.caixadoce.app`;

      await loginWithEmail(syntheticEmail, colabPin);
      onSuccess?.();
    } catch (error: any) {
      if (
        error?.status === 429 ||
        error?.message?.toLowerCase().includes("too_many_requests") ||
        error?.message?.toLowerCase().includes("rate limit") ||
        error?.message?.toLowerCase().includes("exceeded")
      ) {
        toast.error("Muitas tentativas falhas. Tente novamente em alguns minutos.");
      } else {
        toast.error("Credenciais inválidas. Verifique o Código da Loja e o PIN de Acesso.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-2xl shadow-orange-500/5 bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <CaixaDoceLogo size="lg" showTagline />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {activeTab === "login" ? "Acesse sua Conta" : "Criar Nova Conta"}
          </CardTitle>
          <CardDescription>
            {activeTab === "login"
              ? "Gerencie suas finanças, vendas e equipe com facilidade"
              : "Experimente 7 dias grátis com todos os recursos liberados"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              setEmailConfirmationSentEmail(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            {/* TAB: LOGIN */}
            <TabsContent value="login" className="space-y-4">
              {/* Toggle Administrador vs Colaborador */}
              <div className="grid grid-cols-2 p-1 bg-muted rounded-lg text-xs font-semibold mb-3">
                <button
                  type="button"
                  onClick={() => setLoginRoleMode("admin")}
                  className={`py-1.5 rounded-md transition-all ${
                    loginRoleMode === "admin"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sou Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRoleMode("colaborador")}
                  className={`py-1.5 rounded-md transition-all ${
                    loginRoleMode === "colaborador"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sou Colaborador (PDV)
                </button>
              </div>

              {loginRoleMode === "admin" ? (
                <>
                  {/* Google OAuth Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2.5 h-11 border-border/80 bg-background hover:bg-accent/60 font-medium text-foreground transition-all shadow-sm"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                  >
                    <GoogleIcon />
                    <span>Continuar com Google</span>
                  </Button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      ou entre com e-mail
                    </span>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-9"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setResetModalOpen(true)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-9 pr-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          title={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full font-semibold shadow-md h-11" disabled={loading}>
                      {loading ? "Entrando..." : "Acessar CaixaDoce"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                /* FORMULÁRIO DE LOGIN DE COLABORADOR (CÓDIGO DA LOJA + PIN) */
                <form onSubmit={handleLoginColaborador} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="colab-login-code">Código da Loja</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="colab-login-code"
                        placeholder="Ex: CD-1001 ou colaborador@CD-1001"
                        className="pl-9 font-mono uppercase font-bold"
                        value={colabCodigoLoja}
                        onChange={(e) => setColabCodigoLoja(formatarCodigoLoja(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="colab-login-pin">PIN de Acesso</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="colab-login-pin"
                        type="password"
                        placeholder="4 a 6 números"
                        maxLength={6}
                        className="pl-9"
                        value={colabPin}
                        onChange={(e) => setColabPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full font-semibold shadow-md h-11 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
                    {loading ? "Entrando..." : "Acessar PDV / Colaborador"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              )}
            </TabsContent>

            {/* TAB: REGISTER */}
            <TabsContent value="register" className="space-y-4">
              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2.5 h-11 border-border/80 bg-background hover:bg-accent/60 font-medium text-foreground transition-all shadow-sm"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                <GoogleIcon />
                <span>Continuar com Google</span>
              </Button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  ou cadastre-se com e-mail
                </span>
              </div>

              {/* Informational Email Confirmation Banner */}
              {emailConfirmationSentEmail && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-foreground space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-2.5">
                    <MailCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-600 dark:text-amber-400">Verifique seu E-mail</h4>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        Enviamos um link de confirmação para <strong>{emailConfirmationSentEmail}</strong>. Por favor,
                        acesse sua caixa de entrada e clique no link para ativar seu cadastro.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Nome Completo / Estabelecimento</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Maria Silva / Confeitaria Doce Sabor"
                      className="pl-9"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">E-mail Corporativo ou Pessoal</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="contato@docesabor.com.br"
                      className="pl-9"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-pass"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-9 pr-10"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      title={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-foreground flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>
                    Inclui <strong>7 dias de teste grátis</strong> com suporte e todos os recursos sem compromisso.
                  </span>
                </div>

                <Button type="submit" className="w-full font-semibold shadow-md h-11" disabled={loading}>
                  {loading ? "Criando Conta..." : "Começar Gratuitamente"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-border/50 py-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Conexão segura criptografada com Supabase &amp; Stripe
          </div>
          <Link
            to="/landing"
            className="text-purple-600 dark:text-purple-400 font-extrabold hover:underline flex items-center gap-1 transition-colors pt-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Conheça a Apresentação &amp; Recursos do CaixaDoce
          </Link>
        </CardFooter>
      </Card>

      {/* Modal: Recuperação de Senha */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail cadastrado e enviaremos as instruções para redefinir seu acesso.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
