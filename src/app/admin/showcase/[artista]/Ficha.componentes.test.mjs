/**
 * La ficha de showcase (OL-426, lo firmado en OL-425): cambiar el estado en su hoja, el puntaje de una señal (0, 1, 2 o sin puntuar), añadir una
 * evidencia (el botón dice qué falta; un enlace que no es http(s) se rechaza sin llamar a la acción; uno bueno sí), aceptar y deshacer una propuesta,
 * y las notas privadas (se guardan al salir del campo; la ✕ las vacía). OL-430: «Investigar» (la hoja con el tope y su ✕; con una en curso, solo
 * la dice y el renglón lleva su barra). Los componentes de verdad con las acciones del servidor de prueba: apuntan lo que reciben en
 * `window.qa.acciones`. OL-446: «Por revisar» con lo que cambia al aceptar (`Hallazgos`), rechazar con su motivo, «Aceptar las 2» y el aviso «2 por
 * revisar» que baja hasta ahí.
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

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
let dir, server, browser, origin;

const ok = "{ ok: true }";
const mocks = {
  "next/link": "import React from 'react';export function useLinkStatus(){return {pending:false}}export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}",
  "next/navigation": "export const useRouter=()=>({push(){},refresh(){},back(){},replace(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);",
  // Las acciones del servidor: apuntan lo que reciben y contestan bien (o mal, con `window.qa.falla`).
  "../acciones": `
    const apuntar = (nombre, args) => { window.qa.acciones.push([nombre, ...args]); return window.qa.falla ? { ok: false, error: 'Sin conexión con la base. Intenta de nuevo.' } : ${ok}; };
    export async function cambiarEstado(...a) { return apuntar('cambiarEstado', a); }
    export async function cambiarPuntaje(...a) { return apuntar('cambiarPuntaje', a); }
    export async function guardarNotas(...a) { return apuntar('guardarNotas', a); }
    export async function anadirEvidencia(...a) { return apuntar('anadirEvidencia', a); }
    export async function decidirEvidencia(...a) { return apuntar('decidirEvidencia', a); }
    export async function anadirLectura(...a) { return apuntar('anadirLectura', a); }
    export async function importarLecturas(...a) { apuntar('importarLecturas', a); return { ok: true, importadas: 2, errores: [{ linea: 4, motivo: 'Elige la red.' }] }; }
    export async function investigar(...a) { return apuntar('investigar', a); }
  `,
  // OL-446: las acciones de «Por aprobar» (pasan por decidirEvidencia en el servidor).
  "./accionesPorAprobar": `
    const apuntar = (nombre, args) => { window.qa.acciones.push([nombre, ...args]); return window.qa.falla ? { ok: false, error: 'Sin conexión con la base. Intenta de nuevo.' } : ${ok}; };
    export async function decidir(...a) { return apuntar('decidir', a); }
    export async function rechazarConMotivo(...a) { return apuntar('rechazarConMotivo', a); }
    export async function aceptarVarias(ids, slug) { window.qa.acciones.push(['aceptarVarias', ids, slug]); return { ok: true, aceptadas: ids }; }
  `,
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "showcase-ficha-"));
  await build({
    absWorkingDir: root,
    bundle: true,
    define: { "process.env": "{}" },
    outfile: join(dir, "app.js"),
    stdin: {
      resolveDir: join(root, "src/app/admin/showcase/[artista]"),
      loader: "tsx",
      contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import EstadoFicha from './EstadoFicha';
      import SenalFicha from './SenalFicha';
      import Hallazgos from '../Hallazgos';
      import AvisoPorRevisar from './AvisoPorRevisar';
      import RedesFicha from './RedesFicha';
      import NotasFicha from './NotasFicha';
      import InvestigarFicha from './InvestigarFicha';
      import plantilla from '../../../../components/ui/Plantilla.module.css';
      import { valorDe, valoresDe } from '../../../../lib/showcase';
      import '../../../globals.css';
      window.qa = { acciones: [], falla: false };
      const ID = '11111111-1111-4111-8111-111111111111';
      const opciones = [
        { valor: 'candidato', etiqueta: 'Candidato', detalle: 'Todavía sin revisar' },
        { valor: 'revisado', etiqueta: 'Revisado', detalle: 'Alguien leyó sus evidencias · por ti el 15 oct' },
        { valor: 'invitado', etiqueta: 'Invitado', detalle: 'Se le escribió para el showcase · por ti el 18 oct' },
        { valor: 'confirmado', etiqueta: 'Confirmado', detalle: 'Aceptó la invitación' },
        { valor: 'descartado', etiqueta: 'Descartado', detalle: 'No sigue; se puede volver' },
      ];
      // OL-437: lo que vale de cada señal (valorDe: lo fijado a mano manda; si no, lo propuesto por la base; si no, sin datos).
      const obra = { clave: 'obra', titulo: 'Obra y reconocimiento', resumen: '1 evidencia aceptada: obra', valor: valorDe(1, null),
        niveles: ['Nada verificable', 'Obra publicada o expuesta en los últimos 24 meses', 'Además, beca, premio, residencia o selección oficial'],
        evidencias: [{ id: 'e1', senal: 'obra', tipo: 'obra', titulo: 'Sencillo en plataformas', url: 'https://musica.example/s', fecha: null, fuente: 'musica.example', leida_por: 'persona', estado: 'aceptada', creado_en: '2026-10-10T00:00:00Z', detalle: 'Obra · musica.example · aceptada, la leyó una persona' }] };
      const circulacion = { clave: 'circulacion', titulo: 'Circulación', resumen: '7 eventos en 4 foros y 1 festival este año', valor: valorDe(null, { puntaje: 2, motivo: '4 foros y un festival este año' }),
        niveles: ['Un foro o ninguno', 'De 2 a 3 foros, o un festival', '4 foros o más, o un festival y fechas fuera de San Luis'], evidencias: [] };
      const actividad = { clave: 'actividad', titulo: 'Actividad', resumen: 'Sin lecturas de redes', valor: valorDe(null, null),
        niveles: ['Más de 90 días sin publicar', 'Publica cada mes', 'Publica cada semana y anuncia sus fechas'], evidencias: [] };
      const vinculo = { clave: 'vinculo', titulo: 'Vínculo con la app', resumen: 'Ficha reclamada; con novedades', valor: valorDe(1, { puntaje: 2, motivo: 'Ficha reclamada, con novedades' }),
        niveles: ['Sin ficha propia', 'Ficha reclamada', 'Con novedades o portada'], evidencias: [] };
      const enCurso = new URLSearchParams(location.search).has('encurso');
      // OL-446: la nota (circulación, fijada a mano en 2) llegó antes que la mención (obra 1 → 2), pero la que sube el puntaje va primero.
      const propuestas = [
        { id: '33333333-3333-4333-8333-333333333333', senal: 'circulacion', tipo: 'prensa', titulo: 'Nota sobre su gira', url: 'https://prensa.example/n', fecha: null, fuente: 'prensa.example', leida_por: 'rutina', estado: 'propuesta', creado_en: '2026-10-19T00:00:00Z', detalle: 'leída por la rutina ayer', fuenteTexto: 'prensa.example' },
        { id: '22222222-2222-4222-8222-222222222222', senal: 'obra', tipo: 'premio', titulo: 'Mención estatal', url: 'https://cultura.example/p', fecha: '2025-11-20', fuente: null, leida_por: 'rutina', estado: 'propuesta', creado_en: '2026-10-20T00:00:00Z', detalle: '20 nov 2025 · leída por la rutina hoy', fuenteTexto: 'cultura.example' },
      ];
      const prop = (n) => ({ puntaje: n, motivo: 'de la base' });
      const valores = valoresDe({ circulacion: 2, obra: null, actividad: null, vinculo: null }, { circulacion: prop(2), obra: prop(1), actividad: prop(2), vinculo: prop(2) });
      const grupo = { artista: { id: ID, slug: 'sangre-de-coyote', nombre: 'Sangre de Coyote', foto: null, href: '/admin/showcase/sangre-de-coyote', disciplina: 'Música', estado: 'Invitado' }, valores,
        obraAceptada: [{ senal: 'obra', tipo: 'obra', titulo: 'Sencillo en plataformas', fecha: '2026-03-21', estado: 'aceptada' }], hallazgos: propuestas };
      createRoot(document.getElementById('root')).render(
        <main id="ficha" className={plantilla.paginaContenido}>
          <AvisoPorRevisar n={2} />
          <EstadoFicha artistaId={ID} slug="sangre-de-coyote" nombre="Sangre de Coyote" estado="invitado" titulo="Invitado" detalle="Por ti el 18 oct · antes, revisado el 15 oct" opciones={opciones} />
          <SenalFicha artistaId={ID} slug="sangre-de-coyote" senal={circulacion} />
          <SenalFicha artistaId={ID} slug="sangre-de-coyote" senal={obra} />
          <SenalFicha artistaId={ID} slug="sangre-de-coyote" senal={actividad} />
          <SenalFicha artistaId={ID} slug="sangre-de-coyote" senal={vinculo} />
          <InvestigarFicha artistaId={ID} slug="sangre-de-coyote" nombre="Sangre de Coyote" ciudad="San Luis Potosí" enCurso={enCurso} avance={enCurso ? 0.5 : null}
            texto={enCurso ? 'Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD' : 'Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD'} credito="Crédito: 187,40 USD · vence el 11 de noviembre" />
          <Hallazgos grupos={[grupo]} hoy="2026-10-20" modo="ficha" />
          <RedesFicha artistaId={ID} slug="sangre-de-coyote" hoy="2026-10-20" lecturas={[{ red: 'instagram', etiqueta: 'Instagram', texto: '3,2 mil seguidores', hace: 'hace 4 días' }]} />
          <NotasFicha artistaId={ID} slug="sangre-de-coyote" notas="Propuesto por dos foros." />
        </main>,
      );
    `,
    },
    plugins: [
      {
        name: "dobles",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
        },
      },
    ],
  });
  const assets = new Map([
    ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
    ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
    ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
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

async function abrir(t, ruta = "/") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  t.after(() => assert.deepEqual(errores, []));
  await p.goto(origin + ruta);
  await p.getByRole("button", { name: /^Invitado/ }).waitFor();
  return p;
}
const acciones = (p) => p.evaluate(() => window.qa.acciones);
const ID = "11111111-1111-4111-8111-111111111111";

test("cambiar el estado: la hoja con los cinco, quién y cuándo; elegir uno llama a la acción y cierra", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Invitado/ }).click();
  const hoja = p.getByRole("dialog", { name: "Estado de Sangre de Coyote" });
  await hoja.waitFor();
  assert.ok((await hoja.innerText()).includes("Cada cambio queda con quién y cuándo."));
  assert.equal(await hoja.getByRole("button", { name: /^Invitado/ }).getAttribute("aria-pressed"), "true");
  assert.ok((await hoja.getByRole("button", { name: /^Revisado/ }).innerText()).includes("por ti el 15 oct"));
  await hoja.getByRole("button", { name: /^Confirmado/ }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["cambiarEstado", ID, "confirmado", "sangre-de-coyote"]]);
});

test("si la acción falla, la hoja lo dice y no se cierra", async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => (window.qa.falla = true));
  await p.getByRole("button", { name: /^Invitado/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Descartado/ }).click();
  await p.getByRole("alert").getByText("Sin conexión con la base. Intenta de nuevo.").waitFor();
  assert.ok(await p.getByRole("dialog").isVisible());
});

test("el puntaje: 0, 1, 2 con su línea de ayuda y «Sin puntuar»", async (t) => {
  const p = await abrir(t);
  await p.getByRole("button", { name: /^Obra y reconocimiento/ }).click();
  const hoja = p.getByRole("dialog", { name: "Puntaje de Obra y reconocimiento" });
  await hoja.waitFor();
  const opciones = (await hoja.locator("ul button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim());
  assert.deepEqual(opciones, ["0 Nada verificable", "1 Obra publicada o expuesta en los últimos 24 meses", "2 Además, beca, premio, residencia o selección oficial", "Sin puntuar No cuenta en la suma"]);
  assert.equal(await hoja.getByRole("button", { name: /^1/ }).getAttribute("aria-pressed"), "true");
  await hoja.getByRole("button", { name: /^2/ }).click();
  await hoja.waitFor({ state: "detached" });
  await p.getByRole("button", { name: /^Obra y reconocimiento/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Sin puntuar/ }).click();
  assert.deepEqual(await acciones(p), [
    ["cambiarPuntaje", ID, "obra", 2, "sangre-de-coyote"],
    ["cambiarPuntaje", ID, "obra", null, "sangre-de-coyote"],
  ]);
});

test("añadir evidencia: el botón dice qué falta; un enlace que no es http(s) se rechaza sin llamar a la acción", async (t) => {
  const p = await abrir(t);
  await p.getByRole("list", { name: "Obra y reconocimiento" }).getByRole("button", { name: "Añadir evidencia" }).click();
  const hoja = p.getByRole("dialog", { name: "Añadir evidencia a Obra y reconocimiento" });
  await hoja.waitFor();
  const enviar = hoja.locator("button[type=submit]");
  assert.equal(await enviar.innerText(), "Falta el título");
  assert.ok(await enviar.isDisabled());
  assert.equal(await hoja.getByRole("button", { name: "Obra", exact: true }).getAttribute("aria-pressed"), "true", "el tipo que va con la señal, ya elegido");
  await hoja.getByLabel("Qué es").fill("Disco en vivo");
  assert.equal(await enviar.innerText(), "Falta el enlace");
  await hoja.getByLabel("Enlace", { exact: true }).fill("ftp://musica.example/disco");
  assert.equal(await enviar.innerText(), "Añadir");
  await enviar.click();
  await hoja.getByText("El enlace tiene que empezar con http:// o https://.").waitFor();
  assert.equal(await hoja.getByLabel("Enlace", { exact: true }).getAttribute("aria-invalid"), "true");
  assert.equal(await p.evaluate(() => document.activeElement?.id), "campo-url", "el foco vuelve al enlace");
  for (const malo of ["javascript:alert(1)", "musica.example/disco", "https://alguien@musica.example/x"]) {
    await hoja.getByLabel("Enlace", { exact: true }).fill(malo);
    await enviar.click();
    await hoja.getByRole("alert").first().waitFor();
  }
  assert.deepEqual(await acciones(p), [], "ninguna evidencia sin un enlace válido llega al servidor");
  // El ✕ del campo vacía el enlace (y el botón vuelve a decir qué falta).
  await hoja.getByLabel("Enlace", { exact: true }).click();
  await hoja.getByRole("button", { name: "Borrar lo escrito" }).nth(1).click();
  assert.equal(await enviar.innerText(), "Falta el enlace");
  await hoja.getByLabel("Enlace", { exact: true }).fill("https://musica.example/disco-en-vivo");
  await hoja.getByRole("button", { name: "Premio", exact: true }).click();
  await enviar.click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["anadirEvidencia", ID, { senal: "obra", tipo: "premio", titulo: "Disco en vivo", url: "https://musica.example/disco-en-vivo", fecha: "", fuente: "" }, "sangre-de-coyote"]]);
});

const MENCION = "22222222-2222-4222-8222-222222222222";
const NOTA = "33333333-3333-4333-8333-333333333333";
const hallazgo = (p, titulo) => p.locator("li", { has: p.getByRole("link", { name: titulo }) });
/** Un toque real: el ratón en el centro del elemento (no `element.click()`, que no ve si algo lo tapa). */
async function tocar(p, l) {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

test("OL-446 · por revisar: cada hallazgo dice qué cambia; primero el que sube; aceptar deja «Aceptaste … · Obra 1 → 2 · ya está en su perfil» con «Deshacer»", async (t) => {
  const p = await abrir(t);
  assert.ok((await p.getByRole("heading", { name: /Por revisar/ }).innerText()).includes("2"));
  const titulos = await p.locator("li > a[target=_blank]").filter({ hasNotText: "Sencillo" }).allInnerTexts();
  assert.deepEqual(titulos, ["Mención estatal", "Nota sobre su gira"], "primero lo que sube el puntaje");
  assert.equal(await hallazgo(p, "Mención estatal").locator("p[data-sube]").innerText(), "Si la aceptas: Obra 1 → 2 · total 7 → 8");
  assert.equal(await hallazgo(p, "Nota sobre su gira").locator("p").last().innerText(), "No cambia el puntaje: Circulación está fijada a mano en 2");
  await tocar(p, hallazgo(p, "Mención estatal").getByRole("button", { name: "Aceptar" }));
  await p.getByText("Aceptaste").waitFor();
  assert.ok((await p.getByRole("status").filter({ hasText: "Aceptaste" }).innerText()).includes("Mención estatal · Obra 1 → 2 · ya está en su perfil"));
  assert.ok((await p.getByRole("heading", { name: /Por revisar/ }).innerText()).includes("1"), "la cuenta baja");
  await tocar(p, p.getByRole("button", { name: "Deshacer" }));
  await hallazgo(p, "Mención estatal").getByRole("button", { name: "Aceptar" }).waitFor();
  assert.deepEqual(await acciones(p), [
    ["decidir", MENCION, "aceptada", "sangre-de-coyote"],
    ["decidir", MENCION, "propuesta", "sangre-de-coyote"],
  ]);
});

test("OL-446 · rechazar pide el motivo en una hoja; elegirlo rechaza y lo dice; cerrar la hoja no rechaza", async (t) => {
  const p = await abrir(t);
  await tocar(p, hallazgo(p, "Nota sobre su gira").getByRole("button", { name: "Rechazar" }));
  const hoja = p.getByRole("dialog", { name: "Rechazar «Nota sobre su gira»" });
  await hoja.waitFor();
  assert.deepEqual((await hoja.getByRole("button").filter({ hasNot: p.locator("[aria-label=Cerrar]") }).allInnerTexts()).map((x) => x.split("\n")[0]).filter(Boolean), ["Duplicado", "No es esta persona", "No es relevante", "Otro"]);
  await p.keyboard.press("Escape");
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [], "cerrar no rechaza");
  await tocar(p, hallazgo(p, "Nota sobre su gira").getByRole("button", { name: "Rechazar" }));
  await tocar(p, hoja.getByRole("button", { name: /^No es esta persona/ }));
  await p.getByText("Rechazaste").waitFor();
  assert.ok((await p.getByRole("status").filter({ hasText: "Rechazaste" }).innerText()).includes("Nota sobre su gira · no es esta persona"));
  assert.deepEqual(await acciones(p), [["rechazarConMotivo", NOTA, "no_es_esta_persona", "sangre-de-coyote"]]);
});

