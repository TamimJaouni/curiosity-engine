export const maxDuration = 30;

function clean(value,max=4000) {
  return String(value || '').trim().slice(0,max);
}

function stripFences(raw='') {
  return String(raw).trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
}

function fallbackPlan(topic,sections) {
  const useful=sections.filter(s => s.text && s.text.length > 140);
  const picked=[];
  const take=(regex,type,suffix) => {
    const section=useful.find(s => !picked.some(p => p.sectionId === s.id) && regex.test(s.title+' '+s.text.slice(0,400)));
    if (section) picked.push({
      sectionId:section.id,
      visualType:type,
      searchQuery:(topic+' '+suffix).trim(),
      fallbackQuery:topic,
      reason:'Helps the reader visualize this part of the topic.'
    });
  };

  take(/world before|context|origin|territor|empire|kingdom|geograph|border|expansion/i,'map','historical map');
  take(/figure|ruler|king|emperor|leader|thinker|scientist|founder|person/i,'person', 'historical portrait');
  take(/city|capital|palace|church|mosque|temple|site|architecture|ruin/i,'place', 'historical site');
  take(/battle|war|migration|route|campaign|revolt|revolution|treaty/i,'map','event map');

  return picked.slice(0,4);
}

export async function POST(request) {
  let body;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const topic=clean(body?.topic,240);
  const field=clean(body?.field,160);
  const path=Array.isArray(body?.path) ? body.path.map(x => clean(x,240)).filter(Boolean).slice(0,20) : [];
  const sections=Array.isArray(body?.sections) ? body.sections.slice(0,28).map(s => ({
    id:clean(s?.id,120),
    title:clean(s?.title,260),
    text:clean(s?.text,2600)
  })).filter(s => s.id && s.text) : [];

  if (!topic || !sections.length) return Response.json({items:[]});

  const apiKey=process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return Response.json({items:fallbackPlan(topic,sections),planner:'fallback'});

  const system=`You are the visual editor for an educational long-form article.

Your job is NOT to decorate the article. Select only images that materially improve understanding.

For each selected section, ask: what would the reader naturally want to SEE here?

Highest-value visual questions:
1. Where was this? -> historical map
2. How large was it / how did borders change? -> territorial map
3. Who was this important person? -> portrait, bust, mosaic, manuscript depiction, statue, or other historically grounded depiction
4. What did this place/city/building look like? -> architecture, ruins, archaeological site, historical photograph
5. How did people live/fight/build? -> material culture, artifact, reconstruction only when historically grounded
6. Where did this event/migration/campaign happen? -> event or route map

LOW VALUE unless the text is specifically about them:
- coats of arms
- flags
- heraldic eagles
- seals
- logos
- generic symbols
- decorative emblems
- random coins when the person/place itself would teach more

Rules:
- Choose 2-4 visuals total for a normal long article. Fewer is better than irrelevant.
- Prefer maps and human/place depictions over symbols.
- Use exact named entities from the section text whenever possible.
- A search query should be something a human would type into Wikimedia/Wikipedia image search.
- For maps, include a date/century/extent when the section supports it.
- For people, search the actual person's name, not a generic phrase like "important figures".
- For places, search the actual city/building/site.
- Never invent people, dates, places, or events not present in the supplied article.
- Never select a section merely because an image is available.
- Each section gets at most one image.
- Avoid placing an image under "Key Takeaways", "Established vs Uncertain", "Criticisms", or other abstract summary sections unless there is a very strong reason.

Return ONLY valid JSON:
{
  "items":[
    {
      "sectionId":"exact supplied section id",
      "visualType":"map|person|place|artifact|event",
      "searchQuery":"specific search phrase",
      "fallbackQuery":"shorter exact entity/topic phrase",
      "reason":"one sentence describing what the image should help the reader see"
    }
  ]
}`;

  const user=`Topic: ${topic}
Field: ${field || 'General'}
Path: ${path.join(' → ')}

Sections:
${JSON.stringify(sections).slice(0,30000)}`;

  try {
    const response=await fetch('https://api.deepseek.com/chat/completions',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${apiKey}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:process.env.DEEPSEEK_VISUAL_MODEL || process.env.DEEPSEEK_LEARN_MODEL || 'deepseek-chat',
        messages:[
          {role:'system',content:system},
          {role:'user',content:user}
        ],
        response_format:{type:'json_object'},
        max_tokens:1600
      })
    });

    if (!response.ok) return Response.json({items:fallbackPlan(topic,sections),planner:'fallback'});

    const data=await response.json();
    const parsed=JSON.parse(stripFences(data?.choices?.[0]?.message?.content || '{}'));
    const allowed=new Set(['map','person','place','artifact','event']);
    const sectionIds=new Set(sections.map(s => s.id));
    const used=new Set();
    const items=(Array.isArray(parsed?.items) ? parsed.items : []).map(item => ({
      sectionId:clean(item?.sectionId,120),
      visualType:allowed.has(item?.visualType) ? item.visualType : 'place',
      searchQuery:clean(item?.searchQuery,260),
      fallbackQuery:clean(item?.fallbackQuery,220),
      reason:clean(item?.reason,320)
    })).filter(item => {
      if (!sectionIds.has(item.sectionId) || !item.searchQuery || used.has(item.sectionId)) return false;
      used.add(item.sectionId);
      return true;
    }).slice(0,4);

    return Response.json({items:items.length ? items : fallbackPlan(topic,sections),planner:items.length ? 'deepseek' : 'fallback'});
  } catch {
    return Response.json({items:fallbackPlan(topic,sections),planner:'fallback'});
  }
}
