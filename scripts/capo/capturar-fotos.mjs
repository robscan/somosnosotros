#!/usr/bin/env node
/**
 * Fotos del Catálogo de Artistas Potosinos (CAPO): para cada artista de scripts/capo/salida/artistas.json
 * saca la URL pública de su foto (lh3.googleusercontent.com/sitesv/…, sin firma ni caducidad) y escribe
 * scripts/capo/salida/fotos-capo.json (la caché de páginas va en scripts/capo/salida/html). No toca la base:
 * las fotos se ponen después con scripts/fotos/correr.mjs artistas scripts/capo/salida/fotos-capo.json --autor <id>.
 *
 * Uso: node scripts/capo/capturar-fotos.mjs [--max-descargas N] [--repo /ruta/al/repo]
 *   - Guarda cada página en ./html/<slug>.html y no la vuelve a bajar si ya está.
 *   - --max-descargas limita cuántas páginas nuevas baja en esta corrida (el resto queda "pendiente").
 *
 * Regla de asignación (vista en el HTML de Google Sites):
 *   - <img src="https://lh…"> suelto va ANTES del encabezado con el nombre → es de la ficha siguiente
 *     (misma suposición que capo.ts para `conImagen`).
 *   - background-image: url(https://lh…) dentro de un carrusel va DESPUÉS de la bio → es de la ficha abierta.
 * La primera imagen de cada ficha es `foto_url`; todas van en `fotos`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const REPO = opt("--repo", process.cwd());
const MAX_DESCARGAS = Number(opt("--max-descargas", "1000"));
const HTML = join(REPO, "scripts/capo/salida/html");
const CABECERAS = { "User-Agent": "Mozilla/5.0 (compatible; somosnosotros.org; fotos CAPO)" };

// ---------- copiado de capo.ts / src/lib/lugares.ts (mismo criterio de normalización) ----------
const ENTIDADES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", iexcl: "¡", iquest: "¿", deg: "°", ordf: "ª", ordm: "º",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
};
const decodificarEntidades = (t) => t
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? ENTIDADES[n.toLowerCase()] ?? m);
const textoDe = (html) => decodificarEntidades(html.replace(/<[^>]+>/g, " ")).replace(/ /g, " ").replace(/\s+/g, " ").trim();
const normalizarNombre = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function limpiarNombre(n) {
  let t = n.replace(/\s+/g, " ").trim();
  const mitad = Math.floor(t.length / 2);
  if (t.length % 2 === 1 && t.slice(0, mitad) === t.slice(mitad + 1) && t[mitad] === " ") t = t.slice(0, mitad);
  t = t.replace(/[\s·•|,;:-]+$/g, "").replace(/(\p{L}{4,})\.$/u, "$1").trim();
  return t.slice(0, 80);
}
const ES_ORIGEN = /^\(.*\)$/;
const NO_ES_NOMBRE = /^(registro|aviso de privacidad|disciplinas?|m[uú]sica|artes esc[eé]nicas|literatura|artes visuales|cine|pintura|fotograf[ií]a|escultura|gr[aá]fica|multidisciplina|teatro|danza|artes circenses|grupos|solistas|recomendado|hist[oó]rico|espacios? (de|y) .*|compa[nñ][ií]as .*)$/i;
const pareceNombre = (t) => t.length <= 80 && !/[.!?:;]$/.test(t) && t.split(" ").length <= 12;

// Igual que TOKEN de capo.ts, más el background-image de los carruseles.
const TOKEN = /<h([1-3])(?=[\s>])[^>]*>([\s\S]*?)<\/h\1>|<p(?=[\s>])[^>]*>([\s\S]*?)<\/p>|<a\s[^>]*href="([^"]+)"[^>]*>|(<img\s[^>]*src="https:\/\/lh[^"]+"[^>]*>)|background-image:\s*url\((https:\/\/lh[^)]+)\)/gi;
/** Iconos de enlace subidos como imagen (32 px, class xbGufb, alt="Link"): no son fotos. */
const ES_ICONO = /class="xbGufb"|alt="Link"|\bwidth="\d{1,2}"/i;

function nuevo(nombre, fotosAntes) {
  return { nombre: nombre.replace(/^"([^"]+)"$/, "$1"), parrafos: [], enlaces: [], fotos: [...fotosAntes] };
}
const vacio = (r) => r.parrafos.length === 0 && r.enlaces.length === 0;

