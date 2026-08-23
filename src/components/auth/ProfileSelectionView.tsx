import { useAuth } from "@/context/auth-context";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Store, LogOut, ShieldCheck } from "lucide-react";

export function ProfileSelectionView() {
  const { user, profile, selectProfile, logout } = useAuth();

  const activeCode = profile?.establishmentCode || "CD-1001";
  const activeName = profile?.establishmentName || `Confeitaria ${user?.name || ""}`;

  const handleEntrar = () => {
    if (profile) {
      selectProfile(profile);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-xl bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <CaixaDoceLogo size="lg" />
          </div>
          <CardTitle className="text-xl font-extrabold text-foreground">
            Sua Confeitaria
          </CardTitle>
          <CardDescription>
            Bem-vinda, <strong>{user?.name}</strong>! Acesse seu painel de gestão único:
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            onClick={handleEntrar}
            className="flex items-center justify-between p-4 rounded-xl border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary text-white shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">{activeName}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Loja Principal • 1 Conta = 1 Loja
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-primary/20 text-primary px-2 py-0.5 rounded">
                {activeCode}
              </span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
          </div>

          <Button
            onClick={handleEntrar}
            className="w-full py-6 font-extrabold text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
          >
            Acessar Meu Painel <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/50 pt-4">
          <Button variant="ghost" size="sm" onClick={logout} className="text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
