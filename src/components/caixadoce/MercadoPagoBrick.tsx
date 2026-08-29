import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, CheckCircle2, QrCode, AlertCircle, ShieldCheck, ArrowLeft, CreditCard, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    MercadoPago?: any;
    paymentBrickController?: any;
  }
}

interface MercadoPagoBrickProps {
  estabelecimentoCodigo: string;
  userEmail: string;
  planoId: string;
  valor: number;
  nomePlano: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MercadoPagoBrick({
  estabelecimentoCodigo,
  userEmail,
  planoId,
  valor,
  nomePlano,
  onSuccess,
  onCancel,
}: MercadoPagoBrickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mpInstanceRef = useRef<any>(null);

  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [emailInput, setEmailInput] = useState(userEmail || "contato@caixadoce.com.br");

  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // ETAPA 2 DADOS DO PIX
  const [dadosPix, setDadosPix] = useState<{
    qrCodeBase64?: string;
    copiaECola?: string;
    paymentId?: string | number;
  } | null>(null);

  // FORMULÁRIO DE CARTÃO TRANSPARENTE
  const [numeroCartao, setNumeroCartao] = useState("");
  const [nomeCartao, setNomeCartao] = useState("");
  const [validadeCartao, setValidadeCartao] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");

  // ESTADOS DO PARCELAMENTO (INSTALLMENTS & BIN)
  const [binAtual, setBinAtual] = useState("");
  const [buscandoParcelas, setBuscandoParcelas] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("credit_card");
  const [issuerId, setIssuerId] = useState<string | undefined>(undefined);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string>("1");
  const [opcoesParcelamento, setOpcoesParcelamento] = useState<
    Array<{
      installments: number;
      recommended_message: string;
      installment_amount: number;
      total_amount: number;
    }>
  >([]);

  // CARREGA E INICIALIZA O SDK JS DO MERCADO PAGO V2
  useEffect(() => {
    let active = true;

    let script = document.getElementById("mercadopago-sdk-js") as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = "mercadopago-sdk-js";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      document.body.appendChild(script);
    }

    const initMp = async () => {
      let attempts = 0;
      while (!window.MercadoPago && attempts < 35) {
        if (!active) return;
        await new Promise((resolve) => setTimeout(resolve, 200));
        attempts++;
      }

      if (window.MercadoPago && active) {
        const publicKey =
          (import.meta as any).env?.VITE_MERCADOPAGO_PUBLIC_KEY ||
          (import.meta as any).env?.MERCADOPAGO_PUBLIC_KEY ||
          "APP_USR-827b8ae6-24e7-4251-86ee-ed4c2e947dbc";
        try {
          mpInstanceRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
          console.log("[MercadoPago SDK v2] Inicializado com sucesso.");
        } catch (err) {
          console.error("[Init MercadoPago SDK Error]", err);
        }
      }
    };

    initMp();

    return () => {
      active = false;
    };
  }, []);

