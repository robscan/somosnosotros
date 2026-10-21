/**
 * La ficha de showcase (OL-426, lo firmado en OL-425): cambiar el estado en su hoja, el puntaje de una señal (0, 1, 2 o sin puntuar), añadir una
 * evidencia (el botón dice qué falta; un enlace que no es http(s) se rechaza sin llamar a la acción; uno bueno sí), aceptar y deshacer una propuesta,
 * y las notas privadas (se guardan al salir del campo; la ✕ las vacía). OL-430: «Investigar» (la hoja con el tope y su ✕; con una en curso, solo
 * la dice y el renglón lleva su barra). Los componentes de verdad con las acciones del servidor de prueba: apuntan lo que reciben en
 * `window.qa.acciones`.
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
      import PorRevisar from './PorRevisar';
      import RedesFicha from './RedesFicha';
      import NotasFicha from './NotasFicha';
      import InvestigarFicha from './InvestigarFicha';
      import plantilla from '../../../../components/ui/Plantilla.module.css';
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
      const obra = { clave: 'obra', titulo: 'Obra y reconocimiento', resumen: '1 evidencia aceptada: obra', puntaje: 1,
        niveles: ['Nada verificable', 'Obra publicada o expuesta en los últimos 24 meses', 'Además, beca, premio, residencia o selección oficial'],
        evidencias: [{ id: 'e1', senal: 'obra', tipo: 'obra', titulo: 'Sencillo en plataformas', url: 'https://musica.example/s', fecha: null, fuente: 'musica.example', leida_por: 'persona', estado: 'aceptada', creado_en: '2026-10-10T00:00:00Z', detalle: 'Obra · musica.example · aceptada, la leyó una persona' }] };
      const enCurso = new URLSearchParams(location.search).has('encurso');
      const propuestas = [{ id: '22222222-2222-4222-8222-222222222222', senal: 'obra', tipo: 'premio', titulo: 'Mención estatal', url: 'https://cultura.example/p', fecha: '2025-11-20', fuente: null, leida_por: 'rutina', estado: 'propuesta', creado_en: '2026-10-20T00:00:00Z', detalle: '20 nov 2025 · leída por la rutina hoy', dominio: 'cultura.example' }];
      createRoot(document.getElementById('root')).render(
        <main id="ficha" className={plantilla.paginaContenido}>
          <EstadoFicha artistaId={ID} slug="sangre-de-coyote" nombre="Sangre de Coyote" estado="invitado" titulo="Invitado" detalle="Por ti el 18 oct · antes, revisado el 15 oct" opciones={opciones} />
          <SenalFicha artistaId={ID} slug="sangre-de-coyote" senal={obra} />
          <InvestigarFicha artistaId={ID} slug="sangre-de-coyote" nombre="Sangre de Coyote" ciudad="San Luis Potosí" enCurso={enCurso} avance={enCurso ? 0.5 : null}
            texto={enCurso ? 'Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD' : 'Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD'} credito="Crédito: 187,40 USD · vence el 11 de noviembre" />
          <PorRevisar propuestas={propuestas} slug="sangre-de-coyote" />
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

test("por revisar: aceptar deja la línea de lo hecho con «Deshacer», que la vuelve a propuesta", async (t) => {
  const p = await abrir(t);
  assert.ok((await p.getByRole("heading", { name: /Por revisar/ }).innerText()).includes("1"));
  await p.getByRole("button", { name: "Aceptar" }).click();
  await p.getByText("Aceptaste").waitFor();
  await p.getByRole("button", { name: "Deshacer" }).click();
  await p.getByRole("button", { name: "Aceptar" }).waitFor();
  assert.deepEqual(await acciones(p), [
    ["decidirEvidencia", "22222222-2222-4222-8222-222222222222", "aceptada", "sangre-de-coyote"],
    ["decidirEvidencia", "22222222-2222-4222-8222-222222222222", "propuesta", "sangre-de-coyote"],
  ]);
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
