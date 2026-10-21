// Capturas de la bitácora 459 (OL-426): Administración › Showcase (candidatos, búsqueda, hojas, ficha, rúbrica, evidencias, redes, notas, la ⓘ y
// la tabla a 1280) con la app compilada contra el respaldo local y la sesión de la cuenta de administración del respaldo. Chrome real
// (playwright-core, channel: 'chrome'), 390×844 a 2×; la tabla, 1280×800 a 1×. Toques reales: clics por coordenadas (Playwright) y teclado.
// node scripts/ops/auditoria-ui/capturar-showcase.mjs <raíz del árbol> <carpeta de salida>
// Compila `.next` contra el respaldo (SIN_BUILD=1 usa el `.next` que ya hay, compilado por este script: el respaldo va en el puerto 8859). Correrlo en un árbol SIN `.env` (con él se niega a correr).
// La portada de Administración lee `panel_resumen` y compañía, que el respaldo de `main` no contesta (bitácora 458): aquí se le ponen, con números
// inventados, desde un arranque propio del respaldo en la carpeta temporal (el fixture no cambia).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [RAIZ, SALIDA] = process.argv.slice(2).map((p) => path.resolve(p));
if (fs.existsSync(path.join(RAIZ, ".env"))) { console.error("hay un .env en el árbol: la app cargaría llaves reales. Córrelo en un árbol sin .env"); process.exit(1); }
const { chromium } = await import(path.join(RAIZ, "node_modules/playwright-core/index.mjs"));
const { ADMIN, cookieDe } = await import(path.join(RAIZ, "scripts/ops/auditoria-ui/respaldo-local/fixture.mjs"));
const NEXT = path.join(RAIZ, "node_modules/next/dist/bin/next");
const AQUI = path.join(RAIZ, "scripts/ops/auditoria-ui");
const AHORA = "2026-10-20T16:00:00Z"; // martes 20 de octubre, 10:00 en San Luis Potosí
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(SALIDA, { recursive: true });

// El respaldo con la portada de Administración: importa el fixture, le añade los contratos del panel y arranca el servidor de siempre.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "showcase-respaldo-"));
const arranque = path.join(tmp, "respaldo.mjs");
const fixture = pathToFileURL(path.join(AQUI, "respaldo-local/fixture.mjs")).href;
const servidor = pathToFileURL(path.join(AQUI, "respaldo-local/server.mjs")).href;
fs.writeFileSync(
  arranque,
  `import { rpcs } from ${JSON.stringify(fixture)};
const dia = (n) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date(Date.now() - n * 86400e3));
const hace = (n) => new Date(Date.now() - n * 86400e3).toISOString();
Object.assign(rpcs, {
  panel_resumen: () => ({
    ahora: { activas: 23, cuentas: 80, coincidencias: 4, eventos_semana: 37, lugares_con_fecha: 18, lugares: 71, comunidad: 52, proximos: 96, comunidad_nuevos: 3,
      desglose: { abrieron: 21, voy: 12, siguieron: 7, publicaron: 5, nuevas: 3, con_2: 2, con_3_a_5: 2, con_6_o_mas: 0, mayor: null, personas_que_publican: 9 } },
    historia: [28, 21, 14, 7].map((n, i) => ({ dia: dia(n), activas: 15 + i * 2, coincidencias: 1 + i, eventos_semana: 29 + i * 2, comunidad: 41 + i * 3 })),
    gestionar: { personas: 80, personas_nuevas: 3, nunca_entraron: 6, correo_con_problema: 1, lugares: 71, lugares_sin_fecha: 53, lugares_ocultos: 2, lugares_privados: 1, eventos: 383, eventos_sin_imagen: 41, artistas: 686, artistas_ocultos: 4, artistas_llevados: 19, invitaciones: 0 },
  }),
  panel_pendientes: () => [],
  panel_comunidad: () => ({ registradas: 14, hicieron_algo: 9, vuelven_base: 11, vuelven: 5 }),
  panel_aportes: () => ({ gestos_ahora: 18, gestos_antes: 13, voy: 11, me_interesa: 7, personas: 12, primeras_ahora: 2, primeras_antes: 1, han_publicado: 21 }),
  panel_fichas: () => ({ artistas: 19, lugares: 8, vias: { solicitud: 11, alta: 9, correo: 6, otra: 1 }, serie: [12, 13, 14, 15, 16, 18, 19, 21, 22, 24, 26, 27], artistas_por_reclamar: 667, artistas_visibles: 682, artistas_con_foto: 214 }),
  panel_capo: () => ({ invitados: 120, ya_vinculados_al_invitar: 4, elegibles: 116, solicitaron_despues: 7, vinculados_despues: 5, primer_envio: hace(20), ultimo_envio: hace(1), corte: hace(0) }),
});
await import(${JSON.stringify(servidor)});
`,
);

