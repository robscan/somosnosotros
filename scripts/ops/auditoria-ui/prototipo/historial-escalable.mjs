// Arma el prototipo de OL-469 (bitácora 501): el Historial del lugar y la Trayectoria del artista escalables, sobre las maquetas REALES de
// `maqueta-pantalla.mjs` (la app compilada contra el respaldo local con el historial grande, `RESPALDO_HISTORIAL=1`): el CSS que se sirvió y el
// cuerpo de cada ficha tal cual. Cada estado se arma en Chrome (playwright-core) con el DOM de la maqueta: abre el plegado, mueve o cambia
// piezas que ya existen con sus clases de producción (con su hash: `c()` falla si una no está, así nunca se inventa una) y guarda el cuerpo:
// el carril de avatares de Inicio (`Destacados/carril` y `Destacados/avatar` con `TarjetaAvatar`), su «Ver todos» (`Destacados/verTodo`), los
// chips (`ui/Chip` en su fila que se desliza), «Ver más» (`ui/CargarMas` con `ui/Boton`), `ui/Plegado`, `ui/Hoja` con los renglones de
// Artistas y de Lugares (`ui/Renglon`), la hoja del PDF (`DocumentoPdf`) y el «···» (`ui/MenuAcciones` con `Renglon/ajuste`). Lo poco nuevo va en
// `NUEVO_CSS` (prefijo `he-`) y la regla de higiene (`HIGIENE`), y solo en los estados de la propuesta; «Hoy» va sin tocar. `data-propuesta`
// solo marca qué medir. Escribe `docs/rediseno/prototipos/historial-escalable.html`; el armazón (selectores, tamaños, notas y medidor) vive en la
// plantilla de al lado.
//
//   RESPALDO_HISTORIAL=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=hist-
//   node scripts/ops/auditoria-ui/prototipo/historial-escalable.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "../../../..");
const requerir = createRequire(path.join(RAIZ, "package.json"));
const sharp = requerir("sharp");
const { chromium } = requerir("playwright-core");
const MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MAQ = process.argv[2];
if (!MAQ) { console.error("uso: historial-escalable.mjs <carpeta-de-maquetas>"); process.exit(1); }
const SALIDA = path.join(RAIZ, "docs/rediseno/prototipos/historial-escalable.html");
const leer = (id) => fs.readFileSync(path.join(MAQ, id + ".html"), "utf8");
const MAQUETAS = ["hist-lugar", "hist-lugar-ana", "hist-lugar-informe", "hist-lugar-menu", "hist-artista", "hist-artista-ana", "hist-artista-presentacion", "hist-artistas", "hist-lugares"];

// 1. CSS: cada hoja una sola vez (por su ruta, sin el puerto), sin @font-face (la letra la trae Google Fonts, como en los demás prototipos).
const hojas = new Map();
for (const id of MAQUETAS) {
  const html = leer(id);
  const css = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
  const trozos = css.split(/\n\/\* (http:\/\/127\.0\.0\.1:\d+\/[^ ]+|inline) \*\/\n/);
  for (let i = 1; i < trozos.length; i += 2) {
    const clave = trozos[i] === "inline" ? "inline:" + trozos[i + 1].length : trozos[i].replace(/^http:\/\/127\.0\.0\.1:\d+/, "");
    if (!hojas.has(clave)) hojas.set(clave, trozos[i + 1]);
  }
}
let CSS = "";
for (const [clave, texto] of hojas) CSS += `\n/* ${clave} */\n` + texto.replace(/@font-face\s*\{[^}]*\}/g, "");
CSS = CSS.replace(/<\/style/gi, "<\\/style");

// 2. Las clases de producción (con su hash).
const K = {};
for (const m of CSS.matchAll(/\.([A-Za-z0-9_]+)-module__([A-Za-z0-9_-]{6})__([A-Za-z][A-Za-z0-9_]*)/g)) K[`${m[1]}/${m[3]}`] = `${m[1]}-module__${m[2]}__${m[3]}`;
const c = (...nombres) => nombres.map((n) => { if (!K[n]) throw new Error("clase desconocida " + n); return K[n]; }).join(" ");
const sel = (n) => "." + c(n);

