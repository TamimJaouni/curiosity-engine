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
- For current or time-sensitive claims that require present-day verification, do not present unverified recent details as fact. Focus on established background and explicitly flag where current verification is needed.
- Avoid filler, motivational language, and generic opening paragraphs.`;

  const input = `Explain this curriculum node.

Field: ${field}
Path: ${path.join(' → ')}
Node: ${title}`;

  const model = process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-flash';

  const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
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
      max_tokens:1800
    })
  });

  const data = await deepseekResponse.json();

  if (!deepseekResponse.ok) {
    return Response.json(
      {error:'DEEPSEEK_ERROR',message:data?.error?.message || 'Explanation generation failed.'},
      {status:deepseekResponse.status}
    );
  }

  let raw = String(data?.choices?.[0]?.message?.content || '').trim();
  raw = raw.replace(/^\`\`\`(?:json)?\\s*/i,'').replace(/\\s*\`\`\`$/,'').trim();

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
    sources:[],
    model,
    provider:'deepseek',
    prompt_version:'explain_v2'
  });
}