const hijos = [];
process.on("exit", () => {
  hijos.forEach((h) => h.exitCode === null && h.kill());
  fs.rmSync(tmp, { recursive: true, force: true });
});
const lanzar = (args, env) => {
  const h = spawn(process.execPath, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let salida = "";
  h.stdout.on("data", (d) => (salida += d));
  h.stderr.on("data", (d) => (salida += d));
  h.registro = () => salida.slice(-3000);
  hijos.push(h);
  return h;
};
const puertoLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperar(url, h) {
  for (let i = 0; i < 300; i++) {
    if (h.exitCode !== null) throw new Error(`se cerró\n${h.registro()}`);
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`no respondió: ${url}\n${h.registro()}`);
}

// El respaldo en un puerto fijo: su dirección queda dentro de la app compilada (NEXT_PUBLIC_…), así SIN_BUILD=1 sirve con el `.next` de la vez anterior.
const [pr, pa] = [Number(process.env.PUERTO_RESPALDO ?? 8859), await puertoLibre()];
const respaldo = `http://127.0.0.1:${pr}`;
const base = `http://127.0.0.1:${pa}`;
const reloj = { RELOJ_FIJO: AHORA, TZ: "America/Mexico_City", NODE_OPTIONS: `--require=${path.join(AQUI, "reloj-fijo.cjs")}` };
const app = { NEXT_PUBLIC_SUPABASE_URL: respaldo, NEXT_PUBLIC_SUPABASE_ANON_KEY: "llave-anon-inventada", NEXT_PUBLIC_MAPBOX_TOKEN: "pk.inventado", SUPABASE_SERVICE_ROLE_KEY: "llave-servicio-inventada" };
const r = lanzar([arranque, String(pr)], reloj);
await esperar(`${respaldo}/rest/v1/eventos?select=id&limit=1`, r);
if (!process.env.SIN_BUILD) {
  process.stdout.write("compilando… ");
  const b = spawnSync(process.execPath, [NEXT, "build"], { cwd: RAIZ, env: { ...process.env, ...app }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (b.status !== 0) throw new Error((b.stdout + b.stderr).slice(-3000));
  console.log("listo");
}
const s = lanzar([NEXT, "start", "-p", String(pa)], { ...app, ...reloj });
await esperar(`${base}/entrar`, s);

const IMAGEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b9b4a8"/></svg>';
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const errores = [];

async function contexto({ escritorio = false } = {}) {
  const ctx = await browser.newContext(
    escritorio
      ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City" }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: "es-MX", timezoneId: "America/Mexico_City" },
  );
  await ctx.clock.setFixedTime(new Date(AHORA));
  await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieDe(ADMIN), url: base }]);
  await ctx.route("**/_vercel/**", (q) => q.fulfill({ contentType: "text/javascript", body: "" }));
  await ctx.route((u) => u.hostname !== "127.0.0.1", (q) => (q.request().resourceType() === "image" ? q.fulfill({ contentType: "image/svg+xml", body: IMAGEN }) : q.abort()));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));
  return { ctx, page };
}
const quieto = async (page, ms = 700) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const foto = async (page, nombre) => {
  await quieto(page);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
  console.log("  ", nombre);
};
/** Lo que mide la pantalla para la bitácora: si hay desplazamiento a lo ancho y cuántos nodos tiene el `<main>`. */
const medir = (page) => page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, nodos: document.querySelector("main").querySelectorAll("*").length }));
/** Lleva un elemento a la parte de arriba de lo que se ve, bajo la barra. */
const subir = (loc) => loc.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70));

