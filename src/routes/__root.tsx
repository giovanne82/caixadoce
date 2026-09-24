import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            search={{} as any}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "caixadoce_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <div className="max-w-md w-full bg-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-border text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <span className="text-3xl">🍰</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Ops! Ocorreu um erro ao carregar a tela.
          </h1>
          <p className="text-xs text-muted-foreground">
            Tente recarregar a página para restabelecer a conexão ou retorne para a página inicial.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer shadow-sm"
          >
            Recarregar Página
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-accent cursor-pointer"
          >
            Página Inicial
          </a>
        </div>
      </div>
    </div>
  );
}

const gaMeasurementId =
  (import.meta as any).env?.VITE_GA_MEASUREMENT_ID ||
  (import.meta as any).env?.VITE_GA_ID ||
  "G-8CJLCHZX88";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "supported-color-schemes", content: "light dark" },
      { name: "theme-color", content: "#7C3AED" },
      { name: "google-site-verification", content: "9ZitsOhCj6JHbtCUMaIxy1KXNvSsBnUSjpvHVWG2xRg" },
      { title: "CaixaDoce | Aplicativo de Gestão para Confeitaria e Doceria" },
      { name: "application-name", content: "CaixaDoce" },
      { name: "apple-mobile-web-app-title", content: "CaixaDoce" },
      { name: "description", content: "O aplicativo completo para confeiteiras. Crie seu cardápio digital, calcule fichas técnicas exatas e receba pedidos no piloto automático. Teste grátis!" },
      { name: "author", content: "CaixaDoce" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "CaixaDoce | Aplicativo de Gestão para Confeitaria e Doceria" },
      {
        property: "og:description",
        content: "O aplicativo completo para confeiteiras. Crie seu cardápio digital, calcule fichas técnicas exatas e receba pedidos no piloto automático. Teste grátis!",
      },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap",
      },
      { rel: "icon", href: "/logocaixadoce.png", type: "image/png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/logocaixadoce.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="google-site-verification" content="9ZitsOhCj6JHbtCUMaIxy1KXNvSsBnUSjpvHVWG2xRg" />
        {gaMeasurementId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname });
                `,
              }}
            />
          </>
        )}
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0B14] font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-purple-500 selection:text-white">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (!gaMeasurementId) return;
    const unsubscribe = router.subscribe("onResolved", (event) => {
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("config", gaMeasurementId, {
          page_path: event.toLocation.pathname,
        });
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
