// Prueba del comportamiento de la hoja con la rueda (como el founder en el Mac): abre a foto + KPI, crece hasta llenar, luego desplaza el contenido.
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 920 } });
const errores = []; page.on("pageerror", (e) => errores.push(e.message));
await page.goto(process.argv[2], { waitUntil: "load" }); await page.waitForTimeout(900);
const click = (sel) => page.evaluate((s) => document.querySelector(s).dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);
const estado = () => page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="lugares"]'); const c = p.querySelector(".hoja-lugares"); const cuerpo = c.querySelector(".cuerpo-hoja").getBoundingClientRect(); const k = c.querySelector(".ficha-hoja .kpis")?.getBoundingClientRect(); const nav = document.querySelector(".navegacion").getBoundingClientRect(); return { estado: p.dataset.hojaEstado, scroll: Math.round(c.scrollTop), cuerpoTop: Math.round(cuerpo.top), kpiBottom: k ? Math.round(k.bottom) : null, navTop: Math.round(nav.top), navOculta: document.getElementById("app").hasAttribute("data-nav-oculta"), compacta: c.querySelector(".ficha-hoja").hasAttribute("data-compacta"), ficha: !!p.dataset.ficha }; });
await click('.navegacion [data-ir="lugares"]'); await page.waitForTimeout(700);
console.log("lista asoma", JSON.stringify(await estado()));
await click('.lienzo .lugar.destacado'); await page.waitForTimeout(700);
console.log("ficha abierta (foto + KPI)", JSON.stringify(await estado()));
// rueda sobre el cuerpo de la hoja: primero crece
const cuerpo = await page.evaluate(() => { const b = document.querySelector(".cuerpo-hoja").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 100 }; });
await page.mouse.move(cuerpo.x, cuerpo.y);
await page.mouse.wheel(0, 200); await page.waitForTimeout(500);
console.log("tras rueda 200", JSON.stringify(await estado()));
await page.mouse.wheel(0, 600); await page.waitForTimeout(900);
console.log("tras rueda 800 (¿llena?)", JSON.stringify(await estado()));
await page.mouse.move(cuerpo.x, 400);
await page.mouse.wheel(0, 500); await page.waitForTimeout(900);
console.log("tras rueda en llena (desplaza contenido)", JSON.stringify(await estado()));
await page.mouse.wheel(0, -1400); await page.waitForTimeout(1200);
console.log("tras rueda arriba", JSON.stringify(await estado()));
await click('[data-cerrar-ficha]'); await page.waitForTimeout(700);
console.log("cerrada", JSON.stringify(await estado()));
console.log("errores", errores);
await browser.close();
