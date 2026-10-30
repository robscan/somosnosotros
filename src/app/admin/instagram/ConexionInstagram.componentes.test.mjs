/**
 * La conexión de Administración › Instagram (OL-471, bitácora 503; OL-495, bitácora 527): los componentes de verdad (`ConexionInstagram`, el
 * botón `BotonConexion` y su hoja `HojaConexion`, con el estado que arma `estadoConexion`) en cada estado, a 390×844, con toques reales (el ratón
 * en coordenadas):
 *   · conectada: el botón con el punto verde y «Instagram conectado como @smsnstrsapp»; ningún renglón; la hoja con la cuenta, desde cuándo, qué
 *     puede y «Reconectar», que lleva a /api/instagram/conectar (navegación completa);
 *   · sin conexión propia (con la llave de respaldo): punto gris, sin renglón; sin ninguna: el renglón con «Conectar Instagram»;
 *   · sin el permiso de leer cuentas: punto rojo y el renglón en rojo que pide reconectar;
 *   · caducó (el último trabajo falló por permiso después de conectar): punto rojo, «Instagram dejó de publicar» y la hoja con «Reconectar»;
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
      import React, { useState } from 'react';import {createRoot} from 'react-dom/client';
      import ConexionInstagram, { BotonConexion, HojaConexion } from './ConexionInstagram';
      import { claveDeVuelta, estadoConexion } from '../../../lib/instagram/conexionEstado';
      import plantilla from '../../../components/ui/Plantilla.module.css';
      import admin from '../admin.module.css';
      import '../../globals.css';
      const q = new URLSearchParams(location.search);
      const todos = ['business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_manage_posts', 'pages_read_engagement', 'pages_show_list'];
      const modo = q.get('modo');
      const fila = modo === 'todo' || modo === 'sin-lectura' || modo === 'caduco'
        ? { pagina_nombre: 'Somos Nosotrxs', instagram_usuario: 'smsnstrsapp', permisos: modo === 'sin-lectura' ? todos.filter((x) => x !== 'instagram_manage_insights') : todos, conectado_en: '2026-10-28T17:00:00Z' }
        : null;
      const ultimo = modo === 'caduco' ? { estado: 'fallido', error: 'permiso', terminado_en: '2026-10-28T17:30:00Z' } : null;
      const estado = estadoConexion(fila, q.get('respaldo') !== '0', new Date('2026-10-28T18:00:00Z'), ultimo);
      const vuelta = q.get('conectado') === '1' ? 'conectado' : claveDeVuelta(q.get('error'));
      function Pantalla() {
        const [hoja, setHoja] = useState(false);
        return <main className={plantilla.paginaContenido + ' ' + admin.listado}><h1>Instagram</h1><BotonConexion estado={estado} onAbrir={() => setHoja(true)} /><ConexionInstagram estado={estado} vuelta={vuelta} />{hoja && <HojaConexion estado={estado} onCerrar={() => setHoja(false)} />}</main>;
      }
      createRoot(document.getElementById('root')).render(<Pantalla />);
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
  await p.getByRole("heading", { name: "Instagram" }).waitFor();
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
const boton = (p) => p.locator('main button[aria-haspopup="dialog"]');
const hoja = (p) => p.getByRole("dialog", { name: "Conexión con Instagram" });
/** El fondo del punto del botón, el color del detalle del renglón (si hay) y los de --ok, --texto-suave y --error. */
const colores = (p) =>
  p.evaluate(() => {
    const de = (v) => {
      const s = document.createElement("span");
      s.style.color = `var(${v})`;
      document.body.append(s);
      const c = getComputedStyle(s).color;
      s.remove();
      return c;
    };
    const small = document.querySelector("main li small");
    return { punto: getComputedStyle(document.querySelector('main button[aria-haspopup="dialog"] > span')).backgroundColor, detalle: small ? getComputedStyle(small).color : null, ok: de("--ok"), gris: de("--texto-suave"), rojo: de("--error") };
  });

test("conectada: punto verde, sin renglón y la hoja con la cuenta, desde cuándo, qué puede y «Reconectar»", async (t) => {
  const p = await abrir(t, "?modo=todo");
  assert.equal(await boton(p).getAttribute("aria-label"), "Instagram conectado como @smsnstrsapp");
  const caja = await boton(p).boundingBox();
  assert.ok(caja.width >= 44 && caja.height >= 44, `el botón mide 44 o más (${caja.width}×${caja.height})`);
  const c = await colores(p);
  assert.equal(c.punto, c.ok, "el punto va en verde");
  assert.equal(await renglon(p).count(), 0, "conectada, ningún renglón ocupa la pantalla");
  await tocar(p, boton(p));
  await hoja(p).waitFor();
  assert.match(await texto(hoja(p)), /@smsnstrsapp Página Somos Nosotrxs · conectada desde el 28 de octubre Puede Publicar en Instagram Publicar en la página de Facebook Leer otras cuentas para completar fichas/i);
  const reconectar = hoja(p).getByRole("link", { name: "Reconectar" });
  assert.equal(await reconectar.getAttribute("href"), "/api/instagram/conectar");
  assert.ok((await reconectar.boundingBox()).height >= 44, "«Reconectar» mide 44 o más");
  await tocar(p, reconectar);
  await p.waitForURL(/\/api\/instagram\/conectar$/);
});

