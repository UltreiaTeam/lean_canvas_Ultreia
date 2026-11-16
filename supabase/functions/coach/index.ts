// Coach del Lean Canvas Playbook: recibe el prompt armado en el cliente y consulta la API de Anthropic.
// La clave ANTHROPIC_API_KEY vive como secreto de Supabase y nunca llega al navegador.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODELS: Record<string, string> = {
  quick: "claude-haiku-5-5",
  default: "claude-sonnet-5-5",
  complex: "claude-sonnet-5-5",
};
const DAILY_LIMIT = Number(Deno.env.get("COACH_DAILY_LIMIT") || 60);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "invalid_request" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ code: "sampling_disabled", message: "Falta configurar ANTHROPIC_API_KEY" }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authed = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return json({ code: "session_expired" }, 401);

  let body: { prompt?: string; tier?: string };
  try { body = await req.json(); } catch { return json({ code: "invalid_request" }, 400); }
  const prompt = String(body.prompt || "");
  if (!prompt || prompt.length > 60000) return json({ code: "invalid_request" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: used, error: usageError } = await admin.rpc("coach_bump", { uid: user.id });
  if (usageError) return json({ code: "upstream_error" }, 500);
  if (Number(used) > DAILY_LIMIT) return json({ code: "rate_limited", message: "Límite diario del coach alcanzado" }, 429);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELS[body.tier || "default"] || MODELS.default,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt + "\n\nTu respuesta será procesada por una máquina: devolvé solo el JSON pedido." }],
    }),
  });
  if (r.status === 429) return json({ code: "rate_limited" }, 429);
  if (!r.ok) return json({ code: "upstream_error", status: r.status }, 502);
  const out = await r.json();
  const text = (out.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  return json({ text });
});
