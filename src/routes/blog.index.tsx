import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CaixaDoceLogo } from "@/components/caixadoce/CaixaDoceLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  BookOpen,
  Calculator,
  Search,
  ArrowRight,
  TrendingUp,
  Clock,
  Cake,
  ChefHat,
  Crown,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { fetchPublishedBlogPosts } from "@/lib/blog-service";
import { BlogPost } from "@/types/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog & Receitas Lucrativas — CaixaDoce" },
      {
        name: "description",
        content:
          "Receitas virais, fichas técnicas completas e simulação real de custos para confeiteiras lucrarem mais.",
      },
      { property: "og:title", content: "Blog & Receitas Lucrativas — CaixaDoce" },
      {
        property: "og:description",
        content:
          "Descubra o custo real e a margem de lucro de receitas virais de confeitaria.",
      },
    ],
  }),
  component: BlogIndexComponent,
});

export function BlogIndexComponent() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("Todas");

  useEffect(() => {
    let isMounted = true;
    fetchPublishedBlogPosts().then((res) => {
      if (isMounted) {
        setPosts(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const categorias = useMemo(() => {
    const list = new Set<string>();
    posts.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return ["Todas", ...Array.from(list)];
  }, [posts]);

  const postsFiltrados = useMemo(() => {
    return posts.filter((post) => {
      const matchBusca =
        !busca.trim() ||
        post.title.toLowerCase().includes(busca.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(busca.toLowerCase())) ||
        post.content.toLowerCase().includes(busca.toLowerCase());

      const matchCategoria =
        categoriaSelecionada === "Todas" || post.category === categoriaSelecionada;

      return matchBusca && matchCategoria;
    });
  }, [posts, busca, categoriaSelecionada]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-purple-600 selection:text-white relative">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      {/* HEADER FIXO */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-purple-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CaixaDoceLogo size="md" />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-slate-700 hover:text-purple-700 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Página Principal</span>
              </Button>
            </Link>

            <Link to="/login" search={{} as any}>
              <Button className="font-extrabold text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-md py-2 px-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Criar Loja Grátis</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION DO BLOG */}
      <section className="relative z-10 pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-800 px-4 py-1 text-xs font-black mb-4">
          <ChefHat className="w-4 h-4 text-purple-600" />
          <span>Blog &amp; Fichas Técnicas para Confeitaria</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight max-w-4xl mx-auto leading-tight">
          Receitas Virais com <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">Precificação Real</span>
        </h1>

        <p className="mt-4 text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Descubra o custo exato dos insumos, aprenda técnicas profissionais e saiba por quanto vender para garantir lucro em cada fornada.
        </p>

        {/* BARRA DE PESQUISA E FILTROS */}
        <div className="mt-8 max-w-xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar receita, insumo ou tendência..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-11 pr-4 py-6 rounded-2xl bg-white border-purple-200 focus:border-purple-500 shadow-sm text-sm"
            />
          </div>

          {/* Categorias Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSelecionada(cat)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
                  categoriaSelecionada === cat
                    ? "bg-purple-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GRID ESTILO PINTEREST / CARDS MODERNOS */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4 h-96"
              >
                <div className="w-full h-48 bg-slate-200 rounded-2xl" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : postsFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-purple-200 max-w-md mx-auto p-8">
            <Cake className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Nenhuma receita encontrada</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tente buscar com outros termos ou selecione outra categoria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBusca("");
                setCategoriaSelecionada("Todas");
              }}
              className="mt-4 text-xs font-bold"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {postsFiltrados.map((post) => {
              const sim = post.cost_simulation;
              return (
                <article
                  key={post.id}
                  className="group bg-white rounded-3xl border border-purple-100 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col justify-between p-6 sm:p-7 space-y-5"
                >
                  <div className="space-y-4">
                    {/* Header: Categoria e Status */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {post.category ? (
                        <Badge className="bg-purple-50 text-purple-800 font-bold text-[11px] px-3 py-1 border border-purple-200/60 rounded-full">
                          <Tag className="w-3 h-3 mr-1 text-purple-600 inline" />
                          {post.category}
                        </Badge>
                      ) : (
                        <div />
                      )}
                      {post.status === "draft" && (
                        <Badge className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                          Rascunho
                        </Badge>
                      )}
                    </div>

                    {/* Meta Info: Tempo de Leitura & Data */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      {post.reading_time && (
                        <span className="flex items-center gap-1 text-slate-500 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          {post.reading_time}
                        </span>
                      )}
                      {post.reading_time && <span>•</span>}
                      <span>{new Date(post.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>

                    {/* Título */}
                    <h2 className="text-xl font-extrabold text-slate-900 leading-snug group-hover:text-purple-700 transition-colors">
                      {post.title}
                    </h2>

                    {/* Resumo (Excerpt) */}
                    {post.excerpt && (
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed font-normal">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Rodapé: Botão CTA "Ler Artigo" / "Ver Ficha" */}
                  <div className="pt-4 border-t border-purple-100/80 flex items-center justify-between">
                    <Link
                      to={`/blog/${post.slug}`}
                      className="w-full inline-flex items-center justify-between text-xs font-extrabold text-purple-700 hover:text-purple-900 group-hover:translate-x-0.5 transition-all bg-purple-50 hover:bg-purple-100/80 px-4 py-2.5 rounded-xl border border-purple-200/50"
                    >
                      <span>{sim ? "Ver Ficha & Receita" : "Ler Artigo"}</span>
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-purple-100 bg-white py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
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
