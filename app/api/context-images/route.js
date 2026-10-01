export const revalidate = 86400;

function clean(value,max=300) {
  return String(value || '').trim().slice(0,max);
}

function stripHtml(value='') {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}

function goodMime(value='') {
  return /^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(String(value));
}

function words(value='') {
  return String(value).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ').split(/\s+/).filter(w => w.length >= 3);
}

const DECORATIVE=/\b(coat of arms|arms of|herald|heraldic|eagle|flag|banner|seal|logo|emblem|insignia|symbol|crest)\b/i;

function candidateScore(candidate,query,visualType) {
  const hay=(candidate.title+' '+candidate.description+' '+candidate.pageTitle).toLowerCase();
  const qWords=[...new Set(words(query))];
  let score=0;

  for (const token of qWords) {
    if (hay.includes(token)) score+=2;
  }

  if (DECORATIVE.test(hay)) score-=14;

  if (visualType === 'map') {
    if (/\b(map|atlas|territor|kingdom|empire|borders?|extent|route|campaign|migration)\b/i.test(hay)) score+=10;
    if (/\bportrait|bust|statue|coin|seal|flag|arms\b/i.test(hay)) score-=8;
    if (candidate.width && candidate.height && candidate.width > candidate.height) score+=2;
  }

  if (visualType === 'person') {
    if (/\b(portrait|bust|statue|mosaic|fresco|manuscript|depiction|painting|engraving|photograph|photo)\b/i.test(hay)) score+=9;
    if (/\bmap|flag|arms|seal|logo\b/i.test(hay)) score-=9;
    if (/\bcoin\b/i.test(hay)) score-=2;
    if (candidate.width && candidate.height && candidate.height >= candidate.width) score+=2;
  }

  if (visualType === 'place') {
    if (/\b(city|palace|church|mosque|temple|ruin|archaeolog|architecture|building|site|monument|fortress|castle|cathedral|street|interior|exterior)\b/i.test(hay)) score+=8;
    if (/\bflag|arms|seal|logo|emblem\b/i.test(hay)) score-=10;
  }

  if (visualType === 'artifact') {
    if (/\b(artifact|museum|weapon|armour|armor|ceramic|manuscript|textile|jewelry|jewellery|tool|vessel|sculpture|relief)\b/i.test(hay)) score+=7;
    if (/\bflag|arms|logo|emblem\b/i.test(hay)) score-=10;
  }

  if (visualType === 'event') {
    if (/\b(battle|campaign|route|migration|siege|revolt|revolution|treaty|map|painting|depiction)\b/i.test(hay)) score+=7;
    if (/\bflag|arms|seal|logo|emblem\b/i.test(hay)) score-=10;
  }

  if (candidate.width && candidate.height && Math.min(candidate.width,candidate.height) >= 500) score+=1;

  return score;
}

async function commonsCandidates(query) {
  const searchParams=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    list:'search',
    srsearch:query,
    srnamespace:'6',
    srlimit:'18'
  });

  const searchResponse=await fetch('https://commons.wikimedia.org/w/api.php?'+searchParams.toString(),{
    headers:{'User-Agent':'IntellectualOS/1.0 educational reader'}
  });
  if (!searchResponse.ok) return [];

  const searchData=await searchResponse.json();
  const titles=(searchData?.query?.search || []).map(item => item.title).filter(Boolean).slice(0,16);
  if (!titles.length) return [];

  const infoParams=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    titles:titles.join('|'),
    prop:'imageinfo',
    iiprop:'url|mime|extmetadata|size',
    iiurlwidth:'1200'
  });

  const infoResponse=await fetch('https://commons.wikimedia.org/w/api.php?'+infoParams.toString(),{
    headers:{'User-Agent':'IntellectualOS/1.0 educational reader'}
  });
  if (!infoResponse.ok) return [];

  const infoData=await infoResponse.json();
  const pages=Object.values(infoData?.query?.pages || {});
  const out=[];

  for (const page of pages) {
    const info=page.imageinfo?.[0];
    if (!page?.pageid || !info?.thumburl || !goodMime(info?.mime)) continue;

    const width=Number(info.thumbwidth || info.width || 0);
    const height=Number(info.thumbheight || info.height || 0);
    if (width && height && Math.min(width,height) < 220) continue;

    const meta=info.extmetadata || {};
    const description=stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || '');
    out.push({
      id:String(page.pageid),
      title:String(page.title || '').replace(/^File:/,''),
      pageTitle:String(page.title || ''),
      imageUrl:info.thumburl,
      originalUrl:info.url || info.thumburl,
      sourceUrl:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(String(page.title || '').replace(/ /g,'_')),
      description:description.slice(0,420),
      artist:stripHtml(meta.Artist?.value || meta.Credit?.value || '').slice(0,220),
      license:stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '').slice(0,120),
      width:width || null,
      height:height || null,
      provider:'Wikimedia Commons'
    });
  }

  return out;
}

