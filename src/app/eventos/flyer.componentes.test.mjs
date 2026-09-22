/** Componentes reales, Mapbox con estilo local, APIs simuladas. Ver bitacora 112. */
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const baseline = process.env.FLYER_BASELINE_REF;
const captures = process.env.FLYER_SCREENSHOTS;
let server, browser, dir, origin;
const mocks = {
  "./acciones": `
    export async function cupoDeCartel(){return {usadas:window.qa.rechazar?20:0,tope:20,sinTope:false,pedida:false}}
    export async function leerCartelAccion(){const q=window.qa;q.leyendo=true;await new Promise(r=>q.terminarLectura=r);return q.rechazar?{ok:false,sinCupo:true}:{ok:true,valores:q.ocr,lugarId:q.lugarId??null,quien:[{nombre:'Artista OCR'}]}}
    export async function pedirMasLecturas(){return {ok:false}}
    export async function zonaDelPunto(){return 'America/Mexico_City'}
  `,
  "@/lib/subirFoto": `export async function subirFoto(){return {url:'/nueva.png'}}`,
  "@/lib/ubicacion": `export async function leerUbicacion(){return new Promise(r=>window.qa.gps=r)}`,
  "@/lib/config": `export function configPublica(){return {mapboxToken:'pk.prueba-local',mapboxStyle:location.origin+'/mapa.json'}}`,
  "@/components/ui/Atras": `export function useTerminar(){return ()=>{}}`,
  "@/components/SalirSinPublicar": `export function useSalirSinPublicar(){return null}`,
  "@/lib/supabase/navegador": `export function clienteNavegador(){return null}`,
  "next/link": `import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}`,
  "next/navigation": `export function useRouter(){return {push(){},replace(){}}}export function usePathname(){return '/eventos/nuevo'}`,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "flyer-test-"));
  if (captures) await mkdir(captures, { recursive: true });
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
    stdin: { loader: "tsx", resolveDir: root, contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Form from './src/app/eventos/FormularioEvento';import './src/app/globals.css';
      import {validarEvento} from './src/lib/eventos';
      window.qa={ocr:{titulo:'Titulo OCR',inicio:'2026-11-01T20:00',fin:'2026-11-01T22:00',gratis:false,precio:'200',descripcion:'Descripcion OCR',enlace:'https://ocr.invalid',lugar:'Foro ficticio',direccion:'Calle Prueba 123, Ciudad de prueba'},...window.qaInicial};
      const root=createRoot(document.getElementById('root'));let montaje=0;
      async function guardar(_,fd){
        window.qa.intentos=(window.qa.intentos??0)+1;
        const entrada=Object.fromEntries(fd);
        // La imagen local del harness no es una URL Storage: no se prueba ese transporte aqui.
        const {datos,errores}=validarEvento({...entrada,imagen:''});
        if(Object.keys(errores).length)return {ok:false,errores};
        const {privado,...evento}=datos;window.qa.guardado={evento,privado};
        return {ok:true,id:'fixture',volver:'/fixture'};
      }
      function montar(){const q=window.qa;document.querySelector('h1').textContent=q.modo==='editar'?'Editar evento':'Nuevo evento';root.render(<Form key={montaje} accion={guardar} lugares={q.lugares??[]} modo={q.modo??'alta'} revision={q.revision} usuarioId="test" cartelActivo esAdmin cupo={{usadas:0,tope:20,sinTope:false,pedida:false}} evento={q.evento} privado={q.privado}/>)}
      window.qa.editar=()=>{Object.assign(window.qa,window.qa.guardado,{modo:'editar',revision:'2026-09-18T12:00:00Z'});montaje++;montar()};montar();
    ` },
    plugins: [{ name: "dobles", setup(b) {
      b.onResolve({ filter: /.*/ }, a => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "mock" }, a => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
      if (baseline) b.onLoad({ filter: /\/eventos\/(FormularioEvento|HojaDondeEs)\.tsx$/ }, a => ({ contents: execFileSync("git", ["show", `${baseline}:${a.path.slice(root.length)}`], { cwd: root, encoding: "utf8" }), loader: "tsx" }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main class="pagina"><h1 class="titulo">Nuevo evento</h1><div id="root"></div></main><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
    ["/anterior.png", ["image/png", await readFile(join(root, "public/sin-foto-ancha.png"))]],
    ["/nueva.png", ["image/png", await readFile(join(root, "public/sin-foto-ancha.png"))]],
    ["/mapa.json", ["application/json", JSON.stringify({ version: 8, sources: {}, layers: [{ id: "fondo-local", type: "background", paint: { "background-color": "#e3ece6" } }] })]],
  ]);
  server = createServer((req, res) => { const a = assets.get(req.url); res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` }); res.end(a?.[1] ?? ""); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE, args: ["--enable-unsafe-swiftshader"] });
});
after(async () => { await browser?.close(); if(server) await new Promise(r=>server.close(r)); if(dir) await rm(dir,{recursive:true,force:true}); });

