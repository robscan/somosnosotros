// Baja las fotos de bloque del CAPO cargando cada página del catálogo en Chrome sin ventana (Google solo las sirve así:
// las URL son firmadas y caducan, y las de lh7 dan 403 fuera del navegador). Emparejamiento posicional entre el HTML
// en caché (scripts/capo/salida/html) y el vivo. Uso, desde la raíz del repo: npm i --no-save playwright-core && node scripts/capo/fotos-chrome/recorrer.mjs
// Luego: node scripts/capo/fotos-chrome/subir.mjs (sube al bucket y escribe scripts/capo/salida/fotos-capo-subidas.json)
// y node scripts/fotos/correr.mjs artistas scripts/capo/salida/fotos-capo-subidas.json --autor <id> --hotlink [--simular]
import { chromium } from "playwright-core";
import fs from "fs";
const datos = JSON.parse(fs.readFileSync("/Users/apple-1/somosnosotros/scripts/capo/salida/fotos-capo.json","utf8"));
const CACHE = "/Users/apple-1/somosnosotros/scripts/capo/salida/html/";
const nombreCache = u => decodeURIComponent(u.replace(/^https:\/\/www\.catalogoartistaspotosino\.com\/catalogoartistaspotosino\//,"")).replace(/\//g,"-").replace(/_/g,"-")+".html";
const base = u => u.replace(/=w.*$/,"").replace(/=s\d+.*$/,"");
const re=/https:\/\/lh[^"'\s\\]+googleusercontent\.com\/sitesv[^"'\s\\]*/g;
const lista = html => { const out=[]; const seen=new Set(); for (const m of html.matchAll(re)) { const b=base(m[0]); if(!seen.has(b)){seen.add(b); out.push(m[0]);} } return out; };
const slug = n => n.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,60).replace(/-$/,"");
const extDe = ct => ct.includes("png")?"png":ct.includes("webp")?"webp":ct.includes("gif")?"gif":"jpg";
const paginas = [...new Set(datos.map(x=>x.url_fuente))];
const img = datos.filter(x=>x.foto_origen==="img");
// slugs únicos
const slugDe = new Map(); const usados = new Map();
for (const a of img) { let s = slug(a.nombre)||"artista"; const n=(usados.get(s)||0)+1; usados.set(s,n); if(n>1) s = s.slice(0,56)+"-"+n; slugDe.set(a.nombre, s); }
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport:{width:1280,height:900}, locale:"es-MX" });
const page = await ctx.newPage();
const cuerpos = new Map();
page.on("response", async r => { const u=r.url(); if(!u.includes("googleusercontent.com/sitesv")||!r.ok()) return; const ct=r.headers()["content-type"]||""; if(!ct.startsWith("image/")) return; try { cuerpos.set(base(u), { ct, body: await r.body() }); } catch{} });
const resultado = []; const registro = [];
for (const [pi,u] of paginas.entries()) {
  const f = nombreCache(u); const arts = img.filter(x=>x.url_fuente===u);
  if (!fs.existsSync(CACHE+f)) { registro.push({u,f,error:"sin cache"}); for(const a of arts) resultado.push({nombre:a.nombre, slug:slugDe.get(a.nombre), motivo:"sin cache: "+f}); console.log(`${pi+1}/44 SIN CACHE ${f}`); continue; }
  cuerpos.clear();
  let crudo; try { const resp = await page.goto(u, { waitUntil:"networkidle", timeout:90000 }); crudo = await resp.text(); } catch(e) { registro.push({u,f,error:e.message}); for(const a of arts) resultado.push({nombre:a.nombre, slug:slugDe.get(a.nombre), motivo:"carga: "+e.message}); console.log(`${pi+1}/44 ERROR ${e.message}`); continue; }
  await page.waitForTimeout(1500);
  const lc = lista(fs.readFileSync(CACHE+f,"utf8")), lv = lista(crudo);
  const alineada = lc.length===lv.length;
  let ok=0;
  for (const a of arts) {
    const s = slugDe.get(a.nombre);
    const k = lc.findIndex(x=>base(x)===base(a.foto_url));
    if (k<0) { resultado.push({nombre:a.nombre, slug:s, motivo:"foto_url no está en el html de caché"}); continue; }
    if (!alineada) { resultado.push({nombre:a.nombre, slug:s, motivo:`página no alineada (cache ${lc.length} vs vivo ${lv.length})`}); continue; }
    const viva = lv[k];
    let c = cuerpos.get(base(viva));
    let via = "captura";
    if (!c) { try { const r = await page.request.get(base(viva)+"=w1280", { headers:{ Referer:u } }); const ct=r.headers()["content-type"]||""; if (r.ok() && ct.startsWith("image/")) { c={ct, body: await r.body()}; via="request"; } else via=`request ${r.status()} ${ct}`; } catch(e){ via="request err "+e.message; } }
    if (!c) { try { const r = await fetch(base(viva)+"=w1280"); const ct=r.headers.get("content-type")||""; if (r.ok && ct.startsWith("image/")) { c={ct, body: Buffer.from(await r.arrayBuffer())}; via="fetch"; } else via+=` | fetch ${r.status} ${ct}`; } catch(e){ via+=" | fetch err "+e.message; } }
    if (!c) { resultado.push({nombre:a.nombre, slug:s, motivo:"sin cuerpo: "+via, viva: viva.slice(0,60)}); continue; }
    const archivo = `fotos/${s}.${extDe(c.ct)}`; fs.writeFileSync(archivo, c.body);
    resultado.push({nombre:a.nombre, slug:s, archivo, bytes:c.body.length, ct:c.ct, via, viva}); ok++;
  }
  registro.push({u,f,cache:lc.length,vivo:lv.length,alineada,artistas:arts.length,ok});
  console.log(`${pi+1}/44 ${alineada?"ok":"DESALINEADA"} cache=${lc.length} vivo=${lv.length} artistas=${arts.length} guardadas=${ok} ${f}`);
  await page.waitForTimeout(2000);
}
await browser.close();
fs.writeFileSync("bajadas.json", JSON.stringify(resultado,null,1));
fs.writeFileSync("recorrido.json", JSON.stringify(registro,null,1));
console.log("guardadas:", resultado.filter(r=>r.archivo).length, "sin foto:", resultado.filter(r=>!r.archivo).length);
const vias={}; for(const r of resultado) if(r.archivo) vias[r.via]=(vias[r.via]||0)+1; console.log("vías:", vias);
console.log(resultado.filter(r=>!r.archivo));
