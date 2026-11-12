// Repro OL-517: la página de prueba de HojaLugares (la misma que su prueba de componente) y una traza por cuadro del gesto del founder.
// node traza.mjs <raiz-del-arbol> <salida.txt>
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const salida = process.argv[3];
const { build } = await import(pathToFileURL(join(root, "node_modules/esbuild/lib/main.js")).href);
const { chromium, webkit } = await import(pathToFileURL(join(root, "node_modules/playwright-core/index.mjs")).href);
const test = await readFile(join(root, "src/app/lugares/HojaLugares.componentes.test.mjs"), "utf8");
// El mismo contenido de la página de prueba.
const contents = test.match(/contents: `([\s\S]*?)`,\n    },/)[1];
const mocksSrc = test.match(/const mocks = (\{[\s\S]*?\n\});/)[1];
const mocks = eval("(" + mocksSrc.replace(/;$/, "") + ")");
const dir = await mkdtemp(join(tmpdir(), "ol517-"));
await build({
  absWorkingDir: root, bundle: true, outfile: join(dir, "app.js"),
  stdin: { resolveDir: root, loader: "tsx", contents },
  plugins: [{ name: "dobles", setup(b) {
    if (process.env.HOJA) b.onResolve({ filter: /(^|\/)HojaLugares$/ }, () => ({ path: process.env.HOJA }));
    b.onResolve({ filter: /.*/ }, (a) => (a.path in mocks ? { path: a.path, namespace: "mock" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js", resolveDir: root }));
  } }],
});
const assets = new Map([
  ["/", ["text/html", '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--fuente-bricolage:Arial}</style><div id="root"></div><script src="/app.js"></script>']],
  ["/app.js", ["text/javascript", await readFile(join(dir, "app.js"))]],
  ["/app.css", ["text/css", await readFile(join(dir, "app.css"))]],
]);
const server = createServer((req, res) => { const a = assets.get(req.url.split("?")[0]); res.writeHead(a ? 200 : 404, { "Content-Type": `${a?.[0] ?? "text/plain"}; charset=utf-8` }); res.end(a?.[1] ?? ""); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const lineas = [];
const log = (s) => { lineas.push(s); console.log(s); };

/** Instala la traza: por cuadro y por evento de desplazamiento, y, con un envoltorio del `scrollTop` de la hoja, cada escritura (de la hoja o de la inercia simulada). */
const instalar = (page) => page.evaluate(() => {
  const hoja = document.querySelector('[role="region"][aria-label="Lugares"]');
  const proto = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
  window.__t = { t0: performance.now(), filas: [], escrituras: 0, sim: false };
  Object.defineProperty(hoja, "scrollTop", { configurable: true, get() { return proto.get.call(this); }, set(v) {
    if (!window.__t.sim) { window.__t.escrituras++; window.__t.filas.push(["ESCRIBE", Math.round(performance.now() - window.__t.t0), Math.round(v)]); }
    proto.set.call(this, v);
  } });
  const fila = (que) => window.__t.filas.push([que, Math.round(performance.now() - window.__t.t0), Math.round(proto.get.call(hoja)), hoja.dataset.hoja, hoja.hasAttribute("data-libre") ? "libre" : "ancla"]);
  // En captura en el documento: antes de que la hoja (React) reaccione, o sea la posición que puso el navegador (la inercia), no la que escribe la hoja.
  document.addEventListener("scroll", (e) => { if (e.target === hoja) fila("scroll"); }, true);
  ["touchstart", "touchend"].forEach((e) => hoja.addEventListener(e, () => fila(e), { capture: true }));
  const paso = () => { fila("cuadro"); if (performance.now() - window.__t.t0 < 6000) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
});
const volcar = async (page, titulo) => {
  const t = await page.evaluate(() => window.__t);
  log(`\n## ${titulo}\nescrituras de scrollTop hechas por la hoja: ${t.escrituras}`);
  // Solo los cuadros con cambio, y todos los eventos.
  let prev = "";
  for (const f of t.filas) {
    const s = f.join("\t");
    const clave = f[0] === "cuadro" ? f.slice(2).join() : null;
    if (clave !== null && clave === prev) continue;
    if (clave !== null) prev = clave;
    log(s);
  }
  const final = await page.evaluate(() => { const h = document.querySelector('[role="region"][aria-label="Lugares"]'); return [Math.round(h.scrollTop), h.dataset.hoja, h.hasAttribute("data-libre")]; });
  log(`final: y=${final[0]} ${final[1]} ${final[2] ? "libre" : "ancla"}`);
  return { ...t, final };
};

async function abrir(tipo) {
  const browser = await (tipo === "webkit" ? webkit : chromium).launch({ headless: true, executablePath: tipo === "webkit" ? undefined : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: tipo !== "webkit" });
  const page = await context.newPage();
  page.on("pageerror", (e) => log("ERROR " + e.message));
  await page.goto(origin + "/?renglones=30", { waitUntil: "load" });
  await page.waitForSelector('[role="region"][aria-label="Lugares"][data-hoja]');
  await page.waitForTimeout(400);
  return { browser, page };
}

// 1) Chromium, toques reales por CDP (el navegador lleva la inercia): el gesto del founder, lista llena desplazada a la mitad, jalón hacia abajo.
{
  const { browser, page } = await abrir("chromium");
  const cdp = await page.context().newCDPSession(page);
  const gesto = async (titulo, desde, { y0, dy, ms, quieto = 0 }) => {
    await page.evaluate((y) => { const h = document.querySelector('[role="region"][aria-label="Lugares"]'); h.toggleAttribute("data-libre", true); h.scrollTop = y; }, desde);
    await page.waitForTimeout(700);
    await instalar(page);
    let hora = Date.now() / 1000;
    const toque = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, timestamp: hora, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y, id: 0 }] });
    await toque("touchStart", y0);
    const pasos = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= pasos; i++) { hora += 0.016; await toque("touchMove", y0 + (dy * i) / pasos); await page.waitForTimeout(16); }
    hora += quieto / 1000 + 0.016;
    if (quieto) await page.waitForTimeout(quieto);
    await toque("touchEnd", 0);
    await page.waitForTimeout(2500);
    return volcar(page, titulo);
  };
  await gesto("Chromium CDP · A · lista llena desplazada (1500), jalón fuerte hacia abajo y soltar con impulso (la inercia cruza llena)", 1500, { y0: 250, dy: 450, ms: 110 });
  if (process.env.CAPTURA) await page.screenshot({ path: process.env.CAPTURA });
  await gesto("Chromium CDP · B · lista llena desplazada (900), arrastre lento que pasa el principio de la lista con el dedo puesto, y soltar quieto", 900, { y0: 150, dy: 600, ms: 1400, quieto: 200 });
  // C: el otro camino, con el dedo puesto. Se imita lo que haría Safari si al volver el anclaje reanclara la hoja en llena (`resnap` al cambiar
  //    scroll-snap-type): cada vez que la hoja quita `data-libre` con el dedo puesto, el «navegador» la pone en llena. Se cuentan los cambios del anclaje.
  await page.evaluate(() => {
    const h = document.querySelector('[role="region"][aria-label="Lugares"]');
    window.__cambiosAncla = 0;
    new MutationObserver(() => {
      window.__cambiosAncla++;
      if (!h.hasAttribute("data-libre") && window.__dedo) { window.__t.sim = true; h.scrollTop = 660; window.__t.sim = false; }
    }).observe(h, { attributes: true, attributeFilter: ["data-libre"] });
    h.addEventListener("touchstart", () => (window.__dedo = true), { capture: true });
    h.addEventListener("touchend", () => (window.__dedo = false), { capture: true });
  });
  await gesto("Chromium CDP · C · como B, con un reanclaje imitado al volver el anclaje con el dedo puesto", 900, { y0: 150, dy: 600, ms: 1400, quieto: 200 });
  log(`cambios de data-libre durante el gesto C (incluye el que pone el arreglo previo del gesto): ${await page.evaluate(() => window.__cambiosAncla)}`);
  await browser.close();
}

// 2) Inercia simulada que NO se detiene al escribir scrollTop (lo que hace la inercia nativa de un desplazador en Safari de iPhone, según el
//    reporte): el dedo se suelta (touchstart/touchend reales a la hoja) y la «inercia» sigue bajando desde donde esté la hoja en cada cuadro.
for (const tipo of ["chromium", "webkit"]) {
  const { browser, page } = await abrir(tipo);
  await page.evaluate(() => { const h = document.querySelector('[role="region"][aria-label="Lugares"]'); h.toggleAttribute("data-libre", true); h.scrollTop = 1500; });
  await page.waitForTimeout(700);
  await instalar(page);
  await page.evaluate(async () => {
    const h = document.querySelector('[role="region"][aria-label="Lugares"]');
    const toque = (tipo) => h.dispatchEvent(new Event(tipo, { bubbles: true }));
    toque("touchstart");
    toque("touchend");
    // Inercia: velocidad inicial de 4 px/ms hacia abajo (la lista sube hacia su principio), freno exponencial; cada cuadro sigue desde donde esté.
    let v = -4.0;
    let t = performance.now();
    await new Promise((fin) => {
      const cuadro = (ahora) => {
        const dt = Math.min(32, ahora - t); t = ahora;
        window.__t.sim = true; h.scrollTop = h.scrollTop + v * dt; window.__t.sim = false;
        v *= Math.pow(0.998, dt);
        // Lo único que detiene la inercia nativa: que el desplazador deje de desplazar (overflow: hidden), como en Chrome y en Safari.
        if (getComputedStyle(h).overflowY === "hidden") v = 0;
        if (Math.abs(v) > 0.02) requestAnimationFrame(cuadro); else fin();
      };
      requestAnimationFrame(cuadro);
    });
  });
  await page.waitForTimeout(800);
  await volcar(page, `${tipo} · inercia simulada que no se detiene al escribir scrollTop (como la reporta el iPhone; solo la detiene overflow: hidden): de 1500 hacia abajo, cruza llena`);
  await browser.close();
}
await writeFile(salida, lineas.join("\n") + "\n");
server.close();
