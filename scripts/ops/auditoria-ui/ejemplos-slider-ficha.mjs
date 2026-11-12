// OL-516 (bitácora 549): los ejemplos reales del carrusel de la ficha para el founder («toda pieza gráfica se propone con fotos y textos
// reales»), con el CÓDIGO DE LA APP de punta a punta: el trabajador de verdad (`correrUnTrabajo`, `lib/redes/trabajar.ts`) sobre una base en
// memoria (`baseFalsa`), la tarjeta de siempre (`dibujarFicha`), las imágenes de los eventos (`dibujarEventoDeFicha`: el cartel encajado a 4:5 o
// el diseño de Crear cartel) y el texto que arma el sistema (`textoDeFicha`); las obras de la semana salen de `ventanaDeLaSemana` y
// `obrasDeFilas`, las mismas de `cargarFicha`. Instagram y Facebook son de mentira: se guarda lo que se les mandaría (cada imagen en JPEG, el
// texto, las etiquetas de cada imagen y el coautor). Las fotos y los carteles se bajan de sus direcciones públicas del Storage de la app.
//
//   node scripts/ops/auditoria-ui/ejemplos-slider-ficha.mjs <datos públicos .json> <carpeta de salida>
//
// El .json (datos públicos de tres fichas, como se ven sin sesión en somosnosotros.org) no se copia al repo. Nada de `.env` ni de la base.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const [ENTRADA, SALIDA_ARG] = process.argv.slice(2);
if (!ENTRADA || !SALIDA_ARG) {
  console.error("uso: node ejemplos-slider-ficha.mjs <datos.json> <salida>");
  process.exit(1);
}
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const SALIDA = path.resolve(SALIDA_ARG);
const requerir = createRequire(path.join(RAIZ, "package.json"));
const esbuild = requerir("esbuild");
const sharp = requerir("sharp");
fs.mkdirSync(SALIDA, { recursive: true });
const D = JSON.parse(fs.readFileSync(ENTRADA, "utf8"));
// Las imágenes son del Storage público de la app: la tarjeta y los carteles solo se bajan de ahí (`cartelDescargable`).
const STORAGE = new URL(D.lugar_con_carteles.portada).origin;
process.env.NEXT_PUBLIC_SUPABASE_URL = STORAGE;
process.chdir(RAIZ);