const direccion = (nombre = "Calle Prueba 123", lat = 22.15, lng = -100.98) => ({ properties: { name: nombre, full_address: `${nombre}, Ciudad de prueba`, coordinates: { latitude: lat, longitude: lng }, context: { place: { name: "Ciudad de prueba" }, country: { name: "Mexico", country_code: "mx" } } } });
async function pantalla(t, width = 390, inicial = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage(); p.setDefaultTimeout(10_000);
  await p.addInitScript(inicial => {
    window.qaInicial = inicial;
    if(inicial.borrador){localStorage.setItem('somosnosotros:borrador-evento',JSON.stringify(inicial.borrador));sessionStorage.setItem('somosnosotros:borrador-evento:volver','1');}
  }, inicial);
  const errores = []; p.on("pageerror", e => { errores.push(e.message); console.error(e.message); });
  t.after(() => assert.deepEqual(errores, []));
  const red = { consultas: [], esperar: null, features: [direccion()], suggestions: [], recuperar: { features: [] }, status: 200 };
  await p.route("**/*", async r => {
    const u = new URL(r.request().url());
    if (u.origin === origin) return r.continue();
    if (u.hostname === "api.mapbox.com" && u.pathname.includes("/geocode/")) {
      red.consultas.push(u); const features = structuredClone(red.features);
      if (red.esperar) await red.esperar(u);
      return r.fulfill({ status:red.status, json: { features } });
    }
    if (u.hostname === "api.mapbox.com" && u.pathname.includes("/searchbox/")) {
      red.consultas.push(u);
      const json = structuredClone(u.pathname.includes("/retrieve/") ? red.recuperar : { suggestions: red.suggestions });
      if (red.esperar) await red.esperar(u);
      return r.fulfill({ json });
    }
    return r.abort();
  });
  await p.goto(origin); await p.getByLabel("Nombre del evento").waitFor();
  if(inicial.modo!=='editar') await p.waitForFunction(() => !document.querySelector('input[aria-label="Sube el cartel"]').disabled);
  return { p, red };
}
async function subir(p) {
  await p.locator('input[type="file"][aria-label]').setInputFiles({ name: "cartel.png", mimeType: "image/png", buffer: await readFile(join(root,"public/sin-foto-ancha.png")) });
  await p.waitForFunction(() => window.qa.leyendo);
}
async function terminar(p) { await p.evaluate(() => window.qa.terminarLectura()); await p.waitForFunction(() => !document.querySelector('[role="status"]')?.textContent.includes("Leyendo el cartel")); }
async function donde(p) { await p.locator("form > ul > li").filter({ has: p.locator("span",{hasText:/^Dónde$/}) }).getByRole("button").click(); }
async function foto(p, nombre) {
  if(captures) await p.screenshot({path:join(captures,nombre+".png"),fullPage:false});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}

for (const width of [390,1280]) test(`OCR y direccion, ${width}`, async t => {
  const {p,red} = await pantalla(t,width);
  await subir(p); await terminar(p); await donde(p);
  await p.getByRole("dialog",{name:"Es en otro sitio",exact:true}).waitFor();
  await p.locator("canvas.mapboxgl-canvas").waitFor();
  if (!baseline) {
    await p.getByRole("listbox",{name:"Direcciones encontradas"}).waitFor();
    assert.equal(red.consultas.some(u=>u.searchParams.get('q')==='Calle Prueba 123, Ciudad de prueba'),true);
    assert.equal(await p.locator('input[name="sitio_lat"]').inputValue(),"");
    const entrada=await p.getByLabel('Buscar la dirección').boundingBox();
    const lista=await p.getByRole('listbox',{name:'Direcciones encontradas'}).boundingBox();
    const lienzo=await p.locator('canvas.mapboxgl-canvas').boundingBox();
    assert.ok(entrada.y+entrada.height<=lista.y && lista.y+lista.height<=lienzo.y);
    assert.ok(lista.x>=0 && lista.x+lista.width<=width);
    const ubicame=await p.getByRole('button',{name:'Estoy aquí',exact:true}).boundingBox();
    const logo=await p.locator('.mapboxgl-ctrl-logo').boundingBox();
    assert.ok(ubicame.y+ubicame.height<=logo.y, 'Estoy aqui no tapa la atribucion del mapa');
  }
  await foto(p,`${baseline?'antes':'despues'}-direccion-${width}`);
  if (!baseline) {
    await p.getByRole("option",{name:/Calle Prueba 123/}).click();
    await p.locator('.mapboxgl-marker').waitFor();
    const pin=await p.locator('.mapboxgl-marker').boundingBox();
    const lienzo=await p.locator('canvas.mapboxgl-canvas').boundingBox();
    assert.ok(pin.width>0 && pin.height>0 && lienzo.height>100);
    assert.ok(pin.x>=lienzo.x && pin.x+pin.width<=lienzo.x+lienzo.width);
    assert.ok(pin.y>=lienzo.y && pin.y+pin.height<=lienzo.y+lienzo.height);
    assert.equal(await p.locator('input[name="sitio_lat"]').inputValue(),"22.15");
    assert.equal(await p.locator('input[name="sitio_lng"]').inputValue(),"-100.98");
    await foto(p,`despues-pin-${width}`);
    await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
    const datos=await valores(p);
    assert.equal(datos.sitio_texto,'Foro ficticio');
    assert.equal(datos.sitio_direccion,'Calle Prueba 123, Ciudad de prueba');
    assert.equal(datos.ciudad,'Ciudad de prueba');
  }
});

