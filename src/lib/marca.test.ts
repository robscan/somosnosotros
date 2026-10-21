import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DIRECCION_AVISOS, MARCA, MARCA_ANTERIOR, remitenteCorreo, SUFIJO_TITULO, tituloDePagina } from "./marca";

/** La grafía de antes, con cualquier espacio o salto de renglón en medio y sin importar mayúsculas. */
const GRAFIA_ANTERIOR = /somos\s+nosotros/i;

/** Dónde vive lo que lee la gente: la app, sus archivos estáticos, las apps de las tiendas y los envíos desde la Mac. */
const CARPETAS = ["src", "public", "apps", "scripts"];

/**
 * Los únicos sitios donde la grafía anterior puede seguir, cada uno con su razón. Si uno deja de tenerla, la prueba
 * pide quitarlo de aquí (así la lista no crece sola).
 */
const EXCEPCIONES: Record<string, string> = {
  "src/lib/marca.ts": "MARCA_ANTERIOR: solo el alternateName del JSON-LD, para que Google relacione los dos nombres (doc 57 § D)",
  "src/app/admin/ciudades/[slug]/propuestas/page.tsx": "OL-434 trabaja en este archivo a la vez; se cambia al unir esa pieza (bitácora 468)",
};

/** Carpetas que son registro de un prototipo ya firmado, no la app: se regeneran tal cual se firmaron. */
const CARPETAS_EXCEPTUADAS: Record<string, string> = {
  "scripts/ops/auditoria-ui/prototipo/": "generador del prototipo v3 firmado (OL-227); no llega a nadie",
};

const raiz = join(__dirname, "..", "..");

/** Lo versionado y lo nuevo sin comitear; lo que git ignora (lo que genera `cap sync` o Gradle en la Mac) no cuenta. */
function archivosVersionados(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...CARPETAS], { cwd: raiz, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\0")
    .filter(Boolean);
}

function conGrafiaAnterior(ruta: string): boolean {
  let contenido: Buffer;
  try {
    contenido = readFileSync(join(raiz, ruta));
  } catch {
    return false; // borrado en el árbol de trabajo sin comitear
  }
  if (contenido.includes(0)) return false; // imagen, fuente, jar…: no es texto
  return GRAFIA_ANTERIOR.test(contenido.toString("utf8"));
}

describe("la marca (OL-435)", () => {
  it("es «Somos Nosotrxs», como pidió el founder el 2026-10-21", () => {
    expect(MARCA).toBe("Somos Nosotrxs");
    expect(GRAFIA_ANTERIOR.test(MARCA)).toBe(false);
    expect(GRAFIA_ANTERIOR.test(MARCA_ANTERIOR)).toBe(true);
  });

  it("arma el título de cada página con sus partes y la marca al final", () => {
    expect(tituloDePagina()).toBe(MARCA);
    expect(tituloDePagina("Lugares")).toBe(`Lugares · ${MARCA}`);
    expect(tituloDePagina("Grafo cultural", "Administración")).toBe(`Grafo cultural · Administración · ${MARCA}`);
    expect(tituloDePagina("Lugares").endsWith(SUFIJO_TITULO)).toBe(true);
  });

  it("el remitente lleva siempre la marca; de CORREO_REMITENTE solo toma la dirección", () => {
    expect(remitenteCorreo(undefined)).toBe(`${MARCA} <${DIRECCION_AVISOS}>`);
    expect(remitenteCorreo("")).toBe(`${MARCA} <${DIRECCION_AVISOS}>`);
    expect(remitenteCorreo("somosnosotros <avisos@somosnosotros.org>")).toBe(`${MARCA} <avisos@somosnosotros.org>`);
    expect(remitenteCorreo("  Otro nombre <pruebas@ejemplo.mx>  ")).toBe(`${MARCA} <pruebas@ejemplo.mx>`);
    expect(remitenteCorreo("pruebas@ejemplo.mx")).toBe(`${MARCA} <pruebas@ejemplo.mx>`);
    expect(remitenteCorreo("sin dirección")).toBe(`${MARCA} <${DIRECCION_AVISOS}>`);
  });

  it("la grafía anterior no vuelve a src/, public/, apps/ ni scripts/ fuera de las excepciones", () => {
    const archivos = archivosVersionados();
    expect(archivos.length).toBeGreaterThan(100);
    const exceptuado = (ruta: string) => ruta in EXCEPCIONES || Object.keys(CARPETAS_EXCEPTUADAS).some((c) => ruta.startsWith(c));
    const conElla = archivos.filter(conGrafiaAnterior);
    expect(conElla.filter((ruta) => !exceptuado(ruta)), `Usa MARCA de src/lib/marca.ts (o escribe ${MARCA} en un archivo estático)`).toEqual([]);
    const sobran = Object.keys(EXCEPCIONES).filter((ruta) => !conElla.includes(ruta));
    expect(sobran, "Estas excepciones ya no hacen falta: quítalas de EXCEPCIONES").toEqual([]);
  });
});
