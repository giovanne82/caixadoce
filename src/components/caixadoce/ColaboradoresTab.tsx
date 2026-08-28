import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Users, Shield, UserCheck, Trash2, Mail, Phone, Edit, KeyRound } from "lucide-react";
import { type Colaborador } from "@/lib/caixadoce-data";
import { toast } from "sonner";

const ABAS_DISPONIVEIS = [
  { id: "despesas", label: "Lista de Compras & Notinhas" },
  { id: "produtos", label: "Cardápio Digital" },
  { id: "encomendas", label: "Gestão de Encomendas" },
];

function formatarTelefoneBR(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function ColaboradoresTab() {
  const { profile } = useAuth();
  const activeCode = profile?.establishmentCode || "";

  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`caixadoce_colaboradores_${activeCode}`);
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  const [modalNovo, setModalNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [telefone, setTelefone] = useState("");
  const [abasPermitidas, setAbasPermitidas] = useState<string[]>(["despesas", "produtos", "encomendas"]);
  const [salvando, setSalvando] = useState(false);

  const maxColaboradores = 1;
  const temLimiteAtingido = colaboradores.length >= maxColaboradores;

  const salvarLista = (novaLista: Colaborador[]) => {
    setColaboradores(novaLista);
    try {
      localStorage.setItem(`caixadoce_colaboradores_${activeCode}`, JSON.stringify(novaLista));
    } catch (e) {
      console.warn("Erro ao salvar colaboradores:", e);
    }
  };

  const fetchColaboradores = useCallback(async () => {
    if (!activeCode) return;
    try {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .eq("estabelecimento_codigo", activeCode);

      if (!error && data) {
        const mapeados: Colaborador[] = data.map((d: any) => ({
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo || activeCode,
          nome: d.nome || d.name || "Colaborador",
          email: d.email || "",
          pin: d.pin || "1234",
          telefone: d.telefone || d.phone || "",
          ativo: d.ativo !== false && d.is_active !== false,
          dataCadastro: d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
          abasPermitidas: d.abas_permitidas || d.allowed_tabs || ["scanner", "despesas", "produtos", "encomendas"],
        }));
        setColaboradores(mapeados);
        localStorage.setItem(`caixadoce_colaboradores_${activeCode}`, JSON.stringify(mapeados));
      }
    } catch (e) {
      console.warn("Aviso ao carregar colaboradores do Supabase:", e);
    }
  }, [activeCode]);

  useEffect(() => {
    fetchColaboradores();

    const channel = supabase
      .channel(`realtime_colaboradores_${activeCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "colaboradores" }, () => fetchColaboradores())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCode, fetchColaboradores]);

  const handleToggleAba = (abaId: string) => {
    setAbasPermitidas((prev) =>
      prev.includes(abaId) ? prev.filter((a) => a !== abaId) : [...prev, abaId]
    );
  };

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (colaboradores.length >= maxColaboradores) {
      toast.error("O limite do seu plano é de no máximo 1 colaborador por loja.");
      return;
    }
    if (!nome || !pin) {
      toast.error("Preencha o nome e o PIN de acesso do colaborador.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("O PIN de acesso deve conter entre 4 e 6 números.");
      return;
    }

    setSalvando(true);
    try {
      const cleanName = nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const cleanCode = activeCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const syntheticEmail = `${cleanName}@${cleanCode}.caixadoce.app`;

      const novo: Colaborador = {
        id: crypto.randomUUID(),
        estabelecimentoCodigo: activeCode,
        nome,
        email: syntheticEmail,
        pin,
        telefone,
        ativo: true,
        dataCadastro: new Date().toLocaleDateString("pt-BR"),
        abasPermitidas,
      };

      // Assegura que o registro do estabelecimento mestre existe na tabela 'estabelecimentos' para satisfazer a chave estrangeira
      let storeUuid: string | null = null;
      try {
        const { data: estData } = await supabase
          .from("estabelecimentos")
          .select("id, codigo")
          .or(`codigo.eq.${activeCode},codigo.eq.${activeCode.toLowerCase()}`)
          .limit(1);

          if (estData && estData.length > 0) {
            storeUuid = estData[0].id;
          } else {
            // Cria o estabelecimento mestre via insert limpo se ainda não existir
            const { data: newEst } = await supabase
              .from("estabelecimentos")
              .insert([{ codigo: activeCode, nome: `Confeitaria ${activeCode}` }])
              .select("id")
              .maybeSingle();
            if (newEst) storeUuid = newEst.id;
          }
        } catch (e) {
          console.warn("Aviso ao verificar estabelecimento mestre:", e);
        }

        const payloadPrimary: any = {
          id: novo.id,
          estabelecimento_codigo: activeCode,
          nome: novo.nome,
          email: syntheticEmail,
          pin,
          telefone: novo.telefone,
          abas_permitidas: abasPermitidas,
          ativo: true,
        };
        if (storeUuid) {
          payloadPrimary.estabelecimento_id = storeUuid;
        }

        try {
          let { error } = await supabase.from("colaboradores").upsert([payloadPrimary], { onConflict: "id" });

          if (error && (error.code === "23503" || error.message?.includes("foreign key"))) {
            console.warn("[Supabase] Chave estrangeira violada. Assegurando o estabelecimento mestre via insert limpo...");
              await supabase.from("estabelecimentos").upsert([{ codigo: activeCode, nome: `Loja ${activeCode}` }], { onConflict: "codigo" });

            let retryRes = await supabase.from("colaboradores").upsert([payloadPrimary], { onConflict: "id" });
            if (retryRes.error && storeUuid) {
              const payloadAlt = { ...payloadPrimary, estabelecimento_codigo: storeUuid };
              await supabase.from("colaboradores").upsert([payloadAlt], { onConflict: "id" });
            }
        } else if (error && (error.message?.includes("pin") || error.code === "PGRST204")) {
          const payloadFallback = {
            ...payloadPrimary,
            codigo_pin: pin,
            pin_code: pin,
          };
          delete payloadFallback.pin;
          await supabase.from("colaboradores").upsert([payloadFallback], { onConflict: "id" });
        }
      } catch (err) {
        console.warn("Aviso ao salvar no Supabase colaboradores:", err);
      }

      salvarLista([novo, ...colaboradores]);

      setModalNovo(false);
      setNome("");
      setPin("");
      setTelefone("");
      toast.success(`Colaborador ${nome} cadastrado com sucesso (Acesso PIN: ${pin})!`);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (id: string) => {
    salvarLista(colaboradores.filter((c) => c.id !== id));
    try {
      await supabase.from("colaboradores").delete().eq("id", id);
    } catch {}
    toast.success("Colaborador removido da equipe.");
  };

  const handleToggleStatus = async (id: string) => {
    const colab = colaboradores.find((c) => c.id === id);
    if (!colab) return;
    const novoStatus = !colab.ativo;

    salvarLista(
      colaboradores.map((c) => (c.id === id ? { ...c, ativo: novoStatus } : c))
    );

    try {
      await supabase.from("colaboradores").update({ ativo: novoStatus }).eq("id", id);
    } catch {}

    toast.info("Status do colaborador atualizado.");
  };

  const [modalResetPinOpen, setModalResetPinOpen] = useState(false);
  const [colabSelecionado, setColabSelecionado] = useState<Colaborador | null>(null);
  const [novoPin, setNovoPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);

  const handleAbrirModalRedefinirPin = (colab: Colaborador) => {
    setColabSelecionado(colab);
    setNovoPin("");
    setModalResetPinOpen(true);
  };

  const handleSalvarNovoPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabSelecionado) return;
    if (!/^\d{4,6}$/.test(novoPin)) {
      toast.error("O PIN deve conter entre 4 e 6 números.");
      return;
    }

    setSalvandoPin(true);
    try {
      const listaAtualizada = colaboradores.map((c) =>
        c.id === colabSelecionado.id ? { ...c, pin: novoPin } : c
      );
      salvarLista(listaAtualizada);

      try {
        const resPrimary = await supabase.from("colaboradores").update({ pin: novoPin }).eq("id", colabSelecionado.id);
        if (resPrimary.error) {
          await supabase.from("colaboradores").update({ codigo_pin: novoPin, pin_code: novoPin }).eq("id", colabSelecionado.id);
        }
      } catch (err) {
        console.warn("Aviso ao atualizar PIN no Supabase:", err);
      }

      setModalResetPinOpen(false);
      setColabSelecionado(null);
      setNovoPin("");
      toast.success(`PIN do colaborador ${colabSelecionado.nome} redefinido com sucesso!`);
    } finally {
      setSalvandoPin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            Equipe &amp; Colaboradores <Users className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre o colaborador da sua loja com Acesso PDV (Código da Loja + PIN de segurança).
          </p>
        </div>
        <Button 
          onClick={() => setModalNovo(true)} 
          disabled={temLimiteAtingido}
          title={temLimiteAtingido ? "Limite de 1 colaborador atingido para este estabelecimento" : "Adicionar Novo Colaborador"}
          className="font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Colaborador
        </Button>
      </div>

      {temLimiteAtingido && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-300 font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span><strong>Limite de Colaborador Atingido:</strong> O plano atual permite no máximo <strong>1 colaborador cadastrado por loja</strong>. Caso precise cadastrar um novo atendente, remova o colaborador atual.</span>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold shrink-0">
            1/1 Atendido
          </Badge>
        </div>
      )}

      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Contato &amp; Login PDV</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
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
                    <p className="flex items-center gap-1 font-mono font-medium text-primary">
                      <KeyRound className="w-3.5 h-3.5 text-primary" /> Login: {colab.email?.split("@")[0]} (PIN: {colab.pin || "****"})
                    </p>
                    {colab.telefone && (
                      <p className="flex items-center gap-1 text-muted-foreground mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {colab.telefone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAbrirModalRedefinirPin(colab)}
                        title="Redefinir PIN de Acesso"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemover(colab.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                        title="Excluir Colaborador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
              Cadastre membros da sua equipe com PIN numérico para Acesso PDV rápido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdicionar} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="colab-nome">Nome do Colaborador</Label>
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
                <Label htmlFor="colab-pin">PIN de Acesso (4 a 6 números)</Label>
                <Input
                  id="colab-pin"
                  type="password"
                  placeholder="Ex: 1234"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="colab-tel">WhatsApp / Telefone</Label>
                <Input
                  id="colab-tel"
                  placeholder="(11) 98888-7777"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefoneBR(e.target.value))}
                />
              </div>
            </div>

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

      {/* Modal: Redefinir PIN de Acesso */}
      <Dialog open={modalResetPinOpen} onOpenChange={setModalResetPinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Redefinir PIN de Acesso
            </DialogTitle>
            <DialogDescription>
              Altere o PIN numérico do colaborador <strong>{colabSelecionado?.nome}</strong> para acesso ao PDV.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarNovoPin} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-new-pin">Novo PIN (4 a 6 números)</Label>
              <Input
                id="reset-new-pin"
                type="password"
                placeholder="Ex: 5678"
                maxLength={6}
                value={novoPin}
                onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setModalResetPinOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoPin}>
                {salvandoPin ? "Salvando..." : "Atualizar PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
