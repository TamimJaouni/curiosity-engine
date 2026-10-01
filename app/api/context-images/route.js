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

async function searchCommons(query,seen) {
  const params=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    generator:'search',
    gsrsearch:query,
    gsrnamespace:'6',
    gsrlimit:'10',
    prop:'imageinfo',
    iiprop:'url|mime|extmetadata|size',
    iiurlwidth:'1200'
  });

  const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params.toString(),{
    headers:{'User-Agent':'IntellectualOS/1.0 (educational contextual image lookup)'}
  });
  if (!response.ok) return null;

  const data=await response.json();
  const pages=Object.values(data?.query?.pages || {});

  for (const page of pages) {
    if (seen.has(page.pageid)) continue;
    const info=page.imageinfo?.[0];
    const mime=String(info?.mime || '');
    if (!info?.thumburl || !/^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(mime)) continue;

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
      description:description.slice(0,320),
      artist:artist.slice(0,220),
      license:license.slice(0,120),
      width:info.thumbwidth || info.width || null,
      height:info.thumbheight || info.height || null,
      provider:'Wikimedia Commons'
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
    const query=clean(item?.query,300);
    if (!id || !query) continue;

    const variants=[
      query,
      query.replace(/\bimportant figures?\b/i,'').trim(),
      query+' history'
    ].filter((value,index,array) => value && array.indexOf(value) === index);

    let image=null;
    for (const variant of variants) {
      image=await searchCommons(variant,seen);
      if (image) break;
    }

    if (image) images.push({sectionId:id,...image});
  }

  return Response.json({images});
}
