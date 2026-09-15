import fs from "fs";
import { createRequire } from "module";
const require = createRequire("/Users/apple-1/somosnosotros/package.json");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");
const env = Object.fromEntries(fs.readFileSync("/Users/apple-1/somosnosotros/.env","utf8").split("\n").filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("faltan variables"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const AUTOR = "9690e3b6-f389-4e89-a876-cdc9d29221b3";
const bajadas = JSON.parse(fs.readFileSync("bajadas.json","utf8")).filter(r=>r.archivo);
const subidas = []; const fallos = []; let reducidas = 0;
for (const [i,r] of bajadas.entries()) {
  let buf = fs.readFileSync(r.archivo); let ct = r.ct.split(";")[0]; let ext = r.archivo.split(".").pop();
  if (buf.length > 1_000_000) { const m = await sharp(buf).metadata(); const s = sharp(buf).rotate(); buf = await (m.width>1200||m.height>1200 ? s.resize({width:1200,height:1200,fit:"inside",withoutEnlargement:true}) : s).toFormat(ext==="png"?"png":"jpeg",{quality:85}).toBuffer(); reducidas++; }
  if (buf.length > 5_000_000) { fallos.push({nombre:r.nombre, motivo:`pesa ${buf.length} tras reducir`}); continue; }
  const ruta = `artistas/${AUTOR}/importadas/${r.slug}.${ext}`;
  const { error } = await db.storage.from("fotos").upload(ruta, buf, { contentType: ct, upsert: true });
  if (error) { fallos.push({nombre:r.nombre, motivo:error.message}); continue; }
  const publica = db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  subidas.push({ nombre: r.nombre, url: publica });
  if ((i+1)%50===0) console.log(`${i+1}/${bajadas.length}`);
}
fs.writeFileSync("/Users/apple-1/somosnosotros/scripts/capo/salida/fotos-capo-subidas.json", JSON.stringify(subidas, null, 2)+"\n");
fs.writeFileSync("fallos-subida.json", JSON.stringify(fallos,null,1));
console.log("subidas:", subidas.length, "reducidas:", reducidas, "fallos:", fallos.length, fallos);
console.log("ejemplo:", subidas[0]);
