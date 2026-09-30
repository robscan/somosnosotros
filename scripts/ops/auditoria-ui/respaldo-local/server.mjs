// Respaldo local 100 % inventado: imita Auth y PostgREST de Supabase sobre el fixture (nunca toca producción).
// node server.mjs [puerto]  →  http://127.0.0.1:8823
import http from "node:http";
import { tablas, rpcs, usuario, sesion, FK } from "./fixture.mjs";

const PUERTO = Number(process.argv[2] || process.env.PUERTO || 8823);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range, Content-Type",
};
const registro = [];

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
function cumple(fila, c) {
  if (!fila) return false;
  if (c.tipo === "cond") {
    const r = comparar(fila[c.col], c.op, c.valor);
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
    return { col: p[0], desc: p.includes("desc") };
  });
  return [...filas].sort((a, b) => {
    for (const k of claves) {
      const va = k.emb ? a[k.emb]?.[k.col] : a[k.col];
      const vb = k.emb ? b[k.emb]?.[k.col] : b[k.col];
      if (va === vb) continue;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
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
  const filas = tablas[tabla] || [];
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
  // Auth
  if (ruta === "/auth/v1/user") return responder(res, 200, usuario);
  if (ruta === "/auth/v1/token") return responder(res, 200, sesion);
  if (ruta === "/auth/v1/logout") return responder(res, 204);
  if (ruta.startsWith("/auth/v1/.well-known")) return responder(res, 200, { keys: [] });
  if (ruta.startsWith("/auth/v1/")) return responder(res, 200, {});
  // RPC
  const rpc = ruta.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (rpc) {
    const args = (await leerCuerpo(req)) || Object.fromEntries(url.searchParams);
    const fn = rpcs[rpc[1]];
    const datos = fn ? fn(args, tablas) : [];
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
  const filas = Array.isArray(cuerpo) ? cuerpo : cuerpo ? [cuerpo] : [];
  const conId = filas.map((f) => ({ id: crypto.randomUUID(), ...f }));
  if (quiereObjeto(req)) return responder(res, req.method === "POST" ? 201 : 200, conId[0] || {});
  return responder(res, req.method === "POST" ? 201 : 200, conId);
});
servidor.listen(PUERTO, "127.0.0.1", () => console.log(`respaldo local en http://127.0.0.1:${PUERTO}`));
