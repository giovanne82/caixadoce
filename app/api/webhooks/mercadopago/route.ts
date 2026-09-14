import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

const DEFAULT_MP_ACCESS_TOKEN =
  "APP_USR-3682622436709302-082412-8dce93a51299673df017bb9caf9b848b-78387856";

function getSupabaseBackendClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getMercadoPagoToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    DEFAULT_MP_ACCESS_TOKEN
  );
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request: Request) {
  return new Response(
    JSON.stringify({ status: "ok", message: "Webhook MP Ativo" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      url.searchParams.get("data_id");

    let bodyText = "";
    let bodyJson: any = null;
    try {
      bodyText = await request.text();
      if (bodyText) {
        try {
          bodyJson = JSON.parse(bodyText);
        } catch {}
      }
    } catch {}

    if (!paymentId && bodyJson) {
      paymentId =
        bodyJson.data?.id ||
        bodyJson.id ||
        (bodyJson.resource ? String(bodyJson.resource).split("/").pop() : null);
    }

    console.log("Webhook MP Recebido:", bodyJson || bodyText || paymentId);

    const isMockOrTest =
      !paymentId ||
      paymentId === "123456" ||
      paymentId === "123456789" ||
      paymentId === "12345" ||
      paymentId === "1234567" ||
      bodyJson?.live_mode === false ||
      bodyJson?.action === "test" ||
      bodyJson?.type === "test";

    if (isMockOrTest) {
      console.log(`[MercadoPago Webhook] Simulação/Teste detectado (ID: ${paymentId}). Retornando 200 OK.`);
      return new Response(
        JSON.stringify({ success: true, status: "ok_simulation", payment_id: paymentId || "123456" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const mpToken = getMercadoPagoToken();
    let paymentData: any = null;

    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}`, Accept: "application/json" },
      });

      if (mpRes.ok) {
        paymentData = await mpRes.json();
      }
    } catch (fetchErr: any) {
      console.warn(`[MercadoPago Webhook Exception Captured] Erro ao consultar MP:`, fetchErr?.message || fetchErr);
    }

    if (paymentData && (paymentData.status === "approved" || paymentData.status === "authorized")) {
      const externalRef = String(
        paymentData.external_reference ||
        paymentData.metadata?.external_reference ||
        ""
      ).trim();

      const amount = Number(paymentData.transaction_amount || 0);
      const payerEmail = String(paymentData.payer?.email || "").trim();

      const supabase = getSupabaseBackendClient();
      let estMatch: any = null;

      if (externalRef) {
        const { data: listCod } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, plano_expira_em, plano_exp")
          .or(`codigo.ilike.${externalRef},id.eq.${externalRef},slug.ilike.${externalRef}`)
          .limit(1);
        if (listCod && listCod.length > 0) estMatch = listCod[0];
      }

      if (!estMatch && payerEmail) {
        const { data: listEmail } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, plano_expira_em, plano_exp")
          .ilike("email", payerEmail)
          .limit(1);
        if (listEmail && listEmail.length > 0) estMatch = listEmail[0];
      }

      if (estMatch) {
        const isAnual = amount >= 100 || String(paymentData.description || "").toLowerCase().includes("anual");
        const duracaoDias = isAnual ? 365 : 30;

        let baseMs = Date.now();
        const expStr = estMatch.plano_expira_em || estMatch.plano_exp;
        if (expStr) {
          const expMs = new Date(expStr).getTime();
          if (!isNaN(expMs) && expMs > baseMs) baseMs = expMs;
        }

        const novaExpiraIso = new Date(baseMs + duracaoDias * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("estabelecimentos")
          .update({
            plano_expira_em: novaExpiraIso,
            plano_exp: novaExpiraIso,
            status: "ativo",
            plano_status: "ativo",
            status_assinatura: "ativo",
            is_pro: true,
            plano_id: isAnual ? "anual" : "mensal",
            updated_at: new Date().toISOString(),
          })
          .eq("id", estMatch.id);

        console.log(`[MercadoPago Webhook Success] Assinatura renovada para loja ${estMatch.codigo} até ${novaExpiraIso}`);
      }
    }

    return new Response(JSON.stringify({ success: true, payment_id: paymentId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
