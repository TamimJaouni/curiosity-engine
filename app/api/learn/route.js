import {
  comparePrompt,
  curriculumContext,
  deepDivePrompt,
  flashcardPrompt,
  fullEssayPrompt,
  intellectualOSBasePrompt,
  monthlyReviewPrompt
} from '../../../lib/promptArchitecture';

function stripFences(raw='') {
  return String(raw).trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
}

function specFor(mode) {
  if (mode === 'deep_dive') return deepDivePrompt();
  if (mode === 'compare') return comparePrompt();
  if (mode === 'full_essay') return fullEssayPrompt();
  if (mode === 'flashcard') return flashcardPrompt();
  if (mode === 'monthly_review') return monthlyReviewPrompt();
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

  const instructions = intellectualOSBasePrompt() + '\n\n' + spec;
  const input = mode === 'monthly_review'
    ? `Monthly learning activity:\n${JSON.stringify(context).slice(0,18000)}`
    : curriculumContext({title,field,path,context,other});

  const model = process.env.DEEPSEEK_LEARN_MODEL || process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-flash';
  const maxTokens = mode === 'full_essay' ? 7600 : mode === 'deep_dive' ? 3600 : 2400;

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

  let result;
  try {
    result = JSON.parse(stripFences(data?.choices?.[0]?.message?.content || ''));
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
    prompt_version:'learn_v2'
  });
}
