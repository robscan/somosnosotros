import type { ModoSitio, OtroSitio } from "@/lib/eventos";

/**
 * Dónde es, tal como lo leen `crearEvento` y `actualizarEvento`: campos escondidos (la hoja «¿Dónde es?» vive fuera del formulario).
 * Lo comparten el alta y la edición de siempre (`FormularioEvento`) y el alta por pasos (`/nuevo/evento`, OL-300).
 */
export default function CamposSitio({ modo, lugarId, otro }: { modo: ModoSitio; lugarId: string; otro: OtroSitio }) {
  return (
    <>
      <input type="hidden" name="modo_sitio" value={modo} />
      <input type="hidden" name="lugar_id" value={modo === "lugar" ? lugarId : ""} />
      <input type="hidden" name="sitio_texto" value={modo === "lugar" ? "" : otro.sitioTexto} />
      <input type="hidden" name="sitio_direccion" value={modo === "otro" ? otro.direccion ?? "" : ""} />
      <input type="hidden" name="sitio_pin_pendiente" value={modo !== "lugar" && otro.pinPendiente ? "si" : "no"} />
      <input type="hidden" name="sitio_lat" value={modo === "otro" && otro.sitioPunto ? otro.sitioPunto.lat : ""} />
      <input type="hidden" name="sitio_lng" value={modo === "otro" && otro.sitioPunto ? otro.sitioPunto.lng : ""} />
      <input type="hidden" name="direccion_privada" value={modo === "reservado" ? otro.direccionPrivada : ""} />
      <input type="hidden" name="privado_lat" value={modo === "reservado" && otro.privadoPunto ? otro.privadoPunto.lat : ""} />
      <input type="hidden" name="privado_lng" value={modo === "reservado" && otro.privadoPunto ? otro.privadoPunto.lng : ""} />
      <input type="hidden" name="revelar_horas" value={otro.revelarHoras} />
      <input type="hidden" name="indicaciones" value={modo === "reservado" ? otro.indicaciones : ""} />
      <input type="hidden" name="ciudad" value={modo === "lugar" ? "" : (otro.ciudad ?? "")} />
    </>
  );
}
