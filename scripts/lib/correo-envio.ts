/**
 * Piezas comunes para mandar correo desde un guion (fuera de Next.js): cargar las llaves de `.env` sin
 * imprimirlas, mandar con Resend y enmascarar un correo para los informes. Traídas tal cual de
 * scripts/capo/invitar.ts (bitácora 056) para que scripts/instituciones/invitar-agendas.ts (OL-122) use
 * exactamente el mismo envío; el comportamiento no cambia.
 */
import { readFileSync } from "node:fs";

export const RUTA_ENV = "/Users/apple-1/somosnosotros/.env";

/** Carga las variables de `ruta` sin pisar las que ya estén puestas en el entorno; nunca las imprime. */
export function cargarEnv(ruta: string = RUTA_ENV): void {
  let texto: string;
  try {
    texto = readFileSync(ruta, "utf8");
  } catch {
    return;
  }
  for (const linea of texto.split("\n")) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i < 0) continue;
    const clave = l.slice(0, i).trim();
    let valor = l.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
    if (!(clave in process.env)) process.env[clave] = valor;
  }
}

/** "prisca@x.mx" → "pr…@x.mx": para un informe (bitácora, consola) sin exponer el correo completo. */
export function enmascarar(correo: string): string {
  const arroba = correo.indexOf("@");
  if (arroba < 0) return "…";
  const local = correo.slice(0, arroba);
  const dominio = correo.slice(arroba + 1);
  return `${local.slice(0, 2)}…@${dominio}`;
}

export type ResultadoEnvio = { ok: boolean; id: string | null; error?: string };

/** Manda un correo con Resend, igual que src/lib/correo.ts (aquí reescrito: ese módulo trae
 * "server-only" y no corre fuera de un componente de servidor de Next.js). */
export async function mandarCorreo(p: { para: string; asunto: string; texto: string; html: string }): Promise<ResultadoEnvio> {
  const llave = process.env.RESEND_API_KEY;
  if (!llave) return { ok: false, id: null, error: "Sin RESEND_API_KEY" };
  const remitente = process.env.CORREO_REMITENTE || "Somos Nosotros <avisos@somosnosotros.org>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remitente, to: [p.para], subject: p.asunto, text: p.texto, html: p.html }),
    });
    const cuerpo: { id?: string; message?: string } = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, id: null, error: `${res.status} ${cuerpo.message ?? ""}`.trim() };
    return { ok: true, id: cuerpo.id ?? null };
  } catch (e) {
    return { ok: false, id: null, error: e instanceof Error ? e.message : String(e) };
  }
}
