import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { PrivacidadeContent } from "@/components/caixadoce/PrivacidadeContent";
import { TermosDeUsoContent } from "@/components/caixadoce/TermosDeUsoContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function PrivacidadeComponent() {
  const [activeTab, setActiveTab] = useState<"privacidade" | "termos">("privacidade");

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* BARRA SUPERIOR DE NAVEGAÇÃO */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">CaixaDoce Legal</h1>
              <p className="text-[11px] text-muted-foreground">Privacidade &amp; Termos de Serviço</p>
            </div>
          </div>

          <Link to={"/" as any}>
            <Button variant="outline" size="sm" className="gap-2 font-bold text-xs rounded-xl border-slate-300 dark:border-slate-700">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
            </Button>
          </Link>
        </div>

        {/* CONTEÚDO PRINCIPAL COM TABS */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-6">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-3">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="privacidade" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Política de Privacidade
                </TabsTrigger>
                <TabsTrigger value="termos" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400">
                  <FileText className="w-3.5 h-3.5" /> Termos de Uso
                </TabsTrigger>
              </TabsList>

              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" /> Acesso Público • Google Play Verified
              </span>
            </div>

            <TabsContent value="privacidade" className="mt-0">
              <PrivacidadeContent />
            </TabsContent>

            <TabsContent value="termos" className="mt-0">
              <TermosDeUsoContent />
            </TabsContent>
          </Tabs>
        </div>

        {/* RODAPÉ */}
        <div className="text-center text-xs text-slate-400 space-y-1 py-4">
          <p>&copy; {new Date().getFullYear()} CaixaDoce. Todos os direitos reservados.</p>
          <p>Dúvidas legais? Fale conosco: <a href="mailto:contato@caixadoce.com.br" className="text-emerald-600 font-bold hover:underline">contato@caixadoce.com.br</a></p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade & Termos — CaixaDoce" },
      { name: "description", content: "Política de Privacidade, Proteção de Dados (LGPD) e Termos de Uso da plataforma CaixaDoce." },
    ],
  }),
  component: PrivacidadeComponent,
});