const actual = { skip: !!baseline };
async function valores(p) { return p.locator('form').evaluate(f=>Object.fromEntries([...new FormData(f)].filter(([,v])=>typeof v==='string'))); }
async function abrir(p,nombre) { await p.locator('form > ul > li').filter({has:p.locator('span',{hasText:new RegExp(`^${nombre}$`)})}).getByRole('button').first().click(); }
async function otroSitio(p) { await donde(p); await p.getByRole('button',{name:/Es en otro sitio/}).click(); }
function espera() { let resolver; const promesa = new Promise(r=>resolver=r); return {promesa, resolver}; }

test('OCR preserva todos los datos preexistentes y sitio reservado',actual,async t=>{
  const {p}=await pantalla(t,390,{evento:{titulo:'Manual',descripcion:'Descripcion manual',enlace:'https://manual.invalid',precio:'80',imagen:'/anterior.png',sitio_reservado:true,sitio_texto:'Casa amiga',inicio:'2026-11-01T20:00:00Z'},privado:{direccion:'Secreta 42',lat:22.2,lng:-100.8,indicaciones:'Porton'}});
  const antes=await valores(p); await subir(p); await terminar(p); const despues=await valores(p);
  for(const campo of ['titulo','descripcion','enlace','precio','gratis','inicio','fin','modo_sitio','sitio_texto','sitio_lat','sitio_lng','direccion_privada','privado_lat','privado_lng','indicaciones']) assert.equal(despues[campo],antes[campo],campo);
  assert.equal(despues.imagen,'/nueva.png');
  assert.equal(despues.sitio_texto.includes('Secreta'),false);
});

test('cartel sin titulo marca el campo del nombre como faltante, sin forzar el foco',actual,async t=>{
  const {p}=await pantalla(t,390,{ocr:{titulo:'',inicio:'2026-11-01T20:00',fin:'2026-11-01T22:00',gratis:false,precio:'200',descripcion:'Descripcion OCR',enlace:'https://ocr.invalid',lugar:'Foro ficticio',direccion:'Calle Prueba 123, Ciudad de prueba'}});
  await subir(p); await terminar(p);
  const campo=p.getByLabel('Nombre del evento');
  assert.equal(await campo.inputValue(),'');
  assert.equal(await campo.getAttribute('placeholder'),'Falta el nombre');
  assert.equal(await campo.getAttribute('aria-describedby'),'nota-nombre-evento');
  assert.equal(await campo.evaluate(el=>getComputedStyle(el).borderStyle),'dashed');
  assert.equal(await campo.evaluate(el=>el===document.activeElement),false);
  const nota=p.locator('#nota-nombre-evento');
  assert.equal(await nota.textContent(),'Falta el nombre.');
  assert.equal(await nota.getAttribute('role'),null);
  await p.getByText('Revisa el nombre y publica.',{exact:true}).waitFor();
  await foto(p,'cartel-sin-titulo-390');
  await campo.fill('Ya tiene nombre');
  assert.equal(await campo.getAttribute('placeholder'),'Nombre del evento');
  assert.equal(await campo.getAttribute('aria-describedby'),null);
  assert.equal(await campo.evaluate(el=>getComputedStyle(el).borderStyle),'solid');
  assert.equal(await p.locator('#nota-nombre-evento').count(),0);
});

test('gestos tardios, borrar y elegir gratis ganan al OCR',actual,async t=>{
  const {p}=await pantalla(t); await subir(p);
  await p.getByLabel('Nombre del evento').fill('Nombre manual'); await p.getByLabel('Nombre del evento').fill('');
  await abrir(p,'Cuándo'); await p.getByLabel('Fecha en que empieza').fill('2026-12-12'); await p.getByLabel('Hora en que empieza').fill('18:15');
  await abrir(p,'Cuánto'); await p.getByRole('button',{name:'Con costo',exact:true}).click(); await p.getByLabel('Precio',{exact:true}).fill('350'); await p.getByRole('button',{name:'Gratis',exact:true}).click();
  await abrir(p,'Quién'); await p.getByLabel('Nombre del artista o grupo').fill('Artista manual'); await p.getByRole('option',{name:/Crear a/}).click();
  await abrir(p,'Más'); await p.getByLabel('Descripción',{exact:true}).fill('A mano'); await p.getByLabel('Enlace',{exact:true}).fill('https://manual.invalid');
  const antes=await valores(p); await terminar(p); const despues=await valores(p);
  for(const campo of ['titulo','inicio','fin','gratis','precio','descripcion','enlace','quien']) assert.equal(despues[campo],antes[campo],campo);
});