test("OL-446 · «Aceptar las 2» las acepta en orden y deja la línea de cada una; el aviso «2 por revisar» baja hasta ahí sin navegar", async (t) => {
  const p = await abrir(t);
  const aviso = p.getByRole("button", { name: "2 por revisar" });
  const historial = await p.evaluate(() => history.length);
  await tocar(p, aviso);
  await p.waitForFunction(() => document.activeElement?.id === "por-revisar");
  assert.equal(await p.evaluate(() => history.length), historial, "bajar no es navegar");
  await tocar(p, p.getByRole("button", { name: "Aceptar las 2" }));
  await p.getByText("Aceptaste").first().waitFor();
  assert.equal(await p.getByRole("status").filter({ hasText: "Aceptaste" }).count(), 2);
  assert.equal(await p.getByRole("button", { name: /^Aceptar las/ }).count(), 0, "sin pendientes, sin botón");
  assert.deepEqual(await acciones(p), [["aceptarVarias", [MENCION, NOTA], "sangre-de-coyote"]]);
});

test("redes: «leída hace N días», añadir una lectura (el botón dice qué falta) e importar un CSV", async (t) => {
  const p = await abrir(t);
  assert.ok((await p.getByText(/Instagram · leída hace 4 días/i).count()) === 1);
  await p.getByRole("button", { name: /^Añadir lectura/ }).click();
  const hoja = p.getByRole("dialog", { name: "Añadir lectura" });
  const guardar = hoja.locator("button[type=submit]");
  assert.equal(await guardar.innerText(), "Falta una cifra");
  await hoja.getByLabel("Seguidores").fill("3,2 mil");
  await guardar.click();
  await hoja.getByText("Escribe solo el número: 3200.").waitFor();
  await hoja.getByLabel("Seguidores").fill("3,200");
  await hoja.getByRole("button", { name: "YouTube", exact: true }).click();
  await guardar.click();
  await hoja.waitFor({ state: "detached" });
  await p.getByRole("button", { name: /^Importar CSV/ }).click();
  const csv = p.getByRole("dialog", { name: "Importar CSV de redes" });
  assert.equal(await csv.getByRole("button", { name: "Elige el archivo" }).isDisabled(), true);
  await csv.getByLabel("Archivo").setInputFiles({ name: "redes.csv", mimeType: "text/csv", buffer: Buffer.from("artista_slug,red,seguidores,publicaciones,ultima_publicacion,leido_en\nsangre-de-coyote,instagram,3200,412,2026-10-18,2026-10-19\n") });
  await csv.getByRole("button", { name: "Importar" }).click();
  await csv.getByText("Se importaron 2 lecturas; 1 fila no entró.").waitFor();
  await csv.getByText("Línea 4: Elige la red.").waitFor();
  const hechas = await acciones(p);
  assert.deepEqual(hechas[0], ["anadirLectura", ID, { red: "youtube", seguidores: "3,200", publicaciones: "", ultima: "" }, "sangre-de-coyote"]);
  assert.equal(hechas[1][0], "importarLecturas");
  assert.ok(hechas[1][1].startsWith("artista_slug,red,seguidores"), "manda el texto del archivo");
});