/** Como extraerRegistros de capo.ts, pero cada ficha trae `fotos` (URLs) en vez de `conImagen`. */
function extraerRegistros(html) {
  const desde = html.search(/<div[^>]*role="main"/i);
  const hasta = html.search(/<footer(?=[\s>])/i);
  const cuerpo = html.slice(desde >= 0 ? desde : 0, hasta > desde ? hasta : undefined);
  const registros = [];
  let actual = null;
  let imagenesPendientes = [];
  let ultimoFueEncabezado = false;
  let tituloVisto = false;
  let ultimoParrafo = null;
  const abrir = (nombre) => {
    const r = nuevo(nombre, imagenesPendientes);
    if (actual) {
      const clave = normalizarNombre(nombre);
      const i = actual.parrafos.findIndex((p) => normalizarNombre(p) === clave || normalizarNombre(p).startsWith(`${clave} `));
      if (i >= 0) {
        const movidos = actual.parrafos.splice(i);
        r.parrafos.push(...movidos.filter((p) => normalizarNombre(p) !== clave));
      }
    }
    registros.push(r);
    imagenesPendientes = [];
    return r;
  };
  for (const t of cuerpo.matchAll(TOKEN)) {
    if (t[1] !== undefined) {
      const texto = textoDe(t[2]);
      ultimoParrafo = null;
      if (!texto) continue;
      if (Number(t[1]) === 1 && !tituloVisto) { tituloVisto = true; continue; }
      if (ES_ORIGEN.test(texto)) { ultimoFueEncabezado = false; continue; }
      if (actual && ultimoFueEncabezado && vacio(actual) && imagenesPendientes.length === 0) { actual.parrafos.push(texto); continue; }
      actual = abrir(texto);
      ultimoFueEncabezado = true;
      continue;
    }
    ultimoFueEncabezado = false;
    if (t[3] !== undefined) {
      const texto = textoDe(t[3]);
      if (!texto) continue;
      if (ES_ORIGEN.test(texto) && ultimoParrafo && actual && actual.parrafos.length > 1 && actual.parrafos[actual.parrafos.length - 1] === ultimoParrafo && pareceNombre(ultimoParrafo)) {
        actual.parrafos.pop();
        actual = abrir(ultimoParrafo);
      }
      if (actual) actual.parrafos.push(texto);
      ultimoParrafo = texto;
    } else if (t[4] !== undefined) {
      ultimoParrafo = null;
      if (actual && /^https?:\/\//i.test(t[4])) actual.enlaces.push(t[4]);
    } else if (t[5] !== undefined) {
      ultimoParrafo = null;
      if (ES_ICONO.test(t[5])) continue;
      imagenesPendientes.push({ url: decodificarEntidades(t[5].match(/src="([^"]+)"/)[1]), origen: "img" }); // <img> suelto: va antes del nombre
    } else if (t[6] !== undefined) {
      ultimoParrafo = null;
      const url = decodificarEntidades(t[6]).replace(/^["']|["']$/g, "");
      if (actual) actual.fotos.push({ url, origen: "carrusel" }); // carrusel: va después de la bio
      else imagenesPendientes.push({ url, origen: "carrusel" });
    }
  }
  // Repetidos en la misma página: una sola ficha con las fotos de ambas.
  const porNombre = new Map();
  for (const r of registros) {
    if (vacio(r) || NO_ES_NOMBRE.test(r.nombre)) continue;
    const clave = normalizarNombre(limpiarNombre(r.nombre));
    const previo = porNombre.get(clave);
    if (!previo) porNombre.set(clave, r);
    else for (const f of r.fotos) if (!previo.fotos.some((x) => x.url === f.url)) previo.fotos.push(f);
  }
  return [...porNombre.values()];
}

// ---------- páginas ----------
const slug = (url) => decodeURIComponent(url).replace(/^https?:\/\/[^/]+\/catalogoartistaspotosino\//, "").replace(/[^\p{L}\p{N}]+/gu, "-");
async function bajar(url) {
  const r = await fetch(url, { headers: CABECERAS });
  if (!r.ok) throw new Error(`${r.status} al bajar ${url}`);
  return r.text();
}

async function main() {
  mkdirSync(HTML, { recursive: true });
  const artistas = JSON.parse(readFileSync(join(REPO, "scripts/capo/salida/artistas.json"), "utf8"));
  const porPagina = new Map();
  for (const a of artistas) porPagina.set(a.url_fuente, (porPagina.get(a.url_fuente) ?? 0) + 1);
  const paginas = [...porPagina].sort((x, y) => y[1] - x[1]).map(([u]) => u);

  let descargas = 0;
  const fotosPorClave = new Map(); // clave normalizada → { fotos, url_fuente }
  const estadoPagina = [];
  for (const url of paginas) {
    const archivo = join(HTML, `${slug(url)}.html`);
    let html;
    if (existsSync(archivo)) html = readFileSync(archivo, "utf8");
    else if (descargas < MAX_DESCARGAS) {
      html = await bajar(url);
      writeFileSync(archivo, html);
      descargas++;
    } else { estadoPagina.push({ url, estado: "pendiente" }); continue; }
    const regs = extraerRegistros(html);
    let img = 0, bg = 0;
    for (const r of regs) {
      const clave = normalizarNombre(limpiarNombre(r.nombre));
      if (!fotosPorClave.has(clave)) fotosPorClave.set(clave, { fotos: r.fotos, url_fuente: url });
      else for (const f of r.fotos) if (!fotosPorClave.get(clave).fotos.some((x) => x.url === f.url)) fotosPorClave.get(clave).fotos.push(f);
    }
    img += [...html.matchAll(/<img\s[^>]*src="https:\/\/lh[^"]+"[^>]*class="CENy8b"/g)].length;
    bg += [...html.matchAll(/background-image:\s*url\(https:\/\/lh/g)].length;
    estadoPagina.push({ url, estado: "leída", fichas: regs.length, con_foto: regs.filter((r) => r.fotos.length).length, img_sueltas: img, en_carrusel: bg });
  }

  const paginasLeidas = new Set(estadoPagina.filter((p) => p.estado === "leída").map((p) => p.url));
  const salida = artistas.map((a) => {
    const clave = normalizarNombre(a.nombre);
    const f = fotosPorClave.get(clave);
    const fotos = f?.fotos ?? [];
    const primera = fotos[0] ?? null;
    const foto_url = primera?.url ?? null;
    return {
      nombre: a.nombre,
      url_fuente: a.url_fuente,
      estado: paginasLeidas.has(a.url_fuente) ? (foto_url ? "con_foto" : "sin_foto") : "pendiente",
      foto_url,
      // "img": <img> de bloque (=w1280, sirve con curl). "carrusel": background-image (=w16383, dio 403 con curl: ver informe).
      foto_origen: primera?.origen ?? null,
      foto_host: foto_url ? new URL(foto_url).host : null,
      fotos: fotos.map((f) => f.url),
    };
  });
  const n = (e) => salida.filter((x) => x.estado === e).length;
  const cuenta = (k) => Object.fromEntries([...new Set(salida.map((x) => x[k]).filter(Boolean))].map((v) => [v, salida.filter((x) => x[k] === v).length]));
  const resumen = { fecha: new Date().toISOString(), artistas: salida.length, con_foto: n("con_foto"), sin_foto: n("sin_foto"), pendientes: n("pendiente"), por_origen: cuenta("foto_origen"), por_host: cuenta("foto_host"), paginas_leidas: paginasLeidas.size, paginas_pendientes: paginas.length - paginasLeidas.size, descargas_esta_corrida: descargas };
  writeFileSync(join(REPO, "scripts/capo/salida/fotos-capo.json"), JSON.stringify(salida, null, 2));
  writeFileSync(join(REPO, "scripts/capo/salida/fotos-capo-resumen.json"), JSON.stringify({ resumen, paginas: estadoPagina }, null, 2));
  console.log(JSON.stringify(resumen));
  for (const p of estadoPagina) console.log(p.estado === "leída" ? `${String(p.fichas).padStart(3)} fichas · ${String(p.con_foto).padStart(3)} con foto · img ${p.img_sueltas} · carrusel ${p.en_carrusel} → ${slug(p.url)}` : `pendiente → ${slug(p.url)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
