// OL-505 (bitácora 538): la evidencia de «Repisa» con el CÓDIGO DE LA APP (`dibujarDestacado` y `dibujarPortadaSemana` de
// src/lib/carteles/dibujar.ts), no con el del prototipo. Toma las fichas reales que el prototipo de OL-490 leyó de somosnosotros.org
// (`prototipo/instagram-estilo-propio.tercera.json`) y baja sus imágenes del Storage público con `fetch` (nada de `.env`, ninguna base).
// Dibuja 3 artistas (con fecha, nombre largo, foto en blanco y negro), 2 lugares (L2 con portada, L1 sin ella) y «Esta semana», en 4:5 y 9:16;
// guarda cada PNG a 1080 y la misma a 540 en `docs/rediseno/capturas-538/` y la revisión de cada una en `medidas.json` (ningún texto fuera del
// margen ni en lo que tapa la historia, ninguno encimado ni cortado, ninguno sobre una foto, la tinta a 4,5:1 o más).
//
//   node scripts/ops/auditoria-ui/instagram-repisa.mjs
//   node scripts/ops/auditoria-ui/instagram-repisa.mjs --mismo-dia   (OL-508, bitácora 540: solo «Esta semana» con los dos primeros
//     eventos del .json puestos el mismo viernes y el título de `tituloSemana` de un solo día; guarda en `docs/rediseno/capturas-540/`)
//
// El id de cada ficha (que elige el color de respaldo) es su clave del .json: el prototipo no guardó los id reales. Con los id reales, el
// respaldo de una foto gris o de un lugar sin portada puede tocar otro de los nueve colores.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const requerir = createRequire(path.join(RAIZ, "package.json"));
const esbuild = requerir("esbuild");
const sharp = requerir("sharp");
const MISMO_DIA = process.argv.includes("--mismo-dia");
const SALIDA = path.join(RAIZ, MISMO_DIA ? "docs/rediseno/capturas-540" : "docs/rediseno/capturas-538");
const CACHE = path.join(RAIZ, ".next/cache/instagram-repisa");
fs.mkdirSync(SALIDA, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });
process.chdir(RAIZ);

// 1. El código de la app, empaquetado (los `@/` y `server-only` vacío, como en vitest); se borra al terminar.
const paquete = path.join(AQUI, ".instagram-repisa.tmp.mjs");
const vacio = path.join(path.dirname(requerir.resolve("server-only")), "empty.js");
await esbuild.build({
  stdin: {
    contents: `export { dibujarDestacado, dibujarPortadaSemana } from "@/lib/carteles/dibujar"; export { cajaDeFoto, cajasDeCarteles } from "@/lib/carteles/plantillas/repisa"; export { contraste } from "@/lib/portadasSistema"; export { FORMATOS, MARGEN } from "@/lib/carteles/tokens"; export { tituloSemana } from "@/lib/instagram/destacado";`,
    resolveDir: RAIZ,
    loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", outfile: paquete, jsx: "automatic", packages: "external", logLevel: "error",
  plugins: [{ name: "alias", setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: vacio }));
    b.onResolve({ filter: /^@\// }, (a) => {
      const base = path.join(RAIZ, "src", a.path.slice(2));
      const hallado = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((x) => base + x).find((x) => fs.existsSync(x) && fs.statSync(x).isFile());
      return hallado ? { path: hallado } : undefined;
    });
  } }],
});
let A;
try {
  A = await import(paquete + "?v=" + Date.now());
} finally {
  fs.rmSync(paquete, { force: true });
}

// 2. Las fichas reales y sus imágenes (del Storage público, guardadas en la caché de .next para no bajarlas dos veces).
const T = JSON.parse(fs.readFileSync(path.join(AQUI, "prototipo/instagram-estilo-propio.tercera.json"), "utf8"));
async function bajar(ruta) {
  if (!ruta) return null;
  const archivo = path.join(CACHE, ruta.replace(/[^a-z0-9.-]+/gi, "_"));
  if (!fs.existsSync(archivo)) {
    const r = await fetch(T.base + ruta);
    if (!r.ok) throw new Error(`no se pudo bajar ${ruta}: ${r.status}`);
    fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(archivo);
}
const artista = (clave) => T.artistas.find((a) => a.clave === clave);
const lugar = (clave) => T.lugares.find((l) => l.clave === clave);

// 3. La revisión de una tarjeta, con las cajas de satori.
const encima = (a, b) => Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y) > 2;
function revisar(r, formato, fotos) {
  const f = A.FORMATOS[formato];
  const mal = [];
  const abajo = Math.max(A.MARGEN - 8, f.tapaAbajo);
  for (const n of r.nodos) {
    if (n.x < A.MARGEN - 1 || n.x + n.ancho > f.ancho - A.MARGEN + 1) mal.push(`«${n.texto}» se sale de lado`);
    if (n.y < f.tapaArriba - 1 || n.y + n.alto > f.alto - abajo + 1) mal.push(`«${n.texto}» fuera de la zona de texto`);
    if (n.texto.includes("…")) mal.push(`«${n.texto}» cortado`);
    for (const c of fotos) if (encima(n, c)) mal.push(`«${n.texto}» encima de una foto`);
  }
  for (let i = 0; i < r.nodos.length; i++) for (let j = i + 1; j < r.nodos.length; j++) if (encima(r.nodos[i], r.nodos[j])) mal.push(`«${r.nodos[i].texto}» encima de «${r.nodos[j].texto}»`);
  if (r.recortado) mal.push("algo no cupo");
  const ratio = A.contraste(r.color.tinta, r.color.base);
  if (ratio < 4.5) mal.push(`tinta a ${ratio.toFixed(2)}:1`);
  return { mal, contraste: Math.round(ratio * 100) / 100 };
}

