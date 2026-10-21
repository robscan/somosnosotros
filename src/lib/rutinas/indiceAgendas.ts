import { normalizarNombre } from "../lugares";

/**
 * Las agendas que publica una página «índice» (OL-429): la de la Secretaría de Cultura de San Luis (`cultura.slp.gob.mx/agenda-cultural/`)
 * pone cada mes un PDF («OCTUBRE · 30 de septiembre de 2026 · Descargar» → `oct_2026.pdf`) y, a veces, un programa suelto («Agenda programación
 * XANTOLO en tu ciudad · 13 de octubre de 2026»). Se leen gratis desde el servidor, sin la API: cada enlace a un PDF con el texto que lo
 * precede (título y fecha de publicación) y su nombre de archivo. Si una página no se deja leer así, la rutina se la pasa a la API.
 */

export type AgendaDelIndice = { url: string; nombre: string; mes: string | null; publicada: string | null };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ABREVIADOS: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12 };
const FECHA = new RegExp(`(\\d{1,2}) de (${MESES.join("|")}) (?:de |del )?(\\d{4})`, "g");

const sinMarcas = (html: string) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");

const dos = (n: number) => String(n).padStart(2, "0");

/** El mes que nombra un texto (palabra entera: «OCTUBRE») o un nombre de archivo («oct_2026», «Agosto_2026-2»), con su año si lo trae. */
function mesDe(titulo: string, archivo: string): { mes: number; anio: number | null } | null {
  for (const w of normalizarNombre(titulo).split(" ")) {
    const i = MESES.indexOf(w);
    if (i >= 0) return { mes: i + 1, anio: Number(normalizarNombre(titulo).match(/\b(20\d{2})\b/)?.[1]) || null };
  }
  const partes = normalizarNombre(archivo.replace(/\.pdf$/i, "")).split(" ");
  for (const w of partes) {
    const i = MESES.indexOf(w);
    const n = i >= 0 ? i + 1 : ABREVIADOS[w];
    if (n) return { mes: n, anio: Number(partes.find((p) => /^20\d{2}$/.test(p))) || null };
  }
  return null;
}

/** Los PDF que enlaza la página, con su título, su mes (YYYY-MM) si se sabe y cuándo se publicó (YYYY-MM-DD) si lo dice. */
export function pdfsDelIndice(html: string, base: string): AgendaDelIndice[] {
  const salida: AgendaDelIndice[] = [];
  const vistos = new Set<string>();
  const enlace = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let desde = 0;
  for (let m = enlace.exec(html); m; m = enlace.exec(html)) {
    const tramo = sinMarcas(html.slice(desde, m.index)).slice(-300);
    desde = m.index + m[0].length;
    let url: URL;
    try {
      url = new URL(m[1].trim(), base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || !/\.pdf$/i.test(url.pathname) || vistos.has(url.href)) continue;
    vistos.add(url.href);
    const texto = `${tramo} ${sinMarcas(m[2])}`.trim();
    const fechas = [...normalizarNombre(texto).matchAll(FECHA)];
    const ultima = fechas.at(-1);
    const publicada = ultima ? `${ultima[3]}-${dos(MESES.indexOf(ultima[2]) + 1)}-${dos(Number(ultima[1]))}` : null;
    // El título es lo que va antes de la fecha de publicación (si la hay): «OCTUBRE», no el «septiembre» de «30 de septiembre».
    const corte = ultima ? normalizarNombre(texto).lastIndexOf(ultima[0]) : -1;
    const titulo = (corte > 0 ? normalizarNombre(texto).slice(0, corte) : normalizarNombre(texto)).split(" ").slice(-12).join(" ");
    const archivo = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    const encontrado = mesDe(titulo.split(" ").slice(-4).join(" "), archivo);
    let mes: string | null = null;
    if (encontrado) {
      const pub = publicada ? { anio: Number(publicada.slice(0, 4)), mes: Number(publicada.slice(5, 7)) } : null;
      // Sin año escrito: el de su publicación (una agenda de enero publicada a fines de diciembre es del año siguiente).
      const anio = encontrado.anio ?? (pub ? pub.anio + (encontrado.mes < pub.mes - 1 ? 1 : 0) : null);
      if (anio) mes = `${anio}-${dos(encontrado.mes)}`;
    }
    const nombre = (sinMarcas(m[2]).trim().length > 12 ? sinMarcas(m[2]).trim() : `${titulo.split(" ").slice(-8).join(" ")}`).slice(0, 120).trim() || archivo;
    salida.push({ url: url.href, nombre, mes, publicada });
  }
  return salida;
}

/** «2026-10-21» → «2026-11». */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${dos(m + 1)}`;
}

/** Los días entre dos fechas YYYY-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Las que valen hoy: las del mes en curso y del siguiente, y las sin mes publicadas hace 40 días o menos (un programa suelto). */
export function agendasVigentes(agendas: readonly AgendaDelIndice[], hoy: string, diasRecientes = 40): AgendaDelIndice[] {
  const actual = hoy.slice(0, 7);
  const siguiente = mesSiguiente(actual);
  return agendas.filter((a) =>
    a.mes ? a.mes === actual || a.mes === siguiente : !!a.publicada && diasEntre(a.publicada, hoy) >= 0 && diasEntre(a.publicada, hoy) <= diasRecientes,
  );
}
