import { ShieldCheck, Database, Lock } from "lucide-react";

export function PrivacidadeContent() {
  return (
    <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <h3 className="font-bold text-base">Política de Privacidade &amp; Proteção de Dados</h3>
          <p className="text-xs text-muted-foreground">Em conformidade com a LGPD • Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" /> 1. Coleta de Informações
        </h4>
        <p>
          O CaixaDoce coleta apenas as informações estritamente necessárias para a operação da sua conta e gestão da sua confeitaria, como: nome do estabelecimento, e-mail, telefone de contato, chaves Pix cadastradas para faturamento e os dados operacionais inseridos pelo usuário (notinhas escaneadas, compras e encomendas).
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" /> 2. Segurança e Criptografia
        </h4>
        <p>
          Todos os seus dados são armazenados com criptografia de ponta a ponta e infraestrutura de alta segurança em nuvem (Supabase &amp; PostgreSQL). As transações financeiras e pagamentos são processados com isolamento total via gateways certificados (Mercado Pago / Stripe).
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> 3. Não Compartilhamento com Terceiros
        </h4>
        <p>
          O CaixaDoce NUNCA vende, aluga ou compartilha seus dados pessoais, receitas de ficha técnica, histórico financeiro ou lista de clientes com terceiros para fins publicitários ou comerciais.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" /> 4. Seus Direitos (LGPD)
        </h4>
        <p>
          Em acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a alteração, exportação ou exclusão completa de todos os seus dados e histórico de nossa base a qualquer momento através das configurações da sua conta ou por suporte.
        </p>
      </section>
    </div>
  );
}
