export const maxDuration = 60;

function clean(value,max=4000) {
  return String(value || '').trim().slice(0,max);
}

function tutorPrompt() {
  return `You are the inline section tutor inside Intellectual OS.

The learner is reading a long-form explanation and has opened a conversation about ONE specific section.

Your job is to deepen understanding of this section without rewriting, continuing, or altering the parent explanation.

You receive:
- the overall topic
- the curriculum path
- the current section title
- the current section text
- the conversation history for this section only
- the learner's latest question

Answer the learner's question directly.

You may:
- explain an idea more deeply
- give additional concrete examples or mini-cases
- clarify a person, event, mechanism, argument, term, or assumption
- walk through a causal chain step by step
- provide an analogy or thought experiment when it helps
- contrast two ideas
- supply necessary background
- challenge a misunderstanding
- connect this section to nearby concepts when useful

Important:
- Stay anchored to the current section unless a small amount of outside context is necessary.
- Do not rewrite the parent article.
- Do not continue into later sections of the article.
- Do not imply that this conversation changes any part of the main explanation.
- Treat each section conversation as independent.
- Prefer explanation and examples over information dumping.
- Never invent quotations, studies, statistics, documents, sources, motives, or consensus.
- Clearly distinguish established facts, interpretation, debate, uncertainty, and speculation.
- If the learner asks for an example, give at least one concrete example and explain why it is revealing.
- For history, use concrete episodes and context.
- For science, use mechanisms, experiments, worked examples, or scenarios.
- For philosophy, use arguments, objections, and thought experiments.
- For economics, use incentives and concrete scenarios.
- For contested claims, separate claims, evidence, counterevidence, alternative explanations, and uncertainty.
- For political subjects, remain neutral and descriptive. Do not recommend political actors, parties, ideologies, policies, or choices.

Write in clear prose. Use short Markdown headings only when they materially improve a longer answer.
Do not return JSON.`;
}

export async function POST(request) {
  const apiKey=process.env.DEEPSEEK_API_KEY;
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

  const topic=clean(body?.topic,240);
  const field=clean(body?.field,160);
  const path=Array.isArray(body?.path)
    ? body.path.map(x => clean(x,240)).filter(Boolean).slice(0,24)
    : [];
  const sectionTitle=clean(body?.sectionTitle,300);
  const sectionText=clean(body?.sectionText,14000);
  const question=clean(body?.question,3000);
  const history=Array.isArray(body?.history)
    ? body.history.slice(-10).map(item => ({
        role:item?.role === 'assistant' ? 'assistant' : 'user',
        content:clean(item?.content,5000)
      })).filter(item => item.content)
    : [];

  if (!topic || !sectionText || !question) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }

  const context=`Overall topic: ${topic}
Field: ${field || 'General'}
Curriculum path: ${path.join(' → ')}

Current section: ${sectionTitle || 'Section'}

Section text:
${sectionText}

Remember: answer only as an inline tutor for this section. The parent article must remain unchanged.`;

  const messages=[
    {role:'system',content:tutorPrompt()},
    {role:'user',content:context},
    {role:'assistant',content:'Understood. I will stay anchored to this section and treat this conversation as independent from the rest of the article.'},
    ...history,
    {role:'user',content:question}
  ];

  const model=process.env.DEEPSEEK_SECTION_MODEL || process.env.DEEPSEEK_LEARN_MODEL || process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-chat';

  const response=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${apiKey}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model,
      messages,
      max_tokens:2400
    })
  });

  const data=await response.json();
  if (!response.ok) {
    return Response.json(
      {error:'DEEPSEEK_ERROR',message:data?.error?.message || 'Could not answer this section question.'},
      {status:response.status}
    );
  }

  const answer=String(data?.choices?.[0]?.message?.content || '').trim();
  if (!answer) {
    return Response.json(
      {error:'EMPTY_MODEL_OUTPUT',message:'The model returned an empty response.'},
      {status:502}
    );
  }

  return Response.json({
    answer,
    model,
    provider:'deepseek'
  });
}
