// OL-275: componentes reales con datos inventados; ninguna reproducción ni servicio externo.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let dir, server, browser, origin;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ol275-componentes-'));
  const mocks = {
    'next/link': "import React from 'react';export function useLinkStatus(){return {pending:false}};export default function Link(p){return <a {...p}/>}",
    'next/image': "import React from 'react';export default function Image({quality,...p}){return <img {...p}/>}",
  };
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, 'app.js'), jsx: 'automatic', stdin: { resolveDir: root, loader: 'tsx', contents: `
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import Destacados from './src/components/Destacados';import RenglonArtista from './src/components/RenglonArtista';
    import SeccionNovedades from './src/app/artistas/[id]/SeccionNovedades';
    import {tarjetaArtista} from './src/lib/destacados';import {incrustadoDeNovedad} from './src/lib/incrustado';
    import './src/app/globals.css';
    const creado_en = new Date(Date.now()-3600000).toISOString();
    const artista = { id:'a',slug:'artista',nombre:'Artista de muestra con un nombre largo para la fila',foto:'/foto.svg',disciplina:'musica',detalle:'Jazz',tipo:'solista',proxima:null,novedad:{novedad_id:'n1',proveedor:'youtube',creado_en} };
    const audio = {...artista,id:'b',slug:'sin-foto',foto:null,novedad:{novedad_id:'n2',proveedor:'soundcloud',creado_en}};
    const novedades = [1,2,3,4,5].map(i=>({id:'n'+i,titulo:'Publicación '+i,texto:null,creado_en,proveedor:'youtube',visible:i!==4,incrustado:incrustadoDeNovedad({proveedor:'youtube',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',embed_id:null})}));
    function App(){const [seguido,setSeguido]=useState(false);const [destino,setDestino]=useState(undefined);const [cargando,setCargando]=useState(false);const [fechas,setFechas]=useState(false);
      return <main style={{padding:20,paddingBottom:844}}>
        <Destacados tarjetas={[tarjetaArtista(artista),tarjetaArtista({...audio,foto:'/foto.svg'})]} forma="artista" encabezado="Artistas"/>
        <ul><RenglonArtista artista={audio} boton={{objeto:'artista',decidido:seguido,nombreAccesible:seguido?'Sigues':'Seguir',alTocar:()=>setSeguido(!seguido)}}/></ul>
        <button onClick={()=>{setCargando(true);setDestino('n5');setTimeout(()=>{setCargando(false);setFechas(true)},200)}}>Abrir quinta</button>
        <button onClick={()=>setDestino('n4')}>Apuntar a oculta</button>
        <button onClick={()=>setDestino('otra-ficha')}>Apuntar a otra ficha</button>
        <div aria-busy={cargando} style={{height:fechas?500:10}}>Fechas suspendidas</div><SeccionNovedades novedades={novedades} artistaNombre="Artista" hrefPublicar={null} hrefFicha="/artistas/artista" novedadId={destino}/>
      </main>}
    createRoot(document.getElementById('root')).render(<App/>);
  ` }, plugins: [{ name: 'dobles', setup(b) {
    b.onResolve({ filter: /^(next\/link|next\/image)$/ }, a => ({ path: a.path, namespace: 'doble' }));
    b.onLoad({ filter: /.*/, namespace: 'doble' }, a => ({ contents: mocks[a.path], loader: 'tsx', resolveDir: root }));
  } }] });
  const assets = new Map([
    ['/', ['text/html', '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ['/app.js', ['text/javascript', await readFile(join(dir, 'app.js'))]],
    ['/app.css', ['text/css', await readFile(join(dir, 'app.css'))]],
    ['/foto.svg', ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384"><rect width="384" height="384" fill="#aca89b"/></svg>']],
    ['/sin-foto.png', ['image/png', await readFile(join(root, 'public/sin-foto.png'))]],
  ]);
  server = createServer((req, res) => { const a = assets.get(req.url); res.writeHead(a ? 200 : 404, { 'Content-Type': a?.[0] || 'text/plain' }); res.end(a?.[1] || ''); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); if (dir) await rm(dir, { recursive: true, force: true }); });

for (const width of [320, 390]) test(`sellos, seguir y ancla exacta a ${width}`, async t => {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.route('https://**/*', r => r.fulfill({ contentType: 'text/html', body: '<p>Proveedor simulado, sin reproducción</p>' }));
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Artistas', exact: true }).waitFor();
  assert.match(await page.locator('a[href="/artistas/artista?novedad=n1"]').innerText(), /Nuevo video/);
  assert.match(await page.locator('a[href="/artistas/sin-foto?novedad=n2"]').innerText(), /Nuevo audio/);
  assert.match(await page.locator('a[href="/artistas/sin-foto"]').innerText(), /Nuevo audio/);
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Sigues', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(page.url()).pathname, '/', 'seguir no dispara el enlace del artista');
  assert.equal(await page.locator('#novedad-n5').count(), 0, 'fuera de las primeras tres');
  await page.getByRole('button', { name: 'Abrir quinta', exact: true }).click();
  await page.locator('#novedad-n5').waitFor();
  await page.waitForFunction(() => {const e=document.getElementById('novedad-n5');return !document.querySelector('[aria-busy="true"]')&&e&&e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<200;});
  assert.equal(await page.locator('#novedad-n5').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }), true);
  await page.getByRole('button', { name: 'Apuntar a oculta' }).click();
  assert.equal(await page.locator('#novedad-n4').count(), 0, 'un destino oculto no destapa la sección');
  await page.getByRole('button', { name: 'Apuntar a otra ficha' }).click();
  assert.equal(await page.locator('#novedad-n5').count(), 0, 'un destino ajeno no destapa publicaciones');
  const frames = await page.locator('iframe').evaluateAll(xs => xs.map(x => ({ src: x.src, allow: x.allow })));
  assert.ok(frames.every(f => !f.allow.includes('autoplay') && !/[?&](autoplay|auto_play)=(1|true)/.test(f.src)), 'el destino no activa reproducción');
  assert.deepEqual(errores, []);
});
