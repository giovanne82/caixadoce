import { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { BlogCostSimulation } from "@/components/caixadoce/BlogCostSimulation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  ChevronRight,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { fetchBlogPostBySlug, fetchPublishedBlogPosts } from "@/lib/blog-service";
import { BlogPost } from "@/types/blog";
import { toast } from "sonner";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Receita & Simulação de Custos — CaixaDoce Blog" },
      {
        name: "description",
        content: "Aprenda a receita completa com ficha técnica e custos de insumos.",
      },
    ],
  }),
  component: BlogPostDetailComponent,
});

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Renderizador limpo e elegante para artigos de blog sem bibliotecas pesadas adicionais
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={key} className="my-4 space-y-2 pl-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-slate-700 leading-relaxed text-sm sm:text-base">
              <span className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(trimmed.slice(2));
      return;
    } else {
      flushList(`list-${idx}`);
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-xl sm:text-2xl font-black text-slate-900 mt-8 mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="text-2xl sm:text-3xl font-black text-slate-950 mt-10 mb-4 border-b border-purple-100 pb-2">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-3xl sm:text-4xl font-black text-slate-950 mt-10 mb-6">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed === "---") {
      elements.push(<hr key={idx} className="my-8 border-purple-100" />);
    } else if (trimmed.match(/^\d+\.\s/)) {
      const parts = trimmed.split(/^\d+\.\s/);
      elements.push(
        <div key={idx} className="my-3 flex items-start gap-3 text-slate-700 text-sm sm:text-base leading-relaxed pl-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-800">
            {trimmed.match(/^\d+/)?.[0]}
          </span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(parts[1] || "") }} />
        </div>
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p
          key={idx}
          className="my-4 text-slate-700 leading-relaxed text-sm sm:text-base"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
  });

  flushList("list-final");

  return <div className="space-y-1">{elements}</div>;
}

export function BlogPostDetailComponent() {
  const { slug } = useParams({ from: "/blog/$slug" });
  const [post, setPost] = useState<BlogPost | null>(null);
  const [outrosPosts, setOutrosPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([fetchBlogPostBySlug(slug), fetchPublishedBlogPosts()]).then(
      ([resPost, allPosts]) => {
        if (isMounted) {
          setPost(resPost);
          setOutrosPosts(allPosts.filter((p) => p.slug !== slug).slice(0, 3));
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsapp = () => {
    if (typeof window !== "undefined" && post) {
      const msg = encodeURIComponent(
        `🍰 Olha essa receita de ${post.title} com custos e ficha técnica completa:\n${window.location.href}`
      );
      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Carregando receita &amp; ficha técnica...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Receita não encontrada</h2>
        <p className="text-xs text-slate-600 max-w-md">
          A receita que você procura pode ter sido movida ou ainda não está disponível publicamente.
        </p>
        <Link to="/blog/">
          <Button className="bg-purple-600 hover:bg-purple-700 font-bold text-xs">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Blog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-purple-600 selection:text-white">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-purple-100 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/blog/">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-slate-700 hover:text-purple-700 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ver Todas as Receitas</span>
              </Button>
            </Link>

            <Link to="/login" search={{} as any}>
              <Button className="font-extrabold text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-md py-2 px-3.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Criar Loja Grátis</span>
                <span className="sm:hidden">Criar Loja</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* CONTAINER DO ARTIGO */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 flex-wrap font-medium">
          <Link to="/" className="hover:text-purple-700 transition-colors">
            Início
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link to="/blog/" className="hover:text-purple-700 transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-bold truncate max-w-xs">{post.title}</span>
        </nav>

        {/* CABEÇALHO DO POST */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {post.category && (
              <Badge className="bg-purple-100 text-purple-900 border border-purple-200 font-black text-xs py-1 px-3">
                {post.category}
              </Badge>
            )}
            {post.reading_time && (
              <span className="flex items-center gap-1 text-xs text-slate-500 font-semibold bg-white border border-slate-200 rounded-full px-3 py-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {post.reading_time}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* META DO AUTOR E COMPARTILHAMENTO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                🍰
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {post.author || "Chef Especialista CaixaDoce"}
                </div>
                <div className="text-[11px] text-slate-500">
                  Publicado em {new Date(post.created_at).toLocaleDateString("pt-BR", { dateStyle: "long" })}
                </div>
              </div>
            </div>

            {/* BOTÕES DE COMPARTILHAMENTO */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShareWhatsapp}
                className="text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-xs font-bold border-slate-300 rounded-xl"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
            </div>
          </div>
        </div>

        {/* FOTO DE CAPA PRINCIPAL */}
        {post.cover_image && (
          <div className="my-8 rounded-3xl overflow-hidden shadow-xl border border-purple-100 bg-slate-100 max-h-[500px]">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* CONTEÚDO EM TEXTO / RECEITA */}
        <article className="prose prose-purple max-w-none my-8 bg-white p-6 sm:p-10 rounded-3xl border border-purple-100 shadow-xs">
          <MarkdownRenderer content={post.content} />
        </article>

        {/* COMPONENTE DE CONVERSÃO / SIMULAÇÃO DE CUSTOS (O GANCHO) */}
        {post.cost_simulation && (
          <BlogCostSimulation simulation={post.cost_simulation} recipeTitle={post.title} />
        )}

        {/* ARTIGOS RELACIONADOS */}
        {outrosPosts.length > 0 && (
          <div className="my-16 pt-10 border-t border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Outras Receitas e Tendências
              </h3>
              <Link to="/blog/" className="text-xs font-bold text-purple-700 hover:underline">
                Ver todas →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {outrosPosts.map((op) => (
                <Link
                  key={op.id}
                  to={`/blog/${op.slug}`}
                  className="group bg-white rounded-2xl border border-purple-100 p-4 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="h-32 rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={op.cover_image || ""}
                        alt={op.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                      {op.title}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-purple-700">
                    <span>Ler receita</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-purple-100 bg-white py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="sm" />
            <span>&copy; {new Date().getFullYear()} CaixaDoce. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/" className="hover:text-purple-700 transition-colors">
              Início
            </Link>
            <Link to="/blog/" className="hover:text-purple-700 transition-colors font-bold text-purple-700">
              Blog &amp; Receitas
            </Link>
            <Link to="/privacidade" className="hover:text-purple-700 transition-colors">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-purple-700 transition-colors">
              Termos de Uso
            </Link>
            <Link to="/login" search={{} as any} className="hover:text-purple-700 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
