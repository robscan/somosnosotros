// OL-360 · Rellena `eventos.colores_cartel` de los eventos que ya tenían cartel (bitácora 391). Lee cada portada, la reduce a 16×20 con
// `sharp` (ya en dependencias) y calcula su paleta con la misma función que el teléfono (`paletaDePixeles`, src/lib/coloresCartel.ts, que
// Node 22 importa quitando los tipos). Solo toca los eventos con imagen y sin colores; la escritura lleva `imagen = <la leída>` para no pisar
// un cartel que cambió mientras tanto.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/ops/colores-cartel.mjs              ensayo: dice qué guardaría, no escribe
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/ops/colores-cartel.mjs --escribir   guarda
//
// Antes, la migración 20261009120000_colores_cartel.sql aplicada. Las llaves solo por variables de entorno (nunca en git).
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { paletaDePixeles } from "../../src/lib/coloresCartel.ts";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !llave) throw new Error("faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
const escribir = process.argv.includes("--escribir");
const supabase = createClient(url, llave, { auth: { persistSession: false } });

const { data: eventos, error } = await supabase.from("eventos").select("id, titulo, imagen").not("imagen", "is", null).is("colores_cartel", null).limit(5000);
if (error) throw new Error(error.message);
let hechos = 0, fallos = 0;
for (const e of eventos) {
  try {
    const r = await fetch(e.imagen);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { data } = await sharp(Buffer.from(await r.arrayBuffer())).resize(16, 20, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const colores = paletaDePixeles(data);
    if (!colores) throw new Error("sin píxeles");
    if (escribir) {
      const { error: e2 } = await supabase.from("eventos").update({ colores_cartel: colores }).eq("id", e.id).eq("imagen", e.imagen);
      if (e2) throw new Error(e2.message);
    }
    hechos++;
    console.log(`${escribir ? "guardado" : "guardaría"} ${e.id} ${colores.join(" ")} · ${e.titulo}`);
  } catch (err) {
    fallos++;
    console.error(`no se pudo ${e.id} (${e.titulo}): ${err.message}`);
  }
}
console.log(`${eventos.length} sin colores · ${hechos} ${escribir ? "guardados" : "por guardar (ensayo)"} · ${fallos} fallos`);