test("notas privadas: se guardan al salir del campo; la ✕ las vacía y guardar vacío las borra", async (t) => {
  const p = await abrir(t);
  const notas = p.getByLabel("Notas privadas");
  assert.equal(await notas.inputValue(), "Propuesto por dos foros.");
  await notas.click();
  await notas.press("End");
  await notas.type(" Preguntar por el disco.");
  assert.deepEqual(await acciones(p), [], "nada se guarda mientras se escribe");
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  await p.getByText("Guardado. Solo administración: nunca salen de aquí.").waitFor();
  await notas.click();
  await p.getByRole("button", { name: "Borrar las notas" }).click();
  assert.equal(await notas.inputValue(), "");
  assert.equal(await p.evaluate(() => document.activeElement?.id), "campo-notas", "la ✕ deja el foco en el campo");
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  await p.waitForFunction(() => window.qa.acciones.length === 2);
  assert.deepEqual(await acciones(p), [
    ["guardarNotas", ID, "Propuesto por dos foros. Preguntar por el disco.", "sangre-de-coyote"],
    ["guardarNotas", ID, "", "sangre-de-coyote"],
  ]);
  // Salir otra vez sin cambiar nada no vuelve a guardar.
  await notas.click();
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  await p.waitForTimeout(200);
  assert.equal((await acciones(p)).length, 2);
});

