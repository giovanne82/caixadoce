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
  History,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  Edit,
  Eye,
  RefreshCw,
  FileText,
  X,
  Scale,
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

function getValidUuid(userId?: string | null, ownerUserId?: string | null): string {
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return userId;
  }
  if (ownerUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerUserId)) {
    return ownerUserId;
  }
  return "00000000-0000-0000-0000-000000000000";
}

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
  vendePorPeso?: boolean;
  pesoGramas?: number;
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

export interface CaixaTurno {
  data: string;
  status: "aberto" | "fechado";
  horaAbertura: string;
  valorAbertura: number;
  operador: string;
  horaFechamento?: string;
}

export function PdvView() {
  const { user, profile, isMounted, authLoading } = useAuth();
  const navigate = useNavigate();

  const activeCode = profile?.establishmentCode || "";
  const activeName = profile?.establishmentName || "Minha Confeitaria";
  const hoje = useMemo(() => new Date().toISOString().split("T")[0], []);

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

  // Modal de Venda por Peso (Balança / kg)
  const [produtoPesoModal, setProdutoPesoModal] = useState<ProdutoCardapio | null>(null);
  const [pesoGramasInput, setPesoGramasInput] = useState<string>("");
  const [valorDinheiroInput, setValorDinheiroInput] = useState<string>("");

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

  // =========================================================================
  // GESTÃO DE CAIXA (ABERTURA, SANGRIA, REFORÇO)
  // =========================================================================
  const [caixaAtual, setCaixaAtual] = useState<CaixaTurno | null>(null);
  const [modalAberturaCaixaOpen, setModalAberturaCaixaOpen] = useState(false);
  const [modalFechamentoCaixaOpen, setModalFechamentoCaixaOpen] = useState(false);
  const [valorAberturaInput, setValorAberturaInput] = useState("0,00");
  const [modalGestaoCaixaOpen, setModalGestaoCaixaOpen] = useState(false);
  const [abaGestaoCaixa, setAbaGestaoCaixa] = useState<"resumo" | "sangria" | "reforco" | "movimentacoes">("resumo");
  const [valorMovimentacaoInput, setValorMovimentacaoInput] = useState("");
  const [motivoMovimentacaoInput, setMotivoMovimentacaoInput] = useState("");
  const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);
  const [movimentacoesHoje, setMovimentacoesHoje] = useState<any[]>([]);

  // =========================================================================
  // HISTÓRICO DE ÚLTIMAS VENDAS (SINCRONIZADO)
  // =========================================================================
  const [modalUltimasVendasOpen, setModalUltimasVendasOpen] = useState(false);
  const [vendasRecentes, setVendasRecentes] = useState<any[]>([]);
  const [carregandoVendas, setCarregandoVendas] = useState(false);
  const [modalEditarVendaOpen, setModalEditarVendaOpen] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState<any | null>(null);
  const [salvandoEdicaoVenda, setSalvandoEdicaoVenda] = useState(false);

  // 1. Carregamento dos Produtos do Estabelecimento (Correção Bug 400 Bad Request)
  useEffect(() => {
    if (!activeCode) return;

    async function carregarCatalogo() {
      setCarregandoProdutos(true);
      try {
        // Carrega dados da loja (para obter MP tokens e Pix Key) de forma segura sem colunas inexistentes
        const { data: estRow } = await supabase
          .from("estabelecimentos")
          .select("*")
          .or(`codigo.eq.${activeCode},codigo.eq.${activeCode.toLowerCase()}`)
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
            estabelecimentoCodigo: activeCode,
            nome: p.nome,
            categoria: p.categoria || "Geral",
            preco: Number(p.preco) || 0,
            descricao: p.descricao || "",
            fotoUrl: p.foto_url || (Array.isArray(p.galeria_fotos) && p.galeria_fotos[0]) || "",
            galeria_fotos: Array.isArray(p.galeria_fotos) ? p.galeria_fotos : (p.foto_url ? [p.foto_url] : []),
            serve_pessoas: p.serve_pessoas !== null && p.serve_pessoas !== undefined ? Number(p.serve_pessoas) : undefined,
            peso_detalhe: p.peso_detalhe || undefined,
            ativo: p.ativo !== false,
            opcoes: p.opcoes || [],
            permite_multiplas_opcoes: Boolean(p.permite_multiplas_opcoes),
            vende_por_peso: Boolean(p.vende_por_peso || p.unidade_venda === "kg"),
            unidade_venda: (p.unidade_venda || (p.vende_por_peso ? "kg" : "un")) as "un" | "kg",
            visivel_cardapio_digital: p.visivel_cardapio_digital === false || p.visivel_cardapio_digital === "false" ? false : true,
            visivel_pdv: p.visivel_pdv === false || p.visivel_pdv === "false" ? false : true,
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

  // Produtos Filtrados (respeitando visivel_pdv !== false)
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoriaAtiva === "todas" || p.categoria === categoriaAtiva;
      const matchBusca =
        !busca.trim() ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase())) ||
        (p.categoria && p.categoria.toLowerCase().includes(busca.toLowerCase()));
      const visivelNoPdv = p.visivel_pdv !== false;
      return matchCat && matchBusca && p.ativo !== false && (p as any).is_active !== false && visivelNoPdv;
    });
  }, [produtos, categoriaAtiva, busca]);

  // Cálculos do Carrinho
  const totalVenda = useMemo(() => {
    return pdvCart.reduce((acc, item) => {
      if (item.vendePorPeso) {
        return acc + item.quantidade * (item.precoUnitario ?? item.produto.preco);
      }
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
      if (it.vendePorPeso) {
        return acc + 1;
      }
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
  // ADIÇÃO ÁGIL AO CARRINHO DO PDV & VENDA POR PESO
  // ==========================================
  const handleClicarProduto = (produto: ProdutoCardapio) => {
    // 1. Se for produto vendido por peso (R$/kg), abre modal de pesagem/balança
    if (produto.vende_por_peso || produto.unidade_venda === "kg") {
      setProdutoPesoModal(produto);
      setPesoGramasInput("");
      setValorDinheiroInput("");
      return;
    }

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
          (it) => it.produto.id === produto.id && !it.opcaoSelecionada && (!it.opcoesSelecionadas || it.opcoesSelecionadas.length === 0) && !it.vendePorPeso
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

  // Funções da Venda por Peso (Dual Input Gramas <-> Reais)
  const handlePesoGramasChange = (val: string) => {
    const limpo = val.replace(/[^0-9.]/g, "");
    setPesoGramasInput(limpo);
    const g = parseFloat(limpo) || 0;
    if (produtoPesoModal && g > 0) {
      const v = (g / 1000) * produtoPesoModal.preco;
      setValorDinheiroInput(v.toFixed(2).replace(".", ","));
    } else {
      setValorDinheiroInput("");
    }
  };

  const handleValorDinheiroChange = (val: string) => {
    const formatado = aplicarMascaraMoedaInput(val);
    setValorDinheiroInput(formatado);
    const v = converterMoedaInputParaNumero(formatado);
    if (produtoPesoModal && produtoPesoModal.preco > 0 && v > 0) {
      const g = (v / produtoPesoModal.preco) * 1000;
      setPesoGramasInput(Math.round(g).toString());
    } else {
      setPesoGramasInput("");
    }
  };

  const handleSetQuickPeso = (gramas: number) => {
    setPesoGramasInput(gramas.toString());
    if (produtoPesoModal) {
      const v = (gramas / 1000) * produtoPesoModal.preco;
      setValorDinheiroInput(v.toFixed(2).replace(".", ","));
    }
  };

  const handleConfirmarPesoModal = () => {
    if (!produtoPesoModal) return;
    const g = parseFloat(pesoGramasInput) || 0;
    if (g <= 0) {
      toast.error("Informe um peso válido em gramas ou o valor em reais.");
      return;
    }
    const qtdKg = Number((g / 1000).toFixed(3));

    setPdvCart((prev) => [
      ...prev,
      {
        produto: produtoPesoModal,
        quantidade: qtdKg,
        precoUnitario: produtoPesoModal.preco,
        vendePorPeso: true,
        pesoGramas: g,
      },
    ]);

    setProdutoPesoModal(null);
    setPesoGramasInput("");
    setValorDinheiroInput("");
    toast.success(
      `${produtoPesoModal.nome} (${g >= 1000 ? `${(g / 1000).toFixed(3)} kg` : `${g}g`}) adicionado!`,
      { duration: 1500 }
    );
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

  // =========================================================================
  // GESTÃO DE CAIXA: CARREGAMENTO, ABERTURA, SANGRIA, REFORÇO E FECHAMENTO
  // =========================================================================
  const carregarDadosCaixaETurnos = async () => {
    if (!activeCode) return;
    try {
      // 1. Carrega movimentações de hoje de transacoes_financeiras
      const { data: transacoesHoje } = await supabase
        .from("transacoes_financeiras")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .eq("data", hoje);

      if (transacoesHoje) {
        setMovimentacoesHoje(transacoesHoje);
      }

      // 2. Carrega vendas recentes de encomendas
      const { data: vendasData } = await supabase
        .from("encomendas")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .order("created_at", { ascending: false })
        .limit(50);

      if (vendasData) {
        setVendasRecentes(vendasData);
      }
    } catch (e) {
      console.warn("[PDV] Erro ao carregar dados do caixa e vendas:", e);
    }
  };

  // Verificação inicial de abertura de caixa ao abrir o PDV (Sem abertura automática de modal)
  useEffect(() => {
    if (!activeCode) return;

    const storedCaixa = localStorage.getItem(`caixadoce_caixa_${activeCode}_${hoje}`);
    if (storedCaixa) {
      try {
        const parsed: CaixaTurno = JSON.parse(storedCaixa);
        setCaixaAtual(parsed);
      } catch {
        setCaixaAtual(null);
      }
    } else {
      setCaixaAtual(null);
    }

    carregarDadosCaixaETurnos();
  }, [activeCode, hoje]);

  // Abertura de Caixa
  const handleConfirmarAberturaCaixa = async () => {
    const valorNum = converterMoedaInputParaNumero(valorAberturaInput);
    const horaAgora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const operadorNome = profile?.responsavel || (profile as any)?.nome || user?.email?.split("@")[0] || "Operador";

    const novoCaixa: CaixaTurno = {
      data: hoje,
      status: "aberto",
      horaAbertura: horaAgora,
      valorAbertura: valorNum,
      operador: operadorNome,
    };

    setCaixaAtual(novoCaixa);
    try {
      localStorage.setItem(`caixadoce_caixa_${activeCode}_${hoje}`, JSON.stringify(novoCaixa));
    } catch {}

    // Grava abertura na tabela transacoes_financeiras se houver valor inicial informado
    if (valorNum > 0) {
      try {
        const finUserId = getValidUuid(user?.id, profile?.ownerUserId);
        const payloadFin = {
          estabelecimento_codigo: activeCode,
          user_id: finUserId,
          descricao: `Abertura de Caixa (Fundo de Troco Inicial)`,
          categoria: "abertura_caixa",
          tipo: "receita",
          valor: valorNum,
          metodo_pagamento: "dinheiro",
          status: "concluida",
          cliente_ou_fornecedor: "Operador Caixa",
          data: hoje,
          origem: "PDV",
        };
        await supabase.from("transacoes_financeiras").insert([payloadFin]);
      } catch (errFin) {
        console.warn("[PDV Abertura Financeiro Error]", errFin);
      }
    }

    setModalAberturaCaixaOpen(false);
    toast.success(`🎉 Caixa aberto com sucesso! Fundo inicial: ${formatarMoeda(valorNum)}`);
    carregarDadosCaixaETurnos();
  };

  // Sangria e Reforço
  const handleRegistrarMovimentacao = async (tipo: "sangria" | "reforco") => {
    const valorNum = converterMoedaInputParaNumero(valorMovimentacaoInput);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    const isSangria = tipo === "sangria";
    const motivoPadrao = isSangria ? "Retirada de Dinheiro" : "Aporte de Troco";
    const motivoFinal = motivoMovimentacaoInput.trim() || motivoPadrao;

    setSalvandoMovimentacao(true);
    try {
      const finUserId = getValidUuid(user?.id, profile?.ownerUserId);
      const payloadFin = {
        estabelecimento_codigo: activeCode,
        user_id: finUserId,
        descricao: `${isSangria ? "Sangria" : "Reforço"} de Caixa: ${motivoFinal}`,
        categoria: isSangria ? "sangria" : "reforco",
        tipo: isSangria ? "despesa" : "receita",
        valor: valorNum,
        metodo_pagamento: "dinheiro",
        status: "concluida",
        cliente_ou_fornecedor: isSangria ? "Sangria Caixa" : "Reforço Caixa",
        data: hoje,
        origem: "PDV",
      };

      const { error: errInsert } = await supabase.from("transacoes_financeiras").insert([payloadFin]);
      if (errInsert) {
        console.warn("[PDV Movimentação Fallback]", errInsert.message);
        // Fallback minimal
        await supabase.from("transacoes_financeiras").insert([{
          estabelecimento_codigo: activeCode,
          user_id: finUserId,
          descricao: payloadFin.descricao,
          categoria: payloadFin.categoria,
          tipo: payloadFin.tipo,
          valor: valorNum,
          status: "concluida",
          data: hoje,
        }]);
      }

      setValorMovimentacaoInput("");
      setMotivoMovimentacaoInput("");
      setAbaGestaoCaixa("resumo");
      toast.success(
        isSangria
          ? `💸 Sangria de ${formatarMoeda(valorNum)} registrada com sucesso!`
          : `💵 Reforço de ${formatarMoeda(valorNum)} registrado com sucesso!`
      );
      await carregarDadosCaixaETurnos();
    } catch (err: any) {
      toast.error(`Falha ao registrar movimentação: ${err?.message || err}`);
    } finally {
      setSalvandoMovimentacao(false);
    }
  };

  // Trava de Venda (Verifica estado do Caixa)
  const handleVerificarECobrar = () => {
    if (!caixaAtual || caixaAtual.status !== "aberto") {
      toast.error("O caixa está FECHADO. Clique em 'Abrir Caixa' para autorizar e registrar vendas.");
      setModalAberturaCaixaOpen(true);
      return;
    }
    setCheckoutModalOpen(true);
  };

  // Abrir Modal de Relatório de Fechamento de Caixa
  const handleFecharCaixa = () => {
    setModalGestaoCaixaOpen(false);
    setModalFechamentoCaixaOpen(true);
  };

  // Confirmar e Gravar Fechamento de Caixa
  const handleConfirmarFechamentoCaixa = async () => {
    const horaAgora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const caixaFechado: CaixaTurno = {
      ...caixaAtual,
      data: hoje,
      status: "fechado",
      horaFechamento: horaAgora,
    };

    setCaixaAtual(caixaFechado);
    try {
      localStorage.setItem(`caixadoce_caixa_${activeCode}_${hoje}`, JSON.stringify(caixaFechado));
    } catch {}

    // Registra fechamento na tabela transacoes_financeiras
    try {
      const finUserId = getValidUuid(user?.id, profile?.ownerUserId);
      const payloadFin = {
        estabelecimento_codigo: activeCode,
        user_id: finUserId,
        descricao: `Fechamento de Caixa (Turno) - Total Gaveta: ${formatarMoeda(resumoFinanceiroCaixa.saldoDinheiroGaveta)} (Vendas: ${formatarMoeda(resumoFinanceiroCaixa.totalVendasGeral)})`,
        categoria: "fechamento_caixa",
        tipo: "despesa",
        valor: resumoFinanceiroCaixa.saldoDinheiroGaveta,
        metodo_pagamento: "dinheiro",
        status: "concluida",
        cliente_ou_fornecedor: "Operador Caixa",
        data: hoje,
        origem: "PDV",
      };
      await supabase.from("transacoes_financeiras").insert([payloadFin]);
    } catch (errFin) {
      console.warn("[PDV Fechamento Financeiro Error]", errFin);
    }

    setValorAberturaInput("0,00");
    setModalFechamentoCaixaOpen(false);
    setModalGestaoCaixaOpen(false);
    toast.success("🔒 Caixa fechado com sucesso! Para realizar novas vendas, abra um novo turno.");
  };

  // Cálculo Dinâmico do Resumo Financeiro da Gaveta & Métodos
  const resumoFinanceiroCaixa = useMemo(() => {
    const valorAbertura = Number(caixaAtual?.valorAbertura) || 0;

    let totalVendasDinheiro = 0;
    let totalVendasPix = 0;
    let totalVendasCredito = 0;
    let totalVendasDebito = 0;
    let totalVendasGeral = 0;

    for (const v of vendasRecentes) {
      const dataVenda = v.created_at ? v.created_at.split("T")[0] : v.data_entrega;
      const isHoje = !dataVenda || dataVenda === hoje;
      if (!isHoje) continue;

      const total = Number(v.valor_total || v.total_amount || 0) || 0;
      totalVendasGeral += total;

      const historico = Array.isArray(v.historico_pagamentos) ? v.historico_pagamentos : [];
      if (historico.length > 0) {
        for (const p of historico) {
          const val = Number(p.valor || p.amount || 0) || 0;
          const met = String(p.metodo || "").toLowerCase();
          if (met === "dinheiro") totalVendasDinheiro += val;
          else if (met === "pix") totalVendasPix += val;
          else if (met.includes("debito") || met === "cartao_debito") totalVendasDebito += val;
          else if (met.includes("credito") || met === "cartao_credito") totalVendasCredito += val;
          else if (met.includes("cartao") || met.includes("card")) totalVendasCredito += val;
          else totalVendasDinheiro += val;
        }
      } else {
        const met = String(v.metodo_pagamento || "").toLowerCase();
        if (met === "dinheiro") totalVendasDinheiro += total;
        else if (met === "pix") totalVendasPix += total;
        else if (met.includes("debito") || met === "cartao_debito") totalVendasDebito += total;
        else if (met.includes("credito") || met === "cartao_credito") totalVendasCredito += total;
        else if (met.includes("cartao") || met.includes("card")) totalVendasCredito += total;
        else totalVendasDinheiro += total;
      }
    }

    let totalReforcos = 0;
    let totalSangrias = 0;

    for (const m of movimentacoesHoje) {
      const cat = String(m.categoria || "").toLowerCase();
      const desc = String(m.descricao || "").toLowerCase();
      const val = Number(m.valor) || 0;

      if (cat === "reforco" || desc.includes("reforço") || desc.includes("reforco")) {
        totalReforcos += val;
      } else if (cat === "sangria" || desc.includes("sangria")) {
        totalSangrias += val;
      }
    }

    const saldoDinheiroGaveta = Math.max(0, valorAbertura + totalVendasDinheiro + totalReforcos - totalSangrias);

    return {
      valorAbertura,
      totalVendasDinheiro,
      totalVendasPix,
      totalVendasCredito,
      totalVendasDebito,
      totalVendasCartao: totalVendasCredito + totalVendasDebito,
      totalVendasGeral,
      totalReforcos,
      totalSangrias,
      saldoDinheiroGaveta,
    };
  }, [caixaAtual, vendasRecentes, movimentacoesHoje, hoje]);

  // =========================================================================
  // HISTÓRICO DE ÚLTIMAS VENDAS: RE-BUSCA, EDIÇÃO, DELEÇÃO E ESTORNO
  // =========================================================================
  const handleAbrirUltimasVendas = async () => {
    setCarregandoVendas(true);
    setModalUltimasVendasOpen(true);
    try {
      const { data, error } = await supabase
        .from("encomendas")
        .select("*")
        .eq("estabelecimento_codigo", activeCode)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setVendasRecentes(data);
      }
    } catch (e) {
      console.warn("Erro ao buscar vendas recentes:", e);
    } finally {
      setCarregandoVendas(false);
    }
  };

  // Exclusão com Sincronização e Estorno Automático em transacoes_financeiras
  const handleExcluirVenda = async (vendaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda? O lançamento financeiro correspondente será estornado para manter o caixa sincronizado.")) {
      return;
    }
    try {
      // 1. Exclui da tabela encomendas
      const { error: errEnc } = await supabase
        .from("encomendas")
        .delete()
        .eq("id", vendaId)
        .eq("estabelecimento_codigo", activeCode);

      if (errEnc) {
        console.warn("[PDV Excluir Encomenda Warning]", errEnc);
      }

      // 2. Exclui/Estorna da tabela transacoes_financeiras para não furar o caixa
      try {
        await supabase
          .from("transacoes_financeiras")
          .delete()
          .eq("estabelecimento_codigo", activeCode)
          .or(`cliente_ou_fornecedor.eq.PDV-${vendaId},descricao.ilike.%${vendaId}%,descricao.ilike.%${vendaId.slice(0, 8)}%`);
      } catch (errFin) {
        console.warn("[PDV Excluir Transacao Warning]", errFin);
      }

      setVendasRecentes((prev) => prev.filter((v) => v.id !== vendaId));
      toast.success("Venda e lançamento financeiro excluídos com sucesso!");
      await carregarDadosCaixaETurnos();
    } catch (err: any) {
      toast.error(`Erro ao excluir venda: ${err?.message || err}`);
    }
  };

  // Edição de Venda
  const handleAbrirEdicaoVenda = (venda: any) => {
    setVendaEmEdicao({
      id: venda.id,
      cliente_nome: venda.cliente_nome || "",
      cliente_whatsapp: venda.cliente_whatsapp || "",
      status: venda.status || "entregue",
      status_pagamento: venda.status_pagamento || "pago_integral",
      observacoes: venda.observacoes || "",
      valor_total: venda.valor_total || venda.total_amount || 0,
      itens: venda.itens || "",
    });
    setModalEditarVendaOpen(true);
  };

  const handleSalvarEdicaoVenda = async () => {
    if (!vendaEmEdicao) return;
    setSalvandoEdicaoVenda(true);
    try {
      const { error } = await supabase
        .from("encomendas")
        .update({
          cliente_nome: vendaEmEdicao.cliente_nome,
          cliente_whatsapp: vendaEmEdicao.cliente_whatsapp,
          status: vendaEmEdicao.status,
          status_pagamento: vendaEmEdicao.status_pagamento,
          observacoes: vendaEmEdicao.observacoes,
        })
        .eq("id", vendaEmEdicao.id)
        .eq("estabelecimento_codigo", activeCode);

      if (error) throw error;

      setVendasRecentes((prev) =>
        prev.map((v) => (v.id === vendaEmEdicao.id ? { ...v, ...vendaEmEdicao } : v))
      );
      setModalEditarVendaOpen(false);
      toast.success("Venda atualizada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao atualizar venda: ${err?.message || err}`);
    } finally {
      setSalvandoEdicaoVenda(false);
    }
  };

  // Reimpressão de Cupom a partir do Histórico
  const handleReimprimirCupom = (venda: any) => {
    let itensFormatados: ItemCarrinhoPdv[] = [];
    if (Array.isArray(venda.itens_detalhes) && venda.itens_detalhes.length > 0) {
      itensFormatados = venda.itens_detalhes.map((it: any) => ({
        produto: {
          id: it.id,
          estabelecimentoCodigo: activeCode,
          nome: it.nome,
          categoria: it.categoria || "Geral",
          descricao: "",
          fotoUrl: "",
          preco: Number(it.precoUnitario) || 0,
          ativo: true,
        },
        quantidade: it.quantidade || 1,
        precoUnitario: Number(it.precoUnitario) || 0,
        opcoesSelecionadas: it.opcoes_selecionadas,
      }));
    } else {
      itensFormatados = [
        {
          produto: {
            id: "1",
            estabelecimentoCodigo: activeCode,
            nome: venda.itens || "Itens do Pedido",
            categoria: "Geral",
            descricao: "",
            fotoUrl: "",
            preco: Number(venda.valor_total || venda.total_amount || 0),
            ativo: true,
          },
          quantidade: 1,
          precoUnitario: Number(venda.valor_total || venda.total_amount || 0),
        },
      ];
    }

    setReciboUltimaVenda({
      id: venda.id,
      data: venda.created_at ? new Date(venda.created_at).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR"),
      clienteNome: venda.cliente_nome || "Cliente Balcão",
      itens: itensFormatados,
      total: Number(venda.valor_total || venda.total_amount || 0),
      tipoVenda: venda.tipo_entrega === "balcao" ? "balcao" : "agendada",
      statusFinalPedido: venda.status,
    });
    setVendaConcluidaModalOpen(true);
  };

  // ==========================================
  // FINALIZAÇÃO E GRAVAÇÃO DA VENDA NO BANCO
  // ==========================================
  const handleFinalizarVendaPdv = async () => {
    if (!caixaAtual || caixaAtual.status !== "aberto") {
      toast.error("O caixa está FECHADO. Você precisa abrir o caixa para realizar vendas.");
      setModalAberturaCaixaOpen(true);
      return;
    }

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
      const hojeStr = nowIso.split("T")[0];

      // Formatação do resumo de itens
      const resumoItensTexto = pdvCart
        .map((it) => {
          if (it.vendePorPeso) {
            const pesoLabel = it.pesoGramas
              ? (it.pesoGramas >= 1000 ? `${(it.pesoGramas / 1000).toFixed(3)}kg` : `${it.pesoGramas}g`)
              : `${it.quantidade}kg`;
            return `• ${it.produto.nome} (${pesoLabel} a ${formatarMoeda(it.precoUnitario || it.produto.preco)}/kg)`;
          }
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
        subtotal: it.vendePorPeso
          ? it.quantidade * (it.precoUnitario || it.produto.preco)
          : it.opcoesSelecionadas && it.opcoesSelecionadas.length > 0
          ? it.opcoesSelecionadas.reduce((s, o) => s + (o.quantidade || 1) * (it.produto.preco + (Number(o.preco_adicional) || 0)), 0)
          : (it.precoUnitario || it.produto.preco) * it.quantidade,
        opcaoNome: it.opcaoSelecionada?.nome,
        opcoes_selecionadas: it.opcoesSelecionadas || (it.opcaoSelecionada ? [it.opcaoSelecionada] : []),
        vende_por_peso: it.vendePorPeso,
        peso_gramas: it.pesoGramas,
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
        data: hojeStr,
        valor: p.valor,
        metodo: p.metodo,
        valor_recebido: p.valorRecebido,
        troco: p.troco,
        observacao: p.observacao || `Pagamento PDV (${p.metodo})`,
      }));

      const isVendaBalcaoImediata = tipoVenda === "balcao";
      const statusFinalPedido = isVendaBalcaoImediata ? "entregue" : "pendente";
      const finUserId = getValidUuid(user?.id, profile?.ownerUserId);

      // 1. Gravação em 'encomendas'
      const payloadEncomenda: Record<string, any> = {
        id: pedidoId,
        estabelecimento_codigo: activeCode,
        user_id: finUserId,
        cliente_nome: clienteNome.trim() || "Cliente Balcão",
        cliente_whatsapp: clienteWhatsapp.trim() || "",
        data_entrega: isVendaBalcaoImediata ? hojeStr : dataEntrega,
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

      // 2. Se venda imediata, registra receita no módulo financeiro (transacoes_financeiras)
      if (isVendaBalcaoImediata) {
        try {
          const payloadFin: any = {
            estabelecimento_codigo: activeCode,
            user_id: finUserId,
            descricao: `Venda PDV #${pedidoId.slice(0, 8)} (${clienteNome.trim() || "Cliente Balcão"})`,
            categoria: "venda_balcao",
            tipo: "receita",
            valor: totalVenda,
            metodo_pagamento: metodoPagamentoSintese,
            status: "concluida",
            cliente_ou_fornecedor: `PDV-${pedidoId}`,
            data: hojeStr,
            origem: "PDV",
          };

          const { error: errFin } = await supabase.from("transacoes_financeiras").insert([payloadFin]);
          if (errFin) {
            console.warn("[PDV Financeiro Insert Fallback]", errFin.message);
            const payloadFinMin = {
              estabelecimento_codigo: activeCode,
              user_id: finUserId,
              descricao: payloadFin.descricao,
              categoria: "venda_balcao",
              tipo: "receita",
              valor: totalVenda,
              status: "concluida",
              data: hojeStr,
            };
            await supabase.from("transacoes_financeiras").insert([payloadFinMin]);
          }
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
      await carregarDadosCaixaETurnos();
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
      {/* 1. HEADER DO PDV (FRENTE DE CAIXA PROFISSIONAL) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 shadow-md">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Lado Esquerdo: Voltar ao Painel & Identificação do Estabelecimento */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/" title="Voltar ao Painel" className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1 font-bold text-xs">Painel</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-2 sm:pl-3 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xs">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[110px] sm:max-w-[200px] md:max-w-[260px]">
                    {activeName}
                  </h1>
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0 uppercase tracking-wide shrink-0">
                    PDV
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-mono hidden md:block">
                  Código: {activeCode}
                </p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas do Cabeçalho */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão de Gestão de Caixa & Fechamento */}
            {caixaAtual?.status === "aberto" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalGestaoCaixaOpen(true)}
                  className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl border border-emerald-500/40 bg-slate-800/90 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <span className="hidden md:inline">Caixa: </span>
                    <span className="font-mono font-bold text-white text-[11px] sm:text-xs">
                      {formatarMoeda(resumoFinanceiroCaixa.saldoDinheiroGaveta)}
                    </span>
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalFechamentoCaixaOpen(true)}
                  className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span className="hidden sm:inline">Fechar Caixa</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalAberturaCaixaOpen(true)}
                className="h-8 sm:h-8.5 px-3 sm:px-4 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-xs font-black flex items-center gap-1.5 shadow-xs shrink-0 animate-pulse"
              >
                <Unlock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Abrir Caixa</span>
              </Button>
            )}

            {/* Botão de Últimas Vendas */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAbrirUltimasVendas}
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl bg-slate-800/90 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <History className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="hidden md:inline">Últimas Vendas</span>
              {vendasRecentes.length > 0 && (
                <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none shrink-0">
                  {vendasRecentes.length}
                </span>
              )}
            </Button>

            {/* Limpar Pedido (visível apenas quando há itens) */}
            {pdvCart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparCarrinho}
                title="Limpar Pedido Atual"
                className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold rounded-xl shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline ml-1">Limpar</span>
              </Button>
            )}

            {/* Cobrar (Desktop only no header: hidden lg:flex) */}
            <Button
              size="sm"
              disabled={pdvCart.length === 0}
              onClick={handleVerificarECobrar}
              className="hidden lg:flex h-8.5 px-3.5 font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40 shrink-0"
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-20 lg:pb-0">
        {/* LADO ESQUERDO: CATÁLOGO DE PRODUTOS & BUSCA RÁPIDA (65%) */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4">
          {/* Alerta de Caixa Fechado */}
          {(!caixaAtual || caixaAtual.status !== "aberto") && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">Caixa Fechado (Turno Inativo)</p>
                  <p className="text-[11px] text-amber-300/80">Abra o caixa informando o fundo de troco para autorizar a realização de vendas.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setModalAberturaCaixaOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-8.5 px-3.5 rounded-xl shrink-0 shadow-md flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Abrir Caixa
              </Button>
            </div>
          )}

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
                        {(prod.vende_por_peso || prod.unidade_venda === "kg") && (
                          <Badge className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0 border-0 shadow-xs flex items-center gap-0.5">
                            <Scale className="w-2.5 h-2.5" /> R$/kg
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
                        {(prod.vende_por_peso || prod.unidade_venda === "kg") && (
                          <span className="text-[10px] font-medium text-slate-400">/kg</span>
                        )}
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
                const subtotalItem = item.vendePorPeso
                  ? item.quantidade * (item.precoUnitario ?? item.produto.preco)
                  : item.opcoesSelecionadas && item.opcoesSelecionadas.length > 0
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

                      {/* Sub-rótulo para item pesado */}
                      {item.vendePorPeso && (
                        <p className="text-[10.5px] text-amber-400/90 font-mono">
                          ⚖️ {item.pesoGramas
                            ? `${item.pesoGramas}g (${(item.pesoGramas / 1000).toFixed(3)}kg)`
                            : `${item.quantidade}kg`} • {formatarMoeda(item.precoUnitario ?? item.produto.preco)}/kg
                        </p>
                      )}

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

                    {/* Controles de Quantidade / Remoção */}
                    {item.vendePorPeso ? (
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold px-1.5 py-0.5">
                          {item.pesoGramas
                            ? (item.pesoGramas >= 1000 ? `${(item.pesoGramas / 1000).toFixed(3)}kg` : `${item.pesoGramas}g`)
                            : `${item.quantidade}kg`}
                        </Badge>
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
                    ) : (
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
                    )}
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
              onClick={handleVerificarECobrar}
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
      {/* 3.1 MODAL DE VENDA POR PESO (BALANÇA / KG) */}
      {/* ========================================================================= */}
      {produtoPesoModal && (
        <Dialog open={!!produtoPesoModal} onOpenChange={() => setProdutoPesoModal(null)}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-5 overflow-x-hidden">
            <DialogHeader className="pb-3 border-b border-slate-800">
              <DialogTitle className="text-base font-black text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400 shrink-0" />
                  Pesar Produto (R$/kg)
                </span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-mono font-bold">
                  {formatarMoeda(produtoPesoModal.preco)}/kg
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {produtoPesoModal.nome} • Digite o peso em gramas ou o valor desejado em dinheiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Atalhos Rápidos de Peso */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Pesos Rápidos / Padrão:
                </Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: "100g", g: 100 },
                    { label: "250g", g: 250 },
                    { label: "500g", g: 500 },
                    { label: "750g", g: 750 },
                    { label: "1 kg", g: 1000 },
                  ].map((btn) => (
                    <Button
                      key={btn.g}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetQuickPeso(btn.g)}
                      className={`h-8 text-xs font-bold ${
                        Number(pesoGramasInput) === btn.g
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs"
                          : "bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
                      }`}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Inputs Duplos (Gramas <-> Reais) */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" /> Peso (em Gramas)
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={pesoGramasInput}
                      onChange={(e) => handlePesoGramasChange(e.target.value)}
                      placeholder="Ex: 350"
                      className="h-10 text-sm font-mono font-black bg-slate-900 border-slate-700 text-white pl-3 pr-8"
                      autoFocus
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      g
                    </span>
                  </div>
                  {Number(pesoGramasInput) > 0 && (
                    <p className="text-[10.5px] font-mono text-slate-400">
                      = {(Number(pesoGramasInput) / 1000).toFixed(3)} kg
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Valor Total (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={valorDinheiroInput}
                      onChange={(e) => handleValorDinheiroChange(e.target.value)}
                      placeholder="0,00"
                      className="h-10 text-sm font-mono font-black bg-slate-900 border-slate-700 text-emerald-400 pl-9 pr-3"
                    />
                  </div>
                  {Number(pesoGramasInput) > 0 && (
                    <p className="text-[10.5px] font-mono text-emerald-400 font-bold">
                      Subtotal Calculado
                    </p>
                  )}
                </div>
              </div>

              {/* Preview do Item Pesado */}
              {Number(pesoGramasInput) > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-white">{produtoPesoModal.nome}</p>
                    <p className="text-[11px] text-amber-300 font-mono">
                      {pesoGramasInput}g ({(Number(pesoGramasInput) / 1000).toFixed(3)} kg) x {formatarMoeda(produtoPesoModal.preco)}/kg
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-400 uppercase block">Total</span>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {formatarMoeda(((parseFloat(pesoGramasInput) || 0) / 1000) * produtoPesoModal.preco)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProdutoPesoModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!(parseFloat(pesoGramasInput) > 0)}
                onClick={handleConfirmarPesoModal}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-4 h-9 shadow-md disabled:opacity-40"
              >
                <Plus className="w-4 h-4 mr-1 stroke-[3]" />
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
                    {reciboUltimaVenda.itens.map((it: ItemCarrinhoPdv, i: number) => {
                      const itemSubtotal = it.vendePorPeso
                        ? it.quantidade * (it.precoUnitario || it.produto.preco)
                        : (it.precoUnitario || it.produto.preco) * it.quantidade;
                      const pesoDesc = it.vendePorPeso
                        ? (it.pesoGramas ? (it.pesoGramas >= 1000 ? `${(it.pesoGramas / 1000).toFixed(3)}kg` : `${it.pesoGramas}g`) : `${it.quantidade}kg`)
                        : `${it.quantidade}x`;
                      return (
                        <div key={i} className="py-1 flex justify-between text-slate-300">
                          <span className="truncate max-w-[220px]">
                            {pesoDesc} {it.produto.nome} {it.vendePorPeso ? `(${formatarMoeda(it.precoUnitario || it.produto.preco)}/kg)` : ""}
                          </span>
                          <span className="font-bold">
                            {formatarMoeda(itemSubtotal)}
                          </span>
                        </div>
                      );
                    })}
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

      {/* ========================================================================= */}
      {/* 6. MODAL OBRIGATÓRIO DE ABERTURA DE CAIXA */}
      {/* ========================================================================= */}
      <Dialog open={modalAberturaCaixaOpen} onOpenChange={setModalAberturaCaixaOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-purple-500/40 text-white p-5 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400 shrink-0" />
              Abertura de Caixa (Turno Diário)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Inicie a sessão do PDV informando o fundo de troco em dinheiro disponível na gaveta.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
              <Label className="text-xs font-bold text-purple-200">
                Com qual valor em dinheiro o caixa está iniciando hoje?
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                  R$
                </span>
                <Input
                  autoFocus
                  placeholder="0,00"
                  value={valorAberturaInput}
                  onChange={(e) => setValorAberturaInput(aplicarMascaraMoedaInput(e.target.value))}
                  className="pl-10 h-11 text-base font-mono font-black bg-slate-950 border-purple-500/40 text-emerald-400 focus-visible:ring-purple-500 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Se não houver valor em notas/moedas na gaveta, deixe 0,00.
              </p>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span>Operador responsável: <strong className="text-white">{profile?.responsavel || (profile as any)?.nome || user?.email?.split("@")[0] || "Operador"}</strong></span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalAberturaCaixaOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Depois
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarAberturaCaixa}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-5 h-9 shadow-md"
            >
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
              Abrir Caixa Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. MODAL DE GESTÃO DE CAIXA (RESUMO, SANGRIA, REFORÇO, FECHAMENTO) */}
      {/* ========================================================================= */}
      <Dialog open={modalGestaoCaixaOpen} onOpenChange={setModalGestaoCaixaOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
                Gestão e Controle de Caixa
              </DialogTitle>
              <Badge className={caixaAtual?.status === "aberto" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]" : "bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]"}>
                {caixaAtual?.status === "aberto" ? "Caixa Aberto" : "Caixa Fechado"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Operador: <strong className="text-slate-200">{caixaAtual?.operador || "Operador"}</strong> • Aberto às: <strong className="text-slate-200">{caixaAtual?.horaAbertura || "--:--"}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* ABAS DO MENU DE CAIXA */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
            <Button
              type="button"
              size="sm"
              variant={abaGestaoCaixa === "resumo" ? "default" : "ghost"}
              onClick={() => setAbaGestaoCaixa("resumo")}
              className={`text-xs font-bold rounded-xl h-8 ${abaGestaoCaixa === "resumo" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Resumo da Gaveta
            </Button>
            <Button
              type="button"
              size="sm"
              variant={abaGestaoCaixa === "sangria" ? "default" : "ghost"}
              onClick={() => setAbaGestaoCaixa("sangria")}
              className={`text-xs font-bold rounded-xl h-8 ${abaGestaoCaixa === "sangria" ? "bg-rose-600 text-white" : "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"}`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
              Sangria (Retirada)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={abaGestaoCaixa === "reforco" ? "default" : "ghost"}
              onClick={() => setAbaGestaoCaixa("reforco")}
              className={`text-xs font-bold rounded-xl h-8 ${abaGestaoCaixa === "reforco" ? "bg-emerald-600 text-white" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Reforço (Entrada)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={abaGestaoCaixa === "movimentacoes" ? "default" : "ghost"}
              onClick={() => setAbaGestaoCaixa("movimentacoes")}
              className={`text-xs font-bold rounded-xl h-8 ${abaGestaoCaixa === "movimentacoes" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Movimentações ({movimentacoesHoje.length})
            </Button>
          </div>

          <div className="py-2 space-y-4">
            {/* 1. ABA RESUMO DA GAVETA */}
            {abaGestaoCaixa === "resumo" && (
              <div className="space-y-3">
                {/* Hero Saldo em Gaveta */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/40 text-center space-y-1 shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Saldo Estimado em Dinheiro na Gaveta
                  </p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-white">
                    {formatarMoeda(resumoFinanceiroCaixa.saldoDinheiroGaveta)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Fundo Inicial ({formatarMoeda(resumoFinanceiroCaixa.valorAbertura)}) + Vendas Dinheiro ({formatarMoeda(resumoFinanceiroCaixa.totalVendasDinheiro)}) + Reforços ({formatarMoeda(resumoFinanceiroCaixa.totalReforcos)}) - Sangrias ({formatarMoeda(resumoFinanceiroCaixa.totalSangrias)})
                  </p>
                </div>

                {/* Grade de Indicadores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px]">Fundo Inicial:</span>
                    <p className="font-mono font-bold text-white text-sm">
                      {formatarMoeda(resumoFinanceiroCaixa.valorAbertura)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px]">Vendas Dinheiro:</span>
                    <p className="font-mono font-bold text-emerald-400 text-sm">
                      +{formatarMoeda(resumoFinanceiroCaixa.totalVendasDinheiro)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px]">Reforços (+):</span>
                    <p className="font-mono font-bold text-emerald-400 text-sm">
                      +{formatarMoeda(resumoFinanceiroCaixa.totalReforcos)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px]">Sangrias (-):</span>
                    <p className="font-mono font-bold text-rose-400 text-sm">
                      -{formatarMoeda(resumoFinanceiroCaixa.totalSangrias)}
                    </p>
                  </div>
                </div>

                {/* Outros Métodos (Não Afetam Gaveta) */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wide">
                    Outros Recebimentos no PDV Hoje (Banco / Conta Digital):
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-slate-300">Pix:</span>
                      <strong className="font-mono text-white">{formatarMoeda(resumoFinanceiroCaixa.totalVendasPix)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-slate-300">Cartões:</span>
                      <strong className="font-mono text-white">{formatarMoeda(resumoFinanceiroCaixa.totalVendasCartao)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300">Total Geral Hoje:</span>
                      <strong className="font-mono text-emerald-400">{formatarMoeda(resumoFinanceiroCaixa.totalVendasGeral)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ABA SANGRIA */}
            {abaGestaoCaixa === "sangria" && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-rose-500/30">
                <div className="flex items-center gap-2 text-rose-300">
                  <ArrowDownRight className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-wide">Registrar Sangria de Caixa (Retirada)</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Utilize esta opção para registrar qualquer retirada física de dinheiro da gaveta (ex: sangria de segurança para cofre, pagamento de motoboy ou fornecedor).
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Valor da Retirada (R$):</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">R$</span>
                      <Input
                        placeholder="0,00"
                        value={valorMovimentacaoInput}
                        onChange={(e) => setValorMovimentacaoInput(aplicarMascaraMoedaInput(e.target.value))}
                        className="pl-10 h-10 font-mono font-bold bg-slate-900 border-slate-700 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Motivo / Justificativa:</Label>
                    <Input
                      placeholder="Ex: Sangria para cofre, Pagamento entregador..."
                      value={motivoMovimentacaoInput}
                      onChange={(e) => setMotivoMovimentacaoInput(e.target.value)}
                      className="h-10 text-xs bg-slate-900 border-slate-700 text-white rounded-xl"
                    />
                  </div>

                  <Button
                    type="button"
                    disabled={salvandoMovimentacao}
                    onClick={() => handleRegistrarMovimentacao("sangria")}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs h-9 rounded-xl shadow-md"
                  >
                    {salvandoMovimentacao ? "Gravando Sangria..." : "Confirmar Sangria no Caixa"}
                  </Button>
                </div>
              </div>
            )}

            {/* 3. ABA REFORÇO */}
            {abaGestaoCaixa === "reforco" && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-300">
                  <ArrowUpRight className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-wide">Registrar Reforço de Caixa (Entrada de Troco)</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Utilize esta opção para registrar aportes extras de dinheiro na gaveta (ex: adição de moedas ou notas para troco).
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Valor do Aporte (R$):</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">R$</span>
                      <Input
                        placeholder="0,00"
                        value={valorMovimentacaoInput}
                        onChange={(e) => setValorMovimentacaoInput(aplicarMascaraMoedaInput(e.target.value))}
                        className="pl-10 h-10 font-mono font-bold bg-slate-900 border-slate-700 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Motivo / Origem:</Label>
                    <Input
                      placeholder="Ex: Troco de moedas, Aporte extra..."
                      value={motivoMovimentacaoInput}
                      onChange={(e) => setMotivoMovimentacaoInput(e.target.value)}
                      className="h-10 text-xs bg-slate-900 border-slate-700 text-white rounded-xl"
                    />
                  </div>

                  <Button
                    type="button"
                    disabled={salvandoMovimentacao}
                    onClick={() => handleRegistrarMovimentacao("reforco")}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-9 rounded-xl shadow-md"
                  >
                    {salvandoMovimentacao ? "Gravando Reforço..." : "Confirmar Entrada de Troco"}
                  </Button>
                </div>
              </div>
            )}

            {/* 4. ABA MOVIMENTAÇÕES */}
            {abaGestaoCaixa === "movimentacoes" && (
              <div className="space-y-2">
                {movimentacoesHoje.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Nenhuma movimentação avulsa registrada hoje.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                    {movimentacoesHoje.map((m) => {
                      const isSaida = m.tipo === "despesa" || m.tipo === "saida" || m.categoria === "sangria";
                      return (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isSaida ? (
                              <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="font-bold text-white truncate">{m.descricao}</p>
                              <p className="text-[10px] text-slate-400 uppercase">{m.categoria || "Geral"}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold ${isSaida ? "text-rose-400" : "text-emerald-400"}`}>
                              {isSaida ? "-" : "+"}{formatarMoeda(Number(m.valor) || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFecharCaixa}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Fechar Caixa do Dia
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setModalGestaoCaixaOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE RELATÓRIO DE FECHAMENTO DE CAIXA (CÁLCULO DE TURNO) */}
      {/* ========================================================================= */}
      <Dialog open={modalFechamentoCaixaOpen} onOpenChange={setModalFechamentoCaixaOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-rose-500/40 text-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400 shrink-0" />
                Relatório de Fechamento de Caixa
              </DialogTitle>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] uppercase font-bold">
                Turno Diário
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Confira o resumo financeiro do turno antes de confirmar o encerramento do caixa.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4 text-xs">
            {/* Operador e Horários */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>Operador Responsável:</span>
                <strong className="text-white">{caixaAtual?.operador || profile?.responsavel || "Operador"}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Aberto às:</span>
                <span className="font-mono text-white">{caixaAtual?.horaAbertura || "--:--"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Hora do Fechamento:</span>
                <span className="font-mono text-rose-400">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Subtotais por Modalidade de Pagamento */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Vendas por Modalidade de Pagamento
              </h4>
              <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Dinheiro
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatarMoeda(resumoFinanceiroCaixa.totalVendasDinheiro)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <QrCode className="w-3.5 h-3.5 text-purple-400" /> PIX
                  </span>
                  <span className="font-mono font-bold text-purple-300">
                    {formatarMoeda(resumoFinanceiroCaixa.totalVendasPix)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" /> Cartão de Crédito
                  </span>
                  <span className="font-mono font-bold text-sky-300">
                    {formatarMoeda(resumoFinanceiroCaixa.totalVendasCredito)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Cartão de Débito
                  </span>
                  <span className="font-mono font-bold text-indigo-300">
                    {formatarMoeda(resumoFinanceiroCaixa.totalVendasDebito)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold text-xs">
                  <span className="text-white uppercase tracking-wider">Total Geral de Vendas:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    {formatarMoeda(resumoFinanceiroCaixa.totalVendasGeral)}
                  </span>
                </div>
              </div>
            </div>

            {/* Movimentações de Gaveta */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fundo & Movimentações Físicas
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Fundo Inicial</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {formatarMoeda(resumoFinanceiroCaixa.valorAbertura)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Reforços (+)</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    +{formatarMoeda(resumoFinanceiroCaixa.totalReforcos)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sangrias (-)</span>
                  <span className="font-mono font-bold text-rose-400 text-xs">
                    -{formatarMoeda(resumoFinanceiroCaixa.totalSangrias)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Esperado em Dinheiro na Gaveta */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-rose-500/40 text-center space-y-1 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">
                Total Esperado em Dinheiro na Gaveta
              </span>
              <p className="text-2xl sm:text-3xl font-mono font-black text-white">
                {formatarMoeda(resumoFinanceiroCaixa.saldoDinheiroGaveta)}
              </p>
              <p className="text-[10px] text-slate-400">
                Fundo ({formatarMoeda(resumoFinanceiroCaixa.valorAbertura)}) + Vendas Dinheiro ({formatarMoeda(resumoFinanceiroCaixa.totalVendasDinheiro)}) + Reforços ({formatarMoeda(resumoFinanceiroCaixa.totalReforcos)}) - Sangrias ({formatarMoeda(resumoFinanceiroCaixa.totalSangrias)})
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalFechamentoCaixaOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarFechamentoCaixa}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-5 h-9 shadow-md flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. MODAL DE ÚLTIMAS VENDAS (SINCRONIZADO COM ENCOMENDAS & FINANCEIRO) */}
      {/* ========================================================================= */}
      <Dialog open={modalUltimasVendasOpen} onOpenChange={setModalUltimasVendasOpen}>
        <DialogContent className="sm:max-w-3xl bg-slate-900 border-slate-800 text-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400 shrink-0" />
                Últimas Vendas do Dia (PDV)
              </DialogTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAbrirUltimasVendas}
                className="h-7 text-xs text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Atualizar
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Vendas e pedidos registrados nesta loja. Ao deletar uma venda, o lançamento financeiro é estornado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            {carregandoVendas ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-xs">Carregando histórico de vendas...</p>
              </div>
            ) : vendasRecentes.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-slate-600" />
                <p>Nenhuma venda registrada até o momento hoje.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {vendasRecentes.map((venda) => {
                  const dataStr = venda.created_at
                    ? new Date(venda.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "--:--";
                  const total = Number(venda.valor_total || venda.total_amount || 0);

                  return (
                    <div
                      key={venda.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-400 text-[11px]">
                            #{venda.id?.slice(0, 6)}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{dataStr}</span>
                          <span className="text-slate-500">•</span>
                          <strong className="text-white truncate max-w-[180px]">
                            {venda.cliente_nome || "Cliente Balcão"}
                          </strong>
                          <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1 py-0 uppercase">
                            {venda.tipo_entrega === "balcao" ? "Balcão" : "Agendado"}
                          </Badge>
                        </div>

                        <p className="text-slate-400 text-[11px] truncate max-w-[450px]">
                          {venda.itens || "Itens da Venda"}
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-500">
                            Pagamento: <strong className="text-slate-300">{venda.metodo_pagamento || "Dinheiro"}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-850">
                        <span className="font-mono text-sm font-black text-emerald-400">
                          {formatarMoeda(total)}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReimprimirCupom(venda)}
                            title="Reimprimir Cupom"
                            className="h-7.5 w-7.5 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAbrirEdicaoVenda(venda)}
                            title="Editar Venda"
                            className="h-7.5 w-7.5 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExcluirVenda(venda.id)}
                            title="Excluir Venda e Estornar Financeiro"
                            className="h-7.5 w-7.5 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-800">
            <Button
              type="button"
              size="sm"
              onClick={() => setModalUltimasVendasOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 9. MODAL DE EDIÇÃO DE VENDA */}
      {/* ========================================================================= */}
      {vendaEmEdicao && (
        <Dialog open={modalEditarVendaOpen} onOpenChange={setModalEditarVendaOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-5">
            <DialogHeader className="pb-2 border-b border-slate-800">
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-sky-400 shrink-0" />
                Editar Venda #{vendaEmEdicao.id?.slice(0, 6)}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Altere os dados de identificação, status e observações da venda.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-slate-300">Nome do Cliente:</Label>
                <Input
                  value={vendaEmEdicao.cliente_nome}
                  onChange={(e) =>
                    setVendaEmEdicao((prev: any) => ({ ...prev, cliente_nome: e.target.value }))
                  }
                  className="h-9 bg-slate-950 border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">WhatsApp:</Label>
                <Input
                  value={vendaEmEdicao.cliente_whatsapp}
                  onChange={(e) =>
                    setVendaEmEdicao((prev: any) => ({
                      ...prev,
                      cliente_whatsapp: aplicarMascaraTelefone(e.target.value),
                    }))
                  }
                  className="h-9 bg-slate-950 border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Status do Pedido:</Label>
                <Select
                  value={vendaEmEdicao.status}
                  onValueChange={(val) =>
                    setVendaEmEdicao((prev: any) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-white rounded-xl text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="entregue">Entregue (Concluído)</SelectItem>
                    <SelectItem value="pendente">Pendente / Agendado</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Observações:</Label>
                <Textarea
                  value={vendaEmEdicao.observacoes}
                  onChange={(e) =>
                    setVendaEmEdicao((prev: any) => ({ ...prev, observacoes: e.target.value }))
                  }
                  className="h-20 bg-slate-950 border-slate-700 text-white rounded-xl text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalEditarVendaOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={salvandoEdicaoVenda}
                onClick={handleSalvarEdicaoVenda}
                className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs px-4"
              >
                {salvandoEdicaoVenda ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 9. BARRA FIXA INFERIOR NO MOBILE (STICKY BOTTOM CHECKOUT) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xl lg:hidden">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
            {totalItensCarrinho} {totalItensCarrinho === 1 ? "item" : "itens"} no pedido
          </span>
          <span className="font-mono text-base font-black text-emerald-400">
            {formatarMoeda(totalVenda)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pdvCart.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLimparCarrinho}
              className="h-10 px-3 bg-slate-800 border-slate-700 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl"
              title="Limpar Pedido"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            type="button"
            disabled={pdvCart.length === 0}
            onClick={handleVerificarECobrar}
            className="h-10 px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 active:scale-95 disabled:opacity-40"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Cobrar {pdvCart.length > 0 ? formatarMoeda(totalVenda) : ""}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}


