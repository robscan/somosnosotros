/** OL-422: la ceja de la tarjeta de Inicio nunca se corta. En las tres tallas (XL del carril estelar, grande de «Tus planes» y «Festivales y expos»,
 *  mediana de «Esta semana», «Nuevos eventos» y «Más adelante») y a 320, 390 y 430 de ancho, con la portada del sistema (festival, taller, expo) y
 *  con cartel: el texto de la ceja no sale de su caja ni de la tarjeta, baja de renglón en vez de cortarse, y el título empieza debajo. Con
 *  `CEJA_CAPTURAS=<carpeta>` guarda una captura por ancho y talla con las tarjetas en filas (solo para mirar; la prueba mide el carril real; `CEJA_FUENTE`, abajo). */
import {before,after,test} from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';
const root=fileURLToPath(new URL('../../../',import.meta.url));let dir,server,browser,origin;
// Lo que puede decir una ceja: la cuenta de actividades nuevas de un festival (OL-422: «7 nuevas»), una sesión de un taller, un día de varios, una
// serie y la expo sola; y la frase larga de antes («13 actividades nuevas»), que tampoco se puede cortar aunque ya no salga.
// La cuenta la escribe la función de la app (`textoNuevasCorto`): un número es «n nuevas».
const CEJAS=[['Festival',1],['Festival',7],['Festival',13],['Festival','13 actividades nuevas'],['Taller','Sesión 12 de 12'],['Exposición',null],['Festival','Día 12 de 14'],[null,'6 funciones']];
const ANCHOS=[320,390,430];
// La letra la pone next/font en la app (`--fuente-bricolage`); aquí, una de palo seco o, con `CEJA_FUENTE=<archivo>`, ese archivo (la Bricolage
// variable, para las capturas). Sin ella el `font-family` de la app no vale y saldría la de serifa.
const FUENTE=process.env.CEJA_FUENTE?'@font-face{font-family:"Bricolage local";src:url(/fuente);font-weight:200 800;font-stretch:75% 100%}:root{--fuente-bricolage:"Bricolage local"}':':root{--fuente-bricolage:sans-serif}';
before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'ceja-tarjeta-'));
 const mocks={
 'next/image':"import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
 'next/link':"import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({replace,prefetch,onNavigate,...p}){return React.createElement('a',p)}",
 };
 await build({absWorkingDir:root,bundle:true,outfile:join(dir,'app.js'),jsx:'automatic',stdin:{resolveDir:root,loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import Destacados from './src/components/Destacados';import{textoNuevasCorto}from'./src/lib/series';import './src/app/globals.css';
 const CEJAS=${JSON.stringify(CEJAS)};
 const cartel='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1e40af"/></svg>');
 const tarjeta=([clase,parte],i,conCartel)=>({id:(conCartel?'c':'s')+i,href:'/eventos/'+(conCartel?'c':'s')+i,foto:conCartel?cartel:null,titulo:'Festival Internacional de Danza Contemporánea del Centro',detalle:'Del 28 de oct al 2 de nov',sitio:'Centro Cultural Universitario Bicentenario',van:0,cuando:true,...(clase?{clase}:{}),...(parte?{parte:typeof parte==='number'?textoNuevasCorto(parte):parte}:{}),inicio:'2026-10-28T18:00:00Z',fin:'2026-11-03T06:00:00Z',zona:'America/Mexico_City'});
 // Cada ceja con la portada del sistema (sin cartel) y, la de un evento o una serie, también con cartel (la ceja va debajo de él).
 const tarjetas=[...CEJAS.map((c,i)=>tarjeta(c,i,false)),...CEJAS.map((c,i)=>[c,i]).filter(([[clase]])=>!clase).map(([c,i])=>tarjeta(c,i,true))];
 createRoot(document.getElementById('root')).render(<main>{['xl','grande','mediana'].map(forma=><div key={forma} data-forma={forma}><Destacados tarjetas={tarjetas} forma={forma} encabezado={'Talla '+forma} memoria={'ceja-'+forma}/></div>)}</main>);
 `},plugins:[{name:'dobles',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js',resolveDir:root}));}}],loader:{'.png':'dataurl'}});
 server=createServer(async(req,res)=>{if(req.url==='/fuente'){res.end(await readFile(process.env.CEJA_FUENTE));}else if(req.url.startsWith('/app.')){const ext=req.url.startsWith('/app.css')?'css':'js';res.setHeader('content-type',ext==='css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.end(await readFile(join(dir,'app.'+ext)));}else{res.setHeader('content-type','text/html; charset=utf-8');res.end(`<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/app.css"><style>${FUENTE}</style><div id="root"></div><script src="/app.js"></script>`);}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),headless:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));if(dir)await rm(dir,{recursive:true,force:true});});

// `letra`: 2 es la letra del teléfono al doble (OL-373; como `npm run medir -- --letra=2`, 32 px de fábrica).
async function pagina(t,ancho,letra=1){const c=await browser.newContext({viewport:{width:ancho,height:844},deviceScaleFactor:2});t.after(()=>c.close());const p=await c.newPage();const errores=[];p.on('pageerror',e=>errores.push(e.message));t.after(()=>assert.deepEqual(errores,[]));p.setDefaultTimeout(5000);await p.goto(origin);if(letra!==1)await p.addStyleTag({content:`html{font-size:${16*letra}px}`});await p.locator('[data-forma=mediana] a').first().waitFor();return p;}

/** Lo que vale para toda ceja: su texto no sale de su caja ni de la tarjeta, y el título empieza debajo. */
function sinCortes(cejas,ancho){
 for(const c of cejas){
  const donde=`${ancho} · ${c.forma} · ${c.tarjeta} · «${c.ceja}»`;
  assert.ok(c.ceja,`${donde}: sin ceja`);
  assert.ok(c.sobraCaja<=0.5,`${donde}: el texto sale ${c.sobraCaja} px de su caja`);
  assert.ok(c.sobraPadre<=0.5,`${donde}: el texto sale ${c.sobraPadre} px de la tarjeta`);
  assert.equal(c.tituloDebajo,true,`${donde}: el título no empieza debajo de la ceja`);
 }
}

/** Cada ceja de la página, medida: cuánto sale su texto de su caja y de la tarjeta (o de la zona del título, en la portada del sistema), cuántos
 *  renglones ocupa y si el título empieza debajo de ella. */
const medirCejas=(p)=>p.evaluate(()=>[...document.querySelectorAll('[data-forma]')].flatMap(carril=>[...carril.querySelectorAll('a[href^="/eventos/"]')].map(tarjeta=>{
 // La ceja: la única pieza de la tarjeta con la letra espaciada (como la busca la prueba de Inicio); el título, su `<b>`.
 const ceja=[...tarjeta.querySelectorAll('span')].find(s=>getComputedStyle(s).letterSpacing!=='normal'&&getComputedStyle(s).textTransform==='uppercase'&&s.parentElement.closest('span[style*="--base"],a')===s.parentElement);
 const titulo=[...tarjeta.querySelectorAll('b')].find(b=>!b.closest('[title]'));
 if(!ceja)return{tarjeta:tarjeta.getAttribute('href'),forma:carril.dataset.forma,ceja:null};
 const caja=ceja.getBoundingClientRect(),padre=ceja.parentElement.getBoundingClientRect(),cs=getComputedStyle(ceja);
 const r=document.createRange();r.selectNodeContents(ceja);const trozos=[...r.getClientRects()].filter(x=>x.width>0);
 const derecha=Math.max(...trozos.map(x=>x.right)),izquierda=Math.min(...trozos.map(x=>x.left));
 const renglones=new Set(trozos.map(x=>Math.round(x.top))).size;
 return{tarjeta:tarjeta.getAttribute('href'),forma:carril.dataset.forma,ceja:ceja.innerText.replace(/\s+/g,' '),
  // Lo que el texto pasa de su caja y de lo que tiene libre su padre (la tarjeta, o la portada menos el relleno de la zona del título).
  sobraCaja:Math.round(Math.max(derecha-caja.right,caja.left-izquierda,ceja.scrollWidth-ceja.clientWidth)*10)/10,
  sobraPadre:Math.round(Math.max(derecha-(padre.right-parseFloat(cs.marginRight)),(padre.left+parseFloat(cs.marginLeft))-izquierda)*10)/10,
  renglones,tituloDebajo:titulo?titulo.getBoundingClientRect().top>=caja.bottom-0.5:null};
})));

test('la ceja de la tarjeta mediana con «Festival · 13 nuevas» no desborda su caja a 320',async t=>{
 const p=await pagina(t,320);const c=(await medirCejas(p)).find(c=>c.forma==='mediana'&&c.tarjeta==='/eventos/s2');
 // El texto corto que decidió el founder (2026-10-19: «Puedes dejar solo 1 nueva. 7 nuevas.»), no «13 actividades nuevas».
 assert.equal(c?.ceja,'FESTIVAL · 13 NUEVAS');assert.ok(c.sobraCaja<=0.5,`el texto sale ${c.sobraCaja} px de su caja`);assert.ok(c.sobraPadre<=0.5,`el texto sale ${c.sobraPadre} px de la tarjeta`);assert.equal(c.tituloDebajo,true);
});

test('ninguna ceja se corta en las tres tallas a 320, 390 y 430: baja de renglón y el título va debajo',async t=>{
 for(const ancho of ANCHOS){
  const p=await pagina(t,ancho);const cejas=await medirCejas(p);
  // Se mide en el carril de verdad y luego, si se pide, la captura (antes de comprobar: así también se ve lo que falla).
  if(process.env.CEJA_CAPTURAS){
   // Solo para mirar: las tarjetas en filas (mismo ancho de columna que su carril) en vez de deslizarse.
   await p.evaluate(()=>{for(const ul of document.querySelectorAll('[data-forma] ul')){const col=getComputedStyle(ul).gridAutoColumns;ul.style.gridAutoFlow='row';ul.style.gridTemplateColumns=`repeat(auto-fill, ${col})`;ul.style.overflowX='visible';}});
   await p.evaluate(()=>document.fonts.ready);for(const forma of ['xl','grande','mediana'])await p.locator(`[data-forma=${forma}]`).screenshot({path:resolve(process.env.CEJA_CAPTURAS,`ceja-${ancho}-${forma}.png`)});
  }
  // Todas las tarjetas tienen ceja (la de cada caso, en mayúsculas y entera) en las tres tallas.
  assert.equal(cejas.length,3*(CEJAS.length+CEJAS.filter(([clase])=>!clase).length),`${ancho}: tarjetas`);
  sinCortes(cejas,ancho);
  // Cada parte se queda entera mientras quepa: en la mediana «FESTIVAL ·» arriba y la cuenta debajo, nunca «13» solo al final del primer renglón.
  const mediana=(texto)=>cejas.find(c=>c.forma==='mediana'&&c.ceja===texto);
  for(const texto of ['FESTIVAL · 1 NUEVA','FESTIVAL · 7 NUEVAS','FESTIVAL · 13 NUEVAS'])assert.ok(mediana(texto)?.renglones<=2,`${ancho}: «${texto}» en la mediana en ${mediana(texto)?.renglones} renglones`);
 }
});

test('con la letra del teléfono al doble (OL-373), a 320, ninguna ceja sale de su tarjeta: baja de renglón y, si una palabra no cabe sola, se parte',async t=>{
 const p=await pagina(t,320,2);const cejas=await medirCejas(p);
 assert.equal(cejas.length,3*(CEJAS.length+CEJAS.filter(([clase])=>!clase).length),'tarjetas');
 sinCortes(cejas,'320 · letra 2');
});
