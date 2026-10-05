import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {tmpdir} from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const aqui=fileURLToPath(new URL('.',import.meta.url));
const root=path.resolve(aqui,'../../../..');
const {chromium}=await import(pathToFileURL(root+'/node_modules/playwright-core/index.mjs').href);
const proofs=root+'/docs/rediseno/capturas-302/fase2';fs.mkdirSync(proofs,{recursive:true});
const child=[];const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:64075',NEXT_PUBLIC_SUPABASE_ANON_KEY:'llave-inventada',NEXT_PUBLIC_MAPBOX_TOKEN:'pk.inventado',RELOJ_FIJO:'2026-10-07T16:00:00Z',TZ:'America/Mexico_City',NODE_OPTIONS:'--require='+root+'/scripts/ops/auditoria-ui/reloj-fijo.cjs'};
function start(args){const h=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});let log='';h.stdout.on('data',x=>log+=x);h.stderr.on('data',x=>log+=x);h.registro=()=>log;child.push(h);return h;}
async function ready(url,h){for(let i=0;i<150;i++){if(h.exitCode!==null)throw Error(h.registro());try{if((await fetch(url)).status<500)return}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('no inició '+url+h.registro());}
(async()=>{
 let browser;const result={fuente:'app Next16.3.8 compilada, respaldo/proveedores/imágenes sintéticos; no Supabase remoto',movimiento:'normal; reducido tiene fallo heredado separado OL-276',pantallas:[],errores:[]};
 try{
 const db=start([path.join(aqui,'respaldo.mjs'),'64075']);await ready('http://127.0.0.1:64075/rest/v1/artistas?select=id',db);
 const app=start([root+'/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','30475']);await ready('http://127.0.0.1:30475/',app);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of[320,390]){
  const c=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await c.clock.setFixedTime(new Date('2026-10-07T16:00:00Z'));
  const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>result.errores.push(e.message));
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#a6a79c"/><circle cx="600" cy="300" r="160" fill="#dcdbce"/><path d="M280 800Q280 420 600 420Q920 420 920 800" fill="#6d34c8"/></svg>';
  await p.route('**/_next/image?*',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
  await p.route('https://**/*',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><p>Proveedor simulado, sin reproducción</p>'}));
  async function captura(nombre){await p.waitForLoadState('networkidle');await p.evaluate(async()=>{await document.fonts.ready;await new Promise(ok=>{let n=0;const o=new MutationObserver(()=>n=0);o.observe(document.documentElement,{subtree:true,childList:true,attributes:true});function paso(){if(++n<30)return requestAnimationFrame(paso);o.disconnect();ok()}paso()})});await p.screenshot({path:proofs+'/'+nombre+'-'+width+'.png'});result.pantallas.push({nombre,width,url:p.url(),...await p.evaluate(()=>({scrollY,anchoDocumento:document.documentElement.scrollWidth,altoDocumento:document.documentElement.scrollHeight,bodyTexto:document.body.innerText.slice(0,120),main:document.querySelector('main')?.getBoundingClientRect().toJSON(),h1:document.querySelector('h1')?.getBoundingClientRect().toJSON(),destino:document.getElementById('novedad-'+new URL(location.href).searchParams.get('novedad'))?.getBoundingClientRect().toJSON(),elemento:document.elementFromPoint(30,30)?.tagName}))});}
  await p.goto('http://127.0.0.1:30475/');await p.getByRole('heading',{name:'Artistas destacadxs'}).waitFor();
  const news=p.locator('a[href*="?novedad="]');if(await news.count()!==2)throw Error('no llegaron las tarjetas '+await news.count());
  await p.getByRole('heading',{name:'Artistas destacadxs'}).scrollIntoViewIfNeeded();await captura('inicio');
  await news.nth(1).click();await p.locator('#novedad-dddd0275-0000-4000-8000-000000000002').waitFor();await captura('novedad-exacta');
  await p.reload();await p.locator('#novedad-dddd0275-0000-4000-8000-000000000002').waitFor();await captura('novedad-recarga');
  await p.goto('http://127.0.0.1:30475/artistas/pimpolina');await p.getByRole('heading',{name:'Pimpolina',exact:true}).waitFor();await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await captura('ficha');
  await p.goto('http://127.0.0.1:30475/artistas');await p.locator('a[href="/artistas/aaron-cadena"]').waitFor();await captura('lista');
  await p.goto('http://127.0.0.1:30475/artistas/pimpolina?novedad=dddd0275-0000-4000-8000-000000000007');await p.locator('#novedad-dddd0275-0000-4000-8000-000000000007').waitFor();await captura('novedad-fuera-de-tres');
  await c.close();
 }
 for(const x of result.pantallas){if(x.anchoDocumento!==x.width||x.main.x!==0)throw Error('desborde '+x.nombre);if(x.destino&&(x.destino.y<56||x.destino.y+x.destino.height>844))throw Error('destino fuera de pantalla '+x.nombre)}
 if(result.errores.length)throw Error(JSON.stringify(result.errores));
 fs.writeFileSync(proofs+'/qa.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(e){console.log(JSON.stringify(result));for(let i=0;i<child.length;i++)fs.writeFileSync(path.join(tmpdir(),'ol275-qa-proceso-'+i+'.log'),child[i].registro());throw e;}finally{await browser?.close();for(const h of child)h.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