test("Investigar: la hoja dice qué hace y dónde busca; el tope (1,00) con su ✕; uno que no vale no llega al servidor; «Investigar» llama a la acción y cierra", async (t) => {
  const p = await abrir(t);
  const renglon = p.getByRole("button", { name: /^Investigar/ });
  assert.ok((await renglon.innerText()).includes("Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD"));
  assert.equal(await renglon.getAttribute("data-ayuda"), "investigar", "la ⓘ explica qué hace y cuánto cuesta");
  await renglon.click();
  const hoja = p.getByRole("dialog", { name: "Investigar a Sangre de Coyote" });
  await hoja.waitFor();
  const texto = await hoja.innerText();
  for (const frase of ["premios, becas, prensa, festivales y obra publicada", "su ciudad (San Luis Potosí)", "No lee redes.", "Premios, becas y convocatorias", "Obra publicada", "Crédito: 187,40 USD · vence el 11 de noviembre."]) assert.ok(texto.includes(frase), frase);
  const tope = hoja.getByLabel("Tope de gasto (USD)");
  assert.equal(await tope.inputValue(), "1,00");
  await tope.fill("0");
  await hoja.getByRole("button", { name: "Investigar", exact: true }).click();
  await hoja.getByText(/^Un tope de más de 0 y hasta 50 USD/).waitFor();
  assert.deepEqual(await acciones(p), [], "un tope que no vale no llega al servidor");
  // La ✕ vacía el campo y el botón lo vuelve a pedir.
  await tope.click();
  await hoja.getByRole("button", { name: "Borrar lo escrito" }).click();
  assert.equal(await tope.inputValue(), "");
  await hoja.getByRole("button", { name: "Investigar", exact: true }).click();
  await hoja.getByText("Escribe el tope en dólares.").waitFor();
  await tope.fill("0,50");
  await hoja.getByRole("button", { name: "Investigar", exact: true }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["investigar", ID, "0,50", "sangre-de-coyote"]]);
});

