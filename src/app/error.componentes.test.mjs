/** Estado de error real y recuento desconocido; la recuperación del servidor Next se verifica en QA compilada. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";
const root = fileURLToPath(new URL("../../", import.meta.url));
let browser, server, dir, origin;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "agendaerror-componentes-"));
  const mocks = {
    "next/image": "import React from 'react';export default function Image({quality,...p}){return React.createElement('img',p)}",
    "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link(p){return React.createElement('a',p)}",
    "next/navigation": "export const useRouter=()=>({back(){},replace(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search)",
  };
  await build({ absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"), stdin: { resolveDir: root, loader: "tsx", contents: `
    import React,{useState} from 'react';import{createRoot}from'react-dom/client';
    import ErrorPantalla from './src/app/error';import RenglonEvento from './src/components/RenglonEvento';import './src/app/globals.css';
    function App(){const[fallo,setFallo]=useState(!location.search);const[veces,setVeces]=useState(0);
      const van=new URLSearchParams(location.search).get('van');
      return fallo?<ErrorPantalla error={Object.assign(new Error('mensaje interno'),{digest:'digest-sintetico'})} retry={()=>{setVeces(n=>n+1);setFallo(false)}}/>:
      <main><p role="status">Reintentos: {veces}</p><RenglonEvento evento={{id:'ensayo',titulo:'Ensayo abierto',inicio:'2026-10-07T18:00:00Z',fin:null,zona:'America/Mexico_City',lugar:null,imagen:null,precio:'Entrada libre',sitio_texto:'Foro',sitio_reservado:false,van:van===null?null:Number(van)}}/></main>;
    }createRoot(document.getElementById('root')).render(<App/>);` },
    plugins: [{ name: "dobles", setup(b) {
      b.onResolve({ filter: /.*/ }, a => a.path in mocks ? {path:a.path,namespace:"mock"} : undefined);
      b.onLoad({filter:/.*/,namespace:"mock"}, a=>({contents:mocks[a.path],loader:"js",resolveDir:root}));
    }}],
  });
  const assets = new Map([["/app.js",["text/javascript",await readFile(join(dir,"app.js"))]],["/app.css",["text/css",await readFile(join(dir,"app.css"))]]]);
  server=createServer((req,res)=>{const [tipo,datos]=assets.get(req.url.split("?")[0])??["text/html",'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>'];res.writeHead(200,{"Content-Type":tipo});res.end(datos)});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));origin=`http://127.0.0.1:${server.address().port}`;
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:"playwright");
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));if(dir)await rm(dir,{recursive:true,force:true})});
test("error visible ofrece reintento y recupera contenido sin una cifra falsa",async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(origin);await page.getByRole("heading",{name:"Algo falló"}).waitFor();
    assert.equal(await page.getByText("mensaje interno",{exact:true}).count(),0);
    const boton=page.getByRole("button",{name:"Intentar de nuevo",exact:true});await boton.focus();await page.keyboard.press("Enter");
    await page.getByRole("link",{name:/Ensayo abierto/}).waitFor();
    assert.equal(await page.getByRole("status").textContent(),"Reintentos: 1");
    assert.equal(await page.getByRole("heading",{name:"Algo falló"}).count(),0);
    assert.doesNotMatch(await page.getByRole("main").innerText(),/\d+ va(?:n)?|null|NaN/);
    assert.match(await page.getByRole("main").innerText(),/Entrada libre/);
  }finally{await page.close()}
});
test("el recuento confirmado se sigue mostrando",async()=>{
  const page=await browser.newPage();try{await page.goto(origin+"/?van=3");await page.getByText("· Entrada libre · 3 van",{exact:true}).waitFor()}finally{await page.close()}
});