test('reservar mientras espera OCR conserva alias, direccion y pin privados',actual,async t=>{
  const {p}=await pantalla(t); await subir(p); await otroSitio(p);
  await p.getByLabel('Nombre del sitio',{exact:true}).fill('Casa amiga'); await p.getByRole('switch',{name:'Sitio reservado'}).click();
  await p.getByLabel('Dirección exacta').fill('Secreta 42'); await p.getByRole('listbox',{name:'Direcciones encontradas'}).getByRole('option').first().click();
  const antes=await valores(p); await terminar(p); const despues=await valores(p);
  for(const campo of ['modo_sitio','sitio_texto','direccion_privada','privado_lat','privado_lng','sitio_lat','sitio_lng']) assert.equal(despues[campo],antes[campo],campo);
  assert.equal(despues.sitio_lat,''); assert.equal(despues.sitio_lng,''); assert.equal(despues.sitio_texto,'Casa amiga');
  await foto(p,'despues-reservado-390');
});

for(const posterior of [false,true]) test(`sin cupo despues de subir conserva imagen ${posterior?'posterior':'anterior'}`,actual,async t=>{
  const {p}=await pantalla(t,390,{evento:{titulo:'Manual',imagen:'/anterior.png'}}); await subir(p);
  assert.equal((await valores(p)).imagen,'/anterior.png');
  if(posterior){await abrir(p,'Más'); await p.getByLabel('O pega la dirección de una imagen').fill('https://imagen.invalid/posterior.png');}
  await p.evaluate(()=>{window.qa.rechazar=true;}); await terminar(p);
  assert.equal((await valores(p)).imagen,posterior?'https://imagen.invalid/posterior.png':'/anterior.png');
  assert.equal((await valores(p)).titulo,'Manual');
  assert.equal(await p.locator('input[type="file"][aria-label]').count(),0);
});

test('imagen manual elegida mientras lee tambien gana a OCR exitoso',actual,async t=>{
  const {p}=await pantalla(t); await subir(p); await abrir(p,'Más');
  await p.getByLabel('O pega la dirección de una imagen').fill('https://imagen.invalid/manual.png');
  await terminar(p); assert.equal((await valores(p)).imagen,'https://imagen.invalid/manual.png');
});

test('busqueda local acepta calle y numero, no solo nombre del recinto',actual,async t=>{
  const {p}=await pantalla(t,390,{lugares:[{id:'uno',nombre:'Foro uno',direccion:'Obregon 123',zona:'America/Mexico_City'},{id:'dos',nombre:'Foro dos',direccion:'Sur 8',zona:'America/Mexico_City'}]});
  await donde(p); await p.getByRole('dialog').getByLabel('Buscar el lugar').fill('obregon 123');
  assert.equal(await p.getByRole('listbox',{name:'Lugares registrados'}).getByRole('option').count(),1);
  await p.getByRole('option',{name:/Foro uno/}).click(); assert.equal((await valores(p)).lugar_id,'uno');
});

test('direcciones ambiguas no ponen pin hasta elegir y escribir de nuevo lo retira',actual,async t=>{
  const {p,red}=await pantalla(t); red.features=[direccion('Primera',22.1,-100.1),direccion('Segunda',22.2,-100.2)];
  await otroSitio(p); await p.getByLabel('Nombre del sitio',{exact:true}).fill('Foro manual'); await p.getByLabel('Buscar la dirección').fill('Calle ambigua');
  await p.getByRole('listbox',{name:'Direcciones encontradas'}).waitFor(); assert.equal((await valores(p)).sitio_lat,'');
  await p.getByRole('option',{name:/Segunda/}).click(); assert.equal((await valores(p)).sitio_lat,'22.2'); assert.match((await valores(p)).sitio_texto,/Foro manual/);
  await p.getByLabel('Buscar la dirección').fill('Otra direccion'); assert.equal((await valores(p)).sitio_lat,'');
});

test('forward tardio no repone sugerencias anteriores',actual,async t=>{
  const {p,red}=await pantalla(t); const vieja=espera();
  red.esperar=u=>u.searchParams.get('q')==='Primera'?vieja.promesa:Promise.resolve();
  red.features=[direccion('Primera')]; await otroSitio(p); await p.getByLabel('Buscar la dirección').fill('Primera');
  await p.waitForTimeout(450); assert.equal(red.consultas.some(u=>u.searchParams.get('q')==='Primera'),true);
  red.features=[direccion('Segunda')]; await p.getByLabel('Buscar la dirección').fill('Segunda'); await p.getByRole('option',{name:/Segunda/}).waitFor();
  vieja.resolver(); await p.waitForTimeout(100); assert.equal(await p.getByRole('option',{name:/Primera/}).count(),0);
});

test('reverse tardio no pisa direccion escrita despues ni revive el pin',actual,async t=>{
  const {p,red}=await pantalla(t); await otroSitio(p); await p.getByLabel('Buscar la dirección').fill('Inicial'); await p.getByRole('option').first().click(); await p.locator('.mapboxgl-marker').waitFor();
  const vieja=espera(); red.esperar=u=>u.pathname.endsWith('/reverse')?vieja.promesa:Promise.resolve();
  const canvas=p.locator('canvas.mapboxgl-canvas'); const bounds=await canvas.boundingBox();
  await canvas.click({position:{x:bounds.width*0.7,y:bounds.height*0.5}}); await p.waitForTimeout(100); assert.equal(red.consultas.some(u=>u.pathname.endsWith('/reverse')),true);
  await p.getByLabel('Buscar la dirección').fill('Direccion escrita despues'); vieja.resolver(); await p.waitForTimeout(100);
  assert.equal(await p.getByLabel('Buscar la dirección').inputValue(),'Direccion escrita despues'); assert.equal((await valores(p)).sitio_lat,'');
});

