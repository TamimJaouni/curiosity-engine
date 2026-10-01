function stripFences(raw='') {
  return String(raw).trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
}

function baseRules() {
  return `You write rigorous learning material for Intellectual OS.

Use the exact curriculum context supplied by the user. Prefer mechanisms, distinctions, evidence quality, competing explanations, limitations, and uncertainty over slogans or filler.

Rules:
- Never invent studies, quotations, statistics, citations, documents, or consensus.
- Distinguish established knowledge, serious dispute, unresolved uncertainty, and speculation precisely.
- For conspiracy or hidden-power topics, never dismiss or affirm a whole topic by label. Separate documented facts, claims, evidence, counterevidence, alternative explanations, and what remains unresolved.
- For political subjects, remain neutral and descriptive. Do not endorse parties, actors, ideologies, policies, or political choices, and do not rank political options.
- Do not make unverified current political claims. If a claim requires live verification, say that current verification would be required rather than guessing.
- For future-oriented topics, distinguish physical possibility, engineering feasibility, economic feasibility, timescale uncertainty, and speculation.
- For philosophy, present serious competing positions fairly.
- Avoid motivational filler and generic introductions.`;
}

function specFor(mode) {
  if (mode === 'deep_dive') return `
Write an 800-1500 word analytical deep dive.
Return ONLY valid JSON:
{
  "central_question":"",
  "core_mechanism":"",
  "why_it_happens":"",
  "evidence_and_reasons":"",
  "competing_explanations":"",
  "criticisms_and_limits":"",
  "development":"",
  "established_vs_uncertain":"",
  "connections":"",
  "next_questions":["","",""]
}`;

  if (mode === 'compare') return `
Compare the two supplied curriculum nodes without declaring a winner.
Return ONLY valid JSON:
{
  "framing":"",
  "similarities":"",
  "differences":"",
  "assumptions":"",
  "mechanisms":"",
  "strengths_and_limits":"",
  "common_confusions":"",
  "when_each_applies":"",
  "synthesis":""
}`;

  if (mode === 'full_essay') return `
Write a serious 2500-3500 word essay. It should be readable but intellectually demanding.
Return ONLY valid JSON:
{
  "title":"",
  "thesis":"",
  "sections":[
    {"heading":"","body":""}
  ],
  "established_vs_uncertain":"",
  "takeaways":["","","","",""],
  "hard_questions":["","",""],
  "further_reading_guidance":""
}
The essay should normally include the central problem, definitions, historical development when useful, mechanisms or arguments, evidence/reasons, competing positions, criticisms, alternatives, unresolved questions, interdisciplinary connections, implications, and a conclusion. Do not pad sections merely to hit length.`;

  if (mode === 'flashcard') return `
Create one durable recall card for the supplied topic.
Return ONLY valid JSON:
{
  "prompt":"",
  "answer":""
}
The prompt should test understanding rather than trivia. The answer should be concise enough to review in under one minute while preserving the central mechanism or distinction.`;

  if (mode === 'monthly_review') return `
Synthesize the user's supplied learning activity for one month. Do not infer activity that is not in the input.
Return ONLY valid JSON:
{
  "summary":"",
  "strongest_threads":["","",""],
  "connections":["","",""],
  "gaps":["","",""],
  "next_month":["","",""]
}
Focus on intellectual patterns, not praise or personality judgments.`;

  return null;
}

export async function POST(request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(
      {error:'AI_NOT_CONFIGURED',message:'DEEPSEEK_API_KEY is not configured on the server.'},
      {status:503}
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const mode = String(body?.mode || '').trim();
  const spec = specFor(mode);
  if (!spec) return Response.json({error:'INVALID_MODE'}, {status:400});

  const title = String(body?.title || '').trim().slice(0,240);
  const field = String(body?.field || '').trim().slice(0,160);
  const path = Array.isArray(body?.path)
    ? body.path.map(x => String(x).trim().slice(0,240)).filter(Boolean).slice(0,24)
    : [];
  const context = body?.context && typeof body.context === 'object' ? body.context : {};
  const other = body?.other && typeof body.other === 'object' ? {
    title:String(body.other.title || '').trim().slice(0,240),
    field:String(body.other.field || '').trim().slice(0,160),
    path:Array.isArray(body.other.path) ? body.other.path.map(x => String(x).trim().slice(0,240)).filter(Boolean).slice(0,24) : []
  } : null;

  if (mode !== 'monthly_review' && (!title || !field || !path.length)) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }
  if (mode === 'compare' && !other?.title) {
    return Response.json({error:'MISSING_COMPARE_TARGET'}, {status:400});
  }

  const instructions = baseRules() + '\n\n' + spec;
  const input = mode === 'monthly_review'
    ? `Monthly learning activity:\n${JSON.stringify(context).slice(0,16000)}`
    : `Primary curriculum node:
Field: ${field}
Path: ${path.join(' → ')}
Node: ${title}

Additional curriculum context:
${JSON.stringify(context).slice(0,12000)}
${other ? `\nComparison node:\nField: ${other.field}\nPath: ${other.path.join(' → ')}\nNode: ${other.title}` : ''}`;

  const model = process.env.DEEPSEEK_LEARN_MODEL || process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-flash';
  const maxTokens = mode === 'full_essay' ? 7600 : mode === 'deep_dive' ? 3400 : 2200;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method:'POST',
    headers:{
      'Authorization':`Bearer ${apiKey}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model,
      messages:[
        {role:'system',content:instructions},
        {role:'user',content:input}
      ],
      response_format:{type:'json_object'},
      max_tokens:maxTokens
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return Response.json(
      {error:'DEEPSEEK_ERROR',message:data?.error?.message || 'Generation failed.'},
      {status:response.status}
    );
  }

  const raw = stripFences(data?.choices?.[0]?.message?.content || '');
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    return Response.json(
      {error:'INVALID_MODEL_OUTPUT',message:'The model returned content in an unexpected format.'},
      {status:502}
    );
  }

  return Response.json({
    result,
    model,
    provider:'deepseek',
    prompt_version:'learn_v1'
  });
}