test("Investigar: si la acción falla, la hoja lo dice y no se cierra", async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => (window.qa.falla = true));
  await p.getByRole("button", { name: /^Investigar/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Investigar", exact: true }).click();
  await p.getByRole("dialog").getByRole("alert").getByText("Sin conexión con la base. Intenta de nuevo.").waitFor();
  assert.ok(await p.getByRole("dialog").isVisible());
});

test("Investigar en curso: el renglón dice cómo va con su barra; la hoja solo lo dice, sin tope ni botón de investigar", async (t) => {
  const p = await abrir(t, "/?encurso=1");
  const renglon = p.getByRole("button", { name: /^Investigar/ });
  assert.ok((await renglon.innerText()).includes("Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD"));
  assert.equal(await renglon.getByRole("progressbar").getAttribute("aria-valuenow"), "50");
  await renglon.click();
  const hoja = p.getByRole("dialog", { name: "Investigar a Sangre de Coyote" });
  await hoja.getByText("Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD. Lo que encuentre llega a «Por revisar».").waitFor();
  assert.equal(await hoja.getByLabel("Tope de gasto (USD)").count(), 0);
  assert.equal(await hoja.getByRole("button", { name: "Investigar", exact: true }).count(), 0);
  // El «Cerrar» del pie (la ✕ de la cabecera se llama igual).
  await hoja.getByRole("button", { name: "Cerrar", exact: true }).last().click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), []);
});

