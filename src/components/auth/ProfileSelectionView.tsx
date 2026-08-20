import { useState } from "react";
import { useAuth, type UserProfile, type StaffRole } from "@/context/auth-context";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Plus, ArrowRight, Shield, User, Store, LogOut } from "lucide-react";
import { toast } from "sonner";

export function ProfileSelectionView() {
  const { user, profile, estabelecimentos, selectProfile, createEstablishment, logout } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      toast.error("Informe o nome do estabelecimento.");
      return;
    }
    setCreating(true);
    try {
      await createEstablishment(nome, endereco || "Unidade Principal", "admin");
      setCreateModalOpen(false);
      setNome("");
      setEndereco("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/80 shadow-2xl bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <CaixaDoceLogo size="lg" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Selecione seu Estabelecimento
          </CardTitle>
          <CardDescription>
            Olá, <strong>{user?.name}</strong>! Escolha qual unidade ou perfil você deseja acessar:
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {estabelecimentos.map((est) => {
            const isCurrent = profile?.establishmentCode === est.codigo;
            return (
              <div
                key={est.id || est.codigo}
                onClick={() => {
                  selectProfile({
                    role: "admin",
                    establishmentCode: est.codigo,
                    establishmentName: est.nome,
                    establishmentAddress: est.endereco,
                    chavePix: est.chavePix,
                    tipoChavePix: est.tipoChavePix,
                  });
                }}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{est.nome}</h4>
                    <p className="text-xs text-muted-foreground">{est.endereco || "Matriz"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {est.codigo}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            onClick={() => setCreateModalOpen(true)}
            className="w-full py-5 border-dashed border-2 hover:border-primary hover:text-primary transition-colors flex items-center gap-2 mt-4"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Estabelecimento / Unidade
          </Button>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border/50 pt-4">
          <Button variant="ghost" size="sm" onClick={logout} className="text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>

      {/* Modal: Criar Estabelecimento */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Estabelecimento</DialogTitle>
            <DialogDescription>
              Cadastre sua loja, confeitaria ou caixa para gerenciar de forma independente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="est-nome">Nome da Loja / Estabelecimento</Label>
              <Input
                id="est-nome"
                placeholder="Ex: CaixaDoce Shopping"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-end">Endereço / Localização</Label>
              <Input
                id="est-end"
                placeholder="Ex: Av. Paulista, 1000 - Loja 12"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Criando..." : "Salvar Estabelecimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
