import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Users,
  Mail,
  Send,
  Share2,
  Instagram,
  Facebook,
  MessageCircle,
  Music,
  Truck,
} from "lucide-react";
import { ColaboradoresTab } from "./ColaboradoresTab";
import {
  formatarMoeda,
  PALETAS_CORES_TEMA,
  type PaletaCorTema,
} from "@/lib/cardapio-helpers";
import { FreteConfigView } from "./FreteConfigView";
import { toast } from "sonner";
import {
  formatarCpfCnpj,
  formatarCep,
} from "@/lib/caixadoce-data";
import { type ContaPix } from "@/lib/pix-utils";
import { obterPlanoEfetivoEstabelecimento } from "@/lib/planos-utils";

import {
  obterStatusConexaoMercadoPago,
  trocarCodigoOAuthMercadoPago,
  desconectarMercadoPago,
} from "@/lib/mercadopago-service";

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

  const activeCode = profile?.establishmentCode || "";

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

  const queryClient = useQueryClient();

  // Modo de Recebimento Pix & Mercado Pago
  const [usarMercadopago, setUsarMercadopago] = useState<boolean>(Boolean(profile?.usar_mercadopago));
  const [chavePixManual, setChavePixManual] = useState<string>(profile?.chave_pix_manual || profile?.chavePix || "");
  const [salvandoPixPref, setSalvandoPixPref] = useState(false);

  // Estado do Mercado Pago Connect (OAuth) com hidratação imediata do cache local
  const [mpConectado, setMpConectado] = useState<boolean>(() => {
    if (typeof window !== "undefined" && activeCode) {
      return localStorage.getItem(`caixadoce_mp_connected_${activeCode.toUpperCase()}`) === "true";
    }
    return false;
  });
  const [mpUserId, setMpUserId] = useState<string | null>(() => {
    if (typeof window !== "undefined" && activeCode) {
      return localStorage.getItem(`caixadoce_mp_userid_${activeCode.toUpperCase()}`) || null;
    }
    return null;
  });
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [carregandoMp, setCarregandoMp] = useState(true);
  const [processandoOAuthMp, setProcessandoOAuthMp] = useState(false);
  const [desconectandoMp, setDesconectandoMp] = useState(false);

  // 1. Sincronização estrita com o Banco no Mount / Troca de Aba
  const checarMpStatus = useCallback(async () => {
    if (!activeCode) return;
    const targetCode = activeCode.toUpperCase().trim();
    setCarregandoMp(true);
    try {
      // 1.1 Consulta direta ao Supabase via ilike (case-insensitive)
      const { data, error } = await supabase
        .from("estabelecimentos")
        .select("mp_access_token, mp_user_id, mp_public_key")
        .ilike("codigo", targetCode)
        .maybeSingle();

      if (error) {
        console.warn("[MercadoPago Sync Supabase Warn]", error);
      }

      const tokenEncontrado = Boolean((data as any)?.mp_access_token);
      const userIdEncontrado = (data as any)?.mp_user_id || null;
      const publicKeyEncontrada = (data as any)?.mp_public_key || null;

      if (tokenEncontrado) {
        setMpConectado(true);
        setMpUserId(userIdEncontrado);
        setMpPublicKey(publicKeyEncontrada);
        if (typeof window !== "undefined") {
          localStorage.setItem(`caixadoce_mp_connected_${targetCode}`, "true");
          if (userIdEncontrado) localStorage.setItem(`caixadoce_mp_userid_${targetCode}`, String(userIdEncontrado));
        }
      } else {
        // 1.2 Fallback de checagem via Backend API com Service Role
        const resStatus = await obterStatusConexaoMercadoPago(targetCode);
        if (resStatus?.connected) {
          setMpConectado(true);
          setMpUserId(resStatus.mp_user_id || null);
          setMpPublicKey(resStatus.mp_public_key || null);
          if (typeof window !== "undefined") {
            localStorage.setItem(`caixadoce_mp_connected_${targetCode}`, "true");
            if (resStatus.mp_user_id) localStorage.setItem(`caixadoce_mp_userid_${targetCode}`, String(resStatus.mp_user_id));
          }
        } else {
          setMpConectado(false);
          setMpUserId(null);
          setMpPublicKey(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(`caixadoce_mp_connected_${targetCode}`);
            localStorage.removeItem(`caixadoce_mp_userid_${targetCode}`);
          }
        }
      }
    } catch (e) {
      console.warn("[MercadoPago Sync Exception]", e);
      try {
        const resStatus = await obterStatusConexaoMercadoPago(targetCode);
        if (resStatus?.connected) {
          setMpConectado(true);
          setMpUserId(resStatus.mp_user_id || null);
          setMpPublicKey(resStatus.mp_public_key || null);
        }
      } catch {}
    } finally {
      setCarregandoMp(false);
    }
  }, [activeCode]);

  useEffect(() => {
    checarMpStatus();
  }, [checarMpStatus]);

  const obterRedirectUriMercadoPago = () => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const path = window.location.pathname;
    const targetPath = path.startsWith("/painel")
      ? "/painel/configuracoes"
      : (path.endsWith("/configuracoes") ? path : "/configuracoes");
    return `${origin}${targetPath}`;
  };

  // 2. Capturar callback OAuth da URL (?code=...&state=...) e invalidar cache
  useEffect(() => {
    if (typeof window === "undefined" || !activeCode) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      setProcessandoOAuthMp(true);
      const redirectUri = obterRedirectUriMercadoPago();

      // Limpar os query params da URL mantendo o caminho limpo
      window.history.replaceState({}, "", window.location.pathname);

      trocarCodigoOAuthMercadoPago(code, activeCode, redirectUri)
        .then((res) => {
          if (res.success) {
            const targetCode = activeCode.toUpperCase().trim();
            setMpConectado(true);
            setMpUserId(res.mp_user_id ? String(res.mp_user_id) : null);
            setMpPublicKey(res.mp_public_key || null);
            if (typeof window !== "undefined") {
              localStorage.setItem(`caixadoce_mp_connected_${targetCode}`, "true");
              if (res.mp_user_id) localStorage.setItem(`caixadoce_mp_userid_${targetCode}`, String(res.mp_user_id));
            }
            // Invalidação profunda do cache para atualizar todos os componentes
            queryClient.invalidateQueries();
            checarMpStatus();
            toast.success("Conta do Mercado Pago conectada com sucesso!");
          }
        })
        .catch((err: any) => {
          console.error("[MercadoPago OAuth Error]", err);
          toast.error(`Falha ao conectar Mercado Pago: ${err.message || "Autorização cancelada"}`);
        })
        .finally(() => {
          setProcessandoOAuthMp(false);
        });
    }
  }, [activeCode, checarMpStatus, queryClient]);

  const handleConectarMercadoPago = () => {
    const rawClientId =
      (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MP_CLIENT_ID || import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || import.meta.env.VITE_MERCADO_PAGO_CLIENT_ID)) ||
      (typeof process !== "undefined" && process.env && (process.env.VITE_MP_CLIENT_ID || process.env.VITE_MERCADOPAGO_CLIENT_ID)) ||
      "3682622436709302";

    const clientId = rawClientId ? String(rawClientId).trim() : undefined;

    // Validação de Segurança: se client_id for undefined, aborta a requisição e exibe um erro claro no console
    if (!clientId || clientId === "undefined" || clientId === "null") {
      console.error("[MercadoPago OAuth Erro de Segurança] 'VITE_MP_CLIENT_ID' está undefined ou não foi encontrado nas variáveis de ambiente!");
      toast.error("Erro de Configuração: VITE_MP_CLIENT_ID não foi encontrado nas variáveis de ambiente.");
      return;
    }

    const redirectUri = encodeURIComponent(obterRedirectUriMercadoPago());
    const oauthUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${encodeURIComponent(activeCode)}&redirect_uri=${redirectUri}`;
    
    toast.info("Redirecionando para autorização do Mercado Pago...");
    window.location.href = oauthUrl;
  };

  const handleDesconectarMercadoPago = async () => {
    if (!activeCode) return;
    setDesconectandoMp(true);
    try {
      await desconectarMercadoPago(activeCode);
      const targetCode = activeCode.toUpperCase().trim();
      setMpConectado(false);
      setMpUserId(null);
      setMpPublicKey(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`caixadoce_mp_connected_${targetCode}`);
        localStorage.removeItem(`caixadoce_mp_userid_${targetCode}`);
      }
      queryClient.invalidateQueries();
      toast.success("Conta do Mercado Pago desconectada.");
    } catch (e: any) {
      toast.error(`Erro ao desconectar: ${e.message || "Falha no servidor"}`);
    } finally {
      setDesconectandoMp(false);
    }
  };

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
        nome: nomeEst,
        responsavel: responsavelEst,
        chavePix: contaPadrao ? contaPadrao.chave : chavePix,
        tipoChavePix: contaPadrao ? contaPadrao.tipo : tipoChavePix,
        contasPix: novasContas,
        logoUrl,
        store_logo_url: logoUrl,
        bannerUrl,
        banner_url: bannerUrl,
        store_banner_url: bannerUrl,
        themeColor,
        theme_color: themeColor,
        cor_destaque: themeColor,
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

  // Form de Contato (Suporte & Sugestões)
  const [motivoContato, setMotivoContato] = useState<"Sugestão" | "Suporte">("Sugestão");
  const [mensagemContato, setMensagemContato] = useState("");
  const [enviandoContato, setEnviandoContato] = useState(false);

  const handleEnviarContato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagemContato.trim()) {
      toast.error("Por favor, digite sua mensagem antes de enviar.");
      return;
    }

    setEnviandoContato(true);
    try {
      const payload = {
        motivo: motivoContato,
        mensagem: mensagemContato.trim(),
        userEmail: emailUsuario || user?.email || "",
        userName: nomeUsuario || user?.name || user?.user_metadata?.full_name || "",
        establishmentName: nomeEst || profile?.establishmentName || activeCode,
        establishmentCode: activeCode,
      };

      // 1. Invocação direta da Edge Function 'send-contact-email' no Supabase
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: payload,
      });

      if (!error && (data?.success || data?.enviado)) {
        setMensagemContato("");
        toast.success("Mensagem enviada com sucesso! Retornaremos em breve.");
        return;
      }

      // 2. Fallback gracioso para a API /api/contact do backend
      console.warn("[Edge Function Fallback] Invocando rota /api/contact:", error?.message);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (res.ok && (resData.success || resData.enviado || resData.fallbackSaved)) {
        setMensagemContato("");
        toast.success("Mensagem enviada com sucesso! Retornaremos em breve.");
      } else {
        toast.error(resData.mensagem || resData.error || error?.message || "Erro ao enviar mensagem.");
      }
    } catch (err: any) {
      console.error("[Enviar Contato Erro]", err);
      toast.error("Falha ao comunicar com o servidor de suporte.");
    } finally {
      setEnviandoContato(false);
    }
  };

  // Personalização do Cardápio Público
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || profile?.store_logo_url || "");
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl || profile?.banner_url || profile?.store_banner_url || "");
  const [themeColor, setThemeColor] = useState(profile?.themeColor || profile?.theme_color || profile?.corTema || "#8E7CC3");
  const [tituloCardapio, setTituloCardapio] = useState(profile?.tituloCardapio || profile?.menu_title || "");
  const [sloganCardapio, setSloganCardapio] = useState(profile?.sloganCardapio || profile?.menu_slogan || "");
  const [instagramEst, setInstagramEst] = useState(profile?.instagram || profile?.social_instagram || profile?.social_media?.instagram || "");
  const [tiktokEst, setTiktokEst] = useState(profile?.tiktok || profile?.social_tiktok || profile?.social_media?.tiktok || "");
  const [facebookEst, setFacebookEst] = useState(profile?.facebook || profile?.social_facebook || profile?.social_media?.facebook || "");
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputBannerRef = useRef<HTMLInputElement>(null);

  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BANNER_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_BANNER_SIZE_BYTES) {
      toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
      if (e.target) e.target.value = "";
      return;
    }

    setEnviandoBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `banners/${activeCode}_${Date.now()}.${fileExt}`;

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

      setBannerUrl(finalUrl);
      toast.success("Banner selecionado com sucesso! Clique em 'Salvar Dados do Estabelecimento' para confirmar.");
    } catch {
      toast.error("Erro ao carregar imagem do banner.");
    } finally {
      setEnviandoBanner(false);
    }
  };

  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_PRODUTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_PRODUTO_SIZE_BYTES) {
      toast.error("A imagem é muito pesada. Para que seu cardápio carregue rápido para os clientes, envie fotos de no máximo 2 MB.");
      if (e.target) e.target.value = "";
      return;
    }

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
  const [cidadeEst, setCidadeEst] = useState(() => profile?.cidade || "");
  const [ufEst, setUfEst] = useState(() => profile?.estado || "");

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

  // Hidratação Completa do Formulário no Carregamento (do Profile e do Supabase)
  useEffect(() => {
    if (!activeCode) return;

    const isUuid = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    const filterStr = isUuid ? `user_id.eq.${user.id},codigo.eq.${activeCode}` : `codigo.eq.${activeCode}`;

    // 1. Aplica dados de profile imediatamente se disponíveis
    if (profile) {
      if (profile.establishmentName) setNomeEst(profile.establishmentName);
      if (profile.responsavel) setResponsavelEst(profile.responsavel);
      if (profile.telefone) setTelEst(profile.telefone);
      if (profile.chavePix) setChavePix(profile.chavePix);
      if (profile.tipoChavePix) setTipoChavePix(profile.tipoChavePix);
      if (profile.contasPix && profile.contasPix.length > 0) setContasPix(profile.contasPix);
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
      if (profile.bannerUrl || profile.banner_url || profile.store_banner_url) setBannerUrl(profile.bannerUrl || profile.banner_url || profile.store_banner_url || "");
      if (profile.themeColor || profile.theme_color || profile.corTema || profile.cor_destaque) setThemeColor(profile.themeColor || profile.theme_color || profile.corTema || profile.cor_destaque || "#8E7CC3");
      if (profile.tituloCardapio || profile.menu_title) setTituloCardapio(profile.tituloCardapio || profile.menu_title || "");
      if (profile.sloganCardapio || profile.menu_slogan) setSloganCardapio(profile.sloganCardapio || profile.menu_slogan || "");
      if (profile.instagram || profile.social_instagram || profile.social_media?.instagram) setInstagramEst(profile.instagram || profile.social_instagram || profile.social_media?.instagram || "");
      if (profile.tiktok || profile.social_tiktok || profile.social_media?.tiktok) setTiktokEst(profile.tiktok || profile.social_tiktok || profile.social_media?.tiktok || "");
      if (profile.facebook || profile.social_facebook || profile.social_media?.facebook) setFacebookEst(profile.facebook || profile.social_facebook || profile.social_media?.facebook || "");
      if (profile.usar_mercadopago !== undefined) setUsarMercadopago(Boolean(profile.usar_mercadopago));
      if (profile.chave_pix_manual) setChavePixManual(profile.chave_pix_manual);
    }

    // 2. Busca os dados mais recentes diretamente da tabela 'estabelecimentos' do Supabase para garantir amnésia zero no F5
    supabase
      .from("estabelecimentos")
      .select("*")
      .or(filterStr)
      .maybeSingle()
      .then((res) => {
        if (res.data) {
          const d = res.data;
          if (d.usar_mercadopago !== undefined && d.usar_mercadopago !== null) setUsarMercadopago(Boolean(d.usar_mercadopago));
          if (d.chave_pix_manual !== undefined && d.chave_pix_manual !== null) setChavePixManual(d.chave_pix_manual);
          if (d.nome) setNomeEst(d.nome);
          if (d.responsavel) setResponsavelEst(d.responsavel);
          if (d.telefone) setTelEst(d.telefone);
          if (d.tipo_documento) setTipoDoc(d.tipo_documento);
          if (d.numero_documento || d.cnpj) setNumDoc(d.numero_documento || d.cnpj);
          if (d.cep !== null && d.cep !== undefined) setCepEst(d.cep);
          if (d.logradouro !== null && d.logradouro !== undefined) setLogradouroEst(d.logradouro);
          if (d.numero !== null && d.numero !== undefined) setNumeroEst(d.numero);
          if (d.complemento !== null && d.complemento !== undefined) setComplementoEst(d.complemento);
          if (d.bairro !== null && d.bairro !== undefined) setBairroEst(d.bairro);
          if (d.cidade !== null && d.cidade !== undefined) setCidadeEst(d.cidade);
          if (d.estado !== null && d.estado !== undefined) setUfEst(d.estado);
          if (d.tipo_chave_pix) setTipoChavePix(d.tipo_chave_pix);
          if (d.chave_pix && d.chave_pix !== "contato@caixadoce.com.br") setChavePix(d.chave_pix);
          else if (d.chave_pix === "contato@caixadoce.com.br") setChavePix("");

          if (d.logo_url || d.store_logo_url) setLogoUrl(d.logo_url || d.store_logo_url);
          if (d.banner_url || d.store_banner_url) setBannerUrl(d.banner_url || d.store_banner_url);
          if (d.theme_color || d.cor_destaque) setThemeColor(d.theme_color || d.cor_destaque);
          if (d.titulo_cardapio || d.menu_title) setTituloCardapio(d.titulo_cardapio || d.menu_title);
          if (d.slogan_cardapio || d.menu_slogan) setSloganCardapio(d.slogan_cardapio || d.menu_slogan);

          const insta = d.instagram || d.social_instagram || d.social_media?.instagram;
          if (insta) setInstagramEst(insta);
          const tk = d.tiktok || d.social_tiktok || d.social_media?.tiktok;
          if (tk) setTiktokEst(tk);
          const fb = d.facebook || d.social_facebook || d.social_media?.facebook;
          if (fb) setFacebookEst(fb);

          const rawPixList = Array.isArray(d.pix_accounts) && d.pix_accounts.length > 0
            ? d.pix_accounts
            : (Array.isArray(d.pix_keys) && d.pix_keys.length > 0 ? d.pix_keys : []);

          const pixListClean = rawPixList.filter((c: any) => c?.chave && c.chave !== "contato@caixadoce.com.br");

          if (pixListClean.length > 0) {
            setContasPix(pixListClean);
          } else if (d.chave_pix && d.chave_pix !== "contato@caixadoce.com.br") {
            setContasPix([
              {
                id: "default_pix",
                tipo: d.tipo_chave_pix || "email",
                chave: d.chave_pix,
                favorecido: d.nome || d.responsavel || "",
                isDefault: true,
              },
            ]);
          } else {
            setContasPix([]);
            setChavePix("");
          }
        }
      });
  }, [activeCode, user?.id]);

  const handleSalvarEstabelecimento = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDAÇÃO ESTRITA: Impede submissão com campos genéricos, nulos ou placeholders
    const nomeLimpo = nomeEst.trim();
    if (!nomeLimpo || nomeLimpo.length < 3 || ["MINHA LOJA", "ESTABELECIMENTO", "NOME DA LOJA"].includes(nomeLimpo.toUpperCase())) {
      toast.error("Por favor, informe um Nome Fantasia / Loja válido (mínimo 3 caracteres).");
      return;
    }

    const docDigits = (numDoc || "").replace(/\D/g, "");
    if (!docDigits || (docDigits.length !== 11 && docDigits.length !== 14) || /^0+$/.test(docDigits)) {
      toast.error("Por favor, informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para o estabelecimento.");
      return;
    }

    const cepDigits = (cepEst || "").replace(/\D/g, "");
    if (!cepDigits || cepDigits.length !== 8) {
      toast.error("Por favor, informe um CEP válido com 8 dígitos.");
      return;
    }

    const logradouroLimpo = (logradouroEst || "").trim();
    if (!logradouroLimpo || logradouroLimpo.length < 3 || ["RUA", "ENDEREÇO", "LOGRADOURO"].includes(logradouroLimpo.toUpperCase())) {
      toast.error("Por favor, informe um Logradouro / Endereço válido.");
      return;
    }

    const numeroLimpo = (numeroEst || "").trim();
    if (!numeroLimpo) {
      toast.error("Por favor, informe o Número do estabelecimento (ou S/N).");
      return;
    }

    const bairroLimpo = (bairroEst || "").trim();
    if (!bairroLimpo || ["BAIRRO", "SEU BAIRRO", "BAIRRO...", "N/A"].includes(bairroLimpo.toUpperCase())) {
      toast.error("Por favor, informe um Bairro válido. Placeholders genéricos não são permitidos.");
      return;
    }

    const cidadeLimpa = (cidadeEst || "").trim();
    if (!cidadeLimpa || ["CIDADE", "SUA CIDADE", "N/A"].includes(cidadeLimpa.toUpperCase())) {
      toast.error("Por favor, informe o nome da Cidade.");
      return;
    }

    const ufsValidas = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    const ufLimpa = (ufEst || "").trim().toUpperCase();
    if (!ufLimpa || !ufsValidas.includes(ufLimpa)) {
      toast.error("Por favor, informe a sigla do Estado (UF) válida (ex: SP, RJ, MG, BA...).");
      return;
    }

    const contasPixValidas = contasPix.filter((c) => c.chave && c.chave.trim() !== "" && c.chave.trim() !== "contato@caixadoce.com.br");
    const contaPadrao = contasPixValidas.find((c) => c.isDefault) || contasPixValidas[0];
    const chavePixFinal = contaPadrao ? contaPadrao.chave : (chavePix && chavePix !== "contato@caixadoce.com.br" ? chavePix : "");

    if (!chavePixFinal || chavePixFinal.trim() === "" || chavePixFinal === "contato@caixadoce.com.br") {
      toast.error("Por favor, cadastre ao menos uma Chave Pix válida para o seu estabelecimento.");
      return;
    }

    setSalvandoEst(true);
    try {
      const enderecoFinal = `${logradouroEst}, ${numeroEst}${complementoEst ? ` - ${complementoEst}` : ""} - ${bairroEst}, ${cidadeEst}/${ufEst} - CEP: ${cepEst}`;

      const contasPixValidas = contasPix.filter((c) => c.chave && c.chave !== "contato@caixadoce.com.br");
      const contaPadrao = contasPixValidas.find((c) => c.isDefault) || contasPixValidas[0];
      const chavePixFinal = contaPadrao ? contaPadrao.chave : (chavePix !== "contato@caixadoce.com.br" ? chavePix : "");

      await updateEstablishmentDetails({
        codigo: activeCode,
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
        chavePix: chavePixFinal,
        tipoChavePix: contaPadrao ? contaPadrao.tipo : tipoChavePix,
        contasPix: contasPixValidas,
        logoUrl,
        store_logo_url: logoUrl,
        bannerUrl,
        banner_url: bannerUrl,
        store_banner_url: bannerUrl,
        themeColor,
        theme_color: themeColor,
        cor_destaque: themeColor,
        tituloCardapio,
        menu_title: tituloCardapio,
        sloganCardapio,
        menu_slogan: sloganCardapio,
        instagram: instagramEst,
        social_instagram: instagramEst,
        tiktok: tiktokEst,
        social_tiktok: tiktokEst,
        facebook: facebookEst,
        social_facebook: facebookEst,
        usar_mercadopago: usarMercadopago,
        chave_pix_manual: chavePixManual,
      });

      // Garante sincronização imediata dos campos locais sem reversão
      if (nomeEst) setNomeEst(nomeEst);
      if (responsavelEst) setResponsavelEst(responsavelEst);
      if (telEst) setTelEst(telEst);
      if (chavePixFinal) setChavePix(chavePixFinal);

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
                        ? `Teste Pro (${infoPlano.diasRestantesTrial || 7} dias restantes)`
                        : infoPlano.planoId === "basico"
                        ? "Plano Básico Gratuito"
                        : "Plano Pro Ativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {infoPlano.planoId === "basico"
                      ? "Você está usando o Plano Básico. Faça upgrade para o Plano Pro e libere o scanner por IA ilimitado."
                      : "Acesso ilimitado liberado para leitura por IA, ficha técnica e agendamento de encomendas."}
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
        <div className="w-full overflow-x-auto scrollbar-none pb-1">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-muted/80 p-1 sm:p-1.5 rounded-2xl border border-border/50 gap-1 h-auto">
            <TabsTrigger
              value="empresa"
              className="flex items-center justify-center gap-1.5 font-bold px-1.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold"
            >
              <Building2 className="w-4 h-4 text-primary shrink-0" /> Loja
            </TabsTrigger>
            <TabsTrigger
              value="frete"
              className="flex items-center justify-center gap-1.5 font-bold px-1.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold"
            >
              <Truck className="w-4 h-4 text-primary shrink-0" /> Frete &amp; Entrega
            </TabsTrigger>
            <TabsTrigger
              value="colaboradores"
              className="flex items-center justify-center gap-1.5 font-bold px-1.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold"
            >
              <Users className="w-4 h-4 text-primary shrink-0" /> Equipe
            </TabsTrigger>
            <TabsTrigger
              value="seguranca"
              className="flex items-center justify-center gap-1.5 font-bold px-1.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold"
            >
              <Lock className="w-4 h-4 text-primary shrink-0" /> Segurança
            </TabsTrigger>
            <TabsTrigger
              value="contato"
              className="flex items-center justify-center gap-1.5 font-bold px-1.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold col-span-2 sm:col-span-1"
            >
              <Mail className="w-4 h-4 text-primary shrink-0" /> Contato
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB: FRETE & REGRAS DE ENTREGA */}
        <TabsContent value="frete" className="space-y-6">
          <FreteConfigView estabelecimentoCodigo={activeCode} />
        </TabsContent>

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

          {/* CARD: INTEGRAÇÃO DE PAGAMENTO (MERCADO PAGO CONNECT) */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Integração de Pagamento (Mercado Pago Connect)</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Conecte sua conta do Mercado Pago para receber pagamentos de vendas diretamente no seu estabelecimento no cardápio digital.
                  </CardDescription>
                </div>
                {mpConectado && (
                  <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-1 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conta Conectada
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {carregandoMp || processandoOAuthMp ? (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {processandoOAuthMp ? "Conectando e salvando tokens da sua conta Mercado Pago..." : "Verificando status da conexão..."}
                  </span>
                </div>
              ) : mpConectado ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                          Sua conta do Mercado Pago está conectada e pronta para receber!
                        </span>
                      </div>
                      {mpUserId && (
                        <p className="text-[11px] font-mono text-muted-foreground">
                          User ID Mercado Pago: <strong>{mpUserId}</strong>
                        </p>
                      )}
                      {mpPublicKey && (
                        <p className="text-[10px] font-mono text-muted-foreground truncate max-w-md">
                          Chave Pública: {mpPublicKey.substring(0, 20)}...
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDesconectarMercadoPago}
                      disabled={desconectandoMp}
                      className="text-xs font-bold border-rose-300 text-rose-600 hover:bg-rose-500/15 hover:text-rose-700 h-9 rounded-xl gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {desconectandoMp ? "Desconectando..." : "Desconectar Mercado Pago"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      Receba pagamentos direto no seu Mercado Pago
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ao conectar sua conta, todas as vendas pagas por Pix ou Cartão no seu cardápio serão creditadas em tempo real na sua conta do Mercado Pago.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleConectarMercadoPago}
                    className="w-full sm:w-auto font-black text-xs h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Conectar com Mercado Pago
                  </Button>
                </div>
              )}

              {/* CONFIGURAÇÃO DO MODO DE RECEBIMENTO DO PIX NO CHECKOUT */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Modo de Recebimento via Pix no Cardápio
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Escolha entre Pix Automático (Mercado Pago com QR Code gerado em tempo real) ou Pix Manual (exibe sua chave direta).
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-background p-2 rounded-xl border border-border shrink-0">
                    <span className={`text-xs font-bold ${!usarMercadopago ? "text-purple-600 dark:text-purple-400 font-extrabold" : "text-muted-foreground"}`}>
                      Pix Manual
                    </span>
                    <Switch
                      checked={usarMercadopago}
                      onCheckedChange={(checked) => setUsarMercadopago(checked)}
                    />
                    <span className={`text-xs font-bold ${usarMercadopago ? "text-purple-600 dark:text-purple-400 font-extrabold" : "text-muted-foreground"}`}>
                      Pix Automático (Mercado Pago)
                    </span>
                  </div>
                </div>

                {!usarMercadopago && (
                  <div className="space-y-2 pt-2 border-t border-purple-500/20">
                    <Label htmlFor="chave-pix-manual" className="text-xs font-bold text-foreground">
                      Chave Pix Manual (Direto na Conta)
                    </Label>
                    <Input
                      id="chave-pix-manual"
                      placeholder="Digite seu CPF, CNPJ, E-mail, Celular ou Chave Aleatória"
                      value={chavePixManual}
                      onChange={(e) => setChavePixManual(e.target.value)}
                      className="bg-background text-xs h-9"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Esta chave será exibida diretamente para o cliente ao finalizar o pedido no cardápio com o botão &quot;Copiar Chave&quot;.
                    </p>
                  </div>
                )}
              </div>
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

                {/* 📱 REDES SOCIAIS NO CARDÁPIO PÚBLICO */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-4 h-4" /> Redes Sociais no Cardápio Público
                    </h4>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                      Exibição Automática
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadastre os perfis da sua confeitaria para que seus clientes possam acessar seu Instagram, TikTok, Facebook ou WhatsApp diretamente do seu cardápio público.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="est-instagram" className="text-xs font-bold flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5 text-pink-600" /> Instagram
                      </Label>
                      <Input
                        id="est-instagram"
                        placeholder="Ex: @suaconfeitaria ou link completo"
                        value={instagramEst}
                        onChange={(e) => setInstagramEst(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="est-tiktok" className="text-xs font-bold flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" /> TikTok
                      </Label>
                      <Input
                        id="est-tiktok"
                        placeholder="Ex: @suaconfeitaria ou link completo"
                        value={tiktokEst}
                        onChange={(e) => setTiktokEst(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="est-facebook" className="text-xs font-bold flex items-center gap-1.5">
                        <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook
                      </Label>
                      <Input
                        id="est-facebook"
                        placeholder="Ex: facebook.com/suaconfeitaria"
                        value={facebookEst}
                        onChange={(e) => setFacebookEst(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="est-whatsapp-social" className="text-xs font-bold flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp de Atendimento
                      </Label>
                      <Input
                        id="est-whatsapp-social"
                        placeholder="Ex: (11) 99999-9999"
                        value={telEst}
                        onChange={(e) => setTelEst(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* 🎨 IDENTIDADE VISUAL & PERSONALIZAÇÃO DO CARDÁPIO */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Identidade Visual &amp; Personalização do Cardápio
                    </h4>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                      Vitrine Pública
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Personalize a imagem de capa, logo, cor de destaque e títulos para deixar seu cardápio com a identidade única da sua marca.
                  </p>

                  {/* 1. IMAGEM DE CAPA (BANNER) */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border/80">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <ImageIcon className="w-4 h-4 text-primary" /> Imagem de Capa (Banner do Topo)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Recomendado: 1200x400 (Máx. 2MB)</span>
                    </div>

                    <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 border border-dashed border-border flex items-center justify-center group">
                      {bannerUrl ? (
                        <>
                          <img
                            src={bannerUrl}
                            alt="Capa do Cardápio"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => fileInputBannerRef.current?.click()}
                              className="text-xs font-bold bg-white/90 hover:bg-white text-stone-900"
                            >
                              <Upload className="w-3.5 h-3.5 mr-1" /> Trocar Imagem
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setBannerUrl("")}
                              className="text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Nenhuma capa selecionada. Será exibido o cabeçalho padrão com cor de destaque.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={enviandoBanner}
                            onClick={() => fileInputBannerRef.current?.click()}
                            className="text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            {enviandoBanner ? "Enviando..." : "Enviar Imagem de Capa"}
                          </Button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputBannerRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBannerFile}
                      className="hidden"
                    />

                    {bannerUrl && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBannerUrl("")}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover Imagem de Capa
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 2. LOGO DO ESTABELECIMENTO */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border/80">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <ImageIcon className="w-4 h-4 text-primary" /> Logo da Loja / Confeitaria
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border-2 border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <CaixaDoceLogo size="sm" />
                        )}
                      </div>

                      <div className="space-y-2 text-center sm:text-left flex-1">
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
                        <p className="text-[11px] text-muted-foreground">Formatos suportados: PNG, JPG, WEBP, SVG (Máx. 2MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. COR PRINCIPAL DE DESTAQUE */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/80">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Sparkles className="w-4 h-4 text-primary" /> Cor Principal de Destaque
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">{themeColor}</span>
                        <div
                          className="w-5 h-5 rounded-full border border-black/20 shadow-xs shrink-0"
                          style={{ backgroundColor: themeColor }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Aplicada aos botões de ação, badges de disponibilidade, preços e elementos de destaque no cardápio.
                    </p>

                    {/* Paletas Predefinidas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {PALETAS_CORES_TEMA.map((paleta) => {
                        const isSelected = themeColor.toLowerCase() === paleta.hex.toLowerCase();
                        return (
                          <button
                            type="button"
                            key={paleta.id}
                            onClick={() => setThemeColor(paleta.hex)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-bold shadow-xs"
                                : "border-border hover:border-border/80 bg-background/50 hover:bg-background"
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shrink-0 flex items-center justify-center text-white"
                              style={{ backgroundColor: paleta.hex }}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className="text-[11px] text-foreground truncate">{paleta.nome.split(" ")[0]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Cor Customizada */}
                    <div className="flex items-center gap-2 pt-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground shrink-0">
                        Ou escolha uma cor personalizada:
                      </Label>
                      <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                        <input
                          type="color"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                        />
                        <Input
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          placeholder="#8E7CC3"
                          className="h-8 text-xs font-mono uppercase"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. TÍTULO E SLOGAN DO CARDÁPIO */}
                  <div className="space-y-3 p-3.5 rounded-2xl bg-muted/30 border border-border/80">
                    <div className="space-y-1.5">
                      <Label htmlFor="cfg-menu-title" className="text-xs font-bold">
                        Título do Cardápio (Público)
                      </Label>
                      <Input
                        id="cfg-menu-title"
                        value={tituloCardapio}
                        onChange={(e) => setTituloCardapio(e.target.value)}
                        placeholder="Cardápio de Bolos & Doces Especiais"
                        className="text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Exibido no cabeçalho do seu cardápio público aos clientes.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cfg-menu-slogan" className="text-xs font-bold">
                        Slogan / Mensagem de Apresentação
                      </Label>
                      <Textarea
                        id="cfg-menu-slogan"
                        rows={2}
                        value={sloganCardapio}
                        onChange={(e) => setSloganCardapio(e.target.value)}
                        placeholder="Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe."
                        className="text-xs"
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

        {/* TAB: GESTÃO DE COLABORADORES & EQUIPE */}
        <TabsContent value="colaboradores" className="space-y-6">
          <ColaboradoresTab />
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

        {/* TAB: CONTATO */}
        <TabsContent value="contato" className="space-y-6">
          <Card className="border-border shadow-sm max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Fale Conosco</CardTitle>
                  <CardDescription className="text-xs">
                    Envie sua dúvida, sugestão de funcionalidade ou pedido de suporte diretamente para nossa equipe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnviarContato} className="space-y-4">
                {/* Identificação Automática Oculta */}
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 space-y-1 text-xs">
                  <p className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Identificação Automática da Conta
                  </p>
                  <p className="text-muted-foreground">
                    Sua mensagem será enviada vinculada a <strong>{nomeUsuario || "Usuário"}</strong> ({emailUsuario}) do estabelecimento <span className="font-mono font-bold text-foreground">{activeCode}</span>.
                  </p>
                </div>

                {/* Motivo do Contato */}
                <div className="space-y-1.5">
                  <Label htmlFor="contato-motivo" className="text-xs font-bold text-foreground">
                    Motivo do Contato
                  </Label>
                  <Select value={motivoContato} onValueChange={(val: any) => setMotivoContato(val)}>
                    <SelectTrigger id="contato-motivo" className="w-full text-xs font-medium">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sugestão" className="text-xs font-medium">
                        💡 Sugestão de Funcionalidade
                      </SelectItem>
                      <SelectItem value="Suporte" className="text-xs font-medium">
                        🛠️ Suporte Técnico
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mensagem */}
                <div className="space-y-1.5">
                  <Label htmlFor="contato-mensagem" className="text-xs font-bold text-foreground">
                    Mensagem
                  </Label>
                  <Textarea
                    id="contato-mensagem"
                    placeholder="Descreva detalhadamente sua sugestão ou dúvida..."
                    rows={6}
                    value={mensagemContato}
                    onChange={(e) => setMensagemContato(e.target.value)}
                    required
                    className="text-xs resize-y min-h-[120px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={enviandoContato || !mensagemContato.trim()}
                  className="w-full sm:w-auto font-extrabold shadow-md bg-purple-600 hover:bg-purple-700 text-white text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  {enviandoContato ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
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