async function bestCommons(query,visualType,seen) {
  const candidates=await commonsCandidates(query);
  const ranked=candidates
    .filter(item => !seen.has(item.id))
    .map(item => ({...item,_score:candidateScore(item,query,visualType)}))
    .filter(item => item._score >= 2)
    .sort((a,b) => b._score-a._score);

  const best=ranked[0];
  if (!best) return null;
  seen.add(best.id);
  delete best._score;
  return best;
}

async function wikipediaFallback(query,visualType,seen) {
  const params=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    generator:'search',
    gsrsearch:query,
    gsrlimit:'10',
    prop:'pageimages|info',
    piprop:'thumbnail|original|name',
    pithumbsize:'1200',
    inprop:'url'
  });

  const response=await fetch('https://en.wikipedia.org/w/api.php?'+params.toString(),{
    headers:{'User-Agent':'IntellectualOS/1.0 educational reader'}
  });
  if (!response.ok) return null;

  const data=await response.json();
  const pages=Object.values(data?.query?.pages || {});
  const ranked=[];

  for (const page of pages) {
    const id='wiki-'+String(page.pageid || page.title || '');
    if (seen.has(id) || !page.thumbnail?.source) continue;

    const pageImage=String(page.pageimage || '');
    const candidate={
      id,
      title:pageImage || String(page.title || ''),
      pageTitle:String(page.title || ''),
      imageUrl:page.thumbnail.source,
      originalUrl:page.original?.source || page.thumbnail.source,
      sourceUrl:page.fullurl || 'https://en.wikipedia.org/wiki/'+encodeURIComponent(String(page.title || '').replace(/ /g,'_')),
      description:'Image from the related Wikipedia article.',
      artist:'',
      license:'See source page for image license',
      width:page.thumbnail.width || null,
      height:page.thumbnail.height || null,
      provider:'Wikipedia'
    };

    const score=candidateScore(candidate,query,visualType);
    if (score >= 2) ranked.push({...candidate,_score:score});
  }

  ranked.sort((a,b) => b._score-a._score);
  const best=ranked[0];
  if (!best) return null;
  seen.add(best.id);
  delete best._score;
  return best;
}

export async function POST(request) {
  let body;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const items=Array.isArray(body?.items) ? body.items.slice(0,5) : [];
  if (!items.length) return Response.json({images:[]});

  const seen=new Set();
  const images=[];

  for (const item of items) {
    const sectionId=clean(item?.sectionId || item?.id,120);
    const visualType=['map','person','place','artifact','event'].includes(item?.visualType) ? item.visualType : 'place';
    const query=clean(item?.searchQuery || item?.query,260);
    const fallbackQuery=clean(item?.fallbackQuery,220);
    const reason=clean(item?.reason,320);
    if (!sectionId || !query) continue;

    const variants=[
      query,
      fallbackQuery && visualType === 'map' ? fallbackQuery+' historical map' : fallbackQuery,
      visualType === 'person' && fallbackQuery ? fallbackQuery+' portrait' : '',
      visualType === 'place' && fallbackQuery ? fallbackQuery+' architecture' : ''
    ].filter((value,index,array) => value && array.indexOf(value) === index);

    let image=null;
    for (const variant of variants) {
      image=await bestCommons(variant,visualType,seen);
      if (image) break;
    }

    if (!image) {
      for (const variant of variants) {
        image=await wikipediaFallback(variant,visualType,seen);
        if (image) break;
      }
    }

    if (image) {
      images.push({
        sectionId,
        visualType,
        reason,
        ...image
      });
    }
  }

  return Response.json({images});
}
