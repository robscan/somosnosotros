// Respaldo local 100 % inventado: imita Auth y PostgREST de Supabase sobre el fixture (nunca toca producción).
// node server.mjs [puerto]  →  http://127.0.0.1:8823
import fs from "node:fs";
import http from "node:http";
import { tablas, rpcs, sesionDe, subDe, FK, LLAVE_SERVICIO, extrasServicio, mapboxIda, mapboxVuelta } from "./fixture.mjs";

const PUERTO = Number(process.argv[2] || process.env.PUERTO || 8823);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range, Content-Type",
};
const registro = [];
// OL-461: la falla de la página de Facebook de mentira (permiso | imagen | nada), que el recorrido cambia sin reiniciar (`/__falla-facebook?clave=`).
let fallaFacebook = process.env.FACEBOOK_FALLA ?? "";
// OL-464: cuántos contenedores hijos de carrusel van (sus ids de mentira).
let hijosCarrusel = 0;
// OL-465: Instagram lento (ms que tarda `media_publish`) y su falla (permiso | cupo | imagen | nada), que el recorrido cambia sin reiniciar
// (`/__lento?ms=`, `/__falla-instagram?clave=`): así se ve «Publicando…» un rato y lo que no se pudo publicar.
let lentoInstagram = 0;
let fallaInstagram = process.env.INSTAGRAM_FALLA ?? "";

