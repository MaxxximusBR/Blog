// lib/cfai.ts
export type CfChatJSON<T=any> = T;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_API_TOKEN  = process.env.CF_API_TOKEN!;
const CF_AI_MODEL   = process.env.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';

// helper: chama o endpoint de chat da Cloudflare e retorna string
async function cfChatRaw(prompt: string): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${encodeURIComponent(CF_AI_MODEL)}`;

  const body = {
    // formato "messages" estilo OpenAI
    messages: [
      { role: 'system', content: 'Você é um assistente focado em OVNI/UAP. Responda de forma curta e exata.' },
      { role: 'user', content: prompt }
    ],
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    // evita caches
    next: { revalidate: 0 },
  });

  if (!r.ok) {
    throw new Error(`CF AI error ${r.status}`);
  }
  const j = await r.json();
  // resposta vem em j.result.response (normalmente)
  const text = j?.result?.response ?? '';
  return String(text);
}

// helper: pede JSON e tenta fazer parse robusto
export async function cfChatJSON<T=any>(prompt: string, fallback: T): Promise<CfChatJSON<T>> {
  const wrap = `
Responda **APENAS** em JSON válido, sem comentários.
${prompt}
`.trim();

  const raw = await cfChatRaw(wrap);
  try {
    // tenta achar primeiro bloco JSON
    const m = raw.match(/\{[\s\S]*\}$/);
    const jsonStr = m ? m[0] : raw;
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}

// Classifica se é UAP/OVNI de verdade (true/false) e dá breve motivo + score
export async function cfClassifyUAP(title: string, snippet: string) {
  const prompt = `
Classifique se a notícia trata de OVNI/UAP/drone não identificado (visto/relatado sem identificação).
Rejeite se for sobre drone comum (fabricante, polícia, militar identificado), review de drone, corrida etc.

Retorne JSON: {"ok":true|false, "why":"string curta", "score": number de 0 a 1}

TÍTULO: ${title}
TEXTO: ${snippet.slice(0, 1200)}
`.trim();

  return cfChatJSON<{ok:boolean; why:string; score:number}>(
    prompt,
    { ok: false, why: 'fallback', score: 0 }
  );
}

// Resume para PT-BR (título + resumo curto + tópicos)
export async function cfSummarizePtBR(title: string, content: string) {
  const prompt = `
Resuma em PT-BR (3–5 linhas). Última linha "Impacto: ...".
NÃO invente fatos. Se faltarem dados: "Detalhes não informados pela fonte."
Título humano (≤ 90 chars). Resumo (≤ 650 chars). Tópicos em minúsculo.

JSON:
{"titulo":"...", "resumo":"...", "topicos":["ufo","uap",...]}

TÍTULO: ${title}
TEXTO: ${content}
`.trim();

  return cfChatJSON<{titulo:string; resumo:string; topicos:string[]}>(
    prompt,
    { titulo: title, resumo: content.slice(0, 600), topicos: ['ufo'] }
  );
}
