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
  Plus,
  Check,
  X,
} from "lucide-react";
import { ColaboradoresTab } from "./ColaboradoresTab";
import { toast } from "sonner";
import {
  formatarCpfCnpj,
  formatarCep,
  obterRegrasAgendamento,
  salvarRegrasAgendamentoStorage,
  type RegrasAgendamento,
} from "@/lib/caixadoce-data";

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

  // Regras de Agendamento
  const [regrasAgendamento, setRegrasAgendamento] = useState<RegrasAgendamento>(() =>
    obterRegrasAgendamento(activeCode)
  );
  const [novaDataBloqueadaInput, setNovaDataBloqueadaInput] = useState("");
  const [salvandoRegras, setSalvandoRegras] = useState(false);

  const handleSalvarRegrasAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoRegras(true);
    try {
      salvarRegrasAgendamentoStorage(activeCode, regrasAgendamento);
      toast.success("Regras de agendamento e expediente salvas com sucesso!");
    } finally {
      setSalvandoRegras(false);
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

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="empresa" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Perfil &amp; Estabelecimento
          </TabsTrigger>
          <TabsTrigger value="regras" className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" /> Regras de Encomenda
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-1.5">
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

        {/* TAB: REGRAS DE ENCOMENDA & AGENDA */}
        <TabsContent value="regras" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" /> Regras de Agendamento &amp; Cardápio Público
              </CardTitle>
              <CardDescription>
                Configure os limites de antecedência, expediente e bloqueio de datas para encomendas de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarRegrasAgendamento} className="space-y-6 max-w-xl">
                {/* 1. Antecedência Mínima */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-antecedencia" className="font-bold">
                    Antecedência Mínima de Encomenda (em Dias)
                  </Label>
                  <Input
                    id="reg-antecedencia"
                    type="number"
                    min={0}
                    max={30}
                    value={regrasAgendamento.antecedenciaMinimaDias}
                    onChange={(e) =>
                      setRegrasAgendamento((prev) => ({
                        ...prev,
                        antecedenciaMinimaDias: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="font-mono font-bold"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = Aceita no mesmo dia | 1 = Mínimo de 24h de antecedência | 2 = 48h de antecedência.
                  </p>
                </div>

                {/* 2. Horário de Atendimento / Expediente */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-abertura" className="font-bold">Horário de Abertura</Label>
                    <Input
                      id="reg-abertura"
                      type="time"
                      value={regrasAgendamento.horarioAbertura}
                      onChange={(e) =>
                        setRegrasAgendamento((prev) => ({
                          ...prev,
                          horarioAbertura: e.target.value,
                        }))
                      }
                      className="font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-fechamento" className="font-bold">Horário de Encerramento</Label>
                    <Input
                      id="reg-fechamento"
                      type="time"
                      value={regrasAgendamento.horarioFechamento}
                      onChange={(e) =>
                        setRegrasAgendamento((prev) => ({
                          ...prev,
                          horarioFechamento: e.target.value,
                        }))
                      }
                      className="font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 3. Dias da Semana Funcionamento */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="font-bold">Dias da Semana com Entregas/Retiradas Ativas</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {[
                      { id: 1, label: "Segunda" },
                      { id: 2, label: "Terça" },
                      { id: 3, label: "Quarta" },
                      { id: 4, label: "Quinta" },
                      { id: 5, label: "Sexta" },
                      { id: 6, label: "Sábado" },
                      { id: 0, label: "Domingo" },
                    ].map((d) => {
                      const ativo = regrasAgendamento.diasSemanaDisponiveis.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setRegrasAgendamento((prev) => {
                              const novas = ativo
                                ? prev.diasSemanaDisponiveis.filter((x) => x !== d.id)
                                : [...prev.diasSemanaDisponiveis, d.id];
                              return { ...prev, diasSemanaDisponiveis: novas };
                            });
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                            ativo
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300"
                              : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              ativo ? "bg-purple-600 border-purple-600 text-white" : "border-muted-foreground/40"
                            }`}
                          >
                            {ativo && <Check className="w-3 h-3" />}
                          </div>
                          <span>{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Datas Bloqueadas Manualmente (Agenda Cheia / Recesso) */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="font-bold">Bloqueio de Datas Específicas (Agenda Cheia ou Recesso)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={novaDataBloqueadaInput}
                      onChange={(e) => setNovaDataBloqueadaInput(e.target.value)}
                      className="font-mono text-xs font-bold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!novaDataBloqueadaInput) return;
                        if (regrasAgendamento.datasBloqueadas.includes(novaDataBloqueadaInput)) {
                          toast.warning("Esta data já está bloqueada.");
                          return;
                        }
                        setRegrasAgendamento((prev) => ({
                          ...prev,
                          datasBloqueadas: [...prev.datasBloqueadas, novaDataBloqueadaInput].sort(),
                        }));
                        setNovaDataBloqueadaInput("");
                        toast.success("Data adicionada aos bloqueios!");
                      }}
                      className="shrink-0 font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Bloquear Data
                    </Button>
                  </div>

                  {regrasAgendamento.datasBloqueadas.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {regrasAgendamento.datasBloqueadas.map((dt) => (
                        <Badge
                          key={dt}
                          variant="secondary"
                          className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5"
                        >
                          {dt}
                          <button
                            type="button"
                            onClick={() => {
                              setRegrasAgendamento((prev) => ({
                                ...prev,
                                datasBloqueadas: prev.datasBloqueadas.filter((d) => d !== dt),
                              }));
                            }}
                            className="hover:text-rose-900 dark:hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhuma data bloqueada manualmente.</p>
                  )}
                </div>

                <Button type="submit" disabled={salvandoRegras} className="font-semibold shadow-md">
                  <Save className="w-4 h-4 mr-1.5" />
                  {salvandoRegras ? "Salvando..." : "Salvar Regras de Encomenda"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: EQUIPE */}
        <TabsContent value="equipe">
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
