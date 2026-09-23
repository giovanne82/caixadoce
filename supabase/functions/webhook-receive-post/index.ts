import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Utilize POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Validação de Segurança (Header Secret)
    const expectedSecret =
      Deno.env.get("BLOG_WEBHOOK_SECRET") ||
      Deno.env.get("WEBHOOK_SECRET") ||
      "caixadoce_blog_secret_key";

    const receivedSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("X-Webhook-Secret") ||
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      "";

    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({
          error: "Não autorizado. Forneça o header x-webhook-secret válido.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parsing do Payload recebido do Make / n8n
    const body = await req.json();

    const {
      title,
      slug,
      content,
      cost_simulation,
      status = "draft",
      cover_image,
      category = "Receitas Virais",
      reading_time = "5 min de leitura",
      author = "Equipe CaixaDoce",
      excerpt,
    } = body;

    if (!title || !content) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios ausentes. 'title' e 'content' são necessários.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Gerador de slug amigável caso não tenha sido enviado
    const finalSlug =
      slug ||
      title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente na Edge Function." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Inserção na tabela blog_posts no Supabase
    const payloadToInsert = {
      title,
      slug: finalSlug,
      content,
      cost_simulation: cost_simulation || {},
      status: status === "published" ? "published" : "draft",
      cover_image: cover_image || null,
      category,
      reading_time,
      author,
      excerpt: excerpt || content.slice(0, 160).replace(/[#*`_]/g, ""),
      updated_at: new Date().toISOString(),
    };

    const resSupabase = await fetch(`${supabaseUrl}/rest/v1/blog_posts`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(payloadToInsert),
    });

    if (!resSupabase.ok) {
      const errText = await resSupabase.text();
      console.error("[webhook-receive-post] Erro ao inserir no Supabase:", errText);
      return new Response(
        JSON.stringify({
          error: "Erro ao salvar post no banco de dados.",
          details: errText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const insertedData = await resSupabase.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Artigo recebido e salvo com sucesso no status 'draft'!",
        data: insertedData,
        slug: finalSlug,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[webhook-receive-post] Exceção:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: err?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
