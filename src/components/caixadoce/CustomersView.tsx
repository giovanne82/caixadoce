import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Edit2,
  Trash2,
  CalendarDays,
  DollarSign,
  MapPin,
  Clock,
  Cake,
  Receipt,
} from "lucide-react";
import {
  formatarMoeda,
  formatarWhatsappLink,
  aplicarMascaraTelefone,
  type Cliente,
  type Encomenda,
} from "@/lib/caixadoce-data";
import { toast } from "sonner";

interface CustomersViewProps {
  clientes: Cliente[];
  encomendas: Encomenda[];
  onCriarCliente: (dados: Omit<Cliente, "id" | "estabelecimentoCodigo" | "createdAt">) => Promise<void>;
  onEditarCliente: (id: string, dados: Partial<Cliente>) => Promise<void>;
  onExcluirCliente: (id: string) => Promise<void>;
}

export function CustomersView({
  clientes,
  encomendas,
  onCriarCliente,
  onEditarCliente,
  onExcluirCliente,
}: CustomersViewProps) {
  const [busca, setBusca] = useState("");
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário de Cliente
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Drawer de Histórico de Pedidos do Cliente
  const [selectedClienteHistorico, setSelectedClienteHistorico] = useState<Cliente | null>(null);

  // Mapeamento de Pedidos por Cliente
  const pedidosPorCliente = useMemo(() => {
    const map: Record<string, { totalPedidos: number; totalGasto: number; pedidos: Encomenda[] }> = {};

    for (const cli of clientes) {
      map[cli.id] = { totalPedidos: 0, totalGasto: 0, pedidos: [] };
    }

    for (const enc of encomendas) {
      // Cruzamento por id ou por nome/telefone
      const cliEncontrado = clientes.find(
        (c) => c.id === enc.clienteId || c.nome.toLowerCase() === enc.clienteNome.toLowerCase() || (c.whatsapp && enc.clienteWhatsapp && c.whatsapp.replace(/\D/g, "") === enc.clienteWhatsapp.replace(/\D/g, ""))
      );

      if (cliEncontrado && map[cliEncontrado.id]) {
        map[cliEncontrado.id].totalPedidos += 1;
        map[cliEncontrado.id].totalGasto += enc.valorTotal || 0;
        map[cliEncontrado.id].pedidos.push(enc);
      }
    }

    return map;
  }, [clientes, encomendas]);

  // Métricas Globais
  const metricas = useMemo(() => {
    const totalClientes = clientes.length;
    let totalLtv = 0;
    let totalPedidosConcluidos = 0;

    Object.values(pedidosPorCliente).forEach((dados) => {
      totalLtv += dados.totalGasto;
      totalPedidosConcluidos += dados.totalPedidos;
    });

    return { totalClientes, totalLtv, totalPedidosConcluidos };
  }, [clientes, pedidosPorCliente]);

  // Clientes Filtrados
  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.whatsapp.includes(termo) ||
        (c.endereco && c.endereco.toLowerCase().includes(termo))
    );
  }, [clientes, busca]);

  const handleAbrirCriacao = () => {
    setEditingId(null);
    setNome("");
    setWhatsapp("");
    setEndereco("");
    setObservacoes("");
    setModalClienteOpen(true);
  };

  const handleAbrirEdicao = (cli: Cliente) => {
    setEditingId(cli.id);
    setNome(cli.nome);
    setWhatsapp(aplicarMascaraTelefone(cli.whatsapp));
    setEndereco(cli.endereco || "");
    setObservacoes(cli.observacoes || "");
    setModalClienteOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !whatsapp) {
      toast.error("Informe o nome e o WhatsApp do cliente.");
      return;
    }

    try {
      if (editingId) {
        await onEditarCliente(editingId, { nome, whatsapp, endereco, observacoes });
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await onCriarCliente({ nome, whatsapp, endereco, observacoes });
        toast.success("Novo cliente cadastrado com sucesso!");
      }
      setModalClienteOpen(false);
    } catch {
      toast.error("Erro ao salvar cliente.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Base de Clientes <Users className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie contatos, histórico de compras, LTV acumulado e envie mensagens com um clique.
          </p>
        </div>

        <Button
          onClick={handleAbrirCriacao}
          className="font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo Cliente
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" /> Total de Clientes
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{metricas.totalClientes}</p>
        </Card>

        <Card className="border-border shadow-xs p-4 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Total Faturado c/ Clientes (LTV)
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatarMoeda(metricas.totalLtv)}</p>
        </Card>

        <Card className="border-border shadow-xs p-4 bg-amber-500/5 border-amber-500/20">
          <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5">
            <Cake className="w-4 h-4 text-amber-600" /> Total de Encomendas Realizadas
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">{metricas.totalPedidosConcluidos} pedidos</p>
        </Card>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center gap-2 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, WhatsApp ou endereço..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Nome do Cliente</TableHead>
              <TableHead className="text-xs">WhatsApp / Contato</TableHead>
              <TableHead className="text-xs">Endereço Principal</TableHead>
              <TableHead className="text-xs text-center">Pedidos</TableHead>
              <TableHead className="text-xs font-bold">Total Gasto (LTV)</TableHead>
              <TableHead className="text-xs text-right w-44">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum cliente encontrado. Clique em "+ Novo Cliente" para cadastrar!
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((cli) => {
                const dadosPed = pedidosPorCliente[cli.id] || { totalPedidos: 0, totalGasto: 0, pedidos: [] };
                return (
                  <TableRow key={cli.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-bold text-foreground">
                      {cli.nome}
                      {cli.observacoes && (
                        <p className="text-[10px] text-muted-foreground font-normal truncate max-w-xs">
                          {cli.observacoes}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      {cli.whatsapp ? (
                        <a
                          href={formatarWhatsappLink(cli.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-mono font-semibold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> {cli.whatsapp}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={cli.endereco}>
                      {cli.endereco ? (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0 text-primary" /> {cli.endereco}
                        </span>
                      ) : (
                        <span className="italic text-[11px]">Não informado</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {dadosPed.totalPedidos} ped.
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-black text-foreground">
                      {formatarMoeda(dadosPed.totalGasto)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClienteHistorico(cli)}
                          className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10"
                        >
                          <Receipt className="w-3 h-3 mr-1" /> Histórico
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirEdicao(cli)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Deseja excluir o cadastro de ${cli.nome}?`)) {
                              onExcluirCliente(cli.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR OU EDITAR CLIENTE */}
      {/* ========================================================================= */}
      <Dialog open={modalClienteOpen} onOpenChange={setModalClienteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <Users className="w-5 h-5 text-primary" />
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre os dados de contato e endereço para vincular encomendas e acelerar o atendimento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="cli-nome" className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                id="cli-nome"
                placeholder="Ex: Fernanda Costa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-8 text-xs font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cli-whats" className="text-xs font-semibold">WhatsApp (com DDD) *</Label>
              <Input
                id="cli-whats"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(aplicarMascaraTelefone(e.target.value))}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cli-end" className="text-xs font-semibold">Endereço Principal / Entrega</Label>
              <Input
                id="cli-end"
                placeholder="Rua, Número, Bairro, Complemento..."
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cli-obs" className="text-xs font-semibold">Observações / Preferências</Label>
              <Textarea
                id="cli-obs"
                rows={2}
                placeholder="Ex: Alérgica a amendoim, prefere bolos com pouco açúcar..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalClienteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold shadow-md">
                {editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SHEET / DRAWER: HISTÓRICO DE PEDIDOS DO CLIENTE */}
      {/* ========================================================================= */}
      <Sheet open={!!selectedClienteHistorico} onOpenChange={() => setSelectedClienteHistorico(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col justify-between">
          <div>
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> {selectedClienteHistorico?.nome}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Histórico consolidado de todas as encomendas realizadas por este cliente.
              </SheetDescription>
            </SheetHeader>

            {selectedClienteHistorico && (
              <div className="mt-4 space-y-4">
                {/* Dados de Contato */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">WhatsApp:</span>
                    <a
                      href={formatarWhatsappLink(selectedClienteHistorico.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-600 font-bold hover:underline"
                    >
                      {selectedClienteHistorico.whatsapp}
                    </a>
                  </div>
                  {selectedClienteHistorico.endereco && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Endereço:</span>
                      <span className="text-right text-foreground">{selectedClienteHistorico.endereco}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="font-bold text-foreground">Total Gasto (LTV):</span>
                    <span className="text-sm font-black text-emerald-600">
                      {formatarMoeda(pedidosPorCliente[selectedClienteHistorico.id]?.totalGasto || 0)}
                    </span>
                  </div>
                </div>

                {/* Lista de Encomendas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Pedidos Anteriores ({pedidosPorCliente[selectedClienteHistorico.id]?.pedidos.length || 0})
                  </h4>

                  {pedidosPorCliente[selectedClienteHistorico.id]?.pedidos.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                      Nenhuma encomenda registrada para este cliente ainda.
                    </div>
                  ) : (
                    pedidosPorCliente[selectedClienteHistorico.id]?.pedidos.map((ped) => (
                      <Card key={ped.id} className="border-border shadow-xs p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-foreground flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-primary" />
                            {ped.dataEntrega.split("-").reverse().join("/")} às {ped.horarioEntrega || "14:00"}
                          </span>
                          <span className="font-extrabold text-foreground">{formatarMoeda(ped.valorTotal)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ped.itens}</p>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="pt-4 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedClienteHistorico(null)}
              className="w-full text-xs"
            >
              Fechar Histórico
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
