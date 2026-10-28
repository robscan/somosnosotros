/**
 * El bloque «Conexión» de Administración › Instagram (OL-471, bitácora 503): el componente de verdad (`ConexionInstagram`, con el estado que arma
 * `estadoConexion`) en cada estado, a 390×844, con toques reales (el ratón en coordenadas):
 *   · sin conexión propia: «Usa el token de respaldo» y «Conectar Instagram», que lleva a /api/instagram/conectar (navegación completa);
 *   · conectada: la cuenta, qué puede y desde cuándo, y «Reconectar»;
 *   · sin el permiso de leer cuentas: lo dice en rojo y pide reconectar;
 *   · la vuelta de Meta: «Instagram quedó conectado», o la frase llana del error, que se cierra con la ✕; la dirección pierde `?conectado` / `?error`.
 * PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROME_EXECUTABLE=/ruta/chrome node --test este-archivo
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
let dir, server, browser, origin;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "conexion-instagram-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/instagram"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import ConexionInstagram from './ConexionInstagram';
      import { claveDeVuelta, estadoConexion } from '../../../lib/instagram/conexionEstado';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      const q = new URLSearchParams(location.search);
      const todos = ['business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_manage_posts', 'pages_read_engagement', 'pages_show_list'];
      const modo = q.get('modo');
      const fila = modo === 'todo' || modo === 'sin-lectura'
        ? { pagina_nombre: 'Somos Nosotrxs', instagram_usuario: 'smsnstrsapp', permisos: modo === 'todo' ? todos : todos.filter((x) => x !== 'instagram_manage_insights'), conectado_en: '2026-10-28T17:00:00Z' }
        : null;
      const estado = estadoConexion(fila, true, new Date('2026-10-28T18:00:00Z'));
      const vuelta = q.get('conectado') === '1' ? 'conectado' : claveDeVuelta(q.get('error'));
      createRoot(document.getElementById('root')).render(
        <main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1><ConexionInstagram estado={estado} vuelta={vuelta} /></main>
      );
    `,
    },
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial;--alto-cabecera:0px}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
    ["/api/instagram/conectar", ["text/plain", "a Meta"]],
  ]);
  server = createServer((req, res) => {
    const a = assets.get(req.url.split("?")[0]);
    res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` });
    res.end(a?.[1] ?? "");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function abrir(t, consulta = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + "/" + consulta);
  await p.getByRole("heading", { name: "Conexión" }).waitFor();
  return p;
}
/** Un toque real en el centro del elemento; antes comprueba que es él quien lo recibe (nada encima). */
async function tocar(p, l) {
  await l.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await l.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  assert.ok(await l.evaluate((e, [x, y]) => e.contains(document.elementFromPoint(x, y)), [x, y]), "nada tapa lo que se toca");
  await p.mouse.click(x, y);
}
const texto = (l) => l.innerText().then((x) => x.replace(/\s+/g, " ").trim());
const renglon = (p) => p.locator("main li");
/** El color del detalle del renglón y el de `--error`. */
const colores = (p) =>
  p.evaluate(() => {
    const prueba = document.createElement("span");
    prueba.style.color = "var(--error)";
    document.body.append(prueba);
    const r = [getComputedStyle(document.querySelector("main li small")).color, getComputedStyle(prueba).color];
    prueba.remove();
    return r;
  });

test("sin conexión propia: dice que usa el token de respaldo y «Conectar Instagram» lleva al inicio de sesión de Meta", async (t) => {
  const p = await abrir(t);
  assert.equal(await texto(renglon(p)), "Sin conexión propia Usa el token de respaldo Conectar Instagram");
  const boton = p.getByRole("link", { name: "Conectar Instagram" });
  assert.equal(await boton.getAttribute("href"), "/api/instagram/conectar");
  const caja = await boton.boundingBox();
  assert.ok(caja.height >= 44, `el botón mide 44 o más (${caja.height})`);
  const fila = await renglon(p).boundingBox();
  assert.ok(caja.x + caja.width <= fila.x + fila.width + 0.5 && fila.x >= 15.5 && fila.x + fila.width <= 390 - 15.5, "el renglón y su botón caben con el aire de la columna");
  assert.equal(await p.getByRole("status").count() + (await p.getByRole("alert").count()), 0, "sin vuelta, ninguna línea de aviso");
  await tocar(p, boton);
  await p.waitForURL(/\/api\/instagram\/conectar$/);
});

test("conectada: la cuenta, qué puede y desde cuándo, y «Reconectar»", async (t) => {
  const p = await abrir(t, "?modo=todo");
  assert.equal(await texto(renglon(p)), "Conectada como Somos Nosotrxs (@smsnstrsapp) Publica y lee cuentas · desde el 28 de octubre Reconectar");
  const [detalle, rojo] = await colores(p);
  assert.notEqual(detalle, rojo, "con todo, el detalle no va en rojo");
  await tocar(p, p.getByRole("link", { name: "Reconectar" }));
  await p.waitForURL(/\/api\/instagram\/conectar$/);
});

test("sin el permiso de leer cuentas: lo dice en rojo y pide reconectar", async (t) => {
  const p = await abrir(t, "?modo=sin-lectura");
  assert.match(await texto(renglon(p)), /Falta el permiso para leer cuentas: reconecta Reconectar$/);
  const [detalle, rojo] = await colores(p);
  assert.equal(detalle, rojo, "el detalle va en el color de error");
});

test("la vuelta: «Instagram quedó conectado» y la dirección pierde ?conectado", async (t) => {
  const p = await abrir(t, "?modo=todo&conectado=1");
  assert.equal(await texto(p.getByRole("status")), "Instagram quedó conectado");
  await p.waitForFunction(() => !location.search.includes("conectado"));
  assert.equal(new URL(p.url()).search, "?modo=todo");
});

test("la vuelta con error: su frase llana, sin nada técnico, y la ✕ la cierra", async (t) => {
  const p = await abrir(t, "?error=pagina");
  const aviso = p.getByRole("alert");
  assert.equal(await texto(aviso), "La cuenta que entró no administra la página Somos Nosotrxs.");
  await p.waitForFunction(() => !location.search.includes("error"));
  await tocar(p, aviso.getByRole("button", { name: "Cerrar el aviso" }));
  await aviso.waitFor({ state: "detached" });
  assert.equal(await texto(renglon(p)), "Sin conexión propia Usa el token de respaldo Conectar Instagram", "el renglón sigue");
});

test("una clave de error que no conocemos no pinta nada", async (t) => {
  const p = await abrir(t, "?error=%3Cscript%3E");
  assert.equal(await p.getByRole("alert").count(), 0);
});
