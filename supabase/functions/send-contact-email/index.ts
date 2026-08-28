import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Suporte a requisição preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { motivo, mensagem, userEmail, userName, establishmentName, establishmentCode } = await req.json();

    if (!mensagem || !mensagem.trim()) {
      return new Response(
        JSON.stringify({ error: "O campo mensagem é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const host = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
    const port = Number(Deno.env.get("SMTP_PORT") || "465");
    const username = Deno.env.get("SMTP_EMAIL") || Deno.env.get("SMTP_USER") || "contato@caixadoce.com.br";
    const password = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("SMTP_PASS") || "";

    const remetenteEmail = userEmail || "usuario@caixadoce.com.br";
    const remetenteNome = userName || "Usuário CaixaDoce";
    const codigoLoja = establishmentCode || "CD-1001";
    const nomeLoja = establishmentName || codigoLoja;
    const motivoStr = motivo || "Suporte / Sugestão";

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #7C3AED 0%, #DB2777 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; }
          .content { padding: 24px; }
          .info-box { background-color: #f9f5ff; border-left: 4px solid #7C3AED; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
          .info-row { margin: 6px 0; font-size: 14px; }
          .info-label { font-weight: bold; color: #5B21B6; }
          .message-box { background-color: #fafafa; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1f2937; }
          .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Novo Contato (${motivoStr}) — CaixaDoce</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="info-row"><span class="info-label">Motivo:</span> ${motivoStr}</div>
              <div class="info-row"><span class="info-label">Usuário:</span> ${remetenteNome} (${remetenteEmail})</div>
              <div class="info-row"><span class="info-label">Loja / Estabelecimento:</span> ${nomeLoja} (Código: ${codigoLoja})</div>
              <div class="info-row"><span class="info-label">Data:</span> ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
            </div>
            <h3 style="color: #4b5563; margin-top: 0;">Mensagem Recebida:</h3>
            <div class="message-box">${mensagem.trim()}</div>
          </div>
          <div class="footer">
            Mensagem enviada automaticamente através do formulário da aba Ajustes > Contato do sistema CaixaDoce.
          </div>
        </div>
      </body>
      </html>
    `;

    // Conexão SMTP Hostinger
    const client = new SmtpClient();

    if (port === 465) {
      await client.connectTLS({
        hostname: host,
        port: port,
        username: username,
        password: password,
      });
    } else {
      await client.connect({
        hostname: host,
        port: port,
        username: username,
        password: password,
      });
    }

    await client.send({
      from: `CaixaDoce App <${username}>`,
      to: "contato@caixadoce.com.br",
      replyTo: remetenteEmail,
      subject: `[${motivoStr.toUpperCase()}] ${nomeLoja} (${codigoLoja})`,
      content: mensagem.trim(),
      html: htmlBody,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "E-mail de contato enviado com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Send Contact Email Error]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Falha ao enviar e-mail via servidor SMTP." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
