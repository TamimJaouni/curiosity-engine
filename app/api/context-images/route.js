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

async function commonsSearch(query,seen) {
  const searchParams=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    list:'search',
    srsearch:query,
    srnamespace:'6',
    srlimit:'12'
  });

  const searchResponse=await fetch('https://commons.wikimedia.org/w/api.php?'+searchParams.toString(),{
    headers:{'User-Agent':'IntellectualOS/1.0 educational reader'}
  });
  if (!searchResponse.ok) return null;

  const searchData=await searchResponse.json();
  const titles=(searchData?.query?.search || [])
    .map(item => item.title)
    .filter(Boolean)
    .slice(0,10);

  if (!titles.length) return null;

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
  if (!infoResponse.ok) return null;

  const infoData=await infoResponse.json();
  const pages=Object.values(infoData?.query?.pages || {});

  for (const page of pages) {
    if (!page?.pageid || seen.has(page.pageid)) continue;
    const info=page.imageinfo?.[0];
    if (!info?.thumburl || !goodMime(info?.mime)) continue;

    const width=Number(info.thumbwidth || info.width || 0);
    const height=Number(info.thumbheight || info.height || 0);
    if (width && height && Math.min(width,height) < 220) continue;

    const meta=info.extmetadata || {};
    const license=stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
    const artist=stripHtml(meta.Artist?.value || meta.Credit?.value || '');
    const description=stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || '');
    const sourceUrl='https://commons.wikimedia.org/wiki/'+encodeURIComponent(String(page.title || '').replace(/ /g,'_'));

    seen.add(page.pageid);
    return {
      id:String(page.pageid),
      title:String(page.title || '').replace(/^File:/,''),
      imageUrl:info.thumburl,
      originalUrl:info.url || info.thumburl,
      sourceUrl,
      description:description.slice(0,360),
      artist:artist.slice(0,220),
      license:license.slice(0,120),
      width:width || null,
      height:height || null,
      provider:'Wikimedia Commons'
    };
  }

  return null;
}

async function wikipediaFallback(query,seen) {
  const params=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    generator:'search',
    gsrsearch:query,
    gsrlimit:'8',
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

  for (const page of pages) {
    const id='wiki-'+String(page.pageid || page.title || '');
    if (seen.has(id) || !page.thumbnail?.source) continue;
    seen.add(id);
    return {
      id,
      title:String(page.title || ''),
      imageUrl:page.thumbnail.source,
      originalUrl:page.original?.source || page.thumbnail.source,
      sourceUrl:page.fullurl || 'https://en.wikipedia.org/wiki/'+encodeURIComponent(String(page.title || '').replace(/ /g,'_')),
      description:'Illustration from the related Wikipedia article.',
      artist:'',
      license:'See source page for image license',
      width:page.thumbnail.width || null,
      height:page.thumbnail.height || null,
      provider:'Wikipedia'
    };
  }

  return null;
}

export async function POST(request) {
  let body;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:'INVALID_JSON'}, {status:400});
  }

  const items=Array.isArray(body?.items) ? body.items.slice(0,4) : [];
  if (!items.length) return Response.json({images:[]});

  const seen=new Set();
  const images=[];

  for (const item of items) {
    const id=clean(item?.id,120);
    const query=clean(item?.query,220);
    const fallbackQuery=clean(item?.fallbackQuery,180);
    if (!id || !query) continue;

    const variants=[
      query,
      fallbackQuery,
      query.replace(/\b(map|portrait|history|historical|important figures?)\b/gi,' ').replace(/\s+/g,' ').trim()
    ].filter((value,index,array) => value && array.indexOf(value) === index);

    let image=null;
    for (const variant of variants) {
      image=await commonsSearch(variant,seen);
      if (image) break;
    }

    if (!image) {
      for (const variant of variants) {
        image=await wikipediaFallback(variant,seen);
        if (image) break;
      }
    }

    if (image) images.push({sectionId:id,...image});
  }

  return Response.json({images});
}
