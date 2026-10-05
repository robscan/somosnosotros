import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {tmpdir} from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const aqui=fileURLToPath(new URL('.',import.meta.url));
const root=path.resolve(aqui,'../../..');
const {chromium}=await import(pathToFileURL(root+'/node_modules/playwright-core/index.mjs').href);
const proofs=root+'/docs/rediseno/capturas-303';fs.mkdirSync(proofs,{recursive:true});
const child=[];const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:49767',NEXT_PUBLIC_SUPABASE_ANON_KEY:'llave-inventada',NEXT_PUBLIC_MAPBOX_TOKEN:'pk.inventado',RELOJ_FIJO:'2026-10-07T16:00:00Z',TZ:'America/Mexico_City',NODE_OPTIONS:'--require='+root+'/scripts/ops/auditoria-ui/reloj-fijo.cjs'};
function start(args){const h=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});let log='';h.stdout.on('data',x=>log+=x);h.stderr.on('data',x=>log+=x);h.registro=()=>log;child.push(h);return h;}
async function ready(url,h){for(let i=0;i<150;i++){if(h.exitCode!==null)throw Error(h.registro());try{if((await fetch(url)).status<500)return}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('no inició '+url+h.registro());}
(async()=>{
 let browser;const result={fuente:'app Next16.3.8 compilada, respaldo/proveedores/imágenes sintéticos; no Supabase remoto',pieza:'OL-276:36 entradas y12 capturas, mismos estilos',pantallas:[],errores:[]};
 try{
 const db=start([root+'/scripts/ops/auditoria-ui/respaldo-local/server.mjs','49767']);await ready('http://127.0.0.1:49767/rest/v1/artistas?select=id',db);
 const app=start([root+'/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','30476']);await ready('http://127.0.0.1:30476/',app);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of[320,390])for(const reducedMotion of['reduce','no-preference'])for(const ficha of[
  {tipo:'artista',ruta:'/artistas/orquesta-sinfonica-de-san-luis-potosi'},
  {tipo:'lugar',ruta:'/lugares/teatro-de-la-paz'},
  {tipo:'evento',ruta:'/eventos/lxs-colocaos-la-ultima-fogueada'},
 ]){
  const c=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion});
  await c.clock.setFixedTime(new Date('2026-10-07T16:00:00Z'));
  const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>result.errores.push(e.message));
  await p.route('**/_next/image?*',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#aca89b"/></svg>'}));
  await p.route('https://**/*',r=>r.request().resourceType()==='image'?r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#aca89b"/></svg>'}):r.abort());
  for(const entrada of['directa','recarga','tarjeta']){
   if(entrada==='directa')await p.goto('http://127.0.0.1:30476'+ficha.ruta);
   else if(entrada==='recarga')await p.reload();
   else{await p.goto('http://127.0.0.1:30476/');const a=p.locator('a[href="'+ficha.ruta+'"]');await a.first().click()}
   await p.locator('main h1').waitFor();await p.waitForLoadState('networkidle');
   await p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
   const m=await p.evaluate(()=>{const main=document.querySelector('main');let t=false;for(let el=main;el;el=el.parentElement){if(getComputedStyle(el).transform!=='none')t=true}return {ancho:document.documentElement.scrollWidth,x:main.getBoundingClientRect().x,transformado:t,h1:document.querySelector('main h1').innerText}});
   result.pantallas.push({tipo:ficha.tipo,width,reducedMotion,entrada,url:p.url(),...m});
   if(m.ancho!==width||m.x!==0||m.transformado)throw Error('ficha fuera '+JSON.stringify(m));
   if(entrada==='recarga')await p.screenshot({path:proofs+'/'+ficha.tipo+'-'+width+'-'+reducedMotion+'.png'});
  }
  await c.close();
 }
 if(result.errores.length)throw Error(JSON.stringify(result.errores));
 fs.writeFileSync(proofs+'/qa.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(e){console.log(JSON.stringify(result));for(let i=0;i<child.length;i++)fs.writeFileSync(path.join(tmpdir(),'ol276-qa-proceso-'+i+'.log'),child[i].registro());throw e;}finally{await browser?.close();for(const h of child)h.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