/** La casilla del puntaje a la derecha de una señal: lo que se ve, de dónde sale y cómo se dibuja. */
const casilla = (p, titulo) =>
  p
    .getByRole("list", { name: titulo })
    .locator("span[data-origen]")
    .evaluate((x) => {
      const e = getComputedStyle(x);
      // El contorno es el filete de la casilla: transparente («ninguno») salvo en lo propuesto, discontinuo.
      return { ve: (x.querySelector("b, small") ?? x).textContent, origen: x.dataset.origen, contorno: e.borderTopColor === "rgba(0, 0, 0, 0)" ? "ninguno" : e.borderTopStyle, fondo: e.backgroundColor };
    });
const opcionesDe = (hoja) => hoja.locator("ul button").evaluateAll((bs) => bs.map((b) => [b.firstChild.nextSibling.textContent, b.dataset.marca ?? null, b.getAttribute("aria-pressed")]));

test("OL-437 · señal propuesta: el puntaje en contorno; la hoja dice «Propuesto: 2 · …» con el destello en el 2; tocarlo lo fija igual", async (t) => {
  const p = await abrir(t);
  assert.deepEqual(await casilla(p, "Circulación"), { ve: "2", origen: "propuesto", contorno: "dashed", fondo: "rgba(0, 0, 0, 0)" });
  const fila = p.getByRole("button", { name: /^Circulación/ });
  assert.ok((await fila.textContent()).endsWith("2, propuesto"), "se oye que es propuesto");
  await fila.click();
  const hoja = p.getByRole("dialog", { name: "Puntaje de Circulación" });
  await hoja.waitFor();
  assert.equal((await hoja.locator("p").first().innerText()).trim(), "Propuesto: 2 · 4 foros y un festival este año");
  assert.deepEqual(await opcionesDe(hoja), [["0", null, "false"], ["1", null, "false"], ["2", "propuesto", "false"]], "el destello en el 2, nada fijado, sin «Sin puntuar»");
  assert.equal(await hoja.locator("button[data-marca=propuesto] > svg").evaluate((s) => getComputedStyle(s).color), "rgb(109, 52, 200)", "el destello, en violeta");
  await hoja.getByRole("button", { name: /^2/ }).click();
  await hoja.waitFor({ state: "detached" });
  await fila.click();
  await p.getByRole("dialog").getByRole("button", { name: /^1/ }).click();
  assert.deepEqual(await acciones(p), [
    ["cambiarPuntaje", ID, "circulacion", 2, "sangre-de-coyote"],
    ["cambiarPuntaje", ID, "circulacion", 1, "sangre-de-coyote"],
  ], "tocar el propuesto lo fija igual; tocar otro lo cambia");
});

