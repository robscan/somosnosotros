// Captura real (Chrome de la Mac vía playwright-core) y medición del DOM de una lista de pantallas.
// Uso: node auditar.mjs <base> <lista.json> <dirPng> <dirJson> [cookies.json] [dispositivos=movil,tableta,escritorio]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [, , base, listaRuta, dirPng, dirJson, cookieRuta, dispositivosArg] = process.argv;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pantallas = JSON.parse(fs.readFileSync(listaRuta, "utf8"));
fs.mkdirSync(dirPng, { recursive: true });
fs.mkdirSync(dirJson, { recursive: true });
const medir = fs.readFileSync(new URL("./medir.js", import.meta.url), "utf8");
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const UA_IPAD = "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const DISPOSITIVOS = {
  movil: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_IPHONE },
  tableta: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_IPAD },
  escritorio: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
const elegidos = (dispositivosArg || "movil,tableta,escritorio").split(",");

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
const resumen = [];
for (const p of pantallas) {
  for (const nombre of elegidos) {
    if (p.dispositivos && !p.dispositivos.includes(nombre)) continue;
    const disp = DISPOSITIVOS[nombre];
    const ctx = await browser.newContext({ ...disp, locale: "es-MX", timezoneId: "America/Mexico_City" });
    if (cookieRuta && cookieRuta !== "-") await ctx.addCookies(JSON.parse(fs.readFileSync(cookieRuta, "utf8")));
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
    page.on("console", (m) => m.type() === "error" && errores.push(m.text().slice(0, 200)));
    try {
      await page.goto(base + p.url, { waitUntil: "load", timeout: 90000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(p.espera ?? 2500);
      if (p.accion) {
        await page.evaluate(p.accion);
        await page.waitForTimeout(p.esperaTras ?? 1200);
      }
      const fuente = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family))]);
      const medios = await page.evaluate(() => ({ hover: matchMedia("(hover: hover)").matches, puntero: matchMedia("(pointer: coarse)").matches ? "coarse" : "fine" }));
      const nombrePng = `${p.id}-${nombre}.png`;
      await page.screenshot({ path: path.join(dirPng, nombrePng) });
      if (p.completa && nombre === "movil") await page.screenshot({ path: path.join(dirPng, `${p.id}-${nombre}-completa.png`), fullPage: true });
      const m = await page.evaluate(medir);
      const salida = { pantalla: p.id, dispositivo: nombre, fuente, medios, errores, ...m };
      fs.writeFileSync(path.join(dirJson, `${p.id}-${nombre}.json`), JSON.stringify(salida, null, 1));
      resumen.push({
        pantalla: p.id,
        disp: nombre,
        nodos: m.nodos,
        prof: m.profundidadMax,
        envolt: m.envoltorios.length,
        envSinEstilo: m.envoltorios.filter((e) => !e.conEstilo).length,
        desbordes: m.desbordes.length,
        fueraVentana: m.fueraVentana.length,
        negativos: m.negativos.length,
        apil: m.apilamiento.length,
        toquesChicos: m.toquesChicos.length,
        contenidoDesborda: m.contenidoDesborda.length,
        pegados: m.pegados.length,
        scrollH: m.scrollHorizontal,
        fuenteOk: fuente.some((f) => /Bricolage/i.test(f)),
        errores: errores.length,
      });
      console.log(`${p.id} ${nombre}: nodos ${m.nodos}, prof ${m.profundidadMax}, envoltorios ${m.envoltorios.length}, desbordes ${m.desbordes.length}, fuera ${m.fueraVentana.length}, fuente ${fuente.some((f) => /Bricolage/i.test(f)) ? "ok" : "NO"}, errores ${errores.length}`);
    } catch (e) {
      console.log(`${p.id} ${nombre}: ERROR ${String(e.message).slice(0, 200)}`);
      resumen.push({ pantalla: p.id, disp: nombre, error: String(e.message).slice(0, 200) });
    }
    await ctx.close();
  }
}
fs.writeFileSync(path.join(dirJson, "_resumen.json"), JSON.stringify(resumen, null, 1));
await browser.close();
console.table(resumen);