// 1. El código de la app, empaquetado (los `@/` y `server-only` vacío, como en vitest); se borra al terminar.
const paquete = path.join(AQUI, ".ejemplos-slider.tmp.mjs");
const vacio = path.join(path.dirname(requerir.resolve("server-only")), "empty.js");
await esbuild.build({
  stdin: {
    contents: [
      `export { correrUnTrabajo } from "@/lib/redes/trabajar";`,
      `export { baseFalsa } from "@/lib/rutinas/baseFalsa";`,
      `export { dibujarFicha, dibujarEventoDeFicha, fichaConMaterial, imagenesDeLaFicha } from "@/lib/instagram/ficha";`,
      `export { obrasDeFilas, ventanaDeLaSemana, lineaDelCarrusel } from "@/lib/instagram/semanaDeFicha";`,
      `export { cejaArtista, cejaLugar } from "@/lib/instagram/destacado";`,
      `export { usuarioDeInstagram, revisarTexto } from "@/lib/instagram/texto";`,
      `export { costoOpcional, sitioEnLista } from "@/lib/eventos";`,
    ].join("\n"),
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

const ZONA = "America/Mexico_City";
const ADMIN = "a0000000-0000-4000-8000-000000000516";

/** Las filas de un evento como las lee `cargarFicha`: el marco de festival no viene (el .json ya los quitó) y la clase es la suya. */
const filas = (eventos, lugar) => eventos.map((e) => ({ id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, fin: e.fin, zona: e.zona, clase: e.clase, imagen: e.imagen, cartel_huella: null, sitio_texto: null, lugar: lugar ?? null, artistas: [] }));

/** La ficha como la arma `cargarFicha` (las obras de la semana con las mismas funciones puras). */
function fichaDe(tipo, x, ahora, fecha) {
  const v = A.ventanaDeLaSemana(fecha, ahora, ZONA);
  const enSemana = x.eventos.filter((e) => e.inicio >= v.desde && e.inicio < v.hasta);
  const semana = A.obrasDeFilas(filas(enSemana, tipo === "lugar" ? { nombre: x.nombre, redes: x.redes } : null), v.desdeDia, tipo === "lugar");
  const cuenta = A.usuarioDeInstagram(x.redes);
  if (tipo === "lugar") {
    const datos = { nombre: x.nombre, slug: x.slug, descripcion: x.descripcion ?? "", tipo: x.tipo, detalle: x.detalle, ciudad: x.ciudad, direccion: x.direccion, redes: x.redes, semana };
    return { tipo, id: x.id, slug: x.slug, nombre: x.nombre, ciudad: x.ciudad, ciudadSlug: "san-luis-potosi", visible: true, grupo: true, ceja: A.cejaLugar(x), cuenta, portada: x.portada, portadaCredito: x.portada_credito, foto: null, proxima: null, semana, datos, ubicacion: null };
  }
  const p = x.eventos.filter((e) => Date.parse(e.inicio) > ahora.getTime()).sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;
  const proxima = p ? { titulo: p.titulo, inicio: p.inicio, zona: p.zona, lugar: null, lugarRedes: [] } : null;
  const datos = { nombre: x.nombre, slug: x.slug, descripcion: x.descripcion ?? "", disciplina: x.disciplina, detalle: x.detalle, ciudad: x.ciudad, redes: x.redes, proxima, semana };
  return { tipo, id: x.id, slug: x.slug, nombre: x.nombre, ciudad: x.ciudad, ciudadSlug: "san-luis-potosi", visible: true, grupo: x.tipo !== "solista", ceja: A.cejaArtista(x), cuenta, portada: x.portada, portadaCredito: null, foto: x.foto, proxima, semana, datos, ubicacion: null };
}

/** Lo que el diseño sin cartel necesita (lo que daría `cargarParaCartel`), con los datos públicos del evento. */
function paraCartel(e, x, tipo) {
  const lugar = tipo === "lugar" ? { nombre: x.nombre, tipo: x.tipo, portada: null } : null;
  const evento = {
    id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, fin: e.fin, zona: e.zona, precio: e.precio ?? null, clase: e.clase,
    costoOpcional: A.costoOpcional({ clase: e.clase, evento_padre_id: e.festival ? "marco" : null, inaugura_id: null }), conSesiones: false,
    sitio: A.sitioEnLista({ lugar, sitio_texto: null, sitio_direccion: null, sitio_reservado: false }), tipoLugar: lugar?.tipo ?? null, lugarId: tipo === "lugar" ? x.id : null, artistas: [],
  };
  return { evento, gestiona: true, perfilId: ADMIN, imagenes: [], memoria: null, datosEleccion: { conImagen: false, tipoLugar: evento.tipoLugar, disciplinas: [], artistas: 0, memoria: null } };
}

/** Corre el trabajador de verdad con una ficha y guarda lo que mandaría a Instagram y a Facebook. */
async function ejemplo(nombre, tipo, x, o) {
  const ahora = new Date(o.ahora);
  const f = fichaDe(tipo, x, ahora, o.fecha);
  const subidas = new Map();
  const mandado = { carrusel: null, publicar: [], facebook: null };
  const base = A.baseFalsa({
    redes_trabajos: [{
      id: `ejemplo-${nombre}`, evento_id: null, artista_id: tipo === "artista" ? x.id : null, lugar_id: tipo === "lugar" ? x.id : null, red: "instagram", formato: "4x5",
      pedido: { tipo, facebook: true, texto: null, quitadas: [], ...(o.casilla ? { casilla: "casilla-del-ejemplo" } : {}) },
      estado: "en_cola", avance: {}, resultado: null, intentos: 0, fallos: 0, error: null, turno: 0, ocupada_hasta: null, siguiente_en: ahora.toISOString(), avisado_en: null, pedido_por: ADMIN, creado_en: ahora.toISOString(),
    }],
    instagram_publicaciones: [], facebook_publicaciones: [], instagram_semana: o.casilla ? [{ id: "casilla-del-ejemplo", trabajo_id: `ejemplo-${nombre}`, estado: "programado" }] : [],
  });
  const porEvento = new Map(x.eventos.map((e) => [e.id, e]));
  const h = {
    cargar: async () => null, dibujar: async () => [], cargarSemana: async () => null, imagenesSemana: async () => [],
    cargarFicha: async () => f,
    dibujarFicha: (ficha, formato, cuando, op) => A.dibujarFicha(ficha, formato, cuando, undefined, !!op?.aMano),
    conMaterial: (ficha) => A.fichaConMaterial(ficha, STORAGE),
    dibujarEventos: async (_db, items) => {
      const hechas = await Promise.all(items.map(async (item) => ({ item, bytes: await A.dibujarEventoDeFicha(item, async () => paraCartel(porEvento.get(item.clave), x, tipo)) })));
      return hechas.filter((y) => !!y.bytes);
    },
    subir: async (_db, _carpeta, bytes) => {
      const url = `https://ejemplo.test/${nombre}-${subidas.size}.jpg`;
      subidas.set(url, bytes);
      return url;
    },
    cupo: async () => null,
    publicar: async (p) => (mandado.publicar.push(p), { ok: true, mediaId: "1", permalink: null, sinEtiquetas: false, ...(p.coautores?.length ? { sinCoautor: false } : {}) }),
    publicarCarrusel: async (p) => ((mandado.carrusel = p), { ok: true, mediaId: "2", permalink: null, sinEtiquetas: false, ...(p.coautores?.length ? { sinCoautor: false } : {}) }),
    publicarEnPagina: async (p) => ((mandado.facebook = p), { ok: true, postId: "3", permalink: null }),
    avisar: async () => {},
  };
  const r = await A.correrUnTrabajo({ db: base.db, ahora: () => ahora, hasta: ahora.getTime() + 10 * 60_000, h });
  if (r.estado !== "terminada") throw new Error(`${nombre}: el trabajador no terminó (${r.estado}) ${JSON.stringify(base.tablas.redes_trabajos[0].resultado)}`);

  const post = mandado.carrusel ?? mandado.publicar.find((p) => !p.historia);
  const historia = mandado.publicar.find((p) => p.historia);
  const imagenes = mandado.carrusel ? mandado.carrusel.imagenes : [{ imagen: post.imagen, etiquetas: post.etiquetas }];
  const archivos = [];
  imagenes.forEach((im, i) => {
    const archivo = path.join(SALIDA, `ejemplo-${nombre}-${i + 1}.jpg`);
    fs.writeFileSync(archivo, subidas.get(im.imagen));
    archivos.push(archivo);
  });
  const archivoHistoria = path.join(SALIDA, `ejemplo-${nombre}-historia.jpg`);
  fs.writeFileSync(archivoHistoria, subidas.get(historia.imagen));
  const items = A.imagenesDeLaFicha(f, ahora);

  // El texto tal como saldría, con lo demás que se manda.
  const cuandoDice = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, dateStyle: "full", timeStyle: "short" }).format(ahora);
  const lineas = [
    `Ejemplo OL-516 · ${x.nombre} (${tipo})`,
    `Sale: ${cuandoDice} (${o.casilla ? "el día de la semana de Instagram: la tarjeta dice «… de la semana»" : "a mano, desde su ficha: la tarjeta sin «de la semana»"}).`,
    `Lo hizo el trabajador de la app (lib/redes/trabajar.ts) con Instagram y Facebook de mentira; las fotos y los carteles, de sus direcciones públicas.`,
    "",
    `Instagram: ${mandado.carrusel ? `carrusel de ${imagenes.length} imágenes` : "una imagen (sin eventos esa semana)"}${A.lineaDelCarrusel(imagenes.length, Math.min(f.semana.length, 5)) ? ` · la hoja dice: «${A.lineaDelCarrusel(imagenes.length, Math.min(f.semana.length, 5))}»` : ""}`,
    ...imagenes.map((im, i) => {
      const it = items[i];
      const que = i === 0 ? "La tarjeta" : `${it.titulo} (${it.imagen ? "su cartel, completo a 4:5 con el margen de su color" : "sin cartel: el diseño de Crear cartel"}${it.eventos.length > 1 ? `; el mismo cartel de ${it.eventos.length} eventos` : ""})`;
      return `  ${i + 1}. ${que} · etiquetas: ${im.etiquetas.length ? im.etiquetas.map((u) => `@${u}`).join(" ") : "ninguna"} · ${path.basename(archivos[i])}`;
    }),
    `  Coautor invitado: ${(mandado.carrusel?.coautores ?? post.coautores ?? []).map((u) => `@${u}`).join(" ") || "ninguno (un lugar solo se etiqueta)"}`,
    `Historia 9:16: la tarjeta sola, etiquetas ${historia.etiquetas.map((u) => `@${u}`).join(" ") || "ninguna"} · ${path.basename(archivoHistoria)}`,
    `Facebook: ${mandado.facebook?.imagenes?.length ? `las ${mandado.facebook.imagenes.length} fotos` : "1 foto"}, con el enlace a su ficha.`,
    `Eventos de esa semana que cuentan (obras): ${f.semana.length} · ${f.semana.map((s) => `${s.titulo} (${s.funciones.length} ${s.funciones.length === 1 ? "función" : "funciones"})`).join(" · ") || "ninguno"}`,
    `El texto cabe: ${A.revisarTexto(post.texto).problema ?? `sí (${[...post.texto].length} de 2 200 caracteres)`}`,
    "",
    "──────── Texto de la publicación ────────",
    post.texto,
    "",
    "──────── Texto en Facebook ────────",
    mandado.facebook?.texto ?? "(sin Facebook)",
    "",
  ];
  fs.writeFileSync(path.join(SALIDA, `ejemplo-${nombre}.txt`), lineas.join("\n"));

  // La hoja de contacto: las imágenes en su orden y, aparte, la historia.
  const ANCHO = 432;
  const ALTO = 540;
  const HIST = Math.round((ALTO * 9) / 16);
  const PASO = 20;
  const ARRIBA = 92;
  const ABAJO = 40;
  const total = imagenes.length * (ANCHO + PASO) + HIST + PASO * 3;
  const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rotulos = imagenes.map((_, i) => `<text x="${PASO + i * (ANCHO + PASO)}" y="${ARRIBA + ALTO + 28}" font-size="18" fill="#444">${i + 1}${i === 0 ? " · la tarjeta" : ` · ${escapar((items[i]?.titulo ?? "").slice(0, 40))}`}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${ARRIBA + ALTO + ABAJO + 10}"><rect width="100%" height="100%" fill="#f4f2ee"/>
    <text x="${PASO}" y="38" font-size="26" font-weight="700" fill="#111">${escapar(x.nombre)} · ${mandado.carrusel ? `carrusel de ${imagenes.length} imágenes` : "una imagen"}</text>
    <text x="${PASO}" y="70" font-size="18" fill="#555">${escapar(`${o.casilla ? "Día de la semana" : "A mano desde su ficha"} · ${cuandoDice} · desliza →`)}</text>
    ${rotulos}<text x="${total - HIST - PASO}" y="${ARRIBA + ALTO + 28}" font-size="18" fill="#444">Historia (la tarjeta sola)</text></svg>`;
  const capas = [
    ...(await Promise.all(archivos.map(async (a, i) => ({ input: await sharp(a).resize(ANCHO, ALTO).toBuffer(), left: PASO + i * (ANCHO + PASO), top: ARRIBA })))),
    { input: await sharp(archivoHistoria).resize(HIST, ALTO).toBuffer(), left: total - HIST - PASO, top: ARRIBA },
  ];
  await sharp(Buffer.from(svg)).composite(capas).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(SALIDA, `ejemplo-${nombre}.jpg`));
  console.log(`${nombre}: ${imagenes.length} imágenes · ${f.semana.length} obras · texto ${[...post.texto].length} caracteres`);
}

// Jueves 12 de noviembre de 2026 a las 10:00 (a mano, desde su ficha) y el miércoles 18 a las 7:00 pm (el día del lugar de la semana que viene).
await ejemplo("rinoceronte", "lugar", D.lugar_sin_carteles, { ahora: "2026-11-12T16:00:00Z" });
await ejemplo("raul-gamboa", "lugar", D.lugar_con_carteles, { ahora: "2026-11-12T16:00:00Z" });
await ejemplo("raul-gamboa-semana", "lugar", D.lugar_con_carteles, { ahora: "2026-11-19T01:00:00Z", casilla: true });
await ejemplo("un-leon-marinero", "artista", D.artista_con_eventos, { ahora: "2026-11-12T16:00:00Z" });
