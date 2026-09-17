import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Cake,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Truck,
  Store,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  X,
  Send,
  Loader2,
  MessageCircle,
  Palette,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import {
  type DetalhesPersonalizacaoOrcamento,
} from "@/lib/caixadoce-data";
import {
  uploadFotoInspiracaoOrcamento,
  salvarOrcamentoPersonalizado,
  gerarLinkWhatsAppOrcamentoPersonalizado,
} from "@/lib/orcamentos-service";

interface AssistenteOrcamentoPersonalizadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoCodigo: string;
  lojaNome: string;
  lojaWhatsapp?: string;
  storeUserId?: string | null;
  corTema?: string;
  onSuccess?: (orderId: string) => void;
}

const SUGESTOES_SABORES = [
  "Brigadeiro Gourmet",
  "Ninho com Nutella",
  "Doce de Leite com Nozes",
  "Red Velvet",
  "Cenoura com Brigadeiro",
  "Quatro Leites com Morango",
  "Maracujá Trufado",
  "Coco Cremoso / Prestígio",
  "Ganache Meio Amargo",
  "Limão Siciliano",
];

const SUGESTOES_DECORACAO = [
  "Chantininho Espatulado",
  "Drip Cake",
  "Bento Cake",
  "Vintage / Lambeth Cake",
  "Flores Naturais",
  "Glitter & Folha de Ouro",
  "Trabalho em Bico de Confeitar",
  "Minimalista",
];

