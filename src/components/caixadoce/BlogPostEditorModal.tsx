import { useState, useEffect } from "react";
import { BlogPost, CostSimulation } from "@/types/blog";
import { updateBlogPost, publishBlogPost, deleteBlogPost } from "@/lib/blog-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Send,
  Save,
  Trash2,
  Eye,
  FileText,
  Calculator,
  Image,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface BlogPostEditorModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function BlogPostEditorModal({
  post,
  isOpen,
  onClose,
  onSaved,
}: BlogPostEditorModalProps) {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [readingTime, setReadingTime] = useState("");
  const [author, setAuthor] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [costSimulationJson, setCostSimulationJson] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setSlug(post.slug || "");
      setCategory(post.category || "Receitas Virais");
      setCoverImage(post.cover_image || "");
      setReadingTime(post.reading_time || "5 min de leitura");
      setAuthor(post.author || "Equipe CaixaDoce");
      setExcerpt(post.excerpt || "");
      setContent(post.content || "");
      setStatus(post.status || "draft");
      setCostSimulationJson(
        post.cost_simulation ? JSON.stringify(post.cost_simulation, null, 2) : ""
      );
    }
  }, [post, isOpen]);

  const handleSlugify = () => {
    if (!title) return;
    const autoSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(autoSlug);
  };

  const handleSave = async (novoStatus?: "draft" | "published") => {
    if (!post) return;
    if (!title.trim() || !slug.trim()) {
      toast.error("Por favor, preencha o título e o slug.");
      return;
    }

    setSaving(true);

    let parsedSim: CostSimulation | null = null;
    if (costSimulationJson.trim()) {
      try {
        parsedSim = JSON.parse(costSimulationJson);
      } catch {
        toast.error("O JSON de Simulação de Custos está inválido. Corrija a formatação.");
        setSaving(false);
        return;
      }
    }

    const finalStatus = novoStatus || status;

    const res = await updateBlogPost(post.id, {
      title,
      slug,
      category,
      cover_image: coverImage || null,
      reading_time: readingTime,
      author,
      excerpt,
      content,
      status: finalStatus,
      cost_simulation: parsedSim,
    });

    setSaving(false);

    if (res.success) {
      if (finalStatus === "published") {
        toast.success("🎉 Artigo publicado com sucesso no Blog!");
      } else {
        toast.success("Rascunho atualizado com sucesso!");
      }
      onSaved();
      onClose();
    } else {
      toast.error(`Erro ao salvar post: ${res.error || "Erro desconhecido"}`);
    }
  };

  const handlePublishDirect = async () => {
    await handleSave("published");
  };

  const handleDelete = async () => {
    if (!post) return;
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o post "${post.title}"?`);
    if (!confirmDelete) return;

    setSaving(true);
    const res = await deleteBlogPost(post.id);
    setSaving(false);

    if (res.success) {
      toast.success("Post excluído com sucesso.");
      onSaved();
      onClose();
    } else {
      toast.error(`Erro ao excluir post: ${res.error || "Erro desconhecido"}`);
    }
  };

  const handlePreviewPage = () => {
    if (!slug) return;
    onClose();
    navigate({ to: `/blog/${slug}` as any });
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900">
                Editar Artigo &amp; Ficha Técnica
              </DialogTitle>
            </div>
            <Badge
              className={`font-black text-xs px-3 py-1 ${
                status === "published"
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {status === "published" ? "Publicado" : "Rascunho / Draft"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Revise o conteúdo gerado pela IA, ajuste a simulação de custos e publique quando estiver pronto.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="conteudo" className="w-full mt-2">
          <TabsList className="grid grid-cols-3 bg-purple-50 p-1 rounded-2xl">
            <TabsTrigger value="conteudo" className="text-xs font-bold gap-1.5 rounded-xl">
              <FileText className="w-3.5 h-3.5" /> Texto &amp; Conteúdo
            </TabsTrigger>
            <TabsTrigger value="detalhes" className="text-xs font-bold gap-1.5 rounded-xl">
              <Tag className="w-3.5 h-3.5" /> Meta Info &amp; Capa
            </TabsTrigger>
            <TabsTrigger value="custos" className="text-xs font-bold gap-1.5 rounded-xl">
              <Calculator className="w-3.5 h-3.5" /> Simulação de Custos
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CONTEÚDO PRINCIPAL */}
          <TabsContent value="conteudo" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Título do Artigo</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSlugify}
                placeholder="Ex: Bolo Bentô Cake Viral 2026: Receita e Custos"
                className="font-bold text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Slug (URL amigável)</Label>
                <div className="flex gap-2">
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="bolo-bento-cake-viral-2026"
                    className="font-mono text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSlugify}
                    className="text-xs font-bold shrink-0 rounded-xl"
                  >
                    Gerar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Categoria</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Receitas Virais, Doces Finos, etc."
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Resumo Curto (Excerpt para SEO e Cards)</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="Breve resumo atraente que aparecerá no card do blog..."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Conteúdo do Post (Markdown / Texto Rico)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Escreva a receita completa, passo a passo, ingredientes..."
                className="font-mono text-xs rounded-xl leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                Suporta Markdown: # Título, ## Subtítulo, - Lista, **Negrito**, etc.
              </p>
            </div>
          </TabsContent>

          {/* TAB 2: META INFO & CAPA */}
          <TabsContent value="detalhes" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">URL da Foto de Capa</Label>
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://exemplo.com/imagem-do-bolo.jpg"
                className="text-xs rounded-xl"
              />
              {coverImage && (
                <div className="mt-2 h-40 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={coverImage}
                    alt="Prévia da Capa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Autor</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Equipe CaixaDoce"
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tempo Estimado de Leitura</Label>
                <Input
                  value={readingTime}
                  onChange={(e) => setReadingTime(e.target.value)}
                  placeholder="4 min de leitura"
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <Label className="text-xs font-bold text-slate-800">Status de Visibilidade</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={status === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("draft")}
                  className={`text-xs font-bold rounded-xl ${
                    status === "draft" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                  }`}
                >
                  Rascunho / Draft
                </Button>
                <Button
                  type="button"
                  variant={status === "published" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("published")}
                  className={`text-xs font-bold rounded-xl ${
                    status === "published" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                  }`}
                >
                  Publicado
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: SIMULAÇÃO DE CUSTOS */}
          <TabsContent value="custos" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">
                  Simulação de Custos (JSON Estruturado)
                </Label>
                <Badge variant="outline" className="text-[10px] font-bold text-purple-700">
                  O Gancho de Conversão
                </Badge>
              </div>
              <Textarea
                value={costSimulationJson}
                onChange={(e) => setCostSimulationJson(e.target.value)}
                rows={12}
                placeholder={`{\n  "rendimento": "1 bolo de 1.5kg",\n  "tempo_preparo": "45 min",\n  "ingredientes": [\n    { "item": "Puratos Norcau Chantilly 1L", "quantidade": "400ml", "preco_unitario": 16.90, "custo_proporcional": 6.76 }\n  ],\n  "custo_total": 28.86,\n  "preco_sugerido": 105.00,\n  "margem_lucro": 72.5\n}`}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                💡 Esta estrutura alimenta automaticamente o card de precificação e lucro no final do artigo.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-xl gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewPage}
              className="text-xs font-bold rounded-xl gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Ver Prévia
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="text-xs font-bold rounded-xl gap-1"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Rascunho
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePublishDirect}
              disabled={saving}
              className="text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md gap-1 px-4"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Publicar Agora
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