// 3. Lo nuevo, en una sola hoja, solo en los estados de la propuesta.
//  · La regla de higiene (bitácora 501, el diagnóstico): el cuerpo de la ficha es una rejilla de una columna `auto`; un `<details>` que lleva
//    dentro una fila que se desliza le contagia el ancho de todas sus fotos y la columna crece más que la pantalla. Con `minmax(0, 1fr)` la
//    columna es la pantalla y la fila se desliza. No se cambia en esta pieza: aquí solo para dibujar la propuesta.
const HIGIENE = `${sel("Ficha/cuerpo")} { grid-template-columns: minmax(0, 1fr); }`;
//  · El carril de Inicio dentro del plegado: empieza en el margen del contenido y llega hasta el borde de la pantalla (más ancho que su caja
//    por la derecha, sin margen negativo), así asoma el siguiente avatar como en Inicio; la cabecera de la fila con «Ver los 9»
//    a la derecha (`Destacados/verTodo`); «9 veces» en gris en el renglón de la novedad de `TarjetaAvatar`; los chips de los años con su aire
//    arriba; «Tu año» y el PDF en dos columnas si caben enteros (con su icono, que nunca se aplasta) y uno bajo otro si no (a 320); el año plegado, un escalón más chico que «Historial»; la lista de la hoja «Ver los 9», sin viñetas ni el aire de `Grupo/lista`
//    (la hoja ya lo pone).
const NUEVO_CSS = `
${sel("Plegado/plegado")} > p.he-cabeza { display: flex; align-items: center; justify-content: space-between; column-gap: var(--espacio-2); padding-top: var(--espacio-3); }
${sel("Plegado/plegado")} > p.he-cabeza > a { font-size: var(--letra-sm); }
${sel("Plegado/plegado")} > ul.he-carril { width: calc(100% + var(--gutter)); padding-inline: 0 var(--gutter); scroll-padding-inline: 0; }
a > span.he-veces { color: var(--texto-suave); }
${sel("Plegado/plegado")} > .he-anios { margin: var(--espacio-4) 0 0; }
${sel("Plegado/plegado")} > ${sel("Historial/botones")}.he-arriba { grid-auto-flow: row; grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr)); margin: var(--espacio-3) 0 var(--espacio-1); }
${sel("Historial/botones")}.he-arriba svg { flex: none; }
${sel("Plegado/plegado")} > details.he-anio > summary > h2 { font-size: var(--letra-lg); }
${sel("Plegado/plegado")} > details.he-anio { padding-top: var(--espacio-2); }
[role="dialog"] ul.he-lista { list-style: none; }
`;

// 4. Piezas de otras maquetas: la hoja (el armazón de la del «···», sin su contenido), la del PDF tal cual, el «···» y los renglones de
// Artistas y de Lugares (por su enlace).
const cuerpo = (html) => html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const HTML_TAG = leer("hist-lugar-ana").match(/<html[^>]*>/)[0];
const uno = (texto, patron, que) => { const m = [...texto.matchAll(new RegExp(patron.source, "g"))]; if (m.length !== 1) throw new Error(`${que}: ${m.length} coincidencias`); return m[0][0]; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fondo = (id) => uno(cuerpo(leer(id)), new RegExp(`<div class="${esc(c("Hoja/fondo"))}"[^>]*>[\\s\\S]*?</div></div>(?=\\s*$)`), "hoja " + id).replace(/^<div class="([^"]+)"[^>]*>/, '<div class="$1">');
const PIEZAS = {
  menuLugar: fondo("hist-lugar-menu"),
  documentoLugar: fondo("hist-lugar-informe"),
  documentoArtista: fondo("hist-artista-presentacion"),
  renglones: {},
};
for (const id of ["hist-artistas", "hist-lugares"]) {
  for (const m of cuerpo(leer(id)).matchAll(new RegExp(`<li class="${esc(c("Renglon/lista"))}"><a class="${esc(c("Renglon/frente"))}" href="([^"]+)">[\\s\\S]*?</li>`, "g"))) PIEZAS.renglones[m[1]] ??= m[0];
}

