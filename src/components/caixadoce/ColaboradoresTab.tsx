import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
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
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, Shield, UserCheck, Trash2, Mail, Phone, Edit } from "lucide-react";
import { type Colaborador } from "@/lib/caixadoce-data";
import { toast } from "sonner";

const ABAS_DISPONIVEIS = [
  { id: "dashboard", label: "Dashboard (Visão Geral)" },
  { id: "financeiro", label: "Financeiro & Vendas" },
  { id: "colaboradores", label: "Controle de Equipe" },
  { id: "config", label: "Configurações" },
  { id: "plano", label: "Meu Plano & Stripe" },
];

export function ColaboradoresTab() {
  const { profile } = useAuth();
  const activeCode = profile?.establishmentCode || "CD-1001";

  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    try {
      const raw = localStorage.getItem(`caixadoce_colaboradores_${activeCode}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [modalNovo, setModalNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [funcao, setFuncao] = useState<"admin" | "gerente" | "operador">("operador");
  const [abasPermitidas, setAbasPermitidas] = useState<string[]>(["dashboard", "financeiro"]);
  const [salvando, setSalvando] = useState(false);

  const salvarLista = (novaLista: Colaborador[]) => {
    setColaboradores(novaLista);
    try {
      localStorage.setItem(`caixadoce_colaboradores_${activeCode}`, JSON.stringify(novaLista));
    } catch (e) {
      console.warn("Erro ao salvar colaboradores:", e);
    }
  };

  const handleToggleAba = (abaId: string) => {
    setAbasPermitidas((prev) =>
      prev.includes(abaId) ? prev.filter((a) => a !== abaId) : [...prev, abaId]
    );
  };

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) {
      toast.error("Preencha nome e e-mail do colaborador.");
      return;
    }

    setSalvando(true);
    try {
      const novo: Colaborador = {
        id: crypto.randomUUID(),
        estabelecimentoCodigo: activeCode,
        nome,
        email,
        telefone,
        funcao,
        ativo: true,
        dataCadastro: new Date().toLocaleDateString("pt-BR"),
        abasPermitidas: funcao === "admin" ? ABAS_DISPONIVEIS.map((a) => a.id) : abasPermitidas,
      };

      salvarLista([novo, ...colaboradores]);
      setModalNovo(false);
      setNome("");
      setEmail("");
      setTelefone("");
      toast.success(`Colaborador ${nome} adicionado com sucesso!`);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = (id: string) => {
    salvarLista(colaboradores.filter((c) => c.id !== id));
    toast.success("Colaborador removido da equipe.");
  };

  const handleToggleStatus = (id: string) => {
    salvarLista(
      colaboradores.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c))
    );
    toast.info("Status do colaborador atualizado.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Equipe &amp; Colaboradores <Users className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie operadores de caixa, gerentes e permissões de acesso ao sistema.
          </p>
        </div>
        <Button onClick={() => setModalNovo(true)} className="font-semibold shadow-md">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Colaborador
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                  Nenhum colaborador adicional cadastrado. Clique em "+ Novo Colaborador" para convidar sua equipe.
                </TableCell>
              </TableRow>
            ) : (
              colaboradores.map((colab) => (
                <TableRow key={colab.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-sm text-foreground">
                    {colab.nome}
                    <p className="text-xs font-normal text-muted-foreground">Cadastrado em {colab.dataCadastro}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="flex items-center gap-1 text-foreground">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {colab.email}
                    </p>
                    {colab.telefone && (
                      <p className="flex items-center gap-1 text-muted-foreground mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {colab.telefone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs font-semibold">
                      {colab.funcao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {colab.abasPermitidas.map((aba) => (
                        <span
                          key={aba}
                          className="bg-muted text-[10px] font-medium px-1.5 py-0.5 rounded text-muted-foreground"
                        >
                          {aba}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleStatus(colab.id)}
                      className="cursor-pointer"
                      title="Alternar ativo/inativo"
                    >
                      <Badge
                        variant={colab.ativo ? "default" : "outline"}
                        className={`text-[11px] ${
                          colab.ativo ? "bg-emerald-600 text-white" : "text-muted-foreground"
                        }`}
                      >
                        {colab.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemover(colab.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Novo Colaborador */}
      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
            <DialogDescription>
              Conceda acesso a membros da sua equipe com controle de permissões por módulo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdicionar} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="colab-nome">Nome Completo</Label>
              <Input
                id="colab-nome"
                placeholder="Ex: Carlos Eduardo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="colab-email">E-mail de Acesso</Label>
                <Input
                  id="colab-email"
                  type="email"
                  placeholder="carlos@caixadoce.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="colab-tel">WhatsApp / Telefone</Label>
                <Input
                  id="colab-tel"
                  placeholder="(11) 98888-7777"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="colab-funcao">Nível de Função</Label>
              <Select value={funcao} onValueChange={(v: any) => setFuncao(v)}>
                <SelectTrigger id="colab-funcao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador (Apenas Vendas &amp; Caixa)</SelectItem>
                  <SelectItem value="gerente">Gerente (Acesso Financeiro &amp; Relatórios)</SelectItem>
                  <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {funcao !== "admin" && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Módulos e Abas Permitidas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ABAS_DISPONIVEIS.map((aba) => (
                    <div key={aba.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${aba.id}`}
                        checked={abasPermitidas.includes(aba.id)}
                        onCheckedChange={() => handleToggleAba(aba.id)}
                      />
                      <Label htmlFor={`perm-${aba.id}`} className="text-xs font-normal cursor-pointer">
                        {aba.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setModalNovo(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar Colaborador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