  // EFETUA O POLLING DO PIX EM TEMPO REAL (A CADA 3 SEG) QUANDO O PIX ESTÁ ATIVO NA ETAPA 2
  useEffect(() => {
    if (!dadosPix?.paymentId) return;

    let isMounted = true;
    console.log(`[Pix Polling] Inspecionando pagamento #${dadosPix.paymentId}...`);

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/mercadopago/check-status?payment_id=${dadosPix.paymentId}&estabelecimentoCodigo=${encodeURIComponent(
            estabelecimentoCodigo
          )}`
        );

        if (res.ok) {
          const data = await res.json();
          if (isMounted && (data.approved || data.status === "approved")) {
            clearInterval(intervalId);
            toast.success("🎉 Pagamento Pix Confirmado em Tempo Real! Seu acesso PRO foi ativado.");
            onSuccess();
          }
        }
      } catch (err) {
        console.warn("[Pix Polling Exception]", err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [dadosPix?.paymentId, estabelecimentoCodigo, onSuccess]);

  // AUTO-SWITCH PARA PIX SE VALOR FOR INFERIOR AO MÍNIMO DO CARTÃO (R$ 1,00)
  useEffect(() => {
    if (valor < 1.00 && metodoPagamento === "cartao") {
      setMetodoPagamento("pix");
    }
  }, [valor, metodoPagamento]);

  // BUSCAR PARCELAS (INSTALLMENTS) VIA SDK MERCADO PAGO AO DIGITAR O BIN (6 DÍGITOS)
  const consultarParcelasPorBin = async (binStr: string) => {
    if (!binStr || binStr.length < 6) return;
    setBuscandoParcelas(true);

    try {
      const mp = mpInstanceRef.current || (window.MercadoPago ? new window.MercadoPago("APP_USR-827b8ae6-24e7-4251-86ee-ed4c2e947dbc", { locale: "pt-BR" }) : null);
      if (!mp) {
        console.warn("[getInstallments] MercadoPago SDK ainda não pronto.");
        return;
      }

      const response = await mp.getInstallments({
        amount: String(valor.toFixed(2)),
        bin: binStr,
        paymentTypeId: "credit_card",
      });

      if (Array.isArray(response) && response.length > 0) {
        const data = response[0];
        if (data.payment_method_id) {
          setPaymentMethodId(data.payment_method_id);
        }
        if (data.issuer?.id) {
          setIssuerId(String(data.issuer.id));
        }

        if (Array.isArray(data.payer_costs) && data.payer_costs.length > 0) {
          setOpcoesParcelamento(data.payer_costs);
          // Manter 1x como padrão ou ajustar se a opção atual for inválida
          const existe = data.payer_costs.some((cost: any) => String(cost.installments) === parcelaSelecionada);
          if (!existe) {
            setParcelaSelecionada("1");
          }
          console.log(`[getInstallments] ${data.payer_costs.length} opções de parcelamento encontradas para ${data.payment_method_id}`);
        }
      }
    } catch (err) {
      console.warn("[getInstallments API Error]", err);
    } finally {
      setBuscandoParcelas(false);
    }
  };

  // HANDLER DO NÚMERO DO CARTÃO COM MÁSCARA E DETECÇÃO DE BIN
  const handleNumeroCartaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setNumeroCartao(formatted);

    const bin = raw.slice(0, 6);
    if (bin.length === 6 && bin !== binAtual) {
      setBinAtual(bin);
      consultarParcelasPorBin(bin);
    }
  };

  // HANDLER DA VALIDADE MM/AA
  const handleValidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setValidadeCartao(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setValidadeCartao(raw);
    }
  };

  // HANDLER DO CPF/CNPJ COM MÁSCARA
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
    if (raw.length > 11) {
      // CNPJ: 00.000.000/0000-00
      const formatted = raw
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
      setCpfCnpj(formatted);
    } else {
      // CPF: 000.000.000-00
      const formatted = raw
        .replace(/(\d{3})(?=\d)/g, "$1.")
        .replace(/\.(\d{3})$/, "-$1");
      setCpfCnpj(formatted);
    }
  };

  // LISTA EFETIVA DE PARCELAS (DADOS REAIS DA API OU CÁLCULO ESTIMADO SE BIN NÃO DIGITADO)
  const opcoesParcelamentoEfetivas = useMemo(() => {
    if (opcoesParcelamento.length > 0) {
      return opcoesParcelamento;
    }

    const max = planoId === "anual" || valor >= 50 ? 12 : 6;
    const list = [];
    for (let i = 1; i <= max; i++) {
      const valParcela = valor / i;
      list.push({
        installments: i,
        recommended_message: `${i}x de R$ ${valParcela.toFixed(2).replace(".", ",")} ${i === 1 ? "(À vista sem juros)" : ""}`,
        installment_amount: valParcela,
        total_amount: valor,
      });
    }
    return list;
  }, [opcoesParcelamento, valor, planoId]);

  // NOME AMIGÁVEL DA BANDEIRA DO CARTÃO
  const nomeBandeira = useMemo(() => {
    if (!paymentMethodId || paymentMethodId === "credit_card") return null;
    const map: Record<string, string> = {
      visa: "Visa",
      master: "Mastercard",
      elo: "Elo",
      amex: "American Express",
      hipercard: "Hipercard",
      diners: "Diners Club",
    };
    return map[paymentMethodId.toLowerCase()] || paymentMethodId.toUpperCase();
  }, [paymentMethodId]);

  // PROCESSAMENTO DO FORMULÁRIO DE CARTÃO TRANSPARENTE
  const handleSubmeterCartao = async (e: React.FormEvent) => {
    e.preventDefault();

    const numLimpo = numeroCartao.replace(/\D/g, "");
    if (numLimpo.length < 13) {
      toast.error("Por favor, digite o número completo do seu cartão de crédito.");
      return;
    }
    if (!nomeCartao.trim()) {
      toast.error("Por favor, informe o nome exatamente como impresso no cartão.");
      return;
    }
    const valLimpa = validadeCartao.replace(/\D/g, "");
    if (valLimpa.length < 4) {
      toast.error("Por favor, informe a data de validade (MM/AA).");
      return;
    }
    if (cvv.trim().length < 3) {
      toast.error("Por favor, informe o código de segurança (CVV).");
      return;
    }
    const cpfLimpo = cpfCnpj.replace(/\D/g, "");
    if (cpfLimpo.length < 11) {
      toast.error("Por favor, informe um CPF ou CNPJ válido do titular.");
      return;
    }

    setProcessando(true);
    setErro(null);

    try {
      const expMonth = valLimpa.slice(0, 2);
      let expYear = valLimpa.slice(2, 4);
      if (expYear.length === 2) {
        expYear = `20${expYear}`;
      }

      const publicKey =
        (import.meta as any).env?.VITE_MERCADOPAGO_PUBLIC_KEY ||
        (import.meta as any).env?.MERCADOPAGO_PUBLIC_KEY ||
        "APP_USR-827b8ae6-24e7-4251-86ee-ed4c2e947dbc";

      const mp = mpInstanceRef.current || (window.MercadoPago ? new window.MercadoPago(publicKey, { locale: "pt-BR" }) : null);

      if (!mp) {
        throw new Error("Não foi possível carregar a biblioteca de pagamentos do Mercado Pago.");
      }

      // 1. GERAR TOKEN DO CARTÃO DE CRÉDITO
      const cardTokenResult = await mp.createCardToken({
        cardNumber: numLimpo,
        cardholderName: nomeCartao.trim(),
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: cvv.trim(),
        identificationType: cpfLimpo.length > 11 ? "CNPJ" : "CPF",
        identificationNumber: cpfLimpo,
      });

      if (!cardTokenResult || !cardTokenResult.id) {
        throw new Error(cardTokenResult?.error?.message || "Dados do cartão inválidos. Verifique os números e tente novamente.");
      }

      const token = cardTokenResult.id;
      const numInstallments = Number(parcelaSelecionada || 1);
      const descPlano = planoId === "anual" ? "Plano Anual Completo PRO (365 dias)" : "Plano Mensal Completo PRO (30 dias)";

      // 2. ENVIAR PAYLOAD COMPLETO COM INSTALLMENTS, PAYMENT_METHOD_ID E ISSUER_ID
      const res = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          installments: numInstallments,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          transaction_amount: valor,
          description: descPlano,
          userEmail: emailInput,
          estabelecimentoCodigo: estabelecimentoCodigo,
          planoId: planoId,
          valor: valor,
          formData: {
            token: token,
            installments: numInstallments,
            payment_method_id: paymentMethodId,
            issuer_id: issuerId,
            transaction_amount: valor,
            description: descPlano,
            payer: {
              email: emailInput,
              first_name: nomeCartao.trim().split(" ")[0] || "Assinante",
              last_name: nomeCartao.trim().split(" ").slice(1).join(" ") || "CaixaDoce",
              identification: {
                type: cpfLimpo.length > 11 ? "CNPJ" : "CPF",
                number: cpfLimpo,
              },
            },
            metadata: {
              plan_type: planoId,
              plano_id: planoId,
              estabelecimento_codigo: estabelecimentoCodigo,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao comunicar com o servidor de pagamento.");
      }

      if (data.status === "approved" || data.status === "authorized") {
        toast.success("🎉 Pagamento por Cartão Aprovado! Seu plano foi ativado com sucesso.");
        onSuccess();
      } else {
        toast.info(`Status do Pagamento: ${data.status_detail || data.status || "Aguardando aprovação"}`);
      }
    } catch (err: any) {
      console.error("[Process Payment Card Error]", err);
      toast.error(`Falha no pagamento por cartão: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  // GERAR COBRANÇA PIX INSTANTÂNEA E AVANÇAR PARA A ETAPA 2
  const handleGerarPix = async () => {
    const emailValido = emailInput.trim();
    if (!emailValido) {
      toast.error("Por favor, informe seu e-mail para vincular a cobrança.");
      return;
    }

    setProcessando(true);
    setErro(null);
    try {
      const descPlano = planoId === "anual" ? "Plano Anual Completo PRO (365 dias)" : "Plano Mensal Completo PRO (30 dias)";
      const res = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: {
            payment_method_id: "pix",
            transaction_amount: valor,
            description: descPlano,
            payer: { email: emailValido },
            metadata: {
              plan_type: planoId,
              plano_id: planoId,
              estabelecimento_codigo: estabelecimentoCodigo,
            },
          },
          selectedPaymentMethod: "pix",
          estabelecimentoCodigo,
          userEmail: emailValido,
          planoId,
          valor,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar cobrança Pix.");
      }

      const qrCode = data.pix_qr_code_base64 || data.qr_code_base64;
      const copiaECola = data.pix_copia_e_cola || data.qr_code;
      const pid = data.payment_id || data.id;

      if (qrCode || copiaECola) {
        setDadosPix({
          qrCodeBase64: qrCode,
          copiaECola: copiaECola,
          paymentId: pid,
        });
        toast.success("✨ QR Code e Chave Pix gerados com sucesso! Pague no aplicativo do seu banco.");
      } else {
        toast.error("Não foi possível obter o QR Code Pix do Mercado Pago. Tente novamente.");
      }
    } catch (err: any) {
      console.error("[Gerar Pix Error]", err);
      toast.error(`Erro ao gerar Pix: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const [verificandoManual, setVerificandoManual] = useState(false);

  const handleVerificarPagamentoManual = async () => {
    setVerificandoManual(true);
    try {
      let aprovado = false;

      if (dadosPix?.paymentId) {
        const res = await fetch(
          `/api/mercadopago/check-status?payment_id=${dadosPix.paymentId}&estabelecimentoCodigo=${encodeURIComponent(
            estabelecimentoCodigo
          )}&_t=${Date.now()}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.approved || data.status === "approved" || data.status_assinatura === "ativo") {
            aprovado = true;
          }
        }
      }

      if (!aprovado && estabelecimentoCodigo) {
        const { data: dbData } = await supabase
          .from("estabelecimentos")
          .select("status, status_assinatura, plano_exp, plano_expira_em")
          .eq("codigo", estabelecimentoCodigo.toUpperCase())
          .maybeSingle();

        if (dbData) {
          const expBanco = dbData.plano_exp || dbData.plano_expira_em;
          const expMs = expBanco ? new Date(expBanco).getTime() : 0;
          const statusBanco = dbData.status || dbData.status_assinatura;

          if ((!isNaN(expMs) && expMs > Date.now()) || statusBanco === "ativo") {
            aprovado = true;
          }
        }
      }

      if (aprovado) {
        toast.success("🎉 Pagamento Pix Confirmado com sucesso! Seu acesso PRO foi ativado.");
        onSuccess();
      } else {
        toast.warning(
          "Ainda não identificamos o pagamento. Pode levar alguns segundos para o banco processar. Tente novamente em instantes.",
          { duration: 5000 }
        );
      }
    } catch (err) {
      console.warn("[Verificar Pagamento Manual Error]", err);
      toast.error("Erro ao consultar status no servidor. Tente novamente em instantes.");
    } finally {
      setVerificandoManual(false);
    }
  };

  const copiarPixCopiaECola = () => {
    if (!dadosPix?.copiaECola) return;
    navigator.clipboard.writeText(dadosPix.copiaECola);
    setCopiado(true);
    toast.success("Chave Pix copiada com sucesso!");
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <Card className="border-0 shadow-none bg-transparent overflow-hidden">
      <CardHeader className="px-0 pt-0 pb-4 border-b border-border mb-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={dadosPix ? () => setDadosPix(null) : onCancel}
            className="text-xs font-bold text-muted-foreground hover:text-foreground p-0 h-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {dadosPix ? "Voltar às opções" : "Voltar aos planos"}
          </Button>
          <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Mercado Pago Seguro
          </span>
        </div>
        <CardTitle className="text-xl font-black text-foreground pt-3 flex items-center gap-2">
          {nomePlano}
        </CardTitle>
        <CardDescription className="text-xs font-medium">
          Valor final: <strong className="text-purple-600 font-mono text-base">R$ {valor.toFixed(2).replace(".", ",")}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-4">
        {/* ETAPA 2: RESULTADO DO PIX */}
        {dadosPix ? (
          <div className="p-4 sm:p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center space-y-5 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xs mb-1">
                <QrCode className="w-4 h-4" /> Pagamento Pix Gerado
              </div>
              <h3 className="text-sm font-black text-foreground">
                Abra o aplicativo do seu banco e escaneie o código abaixo:
              </h3>
            </div>

            {dadosPix.qrCodeBase64 && (
              <div className="flex justify-center p-3 bg-white rounded-2xl shadow-md max-w-[210px] mx-auto border-2 border-emerald-300">
                <img
                  src={`data:image/png;base64,${dadosPix.qrCodeBase64}`}
                  alt="QR Code Pix Mercado Pago"
                  className="w-44 h-44 object-contain"
                />
              </div>
            )}

            {dadosPix.copiaECola && (
              <div className="space-y-2 text-left bg-background p-3.5 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-muted-foreground block">Ou copie o código Pix abaixo:</span>
                <div className="font-mono text-[11px] break-all bg-muted p-2.5 rounded-lg text-foreground max-h-24 overflow-y-auto border border-border select-all">
                  {dadosPix.copiaECola}
                </div>
                <Button
                  onClick={copiarPixCopiaECola}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 shadow-md flex items-center justify-center gap-2"
                >
                  {copiado ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado ? "CÓDIGO PIX COPIADO!" : "COPIAR CHAVE PIX COPIA E COLA"}</span>
                </Button>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
              <span className="font-medium text-left leading-relaxed">
                <strong>Verificando pagamento em tempo real...</strong> O sistema liberará seu plano automaticamente assim que o banco confirmar a transferência!
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDadosPix(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Trocar forma de pagamento
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleVerificarPagamentoManual}
                disabled={verificandoManual}
                className="text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {verificandoManual ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>VERIFICANDO NO BANCO...</span>
                  </>
                ) : (
                  <span>Já Paguei / Confirmar</span>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* ETAPA 1: SELEÇÃO DE FORMA DE PAGAMENTO E DADOS */
          <div className="space-y-4">
            {/* EMAIL DO ASSINANTE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-foreground">E-mail para comprovante e ativação:</Label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="h-10 text-xs font-medium"
              />
            </div>

            {/* TABS DE SELEÇÃO DE MÉTODO: PIX VS CARTÃO */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-extrabold text-foreground block">Selecione a forma de pagamento:</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant={metodoPagamento === "pix" ? "default" : "outline"}
                  onClick={() => setMetodoPagamento("pix")}
                  className={`h-12 text-xs font-extrabold flex items-center justify-center gap-2 rounded-xl transition-all ${
                    metodoPagamento === "pix"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-0"
                      : "border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pix Instantâneo</span>
                </Button>

                <Button
                  type="button"
                  variant={metodoPagamento === "cartao" ? "default" : "outline"}
                  onClick={() => {
                    if (valor < 1.00) {
                      toast.warning(
                        `Valores abaixo de R$ 1,00 (R$ ${valor.toFixed(2).replace(".", ",")}) não são aceitos por operadoras de cartão. Utilize o Pix Instantâneo!`
                      );
                      setMetodoPagamento("pix");
                      return;
                    }
                    setMetodoPagamento("cartao");
                  }}
                  className={`h-12 text-xs font-extrabold flex items-center justify-center gap-2 rounded-xl transition-all ${
                    valor < 1.00
                      ? "opacity-60 border-dashed"
                      : metodoPagamento === "cartao"
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md border-0"
                      : "border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão {valor < 1.00 ? "(Mín. R$ 1,00)" : "de Crédito"}</span>
                </Button>
              </div>
            </div>

            {/* AVISO DE VALOR MÍNIMO PARA CARTÃO */}
            {valor < 1.00 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold block">Aviso de Valor Mínimo para Cartão</span>
                  <span>
                    O valor promocional com desconto é de <strong>R$ {valor.toFixed(2).replace(".", ",")}</strong>. Como as operadoras exigem valor mínimo de R$ 1,00, este pagamento deve ser realizado via <strong>Pix Instantâneo</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* FORMULÁRIOS DE PAGAMENTO */}
            {metodoPagamento === "pix" ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3">
                <div className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4" /> Pagamento Pix com Ativação Automática
                  </p>
                  <p className="text-[11px] opacity-90">
                    Gere o QR Code agora mesmo. Você poderá escanear ou copiar o código e a liberação ocorre em segundos após a confirmação.
                  </p>
                </div>

                <Button
                  onClick={handleGerarPix}
                  disabled={processando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  {processando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  <span>{processando ? "GERANDO CÓDIGO PIX..." : "GERAR QR CODE PIX E CHAVE COPIA E COLA"}</span>
                </Button>
              </div>
            ) : (
              /* FORMULÁRIO DE CARTÃO TRANSPARENTE COM DETECÇÃO DE BIN & PARCELAMENTO */
              <form onSubmit={handleSubmeterCartao} className="space-y-3.5 border border-border rounded-2xl p-4 bg-card shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-extrabold text-foreground">Dados do Cartão de Crédito</span>
                  </div>
                  {nomeBandeira && (
                    <span className="text-[11px] font-black uppercase text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      {nomeBandeira}
                    </span>
                  )}
                </div>

                {/* NÚMERO DO CARTÃO */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">Número do Cartão:</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={numeroCartao}
                      onChange={handleNumeroCartaoChange}
                      placeholder="0000 0000 0000 0000"
                      className="h-10 text-xs font-mono font-bold pr-10"
                      maxLength={19}
                      required
                    />
                    <CreditCard className="w-4 h-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* NOME DO TITULAR */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">Nome impresso no cartão:</Label>
                  <Input
                    type="text"
                    value={nomeCartao}
                    onChange={(e) => setNomeCartao(e.target.value.toUpperCase())}
                    placeholder="EX: MARIA S SILVA"
                    className="h-10 text-xs font-bold uppercase"
                    required
                  />
                </div>

                {/* VALIDADE & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Validade (MM/AA):</Label>
                    <Input
                      type="text"
                      value={validadeCartao}
                      onChange={handleValidadeChange}
                      placeholder="12/28"
                      className="h-10 text-xs font-mono font-bold text-center"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Cód. Segurança (CVV):</Label>
                    <Input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className="h-10 text-xs font-mono font-bold text-center"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>

                {/* CPF / CNPJ DO TITULAR */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">CPF / CNPJ do Titular do Cartão:</Label>
                  <Input
                    type="text"
                    value={cpfCnpj}
                    onChange={handleCpfCnpjChange}
                    placeholder="000.000.000-00"
                    className="h-10 text-xs font-mono font-bold"
                    maxLength={18}
                    required
                  />
                </div>

                {/* SELETOR DE PARCELAMENTO (INSTALLMENTS) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-extrabold text-foreground">Número de Parcelas:</Label>
                    {buscandoParcelas && (
                      <span className="text-[10px] font-medium text-purple-600 dark:text-purple-300 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Buscando taxas...
                      </span>
                    )}
                  </div>

                  <select
                    value={parcelaSelecionada}
                    onChange={(e) => setParcelaSelecionada(e.target.value)}
                    className="w-full h-10 text-xs font-bold rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-purple-600 transition-all cursor-pointer"
                  >
                    {opcoesParcelamentoEfetivas.map((opt) => (
                      <option key={opt.installments} value={String(opt.installments)}>
                        {opt.recommended_message || `${opt.installments}x de R$ ${opt.installment_amount.toFixed(2).replace(".", ",")} (Total: R$ ${opt.total_amount.toFixed(2).replace(".", ",")})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BOTÃO SUBMIT PAGAMENTO */}
                <Button
                  type="submit"
                  disabled={processando}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs py-4 rounded-xl shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  {processando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PROCESSANDO CARTÃO...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-purple-200" />
                      <span>PAGAR R$ {valor.toFixed(2).replace(".", ",")} NO CARTÃO</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
