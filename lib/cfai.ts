// lib/cfai.ts
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? '';
const CF_API_TOKEN  = process.env.CF_API_TOKEN ?? '';
const CF_AI_GATEWAY = process.env.CF_AI_GATEWAY ?? ''; // opcional
const DEFAULT_MODEL = process.env.CF_AI_MODEL_SUMMARY ?? '@cf/meta/llama-3.1-8b-instruct';

function cfBaseUrl(model: string) {
  // usa AI Gateway se configurado (melhor métricas/caching na Cloudflare)
  if (CF_AI_GATEWAY) {
    return `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_AI_GATEWAY}/workers-ai/${model}`;
  }
  return `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${model}`;
}

export async function cfChat(messages: Array<{role:'system'|'user'|'assistant', content:string}>, model = DEFAULT_MODEL) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { ok:false as const, error:'CF env missing', text:'' };
  }
  const url = cfBaseUrl(model);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    return { ok:false as const, error:`HTTP ${r.status} ${txt}`, text:'' };
  }
  const js = await r.json().catch(()=>null);
  // Workers AI normaliza como { result: { response/text } } dependendo do modelo;
  const text =
    js?.result?.response ??
    js?.result?.text ??
    js?.result?.output_text ??
    js?.response ??
    '';

  return { ok:true as const, text: String(text || '') };
}

/** Resume/explica em PT-BR para leigo, com título e resumo curtos */
export async function summarizePT(input: string, targetWords = 90, model = DEFAULT_MODEL) {
  const sys = `Você é um redator técnico que explica informações aeronáuticas e de UAPs para leigos, de forma clara e neutra, em português do Brasil.`;
  const usr = [
    `Texto da notícia (pode conter inglês):`,
    input,
    ``,
    `Tarefa:`,
    `1) Gere um TÍTULO em PT-BR (máx ~110 caracteres, sem clickbait).`,
    `2) Gere um RESUMO em PT-BR para leigos (~${targetWords} palavras).`,
    `3) Se houver termos técnicos, explique brevemente.`,
    ``,
    `Formato de saída (JSON válido em uma linha):`,
    `{ "title": "...", "summary": "..." }`
  ].join('\n');

  const res = await cfChat(
    [
      { role: 'system', content: sys },
      { role: 'user',   content: usr }
    ],
    model
  );
  if (!res.ok) return { ok:false as const, error:res.error, title:'', summary:'' };

  try {
    const parsed = JSON.parse(res.text);
    return {
      ok: true as const,
      title:   String(parsed.title ?? '').trim(),
      summary: String(parsed.summary ?? '').trim(),
    };
  } catch {
    // fallback: tenta extrair do texto bruto
    const lines = res.text.split('\n').map(s=>s.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^title\s*[:\-]\s*/i,'') ?? '';
    const summary = lines.slice(1).join(' ').trim();
    return { ok:true as const, title, summary };
  }
}