test("la ✕ cierra la hoja", async (t) => {
  const p = await abrir(t, "?modo=todo");
  await tocar(p, boton(p));
  await hoja(p).waitFor();
  await tocar(p, hoja(p).getByRole("button", { name: "Cerrar" }));
  await hoja(p).waitFor({ state: "detached" });
});

test("con la llave de respaldo: punto gris y sin renglón; sin ninguna, el renglón con «Conectar Instagram»", async (t) => {
  const p = await abrir(t);
  assert.equal(await boton(p).getAttribute("aria-label"), "Instagram sin conexión propia");
  const c = await colores(p);
  assert.equal(c.punto, c.gris, "el punto va en gris");
  assert.equal(await renglon(p).count(), 0);
  const q = await abrir(t, "?respaldo=0");
  assert.equal(await boton(q).getAttribute("aria-label"), "Instagram sin conexión");
  assert.equal(await texto(renglon(q)), "Sin conexión Conecta Instagram para publicar Conectar Instagram");
  const enlace = renglon(q).getByRole("link", { name: "Conectar Instagram" });
  assert.equal(await enlace.getAttribute("href"), "/api/instagram/conectar");
  const caja = await enlace.boundingBox();
  assert.ok(caja.height >= 44, `el botón mide 44 o más (${caja.height})`);
  const fila = await renglon(q).boundingBox();
  assert.ok(caja.x + caja.width <= fila.x + fila.width + 0.5 && fila.x >= 15.5 && fila.x + fila.width <= 390 - 15.5, "el renglón y su botón caben con el aire de la columna");
  assert.equal((await q.getByRole("status").count()) + (await q.getByRole("alert").count()), 0, "sin vuelta, ninguna línea de aviso");
  await tocar(q, boton(q));
  await hoja(q).waitFor();
  await tocar(q, hoja(q).getByRole("link", { name: "Conectar Instagram" }));
  await q.waitForURL(/\/api\/instagram\/conectar$/);
});

test("sin el permiso de leer cuentas: punto rojo y el renglón en rojo que pide reconectar", async (t) => {
  const p = await abrir(t, "?modo=sin-lectura");
  assert.match(await texto(renglon(p)), /Falta el permiso para leer cuentas: reconecta Reconectar$/);
  const c = await colores(p);
  assert.equal(c.detalle, c.rojo, "el detalle va en el color de error");
  assert.equal(c.punto, c.rojo, "el punto va en rojo");
});

test("caducó: punto rojo, «Instagram dejó de publicar» y la hoja con «Reconectar»", async (t) => {
  const p = await abrir(t, "?modo=caduco");
  assert.equal(await boton(p).getAttribute("aria-label"), "La conexión con Instagram caducó");
  assert.equal(await texto(renglon(p)), "Instagram dejó de publicar La conexión caducó el mié 28 de oct: reconecta Reconectar");
  const c = await colores(p);
  assert.equal(c.punto, c.rojo, "el punto va en rojo");
  await tocar(p, boton(p));
  await hoja(p).waitFor();
  assert.match(await texto(hoja(p)), /@smsnstrsapp Dejó de publicar el mié 28 de oct: la conexión caducó/);
  assert.equal(await hoja(p).getByRole("link", { name: "Reconectar" }).count(), 1);
});

test("la vuelta: «Instagram quedó conectado» y la dirección pierde ?conectado", async (t) => {
  const p = await abrir(t, "?modo=todo&conectado=1");
  assert.equal(await texto(p.getByRole("status")), "Instagram quedó conectado");
  await p.waitForFunction(() => !location.search.includes("conectado"));
  assert.equal(new URL(p.url()).search, "?modo=todo");
});

test("la vuelta con error: su frase llana, sin nada técnico, y la ✕ la cierra", async (t) => {
  const p = await abrir(t, "?error=pagina&respaldo=0");
  const aviso = p.getByRole("alert");
  assert.equal(await texto(aviso), "La cuenta que entró no administra la página Somos Nosotrxs.");
  await p.waitForFunction(() => !location.search.includes("error"));
  await tocar(p, aviso.getByRole("button", { name: "Cerrar el aviso" }));
  await aviso.waitFor({ state: "detached" });
  assert.equal(await texto(renglon(p)), "Sin conexión Conecta Instagram para publicar Conectar Instagram", "el renglón sigue");
});

test("una clave de error que no conocemos no pinta nada", async (t) => {
  const p = await abrir(t, "?error=%3Cscript%3E");
  assert.equal(await p.getByRole("alert").count(), 0);
});
