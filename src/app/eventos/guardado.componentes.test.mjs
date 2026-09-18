/** Formulario real, accion simulada y red bloqueada. No guarda datos ni agrega rutas a Next. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const captures = process.env.GUARDADO_SCREENSHOTS;
const revision = "2026-09-18T10:00:00.123456+00:00";
const id = "00000000-0000-4000-8000-0000000000f1";
let dir, server, browser, origin;
const mocks = {
  "./acciones": "export async function zonaDelPunto(){return 'America/Mexico_City'} export async function cupoDeCartel(){return null} export async function pedirMasLecturas(){return {ok:false}} export async function leerCartelAccion(){throw Error('No usar OCR')}",
  "@/components/ui/Atras": "export function useTerminar(){return (url)=>{window.qa.terminado=url}}",
  "@/components/SalirSinPublicar": "export function useSalirSinPublicar(){return null}",
  "./HojaDondeEs": "export default function C(){return null}",
  "./SelectorCuando": "export default function C(){return null}",
  "./SelectorQuien": "export default function C(){return null}",
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "guardado-componentes-"));
  if (captures) await mkdir(captures, { recursive: true });
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
      import Form from './src/app/eventos/FormularioEvento';import './src/app/globals.css';
      window.qa={envios:[],resultado:{ok:false,errores:{},general:'No se pudo guardar. Intenta de nuevo.'}};
      async function accion(_,fd){window.qa.envios.push(Object.fromEntries(fd));return window.qa.resultado}
      function App(){const [revision,setRevision]=useState(${JSON.stringify(revision)});window.qa.revision=setRevision;
        return <Form accion={accion} lugares={[]} modo="editar" usuarioId="cuenta" revision={revision}
          evento={{id:${JSON.stringify(id)},titulo:'Evento de prueba',sitio_texto:'Sitio de prueba',sitio_reservado:false,
            inicio:'2026-11-01T20:00:00Z',fin:null,gratis:true,precio:null,zona:'America/Mexico_City'}}/>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` }, plugins: [{ name: "dobles", setup(b) {
      b.onResolve({ filter: /.*/ }, a => a.path in mocks ? { path: a.path, namespace: "mock" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "mock" }, a => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
    } }],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><main class="pagina"><h1 class="titulo">Editar evento</h1><div id="root"></div></main><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
  ]);
  server = createServer((req, res) => {const a=assets.get(req.url);res.writeHead(a?200:404,{"Content-Type":`${a?.[0]??"text/plain"}; charset=utf-8`});res.end(a?.[1]??"");});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  origin=`http://127.0.0.1:${server.address().port}`;
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:"playwright");
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
});
after(async()=>{await browser?.close();if(server) await new Promise(r=>server.close(r));if(dir) await rm(dir,{recursive:true,force:true});});

for(const width of [390,1280]) test(`Reintento y conflicto conservan la edicion, ${width}`,async t=>{
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:"reduce"});
  t.after(()=>context.close());
  const p=await context.newPage();p.setDefaultTimeout(10_000);
  const errors=[];p.on("pageerror",e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
  await p.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await p.goto(origin);
  const titulo=p.getByLabel("Nombre del evento");
  await titulo.fill("Mi edicion manual");
  const guardar=p.getByRole("button",{name:/^Guardar/});
  await guardar.click();
  await p.getByText("No se pudo guardar. Intenta de nuevo.",{exact:true}).waitFor();
  const primero=await p.evaluate(()=>window.qa.envios[0]);
  assert.equal(primero.revision,revision);
  assert.match(primero.operacion,/^[0-9a-f-]{36}$/);
  assert.equal(await titulo.inputValue(),"Mi edicion manual");
  await guardar.click();await p.waitForFunction(()=>window.qa.envios.length===2);
  assert.equal(await p.evaluate(()=>window.qa.envios[1].operacion),primero.operacion);
  await p.evaluate(()=>window.qa.revision("2026-09-18T11:00:00Z"));
  await titulo.fill("Mi correccion posterior");
  await p.evaluate(()=>{window.qa.resultado={ok:false,conflicto:true,errores:{},general:"El evento cambio en otra pantalla. Tus datos siguen aqui."};});
  await guardar.click();await p.getByRole("alert").filter({hasText:"El evento cambio en otra pantalla. Tus datos siguen aqui."}).waitFor();
  const tercero=await p.evaluate(()=>window.qa.envios[2]);
  assert.notEqual(tercero.operacion,primero.operacion);
  assert.equal(tercero.revision,revision);
  assert.equal(await titulo.inputValue(),"Mi correccion posterior");
  const ver=p.getByRole("link",{name:"Ver versión actual en otra pestaña"});
  assert.equal(await ver.getAttribute("href"),`/eventos/${id}`);
  assert.equal(await ver.getAttribute("target"),"_blank");
  assert.match(await ver.getAttribute("rel"),/noopener/);
  assert.equal(await p.evaluate(()=>!!window.qa.terminado),false);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(captures) await p.screenshot({path:join(captures,`conflicto-${width}.png`),fullPage:true});
});
