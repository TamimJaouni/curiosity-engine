const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const makeCards=(path,rows)=>rows.map(([name,question,back])=>({
  id:'econ-'+slug(path.join('-')+'-'+name),
  world:'economics',
  name,
  path,
  pool:path[0],
  topic:path[path.length-1],
  hook:question,
  question,
  back,
  reveal:back
}));
