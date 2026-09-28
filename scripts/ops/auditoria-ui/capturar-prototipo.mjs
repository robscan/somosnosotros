// Capturas reales del prototipo (Chrome de la Mac): teléfono a 2×, tableta a 1,5×, escritorio a 1×.
// node capturar-prototipo.mjs http://127.0.0.1:8090/restructura-ui.html <carpeta>   (servir docs/rediseno/prototipos con python3 -m http.server 8090)
import { chromium } from "playwright-core";
import fs from "node:fs";
const [, , url, dir] = process.argv;
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const errores = [];
async function contexto(dpr, ancho, alto) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dpr, locale: "es-MX" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 120)));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  return { ctx, page };
}
async function foto(page, nombre, espera = 700) {
  await page.waitForTimeout(espera);
  await page.locator(".aparato").screenshot({ path: `${dir}/${nombre}.png` });
  console.log(nombre);
}
const click = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error("no existe " + s); e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); }, sel);
const espera = (page, ms) => page.waitForTimeout(ms);

// Teléfono
let { ctx, page } = await contexto(2, 480, 920);
await foto(page, "v2-01-inicio-telefono", 1500);
await click(page, '.navegacion [data-ir="agenda"]'); await espera(page, 1200);
await foto(page, "v2-02-agenda-telefono");
await page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="agenda"]'); p.scrollTop = 260; setTimeout(() => (p.scrollTop = 560), 120); }); await espera(page, 700);
await foto(page, "v2-03-agenda-compacta-telefono");
await click(page, '.pantalla[data-id="agenda"] [data-hoja="filtros-agenda"]');
await foto(page, "v2-04-filtros-telefono");
await click(page, '.hoja-fondo[data-hoja="filtros-agenda"] [data-cerrar]');
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await foto(page, "v2-05-lugares-mapa-telefono");
await page.evaluate(() => (document.querySelector('.pantalla[data-id="lugares"]').dataset.hojaEstado = "media")); await espera(page, 500);
await foto(page, "v2-06-lugares-hoja-media-telefono");
await page.evaluate(() => (document.querySelector('.pantalla[data-id="lugares"]').dataset.hojaEstado = "asoma"));
await click(page, '.lienzo .lugar.destacado'); await espera(page, 500);
await foto(page, "v2-07-lugares-pin-telefono");
await click(page, '[data-volver-lista]');
await click(page, '.navegacion [data-ir="artistas"]'); await espera(page, 1200);
await foto(page, "v2-08-artistas-telefono");
await click(page, '.navegacion [data-ir="perfil"]'); await espera(page, 600);
await foto(page, "v2-09-perfil-telefono");
await click(page, '.navegacion [data-ir="inicio"]'); await espera(page, 600);
await click(page, '.pantalla[data-id="inicio"] .tarjeta'); await espera(page, 900);
await foto(page, "v2-10-ficha-evento-telefono");
await page.evaluate(() => (document.querySelector('.pantalla[data-id="evento"]').scrollTop = 600));
await foto(page, "v2-11-ficha-evento-abajo-telefono");
await click(page, '.pantalla[data-id="evento"] .con .renglon'); await espera(page, 900);
await foto(page, "v2-12-ficha-artista-telefono");
await click(page, '.pantalla[data-id="artista"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 600);
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(3) .frente'); await espera(page, 900);
await foto(page, "v2-13-ficha-lugar-telefono");
await click(page, '.pantalla[data-id="lugar"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="lugares"] [data-publicar]'); await espera(page, 900);
await foto(page, "v2-14-alta-lugar-telefono");
await click(page, '.modos [data-tipo="evento"]'); await espera(page, 300);
await foto(page, "v2-15-alta-evento-telefono");
await click(page, '.pantalla[data-id="alta"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="lugares"] [data-ir="buscar"]'); await espera(page, 900);
await foto(page, "v2-16-buscar-telefono");
await ctx.close();

// Tableta
({ ctx, page } = await contexto(1.5, 900, 1260));
await click(page, '.modos-estudio [data-modo="tableta"]'); await espera(page, 600);
await foto(page, "v2-17-inicio-tableta", 1200);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await foto(page, "v2-18-lugares-tableta");
await ctx.close();

// Escritorio
({ ctx, page } = await contexto(1, 1360, 880));
await click(page, '.modos-estudio [data-modo="escritorio"]'); await espera(page, 600);
await foto(page, "v2-19-inicio-escritorio", 1200);
await click(page, '.navegacion [data-ir="agenda"]'); await espera(page, 1200);
await foto(page, "v2-20-agenda-escritorio");
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await foto(page, "v2-21-lugares-escritorio");
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(3) .frente'); await espera(page, 900);
await foto(page, "v2-22-ficha-lugar-escritorio");
await click(page, '.pantalla[data-id="lugar"] [data-atras]'); await espera(page, 800);
await click(page, '.navegacion [data-ir="inicio"]'); await espera(page, 600);
await click(page, '.pantalla[data-id="inicio"] .tarjeta'); await espera(page, 900);
await foto(page, "v2-23-ficha-evento-escritorio");
await click(page, '.pantalla[data-id="evento"] .con .renglon'); await espera(page, 900);
await foto(page, "v2-24-ficha-artista-escritorio");
await click(page, '.pantalla[data-id="artista"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await click(page, '.navegacion .publicar'); await espera(page, 900);
await foto(page, "v2-25-alta-evento-escritorio");
await ctx.close();
await browser.close();
console.log("errores de página:", errores.length, errores.slice(0, 3));
