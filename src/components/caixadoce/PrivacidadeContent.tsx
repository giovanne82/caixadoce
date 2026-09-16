import { ShieldCheck, Database, Lock, AlertTriangle, AlertCircle, RefreshCw, BarChart3, HelpCircle, Store } from "lucide-react";

export function PrivacidadeContent() {
  return (
    <div className="space-y-7 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      {/* CABEÇALHO DA POLÍTICA */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 flex items-start gap-3.5 shadow-xs">
        <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-base sm:text-lg text-emerald-900 dark:text-emerald-100">
            Política de Privacidade &amp; Termos de Proteção de Dados
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            Em conformidade com a LGPD (Lei nº 13.709/2018) e Diretrizes do Google Play Console • Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* 1. SOBRE A PLATAFORMA */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-600 shrink-0" /> 1. Sobre a Plataforma CaixaDoce
        </h4>
        <p>
          O <strong>CaixaDoce</strong> é uma plataforma tecnológica de apoio à gestão comercial, controle financeiro, frente de caixa (PDV), vitrine digital (cardápio público) e precificação em cascata voltada para confeitarias, docerias, boleiras e pequenos empreendedores do ramo alimentício.
        </p>
      </section>

      {/* 2. ISENÇÃO DE RESPONSABILIDADE FINANCEIRA & OBRIGAÇÃO DE VERIFICAÇÃO */}
      <section className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-800 dark:text-slate-200">
        <h4 className="font-extrabold text-amber-900 dark:text-amber-300 text-base flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" /> 2. Isenção de Responsabilidade sobre Transações Financeiras &amp; Obrigação de Verificação
        </h4>
        <div className="space-y-2 text-xs sm:text-sm">
          <p>
            <strong>Isenção de Atuação Financeira:</strong> O CaixaDoce <u>não processa pagamentos diretamente</u> e não atua como instituição financeira ou credenciadora. Todas as transações financeiras (transferências Pix, pagamentos via cartão de crédito/débito ou dinheiro físico) ocorrem diretamente entre o cliente final e o usuário lojista por meio das suas próprias contas bancárias ou gateways parceiros integrados (ex: Mercado Pago / Pix direto). O CaixaDoce <strong>não se responsabiliza por estornos, fraudes, desacordos comerciais, golpes ou inadimplência de terceiros</strong>.
          </p>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs font-semibold space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Obrigação Exclusiva de Verificação do Lojista:
            </span>
            <p>
              É de <strong>responsabilidade exclusiva do usuário lojista</strong> conferir e confirmar no extrato oficial da sua instituição financeira/banco se o pagamento foi efetivamente creditado em sua conta <u>antes de liberar, produzir ou entregar qualquer produto ou encomenda</u>.
            </p>
          </div>
        </div>
      </section>

      {/* 3. DISPONIBILIDADE DA PLATAFORMA & MANUTENÇÕES */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" /> 3. Disponibilidade, Manutenções &amp; Atualizações
        </h4>
        <p>
          A plataforma opera em infraestrutura em nuvem e pode passar por interrupções temporárias programadas ou emergenciais para manutenção, atualizações de segurança, correções de sistema ou melhorias na infraestrutura a qualquer momento, sem necessidade de aviso prévio aos usuários.
        </p>
      </section>

      {/* 4. ENCERRAMENTO OU SUSPENSÃO DE SERVIÇOS */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" /> 4. Encerramento ou Suspensão do Programa
        </h4>
        <p>
          Reservamo-nos o direito de suspender, atualizar, modificar ou encerrar as atividades da plataforma ou de módulos específicos a qualquer momento, mediante comunicação prévia aos usuários cadastrados ou conforme estipulado nos termos dos planos vigentes.
        </p>
      </section>

      {/* 5. USO DE DADOS, ARMAZENAMENTO E GOOGLE ANALYTICS */}
      <section className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" /> 5. Uso de Dados, Armazenamento Seguro &amp; Google Analytics
        </h4>
        <div className="space-y-2 text-xs sm:text-sm">
          <p>
            <strong>Armazenamento Seguro de Dados Operacionais:</strong> As informações cadastradas pelo usuário (dados da loja, produtos, cardápio, fichas técnicas, orçamentos, lançamentos de vendas e notas fiscais) são armazenadas em servidores de nuvem de alta performance (Supabase / PostgreSQL) com criptografia, cópias de segurança diárias e isolamento estrito por estabelecimento.
          </p>
          <p>
            <strong>Uso Transparente de Analytics:</strong> A plataforma utiliza o script oficial do <strong>Google Analytics (gtag.js)</strong> para coleta anônima e transparente de métricas estatísticas de navegação, contagem de acessos e engajamento. Essa coleta visa exclusivamente analisar a usabilidade do sistema e implementar melhorias contínuas no produto.
          </p>
        </div>
      </section>

      {/* 6. DIREITOS DO USUÁRIO (LGPD) & EXCLUSÃO DE DADOS */}
      <section className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600 shrink-0" /> 6. Direitos do Usuário &amp; Solicitação de Exclusão (LGPD)
        </h4>
        <p>
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito garantido de consultar, atualizar, exportar ou solicitar a <strong>exclusão permanente e irrevogável de todos os seus dados pessoais e de sua loja</strong> de nossa base de dados a qualquer momento, seja diretamente pelo painel de configurações ou por e-mail.
        </p>
      </section>

      {/* 7. CANAL DE ATENDIMENTO E CONTATO */}
      <section className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs sm:text-sm space-y-1">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" /> 7. Dúvidas ou Solicitações Legais?
        </h4>
        <p className="text-muted-foreground">
          Para esclarecimentos sobre esta Política de Privacidade ou solicitações relativas aos seus dados, entre em contato através do e-mail oficial:{" "}
          <a href="mailto:contato@caixadoce.com.br" className="font-bold text-emerald-600 hover:underline">
            contato@caixadoce.com.br
          </a>
        </p>
      </section>
    </div>
  );
}