test('Search Box recupera la opcion seleccionada con la misma sesion',actual,async t=>{
  const {p,red}=await pantalla(t);
  red.suggestions=[{mapbox_id:'prueba',name:'Foro encontrado',full_address:'Calle 9',feature_type:'poi'}];
  red.recuperar={features:[{geometry:{coordinates:[-100.9,22.1]},properties:{full_address:'Calle 9',context:{place:{name:'Ciudad de prueba'}}}}]};
  await donde(p); await p.getByRole('dialog').getByLabel('Buscar el lugar').fill('Foro Calle 9');
  await p.getByRole('option',{name:/Foro encontrado/}).click(); await p.getByLabel('Nombre del sitio',{exact:true}).waitFor();
  assert.equal((await valores(p)).sitio_lat,'22.1');
  const [a,b]=red.consultas.filter(u=>u.pathname.includes('/searchbox/')); assert.equal(a.searchParams.get('session_token'),b.searchParams.get('session_token')); assert.ok(a.searchParams.get('session_token'));
});

test('retrieve tardio no pisa el sitio que se escribe despues',actual,async t=>{
  const {p,red}=await pantalla(t); const vieja=espera();
  red.suggestions=[{mapbox_id:'prueba',name:'Foro viejo',full_address:'Calle 9',feature_type:'poi'}];
  red.recuperar={features:[{geometry:{coordinates:[-100.9,22.1]},properties:{full_address:'Calle 9'}}]};
  red.esperar=u=>u.pathname.includes('/retrieve/')?vieja.promesa:Promise.resolve();
  await donde(p); await p.getByRole('dialog').getByLabel('Buscar el lugar').fill('Foro viejo'); await p.getByRole('option',{name:/Foro viejo/}).click();
  await p.getByRole('button',{name:/Es en otro sitio/}).click(); await p.getByLabel('Nombre del sitio',{exact:true}).fill('Mi sitio posterior');
  vieja.resolver(); await p.waitForTimeout(100); assert.equal((await valores(p)).sitio_texto,'Mi sitio posterior'); assert.equal((await valores(p)).sitio_lat,'');
});

test('HTTP fallido se distingue de cero opciones y permite buscar otra vez',actual,async t=>{
  const {p,red}=await pantalla(t); red.status=503; await otroSitio(p); await p.getByLabel('Buscar la dirección').fill('Inicial');
  await p.getByRole('alert').filter({hasText:'No pude buscar'}).waitFor(); assert.equal((await valores(p)).sitio_lat,'');
  red.status=200; await p.getByLabel('Buscar la dirección').fill('Inicial corregida'); await p.getByRole('option').first().click();
  assert.equal((await valores(p)).sitio_lat,'22.15'); assert.equal(await p.getByRole('alert').count(),0);
});

test('GPS tardio no reemplaza la direccion seleccionada despues',actual,async t=>{
  const {p}=await pantalla(t); await otroSitio(p); await p.getByRole('button',{name:'Estoy aquí',exact:true}).click();
  await p.waitForFunction(()=>!!window.qa.gps);
  await p.getByLabel('Buscar la dirección').fill('Calle Prueba'); await p.getByRole('option').first().click();
  await p.evaluate(()=>window.qa.gps({lat:1,lng:2})); await p.waitForTimeout(100);
  assert.equal((await valores(p)).sitio_lat,'22.15'); assert.equal((await valores(p)).sitio_lng,'-100.98');
});

test('cambiar a reservado descarta forward pendiente y elimina coordenadas publicas',actual,async t=>{
  const {p,red}=await pantalla(t); const vieja=espera(); red.esperar=()=>vieja.promesa;
  await otroSitio(p); await p.getByLabel('Nombre del sitio',{exact:true}).fill('Casa amiga'); await p.getByLabel('Buscar la dirección').fill('Secreta 42');
  await p.waitForTimeout(450); await p.getByRole('switch',{name:'Sitio reservado'}).click(); vieja.resolver(); await p.waitForTimeout(100);
  const v=await valores(p); assert.equal(v.sitio_texto,'Casa amiga'); assert.equal(v.direccion_privada,'Secreta 42'); assert.equal(v.sitio_lat,'');
  assert.equal(await p.getByRole('listbox',{name:'Direcciones encontradas'}).count(),0);
});

