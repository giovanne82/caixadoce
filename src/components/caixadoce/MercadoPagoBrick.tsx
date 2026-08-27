import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, CheckCircle2, QrCode, AlertCircle, ShieldCheck, ArrowLeft, CreditCard, Sparkles } from "lucide-react";
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

  // INICIALIZA O MERCADO PAGO CARD BRICK APENAS SE O MÉTODO SELECIONADO FOR "CARTÃO"
  useEffect(() => {
    if (metodoPagamento !== "cartao" || dadosPix || valor < 1.00) return;

    let active = true;
    setCarregando(true);
    setErro(null);

    let script = document.getElementById("mercadopago-sdk-js") as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = "mercadopago-sdk-js";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      document.body.appendChild(script);
    }

    const initBrick = async () => {
      let attempts = 0;
      while (!window.MercadoPago && attempts < 35) {
        if (!active) return;
        await new Promise((resolve) => setTimeout(resolve, 200));
        attempts++;
      }

      if (!window.MercadoPago) {
        if (active) {
          setErro("Não foi possível carregar o formulário de Cartão de Crédito. Verifique sua conexão.");
          setCarregando(false);
        }
        return;
      }

      const publicKey =
        (import.meta as any).env?.VITE_MERCADOPAGO_PUBLIC_KEY ||
        (import.meta as any).env?.MERCADOPAGO_PUBLIC_KEY ||
        "APP_USR-827b8ae6-24e7-4251-86ee-ed4c2e947dbc";

      try {
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        if (window.paymentBrickController?.unmount) {
          try {
            window.paymentBrickController.unmount();
          } catch {}
        }

        window.paymentBrickController = await bricksBuilder.create("payment", "paymentBrick_container", {
          initialization: {
            amount: Number(valor.toFixed(2)),
            payer: {
              email: emailInput,
              entityType: "individual",
            },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              maxInstallments: 12,
            },
            visual: {
              style: {
                theme: "default",
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (active) setCarregando(false);
            },
            onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
              if (active) setProcessando(true);
              try {
                const res = await fetch("/api/mercadopago/process-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    formData: {
                      ...formData,
                      transaction_amount: valor,
                    },
                    selectedPaymentMethod,
                    estabelecimentoCodigo,
                    userEmail: emailInput,
                    planoId,
                    valor,
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
                if (active) setProcessando(false);
              }
            },
            onError: (error: any) => {
              console.error("[MercadoPago Brick Error]", error);
              toast.error("Ocorreu um erro no formulário do cartão.");
            },
          },
        });
      } catch (e: any) {
        console.error("[Init MercadoPago Error]", e);
        if (active) {
          setErro(e.message || "Erro ao inicializar formulário de cartão.");
          setCarregando(false);
        }
      }
    };

    initBrick();

    return () => {
      active = false;
      if (window.paymentBrickController?.unmount) {
        try {
          window.paymentBrickController.unmount();
        } catch {}
      }
    };
  }, [metodoPagamento, valor, emailInput, planoId, estabelecimentoCodigo, dadosPix]);

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
      const res = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: {
            payment_method_id: "pix",
            transaction_amount: valor,
            payer: { email: emailValido },
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
        // MUDA PARA A ETAPA 2 (Resultado Pix limpo sem formulário)
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
        {/* ========================================================================= */}
        {/* ETAPA 2: RESULTADO DO PIX (100% LIMPO SEM FORMULÁRIO OU SOBREPOSIÇÃO) */}
        {/* ========================================================================= */}
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

            {/* IMAGEM DO QR CODE CENTRALIZADA */}
            {dadosPix.qrCodeBase64 && (
              <div className="flex justify-center p-3 bg-white rounded-2xl shadow-md max-w-[210px] mx-auto border-2 border-emerald-300">
                <img
                  src={`data:image/png;base64,${dadosPix.qrCodeBase64}`}
                  alt="QR Code Pix Mercado Pago"
                  className="w-44 h-44 object-contain"
                />
              </div>
            )}

            {/* CHAVE PIX COPIA E COLA */}
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

            {/* STATUS POLLING AMIGÁVEL */}
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
                onClick={onSuccess}
                className="text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Já Paguei / Confirmar
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ETAPA 1: SELEÇÃO DE FORMA DE PAGAMENTO E DADOS */
          /* ========================================================================= */
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

            {/* AVISO INFORMATIVO QUANDO VALOR FOR INFERIOR A R$ 1,00 */}
            {valor < 1.00 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold block">Aviso de Valor Mínimo para Cartão</span>
                  <span>
                    O valor promocional com desconto é de <strong>R$ {valor.toFixed(2).replace(".", ",")}</strong>. Como as operadoras de cartão exigem valor mínimo de R$ 1,00, este pagamento deve ser realizado via <strong>Pix Instantâneo</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* EXIBIÇÃO CONFORME O MÉTODO SELECIONADO */}
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
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
              /* FORMULÁRIO SEGURO MERCADO PAGO BRICK PARA CARTÃO DE CRÉDITO */
              <div className="relative min-h-[300px] border border-border rounded-xl p-2 bg-card">
                {carregando && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-3 rounded-xl">
                    <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      Carregando formulário seguro de Cartão...
                    </span>
                  </div>
                )}

                {erro ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1">Erro de Carregamento</span>
                      <span>{erro}</span>
                    </div>
                  </div>
                ) : (
                  <div id="paymentBrick_container" ref={containerRef} className="w-full min-h-[280px]" />
                )}

                {processando && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xs gap-3 rounded-xl">
                    <Loader2 className="w-9 h-9 text-purple-600 animate-spin" />
                    <span className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                      Processando pagamento do cartão no Mercado Pago...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