try {
  // 00 · La portada de Administración con el grupo «Showcase» al nivel de Grafo cultural.
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin`, { waitUntil: "load" });
    const grupo = page.getByRole("heading", { name: "Showcase" });
    await grupo.waitFor();
    await subir(page.getByRole("heading", { name: "Obras colectivas" }));
    await foto(page, "00-portada-grupo-showcase");
    await ctx.close();
  }
  // 01 a 03 · Candidatos: la lista; buscando «fel» con su ✕; la hoja «Ordenar por».
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Showcase" }).waitFor();
    await foto(page, "01-candidatos");
    console.log("    ", JSON.stringify(await medir(page)));
    await page.getByRole("searchbox", { name: "Buscar artista del showcase" }).click();
    await page.keyboard.type("fel", { delay: 60 });
    await page.waitForURL(/q=fel/);
    await page.getByText(/^1 de \d+ candidatos?$/).waitFor();
    await page.locator("body").click({ position: { x: 5, y: 300 } }); // suelta el teclado
    await foto(page, "02-candidatos-buscando");
    await page.getByRole("button", { name: "Borrar la búsqueda" }).click();
    await page.waitForURL((u) => !u.search.includes("q="));
    await page.getByRole("button", { name: /^Orden: Puntaje/ }).click();
    await page.getByRole("dialog").waitFor();
    await foto(page, "03-hoja-orden");
    await page.getByRole("button", { name: /^Nombre/ }).click();
    await page.waitForURL(/orden=nombre/);
    console.log("     orden por nombre:", (await page.locator("main ul[aria-label=Candidatos] > li > a").allInnerTexts()).join(", "));
    await page.getByRole("button", { name: /^Estado: Todos/ }).click();
    await page.getByRole("dialog").waitFor();
    await foto(page, "04-hoja-estado-lista");
    await page.getByRole("button", { name: /^Invitado/ }).click();
    await page.waitForURL(/estado=invitado/);
    console.log("     invitados:", (await page.locator("main ul[aria-label=Candidatos] > li > a").allInnerTexts()).join(", "), "·", await page.locator("main p[role=status]").innerText());
    await ctx.close();
  }
  // 05 a 11 · La ficha de Feleal: arriba; la hoja de Estado; la rúbrica; por revisar y la base; redes y notas; la ⓘ; añadir evidencia con un
  // enlace que no es http(s).
  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Feleal" }).waitFor();
    await foto(page, "05-ficha-arriba");
    console.log("    ", JSON.stringify(await medir(page)));
    await page.getByRole("button", { name: /^Invitado/ }).click();
    await page.getByRole("dialog").waitFor();
    await foto(page, "06-hoja-estado");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await subir(page.getByRole("heading", { name: /^Rúbrica/ }));
    await foto(page, "07-ficha-rubrica");
    await subir(page.getByRole("heading", { name: /^Por revisar/ }));
    await foto(page, "08-ficha-por-revisar");
    await subir(page.getByRole("heading", { name: /^Redes/ }));
    await foto(page, "09-ficha-redes-y-notas");
    // La ⓘ recién abierta, sin haber tocado nada antes (si no, dice lo del último control tocado): la rúbrica en tres líneas.
    await page.goto(`${base}/admin/showcase/feleal`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Feleal" }).waitFor();
    await subir(page.getByRole("heading", { name: /^Rúbrica/ }));
    await page.getByRole("button", { name: /^Ayuda/ }).click();
    await page.getByText(/^Cuatro señales de 0 a 2/).waitFor();
    await foto(page, "10-ayuda-rubrica");
    await page.getByRole("button", { name: "Cerrar la ayuda" }).click();
    const obra = page.getByRole("list", { name: "Obra y reconocimiento" });
    await subir(obra);
    await obra.getByRole("button", { name: "Añadir evidencia" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Qué es").fill("Disco en vivo");
    await page.getByLabel("Enlace", { exact: true }).fill("ftp://musica.example/disco");
    await page.getByRole("dialog").getByRole("button", { name: "Añadir", exact: true }).click();
    await page.getByText("El enlace tiene que empezar con http:// o https://.").waitFor();
    await page.getByLabel("Enlace", { exact: true }).blur();
    await foto(page, "11-evidencia-enlace-invalido");
    await ctx.close();
  }
  // 12 · La tabla a 1280: la barra y el carril de la app, y la tabla al ancho de las fichas.
  {
    const { ctx, page } = await contexto({ escritorio: true });
    await page.goto(`${base}/admin/showcase?vista=tabla`, { waitUntil: "load" });
    await page.getByRole("region", { name: "Candidatos en tabla" }).waitFor();
    await foto(page, "12-tabla-escritorio-1280");
    console.log("    ", JSON.stringify(await medir(page)));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(errores.length ? `errores de página o consola:\n  ${errores.join("\n  ")}` : "sin errores de página ni de consola");
process.exit(0);
