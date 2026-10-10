/** OL-359: la fila de círculos «Ahora» y las historias de Inicio, en Chrome real: anillos, apertura, avance con toques, cierre (Escape y deslizar),
 *  foco de vuelta, «Me interesa» con el marcador, «Ver ficha» y «Cómo llegar», y nada pintado sin eventos. Con «Reducir movimiento» (la historia no
 *  avanza sola: la prueba no depende del reloj de las animaciones). OL-371 (E7): a la misma hora, la cuenta atrás solo bajo el primer círculo. */
import {before,after,test} from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';
const root=fileURLToPath(new URL('../../../',import.meta.url));let dir,server,browser,origin;
const AHORA='2026-10-09T18:00:00-06:00';
before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'fila-ahora-'));
 const mocks={
 'next/image':"import React from 'react';export default function Image({quality,priority,...p}){return React.createElement('img',p)}",
 'next/link':"import React from 'react';export default function Link({replace,prefetch,...p}){return React.createElement('a',p)}",
 '@/app/eventos/acciones':"export async function cambiarAsistencia(id,estado){(window.guardados??=[]).push([id,estado]);return !window.fallar}",
 };
 await build({absWorkingDir:root,bundle:true,outfile:join(dir,'app.js'),jsx:'automatic',stdin:{resolveDir:root,loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import Fila from './src/components/inicio/FilaAhora';import './src/app/globals.css';
 const modo=new URLSearchParams(location.search).get('modo');const Z='America/Mexico_City';
 const h=(hora)=>new Date('2026-10-09T'+hora+':00-06:00').toISOString();
 const ev=(clave,hora,c={})=>({clave,id:clave,href:'/eventos/'+clave,titulo:'Evento '+clave,inicio:h(hora),fin:null,zona:Z,exposicion:false,cartel:null,sitio:'CEART',parte:null,destino:'CEART, San Luis Potosí',...c});
 const lleno=[ev('ahora','17:30',{cartel:'/cartel.svg',titulo:'Caracolas para Luciana'}),ev('rato','18:30'),ev('hoy','21:00',{destino:null}),ev('expo','09:00',{exposicion:true,fin:h('23:00'),horario:[{dias:[5],abre:'10:00',cierra:'22:00'}],inicio:'2026-09-01T16:00:00Z'})];
 // OL-371 (E7): tres «En un rato» que empiezan a la misma hora y otro a otro minuto de esa hora.
 const mismaHora=[lleno[0],ev('a','19:00'),ev('b','19:00'),ev('c','19:00'),ev('d','19:30'),lleno[2]];
 const eventos=modo==='vacio'?[ev('viejo','10:00')]:modo==='misma-hora'?mismaHora:lleno;
 createRoot(document.getElementById('root')).render(<main><Fila eventos={eventos} ahoraServidor='${AHORA}' asistencias={{}} conSesion={modo!=='sin-sesion'}/><a href='/otra'>Otra cosa</a></main>);
 `},plugins:[{name:'dobles',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js',resolveDir:root}));}}],loader:{'.png':'dataurl'}});
 const cartel='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1e40af"/><rect y="400" width="400" height="100" fill="#f97316"/></svg>';
 server=createServer(async(req,res)=>{if(req.url.startsWith('/app.')){const ext=req.url.startsWith('/app.css')?'css':'js';res.setHeader('content-type',ext==='css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.end(await readFile(join(dir,'app.'+ext)));}else if(req.url==='/cartel.svg'){res.setHeader('content-type','image/svg+xml');res.end(cartel);}else{res.setHeader('content-type','text/html; charset=utf-8');res.end('<link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),headless:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));if(dir)await rm(dir,{recursive:true,force:true});});
async function pagina(t,modo='lleno'){const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});t.after(()=>c.close());const p=await c.newPage();const errores=[];p.on('pageerror',e=>errores.push(e.message));t.after(()=>assert.deepEqual(errores,[]));p.setDefaultTimeout(5000);await p.clock.install({time:new Date(AHORA)});await p.goto(origin+'/?modo='+modo);return p;}
const circulos=(p)=>p.locator("section[aria-label='Lo de hoy'] button").evaluateAll(bs=>bs.map(b=>[b.dataset.anillo,b.innerText.trim()]));
/** Un toque de verdad: el centro del punto, con lo que haya encima (un velo invisible se lo comería). */
async function tocar(p,x,y){const encima=await p.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest('[role=dialog],section')?.getAttribute('aria-label'),[x,y]);await p.mouse.click(x,y);return encima;}
const titulo=(p)=>p.locator('[role=dialog]').evaluate(d=>d.querySelector('h2')?.textContent);

test('la fila: un círculo por evento, en el orden de urgencia y con su anillo; sin nada, no se pinta',async t=>{
 const p=await pagina(t);await p.getByRole('button',{name:/Caracolas/}).waitFor();
 assert.deepEqual(await circulos(p),[['ahora','Ahora'],['pronto','En 30 min'],['pronto','Último día'],['resto','21:00']]);
 const q=await pagina(t,'vacio');await q.getByRole('link',{name:'Otra cosa'}).waitFor();assert.equal(await q.locator("section[aria-label='Lo de hoy']").count(),0);
});

test('E7: a la misma hora, la cuenta atrás solo en el primero y la hora en los demás; el nombre accesible la conserva (con la hora visible delante) y el minuto solo mueve la cuenta',async t=>{
 const p=await pagina(t,'misma-hora');await p.getByRole('button',{name:/Caracolas/}).waitFor();
 const nombres=()=>p.locator("section[aria-label='Lo de hoy'] button").evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));
 // El primer pintado, sin esperar ningún temporizador.
 assert.deepEqual((await circulos(p)).map(c=>c[1]),['Ahora','En 1 h','19:00','19:00','En 1 h 30 min','21:00']);
 assert.deepEqual(await nombres(),['Ahora: Caracolas para Luciana','En 1 h: Evento a','19:00 · En 1 h: Evento b','19:00 · En 1 h: Evento c','En 1 h 30 min: Evento d','21:00 · Hoy: Evento hoy']);
 // Al minuto siguiente cambia la cuenta del primero y la de las 19:30; los otros dos siguen con la hora.
 await p.clock.runFor(60_000);await p.getByRole('button',{name:'En 59 min: Evento a'}).waitFor();
 assert.deepEqual((await circulos(p)).map(c=>c[1]),['Ahora','En 59 min','19:00','19:00','En 1 h 29 min','21:00']);
 assert.deepEqual((await nombres()).slice(1,4),['En 59 min: Evento a','19:00 · En 59 min: Evento b','19:00 · En 59 min: Evento c']);
});

test('tocar un círculo abre su historia; derecha avanza, izquierda vuelve, Escape cierra, el foco vuelve y el anillo se apaga',async t=>{
 const p=await pagina(t);const b=p.getByRole('button',{name:/^En 30 min/});const r=await b.boundingBox();
 await p.mouse.click(r.x+r.width/2,r.y+r.height/2);const d=p.getByRole('dialog',{name:'Historias de hoy'});await d.waitFor();
 assert.equal(await d.getAttribute('aria-modal'),'true');
 await p.waitForFunction(()=>document.querySelector('[role=dialog][data-abierta]'));
 // Con «Reducir movimiento» no pasa sola: en la CI el primer pintado sin `reducido` acababa la barra en 0,01 ms y saltaba a «Último día».
 await p.waitForTimeout(150);
 assert.match(await p.locator('[role=dialog] p').first().innerText(),/EN 30 MIN|En 30 min/i);
 assert.equal(await tocar(p,330,420),'Historias de hoy');
 assert.match(await p.locator('[role=dialog] p').first().innerText(),/Último día/i);
 await tocar(p,40,420);
 assert.match(await p.locator('[role=dialog] p').first().innerText(),/En 30 min/i);
 await p.keyboard.press('ArrowRight');assert.match(await p.locator('[role=dialog] p').first().innerText(),/Último día/i);
 await p.keyboard.press('Escape');await d.waitFor({state:'detached'});
 assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Último día: Evento expo');
 assert.deepEqual((await circulos(p)).map(c=>c[0]),['ahora','visto','visto','resto']);
 assert.deepEqual(JSON.parse(await p.evaluate(()=>sessionStorage.getItem('somosnosotros:ahora-vistos'))).sort(),['expo','rato']);
});

test('la historia con cartel lo enseña entero; sin cartel, tipográfica con el símbolo SN; deslizar hacia abajo cierra',async t=>{
 const p=await pagina(t);const b=p.getByRole('button',{name:/Caracolas/});const r=await b.boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height/2);
 await p.waitForFunction(()=>document.querySelector('[role=dialog][data-abierta]'));
 assert.equal(await p.getByRole('img',{name:'Cartel: Caracolas para Luciana'}).count(),1);
 assert.equal(await titulo(p),'Caracolas para Luciana');
 assert.equal(await p.locator('[role=dialog] canvas[data-quieto]').count(),1,'sin partículas con «Reducir movimiento»');
 await tocar(p,330,420);
 assert.equal(await p.locator('[role=dialog] img').count(),0);assert.equal(await p.locator('[role=dialog] svg path[d^="M654"]').count(),1,'el símbolo SN');
 assert.equal(await titulo(p),'Evento rato');
 await p.mouse.move(195,300);await p.mouse.down();await p.mouse.move(195,360);await p.mouse.move(195,480,{steps:4});await p.mouse.up();
 await p.getByRole('dialog').waitFor({state:'detached'});
 assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).overflow),'visible');
});

test('mantener pausa y soltar sigue en la misma; acabar la última vuelve a Inicio',async t=>{
 const p=await pagina(t);const b=p.getByRole('button',{name:/Hoy: /});const r=await b.boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height/2);
 await p.waitForFunction(()=>document.querySelector('[role=dialog][data-abierta]'));
 await p.mouse.move(200,420);await p.mouse.down();await p.clock.runFor(700);
 assert.equal(await p.locator('[role=dialog]').getAttribute('data-pausada'),'true');
 await p.mouse.up();assert.equal(await titulo(p),'Evento hoy');assert.equal(await p.locator('[role=dialog]').getAttribute('data-pausada'),null);
 await tocar(p,330,420);await p.getByRole('dialog').waitFor({state:'detached'});
});

test('acciones: «Me interesa» con el marcador se guarda sin pasar de historia; «Ver ficha» y «Cómo llegar» llevan a su sitio',async t=>{
 const p=await pagina(t);const b=p.getByRole('button',{name:/Caracolas/});const r=await b.boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height/2);
 await p.waitForFunction(()=>document.querySelector('[role=dialog][data-abierta]'));
 const m=p.getByRole('button',{name:'Me interesa'});const c=await m.boundingBox();
 assert.equal(await p.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest('button')?.getAttribute('aria-label'),[c.x+c.width/2,c.y+c.height/2]),'Me interesa');
 await p.mouse.click(c.x+c.width/2,c.y+c.height/2);
 const marcado=p.getByRole('button',{name:'Te interesa'});await marcado.waitFor();
 assert.equal(await marcado.getAttribute('aria-pressed'),'true');assert.equal(await marcado.locator('svg').getAttribute('fill'),'currentColor');
 assert.deepEqual(await p.evaluate(()=>window.guardados),[['ahora','me_interesa']]);
 assert.equal(await titulo(p),'Caracolas para Luciana');assert.equal(await p.getByRole('status').innerText(),'Te interesa');
 assert.equal(await p.getByRole('link',{name:'Ver ficha'}).getAttribute('href'),'/eventos/ahora');
 assert.equal(await p.getByRole('link',{name:'Cómo llegar'}).getAttribute('href'),'https://www.google.com/maps/dir/?api=1&destination=CEART%2C%20San%20Luis%20Potos%C3%AD');
 // Un fallo devuelve el marcador y lo dice.
 await p.evaluate(()=>{window.fallar=true});await marcado.click();await p.getByText('No se pudo guardar').waitFor();assert.equal(await p.getByRole('button',{name:'Te interesa'}).getAttribute('aria-pressed'),'true');
 // Sin sitio público (o reservado), no hay «Cómo llegar».
 await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');assert.equal(await titulo(p),'Evento hoy');assert.equal(await p.getByRole('link',{name:'Cómo llegar'}).count(),0);
});

test('sin sesión, «Me interesa» lleva a entrar y vuelve a la ficha con la acción',async t=>{
 const p=await pagina(t,'sin-sesion');const b=p.getByRole('button',{name:/Caracolas/});const r=await b.boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height/2);
 assert.equal(await p.getByRole('link',{name:'Me interesa'}).getAttribute('href'),'/entrar?siguiente=%2Feventos%2Fahora%3Faccion%3Dme_interesa');
});

test('el foco no sale de la historia con Tab',async t=>{
 const p=await pagina(t);const b=p.getByRole('button',{name:/Caracolas/});await b.focus();await p.keyboard.press('Enter');
 await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Cerrar');
 for(let i=0;i<6;i++){await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('[role=dialog]')),'paso '+i);}
 await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('[role=dialog]')));
});