test("OL-437 · señal fijada distinta de lo propuesto: relleno; la paloma en lo fijado y «Volver al propuesto» lo quita", async (t) => {
  const p = await abrir(t);
  const vinculo = await casilla(p, "Vínculo con la app");
  assert.deepEqual([vinculo.ve, vinculo.origen, vinculo.contorno], ["1", "fijado", "ninguno"]);
  assert.notEqual(vinculo.fondo, "rgba(0, 0, 0, 0)");
  await p.getByRole("button", { name: /^Vínculo con la app/ }).click();
  const hoja = p.getByRole("dialog", { name: "Puntaje de Vínculo con la app" });
  await hoja.waitFor();
  assert.equal((await hoja.locator("p").first().innerText()).trim(), "Propuesto: 2 · Ficha reclamada, con novedades");
  assert.deepEqual(await opcionesDe(hoja), [["0", null, "false"], ["1", "fijado", "true"], ["2", null, "false"], ["Volver al propuesto", "propuesto", null]]);
  assert.ok((await hoja.getByRole("button", { name: /^Volver al propuesto/ }).innerText()).includes("Vale el 2 en vez del 1 fijado a mano"));
  // Tocar lo que ya está fijado no hace nada (cierra).
  await hoja.getByRole("button", { name: /^1/ }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), []);
  await p.getByRole("button", { name: /^Vínculo con la app/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Volver al propuesto/ }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["cambiarPuntaje", ID, "vinculo", null, "sangre-de-coyote"]]);
});

test("OL-437 · sin datos: el renglón lo dice (no un 0), la hoja da el resumen y tocar un número lo fija", async (t) => {
  const p = await abrir(t);
  const actividad = await casilla(p, "Actividad");
  assert.deepEqual([actividad.ve, actividad.origen, actividad.contorno], ["sin datos", "sin_datos", "ninguno"]);
  assert.equal(await p.getByRole("list", { name: "Actividad" }).locator("span[data-origen] b").count(), 0, "ningún número");
  await p.getByRole("button", { name: /^Actividad/ }).click();
  const hoja = p.getByRole("dialog", { name: "Puntaje de Actividad" });
  await hoja.waitFor();
  assert.equal((await hoja.locator("p").first().innerText()).trim(), "Sin lecturas de redes");
  assert.deepEqual(await opcionesDe(hoja), [["0", null, "false"], ["1", null, "false"], ["2", null, "false"]], "sin destello ni «Sin puntuar»");
  await hoja.getByRole("button", { name: /^0/ }).click();
  await hoja.waitFor({ state: "detached" });
  assert.deepEqual(await acciones(p), [["cambiarPuntaje", ID, "actividad", 0, "sangre-de-coyote"]], "un 0 fijado a mano sí es un 0");
});
