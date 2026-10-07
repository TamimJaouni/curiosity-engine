import { curriculumContext, explainPrompt, intellectualOSBasePrompt } from '../../../lib/promptArchitecture';

function stripFences(raw='') {
  return String(raw).trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
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

  const title = String(body?.title || '').trim().slice(0,240);
  const field = String(body?.field || '').trim().slice(0,160);
  const path = Array.isArray(body?.path)
    ? body.path.map(x => String(x).trim().slice(0,240)).filter(Boolean).slice(0,24)
    : [];
  const context = body?.context && typeof body.context === 'object' ? body.context : {};

  if (!title || !field || !path.length) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }

  const model = process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-flash';
  const instructions = intellectualOSBasePrompt() + '\n\n' + explainPrompt();
  const input = curriculumContext({title,field,path,context});

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
      max_tokens:1800
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return Response.json(
      {error:'DEEPSEEK_ERROR',message:data?.error?.message || 'Explanation generation failed.'},
      {status:response.status}
    );
  }

  let explanation;
  try {
    explanation = JSON.parse(stripFences(data?.choices?.[0]?.message?.content || ''));
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
    prompt_version:'explain_v3'
  });
}