// 5. Los estados. `ficha`: lugar o artista; `sesion`: Ana (gestiona las dos fichas) o nadie. Las decisiones: `fila` (hoy · F1 carril de Inicio ·
// F2 la fila de hoy arreglada · F3 sin fila), `lista` (hoy · L1 chips de año · L2 años plegados · L3 «Ver más» sin años), `acciones` (hoy · A1
// arriba · A2 en el «···»); `anio` el año elegido, `tanda` cuántos renglones se ven; `hoja` (todos · documento · menu); `ver` a qué se baja.
const R = { fila: "F1", lista: "L1", acciones: "A1" };
const E = [
  // El lugar, hoy (la app como está: el fallo a la vista).
  ["lugar-hoy-plegado", { ficha: "lugar", sesion: true, hoy: true, abierto: false, ver: "resumen" }],
  ["lugar-hoy-fila", { ficha: "lugar", sesion: true, hoy: true, ver: "fila" }],
  ["lugar-hoy-final", { ficha: "lugar", sesion: true, hoy: true, ver: "final" }],
  // La propuesta (F1 · L1 · A1).
  ["lugar-r-plegado", { ficha: "lugar", sesion: true, ...R, abierto: false, ver: "resumen" }],
  ["lugar-r-ana", { ficha: "lugar", sesion: true, ...R, ver: "resumen" }],
  ["lugar-r-sin-sesion", { ficha: "lugar", sesion: false, ...R, ver: "resumen" }],
  ["lugar-r-carril-movido", { ficha: "lugar", sesion: true, ...R, ver: "fila", carril: 999 }],
  ["lugar-r-todos", { ficha: "lugar", sesion: true, ...R, ver: "fila", hoja: "todos" }],
  ["lugar-r-2025", { ficha: "lugar", sesion: true, ...R, anio: "2025", ver: "chips" }],
  ["lugar-r-ver-mas", { ficha: "lugar", sesion: true, ...R, ver: "mas" }],
  ["lugar-r-tanda-2", { ficha: "lugar", sesion: true, ...R, tanda: 40, ver: "mas" }],
  ["lugar-r-informe", { ficha: "lugar", sesion: true, ...R, ver: "resumen", hoja: "documento" }],
  // Las otras opciones de cada decisión, con lo demás como la propuesta.
  ["lugar-f2", { ficha: "lugar", sesion: true, ...R, fila: "F2", ver: "fila" }],
  ["lugar-f3", { ficha: "lugar", sesion: true, ...R, fila: "F3", ver: "resumen" }],
  ["lugar-l2", { ficha: "lugar", sesion: true, ...R, lista: "L2", ver: "anios" }],
  ["lugar-l3", { ficha: "lugar", sesion: true, ...R, lista: "L3", ver: "resumen" }],
  ["lugar-a2", { ficha: "lugar", sesion: true, ...R, acciones: "A2", ver: "resumen" }],
  ["lugar-a2-menu", { ficha: "lugar", sesion: true, ...R, acciones: "A2", ver: "resumen", hoja: "menu" }],
  // La Trayectoria del artista, hoy y con la misma pieza.
  ["artista-hoy-fila", { ficha: "artista", sesion: true, hoy: true, ver: "fila" }],
  ["artista-hoy-final", { ficha: "artista", sesion: true, hoy: true, ver: "final" }],
  ["artista-r-ana", { ficha: "artista", sesion: true, ...R, ver: "resumen" }],
  ["artista-r-sin-sesion", { ficha: "artista", sesion: false, ...R, ver: "resumen" }],
  ["artista-r-todos", { ficha: "artista", sesion: true, ...R, ver: "fila", hoja: "todos" }],
  ["artista-r-2025", { ficha: "artista", sesion: true, ...R, anio: "2025", ver: "chips" }],
  ["artista-r-presentacion", { ficha: "artista", sesion: true, ...R, ver: "resumen", hoja: "documento" }],
];

