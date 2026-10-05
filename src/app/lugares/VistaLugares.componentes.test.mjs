/** OL-279: HTML y hydrateRoot de la Vista, Lista, Hoja, Fila y memoria reales. Solo se dobla Mapbox y los servicios externos.
 * Extras controlados, sin cuenta/red reales: encuadre tardío, sesión, revalidación sin remontar, filtros, ficha, ciudad y regreso.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../../', import.meta.url));
let browser, server, dir, origin;
const comunes = `
import React,{useState} from 'react';
import VistaLugares from './src/app/lugares/VistaLugares';import './src/app/globals.css';
export const ciudad={slug:'san-luis-potosi',nombre:'San Luis Potosí',centro:{lat:22.14,lng:-100.97},zoom:13,zona:'America/Mexico_City'};
export const lugares=Array.from({length:25},(_,i)=>({id:'l'+i,slug:'espacio-'+String(i).padStart(2,'0'),nombre:'Espacio '+String(i).padStart(2,'0'),tipo:i%2?'galeria':'museo',direccion:'Calle de prueba 123',lat:22.14+i*0.004,lng:-100.97,portada:null,proximo:null,privado:false}));
const pendientes=()=>new Promise(()=>{});
export const props={lugares,ciudad,ciudades:[{...ciudad,lugares:25,eventos:0}],extras:pendientes(),hoy:'2026-10-07',abrirFicha:async(id)=>{window.qa.fichas.push(id);return {cuerpo:<div data-cuerpo><ul data-datos><li>Datos públicos de prueba</li></ul><div style={{height:900}}>Contenido de la ficha</div></div>,opciones:null,seguir:null}}};
`;
const mocks = {
  'next/image': "import React from 'react';export default function Image({quality,fill,priority,unoptimized,...p}){return React.createElement('img',p)}",
  'next/link': "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
  'next/navigation': "export const useRouter=()=>({push(url){window.qa.rutas.push(url)},replace(){}});export const usePathname=()=>'/lugares';export const useSearchParams=()=>new URLSearchParams(typeof window==='undefined'?'':window.location.search);",
  '@/components/Mapa': `import React,{useEffect} from 'react';export default function Mapa(p){
    useEffect(()=>{window.qa.montajes++;return ()=>window.qa.desmontajes++},[]);
    window.qa.mapa=p;window.qa.encuadres.push(p.encuadre);
    return <div data-mapa-prueba style={{height:'100%'}}/>;
  }`,
  '@/app/lugares/acciones': "export async function cambiarSeguimiento(id,valor){window.qa.seguir.push({id,valor});return true}",
  '@/app/artistas/acciones': "export async function cambiarSeguimientoArtista(){return true}",
  '@/lib/useAvisosTelefono': "export function usePlataforma(){return null} export function useEstadoPush(){return [null,()=>{}]} export function useInstalarApp(){return {puede:false,instalar:async()=>false}}",
  '@/lib/pushCliente': "export function disponibilidadPush(){return 'no-soportado'} export async function suscribirPush(){return {ok:false,motivo:'fallo'}}",
  '@/app/avisos/acciones': "export async function elegirAvisos(){return true}",
  '@/app/perfil/acciones': "export async function guardarSuscripcionPush(){return true}",
  './HojaInstalar': 'export default function HojaInstalar(){return null}',
};
const plugin={name:'dobles',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'tsx',resolveDir:root}));}};
before(async()=>{
  dir=await mkdtemp(join(tmpdir(),'vista-lugares-ssr-'));
  await build({absWorkingDir:root,bundle:true,outfile:join(dir,'ssr.cjs'),platform:'node',format:'cjs',jsx:'automatic',stdin:{resolveDir:root,loader:'tsx',contents:comunes+`import {renderToString} from 'react-dom/server';export const pintar=()=>renderToString(<VistaLugares {...props}/>);`},plugins:[plugin]});
  const require=createRequire(import.meta.url);const html=require(join(dir,'ssr.cjs')).pintar();
  assert.equal((html.match(/href="\/lugares\/espacio-/g)||[]).length,20,'HTML real, antes de hidratar');
  await build({absWorkingDir:root,bundle:true,outfile:join(dir,'app.js'),jsx:'automatic',stdin:{resolveDir:root,loader:'tsx',contents:comunes+`
    import {hydrateRoot} from 'react-dom/client';import {guardarMemoria} from './src/lib/memoriaPantalla';
    window.qa={rutas:[],fichas:[],seguir:[],montajes:0,desmontajes:0,encuadres:[],errores:[]};
    function App(){const [p,setP]=useState(props);const [vez,setVez]=useState(0);
      window.qa.resolver=(conSesion=true)=>setP(x=>({...x,extras:Promise.resolve({conSesion,seguidos:conSesion?['l0']:null,avisos:conSesion?{cuenta:'cuenta-prueba',preguntado:true,correo:'p...@example.com',llavePush:''}:null,destacados:[{id:'l24'}]})}));
      window.qa.ciudad=()=>setP(x=>({...x,ciudad:{...ciudad,slug:'otra-ciudad',nombre:'Otra ciudad',centro:{lat:21,lng:-102}},lugares:[{...lugares[1],id:'otra',slug:'otro-espacio',nombre:'Otro espacio',lat:21,lng:-102}]}));
      window.qa.volver=()=>setVez(v=>v+1);
      window.qa.memoriaSoloSigo=()=>{guardarMemoria('/lugares',{estado:{conEventos:null,soloSigo:true,hoja:{ficha:null,detente:'asoma',y:0}}});setVez(v=>v+1)};
      return <VistaLugares key={vez} {...p}/>;
    }
    hydrateRoot(document.getElementById('root'),<App/>,{onRecoverableError:e=>window.qa.errores.push(String(e))});
  `},plugins:[plugin]});
  const assets=new Map([
    ['/', ['text/html', `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial;--barra-flujo:0px;--nav-abajo:0px}</style><div id="root">${html}</div><script src="/app.js"></script>`]],
    ['/app.js',['text/javascript',await readFile(join(dir,'app.js'))]],['/app.css',['text/css',await readFile(join(dir,'app.css'))]],
  ]);
  server=createServer((req,res)=>{const a=assets.get(req.url.split('?')[0]);res.writeHead(a?200:404,{'Content-Type':`${a?.[0]??'text/plain'}; charset=utf-8`});res.end(a?.[1]??'');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright-core');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));if(dir)await rm(dir,{recursive:true,force:true});});
async function abrir(width=390){const ctx=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});const page=await ctx.newPage();const errores=[];page.on('pageerror',e=>errores.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.qa?.resolver&&document.querySelector('section[aria-label="Lugares"]')&&(innerWidth>=792||document.querySelector('[data-hoja]')));return {ctx,page,errores};}
const lista=page=>page.locator('section[aria-label="Lugares"]');
async function resolver(page,conSesion=true){await page.evaluate(v=>window.qa.resolver(v),conSesion);await page.locator('[data-mapa-prueba]').waitFor();}
async function filtros(page){await page.getByRole('button',{name:'Filtros',exact:true}).click();return page.getByRole('dialog',{name:'Filtros'});}

for(const ancho of [320,390,1280])test(`HTML hidratado a ${ancho}: extras pendientes, después sesión y encuadre, sin remontar lista/mapa`,async()=>{
  const {ctx,page,errores}=await abrir(ancho);
  assert.equal(await lista(page).count(),1);assert.ok(await lista(page).locator('a[href^="/lugares/"]').count()>=20);
  assert.equal(await page.getByRole('button',{name:/^(Seguir|Sigues) —/}).count(),0);
  assert.equal(await page.locator('[data-mapa-prueba]').count(),0);
  await page.evaluate(()=>window.qa.lista=document.querySelector('section[aria-label="Lugares"]'));
  await resolver(page);
  assert.equal(await page.getByRole('button',{name:'Sigues — Espacio 00',exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>window.qa.lista===document.querySelector('section[aria-label="Lugares"]')),true);
  assert.equal(await page.evaluate(()=>window.qa.mapa.encuadre.puntos.some(p=>p.id==='l24')),true,'destacado lejano incluido al primer encuadre');
  await page.evaluate(()=>window.qa.resolver(false));
  await page.getByRole('button',{name:'Seguir — Espacio 00',exact:true}).waitFor({state:'attached'});
  assert.deepEqual(await page.evaluate(()=>[window.qa.montajes,window.qa.desmontajes]),[1,0]);
  assert.equal(await page.evaluate(()=>window.qa.lista===document.querySelector('section[aria-label="Lugares"]')),true);
  assert.deepEqual(await page.evaluate(()=>window.qa.errores),[]);assert.deepEqual(errores,[]);
  await ctx.close();
});

test('sesión: seguir, Solo lo que sigo, ficha y enlace modificado conservan su contrato',async()=>{
  const {ctx,page,errores}=await abrir();await resolver(page);
  const dlg=await filtros(page);await dlg.getByRole('switch',{name:'Solo lo que sigo'}).click();await dlg.getByRole('button',{name:'Ver 1 lugar',exact:true}).click();
  assert.equal(await lista(page).locator('a[href^="/lugares/"]').count(),1);
  await page.getByRole('button',{name:'Quitar Solo lo que sigo'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('section[aria-label="Lugares"] a').length>=20);
  const link=lista(page).locator('a[href="/lugares/espacio-00"]');
  assert.equal(await link.evaluate(a=>{
    let interceptado;
    // Después del handler real de React, contener la navegación nativa solo para mantener el navegador de prueba aquí.
    document.addEventListener('click',e=>{interceptado=e.defaultPrevented;e.preventDefault()},{once:true});
    a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));
    return interceptado;
  }),false,'click modificado no se intercepta');
  assert.deepEqual(await page.evaluate(()=>window.qa.fichas),[]);
  await link.click();await page.getByRole('article',{name:'Ficha de Espacio 00'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.qa.fichas),['espacio-00']);
  await page.getByRole('button',{name:'Cerrar la ficha'}).click();await page.locator('[data-ficha-hoja]').waitFor({state:'detached'});
  await page.evaluate(()=>window.qa.mapa.onGesto());
  await page.waitForFunction(()=>document.querySelector('[data-hoja]').dataset.hoja==='recogida');
  const tipo=await filtros(page);await tipo.getByRole('button',{name:/^Galería/}).click();await tipo.getByRole('button',{name:'Ver 12 lugares',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-hoja]').dataset.hoja==='asoma');
  assert.equal(await lista(page).locator('a').count(),12);assert.equal(new URL(page.url()).searchParams.get('tipo'),'galeria');
  await page.getByRole('button',{name:'Quitar Galería'}).click();
  await page.getByRole('button',{name:'Seguir — Espacio 01',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.qa.seguir),[{id:'l1',valor:true}]);assert.deepEqual(await page.evaluate(()=>window.qa.rutas),[]);
  assert.deepEqual(errores,[]);await ctx.close();
});

test('sin sesión: una memoria antigua de Solo lo que sigo no vacía la lista; Seguir lleva a Entrar',async()=>{
  const {ctx,page}=await abrir();await resolver(page,false);await page.evaluate(()=>window.qa.memoriaSoloSigo());
  await page.getByRole('button',{name:'Seguir — Espacio 00',exact:true}).waitFor({state:'attached'});
  assert.equal(await lista(page).locator('a').count(),20);
  const dlg=await filtros(page);assert.equal(await dlg.getByRole('switch',{name:'Solo lo que sigo'}).count(),0);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Seguir — Espacio 00',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.qa.rutas.at(-1)),'/entrar?siguiente=%2Flugares%2Fl0%3Faccion%3Dseguir');
  assert.deepEqual(await page.evaluate(()=>window.qa.seguir),[]);await ctx.close();
});

test('cambio de ciudad y regreso conservan hoja, enlaces y encuadre',async()=>{
  const {ctx,page}=await abrir();await resolver(page);await page.evaluate(()=>window.qa.ciudad());
  await lista(page).locator('a[href="/lugares/otro-espacio"]').waitFor({state:'attached'});
  await page.waitForFunction(()=>window.qa.mapa.encuadre.puntos.some(p=>p.id==='otra'));
  assert.equal(await lista(page).locator('a').count(),1);assert.equal(await page.evaluate(()=>window.qa.montajes),1);
  await lista(page).locator('a').click();await page.locator('[data-ficha-hoja]').waitFor();
  await page.evaluate(()=>window.qa.volver());await page.getByRole('article',{name:'Ficha de Otro espacio'}).waitFor();
  assert.ok(await page.evaluate(()=>window.qa.fichas.every(id=>id==='otro-espacio')));
  assert.deepEqual(await page.evaluate(()=>window.qa.errores),[]);await ctx.close();
});
