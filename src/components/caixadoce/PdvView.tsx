import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  CheckCircle2,
  Copy,
  Clock,
  DollarSign,
  CreditCard,
  QrCode,
  Store,
  ArrowLeft,
  Search,
  Receipt,
  User,
  Calendar,
  Sparkles,
  Printer,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Banknote,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import {
  formatarMoeda,
  converterMoedaInputParaNumero,
  aplicarMascaraMoedaInput,
  aplicarMascaraTelefone,
  generatePixPayload,
  type ProdutoCardapio,
  type ProdutoOpcao,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

export interface ItemCarrinhoPdv {
  produto: ProdutoCardapio;
  quantidade: number;
  precoUnitario?: number;
  opcaoSelecionada?: ProdutoOpcao;
  opcoesSelecionadas?: Array<{
    id: string;
    nome: string;
    preco_adicional: number;
    quantidade?: number;
  }>;
}

export interface PartePagamentoPdv {
  id: string;
  metodo: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro";
  valor: number;
  valorRecebido?: number;
  troco?: number;
  status?: "aprovado" | "pendente";
  observacao?: string;
  pixQrCodeBase64?: string;
  pixCopiaCola?: string;
  mpPaymentId?: string;
}

export function PdvView() {
  const { user, profile, isMounted, authLoading } = useAuth();
  const navigate = useNavigate();

  const activeCode = profile?.establishmentCode || "";
  const activeName = profile?.establishmentName || "Minha Confeitaria";

  // Estados de Produtos e Loja
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [lojaInfo, setLojaInfo] = useState<any>(null);

  // Filtros do Catálogo
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");

  // Carrinho do PDV (Isolado)
  const [pdvCart, setPdvCart] = useState<ItemCarrinhoPdv[]>([]);

  // Modal de Opções de Produto
  const [produtoModal, setProdutoModal] = useState<ProdutoCardapio | null>(null);
  const [selectedOptionModal, setSelectedOptionModal] = useState<ProdutoOpcao | null>(null);
  const [quantidadesOpcoesModal, setQuantidadesOpcoesModal] = useState<Record<string, number>>({});
  const [quantidadeGlobalModal, setQuantidadeGlobalModal] = useState<number>(1);

  // Modal de Checkout / Finalização do PDV
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [tipoVenda, setTipoVenda] = useState<"balcao" | "agendada">("balcao");
  const [clienteNome, setClienteNome] = useState("Cliente Balcão");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [dataEntrega, setDataEntrega] = useState(() => new Date().toISOString().split("T")[0]);
  const [horarioEntrega, setHorarioEntrega] = useState("15:00");
  const [tipoEntregaAgendada, setTipoEntregaAgendada] = useState<"retirada" | "delivery">("retirada");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [observacoesVenda, setObservacoesVenda] = useState("");

  // Motor de Pagamentos Mistos
  const [partesPagamento, setPartesPagamento] = useState<PartePagamentoPdv[]>([]);
  const [metodoAtual, setMetodoAtual] = useState<"dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro">("dinheiro");
  const [valorParteInput, setValorParteInput] = useState<string>("");
  const [valorRecebidoInput, setValorRecebidoInput] = useState<string>("");
  const [gerandoPixParte, setGerandoPixParte] = useState(false);
  const [pixParteAtual, setPixParteAtual] = useState<{ qrBase64?: string; qrCode?: string; payId?: string } | null>(null);
  const [alertaPixModalOpen, setAlertaPixModalOpen] = useState(false);

  // Finalização e Recibo
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [vendaConcluidaModalOpen, setVendaConcluidaModalOpen] = useState(false);
  const [reciboUltimaVenda, setReciboUltimaVenda] = useState<any>(null);

  // 1. Carregamento dos Produtos do Estabelecimento
  useEffect(() => {
    if (!activeCode) return;

    async function carregarCatalogo() {
      setCarregandoProdutos(true);
      try {
        // Carrega dados da loja (para obter MP tokens e Pix Key)
        const { data: estRow } = await supabase
          .from("estabelecimentos")
          .select("*")
          .or(`codigo.eq.${activeCode},estabelecimento_codigo.eq.${activeCode}`)
          .maybeSingle();

        if (estRow) {
          setLojaInfo(estRow);
        }

        // Carrega produtos cadastrados
        const { data: prodsData, error } = await supabase
          .from("produtos")
          .select("*")
          .eq("estabelecimento_codigo", activeCode)
          .order("nome", { ascending: true });

        if (!error && prodsData && prodsData.length > 0) {
          const formatados: ProdutoCardapio[] = prodsData.map((p) => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria || "Geral",
            preco: Number(p.preco) || 0,
            descricao: p.descricao || "",
            fotoUrl: p.foto_url || "",
            ativo: p.ativo !== false,
            opcoes: p.opcoes || [],
            permite_multiplas_opcoes: p.permite_multiplas_opcoes || false,
          }));
          setProdutos(formatados);
        } else {
          // Fallback para localStorage
          const local = localStorage.getItem(`caixadoce_cardapio_${activeCode}`);
          if (local) {
            setProdutos(JSON.parse(local));
          }
        }
      } catch (err) {
        console.warn("[PDV] Erro ao carregar produtos:", err);
      } finally {
        setCarregandoProdutos(false);
      }
    }

    carregarCatalogo();
  }, [activeCode]);

  // Categorias Únicas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(produtos.map((p) => p.categoria))).filter(Boolean);
    return ["todas", ...cats];
  }, [produtos]);

  // Produtos Filtrados
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoriaAtiva === "todas" || p.categoria === categoriaAtiva;
      const matchBusca =
        !busca.trim() ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase())) ||
        (p.categoria && p.categoria.toLowerCase().includes(busca.toLowerCase()));
      return matchCat && matchBusca && p.ativo !== false;
    });
  }, [produtos, categoriaAtiva, busca]);

  // Cálculos do Carrinho
  const totalVenda = useMemo(() => {
    return pdvCart.reduce((acc, item) => {
      if (item.opcoesSelecionadas && item.opcoesSelecionadas.length > 0) {
        const sub = item.opcoesSelecionadas.reduce((s, o) => {
          const qtd = o.quantidade && o.quantidade > 0 ? o.quantidade : 1;
          return s + qtd * (item.produto.preco + (Number(o.preco_adicional) || 0));
        }, 0);
        return acc + sub;
      }
      const unitPrice = item.precoUnitario ?? (item.produto.preco + (item.opcaoSelecionada?.preco_adicional || 0));
      return acc + unitPrice * item.quantidade;
    }, 0);
  }, [pdvCart]);

  const totalItensCarrinho = useMemo(() => {
    return pdvCart.reduce((acc, it) => {
      if (it.opcoesSelecionadas && it.opcoesSelecionadas.length > 0) {
        const sumOpcs = it.opcoesSelecionadas.reduce((s, o) => s + (o.quantidade || 1), 0);
        return acc + sumOpcs;
      }
      return acc + it.quantidade;
    }, 0);
  }, [pdvCart]);

  // Cálculos dos Pagamentos Mistos
  const totalPagoAcumulado = useMemo(() => {
    return partesPagamento.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  }, [partesPagamento]);

  const saldoRestante = useMemo(() => {
    return Math.max(0, totalVenda - totalPagoAcumulado);
  }, [totalVenda, totalPagoAcumulado]);

  // Ajusta automaticamente o input de valor da próxima parcela para o saldo restante ao mudar
  useEffect(() => {
    if (checkoutModalOpen) {
      setValorParteInput(saldoRestante.toFixed(2).replace(".", ","));
      setValorRecebidoInput(saldoRestante.toFixed(2).replace(".", ","));
    }
  }, [saldoRestante, checkoutModalOpen]);

  // Cálculo de troco em tempo real para a parcela em dinheiro
  const trocoCalculado = useMemo(() => {
    if (metodoAtual !== "dinheiro") return 0;
    const vParte = converterMoedaInputParaNumero(valorParteInput);
    const vRec = converterMoedaInputParaNumero(valorRecebidoInput);
    if (vRec > vParte && vParte > 0) {
      return vRec - vParte;
    }
    return 0;
  }, [metodoAtual, valorParteInput, valorRecebidoInput]);

  // ==========================================
  // ADIÇÃO ÁGIL AO CARRINHO DO PDV
  // ==========================================
  const handleClicarProduto = (produto: ProdutoCardapio) => {
    const temOpcoes = produto.opcoes && produto.opcoes.length > 0;

    if (temOpcoes) {
      // Abre modal rápido para seleção de sabores / opções
      setProdutoModal(produto);
      setSelectedOptionModal(null);
      setQuantidadesOpcoesModal({});
      setQuantidadeGlobalModal(1);
    } else {
      // Inserção direta instantânea com 1 clique (+1 no carrinho)
      setPdvCart((prev) => {
        const indexExistente = prev.findIndex(
          (it) => it.produto.id === produto.id && !it.opcaoSelecionada && (!it.opcoesSelecionadas || it.opcoesSelecionadas.length === 0)
        );
        if (indexExistente >= 0) {
          const copia = [...prev];
          copia[indexExistente] = {
            ...copia[indexExistente],
            quantidade: copia[indexExistente].quantidade + 1,
          };
          return copia;
        }
        return [
          ...prev,
          {
            produto,
            quantidade: 1,
            precoUnitario: produto.preco,
          },
        ];
      });
      toast.success(`${produto.nome} adicionado ao pedido!`, { duration: 1500 });
    }
  };

  const handleConfirmarOpcoesModal = () => {
    if (!produtoModal) return;

    if (produtoModal.permite_multiplas_opcoes) {
      const opcoesComQtd = (produtoModal.opcoes || [])
        .map((opc) => ({
          id: opc.id,
          nome: opc.nome,
          preco_adicional: Number(opc.preco_adicional) || 0,
          quantidade: quantidadesOpcoesModal[opc.id] || 0,
        }))
        .filter((o) => o.quantidade > 0);

      if (opcoesComQtd.length === 0) {
        toast.error("Por favor, selecione a quantidade de ao menos uma opção.");
        return;
      }

      setPdvCart((prev) => [
        ...prev,
        {
          produto: produtoModal,
          quantidade: 1,
          opcoesSelecionadas: opcoesComQtd,
        },
      ]);
    } else {
      if (!selectedOptionModal) {
        toast.error("Por favor, selecione uma opção.");
        return;
      }

      const precoUn = produtoModal.preco + (Number(selectedOptionModal.preco_adicional) || 0);

      setPdvCart((prev) => [
        ...prev,
        {
          produto: produtoModal,
          quantidade: quantidadeGlobalModal,
          precoUnitario: precoUn,
          opcaoSelecionada: selectedOptionModal,
        },
      ]);
    }

    setProdutoModal(null);
    toast.success(`${produtoModal.nome} adicionado ao pedido!`, { duration: 1500 });
  };

  const handleAlterarQuantidadeItem = (index: number, delta: number) => {
    setPdvCart((prev) => {
      const item = prev[index];
      if (!item) return prev;

      if (item.opcoesSelecionadas && item.opcoesSelecionadas.length > 0) {
        // Multi-opções: incrementa ou decrementa proporcionalmente
        const novaQtd = item.quantidade + delta;
        if (novaQtd <= 0) {
          return prev.filter((_, i) => i !== index);
        }
        const copia = [...prev];
        copia[index] = { ...item, quantidade: novaQtd };
        return copia;
      }

      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const copia = [...prev];
      copia[index] = { ...item, quantidade: novaQtd };
      return copia;
    });
  };

  const handleRemoverItem = (index: number) => {
    setPdvCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLimparCarrinho = () => {
    if (pdvCart.length === 0) return;
    if (confirm("Deseja realmente limpar todos os itens do pedido atual?")) {
      setPdvCart([]);
    }
  };

  // ==========================================
  // MOTOR DE PAGAMENTOS MISTOS
  // ==========================================
  const handleGerarPixParte = async () => {
    const valor = converterMoedaInputParaNumero(valorParteInput);
    if (valor <= 0) {
      toast.error("Informe um valor válido para gerar o Pix.");
      return;
    }

    setGerandoPixParte(true);
    try {
      let gerouMp = false;

      if (lojaInfo?.usar_mercadopago) {
        let tokenLojista = lojaInfo?.mp_access_token;
        const pixPayload = {
          transaction_amount: valor,
          amount: valor,
          establishmentCode: activeCode,
          mp_access_token: tokenLojista || undefined,
          accessToken: tokenLojista || undefined,
          description: `PDV Balcão - R$ ${valor.toFixed(2)} (${activeCode})`,
          payer: {
            email: "balcao@caixadoce.com.br",
            first_name: clienteNome || "Cliente Balcão",
          },
        };

        try {
          const res = await fetch("/api/create-pix-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pixPayload),
          });
          if (res.ok) {
            const data = await res.json();
            const qrBase64 = data.qr_code_base64 || data.point_of_interaction?.transaction_data?.qr_code_base64;
            const qrCode = data.qr_code || data.point_of_interaction?.transaction_data?.qr_code;
            const payId = data.payment_id || data.id;

            if (qrBase64 || qrCode) {
              setPixParteAtual({ qrBase64, qrCode, payId });
              gerouMp = true;
              toast.success("QR Code Pix do Mercado Pago gerado!");
            }
          }
        } catch (eMp) {
          console.warn("[PDV Pix Proxy Warn]", eMp);
        }
      }

      if (!gerouMp) {
        const pixKey = lojaInfo?.chave_pix_manual || lojaInfo?.chavePix || profile?.chavePix || "";
        if (pixKey) {
          const pixManual = generatePixPayload({
            pixKey,
            merchantName: activeName,
            merchantCity: profile?.cidade || "SAO PAULO",
            amount: valor,
            txid: `PDV${Date.now().toString().slice(-8)}`,
            description: `PDV ${clienteNome.slice(0, 15)}`,
          });
          if (pixManual) {
            setPixParteAtual({ qrCode: pixManual });
            toast.success("Código Pix manual gerado!");
          }
        } else {
          toast.warning("Nenhuma chave Pix configurada na loja. Você pode confirmar o Pix manualmente.");
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar Pix: ${err?.message || err}`);
    } finally {
      setGerandoPixParte(false);
    }
  };

  const handleAdicionarPartePagamento = () => {
    const valor = converterMoedaInputParaNumero(valorParteInput);
    if (valor <= 0) {
      toast.error("Informe um valor maior que zero para o pagamento.");
      return;
    }

    if (valor > saldoRestante && saldoRestante > 0 && metodoAtual !== "dinheiro") {
      toast.warning("O valor informado é maior que o saldo restante da venda.");
    }

    const valorRec = metodoAtual === "dinheiro" ? converterMoedaInputParaNumero(valorRecebidoInput) : undefined;
    const troco = metodoAtual === "dinheiro" && valorRec && valorRec > valor ? valorRec - valor : 0;

    const novaParte: PartePagamentoPdv = {
      id: crypto.randomUUID(),
      metodo: metodoAtual,
      valor: valor,
      valorRecebido: valorRec,
      troco: troco,
      status: "aprovado",
      observacao:
        metodoAtual === "dinheiro"
          ? `Dinheiro (Recebido: ${formatarMoeda(valorRec || valor)}, Troco: ${formatarMoeda(troco)})`
          : metodoAtual === "pix"
          ? "Pix (QR Code / Balcão)"
          : metodoAtual === "cartao_credito"
          ? "Cartão de Crédito"
          : metodoAtual === "cartao_debito"
          ? "Cartão de Débito"
          : "Outro / A Combinar",
      pixQrCodeBase64: pixParteAtual?.qrBase64,
      pixCopiaCola: pixParteAtual?.qrCode,
      mpPaymentId: pixParteAtual?.payId,
    };

    setPartesPagamento((prev) => [...prev, novaParte]);
    setPixParteAtual(null);
    toast.success(`Pagamento de ${formatarMoeda(valor)} em ${novaParte.observacao?.split("(")[0]} adicionado!`);
  };

  const handleRemoverPartePagamento = (id: string) => {
    setPartesPagamento((prev) => prev.filter((p) => p.id !== id));
  };

  // ==========================================
  // FINALIZAÇÃO E GRAVAÇÃO DA VENDA NO BANCO
  // ==========================================
  const handleFinalizarVendaPdv = async () => {
    if (totalVenda <= 0) {
      toast.error("O carrinho está vazio.");
      return;
    }

    if (totalPagoAcumulado < totalVenda) {
      toast.error(
        `Faltam ${formatarMoeda(saldoRestante)} para cobrir o total da venda de ${formatarMoeda(totalVenda)}.`
      );
      return;
    }

    if (tipoVenda === "agendada" && !clienteNome.trim()) {
      toast.error("Para encomendas agendadas, informe o nome do cliente.");
      return;
    }

    setSalvandoVenda(true);
    try {
      const pedidoId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const hoje = nowIso.split("T")[0];

      // Formatação do resumo de itens
      const resumoItensTexto = pdvCart
        .map((it) => {
          if (it.opcoesSelecionadas && it.opcoesSelecionadas.length > 0) {
            const opcsStr = it.opcoesSelecionadas
              .map((o) => (o.quantidade && o.quantidade > 0 ? `${o.quantidade}x ${o.nome}` : o.nome))
              .join(", ");
            return `• ${it.quantidade}x ${it.produto.nome} (${opcsStr})`;
          }
          if (it.opcaoSelecionada) {
            return `• ${it.quantidade}x ${it.produto.nome} (${it.opcaoSelecionada.nome})`;
          }
          return `• ${it.quantidade}x ${it.produto.nome}`;
        })
        .join("\n");

      // Detalhamento JSON dos itens
      const itensDetalhesJson = pdvCart.map((it) => ({
        id: it.produto.id,
        nome: it.produto.nome,
        categoria: it.produto.categoria,
        quantidade: it.quantidade,
        precoUnitario: it.precoUnitario || it.produto.preco,
        subtotal: it.opcoesSelecionadas && it.opcoesSelecionadas.length > 0
          ? it.opcoesSelecionadas.reduce((s, o) => s + (o.quantidade || 1) * (it.produto.preco + (Number(o.preco_adicional) || 0)), 0)
          : (it.precoUnitario || it.produto.preco) * it.quantidade,
        opcaoNome: it.opcaoSelecionada?.nome,
        opcoes_selecionadas: it.opcoesSelecionadas || (it.opcaoSelecionada ? [it.opcaoSelecionada] : []),
      }));

      // Síntese dos métodos de pagamento utilizados
      const metodosUnicos = Array.from(
        new Set(
          partesPagamento.map((p) => {
            if (p.metodo === "dinheiro") return "Dinheiro";
            if (p.metodo === "pix") return "Pix";
            if (p.metodo === "cartao_credito") return "Cartão Crédito";
            if (p.metodo === "cartao_debito") return "Cartão Débito";
            return "Outro";
          })
        )
      );
      const metodoPagamentoSintese =
        metodosUnicos.length > 1
          ? `Pagamento Misto (${metodosUnicos.join(" + ")})`
          : metodosUnicos[0] || "Dinheiro";

      const historicoPagamentosJson = partesPagamento.map((p) => ({
        id: p.id,
        data: hoje,
        valor: p.valor,
        metodo: p.metodo,
        valor_recebido: p.valorRecebido,
        troco: p.troco,
        observacao: p.observacao || `Pagamento PDV (${p.metodo})`,
      }));

      const isVendaBalcaoImediata = tipoVenda === "balcao";
      const statusFinalPedido = isVendaBalcaoImediata ? "entregue" : "pendente";

      // 1. Gravação em 'encomendas'
      const payloadEncomenda: Record<string, any> = {
        id: pedidoId,
        estabelecimento_codigo: activeCode,
        user_id: profile?.ownerUserId || user?.id || null,
        cliente_nome: clienteNome.trim() || "Cliente Balcão",
        cliente_whatsapp: clienteWhatsapp.trim() || "",
        data_entrega: isVendaBalcaoImediata ? hoje : dataEntrega,
        horario_entrega: isVendaBalcaoImediata ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : horarioEntrega,
        tipo_entrega: isVendaBalcaoImediata ? "balcao" : tipoEntregaAgendada,
        endereco_entrega: isVendaBalcaoImediata ? "" : enderecoEntrega,
        status: statusFinalPedido,
        status_pagamento: "pago_integral",
        metodo_pagamento: metodoPagamentoSintese,
        forma_pagamento: "PDV / Balcão",
        origem_pagamento: "pdv",
        itens: resumoItensTexto,
        itens_detalhes: itensDetalhesJson,
        valor_total: totalVenda,
        total_amount: totalVenda,
        valor_entrada: totalVenda,
        valor_restante: 0,
        historico_pagamentos: historicoPagamentosJson,
        observacoes: observacoesVenda ? `[PDV] ${observacoesVenda}` : "[PDV Balcão]",
      };

      const { error: errInsert } = await supabase.from("encomendas").insert([payloadEncomenda]);
      if (errInsert) {
        console.warn("[PDV Insert Warning] Falhou com payload completo, tentando minimal:", errInsert.message);
        const { itens_detalhes: _id, ...payloadMin } = payloadEncomenda;
        await supabase.from("encomendas").insert([payloadMin]);
      }

      // 2. Se venda imediata, registra receita no módulo financeiro automaticamente
      if (isVendaBalcaoImediata) {
        try {
          await supabase.from("transacoes_financeiras").insert([
            {
              id: crypto.randomUUID(),
              estabelecimento_codigo: activeCode,
              user_id: profile?.ownerUserId || user?.id || null,
              tipo: "receita",
              descricao: `Venda PDV Balcão (${clienteNome || "Cliente"})`,
              categoria: "venda_balcao",
              valor: totalVenda,
              data: hoje,
              forma_pagamento: metodoPagamentoSintese,
              metodo_pagamento: metodoPagamentoSintese,
              status: "concluida",
              observacoes: `Itens: ${resumoItensTexto.slice(0, 150)}`,
            },
          ]);
        } catch (eFin) {
          console.warn("[PDV Financeiro Insert Warning]", eFin);
        }
      }

      // 3. Monta o recibo da venda e abre o modal de sucesso
      setReciboUltimaVenda({
        id: pedidoId,
        data: new Date().toLocaleString("pt-BR"),
        clienteNome: clienteNome || "Cliente Balcão",
        itens: pdvCart,
        total: totalVenda,
        partes: partesPagamento,
        tipoVenda,
        statusFinalPedido,
      });

      setCheckoutModalOpen(false);
      setVendaConcluidaModalOpen(true);
      setPdvCart([]);
      setPartesPagamento([]);
      toast.success(
        isVendaBalcaoImediata
          ? "🎉 Venda concluída e registrada com sucesso no caixa!"
          : "🎉 Encomenda agendada com sucesso!"
      );
    } catch (err: any) {
      console.error("[PDV Finalizar Erro]", err);
      toast.error(`Falha ao registrar venda: ${err?.message || err}`);
    } finally {
      setSalvandoVenda(false);
    }
  };

  const handleNovaVenda = () => {
    setVendaConcluidaModalOpen(false);
    setReciboUltimaVenda(null);
    setPdvCart([]);
    setPartesPagamento([]);
    setClienteNome("Cliente Balcão");
    setClienteWhatsapp("");
    setObservacoesVenda("");
    setTipoVenda("balcao");
  };

  const handleImprimirRecibo = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!isMounted || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <p className="text-xs font-semibold text-slate-300 animate-pulse">Carregando Ponto de Venda (PDV)...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <Store className="w-12 h-12 text-purple-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acesso Restrito ao PDV</h2>
          <p className="text-xs text-slate-400">
            Você precisa estar autenticado como lojista para operar o frente de caixa.
          </p>
          <Link to="/login">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
              Fazer Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. HEADER DO PDV (FRENTE DE CAIXA) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" title="Voltar ao Painel">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline font-bold text-xs">Painel</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xs">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black text-white truncate max-w-[180px] sm:max-w-[280px]">
                    {activeName}
                  </h1>
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold px-1.5 py-0 uppercase tracking-wide">
                    PDV Ativo
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  Código: {activeCode}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400">Total no Caixa:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {formatarMoeda(totalVenda)}
              </span>
            </div>

            {pdvCart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparCarrinho}
                title="Limpar Pedido Atual"
                className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}

            <Button
              size="sm"
              disabled={pdvCart.length === 0}
              onClick={() => setCheckoutModalOpen(true)}
              className="h-8.5 px-3.5 font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>Cobrar ({formatarMoeda(totalVenda)})</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CORPO PRINCIPAL (PRODUTOS NA ESQUERDA + CARRINHO FIXO NA DIREITA) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LADO ESQUERDO: CATÁLOGO DE PRODUTOS & BUSCA RÁPIDA (65%) */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4">
          {/* Barra de Busca e Filtros de Categoria */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar produto por nome, sabor ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-10 pl-10 pr-4 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-purple-500"
              />
            </div>

            {/* Pílulas de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categorias.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={categoriaAtiva === cat ? "default" : "outline"}
                  onClick={() => setCategoriaAtiva(cat)}
                  className={`h-7.5 px-3 rounded-xl text-xs font-bold shrink-0 capitalize transition-all ${
                    categoriaAtiva === cat
                      ? "bg-purple-600 text-white hover:bg-purple-500 border-0 shadow-xs"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {cat === "todas" ? "Todos os Produtos" : cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de Produtos */}
          {carregandoProdutos ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <p className="text-xs">Carregando cardápio...</p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800/80">
              <Store className="w-10 h-10 stroke-[1.5] text-slate-600" />
              <p className="text-xs font-semibold">Nenhum produto encontrado com os filtros atuais.</p>
              {busca && (
                <Button size="sm" variant="outline" onClick={() => setBusca("")} className="h-7 text-xs border-slate-700">
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {produtosFiltrados.map((prod) => {
                const temOpcoes = prod.opcoes && prod.opcoes.length > 0;
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleClicarProduto(prod)}
                    className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-2.5 flex flex-col justify-between transition-all cursor-pointer shadow-xs hover:shadow-purple-950/30 select-none active:scale-[0.98]"
                  >
                    <div>
                      {/* Foto ou Placeholder */}
                      <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-800 mb-2 border border-slate-700/50">
                        {prod.fotoUrl ? (
                          <img
                            src={prod.fotoUrl}
                            alt={prod.nome}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800/60">
                            <Store className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        {temOpcoes && (
                          <Badge className="absolute top-1.5 right-1.5 bg-purple-600 text-white font-bold text-[9px] px-1.5 py-0 border-0 shadow-xs">
                            Opções
                          </Badge>
                        )}
                      </div>

                      {/* Nome e Categoria */}
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block truncate">
                          {prod.categoria}
                        </span>
                        <h3 className="text-xs font-bold text-white leading-snug line-clamp-2" title={prod.nome}>
                          {prod.nome}
                        </h3>
                      </div>
                    </div>

                    {/* Preço e Botão Adicionar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-2">
                      <span className="font-mono text-xs sm:text-sm font-black text-emerald-400">
                        {formatarMoeda(prod.preco)}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* LADO DIREITO: CARRINHO DO PDV FIXO (35%) */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between shadow-2xl">
          {/* Topo do Carrinho */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Itens do Pedido ({totalItensCarrinho})
              </h2>
            </div>
            {pdvCart.length > 0 && (
              <span className="text-[11px] font-mono text-slate-400">
                {pdvCart.length} linha(s)
              </span>
            )}
          </div>

          {/* Lista de Itens do Pedido */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2 divide-y divide-slate-800/60">
            {pdvCart.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                <ShoppingCart className="w-10 h-10 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-400">Carrinho Vazio</p>
                <p className="text-[11px] max-w-[200px] text-slate-500">
                  Clique nos produtos do catálogo ao lado para adicioná-los à venda.
                </p>
              </div>
            ) : (
              pdvCart.map((item, idx) => {
                const subtotalItem =
                  item.opcoesSelecionadas && item.opcoesSelecionadas.length > 0
                    ? item.opcoesSelecionadas.reduce(
                        (s, o) => s + (o.quantidade || 1) * (item.produto.preco + (Number(o.preco_adicional) || 0)),
                        0
                      ) * item.quantidade
                    : (item.precoUnitario ?? item.produto.preco) * item.quantidade;

                return (
                  <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <h4 className="text-xs font-bold text-white break-words leading-tight">
                        {item.produto.nome}
                      </h4>

                      {/* Opção Selecionada Simples */}
                      {item.opcaoSelecionada && (
                        <p className="text-[11px] text-purple-300 font-medium">
                          • {item.opcaoSelecionada.nome}
                          {item.opcaoSelecionada.preco_adicional > 0 && ` (+${formatarMoeda(item.opcaoSelecionada.preco_adicional)})`}
                        </p>
                      )}

                      {/* Multi-opções */}
                      {item.opcoesSelecionadas && item.opcoesSelecionadas.length > 0 && (
                        <div className="space-y-0.5 pt-0.5">
                          {item.opcoesSelecionadas.map((opc, opcIdx) => (
                            <div key={opcIdx} className="text-[10px] text-purple-300 font-medium flex items-center gap-1">
                              <span className="font-bold text-purple-200">{opc.quantidade}x</span>
                              <span>{opc.nome}</span>
                              {opc.preco_adicional > 0 && (
                                <span className="text-slate-400">(+{formatarMoeda(opc.preco_adicional)})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="font-mono text-xs font-black text-emerald-400 pt-0.5">
                        {formatarMoeda(subtotalItem)}
                      </div>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlterarQuantidadeItem(idx, -1)}
                        className="h-6 w-6 p-0 rounded-lg bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-mono text-xs font-extrabold text-white w-5 text-center">
                        {item.quantidade}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlterarQuantidadeItem(idx, 1)}
                        className="h-6 w-6 p-0 rounded-lg bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoverItem(idx)}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé do Carrinho com Totalizador & Botão de Pagamento */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Subtotal dos Itens:</span>
              <span className="font-mono font-bold text-slate-200">{formatarMoeda(totalVenda)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-sm font-black text-white uppercase tracking-wide">Total a Pagar:</span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {formatarMoeda(totalVenda)}
              </span>
            </div>

            <Button
              disabled={pdvCart.length === 0}
              onClick={() => setCheckoutModalOpen(true)}
              className="w-full h-11 font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40"
            >
              <Receipt className="w-4 h-4" />
              <span>Avançar para Pagamento</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DE OPÇÕES DO PRODUTO (QUICK MODAL) */}
      {/* ========================================================================= */}
      {produtoModal && (
        <Dialog open={!!produtoModal} onOpenChange={() => setProdutoModal(null)}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-5 overflow-x-hidden">
            <DialogHeader className="pb-3 border-b border-slate-800">
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                {produtoModal.nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {produtoModal.permite_multiplas_opcoes
                  ? "Selecione as quantidades individuais de cada opção / sabor desejado."
                  : "Selecione uma das opções disponíveis para este item."}
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {produtoModal.permite_multiplas_opcoes ? (
                // Múltipla Escolha com Controles Numéricos
                <div className="space-y-2">
                  {produtoModal.opcoes?.map((opc) => {
                    const qtd = quantidadesOpcoesModal[opc.id] || 0;
                    const adicional = Number(opc.preco_adicional) || 0;
                    return (
                      <div
                        key={opc.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          qtd > 0
                            ? "bg-purple-950/40 border-purple-500/60 shadow-xs"
                            : "bg-slate-850/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                          <p className="text-xs font-bold text-white break-words">{opc.nome}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                              {formatarMoeda(produtoModal.preco + adicional)}
                            </span>
                            {adicional > 0 && (
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1 py-0">
                                +{formatarMoeda(adicional)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setQuantidadesOpcoesModal((prev) => ({
                                ...prev,
                                [opc.id]: Math.max(0, (prev[opc.id] || 0) - 1),
                              }))
                            }
                            className="h-7 w-7 p-0 bg-slate-800 border-slate-700 text-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-mono text-xs font-black text-white w-6 text-center">
                            {qtd}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setQuantidadesOpcoesModal((prev) => ({
                                ...prev,
                                [opc.id]: (prev[opc.id] || 0) + 1,
                              }))
                            }
                            className="h-7 w-7 p-0 bg-slate-800 border-slate-700 text-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Escolha Única com Radio Buttons
                <RadioGroup
                  value={selectedOptionModal?.id}
                  onValueChange={(val) => {
                    const found = produtoModal.opcoes?.find((o) => o.id === val);
                    if (found) setSelectedOptionModal(found);
                  }}
                  className="space-y-2"
                >
                  {produtoModal.opcoes?.map((opc) => {
                    const adicional = Number(opc.preco_adicional) || 0;
                    return (
                      <div
                        key={opc.id}
                        onClick={() => setSelectedOptionModal(opc)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          selectedOptionModal?.id === opc.id
                            ? "bg-purple-950/50 border-purple-500 text-white shadow-xs"
                            : "bg-slate-850/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <RadioGroupItem value={opc.id} id={opc.id} />
                          <Label htmlFor={opc.id} className="text-xs font-bold text-white cursor-pointer break-words">
                            {opc.nome}
                          </Label>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {formatarMoeda(produtoModal.preco + adicional)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProdutoModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarOpcoesModal}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4"
              >
                Adicionar ao Pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL DE CHECKOUT DO PDV (MOTOR DE PAGAMENTOS MISTOS) */}
      {/* ========================================================================= */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <DialogTitle className="text-base font-black text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                Finalizar Venda no Caixa (PDV)
              </span>
              <span className="font-mono text-emerald-400 text-lg">
                {formatarMoeda(totalVenda)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Escolha a modalidade da venda e adicione os pagamentos recebidos no balcão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* TOGGLE: VENDA BALCÃO IMEDIATA VS AGENDAR ENCOMENDA */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Modalidade da Venda:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoVenda("balcao")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    tipoVenda === "balcao"
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Store className="w-4 h-4 text-purple-400" />
                  <span>Venda Balcão (Entregue Agora)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoVenda("agendada")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    tipoVenda === "agendada"
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Agendar Encomenda / Entrega</span>
                </button>
              </div>
            </div>

            {/* DADOS DO CLIENTE / AGENDAMENTO SE APLICÁVEL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">
                  Nome do Cliente {tipoVenda === "agendada" ? "*" : "(Opcional)"}
                </Label>
                <Input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Maria Silva ou Cliente Balcão"
                  className="h-8.5 text-xs bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">WhatsApp (com DDD)</Label>
                <Input
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(aplicarMascaraTelefone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="h-8.5 text-xs bg-slate-900 border-slate-800 text-white font-mono"
                />
              </div>

              {tipoVenda === "agendada" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Data de Entrega *</Label>
                    <Input
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                      className="h-8.5 text-xs bg-slate-900 border-slate-800 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Horário Previsto *</Label>
                    <Input
                      type="time"
                      value={horarioEntrega}
                      onChange={(e) => setHorarioEntrega(e.target.value)}
                      className="h-8.5 text-xs bg-slate-900 border-slate-800 text-white font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            {/* BARRA DE CONCILIAÇÃO FINANCEIRA (PAGAMENTOS MISTOS) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Venda</span>
                  <span className="font-mono text-xs sm:text-sm font-black text-white">
                    {formatarMoeda(totalVenda)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pago Acumulado</span>
                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-400">
                    {formatarMoeda(totalPagoAcumulado)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Restante</span>
                  <span className={`font-mono text-xs sm:text-sm font-black ${saldoRestante > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {formatarMoeda(saldoRestante)}
                  </span>
                </div>
              </div>

              {/* LISTA DE PARTES JÁ ADICIONADAS */}
              {partesPagamento.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Formas de Pagamento Vinculadas ({partesPagamento.length}):
                  </Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {partesPagamento.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-white capitalize">{p.observacao || p.metodo}</span>
                            {p.troco && p.troco > 0 ? (
                              <span className="text-[11px] text-amber-300 font-mono ml-2">
                                (Troco: {formatarMoeda(p.troco)})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-400">
                            {formatarMoeda(p.valor)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoverPartePagamento(p.id)}
                            className="h-5 w-5 p-0 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORMULÁRIO PARA ADICIONAR NOVA PARTE */}
              {saldoRestante > 0 ? (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-purple-300 uppercase tracking-wider">
                      Adicionar Pagamento
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      Falta: <strong className="text-rose-400 font-mono">{formatarMoeda(saldoRestante)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { key: "dinheiro", label: "Dinheiro", icon: Banknote },
                      { key: "pix", label: "Pix", icon: QrCode },
                      { key: "cartao_credito", label: "Crédito", icon: CreditCard },
                      { key: "cartao_debito", label: "Débito", icon: CreditCard },
                      { key: "outro", label: "Outro", icon: DollarSign },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = metodoAtual === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setMetodoAtual(m.key as any)}
                          className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                            isSel
                              ? "bg-purple-600 text-white border-purple-500 shadow-xs"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Valor Desta Parcela (R$)</Label>
                      <Input
                        value={valorParteInput}
                        onChange={(e) => setValorParteInput(aplicarMascaraMoedaInput(e.target.value))}
                        className="h-8.5 text-xs bg-slate-950 border-slate-800 text-white font-mono font-bold"
                      />
                    </div>

                    {metodoAtual === "dinheiro" && (
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Valor Recebido do Cliente (R$)</Label>
                        <Input
                          value={valorRecebidoInput}
                          onChange={(e) => setValorRecebidoInput(aplicarMascaraMoedaInput(e.target.value))}
                          className="h-8.5 text-xs bg-slate-950 border-slate-800 text-white font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Exibição Destacada do Troco */}
                  {metodoAtual === "dinheiro" && trocoCalculado > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        Troco a Devolver:
                      </span>
                      <span className="font-mono text-sm font-black text-amber-300">
                        {formatarMoeda(trocoCalculado)}
                      </span>
                    </div>
                  )}

                  {/* Bloco Pix Dinâmico no Checkout do PDV */}
                  {metodoAtual === "pix" && (
                    <div className="space-y-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={gerandoPixParte}
                        onClick={handleGerarPixParte}
                        className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1.5" />
                        {gerandoPixParte ? "Gerando QR Code..." : `Gerar QR Code Pix de ${valorParteInput ? `R$ ${valorParteInput}` : "Saldo"}`}
                      </Button>

                      {pixParteAtual?.qrBase64 && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/40 flex flex-col items-center justify-center space-y-2.5">
                          <img
                            src={pixParteAtual.qrBase64.startsWith("data:") ? pixParteAtual.qrBase64 : `data:image/png;base64,${pixParteAtual.qrBase64}`}
                            alt="QR Code Pix PDV"
                            className="w-44 h-44 object-contain rounded-lg bg-white p-1"
                          />
                          <p className="text-[11px] font-medium text-slate-300 text-center">
                            Apresente a tela para o cliente escanear no balcão
                          </p>

                          {/* Botão de Fallback com Alerta Anti-Fraude */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAlertaPixModalOpen(true)}
                            className="w-full h-8 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs flex items-center justify-center gap-1.5 mt-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Forçar Confirmação Manual</span>
                          </Button>
                        </div>
                      )}

                      {pixParteAtual?.qrCode && !pixParteAtual?.qrBase64 && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/40 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Input
                              readOnly
                              value={pixParteAtual.qrCode}
                              className="font-mono text-[10px] h-8 bg-slate-900 border-slate-800 text-slate-200"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (navigator.clipboard && pixParteAtual.qrCode) {
                                  navigator.clipboard.writeText(pixParteAtual.qrCode);
                                  toast.success("Código Pix Copiado!");
                                }
                              }}
                              className="h-8 px-2 text-xs bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAlertaPixModalOpen(true)}
                            className="w-full h-8 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Forçar Confirmação Manual</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {metodoAtual !== "pix" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarPartePagamento}
                      className="w-full h-8.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Esta Parcela
                    </Button>
                  )}

                  {metodoAtual === "pix" && !pixParteAtual && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAlertaPixModalOpen(true)}
                      className="w-full h-8.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Confirmar Pix Recebido
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Total da venda 100% coberto! Pronto para finalizar.</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCheckoutModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Voltar aos Produtos
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={salvandoVenda || totalPagoAcumulado < totalVenda}
              onClick={handleFinalizarVendaPdv}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 h-9 shadow-md disabled:opacity-40"
            >
              {salvandoVenda ? "Gravando Venda..." : "Confirmar e Gravar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. MODAL DE RECIBO / VENDA CONCLUÍDA */}
      {/* ========================================================================= */}
      {reciboUltimaVenda && (
        <Dialog open={vendaConcluidaModalOpen} onOpenChange={setVendaConcluidaModalOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-5">
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-white">Venda Concluída com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  {reciboUltimaVenda.tipoVenda === "balcao"
                    ? "Registrada como entregue no balcão e receita computada no caixa."
                    : "Registrada na aba 'Pedidos' para produção e entrega agendada."}
                </p>
              </div>

              {/* Recibo Simulado de Balcão */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-xs space-y-2">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{activeName}</span>
                  <span>{reciboUltimaVenda.data}</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="text-slate-300 font-bold">Cliente: {reciboUltimaVenda.clienteNome}</p>
                  <div className="divide-y divide-slate-850 pt-1">
                    {reciboUltimaVenda.itens.map((it: ItemCarrinhoPdv, i: number) => (
                      <div key={i} className="py-1 flex justify-between text-slate-300">
                        <span className="truncate max-w-[220px]">
                          {it.quantidade}x {it.produto.nome}
                        </span>
                        <span className="font-bold">
                          {formatarMoeda((it.precoUnitario || it.produto.preco) * it.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-emerald-400 text-xs">
                  <span>TOTAL PAGO:</span>
                  <span>{formatarMoeda(reciboUltimaVenda.total)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImprimirRecibo}
                className="text-xs bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimir Cupom
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleNovaVenda}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Iniciar Nova Venda
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE ALERTA ANTI-FRAUDE PIX */}
      {/* ========================================================================= */}
      <Dialog open={alertaPixModalOpen} onOpenChange={setAlertaPixModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-amber-500/50 text-white p-5 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-amber-500/20">
            <DialogTitle className="text-base font-black text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              Alerta de Segurança Anti-Fraude
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed font-semibold">
              ATENÇÃO: O Mercado Pago ainda não confirmou este pagamento automaticamente. Se o cliente afirmar que pagou, ABRA O APLICATIVO DO SEU BANCO no celular e confira o extrato ANTES de liberar o pedido. Deseja confirmar o recebimento?
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAlertaPixModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAlertaPixModalOpen(false);
                handleAdicionarPartePagamento();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 shadow-md"
            >
              Sim, confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

