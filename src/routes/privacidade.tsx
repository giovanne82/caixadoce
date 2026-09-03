import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivacidadeContent } from "@/components/caixadoce/PrivacidadeContent";

function PrivacidadeComponent() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-emerald-700">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </Link>
          <span className="text-xs font-mono text-muted-foreground">CaixaDoce Privacidade</span>
        </div>

        <PrivacidadeContent />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — CaixaDoce" },
      { name: "description", content: "Política de Privacidade e Proteção de Dados do CaixaDoce." },
    ],
  }),
  component: PrivacidadeComponent,
});
