import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cake, ArrowRight, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cardapio/")({
  head: () => ({
    meta: [
      { title: "Cardápio Digital — CaixaDoce" },
      { name: "description", content: "Acesse o cardápio da sua confeitaria preferida." },
    ],
  }),
  component: CardapioBuscaView,
});

function CardapioBuscaView() {
  const navigate = useNavigate();
  const [storeCode, setStoreCode] = useState("");

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = storeCode.trim().toUpperCase();
    if (!clean) {
      toast.error("Por favor, digite o código da confeitaria (ex: CD-1001).");
      return;
    }

    navigate({ to: "/cardapio/$storeCode", params: { storeCode: clean } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <CaixaDoceLogo size="lg" className="text-white" />
          <p className="text-sm text-stone-300">Cardápio Digital &amp; Encomendas</p>
        </div>

        <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl text-foreground text-left">
          <CardHeader className="text-center pb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-2">
              <Store className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-black">Acessar Cardápio da Confeitaria</CardTitle>
            <CardDescription className="text-xs">
              Digite o Código Único fornecido pela sua confeiteira para ver os produtos, fotos e fazer seu pedido.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleBuscar} className="space-y-3">
              <div className="space-y-1">
                <Input
                  placeholder="Ex: CD-1001"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  className="text-center text-lg font-mono font-black tracking-widest uppercase h-12"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full font-bold h-11 shadow-md text-sm">
                <span>Ver Cardápio</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-stone-400">
          Você é confeiteira? <a href="/login" className="text-amber-400 font-bold hover:underline">Entre na sua conta</a> para gerenciar seu cardápio.
        </p>
      </div>
    </div>
  );
}
