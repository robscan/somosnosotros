// Capturas reales del prototipo v3 (Chrome de la Mac): teléfono a 2×, tableta a 1,5×, escritorio a 1×; 54 capturas y dos muestrarios de iconos.
// node capturar-prototipo.mjs http://127.0.0.1:8090/restructura-ui.html <carpeta>   (servir docs/rediseno/prototipos con python3 -m http.server 8090)
import { chromium } from "playwright-core";
import fs from "node:fs";
const [, , url, dir] = process.argv;
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const errores = [];
async function contexto(dpr, ancho, alto, modo) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dpr, locale: "es-MX" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 160)));
  page.on("response", (r) => { if (r.status() >= 400) errores.push(r.status() + " " + r.url()); });
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (modo) await page.evaluate((m) => document.querySelector(`.modos-estudio [data-modo="${m}"]`).click(), modo);
  await page.waitForTimeout(1000);
  return { ctx, page };
}
async function foto(page, nombre, espera = 700) {
  await page.waitForTimeout(espera);
  await page.locator(".aparato").screenshot({ path: `${dir}/${nombre}.png` });
  console.log(nombre);
}
const click = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error("no existe " + s); e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); }, sel);
const espera = (page, ms) => page.waitForTimeout(ms);
const variante = (page, v) => click(page, `.modos-estudio [data-titulo="${v}"]`);
// La hoja de Lugares: cada altura es una posición de desplazamiento del contenedor (el prototipo expone sus alturas en .hoja-lugares.detentes())
const hoja = (page, estado, mas = 0) => page.evaluate(([e, m]) => { const c = document.querySelector(".hoja-lugares"); c.scrollTop = c.detentes()[e] + m; c.dispatchEvent(new Event("scroll")); }, [estado, mas]);
const desplazar = (page, sel, y) => page.evaluate(([s, yy]) => { const p = document.querySelector(s); p.scrollTop = yy; p.dispatchEvent(new Event("scroll")); }, [sel, y]);

