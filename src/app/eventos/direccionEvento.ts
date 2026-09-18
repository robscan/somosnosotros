import { normalizarNombre, type LugarResumen } from "@/lib/lugares";
import type { Punto } from "@/lib/geo";
import type { OtroSitio } from "./HojaDondeEs";

export function textoDelSitio(otro: OtroSitio): string {
  const nombre = otro.sitioTexto.trim();
  const direccion = otro.reservado ? "" : (otro.direccion ?? "").trim();
  return [nombre, direccion === nombre ? "" : direccion].filter(Boolean).join(" · ");
}

/** No se interpreta texto legacy: al cambiar su direccion se pide un nombre publico nuevo. */
export function revisarNombreLegacy(otro: OtroSitio): OtroSitio {
  return otro.nombreLegacy ? { ...otro, nombreLegacy: false, referenciaLegacy: otro.sitioTexto, sitioTexto: "" } : otro;
}

export function sitioListo(otro: OtroSitio): boolean {
  const publicoUbicado = !otro.direccion?.trim() || !!otro.sitioPunto && puntoValido(otro.sitioPunto);
  return !!otro.sitioTexto.trim() && !otro.pinPendiente && (otro.reservado ? !!otro.direccionPrivada.trim() : publicoUbicado);
}

/** Reservar nunca deja la direccion o el pin exacto en los campos publicos. */
export function cambiarReserva(otro: OtroSitio): OtroSitio {
  if (otro.reservado) return { ...otro, reservado: false, pinPendiente: false };
  const privadoPunto = otro.privadoPunto ?? otro.sitioPunto;
  return { ...revisarNombreLegacy(otro), reservado: true, direccionPrivada: otro.direccionPrivada || otro.direccion || "", privadoPunto, direccion: "", sitioPunto: null, pinPendiente: !privadoPunto };
}

export function lugaresPorTexto(lugares: LugarResumen[], texto: string): LugarResumen[] {
  const partes = normalizarNombre(texto).split(/\s+/).filter(Boolean);
  return lugares.filter(l => {
    const contenido = normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`);
    return partes.every(p => contenido.includes(p));
  });
}

export function puntoValido(p: Punto): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

/** Los helpers compartidos devuelven [] ante HTTP no-ok; aqui el fallo debe distinguirse de cero opciones. */
export async function consultarMapa(url: string, init?: RequestInit): Promise<Response> {
  const respuesta = await fetch(url, init);
  if (!respuesta.ok) throw new Error("No se pudo consultar el mapa");
  return respuesta;
}
