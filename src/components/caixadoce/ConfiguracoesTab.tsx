import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Building2,
  Lock,
  QrCode,
  ShieldAlert,
  Save,
  Trash2,
  CheckCircle2,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { ColaboradoresTab } from "./ColaboradoresTab";
import {
  obterConfiguracoesStripeLoja,
  salvarConfiguracoesStripeLoja,
  createStripeConnectAccount,
  type StripeConnectAccount,
} from "@/lib/stripe-connect-service";
import { toast } from "sonner";

export function ConfiguracoesTab() {
  const {
    user,
    profile,
    updateUserProfile,
    updateEstablishmentDetails,
    updatePassword,
    deleteUserAccount,
  } = useAuth();

  const activeCode = profile?.establishmentCode || "CD-1001";

  // Stripe Connect State
  const [stripeConfig, setStripeConfig] = useState<StripeConnectAccount>(() =>
    obterConfiguracoesStripeLoja(activeCode)
  );
  const [conectandoStripe, setConectandoStripe] = useState(false);

  const handleConectarStripe = async () => {
    setConectandoStripe(true);
    try {
      const res = await createStripeConnectAccount(activeCode, user?.email || "admin@caixadoce.com.br");
      const atualizada = obterConfiguracoesStripeLoja(activeCode);
      setStripeConfig(atualizada);
      toast.success(`Conta Stripe Connect vinculada com sucesso! (${res.mockAccountId}) 🎉`);
    } catch {
      toast.error("Erro ao conectar conta Stripe.");
    } finally {
      setConectandoStripe(false);
    }
  };

  const handleToggleRepassarTaxa = (checked: boolean) => {
    const atualizada = salvarConfiguracoesStripeLoja(activeCode, { repassarTaxaStripe: checked });
    setStripeConfig(atualizada);
    if (checked) {
      toast.success("Repasse de taxa ativado! Seu cliente pagará o acréscimo do cartão.");
    } else {
      toast.info("Repasse de taxa desativado. Sua loja absorverá as taxas do cartão.");
    }
  };

  // User Profile Form
  const [nomeUsuario, setNomeUsuario] = useState(user?.name || "");
  const [emailUsuario, setEmailUsuario] = useState(user?.email || "");
  const [salvandoUser, setSalvandoUser] = useState(false);

  // Establishment Form
  const [nomeEst, setNomeEst] = useState(profile?.establishmentName || "");
  const [enderecoEst, setEnderecoEst] = useState(profile?.establishmentAddress || "");
  const [responsavelEst, setResponsavelEst] = useState(profile?.responsavel || user?.name || "");
  const [telEst, setTelEst] = useState(profile?.telefone || "");
  const [chavePix, setChavePix] = useState(profile?.chavePix || "");
  const [tipoChavePix, setTipoChavePix] = useState(profile?.tipoChavePix || "email");
  const [tipoDoc, setTipoDoc] = useState(profile?.tipoDocumento || "CNPJ");
  const [numDoc, setNumDoc] = useState(profile?.numeroDocumento || "");
  const [salvandoEst, setSalvandoEst] = useState(false);

  // Security Form
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Delete Account Modal
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deletando, setDeletando] = useState(false);

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoUser(true);
    try {
      await updateUserProfile({ name: nomeUsuario });
    } finally {
      setSalvandoUser(false);
    }
  };

  const handleSalvarEstabelecimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEst(true);
    try {
      await updateEstablishmentDetails({
        nome: nomeEst,
        endereco: enderecoEst,
        responsavel: responsavelEst,
        telefone: telEst,
        chavePix,
        tipoChavePix,
        tipoDocumento: tipoDoc,
        numeroDocumento: numDoc,
      });
    } finally {
      setSalvandoEst(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSalvandoSenha(true);
    try {
      await updatePassword(novaSenha);
      setNovaSenha("");
      setConfirmaSenha("");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleExcluirConta = async () => {
    setDeletando(true);
    try {
      await deleteUserAccount();
    } finally {
      setDeletando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-foreground">Configurações &amp; Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie dados do seu perfil, informações da empresa, Pix e segurança.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="perfil" className="flex items-center gap-1.5">
            <User className="w-4 h-4" /> Perfil Pessoal
          </TabsTrigger>
          <TabsTrigger value="empresa" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Estabelecimento / Pix
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-1.5">
            <Lock className="w-4 h-4" /> Segurança
          </TabsTrigger>
        </TabsList>

        {/* TAB: PERFIL PESSOAL */}
        <TabsContent value="perfil">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Dados do Usuário</CardTitle>
              <CardDescription>Informações da sua conta de acesso ao CaixaDoce</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarUsuario} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="usr-name">Nome Completo</Label>
                  <Input
                    id="usr-name"
                    value={nomeUsuario}
                    onChange={(e) => setNomeUsuario(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="usr-email">E-mail de Login</Label>
                  <Input id="usr-email" value={emailUsuario} disabled className="bg-muted" />
                  <p className="text-[11px] text-muted-foreground">O e-mail é gerenciado pelo Supabase Auth.</p>
                </div>
                <Button type="submit" disabled={salvandoUser} className="font-semibold shadow-sm">
                  <Save className="w-4 h-4 mr-1.5" />
                  {salvandoUser ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ESTABELECIMENTO & PIX (INCLUI EQUIPE & COLABORADORES) */}
        <TabsContent value="empresa" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">
                Dados do Estabelecimento &amp; Chave Pix
              </CardTitle>
              <CardDescription>
                Configure os dados da sua confeitaria/loja para exibição em recibos e cobranças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarEstabelecimento} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-nome">Nome da Loja / Fantasia</Label>
                    <Input
                      id="est-nome"
                      value={nomeEst}
                      onChange={(e) => setNomeEst(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-resp">Responsável Principal</Label>
                    <Input
                      id="est-resp"
                      value={responsavelEst}
                      onChange={(e) => setResponsavelEst(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="est-end">Endereço Completo</Label>
                  <Input
                    id="est-end"
                    value={enderecoEst}
                    onChange={(e) => setEnderecoEst(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-tipodoc">Tipo de Documento</Label>
                    <Select value={tipoDoc} onValueChange={setTipoDoc}>
                      <SelectTrigger id="est-tipodoc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="CPF">CPF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-doc">Número do Documento</Label>
                    <Input
                      id="est-doc"
                      value={numDoc}
                      onChange={(e) => setNumDoc(e.target.value)}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-primary" /> Recebimentos via Pix
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pix-tipo">Tipo de Chave Pix</Label>
                      <Select value={tipoChavePix} onValueChange={setTipoChavePix}>
                        <SelectTrigger id="pix-tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pix-chave">Chave Pix</Label>
                      <Input
                        id="pix-chave"
                        value={chavePix}
                        onChange={(e) => setChavePix(e.target.value)}
                        placeholder="Informe sua chave Pix"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={salvandoEst} className="font-semibold shadow-sm mt-2">
                  <Save className="w-4 h-4 mr-1.5" />
                  {salvandoEst ? "Salvando..." : "Salvar Dados do Estabelecimento"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* SEÇÃO: PAGAMENTOS ONLINE (CARTÃO VIA STRIPE CONNECT) */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Pagamentos Online (Cartão via Stripe)
              </CardTitle>
              <CardDescription>
                Receba pagamentos no cartão de crédito e débito dos seus clientes direto na sua conta bancária via Stripe Connect
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Status da Conexão Stripe Connect */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-foreground">Status da Conta Stripe:</span>
                    {stripeConfig.status === "connected" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                        🟢 Stripe Connect Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                        🟡 Não Conectado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stripeConfig.status === "connected"
                      ? `Conta Stripe vinculada (${stripeConfig.accountId}). Vendas no cartão estão habilitadas no seu cardápio.`
                      : "Conecte sua conta Stripe para habilitar pagamentos no cartão de crédito/débito no seu cardápio online."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant={stripeConfig.status === "connected" ? "outline" : "default"}
                  onClick={handleConectarStripe}
                  disabled={conectandoStripe}
                  className="font-extrabold text-xs shadow-xs shrink-0"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  {conectandoStripe
                    ? "Conectando..."
                    : stripeConfig.status === "connected"
                    ? "Reconectar Conta Stripe"
                    : "Conectar Conta Stripe"}
                </Button>
              </div>

              {/* Toggle/Switch 'Repassar taxa de processamento ao cliente' */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="switch-repassar-taxa" className="text-sm font-extrabold text-foreground cursor-pointer">
                    Repassar taxa de processamento ao cliente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ao ativar, o seu cliente pagará o acréscimo da taxa do cartão, garantindo que você receba o valor integral da venda.
                  </p>
                </div>

                <Switch
                  id="switch-repassar-taxa"
                  checked={stripeConfig.repassarTaxaStripe}
                  onCheckedChange={handleToggleRepassarTaxa}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO DE EQUIPE & COLABORADORES INTEGRADA NA ABA DE ESTABELECIMENTO */}
          <div className="pt-6 border-t border-border mt-6">
            <ColaboradoresTab />
          </div>
        </TabsContent>

        {/* TAB: SEGURANÇA */}
        <TabsContent value="seguranca">
          <div className="space-y-6 max-w-xl">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha de acesso ao sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAlterarSenha} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-pass">Nova Senha</Label>
                    <Input
                      id="sec-pass"
                      type="password"
                      placeholder="Mínimo 6 dígitos"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-conf">Confirmar Nova Senha</Label>
                    <Input
                      id="sec-conf"
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={salvandoSenha} className="font-semibold shadow-sm">
                    {salvandoSenha ? "Alterando..." : "Atualizar Senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Zona de Perigo
                </CardTitle>
                <CardDescription>Ações irreversíveis na sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Ao excluir sua conta, todos os dados, lançamentos e históricos vinculados serão removidos permanentemente.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setModalDeleteOpen(true)}
                  className="font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Excluir Minha Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Exclusão de Conta */}
      <Dialog open={modalDeleteOpen} onOpenChange={setModalDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Excluir Conta Permanentemente</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados associados a este usuário serão excluídos do Supabase.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirConta} disabled={deletando}>
              {deletando ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
