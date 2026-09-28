export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {error:'AI_NOT_CONFIGURED',message:'OPENAI_API_KEY is not configured on the server.'},
      {status:503}
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const title = String(body?.title || '').trim().slice(0,200);
  const field = String(body?.field || '').trim().slice(0,120);
  const path = Array.isArray(body?.path)
    ? body.path.map(x => String(x).trim().slice(0,200)).filter(Boolean).slice(0,20)
    : [];

  if (!title || !field || !path.length) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }

  const instructions = `You write compact, rigorous explanations for an intellectual learning system.

The reader wants genuine understanding, not a dictionary definition and not a full essay.

Write about 350-600 words total. Respect the curriculum context supplied by the user. If the same term can mean different things in different fields, explain the meaning relevant to this exact path.

Return ONLY valid JSON with exactly these string fields:
{
  "core_idea": "",
  "intuition": "",
  "how_it_works": "",
  "why_it_matters": "",
  "boundaries": ""
}

Requirements:
- core_idea: directly define the subject in 1-3 sentences.
- intuition: give the mental model or central distinction in clear prose.
- how_it_works: explain the mechanism, logic, or argumentative structure rather than merely restating the definition.
- why_it_matters: explain what understanding this helps the reader understand elsewhere.
- boundaries: clarify important limitations, common misunderstandings, boundary conditions, or competing interpretations.
- Do not add a separate connections section. Connections are supplied by the curated knowledge graph.
- Do not invent studies, quotations, statistics, citations, or consensus.
- Distinguish well-established claims from serious debate and speculation through precise wording.
- For philosophy, present major competing positions fairly.
- For political subjects, stay neutral and descriptive. Do not endorse actors, parties, ideologies, policies, or political choices.
- For current, time-sensitive, or political factual claims that require present-day verification, use web search before stating them.
- Avoid filler, motivational language, and generic opening paragraphs.`;

  const input = `Explain this curriculum node.

Field: ${field}
Path: ${path.join(' → ')}
Node: ${title}`;

  const model = process.env.OPENAI_EXPLAIN_MODEL || 'gpt-5.6-luna';

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{
      'Authorization':`Bearer ${apiKey}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model,
      reasoning:{effort:'low'},
      tools:[{type:'web_search'}],
      instructions,
      input,
      max_output_tokens:1800
    })
  });

  const data = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return Response.json(
      {error:'OPENAI_ERROR',message:data?.error?.message || 'Explanation generation failed.'},
      {status:openaiResponse.status}
    );
  }

  const textParts = [];
  const sources = new Map();

  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) {
        textParts.push(content.text);
        for (const annotation of content.annotations || []) {
          const url = annotation?.url || annotation?.url_citation?.url;
          const sourceTitle = annotation?.title || annotation?.url_citation?.title || url;
          if (url) sources.set(url,{title:sourceTitle,url});
        }
      }
    }
  }

  let raw = textParts.join('\n').trim();
  raw = raw.replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();

  let explanation;
  try {
    explanation = JSON.parse(raw);
  } catch {
    return Response.json(
      {error:'INVALID_MODEL_OUTPUT',message:'The model returned an explanation in an unexpected format.'},
      {status:502}
    );
  }

  const required = ['core_idea','intuition','how_it_works','why_it_matters','boundaries'];
  if (required.some(key => typeof explanation?.[key] !== 'string' || !explanation[key].trim())) {
    return Response.json(
      {error:'INCOMPLETE_MODEL_OUTPUT',message:'The explanation was incomplete.'},
      {status:502}
    );
  }

  return Response.json({
    explanation:Object.fromEntries(required.map(key => [key,explanation[key].trim()])),
    sources:[...sources.values()].slice(0,8),
    model,
    prompt_version:'explain_v1'
  });
}
