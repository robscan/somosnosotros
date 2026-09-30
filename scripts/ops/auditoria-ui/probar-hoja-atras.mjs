// Atrás en la hoja llena y jalar hacia abajo (rueda en reposo): ficha → lista; lista → recogida; asa → asoma.
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1300 } });
const errores = []; page.on("pageerror", (e) => errores.push(e.message));
await page.goto(process.argv[2], { waitUntil: "load" }); await page.waitForTimeout(900);
const click = (sel) => page.evaluate((s) => document.querySelector(s).dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);
const estado = () => page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="lugares"]'); const c = p.querySelector(".hoja-lugares"); const cu = c.querySelector(".cuerpo-hoja").getBoundingClientRect(); const nav = document.querySelector(".navegacion").getBoundingClientRect(); const vis = (s) => { const e = c.querySelector(s); return e && getComputedStyle(e).display !== "none"; }; return { estado: p.dataset.hojaEstado, scroll: Math.round(c.scrollTop), peek: Math.round(nav.top - cu.top), ficha: !!p.dataset.ficha, atras: vis("[data-atras-hoja]"), cerrar: vis("[data-cerrar-ficha]") }; });
await click('.navegacion [data-ir="lugares"]'); await page.waitForTimeout(700);
const cuerpo = await page.evaluate(() => { const b = document.querySelector(".cuerpo-hoja").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 40 }; });
await page.mouse.move(cuerpo.x, cuerpo.y);
console.log("lista asoma", JSON.stringify(await estado()));
await page.mouse.wheel(0, -70); await page.mouse.wheel(0, -70); await page.waitForTimeout(400);
console.log("rueda arriba en asoma → recogida", JSON.stringify(await estado()));
await click('.cuerpo-hoja > .asa'); await page.waitForTimeout(500);
console.log("asa → asoma", JSON.stringify(await estado()));
await click('.lienzo .lugar.destacado'); await page.waitForTimeout(700);
console.log("ficha abierta", JSON.stringify(await estado()));
{ const b = await page.evaluate(() => { const r = document.querySelector(".cuerpo-hoja").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 100 }; }); await page.mouse.move(b.x, b.y); }
await page.mouse.wheel(0, 900); await page.waitForTimeout(900);
console.log("llena: ¿Atrás visible?", JSON.stringify(await estado()));
await click('[data-atras-hoja]'); await page.waitForTimeout(900);
console.log("Atrás → foto + KPI", JSON.stringify(await estado()));
{ const b = await page.evaluate(() => { const r = document.querySelector(".cuerpo-hoja").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 100 }; }); await page.mouse.move(b.x, b.y); }
await page.mouse.wheel(0, -70); await page.mouse.wheel(0, -70); await page.waitForTimeout(500);
console.log("rueda arriba en foto + KPI → lista", JSON.stringify(await estado()));
console.log("errores", errores);
await browser.close();
