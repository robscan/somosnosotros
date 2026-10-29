// Guarda pantallas REALES de la app como HTML autónomo para prototipar sobre ellas (OL-409, bitácora 440): compila la app contra el
// respaldo local (nunca toca producción ni un `.env` real), abre cada pantalla en Chrome a 390×844 y escribe `<carpeta>/<id>.html` con el
// DOM ya pintado, todo el CSS que se sirvió (con sus fuentes dentro) y las imágenes como data URI, sin ningún script; y `<id>.png` al lado.
// Un prototipo mete ese HTML en un marco (`iframe`) y solo cambia los datos: así la maqueta es la de producción y no un dibujo a mano
// (el founder, 14 de octubre: «las maquetas de fichas no te salen bien… tienen un error de maquetación de origen»).
//
//   node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> [--solo=texto]
//
// Las pantallas están abajo (`PANTALLAS`); `--solo=` filtra por id (varios, separados por comas). Correrlo en un árbol SIN `.env`: con él, `next build` carga llaves reales.
// OL-466: con `MAQUETA_LECTURA=1` la app arranca con la lectura del cartel simulada en el respaldo (`/anthropic`, una llave inventada; la lectura
// la deja lista cada paso con `POST /__lectura`):
//   RESPALDO_CARTEL_EXISTENTE=1 MAQUETA_LECTURA=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=cartel-
// OL-469: con `RESPALDO_HISTORIAL=1`, el historial grande (el Museo Leonora Carrington y Valeria Quiroz, de demo), sus fotos dibujadas aquí y nada
// que salga de 127.0.0.1:
//   RESPALDO_HISTORIAL=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=hist-
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import os from "node:os";
import { ADMIN, cookie, cookieDe, LLAVE_SERVICIO } from "./respaldo-local/fixture.mjs";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../..");
const { chromium } = createRequire(path.join(RAIZ, "package.json"))("playwright-core");
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AHORA = "2026-10-07T16:00:00Z"; // el mismo reloj fijo que `medir`
const SALIDA = process.argv[2];
const solo = (process.argv.find((a) => a.startsWith("--solo=")) ?? "").slice(7);
if (!SALIDA) { console.error("uso: maqueta-pantalla.mjs <carpeta> [--solo=texto]"); process.exit(1); }
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }

/** Las pantallas que se guardan: con sesión (la cookie del respaldo; `cuenta: "admin"`, la de administración) y, si hace falta, los pasos
 *  para llegar a ellas. */
