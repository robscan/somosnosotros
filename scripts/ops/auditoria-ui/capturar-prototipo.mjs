// Capturas reales del prototipo (Chrome de la Mac): el aparato a 2× en teléfono/tableta, 1× en escritorio.
import { chromium } from "playwright-core";
import fs from "node:fs";
const [, , url, dir] = process.argv;
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
async function contexto(dpr, ancho, alto) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dpr, locale: "es-MX" });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return { ctx, page };
}
async function foto(page, nombre) {
  await page.waitForTimeout(700);
  await page.locator(".aparato").screenshot({ path: `${dir}/${nombre}.png` });
  console.log(nombre);
}
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

// Teléfono
let { ctx, page } = await contexto(2, 480, 920);
await foto(page, "proto-01-inicio-telefono");
await click(page, '.navegacion [data-ir="agenda"]');
await page.waitForTimeout(1200);
await foto(page, "proto-02-agenda-telefono");
await page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="agenda"]'); p.scrollTop = 260; setTimeout(() => (p.scrollTop = 560), 120); });
await page.waitForTimeout(600);
await foto(page, "proto-03-agenda-compacta-telefono");
await click(page, '.navegacion [data-ir="lugares"]');
await page.waitForTimeout(900);
await foto(page, "proto-04-lugares-mapa-telefono");
await click(page, '.segmento [data-vista="lista"]');
await foto(page, "proto-05-lugares-lista-telefono");
await click(page, '.navegacion [data-ir="artistas"]');
await page.waitForTimeout(1200);
await foto(page, "proto-06-artistas-telefono");
await click(page, '.navegacion [data-ir="inicio"]');
await page.waitForTimeout(700);
await click(page, '.pantalla[data-id="inicio"] .tarjeta');
await page.waitForTimeout(900);
await foto(page, "proto-07-ficha-evento-telefono");
await page.evaluate(() => (document.querySelector('.pantalla[data-id="evento"]').scrollTop = 560));
await foto(page, "proto-08-ficha-evento-abajo-telefono");
await click(page, '.pantalla[data-id="evento"] [data-atras]');
await page.waitForTimeout(800);
await click(page, '.navegacion [data-ir="lugares"]');
await page.waitForTimeout(800);
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(9) .frente');
await page.waitForTimeout(900);
await foto(page, "proto-09-ficha-lugar-telefono");
await click(page, '.pantalla[data-id="lugar"] [data-atras]');
await page.waitForTimeout(800);
await click(page, '.navegacion [data-ir="inicio"]');
await page.waitForTimeout(700);
await click(page, '.pantalla[data-id="inicio"] [data-hoja="publicar"]');
await foto(page, "proto-10-hoja-publicar-telefono");
await click(page, '.hoja-fondo[data-hoja="publicar"] [data-ir="alta"]');
await page.waitForTimeout(900);
await foto(page, "proto-11-alta-evento-telefono");
await click(page, '.pantalla[data-id="alta"] [data-atras]');
await page.waitForTimeout(800);
await click(page, '.pantalla[data-id="inicio"] .avatar');
await page.waitForTimeout(900);
await foto(page, "proto-12-ajustes-telefono");
await ctx.close();

// Tableta
({ ctx, page } = await contexto(1.5, 900, 1260));
await click(page, '.modos [data-modo="tableta"]');
await page.waitForTimeout(500);
await foto(page, "proto-13-inicio-tableta");
await click(page, '.navegacion [data-ir="lugares"]');
await page.waitForTimeout(900);
await foto(page, "proto-14-lugares-tableta");
await ctx.close();

// Escritorio
({ ctx, page } = await contexto(1, 1360, 880));
await click(page, '.modos [data-modo="escritorio"]');
await page.waitForTimeout(500);
await foto(page, "proto-15-inicio-escritorio");
await click(page, '.navegacion [data-ir="agenda"]');
await page.waitForTimeout(1200);
await foto(page, "proto-16-agenda-escritorio");
await click(page, '.navegacion [data-ir="lugares"]');
await page.waitForTimeout(900);
await foto(page, "proto-17-lugares-escritorio");
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(9) .frente');
await page.waitForTimeout(900);
await foto(page, "proto-18-ficha-lugar-escritorio");
await click(page, '.pantalla[data-id="lugar"] [data-atras]');
await page.waitForTimeout(800);
await click(page, '.navegacion [data-ir="inicio"]');
await page.waitForTimeout(700);
await click(page, '.pantalla[data-id="inicio"] .tarjeta');
await page.waitForTimeout(900);
await foto(page, "proto-19-ficha-evento-escritorio");
await click(page, '.pantalla[data-id="evento"] [data-atras]');
await page.waitForTimeout(800);
await click(page, '.navegacion .publicar');
await page.waitForTimeout(300);
await click(page, '.hoja-fondo[data-hoja="publicar"] [data-ir="alta"]');
await page.waitForTimeout(900);
await foto(page, "proto-20-alta-evento-escritorio");
await ctx.close();
await browser.close();
