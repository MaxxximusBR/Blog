// lib/cfai.ts
// Cliente Cloudflare Workers AI + helpers prontos com os NOMES que você importou

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? '';
const CF_API_TOKEN  = process.env.CF_API_TOKEN ?? '';
const CF_AI_GATEWAY = process.env.CF_AI_GATEWAY ?? ''; // opcional: AI Gateway
const DEFAULT_MODEL = process.env.CF_AI_MODEL_SUMMARY ?? '@cf/meta/llama-3.1-8b-instruct';

function cfBaseUrl(model: string) {
  if (CF_AI_GATEWAY) {
    return `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_AI_GATEWAY}/workers-ai/${model}`;
  }
  return `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${model}`;
}

export async function cfChat(
  messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>,
  model = DEFAULT_MODEL
) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { ok: false as const, error: 'CF env missing', text: '' };
  }
  const r = await fetch(cfBaseUrl(model), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!r.ok) {
    const body = await r.text().catch(()=>'');
    return { ok: false as const, error: `HTTP ${r.status} ${body}`, text: '' };
  }
  const js = await r.json().catch(()=>null);
  const text =
    js?.result?.response ??
    js?.result?.text ??
    js?.result?.output_text ??
    js?.response ??
    '';

  return { ok: true as const, text: String(text || '') };
}

// ---------- SUMÁRIO PT-BR ----------
export async function summarizePT(input: string, targetWords = 90, model = DEFAULT_MODEL) {
  const sys = `Você é um redator técnico que explica informações aeronáuticas e de UAPs para leigos, em PT-BR, com neutralidade.`;
  const usr = [
    `Texto (pode conter inglês):`,
    input,
    ``,
    `Tarefa:`,
    `1) TÍTULO PT-BR (máx ~110 chars, sem clickbait).`,
    `2) RESUMO PT-BR (~${targetWords} palavras), claro para leigos.`,
    ``,
    `Saída: JSON válido em uma linha:`,
    `{ "title": "...", "summary": "..." }`
  ].join('\n');

  const res = await cfChat(
    [
      { role: 'system', content: sys },
      { role: 'user', content: usr }
    ],
    model
  );
  if (!res.ok) return { ok: false as const, error: res.error, title: '', summary: '' };

  try {
    const o = JSON.parse(res.text);
    return {
      ok: true as const,
      title: String(o.title ?? '').trim(),
      summary: String(o.summary ?? '').trim(),
    };
  } catch {
    // fallback tosco
    const lines = res.text.split('\n').map(s=>s.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^title\s*[:\-]\s*/i,'') ?? '';
    const summary = lines.slice(1).join(' ').trim();
    return { ok: true as const, title, summary };
  }
}

// Alias com o nome que você já importou:
export const cfSummarizePtBR = summarizePT;

// ---------- CLASSIFICAÇÃO (tags) ----------
export async function cfClassifyUAP(input: string, model = DEFAULT_MODEL) {
  // Sem CF configurado: não falha, só devolve vazio
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { ok: false as const, error: 'CF env missing', tags: [] as string[], why: undefined as string|undefined, score: undefined as number|undefined };
  }

  const sys = `Você classifica textos curtos sobre aviação/UAPs em etiquetas.
Responda APENAS JSON válido, sem comentários.`;

  const usr = [
    `Texto:`,
    input,
    ``,
    `Tarefa: Retorne JSON com os campos:`,
    `- "tags": array de 1 a 8 palavras curtas (sem espaços, formato slug/sem acento)`,
    `- "why": texto curtíssimo (<=140 chars) explicando a classificação`,
    `- "score": número entre 0 e 1 representando confiança (padrão ~0.7 se incerto)`,
    ``,
    `Sugestões quando fizer sentido: ["UAP","UFO","Drone","Balloon","Military","Airspace","Radar","ATS","ATC","FAA","FAB","Aeronautica","Meteorology","Astronomy"].`,
    `Formato (exato): {"tags":["UAP","Radar"],"why":"...","score":0.82}`
  ].join('\n');

  const res = await cfChat(
    [
      { role: 'system', content: sys },
      { role: 'user', content: usr }
    ],
    model
  );
  if (!res.ok) {
    return {
      ok: false as const,
      error: res.error,
      tags: [],
      why: undefined,
      score: undefined,
    };
  }

  try {
    const o = JSON.parse(res.text);
    const tags: string[] = Array.isArray(o?.tags)
      ? o.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 8)
      : [];
    const why  = o?.why  ? String(o.why).trim()   : undefined;
    const score= typeof o?.score === 'number' ? o.score : undefined;

    return { ok: true as const, tags, why, score };
  } catch {
    return { ok: true as const, tags: [], why: undefined, score: undefined };
  }
}