/** En la página (Chrome): arma un estado sobre el DOM de la maqueta. */
function armar({ K, e, P, HIGIENE, NUEVO_CSS, TANDA }) {
  const c = (...n) => n.map((x) => { if (!K[x]) throw new Error("clase desconocida " + x); return K[x]; }).join(" ");
  const nodo = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const det = document.querySelector("details#historial, details#trayectoria");
  const esLugar = e.ficha === "lugar";
  if (e.abierto !== false) det.open = true;
  // Ninguna imagen de fuera (el mapa de Mapbox con la llave inventada): sin `src`, la caja queda gris.
  for (const img of document.images) if (!img.getAttribute("src")?.startsWith("data:")) img.removeAttribute("src");
  const marcar = (el, que) => { if (el) el.dataset.ver = que; };
  if (e.hoy) {
    marcar(det.querySelector(":scope > summary"), "resumen");
    marcar(det.querySelector(":scope > p"), "fila");
    marcar(det.lastElementChild, "final");
    return;
  }
  const estilo = document.createElement("style");
  estilo.dataset.propuesta = "css";
  estilo.textContent = HIGIENE + NUEVO_CSS;
  document.body.prepend(estilo);

  // Lo que hay hoy dentro del plegado: el título de la fila, la fila, los meses (h3 + ul) y los botones.
  const resumen = det.querySelector(":scope > summary");
  const tituloFila = det.querySelector(":scope > p");
  const filaHoy = det.querySelector(`:scope > ul.${c("Historial/fila")}`);
  const botones = det.querySelector(`:scope > .${c("Historial/botones")}`);
  const calendario = det.querySelector("small > span > svg").outerHTML; // IconoCalendario de 15, el de cuándo de cada renglón
  const chevron = det.querySelector(`svg.${c("Historial/chevron")}`).cloneNode(true);
  chevron.removeAttribute("class");
  const presencias = [...filaHoy.children].map((li) => {
    const a = li.querySelector("a");
    return { href: a.getAttribute("href"), foto: a.querySelector("img").getAttribute("src"), nombre: a.querySelector(`.${c("Historial/nombre")}`).textContent, veces: a.querySelector(`.${c("Historial/veces")}`)?.textContent ?? "1 vez" };
  });
  const grupos = [...det.querySelectorAll(":scope > h3")].map((h3) => ({ h3, ul: h3.nextElementSibling, anio: h3.textContent.match(/\d{4}/)[0] }));
  const anios = [...new Set(grupos.map((g) => g.anio))];
  const enAnio = (a) => grupos.filter((g) => g.anio === a).reduce((n, g) => n + g.ul.children.length, 0);
  for (const g of grupos) { g.h3.remove(); g.ul.remove(); }
  tituloFila.remove();
  filaHoy.remove();
  botones?.remove();

  // La cuenta del renglón: los artistas son los registrados (los que tienen ficha y están ligados a un evento de aquí).
  const cuenta = resumen.querySelector("small");
  if (esLugar) cuenta.textContent = cuenta.textContent.replace(/(\d+) artistas?$/, (_, n) => `${n} ${n === "1" ? "artista registrado" : "artistas registrados"}`);
  marcar(resumen, "resumen");
  const poner = (el) => { det.append(el); return el; };

  // A1: «Tu año» y el PDF, lo primero al abrir, a lo ancho y enteros.
  if (e.sesion && e.acciones === "A1" && botones) {
    botones.classList.add("he-arriba");
    botones.dataset.propuesta = "acciones";
    poner(botones);
  }

  // La fila. F1: el carril de avatares de Inicio (88, columnas de 108, «Ver todos»); F2: la de hoy (60), que ya se desliza; F3: solo el renglón.
  const titulo = esLugar ? "Han pasado por aquí" : "Se ha presentado en";
  const ver = presencias.length > 3 ? `<a class="${c("Destacados/verTodo")}" href="#todos" data-accion="todos">Ver los ${presencias.length}${chevron.outerHTML}</a>` : "";
  const cabeza = poner(nodo(`<p class="he-cabeza" data-propuesta="cabeza">${e.fila === "F3" ? `${titulo} · ${presencias.length}` : titulo}${ver}</p>`));
  marcar(cabeza, "fila");
  if (e.fila === "F1") {
    const carril = poner(nodo(`<ul class="${c("Destacados/carril", "Destacados/avatar")} he-carril" aria-label="${titulo}" data-propuesta="carril"></ul>`));
    for (const p of presencias.slice(0, 12)) {
      carril.append(nodo(`<li><a class="${c("TarjetaAvatar/avatar")}" href="${p.href}"><img width="88" height="88" class="${c("TarjetaAvatar/foto")}" src="${p.foto}" alt="" loading="lazy" decoding="async"><span class="${c("TarjetaAvatar/nombre")}">${p.nombre}</span><span class="${c("TarjetaAvatar/nuevo")} he-veces">${p.veces}</span></a></li>`));
    }
    if (e.carril) carril.dataset.desplazar = String(e.carril); // la plantilla lo desliza al pintar (el desplazamiento no se guarda en el HTML)
  } else if (e.fila === "F2") {
    filaHoy.dataset.propuesta = "carril";
    poner(filaHoy);
  }

  // La lista. L1: los chips de los años (el más reciente elegido) y ese año por mes, en tandas de 20 con «Ver más»; L2: el año en curso por mes
  // y los anteriores plegados con su cuenta; L3: todo por mes, en tandas de 20.
  const tanda = e.tanda ?? TANDA;
  const elegido = e.anio ?? anios[0];
  const masBoton = (quedan) => nodo(`<div class="${c("CargarMas/zona")}" data-propuesta="mas"><button type="button" class="${c("Boton/boton", "Boton/secundario", "Boton/contenido", "Boton/pildora", "Boton/control", "CargarMas/boton")}" data-accion="mas">Ver más</button></div>`);
  const ponerGrupos = (lista, destino, limite = Infinity) => {
    let vistos = 0, total = lista.reduce((n, g) => n + g.ul.children.length, 0);
    for (const g of lista) {
      if (vistos >= limite) break;
      const ul = g.ul.cloneNode(true);
      while (vistos + ul.children.length > limite) ul.lastElementChild.remove();
      vistos += ul.children.length;
      destino.append(g.h3.cloneNode(true), ul);
    }
    if (vistos < total) { const m = masBoton(total - vistos); destino.append(m); marcar(m, "mas"); }
    return vistos;
  };
  if (e.lista === "L1") {
    if (anios.length > 1) {
      const chips = poner(nodo(`<div class="${c("Chip/chips")} he-anios" role="group" aria-label="Año" data-propuesta="chips"></div>`));
      for (const a of anios) chips.append(nodo(`<button type="button" class="${c("Chip/chip", "Chip/toque")}${a === elegido ? " " + c("Chip/activo") : ""}" aria-pressed="${a === elegido}" data-anio="${a}">${a} <span class="${c("Chip/cuenta")}">${enAnio(a)}</span></button>`));
      marcar(chips, "chips");
    }
    ponerGrupos(grupos.filter((g) => g.anio === elegido), det, tanda);
  } else if (e.lista === "L2") {
    ponerGrupos(grupos.filter((g) => g.anio === anios[0]), det);
    for (const a of anios.slice(1)) {
      const d = poner(nodo(`<details class="${c("Plegado/plegado")} he-anio" data-propuesta="anio"><summary><h2>${a}</h2><small>${enAnio(a)} ${esLugar ? "eventos" : "fechas"}</small>${resumen.querySelector("svg").outerHTML}</summary></details>`));
      if (a === anios[1]) marcar(d, "anios");
      ponerGrupos(grupos.filter((g) => g.anio === a), d);
    }
  } else if (e.lista === "L3") {
    ponerGrupos(grupos, det, tanda);
  }

  // Las hojas: todos (los renglones de Artistas o de Lugares, con cuántas veces en vez de lo próximo), el PDF tal cual y el «···».
  if (e.hoja === "todos") {
    const hoja = nodo(P.menuLugar);
    const caja = hoja.querySelector('[role="dialog"]');
    caja.classList.add(c("Hoja/conCabecera"));
    caja.setAttribute("aria-label", titulo);
    caja.dataset.propuesta = "hoja";
    caja.querySelector("ul").remove();
    const nota = esLugar
      ? `${presencias.length} artistas registrados: los que tienen ficha en el catálogo y están en algún evento de aquí. Una exposición colectiva o un evento sin artistas ligados no suma.`
      : `${presencias.length} lugares con ficha. Una fecha en un sitio sin ficha cuenta en la trayectoria, pero no aquí.`;
    caja.insertAdjacentHTML("beforeend", `<h3>${titulo}</h3><div class="${c("Hoja/cuerpo")}"><p class="${c("Hoja/nota")}">${nota}</p><ul class="he-lista"></ul></div>`);
    const ul = caja.querySelector("ul");
    for (const p of presencias) {
      const r = P.renglones[p.href];
      if (!r) throw new Error("sin renglón para " + p.href);
      const li = nodo(r);
      // Las líneas de lo que viene (en violeta: «Próximo: …», «Festival hasta …») se quitan; en su lugar, cuántas veces pasó por aquí, en el
      // gris de los datos. Se queda la primera línea del renglón (disciplina, o tipo y calle).
      for (const linea of li.querySelectorAll("small > span:has(> b)")) linea.remove();
      li.querySelector("small").append(nodo(`<span>${calendario}<span>${p.veces}</span></span>`));
      ul.append(li);
    }
    document.body.append(hoja);
  } else if (e.hoja === "documento") {
    const hoja = nodo(esLugar ? P.documentoLugar : P.documentoArtista);
    hoja.querySelector('[role="dialog"]').dataset.propuesta = "hoja";
    document.body.append(hoja);
  } else if (e.hoja === "menu") {
    const hoja = nodo(P.menuLugar);
    const ul = hoja.querySelector("ul");
    const regalo = botones.querySelector("a svg").outerHTML, doc = botones.querySelector("button svg").outerHTML;
    ul.prepend(
      nodo(`<li data-propuesta="menu"><a class="${c("Renglon/ajuste")}" href="${botones.querySelector("a").getAttribute("href")}">${regalo}<b>Tu año 2026</b></a></li>`),
      nodo(`<li data-propuesta="menu"><button type="button" class="${c("Renglon/ajuste")}">${doc}<b>${esLugar ? "Informe de actividad" : "Presentación"}</b></button></li>`),
    );
    document.body.append(hoja);
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || (fs.existsSync(MAC) ? MAC : undefined), headless: true });
const pagina = await browser.newPage({ viewport: { width: 390, height: 844 } });
const P = {};
for (const [id, e] of E) {
  const fuente = e.ficha === "lugar" ? (e.sesion ? "hist-lugar-ana" : "hist-lugar") : e.sesion ? "hist-artista-ana" : "hist-artista";
  await pagina.setContent(leer(fuente).replace(/<style>[\s\S]*?<\/style>/, "<style></style>"), { waitUntil: "domcontentloaded" });
  await pagina.evaluate(armar, { K, e, P: PIEZAS, HIGIENE, NUEVO_CSS, TANDA: 20 });
  P[id] = await pagina.evaluate(() => document.body.innerHTML);
  if (/Lorem|undefined/.test(P[id])) throw new Error("texto de relleno en " + id);
}
await browser.close();