const PANTALLAS = [
  { id: "ficha-lugar", url: "/lugares/teatro-de-la-paz", sesion: true },
  { id: "ficha-festival", url: "/eventos/festival-de-cine-de-invierno", sesion: true },
  { id: "ficha-exposicion", url: "/eventos/ecos-de-papel", sesion: true },
  { id: "agenda", url: "/agenda", sesion: true },
  { id: "alta-cuanto", url: "/nuevo/evento", sesion: true, paso: "evento-cuanto" },
  // OL-425: Administración: la portada, una lista con buscador y chips (Personas), una hoja abierta (hacer administrador a Ana), la lista de
  // lugares (por el CSS del campo con su ✕ y la hoja con título) y el grafo (por el panel de ayuda).
  { id: "admin", url: "/admin", sesion: true, cuenta: "admin" },
  { id: "admin-personas", url: "/admin/personas", sesion: true, cuenta: "admin" },
  { id: "admin-persona-hoja", url: "/admin/personas/11111111-1111-4111-8111-111111111111", sesion: true, cuenta: "admin", paso: "admin-hoja-rol" },
  { id: "admin-lugares", url: "/admin/lugares", sesion: true, cuenta: "admin" },
  { id: "admin-grafo", url: "/admin/grafo", sesion: true, cuenta: "admin" },
  // OL-431 y OL-432: Administración › Ciudades como está hoy: la lista general, el panel de Oaxaca con su hoja de «Buscar lugares», la bandeja
  // de la ciudad y Corridas; y la hoja de ciudades de la app (el chip de la ciudad en Artistas), que es la de elegir una ciudad.
  { id: "admin-ciudades", url: "/admin/ciudades", sesion: true, cuenta: "admin" },
  { id: "admin-ciudades-hoja", url: "/admin/ciudades/oaxaca", sesion: true, cuenta: "admin", paso: "admin-ciudades-hoja" },
  { id: "admin-propuestas", url: "/admin/ciudades/oaxaca/propuestas", sesion: true, cuenta: "admin" },
  { id: "admin-corridas", url: "/admin/corridas", sesion: true, cuenta: "admin" },
  { id: "artistas-hoja-ciudad", url: "/artistas", sesion: true, paso: "hoja-ciudad" },
  // OL-443: el Showcase como está hoy: la lista, la ficha de Feleal con sus dos evidencias por revisar y su hoja de Estado.
  { id: "admin-showcase", url: "/admin/showcase", sesion: true, cuenta: "admin" },
  { id: "admin-showcase-ficha", url: "/admin/showcase/feleal", sesion: true, cuenta: "admin" },
  { id: "admin-showcase-estado", url: "/admin/showcase/feleal", sesion: true, cuenta: "admin", paso: "admin-showcase-estado" },
  // OL-454: Inicio como está hoy, con sus carriles (San Luis) y vacío, sin sesión y con la de Ana (que tiene planes en San Luis); con
  // `RESPALDO_VACIO=1`, Querétaro (lugares y artistas sin eventos) y Zacatecas (eventos solo pasada esta semana). Ciudad de México solo tiene una
  // artista. Y el primer paso de las tres altas (la tira Evento · Lugar · Artista) y Entrar, a donde lleva un alta sin sesión.
  { id: "inicio-slp", url: "/", sesion: true },
  { id: "inicio-qro", url: "/?ciudad=queretaro" },
  { id: "inicio-qro-sesion", url: "/?ciudad=queretaro", sesion: true },
  { id: "inicio-zac", url: "/?ciudad=zacatecas" },
  { id: "inicio-zac-sesion", url: "/?ciudad=zacatecas", sesion: true },
  { id: "inicio-cdmx", url: "/?ciudad=ciudad-de-mexico" },
  { id: "inicio-cdmx-sesion", url: "/?ciudad=ciudad-de-mexico", sesion: true },
  { id: "alta-evento", url: "/nuevo/evento?ciudad=queretaro", sesion: true },
  { id: "alta-lugar", url: "/nuevo/lugar?ciudad=queretaro", sesion: true },
  { id: "alta-artista", url: "/nuevo/artista?ciudad=queretaro", sesion: true },
  { id: "entrar-alta", url: "/entrar?siguiente=%2Fnuevo%2Fevento%3Fciudad%3Dqueretaro" },
  // OL-456: el resto de Administración y el par del front de cada pantalla, para compararlas lado a lado (comparar-admin-front.mjs).
  { id: "admin-eventos", url: "/admin/eventos", sesion: true, cuenta: "admin" },
  { id: "admin-artistas", url: "/admin/artistas", sesion: true, cuenta: "admin" },
  { id: "admin-ciudad", url: "/admin/ciudades/oaxaca", sesion: true, cuenta: "admin" },
  { id: "admin-persona", url: "/admin/personas/11111111-1111-4111-8111-111111111111", sesion: true, cuenta: "admin" },
  { id: "admin-por-aprobar", url: "/admin/showcase/por-aprobar", sesion: true, cuenta: "admin" },
  { id: "admin-obras", url: "/admin/obras-colectivas", sesion: true, cuenta: "admin" },
  { id: "admin-grafo-manual", url: "/admin/grafo/manual", sesion: true, cuenta: "admin" },
  { id: "front-lugares", url: "/lugares", sesion: true },
  { id: "front-lugares-hoja-ciudad", url: "/lugares", sesion: true, paso: "hoja-ciudad" },
  { id: "front-artistas", url: "/artistas", sesion: true },
  { id: "front-buscar", url: "/buscar", sesion: true },
  { id: "front-persona", url: "/personas/11111111-1111-4111-8111-111111111111", sesion: true },
  { id: "front-perfil", url: "/perfil", sesion: true },
  { id: "front-ajustes", url: "/ajustes", sesion: true },
  { id: "front-ficha-artista", url: "/artistas/feleal", sesion: true },
  { id: "front-ayuda", url: "/ayuda", sesion: true },
  // OL-456, parte A: la cabecera nueva de las listas con su hoja de ciudades y su hoja Filtros, una ciudad elegida y su par del front.
  { id: "admin-lugares-hoja-ciudad", url: "/admin/lugares", sesion: true, cuenta: "admin", paso: "admin-hoja-ciudad" },
  { id: "admin-lugares-filtros", url: "/admin/lugares", sesion: true, cuenta: "admin", paso: "hoja-filtros" },
  { id: "admin-artistas-cdmx", url: "/admin/artistas?ciudad=ciudad-de-mexico", sesion: true, cuenta: "admin" },
  { id: "admin-personas-hoja-ciudad", url: "/admin/personas", sesion: true, cuenta: "admin", paso: "admin-hoja-ciudad" },
  { id: "front-lugares-filtros", url: "/lugares", sesion: true, paso: "hoja-filtros" },
  // OL-457, parte B: el manual del showcase y la ficha pública de un artista con su menú (par de la ficha del showcase).
  { id: "admin-showcase-manual", url: "/admin/showcase/manual", sesion: true, cuenta: "admin" },
  // OL-458: publicar en Instagram. La lista de eventos de Administración con su hoja de ciudades, la ficha de un evento con el «···» abierto
  // (cuenta de administración). Crear cartel no se puede guardar: con el respaldo su página responde «Esto ya no está».
  { id: "admin-eventos-hoja-ciudad", url: "/admin/eventos", sesion: true, cuenta: "admin", paso: "admin-hoja-ciudad" },
  { id: "admin-evento-menu", url: "/eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi", sesion: true, cuenta: "admin", paso: "menu-acciones" },
  // OL-466 (con `RESPALDO_CARTEL_EXISTENTE=1 MAQUETA_LECTURA=1`): el alta con un cartel de un evento que ya está. La espera «Leyendo el cartel…»
  // (la subida se queda en camino), «Revisa» con «¿Es este?» de un parecido sin cartel (la Noche de danzón) y de uno con cartel (Feleal, de
  // Marcos), «Publicado» tras «No, es otro» y la ficha del evento que ya estaba, con la sesión de Ana. `reloj`: el navegador con el reloj fijo
  // (sin él, «Revisa» dice «Esa hora ya pasó» de un evento del vie 9 de oct).
  { id: "cartel-espera", reloj: true, url: "/nuevo/evento?ciudad=san-luis-potosi", sesion: true, paso: "cartel-espera" },
  { id: "cartel-revisa-sin", reloj: true, url: "/nuevo/evento?ciudad=san-luis-potosi", sesion: true, paso: "cartel-parecido-sin" },
  { id: "cartel-revisa-con", reloj: true, url: "/nuevo/evento?ciudad=san-luis-potosi", sesion: true, paso: "cartel-parecido-con" },
  { id: "cartel-publicado", reloj: true, url: "/nuevo/evento?ciudad=san-luis-potosi", sesion: true, paso: "cartel-no-es-otro" },
  { id: "cartel-ficha", reloj: true, url: "/eventos/noche-de-danzon-con-la-orquesta-tipica", sesion: true },
  { id: "cartel-ficha-feleal", reloj: true, url: "/eventos/feleal-un-viaje-por-el-mundo-en-acordeon", sesion: true },
  // Con `RESPALDO_CARTEL_EXISTENTE=despues` (en otra corrida): la misma ficha con el cartel de Ana, el precio y la descripción del cartel.
  { id: "cartel-ficha-despues", reloj: true, url: "/eventos/noche-de-danzon-con-la-orquesta-tipica", sesion: true },
  // OL-469 (con `RESPALDO_HISTORIAL=1`): el Historial del museo Leonora Carrington (demo) y la Trayectoria de Valeria Quiroz (demo) como están hoy,
  // sin sesión y con la de Ana (que gestiona las dos fichas: «Tu año» e «Informe» / «Presentación»), con la hoja del PDF abierta y con el «···».
  // Y Agenda y Artistas, por las piezas que la propuesta reutiliza (las pestañas, los chips y el renglón de un artista).
  { id: "hist-lugar", reloj: true, url: "/lugares/museo-leonora-carrington-demo" },
  { id: "hist-lugar-ana", reloj: true, url: "/lugares/museo-leonora-carrington-demo", sesion: true },
  { id: "hist-lugar-informe", reloj: true, url: "/lugares/museo-leonora-carrington-demo", sesion: true, paso: "hist-documento" },
  { id: "hist-lugar-menu", reloj: true, url: "/lugares/museo-leonora-carrington-demo", sesion: true, paso: "menu-acciones" },
  { id: "hist-artista", reloj: true, url: "/artistas/valeria-quiroz-demo" },
  { id: "hist-artista-ana", reloj: true, url: "/artistas/valeria-quiroz-demo", sesion: true },
  { id: "hist-artista-presentacion", reloj: true, url: "/artistas/valeria-quiroz-demo", sesion: true, paso: "hist-documento" },
  { id: "hist-agenda", reloj: true, url: "/agenda", sesion: true },
  { id: "hist-artistas", reloj: true, url: "/artistas", sesion: true },
  { id: "hist-lugares", reloj: true, url: "/lugares", sesion: true },
  // OL-478: lo que vive en la app para los avisos con hora y forma: Inicio con su carril Destacados (sin sesión y con la de Ana), Ajustes con su
  // grupo Avisos, Novedades (a donde abre el resumen diario), la portada de Administración (sus indicadores de 7 días) y la hoja de ciudades.
  { id: "av-inicio", reloj: true, url: "/" },
  { id: "av-inicio-sesion", reloj: true, url: "/", sesion: true },
  { id: "av-ajustes", reloj: true, url: "/ajustes", sesion: true },
  { id: "av-novedades", reloj: true, url: "/novedades", sesion: true },
  { id: "av-admin", reloj: true, url: "/admin", sesion: true, cuenta: "admin" },
  { id: "av-hoja-ciudad", reloj: true, url: "/artistas", sesion: true, paso: "hoja-ciudad" },
];
// OL-466: los dos carteles que se suben (inventados, dibujados aquí) y lo que «leería» el modelo de cada uno. Las fechas salen del reloj fijo
// (`AHORA`, mié 7 de oct): la Noche de danzón es pasado mañana (vie 9) a las 20:00 y Feleal el mié 14 a las 19:00, los dos en el Teatro de la Paz.
const NULOS = { titulo: null, fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null, clase: null, visita: null, sesiones: null, actos: null, festival: null };
const CARTELES = {
  danzon: {
    lectura: { ...NULOS, titulo: "Noche de Danzón", fecha: "2026-10-09", hora: "20:00", hora_fin: "23:00", lugar: "Teatro de la Paz", precio: "$150", descripcion: "Baile de salón con orquesta en vivo: danzón, mambo y chachachá. Clase abierta para principiantes a las 19:30.", artistas: ["Orquesta Típica de San Luis"], clase: "puntual" },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#7a1f2b"/><circle cx="400" cy="330" r="190" fill="#e9b949"/><text x="400" y="610" fill="#fff6e0" font-family="Georgia" font-size="96" font-style="italic" text-anchor="middle">Noche de</text><text x="400" y="720" fill="#e9b949" font-family="Georgia" font-size="120" font-weight="700" text-anchor="middle">DANZÓN</text><text x="400" y="820" fill="#fff6e0" font-family="Arial" font-size="34" text-anchor="middle">Orquesta Típica de San Luis</text><text x="400" y="900" fill="#fff6e0" font-family="Arial" font-size="34" font-weight="700" text-anchor="middle">VIE 9 OCT · 20:00 · TEATRO DE LA PAZ</text></svg>',
  },
  feleal: {
    lectura: { ...NULOS, titulo: "Feleal: un viaje en acordeón", fecha: "2026-10-14", hora: "19:00", lugar: "Teatro de la Paz", precio: "$120 a $250", artistas: ["Feleal"], clase: "puntual" },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#123b4a"/><rect x="60" y="60" width="680" height="880" fill="none" stroke="#f4d35e" stroke-width="8"/><text x="400" y="420" fill="#f4d35e" font-family="Arial" font-size="150" font-weight="800" text-anchor="middle">FELEAL</text><text x="400" y="520" fill="#fff" font-family="Arial" font-size="52" text-anchor="middle">un viaje en acordeón</text><text x="400" y="820" fill="#fff" font-family="Arial" font-size="38" font-weight="700" text-anchor="middle">MIÉ 14 OCT · 19:00</text><text x="400" y="880" fill="#fff" font-family="Arial" font-size="34" text-anchor="middle">Teatro de la Paz</text></svg>',
  },
};
async function archivoDe(clave, tipo = "png") {
  const sharp = (await import(path.join(RAIZ, "node_modules/sharp/dist/index.mjs"))).default;
  const archivo = path.join(os.tmpdir(), `ol466-${clave}.${tipo}`);
  if (!fs.existsSync(archivo)) await sharp(Buffer.from(CARTELES[clave].svg)).toFormat(tipo === "jpg" ? "jpeg" : "png").toFile(archivo);
  return archivo;
}
/** Sube el cartel con su lectura lista y sigue hasta «Revisa» (contesta «¿Es en …?» si el cartel lo pregunta). */
async function hastaRevisa(page, { respaldo }, clave) {
  const archivo = await archivoDe(clave);
  await fetch(`${respaldo}/__lectura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lectura: CARTELES[clave].lectura, archivo }) });
  await page.locator("input[type=file]").setInputFiles(archivo);
  const revisa = page.getByRole("heading", { name: "Revisa", exact: true });
  for (let i = 0; i < 6 && !(await revisa.isVisible()); i++) {
    const esAqui = page.getByRole("button", { name: /^Sí, es aquí/ });
    await Promise.race([revisa.waitFor({ timeout: 30000 }), esAqui.waitFor({ timeout: 30000 })]).catch(() => {});
    if (await esAqui.isVisible()) await esAqui.click();
  }
  await revisa.waitFor();
}
// El respaldo es http y `imagenPermitida` pide https: al armar lo que se manda (el evento `formdata`) se vacía el campo `imagen`, así
// el servidor no se queda en «La imagen no se subió bien» y contesta «¿Es este?» como en producción. En pantalla no cambia nada: la cabeza de
// «Revisa» y «Publicado» pintan el cartel con lo que ya tiene el alta.
const sinImagenAlServidor = (page) => page.locator("form#publicar-evento").evaluate((f) => f.addEventListener("formdata", (e) => e.formData.set("imagen", "")));
async function preguntarParecido(page, ctx, clave) {
  await hastaRevisa(page, ctx, clave);
  await sinImagenAlServidor(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.getByText("Ya hay uno parecido ese día en el mismo sitio").waitFor();
}
const PASOS = {
  // OL-469: abre lo pasado de la ficha («Historial» o «Trayectoria») y toca «Informe» o «Presentación»: la hoja del PDF (DocumentoPdf).
  "hist-documento": async (page) => {
    await page.locator("details#historial > summary, details#trayectoria > summary").first().click();
    // Hoy el botón cae fuera de la pantalla (bitácora 501: el plegado mide más que ella) y nada lo deja tocar: la maqueta lo pulsa por dentro.
    await page.getByRole("button", { name: /^(Informe|Presentación)$/ }).dispatchEvent("click");
    await page.getByRole("dialog").waitFor();
  },
  // OL-466: la espera con la lectura en curso (la subida a Storage se queda en camino para que la pantalla no avance) y los demás estados del alta.
  "cartel-espera": async (page) => {
    await page.route(/\/storage\/v1\/object\/fotos\//, () => {});
    await page.locator("input[type=file]").setInputFiles(await archivoDe("danzon"));
    await page.getByText("Leyendo el cartel…").waitFor();
  },
  "cartel-parecido-sin": (page, ctx) => preguntarParecido(page, ctx, "danzon"),
  "cartel-parecido-con": (page, ctx) => preguntarParecido(page, ctx, "feleal"),
  "cartel-no-es-otro": async (page, ctx) => {
    await preguntarParecido(page, ctx, "danzon");
    await page.getByRole("button", { name: "No, es otro: publicar de todos modos" }).click();
    await page.getByRole("heading", { name: "Evento publicado" }).waitFor();
  },
  // OL-458: el «···» de la barra de una ficha (ui/MenuAcciones).
  "menu-acciones": async (page) => {
    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("dialog", { name: "Más acciones" }).waitFor();
  },
  // OL-456: la hoja de ciudades de una lista de Administración (el chip «Todas las ciudades») y la hoja Filtros (de Administración o de Lugares).
  "admin-hoja-ciudad": async (page) => {
    await page.getByRole("button", { name: "Todas las ciudades" }).click();
    await page.getByRole("dialog").waitFor();
  },
  "hoja-filtros": async (page) => {
    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByRole("dialog", { name: "Filtros" }).waitFor();
  },
  // La hoja de los cinco estados en la ficha de showcase (el renglón «Invitado» con su chevron).
  "admin-showcase-estado": async (page) => {
    await page.locator("button[aria-haspopup='dialog'][data-ayuda='estado']").click();
    await page.getByRole("dialog").waitFor();
  },
  // La hoja de «Buscar lugares» de Oaxaca en su panel de Administración › Ciudades (ui/Hoja con título, ui/Campo con su ✕ y el pie).
  "admin-ciudades-hoja": async (page) => {
    await page.getByRole("group", { name: "Lugares" }).getByRole("button", { name: "Buscar lugares" }).click();
    await page.getByRole("dialog", { name: "Buscar lugares en Oaxaca" }).waitFor();
  },
  // La hoja de ciudades de la app: el chip de la ciudad de Artistas (ui/Hoja plana con los renglones de cada ciudad).
  "hoja-ciudad": async (page) => {
    await page.getByRole("button", { name: /San Luis Potosí/ }).first().click();
    await page.getByRole("dialog").waitFor();
  },
  // La hoja «Hacer administrador» de la ficha de una persona en Administración (ui/Hoja sin título, con su botón principal).
  "admin-hoja-rol": async (page) => {
    await page.getByRole("button", { name: "Hacer administrador" }).first().click();
    await page.getByRole("dialog").waitFor();
  },
  // El alta de un evento hasta «¿Cuánto cuesta?»: sin cartel, nombre, este viernes a las 7, sin fin, «Estoy aquí» con un sitio nuevo usado solo aquí.
  "evento-cuanto": async (page) => {
    const ctx = page.context();
    await ctx.grantPermissions(["geolocation"]);
    await ctx.setGeolocation({ latitude: 22.1533, longitude: -100.9811 });
    await page.getByRole("button", { name: "No tengo cartel" }).click();
    await page.getByRole("textbox", { name: "Nombre del evento" }).fill("Ecos de papel");
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await page.getByRole("button", { name: /^Este viernes/ }).click();
    await page.getByRole("button", { name: /^7:00 pm/ }).click();
    await page.getByRole("button", { name: "Sin hora de fin" }).click();
    await page.getByRole("button", { name: /Estoy aquí/ }).click();
    await page.getByRole("heading", { name: "¿Es aquí?" }).waitFor();
    await page.getByRole("textbox", { name: "Nombre del lugar" }).fill("Cinema 7B");
    await page.getByRole("button", { name: /^Sí, es aquí/ }).click();
    await page.getByRole("button", { name: /^Usarlo solo en este evento/ }).click();
    await page.getByRole("heading", { name: "¿Cuánto cuesta?" }).waitFor();
  },
};

const puertoLibre = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const hijos = [];
const lanzar = (args, env) => { const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: "ignore" }); hijos.push(h); return h; };
const esperar = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error("no arranca " + url); };

const [puertoRespaldo, puertoApp] = [await puertoLibre(), await puertoLibre()];
const app = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${puertoRespaldo}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: LLAVE_SERVICIO };
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${path.join(AQUI, "reloj-fijo.cjs")}` };
let browser;
try {
  // OL-466: la ficha «después» pide al respaldo el cartel de Ana (`demo-carrusel/ol466-danzon.jpg` en la carpeta temporal).
  const despues = process.env.RESPALDO_CARTEL_EXISTENTE === "despues" ? { RESPALDO_URL: `http://127.0.0.1:${puertoRespaldo}`, RESPALDO_CARRUSEL_DIR: path.dirname(await archivoDe("danzon", "jpg")) } : {};
  // OL-469: las fotos y los carteles del historial grande, dibujados en una carpeta temporal que el respaldo sirve.
  if (process.env.RESPALDO_HISTORIAL === "1") {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "ol469-"));
    await (await import("./respaldo-local/fotos-historial.mjs")).dibujarFotosHistorial(carpeta);
    Object.assign(despues, { RESPALDO_URL: `http://127.0.0.1:${puertoRespaldo}`, RESPALDO_CARRUSEL_DIR: carpeta });
  }
  lanzar([path.join(AQUI, "respaldo-local/server.mjs"), String(puertoRespaldo)], { ...reloj, ...despues });
  await esperar(`http://127.0.0.1:${puertoRespaldo}/rest/v1/eventos?select=id&limit=1`);
  process.stdout.write("compilando la app contra el respaldo… ");
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`next build falló\n${(r.stdout + r.stderr).slice(-3000)}`);
  console.log(`${Math.round((Date.now() - t) / 1000)} s`);
  const lectura = process.env.MAQUETA_LECTURA === "1" ? { ANTHROPIC_API_KEY: "llave-inventada", ANTHROPIC_BASE_URL: `http://127.0.0.1:${puertoRespaldo}/anthropic` } : {};
  lanzar([NEXT, "start", "-p", String(puertoApp)], { ...app, ...reloj, ...lectura });
  const base = `http://127.0.0.1:${puertoApp}`;
  await esperar(base + "/entrar");
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true, args: ["--hide-scrollbars"] });
  fs.mkdirSync(SALIDA, { recursive: true });
  for (const p of PANTALLAS.filter((x) => !solo || solo.split(",").some((t) => x.id.includes(t)))) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX" });
    if (p.reloj) await ctx.clock.setFixedTime(new Date(AHORA));
    if (p.sesion) await ctx.addCookies([{ name: "sb-127-auth-token", value: p.cuenta === "admin" ? cookieDe(ADMIN) : cookie, url: base }]);
    // OL-469: con el historial grande, nada sale de 127.0.0.1 (las imágenes del respaldo de siempre son de Storage: se quedan sin pintar).
    if (process.env.RESPALDO_HISTORIAL === "1") await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => q.abort());
    const page = await ctx.newPage();
    await page.goto(base + p.url, { waitUntil: "networkidle" });
    // Si un paso no llega, la captura de cómo se quedó va al lado, con «-fallo».
    if (p.paso) await PASOS[p.paso](page, { respaldo: `http://127.0.0.1:${puertoRespaldo}` }).catch(async (e) => { await page.screenshot({ path: path.join(SALIDA, `${p.id}-fallo.png`) }); throw e; });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SALIDA, `${p.id}.png`) });
    const html = await page.evaluate(async () => {
      const aDataUri = async (url) => { try { const b = await (await fetch(url)).blob(); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch { return url; } };
      // El CSS: cada hoja entera, con sus fuentes dentro.
      let css = "";
      for (const hoja of document.styleSheets) {
        let texto = hoja.href ? await (await fetch(hoja.href)).text() : [...hoja.cssRules].map((x) => x.cssText).join("\n");
        for (const u of new Set([...texto.matchAll(/url\((["']?)(\/_next\/[^)"']+)\1\)/g)].map((m) => m[2]))) texto = texto.split(u).join(await aDataUri(u));
        css += `\n/* ${hoja.href ?? "inline"} */\n${texto}`;
      }
      // Las imágenes del DOM, dentro; los scripts, fuera.
      for (const img of document.images) { const src = img.currentSrc || img.src; if (src && !src.startsWith("data:")) { img.setAttribute("src", await aDataUri(src)); img.removeAttribute("srcset"); img.removeAttribute("sizes"); } }
      for (const el of document.querySelectorAll("[style*='url(']")) { const m = el.getAttribute("style").match(/url\((["']?)([^)"']+)\1\)/); if (m && !m[2].startsWith("data:")) el.setAttribute("style", el.getAttribute("style").replace(m[2], await aDataUri(m[2]))); }
      document.querySelectorAll("script, link, noscript, next-route-announcer").forEach((e) => e.remove());
      const attrs = (el) => [...el.attributes].map((a) => `${a.name}="${a.value.replace(/"/g, "&quot;")}"`).join(" ");
      return `<!doctype html>\n<html ${attrs(document.documentElement)}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${document.title}</title>\n<style>${css}\n</style>\n</head>\n<body ${attrs(document.body)}>\n${document.body.innerHTML}\n</body>\n</html>\n`;
    });
    fs.writeFileSync(path.join(SALIDA, `${p.id}.html`), html);
    console.log(p.id, Math.round(html.length / 1024), "KB");
    await ctx.close();
  }
} finally {
  await browser?.close();
  for (const h of hijos) h.kill();
}
