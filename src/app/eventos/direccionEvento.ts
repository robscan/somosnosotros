import { puntoValido } from "@/lib/buscarLugares";
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

/** El pin es intencional; su relacion con un texto previo aun necesita resolverse. */
export function ponerPinManual(otro: OtroSitio, punto: Punto): OtroSitio {
  if (!puntoValido(punto)) return otro;
  const direccion = otro.reservado ? otro.direccionPrivada : otro.direccion;
  return { ...revisarNombreLegacy(otro), pinPendiente: !!direccion?.trim(), ciudad: null,
    ...(otro.reservado ? { privadoPunto: punto } : { sitioPunto: punto }) };
}

/** Reservar nunca deja la direccion o el pin exacto en los campos publicos. */
export function cambiarReserva(otro: OtroSitio): OtroSitio {
  if (otro.reservado) return { ...otro, reservado: false, pinPendiente: false };
  const privadoPunto = otro.privadoPunto ?? otro.sitioPunto;
  return { ...revisarNombreLegacy(otro), reservado: true, direccionPrivada: otro.direccionPrivada || otro.direccion || "", privadoPunto, direccion: "", sitioPunto: null, pinPendiente: !!otro.pinPendiente || !privadoPunto };
}