test('borrador restaurado conserva direccion y gestos frente al OCR',actual,async t=>{
  const borrador={titulo:'Borrador',inicio:'2026-12-12T18:15',fin:'',gratis:true,precio:'',descripcion:'Texto',enlace:'',imagen:'/anterior.png',modoSitio:'otro',lugarId:'',quien:[],otro:{reservado:false,sitioTexto:'Foro manual',direccion:'Calle manual 7',sitioPunto:{lat:22.2,lng:-100.2},direccionPrivada:'',privadoPunto:null,revelarHoras:24,indicaciones:'',ciudad:'Ciudad manual'}};
  const {p}=await pantalla(t,390,{borrador}); await p.waitForFunction(()=>document.querySelector('input[name="titulo"]').value==='Borrador');
  const antes=await valores(p); await subir(p); await terminar(p); const despues=await valores(p);
  for(const campo of ['titulo','inicio','gratis','descripcion','sitio_texto','sitio_lat','sitio_lng','ciudad']) assert.equal(despues[campo],antes[campo],campo);
});

test('empezar una URL manual incompleta ya impide reemplazar la imagen',actual,async t=>{
  const {p}=await pantalla(t,390,{evento:{imagen:'/anterior.png'}}); await subir(p); await abrir(p,'Más');
  await p.getByLabel('O pega la dirección de una imagen').fill('https:'); await terminar(p);
  assert.equal((await valores(p)).imagen,'/anterior.png');
});

async function guardarYEditar(p) {
  await p.locator('form button[type="submit"]').click();
  await p.waitForFunction(()=>!!window.qa.guardado);
  await p.evaluate(()=>{window.qa.editar();window.qa.guardado=null;});
  await p.locator('input[name="revision"]').waitFor({state:'attached'});
  await p.waitForFunction(()=>document.querySelector('form button[type="submit"]').textContent.includes('Guardar cambios'));
}

test('alta, guardar y remontar edicion conserva nombre y reemplaza solo direccion',actual,async t=>{
  const {p,red}=await pantalla(t); await subir(p); await terminar(p); await donde(p);
  await p.getByRole('option',{name:/Calle Prueba 123/}).click(); await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  await guardarYEditar(p); await donde(p);
  assert.equal(await p.getByLabel('Nombre del sitio',{exact:true}).inputValue(),'Foro ficticio');
  assert.equal(await p.getByLabel('Buscar la dirección').inputValue(),'Calle Prueba 123, Ciudad de prueba');
  red.features=[direccion('Nueva calle 456',22.4,-100.4)];
  await p.getByLabel('Buscar la dirección').fill('Nueva calle'); await p.getByRole('option',{name:/Nueva calle/}).click();
  await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click(); await guardarYEditar(p);
  const v=await valores(p); assert.equal(v.sitio_texto,'Foro ficticio'); assert.equal(v.sitio_direccion,'Nueva calle 456, Ciudad de prueba');
  assert.equal(v.sitio_lat,'22.4'); assert.equal(v.sitio_direccion.includes('Prueba 123'),false);
  await donde(p); await foto(p,'roundtrip-edicion-390');
});

test('publico guardado se reserva tras remontar sin filtrar direccion en alias',actual,async t=>{
  const {p}=await pantalla(t,1280); await subir(p); await terminar(p); await donde(p);
  await p.getByRole('option',{name:/Calle Prueba 123/}).click(); await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  await guardarYEditar(p); await donde(p); await p.getByRole('switch',{name:'Sitio reservado'}).click();
  await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click(); await guardarYEditar(p);
  const v=await valores(p); assert.equal(v.sitio_texto,'Foro ficticio'); assert.equal(v.sitio_direccion,''); assert.equal(v.sitio_lat,''); assert.equal(v.sitio_lng,'');
  assert.equal(v.direccion_privada,'Calle Prueba 123, Ciudad de prueba'); assert.equal(v.privado_lat,'22.15');
  await donde(p); await foto(p,'roundtrip-reservado-1280');
});

const legacy={titulo:'Evento anterior',sitio_texto:'Foro · Patio · Calle vieja 8',sitio_direccion:null,inicio:'2026-12-12T18:00:00Z'};
for(const estado of ['HTTP','vacio']) test(`legacy con direccion editada y ${estado} no conserva pin ni confirma al cerrar`,actual,async t=>{
  const {p,red}=await pantalla(t,390,{modo:'editar',evento:{...legacy,sitio_lat:22,sitio_lng:-100},revision:'2026-09-18T12:00:00Z'});
  await donde(p); if(estado==='HTTP')red.status=503;else red.features=[];
  await p.getByLabel('Buscar la dirección').fill('Calle nueva desconocida'); await p.getByRole('alert').waitFor();
  assert.equal(await p.getByLabel('Nombre del sitio',{exact:true}).inputValue(),'');
  assert.equal((await valores(p)).sitio_lat,''); assert.equal((await valores(p)).sitio_direccion,'Calle nueva desconocida');
  if(estado==='HTTP') await foto(p,'legacy-error-390');
  await p.getByLabel('Nombre del sitio',{exact:true}).fill('Foro · Patio');
  assert.equal(await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).isDisabled(),true);
  await p.getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),true);
  await p.locator('form').evaluate(f=>f.requestSubmit()); await p.getByRole('dialog').waitFor();
  assert.equal(await p.evaluate(()=>window.qa.intentos??0),0);
  red.status=200;red.features=[direccion('Calle resuelta')]; await p.getByLabel('Buscar la dirección').fill('Calle resuelta');
  await p.getByRole('option',{name:/Calle resuelta/}).click(); await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),false);
  assert.equal((await valores(p)).sitio_texto,'Foro · Patio');
});

