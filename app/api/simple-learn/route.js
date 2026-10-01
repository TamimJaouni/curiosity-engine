function clean(value, max=240) {
  return String(value || '').trim().slice(0,max);
}

function basePrompt() {
  return `You are the explanation engine for Intellectual OS.

Your job is to help the reader build an accurate mental model, not to impress them with information density.

General rules:
- Explain mechanisms, causal relationships, arguments, distinctions, constraints, incentives, and consequences.
- Distinguish established knowledge, serious disagreement, uncertainty, and speculation.
- Never invent quotations, studies, statistics, documents, sources, or consensus.
- Avoid filler, motivational language, generic introductions, and repetition.
- Use precise but readable language.
- For philosophy, distinguish arguments, assumptions, objections, and competing positions.
- For history, distinguish documented events from causal interpretation and historical debate.
- For economics, focus on incentives, mechanisms, trade-offs, institutions, and empirical uncertainty.
- For psychology, separate mechanisms, evidence, competing explanations, and limits of generalization.
- For physics, prioritize intuition, assumptions, physical mechanism, and limits of the model.
- For future-oriented topics, separate physical possibility, technical feasibility, economic feasibility, and speculation.
- For conspiracy or hidden-power topics, separate documented baseline, exact claim, evidence offered, evidence against, alternative explanations, missing evidence, and unresolved questions.
- For political subjects, remain neutral and descriptive. Do not endorse or rank political actors, parties, ideologies, policies, or choices. If a claim requires current verification, say so rather than guessing.`;
}

function shortPrompt() {
  return `TASK: SHORT EXPLANATION

Explain the topic in about 300-500 words.

The reader wants the fastest route to genuine understanding.

Use this structure:

CORE IDEA
Define the topic directly in 1-3 sentences.

INTUITION
Give the simplest useful mental model or central distinction.

HOW IT WORKS
Explain the main mechanism, causal chain, or argument.

WHY IT MATTERS
Explain what this helps the reader understand elsewhere.

BOUNDARIES
Clarify the most important limitation, misconception, or competing interpretation.

Keep every section compact. Do not turn this into an essay.
The reader should finish thinking: "I understand what this is, how it works, and why it matters."

Return plain text only. Do not return JSON. Do not use markdown tables.`;
}

function exhaustivePrompt() {
  return `TASK: EXHAUSTIVE EXPLANATION

Give a deep, rigorous explanation of the topic in about 1800-3000 words.

Assume the reader is intelligent but not a specialist. Build the subject from first principles and then deepen it.

Use only sections that genuinely help, but normally cover:

CENTRAL PROBLEM
What question, problem, phenomenon, or tension makes the topic important?

FOUNDATIONS
Define the key concepts and assumptions needed to understand it.

MECHANISM OR ARGUMENT
Explain in detail how it works, why it happens, or how the reasoning is structured.

DEVELOPMENT
Where useful, explain the historical, intellectual, scientific, or institutional development.

EVIDENCE AND REASONS
Explain the strongest evidence or reasoning supporting the main account.

COMPETING EXPLANATIONS
Present the strongest serious alternatives and where they disagree.

LIMITATIONS AND CRITICISMS
Explain boundary conditions, counterexamples, weaknesses, and common misunderstandings.

ESTABLISHED VS UNCERTAIN
Separate what is well established from what remains debated, unresolved, or speculative.

CONNECTIONS
Explain the most useful connections to nearby ideas in the supplied curriculum context.

TAKEAWAYS
End with 5 concise points worth remembering.

Do not pad the answer. Depth comes from mechanisms, distinctions, evidence, and competing explanations—not repetition.
Return plain text only. Do not return JSON. Do not use markdown tables.`;
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

  const mode = clean(body?.mode,40);
  if (!['short','exhaustive'].includes(mode)) {
    return Response.json({error:'INVALID_MODE'}, {status:400});
  }

  const title = clean(body?.title,240);
  const field = clean(body?.field,160);
  const path = Array.isArray(body?.path)
    ? body.path.map(x => clean(x,240)).filter(Boolean).slice(0,24)
    : [];
  const context = body?.context && typeof body.context === 'object' ? body.context : {};

  if (!title || !field || !path.length) {
    return Response.json({error:'MISSING_CONTEXT'}, {status:400});
  }

  const instructions = basePrompt() + '\n\n' + (mode === 'short' ? shortPrompt() : exhaustivePrompt());
  const input = `Field: ${field}
Path: ${path.join(' → ')}
Node: ${title}

Curriculum context:
${JSON.stringify(context).slice(0,14000)}`;

  const model = process.env.DEEPSEEK_LEARN_MODEL || process.env.DEEPSEEK_EXPLAIN_MODEL || 'deepseek-chat';
  const maxTokens = mode === 'short' ? 1400 : 5200;

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

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    return Response.json(
      {error:'EMPTY_MODEL_OUTPUT',message:'The model returned an empty response.'},
      {status:502}
    );
  }

  return Response.json({
    content,
    mode,
    model,
    provider:'deepseek',
    prompt_version:mode === 'short' ? 'simple_short_v1' : 'simple_exhaustive_v1'
  });
}
