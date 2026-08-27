import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Copy, CheckCircle2, QrCode, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";
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
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [dadosPix, setDadosPix] = useState<{
    qrCodeBase64?: string;
    copiaECola?: string;
    paymentId?: string | number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    // Carregar SDK JS v2 do Mercado Pago
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
          setErro("Não foi possível carregar o checkout do Mercado Pago. Verifique sua conexão.");
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
            amount: valor,
            payer: { email: userEmail },
          },
          customization: {
            paymentMethods: {
              ticket: "all",
              creditCard: "all",
              bankTransfer: "all",
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
                    userEmail,
                    planoId,
                    valor,
                  }),
                });

                const data = await res.json();
                if (!res.ok || data.error) {
                  throw new Error(data.error || "Erro ao comunicar com o servidor de pagamento.");
                }

                if (data.status === "approved") {
                  toast.success("🎉 Pagamento Aprovado! Seu plano ilimitado foi ativado com sucesso.");
                  onSuccess();
                } else if (data.pix_copia_e_cola || data.pix_qr_code_base64) {
                  setDadosPix({
                    qrCodeBase64: data.pix_qr_code_base64,
                    copiaECola: data.pix_copia_e_cola,
                    paymentId: data.payment_id,
                  });
                  toast.info("Chave Pix gerada! Realize o pagamento pelo aplicativo do seu banco.");
                } else {
                  toast.info(`Status do Pagamento: ${data.status_detail || data.status || "Aguardando aprovação"}`);
                }
              } catch (err: any) {
                console.error("[Process Payment Error]", err);
                toast.error(`Falha no pagamento: ${err.message}`);
              } finally {
                if (active) setProcessando(false);
              }
            },
            onError: (error: any) => {
              console.error("[MercadoPago Brick Error]", error);
              toast.error("Ocorreu um erro no preenchimento dos dados do cartão.");
            },
          },
        });
      } catch (e: any) {
        console.error("[Init MercadoPago Error]", e);
        if (active) {
          setErro(e.message || "Erro ao inicializar formulário de pagamento.");
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
  }, [valor, userEmail, planoId, estabelecimentoCodigo]);

  // Polling em tempo real para verificar aprovação do Pix a cada 3 segundos
  useEffect(() => {
    if (!dadosPix?.paymentId) return;

    let isMounted = true;
    console.log(`[Pix Polling] Monitorando status do pagamento #${dadosPix.paymentId}...`);

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
            toast.success("🎉 Pagamento Pix Confirmado em Tempo Real! Seu plano PRO foi ativado com sucesso.");
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

  const gerarPixDireto = async () => {
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
            payer: { email: userEmail },
          },
          selectedPaymentMethod: "pix",
          estabelecimentoCodigo,
          userEmail,
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
        toast.success("✨ QR Code Pix gerado! Abra o aplicativo do seu banco para pagar.");
      } else {
        toast.error("Não foi possível carregar o QR Code Pix. Tente novamente.");
      }
    } catch (err: any) {
      console.error("[Gerar Pix Direto Error]", err);
      toast.error(`Erro ao gerar Pix: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const copiarPixCopiaECola = () => {
    if (!dadosPix?.copiaECola) return;
    navigator.clipboard.writeText(dadosPix.copiaECola);
    setCopiado(true);
    toast.success("Chave Pix copiada para a área de transferência!");
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <Card className="border-2 border-purple-500/30 shadow-xl bg-card overflow-hidden">
      <CardHeader className="bg-purple-500/10 border-b border-purple-500/20 pb-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Pagamento Seguro Mercado Pago
          </span>
        </div>
        <CardTitle className="text-lg font-extrabold text-foreground pt-2">
          Checkout — {nomePlano}
        </CardTitle>
        <CardDescription className="text-xs">
          Valor do investimento: <strong className="text-purple-600 font-mono text-sm">R$ {valor.toFixed(2).replace(".", ",")}</strong> (Pix ou Cartão)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* OPÇÃO DE GERAÇÃO DIRETA DE PIX NO TOPO */}
        {!dadosPix && (
          <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-center space-y-2">
            <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" /> Deseja pagar instantaneamente via Pix?
            </div>
            <Button
              onClick={gerarPixDireto}
              disabled={processando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-md flex items-center justify-center gap-2"
            >
              {processando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              <span>Gerar QR Code Pix e Chave Copia e Cola Agora</span>
            </Button>
          </div>
        )}

        {/* TELA SE O PIX FOI GERADO */}
        {dadosPix ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-base">
              <QrCode className="w-6 h-6" /> Pague com Pix para Ativação Instantânea
            </div>

            {dadosPix.qrCodeBase64 && (
              <div className="flex justify-center p-2 bg-white rounded-xl shadow-md max-w-[220px] mx-auto border border-emerald-200">
                <img
                  src={`data:image/png;base64,${dadosPix.qrCodeBase64}`}
                  alt="QR Code Pix Mercado Pago"
                  className="w-48 h-48 object-contain"
                />
              </div>
            )}

            {dadosPix.copiaECola && (
              <div className="space-y-2 text-left bg-background p-3 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-muted-foreground block">Código Pix Copia e Cola:</span>
                <div className="font-mono text-xs break-all bg-muted p-2 rounded-lg text-foreground max-h-24 overflow-y-auto border border-border">
                  {dadosPix.copiaECola}
                </div>
                <Button
                  onClick={copiarPixCopiaECola}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 py-2.5"
                >
                  {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado ? "Código Copiado!" : "Copiar Chave Pix Copia e Cola"}</span>
                </Button>
              </div>
            )}

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
              <span>
                <strong>Aguardando confirmação do pagamento em tempo real...</strong> O plano será ativado automaticamente assim que você pagar no app do seu banco!
              </span>
            </div>

            <div className="pt-2 flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDadosPix(null)} className="text-xs font-bold">
                Voltar às formas de pagamento
              </Button>
              <Button variant="outline" size="sm" onClick={onSuccess} className="text-xs font-bold text-emerald-700 border-emerald-300">
                Já Paguei / Confirmar
              </Button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO BRICKS DO MERCADO PAGO PARA CARTÃO DE CRÉDITO OU OUTROS MÉTODOS */
          <div className="relative min-h-[320px]">
            {carregando && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Carregando formulário seguro do Mercado Pago...
                </span>
              </div>
            )}

            {erro ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">Falha de Carregamento</span>
                  <span>{erro}</span>
                  <div className="pt-3">
                    <Button variant="outline" size="sm" onClick={onCancel} className="text-xs font-bold">
                      Voltar e tentar novamente
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div id="paymentBrick_container" ref={containerRef} className="w-full min-h-[300px]" />
            )}

            {processando && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xs gap-3">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                <span className="text-sm font-extrabold text-purple-900 dark:text-purple-200">
                  Gerando pagamento seguro no Mercado Pago...
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