test('legacy intacto sin pin se edita; reservar exige alias nuevo sin parsear',actual,async t=>{
  const {p}=await pantalla(t,390,{modo:'editar',evento:legacy,revision:'2026-09-18T12:00:00Z'});
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),false);
  await donde(p); assert.equal(await p.getByLabel('Nombre del sitio',{exact:true}).inputValue(),legacy.sitio_texto);
  await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  assert.equal((await valores(p)).sitio_texto,legacy.sitio_texto);
  await donde(p); await p.getByRole('switch',{name:'Sitio reservado'}).click();
  assert.equal(await p.getByLabel('Cómo se anuncia').inputValue(),''); assert.equal((await valores(p)).sitio_texto,'');
  await p.getByLabel('Cómo se anuncia').fill('Casa amiga'); await p.getByLabel('Dirección exacta').fill('Secreta 42');
  await p.getByRole('listbox',{name:'Direcciones encontradas'}).getByRole('option').first().click(); await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  assert.equal((await valores(p)).sitio_texto,'Casa amiga'); assert.equal((await valores(p)).sitio_direccion,'');
});

for(const cerrar of ['Escape','fondo']) test(`cerrar por ${cerrar} no confirma direccion pendiente`,actual,async t=>{
  const {p,red}=await pantalla(t,1280,{modo:'editar',evento:{...legacy,sitio_texto:'Foro',sitio_direccion:'Calle anterior',sitio_lat:22,sitio_lng:-100}});
  red.features=[]; await donde(p); await p.getByText('Arrastra el pin o toca el mapa para ajustar.',{exact:true}).waitFor(); await p.getByLabel('Buscar la dirección').fill('Otra');
  if(cerrar==='Escape')await p.keyboard.press('Escape');else await p.getByRole('dialog').locator('..').click({position:{x:5,y:5}});
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),true);
  await donde(p); assert.equal(await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).isDisabled(),true);
});

test('reservado legacy sin pin sigue editable pero cambiar direccion queda pendiente',actual,async t=>{
  const {p,red}=await pantalla(t,390,{modo:'editar',evento:{...legacy,sitio_texto:'Casa amiga',sitio_reservado:true},privado:{direccion:'Privada anterior',lat:null,lng:null}});
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),false);
  await donde(p); red.features=[]; await p.getByLabel('Dirección exacta').fill('Privada nueva');
  await p.getByRole('alert').waitFor(); await p.getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),true);
  const v=await valores(p); assert.equal(v.sitio_texto,'Casa amiga'); assert.equal(v.direccion_privada,'Privada nueva'); assert.equal(v.sitio_direccion,'');
});