// Teléfono
let { ctx, page } = await contexto(2, 480, 920);
await foto(page, "v3-01-inicio-telefono", 1500);
await page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="inicio"]'); p.scrollTop = 300; p.dispatchEvent(new Event("scroll")); setTimeout(() => { p.scrollTop = 700; p.dispatchEvent(new Event("scroll")); }, 120); }); await espera(page, 700);
await foto(page, "v3-02-inicio-guardada-telefono");
await page.evaluate(() => { const p = document.querySelector('.pantalla[data-id="inicio"]'); p.scrollTop = 660; p.dispatchEvent(new Event("scroll")); setTimeout(() => { p.scrollTop = 640; p.dispatchEvent(new Event("scroll")); }, 400); }); await espera(page, 900);
await foto(page, "v3-03-inicio-vuelve-telefono");
await desplazar(page, '.pantalla[data-id="inicio"]', 0); await espera(page, 400);
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]');
await foto(page, "v3-04-cuando-telefono");
await click(page, '.hoja-fondo[data-hoja="cuando"] .chips .chip:nth-child(3)');
await click(page, '.hoja-fondo[data-hoja="cuando"] .pie-hoja [data-cerrar]');
await click(page, '.pantalla[data-id="inicio"] [data-hoja="ciudad"]');
await foto(page, "v3-05-ciudad-telefono");
await click(page, '.hoja-fondo[data-hoja="ciudad"] [data-cerrar]');
await click(page, '.pantalla[data-id="inicio"] [data-hoja="filtros-eventos"]');
await foto(page, "v3-06-filtros-telefono");
await click(page, '.hoja-fondo[data-hoja="filtros-eventos"] [data-cerrar]');
await foto(page, "v3-07-inicio-lista-fin-de-semana-telefono");
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]'); await click(page, '.hoja-fondo[data-hoja="cuando"] [data-limpiar]'); await click(page, '.hoja-fondo[data-hoja="cuando"] .cerrar');
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await foto(page, "v3-08-lugares-mapa-telefono");
await hoja(page, "media"); await espera(page, 700);
await foto(page, "v3-09-lugares-hoja-media-telefono");
await hoja(page, "asoma"); await espera(page, 700);
await click(page, '.lienzo .lugar.destacado'); await espera(page, 600);
await foto(page, "v3-10-lugares-pin-ficha-telefono");
await hoja(page, "llena"); await espera(page, 700);
await foto(page, "v3-11-lugares-ficha-llena-telefono");
await hoja(page, "llena", 420); await espera(page, 700);
await foto(page, "v3-12-lugares-ficha-desplazada-telefono");
await click(page, '[data-cerrar-ficha]'); await espera(page, 500);
await foto(page, "v3-13-lugares-cerrada-telefono");
await click(page, '.navegacion [data-ir="artistas"]'); await espera(page, 1200);
await foto(page, "v3-14-artistas-telefono");
await click(page, '.navegacion [data-ir="perfil"]'); await espera(page, 600);
await foto(page, "v3-15-perfil-telefono");
await click(page, '.navegacion [data-ir="inicio"]'); await espera(page, 600);
await click(page, '.pantalla[data-id="inicio"] .carril .tarjeta'); await espera(page, 900);
await foto(page, "v3-16-ficha-evento-telefono");
await desplazar(page, '.pantalla[data-id="evento"]', 380); await espera(page, 400);
await foto(page, "v3-17-ficha-evento-desplazada-telefono");
await desplazar(page, '.pantalla[data-id="evento"]', 760); await espera(page, 300);
await foto(page, "v3-18-ficha-evento-abajo-telefono");
await desplazar(page, '.pantalla[data-id="evento"]', 0); await espera(page, 300);
await click(page, '.pantalla[data-id="evento"] .portada'); await espera(page, 400);
await foto(page, "v3-19-visor-telefono");
await click(page, '.visor');
await click(page, '.pantalla[data-id="evento"] .con .renglon'); await espera(page, 900);
await foto(page, "v3-20-ficha-artista-telefono");
await click(page, '.pantalla[data-id="artista"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] .tarjeta-dato .renglon'); await espera(page, 900);
await foto(page, "v3-21-ficha-lugar-completa-telefono");
await click(page, '.pantalla[data-id="lugar"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 600);
await click(page, '.barra [data-publicar]'); await espera(page, 900);
await foto(page, "v3-22-alta-lugar-telefono");
await click(page, '.pantalla[data-id="alta"] [data-atras]'); await espera(page, 800);
await click(page, '.barra [data-ir="buscar"]'); await espera(page, 900);
await foto(page, "v3-23-buscar-telefono");
// Muestrario de iconos para seguir un lugar: el mismo renglón con campana+, marcador+ y pin+
await click(page, '.pantalla[data-id="buscar"] [data-atras]'); await espera(page, 600);
await page.evaluate(() => {
  const p = document.querySelector('.pantalla[data-id="lugares"]'); const c = p.querySelector(".hoja-lugares"); c.scrollTop = c.detentes().media;
  const lista = p.querySelector(".lista.panel"); const base = lista.children[1];
  lista.innerHTML = "";
  for (const [g, t] of [["campana-mas", "Campana con «+»: seguir = que te avisen (propuesta)"], ["marcador-mas", "Marcador con «+»: guardar (Google Maps, Instagram)"], ["pin-mas", "Pin con «+»: hoy significa «registrar un lugar» en la app"]]) {
    const li = base.cloneNode(true); li.querySelector("b").textContent = t; li.querySelector(".frente > small").textContent = "Museo del Ferrocarril · 1,4 km"; li.querySelector("small.segundo")?.remove();
    li.querySelector("[data-accion] use").setAttribute("href", "#i-" + g); lista.append(li);
  }
});
await espera(page, 500);
await page.locator('.pantalla[data-id="lugares"] .cuerpo-hoja').screenshot({ path: `${dir}/v3-24-iconos-seguir-lugar.png` }); console.log("v3-24-iconos-seguir-lugar");
await ctx.close();

// Tableta
({ ctx, page } = await contexto(1.5, 900, 1260, "tableta"));
await foto(page, "v3-25-inicio-tableta", 1200);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(3) .frente'); await espera(page, 700);
await foto(page, "v3-26-lugares-ficha-tableta");
await ctx.close();

// Escritorio
({ ctx, page } = await contexto(1, 1360, 880, "escritorio"));
await foto(page, "v3-27-inicio-escritorio", 1200);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 900);
await foto(page, "v3-28-lugares-escritorio");
await click(page, '.pantalla[data-id="lugares"] .lista.panel .renglon:nth-child(3) .frente'); await espera(page, 700);
await foto(page, "v3-29-lugares-ficha-escritorio");
await desplazar(page, '.hoja-lugares', 400); await espera(page, 300);
await foto(page, "v3-30-lugares-ficha-desplazada-escritorio");
await click(page, '[data-cerrar-ficha]'); await espera(page, 400);
await click(page, '.navegacion [data-ir="inicio"]'); await espera(page, 600);
await click(page, '.pantalla[data-id="inicio"] .carril .tarjeta'); await espera(page, 900);
await foto(page, "v3-31-ficha-evento-escritorio");
await click(page, '.pantalla[data-id="evento"] .tarjeta-dato .renglon'); await espera(page, 900);
await foto(page, "v3-32-ficha-lugar-escritorio");
await click(page, '.pantalla[data-id="lugar"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] .con .renglon'); await espera(page, 900);
await foto(page, "v3-33-ficha-artista-escritorio");
await click(page, '.pantalla[data-id="artista"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await click(page, '.barra [data-publicar]'); await espera(page, 900);
await foto(page, "v3-34-alta-evento-escritorio");
await click(page, '.pantalla[data-id="alta"] [data-atras]'); await espera(page, 600);
await click(page, '.navegacion [data-ir="perfil"]'); await espera(page, 600);
await foto(page, "v3-35-perfil-escritorio");
await ctx.close();

// Sexta vuelta: tres letras para listas y tarjetas, acciones flotantes de la ficha con sus estados
({ ctx, page } = await contexto(2, 480, 920));
await page.waitForTimeout(900);
await click(page, '.pantalla[data-id="inicio"] .titulo-seccion[data-lista]'); await espera(page, 300);
await desplazar(page, '.pantalla[data-id="inicio"]', 300); await espera(page, 500);
for (const l of ["bricolage", "bricolage-ancha", "inter"]) { await click(page, `.modos-estudio [data-letra="${l}"]`); await espera(page, 500); await foto(page, `v3-${l === "bricolage" ? "36" : l === "bricolage-ancha" ? "37" : "38"}-letra-${l}-telefono`); }
await click(page, '.modos-estudio [data-letra="bricolage"]');
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]'); await click(page, '.hoja-fondo[data-hoja="cuando"] [data-limpiar]'); await click(page, '.hoja-fondo[data-hoja="cuando"] .cerrar');
await desplazar(page, '.pantalla[data-id="inicio"]', 0); await espera(page, 400);
await click(page, '.pantalla[data-id="inicio"] .carril .tarjeta'); await espera(page, 900);
await click(page, '.pantalla[data-id="evento"] [data-accion-ficha="voy"]'); await espera(page, 300);
await foto(page, "v3-39-ficha-evento-voy-telefono");
await click(page, '.pantalla[data-id="evento"] [data-accion-ficha="interesa"]'); await espera(page, 300);
await foto(page, "v3-40-ficha-evento-te-interesa-telefono");
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await click(page, '.navegacion [data-ir="lugares"]'); await espera(page, 600);
await click(page, '.lienzo .lugar.destacado'); await espera(page, 500);
await hoja(page, "llena"); await espera(page, 700);
await click(page, '.ficha-hoja [data-accion-ficha="seguir"]'); await espera(page, 300);
await foto(page, "v3-41-lugares-ficha-sigues-telefono");
await click(page, '[data-atras-hoja]'); await espera(page, 900);
await hoja(page, "recogida"); await espera(page, 800);
await foto(page, "v3-42-lugares-ficha-recogida-telefono");
await click(page, '[data-cerrar-ficha]'); await espera(page, 600);
await hoja(page, "recogida"); await espera(page, 800);
await foto(page, "v3-43-lugares-recogida-telefono");
await ctx.close();