// OL-413 (bitácora 444): la lectura de carteles sin llamar a la API de Anthropic. La app arranca con `ANTHROPIC_BASE_URL` apuntando a
// `/anthropic` de este respaldo y una llave inventada; `POST /__lectura` deja lista la próxima lectura (`{ lectura, archivo }`: lo que
// «devolvería el modelo» y el cartel local que se sirve como la imagen subida). Storage: la subida se anota y la imagen pública es ese archivo.
let siguiente = { lectura: null, archivo: null };
const subidas = new Map();
function mensajeDeModelo(lectura) {
  return { id: "msg_respaldo", type: "message", role: "assistant", model: "claude-sonnet-5", content: [{ type: "text", text: JSON.stringify(lectura) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
}
function leerCrudo(req) {
  return new Promise((ok) => {
    const partes = [];
    req.on("data", (d) => partes.push(d));
    req.on("end", () => ok(Buffer.concat(partes)));
  });
}

// ---------- select ----------
function partirNivel0(s, sep = ",") {
  const partes = [];
  let prof = 0;
  let actual = "";
  let comillas = false;
  for (const c of s) {
    if (c === '"') comillas = !comillas;
    if (!comillas) {
      if (c === "(") prof++;
      if (c === ")") prof--;
      if (c === sep && prof === 0) {
        partes.push(actual.trim());
        actual = "";
        continue;
      }
    }
    actual += c;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}
function parseSelect(s) {
  return partirNivel0(s || "*").map((item) => {
    const par = item.indexOf("(");
    if (par >= 0 && item.endsWith(")")) {
      let cabeza = item.slice(0, par).trim();
      const interior = item.slice(par + 1, -1);
      let alias = null;
      if (cabeza.includes(":")) [alias, cabeza] = cabeza.split(":").map((x) => x.trim());
      const [tabla, ...hints] = cabeza.split("!").map((x) => x.trim());
      const inner = hints.includes("inner");
      const fkHint = hints.find((h) => h.endsWith("_fkey")) || null;
      return { tipo: "embed", alias: alias || tabla, tabla, inner, fkHint, hijos: parseSelect(interior) };
    }
    if (item.includes(":")) {
      const [alias, col] = item.split(":").map((x) => x.trim());
      return { tipo: "col", alias, col };
    }
    return { tipo: "col", alias: item.trim(), col: item.trim() };
  });
}
function singular(t) {
  return t.endsWith("es") && !t.endsWith("ses") ? t.slice(0, -2) : t.endsWith("s") ? t.slice(0, -1) : t;
}
function relacion(padre, nodo) {
  const directo = FK[padre]?.[nodo.tabla];
  if (nodo.fkHint) {
    // eventos_creado_por_fkey → creado_por ; bloqueos_bloqueado_fkey → bloqueado
    const col = nodo.fkHint.replace(new RegExp(`^${padre}_`), "").replace(/_fkey$/, "");
    return { tipo: "uno", col };
  }
  if (directo) return { tipo: "uno", col: directo };
  const inverso = FK[nodo.tabla]?.[padre];
  if (inverso) return { tipo: "muchos", col: inverso };
  const adivinado = `${singular(nodo.tabla)}_id`;
  return { tipo: "uno", col: adivinado };
}
function proyectar(tabla, fila, nodos, filtrosEmbed) {
  const salida = {};
  for (const n of nodos) {
    if (n.tipo === "col") {
      if (n.col === "*") Object.assign(salida, fila);
      else salida[n.alias] = fila[n.col] === undefined ? null : fila[n.col];
      continue;
    }
    const rel = relacion(tabla, n);
    const filas = tablas[n.tabla] || [];
    const propios = (filtrosEmbed || []).filter((f) => f.ruta[0] === n.alias).map((f) => ({ ...f, ruta: f.ruta.slice(1) }));
    if (rel.tipo === "uno") {
      const objetivo = filas.find((r) => r.id === fila[rel.col]);
      let valor = objetivo ? proyectar(n.tabla, objetivo, n.hijos, propios.filter((f) => f.ruta.length)) : null;
      if (valor && propios.some((f) => !f.ruta.length && !cumple(objetivo, f.cond))) valor = null;
      if (!valor && n.inner) return null;
      salida[n.alias] = valor;
    } else {
      let lista = filas.filter((r) => r[rel.col] === fila.id);
      for (const f of propios.filter((f) => !f.ruta.length)) lista = lista.filter((r) => cumple(r, f.cond));
      const proy = lista.map((r) => proyectar(n.tabla, r, n.hijos, propios.filter((f) => f.ruta.length))).filter(Boolean);
      if (n.inner && !proy.length) return null;
      salida[n.alias] = proy;
    }
  }
  return salida;
}

// ---------- filtros ----------
function limpiarValor(v) {
  if (typeof v !== "string") return v;
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}
function comparar(a, op, b) {
  if (op === "is") return b === "null" ? a === null || a === undefined : b === "true" ? a === true : b === "false" ? a === false : a === null;
  if (a === undefined) a = null;
  if (op === "in") {
    const lista = limpiarValor(b.replace(/^\(|\)$/g, "")).split(",").map((x) => limpiarValor(x.trim()));
    return lista.some((x) => String(x) === String(a));
  }
  if (typeof a === "boolean") b = b === "true";
  else if (typeof a === "number") b = Number(b);
  else b = limpiarValor(b);
  switch (op) {
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
    case "gt":
      return a !== null && a > b;
    case "gte":
      return a !== null && a >= b;
    case "lt":
      return a !== null && a < b;
    case "lte":
      return a !== null && a <= b;
    case "like":
    case "ilike": {
      const re = new RegExp("^" + String(b).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", op === "ilike" ? "i" : "");
      return a !== null && re.test(String(a));
    }
    default:
      return true; // cs, ov, fts…: sin filtro
  }
}
function parseCond(texto) {
  // col.op.valor | col.not.op.valor | and(...) | or(...) | not.and(...)
  const m = texto.match(/^(not\.)?(and|or)\((.*)\)$/s);
  if (m) {
    const grupo = { tipo: m[2], neg: !!m[1], hijos: partirNivel0(m[3]).map(parseCond) };
    return grupo;
  }
  const partes = texto.split(".");
  let col = partes.shift();
  let neg = false;
  if (partes[0] === "not") {
    neg = true;
    partes.shift();
  }
  const op = partes.shift();
  const valor = partes.join(".");
  return { tipo: "cond", col, op, valor, neg };
}
/** El valor de una columna o de una ruta JSON como la lee PostgREST (OL-434: `datos->>marco_propuesto`, `datos->marco->>id`); `->>`, en texto. */
function valorDe(fila, col) {
  const partes = String(col).split(/(->>?)/);
  let v = fila[partes[0]];
  for (let i = 1; i < partes.length; i += 2) {
    v = v && typeof v === "object" ? v[partes[i + 1]] : undefined;
    if (partes[i] === "->>" && v !== null && v !== undefined && typeof v !== "string") v = JSON.stringify(v);
  }
  return v;
}
function cumple(fila, c) {
  if (!fila) return false;
  if (c.tipo === "cond") {
    const r = comparar(valorDe(fila, c.col), c.op, c.valor);
    return c.neg ? !r : r;
  }
  const r = c.tipo === "and" ? c.hijos.every((h) => cumple(fila, h)) : c.hijos.some((h) => cumple(fila, h));
  return c.neg ? !r : r;
}
const RESERVADOS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function parseFiltros(params) {
  const propios = [];
  const embebidos = [];
  for (const [k, v] of params) {
    if (RESERVADOS.has(k)) continue;
    const ruta = k.split(".");
    const ultimo = ruta.pop();
    let cond;
    if (ultimo === "or" || ultimo === "and") cond = parseCond(`${ultimo}${v}`);
    else cond = parseCond(`${ultimo}.${v}`);
    if (ruta.length) embebidos.push({ ruta, cond });
    else propios.push(cond);
  }
  return { propios, embebidos };
}
function ordenar(filas, order) {
  if (!order) return filas;
  const claves = order.split(",").map((o) => {
    const m = o.match(/^([a-z_]+)\(([a-z_]+)\)(?:\.(asc|desc))?/);
    if (m) return { emb: m[1], col: m[2], desc: m[3] === "desc" };
    const p = o.split(".");
    // `nullsfirst` explícito (OL-414: el festival antes de sus actos); sin él, lo vacío al final, como siempre en el respaldo.
    return { col: p[0], desc: p.includes("desc"), vaciosPrimero: p.includes("nullsfirst") };
  });
  return [...filas].sort((a, b) => {
    for (const k of claves) {
      const va = k.emb ? a[k.emb]?.[k.col] : a[k.col];
      const vb = k.emb ? b[k.emb]?.[k.col] : b[k.col];
      if (va === vb) continue;
      if (va === null || va === undefined) return k.vaciosPrimero ? -1 : 1;
      if (vb === null || vb === undefined) return k.vaciosPrimero ? 1 : -1;
      return (va < vb ? -1 : 1) * (k.desc ? -1 : 1);
    }
    return 0;
  });
}

// ---------- servidor ----------
function responder(res, codigo, cuerpo, cabeceras = {}) {
  const texto = cuerpo === undefined ? "" : JSON.stringify(cuerpo);
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8", ...CORS, ...cabeceras });
  res.end(texto);
}
function leerCuerpo(req) {
  return new Promise((ok) => {
    let datos = "";
    req.on("data", (d) => (datos += d));
    req.on("end", () => {
      try {
        ok(datos ? JSON.parse(datos) : null);
      } catch {
        ok(null);
      }
    });
  });
}
function quiereObjeto(req) {
  return String(req.headers.accept || "").includes("vnd.pgrst.object");
}
function consultar(tabla, url, req) {
  // Con la llave de servicio (OL-401) se leen además las filas que solo ella ve (`extrasServicio`); con cualquier otra, solo el fixture.
  const conLlave = req.headers.apikey === LLAVE_SERVICIO;
  const filas = [...(tablas[tabla] || []), ...(conLlave ? (extrasServicio[tabla] || []) : [])];
  const nodos = parseSelect(url.searchParams.get("select"));
  const { propios, embebidos } = parseFiltros(url.searchParams);
  let resultado = [];
  for (const fila of filas) {
    if (!propios.every((c) => cumple(fila, c))) continue;
    const p = proyectar(tabla, fila, nodos, embebidos);
    if (p) resultado.push(p);
  }
  resultado = ordenar(resultado, url.searchParams.get("order"));
  const total = resultado.length;
  let desde = Number(url.searchParams.get("offset") || 0);
  let hasta = url.searchParams.get("limit") ? desde + Number(url.searchParams.get("limit")) : undefined;
  const rango = (req.headers.range || "").match(/^(\d+)-(\d+)?/);
  if (rango) {
    desde = Number(rango[1]);
    hasta = rango[2] !== undefined ? Number(rango[2]) + 1 : undefined;
  }
  resultado = resultado.slice(desde, hasta);
  return { resultado, total, desde };
}
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PUERTO}`);
  const ruta = url.pathname;
  registro.push(`${req.method} ${req.url}`);
  if (req.method === "OPTIONS") return responder(res, 204);
  if (ruta === "/__registro") return responder(res, 200, registro.slice(-200));
  if (ruta === "/__falla-facebook") {
    fallaFacebook = url.searchParams.get("clave") ?? "";
    return responder(res, 200, { fallaFacebook });
  }
  if (ruta === "/__lento") {
    lentoInstagram = Number(url.searchParams.get("ms") ?? 0) || 0;
    return responder(res, 200, { lentoInstagram });
  }
  if (ruta === "/__falla-instagram") {
    fallaInstagram = url.searchParams.get("clave") ?? "";
    return responder(res, 200, { fallaInstagram });
  }
  if (ruta === "/__lectura" && req.method === "POST") {
    siguiente = { lectura: null, archivo: null, ...((await leerCuerpo(req)) ?? {}) };
    return responder(res, 200, { ok: true });
  }
  if (ruta.startsWith("/anthropic/v1/messages")) {
    await leerCrudo(req);
    if (!siguiente.lectura) return responder(res, 500, { type: "error", error: { type: "api_error", message: "sin lectura preparada" } });
    return responder(res, 200, mensajeDeModelo(siguiente.lectura));
  }
  // Storage (solo el bucket `fotos`): subir anota la ruta con el cartel preparado; la URL pública sirve ese archivo.
  const subida = ruta.match(/^\/storage\/v1\/object\/fotos\/(.+)$/);
  if (subida && (req.method === "POST" || req.method === "PUT")) {
    await leerCrudo(req);
    subidas.set(subida[1], siguiente.archivo);
    return responder(res, 200, { Key: `fotos/${subida[1]}`, Id: crypto.randomUUID() });
  }
  const publica = ruta.match(/^\/storage\/v1\/object\/public\/fotos\/(.+)$/);
  if (publica && (req.method === "GET" || req.method === "HEAD")) {
    // OL-464: los carteles del festival del carrusel (`RESPALDO_CARRUSEL_IG=1`), que el recorrido dibuja en `RESPALDO_CARRUSEL_DIR`.
    const demo = publica[1].match(/^demo-carrusel\/([a-z0-9-]+\.jpg)$/);
    const archivo = demo && process.env.RESPALDO_CARRUSEL_DIR ? `${process.env.RESPALDO_CARRUSEL_DIR}/${demo[1]}` : subidas.get(publica[1]);
    if (!archivo || !fs.existsSync(archivo)) return responder(res, 404, { message: "sin imagen" });
    res.writeHead(200, { ...CORS, "Content-Type": archivo.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "no-store" });
    return res.end(req.method === "HEAD" ? undefined : fs.readFileSync(archivo));
  }
  // OL-432: Mapbox para «Añadir ciudad»: la app lo pide desde el servidor con `MAPBOX_API_URL=http://127.0.0.1:<puerto>/mapbox` (solo acepta
  // 127.0.0.1) y aquí contestan ciudades y municipios escritos a mano (`LUGARES_MAPBOX`). Nunca llega un token real.
  if (ruta === "/mapbox/search/geocode/v6/forward") return responder(res, 200, mapboxIda(url.searchParams.get("q"), Number(url.searchParams.get("limit") || 6)));
  if (ruta === "/mapbox/search/geocode/v6/reverse") return responder(res, 200, mapboxVuelta(Number(url.searchParams.get("latitude")), Number(url.searchParams.get("longitude"))));
  // OL-458: la API de Instagram, de mentira, para recorrer «Publicar en Instagram» sin tocar la real: la app la pide desde el servidor con
  // `INSTAGRAM_API_URL=http://127.0.0.1:<puerto>/graph` (solo acepta 127.0.0.1) y un token inventado. Contenedor → FINISHED → publicar → enlace;
  // el cupo (3 de 100) y una página con ubicación para «Ubicación en Instagram». Con `INSTAGRAM_FALLA=permiso|cupo|imagen`, el contenedor falla.
  const graph = ruta.match(/^\/graph\/v[0-9.]+\/(.+)$/);
  if (graph) {
    const [primero, segundo] = graph[1].split("/");
    const params = req.method === "POST" ? new URLSearchParams(String(await leerCrudo(req))) : url.searchParams;
    // OL-461: la página de Facebook, de mentira (la app la pide con `FACEBOOK_PAGE_ID` y el mismo token inventado): foto con texto → enlace;
    // historia: foto sin publicar → photo_stories → enlace. Con `FACEBOOK_FALLA=permiso|imagen` (o `/__falla-facebook?clave=`), la foto falla
    // (sin `pages_manage_posts`: 200). El texto que llega a la página queda en el registro, para comprobarlo.
    const fallaFb = { permiso: { code: 200, message: "(#200) requires pages_manage_posts" }, imagen: { code: 324 } }[fallaFacebook];
    const POST_FB = `${primero}_122100000000000461`;
    if (segundo === "photos" && req.method === "POST") {
      registro.push(`  facebook: ${JSON.stringify({ url: params.get("url"), message: params.get("message"), published: params.get("published") })}`);
      if (fallaFb) return responder(res, 400, { error: fallaFb });
      return params.get("published") === "false" ? responder(res, 200, { id: "122100000000000999" }) : responder(res, 200, { id: "122100000000000461", post_id: POST_FB });
    }
    if (segundo === "photo_stories" && req.method === "POST") return responder(res, 200, { success: true, post_id: POST_FB });
    // OL-464: varias fotos en una publicación (las fotos sin publicar → el muro con `attached_media`).
    if (segundo === "feed" && req.method === "POST") {
      const adjuntas = [...params.keys()].filter((k) => k.startsWith("attached_media")).map((k) => JSON.parse(params.get(k)).media_fbid);
      registro.push(`  facebook: ${JSON.stringify({ feed: true, attached_media: adjuntas, message: params.get("message") })}`);
      if (fallaFb) return responder(res, 400, { error: fallaFb });
      return responder(res, 200, { id: POST_FB });
    }
    if (/^[0-9]+_[0-9]+$/.test(primero)) return responder(res, 200, { id: primero, permalink_url: `https://www.facebook.com/${primero.split("_")[0]}/posts/${primero.split("_")[1]}` });
    const falla = { permiso: { code: 190 }, cupo: { code: 4, error_subcode: 2207042 }, imagen: { code: 9004, error_subcode: 2207052 } }[fallaInstagram];
    // OL-463: el texto y las etiquetas que llegan a Instagram quedan en el registro, para comprobarlos.
    // OL-464: el carrusel: cada hijo (`is_carousel_item`) con su id (900458001, 900458002…) y el carrusel (900464) con sus `children`.
    if (segundo === "media" && req.method === "POST")
      registro.push(`  instagram: ${JSON.stringify({ caption: params.get("caption"), user_tags: params.get("user_tags"), image_url: params.get("image_url"), is_carousel_item: params.get("is_carousel_item"), media_type: params.get("media_type"), children: params.get("children"), location_id: params.get("location_id") })}`);
    if (segundo === "media" && req.method === "POST" && falla) return responder(res, 400, { error: falla });
    if (segundo === "media" && req.method === "POST" && params.get("is_carousel_item") === "true") return responder(res, 200, { id: `900458${String(++hijosCarrusel).padStart(3, "0")}` });
    if (segundo === "media" && req.method === "POST" && params.get("media_type") === "CAROUSEL") return responder(res, 200, { id: "900464" });
    if (segundo === "media" && req.method === "POST") return responder(res, 200, { id: "900458" });
    if (segundo === "media_publish") {
      if (lentoInstagram) await new Promise((listo) => setTimeout(listo, lentoInstagram));
      return responder(res, 200, { id: "17900000000000458" });
    }
    if (segundo === "content_publishing_limit") return responder(res, 200, { data: [{ quota_usage: 3, config: { quota_total: 100 } }] });
    if (/^900458[0-9]{0,3}$|^900464$/.test(primero)) return responder(res, 200, { id: primero, status_code: "FINISHED" });
    if (primero === "17900000000000458") return responder(res, 200, { id: "17900000000000458", permalink: "https://www.instagram.com/p/DEMO458C/" });
    return responder(res, 200, { id: "108000000000459", name: "Oaxaca, Oaxaca", location: { city: "Oaxaca" } });
  }
  // La cuenta de quien pide (OL-341): la del token de la sesión (Ana por omisión; Marcos con `cookieDe(MARCOS)`).
  const sub = subDe(String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
  // Auth
  if (ruta === "/auth/v1/user") return responder(res, 200, sesionDe(sub).user);
  if (ruta === "/auth/v1/token") {
    const cuerpo = await leerCuerpo(req);
    return responder(res, 200, sesionDe(cuerpo?.refresh_token ? subDe(cuerpo.refresh_token) : sub));
  }
  if (ruta === "/auth/v1/logout") return responder(res, 204);
  // La vuelta de un enlace mágico (verifyOtp): da la sesión, como la base de verdad (para probar /auth/app-regreso).
  if (ruta === "/auth/v1/verify") return responder(res, 200, sesionDe(sub));
  // Con `PROVEEDORES=1`, Entrar enseña «Continuar con Apple» y «con Google» (para probar la vuelta de un proveedor); sin él, no (lo que mide `npm run medir`).
  if (ruta === "/auth/v1/settings") return responder(res, 200, process.env.PROVEEDORES ? { external: { apple: true, google: true } } : {});
  if (ruta.startsWith("/auth/v1/.well-known")) return responder(res, 200, { keys: [] });
  if (ruta.startsWith("/auth/v1/")) return responder(res, 200, {});
  // RPC
  const rpc = ruta.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (rpc) {
    const args = (await leerCuerpo(req)) || Object.fromEntries(url.searchParams);
    const fn = rpcs[rpc[1]];
    let datos;
    try {
      datos = fn ? fn(args, tablas, { sub }) : [];
    } catch (e) {
      registro.push(`  rpc ${rpc[1]} lanzó: ${String(e?.message ?? e).slice(0, 300)}`);
      return responder(res, 500, { code: "XX000", message: String(e?.message ?? e) });
    }
    // OL-467: una función que contesta como un «no» de la base (`{ __error: { code, message } }`), como PostgREST.
    if (datos && typeof datos === "object" && datos.__error) return responder(res, 400, { ...datos.__error, details: null, hint: null });
    if (quiereObjeto(req)) return Array.isArray(datos) ? (datos.length === 1 ? responder(res, 200, datos[0]) : responder(res, 406, { code: "PGRST116", message: `${datos.length} filas` })) : responder(res, 200, datos);
    return responder(res, 200, datos);
  }
  // Tablas
  const tabla = ruta.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
  if (!tabla) return responder(res, 404, { message: `sin ruta ${ruta}` });
  if (req.method === "GET" || req.method === "HEAD") {
    const { resultado, total, desde } = consultar(tabla, url, req);
    const cab = {};
    if (String(req.headers.prefer || "").includes("count=")) cab["Content-Range"] = `${desde}-${Math.max(desde, desde + resultado.length - 1)}/${total}`;
    if (req.method === "HEAD") {
      res.writeHead(200, { ...CORS, ...cab, "Content-Type": "application/json" });
      return res.end();
    }
    if (quiereObjeto(req)) {
      if (resultado.length === 1) return responder(res, 200, resultado[0], cab);
      return responder(res, 406, { code: "PGRST116", message: `${resultado.length} filas` }, cab);
    }
    return responder(res, 200, resultado, cab);
  }
  // Escrituras: se anotan y se contestan con lo mismo (nunca cambian el fixture, salvo asistencias/seguimientos en memoria)
  const cuerpo = await leerCuerpo(req);
  registro.push(`  cuerpo: ${JSON.stringify(cuerpo).slice(0, 300)}`);
  // OL-391: «Se canceló» se marca en memoria (otro arranque empieza limpio), para ver la ficha cancelada tras el toque. Los permisos reales se
  // prueban en PostgreSQL (`supabase/tests/pg/eventos-cancelado.test.mjs`).
  if (req.method === "PATCH" && tabla === "eventos" && cuerpo && Object.keys(cuerpo).join() === "cancelado") {
    const { propios } = parseFiltros(url.searchParams);
    const cambiadas = tablas.eventos.filter((fila) => propios.every((c) => cumple(fila, c)));
    for (const fila of cambiadas) fila.cancelado = cuerpo.cancelado === true;
    const filas = cambiadas.map((fila) => proyectar("eventos", fila, parseSelect(url.searchParams.get("select")), []));
    if (quiereObjeto(req)) return filas.length === 1 ? responder(res, 200, filas[0]) : responder(res, 406, { code: "PGRST116", message: `${filas.length} filas` });
    return responder(res, 200, filas);
  }
  // OL-434: lo que cambia de una propuesta (rechazar, deshacer, ligar su evento) y los eventos que publica la rutina al aceptar en la bandeja
  // (`origen = rutina-agendas`) se guardan en memoria (otro arranque empieza limpio), para recorrer con toques reales «Aceptar» un acto que
  // espera y luego su festival: el festival se publica, sus actos que esperaban cuelgan de él y la línea dice cuántos. Los permisos reales, en
  // PostgreSQL (`supabase/tests/pg/ciudades-admin.test.mjs`); la publicación, con su base falsa (`publicarEvento.test.ts`).
  if (tabla === "propuestas" && req.method === "PATCH") {
    const { propios } = parseFiltros(url.searchParams);
    const cambiadas = tablas.propuestas.filter((fila) => propios.every((c) => cumple(fila, c)));
    for (const fila of cambiadas) Object.assign(fila, cuerpo);
    const salida = cambiadas.map((fila) => proyectar(tabla, fila, parseSelect(url.searchParams.get("select")), []));
    if (quiereObjeto(req)) return salida.length === 1 ? responder(res, 200, salida[0]) : responder(res, 406, { code: "PGRST116", message: `${salida.length} filas` });
    return responder(res, 200, salida);
  }
  // OL-458: lo publicado en Instagram y las ubicaciones se guardan en memoria (otro arranque empieza limpio), para ver «Ya en Instagram» y el
  // renglón de la ciudad después de los toques. Los permisos reales, en PostgreSQL (`supabase/tests/pg/instagram.test.mjs`).
  // OL-461: lo publicado en Facebook, igual (la regla de solo espejar lo que salió en Instagram, en `espejo-facebook.test.mjs`).
  if ((tabla === "instagram_publicaciones" || tabla === "instagram_ubicaciones" || tabla === "facebook_publicaciones") && req.method === "POST") {
    const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).filter(Boolean).map((f) => (tabla === "instagram_ubicaciones" ? { actualizado_en: new Date().toISOString(), actualizado_por: sub, ...f } : { id: crypto.randomUUID(), ...(tabla === "instagram_publicaciones" ? { etiquetas: [] } : {}), creado_en: new Date().toISOString(), publicado_por: sub, ...f }));
    if (tabla === "instagram_ubicaciones") tablas[tabla] = tablas[tabla].filter((u) => !nuevas.some((n) => n.tipo === u.tipo && n.clave === u.clave));
    tablas[tabla].push(...nuevas);
    return responder(res, 201, quiereObjeto(req) ? nuevas[0] : nuevas);
  }
  // OL-465: el trabajador de la cola de redes (con la llave de servicio) cambia sus trabajos y anota lo leído de un cartel: en memoria, con los
  // filtros del reclamo por turno (`turno`, `estado`, `avisado_en is null`), para recorrer «Publicar» → «Publicando…» → «Publicado» con el latido
  // simulado (la ruta del trabajador pedida a mano). Los permisos reales, en PostgreSQL (`supabase/tests/pg/redes-en-cola.test.mjs`).
  // OL-479: el trabajador cierra el día de la semana de Instagram que publicó (PATCH a `instagram_semana`, con sus filtros) y «Volver a poner»
  // saca una ficha de `instagram_fuera` (DELETE): en memoria.
  if (tabla === "instagram_fuera" && req.method === "DELETE") {
    const { propios } = parseFiltros(url.searchParams);
    const antes = tablas.instagram_fuera.length;
    tablas.instagram_fuera = tablas.instagram_fuera.filter((fila) => !propios.every((c) => cumple(fila, c)));
    return responder(res, antes === tablas.instagram_fuera.length ? 200 : 204, antes === tablas.instagram_fuera.length ? [] : undefined);
  }
  // OL-488: «Subir yo» guarda la foto o la portada de una ficha (solo esas dos columnas): en memoria.
  if ((tabla === "artistas" || tabla === "lugares") && req.method === "PATCH" && cuerpo && Object.keys(cuerpo).length && Object.keys(cuerpo).every((k) => k === "foto" || k === "portada")) {
    const { propios } = parseFiltros(url.searchParams);
    const cambiadas = tablas[tabla].filter((fila) => propios.every((c) => cumple(fila, c)));
    for (const fila of cambiadas) Object.assign(fila, cuerpo);
    const salida = cambiadas.map((fila) => proyectar(tabla, fila, parseSelect(url.searchParams.get("select")), []));
    if (quiereObjeto(req)) return salida.length === 1 ? responder(res, 200, salida[0]) : responder(res, 406, { code: "PGRST116", message: `${salida.length} filas` });
    return responder(res, 200, salida);
  }
  if (tabla === "instagram_semana" && req.method === "PATCH") {
    const { propios } = parseFiltros(url.searchParams);
    const cambiadas = tablas.instagram_semana.filter((fila) => propios.every((c) => cumple(fila, c)));
    for (const fila of cambiadas) Object.assign(fila, cuerpo);
    return responder(res, 200, cambiadas.map((fila) => proyectar(tabla, fila, parseSelect(url.searchParams.get("select")), [])));
  }
  if ((tabla === "redes_trabajos" && req.method === "PATCH") || (tabla === "cartel_lecturas" && req.method === "POST")) {
    let cambiadas;
    if (tabla === "cartel_lecturas") {
      const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).filter(Boolean);
      tablas.cartel_lecturas = tablas.cartel_lecturas.filter((x) => !nuevas.some((n) => n.usuario_id === x.usuario_id && n.imagen === x.imagen));
      tablas.cartel_lecturas.push(...nuevas);
      cambiadas = nuevas;
    } else {
      const { propios } = parseFiltros(url.searchParams);
      cambiadas = tablas.redes_trabajos.filter((fila) => propios.every((c) => cumple(fila, c)));
      for (const fila of cambiadas) Object.assign(fila, cuerpo);
    }
    const salida = cambiadas.map((fila) => proyectar(tabla, fila, parseSelect(url.searchParams.get("select")), []));
    if (quiereObjeto(req)) return salida.length === 1 ? responder(res, 200, salida[0]) : responder(res, 406, { code: "PGRST116", message: `${salida.length} filas` });
    return responder(res, 200, salida);
  }
  const deLaRutina = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).filter(Boolean);
  if (tabla === "eventos" && req.method === "POST" && deLaRutina.length && deLaRutina.every((e) => e.origen === "rutina-agendas")) {
    const slugDe = (t) => String(t ?? "evento").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const creadas = deLaRutina.map((e) => ({ id: crypto.randomUUID(), slug: slugDe(e.titulo), visible: true, borrador: false, cancelado: false, evento_padre_id: null, termina: e.fin ?? e.inicio, creado_en: new Date().toISOString(), ...e }));
    tablas.eventos.push(...creadas);
    const salida = creadas.map((fila) => proyectar(tabla, fila, parseSelect(url.searchParams.get("select")), []));
    if (quiereObjeto(req)) return responder(res, 201, salida[0]);
    return responder(res, 201, salida);
  }
  // OL-432: dar de alta, abrir u ocultar una ciudad y correr o cancelar una búsqueda se guardan en memoria (otro arranque empieza limpio), para
  // recorrer «Añadir ciudad» → el panel y «Correr» → «Pendiente» con toques reales. Como la base: una ciudad por slug y una búsqueda en curso
  // por botón y ciudad (23505). Los permisos reales, en PostgreSQL (`supabase/tests/pg/ciudades-admin.test.mjs`).
  if ((tabla === "ciudades" || tabla === "rutinas_corridas") && (req.method === "POST" || req.method === "PATCH")) {
    const nodos = parseSelect(url.searchParams.get("select"));
    let cambiadas;
    if (req.method === "POST") {
      const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).filter(Boolean);
      const repetida = (n) =>
        tabla === "ciudades"
          ? tablas.ciudades.some((c) => c.slug === n.slug)
          : tablas.rutinas_corridas.some((r) => r.tipo === n.tipo && r.ciudad === n.ciudad && (r.estado === "pendiente" || r.estado === "corriendo"));
      if (nuevas.some(repetida)) return responder(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
      const ahora = new Date().toISOString();
      cambiadas = nuevas.map((n) =>
        tabla === "ciudades"
          ? { ampliada_de: null, lat: null, lng: null, zoom: 13, zona: "America/Mexico_City", alias: [], parametros: {}, estado: "detectada", creado_en: ahora, ...n }
          : { id: crypto.randomUUID(), parametros: {}, gasto_usd: 0, estado: "pendiente", resumen: {}, creado_por: null, creado_en: ahora, inicio: null, fin: null, ...n },
      );
      tablas[tabla].push(...cambiadas);
    } else {
      const { propios } = parseFiltros(url.searchParams);
      cambiadas = tablas[tabla].filter((fila) => propios.every((c) => cumple(fila, c)));
      for (const fila of cambiadas) Object.assign(fila, cuerpo);
    }
    const salida = cambiadas.map((fila) => proyectar(tabla, fila, nodos, []));
    if (quiereObjeto(req)) return salida.length === 1 ? responder(res, 200, salida[0]) : responder(res, 406, { code: "PGRST116", message: `${salida.length} filas` });
    return responder(res, req.method === "POST" ? 201 : 200, salida);
  }
  const filas = Array.isArray(cuerpo) ? cuerpo : cuerpo ? [cuerpo] : [];
  const conId = filas.map((f) => ({ id: crypto.randomUUID(), ...f }));
  if (quiereObjeto(req)) return responder(res, req.method === "POST" ? 201 : 200, conId[0] || {});
  return responder(res, req.method === "POST" ? 201 : 200, conId);
});
servidor.listen(PUERTO, "127.0.0.1", () => console.log(`respaldo local en http://127.0.0.1:${PUERTO}`));
