# CaixaDoce 🧁

> **CaixaDoce** — Sistema Moderno de Gestão Financeira, Controle de Caixa, Vendas e Assinaturas.

## 🚀 Tecnologias

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TanStack Start & Router](https://tanstack.com/router), [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Backend & Database:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Row Level Security)
- **Pagamentos & Assinaturas:** [Stripe](https://stripe.com/) (Stripe Checkout & Webhooks)

## 📦 Estrutura do Projeto

```
d:/CaixaDoce
├── public/                 # Favicon e arquivos estáticos
├── src/
│   ├── components/
│   │   ├── auth/           # Login, Cadastro, OTP e Seleção de Estabelecimento
│   │   ├── caixadoce/      # Dashboard, Financeiro, Colaboradores, Meu Plano, Configurações
│   │   └── ui/             # Biblioteca de componentes Radix UI
│   ├── context/            # Contexto de Autenticação Supabase
│   ├── integrations/
│   │   └── supabase/       # Cliente Supabase tipado
│   ├── lib/                # Regras de negócio, modelos, utilitários Pix & Stripe
│   ├── routes/             # Rotas TanStack Start (/ e /login)
│   ├── styles.css          # Design System e temas CaixaDoce
│   ├── router.tsx          # Configuração do TanStack Router
│   ├── server.ts           # Servidor SSR & Webhooks Stripe
│   └── start.ts            # Inicialização TanStack Start
├── supabase/
│   └── migrations/         # Scripts de migração SQL
└── package.json
```

## 🛠️ Como Executar

1. **Instalar dependências:**
   ```bash
   npm install
   # ou bun install
   ```

2. **Configurar variáveis de ambiente:**
   Copie `.env.example` para `.env` e preencha suas credenciais do Supabase e Stripe.

3. **Iniciar o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Construir para produção:**
   ```bash
   npm run build
   ```

## 🔗 Repositório GitHub

[https://github.com/giovanne82/caixadoce.git](https://github.com/giovanne82/caixadoce.git)
