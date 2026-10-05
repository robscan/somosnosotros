const {tablas,rpcs}=await import(new URL('../../../../scripts/ops/auditoria-ui/respaldo-local/fixture.mjs',import.meta.url));
const ahora=Date.now(),hora=3600000,ns=[];
const uid=n=>'dddd0275-0000-4000-8000-'+String(n).padStart(12,'0');
const make=(artista,i,proveedor,h)=>({id:uid(i),artista_id:artista.id,proveedor,url:proveedor==='youtube'?'https://www.youtube.com/watch?v=dQw4w9WgXcQ':proveedor==='vimeo'?'https://vimeo.com/123456789':'https://soundcloud.com/muestra/pista',embed_id:null,titulo:'Publicación de muestra '+i,texto:'Datos inventados para verificar OL-275.',creado_en:new Date(ahora-h*hora).toISOString(),visible:true});
ns.push(make(tablas.artistas[0],1,'youtube',24),make(tablas.artistas[2],2,'soundcloud',1),make(tablas.artistas[1],3,'vimeo',3));
// Quinta publicación: destino dentro de Ver más, fuera de la primera pantalla.
for(let i=4;i<=7;i++)ns.push(make(tablas.artistas[2],i,'youtube',24*i));
tablas.novedades_artista=ns;
rpcs.novedades_recientes_artistas=({p_ciudad,p_ids})=>{
 const result=[];
 for(const a of tablas.artistas.filter(a=>a.visible&&a.ciudad===p_ciudad&&(!p_ids||p_ids.includes(a.id)))){
  const n=ns.filter(n=>n.artista_id===a.id&&n.visible&&new Date(n.creado_en)<=Date.now()&&new Date(n.creado_en)>Date.now()-168*hora).sort((a,b)=>Date.parse(b.creado_en)-Date.parse(a.creado_en)||b.id.localeCompare(a.id))[0];
  if(n)result.push({artista_id:a.id,novedad_id:n.id,proveedor:n.proveedor,creado_en:n.creado_en});
 }return result;
};
rpcs.artistas_destacados_novedades=({p_ciudad})=>{
 const news=rpcs.novedades_recientes_artistas({p_ciudad});
 return [tablas.artistas[0],tablas.artistas[2]].map((a,i)=>{const n=news.find(n=>n.artista_id===a.id);return{id:a.id,motivo:i?'novedad':'elegido',hasta:null,van:0,novedad_id:n?.novedad_id??null,proveedor:n?.proveedor??null,novedad_creado_en:n?.creado_en??null};});
};
await import(new URL('../../../../scripts/ops/auditoria-ui/respaldo-local/server.mjs',import.meta.url));