// Séptima vuelta (hilos del prototipo): Elegir fecha (un día y un rango), Otra ciudad, ficha de artista con novedades, muestrario del icono de Artistas
({ ctx, page } = await contexto(2, 480, 920));
await page.waitForTimeout(900);
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]');
await click(page, '.hoja-fondo[data-hoja="cuando"] .chip[data-elegir]'); await espera(page, 200);
await foto(page, "v3-44-cuando-calendario-telefono");
await click(page, '.hoja-fondo[data-hoja="cuando"] .dia[data-fecha="2026-09-30"]'); await espera(page, 200);
await foto(page, "v3-45-cuando-un-dia-telefono");
await click(page, '.hoja-fondo[data-hoja="cuando"] .pie-hoja [data-cerrar]'); await espera(page, 400);
await foto(page, "v3-46-inicio-lista-un-dia-telefono");
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]');
await click(page, '.hoja-fondo[data-hoja="cuando"] .dia[data-fecha="2026-10-03"]'); await espera(page, 200);
await foto(page, "v3-47-cuando-rango-telefono");
await click(page, '.hoja-fondo[data-hoja="cuando"] .pie-hoja [data-cerrar]'); await espera(page, 400);
await foto(page, "v3-48-inicio-lista-rango-telefono");
await click(page, '.pantalla[data-id="inicio"] [data-hoja="cuando"]'); await click(page, '.hoja-fondo[data-hoja="cuando"] [data-limpiar]'); await click(page, '.hoja-fondo[data-hoja="cuando"] .cerrar'); await espera(page, 300);
await click(page, '.pantalla[data-id="inicio"] [data-hoja="ciudad"]');
await click(page, '.hoja-fondo[data-hoja="ciudad"] [data-ciudad="Otra ciudad"]'); await espera(page, 200);
await foto(page, "v3-49-ciudad-otra-telefono");
await page.evaluate(() => { const i = document.querySelector('.hoja-fondo[data-hoja="ciudad"] input'); i.value = "Que"; i.dispatchEvent(new Event("input", { bubbles: true })); }); await espera(page, 200);
await foto(page, "v3-50-ciudad-otra-escribiendo-telefono");
await click(page, '.hoja-fondo[data-hoja="ciudad"] .sugerencias [data-ciudad="Querétaro"]');
await foto(page, "v3-51-inicio-cargando-queretaro-telefono", 120);
await foto(page, "v3-52-inicio-queretaro-telefono", 900);
await click(page, '.pantalla[data-id="inicio"] .carril .tarjeta'); await espera(page, 900);
await click(page, '.pantalla[data-id="evento"] .con .renglon'); await espera(page, 900);
await desplazar(page, '.pantalla[data-id="artista"]', 560); await espera(page, 400);
await foto(page, "v3-53-ficha-artista-novedades-telefono");
// Muestrario del icono de Artistas: la estrella que se queda (activa) junto a los candidatos que el founder rechazó (pincel, pincel lleno, chispa)
await page.evaluate(() => {
  const nav = document.querySelector(".navegacion");
  const etiquetas = [["estrella", "Estrella (se queda)"], ["artista", "Pincel (rechazado)"], ["artista-lleno", "Pincel lleno"], ["artista-chispa", "Chispa"]];
  [...nav.children].forEach((d, i) => { const [g, t] = etiquetas[i]; d.removeAttribute("aria-current"); if (i === 0) d.setAttribute("aria-current", "page"); d.querySelector(".pildora").innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-${g}"/></svg>`; d.lastElementChild.textContent = t; });
});
await click(page, '.pantalla[data-id="artista"] [data-atras]'); await espera(page, 800);
await click(page, '.pantalla[data-id="evento"] [data-atras]'); await espera(page, 800);
await page.locator(".navegacion").screenshot({ path: `${dir}/v3-54-iconos-artistas.png` }); console.log("v3-54-iconos-artistas");
await ctx.close();
await browser.close();
console.log("errores de página:", errores.length, errores.slice(0, 5));
