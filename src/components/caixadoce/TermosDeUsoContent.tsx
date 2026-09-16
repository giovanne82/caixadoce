import { Shield, FileText, CheckCircle, AlertTriangle, RefreshCw, Lock, Store } from "lucide-react";

export function TermosDeUsoContent() {
  return (
    <div className="space-y-7 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      {/* CABEÇALHO */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 border border-purple-500/20 text-purple-950 dark:text-purple-200 flex items-start gap-3.5 shadow-xs">
        <Shield className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-base sm:text-lg text-purple-900 dark:text-purple-100">
            Termos de Uso &amp; Condições de Serviço
          </h3>
          <p className="text-xs text-purple-800 dark:text-purple-300 font-medium">
            Regras de Utilização do Sistema CaixaDoce • Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* 1. ACEITE E ESCOPO DA PLATAFORMA */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Store className="w-4 h-4 text-purple-600 shrink-0" /> 1. Aceite dos Termos e Sobre a Plataforma
        </h4>
        <p>
          Ao cadastrar-se ou utilizar o <strong>CaixaDoce</strong>, você declara ter lido e concordado com estes Termos de Uso. O CaixaDoce é uma ferramenta de apoio à gestão comercial, controle financeiro, vitrine digital/cardápio público e precificação para confeitarias, docerias e empreendedores gastronômicos.
        </p>
      </section>

      {/* 2. ISENÇÃO DE RESPONSABILIDADE SOBRE TRANSAÇÕES E OBRIGAÇÃO DE VERIFICAÇÃO */}
      <section className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-800 dark:text-slate-200">
        <h4 className="font-extrabold text-amber-900 dark:text-amber-300 text-base flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" /> 2. Isenção de Responsabilidade sobre Transações &amp; Verificação de Crédito
        </h4>
        <div className="space-y-2 text-xs sm:text-sm">
          <p>
            <strong>Isenção de Responsabilidade Financeira:</strong> O CaixaDoce não processa pagamentos diretamente e não atua como instituição financeira. Todas as transações (PIX, cartões ou dinheiro) ocorrem diretamente entre o cliente final e o usuário lojista. O CaixaDoce não se responsabiliza por estornos, fraudes, golpes ou inadimplência.
          </p>
          <p>
            <strong>Obrigação de Verificação:</strong> É de responsabilidade exclusiva do usuário conferir e confirmar no extrato do seu banco/instituição financeira se o valor foi efetivamente creditado em sua conta antes de liberar qualquer produto ou encomenda.
          </p>
        </div>
      </section>

      {/* 3. DISPONIBILIDADE E MANUTENÇÕES */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-purple-600 shrink-0" /> 3. Disponibilidade e Manutenções
        </h4>
        <p>
          A plataforma opera em ambiente de nuvem e pode passar por interrupções temporárias programadas ou emergenciais para manutenção, atualizações de segurança ou melhorias de infraestrutura a qualquer momento, sem aviso prévio.
        </p>
      </section>

      {/* 4. ENCERRAMENTO E SUSPENSÃO */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600 shrink-0" /> 4. Encerramento ou Suspensão
        </h4>
        <p>
          Reservamo-nos o direito de suspender, atualizar ou encerrar as atividades do programa a qualquer momento, mediante aviso ou conforme os termos dos planos vigentes.
        </p>
      </section>

      {/* 5. PLANO DE TESTE (TRIAL) E ASSINATURAS */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-purple-600 shrink-0" /> 5. Teste Grátis (Trial) e Assinaturas
        </h4>
        <p>
          Novos usuários possuem 7 dias de teste grátis (Trial) com acesso ilimitado às funcionalidades PRO sem necessidade de cadastro inicial de cartão de crédito. Após o teste, o usuário poderá escolher entre o Plano Mensal Completo, Plano Anual Completo ou Plano Básico Gratuito. O cancelamento pode ser feito a qualquer momento pelo painel sem multa.
        </p>
      </section>
    </div>
  );
}
