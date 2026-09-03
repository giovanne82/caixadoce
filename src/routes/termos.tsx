import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TermosDeUsoContent } from "@/components/caixadoce/TermosDeUsoContent";

export { TermosDeUsoContent };

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — CaixaDoce" },
      { name: "description", content: "Termos de Uso e Condições do CaixaDoce." },
    ],
  }),
  component: TermosDeUsoComponent,
});

function TermosDeUsoComponent() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-purple-700">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </Link>
          <span className="text-xs font-mono text-muted-foreground">CaixaDoce Legal</span>
        </div>

        <TermosDeUsoContent />
      </div>
    </div>
  );
}