export function AssistenteOrcamentoPersonalizadoModal({
  open,
  onOpenChange,
  estabelecimentoCodigo,
  lojaNome,
  lojaWhatsapp = "",
  storeUserId,
  corTema = "#7C3AED",
  onSuccess,
}: AssistenteOrcamentoPersonalizadoModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Passo 1: Tipo & Quantidade
  const [tipoPedido, setTipoPedido] = useState<"bolo" | "doces" | "ambos">("bolo");
  const [rendimentoQtd, setRendimentoQtd] = useState("");

  // Passo 2: Sabores, Tema, Cores, Decoração & Extras
  const [sabores, setSabores] = useState("");
  const [temaFesta, setTemaFesta] = useState("");
  const [paletaCores, setPaletaCores] = useState("");
  const [decoracao, setDecoracao] = useState("");
  const [extraTopoBolo, setExtraTopoBolo] = useState(false);
  const [extraVelas, setExtraVelas] = useState(false);
  const [extraEmbalagem, setExtraEmbalagem] = useState(false);

  // Passo 3: Foto & Observações
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoUploadUrl, setFotoUploadUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Passo 4: Dados do Cliente & Entrega
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [dataEntrega, setDataEntrega] = useState(() => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 2);
    return amanha.toISOString().split("T")[0];
  });
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");

  // Estado de envio final
  const [enviandoOrcamento, setEnviandoOrcamento] = useState(false);
  const [orcamentoConcluido, setOrcamentoConcluido] = useState<{
    orderId: string;
    whatsappUrl: string;
  } | null>(null);

  // Helper de formatação de telefone/WhatsApp
  const handleWhatsappChange = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) {
      setClienteWhatsapp(nums);
    } else if (nums.length <= 6) {
      setClienteWhatsapp(`(${nums.slice(0, 2)}) ${nums.slice(2)}`);
    } else if (nums.length <= 10) {
      setClienteWhatsapp(`(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`);
    } else {
      setClienteWhatsapp(`(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`);
    }
  };

  // Upload e preview da foto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 10 MB.");
      return;
    }

    setFotoArquivo(file);
    const localPreviewUrl = URL.createObjectURL(file);
    setFotoPreview(localPreviewUrl);

    // Inicia upload para o Supabase Storage
    setEnviandoFoto(true);
    try {
      const res = await uploadFotoInspiracaoOrcamento(file, estabelecimentoCodigo);
      if (res.error) {
        toast.warning(`Aviso: A imagem foi selecionada, mas o upload no Storage apresentou: ${res.error}. Prosseguiremos com a referência.`);
      } else if (res.publicUrl) {
        setFotoUploadUrl(res.publicUrl);
        toast.success("Foto de inspiração anexada com sucesso! 📸");
      }
    } catch (err: any) {
      console.warn("Erro no upload da foto:", err);
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleRemoverFoto = () => {
    setFotoArquivo(null);
    setFotoPreview(null);
    setFotoUploadUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddSabor = (sabor: string) => {
    if (sabores.includes(sabor)) return;
    setSabores((prev) => (prev ? `${prev}, ${sabor}` : sabor));
  };

  const handleAddDecoracao = (dec: string) => {
    if (decoracao.includes(dec)) return;
    setDecoracao((prev) => (prev ? `${prev}, ${dec}` : dec));
  };

  const validarPasso1 = () => {
    if (!rendimentoQtd.trim()) {
      toast.error("Por favor, informe a quantidade de pessoas ou doces desejados.");
      return false;
    }
    return true;
  };

  const validarPasso2 = () => {
    if (!sabores.trim()) {
      toast.error("Por favor, informe os sabores ou recheios desejados.");
      return false;
    }
    return true;
  };

  const validarPasso4 = () => {
    if (!clienteNome.trim()) {
      toast.error("Por favor, informe seu nome.");
      return false;
    }
    const nums = clienteWhatsapp.replace(/\D/g, "");
    if (nums.length < 10) {
      toast.error("Por favor, informe um número de WhatsApp válido com DDD.");
      return false;
    }
    if (!dataEntrega) {
      toast.error("Por favor, selecione a data desejada.");
      return false;
    }
    if (tipoEntrega === "delivery" && !enderecoEntrega.trim()) {
      toast.error("Por favor, informe o endereço de entrega.");
      return false;
    }
    return true;
  };

  const handleAvancar = () => {
    if (step === 1 && !validarPasso1()) return;
    if (step === 2 && !validarPasso2()) return;
    setStep((prev) => Math.min(4, prev + 1) as any);
  };

  const handleVoltar = () => {
    setStep((prev) => Math.max(1, prev - 1) as any);
  };

  const handleFinalizarOrcamento = async () => {
    if (!validarPasso4()) return;

    setEnviandoOrcamento(true);
    try {
      const detalhesObj: DetalhesPersonalizacaoOrcamento = {
        tipo_pedido: tipoPedido,
        rendimento_quantidade: rendimentoQtd.trim(),
        sabores_recheios: sabores.trim(),
        tema_festa: temaFesta.trim() || undefined,
        paleta_cores: paletaCores.trim() || undefined,
        decoracao_desejada: decoracao.trim() || undefined,
        extras: {
          topo_bolo: extraTopoBolo,
          velas: extraVelas,
          embalagem_presente: extraEmbalagem,
        },
        observacoes: observacoes.trim() || undefined,
        foto_inspiracao_url: fotoUploadUrl || undefined,
        foto_inspiracao_nome: fotoArquivo?.name || undefined,
      };

      const res = await salvarOrcamentoPersonalizado({
        estabelecimentoCodigo,
        storeUserId,
        clienteNome: clienteNome.trim(),
        clienteWhatsapp: clienteWhatsapp.trim(),
        dataEntrega,
        horarioEntrega,
        tipoEntrega,
        enderecoEntrega: enderecoEntrega.trim(),
        detalhesPersonalizacao: detalhesObj,
      });

      if (!res.success || !res.orderId) {
        toast.error(`Falha ao registrar orçamento: ${res.error || "Tente novamente"}`);
        return;
      }

      // Salva no histórico de pedidos recentes no localStorage
      try {
        const itemHistorico = {
          id: res.orderId,
          data: new Date().toISOString(),
          created_at: new Date().toISOString(),
          data_entrega: dataEntrega,
          horario_entrega: horarioEntrega,
          tipo_entrega: tipoEntrega,
          valor_total: 0,
          status: "pendente",
          itens: `Personalizado: ${rendimentoQtd} - ${sabores}`,
          total_itens: 1,
          metodo_pagamento: "Orçamento",
          loja_codigo: estabelecimentoCodigo,
          loja_nome: lojaNome,
          is_personalizado: true,
          foto_url: fotoUploadUrl || undefined,
        };
        const raw = localStorage.getItem("caixadoce_recent_orders");
        const prev = raw ? JSON.parse(raw) : [];
        localStorage.setItem("caixadoce_recent_orders", JSON.stringify([itemHistorico, ...prev].slice(0, 5)));
      } catch {}

      const zapUrl = gerarLinkWhatsAppOrcamentoPersonalizado(
        lojaWhatsapp,
        lojaNome,
        clienteNome,
        dataEntrega,
        horarioEntrega,
        tipoEntrega,
        enderecoEntrega,
        detalhesObj
      );

      setOrcamentoConcluido({
        orderId: res.orderId,
        whatsappUrl: zapUrl,
      });

      toast.success("🎉 Solicitação de orçamento enviada com sucesso!");
      if (onSuccess) onSuccess(res.orderId);
    } catch (err: any) {
      console.error("Erro ao enviar orçamento:", err);
      toast.error("Ocorreu um erro ao enviar seu orçamento. Tente novamente.");
    } finally {
      setEnviandoOrcamento(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setOrcamentoConcluido(null);
    setFotoArquivo(null);
    setFotoPreview(null);
    setFotoUploadUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full p-0 rounded-3xl overflow-hidden border-border bg-card shadow-2xl font-sans max-h-[92vh] flex flex-col">
        {/* CABEÇALHO DO MODAL */}
        <div className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Assistente de Orçamento</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-white mt-1">
            Bolo &amp; Doces Personalizados
          </DialogTitle>
          <DialogDescription className="text-xs text-purple-100/90 mt-0.5">
            Conte todos os detalhes da sua festa para a <strong>{lojaNome || "confeitaria"}</strong> preparar sua cotação sob medida.
          </DialogDescription>

          {/* BARRA DE PROGRESSO EM ETAPAS */}
          {!orcamentoConcluido && (
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-1 text-[11px] font-bold">
              {[
                { n: 1, label: "Tipo & Qtd" },
                { n: 2, label: "Sabores & Tema" },
                { n: 3, label: "Inspiração" },
                { n: 4, label: "Contato" },
              ].map((s) => (
                <div
                  key={s.n}
                  onClick={() => {
                    if (s.n < step) setStep(s.n as any);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    step >= s.n ? "opacity-100" : "opacity-45"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                      step === s.n
                        ? "bg-amber-400 text-purple-950 ring-2 ring-white"
                        : step > s.n
                        ? "bg-emerald-400 text-emerald-950"
                        : "bg-white/20 text-white"
                    }`}
                  >
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <span className="hidden sm:inline text-[10px] truncate max-w-[70px]">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {orcamentoConcluido ? (
            /* TELA DE SUCESSO FINAL */
            <div className="text-center py-6 px-2 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-foreground">Orçamento Enviado com Sucesso! 🎉</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Os detalhes do seu pedido personalizado foram recebidos pelo sistema.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-left space-y-1.5 max-w-sm mx-auto">
                <p className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-purple-600" />
                  <span>Resumo do Pedido:</span>
                </p>
                <p className="text-muted-foreground text-[11px]">
                  <strong>Tipo:</strong> {rendimentoQtd} ({sabores})
                </p>
                {temaFesta && (
                  <p className="text-muted-foreground text-[11px]">
                    <strong>Tema:</strong> {temaFesta}
                  </p>
                )}
                <p className="text-muted-foreground text-[11px]">
                  <strong>Data Desejada:</strong> {dataEntrega ? dataEntrega.split("-").reverse().join("/") : ""} às {horarioEntrega}
                </p>
              </div>

              {orcamentoConcluido.whatsappUrl && (
                <div className="pt-2 space-y-2 max-w-sm mx-auto">
                  <a
                    href={orcamentoConcluido.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button
                      type="button"
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 rounded-2xl"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      Enviar Resumo no WhatsApp da Confeitaria
                    </Button>
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    Clique no botão acima para agilizar o atendimento e receber seu orçamento mais rápido.
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="text-xs font-bold rounded-xl mt-4"
              >
                Fechar
              </Button>
            </div>
          ) : (
            <>
              {/* ETAPA 1: TIPO DE PEDIDO & QUANTIDADE/RENDIMENTO */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                      <Cake className="w-4 h-4 text-purple-600" /> O que você deseja encomendar?
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "bolo", label: "Bolo Decorado", icon: "🎂", desc: "Bolos temáticos" },
                        { id: "doces", label: "Doces de Festa", icon: "🧁", desc: "Brigadeiros e finos" },
                        { id: "ambos", label: "Bolo + Doces", icon: "✨", desc: "Combo completo" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTipoPedido(t.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[85px] cursor-pointer ${
                            tipoPedido === t.id
                              ? "border-purple-600 bg-purple-500/10 text-purple-950 dark:text-purple-200 font-extrabold shadow-sm ring-1 ring-purple-600"
                              : "border-border/80 hover:bg-muted/40 text-foreground font-semibold"
                          }`}
                        >
                          <span className="text-xl">{t.icon}</span>
                          <span className="text-xs leading-tight">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rendimento" className="text-xs font-extrabold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        {tipoPedido === "bolo"
                          ? "Quantas pessoas ou peso aproximado?"
                          : tipoPedido === "doces"
                          ? "Quantidade aproximada de doces?"
                          : "Tamanho do bolo e quantidade de doces?"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">Ex: 20 pessoas (2kg)</span>
                    </Label>
                    <Input
                      id="rendimento"
                      value={rendimentoQtd}
                      onChange={(e) => setRendimentoQtd(e.target.value)}
                      placeholder={
                        tipoPedido === "bolo"
                          ? "Ex: Para 25 pessoas (aprox. 2.5 kg)"
                          : tipoPedido === "doces"
                          ? "Ex: 100 doces variados"
                          : "Ex: Bolo para 30 pessoas + 100 docinhos"
                      }
                      className="h-10 text-xs rounded-xl"
                    />

                    {/* Chips rápidos de tamanho */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tipoPedido === "bolo" ? (
                        ["10 a 15 pessoas (1.5kg)", "20 a 25 pessoas (2.5kg)", "30 a 40 pessoas (3.5kg)", "50+ pessoas (5kg)"].map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            onClick={() => setRendimentoQtd(s)}
                            className="text-[10px] cursor-pointer hover:bg-purple-600 hover:text-white transition-colors"
                          >
                            + {s}
                          </Badge>
                        ))
                      ) : (
                        ["50 doces", "100 doces", "150 doces", "200 doces"].map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            onClick={() => setRendimentoQtd(s)}
                            className="text-[10px] cursor-pointer hover:bg-purple-600 hover:text-white transition-colors"
                          >
                            + {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 2: SABORES, RECHEIOS, TEMA, CORES & EXTRAS */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="sabores" className="text-xs font-extrabold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500" /> Sabores &amp; Recheios Desejados
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold">*Obrigatório</span>
                    </Label>
                    <Input
                      id="sabores"
                      value={sabores}
                      onChange={(e) => setSabores(e.target.value)}
                      placeholder="Ex: Massa branca com Ninho, Nutella e Morangos frescos"
                      className="h-10 text-xs rounded-xl"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] text-muted-foreground font-semibold self-center mr-1">Sugestões:</span>
                      {SUGESTOES_SABORES.slice(0, 6).map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          onClick={() => handleAddSabor(s)}
                          className="text-[10px] cursor-pointer hover:bg-purple-600 hover:text-white transition-colors py-0.5"
                        >
                          + {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tema" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tema da Festa (Opcional)
                      </Label>
                      <Input
                        id="tema"
                        value={temaFesta}
                        onChange={(e) => setTemaFesta(e.target.value)}
                        placeholder="Ex: Safari, Princesas, Boteco, Minimalista"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cores" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-indigo-500" /> Paleta de Cores
                      </Label>
                      <Input
                        id="cores"
                        value={paletaCores}
                        onChange={(e) => setPaletaCores(e.target.value)}
                        placeholder="Ex: Rosa bebê e dourado, Tons pastéis"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="decoracao" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>✨</span> Estilo de Decoração
                    </Label>
                    <Input
                      id="decoracao"
                      value={decoracao}
                      onChange={(e) => setDecoracao(e.target.value)}
                      placeholder="Ex: Chantininho espatulado com drip de chocolate e morangos no topo"
                      className="h-9 text-xs rounded-xl"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {SUGESTOES_DECORACAO.slice(0, 4).map((d) => (
                        <Badge
                          key={d}
                          variant="outline"
                          onClick={() => handleAddDecoracao(d)}
                          className="text-[10px] cursor-pointer hover:bg-purple-600 hover:text-white transition-colors py-0.5"
                        >
                          + {d}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* EXTRAS (Checkboxes) */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                    <span className="text-xs font-extrabold text-foreground block">
                      Itens Extras &amp; Acessórios:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={extraTopoBolo} onCheckedChange={(c) => setExtraTopoBolo(Boolean(c))} />
                        <span className="text-xs font-medium">🎂 Topo de Bolo Personalizado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={extraVelas} onCheckedChange={(c) => setExtraVelas(Boolean(c))} />
                        <span className="text-xs font-medium">🕯️ Velas Especiais / Faísca</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={extraEmbalagem} onCheckedChange={(c) => setExtraEmbalagem(Boolean(c))} />
                        <span className="text-xs font-medium">🎁 Embalagem p/ Presente Especial</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: FOTO DE INSPIRAÇÃO & OBSERVAÇÕES */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label className="text-xs font-extrabold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-600" /> Foto de Inspiração / Referência (Opcional)
                      </span>
                      <span className="text-[10px] text-muted-foreground">Máx: 10 MB</span>
                    </Label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {fotoPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-purple-300 dark:border-purple-800 bg-black/5 p-2 flex items-center gap-3">
                        <img
                          src={fotoPreview}
                          alt="Preview da Inspiração"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shadow-xs shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-extrabold text-foreground truncate">
                            {fotoArquivo?.name || "Foto de Referência"}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {fotoArquivo?.size ? `${(fotoArquivo.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                          </p>
                          {enviandoFoto ? (
                            <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enviando para o servidor...</span>
                            </div>
                          ) : fotoUploadUrl ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                              ✓ Foto Anexada ao Pedido
                            </Badge>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoverFoto}
                          className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 rounded-xl shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-foreground">
                            Clique aqui para anexar uma foto de referência
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Formatos aceitos: JPG, PNG ou WebP (do seu celular ou computador)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="obs" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>💬</span> Algum detalhe adicional importante?
                    </Label>
                    <Textarea
                      id="obs"
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Ex: Tenho alergia a amendoim; escrever o nome 'Sofia - 5 anos' na placa de chocolate..."
                      className="text-xs rounded-xl resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ETAPA 4: DADOS DE CONTATO & DATA/HORA DE ENTREGA */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome" className="text-xs font-extrabold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-600" /> Seu Nome
                        </span>
                        <span className="text-rose-600 font-bold text-[10px]">*</span>
                      </Label>
                      <Input
                        id="nome"
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        placeholder="Nome completo"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="zap" className="text-xs font-extrabold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Seu WhatsApp
                        </span>
                        <span className="text-rose-600 font-bold text-[10px]">*</span>
                      </Label>
                      <Input
                        id="zap"
                        value={clienteWhatsapp}
                        onChange={(e) => handleWhatsappChange(e.target.value)}
                        placeholder="(DDD) 99999-9999"
                        className="h-10 text-xs font-mono rounded-xl"
                      />
                    </div>
                  </div>

                  {/* DATA E HORA DESEJADA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="data" className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" /> Data Desejada
                      </Label>
                      <Input
                        id="data"
                        type="date"
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hora" className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600" /> Horário Previsto
                      </Label>
                      <Input
                        id="hora"
                        type="time"
                        value={horarioEntrega}
                        onChange={(e) => setHorarioEntrega(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  {/* FORMA DE ENTREGA */}
                  <div className="space-y-2">
                    <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" /> Forma de Recebimento
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("retirada")}
                        className={`p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          tipoEntrega === "retirada"
                            ? "border-purple-600 bg-purple-500/10 text-purple-950 dark:text-purple-200 font-extrabold shadow-sm ring-1 ring-purple-600"
                            : "border-border/80 text-foreground font-semibold"
                        }`}
                      >
                        <Store className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs">Retirar no Balcão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoEntrega("delivery")}
                        className={`p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          tipoEntrega === "delivery"
                            ? "border-purple-600 bg-purple-500/10 text-purple-950 dark:text-purple-200 font-extrabold shadow-sm ring-1 ring-purple-600"
                            : "border-border/80 text-foreground font-semibold"
                        }`}
                      >
                        <Truck className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs">Entrega Delivery</span>
                      </button>
                    </div>

                    {tipoEntrega === "delivery" && (
                      <div className="pt-1 animate-fade-in">
                        <Input
                          value={enderecoEntrega}
                          onChange={(e) => setEnderecoEntrega(e.target.value)}
                          placeholder="Rua, número, bairro e complemento..."
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RODAPÉ DO MODAL (BOTOES AVANÇAR / VOLTAR / ENVIAR) */}
        {!orcamentoConcluido && (
          <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-2 shrink-0">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleVoltar}
                className="h-9 px-3 text-xs font-bold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-3 text-xs font-bold rounded-xl text-muted-foreground"
              >
                Cancelar
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleAvancar}
                style={{ backgroundColor: corTema }}
                className="h-9 px-4 text-xs font-extrabold text-white rounded-xl shadow-md flex items-center gap-1.5"
              >
                <span>Próximo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={enviandoOrcamento}
                onClick={handleFinalizarOrcamento}
                className="h-10 px-5 text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg flex items-center gap-1.5"
              >
                {enviandoOrcamento ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Solicitar Orçamento</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
