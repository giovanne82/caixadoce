import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { Cake, RefreshCw, Home, ChevronDown, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[CaixaDoce Global ErrorBoundary Caught]:", error, errorInfo);

    try {
      reportLovableError(error, {
        boundary: "GlobalErrorBoundary",
        componentStack: errorInfo.componentStack,
      });
    } catch {}
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Erro desconhecido de execução.";

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0B14] p-4 font-sans text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-[#121124] rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-100 dark:border-purple-900/40 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Ícone de Destaque */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
              <Cake className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Ocorreu um erro ao carregar a tela
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Não se preocupe! Suas informações estão seguras. Tente recarregar a página para continuar utilizando o CaixaDoce.
              </p>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
            </div>

            {/* Detalhes Técnicos Opcionais */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{this.state.showDetails ? "Ocultar detalhes do erro" : "Ver detalhes técnicos"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${this.state.showDetails ? "rotate-180" : ""}`} />
              </button>

              {this.state.showDetails && (
                <div className="mt-2 text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto space-y-1">
                  <p className="font-bold text-red-600 dark:text-red-400 break-words">{errorMessage}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="whitespace-pre-wrap text-[9px] text-slate-500 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