const medidas = {};
async function guardar(nombre, r, formato, fotos) {
  fs.writeFileSync(path.join(SALIDA, `${nombre}.png`), r.imagen);
  await sharp(r.imagen).resize({ width: 540 }).png({ compressionLevel: 9 }).toFile(path.join(SALIDA, `${nombre}-540.png`));
  const rev = revisar(r, formato, fotos);
  medidas[nombre] = { color: r.color, ...rev, textos: r.nodos.map((n) => n.texto) };
  console.log(nombre, r.color.deDonde, r.color.origen, "→", r.color.base, r.color.banda, `${rev.contraste}:1`, rev.mal.length ? rev.mal.join(" | ") : "bien");
}

// 4. Las tarjetas.
const ARTISTAS = [
  ["artista-un-leon-marinero", "un-leon-marinero"],
  ["artista-emilio-palomino", "emilio-palomino"],
  ["artista-carlos-guevara", "carlos-guevara"],
];
for (const [nombre, clave] of MISMO_DIA ? [] : ARTISTAS) {
  const a = artista(clave);
  const foto = await bajar(a.foto);
  for (const formato of ["4x5", "9x16"]) {
    const pedido = { tipo: "artista", id: a.clave, formato, foto, nombre: a.nombre, razon: "Artista de la semana", ceja: [a.disciplina, a.detalle].filter(Boolean).join(" · "), ciudad: a.ciudad, cuenta: a.cuenta, proxima: a.proxima ?? null, semana: null, conNodos: true, png: true };
    await guardar(`${nombre}-${formato}`, await A.dibujarDestacado(pedido), formato, [A.cajaDeFoto(pedido)]);
  }
}
const LUGARES = [
  ["lugar-L2-bajo-ceiba", "bajo-ceiba", true],
  ["lugar-L1-guarida-del-coyote", "guarida-del-coyote", false],
];
for (const [nombre, clave, conPortada] of MISMO_DIA ? [] : LUGARES) {
  const l = lugar(clave);
  const foto = conPortada ? await bajar(l.portada) : null;
  for (const formato of ["4x5", "9x16"]) {
    const pedido = { tipo: "lugar", id: l.clave, formato, foto, nombre: l.nombre, razon: "Lugar de la semana", ceja: l.tipo, ciudad: l.ciudad, cuenta: l.cuenta, proxima: null, semana: null, conNodos: true, png: true };
    await guardar(`${nombre}-${formato}`, await A.dibujarDestacado(pedido), formato, conPortada ? [A.cajaDeFoto(pedido)] : []);
  }
}
{
  // Con --mismo-dia: los dos primeros eventos, los dos el viernes 30 (el segundo conserva su hora y su lugar), como la del founder del 2026-11-02.
  const s = MISMO_DIA
    ? {
        ...T.semana,
        titulo: A.tituloSemana("2026-10-30", "2026-10-30", "America/Mexico_City", new Date("2026-10-29T12:00:00Z")),
        eventos: T.semana.eventos.slice(0, 2).map((e) => ({ ...e, dia: "Vie 30", cuando: e.cuando.replace(/^\S+ \d+/, "Vie 30") })),
      }
    : T.semana;
  const carteles = await Promise.all(s.eventos.map((e) => bajar(e.cartel)));
  for (const formato of ["4x5", "9x16"]) {
    const pedido = { id: s.id, formato, ciudad: s.ciudad, titulo: s.titulo, eventos: s.eventos.map((e) => ({ cuando: e.cuando, titulo: e.titulo })), dias: s.eventos.map((e) => e.dia), carteles, conNodos: true, png: true };
    await guardar(`semana-${formato}`, await A.dibujarPortadaSemana(pedido), formato, A.cajasDeCarteles(pedido));
  }
}
fs.writeFileSync(path.join(SALIDA, "medidas.json"), JSON.stringify(medidas, null, 1));
const fallas = Object.values(medidas).filter((m) => m.mal.length).length;
console.log(`${Object.keys(medidas).length} tarjetas, ${fallas} con falla`);
process.exit(fallas ? 1 : 0);