const eventoDireccion = {titulo:'Evento de prueba',sitio_texto:'Foro manual',sitio_direccion:'Dirección A',sitio_lat:22.15,sitio_lng:-100.98,inicio:'2030-12-12T18:00:00Z'};
async function pinManual(t,reservado,width=390,resultado='ok') {
  const {p,red}=await pantalla(t,width,{modo:'editar',evento:{...eventoDireccion,sitio_reservado:reservado,
    ...(reservado?{sitio_direccion:null,sitio_lat:null,sitio_lng:null}:{})},
    privado:reservado?{direccion:'Dirección A',lat:22.15,lng:-100.98}:undefined});
  await donde(p); await p.getByText('Arrastra el pin o toca el mapa para ajustar.',{exact:true}).waitFor();
  const llegada=espera(), respuesta=espera(); t.after(()=>respuesta.resolver());
  red.features=resultado==='vacio'?[]:[direccion('Dirección B',22.16,-100.97)];
  if(resultado==='HTTP')red.status=503;
  red.esperar=u=>{if(u.pathname.endsWith('/reverse')){llegada.resolver();return respuesta.promesa;}};
  const canvas=p.locator('canvas.mapboxgl-canvas'), bounds=await canvas.boundingBox();
  await canvas.click({position:{x:bounds.width*.7,y:bounds.height*.5}}); await llegada.promesa;
  const v=await valores(p), lat=reservado?'privado_lat':'sitio_lat', lng=reservado?'privado_lng':'sitio_lng';
  assert.notEqual(v[lng],'-100.98');
  return {p,red,respuesta,punto:{lat:v[lat],lng:v[lng]},lat,lng};
}
async function liberarReverse(p,respuesta) {
  const recibida=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/reverse'));
  respuesta.resolver(); await recibida;
  // Vuelve al event loop tras procesar el JSON y los updates de React.
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
for(const reservado of [false,true]) for(const cierre of ['X','Escape','fondo']) test(`pin manual ${reservado?'reservado':'publico'} conserva pendiente al cerrar ${cierre} y descarta reverse tardio`,actual,async t=>{
  const width=cierre==='fondo'?1280:390;
  const {p,respuesta,punto,lat,lng}=await pinManual(t,reservado,width);
  await foto(p,`pin-pendiente-${reservado?'reservado':'publico'}-${width}`);
  assert.equal((await valores(p)).sitio_pin_pendiente,'si');
  assert.equal(await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).isDisabled(),true);
  if(cierre==='X')await p.getByRole('button',{name:'Cerrar',exact:true}).click();
  else if(cierre==='Escape')await p.keyboard.press('Escape');
  else await p.getByRole('dialog').locator('..').click({position:{x:5,y:5}});
  await liberarReverse(p,respuesta);
  const v=await valores(p);
  assert.equal(v[lat],punto.lat);assert.equal(v[lng],punto.lng);assert.equal(v.ciudad,'');
  assert.equal(v[reservado?'direccion_privada':'sitio_direccion'],'Dirección A');
  assert.equal(v.sitio_pin_pendiente,'si');
  assert.equal(await p.locator('form button[type="submit"]').isDisabled(),true);
  await p.locator('form').evaluate(f=>f.requestSubmit());await p.getByRole('dialog').waitFor();
  assert.equal(await p.evaluate(()=>window.qa.intentos??0),0);
  await p.getByRole('button',{name:'Usar esta dirección con el pin',exact:true}).click();
  assert.equal((await valores(p)).sitio_pin_pendiente,'no');
  await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  await guardarYEditar(p);
  const persistido=await valores(p);
  assert.equal(persistido[lat],punto.lat);assert.equal(persistido[lng],punto.lng);
  assert.equal(persistido[reservado?'direccion_privada':'sitio_direccion'],'Dirección A');
  if(reservado){assert.equal(persistido.sitio_lat,'');assert.equal(persistido.sitio_direccion,'');}
});
for(const reservado of [false,true]) for(const resultado of ['ok','HTTP','vacio']) test(`pin manual ${reservado?'reservado':'publico'} reverse ${resultado}`,actual,async t=>{
  const {p,respuesta,punto,lat,lng}=await pinManual(t,reservado,390,resultado);
  await liberarReverse(p,respuesta);
  if(resultado==='ok') {
    await p.waitForFunction(()=>document.querySelector('input[name="sitio_pin_pendiente"]').value==='no');
    assert.equal((await valores(p))[reservado?'direccion_privada':'sitio_direccion'],'Dirección B, Ciudad de prueba');
    assert.equal((await valores(p)).ciudad,'Ciudad de prueba');
    assert.equal(await p.getByRole('button',{name:'Usar esta dirección con el pin',exact:true}).count(),0);
  } else {
    assert.equal((await valores(p)).sitio_pin_pendiente,'si');
    assert.equal(await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).isDisabled(),true);
    await p.getByRole('button',{name:'Usar esta dirección con el pin',exact:true}).click();
  }
  await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();
  await guardarYEditar(p);
  assert.equal((await valores(p))[lat],punto.lat);assert.equal((await valores(p))[lng],punto.lng);
});

test('pin manual sin dirección sigue siendo intencional y se puede guardar',actual,async t=>{
  const {p,red}=await pantalla(t,390,{modo:'editar',evento:{...eventoDireccion,sitio_direccion:null,sitio_lat:null,sitio_lng:null},revision:'2026-09-18T12:00:00Z'});
  red.features=[]; await donde(p); await p.getByLabel('Nombre del sitio',{exact:true}).fill('Foro manual nuevo');
  await p.getByText('Toca el mapa donde está el lugar.',{exact:true}).waitFor();
  const canvas=p.locator('canvas.mapboxgl-canvas'), bounds=await canvas.boundingBox();
  await canvas.click({position:{x:bounds.width*.7,y:bounds.height*.5}});
  await p.waitForFunction(()=>document.querySelector('input[name="sitio_lat"]').value!=='');
  assert.equal((await valores(p)).sitio_texto,'Foro manual nuevo');
  assert.equal((await valores(p)).sitio_direccion,'');
  assert.equal((await valores(p)).sitio_pin_pendiente,'no');
  assert.equal(await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).isDisabled(),false);
  await p.getByRole('dialog').getByRole('button',{name:/^Listo/}).click(); await guardarYEditar(p);
  assert.notEqual((await valores(p)).sitio_lat,'');
});

test('reservar mientras reverse espera conserva el pin privado pendiente y descarta la respuesta pública',actual,async t=>{
  const {p,respuesta,punto}=await pinManual(t,false);
  await p.getByRole('switch',{name:'Sitio reservado'}).click();
  const antes=await valores(p); assert.equal(antes.privado_lat,punto.lat);assert.equal(antes.sitio_lat,'');assert.equal(antes.sitio_pin_pendiente,'si');
  await liberarReverse(p,respuesta);
  const despues=await valores(p);
  assert.equal(despues.direccion_privada,'Dirección A');assert.equal(despues.privado_lat,punto.lat);assert.equal(despues.sitio_direccion,'');assert.equal(despues.sitio_pin_pendiente,'si');
  await p.getByRole('button',{name:'Usar esta dirección con el pin',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'Listo',exact:true}).click();await guardarYEditar(p);
  const guardado=await valores(p);assert.equal(guardado.privado_lat,punto.lat);assert.equal(guardado.sitio_lat,'');assert.equal(guardado.sitio_direccion,'');
});
