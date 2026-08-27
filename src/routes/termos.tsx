import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — CaixaDoce" },
      { name: "description", content: "Termos de Uso e Condições do CaixaDoce." },
    ],
  }),
  component: TermosDeUsoComponent,
});

export function TermosDeUsoContent() {
  return (
    <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 flex items-center gap-3">
        <Shield className="w-6 h-6 text-purple-600 shrink-0" />
        <div>
          <h3 className="font-bold text-base">Termos de Uso e Condições de Serviço</h3>
          <p className="text-xs text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" /> 1. Aceite dos Termos
        </h4>
        <p>
          Ao criar uma conta ou utilizar a plataforma CaixaDoce, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso. O CaixaDoce é um sistema de gestão voltado para confeitarias, docerias e pequenos empreendedores gastronômicos.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-purple-600" /> 2. Período de Teste Grátis (Trial) e Assinaturas
        </h4>
        <p>
          Novos usuários cadastrados recebem 7 dias de teste grátis (Trial) com acesso ilimitado às funcionalidades PRO sem necessidade de cadastro de cartão de crédito. Após o término do período de teste, o usuário poderá optar por assinar o Plano Mensal Completo ou utilizar o Plano Básico Gratuito (com acesso restrito).
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" /> 3. Responsabilidade pelos Dados e Notinhas
        </h4>
        <p>
          O usuário é o único responsável pela precisão e veracidade dos dados inseridos, incluindo cupons fiscais escaneados, preços de produtos, cadastros de clientes e receitas de ficha técnica. O CaixaDoce utiliza Inteligência Artificial para auxílio de leitura OCR, devendo o usuário conferir os valores sugeridos antes de salvar.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" /> 4. Cancelamentos e Reembolsos
        </h4>
        <p>
          A assinatura do CaixaDoce pode ser cancelada a qualquer momento sem fidelidade ou multa através da aba "Meu Plano &amp; Assinatura". O cancelamento interrompe cobranças futuras mantendo o acesso até o fim do período já pago.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" /> 5. Alterações nos Termos
        </h4>
        <p>
          Reservamo-nos o direito de atualizar estes termos periodicamente. Notificaremos os usuários cadastrados em caso de alterações relevantes.
        </p>
      </section>
    </div>
  );
}

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
