import { useState } from "react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

interface LoginViewProps {
  onSuccess?: () => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const { loginWithEmail, registerWithEmail, sendEmailOtpSignUp, verifyEmailOtp, resendEmailOtp, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Reset password state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // OTP Verification state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

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
      // Handled by toast in auth-context
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
    if (registerPassword !== registerConfirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const otpRes = await sendEmailOtpSignUp(registerName, registerEmail, registerPassword);
      if (otpRes.success) {
        setOtpModalOpen(true);
        toast.info(`Código de validação enviado para ${registerEmail}`);
      } else {
        await registerWithEmail(registerName, registerEmail, registerPassword);
        onSuccess?.();
      }
    } catch (error) {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await verifyEmailOtp(registerEmail, otpCode, registerName, registerPassword);
      if (res.success) {
        setOtpModalOpen(false);
        toast.success("Conta confirmada com sucesso!");
        onSuccess?.();
      } else {
        toast.error(res.error || "Código inválido.");
      }
    } finally {
      setOtpLoading(false);
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
              : "Experimente 30 dias grátis com todos os recursos liberados"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            {/* TAB: LOGIN */}
            <TabsContent value="login">
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
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full font-semibold shadow-md" disabled={loading}>
                  {loading ? "Entrando..." : "Acessar CaixaDoce"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            {/* TAB: REGISTER */}
            <TabsContent value="register">
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-pass">Senha</Label>
                    <Input
                      id="reg-pass"
                      type="password"
                      placeholder="Mín. 6 dígitos"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm">Confirmar</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-foreground flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>
                    Inclui <strong>30 dias de teste grátis</strong> com suporte e todos os recursos sem compromisso.
                  </span>
                </div>

                <Button type="submit" className="w-full font-semibold shadow-md" disabled={loading}>
                  {loading ? "Criando Conta..." : "Começar Gratuitamente"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-border/50 py-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Conexão segura criptografada com Supabase &amp; Stripe
          </div>
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

      {/* Modal: Validação OTP */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Validar E-mail</DialogTitle>
            <DialogDescription>
              Digite o código de 6 dígitos que enviamos para <strong>{registerEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center my-4">
            <InputOTP maxLength={6} value={otpCode} onChange={(val) => setOtpCode(val)}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="text-xs text-muted-foreground">
            Não recebeu?{" "}
            <button
              type="button"
              onClick={() => resendEmailOtp(registerEmail)}
              className="text-primary font-medium hover:underline"
            >
              Reenviar código
            </button>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOtpModalOpen(false)}>
              Voltar
            </Button>
            <Button onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length < 6}>
              {otpLoading ? "Verificando..." : "Confirmar e Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
