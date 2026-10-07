import {
  curriculumContext,
  intellectualOSBasePrompt,
  socraticPrompt
} from '../../../lib/promptArchitecture';

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
    body=await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const title=String(body?.title || '').trim().slice(0,240);
  const field=String(body?.field || '').trim().slice(0,160);
  const path=Array.isArray(body?.path)
    ? body.path.map(x => String(x).trim().slice(0,240)).filter(Boolean).slice(0,24)
    : [];
  const context=body?.context && typeof body.context === 'object' ? body.context : {};
  const history=Array.isArray(body?.history) ? body.history.slice(-12).map(x => ({
    question:String(x?.question || '').slice(0,1200),
    answer:String(x?.answer || '').slice(0,2400),
    feedback:String(x?.feedback || '').slice(0,1200),
    stage:String(x?.stage || '').slice(0,40)
  })) : [];
  const answer=String(body?.answer || '').trim().slice(0,3200);

  if (!title || !field || !path.length) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }

  const instructions=intellectualOSBasePrompt()+'\n\n'+socraticPrompt();
  const input=`${curriculumContext({title,field,path,context})}

Conversation so far:
${JSON.stringify(history).slice(0,14000)}

Learner's latest answer:
${answer || '[No answer yet. Start the Socratic session with the first diagnostic question.]'}`;

  const model=process.env.DEEPSEEK_SOCRATIC_MODEL || process.env.DEEPSEEK_LEARN_MODEL || 'deepseek-flash';

  const response=await fetch('https://api.deepseek.com/chat/completions',{
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
      max_tokens:1600
    })
  });

  const data=await response.json();
  if (!response.ok) {
    return Response.json(
      {error:'DEEPSEEK_ERROR',message:data?.error?.message || 'Socratic generation failed.'},
      {status:response.status}
    );
  }

  let result;
  try {
    result=JSON.parse(stripFences(data?.choices?.[0]?.message?.content || ''));
  } catch {
    return Response.json(
      {error:'INVALID_MODEL_OUTPUT',message:'The model returned content in an unexpected format.'},
      {status:502}
    );
  }

  const allowedStages=new Set(['orient','mechanism','boundary','connection','synthesis']);
  const allowedMastery=new Set(['developing','solid','strong']);

  if (!result?.question || typeof result.question !== 'string') {
    return Response.json(
      {error:'INCOMPLETE_MODEL_OUTPUT',message:'The Socratic engine did not return a question.'},
      {status:502}
    );
  }

  return Response.json({
    result:{
      feedback:typeof result.feedback === 'string' ? result.feedback.trim() : '',
      question:result.question.trim(),
      hint:typeof result.hint === 'string' ? result.hint.trim() : '',
      stage:allowedStages.has(result.stage) ? result.stage : 'orient',
      mastery_signal:allowedMastery.has(result.mastery_signal) ? result.mastery_signal : 'developing'
    },
    model,
    provider:'deepseek',
    prompt_version:'socratic_v1'
  });
}
