import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  Image as ImageIcon,
  Sparkles,
  Edit2,
} from "lucide-react";
import { ColaboradoresTab } from "./ColaboradoresTab";
import { toast } from "sonner";
import {
  formatarCpfCnpj,
  formatarCep,
} from "@/lib/caixadoce-data";
import { type ContaPix } from "@/lib/pix-utils";
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

  // Gerenciamento Dinâmico de Múltiplas Contas Pix
  const [contasPix, setContasPix] = useState<ContaPix[]>([]);
  const [mostrarFormNovaContaPix, setMostrarFormNovaContaPix] = useState(false);
  const [novaContaTipo, setNovaContaTipo] = useState<"cpf" | "cnpj" | "telefone" | "email" | "aleatoria">("email");
  const [novaContaChave, setNovaContaChave] = useState("");
  const [novaContaFavorecido, setNovaContaFavorecido] = useState("");
  const [novaContaDefault, setNovaContaDefault] = useState(false);

  // Modal de Edição de Chave Pix
  const [modalEditPixOpen, setModalEditPixOpen] = useState(false);
  const [editContaId, setEditContaId] = useState("");
  const [editContaTipo, setEditContaTipo] = useState<"cpf" | "cnpj" | "telefone" | "email" | "aleatoria">("email");
  const [editContaChave, setEditContaChave] = useState("");
  const [editContaFavorecido, setEditContaFavorecido] = useState("");
  const [editContaDefault, setEditContaDefault] = useState(false);

  // Salva e persiste o array de contas Pix no banco Supabase e no state global imediatamente
  const persistirContasPix = async (novasContas: ContaPix[]) => {
    console.log("[Pix Manager] Salvando contas Pix no banco e state:", novasContas);
    setContasPix(novasContas);

    const contaPadrao = novasContas.find((c) => c.isDefault) || novasContas[0];

    try {
      await updateEstablishmentDetails({
        nome: nomeEst || profile?.establishmentName || "CaixaDoce",
        responsavel: responsavelEst,
        chavePix: contaPadrao ? contaPadrao.chave : chavePix,
        tipoChavePix: contaPadrao ? contaPadrao.tipo : tipoChavePix,
        contasPix: novasContas,
        logoUrl,
        store_logo_url: logoUrl,
        tituloCardapio,
        menu_title: tituloCardapio,
        sloganCardapio,
        menu_slogan: sloganCardapio,
      });
    } catch (err) {
      console.error("[Pix Manager] Erro ao persistir contas Pix:", err);
    }
  };

  const handleAdicionarContaPix = async () => {
    if (!novaContaChave.trim()) {
      toast.error("Informe a Chave Pix.");
      return;
    }
    if (!novaContaFavorecido.trim()) {
      toast.error("Informe o Nome do Favorecido (obrigatório).");
      return;
    }

    const ehPrimeiraOuPadrao = contasPix.length === 0 || novaContaDefault;

    const nova: ContaPix = {
      id: `pix_${Date.now()}`,
      tipo: novaContaTipo,
      chave: novaContaChave.trim(),
      favorecido: novaContaFavorecido.trim(),
      isDefault: ehPrimeiraOuPadrao,
    };

    let listaAtualizada = [...contasPix];
    if (ehPrimeiraOuPadrao) {
      listaAtualizada = listaAtualizada.map((c) => ({ ...c, isDefault: false }));
    }
    listaAtualizada.push(nova);

    await persistirContasPix(listaAtualizada);
    setNovaContaChave("");
    setNovaContaFavorecido("");
    setNovaContaDefault(false);
    setMostrarFormNovaContaPix(false);
    toast.success("Nova Chave Pix adicionada e salva com sucesso!");
  };

  const handleAbrirEdicaoContaPix = (conta: ContaPix) => {
    setEditContaId(conta.id);
    setEditContaTipo(conta.tipo);
    setEditContaChave(conta.chave);
    setEditContaFavorecido(conta.favorecido);
    setEditContaDefault(conta.isDefault);
    setModalEditPixOpen(true);
  };

  const handleSalvarEdicaoContaPix = async () => {
    if (!editContaChave.trim()) {
      toast.error("Informe a Chave Pix.");
      return;
    }
    if (!editContaFavorecido.trim()) {
      toast.error("Informe o Nome do Favorecido (obrigatório).");
      return;
    }

    let listaAtualizada = contasPix.map((c) => {
      if (c.id === editContaId) {
        return {
          ...c,
          tipo: editContaTipo,
          chave: editContaChave.trim(),
          favorecido: editContaFavorecido.trim(),
          isDefault: editContaDefault,
        };
      }
      return editContaDefault ? { ...c, isDefault: false } : c;
    });

    await persistirContasPix(listaAtualizada);
    setModalEditPixOpen(false);
    toast.success("Chave Pix atualizada com sucesso!");
  };

  const handleRemoverContaPix = async (id: string) => {
    const filtradas = contasPix.filter((c) => c.id !== id);
    if (filtradas.length > 0 && !filtradas.some((c) => c.isDefault)) {
      filtradas[0].isDefault = true;
    }
    await persistirContasPix(filtradas);
    toast.success("Conta Pix removida.");
  };

  const handleSetDefaultContaPix = async (id: string) => {
    const atualizadas = contasPix.map((c) => ({
      ...c,
      isDefault: c.id === id,
    }));
    await persistirContasPix(atualizadas);
    toast.success("Conta Pix padrão atualizada!");
  };

  // Personalização do Cardápio Público
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || profile?.store_logo_url || "");
  const [tituloCardapio, setTituloCardapio] = useState(profile?.tituloCardapio || profile?.menu_title || "");
  const [sloganCardapio, setSloganCardapio] = useState(profile?.sloganCardapio || profile?.menu_slogan || "");
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEnviandoLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `logos/${activeCode}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, { upsert: true });

      let finalUrl = "";
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from("public").getPublicUrl(filePath);
        finalUrl = publicUrlData.publicUrl;
      } else {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setLogoUrl(finalUrl);
      toast.success("Logo selecionada com sucesso! Clique em 'Salvar Dados do Estabelecimento' para confirmar.");
    } catch {
      toast.error("Erro ao carregar imagem da logo.");
    } finally {
      setEnviandoLogo(false);
    }
  };

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

  useEffect(() => {
    if (profile) {
      if (profile.establishmentName) setNomeEst(profile.establishmentName);
      if (profile.responsavel) setResponsavelEst(profile.responsavel);
      if (profile.telefone) setTelEst(profile.telefone);
      if (profile.chavePix) setChavePix(profile.chavePix);
      if (profile.tipoChavePix) setTipoChavePix(profile.tipoChavePix);
      if (profile.contasPix && profile.contasPix.length > 0) {
        setContasPix(profile.contasPix);
      } else if (profile.chavePix) {
        setContasPix([
          {
            id: "default_pix",
            tipo: (profile.tipoChavePix as any) || "email",
            chave: profile.chavePix,
            favorecido: profile.establishmentName || profile.responsavel || "ArtFesta",
            isDefault: true,
          },
        ]);
      }
      if (profile.tipoDocumento) setTipoDoc(profile.tipoDocumento);
      if (profile.numeroDocumento) setNumDoc(profile.numeroDocumento);
      if (profile.cep) setCepEst(profile.cep);
      if (profile.logradouro) setLogradouroEst(profile.logradouro);
      if (profile.numero) setNumeroEst(profile.numero);
      if (profile.complemento) setComplementoEst(profile.complemento);
      if (profile.bairro) setBairroEst(profile.bairro);
      if (profile.cidade) setCidadeEst(profile.cidade);
      if (profile.estado) setUfEst(profile.estado);
      if (profile.logoUrl || profile.store_logo_url) setLogoUrl(profile.logoUrl || profile.store_logo_url || "");
      if (profile.tituloCardapio || profile.menu_title) setTituloCardapio(profile.tituloCardapio || profile.menu_title || "");
      if (profile.sloganCardapio || profile.menu_slogan) setSloganCardapio(profile.sloganCardapio || profile.menu_slogan || "");
    }
  }, [profile]);

  const handleSalvarEstabelecimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEst(true);
    try {
      const enderecoFinal = cepEst
        ? `${logradouroEst}, ${numeroEst}${complementoEst ? ` - ${complementoEst}` : ""} - ${bairroEst}, ${cidadeEst}/${ufEst} - CEP: ${cepEst}`
        : logradouroEst;

      const contaPadrao = contasPix.find((c) => c.isDefault) || contasPix[0];

      await updateEstablishmentDetails({
        nome: nomeEst,
        endereco: enderecoFinal,
        logradouro: logradouroEst,
        numero: numeroEst,
        complemento: complementoEst,
        bairro: bairroEst,
        cidade: cidadeEst,
        estado: ufEst,
        cep: cepEst,
        tipoDocumento: tipoDoc,
        numeroDocumento: numDoc,
        cnpj: numDoc,
        responsavel: responsavelEst,
        telefone: telEst,
        chavePix: contaPadrao ? contaPadrao.chave : chavePix,
        tipoChavePix: contaPadrao ? contaPadrao.tipo : tipoChavePix,
        contasPix,
        logoUrl,
        store_logo_url: logoUrl,
        tituloCardapio,
        menu_title: tituloCardapio,
        sloganCardapio,
        menu_slogan: sloganCardapio,
      });
      toast.success("Dados do estabelecimento e personalização salvos com sucesso!");
    } catch (err: any) {
      console.error("[Configurações] Erro ao salvar estabelecimento:", err);
      toast.error(err?.message || "Erro ao salvar os dados do estabelecimento. Verifique sua conexão ou rode a migration no Supabase.");
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

                {/* SEÇÃO: GERENCIAMENTO DE MÚLTIPLAS CONTAS PIX */}
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" /> Gerenciador de Chaves Pix
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {contasPix.length} chave(s)
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Cadastre suas chaves Pix e informe o Nome do Favorecido para facilitar o recebimento das encomendas.
                  </p>

                  {/* LISTA DE CHAVES PIX */}
                  {contasPix.length > 0 ? (
                    <div className="space-y-2">
                      {contasPix.map((conta) => (
                        <div
                          key={conta.id}
                          className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-foreground">
                                👤 {conta.favorecido}
                              </span>
                              {conta.isDefault ? (
                                <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2">
                                  Principal / Padrão
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetDefaultContaPix(conta.id)}
                                  className="h-5 text-[10px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 p-1 font-semibold"
                                >
                                  Tornar Principal
                                </Button>
                              )}
                            </div>
                            <p className="text-xs font-mono font-bold text-muted-foreground">
                              🔑 {conta.chave} <span className="uppercase text-[10px] text-muted-foreground">({conta.tipo})</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirEdicaoContaPix(conta)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full"
                              title="Editar chave Pix"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverContaPix(conta.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full"
                              title="Remover chave Pix"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border">
                      Nenhuma chave Pix cadastrada ainda. Clique abaixo para adicionar sua primeira chave.
                    </div>
                  )}

                  {/* FORMULÁRIO INLINE PARA ADICIONAR NOVA CHAVE */}
                  {!mostrarFormNovaContaPix ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFormNovaContaPix(true)}
                      className="w-full text-xs font-bold border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 h-9"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> + Adicionar Chave Pix
                    </Button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Nova Chave Pix
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarFormNovaContaPix(false)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Tipo de Chave
                          </Label>
                          <Select
                            value={novaContaTipo}
                            onValueChange={(val: any) => setNovaContaTipo(val)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
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

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Chave Pix *
                          </Label>
                          <Input
                            placeholder="Informe a chave Pix"
                            value={novaContaChave}
                            onChange={(e) => setNovaContaChave(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Nome do Favorecido *
                          </Label>
                          <Input
                            placeholder="Ex: ArtFesta Confeitaria"
                            value={novaContaFavorecido}
                            onChange={(e) => setNovaContaFavorecido(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={novaContaDefault}
                            onChange={(e) => setNovaContaDefault(e.target.checked)}
                            className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                          />
                          Definir como Chave Principal / Padrão
                        </label>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMostrarFormNovaContaPix(false)}
                            className="text-xs h-7 text-muted-foreground"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAdicionarContaPix}
                            className="text-xs h-7 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Salvar Chave Pix
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SEÇÃO DE PERSONALIZAÇÃO DO CARDÁPIO DIGITAL (LOGO, TÍTULO, SLOGAN) */}
                <div className="pt-3 border-t space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-bold text-foreground">
                      Personalização do Cardápio Digital Público
                    </h4>
                  </div>

                  {/* 1. Upload de Logo do Estabelecimento */}
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" /> Logo do Estabelecimento
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Esta imagem será exibida no cabeçalho do seu cardápio público. Se deixada em branco, será utilizada a logomarca padrão do CaixaDoce.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      <div className="w-20 h-20 rounded-2xl bg-background border-2 border-dashed border-purple-300 dark:border-purple-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo da loja" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-1">
                            <CaixaDoceLogo size="sm" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-center sm:text-left">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLogoFile}
                          className="hidden"
                        />
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={enviandoLogo}
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            {enviandoLogo ? "Enviando..." : "Enviar Logo Personalizada"}
                          </Button>
                          {logoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLogoUrl("")}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover Logo
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Formatos suportados: PNG, JPG, WEBP, SVG</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Título e Slogan do Cardápio */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="menu-title" className="text-xs font-bold">
                        Título do Cardápio (Público)
                      </Label>
                      <Input
                        id="menu-title"
                        value={tituloCardapio}
                        onChange={(e) => setTituloCardapio(e.target.value)}
                        placeholder="Cardápio de Bolos & Doces Especiais"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Exibido no cabeçalho do seu cardápio público. Padrão: <em>'Cardápio de Bolos & Doces Especiais'</em>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="menu-slogan" className="text-xs font-bold">
                        Slogan / Descrição do Cardápio
                      </Label>
                      <Textarea
                        id="menu-slogan"
                        rows={2}
                        value={sloganCardapio}
                        onChange={(e) => setSloganCardapio(e.target.value)}
                        placeholder="Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe."
                        className="text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Exibido como mensagem de apresentação. Padrão: <em>'Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.'</em>
                      </p>
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

      {/* Modal: Edição de Chave Pix */}
      <Dialog open={modalEditPixOpen} onOpenChange={setModalEditPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" /> Editar Chave Pix
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atualize o tipo, a chave Pix ou o Nome do Favorecido desta conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo de Chave</Label>
              <Select value={editContaTipo} onValueChange={(val: any) => setEditContaTipo(val)}>
                <SelectTrigger className="h-9 text-xs">
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Chave Pix *</Label>
              <Input
                value={editContaChave}
                onChange={(e) => setEditContaChave(e.target.value)}
                placeholder="Informe sua chave Pix"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Nome do Favorecido *</Label>
              <Input
                value={editContaFavorecido}
                onChange={(e) => setEditContaFavorecido(e.target.value)}
                placeholder="Ex: ArtFesta Confeitaria ou Nome Completo do Titular"
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Informe o nome completo do titular da conta bancária como aparece no banco.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium">
                <input
                  type="checkbox"
                  checked={editContaDefault}
                  onChange={(e) => setEditContaDefault(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                Definir como Chave Principal / Padrão
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalEditPixOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarEdicaoContaPix}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
