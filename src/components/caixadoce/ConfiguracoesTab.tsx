import { useState, useRef } from "react";
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
  MapPin,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  Crown,
  Plus,
  Check,
  X,
} from "lucide-react";
import { ColaboradoresTab } from "./ColaboradoresTab";
import { toast } from "sonner";
import {
  formatarCpfCnpj,
  formatarCep,
} from "@/lib/caixadoce-data";
import { obterPlanoEfetivoEstabelecimento } from "@/lib/planos-utils";

interface ConfiguracoesTabProps {
  onIrParaPlano?: () => void;
}

export function ConfiguracoesTab({ onIrParaPlano }: ConfiguracoesTabProps) {
  const {
    user,
    profile,
    updateUserProfile,
    updateEstablishmentDetails,
    updatePassword,
    deleteUserAccount,
  } = useAuth();

  const activeCode = profile?.establishmentCode || "CD-1001";

  // User Profile Form
  const [nomeUsuario, setNomeUsuario] = useState(user?.name || "");
  const [emailUsuario, setEmailUsuario] = useState(user?.email || "");
  const [salvandoUser, setSalvandoUser] = useState(false);

  // Establishment Form
  const [nomeEst, setNomeEst] = useState(profile?.establishmentName || "");
  const [responsavelEst, setResponsavelEst] = useState(profile?.responsavel || user?.name || "");
  const [telEst, setTelEst] = useState(profile?.telefone || "");
  const [chavePix, setChavePix] = useState(profile?.chavePix || "");
  const [tipoChavePix, setTipoChavePix] = useState(profile?.tipoChavePix || "email");
  const [tipoDoc, setTipoDoc] = useState(profile?.tipoDocumento || "CNPJ");
  const [numDoc, setNumDoc] = useState(profile?.numeroDocumento || "");
  const [salvandoEst, setSalvandoEst] = useState(false);

  // Endereço Estruturado via CEP
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEst, setCepEst] = useState(() => {
    const raw = profile?.establishmentAddress || "";
    const cepMatch = raw.match(/CEP:\s*(\d{5}-?\d{3})/i);
    return cepMatch ? cepMatch[1] : "";
  });
  const [logradouroEst, setLogradouroEst] = useState(() => {
    const raw = profile?.establishmentAddress || "";
    if (raw.includes(",")) return raw.split(",")[0].trim();
    return raw;
  });
  const [numeroEst, setNumeroEst] = useState("");
  const [complementoEst, setComplementoEst] = useState("");
  const [bairroEst, setBairroEst] = useState("");
  const [cidadeEst, setCidadeEst] = useState("São Paulo");
  const [ufEst, setUfEst] = useState("SP");

  const buscarCepViaCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado. Verifique os dígitos informados.");
        return;
      }

      setLogradouroEst(data.logradouro || "");
      setBairroEst(data.bairro || "");
      setCidadeEst(data.localidade || "");
      setUfEst(data.uf || "");
      toast.success("Endereço localizado via CEP!");

      setTimeout(() => {
        numeroInputRef.current?.focus();
      }, 100);
    } catch {
      toast.error("Falha ao consultar o CEP. Preencha os campos de endereço manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  };

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
      const enderecoFinal = cepEst
        ? `${logradouroEst}, ${numeroEst}${complementoEst ? ` - ${complementoEst}` : ""} - ${bairroEst}, ${cidadeEst}/${ufEst} - CEP: ${cepEst}`
        : logradouroEst;

      await updateEstablishmentDetails({
        nome: nomeEst,
        endereco: enderecoFinal,
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

      {/* CARD DE PERFIL DESTACADO NO TOPO */}
      <Card className="border-2 border-purple-500/30 bg-gradient-to-r from-purple-900/10 via-card to-purple-950/20 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-foreground truncate">{user?.name || "Usuário"}</h3>
                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] uppercase font-mono font-bold">
                  {profile?.role || "ADMIN"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{user?.email || "Sem e-mail"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-background/80 border border-border px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-foreground shrink-0 shadow-2xs">
            <span className="text-muted-foreground uppercase text-[10px] font-sans">Código da Loja:</span>
            <span className="text-purple-600 dark:text-purple-400 font-extrabold">{activeCode}</span>
          </div>
        </CardContent>
      </Card>

      {/* CARD / BANNER DEDICADO: MEU PLANO & ASSINATURA */}
      {(() => {
        const infoPlano = obterPlanoEfetivoEstabelecimento(activeCode);
        return (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50/80 via-pink-50/60 to-purple-50/80 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">Assinatura &amp; Meu Plano</h4>
                    <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                      {infoPlano.status === "trial"
                        ? `Teste Pro (${infoPlano.diasRestantesTrial || 14} dias restantes)`
                        : infoPlano.planoId === "basico"
                        ? "Plano Básico Gratuito"
                        : "Plano Pro Ativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {infoPlano.planoId === "basico"
                      ? "Você está usando o Plano Básico. Faça upgrade para o Plano Pro e libere o scanner por IA ilimitado."
                      : "Acesso ilimitado liberado para leitura por IA, pagamentos online e agendamento de encomendas."}
                  </p>
                </div>
              </div>
              {onIrParaPlano && (
                <Button
                  type="button"
                  onClick={onIrParaPlano}
                  className="w-full sm:w-auto font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md rounded-xl shrink-0"
                >
                  <Crown className="w-4 h-4 mr-1.5 text-amber-300" /> Gerenciar Assinatura
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-1 sm:grid-cols-2">
          <TabsTrigger value="empresa" className="flex items-center gap-1.5 font-bold">
            <Building2 className="w-4 h-4" /> Perfil &amp; Estabelecimento
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-1.5 font-bold">
            <Lock className="w-4 h-4" /> Segurança
          </TabsTrigger>
        </TabsList>

        {/* TAB: PERFIL & ESTABELECIMENTO */}
        <TabsContent value="empresa" className="space-y-6">
          {/* CARD: DADOS DO USUÁRIO */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-email">E-mail de Login</Label>
                    <Input id="usr-email" value={emailUsuario} disabled className="bg-muted font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-matricula">Matrícula / Perfil de Acesso</Label>
                    <Input
                      id="usr-matricula"
                      value={`${activeCode}-${(profile?.role || "admin").toUpperCase()}`}
                      disabled
                      className="bg-muted font-mono font-bold text-purple-600 dark:text-purple-400"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={salvandoUser} className="font-semibold shadow-sm">
                  <Save className="w-4 h-4 mr-1.5" />
                  {salvandoUser ? "Salvando..." : "Salvar Alterações do Perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* CARD: DADOS DO ESTABELECIMENTO & PIX */}
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

                {/* SEÇÃO DE ENDEREÇO ESTRUTURADO COM VIA CEP */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> Endereço do Estabelecimento
                  </h4>

                  {/* Linha 1: CEP (com Busca ViaCEP) + Logradouro */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="est-cep" className="flex items-center gap-1">
                        CEP <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="est-cep"
                          value={cepEst}
                          onChange={(e) => {
                            const formatted = formatarCep(e.target.value);
                            setCepEst(formatted);
                            const clean = e.target.value.replace(/\D/g, "");
                            if (clean.length === 8) {
                              buscarCepViaCep(clean);
                            }
                          }}
                          onBlur={() => {
                            const clean = cepEst.replace(/\D/g, "");
                            if (clean.length === 8) {
                              buscarCepViaCep(clean);
                            }
                          }}
                          placeholder="00000-000"
                          className="pr-8 font-mono"
                          required
                        />
                        {buscandoCep && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-2.5 top-2.5" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="est-logradouro">
                        Logradouro / Endereço <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="est-logradouro"
                        value={logradouroEst}
                        onChange={(e) => setLogradouroEst(e.target.value)}
                        placeholder="Rua, Avenida, Alameda..."
                        required
                      />
                    </div>
                  </div>

                  {/* Linha 2: Número + Complemento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="est-numero">
                        Número <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        ref={numeroInputRef}
                        id="est-numero"
                        value={numeroEst}
                        onChange={(e) => setNumeroEst(e.target.value)}
                        placeholder="Ex: 123 ou S/N"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="est-complemento">
                        Complemento <span className="text-xs text-muted-foreground">(Opcional)</span>
                      </Label>
                      <Input
                        id="est-complemento"
                        value={complementoEst}
                        onChange={(e) => setComplementoEst(e.target.value)}
                        placeholder="Ex: Sala 02, Bloco B, Térreo"
                      />
                    </div>
                  </div>

                  {/* Linha 3: Bairro + Cidade + Estado (UF) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="est-bairro">
                        Bairro <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="est-bairro"
                        value={bairroEst}
                        onChange={(e) => setBairroEst(e.target.value)}
                        placeholder="Bairro"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="est-cidade">
                        Cidade <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="est-cidade"
                        value={cidadeEst}
                        onChange={(e) => setCidadeEst(e.target.value)}
                        placeholder="Cidade"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="est-uf">
                        Estado (UF) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="est-uf"
                        value={ufEst}
                        onChange={(e) => setUfEst(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="SP"
                        maxLength={2}
                        className="font-mono uppercase"
                        required
                      />
                    </div>
                  </div>
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
                      onChange={(e) => {
                        const formatted = formatarCpfCnpj(e.target.value);
                        setNumDoc(formatted);
                        const digits = e.target.value.replace(/\D/g, "");
                        if (digits.length > 11) {
                          setTipoDoc("CNPJ");
                        } else if (digits.length > 0) {
                          setTipoDoc("CPF");
                        }
                      }}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
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