// 6. Cada imagen (data URI) una sola vez y, si pesa más de 60 KB, otra vez comprimida a 720 de ancho (como `meter-maqueta.mjs`).
const IMAGENES = [];
const indice = new Map();
for (const id of Object.keys(P)) {
  P[id] = P[id].replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    if (!indice.has(uri)) { indice.set(uri, IMAGENES.length); IMAGENES.push(uri); }
    return `__IMG_${indice.get(uri)}__`;
  });
}
for (let i = 0; i < IMAGENES.length; i++) {
  if (IMAGENES[i].length < 60_000 || IMAGENES[i].startsWith("data:image/svg")) continue;
  const bytes = Buffer.from(IMAGENES[i].split(",")[1], "base64");
  const jpg = await sharp(bytes).resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  if (jpg.length * 1.37 < IMAGENES[i].length) IMAGENES[i] = "data:image/jpeg;base64," + jpg.toString("base64");
}

// 7. Al prototipo: la plantilla con el CSS, la etiqueta <html>, las imágenes y las pantallas.
const js = (x) => JSON.stringify(x).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const plantilla = fs.readFileSync(path.join(AQUI, "historial-escalable.plantilla.html"), "utf8");
const salida = plantilla
  .replace("/*@CSS*/", () => CSS)
  .replace("/*@DATOS*/", () => `const HTML_TAG = ${js(HTML_TAG)};\n  const IMAGENES = ${js(IMAGENES)};\n  const CUERPOS = ${js(P)};`);
fs.writeFileSync(SALIDA, salida);
console.log(`hojas ${hojas.size} · CSS ${Math.round(CSS.length / 1024)} KB · estados ${Object.keys(P).length} · imágenes ${IMAGENES.length} · prototipo ${Math.round(salida.length / 1024)} KB`);
